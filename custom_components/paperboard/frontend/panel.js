import {newWidget, clampWidget, scaleLayout, clone, uid} from './editor.js?v=0.3.0';
import './installer-ui.js?v=0.3.0';
import {themeCSS,footerHTML} from './theme.js?v=0.3.0';
import {panelCSS} from './panel-style.js?v=0.3.0';

const TYPES = {text:'Text', datetime:'Datum und Uhrzeit', sensor:'Sensorwert', weather:'Wetter', calendar:'Kalender', waste:'Abfalltermine', holiday:'Feiertage', status:'Gerätestatus', rectangle:'Rahmen', line:'Linie'};
const COLORS = {black:'Schwarz',white:'Weiß',red:'Rot',yellow:'Gelb',blue:'Blau',green:'Grün'};
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const options = (values, selected) => Object.entries(values).map(([v,l])=>`<option value="${esc(v)}" ${v===String(selected)?'selected':''}>${esc(l)}</option>`).join('');

class PaperBoardPanel extends HTMLElement {
  constructor() {
    super(); this.attachShadow({mode:'open'}); this.displays=[]; this.doc=null; this.page=0;
    this.selected=null; this.tab='editor'; this.dirty=false; this.undo=[]; this.redo=[];
    this.loading=true;this.loadError='';this.snap=true; this.autoPreview=true; this.preview=''; this.notice=''; this.busy=false;
  }
  set hass(value) { this._hass=value; if (!this.started && this.isConnected) {this.started=true; this.loadList();} }
  get hass() {return this._hass;}
  connectedCallback() {this.render(); if(this.hass && !this.started){this.started=true;this.loadList();}}
  disconnectedCallback(){clearTimeout(this.previewTimer); this.previewSerial=(this.previewSerial||0)+1;}
  async call(action, data={}) {return this.hass.callWS({type:'paperboard/command',action,...data});}
  async loadList() {
    this.loading=true;this.loadError='';this.render();
    try {
      const result=await this.call('list'); this.loading=false;this.displays=result.displays;this.version=result.version;this.models=result.models;
      if(this.displays.length) await this.load(this.displays[0].id); else this.render();
    } catch(e){this.loading=false;this.loadError=e.message||'PaperBoard konnte nicht geladen werden.';this.render();}
  }
  async load(id) {
    if(this.busy)return;
    if(this.dirty && !confirm('Ungespeicherte Änderungen verwerfen?')) {this.render();return;}
    try {
      this.current=await this.call('get',{entry_id:id});this.doc=this.current.layout;
      this.page=0;this.selected=null;this.undo=[];this.redo=[];this.dirty=false;this.preview='';
      this.render();this.schedulePreview();
    }catch(e){this.message(e.message,'error');}
  }
  message(text,kind='info'){this.notice=text;this.noticeKind=kind;this.render();}
  get currentPage(){return this.doc?.pages[this.page];}
  get currentWidget(){return this.currentPage?.widgets.find(w=>w.id===this.selected);}
  checkpoint(){this.undo.push(clone(this.doc));if(this.undo.length>40)this.undo.shift();this.redo=[];}
  changed(){this.previewSerial=(this.previewSerial||0)+1;this.dirty=true;this.preview='';if(this.noticeKind==='success')this.notice='';this.render();this.schedulePreview();}
  fieldChanged(el){
    if(this.editingField!==el){this.checkpoint();this.editingField=el;}
    this.previewSerial=(this.previewSerial||0)+1;this.dirty=true;this.preview='';
    const save=this.shadowRoot.querySelector('#save');if(save){save.textContent='Änderungen speichern';save.classList.add('primary');}
    if(this.noticeKind==='success'){this.notice='';this.shadowRoot.querySelector('.notice')?.remove();}
    const stage=this.shadowRoot.querySelector('#stage');if(stage)stage.innerHTML=this.currentPage.widgets.map(b=>this.widgetHTML(b)).join('');
    this.schedulePreview();
  }
  schedulePreview(){clearTimeout(this.previewTimer);if(this.autoPreview && this.doc)this.previewTimer=setTimeout(()=>this.showPreview(),600);}
  async showPreview(){
    const serial=this.previewSerial=(this.previewSerial||0)+1;
    const pending=this.shadowRoot.querySelector('#previewHint');if(pending){pending.textContent='Vorschau wird aktualisiert …';pending.className='';pending.setAttribute('role','status');}
    this.shadowRoot.querySelector('#previewImage')?.setAttribute('aria-busy','true');
    try {
      const result=await this.call('preview',{entry_id:this.current.id,layout:clone(this.doc),page:this.page});
      if(serial!==this.previewSerial)return;
      this.preview=`data:image/png;base64,${result.image}`;
      this.previewWarnings=result.warnings||[];
      const img=this.shadowRoot.querySelector('#previewImage');if(img){img.src=this.preview;img.hidden=false;img.removeAttribute('aria-busy');}
      const hint=this.shadowRoot.querySelector('#previewHint');if(hint){hint.textContent=this.previewWarnings.join(' · ')||'Originalbild in der Geräteauflösung. Farbreduktion ist bereits angewendet.';hint.className=this.previewWarnings.length?'note warning':'';}
    }catch(e){if(serial===this.previewSerial){const hint=this.shadowRoot.querySelector('#previewHint');if(hint){hint.textContent=e.message||'Vorschau fehlgeschlagen.';hint.className='note error';hint.setAttribute('role','alert');}const img=this.shadowRoot.querySelector('#previewImage');if(img){img.hidden=true;img.removeAttribute('aria-busy');}}}
  }
  async save(){
    if(this.busy)return;this.busy=true;this.render();
    try{
      const result=await this.call('save',{entry_id:this.current.id,layout:clone(this.doc),revision:this.current.revision});
      this.current=result;this.doc=result.layout;this.dirty=false;this.notice='Gespeichert. Das Display erhält die Seiten bei seinem nächsten Bildabruf.';this.noticeKind='success';
    }catch(e){this.notice=e.message||'Speichern fehlgeschlagen.';this.noticeKind='error';}
    finally{this.busy=false;this.render();this.shadowRoot.querySelector('#save')?.focus({preventScroll:true});}
  }
  entityList(domain){return Object.keys(this.hass?.states||{}).filter(e=>!domain||e.startsWith(domain+'.')).sort();}
  entityInput(key,value='',domain='',extra=''){
    const list='entities-'+(domain||'all');
    return `<input data-bind="${key}" value="${esc(value)}" list="${list}" placeholder="${domain||'sensor'}.…" ${extra}>`;
  }
  render(){
    const root=this.shadowRoot; if(!root)return;
    const active=root.activeElement;
    const focusKey=['id','data-action','data-tab','data-page','data-select','data-widget'].find(key=>active?.hasAttribute(key));
    const focusValue=focusKey?active.getAttribute(focusKey):null;
    const editingNewWidget=active?.hasAttribute('data-add');
    const openDetails=new Set([...root.querySelectorAll('details[open]')].map(d=>d.querySelector('summary')?.textContent.split('·')[0].trim()));
    const w=this.currentWidget;
    root.innerHTML=`<style>${this.css()}</style><div class="shell">
      <header class="appHeader"><div class="brand"><div class="logoFrame"><img src="/paperboard_static/paperboard-logo.png" alt="PaperBoard" width="174" height="62"></div><div><strong>Deine Inhalte. Dein Display.</strong><small>E-Paper-Dashboards für Home Assistant</small></div></div>
        <div class="headerActions"><span class="version">Version ${esc(this.version||'0.3.0')}</span>
        ${this.doc?`<button id="save" class="${this.dirty?'primary':''}" ${this.busy?'disabled':''}>${this.busy?'Speichert …':this.dirty?'Änderungen speichern':'✓ Gespeichert'}</button>`:''}</div></header>
      ${this.notice?`<div role="${this.noticeKind==='error'?'alert':'status'}" class="notice ${esc(this.noticeKind)}"><span>${this.noticeKind==='error'?'Hinweis: ':''}${esc(this.notice)}</span><button id="dismiss" aria-label="Meldung schließen">×</button></div>`:''}
      ${this.loading?'<main class="loadState" role="status"><h1>PaperBoard wird geladen</h1><p><span class="loadingDot" aria-hidden="true"></span>Displays und Seiten werden abgerufen …</p></main>':this.loadError?`<main class="loadState error" role="alert"><h1>Verbindung fehlgeschlagen</h1><p>${esc(this.loadError)}</p><button id="retryLoad" class="primary">Erneut laden</button></main>`:!this.displays.length?`<main class="empty"><h1>Dein erstes PaperBoard</h1><p>Verbinde ein Display und gestalte deine eigenen Seiten.</p><a class="button primary" href="/config/integrations/dashboard/add?domain=paperboard">Display einrichten</a></main>`:`
      <nav aria-label="PaperBoard-Bereiche"><label class="deviceSelect"><span class="labelText">Display auswählen</span><select id="display">${this.displays.map(d=>`<option value="${esc(d.id)}" ${this.current?.id===d.id?'selected':''}>${esc(d.settings.name)}</option>`).join('')}</select></label>
        ${[['editor','Seiteneditor'],['sources','Datenquellen'],['device','Gerät & Verbindung']].map(([v,l])=>`<button data-tab="${v}" ${this.tab===v?'aria-current="page"':''} class="${this.tab===v?'active':''}">${l}</button>`).join('')}
        <a class="newDevice" href="/config/integrations/dashboard/add?domain=paperboard" aria-label="Weiteres Display hinzufügen">+ Display</a></nav>
      ${this.doc?this.tab==='editor'?this.editorHTML(w):this.tab==='sources'?this.sourcesHTML():this.deviceHTML():''}`}
      ${footerHTML}</div>
      ${['','calendar','sensor','weather'].map(domain=>`<datalist id="entities-${domain||'all'}">${this.entityList(domain).map(e=>`<option value="${esc(e)}">${esc(this.hass.states[e]?.attributes?.friendly_name||e)}</option>`).join('')}</datalist>`).join('')}`;
    this.bind();
    root.querySelectorAll('details').forEach(d=>{if(openDetails.has(d.querySelector('summary')?.textContent.split('·')[0].trim()))d.open=true;});
    const focusTarget=editingNewWidget?root.querySelector('.inspector input'):focusKey?root.querySelector(`[${focusKey}="${CSS.escape(focusValue)}"]`):null;
    focusTarget?.focus({preventScroll:!editingNewWidget});
  }
  editorHTML(w){
    return `<div class="workspace"><aside class="pages" aria-label="Seiten und Bausteine"><div class="asideTitle">SEITEN <span>${this.doc.pages.length}/12</span></div><div class="pageList">
      ${this.doc.pages.map((p,i)=>`<button data-page="${i}" ${i===this.page?'aria-current="true"':''} class="page ${i===this.page?'chosen':''}"><span>${String(i+1).padStart(2,'0')}</span>${esc(p.name)}</button>`).join('')}
      <button id="addPage" class="dashed" ${this.doc.pages.length>=12?'disabled':''}>+ Neue Seite</button></div>
      <div class="palette"><details><summary>Baustein hinzufügen</summary><div class="widgets">${Object.entries(TYPES).map(([k,l])=>`<button data-add="${k}">+ ${l}</button>`).join('')}</div></details>
      <details><summary>Ebenen · ${this.currentPage.widgets.length} Bausteine</summary><p class="small">Oben liegende Bausteine stehen zuerst.</p><div class="layers">
      ${[...this.currentPage.widgets].reverse().map(b=>`<button class="layer ${b.id===this.selected?'chosen':''}" data-select="${esc(b.id)}">${esc(b.title||b.text||TYPES[b.type])}</button>`).join('')}
      </div></details></div>
      </aside><main class="editor"><div class="toolbar"><label>Seitenname<input id="pageName" value="${esc(this.currentPage.name)}"></label>
        <button data-action="pageUp" title="Seite nach vorne" aria-label="Seite nach vorne">←</button><button data-action="pageDown" title="Seite nach hinten" aria-label="Seite nach hinten">→</button>
        <button data-action="copyPage">Seite kopieren</button><button data-action="deletePage" ${this.doc.pages.length<2?'disabled':''}>Seite löschen</button></div>
      <div class="tools"><button data-action="undo" ${!this.undo.length?'disabled':''}>↶ Zurück</button><button data-action="redo" ${!this.redo.length?'disabled':''}>↷ Vor</button>
        <label><input id="snap" type="checkbox" ${this.snap?'checked':''}> Raster 8 px</label><label><input id="autoPreview" type="checkbox" ${this.autoPreview?'checked':''}> Automatische Vorschau</label>
        <button id="preview">Vorschau aktualisieren</button></div>
      <div class="stageWrap"><div id="stage" aria-label="Bearbeitbare Displayseite" class="stage ${this.snap?'grid':''}" style="aspect-ratio:${this.doc.width}/${this.doc.height}">
        ${this.currentPage.widgets.map(b=>this.widgetHTML(b)).join('')}</div></div>
      <div class="canvasMeta">${this.doc.width} × ${this.doc.height} Zeichenfläche → ${this.current.size.join(' × ')} Displaypixel · ${this.currentPage.widgets.length}/40 Bausteine</div>
      <section class="preview"><div class="previewHeading"><h3>Displayvorschau</h3><span>So wird die Seite gerendert</span></div>
        <img id="previewImage" alt="Gerenderte Vorschau der aktuellen Seite" ${this.preview?`src="${this.preview}"`:'hidden'}><p id="previewHint" role="status">${this.preview?esc((this.previewWarnings||[]).join(' · '))||'Originalbild in der Geräteauflösung.':'Vorschau wird erzeugt …'}</p></section>
      </main><aside class="inspector"><div class="asideTitle">${w?'BAUSTEIN BEARBEITEN':'ZEICHENFLÄCHE'}</div>
        ${w?this.inspectorHTML(w):`<h3>Deine Seite gestalten</h3><p>Wähle links einen Baustein und ziehe ihn an die gewünschte Stelle. Am unteren rechten Griff änderst du seine Größe.</p>
          <label>Breite<input id="canvasWidth" type="number" min="240" max="2000" value="${this.doc.width}"></label>
          <label>Höhe<input id="canvasHeight" type="number" min="240" max="2000" value="${this.doc.height}"></label>
          <button data-action="resizeCanvas">Zeichenfläche anpassen</button><p>Alle Bausteine werden proportional angepasst.</p>`}
        <hr><button data-action="export">Layout exportieren</button><label class="file">Layout importieren<input id="import" type="file" accept=".json,application/json"></label>
      </aside></div>`;
  }
  widgetHTML(b){
    let content=b.text||b.title||TYPES[b.type];
    if(b.type==='datetime')content=new Intl.DateTimeFormat('de-DE',{dateStyle:'medium',timeStyle:'short'}).format(new Date());
    if(['sensor','weather'].includes(b.type))content=(b.title||TYPES[b.type])+'\n'+(this.hass.states[b.entity]?.state||'Entität auswählen');
    if(b.type==='calendar')content=(b.title||'Kalender')+'\n'+(b.mode==='today'?'Heute · Morgen · Nächste Termine':b.mode+' Tage')+'\n'+(this.doc.bindings.calendars.length?this.doc.bindings.calendars.map(c=>c.label||c.entity).join(' · '):'Kalender in „Datenquellen“ auswählen');
    return `<div data-widget="${esc(b.id)}" tabindex="0" role="button" aria-label="${esc(TYPES[b.type])} auswählen" class="widget ${b.id===this.selected?'selected':''} ${b.type}" style="left:${b.x/this.doc.width*100}%;top:${b.y/this.doc.height*100}%;width:${b.w/this.doc.width*100}%;height:${b.h/this.doc.height*100}%;--widget-color:${b.color};--widget-bg:${b.background};font-size:${b.font_size/this.doc.width*100}cqw;text-align:${b.align||'left'};font-weight:${b.bold?700:400};${b.border?'box-shadow:inset 0 0 0 1px '+b.color+';':''}"><span>${esc(content)}</span>${b.id===this.selected?'<i class="resize" data-resize="1" title="Größe ändern"></i>':''}</div>`;
  }
  inspectorHTML(w){
    const number=(key,label,min,max)=>`<label>${label}<input data-prop="${key}" type="number" min="${min}" max="${max}" value="${w[key]}"></label>`;
    return `<h3>${TYPES[w.type]}</h3><div class="pairs">${number('x','Links',0,this.doc.width-1)}${number('y','Oben',0,this.doc.height-1)}${number('w','Breite',1,this.doc.width)}${number('h','Höhe',1,this.doc.height)}</div>
      ${w.type==='text'?`<label>Text<textarea data-prop="text" rows="5" maxlength="2000">${esc(w.text)}</textarea></label>`:''}
      ${!['line','rectangle','text','datetime','status'].includes(w.type)?`<label>Überschrift<input data-prop="title" maxlength="100" value="${esc(w.title)}"></label>`:''}
      ${['sensor','weather','waste','holiday'].includes(w.type)?`<label>Entität (optional bei Zusatzkalendern)<input data-prop="entity" list="entities-${w.type==='weather'?'weather':w.type==='sensor'?'all':'calendar'}" value="${esc(w.entity)}"></label>`:''}
      ${w.type==='calendar'?`<label>Ansicht<select data-prop="mode">${options({today:'Heute und nächste Termine',7:'7 Tage',14:'14 Tage'},w.mode)}</select></label>`:''}
      ${number('font_size','Schriftgröße',8,120)}
      <div class="pairs"><label>Textfarbe<select data-prop="color">${options(COLORS,w.color)}</select></label><label>Hintergrund<select data-prop="background">${options(COLORS,w.background)}</select></label></div>
      <label>Ausrichtung<select data-prop="align">${options({left:'Links',center:'Zentriert',right:'Rechts'},w.align||'left')}</select></label>
      <label class="check"><input type="checkbox" data-prop="bold" ${w.bold?'checked':''}> Fettschrift</label><label class="check"><input type="checkbox" data-prop="border" ${w.border?'checked':''}> Rahmen</label>
      <div class="pairs"><button data-action="duplicate">Kopieren</button><button data-action="delete">Löschen</button><button data-action="back">Nach hinten</button><button data-action="front">Nach vorne</button><button data-action="alignLeft">Links bündig</button><button data-action="alignCenter">Mittig</button></div>
      <p>Überlagerungen sind erlaubt. Jeder Baustein wird auf seine eigene Fläche begrenzt.</p>`;
  }
  sourcesHTML(){
    const b=this.doc.bindings;
    return `<main class="settings"><h1>Datenquellen</h1><p>Wähle die Quellen für dieses Display. Speichere anschließend deine Änderungen.</p>
      <section><h2>Kalender</h2><p>Bezeichnung und Farbe helfen beim Zuordnen. Mit „Titel verbergen“ erscheint nur „Termin“.</p>
      ${b.calendars.length?'':'<p class="note">Noch kein Kalender ausgewählt. Füge deinen ersten Kalender hinzu.</p>'}
      ${b.calendars.map((c,i)=>`<div class="calendarSource"><label>Kalender<input data-cal="${i}" data-key="entity" list="entities-calendar" value="${esc(c.entity)}"></label><label>Bezeichnung<input data-cal="${i}" data-key="label" maxlength="60" value="${esc(c.label)}"></label><label>Farbe<select data-cal="${i}" data-key="color">${options(COLORS,c.color)}</select></label><label class="check"><input type="checkbox" data-cal="${i}" data-key="private_titles" ${c.private_titles?'checked':''}> Titel verbergen</label><button data-remove-cal="${i}" aria-label="Kalender ${i+1} entfernen">Entfernen</button></div>`).join('')}
      <button id="addCalendar" ${b.calendars.length>=12?'disabled':''}>+ Kalender hinzufügen</button></section>
      <section><h2>Abfall und Feiertage</h2><p>Zusatztermine werden bis zu 90 Tage im Voraus berücksichtigt.</p>
      <div class="bindingGrid"><label>Abfallkalender${this.entityInput('waste_calendar',b.waste_calendar,'calendar')}</label>
      <label>Feiertagskalender${this.entityInput('holiday_calendar',b.holiday_calendar,'calendar')}</label></div></section>
      <details><summary>Eigene Statussensoren auswählen</summary><p>Optional: Verwende eigene Sensoren für Akku, Temperatur und Luftfeuchtigkeit. Ohne Auswahl nutzt die Installer-Firmware ihre gemeldeten Gerätemesswerte.</p><div class="bindingGrid"><label>Akku${this.entityInput('battery_entity',b.battery_entity)}</label><label>Temperatur${this.entityInput('temperature_entity',b.temperature_entity)}</label><label>Luftfeuchtigkeit${this.entityInput('humidity_entity',b.humidity_entity)}</label></div></details></main>`;
  }
  deviceHTML(){
    const s=this.current.settings,status=this.current.device_status||{};
    const row=(label,value)=>`<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`;
    return `<main class="settings"><h1>${esc(s.name)}</h1><p>${esc(this.models[s.model].name)} · ${this.current.size.join(' × ')} Pixel · ${s.power==='battery'?'Akkubetrieb':'Netzbetrieb'}</p>
      <div class="settingsGrid"><section class="deviceSetup"><h2>Display einrichten</h2>${s.model==='e1002'?`<p>Verbinde dein E1002 per USB und übertrage Firmware und persönliche Geräteeinstellungen.</p><button id="openInstaller" class="primary" ${this.current.installer_available?'':'disabled'}>E1002-USB-Installer öffnen</button>${!this.current.installer_available?'<p class="note error" role="alert">Firmwarepaket fehlt. Installiere das vollständige PaperBoard-Update und starte Home Assistant neu.</p>':''}<p class="small">Erst nach deiner Bestätigung wird eine Neuinstallation gestartet. Dabei werden vorhandene Geräteeinstellungen ersetzt.</p>`:'<p class="note warning">Für dieses Modell ist noch kein USB-Installer freigegeben. Verwende hier keine E1002-Firmware.</p>'}</section>
      <section class="deviceStatus"><h2>Verbindungsstatus</h2><p class="note">${status.downloaded?'✓ Bilddownload vom Gerät bestätigt.':status.last_seen?'Gerät verbunden. Der erste Bilddownload ist noch nicht bestätigt.':'Noch keine Gerätemeldung. Richte dein Display ein oder prüfe seine Verbindung.'}</p>
      <dl class="statusList">${row('Firmware',status.version||'Noch keine Meldung')}${row('Letzte Gerätemeldung',status.last_seen||'Noch keine Meldung')}${row('Geräteadresse',status.address||'Noch nicht bekannt')}${row('Letzter Bildabruf',this.current.last_request||'Noch kein Bild abgerufen')}${row('Letzte Bilderzeugung',this.current.last_render||'Noch keine')}${row('Seiten',this.doc.pages.length)}</dl><button id="refreshStatus">Status neu laden</button></section>
      <section class="deviceSettings"><h2>Geräteeinstellungen</h2><p>Abruf alle ${s.refresh_interval} Sekunden. Die Installer-Firmware übernimmt Änderungen an Seitenanzahl, Ausrichtung und Abrufabstand beim nächsten Kontakt.</p><a class="button" href="/config/integrations/integration/paperboard">Geräteeinstellungen öffnen</a>
      <details class="helpDetails"><summary>Hinweise zu Modell und Akkubetrieb</summary><p>Das Akkuprofil aktiviert noch keinen automatischen Tiefschlaf. Die Firmware bleibt erreichbar.</p><p>Der Hardwaretest am E1002 steht noch aus. E1001, E1003 und E1004 sind experimentelle Ausgabeprofile ohne freigegebene Gerätefirmware.</p></details></section>
      <section class="deviceConnection"><h2>Weitere Verbindungsmöglichkeiten</h2><details><summary>Vorhandene ESPHome-Firmware verbinden</summary><p>Übernimm den Bildpfad und den Display-Schlüssel bewusst in deine vorhandene Konfiguration. WLAN, API, OTA und IP werden hier nicht verändert.</p><button id="connection">Verbindungsdaten anzeigen</button><div id="connectionDetails"></div></details></section>
</div></main>`;
  }
  bind(){
    const root=this.shadowRoot;
    if(this.busy)root.querySelectorAll('input,select,textarea,button').forEach(el=>el.disabled=true);
    const on=(selector,event,fn)=>root.querySelectorAll(selector).forEach(el=>el.addEventListener(event,fn));
    on('#retryLoad','click',()=>this.loadList());on('#save','click',()=>this.save());on('#dismiss','click',()=>{this.notice='';this.render();});
    on('#display','change',e=>this.load(e.target.value));
    on('[data-tab]','click',e=>{this.tab=e.currentTarget.dataset.tab;this.render();});
    on('[data-page]','click',e=>{this.page=+e.currentTarget.dataset.page;this.selected=null;this.preview='';this.render();this.schedulePreview();});
    on('[data-add]','click',e=>{if(this.currentPage.widgets.length>=40)return this.message('Höchstens 40 Bausteine pro Seite.');this.checkpoint();const b=newWidget(e.currentTarget.dataset.add,this.doc);this.currentPage.widgets.push(b);this.selected=b.id;this.changed();});
    on('[data-select]','click',e=>{this.selected=e.currentTarget.dataset.select;this.render();});
    on('[data-action]','click',e=>this.action(e.currentTarget.dataset.action));
    on('#pageName','input',e=>{this.fieldChanged(e.target);this.currentPage.name=e.target.value.slice(0,80);});
    on('#addPage','click',()=>{this.checkpoint();this.doc.pages.push({id:uid(),name:'Neue Seite',widgets:[]});this.page=this.doc.pages.length-1;this.selected=null;this.changed();});
    on('#snap','change',e=>{this.snap=e.target.checked;this.render();});
    on('#autoPreview','change',e=>{this.autoPreview=e.target.checked;this.schedulePreview();});on('#preview','click',()=>this.showPreview());
    on('[data-prop]','input',e=>{
      const el=e.target, key=el.dataset.prop;this.fieldChanged(el);
      this.currentWidget[key]=el.type==='checkbox'?el.checked:el.type==='number'?Number(el.value):el.value;
      clampWidget(this.currentWidget,this.doc);
      const stage=root.querySelector('#stage');if(stage)stage.innerHTML=this.currentPage.widgets.map(b=>this.widgetHTML(b)).join('');
    });
    on('[data-bind]','input',e=>{this.fieldChanged(e.target);this.doc.bindings[e.target.dataset.bind]=e.target.value.trim();});
    on('[data-cal]','input',e=>{this.fieldChanged(e.target);const el=e.target;this.doc.bindings.calendars[+el.dataset.cal][el.dataset.key]=el.type==='checkbox'?el.checked:el.value;});
    on('[data-remove-cal]','click',e=>{this.checkpoint();this.doc.bindings.calendars.splice(+e.target.dataset.removeCal,1);this.changed();});
    on('#addCalendar','click',()=>{const choices=this.entityList('calendar');if(!choices.length)return this.message('Keine Kalenderentitäten in Home Assistant gefunden. Bitte zuerst einen Kalender einrichten.');this.checkpoint();this.doc.bindings.calendars.push({entity:choices[0],label:'Kalender',color:'blue',private_titles:false});this.changed();});
    on('#import','change',async e=>{const file=e.target.files[0];if(!file)return;if(file.size>200000)return this.message('Die Layoutdatei ist zu groß.','error');try{const candidate=JSON.parse(await file.text());await this.call('preview',{entry_id:this.current.id,layout:candidate,page:0});this.checkpoint();this.doc=candidate;this.page=0;this.selected=null;this.changed();}catch(err){this.message(err.message||'Ungültige Layoutdatei.','error');}});
    on('#connection','click',()=>this.connection());on('#refreshStatus','click',async()=>{try{const data=await this.call('get',{entry_id:this.current.id});this.current={...this.current,last_request:data.last_request,last_render:data.last_render,device_status:data.device_status,installer_available:data.installer_available};this.render();}catch(e){this.message(e.message,'error');}});
    on('#openInstaller','click',()=>this.openInstaller());
    on('#stage','pointerdown',e=>this.dragStart(e));
    on('[data-widget]','keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();this.selected=e.currentTarget.dataset.widget;this.render();}});
  }
  dragStart(e){
    const node=e.target.closest('[data-widget]');
    if(!node){this.selected=null;this.render();return;}
    e.preventDefault();this.selected=node.dataset.widget;
    const b=this.currentWidget, start={...b}, resize=Boolean(e.target.closest('[data-resize]'));
    const stage=this.shadowRoot.querySelector('#stage'), rect=stage.getBoundingClientRect();
    const sx=e.clientX,sy=e.clientY; let moved=false;
    const previousRedo=this.redo;
    this.checkpoint();node.classList.add('selected');node.setPointerCapture(e.pointerId);
    const move=ev=>{
      let dx=(ev.clientX-sx)*this.doc.width/rect.width,dy=(ev.clientY-sy)*this.doc.height/rect.height;
      if(this.snap && !ev.altKey){dx=Math.round(dx/8)*8;dy=Math.round(dy/8)*8;}
      if(resize){b.w=Math.round(start.w+dx);b.h=Math.round(start.h+dy);}else{b.x=Math.round(start.x+dx);b.y=Math.round(start.y+dy);}
      clampWidget(b,this.doc);moved=moved||Math.abs(dx)+Math.abs(dy)>0;
      node.style.left=b.x/this.doc.width*100+'%';node.style.top=b.y/this.doc.height*100+'%';node.style.width=b.w/this.doc.width*100+'%';node.style.height=b.h/this.doc.height*100+'%';
    };
    const finish=()=>{node.removeEventListener('pointermove',move);node.removeEventListener('pointerup',finish);node.removeEventListener('pointercancel',finish);if(moved)this.changed();else{this.undo.pop();this.redo=previousRedo;this.render();}};
    node.addEventListener('pointermove',move);node.addEventListener('pointerup',finish);node.addEventListener('pointercancel',finish);
  }
  action(action){
    const p=this.currentPage,w=this.currentWidget;
    if(action==='export'){const a=document.createElement('a');const url=URL.createObjectURL(new Blob([JSON.stringify(this.doc,null,2)],{type:'application/json'}));a.href=url;a.download='paperboard-layout.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return;}
    if(action==='undo'){if(!this.undo.length)return;this.redo.push(clone(this.doc));this.doc=this.undo.pop();}
    else if(action==='redo'){if(!this.redo.length)return;this.undo.push(clone(this.doc));this.doc=this.redo.pop();}
    else {
      if(['duplicate','delete','back','front','alignLeft','alignCenter'].includes(action)&&!w)return;
      if(action==='copyPage'&&this.doc.pages.length>=12)return this.message('Höchstens zwölf Seiten.');
      if(action==='duplicate'&&p.widgets.length>=40)return this.message('Höchstens 40 Bausteine.');
      if(action==='deletePage'&&(this.doc.pages.length<2||!confirm('Diese Seite löschen?')))return;
      this.checkpoint();
      if(action==='duplicate'){const copy={...w,id:uid(),x:w.x+16,y:w.y+16};clampWidget(copy,this.doc);p.widgets.push(copy);this.selected=copy.id;}
      if(action==='delete'){p.widgets=p.widgets.filter(b=>b.id!==w.id);this.selected=null;}
      if(action==='front'||action==='back'){p.widgets=p.widgets.filter(b=>b.id!==w.id);p.widgets[action==='front'?'push':'unshift'](w);}
      if(action==='alignLeft')w.x=0;if(action==='alignCenter')w.x=Math.round((this.doc.width-w.w)/2);
      if(action==='copyPage'){const copy=clone(p);copy.id=uid();copy.name+=' (Kopie)';this.doc.pages.splice(this.page+1,0,copy);this.page++;}
      if(action==='deletePage'){this.doc.pages.splice(this.page,1);this.page=Math.max(0,this.page-1);this.selected=null;}
      if(action==='pageUp'&&this.page>0){[this.doc.pages[this.page-1],this.doc.pages[this.page]]=[p,this.doc.pages[this.page-1]];this.page--;}
      if(action==='pageDown'&&this.page<this.doc.pages.length-1){[this.doc.pages[this.page+1],this.doc.pages[this.page]]=[p,this.doc.pages[this.page+1]];this.page++;}
      if(action==='resizeCanvas'){
        const width=Number(this.shadowRoot.querySelector('#canvasWidth').value),height=Number(this.shadowRoot.querySelector('#canvasHeight').value);
        if(!Number.isInteger(width)||!Number.isInteger(height)||width<240||height<240||width>2000||height>2000){
          this.undo.pop();this.message('Breite und Höhe müssen zwischen 240 und 2000 liegen.','error');
          const wi=this.shadowRoot.querySelector('#canvasWidth'),hi=this.shadowRoot.querySelector('#canvasHeight');wi.value=width;hi.value=height;
          const invalid=(!Number.isInteger(width)||width<240||width>2000)?wi:hi;invalid.setAttribute('aria-invalid','true');invalid.focus();return;
        }
        scaleLayout(this.doc,width,height);
      }
    }
    this.page=Math.min(this.page,this.doc.pages.length-1);this.changed();
  }
  async connection(){
    try{const d=await this.call('connection',{entry_id:this.current.id});const el=this.shadowRoot.querySelector('#connectionDetails');
      el.innerHTML='<p>Nur für dieses Display gültig. Den Schlüssel nicht öffentlich weitergeben.</p><pre></pre><p>Die letzte Zahl im Pfad ist die Seitennummer, beginnend mit 0. Bei HTTPS muss die Gerätefirmware das Zertifikat prüfen.</p>';
      el.querySelector('pre').textContent=`Bild-URL: ${location.origin}${d.path}\nHTTP-Header: ${d.header}\nSchlüssel: ${d.token}\nSeiten: ${d.pages}\nAbrufintervall: ${d.refresh_interval} s`;
    }catch(e){this.message(e.message,'error');}
  }
  openInstaller(){
    if(this.dirty)return this.message('Bitte zuerst deine Seitenänderungen speichern.');
    this.busy=true;
    this.shadowRoot.querySelectorAll('input,select,textarea,button').forEach(el=>el.disabled=true);
    const installer=document.createElement('paperboard-installer');
    installer.context={hass:this.hass,entry_id:this.current.id,defaultBaseUrl:location.origin,previewOnly:this.hass.paperboardPreviewOnly===true};
    this.shadowRoot.querySelector('.shell').inert=true;
    installer.addEventListener('installer-close',()=>{this.busy=false;this.render();this.shadowRoot.querySelector('#openInstaller')?.focus();this.call('get',{entry_id:this.current.id}).then(info=>{this.current=info;this.render();}).catch(()=>{});});
    this.shadowRoot.append(installer);
  }
  css(){return themeCSS+panelCSS;}
}
if(!customElements.get('paperboard-panel'))customElements.define('paperboard-panel',PaperBoardPanel);
