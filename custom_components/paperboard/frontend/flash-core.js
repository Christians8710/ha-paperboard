// Das USB-Konfigurationsformat wird gemeinsam mit dem Firmware-Parser geprüft.
export const CONFIG_OFFSET=0x1ff0000, CONFIG_SIZE=65536;
export function validateAddress(value){
  let u;try{u=new URL(value.trim());}catch{throw new Error('Bitte eine gültige Home-Assistant-Adresse eingeben.');}
  if(!['http:','https:'].includes(u.protocol)||u.username||u.password||!['','/'].includes(u.pathname)||u.search||u.hash||['localhost','127.0.0.1','0.0.0.0','[::1]'].includes(u.hostname))throw new Error('Die Home-Assistant-Basisadresse muss vom Display im WLAN erreichbar sein, ohne Pfad und ohne Zugangsdaten.');
  return u.origin;
}
export function validateWifi(ssid,password,open=false){
  if(typeof ssid!=='string'||new TextEncoder().encode(ssid).length<1||new TextEncoder().encode(ssid).length>32)throw new Error('Der WLAN-Name muss 1 bis 32 UTF-8-Bytes lang sein.');
  if(typeof password!=='string'||(!open && !(password.length>=8&&new TextEncoder().encode(password).length<=63) && !/^[a-fA-F0-9]{64}$/.test(password)))throw new Error('Bitte ein gültiges WLAN-Passwort eingeben (8 bis 63 Zeichen oder 64 Hex-Zeichen).');
  if(open&&password)throw new Error('Bei einem offenen WLAN muss das Passwort leer bleiben.');
}
export async function sha256(bytes){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');}
export async function configurationBytes(config){
  validateWifi(config.ssid,config.password,config.open_wifi===true);
  const base_url=validateAddress(config.base_url);
  if(config.model!=='e1002'||config.schema!==1||!/^\w[\w-]{0,79}$/.test(config.entry_id)||!/^[a-f0-9]{64}$/.test(config.api_key_hex)||/^0+$/.test(config.api_key_hex)||!/^[a-f0-9]{32}$/.test(config.install_id)||typeof config.token!=='string'||config.token.length<32||config.token.length>128||/[\r\n]/.test(config.token)||typeof config.ota_password!=='string'||config.ota_password.length<24||!Number.isInteger(config.pages)||config.pages<1||config.pages>12||!Number.isInteger(config.refresh_interval)||config.refresh_interval<60||config.refresh_interval>86400)throw new Error('Ungültige oder unvollständige Displaykonfiguration.');
  const raw=new TextEncoder().encode(JSON.stringify({...config,base_url}));
  if(raw.length>4096)throw new Error('Die USB-Konfiguration ist zu groß.');
  const out=new Uint8Array(CONFIG_SIZE).fill(255);
  out.fill(0,0,64);out.set(new TextEncoder().encode('PB02CFG\0'),0);
  new DataView(out.buffer).setUint32(8,raw.length,true);
  out.set(new Uint8Array(await crypto.subtle.digest('SHA-256',raw)),12);out.set(raw,64);
  return out;
}
export async function verifyFirmware(bytes,manifest){
  const file=manifest.files?.factory;
  if(manifest.version!=='0.2.0'||manifest.model!=='e1002'||manifest.chip!=='ESP32-S3'||manifest.flash_size!=='32MB'||manifest.config_offset!==CONFIG_OFFSET||manifest.config_size!==CONFIG_SIZE||!file||bytes.length!==file.bytes||bytes.length<100000||bytes.length>=0x400000||await sha256(bytes)!==file.sha256)throw new Error('Die Firmware ist unvollständig oder ihre Prüfsumme stimmt nicht. Es wurde nichts geschrieben.');
}
export async function writeE1002({port,firmware,manifest,config,createLoader,md5,onProgress=()=>{}}){
  await verifyFirmware(firmware,manifest);
  const settings=await configurationBytes(config);
  let transport;
  try{
    const created=createLoader(port);transport=created.transport;const loader=created.loader;
    onProgress('Verbindung zum USB-Gerät wird aufgebaut …',0);
    await loader.main();
    if(loader.chip?.CHIP_NAME!=='ESP32-S3')throw new Error('Das gewählte Gerät ist kein ESP32-S3. Es wurde nichts geschrieben.');
    if(await loader.detectFlashSize()!=='32MB')throw new Error('Das gewählte Gerät hat keinen erkannten 32-MB-Flash. Es wurde nichts geschrieben.');
    if(loader.IS_STUB!==true)throw new Error('Der sichere Schreibmodus konnte nicht gestartet werden. Es wurde nichts geschrieben.');
    onProgress('Gerätespeicher wird gelöscht. Das kann etwas dauern …',2);
    await loader.writeFlash({fileArray:[{data:firmware,address:0},{data:settings,address:CONFIG_OFFSET}],
      flashMode:'keep',flashFreq:'keep',flashSize:'keep',eraseAll:true,compress:true,
      calculateMD5Hash:md5,
      reportProgress:(index,written,total)=>onProgress(index===0?'Firmware wird geschrieben und geprüft …':'Persönliche Gerätekonfiguration wird geschrieben und geprüft …',Math.round(index===0?5+written/total*85:90+written/total*8))});
    onProgress('Alle geschriebenen Daten geprüft. Gerät wird neu gestartet …',99);
    await loader.after('hard_reset');
    onProgress('USB-Installation erfolgreich abgeschlossen.',100);
  }finally{
    settings.fill(0);
    if(transport)await transport.disconnect().catch(()=>{});
  }
}
