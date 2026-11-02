import {createSpeciesTreesSteps} from '../../../world/scenery/species-trees.js';
import {worldTreeId} from '../../../world/scenery/tree-registry.js';
import * as THREE from 'three';
import {createSceneryBuilder} from '../../../world/scenery/scenery-builder.js';
import {createSettlementGroundSteps} from '../../../world/scenery/settlement-ground.js';
import {finishBuild} from '../../../world/loading/build-steps.js';
import {outerTint,outerWaterAt,outerWaterSample,OUTER_RIVERS} from '../outer-regions/outer-regions-world.js';
import {NONTH_FINE,NONTH_DECKS,NONTH_LANES,NONTH_MARKET,nonthPoint,nonthDeckHeight,nonthLaneDistance} from './nonth-town-layout.js';
import {NONTH_BUILDINGS,NONTH_BOATS,nonthTownTint} from './nonth-town-buildings.js';
import {nonthHouse} from './nonth-town-architecture.js';

export const createNonthTownScenery=kit=>finishBuild(createNonthTownScenerySteps(kit));
export function* createNonthTownScenerySteps({parent,heightAt,colliders=[]}){
  const root=new THREE.Group();root.name='Nonth Town / west bank';parent.add(root);
  const metrics={buildings:0,marketHalls:1,quays:1,boats:0,batches:0};
  const ground=yield* createSettlementGroundSteps({parent:root,box:NONTH_FINE,heightAt,spacing:1.3,tintAt:(x,z)=>nonthTownTint(x,z)??outerTint(x,z),name:'Nonth town ground'}),surface=ground.surfaceAt;metrics.batches++;
  const lanes=createSceneryBuilder('Nonth / cobbled lanes'),m=NONTH_MARKET;
  yield* lanes.patchSteps('#b6b09a',surface,m.x,m.z,m.w+6,m.d+8,0,.12,18);
  for(const l of NONTH_LANES)for(let i=1;i<l.length;i++){
    const a=l[i-1],b=l[i],n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/2),yaw=Math.atan2(b.x-a.x,b.z-a.z);
    for(let j=0;j<n;j++){
      const x=a.x+(b.x-a.x)*(j+.5)/n,z=a.z+(b.z-a.z)*(j+.5)/n;
      if(outerWaterAt(x,z)!==null||nonthDeckHeight(x,z)!==null)continue;
      yield* lanes.patchSteps('#aaa48f',surface,x,z,3.2,2.2,yaw,.10,3);
    }
  }
  for(let u=-m.w/2;u<m.w/2;u+=2)for(let v=-m.d/2;v<m.d/2;v+=2){const x=m.x+u,z=m.z+v;lanes.block('#979984',x,surface(x,z)+.14,z,1.7,.025,.04);}
  yield* lanes.finishSteps(root);metrics.batches++;
  const builders=new Map();
  for(const s of NONTH_BUILDINGS){const key=Math.floor(s.x/45)+','+Math.floor(s.z/45);if(!builders.has(key))builders.set(key,createSceneryBuilder('Nonth houses / '+key));nonthHouse(builders.get(key),s,heightAt,colliders);metrics.buildings++;yield;}
  for(const b of builders.values()){yield* b.finishSteps(root);metrics.batches++;}
  const b=createSceneryBuilder('Nonth / market hall and river trade'),wood='#564a35',plank='#a3916c';
  // An open French-style halle: timber trusses, shaded stalls, a walkable aisle.
  const my=surface(m.x,m.z)+.17;
  for(const side of [-1,1]){
    const x=m.x+side*6.1;
    b.beam(wood,[x,my+m.h,m.z-10.5],[x,my+m.h,m.z+10.5],.32,.4);
    for(const v of [-9,-4.5,0,4.5,9]){
      const z=m.z+v,y=surface(x,z)+.12;
      b.block('#bdb69c',x,y,z,.6,.35,.6);b.block(wood,x,y+.25,z,.26,my+m.h-y-.25,.26);
      b.beam(wood,[x,my+2.7,z],[x-side*1.2,my+m.h,z],.18);
      colliders.push({x,z,r:.31,minY:y,maxY:my+m.h,kind:'building'});
    }
    for(const v of [-6,0,6]){
      const x=m.x+side*4.2,z=m.z+v,y=surface(x,z)+.14;
      b.block(wood,x,y,z,1.9,.9,3.3);b.block(plank,x,y+.9,z,2.1,.12,3.5);
      for(let j=0;j<4;j++)b.rock(side<0?'#ba9f5f':'#8a9a60',x,y+1.23,z-1.1+j*.7,.44,.22,.28);
      colliders.push({x,z,hx:1.1,hz:1.8,minY:y,maxY:y+1.4,kind:'building'});
    }
  }
  for(const v of [-9,-4.5,0,4.5,9]){
    const z=m.z+v;b.beam(wood,[m.x-6.1,my+m.h,z],[m.x+6.1,my+m.h,z],.22,.32);
    b.beam(wood,[m.x-6.1,my+m.h,z],[m.x,my+m.h+4.3,z],.22);b.beam(wood,[m.x,my+m.h+4.3,z],[m.x+6.1,my+m.h,z],.22);
    b.beam(wood,[m.x,my+m.h,z],[m.x,my+m.h+4.3,z],.2);
  }
  b.roof('#5e7175',m.x,my+m.h,m.z,14.3,23,4.7,0,'#9c987d');
  // The entrances stay open from floor to tie beam; no hanging obstruction.
  for(const side of [-1,1])b.block('#9d7850',m.x+side*6.1,my+2.6,m.z+10.5,.65,.65,.12);
  // The quay connects to the town by one graded ramp, leaving the channel open.
  for(const d of NONTH_DECKS){
    const dx=d.b.x-d.a.x,dz=d.b.z-d.a.z,len=Math.hypot(dx,dz),nx=-dz/len,nz=dx/len,n=Math.ceil(len/.65);
    const at=(t,s=0)=>[d.a.x+dx*t+nx*s,d.y0+(d.y1-d.y0)*t,d.a.z+dz*t+nz*s];
    for(let i=0;i<n;i++){
      const a=at(i/n),c=at((i+1)/n);
      b.sheet(i%3?plank:'#95805c',[a[0]-nx*d.width/2,a[1],a[2]-nz*d.width/2],[c[0]-nx*d.width/2,c[1],c[2]-nz*d.width/2],[c[0]+nx*d.width/2,c[1],c[2]+nz*d.width/2],[a[0]+nx*d.width/2,a[1],a[2]+nz*d.width/2]);
    }
    for(const side of [-1,1]){
      const a=at(0,side*(d.width/2-.2)),c=at(1,side*(d.width/2-.2));b.beam(wood,[a[0],a[1]-.23,a[2]],[c[0],c[1]-.23,c[2]],.3,.4);
      for(let dist=2;dist<len-1;dist+=5){const p=at(dist/len,side*(d.width/2-.3)),lo=Math.min(p[1]-.6,heightAt(p[0],p[2]))-.5;b.block(wood,p[0],lo,p[2],.35,p[1]-lo,.35);}
    }
  }
  for(const v of [-22,8]){
    const p=nonthPoint(33.8,v),y=26.3;b.cylinder(wood,p.x,y,p.z,.42,.95,0,10);
    for(const yy of [.14,.75])b.cylinder('#535b53',p.x,y+yy,p.z,.44,.08,0,10);
    colliders.push({x:p.x,z:p.z,r:.45,minY:y,maxY:y+1,kind:'building'});
  }
  for(const p of NONTH_BOATS){
    const water=outerWaterAt(p.x,p.z);if(water===null)continue;
    b.frame(p.x,water+.08,p.z,p.yaw,()=>{
      const w=p.w/2,l=p.d/2;b.sheet('#997f54',[-w*.7,0,-l*.75],[-w*.7,0,l*.75],[w*.7,0,l*.75],[w*.7,0,-l*.75]);
      for(const side of [-1,1]){
        b.sheet('#73573d',[side*w*.7,0,-l*.75],[side*w,.7,-l*.75],[side*w,.7,l*.75],[side*w*.7,0,l*.75]);
        for(const end of [-1,1])b.sheet('#856543',[side*w*.7,0,end*l*.75],[side*w,.7,end*l*.75],[0,.95,end*l],[0,0,end*l]);
        b.beam(wood,[side*w,.7,-l*.75],[side*w,.7,l*.75],.10);
      }
      for(const v of [-l*.45,0,l*.45])b.block(plank,0,.45,v,p.w*.9,.10,.3);
      if(p.id.includes('barge'))for(const v of [-1,1])b.block('#a19472',0,.1,v,1,.65,1.1);
      else b.beam(plank,[-1,.9,-.8],[1,.7,.9],.08);
    });metrics.boats++;
  }
  // A few garden trees, outside the tight streets and working waterfront.
  const gardenTrees=[];
  for(const [u,v] of [[-64,-25],[-65,16],[-40,69],[-68,46],[11,-36]]){
    const p=nonthPoint(u,v);if((outerWaterSample(p.x,p.z)?.distance??Infinity)<13||nonthLaneDistance(p.x,p.z)<4||colliders.some(c=>Math.abs(c.x-p.x)<(c.hx??c.r??0)+3&&Math.abs(c.z-p.z)<(c.hz??c.r??0)+3))continue;
    const y=surface(p.x,p.z);
    gardenTrees.push({id:worldTreeId('nonth'+'-garden',p.x,p.z),species:'white-oak',x:p.x,z:p.z,y,height:7.3,crownRadius:2.8,trunkRadius:.23,harvestable:false,region:'nonth',protectedReason:'A planted town tree.'});
  }
  const planted=yield* createSpeciesTreesSteps({parent:root,colliders,trees:gardenTrees,heightAt:surface,name:'Town garden trees',chunkSize:512});metrics.batches+=planted.batches;
  yield* b.finishSteps(root);metrics.batches++;root.userData.nonth=metrics;return {root,metrics,update:()=>{}};
}
export function* createNonthReviewWaterSteps({parent}){
  const b=createSceneryBuilder('Nonth review water'),box=NONTH_FINE;
  for(const r of OUTER_RIVERS)for(let i=1;i<r.points.length;i++){
    const a=r.points[i-1],c=r.points[i];if(Math.max(a.x,c.x)<box.x-40||Math.min(a.x,c.x)>box.x+box.w+40||Math.max(a.z,c.z)<box.z-40||Math.min(a.z,c.z)>box.z+box.d+40)continue;
    const len=Math.hypot(c.x-a.x,c.z-a.z),dx=-(c.z-a.z)/len*r.width,dz=(c.x-a.x)/len*r.width;
    b.sheet('#688e89',[a.x-dx,a.y,a.z-dz],[c.x-dx,c.y,c.z-dz],[c.x+dx,c.y,c.z+dz],[a.x+dx,a.y,a.z+dz]);
    for(let j=0;j<12;j++){const aa=j*Math.PI/6,cc=(j+1)*Math.PI/6;b.triangle('#688e89',[a.x,a.y,a.z],[a.x+Math.cos(cc)*r.width,a.y,a.z+Math.sin(cc)*r.width],[a.x+Math.cos(aa)*r.width,a.y,a.z+Math.sin(aa)*r.width]);}yield;
  }
  return yield* b.finishSteps(parent,{castShadow:false});
}
