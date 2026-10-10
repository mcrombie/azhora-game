import * as THREE from 'three';
import {decoratePyraHouse,decoratePyraPalace,polishPyra} from './pyra-polish.js';
import {PYRA_INFILL_HOMES} from './pyra-neighborhoods.js';
import { createSceneryBuilder } from '../../../world/scenery/scenery-builder.js';
import { finishBuild } from '../../../world/loading/build-steps.js';
import { WEST_PROFILES, westWaterSurface } from '../western-regions/west-ground.js';
import { PYRA, PYRA_SPIRAL, pyraPoint, pyraLocal } from './pyra-world.js';

const GOLD='#d5ad48', LIGHT='#ecd080', SHADE='#ac8131', OLD='#a28c57', PLASTER='#e1c985';
const DARK='#514635', WOOD='#725338', ROOF='#a57437', GREEN='#77894c', TAU=Math.PI*2;
export const createPyraScenery=(...args)=>finishBuild(createPyraScenerySteps(...args));

/** Architecture only. No invented emperor appearance or civilian cast. */
export function* createPyraScenerySteps({parent,heightAt,colliders}){
 const root=new THREE.Group();root.name='Pyra — golden twin imperial city';parent.add(root);
 const walkSurfaces=[],walkRoutes=[],mapFeatures=[];
 const metrics={buildings:0,wallSegments:0,towers:0,stalls:0,boats:0,batches:0,vertices:0,colliders:0,walkSurfaces:0};
 const push=c=>{colliders.push(c);metrics.colliders++;};
 const solid=(u,v,r,minY,maxY,kind)=>push({...pyraPoint(u,v),r,minY,maxY,kind:`pyra-${kind}`});
 const line=(a,b,width,minY,maxY,kind)=>{const n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.85);for(let i=0;i<=n;i++)solid(a[0]+(b[0]-a[0])*i/n,a[1]+(b[1]-a[1])*i/n,width/2,minY,maxY,kind);};
 const feature=(id,name,u,v,width,depth,kind='building')=>mapFeatures.push({id:`pyra-${id}`,name,...pyraPoint(u,v),width,depth,rotation:PYRA.yaw,kind});
 function* batch(name,draw){const b=createSceneryBuilder(`Pyra — ${name}`);b.frame(PYRA.x,0,PYRA.z,PYRA.yaw,()=>draw(b));metrics.vertices+=b.vertexCount;yield* b.finishSteps(root);metrics.batches++;}
 const surface=(id,a,b,width)=>walkSurfaces.push({id:`pyra-${id}`,kind:a[2]===b[2]?'deck':'ramp',a:pyraPoint(...a),b:pyraPoint(...b),width});
 function floor(b,a,c,width,tint=LIGHT){const dx=c[0]-a[0],dz=c[1]-a[1],len=Math.hypot(dx,dz),nx=-dz/len*width/2,nz=dx/len*width/2;
  b.sheet(tint,[a[0]+nx,a[2],a[1]+nz],[c[0]+nx,c[2],c[1]+nz],[c[0]-nx,c[2],c[1]-nz],[a[0]-nx,a[2],a[1]-nz]);
 }
 function rail(b,a,c){b.beam(LIGHT,[a[0],a[2]+1.1,a[1]],[c[0],c[2]+1.1,c[1]],.14);const n=Math.ceil(Math.hypot(c[0]-a[0],c[1]-a[1])/1.5);for(let i=0;i<=n;i++){const t=i/n,u=a[0]+(c[0]-a[0])*t,v=a[1]+(c[1]-a[1])*t,y=a[2]+(c[2]-a[2])*t;b.cylinder(GOLD,u,y,v,.09,1.15);solid(u,v,.12,y,y+1.2,'rail');}}
 function dome(b,u,v,y,r,h){const rings=10,n=32;for(let j=0;j<rings;j++)for(let i=0;i<n;i++){
  const p=(k,a)=>{const t=k/rings*Math.PI/2;return [u+Math.cos(a)*Math.cos(t)*r,y+Math.sin(t)*h,v+Math.sin(a)*Math.cos(t)*r];};
  b.sheet(i%7===0?LIGHT:GOLD,p(j,i*TAU/n),p(j,(i+1)*TAU/n),p(j+1,(i+1)*TAU/n),p(j+1,i*TAU/n));
 }b.cylinder(LIGHT,u,y+h,v,.18,2.5);b.cone(GOLD,u,y+h+2.5,v,.65,1.6);}
 function arch(b,u,v,y,width,height,depth,yaw=0){b.frame(u,y,v,yaw,()=>{
  for(const s of [-1,1])b.block(GOLD,s*(width/2+.55),0,0,1.1,height*.58,depth);
  for(let i=0;i<20;i++){const a=i*Math.PI/20,c=(i+1)*Math.PI/20,r=width/2,h=height*.42;
   for(const face of [-1,1])b.sheet(i%4?GOLD:LIGHT,[Math.cos(a)*r,height*.58+Math.sin(a)*h,face*depth/2],[Math.cos(c)*r,height*.58+Math.sin(c)*h,face*depth/2],[Math.cos(c)*(r+1.1),height*.58+Math.sin(c)*(h+1.1),face*depth/2],[Math.cos(a)*(r+1.1),height*.58+Math.sin(a)*(h+1.1),face*depth/2]);
  }
 });}
 function wall(b,a,c){const dx=c[0]-a[0],dz=c[1]-a[1],length=Math.hypot(dx,dz),yaw=Math.atan2(-dz,dx);b.frame((a[0]+c[0])/2,30,(a[1]+c[1])/2,yaw,()=>{
  b.block(SHADE,0,-1,0,length,14,4.8);b.block(GOLD,0,0,0,length,12.8,4.9);
  for(let y=1;y<13;y+=1.25)for(const s of [-1,1])b.box(OLD,0,y,s*2.46,length,.075,.035);
  for(let x=-length/2+2;x<length/2;x+=4){b.block(LIGHT,x,13,0,2.25,1.9,5.1);for(const s of [-1,1])b.block(SHADE,x,-.5,s*2.9,1.2,8,1.3);}
  b.box(LIGHT,0,12.5,0,length+.2,.5,5.4);
 });line(a,c,4.8,29,45,'curtain');metrics.wallSegments++;}
 function tower(b,u,v){b.cylinder(SHADE,u,29,v,7,2);b.cylinder(GOLD,u,30,v,6,18);b.cylinder(LIGHT,u,47,v,6.6,1);for(let i=0;i<12;i++){const a=i*TAU/12;b.block(LIGHT,u+Math.cos(a)*5.7,48,v+Math.sin(a)*5.7,1.7,2,1.7,a);}solid(u,v,6,29,50,'tower');metrics.towers++;}
 // Two independent curtain circuits meet the river at four fortified waterfront ends.
 for(const side of [-1,1]){
  const pts=[[side*25,-94],[side*120,-94],[side*148,-68],[side*148,-12]];
  const tail=[[side*148,12],[side*148,68],[side*120,94],[side*25,94]];
  yield* batch(side<0?'West Pyra fortifications':'East Pyra fortifications',b=>{
   for(const arr of [pts,tail])for(let i=1;i<arr.length;i++)wall(b,arr[i-1],arr[i]);
   for(const [u,v] of [...pts,...tail])tower(b,u,v);
   arch(b,side*148,0,30,12,15,5,Math.PI/2);
  });
 }
 // The quays are broad paved strips; retaining courses visibly meet the water banks.
 yield* batch('river quays and processional streets',b=>{
  for(const side of [-1,1]){
   b.box('#c8b47a',side*33,30.025,0,16,.05,178);
   b.block(OLD,side*26,18,0,2,12,180);
   b.box('#d5bf86',side*98,30.04,0,99,.08,20);
   b.box('#c9b47e',side*81,30.04,0,12,.08,176);
   b.box('#c9b47e',side*111,30.04,45,60,.08,12);
   b.box('#c9b47e',side*111,30.04,-45,60,.08,12);
  }
 });
 // The high central span preserves the water below; long ramps reach city level.
 const bridge=[[-87,0,30],[-49,0,38],[49,0,38],[87,0,30]];
 yield* batch('golden bridge and parapets',b=>{
  for(let i=1;i<bridge.length;i++){
   const a=bridge[i-1],c=bridge[i];surface(`bridge-${i}`,a,c,44);floor(b,a,c,44);
   for(const v of [-22,22]){rail(b,[a[0],v,a[2]],[c[0],v,c[2]]);b.beam(GOLD,[a[0],a[2]-.65,v],[c[0],c[2]-.65,v],1.4,1.3);}
  }
  for(const v of [-20,20])arch(b,0,v,19,43,16,2.5);
  for(const u of [-47,47])for(const v of [-20,20]){b.block(GOLD,u,19,v,7,18,6);b.block(LIGHT,u,37,v,8,1,7);solid(u,v,3,18,38,'bridge-pier');}
 });
 feature('bridge','The golden bridge',0,0,174,44,'bridge');
 // Spiralling support segments overlap slightly at their joints, preserving continuous travel.
 yield* batch('spiral stair to the suspended palace',b=>{
  b.cylinder(LIGHT,0,38,8,.65,33);
  for(let i=1;i<PYRA_SPIRAL.length;i++){
   const a=(i-1)/160*TAU*2,c=i/160*TAU*2,ya=38+(i-1)/160*34,yc=38+i/160*34;
   const pa=[10*Math.cos(a),8+10*Math.sin(a),ya],pc=[10*Math.cos(c),8+10*Math.sin(c),yc];
   const dx=pc[0]-pa[0],dz=pc[1]-pa[1],len=Math.hypot(dx,dz),over=.08;
   surface(`spiral-${i}`,[pa[0]-dx/len*over,pa[1]-dz/len*over,ya-(yc-ya)/len*over],[pc[0]+dx/len*over,pc[1]+dz/len*over,yc+(yc-ya)/len*over],4);
   floor(b,pa,pc,4,i%5?LIGHT:GOLD);
   // Each visible riser is narrow enough to match the continuous collision ramp.
   b.beam(GOLD,[pa[0],ya-.14,pa[1]],[pc[0],yc-.14,pc[1]],4,.24);
   for(const r of [8,12])if(i>3||r===8)rail(b,[r*Math.cos(a),8+r*Math.sin(a),ya],[r*Math.cos(c),8+r*Math.sin(c),yc]);
  }
  const landing=[[10,8,72],[10,26,72],[20,26,72],[20,-8,72]];
  for(let i=1;i<landing.length;i++){surface(`palace-landing-${i}`,landing[i-1],landing[i],4);floor(b,landing[i-1],landing[i],4.2);}
  for(const u of [8,12])rail(b,[u,10,72],[u,24,72]);
  rail(b,[8,28,72],[22,28,72]);
  for(const u of [18,22])rail(b,[u,24,72],[u,-3,72]);
 });
 // A visible air gap separates the upward-reaching bridge pylons from the immaculate palace.
 yield* batch('suspended imperial palace',b=>{
  for(const u of [-31,31])for(const v of [-21,21]){
   b.cylinder(GOLD,u,38,v,1.6,18);b.cone(LIGHT,u,56,v,2.4,11);
  }
  b.box(GOLD,0,70.7,-26,65,2.2,44);b.box(LIGHT,0,71.85,-26,66,.3,45);
  surface('palace-court',[-32,-26,72],[32,-26,72],44);
  for(const v of [-48,-4]){if(v===-4){rail(b,[-32,v,72],[17,v,72]);rail(b,[23,v,72],[32,v,72]);}else rail(b,[-32,v,72],[32,v,72]);}
  for(const u of [-32,32])rail(b,[u,-48,72],[u,-4,72]);
  // Open colonnaded audience hall; all doors and the forecourt remain physically usable.
  for(const u of [-18,-12,-6,0,6,12,18])for(const v of [-41,-22]){
   b.cylinder(LIGHT,u,72,v,.65,10);b.cylinder(GOLD,u,72,v,1, .5);b.cylinder(GOLD,u,81.3,v,1,.8);solid(u,v,.7,72,82,'palace-column');
  }
  // An enclosed rear chamber gives the open audience colonnade a palace behind it.
  b.block(GOLD,0,72,-41,36,10,1);
  line([-18,-41],[18,-41],1,72,82,'palace-wall');
  for(const u of [-18,18]){b.block(GOLD,u,72,-34,1,10,14);line([u,-41],[u,-27],1,72,82,'palace-wall');}
  for(const u of [-12,-6,0,6,12]){b.box(SHADE,u,76.8,-40.45,3,6,.12);b.box(LIGHT,u,79.8,-40.3,3.3,.25,.25);}
  for(const u of [-27,-21,-15,-9,-3,3,9,15,21,27])b.box(GOLD,u,72.025,-15,3.8,.05,3.8);
  for(const v of [-46,-6])for(let u=-30;u<=30;u+=3){if(v===-6&&u>=17&&u<=23)continue;b.cone(GOLD,u,73.2,v,.25,.65);}
  b.box(GOLD,0,82.5,-31.5,40,1,24);b.box(LIGHT,0,83.1,-31.5,41,.35,25);dome(b,0,-31.5,83.3,12,9);
  for(const u of [-25,25])for(const v of [-40,-13]){
   for(const du of [-2,2])for(const dv of [-2,2]){b.cylinder(LIGHT,u+du,72,v+dv,.3,5);solid(u+du,v+dv,.32,72,77,'pavilion-column');}
   b.box(GOLD,u,77,v,5.5,.5,5.5);dome(b,u,v,77.25,3.1,3.4);
  }
  b.block(GOLD,0,72,-39,4,.5,3);b.block(LIGHT,0,72.5,-40,2.4,3,.5);
  decoratePyraPalace(b);
 });
 feature('palace','The suspended imperial palace',0,-26,66,44,'palace');
 // Closed household shells are mixed with genuinely open civic and trading halls.
 function house(b,u,v,w,d,h,index,open=false){
  const tint=[PLASTER,GOLD,'#c6aa64','#d9bc71'][index%4];
  b.block(SHADE,u,29.5,v,w+1,.8,d+1);
  b.block(tint,u-w/2+.35,30,v,.7,h,d);b.block(tint,u+w/2-.35,30,v,.7,h,d);
  b.block(tint,u,30,v-d/2+.35,w,h,.7);
  const door=3;for(const s of [-1,1])b.block(tint,u+s*(w+door)/4,30,v+d/2-.35,(w-door)/2,h,.7);
  b.block(tint,u,34.2,v+d/2-.35,door,h-4.2,.7);
  b.box(LIGHT,u,30+h,v,w+1,.45,d+1);b.roof(index%3?ROOF:GOLD,u,30+h+.2,v,w+1.7,d+1.7,2.2);
  for(const du of [-w*.28,w*.28]){b.box(DARK,u+du,30+h*.67,v+d/2+.015,1.5,2,.09);b.box(LIGHT,u+du,30+h*.67-1.1,v+d/2+.08,1.9,.2,.3);}
  if(open){line([u-w/2,v-d/2],[u+w/2,v-d/2],.7,30,30+h,'hall-wall');for(const s of [-1,1]){line([u+s*w/2,v-d/2],[u+s*w/2,v+d/2],.7,30,30+h,'hall-wall');line([u+s*door/2,v+d/2],[u+s*w/2,v+d/2],.7,30,30+h,'hall-wall');}}
  else {for(let dx=-w/2+1;dx<w/2;dx+=2)line([u+dx,v-d/2+1],[u+dx,v+d/2-1],2.1,30,30+h,'house');b.block(WOOD,u,30,v+d/2+.02,2.7,4.1,.12);}
  decoratePyraHouse(b,u,v,w,d,h,index);
  metrics.buildings++;
 }
 for(const side of [-1,1])for(const row of [-1,1]){
  yield* batch(`${side<0?'West':'East'} Pyra ${row<0?'northern':'southern'} quarter`,b=>{
   let index=0;for(const v of [row*35,row*66])for(const u0 of [55,101,127]){
    if(side===-1&&row===-1&&v===-66&&u0!==55)continue;
    const u=side*u0;house(b,u,v,side<0?15:17,17,u0===55?9:12+(index%3)*3.5,index++,u0===55);
    feature(`house-${side}-${row}-${index}`,u0===55?'Pyra trading hall':'Pyra courtyard house',u,v,16,17);
   }
  });
 }
 for(const side of [-1,1])yield* batch(`${side<0?'West':'East'} Pyra townhouses and outer terraces`,b=>{
  for(const [i,h] of PYRA_INFILL_HOMES.entries())if(Math.sign(h.u)===side){
   house(b,h.u,h.v,h.width,h.depth,h.height,i+3);
   feature(`infill-${i}`,'Pyra terraced townhouse',h.u,h.v,h.width,h.depth);
  }
 });
 yield* batch('old civic court and eastern produce exchange',b=>{
  house(b,-108,-65,26,23,13,0,true);feature('records','Imperial records court',-108,-65,26,23);
  for(const side of [-1,1])for(let i=0;i<6;i++){
   const u=side*(94+i%3*14),v=21+Math.floor(i/3)*33;
   for(const du of [-2.5,2.5])for(const dv of [-1.8,1.8]){b.block(WOOD,u+du,30,v+dv,.16,3,.16);solid(u+du,v+dv,.1,30,33,'stall-post');}
   b.sheet(i%2?'#ba7240':'#efe0aa',[u-3,33,v-2],[u+3,33,v-2],[u+3,32.5,v+2],[u-3,32.5,v+2]);b.block(WOOD,u,30,v+1.2,5,1.1,.9);
   for(let k=0;k<5;k++)b.rock(k%2?'#979447':'#ad6438',u-2+k,31.2,v+1.2,.65,.45,.6);
   line([u-2.5,v+1.2],[u+2.5,v+1.2],.9,30,31.1,'stall-counter');metrics.stalls++;
  }
 });
 // Moorings and cargo make the riverfront read as the commercial centre.
 yield* batch('river cargo and moored barges',b=>{
  for(const side of [-1,1])for(const v of [-58,58]){
   for(let i=0;i<4;i++){const u=side*(31+i%2*4),z=v+Math.floor(i/2)*4;b.block(WOOD,u,30,z,2.3,1.7,2.3);solid(u,z,1.35,30,31.7,'cargo');}
   const target=pyraPoint(0,v+side*10),samples=WEST_PROFILES.get('vaellir');
   const p=samples.reduce((a,c)=>Math.hypot(c.x-target.x,c.z-target.z)<Math.hypot(a.x-target.x,a.z-target.z)?c:a);
   const local=pyraLocal(p.x,p.z),u=local.u,y=westWaterSurface(p.x,p.z)+.12;
   b.frame(0,0,local.v-v,0,()=>{
   b.box(WOOD,u,y,v,4,.6,13);for(const s of [-1,1])b.block(DARK,u+s*1.9,y,v,.22,.8,13);b.block(WOOD,u,y,v,2,1.6,5);metrics.boats++;});
  }
 });
 // Productive garden strips outside both river gates follow the actual ground.
 yield* batch('irrigated riverside fields',b=>{
  for(const side of [-1,1])for(const v of [-115,115])for(let row=0;row<5;row++){
   const u=side*(42+row*6);
   for(let k=0;k<15;k++){
    const z=v-8+k*1.15,p=pyraPoint(u,z),y=heightAt(p.x,p.z);
    b.box('#806d42',u,y+.06,z,4.8,.12,1.2);
    for(const du of [-1.5,0,1.5])b.rock(row%2?'#82964c':'#b4a25c',u+du,y+.36,z,.45,.55,.45);
   }
   const a=pyraPoint(u+2.7,v-9),c=pyraPoint(u+2.7,v+9);
   b.beam('#777b61',[u+2.7,heightAt(a.x,a.z)+.07,v-9],[u+2.7,heightAt(c.x,c.z)+.07,v+9],.4,.12);
  }
 });
 walkRoutes.push({id:'pyra-bank-to-bank',points:[pyraPoint(-142,0),pyraPoint(-95,0),pyraPoint(-87,-16,30),pyraPoint(-49,-16,38),pyraPoint(49,-16,38),pyraPoint(87,-16,30),pyraPoint(95,0),pyraPoint(142,0)]});
 walkRoutes.push({id:'pyra-palace-ascent',points:[pyraPoint(-142,0),pyraPoint(-95,0),pyraPoint(-87,-16,30),pyraPoint(-49,-16,38),pyraPoint(15,-16,38),pyraPoint(16,8,38),PYRA_SPIRAL[0],...PYRA_SPIRAL.slice(1),pyraPoint(10,26,72),pyraPoint(20,26,72),pyraPoint(20,-8,72),pyraPoint(0,-12,72)]});
 metrics.walkSurfaces=walkSurfaces.length;
 const detail=yield* polishPyra({root,colliders,heightAt});
 metrics.vertices+=detail.vertices;metrics.batches+=detail.batches;metrics.streetDetails=detail.placements.length;metrics.colliders+=detail.placements.length;
 return {root,walkSurfaces,walkRoutes,mapFeatures,metrics,detail};
}
