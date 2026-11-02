/** A working centaur household camp. Broad felt openings, low storage, raised
 * workbenches and uncluttered circulation follow its inhabitants' bodies.
 * Its woven patterns are invented; no borrowed sacred or ceremonial symbols. */
import { createSceneryBuilder } from '../../../world/scenery/scenery-builder.js';
import { groundFace } from '../../../world/scenery/ground-face.js';
import { YUNETHRE_CAMP as C } from './yunethre-world.js';
import { CAMP_COUNCIL, CAMP_HEARTH, CAMP_SHELTERS, CAMP_ARCHERY_TARGETS,
 CAMP_WAGONS, CENTAUR_BATTLEFIELD } from './centaur-camp-layout.js';

const wood='#69513b', paleWood='#ac8e60', darkWood='#443b30', rope='#baab87';
const cream='#d8c9a4', red='#945f4c', teal='#617d73', iron='#55564b';
const localPoint=(p,x,z)=>({x:p.x+x*Math.cos(p.yaw??0)+z*Math.sin(p.yaw??0),z:p.z-x*Math.sin(p.yaw??0)+z*Math.cos(p.yaw??0)});
function obstacle(colliders,p,x,z,r,kind){colliders.push({...localPoint(p,x,z),r,kind});}
function diamond(b,x,y,z,size,tint=cream){
 const v=[[x,y+size,z],[x+size*.62,y,z],[x,y-size,z],[x-size*.62,y,z]];
 for(let j=0;j<4;j++)b.beam(tint,v[j],v[(j+1)%4],.055);
}
function ring(b,tint,x,y,z,r,w=.075){
 for(let j=0;j<16;j++){const a=j*Math.PI/8,c=(j+1)*Math.PI/8;b.beam(tint,[x+Math.sin(a)*r,y,z+Math.cos(a)*r],[x+Math.sin(c)*r,y,z+Math.cos(c)*r],w);}
}
function basket(b,x,y,z,r=.5){
 b.cylinder('#a88f62',x,y,z,r,.65);b.cylinder('#5f523a',x,y+.64,z,r*.84,.025);
 for(const h of [.12,.31,.5,.65])ring(b,'#cab582',x,y+h,z,r,.055);
}
function rolledFelt(b,x,y,z,tint=teal){
 b.box(tint,x,y+.28,z,1.25,.55,.6);b.box(rope,x-.3,y+.29,z,.06,.58,.64);b.box(rope,x+.3,y+.29,z,.06,.58,.64);
}
function banner(b,p,heightAt,{height=5.5,tint=red}={}){
 const y=heightAt(p.x,p.z);b.block(wood,p.x,y,p.z,.16,height,.16);
 b.beam(paleWood,[p.x-.72,y+height-.55,p.z],[p.x+.72,y+height-.55,p.z],.1);
 b.sheet(tint,[p.x-.63,y+height-.55,p.z],[p.x+.63,y+height-.55,p.z],[p.x+.46,y+height-2.65,p.z+.18],[p.x-.46,y+height-2.65,p.z+.18]);
 diamond(b,p.x,y+height-1.5,p.z+.12,.45);b.cone(paleWood,p.x,y+height,p.z,.16,.35);
}
function feltHouse(b,p,heightAt,colliders,index){
 const y=heightAt(p.x,p.z),r=p.r,h=3.55,n=12,roof=h+2.8;
 b.frame(p.x,y,p.z,p.yaw,()=>{
  // Two omitted front panels leave a real, six-metre-wide opening.
  for(let j=1;j<11;j++){
   const a=j*Math.PI/6,d=(j+1)*Math.PI/6,mid=(a+d)/2;
   const ax=Math.sin(a)*r,az=Math.cos(a)*r,bx=Math.sin(d)*r,bz=Math.cos(d)*r;
   b.sheet(j%3===index%3?'#c4b38d':p.cloth,[ax,.12,az],[bx,.12,bz],[bx,h,bz],[ax,h,az]);
   b.beam(wood,[ax,0,az],[ax,h+.1,az],.15);
   for(const yy of [.55,2.65])b.beam(p.band,[ax,yy,az],[bx,yy,bz],.18);
   b.frame(Math.sin(mid)*(r+.03),0,Math.cos(mid)*(r+.03),mid,()=>{
    diamond(b,0,1.55,.02,.43,p.band);diamond(b,0,1.55,.03,.22,cream);
   });
   obstacle(colliders,p,Math.sin(mid)*(r-.1),Math.cos(mid)*(r-.1),r*.24,'felt-wall');
  }
  for(let j=0;j<n;j++){
   const a=j*Math.PI/6,d=(j+1)*Math.PI/6,rr=r+.4;
   b.sheet(j%2?p.cloth:cream,[Math.sin(a)*rr,h,Math.cos(a)*rr],[Math.sin(d)*rr,h,Math.cos(d)*rr],
    [Math.sin(d)*.85,roof,Math.cos(d)*.85],[Math.sin(a)*.85,roof,Math.cos(a)*.85]);
   b.beam(rope,[Math.sin(a)*rr,h+.04,Math.cos(a)*rr],[Math.sin(a)*.85,roof+.05,Math.cos(a)*.85],.055);
  }
  ring(b,wood,0,roof,0,.87,.15);b.cone(p.band,0,roof+.22,0,1.2,.65);
  for(const side of [-1,1]){
   b.block(wood,side*r*.5,0,r*.866,.18,h+.12,.18);
   b.sheet(p.band,[side*r*.5,h,r*.87],[side*r*.35,h,r*.92],[side*r*.42,.3,r*.92],[side*r*.5,.3,r*.87]);
   b.beam(rope,[side*r*.9,h*.8,-r*.25],[side*(r+1.3),.1,-r*.8],.045);
   b.block(darkWood,side*(r+1.3),-.15,-r*.8,.12,.55,.12);
  }
  b.beam(paleWood,[-r*.5,h,r*.866],[r*.5,h,r*.866],.2);
  // A few stored household objects leave the centre and the doorway open.
  rolledFelt(b,-r*.56,.15,-r*.42,p.band);basket(b,r*.52,.1,-r*.42,.55);
  b.block(wood,0,.12,-r*.65,2.7,.5,1.0);b.box(p.band,0,.66,-r*.65,2.8,.12,1.1);
 });
}
function council(b,p,heightAt,colliders){
 const y=heightAt(p.x,p.z),w=p.w/2,d=p.d/2;
 b.frame(p.x,y,p.z,0,()=>{
  b.roof('#c9ba96',0,4.8,0,p.d+1.6,p.w+1.2,2.7,Math.PI/2,cream);
  for(const x of [-w,-w/3,w/3,w])for(const z of [-d,d]){
   if(z===d&&Math.abs(x)<w)continue;
   b.block(wood,x,0,z,.25,5,.25);b.beam(paleWood,[x,3.1,z],[x+(x<0?1.4:-1.4),4.7,z],.15);
   obstacle(colliders,p,x,z,.4,'council-post');
  }
  b.sheet('#a89674',[-w,.2,-d],[w,.2,-d],[w,4.6,-d],[-w,4.6,-d]);
  for(let i=-3;i<=3;i++)diamond(b,i*2.5,2.35,-d-.03,.72,i%2?teal:red);
  b.beam(paleWood,[-w,4.8,d],[w,4.8,d],.22);
  for(let i=-4;i<=4;i++){
   const x=i*1.9;b.sheet(i%2?teal:red,[x-.8,4.8,d+.05],[x+.8,4.8,d+.05],[x+.6,4.0,d+.15],[x-.6,4.0,d+.15]);
   diamond(b,x,4.4,d+.17,.22);
  }
  // The elder's council has standing room for several horse bodies.
  for(const x of [-5.5,5.5]){
   b.block(wood,x,.2,-2.5,2.6,2.0,1.4);b.box(teal,x,2.25,-2.5,2.8,.14,1.6);
   basket(b,x-.5,2.34,-2.5,.3);rolledFelt(b,x+.5,.15,-3.9,red);
   obstacle(colliders,p,x,-2.5,1.6,'council-table');
  }
 });
 for(let x=-w+1;x<w;x+=2)obstacle(colliders,p,x,-d,.9,'council-back');
}
function hearth(b,heightAt,colliders){
 const p=CAMP_HEARTH,y=heightAt(p.x,p.z);
 for(let j=0;j<14;j++){const a=j*Math.PI/7;b.rock(j%2?'#9e9d83':'#7e826e',p.x+Math.cos(a)*2.2,y+.27,p.z+Math.sin(a)*2.2,.48,.37,.44,a);}
 b.cylinder('#59513c',p.x,y+.03,p.z,1.8,.08);
 for(let i=0;i<4;i++)b.beam(darkWood,[p.x-1,y+.16,p.z-.8+i*.5],[p.x+1,y+.25,p.z-.5+i*.5],.22);
 b.rock('#b0733c',p.x,y+.25,p.z,.8,.17,.7);b.rock('#c69d5b',p.x,y+.4,p.z,.4,.15,.36);
 for(const dx of [-3.1,3.1])b.block(wood,p.x+dx,y,p.z,.2,3.1,.2);
 b.beam(wood,[p.x-3.1,y+3.1,p.z],[p.x+3.1,y+3.1,p.z],.18);
 b.beam(iron,[p.x,y+3.1,p.z],[p.x,y+1.1,p.z],.045);b.rock(iron,p.x,y+.98,p.z,.85,.6,.85);
 colliders.push({x:p.x,z:p.z,r:2.6,kind:'hearth'});
}
function wheel(b,x,y,z,r=.8){
 for(let i=0;i<12;i++){const a=i*Math.PI/6,c=(i+1)*Math.PI/6;b.beam(wood,[x+Math.cos(a)*r,y+Math.sin(a)*r,z],[x+Math.cos(c)*r,y+Math.sin(c)*r,z],.14);}
 for(let i=0;i<4;i++){const a=i*Math.PI/4;b.beam(paleWood,[x-Math.cos(a)*r,y-Math.sin(a)*r,z],[x+Math.cos(a)*r,y+Math.sin(a)*r,z],.09);}
 b.rock(iron,x,y,z,.2,.2,.15);
}
function wagon(b,p,heightAt,colliders,index){
 const y=heightAt(p.x,p.z);
 b.frame(p.x,y,p.z,p.yaw,()=>{
  b.block(wood,0,.8,0,3.6,.3,2.5);
  for(const x of [-1.25,1.25])for(const z of [-1.4,1.4])wheel(b,x,.82,z);
  for(const z of [-1.18,1.18])for(let i=0;i<3;i++)b.block(paleWood,0,1.1+i*.23,z,3.5,.13,.1);
  for(const x of [-1.65,1.65])b.block(wood,x,1.1,0,.14,.9,2.4);
  for(const x of [-.8,.8])b.beam(wood,[x,1,1.2],[x,.7,3.2],.16);
  rolledFelt(b,-.7,1.1,.2,index%2?red:teal);basket(b,.7,1.1,-.3,.54);
  if(index===1){for(const x of [-1.3,0,1.3]){
   b.beam(paleWood,[x,1.7,-1.2],[x,2.9,0],.09);b.beam(paleWood,[x,2.9,0],[x,1.7,1.2],.09);
  }b.roof('#b8a786',0,1.7,0,2.6,3.3,1.25,Math.PI/2);}
 });colliders.push({x:p.x,z:p.z,r:2.4,kind:'cart'});
}
function hideFrame(b,p,heightAt,colliders){
 const y=heightAt(p.x,p.z);b.frame(p.x,y,p.z,p.yaw??0,()=>{
  for(const x of [-1.6,1.6]){b.block(wood,x,0,0,.16,3.8,.16);b.beam(wood,[x,2.3,0],[x,.05,-1.3],.12);}
  for(const yy of [.65,3.7])b.beam(paleWood,[-1.6,yy,0],[1.6,yy,0],.14);
  const pts=[[-.8,3.4,.03],[.8,3.4,.03],[1.2,2.7,.03],[.9,1.9,.03],[1.15,1,.03],[.15,.8,.03],[-.8,1.1,.03],[-1.1,2.6,.03]];
  for(let i=0;i<pts.length;i++)b.triangle('#b79970',[0,2,.03],pts[i],pts[(i+1)%pts.length]);
  for(const side of [-1,1])for(const yy of [1.1,1.8,2.5,3.2])b.beam(rope,[side*1.1,yy,.03],[side*1.6,yy,0],.035);
 });colliders.push({x:p.x,z:p.z,r:1.9,kind:'hide-frame'});
}
function crafts(b,heightAt,colliders){
 // Work pieces sit beside, never on, the shared resident speaking/walking lanes.
 for(const [dx,dz,yaw]of [[-25,32,.2],[-24,39,.4]])hideFrame(b,{x:C.x+dx,z:C.z+dz,yaw},heightAt,colliders);
 const kitchen={x:C.x+5,z:C.z+27},ky=heightAt(kitchen.x,kitchen.z);
 b.frame(kitchen.x,ky,kitchen.z,0,()=>{
  for(const x of [-4,4])for(const z of [-2.5,2.5])b.block(wood,x,0,z,.16,4.2,.16);
  b.roof('#bca884',0,4.2,0,5.8,8.8,1.1,Math.PI/2);
  b.block(wood,0,0,0,3.8,2,1.35);b.box(paleWood,0,2.03,0,4.1,.18,1.6);
  for(let i=0;i<3;i++){basket(b,-1.25+i*1.2,2.15,0,.38);b.rock('#cbb98a',-1.25+i*1.2,2.8,0,.29,.14,.25);}
  for(const x of [-2.8,2.8]){basket(b,x,.05,0,.72);rolledFelt(b,x,.1,1.5,red);}
 });colliders.push({...kitchen,r:2.3,kind:'kitchen-table'});
 for(const x of [-4,4])for(const z of [-2.5,2.5])obstacle(colliders,kitchen,x,z,.25,'shade-post');
 const repair={x:C.x+32,z:C.z+19},ry=heightAt(repair.x,repair.z);
 wheel(b,repair.x,ry+.9,repair.z,1.0);b.beam(wood,[repair.x-1.1,ry,repair.z-.5],[repair.x+1.1,ry+1.6,repair.z-.5],.2);
 b.block(wood,repair.x+1.7,ry,repair.z,1.8,1.8,1);b.box(iron,repair.x+1.7,ry+1.9,repair.z,.7,.15,.2);
 colliders.push({...repair,r:1.3,kind:'wheel-repair'});colliders.push({x:repair.x+1.7,z:repair.z,r:1,kind:'workbench'});
 const rack={x:C.x+34,z:C.z-20},by=heightAt(rack.x,rack.z);
 for(const dx of [-1.9,1.9])b.block(wood,rack.x+dx,by,rack.z,.15,3.2,.15);
 b.beam(wood,[rack.x-1.9,by+2.8,rack.z],[rack.x+1.9,by+2.8,rack.z],.15);
 for(let i=0;i<4;i++){
  const x=rack.x-1.3+i*.85,pts=[[x-.2,by+.6,rack.z+.2],[x+.15,by+1.05,rack.z+.4],[x+.25,by+1.6,rack.z+.45],[x+.15,by+2.15,rack.z+.4],[x-.2,by+2.6,rack.z+.2]];
  for(let j=1;j<pts.length;j++)b.beam(paleWood,pts[j-1],pts[j],.055);b.beam(rope,pts[0],pts.at(-1),.016);
 }colliders.push({...rack,r:2,kind:'bow-rack'});
 // Courier bundles, a route tally and dry provisions, not tethering posts.
 const yard={x:C.x-29,z:C.z+12},yy=heightAt(yard.x,yard.z);
 b.block(wood,yard.x,yy,yard.z,3.8,1.8,1.3);rolledFelt(b,yard.x-.9,yy+1.8,yard.z,teal);basket(b,yard.x+1,yy+1.8,yard.z,.4);
 b.beam(paleWood,[yard.x-1.7,yy+2.1,yard.z],[yard.x+1.7,yy+2.1,yard.z],.12);
 colliders.push({...yard,r:2,kind:'courier-table'});
}
function targets(b,heightAt,colliders){
 for(const [i,p]of CAMP_ARCHERY_TARGETS.entries()){
  const y=heightAt(p.x,p.z);b.block(wood,p.x,y,p.z,.18,3.5,.18);
  b.rock('#aa956c',p.x,y+2.2,p.z,1.35,1.35,.28);b.rock('#7b674b',p.x,y+2.2,p.z+.26,.88,.88,.06);b.rock('#d2bb87',p.x,y+2.2,p.z+.32,.36,.36,.05);
  for(const side of [-1,1])b.beam(wood,[p.x+side*.85,y,p.z-.8],[p.x,y+2,p.z],.13);
  for(let j=0;j<3;j++)b.beam(paleWood,[p.x-.4+j*.35,y+2+(j%2)*.25,p.z+.3],[p.x-.3+j*.35,y+2.1+(j%2)*.25,p.z+1.2],.026);
  colliders.push({...p,r:1.4,kind:'archery-target'});
 }
}

