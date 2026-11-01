import {validateWifi,validateAddress,verifyFirmware} from './flash-core.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const base64=bytes=>{let s='';for(let i=0;i<bytes.length;i+=16384)s+=String.fromCharCode(...bytes.subarray(i,i+16384));return btoa(s);};
const from64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
export class PaperBoardInstaller extends HTMLElement {
  constructor(){super();this.attachShadow({mode:'open'});this.phase='prepare';this.message='Geprüfte Firmware wird geladen …';this.percent=0;this.running=false;this.closeable=true;}
  connectedCallback(){this.render();this.prepare();}
  disconnectedCallback(){clearTimeout(this.pollTimer);this.pollResolve?.();}
  async prepare(){
    try{
      if(this.context.offline){this.meta=this.context.meta;this.firmware=from64(this.context.firmwareBase64);}
      else{
        this.meta=await this.context.hass.callWS({type:'paperboard/command',action:'installer_prepare',entry_id:this.context.entry_id});
        const response=await fetch(this.meta.firmware.files.factory.url,{cache:'no-store'});
        if(!response.ok)throw new Error('Die Firmwaredatei konnte nicht geladen werden.');
        this.firmware=new Uint8Array(await response.arrayBuffer());
      }
      this.flashFunction=(await import('./flash.bundle.js')).flash;
      if(globalThis.crypto?.subtle)await verifyFirmware(this.firmware,this.meta.firmware);
      this.phase='form';this.message='Firmware 0.2.0 geladen. Noch wurde kein USB-Gerät geöffnet.';this.render();
    }catch(e){this.phase='error';this.message=e.message||'Die Installationsvorbereitung ist fehlgeschlagen.';this.render();}
  }
  render(){
    const serial=Boolean(globalThis.isSecureContext&&navigator.serial&&crypto.subtle);
    const offline=this.context?.offline;
    this.shadowRoot.innerHTML=`<style>
      :host{position:fixed;inset:0;z-index:10000;display:grid;place-items:center;background:#142e2877;padding:20px;font:14px system-ui;color:#203f36}*{box-sizing:border-box}.box{background:#fcfdf8;border-radius:16px;padding:26px;max-width:700px;width:100%;max-height:94vh;overflow:auto;box-shadow:0 20px 80px #122e2833}header{display:flex;align-items:center;justify-content:space-between;gap:12px}h1{font-size:23px;margin:0}h2{font-size:17px}p{line-height:1.6;color:#637365}button{font:inherit;border:1px solid #cbd6c5;border-radius:7px;padding:10px 14px;cursor:pointer;background:white;color:#244c3f}button.primary{background:#204f49;color:white;border:0}button:disabled{opacity:.5;cursor:default}label{display:block;margin:14px 0;font-size:13px}input{font:inherit;width:100%;border:1px solid #cbd6c5;border-radius:6px;padding:9px;margin-top:5px;background:white}input[type=checkbox]{width:auto;margin:0 8px 0 0}label.check{display:flex;align-items:flex-start;line-height:1.5}.note{padding:13px;background:#eaf0df;border-radius:8px}.warning{background:#fff0d9}.error{background:#fae6df;color:#7b352a}.buttons{display:flex;gap:10px;flex-wrap:wrap;margin-top:20px}.progress{height:12px;background:#e0e7d8;border-radius:8px;overflow:hidden;margin:18px 0}.progress span{height:100%;background:#356d50;display:block}.small{font-size:12px}a{color:#245d48}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:11px}dl{display:grid;grid-template-columns:150px 1fr;gap:8px}dd{margin:0}button:focus-visible,input:focus-visible{outline:3px solid #8fab7b;outline-offset:2px}
      </style><div class="box" role="dialog" aria-modal="true" aria-labelledby="title"><header><h1 id="title">E1002 automatisch einrichten</h1>${!offline?`<button id="close" ${this.closeable?'':'disabled'} aria-label="Installer schließen">×</button>`:''}</header>
      <p>USB-Installation für ein <strong>Seeed reTerminal E1002</strong>. Keine YAML-Datei und keine lokale Kompilierung erforderlich.</p>
      <div class="note ${this.phase==='error'?'error':''}" role="status">${esc(this.message)}</div>
      ${this.phase==='form'?`
        ${!serial?`<p class="note warning">Diese Home-Assistant-Adresse erlaubt hier keinen USB-Zugriff. Lade den eigenständigen Installer herunter und öffne die HTML-Datei in Chrome oder Edge auf demselben Computer. Die Datei enthält die Zugangsdaten dieses Displays; nicht weitergeben. Es werden keine Skripte von externen Servern geladen.</p>`:''}
        <form id="form"><label>Vom Display erreichbare Home-Assistant-Basisadresse<input id="baseUrl" type="url" required value="${esc(this.context.defaultBaseUrl||location.origin)}" placeholder="http://homeassistant.local:8123" autocomplete="off"></label>
        <p class="small">HTTP überträgt Bild und Display-Schlüssel unverschlüsselt im lokalen Netz. Bei HTTPS wird ein gültiges Zertifikat geprüft. Keine Adresse mit localhost verwenden.</p>
        ${serial?`<label>2,4-GHz-WLAN-Name<input id="ssid" maxlength="32" autocomplete="off" required></label><label>WLAN-Passwort<input id="password" type="password" autocomplete="new-password" maxlength="64"></label><label class="check"><input id="openWifi" type="checkbox">Dieses WLAN hat ausdrücklich kein Passwort.</label>
        <label class="check note warning"><input id="consent" type="checkbox" required>Ich habe das richtige E1002 angeschlossen. Die Installation ersetzt die vorhandene Firmware und löscht deren Einstellungen einschließlich WLAN, API, OTA und IP. Vorhandene Konfiguration habe ich gesichert; diese Neuinstallation soll neue geräteeigene Zugänge und DHCP verwenden.</label>
        <p class="small">Das USB-Gerät wählst du selbst im Browser aus. Anderen seriellen Monitor schließen. Bei Verbindungsproblemen den Downloadmodus nach Seeed-Anleitung aktivieren.</p>`:''}
        <div class="buttons">${serial?'<button class="primary" id="start" type="submit">USB-Gerät wählen und installieren</button>':''}${!offline?'<button id="standalone" type="button">Eigenständigen USB-Installer herunterladen</button>':''}</div></form>
        ${offline&&!serial?'<p>Bitte diese Datei mit einer aktuellen Desktop-Version von Chrome oder Edge öffnen. Der Browser muss lokale Dateien und Web Serial zulassen.</p>':''}
      `:''}
      ${['writing','waiting','done'].includes(this.phase)?`<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${this.percent}"><span style="width:${this.percent}%"></span></div><p id="progressText">${esc(this.progressText||'')}</p>`:''}
      ${this.phase==='waiting'?'<p>Die USB-Schreibprüfung ist abgeschlossen. PaperBoard wartet jetzt auf WLAN-Anmeldung und Bildabruf. Das Farbdisplay benötigt zusätzlich Zeit für seine Aktualisierung.</p>':''}
      ${this.phase==='done'?`<p>Die Firmware und die persönlichen Geräteeinstellungen wurden geschrieben und per Prüfsumme verifiziert.</p>
        <p>${this.connected?'Das Gerät hat sich bei Home Assistant gemeldet und ein Bild erfolgreich heruntergeladen.':'Der erste Bildabruf ist hier noch nicht bestätigt. Prüfe in Home Assistant den Bereich „Gerät & Verbindung“. Bei Problemen WLAN-Name, Passwort und erreichbare Home-Assistant-Adresse kontrollieren.'}</p>
        <div class="buttons"><button id="backup">Gerätezugänge als Sicherung herunterladen</button>${!offline?'<button id="check">Verbindung erneut prüfen</button>':''}</div><p class="small">Die Sicherung enthält den individuellen API-Schlüssel und das OTA-Passwort. Für eine spätere ESPHome-Anbindung sicher aufbewahren.</p>`:''}
      ${this.phase==='error'?'<p>Es wurde keine erfolgreiche Installation bestätigt. Nach einem abgebrochenen Schreibvorgang USB-Installer erneut ausführen.</p><button id="retry">Erneut vorbereiten</button>':''}
      <p class="small">Firmwaremodell E1002 · ESP32-S3 · 32 MB. Die Chipprüfung kann ein E1002 nicht von anderen ESP32-S3-Geräten mit 32 MB unterscheiden; die Modellauswahl bleibt deine Verantwortung.</p>
      </div>`;
    this.shadowRoot.querySelector('#close')?.addEventListener('click',()=>{if(this.closeable){this.dispatchEvent(new CustomEvent('installer-close',{bubbles:true,composed:true}));this.remove();}});
    this.shadowRoot.querySelector('#form')?.addEventListener('submit',e=>{e.preventDefault();this.start();});
    this.shadowRoot.querySelector('#standalone')?.addEventListener('click',()=>this.downloadStandalone());
    this.shadowRoot.querySelector('#backup')?.addEventListener('click',()=>this.backup());
    this.shadowRoot.querySelector('#check')?.addEventListener('click',()=>this.waitForDevice());
    this.shadowRoot.querySelector('#retry')?.addEventListener('click',()=>{this.phase='prepare';this.render();this.prepare();});
  }
  async start(){
    if(this.running)return;
    let portPromise,config;
    try{
      const root=this.shadowRoot;
      if(!root.querySelector('#consent').checked)throw new Error('Bitte die bewusste Neuinstallation bestätigen.');
      const base_url=validateAddress(root.querySelector('#baseUrl').value),ssid=root.querySelector('#ssid').value,password=root.querySelector('#password').value,open_wifi=root.querySelector('#openWifi').checked;
      validateWifi(ssid,password,open_wifi);
      config={schema:1,model:'e1002',ssid,password,open_wifi,base_url,
        entry_id:this.meta.entry_id,token:this.meta.token,install_id:this.meta.credentials.install_id,
        api_key_hex:this.meta.credentials.api_key_hex,ota_password:this.meta.credentials.ota_password,
        pages:this.meta.pages,refresh_interval:this.meta.settings.refresh_interval,rotated:this.meta.settings.orientation==='rotated'};
      // Keep requestPort directly in the deliberate user click, before any asynchronous work.
      portPromise=navigator.serial.requestPort();
    }catch(e){this.message=e.message;this.render();return;}
    this.running=true;this.closeable=false;this.phase='writing';this.message='Bitte USB-Kabel angeschlossen lassen und diese Seite geöffnet halten.';this.render();
    this.dispatchEvent(new CustomEvent('installer-busy',{detail:true,bubbles:true,composed:true}));
    const unload=e=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',unload);
    try{
      const port=await portPromise;
      this.startedAt=Date.now();
      await this.flashFunction({port,manifest:this.meta.firmware,firmware:this.firmware,config,onProgress:(message,percent)=>{
        this.percent=percent;this.progressText=message;
        const bar=this.shadowRoot.querySelector('[role=progressbar]');if(bar){bar.setAttribute('aria-valuenow',String(percent));bar.querySelector('span').style.width=percent+'%';}
        const text=this.shadowRoot.querySelector('#progressText');if(text)text.textContent=message;
      }});
      if(this.context.offline){this.phase='done';this.message='USB-Installation erfolgreich. Das Gerät verbindet sich jetzt mit deinem WLAN.';}
      else {this.closeable=true;window.removeEventListener('beforeunload',unload);await this.waitForDevice();}
    }catch(e){this.phase='error';this.message=e.name==='NotFoundError'?'Es wurde kein USB-Gerät ausgewählt.':/Gerät|Firmware|Konfiguration|Prüfsumme|Schreibmodus|Flash|Display/.test(e.message)?e.message:'USB-Verbindung oder Schreibprüfung fehlgeschlagen. Kabel prüfen, seriellen Monitor schließen und erneut versuchen.';}
    finally{config.password='';this.running=false;this.closeable=true;window.removeEventListener('beforeunload',unload);this.dispatchEvent(new CustomEvent('installer-busy',{detail:false,bubbles:true,composed:true}));this.render();}
  }
  async waitForDevice(){
    this.phase='waiting';this.message='USB erfolgreich. Verbindung zu Home Assistant wird geprüft …';this.render();
    const end=Date.now()+180000;
    while(Date.now()<end&&this.isConnected){
      let info={};
      try{info=await this.context.hass.callWS({type:'paperboard/command',action:'get',entry_id:this.meta.entry_id});}
      catch{this.message='USB erfolgreich. Home Assistant ist derzeit nicht erreichbar; die Geräteverbindung wird weiter geprüft …';}
      const status=info.device_status||{};
      if(status.boot_id&&status.boot_id!==this.meta.previous_boot_id&&Date.parse(status.last_seen)>=this.startedAt&&status.downloaded){this.connected=true;break;}
      await new Promise(resolve=>{this.pollResolve=resolve;this.pollTimer=setTimeout(resolve,3000);});
    }
    this.phase='done';this.message=this.connected?'USB, WLAN-Anmeldung und Bildabruf erfolgreich bestätigt.':'USB-Installation abgeschlossen; die Verbindung zu Home Assistant ist noch nicht bestätigt.';this.render();
  }
  backup(){
    const copy={version:'0.2.0',model:'e1002',entry_id:this.meta.entry_id,token:this.meta.token,
      api_key:this.meta.credentials.api_key,ota_password:this.meta.credentials.ota_password};
    this.download('PaperBoard-E1002-Geraetezugaenge.json',JSON.stringify(copy,null,2),'application/json');
  }
  download(name,data,type){const url=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  async downloadStandalone(){
    try{
      const address=validateAddress(this.shadowRoot.querySelector('#baseUrl').value);
      const response=await fetch('/paperboard_static/offline.bundle.js',{cache:'no-store'});
      if(!response.ok)throw new Error('Der eigenständige Installer konnte nicht geladen werden.');
      const script=(await response.text()).replace(/<\/script/gi,'<\\/script');
      const data=JSON.stringify({meta:this.meta,firmwareBase64:base64(this.firmware),defaultBaseUrl:address}).replace(/</g,'\\u003c');
      this.download('PaperBoard-E1002-USB-Installer.html',`<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PaperBoard – E1002 USB-Installer</title><body><script id="paperboard-config" type="application/json">${data}</script><script>${script}</script></body></html>`,'text/html');
      this.message='Installerdatei heruntergeladen. In Chrome oder Edge öffnen. Sie enthält private Display-Zugänge; nicht weitergeben.';this.render();
    }catch(e){this.message=e.message;this.render();}
  }
}
if(!customElements.get('paperboard-installer'))customElements.define('paperboard-installer',PaperBoardInstaller);
