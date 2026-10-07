// Transitional boundary: the authored world still imports legacy scenery/data.
// Nothing here constructs the adventure, quests, skills, combat or road checkpoint.
import {createStartup} from '../startup/startup.js';
import {regionAt} from '../../world/terrain/region-world.js';
import {westWaterSurface} from '../../content/regions/western-regions/west-ground.js';

export async function loadExplorationWorld(scene, position, onProgress, {enabledRegions=null}={}) {
  const allowed=id=>!enabledRegions||enabledRegions.includes(id);
  const assertRegion=id=>{if(!allowed(id))throw new Error('This workspace only loads its selected region. Return to the main menu to explore the world.');};
  assertRegion(regionAt(position.x,position.z).id);
  const startup=createStartup({onProgress});
  const {createWorldAsync}=await import('../../world.js');
  const built=await createWorldAsync(scene,{loadingMode:'fast',regionalFineGround:true,initialRegion:regionAt(position.x,position.z).id,
    enabledRegions,startup});
  const loading=built.loading;loading.setTravelBudget(16);
  loading.update(position);
  onProgress('Preparing '+regionAt(position.x,position.z).name);
  const progress=setInterval(()=>{const s=loading.state();console.log('EXPLORATION_REGION '+JSON.stringify({active:s.active,completed:s.completed}));},2000);
  try{await loading.ensureRegion(regionAt(position.x,position.z).id);}finally{clearInterval(progress);}
  loading.stop();startup.ready();
  return {
    bounds:built.bounds,heightAt:built.heightAt,waterAt:(x,z)=>Math.max(built.waterAt(x,z),westWaterSurface(x,z)??-Infinity),supportAt:built.supportAt,
    // Legacy deep-water walls can trap a descending rider inside their inflated
    // shore footprint. Exploration uses water height to prevent horse entry and
    // allow swimming; tree, bridge-rail and building collision remains intact.
    nearColliders:(x,z,r)=>built.nearColliders(x,z,r).filter(c=>c.kind!=='west-deep-water'),regionAt:built.regionAt,loading,
    get caricasStandards(){return built.caricasSettlement.standards;},
    // An experiment may add its own local scenery without importing the old host.
    colliders:built.colliders,landmarks:built.landmarks,paths:built.paths,reindexColliders:()=>built.reindexColliders(),
    canExploreAt:(x,z)=>allowed(regionAt(x,z).id),
    enabledRegions,startup:startup.record,
    update(time,dt,point){built.update(time,dt);built.updateStreaming(point);},
    readyAt(x,z){const id=regionAt(x,z).id;return allowed(id)&&(id===0||loading.isReady(id));},
    prefetchRegion(id){assertRegion(id);return loading.prefetchRegion(id);},
    async prepareRegion(id){assertRegion(id);await loading.ensureRegion(id);},
    async prepare(x,z){const id=regionAt(x,z).id;assertRegion(id);if(id!==0)await loading.ensureRegion(id);},
    stop(){loading.stop();},
  };
}
