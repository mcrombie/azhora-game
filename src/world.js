import {URUBOND,URUBOND_LANDMARKS,urubondTerrainSink} from './urubond-world.js';
import {refineUrubondGroundSteps} from './urubond-ground.js';
import {createUrubondScenerySteps} from './urubond-scenery.js';
import { OUTER_NAMES, OUTER_LAKES, OUTER_LANDMARKS, OUTER_RIVERS, outerProfile, outerOwns, outerWaterAt } from './outer-regions-world.js';
import { createOuterScenerySteps } from './outer-regions-scenery.js';
import { ACOR_NAMES, ACOR_WATERS, ACOR_LANDMARKS, acorProfile, acorOwns, acorWaterAt } from './acor-world.js';
import { createThalmagarFortressSteps } from './thalmagar-fortress-scenery.js';
import { createAcorScenerySteps } from './acor-scenery.js';
import { stageBuildSteps } from './build-steps.js';
import { createRegionLoading } from './region-loading.js';
import { createSceneryResidency } from './scenery-residency.js';
import { createTerrainSeedLookup } from './terrain-seeds.js';
import { createStreamedTerrain } from './streamed-terrain.js';
import { IBENWOOD_ALEZHOR_GROUND_REGIONS, createIbenwoodAlezhorGroundSteps, combinedRiverIndex } from './ibenwood-alezhor-ground.js';
import { alezhorSwimmingSurface } from './alezhor-water.js';
import { appendWesternTerrainSamples, preservedTerrainTileRanges, extensionTerrainSeed } from './terrain-extension.js';
import { deferredScenery } from './deferred-scenery.js';
import { batchStaticScenery } from './static-scenery-batches.js';
import { REGION_IDS, REGION_CELLS, SURVEY } from './region-world.js';
import { PUETH_RIVER_PROFILES, puethRiverHalfWidth, TESSEN_DECK_Y, withoutIbenalLayers } from './world-terrain.js';
import { TARVEL_BRIDGE } from './amod-world.js';
import { TARVEL_DECK_Y } from './amod-terraces.js';
import { LINK_BRIDGE } from './elagos-world.js';
import { createRoadDistanceIndex } from './road-distance-index.js';
import { yieldStartup, terrainCacheMatches } from './startup.js';
import { createIbenwoodScenerySteps } from './ibenwood-scenery.js';
import { groveGround } from './ibenwood-pilot.js';
import { createIbenwoodRegionalScenerySteps } from './ibenwood-regional-scenery.js';
import { createWalkSurfaces } from './walk-surfaces.js';
import { createIbenwoodRiverSystem, createIbenwoodRiverScenerySteps } from './ibenwood-rivers.js';
import { createAlezhorBankGround } from './alezhor-bank-ground.js';
import { createRegionalFarmlandScenerySteps } from './regional-farmland-scenery.js';
import { FARMSTEADS } from './regional-farmland.js';
// `WATERLINE` is the line the predicates judge wet by; `waterAt` below answers it for the sea
// and each river's own surface for a river (src/game-state.js). game-state imports nothing, so
// there is no cycle here.
import { WATERLINE } from './game-state.js';
import { FARM_FIRE } from './farming.js';
import { AVREL_POND, avrelPondGround } from './avrel-pond.js';
import { createVisualArtsScenery } from './visual-arts-view.js';
import { SYLVIA_PATH } from './visual-arts.js';
import * as THREE from 'three';
import {createPeninsulaTutorialScenery} from './peninsula-tutorial-scenery.js';
import {WEST_OREMINDI_LANDMARKS,westOremindiOwns} from './west-oremindi-world.js';
import {refineWestOremindiGroundSteps} from './west-oremindi-ground.js';
import {createWestOremindiScenerySteps} from './west-oremindi-scenery.js';
import {BALDRO_PATHS,baldroOwns,baldroWaterAt} from './baldro-world.js';
import {refineBaldroGroundSteps} from './baldro-ground.js';
import {buildBaldroScenerySteps} from './baldro-scenery.js';
import { REGIONAL_PLACES, REGIONAL_NPC_POSITIONS, REGIONAL_ACTIVITY_SITES, REGIONAL_PATHS, regionalFeatureClear, createRegionalPlaces } from './regional-places.js';
import { regions, regionAt, isOpenCountry, regionNpcPositions, journeySites, regionFirePits, regionRepairBenches, regionLandmarks } from './regions.js';
import { forestPlaceDefinitions, forestPlacePaths, forestWoodcutter, forestFeatureClear, tintForestGround, createForestPlaces } from './forest-places.js';
import { FOREST_HIDEOUT, createForestHideout } from './forest-hideout-world.js';
import {
  VILLAGE, villageToWorld, worldToVillage, WORLD_BOUNDS, SEA_LEVEL, MAIN_ROAD, CALOSS_ROAD_FORK, SUVAL_ROAD, ONWARD_ROAD,
  CALOSS, CALOSS_BANK, WOOD_EDGE, FERNWAY_REST, FRONTIER, STORY_SITES, AVREL_CLEARING,
  calossDistance, landDistance, SOLIS, solisPoint,
} from './region-world.js';
import { villageWeight, villageBase, bedrockHeight, legacyIzolGroundHeight, legacyWesternGroundHeight, legacyCelderGroundHeight, legacyEastIzolGroundHeight, groundWithRiver, groundBeforeVarn, groundTint, calossSurface, puethRiverSurface, smooth, lerp } from './world-terrain.js';
import { toWorld, WORLD_SCALE } from './world-scale.js';
import { createSigns, SIGN_COLOURS } from './signs.js';
import { buildMorosWorks } from './moros-works.js';
import { OUTPOST_BENCH, OUTPOST_FIRE, STOCKADE_TRACK_BEND, STOCKADE_APPROACH, OUTPOST_CIRCUIT, STOCKADE_CIRCUIT, enclosureOf } from './outpost.js';
import { WAYSIDE_LANDMARKS } from './wayside.js';
import { buildFrontierWorks } from './frontier-works.js';
import { buildPlaceWorks } from './place-works.js';
import { PLACE_LANDMARKS } from './places.js';
import { FRONTIER_ROUTE, FRONTIER_LANDMARKS, FRONTIER_GATE, FRONTIER_APPROACH } from './frontier.js';
import { SOLIS_ROAD } from './region-world.js';
import { WEST_SUVAL_LANDMARKS, SOLIS_ENCLOSURES, SOLIS_STREETS, WEST_SUVAL_SEA } from './west-suval.js';
import { SOLIS_HARBOR, SOLIS_HARBOR_PATHS, solisHarborDeckHeight } from './solis-harbor.js';
import { atticDeckHeight } from './wine-attic.js';
import { createJesseCarriageScenery } from './jesse-carriage-scenery.js';
import { jesseWorkshopClear } from './jesse-carriage-world.js';
import { createBrandyYard } from './brandy-yard.js';
import { createBrandyHomeScenery } from './brandy-home-scenery.js';
import { FAMILY_HOMES, MARK_HOME, MARK_HOME_PATH, familyHomeClear } from './family-homes.js';
import { createFamilyHomeScenery } from './family-homes-scenery.js';
import { createLighthouse } from './lighthouse-world.js';
import { ELOD_LIGHT } from './rival-light.js';
import { createSmugglersDoorScenery } from './smugglers-door-world.js';
import { createWoodlot } from './woodlot-world.js';
import { createHomestead } from './homestead-world.js';
import { inKoopwood } from './woodcutting.js';
import { forestTimber } from './wood-species.js';
import { getTreeRegistry, registerWorldTree } from './tree-registry.js';
import { NORTHERN_NAMES, NORTHERN_IDS, NORTHERN_LAKES, NORTHERN_LANDMARKS, northernProfile, northernCellAt, northernWaterAt, northernTint } from './northern-oremindi-world.js';
import { refineNorthernGroundSteps } from './northern-oremindi-ground.js';
import { createNorthernScenerySteps } from './northern-oremindi-scenery.js';
import { createSouthOremindiScenerySteps } from './south-oremindi-scenery.js';
import { createInquestHome } from './inquest-home-scenery.js';
import { INQUEST_HOME, inquestHomeClear } from './inquest-home.js';
import { createYunethreScenerySteps } from './yunethre-scenery.js';
import { YUNETHRE_LANDMARKS } from './yunethre-world.js';
import { refineSouthOremindiGroundSteps } from './south-oremindi-ground.js';
import { SOUTH_OREMINDI_LAKES, SOUTH_OREMINDI_LANDMARKS, southOremindiOwns, southOremindiWaterAt } from './south-oremindi-world.js';
import { createWestSuvalScenerySteps } from './west-suval-world.js';
import { createWineryScenery } from './winery-world.js';
import { buildBirdGarden, birdGardenSites, inBirdGarden } from './bird-garden.js';
import { createRegionScenerySteps, regionClear } from './world-regions.js';
import { createColliderGrid, watchColliderEdits } from './collider-grid.js';
import { OPENING_FIGHT_GROUND } from './opening-fights.js';
import { HIDEOUT_SITE, hideoutToWorld, PUETH_ROAD, HIDEOUT_APPROACH_TRAIL, TESSEN_BRIDGE, PUETH_RIVERS, PUETH_NPC_POSITIONS, PUETH_LANDMARKS, puethRiverDistance } from './pueth-world.js';
import { createPuethScenerySteps } from './pueth-scenery.js';
import { PEBLOS_LANDMARKS, PEBLOS_NPC_POSITIONS, PEBLOS_ISLANDS, COBBLE_QUAY, quayHeight, islandAt } from './peblos-world.js';
import { createPeblosScenerySteps } from './peblos-scenery.js';
import { createFerryBoat } from './ferry-boat.js';
import { PORT_CALOS, PORT_CALOS_QUAY, PORT_CALOS_PATHS, PORT_CALOS_LANDMARKS, PORT_CALOS_NPC_POSITIONS, inPortCalos, portCalosGround, portCalosDeckHeight } from './port-calos-world.js';
import { createPortCalosScenery } from './port-calos-scenery.js';
import { RENA_ROAD, RENA_LANDMARKS, RENA_NPC_POSITIONS } from './rena.js';
import { buildRenaWorks } from './rena-works.js';
import { EAST_SUVAL_PLACES, ELOD_STANDS, EAST_SUVAL_STANDS, ELOD_QUAY, ELOD_LANDING, quayHeight as elodQuayHeight } from './east-suval.js';
import { createEastSuvalScenerySteps } from './east-suval-world.js';
import { createSouthSuvalScenerySteps } from './south-suval-scenery.js';
import { createEastLotharnScenerySteps } from './east-lotharn-scenery.js';
import { createWestLotharnScenerySteps } from './west-lotharn-scenery.js';
import { createVarnScenerySteps } from './varn-scenery.js';
import { createLotharnFortsScenerySteps } from './lotharn-forts-scenery.js';
import { LOTHARN_FORT_LANDMARKS } from './lotharn-forts.js';
import { VARN_ROAD, VARN_ROAD_HALF, VARN_LANDMARKS, varnTerrainSink } from './varn-world.js';
import { unclimbableAt } from './no-climb-zones.js';
import { createFeradomScenerySteps } from './feradom-scenery.js';
import { feradomTerrainSink } from './feradom-world.js';
import { FERADOM_LANDMARKS } from './feradom-forts.js';
import { createAscarthScenerySteps } from './ascarth-scenery.js';
import { ASCARTH_LANDMARKS } from './ascarth-world.js';
import { PASS_ROAD_LINE as LOTHARN_ROAD_LINE, WORKINGS_TRACK, EAST_LOTHARN_LANDMARKS, lotharnTerrainSink } from './east-lotharn-world.js';
import { createCaves } from './east-lotharn-caves.js';
import { WEST_LOTHARN_LANDMARKS, westLotharnTerrainSink } from './west-lotharn-world.js';
import { createWestLotharnCaves } from './west-lotharn-caves.js';
import { createWestLotharnGroundSteps, WEST_LOTHARN_GROUND_REGIONS } from './west-lotharn-ground.js';
import { createLegacyWesternGrid, createLegacyWesternGround } from './western-legacy-ground.js';
import { createSuvalHighlandScenerySteps } from './suval-highlands-scenery.js';
import { createSuvalGroundSurface, createSuvalHighlandGroundSteps, SUVAL_GROUND_REGIONS } from './suval-highland-ground.js';
import { BAT_CAVE, IMLAMDRIS_REBUILD, suvalHighlandTerrainSink } from './suval-highlands.js';
import { createIscareScenerySteps } from './iscare-scenery.js';
import { ISCARE_RUIN_SITES } from './iscare-world.js';
import { PASS_ROAD_LINE, SOUTH_SUVAL_LANDMARKS, SOUTH_SUVAL_CHART_WATERS, imlamdrisTerrainSink } from './south-suval-world.js';
import { IZOL_LANDMARKS, IZOL_NPC_POSITIONS, IZOL_PATHS, IZOL_SEA, IZOL_QUAY, izolDeckHeight } from './izol-world.js';
import { createIzolScenerySteps } from './izol-scenery.js';
import { drapeRoadOnTerrain, terrainRoadHeight } from './terrain-road.js';
import { treeGroundingOffset } from './tree-grounding.js';
import { brandyHomeClear, brandyHomeGround } from './brandy-home-world.js';
import { ELAGOS_ROADS, AMBRON_ROAD, LAKE_ROAD, CALOSS_ELAGOS_ROAD, ELAGOS_LANDMARKS, ELAGOS_CHART_WATERS, inElagosWater } from './elagos-world.js';
import { AMBRON_ENCLOSURE, AMBRON_STREETS, ambronPoint, ambronDeckHeight } from './ambron.js';
import { ELAGOS_NPC_POSITIONS } from './ambron-people.js';
import { createElagosScenerySteps } from './elagos-scenery.js';
import { AMOD_ROAD, AMOD_NPC_POSITIONS, AMOD_LANDMARKS, tarvelDistance } from './amod-world.js';
import { amodTerrainSink } from './amod-terraces.js';
import { createAmodScenerySteps } from './amod-scenery.js';
import { WEST_REGION_LANDMARKS, westBareGround, westRiverDistance, trelossTerrainSink } from './west-regions.js';
import { createMenoraScenerySteps } from './menora-scenery.js';
import { createNylonScenerySteps } from './nylon-scenery.js';
import { NYLON_PATHS, NYLON_LANDMARKS, nylonReserved, nylonHarborDeckHeight } from './nylon-city.js';
import { createAevisScenerySteps } from './aevis-scenery.js';
import { AEVIS_PATHS, AEVIS_LANDMARKS, aevisReserved, aevisDeckHeight } from './aevis-city.js';
import { clearScatter } from './scenery-clearing.js';
import { MENORA, MENORA_PATHS, MENORA_BUILDINGS, menoraDeckHeight } from './menora-city.js';
import { CARICAS_TOWN, CARICAS_ROADS } from './caricas-settlement.js';
import { createCaricasSettlementSteps } from './caricas-settlement-scenery.js';
// The Farmlands of the Lizeem, Builds 2 and 3 (the design of 5 October 2026, built 6 October 2026): Haethom, its levee,
// meadow and weir in Nethereum; Ninehands, the hazel wood, the Counted Water and the Way in Nesdor.
import { createNethereumFarmScenerySteps } from './nethereum-farm-scenery.js';
import { NETHEREUM_PATHS, NETHEREUM_FARM_LANDMARKS, nethereumFarmHeight } from './nethereum-farm.js';
import { createNesdorFarmScenerySteps } from './nesdor-farm-scenery.js';
import { NESDOR_PATHS, NESDOR_FARM_LANDMARKS } from './nesdor-farm.js';
// The Farmlands of the Lizeem, Builds 4 and 5 (the design of 5 October 2026, built 6 October 2026): Velsorten, its canal,
// the divider, the mills and Lahar's camp in Ovesos; Amalthea's hamlet in the Isareos hills.
import { createOvesosFarmScenerySteps } from './ovesos-farm-scenery.js';
import { OVESOS_PATHS, OVESOS_FARM_LANDMARKS, ovesosFarmHeight } from './ovesos-farm.js';
import { createIsareosHamletScenerySteps } from './isareos-hamlet-scenery.js';
import { ISAREOS_HAMLET_PATHS, ISAREOS_HAMLET_LANDMARKS } from './isareos-hamlet.js';
import { createWestScenerySteps } from './west-regions-scenery.js';
import { createGalaScenerySteps } from './gala-scenery.js';
import { GALA_LANDMARKS } from './gala-world.js';
import { createOvesScenerySteps } from './oves-scenery.js';
import { createMithalaScenerySteps } from './mithala-scenery.js';
import { createMithalaWaterSteps, MITHALA_WATER_REGIONS, celderBorderWaterSurface } from './mithala-water.js';
import { createSouthwestScenerySteps } from './southwest-scenery.js';
import { OVES_LANDMARKS } from './oves-world.js';
import { MITHALA_LANDMARKS } from './mithala-world.js';
import { createMithalaCityScenerySteps } from './mithala-city-scenery.js';
import { MITHALA_STREETS, MITHALA_CITY_LANDMARKS, mithalaCityReserved } from './mithala-city.js';
import { SOUTHWEST_LANDMARKS } from './southwest-world.js';
import { createSelemisScenery } from './selemis-scenery.js';
import { SELEMIS_LANDMARKS } from './selemis-world.js';
import { createTelemoniaScenerySteps } from './telemonia-scenery.js';
import { createTelemoniaGroundSteps } from './telemonia-ground.js';
import { createTelemoniaTownScenerySteps } from './telemonia-town-scenery.js';
import { TELEMONIA_TOWN_LANDMARKS } from './telemonia-ways.js';
import { createEastPyrosScenerySteps } from './east-pyros-scenery.js';
import { EAST_PYROS_LANDMARKS, EAST_PYROS_POOLS, eastPyrosWaterAt } from './east-pyros-world.js';
import { createNetherDesertScenerySteps } from './nether-desert-scenery.js';
import { NETHER_DESERT_LANDMARKS } from './nether-desert-world.js';
import { createLegemumScenerySteps } from './legemum-scenery.js';
import { LEGEMUM_LANDMARKS } from './legemum-world.js';
import { BABON_LANDMARKS, BABON_RIVERS, babonWaterAt, babonOwns } from './babon-world.js';
import { createBabonScenerySteps } from './babon-scenery.js';
import { refineBabonGroundSteps } from './babon-ground.js';
import { createSouthCelderScenerySteps } from './south-celder-scenery.js';
import { SOUTH_CELDER_LANDMARKS } from './south-celder-world.js';
import { createNorthCelderScenerySteps } from './north-celder-scenery.js';
import { NORTH_CELDER_LANDMARKS } from './north-celder-world.js';
import { CANERD_LANDMARKS, CANERD_PATHS, canerdTerrainSink } from './canerd-world.js';
import { refineCanerdGroundSteps } from './canerd-ground.js';
import { createCanerdScenerySteps } from './canerd-scenery.js';
import { PYRA, PYRA_LANDMARKS, pyraTerrainSink } from './pyra-world.js';
import { refinePyraGroundSteps } from './pyra-ground.js';
import { createPyraScenerySteps } from './pyra-scenery.js';
import { SELAMUS_CANALS, SELAMUS_LANDMARKS, SELAMUS_MAP_BRIDGES, selamusTerrainSink, selamusReserved } from './selamus-city.js';
import { refineSelamusGroundSteps } from './selamus-ground.js';
import { createSelamusScenerySteps } from './selamus-scenery.js';
import { createSelamusHarborSteps } from './selamus-harbor.js';
import { createEastIzolScenerySteps } from './east-izol-scenery.js';
import { EAST_IZOL_LANDMARKS } from './east-izol-world.js';
import { createAlezhorScenerySteps } from './alezhor-scenery.js';
import { ALEZHOR_LANDMARKS, alezhorMapWaters, alezhorRiverIndex } from './alezhor-world.js';
import { createSouthIbenalScenerySteps } from './south-ibenal-scenery.js';
import { SOUTH_IBENAL_LANDMARKS, ibenalMapWaters, ibenalRiverIndex } from './south-ibenal-world.js';
import { createNorthIbenalScenerySteps } from './north-ibenal-scenery.js';
import { NORTH_IBENAL_LANDMARKS } from './north-ibenal-world.js';
import { createHenborthScenerySteps } from './henborth-scenery.js';
import { HENBORTH_LANDMARKS } from './henborth-world.js';
import { TELEMONIA_LANDMARKS, telemoniaTerrainSink } from './telemonia-world.js';
import { DRENT_SITES, DRENT_NPC_POSITIONS, DRENT_LOCAL_PATHS, drentFeatureClear } from './drent-sites.js';
import { createDrentCivilWarScenery } from './drent-scenery.js';
import { createRoadAmbushScenery } from './road-ambush-scenery.js';
import { createSpiderDenScenery, createNothomThicketScenery } from './spider-den-scenery.js';
import { CAGNEY_WAVES } from './cagney-quest.js';
import { createRoadSurfaceMask } from './path-junctions.js';

/**
 * The playable world of Drent, Luscia, the Moros Plain and East Suval.
 *
 * Shapes, sizes and positions come from the authored atlas through
 * `region-world.js`; north is -Z and one authored hex is METRES_PER_HEX metres.
 * The literals outside Tidehaven are still written in the authored 56 m frame
 * and converted by `at()` at the point of use (see `world-scale.js`). Tidehaven, the
 * Greenway tutorial and the woodland places were built with the sea to the
 * south, so they are carried over whole inside `villageRoot`, a group turned a
 * quarter turn onto Drent's east-facing coast. Everything inside that group
 * still speaks the village's own local metres; everything else is world metres.
 */
