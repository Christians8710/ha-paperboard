import {build} from 'esbuild';
import {copyFile,mkdir,realpath,readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const out=path.join(root,'custom_components/paperboard/frontend');
await build({entryPoints:[path.join(root,'frontend-src/flash.js')],outfile:path.join(out,'flash.bundle.js'),bundle:true,format:'esm',target:'es2022',minify:true,legalComments:'eof'});
await build({entryPoints:[path.join(root,'frontend-src/offline.js')],outfile:path.join(out,'offline.bundle.js'),bundle:true,format:'iife',target:'es2022',minify:true,legalComments:'eof'});
await mkdir(path.join(out,'licenses'),{recursive:true});
const req=createRequire(await realpath(path.join(root,'node_modules/esptool-js/package.json')));
for(const name of ['esptool-js','spark-md5','pako','atob-lite']){
  let directory=name==='esptool-js'||name==='spark-md5'?await realpath(path.join(root,'node_modules',name)):path.dirname(req.resolve(name));
  while(JSON.parse(await readFile(path.join(directory,'package.json'),'utf8').catch(()=>'{"name":""}')).name!==name){
    const parent=path.dirname(directory);if(parent===directory)throw new Error(`Paketlizenz fehlt: ${name}`);directory=parent;
  }
  let copied=false;
  for(const file of ['LICENSE','LICENSE.txt','LICENSE.md']){
    try{await copyFile(path.join(directory,file),path.join(out,'licenses',`${name}.txt`));copied=true;break;}catch{}
  }
  if(!copied)throw new Error(`Paketlizenz fehlt: ${name}`);
}
console.log('Lokale USB-Installer erstellt. Keine externen Skripte zur Laufzeit erforderlich.');
