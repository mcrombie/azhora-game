import * as THREE from 'three';
import {createSceneryBuilder} from '../../../world/scenery/scenery-builder.js';
import {FRONTIER_SITES,FRONTIER_ROUTES,OREMINDI_HOLDS,KUDAN_FIELDS,frontierBuildings,frontierRouteSample} from './oremindi-frontier-layout.js';
import {frontierBuilding,frontierBanner} from './oremindi-frontier-architecture.js';

/** Small separately culled batches; static occupation scenery, not army AI. */
export function* createOremindiFrontierSteps({parent,heightAt,renderedGroundHeight=heightAt,colliders,region}){
 const root=new THREE.Group();root.name=region+' / frontier settlements';parent.add(root);
 const ground=renderedGroundHeight,sites=FRONTIER_SITES.filter(s=>s.region===region);
 const metrics={buildings:0,ruins:0,fields:0,batches:0,vertices:0,sites:sites.length};
 const finish=function*(b){const m=yield* b.finishSteps(root);if(m){metrics.batches++;metrics.vertices+=m.geometry.attributes.position.count;}};
 // Paths use the same heightfield as movement, including the restored benches.
 for(const route of FRONTIER_ROUTES.filter(r=>r.region===region)){
  const b=createSceneryBuilder(route.id);
  for(let i=1;i<route.points.length;i++){
   const a=route.points[i-1],c=route.points[i],len=Math.hypot(c.x-a.x,c.z-a.z),n=Math.ceil(len/4),yaw=Math.atan2(c.x-a.x,c.z-a.z);
   for(let j=0;j<n;j++){
    const x=a.x+(c.x-a.x)*(j+.5)/n,z=a.z+(c.z-a.z)*(j+.5)/n;
    yield* b.patchSteps('#96907b',ground,x,z,route.width*.64,len/n+.1,yaw,.08,2);
   }
  }
  yield* finish(b);
 }
 for(const site of sites){
  const b=createSceneryBuilder(site.name),orc=site.kind==='orc',ruin=site.kind==='ruin';
  for(const h of frontierBuildings(site)){
   frontierBuilding(b,h,site,ground,colliders);metrics[ruin?'ruins':'buildings']++;yield;
  }
  if(!ruin){
   const variant=Math.max(0,OREMINDI_HOLDS.indexOf(site));
   // An irregular outer stockade leaves broad gaps at every approach. There
   // are no collision rings across the valley or invisible walls on the road.
   if(orc){
    for(let i=0;i<260;i++){
     const a=i*Math.PI*2/260,rx=site.rx*.88*(1+.035*Math.sin(a*5)),rz=site.rz*.86;
     const x=site.x+Math.cos(a)*rx,z=site.z+Math.sin(a)*rz,p=frontierRouteSample(x,z,region);
     if(p&&p.distance<p.width/2+4)continue;
     const y=ground(x,z),h=2.5+.3*Math.sin(i*2);
     b.stake(i%3?'#5a5240':'#71644b',x,y-.25,z,.48,h,a,.45);
     if(i%9===0)b.beam('#4a4539',[x,y+h*.7,z],[x+Math.cos(a)*1.2,y,z+Math.sin(a)*1.2],.23);
     colliders.push({kind:'wall',x,z,r:.28,minY:y-.3,maxY:y+h+.5});
    }
   }
   // Furnish only free ground beside buildings, keeping the centre traversable.
   const furnishings=frontierBuildings(site).filter(h=>h.kind!=='tent');
   const hall=furnishings.find(h=>h.kind==='hall')??furnishings[0];
   if(hall){
    const x=hall.x+hall.w/2+1,z=hall.z,y=ground(x,z);
    frontierBanner(b,x,z,y,site.accent,variant);
    colliders.push({kind:'banner-post',x,z,r:.18,minY:y,maxY:y+7.4});
   }else if(site.kind==='refuge'){
    const x=site.x-12,z=site.z+7;frontierBanner(b,x,z,ground(x,z),site.accent,0);
   }
   for(const h of furnishings.slice(0,3)){
    const x=h.x-h.w/2-1,z=h.z-1,y=ground(x,z);
    for(let j=0;j<3;j++)b.block('#8b7856',x,y+j*.38,z,1.25,.35,.8);
    colliders.push({kind:'building',x,z,r:.65,minY:y,maxY:y+1.2});
   }
  }
  yield* finish(b);
 }
 for(const f of KUDAN_FIELDS.filter(f=>f.region===region)){
  const b=createSceneryBuilder(f.id);
  yield* b.patchSteps('#8d8057',ground,f.x,f.z,f.w,f.d,0,.075,12);
  for(let x=f.x-f.w/2+1;x<f.x+f.w/2;x+=1.55)for(let z=f.z-f.d/2+1;z<f.z+f.d/2;z+=1.55){
   const y=ground(x,z)+.1;b.beam('#a8a064',[x,y,z],[x+.08,y+.6,z],.045);b.rock('#c1b478',x+.08,y+.6,z,.1,.2,.1);
  }
  for(const side of [-1,1])for(let x=f.x-f.w/2;x<=f.x+f.w/2;x+=2.4){
   const z=f.z+side*f.d/2;b.rock('#8e927b',x,ground(x,z)+.25,z,1.1,.4,.45);
  }
  metrics.fields++;yield* finish(b);
 }
 return {root,metrics,sites};
}