// Tests and pure geometry callers retain their synchronous API.
export function createWorld(scene, options = {}) {
  const steps=createWorldSteps(scene,options);let step;
  do { step=steps.next(); if(!step.done)options.onProgress?.(step.value); } while(!step.done);
  return step.value;
}
export async function createWorldAsync(scene,{startup,cache,...options}={}) {
  startup?.stage('Checking saved terrain');
  const cachedTerrain=await cache?.read().catch(()=>null);
  let cacheWrite;
  const steps=createWorldSteps(scene,{...options,cachedTerrain,onTerrain:record=>{
    if(startup)startup.record.cache=record.hit?'hit':'miss';
    if(!record.hit&&!record.partial&&cache)cacheWrite=cache.write(record.data).catch(()=>false);
  }});
  let step, deadline=performance.now()+12;
  do {
    step=steps.next();
    if(!step.done&&typeof step.value==='string')startup?.stage(step.value);
    if(!step.done&&(options.loadingMode==='fast'?performance.now()>=deadline:typeof step.value==='string')){await yieldStartup();deadline=performance.now()+12;}
  } while(!step.done);
  if(cacheWrite){const saved=await cacheWrite;if(startup)startup.record.cacheSaved=saved;}
  return step.value;
}
function* createWorldSteps(scene, { spatialBatches = true, cachedTerrain=null, onTerrain=null, loadingMode="full", initialRegion=1, enabledRegions=null } = {}) {
  yield 'Preparing the world';
  const enabled=enabledRegions?new Set(enabledRegions.map(value=>typeof value==='number'?value:REGION_IDS[value]).filter(Boolean)):null;
  const enabledId=id=>!enabled||enabled.has(id);
  const fast=loadingMode==='fast'||!!enabled, readyListeners=new Set(), processedScenery=new WeakSet();
  const centers={},adjacency={},cellOwners=new Map();
  for(const [name,id] of Object.entries(REGION_IDS)) {
    const cells=REGION_CELLS[name]??[];
    centers[id]={x:cells.reduce((n,c)=>n+c.x,0)/(cells.length||1),z:cells.reduce((n,c)=>n+c.z,0)/(cells.length||1)};
    adjacency[id]=new Set();
    for(const c of SURVEY.regions.find(r=>r.name===name)?.cells??[])cellOwners.set(`${c.q},${c.r}`,id);
  }
  for(const [key,id] of cellOwners){const [q,r]=key.split(',').map(Number);for(const [dq,dr] of [[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]]){const other=cellOwners.get(`${q+dq},${r+dr}`);if(other&&other!==id)adjacency[id].add(other);}}
  let postBuild=()=>{}, clearLateProps=()=>{}, batchLate=null, streamTerrain=null;
  const visibilityByRegion=new Map();
  const regionBounds=new Map(Object.entries(REGION_IDS).map(([name,id])=>{const cells=REGION_CELLS[name]??[];return [id,{minX:Math.min(...cells.map(c=>c.x))-110,maxX:Math.max(...cells.map(c=>c.x))+110,minZ:Math.min(...cells.map(c=>c.z))-110,maxZ:Math.max(...cells.map(c=>c.z))+110}];}));
  const residency=fast?createSceneryResidency({boundsFor:id=>regionBounds.get(id)}):null;
  let residencyAt=null;
  const loading=fast?createRegionLoading({initialRegions:[initialRegion],regionAt,regionCenters:centers,adjacency,budgetMs:2,nearbyOnly:true,
    onComplete:event=>{postBuild(event);for(const id of event.regions)if(loading.isReady(id)){for(const root of visibilityByRegion.get(id)??[])root.visible=true;for(const listener of readyListeners)listener({regions:[id],revision:event.revision});}},
    onError:(error,id)=>console.error('Region loading failed:',id,error)}):null;
  const previousJobs=new Map();
  function* regionBuild(id,owned,build,defaults={},commit=()=>{}) {
    owned=owned.filter(enabledId);
    if(!owned.length)return deferredScenery(defaults).value;
    if(!fast){const built=yield* build(world);commit(built);return built;}
    const handle=deferredScenery(defaults), stage=new THREE.Group();stage.name=`Loading ${id}`;stage.visible=false;world.add(stage);
    const dependencies=[...new Set(owned.flatMap(r=>[...(r===initialRegion?[]:[`terrain-${r}`]),...(previousJobs.get(r)??[])]))];
    loading.register({id,regions:owned,dependencies,steps:function*(){
      const built=yield* stageBuildSteps(build(stage),world,stage);handle.install(built);commit(handle.value);
      if(batchLate)yield* batchLate(stage);
      yield* residency.register(stage,owned);
      // Reveal only after every component of this region has finished.
      for(const region of owned){if(!visibilityByRegion.has(region))visibilityByRegion.set(region,[]);visibilityByRegion.get(region).push(stage);}
      return handle.value;
    }});
    for(const r of owned){if(!previousJobs.has(r))previousJobs.set(r,[]);previousJobs.get(r).push(id);}
    return handle.value;
  }
  function* immediate(build){return build();}
  /** An authored (56 m per hex) point in world metres; Tidehaven's own frame never uses it. */
  const at = (x, z) => { const p = toWorld(x, z); return { x: p.x, z: p.z }; };
  let seed = 341937;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const range = (a, b) => a + random() * (b - a);
  let terrainSeed = 0x5a2f11b7;
  const trandom = () => { terrainSeed = (Math.imul(terrainSeed, 1664525) + 1013904223) >>> 0; return terrainSeed / 4294967296; };
  const trange = (a, b) => a + trandom() * (b - a);
  const clamp = THREE.MathUtils.clamp;
  const colliders = [];
  const treeRegistry = getTreeRegistry(colliders);
  const training = { x: 3, z: -12 };
  const repairBench = { x: 6, z: -6.4, name: 'Village repair bench' };
  const doomsayer = { x: -9.3, z: 2.2 }, pondFisher = { x: 20.4, z: -82 };
  const pond = { x: 27, z: -77, radius: 5.4, surfaceY: 0,
    fishingSpot: { x: 20.4, z: -77 }, castPoint: { x: 24.8, y: 0, z: -77.2 } };
  const firePits = [
    { id: 'village-fire', x: -9.2, z: -2.3, fireX: -10.5, fireZ: -2.3 },
    { id: 'pond-fire', x: 17.8, z: -72, fireX: 17.8, fireZ: -70.7 },
  ];
  const pondPaths = [
    [{ x: 0, z: -74 }, { x: 8, z: -74.7 }, { x: 15, z: -76.7 }, pond.fishingSpot],
    [{ x: 16.1, z: -77 }, { x: 18, z: -80 }, pondFisher],
    [{ x: 12.7, z: -76 }, { x: 15, z: -73 }, firePits[1]],
  ];
  function pondPathDistance(x, z) {
    let distance = Infinity;
    for (const path of pondPaths) for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], b = path[i], dx = b.x - a.x, dz = b.z - a.z;
      const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz), 0, 1);
      distance = Math.min(distance, Math.hypot(x - a.x - dx * t, z - a.z - dz * t));
    }
    return distance;
  }
  const featureClear = (x, z, tree = false) => Math.hypot(x - pond.x, z - pond.z) < pond.radius + (tree ? 2.8 : .1)
    || pondPathDistance(x, z) < (tree ? 2.35 : 1.45)
    || [doomsayer, pondFisher, ...firePits].some(p => Math.hypot(x - p.x, z - p.z) < (tree ? 2.1 : 1.0))
    || firePits.some(p => Math.hypot(x - p.fireX, z - p.fireZ) < (tree ? 2.1 : 1.25))
    || forestFeatureClear(x, z, tree) || drentFeatureClear(x, z, tree)
    || (p => brandyHomeClear(p.x, p.z, tree ? .8 : .1) || jesseWorkshopClear(p.x, p.z, tree ? 2.5 : .2))(villageToWorld(x, z));
  const encounter = { x: 0, z: -34, radius: 8 };
  const northTrail = { x: -5, z: -108, name: FERNWAY_REST.name };
  // Where Tidehaven's ground ends and the Avrel road begins. There was a gate on this line
  // until 22 September 2026; `barrierZ` is still the line, and there is nothing standing on it.
  const border = { x: 0, z: -156, name: WOOD_EDGE.name, barrierZ: -162,
    regionName: WOOD_EDGE.regionName, open: true, notice: false };
  const routeNorth = [
    { x: 0, z: -72 }, { x: -11, z: -86 }, { x: -5, z: -108 },
    { x: 8, z: -128 }, { x: 3, z: -143 }, { x: border.x, z: border.z },
  ];
  const inLessonSpace = (x, z, margin = 0) => Math.hypot(x - training.x, z - training.z) < 2.5 + margin
    || Math.hypot(x - encounter.x, z - encounter.z) < encounter.radius + margin;

  const world = new THREE.Group();
  world.name = 'Drent and the road to the Moros';
  scene.add(world);
  treeRegistry.configure({root:world});
  // Tidehaven, carried over whole onto Drent's east coast.
  const villageRoot = new THREE.Group();
  villageRoot.name = 'Tidehaven and the Greenway';
  villageRoot.position.set(VILLAGE.x, 0, VILLAGE.z);
  villageRoot.rotation.y = VILLAGE.yaw;
  world.add(villageRoot);
  const isLocal = parent => { for (let node = parent; node; node = node.parent) if (node === villageRoot) return true; return false; };
  /** Village colliders are authored locally; the world only ever sees world metres. */
  function vpush(collider) {
    const point = villageToWorld(collider.x, collider.z);
    collider.x = point.x; collider.z = point.z;
    if (Number.isFinite(collider.angle)) collider.angle += VILLAGE.yaw;
    if (collider.hx !== undefined) { const half = collider.hx; collider.hx = collider.hz; collider.hz = half; }
    colliders.push(collider);
    return collider;
  }
  // The goblin camp is authored in its own local metres too; it stands in the woods of southern Pueth (src/pueth-world.js).
  const hideoutRoot = new THREE.Group();
  hideoutRoot.name = 'Goblin camp site';
  hideoutRoot.position.set(HIDEOUT_SITE.x, 0, HIDEOUT_SITE.z);
  hideoutRoot.rotation.y = HIDEOUT_SITE.yaw;
  world.add(hideoutRoot);
  const hideoutPlaced = new WeakSet();
  const hideoutColliders = new Proxy(colliders, {
    get(target, property) {
      // A collider is converted once; the camp re-adds its supply collider when a save is restored.
      if (property === 'push') return (...items) => { for (const item of items) { if (!hideoutPlaced.has(item)) { const p = hideoutToWorld(item.x, item.z); item.x = p.x; item.z = p.z; if (Number.isFinite(item.angle)) item.angle += HIDEOUT_SITE.yaw; hideoutPlaced.add(item); } target.push(item); } return target.length; };
      const value = target[property];
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
  const localColliders = new Proxy(colliders, {
    get(target, property) {
      if (property === 'push') return (...items) => { for (const item of items) vpush(item); return target.length; };
      const value = target[property];
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });

  const materials = {};
  const material = (color, extra = {}) => {
    const key = `${color}:${JSON.stringify(extra)}`;
    return materials[key] ||= new THREE.MeshStandardMaterial({ color, roughness: 0.93, ...extra });
  };
  const wood = material('#71523a');
  const woodLight = material('#ab7950');
  const darkWood = material('#59432e');
  const cream = material('#eee0ac');
  const rockMat = material('#85998a');
  const windowMat = material('#ffe4a0', { emissive: '#ffd287', emissiveIntensity: 0.52, roughness: 0.35 });
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, 7);
  const round = new THREE.IcosahedronGeometry(1, 0);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  function mesh(geometry, mat, x, y, z, sx = 1, sy = 1, sz = 1, parent = villageRoot) {
    const item = new THREE.Mesh(geometry, mat);
    item.position.set(x, y, z);
    item.scale.set(sx, sy, sz);
    item.castShadow = true;
    item.receiveShadow = true;
    parent.add(item);
    return item;
  }
  const box = (mat, x, y, z, sx, sy, sz, parent = villageRoot) => mesh(cube, mat, x, y, z, sx, sy, sz, parent);
  const post = (mat, x, y, z, radius, height, parent = villageRoot) => mesh(cylinder, mat, x, y, z, radius, height, radius, parent);
  const pebble = (mat, x, y, z, sx, sy, sz, parent = villageRoot) => mesh(round, mat, x, y, z, sx, sy, sz, parent);

  // ---------------------------------------------------------------------------
  // Ground
  // ---------------------------------------------------------------------------
  /** Tidehaven's own field, including its pond, in local metres. */
  function localGround(x, z) {
    const original = villageBase(x, z), distance = Math.hypot(x - pond.x, z - pond.z);
    if (distance < pond.radius) return pond.surfaceY - .85 * (1 - smooth(pond.radius - 1.5, pond.radius, distance));
    if (distance < pond.radius + 2.4) return THREE.MathUtils.lerp(pond.surfaceY, original, smooth(pond.radius, pond.radius + 2.4, distance));
    return original;
  }
  /** World ground: the hex biomes, Tidehaven where it stands, the Caloss channel. */
  const avrelSurface = groundWithRiver(AVREL_POND.x, AVREL_POND.z) - 1.15;
  function rawGroundHeight(x, z) {
    const local = worldToVillage(x, z), weight = villageWeight(local.x, local.z);
    if (weight <= 0) return portCalosGround(x, z, avrelPondGround(x, z, groundWithRiver(x, z), avrelSurface));
    const village = localGround(local.x, local.z);
    if (weight >= 1) return village;
    return lerp(groundWithRiver(x, z), village, weight);
  }
  function uncarvedForestGround(x,z) { return groveGround(x,z,(a,b)=>brandyHomeGround(a,b,rawGroundHeight)); }
  const ibenwoodRivers=createIbenwoodRiverSystem({groundHeight:uncarvedForestGround});
  function legacyAlezhorBankHeight(x,z) { return ibenwoodRivers.ground(x,z,uncarvedForestGround(x,z)); }
  const alezhorBanks=createAlezhorBankGround(ibenwoodRivers);
  function groundHeight(x, z) { return alezhorBanks.ground(x,z,legacyAlezhorBankHeight(x,z)); }
  pond.surfaceY = villageBase(pond.x, pond.z) - .55;
  pond.castPoint.y = pond.surfaceY + .035;
  const pondWorld = villageToWorld(pond.x, pond.z);

  let bridgeDeck = null;
  const bridgeDecks = [];
  /** The bridge deck under a point, if any: the Caloss's, or the Tessen's in Pueth. */
  function deckAt(x, z) {
    for (const deck of bridgeDecks) {
      const dx = x - deck.crossing.x, dz = z - deck.crossing.z;
      const along = dx * deck.axis.x + dz * deck.axis.z;
      const across = dx * deck.side.x + dz * deck.side.z;
      if (Math.abs(along) <= deck.halfSpan + .4 && Math.abs(across) <= 2.55) return deck;
    }
    return null;
  }
  let roadHeightAt = () => null;
  let portGroundAt = (x,z) => groundHeight(x,z);
  let southOremindiSurface=null,baldroSurface=null,westOremindiSurface=null,babonSurface=null,canerdSurface=null,pyraSurface=null,selamusSurface=null;
  const northernSurfaces=new Map();
  let acorSurface=null,urubondSurface=null;
  function heightAt(x, z) {
    const urubondHeight=urubondSurface?.fineGroundHeight(x,z);if(urubondHeight!=null)return urubondHeight;
    if(acorSurface&&(acorOwns(x,z)||outerOwns(x,z)))return acorSurface(x,z);
    const northernRegion=northernCellAt(x,z)?.region,northernFloor=northernSurfaces.get(northernRegion);if(northernFloor)return northernFloor.heightAt(x,z);
    const selamusHeight=selamusSurface?.fineGroundHeight(x,z);if(selamusHeight!=null)return selamusHeight;
    const pyraHeight=pyraSurface?.fineGroundHeight(x,z);if(pyraHeight!=null)return pyraHeight;
    const canerdHeight=canerdSurface?.fineGroundHeight(x,z);if(canerdHeight!=null)return canerdHeight;
    if(babonSurface&&babonOwns(x,z))return babonSurface(x,z);
    if(westOremindiSurface&&westOremindiOwns(x,z))return westOremindiSurface(x,z);
    if(baldroSurface&&baldroOwns(x,z))return baldroSurface(x,z);
    if(southOremindiSurface&&southOremindiOwns(x,z))return southOremindiSurface(x,z);
    const local = worldToVillage(x, z);
    // The pier deck, exactly as Tidehaven always had it.
    if (Math.abs(local.x) < 2.2 && local.z >= 22 && local.z <= 48) return 1.8;
    // Port Calos reaches into the inlet on a solid stone quay.
    const portDeck = portCalosDeckHeight(x, z);
    if (portDeck !== null) return portDeck;
    // Cobble's quay, out over the water of the bay in Peblos.
    const quay = quayHeight(x, z);
    if (quay !== null) return quay;
    // Elod's quayside, along the waterline under the city's revetment.
    const elodQuay = elodQuayHeight(x, z);
    if (elodQuay !== null) return elodQuay;
    // Izolveth's quay and the two moles that close its harbour, in West Izol.
    const izolDeck = izolDeckHeight(x, z);
    if (izolDeck !== null) return Math.max(izolDeck, groundHeight(x, z));
    // Solis's ramp, stone quay, timber piers and breakwater share their drawn deck heights.
    const nylonDeck=nylonHarborDeckHeight(x,z);if(nylonDeck!==null)return nylonDeck;
    const aevisDeck=aevisDeckHeight(x,z);if(aevisDeck!==null)return aevisDeck;
    const solisDeck = solisHarborDeckHeight(x, z);
    if (solisDeck !== null) return solisDeck;
    // Tharganhom's stair and attic floor, on the main street of Solis.
    const attic = atticDeckHeight(x, z, groundHeight);
    if (attic !== null) return attic;
    const deck = deckAt(x, z);
    if (deck) return deck.deckY + .09;
    // Ambron's causeway, over the narrows and down to the made ground of each bank.
    const menoraDeck=menoraDeckHeight(x,z);if(menoraDeck!==null)return menoraDeck;
    const causeway = ambronDeckHeight(x, z);
    if (causeway !== null) return causeway;
    // The Haethom levee and Liban's hummock (src/nethereum-farm.js, 6 October 2026): the ground with the bank on it.
    const haethom=nethereumFarmHeight(x,z,groundHeight);if(haethom!==null)return haethom;
    // The Velsorten canal's banks and its carried bed (src/ovesos-farm.js, 6 October 2026): built ground, as the levee is.
    const velsorten=ovesosFarmHeight(x,z,groundHeight);if(velsorten!==null)return velsorten;
    if(inPortCalos(x,z))return portGroundAt(x,z);
    return roadHeightAt(x, z) ?? groundHeight(x, z);
  }

  const fishingSpots = [
    { id: 'willowmere', name: 'Willowmere Pond', x: pondWorld.x, z: pondWorld.z, radius: pond.radius, surfaceY: pond.surfaceY,
      fishingSpot: villageToWorld(pond.fishingSpot.x, pond.fishingSpot.z),
      castPoint: { ...villageToWorld(pond.castPoint.x, pond.castPoint.z), y: pond.castPoint.y } },
    { id: 'reedwater', name: 'Caloss fishing bank', x: CALOSS_BANK.spot.x, z: CALOSS_BANK.spot.z,
      surfaceY: calossSurface(CALOSS_BANK.cast.x, CALOSS_BANK.cast.z),
      fishingSpot: { ...CALOSS_BANK.spot },
      castPoint: { x: CALOSS_BANK.cast.x, y: calossSurface(CALOSS_BANK.cast.x, CALOSS_BANK.cast.z) + .035, z: CALOSS_BANK.cast.z } },
    // A bank on the Tessen, downstream of the bridge on the Pueth side.
    { id: 'tessen-bank', name: 'Tessen bank', x: -80, z: -201.5, surfaceY: puethRiverSurface(PUETH_RIVERS[0], -80, -193.5),
      fishingSpot: { x: -80, z: -201.5 }, castPoint: { x: -80, y: puethRiverSurface(PUETH_RIVERS[0], -80, -193.5) + .035, z: -193.5 } },
  ];
  fishingSpots.push({ ...AVREL_POND, lessonStand: AVREL_POND.teacherStand, lessonApproach: [{x:-411,z:58},{x:-409,z:71}], surfaceY: avrelSurface, castPoint: { ...AVREL_POND.castPoint, y: avrelSurface + .035 } });
  let activeFishingSpot = fishingSpots[0];

  // ---------------------------------------------------------------------------
  // Roads: drawn in world metres, sampled locally for Tidehaven's own scatter
  // ---------------------------------------------------------------------------
  const roadSegments = [], paths = [], movingGroups = new Set(), pathSurfaces = [];
  const drapedRoadCells = new Map(), drapedRoadCellSize = 12;
  const forkSurfaceStrength = (x, z) => 1 - smooth(25, 45, Math.hypot(x - CALOSS_ROAD_FORK.x, z - CALOSS_ROAD_FORK.z));
  const roadSurfaceMetrics = { roads: 0, sourceTriangles: 0, renderedTriangles: 0, drapeMilliseconds: 0 };
  /** Road centre lines, coarse, for keeping scatter and scenery off the road. */
  function measurePath(points, width) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p.x, 0, p.z)));
    const samples = curve.getPoints(Math.max(2, Math.ceil(curve.getLength() / 4)));
    for (let i = 1; i < samples.length; i++) roadSegments.push({ ax: samples[i - 1].x, az: samples[i - 1].z,
      bx: samples[i].x, bz: samples[i].z, width });
  }
  function addPath(points, width, parent = world, kind = width < 2.3 ? 'trail' : 'road') {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p.x, 0, p.z)));
    const samples = curve.getPoints(Math.max(2, Math.ceil(curve.getLength() / 1.1)));
    const positions = [], indices = [], overCaloss = [];
    for (let i = 0; i < samples.length; i++) {
      const p = samples[i];
      // Bridges and the harbor quay supply their own road surface.
      // Keep dirt ribbons off these decks, including the broken bridge span.
      overCaloss.push(deckAt(p.x, p.z) === bridgeDeck || portCalosDeckHeight(p.x, p.z) !== null);
      const direction = samples[Math.min(i + 1, samples.length - 1)].clone().sub(samples[Math.max(0, i - 1)]).normalize();
      const left = new THREE.Vector3(-direction.z, 0, direction.x).multiplyScalar(width / 2 * (1 + Math.sin(i * .61) * .025));
      for (const sign of [-1, 1]) {
        const x = p.x + left.x * sign, z = p.z + left.z * sign;
        const deck = deckAt(x, z);
        positions.push(x, (deck ? deck.deckY + .05 : groundHeight(x, z)) + .045, z);
      }
      if (i && !overCaloss[i - 1] && !overCaloss[i]) {
        const j = i * 2; indices.push(j - 2, j, j - 1, j - 1, j, j + 1);
      }
    }
    // The fork and its parent road share the actual terrain faces. An analytic
    // height at the ribbon edges is not enough on this coarse rolling ground.
    streamTerrain?.ensureRibbon(positions);
    const drapeStarted = performance.now();
    const draped = points === MAIN_ROAD || points === CALOSS_ELAGOS_ROAD || PORT_CALOS_PATHS.some(path => path.points === points) || points === SYLVIA_PATH.points
      ? drapeRoadOnTerrain(positions, indices, terrainXs, terrainZs, terrainPositions, .045, points === MAIN_ROAD ? forkSurfaceStrength : null) : null;
    if (draped) {
      roadSurfaceMetrics.roads++;
      roadSurfaceMetrics.sourceTriangles += indices.length / 3;
      roadSurfaceMetrics.renderedTriangles += draped.indices.length / 3;
      roadSurfaceMetrics.drapeMilliseconds += performance.now() - drapeStarted;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(draped?.positions ?? positions, 3));
    geometry.setIndex(draped?.indices ?? indices);
    geometry.computeVertexNormals();
    const path = new THREE.Mesh(geometry, material(kind === 'trail' ? '#a2916c' : '#c6b384', { side: THREE.DoubleSide }));
    path.name = kind === 'trail' ? 'Dirt footpath' : 'Main road';
    path.receiveShadow = true;
    parent.add(path);
    pathSurfaces.push({ mesh: path, kind });
    // Steering follows the same curve the road mesh shows, not chords between
    // its sparse authoring controls (which cut across the Avrel bends).
    // Sample metres, not spline parameter: adding controls at a distant gate
    // must not spread this road's navigation points across its tight bends.
    curve.arcLengthDivisions = Math.max(200, points.length * 96);
    curve.updateArcLengths();
    const walkingPath = Object.assign(curve.getSpacedPoints(Math.max(2, Math.ceil(curve.getLength() / 3))).map(p => ({ x: p.x, z: p.z })), { kind, width });
    paths.push(walkingPath);
    if (draped) for (let i = 1; i < walkingPath.length; i++) {
      const a = walkingPath[i - 1], b = walkingPath[i], radius = width / 2 + 2.5, segment = { a, b, radius, halfWidth: width / 2, forkOnly: points === MAIN_ROAD };
      if (segment.forkOnly && Math.hypot((a.x + b.x) / 2 - CALOSS_ROAD_FORK.x, (a.z + b.z) / 2 - CALOSS_ROAD_FORK.z) > 50) continue;
      for (let gx = Math.floor((Math.min(a.x, b.x) - radius) / drapedRoadCellSize); gx <= Math.floor((Math.max(a.x, b.x) + radius) / drapedRoadCellSize); gx++)
        for (let gz = Math.floor((Math.min(a.z, b.z) - radius) / drapedRoadCellSize); gz <= Math.floor((Math.max(a.z, b.z) + radius) / drapedRoadCellSize); gz++) {
          const key = `${gx},${gz}`;
          if (!drapedRoadCells.has(key)) drapedRoadCells.set(key, []);
          drapedRoadCells.get(key).push(segment);
        }
    }
  }
  const roadDistanceIndex=createRoadDistanceIndex(roadSegments);
  function roadDistance(x, z) { return roadDistanceIndex.distance(x,z); }
  // Tidehaven's vegetation uses the original local road sampling, so the
  // woodland's tree, acorn, stick and squirrel layout is unchanged.
  const originalScatterSegments = [];
  const localTrail = [{ x: 0, z: 25 }, { x: 0, z: 9 }, { x: 0, z: -5 }, { x: -1.6, z: -20 }, { x: 1.7, z: -34 },
    { x: 0, z: -47 }, { x: -1.5, z: -60 }, ...routeNorth,
    { x: 1, z: -184 }, { x: -9, z: -220 }, { x: -25, z: -267 }, { x: -19, z: -330 }];
  const localSidePaths = [
    [{ x: -21, z: 13 }, { x: -10, z: 8 }, { x: 0, z: 7 }, { x: 14, z: 7 }, { x: 27, z: 9 }],
    [{ x: -24, z: -12 }, { x: -11, z: -8 }, { x: 0, z: -9 }, { x: 12, z: -9 }, { x: 25, z: -17 }],
    [{ x: 0, z: -40 }, { x: 12, z: -43 }, { x: 24, z: -53 }, { x: 32, z: -60 }],
  ];
  for (const [index, points] of [localTrail, ...localSidePaths].entries()) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p.x, 0, p.z)));
    const samples = curve.getPoints(Math.ceil(curve.getLength() / .65));
    for (let i = 1; i < samples.length; i++) originalScatterSegments.push({ ax: samples[i - 1].x, az: samples[i - 1].z,
      bx: samples[i].x, bz: samples[i].z, width: index === 0 ? 4.2 : 2.6 });
  }
  const localPathDistanceIndex=createRoadDistanceIndex(originalScatterSegments);
  function localPathDistance(x, z) { return localPathDistanceIndex.distance(x,z); }
  const distanceToPath = localPathDistance;

  // ---------------------------------------------------------------------------
  // Terrain: one graded grid over the whole world, finest around Tidehaven
  // ---------------------------------------------------------------------------
  function axisSamples(min, max, fineMin, fineMax) {
    const out = [min];
    let value = min;
    while (value < max) {
      const outside = Math.max(fineMin - value, value - fineMax, 0);
      const next = value + 2.5 + Math.min(4.6, outside / 20 * 4.6);
      if (next < max) { value = next; out.push(value); continue; }
      // The last step is clamped to the edge, which can leave a sliver narrower than the fine
      // band there - 0.27 m when the world grew west. Fold the remainder into the last step if
      // that step can take it, else share it between the last two, so no gap is ever under the
      // fine spacing or over the coarse.
      const before = out.length >= 2 ? out[out.length - 2] : null;
      if (max - value >= 2.2 || before === null) out.push(max);
      else if (max - before <= 7.1) out[out.length - 1] = max;
      else { out[out.length - 1] = (before + max) / 2; out.push(max); }
      break;
    }
    return out;
  }
  // Vertex spacing is unchanged; the grid simply covers more ground. The fine
  // 2.5 m band still holds Tidehaven, which did not move, and the Avrel
  // clearing, which did.
  // Keep the established mesh samples east of the old edge byte-for-byte stable.
  // Starting the sampler at the new edge would rephase every road and tree base.
  const establishedWestEdge = -3010.001927939127 - 80;
  const legacyTerrainXs = axisSamples(establishedWestEdge, WORLD_BOUNDS.maxX + 80, Math.min(-252, AVREL_CLEARING.x - 60), 62);
  const legacyWestEdge = -4610.001927939127 - 80;
  const extension = [], extensionCount = Math.ceil((establishedWestEdge - legacyWestEdge) / 7.1);
  for (let i = extensionCount; i > 0; i--) extension.push(establishedWestEdge - i * (establishedWestEdge - legacyWestEdge) / extensionCount);
  legacyTerrainXs.unshift(...extension);
  const {samples:terrainXs,addedColumns}=appendWesternTerrainSamples(legacyTerrainXs,WORLD_BOUNDS.minX-80);
  // The fine band reaches north over the Tessen bridge and its road post, so the river's cut and the embankment read true.
  const establishedNorthEdge=-2167.195996001615-80;
  const terrainZs = axisSamples(establishedNorthEdge, WORLD_BOUNDS.maxZ + 80, Math.min(-110, TESSEN_BRIDGE.crossing.z - 45), Math.max(172, AVREL_CLEARING.z + 60));
  const northExtension=[],northCount=Math.max(0,Math.ceil((establishedNorthEdge-(WORLD_BOUNDS.minZ-80))/7.1));
  for(let i=northCount;i>0;i--)northExtension.push(establishedNorthEdge-i*(establishedNorthEdge-(WORLD_BOUNDS.minZ-80))/northCount);
  terrainZs.unshift(...northExtension);
  const columns = terrainXs.length, rows = terrainZs.length;
  const cacheHit=terrainCacheMatches(cachedTerrain,terrainXs,terrainZs);
  yield cacheHit?'Restoring terrain':'Shaping terrain';
  const terrainPositions = cacheHit?cachedTerrain.positions:new Float32Array(columns * rows * 3);
  const terrainColors = cacheHit?cachedTerrain.colors:new Float32Array(columns * rows * 3);
  const grassColors = ['#86a859', '#80a452', '#92ac5e', '#75994f', '#83a45b'];
  const meadowTint = new THREE.Color(), beachColor = new THREE.Color('#d5c99a'), villageColor = new THREE.Color();
  const sampled=new Uint8Array(columns*rows);
  if(cacheHit)sampled.fill(1);
  const villageSeedCornerA=villageToWorld(-124,-196),villageSeedCornerB=villageToWorld(124,96);
  const terrainSeedAt=fast&&!cacheHit?createTerrainSeedLookup({xs:terrainXs,zs:terrainZs,startColumn:addedColumns,seed:terrainSeed,
    villageBounds:{minX:Math.min(villageSeedCornerA.x,villageSeedCornerB.x),maxX:Math.max(villageSeedCornerA.x,villageSeedCornerB.x),minZ:Math.min(villageSeedCornerA.z,villageSeedCornerB.z),maxZ:Math.max(villageSeedCornerA.z,villageSeedCornerB.z)},extensionSeed:extensionTerrainSeed}):null;
  function sampleTerrain(i,j){
    const previousTerrainSeed=terrainSeed;
    if(i<addedColumns&&!terrainSeedAt)terrainSeed=extensionTerrainSeed(terrainXs[i],terrainZs[j]);
    if(terrainSeedAt)terrainSeed=terrainSeedAt(i,j);
    const x = terrainXs[i], z = terrainZs[j], index = j * columns + i;
    // Amod's terraces and Imlamdris's are drawn by their own fine patches (src/amod-scenery.js,
    // src/south-suval-scenery.js); the coarse grid is sunk out of sight beneath them.
    terrainPositions.set([x, groundHeight(x, z) - amodTerrainSink(x, z) - imlamdrisTerrainSink(x, z) - suvalHighlandTerrainSink(x, z) - lotharnTerrainSink(x, z) - westLotharnTerrainSink(x, z) - feradomTerrainSink(x, z) - varnTerrainSink(x, z) - telemoniaTerrainSink(x, z) - trelossTerrainSink(x, z) - canerdTerrainSink(x,z) - pyraTerrainSink(x,z) - selamusTerrainSink(x,z) - urubondTerrainSink(x,z), z], index * 3);
    groundTint(color, x, z, THREE);
    const local = worldToVillage(x, z), weight = villageWeight(local.x, local.z);
    if (weight > 0) {
      villageColor.set(grassColors[Math.floor(trandom() * grassColors.length)]);
      meadowTint.setHSL(.198 + Math.sin(local.x * .034 + local.z * .012) * .023, .31, .49, THREE.SRGBColorSpace);
      villageColor.lerp(meadowTint, smooth(132, 171, -local.z));
      villageColor.lerp(beachColor, smooth(18.5, 29, local.z - Math.sin(local.x * .055) * 2.5));
      villageColor.multiplyScalar(trange(0.94, 1.05));
      tintForestGround(villageColor, local.x, local.z);
      color.lerp(villageColor, weight);
    } else color.multiplyScalar(trange(.955, 1.045));
    terrainColors[index*3]=color.r;terrainColors[index*3+1]=color.g;terrainColors[index*3+2]=color.b;
    sampled[index]=1;
    if(i<addedColumns&&!terrainSeedAt)terrainSeed=previousTerrainSeed;
  }
  if(!fast&&!cacheHit)for(let j=0;j<rows;j++){for(let i=0;i<columns;i++)sampleTerrain(i,j);if(j%16===0)yield `Shaping terrain (${Math.round(j/rows*100)}%)`;}
  const terrainMaterial = material('#ffffff', { vertexColors: true, flatShading: true });
  const terrainRoot = new THREE.Group();terrainRoot.name='The ground of Azhora';world.add(terrainRoot);
  if(fast){
    streamTerrain=createStreamedTerrain({THREE,xs:terrainXs,zs:terrainZs,positions:terrainPositions,colors:terrainColors,sample:sampleTerrain,sampled,root:terrainRoot,material:terrainMaterial,cells:REGION_CELLS,ids:REGION_IDS,originColumn:addedColumns});
    yield* streamTerrain.buildRegion(initialRegion);
    for(const id of Object.values(REGION_IDS))if(id!==initialRegion&&enabledId(id))loading.register({id:`terrain-${id}`,regions:[id],steps:()=>streamTerrain.buildRegion(id)});
    if(onTerrain)onTerrain({hit:cacheHit,partial:true});
  }
  // Residents and props share the displayed ground, including between the harbor streets.
  portGroundAt = (x,z) => {streamTerrain?.ensureAt(x,z);return terrainRoadHeight(x,z,terrainXs,terrainZs,terrainPositions,0);};
  // Only the new west road and nearby fork use the mesh plane for footing. Decks
  // remain higher priority in heightAt; the rest of the world keeps its ground.
  roadHeightAt = (x, z) => {
    streamTerrain?.ensureAt(x,z);
    let strength = 0;
    for (const { a, b, radius, halfWidth, forkOnly } of drapedRoadCells.get(`${Math.floor(x / drapedRoadCellSize)},${Math.floor(z / drapedRoadCellSize)}`) ?? []) {
      const dx = b.x - a.x, dz = b.z - a.z, t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz), 0, 1);
      const distance = Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
      strength = Math.max(strength, (1 - smooth(halfWidth + .1, radius, distance)) * (forkOnly ? forkSurfaceStrength(x, z) : 1));
    }
    return strength ? lerp(groundHeight(x, z), terrainRoadHeight(x, z, terrainXs, terrainZs, terrainPositions), strength) : null;
  };
  yield 'Preparing terrain surfaces';
  if(!fast){
  const terrainIndices = new Uint32Array((rows-1)*(columns-1)*6);let terrainIndex=0;
  for (let j = 0; j < rows - 1; j++) for (let i = 0; i < columns - 1; i++) {
    const a = j * columns + i;
    terrainIndices[terrainIndex++]=a;terrainIndices[terrainIndex++]=a+columns;terrainIndices[terrainIndex++]=a+1;
    terrainIndices[terrainIndex++]=a+1;terrainIndices[terrainIndex++]=a+columns;terrainIndices[terrainIndex++]=a+columns+1;
  }
  const terrainGeometry = new THREE.BufferGeometry();
  terrainGeometry.setAttribute('position', new THREE.BufferAttribute(terrainPositions, 3));
  terrainGeometry.setAttribute('color', new THREE.BufferAttribute(terrainColors, 3));
  terrainGeometry.setIndex(new THREE.BufferAttribute(terrainIndices,1));
  if(cacheHit)terrainGeometry.setAttribute('normal',new THREE.BufferAttribute(cachedTerrain.normals,3));
  else terrainGeometry.computeVertexNormals();
  onTerrain?.({hit:cacheHit,data:{xs:terrainXs,zs:terrainZs,positions:terrainPositions,colors:terrainColors,normals:terrainGeometry.attributes.normal.array}});

  if (!spatialBatches) {
    const single = new THREE.Mesh(terrainGeometry, terrainMaterial);
    single.receiveShadow = true; single.name = 'Whole-world terrain';
    terrainRoot.add(single);
  } else {
    // Share one vertex buffer between tiles; only index ranges and bounds differ,
    // so a camera facing Drent can discard the Moros without changing the ground.
    // More ground, same tile footprint: a camera in Drent still discards the Moros.
    const tilesX = Math.round(7 * WORLD_SCALE), tilesZ = Math.round(7 * WORLD_SCALE);
    const spanX = Math.ceil((legacyTerrainXs.length - 1) / tilesX), spanZ = Math.ceil((rows - 1) / tilesZ);
    const bounds = new THREE.Box3(), vertex = new THREE.Vector3();
    const positionAttribute = terrainGeometry.attributes.position;
    for (let tz = 0; tz < tilesZ; tz++) for (const range of preservedTerrainTileRanges(legacyTerrainXs.length,addedColumns,spanX)) {
      const tx=range.key,firstX = range.first, firstZ = tz * spanZ;
      const lastX = range.last, lastZ = Math.min(firstZ + spanZ, rows - 1);
      if (firstX >= lastX || firstZ >= lastZ) continue;
      const indices = [];
      bounds.makeEmpty();
      for (let j = firstZ; j <= lastZ; j++) for (let i = firstX; i <= lastX; i++)
        bounds.expandByPoint(vertex.fromBufferAttribute(positionAttribute, j * columns + i));
      for (let j = firstZ; j < lastZ; j++) for (let i = firstX; i < lastX; i++) {
        const a = j * columns + i;
        indices.push(a, a + columns, a + 1, a + 1, a + columns, a + columns + 1);
      }
      const geometry = new THREE.BufferGeometry();
      for (const [name, attribute] of Object.entries(terrainGeometry.attributes)) geometry.setAttribute(name, attribute);
      geometry.setIndex(indices);
      geometry.boundingBox = bounds.clone();
      geometry.boundingSphere = bounds.getBoundingSphere(new THREE.Sphere());
      const tile = new THREE.Mesh(geometry, terrainMaterial);
      tile.name = `Terrain ${tx}:${tz}`; tile.receiveShadow = true;
      terrainRoot.add(tile);
    }
  }

  }

  // ---------------------------------------------------------------------------
  // The Stills
  // ---------------------------------------------------------------------------
  // Open water on every side, far enough out that its edge reads as the horizon
  // rather than as the corner of a plane: from Peblos the traveler looks east at nothing else.
  yield 'Water and shores';
  const seaWidth = WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX + 900, seaDepth = WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ + 900;
  // One vertex per 32 m, as the 2 280 m sea always had, so the swell keeps its scale.
  const waterGeometry = new THREE.PlaneGeometry(seaWidth, seaDepth, Math.round(seaWidth / 32), Math.round(seaDepth / 32));
  waterGeometry.rotateX(-Math.PI / 2);
  const waterMaterial = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, shallow: { value: new THREE.Color('#65bdba') }, deep: { value: new THREE.Color('#328e9c') } },
    vertexShader: `uniform float time; varying vec3 vWorld; varying float vWave;
      void main() { vec3 p=position; float w=sin(p.x*.12+time*.65)*.10+sin(p.z*.19+p.x*.035+time*.8)*.055;
      p.y+=w; vWave=w; vec4 world=modelMatrix*vec4(p,1.); vWorld=world.xyz; gl_Position=projectionMatrix*viewMatrix*world; }`,
    fragmentShader: `uniform float time; uniform vec3 shallow; uniform vec3 deep; varying vec3 vWorld; varying float vWave;
      void main() { float band=sin(vWorld.x*.26+vWorld.z*.47+time*.7)*sin(vWorld.x*.45-vWorld.z*.1+time*.21);
      vec3 col=mix(shallow,deep,smoothstep(20.,150.,vWorld.x)); col+=vWave*.32;
      float sparkle=pow(max(0.,band),22.); col+=vec3(.21,.25,.20)*sparkle;
      gl_FragColor=vec4(col,1.); }`,
  });
  const water = new THREE.Mesh(waterGeometry, waterMaterial);
  water.name = 'The Stills';
  water.position.set((WORLD_BOUNDS.minX + WORLD_BOUNDS.maxX) / 2, SEA_LEVEL, (WORLD_BOUNDS.minZ + WORLD_BOUNDS.maxZ) / 2);
  world.add(water);
  // A foam line traced along the actual coast, from Drent's north cape to the
  // southern bay, so the shore reads as a place and not a plane edge.
  const shorePoints = [];
  const shoreFrom = at(240, -170), shoreTo = at(-320, 330);
  for (let z = shoreFrom.z; z <= shoreTo.z; z += 5) {
    let best = null;
    for (let x = shoreFrom.x; x > shoreTo.x; x -= 3) {
      const distance = landDistance(x, z);
      // The Pebbles are land too; the mainland's coast is what this traces.
      if (distance >= 0 && !islandAt(x, z)) { best = x + clamp(distance, 0, 2.5); break; }
    }
    if (best !== null) shorePoints.push({ x: best, z });
  }
  const shorePositions = [];
  for (const spot of shorePoints) shorePositions.push(spot.x, .11, spot.z, spot.x + .28 + Math.sin(spot.z * .2) * .09, .115, spot.z);
  const shoreIndices = [];
  for (let i = 2; i < shorePositions.length / 3; i += 2) shoreIndices.push(i - 2, i, i - 1, i - 1, i, i + 1);
  const shoreGeometry = new THREE.BufferGeometry();
  shoreGeometry.setAttribute('position', new THREE.Float32BufferAttribute(shorePositions, 3));
  shoreGeometry.setIndex(shoreIndices);
  const shoreFoam = new THREE.Mesh(shoreGeometry, new THREE.MeshBasicMaterial({ color: '#ddf2d9', transparent: true, opacity: .38, side: THREE.DoubleSide }));
  shoreFoam.name = 'Shore foam';
  world.add(shoreFoam);

  // ---------------------------------------------------------------------------
  // Shared props, authored in whichever frame their parent belongs to
  // ---------------------------------------------------------------------------
  const groundFor = parent => (isLocal(parent) ? localGround : groundHeight);
  const pushFor = parent => (isLocal(parent) ? vpush : (collider => { colliders.push(collider); return collider; }));
  function roofGeometry(width, depth, rise) {
    const w = width / 2, d = depth / 2;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([-w, 0, -d, w, 0, -d, 0, rise, -d, -w, 0, d, w, 0, d, 0, rise, d], 3));
    geometry.setIndex([0, 2, 1, 3, 4, 5, 0, 3, 5, 0, 5, 2, 1, 2, 5, 1, 5, 4, 0, 1, 4, 0, 4, 3]);
    geometry.computeVertexNormals();
    return geometry;
  }
  function rope(points, radius = .033, mat = material('#d7c198'), parent = villageRoot) {
    const geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), Math.max(6, points.length * 6), radius, 4, false);
    return mesh(geometry, mat, 0, 0, 0, 1, 1, 1, parent);
  }
  const houseLocations = [];
  const smokeSources = [];
  // `plain` leaves off the window flower boxes: nothing is grown on a window ledge in the Pebbles.
  function cottage(x, z, width, depth, height, roofColor, wallColor, angle = 0, parent = villageRoot, { plain = false } = {}) {
    const y = groundFor(parent)(x, z);
    const group = new THREE.Group(); group.position.set(x, y, z); group.rotation.y = angle; parent.add(group);
    if (isLocal(parent)) {
      houseLocations.push({ x, z, r: Math.max(width, depth) * .72 });
      const familyHome=FAMILY_HOMES.find(home=>home.house.local?.x===x&&home.house.local?.z===z);
      if(familyHome){group.name=`${familyHome.name} cottage`;group.userData.homeId=familyHome.id;}
    }
    pushFor(parent)({ x, z, r: Math.max(width, depth) * .62, kind: 'house', width, depth, angle });
    box(material('#929580'), 0, .2, 0, width + .35, .7, depth + .3, group);
    box(material(wallColor), 0, height / 2 + .38, 0, width, height, depth, group);
    box(darkWood, 0, .59, depth / 2 + .035, width, .19, .13, group);
    box(darkWood, 0, height + .28, depth / 2 + .035, width, .17, .14, group);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(wood, sx * (width / 2 - .06), height / 2 + .35, sz * (depth / 2 + .02), .18, height + .14, .18, group);
    const roofBase = height + .33;
    mesh(roofGeometry(width + .95, depth + 1.05, 1.85), material(roofColor), 0, roofBase, 0, 1, 1, 1, group);
    box(material('#d4a66f'), 0, roofBase + 1.85, 0, .18, .15, depth + 1.14, group);
    for (const side of [-1, 1]) {
      const trim = box(darkWood, side * (width + .95) / 4, roofBase + .92, depth / 2 + .55, Math.hypot((width + .95) / 2, 1.85), .15, .16, group);
      trim.rotation.z = -side * Math.atan2(1.85, (width + .95) / 2);
    }
    box(darkWood, 0, 1.32, depth / 2 + .09, 1.12, 2.02, .17, group);
    box(material('#997348'), 0, 1.32, depth / 2 + .19, .89, 1.88, .10, group);
    for (let k = -1; k <= 1; k++) box(wood, k * .23, 1.32, depth / 2 + .26, .028, 1.87, .025, group);
    pebble(material('#d4b465'), .3, 1.25, depth / 2 + .3, .055, .055, .035, group);
    box(rockMat, 0, .26, depth / 2 + .52, 1.55, .3, .8, group);
    for (const side of [-1, 1]) {
      const wx = side * width * .31;
      box(darkWood, wx, 2.03, depth / 2 + .075, 1.08, 1.18, .15, group);
      box(windowMat, wx, 2.03, depth / 2 + .17, .86, .94, .04, group);
      box(wood, wx, 2.03, depth / 2 + .21, .075, 1.0, .05, group);
      box(wood, wx, 2.03, depth / 2 + .215, .91, .075, .055, group);
      for (const shutter of [-1, 1]) box(material(roofColor), wx + shutter * .65, 2.03, depth / 2 + .14, .26, 1.13, .08, group);
      if (plain) continue;
      box(woodLight, wx, 1.34, depth / 2 + .35, 1.19, .27, .43, group);
      for (let f = 0; f < 5; f++) pebble(material(f % 2 ? '#eeb679' : '#d78082'), wx - .42 + f * .21, 1.62, depth / 2 + .38, .13, .17, .13, group);
    }
    box(darkWood, width / 2 + .075, 2.05, 0, .14, 1.1, 1.05, group);
    box(windowMat, width / 2 + .155, 2.05, 0, .035, .87, .84, group);
    box(wood, width / 2 + .19, 2.05, 0, .05, .92, .07, group);
    const chimneyX = -width * .27, chimneyZ = -depth * .21;
    box(material('#b38e77'), chimneyX, roofBase + 1.45, chimneyZ, .61, 2.1, .65, group);
    box(material('#cbb19a'), chimneyX, roofBase + 2.48, chimneyZ, .8, .16, .81, group);
    const source = new THREE.Vector3(chimneyX, roofBase + 2.64, chimneyZ).applyAxisAngle(new THREE.Vector3(0, 1, 0), angle).add(group.position);
    if (isLocal(parent)) { const world3 = villageToWorld(source.x, source.z); source.set(world3.x, source.y, world3.z); }
    smokeSources.push(source);
    return group;
  }
  function barrel(x, z, scale = 1, parent = villageRoot, y = groundFor(parent)(x, z)) {
    const barrelGeo = new THREE.CylinderGeometry(.38, .35, .95, 9);
    mesh(barrelGeo, woodLight, x, y + .48 * scale, z, scale, scale, scale, parent);
    const hoop = material('#59605a');
    [.18, .75].forEach(h => post(hoop, x, y + h * scale, z, .391 * scale, .06 * scale, parent));
    post(wood, x, y + .975 * scale, z, .33 * scale, .028, parent);
  }
  function crate(x, z, size = .8, y = null, parent = villageRoot) {
    const base = y === null ? groundFor(parent)(x, z) : y;
    box(woodLight, x, base + size / 2, z, size, size, size, parent);
    for (const dx of [-1, 1]) for (const dz of [-1, 1]) box(wood, x + dx * size * .43, base + size * .5, z + dz * size * .5, size * .095, size, size * .09, parent);
    const diagonal = box(wood, x, base + size * .5, z + size * .512, size * 1.14, size * .095, size * .045, parent); diagonal.rotation.z = Math.PI / 4;
  }
  function fence(x, z, length, rotation = 0, parent = villageRoot) {
    const group = new THREE.Group(); group.position.set(x, groundFor(parent)(x, z), z); group.rotation.y = rotation; parent.add(group);
    for (let f = -length / 2; f <= length / 2 + .1; f += 1.35) box(woodLight, f, .67, 0, .11, 1.3, .12, group);
    box(woodLight, 0, .51, 0, length, .12, .10, group); box(woodLight, 0, 1.04, 0, length, .11, .10, group);
  }
  function leanTo(x, z, tint = '#b29b70', angle = 0, parent = villageRoot) {
    const ground = groundFor(parent);
    const shelter = new THREE.Group(); shelter.position.set(x, ground(x, z), z); shelter.rotation.y = angle; parent.add(shelter);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) post(wood, sx * 2.2, 1.45, sz * 1.55, .11, 2.9, shelter);
    mesh(roofGeometry(5.2, 4.0, 1.25), material(tint), 0, 2.85, 0, 1, 1, 1, shelter);
    box(woodLight, -1.3, .42, -.7, 1.6, .1, .65, shelter);
    for (const x0 of [-1.85, -.75]) box(wood, x0, .2, -.7, .14, .4, .55, shelter);
    const push = pushFor(parent);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) push({
      x: x + sx * 2.2 * Math.cos(angle) + sz * 1.55 * Math.sin(angle),
      z: z - sx * 2.2 * Math.sin(angle) + sz * 1.55 * Math.cos(angle), r: .17, kind: 'shelter-post' });
    return shelter;
  }
  function wornPatch(x, z, radius, tint, edgeScale = 1, parent = world) {
    const ground = groundFor(parent);
    // A single triangle fan cuts through rolling ground across a large clearing.
    // Concentric rings keep the dirt on the terrain and below the road surface.
    const rings = Math.max(1, Math.ceil(radius / 1.5));
    const segments = Math.max(32, Math.ceil(Math.PI * 2 * radius / 1.5));
    const vertices = [x, ground(x, z) + .028, z], indices = [];
    for (let ring = 1; ring <= rings; ring++) for (let i = 0; i < segments; i++) {
      const angle = i / segments * Math.PI * 2, reach = radius * ring / rings;
      const irregular = 1 + Math.sin(i / segments * 32 * 2.1) * .045;
      const px = x + Math.cos(angle) * reach * irregular, pz = z + Math.sin(angle) * reach * irregular * edgeScale;
      vertices.push(px, ground(px, pz) + .028, pz);
      const outer = 1 + (ring - 1) * segments + i, next = 1 + (ring - 1) * segments + (i + 1) % segments;
      if (ring === 1) indices.push(0, next, outer);
      else { const inner = outer - segments, innerNext = next - segments; indices.push(inner, next, outer, inner, innerNext, next); }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const patch = new THREE.Mesh(geometry, material(tint));
    patch.name = 'Worn ground'; patch.userData.groundPatch = { x, z, radius };
    patch.receiveShadow = true;
    parent.add(patch);
  }
  const localPatch = (x, z, radius, tint, edgeScale = 1) => wornPatch(x, z, radius, tint, edgeScale, villageRoot);

  // ---------------------------------------------------------------------------
  // Tidehaven, unchanged in its own frame
  // ---------------------------------------------------------------------------
  const square = new THREE.CircleGeometry(6.8, 32);
  square.rotateX(-Math.PI / 2);
  const sqv = square.attributes.position;
  for (let i = 0; i < sqv.count; i++) {
    const x = sqv.getX(i), z = sqv.getZ(i) + 5;
    sqv.setXYZ(i, x, localGround(x, z) + .06, z);
  }
  square.computeVertexNormals();
  const plaza = new THREE.Mesh(square, material('#cabb8b')); plaza.receiveShadow = true; villageRoot.add(plaza);
  localPatch(training.x, training.z, 2.2, '#b9aa7b', .88);
  localPatch(encounter.x, encounter.z, 7.4, '#9ba967', 1.03);

  const pondGeometry = new THREE.CircleGeometry(pond.radius, 72);
  pondGeometry.rotateX(-Math.PI / 2);
  const pondMaterial = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: `varying vec3 p; void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform float time;varying vec3 p;void main(){
      float wave=sin(p.x*2.4+p.z*.8+time*.7)*sin(p.z*1.7-p.x*.5-time*.45);
      float edge=smoothstep(2.8,5.4,length(p.xz));
      vec3 color=mix(vec3(.105,.285,.255),vec3(.25,.44,.31),edge);
      color+=vec3(.11,.17,.13)*pow(max(0.,wave),12.);
      gl_FragColor=vec4(color,1.);}`,
  });
  const pondWater = new THREE.Mesh(pondGeometry, pondMaterial);
  pondWater.name = 'Willowmere forest pond';
  pondWater.position.set(pond.x, pond.surfaceY + .027, pond.z); villageRoot.add(pondWater);
  vpush({ x: pond.x, z: pond.z, r: pond.radius - .04, surface: pond.surfaceY, kind: 'pond-water' });
  const avrelWater = new THREE.Mesh(new THREE.CircleGeometry(AVREL_POND.radius, 48).rotateX(-Math.PI / 2), pondMaterial);
  avrelWater.name = 'Avrel farm pond';
  avrelWater.position.set(AVREL_POND.x, avrelSurface + .027, AVREL_POND.z);world.add(avrelWater);
  colliders.push({ x: AVREL_POND.x, z: AVREL_POND.z, r: AVREL_POND.radius - .04, surface: avrelSurface, kind: 'pond-water' });
  // Low reeds leave both lesson stands open.
  for(let i=0;i<15;i++){const a=.4+i*.24,x=AVREL_POND.x+Math.sin(a)*4.1,z=AVREL_POND.z+Math.cos(a)*4.1;
    post(material('#7b8550'),x,groundHeight(x,z)+.28,z,.025,.55,world);}


  const boardCount = 35;
  const dockBoards = new THREE.InstancedMesh(cube, material('#b48d61'), boardCount);
  for (let i = 0; i < boardCount; i++) {
    dummy.position.set(0, 1.67, 22 + i * .75);
    dummy.rotation.set(0, range(-.009, .009), 0); dummy.scale.set(4.3, .26, .72); dummy.updateMatrix();
    dockBoards.setMatrixAt(i, dummy.matrix); dockBoards.setColorAt(i, color.setHSL(.092, .30, range(.43, .55)));
  }
  dockBoards.castShadow = true; dockBoards.receiveShadow = true; villageRoot.add(dockBoards);
  box(darkWood, -1.65, 1.32, 34.8, .25, .4, 26.5); box(darkWood, 1.65, 1.32, 34.8, .25, .4, 26.5);
  for (const side of [-1, 1]) {
    let previous = null;
    for (let z = 24; z <= 48; z += 4) {
      post(wood, side * 2.1, 1.2, z, .16, 4.2);
      post(woodLight, side * 2.1, 3.31, z, .19, .11);
      if (previous !== null && !(side === -1 && z === 44))
        rope([new THREE.Vector3(side * 2.1, 2.88, previous), new THREE.Vector3(side * 2.1, 2.52, z - 2), new THREE.Vector3(side * 2.1, 2.88, z)]);
      previous = z;
    }
  }
  const ramp = new THREE.BufferGeometry();
  ramp.setAttribute('position', new THREE.Float32BufferAttribute([-2.15, 1.8, 22, 2.15, 1.8, 22, -2.15, localGround(-2.15, 19) + .035, 19, 2.15, localGround(2.15, 19) + .035, 19], 3));
  ramp.setIndex([0, 1, 2, 1, 3, 2]); ramp.computeVertexNormals();
  const rampMesh = new THREE.Mesh(ramp, woodLight); rampMesh.receiveShadow = true; villageRoot.add(rampMesh);

  function boat(x, z, scale = 1, rotation = 0, sail = false) {
    const group = new THREE.Group(); group.position.set(x, .38, z); group.rotation.y = rotation; group.scale.setScalar(scale); villageRoot.add(group);
    const outline = [[0, -3.2], [1.1, -2.1], [1.3, .9], [.82, 2.55], [0, 3.1], [-.82, 2.55], [-1.3, .9], [-1.1, -2.1]];
    const bp = [], bi = [];
    for (const [bx, bz] of outline) bp.push(bx, .67, bz, bx * .53, -.35, bz * .78);
    for (let i = 0; i < outline.length; i++) { const a = i * 2, b = ((i + 1) % outline.length) * 2; bi.push(a, b, a + 1, b, b + 1, a + 1); }
    const hull = new THREE.BufferGeometry(); hull.setAttribute('position', new THREE.Float32BufferAttribute(bp, 3)); hull.setIndex(bi); hull.computeVertexNormals();
    mesh(hull, material('#497c80', { side: THREE.DoubleSide }), 0, 0, 0, 1, 1, 1, group);
    box(woodLight, 0, -.08, 0, 1.5, .16, 4.4, group);
    [-1.6, -.1, 1.45].forEach(bz => box(woodLight, 0, .53, bz, 2.07, .16, .32, group));
    const rail = outline.map(([bx, bz]) => new THREE.Vector3(bx, .72, bz)); rail.push(rail[0]); rope(rail, .09, woodLight, group);
    if (sail) {
      post(wood, 0, 2.7, -.45, .085, 5.8, group);
      const sailGeometry = new THREE.BufferGeometry();
      sailGeometry.setAttribute('position', new THREE.Float32BufferAttribute([.1, 5.5, -.45, .1, 1.3, -.45, 2.8, 1.55, -.3], 3)); sailGeometry.computeVertexNormals();
      mesh(sailGeometry, material('#f2e6bd', { side: THREE.DoubleSide }), 0, 0, 0, 1, 1, 1, group);
      rope([new THREE.Vector3(0, 5.5, -.45), new THREE.Vector3(0, .72, 2.9)], .018, material('#e7d1a3'), group);
      const flag = box(material('#e4ac59'), 0, 5.62, -.45, .85, .32, .028, group); flag.position.x = .41;
    } else {
      const oar = box(woodLight, .65, .85, .4, .09, .09, 4.3, group); oar.rotation.y = .45;
      const blade = box(woodLight, 1.51, .85, 2.17, .33, .08, .65, group); blade.rotation.y = .45;
    }
    return group;
  }
  const arrivalBoat = boat(-5.0, 43, 1, -.12, true);
  const gangplank = box(woodLight, -3.25, 1.36, 43, 3.25, .12, .95);
  gangplank.rotation.z = .25;
  rope([new THREE.Vector3(-2.1, 2.6, 44), new THREE.Vector3(-3.1, 1.55, 44.2), new THREE.Vector3(-3.8, 1.1, 44.5)], .038);
  const fishingBoat = boat(-18, 31, .72, 1.05, false);
  boat(28, 33, .62, -.8, false);
  boat(-56, 97, .6, 1.1, true);
  boat(66, 118, .74, -.65, true);

  cottage(-11, 12, 5.2, 4.7, 3.15, '#bf785e', '#e9dbad', .64);
  cottage(12, 13, 6.0, 5.3, 3.8, '#547f7b', '#efdb9f', -.61);
  cottage(-16, 0, 6.0, 5.0, 3.45, '#87905a', '#eeddb4', 1.19);
  cottage(16, -2, 6.3, 5.5, 3.15, '#d19b55', '#e8d1a0', -1.20);
  cottage(-10, -13, 5.6, 4.8, 3.5, '#6d8895', '#efe0b9', .44);
  cottage(11, -21, 5.9, 5.3, 3.45, '#bd8062', '#e9d4a8', -.37);
  cottage(-25, -12, 6.2, 5.2, 3.25, '#ae8564', '#e8d4a6', .85);
  cottage(29, 8, 5.5, 5.1, 3.0, '#73876b', '#eadcb9', -1.38);
  cottage(27, -20, 5.6, 4.6, 3.15, '#648d90', '#eddfb5', -.75);


  barrel(2.95, 19, .95); barrel(3.76, 18.6, .78); crate(5.0, 18.7, .88); crate(5.05, 18.7, .57, localGround(5.05, 18.7) + .89);
  crate(-1.15, 37.2, .68, 1.8); barrel(-1.24, 35.9, .62, villageRoot, 1.8);
  barrel(-15.0, 19.6, .85); crate(-16.0, 20.2, .75); barrel(19, 2, .85); crate(-19, -2, .84);
  const acornCook = { x: -5.6, z: 9.1 };
  const cookTable = { x: -7.5, z: 9.9 }, cookY = localGround(cookTable.x, cookTable.z);
  box(woodLight, cookTable.x, cookY + .82, cookTable.z, 1.65, .12, .85);
  for (const dx of [-.66, .66]) for (const dz of [-.28, .28]) box(wood, cookTable.x + dx, cookY + .40, cookTable.z + dz, .12, .80, .12);
  vpush({ x: cookTable.x, z: cookTable.z, hx: .84, hz: .44, kind: 'cook-table' });
  const basketMat = material('#aa7c49'), nutMat = material('#915630'), capMat = material('#654a32');
  post(basketMat, cookTable.x - .41, cookY + 1.0, cookTable.z, .27, .24);
  const basketRim = new THREE.TorusGeometry(.255, .031, 4, 10); basketRim.rotateX(Math.PI / 2);
  mesh(basketRim, woodLight, cookTable.x - .41, cookY + 1.13, cookTable.z);
  for (let i = 0; i < 8; i++) {
    const a = i * 2.4, nx = cookTable.x - .41 + Math.cos(a) * .16, nz = cookTable.z + Math.sin(a) * .14;
    pebble(nutMat, nx, cookY + 1.12 + (i % 2) * .035, nz, .065, .075, .061);
    pebble(capMat, nx, cookY + 1.17 + (i % 2) * .035, nz, .07, .03, .065);
  }
  post(material('#b98e69'), cookTable.x + .35, cookY + .98, cookTable.z, .25, .18);
  post(material('#74999b'), cookTable.x + .35, cookY + 1.077, cookTable.z, .205, .009);
  const spoon = box(wood, cookTable.x + .62, cookY + .92, cookTable.z + .23, .06, .025, .42);
  spoon.rotation.y = .5;
  pebble(woodLight, cookTable.x + .52, cookY + .92, cookTable.z + .05, .09, .018, .11);
  for (const x of [-17.4, -13.2]) post(wood, x, localGround(x, 22) + 1.35, 22, .095, 2.7);
  const netTop = localGround(-15.3, 22) + 2.5;
  rope([new THREE.Vector3(-17.4, netTop, 22), new THREE.Vector3(-15.3, netTop - .3, 22), new THREE.Vector3(-13.2, netTop, 22)], .035);
  const netPositions = [];
  for (let i = 0; i <= 10; i++) { const x = -17.4 + i * .42; netPositions.push(x, netTop - .1, 22, x, netTop - 1.55, 22.05); }
  for (let i = 0; i < 6; i++) netPositions.push(-17.4, netTop - .15 - i * .27, 22, -13.2, netTop - .15 - i * .27, 22);
  const netGeo = new THREE.BufferGeometry(); netGeo.setAttribute('position', new THREE.Float32BufferAttribute(netPositions, 3));
  const net = new THREE.LineSegments(netGeo, new THREE.LineBasicMaterial({ color: '#c5b394', transparent: true, opacity: .75 })); villageRoot.add(net);
  for (let i = 0; i < 6; i++) {
    const fish = pebble(material(i % 2 ? '#a9c3c0' : '#789b9e'), -17 + i * .6, netTop - .45 - i % 2 * .2, 22.12, .105, .31, .065); fish.rotation.z = .15;
  }
  fence(-23, 5, 6, -.12); fence(-26.5, 1, 7, .12 + Math.PI / 2); fence(23, -9, 6, -.08); fence(34, 4, 5, Math.PI / 2);
  fence(-18, -23, 7, .1); fence(18, -29, 6, -.08);
  for (const [gx, gz] of [[-24, 1], [23, -10], [-18, -21]]) {
    box(material('#887553'), gx, localGround(gx, gz) + .045, gz, 4.5, .09, 2.4);
    for (let i = 0; i < 12; i++) {
      const px = gx - 1.8 + (i % 6) * .7, pz = gz - .65 + Math.floor(i / 6) * 1.25;
      pebble(material('#5f9150'), px, localGround(px, pz) + .25, pz, .3, .27, .32);
    }
  }
  // Jean's garden on the eastern side of the village: the hummingbird feeder's hook, a bird bath, his bench.
  const birdGarden = buildBirdGarden({ root: villageRoot, material, mesh, box, post, pebble, localGround, vpush, movingGroups });
  const wellX = -5.7, wellZ = 1.5, wellY = localGround(wellX, wellZ);
  const wellRing = new THREE.TorusGeometry(1, .26, 5, 12); wellRing.rotateX(Math.PI / 2);
  mesh(wellRing, material('#a8a18a'), wellX, wellY + .6, wellZ);
  post(material('#4b6e6b'), wellX, wellY + .2, wellZ, .83, .07);
  [-1, 1].forEach(s => box(wood, wellX + s * 1.1, wellY + 1.6, wellZ, .15, 3.2, .16));
  mesh(roofGeometry(2.85, 2.5, .72), material('#849273'), wellX, wellY + 3.15, wellZ);
  box(woodLight, wellX, wellY + 2.35, wellZ, 2.25, .13, .13);
  rope([new THREE.Vector3(wellX, wellY + 2.35, wellZ), new THREE.Vector3(wellX, wellY + .55, wellZ)], .027);
  vpush({ x: wellX, z: wellZ, r: 1.3 });
  const arrowGeo = new THREE.Shape();
  arrowGeo.moveTo(-.55, -.09); arrowGeo.lineTo(.15, -.09); arrowGeo.lineTo(.15, -.23); arrowGeo.lineTo(.53, 0); arrowGeo.lineTo(.15, .23); arrowGeo.lineTo(.15, .09); arrowGeo.lineTo(-.55, .09);
  function lantern(x, z, h = 3.2) {
    const y = localGround(x, z);
    post(wood, x, y + h / 2, z, .075, h); box(darkWood, x + .27, y + h - .12, z, .64, .075, .075);
    box(windowMat, x + .5, y + h - .45, z, .25, .43, .25);
    box(darkWood, x + .5, y + h - .71, z, .33, .09, .33); box(darkWood, x + .5, y + h - .2, z, .36, .09, .36);
    for (const dx of [-.13, .13]) for (const dz of [-.13, .13]) box(darkWood, x + .5 + dx, y + h - .45, z + dz, .027, .45, .027);
  }
  lantern(2.15, 26, 2.9); lantern(-3.6, 16.0); lantern(5.3, -5); lantern(-9, -29);

  const trainingY = localGround(training.x, training.z);
  const trainingStand = new THREE.Group();
  trainingStand.name = 'Village practice post';
  trainingStand.position.set(training.x, trainingY, training.z);
  villageRoot.add(trainingStand);
  post(wood, 0, 1.05, 0, .105, 2.1, trainingStand);
  box(woodLight, 0, 1.57, 0, 1.45, .15, .18, trainingStand);
  const footA = box(darkWood, 0, .12, 0, .95, .16, .18, trainingStand); footA.rotation.y = .56;
  const footB = box(wood, 0, .12, 0, .95, .16, .18, trainingStand); footB.rotation.y = -.56;
  const sack = new THREE.Group();
  sack.name = 'Straw practice sack';
  sack.position.set(0, 1.85, 0);
  trainingStand.add(sack);
  const straw = material('#c7ad70'), binding = material('#8d754d');
  mesh(cylinder, straw, 0, -.51, .07, .43, 1.00, .29, sack);
  pebble(straw, 0, -.07, .07, .38, .17, .27, sack);
  pebble(straw, 0, -.98, .07, .36, .14, .25, sack);
  [-.22, -.78].forEach(y => mesh(cylinder, binding, 0, y, .07, .444, .065, .304, sack));
  box(binding, .12, -.51, .365, .028, .90, .026, sack);
  for (let i = 0; i < 5; i++) {
    const tuft = box(cream, -.16 + i * .08, .055 + (i % 2) * .035, .04, .026, .16, .025, sack);
    tuft.rotation.z = (i - 2) * .17;
  }
  vpush({ x: training.x, z: training.z, r: .5, kind: 'training' });
  training.object = sack;
  training.y = trainingY;

  const repairX = repairBench.x + 1.5, repairZ = repairBench.z;
  const repairY = localGround(repairX, repairZ);
  const repairProps = new THREE.Group(); repairProps.name = repairBench.name;
  repairProps.position.set(repairX, repairY, repairZ); villageRoot.add(repairProps);
  box(woodLight, 0, .77, 0, 1.7, .15, .94, repairProps);
  for (const dx of [-.66, .66]) for (const dz of [-.32, .32]) box(wood, dx, .36, dz, .15, .72, .15, repairProps);
  box(darkWood, 0, .25, 0, 1.48, .12, .58, repairProps);
  const iron = material('#737872', { metalness: .35, roughness: .8 });
  const wheel = mesh(new THREE.CylinderGeometry(.43, .43, .18, 16), material('#a09e8c'), .14, 1.2, -.06, 1, 1, 1, repairProps);
  wheel.rotation.x = Math.PI / 2;
  for (const z of [-.25, .15]) box(darkWood, .14, 1.0, z, .14, .44, .12, repairProps);
  const axle = post(iron, .14, 1.2, .02, .055, .72, repairProps); axle.rotation.x = Math.PI / 2;
  box(woodLight, .14, 1.07, .4, .095, .30, .095, repairProps);
  const crank = post(wood, .14, .94, .48, .057, .20, repairProps); crank.rotation.x = Math.PI / 2;
  box(material('#c5c3a7'), -.56, .88, .16, .35, .08, .16, repairProps);
  post(material('#98704a'), -.53, .91, -.27, .10, .16, repairProps);
  post(darkWood, .67, 1.41, -.36, .055, 1.35, repairProps);
  box(woodLight, .67, 1.91, -.36, .52, .62, .10, repairProps);
  const signMetal = material('#e0d2a8');
  box(signMetal, .67, 2.0, -.299, .053, .29, .017, repairProps);
  box(signMetal, .67, 1.835, -.294, .25, .046, .023, repairProps);
  box(darkWood, .67, 1.76, -.29, .057, .11, .029, repairProps);
  vpush({ x: repairX, z: repairZ, hx: .87, hz: .49, kind: 'repair-bench' });

  const bellX = 4, bellZ = -25, bellY = localGround(bellX, bellZ);
  const bellFrame = new THREE.Group();
  bellFrame.name = 'Greenway warning bell';
  bellFrame.position.set(bellX, bellY, bellZ);
  villageRoot.add(bellFrame);
  for (const side of [-1, 1]) {
    post(wood, side * .58, 1.6, 0, .10, 3.2, bellFrame);
    vpush({ x: bellX + side * .58, z: bellZ, r: .14 });
  }
  box(woodLight, 0, 3.19, 0, 1.42, .17, .22, bellFrame);
  const bellSwing = new THREE.Group();
  bellSwing.position.y = 3.1;
  bellFrame.add(bellSwing);
  const bellMetal = material('#ac975c', { metalness: .45, roughness: .52 });
  mesh(new THREE.CylinderGeometry(.15, .39, .48, 10, 1, true), bellMetal, 0, -.35, 0, 1, 1, 1, bellSwing);
  const bellRim = new THREE.TorusGeometry(.36, .038, 4, 10); bellRim.rotateX(Math.PI / 2);
  mesh(bellRim, bellMetal, 0, -.59, 0, 1, 1, 1, bellSwing);
  post(darkWood, 0, -.1, 0, .05, .2, bellSwing);
  const bellTongue = new THREE.Group();
  bellTongue.position.y = -.17;
  bellSwing.add(bellTongue);
  post(darkWood, 0, -.27, 0, .025, .54, bellTongue);
  pebble(bellMetal, 0, -.53, 0, .071, .09, .071, bellTongue);
  rope([new THREE.Vector3(.37, 2.86, .03), new THREE.Vector3(.4, 1.37, .06)], .023, cream, bellFrame);
  let bellStarted = -Infinity, worldTime = 0;
  rope([new THREE.Vector3(-8, 5.8, 7), new THREE.Vector3(0, 4.9, 7), new THREE.Vector3(7, 5.6, 7)], .022);
  for (let i = 0; i < 13; i++) {
    const t = (i + .5) / 13, x = THREE.MathUtils.lerp(-8, 7, t), y = 5.8 - .2 * t - .75 * Math.sin(t * Math.PI);
    const flagGeo = new THREE.BufferGeometry();
    flagGeo.setAttribute('position', new THREE.Float32BufferAttribute([-.28, 0, 0, .28, 0, 0, 0, -.55, .03], 3)); flagGeo.computeVertexNormals();
    mesh(flagGeo, material(['#dba168', '#749b95', '#ddba70', '#c88b7c'][i % 4], { side: THREE.DoubleSide }), x, y, 7);
  }

  const wy = localGround(0, -66);
  const archMat = material('#756245');
  [-3.9, 3.9].forEach(x => { post(archMat, x, localGround(x, -66) + 2.4, -66, .26, 4.8); vpush({ x, z: -66, r: .36 }); });
  const arch = box(woodLight, 0, wy + 4.72, -66, 8.4, .32, .36); arch.rotation.z = -.015;
  box(wood, 0, wy + 4.02, -66, 2.35, .75, .15);
  const leaf = pebble(material('#c9d3a0'), 0, wy + 4.04, -65.9, .20, .31, .055); leaf.rotation.z = -.5;
  cottage(-10, -68, 4.9, 4.0, 2.8, '#748770', '#dfd6b3', .83);
  const benchX = 5.6, benchZ = -63, benchY = localGround(benchX, benchZ);
  box(woodLight, benchX, benchY + .62, benchZ, 2.7, .14, .65);
  [-1, 1].forEach(s => box(wood, benchX + s * .95, benchY + .3, benchZ, .15, .6, .49));
  box(woodLight, benchX, benchY + 1.15, benchZ - .32, 2.7, .5, .12);
  vpush({ x: benchX, z: benchZ, r: 1.15 });
  const markerX = 31, markerZ = -59, markerY = localGround(markerX, markerZ);
  const standingStone = pebble(material('#899b8f'), markerX, markerY + 1.7, markerZ, 1.3, 2.1, .8); standingStone.rotation.z = -.1;
  vpush({ x: markerX, z: markerZ, r: 1.25 });
  // The waystone's old road mark, picked out in paint like every other marker (no glow).
  const inset = box(material('#96c5b1'), markerX, markerY + 1.9, markerZ + .68, .13, .76, .08); inset.rotation.z = .42;

  // ---------------------------------------------------------------------------
  // Road signs, shared between Tidehaven and the regions
  // ---------------------------------------------------------------------------
  // One sign language everywhere (src/signs.js): fingers point, square boards
  // name a place, plaques carry notices and painted stones mark a border.
  const signs = createSigns({ material, mesh, box, groundFor, pushFor,
    worldSpot: (parent, x, z) => (isLocal(parent) ? villageToWorld(x, z) : { x, z }) });
  const roadSigns = signs.records;
  /**
   * The older roadside-sign call, (x, z, label, yaw, returnLabel), as scenery
   * modules still make it: a fingerpost whose fingers point at the places they
   * name where those are known, and along the road's line otherwise.
   */
  const signTargets = { Solis: SOLIS.centre, 'The Gate of Sun Horses': solisPoint(0, -42), 'The Coalition camp': solisPoint(100, 0), 'The border stockade': STORY_SITES.morosStockade };
  const roadsideSign = (x, z, label, yaw = 0, returnLabel = 'Tidehaven') => {
    const along = { x: -Math.sin(yaw), z: -Math.cos(yaw) };
    return signs.direction({ x, z, label, parent: world, backLabel: returnLabel,
      toward: signTargets[label] ?? { x: x + along.x * 20, z: z + along.z * 20 }, back: signTargets[returnLabel] ?? { x: x - along.x * 20, z: z - along.z * 20 } });
  };
  // The Greenway's own fingerposts, in the village's local metres (north is -z here).
  // The smithy is built here, not up with the cottages, because `signs` is declared above
  // this line and not above those: its board would be a temporal dead zone.
  /**
   * The smithy on the south street (TIDEHAVEN_SMITHY, src/region-world.js, where the measurement
   * that chose the plot is written down). Modest and open-sided, as a village forge is: a
   * lean-to, a stone forge with its chimney and banked coals, an anvil on its stump, the quench
   * barrel, and a rack of bar stock. Drent is level 0, so what is sold here is what you landed
   * with; the bog iron is a country up the road.
   */
  {
    const a = 16.5, b = -35, turn = -.42;
    const shelter = leanTo(a, b, '#8a7a5c', turn);
    const along = (da, db) => ({ x: a + da * Math.cos(turn) + db * Math.sin(turn), z: b - da * Math.sin(turn) + db * Math.cos(turn) });
    const stone = material('#6f6a63'), soot = material('#3b3531'), iron = material('#4a474a'), coals = material('#c65a22');
    // The forge, against the closed side of the shelter, with its chimney up through the roof.
    const forge = along(-1.5, -1.1), forgeY = localGround(forge.x, forge.z);
    box(stone, forge.x, forgeY + .45, forge.z, 1.9, .9, 1.25);
    box(soot, forge.x, forgeY + .93, forge.z, 1.6, .07, 1.0);
    box(coals, forge.x, forgeY + .99, forge.z, .8, .06, .5);
    box(stone, forge.x, forgeY + 1.9, forge.z, .72, 2.0, .72);
    vpush({ x: forge.x, z: forge.z, hx: .98, hz: .66, kind: 'forge' });
    // The anvil, out where the light is, on an oak stump.
    const anvil = along(1.0, .5), anvilY = localGround(anvil.x, anvil.z);
    post(wood, anvil.x, anvilY + .3, anvil.z, .28, .6);
    box(iron, anvil.x, anvilY + .72, anvil.z, .9, .24, .3);
    box(iron, anvil.x, anvilY + .58, anvil.z, .42, .16, .24);
    vpush({ x: anvil.x, z: anvil.z, r: .42, kind: 'anvil' });
    // The quench barrel and a rack of bar stock along the back post.
    const quench = along(-.2, 1.5); barrel(quench.x, quench.z, .78);
    const rack = along(-2.1, .9), rackY = localGround(rack.x, rack.z);
    for (const [dx, h] of [[-.22, 1.5], [0, 1.68], [.22, 1.4]]) box(iron, rack.x + dx, rackY + h / 2, rack.z, .05, h, .05);
    // The board over the open side, in the sign language of the rest of Drent (src/signs.js).
    const board = along(1.6, -1.9);
    signs.hanging({ x: board.x, y: localGround(board.x, board.z) + 2.5, z: board.z, label: 'The Smithy', facing: turn, parent: villageRoot });
  }
  signs.direction({ x: 4.4, z: 15.1, label: 'The Greenway', toward: { x: 0, z: -36 }, back: { x: 0, z: 29 }, backLabel: 'Tidehaven Landing', parent: villageRoot });
  // The Greenway/Fernway junction is deliberately unsigned. Its narrow woodland
  // paths invite exploration without announcing every clearing at the roadside.
  // Pueth's scenery still calls the older trailSign(x, z, direction, label, yaw, returnLabel, parent): the same
  // fingerposts, pointing ahead along the Pueth road to the place named and back along it (or the main road home).
  /** The point `metres` along a road (negative: back toward its start) from the road point nearest (x, z). */
  const roadStep = (road, x, z, metres) => {
    let best = { i: 1, t: 0, d: Infinity };
    for (let i = 1; i < road.length; i++) {
      const a = road[i - 1], b = road[i], dx = b.x - a.x, dz = b.z - a.z, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1)));
      const d = Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
      if (d < best.d) best = { i, t, d };
    }
    let i = best.i, left = metres, a = road[i - 1], b = road[i], length = Math.hypot(b.x - a.x, b.z - a.z), at = best.t * length;
    while (true) {
      const target = at + left;
      if (target >= 0 && target <= length || (target < 0 && i === 1) || (target > length && i === road.length - 1)) {
        const t = Math.max(0, Math.min(1, target / (length || 1)));
        return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
      }
      if (target > length) { left = target - length; i++; at = 0; } else { left = target; i--; }
      a = road[i - 1]; b = road[i]; length = Math.hypot(b.x - a.x, b.z - a.z);
      if (target < 0) at = length;
    }
  };
  function trailSign(x, z, direction = 1, label = '', signYaw = 0, returnLabel = 'Tidehaven', parent = villageRoot) {
    if (parent === villageRoot || !label) return signs.direction({ x, z, label: label || 'Tidehaven', parent, backLabel: returnLabel,
      toward: { x: x - Math.sin(signYaw) * 20, z: z - Math.cos(signYaw) * 20 }, back: { x: x + Math.sin(signYaw) * 20, z: z + Math.cos(signYaw) * 20 } });
    const atJunction = Math.hypot(x - PUETH_ROAD[0].x, z - PUETH_ROAD[0].z) < 15;
    return signs.direction({ x, z, label, parent, backLabel: returnLabel, toward: roadStep(PUETH_ROAD, x, z, 20),
      back: atJunction && returnLabel === 'Tidehaven' ? roadStep(MAIN_ROAD, x, z, -40) : roadStep(PUETH_ROAD, x, z, -20) });
  }

  localPatch(northTrail.x, northTrail.z, 6.7, '#aaa87d', .82);
  const restX = northTrail.x + 4.9, restZ = northTrail.z + 1.2;
  const restY = localGround(restX, restZ);
  box(woodLight, restX, restY + .58, restZ, 2.5, .16, .72);
  box(woodLight, restX, restY + 1.08, restZ - .34, 2.5, .45, .12);
  for (const s of [-1, 1]) box(wood, restX + s * .87, restY + .26, restZ, .18, .52, .61);
  vpush({ x: restX, z: restZ, r: 1.1 });
  const cairnX = northTrail.x - 4.8, cairnZ = northTrail.z - 1.7, cairnY = localGround(cairnX, cairnZ);
  pebble(rockMat, cairnX, cairnY + .24, cairnZ, .68, .37, .56);
  pebble(rockMat, cairnX + .08, cairnY + .67, cairnZ, .48, .26, .41);
  pebble(rockMat, cairnX - .03, cairnY + 1.00, cairnZ + .05, .29, .17, .25);
  vpush({ x: cairnX, z: cairnZ, r: .65 });
  lantern(restX + 1.6, restZ - .2, 2.8);

  // The former Avrel boundary stone and its bare apron have been removed. The road remains
  // open; a small authored stand below fills the old clearing without re-rolling this forest.

  // ---------------------------------------------------------------------------
  // Tidehaven's woodland: the original deterministic scatter
  // ---------------------------------------------------------------------------
  const specialClearings = [{ x: 0, z: 5, r: 9 }, { x: 0, z: -64, r: 7.5 }, { x: 31, z: -59, r: 5.7 }, { x: -10, z: -68, r: 5.5 },
    { x: training.x, z: training.z, r: 2.5 }, { x: encounter.x, z: encounter.z, r: encounter.radius }, { x: bellX, z: bellZ, r: 1.4 },
    { x: northTrail.x, z: northTrail.z, r: 7.7 }, { x: border.x, z: border.z, r: 11 }];
  function canPlant(x, z, margin = 0) {
    if (z > 19 || Math.abs(x) < 5 && z > 12) return false;
    if (z < -153 + Math.cos(x * .073) * 3) return false;
    if (z < -126 && random() < smooth(126, 154, -z) * .86) return false;
    if (distanceToPath(x, z) < 2.0 + margin) return false;
    if (houseLocations.some(h => Math.hypot(x - h.x, z - h.z) < h.r + 2.5 + margin)) return false;
    if (specialClearings.some(h => Math.hypot(x - h.x, z - h.z) < h.r + margin)) return false;
    if (Math.abs(x) < 30 && z > -28 && random() < .83) return false;
    return true;
  }
  const trees = [];
  [[-25, 17, 1.35], [25, 20, 1.4], [-34, 7, 1.2], [37, 5, 1.5], [-11, -30, 1.2], [10, -36, 1.3]]
    .forEach(([x, z, s]) => trees.push({ x, z, s, pine: false, h: range(8.1, 10.5), rot: range(0, 6.28) }));
  let attempts = 0;
  while (trees.length < 610 && attempts++ < 18000) {
    const x = range(-105, 105), z = range(-157, 22);
    if (!canPlant(x, z, .7) || trees.some(t => Math.hypot(x - t.x, z - t.z) < 3.0)) continue;
    trees.push({ x, z, s: range(.74, 1.25), pine: z < -70 ? random() < .56 : random() < .28, h: range(7, 11), rot: range(0, Math.PI * 2) });
  }
  const trunkMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(.21, .38, 1, 7), material('#795e41'), trees.length);
  const broadTrees = trees.filter(t => !t.pine), pineTrees = trees.filter(t => t.pine);
  const canopyMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), material('#ffffff', { flatShading: true }), broadTrees.length * 4);
  const pineMesh = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 7), material('#ffffff', { flatShading: true }), pineTrees.length * 3);
  let broadIndex = 0, pineIndex = 0;
  const treeGroundAt = (x, z) => {const city=selamusSurface?.fineGroundHeight(x,z)??pyraSurface?.fineGroundHeight(x,z);if(city!=null)return city;streamTerrain?.ensureAt(x,z);return terrainRoadHeight(x, z, terrainXs, terrainZs, terrainPositions, 0);};
  trees.forEach((tree, i) => {
    const { x, z, s, h, rot } = tree, th = h * s;
    tree.parts = [{mesh:trunkMesh,index:i}];
    let y = localGround(x, z);
    // Hidden trees keep their index, so oak ids, acorns and squirrel homes never shuffle.
    tree.hidden = featureClear(x, z, true) || forestFeatureClear(x, z, true, th * .52)
      || (spot => landDistance(spot.x, spot.z) < 3 || inKoopwood(spot.x, spot.z, 2.5) || brandyHomeClear(spot.x, spot.z, th * .35) || familyHomeClear(spot.x, spot.z, th * .3))(villageToWorld(x, z));   // and none in Bowden's woodlot but his own
    dummy.position.set(x, y + th * .41, z); dummy.rotation.set(range(-.025, .025), rot, range(-.025, .025));
    dummy.scale.set(s, th * .82, s); dummy.updateMatrix();
    // The local height field diverges from the blended, triangulated hillside near
    // Saltwind. Seat the actual tilted trunk footprint on those visible triangles.
    const grounding = treeGroundingOffset(dummy.matrix, treeGroundAt, { toWorld: villageToWorld });
    y += grounding; tree.groundY = y; dummy.position.y += grounding;
    if (tree.hidden) dummy.scale.setScalar(0); dummy.updateMatrix(); trunkMesh.setMatrixAt(i, dummy.matrix);
    const axis = new THREE.Vector3(0, 1, 0).applyEuler(dummy.rotation);
    const base = villageToWorld(x - axis.x * th * .41, z - axis.z * th * .41);
    tree.trunk = { axis: [axis.z, axis.y, -axis.x], base: { x: base.x, y: y + th * .41 - axis.y * th * .41, z: base.z } };
    if (!tree.hidden && x > -95 && x < 95 && z > border.barrierZ) tree.collider = vpush({ x, z, r: .52 * s, kind: 'village-tree' });
    if (tree.pine) for (let c = 0; c < 3; c++) {
      dummy.position.set(x, y + th * (.48 + c * .19), z); dummy.rotation.set(0, rot + c * .35, 0);
      dummy.scale.set(th * (.29 - c * .051), th * .49, th * (.29 - c * .051)); if (tree.hidden) dummy.scale.setScalar(0);
      dummy.updateMatrix(); pineMesh.setMatrixAt(pineIndex, dummy.matrix);
      tree.parts.push({mesh:pineMesh,index:pineIndex});
      pineMesh.setColorAt(pineIndex++, color.setHSL(range(.25, .31), range(.28, .40), range(.28, .41) + c * .025));
    } else for (let c = 0; c < 4; c++) {
      const a = rot + c * 2.1, spread = c === 3 ? 0 : th * .15;
      dummy.position.set(x + Math.sin(a) * spread, y + th * (c === 3 ? .96 : .77) + Math.sin(c * 3) * .18, z + Math.cos(a) * spread);
      dummy.rotation.set(range(-.2, .2), a, range(-.18, .18));
      dummy.scale.set(th * (c === 3 ? .28 : .32), th * (c === 3 ? .25 : .31), th * (c === 3 ? .27 : .31));
      if (tree.hidden) dummy.scale.setScalar(0); dummy.updateMatrix(); canopyMesh.setMatrixAt(broadIndex, dummy.matrix);
      tree.parts.push({mesh:canopyMesh,index:broadIndex});
      canopyMesh.setColorAt(broadIndex++, color.setHSL(range(.215, .29), range(.32, .47), range(.37, .52) + (c === 3 ? .025 : 0)));
    }
  });
  [trunkMesh, canopyMesh, pineMesh].forEach(m => { m.castShadow = true; m.receiveShadow = true; villageRoot.add(m); });

  // Build Mark's new cottage only after seeded tree placement, preserving forest IDs.
  { const h=MARK_HOME.house,p=h.local;cottage(p.x,p.z,h.width,h.depth,h.height,'#5e596c','#c7bba0',p.yaw); }

  // Separate from the seeded scatter so saved oak/acorn/squirrel IDs and the later scenery
  // random stream stay stable. These trees use world ground at the village terrain's seam.
  const avrelEdgeTrees = [[-5.8,-153,7.4],[-10,-158,8.2],[-7,-164,7.8],[6,-152,8.6],
    [10,-159,7.1],[5,-164,8.1],[-14,-149,8.8],[14,-153,7.7]].map(([x,z,height],i) => {
    const spot = villageToWorld(x,z), y = groundHeight(spot.x,spot.z), radius = .34;
    const trunk = mesh(trunkMesh.geometry, material('#795e41'), spot.x,y+height*.41,spot.z,.92,height*.82,.92,world);
    trunk.userData.passable = true;
    const parts = [{mesh:trunk}];
    for (let c=0;c<3;c++) {
      const angle=i*1.9+c*2.1, spread=c===2?0:height*.12;
      const leaf=mesh(canopyMesh.geometry,material(['#749151','#849f60','#69874e'][i%3]),
        spot.x+Math.sin(angle)*spread,y+height*(c===2?.94:.74),spot.z+Math.cos(angle)*spread,
        height*.28,height*.29,height*.28,world);
      leaf.userData.passable=true; parts.push({mesh:leaf});
    }
    const collider = {...spot,r:radius,kind:'avrel-edge-tree'}; colliders.push(collider);
    return registerWorldTree(colliders, {...forestTimber(false),id:`avrel-edge-${i}`,...spot,y,height,radius,trunkHeight:height*.82,trunkTopRadius:.19,
      axis:[0,1,0],base:{...spot,y}}, parts, collider);
  });

  const grassPositions = [], grassNormals = [];
  for (let b = 0; b < 5; b++) {
    const a = b * 2.4, bx = Math.cos(a) * .16, bz = Math.sin(a) * .16, w = .055, h = .24 + (b % 3) * .085;
    const cx = Math.cos(a + Math.PI / 2) * w, cz = Math.sin(a + Math.PI / 2) * w;
    grassPositions.push(bx - cx, 0, bz - cz, bx + cx, 0, bz + cz, bx + Math.cos(a) * .09, h, bz + Math.sin(a) * .09);
    for (let j = 0; j < 3; j++) grassNormals.push(0, 1, 0);
  }
  const grassGeometry = new THREE.BufferGeometry();
  grassGeometry.setAttribute('position', new THREE.Float32BufferAttribute(grassPositions, 3));
  grassGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(grassNormals, 3));
  const grass = new THREE.InstancedMesh(grassGeometry, material('#ffffff', { side: THREE.DoubleSide }), 4300);
  let grassIndex = 0, grassAttempts = 0;
  while (grassIndex < 4300 && grassAttempts++ < 18000) {
    const x = range(-88, 88), z = range(-166, 24);
    if (distanceToPath(x, z) < .15 || houseLocations.some(h => Math.hypot(x - h.x, z - h.z) < h.r + .2) || specialClearings.some(h => Math.hypot(x - h.x, z - h.z) < h.r * .58)) continue;
    if (inLessonSpace(x, z) && random() < .76) continue;
    const y = localGround(x, z); if (y < .65) continue;
    dummy.position.set(x, y + .02, z); dummy.rotation.set(0, range(0, 6.28), 0);
    const s = range(.7, 1.65) * (inLessonSpace(x, z) ? .45 : 1); dummy.scale.set(s, s, s); dummy.updateMatrix(); grass.setMatrixAt(grassIndex, dummy.matrix);
    grass.setColorAt(grassIndex++, color.setHSL(z < -140 ? range(.15, .22) : range(.20, .28), range(.35, .49), range(.34, .52)));
  }
  grass.count = grassIndex; grass.receiveShadow = true; villageRoot.add(grass);
  const bushCount = 210, bushes = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), material('#ffffff'), bushCount);
  let bidx = 0;
  for (let i = 0; i < 1800 && bidx < bushCount; i++) {
    const x = range(-80, 80), z = range(-149, 19);
    if (distanceToPath(x, z) < 1.4 || houseLocations.some(h => Math.hypot(x - h.x, z - h.z) < h.r + 1) || inLessonSpace(x, z, 1.2) || Math.hypot(x - bellX, z - bellZ) < 2 || specialClearings.some(h => Math.hypot(x - h.x, z - h.z) < h.r * .7)) continue;
    const s = range(.45, 1.2); dummy.position.set(x, localGround(x, z) + s * .42, z); dummy.rotation.set(0, range(0, 6.28), 0);
    dummy.scale.set(s, s * .7, s * .85); if (inBirdGarden(x, z)) dummy.scale.setScalar(0); dummy.updateMatrix(); bushes.setMatrixAt(bidx, dummy.matrix);
    bushes.setColorAt(bidx++, color.setHSL(range(.22, .31), .34, range(.33, .46)));
  }
  bushes.count = bidx; bushes.castShadow = true; bushes.receiveShadow = true; villageRoot.add(bushes);
  const flowers = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), material('#ffffff'), 600);
  let findex = 0;
  const flowerColors = ['#efe4b1', '#eac780', '#b8b9db', '#e7a2a0', '#e6e5c5'];
  for (let i = 0; i < 1800 && findex < 600; i++) {
    const x = range(-45, 45), z = range(-158, 22), d = distanceToPath(x, z);
    if (d < .28 || d > 9 || houseLocations.some(h => Math.hypot(x - h.x, z - h.z) < h.r + .6) || inLessonSpace(x, z, .5)) continue;
    const count = Math.min(3, 600 - findex), fc = flowerColors[Math.floor(random() * flowerColors.length)];
    for (let f = 0; f < count; f++) {
      const fx = x + range(-.5, .5), fz = z + range(-.5, .5), s = range(.07, .13);
      dummy.position.set(fx, localGround(fx, fz) + range(.2, .38), fz); dummy.rotation.set(0, range(0, 6.28), 0);
      dummy.scale.set(s, s * .48, s); if (inBirdGarden(fx, fz)) dummy.scale.setScalar(0); dummy.updateMatrix(); flowers.setMatrixAt(findex, dummy.matrix); flowers.setColorAt(findex++, color.set(fc));
    }
  }
  flowers.count = findex; villageRoot.add(flowers);
  const rocks = new THREE.InstancedMesh(round, rockMat, 145);
  for (let i = 0; i < 145; i++) {
    let x, z;
    do {
      if (i < 75) { x = range(-95, 95); z = range(23, 31); } else { x = range(-100, 100); z = range(-157, 19); }
    } while (distanceToPath(x, z) < 1.6 || houseLocations.some(h => Math.hypot(x - h.x, z - h.z) < h.r + 1.3) || inLessonSpace(x, z, 1.4) || Math.hypot(x - bellX, z - bellZ) < 2 || specialClearings.some(h => Math.hypot(x - h.x, z - h.z) < h.r * .8));
    const s = range(.3, 1.25), y = localGround(x, z);
    dummy.position.set(x, y + s * .21, z); dummy.rotation.set(range(-.2, .2), range(0, 6.28), range(-.2, .2));
    dummy.scale.set(s, s * range(.35, .75), s * range(.7, 1.3)); if (inBirdGarden(x, z)) dummy.scale.setScalar(0); dummy.updateMatrix(); rocks.setMatrixAt(i, dummy.matrix);
    rocks.setColorAt(i, color.setHSL(.17, .10, range(.44, .61)));
    if (s > .55 && y > .4) vpush({ x, z, r: s * .76 });
  }
  rocks.castShadow = true; rocks.receiveShadow = true; villageRoot.add(rocks);

  // ---------------------------------------------------------------------------
  // Roads, in world metres
  // ---------------------------------------------------------------------------
  const roadSpurs = [
    [at(-236, 30), at(-248, 16), at(-252, 8)],
    [at(-230, 38), at(-230, 50)],
    [at(-330, 88), at(-318, 96), { x: CALOSS_BANK.spot.x, z: CALOSS_BANK.spot.z }],
    [at(-362, 107), at(-370, 114), at(-374, 118)],
    [at(-378, 132), at(-392, 132)],
    [at(-372, 142), at(-364, 150)],
    [at(-394, 168), at(-404, 172)],
    [at(-392, 176), { x: STORY_SITES.lauvelField.x, z: STORY_SITES.lauvelField.z }],
    [at(-398, 202), at(-376, 208), { x: STORY_SITES.burnedHamlet.x, z: STORY_SITES.burnedHamlet.z }],
    // The track to the border stockade comes round its west side to the south gate, where the Solis road leaves.
    [at(-446, 276), at(-420, 292), STOCKADE_TRACK_BEND, STOCKADE_APPROACH],
    [at(-556, 334), { x: STORY_SITES.horseHitch.x, z: STORY_SITES.horseHitch.z }],
  ];
  // Measure every road before any scenery, so nothing is planted across one.
  measurePath(MAIN_ROAD, 4.2); measurePath(SUVAL_ROAD, 3.4); measurePath(SOLIS_ROAD, 4.2); measurePath(PUETH_ROAD, 4.2); measurePath(AMOD_ROAD, 4.2); measurePath(HIDEOUT_APPROACH_TRAIL, 1.85);
  measurePath(FOREST_HIDEOUT.trail.map(p => hideoutToWorld(p.x, p.z)), 1.85);
  measurePath(RENA_ROAD, 2.6);   // the old Rena road, off the main road at Drent's centre (src/rena.js)
  for (const path of IZOL_PATHS) measurePath(path.points, path.width);
  measurePath(AMBRON_ROAD, 4.6); measurePath(LAKE_ROAD, 3.6); for (const track of ELAGOS_ROADS.slice(2)) measurePath(track, track === CALOSS_ELAGOS_ROAD ? 4.2 : 2.6);
  for (const path of PORT_CALOS_PATHS) measurePath(path.points, path.width);
  for (const spur of roadSpurs) measurePath(spur, 2.2);
  measurePath(LOTHARN_ROAD_LINE, 4.4);
  // The Varn road (src/varn-world.js) is deliberately not measured here: these lines are what the countries'
  // scatter keeps off, and a road told to Amod's would change which of its candidates are taken and so move
  // every tree and stone after them. Its ground is cleared after the scatter is laid (src/scenery-clearing.js).
  measurePath(WORKINGS_TRACK, 2.2);
  measurePath(PASS_ROAD_LINE, 4.2);   // Imlamdris's road through the hill pass (src/south-suval-world.js)
  for (const path of REGIONAL_PATHS) measurePath(path, 1.85);
  measurePath(SYLVIA_PATH.points, SYLVIA_PATH.width);
  measurePath(MARK_HOME_PATH, 1.1);
  createVisualArtsScenery({root:world,cottage,groundHeight,colliders});
  const legacyWesternWorldGround=createLegacyWesternGround({groundHeight,baseHeight:groundWithRiver,legacyBaseHeight:legacyWesternGroundHeight});
  const legacyWesternTreeGroundAt=createLegacyWesternGrid({xs:terrainXs,zs:terrainZs,positions:terrainPositions,currentHeight:treeGroundAt,
    legacyVertexHeight:(x,z)=>legacyWesternWorldGround(x,z)-amodTerrainSink(x,z)-imlamdrisTerrainSink(x,z)-suvalHighlandTerrainSink(x,z)-lotharnTerrainSink(x,z)-westLotharnTerrainSink(x,z)-feradomTerrainSink(x,z)-varnTerrainSink(x,z)-telemoniaTerrainSink(x,z)-trelossTerrainSink(x,z)});
  const westLotharnCaves = createWestLotharnCaves(groundHeight);
  const westLotharnGround=yield* regionBuild('westLotharnGround',WEST_LOTHARN_GROUND_REGIONS,stage=>createWestLotharnGroundSteps({root:stage,terrainRoot,material,groundHeight,renderedGroundHeight:treeGroundAt,legacyGroundHeight:legacyWesternWorldGround,legacyRenderedGroundHeight:legacyWesternTreeGroundAt,caves:westLotharnCaves}),{renderedGroundHeight:treeGroundAt});
  const sharedWestGroundAt=(x,z)=>westLotharnGround.renderedGroundHeight(x,z);
  const suvalSurface=createSuvalGroundSurface(groundHeight);
  const suvalGround=yield* regionBuild('suvalGround',SUVAL_GROUND_REGIONS,stage=>createSuvalHighlandGroundSteps({root:stage,material,groundHeight,surface:suvalSurface}),{});
  const startingCountryGroundAt=(x,z)=>Math.max(sharedWestGroundAt(x,z),suvalSurface.fineGroundHeight(x,z)??-Infinity);
  yield 'Drent and the main road';
  const regionScenery = yield* createRegionScenerySteps({
    fastInitialRegion:fast?initialRegion:null,
    regionIds:fast&&WEST_LOTHARN_GROUND_REGIONS.includes(initialRegion)?[]:undefined,
    root: world, material, mesh, box, post, pebble, rope, cottage, fence, leanTo, barrel, crate,
    groundHeight, renderedGroundHeight:startingCountryGroundAt, legacyGroundHeight:legacyWesternWorldGround, colliders, wornPatch, dummy:new THREE.Object3D(), color:new THREE.Color(),
    wood, woodLight, darkWood, cream, rockMat, roofGeometry, cylinder, round,
    movingGroups, roadDistance,
    riverDistance: (x, z) => Math.min(calossDistance(x, z), puethRiverDistance(x, z, 14), tarvelDistance(x, z), westRiverDistance(x, z, 14)),
    // Ground the biome scatter grows nothing on: Elagosi water, western water, and
    // the sinter crust on Vastos's western fall, where the grass stops in a line.
    waterClear: (x, z) => inElagosWater(x, z, 2.5) || westBareGround(x, z, 2),
    // Tidehaven's own woodland already fills this box; the regional scatter
    // starts where the carried-over settlement ends.
    insideVillage: (x, z) => {
      const local = worldToVillage(x, z);
      return local.x > -122 && local.x < 122 && local.z > -182 && local.z < 40;
    },
  });
  if(fast)for(const job of regionScenery.deferredScenery??[]){
    yield* regionBuild(job.id,job.regions,stage=>job.createSteps(stage));
  }
  bridgeDeck = regionScenery.bridge; bridgeDecks.push(bridgeDeck);
  // Pueth: its rivers, the Tessen bridge and road post, Rimeholt and its own scatter.
  yield 'Pueth';
  const puethScenery=yield* regionBuild('puethScenery',[6],stage=>createPuethScenerySteps({
    root:stage, material, mesh, box, post, pebble, rope, cottage, fence, barrel, crate, wornPatch, trailSign: (...args) => trailSign(...args),
    groundHeight, colliders, dummy:new THREE.Object3D(), color:new THREE.Color(), wood, woodLight, darkWood, cream, rockMat, roofGeometry, cylinder, round,
    drapeGround: (vertices, indices) => {streamTerrain?.ensureRibbon(vertices);return drapeRoadOnTerrain(vertices, indices, terrainXs, terrainZs, terrainPositions);},
    roadDistance, riverMaterial: regionScenery.riverMaterial, regionClear,
    insideVillage: (x, z) => { const local = worldToVillage(x, z); return local.x > -122 && local.x < 122 && local.z > -182 && local.z < 40; },
  }),{bridge:{...TESSEN_BRIDGE,deckY:TESSEN_DECK_Y},riverSamples:Object.fromEntries(PUETH_RIVERS.map(r=>[r.id,r.samples.map((p,i)=>({...p,half:puethRiverHalfWidth(r,PUETH_RIVER_PROFILES.get(r.id)[i])}))]))});
  bridgeDecks.push(puethScenery.bridge);
  // Amod: the Tarvel and its terraces, Ostel on its shoulder, the burial ground, the pass stones and the region's own scatter.
  yield 'Amod';
  const amodScenery=yield* regionBuild('amodScenery',[10],stage=>createAmodScenerySteps({
    root:stage, material, mesh, box, post, pebble, barrel, crate, wornPatch, trailSign: (...args) => trailSign(...args),
    groundHeight, colliders, dummy:new THREE.Object3D(), color:new THREE.Color(), wood, woodLight, darkWood, roofGeometry, cylinder, round,
    riverMaterial: regionScenery.riverMaterial, regionClear, unbuiltGround: groundBeforeVarn,
  }),{bridge:{...TARVEL_BRIDGE,deckY:TARVEL_DECK_Y}});
  bridgeDecks.push(amodScenery.bridge);
  // Peblos: Cobble and its quay, the island places, the outer islands' landmarks and the ferryman's boat.
  yield 'Peblos';
  const sharedFerry=fast?createFerryBoat({root:world,material,mesh,box,post,rope,wood,woodLight,movingGroups}):null;
  const peblosScenery=yield* regionBuild('peblosScenery',[7],stage=>createPeblosScenerySteps({
    root:stage, ferry:sharedFerry, material, mesh, box, post, pebble, rope, cottage, barrel, crate, wornPatch, trailSign: (...args) => trailSign(...args),
    groundHeight, colliders, dummy:new THREE.Object3D(), color:new THREE.Color(), wood, woodLight, darkWood, cream, rockMat, roofGeometry, cylinder, round, movingGroups,
  }),sharedFerry?{ferryBoat:sharedFerry.group,placeFerryBoat:sharedFerry.place}:{});
  const portCalos=yield* regionBuild('portCalos',[2],stage=>immediate(()=>createPortCalosScenery({parent:stage,heightAt:portGroundAt,colliders,signs})),{});
  // East Suval (src/east-suval-world.js): Elod on its rock, the places along its
  // coast and its dry valleys, and the region's own limestone scatter.
  yield 'East Suval';
  const eastSuval=yield* regionBuild('eastSuval',[4],stage=>createEastSuvalScenerySteps({
    root:stage, material, mesh, box, post, pebble, rope, barrel, crate, wornPatch, sign: roadsideSign,
    groundHeight, colliders, dummy:new THREE.Object3D(), color:new THREE.Color(), wood, woodLight, darkWood, cream, rockMat, roofGeometry, cylinder, round,
    roadDistance,
  }),{});
  // South Suval (src/south-suval-scenery.js): the Stillwater, Imlamdris on its north-east shore,
  // and the region's own scatter.
  yield 'South Suval';
  const southSuval=yield* regionBuild('southSuval',[18],stage=>createSouthSuvalScenerySteps({
    root:stage, material, mesh, box, post, pebble, wornPatch,
    groundHeight, colliders, dummy:new THREE.Object3D(), color:new THREE.Color(), cylinder, round, roofGeometry,
  }),{});
  yield 'Suval highlands';
  const suvalHighlands=yield* regionBuild('suvalHighlands',[5, 18],stage=>createSuvalHighlandScenerySteps({ root:stage, material, mesh, box, post, round, groundHeight, colliders, roofGeometry, wornPatch, fineGround:suvalGround }),{paths:[]},built=>{if(fast)paths.push(...built.paths);});
  yield 'Iscare';
  const iscare=yield* regionBuild('iscare',[19],stage=>createIscareScenerySteps({ root:stage, material, mesh, box, post, pebble, groundHeight, colliders, round, wornPatch }),{});
  const lotharnCaves = createCaves(groundHeight);
  // The West Lotharn's are kept in their own array so `world.lotharnCaves` stays the East's alone
  // (tests/east-lotharn-peaks.test.js counts it); main.js walks both through one cave controller.

  yield 'Ibenwood and Alezhor river ground';
  const ibenwoodAlezhorGround=yield* regionBuild('ibenwoodAlezhorGround',IBENWOOD_ALEZHOR_GROUND_REGIONS,stage=>createIbenwoodAlezhorGroundSteps({THREE,terrainRoot,forest:ibenwoodRivers,coast:combinedRiverIndex(alezhorRiverIndex(),ibenalRiverIndex()),heightAt:groundHeight,streamTerrain}),{fineGroundHeight:()=>null});
  const forestRenderedGround=(x,z)=>ibenwoodAlezhorGround.fineGroundHeight(x,z)??treeGroundAt(x,z);
  yield 'Ibenwood groves';
  const ibenwood=yield* regionBuild('ibenwood',[32, 33, 34, 35, 36],stage=>createIbenwoodScenerySteps({parent:stage,heightAt:groundHeight,colliders,terrain:{xs:terrainXs,zs:terrainZs,positions:terrainPositions},terrainRoot}),{});
  yield 'Ibenwood rivers';
  const ibenwoodWater=yield* regionBuild('ibenwoodWater',[32, 33, 34, 35, 36],stage=>createIbenwoodRiverScenerySteps({THREE,parent:stage,rivers:ibenwoodRivers,refinedGround:ibenwoodAlezhorGround,heightAt:groundHeight}),{});
  yield 'Ibenwood forest';
  const ibenwoodForest=yield* regionBuild('ibenwoodForest',[32, 33, 34, 35, 36],stage=>createIbenwoodRegionalScenerySteps({parent:stage,heightAt:groundHeight,renderedGroundHeight:forestRenderedGround,colliders,
    waterClear:(x,z,padding=0)=>{const hit=ibenwoodRivers.nearest(x,z,20);return !hit||hit.distance>hit.half+padding+2;}}),{walkSurfaces:[]},built=>{if(fast)outdoorWalkSurfaces.push(...built.walkSurfaces);});
  // Elevated outdoor surfaces are composed after the lake-town promenade is built.
  yield 'Feradom';
  const feradom=yield* regionBuild('feradom',[21],stage=>createFeradomScenerySteps({ root:stage, material, groundHeight, renderedGroundHeight: treeGroundAt, colliders, dummy:new THREE.Object3D(), color:new THREE.Color(), round }),{});
  yield 'East Lotharn';
  const eastLotharn=yield* regionBuild('eastLotharn',[20],stage=>createEastLotharnScenerySteps({
    root:stage, material, mesh, box, post, pebble, wornPatch,
    groundHeight, renderedGroundHeight: sharedWestGroundAt, colliders, dummy:new THREE.Object3D(), color:new THREE.Color(), cylinder, round, roofGeometry, caves: lotharnCaves,
    unbuiltGround: groundBeforeVarn,
  }),{});
  // The West Lotharn (src/west-lotharn-scenery.js): the massifs' own close-drawn ground, the courses
  // of cliff and the balds, the caves' rock, the four becks and the old forest to the tree line.
  yield 'West Lotharn';
  const westLotharn=yield* regionBuild('westLotharn',[27],stage=>createWestLotharnScenerySteps({
    root:stage, terrainRoot, material, mesh, box, post, pebble, wornPatch,
    groundHeight, renderedGroundHeight: treeGroundAt, colliders, dummy:new THREE.Object3D(), color:new THREE.Color(), cylinder, round, roofGeometry, caves: westLotharnCaves, fineGround:westLotharnGround, legacyGroundHeight:legacyWesternWorldGround,
  }),{});
  // Varn (src/varn-scenery.js): the Empire's fortress-city in Amod's notch, on the pass out of the East
  // Lotharn. Built after both the countries it stands between, so that their scatter is already down
  // and what fell on its ground can be lifted off again without moving either country's seeded stream.
  yield 'Varn';
  const varn=yield* regionBuild('varn',[10, 20],stage=>createVarnScenerySteps({ root:stage, scene:world, material, groundHeight, colliders, treeRegistry }),{metrics:{}});
  // The Ascarth Peninsula (src/ascarth-scenery.js): grass, scrub and stone on the finger, the wood on
  // its interior hills, the green stone, and the rock fallen at the foot of its cliffs. Nobody's.
  yield 'South Oremindi ground';
  const oremindiGround=yield* regionBuild('oremindiGround',[37],stage=>refineSouthOremindiGroundSteps({THREE,terrainRoot,heightAt:groundHeight,coarseHeightAt:treeGroundAt}),{heightAt:groundHeight},built=>{southOremindiSurface=built.heightAt;});
  southOremindiSurface=(x,z)=>oremindiGround.heightAt(x,z);
  yield 'South Oremindi forest';
  const southOremindi=yield* regionBuild('southOremindi',[37],stage=>createSouthOremindiScenerySteps({parent:stage,heightAt:groundHeight,renderedGroundHeight:southOremindiSurface,colliders,terrainRoot,isReserved:inquestHomeClear}),{});
  southOremindi.ground=oremindiGround;
  const northernRegions=[];
  for(const name of NORTHERN_NAMES){
    const profile=northernProfile(name);yield name;
    const ground=yield* regionBuild('northernGround-'+profile.id,[profile.id],stage=>refineNorthernGroundSteps({THREE,terrainRoot,heightAt:groundHeight,coarseHeightAt:treeGroundAt,tintAt:northernTint,profile}),{heightAt:treeGroundAt,metrics:{}},built=>northernSurfaces.set(name,built));
    const scenery=yield* regionBuild('northernScenery-'+profile.id,[profile.id],stage=>createNorthernScenerySteps({parent:stage,heightAt:groundHeight,renderedGroundHeight:ground.heightAt,colliders,terrainRoot,profile}),{metrics:{},update:()=>{}});
    northernRegions.push({name,profile,ground,scenery});
  }
  acorSurface=treeGroundAt;
  const acorRegions=[];
  for(const name of ACOR_NAMES){
    const profile=acorProfile(name);yield name;
    const scenery=yield* regionBuild('acorScenery-'+profile.id,[profile.id],stage=>createAcorScenerySteps({parent:stage,heightAt:groundHeight,renderedGroundHeight:treeGroundAt,colliders,terrainRoot,profile}),{metrics:{},update:()=>{}});
    acorRegions.push({name,profile,scenery});
    if(profile.id===70)yield* regionBuild('thalmagarFortress',[70],stage=>createThalmagarFortressSteps({parent:stage,colliders}),{root:null});
  }
  yield 'Urubond';
  const urubondGround=yield* regionBuild('urubondGround',[117],stage=>refineUrubondGroundSteps({THREE,terrainRoot,heightAt:groundHeight,coarseHeightAt:treeGroundAt}),{fineGroundHeight:()=>null},built=>{urubondSurface=built;});
  urubondSurface=urubondGround;
  const urubondScenery=yield* regionBuild('urubondScenery',[117],stage=>createUrubondScenerySteps({parent:stage,heightAt,colliders}),{metrics:{}});
  const outerRegions=[];
  for(const name of OUTER_NAMES){
    const profile={...outerProfile(name),lakes:OUTER_LAKES.filter(l=>l.region===name)};yield name;
    const scenery=yield* regionBuild('outerScenery-'+profile.id,[profile.id],stage=>createOuterScenerySteps({parent:stage,heightAt:groundHeight,renderedGroundHeight:treeGroundAt,colliders,terrainRoot,profile}),{metrics:{},update:()=>{}});
    outerRegions.push({name,profile,scenery});
  }
  yield 'Baldro ground';
  const baldroGround=yield* regionBuild('baldroGround',[52, 53],stage=>refineBaldroGroundSteps({THREE,terrainRoot,heightAt:groundHeight,coarseHeightAt:treeGroundAt}),{heightAt:groundHeight},built=>{baldroSurface=built.heightAt;});
  baldroSurface=(x,z)=>baldroGround.heightAt(x,z);
  yield 'Baldro approaches';
  const baldro=yield* regionBuild('baldro',[52, 53],stage=>buildBaldroScenerySteps(stage,{heightAt,treeGroundAt:baldroSurface,colliders}),{landmarks:[],taskSites:[],entrances:[],trees:[]});
  baldro.ground=baldroGround;
  yield 'West Oremindi ground';
  const westOremindiGround=yield* regionBuild('westOremindiGround',[56],stage=>refineWestOremindiGroundSteps({THREE,terrainRoot,heightAt:groundHeight,coarseHeightAt:treeGroundAt}),{heightAt:groundHeight},built=>{westOremindiSurface=built.heightAt;});
  westOremindiSurface=(x,z)=>westOremindiGround.heightAt(x,z);
  yield 'West Oremindi mountains';
  const westOremindi=yield* regionBuild('westOremindi',[56],stage=>createWestOremindiScenerySteps({parent:stage,heightAt:groundHeight,renderedGroundHeight:westOremindiSurface,colliders,terrainRoot}),{metrics:{},update:()=>{}});
  westOremindi.ground=westOremindiGround;
  const inquestHome=yield* regionBuild('inquestHome',[37],stage=>immediate(()=>createInquestHome({parent:stage,cottage,material,box,post,heightAt,colliders})),{path:[]},built=>{if(fast&&built.path)paths.push(built.path);});
  const yunethre=yield* regionBuild('yunethre',[38],stage=>createYunethreScenerySteps({parent:stage,heightAt,colliders}),{paths:[],walkSurfaces:[]},built=>{if(fast){outdoorWalkSurfaces.push(...built.walkSurfaces);paths.push(...built.paths.map(p=>Object.assign([...p.points],{width:p.width})));}});
  const peninsulaTutorial=createPeninsulaTutorialScenery({parent:scene,heightAt,colliders,movingGroups});
  fishingSpots.push(peninsulaTutorial.fishingSpot);
  const outdoorWalkSurfaces=[...ibenwoodForest.walkSurfaces,...yunethre.walkSurfaces,...peninsulaTutorial.walkSurfaces];
  const forestWalks=createWalkSurfaces(outdoorWalkSurfaces,heightAt);
  // The refinement rectangle also restores Southern Ascarth's final headland.
  // Both arrivals need it before scenery samples the intentionally sunk coarse mesh.
  const selamusGround=yield* regionBuild('selamusGround',[24, 54],stage=>refineSelamusGroundSteps({THREE,terrainRoot:stage,heightAt:groundHeight,coarseHeightAt:treeGroundAt}),{fineGroundHeight:()=>null},built=>{selamusSurface=built;});
  const ascarth=yield* regionBuild('ascarth',[23, 24],stage=>createAscarthScenerySteps({ root:stage, material, groundHeight, renderedGroundHeight:treeGroundAt, colliders, dummy:new THREE.Object3D(), color:new THREE.Color(), round }),{});
  // West Suval and Solis (src/west-suval-world.js): the city, its walls, the Coalition's camp and the road's country.
  yield 'West Suval';
  const westSuval=yield* regionBuild('westSuval',[5],stage=>createWestSuvalScenerySteps({ root:stage, material, mesh, box, post, pebble, rope, groundHeight, renderedGroundHeight:startingCountryGroundAt, legacyGroundHeight:legacyWesternWorldGround, colliders, wornPatch, roofGeometry, cylinder, round,
    wood, woodLight, darkWood, cream, movingGroups, roadDistance, sign: roadsideSign, signs, barrel }),{});
  // Paradise Springs (src/winery-world.js): Lakota's old winery southeast of Port Calos.
  const winery=yield* regionBuild('winery',[2],stage=>immediate(()=>createWineryScenery({ root:stage, material, mesh, box, post, barrel, groundHeight, colliders, cylinder, round, wornPatch, signs, movingGroups })),{});
  // West Izol (src/izol-scenery.js): Izolveth, its harbour and moles, the Coalition's camp above the town,
  // Ardveth, Kelvath Cove, the Sea Gate, the Sightstone and the island's own scatter.
  yield 'Izol';
  const izol=yield* regionBuild('izol',[8],stage=>createIzolScenerySteps({ root:stage, material, mesh, box, post, pebble, rope, cottage, barrel, crate, wornPatch, sign: roadsideSign,
    groundHeight, legacyGroundHeight:legacyIzolGroundHeight, colliders, dummy:new THREE.Object3D(), color:new THREE.Color(), wood, woodLight, darkWood, cream, roofGeometry, cylinder, round, movingGroups }),{});
  // Elagos and Ambron (src/elagos-scenery.js): the lakes, the walled city on the narrows, and the lake country.
  yield 'Ambron and Elagos';
  const elagos=yield* regionBuild('elagos',[9],stage=>createElagosScenerySteps({ parent:stage, heightAt: groundHeight, colliders, signs, roadDistance }),{bridge:{...LINK_BRIDGE,deckY:LINK_BRIDGE.deckY},waterMaterial:{uniforms:{time:{value:0}}}});
  bridgeDecks.push(elagos.bridge);
  yield 'Farmland';
  const regionalFarmland=yield* regionBuild('regionalFarmland',[9, 21],stage=>createRegionalFarmlandScenerySteps({root:stage,groundHeight,colliders}),{});
  signs.direction({ x: -658, z: 176, label: 'Elagos', toward: CALOSS_ELAGOS_ROAD[1],
    backLabel: 'Nothom', back: MAIN_ROAD[22], parent: world });
  // Western country: settlement exteriors share the existing regional water and scenery.
  // Nylon is built after the countryside so its streets can clear already-placed scatter.
  yield 'Minora';
  const menora=yield* regionBuild('menora',[16],stage=>createMenoraScenerySteps({parent:stage,heightAt:groundHeight,colliders}),{});
  yield 'Caricas';
  const caricasSettlement=yield* regionBuild('caricasSettlement',[13],stage=>createCaricasSettlementSteps({parent:stage,heightAt:groundHeight,colliders}),{});
  // Haethom on the Nethereum rim and Ninehands on the Nesdor Flats (the Farmlands of the Lizeem, Builds 2 and 3; 6 October
  // 2026). The game sets the hatch and the water on the meadow as the meadow runs (src/meadow-water.js); before Fast mode
  // has loaded the region they are remembered here and put on the scenery when it is built.
  yield 'Haethom';
  const nethereumFarmState={hatch:'broken',meadow:'dry'};
  const nethereumFarm=yield* regionBuild('nethereumFarm',[17],stage=>createNethereumFarmScenerySteps({parent:stage,heightAt:groundHeight,colliders}),
    {metrics:{},mapFeatures:[],hatch:{set:state=>(nethereumFarmState.hatch=state),state:()=>nethereumFarmState.hatch},meadowWater:{set:state=>(nethereumFarmState.meadow=state),state:()=>nethereumFarmState.meadow}},
    built=>{built.hatch.set(nethereumFarmState.hatch);built.meadowWater.set(nethereumFarmState.meadow);});
  yield 'Ninehands';
  const nesdorFarm=yield* regionBuild('nesdorFarm',[14],stage=>createNesdorFarmScenerySteps({parent:stage,heightAt:groundHeight,colliders}),{metrics:{},mapFeatures:[]});
  // Amalthea's hamlet on a grass shoulder north-west of the Muster Gate (the Farmlands of the Lizeem, Build 5; 6 October 2026).
  yield 'The cheese-maker’s hamlet';
  const isareosHamlet=yield* regionBuild('isareosHamlet',[16],stage=>createIsareosHamletScenerySteps({parent:stage,heightAt:groundHeight,colliders}),{metrics:{},mapFeatures:[]});
  yield 'Western country';
  const westScenery=yield* regionBuild('westScenery',[11, 12, 13, 14, 15, 16, 17],stage=>createWestScenerySteps({ root:stage, material, mesh, pebble, groundHeight, colliders, wornPatch, dummy:new THREE.Object3D(), color:new THREE.Color(), round }),{});
  yield 'Aevis';
  const aevis=yield* regionBuild('aevis',[24],function* (stage){
    const cleared=clearScatter({scene:world,colliders,treeRegistry,inside:(x,z)=>aevisReserved(x,z,2),kinds:['ridge-rock','ascarth-tree'],groups:['Ascarth scenery']});
    const city=yield* createAevisScenerySteps({parent:stage,heightAt:groundHeight,colliders});
    city.metrics.cleared=cleared;return city;
  },{metrics:{},walkSurfaces:[]},built=>outdoorWalkSurfaces.push(...built.walkSurfaces));
  // Eer's scatter is laid first so clearing the city never changes the regional random stream.
  yield 'Nylon';
  const nylon=yield* regionBuild('nylon',[15],function* (stage){
    const cleared=clearScatter({scene:world,colliders,treeRegistry,inside:(x,z)=>nylonReserved(x,z,2),kinds:['eer-scrub','eer-tree'],groups:['Eer scenery']});
    const city=yield* createNylonScenerySteps({parent:stage,heightAt,groundHeight,colliders});
    city.metrics.cleared=cleared;return city;
  },{metrics:{}});
  // The Empire's forts on the other three ways south out of the two ranges (src/lotharn-forts-scenery.js):
  // one wall from cliff to cliff at each. Built after the mountains for the same reason Varn is, and after
  // the western country too: the Vastos Gate's yard stands on the tip of Vastos, whose scatter must be laid
  // before it can be lifted.
  yield 'The pass forts';
  const lotharnForts=yield* regionBuild('lotharnForts',[20, 27, 11],stage=>createLotharnFortsScenerySteps({ root:stage, scene:world, groundHeight, colliders, treeRegistry }),{metrics:{}});
  // Shared fine ground must be present before neighboring scenery in Fast mode.
  const telemoniaGround=yield* regionBuild('telemoniaGround',[22,25,26,55,57,59],stage=>createTelemoniaGroundSteps({root:stage,material,groundHeight,renderedGroundHeight:treeGroundAt}),{});
  const westFineGroundAt=(x,z)=>Math.max(sharedWestGroundAt(x,z),telemoniaGround.fineGroundHeight?.(x,z)??-Infinity);
  // Gala (src/gala-scenery.js): its water, its dry wash, and what grows on the steppe, the maquis and
  // the coast. Its own seeded stream, after the west's, so nothing already built moves for it.
  yield 'Gala';
  const galaScenery=yield* regionBuild('galaScenery',[22],stage=>createGalaScenerySteps({ root:stage, material, groundHeight, renderedGroundHeight:westFineGroundAt, colliders, dummy:new THREE.Object3D(), color:new THREE.Color(), round, terrainGrid:{xs:terrainXs,zs:terrainZs} }),{});
  // Ovesos and the Oves Desert (src/oves-scenery.js): the Oveth's gallery and its reed, four dry
  // channels of gravel, the steppe's grass and scrub, and the desert's stone. Its own seeded stream,
  // after Gala's, so nothing already built moves for it. Nobody's.
  yield 'Oves';
  const ovesScenery=yield* regionBuild('ovesScenery',[25, 26],stage=>createOvesScenerySteps({ root:stage, material, groundHeight, renderedGroundHeight:westFineGroundAt, colliders, dummy:new THREE.Object3D(), color:new THREE.Color(), round }),{});
  // Velsorten (the Farmlands of the Lizeem, Build 4; 6 October 2026): the village on the terrace, the canal from the divider
  // to its dry tail, the twelve plots, the two mills and Lahar's camp, built after the Oves's own scatter so none of it moves.
  yield 'Velsorten';
  const ovesosFarm=yield* regionBuild('ovesosFarm',[25],stage=>createOvesosFarmScenerySteps({parent:stage,heightAt:groundHeight,colliders}),{metrics:{},mapFeatures:[],canal:{set:()=>{},state:()=>'running'},update:()=>{}});
  // The Mithala plain (src/mithala-scenery.js): eight channels with their reed and their gallery of
  // willow, poplar and alder, two braided reaches with silt bars between the threads, the tall
  // warm-season prairie grass and the forbs in it, the sedge of the fen margin going north, and the
  // Acorwood thickening over the north-eastern horizon. Its own seeded stream, after the Oves's, so
  // nothing already built moves for it. Nobody's.
  yield 'Mithala';
  const mithalaWater=yield* regionBuild('mithalaWater',MITHALA_WATER_REGIONS,stage=>createMithalaWaterSteps({root:stage,colliders}),{metrics:{},update:()=>{}});
  const mithalaScenery=yield* regionBuild('mithalaScenery',[28, 29, 30, 31],stage=>createMithalaScenerySteps({ root:stage, water:mithalaWater, material, groundHeight, renderedGroundHeight:sharedWestGroundAt, colliders, dummy:new THREE.Object3D(), color:new THREE.Color(), round }),{});
  // Mithala (src/mithala-city.js, src/mithala-city-scenery.js): the river-city at the meeting of the arms, one district on
  // each of the four countries' hexes. Built after the plain, so the plain's scatter is down and what fell on the city's
  // ground is lifted off again (`clearMithalaPlainScatter`) without moving the Mithala's seeded stream by a draw.
  yield 'Mithala city';
  const mithalaCity=yield* regionBuild('mithalaCity',[28, 29, 30, 31],function* (stage){
    const cleared=clearMithalaPlainScatter({scene:world,colliders,treeRegistry,inside:(x,z)=>mithalaCityReserved(x,z,2)});
    const city=yield* createMithalaCityScenerySteps({parent:stage,heightAt,groundHeight,colliders});
    city.metrics.cleared=cleared;return city;
  },{metrics:{},walkSurfaces:[],mapFeatures:[]},built=>outdoorWalkSurfaces.push(...built.walkSurfaces));
  // The southwestern block (src/southwest-scenery.js): the Vaellir's gallery and its reed, two dry
  // washes and three shallow channels with nothing in any of them, the desert pavement the wind
  // has swept, the grass that has contracted into the Ganesh Plain's depressions, and one hex of
  // oak and pine at Navarth's tip. Its own seeded stream, after the Mithala's, so nothing already
  // built moves for it. Nobody's.
  yield 'Southwestern country';
  const pyraGround=yield* regionBuild('pyraGround',PYRA.regions,stage=>refinePyraGroundSteps({THREE,terrainRoot:stage,heightAt:groundHeight,coarseHeightAt:treeGroundAt}),{fineGroundHeight:()=>null},built=>{pyraSurface=built;});
  const southwestScenery=yield* regionBuild('southwestScenery',[39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51],stage=>createSouthwestScenerySteps({ root:stage, material, groundHeight, renderedGroundHeight:treeGroundAt, colliders, dummy:new THREE.Object3D(), color:new THREE.Color(), round }),{});
  // Selemis (src/selemis-scenery.js): the island's straw grass and aromatic scrub, the pale stone on
  // its tops, the pines leaning in the lee of its hills, the tamarisk and the wrack on its strand, the
  // stones in its two winter beds and the rock fallen at the foot of its cliffs. Its own seeded
  // stream, after the southwest's, so nothing already built moves for it. Nobody's.
  yield 'Selemis';
  const selemisScenery=yield* regionBuild('selemisScenery',[54],stage=>immediate(()=>createSelemisScenery({ root:stage, material, groundHeight, renderedGroundHeight:treeGroundAt, colliders, dummy:new THREE.Object3D(), color:new THREE.Color(), round })),{});
  const selamus=yield* regionBuild('selamus',[54],function*(stage){
    const cleared=clearScatter({scene:world,colliders,treeRegistry,inside:(x,z)=>selamusReserved(x,z,3),kinds:['ridge-rock','selemis-tree'],groups:['Selemis scenery']});
    const built=yield* createSelamusScenerySteps({parent:stage,heightAt,colliders});built.metrics.cleared=cleared;return built;
  },{metrics:{},mapFeatures:[],walkSurfaces:[]},built=>outdoorWalkSurfaces.push(...built.walkSurfaces));
  const selamusHarbor=yield* regionBuild('selamusHarbor',[54],stage=>createSelamusHarborSteps({parent:stage,heightAt,colliders}),{metrics:{},walkSurfaces:[]},built=>outdoorWalkSurfaces.push(...built.walkSurfaces));
  // Telemonia (src/telemonia-scenery.js): the highland's own finer ground, the terraces' walls and the
  // gullies' check-walls, the wall of Kethorn, bunch grass and wormwood and thorn, scrub oak and juniper
  // in the folds, the Belketh's wood and the stone. Its own seeded stream, after Selemis's, so nothing
  // already built moves for it. Stage 1: nothing planted and nobody's.
  yield 'Telemonia';
  const telemoniaScenery=yield* regionBuild('telemoniaScenery',[55],stage=>createTelemoniaScenerySteps({ root:stage, material, groundHeight, renderedGroundHeight:treeGroundAt, fineGround:telemoniaGround, colliders, dummy:new THREE.Object3D(), color:new THREE.Color(), round }),{});
  // Telemonia, stage 2 (src/telemonia-town-scenery.js): Kethorn on its rock - the halls of the bands, the hall at the
  // end of the street, the granaries and the cisterns - the barley and the pulses on the Galmeth, the vine on the
  // terraces, and the field people's huts. Its own seeded stream, after stage 1's, so nothing already built moves.
  yield 'Kethorn';
  const telemoniaTown=yield* regionBuild('telemoniaTown',[REGION_IDS.Telemonia],stage=>createTelemoniaTownScenerySteps({ root:stage, material, groundHeight, colliders, dummy:new THREE.Object3D(), color:new THREE.Color(), round }),{metrics:{}});

  const pyra=yield* regionBuild('pyra',PYRA.regions,stage=>createPyraScenerySteps({parent:stage,heightAt,colliders}),{metrics:{},mapFeatures:[],walkSurfaces:[],walkRoutes:[]},built=>outdoorWalkSurfaces.push(...built.walkSurfaces));
  const eastPyros=yield* regionBuild('eastPyros',[57],stage=>createEastPyrosScenerySteps({parent:stage,heightAt:groundHeight,renderedGroundHeight:treeGroundAt,colliders}),{metrics:{},update:()=>{}});
  const netherDesert=yield* regionBuild('netherDesert',[58],stage=>createNetherDesertScenerySteps({parent:stage,heightAt:groundHeight,renderedGroundHeight:treeGroundAt,colliders}),{metrics:{}});
  const legemum=yield* regionBuild('legemum',[59],stage=>createLegemumScenerySteps({parent:stage,heightAt:groundHeight,renderedGroundHeight:treeGroundAt,colliders}),{metrics:{}});
  const babonGround=yield* regionBuild('babonGround',[60],stage=>refineBabonGroundSteps({THREE,terrainRoot,heightAt:groundHeight,coarseHeightAt:treeGroundAt}),{heightAt:groundHeight},built=>{babonSurface=built.heightAt;});
  babonSurface=(x,z)=>babonGround.heightAt(x,z);
  const babon=yield* regionBuild('babon',[60],stage=>createBabonScenerySteps({parent:stage,heightAt:groundHeight,renderedGroundHeight:babonSurface,colliders}),{metrics:{}});
  babon.ground=babonGround;
  // The two Celders: grass, scrub, stone and the water's margins.
  yield 'The Celder plains';
  const legacyCelderWorldGround=(x,z)=>{
    const actual=groundHeight(x,z),base=groundWithRiver(x,z),old=legacyCelderGroundHeight(x,z);
    return actual===base?old:actual+(old-base);
  };
  const canerdGround=yield* regionBuild('canerdGround',[REGION_IDS['North Celder'],REGION_IDS['South Celder']],stage=>refineCanerdGroundSteps({THREE,terrainRoot:stage,heightAt:groundHeight,coarseHeightAt:treeGroundAt}),{fineGroundHeight:()=>null},built=>{canerdSurface=built;});
  const celderRenderedGround=(x,z)=>canerdGround.fineGroundHeight(x,z)??sharedWestGroundAt(x,z);
  const southCelder=yield* regionBuild('southCelder',[REGION_IDS['South Celder']],stage=>createSouthCelderScenerySteps({parent:stage,heightAt:groundHeight,renderedGroundHeight:celderRenderedGround,candidateHeightAt:legacyCelderWorldGround,colliders}),{metrics:{}});
  const northCelder=yield* regionBuild('northCelder',[REGION_IDS['North Celder']],stage=>createNorthCelderScenerySteps({parent:stage,heightAt:groundHeight,renderedGroundHeight:celderRenderedGround,candidateHeightAt:legacyCelderWorldGround,colliders}),{metrics:{}});
  const canerd=yield* regionBuild('canerd',[REGION_IDS['North Celder'],REGION_IDS['South Celder']],stage=>createCanerdScenerySteps({parent:stage,heightAt,renderedGroundHeight:celderRenderedGround,colliders}),{metrics:{},mapFeatures:[],walkSurfaces:[]},built=>outdoorWalkSurfaces.push(...built.walkSurfaces));
  paths.push(...CANERD_PATHS.map(p=>Object.assign([...p.points],{id:p.id,width:p.width})));
  // East Izol (src/east-izol-scenery.js): pasture, maquis, rock and the headland coast.
  yield 'East Izol';
  const eastIzol=yield* regionBuild('eastIzol',[REGION_IDS['East Izol']],stage=>createEastIzolScenerySteps({parent:stage,heightAt:groundHeight,candidateHeightAt:(x,z)=>{const legacy=legacyEastIzolGroundHeight(x,z),current=groundWithRiver(x,z);return legacy===current?groundHeight(x,z):legacy+(groundHeight(x,z)-current);},renderedGroundHeight:treeGroundAt,colliders}),{metrics:{}});
  // Alezhor (src/alezhor-scenery.js).
  yield 'Alezhor';
  const alezhor=yield* regionBuild('alezhor',[REGION_IDS['Alezhor']],stage=>createAlezhorScenerySteps({parent:stage,heightAt:groundHeight,legacyHeightAt:(x,z)=>withoutIbenalLayers(()=>legacyAlezhorBankHeight(x,z)),renderedGroundHeight:forestRenderedGround,colliders}),{metrics:{}});
  // South Ibenal (src/south-ibenal-scenery.js).
  yield 'South Ibenal';
  const southIbenal=yield* regionBuild('southIbenal',[REGION_IDS['South Ibenal']],stage=>createSouthIbenalScenerySteps({parent:stage,heightAt:groundHeight,renderedGroundHeight:forestRenderedGround,colliders}),{metrics:{}});
  // North Ibenal (src/north-ibenal-scenery.js).
  yield 'North Ibenal';
  const northIbenal=yield* regionBuild('northIbenal',[REGION_IDS['North Ibenal']],stage=>createNorthIbenalScenerySteps({parent:stage,heightAt:groundHeight,renderedGroundHeight:forestRenderedGround,colliders}),{metrics:{}});
  // Henborth (src/henborth-scenery.js).
  yield 'Henborth';
  const henborth=yield* regionBuild('henborth',[REGION_IDS['Henborth']],stage=>createHenborthScenerySteps({parent:stage,heightAt:groundHeight,renderedGroundHeight:treeGroundAt,colliders}),{metrics:{}});
  // The built places: the Moros Plain's outpost, stockade, gate and wayside (see moros-works.js).
  yield 'Roads and landmarks';
  const stakedProps = [];
  buildMorosWorks({ parent: world, heightAt: groundHeight, colliders, signs, movingGroups, stakedProps, roadDistance });
  buildFrontierWorks({ parent: world, heightAt: groundHeight, colliders, signs });
  buildPlaceWorks({ parent: world, heightAt: groundHeight, colliders, signs, roadDistance });
  // The three Renas: the razed town at Drent's centre, Applegarth, and Rena's own wayside (src/rena-works.js).
  buildRenaWorks({ parent: world, heightAt: groundHeight, colliders, signs, roadDistance });
  // Brandy Frank's dye yard, on the lane up to Saltwind Lookout (src/brandy-yard.js).
  const jesseCarriage=createJesseCarriageScenery({parent:world,heightAt,colliders,movingGroups});
  createBrandyYard({ parent: world, material, mesh, box, post, round, cylinder, heightAt, colliders, signs });
  const brandyHome = createBrandyHomeScenery({ parent: world, cottage, material, mesh, box, post, round, cylinder, heightAt: groundHeight, colliders });
  const familyHomes=createFamilyHomeScenery({parent:world,heightAt:groundHeight,colliders,movingGroups});
  // The two lights of this coast (src/lighthouse-world.js): Addison's on the West Suval head
  // south of the winery lane, and her sister's across the water on the head below Elod, which
  // is taller, blacker, and has a derrick over the cliff for bringing up what the sea leaves.
  createLighthouse({ parent: world, material, mesh, box, post, round, cylinder, heightAt, colliders, signs });
  createLighthouse({ parent: world, material, mesh, box, post, round, cylinder, heightAt, colliders, signs }, ELOD_LIGHT,
    { stone: '#4a4a4f', stoneDark: '#343438', stoneLight: '#5e5e63', slate: '#26262a', door: '#2b2723' });
  // Addison's father's door through the ridge between the two Suvals, and its hatch (src/rival-light.js).
  createSmugglersDoorScenery({ root: world, groundHeight: heightAt });
  // The Koopwood, Bowden Koop's woodlot, where woodcutting is learned (src/woodcutting.js, src/woodlot-world.js).
  const woodlot = createWoodlot({ parent: world, material, mesh, box, post, round, cylinder, heightAt, colliders, signs, movingGroups });
  // The traveler's house on the plot beside it, and the birdhouse posts in the Greenway (src/construction.js, src/homestead-world.js).
  const homestead = createHomestead({ parent: world, material, mesh, box, post, round, cylinder, heightAt, colliders, movingGroups, reindex: () => { colliderIndex = null; } });
  addPath(MAIN_ROAD, 4.2);
  addPath(SUVAL_ROAD, 3.4);
  addPath(SOLIS_ROAD, 4.2);
  // Solis draws its paving itself. Register those same straight street segments
  // for navigation, so a route into the Court of Oaths goes around its houses.
  for (const street of SOLIS_STREETS) {
    const line = [];
    for (let i = 1; i < street.points.length; i++) {
      const a = street.points[i - 1], b = street.points[i];
      const steps = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 3);
      if (i === 1) line.push({ x: a.x, z: a.z });
      for (let k = 1; k <= steps; k++) line.push({ x: a.x + (b.x - a.x) * k / steps, z: a.z + (b.z - a.z) * k / steps });
    }
    paths.push(Object.assign(line, { kind: 'road', width: street.width }));
  }
  // Ambron draws its paving in its own scenery. Navigation uses the same lanes.
  for (const street of AMBRON_STREETS) {
    const line=[];
    for(let i=1;i<street.points.length;i++){
      const a=ambronPoint(street.points[i-1].a,street.points[i-1].b),b=ambronPoint(street.points[i].a,street.points[i].b);
      const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/3));
      if(i===1)line.push(a);
      for(let k=1;k<=steps;k++)line.push({x:a.x+(b.x-a.x)*k/steps,z:a.z+(b.z-a.z)*k/steps});
    }
    paths.push(Object.assign(line,{kind:'road',width:street.width}));
  }
  for (const line of SOLIS_HARBOR_PATHS) paths.push(Object.assign(line.map(p => ({ ...p })), { kind: 'road', width: 3 }));
  for (const spur of roadSpurs) addPath(spur, 2.2);
  // Keep the main road first: autoplay uses paths[0]. This new coastal approach
  // is an ordinary narrow walking route for Jon and for visitors to the cottage.
  paths.push(brandyHome.path);
  // Tidehaven's own lanes and woodland spurs stay in the village's frame.
  function addLocalPath(points, width, kind = 'trail') {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p.x, 0, p.z)));
    const samples = curve.getPoints(Math.max(2, Math.ceil(curve.getLength() / .9)));
    const positions = [], indices = [];
    for (let i = 0; i < samples.length; i++) {
      const p = samples[i];
      const direction = samples[Math.min(i + 1, samples.length - 1)].clone().sub(samples[Math.max(0, i - 1)]).normalize();
      const left = new THREE.Vector3(-direction.z, 0, direction.x).multiplyScalar(width / 2);
      for (const sign of [-1, 1]) {
        const x = p.x + left.x * sign, z = p.z + left.z * sign;
        positions.push(x, localGround(x, z) + .045, z);
      }
      if (i) { const j = i * 2; indices.push(j - 2, j, j - 1, j - 1, j, j + 1); }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices); geometry.computeVertexNormals();
    const path = new THREE.Mesh(geometry, material(kind === 'trail' ? '#a2916c' : '#c6b384', { side: THREE.DoubleSide }));
    path.name = kind === 'trail' ? 'Dirt footpath' : 'Village lane';
    path.receiveShadow = true; villageRoot.add(path);
    pathSurfaces.push({ mesh: path, kind });
    paths.push(Object.assign(curve.getPoints(Math.max(2, Math.ceil(curve.getLength() / 6))).map(p => villageToWorld(p.x, p.z)), { kind, width }));
  }
  for (const [i, lane] of localSidePaths.entries()) addLocalPath(lane, i < 2 ? 2.6 : 1.25, i < 2 ? 'road' : 'trail');
  for (const path of pondPaths) addLocalPath(path, 1.15);
  for (const path of forestPlacePaths) addLocalPath(path, 1.15);
  for (const path of DRENT_LOCAL_PATHS) addLocalPath(path, 1.1);
  addPath(MARK_HOME_PATH, 1.1, world, 'trail');
  for (const path of REGIONAL_PATHS) addPath(path, 1.85);
  addPath(FOREST_HIDEOUT.trail.map(p => hideoutToWorld(p.x, p.z)), 1.85);
  addPath(PUETH_ROAD, 4.2);
  addPath(PASS_ROAD_LINE, 4.2);
  addPath(LOTHARN_ROAD_LINE, 4.4);
  addPath(VARN_ROAD, VARN_ROAD_HALF * 2);
  addPath(WORKINGS_TRACK, 2.2);
  paths.push(...suvalHighlands.paths);
  addPath(AMOD_ROAD, 4.2);
  addPath(HIDEOUT_APPROACH_TRAIL, 1.85);
  addPath(RENA_ROAD, 2.6);
  for (const path of IZOL_PATHS) addPath(path.points, path.width);
  addPath(AMBRON_ROAD, 4.6); addPath(LAKE_ROAD, 3.6); for (const track of ELAGOS_ROADS.slice(2)) addPath(track, track === CALOSS_ELAGOS_ROAD ? 4.2 : 2.6);
  for (const path of PORT_CALOS_PATHS) addPath(path.points,path.width,world,path.kind==='trail'?'trail':'road');
  addPath(SYLVIA_PATH.points, SYLVIA_PATH.width, world, 'trail');
  paths.push(inquestHome.path);
  paths.push(...BALDRO_PATHS.map(p=>Object.assign([...p.points],{width:p.width,kind:p.kind,id:p.id})));
  // Region scenery already draws these roads; append navigation only after the original main road.
  paths.push(...yunethre.paths.map(p=>Object.assign([...p.points],{width:p.width})));
  paths.push(...[...MENORA_PATHS,...CARICAS_ROADS,...NYLON_PATHS,...AEVIS_PATHS,...MITHALA_STREETS,...NETHEREUM_PATHS/* Haethom's ways and the Nesdor Way, 6 October 2026 */,...NESDOR_PATHS,...OVESOS_PATHS/* Velsorten's ways and the cheese-maker's track, 6 October 2026 */,...ISAREOS_HAMLET_PATHS].map(p=>Object.assign([...p.points],{width:p.width})));
  // The peninsula tutorial's trails (drawn by its own scenery) go after the main road too: paths[0] is the main road.
  paths.push(...peninsulaTutorial.paths);

  // Footpaths join a road at its edge. Their full centre lines still meet for
  // navigation, but brown faces must not stripe or z-fight across the pale road.
  // Clip after all paths are made so even a road authored later wins the join.
  {
    world.updateMatrixWorld(true);
    const faces = [], point = new THREE.Vector3();
    const vertex = (object, index) => {
      point.fromBufferAttribute(object.geometry.attributes.position, index).applyMatrix4(object.matrixWorld);
      return { x: point.x, y: point.y, z: point.z };
    };
    for (const { mesh: object, kind } of pathSurfaces) if (kind === 'road') {
      const index = object.geometry.index;
      for (let i = 0; i < index.count; i += 3) faces.push([vertex(object, index.getX(i)), vertex(object, index.getX(i + 1)), vertex(object, index.getX(i + 2))]);
    }
    const mask = createRoadSurfaceMask(faces);
    for (const { mesh: object, kind } of pathSurfaces) if (kind === 'trail') {
      const geometry = object.geometry, original = geometry.index, positions = Array.from(geometry.attributes.position.array), indices = [];
      const inverse = object.matrixWorld.clone().invert();
      let changed = false;
      for (let i = 0; i < original.count; i += 3) {
        const sourceIndices = [original.getX(i), original.getX(i + 1), original.getX(i + 2)];
        const triangle = sourceIndices.map(index => vertex(object, index)), pieces = mask.clip(triangle);
        if (pieces.length === 1 && pieces[0] === triangle) { indices.push(...sourceIndices); continue; }
        changed = true;
        for (const piece of pieces) {
          const start = positions.length / 3;
          for (const p of piece) { point.set(p.x, p.y, p.z).applyMatrix4(inverse); positions.push(point.x, point.y, point.z); }
          for (let j = 1; j + 1 < piece.length; j++) indices.push(start, start + j, start + j + 1);
        }
      }
      if (changed) {
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setIndex(indices); geometry.computeVertexNormals();
      }
    }
  }

  // Fingerposts along the new road: each points at its place, and back the way the traveler came.
  /** A point 40 m back along the nearest road, toward where that road starts. */
  const backAlong = (x, z) => {
    let best = null, bestDistance = Infinity;
    for (const road of [MAIN_ROAD, SUVAL_ROAD]) for (let i = 1; i < road.length; i++) {
      const a = road[i - 1], b = road[i], dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
      const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (length * length)));
      const distance = Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
      if (distance < bestDistance) { bestDistance = distance; best = { x: a.x + dx * (t - 40 / length), z: a.z + dz * (t - 40 / length) }; }
    }
    return best;
  };
  /** Ground a traveler could walk up to a post on: dry, and inside nothing already built. */
  const signFooting = (px, pz) => {
    if (groundHeight(px, pz) < .45) return false;
    for (let i = 0; i < colliders.length; i++) {
      const c = colliders[i];
      if (c.r !== undefined) { const dx = px - c.x, dz = pz - c.z, reach = c.r + .45; if (dx * dx + dz * dz < reach * reach) return false; }
      else if (Math.abs(px - c.x) < c.hx + .45 && Math.abs(pz - c.z) < c.hz + .45) return false;
    }
    return true;
  };
  const branch = (() => { const [a, b] = SUVAL_ROAD, l = Math.hypot(b.x - a.x, b.z - a.z); return { x: a.x + (b.x - a.x) / l * 14 - (b.z - a.z) / l * 3.6, z: a.z + (b.z - a.z) / l * 14 + (b.x - a.x) / l * 3.6 }; })();
  for (const [x, z, label, target, backLabel = 'Tidehaven'] of [
    [-192, 22, 'The Avrel Clearing', AVREL_CLEARING], [-222, 46, 'Clearing mill & farms', at(-222, 62)],
    [-284, 58, 'Caloss Crossing', CALOSS.crossing], [-330, 82, 'The Caloss Bridge', CALOSS.crossing],
    [-366, 112, 'Reedcutters’ Camp', at(-372, 116)], [-378, 128, 'Sava’s Shrine', at(-374, 134)],
    [-386, 158, 'The Waymarkers', at(-386, 152)], [-396, 186, 'The Lauvel Relay', at(-401, 196)],
    [-321, 100, 'Quiet fishing bank', CALOSS_BANK.spot, 'Return to bridge'],
    [-470, 300, 'The Army Camp', STORY_SITES.legionCamp],
    [branch, null, 'The Elodi Frontier', SUVAL_ROAD[6]], [-120, 330, 'Elod', STORY_SITES.elodGate, 'The Elodi Frontier'],
  ]) {
    const spot = typeof x === 'object' ? x : at(x, z);
    let px = spot.x, py = spot.z, guard = 0;
    while (roadDistance(px, py) < 2.4 && guard++ < 14) { px += Math.sign(spot.x + 535) * .8; py += 1.1; }
    // That nudge walks one fixed diagonal, so where a road runs the same way the post has
    // far to go before it is clear - and it can walk off the bank. At the Caloss it ended
    // in the river, 3.8 m below the ground beside it, with its head under the water. A post
    // nobody can read is worse than one close to the road, so find dry ground off the road.
    if (!signFooting(px, py)) {
      let dry = null;
      for (let reach = 1; reach <= 14 && !dry; reach += .5) for (let turn = 0; turn < 24; turn++) {
        const angle = turn / 24 * Math.PI * 2, cx = spot.x + Math.cos(angle) * reach, cz = spot.z + Math.sin(angle) * reach;
        if (roadDistance(cx, cz) >= 2.4 && signFooting(cx, cz)) { dry = { cx, cz }; break; }
      }
      if (dry) { px = dry.cx; py = dry.cz; }
    }
    signs.direction({ x: px, z: py, label, toward: target, back: backAlong(px, py), backLabel, parent: world });
  }

  // ---------------------------------------------------------------------------
  // Journey sites, benches and fires along the new road
  // ---------------------------------------------------------------------------
  const journeyVisuals = new Map();
  const journeyState = Object.fromEntries(Object.keys(journeySites).map(id => [id, false]));
  for (const p of Object.values(regionNpcPositions)) wornPatch(p.x, p.z, 4.7, '#b2a881');
  for (const p of Object.values(journeySites)) wornPatch(p.x, p.z, p.type === 'beacon' ? 3.0 : 1.25, '#b5a582');
  let beaconIndex = 0;
  for (const site of Object.values(journeySites)) {
    const group = new THREE.Group(); group.name = `Journey site ${site.id}`; world.add(group); movingGroups.add(group);
    const y = groundHeight(site.x, site.z);
    if (site.type === 'parcel') {
      box(material(site.id.endsWith('2') ? '#849b8e' : '#c4b384'), site.x, y + .24, site.z, .62, .43, .47, group);
      box(cream, site.x, y + .465, site.z, .075, .016, .49, group); box(cream, site.x, y + .466, site.z, .65, .016, .07, group);
      pebble(material('#b17150'), site.x, y + .48, site.z, .075, .025, .065, group);
      journeyVisuals.set(site.id, { incomplete: group });
    } else if (site.type === 'sticks') {
      for (let i = 0; i < 3; i++) { const branch = post(woodLight, site.x + (i - 1) * .15, y + .10, site.z, .065, 1.15, group); branch.rotation.set(Math.PI / 2, 0, (i - 1) * .22); }
      journeyVisuals.set(site.id, { incomplete: group });
    } else if (site.type === 'fruit') {
      for (let i = 0; i < 3; i++) pebble(material('#b5b66c'), site.x + (i - 1) * .22, y + .13, site.z + (i % 2) * .22, .15, .13, .26, group);
      journeyVisuals.set(site.id, { incomplete: group });
      const tx = site.x + 2.9, tz = site.z + .7, ty = groundHeight(tx, tz);
      post(wood, tx, ty + 1.45, tz, .13, 2.9, world); pebble(material('#799757'), tx, ty + 3.0, tz, 1.65, 1.2, 1.45, world);
      colliders.push({ x: tx, z: tz, r: .25, kind: 'fruit-tree' });
    } else if (site.type === 'beacon') {
      const lean = beaconIndex++ % 2 ? .24 : -.24;
      const bx = site.x + (lean < 0 ? -2.1 : 2.1), bz = site.z, by = groundHeight(bx, bz);
      post(material('#a6a596'), bx, by + .30, bz, .77, .6, world);
      group.position.set(bx, by + .35, bz); group.rotation.z = lean;
      pebble(material('#91998c'), 0, 1.0, 0, .55, 1.18, .45, group);
      box(material('#897a51'), 0, 1.21, .40, .18, .78, .05, group);
      const arrowInset = mesh(new THREE.ShapeGeometry(arrowGeo), material('#8f8963'), 0, 1.59, .43, .34, .34, 1, group); arrowInset.rotation.z = Math.PI / 2;
      colliders.push({ x: bx, z: bz, r: .85, kind: 'waymarker' });
      const flame = new THREE.Group(); flame.name = `${site.id} light`; flame.position.set(0, 1.21, .445); group.add(flame);
      // Restored: a fresh coat of lime on the face and the arrow repainted, in the signs' own paint.
      box(material(SIGN_COLOURS.letter), 0, 0, 0, .18, .78, .025, flame);
      const polishedArrow = mesh(new THREE.ShapeGeometry(arrowGeo), material(SIGN_COLOURS.paint.empire), 0, .38, .012, .34, .34, 1, flame);
      polishedArrow.rotation.z = Math.PI / 2;
      flame.visible = false;
      journeyVisuals.set(site.id, { complete: flame, pivot: group, lean });
    }
  }
  journeyVisuals.set('bridge-repair', { complete: regionScenery.repairedDeck, incomplete: regionScenery.brokenCord, blockers: regionScenery.damagedColliders });
  movingGroups.add(regionScenery.repairedDeck); movingGroups.add(regionScenery.brokenCord); movingGroups.add(regionScenery.millSails);
  for (const bench of [...regionRepairBenches, OUTPOST_BENCH]) {
    // The interaction stand stays fixed. Put the physical bench on its road-free
    // side; a fixed westward offset clipped the curved road near Sava's shrine.
    const candidates = [1.65, 2.25, 3, 3.75].flatMap(reach => [[-reach, 0], [reach, 0], [0, -reach], [0, reach]]);
    const offset = candidates.find(([dx, dz]) => roadDistance(bench.x + dx, bench.z + dz) > .95) ?? candidates[0];
    const x = bench.x + offset[0], z = bench.z + offset[1], y = groundHeight(x, z);
    wornPatch(bench.x, bench.z, 2.5, '#aaa182');
    box(woodLight, x, y + .78, z, 1.5, .15, .75, world);
    for (const dx of [-.57, .57]) for (const dz of [-.25, .25]) box(wood, x + dx, y + .38, z + dz, .13, .76, .13, world);
    pebble(material('#96988e'), x, y + .96, z, .4, .11, .25, world); box(darkWood, x + .43, y + .92, z + .17, .4, .07, .08, world);
    colliders.push({ x, z, hx: .78, hz: .4, kind: 'repair-bench' });
  }
  const worldFirePits = [
    ...firePits.map(fire => ({ ...fire, ...villageToWorld(fire.x, fire.z),
      ...(({ x, z }) => ({ fireX: x, fireZ: z }))(villageToWorld(fire.fireX, fire.fireZ)) })),
    ...regionFirePits.map(fire => ({ ...fire })), { ...OUTPOST_FIRE }, { ...FARM_FIRE },
  ];

  // ---------------------------------------------------------------------------
  // Distant country and the inland horizon
  // ---------------------------------------------------------------------------
  // The Elagos summits keep their height; only their footprint and their
  // distance grow, so the horizon reads the same from a bigger Drent.
  const distantSummits = [
    { ...at(-690, -120), topY: 58, width: 34 * WORLD_SCALE, depth: 29 * WORLD_SCALE, lean: -3, phase: .2 },
    { ...at(-760, -40), topY: 66, width: 37 * WORLD_SCALE, depth: 31 * WORLD_SCALE, lean: 2, phase: 1.1 },
    { ...at(-800, 60), topY: 54, width: 30 * WORLD_SCALE, depth: 26 * WORLD_SCALE, lean: -1.5, phase: 2.4 },
  ];
  const summitMaterial = material('#7c8b83', { flatShading: true });
  for (const [index, summit] of distantSummits.entries()) {
    const baseY = bedrockHeight(summit.x, summit.z) - 2, height = summit.topY - baseY, positions = [], indices = [];
    for (let ring = 0; ring < 3; ring++) for (let i = 0; i < 7; i++) {
      const angle = i * Math.PI * 2 / 7 + summit.phase, radius = [1, .70, .29][ring] * (1 + Math.sin(i * 1.83 + summit.phase) * .13);
      const localY = height * [0, .43, .77][ring] + (ring ? Math.sin(i * 2.2 + summit.phase) * height * .045 : 0);
      positions.push(Math.cos(angle) * summit.width * radius + summit.lean * ring * .28, localY, Math.sin(angle) * summit.depth * radius);
    }
    positions.push(summit.lean, height, -1.5);
    for (let ring = 0; ring < 2; ring++) for (let i = 0; i < 7; i++) {
      const a = ring * 7 + i, b = ring * 7 + (i + 1) % 7;
      indices.push(a, a + 7, b, b, a + 7, b + 7);
    }
    for (let i = 0; i < 7; i++) indices.push(14 + i, 21, 14 + (i + 1) % 7);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
    const peak = mesh(geometry, summitMaterial, summit.x, baseY, summit.z, 1, 1, 1, world);
    peak.name = `Three Presences summit ${index + 1}`; peak.castShadow = false;
  }
  // The ten "mountains" of the first small world: green cones on the horizon west of Drent. The west was
  // built since, under them, and a cone on a built country is a green tent standing in somebody's fields -
  // number 9 at Telemonia's border by the Treloss, half sunk in the rim. So a cone is drawn only where all
  // of its footprint is still open country, and on 2026-10-02 that is none of the ten: they stood in
  // Vastos, Meneth (2), Caricas (2), Nesdor (2), Ovesos, the Oves Desert and Gala. Their numbers are
  // drawn from the seeded stream whether or not they are built, so nothing after them moves.
  const mountainMat = material('#849b83');
  const builtGround = (x, z) => { const region = regionAt(x, z); return !!region && !isOpenCountry(region); };
  const backdropMountains = [];
  for (let i = 0; i < 10; i++) {
    const { x, z } = at(-880 - (i % 5) * 46, -160 + i * 92);
    const sx = range(30, 48) * WORLD_SCALE, sy = range(12, 26), sz = range(30, 50) * WORLD_SCALE, yaw = range(0, 6.28);
    const reach = Math.max(sx, sz), footprint = [[0, 0]];
    for (let a = 0; a < 12; a++) for (const f of [.5, 1]) footprint.push([Math.cos(a * Math.PI / 6) * reach * f, Math.sin(a * Math.PI / 6) * reach * f]);
    const drawn = !footprint.some(([dx, dz]) => builtGround(x + dx, z + dz));
    backdropMountains.push(Object.freeze({ index: i + 1, x, z, radius: reach, drawn, region: regionAt(x, z)?.name ?? null }));
    if (!drawn) continue;
    const mountain = mesh(new THREE.ConeGeometry(1, 1, 7), mountainMat, x, 6, z, sx, sy, sz, world);
    mountain.rotation.y = yaw; mountain.castShadow = false;
  }

  // ---------------------------------------------------------------------------
  // Clearings, places and people
  // ---------------------------------------------------------------------------
  const clearingMatrix = new THREE.Matrix4(), clearingPosition = new THREE.Vector3();
  for (const cover of [grass, bushes, flowers, rocks]) {
    for (let i = 0; i < cover.count; i++) {
      cover.getMatrixAt(i, clearingMatrix); clearingPosition.setFromMatrixPosition(clearingMatrix);
      const spot = villageToWorld(clearingPosition.x, clearingPosition.z);
      if (!featureClear(clearingPosition.x, clearingPosition.z, cover === rocks) && landDistance(spot.x, spot.z) > .4) continue;
      clearingMatrix.makeScale(0, 0, 0); cover.setMatrixAt(i, clearingMatrix);
    }
    cover.instanceMatrix.needsUpdate = true;
  }
  for (let i = colliders.length - 1; i >= 0; i--) {
    const local = worldToVillage(colliders[i].x, colliders[i].z);
    if (!colliders[i].kind && featureClear(local.x, local.z, true)) colliders.splice(i, 1);
  }
  // Woodland branches are dirt trails, not signed village streets.
  const localWorld = { heightAt: localGround, colliders: localColliders };
  const forestPlaces = createForestPlaces(villageRoot, localWorld);
  const forestHideout = createForestHideout(hideoutRoot, { heightAt: (x, z) => { const p = hideoutToWorld(x, z); return groundHeight(p.x, p.z); }, colliders: hideoutColliders });
  const regionalPlaces = createRegionalPlaces(world, { heightAt: groundHeight, colliders });
  const drentCivilWar = createDrentCivilWarScenery({ root: world, material, box, mesh, post, pebble, groundHeight, colliders, wornPatch, roofGeometry, movingGroups });
  createSpiderDenScenery({ root: world, groundHeight });
  createNothomThicketScenery({ root: world, groundHeight, roadDistance });
  createRoadAmbushScenery({ root: world, groundHeight, roadDistance, colliders });
  // Each of the three gangs on Cagney's road has its own cover (src/cagney-quest.js).
  for (const wave of CAGNEY_WAVES) createRoadAmbushScenery({ root: world, groundHeight, roadDistance, colliders, name: 'Cagnapper ambush undergrowth',
    center: wave.center, forward: wave.forward, ambushers: wave.enemies, colliderKind: 'cagnapper-sapling' });

  const reedMat = material('#758249'), reedHead = material('#705637');
  for (let i = 0; i < 25; i++) {
    const angle = i * .247 + .3, r = pond.radius + .2 + Math.sin(i * 1.7) * .18;
    const x = pond.x + Math.sin(angle) * r, z = pond.z + Math.cos(angle) * r;
    if (Math.hypot(x - pond.fishingSpot.x, z - pond.fishingSpot.z) < 3.8) continue;
    const y = localGround(x, z);
    if (i % 3 === 0) pebble(rockMat, x, y + .10, z, .38, .22, .28);
    for (let j = 0; j < 3; j++) {
      const rx = x + Math.sin(j * 2.1) * .17, rz = z + Math.cos(j * 2.1) * .17, h = .55 + (i % 4) * .11 + j * .06;
      post(reedMat, rx, localGround(rx, rz) + h / 2, rz, .018, h);
      const leaf2 = box(reedMat, rx + .09, localGround(rx, rz) + h * .46, rz, .04, h * .66, .019); leaf2.rotation.z = -.35;
      if (j === 0) post(reedHead, rx, localGround(rx, rz) + h * .96, rz, .043, .19);
    }
  }
  localPatch(pond.fishingSpot.x, pond.fishingSpot.z, 1.1, '#b7aa7b', .8);
  const fishingBucket = { x: pondFisher.x - 1.0, z: pondFisher.z - 1.3 };
  // The bank slopes: seat the whole bucket on its displayed ground plane, not above its downhill edge.
  const bucketGround = (x, z) => { const p = villageToWorld(x, z); return treeGroundAt(p.x, p.z); };
  const bucketGroup = new THREE.Group(); bucketGroup.name = 'Willowmere fishing bucket'; villageRoot.add(bucketGroup);
  bucketGroup.position.set(fishingBucket.x, bucketGround(fishingBucket.x, fishingBucket.z) - .006, fishingBucket.z);
  const bucketNormal = new THREE.Vector3(
    bucketGround(fishingBucket.x - .2, fishingBucket.z) - bucketGround(fishingBucket.x + .2, fishingBucket.z), .4,
    bucketGround(fishingBucket.x, fishingBucket.z - .2) - bucketGround(fishingBucket.x, fishingBucket.z + .2)).normalize();
  bucketGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), bucketNormal);
  post(woodLight, 0, .215, 0, .28, .43, bucketGroup);
  post(darkWood, 0, .44, 0, .23, .012, bucketGroup);
  mesh(new THREE.TorusGeometry(.24, .024, 4, 12, Math.PI), darkWood, 0, .405, 0, 1, 1, 1, bucketGroup);

  // ---------------------------------------------------------------------------
  // Fires and fishing
  // ---------------------------------------------------------------------------
  const campfires = new Map();
  const flameMat = new THREE.MeshBasicMaterial({ color: '#ee9a3f' });
  const flameCoreMat = new THREE.MeshBasicMaterial({ color: '#ffe6a4' });
  for (const fire of worldFirePits) {
    const x = fire.fireX, z = fire.fireZ, y = groundHeight(x, z);
    wornPatch(x, z, 1.02, '#8c8166');
    for (let i = 0; i < 9; i++) {
      const a = i * Math.PI * 2 / 9;
      pebble(rockMat, x + Math.sin(a) * .68, y + .13, z + Math.cos(a) * .68, .22, .17, .19, world);
    }
    for (const angle of [-.65, .7]) {
      const log = post(darkWood, x, y + .17, z, .13, .91, world); log.rotation.set(Math.PI / 2, 0, angle);
    }
    colliders.push({ x, z, r: .62, kind: 'firepit' });
    const flames = new THREE.Group(); flames.name = `${fire.id} flames`; flames.position.set(x, y + .2, z); world.add(flames);
    const flameBatch = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 6), flameMat, 3);
    for (let i = 0; i < 3; i++) {
      dummy.position.set((i - 1) * .17, .21 + (i % 2) * .14, (i % 2) * .10);
      dummy.rotation.set(.08, i * 2, (i - 1) * -.15); dummy.scale.set(.20, .60 + (i % 2) * .27, .17); dummy.updateMatrix();
      flameBatch.setMatrixAt(i, dummy.matrix);
    }
    flames.add(flameBatch);
    const flameCore = new THREE.Mesh(new THREE.ConeGeometry(.15, .48, 5), flameCoreMat); flameCore.position.y = .15; flames.add(flameCore);
    const glow = new THREE.PointLight('#ffc675', 2.4, 4.5, 2); glow.position.y = .52; flames.add(glow);
    flames.visible = false; fire.lit = false; campfires.set(fire.id, { fire, flames, glow });
    movingGroups.add(flames);
  }
  let fishingPhase = 'idle';
  const fishingVisual = new THREE.Group(); fishingVisual.name = 'Pond fishing line and float'; world.add(fishingVisual);
  const bobber = new THREE.Group();
  bobber.position.set(fishingSpots[0].castPoint.x, fishingSpots[0].castPoint.y, fishingSpots[0].castPoint.z); fishingVisual.add(bobber);
  pebble(material('#d9794e'), 0, .035, 0, .095, .12, .095, bobber);
  pebble(cream, 0, -.02, 0, .103, .065, .103, bobber);
  const rippleGeometry = new THREE.RingGeometry(.25, .28, 32); rippleGeometry.rotateX(-Math.PI / 2);
  const fishingRipple = new THREE.Mesh(rippleGeometry, new THREE.MeshBasicMaterial({ color: '#e4e8bd', transparent: true, opacity: .6, depthWrite: false }));
  fishingRipple.position.set(fishingSpots[0].castPoint.x, fishingSpots[0].surfaceY + .048, fishingSpots[0].castPoint.z); fishingVisual.add(fishingRipple);
  const lineStart = new THREE.Vector3(fishingSpots[0].fishingSpot.x, groundHeight(fishingSpots[0].fishingSpot.x, fishingSpots[0].fishingSpot.z) + 1.65, fishingSpots[0].fishingSpot.z + 1.45);
  const lineEnd = new THREE.Vector3(fishingSpots[0].castPoint.x, fishingSpots[0].castPoint.y + .08, fishingSpots[0].castPoint.z);
  const fishingLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
    lineStart, lineStart.clone().lerp(lineEnd, .5).add(new THREE.Vector3(0, -.23, 0)), lineEnd,
  ]), new THREE.LineBasicMaterial({ color: '#d7c89b', transparent: true, opacity: .85 }));
  const fishingMidpoint = new THREE.Vector3();
  function setFishingOrigin(position) {
    if (!position || ![position.x, position.y, position.z].every(Number.isFinite)) return false;
    lineStart.copy(position); lineEnd.copy(bobber.position); lineEnd.y += .08;
    fishingMidpoint.copy(lineStart).lerp(lineEnd, .5); fishingMidpoint.y -= .23;
    const vertices = fishingLine.geometry.attributes.position;
    vertices.setXYZ(0, lineStart.x, lineStart.y, lineStart.z);
    vertices.setXYZ(1, fishingMidpoint.x, fishingMidpoint.y, fishingMidpoint.z);
    vertices.setXYZ(2, lineEnd.x, lineEnd.y, lineEnd.z);
    vertices.needsUpdate = true; fishingLine.geometry.computeBoundingSphere(); return true;
  }
  fishingVisual.add(fishingLine); fishingVisual.visible = false;
  movingGroups.add(fishingVisual);
  function setFishingSpot(id) {
    const next = fishingSpots.find(spot => spot.id === id);
    if (!next || (fishingPhase !== 'idle' && next !== activeFishingSpot)) return false;
    activeFishingSpot = next;
    bobber.position.set(next.castPoint.x, next.castPoint.y, next.castPoint.z);
    fishingRipple.position.set(next.castPoint.x, next.surfaceY + .048, next.castPoint.z);
    lineEnd.set(next.castPoint.x, next.castPoint.y + .08, next.castPoint.z);
    setFishingOrigin(lineStart); return true;
  }

  const smoke = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshBasicMaterial({ color: '#ecebd4', transparent: true, opacity: .13, depthWrite: false }), smokeSources.length * 4);
  world.add(smoke);
  const birds = [];
  const wingGeo = new THREE.BufferGeometry();
  wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, .66, .06, .13, .22, 0, -.13], 3)); wingGeo.computeVertexNormals();
  const birdMat = material('#f4ecce', { side: THREE.DoubleSide });
  for (let i = 0; i < 9; i++) {
    const group = new THREE.Group(); world.add(group);
    const l = mesh(wingGeo, birdMat, 0, 0, 0, 1, 1, 1, group), r = mesh(wingGeo, birdMat, 0, 0, 0, -1, 1, 1, group);
    l.castShadow = false; r.castShadow = false;
    birds.push({ group, l, r, phase: range(0, 6.28), radius: range(13, 36), height: range(12, 22), speed: range(.06, .13) });
    movingGroups.add(group);
  }
  const butterflies = [];
  const butterflyMat = material('#e8cd83', { side: THREE.DoubleSide, emissive: '#cfb45f', emissiveIntensity: .1 });
  for (let i = 0; i < 12; i++) {
    const bx = range(-13, 13), bz = range(-55, 6); if (distanceToPath(bx, bz) < 1) continue;
    const group = new THREE.Group(); villageRoot.add(group);
    const l = pebble(butterflyMat, .065, 0, 0, .105, .018, .095, group), r = pebble(butterflyMat, -.065, 0, 0, .105, .018, .095, group);
    l.castShadow = false; r.castShadow = false;
    butterflies.push({ group, l, r, x: bx, z: bz, phase: range(0, 6.28) });
    movingGroups.add(group);
  }

  // ---------------------------------------------------------------------------
  // Static batching, kept per district
  // ---------------------------------------------------------------------------
  for (const group of [arrivalBoat, fishingBoat, sack, bellSwing, ...[...campfires.values()].map(f => f.flames)]) movingGroups.add(group);
  yield 'Preparing scenery';
  yield* batchStaticScenery({THREE,world,movingGroups,spatialBatches,preserveDistricts:fast,regionAt,solidProp:standingProps(paths,heightAt,colliders),processed:processedScenery});
  batchLate=function*(root){
    const newProps=[];
    yield* stageBuildSteps(batchStaticScenery({THREE,world,roots:[root],movingGroups,spatialBatches,preserveDistricts:fast,regionAt,solidProp:standingProps(paths,heightAt,colliders,newProps),processed:processedScenery}),world,root);
    clearLateProps(newProps);
  };

  if(fast){
    // Shared road metadata and a few legacy props are inexpensive to prepare up
    // front. Their drawings stay hidden until the owning region is complete.
    const objects=[];world.updateMatrixWorld(true);world.traverse(object=>{if(object.isMesh)objects.push(object);});
    const center=new THREE.Vector3();
    for(const [index,object] of objects.entries()){
      if(index%64===0)yield;
      let excluded=false;
      for(let parent=object;parent&&parent!==world;parent=parent.parent)if(parent===terrainRoot||parent.name.startsWith('Loading ')){excluded=true;break;}
      if(excluded||object.material.isShaderMaterial)continue;
      const geometry=object.geometry;if(object.isInstancedMesh&&!object.boundingSphere)object.computeBoundingSphere();if(!geometry.boundingSphere)geometry.computeBoundingSphere();
      center.copy((object.isInstancedMesh?object.boundingSphere:geometry.boundingSphere).center).applyMatrix4(object.matrixWorld);
      const id=object.userData.district??regionAt(center.x,center.z)?.id;
      if(!id||id===initialRegion||!loading.hasRegion(id))continue;
      const wrapper=new THREE.Group();wrapper.name=`Waiting for region ${id}`;wrapper.visible=false;
      object.parent.add(wrapper);wrapper.add(object);
      if(!visibilityByRegion.has(id))visibilityByRegion.set(id,[]);visibilityByRegion.get(id).push(wrapper);
    }
  }

  // ---------------------------------------------------------------------------
  // Chart geometry
  // ---------------------------------------------------------------------------
  yield 'Preparing the chart';
  const mapPoint = (x, z) => Object.freeze({ x, z });
  const seaEdge = shorePoints.map(spot => mapPoint(spot.x, spot.z));
  const mapWaters = Object.freeze([
    ...BABON_RIVERS.map(river=>Object.freeze({id:river.id,kind:'polygon',points:Object.freeze([
      ...river.samples.map(p=>mapPoint(p.x-p.nx*p.halfWidth,p.z-p.nz*p.halfWidth)),
      ...[...river.samples].reverse().map(p=>mapPoint(p.x+p.nx*p.halfWidth,p.z+p.nz*p.halfWidth))])})),
    ...ibenwoodRivers.mapWaters,
    ...alezhorMapWaters(),
    ...NORTHERN_LAKES.map(l=>Object.freeze({id:l.id,kind:'polygon',points:l.shore})),
      ...ACOR_WATERS.map(l=>Object.freeze({id:l.id,kind:'polygon',points:l.shore})),
      ...OUTER_LAKES.map(l=>Object.freeze({id:l.id,kind:'polygon',points:l.shore})),
      ...OUTER_RIVERS.flatMap(r=>r.points.slice(1).map((b,i)=>{const a=r.points[i],d=Math.hypot(b.x-a.x,b.z-a.z),nx=-(b.z-a.z)/d*r.width,nz=(b.x-a.x)/d*r.width;return {id:r.id+'-'+i,kind:'polygon',points:[{x:a.x+nx,z:a.z+nz},{x:b.x+nx,z:b.z+nz},{x:b.x-nx,z:b.z-nz},{x:a.x-nx,z:a.z-nz}]};})),
    ...ibenalMapWaters(),
    ...SOUTH_OREMINDI_LAKES.map(l=>Object.freeze({id:l.id,kind:'polygon',points:l.shore})),
    Object.freeze({ id: 'coast-water', kind: 'polygon', points: Object.freeze([...seaEdge,
      mapPoint(WORLD_BOUNDS.maxX + 120, seaEdge.at(-1).z), mapPoint(WORLD_BOUNDS.maxX + 120, seaEdge[0].z)]) }),
    Object.freeze({ id: 'willowmere-water', kind: 'circle', x: pondWorld.x, z: pondWorld.z, radius: pond.radius }),
    ...EAST_PYROS_POOLS.map(p=>Object.freeze({id:p.id,kind:'circle',x:p.x,z:p.z,radius:p.radius*.73})),
    Object.freeze({ id: 'avrel-pool-water', kind: 'circle', x: AVREL_POND.x, z: AVREL_POND.z, radius: AVREL_POND.radius }),
    Object.freeze({ id: 'west-suval-water', kind: 'polygon', points: WEST_SUVAL_SEA }),
    Object.freeze({ id: 'west-izol-water', kind: 'polygon', points: IZOL_SEA }),
    Object.freeze({ id: 'caloss-water', kind: 'polygon', points: Object.freeze([
      ...regionScenery.riverSamples.map(s => mapPoint(s.x - s.nx * CALOSS.halfWidth, s.z - s.nz * CALOSS.halfWidth)),
      ...[...regionScenery.riverSamples].reverse().map(s => mapPoint(s.x + s.nx * CALOSS.halfWidth, s.z + s.nz * CALOSS.halfWidth))]) }),
    ...Object.entries(puethScenery.riverSamples).map(([id, samples]) => Object.freeze({ id: `${id}-water`, kind: 'polygon', points: Object.freeze([
      ...samples.map(s => mapPoint(s.x - s.nx * s.half, s.z - s.nz * s.half)),
      ...[...samples].reverse().map(s => mapPoint(s.x + s.nx * s.half, s.z + s.nz * s.half))]) })),
    ...SELAMUS_CANALS.flatMap(c=>c.points.slice(1).map((b,i)=>{const a=c.points[i],d=Math.hypot(b.x-a.x,b.z-a.z),nx=-(b.z-a.z)/d*c.width/2,nz=(b.x-a.x)/d*c.width/2;return {id:`${c.id}-${i}`,kind:'polygon',points:[mapPoint(a.x+nx,a.z+nz),mapPoint(b.x+nx,b.z+nz),mapPoint(b.x-nx,b.z-nz),mapPoint(a.x-nx,a.z-nz)]};})),
    ...ELAGOS_CHART_WATERS,
    ...SOUTH_SUVAL_CHART_WATERS,
  ]);

  // Islands are land inside the chart's sea: the charts paint these over the water (src/local-map-data.js).
  const mapLands = Object.freeze([...[SOLIS_HARBOR.ramp, ...SOLIS_HARBOR.decks].map(deck => Object.freeze({
    id: `solis-${deck.id}-land`, kind: 'polygon', region: 'West Suval',
    points: Object.freeze([[deck.minA, deck.minB], [deck.maxA, deck.minB], [deck.maxA, deck.maxB], [deck.minA, deck.maxB]]
      .map(([a, b]) => { const p = solisPoint(a, b); return mapPoint(p.x, p.z); })),
  })), Object.freeze({id:'port-calos-quay-land',kind:'polygon',region:'Luscia',
    points:Object.freeze([[PORT_CALOS_QUAY.minX,PORT_CALOS_QUAY.minZ],[PORT_CALOS_QUAY.maxX,PORT_CALOS_QUAY.minZ],[PORT_CALOS_QUAY.maxX,PORT_CALOS_QUAY.maxZ],[PORT_CALOS_QUAY.minX,PORT_CALOS_QUAY.maxZ]].map(([x,z])=>mapPoint(x,z)))}),...PEBLOS_ISLANDS.flatMap(island => regions.find(region => region.name === 'Peblos')?.border
    ?.filter(loop => loop.some(p => island.cells.some(cell => Math.hypot(cell.x - p.x, cell.z - p.z) < 90)))
    .map((loop, index) => Object.freeze({ id: `${island.id}-land-${index}`, kind: 'polygon', region: 'Peblos',
      points: Object.freeze(loop.map(p => mapPoint(p.x, p.z))) })) ?? []),
    // West Izol is an island too: its own outline is painted back over the chart's water.
    ...(regions.find(region => region.name === 'West Izol')?.border ?? []).map((loop, index) => Object.freeze({
      id: `west-izol-land-${index}`, kind: 'polygon', region: 'West Izol', points: Object.freeze(loop.map(p => mapPoint(p.x, p.z))) })),
  ]);
  const worldSpawn = villageToWorld(0, 43), worldBoat = villageToWorld(-4.8, 43);
  const worldTraining = villageToWorld(training.x, training.z);
  const worldEncounter = villageToWorld(encounter.x, encounter.z);
  const worldNorthTrail = villageToWorld(northTrail.x, northTrail.z);
  const worldBorder = villageToWorld(border.x, border.z);
  const worldRepairBench = villageToWorld(repairBench.x, repairBench.z);

  // Collision asks this grid, not the whole list. Fast files appended scenery
  // incrementally; edits to an existing prefix invalidate it before more scenery
  // can mask a removal with a larger list. Full retains its length-based rebuild.
  let colliderIndex = null, indexedFor = -1, colliderEditsWatched = false;
  const colliderGrid = () => {
    if (fast && !colliderEditsWatched) {
      watchColliderEdits(colliders, () => { colliderIndex = null; }); colliderEditsWatched = true;
    }
    if (!colliderIndex || indexedFor !== colliders.length) {
      if (fast && colliderIndex && colliders.length > indexedFor) colliderIndex.append(colliders, indexedFor);
      else colliderIndex = createColliderGrid(colliders);
      indexedFor = colliders.length;
    }
    return colliderIndex;
  };
  const villageTimber = (list, prefix) => list.flatMap((tree, i) => {
    if (tree.hidden) return [];
    const spot = villageToWorld(tree.x, tree.z);
    return [registerWorldTree(colliders, { ...forestTimber(tree.pine), id: `${prefix}-${i}`, x: spot.x, z: spot.z, y: tree.groundY, height: tree.h * tree.s,
      radius: .38 * tree.s, trunkHeight: tree.h * tree.s * .82, trunkTopRadius: .21 * tree.s, ...tree.trunk }, tree.parts, tree.collider)];
  });
  const villageBroadleafTrees = villageTimber(broadTrees, 'oak').concat(avrelEdgeTrees);
  villageTimber(pineTrees, 'pine');
  treeRegistry.configure({reindex:()=>{colliderIndex=null;}});
  const api = {
    loadingMode, loading, sceneryResidency:residency,
    enabledRegions:enabled?[...enabled]:null,isRegionEnabled:(x,z)=>enabledId(regionAt(x,z)?.id),
    updateStreaming(position){
      if(!residency)return;
      if(!residencyAt||Math.hypot(position.x-residencyAt.x,position.z-residencyAt.z)>40){residency.update(position);residencyAt={x:position.x,z:position.z};}
    },
    onRegionReady(listener){readyListeners.add(listener);return ()=>readyListeners.delete(listener);},
    menora, nylon, aevis, mithalaCity, caricasSettlement, inquestHome, peninsulaTutorial,
    /** Haethom (its `hatch` and `meadowWater`) and Ninehands: the Farmlands of the Lizeem, Builds 2 and 3 (6 October 2026). */
    nethereumFarm, nesdorFarm,
    /** Velsorten (its `canal`) and Amalthea's hamlet: the Farmlands of the Lizeem, Builds 4 and 5 (6 October 2026). */
    ovesosFarm, isareosHamlet,
    heightAt, groundHeight, urubondGround, urubondScenery, outerRegions, acorRegions, northernRegions, selamus, selamusGround, selamusHarbor, pyra, pyraGround, westLotharnGround, mithalaWater, eastPyros, netherDesert, legemum, babon, southCelder, northCelder, canerd, canerdGround, eastIzol, alezhor, southIbenal, northIbenal, henborth, baldro, westOremindi, lotharnCaves, westLotharnCaves, southOremindi, yunethre, ibenwood, ibenwoodForest, ibenwoodRivers, ibenwoodWater, ibenwoodAlezhorGround,
    // Displayed terrain triangles, for visual grounding only; collision still uses heightAt.
    renderedGroundHeight: (x,z)=>urubondSurface?.fineGroundHeight(x,z)??((outerOwns(x,z)||acorOwns(x,z))?treeGroundAt(x,z):northernSurfaces.get(northernCellAt(x,z)?.region)?.heightAt(x,z)??selamusGround.fineGroundHeight(x,z)??pyraGround.fineGroundHeight(x,z)??canerdGround.fineGroundHeight(x,z)??(babonSurface&&babonOwns(x,z)?babonSurface(x,z):(ibenwoodAlezhorGround.fineGroundHeight(x,z)??Math.max(westFineGroundAt(x,z),galaScenery.fineGroundHeight?.(x,z)??-Infinity,suvalSurface.fineGroundHeight(x,z)??-Infinity)))),
    supportAt: forestWalks.supportAt, walkSurfaces: outdoorWalkSurfaces,
    roadSurfaceMetrics,
    mapWaters,
    get mapBuildings(){return [...canerd.mapFeatures,...pyra.mapFeatures,...selamus.mapFeatures.filter(feature=>feature.kind==='building')].map(feature=>({...feature,kind:'house'}));},
    get mapBridges(){return selamus.metrics.bridges?[...bridgeDecks,...SELAMUS_MAP_BRIDGES]:bridgeDecks;},
    colliders,
    /** Bowden's woodlot, whose trees fall and grow back (src/woodlot-world.js). */
    woodlot, treeRegistry,
    /** The traveler's house and the birdhouse posts, built as Construction goes (src/homestead-world.js). */
    homestead,
    jesseCarriage,
    brandyHome,
    familyHomes,
    /** The burial ground at the Lauvel, whose open grave is filled in if Sela's son is found (src/lauvel-burying.js). */
    lauvelField: regionScenery.lauvelField,
    /** The colliders that could reach within `reach` of a point; see src/collider-grid.js. */
    nearColliders: (x, z, reach = 0, out) => colliderGrid().near(x, z, reach, out),
    /**
     * **The surface of whatever water is at this point**, or the sea's line where there is none.
     *
     * The sea lies at `WATERLINE`; a river lies at whatever height its own bed carried it to,
     * which for the Caloss is a little under three metres above the sea and for one reach of hill
     * country is twenty-eight. Every water collider carries the surface of the water it marks
     * (`surface`, written where each river is built), so this is a grid lookup and not a search
     * through a list of rivers: it runs inside `canStand`, which is the most-asked question in
     * the game.
     *
     * Where two bodies overlap - a river's mouth in the sea - the higher surface wins, because
     * the point is under both and the deeper of the two is what you are in.
     */
    waterAt(x, z) {
      let surface = Math.max(WATERLINE,outerWaterAt(x,z)??WATERLINE,acorWaterAt(x,z)??WATERLINE,northernWaterAt(x,z)??WATERLINE,alezhorSwimmingSurface(x,z,groundHeight)??WATERLINE,celderBorderWaterSurface(x,z)??WATERLINE,babonWaterAt(x,z)??WATERLINE,eastPyrosWaterAt(x,z)??WATERLINE,baldroWaterAt(x,z)??WATERLINE,ibenwoodRivers.waterAt(x,z)??WATERLINE,southOremindiWaterAt(x,z)??WATERLINE);
      for (const c of colliderGrid().near(x, z, 0)) {
        if (c.surface === undefined || c.r === undefined) continue;
        const dx = x - c.x, dz = z - c.z;
        if (dx * dx + dz * dz < c.r * c.r && c.surface > surface) surface = c.surface;
      }
      return surface;
    },
    reindexColliders: () => { colliderIndex = null; },
    /** Leave props passable within `clear` metres of each point: a stand, a site, a bench. */
    keepPropsClear(points, clear = .8) {
      const spots = points.filter(p => p && Number.isFinite(p.x) && Number.isFinite(p.z));
      for (let i = colliders.length - 1; i >= 0; i--) {
        const c = colliders[i];
        if (c.kind === 'prop' && spots.some(p => Math.hypot(c.x - p.x, c.z - p.z) < c.r + clear)) colliders.splice(i, 1);
      }
      colliderIndex = null;
    },
    colliderIndexState: () => ({ ...colliderGrid(), near: undefined }),
    training: { ...worldTraining, object: training.object, y: training.y },
    repairBench: { ...worldRepairBench, name: repairBench.name },
    repairBenches: [{ ...worldRepairBench, name: repairBench.name }, ...regionRepairBenches, OUTPOST_BENCH],
    /** Props that belong to a garrison and are out only while their side holds the region (see occupation.js). */
    stakedProps,
    regions,
    regionAt, isOpenCountry,
    journeySites: { ...journeySites, 'drent-rebel-evidence': DRENT_SITES.evidence, 'drent-armory-supplies': DRENT_SITES.supplies },
    drentCivilWar,
    routeJourney: ONWARD_ROAD.map(p => ({ x: p.x, z: p.z })),
    // The branch is walkable only to Elod's shut gate: East Suval is closed (closed-border.js).
    suvalRoute: FRONTIER_ROUTE.map(p => ({ x: p.x, z: p.z })),
    closedFrontier: { region: 'East Suval', gate: { x: FRONTIER_GATE.x, z: FRONTIER_GATE.z }, approach: { x: FRONTIER_APPROACH.x, z: FRONTIER_APPROACH.z }, into: { x: FRONTIER_GATE.u.x, z: FRONTIER_GATE.u.z } },
    solisRoute: SOLIS_ROAD.map(p => ({ x: p.x, z: p.z })),
    westSuvalMetrics: westSuval.metrics,
    setSolisHolder: westSuval.setHolder,
    // Walled places the autopilot leaves and enters by their gates: Solis and its court, the outpost, the stockade.
    enclosures: [...SOLIS_ENCLOSURES, AMBRON_ENCLOSURE, enclosureOf(OUTPOST_CIRCUIT, 'outpost', 'The Ambroni outpost'), enclosureOf(STOCKADE_CIRCUIT, 'stockade', 'The border stockade')],
    solisHolder: westSuval.holder,
    elagosRoute: AMBRON_ROAD.map(p => ({ x: p.x, z: p.z })),
    calossElagosRoute: CALOSS_ELAGOS_ROAD.map(p => ({ x: p.x, z: p.z })),
    lakeRoute: LAKE_ROAD.map(p => ({ x: p.x, z: p.z })),
    elagosMetrics: elagos.metrics,
    southSuvalMetrics: southSuval.metrics,
    eastLotharnMetrics: eastLotharn.metrics,
    westLotharnMetrics: westLotharn.metrics,
    southOremindiMetrics: southOremindi.metrics,
    yunethreMetrics: yunethre.metrics,
    feradomMetrics: feradom.metrics,
    farmlandMetrics: regionalFarmland.metrics, farmsteads: FARMSTEADS,
    suvalHighlandMetrics: suvalHighlands.metrics,
    iscareMetrics: iscare.metrics,
    galaMetrics: galaScenery.metrics,
    ovesMetrics: ovesScenery.metrics,
    mithalaMetrics: mithalaScenery.metrics,
    mithalaCityMetrics: mithalaCity.metrics,
    southwestMetrics: southwestScenery.metrics,
    selemisMetrics: selemisScenery.metrics,
    varnMetrics: varn.metrics,
    lotharnFortsMetrics: lotharnForts.metrics,
    telemoniaMetrics: telemoniaScenery.metrics,
    telemoniaTownMetrics: telemoniaTown.metrics,
    // Faces no climber can hold, whatever the skill (src/climbing.js reads it): one table of them, a row to a
    // place (src/no-climb-zones.js) - the rock Varn's walls are built into, the cliffs the pass forts stand
    // between, and Kethorn's rock and its wall in Telemonia, whose gate is the only way onto the top.
    unclimbableAt,
    backdropMountains: Object.freeze(backdropMountains),
    ascarthMetrics: ascarth.metrics,
    puethRoute: PUETH_ROAD.map(p => ({ x: p.x, z: p.z })),
    renaRoute: RENA_ROAD.map(p => ({ x: p.x, z: p.z })),
    puethMetrics: puethScenery.metrics,
    peblosMetrics: peblosScenery.metrics,
    portCalosMetrics: portCalos.metrics,
    portCalos: PORT_CALOS,
    portCalosQuay: PORT_CALOS_QUAY,
    izolMetrics: izol.metrics,
    izolQuay: IZOL_QUAY,
    amodMetrics: amodScenery.metrics,
    peblosQuay: COBBLE_QUAY,
    eastSuvalMetrics: eastSuval.metrics,
    elodQuay: ELOD_QUAY,
    // Where a boat would put a traveler down if the sea route were ever switched
    // on (src/east-suval.js, ELOD_SEA_ROUTE). Nothing sails there yet.
    elodLanding: ELOD_LANDING,
    placeFerryBoat: peblosScenery.placeFerryBoat,
    mapLands,
    roadSigns,
    frontier: { x: FRONTIER.x, z: FRONTIER.z, name: FRONTIER.name, regionName: FRONTIER.regionName },
    storySites: STORY_SITES,
    regionMetrics: regionScenery.metrics,
    distantSummits,
    forestPlaces: forestPlaceDefinitions.map(site => ({ ...site, ...villageToWorld(site.x, site.z),
      trail: site.trail.map(p => villageToWorld(p.x, p.z)) })),
    forestPlaceMetrics: forestPlaces.metrics,
    setForestPlaceState: forestPlaces.setState,
    regionalPlaces: REGIONAL_PLACES,
    regionalActivitySites: REGIONAL_ACTIVITY_SITES,
    regionalPlaceMetrics: regionalPlaces.metrics,
    setRegionalPlaceState: regionalPlaces.setState,
    regionalPlaceState: regionalPlaces.state,
    updateRegionalPlaces: regionalPlaces.update,
    forestPlaceState: forestPlaces.state,
    forestHideout: {
      ...FOREST_HIDEOUT, ...hideoutToWorld(FOREST_HIDEOUT.x, FOREST_HIDEOUT.z),
      center: hideoutToWorld(FOREST_HIDEOUT.center.x, FOREST_HIDEOUT.center.z),
      approach: hideoutToWorld(FOREST_HIDEOUT.approach.x, FOREST_HIDEOUT.approach.z),
      checkpoint: hideoutToWorld(FOREST_HIDEOUT.checkpoint.x, FOREST_HIDEOUT.checkpoint.z),
      supplies: hideoutToWorld(FOREST_HIDEOUT.supplies.x, FOREST_HIDEOUT.supplies.z),
      trail: FOREST_HIDEOUT.trail.map(p => hideoutToWorld(p.x, p.z)),
      enemies: FOREST_HIDEOUT.enemies.map(p => hideoutToWorld(p.x, p.z)),
      retreatAxis: 'z', retreatLine: hideoutToWorld(37, FOREST_HIDEOUT.approach.z).z,
    },
    forestHideoutMetrics: forestHideout.metrics,
    setForestHideoutState: forestHideout.setState,
    forestHideoutState: forestHideout.state,
    setJourneySiteState(id, completed) {
      if (!(id in journeyState)) return false;
      journeyState[id] = Boolean(completed);
      const visual = journeyVisuals.get(id);
      if (visual?.incomplete) visual.incomplete.visible = !completed;
      if (visual?.complete) visual.complete.visible = Boolean(completed);
      if (visual?.pivot) visual.pivot.rotation.z = completed ? 0 : visual.lean;
      for (const blocker of visual?.blockers ?? []) {
        const index = colliders.indexOf(blocker);
        if (completed && index !== -1) colliders.splice(index, 1);
        if (!completed && index === -1) colliders.push(blocker);
      }
      return true;
    },
    journeySiteState: () => ({ ...journeyState }),
    pond: { ...pond, x: pondWorld.x, z: pondWorld.z,
      fishingSpot: fishingSpots[0].fishingSpot, castPoint: fishingSpots[0].castPoint },
    fishingSpots,
    setFishingSpot,
    activeFishingSpot: () => activeFishingSpot,
    firePits: worldFirePits,
    setCampfireLit(id, lit) {
      const camp = campfires.get(id); if (!camp) return false;
      camp.fire.lit = Boolean(lit); camp.flames.visible = camp.fire.lit; return true;
    },
    setFishingState(phase) {
      if (!['idle', 'waiting', 'bite'].includes(phase)) return false;
      fishingPhase = phase; fishingVisual.visible = phase !== 'idle'; return true;
    },
    setFishingOrigin,
    encounter: { ...worldEncounter, radius: encounter.radius },
    northTrail: { ...worldNorthTrail, name: northTrail.name },
    // `westX` is where the wood ends: the line the old gate's barrier stood on, and still the
    // line that says a traveler has walked out of Tidehaven (src/region-world.js, WOOD_EDGE).
    border: { ...worldBorder, name: border.name, westX: WOOD_EDGE.westX,
      regionName: border.regionName, open: true, notice: border.notice },
    routeNorth: routeNorth.map(p => villageToWorld(p.x, p.z)),
    // Actual country trunks for wildlife homes. Kept separate so the village's
    // existing flora, acorn and mushroom site IDs do not shift.
    regionalBroadleafTrees: regionScenery.broadleafTrees,
    broadleafTrees: villageBroadleafTrees,
    timberTrees: treeRegistry.trees,
    ringBell(time = worldTime) { bellStarted = time; },
    /**
     * The arrival boat, for the opening sequence (src/opening-sequence.js): world metres and a world
     * heading in. It is a child of the village root, so its own frame is the village's.
     */
    placeArrivalBoat(x, z, yaw) { const local = worldToVillage(x, z); arrivalBoat.position.x = local.x; arrivalBoat.position.z = local.z; arrivalBoat.rotation.y = yaw - VILLAGE.yaw; },
    /** Back to where the boat has always lain, against the pier's south face with the gangplank up to the deck. */
    restArrivalBoat() { arrivalBoat.position.x = -5.0; arrivalBoat.position.z = 43; arrivalBoat.rotation.y = -.12; },
    /** Where the boat is now, in world terms, for tests. */
    arrivalBoatPose() { const p = villageToWorld(arrivalBoat.position.x, arrivalBoat.position.z); return { x: p.x, z: p.z, yaw: arrivalBoat.rotation.y + VILLAGE.yaw }; },
    birdGarden: birdGardenSites(groundHeight),
    setFeederHung: hung => birdGarden.setFeederHung(hung),
    spawn: { x: worldSpawn.x, z: worldSpawn.z },
    boatStart: { x: worldBoat.x, z: worldBoat.z, y: 1.0 },
    bounds: { minX: WORLD_BOUNDS.minX, maxX: WORLD_BOUNDS.maxX, minZ: WORLD_BOUNDS.minZ, maxZ: WORLD_BOUNDS.maxZ },
    /** The head of the pier, where Jojo the harbourmaster meets the traveler off the boat. */
    pierHead: villageToWorld(4, 20),
    npcPositions: {
      fisher: villageToWorld(-15, 22), warden: villageToWorld(0, -65),
      'acorn-cook': villageToWorld(acornCook.x, acornCook.z), doomsayer: villageToWorld(doomsayer.x, doomsayer.z),
      'pond-fisher': villageToWorld(pondFisher.x, pondFisher.z),
      'forest-woodcutter': villageToWorld(forestWoodcutter.x, forestWoodcutter.z),
      ...DRENT_NPC_POSITIONS, ...PORT_CALOS_NPC_POSITIONS,
      ...regionNpcPositions, ...REGIONAL_NPC_POSITIONS, ...PUETH_NPC_POSITIONS, ...PEBLOS_NPC_POSITIONS, ...RENA_NPC_POSITIONS, ...IZOL_NPC_POSITIONS, ...ELAGOS_NPC_POSITIONS, ...AMOD_NPC_POSITIONS,
      ...Object.fromEntries(Object.entries({ ...ELOD_STANDS, ...EAST_SUVAL_STANDS }).map(([id, stand]) => [id, { x: stand.x, z: stand.z }])),
    },
    landmarks: [
      ...baldro.landmarks,
      ...WEST_OREMINDI_LANDMARKS,
      ...NYLON_LANDMARKS,
      ...AEVIS_LANDMARKS,
      {...MENORA,id:"menora-city",description:"White walls, a grand imperial temple and the high Sorcerers’ Guild needle guard the Isa–Lizeem fork."},
      CARICAS_TOWN,
      ...MENORA_BUILDINGS.filter(b=>["temple","sorcerers-tower"].includes(b.kind)).map(b=>({...b,description:b.name})),
      ...SOUTH_OREMINDI_LANDMARKS,
      ...NORTHERN_LANDMARKS,
      ...ACOR_LANDMARKS, ...OUTER_LANDMARKS, ...URUBOND_LANDMARKS,
      {id:INQUEST_HOME.id,name:INQUEST_HOME.name,x:INQUEST_HOME.x,z:INQUEST_HOME.z},
      ...YUNETHRE_LANDMARKS,
      { id: 'harbor', name: 'Tidehaven Landing', ...villageToWorld(0, 29), description: 'Small fishing boats cross the Stills to this sheltered corner of Drent’s coast.' },
      { id: 'village', name: 'Tidehaven Village', ...villageToWorld(0, 5), description: 'Salt on the breeze. Smoke above the rooftops. A quiet place to begin.' },
      { id: 'woodland', name: 'The Greenway', ...villageToWorld(0, -36), description: 'An old footpath winds inland beneath the welcoming forest canopy.' },
      { id: 'waystone', name: 'Mosslight Waystone', ...villageToWorld(31, -59), description: 'A weathered marker remembers a road older than the village.' },
      { id: 'watch', name: 'Greenway Watch', ...villageToWorld(0, -66), description: 'The woodland warden watches the route to the greater regions of Azhora.' },
      { id: 'pond', name: 'Willowmere Pond', ...fishingSpots[0].fishingSpot, description: 'A quiet forest pool, a fishing ledge, and an old stone firepit beside the water.' },
      { id: 'northTrail', name: northTrail.name, ...worldNorthTrail, description: 'A shaded bench and an old cairn mark the last rest beneath Drent’s canopy.' },
      { id: 'border', name: border.name, ...worldBorder, description: 'The road continues beneath the trees toward the Avrel farms and the Caloss.' },
      ...forestPlaceDefinitions.map(site => ({ ...site, ...villageToWorld(site.x, site.z) })),
      { ...DRENT_SITES.camp, description: 'Unattended bedrolls, cold ashes, and a dispatch chest beneath the trees.' },
      { ...DRENT_SITES.barracks, description: 'The Empire’s men lodge here. Guarded supply crates stand behind the soldiers’ quarters.' },
      { ...FOREST_HIDEOUT, ...hideoutToWorld(FOREST_HIDEOUT.x, FOREST_HIDEOUT.z),
        description: 'Scraps of blue cloth mark a side trail east from the Tessen road post. A goblin camp squats in the birch beyond, with sacks taken from the post’s stores.' },
      ...regionLandmarks,
      ...WAYSIDE_LANDMARKS,
      ...FRONTIER_LANDMARKS,
      ...PLACE_LANDMARKS,
      ...PUETH_LANDMARKS,
      ...AMOD_LANDMARKS,
      ...VARN_LANDMARKS,
      ...LOTHARN_FORT_LANDMARKS,
      ...PEBLOS_LANDMARKS, ...PORT_CALOS_LANDMARKS,
      ...RENA_LANDMARKS,
      ...EAST_SUVAL_PLACES,
      ...IZOL_LANDMARKS,
      ...REGIONAL_PLACES,
      ...WEST_SUVAL_LANDMARKS,
      ...ELAGOS_LANDMARKS,
      ...SOUTH_SUVAL_LANDMARKS,
      ...EAST_LOTHARN_LANDMARKS,
      ...WEST_LOTHARN_LANDMARKS,
      ...FERADOM_LANDMARKS,
      { id: 'hollow-ridge-refuge', name: 'The Hollow Ridge', ...BAT_CAVE.entrance, radius: 15, description: 'A narrow worn ledge disappears behind a limestone spur. The wind sounds like wings inside the hollow.' },
      { id: 'imlamdris-rebuilding', name: 'Imlamdris rebuilding', ...IMLAMDRIS_REBUILD.centre, radius: 30, description: 'Four timber roofs and a fifth frame stand beside the old city, built from salvaged stone and new-cut boards.' },
      ...ISCARE_RUIN_SITES.map(site => ({ ...site, description: site.id === 'zecron-ruins' ? 'The Blood Prince burned this island port. Roofless houses, a broken lighthouse and burned quay piles remain; nobody lives here.' : 'A small island settlement burned in the Blood Prince\'s passage. Wildlife lives among the fallen rafters.' })),
      ...ASCARTH_LANDMARKS,
      ...WEST_REGION_LANDMARKS,
      ...NETHEREUM_FARM_LANDMARKS, ...NESDOR_FARM_LANDMARKS, ...OVESOS_FARM_LANDMARKS, ...ISAREOS_HAMLET_LANDMARKS,
      ...GALA_LANDMARKS,
      ...OVES_LANDMARKS,
      ...MITHALA_LANDMARKS,
      ...MITHALA_CITY_LANDMARKS,
      ...SOUTHWEST_LANDMARKS,
      ...SELAMUS_LANDMARKS, ...SELEMIS_LANDMARKS,
      ...TELEMONIA_LANDMARKS,
      ...TELEMONIA_TOWN_LANDMARKS,
      ...PYRA_LANDMARKS, ...EAST_PYROS_LANDMARKS, ...NETHER_DESERT_LANDMARKS, ...LEGEMUM_LANDMARKS, ...BABON_LANDMARKS,
      ...SOUTH_CELDER_LANDMARKS, ...NORTH_CELDER_LANDMARKS, ...CANERD_LANDMARKS, ...EAST_IZOL_LANDMARKS, ...ALEZHOR_LANDMARKS, ...SOUTH_IBENAL_LANDMARKS, ...NORTH_IBENAL_LANDMARKS, ...HENBORTH_LANDMARKS,
    ],
    paths,
    update(time, dt) {
      winery.update(time);
      worldTime = time;
      const bellAge = Number.isFinite(bellStarted) ? Math.max(0, time - bellStarted) : 6;
      const bellEnvelope = bellAge < 6 ? Math.exp(-bellAge * .7) : 0;
      bellSwing.rotation.z = Math.sin(bellAge * 10) * .43 * bellEnvelope;
      bellTongue.rotation.z = Math.sin(bellAge * 10 - .9) * .5 * bellEnvelope;
      waterMaterial.uniforms.time.value = time;
      pondMaterial.uniforms.time.value = time;
      regionScenery.riverMaterial.uniforms.time.value = time;
      elagos.waterMaterial.uniforms.time.value = time;
      westScenery.update(time);
      eastLotharn.update(time);
      westLotharn.update(time);
      southOremindi.update(time);
      for(const entry of northernRegions)entry.scenery.update(time);
      for(const entry of acorRegions)entry.scenery.update(time);
      for(const entry of outerRegions)entry.scenery.update(time);
      galaScenery.update(time);
      ovesScenery.update(time);ovesosFarm.update(time)/* the mill wheels on the Velsorten canal, 6 October 2026 */;
      mithalaWater.update(time);
      mithalaScenery.update(time);
      southwestScenery.update(time);
      eastPyros.update?.(time);
      regionScenery.millSails.rotation.z = time * .115;
      for (const [i, camp] of [...campfires.values()].entries()) if (camp.fire.lit) {
        camp.flames.scale.set(1 + Math.sin(time * 8 + i) * .04, .94 + Math.sin(time * 11 + i) * .10, 1);
        camp.glow.intensity = 2.3 + Math.sin(time * 9 + i) * .24;
      }
      if (fishingPhase !== 'idle') {
        bobber.position.y = activeFishingSpot.castPoint.y + Math.sin(time * (fishingPhase === 'bite' ? 12 : 2.5)) * (fishingPhase === 'bite' ? .13 : .026);
        bobber.rotation.z = Math.sin(time * 6) * (fishingPhase === 'bite' ? .36 : .06);
        fishingRipple.scale.setScalar(.8 + (time * (fishingPhase === 'bite' ? 1.7 : .6) % 1) * 2.4);
        fishingRipple.material.opacity = fishingPhase === 'bite' ? .77 : .38;
      }
      shoreFoam.material.opacity = .31 + Math.sin(time * .55) * .09;
      arrivalBoat.position.y = .38 + Math.sin(time * .72) * .085; arrivalBoat.rotation.z = Math.sin(time * .62) * .018;
      fishingBoat.position.y = .38 + Math.sin(time * .82 + 2) * .065; fishingBoat.rotation.z = Math.sin(time * .77) * .026;
      let si = 0;
      for (let i = 0; i < smokeSources.length; i++) for (let j = 0; j < 4; j++) {
        const age = (time * .11 + j * .25 + i * .073) % 1, source = smokeSources[i];
        dummy.position.set(source.x + age * 1.65 + Math.sin(time * .25 + j) * age * .28, source.y + age * 4.4, source.z + age * .6);
        dummy.rotation.set(age, age * 2, 0); const s = .19 + age * .56; dummy.scale.set(s, s * .85, s); dummy.updateMatrix(); smoke.setMatrixAt(si++, dummy.matrix);
      }
      smoke.instanceMatrix.needsUpdate = true;
      birds.forEach((bird, i) => {
        const a = time * bird.speed + bird.phase;
        bird.group.position.set(worldSpawn.x + 8 + Math.cos(a) * bird.radius, bird.height + Math.sin(a * 3) * 1.0, worldSpawn.z + Math.sin(a) * bird.radius * .7);
        bird.group.rotation.y = -a;
        const flap = Math.sin(time * 3.4 + i) * .3;
        bird.l.rotation.z = flap; bird.r.rotation.z = -flap;
      });
      butterflies.forEach((butterfly, i) => {
        const a = time * .42 + butterfly.phase;
        const x = butterfly.x + Math.sin(a) * 1.3, z = butterfly.z + Math.cos(a * .8) * 1.0;
        butterfly.group.position.set(x, localGround(x, z) + 1.1 + Math.sin(time * 1.25 + i) * .26, z);
        butterfly.group.rotation.y = a;
        butterfly.l.rotation.z = Math.sin(time * 13 + i) * .95; butterfly.r.rotation.z = -Math.sin(time * 13 + i) * .95;
      });
    },
  };
  if(fast){
    clearLateProps=props=>{
      const spots=[api.training,...OPENING_FIGHT_GROUND,...Object.values(api.npcPositions??{}),...Object.values(api.storySites??{}),...Object.values(api.journeySites??{}),...(api.forestPlaces??[]),...(api.fishingSpots??[]).map(p=>p.fishingSpot),...api.repairBenches].filter(Boolean);
      const remove=new Set(props.filter(c=>spots.some(p=>Math.hypot(c.x-p.x,c.z-p.z)<c.r+.8)));
      if(remove.size)for(let i=colliders.length-1;i>=0;i--)if(remove.has(colliders[i]))colliders.splice(i,1);
      colliderIndex=null;
    };
    postBuild=event=>{colliderIndex=null;if(event.id==='baldro')api.landmarks.push(...baldro.landmarks);};
  }
  // A prop never swallows the spot where somebody stands or where the traveler is meant to go.
  api.keepPropsClear([api.training, ...OPENING_FIGHT_GROUND, ...Object.values(api.npcPositions ?? {}), ...Object.values(api.storySites ?? {}), ...Object.values(api.journeySites ?? {}),
    ...(api.forestPlaces ?? []), ...(api.fishingSpots ?? []).map(spot => spot.fishingSpot), ...(api.repairBenches ?? [])]);
  if(enabled){
    // Shared legacy builders also publish metadata for distant regions. Keep that
    // metadata, but remove their off-route geometry and collisions from this build.
    world.updateMatrixWorld(true);const p=new THREE.Vector3(),outside=[];
    world.traverse(o=>{if(!o.isMesh||o===terrainRoot||o.material?.isShaderMaterial)return;
      o.getWorldPosition(p);if(!enabledId(regionAt(p.x,p.z)?.id)&&!o.isInstancedMesh)outside.push(o);});
    for(const o of outside)o.removeFromParent();
    for(let i=colliders.length-1;i>=0;i--)if(!enabledId(regionAt(colliders[i].x,colliders[i].z)?.id))colliders.splice(i,1);colliderIndex=null;
  }
  residency?.pin(world);
  return api;
}

