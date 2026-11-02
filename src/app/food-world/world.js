import {LIZEEM_PORTS} from '../../content/regions/minora-frontier/lizeem-passages.js';
import * as THREE from 'three';
import {FARMLAND_REGIONS} from '../farmland-review/regions.js';
import {createFarmlandTerrain,yieldBuild} from '../farmland-review/terrain.js';
import {createFarmlandDeck,buildFarmlandDecks} from '../farmland-review/decks.js';
import {createSceneryBuilder} from '../../world/scenery/scenery-builder.js';
import {getTreeRegistry} from '../../world/scenery/tree-registry.js';
import {findObservableTree} from '../exploration/tree-observation.js';
import {cityRiverView} from '../../dev/checks/city-river-view.js';
import {REGION_CELLS,REGION_IDS,regionAt,SEA_LEVEL} from '../../world/terrain/region-world.js';
import {localRivers} from '../exploration/local-rivers.js';
import {createFarmConditionView} from './farm-view.js';
import {worldWarScenario} from '../exploration/world-war.js';
import {createReviewedCaricasStandards} from './standards.js';
import {createWestWaterMaterial} from '../../content/regions/western-regions/west-water-material.js';
import {createLookoutTerrainDetail} from './lookout-terrain.js';
import {LIZEEM_CROSSING_PATHS,LIZEEM_MAP_BRIDGES,lizeemBridgeDeckHeight,lizeemCrossingReserved} from '../../content/regions/minora-frontier/lizeem-crossings.js';
import {createLizeemCrossingSteps} from '../../content/regions/minora-frontier/lizeem-crossings-scenery.js';
import {CARICAS_RESIDENT_PLACEMENTS} from '../../content/regions/minora-frontier/caricas-resident-placements.js';
import {caricasTownGround} from '../../content/regions/minora-frontier/caricas-town-ground.js';
import {CARICAS_AGRICULTURE_POSTS} from '../../content/regions/minora-frontier/caricas-agriculture.js';

