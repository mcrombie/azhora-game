// Transitional boundary: the authored world still imports legacy scenery/data.
// Nothing here constructs the adventure, quests, skills, combat or road checkpoint.
import {localRivers} from './local-rivers.js';
import {createStartup} from '../startup/startup.js';
import {regionAt} from '../../world/terrain/region-world.js';
import {westWaterSurface} from '../../content/regions/western-regions/west-ground.js';
import {prepareExplorationRegions} from './exploration-loading.js';
import {createYunethreLifeHost} from '../../content/regions/minora-frontier/yunethre-life-host.js';
import {findObservableTree} from './tree-observation.js';
import {laketownShoreAccess} from '../../content/regions/minora-frontier/laketown-access.js';
import {createCanerdLifeHost} from '../../content/regions/canerd/canerd-life-host.js';
import {createSouthOremindiLifeHost} from '../../content/regions/south-oremindi/south-oremindi-life-host.js';
import {SOUTH_OREMINDI_PATHS} from '../../content/regions/south-oremindi/south-oremindi-world.js';

export async function loadExplorationWorld(scene, position, onProgress, {enabledRegions=null,loadingMode='fast'}={}) {
  const allowed=id=>!enabledRegions||enabledRegions.includes(id);
  const loadingRegionAt=(x,z)=>allowed(38)&&!allowed(37)&&laketownShoreAccess(x,z)?38:regionAt(x,z).id;
  const assertRegion=id=>{if(!allowed(id))throw new Error('This workspace only loads its selected region. Return to the main menu to explore the world.');};
  assertRegion(loadingRegionAt(position.x,position.z));
  const startup=createStartup({onProgress});
  const {createWorldAsync}=await import('../../world.js');
  const built=await createWorldAsync(scene,{loadingMode:'fast',regionalFineGround:true,initialRegion:loadingRegionAt(position.x,position.z),
    enabledRegions,startup});
  // Keep regional residency in Full too: everything is prepared before play,
  // while distant scenery stays off the GPU until it is needed.
  const loading=built.loading;loading.setTravelBudget(16);
  loading.update(position);
  built.updateStreaming(position);
  await prepareExplorationRegions(loading,loadingRegionAt(position.x,position.z),{loadingMode,onProgress,
    label:loadingMode==='full'?'Preparing the world':'Preparing '+regionAt(position.x,position.z).name});
  startup.record.loadingMode=loadingMode;startup.ready();
  const life=allowed(38)?createYunethreLifeHost(scene,built):null;
  const mapPaths=allowed(37)?[...built.paths,...SOUTH_OREMINDI_PATHS.map(path=>Object.assign(
    path.points.map(p=>({x:p.x,z:p.z})),{id:path.id,name:path.name,kind:'trail',width:path.width}))]:built.paths;
  let castle=null,mountainLife=null;
  const world={
    loadingMode,
    bounds:built.bounds,heightAt:built.heightAt,waterAt:(x,z)=>Math.max(built.waterAt(x,z),westWaterSurface(x,z)??-Infinity),supportAt:built.supportAt,
    renderedGroundHeight:built.renderedGroundHeight,riverGroundMetrics:()=>built.meadowGround.metrics,riverTrafficState:()=>built.menora.riverTraffic?.state(),
    // Legacy deep-water walls can trap a descending rider inside their inflated
    // shore footprint. Water height determines wading and swimming for horses
    // and people; tree, bridge-rail and building collision remains intact.
    nearColliders:(x,z,r)=>built.nearColliders(x,z,r).filter(c=>c.kind!=='west-deep-water'),regionAt:built.regionAt,loading,
    minimapData(position,radius){return {paths:mapPaths,mapWaters:[...built.mapWaters,...localRivers(position,radius)],mapLands:built.mapLands,mapBridges:built.mapBridges};},
    get caricasStandards(){return built.caricasSettlement.standards;},
    get canerd(){return built.canerd;},
    canerdState:()=>castle?.state()??null,
    // An experiment may add its own local scenery without importing the old host.
    colliders:built.colliders,landmarks:built.landmarks,paths:built.paths,reindexColliders:()=>built.reindexColliders(),
    treeRegistry:built.treeRegistry,treeTarget:point=>findObservableTree([built.treeRegistry,built.woodlot?.treeRegistry],world,point),
    canExploreAt:(x,z)=>allowed(loadingRegionAt(x,z)),
    enabledRegions,startup:startup.record,
    update(time,dt,point){built.update(time,dt);built.updateStreaming(point);life?.update(time,dt,point);castle?.update(time,dt,point);mountainLife?.update(time,dt,point);},
    regionalLife:()=>life?.state()??null,
    mountainLife:()=>mountainLife?.state()??null,
    residentTarget:point=>castle?.residentTarget(point)??life?.residentTarget(point)??null,
    residentPeople:()=>[...(castle?.residentPeople()??[]),...(life?.residentPeople()??[])],
    setResidentTalking(id,point){life?.setResidentTalking(id,point);castle?.setResidentTalking(id,point);},
    setYunethreCampActive:value=>life?.setCampActive(value),
    readyAt(x,z){const id=loadingRegionAt(x,z);return allowed(id)&&(id===0||loading.isReady(id));},
    prefetchRegion(id){assertRegion(id);return loading.prefetchRegion(id);},
    async prepareRegion(id){assertRegion(id);await loading.ensureRegion(id);},
    async prepareBackdrop(bounds){
      // Existing coarse terrain is scenery only: it adds no regions, actors,
      // collision or travel permissions to the five-province scenario.
      let until=performance.now()+8;
      for(const _ of built.buildTerrainBackdrop(bounds))if(performance.now()>until){await new Promise(resolve=>setTimeout(resolve,0));until=performance.now()+8;}
    },
    async prepare(x,z){const id=loadingRegionAt(x,z);assertRegion(id);if(id!==0)await loading.ensureRegion(id);},
    stop(){loading.stop();},
    dispose(){life?.dispose();castle?.dispose();mountainLife?.dispose();built.disposeSharedWater?.();},
  };
  castle=createCanerdLifeHost(scene,world);
  mountainLife=allowed(37)?createSouthOremindiLifeHost(scene,world):null;
  return world;
}
