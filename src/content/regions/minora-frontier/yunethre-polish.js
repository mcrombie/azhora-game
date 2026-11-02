/** Crafted exterior details for Yunethre. Everything is static merged scenery;
 * agricultural art deliberately contains no campaign production values. */
import {createSceneryBuilder} from '../../../world/scenery/scenery-builder.js';
import {groundPatch} from '../../../world/scenery/ground-face.js';
import {groundRibbon} from '../../../world/scenery/ground-ribbon.js';
import {buildLaketownWaterfront} from './laketown-waterfront.js';
import {buildCentaurCamp} from './centaur-camp-scenery.js';
import {YUNETHRE_TOWN as T,YUNETHRE_LAKE,YUNETHRE_TOWN_LOTS,
 YUNETHRE_FIELDS,YUNETHRE_FARMYARD,YUNETHRE_ORCHARD} from './yunethre-world.js';

const timber='#4b4234',wood='#806347',stone='#aaa88e',lightStone='#c3bea4',iron='#555c52';
const clay=['#d2c6a3','#c2b491','#b7b59b','#d8c9a6'];
const roofs=['#67705d','#857352','#6c746c','#937c59'];

function barrel(b,x,y,z,r=.42){
 b.cylinder('#92724d',x,y,z,r,1.1);b.cylinder(iron,x,y+.16,z,r+.025,.07);b.cylinder(iron,x,y+.86,z,r+.025,.07);
 b.cylinder('#ae8b5b',x,y+1.1,z,r*.94,.04);
}
function crate(b,x,y,z,s=.7){
 b.block('#a6895b',x,y,z,s,s,s);
 for(const dx of [-1,1])b.block(wood,x+dx*s*.42,y,z+s*.51,.09,s,.08);
 b.beam(wood,[x-s*.4,y+.08,z+s*.52],[x+s*.4,y+s-.08,z+s*.52],.07);
}
function planter(b,x,y,z,w=1.7){
 b.block('#8d7655',x,y,z,w,.38,.72);b.block('#574b32',x,y+.38,z,w-.15,.05,.58);
 for(let i=0;i<4;i++){
  const px=x-w*.35+i*w*.23;b.rock('#70894e',px,y+.54,z,.3,.26,.24);
  b.rock(i%2?'#c9b8d3':'#d6c990',px,y+.75,z,.13,.09,.13);
 }
}
function lantern(b,x,y,z){
 b.beam(iron,[x,y,z],[x,y-.6,z],.045);b.block(iron,x,y-1,z,.35,.42,.35);
 b.block('#d2b977',x,y-.93,z,.29,.27,.29);b.cone(iron,x,y-.59,z,.29,.2);
}
function arc(b,tint,cx,cy,z,rx,ry,start=0,end=Math.PI,width=.12){
 for(let i=0;i<9;i++){
  const a=start+(end-start)*i/9,c=start+(end-start)*(i+1)/9;
  b.beam(tint,[cx+Math.cos(a)*rx,cy+Math.sin(a)*ry,z],[cx+Math.cos(c)*rx,cy+Math.sin(c)*ry,z],width);
 }
}
// Each craft tradition keeps its own silhouette and construction, while sharing
// the settlement's quiet stone, timber and weathered green palette.
function houseCraft(b,{w,d,h,style},base,rise){
 const front=d/2+.3,roofY=base+h+.1;
 if(style==='dwarf'){
  for(const end of [-1,1])for(let i=0;i<5;i++){
   const width=w+1.45-i*(w+1.45)/5,yy=roofY+i*rise/5;
   b.block(i%2?stone:lightStone,0,yy,end*(d/2+.69),width,rise/5+.16,.4);
   b.box('#777e78',0,yy+rise/5+.16,end*(d/2+.69),width+.2,.12,.56);
  }
  // Heavy dressed jambs and seven wedge-like archivolt stones.
  for(const side of [-1,1]){
   b.block('#8c9184',side*1.08,base+.1,front,.42,2.5,.42);
   for(let j=0;j<4;j++)b.box(lightStone,side*(w/2-.15),base+.5+j*.95,front-.14,.55,.3,.28);
  }
  for(let j=0;j<7;j++){
   const a=Math.PI*j/6;b.box(lightStone,Math.cos(a)*1.08,base+2.48+Math.sin(a)*.85,front,.48,.38,.48,0,0,a-Math.PI/2);
  }
  for(const side of [-1,1]){
   const x=side*w*.3;arc(b,lightStone,x,base+2.5,front, .73,.45,0,Math.PI,.16);
   for(const dx of [-.3,0,.3])b.block(iron,x+dx,base+1.55,front+.02,.045,1.1,.05);
  }
  const cx=w*.33,cy=roofY+rise*.2;
  b.block('#737b70',cx,cy,-d*.2,1.2,2.4,1.2);b.block(stone,cx,cy+2.25,-d*.2,1.5,.28,1.5);
  b.block('#424e49',cx,cy+2.52,-d*.2,1.05,.04,1.05);
  // A hammered diamond emblem fixed to the masonry, not a floating sign.
  for(const side of [-1,1]){
   b.beam('#9f8854',[0,base+3.28,front+.18],[side*.42,base+3.73,front+.18],.09);
   b.beam('#9f8854',[side*.42,base+3.73,front+.18],[0,base+4.18,front+.18],.09);
  }
 }else if(style==='satyr'){
  // Low broad turf roofs, woven wall panels and a sheltered music porch.
  for(const side of [-1,1])for(let i=0;i<7;i++){
   const t=.18+(i%3)*.26,z=-d*.44+i*d*.145;
   b.rock(i%2?'#6d8054':'#819365',side*(w/2+.52)*t,roofY+rise*(1-t)+.05,z,.7,.15,.54);
  }
  for(const side of [-1,1]){
   for(let k=0;k<7;k++)b.beam('#a68b5c',[side*w*.3-.58,base+.64+k*.1,front],[side*w*.3+.58,base+.64+k*.1,front],.035);
   arc(b,'#b6aa7c',side*.7,base+3.1,front+.08,.5,.48,-Math.PI*.35,Math.PI*.95,.14);
   b.block(timber,side*(w/2-.8),base,front+1.45,.22,2.5,.22);
  }
  b.roof('#778763',0,base+2.75,front+.9,w-.6,2.4,.65);
  b.block(wood,0,base+.32,front+1.1,w-1,.17,1.5);
  for(const side of [-1,1])b.block('#a98e5e',side*(w/2-1),base+.5,front+1.15,.55,.35,.55);
  b.beam('#c2b38a',[-.6,roofY+rise+.17,-d*.3],[.6,roofY+rise+.17,d*.3],.1);
 }else if(style==='elf'){
  for(const side of [-1,1]){
   arc(b,'#a7ad8c',side*w*.3,base+2.67,front,.78,.9,0,Math.PI,.09);
   b.beam('#c7c5a4',[side*w*.3-.42,base+1.53,front],[side*w*.3+.42,base+2.65,front],.04);
   b.beam('#c7c5a4',[side*w*.3+.42,base+1.53,front],[side*w*.3-.42,base+2.65,front],.04);
   b.beam('#869774',[side*(w/2+.4),roofY,front],[side*(w/2-.25),roofY-1.5,front],.13);
   for(let k=0;k<4;k++)b.rock(k%2?'#768c64':'#94a36f',side*(w/2+.36),roofY-1.5+k*.35,front,.22,.28,.12);
  }
 }else if(style==='centaur'){
  // An open colonnade, tall double doors and a broad flush threshold are usable
  // by four-legged residents rather than a human cottage enlarged uniformly.
  for(const side of [-1,1]){
   b.beam(lightStone,[side*(w/2-.24),base+.12,front],[side*(w/2-.24),base+h-.1,front],.13);
   arc(b,wood,side*(w/2-1.3),base+h-1.5,front,1.1,1.3,0,Math.PI,.12);
  }
  for(let i=0;i<9;i++){
   const x=-w*.38+i*w*.095;
   b.beam('#b6ae80',[x-.22,base+h-.55,front],[x,base+h-.28,front],.065);
   b.beam('#b6ae80',[x,base+h-.28,front],[x+.22,base+h-.55,front],.065);
  }
  b.block('#ad9a70',0,base+.19,front+.35,w-1,.08,1.5);
 }
}
function house(b,lot,index,heightAt,colliders,buildings){
 const {id,x,z,w,d,h,yaw,style}=lot,y=heightAt(x,z),c=Math.cos(yaw),s=Math.sin(yaw);
 const corners=[[-1,-1],[-1,1],[1,-1],[1,1]].map(([a,v])=>heightAt(x+a*w*.52*c+v*d*.52*s,z-a*w*.52*s+v*d*.52*c));
 const low=Math.min(y,...corners)-.22,foundationY=Math.max(y,Math.min(y+.3,Math.max(...corners)));
 const base=foundationY-y,roof=style==='elf'?'#466b60':style==='centaur'?'#a79a72':style==='dwarf'?'#5e6e6d':style==='satyr'?'#71835b':roofs[index%roofs.length];
 const rise=h*(style==='elf'?.8:style==='dwarf'?.43:style==='satyr'?.44:.55),wall=style==='elf'?'#b6b69a':style==='dwarf'?'#a8aa98':style==='satyr'?'#b5a77f':clay[index%clay.length];
 buildings.push({id,x,z,width:w,depth:d,yaw,style});
 b.frame(x,y,z,yaw,()=>{
  b.block(stone,0,low-y,0,w+.5,foundationY-low+.15,d+.5);
  if(style!=='centaur')for(let k=0;k<3;k++)b.block(k%2?lightStone:stone,0,base+.06-k*.12,d/2+.3+k*.28,w*.42,.13,.55);
  if(style==='centaur'){
   for(const dx of [-1,1])for(const dz of [-1,1]){
    b.block(timber,dx*(w/2-.25),base,dz*(d/2-.3),.4,h,.4);
    b.beam(wood,[dx*(w/2-.25),base+h-1.4,dz*(d/2-.3)],[dx*(w/2-1.6),base+h,dz*(d/2-.3)],.18);
   }
   b.block(wall,0,base+.15,-d/2,w,h-.15,.25);
   for(const side of [-1,1])b.block(wall,side*(w/2-.12),base+.15,0,.24,h-.15,d);
   b.block('#9f9470',0,base+.2,-d*.18,w-1,.12,d*.45);
   b.block(wood,-w*.3,base+.25,-d*.3,w*.2,.72,1.4);
   for(let j=0;j<4;j++)b.rock('#baa675',w*.25+j*.14,base+.45,-d*.25,.55,.3,.4);
  }else{
   b.block(wall,0,base+.12,0,w,h,d);
   for(const side of [-1,1]){
    for(const zz of [-1,1])b.block(timber,side*(w/2-.12),base+.1,zz*(d/2+.06),.22,h,.18);
    b.block(timber,side*(w/2+.04),base+h-.24,0,.18,.2,d+.23);
    b.block(timber,side*(w/2+.04),base+.42,0,.18,.18,d+.23);
    for(const zz of [-d*.24,d*.24]){
     b.block(timber,side*(w/2+.07),base+1.3,zz,.15,1.4,1.2);
     b.block('#728a7b',side*(w/2+.16),base+1.42,zz,.06,1.15,.96);
     b.block(wood,side*(w/2+.18),base+1.35,zz-.74,.1,1.32,.32);
     b.block(wood,side*(w/2+.18),base+1.35,zz+.74,.1,1.32,.32);
    }
   }
   b.block(timber,0,base+.12,d/2+.05,1.7,2.8,.13);
   b.block(wood,0,base+.18,d/2+.14,1.42,2.48,.12);
   for(const dx of [-.48,0,.48])b.block('#94714b',dx,base+.2,d/2+.22,.025,2.4,.025);
   for(const yy of [.65,2])b.block(iron,0,base+yy,d/2+.23,1.35,.065,.035);
   b.rock('#b3a27c',.47,base+1.25,d/2+.3,.075,.075,.045);
   for(const dx of [-1,1]){
    b.block(timber,dx*w*.3,base+1.35,d/2+.07,1.35,1.5,.14);
    b.block('#7a9585',dx*w*.3,base+1.5,d/2+.17,1.08,1.2,.07);
    b.block(lightStone,dx*w*.3,base+1.3,d/2+.23,1.5,.14,.25);
    b.block(creamTint(index),dx*w*.3,base+2.08,d/2+.23,1.05,.045,.055);
    b.block(creamTint(index),dx*w*.3,base+1.5,d/2+.23,.045,1.2,.055);
    if(index%3===0)planter(b,dx*w*.3,base+1.05,d/2+.45,1.6);
   }
   b.block(timber,0,base+h-.22,d/2+.08,w,.2,.18);
   if(h>5.6){
    b.block(timber,0,base+3.3,d/2+.09,w,.19,.19);
    for(const dx of [-w*.3,0,w*.3]){
     b.block(timber,dx,base+3.75,d/2+.1,1.25,1.5,.17);
     b.block('#7b8f83',dx,base+3.9,d/2+.22,1,1.18,.08);
    }
    for(const side of [-1,1])b.beam(timber,[side*w*.47,base+3.4,d/2+.14],[side*w*.2,base+h-.3,d/2+.14],.12);
   }
  }
  b.roof(roof,0,base+h+.1,0,w+1.2,d+1.25,rise,0,style==='elf'?'#87967b':wall);
  b.beam(timber,[0,base+h+rise+.14,-d/2-.8],[0,base+h+rise+.14,d/2+.8],.16);
  // Fine shingle courses and rafter ends give the roofs scale without extra meshes.
  for(const side of [-1,1])for(let j=1;j<5;j++){
   const t=j/5,xx=side*(w/2+.6)*t,yy=base+h+.13+rise*(1-t);
   b.beam(index%2?'#8d9379':'#9e9677',[xx,yy,-d/2-.63],[xx,yy,d/2+.63],.045);
  }
  for(const side of [-1,1])b.beam(wood,[side*(w/2+.5),base+h+.14,d/2+.68],[0,base+h+rise+.15,d/2+.68],.14);
  if(style==='elf'){
   for(const end of [-1,1]){
    const zz=end*(d/2+.8);b.beam('#c0b99a',[0,base+h+rise,zz],[0,base+h+rise+.8,zz+end*.4],.13);
    b.beam('#c0b99a',[0,base+h+rise+.5,zz+end*.2],[.36,base+h+rise+.9,zz+end*.35],.09);
   }
   b.beam(wood,[-1,base+2.5,d/2+.32],[0,base+3.35,d/2+.32],.15);
   b.beam(wood,[0,base+3.35,d/2+.32],[1,base+2.5,d/2+.32],.15);
  }else if(style!=='centaur'&&style!=='dwarf'){
   b.block('#8c8d7b',-w*.28,base+h+rise*.4,-d*.27,.85,2.1,.85);
   b.block(lightStone,-w*.28,base+h+rise*.4+2.02,-d*.27,1.04,.22,1.04);
  }
  houseCraft(b,lot,base,rise);
  if(index===0){
   // The shared council house: an open timber porch, three interwoven branch motifs.
   b.roof('#647c67',0,base+3.5,d/2+1.7,6.6,3.6,1.1);
   for(const dx of [-2.8,2.8]){b.block(timber,dx,base,d/2+3,.25,3.5,.25);b.beam(wood,[dx,base+2.5,d/2+3],[dx*.6,base+3.5,d/2+3],.16);}
   for(const dx of [-.7,0,.7])b.beam('#b4a477',[dx,base+h+.5,d/2+.71],[dx*.4,base+h+1.6,d/2+.71],.12);
   lantern(b,-2.8,base+3.3,d/2+3);
  }
  if(index%3===1){
   barrel(b,w/2+.8,base,d/2-.6);crate(b,w/2+.8,base,d/2-1.5);
  }
 });
 if(style!=='centaur')colliders.push({x,z,r:Math.hypot(w,d)*.46,kind:'building'});
 else for(const side of [-1,1]){const lx=side*(w/2-.2);colliders.push({x:x+c*lx,z:z-s*lx,r:.4,kind:'post'});}
}
const creamTint=i=>i%2?'#c7c4a3':'#b6b294';

