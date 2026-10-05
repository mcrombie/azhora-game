import * as THREE from 'three';
import {createSceneryBuilder} from './scenery-builder.js';
import {URUBOND} from './urubond-world.js';
const F=Object.freeze;
const room=(id,name,x,z,w,d,h=18)=>F({id,name,x,z,w,d,y:-18,h});
export const URUBOND_ROOMS=F([
 room('entry','The Buried Threshold',0,148,16,28,10),
 room('vestibule','Hall of the Unlit Watch',0,82,38,38,22),
 room('nave','The Pillared Abyss',0,-7,58,112,46),
 room('forge','The Silent Forges',-94,-13,56,68,28),
 room('cistern','The Dry Cisterns',94,-13,56,68,24),
 room('throne','The Crownless Vault',0,-121,64,50,38),
 room('archive','The Sealed Archive',94,-113,56,54,22),
 room('ossuary','The Thousand Empty Niches',-94,-113,56,54,22),
 room('west-barracks','The Western Barracks',-94,91,56,54,20),
 room('east-barracks','The Eastern Barracks',94,91,56,54,20),
 room('south-vault','The Deep Reservoir',-25,216,80,50,30),
]);
const passages=F([
 room('entry-stair','The Long Descent',0,116,10,40,12),
 room('nave-passage','The Processional Way',0,56,12,24,16),
 room('throne-passage','The Black Axis',0,-80,12,40,18),
 ...[-1,1].flatMap(s=>[
  room('cross-'+s,'The Cross Gallery',s*48,-7,44,10,14),
  room('north-'+s,'The Northern Gallery',s*94,-65,10,52,14),
  room('south-'+s,'The Southern Gallery',s*94,44,10,52,14),
  room('upper-'+s,'The Vault Gallery',s*48,-121,44,10,14),
  room('lower-'+s,'The Guard Gallery',s*49,82,62,10,14),
 ]),
 room('reservoir-way','The Submerged Works',-54,156,10,82,13),
 room('reservoir-cross','The Lower Gallery',-75,114,44,10,13),
]);
export const URUBOND_FLOORS=F([...URUBOND_ROOMS,...passages]);
const inside=(r,x,z,pad=0)=>Math.abs(x-r.x)<=r.w/2+pad&&Math.abs(z-r.z)<=r.d/2+pad;
const at=(x,z)=>URUBOND_FLOORS.find(r=>inside(r,x,z));
// Floors are deliberately one connected accessible level, deep below the sea.
export const URUBOND_INTERIOR_ORIGIN=F({x:URUBOND.x,y:-100,z:URUBOND.z});
const pillars=[...[-19,19].flatMap(x=>[-46,-23,0,23].map(z=>({x,z,w:3.8,d:3.8,h:42}))),
 ...[-22,22].flatMap(x=>[-136,-111].map(z=>({x,z,w:3.2,d:3.2,h:34})))];
