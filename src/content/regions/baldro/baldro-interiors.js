/** Instanced, enclosed hold interiors. Surface terrain remains intact.
 * Portal transitions explicitly acquire this floor; sharing x/z with a mountain
 * never gives a surface traveler underground support. */
import * as THREE from 'three';
import {createSceneryBuilder} from '../../../world/scenery/scenery-builder.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const rooms=[
  {id:'gate-hall',x:0,z:25,w:12,d:16,y:0,h:7},
  {id:'commons',x:0,z:0,w:32,d:34,y:0,h:13},
  {id:'hearth-district',x:-31,z:0,w:24,d:30,y:0,h:9},
  {id:'work-district',x:31,z:0,w:24,d:30,y:0,h:10},
  {id:'abandoned-district',x:-31,z:-34,w:24,d:26,y:0,h:8},
  {id:'memory-hall',x:0,z:-44,w:30,d:20,y:4,h:9},
];
const passages=[
  {x:-17.5,z:0,w:7,d:6,y:0,h:7}, {x:17.5,z:0,w:7,d:6,y:0,h:7},
  {x:-31,z:-18,w:6,d:8,y:0,h:7},
  {x:0,z:-25.5,w:8,d:19,y:0,h:8,ramp:true},
];
const portals={
  'gate-hall':{north:[0,10]}, commons:{south:[0,10],north:[0,8],west:[0,6],east:[0,6]},
  'hearth-district':{east:[0,6],north:[-31,6]}, 'work-district':{west:[0,6]},
  'abandoned-district':{south:[-31,6]}, 'memory-hall':{south:[0,8]},
};
const pillars=[[-11,-10],[11,-10],[-11,10],[11,10],[-10,-43],[10,-43]];
function wallParts(r,side){
  const horizontal=side==='north'||side==='south',length=horizontal?r.w:r.d;
  const center=horizontal?r.x:r.z,at=horizontal?r.z+(side==='north'?-1:1)*r.d/2:r.x+(side==='west'?-1:1)*r.w/2;
  const opening=portals[r.id]?.[side],parts=[];
  const part=(lo,hi)=>{if(hi-lo<.05)return;const mid=(lo+hi)/2;
    parts.push({x:horizontal?mid:at,z:horizontal?at:mid,y:r.y,w:horizontal?hi-lo:.75,d:horizontal?.75:hi-lo,h:r.h});};
  if(opening){const[c,width]=opening;part(center-length/2,c-width/2);part(c+width/2,center+length/2);
    parts.push({x:horizontal?c:at,z:horizontal?at:c,y:r.y+5.7,w:horizontal?width:.9,d:horizontal?.9:width,h:r.h-5.7,lintel:true});
  }else part(center-length/2,center+length/2);
  return parts;
}
const passageWalls=passages.flatMap(r=>[-1,1].map(side=>r.w>r.d
  ? {x:r.x,z:r.z+side*r.d/2,y:r.y,w:r.w,d:.6,h:r.h}
  : {x:r.x+side*r.w/2,z:r.z,y:r.y,w:.6,d:r.d,h:r.h}));
