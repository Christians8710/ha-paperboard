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