// Bounded integration of the actual reviewed layouts. No legacy farm builder,
// crop timers or quest host is loaded, and scenery never advances campaign time.
export async function loadFoodWorld(scene,position,onProgress=()=>{}){
  const begun=performance.now(),layouts=Object.values(FARMLAND_REGIONS);
  const enabledRegions=layouts.map(r=>REGION_IDS[r.name]);
  const allowed=(x,z)=>enabledRegions.includes(regionAt(x,z).id);
  const assertRegion=id=>{if(!enabledRegions.includes(id))throw Error('The Lizeemi War contains five playable regions. Visit Taleth\'s lookout to view the surrounding countries.');};
  assertRegion(regionAt(position.x,position.z).id);
  const cells=layouts.flatMap(r=>REGION_CELLS[r.name]);
  const minX=Math.floor((Math.min(...cells.map(p=>p.x))-150)/3)*3,minZ=Math.floor((Math.min(...cells.map(p=>p.z))-150)/3)*3;
  const maxX=Math.ceil((Math.max(...cells.map(p=>p.x))+150)/3)*3,maxZ=Math.ceil((Math.max(...cells.map(p=>p.z))+150)/3)*3;
  const root=new THREE.Group();root.name='Reviewed Lizeem countryside';scene.add(root);
  const colliders=[],paths=[...LIZEEM_CROSSING_PATHS,...layouts.flatMap(r=>r.lanes.map(lane=>Object.assign(lane.map(([x,z])=>({x,z})),{width:5})))];
  const terrain=await createFarmlandTerrain(root,onProgress,{
    name:'Lizeem',tileCells:48,box:{x:minX,z:minZ,width:maxX-minX,depth:maxZ-minZ},
    buildings:layouts.flatMap(r=>r.terrainBuildings??r.buildings),
    groundAt:(x,z)=>caricasTownGround(x,z,FARMLAND_REGIONS.isareos.groundAt(x,z)),
    bridges:layouts.flatMap(r=>r.bridges),quay:null,deckHeight:FARMLAND_REGIONS.isareos.deckHeight,
  });
  const water=createWestWaterMaterial();
  cityRiverView(root,[...new Set(layouts.flatMap(r=>r.courses))],[minX,minZ,maxX-minX,maxZ-minZ],water);
  const seaMaterial=new THREE.MeshStandardMaterial({color:0x65bdba,roughness:.55,metalness:.05});
  const sea=new THREE.Mesh(new THREE.PlaneGeometry(maxX-minX,maxZ-minZ),seaMaterial);sea.rotation.x=-Math.PI/2;sea.position.set((minX+maxX)/2,SEA_LEVEL,(minZ+maxZ)/2);root.add(sea);
  const decks=[...terrain.decks],builder=createSceneryBuilder('Reviewed farm crossings and quays');
  for(const layout of layouts){
    const q=layout.quay;if(!q)continue;
    const dir=Math.sign(q.end-q.bank),y=(terrain.waterAt(q.end,q.z))+.7;
    decks.push(createFarmlandDeck({x:(q.bank+q.end)/2,z:q.z,width:q.width,length:Math.abs(q.end-q.bank),yaw:dir*Math.PI/2,
      heightAt:(x,z)=>{const t=Math.max(0,Math.min(1,(x-q.bank)*dir/10)),h=terrain.heightAt(q.bank,z);return h+(y-h)*t;}}));
  }
  buildFarmlandDecks(builder,decks);builder.finish(root);
  for(const _ of createLizeemCrossingSteps({parent:root,heightAt:terrain.heightAt,colliders,surface:terrain.surface})){}
  const metrics={},livestock=[],farmView=createFarmConditionView();let city=null;
  for(const layout of layouts){
    onProgress('Preparing '+layout.name+' farms and town');
    const steps=layout.createScenery({parent:root,heightAt:terrain.heightAt,surface:terrain.surface,waterAt:terrain.waterAt,colliders,reserved:lizeemCrossingReserved,onFarmBuilt:parts=>farmView.add(layout.id,parts),onCityBuilt:value=>city=value});
    let next,until=performance.now()+10;
    do{next=steps.next();if(performance.now()>until){await yieldBuild();until=performance.now()+10;}}while(!next.done);
    const {livestock:flock,...detail}=next.value;if(flock)livestock.push(flock);
    metrics[layout.id]={...detail,capacity:layout.capacity()};
  }
  const heightAt=(x,z)=>{const bridge=lizeemBridgeDeckHeight(x,z);if(bridge!==null)return bridge;for(const deck of decks){const h=deck.heightAt(x,z);if(h!==null)return h;}return terrain.walkHeight(x,z);};
  const caricasStandards=createReviewedCaricasStandards(root,heightAt);
  const lookoutDetail=createLookoutTerrainDetail(root);
  // Spatial buckets keep movement/camera probes independent of woodland size.
  let buckets=new Map();
  function reindexColliders(){buckets=new Map();for(const c of colliders){if(c.dynamic)continue;const radius=Math.max(c.r??0,Math.hypot(c.hx??0,c.hz??0))+2;
    for(let x=Math.floor((c.x-radius)/32);x<=Math.floor((c.x+radius)/32);x++)for(let z=Math.floor((c.z-radius)/32);z<=Math.floor((c.z+radius)/32);z++){
      const key=x+','+z;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(c);
    }
  }for(const flock of livestock)flock.refreshColliders();}
  reindexColliders();
  const buildMs=Math.round(performance.now()-begun);
  const loading={start(){},stop(){},update(){},state:()=>({jobs:[],active:[],completed:5})};
  const landmarks=layouts.map(r=>({id:r.id+'-town',name:r.id==='isareos'?'Minora':r.name+' Town',x:r.spawns.town[0],z:r.spawns.town[1]}));
  const treeRegistry=getTreeRegistry(colliders).configure({root,reindex:reindexColliders});
  const world={root,passengerPorts:LIZEEM_PORTS,bounds:terrain.bounds,enabledRegions,heightAt,waterAt:terrain.waterAt,renderedGroundHeight:terrain.heightAt,colliders,paths,landmarks,loading,caricasStandards,caricasPosts:CARICAS_AGRICULTURE_POSTS,
    treeRegistry,treeTarget:point=>findObservableTree(treeRegistry,world,point),
    nearColliders(x,z,r){const found=new Set();for(let a=Math.floor((x-r)/32);a<=Math.floor((x+r)/32);a++)for(let b=Math.floor((z-r)/32);b<=Math.floor((z+r)/32);b++)for(const c of buckets.get(a+','+b)??[])found.add(c);for(const flock of livestock)for(const c of flock.nearColliders(x,z,r))found.add(c);return [...found];},
    reindexColliders,regionAt,canExploreAt:allowed,readyAt:allowed,residentPlacements:CARICAS_RESIDENT_PLACEMENTS,
    prepare:async(x,z)=>assertRegion(regionAt(x,z).id),prepareRegion:async id=>assertRegion(id),prefetchRegion:assertRegion,prepareBackdrop:async()=>{},stop(){},update(time,dt=0,player){city?.update(time);water.uniforms.time.value=time;for(const flock of livestock)flock.update(dt,player);},
    minimapData:(p,r)=>({paths,mapWaters:localRivers(p,r),mapLands:[],mapBridges:LIZEEM_MAP_BRIDGES}),
    setCampaign:state=>{if(state?.food)farmView.update(worldWarScenario(state.scenario),state);},
    agricultureState:()=>({regions:metrics,conditions:farmView.state(),livestock:livestock.map(f=>f.state()),buildMs,legacyFarms:false,lookoutTerrain:lookoutDetail.state()}),
    setLookout:value=>lookoutDetail.setActive(value),
    riverGroundMetrics:()=>({foodWorld:true}),riverTrafficState:()=>city?.riverTraffic.state()??null,
    dispose(){for(const flock of livestock)flock.dispose();lookoutDetail.dispose();city?.riverTraffic.dispose();water.dispose();seaMaterial.dispose();root.removeFromParent();},
  };
  return world;
}
