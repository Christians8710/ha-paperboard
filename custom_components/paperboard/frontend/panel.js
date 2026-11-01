import {newWidget, clampWidget, scaleLayout, clone, uid} from './editor.js';

const TYPES = {text:'Text', datetime:'Datum und Uhrzeit', sensor:'Sensorwert', weather:'Wetter', calendar:'Kalender', waste:'Abfalltermine', holiday:'Feiertage', status:'Gerätestatus', rectangle:'Rahmen', line:'Linie'};
const COLORS = {black:'Schwarz',white:'Weiß',red:'Rot',yellow:'Gelb',blue:'Blau',green:'Grün'};
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const options = (values, selected) => Object.entries(values).map(([v,l])=>`<option value="${esc(v)}" ${v===String(selected)?'selected':''}>${esc(l)}</option>`).join('');

class PaperBoardPanel extends HTMLElement {
  constructor() {
    super(); this.attachShadow({mode:'open'}); this.displays=[]; this.doc=null; this.page=0;
    this.selected=null; this.tab='editor'; this.dirty=false; this.undo=[]; this.redo=[];
    this.snap=true; this.autoPreview=true; this.preview=''; this.notice=''; this.busy=false;
  }
  set hass(value) { this._hass=value; if (!this.started && this.isConnected) {this.started=true; this.loadList();} }
  get hass() {return this._hass;}
  connectedCallback() {this.render(); if(this.hass && !this.started){this.started=true;this.loadList();}}
  disconnectedCallback(){clearTimeout(this.previewTimer); this.previewSerial=(this.previewSerial||0)+1;}
  async call(action, data={}) {return this.hass.callWS({type:'paperboard/command',action,...data});}
  async loadList() {
    try {
      const result=await this.call('list'); this.displays=result.displays;this.version=result.version;this.models=result.models;
      if(this.displays.length) await this.load(this.displays[0].id); else this.render();
    } catch(e){this.message(e.message||'PaperBoard konnte nicht geladen werden.','error');}
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
  changed(){this.previewSerial=(this.previewSerial||0)+1;this.dirty=true;this.preview='';this.render();this.schedulePreview();}
  fieldChanged(el){
    if(this.editingField!==el){this.checkpoint();this.editingField=el;}
    this.previewSerial=(this.previewSerial||0)+1;this.dirty=true;this.preview='';
    const save=this.shadowRoot.querySelector('#save');if(save)save.textContent='Änderungen speichern';
    const stage=this.shadowRoot.querySelector('#stage');if(stage)stage.innerHTML=this.currentPage.widgets.map(b=>this.widgetHTML(b)).join('');
    this.schedulePreview();
  }
  schedulePreview(){clearTimeout(this.previewTimer);if(this.autoPreview && this.doc)this.previewTimer=setTimeout(()=>this.showPreview(),600);}
  async showPreview(){
    const serial=this.previewSerial=(this.previewSerial||0)+1;
    try {
      const result=await this.call('preview',{entry_id:this.current.id,layout:clone(this.doc),page:this.page});
      if(serial!==this.previewSerial)return;
      this.preview=`data:image/png;base64,${result.image}`;
      this.previewWarnings=result.warnings||[];
      const img=this.shadowRoot.querySelector('#previewImage');if(img){img.src=this.preview;img.hidden=false;}
      const hint=this.shadowRoot.querySelector('#previewHint');if(hint)hint.textContent=this.previewWarnings.join(' · ')||'Originalbild in der Geräteauflösung. Farbreduktion ist bereits angewendet.';
    }catch(e){if(serial===this.previewSerial){const hint=this.shadowRoot.querySelector('#previewHint');if(hint)hint.textContent=e.message||'Vorschau fehlgeschlagen.';}}
  }
  async save(){
    if(this.busy)return;this.busy=true;this.render();
    try{
      const result=await this.call('save',{entry_id:this.current.id,layout:clone(this.doc),revision:this.current.revision});
      this.current=result;this.doc=result.layout;this.dirty=false;this.notice='Gespeichert. Das Display erhält die Seiten bei seinem nächsten Bildabruf.';this.noticeKind='success';
    }catch(e){this.notice=e.message||'Speichern fehlgeschlagen.';this.noticeKind='error';}
    finally{this.busy=false;this.render();}
  }
  entityList(domain){return Object.keys(this.hass?.states||{}).filter(e=>!domain||e.startsWith(domain+'.')).sort();}
  entityInput(key,value='',domain='',extra=''){
    const list='entities-'+(domain||'all');
    return `<input data-bind="${key}" value="${esc(value)}" list="${list}" placeholder="${domain||'sensor'}.…" ${extra}>`;
  }
  render(){
    const root=this.shadowRoot; if(!root)return;
    const w=this.currentWidget;
    root.innerHTML=`<style>${this.css()}</style>
      <header><div class="brand"><span class="mark">P</span><div><strong>PaperBoard</strong><small>Deine Inhalte. Dein Display.</small></div></div>
        <div class="headerActions"><span class="version">${esc(this.version||'0.1.0')} · Entwicklungsversion</span>
        ${this.doc?`<button id="save" class="primary" ${this.busy?'disabled':''}>${this.busy?'Speichert …':this.dirty?'Änderungen speichern':'Gespeichert'}</button>`:''}</div></header>
      ${this.notice?`<div role="status" class="notice ${esc(this.noticeKind)}">${esc(this.notice)}<button id="dismiss" aria-label="Meldung schließen">×</button></div>`:''}
      ${!this.displays.length?`<main class="empty"><h1>Dein erstes PaperBoard</h1><p>Füge unter Einstellungen → Geräte & Dienste ein PaperBoard-Display hinzu.</p><a href="/config/integrations/dashboard/add?domain=paperboard">Display einrichten →</a></main>`:`
      <nav><label class="deviceSelect">Display <select id="display">${this.displays.map(d=>`<option value="${esc(d.id)}" ${this.current?.id===d.id?'selected':''}>${esc(d.settings.name)}</option>`).join('')}</select></label>
        ${[['editor','Seiteneditor'],['sources','Datenquellen'],['device','Gerät & Verbindung']].map(([v,l])=>`<button data-tab="${v}" class="${this.tab===v?'active':''}">${l}</button>`).join('')}
        <a class="newDevice" href="/config/integrations/dashboard/add?domain=paperboard">+ Display</a></nav>
      ${this.doc?this.tab==='editor'?this.editorHTML(w):this.tab==='sources'?this.sourcesHTML():this.deviceHTML():''}`}
      ${['','calendar','sensor','weather'].map(domain=>`<datalist id="entities-${domain||'all'}">${this.entityList(domain).map(e=>`<option value="${esc(e)}">${esc(this.hass.states[e]?.attributes?.friendly_name||e)}</option>`).join('')}</datalist>`).join('')}`;
    this.bind();
  }
  editorHTML(w){
    return `<div class="workspace"><aside class="pages"><div class="asideTitle">SEITEN <span>${this.doc.pages.length}/12</span></div>
      ${this.doc.pages.map((p,i)=>`<button data-page="${i}" class="page ${i===this.page?'chosen':''}"><span>${String(i+1).padStart(2,'0')}</span>${esc(p.name)}</button>`).join('')}
      <button id="addPage" class="dashed" ${this.doc.pages.length>=12?'disabled':''}>+ Neue Seite</button>
      <div class="asideTitle">BAUSTEINE</div><div class="widgets">${Object.entries(TYPES).map(([k,l])=>`<button data-add="${k}">+ ${l}</button>`).join('')}</div>
      <div class="asideTitle">EBENEN <small>oben = vorne</small></div>
      ${[...this.currentPage.widgets].reverse().map(b=>`<button class="layer ${b.id===this.selected?'chosen':''}" data-select="${esc(b.id)}">${esc(b.title||b.text||TYPES[b.type])}</button>`).join('')}
      </aside><main class="editor"><div class="toolbar"><input id="pageName" aria-label="Seitenname" value="${esc(this.currentPage.name)}">
        <button data-action="pageUp" title="Seite nach vorne">←</button><button data-action="pageDown" title="Seite nach hinten">→</button>
        <button data-action="copyPage">Seite kopieren</button><button data-action="deletePage" ${this.doc.pages.length<2?'disabled':''}>Seite löschen</button></div>
      <div class="tools"><button data-action="undo" ${!this.undo.length?'disabled':''}>↶ Zurück</button><button data-action="redo" ${!this.redo.length?'disabled':''}>↷ Vor</button>
        <label><input id="snap" type="checkbox" ${this.snap?'checked':''}> Raster 8 px</label><label><input id="autoPreview" type="checkbox" ${this.autoPreview?'checked':''}> Automatische Vorschau</label>
        <button id="preview">Vorschau aktualisieren</button></div>
      <div class="stageWrap"><div id="stage" class="stage ${this.snap?'grid':''}" style="aspect-ratio:${this.doc.width}/${this.doc.height}">
        ${this.currentPage.widgets.map(b=>this.widgetHTML(b)).join('')}</div></div>
      <div class="canvasMeta">${this.doc.width} × ${this.doc.height} Zeichenfläche → ${this.current.size.join(' × ')} Displaypixel · ${this.currentPage.widgets.length}/40 Bausteine</div>
      <section class="preview"><div class="previewHeading"><h3>Displayvorschau</h3><span>So wird die Seite gerendert</span></div>
        <img id="previewImage" alt="Gerenderte Vorschau der aktuellen Seite" ${this.preview?`src="${this.preview}"`:'hidden'}><p id="previewHint">${this.preview?esc((this.previewWarnings||[]).join(' · '))||'Originalbild in der Geräteauflösung.':'Vorschau wird erzeugt …'}</p></section>
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
    return `<main class="settings"><h1>Datenquellen</h1><p>Diese Quellen gelten für die Seiten dieses Displays. Änderungen werden mit „Änderungen speichern“ übernommen.</p>
      <section><h2>Kalender</h2><p>Jeder Kalender erhält eine Bezeichnung und Farbe. „Titel verbergen“ zeigt nur „Termin“ an.</p>
      ${b.calendars.map((c,i)=>`<div class="calendarSource"><label>Kalender<input data-cal="${i}" data-key="entity" list="entities-calendar" value="${esc(c.entity)}"></label><label>Bezeichnung<input data-cal="${i}" data-key="label" maxlength="60" value="${esc(c.label)}"></label><label>Farbe<select data-cal="${i}" data-key="color">${options(COLORS,c.color)}</select></label><label class="check"><input type="checkbox" data-cal="${i}" data-key="private_titles" ${c.private_titles?'checked':''}> Titel verbergen</label><button data-remove-cal="${i}">Entfernen</button></div>`).join('')}
      <button id="addCalendar" ${b.calendars.length>=12?'disabled':''}>+ Kalender hinzufügen</button></section>
      <section><h2>Zusatzkalender</h2><p>Feiertage und Abfalltermine werden bis zu 90 Tage voraus abgefragt.</p>
      <label>Abfallkalender${this.entityInput('waste_calendar',b.waste_calendar,'calendar')}</label>
      <label>Feiertagskalender${this.entityInput('holiday_calendar',b.holiday_calendar,'calendar')}</label></section>
      <section><h2>Gerätestatus</h2><label>Akku${this.entityInput('battery_entity',b.battery_entity)}</label><label>Temperatur${this.entityInput('temperature_entity',b.temperature_entity)}</label><label>Luftfeuchtigkeit${this.entityInput('humidity_entity',b.humidity_entity)}</label></section>
      <p>Die beiden Kalender aus deinem bisherigen Projekt kannst du hier auswählen. Es werden keine persönlichen Entitäten vorgegeben.</p></main>`;
  }
  deviceHTML(){
    const s=this.current.settings;
    return `<main class="settings"><h1>${esc(s.name)}</h1><section><h2>${esc(this.models[s.model].name)}</h2><p>${this.current.size.join(' × ')} Pixel · ${s.power==='battery'?'Akkubetrieb':'Netzbetrieb'} · Gewünschter Abruf alle ${s.refresh_interval} Sekunden</p>
      <p>Diese Betriebsart ist eine Vorgabe für die Gerätefirmware. Sie schaltet ein vorhandenes Gerät nicht automatisch in den Tiefschlaf.</p><p>Hardwarefreigabe für PaperBoard steht noch aus. E1002 ist das erste vorgesehene Testgerät; E1001, E1003 und E1004 sind experimentelle Ausgabeprofile.</p>
      <a href="/config/integrations/integration/paperboard">Geräteeinstellungen öffnen →</a></section>
      <section><h2>Display verbinden</h2><p>Der geschützte Bildendpunkt liefert die gerenderten Seiten. Zeige die Verbindungsdaten an und übernimm sie bewusst in deine vorhandene ESPHome-Konfiguration. WLAN, API, OTA und IP werden hier nicht verändert.</p>
      <button id="connection">Verbindungsdaten anzeigen</button><div id="connectionDetails"></div></section>
      <section><h2>Neues Gerät flashen</h2><p>Ein integrierter automatischer Installer ist noch nicht freigegeben. Für den E1002 liegt eine separate ESPHome-Vorlage im Repository. Sie muss vor der Installation mit deinen eigenen Zugangsdaten ergänzt und geprüft werden. Für die anderen Modelle gibt es noch keine freigegebene PaperBoard-Firmware.</p><a href="https://github.com/Christians8710/ha-paperboard/tree/main/esphome" target="_blank" rel="noopener">Firmware-Vorlagen und Anleitung →</a></section>
      <section><h2>Geräteabruf</h2><p>Letzter Abruf: ${esc(this.current.last_request||'Noch kein Bild abgerufen')}</p><p>Letzte Bilderzeugung: ${esc(this.current.last_render||'Noch keine')}</p><button id="refreshStatus">Status neu laden</button></section></main>`;
  }
  bind(){
    const root=this.shadowRoot;
    if(this.busy)root.querySelectorAll('input,select,textarea,button').forEach(el=>el.disabled=true);
    const on=(selector,event,fn)=>root.querySelectorAll(selector).forEach(el=>el.addEventListener(event,fn));
    on('#save','click',()=>this.save());on('#dismiss','click',()=>{this.notice='';this.render();});
    on('#display','change',e=>this.load(e.target.value));
    on('[data-tab]','click',e=>{this.tab=e.currentTarget.dataset.tab;this.render();});
    on('[data-page]','click',e=>{this.page=+e.currentTarget.dataset.page;this.selected=null;this.preview='';this.render();this.schedulePreview();});
    on('[data-add]','click',e=>{if(this.currentPage.widgets.length>=40)return this.message('Höchstens 40 Bausteine pro Seite.');this.checkpoint();const b=newWidget(e.currentTarget.dataset.add,this.doc);this.currentPage.widgets.push(b);this.selected=b.id;this.changed();});
    on('[data-select]','click',e=>{this.selected=e.currentTarget.dataset.select;this.render();});
    on('[data-action]','click',e=>this.action(e.currentTarget.dataset.action));
    on('#pageName','change',e=>{this.checkpoint();this.currentPage.name=e.target.value.slice(0,80);this.changed();});
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
    on('#connection','click',()=>this.connection());on('#refreshStatus','click',async()=>{try{const data=await this.call('get',{entry_id:this.current.id});this.current={...this.current,last_request:data.last_request,last_render:data.last_render};this.render();}catch(e){this.message(e.message,'error');}});
    on('#stage','pointerdown',e=>this.dragStart(e));
    on('[data-widget]','keydown',e=>{if(e.key==='Enter'){this.selected=e.currentTarget.dataset.widget;this.render();}});
  }
  dragStart(e){
    const node=e.target.closest('[data-widget]');
    if(!node){this.selected=null;this.render();return;}
    e.preventDefault();this.selected=node.dataset.widget;
    const b=this.currentWidget, start={...b}, resize=Boolean(e.target.closest('[data-resize]'));
    const stage=this.shadowRoot.querySelector('#stage'), rect=stage.getBoundingClientRect();
    const sx=e.clientX,sy=e.clientY; let moved=false;
    this.checkpoint();node.classList.add('selected');node.setPointerCapture(e.pointerId);
    const move=ev=>{
      let dx=(ev.clientX-sx)*this.doc.width/rect.width,dy=(ev.clientY-sy)*this.doc.height/rect.height;
      if(this.snap && !ev.altKey){dx=Math.round(dx/8)*8;dy=Math.round(dy/8)*8;}
      if(resize){b.w=Math.round(start.w+dx);b.h=Math.round(start.h+dy);}else{b.x=Math.round(start.x+dx);b.y=Math.round(start.y+dy);}
      clampWidget(b,this.doc);moved=moved||Math.abs(dx)+Math.abs(dy)>0;
      node.style.left=b.x/this.doc.width*100+'%';node.style.top=b.y/this.doc.height*100+'%';node.style.width=b.w/this.doc.width*100+'%';node.style.height=b.h/this.doc.height*100+'%';
    };
    const finish=()=>{node.removeEventListener('pointermove',move);node.removeEventListener('pointerup',finish);node.removeEventListener('pointercancel',finish);if(moved)this.changed();else{this.undo.pop();this.render();}};
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
        if(!Number.isInteger(width)||!Number.isInteger(height)||width<240||height<240||width>2000||height>2000){this.undo.pop();return this.message('Breite und Höhe müssen zwischen 240 und 2000 liegen.','error');}
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
  css(){return `
    :host{display:block;height:100%;overflow:auto;color:#1f332c;background:#f4f5ef;font-family:var(--paper-font-body1_-_font-family,system-ui,sans-serif);font-size:14px;--green:#245d48;--muted:#6b7870}*{box-sizing:border-box}button,input,select,textarea{font:inherit}button,a,input,select,textarea{outline-offset:3px}button{cursor:pointer;border:1px solid #d6ddd3;border-radius:7px;background:#fff;color:#284237;padding:9px 12px}button:hover{border-color:#759884;background:#f0f6ef}button:disabled{opacity:.5;cursor:default}button.primary{background:var(--green);color:white;border-color:var(--green);font-weight:650}header{display:flex;align-items:center;justify-content:space-between;padding:20px 28px;border-bottom:1px solid #d9dfd4;background:#fcfdf9;gap:16px}.brand{display:flex;gap:12px;align-items:center}.mark{background:#dfe9cb;border-radius:10px;font:bold 29px Georgia;padding:7px 14px;color:#25513c}.brand strong{font-size:23px;letter-spacing:-.7px}.brand small{display:block;color:var(--muted);font-size:12px;margin-top:3px}.headerActions{display:flex;gap:20px;align-items:center}.version{font-size:11px;color:var(--muted)}nav{display:flex;gap:10px;align-items:center;flex-wrap:wrap;background:#fcfdf9;padding:12px 28px;border-bottom:1px solid #d9dfd4}nav button{border:0;background:transparent}nav button.active{background:#e1ead9;color:#204f3b;font-weight:650}.deviceSelect{display:flex;align-items:center;gap:10px;margin-right:18px}.deviceSelect select{width:190px}.newDevice{margin-left:auto}a{color:var(--green);text-decoration:none}a:hover{text-decoration:underline}.workspace{display:grid;grid-template-columns:205px minmax(380px,1fr) 250px;min-height:calc(100vh - 153px)}aside{padding:20px 14px;background:#fbfcf8}.pages{border-right:1px solid #d9dfd4}.inspector{border-left:1px solid #d9dfd4}.asideTitle{font-size:10px;font-weight:750;letter-spacing:1.2px;color:#788373;margin:8px 0 14px;display:flex;justify-content:space-between}.asideTitle small{font-size:9px;letter-spacing:0}.page,.layer{width:100%;text-align:left;margin-bottom:5px;border-color:transparent;background:transparent;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.page{display:flex;gap:9px;align-items:center}.page span{font-size:10px;color:#7d8b79}.chosen{background:#e4ecd9!important;border-color:#c8d7ba!important}.dashed{border-style:dashed;width:100%;margin:6px 0 22px}.widgets{display:grid;grid-template-columns:1fr;gap:4px;margin-bottom:25px}.widgets button{text-align:left;font-size:12px;border-color:transparent;background:#f1f4eb}.editor{padding:20px 24px;min-width:0}.toolbar{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.toolbar input{flex:1;min-width:140px;font-weight:650;background:transparent;border-color:transparent;font-size:18px}.toolbar button,.tools button{font-size:11px;padding:6px 8px}.tools{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:12px 0 20px;color:var(--muted);font-size:11px}.tools label{display:flex;align-items:center;gap:4px}.stageWrap{padding:14px;background:#e6eadd;border-radius:9px}.stage{container-type:inline-size;width:100%;background:white;position:relative;box-shadow:0 2px 12px #203c2514;touch-action:none;overflow:hidden}.stage.grid{background-image:radial-gradient(#d9ded7 .6px,transparent .6px);background-size:8px 8px}.widget{position:absolute;background:var(--widget-bg);color:var(--widget-color);overflow:hidden;cursor:move;user-select:none;white-space:pre-wrap;line-height:1.3;border:1px solid transparent;touch-action:none}.widget span{display:block;padding:5px}.widget.calendar{font-size:1.6cqw!important;background:linear-gradient(white,#f9fbf5);border:1px solid #d6ded0}.widget.calendar span{line-height:2}.widget.line{background:var(--widget-color)}.widget.rectangle{border:2px solid var(--widget-color)}.widget:hover{outline:1px dashed #8ba78b}.widget.selected{outline:2px solid #608348;z-index:50}.resize{position:absolute;bottom:0;right:0;width:12px;height:12px;background:#608348;border:2px solid white;cursor:nwse-resize}.canvasMeta{font-size:10px;color:var(--muted);margin:10px 1px 24px}.preview{padding:16px;background:#fff;border:1px solid #dce1d6;border-radius:9px}.previewHeading{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}.previewHeading h3{margin:0;font-size:13px}.previewHeading span{font-size:10px;color:var(--muted)}.preview img{max-width:100%;height:auto;border:1px solid #e1e5db;display:block}.preview img[hidden]{display:none}.preview p{font-size:11px;color:var(--muted);margin-bottom:0}h3{font-size:16px}p{color:var(--muted);line-height:1.65}input:not([type=checkbox]),select,textarea{width:100%;padding:8px;border:1px solid #d2dbce;border-radius:6px;background:white;color:#203b2c;min-width:0}label{display:block}.inspector label{font-size:11px;color:#66735f;margin-bottom:12px}.inspector input,.inspector select,.inspector textarea{margin-top:5px}.pairs{display:grid;grid-template-columns:1fr 1fr;gap:8px}.check{display:flex!important;gap:7px;align-items:center}.inspector .check input{margin:0}.inspector button{font-size:11px}.inspector p{font-size:11px}.inspector hr{border:0;border-top:1px solid #d9dfd4;margin:22px 0}.file{margin-top:12px}.file input{font-size:10px}.notice{padding:12px 28px;background:#e3edd9;color:#29432a;display:flex;justify-content:space-between;align-items:center}.notice.error{background:#fce8df;color:#8a3526}.notice button{padding:0 6px;background:transparent;border:0;font-size:22px}.settings{max-width:1050px;padding:28px 40px;margin:auto}.settings h1{font-size:27px;letter-spacing:-.6px}.settings section{background:#fcfdf9;border:1px solid #dae1d3;border-radius:10px;padding:22px;margin:20px 0}.settings h2{font-size:18px;margin:0 0 10px}.settings label{margin-bottom:12px;max-width:650px}.settings input,.settings select{margin-top:5px}.calendarSource{display:grid;grid-template-columns:2fr 1fr 110px 120px auto;gap:12px;align-items:center;border-bottom:1px solid #e0e5d9;margin-bottom:14px}.settings pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#eaf0e3;padding:16px;border-radius:8px;font-size:12px}.empty{padding:60px;max-width:650px;margin:auto}button:focus-visible,a:focus-visible{outline:3px solid #87a567}@media(max-width:1150px){.workspace{grid-template-columns:170px minmax(300px,1fr)}.inspector{grid-column:1/-1;border-top:1px solid #d9dfd4;padding:20px 30px}.inspector .pairs{max-width:500px}.calendarSource{grid-template-columns:1fr 1fr}}@media(max-width:700px){header{padding:14px}.version{display:none}nav{padding:10px}.workspace{grid-template-columns:1fr}.pages{border-bottom:1px solid #d9dfd4}.pages .widgets{grid-template-columns:repeat(3,1fr)}.pages .layer{display:none}.editor{padding:12px}.settings{padding:16px}.newDevice{margin-left:0}.deviceSelect{width:100%}.previewHeading span{display:none}}
  `;}
}
if(!customElements.get('paperboard-panel'))customElements.define('paperboard-panel',PaperBoardPanel);
