export const clone = value => JSON.parse(JSON.stringify(value));
export const uid = () => 'pb-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);
export function clampWidget(w,doc){
  const num=(v,fallback)=>Number.isFinite(Number(v))?Math.round(Number(v)):fallback;
  w.x=Math.max(0,Math.min(doc.width-1,num(w.x,0)));w.y=Math.max(0,Math.min(doc.height-1,num(w.y,0)));
  w.w=Math.max(1,Math.min(doc.width-w.x,num(w.w,100)));w.h=Math.max(1,Math.min(doc.height-w.y,num(w.h,40)));
  w.font_size=Math.max(8,Math.min(120,num(w.font_size,18)));return w;
}
export function newWidget(type,doc){return clampWidget({id:uid(),type,x:24,y:80,w:Math.min(340,doc.width-24),h:type==='line'?2:type==='calendar'?220:80,font_size:18,color:'black',background:'white',text:type==='text'?'Dein Text':'',title:'',entity:'',align:'left',bold:false,border:false,mode:'today'},doc);}
export function scaleLayout(doc,width,height){
  const sx=width/doc.width,sy=height/doc.height;doc.width=width;doc.height=height;
  for(const p of doc.pages)for(const w of p.widgets){w.x=Math.round(w.x*sx);w.y=Math.round(w.y*sy);w.w=Math.round(w.w*sx);w.h=Math.round(w.h*sy);w.font_size=Math.round(w.font_size*Math.min(sx,sy));clampWidget(w,doc);}
  return doc;
}
