/** A sea-level drowned nave, dry inhabited upper galleries and a secret inspection store.
 * Only an explicit portal activates these floors; surface height and sea queries stay separate. */
import * as THREE from 'three';
import {createSceneryBuilder} from '../../../world/scenery/scenery-builder.js';
import {SEA_LEVEL} from '../../../world/terrain/region-world.js';
export const SEVRON_ORIGIN=Object.freeze({x:-3500,y:0,z:-1183});
const rect=(id,x,z,w,d,y,h=12)=>Object.freeze({id,x,z,w,d,y,h});
export const SEVRON_ROOMS=Object.freeze([
 rect('entrance',0,39,12,18,8,9),rect('south-gallery',0,28,70,10,8,21),
 rect('west-gallery',-30,-5,10,58,8,21),rect('east-gallery',30,-5,10,58,8,21),
 rect('north-gallery',0,-32,70,10,8,21),rect('upper-court',0,-68,76,36,14,14),
 rect('inspection-passage',41,10,18,5,8,6),rect('sealed-store',55,10,15,20,8,9),
 rect('spring-court',-50,-69,24,26,14,16),
]);
const ramp=rect('stair',0,-44,8,17,8,15),all=[...SEVRON_ROOMS,ramp];
const inside=(r,x,z,margin=0)=>Math.abs(x-r.x)<=r.w/2-margin&&Math.abs(z-r.z)<=r.d/2-margin;
const solids=[...[-18,0,18].flatMap(z=>[-1,1].map(s=>({x:s*25,z,w:.25,d:17,y:8,h:1.2}))),
 {x:0,z:22.85,w:49,d:.25,y:8,h:1.2},
 ...[-1,1].map(s=>({x:s*16.4,z:-27.05,w:24.8,d:.22,y:8,h:1.2})),
 ...[-26,-13,13,26].flatMap(x=>[-79,-57].map(z=>({x,z,w:1.6,d:1.6,y:14,h:12}))),
 {x:0,z:-79,w:7,d:3,y:14,h:.6},
 ...[-22,22].map(x=>({x,z:-66,w:4.2,d:2.5,y:14,h:1.1})),
 {x:-50,z:-69,w:5,d:5,y:14,h:.65},
 {x:58,z:10,w:2,d:2,y:8,h:1.1},
];
export const SEVRON_STOPS=Object.freeze([
 {id:'watcher',name:'Elven watcher',x:-5,z:29,guard:true},
 {id:'keeper',name:'Gallery keeper',x:7,z:-62},
 {id:'resident',name:'Sevron resident',x:26,z:-69},
 {id:'gardener',name:'Terrace tender',x:-45,z:-72},
]);
export function createSevronWalk({secretOpen=()=>false}={}){
 const floorLocal=(x,z)=>{if(inside(ramp,x,z))return 8+6*Math.max(0,Math.min(1,(-z-35.5)/17));for(const r of SEVRON_ROOMS)if(inside(r,x,z))return r.y;return null;};
 function clear(x,z,r=.34,eyeY=null){const floor=floorLocal(x,z);if(floor===null)return false;
  for(let i=0;i<8;i++)if(floorLocal(x+Math.cos(i*Math.PI/4)*r,z+Math.sin(i*Math.PI/4)*r)===null)return false;
  const low=eyeY===null?floor+.02:eyeY-r,high=eyeY===null?floor+1.8:eyeY+r;
  const block=[...solids,...(!secretOpen()?[{x:40,z:10,w:.6,d:5,y:8,h:6}]:[])];
  return !block.some(s=>low<s.y+s.h&&high>s.y&&Math.hypot(Math.max(0,Math.abs(x-s.x)-s.w/2),Math.max(0,Math.abs(z-s.z)-s.d/2))<r);
 }
 const local=p=>({x:p.x-SEVRON_ORIGIN.x,z:p.z-SEVRON_ORIGIN.z});
 const toWorld=p=>({x:SEVRON_ORIGIN.x+p.x,z:SEVRON_ORIGIN.z+p.z,y:floorLocal(p.x,p.z)??8});
 return {origin:SEVRON_ORIGIN,toWorld,spawn:toWorld({x:0,z:40}),exit:toWorld({x:0,z:45}),
 floorAt:(x,z)=>floorLocal(x-SEVRON_ORIGIN.x,z-SEVRON_ORIGIN.z),
 // Flood level is never used as the walking floor of a gallery above it.
 waterAt:(x,z,y)=>{const p=local({x,z});return Math.abs(p.x)<24&&p.z>-27&&p.z<23&&y<SEA_LEVEL+1?SEA_LEVEL:null;},
 canStand:(x,z)=>{const p=local({x,z});return clear(p.x,p.z);},
 move(p,dx,dz){const n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.2));for(let i=0;i<n;i++){const q=local(p),sx=dx/n,sz=dz/n;if(clear(q.x+sx,q.z+sz)){p.x+=sx;p.z+=sz;}else if(clear(q.x+sx,q.z))p.x+=sx;else if(clear(q.x,q.z+sz))p.z+=sz;}p.y=floorLocal(p.x-SEVRON_ORIGIN.x,p.z-SEVRON_ORIGIN.z)??p.y;return p;},
 camera(p,yaw,pitch=.35){const focus={x:p.x,y:p.y+1.25,z:p.z};let target={...focus};for(let d=.25;d<=8;d+=.15){const x=focus.x+Math.sin(yaw)*d*Math.cos(pitch),z=focus.z+Math.cos(yaw)*d*Math.cos(pitch),y=focus.y+Math.sin(pitch)*d,q=local({x,z}),r=all.filter(r=>inside(r,q.x,q.z));if(!r.length||y>Math.min(...r.map(r=>r.y+r.h))-.4||!clear(q.x,q.z,.12,y))break;target={x,y,z};}return {target,lookAt:focus};},
 };
}
export function buildSevronInterior(parent,{walk=createSevronWalk()}={}){
 const group=new THREE.Group();group.name='Sevron: living galleries above the drowned capital';parent.add(group);
 const b=createSceneryBuilder('Sevron stone piers and timber galleries'),stone='#697674',trim='#a8b19d',dark='#334744',wood='#796044',light='#b49d72';
 // The rock enclosure lies outside every walkable room. It also stops distant
 // outdoor ocean, foliage and surface meshes from showing through high vault gaps.
 for(const z of [-89,50])b.block(dark,0,-14,z,142,112,2);
 for(const x of [-70,70])b.block(dark,x,-14,-19.5,2,112,141);
 // Every navigable slab is explicit; a huge water-filled absence occupies the centre.
 for(const r of SEVRON_ROOMS){b.block(stone,r.x,r.y-.65,r.z,r.w,.65,r.d);if(r.id!=='spring-court')b.block(stone,r.x,r.y+r.h,r.z,r.w,.8,r.d);
  for(let x=r.x-r.w/2+1;x<r.x+r.w/2;x+=2.4)for(let z=r.z-r.d/2+1;z<r.z+r.d/2;z+=2.4)b.box(trim,x,r.y+.007,z,2.32,.012,2.32);
 }
 b.sheet(trim,[-4,8,-35.5],[4,8,-35.5],[4,14,-52.5],[-4,14,-52.5]);
 for(let i=0;i<24;i++){const z=-35.5-i*17/24,y=8+i*6/24;b.box(dark,0,y+.018,z,7.9,.035,.06);}
 b.block(stone,0,-13,-2,70,1,58);
 // The basin's retaining walls keep outside sea geometry and distant terrain
 // from showing through the cavity beneath the elevated galleries.
 for(const z of [-28,24])b.block(stone,0,-13,z,70,21,1);
 for(const x of [-35,35])b.block(stone,x,-13,-2,1,21,52);
 // Below sea level are streets and broad domestic doorways, not another dry town.
 for(const x of [-19,19])for(const z of [-20,-8,4,16]){
  b.block(dark,x,-12,z,9,12.6,7);b.block(trim,x,.6,z,9.5,.35,7.5);b.block(trim,x,-12,z+3.55,8.5,.7,.3);
  for(const side of [-1,1])b.block(trim,x+side*3.1,-12,z+3.6,.6,8,.45);
  b.block('#263c3b',x,-10,z+3.58,3.4,5,.06);b.block(trim,x,-4,z+3.55,8,.8,.5);
 }
 // Massive ancient piers rise through the sea to the vault, with uneven broken ones.
 for(const x of [-22,22])for(const z of [-22,-7,9,24]){
  b.block(stone,x,-12,z,3.2,40,3.2);b.block(trim,x,7.1,z,3.8,.8,3.8);
  for(const h of [-8,-2,4,15,23])b.block(trim,x,h,z,3.4,.18,3.4);
 }
 for(const z of [-20,-3,14])for(const s of [-1,1]){
  b.beam(trim,[s*22,23,z],[s*12,32,z],1.4,1.2);b.beam(trim,[s*12,32,z],[0,35,z],1.2,1.2);
 }
 b.block(stone,0,35,-2,72,1,63);
 // The retained outer shell; openings are intentionally only at connected floors.
 b.block(stone,-35,8,-5,1,21,58);
 for(const [z,d] of [[-13.25,41.5],[18.25,11.5]])b.block(stone,35,8,z,1,21,d);
 for(const side of [-1,1])b.block(stone,side*21,8,33,28,21,1);
 for(const x of [-8,8])b.block(stone,x,8,40,2,9,18);
 b.block(stone,0,8,48,18,9,.8);
 for(const z of [-86,-50])for(const [x,w]of z===-50?[[-21,34],[21,34]]:[[0,76]])b.block(stone,x,14,z,w,14,.8);
 b.block(stone,38,14,-68,.8,14,36);
 for(const z of [-82,-56])b.block(stone,-50,14,z,24,16,.8);b.block(stone,-62,14,-69,.8,16,27);
 for(const z of [7.5,12.5])b.block(stone,43,8,z,19,6,.5);
 for(const z of [0,20])b.block(stone,55,8,z,15,9,.7);b.block(stone,62.5,8,10,.7,9,20);
 for(const s of solids){
  if(s.h<1.3&&(s.w>12||s.d>12)){
   // Air between the rails keeps the drowned streets visible from the gallery.
   b.block(wood,s.x,s.y+.35,s.z,s.w,.12,s.d);b.block(light,s.x,s.y+1.08,s.z,s.w,.12,s.d);
   const alongX=s.w>s.d,length=Math.max(s.w,s.d),steps=Math.ceil(length/3.5);
   for(let i=0;i<=steps;i++){const d=-length/2+i*length/steps;b.block(wood,s.x+(alongX?d:0),s.y,s.z+(alongX?0:d),.15,1.2,.15);}
  }else b.block(s.h<2?wood:stone,s.x,s.y,s.z,s.w,s.h,s.d);
 }
 // Repairs are slender timber fitted around deep dwarf stone.
 for(const x of [-24.9,24.9])for(let z=-24;z<=21;z+=3.5){b.block(light,x,8,z,.11,1.15,.11);b.beam(light,[x,9.1,z],[x,9.1,z+3.5],.1);}
 for(const x of [-28,-14,14,28]){
  b.frame(x,14,-85.45,0,()=>{b.block(wood,0,0,.06,10,7,.25);b.block(dark,0,0,.25,2.3,3.7,.15);
   for(const s of [-1,1]){b.block(light,s*1.3,0,.3,.18,4.2,.18);b.block('#cfb874',s*3,2.2,.31,1.7,2,.08);b.block(wood,s*3,3.1,.37,.08,2,.03);}
   b.beam(light,[-1.4,4.1,.3],[0,5.1,.3],.18);b.beam(light,[0,5.1,.3],[1.4,4.1,.3],.18);b.block(light,0,6.6,.3,10,.17,.2);
  });
 }
 // A shared gathering seat, quiet authority rather than a new named monarch.
 b.block(trim,0,14,-79,7,.6,3);for(const x of [-2,0,2]){b.block(wood,x,14.6,-79,1.3,.5,1);b.block(light,x,15.1,-79.4,1.3,2,.16);}
 for(const x of [-22,22]){b.block(light,x,15,-66,4.2,.13,2.5);for(let i=0;i<4;i++)b.cylinder('#b0ae86',x-1.4+i*.9,15.13,-66,.18,.25);}
 // Daylight shaft, real soil and freshwater rill above the saltwater nave.
 b.block('#475d3d',-50,14,-69,5,.35,5);for(let i=0;i<12;i++)b.rock('#768e50',-51.7+(i%4)*1.1,14.6,-70.5+Math.floor(i/4)*1.3,.43,.46,.45);
 b.block('#758e85',-58,14.05,-69,.8,.1,21);b.block(trim,-59,14,-69,.35,.4,21);
 for(const x of [-61,-39])b.block(stone,x,30,-69,1,65,26);
 // Side chamber tools and damaged civic inscriptions remain after the coins are taken.
 b.block(stone,58,8,10,2,1.1,2);
 for(const z of [3,17]){b.block(trim,55,8,z,9,.8,1.6);for(let j=0;j<5;j++){const x=51.5+j*1.6;b.box('#8b9588',x,8.88,z,.16,.08,1);b.box(wood,x,8.9,z+.42,.3,.12,.3);}}
 b.block(dark,61.99,10,10,.03,4,10);
 for(let row=0;row<6;row++)for(let col=0;col<8;col++){const z=6+col,y=10.5+row*.45;b.beam(trim,[61.95,y,z],[61.95,y+.22,z+.35],.045);}
 // A breached channel under the western gallery carries the same level as the sea.
 b.block(dark,-35,-12,-6,1,20,30);
 for(const z of [-19,7])b.block(trim,-35,-9,z,1.1,13,2.2);
 b.block(trim,-35,4,-6,1.1,2,28);
 const mesh=b.finish(group);mesh.position.set(SEVRON_ORIGIN.x,0,SEVRON_ORIGIN.z);
 const water=new THREE.Mesh(new THREE.PlaneGeometry(48,50),new THREE.MeshStandardMaterial({color:0x205052,transparent:true,opacity:.78,roughness:.26,metalness:.2,side:THREE.DoubleSide}));
 water.rotation.x=-Math.PI/2;water.position.set(SEVRON_ORIGIN.x,SEA_LEVEL,SEVRON_ORIGIN.z-2);group.add(water);
 const ambient=new THREE.AmbientLight(0xa0bab0,1.8);group.add(ambient);
 for(const [x,z,y] of [[-29,20,12],[29,-15,12],[0,-65,19],[-48,-68,22],[55,8,12]]){const l=new THREE.PointLight(0xffd29a,95,38,1.6);l.position.set(SEVRON_ORIGIN.x+x,y,SEVRON_ORIGIN.z+z);group.add(l);}
 const door=new THREE.Mesh(new THREE.BoxGeometry(.5,6,4.9),new THREE.MeshStandardMaterial({color:0x6d7771,roughness:1}));door.position.set(SEVRON_ORIGIN.x+40,11,SEVRON_ORIGIN.z+10);group.add(door);
 const chest=new THREE.Mesh(new THREE.BoxGeometry(1.8,1,1.3),new THREE.MeshStandardMaterial({color:0x9d8150,roughness:.7}));chest.position.set(SEVRON_ORIGIN.x+58,9.5,SEVRON_ORIGIN.z+10);group.add(chest);
 return {group,walk,water,door,chest,setSecretOpen:v=>{door.visible=!v;},setTaken:v=>{chest.visible=!v;}};
}
