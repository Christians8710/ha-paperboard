import {build} from 'esbuild';
import {copyFile,mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const out=path.join(root,'custom_components/paperboard/frontend');
await build({entryPoints:[path.join(root,'frontend-src/flash.js')],outfile:path.join(out,'flash.bundle.js'),bundle:true,format:'esm',target:'es2022',minify:true,legalComments:'eof'});
await build({entryPoints:[path.join(root,'frontend-src/offline.js')],outfile:path.join(out,'offline.bundle.js'),bundle:true,format:'iife',target:'es2022',minify:true,legalComments:'eof'});
await mkdir(path.join(out,'licenses'),{recursive:true});
for(const name of ['esptool-js','spark-md5','pako','atob-lite']){
  for(const file of ['LICENSE','LICENSE.txt','LICENSE.md']){
    try{await copyFile(path.join(root,'node_modules',name,file),path.join(out,'licenses',`${name}.txt`));break;}catch{}
  }
}
console.log('Lokale USB-Installer erstellt. Keine externen Skripte zur Laufzeit erforderlich.');
