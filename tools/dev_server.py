"""Lokale Editorprüfung mit erfundenen Daten; keine HA-Instanz und keine echten Schlüssel."""
from __future__ import annotations
import base64
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
<style>body{margin:0;font-family:system-ui} .dev{padding:7px 22px;background:#e8d9a9;font-size:12px;color:#483d24}</style>
<div class="dev">Lokale Editorprüfung · ausschließlich erfundene Daten · keine Home-Assistant-Verbindung</div>
<paperboard-panel></paperboard-panel><script type="module">
import '/paperboard_static/panel.js';
const panel=document.querySelector('paperboard-panel');
panel.hass={paperboardPreviewOnly:true,states:STATES,callWS:async message=>{const r=await fetch('/command',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(message)});const d=await r.json();if(!r.ok)throw new Error(d.error);return d;}};
</script></html>'''.replace('states:STATES','states:'+json.dumps(states))
    return web.Response(text=html,content_type='text/html')


async def command(request):
    global document,revision
    msg=await request.json();action=msg['action']
    try:
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
        return web.json_response(result)
    except (ValueError,KeyError,IndexError) as err:return web.json_response({'error':str(err)},status=400)

app=web.Application(client_max_size=250000)
app.router.add_get('/',index);app.router.add_post('/command',command)
app.router.add_static('/paperboard_static/',ROOT/'custom_components'/'paperboard'/'frontend')
app.router.add_static('/paperboard_firmware/',ROOT/'custom_components'/'paperboard'/'firmware')
if __name__=='__main__':web.run_app(app,host='127.0.0.1',port=8765)