function* wornCommons(b,heightAt,terrainSurface){
 // Foot traffic thins the turf irregularly. Close earth/grass tones soften
 // the outer edge without a rectangular platform or a new walking surface.
 const count=18,centre={x:C.x-1,z:C.z+1};
 const ring=scale=>Array.from({length:count},(_,i)=>{
  const a=i*Math.PI*2/count,r=scale*(1+.075*Math.sin(a*3+.4)+.045*Math.cos(a*5));
  return {x:centre.x+Math.cos(a)*17*r,z:centre.z+Math.sin(a)*14*r};
 });
 const inner=ring(.48),middle=ring(.8),outer=ring(1);
 const earth=['#a29c7b','#a59e7d','#a39d7b'],edge=['#a6a47c','#a8a57e','#a5a37b'];
 for(let i=0;i<count;i++){
  const next=(i+1)%count;
  yield* groundFace(b,earth[i%3],[centre,inner[i],inner[next]],heightAt,terrainSurface,.09);
  yield* groundFace(b,earth[(i+1)%3],[inner[i],middle[i],middle[next],inner[next]],heightAt,terrainSurface,.09);
  yield* groundFace(b,edge[i%3],[middle[i],outer[i],outer[next],middle[next]],heightAt,terrainSurface,.09);
 }
}