// The collision footprints match the wall thickness and the major furnishings,
// including low plinths. Small tabletop objects do not need separate colliders.
const furnishings=[
  ...pillars.map(([x,z])=>({x,z,y:z<-30?4:0,w:2.6,d:2.6,h:z<-30?8.5:12.5})),
  ...[-7,7].flatMap(x=>[{x,z:3,y:0,w:2.5,d:5,h:.85},...[-1.8,1.8].map(dx=>({x:x+dx,z:3,y:0,w:.6,d:5,h:.45}))]),
  ...[-10,0,10].flatMap(z=>[{x:-42,z,y:0,w:.4,d:1.9,h:2.5},{x:-36,z:z-1,y:0,w:2,d:.6,h:.5}]),
  {x:-25,z:-9,y:0,w:3.5,d:2.4,h:2.6},{x:-32,z:10,y:0,w:5,d:2,h:.85},
  {x:39,z:-7,y:0,w:5,d:3,h:3},{x:40,z:11,y:0,w:4,d:2,h:.9},
  ...[-7,0,8].map(z=>({x:26,z,y:0,w:3.8,d:1.8,h:1.4})),
  {x:39,z:7,y:0,w:3.4,d:3.4,h:1},
  ...[-3,-2,-1,0,1,2,3].map(i=>({x:i*3.6,z:-51,y:4,w:1.8,d:1.3,h:Math.abs(i)===1?3.8:2.4})),
  ...[-43,-34,-25].map(z=>({x:-38,z:z+1,y:0,w:3.6,d:2.6,h:1})),
  {x:-23,z:-43,y:0,w:5,d:2,h:1.3},{x:0,z:32.8,y:0,w:5,d:.3,h:5},
];
const solids=[...rooms.flatMap(r=>['north','south','west','east'].flatMap(side=>wallParts(r,side))),...passageWalls,...furnishings];
export const BALDRO_INTERIOR_ROOMS=Object.freeze(rooms.map(r=>Object.freeze({...r})));
export const BALDRO_INTERIOR_SPAWN=Object.freeze({x:0,z:27});
export const BALDRO_INTERIOR_EXIT=Object.freeze({x:0,z:31});
export const BALDRO_INTERIOR_STOPS=Object.freeze([
  {id:'hearth',name:'Hearth keeper',x:-28,z:5,variant:1,role:'resident'},
  {id:'smith',name:'Hold artisan',x:29,z:5,variant:2,role:'artisan'},
  {id:'archivist',name:'Hall keeper',x:6,z:-43,variant:3,role:'resident'},
  {id:'neighbor',name:'Hold resident',x:-36,z:-3,variant:4,role:'resident'},
]);
function inside(r,x,z,margin=0){return Math.abs(x-r.x)<=r.w/2-margin&&Math.abs(z-r.z)<=r.d/2-margin;}
function localFloor(x,z){
  const ramp=passages.find(r=>r.ramp&&inside(r,x,z));
  if(ramp)return clamp((-z-17)/17,0,1)*4;
  for(const r of [...rooms,...passages])if(inside(r,x,z))return r.y;
  return null;
}
function clear(x,z,r=.34,eyeY=null){
  const floor=localFloor(x,z);if(floor===null)return false;
  for(let i=0;i<8;i++)if(localFloor(x+Math.cos(i*Math.PI/4)*r,z+Math.sin(i*Math.PI/4)*r)===null)return false;
  const low=eyeY===null?floor+.02:eyeY-r,high=eyeY===null?floor+1.8:eyeY+r;
  return !solids.some(s=>low<s.y+s.h&&high>s.y
    &&Math.hypot(Math.max(0,Math.abs(x-s.x)-s.w/2),Math.max(0,Math.abs(z-s.z)-s.d/2))<r);
}
export function createBaldroInteriorWalk(kingdom){
  const origin={x:kingdom.gate.x,y:kingdom.gate.y-180,z:kingdom.gate.z},mirror=kingdom.id==='east-baldro'?-1:1;
  const toWorld=p=>({x:origin.x+p.x*mirror,z:origin.z+p.z,y:origin.y+(localFloor(p.x,p.z)??0)});
  return {origin,toWorld,spawn:toWorld(BALDRO_INTERIOR_SPAWN),exit:toWorld(BALDRO_INTERIOR_EXIT),
    floorAt:(x,z)=>{const y=localFloor((x-origin.x)*mirror,z-origin.z);return y===null?null:y+origin.y;},
    canStand:(x,z)=>clear((x-origin.x)*mirror,z-origin.z),
    move(position,dx,dz){
      const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.22));
      for(let i=0;i<steps;i++){
        const x=(position.x-origin.x)*mirror,z=position.z-origin.z,sx=dx/steps*mirror,sz=dz/steps;
        if(clear(x+sx,z+sz)){position.x+=sx*mirror;position.z+=sz;}
        else if(clear(x+sx,z))position.x+=sx*mirror;else if(clear(x,z+sz))position.z+=sz;
      }
      position.y=origin.y+(localFloor((position.x-origin.x)*mirror,position.z-origin.z)??0);
      return position;
    },
    camera(position,yaw,pitch=.4){
      const focus={x:position.x,y:position.y+1.25,z:position.z};let target={...focus};
      for(let d=.4;d<=7;d+=.2){
        const x=focus.x+Math.sin(yaw)*d*Math.cos(pitch),z=focus.z+Math.cos(yaw)*d*Math.cos(pitch);
        const lx=(x-origin.x)*mirror,lz=z-origin.z,containers=[...rooms,...passages].filter(r=>inside(r,lx,lz));
        if(!containers.length)break;
        const ceiling=Math.min(...containers.map(r=>r.y+r.h)),y=Math.min(focus.y+Math.sin(pitch)*d,origin.y+ceiling-.6);
        if(y<origin.y+localFloor(lx,lz)+.25||!clear(lx,lz,.15,y-origin.y))break;
        target={x,y,z};
      }
      return {target,lookAt:focus};
    },
  };
}

