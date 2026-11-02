import * as THREE from 'three';
import {createSceneryBuilder} from '../../../world/scenery/scenery-builder.js';
import {createSpeciesTreesSteps} from '../../../world/scenery/species-trees.js';
import {selemisHouseSteps} from '../selamus/selamus-scenery.js';
import {COASTAL_VILLAGES,COASTAL_HOMES} from './coastal-villages.js';

export function* createCoastalVillageSteps({parent,heightAt,colliders}){
  const root=new THREE.Group();root.name='Ascarth villages facing Selemis';parent.add(root);
  const walkSurfaces=[],mapFeatures=[],trees=[];
  const metrics={buildings:0,windows:0,columns:0,balconies:0,arcades:0,chimneys:0,batches:0,vertices:0};
  for(const village of COASTAL_VILLAGES){
    const b=createSceneryBuilder(`Coastal village ${village.id}`);
    // A clear cross lane and a small stone well serve each group of homes.
    for(const [w,d] of [[62,5],[5,38]])yield* b.patchSteps('#cbbd97',heightAt,village.x,village.z,w,d,0,.07,16);
    const wz=village.z+4.5,wy=heightAt(village.x+7,wz);
    b.cylinder('#b2a587',village.x+7,wy,wz,1.4,.85);
    b.cylinder('#35443e',village.x+7,wy+.86,wz,.95,.03);
    colliders.push({id:`coast-${village.id}-well`,x:village.x+7,z:wz,r:1.4,minY:wy,maxY:wy+.9,kind:'well'});
    for(const [dx,dz] of [[-28,-5],[27,5]]){
      const x=village.x+dx,z=village.z+dz,y=heightAt(x,z);
      b.cylinder('#b2a587',x,y,z,1.7,.5);
      trees.push({id:`coast-${village.id}-tree-${dx}`,species:'holm-oak',x,z,y:y+.5,height:6.4,crownRadius:2.2,trunkRadius:.23,collisionRadius:1.7,collisionMinY:y,collisionMaxY:y+7,
        region:'Southern Ascarth',habitat:'village green',locationName:`${village.id} coastal village`,harvestable:false});
    }
    for(const home of COASTAL_HOMES.filter(h=>h.village===village.id)){
      const corners=[-1,1].flatMap(sx=>[-1,1].map(sz=>heightAt(home.x+sx*home.width/2,home.z+sz*home.depth/2)));
      const y=Math.max(...corners)+.08,low=Math.min(...corners)-.25;
      b.block('#b0a48a',home.x,low,home.z,home.width+.2,y-low,home.depth+.2);
      yield* selemisHouseSteps(b,home,y,colliders,metrics);
      // The raised foundation is also the porch floor. Put a short approach
      // between columns, with identical rendered and walkable ramp endpoints.
      const c=Math.cos(home.yaw),s=Math.sin(home.yaw),at=(x,z,h)=>({x:home.x+x*c+z*s,y:h,z:home.z-x*s+z*c});
      const front=-home.depth/2,porch=Math.min(3,home.depth*.24),floor=y+.04;
      const bays=Math.max(2,Math.floor(home.width/3.2)),span=(home.width-.8)/bays;
      const entry=-home.width/2+.4+(Math.floor(bays/2)+.5)*span;
      const foot=at(entry,front-4,0);foot.y=heightAt(foot.x,foot.z)+.07;
      const top=at(entry,front+.12,floor),width=1.5;
      const edge=(p,side)=>[p.x+c*width/2*side,p.y,p.z-s*width/2*side];
      b.quad('#c6b89a',edge(foot,-1),edge(top,-1),edge(top,1),edge(foot,1));
      b.frame(home.x,0,home.z,home.yaw,()=>b.block('#c6b89a',0,floor-.06,front+porch/2,home.width,.06,porch));
      walkSurfaces.push({id:`${home.id}:approach`,kind:'ramp',a:foot,b:top,width},
        {id:`${home.id}:porch`,kind:'deck',a:at(0,front-.02,floor),b:at(0,front+porch-.12,floor),width:home.width-.3});
      const road={x:foot.x,z:village.z},length=Math.abs(foot.z-road.z);
      if(length>.1)yield* b.patchSteps('#cbbd97',heightAt,foot.x,(foot.z+road.z)/2,1.7,length,0,.07,6);
      mapFeatures.push({id:home.id,name:home.name,kind:'building',x:home.x,z:home.z,width:home.width,depth:home.depth,angle:home.yaw});
      metrics.buildings++;yield;
    }
    metrics.vertices+=b.vertexCount;yield* b.finishSteps(root);metrics.batches++;
  }
  const treeView=yield* createSpeciesTreesSteps({parent:root,colliders,trees,heightAt:(x,z)=>heightAt(x,z)+.5,chunkSize:1e6,name:'Ascarth / coastal village oaks'});
  metrics.trees=trees.length;metrics.batches+=treeView.batches;metrics.vertices+=treeView.vertices;
  return {root,metrics,walkSurfaces,mapFeatures};
}