export function* buildYunethreTown({root,heightAt,terrainSurface,colliders,buildings,metrics}){
 const b=createSceneryBuilder('Laketown / timber, living green roofs and council common');
 yield* groundPatch(b,terrainSurface,'#b7b196',heightAt,T.x,T.z,38,19,0,.075,12);
 for(let i=0;i<YUNETHRE_TOWN_LOTS.length;i++){yield;house(b,YUNETHRE_TOWN_LOTS[i],i,heightAt,colliders,buildings);}
 metrics.buildings=buildings.length;
 const lane=[[-15,-32],[8,-32],[35,-30],[38,-6],[42,27],[30,37],[3,38],[-23,36],[-31,15]].map(([x,z])=>({x:T.x+x,z:T.z+z}));
 yield* groundRibbon(b,lane,2.8,'#aca58a',heightAt,terrainSurface,.07);
 for(const [a,c]of [[[6,-8],[6,-32]],[[19,8],[30,37]],[[-18,8],[-31,15]],[[35,-30],[69,-30]],[[3,38],[12,76]]])
  yield* groundRibbon(b,[{x:T.x+a[0],z:T.z+a[1]},{x:T.x+c[0],z:T.z+c[1]}],2.7,'#b6ad91',heightAt,terrainSurface,.08);
 for(const lot of YUNETHRE_TOWN_LOTS){
  const front={x:lot.x+Math.sin(lot.yaw)*(lot.d/2+1),z:lot.z+Math.cos(lot.yaw)*(lot.d/2+1)};
  let nearest=lane[0],distance=Infinity;
  for(const p of lane){const d=Math.hypot(front.x-p.x,front.z-p.z);if(d<distance){distance=d;nearest=p;}}
  // Small threshold patches avoid drawing a spoke through another house.
  yield* groundRibbon(b,[front,{x:front.x+(nearest.x-front.x)*Math.min(1,4/distance),z:front.z+(nearest.z-front.z)*Math.min(1,4/distance)}],2.3,'#b6ad91',heightAt,terrainSurface,.08);
 }
 // Four individual stalls leave the entire middle and eastern approach open.
 const stallColours=['#9b7f54','#6b8874','#b69362','#87917b'];
 for(let i=0;i<4;i++){
  const dx=[-15,-7,10,18][i],x=T.x+dx,z=T.z-8,y=heightAt(x,z);yield;
  b.frame(x,y,z,0,()=>{
   for(const xx of [-2.4,2.4]){b.block(timber,xx,0,-.8,.16,2.8,.16);b.block(timber,xx,0,1,.16,2.35,.16);}
   for(let k=0;k<5;k++){
    const x0=-2.65+k*1.06,x1=x0+1.06,tint=k%2?'#d2c6a3':stallColours[i];
    b.sheet(tint,[x0,2.85,-1.4],[x1,2.85,-1.4],[x1,2.35,1.5],[x0,2.35,1.5]);
    b.sheet(tint,[x0,2.35,1.5],[x1,2.35,1.5],[x1,2.08,1.55],[x0,2.08,1.55]);
   }
   b.block(wood,0,.75,.25,4.5,.2,1.1);
   for(let j=0;j<4;j++){
    const xx=-1.6+j*1.05;b.block('#6a5439',xx,.95,.25,.86,.12,.75);
    for(let k=0;k<3;k++)b.rock(i===1?'#88a261':i===2?'#b78961':i===3?'#b8a278':'#c7a65c',xx+(k-1)*.2,1.12,.25,.19,.14,.23);
   }
   crate(b,-1.6,0,-1.1);barrel(b,1.5,0,-1.1,.32);
  });
 }
 // Low stone well and seating frame, rather than fill, the council's speaking area.
 const wx=T.x-11,wz=T.z+5,wy=heightAt(wx,wz);
 b.cylinder(stone,wx,wy,wz,1.35,.7);b.cylinder('#3e4c43',wx,wy+.7,wz,1,.02);
 for(const side of [-1,1])b.block(timber,wx+side*1.1,wy,wz,.18,2.7,.18);
 b.roof('#637d68',wx,wy+2.6,wz,3.5,2.5,1.1);b.beam(wood,[wx-1.1,wy+2.2,wz],[wx+1.1,wy+2.2,wz],.17);
 b.beam('#afa384',[wx,wy+2.2,wz],[wx,wy+.8,wz],.04);colliders.push({x:wx,z:wz,r:1.35,kind:'well'});
 for(const [dx,dz,yaw]of [[-20,-6,0],[-19,7,0],[16,7,0]]){
  const x=T.x+dx,z=T.z+dz,y=heightAt(x,z);b.block(wood,x,y+.58,z,3.1,.18,.65,yaw);
  for(const side of [-1,1])b.block(timber,x+side*1.15,y,z,.24,.6,.56);
 }
 // Small cultivated borders soften the common without filling the speaking
 // circle or its eastern arrival lane with obstacles.
 for(const [dx,dz]of [[21,10],[-15,12],[2,-11],[31,-12]]){
  const x=T.x+dx,z=T.z+dz,y=heightAt(x,z);
  b.block(stone,x,y,z,2.8,.2,1.2);b.block('#776a4c',x,y+.2,z,2.5,.03,.92);
  for(let i=0;i<7;i++){
   const xx=x-1.05+i*.35;b.rock('#7e9357',xx,y+.36,z,.24,.25,.32);
   b.rock(i%2?'#cab7d2':'#d7cc99',xx,y+.57,z,.13,.1,.14);
  }
 }
 // Worked pennants show the settlement's craft, not a premature political flag.
 for(const [dx,dz]of [[-19,-10],[24,-10]]){
  const x=T.x+dx,z=T.z+dz,y=heightAt(x,z);b.block(wood,x,y,z,.16,4,.16);
  b.beam(wood,[x,y+3.75,z],[x+1.2,y+3.75,z],.1);
  b.sheet('#658271',[x+.12,y+3.7,z],[x+1.15,y+3.7,z],[x+1.15,y+2.4,z],[x+.12,y+2.2,z]);
  b.beam('#d4c796',[x+.64,y+2.55,z+.025],[x+.64,y+3.35,z+.025],.045);
  b.beam('#d4c796',[x+.64,y+2.9,z+.025],[x+.95,y+3.15,z+.025],.045);
 }
 metrics.marketStalls=4;yield* b.finishSteps(root);
}