export function buildBaldroInterior(parent,kingdom,{group=new THREE.Group(),walk=createBaldroInteriorWalk(kingdom)}={}){
  group.name=`${kingdom.name} underground city`;group.visible=false;parent.add(group);
  const b=createSceneryBuilder(group.name),west=kingdom.id==='west-baldro';
  const stone=west?0x59646a:0x717467,trim=west?0x939d96:0xaba88c,wood=0x684a34,gold=0xb1955c;
  const shadow=west?0x35434a:0x434a40,iron=0x353d3d,lightWood=0x917251;
  const lamps=[[0,0,7],[-29,0,5],[31,0,6],[0,-44,9],[0,26,4],[-31,-34,4]];
  const wall=(r,side)=>{
    const horizontal=side==='north'||side==='south',inward=side==='north'||side==='west'?1:-1;
    for(const p of wallParts(r,side)){
      b.block(p.lintel?trim:stone,p.x,p.y,p.z,p.w,p.h,p.d);
      const along=horizontal?p.x:p.z,length=horizontal?p.w:p.d,face=(horizontal?p.z:p.x)+inward*.387;
      const mark=(tint,a,y,w,h,depth=.022)=>b.box(tint,horizontal?a:face,y,horizontal?face:a,horizontal?w:depth,h,horizontal?depth:w);
      // Dark mortar courses and staggered upright joints read as carved stone,
      // rather than a single unbroken plane, even without baked textures.
      for(let row=0;row<p.h/1.35;row++){
        const y=p.y+row*1.35;
        if(row)mark(shadow,along,y,length,.042);
        for(let a=along-length/2+((row%2)?1.15:2.3);a<along+length/2-.15;a+=2.3)
          mark(shadow,a,y+Math.min(1.28,p.y+p.h-y)/2,.034,Math.min(1.28,p.y+p.h-y));
      }
      mark(trim,along,p.y+.3,length,.3,.036);
      mark(shadow,along,p.y+p.h-.55,length,.16,.04);
      mark(trim,along,p.y+p.h-.32,length,.27,.06);
      if(!p.lintel)for(const edge of [-1,1]){
        const a=along+edge*(length/2-.34);
        mark(trim,a,r.y+r.h/2,.45,r.h-.7,.06);
        for(const y of [1.1,3.8,r.h-1.25])mark(gold,a,r.y+y,.54,.1,.08);
      }
    }
  };
  const table=(x,z,w,d,h=.85)=>{
    b.block(lightWood,x,h-.15,z,w,.15,d);
    for(const sx of [-1,1])for(const sz of [-1,1])b.block(wood,x+sx*(w/2-.2),0,z+sz*(d/2-.2),.23,h-.15,.23);
    b.block(wood,x,.23,z,Math.max(.25,w-.4),.12,.13);
    for(let at=-d/2+.42;at<d/2;at+=.42)b.box(wood,x,h+.003,z+at,w-.03,.009,.024);
  };
  // A framed facade is laid against retained stone; doors are shallow panels,
  // not promises of extra rooms or unsupported walking space beyond the wall.
  const facade=(x,z,yaw,{abandoned=false,width=7}={})=>b.frame(x,0,z,yaw,()=>{
    const dark=abandoned?0x29322f:0x3e342a,frame=abandoned?0x696858:lightWood;
    b.block(shadow,0,.25,0,width,4.8,.025);
    for(const side of [-1,1])b.block(trim,side*(width/2-.15),0,.02,.23,5.4,.04);
    b.block(frame,0,4.7,.04,width,.18,.08);
    for(const px of [-.83,.83])b.block(frame,px,0,.045,.16,2.55,.07);
    b.block(dark,0,0,.04,1.48,2.55,.05);
    for(const px of [-.5,-.25,0,.25,.5])b.block(abandoned?0x474b3e:0x775439,px,.04,.078,.026,2.43,.012);
    b.beam(frame,[-.9,2.5,.08],[0,3.06,.08],.18);
    b.beam(frame,[0,3.06,.08],[.9,2.5,.08],.18);
    for(const h of [.55,1.75])b.box(iron,0,h,.09,1.45,.1,.018);
    b.box(gold,.48,1.2,.11,.12,.12,.04);
    if(abandoned){
      b.beam(0x72694f,[-.78,.45,.115],[.78,2.15,.115],.17);
      b.beam(0x514e40,[.8,.55,.14],[-.78,2.1,.14],.14);
    }
    for(const side of [-1,1]){
      const wx=side*(width/2-1.15);
      b.block(dark,wx,1.7,.045,1.35,1.55,.025);
      b.block(abandoned?0x333f3b:0xcfa362,wx,1.86,.065,1.06,1.22,.02);
      for(const px of [-.64,0,.64])b.block(frame,wx+px,1.7,.09,.105,1.55,.04);
      for(const y of [1.73,2.44,3.22])b.box(frame,wx,y,.09,1.4,.11,.05);
      b.block(trim,wx,1.62,.11,1.55,.12,.12);
      if(abandoned)b.beam(0x625d4b,[wx-.57,1.86,.15],[wx+.56,3.12,.15],.16);
    }
    for(const px of [-width/2+.65,width/2-.65])b.beam(frame,[px,3.9,.07],[px+(px<0?.6:-.6),4.64,.07],.14);
  });
  const hangingLamp=(x,z,y)=>{
    const roof=Math.min(...[...rooms,...passages].filter(r=>inside(r,x,z)).map(r=>r.y+r.h));
    b.beam(iron,[x,y+.46,z],[x,roof-.15,z],.055);
    b.block(iron,x,roof-.16,z,.55,.16,.55);
    for(const dy of [-.37,.32])b.block(gold,x,y+dy,z,.72,.09,.72);
    for(const sx of [-1,1])for(const sz of [-1,1])b.block(iron,x+sx*.29,y-.32,z+sz*.29,.055,.68,.055);
    b.cone(iron,x,y+.41,z,.53,.22,Math.PI/4,4);
    b.block(iron,x,y-.51,z,.46,.14,.46);
  };
  b.frame(0,0,0,0,()=>{
    for(const r of rooms){
      b.block(r.id==='abandoned-district'?0x535954:0x77766a,r.x,r.y-.45,r.z,r.w,.45,r.d);
      // Enclosed ceilings and massive retained rock above every district.
      b.block(stone,r.x,r.y+r.h,r.z,r.w,.7,r.d);
      for(const side of ['north','south','west','east'])wall(r,side);
      for(let x=r.x-r.w/2+1;x<r.x+r.w/2;x+=2)for(let z=r.z-r.d/2+1;z<r.z+r.d/2;z+=2){
        const variation=Math.abs(Math.round(x*.5+z*.5))%3;
        const floor=r.id==='abandoned-district'?[0x676c61,0x62685f,0x737669][variation]:[0x84877b,0x7b8076,0x8b8e80][variation];
        b.box(floor,x,r.y+.006,z,1.964,.012,1.964);
      }
    }
    for(const r of passages){
      const breaks=r.ramp?[r.z-r.d/2,-34,-17,r.z+r.d/2]:[r.z-r.d/2,r.z+r.d/2];
      for(let i=1;i<breaks.length;i++){
        const z0=breaks[i-1],z1=breaks[i],y0=localFloor(r.x,z0)??r.y,y1=localFloor(r.x,z1)??r.y;
        b.sheet(trim,[r.x-r.w/2,y0,z0],[r.x+r.w/2,y0,z0],[r.x+r.w/2,y1,z1],[r.x-r.w/2,y1,z1]);
      }
      b.block(stone,r.x,r.y+r.h,r.z,r.w,.6,r.d);
    }
    for(const p of passageWalls)b.block(stone,p.x,p.y,p.z,p.w,p.h,p.d);
    for(const [x,z] of pillars){const y=localFloor(x,z),h=z<-30?8.5:12.5;
      b.cylinder(stone,x,y,z,.95,h,0,8);b.block(trim,x,y,z,2.6,.5,2.6);b.block(trim,x,y+h-.6,z,2.5,.65,2.5);
      for(const ring of [.55,1.4,4.2,h-1.1])b.cylinder(trim,x,y+ring,z,1.02,.16,0,7);
      for(const side of [-1,1]){
        b.block(shadow,x+side*.952,y+1.8,z,.025,Math.max(1,h-3.8),.42);
        b.block(shadow,x,y+1.8,z+side*.952,.42,Math.max(1,h-3.8),.025);
      }
    }
    // Tall intersecting stone ribs lend the commons a vaulted, excavated scale.
    for(const z of [-12,0,12])for(const side of [-1,1]){
      b.beam(trim,[side*15,5,z],[side*9,10.5,z],.85,.85);
      b.beam(trim,[side*9,10.5,z],[0,12.8,z],.85,.85);
    }
    for(const side of [-1,1]){
      b.block(trim,side*4.45,0,-16.53,.58,5.8,.12);
      b.block(gold,side*4.45,1.1,-16.44,.65,.1,.05);
      b.beam(trim,[side*4.45,5.9,-16.54],[0,8.5,-16.54],.42);
      for(let i=0;i<3;i++)b.box(gold,side*(5.6+i*.75),5.1,-16.56,.25,.85,.05,0,0,side*.5);
    }
    b.box(gold,0,8.14,-16.46,.6,.9,.08,0,0,Math.PI/4);
    // The avenue is stone inlay with repeated metal lozenges, not a flat carpet.
    for(const side of [-1,1])b.box(gold,side*1.7,.018,0,.09,.012,27);
    for(const z of [-12,-8,-4,0,4,8,12])b.box(gold,0,.019,z,.62,.012,.62,Math.PI/4);
    for(const x of [-7,7]){
      table(x,3,2.5,5);for(const dx of [-1.8,1.8])table(x+dx,3,.6,5,.45);
      for(const z of [1.6,3.8]){
        b.cylinder(0xaa9270,x-.5,.854,z,.27,.045,0,7);
        b.rock(0xb19053,x-.5,.96,z,.3,.11,.2);
        b.cylinder(0x7a6851,x+.5,.85,z,.16,.26,0,7);
      }
      b.box(0xafa087,x,.859,3.0,1.5,.018,.55);
    }
    // Warm domestic hearth: individual doorways, window glow, shelves and stored meals.
    for(const z of [-10,0,10]){
      facade(-42.57,z,Math.PI/2,{width:7.8});
      b.block(wood,-42,0,z,.35,2.5,1.72);b.block(gold,-41.81,1,z+.55,.035,.12,.12);
      table(-36,z-1,2,.6,.5);
      for(const y of [.55,1.15,1.8])b.block(lightWood,-36,y,z-1,1.95,.09,.54);
      for(const side of [-1,1])b.block(wood,-36+side*.86,.5,z-1,.09,1.42,.5);
      for(let i=0;i<4;i++){
        b.cylinder([0xa5895f,0x7c8874,0xa59f84][i%3],-36.65+i*.43,1.25,z-1,.15,.3,0,7);
        b.rock(0xc0a478,-36.55+i*.39,.74,z-1,.21,.12,.18);
      }
    }
    for(const x of [-38,-30,-22])facade(x,14.57,Math.PI,{width:7.3});
    b.block(0x3a3431,-25,0,-9,3.5,2.6,2);b.block(0x201a16,-25,.25,-7.96,2,1.6,.06);
    for(const side of [-1,1])b.block(trim,-25+side*1.28,0,-7.98,.35,2.4,.2);
    b.block(trim,-25,2.18,-7.94,3.5,.25,.35);b.block(stone,-25,2.6,-9,1.9,6.4,1.4);
    for(let y=2.9;y<8.8;y+=1.1)b.block(shadow,-25,y,-8.285,1.92,.055,.025);
    for(let i=-2;i<=2;i++){b.beam(wood,[-25.8+i*.25,.33,-7.92],[-25.4+i*.27,.6,-7.65],.14);b.rock(0xe99137,-25+i*.32,.64,-7.77,.2,.28,.12);}
    table(-32,10,5,2);
    for(let i=0;i<5;i++){b.cylinder(0xbe9460,-34+i,.85,10,.18,.2,0,7);b.rock(0xc8aa66,-34+i,.94,10.55,.28,.10,.18);}
    // Low rails and timber beams give the inhabited lane an upper facade without
    // narrowing its floor or changing any of its established conversation stands.
    for(const z of [-13.9,13.9]){
      b.block(wood,-31,5.3,z,22,.22,.18);b.block(lightWood,-31,6.45,z,22,.14,.15);
      for(let x=-41;x<=-21;x+=1)b.block(wood,x,5.5,z,.075,.92,.1);
    }
    for(const z of [-10,0,10])b.block(wood,-31,8.1,z,22,.32,.32);
    // Active works district: forge, ore bins, bellows, benches, finished tools.
    b.block(0x363d3e,39,0,-7,5,2.8,3);b.block(0x241e17,39,.45,-5.47,3.5,1.65,.06);
    for(const side of [-1,1])b.block(trim,39+side*1.95,.25,-5.45,.4,2.3,.14);
    b.block(trim,39,2.35,-5.4,4.4,.32,.25);
    b.block(iron,39,2.8,-7,3.8,.3,2.8);b.block(shadow,39,3.1,-7,2.4,6.9,1.8);
    for(const y of [3.5,5,6.5,8,9.5])b.block(trim,39,y,-6.09,2.5,.11,.04);
    for(let i=0;i<7;i++)b.rock(i%2?0xe48b39:0xb04f24,37.65+i*.44,.8,-5.39,.29,.28,.15);
    for(let x=37.5;x<40.7;x+=.45)b.block(iron,x,.5,-5.3,.045,1.3,.05);
    b.rock(wood,40.6,1.2,-6.5,.62,.35,.48);b.box(iron,40.6,1.45,-6.5,1,.09,.55);
    for(const z of [-7,0,8]){
      table(26,z,3.8,1.8,.9);
      b.block(iron,26,.9,z,.75,.18,.58);b.block(iron,26,1.08,z,.47,.17,.43);
      b.block(trim,26,1.25,z,1.25,.14,.55);b.rock(trim,26.72,1.31,z,.36,.07,.19);
      for(const dx of [-1.25,1.2]){b.box(lightWood,26+dx,.92,z+.35,.09,.06,.64);b.box(iron,26+dx,1,z+.12,.34,.16,.18);}
    }
    for(let i=0;i<8;i++)b.rock(0x655a49,38+(i%3),.4,6+Math.floor(i/3),.7,.6,.65);
    for(const z of [5.4,8.6])b.block(wood,39,0,z,3.4,.8,.13);
    for(const x of [37.4,40.6])b.block(wood,x,0,7,.13,.8,3.4);
    table(40,11,4,2,.9);
    for(let i=0;i<5;i++){
      b.box(iron,38.5+i*.68,.98,11,.17,.08,1.2);b.box(lightWood,38.5+i*.68,.95,11.75,.1,.09,.55);
    }
    for(const z of [-11,0,11]){
      b.block(wood,42.57,3.4,z,.11,.18,6.5);
      for(let i=-2;i<=2;i++){b.block(iron,42.5,2.4,z+i,.07,1.0,.055);b.box(trim,42.47,2.7,z+i,.09,.15,.36);}
    }
    // Fallen capital memorial: many missing seats, two surviving lamps. No invented names.
    for(let i=-3;i<=3;i++){
      const alive=i===-1||i===1,x=i*3.6;
      b.block(shadow,x,4,-51,1.8,.26,1.3);b.block(trim,x,4.26,-51,1.62,.18,1.17);
      b.block(alive?trim:0x555f5c,x,4.44,-51,alive?1.14:1.35,alive?2.8:1.6,.9);
      b.block(shadow,x,4.76,-50.53,.85,alive?1.82:.96,.028);
      for(let y=5;y<(alive?6.7:5.65);y+=.32)for(const sx of [-1,1])b.box(alive?gold:0x767e70,x+sx*.2,y,-50.50,.2,.055,.025,0,0,sx*.3);
      if(alive){
        b.block(gold,x,7.24,-51,1.48,.16,1.1);
        for(const side of [-1,1])b.block(iron,x+side*.42,7.4,-51,.055,.63,.055);
        b.rock(0xffca75,x,7.65,-51,.23,.33,.23);b.block(gold,x,8.05,-51,1.18,.1,.8);
      }else{
        b.rock(0x626c65,x+.14,6.1,-51,.68,.24,.45,.2);
        b.beam(0x293a36,[x-.5,5,-50.46],[x+.45,5.8,-50.46],.08);
        b.box(0x7e856f,x-.18,6.24,-51,.7,.13,.5,.45,0,.13);
      }
    }
    // A mountain frieze behind the stones, its lower courses cut by wave lines.
    b.block(shadow,0,7,-53.58,25,4.7,.035);
    for(let i=-3;i<=3;i++){
      const x=i*3.4;
      b.beam(trim,[x-1.6,8.2,-53.53],[x,10.7+(i%2)*.4,-53.53],.13);
      b.beam(trim,[x,10.7+(i%2)*.4,-53.53],[x+1.6,8.2,-53.53],.13);
      for(const y of [7.5,7.85]){
        b.beam(0x788f8d,[x-1.5,y,-53.48],[x,y+.15,-53.48],.065);
        b.beam(0x788f8d,[x,y+.15,-53.48],[x+1.5,y,-53.48],.065);
      }
    }
    b.box(gold,0,4.018,-44,3.5,.012,3.5,Math.PI/4);
    b.box(0x657773,0,4.028,-44,3.28,.008,3.28,Math.PI/4);
    // Abandoned homes are still visibly a city district, with shored arches and old doors.
    for(const z of [-43,-34,-25]){
      facade(-42.57,z,Math.PI/2,{abandoned:true,width:7.4});
      b.block(0x443c32,-42,0,z,.35,2.7,1.8);b.beam(0x7d6650,[-41.8,.1,z-.8],[-41.8,2.6,z+.8],.12);
      b.rock(0x6f7470,-38,.3,z+1,1.25,.55,.95);
      for(let i=0;i<5;i++)b.rock(i%2?stone:trim,-39.3+i*.59,.22+(i%2)*.16,z+.55+(i%2)*.8,.38,.32,.36,i*.7);
      b.box(0x6c6150,-38,.19,z+1.1,2.6,.15,.28,.21,0,.1);
    }
    for(const x of [-39,-31,-23])facade(x,-46.57,0,{abandoned:true,width:7.1});
    // Shoring surrounds fallen masonry, all within the existing rubble footprint.
    for(const x of [-25,-21])b.block(0x695b43,x,0,-43,.28,5.9,.28);
    b.block(0x695b43,-23,5.65,-43,4.7,.32,.38);
    b.beam(wood,[-25,.1,-43],[-21.2,5.6,-43],.25);
    for(let i=0;i<9;i++)b.rock(i%2?trim:stone,-24.7+(i%4)*1.05,.3+Math.floor(i/4)*.32,-43+(i%2)*.65,.6,.42,.42,i*.4);
    for(const x of [-39,-35,-27,-23]){
      b.block(0x4b5247,x,5.65,-46.43,1.8,.22,.2);
      b.block(wood,x-.72,5.85,-46.40,.075,.65,.12);
      b.beam(wood,[x-.72,6.4,-46.40],[x+.6,6.13,-46.40],.1);
    }
    for(const [x,z,y] of lamps)hangingLamp(x,z,y);
    // Door back to daylight is explicit, not an invisible edge of the level.
    b.block(0x5a4b35,0,0,32.8,5,5,.3);b.block(gold,0,5,32.55,5,.3,.35);
    for(const x of [-2.25,0,2.25])b.block(iron,x,.15,32.63,.11,4.65,.06);
    for(const y of [.65,2.55,4.45])b.box(gold,0,y,32.60,4.9,.14,.07);
    for(const x of [-.35,.35])b.box(gold,x,2.2,32.5,.13,.35,.12);
  });
  const shell=b.finish(group,{castShadow:false});
  shell.position.set(walk.origin.x,walk.origin.y,walk.origin.z);shell.scale.x=west?1:-1;
  group.userData.mirroredPlan=!west;
  // The floor solver keeps the camera in its district. A final ray against
  // the single merged shell also catches angled vault ribs and high lintels,
  // whose silhouettes cannot be described by a floor footprint alone.
  const roomCamera=walk.camera,ray=new THREE.Raycaster(),from=new THREE.Vector3(),direction=new THREE.Vector3();
  walk.camera=(...args)=>{
    const view=roomCamera(...args);from.set(view.lookAt.x,view.lookAt.y,view.lookAt.z);
    direction.set(view.target.x,view.target.y,view.target.z).sub(from);const length=direction.length();
    if(length>.001){
      shell.updateWorldMatrix(true,false);ray.set(from,direction.normalize());ray.far=length;
      const hit=ray.intersectObject(shell,false)[0];
      if(hit){const safe=Math.max(0,hit.distance-.25);view.target={x:from.x+direction.x*safe,y:from.y+direction.y*safe,z:from.z+direction.z*safe};}
    }
    return view;
  };
  const ambient=new THREE.AmbientLight(west?0xb6bfcb:0xd5c6a0,1.35);group.add(ambient);
  for(const [x,z,y] of lamps){
    const at=walk.toWorld({x,z}),light=new THREE.PointLight(z===-34?0x8ca0b1:0xffc787,z===-34?18:78,35,1.6);
    light.position.set(at.x,walk.origin.y+y,at.z);group.add(light);
    const glow=new THREE.Mesh(new THREE.IcosahedronGeometry(.22,0),new THREE.MeshBasicMaterial({color:0xffc772}));
    glow.position.copy(light.position);group.add(glow);
  }
  return {group,walk,rooms:BALDRO_INTERIOR_ROOMS};
}
