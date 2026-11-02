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
import {TOWER_INTERIOR_BOUNDS,towerFloorAt} from '../../content/regions/minora-frontier/tower-floor-layout.js';
import {findObservableTree} from './tree-observation.js';

// Stable movement interface, separate spaces. Extra rooms construct lazily;
// the exterior is retained across visits and never updates behind a room.
export async function createTowerWorld(scene,onProgress,{inside,room=null,position,enabledRegions,foodWorld=false,reviewedCountryside=foodWorld,relocatedTower=null}){
  const chamber=createTowerChamber(scene),outside=new THREE.Group();outside.name='Lizeem exterior';scene.add(outside);
  const rooms=new Map(),exteriorFeatures=new Set();let referenceView=null,exterior=null,panorama=null,countrysideMask=null,panoramaMs=0,building=null,current=inside?(room??'tower'):null,inLimbo=false,limbo=null,gates=null,lookoutGates=null,residents=null,leader='taleth',residentsEnabled=true;
  const idleLoading={start(){},stop(){},update(){},state:()=>({jobs:[],active:[],completed:0})};
  let residentCampaign=null,towerFeetY=TOWER.y;
  const towerBounds=TOWER_INTERIOR_BOUNDS;
  function interior(view,bounds,origin){
    let feetY=origin.y;
    const within=view.canExploreAt??((x,z)=>x>=bounds.minX&&x<=bounds.maxX&&z>=bounds.minZ&&z<=bounds.maxZ);
    const heightAt=(x,z)=>view.supportAt?.(x,z,{maxY:feetY,stepUp:.45,groundSlope:false})?.height??origin.y;
    const room={bounds,origin,view,loading:idleLoading,colliders:view.colliders,landmarks:[],paths:[],
      get treeRegistry(){return view.treeRegistry??null;},
      treeTarget:player=>findObservableTree(view.treeRegistryAt?.(player)??null,room,player),
      heightAt,supportAt:view.supportAt,waterAt:view.waterAt??(()=>-100),regionAt:()=>regionAt(origin.x,origin.z),
      nearColliders:(x,z,r)=>view.colliders.filter(c=>Math.abs(x-c.x)<(c.r??c.hx)+r&&Math.abs(z-c.z)<(c.r??c.hz)+r),
      canExploreAt:(x,z)=>within(x,z,feetY),readyAt:(x,z)=>view.readyAt?.(x,z,feetY)??within(x,z,feetY),prepare:(x,z,y=feetY)=>view.prepare?.(x,z,y)??Promise.resolve(),prepareRegion:async()=>{},prefetchRegion(){},stop(){},reindexColliders(){},
      update(time,dt,player){feetY=player.y;if(view===chamber)towerFeetY=feetY;view.update(time,player,dt);}};
    return room;
  }
  rooms.set('tower',interior(chamber,towerBounds,TOWER));
  function ensureRoom(id){if(!rooms.has(id)){if(id!=='lookout'&&!councilRoom(id))throw Error('Unknown Minora room.');const v=id==='lookout'?createTowerLookout(scene):createCouncilChamber(scene,id);rooms.set(id,interior(v,v.bounds,v.origin));}return rooms.get(id);}
  const active=()=>inLimbo?rooms.get('limbo'):current?ensureRoom(current):exterior;
  async function prepareExterior(at=TOWER_EXIT){
    if(!exterior){building??=(reviewedCountryside?import('../food-world/world.js').then(m=>m.loadFoodWorld(outside,at,onProgress)):loadExplorationWorld(outside,at,onProgress,{enabledRegions})).then(w=>exterior=w).catch(e=>{building=null;throw e;});await building;}
    await exterior.prepare(at.x,at.z);
    exterior.setCampaign?.(residentCampaign);
    if(!gates&&exterior.readyAt(TOWER.x,TOWER.z)){gates=createCouncilGates(outside,exterior.heightAt);gates.update(leader);}
    if(!residents&&(!enabledRegions||enabledRegions.includes(16))){residents=createMinoraResidents(outside,exterior);residents.setEnabled(residentsEnabled);residents.setCampaign(residentCampaign);}
  }
  async function prepareLookout(){
    if(relocatedTower){await prepareExterior(relocatedTower);exterior.stop();return;}
    if(reviewedCountryside)await prepareExterior();
    if(!panorama){
      const begun=performance.now();
      onProgress('Opening the surrounding landscape');
      const {createLookoutScenery}=await import('../../content/regions/minora-frontier/lookout-scenery.js');
      panorama=await createLookoutScenery(scene,{riverTraffic:!reviewedCountryside});
      if(reviewedCountryside){
        const {createLookoutCountrysideMask}=await import('../food-world/lookout-mask.js');
        countrysideMask=createLookoutCountrysideMask(exterior.enabledRegions,exterior.bounds);
        countrysideMask.apply(exterior.root,true);countrysideMask.apply(panorama.root,false);countrysideMask.seal();
      }else{lookoutGates=createCouncilGates(panorama.root,groundWithRiver);lookoutGates.update(leader);}
      panoramaMs=Math.round(performance.now()-begun);
    }
    // Legacy saves use the complete export. Reviewed campaigns retain their
    // already-built city and farms and use the export only beyond the five
    // provinces. The rooftop still has separate collision and actors.
    exterior?.stop();
  }
  function show(value){
    const id=value===true?'tower':value===false||value==null?null:value;
    if(id)ensureRoom(id);inLimbo=false;current=id;
    for(const [key,r]of rooms)r.view.root.visible=key===id;
    outside.visible=!id||((reviewedCountryside||!!relocatedTower)&&id==='lookout');
    if(relocatedTower&&id==='lookout')outside.position.set(TOWER.x-relocatedTower.x,TOWER.y-exterior.heightAt(relocatedTower.x,relocatedTower.z),TOWER.z-relocatedTower.z);else outside.position.set(0,0,0);
    if(panorama)panorama.root.visible=id==='lookout';countrysideMask?.setActive(id==='lookout');exterior?.setLookout?.(id==='lookout');exterior?.stop();
  }
  function showLimbo(){if(!limbo){limbo=createLimboChamber(scene);rooms.set('limbo',interior(limbo,{minX:TOWER.x-11.2,maxX:TOWER.x+11.2,minZ:TOWER.z-11.2,maxZ:TOWER.z+11.2},TOWER));}for(const [key,r]of rooms)r.view.root.visible=key==='limbo';inLimbo=true;outside.visible=false;if(panorama)panorama.root.visible=false;exterior?.stop();}
  const world={enabledRegions,bounds:{minX:-60000,maxX:60000,minZ:-60000,maxZ:60000},
    get exteriorRoot(){return outside;},
    addExteriorFeature(feature){exteriorFeatures.add(feature);return ()=>exteriorFeatures.delete(feature);},
    agricultureState:()=>exterior?.agricultureState?.()??null,
    get loading(){return active().loading;},get startup(){return exterior?.startup;},
    renderedGroundHeight:(x,z)=>active().renderedGroundHeight?.(x,z)??active().heightAt(x,z),riverGroundMetrics:()=>exterior?.riverGroundMetrics(),riverTrafficState:()=>current==='lookout'&&!reviewedCountryside?panorama?.state().riverTraffic:exterior?.riverTrafficState(),
    get colliders(){return active().colliders;},get paths(){return active().paths;},get landmarks(){return active().landmarks;},
    minimapData:(...a)=>current||inLimbo?{}:exterior.minimapData(...a),
    interiorMap:point=>current==='tower'&&!inLimbo?chamber.interiorMap(point):null,
    get caricasStandards(){return current||inLimbo?null:exterior?.caricasStandards;},
    get caricasPosts(){return exterior?.caricasPosts;},
    get passengerPorts(){return current||inLimbo?[]:exterior?.passengerPorts??[];},
    get treeRegistry(){return active()?.treeRegistry??null;},
    treeTarget:player=>active()?.treeTarget?.(player)??null,
    heightAt:(...a)=>active().heightAt(...a),waterAt:(...a)=>active().waterAt(...a),supportAt:(...a)=>active().supportAt?.(...a),nearColliders:(x,z,r)=>{
      let found=active().nearColliders(x,z,r);if(current||inLimbo)return found;
      for(const feature of exteriorFeatures){if(feature.filterCollider)found=found.filter(feature.filterCollider);found.push(...(feature.colliders??[]).filter(c=>Math.abs(x-c.x)<(c.r??c.hx)+r&&Math.abs(z-c.z)<(c.r??c.hz)+r));}return found;
    },
    regionAt:(...a)=>active().regionAt(...a),canExploreAt:(...a)=>active().canExploreAt(...a),readyAt:(...a)=>active().readyAt(...a),
    prepare:(...a)=>active().prepare(...a),prepareRegion:(...a)=>active().prepareRegion(...a),prefetchRegion:(...a)=>active().prefetchRegion(...a),
    reindexColliders:()=>active().reindexColliders(),update(time,dt,point){active().update(time,dt,point);if(current==='lookout'&&!inLimbo){panorama?.update(time);if(reviewedCountryside)exterior?.update(time,dt,point);}residents?.update(time,dt,point,!current&&!inLimbo);},stop:()=>active().stop(),
    prepareExterior,prepareLookout,show,showLimbo,
    renderWindows:(renderer,camera,time)=>chamber.renderWindows(renderer,camera,time),
    async testLookoutReference(value){
      if(new URLSearchParams(location.search).get('test')!=='1')throw Error('Reference rendering is a test-only operation.');
      if(value&&!referenceView)referenceView=await panorama.reference(new URL('/tests/artifacts/lookout-reference/landscape.json',location.href));
      if(!value&&referenceView){referenceView.dispose();referenceView=null;}
    },setLookoutCountrysideReview(value){
      if(new URLSearchParams(location.search).get('test')!=='1'||current!=='lookout'||!countrysideMask)throw Error('Countryside comparison is a lookout-only test operation.');
      outside.visible=!!value;countrysideMask.setActive(!!value);return true;
    },setChronicle:value=>chamber.setChronicle(value),setLookoutView:value=>rooms.get('lookout')?.view.point(value),
    demonstrateWorkshop:id=>current==='tower'&&!inLimbo&&chamber.demonstrateWorkshop(id),
    guildGuides:()=>chamber.guildGuides(),guildTravel:id=>current==='tower'&&!inLimbo?chamber.guildTravel(id):null,
    setCouncil(campaign){leader=councilInfluence(campaign).leader;gates?.update(leader);lookoutGates?.update(leader);residentCampaign=campaign;residents?.setCampaign(campaign);exterior?.setCampaign?.(campaign);},
    lookoutBirdTarget:player=>current==='lookout'&&!inLimbo?rooms.get('lookout')?.view.birds.target(player):null,
    observeLookoutBird:id=>rooms.get('lookout')?.view.birds.observe(id),
    feedLookoutBird:id=>current==='lookout'&&rooms.get('lookout')?.view.birds.feed(id),
    flyLookoutBird:id=>current==='lookout'&&rooms.get('lookout')?.view.birds.fly(id),
    lookoutBirds:()=>rooms.get('lookout')?.view.birds.state()??[],
    regionalLife:()=>exterior?.regionalLife?.()??null,
    mountainLife:()=>exterior?.mountainLife?.()??null,
    get canerd(){return current||inLimbo?null:exterior?.canerd;},
    canerdState:()=>exterior?.canerdState?.()??null,
    setYunethreCampActive:value=>exterior?.setYunethreCampActive?.(value),
    towerBirdTarget:player=>current==='tower'&&!inLimbo?chamber.birdTarget(player):null,
    residentTarget:player=>!current&&!inLimbo?residents?.target(player)??exterior?.residentTarget?.(player)??null:null,
    residentPeople:()=>!current&&!inLimbo?[...(residents?.people()??[]),...(exterior?.residentPeople?.()??[])]:[],
    setResidentTalking(id,player){residents?.setTalking(id,player);exterior?.setResidentTalking?.(id,player);},
    setResidents(value){residentsEnabled=!!value;residents?.setEnabled(value);},
    dispose(){countrysideMask?.dispose();lookoutGates?.dispose();panorama?.dispose();for(const r of rooms.values())r.view.dispose();gates?.dispose();residents?.dispose();exterior?.stop();exterior?.dispose?.();outside.removeFromParent();},
    state:()=>({inside:!!current,room:current,inLimbo,floor:current==='tower'&&!inLimbo?towerFloorAt(towerFeetY):null,guild:chamber.state?.()??null,panorama:panorama?{...panorama.state(),visible:panorama.root.visible,buildMs:panoramaMs,countrysideMask:countrysideMask?.state()??null}:null,reviewedCountryside,exteriorLoaded:!!exterior,loadedRooms:[...rooms.keys()],occupants:inLimbo?['The Grim Reaper']:current==='tower'?[towerFloorAt(towerFeetY).wizard]:current?[MINORA_COUNCIL[current==='lookout'?'taleth':current].name]:[],bounds:active()?.bounds??towerBounds,councilFlags:(current==='lookout'&&!reviewedCountryside?lookoutGates:gates)?.state()??null,residents:residents?.state()??null}),
  };
  if(current==='tower'&&position)await chamber.prepare(position.x,position.z,position.y);
  if(current==='lookout')await prepareLookout();else if(!inside)await prepareExterior(position);show(current);return world;
}
