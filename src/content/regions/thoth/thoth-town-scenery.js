import {createSpeciesTreesSteps} from '../../../world/scenery/species-trees.js';
import {worldTreeId} from '../../../world/scenery/tree-registry.js';
import * as THREE from 'three';
import {createSceneryBuilder} from '../../../world/scenery/scenery-builder.js';
import {createSettlementGroundSteps} from '../../../world/scenery/settlement-ground.js';
import {finishBuild} from '../../../world/loading/build-steps.js';
import {outerTint,outerWaterAt,outerWaterSample,OUTER_RIVERS} from '../outer-regions/outer-regions-world.js';
import {THOTH_FINE,THOTH_DECKS,THOTH_LANES,THOTH_MARKET,thothPoint,thothDeckHeight,thothLaneDistance} from './thoth-town-layout.js';
import {THOTH_BUILDINGS,THOTH_BOATS,thothTownTint,thothMarketClear} from './thoth-town-buildings.js';
import {thothHouse} from './thoth-town-architecture.js';

export const createThothTownScenery=kit=>finishBuild(createThothTownScenerySteps(kit));
export function* createThothTownScenerySteps({parent,heightAt,colliders=[]}){
  const root=new THREE.Group();root.name='Thoth Town / river bend';parent.add(root);
  const metrics={buildings:0,bridges:1,landings:1,boats:0,batches:0};
  const ground=yield* createSettlementGroundSteps({parent:root,box:THOTH_FINE,heightAt,spacing:1.7,tintAt:(x,z)=>thothTownTint(x,z)??outerTint(x,z),name:'Thoth town ground'}),surface=ground.surfaceAt;metrics.batches++;
  const lanes=createSceneryBuilder('Thoth / lanes and market square'),m=THOTH_MARKET;
  yield* lanes.patchSteps('#b6b4a3',surface,m.x,m.z,m.w,m.d,0,.12,18);
  for(const l of THOTH_LANES)for(let i=1;i<l.length;i++){
    const a=l[i-1],b=l[i],n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/2.5),yaw=Math.atan2(b.x-a.x,b.z-a.z);
    for(let j=0;j<n;j++){
      const x=a.x+(b.x-a.x)*(j+.5)/n,z=a.z+(b.z-a.z)*(j+.5)/n;
      if(outerWaterAt(x,z)!==null||thothDeckHeight(x,z)!==null)continue;
      yield* lanes.patchSteps('#b4ab8f',surface,x,z,4.4,2.8,yaw,.10,3);
    }
  }
  // Paving joints and an open well give the square a recognisable centre.
  for(let u=-m.w/2+2;u<m.w/2;u+=2.4)for(let v=-m.d/2+2;v<m.d/2;v+=2.4){
    const x=m.x+u,z=m.z+v;lanes.block('#9c9e8c',x,surface(x,z)+.14,z,1.95,.025,.035);
  }
  yield* lanes.finishSteps(root);metrics.batches++;
  const builders=new Map();
  for(const s of THOTH_BUILDINGS){const key=Math.floor(s.x/65)+','+Math.floor(s.z/65);if(!builders.has(key))builders.set(key,createSceneryBuilder('Thoth houses / '+key));thothHouse(builders.get(key),s,heightAt,colliders);metrics.buildings++;yield;}
  for(const b of builders.values()){yield* b.finishSteps(root);metrics.batches++;}
  const b=createSceneryBuilder('Thoth / crossings and market life'),wood='#69523c',plank='#a18d67';
  for(const d of THOTH_DECKS){
    const dx=d.b.x-d.a.x,dz=d.b.z-d.a.z,len=Math.hypot(dx,dz),nx=-dz/len,nz=dx/len,n=Math.ceil(len/.85);
    const at=(t,s=0)=>[d.a.x+dx*t+nx*s,d.y0+(d.y1-d.y0)*t,d.a.z+dz*t+nz*s];
    for(let i=0;i<n;i++){const a=at(i/n),c=at((i+1)/n);b.sheet(i%3?'#a59373':plank,[a[0]-nx*d.width/2,a[1],a[2]-nz*d.width/2],[c[0]-nx*d.width/2,c[1],c[2]-nz*d.width/2],[c[0]+nx*d.width/2,c[1],c[2]+nz*d.width/2],[a[0]+nx*d.width/2,a[1],a[2]+nz*d.width/2]);}
    for(const side of [-1,1]){
      const a=at(0,side*(d.width/2-.2)),c=at(1,side*(d.width/2-.2));b.beam(wood,[a[0],a[1]-.25,a[2]],[c[0],c[1]-.25,c[2]],.36,.45);
      for(let dist=4;dist<len-2;dist+=10){const p=at(dist/len,side*(d.width/2-.35)),lo=Math.min(p[1]-.5,heightAt(p[0],p[2]))-.5;b.block('#8c998e',p[0],lo,p[2],.7,p[1]-lo+.10,.7);}
      if(d.id==='bridge'){
        const aa=at(3/len,side*3),cc=at(1-3/len,side*3);
        for(const yy of [.45,1.12])b.beam(wood,[aa[0],aa[1]+yy,aa[2]],[cc[0],cc[1]+yy,cc[2]],.16);
        for(let dist=3;dist<len-2;dist+=3){const p=at(dist/len,side*3);b.block(wood,p[0],p[1],p[2],.22,1.2,.22);}
        colliders.push({x:(aa[0]+cc[0])/2,z:(aa[2]+cc[2])/2,hx:Math.abs(cc[0]-aa[0])/2+.13,hz:Math.abs(cc[2]-aa[2])/2+.13,minY:d.y0,maxY:d.y0+1.3,kind:'wall'});
      }
    }
  }
  const well=thothPoint(24,-61),wy=surface(well.x,well.z)+.17;
  for(let j=0;j<12;j++){const a=j*Math.PI/6;b.block('#98a399',well.x+Math.cos(a)*1.05,wy,well.z+Math.sin(a)*1.05,.56,.8,.52,a);}
  for(const side of [-1,1])b.block(wood,well.x+side*1.25,wy,well.z,.18,2.6,.18);
  b.roof('#65715e',well.x,wy+2.6,well.z,3.4,3.3,1.6);b.cylinder(wood,well.x,wy+.3,well.z,.35,.45);
  colliders.push({x:well.x,z:well.z,r:1.4,minY:wy,maxY:wy+4.3,kind:'building'});
  for(const [i,[u,v]] of [[5,-66],[6,-53],[33,-69],[35,-52]].entries()){
    const p=thothPoint(u,v),y=surface(p.x,p.z)+.16;
    b.block(wood,p.x,y,p.z,3.6,.85,1.8);b.roof(i%2?'#8c5944':'#7a8a6a',p.x,y+2.3,p.z,4.4,3.2,1);
    for(const side of [-1,1])b.block(wood,p.x+side*1.8,y,p.z,.12,2.3,.12);
    for(let j=0;j<4;j++)b.rock(i%2?'#b49155':'#9aab72',p.x-1.2+j*.8,y+1.05,p.z,.28,.20,.25);
    colliders.push({x:p.x,z:p.z,hx:1.9,hz:1,minY:y,maxY:y+2,kind:'building'});
  }
  // Small river craft fit this inland watercourse; no ocean warships here.
  for(const p of THOTH_BOATS){
    const water=outerWaterAt(p.x,p.z);if(water===null)continue;
    b.frame(p.x,water+.08,p.z,p.yaw,()=>{
      const w=.7,l=3.1;b.sheet('#90734e',[-w*.65,0,-l*.7],[-w*.65,0,l*.7],[w*.65,0,l*.7],[w*.65,0,-l*.7]);
      for(const side of [-1,1]){
        b.sheet('#73543d',[side*w*.65,0,-l*.7],[side*w,.65,-l*.7],[side*w,.65,l*.7],[side*w*.65,0,l*.7]);
        for(const end of [-1,1])b.sheet('#836245',[side*w*.65,0,end*l*.7],[side*w,.65,end*l*.7],[0,1,end*l],[0,0,end*l]);
        b.beam(wood,[side*w,.65,-l*.7],[side*w,.65,l*.7],.10);
      }
      for(const v of [-1.1,0,1.1])b.block(plank,0,.45,v,1.25,.1,.32);b.beam(plank,[-1.1,.9,-.8],[1.1,.7,.9],.08);
    });metrics.boats++;
  }
  const gardenTrees=[];
  for(const [u,v] of [[-76,-100],[95,-105],[-96,102],[108,73],[-110,-14],[64,-129],[113,-6]]){
    const p=thothPoint(u,v);if((outerWaterSample(p.x,p.z)?.distance??Infinity)<12||thothLaneDistance(p.x,p.z)<5||thothMarketClear(p.x,p.z,3)||colliders.some(c=>Math.abs(c.x-p.x)<(c.hx??c.r??0)+4&&Math.abs(c.z-p.z)<(c.hz??c.r??0)+4))continue;
    const y=surface(p.x,p.z);
    gardenTrees.push({id:worldTreeId('thoth'+'-garden',p.x,p.z),species:'silver-birch',x:p.x,z:p.z,y,height:9.4,crownRadius:2.8,trunkRadius:.23,harvestable:false,region:'thoth',protectedReason:'A planted town tree.'});
  }
  const planted=yield* createSpeciesTreesSteps({parent:root,colliders,trees:gardenTrees,heightAt:surface,name:'Town garden trees',chunkSize:512});metrics.batches+=planted.batches;
  yield* b.finishSteps(root);metrics.batches++;root.userData.thoth=metrics;return {root,metrics,update:()=>{}};
}
export function* createThothReviewWaterSteps({parent}){
  const b=createSceneryBuilder('Thoth review water'),box=THOTH_FINE;
  for(const r of OUTER_RIVERS)for(let i=1;i<r.points.length;i++){
    const a=r.points[i-1],c=r.points[i];if(Math.max(a.x,c.x)<box.x-40||Math.min(a.x,c.x)>box.x+box.w+40||Math.max(a.z,c.z)<box.z-40||Math.min(a.z,c.z)>box.z+box.d+40)continue;
    const len=Math.hypot(c.x-a.x,c.z-a.z),dx=-(c.z-a.z)/len*r.width,dz=(c.x-a.x)/len*r.width;
    b.sheet('#688e89',[a.x-dx,a.y,a.z-dz],[c.x-dx,c.y,c.z-dz],[c.x+dx,c.y,c.z+dz],[a.x+dx,a.y,a.z+dz]);
    for(let j=0;j<12;j++){const aa=j*Math.PI/6,cc=(j+1)*Math.PI/6;b.triangle('#688e89',[a.x,a.y,a.z],[a.x+Math.cos(cc)*r.width,a.y,a.z+Math.sin(cc)*r.width],[a.x+Math.cos(aa)*r.width,a.y,a.z+Math.sin(aa)*r.width]);}yield;
  }
  return yield* b.finishSteps(parent,{castShadow:false});
}
