import * as THREE from 'three';
import {createTowerChamber} from '../../content/regions/minora-frontier/tower-chamber.js';
import {createTowerLookout} from '../../content/regions/minora-frontier/tower-lookout.js';
import {createCouncilChamber} from '../../content/regions/minora-frontier/council-chambers.js';
import {createCouncilGates} from '../../content/regions/minora-frontier/council-gates.js';
import {councilRoom,MINORA_COUNCIL} from '../../content/regions/minora-frontier/minora-council.js';
import {councilInfluence} from './council-state.js';
import {createLimboChamber} from '../../content/regions/minora-frontier/limbo-chamber.js';
import {loadExplorationWorld} from './world-adapter.js';
import {TOWER,TOWER_EXIT} from './tower-state.js';
import {regionAt} from '../../world/terrain/region-world.js';
import {groundWithRiver} from '../../world/terrain/world-terrain.js';
import {createMinoraResidents} from './resident-view.js';

// Stable movement interface, separate spaces. Extra rooms construct lazily;
// the exterior is retained across visits and never updates behind a room.
export async function createTowerWorld(scene,onProgress,{inside,room=null,position,enabledRegions}){
  const chamber=createTowerChamber(scene),outside=new THREE.Group();outside.name='Lizeem exterior';scene.add(outside);
  const rooms=new Map();let referenceView=null,exterior=null,panorama=null,panoramaMs=0,building=null,current=inside?(room??'tower'):null,inLimbo=false,limbo=null,gates=null,lookoutGates=null,residents=null,leader='taleth',residentsEnabled=true;
  const idleLoading={start(){},stop(){},update(){},state:()=>({jobs:[],active:[],completed:0})};
  let residentCampaign=null;
  const towerBounds={minX:TOWER.x-13.5,maxX:TOWER.x+13.5,minZ:TOWER.z-12.5,maxZ:TOWER.z+12.5};
  function interior(view,bounds,origin){
    const within=(x,z)=>x>=bounds.minX&&x<=bounds.maxX&&z>=bounds.minZ&&z<=bounds.maxZ;
    return {bounds,origin,view,loading:idleLoading,colliders:view.colliders,landmarks:[],paths:[],
      heightAt:()=>origin.y,waterAt:()=>-100,regionAt:()=>regionAt(origin.x,origin.z),
      nearColliders:(x,z,r)=>view.colliders.filter(c=>Math.abs(x-c.x)<(c.r??c.hx)+r&&Math.abs(z-c.z)<(c.r??c.hz)+r),
      canExploreAt:within,readyAt:within,prepare:async()=>{},prepareRegion:async()=>{},prefetchRegion(){},stop(){},reindexColliders(){},
      update:(time,dt,player)=>view.update(time,player,dt)};
  }
  rooms.set('tower',interior(chamber,towerBounds,TOWER));
  function ensureRoom(id){if(!rooms.has(id)){if(id!=='lookout'&&!councilRoom(id))throw Error('Unknown Minora room.');const v=id==='lookout'?createTowerLookout(scene):createCouncilChamber(scene,id);rooms.set(id,interior(v,v.bounds,v.origin));}return rooms.get(id);}
  const active=()=>inLimbo?rooms.get('limbo'):current?ensureRoom(current):exterior;
  async function prepareExterior(at=TOWER_EXIT){
    if(!exterior){building??=loadExplorationWorld(outside,at,onProgress,{enabledRegions}).then(w=>exterior=w).catch(e=>{building=null;throw e;});await building;}
    await exterior.prepare(at.x,at.z);
    if(!gates&&exterior.readyAt(TOWER.x,TOWER.z)){gates=createCouncilGates(outside,exterior.heightAt);gates.update(leader);}
    if(!residents){residents=createMinoraResidents(outside,exterior);residents.setEnabled(residentsEnabled);residents.setCampaign(residentCampaign);}
  }
  async function prepareLookout(){
    if(!panorama){
      const begun=performance.now();
      onProgress('Opening the surrounding landscape');
      const {createLookoutScenery}=await import('../../content/regions/minora-frontier/lookout-scenery.js');
      panorama=await createLookoutScenery(scene);
      lookoutGates=createCouncilGates(panorama.root,groundWithRiver);lookoutGates.update(leader);
      panoramaMs=Math.round(performance.now()-begun);
    }
    // The export includes the actual nearby city. The rooftop has its own
    // collision and actors; prepare the walkable city only when descending.
    exterior?.stop();
  }
  function show(value){
    const id=value===true?'tower':value===false||value==null?null:value;
    if(id)ensureRoom(id);inLimbo=false;current=id;
    for(const [key,r]of rooms)r.view.root.visible=key===id;
    outside.visible=!id;if(panorama)panorama.root.visible=id==='lookout';exterior?.stop();
  }
  function showLimbo(){if(!limbo){limbo=createLimboChamber(scene);rooms.set('limbo',interior(limbo,{minX:TOWER.x-11.2,maxX:TOWER.x+11.2,minZ:TOWER.z-11.2,maxZ:TOWER.z+11.2},TOWER));}for(const [key,r]of rooms)r.view.root.visible=key==='limbo';inLimbo=true;outside.visible=false;if(panorama)panorama.root.visible=false;exterior?.stop();}
  const world={enabledRegions,bounds:{minX:-60000,maxX:60000,minZ:-60000,maxZ:60000},
    get loading(){return active().loading;},get startup(){return exterior?.startup;},
    get colliders(){return active().colliders;},get paths(){return active().paths;},get landmarks(){return active().landmarks;},
    minimapData:(...a)=>current||inLimbo?{}:exterior.minimapData(...a),
    get caricasStandards(){return current||inLimbo?null:exterior?.caricasStandards;},
    heightAt:(...a)=>active().heightAt(...a),waterAt:(...a)=>active().waterAt(...a),supportAt:(...a)=>active().supportAt?.(...a),nearColliders:(...a)=>active().nearColliders(...a),
    regionAt:(...a)=>active().regionAt(...a),canExploreAt:(...a)=>active().canExploreAt(...a),readyAt:(...a)=>active().readyAt(...a),
    prepare:(...a)=>active().prepare(...a),prepareRegion:(...a)=>active().prepareRegion(...a),prefetchRegion:(...a)=>active().prefetchRegion(...a),
    reindexColliders:()=>active().reindexColliders(),update(time,dt,point){active().update(time,dt,point);if(current==='lookout'&&!inLimbo)panorama?.update(time);residents?.update(time,dt,point,!current&&!inLimbo);},stop:()=>active().stop(),
    prepareExterior,prepareLookout,show,showLimbo,
    async testLookoutReference(value){
      if(new URLSearchParams(location.search).get('test')!=='1')throw Error('Reference rendering is a test-only operation.');
      if(value&&!referenceView)referenceView=await panorama.reference(new URL('/tests/artifacts/lookout-reference/landscape.json',location.href));
      if(!value&&referenceView){referenceView.dispose();referenceView=null;}
    },setChronicle:value=>chamber.setChronicle(value),setLookoutView:value=>rooms.get('lookout')?.view.point(value),
    setCouncil(campaign){leader=councilInfluence(campaign).leader;gates?.update(leader);lookoutGates?.update(leader);residentCampaign=campaign;residents?.setCampaign(campaign);},
    lookoutBirdTarget:player=>current==='lookout'&&!inLimbo?rooms.get('lookout')?.view.birds.target(player):null,
    observeLookoutBird:id=>rooms.get('lookout')?.view.birds.observe(id),
    feedLookoutBird:id=>current==='lookout'&&rooms.get('lookout')?.view.birds.feed(id),
    flyLookoutBird:id=>current==='lookout'&&rooms.get('lookout')?.view.birds.fly(id),
    lookoutBirds:()=>rooms.get('lookout')?.view.birds.state()??[],
    residentTarget:player=>!current&&!inLimbo?residents?.target(player)??null:null,
    residentPeople:()=>!current&&!inLimbo?residents?.people()??[]:[],
    setResidentTalking:(id,player)=>residents?.setTalking(id,player),
    setResidents(value){residentsEnabled=!!value;residents?.setEnabled(value);},
    dispose(){lookoutGates?.dispose();panorama?.dispose();for(const r of rooms.values())r.view.dispose();gates?.dispose();residents?.dispose();exterior?.stop();outside.removeFromParent();},
    state:()=>({inside:!!current,room:current,inLimbo,panorama:panorama?{...panorama.state(),visible:panorama.root.visible,buildMs:panoramaMs}:null,exteriorLoaded:!!exterior,loadedRooms:[...rooms.keys()],occupants:inLimbo?['The Grim Reaper']:current?[MINORA_COUNCIL[['tower','lookout'].includes(current)?'taleth':current].name]:[],bounds:active()?.bounds??towerBounds,councilFlags:(current==='lookout'?lookoutGates:gates)?.state()??null,residents:residents?.state()??null}),
  };
  if(current==='lookout')await prepareLookout();else if(!inside)await prepareExterior(position);show(current);return world;
}
