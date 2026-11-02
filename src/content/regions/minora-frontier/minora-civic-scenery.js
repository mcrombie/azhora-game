import * as THREE from 'three';
import {createSceneryBuilder} from '../../../world/scenery/scenery-builder.js';
import {MENORA_PATHS,MENORA_GATES,MENORA_BRIDGES,MENORA_NPC_ANCHORS,LIZEEM_MARKET_STANDS,menoraSegmentDistance,menoraRiverClearance} from './menora-city.js';
import {MINORA_CIVIC_BUILDINGS,MINORA_WARDS,minoraCivicBuilding} from './minora-civic-layout.js';

const WOOD='#795f44',OAK='#574533',STONE='#d6d6c0',BRASS='#b7a16c',IRON='#465257',SACK='#b5a77c';
// Small goods and benches are proposed beside doors, then checked against real
// circulation and existing scenery. Every accepted ground prop has collision.
const PROPS=Object.freeze([
  {building:'menora-sanctuary-annex',kind:'relief',dx:-6,dz:1.3,w:2,d:1.1,h:1.45},
  {building:'menora-house-1',kind:'bench',dx:-5.8,dz:1.3,w:2.3,d:.85,h:1.1},
  {building:'menora-house-2',kind:'laundry',dx:4.6,dz:1.0,w:1.2,d:1,h:1.25},
  {building:'menora-house-3',kind:'bread',dx:-5.6,dz:1.0,w:2,d:1.1,h:1.4},
  {building:'menora-house-4',kind:'bench',dx:5.6,dz:1.1,w:2.3,d:.85,h:1.1},
  {building:'menora-house-5',kind:'barrels',dx:3.5,dz:1.0,w:1.6,d:1.1,h:1.5},
  {building:'menora-house-9',kind:'books',dx:-3,dz:1.0,w:1.5,d:.9,h:1.35},
  {building:'menora-house-10',kind:'ledger',dx:4.3,dz:1.0,w:1.4,d:.9,h:1.3},
  {building:'menora-house-11',kind:'net',dx:-3.1,dz:1.0,w:1.5,d:.85,h:1.45},
  {building:'menora-house-13',kind:'food',dx:3.5,dz:1.0,w:1.45,d:.95,h:1.4},
]);
const overlaps=(p,c)=>{
  if(c.r!==undefined)return Math.hypot(Math.max(0,Math.abs(c.x-p.x)-p.w/2),Math.max(0,Math.abs(c.z-p.z)-p.d/2))<c.r+.18;
  return Math.abs(c.x-p.x)<(c.hx??0)+p.w/2+.18&&Math.abs(c.z-p.z)<(c.hz??0)+p.d/2+.18;
};
export function minoraCivicPropPlan(colliders=[]){
  const accepted=[];
  for(const spec of PROPS){
    const b=minoraCivicBuilding(spec.building),p={...spec,id:'minora-civic-'+spec.kind+'-'+b.id,x:b.x+spec.dx,z:b.z+b.depth/2+spec.dz};
    const radius=Math.hypot(p.w,p.d)/2;
    if(menoraRiverClearance(p.x,p.z)<radius+2)continue;
    if(MENORA_PATHS.some(path=>path.points.slice(1).some((end,i)=>menoraSegmentDistance(p.x,p.z,path.points[i],end)<path.width/2+radius+.6)))continue;
    if([...MENORA_GATES,...MENORA_NPC_ANCHORS.guards,...LIZEEM_MARKET_STANDS].some(a=>Math.hypot(a.x-p.x,a.z-p.z)<radius+1.2))continue;
    if(MENORA_BRIDGES.some(a=>a.axis==='x'?p.x>a.start-radius-2&&p.x<a.end+radius+2&&Math.abs(p.z-a.z)<a.width/2+radius+1:p.z>a.start-radius-2&&p.z<a.end+radius+2&&Math.abs(p.x-a.x)<a.width/2+radius+1))continue;
    if(colliders.some(c=>overlaps(p,c))||accepted.some(c=>overlaps(p,{x:c.x,z:c.z,hx:c.w/2,hz:c.d/2})))continue;
    if(MINORA_CIVIC_BUILDINGS.some(a=>Math.abs(a.entrance.x-p.x)<p.w/2+1.15&&Math.abs(a.entrance.z-p.z)<p.d/2+1.15))continue;
    accepted.push(Object.freeze(p));
  }
  return Object.freeze(accepted);
}

