import test from 'node:test';
import assert from 'node:assert/strict';
import {configurationBytes,validateWifi,validateAddress,sha256,writeE1002,CONFIG_OFFSET,CONFIG_SIZE} from '../custom_components/paperboard/frontend/flash-core.js';
const config=()=>({schema:1,model:'e1002',ssid:'Testnetz',password:'Nur-Testpasswort',base_url:'http://homeassistant.local:8123/',entry_id:'test-entry',token:'t'.repeat(43),api_key_hex:'12'.repeat(32),ota_password:'p'.repeat(32),install_id:'ab'.repeat(16),pages:3,refresh_interval:900,rotated:false});
async function input(){const firmware=new Uint8Array(120000).fill(233);const manifest={version:'0.3.1',model:'e1002',chip:'ESP32-S3',flash_size:'32MB',config_offset:CONFIG_OFFSET,config_size:CONFIG_SIZE,files:{factory:{bytes:firmware.length,sha256:await sha256(firmware)}}};return {firmware,manifest,config:config(),port:{},md5:()=> 'test-md5'};}
function device(chip='ESP32-S3',size='32MB'){
 const calls=[];const transport={disconnect:async()=>calls.push('disconnect')};
 const loader={chip:{CHIP_NAME:chip},IS_STUB:true,main:async()=>calls.push('connect'),detectFlashSize:async()=>size,
  writeFlash:async opts=>{calls.push('write');assert.equal(opts.eraseAll,true);assert.equal(opts.flashSize,'keep');assert.equal(typeof opts.calculateMD5Hash,'function');assert.equal(opts.fileArray[1].address,CONFIG_OFFSET);assert.equal(opts.fileArray[1].data.length,CONFIG_SIZE);assert.equal(new TextDecoder().decode(opts.fileArray[1].data.slice(0,8)),'PB02CFG\0');},after:async mode=>calls.push(mode)};
 return {calls,loader,createLoader:()=>({loader,transport})};
}
test('USB-Konfiguration hat Firmware-kompatiblen Header, Länge und SHA-256',async()=>{
 const b=await configurationBytes(config());assert.equal(b.length,65536);const n=new DataView(b.buffer).getUint32(8,true);const payload=b.slice(64,64+n);
 assert.deepEqual(b.slice(12,44),new Uint8Array(await crypto.subtle.digest('SHA-256',payload)));
 const doc=JSON.parse(new TextDecoder().decode(payload));assert.equal(doc.base_url,'http://homeassistant.local:8123');assert.equal(doc.ssid,'Testnetz');assert.equal(b[64+n],255);
});
test('WLAN-Grenzen zählen UTF-8-Bytes und verlangen bewusste Auswahl offener Netze',()=>{
 validateWifi('ä'.repeat(16),'abcdefgh');assert.throws(()=>validateWifi('ä'.repeat(17),'abcdefgh'));
 assert.throws(()=>validateWifi('Netz',''));validateWifi('Netz','',true);assert.throws(()=>validateWifi('Netz','abcdefgh',true));
});
test('Geräteadressen dürfen keine Loopback-Adressen, fremden Protokolle oder versteckten Zugangsdaten sein',()=>{
 for(const url of ['http://localhost:8123','file:///test','https://user:pass@example.com','https://example.com/api?token=x'])assert.throws(()=>validateAddress(url));
 assert.equal(validateAddress('https://ha.example.com/'),'https://ha.example.com');
});
test('Ungültige Schlüssel und Grenzen werden vor dem Schreiben abgewiesen',async()=>{
 for(const patch of [{api_key_hex:'0'.repeat(64)},{pages:0},{pages:13},{refresh_interval:30},{token:'x\r\n'.repeat(20)},{model:'e1001'}])await assert.rejects(configurationBytes({...config(),...patch}));
});
test('Manipulierte Firmware öffnet kein Gerät',async()=>{const args=await input();args.firmware[0]^=1;const d=device();await assert.rejects(writeE1002({...args,...d}));assert.deepEqual(d.calls,[]);});
test('Falscher Chip wird niemals beschrieben',async()=>{const d=device('ESP32-C3');await assert.rejects(writeE1002({...await input(),...d}));assert.deepEqual(d.calls,['connect','disconnect']);});
test('Falsche Flashgröße wird niemals beschrieben',async()=>{const d=device('ESP32-S3','8MB');await assert.rejects(writeE1002({...await input(),...d}));assert.deepEqual(d.calls,['connect','disconnect']);});
test('Schreibablauf nutzt zwei geprüfte Teile und startet erst nach Erfolg neu',async()=>{const d=device();await writeE1002({...await input(),...d});assert.deepEqual(d.calls,['connect','write','hard_reset','disconnect']);});
test('Schreibfehler wird weitergegeben und Erfolg nicht vorgetäuscht',async()=>{const d=device();d.loader.writeFlash=async()=>{throw new Error('Abbruch');};await assert.rejects(writeE1002({...await input(),...d}));assert.deepEqual(d.calls,['connect','disconnect']);});
