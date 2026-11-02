import {createSpeciesTreesSteps} from '../../../world/scenery/species-trees.js';
import {worldTreeId} from '../../../world/scenery/tree-registry.js';
import * as THREE from 'three';
import {createSceneryBuilder} from '../../../world/scenery/scenery-builder.js';
import {createSettlementGroundSteps} from '../../../world/scenery/settlement-ground.js';
import {finishBuild} from '../../../world/loading/build-steps.js';
import {outerTint,outerWaterAt,OUTER_RIVERS} from '../outer-regions/outer-regions-world.js';
import {ORSA_FINE,ORSA_DECKS,ORSA_LANES,orsaPoint,orsaDeckHeight,orsaLaneDistance} from './orsa-town-layout.js';
import {ORSA_BUILDINGS,ORSA_BOATS,orsaTownTint} from './orsa-town-buildings.js';
import {orsaHouse,orsaBoat} from './orsa-town-architecture.js';

export const createOrsaTownScenery=kit=>finishBuild(createOrsaTownScenerySteps(kit));
export function* createOrsaTownScenerySteps({parent,heightAt,colliders=[]}){
  const root=new THREE.Group();root.name='Orsa Town / river mouth';parent.add(root);
  const metrics={buildings:0,bridges:1,quays:2,boats:0,batches:0};
  const ground=yield* createSettlementGroundSteps({parent:root,box:ORSA_FINE,heightAt,spacing:1.5,tintAt:(x,z)=>orsaTownTint(x,z)??outerTint(x,z),name:'Orsa waterfront ground'});
  const surface=ground.surfaceAt;metrics.batches++;
  const roads=createSceneryBuilder('Orsa / narrow lanes');
  for(const line of ORSA_LANES)for(let i=1;i<line.length;i++){
    const a=line[i-1],b=line[i],length=Math.hypot(b.x-a.x,b.z-a.z),n=Math.ceil(length/2),yaw=Math.atan2(b.x-a.x,b.z-a.z);
    for(let j=0;j<n;j++){
      const x=a.x+(b.x-a.x)*(j+.5)/n,z=a.z+(b.z-a.z)*(j+.5)/n;
      if(outerWaterAt(x,z)!==null||heightAt(x,z)<1||orsaDeckHeight(x,z)!==null)continue;
      yield* roads.patchSteps('#b5ad90',surface,x,z,3.9,2.4,yaw,.08,3);
    }
  }
  yield* roads.finishSteps(root);metrics.batches++;
  const builders=new Map();
  for(const s of ORSA_BUILDINGS){
    const key=Math.floor(s.x/60)+','+Math.floor(s.z/60);
    if(!builders.has(key))builders.set(key,createSceneryBuilder('Orsa timber houses / '+key));
    orsaHouse(builders.get(key),s,heightAt,colliders);metrics.buildings++;yield;
  }
  for(const b of builders.values()){yield* b.finishSteps(root);metrics.batches++;}
  const b=createSceneryBuilder('Orsa / bridge and fishing waterfront'),wood='#66513c',plank='#a08a64';
  for(const d of ORSA_DECKS){
    const dx=d.b.x-d.a.x,dz=d.b.z-d.a.z,length=Math.hypot(dx,dz),nx=-dz/length,nz=dx/length,n=Math.ceil(length/.8);
    const at=(t,side=0)=>[d.a.x+dx*t+nx*side,d.y0+(d.y1-d.y0)*t,d.a.z+dz*t+nz*side];
    for(let j=0;j<n;j++){
      const aa=at(j/n),cc=at((j+1)/n);
      b.sheet(j%3===0?'#958363':plank,[aa[0]-nx*d.width/2,aa[1],aa[2]-nz*d.width/2],[cc[0]-nx*d.width/2,cc[1],cc[2]-nz*d.width/2],[cc[0]+nx*d.width/2,cc[1],cc[2]+nz*d.width/2],[aa[0]+nx*d.width/2,aa[1],aa[2]+nz*d.width/2]);
    }
    for(const side of [-1,1]){
      const a=at(0,side*(d.width/2-.2)),c=at(1,side*(d.width/2-.2));
      b.beam(wood,[a[0],a[1]-.24,a[2]],[c[0],c[1]-.24,c[2]],.3,.42);
      for(let dist=2;dist<length-1;dist+=d.id==='bridge'?12:5){
        const p=at(dist/length,side*(d.width/2-.3)),base=Math.min(heightAt(p[0],p[2]),p[1]-.7)-.8;
        b.cylinder(wood,p[0],base,p[2],.22,p[1]-base+.28);
      }
      if(d.id==='bridge'){
        const a=at(3/length,side*2.85),c=at(1-3/length,side*2.85);
        for(const yy of [.45,1.1])b.beam(wood,[a[0],a[1]+yy,a[2]],[c[0],c[1]+yy,c[2]],.16);
        for(let dist=3;dist<length-2;dist+=3){const p=at(dist/length,side*2.85);b.block(wood,p[0],p[1],p[2],.2,1.2,.2);}
        colliders.push({x:(a[0]+c[0])/2,z:(a[2]+c[2])/2,hx:Math.abs(c[0]-a[0])/2+.12,hz:Math.abs(c[2]-a[2])/2+.12,minY:d.y0,maxY:d.y0+1.3,kind:'wall'});
      }
    }
  }
  // Stockfish racks and small nets distinguish the working shore from the hall.
  for(const [u,v] of [[-3,81],[6,86],[15,85],[13,-57]]){
    const p=orsaPoint(u,v),y=surface(p.x,p.z);
    for(const side of [-1,1])b.block(wood,p.x+side*2.5,y,p.z,.18,3.1,.18);
    b.beam(wood,[p.x-2.7,y+3,p.z],[p.x+2.7,y+3,p.z],.2);
    for(let j=0;j<8;j++){
      const x=p.x-2.2+j*.62;
      b.beam('#8b8770',[x,y+2.95,p.z],[x,y+2.1,p.z],.028);
      b.rock('#b5b39e',x,y+1.65,p.z,.12,.48,.13);
    }
  }
  for(const [u,v] of [[7,-48],[7,-46],[-50,72],[-50,74],[30,55],[32,55],[28,-18]]){
    const p=orsaPoint(u,v),y=orsaDeckHeight(p.x,p.z)??surface(p.x,p.z);
    b.cylinder('#92704a',p.x,y,p.z,.4,.85);
    for(const yy of [.15,.65])b.cylinder('#434b46',p.x,y+yy,p.z,.42,.06);
  }
  for(const [u,v] of [[31,55],[37,56]]){
    const p=orsaPoint(u,v),y=surface(p.x,p.z);
    b.block(wood,p.x,y,p.z,3.7,.85,1.6);
    b.roof('#647c76',p.x,y+2.4,p.z,4.2,2.6,.7,0,'#647c76');
    for(const dx of [-1.8,1.8])b.block(wood,p.x+dx,y,p.z,.12,2.4,.12);
    for(let j=0;j<5;j++)b.rock('#acb3a2',p.x-1.4+j*.6,y+.94,p.z,.27,.10,.15);
  }
  for(const s of ORSA_BOATS){orsaBoat(b,s);metrics.boats++;}
  const gardenTrees=[];
  for(const [u,v] of [[139,-32],[128,-60],[127,111],[48,116],[-25,104],[148,74],[110,-64]]){
    const p=orsaPoint(u,v),y=surface(p.x,p.z);
    if(y<2||outerWaterAt(p.x,p.z)!==null||orsaLaneDistance(p.x,p.z)<5||orsaDeckHeight(p.x,p.z)!==null||colliders.some(c=>Math.abs(c.x-p.x)<(c.hx??0)+4&&Math.abs(c.z-p.z)<(c.hz??0)+4))continue;
    gardenTrees.push({id:worldTreeId('orsa'+'-garden',p.x,p.z),species:'silver-fir',x:p.x,z:p.z,y,height:9.1,crownRadius:2.8,trunkRadius:.23,harvestable:false,region:'orsa',protectedReason:'A planted town tree.'});
  }
  const planted=yield* createSpeciesTreesSteps({parent:root,colliders,trees:gardenTrees,heightAt:surface,name:'Town garden trees',chunkSize:512});metrics.batches+=planted.batches;
  yield* b.finishSteps(root);metrics.batches++;
  root.userData.orsa=metrics;return {root,metrics,update:()=>{}};
}
export function* createOrsaReviewWaterSteps({parent}){
  const b=createSceneryBuilder('Orsa review stream');
  for(const r of OUTER_RIVERS.filter(r=>r.orsa))for(let i=1;i<r.points.length;i++){
    const a=r.points[i-1],c=r.points[i],length=Math.hypot(c.x-a.x,c.z-a.z),dx=-(c.z-a.z)/length*r.width,dz=(c.x-a.x)/length*r.width;
    b.sheet('#688e89',[a.x-dx,a.y,a.z-dz],[c.x-dx,c.y,c.z-dz],[c.x+dx,c.y,c.z+dz],[a.x+dx,a.y,a.z+dz]);
    for(let j=0;j<12;j++){const aa=j*Math.PI/6,cc=(j+1)*Math.PI/6;b.triangle('#688e89',[a.x,a.y,a.z],[a.x+Math.cos(cc)*r.width,a.y,a.z+Math.sin(cc)*r.width],[a.x+Math.cos(aa)*r.width,a.y,a.z+Math.sin(aa)*r.width]);}yield;
  }
  return yield* b.finishSteps(parent,{castShadow:false});
}