function table(b,p,y){
  b.box(WOOD,p.x,y+.84,p.z,p.w,.15,p.d);
  for(const x of [-1,1])for(const z of [-1,1])b.block(OAK,p.x+x*(p.w/2-.14),y,p.z+z*(p.d/2-.12),.12,.82,.12);
}
function barrel(b,x,y,z,scale=1){
  b.cylinder(WOOD,x,y,z,.36*scale,1.0*scale);
  for(const dy of [.18,.78])b.cylinder(IRON,x,y+dy*scale,z,.375*scale,.065*scale);
  b.cylinder(OAK,x,y+1.005*scale,z,.33*scale,.045*scale);
}
function buildProp(b,p,y){
  if(p.kind==='bench'){
    b.box(WOOD,p.x,y+.48,p.z,p.w,.17,p.d);
    for(const dx of [-p.w*.35,p.w*.35])b.block(STONE,p.x+dx,y,p.z,.3,.4,p.d*.72);
    b.box(WOOD,p.x,y+.93,p.z-p.d*.4,p.w,.22,.09);
  }else if(p.kind==='barrels'){
    barrel(b,p.x-.42,y,p.z,.94);barrel(b,p.x+.4,y,p.z+.05,.72);
    b.beam(OAK,[p.x-.7,y+.97,p.z],[p.x+.15,y+.97,p.z],.055);
  }else if(p.kind==='laundry'){
    b.cylinder(WOOD,p.x,y,p.z,.46,.55);
    b.rock('#d8d7c1',p.x,y+.61,p.z,.42,.18,.4);
    b.box('#b5c6bd',p.x+.22,y+.53,p.z+.34,.34,.65,.075);
  }else if(p.kind==='net'){
    for(const dx of [-.6,.6])b.block(OAK,p.x+dx,y,p.z,.08,1.35,.08);
    for(let i=0;i<6;i++){const x=p.x-.6+i*.24;b.beam(SACK,[x,y+.15,p.z+.04],[x,y+1.25,p.z+.04],.018);}
    for(let i=0;i<5;i++){const yy=y+.2+i*.25;b.beam(SACK,[p.x-.6,yy,p.z+.04],[p.x+.6,yy,p.z+.04],.018);}
  }else{
    table(b,p,y);
    if(p.kind==='bread')for(let i=0;i<5;i++)b.rock(i%2?'#b2844a':'#d4b578',p.x-.72+i*.35,y+1.02,p.z,.23,.13,.14);
    if(p.kind==='books')for(let i=0;i<4;i++){const x=p.x-.45+i*.29;b.box(['#5c7564','#6b4a44','#58677e','#b4a272'][i],x,y+.99,p.z,.23,.16,.37);b.box('#e4dfbd',x,y+.99,p.z+.01,.2,.11,.37);}
    if(p.kind==='ledger'){b.box('#e4dfbd',p.x,y+.96,p.z,.6,.055,.4);b.cylinder(IRON,p.x+.4,y+.93,p.z,.08,.13);b.beam(SACK,[p.x+.38,y+1.03,p.z],[p.x+.25,y+1.3,p.z],.02);}
    if(p.kind==='relief'){
      b.cylinder(IRON,p.x-.4,y+.92,p.z,.28,.32);b.cylinder('#8d825b',p.x-.4,y+1.245,p.z,.23,.025);
      for(const dx of [.15,.45,.75])b.cylinder('#d3c5a0',p.x+dx,y+.93,p.z,.1,.07);
      b.rock(SACK,p.x-.45,y+.25,p.z,.26,.25,.25);
    }
    if(p.kind==='food')for(let i=0;i<3;i++){b.box(OAK,p.x-.4+i*.4,y+1,p.z,.34,.2,.5);for(const dz of [-.12,.12])b.rock(['#9ba778','#b5a26a','#ad8c61'][i],p.x-.4+i*.4,y+1.15,p.z+dz,.14,.12,.12);}
  }
}

