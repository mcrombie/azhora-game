// Occupation built from salvaged mountain masonry, heavy timbers and hide.
// Kudan retains the lighter stone-and-plaster craft of its human coast.
const stone=['#8c8d7e','#777e78','#a2a18c'],wood='#544a38',iron='#424b49';
export function frontierBuilding(b,h,site,ground,colliders){
 const {x,z,w,d,kind,variant}=h,orc=site.kind==='orc';
 if(kind==='ruin'){
  // Separate broken walls follow the hillside; no floating, complete foundation.
  for(const side of [-1,1])for(let i=0;i<4;i++){
   const u=x+side*w/2,v=z+(i/3-.5)*d,y=ground(u,v),height=.6+((i+variant)%3)*.65;
   b.block(stone[(i+variant)%3],u,y-.15,v,.65,height,d/4-.12);
   if(i%2===0)b.beam('#3c3931',[u,y+height,v],[u+side*1.2,y+height+2,v+.5],.22);
   b.rock(stone[i%3],u-side*.8,y+.25,v,.8,.4,.55,i);
   colliders.push({kind:'wall',x:u,z:v,r:.5,minY:y-.2,maxY:y+height});
  }
  const y=ground(x,z);b.beam('#403b31',[x-w*.3,y+.3,z-d*.35],[x+w*.25,y+.5,z+d*.3],.3);
  return;
 }
 const corners=[[-1,-1],[-1,1],[1,-1],[1,1]].map(([u,v])=>ground(x+u*w/2,z+v*d/2));
 const y=Math.max(...corners)+.07,low=Math.min(...corners)-.2;
 b.block(stone[variant%3],x,low,z,w+.35,y-low+.25,d+.35);
 b.frame(x,y,z,0,()=>{
  if(kind==='tent'){
   b.tent(variant%2?'#94866c':'#b5a589',0,0,0,w,d,h.h);
   b.triangle('#443f36',[-.65,0,d/2+.015],[.65,0,d/2+.015],[0,1.8,d/2+.015]);
   for(const side of [-1,1])b.beam(wood,[0,h.h,d/2],[side*(w/2+.6),0,d/2+.8],.055);
   return;
  }
  const hall=kind==='hall',wall=h.h*(orc?.57:.65),rise=h.h-wall;
  b.block(orc?stone[variant%3]:variant%3?'#c0b49a':'#d2c7ab',0,.2,0,w,wall,d);
  // Layered log upper walls, tied corner posts and stone footings.
  for(const side of [-1,1]){
   for(let v=-d/2;v<=d/2+.01;v+=Math.max(2,d/3))b.block(wood,side*(w/2+.04),.2,v,.25,wall+.15,.27);
   b.beam(wood,[-w/2,.55,side*d/2],[w/2,.55,side*d/2],.23);
   b.beam(wood,[-w/2,wall+.1,side*d/2],[w/2,wall+.1,side*d/2],.25);
   if(orc)for(let yy=wall*.55;yy<wall;yy+=.36)b.beam('#76684e',[-w/2,yy,side*d/2+.05],[w/2,yy,side*d/2+.05],.28);
  }
  const roof=orc?(variant%3===0?'#6d7162':variant%3===1?'#81775d':'#5c6558'):variant%2?'#5b7374':'#6e7771';
  b.roof(roof,0,wall+.25,0,w+1,d+1,rise,0,orc?'#7e735c':'#c0b49a');
  for(const end of [-1,1]){
   const v=end*(d/2+.55);
   b.beam(wood,[-w/2-.5,wall+.25,v],[0,h.h+.25,v],.22);
   b.beam(wood,[w/2+.5,wall+.25,v],[0,h.h+.25,v],.22);
   if(orc&&hall){
    for(const side of [-1,1]){
     b.beam('#c8c2a3',[side*.1,h.h+.3,v],[side*1.15,h.h+1.25,v],.28);
     b.beam('#e0d7b8',[side*1.15,h.h+1.25,v],[side*1.5,h.h+2,v],.16);
    }
   }
  }
  b.block('#34382d',0,.25,d/2+.025,hall?1.9:1.1,hall?2.7:1.9,.08);
  for(const side of [-1,1]){
   b.block(wood,side*(hall?1.08:.68),.2,d/2+.12,.2,hall?2.9:2.1,.25);
   b.block('#343e34',side*w*.32,wall*.48,d/2+.04,.8,.7,.08);
   b.block(wood,side*w*.32,wall*.48-.1,d/2+.11,1,.12,.2);
  }
  if(hall)b.block(site.accent??'#667b89',0,wall*.8,d/2+.13,1.1,.6,.1);
  if(kind==='smith'){
   b.block(stone[1],w*.3,.1,-d*.2,1.3,h.h+1.2,1.4);
   b.block(iron,-w*.25,.15,d/2+1,1.1,.8,.6);
  }else if(!orc){b.block(stone[1],-w*.28,wall,-d*.2,.65,rise+.6,.7);}
  if(orc&&hall)for(const side of [-1,1])b.beam(wood,[side*(w/2+.9),0,d/2+.9],[side*w/2,wall*.8,d/2],.4);
 });
 const nx=Math.ceil(w/1.6),nz=Math.ceil(d/1.6);
 for(let i=0;i<nx;i++)for(let j=0;j<nz;j++)colliders.push({id:h.id,kind:'building',x:x-w/2+(i+.5)*w/nx,z:z-d/2+(j+.5)*d/nz,r:Math.hypot(w/nx,d/nz)/2,minY:low,maxY:y+h.h+1.5});
}

export function frontierBanner(b,x,z,y,accent,variant=0){
 b.cylinder('#555044',x,y,z,.12,6.8);b.cone('#cbc3a3',x,y+6.8,z,.2,.5);
 b.beam('#555044',[x,y+6.4,z],[x+2,y+6.4,z],.12);
 b.sheet(accent,[x+.15,y+6.3,z],[x+1.85,y+6.3,z],[x+1.65,y+3.5,z],[x+.15,y+3.8,z]);
 // Four simple forged emblems distinguish the rival holds at street level.
 const cy=y+5.15;
 for(let i=0;i<=variant%4;i++)b.beam('#e0d4ac',[x+.48+i*.27,cy-.55,z+.035],[x+.48+i*.27,cy+.55,z+.035],.09);
}