/**
 * What the Mithala plain's own scatter (src/mithala-scenery.js) laid on the city's ground, lifted after the fact as Varn's,
 * Aevis's and Nylon's is (src/scenery-clearing.js), so the plain's seeded stream is the one it always was. `clearScatter`
 * judges an instance by where it stands, and the plain draws two things in three instances each, laid in step: a tree's
 * crown is three lobes, the last of them over its trunk, and a forb is three lobes round its middle, the last at it. Judged
 * lobe by lobe, a tree on the city's edge would keep a crown lobe over a lifted trunk, hanging in the air; so here a
 * cluster is judged by its last lobe and goes whole, and a trunk goes by its own place, with its collider. Nothing here
 * draws a random number.
 */
function clearMithalaPlainScatter({ scene, colliders, treeRegistry, inside }) {
  // Each instance lifted is recorded on its mesh (`userData.liftedByMithalaCity`, index and original matrix), so the
  // plain's review can put them back and prove the rest is exactly the composition it approved.
  const before = [];
  scene.traverse(object => { if (object.name === 'Mithala scenery') object.traverse(mesh => { if (mesh.isInstancedMesh) before.push([mesh, mesh.instanceMatrix.array.slice()]); }); });
  const lifted = clearScatter({ scene, colliders, treeRegistry, inside, kinds: ['mithala-tree'] });
  const matrix = new THREE.Matrix4(), nothing = new THREE.Matrix4().makeScale(0, 0, 0);
  const clusterOf = mesh => (mesh.name.endsWith(' crowns') || mesh.name === 'Mithala prairie forbs' ? 3 : 1);
  const roots = [];
  scene.traverse(object => { if (object.name === 'Mithala scenery') roots.push(object); });
  for (const root of roots) root.traverse(mesh => {
    if (!mesh.isInstancedMesh) return;
    const size = clusterOf(mesh);
    let changed = false;
    for (let first = 0; first + size <= mesh.count; first += size) {
      mesh.getMatrixAt(first + size - 1, matrix);
      const e = matrix.elements;
      // Already nothing (an earlier clearing): leave it.
      if (e[0] === 0 && e[5] === 0 && e[10] === 0) continue;
      if (!inside(e[12], e[14])) continue;
      for (let i = first; i < first + size; i++) mesh.setMatrixAt(i, nothing);
      lifted.instances += size; changed = true;
    }
    if (changed) mesh.instanceMatrix.needsUpdate = true;
  });
  for (const [mesh, original] of before) {
    const now = mesh.instanceMatrix.array, record = [];
    for (let i = 0; i < mesh.count; i++) {
      const o = i * 16;
      for (let k = 0; k < 16; k++) if (now[o + k] !== original[o + k]) { record.push([i, Array.from(original.subarray(o, o + 16))]); break; }
    }
    if (record.length) mesh.userData.liftedByMithalaCity = [...(mesh.userData.liftedByMithalaCity ?? []), ...record];
  }
  return lifted;
}