export function* buildYunethreFarms({root,heightAt,terrainSurface,colliders,metrics}){
 const b=createSceneryBuilder('Laketown / kitchen gardens, orchard craft and farmyard');
 const garden=YUNETHRE_FIELDS.find(f=>f.id==='laketown-kitchen-garden');
 for(let row=0;row<4;row++){
  const x=garden.x-12+row*8;yield* groundPatch(b,terrainSurface,'#887a55',heightAt,x,garden.z,5.6,19,0,.1,5);
  for(let j=0;j<12;j++){
   const z=garden.z-8.5+j*1.5;yield;
   for(const dx of [-1.5,0,1.5]){
    const px=x+dx,y=heightAt(px,z);
    b.rock(row%2?'#6f8d4d':'#8e9a59',px,y+.21,z,.31,.27,.29);
    if(row%2===0)b.rock('#c4c69b',px,y+.36,z,.16,.14,.16);
   }
  }
 }
 const F=YUNETHRE_FARMYARD,y=heightAt(F.x,F.z);
 yield* groundPatch(b,terrainSurface,'#a89b78',heightAt,F.x,F.z,23,23,.08,.07,7);
 b.frame(F.x,y,F.z,0,()=>{
  b.block(stone,0,-.7,-3,11,1,8);b.block('#9a8a68',0,.3,-3,10.5,4.2,7.5);
  b.roof('#8f805d',0,4.5,-3,12,9,3);b.block(timber,0,.3,.79,4,3.5,.14);
  for(const dx of [-1,1])b.block(wood,dx*1.02,.35,.9,1.9,3.3,.13);
  for(const dx of [-4.9,0,4.9])b.block(timber,dx,.3,.82,.2,4.2,.17);
  for(const side of [-1,1])b.beam(timber,[side*4.9,.5,.95],[side*2,3.8,.95],.13);
  for(let i=0;i<3;i++)b.rock('#baa875',7,1+i*.65,-4,1.6,.8,2.1);
  b.cone('#978458',7,2.3,-4,2.3,1.6);
  for(let i=0;i<3;i++)barrel(b,-7,.1,-1+i*1.2);
  crate(b,-7,.1,3,1);crate(b,-7,.1,4.2,.8);
  // A real hand cart and broad field gate make the relationship legible at ground level.
  b.block(wood,5,.8,6,3,.2,1.8);b.block(wood,5,1,5.2,3,.6,.14);
  for(const dx of [-1,1])b.rock(iron,5+dx*1.2,.65,6.95,.55,.55,.13);
  b.beam(timber,[4.4,.9,6.8],[4.4,.4,9.4],.12);b.beam(timber,[5.6,.9,6.8],[5.6,.4,9.4],.12);
 });
 colliders.push({x:F.x,z:F.z-3,r:6.2,kind:'building'});
 const paths=[[{x:T.x+12,z:T.z+66},{x:T.x+45,z:T.z+84},{x:F.x,z:F.z+9}],
  [{x:F.x,z:F.z+9},{x:T.x+60,z:T.z+143}],
  [{x:T.x+48,z:T.z-35},{x:YUNETHRE_ORCHARD.x,z:YUNETHRE_ORCHARD.z+20}]];
 for(const path of paths)yield* groundRibbon(b,path,2.6,'#b4aa88',heightAt,terrainSurface,.08);
 // Split-rail field edges are deliberately discontinuous: there are broad
 // entries and no invisible fenced corridors across the existing travel tracks.
 for(const f of YUNETHRE_FIELDS.filter(f=>f.kind!=='fallow')){
  const z=f.z+f.d/2+1;
  for(let x=f.x-f.w/2+2;x<f.x+f.w/2-5;x+=9){yield;if(Math.abs(x-f.x)<7)continue;
   const x2=x+5.5,y1=heightAt(x,z),y2=heightAt(x2,z);
   for(const [px,yy]of [[x,y1],[x2,y2]])b.block(wood,px,yy,z,.15,1.05,.15);
   for(const h of [.5,.9])b.beam('#968262',[x,y1+h,z],[x2,y2+h,z],.085);
  }
 }
 metrics.gardenBeds=4;metrics.farmyards=1;yield* b.finishSteps(root);
}