export function* buildCentaurCamp({root,heightAt,terrainSurface,colliders,metrics}){
 const b=createSceneryBuilder('Yunethre / felt households, council shade and working camp');
 yield* wornCommons(b,heightAt,terrainSurface);
 yield; council(b,CAMP_COUNCIL,heightAt,colliders);metrics.tents++;
 for(const [i,p]of CAMP_SHELTERS.entries()){yield;feltHouse(b,p,heightAt,colliders,i);metrics.tents++;}
 yield;hearth(b,heightAt,colliders);crafts(b,heightAt,colliders);targets(b,heightAt,colliders);
 for(const [i,p]of CAMP_WAGONS.entries()){yield;wagon(b,p,heightAt,colliders,i);metrics.wagons++;}
 for(const [dx,dz,tint]of [[-24,-19,red],[16,-11,teal]])banner(b,{x:C.x+dx,z:C.z+dz},heightAt,{tint});
 // Small trail markers sit beyond the encounter's traversable radius. The
 // meadow itself keeps its natural grass and slope, with no coloured arena.
 for(const angle of [.25,1.15,2.15,3.05,4.05]){
  const p={x:CENTAUR_BATTLEFIELD.x+Math.cos(angle)*43,z:CENTAUR_BATTLEFIELD.z+Math.sin(angle)*43};
  if(angle===1.15||angle===3.05)banner(b,p,heightAt,{height:2.7,tint:teal});
  else for(let j=0;j<3;j++)b.rock(j%2?'#b2af90':'#92967b',p.x+j*.35,heightAt(p.x,p.z)+.15,p.z+(j%2)*.35,.4,.2,.36,j);
 }
 metrics.hearths=1;metrics.campWorkplaces=6;metrics.archeryTargets=3;metrics.councilShelters=1;
 yield* b.finishSteps(root);
}