/**
 * Anything small that stands in a person's way is solid: posts and poles, crates
 * and barrels, stall counters, fence rails, a board on its posts. Houses, walls and
 * the larger pieces carry colliders of their own; bushes and grass are instanced
 * and stay passable. A road's middle is never blocked. Returns the per-mesh check.
 */
export const PROP_SOLID = Object.freeze({ low: .6, high: 1.6, widest: 2.4, longest: 6, lane: 1.1, pole: .2, gap: 1.2 });
function standingProps(paths, heightAt, colliders, created=null) {
  const CELL = 16, cells = new Map(), key = (cx, cz) => `${cx},${cz}`;
  for (const path of paths) for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    for (let cx = Math.floor(Math.min(a.x, b.x) / CELL); cx <= Math.floor(Math.max(a.x, b.x) / CELL); cx++)
      for (let cz = Math.floor(Math.min(a.z, b.z) / CELL); cz <= Math.floor(Math.max(a.z, b.z) / CELL); cz++) {
        const list = cells.get(key(cx, cz)); if (list) list.push([a, b]); else cells.set(key(cx, cz), [[a, b]]);
      }
  }
  const toRoad = (x, z) => {
    let best = Infinity;
    for (let cx = Math.floor(x / CELL) - 1; cx <= Math.floor(x / CELL) + 1; cx++) for (let cz = Math.floor(z / CELL) - 1; cz <= Math.floor(z / CELL) + 1; cz++) {
      for (const [a, b] of cells.get(key(cx, cz)) ?? []) {
        const vx = b.x - a.x, vz = b.z - a.z, len = vx * vx + vz * vz || 1;
        const t = Math.max(0, Math.min(1, ((x - a.x) * vx + (z - a.z) * vz) / len));
        best = Math.min(best, Math.hypot(x - a.x - vx * t, z - a.z - vz * t));
      }
    }
    return best;
  };
  const box = new THREE.Box3(), size = new THREE.Vector3(), mid = new THREE.Vector3(), axes = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const add = (x, z, r) => { if (toRoad(x, z) > PROP_SOLID.lane + r && heightAt(x, z) >= .45) {const prop={ x, z, r, kind: 'prop', minY:box.min.y, maxY:box.max.y };colliders.push(prop);created?.push(prop);} };
  // A thin pole in a doorway or a lane would close it: one that close to a wall stays passable.
  const built = createColliderGrid(colliders.slice()), gapTo = (x, z, r) => {
    let gap = Infinity;
    for (const c of built.near(x, z, r + PROP_SOLID.gap + 1.5, [])) {
      const d = c.r !== undefined ? Math.hypot(x - c.x, z - c.z) - c.r
        : Math.hypot(Math.max(0, Math.abs(x - c.x) - c.hx), Math.max(0, Math.abs(z - c.z) - c.hz));
      gap = Math.min(gap, d - r);
    }
    return gap;
  };
  return object => {
    if (object.userData.passable) return;
    const geometry = object.geometry;
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    box.copy(geometry.boundingBox).applyMatrix4(object.matrixWorld);
    const x = (box.min.x + box.max.x) / 2, z = (box.min.z + box.max.z) / 2, ground = heightAt(x, z);
    // Between the knees and the head: something a walking person would strike.
    if (box.min.y - ground > PROP_SOLID.high || box.max.y - ground < PROP_SOLID.low) return;
    // Its footprint in its own frame, so a rail or a sign's finger turned at an angle is still a rail.
    geometry.boundingBox.getSize(size); geometry.boundingBox.getCenter(mid).applyMatrix4(object.matrixWorld);
    object.matrixWorld.extractBasis(axes[0], axes[1], axes[2]);
    const spans = axes.map((axis, i) => ({ x: axis.x * size.getComponent(i), z: axis.z * size.getComponent(i) }))
      .map(v => ({ ...v, length: Math.hypot(v.x, v.z) })).sort((a, b) => b.length - a.length);
    const long = spans[0].length, thick = spans[1].length + spans[2].length * .5;
    if (long < .06) return;
    if (long / Math.max(thick, .01) <= 2.5) {
      const across = Math.max(box.max.x - box.min.x, box.max.z - box.min.z), r = Math.min(1, Math.max(.1, across / 2 * .85));
      if (across <= PROP_SOLID.widest && (r >= PROP_SOLID.pole || gapTo(x, z, r) >= PROP_SOLID.gap)) add(x, z, r);
      return;
    }
    // A rail, a plank, a board: a row of small circles along its length.
    if (long > PROP_SOLID.longest) return;
    const r = Math.max(.1, thick / 2 + .02), count = Math.max(2, Math.ceil(long / (r * 1.4)));
    for (let i = 0; i < count; i++) {
      const f = (i + .5) / count - .5;
      add(mid.x + spans[0].x * f, mid.z + spans[0].z * f, r);
    }
  };
}
