import * as THREE from 'three';
import {MENORA,MENORA_CAMP} from '../../content/regions/minora-frontier/menora-city.js';
import {createRegionLoading} from '../../world/loading/region-loading.js';
import {createStartup} from '../startup/startup.js';
import {createTrainingScenery} from './training/chamber.js';

// Keep the practice host's coordinate origin stable when changing exercises.
// The Stillroom is isolated scenery, not terrain placed inside the outdoor city.
export function createStillroomPracticeWorld(scene,onProgress){
  const startup=createStartup({onProgress});startup.stage('Opening Taleth’s Stillroom');
  const room=createTrainingScenery(scene),origin=MENORA_CAMP,y=MENORA.elevation;
  room.root.position.set(origin.x,y,origin.z);
  const colliders=room.colliders.map(c=>({...c,x:c.x+origin.x,z:c.z+origin.z,minY:c.minY+y,maxY:c.maxY+y}));
  const regionAt=()=>({id:16,name:'The Stillroom'});
  const loading=createRegionLoading({initialRegions:[16],regionAt,nearbyOnly:true});
  const radius=room.state().radius,inside=(x,z)=>Math.hypot(x-origin.x,z-origin.z)<=radius;
  const prepareRegion=async id=>{if(id!==16)throw Error('This exercise stays in the Stillroom.');};
  startup.ready();
  return {
    root:room.root,colliders,loading,startup:startup.record,enabledRegions:[16],regionAt,
    heightAt:()=>y,waterAt:()=>y-1,nearColliders:()=>colliders,reindexColliders(){},landmarks:[],paths:[],
    canExploreAt:inside,readyAt:inside,prepareRegion,prefetchRegion:prepareRegion,
    async prepare(x,z){if(!inside(x,z))throw Error('Outside the Stillroom.');},
    update:room.update,stop:()=>loading.stop(),state:room.state,
    dispose(){loading.stop();room.dispose();},
  };
}

/** Trials load only the existing mist chamber. Old guard exercises load the camp
 * on demand; changing rounds or retrying reuses the same arena and renderer. */
export async function loadCombatPracticeWorld(scene,onProgress,{exercise='lesson',outdoorLights=[]}={}){
  const arenas=new Map(),previous={background:scene.background,fog:scene.fog};
  let active=null,arena=null;
  async function selectExercise(exercise){
    const id=exercise==='trials'?'stillroom':'camp';
    if(id===arena)return;
    let entry=arenas.get(id);
    if(!entry){
      const atmosphere={background:scene.background,fog:scene.fog};
      try{
        const world=id==='stillroom'?createStillroomPracticeWorld(scene,onProgress)
          :await (await import('./combat-camp-world.js')).loadCombatCampWorld(scene,onProgress);
        entry={world,background:id==='stillroom'?scene.background:previous.background,
          fog:id==='stillroom'?scene.fog:new THREE.Fog(0xb6c8b0,100,300)};
      }finally{
        // Keep the current arena intact if loading the next one fails.
        scene.background=atmosphere.background;scene.fog=atmosphere.fog;
      }
      arenas.set(id,entry);
    }
    active?.stop();
    for(const [key,value] of arenas)value.world.root.visible=key===id;
    for(const light of outdoorLights)light.visible=id==='camp';
    active=entry.world;arena=id;scene.background=entry.background;scene.fog=entry.fog;
  }
  await selectExercise(exercise);
  // Forward functions, rather than copying one arena's collision data: movement
  // keeps a shallow world snapshot while the player switches exercises.
  return {
    selectExercise,enabledRegions:[16],landmarks:[],paths:[],
    bounds:{minX:MENORA_CAMP.x-96,maxX:MENORA_CAMP.x+96,minZ:MENORA_CAMP.z-96,maxZ:MENORA_CAMP.z+96},
    get root(){return active.root;},get loading(){return active.loading;},get startup(){return active.startup;},
    get colliders(){return active.colliders;},
    regionAt:(...args)=>active.regionAt(...args),heightAt:(...args)=>active.heightAt(...args),waterAt:(...args)=>active.waterAt(...args),
    nearColliders:(...args)=>active.nearColliders(...args),reindexColliders:()=>active.reindexColliders(),
    canExploreAt:(...args)=>active.canExploreAt(...args),readyAt:(...args)=>active.readyAt(...args),
    prepareRegion:(...args)=>active.prepareRegion(...args),prefetchRegion:(...args)=>active.prefetchRegion(...args),prepare:(...args)=>active.prepare(...args),
    update:(...args)=>active.update(...args),stop:()=>active.stop(),
    state:()=>({arena,loadedArenas:[...arenas.keys()],room:arena==='stillroom'?active.state():null}),
    dispose(){
      for(const {world} of arenas.values()){world.stop();world.root.removeFromParent();world.dispose?.();}
      scene.background=previous.background;scene.fog=previous.fog;
      for(const light of outdoorLights)light.visible=true;
    },
  };
}
