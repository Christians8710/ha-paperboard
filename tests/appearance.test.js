import test from 'node:test';
import assert from 'node:assert/strict';
import {syncAppearance,themeCSS} from '../custom_components/paperboard/frontend/theme.js';

test('HA-Modus hat Vorrang und folgt laufenden Änderungen; ohne HA bleibt Systemmodus aktiv',()=>{
 const attrs=new Map();const host={setAttribute:(k,v)=>attrs.set(k,v),removeAttribute:k=>attrs.delete(k)};
 syncAppearance(host,{themes:{darkMode:false}});assert.equal(attrs.get('appearance'),'light');
 syncAppearance(host,{themes:{darkMode:true}});assert.equal(attrs.get('appearance'),'dark');
 syncAppearance(host,{});assert.equal(attrs.has('appearance'),false);
 syncAppearance(host,undefined);assert.equal(attrs.has('appearance'),false);
});
const luminance=hex=>hex.match(/../g).map(n=>parseInt(n,16)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4).reduce((a,n,i)=>a+n*[.2126,.7152,.0722][i],0);
const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
test('Text, Nebenfarbe, Links und Hauptaktionen erreichen in beiden Paletten 4,5:1',()=>{
 for(const selector of [':host {',':host([appearance=light]) {']){
  const block=themeCSS.split(selector)[1].split('}')[0];
  const vars=Object.fromEntries([...block.matchAll(/--pb-([\w-]+):#([\da-f]{6});/g)].map(m=>[m[1],m[2]]));
  for(const surface of ['background','card','secondary','input'])for(const text of ['text','muted','accent'])assert.ok(contrast(vars[text],vars[surface])>=4.5,`${selector} ${text}/${surface}`);
 }
 assert.ok(contrast('10252c','f5c66a')>=4.5);
});
