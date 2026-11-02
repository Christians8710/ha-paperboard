"""Lokale Editorprüfung mit erfundenen Daten; keine HA-Instanz und keine echten Schlüssel."""
from __future__ import annotations
import base64
import asyncio
from copy import deepcopy
from aiohttp import web
from sample import ROOT,NOW,sample,renderer,const,layout
import importlib
installer=importlib.import_module('paperboard_preview.installer')
firmware=installer.load_firmware(ROOT/'custom_components'/'paperboard'/'firmware')
credentials=installer.installation_credentials()

document,data=sample()
revision=0
settings={'name':'Wohnzimmer','model':'e1002','orientation':'native','power':'mains','refresh_interval':900}


def public():
    return {'id':'demo','settings':settings,'size':[800,480],'revision':revision,'layout':document,
            'last_request':None,'last_render':None,'warnings':[],'hardware_tested':False,
            'installer_available':firmware['available'],'device_status':{}}


async def index(request):
    states={key:{'state':value['state'],'attributes':value['attributes']} for key,value in data['states'].items()}
    states.update({eid:{'state':'off','attributes':{'friendly_name':eid}} for eid in data['calendars']})
    import json
    html='''<!doctype html><html lang="de"><meta charset="utf-8"><title>PaperBoard – lokale Editorprüfung</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;background:#10252c;font-family:system-ui} .dev{padding:8px 20px;background:#18363e;border-bottom:1px solid #36525b;font-size:12px;color:#b6cdd0;overflow-wrap:anywhere}</style>
<div class="dev">Lokale Editorprüfung · ausschließlich erfundene Daten · keine Home-Assistant-Verbindung</div>
<paperboard-panel></paperboard-panel><script type="module">
import '/paperboard_static/panel.js';
const panel=document.querySelector('paperboard-panel');
panel.hass={paperboardPreviewOnly:true,themes:{darkMode:APPEARANCE},states:STATES,callWS:async message=>{const r=await fetch('/command'+location.search,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(message)});const d=await r.json();if(!r.ok)throw new Error(d.error);return d;}};
</script></html>'''.replace('states:STATES','states:'+json.dumps(states)).replace('APPEARANCE', {'light':'false','dark':'true'}.get(request.query.get('appearance'),'undefined'))
    if request.query.get('mode')=='large_text':html=html.replace('body{','html{font-size:200%}body{',1)
    return web.Response(text=html,content_type='text/html')


async def command(request):
    global document,revision
    msg=await request.json();action=msg['action']
    try:
        mode=request.query.get('mode','')
        if mode=='error' and action=='list':raise ValueError('Verbindung im lokalen Prüfstand absichtlich unterbrochen.')
        if mode=='save_error' and action=='save':raise ValueError('Speichern im lokalen Prüfstand absichtlich abgelehnt. Deine Änderungen bleiben erhalten.')
        if mode=='preview_error' and action=='preview':raise ValueError('Vorschau im lokalen Prüfstand absichtlich nicht erreichbar.')
        if mode=='loading' and action=='list':await asyncio.sleep(3)
        if action=='list': result={'version':const.VERSION,'models':const.MODELS,'displays':[public()]}
        elif action=='get': result=public()
        elif action=='save':
            if msg['revision']!=revision: raise ValueError('Layout wurde geändert.')
            document=layout.validate_layout(msg['layout']);revision+=1;result=public()
        elif action=='preview':
            doc=layout.validate_layout(msg.get('layout',document));payload=deepcopy(data);payload['bindings']=doc['bindings'];payload['calendar_sources']=doc['bindings']['calendars']
            raw=renderer.render_png(doc,msg.get('page',0),settings,payload,NOW)
            result={'image':base64.b64encode(raw).decode(),'warnings':[]}
        elif action=='connection':result={'path':'/api/paperboard/image/demo/0','header':'X-PaperBoard-Token','token':'NUR-LOKALE-DEMO','refresh_interval':900,'pages':len(document['pages'])}
        elif action=='installer_prepare':result={'firmware':firmware,'credentials':credentials,'token':'NUR-LOKALE-DEMO-NICHT-ZUM-ECHTEN-FLASHEN','entry_id':'demo','pages':len(document['pages']),'settings':settings,'previous_boot_id':None}
        else:raise ValueError('Unbekannte Aktion')
        if mode=='empty' and action=='list':result['displays']=[]
        if mode=='no_firmware' and action in ('list','get'):
            for item in result.get('displays',[result]):item['installer_available']=False
        if mode=='long' and action in ('list','get'):
            result=deepcopy(result)
            for item in result.get('displays',[result]):
                item['settings']['name']='Wohnzimmer · '+('LangerDisplaynameOhneLeerzeichen'*3)
                item['layout']['pages'][0]['name']='Sehr lange Kalenderseite für gemeinsame Termine und wichtige Familienereignisse'
        return web.json_response(result)
    except (ValueError,KeyError,IndexError) as err:return web.json_response({'error':str(err)},status=400)


async def installer_preview(request):
    """Eigenständige Ansicht mit unveränderlicher USB-Sperre und erfundenen Zugängen."""
    import json
    context={'previewOnly':True,'defaultBaseUrl':'http://homeassistant.local:8123',
        'meta':{'firmware':firmware,'credentials':credentials,'token':'NUR-LOKALE-DEMO-NICHT-ZUM-ECHTEN-FLASHEN',
            'entry_id':'demo','pages':len(document['pages']),'settings':settings,'previous_boot_id':None},
        'firmwareBase64':base64.b64encode((ROOT/'custom_components'/'paperboard'/'firmware'/'paperboard-e1002.factory.bin').read_bytes()).decode()}
    script=(ROOT/'custom_components'/'paperboard'/'frontend'/'offline.bundle.js').read_text(encoding='utf-8').replace('</script','<\\/script')
    raw=json.dumps(context).replace('<','\\u003c')
    return web.Response(text=f'<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PaperBoard – Installer-Vorschau</title><body><script id="paperboard-config" type="application/json">{raw}</script><script>{script}</script></body></html>',content_type='text/html')

app=web.Application(client_max_size=250000)
app.router.add_get('/',index);app.router.add_post('/command',command)
app.router.add_get('/installer-preview',installer_preview)
app.router.add_static('/paperboard_static/',ROOT/'custom_components'/'paperboard'/'frontend')
app.router.add_static('/paperboard_firmware/',ROOT/'custom_components'/'paperboard'/'firmware')
if __name__=='__main__':web.run_app(app,host='127.0.0.1',port=8765)