export function* buildYunethrePromenade({root,heightAt,walkSurfaces,colliders,metrics}){
 const b=createSceneryBuilder('Laketown / stone stair viaduct and tarn landing'),endY=YUNETHRE_LAKE.surface+.8;
 const points=[{x:T.x-23,z:T.z,y:heightAt(T.x-23,T.z)+.10},{x:T.x-43,z:T.z+9,y:25},
  {x:T.x-62,z:T.z+9,y:endY},{x:T.x-86,z:T.z+9,y:endY}];
 const width=3.8;
 for(let k=1;k<points.length;k++){
  const a=points[k-1],c=points[k],length=Math.hypot(c.x-a.x,c.z-a.z),ux=(c.x-a.x)/length,uz=(c.z-a.z)/length;
  walkSurfaces.push({id:`yunethre-tarn-walk-${k}`,kind:a.y===c.y?'deck':'ramp',a,b:c,width});
  const water=k===3,steps=Math.ceil(length/(water?.65:.55)),yaw=Math.atan2(ux,uz);
  // The continuous collision ramp sits immediately under these shallow treads.
  for(let i=0;i<steps;i++){
   yield;const t=(i+.5)/steps,x=a.x+(c.x-a.x)*t,z=a.z+(c.z-a.z)*t,y=a.y+(c.y-a.y)*t;
   b.box(water?'#a18b67':i%5?lightStone:stone,x,y-.14,z,width,.28,length/steps+.025,yaw);
  }
  const spans=Math.ceil(length/(water?6:6.5));
  for(let i=0;i<=spans;i++){
   yield;const t=i/spans,x=a.x+(c.x-a.x)*t,z=a.z+(c.z-a.z)*t,y=a.y+(c.y-a.y)*t,ground=heightAt(x,z);
   if(!water){
    // Broad masonry piers and buttresses read as architecture across the gully,
    // with decorative stepped courses instead of implausibly thin 20m posts.
    const low=ground-.35,high=Math.max(.25,y-low-.15);
    b.block(stone,x,low,z,4.5,high,1.65,yaw);
    for(const side of [-1,1]){
     const px=x-uz*side*2.04,pz=z+ux*side*2.04;
     b.block('#92947f',px,low,pz,1.05,high*.72,2.3,yaw);
     b.block(lightStone,px,low+high*.72,pz,1.15,.2,2.5,yaw);
    }
    for(let yy=low+2;yy<y-.3;yy+=2.8)b.box('#b5b29a',x,yy,z,4.58,.13,1.72,yaw);
   }else for(const side of [-1,1]){
    const px=x-uz*side*1.73,pz=z+ux*side*1.73,low=heightAt(px,pz)-.2;
    b.block(wood,px,low,pz,.34,y-low+.9,.34);b.block('#514e3d',px,YUNETHRE_LAKE.surface-.2,pz,.39,.32,.39);
   }
   for(const side of [-1,1]){
    const px=x-uz*side*1.84,pz=z+ux*side*1.84;
    b.block(water?wood:lightStone,px,y-.15,pz,.25,1.2,.25);
    if(!water)b.cone('#9c9f81',px,y+1.05,pz,.24,.3);
   }
  }
  for(const side of [-1,1]){
   const ax=a.x-uz*side*1.84,az=a.z+ux*side*1.84,cx=c.x-uz*side*1.84,cz=c.z+ux*side*1.84;
   // Open the southern rail at the fisher's gangway and working berth.
   const sections=water&&side===-1?[[0,7.9/24],[12.1/24,16/24],[20/24,1]]:[[0,1]];
   for(const [u,v]of sections)for(const h of [.94,.4]){
    const at=t=>[ax+(cx-ax)*t,a.y+(c.y-a.y)*t+h,az+(cz-az)*t];
    b.beam(water?wood:h===.94?lightStone:'#909980',at(u),at(v),h===.94?.18:.1);
   }
   b.beam(water?timber:'#aaa88d',[ax,a.y-.4,az],[cx,c.y-.4,cz],.3,.65);
   // Curved arch ribs between piers, visible from both town and lake.
   if(!water)for(let span=0;span<spans;span++){
    const t0=span/spans,t1=(span+1)/spans;
    for(let j=0;j<6;j++){
     const rib=t=>{const v=t0+(t1-t0)*t;return [ax+(cx-ax)*v,a.y+(c.y-a.y)*v-.4-1.5*(1-Math.sin(Math.PI*t)),az+(cz-az)*v];};
     b.beam(lightStone,rib(j/6),rib((j+1)/6),.4,.38);
    }
   }
  }
 }
 // A little canopy at the high shore breaks up the long ascent without
 // blocking its walking width. The fishing pier continues under it.
 const shore=points[2];
 for(const dz of [-1.8,1.8])for(const dx of [-2,2])b.block(timber,shore.x+dx,shore.y,shore.z+dz,.18,3.1,.18);
 b.roof('#527365',shore.x,shore.y+3.1,shore.z,5.4,5.5,1.8,Math.PI/2,'#b6b596');
 b.beam('#c7b987',[shore.x-3,shore.y+5,shore.z],[shore.x+3,shore.y+5,shore.z],.12);
 // Small lake craft sit on the actual water plane beside, never through, the pier.
 for(const [dx,dz,yaw]of [[-88,1,.9]]){
  const x=T.x+dx,z=T.z+dz,y=YUNETHRE_LAKE.surface+.12;yield;
  b.frame(x,y,z,yaw,()=>{
   const left=[[-.85,.1,-2.1],[-1.05,.05,1.3],[0,.35,3]],right=[[.85,.1,-2.1],[1.05,.05,1.3],[0,.35,3]],keel=[0,-.35,0];
   b.triangle('#795c3d',left[0],left[1],keel);b.triangle('#96754e',left[1],left[2],keel);
   b.triangle('#795c3d',right[1],right[0],keel);b.triangle('#96754e',right[2],right[1],keel);
   b.sheet('#6b543b',left[0],right[0],right[1],left[1]);
   for(const zz of [-1.2,.4,1.7])b.block('#b0966c',0,.16,zz,1.6,.12,.3);
   b.beam(wood,[-1.8,.2,-.8],[1.8,.3,1.2],.09);barrel(b,0,.2,-1.5,.27);
  });
 }
 buildLaketownWaterfront(b,{heightAt,walkSurfaces,colliders,metrics});
 metrics.lakeBoats=1;metrics.stoneStairSpans=7;yield* b.finishSteps(root);
}

// Feature-owned camp builder also shares its physical layout with residents.
export function* buildYunethreCamp(context){yield* buildCentaurCamp(context);}
