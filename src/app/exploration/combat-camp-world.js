import * as THREE from 'three';
import {MENORA_CAMP,menoraDeckHeight} from '../../content/regions/minora-frontier/menora-city.js';
import {createMenoraScenerySteps} from '../../content/regions/minora-frontier/menora-scenery.js';
import {groundWithRiver,groundTint} from '../../world/terrain/world-terrain.js';
import {regionAt} from '../../world/terrain/region-world.js';
import {westWaterSurface} from '../../content/regions/western-regions/west-ground.js';
import {createColliderGrid} from '../../world/collision/collider-grid.js';
import {createRegionLoading} from '../../world/loading/region-loading.js';
import {createStartup} from '../startup/startup.js';

// A bounded view of the real Minora camp, using its authored scenery, terrain
// queries and collision. No global world assembly or regional fine-ground job.
export const CAMP_RADIUS=60;
export const campGroundHeight=groundWithRiver;
export const campHeightAt=(x,z)=>menoraDeckHeight(x,z)??campGroundHeight(x,z);
const inCamp=(x,z)=>Math.hypot(x-MENORA_CAMP.x,z-MENORA_CAMP.z)<=CAMP_RADIUS;
const axis=centre=>Array.from(new Set([
  ...Array.from({length:61},(_,i)=>-480+i*16),
  ...Array.from({length:41},(_,i)=>-80+i*4),
])).sort((a,b)=>a-b).map(n=>n+centre);

export function* buildCampGround(root){
  const xs=axis(MENORA_CAMP.x),zs=axis(MENORA_CAMP.z),positions=[],colors=[],indices=[];
  const tint=new THREE.Color();
  for(let j=0;j<zs.length;j++){
    for(let i=0;i<xs.length;i++){
      const x=xs[i],z=zs[j];positions.push(x,campGroundHeight(x,z),z);
      groundTint(tint,x,z,THREE);colors.push(tint.r,tint.g,tint.b);
      if(i&&j){const n=j*xs.length+i;indices.push(n-xs.length-1,n-1,n-xs.length,n-xs.length,n-1,n);}
    }
    yield;
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  const ground=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,flatShading:true}));
  ground.name='Minora camp ground and nearby horizon';root.add(ground);
  return {vertices:positions.length/3};
}

export async function loadCombatCampWorld(scene,onProgress){
  const startup=createStartup({onProgress}),root=new THREE.Group(),colliders=[];
  root.name='Combat Testing: Minora camp';scene.add(root);
  let grid=createColliderGrid(colliders);
  const loading=createRegionLoading({initialRegions:[16],regionAt,nearbyOnly:true});loading.setTravelBudget(16);
  loading.register({id:'minora-camp-ground',regions:[16],steps:function*(){startup.stage('Preparing Minora camp ground');return yield* buildCampGround(root);}});
  loading.register({id:'minora-camp-scenery',regions:[16],dependencies:['minora-camp-ground'],steps:function*(){
    startup.stage('Preparing Minora tents and city walls');
    const scenery=yield* createMenoraScenerySteps({parent:root,heightAt:campGroundHeight,colliders});
    grid=createColliderGrid(colliders);return scenery;
  }});
  await loading.ensureRegion(16);loading.stop();startup.ready();
  const prepare=async id=>{if(id!==16)throw Error('Combat Testing loads the Minora camp only.');await loading.ensureRegion(id);};
  return {
    root,colliders,loading,startup:startup.record,enabledRegions:[16],regionAt,
    bounds:{minX:MENORA_CAMP.x-CAMP_RADIUS,maxX:MENORA_CAMP.x+CAMP_RADIUS,minZ:MENORA_CAMP.z-CAMP_RADIUS,maxZ:MENORA_CAMP.z+CAMP_RADIUS},
    heightAt:campHeightAt,waterAt:(x,z)=>westWaterSurface(x,z)??.45,
    nearColliders:(x,z,r)=>grid.near(x,z,r),reindexColliders:()=>{grid=createColliderGrid(colliders);},landmarks:[],paths:[],
    canExploreAt:inCamp,readyAt:(x,z)=>inCamp(x,z)&&loading.isReady(16),
    prepareRegion:prepare,prefetchRegion:prepare,prepare:async(x,z)=>{if(!inCamp(x,z))throw Error('Outside the combat camp.');await prepare(16);},
    update(){},stop(){loading.stop();},
  };
}
