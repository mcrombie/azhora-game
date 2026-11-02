import {createSpeciesTreesSteps} from '../../../world/scenery/species-trees.js';
import {worldTreeId} from '../../../world/scenery/tree-registry.js';
import * as THREE from 'three';
import {createSceneryBuilder} from '../../../world/scenery/scenery-builder.js';
import {createSettlementGroundSteps} from '../../../world/scenery/settlement-ground.js';
import {finishBuild} from '../../../world/loading/build-steps.js';
import {stripedAwning} from '../../../world/scenery/city-detail.js';
import {outerTint,outerWaterAt,OUTER_RIVERS} from '../outer-regions/outer-regions-world.js';
import {townQuayHeight,townRoadDistance} from './northern-towns-layout.js';
import {NORTHERN_TOWN_BUILDINGS,northernTownTint} from './northern-towns-buildings.js';
import {northernTownHouse} from './northern-towns-architecture.js';

export const createNorthernTownScenery=kit=>finishBuild(createNorthernTownScenerySteps(kit));
export function* createNorthernTownScenerySteps({parent,heightAt,colliders=[],town:t}){
  const root=new THREE.Group();root.name=t.name+' / river mouth';parent.add(root);
  const metrics={buildings:0,bridges:1,quays:t.quays.length,boats:0,batches:0};
  const ground=yield* createSettlementGroundSteps({parent:root,box:t.fine,heightAt,tintAt:(x,z)=>northernTownTint(x,z)??outerTint(x,z),name:t.name+' ground'}),surface=ground.surfaceAt;metrics.batches++;
  const roads=createSceneryBuilder(t.name+' / lanes and square'),m=t.market;
  yield* roads.patchSteps(t.style==='finnish'?'#b1ad98':'#c0b7a0',surface,m.x,m.z,m.w,m.d,0,.20,30);
  for(const line of t.roads)for(let i=1;i<line.length;i++){
    const a=line[i-1],b=line[i],length=Math.hypot(b.x-a.x,b.z-a.z),n=Math.ceil(length/3),yaw=Math.atan2(b.x-a.x,b.z-a.z);
    for(let j=0;j<n;j++){const x=a.x+(b.x-a.x)*(j+.5)/n,z=a.z+(b.z-a.z)*(j+.5)/n;if(outerWaterAt(x,z)!==null||heightAt(x,z)<1)continue;yield* roads.patchSteps('#b6ac90',surface,x,z,5.6,3.6,yaw,.15,4);}
  }
  yield* roads.finishSteps(root);metrics.batches++;
  const builders=new Map();
  for(const s of NORTHERN_TOWN_BUILDINGS[t.id]){
    const key=Math.floor(s.x/65)+','+Math.floor(s.z/65);if(!builders.has(key))builders.set(key,createSceneryBuilder(t.name+' houses / '+key));
    northernTownHouse(builders.get(key),s,t,heightAt,colliders);metrics.buildings++;yield;
  }
  for(const b of builders.values()){yield* b.finishSteps(root);metrics.batches++;}
  const b=createSceneryBuilder(t.name+' / waterfront'),br=t.bridge,wood='#6a5942',plank='#a28a65';
  b.block(plank,br.x,br.y-.3,br.z,br.length,.3,br.width);
  // Stop the parapets short of the bank and leave the quay junction open.
  for(const side of [-1,1])for(const [lo,hi] of [[-29,-21],[-10,29]]){
    b.beam(wood,[br.x+lo,br.y+1,br.z+side*3],[br.x+hi,br.y+1,br.z+side*3],.18);
    for(let u=lo;u<=hi;u+=2.5)b.block(wood,br.x+u,br.y,br.z+side*3,.22,1.12,.22);
    colliders.push({x:br.x+(lo+hi)/2,z:br.z+side*3,hx:(hi-lo)/2,hz:.16,minY:br.y,maxY:br.y+1.2,kind:'wall'});
  }
  for(let u=-br.length/2;u<br.length/2;u+=1.2)b.block('#80735a',br.x+u,br.y+.006,br.z,.03,.01,br.width);
  for(const u of [-19,19])for(const side of [-1,1])b.block(wood,br.x+u,-1,br.z+side*2.6,.4,7,.4);
  for(const q of t.quays){
    for(let dz=-q.d/2;dz<q.d/2;dz+=1){const z=q.z+dz,y=townQuayHeight(q,z),yy=townQuayHeight(q,z+1);b.sheet(plank,[q.x-q.w/2,y,z],[q.x-q.w/2,yy,z+1],[q.x+q.w/2,yy,z+1],[q.x+q.w/2,y,z]);}
    if(q.d>q.w){for(const side of [-1,1])for(let dz=-q.d/2+1;dz<q.d/2;dz+=4){const z=q.z+dz;b.cylinder(wood,q.x+side*(q.w/2-.3),-1.5,z,.18,townQuayHeight(q,z)+1.9);}}
    else for(const side of [-1,1])for(let u=-q.w/2+1;u<q.w/2;u+=4)b.cylinder(wood,q.x+u,-1.5,q.z+side*(q.d/2-.3),.18,q.low+1.9);
  }
  const at=(u,v)=>({x:t.mouth.x+u,z:t.mouth.z+v});
  // Port activity without adding named residents or new quest systems.
  for(let i=0;i<4;i++){
    const p=at(-124+i*5.4,9),y=surface(p.x,p.z)+.23;
    b.block(wood,p.x,y,p.z,3.4,.75,1.7);stripedAwning(b,{wood,metal:'#484c43',cloth:t.style==='danish'?'#944c3d':'#758b85',trim:'#d6c8a2'},p.x,y+2.5,p.z-1,4,2.5);
    for(const side of [-1,1])b.block(wood,p.x+side*1.8,y,p.z+1.4,.12,2.5,.12);
    for(let j=0;j<3;j++)b.cylinder('#a38b59',p.x+(j-1)*.85,y+.76,p.z,.3,.28);
  }
  for(const [u,v] of [[-62,10],[-59,10],[-57,10],[-67,25]]){
    const p=at(u,v),q=t.quays.find(q=>Math.abs(p.x-q.x)<=q.w/2&&Math.abs(p.z-q.z)<=q.d/2),y=q?townQuayHeight(q,p.z):heightAt(p.x,p.z);
    b.cylinder('#8d7352',p.x,y,p.z,.42,.95);for(const dy of [.18,.72])b.cylinder('#484c43',p.x,y+dy,p.z,.44,.06);
  }
  // Net-drying frames and small open curing sheds on the inland bank.
  for(let i=0;i<3;i++){
    const p=at(-59+i*6,71),y=heightAt(p.x,p.z);
    for(const s of [-1,1])b.block(wood,p.x+s*2,y,p.z,.18,2.8,.18);
    b.beam(wood,[p.x-2.2,y+2.7,p.z],[p.x+2.2,y+2.7,p.z],.16);
    for(let j=0;j<8;j++)b.beam('#787d68',[p.x-1.8+j*.5,y+.5,p.z],[p.x-1.8+j*.5,y+2.6,p.z],.025);
    for(let yy=.6;yy<2.6;yy+=.3)b.beam('#787d68',[p.x-1.8,y+yy,p.z],[p.x+1.8,y+yy,p.z],.025);
  }
  function boat(u,v,length,yaw,sail){
    const p=at(u,v),y=(outerWaterAt(p.x,p.z)??.04)+.12,w=length*.16;
    b.frame(p.x,y,p.z,yaw,()=>{
      b.sheet('#93754c',[-w*.8,0,-length*.38],[-w*.8,0,length*.3],[w*.8,0,length*.3],[w*.8,0,-length*.38]);
      for(const side of [-1,1]){
        b.sheet('#69543d',[side*w*.8,0,-length*.38],[side*w,1,-length*.38],[side*w,1,length*.3],[side*w*.8,0,length*.3]);
        b.sheet('#8b6744',[side*w*.8,0,length*.3],[side*w,1,length*.3],[0,1.5,length*.54],[0,0,length*.44]);
        b.beam(wood,[side*w,1,-length*.38],[side*w,1,length*.3],.14);
      }
      b.sheet(wood,[-w*.8,0,-length*.38],[w*.8,0,-length*.38],[w,1,-length*.38],[-w,1,-length*.38]);
      for(const vv of [-.2,0,.2])b.block(plank,0,.55,length*vv,w*1.8,.12,.45);
      if(sail){b.cylinder(wood,0,0,0,.13,length*.85);b.beam(wood,[-w*1.5,length*.72,0],[w*1.5,length*.72,0],.13);b.sheet('#cfc9ae',[-w*1.5,length*.71,0],[w*1.5,length*.71,0],[w*1.25,length*.28,.4],[-w*1.25,length*.28,.4]);}
      else for(const side of [-1,1])b.beam(plank,[side*w*.7,.8,0],[side*(w+1.9),.25,1],.07);
    });metrics.boats++;
  }
  boat(-34,24,7,2.35,false);boat(-23,14,7,2.25,false);boat(10,-5,11,2,true);boat(35,-24,15,2.3,true);
  // Sparse garden trees, with all trunks clear of streets and solid buildings.
  const gardenTrees=[];
  for(const [u,v] of [[-139,-48],[-146,17],[-127,29],[-76,-52],[-140,76],[-64,90],[-9,90],[1,64],[-104,-67]]){
    const p=at(u,v),y=heightAt(p.x,p.z);
    if(y<2||outerWaterAt(p.x,p.z)!==null||townRoadDistance(t,p.x,p.z)<5||colliders.some(c=>Math.abs(c.x-p.x)<(c.hx??c.r??0)+3&&Math.abs(c.z-p.z)<(c.hz??c.r??0)+3))continue;
    gardenTrees.push({id:worldTreeId(t.id+'-garden',p.x,p.z),species:t.style==='finnish'?'silver-birch':'white-oak',x:p.x,z:p.z,y,height:8.9,crownRadius:2.8,trunkRadius:.23,harvestable:false,region:t.id,protectedReason:'A planted town tree.'});
  }
  const planted=yield* createSpeciesTreesSteps({parent:root,colliders,trees:gardenTrees,heightAt:heightAt,name:'Town garden trees',chunkSize:512});metrics.batches+=planted.batches;
  yield* b.finishSteps(root);metrics.batches++;
  root.userData[t.id]=metrics;return {root,metrics,update:()=>{}};
}
export function* createNorthernTownReviewWaterSteps({parent,town:t}){
  const b=createSceneryBuilder(t.name+' review river');
  for(const r of OUTER_RIVERS.filter(r=>r.town===t.id))for(let i=1;i<r.points.length;i++){
    const a=r.points[i-1],c=r.points[i];if(a.z>t.fine.z+t.fine.d+70&&c.z>t.fine.z+t.fine.d+70)continue;
    const length=Math.hypot(c.x-a.x,c.z-a.z),dx=-(c.z-a.z)/length*r.width,dz=(c.x-a.x)/length*r.width;
    b.sheet('#688e89',[a.x-dx,a.y,a.z-dz],[c.x-dx,c.y,c.z-dz],[c.x+dx,c.y,c.z+dz],[a.x+dx,a.y,a.z+dz]);
    for(let j=0;j<12;j++){const aa=j*Math.PI/6,cc=(j+1)*Math.PI/6;b.triangle('#688e89',[a.x,a.y,a.z],[a.x+Math.cos(cc)*r.width,a.y,a.z+Math.sin(cc)*r.width],[a.x+Math.cos(aa)*r.width,a.y,a.z+Math.sin(aa)*r.width]);}yield;
  }
  return yield* b.finishSteps(parent,{castShadow:false});
}
