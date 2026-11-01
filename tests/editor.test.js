import test from 'node:test';
import assert from 'node:assert/strict';
import {newWidget,clampWidget,scaleLayout,clone} from '../custom_components/paperboard/frontend/editor.js';
test('Bausteine bleiben nach Verschieben und Größenänderung innerhalb der Fläche',()=>{
 const d={width:800,height:480},w=newWidget('text',d);Object.assign(w,{x:900,y:-30,w:600,h:900,font_size:NaN});clampWidget(w,d);
 assert.equal(w.x,799);assert.equal(w.y,0);assert.equal(w.w,1);assert.equal(w.h,480);assert.equal(w.font_size,18);
});
test('Zeichenfläche und alle Seiten werden proportional skaliert',()=>{
 const d={width:800,height:480,pages:[{widgets:[newWidget('calendar',{width:800,height:480})]}]};
 const before=clone(d);scaleLayout(d,1600,960);assert.equal(d.pages[0].widgets[0].x,before.pages[0].widgets[0].x*2);
 assert.equal(d.pages[0].widgets[0].font_size,36);assert.equal(before.width,800);
});
