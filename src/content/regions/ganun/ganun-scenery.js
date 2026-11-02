import * as THREE from 'three';
import {createSceneryBuilder} from '../../../world/scenery/scenery-builder.js';
import {createSpeciesTreesSteps} from '../../../world/scenery/species-trees.js';
import {worldTreeId} from '../../../world/scenery/tree-registry.js';
import {hexOwnerAt} from '../../../world/terrain/region-world.js';
import {createSettlementGroundSteps} from '../../../world/scenery/settlement-ground.js';
import {finishBuild} from '../../../world/loading/build-steps.js';
import {cityLantern,stripedAwning} from '../../../world/scenery/city-detail.js';
import {outerTint,outerWaterAt,OUTER_RIVERS} from '../outer-regions/outer-regions-world.js';
import {GANUN_FINE,GANUN_ROADS,GANUN_BRIDGES,GANUN_QUAYS,bridgePoint,quayHeight} from './ganun-layout.js';
import {GANUN_BUILDINGS,GANUN_MARKET,ganunTint} from './ganun-town.js';
import {ganunHouse,GANUN_PALETTE as P} from './ganun-architecture.js';

export const createGanunScenery=options=>finishBuild(createGanunScenerySteps(options));
export function* createGanunScenerySteps({parent,heightAt,colliders=[]}){
  const root=new THREE.Group();root.name='Ganun Town / estuary market';parent.add(root);
  const metrics={buildings:0,bridges:GANUN_BRIDGES.length,quays:GANUN_QUAYS.length,boats:0,batches:0};
  const ground=yield* createSettlementGroundSteps({parent:root,box:GANUN_FINE,heightAt,tintAt:(x,z)=>ganunTint(x,z)??outerTint(x,z),name:'Ganun estuary ground'});metrics.batches++;
  const streets=createSceneryBuilder('Ganun / market square and lanes'),surface=ground.surfaceAt;
  const m=GANUN_MARKET;yield* streets.patchSteps('#bbb4a1',surface,m.x,m.z,m.w,m.d,0,.22,32);
  for(const line of GANUN_ROADS)for(let i=1;i<line.length;i++){
    const a=line[i-1],b=line[i],length=Math.hypot(b.x-a.x,b.z-a.z),n=Math.ceil(length/3),yaw=Math.atan2(b.x-a.x,b.z-a.z);
    for(let j=0;j<n;j++){
      const x=a.x+(b.x-a.x)*(j+.5)/n,z=a.z+(b.z-a.z)*(j+.5)/n;
      if(outerWaterAt(x,z)!==null||heightAt(x,z)<1)continue;
      yield* streets.patchSteps('#b7aa8b',surface,x,z,6,3.6,yaw,.16,4);
    }
  }
  // Low paving bands frame a usable square, with the tall hall at its centre.
  for(const side of [-1,1])yield* streets.patchSteps('#969d91',surface,m.x+side*(m.w/2-1),m.z,1.2,m.d,0,.26,30);
  yield* streets.finishSteps(root);metrics.batches++;
  const districts=new Map();
  for(const s of GANUN_BUILDINGS){
    const key=`${Math.floor(s.x/90)},${Math.floor(s.z/90)}`;if(!districts.has(key))districts.set(key,createSceneryBuilder('Ganun buildings / '+key));
    ganunHouse(districts.get(key),s,heightAt,colliders);metrics.buildings++;yield;
  }
  for(const b of districts.values()){yield* b.finishSteps(root);metrics.batches++;}
  const detail=createSceneryBuilder('Ganun / market furniture and craft');
  for(let i=0;i<6;i++){
    const x=1549+i*5.3,z=-2418,y=surface(x,z)+.24;
    detail.block(P.oak,x,y,z,3.5,.8,1.8);stripedAwning(detail,{...P,cloth:i%2?'#59756e':P.cloth},x,y+2.8,z-1,4.2,2.7);
    for(const side of [-1,1])detail.block(P.oak,x+side*1.85,y,z+1.6,.12,2.65,.12);
    for(let j=0;j<3;j++){detail.cylinder('#a08b57',x+(j-1)*.9,y+.82,z,.33,.35);detail.rock(i%2?'#b5a56a':'#9b7149',x+(j-1)*.9,y+1.2,z,.27,.19,.26);}
  }
  const wx=1553,wz=-2440,wy=surface(wx,wz)+.23;
  detail.cylinder(P.stone,wx,wy,wz,1.7,.9);detail.cylinder(P.dark,wx,wy+.91,wz,1.15,.02);
  for(const side of [-1,1])detail.block(P.oak,wx+side*1.8,wy,wz,.24,3.7,.24);
  detail.roof(P.tile,wx,wy+3.6,wz,4.4,3.2,1.8);
  colliders.push({x:wx,z:wz,r:1.8,minY:wy,maxY:wy+1.1,kind:'building'});
  for(const [x,z] of [[1543,-2456],[1593,-2456],[1543,-2415],[1593,-2415]]){
    const y=surface(x,z);detail.block(P.stone,x,y,z,.7,.7,.7);detail.block(P.oak,x,y+.7,z,.16,3.3,.16);cityLantern(detail,P,x,y+4,z,.8);
  }
  // A few silver birches soften the brick skyline; all stand
  // outside the roads, square, bridge approaches and building footprints.
  const trees=[];
  for(const [x,z] of [[1539,-2449],[1557,-2476],[1697,-2458],[1570,-2287],[1662,-2301]]){
    if(outerWaterAt(x,z)!==null||heightAt(x,z)<2||GANUN_BUILDINGS.some(s=>Math.abs(x-s.x)<s.w/2+5&&Math.abs(z-s.z)<s.d/2+5))continue;
    const y=heightAt(x,z);trees.push({id:worldTreeId('ganun-town-birch',x,z),species:'silver-birch',x,z,y,height:9.1,crownRadius:3.5,trunkRadius:.24,collisionRadius:.27,collisionMinY:y,collisionMaxY:y+5,
      region:hexOwnerAt(x,z),habitat:'garden',locationName:'Ganun Town gardens',harvestable:false});
  }
  yield* detail.finishSteps(root);metrics.batches++;
  const treeView=yield* createSpeciesTreesSteps({parent:root,colliders,trees,heightAt,chunkSize:1e6,name:'Ganun / garden birches'});metrics.trees=trees.length;metrics.batches+=treeView.batches;
  const harbor=createSceneryBuilder('Ganun / bridgework, landings and shipping');
  for(const b of GANUN_BRIDGES){
    harbor.block('#9b8e70',b.x,b.y-.35,b.z,b.axis==='x'?b.length:b.width,.35,b.axis==='z'?b.length:b.width);
    const spans=b.axis==='x'?[[-26,-16],[-8,26]]:[[-26,10],[20,26]];
    for(const side of [-1,1])for(const [lo,hi] of spans){
      const a=bridgePoint(b,lo,side*(b.width/2+.12)),c=bridgePoint(b,hi,side*(b.width/2+.12));
      harbor.beam(P.oak,[a.x,b.y+1,a.z],[c.x,b.y+1,c.z],.18);
      const n=Math.ceil((hi-lo)/3);for(let i=0;i<=n;i++){const p=bridgePoint(b,lo+(hi-lo)*i/n,side*(b.width/2+.12));harbor.block(P.oak,p.x,b.y,p.z,.24,1.18,.24);}
      colliders.push({x:(a.x+c.x)/2,z:(a.z+c.z)/2,hx:b.axis==='x'?(hi-lo)/2:.16,hz:b.axis==='z'?(hi-lo)/2:.16,minY:b.y,maxY:b.y+1.2,kind:'wall'});
    }
    for(const u of [-19,19]){const p=bridgePoint(b,u),y=heightAt(p.x,p.z);harbor.block(P.stone,p.x,y,p.z,b.axis==='x'?2.7:b.width,Math.max(.3,b.y-y-.4),b.axis==='z'?2.7:b.width);}
    for(let u=-b.length/2;u<b.length/2;u+=1){const p=bridgePoint(b,u);harbor.block('#776c56',p.x,b.y+.006,p.z,b.axis==='x'?.035:b.width,.008,b.axis==='z'?.035:b.width);}
  }
  for(const q of GANUN_QUAYS){
    for(let v=-q.d/2;v<q.d/2;v+=1){
      const z=q.z+v,y=quayHeight(q,z),yy=quayHeight(q,z+1);
      harbor.sheet('#9b8969',[q.x-q.w/2,y,z],[q.x-q.w/2,yy,z+1],[q.x+q.w/2,yy,z+1],[q.x+q.w/2,y,z]);
    }
    for(const side of [-1,1])for(let u=-q.w/2+1;u<q.w/2;u+=4){const x=q.x+u,z=q.z+side*(q.d/2-.4);harbor.cylinder(P.oak,x,-2,z,.22,quayHeight(q,z)+2.5);}
    if(q.w<10)for(const side of [-1,1])for(let z=q.z-q.d/2+2;z<q.z+q.d/2;z+=4)harbor.cylinder(P.oak,q.x+side*(q.w/2-.3),-2,z,.22,quayHeight(q,z)+2.5);
  }
  for(const [x,z] of [[1578,-2328],[1584,-2328],[1623,-2328],[1636,-2376]]){
    const q=GANUN_QUAYS.find(q=>Math.abs(x-q.x)<=q.w/2&&Math.abs(z-q.z)<=q.d/2),y=q?quayHeight(q,z):heightAt(x,z);
    for(let i=0;i<3;i++){harbor.cylinder('#9a7850',x+(i-1)*.95,y,z,.4,.9);harbor.cylinder(P.metal,x+(i-1)*.95,y+.2,z,.42,.08);harbor.cylinder(P.metal,x+(i-1)*.95,y+.68,z,.42,.08);}
  }
  function boat(x,z,length,yaw,sail){
    const water=outerWaterAt(x,z)??.06,w=length*.18;
    harbor.frame(x,water+.12,z,yaw,()=>{
      harbor.sheet('#80653f',[-w*.8,0,-length*.4],[-w*.8,0,length*.25],[w*.8,0,length*.25],[w*.8,0,-length*.4]);
      for(const side of [-1,1]){
        harbor.sheet('#654b34',[side*w*.8,0,-length*.4],[side*w,1,-length*.4],[side*w,1,length*.3],[side*w*.8,0,length*.25]);
        harbor.sheet('#90683d',[side*w*.8,0,length*.25],[side*w,1,length*.3],[0,1.5,length*.53],[0,0,length*.42]);
        harbor.beam(P.oak,[side*w,1.02,-length*.4],[side*w,1.02,length*.3],.15);
      }
      harbor.sheet('#7d5836',[-w*.8,0,-length*.4],[w*.8,0,-length*.4],[w,1,-length*.4],[-w,1,-length*.4]);
      for(const v of [-.2,0,.2])harbor.block('#af9260',0,.6,length*v,w*1.75,.13,.55);
      if(sail){
        harbor.cylinder(P.oak,0,0,0,.16,length*.85);harbor.beam(P.oak,[-w*1.6,length*.72,0],[w*1.6,length*.72,0],.14);
        harbor.sheet('#d4c7a7',[-w*1.5,length*.71,0],[w*1.5,length*.71,0],[w*1.3,length*.34,.5],[-w*1.3,length*.34,.5]);
        for(const side of [-1,1])harbor.beam('#a49976',[0,length*.82,0],[side*w,1,-length*.38],.04);
      }
    });metrics.boats++;
  }
  boat(1650,-2387,7,0,false);boat(1580,-2348,7,Math.PI/2,false);boat(1623,-2353,7,1.9,false);boat(1689,-2344,10,Math.PI/3,true);boat(1719,-2318,13,.8,true);
  yield* harbor.finishSteps(root);metrics.batches++;
  root.userData.ganun=metrics;return {root,metrics,update:()=>{}};
}

/** Save-free reviewer uses the same river courses as the production renderer,
 * avoiding the stepped flat-water grid used for isolated lakes. */
export function* createGanunReviewWaterSteps({parent}){
  const b=createSceneryBuilder('Ganun review river');
  for(const r of OUTER_RIVERS.filter(r=>r.ganun))for(let i=1;i<r.points.length;i++){
    const a=r.points[i-1],c=r.points[i];if(a.z< -2570&&c.z< -2570)continue;
    const n=Math.hypot(c.x-a.x,c.z-a.z),dx=-(c.z-a.z)/n*r.width*.96,dz=(c.x-a.x)/n*r.width*.96;
    b.sheet('#688e89',[a.x-dx,a.y,a.z-dz],[c.x-dx,c.y,c.z-dz],[c.x+dx,c.y,c.z+dz],[a.x+dx,a.y,a.z+dz]);yield;
  }
  return yield* b.finishSteps(parent,{castShadow:false});
}
