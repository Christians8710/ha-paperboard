"""Tests mit echtem HA-Testlauf unter Linux; lokal ohne HA explizit übersprungen."""
from unittest.mock import patch
from pathlib import Path
import base64
import pytest

pytest.importorskip("homeassistant")
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import MockConfigEntry


@pytest.fixture(autouse=True)
def custom_integrations(enable_custom_integrations):
    import custom_components
    path=str(Path(__file__).resolve().parents[1]/"custom_components")
    if path not in custom_components.__path__:
        custom_components.__path__.append(path)
    yield


@pytest.fixture
async def display(hass):
    entry = MockConfigEntry(domain="paperboard", title="Testdisplay", data={
        "name":"Testdisplay", "model":"e1002", "orientation":"native", "power":"mains",
        "refresh_interval":900, "template":"calendar", "token":"test-only-token-not-a-real-credential"})
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    yield entry
    await hass.config_entries.async_unload(entry.entry_id)


async def test_flow(hass):
    result=await hass.config_entries.flow.async_init("paperboard", context={"source":"user"})
    assert result["step_id"]=="user"
    result=await hass.config_entries.flow.async_configure(result["flow_id"], {
        "name":"Wohnzimmer", "model":"e1002", "orientation":"native", "power":"mains", "refresh_interval":900})
    assert result["step_id"]=="template"
    with patch('custom_components.paperboard.async_setup_entry',return_value=True):
        result=await hass.config_entries.flow.async_configure(result["flow_id"], {"template":"calendar"})
        await hass.async_block_till_done()
    assert result["type"]=="create_entry"
    assert len(result["data"]["token"])>=40


async def test_websocket_save_render_and_storage(hass, display, hass_ws_client):
    client=await hass_ws_client(hass)
    await client.send_json({"id":1,"type":"paperboard/command","action":"get","entry_id":display.entry_id})
    response=await client.receive_json()
    assert response["success"]
    doc=response["result"]["layout"]
    assert "token" not in response["result"]["settings"]
    doc["pages"][0]["name"]="Gespeichert"
    await client.send_json({"id":2,"type":"paperboard/command","action":"save","entry_id":display.entry_id,"layout":doc,"revision":0})
    assert (await client.receive_json())["success"]
    await client.send_json({"id":3,"type":"paperboard/command","action":"preview","entry_id":display.entry_id,"page":0})
    result=await client.receive_json()
    assert result["success"]
    assert base64.b64decode(result["result"]["image"]).startswith(b'\x89PNG')
    await client.send_json({"id":4,"type":"paperboard/command","action":"save","entry_id":display.entry_id,"layout":doc,"revision":0})
    assert not (await client.receive_json())["success"]  # Reject stale writes.
    assert await hass.config_entries.async_reload(display.entry_id)
    assert hass.data["paperboard"]["displays"][display.entry_id].layout["pages"][0]["name"]=="Gespeichert"


async def test_image_auth_etag_and_unload(hass, display, hass_client):
    client=await hass_client(hass)
    url=f"/api/paperboard/image/{display.entry_id}/0"
    assert (await client.get(url)).status==401
    assert (await client.get(url,headers={"X-PaperBoard-Token":"wrong-display-key"})).status==401
    headers={"X-PaperBoard-Token":display.data["token"]}
    response=await client.get(url,headers=headers)
    assert response.status==200
    assert (await response.read()).startswith(b'\x89PNG')
    headers["If-None-Match"]=response.headers["ETag"]
    assert (await client.get(url,headers=headers)).status==304
    assert (await client.get(url[:-1]+"99",headers=headers)).status==404


async def test_multiple_displays_are_isolated(hass, display):
    entry=MockConfigEntry(domain="paperboard", title="Zweites Display", data={**display.data,"name":"Zweites Display","token":"a-different-test-only-token"})
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    a,b=(hass.data["paperboard"]["displays"][e.entry_id] for e in (display,entry))
    assert a.layout is not b.layout
    a.layout["pages"][0]["name"]="Nur Display 1"
    assert b.layout["pages"][0]["name"]!="Nur Display 1"
    await hass.config_entries.async_unload(entry.entry_id)


async def test_read_only_user_cannot_read_display_keys(hass, display, hass_ws_client, hass_read_only_access_token):
    client=await hass_ws_client(hass, access_token=hass_read_only_access_token)
    await client.send_json({"id":1,"type":"paperboard/command","action":"connection","entry_id":display.entry_id})
    response=await client.receive_json()
    assert not response["success"]
    assert response["error"]["code"]=="unauthorized"


async def test_installer_credentials_persist_and_stay_admin_only(hass, display, hass_ws_client):
    hass.data['paperboard']['firmware']={'available':True,'version':'0.3.1','files':{}}
    client=await hass_ws_client(hass)
    for msgid in (1,2):
        await client.send_json({'id':msgid,'type':'paperboard/command','action':'installer_prepare','entry_id':display.entry_id})
        response=await client.receive_json();assert response['success']
        if msgid==1:credentials=response['result']['credentials']
        else:assert response['result']['credentials']==credentials
    await hass.config_entries.async_reload(display.entry_id)
    d=hass.data['paperboard']['displays'][display.entry_id]
    assert d.installation==credentials
    assert 'api_key' not in str(d.public()) and 'ota_password' not in str(d.public())


async def test_device_sync_auth_fragmented_payload_and_status_rendering(hass, display, hass_client):
    import json
    from custom_components.paperboard.installer import installation_credentials
    d=hass.data['paperboard']['displays'][display.entry_id];d.installation=installation_credentials()
    client=await hass_client(hass)
    url=f'/api/paperboard/device/{display.entry_id}/sync'
    body={'model':'e1002','version':'0.3.1','install_id':d.installation['install_id'],'boot_id':'123','downloaded':True,'battery':82,'temperature':21.5,'humidity':48}
    assert (await client.post(url,json=body)).status==401
    headers={'X-PaperBoard-Token':display.data['token'],'Content-Type':'application/json'}
    async def chunks():
        raw=json.dumps(body).encode();yield raw[:15];yield raw[15:]
    response=await client.post(url,data=chunks(),headers=headers)
    assert response.status==200
    assert (await response.json())['pages']==3
    assert d.device_status['downloaded'] is True
    from datetime import datetime,timezone
    payload=await d.data(d.layout,datetime.now(timezone.utc))
    entity=payload['bindings']['battery_entity']
    assert payload['states'][entity]['state']=='82'
    body['battery']=-10
    assert (await client.post(url,json=body,headers=headers)).status==400
    assert (await client.post(url,data=b'x'*5000,headers=headers)).status==413