const solids=[...pillars,
 ...pillars.map(p=>({...p,w:p.w+1.6,d:p.d+1.6,h:1.3})),
 ...[-1,1].flatMap(s=>[-32,-10,12].map(z=>({x:-94+s*20,z,w:7,d:10,h:7}))),
 {x:0,z:-140,w:16,d:6,h:1.2},
 ...[-1,1].map(s=>({x:94+s*17,z:-13,w:10,d:44,h:1.4})),
 ...[-53,3].flatMap(x=>[201,216,231].map(z=>({x,z,w:3,d:3,h:26}))),
 ...[-94,94].flatMap(cx=>[-1,1].flatMap(side=>[73,82,91,100,109].map(z=>({x:cx+side*22,z,w:5,d:5,h:.78})))),
];
// Trim the lower passage roofs at taller halls instead of leaving slabs suspended
// inside the hall. Rectangle subtraction preserves exact doorway edges.
function ceilingPieces(r){
 let pieces=[{x0:r.x-r.w/2,x1:r.x+r.w/2,z0:r.z-r.d/2,z1:r.z+r.d/2}];
 for(const other of URUBOND_FLOORS){if(other.h<=r.h)continue;
  const cut={x0:other.x-other.w/2,x1:other.x+other.w/2,z0:other.z-other.d/2,z1:other.z+other.d/2};
  pieces=pieces.flatMap(p=>{const x0=Math.max(p.x0,cut.x0),x1=Math.min(p.x1,cut.x1),z0=Math.max(p.z0,cut.z0),z1=Math.min(p.z1,cut.z1);
   if(x0>=x1||z0>=z1)return [p];
   return [{...p,x1:x0},{...p,x0:x1},{x0,x1,z0:p.z0,z1:z0},{x0,x1,z0:z1,z1:p.z1}].filter(a=>a.x1>a.x0&&a.z1>a.z0);
  });
 }return pieces;
}
// Boundary faces are generated from the same union of rectangles as collision.
// Doorways exist only where two floors join, avoiding decorative sealed connections.
export const URUBOND_WALLS=F(URUBOND_FLOORS.flatMap(r=>{
 const result=[];for(const axis of ['x','z'])for(const s of [-1,1]){
  const length=axis==='x'?r.w:r.d,steps=Math.ceil(length/2),step=length/steps;
  for(let i=0;i<steps;i++){const along=-length/2+(i+.5)*step,x=r.x+(axis==='x'?along:s*r.w/2),z=r.z+(axis==='z'?along:s*r.d/2);
   const nx=x+(axis==='z'?s*.15:0),nz=z+(axis==='x'?s*.15:0);
   if(URUBOND_FLOORS.some(other=>other!==r&&inside(other,nx,nz)))continue;
   result.push({x,z,w:axis==='x'?step:.6,d:axis==='z'?step:.6,h:r.h});
  }
 }return result;
}));
export function createUrubondWalk(){
 const o=URUBOND_INTERIOR_ORIGIN,fy=o.y-18;
 const obstacles=[...solids,...URUBOND_WALLS];
 const clear=(x,z,r=.34,y=fy+.02)=>{
  if(!at(x,z))return false;
  for(let i=0;i<8;i++)if(!at(x+Math.cos(i*Math.PI/4)*r,z+Math.sin(i*Math.PI/4)*r))return false;
  return !obstacles.some(s=>y<fy+s.h&&Math.hypot(Math.max(0,Math.abs(x-s.x)-s.w/2),Math.max(0,Math.abs(z-s.z)-s.d/2))<r);
 };
 const toWorld=p=>({x:o.x+p.x,z:o.z+p.z,y:fy});
 return {origin:o,toWorld,spawn:toWorld({x:0,z:148}),exit:toWorld({x:0,z:157}),
  floorAt:(x,z)=>at(x-o.x,z-o.z)?fy:null,
  canStand:(x,z)=>clear(x-o.x,z-o.z),
  move(p,dx,dz){const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.2));for(let i=0;i<steps;i++){const x=p.x-o.x,z=p.z-o.z,sx=dx/steps,sz=dz/steps;if(clear(x+sx,z+sz)){p.x+=sx;p.z+=sz;}else if(clear(x+sx,z))p.x+=sx;else if(clear(x,z+sz))p.z+=sz;}p.y=fy;return p;},
  camera(p,yaw,pitch=.3){const focus={x:p.x,y:p.y+1.4,z:p.z};let target={...focus};for(let d=.2;d<=8;d+=.2){const x=focus.x+Math.sin(yaw)*d*Math.cos(pitch),z=focus.z+Math.cos(yaw)*d*Math.cos(pitch),y=Math.max(fy+.3,focus.y+Math.sin(pitch)*d),r=at(x-o.x,z-o.z);if(!r||y>fy+r.h-.5||!clear(x-o.x,z-o.z,.16,y))break;target={x,y,z};}return {target,lookAt:focus};},
 };
}
export function buildUrubondInterior(parent){
 const group=new THREE.Group();group.name='Urubond: the fortress beneath the island';group.position.set(URUBOND.x,-118,URUBOND.z);parent.add(group);
 const b=createSceneryBuilder('Urubond: obsidian halls and basalt vaults'),stone='#454650',trim='#897880',iron='#24252d',accent='#8a6552';
 for(const r of URUBOND_FLOORS){b.block(stone,r.x,-1,r.z,r.w,1,r.d);
  for(const p of ceilingPieces(r))b.block(iron,(p.x0+p.x1)/2,r.h,(p.z0+p.z1)/2,p.x1-p.x0,1,p.z1-p.z0);
  for(let x=r.x-r.w/2+2;x<r.x+r.w/2;x+=4)for(let z=r.z-r.d/2+2;z<r.z+r.d/2;z+=4)b.box((Math.round(x+z)%3)?'#424049':'#4c4650',x,.006,z,3.94,.01,3.94);
 }
 for(const r of URUBOND_FLOORS)for(const axis of ['x','z'])for(const side of [-1,1]){
  const len=axis==='x'?r.w:r.d,n=Math.ceil(len/2),step=len/n;
  for(let i=0;i<n;i++){const along=-len/2+(i+.5)*step,x=r.x+(axis==='x'?along:side*r.w/2),z=r.z+(axis==='z'?along:side*r.d/2);
   const nx=x+(axis==='z'?side*.15:0),nz=z+(axis==='x'?side*.15:0),neighbors=URUBOND_FLOORS.filter(o=>o!==r&&inside(o,nx,nz));
   if(neighbors.length){const h=Math.max(...neighbors.map(o=>o.h));if(h<r.h)b.block(stone,x,h,z,axis==='x'?step:.6,r.h-h,axis==='z'?step:.6);}
  }
 }
 for(const w of URUBOND_WALLS){b.block(stone,w.x,0,w.z,w.w,w.h,w.d);for(const y of [.3,5,w.h-1])b.block(trim,w.x,y,w.z,w.w+.1,.2,w.d+.1);
  for(let y=2.5;y<w.h-2;y+=2.5)b.block('#303039',w.x,y,w.z,w.w+.015,.025,w.d+.015);
 }
 for(const p of pillars){b.block(iron,p.x,0,p.z,p.w+1.6,1.3,p.d+1.6);b.cylinder(stone,p.x,1.3,p.z,p.w*.7,p.h-1.3,Math.PI/8);for(const y of [2,9,22,p.h-2])b.block(trim,p.x,y,p.z,p.w+.4,.5,p.d+.4);}
 // Repeated pointed ribs give the central hall its enormous scale.
 for(const z of [-46,-23,0,23])for(const s of [-1,1]){b.beam(trim,[s*19,32,z],[s*10,42,z],1.8);b.beam(trim,[s*10,42,z],[0,45,z],1.6);}
 for(const z of [-136,-111])for(const s of [-1,1])b.beam(trim,[s*22,28,z],[0,37,z],1.8);
 // Empty furnaces: infrastructure only, no inhabitants or implied active armies.
 for(const s of [-1,1])for(const z of [-32,-10,12]){const x=-94+s*20;b.block(iron,x,0,z,7,7,10);b.block('#17141b',x-s*3.51,1,z,.03,4,5);b.block(accent,x,6.7,z,7.3,.3,10.3);b.cylinder(stone,x,7,z,1.7,18);}
 for(const x of [77,111]){b.block(trim,x,0,-13,10,1.4,44);b.block('#20252c',x,1.41,-13,8,.03,41);}
 // Niches and racks are cut into empty walls, with generous clear central aisles.
 for(const cx of [-94,94])for(const s of [-1,1])for(let z=-134;z<=-94;z+=6){b.block(iron,cx+s*25,1,z,2,12,4.4);for(const y of [1,4,7,10,13])b.block(trim,cx+s*24.8,y,z,2.5,.18,4.7);}
 for(const cx of [-94,94])for(const side of [-1,1])for(let z=73;z<=109;z+=9){b.block(iron,cx+side*22,0,z,5,.6,5);b.block(trim,cx+side*22,.6,z,5,.18,5);}
 b.block(trim,0,0,-140,16,1.2,6);b.block(iron,0,1.2,-141,8,12,2);b.block(accent,0,1.3,-139.8,7,.16,.3);
 // A vast dry reservoir with ribs and a raised inspection walkway at its edges.
 for(const x of [-53,3])for(const z of [201,216,231]){b.block(stone,x,0,z,3,26,3);for(const s of [-1,1])b.beam(trim,[x,22,z],[x+s*10,29,z],.8);}
 b.block('#20222c',-25,.02,216,40,.03,35);
 b.finish(group);
 const seams=createSceneryBuilder('Urubond: old furnace seams');
 for(const r of URUBOND_ROOMS){for(const s of [-1,1]){seams.block('#b05231',r.x+s*(r.w/2-.8),2.2,r.z,.12,2.7,.4);seams.block('#bf6741',r.x+s*(r.w/2-.8),2.2,r.z+.15,.14,.1,.45);}}
 const glow=seams.finish(group);glow.material=new THREE.MeshBasicMaterial({vertexColors:true});
 group.add(new THREE.AmbientLight(0x9b9eaf,3.3));
 // Only two local lights, moved to the player's hall, keep the huge interior cheap.
 const lights=[new THREE.PointLight(0xf19b68,130,48,1.5),new THREE.PointLight(0xa5afb9,90,42,1.5)];lights.forEach(l=>group.add(l));
 return {group,walk:createUrubondWalk(),rooms:URUBOND_ROOMS,
  update(p){const x=p.x-URUBOND.x,z=p.z-URUBOND.z;lights[0].position.set(x-6,8,z-5);lights[1].position.set(x+8,10,z+12);},
 };
}