const subtitle=b=>b.id==='menora-river-hall'?'Assembly below · Mayor above':b.service==='temple'?'River · Agriculture · Fertility':b.service==='granary'?'City reserve · Measured deliveries':b.service==='watch'?'One city · One watch':MINORA_WARDS[b.ward].name;
function signAtlas(){
  const width=2048,height=1024,cellW=512,cellH=128;
  let texture;
  if(typeof document==='undefined'){
    texture=new THREE.DataTexture(new Uint8Array([234,227,201,255]),1,1);texture.needsUpdate=true;
  }else{
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const c=canvas.getContext('2d');
    for(const [i,b] of MINORA_CIVIC_BUILDINGS.entries()){
      const x=(i%4)*cellW,y=Math.floor(i/4)*cellH,ward=MINORA_WARDS[b.ward];
      c.fillStyle=ward.pale;c.fillRect(x,y,cellW,cellH);
      c.fillStyle=ward.color;c.fillRect(x+8,y+8,cellW-16,cellH-16);
      c.strokeStyle='#bda777';c.lineWidth=2;c.strokeRect(x+15,y+15,cellW-30,cellH-30);
      c.fillStyle='#f4ecd3';c.textAlign='center';c.textBaseline='middle';
      c.font='600 32px Georgia, serif';c.fillText(b.name,x+cellW/2,y+49,cellW-44);
      c.font='17px Georgia, serif';c.fillText(subtitle(b),x+cellW/2,y+91,cellW-42);
    }
    texture=new THREE.CanvasTexture(canvas);texture.anisotropy=4;
  }
  texture.colorSpace=THREE.SRGBColorSpace;
  return {texture,width,height,cellW,cellH};
}
function addLettering(root,ground){
  const atlas=signAtlas(),positions=[],uvs=[],normals=[];
  for(const [i,b] of MINORA_CIVIC_BUILDINGS.entries()){
    const p=b.plaque,x=p.x,y=ground(b.x,b.z)+p.y,z=p.z+.025,w=p.width/2,h=p.height/2;
    const u=(i%4)*atlas.cellW/atlas.width,v=1-Math.floor(i/4)*atlas.cellH/atlas.height,du=atlas.cellW/atlas.width,dv=atlas.cellH/atlas.height;
    for(const [px,py,tu,tv] of [[x-w,y-h,u,v-dv],[x+w,y-h,u+du,v-dv],[x+w,y+h,u+du,v],[x-w,y-h,u,v-dv],[x+w,y+h,u+du,v],[x-w,y+h,u,v]]){positions.push(px,py,z);uvs.push(tu,tv);normals.push(0,0,1);}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.computeBoundingSphere();
  const material=new THREE.MeshStandardMaterial({map:atlas.texture,roughness:.95,metalness:0});
  const mesh=new THREE.Mesh(geometry,material);mesh.name='Minora civic lettering / shared atlas';root.add(mesh);
  return positions.length/3;
}

export function* createMinoraCivicScenerySteps({root,ground,push,metrics,colliders}){
  const b=createSceneryBuilder('Minora civic fronts and household work'),props=minoraCivicPropPlan(colliders);
  for(const record of MINORA_CIVIC_BUILDINGS){
    const p=record.plaque,y=ground(record.x,record.z)+p.y;
    b.box(OAK,p.x,y,p.z-.04,p.width+.16,p.height+.16,.12);
    for(const dx of [-1,1])b.box(BRASS,p.x+dx*(p.width/2-.12),y,p.z+.012,.065,p.height-.08,.02);
    if(record.service==='assembly'){
      // A retained crown above the new civic bridge: the royal fabric remains,
      // while the public entrance now names the elected assembly.
      const z=p.z+.02,cy=y+1.15;
      b.box('#a69e80',p.x,cy,z,1.5,.18,.05);
      for(const dx of [-.6,0,.6])b.cone('#a69e80',p.x+dx,cy+.1,z,.16,.42,0,4);
      b.box(MINORA_WARDS.hall.color,p.x,cy-.55,z+.01,1.9,.65,.055);
      b.box(BRASS,p.x,cy-.39,z+.045,1.3,.08,.025);
      for(const dx of [-.5,0,.5])b.box(BRASS,p.x+dx,cy-.58,z+.045,.1,.35,.025);
    }
    if(record.service==='temple'){
      const z=p.z+.02,cy=y+1.05;
      for(const dx of [-.9,0,.9]){
        b.beam(BRASS,[p.x+dx,cy-.12,z],[p.x+dx,cy+.75,z],.045);
        for(const dy of [.2,.45,.65])for(const side of [-1,1])b.rock(BRASS,p.x+dx+side*.1,cy+dy,z,.15,.075,.035,side*.5);
      }
      for(const dy of [-.3,-.48])for(let i=0;i<8;i++)b.beam('#729c99',[p.x-1.5+i*.375,cy+dy+Math.sin(i)*.04,z],[p.x-1.5+(i+1)*.375,cy+dy+Math.sin(i+1)*.04,z],.045);
    }
    yield;
  }
  for(const p of props){const y=ground(p.x,p.z);buildProp(b,p,y);push({id:p.id,kind:'civic-prop',x:p.x,z:p.z,hx:p.w/2,hz:p.d/2,minY:y-.1,maxY:y+p.h});yield;}
  const vertices=b.vertexCount;yield* b.finishSteps(root,{castShadow:false});
  const letteringVertices=addLettering(root,ground);
  metrics.vertices+=vertices+letteringVertices;metrics.batches+=2;
  metrics.civic={buildings:MINORA_CIVIC_BUILDINGS.length,wards:Object.keys(MINORA_WARDS).length,props:props.length,letteringBatches:1,staticBatches:2,vertices:vertices+letteringVertices};
  return {buildings:MINORA_CIVIC_BUILDINGS,props,metrics:metrics.civic};
}
