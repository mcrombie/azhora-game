import * as THREE from 'three';
import { createWorld } from './world.js';
import { createCat, createCharacter, createDog, createHorse, createOgre, makeQuestMarker, setShadowCasting } from './characters.js';
import { markerFor } from './quest-markers.js';
import { createCombat } from './combat.js';
import { createCombatView } from './combat-view.js';
import { createInventory, INVENTORY_ITEMS } from './inventory.js';
import { createWeapons, WEAPON_TYPES } from './weapons.js';
import { createConsumables } from './consumables.js';
import { createCampcraft } from './campcraft.js';
import { createWorldMap } from './world-map.js';
import { createMapTutorial } from './map-tutorial.js';
import { MERCENARY_ROSTER, CROMB, KIT_WEAPON_ITEM, mercenaryById, escortSpotFor, landingMateNote, mateIsEscorting, createMercenaryCompany, mercenaryLines, mercenaryStyleLines, mercenaryWeapon, tradeOffer, distanceAlongRoad } from './mercenaries.js';
import { ANCHORS as ROUTE_ANCHORS } from './regions.js';
import { METRES_PER_HEX, toWorld, toWorldXIn } from './world-scale.js';
import { GREENWAY_RAID, AVREL_RAID } from './opening-fights.js';
import { bystandersFor, createFallen } from './bystanders.js';
import { LEGION_POSTS, LEGION_POST_IDS, legionPostLines } from './legion-posts.js';
import { TOWN_LIFE_NPCS, TOWN_LIFE_IDS, townLifeLines, createWallWatch } from './town-life.js';
import { createBorderWatch, CLOSED_BORDER_TITLE } from './closed-border.js';
import { COPPER_ITEM, PEDDLER, STARTING_PURSE, describeSum, peddlerOffers } from './economy.js';
import { VILLAGE_DOG, createVillageDog } from './village-dog.js';
import { VILLAGE_CAT, createVillageCat } from './village-cat.js';
import { createRedTailHawk } from './lakota-hawk.js';
import { createHawkFlight } from './hawk-flight.js';
import { createWoodlandLife } from './woodland-life.js';
import { createForestEcology } from './forest-ecology.js';
import { createForestStory, FOREST_STORY_NPC, FOREST_STORY_SITES, forestConversation, forestSiteConversation } from './forest-story.js';
import { runForestSmoke, verifyForestReload } from './forest-smoke.js';
import { createForestHideoutQuest, FOREST_HIDEOUT_QUEST, HIDEOUT_GARRISON, hideoutConversation, hideoutTamsinChoices, garrisonConversation } from './forest-hideout.js';
import { createForestHideoutWatch } from './forest-hideout-watch.js';
import { runHideoutSmoke, verifyHideoutReload } from './forest-hideout-smoke.js';
import { buildLocalMapModel } from './local-map-data.js';
import { createTrailMap } from './trail-map.js';
import { drawMinimap } from './minimap.js';
import { runLocalMapSmoke } from './local-map-smoke.js';
import { createRegionalLife, REGIONAL_LIFE_NPCS, REGIONAL_LIFE_SITES, regionalLifeConversation, regionalLifeSiteConversation, regionalLifeRelayChoices } from './regional-life.js';
import { runRegionalLifeSmoke, verifyRegionalLifeReload } from './regional-life-smoke.js';
import { createAcornQuest } from './acorn-quest.js';
import { createJourney } from './journey.js';
import { JOURNEY_NPCS, SITE_ACTIONS, journeyConversation } from './journey-content.js';
import { createRoadCheckpoint } from './road-checkpoint.js';
import { createLusciaChapter, LUSCIA_NPCS, LUSCIA_SITES, LUSCIA_SITE_ACTIONS, LUSCIA_WOLVES, lusciaConversation } from './luscia-chapter.js';
import { TOWN_NPCS, TOWN_NPC_IDS, TOWN_BEGGAR_ROUTE, REBEL_CONTACT, townConversation } from './luscia-town.js';
import { PUETH_NPCS, PUETH_NPC_IDS, puethConversation } from './pueth-people.js';
import { createRenaLetters, ARDRY_NAMES, ARDRY_PLACES } from './rena-letters.js';
import { RENA_NPCS, RENA_NPC_IDS, renaConversation } from './rena-people.js';
import { AMOD_NPCS, AMOD_NPC_IDS, amodConversation } from './amod-people.js';
import { createOgreToll, OGRE_NPC, OGRE_ENCOUNTER, OGRE_TOLL, OGRE_CHALLENGE, OGRE_TOPIC_IDS, ogreTopicLines, OGRE_VICTORY, OGRE_RETURNED } from './amod-ogre.js';
import { OGRE_STAND } from './amod-world.js';
import { PEBLOS_NPCS, PEBLOS_NPC_IDS, peblosConversation } from './peblos-people.js';
import { EAST_SUVAL_PEOPLE, EAST_SUVAL_NPC_IDS, elodConversation } from './elod-people.js';
import { createIzolHost } from './izol-host.js';
import { izolDeckHeight } from './izol-world.js';
import { ELAGOS_NPCS, isElagosNpc, elagosConversation, TALKING_TREE_QUEST } from './ambron-people.js';
import { FERRY_NPC, FERRY_LANDINGS, createFerry, ferryConversation, quayHeight } from './ferry.js';
import { createMorosChapter, MOROS_SITES, MOROS_SITE_ACTIONS, MOROS_GATE_ID, MOROS_LEGATE_ID, morosConversation } from './moros-chapter.js';
import { createBorderChapter, BORDER_NPCS, BORDER_ENCOUNTER_ID, borderEncounter, borderConversation } from './border-chapter.js';
import { createWestSuvalHost } from './west-suval-host.js';
import { createAftermathChapter, AFTERMATH_NPCS, AFTERMATH_VARIANTS, aftermathEncounter, aftermathConversation } from './aftermath-chapter.js';
import { AFTERMATH_SITES, aftermathSite, aftermathArena, aftermathBuilt } from './aftermath-sites.js';
import { occupationControl, isOut, stakeOf } from './occupation.js';
import { createRiding, RIDE, RIDING_KEYS, DEVELOPER_HORSE_SPEED, DEVELOPER_HORSE_NAME, steer, drive } from './riding.js';
import { OSTLER_NPC, OSTLER_OBJECTIVE, horseWaiting, redeemHorse, ostlerConversation } from './ostler.js';
import { LUMBER_TOWN_STABLE, SOLIS, SEA_LEVEL, solisPoint } from './region-world.js';
import { BEGGAR_NPC, createBeggar, beggarConversation } from './beggar.js';
import { createSkills, skillLevel, SKILLS, SKILL_IDS, SKILLS_VERSION, skillGuide, levelUpLine, skillTip } from './skills.js';
import { skillIconSVG } from './skill-icons.js';
// Who you are: any of the eleven of the company, chosen at the opening (src/player-characters.js).
import { DEFAULT_PLAYER, companyFor, playableCharacter, playerLook, savedPlayerCharacter, startingInventory, startingLanguages, startingSkills } from './player-characters.js';
import { createCharacterSelect } from './character-select.js';
// Sailing in: the forty-four seconds from the roads to the pier, as data (docs/opening-sequence.md).
import { stateAt, eventsBetween, variantFor, boatBob, SKIP_BY_VARIANT } from './opening-sequence.js';
import { WOODCUTTING_SKILL, BOWDEN, BOWDEN_STAND, WOODLOT_TREES, TREE_KINDS, AXES, SWING, CHOP_REACH, createWoodcutting, bowdenConversation, bowdenLines } from './woodcutting.js';
import { createBowden } from './woodcutter-model.js';
import { LAUVEL_PEOPLE, LAUVEL_LINES, bearersAt, bearersStandingBack, fieldPoint } from './lauvel-aftermath.js';
import { createBurying, selaConversation, workerChoice, HAIL, HAIL_FROM, JOBS, JOB_FIRST, JOB_AGAIN, THE_GREEN_COAT, THE_BURYING, SON } from './lauvel-burying.js';
import { createGravedigger, createStretcher } from './lauvel-people-models.js';
import { CONSTRUCTION_SKILL, PLANKS, PLANK_IDS, WORKBENCH, HOUSE_STAGES, HOUSE_PLOT, PLOT_STAND, WORKBENCH_SPOT, BIRDHOUSE_POSTS, BIRDHOUSE_KINDS, BUILD_LINES, createConstruction, sawOffer } from './construction.js';
import { BIRD_WATCHER, GARDEN_KEEPER, BIRD_SPECIES, BIRDING_KEY, BIRDING_LESSON, SKILLS_KEY, FILLED_FEEDER_ITEM, createBirding, birdWatcherConversation, gardenKeeperConversation, lysaFeederChoice, observeRange } from './birding.js';
import { createLakota } from './lakota.js';
import { createDrentBirds } from './drent-birds.js';
import { findBird } from './bird-finder.js';
import { createFishing, FISHING_SKILL } from './fishing-skill.js';
import { MYCOLOGIST, MYCOLOGY_SKILL, MYCOLOGY_LESSON, createMycology, mycologistConversation } from './mycology.js';
import { createMushrooms } from './mushrooms.js';
import { BOTANIST, BOTANIST_STAND, BOTANY_SKILL, BOTANY_LESSON, JIMSON_ITEM, createBotany, botanistConversation } from './botany.js';
import { createDrentFlora } from './drent-flora.js';
import { createDrentTrees } from './drent-trees.js';
import { GEOLOGIST, GEOLOGIST_STAND, GEOLOGY_SKILL, GEOLOGY_LESSON, createGeology, geologistConversation } from './geology.js';
import { createLinguist, MAX_PROFICIENCY } from './linguist.js';
import { LANGUAGES, DIALECTS, INTERPRETER, interpreterFor, LINGUIST_KEY, PHRASEBOOK_ITEM } from './languages.js';
import { setSignReader } from './signs.js';
import { createDrentStones } from './drent-stones.js';
import { ARCHAEOLOGY_SKILL, ARCHAEOLOGY_LESSON, RENA_NEEDED, createArchaeology } from './archaeology.js';
import { WINE_SKILL, WINE_LESSON, TASTING_TERMS, createWine, vintnerConversation, cellarHandConversation, winemakerConversation } from './wine.js';
import { LAKOTA_MAKES_A_CUP, LAKOTA_TEACHES_THE_CUP, createCooking } from './cooking.js';
import { WINE_ATTIC, ATTIC_PEOPLE, ATTIC_STANDS, ATTIC_HEAD, JUAN, NIKA, JUAN_LESSON, createWineAttic, juanConversation, juanShop, juanTasting, nikaConversation } from './wine-attic.js';
import { ATTIC_WINES } from './attic-wines.js';
import { PUCK, SECRETARY, SECRETARY_STAND, SEA_WALL_NICHE, PRIME_MINISTER, createPuck, puckConversation, secretaryConversation, puckThanks } from './wine-goblin.js';
import { createPuckView } from './wine-goblin-view.js';
import { ED, CHAMELEON_SPOTS, createChameleon, chameleonConversation, chameleonThanks, carryingForEd } from './chameleon.js';
import { createEdView, createEdModel } from './chameleon-model.js';
import { TROUPE_PEOPLE, TROUPE_IDS, PLAYBILL_ITEM, createTroupe, troupeConversation, troupeThanks } from './troupe.js';
import { JOHN, SALT_PORTS, BEEF_PRICE, SALT_BEEF, sailTime, createSaltSultan, johnConversation, saltToast } from './salt-sultan.js';
import { createJohn, createSultana, createRebelShip } from './salt-ship.js';
import { WORD_ID, WORD_LEVEL, WORD_SHIP, WORD_TRACK, WORD_BEACH, WORD_ASHORE, shipAt, swimmerAt, wordToastAt } from './word-arrival.js';
import { createPlayer, createUnderstudy, createCritic, createPageantWagon } from './troupe-models.js';
import { BRANDY, BRANDY_STAND, BRANDY_YARD, yardPoint, RIBBON_ITEM, createBrandy, brandyConversation, brandyRibbonLines } from './brandy.js';
import { VINTNER, CELLAR_HAND, WINEMAKER, WINERY, WINERY_LAYOUT, WINERY_STANDS, VARIETIES } from './winery.js';
import { createRenaDigs } from './rena-digs.js';
import { TALKING_TREE, createTalkingTree, treeLines } from './talking-tree.js';
import { buildTalkingTree } from './talking-tree-view.js';
import { PIPE_SMOKER, PIPE_ITEM, LEAF_ITEM, PIPE_HEAL, WEATHERHEAD, createPipe, pipeSmokerConversation } from './pipeweed.js';
import { TOFT, TOFT_STAND, JIMSON_PODS_WANTED, createJimson, toftConversation } from './jimson-quest.js';
import { KATY, KATY_STAND, KATY_SKETCH, createKaty, katyConversation } from './katy.js';
import { IMANI, IMANI_STAND, createVineyard, imaniConversation } from './vineyard.js';
import { BATMAN, BATMAN_PERCH, HANDOVER, EVIDENCE, BUST_SCENE, ENDINGS, VELAETH, createBatmanHunt, batmanConversation } from './batman.js';
import { ADDISON, ADDISON_STAND, SUVAL_LIGHT, FROM_THE_GALLERY, createLightKeeper, addisonConversation } from './lighthouse.js';
import { AMBRON } from './region-world.js';
import { BOSCO, BOSCO_HAUNTS, BOSCO_TAKES, BOSCO_WALK_START, BOSCO_WALK_END, createBosco, boscoConversation } from './bosco.js';
import { SUBTRACTIDAUGHTER, SUBTRACTIDAUGHTER_STAND, ELOD_LIGHT, LANDING, LENS_ITEM, SISTER_TOLD, SISTER_WHY,
  CROSSING_PLAN, RIVAL_WATCHES, RIVAL_UNSEEN, HEIST_ENDINGS, createHeist, rivalConversation } from './rival-light.js';
import { createBosco as createBoscoModel } from './bosco-model.js';
import { createBatman } from './batman-model.js';
import { TROY, TROY_STAND, HONEYCOMB, createBeekeeper, troyConversation } from './beekeeper.js';
import { REFUGEES, REFUGEE_IDS, REFUGEE_STANDS, REFUGEE_START, createRefugees, refugeeConversation } from './refugees.js';
import { createMapFog } from './map-fog.js';
import { isOpenCountry } from './regions.js';
import { CARTOGRAPHY_SKILL, CARTOGRAPHY_DIRECTIONS, createCartography, chartShapes } from './cartography.js';
import { regionLevel, levelWords } from './region-levels.js';
import { buildStatusList } from './build-status.js';
import { newestStart, storyStart, startingSpot } from './story-starts.js';
import { chapterProgress, chapterLabel, chapterTitle, chapterGoal, chapterCount, atSideSeat, sideSeat } from './story-chapters.js';
import { createCampaign } from './campaign.js';
import { clearLine, createAutopilot } from './autopilot.js';
import { HEX_WORLD_TRANSFORM, compassHeading } from './region-layout.js';
import { insideRegion } from './regions.js';
import { runAutoplaySmoke } from './autoplay-smoke.js';
import { describeRegion, computeAdjacency, FACTIONS } from './campaign-world.js';
import { runRoadSmoke, runRoadTestingSmoke } from './road-smoke.js';
import { runRoadTraversal } from './road-traversal.js';
import { runRoadCheckSmoke, verifyRoadReload } from './road-check-smoke.js';
import { createRoadLife } from './road-life.js';
import { createWestLife } from './west-regions-life.js';
import { VASTOS_RIVER, VASTOS_BRAID, VASTOS_PANS, VASTOS_BASINS, VASTOS_SINTER,
  MENETH_RIDGES, MENETH_BECKS, menethTroughZ, LIZEEM, CARICA, ELA_SOUTH_REACH } from './west-regions.js';
import { createRoadVerges } from './road-verges.js';
import { createRoadAudio as createAudio } from './road-audio.js';
import { createDeveloperMode } from './developer-mode.js';
import { runDeveloperSmoke } from './developer-smoke.js';
import { moveCharacter, canStand, canSwim, WATERLINE, advanceQuest, questSteps, getMovementInput } from './game-state.js';
import { SWIMMING_SKILL, SWIM, SWIMMING_LESSON, createSwimming, swimStep, swimSpeed } from './swimming.js';
import { BODY, bodyWorld, stepAround, lendFacing } from './bodies.js';
import { talkTarget, placeKeepsPrompt } from './prompt-priority.js';

const $ = id => document.getElementById(id);
const show = (id, visible) => $(id).classList.toggle('hidden', !visible);
let mode = 'opening', questStage = 0;
const keys = new Set(), discoveries = new Set();
let world, renderer, player, scene, camera;
try { init(); } catch(error) { fail(error); }
function fail(error) {
  console.error(error); show('loading',false); show('fatal',true); $('fatal').dataset.stack = String(error?.stack ?? error);
  $('fatal-message').textContent = 'Please close and reopen the game. ' + error.message;
}
function init() {
  const canvas = $('world');
  renderer = new THREE.WebGLRenderer({canvas, antialias:true, powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.7)); renderer.setSize(innerWidth,innerHeight);
  renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.22;
  scene=new THREE.Scene(); scene.background=new THREE.Color(0xaacfd3); scene.fog=new THREE.FogExp2(0xb3d3d0,.0062);
  camera=new THREE.PerspectiveCamera(54,innerWidth/innerHeight,.1,650);
  scene.add(new THREE.HemisphereLight(0xd8efff,0x63783d,2));
  const sun=new THREE.DirectionalLight(0xffe2a8,3.1);sun.position.set(-45,90,38);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-65,right:65,top:65,bottom:-65,near:1,far:210});
  sun.shadow.normalBias=.045;sun.shadow.bias=-.00025;sun.shadow.camera.updateProjectionMatrix();scene.add(sun,sun.target);
  const clouds=createSky(scene);
  const testingQuery=new URLSearchParams(location.search);
  world=createWorld(scene,{spatialBatches:!(testingQuery.has('test')&&testingQuery.get('spatial')==='0')});
  // You may be any of the eleven, so the body has to be replaceable. The rig around it is not:
  // combat and everything else took hold of this one position object at boot and keeps holding it.
  let playerId=DEFAULT_PLAYER,playerBody=null;
  const playerRig=new THREE.Group();playerRig.name='player';
  player={group:playerRig,animate:(...a)=>playerBody.animate(...a),setArmed:(...a)=>playerBody.setArmed(...a),
    setWeapon:(...a)=>playerBody.setWeapon(...a),setFishing:(...a)=>playerBody.setFishing(...a),fishingTip:(...a)=>playerBody.fishingTip(...a)};
  function wearPlayerLook(id){
    const look=playerLook(id);
    if(playerBody)playerRig.remove(playerBody.group);
    // Cromb has no roster look and gets none: his model is the traveler's, exactly as it was.
    playerBody=createCharacter(look?{role:'traveler',tunic:look.tunic,skin:look.skin,look}:{});
    playerRig.add(playerBody.group);
  }
  wearPlayerLook(playerId);scene.add(player.group);
  player.group.position.set(world.boatStart.x,world.boatStart.y,world.boatStart.z);player.group.rotation.y=Math.PI;
  // The title screen is the harbour as it stands: no traveler in it, and the arrival boat is
  // already out in the roads where the sequence begins, so Step ashore cuts straight to the bow.
  player.group.visible=false;
  {const s=stateAt(0);world.placeArrivalBoat(s.boat.x,s.boat.z,s.boat.yaw);}
  // The harbourmaster holds the landing and the paperwork, and is the first person the traveler speaks to.
  const HARBOURMASTER='harbormaster';
  const npcData=[{id:'fisher',name:'Tobin',role:'Fisher',color:0xb97b50},{id:HARBOURMASTER,name:'Mara',role:'Harbourmaster of Tidehaven',modelRole:'harbormaster',color:0x2f5a63,skin:0xc39a72,look:{beard:false}},{id:'warden',name:'Eren',role:'Waykeeper of the Greenway Watch',modelRole:'legion-soldier',color:0x8f3b30},{id:'acorn-cook',name:'Lysa',role:'Village cook',color:0x9c774b},{id:'doomsayer',name:'Orris',role:'Doomsayer',color:0x49434b},{id:'pond-fisher',name:'Bran',role:'Pond fisherman',color:0x7c8f73}];
  npcData.push(...JOURNEY_NPCS);
  npcData.push(...LUSCIA_NPCS.map(npc=>({...npc})),...TOWN_NPCS.map(npc=>({...npc})),{...BEGGAR_NPC});
  const journeyNpcIds=new Set(JOURNEY_NPCS.map(npc=>npc.id));
  // Rimeholt's people, in Pueth.
  npcData.push(...PUETH_NPCS.map(npc=>({...npc})));
  // Ostel's people, in Amod, and the ogre who holds the road in from Pueth.
  npcData.push(...AMOD_NPCS.map(npc=>({...npc})));
  world.npcPositions[OGRE_NPC.id]={x:OGRE_STAND.x,z:OGRE_STAND.z};npcData.push({...OGRE_NPC});
  // Cobble's people and the Empire's four men on its quay, in Peblos.
  npcData.push(...PEBLOS_NPCS.map(npc=>({...npc})));
  // Elod's people, the frontier guard behind its shut gate, and the keepers of the outlying places, in East Suval.
  npcData.push(...EAST_SUVAL_PEOPLE.map(npc=>({...npc})));
  // Ambron's people and the lake country's, in Elagos (src/ambron-people.js).
  npcData.push(...ELAGOS_NPCS.map(npc=>({...npc})));
  // Corran Sell, who rowed the traveler ashore in the opening and rows them out to the Pebbles for a fee (src/ferry.js).
  world.npcPositions[FERRY_NPC.id]={x:FERRY_LANDINGS.drent.stand.x,z:FERRY_LANDINGS.drent.stand.z};npcData.push({...FERRY_NPC,yaw:FERRY_LANDINGS.drent.stand.yaw});
  // The Tessen road post's garrison: they stand at the post, and march and fight beside the traveler on the goblin camp.
  npcData.push(...HIDEOUT_GARRISON.map(npc=>({...npc,armed:true})));
  const garrisonIds=new Set(HIDEOUT_GARRISON.map(npc=>npc.id));
  // The envoy's party waits at Solis, and the line commanders and marching columns come out, only while the story needs them.
  for(const person of BORDER_NPCS){world.npcPositions[person.id]={x:person.x,z:person.z};npcData.push({...person,hidden:true});}
  const borderNpcIds=new Set(BORDER_NPCS.map(person=>person.id));
  // West Suval: Solis's people, both garrisons and the camp's captains; the march to the border (src/west-suval-host.js).
  const westSuval=createWestSuvalHost({world,npcData});
  // Izolveth, its harbour people, the three generals' men and the camp above the town (src/izol-host.js).
  const izol=createIzolHost({world,npcData});
  // The day after the battle: a commander, and whoever sends the traveler on, appear where that day's work is.
  for(const person of AFTERMATH_NPCS){world.npcPositions[person.id]={x:AFTERMATH_SITES['camp-gate'].x,z:AFTERMATH_SITES['camp-gate'].z};npcData.push({...person,hidden:true,site:null});}
  const aftermathNpcIds=new Set(AFTERMATH_NPCS.map(person=>person.id));
  // The ostler of Lumber Town hands over the army's horse and teaches riding.
  world.npcPositions[OSTLER_NPC.id]={x:LUMBER_TOWN_STABLE.stand.x,z:LUMBER_TOWN_STABLE.stand.z};npcData.push({...OSTLER_NPC,yaw:LUMBER_TOWN_STABLE.stand.yaw});
  npcData.push({...FOREST_STORY_NPC});
  npcData.push(...REGIONAL_LIFE_NPCS.map(npc=>({...npc})));
  // The mercenary company walks the main road on its own clock; each man is an NPC whose home moves.
  // Eleven possible hired swords for ten places: whichever of them you are is not on the road,
  // and Cromb stands in the place you left (companyFor). A default game is the ten it always was.
  const mercenaryIds=new Set([...MERCENARY_ROSTER.map(m=>m.id),CROMB.id]);
  const companyPlan={road:world.paths[0],stops:[{id:'induction',point:world.npcPositions['meadow-courier'],dwell:90},{id:'crossing',point:world.npcPositions['crossing-keeper'],dwell:60},{id:'relay',point:world.npcPositions['relay-clerk'],dwell:120}].filter(stop=>stop.point),muster:ROUTE_ANCHORS.legionCamp,landing:world.spawn,shore:WORD_BEACH};
  let roster=companyFor(playerId),company=createMercenaryCompany({...companyPlan,roster});
  // Whoever stands first in the line came off your boat and carries the letter.
  const landingMateId=()=>roster[0].id;
  // A friendly dog sniffs about the green, comes to see who has landed, and eats what it is given.
  const villageDog=createVillageDog();
  world.npcPositions[VILLAGE_DOG.id]={x:VILLAGE_DOG.haunts[0].x,z:VILLAGE_DOG.haunts[0].z};
  npcData.push({id:VILLAGE_DOG.id,name:VILLAGE_DOG.name,role:VILLAGE_DOG.role,dog:true});
  // The harbour cat naps in the sun, prowls its places, and comes to the traveler only on its own terms.
  // Who has died in a raid, and who has already been caught in one (src/bystanders.js).
  const fallen=createFallen(),raidSeen=new Set(),raid={ids:[],fell:false,outcome:[]};
  // Seconds the refugees have stood waiting for a fight ahead of them to end. It is subtracted
  // from playSeconds, so it belongs to the same game as playSeconds does and is reset with it:
  // carried into a new game it makes their clock negative, and a negative clock is refused.
  let refugeeHold=0;
  // A cat hops the crates and the rails: it plans and walks by everything but the props (catWorld, below).
  const villageCat=createVillageCat({clear:(from,to)=>clearLine(from,to,catWorld,.25)});
  world.npcPositions[VILLAGE_CAT.id]={x:VILLAGE_CAT.spots[0].x,z:VILLAGE_CAT.spots[0].z};
  npcData.push({id:VILLAGE_CAT.id,name:VILLAGE_CAT.name,role:VILLAGE_CAT.role,cat:true});
  // Wendel the peddler sells staples for copper on Tidehaven's green and explains the coin.
  world.npcPositions[PEDDLER.id]={x:PEDDLER.stand.x,z:PEDDLER.stand.z};
  npcData.push({id:PEDDLER.id,name:PEDDLER.name,role:PEDDLER.role,modelRole:PEDDLER.modelRole,color:PEDDLER.color,yaw:PEDDLER.yaw});
  // Perrin keeps the bird garden on the eastern side of Tidehaven and teaches the traveler to look (src/birding.js).
  // Mara the harbourmaster meets the traveler off the boat and hands over the letter.
  // Lakota is at home in his bird garden from the first minute, and stays there.
  const lakotaGarden={x:world.birdGarden.stand.x,z:world.birdGarden.stand.z,yaw:world.birdGarden.stand.yaw},pierHead={x:world.pierHead.x,z:world.pierHead.z,yaw:-Math.PI/2};
  world.npcPositions[HARBOURMASTER]={x:pierHead.x,z:pierHead.z};
  npcData.find(person=>person.id===HARBOURMASTER).yaw=pierHead.yaw;
  world.npcPositions[GARDEN_KEEPER.id]={x:lakotaGarden.x,z:lakotaGarden.z};npcData.push({...GARDEN_KEEPER,yaw:lakotaGarden.yaw});
  // Paradise Springs, Lakota's old winery in the north-east of West Suval (src/winery.js): Livia pours, Nico keeps the barrels.
  for(const person of [VINTNER,CELLAR_HAND,WINEMAKER]){const stand=WINERY_STANDS[person.id];world.npcPositions[person.id]={x:stand.x,z:stand.z};npcData.push({...person,yaw:stand.yaw});}
  // Katy by the spring pool, watching the birds and waiting for Batman (src/katy.js).
  world.npcPositions[KATY.id]={x:KATY_STAND.x,z:KATY_STAND.z};npcData.push({...KATY,yaw:KATY_STAND.yaw});
  // Imani out in the rows, in the aisle between the Cabernet Franc and the Merlot (src/vineyard.js).
  world.npcPositions[IMANI.id]={x:IMANI_STAND.x,z:IMANI_STAND.z};npcData.push({...IMANI,yaw:IMANI_STAND.yaw});
  // Addison at the Suval Light on the West Suval head south of the winery lane (src/lighthouse.js).
  world.npcPositions[ADDISON.id]={x:ADDISON_STAND.x,z:ADDISON_STAND.z};npcData.push({...ADDISON,yaw:ADDISON_STAND.yaw});
  // Her twin at the door of the Elod Light, across the water in a country that is shut (src/rival-light.js).
  world.npcPositions[SUBTRACTIDAUGHTER.id]={x:SUBTRACTIDAUGHTER_STAND.x,z:SUBTRACTIDAUGHTER_STAND.z};
  npcData.push({...SUBTRACTIDAUGHTER,yaw:SUBTRACTIDAUGHTER_STAND.yaw});
  // Troy at the Bee Fold in Drent's wood, with the skeps behind him (src/beekeeper.js).
  world.npcPositions[TROY.id]={x:TROY_STAND.x,z:TROY_STAND.z};npcData.push({...TROY,yaw:TROY_STAND.yaw});
  // Tharganhom, the Wine Attic in Solis: Juan at the stair head, Nika with her book (src/wine-attic.js).
  for(const person of ATTIC_PEOPLE){const stand=ATTIC_STANDS[person.id];world.npcPositions[person.id]={x:stand.x,z:stand.z};npcData.push({...person,yaw:stand.yaw});}
  // Tancredi Vel, at the door of the Prime Minister's offices in Solis (src/wine-goblin.js).
  world.npcPositions[SECRETARY.id]={x:SECRETARY_STAND.x,z:SECRETARY_STAND.z};npcData.push({...SECRETARY,yaw:SECRETARY_STAND.yaw});
  // The valley burying its dead on the field at the Lauvel (src/lauvel-aftermath.js): two bearers, a gravedigger, and the mourners.
  for(const p of LAUVEL_PEOPLE){world.npcPositions[p.id]={x:p.x,z:p.z};npcData.push({id:p.id,name:p.name,role:p.role,modelRole:p.modelRole,color:p.color,yaw:p.yaw,posture:p.posture,bearer:p.bearer,
    make:p.digs?()=>createGravedigger({tunic:p.color}):undefined});}
  // Bowden Koop, King of the Koopwood, who teaches woodcutting in his lot north-west of the village (src/woodcutting.js).
  world.npcPositions[BOWDEN.id]={x:BOWDEN_STAND.x,z:BOWDEN_STAND.z};npcData.push({...BOWDEN,yaw:BOWDEN_STAND.yaw,make:createBowden});
  // Brandy Frank, Tidehaven's dyer, in her yard on the lane up to Saltwind Lookout (src/brandy.js).
  world.npcPositions[BRANDY.id]={x:BRANDY_STAND.x,z:BRANDY_STAND.z};npcData.push({...BRANDY,yaw:BRANDY_STAND.yaw});
  // Talaelos, the players of Nylon (src/troupe.js): they camp in one region after another, and their homes move with the wagon.
  // John, the Sultan of the Salt Trade (src/salt-sultan.js): ashore on the quay of whichever port the Sultana lies in, and nowhere while she is at sea.
  const salt=createSaltSultan();
  {const s=salt.port.stand;world.npcPositions[JOHN.id]={x:s.x,z:s.z};npcData.push({...JOHN,yaw:s.yaw,hidden:!salt.ashore,make:createJohn});}
  const troupe=createTroupe();
  {const homes=troupe.homes();for(const p of TROUPE_PEOPLE){const h=homes[p.id];world.npcPositions[p.id]={x:h.x,z:h.z};
    npcData.push({id:p.id,name:p.name,role:p.role,yaw:h.yaw,troupe:true,dog:p.model==='understudy',horse:p.model==='critic',greet:p.model==='critic'?'Greet the mare':undefined,
      make:()=>p.model==='understudy'?createUnderstudy():p.model==='critic'?createCritic():createPlayer(p.model)});}}
  // Odger Pell dries mushrooms at the edge of the Greenway, a few steps outside the village (src/mycology.js).
  world.npcPositions[MYCOLOGIST.id]={x:-50,z:25};npcData.push({...MYCOLOGIST,yaw:Math.PI*.42});
  // Nell Harrow's drying shed on the western outskirts, Toft on his barrel in the
  // village, and Cabe out on the Weatherhead south of the landing (src/pipeweed.js).
  world.npcPositions[BOTANIST.id]={x:BOTANIST_STAND.x,z:BOTANIST_STAND.z};npcData.push({...BOTANIST,yaw:BOTANIST_STAND.yaw});
  world.npcPositions[TOFT.id]={x:TOFT_STAND.x,z:TOFT_STAND.z};npcData.push({...TOFT,yaw:TOFT_STAND.yaw});
  world.npcPositions[PIPE_SMOKER.id]={x:WEATHERHEAD.stand.x,z:WEATHERHEAD.stand.z};npcData.push({...PIPE_SMOKER,yaw:Math.PI*.55});
  world.npcPositions[GEOLOGIST.id]={x:GEOLOGIST_STAND.x,z:GEOLOGIST_STAND.z};npcData.push({...GEOLOGIST,yaw:GEOLOGIST_STAND.yaw});
  // The three off the Lauvel road (src/refugees.js): they start where the battle
  // was and walk the main road east while the game is played, so where they are
  // when the traveler meets them depends entirely on what the traveler did first.
  const refugeeRoute=world.paths[0].slice(0,REFUGEE_START+1).reverse().map(point=>({x:point.x,z:point.z}));
  const refugees=createRefugees({route:refugeeRoute,stands:REFUGEE_STANDS,onEvent:event=>{if(event.type==='refugees-arrived')toast('Three people off the Lauvel road have reached the landing. They are telling the village what they saw.','WORD FROM THE WEST');}});
  for(const person of REFUGEES){const start=refugees.positions().find(entry=>entry.id===person.id);world.npcPositions[person.id]={x:start.x,z:start.z};npcData.push({...person,yaw:start.yaw});}
  // The army's posts along the road: soldiers who stand watch and have a word for a hired sword.
  for(const entry of LEGION_POSTS){world.npcPositions[entry.id]={x:entry.x,z:entry.z};npcData.push({id:entry.id,name:entry.name,role:entry.role,modelRole:entry.modelRole,color:entry.rank==='officer'?0x832d2b:0x8f3b30,yaw:entry.yaw});}
  // The people of the built-up places (town-life.js): townsfolk, the outpost's garrisons, Elod's frontier guard.
  for(const entry of TOWN_LIFE_NPCS){world.npcPositions[entry.id]={x:entry.x,z:entry.z};npcData.push({...entry});}
  npcData.push(...RENA_NPCS.map(npc=>({...npc})));   // Lorn, Hesta, Applegarth's people and three more in Drent (src/rena-people.js)
  let playSeconds=0;
  const mercenaryWeapons=new Map();
  const mercenaryHeld=npc=>mercenaryWeapons.get(npc.id)??{id:KIT_WEAPON_ITEM[mercenaryWeapon(npc.id)?.weapon]??null,durability:null};
  // Lakota is drawn as himself, hawk and all; the other nine wear the company's kit.
  const mercNpc=(merc,placement)=>({id:merc.id,name:merc.name,role:`Hired sword from ${merc.origin}`,modelRole:merc.modelRole??'mercenary',color:merc.look.tunic,skin:merc.look.skin,look:{...merc.look,weapon:merc.weapon,trades:merc.trades},hidden:placement.phase==='coming',placement});
  for(const [i,placement] of company.placements(0).entries()){const merc=roster[i];world.npcPositions[merc.id]={x:placement.x,z:placement.z};npcData.push(mercNpc(merc,placement));}
  for(const npc of npcData) {
    npc.actor=npc.make?npc.make():npc.ogre?createOgre():npc.dog?createDog({variant:0}):npc.cat?createCat({variant:0}):createCharacter({tunic:npc.color,role:npc.modelRole||npc.id,skin:npc.skin,look:npc.look,armed:!!npc.armed});const p=world.npcPositions[npc.id];if(npc.hidden)npc.actor.group.visible=false;
    npc.actor.group.position.set(p.x,world.heightAt(p.x,p.z),p.z);scene.add(npc.actor.group);
    npc.actor.group.rotation.y=Number.isFinite(npc.yaw)?npc.yaw:Math.PI/3;npc.markerKind='main';npc.marker=makeQuestMarker('main');scene.add(npc.marker);
  }
  const npcById=new Map(npcData.map(npc=>[npc.id,npc]));
  // Lakota's red-tailed hawk rides his glove and now and then goes up to circle the green (src/hawk-flight.js).
  const redTail=createRedTailHawk(),redTailFlight=createHawkFlight(),gloveAt=new THREE.Vector3();scene.add(redTail.group);
  // Everyone placed by now stands on open ground, and so does every place the traveler is sent.
  world.keepPropsClear([...Object.values(world.npcPositions),lakotaGarden,pierHead,...SALT_PORTS.map(p=>p.stand),...FOREST_STORY_SITES,...REGIONAL_LIFE_SITES,...Object.values(LUSCIA_SITES),...Object.values(MOROS_SITES)]);
  const wallWatch=createWallWatch({scene,createCharacter,heightAt:world.heightAt}),borderWatch=createBorderWatch();
  const garrisonHome=Object.fromEntries(HIDEOUT_GARRISON.map(g=>[g.id,{...world.npcPositions[g.id]}]));
  function placeMercenaries(){for(const placement of company.placements(playSeconds)){const npc=npcById.get(placement.id);if(!npc)continue;world.npcPositions[placement.id]={x:placement.x,z:placement.z};npc.hidden=placement.phase==='coming';npc.placement=placement;if(!npc.hidden)npc.actor.group.visible=Math.hypot(placement.x-player.group.position.x,placement.z-player.group.position.z)<170;}}
  function settleMercenaries(){placeMercenaries();for(const npc of npcData)if(mercenaryIds.has(npc.id)){const p=world.npcPositions[npc.id];npc.actor.group.position.set(p.x,world.heightAt(p.x,p.z),p.z);npc.actor.group.rotation.y=npc.placement?.yaw??0;}}
  /**
   * Become one of the eleven. Exactly one man on the road changes: the one whose place you
   * have taken walks out of the world, and Cromb walks into the slot he left with his own
   * model, his own hour and his own lines. Everything else about the company is untouched.
   */
  function setPlayerCharacter(id){
    const chosen=savedPlayerCharacter(id);
    if(chosen===playerId&&playerBody)return chosen;
    const before=roster;
    playerId=chosen;roster=companyFor(playerId);company=createMercenaryCompany({...companyPlan,roster});
    for(const [i,merc] of roster.entries()){
      if(merc.id===before[i].id)continue;
      const npc=npcById.get(before[i].id);if(!npc)continue;
      scene.remove(npc.actor.group);npcById.delete(npc.id);mercenaryWeapons.delete(npc.id);
      const placement=company.placements(playSeconds)[i];
      Object.assign(npc,mercNpc(merc,placement));world.npcPositions[merc.id]={x:placement.x,z:placement.z};
      npc.actor=createCharacter({tunic:npc.color,role:'mercenary',skin:npc.skin,look:npc.look});
      npc.shadows=undefined;npc.escorting=false;npc.pace=undefined;scene.add(npc.actor.group);npcById.set(npc.id,npc);
    }
    wearPlayerLook(playerId);settleMercenaries();
    characterSelect.select(playerId,{announce:false});
    return chosen;
  }
  /**
   * What you step ashore with: the weapon your fighting style uses, and whatever the life you
   * had before this road already taught you (src/player-characters.js). Cromb has neither, so a
   * default game begins with the sword and an empty skills sheet, exactly as it always has.
   */
  function grantStartingKit(){
    for(const item of startingInventory(playerId)){
      if(!inventory.has(item.id))inventory.grant(item.id);
      if(WEAPON_TYPES[item.id])weapons.setCondition(item.id,WEAPON_TYPES[item.id].maxDurability);
    }
    const chosen=playableCharacter(playerId);
    if(chosen?.weapon&&inventory.has(chosen.weapon))weapons.equip(chosen.weapon);
    // Restored rather than learned: a life lived before the game began does not put level-up
    // banners on the screen. An id this build's skills module does not know is simply not known.
    const known=Object.fromEntries(Object.entries(startingSkills(playerId)).filter(([id])=>SKILL_IDS.includes(id)).map(([id,xp])=>[id,{xp}]));
    if(Object.keys(known).length)skills.restore({version:SKILLS_VERSION,skills:known});
    // And the tongues he already had. Chris Gotwood interprets for the company, so when he is the
    // player the Ambroni is his own from the first step and nobody has to lean in and repeat it.
    for(const [id,proficiency] of Object.entries(startingLanguages(playerId)))linguist.speakAlready(id,proficiency);
    inventory.refresh();refreshSkillsSheet();updateHUD();
  }
  const objectiveMarker=makeQuestMarker();scene.add(objectiveMarker);
  const trailMarker=makeQuestMarker();trailMarker.scale.setScalar(.7);trailMarker.visible=false;scene.add(trailMarker);
  trailMarker.traverse(object=>{if(object.isMesh){object.material=object.material.clone();object.material.color.set(0x8acfc2);object.material.emissive.set(0x437d76);}});
  const combatEvents=[];
  let weapons,consumables;
  const combat=createCombat({world,position:player.group.position,onEvent:e=>combatEvents.push(e),getWeapon:()=>weapons?.profile(),onWeaponContact:id=>{weapons.contact(id);inventory.refresh();}});
  const combatView=createCombatView(scene,world,camera);
  let practiceHits=0,practiceDodges=0,reviewFrozen=false,reviewTarget=null,reviewCat=null,reviewLineup=null;
  let yaw=0,pitch=.39,distance=9,targetDistance=9,verticalSpeed=0,grounded=true,walkTime=0,elapsed=0,lastTime=performance.now(),currentNPC=null,toastTimer,openingTime=0,openingFired=0,openingBells=0,opening=null,mateSaidGoodbye=false;
  /** Where the sequence wants the eye this frame, before the ordinary camera's lerp is bypassed. */
  const openingCamera={position:new THREE.Vector3(),target:new THREE.Vector3()};
  let drag=false,pointerX=0,pointerY=0,fullQuality=true,activeDialogue=null,audio=null,lastModalFocus=null;
  const cameraFocus=new THREE.Vector3(),cameraTarget=new THREE.Vector3(),cameraColliders=[];
  camera.position.set(16,14,59);camera.lookAt(0,3,13);
  let mapClock=0,frameCount=0,shake=0,combatClock=0,combatCamera=0;
  const frameDeltas=[],map=$('minimap').getContext('2d');
  const inventory=createInventory({
    getWeaponStatus:id=>weapons?.status(id)?{...weapons.status(id),equipBlocked:combat.state.player.action!=='idle'}:null,
    onEquip(id){if(combat.state.player.action!=='idle')return false;return weapons.equip(id);},
    getConsumableStatus(id){
      // Pipe weed is not food, so consumables knows nothing about it: it uses the
      // same panel with its own verb, and wants Cabe's lesson and a pipe in hand.
      if(id!==LEAF_ITEM)return consumables?.status(id);
      const player=combat.state.player,status={owned:inventory.has(LEAF_ITEM),canUse:false,healing:PIPE_HEAL,health:player.hp,maxHealth:player.maxHp,reason:''};
      if(!status.owned)status.reason='You have no pipe weed. The barns on the Avrel ground cure what the fields grow.';
      else if(!pipe.taught)status.reason='You have the leaf and no idea what to do with it. Somebody sits out on the Weatherhead who does.';
      else if(!inventory.has(PIPE_ITEM))status.reason='No pipe. Cabe Tolliver had a spare.';
      else if(combat.state.phase==='defeated'||player.action!=='idle')status.reason='Not in the middle of this. Sit down somewhere first.';
      else status.canUse=true;
      return status;
    },
    onConsume:id=>id===LEAF_ITEM?smokePipe():consumables.consume(id),
    onInspect(id){
      if(mode==='inventory'&&id==='harbor-letter'&&inventory.has('harbor-letter')&&inventory.has('road-token')){
        updateQuest('inspect-letter');
        if(questStage===7)$('inventory-hint').textContent='Message inspected. Press I or Esc, or choose Close satchel, to return to the road.';
      }
    },
    onClose(){
      if(mode!=='inventory')return;
      mode='playing';stopInput();updateQuest('close-inventory');$('inventory-button').setAttribute('aria-expanded','false');canvas.focus();
    }
  });
  inventory.grant('simple-sword');
  inventory.add(COPPER_ITEM,STARTING_PURSE);
  weapons=createWeapons({inventory,onEvent(event){
    if(event.type==='weapon-worn')toast(`${event.name} is wearing thin. Repair it at the nearest repair bench.`,`${event.durability} HITS LEFT · I TO CHECK EQUIPMENT`);
    if(event.type==='weapon-broken')toast(event.id==='simple-sword'?'Your sword broke. Find a repair bench, or equip a stick.':event.remaining?'Your stick snapped. Another carried stick is ready.':'Your last stick snapped. Equip your sword or gather another.', 'WEAPON BROKEN');
  }});
  inventory.refresh();combat.setWeaponReady(true);
  consumables=createConsumables({inventory,combat,onEvent(event){
    toast(`Recovered ${event.healed} health.`, `${INVENTORY_ITEMS[event.id]?.useVerb==='Drink'?'DRANK':'ATE'} ${(INVENTORY_ITEMS[event.id]?.eatName??'food').toUpperCase()}`);audio?.effect('success');updateHUD();
    if(questStage>=1)saveRoad(false);
  }});
  const campEvents=[];
  const campcraft=createCampcraft({inventory,weapons,fireIds:world.firePits.map(f=>f.id),onEvent:event=>campEvents.push(event)});
  const worldMap=createWorldMap();
  // The chart is fogged: its hexes are charted as the traveler walks, and named ground is recorded (src/map-fog.js).
  const mapFog=createMapFog({onEvent:event=>{if(event.type!=='subregion-found')return;toast(event.name,`CHARTED · ${event.region.toUpperCase()}`);refreshChart();if(questStage>=1)saveRoad(false);}});
  let chartRevealed=false,fogClock=0;
  const woodlandLife=createWoodlandLife(scene,world);
  const woodlandSites=woodlandLife.state();
  const forestEcology=createForestEcology(scene,world,{exclusionSites:[...woodlandSites.acorns,...woodlandSites.sticks,...woodlandSites.fruits,...woodlandSites.fruitPatches,]});
  // Skills grow with practice; birding is the first. Drent's birds are drawn and moved by src/drent-birds.js.
  const skills=createSkills({onEvent:skillEvent});
  // Linguist: nobody in Azhora speaks the traveler's language, so what people say to
  // him arrives in theirs (src/languages.js, src/linguist.js). Chris Gotwood came off
  // the same boat with enough of the local speech to get two men up a road; while he is
  // beside you his interpretation runs under the line and every exposure counts double.
  const linguist=createLinguist({skills,onEvent:event=>{
    if(event.type!=='tongue-level')return;
    if(event.read)toast(`${LANGUAGES[event.language].name} lettering has stopped being shapes. You will see it on the road ahead.`,'YOU CAN READ THE SIGNS');
    else if(event.level>=MAX_PROFICIENCY)toast(`There is nothing anybody says in ${LANGUAGES[event.language].name} that you cannot follow.`,'A TONGUE OF YOUR OWN');
    else if(event.level%10===0)toast(`${LANGUAGES[event.language].name} \u00b7 ${event.level}`,'A TONGUE IS COMING TO YOU');}});
  // A testing session is fluent in everything: the smoke tests read what people say to
  // check the content of it, and __AZHORA__.linguist.forget() puts the traveler back to
  // nothing when a review wants to look at the panel as a new player sees it.
  if(testingQuery.has('test'))linguist.fluent();
  // The road letters its signs in the country they stand in until the traveler can read it.
  setSignReader(id => linguist.canRead(id));
  // Every name anybody in this world is called, so a name stays a name in every tongue.
  let namedCount=-1,spokenNames=new Set();
  function knownNames(){
    if(namedCount===npcData.length)return spokenNames;
    namedCount=npcData.length;spokenNames=new Set();
    for(const person of npcData)for(const part of String(person.name??'').split(/[^A-Za-z\u2019']+/))
      if(part.length>2)spokenNames.add(part.toLowerCase().replace(/\u2019/g,"'"));
    return spokenNames;
  }
  // The chart of countries: what is dark, what is a shape against the sea, what has been walked
  // (src/cartography.js, docs/cartography.md). The fog is the hexes; this is the countries over them.
  const cartography=createCartography({skills,onEvent:event=>{
    if(event.type!=='chart-changed'||!event.xp)return;
    const words=event.state==='explored'?`${event.region} is yours now, end to end.`
      :event.state==='charted'?`${event.region} has a shape on your chart.`
      :`${event.region}, and roughly which way.`;
    toast(`Cartography +${event.xp}${event.levelled?` · level ${event.level}`:''}. ${words}`,'YOUR OWN CHART');
    refreshSkillsSheet();
  }});
  const wood=createWoodcutting({skills}),building=createConstruction({skills});
  // Swimming: walking on water at a fraction of walking speed while the wind runs down, and
  // drowning when it is gone (src/swimming.js, docs/swimming.md).
  const swimming=createSwimming({skills,onEvent:event=>{
    if(event.type==='water-crossed')toast(`Swimming +${event.xp}${event.levelled?` · level ${event.level}`:''}. Across, and out the other side.`,'A CROSSING OF YOUR OWN');
    if(event.type==='peblos-swum')toast(`Swimming +${event.xp}${event.levelled?` · level ${event.level}`:''}. You swam to the Pebbles. Most people take a boat.`,'THE PEBBLES, THE HARD WAY');
    refreshSkillsSheet();
  }});
  // Where the water has him, how far he has come through it, and whether he is out of wind.
  let inWater=false,drowning=false,swimMetres=0,swimFrom=null;
  // The last ground he stood on before the water took him, and whether the water is what beat
  // him. Drowning puts him back here, whole, rather than into some fight's checkpoint.
  let lastDry=null,drownedDefeat=false;
  // Ed the Word's ship, built the first time anybody is near enough to see her, and the last
  // thing the village said about her (src/word-arrival.js).
  let rebelShip=null,wordSaid=null;
  const birding=createBirding({skills});
  // Whether the traveler has got far enough with Lakota for any of his own things to be offered (src/lakota.js).
  const lakota=createLakota();
  // Fishing: campcraft works the rod, this is what comes up on the line (src/fishing-skill.js).
  const fishing=createFishing({skills});
  // Mycology: Pell's three questions, and the mushrooms standing in Drent's woods (src/mushrooms.js).
  const mycology=createMycology({skills});
  // The Old Tree and the specimen trees go in first: their trunks are colliders, and
  // the mushrooms, plants and stones scattered after them must not grow inside one.
  const oldTree=createTalkingTree();
  const oldTreeView=buildTalkingTree(scene,world);world.colliders.push(oldTreeView.collider);
  const specimenTrees=createDrentTrees(scene,world,{avoid:Object.values(world.npcPositions)});world.colliders.push(...specimenTrees.colliders);
  let currentTree=null,nearOldTree=false;
  const mushrooms=createMushrooms(scene,world,{avoid:Object.values(world.npcPositions)});
  let currentMushroom=null;
  // Botany: Nell's four questions, Drent's plants and trees, the pipe and Toft's errand.
  const botany=createBotany({skills});
  const pipe=createPipe();
  const jimson=createJimson();
  const katy=createKaty();let katyVisits=0;
  const troy=createBeekeeper();let troyVisits=0;
  const vineyard=createVineyard({skills});let imaniVisits=0;let katVisits=0;
  // Batman on the limestone outcrop above the winery spring, thirty strides behind Katy, who has
  // spent a year watching the wrong half of the sky (src/batman.js). He is there once the traveler
  // is carrying the blue; before that there is nothing on the rock but rock.
  const hunt=createBatmanHunt();let batmanVisits=0,batmanFlare=0;
  const light=createLightKeeper();let addisonVisits=0;
  const heist=createHeist();let rivalVisits=0;
  // Bosco in Brandy's dye yard: plump, loud, and never entirely his own colour (src/bosco.js).
  const bosco=createBosco();let boscoVisits=0;
  const boscoModel=createBoscoModel({dye:bosco.dye.colour});scene.add(boscoModel.group);boscoModel.group.visible=false;
  const boscoNpc={id:BOSCO.id,name:BOSCO.name,role:BOSCO.role,actor:{group:boscoModel.group}};
  let boscoDye=bosco.dye.colour,boscoPose=null;
  const batman=createBatman();scene.add(batman.group);batman.group.visible=false;
  const batmanNpc={id:BATMAN.id,name:BATMAN.name,role:BATMAN.role,actor:{group:batman.group}};
  function placeBatman(){const y=world.heightAt(BATMAN_PERCH.x,BATMAN_PERCH.z)+BATMAN_PERCH.lift;
    batman.group.position.set(BATMAN_PERCH.x,y,BATMAN_PERCH.z);batman.group.rotation.y=BATMAN_PERCH.yaw;}
  placeBatman();
  const flora=createDrentFlora(scene,world,{avoid:Object.values(world.npcPositions)});
  let currentPlant=null,jimsonClock=0;
  // Geology: Silas Garrow's lesson, and the stones of Drent's coast (src/drent-stones.js).
  const geology=createGeology({skills});
  const stones=createDrentStones(scene,world,{avoid:Object.values(world.npcPositions)});
  let currentStone=null;
  // Archaeology and wine, both taught by Lakota (src/archaeology.js, src/wine.js): his pegs at Rena, and Paradise Springs.
  const archaeology=createArchaeology({skills}),wine=createWine({skills}),cooking=createCooking({skills}),wineAttic=createWineAttic(),puck=createPuck(),digs=createRenaDigs(scene,world);let currentDig=null,currentVine=null;
  // The painted plate at the head of each block of vines at the winery: F reads the vines themselves.
  const vinePlateNear=p=>WINERY_LAYOUT.plates.find(plate=>Math.hypot(plate.x-p.x,plate.z-p.z)<2)??null;
  function readVines(){if(!currentVine)return;const variety=VARIETIES[currentVine.variety];toast(`${variety.vine}${wine.met?` Livia pours its wine at the cabin.`:''}`,`${variety.name.toUpperCase()} \u00b7 ${variety.colour.toUpperCase()} GRAPES`);}
  function readDig(){
    if(!currentDig)return;
    const found=archaeology.find(currentDig.id);
    if(!found.ok){toast(found.reason,'A PEG AT RENA');return;}
    digs.mark(id=>archaeology.hasFound(id));currentDig=null;refreshSkillsSheet();audio?.effect('success');
    if(found.first)showSkillCard({kicker:`FIRST FIND \u00b7 ARCHAEOLOGY +${found.xp}${found.levelled?` \u00b7 LEVEL ${found.level}`:''}`,name:found.entry.name,note:found.entry.note,skill:ARCHAEOLOGY_SKILL});
    else toast(`${found.entry.name} \u00b7 already written up, and left where it lies.`,'ARCHAEOLOGY');
    if(found.first&&found.ready&&archaeology.foundCount()===RENA_NEEDED)toast(`${RENA_NEEDED} finds written up. Take your notes back to Lakota in Tidehaven.`,'THE RUINS OF RENA');
    saveRoad(false);
  }
  const wineContext=()=>({wine,openDialogue,closeDialogue,act:wineAct});
  // Ed, the wine chameleon of Solis: a figure of his own, out of the villagers' walking loop, because he never walks anywhere.
  const puckView=createPuckView(scene,{heightAt:(x,z)=>world.heightAt(x,z)});
  const puckNpc={id:PUCK.id,name:PUCK.name,role:PUCK.role,actor:{group:puckView.group}},puckLast={x:0,z:0};
  let puckFacing=0,puckLent;
  function placePuck(){const h=puck.haunt;puckView.place(h,h.perch?4.33:0);puckFacing=puckView.group.rotation.y;puckLent=undefined;}
  placePuck();
  const PUCK_GONE={chased:'Puck is gone in a puff of purple smoke and a smell of spilt wine. You will have to come up quieter than that.',
    'swung-at':'Puck is gone before the blade is. A puff of purple smoke, and somewhere across the city, a hiccup.',
    grabbed:'Your hands close on purple smoke. From somewhere across the city comes a hiccup, and a laugh.'};
  function puckEvent(event){
    if(event.type==='poof'){const seen=puckView.group.visible&&puckView.group.position.distanceTo(player.group.position)<40;if(seen)puckView.puff();placePuck();
      if(PUCK_GONE[event.reason])toast(PUCK_GONE[event.reason],'PUCK');else if(seen)toast(`Puck goes up in a puff of purple smoke. He will be at ${event.to.name} by now.`,'PUCK');return;}
    if(event.type==='sober-sign'){toast(event.line,event.title);audio?.effect('discovery');saveRoad(false);}
  }
  const puckContext=()=>({puck,salt,inventory,openDialogue,closeDialogue,act:puckAct});
  function puckAct(action){
    const secretary=npcById.get(SECRETARY.id);
    if(action==='puck-meet'){puck.meet();toast('Puck, the wine goblin of Solis. Everybody hates him. Nobody has ever caught him.','PUCK');saveRoad(false);return;}
    if(action==='puck-grab'){puckEvent(puck.grab());saveRoad(false);return;}
    if(action.startsWith('puck-gift-')){const item=action.slice(12);if(!inventory.remove(item,1))return;const fed=puck.feed(item);if(!fed.ok){inventory.add(item,1);toast(fed.reason,'PUCK');return;}
      inventory.refresh();audio?.effect('success');openDialogue(puckNpc,puckThanks(fed.wine,fed.settled),null,'Leave him be');
      if(fed.settled)toast('Puck is drunk again, and Solis settles: the fountain runs sweet, and the sea wall is quiet.','PUCK, THE WINE GOBLIN');saveRoad(false);return;}
    if(action==='puck-confront'){puck.confront();saveRoad(false);return;}
    if(action==='puck-keep'){const kept=puck.keep();if(!kept.ok)return;inventory.add(COPPER_ITEM,kept.reward);inventory.refresh();audio?.effect('success');
      openDialogue(secretary,['He lets out a breath he seems to have been holding for years.','Thank you. Truly. He will want to thank you himself, and he never will, so let me. Take this. From sundries.'],null,'Leave the counting house');
      toast(`${kept.reward} copper, from sundries. The arrangement holds, and nobody knows but you, Tancredi Vel and ${PRIME_MINISTER}.`,'PUCK, THE WINE GOBLIN');saveRoad(false);return;}
    if(action==='puck-expose'){if(!puck.expose().ok)return;
      openDialogue(secretary,['He sits down, very slowly, behind his desk.','Then go and tell them. They will be delighted. They always are, at first.'],null,'Leave the counting house');
      toast(`By evening all Solis knows that ${PRIME_MINISTER} has been keeping Puck in wine at the city\u2019s expense. He resigns before supper, and the deliveries stop.`,'THE GOBLIN SCANDAL');saveRoad(false);return;}
  }
  // Ed the Chameleon, who is not Puck and is tired of being asked (src/chameleon.js). He hops the
  // whole built world on a schedule drawn from the game's seed, poofs when an empty-handed traveler
  // comes at him, and stays for anybody carrying something worth having.
  const chameleonSeed=Math.floor(Math.random()*1e6);
  const chameleon=createChameleon({seed:chameleonSeed,onEvent:event=>{if(event.type==='poof')chameleonPoof(event);}});
  const edView=createEdView(scene,{heightAt:(x,z)=>world.heightAt(x,z)});
  const edNpc={id:ED.id,name:ED.name,role:ED.role,actor:{group:edView.group}};
  let edFacing=0,edLent;
  function placeChameleon(){const s=chameleon.spot;edView.place(s,0.9);edFacing=edView.group.rotation.y;edLent=undefined;}
  placeChameleon();
  const CHAMELEON_GONE={approached:'The chameleon is a puff of purple smoke and an empty branch. You came at him with nothing in your hands.',
    grabbed:'Your hands close on purple smoke. Somewhere a very long way from here, a chameleon settles onto something warm.'};
  function chameleonPoof(event){
    const seen=edView.group.visible&&edView.group.position.distanceTo(player.group.position)<60;
    if(seen)edView.puff();
    placeChameleon();
    if(seen)toast(CHAMELEON_GONE[event.reason]??`Ed goes up in a puff of purple smoke. He is at ${event.to.name} now, which is ${event.to.region}.`,'ED THE CHAMELEON');
  }
  const chameleonContext=()=>({chameleon,inventory,openDialogue,closeDialogue,act:chameleonAct});
  function chameleonAct(action){
    if(action==='ed-chameleon-meet'){chameleon.meet();toast('Ed. A chameleon, a very long way from Solis, and quite clear that he is not the other one.','ED THE CHAMELEON');saveRoad(false);return;}
    if(action==='ed-chameleon-grab'){chameleon.grab();saveRoad(false);return;}
    if(action.startsWith('ed-chameleon-give-')){const item=action.slice(18);if(!inventory.remove(item,1))return;
      const given=chameleon.give(item);if(!given.ok){inventory.add(item,1);toast(given.reason,'ED THE CHAMELEON');return;}
      inventory.refresh();audio?.effect('success');openDialogue(edNpc,chameleonThanks(),null,'Leave him to it');saveRoad(false);return;}
  }
  // The cask in the niche in the sea wall: F reads its seal.
  let currentCask=null;
  function readCask(){const found=puck.findCask();
    openDialogue({id:'sea-wall-cask',name:'A cask in the sea wall',role:'Sealed in green wax'},[
      'A small cask of good Enbraleth, tucked into a niche in the patched sea wall where nobody would put anything by accident.',
      'The bung is sealed in green wax, and pressed into the wax is a seal: a sun-horse over a closed ledger. The seal of the Prime Minister\u2019s office.',
      ...(found.first?['Somebody up the hill is feeding the goblin. His secretary, Tancredi Vel, keeps the door of the old counting house.']:[])],null,'Leave it be');
    if(found.first){toast('The Prime Minister\u2019s seal, on a cask left for Puck. His secretary keeps the door of the old counting house.','PUCK, THE WINE GOBLIN');saveRoad(false);}}

  // Brandy Frank: met once, and a ribbon once.
  const brandy=createBrandy();
  function brandyAct(action){
    const npc=npcById.get(BRANDY.id);
    if(action==='brandy-meet'){brandy.meet();toast('Brandy Frank, Tidehaven\u2019s dyer: the brightest colours in Drent, and not at all cheered up by them.','TIDEHAVEN');saveRoad(false);return;}
    if(action==='brandy-ribbon'){if(!brandy.giveRibbon().ok)return;inventory.add(RIBBON_ITEM,1);inventory.refresh();audio?.effect('success');
      openDialogue(npc,brandyRibbonLines(),null,'Back to the lane');toast('A ribbon in every colour Brandy has. It\u2019s in your satchel.','ADDED TO SATCHEL');saveRoad(false);}
  }
  // Bowden: the skill and the hatchet, his axes, the logs for his kiln, and his father's axe at level thirty.
  function woodAct(action){
    const npc=npcById.get(BOWDEN.id);
    if(action==='bowden-meet'){wood.meet();toast('Bowden Koop, King of the Koopwood: woodcutter, charcoal-burner, and louder than both.','THE KOOPWOOD');saveRoad(false);return;}
    if(action==='bowden-teach'){if(skills.learn(WOODCUTTING_SKILL).first){inventory.add('bronze-axe',1);inventory.refresh();refreshSkillsSheet();toast('Woodcutting, a new skill, and a bronze hatchet in your satchel. Stand at a tree in the Koopwood and press F.','NEW SKILL');saveRoad(false);}return;}
    const buy=/^bowden-buy-(.+)$/.exec(action);
    if(buy){const axe=AXES.find(a=>a.id===buy[1]);if(!axe||!axe.price||inventory.has(axe.id))return;
      if(!inventory.remove(COPPER_ITEM,axe.price)){toast(`That is ${axe.price} copper.`,'THE KOOPWOOD');return;}
      inventory.add(axe.id,1);inventory.refresh();audio?.effect('success');openDialogue(npc,bowdenLines.axe(axe),null,'Back to the road');saveRoad(false);return;}
    if(action==='bowden-sell'){const offer=wood.offer(id=>inventory.count(id));if(!offer.logs)return;
      for(const lot of offer.lots)inventory.remove(lot.item,lot.count);inventory.add(COPPER_ITEM,offer.total);wood.sold(offer.logs);inventory.refresh();audio?.effect('success');
      openDialogue(npc,bowdenLines.sell(offer.logs,offer.total),null,'Back to the road');saveRoad(false);return;}
    if(action==='bowden-build'){if(skills.learn(CONSTRUCTION_SKILL).first){for(const tool of ['hammer','saw'])if(!inventory.has(tool))inventory.add(tool,1);building.claimPlot();inventory.refresh();refreshSkillsSheet();
      toast('Construction, a new skill, a hammer and a saw, and the plot beside the Koopwood is yours.','NEW SKILL');saveRoad(false);}return;}
    if(action==='bowden-saw'){const offer=sawOffer(id=>inventory.count(id));if(!offer.planks||inventory.count(COPPER_ITEM)<offer.fee)return;
      if(offer.fee&&!inventory.remove(COPPER_ITEM,offer.fee))return;for(const lot of offer.lots){inventory.remove(lot.log,lot.count);inventory.add(lot.plank,lot.count);}
      inventory.refresh();audio?.effect('success');openDialogue(npc,BUILD_LINES.saw(offer.planks,offer.fee),null,'Back to the road');saveRoad(false);return;}
    if(action==='bowden-kings-axe'){if(!wood.giveKingsAxe().ok)return;inventory.add('kings-axe',1);inventory.refresh();audio?.effect('success');
      openDialogue(npc,[...bowdenLines.kingsAxe],null,'Back to the road');toast('The King\u2019s axe is in your satchel: the fastest axe in Drent.','ADDED TO SATCHEL');saveRoad(false);}
  }
  // Construction: Bowden's workbench, the traveler's plot, and the birdhouse posts in the Greenway (src/construction.js).
  let currentBench=null,currentPlot=null,currentPost=null;
  const satchelCount=id=>inventory.count(id);
  const planksText=planks=>Object.entries(planks).map(([id,n])=>`${n} ${PLANKS[id].name.toLowerCase()}${n>1?'s':''}`).join(', ');
  function takePlanks(planks){for(const [id,n] of Object.entries(planks))inventory.remove(id,n);}
  function useWorkbench(){
    const bench={id:'workbench',name:'Bowden\u2019s workbench'};
    openDialogue(bench,[skills.known(CONSTRUCTION_SKILL)?'A heavy bench with a vice, a plank in it, and Bowden\u2019s tools along the back. What will you make?':'Bowden\u2019s workbench. You would need to know how; ask him.'],null,'Step away',{choices:[
      ...WORKBENCH.map(recipe=>{const check=building.can(recipe,satchelCount);return{id:`make-${recipe.id}`,label:`${recipe.name} \u00b7 ${planksText(recipe.planks)} \u00b7 Construction ${recipe.level}`,disabled:!check.ok,reason:check.reason,
        action:()=>{const made=building.make(recipe.id,satchelCount);closeDialogue();if(!made.ok){toast(made.reason,'CONSTRUCTION');return;}
          takePlanks(made.planks);inventory.add(made.item,1);inventory.refresh();refreshSkillsSheet();audio?.effect('success');toast(`You make a ${recipe.name.toLowerCase()}. Hang it on a post in the Greenway.`,'CONSTRUCTION');saveRoad(false);}};}),
      {id:'leave-bench',label:'Nothing, for now.',action:closeDialogue}]});
  }
  function usePlot(){
    if(!building.plot){toast('A plot beside the Koopwood, staked out with string. It is Bowden Koop\u2019s to give: ask him about building.','YOUR PLOT');return;}
    const done=HOUSE_STAGES.slice(0,building.stages).map(stage=>stage.name.toLowerCase()),next=building.nextStage(),plot={id:'house-plot',name:HOUSE_PLOT.name};
    const lines=[done.length?`Your house. So far: ${done.join(', ')}.`:'Your plot: stakes and string, and a pile of stones. Footings first, Bowden says.'];
    if(!next)lines.push('It is finished. Bowden walked past yesterday and said nothing at all, which from him is a speech.');
    const check=next?building.can(next,satchelCount):null;
    openDialogue(plot,lines,null,'Step away',{choices:[
      ...(next?[{id:'build-stage',label:`Build ${next.name.toLowerCase()} \u00b7 ${planksText(next.planks)} \u00b7 Construction ${next.level}`,disabled:!check.ok,reason:check.reason,
        action:()=>{const built=building.buildStage(satchelCount);closeDialogue();if(!built.ok){toast(built.reason,'YOUR HOUSE');return;}
          takePlanks(built.planks);world.homestead.setStages(building.stages);inventory.refresh();refreshSkillsSheet();audio?.effect('success');toast(`${built.stage.name}: up.`,'YOUR HOUSE');saveRoad(false);}}]:[]),
      ...(building.built('bed')?[{id:'rest-bed',label:'Rest a while on the daybed.',action:()=>{closeDialogue();combat.state.player.hp=combat.state.player.maxHp;combat.state.player.stamina=combat.state.player.maxStamina;
        toast('You lie down under your own roof for an hour, and get up mended.','YOUR HOUSE');saveRoad(false);}}]:[]),
      {id:'leave-plot',label:'Leave it for now.',action:closeDialogue}]});
  }
  function usePost(spot){
    const now=building.post(spot.id);
    if(now.phase==='empty'){const kind=['oak-birdhouse','birdhouse'].find(id=>inventory.has(id));
      if(!kind){toast('A post for a birdhouse. Bowden\u2019s workbench in the Koopwood makes them.','BIRDHOUSE');return;}
      if(!building.hang(spot.id,kind).ok)return;inventory.remove(kind,1);inventory.refresh();world.homestead.setPost(spot.id,{phase:'waiting',kind});
      toast(`You hang the ${kind==='oak-birdhouse'?'oak birdhouse':'birdhouse'} on ${spot.name}. Somebody will move in, given a while.`,'BIRDHOUSE');saveRoad(false);return;}
    if(now.phase==='waiting'){toast(`Nobody has moved in yet. Give it ${Math.max(1,Math.ceil(now.left/60))} minute${now.left>60?'s':''} or so.`,'BIRDHOUSE');return;}
    const emptied=building.empty(spot.id);if(!emptied.ok)return;world.homestead.setPost(spot.id,{phase:'empty'});
    toast(`${emptied.bird[0].toUpperCase()}${emptied.bird.slice(1)} moved in, raised a brood and flew. You take the birdhouse down to clean it.${emptied.xp?'':' Lakota could teach you their names.'}`,'BIRDHOUSE');refreshSkillsSheet();saveRoad(false);
  }
  // Woodcutting in the Koopwood: F at a standing tree starts the swinging, and walking off stops it.
  const woodlotTree=new Map(WOODLOT_TREES.map(t=>[t.id,t]));
  let currentChop=null,chop=null;
  const satchelHas=id=>inventory.has(id);
  function startChop(t){
    const can=wood.canChop(t.id,satchelHas);if(!can.ok){toast(can.reason,'WOODCUTTING');return;}
    chop={id:t.id,next:SWING*.55};player.group.rotation.y=Math.atan2(t.x-player.group.position.x,t.z-player.group.position.z);
    toast(`You swing your ${can.axe.name.toLowerCase()} at the ${can.kind.short}.`,'WOODCUTTING');
  }
  /** One frame of chopping: stops if the traveler walks off, is attacked or the tree is gone; a swing every SWING seconds. */
  function chopping(dt,movement){
    if(!chop)return;
    const t=woodlotTree.get(chop.id),pp=player.group.position;
    if(mode!=='playing'||combat.state.phase==='active'||riding.mounted||movement>.3||Math.hypot(t.x-pp.x,t.z-pp.z)>CHOP_REACH+.6||!wood.standing(chop.id)){chop=null;return;}
    player.group.rotation.y=Math.atan2(t.x-pp.x,t.z-pp.z);chop.next-=dt;
    if(chop.next>0)return;
    chop.next+=SWING;world.woodlot.chip(chop.id);audio?.effect('hit');
    const swing=wood.swing(chop.id,satchelHas);
    if(!swing.ok){toast(swing.reason,'WOODCUTTING');chop=null;return;}
    if(!swing.log)return;
    inventory.add(swing.log,1);inventory.refresh();refreshSkillsSheet();
    if(swing.felled){world.woodlot.fell(chop.id,pp);toast(`The ${swing.kind.short} comes down. You get some logs.`,'WOODCUTTING');chop=null;saveRoad(false);}
    else toast('You get some logs.','WOODCUTTING');
  }
  // Talaelos: the wagon goes where the company goes; a scene puts three of them on its stage.
  const troupeWagon=createPageantWagon({open:true});scene.add(troupeWagon);
  const troupeNpcs=()=>npcData.filter(npc=>npc.troupe);
  /** Put the company and the wagon at their camp: on the stage if a scene is on. `snap` moves them there at once. */
  function placeTroupe(snap=true){
    const s=troupe.stop,homes=troupe.homes();troupeWagon.position.set(s.x,world.heightAt(s.x,s.z),s.z);troupeWagon.rotation.y=s.yaw;
    for(const npc of troupeNpcs()){const h=homes[npc.id];world.npcPositions[npc.id]={x:h.x,z:h.z};npc.lift=h.lift;
      if(snap){npc.actor.group.position.set(h.x,world.heightAt(h.x,h.z)+h.lift,h.z);npc.actor.group.rotation.y=h.yaw;}}
  }
  placeTroupe(true);
  // The Sultana: in the scene only while she is where the traveler could see her. John is ashore while she lies in port.
  const sultana=createSultana(),lauvelStretcher=createStretcher();
  function placeSalt(){const npc=npcById.get(JOHN.id),s=salt.port.stand;npc.hidden=!salt.ashore;world.npcPositions[JOHN.id]={x:s.x,z:s.z};
    if(salt.ashore){npc.actor.group.position.set(s.x,world.heightAt(s.x,s.z),s.z);npc.actor.group.rotation.y=s.yaw;}}
  function saltAct(action){
    if(action==='take-trelith-pass')return batmanAct(action);
    if(action==='buy-salt-beef'){const john=npcById.get(JOHN.id);
      if(!inventory.remove(COPPER_ITEM,BEEF_PRICE))return{ok:false,reason:''};
      if(!inventory.add(SALT_BEEF,1)){inventory.add(COPPER_ITEM,BEEF_PRICE);toast('There is no room in your satchel for it.','THE SULTANA');return{ok:false,reason:''};}
      inventory.refresh();audio?.effect('success');
      openDialogue(john,['\u201cSalt beef! From the barrel, cut across, and do not thank me, thank the cow.\u201d',
        '\u201cNow. Nobody buys one piece of salt beef for themselves. One piece is for a dog. Whose dog?\u201d A delighted look. '
        +'\u201cThe dyer\u2019s. The round one. I have seen him. He is a disgrace and I would die for him.\u201d'],
        null,'Back to the quay',{onComplete:()=>johnConversation(john,{salt,hunt,coppers:inventory.count(COPPER_ITEM),openDialogue,closeDialogue,act:saltAct})});
      saveRoad(false);return{ok:true,reason:''};}
    if(action==='john-meet'){salt.meet();toast('John, the Sultan of the Salt Trade, and his ship the Sultana: round the coast with a hold full of salt, from Tidehaven to Cobble, Izolveth and Solis, and back.','THE SALT TRADE');saveRoad(false);return;}
    if(action==='john-ed'&&salt.tellOfEd().first)saveRoad(false);
  }
  const troupeContext=()=>({troupe,purse:inventory.count(COPPER_ITEM),here:troupe.stop.where,openDialogue,closeDialogue,act:troupeAct});
  function troupeAct(action){
    const galeon=npcById.get('troupe-galeon');
    if(action==='troupe-meet'){troupe.meet();toast('Talaelos, the players of Nylon: Galeon, Isaura, Pim, Old Nilor and Zaela, with Understudy the dog and The Critic. They go wherever the road goes.','THE PLAYERS OF NYLON');saveRoad(false);return;}
    if(action==='troupe-scene-begin'){troupe.beginScene();placeTroupe(true);return;}
    if(action==='troupe-isaura-dies'){troupe.die();return;}
    const tip=/^troupe-tip-(\d+)$/.exec(action);
    if(tip){let n=Number(tip[1]);if(n&&!inventory.remove(COPPER_ITEM,n))n=0;troupe.tip(n);const done=troupe.endScene();placeTroupe(true);
      if(done.gift)inventory.add(PLAYBILL_ITEM,1);inventory.refresh();audio?.effect('success');
      openDialogue(galeon,troupeThanks(n,done.gift),null,'Exit, pursued by nobody');
      if(done.gift)toast('You are a regular of Talaelos now. The playbill is in your satchel, signed by the whole company, and the dog.','THE PLAYERS OF NYLON');saveRoad(false);}
  }

  // Tharganhom: Juan's tastings and bottles, Nika's stories.
  const atticContext=(extra={})=>({attic:wineAttic,wine,ed,hunt,purse:inventory.count(COPPER_ITEM),items:INVENTORY_ITEMS,openDialogue,closeDialogue,act:atticAct,...extra});
  function atticAct(action){
    const juan=npcById.get(JUAN.id),nika=npcById.get(NIKA.id);
    if(action==='take-rask-chit')return batmanAct(action);
    if(action==='attic-welcome'){wineAttic.welcome();toast(`${WINE_ATTIC.name}, the Wine Attic. Juan pours a taste of anything on his shelves and sells every bottle. Nothing from West Suval.`,'SOLIS \u00b7 THE WINE ATTIC');saveRoad(false);return;}
    if(action==='attic-learn-wine'){wine.learn();refreshSkillsSheet();audio?.effect('success');
      openDialogue(juan,[...JUAN_LESSON],null,'Back to Juan',{onComplete:()=>juanConversation(juan,atticContext({back:true}))});
      toast('Wine \u00b7 level 1. Juan will pour a taste of anything on his shelves.','NEW SKILL \u00b7 K FOR YOUR SKILLS');saveRoad(false);return;}
    if(action.startsWith('attic-taste-')){const id=action.slice(12),entry=ATTIC_WINES[id],result=wine.taste(id);if(!result.ok||!entry){toast(result.reason,WINE_ATTIC.name.toUpperCase());return;}
      refreshSkillsSheet();audio?.effect('success');
      openDialogue(juan,[entry.pitch,entry.note],null,'Back to Juan',{onComplete:()=>juanTasting(juan,atticContext(),'Another? Go on. Nobody is counting. Nika is counting.')});
      toast(result.first?`Wine +${result.xp}${result.levelled?` \u00b7 level ${result.level}`:''}. ${entry.name}, from ${entry.from}, tasted properly.`:`The ${entry.name}, again. Still good.`,result.first?'FIRST TASTING \u00b7 THARGANHOM':'THARGANHOM');
      if(result.first)saveRoad(false);return;}
    if(action.startsWith('attic-buy-')){const entry=ATTIC_WINES[action.slice(10)];if(!entry)return;
      if(inventory.count(COPPER_ITEM)<entry.price){juanShop(juan,atticContext(),'Ah, you are short. Happens to everybody. Happens to me every Tuesday.');return;}
      const paid=inventory.remove(COPPER_ITEM,entry.price);   // only hand back what was actually taken
      if(!paid||!inventory.add(entry.item,1)){if(paid)inventory.add(COPPER_ITEM,entry.price);juanShop(juan,atticContext());return;}
      inventory.refresh();audio?.effect('success');toast(`A bottle of ${entry.name} for ${entry.price} copper. ${describeSum(inventory.count(COPPER_ITEM))} left.`,'BOUGHT FROM JUAN');saveRoad(false);
      juanShop(juan,atticContext(),`The ${entry.name}. Beautiful choice. I wrapped it in yesterday\u2019s notices so nobody sees you have taste. Anything else?`);return;}
    if(action==='attic-ed'){if(puck.hear().first){refreshQuest?.();saveRoad(false);}return;}
    if(action==='nika-quiet'){wineAttic.quiet();return;}
    if(action==='nika-warm'){wineAttic.warmUp();saveRoad(false);atticAct('nika-scary-extra-picker');return;}
    const told=/^nika-(life|scary)-(.+)$/.exec(action);
    if(told){const heard=wineAttic.hear(told[1],told[2]);if(!heard.ok)return;
      openDialogue(nika,[...heard.entry.lines],null,'Back to Nika',{onComplete:()=>nikaConversation(nika,atticContext({back:true}))});
      if(heard.first){toast(told[1]==='scary'?`\u201c${heard.entry.title}\u201d, one of Nika\u2019s stories.`:'Nika, talking. Juan will not believe it.',told[1]==='scary'?'A STORY FROM NIKA':'NIKA');saveRoad(false);}}
  }
  function wineAct(action){
    const livia=npcById.get(VINTNER.id),back=()=>vintnerConversation(livia,wineContext());
    if(action==='visit-winery'){const result=wine.visit();if(result.first){refreshSkillsSheet();toast(result.xp?`Wine +${result.xp}. Lakota\u2019s old winery, and Livia Seravo on the porch.`:`${WINERY.name}: Paradise Springs, in plain words.`,WINERY.name.toUpperCase());saveRoad(false);}return result;}
    if(action==='learn-wine-here'){wine.learn();refreshSkillsSheet();audio?.effect('success');openDialogue(livia,[...WINE_LESSON],null,'Back to the terrace',{onComplete:back});toast('Wine \u00b7 level 1. Ask Livia for a taste of anything she pours.','NEW SKILL \u00b7 K FOR YOUR SKILLS');saveRoad(false);return{ok:true,reason:''};}
    if(action.startsWith('taste-')){const result=wine.taste(action.slice(6));if(!result.ok){toast(result.reason,WINERY.name.toUpperCase());return result;}
      refreshSkillsSheet();audio?.effect('success');
      openDialogue(livia,[`She pours the ${result.entry.name}. ${result.entry.note}`,result.entry.lore],null,'Back to the terrace',{onComplete:back});
      toast(result.first?`Wine +${result.xp}${result.levelled?` \u00b7 level ${result.level}`:''}. ${result.entry.name}, tasted properly.`:`${result.entry.name}, again. It is still good.`,result.first?'FIRST TASTING':'ANOTHER GLASS');saveRoad(false);return result;}
    return{ok:false,reason:''};
  }
  // The letters the two Ardrys carry between Tidehaven and Applegarth (src/rena-letters.js): the only reward is that both end fond of you.
  const renaLetters=createRenaLetters({onEvent:event=>{if(event.type==='ardrys-caught-up')toast('Lorn and Hesta Ardry have caught up after eighty years. Both of them are fond of you.','THE ARDRYS’ LETTERS · FINISHED');}});
  const drentBirds=createDrentBirds(scene,world,{garden:world.birdGarden,avoid:Object.values(world.npcPositions)});
  let currentBird=null,birdCardTimer=null,birdClock=0,birdWatch=null,watchedBirdId=null,watchedBirdUntil=0;
  const feederMarker=makeQuestMarker('skill');feederMarker.scale.setScalar(.6);feederMarker.visible=false;scene.add(feederMarker);
  // The pointer over the bird the traveler is watching, so one wren can be found against a
  // whole hedge. Deliberately not an errand's marker: a quarter of the size, a caret rather
  // than a diamond and a ring, and birding's blue rather than the quest gold.
  const birdPointer=new THREE.Group();
  {const caret=new THREE.Mesh(new THREE.ConeGeometry(.08,.2,4),new THREE.MeshStandardMaterial({color:0x9fd8e8,emissive:0x59a3bd,emissiveIntensity:.62,roughness:.34,metalness:.08}));
    caret.rotation.x=Math.PI;caret.castShadow=false;caret.receiveShadow=false;birdPointer.add(caret);}
  birdPointer.name='bird-pointer';birdPointer.visible=false;scene.add(birdPointer);
  const forestStory=createForestStory({inventory,weapons});
  const regionalLife=createRegionalLife({inventory});
  const forestHideout=createForestHideoutQuest({inventory});
  const hideoutEncounter=FOREST_HIDEOUT_QUEST.encounter;
  const hideoutWatch=createForestHideoutWatch(scene,world,hideoutEncounter);
  const roadLife=createRoadLife(scene,world);
  // The animals of the four western regions (src/west-regions-life.js): longhorns and
  // hares on the Vastos plain, a hawk over it, and the river fox in the Carica corridor.
  const westLife=createWestLife(scene,world);
  /**
   * Where the camera stands for a named western view, and what it looks at, from
   * the regions' own numbers rather than typed-in coordinates.
   *
   * `review()` puts the camera at `look + (sin yaw, cos yaw) * d` and points it
   * back at `look`, so a shot is fully described by the thing being looked at and
   * the place the camera is looking from. `shot()` takes exactly those two and
   * works the yaw and the distance out, which is the only way to be sure a view
   * ends up on the side of the river it was meant to be on.
   */
  function westReviewSpot(view){
    const shot=(camera,target,pitch,height=1,self=false)=>({
      x:camera.x,z:camera.z,pitch,self,
      yaw:Math.atan2(camera.x-target.x,camera.z-target.z),
      d:Math.max(2,Math.hypot(camera.x-target.x,camera.z-target.z)),
      look:{x:target.x,z:target.z,y:height},
    });
    /** A point `out` metres off a watercourse, on the side the normal points to. */
    const beside=(course,at,out,side=1)=>{
      const s=course.samples[Math.round((course.samples.length-1)*at)];
      return {sample:s,spot:{x:s.x+s.nx*out*side,z:s.z+s.nz*out*side}};
    };
    if(view==='west-vastos'){
      // The open range: a watering pan with the plain going on behind it.
      const pan=VASTOS_PANS[2];
      return shot({x:pan.x+10,z:pan.z-58},pan,.05,.6);
    }
    if(view==='west-vastos-braid'){
      // High enough above the bank to see all three channels and the bars between them.
      const {sample,spot}=beside(VASTOS_RIVER,(VASTOS_BRAID.from+VASTOS_BRAID.to)/2,46,-1);
      return shot(spot,sample,.34,.2);
    }
    if(view==='west-vastos-sinter'){
      // From the turf, across the line where the grass stops, to a vent breathing
      // on the far side of the crust. Aimed above the ground, or the crust fills
      // the frame and there is no horizon to see the line against.
      const vent=VASTOS_SINTER.vents[1];
      return shot({x:VASTOS_SINTER.x+34,z:VASTOS_SINTER.z+16},vent,.05,2.2);
    }
    if(view==='west-vastos-basin'){
      const basin=VASTOS_BASINS[0];
      return shot({x:basin.x+8,z:basin.z-basin.radius-34},basin,.12,.4);
    }
    if(view==='west-meneth'){
      // Down a valley floor, across the next two ridges. The floor is hay meadow,
      // so the camera is the one band of this region with nothing standing on it.
      const x=-1850,floor=menethTroughZ(1,x);
      return shot({x,z:floor+16},{x,z:floor-MENETH_RIDGES.wavelength*1.6},.09,6);
    }
    if(view==='west-meneth-beck'){
      const {sample,spot}=beside(MENETH_BECKS[1],.45,20);
      return shot(spot,sample,.20,.3);
    }
    if(view==='west-carica'){
      // From the Nesdor bank, across the water into the corridor's old growth. Far
      // enough back that the water is a band and not a floor, and aimed high enough
      // up the far bank to get the canopy in rather than a wall of trunks.
      const {sample,spot}=beside(CARICA,.62,46,-1);
      return shot(spot,sample,.10,7);
    }
    if(view==='west-carica-upper'){
      const {sample,spot}=beside(CARICA,.14,22);
      return shot(spot,sample,.22,.3);
    }
    if(view==='west-nesdor'){
      const {sample,spot}=beside(ELA_SOUTH_REACH,.72,54,-1);
      return shot(spot,sample,.20,.3);
    }
    if(view==='west-nesdor-flats'){
      // Away from the army's rope line, which crosses this ground: an Ambroni line in a country the Empire does not hold.
      return shot({x:-1560,z:760},{x:-1700,z:790},.04,4);
    }
    if(view==='west-lizeem'){
      const {sample,spot}=beside(LIZEEM,.42,40);
      return shot(spot,sample,.08,1.5);
    }
    const creature={'west-longhorn':'longhorn','west-hare':'upland-hare','west-sheep':'hill-sheep',
      'west-fox':'river-fox','west-otter':'otter','west-wader':'wading-bird'}[view];
    if(creature){
      const animal=westLife.snapshot().creatures.find(a=>a.species===creature);
      if(!animal)return null;
      const close=creature==='longhorn'?6:creature==='hill-sheep'?4.5:creature==='wading-bird'?4.5:3.2;
      // Half these animals live on a riverbank, so the camera has to go round to a
      // side of them there is ground on rather than to a fixed bearing off one shoulder.
      let from=null;
      for(let i=0;i<8&&!from;i++){
        const a=i/8*Math.PI*2,spot={x:animal.x+Math.sin(a)*close,z:animal.z+Math.cos(a)*close};
        if(canStand(spot.x,spot.z,world,.4))from=spot;
      }
      from=from??{x:animal.x+close*.8,z:animal.z-close*.6};
      return shot(from,animal,.07,creature==='longhorn'?1.1:creature==='wading-bird'?.9:.35);
    }
    return null;
  }
  const roadVerges=createRoadVerges(scene,world);
  let acornQuest=createAcornQuest();
  const journey=createJourney({inventory,weapons});
  const campaign=createCampaign();
  // Luscia: the chapter at the Lauvel, Lumber Town's people, and Smiths on its square.
  const luscia=createLusciaChapter({inventory});
  // The burying at the Lauvel (src/lauvel-burying.js): Sela calls to whoever comes up the road,
  // and the valley is short-handed at every part of putting its dead in the ground.
  const burying=createBurying();let selaVisits=0;
  const riding=createRiding();
  let mountHeading=0,rideCamera=0;
  const mountFooting=(x,z)=>canStand(x,z,world,RIDE.radius),footing=(x,z)=>canStand(x,z,world);
  const moros=createMorosChapter({inventory,hasHorse:()=>riding.owned});
  const border=createBorderChapter();
  const aftermath=createAftermathChapter();
  // The toll at the Amod pass stones (src/amod-ogre.js). The purse is the host's;
  // the module never has to know what a copper piece is.
  const ogreToll=createOgreToll({spendToll:n=>{const paid=inventory.remove(COPPER_ITEM,n);if(paid)inventory.refresh();return paid;}});
  // The crossing to Peblos: the fare, the developer override, and the short scene either way (src/ferry.js).
  const ferry=createFerry({
    purse:()=>inventory.count(COPPER_ITEM),
    pay:n=>{const paid=inventory.remove(COPPER_ITEM,n);if(paid)inventory.refresh();return paid;},
    free:()=>testingEnabled,
    mounted:()=>riding.mounted,
    position:()=>({x:player.group.position.x,z:player.group.position.z}),
    place:(x,z,heading)=>{player.group.position.set(x,world.heightAt(x,z),z);player.group.rotation.y=heading;yaw=heading;grounded=true;verticalSpeed=0;settleCamera();},
    carry:(x,z)=>{player.group.position.set(x,.78,z);},
    setMode:value=>{mode=value;stopInput();},
    veil:(value,caption)=>{const sheet=$('crossing');sheet.classList.toggle('hidden',value<=0);sheet.style.opacity=String(value);$('crossing-caption').textContent=value>.6?caption:'';},
    boat:(x,z,heading)=>world.placeFerryBoat(x,z,heading),
    stand:(side,point)=>{world.npcPositions[FERRY_NPC.id]={x:point.x,z:point.z};const boatman=npcById.get(FERRY_NPC.id);if(boatman){boatman.actor.group.position.set(point.x,world.heightAt(point.x,point.z),point.z);boatman.actor.group.rotation.y=point.yaw;}},
    save:()=>{if(!testingEnabled&&questStage>=1)saveRoad(false);},
    toast,
  });
  const inAftermathFight=()=>!!aftermath.spec&&combat.state.encounterId===aftermath.spec.encounterId;
  // Places change hands: garrisons (anyone with a stake, see occupation.js) are out only while their side holds their region.
  let heldControl=null,stakedNpcs=null,occupationClock=0;
  let currentMorosSite=null,currentFeederHook=false;
  // The army's horse line: real horses in place of the rebuild's block figures; the traveler's own stands saddled once claimed.
  const horseLine=[0,1,2,3].map(i=>{const hitch=world.storySites.horseHitch,x=hitch.x+1.8+i*3.6,z=hitch.z-1.6,actor=createHorse({variant:i,saddled:false});actor.group.position.set(x,world.heightAt(x,z),z);actor.group.rotation.y=Math.PI+.2*(i%2?1:-1);scene.add(actor.group);return {actor,x,z,grazing:i%2===1};});
  const ownHorse=createHorse({variant:0,saddled:true});ownHorse.group.position.copy(horseLine[0].actor.group.position);ownHorse.group.rotation.y=horseLine[0].actor.group.rotation.y;ownHorse.group.visible=false;scene.add(ownHorse.group);
  // The testing panel's horse wears a coat nobody could mistake for the army's bay, and stands in its place.
  const devHorse=createHorse({coat:'developer',saddled:true});devHorse.group.visible=false;scene.add(devHorse.group);
  // People are solid (src/bodies.js): the traveler and every villager see the frame's bodies as colliders.
  const playerWorld=bodyWorld(world).moving(player.group.position),npcWorld=bodyWorld(world),catWorld=bodyWorld(world,{ignore:['prop']});
  // Figures nobody can see wait off stage: out of the scene, so the renderer's per-frame matrix work
  // skips them (two hundred-odd villagers are most of the scene's objects). The NPC loop moves them.
  const offStage=new THREE.Group();
  function onStage(npc,on){const g=npc.actor.group,m=npc.marker;
    if(on){if(g.parent!==scene)scene.add(g);if(m&&m.parent!==scene)scene.add(m);}
    else{if(g.parent===scene)offStage.add(g);if(m&&m.parent===scene)offStage.add(m);}}
  function gatherBodies(){
    const list=[{id:'traveler',x:player.group.position.x,z:player.group.position.z,r:riding.mounted?RIDE.radius:BODY.traveler}];
    for(const npc of npcData){if(npc.hidden||npc.fallen||!npc.actor.group.visible)continue;const p=npc.actor.group.position;list.push({id:npc.id,x:p.x,z:p.z,r:npc.cat?BODY.cat:npc.dog?BODY.dog:npc.horse?BODY.horse:npc.ogre?BODY.ogre:BODY.person});}
    if(troupeWagon.visible)list.push(...troupe.bodies());
    for(const [i,h] of horseLine.entries())if(h.actor.group.visible)list.push({id:`line-horse-${i}`,x:h.actor.group.position.x,z:h.actor.group.position.z,r:BODY.horse});
    if(ownHorse.group.visible&&!riding.mounted)list.push({id:'own-horse',x:ownHorse.group.position.x,z:ownHorse.group.position.z,r:BODY.horse});
    if(combat.state.phase==='active'){
      for(const e of combat.state.enemies)if(e.active!==false&&e.action!=='dead')list.push({id:e.id,x:e.x,z:e.z,r:e.kind==='ogre'?BODY.ogre:e.kind==='wolf'?BODY.wolf:BODY.person});
      for(const a of combat.state.allies)if(a.active)list.push({id:a.id,x:a.x,z:a.z,r:BODY.person});
    }
    return list;
  }
  function placeOwnHorse(){const horse=riding.horse,mount=riding.developerMount?devHorse:ownHorse,other=riding.developerMount?ownHorse:devHorse;
    other.group.visible=false;if(!horse){mount.group.visible=false;return;}
    mount.group.position.set(horse.x,world.heightAt(horse.x,horse.z),horse.z);mount.group.rotation.y=horse.yaw;}
  // G: into the saddle or out of it. A fight, a fall or a scene puts the rider down whether there is room or not.
  function stepDown(forced=false){
    const result=forced?riding.unseat(footing):riding.dismount(footing);if(!result.ok){toast(result.reason,'IN THE SADDLE');return false;}
    player.group.position.set(result.position.x,world.heightAt(result.position.x,result.position.z),result.position.z);grounded=true;verticalSpeed=0;placeOwnHorse();
    targetDistance=Math.max(4,targetDistance-RIDE.camera.back);return true;
  }
  function toggleMount(){
    if(mode!=='playing'||!riding.owned)return;
    if(riding.mounted){stepDown();return;}
    const result=riding.mount(player.group.position,{fighting:combat.state.phase==='active',busy:!grounded||combat.state.player.action!=='idle'});
    if(!result.ok){toast(result.reason,'YOUR HORSE');return;}
    mountHeading=result.yaw;const sx=result.position.x+Math.sin(mountHeading)*RIDE.seat.forward,sz=result.position.z+Math.cos(mountHeading)*RIDE.seat.forward;player.group.position.set(sx,world.heightAt(sx,sz)+RIDE.seat.up,sz);player.group.rotation.y=mountHeading;
    targetDistance=Math.min(19,targetDistance+RIDE.camera.back);stopInput();audio?.effect('success');
  }
  function whistleHorse(){
    if(mode!=='playing'||!riding.owned||riding.mounted)return;
    const result=riding.whistle(player.group.position);toast(result.ok?(result.far?'A long whistle. He will find you.':'You whistle, and somewhere a bridle jingles.'):result.reason,'YOUR HORSE');
  }
  // Birding: Lakota's lesson, the feeder errand, and looking properly at a bird.
  function birdingAct(action){
    const lakota=npcById.get(BIRD_WATCHER.id);
    if(action==='learn-archaeology'){archaeology.meet();refreshSkillsSheet();audio?.effect('success');openDialogue(lakota,[...ARCHAEOLOGY_LESSON],null,'Back to the road');
      toast(`Archaeology \u00b7 level 1. Read ${RENA_NEEDED} of Lakota\u2019s pegged places at the ruins of Rena, in the forest at Drent\u2019s heart.`,'NEW SKILL \u00b7 K FOR YOUR SKILLS');saveRoad(false);return{ok:true,reason:''};}
    if(action==='report-rena'){const result=archaeology.report();if(!result.ok){toast(result.reason,'ARCHAEOLOGY');return result;}refreshSkillsSheet();audio?.effect('success');
      openDialogue(lakota,[archaeology.hasFound('track')?'You found the track. Of course you did; it was lying face up at the door. Three toes, and the middle one longest. I told you. Birds.':'Good notes. You missed the threshold slab in the hall, mind. Go back and look at what the builders laid face up at the door.',
        'Rena was richer than anybody here remembers, and it burned from the gate west. You have read a town. Most people never read anything but a letter.'],null,'Back to the road');
      toast(`Archaeology +${result.xp}${result.levelled?` \u00b7 level ${result.level}`:''}. Lakota has your notes on Rena.`,'THE RUINS OF RENA');saveRoad(false);return result;}
    if(action==='hot-chocolate'){const cup=cooking.cup(playSeconds);
      if(!cup.ok){openDialogue(lakota,['You have barely finished the last one. Sit a while first; the hawk is good company, if you do not look her in the eye.'],null,'Back to the road');return cup;}
      const healed=combat.heal(cup.healing);updateHUD();audio?.effect('success');
      openDialogue(lakota,[...LAKOTA_MAKES_A_CUP],null,'Back to the road',{onComplete:()=>toast(healed>0?`Recovered ${healed} health. You could ask him how he makes it.`:'You feel better for it. You could ask him how he makes it.','LAKOTA\u2019S HOT CHOCOLATE')});
      if(questStage>=1)saveRoad(false);return cup;}
    if(action==='learn-hot-chocolate'){const learned=cooking.learn('hot-chocolate');if(!learned.ok){toast(learned.reason,'COOKING');return learned;}
      inventory.add('chocolate',1);inventory.add('milk',1);inventory.refresh();refreshSkillsSheet();audio?.effect('success');
      openDialogue(lakota,[...LAKOTA_TEACHES_THE_CUP],null,'Back to the road');
      toast(`${learned.first?'Cooking \u00b7 level 1. ':''}Hot chocolate: a cake of chocolate and a jug of milk at a lit fire. Wendel sells both.`,learned.first?'NEW SKILL \u00b7 K FOR YOUR SKILLS':'COOKING');saveRoad(false);return learned;}
    if(action==='learn-wine'){wine.learn({recommend:true});refreshSkillsSheet();audio?.effect('success');
      toast(`Wine \u00b7 level 1. Find ${WINERY.name}, Paradise Springs, Lakota\u2019s old winery in the north-east of West Suval. Mind the war.`,'NEW SKILL \u00b7 K FOR YOUR SKILLS');saveRoad(false);return{ok:true,reason:''};}
    if(action==='know-lakota'){
      const first=lakota.know().first;
      openDialogue(npcById.get(BIRD_WATCHER.id),first?[
        'No. Well \u2014 yes, technically. I signed the same paper. I am also the only man on it who can tell you what that was, and it was a redstart, and it is going to be a very long walk for both of us if you cannot.',
        'One hundred and six kinds in this country. That is my list. The last was a bittern in the Caloss reeds and I lay in the mud an hour for it, which is the sort of thing I do instead of drilling.',
        'Ask me things. I dig as well, and I know rather more about wine than a man with a staff ought to.',
      ]:['Still not a mercenary. Still walking to the same plain.'],null,'Back to the road');
      if(first){audio?.effect('discovery');saveRoad(false);}
      return {ok:true,reason:''};
    }
    if(action==='learn-birding'){
      birding.meet();refreshSkillsSheet();audio?.effect('success');
      openDialogue(npcById.get(GARDEN_KEEPER.id),[...BIRDING_LESSON],null,'Back to the road');
      toast('Birding · level 1. Find a bird, keep your distance, press B.','NEW SKILL · K FOR YOUR SKILLS');saveRoad(false);return {ok:true,reason:''};
    }
    if(action==='take-feeder'){
      const result=birding.lendFeeder(inventory);if(!result.ok){toast(result.reason,'LAKOTA’S HUMMINGBIRDS');return result;}
      inventory.refresh();toast('Lakota’s hummingbird feeder. Take it to Lysa for sugar water.','ADDED TO SATCHEL · LAKOTA’S HUMMINGBIRDS');saveRoad(false);return result;
    }
    if(action==='fill-feeder'){const result=birding.fillFeeder(inventory);if(result.ok){inventory.refresh();toast('Full of sugar water. Hang it in Perrin’s garden.','PERRIN’S HUMMINGBIRDS');saveRoad(false);}return result;}
    if(action==='hang-feeder'){
      const result=birding.hangFeeder(inventory);if(!result.ok){toast(result.reason,'LAKOTA’S HUMMINGBIRDS');return result;}
      inventory.refresh();world.setFeederHung(true);audio?.effect('success');toast('The feeder is hung. Step back, keep still and wait.','LAKOTA’S HUMMINGBIRDS');saveRoad(false);return result;
    }
    return {ok:false,reason:''};
  }
  function botanyAct(action){
    if(action!=='learn-botany')return {ok:false,reason:''};
    botany.meet();refreshSkillsSheet();audio?.effect('success');
    openDialogue(npcById.get(BOTANIST.id),[...BOTANY_LESSON],null,'Back to the road');
    toast('Botany \u00b7 level 1. Look at the leaf, look at where it stands, and look at what it is next to.','NEW SKILL \u00b7 K FOR YOUR SKILLS');saveRoad(false);return {ok:true,reason:''};
  }
  function pipeAct(action){
    if(action!=='learn-pipe')return {ok:false,reason:''};
    const learned=pipe.learn(inventory);inventory.refresh();audio?.effect('success');
    if(learned.first)toast('A clay pipe and a twist of Cabe\u2019s own. Use the pipe weed in your satchel to smoke a bowl.','THE WEATHERHEAD');
    saveRoad(false);return {ok:true,reason:''};
  }
  /** Troy cuts a comb: the first is a gift, the rest are a couple of coppers toward the next skep. */
  function troyAct(action){
    if(action!=='take-honeycomb')return {ok:false,reason:''};
    const result=troy.takeComb({purse:n=>{const paid=inventory.remove(COPPER_ITEM,n);if(paid)inventory.refresh();return paid;},
      give:()=>inventory.add(HONEYCOMB,1)});
    if(!result.ok){if(result.refund)inventory.add(COPPER_ITEM,result.refund);toast(result.reason,'THE BEE FOLD');return result;}
    inventory.refresh();audio?.effect('success');
    toast(result.first?'A piece of comb, still warm from the hive. Press I to eat it.':result.paid?`A comb for ${result.paid} copper.`:'A piece of comb.','THE BEE FOLD');
    saveRoad(false);return result;
  }
  /** Katy's one act so far: the traveler says they will look for Batman, and takes her drawing. More to come. */
  function katyAct(action){
    if(action==='accept-batman'){if(!katy.accept(inventory))return {ok:false,reason:''};inventory.refresh();audio?.effect('discovery');
      toast('Katy\u2019s drawing of Batman','ADDED TO SATCHEL \u00b7 LOOKING FOR BATMAN');saveRoad(false);return {ok:true,reason:''};}
    return {ok:false,reason:''};
  }
  /** Imani walks a block, and once the whole hill has been walked, says what is in the box under Petunia. */
  function imaniAct(action){
    const imani=npcById.get(IMANI.id),back=()=>imaniConversation(imani,{vineyard,wine,openDialogue,closeDialogue,act:imaniAct,visits:imaniVisits++});
    if(action.startsWith('walk-block-')){const result=vineyard.walk(action.slice(11));if(!result.ok){toast(result.reason,WINERY.name.toUpperCase());return result;}
      refreshSkillsSheet();if(result.first)audio?.effect('success');
      openDialogue(imani,[...result.entry.work],null,'Back to the rows',{onComplete:back});
      if(result.first)toast(result.complete
        ?`Wine +${result.xp}${result.levelled?` \u00b7 level ${skills.level(WINE_SKILL)}`:''}. Every block on the hill, walked with the woman who works them.`
        :`Wine +${result.xp}${result.levelled?` \u00b7 level ${skills.level(WINE_SKILL)}`:''}. The ${result.name} block, and what is done to it.`,
      result.complete?'THE WHOLE HILL':'A BLOCK WALKED');
      saveRoad(false);return result;}
    if(action==='tell-dragon'){const result=vineyard.tellDragon(inventory);if(!result.ok)return result;
      inventory.refresh();audio?.effect('discovery');
      toast('A dragon\u2019s scale, warm on one side and cold on the other.','ADDED TO SATCHEL \u00b7 SHE TOLD YOU');saveRoad(false);return result;}
    return{ok:false,reason:''};
  }
  /**
   * The burying at the Lauvel (src/lauvel-burying.js). Three jobs, none of which is an errand:
   * the work is the whole quest, and the fourth man carried in off the field is her son.
   */
  function buryingAct(action){
    const sela=()=>npcById.get('lauvel-seeker');
    if(action==='lauvel-help'){if(!burying.start().ok)return{ok:false,reason:''};refreshQuest();
      toast('Old Hewe has the spade, Dorran has the hurdle, and Maudry has a list with nine blanks in it.','THE BURYING AT THE LAUVEL');saveRoad(false);return{ok:true,reason:''};}
    if(action.startsWith('lauvel-work-')){const id=action.slice(12),result=burying.work(id);
      if(!result.ok)return{ok:false,reason:result.reason};
      const npc=npcById.get(JOBS[id].who);refreshQuest();audio?.effect(result.found?'discovery':'success');
      const lines=result.first?[...JOB_FIRST[id]]:[JOB_AGAIN[id]];
      if(result.found)lines.push(...THE_GREEN_COAT);
      openDialogue(npc,lines,null,result.found?'Go and tell her':'Back to the work');
      if(result.found)toast('A green coat, too big in the shoulder, and two fingers gone off the left hand.','THE BURYING AT THE LAUVEL');
      else if(id==='hurdle'&&result.trips)toast(`${result.carried} carried in off the field. It is not half cleared.`,'THE BURYING AT THE LAUVEL');
      saveRoad(false);return{ok:true,reason:''};}
    if(action==='lauvel-tell'){if(!burying.tell().ok)return{ok:false,reason:''};refreshQuest();saveRoad(false);return{ok:true,reason:''};}
    if(action==='lauvel-bury'){if(!burying.finish().ok)return{ok:false,reason:''};
      world.lauvelField?.setBuried(true);refreshQuest();audio?.effect('success');
      openDialogue(sela(),[...THE_BURYING],null,'Leave her at the board');
      toast(`${SON.name} of this valley, in the grave you took a turn at digging.`,'THE BURYING AT THE LAUVEL · FINISHED');saveRoad(false);return{ok:true,reason:''};}
    return{ok:false,reason:''};
  }
  /** Batman's side of it: what he is told, what he is brought, and where the case finally goes. */
  function batmanAct(action){
    const back=()=>batmanConversation(batmanNpc,{hunt,openDialogue,closeDialogue,act:batmanAct,visits:batmanVisits++});
    if(action==='batman-sighted'){if(!hunt.sight().ok)return{ok:false,reason:''};audio?.effect('discovery');
      toast('He is real, he is not a man in a costume, and he has been working this for a year.','BATMAN');saveRoad(false);back();return{ok:true,reason:''};}
    if(action==='batman-accept'){const result=hunt.accept();if(!result.ok)return{ok:false,reason:''};refreshQuest();
      toast('He does the dark. You do the daylight: the requisition in Solis, and the pass John keeps.','THE BLUE TRADE');saveRoad(false);return{ok:true,reason:''};}
    if(action==='batman-bust'){refreshQuest();closeDialogue();
      toast('Tonight, the breach in Solis\u2019s east wall. Be in the rubble on the north side and stay in it.','THE BLUE TRADE');saveRoad(false);return{ok:true,reason:''};}
    if(action.startsWith('case-')){const result=hunt.finish(action.slice(5));if(!result.ok)return{ok:false,reason:''};
      for(const id of ['velaeth-vial','rask-chit','trelith-pass','cartel-ledger'])inventory.remove(id,1);
      inventory.refresh();refreshQuest();audio?.effect('success');
      openDialogue(batmanNpc,[result.outcome.outcome],null,'Back to the rock',{onComplete:back});
      toast(result.outcome.name,'THE BLUE TRADE \u00b7 FINISHED');saveRoad(false);return{ok:true,reason:''};}
    // The three pieces, each out of the hands of somebody who already had it.
    const piece=Object.values(EVIDENCE).find(entry=>action==='take-'+entry.item);
    if(piece){const result=hunt.find(piece.id,inventory);if(!result.ok)return{ok:false,reason:result.reason};
      inventory.refresh();refreshQuest();audio?.effect('discovery');
      toast(result.complete?'All three. Take them back to the rock above the spring.':piece.name,
        result.complete?'THE BLUE TRADE':'ADDED TO SATCHEL');saveRoad(false);return{ok:true,reason:''};}
    return{ok:false,reason:''};
  }
  /** Up the stair to the gallery: what is under you from up there, and the coast it charts. */
  function addisonAct(action){
    if(action!=='climb-light')return heistAct(action);
    const addison=npcById.get(ADDISON.id),result=light.climb(mapFog);
    if(result.first)audio?.effect('discovery');
    openDialogue(addison,[...FROM_THE_GALLERY],null,'Back down the stair',
      {onComplete:()=>addisonConversation(addison,{light,hunt,heist,openDialogue,closeDialogue,act:addisonAct,visits:addisonVisits++})});
    if(result.first)toast('Two hundred and six steps, and the whole of this coast under you.','THE SUVAL LIGHT');
    saveRoad(false);return{ok:true,reason:''};
  }
  /** The whole of Bosco's mechanic: make a fuss of him. He has never once refused. */
  function boscoAct(action){
    const back=()=>boscoConversation(boscoNpc,{bosco,carrying:BOSCO_TAKES.filter(id=>inventory.count(id)>0),openDialogue,closeDialogue,act:boscoAct,visits:boscoVisits++});
    if(action.startsWith('feed-bosco-')){const id=action.slice(11);
      const result=bosco.feed(id,{take:item=>inventory.remove(item,1)});
      if(!result.ok){toast(result.reason,'BOSCO');return result;}
      inventory.refresh();audio?.effect('success');
      openDialogue(boscoNpc,[result.line],null,'Back to the yard',{onComplete:back});
      saveRoad(false);return result;}
    if(action==='bosco-walk'){const result=bosco.startWalk();if(!result.ok)return{ok:false,reason:''};
      audio?.effect('discovery');openDialogue(boscoNpc,[...BOSCO_WALK_START],null,'Go on then',{onComplete:()=>{}});
      toast('He is coming with you. Everywhere. Talk to him again when you want him home.','BOSCO \u00b7 A WALK');
      saveRoad(false);return result;}
    if(action==='bosco-walk-end'){const result=bosco.endWalk();if(!result.ok)return{ok:false,reason:''};
      openDialogue(boscoNpc,[...BOSCO_WALK_END],null,'Back to the lane',{onComplete:()=>{}});
      saveRoad(false);return result;}
    if(action!=='pet-bosco')return{ok:false,reason:''};
    const result=bosco.pet();audio?.effect('discovery');
    openDialogue(boscoNpc,[result.line],null,'Back to the yard',
      {onComplete:()=>boscoConversation(boscoNpc,{bosco,openDialogue,closeDialogue,act:boscoAct,visits:boscoVisits++})});
    if(result.pets===1)toast('Bosco, of the dye yard. He is not a dignified animal and has never tried to be.','A GOOD DOG');
    saveRoad(false);return{ok:true,reason:''};
  }
  /**
   * The business with the other light (src/rival-light.js): what Addison finally says out loud,
   * the crossing into a country that is shut, the glass off its cradle, and what becomes of it.
   */
  function heistAct(action){
    const addison=npcById.get(ADDISON.id),rival=npcById.get(SUBTRACTIDAUGHTER.id);
    const backToAddison=()=>addisonConversation(addison,{light,hunt,heist,openDialogue,closeDialogue,act:addisonAct,visits:addisonVisits++});
    if(action==='sister-tell'){if(!heist.tell().ok)return{ok:false,reason:''};refreshQuest();
      openDialogue(addison,[...SISTER_TOLD],null,'Back to the yard',{onComplete:backToAddison});
      toast('There is another light on this coast, and her sister keeps it.','THE ELOD LIGHT');saveRoad(false);return{ok:true,reason:''};}
    if(action==='sister-ask'){if(!heist.accept().ok)return{ok:false,reason:''};refreshQuest();
      openDialogue(addison,[...SISTER_WHY,...CROSSING_PLAN],null,'Back to the yard',{onComplete:backToAddison});
      toast('The glass, and nothing else. Tell her when you are ready to sail.','THE STEPPED LENS');saveRoad(false);return{ok:true,reason:''};}
    if(action==='sister-sail'){if(!heist.land().ok)return{ok:false,reason:''};
      // She lands the traveler herself, which is the only way into East Suval that does not
      // involve an Elodi picket (src/closed-border.js only refuses crossings of the border).
      const to={x:LANDING.x,z:LANDING.z};
      player.place(to.x,to.z,LANDING.yaw);closeDialogue();refreshQuest();
      audio?.effect('discovery');
      toast('Shingle under the head, in the dark, in a country that is shut. She is on the water until first light.','EAST SUVAL \u00b7 PUT ASHORE');
      saveRoad(false);return{ok:true,reason:''};}
    if(action==='take-lens'){const result=heist.take(inventory);if(!result.ok)return{ok:false,reason:''};
      inventory.refresh();refreshQuest();audio?.effect('success');
      openDialogue(result.spoke?rival:addison,[...(result.spoke?RIVAL_WATCHES:RIVAL_UNSEEN)],null,'Down the stair',{onComplete:()=>{}});
      toast('A third of a ton of Elagosi glass. Get it down the cliff to the boat.','THE STEPPED LENS');saveRoad(false);return result;}
    if(action==='lens-home'){if(!heist.home().ok)return{ok:false,reason:''};
      const home={x:ADDISON_STAND.x+1.6,z:ADDISON_STAND.z+1.6};
      player.place(home.x,home.z,ADDISON_STAND.yaw+Math.PI);refreshQuest();
      toast('Across in the dark with the glass in the bottom of the boat, and up onto her own head at dawn.','THE SUVAL LIGHT');
      saveRoad(false);return{ok:true,reason:''};}
    if(action.startsWith('glass-')){const id=action.slice(6);const result=heist.finish(id);if(!result.ok)return{ok:false,reason:''};
      inventory.remove(LENS_ITEM,1);inventory.refresh();refreshQuest();audio?.effect('success');
      openDialogue(addison,[result.outcome.outcome],null,'Back to the yard',{onComplete:backToAddison});
      toast(result.outcome.name,'THE STEPPED LENS \u00b7 DECIDED');saveRoad(false);return{ok:true,reason:''};}
    return{ok:false,reason:''};
  }
  function jimsonAct(action){
    if(action==='accept-jimson'){if(!jimson.accept())return {ok:false,reason:''};refreshQuest();toast('Three spiked pods. There is one behind Nell Harrow\u2019s shed, one out past the Caloss gate, and one away in Pueth.','TOFT\u2019S KNEE');saveRoad(false);return {ok:true,reason:''};}
    if(action==='give-jimson'){if(!jimson.turnIn(inventory))return {ok:false,reason:''};inventory.refresh();refreshQuest();audio?.effect('success');toast('He takes them inside without meeting your eye, and pays you in pipe weed.','TOFT\u2019S KNEE');saveRoad(false);return {ok:true,reason:''};}
    if(action==='settle-jimson'){if(!jimson.settle())return {ok:false,reason:''};refreshQuest();saveRoad(false);return {ok:true,reason:''};}
    return {ok:false,reason:''};
  }
  function refugeeAct(action,id){
    if(action!=='meet-refugee')return {ok:false,reason:''};
    if(refugees.meet(id).first)saveRoad(false);
    return {ok:true,reason:''};
  }
  function geologyAct(action){
    if(action!=='learn-geology')return {ok:false,reason:''};
    geology.meet();refreshSkillsSheet();audio?.effect('success');
    openDialogue(npcById.get(GEOLOGIST.id),[...GEOLOGY_LESSON],null,'Back to the shore');
    toast('Geology \u00b7 level 1. Weigh it, scratch it, and ask where it is lying.','NEW SKILL \u00b7 K FOR YOUR SKILLS');saveRoad(false);return {ok:true,reason:''};
  }
  function gatherStone(){
    if(!currentStone)return;
    if(!geology.met){toast('A stone that catches the eye. Silas Garrow, digging under the Weatherhead, could tell you what it is.','A STONE');return;}
    const found=geology.find(currentStone.species,inventory);
    if(!found.ok){toast(found.reason,'A STONE');return;}
    stones.gather(currentStone.id,{take:found.taken});
    currentStone=null;inventory.refresh();refreshSkillsSheet();audio?.effect('success');
    if(found.first)showSkillCard({kicker:`FIRST FIND \u00b7 GEOLOGY +${found.xp}${found.levelled?` \u00b7 LEVEL ${found.level}`:''}`,name:found.species.name,note:found.species.note,skill:GEOLOGY_SKILL});
    else toast(found.taken?`${found.species.name} \u00b7 ${found.count} found. In your satchel.`:`${found.species.name} \u00b7 ${found.count} found. Left where it lies.`,'STONES');
    saveRoad(false);
  }
  // A tree is named, not taken: looking at one properly is the whole of it.
  function lookAtTree(){
    if(!currentTree)return;
    if(!botany.met){toast('A tree worth looking at, and no name for it. Nell Harrow, on the outskirts of Tidehaven, has a name for every tree in this wood.','A TREE');return;}
    const found=botany.find(currentTree.species,inventory);
    if(!found.ok){toast(found.reason,'A TREE');return;}
    refreshSkillsSheet();audio?.effect('success');
    if(found.first)showSkillCard({kicker:`FIRST TREE \u00b7 BOTANY +${found.xp}${found.levelled?` \u00b7 LEVEL ${found.level}`:''}`,name:found.species.name,note:found.species.note,skill:BOTANY_SKILL});
    else toast(`${found.species.name}. You know it already; it knows you less well.`,'TREES');
    saveRoad(false);
  }
  function lookAtOldTree(){
    const view=oldTree.view();
    openDialogue({id:TALKING_TREE.id,name:TALKING_TREE.name,role:view.stage==='told'?'The last of its kind in Drent':'In a clearing south of the Greenway'},treeLines(view),null,'Step back');
  }
  function jimsonNight(){audio?.effect('discovery');toast('Word is all over the landing: Toft Ellery spent last night telling a mooring post what he thinks of his brother. He is sitting very still this morning.','TOFT\u2019S KNEE');saveRoad(false);}
  function smokePipe(){
    const result=pipe.smoke(inventory);
    if(!result.ok)return {ok:false,healed:0,reason:result.reason};
    const healed=combat.heal(result.heal);inventory.refresh();
    toast(result.line,'A BOWL OF IT');saveRoad(false);
    return {ok:true,healed,reason:''};
  }
  function gatherPlant(){
    if(!currentPlant)return;
    if(!botany.met){toast('A plant, and no name for it. Nell Harrow, on the outskirts of the village, has a name for everything here.','SOMETHING GROWING');return;}
    if(!jimson.canPick(currentPlant.stand)){toast('Nell is standing ten paces away with her arms folded. Ask her what it is before you put a hand on it.','HER GROUND, HER PLANT');return;}
    const found=botany.find(currentPlant.species,inventory);
    if(!found.ok){toast(found.reason,'SOMETHING GROWING');return;}
    flora.gather(currentPlant.id,{take:found.taken});
    currentPlant=null;inventory.refresh();refreshSkillsSheet();audio?.effect('success');
    if(found.first)showSkillCard({kicker:`FIRST FIND \u00b7 BOTANY +${found.xp}${found.levelled?` \u00b7 LEVEL ${found.level}`:''}`,name:found.species.name,note:found.species.note,skill:BOTANY_SKILL});
    else toast(found.taken?`${found.species.name} \u00b7 ${found.count} found. In your satchel.`:`${found.species.name} \u00b7 ${found.count} found. Left where it stands.`,found.species.warning?'NOTED, AND LEFT ALONE':'HERBS');
    saveRoad(false);
  }
  function mycologyAct(action){
    if(action!=='learn-mycology')return {ok:false,reason:''};
    mycology.meet();refreshSkillsSheet();audio?.effect('success');
    openDialogue(npcById.get(MYCOLOGIST.id),[...MYCOLOGY_LESSON],null,'Back to the road');
    toast('Mycology · level 1. Wood or ground, gills or folds, and what it smells of.','NEW SKILL · K FOR YOUR SKILLS');saveRoad(false);return {ok:true,reason:''};
  }
  function gatherMushroom(){
    if(!currentMushroom)return;
    if(!mycology.met){toast('An unfamiliar mushroom. Odger Pell, at the edge of the Greenway, would name it for you.','A MUSHROOM');return;}
    const found=mycology.find(currentMushroom.species,inventory);
    if(!found.ok){toast(found.reason,'A MUSHROOM');return;}
    mushrooms.gather(currentMushroom.id,{take:found.species.edible});
    currentMushroom=null;inventory.refresh();refreshSkillsSheet();audio?.effect('success');
    if(found.first)showSkillCard({kicker:`FIRST FIND · MYCOLOGY +${found.xp}${found.levelled?` · LEVEL ${found.level}`:''}`,name:found.species.name,note:found.species.note,skill:MYCOLOGY_SKILL});
    else toast(found.taken?`${found.species.name} · ${found.count} found. In your satchel.`:`${found.species.name} · ${found.count} found. Left where it stands.`,found.species.warning?'NOTED, AND LEFT ALONE':'MUSHROOMS');
    saveRoad(false);
  }
  // The Ardrys' letters: meeting them, taking a letter and giving one. Nothing is paid; the standing is the reward.
  function renaAct(action,id){
    if(action==='meet-ardry'){if(renaLetters.meet(id).first)saveRoad(false);return {ok:true,reason:''};}
    if(action==='take-ardry-letter'){
      const result=renaLetters.take(id,inventory);if(!result.ok){toast(result.reason,'THE ARDRYS’ LETTERS');return result;}
      inventory.refresh();audio?.effect('success');
      toast(`${ARDRY_NAMES[result.letter.from]}’s letter for ${ARDRY_NAMES[result.letter.to]} at ${ARDRY_PLACES[result.letter.to]}. J to read it.`,'ADDED TO SATCHEL · THE ARDRYS’ LETTERS');
      const giver=npcById.get(id);openDialogue(giver,[result.letter.hand,id==='rena-lorn'?'“It is not sealed. Read it if you like. At my age there is no sense in a secret that has to travel.”':'“Read it if you want to. He will tell you what was in it anyway, and get it wrong.”'],null,'Back to the road',{onComplete:()=>conversation(giver)});
      saveRoad(false);return result;
    }
    if(action==='give-ardry-letter'){
      const result=renaLetters.deliver(id,inventory);if(!result.ok){toast(result.reason,'THE ARDRYS’ LETTERS');return result;}
      inventory.refresh();audio?.effect('success');
      const reader=npcById.get(id);openDialogue(reader,[...result.letter.handed],null,'Back to the road',{onComplete:()=>conversation(reader)});
      saveRoad(false);return result;
    }
    return {ok:false,reason:''};
  }
  // Ambron's specialists: whichever skill a traveler learns in the city, and the
  // botanist's errand back to Drent. `elagosFlags` is the city's own small memory;
  // the talking tree itself is Drent's, and reads the same flag name.
  const elagosFlags=new Set();
  // Any specialist can teach a skill, not only Tidehaven's. Each skill keeps its
  // own first meeting, so a lesson in Ambron has to go through the same module
  // the Drent teacher uses, or the level would rise and nothing could be found.
  function teachFromAmbron(id){
    const lessons={birding:()=>birding.meet(),botany:()=>botany.meet(),mycology:()=>mycology.meet(),geology:()=>geology.meet(),
      fishing:()=>{if(!inventory.has('fishing-rod'))inventory.grant('fishing-rod');inventory.refresh();return fishing.learn();}};
    return lessons[id]?lessons[id]():skills.learn(id);
  }
  function elagosAct(action){
    if(action===TALKING_TREE_QUEST){
      // The errand is the Old Tree's own state, so it is saved with the tree.
      const repeat=oldTree.stage==='told';oldTree.tell();elagosFlags.add(action);
      if(!repeat){toast('A tree in Drent that looks back, and the last of them. Stand where it can see you, and do not hurry.','THE BOTANIST OF AMBRON');saveRoad(false);}
      return {ok:true,repeat};
    }
    if(action?.startsWith('learn-')){
      const id=action.slice(6),learned=skills.view().find(entry=>entry.id===id);
      refreshSkillsSheet();
      if(learned?.learned){audio?.effect('success');toast(`${learned.name} · level ${learned.level}. Ambron teaches what the road does, in its own way.`,'NEW SKILL · K FOR YOUR SKILLS');}
      saveRoad(false);return {ok:true};
    }
    return {ok:false,reason:''};
  }
  function observeBird(){
    if(mode!=='playing'||!birding.met||combat.state.phase==='active')return;
    const target=currentBird;if(!target){toast('No bird in view. Find one, keep your distance, and face it.','BIRDING · B');return;}
    const result=birding.observe(target.species);if(!result.ok){toast(result.reason,'BIRDING');return;}
    drentBirds.observe(target.id);
    // Having looked at one properly, keep the pointer on it while he reads about it, rather
    // than letting it hop to whatever lands nearer. The hold is the card's own seven seconds.
    watchedBirdId=target.id;watchedBirdUntil=elapsed+7;
    if(result.first){showBirdCard(result);audio?.effect('success');}
    else toast(`${result.species.name} · seen ${result.count} times`,'BIRDING · ALREADY IN YOUR NOTES');
    refreshSkillsSheet();saveRoad(false);
  }
  function showBirdCard(result){
    showSkillCard({kicker:`FIRST SIGHTING · BIRDING +${result.xp}${result.levelled?` · LEVEL ${result.level}`:''}`,name:result.species.name,note:result.species.note,skill:'birding'});
  }
  /**
   * The bird the pointer is on, and the box beside it. src/bird-finder.js chooses; this only
   * puts the answer into words. The box never names a kind of bird the traveler has not
   * identified yet - the first-sighting card is what naming one looks like, and it takes the
   * screen back the moment he earns it. Nothing here gates the birding that was already here:
   * if the finder finds nothing, B and the observe prompt work exactly as before.
   */
  function watchBird(){
    const holding=watchedBirdUntil>elapsed?watchedBirdId:null;
    birdWatch=mode==='playing'&&birding.met&&combat.state.phase!=='active'
      ?findBird(drentBirds.state().birds,{position:player.group.position,heading:yaw+Math.PI,
        range:observeRange(skills.level('birding')),watching:holding,preferred:currentBird?.id??null}):null;
    const species=birdWatch?BIRD_SPECIES[birdWatch.species]:null;
    if(!species){birdWatch=null;return;}
    const known=birding.hasSeen(birdWatch.species),here=currentBird?.id===birdWatch.id;
    $('bird-watch-kicker').textContent=known?'IN YOUR NOTES':'NOT YET IN YOUR NOTES';
    $('bird-watch-name').textContent=known?species.name:'An unfamiliar bird';
    $('bird-watch-where').textContent=`${birdWatch.words} · ${Math.max(1,Math.round(birdWatch.distance))} m`;
    $('bird-watch-note').textContent=known?species.lore:species.hint;
    $('bird-watch-prompt').textContent=here?(known?'B · look at it again':`B · ${species.xp} experience the first time`)
      :birdWatch.behind?'Turn and look for it':'Find a clear view of it';
  }
  // The card a skill puts up when the traveler learns something new: a bird seen, a fish landed.
  /** Every bit of experience shows as a drop by the map, RuneScape fashion, and a new level gets its banner. */
  let levelUpTimer=0,levelUpSkill=null;
  function skillEvent(event){
    if(event.type!=='skill-gain'||typeof document==='undefined')return;
    const drops=$('xp-drops');if(drops){const drop=document.createElement('div');drop.className='xp-drop';drop.textContent=`+${event.gained} ${SKILLS[event.id]?.name??event.id}`;drops.append(drop);setTimeout(()=>drop.remove(),1900);}
    if(event.levelled){const opened=skillGuide(event.id,event.level).filter(entry=>entry.level>event.before&&entry.level<=event.level);
      $('level-up-title').textContent=`${SKILLS[event.id].name} · level ${event.level}`;$('level-up-line').textContent=levelUpLine(event.id,event.level);
      $('level-up-unlock').textContent=opened.length?`Now open: ${opened.map(entry=>entry.text).join(' · ')}`:'';
      const banner=$('level-up');levelUpSkill=event.id;
      // Taking the class off and putting it back is what restarts the flash on a second level in a row.
      banner.classList.remove('visible','flash');void banner.offsetWidth;banner.classList.add('visible','flash');
      audio?.effect('success');clearTimeout(levelUpTimer);levelUpTimer=setTimeout(()=>banner.classList.remove('visible','flash'),5200);}
  }
  function showSkillCard({kicker,name,note,skill}){
    const view=skills.view().find(entry=>entry.id===skill),level=skillLevel(skill,view?.xp??0);
    $('bird-card-kicker').textContent=kicker;
    $('bird-card-name').textContent=name;$('bird-card-note').textContent=note;
    $('bird-card-fill').style.width=`${Math.round(level.progress*100)}%`;
    $('bird-card-level').textContent=level.max?`${view.name} ${level.level} · ${level.xp} experience`:`${view.name} ${level.level} · ${level.xp} / ${level.next} experience`;
    $('bird-card').classList.add('visible');clearTimeout(birdCardTimer);birdCardTimer=setTimeout(()=>$('bird-card').classList.remove('visible'),7000);
  }
  // The skills sheet in the journal, RuneScape's way: a grid of the thirteen skills, three to a row,
  // with the total level filling what the last of them leaves of the bottom row, and behind each tile
  // that skill's own guide and the collection log that belongs to it.
  const skillEl=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
  let openSkillId=null;
  function skillMark(skill,cls='skill-tile-icon'){const mark=skillEl('span',cls);mark.setAttribute('aria-hidden','true');mark.innerHTML=skillIconSVG(skill.id);return mark;}
  function skillProgressBar(progress){const bar=skillEl('div','skill-bar'),fill=skillEl('i');fill.style.width=`${Math.round(progress*100)}%`;bar.append(fill);return bar;}
  function skillTile(skill){
    const tile=skillEl('button',`skill-tile${skill.learned?'':' unlearned'}`);tile.type='button';tile.dataset.skill=skill.id;
    tile.append(skillMark(skill),skillEl('b','',skill.name),skillEl('span','skill-tile-level',`${skill.learned?skill.level:0} / ${skill.top}`),
      skillProgressBar(skill.learned?skill.progress:0),skillEl('span','skill-tip',skillTip(skill)));
    tile.onclick=()=>{openSkillId=skill.id;refreshSkillsSheet();};
    return tile;
  }
  function renderSkillGrid(sheet,view){
    const grid=skillEl('div','skill-grid');
    for(const skill of view)grid.append(skillTile(skill));
    const total=skillEl('div','skill-tile skill-tile-total'),learned=view.filter(skill=>skill.learned).length;
    total.append(skillEl('b','','Total level'),skillEl('span','skill-tile-level',String(skills.totalLevel())),
      skillEl('span','skill-tip',`Total level: ${skills.totalLevel()} · Skills learned: ${learned} / ${view.length}`));
    grid.append(total);sheet.append(grid);
  }
  // One skill's page: what each of its levels opens, and everything that skill has collected.
  function renderSkillGuide(sheet,skill){
    const card=skillEl('section','skill-card');
    const back=skillEl('button','skill-back','‹ All skills');back.type='button';back.onclick=()=>{openSkillId=null;refreshSkillsSheet();};
    const head=skillEl('header','skill-detail-head'),titles=skillEl('div');
    titles.append(skillEl('span','eyebrow',skill.learned?`LEVEL ${skill.level} / ${skill.top}`:'NOT YET LEARNED'),skillEl('h3','',skill.name));
    head.append(skillMark(skill),titles);card.append(back,head);
    if(skill.learned)card.append(skillProgressBar(skill.progress),skillEl('p','skill-xp',skill.max?`${skill.xp} experience · the highest level`:`${skill.xp} / ${skill.next} experience to level ${skill.level+1}`));
    card.append(skillEl('p','',skill.learned?skill.blurb:`${skill.teacher} can teach it.`));
    if(skill.guide.length){const guide=skillEl('ul','skill-guide');for(const entry of skill.guide){const li=skillEl('li',entry.open?'open':'locked');li.append(skillEl('b','',String(entry.level)),skillEl('span','',entry.text));guide.append(li);}
      card.append(skillEl('h3','','What each level opens'),guide);}
    appendSkillLog(card,skill);
    sheet.append(card);
  }
  // The collection logs, which used to sit under every skill at once and now belong to their own skill's page.
  function appendSkillLog(card,skill){
    const el=skillEl;
    if(skill.id==='geology'&&skill.learned){
      const view=geology.view(),list=el('ul','bird-list');
      for(const entry of view.entries){const li=el('li',entry.found?'seen':'unseen',entry.found?`${entry.name}${entry.count>1?` \u00b7 found ${entry.count} times`:''}`:entry.name);li.append(el('small','',entry.detail));list.append(li);}
      card.append(el('h3','',`Stones named \u00b7 ${view.foundCount} / ${view.total}`),list);
    }
    for(const [id,module,label] of [['archaeology',archaeology,'Finds written up'],['wine',wine,'Wines tasted'],['cooking',cooking,'Recipes known']])if(skill.id===id&&skill.learned){
      const view=module.view(),list=el('ul','bird-list');
      for(const entry of view.entries){const done=entry.found??entry.tasted??entry.known;const li=el('li',done?'seen':'unseen',entry.made?`${entry.name} \u00b7 made ${entry.made}`:entry.name);li.append(el('small','',entry.detail));list.append(li);}
      card.append(el('h3','',`${label} \u00b7 ${view.foundCount??view.tastedCount??view.knownCount} / ${view.total}`),list);
      // The words for what is in the glass arrive as the wine skill levels (src/wine.js).
      if(id==='wine'&&view.terms?.length){
        const words=el('ul','bird-list');
        for(const term of view.terms){const li=el('li','seen',term.name);li.append(el('small','',term.what));words.append(li);}
        card.append(el('h3','',`Words for it \u00b7 ${view.terms.length} / ${TASTING_TERMS.length}`),words);
      }
      // And the blocks walked with Imani, who grew what is in the glass (src/vineyard.js).
      if(id==='wine'&&vineyard.met){
        const rows=vineyard.view(),walked=el('ul','bird-list');
        for(const block of rows.blocks){const li=el('li',block.walked?'seen':'unseen',block.name);
          li.append(el('small','',block.walked?'Walked with Imani.':`A ${block.colour} block. Imani will walk you down it.`));walked.append(li);}
        card.append(el('h3','',`Rows walked \u00b7 ${rows.walkedCount} / ${rows.total}`),walked);
      }
      if(view.task)card.append(el('p','skill-task',`${view.task.title}: ${view.task.detail}`));
    }
    if(skill.id==='botany'&&skill.learned){
      const view=botany.view(),list=el('ul','bird-list');
      for(const entry of view.entries){const li=el('li',entry.found?'seen':'unseen',entry.found?`${entry.name}${entry.count>1?` \u00b7 found ${entry.count} times`:''}${entry.warning?' \u00b7 leave it':''}`:entry.name);li.append(el('small','',entry.detail));list.append(li);}
      card.append(el('h3','',`Plants named \u00b7 ${view.foundCount} / ${view.total}`),list);
    }
    if(skill.id==='mycology'&&skill.learned){
      const view=mycology.view(),list=el('ul','bird-list');
      for(const entry of view.entries){const li=el('li',entry.found?'seen':'unseen',entry.found?`${entry.name}${entry.count>1?` · found ${entry.count} times`:''}${entry.warning?' · leave it':''}`:entry.name);li.append(el('small','',entry.detail));list.append(li);}
      card.append(el('h3','',`Mushrooms named · ${view.foundCount} / ${view.total}`),list);
    }
    if(skill.id==='fishing'&&skill.learned){
      const view=fishing.view(),list=el('ul','bird-list');
      for(const entry of view.entries){const li=el('li',entry.caught?'seen':'unseen',entry.caught?`${entry.name}${entry.count>1?` · ${entry.count} landed`:''}`:entry.name);li.append(el('small','',entry.detail));list.append(li);}
      card.append(el('h3','',`Fish landed · ${view.caughtCount} / ${view.total}`),list);
    }
    if(skill.id==='birding'){
      const view=birding.view();
      if(view.met)card.append(el('p','skill-xp',`Observation range ${observeRange(skill.level)} m · B to observe · a new kind of bird is worth experience`));
      const list=el('ul','bird-list');
      for(const entry of view.entries){const li=el('li',entry.seen?'seen':'unseen',entry.seen?`${entry.name}${entry.count>1?` · seen ${entry.count} times`:''}`:entry.name);li.append(el('small','',entry.detail));list.append(li);}
      card.append(el('h3','',`Birds of Drent · ${view.seenCount} / ${view.total}`),list);
      if(view.task)card.append(el('p','skill-task',`${view.task.title}: ${view.task.detail}`));
    }
  }
  function refreshSkillsSheet(){
    const sheet=$('skills-sheet');sheet.replaceChildren();
    const view=skills.view(),open=openSkillId?view.find(entry=>entry.id===openSkillId):null;
    if(open)renderSkillGuide(sheet,open);else renderSkillGrid(sheet,view);
  }
  /** The journal, on the Skills tab, on one skill's guide: where a level-up banner sends you. */
  function openSkillGuide(id){
    if(!id||!Object.hasOwn(SKILLS,id)||!['playing','journal','pause'].includes(mode))return false;
    clearTimeout(levelUpTimer);$('level-up').classList.remove('visible','flash');
    modal('journal');journalTab('skills');openSkillId=id;refreshSkillsSheet();return true;
  }
  function ridingAct(action){
    const hitch=LUMBER_TOWN_STABLE.hitch;
    if(action==='fetch-horse'){riding.place(hitch,hitch.yaw);placeOwnHorse();toast('A stable boy goes out with a halter. Your horse is back in the yard.','LUMBER TOWN · THE STABLE YARD');saveRoad(false);return {ok:true};}
    const result=redeemHorse({inventory,riding,hitch});if(!result.ok){toast(result.reason,'THE STABLE YARD');return result;}
    placeOwnHorse();inventory.refresh();refreshQuest();audio?.effect('success');toast('A bay gelding, saddled, and yours. G mounts and dismounts · Shift canters · H whistles him up.','THE ARMY’S HORSE');saveRoad(false);return result;
  }
  const beggar=createBeggar({waypoints:TOWN_BEGGAR_ROUTE});
  const LUSCIA_NPC_IDS=new Set(LUSCIA_NPCS.map(person=>person.id));
  const smiths=npcData.find(person=>person.id===BEGGAR_NPC.id);
  // Regions the journal explains while the road is still Drent's: the start, its neighbors, and the main-quest path.
  const CAMPAIGN_JOURNAL_REGIONS=['Drent','Luscia','Pueth','Elagos','Peblos','Moros Plain','West Suval','East Suval'];
  let atlasRegions=null,atlasAdjacency=null;
  fetch('./assets/azhora-dev-regions.json').then(response=>response.ok?response.json():null).then(data=>{if(data?.regions){atlasRegions=data.regions;atlasAdjacency=computeAdjacency(data.regions);refreshChart();}}).catch(()=>{});
  const journeyGathered=new Set();
  let currentJourneySite=null,currentRegionId=1;
  let currentForestSite=null;
  let currentRegionalSite=null;
  let currentLusciaSite=null;
  let currentHideoutSite=null;
  let meadowCleared=false;
  const greenwayEncounter=GREENWAY_RAID;
  const meadowEncounter=AVREL_RAID;
  let roadStorage;try{roadStorage=window.azhoraRoadStorage||localStorage;}catch{/* Play remains available when storage is disabled. */}
  const checkpoint=createRoadCheckpoint({storage:roadStorage});
  let checkpointAvailable=checkpoint.read();
  let checkpointFailureShown=false;
  let currentAcorn=null,currentStick=null,currentFruit=null,nearRepair=false,currentFire=null,nearFishing=false,currentFishingSpot=null;
  let testingEnabled=false,pendingTesting=false,heardDoom=false;
  const mapTutorial=createMapTutorial();let regionCardTimer,mapTutorialTimer;
  let trackedPlaceId=null;
  const trailMap=createTrailMap({mount:$('trail-map'),getModel:localMapModel,onTrack:trackPlace,onClear:clearTrailPin});
  const developer=createDeveloperMode({renderer,normalScene:scene,world,player,onExit:()=>{mode='playing';stopInput();settleCamera();canvas.focus();}});
  function openDeveloper(){
    if(mode!=='testing')return false;
    closeModal();stopInput();mode='developer';
    audio?.update(.1,{position:player.group.position,speed:0,region:world.regionAt(player.group.position.x,player.group.position.z),playing:false});
    developer.open();return true;
  }

  // Regions are provinces of Azhora. Entering one shows a title card with its level and ruler,
  // autosaves, and on the first province beyond Drent starts the map tutorial.
  const regionInfoCache=new Map();
  function regionInfo(name){if(!regionInfoCache.has(name))regionInfoCache.set(name,describeRegion(name)??null);return regionInfoCache.get(name);}
  /**
   * The header above the region name, which is on screen the whole time you are in a country.
   * It says who holds the place and nothing about how hard it is: the difficulty is the region
   * card's, in the ladder's words, once, on entering, and the number belongs to the cartography
   * journal alone and only once the country is charted (docs/design-answers.md, and the note at
   * the head of src/region-levels.js). It used to read LEVEL 0 · AMBRONI EMPIRE.
   */
  function regionKicker(region){
    if(isOpenCountry(region))return 'AZHORA · NO COUNTRY CLAIMS THIS';
    const info=regionInfo(region.name);return info?info.faction.name.toUpperCase():`AZHORA · ${region.name.toUpperCase()}`;}
  function enterRegion(region){
    const open=isOpenCountry(region),info=open?null:regionInfo(region.name);
    $('region-card-name').textContent=region.name;$('region-card-subtitle').textContent=region.subtitle||'';
    // The card gives a country's difficulty in words; the number is the cartography journal's (docs/design-answers.md).
    // A country the ladder has no words for - one off the atlas's 131 - says who holds it and
    // nothing else, rather than falling back on the number the journal is the only place for.
    $('region-card-detail').textContent=open?'OUTSIDE EVERY BORDER THE ATLAS DRAWS'
      :levelWords(regionLevel(region.name))?`${levelWords(regionLevel(region.name)).toUpperCase()}${info?` · ${info.faction.name.toUpperCase()}`:''}`
      :info?info.faction.name.toUpperCase():'';
    $('region-card').classList.add('visible');clearTimeout(regionCardTimer);regionCardTimer=setTimeout(()=>$('region-card').classList.remove('visible'),5200);
    if(questStage>=1)saveRoad(false);
    if(mapTutorial.shouldStart({regionId:region.id,mode})&&mapTutorial.start())renderMapTutorial();
  }
  function renderMapTutorial(){
    const view=mapTutorial.view(),panel=$('map-tutorial');clearTimeout(mapTutorialTimer);
    if(!view.card){panel.classList.add('hidden');return;}
    $('map-tutorial-kicker').textContent=view.card.kicker;$('map-tutorial-title').textContent=view.card.title;$('map-tutorial-text').textContent=view.card.text;
    $('map-tutorial-hint').hidden=!view.card.key;if(view.card.key)$('map-tutorial-key').textContent=view.card.key;
    panel.classList.remove('hidden');
    if(view.done)mapTutorialTimer=setTimeout(()=>panel.classList.add('hidden'),7000);
  }
  // Every message and every conversation, kept for a review run to read back (see --opening-review).
  const reviewLog={toasts:[],lines:[]};
  function toast(title,kicker='ALONG THE WAY') {
    reviewLog.toasts.push({at:Math.round(playSeconds),kicker,title});if(reviewLog.toasts.length>600)reviewLog.toasts.shift();
    $('toast').replaceChildren();const small=document.createElement('small');small.textContent=kicker;
    $('toast').append(small,document.createTextNode(title));$('toast').classList.add('visible');
    clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),4200);
  }
  // The main quest as the player reads it: numbered chapters (src/story-chapters.js).
  const storyState=()=>({questStage,journey:journey.view(),luscia:{...luscia.state},moros:moros.view(),border:border.view(),aftermath:aftermath.view(),side:campaign.view().side,home:atSideSeat(campaign.view().side,player.group.position,aftermath.view().complete?aftermath.view().variant:null)});
  let chapterShown=0;
  function refreshChapter(){
    const state=storyState(),progress=chapterProgress(state),current=progress.current;
    $('quest-chapter').textContent=current?`Chapter ${current.number} of ${chapterCount} · ${chapterTitle(current,state)}`:'The war moves on';
    $('chapter-heading').textContent=chapterLabel(current,state);
    $('chapter-goal').textContent=current?chapterGoal(current,state):'Every chapter built so far is behind you.';
    const list=$('chapter-list');list.replaceChildren();
    for(const entry of progress.list){
      const item=document.createElement('li');item.className=entry.state;
      item.textContent=`${entry.state==='done'?'✓ ':''}${chapterTitle(entry,state)}`;
      if(entry.state!=='later'){const note=document.createElement('small');note.textContent=chapterGoal(entry,state);item.append(note);}
      list.append(item);
    }
    // A chapter closing is worth a word, once.
    const reached=current?current.number:chapterCount+1;
    if(chapterShown&&reached>chapterShown){
      const closed=progress.done.at(-1);
      if(closed)toast(chapterTitle(closed,state),`CHAPTER ${closed.number} COMPLETE · J FOR THE JOURNAL`);
    }
    chapterShown=reached;
  }
  function refreshQuest() {
    if(questStage===10){
      journey.start();const quest=journey.view();
      if(quest.complete&&campaign.view().chapterId==='luscia-aftermath')luscia.start();
      if(border.state.complete&&!aftermath.state.variant&&AFTERMATH_VARIANTS[campaign.view().chapterId])aftermath.start(campaign.view().chapterId);
      refreshChapter();
      if(aftermath.state.variant){const chapter=aftermath.view();$('quest-title').textContent=chapter.title;$('quest-detail').textContent=aftermathBuilt(aftermath.spec)||chapter.complete?chapter.detail:`${chapter.detail} That ground is not built yet.`;$('quest-step').textContent=chapter.kicker;return;}
      if(moros.state.complete&&campaign.view().chapterId==='suval-envoy'&&!border.state.started)border.start();
      if(border.state.started){const chapter=border.view();$('quest-title').textContent=chapter.title;$('quest-detail').textContent=chapter.detail;$('quest-step').textContent=chapter.kicker;return;}
      if(luscia.state.complete&&campaign.view().chapterId==='moros-camp'&&!moros.state.started)moros.start();
      if(horseWaiting({inventory,riding})&&moros.view().stage==='report-at-gate'){$('quest-title').textContent=OSTLER_OBJECTIVE.title;$('quest-detail').textContent=OSTLER_OBJECTIVE.detail;$('quest-step').textContent=OSTLER_OBJECTIVE.kicker;return;}
      if(moros.state.started){const chapter=moros.view();$('quest-title').textContent=chapter.title;$('quest-detail').textContent=chapter.detail;$('quest-step').textContent=chapter.kicker;return;}
      if(luscia.state.started){const chapter=luscia.view();$('quest-title').textContent=chapter.title;$('quest-detail').textContent=chapter.detail;$('quest-step').textContent=chapter.kicker;return;}
      $('quest-title').textContent=quest.title;$('quest-detail').textContent=quest.detail;
      $('quest-step').textContent=quest.complete?'THE ROAD OUT OF DRENT · RESTORED':`THE ROAD OUT OF DRENT · ${quest.regionName.toUpperCase()}`;
      return;
    }
    refreshChapter();
    const quest=questSteps[questStage];$('quest-title').textContent=quest.title;$('quest-detail').textContent=quest.detail;
    $('lesson-title').textContent=quest.lesson;$('lesson-hint').textContent=quest.hint;
    $('quest-step').textContent=questStage===10?'TIDEHAVEN · COMPLETE':`FIRST SHORE · ${questStage+1} / ${questSteps.length-1}`;
  }
  function updateQuest(event) {
    const previous=questStage;questStage=advanceQuest(questStage,event);
    if(previous===questStage)return;
    if(questStage===2){inventory.grant('harbor-letter');combat.startPractice(world.training);releaseLandingMate();}
    if(previous===2&&questStage===3){combat.finishPractice();audio?.effect('success');}
    if(questStage===5)audio?.effect('success');
    if(questStage===6)inventory.grant('road-token');
    refreshQuest();
    if(questStage===2)toast('the letter of introduction','ADDED TO SATCHEL · I TO OPEN');
    else if(questStage===6)toast('Eren’s travel token','ADDED TO SATCHEL · PRESS I');
    else if(questStage===7)toast('Message inspected. Close your satchel to continue.','I OR ESC · BACK TO THE WORLD');
    else toast(questSteps[questStage].title,questStage===10?'TIDEHAVEN SECURED · THE FOREST ROAD LIES AHEAD':'JOURNAL UPDATED');
    if(questStage>=1&&!testingEnabled)saveRoad(false);
  }
  // The opening screen's other way in: stand where the newest built chapter begins, with the road behind you.
  // Nothing is saved from this start, so a saved adventure is never overwritten (src/story-starts.js).
  function beginNewestChapter(){return beginStoryStart(newestStart());}
  function beginStoryStart(entry){
    const stand=entry&&world.npcPositions[entry.beside];
    if(!entry||!stand||!['opening','playing','pause','journal','testing'].includes(mode))return false;
    campaign.restore(createCampaign().snapshot());for(const id of entry.completed)campaign.completeChapter(id);
    // Everything before the start happened, including the report for duty in Lumber Town:
    // without it the chapter count stays on Chapter 1 however well Chapter 2 is played.
    if(entry.completed.includes('luscia-aftermath')){const done=luscia.snapshot();luscia.restore({version:done.version,revision:5,started:true,briefed:true,satchelTaken:true,wolvesCleared:true,returned:true});}
    if(entry.completed.includes('moros-camp')){const done=moros.snapshot();moros.restore({version:done.version,revision:4,started:true,admitted:true,mustered:true,horseClaimed:true});}
    questStage=10;practiceHits=2;practiceDodges=1;testingEnabled=true;meadowCleared=true;
    for(const id of ['harbor-letter','road-token','tinderbox'])inventory.grant(id);
    const purse=inventory.count(COPPER_ITEM);if(purse<entry.purse)inventory.add(COPPER_ITEM,entry.purse-purse);
    combat.startPractice(world.training);combat.finishPractice();weapons.repair();
    journey.start();syncJourney();if(!border.state.started)border.start();
    const spot=startingSpot(stand,(x,z)=>canStand(x,z,world,.45));
    if(!spot){toast('There is no room to stand where that chapter begins.','THE NEWEST CHAPTER');return false;}
    player.group.position.set(spot.x,world.heightAt(spot.x,spot.z),spot.z);grounded=true;verticalSpeed=0;
    yaw=Math.atan2(-(stand.x-spot.x),-(stand.z-spot.z));pitch=.35;distance=targetDistance=8;
    if(entry.horse&&!riding.owned){const hitch=startingSpot(spot,(x,z)=>canStand(x,z,world,RIDE.radius),{reaches:[3,4.5,6]});if(hitch&&riding.grant(hitch,yaw).ok){riding.teach();placeOwnHorse();}}
    mapFog.reveal(spot.x,spot.z);
    leaveOpening();
    mode='playing';document.body.classList.add('playing');show('opening',false);show('modal-backdrop',false);show('journal',false);show('pause',false);show('testing',false);show('testing-badge',true);
    refreshQuest();refreshChart();inventory.refresh();stopInput();settleCamera();canvas.focus();
    toast(`${entry.title}. Nothing is saved from this start; your saved adventure is untouched.`,entry.kicker);
    return true;
  }
  function begin() {
    if(mode!=='opening')return;
    campaign.restore(createCampaign().snapshot());
    grantStartingKit();
    playSeconds=0;refugeeHold=0;settleMercenaries();mercenaryWeapons.clear();
    mode='arriving';document.body.classList.add('playing','cutscene');$('opening').style.opacity='0';$('opening').style.transform='translateY(15px)';
    // The bell no longer rings here: the sequence rings it at thirty seconds, while the boat is
    // still off the pier's end and the traveler can hear it come across the water.
    opening=variantFor(playerId);openingTime=0;openingFired=0;openingBells=0;mateSaidGoodbye=false;player.group.visible=false;
    show('cutscene',true);$('cutscene-eyebrow').textContent='';$('cutscene-text').textContent='';$('cutscene').querySelector('.cutscene-caption').style.opacity='0';
    setTimeout(()=>show('opening',false),700);canvas.focus();
    if(autopilot.active)skipOpening();
  }
  /**
   * Whoever is in the bow: the first man of the company, which is Chris Gotwood unless you are
   * Chris, when it is Cromb standing in the slot you left (companyFor, src/player-characters.js).
   */
  const companionNpcId=()=>landingMateId();
  /** The end of the opening, reached or skipped: the landing, exactly as src/opening-sequence.js says it. */
  function landOpening(){
    if(mode!=='arriving'||!opening)return;
    for(const e of eventsBetween(openingFired,Infinity,opening.id))if(e.type==='bell'){openingBells++;world.ringBell?.(elapsed);audio?.effect('bell');}
    const s=SKIP_BY_VARIANT[opening.id],landed=s.landed;
    world.restArrivalBoat();
    player.group.visible=true;player.group.position.set(landed.traveler.x,world.heightAt(landed.traveler.x,landed.traveler.z),landed.traveler.z);player.group.rotation.y=landed.traveler.yaw;
    grounded=true;verticalSpeed=0;yaw=landed.view.yaw;pitch=landed.view.pitch;distance=targetDistance=landed.view.distance;
    settleMercenaries();settleCamera();camera.position.set(s.camera.position.x,s.camera.position.y,s.camera.position.z);
    opening=null;document.body.classList.remove('cutscene');show('cutscene',false);
    mode='playing';stopInput();canvas.focus();refreshQuest();
    toast(landed.toast.title,landed.toast.kicker);
    if(pendingTesting){pendingTesting=false;modal('testing');}
  }
  function skipOpening(){landOpening();}
  /**
   * The man off your boat walks you up the pier until the letter is in your satchel, because he
   * is the only person in Azhora who can tell you what the harbourmaster is saying (INTERPRETER,
   * src/languages.js). He is placed at your shoulder every frame the way the hideout garrison is
   * placed while escorting; the pier is three metres wide, so escortSpotFor tries each side and
   * then directly behind, and leaves him where he is rather than put him in the water.
   */
  function escortLandingMate(){
    const mate=npcById.get(landingMateId());
    // Derived, not remembered (mateIsEscorting): every path that sets questStage without
    // replaying the letter — a restored save, the testing tools, a story start, a review view —
    // ends the escort by arithmetic rather than by being told.
    const walking=mateIsEscorting({mate,questStage,mode,arriving:!!opening});
    if(!mate)return;
    if(!walking){if(mate.escorting){mate.escorting=false;mate.pace=undefined;}return;}
    const spot=escortSpotFor({x:player.group.position.x,z:player.group.position.z,yaw:player.group.rotation.y},(x,z)=>canStand(x,z,world));
    if(spot){
      world.npcPositions[mate.id]={x:spot.x,z:spot.z};
      // His placement is what interpreterNearby measures from, so it has to follow him and not
      // stay at the landing ring placeMercenaries() put it at a moment ago.
      mate.placement={id:mate.id,name:mate.name,phase:'landing',distance:0,stopId:null,x:spot.x,z:spot.z,yaw:player.group.rotation.y,walking:true};
    }
    // The first frame he escorts, he is still out by the boat where the sequence left him. The
    // straight line from there to your shoulder runs along the deck's outer edge, so he is put
    // beside you at once instead — on the frame the cutscene ends, with the camera behind you.
    if(spot&&!mate.escorting)mate.actor.group.position.set(spot.x,world.heightAt(spot.x,spot.z),spot.z);
    mate.hidden=false;mate.escorting=true;mate.pace=4.6;
  }
  /**
   * The npc loop steers him round the traveler's own body, and the pier is three metres wide, so
   * a sidestep can put him over water. This runs after the loop has moved him: if he is off the
   * boards, he goes back to the spot escortSpotFor chose, which is proved standable at canStand's
   * own default radius, the strictest the game uses (tests/opening-sequence.test.js walks the
   * whole pier at it). He is never left in the sea.
   */
  function keepLandingMateOnFooting(){
    const mate=npcById.get(landingMateId());
    if(!mate?.escorting)return;
    const pos=mate.actor.group.position;
    if(canStand(pos.x,pos.z,world))return;
    const home=world.npcPositions[mate.id];
    if(home)pos.set(home.x,world.heightAt(home.x,home.z),home.z);
  }
  /**
   * The letter is taken, so he stops walking with you and says so.
   *
   * He can only appear to jump if you kept him past the hour he would have left the landing
   * anyway: under that, his own clock has not started and he is standing at the landing ring
   * regardless. So the roster's clock is shifted by the overrun and by nothing else, which keeps
   * the whole company's timing identical to what it was for any play that does not dawdle.
   * He is not moved: placeMercenaries() gives him the landing ring again and he walks back to it.
   */
  function releaseLandingMate(){
    if(mateSaidGoodbye)return;
    mateSaidGoodbye=true;
    const mateId=landingMateId(),mate=npcById.get(mateId);
    const entry=roster.find(man=>man.id===mateId);
    const overrun=entry?Math.max(0,playSeconds-entry.arrival-entry.departs):0;
    if(overrun>0){
      roster=roster.map(man=>man.id===mateId?Object.freeze({...man,arrival:man.arrival+overrun}):man);
      company=createMercenaryCompany({...companyPlan,roster});
    }
    if(!mate)return;
    mate.escorting=false;mate.pace=undefined;
    toast('I will give the village a look and come up the road after you. No sense the two of us crowding one quartermaster.',`${mate.name.toUpperCase()} \u00b7 ON THE LANDING`);
  }
  /** Any start that is not the boat: the harbour as built, the traveler on their feet. */
  function leaveOpening(){opening=null;world.restArrivalBoat();player.group.visible=true;document.body.classList.remove('cutscene');show('cutscene',false);}
  function stopInput(){keys.clear();drag=false;}
  function settleCamera(){
    cameraFocus.copy(player.group.position).add(new THREE.Vector3(0,1.5,0));
    camera.position.set(cameraFocus.x+Math.sin(yaw)*distance*Math.cos(pitch),cameraFocus.y+Math.sin(pitch)*distance,cameraFocus.z+Math.cos(yaw)*distance*Math.cos(pitch));
    camera.lookAt(cameraFocus);
  }
  function toggleInventory(){
    if(mode==='inventory'){inventory.close();return;}
    if(!['playing','journal','pause','testing'].includes(mode))return;
    if(mode!=='playing')closeModal();
    mode='inventory';stopInput();show('interaction',false);show('lesson',false);
    inventory.open({lesson:questStage===6||questStage===7});$('inventory-button').setAttribute('aria-expanded','true');
  }
  function modal(name) {
    if(!['playing','journal','pause','testing'].includes(mode))return;
    stopInput();lastModalFocus=document.activeElement;mode=name;show('modal-backdrop',true);show('journal',name==='journal');show('pause',name==='pause');show('testing',name==='testing');show('defeat',false);show('interaction',false);
    if(name==='journal')refreshJournal();(name==='journal'?$('tab-journey'):name==='testing'?$('test-prepare'):$('resume')).focus();
  }
  function closeModal() {
    if(mode==='defeated')return;
    show('modal-backdrop',false);show('journal',false);show('pause',false);show('testing',false);show('defeat',false);mode='playing';stopInput();lastModalFocus?.focus();canvas.focus();
  }
  function journalTab(tab){
    if(mapTutorial.noteJournalTab(tab)){renderMapTutorial();if(questStage>=1)saveRoad(false);}
    if(tab==='world'){const p=player.group.position;worldMap.setTraveler(HEX_WORLD_TRANSFORM.worldToAtlas(p.x,p.z),
      {region:world.regionAt(p.x,p.z)?.name??null,heading:HEX_WORLD_TRANSFORM.worldHeadingToAtlas(player.group.rotation.y)});refreshChart();}
    show('world-map',tab==='world');show('journal-content',tab==='journey');show('trail-map',tab==='trails');show('skills-sheet',tab==='skills');if(tab==='skills'){openSkillId=null;refreshSkillsSheet();}
    for(const [id,name] of [['tab-map','world'],['tab-journey','journey'],['tab-trails','trails'],['tab-skills','skills']])$(id).classList.toggle('active',tab===name);
    $('journal').classList.toggle('map-open',tab==='world');$('journal').classList.toggle('trail-open',tab==='trails');
    $('journal-title').textContent=tab==='world'?'Azhora':tab==='trails'?'Paths worth taking':tab==='skills'?'What you have learned':'Small beginnings';
    if(tab==='world'){worldMap.open();$('tab-map').focus();}
    if(tab==='trails'){trailMap.open();$('tab-trails').focus();}
    if(tab==='skills')$('tab-skills').focus();
  }
  function mapTab(map){journalTab(map?'world':'journey');}
  function openLocalMap(){
    if(!['playing','journal','pause'].includes(mode))return false;
    modal('journal');journalTab('trails');return true;
  }
  function localMapKnown(){
    const forest=forestStory.state,hideout=forestHideout.state;
    const knownIds=new Set([...discoveries,...forest.inspected]);
    if(forest.workAccepted)knownIds.add('charcoal-hearth');
    if(hideout.inspected)knownIds.add(FOREST_HIDEOUT_QUEST.siteId);
    const knownNPCs=new Set();
    const regional=regionalLife.view();
    for(const id of regional.knownIds){knownIds.add(id);if(world.npcPositions[id])knownNPCs.add(id);}
    for(const npc of REGIONAL_LIFE_NPCS)if(regional.knownIds.includes(npc.id)||discoveries.has(({2:'mill-commons',3:'landing-workshop',4:'waystation-shelter'})[world.regionAt(npc.x,npc.z)?.id]))knownNPCs.add(npc.id);
    if(questStage>=1)knownNPCs.add(GARDEN_KEEPER.id);
    if(discoveries.has('village'))for(const id of ['fisher','acorn-cook','doomsayer','forest-woodcutter',GARDEN_KEEPER.id])knownNPCs.add(id);
    if(questStage>=5)knownNPCs.add('warden');
    if(discoveries.has('pond')||inventory.has('fishing-rod'))knownNPCs.add('pond-fisher');
    if(forest.workAccepted||forest.bundleRecovered)knownNPCs.add('forest-woodcutter');
    if(hideout.inspected)knownNPCs.add('garrison-captain');
    if(acornQuest.status!=='available')knownNPCs.add('acorn-cook');
    if(katy.stage!=='unmet')knownNPCs.add(KATY.id);
    if(vineyard.met)knownNPCs.add(IMANI.id);
    if(light.met)knownNPCs.add(ADDISON.id);
    if(heist.spoke)knownNPCs.add(SUBTRACTIDAUGHTER.id);
    if(heardDoom)knownNPCs.add('doomsayer');
    if(questStage===10)for(const id of journey.view().destinationIds)if(world.npcPositions[id])knownNPCs.add(id);
    for(const npc of JOURNEY_NPCS){const home=world.npcPositions[npc.id];if(discoveries.has(({2:'sunmeadow',3:'reedwater',4:'threefold'})[world.regionAt(home.x,home.z)?.id]))knownNPCs.add(npc.id);}
    const knownLocations=npcData.filter(npc=>knownNPCs.has(npc.id)).map(npc=>({id:npc.id,name:npc.name,description:npc.role,x:npc.actor.group.position.x,z:npc.actor.group.position.z}));
    for(const site of REGIONAL_LIFE_SITES)if(knownIds.has(site.id)&&!world.landmarks.some(place=>place.id===site.id))knownLocations.push({...site,description:site.note||site.prompt});
    return {knownIds,knownLocations};
  }
  function localMapModel(regionId){
    const known=localMapKnown();
    // The watched bird rides along on the sheet as it was when he opened the journal, which is what a note is.
    return {...buildLocalMapModel({world,position:player.group.position,heading:Math.PI-player.group.rotation.y,discoveries,...known,goal:destination(),regionId,trackedId:trackedPlaceId}),bird:birdWatch};
  }
  function trackedPlace(){
    if(!trackedPlaceId)return null;
    const {knownIds,knownLocations}=localMapKnown(),place=knownLocations.find(p=>p.id===trackedPlaceId)||world.landmarks.find(p=>p.id===trackedPlaceId&&knownIds.has(p.id));
    return place||null;
  }
  function trackPlace(id){
    const previous=trackedPlaceId;trackedPlaceId=id;
    const point=trackedPlace();if(!point){trackedPlaceId=previous;return false;}
    toast(`${point.name} is marked in teal. Follow the paths; the marker shows its direction.`, 'LOCAL TRAIL · L TO REVIEW');updateHUD();return true;
  }
  function clearTrailPin(){trackedPlaceId=null;trailMarker.visible=false;updateHUD();}
  // Where the traveler stands in the hired company: who has landed, who has mustered, and the traveler's place on the road.
  function companyStanding(){
    const s=company.summary(playSeconds),rank=company.travelerRank(playSeconds,distanceAlongRoad(world.paths[0],{x:player.group.position.x,z:player.group.position.z}));
    const ordinal=n=>n+(n%100>=11&&n%100<=13?'th':['th','st','nd','rd'][n%10]||'th');
    return ` · the company: ${s.arrived} of ${s.total} landed, ${s.mustered} at the muster, you stand ${ordinal(rank)} on the road`;
  }
  function refreshCampaign(){
    refreshChapter();
    const view=campaign.view(),control=campaign.mapControl();
    $('campaign-chapter-title').textContent=`${view.title}${view.region?` · ${view.region}`:''}${view.levelName?` · level ${view.level} ${view.levelName}`:''}`;
    $('campaign-chapter-detail').textContent=view.detail;
    $('campaign-standing').textContent=`${view.sideName}${view.exposed?' · your double-dealing is known':''} · Empire trust ${Math.round(view.trust.empire)} · Coalition trust ${Math.round(view.trust.coalition)}${view.horse?' · an army horse':''}${companyStanding()}`;
    const list=$('campaign-regions');list.replaceChildren();
    for(const id of CAMPAIGN_JOURNAL_REGIONS){
      const info=describeRegion(id,atlasRegions,atlasAdjacency);if(!info)continue;
      const li=document.createElement('li');li.textContent=`${id} · level ${info.level} ${info.levelName}`;
      const small=document.createElement('small');const holder=FACTIONS[control[id]]??info.faction;
      small.textContent=`${holder.name}. ${info.threats.length?info.threats.map(threat=>threat.name).join(', ')+'. ':'No wild threats. '}${info.role}`;
      li.append(small);list.append(li);
    }
  }
  // The chart, and the legend under it: charted ground for the traveler, or how far each region is built for the developer.
  // What the chart marks: the named ground the traveler has charted, and the places they have found inside it.
  function chartMarks(){
    const view=mapFog.view(),atlas=(x,z)=>HEX_WORLD_TRANSFORM.worldToAtlas(x,z);
    const areas=chartRevealed?view.subregions:view.found;
    // A place that is the named area itself, by name or by standing at its middle, is marked once.
    const plain=name=>name.replace(/^the\s+/i,'').toLowerCase();
    const named=new Set(areas.map(area=>plain(area.name)));
    const found=world.landmarks.filter(place=>(chartRevealed||(discoveries.has(place.id)&&mapFog.knowsPoint(place.x,place.z)))
      &&!named.has(plain(place.name))&&!areas.some(area=>Math.hypot(area.x-place.x,area.z-place.z)<30));
    return [...areas.map(area=>({id:area.id,name:area.name,kind:'area',...atlas(area.x,area.z)})),
      ...found.map(place=>({id:place.id,name:place.name,kind:'place',...atlas(place.x,place.z)}))];
  }
  function refreshChart(){
    // The shapes and the names the dark chart draws over the atlas (src/cartography.js); the atlas's
    // own cells arrive from the fetch above, so a coast the game has not built - Feradom - is drawn
    // from the same source as one it has.
    const drawn=chartShapes(cartography.view().entries,atlasRegions);
    worldMap.setChart({cells:mapFog.cells,reveal:chartRevealed,status:buildStatusList(),marks:chartMarks(),
      silhouettes:drawn.silhouettes,labels:drawn.labels});
    const legend=$('atlas-legend'),view=mapFog.view();legend.replaceChildren();
    const el=(tag,text,cls)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
    const list=document.createElement('ul');
    if(chartRevealed){
      legend.append(el('h4','Developer · how far each region is built'));
      for(const region of buildStatusList()){
        const item=document.createElement('li'),swatch=el('i','','swatch');swatch.style.background=region.colour;
        item.append(swatch,el('b',`${region.id} · ${region.label}`));
        item.append(el('small',region.work?`${region.detail} Left to do: ${region.work}`:region.detail));
        list.append(item);
      }
    } else {
      const countries=cartography.view();
      legend.append(el('h4',`Countries · ${countries.explored} walked, ${countries.charted} charted, ${countries.heard} heard of`));
      const known=document.createElement('ul');known.className='chart-countries';
      for(const country of countries.entries){const item=document.createElement('li');
        const said=country.state==='explored'?'Walked':country.state==='charted'?'A shape against the sea':'Heard of, and roughly where';
        item.append(el('b',country.named?country.name:'A coast with no name on it'),
          el('small',country.level===null?said:`${said} · level ${country.level} · ${country.words}`));known.append(item);}
      legend.append(known);
      legend.append(el('h4',`Charted ground · ${view.foundCount} of ${view.total} named areas · ${view.cellCount} hexes`));
      if(!view.foundCount)list.append(el('li','Nothing is charted yet. The chart fills in as you walk.'));
      for(const area of view.found){const item=document.createElement('li');item.append(el('b',`${area.name} · ${area.region}`),el('small',area.note));list.append(item);}
    }
    legend.append(list);
  }
  function refreshJournal() {
    refreshCampaign();
    $('journal-quest-title').textContent=questSteps[questStage].title;$('journal-quest-detail').textContent=questSteps[questStage].detail;show('letter',inventory.has('harbor-letter'));
    $('journal-steps').replaceChildren();
    questSteps.slice(0,-1).forEach((step,i)=>{const li=document.createElement('li');li.textContent=(i<questStage?'✓ ':i===questStage?'→ ':'')+step.title;li.className=i<questStage?'done':i===questStage?'current':'';$('journal-steps').append(li);});
    $('places').replaceChildren();
    const regional=regionalLife.view();
    show('journal-regional-life',regional.entries.length>0||regional.tasks.length>0);
    $('regional-life-notes').replaceChildren();
    for(const entry of [...regional.tasks,...regional.entries]){const li=document.createElement('li');li.textContent=(entry.complete?'\u2713 ':'')+entry.title;const detail=document.createElement('small');detail.textContent=[entry.detail,entry.afterword].filter(Boolean).join(' ');li.append(detail);$('regional-life-notes').append(li);}
    const forest=forestStory.view();
    $('journal-forest-detail').textContent=forest.task?.detail||'Take the small paths off the Greenway. Tamsin, the woodcutter at the village edge, knows who works among these trees.';
    $('forest-notes-count').textContent=`${forest.discoveredCount} / ${forest.totalSites} woodland notes`;
    $('forest-notes').replaceChildren();
    for(const entry of forest.entries){const li=document.createElement('li');li.textContent=entry.title;const note=document.createElement('small');note.textContent=[entry.detail,entry.afterword].filter(Boolean).join(' ');li.append(note);$('forest-notes').append(li);}
    const hideout=forestHideout.view();show('journal-hideout',hideout.discovered);
    $('journal-hideout-title').textContent=hideout.title;$('journal-hideout-detail').textContent=hideout.detail;
    for(const place of world.landmarks){const li=document.createElement('li');li.textContent=discoveries.has(place.id)?place.name:'Undiscovered place';const desc=document.createElement('small');desc.textContent=discoveries.has(place.id)?place.description:'Take a path you have not walked.';li.append(desc);$('places').append(li);}
    $('journal-acorns').textContent=acornQuest.status==='complete'?'You brought Lysa five acorns. She gave you a tinderbox, remembers your kindness, and welcomes your company.':acornQuest.status==='active'?`Gather fallen acorns beneath the broad-leaved trees and bring five to Lysa for a tinderbox. In your satchel: ${inventory.count('acorn')} / 5.`:'Lysa tends an outdoor kitchen by the western village cottage. Stop and introduce yourself; she may have a small favor to ask.';
    $('lysa-friendship').textContent=acornQuest.status==='complete'?'Lysa · Fond of you':acornQuest.status==='active'?'Lysa · Acquaintance':'A neighbor to meet';
    {const view=renaLetters.view();show('journal-letters',view.started);$('journal-letters-title').textContent=view.title;$('journal-letters-detail').textContent=view.detail;$('journal-letters-standing').textContent=view.standing;$('journal-letters-pages').replaceChildren(...view.pages.flatMap(page=>{const heading=document.createElement('h4');heading.textContent=page.heading;return [heading,...page.lines.map(line=>{const p=document.createElement('p');p.textContent=line;return p;})];}));}
    show('journal-doom',heardDoom);
    $('journal-camp-detail').textContent=!inventory.has('fishing-rod')?'Meet Bran at Willowmere Pond, east of the forest road beyond Eren’s watch. Ask him to teach you fishing; he will give you a rod.':!inventory.has('tinderbox')?'You have a fishing rod. Bring Lysa five acorns to receive a tinderbox, then gather two sticks for a cooking fire. Orris near her cottage can explain.':`You have a rod and tinderbox. F casts at the pond or Caloss bank; wait for a bite and press F to reel. Two sticks light a fire ring for cooking. Raw fish: ${inventory.count('raw-fish')}. Cooked fish: ${inventory.count('cooked-fish')}. Eat cooked fish from I to restore up to 40 health.`;
    if(questStage===10){const next=journey.view();$('journal-quest-title').textContent=next.title;$('journal-quest-detail').textContent=next.detail;}
    $('journey-regions').replaceChildren();
    for(const region of world.regions||[]){
      const item=document.createElement('li');item.textContent=`${journey.state.completedRegions.includes(region.id)?'✓ ':''}${region.name}`;
      const detail=document.createElement('small');detail.textContent=region.description||region.subtitle;item.append(detail);$('journey-regions').append(item);
    }
  }
  function syncJourney(){
    const state=journey.state;
    for(const id of state.parcels)world.setJourneySiteState(id.startsWith('cart-')?id:`cart-parcel-${id}`,true);
    if(state.bridgeRepaired)world.setJourneySiteState('bridge-repair',true);
    for(const id of state.beacons)world.setJourneySiteState(id.startsWith('beacon-')?id:`beacon-${id}`,true);
    for(const id of journeyGathered)world.setJourneySiteState(id,true);
  }
  function journeyAct(action){
    const result=journey.act(action);if(!result.ok){toast(result.reason||'Speak with the road keeper first.','THE DRENT ROAD');return result;}
    syncJourney();refreshQuest();inventory.refresh();audio?.effect('success');
    const complete=journey.view().complete;
    if(complete&&campaign.view().chapterId==='drent-road'){campaign.completeChapter('drent-road');inventory.add('copper-piece',12);inventory.refresh();refreshQuest();}
    toast(complete?'The road is restored. Iven will send your report ahead; Luscia waits across the Caloss.':journey.view().title,complete?'THE ROAD IS RESTORED':'JOURNAL UPDATED');
    if(!testingEnabled)saveRoad(false);
    return result;
  }
  function lusciaAct(action){
    const result=luscia.act(action);if(!result.ok){toast(result.reason||'Speak with Iven at the relay post first.','THE FIELD AT THE LAUVEL');return result;}
    refreshQuest();inventory.refresh();audio?.effect('success');
    if(result.startEncounter===LUSCIA_WOLVES.id){
      saveRoad(false);
      if(combat.startEncounter(LUSCIA_WOLVES)){stopInput();toast('Two wolves come off the burial line. Give their lunges room, or back east onto the open grass.','THE LAUVEL · WOLVES');audio?.effect('bell');}
      return result;
    }
    if(action==='return-courier-satchel'&&campaign.view().chapterId==='luscia-aftermath')campaign.completeChapter('luscia-aftermath');
    // The campaign has moved on: let the quest panel open the Moros chapter at once.
    refreshQuest();
    const view=luscia.view();
    toast(view.complete?'The rolls are filed. An army horse token and twenty copper for the road west.':view.title,view.complete?'LUSCIA · CHAPTER COMPLETE':'JOURNAL UPDATED');
    saveRoad(false);
    return result;
  }
  // The fork and the border battle. Allies are whoever of the hired company has mustered, filled out with soldiers;
  // on the Republic's side they are the valley companies. Hold the traveler's corner and the day is won.
  function borderAllies(side){
    if(side==='coalition')return [1,2,3,4].map(n=>({id:`valley-company-${n}`,name:n===1?'Valley sergeant':'Valley company',kind:n===1?'officer':'legionary',model:{role:'suvali-guard',tunic:n%2?0x3f5f86:0x55636f}}));
    const mustered=company.placements(playSeconds).filter(p=>p.phase==='mustered').slice(0,4).map(p=>{const merc=mercenaryById(p.id);return {id:merc.id,name:merc.name,kind:'legionary',model:{role:'mercenary',tunic:merc.look.tunic,skin:merc.look.skin,look:{...merc.look,weapon:merc.weapon,trades:false}}};});
    for(let n=1;mustered.length<3;n++)mustered.push({id:`line-legionary-${n}`,name:'Soldier',kind:'legionary'});
    return mustered;
  }
  // The day after the battle: one more fight beside the same allies, then the pay and the road onward.
  function aftermathAct(action){
    const result=aftermath.act(action);if(!result.ok){toast(result.reason,'AFTER THE BATTLE');return result;}
    const spec=aftermath.spec,banner=spec.title.toUpperCase();
    if(result.startEncounter){
      saveRoad(false);
      const fight=aftermathEncounter(spec.id,aftermathArena(spec.arena),borderAllies(spec.side));
      // The company forms up on its own ground: the commander gives the word at the rally,
      // which can stand beyond the fight's own retreat line (Solis's gate, for a fight in the square).
      if(!fight||!combat.startEncounter(fight,{atCheckpoint:true})){aftermath.endEncounter(spec.encounterId);toast('Your company is not formed up. Stand with your commander and give the word again.',banner);return {ok:false,reason:'The encounter could not start.'};}
      stopInput();toast(spec.toasts.start,banner);audio?.effect('bell');
      return result;
    }
    inventory.add(COPPER_ITEM,result.reward);inventory.refresh();
    if(campaign.view().chapterId===result.campaignChapter)campaign.completeChapter(result.campaignChapter);
    refreshQuest();audio?.effect('success');toast(spec.toasts.closed,`${banner} · CHAPTER COMPLETE`);
    saveRoad(false);
    return result;
  }
  function borderAct(action){
    const result=border.act(action);if(!result.ok){toast(result.reason,'THE BORDER');return result;}
    if(result.side&&!result.startEncounter){const chosen=campaign.chooseSide(result.side);if(!chosen.ok)toast(chosen.reason,'THE BORDER');}
    if(result.reward){inventory.add(result.reward.id,result.reward.quantity);inventory.refresh();}
    if(result.startEncounter){
      saveRoad(false);
      const side=border.view().side;
      if(!combat.startEncounter(borderEncounter(side,borderAllies(side)))){border.endEncounter(BORDER_ENCOUNTER_ID);toast('The line is not ready. Stand with your commander south-west of the stockade.','THE BORDER');return {ok:false,reason:'The encounter could not start.'};}
      stopInput();toast(side==='empire'?'The Coalition comes on in two waves. Hold your corner of the field.':'The army comes on in two waves. Hold your corner of the field.','THE BORDER BATTLE');audio?.effect('bell');
      return result;
    }
    refreshQuest();audio?.effect('success');
    toast(...(result.toast??['The border chapter moves on.','THE BORDER']));
    saveRoad(false);
    return result;
  }
  function morosAct(action){
    const result=moros.act(action);if(!result.ok){toast(result.reason||'Report at the camp gate first.','THE ARMY ON THE PLAIN');return result;}
    refreshQuest();inventory.refresh();audio?.effect('success');
    if(result.reward?.id==='legion-horse'&&!riding.owned){const line=MOROS_SITES['legion-horse-line'];riding.grant({x:line.x+2.4,z:line.z+1.2},Math.PI);riding.teach();placeOwnHorse();}
    if(action==='claim-legion-horse'&&campaign.view().chapterId==='moros-camp'){campaign.completeChapter('moros-camp');refreshQuest();}
    const view=moros.view();
    toast(action==='join-muster'?'Your name is on the Marshal’s muster. Twenty-five copper, and a horse waiting on the line.':view.complete?(result.reward?'A bay gelding in Imperial red, saddled and yours. G mounts and dismounts · Shift canters · H whistles him up.':'Your horse is picketed on the army’s line, with a net of hay the quartermaster counted twice.'):view.title,view.complete?'MOROS PLAIN · CHAPTER COMPLETE':'JOURNAL UPDATED');
    saveRoad(false);
    return result;
  }
  function townAct(action){
    if(action==='join-luscia-rebels'){
      const result=campaign.resolveArc(REBEL_CONTACT.region,REBEL_CONTACT.side);
      toast(result.ok?'Hara sends your name south. Luscia\u2019s rangers are the republic\u2019s business now.':result.reason||'She says nothing more.','THE REPUBLIC\u2019S CONTACT');
      if(result.ok)saveRoad(false);
      return result;
    }
    if(action==='give-smiths-coin'){
      if(!inventory.remove('copper-piece',1))return {ok:false,reason:'You have no copper to give.'};
      beggar.satisfy();inventory.refresh();toast('Smiths thanks you twice and shuffles back to his corner of the square.','ONE COPPER PIECE');saveRoad(false);
      return {ok:true,reason:''};
    }
    if(action==='dismiss-smiths'){beggar.dismiss();return {ok:true,reason:''};}
    return {ok:false,reason:''};
  }
  function saveRoad(notify=true){
    if(testingEnabled){if(notify)toast('Testing sessions leave your road checkpoint unchanged.','CHECKPOINT');return false;}
    if(questStage<1||questStage===4||combat.state.phase==='active'||combat.state.player.hp<=0||inWater){if(notify)toast('Step ashore and finish any active fight before saving.','CHECKPOINT');return false;}
    if(questStage===10)journey.start();
    const gathered=woodlandLife.state();
    const woodland={version:1,acornStatus:acornQuest.status,practiceHits:Math.min(2,practiceHits),practiceDodges:Math.min(1,practiceDodges),
      acorns:gathered.acorns.filter(s=>s.collected).map(s=>s.id),sticks:gathered.sticks.filter(s=>s.collected).map(s=>s.id),
      fruits:gathered.fruits.filter(s=>s.collected).map(s=>s.id),discoveries:[...discoveries],camp:campcraft.checkpoint()};
    const result=checkpoint.save({version:1,worldScale:METRES_PER_HEX,player:playerId,questStage,journey:journey.snapshot(),inventory:inventory.items().map(id=>({id,quantity:inventory.count(id)})),weapons:weapons.snapshot(),journeyGathered:[...journeyGathered],meadowCleared,position:{x:player.group.position.x,z:player.group.position.z},heardDoom,health:combat.state.player.hp,lysaComplete:acornQuest.status==='complete',woodland,forestStory:forestStory.snapshot(),forestHideout:forestHideout.snapshot(),regionalLife:regionalLife.snapshot(),campaign:campaign.snapshot(),luscia:luscia.snapshot(),burying:burying.snapshot(),mapTutorial:mapTutorial.snapshot(),playSeconds,mercenaryWeapons:Object.fromEntries(mercenaryWeapons),moros:moros.snapshot(),border:border.snapshot(),aftermath:aftermath.snapshot(),riding:riding.snapshot(),skills:skills.snapshot(),birding:birding.snapshot(),lakota:lakota.snapshot(),swimming:swimming.snapshot(),fishing:fishing.snapshot(),mycology:mycology.snapshot(),mushrooms:mushrooms.state().sites.filter(site=>site.gathered).map(site=>site.id),botany:botany.snapshot(),pipe:pipe.snapshot(),jimson:jimson.snapshot(),katy:katy.snapshot(),troy:troy.snapshot(),vineyard:vineyard.snapshot(),hunt:hunt.snapshot(),light:light.snapshot(),bosco:bosco.snapshot(),heist:heist.snapshot(),refugees:refugees.snapshot(),fallen:fallen.snapshot(),geology:geology.snapshot(),archaeology:archaeology.snapshot(),wine:wine.snapshot(),cooking:cooking.snapshot(),wineAttic:wineAttic.snapshot(),puck:puck.snapshot(),chameleon:chameleon.snapshot(),troupe:troupe.snapshot(),brandy:brandy.snapshot(),salt:salt.snapshot(),woodcutting:wood.snapshot(),construction:building.snapshot(),oldTree:oldTree.snapshot(),stones:stones.state().sites.filter(site=>site.gathered).map(site=>site.id),plants:flora.state().sites.filter(site=>site.gathered).map(site=>site.id),chart:mapFog.snapshot(),cartography:cartography.snapshot(),ferry:ferry.snapshot(),renaLetters:renaLetters.snapshot(),ogreToll:ogreToll.snapshot(),linguist:linguist.snapshot()});
    if(result.ok){checkpointFailureShown=false;checkpointAvailable=result;$('road-checkpoint-status').textContent='Adventure saved. Continue from the opening screen next time.';if(notify)toast('Your lessons, woodland discoveries, satchel, and weapon condition are saved.','ADVENTURE SAVED');}
    else{$('road-checkpoint-status').textContent=result.reason;if(notify||!checkpointFailureShown)toast(result.reason,'CHECKPOINT');checkpointFailureShown=true;}
    return result.ok;
  }
  function continueRoad(){
    const result=checkpoint.read();if(!result.ok||!result.data){toast(result.reason||'No road checkpoint has been saved yet.','CHECKPOINT');return false;}
    const saved=result.data;
    // Who the adventure was being played as. A save from before anyone could choose is Cromb.
    setPlayerCharacter(savedPlayerCharacter(saved.player));mateSaidGoodbye=saved.questStage>=2;
    trackedPlaceId=null;trailMarker.visible=false;
    for(const id of inventory.items())inventory.remove(id,inventory.count(id));
    for(const item of saved.inventory)inventory.add(item.id,item.quantity);
    weapons.restore(saved.weapons);journey.restore(saved.journey);questStage=saved.questStage;practiceHits=saved.woodland?.practiceHits??2;practiceDodges=saved.woodland?.practiceDodges??1;
    journeyGathered.clear();saved.journeyGathered.forEach(id=>journeyGathered.add(id));
    meadowCleared=saved.meadowCleared;heardDoom=saved.heardDoom;
    acornQuest=createAcornQuest({status:saved.woodland?.acornStatus||(saved.lysaComplete?'complete':'available')});
    forestStory.restore(saved.forestStory);forestHideout.restore(saved.forestHideout);regionalLife.restore(saved.regionalLife);
    campaign.restore(saved.campaign??createCampaign().snapshot());if(journey.view().complete&&campaign.view().chapterId==='drent-road')campaign.completeChapter('drent-road');
    mapTutorial.restore(saved.mapTutorial??0);renderMapTutorial();
    playSeconds=Number.isFinite(saved.playSeconds)&&saved.playSeconds>=0?saved.playSeconds:0;refugeeHold=0;settleMercenaries();
    mercenaryWeapons.clear();for(const [id,held] of Object.entries(saved.mercenaryWeapons??{})){mercenaryWeapons.set(id,{...held});npcById.get(id)?.actor.setWeapon(held.id);}
    luscia.restore(saved.luscia??createLusciaChapter().snapshot());beggar.reset();
    moros.restore(saved.moros??createMorosChapter().snapshot());border.restore(saved.border??createBorderChapter().snapshot());aftermath.restore(saved.aftermath??createAftermathChapter().snapshot());riding.restore(saved.riding??createRiding().snapshot());placeOwnHorse();
    skills.restore(saved.skills??createSkills().snapshot());birding.restore(saved.birding??createBirding().snapshot());lakota.restore(saved.lakota??createLakota().snapshot());swimming.restore(saved.swimming??createSwimming().snapshot());world.setFeederHung(birding.feeder==='hung');refreshSkillsSheet();
    mapFog.restore(saved.chart??createMapFog().snapshot());cartography.restore(saved.cartography??createCartography().snapshot());fishing.restore(saved.fishing??createFishing().snapshot());mycology.restore(saved.mycology??createMycology().snapshot());mushrooms.restoreGathered(saved.mushrooms??[]);botany.restore(saved.botany??saved.herbology??createBotany().snapshot());pipe.restore(saved.pipe??createPipe().snapshot());jimson.restore(saved.jimson??createJimson().snapshot());katy.restore(saved.katy??createKaty().snapshot());troy.restore(saved.troy??createBeekeeper().snapshot());vineyard.restore(saved.vineyard??createVineyard().snapshot());hunt.restore(saved.hunt??createBatmanHunt().snapshot());light.restore(saved.light??createLightKeeper().snapshot());bosco.restore(saved.bosco??createBosco().snapshot());heist.restore(saved.heist??createHeist().snapshot());boscoModel.setDye(boscoDye=bosco.dye.colour);geology.restore(saved.geology??createGeology().snapshot());archaeology.restore(saved.archaeology??createArchaeology().snapshot());wine.restore(saved.wine??createWine().snapshot());cooking.restore(saved.cooking??createCooking().snapshot());wineAttic.restore(saved.wineAttic??createWineAttic().snapshot());// A road saved before the split keeps its `ed` key, which was always Puck's half of him.
    puck.restore(saved.puck??saved.ed??createPuck().snapshot());placePuck();
    chameleon.restore(saved.chameleon??createChameleon({seed:chameleonSeed}).snapshot());placeChameleon();brandy.restore(saved.brandy??createBrandy().snapshot());salt.restore(saved.salt??createSaltSultan().snapshot());placeSalt();wood.restore(saved.woodcutting??createWoodcutting().snapshot());building.restore(saved.construction??createConstruction().snapshot());world.homestead.setStages(building.stages);for(const spot of BIRDHOUSE_POSTS)world.homestead.setPost(spot.id,building.post(spot.id));troupe.restore(saved.troupe??createTroupe().snapshot());placeTroupe(true);digs.mark(id=>archaeology.hasFound(id));oldTree.restore(saved.oldTree??createTalkingTree().snapshot());stones.restoreGathered(saved.stones??[]);refugees.restore(saved.refugees??refugees.snapshot());burying.restore(saved.burying??createBurying().snapshot());world.lauvelField?.setBuried(burying.buried);fallen.restore(saved.fallen??createFallen().snapshot());for(const npc of npcData)npc.fallen=fallen.has(npc.id);flora.restoreGathered(saved.plants??[]);linguist.restore(saved.linguist??createLinguist().snapshot());jimsonClock=elapsed;wordSaid=wordToastAt(playSeconds)?.key??null;
    ferry.restore(saved.ferry??createFerry().snapshot());
    renaLetters.restore(saved.renaLetters??createRenaLetters().snapshot());
    ogreToll.restore(saved.ogreToll??createOgreToll().snapshot());
    syncForest();syncHideout();syncRegionalLife();
    if(saved.woodland){
      woodlandLife.restoreCollected(saved.woodland.acorns);woodlandLife.restoreCollectedSticks(saved.woodland.sticks);woodlandLife.restoreCollectedFruit(saved.woodland.fruits);
      discoveries.clear();saved.woodland.discoveries.filter(id=>world.landmarks.some(place=>place.id===id)).forEach(id=>discoveries.add(id));
      campcraft.restore(saved.woodland.camp);$('discovery-count').textContent=discoveries.size;
    }
    combat.startPractice(world.training);if(questStage!==2)combat.finishPractice();combat.state.player.hp=Math.max(1,saved.health??100);
    syncJourney();
    // A saved position is only honoured when it still stands on one of the four
    // authored regions; older saves from the straight 700 m road resume at a spawn.
    const onPlayableGround=canStand(saved.position.x,saved.position.z,world)
      &&(world.regions.some(region=>insideRegion(region.name,saved.position.x,saved.position.z))
        ||quayHeight(saved.position.x,saved.position.z)!==null||izolDeckHeight(saved.position.x,saved.position.z)!==null);
    const point=onPlayableGround?saved.position:questStage<10?world.spawn:world.regions.find(region=>region.id===journey.view().region).spawn;
    player.group.position.set(point.x,world.heightAt(point.x,point.z),point.z);grounded=true;verticalSpeed=0;yaw=Math.PI/2;
    leaveOpening();
    mode='playing';testingEnabled=false;document.body.classList.add('playing');show('opening',false);show('testing-badge',false);show('modal-backdrop',false);
    syncJourney();refreshQuest();inventory.refresh();stopInput();settleCamera();canvas.focus();toast('The road is where you left it.','CONTINUING YOUR JOURNEY');return true;
  }
  function interactJourneySite(site){
    if(combat.state.player.action!=='idle')return;
    if(site.type==='sticks'||site.type==='fruit'){
      const item=site.type==='sticks'?'forest-stick':'pawpaw',quantity=site.quantity||2;
      if(inventory.add(item,quantity)){journeyGathered.add(site.id);syncJourney();toast(`${quantity} ${site.type==='sticks'?'sound branches':'ripe pawpaws'} added to your satchel.`,site.name||'A FIND ALONG THE ROAD');audio?.effect('success');saveRoad(false);}
      return;
    }
    const action=SITE_ACTIONS[site.id];if(action)journeyAct(action);
  }
  function syncForest(){
    const state=forestStory.state;
    world.setForestPlaceState?.({bundleTaken:state.bundleRecovered,memorialRepaired:state.memorialRestored});
  }
  function syncHideout(){
    const state=forestHideout.state;
    world.setForestHideoutState?.({cleared:state.cleared,recovered:state.recovered});
  }
  function hideoutAct(action){
    if(action==='challenge-hideout'&&(!weapons.profile().usable||combat.state.phase==='active'||combat.state.player.action!=='idle')){
      const result={ok:false,changed:false,reason:!weapons.profile().usable?'Repair your sword or equip a sound stick before challenging the camp.':'Finish your current action before challenging the camp.'};
      toast(result.reason,'BRAMBLE SCOUT CAMP');return result;
    }
    const result=forestHideout.act(action,{questStage});
    if(!result.ok){toast(result.reason,'BRAMBLE SCOUT CAMP');return result;}
    if(result.startEncounter){
      // Save the accepted errand before the battle; active combat is never saved.
      saveRoad(false);
      // With the garrison at the traveler's shoulder, the three soldiers join the fight as allies.
      const allies=forestHideout.state.escort?HIDEOUT_GARRISON.map(g=>{const at=npcById.get(g.id).actor.group.position,c=hideoutEncounter.center,ax=hideoutEncounter.retreatAxis==='z'?'z':'x',cr=ax==='x'?'z':'x';return {id:g.id,name:g.name,kind:g.kind,[ax]:Math.max(c[ax]-20,Math.min(hideoutEncounter.retreatLine-1,at[ax])),[cr]:Math.max(c[cr]-11,Math.min(c[cr]+11,at[cr]))};}).filter(a=>Math.hypot(a.x-hideoutEncounter.center.x,a.z-hideoutEncounter.center.z)<40):[];
      if(!combat.startEncounter(allies.length?{...hideoutEncounter,allies}:hideoutEncounter)){
        forestHideout.endEncounter(hideoutEncounter.id);return {ok:false,changed:false,reason:'The encounter could not start.'};
      }
      stopInput();toast(allies.length?'Two scouts, and three swords beside you. Watch their swings.':'Two scouts. Watch their swings; the trail behind you is a way out.','OPTIONAL ENCOUNTER · BRAMBLE SCOUT CAMP');audio?.effect('bell');
    }else if(result.escort!==undefined){
      toast(result.message,result.escort?'THE GARRISON MARCHES WITH YOU':'BRAMBLE SCOUT CAMP');
    }else if(result.changed){
      syncHideout();inventory.refresh();toast(result.message,'BRAMBLE SCOUT CAMP');
      if(action!=='inspect-hideout')audio?.effect('success');
      saveRoad(false);
    }
    return result;
  }
  const hideoutContext={hideoutQuest:forestHideout,get questStage(){return questStage;},openDialogue,closeDialogue,act:hideoutAct,
    returnToNeighbor:()=>forestConversation(npcData.find(n=>n.id===FOREST_STORY_NPC.id),forestContext)};
  function forestAct(action){
    const result=forestStory.act(action);
    if(!result.ok){toast(result.reason||'Take a closer look first.','DRENT’S WOODS');return result;}
    syncForest();inventory.refresh();
    if(result.changed){
      const detail=action.startsWith('inspect-')?'A woodland note has been added to your journal.':action==='recover-work-bundle'?'Red cord, a stitched T. Bring the bundle back to Tamsin.':action==='return-work-bundle'?'Tamsin has her tools. Two cooked fish for the road.':action==='accept-woodcutter-errand'?'The Old Charcoal Hearth is now named on your local map. Press L, select it, and choose Mark trail.':action==='restore-memorial'?'The wayboard stands upright again.':forestStory.view().task?.detail;
      if(detail)toast(detail,action.startsWith('inspect-')?'J · WOODLAND NOTES':'A WORKING DAY INTERRUPTED');
      if(!action.startsWith('inspect-'))audio?.effect('success');
      saveRoad(false);
    }
    return result;
  }
  const forestContext={forestStory,openDialogue,closeDialogue,act:forestAct,extraChoices:npc=>hideoutTamsinChoices(npc,hideoutContext)};
  function syncRegionalLife(){world.setRegionalPlaceState?.(regionalLife.state);}
  function regionalAct(action){
    if(combat.state.phase==='active'||combat.state.player.action!=='idle')return {ok:false,changed:false,reason:'Finish your movement before helping here.'};
    const result=regionalLife.act(action);
    if(!result.ok){toast(result.reason,'LIVES ALONG THE ROAD');return result;}
    syncRegionalLife();inventory.refresh();
    if(result.changed){toast(result.message||'Your journal remembers the people you helped.','LIVES ALONG THE ROAD');if(!action.startsWith('inspect-'))audio?.effect('success');saveRoad(false);}
    return result;
  }
  const regionalContext={regionalLife,openDialogue,closeDialogue,act:regionalAct};
  function lysaConversation(npc) {
    const count=inventory.count('acorn');
    const tangent=()=>openDialogue(npc,[
      'An acorn is an oak seed with a whole tree tucked inside it. The squirrels bury more than they recover; a forgotten little pantry can become tomorrow\'s woodland. I never take every nut from one patch.',
      'That sharp bitterness comes from tannins. My work is sorting, shelling, grinding, and leaching the meal with water before cooking. The washing takes patience and more work than most visitors expect. A raw handful is not a ready supper.',
      'But after all that work: warm flatbread, a thick breakfast porridge, little cakes with honey. The kitchen smells wonderfully nutty. People call it too much trouble. I call it a good afternoon, especially with someone pleasant to talk to.'
    ],null,'Back to our conversation',{onComplete:()=>lysaConversation(npc)});
    const squirrels=()=>openDialogue(npc,[
      'The one by the broad-leaved trees runs with its tail like a little question mark. It will sit perfectly still to eat, then turn into a streak of fur the moment you move. I could watch that all morning.',
      'Give them room and look up the trunks when they disappear. They are much faster than either of us. The fallen acorns are easier company: come close and press F to gather one. I keeps track of them in your satchel.'
    ],null,'Back to our conversation',{onComplete:()=>lysaConversation(npc)});
    const fruit=()=>openDialogue(npc,[
      'Look for pawpaw patches beneath the taller trees: little slender trees with long, drooping leaves. The ripe fruit is lumpy and green-gold, with soft flesh like banana custard. I watch the squirrels to see where they have been finding it.',
      'Gather a ripe fallen pawpaw with F, then open your satchel with I, select it, and choose Eat. One restores up to 25 health. Save it if you feel well; your satchel will not use one when your health is full.'
    ],null,'Back to our conversation',{onComplete:()=>lysaConversation(npc)});
    let line;
    const choices=[];
    if(acornQuest.status==='available'){
      line='Hello, traveler. I\'m Lysa. I keep this kitchen and spend rather too much time watching squirrels. If you happen upon five fallen acorns in the woods, would you bring them to me? I will give you a tinderbox for your travels. No hurry; leave the little thieves a share.';
      choices.push({id:'accept-acorns',label:'I\'ll bring you five acorns.',action:()=>{acornQuest.accept();closeDialogue();saveRoad(false);toast('A little kindness','SIDE QUEST · GATHER 5 ACORNS FOR LYSA');}});
    }else if(acornQuest.status==='active'){
      line=count>=acornQuest.target?'That looks like a promising satchel. Have you brought five acorns for my kitchen?':'There you are. Any luck beneath the broad-leaved trees? Look along the woodland edges, where the squirrels feed. You have '+count+' of the five acorns in your satchel. Take your time.';
      if(count>=acornQuest.target)choices.push({id:'give-acorns',label:'Give Lysa five acorns.',action:()=>{
        if(!acornQuest.turnIn(inventory)){lysaConversation(npc);return;}
        if(questStage>=1)saveRoad(false);
        toast('Lysa is fond of you.','A LITTLE KINDNESS · COMPLETED');
        openDialogue(npc,['You remembered. Five lovely acorns, and all the wandering it took to find them. Thank you. Most people promise something on their way through; you actually came back. Here is the tinderbox I promised: flint, steel, and dry tinder. Orris by the village fire pit will show you how to cook your catch.',
          'Come by even when your pockets are empty, will you? I like the squirrels, but they are dreadful conversationalists. And I find this little corner of the village rather nicer when you are standing in it.'],null,'I\'ll stop by again.');
      }});
    }else{
      line='There\'s my thoughtful acorn gatherer. I haven\'t forgotten your little delivery. You needn\'t bring me anything to earn a welcome, you know. Though if you keep smiling at me like that, I may forget to watch the squirrels.';
      choices.push({id:'warm-reply',label:'It\'s good to see you too, Lysa.',action:()=>openDialogue(npc,['Then stay a moment. The washing can wait, and the squirrels have been showing off all morning. I was hoping for company.'],null,'Enjoy the quiet together.')});
    }
    {const feeder=lysaFeederChoice(npc,{birding,inventory,openDialogue,act:birdingAct,back:()=>lysaConversation(npc)});if(feeder)choices.push(feeder);}
    choices.push({id:'acorn-tangent',label:'How do you turn acorns into food?',action:tangent},{id:'squirrel-tangent',label:'Tell me about the squirrels.',action:squirrels},{id:'pawpaw-tangent',label:'Is there fruit I can eat on the road?',action:fruit},{id:'leave-lysa',label:acornQuest.status==='available'?'Maybe another time.':'Until next time.',action:closeDialogue});
    openDialogue(npc,[line],null,'Back to the road',{choices});
  }
  // Hired swords talk about the road, and any of them will explain how he fights: a guide to the weapons ahead.
  /**
   * Mallec at the pass stones. Everything is peaceable except one choice, which
   * says what it is and then asks a second time. The fight cannot be started by
   * walking into him, only from here.
   */
  function ogreConversation(npc) {
    const told=ogreToll.state;ogreToll.meet();
    const back={id:'ogre-leave',label:told.beaten?'Leave him to his stone.':'Walk on.',action:()=>{if(!told.beaten)ogreToll.decline();closeDialogue();}};
    if(told.beaten){openDialogue(npc,[...OGRE_RETURNED],null,'Back to the road',{choices:[...OGRE_TOPIC_IDS.map(id=>topicChoice(npc,id)),back]});return;}
    const purse=inventory.count(COPPER_ITEM);
    const choices=[
      {id:'ogre-pay',label:purse>=OGRE_TOLL?`Pay the toll. (${OGRE_TOLL} copper)`:`Pay the toll. (${OGRE_TOLL} copper \u2014 you have ${purse})`,
        enabled:purse>=OGRE_TOLL,action:()=>{const result=ogreToll.pay();if(!result.ok){toast(result.reason,'THE TOLL STONE');return;}
          inventory.refresh();saveRoad(false);openDialogue(npc,['Good. Go on.','Mind the wall past the culvert. They are rebuilding it and the stones are loose and it is nobody\u2019s fault but it is still loose.'],null,'Back to the road',{choices:[back]});}},
      ...OGRE_TOPIC_IDS.map(id=>topicChoice(npc,id)),
      {id:OGRE_CHALLENGE.id,label:OGRE_CHALLENGE.label,action:()=>confirmChallenge(npc)},
      back];
    const lines=told.beaten?[...OGRE_RETURNED]:told.declined?[...ogreGreeting('declined')]:told.met?[...ogreGreeting('again')]:[...ogreGreeting('first')];
    openDialogue(npc,lines,null,'Back to the road',{choices});
  }
  function topicChoice(npc,id){return {id,label:ogreTopicLabel(id),action:()=>openDialogue(npc,ogreTopicLines(id),null,'Back to our conversation',{onComplete:()=>ogreConversation(npc)})};}
  function confirmChallenge(npc){
    openDialogue(npc,[...OGRE_CHALLENGE.warning],null,'Back to our conversation',{choices:[
      {id:'ogre-challenge-confirm',label:OGRE_CHALLENGE.confirmLabel,action:()=>{closeDialogue();startOgreFight();}},
      {id:'ogre-challenge-decline',label:OGRE_CHALLENGE.declineLabel,action:()=>openDialogue(npc,[...OGRE_CHALLENGE.withdrawn],null,'Back to the road',{onComplete:()=>ogreConversation(npc)})}]});
  }
  function startOgreFight(){
    const result=ogreToll.challenge();if(!result.ok){toast(result.reason,'THE TOLL STONE');return;}
    saveRoad(false);
    if(combat.startEncounter(OGRE_ENCOUNTER)){stopInput();toast('He is slow, and he does not stop when you are hit. Wait for the arc to settle before you move, and move across him, never back.','THE TOLL STONE \u00b7 MALLEC');audio?.effect('bell');}
    else ogreToll.endEncounter(OGRE_ENCOUNTER.id);
  }
  /** What any hired sword will answer for: his fighting style, and whether he will swap weapons. */
  function mercenaryChoices(npc,back=()=>mercenaryConversation(npc)){
    const kit=mercenaryWeapon(npc.id);if(!kit)return [];
    return [{id:'merc-style',label:`How do you fight? (${kit.style})`,action:()=>openDialogue(npc,mercenaryStyleLines(npc.id),null,'Back to our conversation',{onComplete:back})},
      {id:'merc-trade',label:'Would you trade weapons?',action:()=>offerTrade(npc)}];
  }
  function mercenaryConversation(npc){
    const choices=[...mercenaryChoices(npc)];
    // Ed is the only man in Drent who has swum anything, and the only one who will explain it.
    if(npc.id===WORD_ID&&!swimming.taught)choices.unshift({id:'word-swim',label:'Nobody swims that. How is it done?',
      action:()=>openDialogue(npc,[...SWIMMING_LESSON],null,'Back to our conversation',{onComplete:()=>{
        const learned=swimming.learn();
        if(learned.first){toast('Swimming, level 1. Walk into the water and it will hold you up for as long as your wind lasts.','ED THE WORD TAUGHT YOU TO SWIM');refreshSkillsSheet();saveRoad(false);}
        mercenaryConversation(npc);}}) });
    choices.push({id:'leave-mercenary',label:'Good road to you.',action:closeDialogue});
    openDialogue(npc,mercenaryLines(npc.id,npc.placement),null,'Back to the road',{choices});
  }
  function dogConversation(npc,line=villageDog.greeting()){
    const foods=inventory.items().filter(id=>INVENTORY_ITEMS[id].type==='Food');
    const choices=foods.map(id=>({id:`feed-${id}`,label:`Give it ${INVENTORY_ITEMS[id].name.toLowerCase()}`,action:()=>{
      const outcome=villageDog.feed({itemId:id,isFood:true});
      if(outcome.ate&&inventory.remove(id,1)){inventory.refresh();saveRoad(false);}
      openDialogue(npc,[outcome.line],null,'Leave the dog');}}));
    choices.push({id:'pat-dog',label:'Pat it and go.',action:closeDialogue});
    openDialogue(npc,[line],null,'Leave the dog',{choices});
  }
  function catConversation(npc,line=villageCat.greeting()){
    const offers=inventory.items().filter(id=>INVENTORY_ITEMS[id].type==='Food'||id==='raw-fish');
    const choices=offers.map(id=>({id:`offer-${id}`,label:`Offer it ${INVENTORY_ITEMS[id].name.toLowerCase()}`,action:()=>{
      const outcome=villageCat.feed({itemId:id});
      if(outcome.ate&&inventory.remove(id,1)){inventory.refresh();saveRoad(false);}
      openDialogue(npc,[outcome.line],null,'Leave the cat');}}));
    choices.push({id:'stroke-cat',label:'Reach out a hand.',action:()=>openDialogue(npc,[villageCat.pet().line],null,'Leave the cat')});
    choices.push({id:'leave-cat',label:'Leave it be.',action:closeDialogue});
    openDialogue(npc,[line],null,'Leave the cat',{choices});
  }
  function ferryAct(result){
    if(!result?.ok){if(result?.reason)toast(result.reason,'THE CROSSING');return;}
    toast(result.fare?`${result.fare} copper to Corran. ${describeSum(inventory.count(COPPER_ITEM))} left in your purse.`:'Corran takes no fare for the crossing.',result.to==='peblos'?'OUT TO THE PEBBLES':'BACK TO TIDEHAVEN');
  }
  function peddlerConversation(npc,opening=true){
    const purse=inventory.count(COPPER_ITEM);
    const offers=peddlerOffers({purse,count:id=>inventory.count(id),items:INVENTORY_ITEMS});
    const choices=offers.map(offer=>({id:`buy-${offer.id}`,label:offer.label,enabled:offer.enabled,reason:offer.reason,action:()=>{
      const paid=inventory.remove(COPPER_ITEM,offer.price);   // only hand back what was actually taken
      if(!paid||!inventory.add(offer.id,1)){if(paid)inventory.add(COPPER_ITEM,offer.price);peddlerConversation(npc,false);return;}
      inventory.refresh();toast(`${offer.name} for ${offer.price} copper. ${describeSum(inventory.count(COPPER_ITEM))} left.`,'BOUGHT FROM WENDEL');
      // Buying a phrasebook is reading it: the tongue of the country you bought it in.
      if(offer.id===PHRASEBOOK_ITEM){const here=linguist.speech(null,world.regionAt(player.group.position.x,player.group.position.z)?.name??null);
        const read=linguist.readBook(here.language);
        toast(read.ok?`${LANGUAGES[here.language].name} \u00b7 ${read.level}. It is all in there, badly spelled.`:'You already have every word in it.',read.ok?'YOU READ THE PHRASEBOOK':'NOTHING NEW IN IT');}
      saveRoad(false);peddlerConversation(npc,false);}}));
    choices.push({id:'leave-peddler',label:'Nothing today.',action:closeDialogue});
    const lines=opening?[...PEDDLER.lines]:[`You carry ${describeSum(purse)}. Anything else?`];
    openDialogue(npc,lines,null,'Back to the road',{choices});
  }
  function offerTrade(npc){
    const held=mercenaryHeld(npc),offer=tradeOffer(npc.id,held.id,weapons.equippedId);
    if(!offer.accepts||combat.state.player.action!=='idle'){openDialogue(npc,[offer.line],null,'Back to our conversation',{onComplete:()=>mercenaryConversation(npc)});return;}
    const mine=weapons.profile().name.toLowerCase(),his=INVENTORY_ITEMS[held.id].name.toLowerCase();
    openDialogue(npc,[offer.line],null,'Back to our conversation',{choices:[{id:'trade-accept',label:`Swap your ${mine} for his ${his}`,action:()=>tradeWeapons(npc,held)},{id:'trade-decline',label:'Keep your own.',action:()=>mercenaryConversation(npc)}]});
  }
  function tradeWeapons(npc,held){
    const giveId=weapons.equippedId,given=weapons.status(giveId);
    if(!given?.owned||!inventory.has(giveId)){closeDialogue();return;}
    const takeDurability=held.durability??WEAPON_TYPES[held.id].maxDurability;
    const gone=weapons.take(giveId);inventory.remove(giveId,1);
    if(!inventory.add(held.id,1)){inventory.add(giveId,1);weapons.setCondition(giveId,gone);closeDialogue();return;}
    weapons.setCondition(held.id,takeDurability);weapons.equip(held.id);inventory.refresh();
    mercenaryWeapons.set(npc.id,{id:giveId,durability:gone});npc.actor.setWeapon(giveId);
    toast(`${npc.name} takes your ${given.name.toLowerCase()} and hands over his ${INVENTORY_ITEMS[held.id].name.toLowerCase()}.`,'WEAPONS TRADED');saveRoad(false);
    openDialogue(npc,['Done. Mind it; it has seen more than you have.'],null,'Back to the road');
  }
  function conversation(npc) {
    if(mode!=='playing'||!npc||combat.state.phase==='active')return;
    if(REGIONAL_LIFE_NPCS.some(person=>person.id===npc.id)){regionalLifeConversation(npc,regionalContext);return;}
    if(npc.id===FOREST_STORY_NPC.id){forestConversation(npc,forestContext);return;}
    if(npc.dog){dogConversation(npc);return;}
    if(npc.cat){catConversation(npc);return;}
    if(garrisonIds.has(npc.id)){garrisonConversation(npc,hideoutContext);return;}
    if(npc.id===OGRE_NPC.id){ogreConversation(npc);return;}
    if(AMOD_NPC_IDS.includes(npc.id)&&amodConversation(npc,{openDialogue,closeDialogue,ogreBeaten:ogreToll.state.beaten}))return;
    if(PUETH_NPC_IDS.includes(npc.id)&&puethConversation(npc,{openDialogue,closeDialogue}))return;
    if(RENA_NPC_IDS.includes(npc.id)&&renaConversation(npc,{letters:renaLetters,inventory,openDialogue,closeDialogue,act:renaAct}))return;
    if(PEBLOS_NPC_IDS.includes(npc.id)&&peblosConversation(npc,{openDialogue,closeDialogue}))return;
    if(EAST_SUVAL_NPC_IDS.includes(npc.id)&&elodConversation(npc,{openDialogue,closeDialogue}))return;
    if(izol.converse(npc,{control:heldControl??campaign.mapControl(),openDialogue,closeDialogue}))return;
    if(isElagosNpc(npc.id)&&elagosConversation(npc,{openDialogue,closeDialogue,skills,birding,teachSkill:teachFromAmbron,act:elagosAct}))return;
    if(npc.id===FERRY_NPC.id){ferryConversation(npc,{ferry,openDialogue,closeDialogue,act:ferryAct});return;}
    if(npc.id===PEDDLER.id){peddlerConversation(npc);return;}
    if(npc.id===HARBOURMASTER){maraOnTheLanding(npc);return;}
    if(npc.id===landingMateId()&&questStage<2){chrisOnTheLanding(npc);return;}
    if(npc.id===GARDEN_KEEPER.id){gardenKeeperConversation(npc,{birding,openDialogue,closeDialogue,act:birdingAct});return;}
    // Lakota is a hired sword too, so his own conversation carries the company's two choices rather than
    // being replaced by them; it has to come before the roster's dispatch to win.
    if(npc.id===BIRD_WATCHER.id){birdWatcherConversation(npc,{birding,lakota,archaeology,wine,cooking,openDialogue,closeDialogue,act:birdingAct,mercenaryChoices:mercenaryChoices(npc)});return;}
    if(npc.id===VINTNER.id){vintnerConversation(npc,wineContext());return;}
    if(npc.id===JUAN.id){if(wineAttic.met)wineAttic.visit();juanConversation(npc,atticContext());return;}
    if(npc.id===NIKA.id){wineAttic.visit();nikaConversation(npc,atticContext());return;}
    if(npc.id===PUCK.id){puckConversation(npc,puckContext());return;}
    if(npc.id===ED.id){chameleonConversation(npc,chameleonContext());return;}
    if(TROUPE_IDS.has(npc.id)){troupeConversation(npc,troupeContext());return;}
    if(npc.id==='lauvel-seeker'){selaConversation(npc,{burying,openDialogue,closeDialogue,act:buryingAct,visits:selaVisits++});return;}
    if(LAUVEL_LINES[npc.id]){const work=workerChoice(npc.id,burying,buryingAct);
      openDialogue(npc,[...LAUVEL_LINES[npc.id]],null,'Leave them to it',
        work?{choices:[work,{id:'leave-lauvel',label:'Leave them to it.',action:closeDialogue}]}:{});return;}
    if(npc.id===BOWDEN.id){wood.visit();bowdenConversation(npc,{wood,skills,purse:inventory.count(COPPER_ITEM),count:id=>inventory.count(id),has:id=>inventory.has(id),
      builder:{known:skills.known(CONSTRUCTION_SKILL),saw:sawOffer(id=>inventory.count(id)),teach:BUILD_LINES.teach},openDialogue,closeDialogue,act:woodAct});return;}
    if(npc.id===JOHN.id){salt.visit();johnConversation(npc,{salt,hunt,coppers:inventory.count(COPPER_ITEM),openDialogue,closeDialogue,act:saltAct});return;}
    if(npc.id===BRANDY.id){brandy.visit();brandyConversation(npc,{brandy,openDialogue,closeDialogue,act:brandyAct});return;}
    if(npc.id===SECRETARY.id){secretaryConversation(npc,puckContext());return;}
    if(npc.id===CELLAR_HAND.id){cellarHandConversation(npc,{openDialogue,closeDialogue});return;}
    if(npc.id===WINEMAKER.id){winemakerConversation(npc,{openDialogue,closeDialogue,act:batmanAct,hunt,katy,visits:katVisits++});return;}
    if(npc.id===MYCOLOGIST.id){mycologistConversation(npc,{mycology,openDialogue,closeDialogue,act:mycologyAct});return;}
    if(npc.id===BOTANIST.id){botanistConversation(npc,{botany,jimson,openDialogue,closeDialogue,act:botanyAct});return;}
    if(npc.id===PIPE_SMOKER.id){pipeSmokerConversation(npc,{pipe,botany,openDialogue,closeDialogue,act:pipeAct});return;}
    if(npc.id===TOFT.id){toftConversation(npc,{jimson,inventory,openDialogue,closeDialogue,act:jimsonAct});return;}
    if(npc.id===KATY.id){katyConversation(npc,{katy,hunt,openDialogue,closeDialogue,act:katyAct,visits:katyVisits++});return;}
    if(npc.id===IMANI.id){imaniConversation(npc,{vineyard,wine,openDialogue,closeDialogue,act:imaniAct,visits:imaniVisits++});return;}
    if(npc.id===BATMAN.id){batmanConversation(npc,{hunt,openDialogue,closeDialogue,act:batmanAct,visits:batmanVisits++});return;}
    if(npc.id===ADDISON.id){addisonConversation(npc,{light,hunt,heist,openDialogue,closeDialogue,act:addisonAct,visits:addisonVisits++});return;}
    if(npc.id===SUBTRACTIDAUGHTER.id){rivalConversation(npc,{heist,openDialogue,closeDialogue,act:heistAct,visits:rivalVisits++});return;}
    if(npc.id===BOSCO.id){boscoConversation(npc,{bosco,carrying:BOSCO_TAKES.filter(id=>inventory.count(id)>0),openDialogue,closeDialogue,act:boscoAct,visits:boscoVisits++});return;}
    if(npc.id===TROY.id){troyConversation(npc,{troy,openDialogue,closeDialogue,act:troyAct,coppers:inventory.count(COPPER_ITEM),visits:troyVisits++});return;}
    if(npc.id===GEOLOGIST.id){geologistConversation(npc,{geology,openDialogue,closeDialogue,act:geologyAct});return;}
    if(REFUGEE_IDS.includes(npc.id)){refugeeConversation(npc,{refugees,openDialogue,closeDialogue,act:refugeeAct});return;}
    if(npc.id===OSTLER_NPC.id){ostlerConversation(npc,{inventory,riding,hitch:LUMBER_TOWN_STABLE.hitch,playerPosition:player.group.position,openDialogue,closeDialogue,act:ridingAct});return;}
    if((aftermathNpcIds.has(npc.id)||npc.id===MOROS_LEGATE_ID)&&aftermathConversation(npc,{aftermath,openDialogue,closeDialogue,act:aftermathAct}))return;
    if(aftermathNpcIds.has(npc.id)){openDialogue(npc,[npc.modelRole==='legion-officer'?'Not now. Form up with your company.':'Not now. Stand with the companies.'],null,'Step back');return;}
    if(westSuval.converse(npc,{border,control:heldControl??campaign.mapControl(),aftermath:aftermath.state,openDialogue,closeDialogue,act:borderAct}))return;
    if((borderNpcIds.has(npc.id)||npc.id===MOROS_LEGATE_ID)&&borderConversation(npc,{border,openDialogue,closeDialogue,act:borderAct,musterCount:company.summary(playSeconds).mustered+1}))return;
    if(borderNpcIds.has(npc.id)){openDialogue(npc,[npc.id==='coalition-envoy'?'I wait for the Marshal’s man, under a flag both armies have agreed to respect until tomorrow.':npc.modelRole==='suvali-guard'?'We hold this ground under truce. Speak to the Envoy.':'Stand to your place in the line.'],null,'Back to the road');return;}
    if((npc.id===MOROS_GATE_ID||npc.id===MOROS_LEGATE_ID)&&morosConversation(npc,{moros,openDialogue,closeDialogue,act:morosAct,musterCount:company.summary(playSeconds).mustered+1}))return;
    if(LEGION_POST_IDS.has(npc.id)){openDialogue(npc,legionPostLines(npc.id),null,'Back to the road');return;}
    if(TOWN_LIFE_IDS.has(npc.id)){openDialogue(npc,townLifeLines(npc.id),null,'Back to the road');return;}
    if(mercenaryIds.has(npc.id)){mercenaryConversation(npc);return;}
    if(npc.id===BEGGAR_NPC.id){beggarConversation(npc,{beggar,inventory,openDialogue,closeDialogue,act:townAct});return;}
    if(TOWN_NPC_IDS.includes(npc.id)){townConversation(npc,{campaign,inventory,openDialogue,closeDialogue,act:townAct});return;}
    if(LUSCIA_NPC_IDS.has(npc.id)||(npc.id==='relay-clerk'&&luscia.state.started)){lusciaConversation(npc,{luscia,inventory,openDialogue,closeDialogue,act:lusciaAct,extraChoices:person=>regionalLifeRelayChoices(person,regionalContext)});return;}
    if(journeyNpcIds.has(npc.id)){journeyConversation(npc,{journey,inventory,openDialogue,closeDialogue,act:journeyAct,extraChoices:person=>regionalLifeRelayChoices(person,regionalContext),
      provideBridgeWood:()=>{const needed=Math.max(0,3-inventory.count('forest-stick'));const ok=!needed||inventory.add('forest-stick',needed);if(ok&&needed){toast('Three sound branches are ready for the bridge.','HOLLIS’S REPAIR TIMBER');saveRoad(false);}return {ok,reason:ok?'':'There is no room for the repair timber.'};},
      teachFishing:()=>{const owned=inventory.has('fishing-rod');const result=campcraft.teachFishing();fishing.learn();refreshSkillsSheet();if(!owned)toast('A spare rod for your journey. Find the marked bank east of the bridge.','FISHING ROD · ADDED TO SATCHEL');return result;}});return;}
    if(npc.id==='acorn-cook'){lysaConversation(npc);return;}
    if(npc.id==='doomsayer'){doomsayerConversation(npc);return;}
    if(npc.id==='pond-fisher'){fisherConversation(npc);return;}
    let lines,event=null,action='Until next time';
    if(npc.id==='fisher') {
      lines=questStage>=5?['You cleared the road! Bran keeps a quieter fishing spot at Willowmere Pond, east of the forest road beyond Eren’s watch. He will lend you a rod if you want to learn. Orris by Lysa’s cottage can show you how to cook what you catch.','Those raiders came over the Tessen, the little river north of the landing. They wade its mouth at low water. The army keeps a post at the Tessen bridge now, up the road north from the Caloss Gate.']:['The bell means goblins. They came down the woodland road this morning. Mara has been at the head of the pier since it started, looking for somebody with a sword; that will be you.', 'Every river of Drent keeps its own small shrine. We leave a little water at the shore and ask for a safe return. Today, I am asking for yours.'];
    } else if(questStage===5) {
      const said={dead:name=>`We lost ${name} out there. That is on the goblins, not on you, but I will not pretend it is nothing.`,wounded:name=>`${name} is badly hurt, but breathing. The healer is with them now.`,
        hurt:name=>`${name} has cuts to show for it, and is alive because you were there.`,unhurt:name=>`${name} came through without a scratch.`,escaped:name=>`${name} got clear of it.`};
      const aftermath=raid.outcome.map(o=>said[o.fate](o.name)).join(' ');
      lines=[...(aftermath?[`Before anything else: ${aftermath}`]:[]),'Three raiders down. Good work. Their rotten sticks made them an easier fight, but remember what kept you standing: watch the windup, dodge to the side, and counter while the stick is down. Leave yourself enough stamina to escape.',
        'Now for a traveler’s other essentials. Keep the letter of introduction and this travel token in your satchel. Press I to open it. Hover over an item for a hint, then select the message to read it. I or Escape closes the satchel.',
        'Select a weapon in your satchel to see its condition and choose Equip. A broken sword cannot strike until repaired; a broken stick is used up. Fallen branches make weak spare weapons. The free repair bench is back in the village, beside the straw post.',
        'If those sticks left you hurting, look for ripe pawpaws under the little trees with long leaves. F gathers the fruit. Open I, select a pawpaw, and choose Eat to recover up to 25 health. Lysa can tell you more about them.',
        'Follow the forest road to Fernway Rest, then keep going until the trees open on the Avrel farm clearing. That gate is called the Caloss Gate. The open road leads on toward the Caloss. Find Quartermaster Corvan at the army post. The Ambroni Empire hired you from abroad; he will tell you what service means here.'];
      event='meet-waykeeper';action='Take the token';
    } else if(questStage===6||questStage===7)lines=['Press I to open your satchel. Select the letter of introduction and read it; then press I or Escape to return to the road. Keep the message and my travel token together.'];
    else if(questStage>=8)lines=['Follow the cairns to Fernway Rest, and then the road south-west to the Caloss Gate. The forest thins there and the Avrel clearing opens out. Beyond the gate, the farm road begins the next leg of your journey.','If you want to know where the raiders came from, the army post at the Tessen bridge has been counting them. That road leaves ours just past the Caloss Gate and runs north into Pueth.'];
    else if(questStage<2)lines=['Speak to Mara at the head of the pier before you head inland. She has a small errand for you, and something to help you on the road.'];
    else if(questStage===2)lines=['Try the straw post by the northern crossroads first. Two hits and a dodge. Those simple habits will keep you on your feet.'];
    else lines=['There is movement near the woodland bell, south of here. Approach along the main road, and keep an eye on the trees.'];
    openDialogue(npc,lines,event,action);
  }
  /**
   * Mara, harbourmaster of Tidehaven, at the head of the pier: the bell, the letter for Corvan, and
   * which way the road goes. She is the first person the traveler speaks to, and the errand is hers
   * because it is her landing and her paperwork. Chris, who came off the same boat, keeps the sword
   * lesson below.
   */
  function maraOnTheLanding(npc){
    if(questStage>=2){
      openDialogue(npc,[questStage>=5
        ?'Road is clear, they tell me. Good. I have two boats waiting on a tide and a quartermaster waiting on you, so neither of us is finished.'
        :'Corvan. The Avrel clearing, past the forest. I have said it twice and I will not enjoy saying it a third time.'],
        null,'Back to the landing');
      return;
    }
    updateQuest('ashore');
    openDialogue(npc,['That bell was going before you were tied up. Goblins \u2014 bramble goblins, on Tidehaven this morning, and three of them still out on the Greenway north of the village. The landing is safe enough. The road is not.',
      'Mara. Harbourmaster, which this morning means I am the one holding the paperwork nobody else will touch. This is yours: the letter of introduction, for Quartermaster Corvan at the army post in the Avrel clearing, just past the forest. He puts you into service.',
      'The way is west. Up off the landing, through the village, and the Greenway takes you north-west under the trees; keep on it and you come out at the Avrel. Eren at the watch will point you at the road.',
      'And take this. It is the village’s own chart and it is not much — this coast from Feradom down past Pueth to us, Luscia and the two Suvals as shapes, and Drent written on the only bit anybody here has walked. Everything past that is dark, and it stays dark until you go and look.',
      'Mark it as you go. Ground you walk draws itself. For the rest of it, ask: anybody who lives somewhere can tell you which way the next country is, and a name and a bearing is worth having before you need it.',
      `One of your own boat came up the pier with you \u2014 ${landingMateNote(npcById.get(landingMateId()))}. Talk to him before you go inland. He knows what to do with a sword and you look like somebody who is about to need to.`],
      'accept-letter','Take the letter',{onComplete:()=>{
        if(!cartography.learn().first)return;
        toast('Your own chart of Azhora. The coast you came along, and Drent. Everything else is dark. M opens it; ask anybody which way the next country is.','NEW SKILL · CARTOGRAPHY');
        refreshSkillsSheet();refreshChart();if(questStage>=1)saveRoad(false);
      }});
  }
  /**
   * The man who came ashore with you: the straw post, the dodge, what a blade costs, and where he
   * will be. He is a slot rather than a name - whoever stands first in the company, which is Chris
   * Gotwood unless you are Chris, in which case it is Cromb - so he introduces himself by npc.name.
   * The rest of the scene is written in Chris's voice, and docs/playable-characters.md records what
   * Cromb should say here instead. The letter is not his: Mara hands that over at the head of the pier.
   */
  function chrisOnTheLanding(npc){
    openDialogue(npc,[`${npc.name}. Same contract as you, same boat as you, and no, I do not know any more about it than you do.`,
      'A sword is welcome here even in plain cloth, but those raiders carry snapped branches and you have nothing to hide behind. Two swings on the straw post at the northern crossroads, then try a dodge. Watch for the raised stick and hit them after the swing, not during it.',
      'Your blade wears with every hit, straw included. The repair bench is beside the post \u2014 F there mends it and nobody charges you for it. I opens your satchel.',
      'I will give the village a look and come up the road after you. No sense the two of us crowding one quartermaster.'],
      null,'Back to the landing');
  }
  function doomsayerConversation(npc){
    heardDoom=true;
    saveRoad(false);
    const back={onComplete:()=>doomsayerConversation(npc)};
    openDialogue(npc,["Doom! Doom upon the distant cape! ...And good morning. Orris, at your service. I read the signs, warn the unwary, and see that nobody faces their fate on an empty stomach."],null,'Until next time',{choices:[
      {id:'doom-warning',label:'What waits at the distant cape?',action:()=>openDialogue(npc,[
        'The dark lord of Cape Thalmagar. Remember that title. Far beyond this quiet shore, he waits at the end of a much longer road. What he intends... the signs have not yet shown me. That is warning enough for one morning.',
        'The cape lies beyond the northern end of the Oremindi: mountains that climb until the sky gives up. Their passes close for whole seasons. Even the coast gives way to cliffs. You will not stroll there with a borrowed map and a brave expression.',
        'First find your feet here. The cape lies far to the northwest, past every province of the failing Empire and the Oremindi beyond them, and no chart a traveler carries marks it; the mapmakers stopped where their courage did. It is a destination for the end of your travels. Today, help the people along the road through Drent.'
      ],null,'Back to Orris',back)},
      {id:'cooking-lesson',label:'You also teach cooking?',action:()=>openDialogue(npc,[
        'Doom comes for us all. A decent supper may as well come first. Bran fishes at the pond east of the forest road, beyond the watch. Ask him for a rod and bring back a raw fish.',
        'Lysa will trade you a tinderbox for five acorns. Gather two fallen sticks with F, then approach the stone fire ring beside me and press F. Choose Light fire. The tinderbox stays with you; the two sticks become fuel.',
        'A fire burns for two minutes while you explore; it waits while you read your satchel or talk. At a lit fire, choose Cook one fish. Then open I, select the cooked fish, and choose Eat. It restores up to 40 health. There is another fire ring by the pond.'
      ],null,'Back to Orris',back)},
      {id:'leave-doomsayer',label:'May your supper outlast the doom.',action:closeDialogue}
    ]});
  }
  function fisherConversation(npc){
    const alreadyHasRod=inventory.has('fishing-rod');
    openDialogue(npc,[inventory.has('fishing-rod')?'Back for the quiet, or another fish? The pond usually has room for both.':'I am Bran. Nothing here needs a sword. I have a spare rod, and enough patience to teach you what to do with it.'],null,'Back to the bank',{choices:[
      {id:'learn-fishing',label:inventory.has('fishing-rod')?'Remind me how to fish.':'Teach me to fish.',action:()=>openDialogue(npc,[
        (alreadyHasRod?'Your rod is ready; check the line and hook. ':'Take this simple rod; the line and hook are already fitted. ')+'Step to the clear fishing bank just beside the pond and press F to cast. Then watch the float. Give the fish a moment.',
        'When the float dips and the prompt says Reel, press F or click. Too early, and you pull the bait away. Wait too long, and it escapes. Nothing is spent on a missed cast, so try as often as you like. Escape brings your line in.',
        'A catch goes into your satchel as raw fish. Cook it at a fire ring with a tinderbox and two sticks for fuel. Lysa gives a tinderbox for five acorns, and Orris by her cottage explains cooking. There is a fire ring on this bank too.'
      ],null,inventory.has('fishing-rod')?'Try another cast':'Take the fishing rod',{onComplete:()=>{campcraft.teachFishing();toast('Stand at the clear bank and press F to cast.',alreadyHasRod?'FISHING · LESSON REMEMBERED':'FISHING ROD · ADDED TO SATCHEL');}})},
      {id:'leave-fisher',label:'Enjoy the quiet, Bran.',action:closeDialogue}
    ]});
  }
  function fireMenu(fire,feedback=''){
    const status=campcraft.fireStatus(fire.id);
    const condition=status.lit?`The fire is burning. About ${Math.ceil(status.fuel)} seconds of fuel remain.`:'A ring of stones and cold ashes. Light it with your tinderbox and two fallen sticks.';
    const supplies=`You carry ${inventory.count('forest-stick')} sticks and ${inventory.count('raw-fish')} raw fish. ${inventory.has('tinderbox')?'Your tinderbox is ready.':'Lysa gives a tinderbox for five acorns.'}`;
    const act=(verb)=>{const result=campcraft[verb](fire.id);inventory.refresh();let note='';
      if(result.ok&&verb==='cook'){const made=cooking.noteMade('cooked-fish');if(made.xp){note=` Cooking +${made.xp}${made.levelled?` \u00b7 level ${made.level}`:''}.`;refreshSkillsSheet();}}
      fireMenu(fire,result.ok?(verb==='light'?'The tinder catches. Your fire is lit.':`One fish cooked. Open I to eat it and restore up to 40 health.${note}`):result.reason);};
    const brew=()=>{const made=cooking.make('hot-chocolate',inventory);inventory.refresh();
      if(made.ok){refreshSkillsSheet();audio?.effect('success');if(questStage>=1)saveRoad(false);}
      fireMenu(fire,made.ok?`Milk warmed, never boiled; chocolate grated in and stirred till it coats the spoon. One hot chocolate, restoring up to 45 health.${made.xp?` Cooking +${made.xp}${made.levelled?` \u00b7 level ${made.level}`:''}.`:''}`:made.reason);};
    openDialogue({id:fire.id,name:fire.id==='village-fire'?'Village fire pit':fire.id==='pond-fire'?'Pondside fire pit':'Roadside fire pit',role:'Camp cooking'},[`${feedback?feedback+' ':''}${condition} ${supplies}`],null,'Leave the fire',{choices:[
      {id:'light-fire',label:status.lit?'Fire already lit':'Light fire · 2 sticks',disabled:!status.canLight,title:status.lightReason,action:()=>act('light')},
      {id:'cook-fish',label:'Cook one raw fish',disabled:!status.canCook,title:status.cookReason,action:()=>act('cook')},
      ...(cooking.knows('hot-chocolate')?[{id:'make-hot-chocolate',label:`Make hot chocolate \u00b7 ${inventory.count('chocolate')} chocolate, ${inventory.count('milk')} milk`,disabled:!status.lit||cooking.missing('hot-chocolate',inventory).length>0,
        title:!status.lit?'Light the fire first.':cooking.missing('hot-chocolate',inventory).length?`You need ${cooking.missing('hot-chocolate',inventory).join(' and ')}.`:'',action:brew}]:[]),
      {id:'leave-fire',label:'Back to the road',action:closeDialogue}
    ]});
  }
  function startFishing(){
    if(mode!=='playing'||combat.state.phase==='active'||combat.state.player.action!=='idle'||!grounded)return;
    const spot=currentFishingSpot||world.fishingSpots?.[0]||world.pond;
    if(spot.id)world.setFishingSpot(spot.id);
    const result=campcraft.cast();if(!result.ok){toast(result.reason,'FISHING');return;}
    mode='fishing';stopInput();show('interaction',false);show('lesson',false);canvas.focus();
    player.group.rotation.y=Math.atan2(spot.castPoint.x-player.group.position.x,spot.castPoint.z-player.group.position.z);
  }
  function endFishing(cancel=false){
    if(mode!=='fishing')return;
    const result=cancel?campcraft.cancelFishing():campcraft.reel();
    if(campcraft.state.phase==='idle'){mode='playing';stopInput();show('fishing-panel',false);canvas.focus();}
    if(!cancel&&!result.ok)toast(result.reason,'FISHING');
  }
  function handleCampEvents(){
    for(const event of campEvents.splice(0)){
      if(event.type==='catch'){
        const spot=world.activeFishingSpot?.()?.id??currentFishingSpot?.id??'willowmere';
        const landed=fishing.land(spot);
        if(landed.ok&&landed.first){showSkillCard({kicker:`FIRST CATCH · FISHING +${landed.xp}${landed.levelled?` · LEVEL ${landed.level}`:''}`,name:landed.species.name,note:landed.species.note,skill:FISHING_SKILL});}
        else toast(landed.ok?`${landed.species.name} · ${landed.count} landed. Cook it over a fire.`:'A raw fish for your satchel. Cook it over a fire.','FRESH CATCH');
        refreshSkillsSheet();audio?.effect('success');
      }
      if(event.type==='miss')toast(event.reason,'TRY ANOTHER CAST');
      if(event.type==='bite')audio?.effect('bite');
      if(event.type==='fire-lit'||event.type==='cook')audio?.effect('success');
      if(['fishing-taught','catch','fire-lit','cook'].includes(event.type)&&questStage>=1)saveRoad(false);
    }
    if(mode==='fishing'&&campcraft.state.phase==='idle'){mode='playing';stopInput();show('fishing-panel',false);}
  }
  function testingMenu(){
    if(mode==='defeated')retry();
    if(mode==='opening'){pendingTesting=true;begin();return;}
    if(mode==='arriving'){pendingTesting=true;skipOpening();return;}
    if(mode==='fishing')endFishing(true);
    if(mode==='inventory')inventory.close();
    if(mode==='dialogue')closeDialogue();
    if(mode==='testing'){closeModal();return;}
    if(['playing','pause','journal'].includes(mode))modal('testing');
  }
  function prepareTesting(){
    testingEnabled=true;
    forestHideout.endEncounter(hideoutEncounter.id);
    for(const id of ['harbor-letter','road-token','tinderbox'])inventory.grant(id);
    campcraft.teachFishing();
    for(const [id,count] of [['acorn',5],['forest-stick',6],['raw-fish',2]])if(inventory.count(id)<count)inventory.add(id,count-inventory.count(id));
    combat.startPractice(world.training);combat.finishPractice();weapons.repair();practiceHits=2;practiceDodges=1;questStage=10;refreshQuest();inventory.refresh();
    $('test-status').textContent='Ready: road tutorial skipped; tinderbox, rod, five acorns, six sticks, and two raw fish supplied. Lysa’s favor remains available if you want to test it. Reopen the game for a fresh normal run.';
    show('testing-badge',true);
  }
  function testTravel(destination){
    if(!testingEnabled)prepareTesting();
    if(Number(destination)>=3){
      journey.start();journey.act('meet-courier');for(const id of [1,2,3])journey.act(`collect-cart-parcel-${id}`);journey.act('return-courier');meadowCleared=true;
    }
    if(Number(destination)>=4){
      journey.act('meet-crossing-keeper');if(inventory.count('forest-stick')<3)inventory.add('forest-stick',3-inventory.count('forest-stick'));
      journey.act('repair-bridge');journey.act('return-crossing-keeper');
    }
    forestHideout.endEncounter(hideoutEncounter.id);combat.startPractice(world.training);combat.finishPractice();
    syncJourney();refreshQuest();
    testingEnabled=true;show('testing-badge',true);campcraft.cancelFishing();
    const point=destination==='pond'?world.pond.fishingSpot:world.regions?.find(region=>String(region.id)===String(destination))?.spawn||{x:-11,z:29};
    player.group.position.set(point.x,world.heightAt(point.x,point.z),point.z);grounded=true;verticalSpeed=0;yaw=destination==='pond'?-Math.PI/2:0;pitch=.35;distance=targetDistance=7;closeModal();
    settleCamera();
  }
  /** Where somebody lives, as far as the chart is concerned. */
  function homeRegion(npc){const at=world.npcPositions[npc?.id],here=at?world.regionAt(at.x,at.z):null;
    return here&&!isOpenCountry(here)?here.name:null;}
  /**
   * Which way to somewhere. Offered by anybody who lives in a country with countries next to it,
   * once Mara has handed the chart over and while there is still something they can tell you.
   */
  function wayfindingChoice(npc,back){
    if(!cartography.met)return null;
    const near=cartography.directionsFrom(homeRegion(npc)).filter(name=>cartography.state(name)==='unknown'||!cartography.named(name));
    if(!near.length)return null;
    return {id:'ask-the-way',label:'Which way to…?',action:()=>openDialogue(npc,['Which way from here?'],null,'Never mind',{noWayfinding:true,choices:[
      ...near.map(name=>({id:`way-to-${name.toLowerCase().replace(/ /g,'-')}`,label:name,action:()=>{
        cartography.hear(name);
        openDialogue(npc,[CARTOGRAPHY_DIRECTIONS[name]],null,'Back to our conversation',{noWayfinding:true,onComplete:back});
      }})),
      {id:'way-enough',label:'That will do.',action:back},
    ]})};
  }
  function openDialogue(npc,lines,event=null,action='Back to the road',options={}){
    if(options.choices?.length&&!options.noWayfinding){
      const ask=wayfindingChoice(npc,()=>openDialogue(npc,lines,event,action,options));
      if(ask)options={...options,choices:[...options.choices.slice(0,-1),ask,options.choices.at(-1)]};
    }
    reviewLog.lines.push({at:Math.round(playSeconds),who:npc.name,lines:lines.slice(0,8),choices:(options.choices||[]).map(c=>c.label)});if(reviewLog.lines.length>600)reviewLog.lines.shift();
    activeDialogue={npc,lines,index:0,event,action,...options,
      speech:linguist.speech(npc,world.regionAt(player.group.position.x,player.group.position.z)?.name??null),heard:new Set()};
    mode='dialogue';stopInput();show('interaction',false);show('dialogue',true);
    $('speaker').textContent=npc.name;$('speaker-role').textContent=npc.role.toUpperCase();updateSpeech();
    ($('dialogue-choices').querySelector('button:not(:disabled)')||$('dialogue-next')).focus();
  }
  function updateSpeech() {
    const last=activeDialogue.index===activeDialogue.lines.length-1,choices=last?activeDialogue.choices:null;
    $('speech').textContent=heardSpeech();$('dialogue-next').textContent=last?activeDialogue.action:'Continue  ↵';
    $('speech-page').textContent=(choices?'Choose a response · Tab / Enter':`${activeDialogue.index+1} / ${activeDialogue.lines.length} · F or Enter`)+speechTongue();
    $('dialogue-choices').replaceChildren();show('dialogue-choices',!!choices);show('dialogue-next',!choices);
    for(const choice of choices||[]){const button=document.createElement('button');button.type='button';button.dataset.choice=choice.id;button.textContent=choice.label;button.disabled=!!choice.disabled||choice.enabled===false;button.title=choice.title||choice.reason||'';button.onclick=choice.action;$('dialogue-choices').append(button);}
    if(choices)$('dialogue-choices').querySelector('button:not(:disabled)')?.focus();
  }
  /**
   * The line as the traveler hears it, counted once however often the panel is
   * redrawn, with Chris Gotwood's interpretation under it while he is beside you.
   * The review log and everything else keep the English: those are the traveler's
   * own notes, and nothing he has to do is ever gated on reading a language.
   */
  /**
   * Whoever interprets for you, if anybody does. When you are Chris Gotwood there is nobody, and
   * nobody is needed: the Ambroni is yours already (src/languages.js `interpreterFor`).
   */
  function interpreterNpc(){const id=interpreterFor(playerId);return id?npcById.get(id)??null:null;}
  function heardSpeech(){
    const {npc,speech,heard,index,lines}=activeDialogue,line=lines[index],tongue=speech.language;
    const helping=linguist.interpreterNearby(npc,{interpreter:interpreterNpc(),languageId:tongue,at:player.group.position});
    if(!heard.has(index)){heard.add(index);linguist.hear(npc,line,{language:tongue,dialect:speech.dialect,times:helping?INTERPRETER.bonus:1});}
    const aside=$('speech-aside'),interpreted=helping&&linguist.level(tongue)<MAX_PROFICIENCY;
    if(aside){aside.textContent=interpreted?`${INTERPRETER.name} leans in: “${line}”`:'';show('speech-aside',interpreted);}
    return linguist.render(line,speech,{names:knownNames()});
  }
  /** What tongue this is, and the key that shows the line the way it was actually said. */
  function speechTongue(){
    const {speech}=activeDialogue,named=DIALECTS[speech.dialect]?.name??LANGUAGES[speech.language]?.name;
    if(!named)return '';
    return linguist.showingFull?' · T as you hear it':` · T in ${named}`;
  }
  function closeDialogue(){
    activeDialogue=null;show('dialogue',false);mode='playing';stopInput();canvas.focus();
  }
  function nextSpeech() {
    if(!activeDialogue)return;
    if(activeDialogue.choices&&activeDialogue.index===activeDialogue.lines.length-1){$('dialogue-choices').querySelector('button')?.focus();return;}
    if(++activeDialogue.index<activeDialogue.lines.length)updateSpeech();
    else{const {event,onComplete}=activeDialogue;if(event)updateQuest(event);closeDialogue();onComplete?.();}
  }
  // How many times the traveler has got back up after a beating: a retry puts them back where the fight forms up.
  let retriesTaken=0;
  /**
   * One frame of the water. The wind is combat's own stamina bar and the blood is its own
   * health, so drowning ends in the ordinary defeat with the ordinary checkpoint behind it.
   * Nothing here pushes anybody back to land: distance is what refuses a crossing.
   */
  function swimTick(dt,before){
    const p=player.group.position;
    // A horse will not go in, and `moveCharacter` will not carry one over the waterline, so a
    // rider simply cannot get wet. This says so out loud the first time he tries.
    if(riding.mounted){
      if(canSwim(p.x,p.z,playerWorld,RIDE.radius)&&!drowning){drowning=true;toast('He will not go in, and he is right. Get down first.','YOUR HORSE');}
      else if(!canSwim(p.x,p.z,playerWorld,RIDE.radius))drowning=false;
      inWater=false;return;
    }
    const wet=canSwim(p.x,p.z,playerWorld,.34);
    if(!wet&&canStand(p.x,p.z,playerWorld,.34))lastDry={x:p.x,z:p.z};
    else if(!lastDry&&canStand(before.x,before.z,playerWorld,.34))lastDry={x:before.x,z:before.z};
    if(wet&&!inWater){
      inWater=true;swimMetres=0;swimFrom=world.regionAt(before.x,before.z)?.name??null;
      toast(swimming.taught?'You are in the water. Watch your wind.'
        :'You are in the water, and nobody has ever shown you how. Watch your wind, and do not go far.','SWIMMING');
    }
    if(!wet){
      if(inWater){
        // Out the other side. What it was worth is paid on dry land, which is the only place it counts.
        const landed=world.regionAt(p.x,p.z)?.name??null;
        const paid=swimming.swam(swimMetres);
        if(paid.xp)toast(`Swimming +${paid.xp}${paid.levelled?` · level ${paid.level}`:''}. ${Math.round(swimMetres)} m of it.`,'OUT OF THE WATER');
        if(swimMetres>12&&landed&&landed!==swimFrom)swimming.crossed(`${swimFrom??'open water'} to ${landed}`);
        if(swimMetres>12&&landed==='Peblos')swimming.reachedPeblos();
        if(paid.xp||swimMetres>12)saveRoad(false);
      }
      inWater=false;drowning=false;return;
    }
    swimMetres+=Math.hypot(p.x-before.x,p.z-before.z);
    const step=swimStep({dt,level:skills.level(SWIMMING_SKILL)||1,wind:combat.state.player.stamina,health:combat.state.player.hp});
    combat.exhaust(step.spent,step.damage);
    // 'player-hit' and not 'hurt': the table has no sound of that name (src/road-audio.js), and a
    // name it does not have is silence, which is what the moment your wind goes had been. This is
    // the sound the game already makes when the traveler takes damage, and drowning is damage.
    if(step.drowning&&!drowning){drowning=true;audio?.effect('player-hit');toast('Your wind is gone. You are not swimming any more.','DROWNING');}
    if(!step.drowning)drowning=false;
  }
  function retry() {
    retriesTaken++;
    // Drowning is not a fight, so there is no fight to restart. `resetEncounter` would start
    // `lastEncounter`, which is DEFAULT_ENCOUNTER until somebody has fought, and a man who had
    // never drawn on anybody woke in a goblin raid a hundred metres from the water.
    if(drownedDefeat){
      drownedDefeat=false;inWater=false;drowning=false;swimMetres=0;
      combat.revive();
      const ashore=lastDry??world.spawn;
      player.group.position.set(ashore.x,world.heightAt(ashore.x,ashore.z),ashore.z);
      mode='playing';show('modal-backdrop',false);show('defeat',false);stopInput();grounded=true;verticalSpeed=0;yaw=0;
      player.group.rotation.y=Math.PI;toast('You are on the sand, coughing. The sea is still there.','FULL HEALTH · THE LAST DRY GROUND');canvas.focus();
      return;
    }
    if(combat.state.encounterId===hideoutEncounter.id)forestHideout.begin({questStage});
    combat.resetEncounter(combat.state.encounterId===greenwayEncounter.id?{allies:[]}:{});mode='playing';show('modal-backdrop',false);show('defeat',false);stopInput();grounded=true;verticalSpeed=0;yaw=0;
    player.group.rotation.y=Math.PI;toast('A fresh breath. Try again.','FULL HEALTH · YOUR LESSONS ARE KEPT');canvas.focus();
  }
  function recover() {
    player.group.position.set(world.spawn.x,world.heightAt(world.spawn.x,world.spawn.z),world.spawn.z);verticalSpeed=0;grounded=true;yaw=0;closeModal();settleCamera();toast('Back at the landing');
  }
  function interact(){
    if(mode==='fishing'){endFishing();return;}
    if(mode==='dialogue'){nextSpeech();return;}
    if(mode!=='playing')return;
    if(currentNPC){conversation(currentNPC);return;}
    if(riding.mounted){toast('Step down first. Press G.','IN THE SADDLE');return;}
    if(combat.state.phase!=='active'&&currentFeederHook){birdingAct('hang-feeder');return;}
    if(combat.state.phase!=='active'&&currentMushroom){gatherMushroom();return;}
    if(combat.state.phase!=='active'&&currentPlant){gatherPlant();return;}
    if(combat.state.phase!=='active'&&currentStone){gatherStone();return;}
    if(combat.state.phase!=='active'&&currentDig){readDig();return;}
    if(combat.state.phase!=='active'&&currentVine){readVines();return;}
    if(combat.state.phase!=='active'&&currentChop&&!currentNPC){startChop(currentChop);return;}
    if(combat.state.phase!=='active'&&currentBench&&!currentNPC){useWorkbench();return;}
    if(combat.state.phase!=='active'&&currentPlot&&!currentNPC){usePlot();return;}
    if(combat.state.phase!=='active'&&currentPost&&!currentNPC){usePost(currentPost);return;}
    if(combat.state.phase!=='active'&&currentCask&&!currentNPC){readCask();return;}
    if(combat.state.phase!=='active'&&nearOldTree&&!currentNPC){lookAtOldTree();return;}
    if(combat.state.phase!=='active'&&currentTree){lookAtTree();return;}
    if(combat.state.phase!=='active'&&currentHideoutSite){
      if(currentHideoutSite==='supplies')hideoutAct('recover-hideout-supplies');else hideoutConversation(hideoutContext);
      return;
    }
    if(combat.state.phase!=='active'&&currentForestSite){forestSiteConversation(currentForestSite.id,forestContext);return;}
    if(combat.state.phase!=='active'&&currentRegionalSite){regionalLifeSiteConversation(currentRegionalSite.id,regionalContext);return;}
    if(combat.state.phase!=='active'&&currentLusciaSite){lusciaAct(LUSCIA_SITE_ACTIONS[currentLusciaSite.id]);return;}
    if(combat.state.phase!=='active'&&currentMorosSite){morosAct(MOROS_SITE_ACTIONS[currentMorosSite.id]);return;}
    if(combat.state.phase!=='active'&&currentJourneySite){interactJourneySite(currentJourneySite);return;}
    if(combat.state.phase!=='active'&&currentFire){
      if(combat.state.player.action!=='idle'){toast('Finish your movement before tending the fire.');return;}
      fireMenu(currentFire);return;
    }
    if(combat.state.phase!=='active'&&nearFishing){startFishing();return;}
    if(combat.state.phase!=='active'&&nearRepair){
      if(combat.state.player.action!=='idle'){toast('Finish your swing before using the bench.');return;}
      const repaired=weapons.repair();inventory.refresh();
      if(questStage>=1)saveRoad(false);
      toast(repaired?'Your weapons are ready for the road.':'Your weapons are already in good condition.','REPAIR BENCH · NO CHARGE');audio?.effect('success');return;
    }
    if(combat.state.phase!=='active'&&currentFruit){
      if(woodlandLife.collectFruit(currentFruit.id)){
        inventory.add('pawpaw');const count=inventory.count('pawpaw');currentFruit=null;
        saveRoad(false);
        toast(count===1?'A ripe pawpaw. Open I, select it, and choose Eat.':`Ripe pawpaw gathered · ${count} carried`,'FOREST FRUIT · RESTORES UP TO 25 HEALTH');audio?.effect('success');
      }return;
    }
    if(combat.state.phase!=='active'&&currentStick){
      if(woodlandLife.collectStick(currentStick.id)){
        inventory.add('forest-stick');const count=inventory.count('forest-stick');currentStick=null;
        saveRoad(false);
        toast(count===1?'A fallen stick. Open I, select it, and choose Equip.':`Forest stick gathered · ${count} carried`,'A SIMPLE SPARE WEAPON');audio?.effect('success');
      }return;
    }
    if(combat.state.phase!=='active'&&currentAcorn){
      if(woodlandLife.collect(currentAcorn.id)){
        inventory.add('acorn');const count=inventory.count('acorn');currentAcorn=null;
        saveRoad(false);
        toast(count===1?'An acorn for your satchel. Press I to inspect it.':`Acorn gathered · ${count} in your satchel`,acornQuest.status==='active'?`LYSA'S ACORNS · ${Math.min(count,acornQuest.target)} / 5`:'WOODLAND FIND');audio?.effect('success');
      }return;
    }
    if(Math.hypot(player.group.position.x-world.border.x,player.group.position.z-world.border.z)<9){
      openDialogue({id:'border-notice',name:'The Caloss Gate',role:'Road notice'},[
        'The open gate leads to the Avrel clearing, then south-west to the Caloss crossing, and on into Luscia beyond the river. Follow the road, and greet the travelers who keep it open.',
        questStage>=10?'You have completed the first-shore tutorial. Keep the letter of introduction and Eren’s token in your satchel. Corvan waits beside a stranded cart in the Avrel clearing. All four regions remain open for your return.':'Before setting out, clear the goblins, report to Eren, and check the message in your satchel. Follow the north trail through Fernway Rest to finish this leg of the journey.'
      ]);
    }
  }
  function attack(){if(mode==='playing'&&grounded){
    // A swimmer is a person with both hands busy (docs/swimming.md).
    if(inWater){toast('Both your hands are busy keeping your head where the air is.','IN THE WATER');return;}
    if(riding.mounted){toast('He will carry you to a fight, not through one. Press G to step down.','IN THE SADDLE');return;}
    if(!weapons.profile().usable){toast('Repair your sword at any repair bench, or equip a gathered stick in I.','NO USABLE WEAPON');return;}
    combat.attack(player.group.rotation.y);canvas.focus();
  }}
  function dodge(){
    if(mode!=='playing'||!grounded||riding.mounted||inWater)return;
    const {forward,side}=getMovementInput(keys);
    const dx=-Math.sin(yaw)*forward+Math.cos(yaw)*side,dz=-Math.cos(yaw)*forward-Math.sin(yaw)*side;
    combat.dodge(Math.hypot(dx,dz)>.01?{x:dx,z:dz}:{x:-Math.sin(player.group.rotation.y),z:-Math.cos(player.group.rotation.y)});
  }
  // The character line above Step ashore: eleven tiles in the user's order, Cromb chosen, so
  // that clicking straight through plays the game that was there before anybody could choose.
  const crombOpeningLine=$('opening-who').textContent;
  const characterSelect=createCharacterSelect({root:$('character-line'),detail:$('character-detail'),lookFor:playerLook,selected:playerId,
    onChange:id=>{setPlayerCharacter(id);const chosen=playableCharacter(id);
      $('opening-who').textContent=id===DEFAULT_PLAYER?crombOpeningLine:`${chosen.name}: ${chosen.title.toLowerCase()}.`;}});
  $('skip-cutscene').onclick=skipOpening;
  $('begin').onclick=begin;$('dialogue-next').onclick=nextSpeech;$('resume').onclick=closeModal;$('recover').onclick=recover;$('retry').onclick=retry;
  $('testing-button').onclick=testingMenu;$('opening-testing').onclick=testingMenu;$('test-prepare').onclick=prepareTesting;
  $('test-hideout').onclick=()=>{testTravel(world.regionAt(FOREST_HIDEOUT_QUEST.approach.x,FOREST_HIDEOUT_QUEST.approach.z).id);forestHideout.restore();syncHideout();const p=FOREST_HIDEOUT_QUEST.approach;player.group.position.set(p.x,world.heightAt(p.x,p.z),p.z);yaw=0;settleCamera();toast('F inspects the camp. Choose whether to challenge its two scouts.','OPTIONAL WOODLAND ENCOUNTER');};
  $('test-peblos').onclick=()=>{
    if(!testingEnabled)prepareTesting();
    if(riding.mounted)stepDown(true);
    const landing=FERRY_LANDINGS.peblos.ashore;
    player.group.position.set(landing.x,world.heightAt(landing.x,landing.z),landing.z);
    yaw=landing.yaw;pitch=.33;distance=targetDistance=8;grounded=true;verticalSpeed=0;
    ferry.settle();settleCamera();closeModal();
    toast('Cobble, on the main island. Corran waits at the quay head; while testing he asks no fare either way.','TESTING · PEBLOS');
  };
  $('test-elod').onclick=()=>{
    if(!testingEnabled)prepareTesting();
    if(riding.mounted)stepDown(true);
    const landing=world.elodLanding.ashore;
    player.group.position.set(landing.x,world.heightAt(landing.x,landing.z),landing.z);
    yaw=landing.yaw;pitch=.3;distance=targetDistance=9;grounded=true;verticalSpeed=0;
    settleCamera();closeModal();
    toast('Elod’s quay, as if you had come in by sea. The border on the road is still shut; the Inner Gate will still refuse you.','TESTING · EAST SUVAL');
  };
  $('test-izolveth').onclick=()=>{
    testTravel(8);
    const landing=world.izolQuay.landing;
    player.group.position.set(landing.x,world.heightAt(landing.x,landing.z),landing.z);
    yaw=0;pitch=.3;distance=targetDistance=9;grounded=true;verticalSpeed=0;settleCamera();
    toast('The Long Quay at Izolveth, on the island of Izol. The largest town on the island, and not its capital.','TESTING · WEST IZOL');
  };
  $('test-reveal-chart').onclick=()=>{
    chartRevealed=!chartRevealed;$('test-reveal-chart').textContent=chartRevealed?'Developer chart: showing everything':'Developer chart: reveal the whole map';
    refreshChart();toast(chartRevealed?'The whole chart is showing, tinted by how far each region is built.':'The chart is fogged again. It fills in as you walk.','DEVELOPER · THE CHART');
  };
  $('test-birds').onclick=()=>{testTravel('village');const s=world.birdGarden.stand,x=s.x+Math.sin(s.yaw)*2.2,z=s.z+Math.cos(s.yaw)*2.2;player.group.position.set(x,world.heightAt(x,z),z);settleCamera();closeModal();toast('Speak with Perrin to learn birding. B observes a bird; K shows your skills.','TESTING · BIRDING');};
  $('test-pond').onclick=()=>testTravel('pond');$('test-village').onclick=()=>testTravel('village');
  // Both testing horses go through the same door as every other test-travel button: testing is turned
  // on and badged before the horse exists, so a real adventure can never be saved on one.
  const testHorse=fast=>{if(!testingEnabled)prepareTesting();testingEnabled=true;show('testing-badge',true);
    if(riding.mounted)stepDown(true);const p=player.group.position,spot={x:p.x+1.6,z:p.z+.6};
    if(!riding.owned)riding.grant(spot,yaw+Math.PI);else riding.place(spot,yaw+Math.PI);
    riding.teach();riding.setDeveloperMount(fast);placeOwnHorse();closeModal();
    toast(fast?`${DEVELOPER_HORSE_NAME}. ${DEVELOPER_HORSE_SPEED} times the army's pace, and in nobody's records. G mounts · Shift canters · H whistles him up.`
      :'A horse, here. G mounts and dismounts · Shift canters · H whistles him up.',
      fast?'TESTING · DEVELOPER HORSE':'TESTING SESSION');};
  $('test-horse').onclick=()=>testHorse(false);$('test-dev-horse').onclick=()=>testHorse(true);
  $('test-forest').onclick=()=>{testTravel('village');const p=FOREST_STORY_NPC;player.group.position.set(p.x+1.5,world.heightAt(p.x+1.5,p.z+1),p.z+1);settleCamera();toast('Meet Tamsin, then take the little paths into the woods.','DRENT · WOODLAND TRAILS');};
  $('ghost-dev-open').onclick=openDeveloper;
  for(const id of [2,3,4,9])$('test-region-'+id).onclick=()=>testTravel(id);
  for(const [button,npcId,region] of [['test-mill-life','commons-miller',2],['test-reed-life','reed-worker',3],['test-shelter-life','shelter-keeper',4]])$(button).onclick=()=>{testTravel(region);const p=world.npcPositions[npcId];player.group.position.set(p.x+1.2,world.heightAt(p.x+1.2,p.z+1.2),p.z+1.2);settleCamera();toast('F to talk. These local activities are optional.','LIVES ALONG THE ROAD');};
  $('save-road').onclick=()=>saveRoad();$('continue-road').onclick=continueRoad;
  {const newest=newestStart();show('opening-newest',!!newest);if(newest){$('opening-newest').textContent=`Start at the newest chapter · ${newest.title}`;$('opening-newest').onclick=beginNewestChapter;}}
  show('continue-road',checkpointAvailable.ok&&!!checkpointAvailable.data);
  if(!checkpointAvailable.ok)$('road-checkpoint-status').textContent=checkpointAvailable.reason;
  $('journal-button').onclick=()=>{if(mode==='journal')closeModal();else{modal('journal');mapTab(false);}};
  $('inventory-button').onclick=toggleInventory;
  $('journal-satchel').onclick=toggleInventory;
  document.querySelectorAll('[data-close]').forEach(b=>b.onclick=closeModal);
  $('level-up').onclick=()=>openSkillGuide(levelUpSkill);
  $('tab-journey').onclick=()=>mapTab(false);$('tab-map').onclick=()=>mapTab(true);$('tab-trails').onclick=()=>journalTab('trails');$('tab-skills').onclick=()=>journalTab('skills');
  $('open-trail-map').onclick=openLocalMap;$('trail-pin-open').onclick=openLocalMap;$('trail-pin-clear').onclick=clearTrailPin;
  $('quality').onclick=()=>{fullQuality=!fullQuality;renderer.setPixelRatio(fullQuality?Math.min(devicePixelRatio,1.7):1);renderer.shadowMap.enabled=fullQuality;$('quality').textContent='Graphics: '+(fullQuality?'full':'light');};
  $('sound').onclick=()=>{audio??=createAudio();$('sound').textContent=audio.toggle()?'Sound on':'Sound off';};
  // Autoplay: the computer plays the road with ordinary inputs; any trusted key or click takes control back.
  const autopilotWorld={bounds:world.bounds,colliders:world.colliders,nearColliders:(x,z,reach,out)=>playerWorld.nearColliders(x,z,reach,out),heightAt:(x,z)=>world.heightAt(x,z),paths:world.paths,npcPositions:world.npcPositions,
    npcNames:Object.fromEntries([...npcData,...JOURNEY_NPCS].map(npc=>[npc.id,npc.name])),journeySites:world.journeySites,lusciaSites:LUSCIA_SITES,morosSites:MOROS_SITES,
    get stickSites(){return Object.values(world.journeySites||{}).filter(site=>site.type==='sticks').map(site=>({...site,collected:journeyGathered.has(site.id)}));},
    repairBenches:[world.repairBench,...(world.repairBenches||[])].filter(Boolean),training:world.training,encounter:world.encounter,northTrail:world.northTrail,border:world.border,
    // Walled places have gates, and the autopilot only knows that if it is told (src/autopilot.js).
    enclosures:world.enclosures,
    sideSeat:(side,conquest)=>sideSeat(side,conquest)};
  const autopilotRead=()=>({mode,questStage,practiceHits,practiceDodges,position:{x:player.group.position.x,z:player.group.position.z},
    combat:{phase:combat.state.phase,action:combat.state.player.action,stamina:combat.state.player.stamina,hp:combat.state.player.hp,enemies:combat.state.enemies.map(e=>({id:e.id,x:e.x,z:e.z,action:e.action,progress:e.progress,active:e.active,hp:e.hp,guarded:!!e.guarded}))},
    weapon:weapons.profile(),inventory:{sticks:inventory.count('forest-stick'),cookedFish:inventory.count('cooked-fish'),pawpaws:inventory.count('pawpaw')},
    dialogue:mode==='dialogue'?{choices:[...document.querySelectorAll('#dialogue-choices button')].map(b=>({id:b.dataset.choice,label:b.textContent,enabled:!b.disabled}))}:null,
    journey:{started:journey.state.started,stage:journey.view().stage,complete:journey.view().complete,destinationIds:journey.view().destinationIds,actions:journey.availableActions()},
    mapTutorial:mapTutorial.step,campaign:{chapterId:campaign.view().chapterId,side:campaign.view().side},
    luscia:{stage:luscia.view().stage,complete:luscia.view().complete,destinationIds:luscia.view().destinationIds,actions:luscia.availableActions()},
    moros:{stage:moros.view().stage,complete:moros.view().complete,destinationIds:moros.view().destinationIds,actions:moros.availableActions()},
    border:{stage:border.view().stage,complete:border.view().complete,destinationIds:border.view().destinationIds,actions:border.availableActions()},
    riding:{owned:riding.owned,mounted:riding.mounted,horse:riding.horse,waiting:horseWaiting({inventory,riding})},
    aftermath:{stage:aftermath.view().stage,variant:aftermath.view().variant,complete:aftermath.view().complete,built:aftermathBuilt(aftermath.spec),destinationIds:aftermath.view().destinationIds,actions:aftermath.availableActions()},
    interaction:{npcId:currentNPC?.id??null,siteId:currentJourneySite?.id??currentLusciaSite?.id??currentMorosSite?.id??null,nearRepair:!!nearRepair,stickId:currentStick?.id??null}});
  const autopilotActs={begin:()=>begin(),retry:()=>retry(),continue:()=>nextSpeech(),choose:({id})=>document.querySelector(`[data-choice="${id}"]`)?.click(),interact:()=>interact(),
    attack:({yaw:aim})=>{if(mode==='playing'&&grounded&&weapons.profile().usable)combat.attack(aim);},dodge:({x,z})=>{if(mode==='playing'&&grounded)combat.dodge({x,z});},
    'open-inventory':()=>{if(mode==='playing')toggleInventory();},'close-inventory':()=>{if(mode==='inventory')inventory.close();},'select-item':({id})=>inventory.select(id),
    equip:({id})=>{if(combat.state.player.action==='idle'&&weapons.equip(id))inventory.refresh();},eat:({id})=>consumables.consume(id),
    'open-chart':()=>{if(mode==='playing'){modal('journal');journalTab('world');}},'open-trails':()=>{if(mode==='playing')openLocalMap();},'close-journal':()=>{if(mode==='journal')closeModal();},
    // The horse, the way a person rides it: G into the saddle and out, H to whistle it up.
    mount:()=>{if(!riding.mounted)toggleMount();},dismount:()=>{if(riding.mounted&&mode==='playing')stepDown();},whistle:()=>whistleHorse()};
  const autopilot=createAutopilot({world:autopilotWorld,read:autopilotRead,act:autopilotActs});
  let autopilotIntent='';
  autopilot.onEvent(event=>{show('autoplay-badge',event.type==='start');$('autoplay-button').textContent=event.type==='start'?'Stop autoplay · P':'Autoplay the road · P';
    if(event.type==='stop'){stopInput();toast(event.reason||'Autoplay stopped.','YOU HAVE CONTROL');}});
  function startAutopilot(){
    if(['pause','journal','testing'].includes(mode))closeModal();
    if(!['playing','opening','dialogue','inventory','defeated'].includes(mode))return false;
    if(autopilot.start()){toast('The computer takes the road. Press any key or click to take control back.','AUTOPLAY');if(mode!=='opening')canvas.focus();}
    return autopilot.active;
  }
  function stopAutopilot(reason='Autoplay stopped.'){if(autopilot.active)autopilot.stop(reason);}
  $('autoplay-button').onclick=()=>autopilot.active?stopAutopilot():startAutopilot();$('opening-autoplay').onclick=()=>startAutopilot();
  document.addEventListener('keydown',e=>{
    if(e.isTrusted&&autopilot.active&&!['F8','F11','F12'].includes(e.code)&&!(e.altKey&&e.code==='Enter')){stopAutopilot('You took the reins.');if(e.code==='KeyP'){e.preventDefault();return;}}
    else if(e.isTrusted&&e.code==='KeyP'&&!e.repeat&&['playing','pause','opening','journal'].includes(mode)){e.preventDefault();startAutopilot();return;}
    if(developer.active)return;
    if(e.code==='F8'&&!e.repeat){e.preventDefault();testingMenu();return;}
    if(mode==='playing'&&['Tab','Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ControlLeft','ControlRight','KeyR','KeyC'].includes(e.code))e.preventDefault();
    if(e.repeat)return;
    if(mode==='fishing'){
      if(['KeyF','Space','Enter','Escape'].includes(e.code)){e.preventDefault();endFishing(e.code==='Escape');}
      return;
    }
    if(mode==='inventory'){
      if(e.code==='KeyI'||e.code==='Escape'){e.preventDefault();inventory.close();}
      return;
    }
    if(e.code==='KeyI'){e.preventDefault();toggleInventory();return;}
    if(e.code==='Escape'){
      if(mode==='arriving'){e.preventDefault();skipOpening();return;}
      if(mode==='dialogue')closeDialogue();
      else if(mode==='playing')modal('pause');else if(['journal','pause','testing'].includes(mode))closeModal();return;
    }
    // While a level-up banner is up it is a door to that skill's guide.
    if(e.code==='Enter'&&mode==='playing'&&levelUpSkill&&$('level-up').classList.contains('visible')){e.preventDefault();openSkillGuide(levelUpSkill);return;}
    if(e.code==='Enter'){if(mode==='opening'){if(document.activeElement?.closest('button'))return;e.preventDefault();begin();}else if(mode==='arriving'){e.preventDefault();skipOpening();}else if(mode==='dialogue'){if(document.activeElement?.closest('#dialogue-choices'))return;e.preventDefault();nextSpeech();}else if(mode==='defeated')retry();return;}
    if(e.code==='Tab'&&['pause','journal','testing','dialogue','defeated'].includes(mode)) {
      const container=mode==='dialogue'?$('dialogue'):mode==='defeated'?$('defeat'):$(mode);
      const buttons=[...container.querySelectorAll('button:not(:disabled), [tabindex="0"]')].filter(b=>b.getClientRects().length);
      if(e.shiftKey&&document.activeElement===buttons[0]){e.preventDefault();buttons.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===buttons.at(-1)){e.preventDefault();buttons[0].focus();}return;
    }
    if(e.code==='KeyJ'||e.code==='KeyM'){if(mode==='journal')closeModal();else{modal('journal');mapTab(e.code==='KeyM');}return;}
    if(e.code==='KeyL'){e.preventDefault();if(mode==='journal'&&$('tab-trails').classList.contains('active'))closeModal();else openLocalMap();return;}
    if(e.code===SKILLS_KEY){if(mode==='journal'&&$('tab-skills').classList.contains('active'))closeModal();else if(['playing','journal','pause'].includes(mode)){modal('journal');journalTab('skills');}return;}
    if(e.code===LINGUIST_KEY&&mode==='dialogue'){e.preventDefault();linguist.toggle();updateSpeech();return;}
    if(e.code==='KeyF'){interact();return;}
    if(e.code==='KeyR'){attack();return;}
    if(e.code===RIDING_KEYS.mount){toggleMount();return;}
    if(e.code===RIDING_KEYS.whistle){whistleHorse();return;}
    if(e.code===BIRDING_KEY){observeBird();return;}
    if(e.code==='KeyC'||e.code==='ControlLeft'||e.code==='ControlRight'){dodge();return;}   // C to dodge, easy from WASD; Ctrl still works
    if(mode==='playing'){
      keys.add(e.code);
      if(e.code==='Space'&&grounded&&!riding.mounted&&combat.state.player.action==='idle'){verticalSpeed=6.3;grounded=false;}
    }
  });
  document.addEventListener('keyup',e=>keys.delete(e.code));
  canvas.addEventListener('pointerdown',e=>{
    if(e.isTrusted&&autopilot.active)stopAutopilot('You took the reins.');
    if(mode==='fishing'&&e.button===0){endFishing();return;}
    if(mode!=='playing')return;
    if(e.button===0){attack();return;}
    if(e.button===2){drag=true;pointerX=e.clientX;pointerY=e.clientY;canvas.setPointerCapture(e.pointerId);canvas.focus();}
  });
  canvas.addEventListener('pointermove',e=>{if(drag){yaw-=(e.clientX-pointerX)*.006;pitch=THREE.MathUtils.clamp(pitch+(e.clientY-pointerY)*.004,.16,1.04);pointerX=e.clientX;pointerY=e.clientY;}});
  canvas.addEventListener('pointerup',()=>drag=false);canvas.addEventListener('lostpointercapture',()=>drag=false);canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('wheel',e=>{e.preventDefault();if(mode==='playing')targetDistance=THREE.MathUtils.clamp(targetDistance+e.deltaY*.008,4,19);},{passive:false});
  window.addEventListener('blur',()=>{stopInput();if(!location.search.includes('test')){if(mode==='fishing')endFishing(true);if(mode==='playing'&&!autopilot.active)modal('pause');}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopInput();});
  window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();fail(new Error('The graphics device paused. Reopen the game to continue.'));});canvas.tabIndex=-1;

  function destination() {
    if(questStage===0)return{x:0,z:20,name:'Village landing'};
    if(questStage===1)return{...npcById.get(HARBOURMASTER).actor.group.position,name:'Mara \u00b7 the harbourmaster'};
    if(questStage===2)return{...world.training,name:'Practice post'};
    if(questStage===3)return{x:-48,z:29,name:'Woodland bell'};
    if(questStage===5)return{...npcById.get('warden').actor.group.position,name:'Eren · Greenway Watch'};
    if(questStage===8)return world.northTrail;
    if(questStage===9)return world.border;
    if(questStage===10){
      const candidates=[...journey.view().destinationIds,...luscia.view().destinationIds,...moros.view().destinationIds,...border.view().destinationIds,...aftermath.view().destinationIds,...(horseWaiting({inventory,riding})?[OSTLER_NPC.id]:[])].map(id=>{const point=world.journeySites?.[id]||LUSCIA_SITES[id]||MOROS_SITES[id]||world.npcPositions[id]||(id==='border'?world.border:null);return point?{...point,name:point.name||npcData.find(n=>n.id===id)?.name||'The road ahead'}:null;}).filter(Boolean);
      const p=player.group.position;
      return candidates.sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0]||null;
    }
    return null;
  }
  // Villagers caught near a raid are drawn into it: they fight or run, and can die.
  const SOLDIERLY=new Set(['legion-soldier','legion-officer','suvali-guard','elodi-guard','mercenary']);
  const civilian=npc=>!npc.dog&&!npc.cat&&!npc.ogre&&!npc.armed&&!SOLDIERLY.has(npc.modelRole)&&!mercenaryIds.has(npc.id)&&!garrisonIds.has(npc.id);
  function caughtIn(encounter){
    const people=npcData.filter(npc=>civilian(npc)&&!npc.hidden&&!npc.fallen&&!raidSeen.has(npc.id))
      .map(npc=>{const p=npc.actor.group.position;return {id:npc.id,name:npc.name,x:p.x,z:p.z,model:{role:npc.modelRole||npc.id,tunic:npc.color,skin:npc.skin,look:npc.look}};});
    return bystandersFor(encounter,people,{fallen:fallen.ids,clear:p=>canStand(p.x,p.z,world,.45)});
  }
  function startAmbush() {
    const caught=caughtIn(greenwayEncounter);
    updateQuest('ambush');
    if(!(caught.length&&combat.startEncounter({...greenwayEncounter,allies:caught})))combat.startEncounter(greenwayEncounter);
    raid.ids=combat.state.allies.map(a=>a.id);for(const id of raid.ids)raidSeen.add(id);raid.fell=false;
    world.ringBell?.(elapsed);audio?.effect('bell');
    const listed=names=>names.length<2?names.join(''):`${names.slice(0,-1).join(', ')} and ${names.at(-1)}`;
    const running=combat.state.allies.filter(a=>a.kind==='bystander').map(a=>a.name),fighting=combat.state.allies.filter(a=>a.kind==='villager').map(a=>a.name);
    const caughtLine=[running.length?`${listed(running)} ${running.length>1?'are':'is'} caught in the open.`:'',fighting.length?`${listed(fighting)} ${fighting.length>1?'take up what they have':'takes up an axe'} and ${fighting.length>1?'stand':'stands'} with you.`:''].filter(Boolean).join(' ');
    toast(caughtLine?`Goblins on the Greenway! ${caughtLine}`:'Goblins on the Greenway!','THE VILLAGE BELL');
  }
  function handleCombatEvents() {
    for(const e of combatEvents.splice(0)) {
      combatView.event(e);audio?.effect(e.type);
      if(raid.ids.includes(e.id)){const npc=npcById.get(e.id);
        if(e.type==='ally-down'&&fallen.fall(e.id)){npc.fallen=true;raid.fell=true;toast(`The goblins cut ${npc.name} down.`,'KILLED ON THE GREENWAY');}
        if(e.type==='ally-wounded')toast(`${npc.name} is down, badly hurt, but breathing.`,'THE GREENWAY');
        if(e.type==='ally-escaped')toast(`${npc.name} got clear of the fight.`,'THE GREENWAY');}
      // How each villager came through the Greenway, for Eren to speak of.
      if(e.type==='victory'&&combat.state.encounterId===greenwayEncounter.id)raid.outcome=combat.state.allies.map(a=>({name:a.name,fate:a.hp<=0?(a.wounded?'wounded':'dead'):a.escaped?'escaped':a.hp<a.maxHp?'hurt':'unhurt'}));
      if(['victory','retreat','defeat'].includes(e.type)&&raid.fell){raid.fell=false;saveRoad(false);}
      if(e.type==='practice-hit'&&questStage===2)practiceHits++;
      if(e.type==='dodge'&&questStage===2&&Math.hypot(player.group.position.x-world.training.x,player.group.position.z-world.training.z)<9)practiceDodges++;
      if(e.type==='victory'){
        if(combat.state.encounterId==='meadow-raiders'){meadowCleared=true;toast('The field road is quiet again. Recover Corvan’s parcels.','SUNMEADOW RAIDERS DRIVEN OFF');saveRoad(false);}
        else if(combat.state.encounterId===hideoutEncounter.id){
          const result=forestHideout.markCleared(hideoutEncounter.id);syncHideout();
          if(result.ok){toast(result.message,'BRAMBLE SCOUT CAMP · CLEARED');saveRoad(false);}
        }
        else if(combat.state.encounterId===BORDER_ENCOUNTER_ID){
          // The traveler held their corner of the field, and with it the day.
          const verdict=border.resolveBattle(BORDER_ENCOUNTER_ID);
          if(verdict.ok){campaign.completeChapter('border-battle',verdict.outcome);refreshQuest();toast(border.view().detail,verdict.outcome==='victory'?'THE BORDER BATTLE · WON':'THE BORDER BATTLE · LOST');saveRoad(false);}
        }
        else if(inAftermathFight()){const won=aftermath.winEncounter(combat.state.encounterId);if(won.ok){refreshQuest();toast(aftermath.spec.toasts.won,aftermath.spec.title.toUpperCase());saveRoad(false);}}
        else if(combat.state.encounterId===OGRE_ENCOUNTER.id){
          const won=ogreToll.winEncounter(OGRE_ENCOUNTER.id);
          if(won.ok){const mallec=npcById.get(OGRE_NPC.id);if(mallec)openDialogue(mallec,[...OGRE_VICTORY],null,'Back to the road');
            toast('Mallec sits down on his own stone. Tell the road house at Ostel, and tell the court.','THE TOLL STONE \u00b7 THE ROAD IS OPEN');saveRoad(false);}
        }
        else if(combat.state.encounterId===LUSCIA_WOLVES.id){const cleared=luscia.clearWolves(LUSCIA_WOLVES.id);if(cleared.ok){toast('The pack breaks for the copses. Carry the courier\u2019s satchel back to Iven.','THE LAUVEL · WOLVES DRIVEN OFF');saveRoad(false);}}
        else{updateQuest('victory');toast('The Greenway is safe.','THREE RAIDERS DRIVEN OFF');}
      }
      if(e.type==='retreat'){
        if(combat.state.encounterId==='meadow-raiders')toast('Rest near Corvan’s camp; the raiders remain by the cart.','SUNMEADOW · A CHANCE TO RECOVER');
        else if(combat.state.encounterId===hideoutEncounter.id){forestHideout.endEncounter(hideoutEncounter.id);toast('The camp can wait. Return to its approach when you are ready.','BACK TO THE ROAD');saveRoad(false);}
        else if(combat.state.encounterId===BORDER_ENCOUNTER_ID){border.endEncounter(BORDER_ENCOUNTER_ID);toast('The line holds without you for now. Tell your commander when you are ready.','THE BORDER BATTLE');}
        else if(combat.state.encounterId===OGRE_ENCOUNTER.id){ogreToll.endEncounter(OGRE_ENCOUNTER.id);toast('You are out of his reach and he has not followed. He never follows.','THE TOLL STONE');saveRoad(false);}
        else if(inAftermathFight()){const banner=aftermath.spec.title.toUpperCase();aftermath.endEncounter(combat.state.encounterId);toast('Your commander holds the ground without you for now. Give the word again when you are ready.',banner);}
        else{updateQuest('retreat');toast('Catch your breath in the village.','RETURN TO THE BELL WHEN READY');}
      }
      if(e.type==='defeat'){
        drownedDefeat=!!e.drowned;
        $('defeat-checkpoint').textContent=combat.state.encounterId==='meadow-raiders'?'Full health · Restart beside the Avrel clearing road':combat.state.encounterId===LUSCIA_WOLVES.id?'Full health · Restart on the road at the Lauvel':combat.state.encounterId===BORDER_ENCOUNTER_ID?'Full health · Rejoin the line south of the stockade':inAftermathFight()?'Full health · Form up with your company again':'Full health · Restart at the woodland bell';
        if(combat.state.encounterId===hideoutEncounter.id){forestHideout.endEncounter(hideoutEncounter.id);$('defeat-checkpoint').textContent='Full health · Retry from the Bramble Scout Camp approach';}
        // He does not finish people who have stopped: a defeat here is the ordinary one, on the Pueth side of the stones.
        if(combat.state.encounterId===OGRE_ENCOUNTER.id){ogreToll.endEncounter(OGRE_ENCOUNTER.id);$('defeat-checkpoint').textContent='Full health · Stand up again east of the pass stones';}
        if(drownedDefeat)$('defeat-checkpoint').textContent='Full health · Back on the last dry ground you stood on';
        mode='defeated';stopInput();show('dialogue',false);show('modal-backdrop',true);show('journal',false);show('pause',false);show('defeat',true);$('retry').focus();
      }
    }
    if(questStage===2&&practiceHits>=2&&practiceDodges>=1&&combat.state.player.action==='idle')updateQuest('trained');
  }
  function updateHUD() {
    const p=combat.state.player,active=combat.state.phase==='active',weapon=weapons.profile();
    document.body.classList.toggle('in-combat',active);document.body.classList.add('armed');
    show('vitals',mode!=='opening'&&mode!=='arriving');
    $('health-fill').style.width=`${p.hp/p.maxHp*100}%`;$('stamina-fill').style.width=`${p.stamina/p.maxStamina*100}%`;
    $('health-value').textContent=`${Math.ceil(p.hp)} / ${p.maxHp}`;$('stamina-value').textContent=Math.ceil(p.stamina);
    $('health-meter').setAttribute('aria-valuenow',Math.ceil(p.hp));$('stamina-meter').setAttribute('aria-valuenow',Math.ceil(p.stamina));
    $('weapon-name').textContent=weapon.name;$('weapon-value').textContent=weapon.usable?`${weapon.durability} / ${weapon.maxDurability}`:weapon.owned?'Broken':'None left';
    $('weapon-fill').style.width=`${weapon.durability/weapon.maxDurability*100}%`;
    $('weapon-meter').setAttribute('aria-valuemax',weapon.maxDurability);$('weapon-meter').setAttribute('aria-valuenow',weapon.durability);
    $('weapon-condition').classList.toggle('worn',weapon.worn);
    show('lesson',mode==='playing'&&questStage<10);show('practice-progress',questStage===2);
    $('inventory-count').textContent=inventory.items().length;
    $('inventory-button').classList.toggle('needs-attention',questStage===6||questStage===7);
    const hideoutTask=forestHideout.view().task;
    const hereId=world.regionAt(player.group.position.x,player.group.position.z)?.id,campTask=hideoutTask&&!hideoutTask.complete&&hereId===world.regionAt(hideoutEncounter.center.x,hideoutEncounter.center.z)?.id?hideoutTask:null;
    const forestTask=campTask||forestStory.view().task,showForestTask=forestTask&&!forestTask.complete&&(campTask?true:hereId===1);
    const localRegion=world.regionAt(player.group.position.x,player.group.position.z)?.id;
    const regionalTask=regionalLife.view().tasks.find(task=>task.region===localRegion&&!task.complete);
    const birdTask=localRegion===1?birding.task():null;
    const letterTask=localRegion===1?renaLetters.task():null;
    const puckTask=world.regionAt(player.group.position.x,player.group.position.z)?.name==='West Suval'?puck.task():null;
    // Katy's search has no place of its own: it is the last thing the panel offers, wherever the traveler is.
    const huntTask=burying.task()??heist.task()??hunt.task();
    const katyTask=huntTask??(katy.looking?{title:'Looking for Batman',detail:'Watch the roads, and the sky at dusk. Tell Katy at Vaervelm Caelazh the moment you see him.'}:null);
    show('side-quest',mode==='playing'&&((acornQuest.status==='active'&&localRegion===1)||showForestTask||!!regionalTask||!!birdTask||!!letterTask||!!puckTask||!!katyTask)&&!active);
    const fishing=campcraft.state;
    $('fishing-location').textContent=(world.activeFishingSpot?.()?.name||'Willowmere Pond').toUpperCase();
    document.body.classList.toggle('fishing',mode==='fishing');show('fishing-panel',mode==='fishing');
    $('fishing-title').textContent=fishing.phase==='bite'?'A bite! Reel now.':'Watch the float…';
    $('fishing-detail').textContent=fishing.phase==='bite'?'Press F or click before the fish gets away.':'Wait for the float to dip. F or click reels; Esc cancels.';
    $('fishing-fill').style.width=`${(fishing.phase==='bite'?1-fishing.progress:fishing.progress)*100}%`;
    $('fishing-panel').classList.toggle('bite',fishing.phase==='bite');
    $('side-quest-progress').textContent=inventory.count('acorn')>=acornQuest.target?'Return to Lysa by the western cottage.':`Acorns in your satchel · ${inventory.count('acorn')} / 5`;
    $('side-quest-title').textContent=showForestTask?forestTask.title:'A little kindness';
    if(showForestTask)$('side-quest-progress').textContent=forestTask.destinationIds.includes('charcoal-hearth')?'Take the western path to the Old Charcoal Hearth.':"Return the red-tied bundle to Tamsin. J · Woodland notes";
    if(showForestTask&&forestTask===hideoutTask)$('side-quest-progress').textContent=forestHideout.state.recovered?'Return the stolen stores to Captain Drevan at the Tessen post. J · Details':forestHideout.state.cleared?'F · Lift the marked sacks beyond the camp.':forestHideout.state.escort?'Lead the garrison along the blue-rag trail east of the Tessen post.':'Follow the blue-rag trail east of the Tessen post, or ask Captain Drevan to march. J · Details';
    if(regionalTask){$('side-quest-title').textContent=regionalTask.title;$('side-quest-progress').textContent=regionalTask.detail;}
    if(birdTask&&acornQuest.status!=='active'&&!showForestTask&&!regionalTask){$('side-quest-title').textContent=birdTask.title;$('side-quest-progress').textContent=birdTask.detail;}
    if(letterTask&&acornQuest.status!=='active'&&!showForestTask&&!regionalTask&&!birdTask){$('side-quest-title').textContent=letterTask.title;$('side-quest-progress').textContent=letterTask.detail;}
    if(puckTask&&!(acornQuest.status==='active'&&localRegion===1)&&!showForestTask&&!regionalTask&&!birdTask&&!letterTask){$('side-quest-title').textContent=puckTask.title;$('side-quest-progress').textContent=puckTask.detail;}
    if(katyTask&&!(acornQuest.status==='active'&&localRegion===1)&&!showForestTask&&!regionalTask&&!birdTask&&!letterTask&&!puckTask){$('side-quest-title').textContent=katyTask.title;$('side-quest-progress').textContent=katyTask.detail;}
    show('border-status',mode==='playing'&&player.group.position.z<world.bounds.minZ+18);
    $('practice-hits').textContent=`${Math.min(2,practiceHits)} / 2 hits`;$('practice-dodge').textContent=practiceDodges?'✓ Dodge tried':'0 / 1 dodge';
    show('encounter-status',active&&mode==='playing');
    $('raiders-left').textContent=combat.state.enemies.filter(e=>e.kind!=='dummy'&&e.hp>0).length;
    const goal=destination();
    const pin=trackedPlace(),pinDistance=pin?Math.hypot(pin.x-player.group.position.x,pin.z-player.group.position.z):Infinity;
    show('trail-pin',!!pin&&mode==='playing'&&!active);
    if(pin)$('trail-pin-label').textContent=`${pin.name} · ${pinDistance<5?'here':Math.round(pinDistance)+' m'}`;
    $('open-trail-map').disabled=!['playing','journal','pause'].includes(mode);
    trailMarker.visible=!!pin&&mode==='playing'&&!active&&pinDistance>5&&pinDistance<95;
    if(trailMarker.visible){trailMarker.position.set(pin.x,world.heightAt(pin.x,pin.z)+2.8+Math.sin(elapsed*2.5)*.12,pin.z);trailMarker.rotation.y=elapsed*.7;}
    const region=world.regionAt?.(player.group.position.x,player.group.position.z);
    if(region){
      $('region-name').textContent=region.name;$('map-caption').textContent=region.name.toUpperCase();
      $('region-kicker').textContent=regionKicker(region);
      if(mode==='playing'&&currentRegionId!==region.id){currentRegionId=region.id;enterRegion(region);}
    }
    $('encounter-title').textContent=combat.state.encounterId===OGRE_ENCOUNTER.id?'MALLEC, AT THE PASS STONES':combat.state.encounterId==='meadow-raiders'?'THE AVREL CLEARING RAIDERS':combat.state.encounterId===hideoutEncounter.id?'BRAMBLE SCOUT CAMP':combat.state.encounterId===LUSCIA_WOLVES.id?'WOLVES ON THE BURIAL LINE':combat.state.encounterId===BORDER_ENCOUNTER_ID?'THE BORDER BATTLE':inAftermathFight()?aftermath.spec.title.toUpperCase():'DEFEND THE GREENWAY';
    const nearestPlace=world.landmarks.reduce((best,place)=>Math.hypot(place.x-player.group.position.x,place.z-player.group.position.z)<Math.hypot(best.x-player.group.position.x,best.z-player.group.position.z)?place:best);
    $('area-name').textContent=nearestPlace.name;
    $('objective-distance').textContent=goal?`${goal.name} · ${Math.round(Math.hypot(goal.x-player.group.position.x,goal.z-player.group.position.z))} m`:'';
    const markerGoal=[0,2,3,8,9,10].includes(questStage)?goal:null;
    objectiveMarker.visible=!!markerGoal;
    if(markerGoal){objectiveMarker.position.set(markerGoal.x,world.heightAt(markerGoal.x,markerGoal.z)+2.8+Math.sin(elapsed*2.5)*.12,markerGoal.z);objectiveMarker.rotation.y=elapsed*.7;}
  }
  refreshQuest();
  function render(now) {
    // A frame's stamp can predate the clock (the first after a long load does, by seconds): never run time backwards.
    const rawDt=Math.max(0,(now-lastTime)/1000),dt=Math.min(rawDt,.05);lastTime=Math.max(lastTime,now);elapsed+=dt;frameCount++;
    if(frameCount>20){frameDeltas.push(rawDt);if(frameDeltas.length>180)frameDeltas.shift();}
    try {
      if(developer.active){
        developer.update(dt);
        if(developer.scene===scene){
          const observer=developer.camera.position;
          woodlandLife.setObserver(observer);roadLife.setObserver(observer);westLife.setObserver(observer);forestEcology.setObserver(observer);
          world.updateRegionalPlaces?.(0,observer,false);
          hideoutWatch.update(0,observer,{cleared:forestHideout.state.cleared,active:combat.state.encounterId===hideoutEncounter.id&&['active','defeated'].includes(combat.state.phase)});
        }
        renderer.render(developer.scene,developer.camera);requestAnimationFrame(render);return;
      }
      campcraft.update(dt,['playing','fishing'].includes(mode)&&!reviewFrozen);handleCampEvents();
      for(const fire of world.firePits)world.setCampfireLit(fire.id,campcraft.fireStatus(fire.id).lit);
      world.setFishingState(campcraft.state.phase);
      world.update?.(elapsed,dt);woodlandLife.update(dt,player.group.position,['playing','fishing'].includes(mode)&&!reviewFrozen);clouds.rotation.y=elapsed*.0015;
      roadLife.update(dt,player.group.position,['playing','fishing'].includes(mode)&&!reviewFrozen);
      westLife.update(dt,player.group.position,['playing','fishing'].includes(mode)&&!reviewFrozen);
      world.updateRegionalPlaces?.(dt,player.group.position,['playing','fishing'].includes(mode)&&!reviewFrozen);
      forestEcology.update(dt,elapsed,player.group.position,['playing','fishing'].includes(mode)&&!reviewFrozen);
      hideoutWatch.update(dt,player.group.position,{cleared:forestHideout.state.cleared,active:combat.state.encounterId===hideoutEncounter.id&&['active','defeated'].includes(combat.state.phase),playing:mode==='playing'&&!reviewFrozen});
      let movement=0;
      {const bodies=gatherBodies();playerWorld.setBodies(bodies).moving(player.group.position,riding.mounted?RIDE.radius:BODY.traveler);npcWorld.setBodies(bodies);catWorld.setBodies(bodies);}
      if(autopilot.active&&!reviewFrozen){
        autopilot.step(dt);
        if(Number.isFinite(autopilot.yaw))yaw+=Math.atan2(Math.sin(autopilot.yaw-yaw),Math.cos(autopilot.yaw-yaw))*(1-Math.exp(-3.5*dt));
        if(autopilot.intent!==autopilotIntent){autopilotIntent=autopilot.intent;$('autoplay-intent').textContent=autopilotIntent;}
      }
      if(mode==='playing'&&!reviewFrozen) {
        const before=player.group.position.clone();
        const {forward,side}=autopilot.active?autopilot.move:getMovementInput(keys),magnitude=Math.hypot(forward,side);
        const p=combat.state.player;
        if(riding.mounted&&combat.state.phase==='active')stepDown(true);
        if(riding.mounted){
          const canter=!!(autopilot.active?autopilot.move.run:(keys.has('ShiftLeft')||keys.has('ShiftRight')||keys.has('Tab')));
          if(magnitude>0){const wx=-Math.sin(yaw)*forward+Math.cos(yaw)*side,wz=-Math.cos(yaw)*forward-Math.sin(yaw)*side,desired=Math.atan2(wx,wz);mountHeading=steer(mountHeading,desired,dt,canter);const pace=riding.speed(canter)*drive(mountHeading,desired);moveCharacter(player.group.position,Math.sin(mountHeading)*pace*dt,Math.cos(mountHeading)*pace*dt,playerWorld,RIDE.radius);}
          player.group.rotation.y=mountHeading;p.yaw=mountHeading;
        } else if(magnitude>0) {
          // A swimmer goes at his own pace, and running is not one of the things he can do.
          const swimLevel=skills.level(SWIMMING_SKILL)||1;
          const speed=inWater?swimSpeed(swimLevel)*combat.movementScale()
            :((autopilot.active?autopilot.move.run:(keys.has('ShiftLeft')||keys.has('ShiftRight')||keys.has('Tab')))?7.2:4.2)*combat.movementScale();
          const dx=(-Math.sin(yaw)*forward+Math.cos(yaw)*side)*speed*dt,dz=(-Math.cos(yaw)*forward-Math.sin(yaw)*side)*speed*dt;
          // On foot the waterline is not a wall: `swimming:true` is what lets him walk in at all,
          // and it must not be `inWater`, which only turns true once he is already wet - a closed
          // loop that kept the sea shut to anybody who had not been warped into it. A rider is in
          // the branch above and never gets this, so a horse still refuses the water.
          moveCharacter(player.group.position,dx,dz,playerWorld,undefined,{swimming:true});
          if(p.action==='idle'&&speed>0){const angle=Math.atan2(dx,dz);player.group.rotation.y+=Math.atan2(Math.sin(angle-player.group.rotation.y),Math.cos(angle-player.group.rotation.y))*(1-Math.exp(-15*dt));p.yaw=player.group.rotation.y;}
        }
        combatClock+=dt;combat.update(dt);handleCombatEvents();
        if(p.action==='attack'||p.action==='dodge'){const angle=p.yaw;player.group.rotation.y+=Math.atan2(Math.sin(angle-player.group.rotation.y),Math.cos(angle-player.group.rotation.y))*(1-Math.exp(-24*dt));}
        const floor=world.heightAt(player.group.position.x,player.group.position.z);
        if(!grounded){verticalSpeed-=17*dt;player.group.position.y+=verticalSpeed*dt;if(player.group.position.y<=floor){player.group.position.y=floor;grounded=true;verticalSpeed=0;}}
        // In the water he floats at the surface rather than walking the seabed: the feet hang a
        // little over a metre down, which puts the head and shoulders above the waterline.
        else player.group.position.y=(!riding.mounted&&floor<WATERLINE)?WATERLINE-SWIM.sink:floor+(riding.mounted?RIDE.seat.up:0);
        {const turned=borderWatch.step(before,player.group.position,elapsed);if(turned.refused){player.group.position.x=before.x;player.group.position.z=before.z;if(turned.toast)toast(turned.toast,CLOSED_BORDER_TITLE);}}
        swimTick(dt,before);
        movement=Math.hypot(player.group.position.x-before.x,player.group.position.z-before.z)/dt;
        if(riding.mounted)riding.ride({x:player.group.position.x-Math.sin(mountHeading)*RIDE.seat.forward,z:player.group.position.z-Math.cos(mountHeading)*RIDE.seat.forward},mountHeading,movement);
        if(questStage===0&&player.group.position.z<21)updateQuest('ashore');
        if(questStage===3&&player.group.position.x< -46&&player.group.position.x> -68&&Math.abs(player.group.position.z-29)<8)startAmbush();
        if(questStage===8&&Math.hypot(player.group.position.x-world.northTrail.x,player.group.position.z-world.northTrail.z)<5)updateQuest('reach-north-trail');
        if(questStage===9&&Math.hypot(player.group.position.x-world.border.x,player.group.position.z-world.border.z)<4.5)updateQuest('reach-border');
        if(questStage===10&&!meadowCleared&&journey.state.courierAccepted&&combat.state.phase!=='active'&&Math.hypot(player.group.position.x-meadowEncounter.center.x,player.group.position.z-meadowEncounter.center.z)<14){
          if(combat.startEncounter(meadowEncounter)){toast('Two raiders among the field walls. Give their swings room.','THE AVREL CLEARING · WATCH THE AMBER TELLS');audio?.effect('bell');}
        }
        for(const place of world.landmarks)if(!discoveries.has(place.id)&&Math.hypot(place.x-player.group.position.x,place.z-player.group.position.z)<(place.radius||8)){
          discoveries.add(place.id);$('discovery-count').textContent=discoveries.size;$('area-name').textContent=place.name;
          if(combat.state.phase!=='active'&&!['northTrail','border'].includes(place.id))toast(place.name,'PLACE DISCOVERED');
          saveRoad(false);
        }
      }
      if(mode==='defeated'){combat.update(dt);combatClock+=dt;walkTime+=dt;}
      else if(['playing','fishing','opening','arriving'].includes(mode)&&!reviewFrozen)walkTime+=dt;
      chopping(dt,movement);
      const weaponPose=chop?{action:'attack',progress:((SWING-chop.next)/SWING+.46)%1,combo:0,armed:true,alert:false,weaponId:'bearded-axe',weaponUsable:true}:combat.pose();
      player.setWeapon(weaponPose.weaponUsable?weaponPose.weaponId:null);
      player.setFishing(mode==='fishing');
      player.animate(walkTime,riding.mounted?0:movement,grounded,{...weaponPose,armed:weaponPose.weaponUsable&&!riding.mounted&&!inWater,fishing:mode==='fishing',swimming:inWater,riding:riding.mounted?{pace:movement}:null});
      if(riding.owned){
        if(!riding.mounted&&mode==='playing')riding.update(dt,player.group.position,mountFooting);
        placeOwnHorse();const away=riding.distanceTo(player.group.position);(riding.developerMount?devHorse:ownHorse).group.visible=away<220;
        if(ownHorse.group.visible)ownHorse.animate(elapsed,riding.mounted?movement:riding.pace,true,riding.mounted||riding.called?{grazing:false}:{});
        show('ride-prompt',mode==='playing'&&!riding.mounted&&combat.state.phase!=='active'&&away<=RIDE.reach);
      } else show('ride-prompt',false);
      drentBirds.update(['playing','dialogue'].includes(mode)&&!reviewFrozen?dt:0,player.group.position,{feederHung:birding.feeder==='hung'});
      birdClock-=dt;if(birdClock<=0){birdClock=.1;currentBird=mode==='playing'&&birding.met&&combat.state.phase!=='active'?drentBirds.observable(player.group.position,camera,observeRange(skills.level('birding'))):null;watchBird();}
      if(mode!=='playing'){currentBird=null;birdWatch=null;}
      show('observe-prompt',!!currentBird);if(currentBird)$('observe-label').textContent=birding.hasSeen(currentBird.species)?`Observe the ${BIRD_SPECIES[currentBird.species].name.toLowerCase()}`:'Observe the bird';
      // The pointer bobs over the bird and the box sits beside the chart; the first-sighting
      // card takes the screen back the moment B earns it, so the two are never up together.
      {const watching=!!birdWatch&&mode==='playing'&&combat.state.phase!=='active';
        birdPointer.visible=watching;show('bird-watch',watching&&!$('bird-card').classList.contains('visible'));
        if(watching){birdPointer.position.set(birdWatch.x,birdWatch.y+.44+Math.sin(elapsed*3.1)*.05,birdWatch.z);birdPointer.rotation.y=elapsed*1.1;}}
      {const task=birding.task(),hook=world.birdGarden.hook;feederMarker.visible=task?.stage==='filled'&&combat.state.phase!=='active';if(feederMarker.visible){feederMarker.position.set(hook.x,hook.y+2.75+Math.sin(elapsed*2.5)*.1,hook.z);feederMarker.rotation.y=elapsed*.7;}}
      audio?.update(dt,{position:player.group.position,speed:movement,region:world.regionAt(player.group.position.x,player.group.position.z),playing:['playing','fishing'].includes(mode)&&!reviewFrozen});
      if(mode==='fishing')world.setFishingOrigin(player.fishingTip());
      // The roster counts arrivals from the landing, not from the title screen or the sail in.
      if(!['opening','pause','arriving'].includes(mode)&&!reviewFrozen)playSeconds+=dt;
      placeMercenaries();
      // After placeMercenaries, and before the NPC loop. That call rewrites the companion's home to
      // the landing ring every frame, and the loop snaps an NPC home and hides him when his home is
      // more than 180 m from the player; the player is in a boat 170 m out. Setting his home to the
      // boat here keeps him in the bow and drawn. The loop does not steer in 'arriving'.
      if(mode==='arriving'&&opening){
        if(!reviewFrozen)openingTime+=dt;
        const s=stateAt(openingTime,{variant:opening.id,companion:opening.companion}),bob=boatBob(elapsed);
        for(const e of eventsBetween(openingFired,openingTime,opening.id))if(e.type==='bell'){openingBells++;world.ringBell?.(elapsed);audio?.effect('bell');}
        openingFired=openingTime;
        if(s.done)landOpening();
        else{
          world.placeArrivalBoat(s.boat.x,s.boat.z,s.boat.yaw);
          player.group.position.set(s.traveler.x,s.traveler.y+bob*s.bobWeight,s.traveler.z);player.group.rotation.y=s.traveler.yaw;player.group.visible=false;
          const mate=npcById.get(companionNpcId());
          if(mate){const c=s.companion;mate.actor.group.position.set(c.x,c.y+(c.aboard?bob:0),c.z);mate.actor.group.rotation.y=c.yaw;mate.actor.group.visible=true;mate.hidden=false;world.npcPositions[mate.id]={x:c.x,z:c.z};}
          openingCamera.position.set(s.camera.position.x,s.camera.position.y+bob*s.bobWeight,s.camera.position.z);openingCamera.target.set(s.camera.target.x,s.camera.target.y,s.camera.target.z);
          const cap=$('cutscene').querySelector('.cutscene-caption');
          if(s.caption){$('cutscene-eyebrow').textContent=s.caption.eyebrow;$('cutscene-text').textContent=s.caption.text;cap.style.opacity=String(s.caption.alpha);}else cap.style.opacity='0';
        }
      }
      escortLandingMate();
      {const cast=new Set(border.cast());for(const person of BORDER_NPCS){const npc=npcById.get(person.id);npc.hidden=!cast.has(person.id);}}
      fogClock-=dt;if(fogClock<=0){fogClock=.5;if(mode==='playing'){
        const p=player.group.position,widened=mapFog.reveal(p.x,p.z);
        // A hex the fog has just given up is a hex of some country, and the chart of countries counts it.
        // Open country is not a country and never goes on the chart of them.
        const here=world.regionAt(p.x,p.z);
        if(widened.cells.length&&here&&!isOpenCountry(here))cartography.noteHex(here.name);
      }}
      occupationClock-=dt;if(occupationClock<=0||!heldControl){occupationClock=.5;heldControl=occupationControl(campaign.mapControl(),aftermath.state);}
      // The boat, its man and the crossing: he waits on whichever shore the traveler is on.
      if(ferry.state.crossing)ferry.frame(dt);else if(mode==='playing'&&!reviewFrozen)ferry.settle();
      for(const npc of (stakedNpcs??=npcData.filter(entry=>stakeOf(entry))))npc.hidden=!isOut(stakeOf(npc),heldControl);
      for(const prop of world.stakedProps||[])prop.object.visible=isOut(prop,heldControl);wallWatch.update(player.group.position,heldControl,walkTime);
      westSuval.frame({npcById,player,border,control:heldControl,aftermath:aftermath.state,mustered:border.view().stage==='march'?company.placements(playSeconds).filter(p=>p.phase==='mustered').slice(0,4).map(p=>p.id):[],fightingAllies:combat.state.allies?.map(a=>a.id)??[],encounterId:['active','defeated'].includes(combat.state.phase)?combat.state.encounterId:null,playing:mode==='playing'&&combat.state.phase!=='active',arrive:()=>borderAct('reach-line')});
      izol.frame({npcById,control:heldControl});
      // The aftermath's people stand wherever that day's work is; they are moved while out of sight, never walked across the map.
      {const cast=new Map(aftermath.cast().map(entry=>[entry.id,aftermathSite(entry.site)]));for(const person of AFTERMATH_NPCS){const npc=npcById.get(person.id),site=cast.get(person.id)??null;npc.hidden=!site;if(site&&site!==npc.site){world.npcPositions[person.id]={x:site.x,z:site.z};npc.actor.group.position.set(site.x,world.heightAt(site.x,site.z),site.z);npc.actor.group.rotation.y=site.yaw??0;}npc.site=site;}}
      // The garrison marches at the traveler's shoulder while escorting; in an allied fight the combat view draws them instead.
      {const escorting=forestHideout.state.escort,fighting=['active','defeated'].includes(combat.state.phase)&&combat.state.encounterId===hideoutEncounter.id&&combat.state.allies.length>0;
        for(const [i,g] of HIDEOUT_GARRISON.entries()){const npc=npcById.get(g.id),ally=fighting?combat.state.allies.find(a=>a.id===g.id):null;
          if(ally){npc.hidden=true;npc.lastFight={x:ally.x,z:ally.z};continue;}
          if(npc.hidden&&npc.lastFight){npc.actor.group.position.set(npc.lastFight.x,world.heightAt(npc.lastFight.x,npc.lastFight.z),npc.lastFight.z);npc.lastFight=null;}
          npc.hidden=false;npc.escorting=escorting;
          if(escorting){const back=player.group.rotation.y+Math.PI+(i-1)*.75,reach=2.9+i*.35;world.npcPositions[g.id]={x:player.group.position.x+Math.sin(back)*reach,z:player.group.position.z+Math.cos(back)*reach};npc.pace=3.6;}
          else{world.npcPositions[g.id]=garrisonHome[g.id];npc.pace=2.4;}}}
      if(mode==='playing'){const dogNpc=npcById.get(VILLAGE_DOG.id);villageDog.place(dogNpc.actor.group.position.x,dogNpc.actor.group.position.z);const want=villageDog.update(dt,{x:player.group.position.x,z:player.group.position.z});world.npcPositions[VILLAGE_DOG.id]={x:want.x,z:want.z};dogNpc.pace=want.pace;dogNpc.sitting=want.sitting;}
      if(mode==='playing'&&reviewCat){const catNpc=npcById.get(VILLAGE_CAT.id);world.npcPositions[VILLAGE_CAT.id]=reviewCat.at;catNpc.pace=0;catNpc.sitting=true;catNpc.posture=reviewCat.posture;catNpc.face=null;}
      else if(mode==='playing'){const catNpc=npcById.get(VILLAGE_CAT.id),dogAt=npcById.get(VILLAGE_DOG.id).actor.group.position;villageCat.place(catNpc.actor.group.position.x,catNpc.actor.group.position.z);const want=villageCat.update(dt,{player:{x:player.group.position.x,z:player.group.position.z},speed:movement,dog:{x:dogAt.x,z:dogAt.z},fight:combat.state.phase==='active'});world.npcPositions[VILLAGE_CAT.id]={x:want.x,z:want.z};catNpc.pace=want.pace;catNpc.sitting=want.sitting;catNpc.posture=want.posture;catNpc.face=want.face;}
      {const lakota=npcById.get(BIRD_WATCHER.id),a=lakota.actor.group,near=a.visible&&!lakota.hidden&&Math.hypot(a.position.x-player.group.position.x,a.position.z-player.group.position.z)<160;
        redTail.group.visible=near;
        if(near&&['playing','dialogue'].includes(mode)&&!reviewFrozen){a.getObjectByName('Left Wrist').getWorldPosition(gloveAt);
          const step=redTailFlight.update(dt,{glove:{x:gloveAt.x,y:gloveAt.y-.04,z:gloveAt.z,yaw:a.rotation.y},anchor:{x:a.position.x,y:a.position.y,z:a.position.z},called:mode==='dialogue'&&activeDialogue?.npc?.id===BIRD_WATCHER.id});
          redTail.pose(step,elapsed);lakota.falconer=redTailFlight.perched;}}
      const lusciaDestinations=questStage===10&&luscia.state.started?[...luscia.view().destinationIds,...moros.view().destinationIds,...border.view().destinationIds,...aftermath.view().destinationIds,...(horseWaiting({inventory,riding})?[OSTLER_NPC.id]:[])]:[];
      const markerView={questStage,busy:combat.state.phase==='active',heardDoom,
        ids:{harbourmaster:HARBOURMASTER,warden:'warden',doomsayer:'doomsayer',acornCook:'acorn-cook',pondFisher:'pond-fisher',forestStory:FOREST_STORY_NPC.id,gardenKeeper:GARDEN_KEEPER.id,birdWatcher:BIRD_WATCHER.id,vintner:VINTNER.id},
        arcDestinations:questStage===10?journey.view().destinationIds:[],chapterDestinations:lusciaDestinations,
        acornQuestOpen:acornQuest.status!=='complete',feederWantsCook:birding.task()?.target==='acorn-cook',hasRod:inventory.has('fishing-rod'),
        birdingLearned:birding.met,archaeologyReport:archaeology.task()?.stage==='report',
        forestOpen:!forestStory.state.bundleReturned||(forestHideout.state.recovered&&!forestHideout.state.returned),wineRecommended:wine.quest==='recommended'};
      const beggarStep=mode==='playing'&&combat.state.phase!=='active'?beggar.update(dt,{position:player.group.position,here:smiths.actor.group.position}):null;
      if(beggarStep?.line)toast(beggarStep.line,'SMITHS');
      currentNPC=null;let nearest=3.3;const talkers=[];
      // Villagers caught in the raid are drawn by the fight while it lasts, and stand where it left them after.
      for(const id of raid.ids){const npc=npcById.get(id),ally=['active','defeated'].includes(combat.state.phase)?combat.state.allies.find(a=>a.id===id):null;
        if(ally){npc.hidden=true;npc.lastFight={x:ally.x,z:ally.z};continue;}
        if(npc.hidden&&!npc.fallen){npc.hidden=false;if(npc.lastFight)npc.actor.group.position.set(npc.lastFight.x,world.heightAt(npc.lastFight.x,npc.lastFight.z),npc.lastFight.z);npc.lastFight=null;}}
      if(raid.ids.length&&!['active','defeated'].includes(combat.state.phase))raid.ids=[];
      const fightAt=combat.state.phase==='active'?combat.state.center:null;
      for(const npc of npcData) {
        if(npc.hidden||npc.fallen){npc.actor.group.visible=false;npc.marker.visible=false;onStage(npc,false);continue;}
        const pos=npc.actor.group.position,home=npc.id===BEGGAR_NPC.id&&beggarStep?beggarStep.target:world.npcPositions[npc.id];
        // Characters far from the traveler neither animate nor draw; they stand at their home until approached.
        if(Math.hypot(home.x-player.group.position.x,home.z-player.group.position.z)>(npc.viewRange??180)){pos.set(home.x,world.heightAt(home.x,home.z)+(npc.lift??0),home.z);if(npc.lent!==undefined){npc.actor.group.rotation.y=npc.lent;npc.lent=undefined;}npc.actor.group.visible=false;npc.marker.visible=false;onStage(npc,false);continue;}
        npc.actor.group.visible=true;onStage(npc,true);
        // Ed in the water: no path, no colliders and no ground under him. He floats at the
        // surface exactly as the traveler does, and swims a straight line for the strand.
        if(npc.swimming){pos.set(npc.swimming.x,WATERLINE-SWIM.sink,npc.swimming.z);npc.actor.group.rotation.y=npc.swimming.yaw;}
        const alarm=!npc.cat&&combat.state.phase==='active'&&Math.hypot(home.x-player.group.position.x,home.z-player.group.position.z)<65;
        // Nobody strolls about beside a fight: a villager near one backs off and watches from a distance.
        const fleeing=!!fightAt&&civilian(npc)&&Math.hypot(home.x-fightAt.x,home.z-fightAt.z)<26;
        let destX=home.x,destZ=home.z;
        if(fleeing){const dx=home.x-fightAt.x,dz=home.z-fightAt.z,d=Math.hypot(dx,dz)||1;destX=fightAt.x+dx/d*26;destZ=fightAt.z+dz/d*26;}
        const dHome=Math.hypot(destX-pos.x,destZ-pos.z);let pace=0;
        if(mode==='playing'&&dHome>.1&&!npc.swimming){const move=Math.min(dHome,dt*(fleeing?Math.max(3.4,npc.pace||0):npc.pace||2.4)),bx=pos.x,bz=pos.z;const bodyR=npc.cat?BODY.cat:npc.dog?BODY.dog:npc.horse?BODY.horse:npc.ogre?BODY.ogre:BODY.person;const moverWorld=npc.cat?catWorld:npcWorld;moverWorld.moving(pos,bodyR);stepAround(pos,(destX-pos.x)/dHome*move,(destZ-pos.z)/dHome*move,moverWorld,bodyR,npc.id.length%2?1:-1);pos.y=world.heightAt(pos.x,pos.z)+(npc.lift??0);pace=Math.hypot(pos.x-bx,pos.z-bz)/dt;if(pace>.1)npc.actor.group.rotation.y=Math.atan2(destX-pos.x,destZ-pos.z);}
        if(pace<=.1&&npc.face&&!npc.swimming){const turn=Math.atan2(npc.face.x-pos.x,npc.face.z-pos.z)-npc.actor.group.rotation.y;npc.actor.group.rotation.y+=Math.atan2(Math.sin(turn),Math.cos(turn))*(1-Math.exp(-4*dt));}
        npc.actor.animate(walkTime+2,npc.swimming?swimSpeed(WORD_LEVEL):pace,true,{alert:alarm,sitting:!!npc.sitting&&pace<.1,posture:npc.posture,falconer:!!npc.falconer,swimming:!!npc.swimming});
        // Talk range is centre to centre, so a body wider than a person's eats into it: the ogre
        // is stopped a metre out by his own bulk before the traveler is anywhere near him.
        const reachIn=npc.ogre?BODY.ogre-BODY.person:0;
        const d=pos.distanceTo(player.group.position)-reachIn+(npc.dog||npc.cat?1.5:npc.id===BEGGAR_NPC.id?1.1:0);if(d<nearest&&!(npc.escorting&&currentHideoutSite))talkers.push({npc,d});
        // A figure is twenty-odd moving parts, and each casts its own shadow: near the traveler that is worth drawing, across a town square it is not.
        {const shadows=d<30;if(npc.shadows!==shadows){setShadowCasting(npc.actor,shadows);npc.shadows=shadows;}}
        // What kind of gold somebody wears changes at most once in a game, so the mark is only rebuilt when it does.
        const markerKind=markerFor(npc.id,markerView);
        if(markerKind&&npc.markerKind!==markerKind){scene.remove(npc.marker);npc.marker=makeQuestMarker(markerKind);npc.markerKind=markerKind;scene.add(npc.marker);}
        npc.marker.visible=!!markerKind;
        npc.marker.position.set(pos.x,pos.y+3.15+Math.sin(elapsed*2.5)*.12,pos.z);npc.marker.rotation.y=elapsed*.7;
        // Facing the traveler is a loan, given back when the talking is done (src/bodies.js).
        // Somebody posed against their work - Old Hewe at the grave he is digging, Sela at the
        // board - faces it because that is where the work is, and nothing else ever turns them.
        {if(pace>.1||npc.face)npc.lent=undefined;   // these have somewhere of their own to look
          const p=player.group.position,turned=lendFacing({facing:npc.actor.group.rotation.y,lent:npc.lent,dt,
            talking:mode==='dialogue'&&activeDialogue?.npc===npc,want:Math.atan2(p.x-pos.x,p.z-pos.z)});
          npc.actor.group.rotation.y=turned.facing;npc.lent=turned.lent;}
      }
      keepLandingMateOnFooting();
      // Who answers F: the traveler's own business first, then whoever belongs there, and a hired sword of the
      // company last, because he is only passing and stops exactly where the traveler has business (src/prompt-priority.js).
      {const answers=talkTarget(talkers.map(t=>({...t,marked:t.npc.marker.visible,passing:mercenaryIds.has(t.npc.id)})));if(answers){currentNPC=answers.npc;nearest=answers.d;}}
      {// Puck: he goes in a puff if the traveler runs at him or swings at him, and wanders his haunts in Solis.
        const pp=player.group.position,speed=Math.hypot(pp.x-puckLast.x,pp.z-puckLast.z)/Math.max(dt,1e-3);puckLast.x=pp.x;puckLast.z=pp.z;
        const home=puck.haunt,near=Math.hypot(home.x-pp.x,home.z-pp.z)<180;
        if(mode==='playing')for(const event of puck.update(dt,{x:pp.x,z:pp.z,hurrying:speed>5.6&&speed<40,swinging:combat.state.player.action!=='idle'}))puckEvent(event);
        puckView.group.visible=near;puckView.update(elapsed,dt,{sober:puck.sober()});
        // He turns to whoever he is talking to and turns back afterwards (src/bodies.js), which he
        // used not to: he kept the traveler's bearing until the next time he moved.
        {const turned=lendFacing({facing:puckFacing,lent:puckLent,dt,talking:near&&mode==='dialogue'&&activeDialogue?.npc===puckNpc,
          want:Math.atan2(pp.x-puckView.group.position.x,pp.z-puckView.group.position.z)});
          puckFacing=turned.facing;puckLent=turned.lent;puckView.group.rotation.y=puckFacing;}
        const d=near?puckView.group.position.distanceTo(pp):Infinity;if(d<PUCK.talk&&d<nearest){nearest=d;currentNPC=puckNpc;}}
      {// Ed the Chameleon, anywhere in the built world: he goes when his time is up, and when
       // somebody with nothing in their hands walks into his reach. A bottle buys a conversation.
        const pp=player.group.position,spot=chameleon.spot,near=Math.hypot(spot.x-pp.x,spot.z-pp.z)<200;
        if(mode==='playing')chameleon.update(dt,{x:pp.x,z:pp.z,carrying:carryingForEd(inventory).length>0});
        edView.group.visible=near&&!reviewTarget;
        if(near)edView.update(elapsed,dt,{sober:false});
        {const turned=lendFacing({facing:edFacing,lent:edLent,dt,talking:near&&mode==='dialogue'&&activeDialogue?.npc===edNpc,
          want:Math.atan2(pp.x-edView.group.position.x,pp.z-edView.group.position.z)});
          edFacing=turned.facing;edLent=turned.lent;edView.group.rotation.y=edFacing;}
        const d=near?edView.group.position.distanceTo(pp):Infinity;if(d<ED.talk&&d<nearest){nearest=d;currentNPC=edNpc;}}
      {// The boat under the Elod head: she waits on the water until first light, and the moment
       // the traveler comes back down the cliff with the glass she takes them home.
        if(mode==='playing'&&heist.stage==='taken'){const pp=player.group.position;
          if(Math.hypot(LANDING.x-pp.x,LANDING.z-pp.z)<9)heistAct('lens-home');}}
      {// Bosco: he holds the yard, comes at a flat run to anybody who walks into it, and sits
       // on their foot. He is a different colour every so often, because he sleeps against vats.
        const pp=player.group.position,near=bosco.walking||Math.hypot(BOSCO_HAUNTS[0].x-pp.x,BOSCO_HAUNTS[0].z-pp.z)<120;
        boscoModel.group.visible=near;
        if(near){
          // The review pins him: left to himself he goes and sits on Brandy's foot, which is
          // correct of him and useless for a portrait.
          const step=boscoPose?{x:boscoPose.x,z:boscoPose.z,speed:0,sitting:true,facing:boscoPose.yaw}
            :mode==='playing'?bosco.update(dt,{x:pp.x,z:pp.z}):{...bosco.position,speed:0,sitting:bosco.mode==='sit',facing:null};
          boscoModel.group.position.set(step.x,world.heightAt(step.x,step.z),step.z);
          if(Number.isFinite(step.facing))boscoModel.group.rotation.y=step.facing;
          if(mode==='dialogue'&&activeDialogue?.npc===boscoNpc){const g=boscoModel.group.position;boscoModel.group.rotation.y=Math.atan2(pp.x-g.x,pp.z-g.z);}
          if(bosco.dye.colour!==boscoDye){boscoDye=bosco.dye.colour;boscoModel.setDye(boscoDye);}
          boscoModel.update(elapsed,{speed:step.speed,sitting:step.sitting});
          const d=boscoModel.group.position.distanceTo(pp);if(d<BOSCO.talk&&d<nearest){nearest=d;currentNPC=boscoNpc;}}}
      {// Batman: nothing on the rock until the traveler is carrying the blue, and then a shape on it
       // that does not move like weather. The handover is at the breach in Solis's east wall.
        const pp=player.group.position,showing=hunt.willCome||hunt.stage!=='unknown';
        const near=showing&&Math.hypot(BATMAN_PERCH.x-pp.x,BATMAN_PERCH.z-pp.z)<160;
        batman.group.visible=near;
        if(near){batman.update(elapsed,{flare:batmanFlare||(mode==='dialogue'&&activeDialogue?.npc===batmanNpc?.28:0)});
          if(mode==='dialogue'&&activeDialogue?.npc===batmanNpc){const g=batman.group.position;batman.group.rotation.y=Math.atan2(pp.x-g.x,pp.z-g.z);}
          const d=batman.group.position.distanceTo(pp);if(d<5.5&&d<nearest){nearest=d;currentNPC=batmanNpc;}}
        if(mode==='playing'&&!reviewTarget&&hunt.stage==='ready'&&Math.hypot(HANDOVER.x-pp.x,HANDOVER.z-pp.z)<14){
          if(hunt.witness(inventory).ok){inventory.refresh();refreshQuest();audio?.effect('discovery');
            openDialogue(batmanNpc,[...BUST_SCENE],null,'Take the tally book off the seat',{onComplete:()=>{
              toast('Rask and Trelith, in one book, in the same hand.','THE CART\u2019S TALLY BOOK');saveRoad(false);}});}}}
      {// Talaelos: heard before seen; moved on while nobody watches; off the stage if the traveler walks out of a play.
        const pp=player.group.position,s=troupe.stop;troupeWagon.visible=Math.hypot(s.x-pp.x,s.z-pp.z)<220;
        if(mode==='playing'){for(const event of troupe.update(dt,{x:pp.x,z:pp.z})){if(event.type==='heard')toast(event.line,'TALAELOS, THE PLAYERS OF NYLON');if(event.type==='moved'){placeTroupe(true);saveRoad(false);}}
          if(troupe.performing&&!reviewTarget&&troupe.cancelScene())placeTroupe(true);}}
      {// The Lauvel: the bearers go on with their round, and the hurdle goes between them.
        const pp=player.group.position,field=fieldPoint(0,10),near=Math.hypot(field.x-pp.x,field.z-pp.z)<200;
        // She has called out to everybody who has come up that road for ten days, and does not
        // wait to be spoken to (src/lauvel-burying.js). Not in the middle of the wolves.
        // A review view is not somebody coming up the road: `reviewTarget` marks a shot being
        // composed, the way the troupe's scene above uses it, and three of the Lauvel views stand
        // the camera inside her earshot with the quest still at 'unknown'.
        if(mode==='playing'&&!reviewTarget&&burying.stage==='unknown'&&combat.state.phase!=='active'
          &&Math.hypot(HAIL_FROM.x-pp.x,HAIL_FROM.z-pp.z)<HAIL_FROM.reach&&burying.hail().ok){
          audio?.effect('bell');openDialogue(npcById.get('lauvel-seeker'),[...HAIL],null,'Go over to her');refreshQuest();saveRoad(false);}
        // She is on her knees at the end of the row until somebody comes up the road; afterwards she
        // stands at the board with her son's name on it, which is at the head of Old Hewe's grave.
        {const sela=npcById.get('lauvel-seeker');
          if(sela){sela.posture=burying.stage==='unknown'?'kneel':undefined;
            if(burying.buried){const at=fieldPoint(7.9,14.5);world.npcPositions[sela.id]={x:at.x,z:at.z};sela.face=fieldPoint(6.5,15.3);}}}
        if(near!==(lauvelStretcher.group.parent===scene)){if(near)scene.add(lauvelStretcher.group);else scene.remove(lauvelStretcher.group);}
        if(near){const round=combat.state.phase==='active'&&combat.state.encounterId===LUSCIA_WOLVES.id?bearersStandingBack():bearersAt(playSeconds),front=npcById.get('lauvel-bearer-front'),back=npcById.get('lauvel-bearer-back');
          world.npcPositions[front.id]={...round.front};world.npcPositions[back.id]={...round.back};front.pace=back.pace=1.5;
          const a=front.actor.group.position,b=back.actor.group.position;
          lauvelStretcher.group.position.set((a.x+b.x)/2,(a.y+b.y)/2+.9,(a.z+b.z)/2);lauvelStretcher.group.rotation.y=Math.atan2(a.x-b.x,a.z-b.z);lauvelStretcher.carrying=round.carrying;}}
      {// The Sultana: seen coming in and putting out, heard from the quay; John steps ashore when she is in, and off when she sails.
        const pp=player.group.position;
        if(mode==='playing')for(const event of salt.update(dt,{x:pp.x,z:pp.z})){const said=saltToast(event);if(said)toast(said.line,said.title);if(event.type==='moored'||event.type==='gone')saveRoad(false);}
        if(npcById.get(JOHN.id).hidden===salt.ashore)placeSalt();
        const pose=salt.pose(),seen=!!pose&&Math.hypot(pose.x-pp.x,pose.z-pp.z)<340;
        if(seen!==(sultana.group.parent===scene)){if(seen)scene.add(sultana.group);else scene.remove(sultana.group);}
        if(seen){sultana.group.position.set(pose.x,SEA_LEVEL+.04,pose.z);sultana.group.rotation.y=pose.yaw;sultana.update(elapsed,pose);}}
      {// Ed the Word comes ashore. A sail stands straight in for the pier, the village braces,
       // she rounds up a long way short, puts a man over her side and goes. He swims the last
       // sixty-eight metres on the ordinary mechanic and walks out on the strand.
        const pp=player.group.position,pose=shipAt(playSeconds);
        const seen=pose.visible&&Math.hypot(pose.x-pp.x,pose.z-pp.z)<420;
        if(seen&&!rebelShip)rebelShip=createRebelShip();
        if(rebelShip&&seen!==(rebelShip.group.parent===scene)){if(seen)scene.add(rebelShip.group);else scene.remove(rebelShip.group);}
        if(seen){rebelShip.group.position.set(pose.x,SEA_LEVEL+.04,pose.z);rebelShip.group.rotation.y=pose.yaw;rebelShip.update(elapsed,pose);}
        if(mode==='playing'){const owed=wordToastAt(playSeconds,wordSaid);
          if(owed){wordSaid=owed.key;toast(owed.line,owed.title);if(owed.key!=='turns')audio?.effect('bell');if(owed.key==='ashore')saveRoad(false);}}
        // While the water has him he is not an NPC walking to a home: he floats and swims a line.
        const swim=swimmerAt(playSeconds),ed=npcById.get(WORD_ID);
        if(ed){ed.swimming=swim.swimming?swim:null;
          if(swim.swimming){world.npcPositions[WORD_ID]={x:swim.x,z:swim.z};ed.hidden=false;ed.placement={...(ed.placement??{}),phase:'landing'};}}}
      {// The Koopwood: the nearest standing tree in reach; stumps grow back; the lot moves only when somebody could see it.
        const pp=player.group.position;let best=CHOP_REACH;currentChop=null;
        if(mode==='playing'&&combat.state.phase!=='active'&&!chop)for(const t of WOODLOT_TREES){const d=Math.hypot(t.x-pp.x,t.z-pp.z);if(d<best&&wood.standing(t.id)){best=d;currentChop=t;}}
        const near=Math.hypot(BOWDEN_STAND.x-pp.x,BOWDEN_STAND.z-pp.z)<260;
        for(const id of wood.update(dt)){if(near)world.woodlot.regrow(id);else world.woodlot.set(id,true);}
        if(near)world.woodlot.update(dt,elapsed);
        const free=mode==='playing'&&combat.state.phase!=='active';
        currentBench=free&&Math.hypot(WORKBENCH_SPOT.x-pp.x,WORKBENCH_SPOT.z-pp.z)<WORKBENCH_SPOT.reach?WORKBENCH_SPOT:null;
        currentPlot=free&&Math.hypot(PLOT_STAND.x-pp.x,PLOT_STAND.z-pp.z)<PLOT_STAND.reach?PLOT_STAND:null;
        currentPost=free?BIRDHOUSE_POSTS.find(spot=>Math.hypot(spot.x-pp.x,spot.z-pp.z)<spot.reach)??null:null;
        for(const id of building.update(dt)){const spot=BIRDHOUSE_POSTS.find(s=>s.id===id);world.homestead.setPost(id,building.post(id));
          if(Math.hypot(spot.x-pp.x,spot.z-pp.z)<60)toast(`Something has moved into the birdhouse on ${spot.name}.`,'BIRDHOUSE');}
        world.homestead.update(dt,elapsed);}
      currentCask=mode==='playing'&&combat.state.phase!=='active'&&Math.hypot(SEA_WALL_NICHE.x-player.group.position.x,SEA_WALL_NICHE.z-player.group.position.z)<SEA_WALL_NICHE.reach?SEA_WALL_NICHE:null;
      const nearBorder=Math.hypot(player.group.position.x-world.border.x,player.group.position.z-world.border.z)<9;
      currentAcorn=mode==='playing'?woodlandLife.nearestAcorn(player.group.position,2):null;
      currentStick=mode==='playing'?woodlandLife.nearestStick(player.group.position,2):null;
      currentFruit=mode==='playing'?woodlandLife.nearestFruit(player.group.position,2):null;
      currentMushroom=mode==='playing'&&combat.state.phase!=='active'?mushrooms.nearest(player.group.position,2.2):null;
      currentPlant=mode==='playing'&&combat.state.phase!=='active'&&!currentMushroom?flora.nearest(player.group.position,2.2):null;
      currentStone=mode==='playing'&&combat.state.phase!=='active'&&!currentMushroom&&!currentPlant?stones.nearest(player.group.position,2.2):null;
      currentDig=mode==='playing'&&combat.state.phase!=='active'&&!currentMushroom&&!currentPlant&&!currentStone?digs.nearest(player.group.position):null;
      currentVine=mode==='playing'&&combat.state.phase!=='active'&&!currentDig?vinePlateNear(player.group.position):null;
      currentTree=mode==='playing'&&combat.state.phase!=='active'&&!currentMushroom&&!currentPlant&&!currentStone?specimenTrees.nearest(player.group.position):null;
      nearOldTree=mode==='playing'&&Math.hypot(player.group.position.x-TALKING_TREE.x,player.group.position.z-TALKING_TREE.z)<TALKING_TREE.trunkRadius*1.6+2.4;
      if(mode==='playing'){oldTreeView.pose(oldTree.update(dt,{x:player.group.position.x,z:player.group.position.z}));specimenTrees.update(player.group.position);}
      if(mode==='playing'){if(jimson.tick(Math.min(1,Math.max(0,elapsed-jimsonClock))))jimsonNight();jimsonClock=elapsed;}
      if(mode==='playing'){if(fightAt&&refugees.positions().some(walker=>Math.hypot(walker.x-fightAt.x,walker.z-fightAt.z)<60))refugeeHold+=dt;refugees.setClock(playSeconds-refugeeHold);for(const walker of refugees.positions()){world.npcPositions[walker.id]={x:walker.x,z:walker.z};const npc=npcById.get(walker.id);if(npc)npc.pace=walker.pace;}}
      const p=player.group.position,nearestPickup=[currentAcorn,currentStick,currentFruit].filter(Boolean).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];
      if(currentAcorn!==nearestPickup)currentAcorn=null;if(currentStick!==nearestPickup)currentStick=null;if(currentFruit!==nearestPickup)currentFruit=null;
      nearRepair=(world.repairBenches||[world.repairBench]).some(bench=>Math.hypot(p.x-bench.x,p.z-bench.z)<2.1);
      const js=journey.state;
      currentJourneySite=mode==='playing'?Object.values(world.journeySites||{}).filter(site=>!journeyGathered.has(site.id)&&!js.parcels.includes(site.id)&&!js.beacons.includes(site.id)&&!(site.id==='bridge-repair'&&js.bridgeRepaired)&&Math.hypot(p.x-site.x,p.z-site.z)<2.7).sort((a,b)=>Math.hypot(p.x-a.x,p.z-a.z)-Math.hypot(p.x-b.x,p.z-b.z))[0]||null:null;
      currentFire=mode==='playing'?world.firePits.find(fire=>Math.hypot(p.x-fire.x,p.z-fire.z)<2.1):null;
      currentForestSite=mode==='playing'?FOREST_STORY_SITES.find(site=>Math.hypot(p.x-site.x,p.z-site.z)<2.7)||null:null;
      currentRegionalSite=mode==='playing'?REGIONAL_LIFE_SITES.filter(site=>Math.hypot(p.x-site.x,p.z-site.z)<2.3).sort((a,b)=>Math.hypot(p.x-a.x,p.z-a.z)-Math.hypot(p.x-b.x,p.z-b.z))[0]||null:null;
      currentLusciaSite=mode==='playing'&&luscia.view().stage==='find-satchel'?Object.values(LUSCIA_SITES).find(site=>Math.hypot(p.x-site.x,p.z-site.z)<2.7)||null:null;
      currentFeederHook=mode==='playing'&&birding.feeder==='filled'&&inventory.has(FILLED_FEEDER_ITEM)&&Math.hypot(p.x-world.birdGarden.hook.x,p.z-world.birdGarden.hook.z)<2.6;
      currentMorosSite=mode==='playing'&&moros.view().stage==='claim-horse'?Object.values(MOROS_SITES).find(site=>Math.hypot(p.x-site.x,p.z-site.z)<3)||null:null;
      // A place the traveler has business at keeps its prompt, and the key, from a hired sword who is walking by.
      if(currentNPC&&placeKeepsPrompt({marked:!!currentNPC.marker?.visible,passing:mercenaryIds.has(currentNPC.id)},currentJourneySite||currentForestSite||currentRegionalSite||currentLusciaSite||currentMorosSite))currentNPC=null;
      // The horses on the line breathe, graze and swish only while the traveler is near enough to see them.
      {const near=Math.hypot(p.x-horseLine[0].x,p.z-horseLine[0].z)<160;for(const [i,horse] of horseLine.entries()){horse.actor.group.visible=near;if(near)horse.actor.animate(elapsed+i*1.7,0,true,horse.grazing?{grazing:Math.sin(elapsed*.11+i)>0}:{});}}
      currentHideoutSite=null;
      if(mode==='playing'){
        const state=forestHideout.state,config=FOREST_HIDEOUT_QUEST;
        if(state.cleared&&!state.recovered&&Math.hypot(p.x-config.supplies.x,p.z-config.supplies.z)<2.7)currentHideoutSite='supplies';
        else if(Math.hypot(p.x-config.approach.x,p.z-config.approach.z)<3.5||Math.hypot(p.x-config.encounter.center.x,p.z-config.encounter.center.z)<9)currentHideoutSite='approach';
      }
      currentFishingSpot=(world.fishingSpots||[{...world.pond,name:'Willowmere Pond'}]).find(spot=>Math.hypot(p.x-spot.fishingSpot.x,p.z-spot.fishingSpot.z)<2.1)||null;
      nearFishing=!!currentFishingSpot;
      // A plant, stone, mushroom or tree is always optional: anything else within reach gets the F first, so a tree beside a parcel cannot swallow it.
      if(currentFeederHook||currentHideoutSite||currentForestSite||currentRegionalSite||currentLusciaSite||currentMorosSite||currentJourneySite||currentFire||nearFishing||nearRepair||currentAcorn||currentStick||currentFruit){currentMushroom=null;currentPlant=null;currentStone=null;currentTree=null;currentDig=null;currentVine=null;if(currentNPC?.cat)currentNPC=null;}
      show('interaction',mode==='playing'&&(!!currentNPC||currentFeederHook||!!currentMushroom||!!currentPlant||!!currentStone||!!currentDig||!!currentVine||!!currentCask||!!currentTree||!!currentChop||!!currentBench||!!currentPlot||!!currentPost||nearOldTree||!!currentHideoutSite||!!currentForestSite||!!currentRegionalSite||!!currentLusciaSite||!!currentMorosSite||!!currentJourneySite||!!currentFire||nearFishing||!!currentAcorn||!!currentStick||!!currentFruit||nearRepair||nearBorder)&&combat.state.phase!=='active');
      if(currentNPC)$('interaction-label').textContent=currentNPC.greet?currentNPC.greet:currentNPC.dog?'Greet the dog':currentNPC.cat?'Greet the cat':'Speak with '+currentNPC.name;else if(currentFire)$('interaction-label').textContent='Tend the fire · cooking';else if(nearFishing)$('interaction-label').textContent=inventory.has('fishing-rod')?'Cast a line':`Fishing bank · ask ${currentFishingSpot?.id==='reedwater'?'Hollis':'Bran'} for a rod`;else if(nearRepair)$('interaction-label').textContent='Repair weapons · free';else if(currentFruit)$('interaction-label').textContent='Gather ripe pawpaw · +25 health';else if(currentStick)$('interaction-label').textContent='Gather fallen stick';else if(currentAcorn)$('interaction-label').textContent='Gather acorn';else if(nearBorder)$('interaction-label').textContent='Read the border notice';
      if(currentJourneySite&&!currentNPC)$('interaction-label').textContent=journey.availableActions().find(action=>action.objectiveId===currentJourneySite.id)?.label||(['sticks','fruit'].includes(currentJourneySite.type)?'Gather '+currentJourneySite.name:currentJourneySite.name);
      if(currentForestSite&&!currentNPC)$('interaction-label').textContent=currentForestSite.prompt;
      if(currentRegionalSite&&!currentNPC)$('interaction-label').textContent=currentRegionalSite.prompt;
      if(currentLusciaSite&&!currentNPC)$('interaction-label').textContent=currentLusciaSite.prompt;
      if(currentMorosSite&&!currentNPC)$('interaction-label').textContent=currentMorosSite.prompt;
      if(currentFeederHook&&!currentNPC)$('interaction-label').textContent='Hang the hummingbird feeder';
      if(currentStone&&!currentNPC&&!currentFeederHook&&!currentMushroom&&!currentPlant)$('interaction-label').textContent=geology.met?(geology.hasFound(currentStone.species)?`Pick up the ${currentStone.name.toLowerCase()}`:'Look at this stone'):'A stone catches your eye';
      if(currentDig&&!currentNPC&&!currentFeederHook&&!currentMushroom&&!currentPlant&&!currentStone)$('interaction-label').textContent=archaeology.met?(archaeology.hasFound(currentDig.id)?`${currentDig.name} \u00b7 written up`:'Read this place'):'A surveyor\u2019s peg with a red ribbon';
      if(currentVine&&!currentNPC&&!currentDig)$('interaction-label').textContent=`The ${VARIETIES[currentVine.variety].name} vines`;
      if(currentCask&&!currentNPC)$('interaction-label').textContent='The cask in the sea wall';
      if(currentBench&&!currentNPC)$('interaction-label').textContent='Use Bowden\u2019s workbench';
      if(currentPlot&&!currentNPC)$('interaction-label').textContent=!building.plot?'A staked-out plot':building.nextStage()?(building.stages?'Work on your house':'Build on your plot'):'Your house';
      if(currentPost&&!currentNPC){const now=building.post(currentPost.id);$('interaction-label').textContent=now.phase==='occupied'?'Empty the birdhouse':now.phase==='waiting'?'The birdhouse':['birdhouse','oak-birdhouse'].some(id=>inventory.has(id))?'Hang a birdhouse':'A birdhouse post';}
      if(currentChop&&!currentNPC){const k=TREE_KINDS[currentChop.kind],lv=skills.level(WOODCUTTING_SKILL);$('interaction-label').textContent=`Chop down the ${k.short}${lv<k.level?` \u00b7 Woodcutting ${k.level}`:''}`;}
      if(currentTree&&!currentNPC&&!currentFeederHook&&!currentMushroom&&!currentPlant&&!currentStone)$('interaction-label').textContent=botany.met?(botany.hasFound(currentTree.species)?`The ${currentTree.name.toLowerCase()}`:'Look at this tree'):'A tree worth looking at';
      if(nearOldTree&&!currentNPC)$('interaction-label').textContent=oldTree.awake?'It is looking at you':'The Old Tree';
      if(currentPlant&&!currentNPC&&!currentFeederHook&&!currentMushroom)$('interaction-label').textContent=botany.met?(botany.hasFound(currentPlant.species)?`Gather the ${currentPlant.name.toLowerCase()}`:'Look at this plant'):'Something growing here';
      if(currentMushroom&&!currentNPC&&!currentFeederHook)$('interaction-label').textContent=mycology.met?(mycology.hasFound(currentMushroom.species)?`Gather the ${currentMushroom.name.toLowerCase()}`:'Look at this mushroom'):'An unfamiliar mushroom';
      if(currentHideoutSite&&!currentNPC)$('interaction-label').textContent=currentHideoutSite==='supplies'?'Lift the stolen stores':'Inspect Bramble Scout Camp · optional';
      distance=THREE.MathUtils.lerp(distance,targetDistance,1-Math.exp(-6*dt));
      combatCamera=THREE.MathUtils.lerp(combatCamera,combat.state.phase==='active'?1:0,1-Math.exp(-3*dt));
      rideCamera=THREE.MathUtils.lerp(rideCamera,riding.mounted?1:0,1-Math.exp(-4*dt));
      const viewDistance=distance+combatCamera*1.2,viewPitch=THREE.MathUtils.lerp(pitch,Math.max(pitch,.56),combatCamera);
      cameraFocus.copy(player.group.position).add(new THREE.Vector3(0,1.5-combatCamera*.22+rideCamera*(RIDE.camera.up-RIDE.seat.up*.35),0));
      if(mode==='opening'){cameraTarget.set(15+Math.sin(elapsed*.09)*2,12.5,57);cameraFocus.set(0,3.5,14);}
      // During the sequence the camera IS the traveler's eye, so the lerp below is bypassed: a fifth
      // of a second of lag at five metres a second puts the view a metre astern, inside the stern.
      else if(mode==='arriving'&&opening){cameraTarget.copy(openingCamera.position);cameraFocus.copy(openingCamera.target);camera.position.copy(cameraTarget);}
      else {
        if(reviewTarget)cameraFocus.copy(reviewTarget);
        let actualDistance=viewDistance;
        for(const c of world.nearColliders(cameraFocus.x,cameraFocus.z,viewDistance+4,cameraColliders)){const vx=c.x-cameraFocus.x,vz=c.z-cameraFocus.z,along=vx*Math.sin(yaw)+vz*Math.cos(yaw),across=Math.abs(vx*Math.cos(yaw)-vz*Math.sin(yaw));const r=c.r??Math.max(c.hx,c.hz);if(along>0&&along<viewDistance+2&&across<r+.6&&cameraFocus.y<world.heightAt(c.x,c.z)+(c.kind==='house'?6:7))actualDistance=Math.min(actualDistance,Math.max(3.1,along-r-.6));}
        cameraTarget.set(cameraFocus.x+Math.sin(yaw)*actualDistance*Math.cos(viewPitch),cameraFocus.y+Math.sin(viewPitch)*actualDistance,cameraFocus.z+Math.cos(yaw)*actualDistance*Math.cos(viewPitch));cameraTarget.y=Math.max(cameraTarget.y,world.heightAt(cameraTarget.x,cameraTarget.z)+1.2);
      }
      camera.position.lerp(cameraTarget,1-Math.exp(-5*dt));
      cameraFocus.x+=Math.sin(combatClock*73)*shake;cameraFocus.y+=Math.sin(combatClock*59)*shake*.45;camera.lookAt(cameraFocus);
      shake=combatView.update(mode==='playing'&&!reviewFrozen?dt:0,combatClock,combat.state,player.group.position,mode==='playing');
      if(frameCount%15===0){sun.target.position.copy(player.group.position);sun.position.copy(player.group.position).add(new THREE.Vector3(-45,90,38));}
      // Compass bearings are true to the chart: today's road runs south-west across Drent, not north.
      const {index:headingIndex,labels:headings}=compassHeading(yaw,HEX_WORLD_TRANSFORM);
      [...$('compass').children].slice(0,5).forEach((node,i)=>node.textContent=headings[(headingIndex+2-i+8)%8]);
      mapClock+=dt;if(mapClock>.1){updateHUD();drawMinimap(map,{world,position:player.group.position,goal:destination(),combat:combat.state,angle:player.group.rotation.y,time:elapsed,discoveries,tracked:trackedPlace(),bird:birdWatch,northOffset:HEX_WORLD_TRANSFORM.northOffset});mapClock=0;}
      renderer.render(scene,camera);requestAnimationFrame(render);
    }catch(error){fail(error);}
  }
  requestAnimationFrame(render);
  setTimeout(()=>{$('loading').style.opacity='0';setTimeout(()=>show('loading',false),850);},250);

  if(new URLSearchParams(location.search).has('test')) {
    const state=()=>({mode,testingEnabled,heardDoom,mapTutorial:mapTutorial.step,playSeconds,mercenaries:company.summary(playSeconds),journey:journey.state,journeyView:journey.view(),campaign:campaign.view(),luscia:luscia.view(),burying:burying.snapshot(),moros:moros.view(),border:border.view(),autoplay:autopilot.active,mounted:riding.mounted,retries:retriesTaken,meadowCleared,region:world.regionAt(player.group.position.x,player.group.position.z).id,campcraft:campcraft.state,questStage,practiceHits,practiceDodges,inventory:inventory.items(),weapons:weapons.snapshot(),sticks:inventory.count('forest-stick'),pawpaws:inventory.count('pawpaw'),acorns:inventory.count('acorn'),sideQuest:acornQuest.status,chapter:chapterProgress(storyState()).number,ardryLetters:renaLetters.snapshot(),ardryFriendship:renaLetters.friendship('rena-lorn'),birding:birding.snapshot(),lakota:lakota.snapshot(),swimming:swimming.view(),fishing:fishing.snapshot(),mycology:mycology.snapshot(),mushroomSites:mushrooms.state().sites.length,botany:botany.snapshot(),pipe:pipe.snapshot(),jimson:jimson.snapshot(),katy:katy.snapshot(),troy:troy.snapshot(),vineyard:vineyard.snapshot(),hunt:hunt.snapshot(),light:light.snapshot(),bosco:bosco.snapshot(),heist:heist.snapshot(),plantSites:flora.state().sites.length,geology:geology.snapshot(),archaeology:archaeology.snapshot(),wine:wine.snapshot(),cooking:cooking.snapshot(),wineAttic:wineAttic.snapshot(),puck:puck.snapshot(),chameleon:chameleon.snapshot(),troupe:troupe.snapshot(),brandy:brandy.snapshot(),salt:salt.snapshot(),woodcutting:wood.snapshot(),construction:building.snapshot(),woodlot:WOODLOT_TREES.filter(t=>!wood.standing(t.id)).map(t=>t.id),stoneSites:stones.state().sites.length,oldTree:oldTree.view(),specimenTrees:specimenTrees.state().trees.length,refugees:refugees.snapshot(),fallen:fallen.snapshot(),refugeesArrived:refugees.arrived,skills:skills.view(),birds:drentBirds.state(),birdWatch,birdPointer:birdPointer.visible,chart:mapFog.snapshot(),cartography:cartography.snapshot(),chartRevealed,lysaFriendship:acornQuest.friendship,selectedItem:inventory.selectedId(),phase:combat.state.phase,hp:combat.state.player.hp,playerAction:combat.state.player.action,enemies:combat.state.enemies.map(e=>({id:e.id,hp:e.hp,action:e.action,progress:e.progress,x:e.x,z:e.z})),position:player.group.position.toArray(),discoveries:[...discoveries],frames:frameCount,averageFrameMs:Math.round(1000*frameDeltas.reduce((a,b)=>a+b,0)/frameDeltas.length),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles});
    const focusedRoadHooks=()=>({world,player,journey,inventory,weapons,campcraft,combat,checkpoint,journeyAct,saveRoad,continueRoad,
      frames:async(count=1)=>{for(let i=0;i<count;i++)await new Promise(resolve=>requestAnimationFrame(resolve));},
      // The opening sequence, for a harness that would rather not sit through forty-four seconds.
      openingState:()=>opening&&stateAt(openingTime,{variant:opening.id,companion:opening.companion}),
      advanceOpening:seconds=>{openingTime+=seconds;},
      openingBells:()=>openingBells,
      prepare:()=>{questStage=10;practiceHits=2;practiceDodges=1;testingEnabled=false;inventory.grant('harbor-letter');inventory.grant('road-token');
        combat.startPractice(world.training);combat.finishPractice();leaveOpening();mode='playing';document.body.classList.add('playing');
        show('opening',false);{const p=toWorld(-198,26);player.group.position.set(p.x,world.heightAt(p.x,p.z),p.z);}refreshQuest();settleCamera();},
      press:code=>document.dispatchEvent(new KeyboardEvent('keydown',{code})),
      release:code=>document.dispatchEvent(new KeyboardEvent('keyup',{code})),
      getMode:()=>mode,setYaw:value=>yaw=value,audioState:()=>audio?.state(),toggleAudio:()=>$('sound').click(),
      startFishing,endFishing,setFishingSpot:id=>{currentFishingSpot=world.fishingSpots.find(spot=>spot.id===id);},
      handleCampEvents,readState:state,setMode:value=>value==='pause'?modal('pause'):closeModal(),
      cameraState:()=>({position:camera.position.toArray(),target:cameraFocus.toArray()})});
    const forestHooks=()=>({...focusedRoadHooks(),forestStory,forestAct,forestEcology,woodlandLife,
      warp:(x,z)=>{player.group.position.set(x,world.heightAt(x,z),z);grounded=true;verticalSpeed=0;},
      prepareVillage:()=>{questStage=1;testingEnabled=false;practiceHits=0;practiceDodges=0;combat.startPractice(world.training);combat.finishPractice();
        leaveOpening();mode='playing';document.body.classList.add('playing');show('opening',false);show('loading',false);
        player.group.position.set(FOREST_STORY_NPC.x+1.5,world.heightAt(FOREST_STORY_NPC.x+1.5,FOREST_STORY_NPC.z+1),FOREST_STORY_NPC.z+1);refreshQuest();settleCamera();}});
    const hideoutHooks=()=>({...forestHooks(),forestHideout,hideoutAct,hideoutWatch,handleCombatEvents,attack,
      prepareHideout:(stage=10)=>{forestHooks().prepareVillage();questStage=stage;journey.restore(createJourney().snapshot());if(stage>=10)journey.start();reviewFrozen=false;reviewTarget=null;forestHideout.restore();syncHideout();
        if(stage>=2)inventory.grant('harbor-letter');if(stage>=6)inventory.grant('road-token');if(stage>=3){practiceHits=2;practiceDodges=1;}weapons.repair();
        const p=FOREST_HIDEOUT_QUEST.approach;player.group.position.set(p.x,world.heightAt(p.x,p.z),p.z);yaw=0;refreshQuest();settleCamera();},
      hideoutEncounter});
    const localMapHooks=()=>({...forestHooks(),trailMap,localMapModel,trackPlace,clearTrailPin,trackedPlace,openLocalMap,discoverySet:discoveries,
      normalSnapshot:()=>({questStage,position:player.group.position.toArray(),inventory:inventory.items().map(id=>({id,quantity:inventory.count(id)})),weapons:weapons.snapshot(),journey:journey.snapshot(),forestStory:forestStory.snapshot(),forestHideout:forestHideout.snapshot(),discoveries:[...discoveries].sort(),health:combat.state.player.hp,checkpoint:checkpoint.read().data}),
      prepareLocalMap:()=>{forestHooks().prepareVillage();discoveries.clear();forestStory.restore();forestHideout.restore();journey.restore(createJourney().snapshot());syncForest();syncHideout();
        trackedPlaceId=null;reviewFrozen=false;reviewTarget=null;player.group.visible=true;show('modal-backdrop',false);show('dialogue',false);
        player.group.position.set(-15,world.heightAt(-15,29),29);yaw=Math.PI/2;pitch=.4;distance=targetDistance=9;refreshQuest();settleCamera();}});
    const regionalHooks=()=>({...forestHooks(),regionalLife,regionalAct,localMapModel,openLocalMap,trackPlace,
      prepareRegional:()=>{focusedRoadHooks().prepare();regionalLife.restore();syncRegionalLife();reviewFrozen=false;reviewTarget=null;player.group.visible=true;show('modal-backdrop',false);show('dialogue',false);yaw=0;pitch=.35;distance=targetDistance=8;stopInput();settleCamera();saveRoad(false);}});
    window.__AZHORA__={state,
      // The tongues, for a review that wants the dialogue panel as a new traveler sees it.
      linguist:{view:()=>linguist.view(),forget:()=>{linguist.restore(createLinguist().snapshot());if(mode==='dialogue')updateSpeech();},
        study:(id,exposure)=>{const result=linguist.study(id,exposure);if(mode==='dialogue')updateSpeech();return result;},
        toggle:force=>{const on=linguist.toggle(force);if(mode==='dialogue')updateSpeech();return on;}},
      // Who you are: the chosen id is settled on the opening screen, before Step ashore, so the
      // arrival sequence and anything else that runs after it can ask for it (PLAYABLE, companyFor).
      playerCharacter:()=>playerId,chooseCharacter:id=>characterSelect.select(id),
      // Where the camera is and what it is doing: main.cjs --review-views prints it beside each picture.
      camera:()=>({position:camera.position.toArray().map(v=>+v.toFixed(2)),focus:cameraFocus.toArray().map(v=>+v.toFixed(2)),yaw:+yaw.toFixed(2),pitch:+pitch.toFixed(2),distance:+distance.toFixed(2),mode}),
      // Performance: what is drawn and how much there is (main.cjs --perf-review), and render timing once asked for.
      perf:()=>{let objects=0,meshes=0;scene.traverse(o=>{objects++;if(o.isMesh)meshes++;});const info=renderer.info;
        return{calls:info.render.calls,triangles:info.render.triangles,geometries:info.memory.geometries,textures:info.memory.textures,programs:info.programs?.length??0,objects,meshes,
          npcs:npcData.length,visibleNpcs:npcData.filter(n=>n.actor.group.visible).length,colliders:world.colliders.length,shadows:renderer.shadowMap.enabled,pixelRatio:renderer.getPixelRatio(),size:renderer.getSize(new THREE.Vector2()).toArray()};},
      // What the last frame drew, and who was in it: the figures drawn, the ones near enough to cast their own
      // shadow (thirty metres, below), and how many meshes that is either way (main.cjs --draw-review).
      draws:()=>{const p=player.group.position,info=renderer.info,drawn=npcData.filter(n=>!n.hidden&&!n.fallen&&n.actor.group.visible);
        const parts=n=>{let meshes=0,casters=0;n.actor.group.traverse(o=>{if(o.isMesh&&o.visible){meshes++;if(o.castShadow)casters++;}});return{meshes,casters};};
        let visibleMeshes=0,visibleCasters=0;scene.traverse(o=>{if(!o.isMesh)return;for(let a=o;a;a=a.parent)if(!a.visible)return;visibleMeshes++;if(o.castShadow)visibleCasters++;});
        const within=r=>drawn.filter(n=>n.actor.group.position.distanceTo(p)<r),shadowed=drawn.filter(n=>n.shadows);
        return{calls:info.render.calls,triangles:info.render.triangles,position:[+p.x.toFixed(1),+p.z.toFixed(1)],region:world.regionAt(p.x,p.z)?.name??null,
          figures:npcData.length,figuresDrawn:drawn.length,figuresWithin30:within(30).length,figuresWithin60:within(60).length,shadowFigures:shadowed.length,
          figureMeshes:drawn.reduce((s,n)=>s+parts(n).meshes,0),figureCasterMeshes:shadowed.reduce((s,n)=>s+parts(n).casters,0),
          visibleMeshes,visibleCasters,shadowMap:renderer.shadowMap.enabled,who:within(30).map(n=>n.id),talking:currentNPC?.id??null};},
      // One of the west's animals as it is this frame, so a review shot can say what it is a picture of.
      westAnimal:id=>{const a=westLife.snapshot().creatures.find(c=>c.id===id);return a?{...a}:null;},
      timeRender:()=>{if(renderer.__timed)return;const draw=renderer.render.bind(renderer);window.__renderTimes=[];renderer.render=(s,c)=>{const t=performance.now();draw(s,c);window.__renderTimes.push(performance.now()-t);};renderer.__timed=true;},woodland:()=>woodlandLife.state(),roadLife:()=>roadLife.state(),roadVerges:()=>roadVerges.state(),forestEcology:()=>forestEcology.state(),forestStory:()=>forestStory.state,
      regionalLife:()=>({story:regionalLife.state,world:world.regionalPlaceState(),metrics:world.regionalPlaceMetrics}),
      runRegionalLifeChecks:()=>runRegionalLifeSmoke(regionalHooks()),verifyRegionalLifeReload:expected=>verifyRegionalLifeReload(regionalHooks(),expected),
      reviewRegional(view){
        regionalHooks().prepareRegional();regionalLife.restore();syncRegionalLife();
        const district=view.startsWith('mill')?2:view.startsWith('workshop')?3:4;
        testTravel(district);reviewFrozen=true;show('dialogue',false);show('modal-backdrop',false);
        let p=district===2?{x:-236,z:62}:district===3?{x:-380,z:120}:{x:-152,z:322};
        yaw=.68;pitch=.42;distance=targetDistance=17;
        const focus=district===2?{x:-243,z:67}:district===3?{x:-385,z:124}:{x:-158,z:326};
        reviewTarget=new THREE.Vector3(focus.x,world.heightAt(focus.x,focus.z)+1,focus.z);
        if(view.includes('complete')||view==='shelter-record'||view==='road-notes'){
          for(const action of ['accept-mill-share','lower-mill-share','return-mill-share','accept-net-help','free-net-float-west','free-net-float-east','return-net-help','accept-witness-account','record-testimony-anonymous'])regionalLife.act(action);
          syncRegionalLife();
        }
        if(view.includes('dialogue')){
          const npc=npcData.find(person=>person.id===({2:'commons-miller',3:'reed-worker',4:'shelter-keeper'})[district]);
          p={x:p.x+1.2,z:p.z+1.1};yaw=.1;pitch=.25;distance=targetDistance=5.4;
          reviewTarget=new THREE.Vector3(npc.actor.group.position.x,world.heightAt(p.x,p.z)+1.2,npc.actor.group.position.z);
          regionalLifeConversation(npc,regionalContext);
          while(activeDialogue.index<activeDialogue.lines.length-1)nextSpeech();
        }
        if(view==='shelter-choice'){
          regionalLife.act('accept-witness-account');p={x:-158,z:326};
          regionalLifeSiteConversation('shelter-ledger',regionalContext);
          while(activeDialogue.index<activeDialogue.lines.length-1)nextSpeech();
        }
        player.group.position.set(p.x,world.heightAt(p.x,p.z),p.z);player.group.rotation.y=Math.PI+yaw;
        if(view==='road-notes'){modal('journal');mapTab(false);$('journal-regional-life').scrollIntoView({block:'start'});}
        if(view==='mill-map'){discoveries.add('mill-commons');regionalLife.act('accept-mill-share');openLocalMap();trailMap.select('mill-hoist');$('trail-map-zoom-in').click();}
        settleCamera();return {story:regionalLife.state,world:world.regionalPlaceState(),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles};
      },
      runLocalMapChecks:()=>runLocalMapSmoke(localMapHooks()),
      localMapState:()=>({map:trailMap.state(),tracked:trackedPlace(),mode,mainGoal:destination(),discoveries:[...discoveries],player:player.group.position.toArray()}),
      reviewLocalMap(view){
        localMapHooks().prepareLocalMap();reviewFrozen=true;discoveries.add('village');discoveries.add('harbor');
        if(view!=='local-unknown')for(const id of ['woodland','watch','pond','charcoal-hearth','bee-fold','fallen-oak','moss-shrine','fern-hollow','coast-lookout','northTrail'])discoveries.add(id);
        player.group.position.set(-128,world.heightAt(-128,34),34);player.group.rotation.y=Math.PI;yaw=Math.PI/2;
        if(view==='local-nearby'||view==='local-forest-pin'){if(view==='local-nearby')player.group.position.set(-15,world.heightAt(-15,29),29);trackPlace('bee-fold');settleCamera();return trailMap.state();}
        openLocalMap();
        if(view==='local-unknown')trailMap.select('bee-fold');
        else if(view==='local-reedwater'){discoveries.add('reed-bridge');discoveries.add('reedwater-bank');trailMap.open(3);trailMap.select('reed-bridge');}
        else if(view==='local-world'){mapTab(true);worldMap.ready.then(()=>worldMap.focus('Drent'));}
        else{trailMap.select('bee-fold');trackPlace('bee-fold');trailMap.refresh();if(view==='local-zoom')$('trail-map-zoom-in').click();}
        settleCamera();return trailMap.state();
      },
      forestHideout:()=>({quest:forestHideout.state,world:world.forestHideoutState(),watch:hideoutWatch.state()}),
      runHideoutChecks:()=>runHideoutSmoke(hideoutHooks()),verifyHideoutReload:expected=>verifyHideoutReload(hideoutHooks(),expected),
      async reviewHideout(view){
        hideoutHooks().prepareHideout();reviewFrozen=true;show('dialogue',false);show('modal-backdrop',false);player.group.visible=true;
        let p={x:-129,z:-27};yaw=-1.85;pitch=.5;distance=targetDistance=14;
        if(view==='hideout-approach'){p=FOREST_HIDEOUT_QUEST.approach;yaw=-.06;pitch=.27;distance=targetDistance=6.5;}
        if(view==='hideout-supplies'){p=FOREST_HIDEOUT_QUEST.supplies;yaw=-.25;pitch=.38;distance=targetDistance=6;}
        player.group.position.set(p.x,world.heightAt(p.x,p.z),p.z);player.group.rotation.y=Math.PI+yaw;
        if(view==='hideout-overview')reviewTarget=new THREE.Vector3(hideoutEncounter.center.x,world.heightAt(hideoutEncounter.center.x,hideoutEncounter.center.z)+1,hideoutEncounter.center.z);
        if(view==='hideout-dialogue')hideoutConversation(hideoutContext);
        if(view==='hideout-cleared'){forestHideout.inspect();forestHideout.begin({questStage});forestHideout.markCleared(hideoutEncounter.id);syncHideout();reviewTarget=new THREE.Vector3(hideoutEncounter.center.x,world.heightAt(hideoutEncounter.center.x,hideoutEncounter.center.z)+1,hideoutEncounter.center.z);}
        if(view==='hideout-tamsin'){
          forestHideout.inspect();forestHideout.begin({questStage});forestHideout.markCleared(hideoutEncounter.id);forestHideout.recover();syncHideout();
          const npc=npcData.find(n=>n.id===FOREST_HIDEOUT_QUEST.recipientId),home=world.npcPositions[npc.id];
          player.group.position.set(home.x+1.2,world.heightAt(home.x+1.2,home.z+.6),home.z+.6);yaw=.5;pitch=.3;distance=targetDistance=5;
          garrisonConversation(npc,hideoutContext);
        }
        if(view==='forest-thrush'){
          const bird=forestEcology.state().birds[0];player.group.position.set(bird.x,world.heightAt(bird.x,bird.z+8),bird.z+8);player.group.visible=false;
          forestEcology.update(.15,elapsed,player.group.position,true);forestEcology.update(.15,elapsed,player.group.position,true);
          reviewTarget=new THREE.Vector3(bird.x,bird.groundY+.23,bird.z);yaw=.65;pitch=.22;distance=targetDistance=2.5;
        }
        settleCamera();return forestHideout.view();
      },
      developer:()=>developer.state(),
      runDeveloperChecks:()=>runDeveloperSmoke({...focusedRoadHooks(),developer,
        ghostVisibilityState:()=>({camp:hideoutWatch.state(),forest:forestEcology.state(),road:roadLife.state()}),
        prepare:()=>{forestHooks().prepareVillage();saveRoad(false);},
        normalStateSnapshot:()=>({questStage,inventory:inventory.items().map(id=>({id,quantity:inventory.count(id)})),weapons:weapons.snapshot(),position:player.group.position.toArray(),health:combat.state.player.hp,forestStory:forestStory.snapshot(),forestHideout:forestHideout.snapshot(),regionalLife:regionalLife.snapshot(),trackedPlaceId,journey:journey.snapshot(),acornStatus:acornQuest.status,woodland:woodlandLife.state().acorns.map(({id,collected})=>({id,collected})),camp:campcraft.checkpoint()})}),
      async reviewDeveloper(view){
        if(!developer.active){forestHooks().prepareVillage();modal('testing');$('ghost-dev-open').click();}
        await developer.ready;
        if(view==='ghost-atlas'){developer.setAtlas(true);return developer.state();}
        if(view==='ghost-local-atlas'){developer.setAtlas(true);developer.focusRegion('Drent');return developer.state();}
        if(view==='ghost-survey'){developer.visit(developer.destination('North Oreminidi Mountains'));return developer.state();}
        developer.visit(developer.destination('cape-thalmagar'));
        if(view==='cape-gate'){developer.setPosition({x:0,y:73,z:-48});developer.setView({yaw:0,pitch:0});}
        if(view==='cape-aerial'){developer.setPosition({x:135,y:150,z:-60});developer.setView({yaw:.87,pitch:.28});}
        return developer.state();
      },
      runForestChecks:()=>runForestSmoke(forestHooks()),verifyForestReload:expected=>verifyForestReload(forestHooks(),expected),
      runRoadChecks:()=>runRoadCheckSmoke(focusedRoadHooks()),
      beginAutoplay:()=>startAutopilot(),reviewLog:()=>reviewLog,startAt:id=>beginStoryStart(storyStart(id)),mapState:()=>worldMap.state(),
      chartRoad:(count=40)=>{const road=world.paths[0];for(let i=0;i<Math.min(count,road.length);i++)mapFog.reveal(road[i].x,road[i].z);},
      reviewPeek:()=>{const p=player.group.position;return {t:Math.round(playSeconds*10)/10,mode,questStage,region:world.regionAt(p.x,p.z)?.name??null,intent:autopilot.intent,active:autopilot.active,phase:combat.state.phase,encounter:combat.state.encounterId,hp:combat.state.player.hp,
        allies:combat.state.allies.map(a=>({id:a.id,name:a.name,hp:a.hp,escaped:!!a.escaped,wounded:!!a.wounded,frozen:a.frozen>0})),fallen:fallen.ids,x:Math.round(p.x*10)/10,z:Math.round(p.z*10)/10,journey:journey.view().stage,chapter:campaign.view().chapterId,
        dialogue:mode==='dialogue'?activeDialogue?.npc?.name??null:null,prompt:$('interaction').classList.contains('hidden')?null:$('interaction-label').textContent};},
      runAutoplayChecks:(options={})=>runAutoplaySmoke({...focusedRoadHooks(),autopilot,start:startAutopilot,stop:stopAutopilot,readState:state,beginAt:id=>beginStoryStart(storyStart(id)),...options}),
      autoplay:()=>({active:autopilot.active,intent:autopilot.intent,stopReason:autopilot.stopReason}),
      verifyReload:expected=>verifyRoadReload({...focusedRoadHooks(),continueRoad:()=>{$('continue-road').click();return mode==='playing';}},expected),
      async runRecoveryCheck(){
        const assert=(value,message)=>{if(!value)throw new Error(message);};
        const frames=focusedRoadHooks().frames;
        const saved=JSON.stringify(checkpoint.read().data);
        if(mode==='fishing')endFishing(true);
        mode='playing';{const p=toWorld(-244,12);player.group.position.set(p.x,world.heightAt(p.x,p.z),p.z);}
        combat.startEncounter(meadowEncounter);combat.state.player.hp=1;
        const deadline=performance.now()+18000;
        while(mode!=='defeated'){assert(performance.now()<deadline,'Meadow defeat did not arrive');await frames();}
        assert($('defeat-checkpoint').textContent.includes('Avrel'),'Meadow defeat named the wrong checkpoint');
        document.dispatchEvent(new KeyboardEvent('keydown',{code:'F8'}));
        assert(mode==='testing'&&combat.state.player.hp===100,'F8 did not open testing from defeat');
        $('test-region-3').click();await frames(3);
        assert(mode==='playing'&&testingEnabled&&world.regionAt(player.group.position.x,player.group.position.z).id===3,'Defeat testing travel failed');
        assert(JSON.stringify(checkpoint.read().data)===saved,'Defeat testing overwrote the normal checkpoint');
        return {meadowDefeatChecks:4,testingFromDefeat:true};
      },
      async runTraversal(){
        const frames=async(count=1)=>{for(let i=0;i<count;i++)await new Promise(resolve=>requestAnimationFrame(resolve));};
        prepareTesting();testTravel('4');journey.act('meet-ridge-keeper');
        for(const id of ['west','east','north'])journey.act(`restore-beacon-${id}`);
        journey.act('deliver-report');meadowCleared=true;syncJourney();refreshQuest();
        player.group.position.set(-178,world.heightAt(-178,29),29);yaw=Math.PI/2;settleCamera();
        await frames(3);
        const result=await runRoadTraversal({world,player,frames,
          press:code=>document.dispatchEvent(new KeyboardEvent('keydown',{code})),
          release:code=>document.dispatchEvent(new KeyboardEvent('keyup',{code})),
          setYaw:value=>yaw=value,readState:state});
        return {ok:true,...result,...state()};
      },
      async runSmoke(){
        // This check is also the test of weapon wear, which play has switched off for now (WEAPON_WEAR).
        weapons.setWear(true);
        const assert=(condition,message)=>{if(!condition)throw new Error(message);};
        const wait=ms=>new Promise(r=>setTimeout(r,ms));
        const until=async(condition,message)=>{const deadline=performance.now()+30000;while(!condition()){assert(performance.now()<deadline,message);await wait(40);}};
        const frames=async(count=2)=>{const target=frameCount+count;await until(()=>frameCount>=target,'Rendering stopped');};
        const press=code=>document.dispatchEvent(new KeyboardEvent('keydown',{code}));const release=code=>document.dispatchEvent(new KeyboardEvent('keyup',{code}));
        const tap=code=>{press(code);release(code);};
        const warp=(x,z)=>{player.group.position.set(x,world.heightAt(x,z),z);};
        const finishDialogue=()=>{let limit=10;while(activeDialogue&&limit-->0)nextSpeech();};
        // The opening sequence is forty-four seconds and `until` gives up after thirty, so the
        // walkthrough checks it starts, steps its clock over the bell, and then skips it.
        await frames(3);$('begin').click();await frames(2);
        assert(mode==='arriving'&&!$('cutscene').classList.contains('hidden')&&$('skip-cutscene').getClientRects().length,'The opening sequence did not start with Skip on screen');
        {const pose=world.arrivalBoatPose();assert(Math.hypot(pose.x-world.spawn.x,pose.z-world.spawn.z)>100,'The boat did not start out at sea');}
        assert(!player.group.visible,'The traveler was drawn during the opening');
        {const hooks=focusedRoadHooks();
          // Two seconds of slack either side of the bell at thirty: the frames this waits on also
          // advance the clock, and on a loaded machine a frame is not sixteen milliseconds.
          hooks.advanceOpening(28);await frames(2);
          assert(hooks.openingState().t<30,'The sequence clock passed the bell before it could be checked');
          assert(hooks.openingBells()===0,'The bell rang before the boat was off the pier');
          assert(hooks.openingState().caption,'The sequence said nothing in its first thirty seconds');
          hooks.advanceOpening(2.5);await frames(2);
          assert(hooks.openingState().t>30,'The sequence clock did not reach the bell');
          assert(hooks.openingBells()===1,'The bell did not ring at thirty seconds');}
        $('skip-cutscene').click();await until(()=>mode==='playing','Boat arrival did not finish');
        assert($('cutscene').classList.contains('hidden')&&!document.body.classList.contains('cutscene'),'The caption layer stayed up');
        assert(player.group.visible&&Math.hypot(player.group.position.x-world.spawn.x,player.group.position.z-world.spawn.z)<.01,'Skip did not land the traveler at the spawn');
        {const pose=world.arrivalBoatPose();assert(Math.hypot(pose.x-23,pose.z-34)<.01,'Skip did not moor the boat');}
        {const mate=npcById.get(landingMateId());assert(mate.actor.group.visible&&Math.abs(mate.actor.group.position.y-1.8)<.05&&canStand(mate.actor.group.position.x,mate.actor.group.position.z,world),'The companion is not standing on the deck');}
        assert(Math.abs(yaw-Math.PI/2)<1e-9&&Math.abs(player.group.rotation.y+Math.PI/2)<1e-9,'The landing does not face west with the camera behind');
        assert(inventory.has('simple-sword')&&weapons.profile().usable&&weapons.profile().durability===24,'Mercenary did not arrive equipped with a sound sword');
        assert(!inventory.has('tinderbox')&&!inventory.has('fishing-rod')&&!testingEnabled,'Normal game unexpectedly granted test supplies');
        assert(renderer.info.render.triangles>1000,'World did not draw');assert(canStand(world.spawn.x,world.spawn.z,world),'Spawn blocked');
        // Distance, not a compass point: the landing faces west up the pier now, so W walks in -x.
        {const from={x:player.group.position.x,z:player.group.position.z};press('KeyW');
          await until(()=>Math.hypot(player.group.position.x-from.x,player.group.position.z-from.z)>1,'WASD did not move');release('KeyW');}
        // He walks you up the pier, because he is the only one who can tell you what Mara says.
        {const mate=npcById.get(landingMateId());
          const gap=()=>Math.hypot(mate.actor.group.position.x-player.group.position.x,mate.actor.group.position.z-player.group.position.z);
          assert(mate.escorting,'The man off the boat did not set off up the pier with you');
          for(const spot of [[18,29],[12,29],[6,28.6]]){warp(spot[0],spot[1]);await frames(24);
            assert(gap()<INTERPRETER.range,`He fell ${gap().toFixed(1)} m behind at ${spot[0]}, ${spot[1]}`);
            assert(canStand(mate.actor.group.position.x,mate.actor.group.position.z,world),'He walked off the pier into the water');}
          assert(!mateSaidGoodbye,'He left before the letter was handed over');}
        warp(0,19);await frames();assert(questStage===1,'Arrival quest failed');
        // Measure travel against simulation time so busy machines do not affect
        // the comparison. Tab must run at Shift speed and never move UI focus.
        const speedWith=async modifier=>{
          warp(0,9);yaw=0;const started=combatClock;
          if(modifier)press(modifier);press('KeyW');
          await until(()=>combatClock-started>=.18,'Run movement did not update');
          release('KeyW');if(modifier)release(modifier);
          return(9-player.group.position.z)/(combatClock-started);
        };
        const tabDown=new KeyboardEvent('keydown',{code:'Tab',cancelable:true});document.dispatchEvent(tabDown);
        assert(tabDown.defaultPrevented&&keys.has('Tab'),'Gameplay Tab did not capture run input');release('Tab');
        const walkSpeed=await speedWith(),tabSpeed=await speedWith('Tab'),shiftSpeed=await speedWith('ShiftLeft');
        assert(Math.abs(walkSpeed-4.2)<.01&&Math.abs(tabSpeed-7.2)<.01&&Math.abs(tabSpeed-shiftSpeed)<.01,'Tab/Shift running speed or walking speed is wrong');
        warp(0,9);press('KeyQ');await until(()=>player.group.position.x<-.35&&player.group.position.z<8.65,'Q forward-left failed');release('KeyQ');
        // Beside Mara at the head of the pier, on her open side: people and the harbour crates around her are solid now.
        const harbor=npcById.get(HARBOURMASTER);player.group.position.copy(harbor.actor.group.position).add(new THREE.Vector3(1.4,0,1));await frames();
        const diagonalStart=player.group.position.clone();press('KeyE');assert(mode==='playing','E triggered dialogue');await until(()=>player.group.position.x>diagonalStart.x+.35&&player.group.position.z<diagonalStart.z-.35,'E forward-right failed');release('KeyE');
        player.group.position.copy(harbor.actor.group.position).add(new THREE.Vector3(-1,0,0));await frames();tap('KeyF');assert(mode==='dialogue','F talk failed');finishDialogue();assert(questStage===2,'Message assignment failed');
        assert(inventory.has('harbor-letter')&&inventory.has('simple-sword'),'Items were not received before the goblin encounter');
        press('Tab');tap('KeyI');assert(mode==='inventory'&&inventory.isOpen(),'I did not open the early satchel');
        assert(!keys.has('Tab'),'Opening inventory retained held run input');
        const inventoryTab=new KeyboardEvent('keydown',{code:'Tab',bubbles:true,cancelable:true});$('inventory-close').dispatchEvent(inventoryTab);
        assert(!inventoryTab.defaultPrevented&&!keys.has('Tab'),'Inventory Tab was captured as run input');release('Tab');
        const beforeInventory=player.group.position.clone();press('KeyW');await frames(3);release('KeyW');assert(player.group.position.distanceTo(beforeInventory)<.001,'Inventory allowed movement behind it');
        $('inventory-close').click();assert(mode==='playing'&&questStage===2,'Closing the early satchel skipped a lesson');
        warp(world.training.x,world.training.z+1.5);player.group.rotation.y=Math.PI;await frames();
        tap('KeyR');await until(()=>practiceHits===1,'First practice swing did not connect');await until(()=>combat.state.player.action==='idle','Practice recovery failed');
        canvas.dispatchEvent(new PointerEvent('pointerdown',{button:0}));await until(()=>practiceHits>=2,'Left-click practice swing did not connect');await until(()=>combat.state.player.action==='idle','Practice recovery failed');
        press('KeyA');tap('ControlLeft');release('KeyA');await until(()=>questStage===3,'Dodge lesson failed');await until(()=>combat.state.player.action==='idle','Dodge recovery failed');
        assert(weapons.status('simple-sword').durability===22,'Practice hits did not wear the sword exactly once each');
        warp(-47,29);await frames();assert(questStage===4&&combat.state.enemies.length===3,'Goblin ambush failed');
        // Pause freezes a committed encounter. A reduced-health fixture then
        // exercises an actual enemy strike, defeat screen, and checkpoint retry.
        modal('pause');const pausedEnemies=combat.state.enemies.map(e=>[e.x,e.z,e.progress]);await frames(4);
        assert(JSON.stringify(pausedEnemies)===JSON.stringify(combat.state.enemies.map(e=>[e.x,e.z,e.progress])),'Pause did not freeze combat');closeModal();
        combat.state.player.hp=17;warp(-54.5,30.3);
        await until(()=>mode==='defeated','Enemy did not land the defeat strike');await frames(18);
        assert(!$('defeat').classList.contains('hidden'),'Defeat screen missing');assert(combat.state.player.progress>0,'Defeat pose froze');
        $('retry').click();assert(mode==='playing'&&combat.state.player.hp===100&&questStage===4,'Checkpoint retry failed');assert(practiceHits>=2&&practiceDodges>=1,'Retry lost lessons');
        assert(weapons.status('simple-sword').durability===22,'Checkpoint retry repaired weapon wear');
        // Real input drives the rendered fight. Only travel between targets is
        // shortened here; damage, tells, cooldowns and victory use normal rules.
        let landed=0;const battleDeadline=performance.now()+90000;
        while(combat.state.phase==='active') {
          assert(performance.now()<battleDeadline,'Rendered battle did not resolve');
          const enemy=combat.state.enemies.find(e=>e.hp>0&&e.active!==false);
          if(!enemy){await frames();continue;}
          if(combat.state.player.action==='idle') {
            warp(enemy.x,enemy.z+1.35);player.group.rotation.y=Math.PI;
            if(enemy.action==='windup'&&enemy.progress>.55&&combat.state.player.stamina>=25){press('KeyD');tap('ControlLeft');release('KeyD');}
            else{tap('KeyR');landed++;}
          }
          await frames(2);assert(mode!=='defeated','Player lost the smoke fight');
        }
        assert(questStage===5,'Victory did not advance quest');
        const warden=npcById.get('warden');player.group.position.copy(warden.actor.group.position).add(new THREE.Vector3(1,0,0));await frames();tap('KeyF');finishDialogue();assert(questStage===6&&inventory.has('road-token'),'Eren did not introduce inventory or grant the token');
        tap('KeyI');assert(mode==='inventory','Inventory lesson did not open');
        const letterButton=document.querySelector('[data-item-id="harbor-letter"]');
        letterButton.dispatchEvent(new PointerEvent('pointerenter'));await frames();
        assert(!$('inventory-tooltip').hidden&&$('inventory-tooltip').textContent.includes('select'),'Item selection tooltip missing');assert(questStage===6,'Hover incorrectly completed the inventory lesson');
        tap('Escape');assert(mode==='playing'&&questStage===6,'Closing before inspection skipped the lesson');
        tap('KeyI');document.querySelector('[data-item-id="road-token"]').click();assert(questStage===6,'Wrong item completed letter objective');
        document.querySelector('[data-item-id="harbor-letter"]').click();assert(questStage===7,'Selecting the message did not advance inventory lesson');
        assert($('inventory-letter-body').textContent.includes('Ambroni')&&$('inventory-letter-body').textContent.includes('Avrel')&&$('inventory-letter-body').textContent.includes('Bramble'),'Message contents are missing');
        assert(inventory.isOpen(),'Inspection dismissed the satchel before teaching how to close it');tap('KeyI');assert(questStage===8&&mode==='playing','I did not dismiss the satchel and resume the journey');
        const atlas=await worldMap.ready;
        modal('journal');mapTab(true);await frames(2);
        assert(!$('world-map').classList.contains('hidden'),'Map failed');assert($('atlas-image').naturalWidth>0,'World map missing');
        assert(atlas?.hexCount===18700&&atlas.regionCount===131&&atlas.riverCount===572&&atlas.source.endsWith('azhora.wwmap'),'World Builder map source or geography changed');
        assert($('atlas-image').src.endsWith('azhora-world-map.svg'),'Journal still uses the sketch');
        {const m=worldMap.state(),scale=Math.min(m.width/atlas.width,m.height/atlas.height)*m.zoom,tx=m.offsetX+m.traveler.x*scale,ty=m.offsetY+m.traveler.y*scale;
          assert(m.zoom>3,'The chart did not open close enough to read');assert(Math.abs(tx-m.width/2)<m.width*.2&&Math.abs(ty-m.height/2)<m.height*.2,'The chart did not open on the traveler');
          assert($('atlas-traveler').textContent.includes('Drent'),'The traveler mark does not say where they are');}
        $('atlas-in').click();assert(worldMap.state().zoom>1,'Map zoom button failed');
        const previousZoom=worldMap.state().zoom;$('atlas-viewport').dispatchEvent(new WheelEvent('wheel',{deltaY:-100,clientX:innerWidth/2,clientY:innerHeight/2,cancelable:true}));
        assert(worldMap.state().zoom>previousZoom,'Map wheel zoom failed');
        $('atlas-izol').click();assert(worldMap.state().zoom>3,'Drent focus failed');
        const previousMapX=worldMap.state().offsetX;$('atlas-viewport').dispatchEvent(new KeyboardEvent('keydown',{code:'ArrowLeft',bubbles:true,cancelable:true}));
        assert(worldMap.state().offsetX>previousMapX,'Map keyboard pan failed');
        $('atlas-fit').click();assert(worldMap.state().zoom===1,'Whole-map view failed');closeModal();
        let northernDistance=0;
        // Walk the extended route with real movement/collision instead of
        // teleporting to its end. This checks the tutorial's continuous path.
        for(const point of world.routeNorth){
          const segmentStart=player.group.position.clone(),deadline=performance.now()+30000;
          press('KeyW');press('ShiftLeft');
          // People stand on the road and are solid: stalled against one, lean aside for a moment as a walker would.
          let lastAt=player.group.position.clone(),stalled=0,lean=0,side=1;
          while(Math.hypot(point.x-player.group.position.x,point.z-player.group.position.z)>.75){
            assert(performance.now()<deadline,'Northern path blocked before '+point.x+','+point.z);
            if(player.group.position.distanceTo(lastAt)<.02)stalled++;else stalled=0;lastAt.copy(player.group.position);
            if(stalled>8&&!lean){lean=24;side=-side;}
            yaw=Math.atan2(player.group.position.x-point.x,player.group.position.z-point.z)+(lean?side*.9:0);if(lean)lean--;await frames(1);
          }
          release('KeyW');release('ShiftLeft');northernDistance+=Math.hypot(player.group.position.x-segmentStart.x,player.group.position.z-segmentStart.z);
        }
        assert(questStage===10,'Arrival at the forest boundary did not finish Region 1');
        assert(discoveries.has('northTrail')&&discoveries.has('border'),'Northern landmarks missing');
        yaw=Math.PI/2;press('KeyW');await until(()=>player.group.position.x<world.border.barrierX-1,'Could not cross the open gate');release('KeyW');
        assert(world.regionAt(player.group.position.x,player.group.position.z).id===1,'Beyond the gate the road stays in Drent');
        warp(world.border.x,world.border.z);await frames(2);tap('KeyF');assert(mode==='dialogue'&&$('speech').textContent.includes('Avrel'),'Border notice did not explain the onward road');finishDialogue();
        const pick=async acorn=>{warp(acorn.x,acorn.z);await frames(2);assert(currentAcorn?.id===acorn.id,'Acorn pickup not reachable');tap('KeyF');assert(woodlandLife.state().acorns.find(a=>a.id===acorn.id).collected,'F failed to gather acorn');};
        const sites=woodlandLife.state().acorns;assert(sites.length===24,'Woodland pickup count changed');
        await pick(sites[0]);assert(inventory.count('acorn')===1&&acornQuest.status==='available','Acorns cannot be gathered before accepting the favor');
        const lysa=npcData.find(npc=>npc.id==='acorn-cook');
        const visitLysa=async()=>{const home=world.npcPositions['acorn-cook'];warp(home.x+1,home.z+1);await frames(2);tap('KeyF');assert(activeDialogue?.npc===lysa,'Lysa is not reachable for conversation');};
        const choose=id=>{const button=document.querySelector(`[data-choice="${id}"]`);assert(button,'Missing conversation choice '+id);button.click();};
        const finishTangent=()=>{let limit=10;while(activeDialogue&&!activeDialogue.choices&&limit-->0)nextSpeech();};
        await visitLysa();choose('acorn-tangent');assert(acornQuest.status==='available','Optional tangent silently accepted quest');
        nextSpeech();assert($('speech').textContent.includes('tannins'),'Acorn cookery tangent missing');finishTangent();
        choose('pawpaw-tangent');assert($('speech').textContent.includes('pawpaw'),'Lysa did not explain forest fruit');
        nextSpeech();assert($('speech').textContent.includes('25 health'),'Lysa did not teach how to eat fruit');finishTangent();
        choose('leave-lysa');assert(mode==='playing'&&acornQuest.status==='available','Declining forced side quest');
        await visitLysa();choose('accept-acorns');assert(acornQuest.status==='active'&&questStage===10,'Side quest changed the main tutorial');
        for(const acorn of sites.slice(1,6))await pick(acorn);
        assert(inventory.count('acorn')===6,'Acorns did not stack in inventory');
        tap('KeyI');document.querySelector('[data-item-id="acorn"]').click();assert($('inventory-detail').textContent.includes('6'),'Satchel omitted acorn quantity');
        const pausedWildlife=JSON.stringify(woodlandLife.state());await frames(4);assert(JSON.stringify(woodlandLife.state())===pausedWildlife,'Inventory did not pause wildlife');tap('KeyI');
        await visitLysa();choose('give-acorns');assert(acornQuest.status==='complete'&&inventory.count('acorn')===1&&inventory.has('tinderbox')&&acornQuest.friendship==='fond','Acorn delivery failed or consumed the wrong quantity');finishDialogue();
        await visitLysa();assert($('speech').textContent.includes('haven\'t forgotten')&&!document.querySelector('[data-choice="give-acorns"]'),'Lysa forgot the favor or offered a repeat turn-in');
        choose('warm-reply');finishDialogue();
        const squirrel=woodlandLife.state().squirrels[0];warp(squirrel.tree.x+1.8,squirrel.tree.z+1.8);
        await until(()=>woodlandLife.state().squirrels.some(s=>s.flees>0&&s.climbs>0&&['climb','perch'].includes(s.mode)),'Squirrels did not flee up a tree');
        const squirrelCheck=woodlandLife.state().squirrels.find(s=>s.climbs>0&&['climb','perch'].includes(s.mode));assert(squirrelCheck.y>world.heightAt(squirrelCheck.x,squirrelCheck.z),'Squirrel did not leave the ground');
        // Real F pickups, satchel buttons, strike contacts, and the repair station
        // exercise the equipment flow. Accelerated wear below is a break fixture.
        const stickSites=woodlandLife.state().sticks;
        for(const stick of stickSites.slice(0,2)){
          warp(stick.x,stick.z);await frames(2);assert(currentStick?.id===stick.id,'Stick pickup not reachable');tap('KeyF');
          assert(woodlandLife.state().sticks.find(s=>s.id===stick.id).collected,'F failed to gather stick');
        }
        assert(inventory.count('forest-stick')===2,'Gathered sticks did not stack');
        await until(()=>combat.state.player.action==='idle','Equipment action never settled');
        tap('KeyI');inventory.select('forest-stick');
        assert(!$('inventory-detail').querySelector('[data-equip]').disabled,'Spare stick could not be equipped');
        $('inventory-detail').querySelector('[data-equip]').click();assert(weapons.equippedId==='forest-stick','Satchel Equip failed');tap('KeyI');
        combat.startPractice(world.training);warp(world.training.x,world.training.z+1.15);player.group.rotation.y=Math.PI;await frames();
        weapons.setWear(true);const swordWear=weapons.status('simple-sword').durability;
        tap('KeyR');await until(()=>weapons.status('forest-stick').durability===5,'Actual stick swing did not connect/wear');
        tap('KeyI');inventory.select('simple-sword');assert($('inventory-detail').querySelector('[data-equip]').disabled,'Satchel allowed weapon switch during a frozen strike');tap('KeyI');
        await until(()=>combat.state.player.action==='idle','Stick strike did not recover');
        assert(weapons.status('simple-sword').durability===swordWear,'Stick hit charged sword condition');
        for(let i=0;i<5;i++)weapons.contact('forest-stick');
        assert(inventory.count('forest-stick')===1&&weapons.profile().durability===6,'Broken stick did not consume one and ready the spare');
        tap('KeyI');inventory.select('simple-sword');$('inventory-detail').querySelector('[data-equip]').click();tap('KeyI');
        while(weapons.status('simple-sword').usable)weapons.contact('simple-sword');
        tap('KeyR');assert(combat.state.player.action==='idle','Broken sword could still attack');
        tap('ControlLeft');assert(combat.state.player.action==='dodge','Broken sword prevented escape dodge');
        await until(()=>combat.state.player.action==='idle','Broken-weapon dodge did not recover');
        tap('KeyI');inventory.select('simple-sword');assert($('inventory-detail').textContent.includes('Broken'),'Broken condition missing from satchel');tap('KeyI');
        warp(world.repairBench.x,world.repairBench.z);await frames(2);assert(nearRepair&&!currentNPC,'Repair bench not reachable');tap('KeyF');
        assert(weapons.profile().durability===24&&weapons.profile().usable,'Village bench did not repair a broken sword');
        combat.finishPractice();
        const fruitSites=woodlandLife.state().fruits;
        assert(fruitSites.length===12&&fruitSites.filter(f=>f.z>-20).length>=2,'Forest fruit missing or unavailable before the ambush');
        combat.state.player.hp=57;
        for(const fruit of fruitSites.slice(0,3)){
          warp(fruit.x,fruit.z);await frames(2);assert(currentFruit?.id===fruit.id&&!currentNPC,'Ripe pawpaw not reachable');tap('KeyF');
          assert(woodlandLife.state().fruits.find(f=>f.id===fruit.id).collected,'F did not gather a ripe pawpaw');
          assert(woodlandLife.collectFruit(fruit.id)===false,'Fruit pickup could be duplicated');
        }
        assert(inventory.count('pawpaw')===3&&combat.state.player.hp===57,'Gathering did not save fruit for later consumption');
        tap('KeyI');inventory.select('pawpaw');
        const eat=()=>$('inventory-detail').querySelector('[data-consume="pawpaw"]');
        assert(eat()&&!eat().disabled,'Satchel Eat button missing');eat().focus();eat().click();
        assert(combat.state.player.hp===82&&inventory.count('pawpaw')===2&&inventory.selectedId()==='pawpaw','Eating failed to heal 25 and consume exactly one fruit');
        assert(document.activeElement?.dataset.consume==='pawpaw','Eating lost keyboard focus with a remaining stack');
        eat().click();assert(combat.state.player.hp===100&&inventory.count('pawpaw')===1,'Healing exceeded max health or used too much fruit');
        assert(eat().disabled&&$('inventory-detail').textContent.includes('full'),'Full-health Eat was not disabled with an explanation');
        eat().click();assert(inventory.count('pawpaw')===1,'Full-health player wasted a fruit');
        tap('KeyI');combat.state.player.hp=92;tap('KeyI');inventory.select('pawpaw');eat().focus();eat().click();
        assert(combat.state.player.hp===100&&!inventory.has('pawpaw')&&!inventory.selectedId(),'Final fruit did not leave a clean inventory state');
        assert($('inventory-panel').contains(document.activeElement),'Final fruit removed keyboard focus from satchel');
        assert(inventory.has('harbor-letter')&&inventory.has('road-token')&&inventory.count('acorn')===1&&weapons.profile().durability===24,'Eating changed other items or equipment');
        tap('KeyI');assert(mode==='playing'&&questStage===10,'Eating changed the main tutorial or blocked dismissal');
        // The new optional loop uses real NPC choices, casts, catches, firewood,
        // cooking controls, and the food button without using testing supplies.
        const visit=async id=>{const npc=npcData.find(n=>n.id===id),home=world.npcPositions[id];warp(home.x+.8,home.z+.8);await frames(2);tap('KeyF');assert(activeDialogue?.npc===npc,'Could not talk to '+id);};
        await visit('doomsayer');choose('doom-warning');assert($('speech').textContent.includes('Cape Thalmagar'),'Doomsayer failed to introduce the far cape');nextSpeech();assert($('speech').textContent.includes('Oremindi'),'Doomsayer omitted the mountain barrier');finishTangent();
        assert(!document.querySelector('[data-choice="doom-map"]'),'The doomsayer must not point to Cape Thalmagar on the chart');choose('leave-doomsayer');await frames(2);assert(mode==='playing','Leaving Orris did not return to the road');
        await visit('doomsayer');choose('cooking-lesson');finishTangent();choose('leave-doomsayer');
        const bank=world.pond.fishingSpot;
        assert(!canStand(world.pond.x,world.pond.z,world),'Pond water admits walking');
        warp(bank.x,bank.z);await frames(2);tap('KeyF');assert(mode==='playing'&&!inventory.has('fishing-rod'),'Fishing without a rod succeeded');
        await visit('pond-fisher');choose('learn-fishing');finishDialogue();assert(inventory.has('fishing-rod')&&campcraft.state.taught,'Bran failed to teach fishing and give one rod');
        warp(bank.x,bank.z);await frames(2);tap('KeyF');assert(mode==='fishing','F did not cast from the bank');
        tap('KeyF');assert(mode==='playing'&&inventory.count('raw-fish')===0,'Early reel incorrectly caught a fish');
        await frames(2);tap('KeyF');tap('Escape');assert(mode==='playing'&&campcraft.state.phase==='idle','Escape did not cancel fishing');
        await frames(2);tap('KeyF');await until(()=>campcraft.state.phase==='bite','Float never signaled a bite');
        await until(()=>mode==='playing','Missed bite did not release fishing controls');assert(inventory.count('raw-fish')===0,'Expired bite awarded a fish');
        await frames(2);tap('KeyF');await until(()=>campcraft.state.phase==='bite','Second cast never got a bite');tap('KeyF');
        assert(mode==='playing'&&inventory.count('raw-fish')===1,'Reeling a bite did not catch one raw fish');
        await frames(2);tap('KeyF');await until(()=>campcraft.state.phase==='bite','Third cast never got a bite');canvas.dispatchEvent(new PointerEvent('pointerdown',{button:0}));
        assert(inventory.count('raw-fish')===2,'Mouse reel did not catch a fish');
        tap('KeyI');inventory.select('raw-fish');assert(!document.querySelector('[data-consume="raw-fish"]'),'Raw fish incorrectly offers Eat');tap('KeyI');
        const pit=world.firePits.find(f=>f.id==='pond-fire');
        warp(pit.x,pit.z);await frames(2);tap('KeyF');assert(activeDialogue?.npc.id===pit.id,'Pond fire pit not reachable');
        assert(document.querySelector('[data-choice="cook-fish"]').disabled,'Cold fire allowed cooking');choose('leave-fire');
        for(const stick of woodlandLife.state().sticks.filter(s=>!s.collected).slice(0,2)){warp(stick.x,stick.z);await frames(2);tap('KeyF');}
        const fuelBefore=inventory.count('forest-stick');assert(fuelBefore>=2,'Could not gather firewood');
        warp(pit.x,pit.z);await frames(2);tap('KeyF');choose('light-fire');
        assert(campcraft.fireStatus(pit.id).lit&&inventory.count('forest-stick')===fuelBefore-2&&inventory.has('tinderbox'),'Lighting did not consume exactly two sticks and retain tinderbox');
        const pauseFuel=campcraft.fireStatus(pit.id).fuel;await frames(4);assert(campcraft.fireStatus(pit.id).fuel===pauseFuel,'Fire fuel drained during cooking dialogue');
        choose('cook-fish');assert(inventory.count('raw-fish')===1&&inventory.count('cooked-fish')===1,'Cooking did not exchange one raw fish for one cooked fish');choose('leave-fire');
        combat.state.player.hp=50;tap('KeyI');inventory.select('cooked-fish');
        const fishEat=document.querySelector('[data-consume="cooked-fish"]');assert(fishEat&&!fishEat.disabled&&fishEat.textContent.includes('40'),'Cooked fish Eat control missing');fishEat.click();
        assert(combat.state.player.hp===90&&!inventory.has('cooked-fish')&&inventory.count('raw-fish')===1,'Cooked fish failed to restore 40 health and consume one');tap('KeyI');
        assert(!testingEnabled&&questStage===10&&acornQuest.status==='complete','Normal campcraft required override or changed completed quests');
        const roadResults=await runRoadSmoke({world,player,npcData,combat,journey,inventory,weapons,beggar,press,release,tap,until,frames,warp,getMode:()=>mode,finishDialogue:()=>{let n=0;while(mode==='dialogue'&&!(activeDialogue.choices&&activeDialogue.index===activeDialogue.lines.length-1)){assert(n++<12,'Road dialogue failed to reach its choices');nextSpeech();}},choose,setYaw:value=>yaw=value,readState:state});
        assert(saveRoad(false),'Completed road checkpoint did not save');const savedRoad=checkpoint.read().data;
        const savedWear=weapons.profile().durability;inventory.add('forest-stick',1);weapons.repair();warp(0,9);
        assert(continueRoad()&&journey.view().complete&&weapons.profile().durability===savedWear&&inventory.count('forest-stick')===savedRoad.inventory.find(item=>item.id==='forest-stick').quantity,'Checkpoint did not restore road progress, inventory, and wear');
        tap('F8');assert(mode==='testing','F8 did not open testing tools');$('test-prepare').click();
        assert(testingEnabled&&inventory.has('tinderbox')&&inventory.has('fishing-rod')&&inventory.count('acorn')>=5&&inventory.count('forest-stick')>=6,'Testing supplies failed');
        $('test-pond').click();assert(mode==='playing'&&Math.hypot(player.group.position.x-bank.x,player.group.position.z-bank.z)<.01,'Testing pond travel failed');
        tap('F8');$('test-village').click();assert(mode==='playing'&&player.group.position.x===-11,'Testing village travel failed');
        const roadTestingResults=await runRoadTestingSmoke({world,player,tap,frames,until,getMode:()=>mode,readState:state,journey,inventory});
        warp(world.border.x,world.border.z);assert(questStage===10,'Side quest overwrote completed main tutorial');
        const collisionChecks=world.colliders.slice(0,50);for(const c of collisionChecks)assert(!canStand(c.x,c.z,world),'Solid collider admits player');
        for(const x of[24,12,4,-1,-15,-40,-60,-80])assert(canStand(x,29,world),'Main route blocked at '+x);
        yaw=0;pitch=.2;distance=targetDistance=7;await frames(24);
        return{ok:true,...state(),...roadResults,...roadTestingResults,checkpointChecks:4,campcraftChecks:20,testingChecks:4,doomsayerChecks:3,fruitChecks:14,fruitSites:fruitSites.length,weaponChecks:14,stickSites:stickSites.length,sideQuestChecks:11,squirrelClimbed:true,collectibleSites:sites.length,diagonalChecks:2,runKeys:['Shift','Tab'],runChecks:4,mapChecks:8,mapSource:atlas.source,interactionKey:'F',practiceChecks:3,inventoryChecks:8,pausedCombat:true,defeatRetry:true,battleSwings:landed,northernRouteWalked:Math.round(northernDistance),region2Open:true,routeChecks:8+world.routeNorth.length,collisionChecks:collisionChecks.length,geometries:renderer.info.memory.geometries};
      },
      // Deterministic viewpoints for visual review of the actual game renderer.
      review(view){
        if(inventory.isOpen())inventory.close();
        campcraft.cancelFishing();show('testing',false);
        reviewFrozen=false;reviewTarget=null;reviewCat=null;player.group.visible=true;
        clearTimeout(toastTimer);$('toast').classList.remove('visible');
        leaveOpening();document.body.classList.add('playing');show('opening',false);show('loading',false);show('modal-backdrop',false);show('dialogue',false);mode='playing';
        // The opening screen itself, with the character line on it: --review-views=opening-characters
        // photographs Cromb selected, and opening-characters-lakota photographs any other of the eleven.
        // The sequence itself: opening-ride holds the ride at twenty seconds (opening-ride-8 at
        // eight, and so on), and opening-landed is the first frame the traveler controls.
        if(view.startsWith('opening-ride')||view==='opening-landed'){
          leaveOpening();mode='opening';document.body.classList.remove('playing');
          // A picture of the first hour: the quest panel and the marker belong to the landing, not
          // to whatever stage a previous review view left behind.
          questStage=0;practiceHits=0;practiceDodges=0;journey.restore(createJourney().snapshot());
          begin();
          if(view==='opening-landed'){skipOpening();return;}
          openingTime=Number(view.replace('opening-ride','').replace(/^-/,''))||20;reviewFrozen=true;
          return;
        }
        if(view.startsWith('opening-characters')){
          const who=view.replace('opening-characters','').replace(/^-/,'');if(who)characterSelect.select(who);
          mode='opening';document.body.classList.remove('playing');show('opening',true);
          $('opening').style.opacity='1';$('opening').style.transform='none';
          // The title screen shows the harbour with nobody in it and the boat still out at sea.
          player.group.visible=false;{const s=stateAt(0);world.placeArrivalBoat(s.boat.x,s.boat.z,s.boat.yaw);}
          return;
        }
        if(view==='battle'){questStage=4;combat.startPractice(world.training);combat.finishPractice();combat.startEncounter(greenwayEncounter);player.group.position.set(-52,world.heightAt(-52,29),29);yaw=Math.PI/2+.28;pitch=.32;distance=targetDistance=7;player.setArmed(true);}
        else{questStage=2;practiceHits=0;practiceDodges=0;combat.startPractice(world.training);player.group.position.set(world.training.x,world.heightAt(world.training.x,world.training.z+3),world.training.z+3);player.group.rotation.y=Math.PI*.85;yaw=.42;pitch=.3;distance=targetDistance=5;player.setArmed(true);}
        // The traveler stood at a place and looking a given way, with nothing staged: for a measurement that
        // wants the place as it is rather than a composed shot. stand-at:x,z,facing[,pitch,distance] (main.cjs --draw-review).
        if(view.startsWith('stand-at:')){const [sx,sz,facing=0,tilt=.3,back=7]=view.slice(9).split(',').map(Number);
          if(Number.isFinite(sx)&&Number.isFinite(sz)){questStage=10;combat.finishPractice();player.setArmed(false);player.group.position.set(sx,world.heightAt(sx,sz),sz);yaw=facing;pitch=tilt;distance=targetDistance=back;player.group.rotation.y=Math.PI+yaw;}}
        if(view==='walk'){questStage=10;combat.finishPractice();player.group.position.set(-52,world.heightAt(-52,29),29);yaw=Math.PI/2+1.15;pitch=.3;distance=targetDistance=6;player.group.rotation.y=Math.PI+yaw;}
        if(view==='inventory'){questStage=6;combat.finishPractice();inventory.grant('harbor-letter');inventory.grant('simple-sword');inventory.grant('road-token');if(!inventory.has(COPPER_ITEM))inventory.add(COPPER_ITEM,STARTING_PURSE);player.group.position.set(-86,world.heightAt(-86,28),28);yaw=Math.PI/2+.2;pitch=.3;distance=targetDistance=7;toggleInventory();inventory.select('harbor-letter');}
        if(view==='border'){questStage=10;combat.finishPractice();player.group.position.set(world.border.x,world.heightAt(world.border.x,world.border.z),world.border.z);player.group.rotation.y=Math.PI;yaw=0;pitch=.16;distance=targetDistance=7;}
        if(view==='map'){combat.finishPractice();modal('journal');mapTab(true);}
        // Amod, for review by eye: the terraces from the Pueth road, the bridge, Ostel from below,
        // the street, and Mallec standing beside a person so the scale can be judged rather than asserted.
        if(view.startsWith('amod-')){
          questStage=10;combat.finishPractice();player.setArmed(true);
          const spot=({'amod-terraces':{x:-676,z:-472,yaw:1.52,pitch:.12,d:9},
            'amod-bridge':{x:-756,z:-486,yaw:1.45,pitch:.16,d:11},
            'amod-ostel':{x:-782,z:-492,yaw:1.23,pitch:.12,d:13},
            'amod-street':{x:-800,z:-512,yaw:2.05,pitch:.17,d:14},
            'amod-valley':{x:-836,z:-534,yaw:2.45,pitch:.16,d:15},
            'amod-ogre':{x:-684,z:-470,yaw:1.9,pitch:.08,d:17,look:{x:-681,z:-471,y:3.2}}})[view];
          if(spot){
            player.group.position.set(spot.x,world.heightAt(spot.x,spot.z),spot.z);
            yaw=spot.yaw;pitch=spot.pitch;distance=targetDistance=spot.d;player.group.rotation.y=Math.PI+yaw;
            if(spot.look){reviewFrozen=true;reviewTarget=new THREE.Vector3(spot.look.x,world.heightAt(spot.look.x,spot.look.z)+spot.look.y,spot.look.z);}
            // Amod is eight hundred metres from where the camera was; it must be put there, not flown there.
            grounded=true;verticalSpeed=0;settleCamera();
          }
        }
        // The western regions, for review by eye. The spots are worked out from the
        // regions' own numbers rather than typed in, so a view cannot drift off the
        // thing it is meant to show when the ground under it is adjusted.
        if(view.startsWith('west-')){
          questStage=10;combat.finishPractice();player.setArmed(true);
          const spot=westReviewSpot(view);
          if(spot){
            player.group.position.set(spot.x,world.heightAt(spot.x,spot.z),spot.z);
            yaw=spot.yaw;pitch=spot.pitch;distance=targetDistance=spot.d;player.group.rotation.y=Math.PI+yaw;
            if(spot.look){reviewFrozen=true;player.group.visible=spot.self!==false;
              reviewTarget=new THREE.Vector3(spot.look.x,world.heightAt(spot.look.x,spot.look.z)+(spot.look.y??1),spot.look.z);}
            // The west is a kilometre and a half from where the camera was: put it there.
            grounded=true;verticalSpeed=0;settleCamera();
            westLife.update(.03,player.group.position,true);
          }
        }
        if(view==='lysa'){questStage=10;combat.finishPractice();const npc=npcData.find(n=>n.id==='acorn-cook'),home=world.npcPositions[npc.id];player.group.position.set(home.x+1.5,world.heightAt(home.x+1.5,home.z+1.4),home.z+1.4);yaw=.65;pitch=.36;distance=targetDistance=5;conversation(npc);}
        // Anyone, close and face on: 'npc-<id>' (Toft is 'npc-jimson-toft').
        if(view.startsWith('npc-')&&npcById.has(view.slice(4))){questStage=10;combat.finishPractice();player.group.visible=false;
          const npc=npcById.get(view.slice(4)),g=npc.actor.group,turn=g.rotation.y+.35;g.visible=true;
          const px=g.position.x+Math.sin(turn)*3,pz=g.position.z+Math.cos(turn)*3;player.group.position.set(px,world.heightAt(px,pz),pz);
          reviewTarget=new THREE.Vector3(g.position.x,g.position.y+1.1,g.position.z);yaw=turn;pitch=.08;distance=targetDistance=3;}
        // Katy by the spring pool with her spyglass: face on ('katy'), and from behind, for the hair and the cape ('katy-back').
        if(view==='katy'||view==='katy-back'){questStage=10;combat.finishPractice();player.group.visible=false;
          const k=npcById.get(KATY.id).actor.group,at=k.position,face=KATY_STAND.yaw,turn=view==='katy'?face+.45:face+Math.PI+.35;
          player.group.position.set(at.x+Math.sin(turn)*3,world.heightAt(at.x+Math.sin(turn)*3,at.z+Math.cos(turn)*3),at.z+Math.cos(turn)*3);
          reviewTarget=new THREE.Vector3(at.x,world.heightAt(at.x,at.z)+1.2,at.z);yaw=turn;pitch=.08;distance=targetDistance=2.8;}
        // Bosco in the dye yard, from about the height of somebody crouching down to him ('bosco').
        if(view==='bosco'){questStage=10;combat.finishPractice();player.group.visible=false;
          // He will not hold still for a portrait: he comes at a run and sits down on your boot,
          // so the camera stands off his spot and looks at where he stops, which is here.
          const at=BOSCO_HAUNTS[1],turn=1.6;boscoModel.group.visible=true;
          boscoPose={x:at.x,z:at.z,yaw:turn+Math.PI};
          const px=at.x+Math.sin(turn)*1.4,pz=at.z+Math.cos(turn)*1.4;
          player.group.position.set(px,world.heightAt(px,pz),pz);
          reviewTarget=new THREE.Vector3(at.x,world.heightAt(at.x,at.z)+.2,at.z);yaw=turn+Math.PI;pitch=.3;distance=targetDistance=1.2;}
        // Mallec at the pass stones, head to foot ('ogre'), and the road he holds ('amod-road').
        if(view==='ogre'||view==='amod-road'){questStage=10;combat.finishPractice();player.group.visible=false;
          const o=npcById.get(OGRE_NPC.id),at=o.actor.group.position,turn=OGRE_STAND.yaw+.4;
          if(view==='ogre'){const px=at.x+Math.sin(turn)*7,pz=at.z+Math.cos(turn)*7;
            player.group.position.set(px,world.heightAt(px,pz),pz);
            reviewTarget=new THREE.Vector3(at.x,world.heightAt(at.x,at.z)+1.9,at.z);yaw=turn;pitch=.04;distance=targetDistance=7;}
          else{const px=at.x+Math.sin(turn)*34,pz=at.z+Math.cos(turn)*34;
            player.group.position.set(px,world.heightAt(px,pz),pz);
            reviewTarget=new THREE.Vector3(at.x,world.heightAt(at.x,at.z)+4,at.z);yaw=turn;pitch=.14;distance=targetDistance=34;}}
        // Ambron from the south, over the chain and up the channel into the city ('ambron').
        if(view==='ambron'){questStage=10;combat.finishPractice();player.group.visible=false;
          const c=AMBRON.centre,turn=0;
          const px=c.x,pz=c.z-150;
          player.group.position.set(px,world.heightAt(px,pz),pz);
          reviewTarget=new THREE.Vector3(c.x,world.heightAt(c.x,c.z)+18,c.z);yaw=turn;pitch=.26;distance=targetDistance=150;}
        // The Elod Light from the landing below it ('elod-light'), and its keeper ('subtractidaughter').
        if(view==='elod-light'||view==='subtractidaughter'){questStage=10;combat.finishPractice();player.group.visible=false;
          if(view==='subtractidaughter'){const g=npcById.get(SUBTRACTIDAUGHTER.id).actor.group,at=g.position,turn=SUBTRACTIDAUGHTER_STAND.yaw+.4;
            const px=at.x+Math.sin(turn)*3,pz=at.z+Math.cos(turn)*3;
            player.group.position.set(px,world.heightAt(px,pz),pz);
            reviewTarget=new THREE.Vector3(at.x,world.heightAt(at.x,at.z)+1.2,at.z);yaw=turn;pitch=.06;distance=targetDistance=3;}
          else{const t=ELOD_LIGHT.tower,turn=2.2;
            const px=t.x+Math.sin(turn)*30,pz=t.z+Math.cos(turn)*30;
            player.group.position.set(px,world.heightAt(px,pz),pz);
            reviewTarget=new THREE.Vector3(t.x,world.heightAt(t.x,t.z)+9,t.z);yaw=turn;pitch=.2;distance=targetDistance=30;}}
        // Addison at her yard gate ('addison'), and the whole light from the lane ('suval-light').
        if(view==='addison'||view==='suval-light'){questStage=10;combat.finishPractice();player.group.visible=false;
          if(view==='addison'){const g=npcById.get(ADDISON.id).actor.group,at=g.position,turn=ADDISON_STAND.yaw+1.15;
            const px=at.x+Math.sin(turn)*3,pz=at.z+Math.cos(turn)*3;
            player.group.position.set(px,world.heightAt(px,pz),pz);
            reviewTarget=new THREE.Vector3(at.x,world.heightAt(at.x,at.z)+1.2,at.z);yaw=turn;pitch=.06;distance=targetDistance=3;}
          else{const t=SUVAL_LIGHT.tower,turn=2.5;
            const px=t.x+Math.sin(turn)*26,pz=t.z+Math.cos(turn)*26;
            player.group.position.set(px,world.heightAt(px,pz),pz);
            reviewTarget=new THREE.Vector3(t.x,world.heightAt(t.x,t.z)+7,t.z);yaw=turn;pitch=.16;distance=targetDistance=26;}}
        // Batman on his rock above the spring: face on ('batman'), and with the wings open ('batman-flare').
        if(view==='batman'||view==='batman-flare'){questStage=10;combat.finishPractice();player.group.visible=false;
          hunt.restore({version:1,stage:'sighted',found:['vial'],ending:null});placeBatman();batman.group.visible=true;
          batmanFlare=view==='batman-flare'?1:0;batman.update(4,{flare:batmanFlare});
          const at=batman.group.position,turn=BATMAN_PERCH.yaw+.25;
          const px=at.x+Math.sin(turn)*4.4,pz=at.z+Math.cos(turn)*4.4;
          player.group.position.set(px,world.heightAt(px,pz),pz);
          reviewTarget=new THREE.Vector3(at.x,at.y+1.2,at.z);yaw=turn;pitch=.06;distance=targetDistance=4.4;}
        // Kat on the crush pad at the hall doors, face on ('kat').
        if(view==='kat'){questStage=10;combat.finishPractice();player.group.visible=false;
          const g=npcById.get(WINEMAKER.id).actor.group,at=g.position,turn=WINERY_STANDS.winemaker.yaw+.3;
          player.group.position.set(at.x+Math.sin(turn)*3,world.heightAt(at.x+Math.sin(turn)*3,at.z+Math.cos(turn)*3),at.z+Math.cos(turn)*3);
          reviewTarget=new THREE.Vector3(at.x,world.heightAt(at.x,at.z)+1.2,at.z);yaw=turn;pitch=.08;distance=targetDistance=2.8;}
        // Imani in the rows: face on ('imani'), and from behind, for the bob ('imani-back'). Both
        // look along the aisle, because three metres either side of her is a wall of vine.
        if(view==='imani'||view==='imani-back'){questStage=10;combat.finishPractice();player.group.visible=false;
          const g=npcById.get(IMANI.id).actor.group,at=g.position,face=IMANI_STAND.yaw,turn=view==='imani'?face+.12:face+Math.PI+.06;
          player.group.position.set(at.x+Math.sin(turn)*3,world.heightAt(at.x+Math.sin(turn)*3,at.z+Math.cos(turn)*3),at.z+Math.cos(turn)*3);
          reviewTarget=new THREE.Vector3(at.x,world.heightAt(at.x,at.z)+1.2,at.z);yaw=turn;pitch=.08;distance=targetDistance=2.8;}
        // Solis three years after the sack: the north wall from the road ('solis-sack-gate'), the east breach,
        // the burnt houses inside the north wall, and the ruins of the lower town.
        if(view.startsWith('solis-sack-')){questStage=10;combat.finishPractice();player.group.visible=false;
          const [a,b,turn,d,p,rise]={'solis-sack-gate':[16,-44,-2.68,36,.2,3],'solis-sack-east':[56,10,1.86,26,.3,7.5],'solis-sack-town':[-30,-28,.54,20,.55,7.5],'solis-sack-ruins':[-30,20,2.36,24,.6,7.5],'solis-sack-horses':[0,-50,Math.PI+.25,16,.12,8]}[view]??[0,0,0,20,.3,2];
          const at=solisPoint(a,b);player.group.position.set(at.x,world.heightAt(at.x,at.z),at.z);reviewTarget=new THREE.Vector3(at.x,world.heightAt(at.x,at.z)+rise,at.z);
          yaw=turn;pitch=p;distance=targetDistance=d;}
        // The whole cast shoulder to shoulder: those with a model of their own ('cast-line'), and the
        // villagers who wear one of the shared bodies in their own colours ('cast-folk').
        if(view==='cast-line'||view==='cast-folk'){questStage=10;combat.finishPractice();player.group.visible=false;
          if(reviewLineup&&reviewLineup.userData.cast!==view){scene.remove(reviewLineup);reviewLineup=null;}
          if(!reviewLineup){
            const person=options=>()=>({actor:createCharacter(options),kind:'person'});
            const cast=view==='cast-line'?[
              person({role:'bird-watcher',tunic:BIRD_WATCHER.color}),
              person({role:'rainbow-dyer',tunic:BRANDY.color,skin:BRANDY.skin}),
              person({role:'bat-seeker',tunic:KATY.color,skin:KATY.skin}),
              person({role:'bee-keeper',tunic:TROY.color,skin:TROY.skin}),
              person({role:'vine-keeper',tunic:IMANI.color,skin:IMANI.skin}),
              person({role:'light-keeper',tunic:ADDISON.color,skin:ADDISON.skin}),
              person({role:'rival-keeper',tunic:SUBTRACTIDAUGHTER.color,skin:SUBTRACTIDAUGHTER.skin}),
              ()=>({actor:createBowden(),kind:'person'}),
              person({role:'wine-seller',tunic:0x2f3f63,skin:0xb07a52}),
              person({role:'wine-clerk',tunic:0x2f5b4a,skin:0xf0cbb0}),
              ()=>({actor:createJohn(),kind:'person'}),
              ()=>({actor:createEdModel(),kind:'ed'}),
            ]:[
              person({role:'commons-miller',tunic:TOFT.color,skin:TOFT.skin}),
              person({role:'shelter-keeper',tunic:VINTNER.color,skin:VINTNER.skin}),
              person({role:'reed-worker',tunic:CELLAR_HAND.color,skin:CELLAR_HAND.skin}),
              person({role:'wine-maker',tunic:WINEMAKER.color,skin:WINEMAKER.skin}),
              person({role:'pipe-smoker',tunic:0x3d6b6a}),
              person({role:'peddler',tunic:0x7a6242}),
              person({role:'forest-woodcutter',tunic:0x6b5137}),
              person({role:'legion-soldier',tunic:0x8f3b30}),
              person({role:'acorn-cook',tunic:0xa08256}),
              person({role:'doomsayer'}),
            ];
            reviewLineup=new THREE.Group();reviewLineup.name='Review lineup';reviewLineup.userData.cast=view;
            cast.forEach((build,i)=>{const {actor,kind}=build();actor.group.position.set((i-(cast.length-1)/2)*1.5,0,0);
              actor.group.userData.actor=actor;actor.group.userData.kind=kind;reviewLineup.add(actor.group);});
            scene.add(reviewLineup);}
          // Open ground west of the village: nothing of the village stands in the line or in front of it.
          const at={x:-70,z:38},ground=world.heightAt(at.x,at.z);
          reviewLineup.position.set(at.x,ground,at.z);reviewLineup.rotation.y=0;reviewLineup.visible=true;
          player.group.position.set(at.x,ground,at.z);
          // Settle every pose: a character reads its idle over a second or two, and Ed keeps his own clock.
          for(const g of reviewLineup.children)for(let t=0;t<3;t+=1/60)g.userData.kind==='ed'?g.userData.actor.animate(t,1/60,{}):g.userData.actor.animate(t,0,true,{});
          reviewTarget=new THREE.Vector3(at.x,ground+1.05,at.z);yaw=.02;pitch=.04;distance=targetDistance=view==='cast-line'?10.8:12.2;}
        // The Empire's soldiers in a row, close up: a footman at attention, one with his sword drawn, an officer, and a Suvali guard beside them for scale.
        if(view==='soldiers'||view==='soldiers-back'){questStage=10;combat.finishPractice();player.group.visible=false;
          if(reviewLineup&&reviewLineup.userData.cast!=='soldiers'){scene.remove(reviewLineup);reviewLineup=null;}
          if(!reviewLineup){reviewLineup=new THREE.Group();reviewLineup.name='Review lineup';reviewLineup.userData.cast='soldiers';
            [['legion-soldier',false],['legion-soldier',true],['legion-officer',false],['suvali-guard',false]].forEach(([role,armed],i)=>{const actor=createCharacter({role,armed});actor.group.position.set((i-1.5)*1.3,0,0);actor.group.userData.actor=actor;actor.group.userData.kind='person';reviewLineup.add(actor.group);});
            scene.add(reviewLineup);}
          const at={x:-35,z:24};reviewLineup.position.set(at.x,world.heightAt(at.x,at.z),at.z);reviewLineup.rotation.y=view==='soldiers'?0:Math.PI;reviewLineup.visible=true;
          for(const g of reviewLineup.children)for(let t=0;t<3;t+=1/60)g.userData.actor.animate(t,0,true,{});
          reviewTarget=new THREE.Vector3(at.x,world.heightAt(at.x,at.z)+1.05,at.z);yaw=.18;pitch=.08;distance=targetDistance=5.2;}
        else if(reviewLineup&&!view.startsWith('cast-'))reviewLineup.visible=false;
        // The rebel ship at the moment she rounds up, from the end of the pier; and Ed on the
        // strand a moment after he walks out of the water.
        if(view==='word-ship'||view==='word-ashore'){questStage=10;combat.finishPractice();player.group.visible=false;
          playSeconds=view==='word-ship'?WORD_SHIP.turns+8:WORD_ASHORE+3;wordSaid=wordToastAt(playSeconds)?.key??null;
          settleMercenaries();
          const look=view==='word-ship'?WORD_TRACK.standOff:WORD_BEACH;
          const spot=view==='word-ship'?{x:26,z:29}:{x:WORD_BEACH.x-7,z:WORD_BEACH.z-6};
          const ground=Math.max(SEA_LEVEL,world.heightAt(spot.x,spot.z));
          player.group.position.set(spot.x,ground,spot.z);
          reviewTarget=new THREE.Vector3(look.x,view==='word-ship'?SEA_LEVEL+3.4:world.heightAt(look.x,look.z)+1.1,look.z);
          yaw=Math.atan2(spot.x-look.x,spot.z-look.z);pitch=view==='word-ship'?.08:.12;
          distance=targetDistance=view==='word-ship'?Math.hypot(spot.x-look.x,spot.z-look.z):9.2;}
        if(view==='traveler'){questStage=10;combat.finishPractice();player.group.position.set(-35,world.heightAt(-35,29),29);player.group.rotation.y=Math.PI;yaw=Math.PI+.35;pitch=.24;distance=targetDistance=4.5;}
        if(view==='weapons'){questStage=10;combat.finishPractice();inventory.grant('forest-stick');weapons.setWear(true);weapons.contact('simple-sword');toggleInventory();inventory.select('simple-sword');}
        if(view==='repair'){questStage=10;combat.finishPractice();player.group.position.set(world.repairBench.x,world.heightAt(world.repairBench.x,world.repairBench.z),world.repairBench.z);yaw=.9;pitch=.45;distance=targetDistance=5;}
        if(view.startsWith('cat-')){questStage=10;combat.finishPractice();const spot=VILLAGE_CAT.spots[1],at={x:spot.x+1.5,z:spot.z+1},npc=npcById.get(VILLAGE_CAT.id);reviewCat={posture:view.slice(4),at};npc.actor.group.position.set(at.x,world.heightAt(at.x,at.z),at.z);npc.actor.group.rotation.y=-.6;player.group.position.set(at.x+6,world.heightAt(at.x+6,at.z+6),at.z+6);player.group.visible=false;reviewTarget=new THREE.Vector3(at.x,world.heightAt(at.x,at.z)+.22,at.z);yaw=.25;pitch=.3;distance=targetDistance=1.7;}
        // Paradise Springs from the lane's end, Livia at the cabin, and the threshold slab at Rena.
        if(['winery','winery-cabin','winery-spring','winery-vines','rena-track'].includes(view)){questStage=10;combat.finishPractice();player.group.visible=false;
          const spot=view==='winery'?{x:WINERY_STANDS.vintner.x-22,z:WINERY_STANDS.vintner.z+14,look:{x:WINERY_STANDS.vintner.x+14,z:WINERY_STANDS.vintner.z-6},d:34,p:.34}
            :view==='winery-cabin'?{x:WINERY_STANDS.vintner.x,z:WINERY_STANDS.vintner.z+5,look:{x:WINERY_STANDS.vintner.x,z:WINERY_STANDS.vintner.z-2},d:7,p:.18}
            :view==='winery-spring'?{x:WINERY_LAYOUT.spring.pool.x+4,z:WINERY_LAYOUT.spring.pool.z+5,look:WINERY_LAYOUT.spring.basin,d:13,p:.42}
            :view==='winery-vines'?{x:WINERY_LAYOUT.plates[3].x-1.5,z:WINERY_LAYOUT.plates[3].z-5,look:WINERY_LAYOUT.plates[3],d:5,p:.12}
            :{x:digs.sites.find(s=>s.id==='track').x,z:digs.sites.find(s=>s.id==='track').z+3,look:digs.sites.find(s=>s.id==='track'),d:3.2,p:.6};
          player.group.position.set(spot.x,world.heightAt(spot.x,spot.z),spot.z);reviewTarget=new THREE.Vector3(spot.look.x,world.heightAt(spot.look.x,spot.look.z)+1,spot.look.z);
          yaw=Math.atan2(spot.x-spot.look.x,spot.z-spot.look.z);pitch=spot.p;distance=targetDistance=spot.d;}
        // Ed close, face on, at Aurel Mendo's stall: the glasses, the pipe and its smoke.
        if(view==='ed-pipe'){questStage=10;combat.finishPractice();player.group.visible=false;
          while(puck.haunt.id!=='merchant-stall')puck.grab();placePuck();const g=puckView.group.position,face=puckView.group.rotation.y;
          player.group.position.set(g.x+Math.sin(face)*4,world.heightAt(g.x+Math.sin(face)*4,g.z+Math.cos(face)*4),g.z+Math.cos(face)*4);
          reviewTarget=new THREE.Vector3(g.x+Math.sin(face)*.45,g.y+.5,g.z+Math.cos(face)*.45);yaw=face+1.25;pitch=.1;distance=targetDistance=2.3;}
        if(view==='ed'||view==='ed-ridge'||view==='ed-cask'){questStage=10;combat.finishPractice();player.group.visible=false;
          if(view!=='ed-cask'){while(view==='ed-ridge'?!puck.haunt.perch:puck.haunt.id!=='fountain')puck.grab();placePuck();}
          const g=view==='ed-cask'?{x:SEA_WALL_NICHE.x,y:world.heightAt(SEA_WALL_NICHE.x,SEA_WALL_NICHE.z),z:SEA_WALL_NICHE.z}:puckView.group.position,face=view==='ed-cask'?SEA_WALL_NICHE.yaw:puckView.group.rotation.y;
          player.group.position.set(g.x+Math.sin(face)*5,world.heightAt(g.x+Math.sin(face)*5,g.z+Math.cos(face)*5),g.z+Math.cos(face)*5);
          reviewTarget=new THREE.Vector3(g.x,g.y+(view==='ed-cask'?.8:.75),g.z);yaw=face+.4;pitch=view==='ed-ridge'?.3:.12;distance=targetDistance=view==='ed-ridge'?7:2.3;}
        if(['wine-attic','wine-attic-inside','wine-attic-juan','wine-attic-nika'].includes(view)){questStage=10;combat.finishPractice();player.group.visible=false;
          const P=(a,b)=>({x:SOLIS.centre.x+a,z:SOLIS.centre.z+b});
          if(view==='wine-attic'||view==='wine-attic-inside'){const spot=view==='wine-attic'?{...P(-9,-11),look:P(2.2,-16.8),d:12,p:.2,up:2.6}:{...ATTIC_HEAD,look:P(13.5,-17.2),d:2.2,p:.08,up:1.25};
            player.group.position.set(spot.x,world.heightAt(spot.x,spot.z),spot.z);reviewTarget=new THREE.Vector3(spot.look.x,world.heightAt(spot.look.x,spot.look.z)+spot.up,spot.look.z);
            yaw=Math.atan2(spot.x-spot.look.x,spot.z-spot.look.z);pitch=spot.p;distance=targetDistance=spot.d;}
          else{const npc=npcById.get(view==='wine-attic-juan'?JUAN.id:NIKA.id),a=npc.actor.group,at=a.position,face=a.rotation.y;
            player.group.position.set(at.x+Math.sin(face)*2,at.y,at.z+Math.cos(face)*2);reviewTarget=new THREE.Vector3(at.x,at.y+(view==='wine-attic-juan'?1.45:1.15),at.z);yaw=face+.35;pitch=.08;distance=targetDistance=2.6;}}
        // Brandy Frank in her dye yard: the yard from the lane, and her close.
        if(view==='brandy'||view==='brandy-close'){questStage=10;combat.finishPractice();player.group.visible=false;
          const npc=npcById.get(BRANDY.id),a=npc.actor.group,at=a.position,face=a.rotation.y,close=view==='brandy-close';
          const look=close?{x:at.x,y:at.y+1.45,z:at.z}:{x:at.x-Math.sin(face)*2.2,y:at.y+.9,z:at.z-Math.cos(face)*2.2},d=close?2.4:10,turn=face+(close?.25:-.15);
          player.group.position.set(look.x+Math.sin(turn)*d,world.heightAt(look.x+Math.sin(turn)*d,look.z+Math.cos(turn)*d),look.z+Math.cos(turn)*d);
          reviewTarget=new THREE.Vector3(look.x,look.y,look.z);yaw=turn;pitch=close?.06:.42;distance=targetDistance=d;}
        // The Empire's assault on the Gate of Sun Horses, as it forms up: the company on the road, the Coalition before the gate.
        if(view==='solis-assault'){questStage=10;combat.finishPractice();const spec=AFTERMATH_VARIANTS['solis-sweep'];
          combat.startEncounter(aftermathEncounter(spec.id,aftermathArena(spec.arena),borderAllies('empire')),{atCheckpoint:true});reviewFrozen=true;
          const c=aftermathArena(spec.arena).center;reviewTarget=new THREE.Vector3(c.x,world.heightAt(c.x,c.z)+1.5,c.z+4);yaw=Math.PI-.35;pitch=.3;distance=targetDistance=19;}
        // The Koopwood: the lot from the road, Bowden, and the traveler cutting an oak.
        if(['woodlot','bowden','bowden-close','bowden-back','chopping','woodlot-felled'].includes(view)){questStage=10;combat.finishPractice();
          const b=npcById.get(BOWDEN.id).actor.group,at=b.position,face=b.rotation.y;let look,turn,d,p;
          if(view==='woodlot'){look={x:at.x-Math.sin(face)*6,y:at.y+2.5,z:at.z-Math.cos(face)*6};turn=face+.45;d=22;p=.32;}
          else if(view==='bowden'){look={x:at.x,y:at.y+1.25,z:at.z};turn=face+.5;d=4.4;p=.08;}
          else if(view==='bowden-close'){look={x:at.x,y:at.y+1.85,z:at.z};turn=face+.35;d=2.3;p=.04;}
          else if(view==='bowden-back'){look={x:at.x,y:at.y+1.4,z:at.z};turn=face+Math.PI-.6;d=3.8;p=.1;}
          else{if(!skills.known(WOODCUTTING_SKILL))skills.learn(WOODCUTTING_SKILL);if(skills.level(WOODCUTTING_SKILL)<15){skills.gain(WOODCUTTING_SKILL,2411);clearTimeout(levelUpTimer);}if(!inventory.has('steel-axe'))inventory.add('steel-axe',1);
            const t=woodlotTree.get('koopwood-oak-1');world.woodlot.set(t.id,true);const sx=t.x-1.6,sz=t.z+1.1;player.group.position.set(sx,world.heightAt(sx,sz),sz);player.group.visible=true;
            if(view==='chopping'){chop={id:t.id,next:SWING*.3};look={x:t.x-.8,y:world.heightAt(t.x,t.z)+1.3,z:t.z+.55};turn=-2.1;d=5.2;p=.12;}
            else{world.woodlot.fell(t.id,{x:sx,z:sz});look={x:t.x+1.5,y:world.heightAt(t.x,t.z)+1.6,z:t.z-1.2};turn=-2.4;d=9;p=.22;}}
          if(view!=='chopping'&&view!=='woodlot-felled')player.group.visible=false;
          if(!player.group.visible){const px=look.x+Math.sin(turn)*d,pz=look.z+Math.cos(turn)*d;player.group.position.set(px,world.heightAt(px,pz),pz);}
          reviewTarget=new THREE.Vector3(look.x,look.y,look.z);yaw=turn;pitch=p;distance=targetDistance=d;}
        // The field at the Lauvel: across the fallen to the burial ground ('lauvel-dead'), close on the row ('lauvel-burial'), with the bearers halfway in,
        // and close among the fallen where the bearers lift the next one ('lauvel-fallen').
        if(view==='lauvel-dead'||view==='lauvel-burial'||view==='lauvel-fallen'){questStage=10;combat.finishPractice();player.group.visible=false;playSeconds=view==='lauvel-fallen'?3:10;
          burying.restore(createBurying().snapshot());world.lauvelField?.setBuried(false);
          const [look,turn,d,p,rise]=view==='lauvel-dead'?[fieldPoint(10,11),-2.55,26,.42,.5]:view==='lauvel-burial'?[fieldPoint(9,19),.6,11,.3,.8]:[fieldPoint(19.5,5),2.3,8,.38,.4];
          player.group.position.set(look.x,world.heightAt(look.x,look.z),look.z);reviewTarget=new THREE.Vector3(look.x,world.heightAt(look.x,look.z)+rise,look.z);
          yaw=turn;pitch=p;distance=targetDistance=d;}
        // The burying: Sela on her feet calling across the field ('lauvel-hail'), and the grave
        // she is given at the end of it, with a board at its head ('lauvel-grave').
        if(view==='lauvel-hail'||view==='lauvel-grave'){questStage=10;combat.finishPractice();player.group.visible=false;playSeconds=10;
          const grave=view==='lauvel-grave';
          burying.restore({version:1,stage:grave?'done':'asked',done:grave?['spade','hurdle','names']:[],carried:grave?4:0});
          world.lauvelField?.setBuried(grave);
          const [look,turn,d,pp,rise]=grave?[fieldPoint(6.5,15.6),.15,5.5,.26,.7]:[fieldPoint(4.2,21.9),-.1,4.6,.16,1.3];
          player.group.position.set(look.x,world.heightAt(look.x,look.z),look.z);reviewTarget=new THREE.Vector3(look.x,world.heightAt(look.x,look.z)+rise,look.z);
          yaw=turn;pitch=pp;distance=targetDistance=d;}
        // Construction: the house at stage n ('house-3'), the workbench, and a birdhouse with somebody in it.
        if(/^house-\d$/.test(view)||view==='workbench'||view==='birdhouse'){questStage=10;combat.finishPractice();player.group.visible=false;
          if(!skills.known(CONSTRUCTION_SKILL))skills.learn(CONSTRUCTION_SKILL);building.claimPlot();let look,turn,d,p;
          if(view.startsWith('house-')){const n=Number(view.slice(6));world.homestead.setStages(n);const c=HOUSE_PLOT;look={x:c.x,y:world.homestead.floorY+(n>3?1.8:1),z:c.z+1};turn=.55;d=n?12:9;p=.2;}
          else if(view==='workbench'){look={x:WORKBENCH_SPOT.x,y:world.heightAt(WORKBENCH_SPOT.x,WORKBENCH_SPOT.z)+1,z:WORKBENCH_SPOT.z};turn=.9;d=4.2;p=.25;}
          else{const spot=BIRDHOUSE_POSTS[0];building.hang(spot.id,'birdhouse');building.update(1e4);world.homestead.setPost(spot.id,building.post(spot.id));
            look={x:spot.x,y:world.heightAt(spot.x,spot.z)+2.2,z:spot.z};turn=Math.atan2(-spot.x,-spot.z)+.5;d=2.2;p=.05;}
          const px=look.x+Math.sin(turn)*d,pz=look.z+Math.cos(turn)*d;player.group.position.set(px,world.heightAt(px,pz),pz);
          reviewTarget=new THREE.Vector3(look.x,look.y,look.z);yaw=turn;pitch=p;distance=targetDistance=d;}
        // John and the Sultana: him on the pier at Tidehaven, her at anchor off it, her coming in under sail, and him on the quay at Solis.
        if(['john','john-pier','sultana','sultana-sailing','john-solis'].includes(view)){questStage=10;combat.finishPractice();player.group.visible=false;
          const at=view==='john-solis'?'solis':'tidehaven';salt.berth(at);if(view==='sultana-sailing')salt.berth(at,'arriving',sailTime(salt.port)*.55);placeSalt();
          const s=salt.port.stand,ship=salt.pose(),hy=world.heightAt(s.x,s.z);let look,turn,d,p;
          if(view==='john'){look={x:s.x,y:hy+1.5,z:s.z};turn=s.yaw+.3;d=2.6;p=.06;}
          else if(view==='john-pier'||view==='john-solis'){turn=Math.atan2(s.x-ship.x,s.z-ship.z)+.35;look={x:s.x-Math.sin(turn)*3,y:hy+2.2,z:s.z-Math.cos(turn)*3};d=9;p=.12;}
          else{const lead=view==='sultana'?0:9;look={x:ship.x+Math.sin(ship.yaw)*lead,y:3.4,z:ship.z+Math.cos(ship.yaw)*lead};turn=ship.yaw+(view==='sultana'?2.1:1.1);d=view==='sultana'?17:26;p=.12;}
          const px=look.x+Math.sin(turn)*d,pz=look.z+Math.cos(turn)*d;player.group.position.set(px,Math.max(SEA_LEVEL,world.heightAt(px,pz)),pz);
          reviewTarget=new THREE.Vector3(look.x,look.y,look.z);yaw=turn;pitch=p;distance=targetDistance=d;}
        // Brandy's boards from the lane: the three cut like houses, and the yard behind them.
        if(view==='brandy-houses'||view==='brandy-boards'){questStage=10;combat.finishPractice();player.group.visible=false;
          const houses=view==='brandy-houses',at=yardPoint(houses?-.6:0,houses?3.4:-.5),y=world.heightAt(at.x,at.z),turn=BRANDY_YARD.yaw+(houses?.05:.15),d=houses?6.5:11;
          const px=at.x+Math.sin(turn)*d,pz=at.z+Math.cos(turn)*d;player.group.position.set(px,world.heightAt(px,pz),pz);
          reviewTarget=new THREE.Vector3(at.x,y+(houses?1.4:1.2),at.z);yaw=turn;pitch=houses?.08:.3;distance=targetDistance=d;}
        // Talaelos at its Avrel camp: the company, and a play in progress.
        if(view.startsWith('troupe-')){questStage=10;combat.finishPractice();player.group.visible=false;troupe.moveTo(view.startsWith('troupe-stop-')?view.slice(12):'avrel');
          if(view==='troupe-scene')troupe.beginScene();else troupe.cancelScene();placeTroupe(true);
          const s=troupe.stop,look={x:s.x+Math.sin(s.yaw)*1.4,z:s.z+Math.cos(s.yaw)*1.4},d=view==='troupe-scene'?8:11;
          const px=look.x+Math.sin(s.yaw+.25)*d,pz=look.z+Math.cos(s.yaw+.25)*d;player.group.position.set(px,world.heightAt(px,pz),pz);
          reviewTarget=new THREE.Vector3(look.x,world.heightAt(look.x,look.z)+1.6,look.z);yaw=s.yaw+.25;pitch=.12;distance=targetDistance=d;}
        // Birding with the pointer up: a bird he has not named yet, close enough to observe,
        // with the caret over it, its wings on the chart and the box beside them.
        if(view==='birding-pointer'){questStage=10;combat.finishPractice();player.setArmed(false);testTravel('village');show('testing-badge',false);birding.meet();refreshSkillsSheet();
          const settled=drentBirds.state().birds.filter(b=>b.visible&&BIRD_SPECIES[b.species]&&!['flight','arrive','leave','away'].includes(b.action));
          const target=settled.find(b=>b.species==='cardinal')??settled.find(b=>b.species==='robin')??settled[0];
          if(target){
            let stand=null;
            for(let step=0;step<12&&!stand;step++){const turn=step*Math.PI/6,x=target.x+Math.sin(turn)*6,z=target.z+Math.cos(turn)*6;
              if(canStand(x,z,world))stand={x,z,turn};}
            const spot=stand??{x:target.x+6,z:target.z,turn:Math.PI/2};
            player.group.position.set(spot.x,world.heightAt(spot.x,spot.z),spot.z);
            // The camera sits behind him on the far side from the bird, so its yaw is the turn away from it.
            yaw=spot.turn;pitch=.1;distance=targetDistance=5.6;player.group.rotation.y=Math.PI+yaw;
            grounded=true;verticalSpeed=0;
            reviewTarget=new THREE.Vector3((spot.x+target.x)/2,world.heightAt((spot.x+target.x)/2,(spot.z+target.z)/2)+1.25,(spot.z+target.z)/2);
            reviewFrozen=true;settleCamera();
          }
        }
        if(view==='lakota'||view==='lakota-aloft'){questStage=10;combat.finishPractice();const npc=npcById.get(BIRD_WATCHER.id),a=npc.actor.group,at=a.position,face=a.rotation.y;
          player.group.position.set(at.x+Math.sin(face+1.2)*4,world.heightAt(at.x,at.z),at.z+Math.cos(face+1.2)*4);player.group.visible=false;
          if(view==='lakota'){reviewTarget=new THREE.Vector3(at.x,at.y+1.35,at.z);yaw=face+.55;pitch=.1;distance=targetDistance=2.7;}
          else{a.getObjectByName('Left Wrist').getWorldPosition(gloveAt);const glove={x:gloveAt.x,y:gloveAt.y,z:gloveAt.z,yaw:face},anchor={x:at.x,y:at.y,z:at.z};
            redTailFlight.update(60,{glove,anchor});redTailFlight.update(2.5,{glove,anchor});const step=redTailFlight.update(.1,{glove,anchor});redTail.pose(step,elapsed);
            // Hold her mid-circle and look at her, wings out, from a little below and to the side.
            reviewFrozen=true;reviewTarget=new THREE.Vector3(step.x,step.y,step.z);yaw=step.yaw+1.3;pitch=-.25;distance=targetDistance=3;}}
        if(view==='goblin'){questStage=4;combat.finishPractice();combat.startEncounter(greenwayEncounter);const enemy=combat.state.enemies[0];reviewTarget=new THREE.Vector3(enemy.x,world.heightAt(enemy.x,enemy.z)+1.15,enemy.z);reviewFrozen=true;player.group.visible=false;yaw=0;pitch=.13;distance=targetDistance=3.8;}
        if(view==='stick'){questStage=10;combat.finishPractice();inventory.grant('forest-stick');weapons.equip('forest-stick');player.group.position.set(-35,world.heightAt(-35,29),29);player.group.rotation.y=Math.PI;yaw=Math.PI+.35;pitch=.24;distance=targetDistance=4.5;}
        if(view==='acorns'){questStage=10;combat.finishPractice();if(!inventory.count('acorn'))inventory.add('acorn');toggleInventory();inventory.select('acorn');}
        if(view==='pawpaw'){questStage=10;combat.finishPractice();if(!inventory.count('pawpaw'))inventory.add('pawpaw',2);combat.state.player.hp=62;toggleInventory();inventory.select('pawpaw');}
        if(view==='pawpaw-patch'){questStage=10;combat.finishPractice();woodlandLife.restoreCollectedFruit([]);const f=woodlandLife.state().fruits[0],patch=woodlandLife.state().fruitPatches[0];player.group.position.set(f.x+.5,world.heightAt(f.x+.5,f.z+1),f.z+1);reviewTarget=new THREE.Vector3(patch.x,world.heightAt(patch.x,patch.z)+1.2,patch.z);distance=targetDistance=6;pitch=.35;yaw=.4;}
        if(view==='doomsayer'||view==='doomsayer-dialogue'){questStage=10;combat.finishPractice();const npc=npcData.find(n=>n.id==='doomsayer'),home=world.npcPositions.doomsayer;player.group.position.set(home.x+1.5,world.heightAt(home.x+1.5,home.z+2),home.z+2);npc.actor.group.rotation.y=.25;yaw=.35;pitch=.2;distance=targetDistance=5;reviewTarget=npc.actor.group.position.clone().add(new THREE.Vector3(0,1.4,0));if(view==='doomsayer-dialogue')conversation(npc);}
        if(view==='pond'||view==='fishing'){questStage=10;combat.finishPractice();currentFishingSpot=world.fishingSpots[0];const bank=world.pond.fishingSpot;player.group.position.set(bank.x,world.heightAt(bank.x,bank.z),bank.z);player.group.rotation.y=Math.PI/2;yaw=-Math.PI/2+.4;pitch=.38;distance=targetDistance=view==='pond'?11:6.2;if(view==='fishing'){campcraft.teachFishing();startFishing();campcraft.update(3.03);reviewFrozen=true;}}
        if(view==='river-fishing'){questStage=10;combat.finishPractice();currentFishingSpot=world.fishingSpots.find(spot=>spot.id==='reedwater');const bank=currentFishingSpot.fishingSpot;player.group.position.set(bank.x,world.heightAt(bank.x,bank.z),bank.z);yaw=.2;pitch=.34;distance=targetDistance=8;campcraft.teachFishing();startFishing();campcraft.update(3.03);reviewFrozen=true;}
        if(view==='cooking'){questStage=10;combat.finishPractice();inventory.grant('tinderbox');inventory.add('raw-fish',2);inventory.add('forest-stick',2);const fire=world.firePits[0];campcraft.light(fire.id);player.group.position.set(fire.x,world.heightAt(fire.x,fire.z),fire.z);yaw=.7;pitch=.5;distance=targetDistance=6.5;fireMenu(fire);}
        if(view==='cooked-fish'){questStage=10;combat.finishPractice();if(!inventory.has('cooked-fish'))inventory.add('cooked-fish',2);combat.state.player.hp=43;toggleInventory();inventory.select('cooked-fish');}
        if(view==='testing'){questStage=10;combat.finishPractice();modal('testing');}
        const roadViews={sunmeadow:{x:-232,z:34,yaw:1.9,pitch:.26,distance:17},reedwater:{x:-330,z:84,yaw:2.2,pitch:.29,distance:14},threefold:{x:-378,z:130,yaw:2.6,pitch:.25,distance:17},'north-relay':{x:-398,z:190,yaw:2.8,pitch:.25,distance:12},'lauvel-field':{x:-386,z:176,yaw:3.0,pitch:.26,distance:20},'moros-gate':{x:-424,z:252,yaw:2.5,pitch:.24,distance:16},'legion-camp':{x:-520,z:330,yaw:2.3,pitch:.26,distance:26},'suval-border':{x:-232,z:288,yaw:1.4,pitch:.24,distance:14},elod:{x:-78,z:638,yaw:-1.55,pitch:.3,distance:20},'elod-harbour':{x:-8,z:642,yaw:0,pitch:.26,distance:15},'elod-quay':{x:-14,z:620,yaw:-1.5,pitch:.24,distance:12},'elod-city':{x:-24,z:682,yaw:0,pitch:.3,distance:20},'elod-inner-gate':{x:-41,z:597,yaw:Math.PI,pitch:.22,distance:13}};
        roadViews['road-sign']={x:-326,z:80,yaw:2.1,pitch:.2,distance:5};
        if(roadViews[view]){const v=roadViews[view];questStage=10;combat.finishPractice();inventory.grant('harbor-letter');inventory.grant('road-token');journey.start();player.group.position.set(v.x,world.heightAt(v.x,v.z),v.z);player.group.rotation.y=Math.PI+v.yaw;yaw=v.yaw;pitch=v.pitch;distance=targetDistance=v.distance;reviewFrozen=true;}
        if(view==='waymarker-before'||view==='waymarker-after'){
          questStage=10;combat.finishPractice();const site=world.journeySites['beacon-west'];
          world.setJourneySiteState(site.id,view==='waymarker-after');
          player.group.position.set(site.x+2,world.heightAt(site.x+2,site.z+3),site.z+3);player.group.visible=false;
          reviewTarget=new THREE.Vector3(site.x-2.1,world.heightAt(site.x-2.1,site.z)+1,site.z);
          yaw=.15;pitch=.18;distance=targetDistance=5;reviewFrozen=true;
        }
        if(view==='road-dialogue'){questStage=10;combat.finishPractice();inventory.grant('harbor-letter');inventory.grant('road-token');journey.start();const npc=npcData.find(n=>n.id==='meadow-courier'),p=world.npcPositions[npc.id];player.group.position.set(p.x,world.heightAt(p.x,p.z+1.8),p.z+1.8);yaw=.5;pitch=.3;distance=targetDistance=6;conversation(npc);}
        if(view.startsWith('portrait-')){const npc=npcData.find(n=>n.id===view.slice(9));if(npc){questStage=10;combat.finishPractice();const p=world.npcPositions[npc.id];player.group.position.set(p.x,world.heightAt(p.x,p.z+2),p.z+2);player.group.visible=false;npc.actor.group.rotation.y=.3;reviewTarget=npc.actor.group.position.clone().add(new THREE.Vector3(0,1.3,0));yaw=.3;pitch=.15;distance=targetDistance=4;reviewFrozen=true;}}
        if(['sheep','river-bird','rock-hare'].includes(view)){questStage=10;combat.finishPractice();const animal=roadLife.state().creatures.find(a=>a.species===({sheep:'sheep','river-bird':'bank-bird','rock-hare':'rock-hare'})[view]);if(animal){player.group.position.set(animal.x+4,world.heightAt(animal.x+4,animal.z+3),animal.z+3);roadLife.update(.03,player.group.position,true);reviewTarget=new THREE.Vector3(animal.x,animal.groundY+.6,animal.z);yaw=.6;pitch=.18;distance=targetDistance=view==='sheep'?5:3.4;player.group.visible=false;reviewFrozen=true;}}
        roadLife.update(.001,player.group.position,true);westLife.update(.001,player.group.position,true);
        const forestView=FOREST_STORY_SITES.find(site=>site.id===view);
        if(forestView){
          questStage=1;combat.finishPractice();player.group.position.set(forestView.x,world.heightAt(forestView.x,forestView.z),forestView.z);
          yaw=view==='coast-lookout'?Math.PI:.25;pitch=.36;distance=targetDistance=10;
          player.group.rotation.y=Math.PI+yaw;reviewTarget=new THREE.Vector3(forestView.x,world.heightAt(forestView.x,forestView.z)+1.1,forestView.z);
          forestEcology.update(.001,elapsed,player.group.position,true);reviewFrozen=true;settleCamera();
        }
        if(view==='forest-deer'){
          questStage=1;combat.finishPractice();const animal=forestEcology.state().animals[0];
          player.group.position.set(animal.x+3,world.heightAt(animal.x+3,animal.z+4),animal.z+4);
          forestEcology.update(.001,elapsed,player.group.position,true);player.group.visible=false;
          reviewTarget=new THREE.Vector3(animal.x,animal.groundY+.9,animal.z);yaw=.7;pitch=.12;distance=targetDistance=5;reviewFrozen=true;
        }
        if(view==='forest-dialogue'||view==='forest-notes'){
          questStage=1;combat.finishPractice();const npc=npcData.find(n=>n.id===FOREST_STORY_NPC.id),p=world.npcPositions[npc.id];
          player.group.position.set(p.x+1.5,world.heightAt(p.x+1.5,p.z+1.5),p.z+1.5);yaw=.6;pitch=.3;distance=targetDistance=6;
          if(view==='forest-dialogue'){conversation(npc);while(activeDialogue&&activeDialogue.index<activeDialogue.lines.length-1)nextSpeech();}
          else {for(const site of FOREST_STORY_SITES)forestStory.act(`inspect-${site.id}`);modal('journal');mapTab(false);$('journal-forest').scrollIntoView({block:'start'});}
          reviewFrozen=true;
        }
        if(view==='squirrel'){questStage=10;combat.finishPractice();let s=woodlandLife.state().squirrels[0];const observer={x:s.x+1,z:s.z+1};for(let i=0;i<100;i++)woodlandLife.update(.03,observer);s=woodlandLife.state().squirrels[0];reviewTarget=new THREE.Vector3(s.x,s.y+.28,s.z);reviewFrozen=true;player.group.visible=false;distance=targetDistance=3.1;pitch=.12;yaw=Math.atan2(s.x-s.tree.x,s.z-s.tree.z);}
        refreshQuest();return state();
      },
      freezeReview(){reviewFrozen=true;return state();}
    };
  }
}

function createSky(scene){
  const group=new THREE.Group();scene.add(group);
  const mat=new THREE.MeshBasicMaterial({color:0xf4f2db,transparent:true,opacity:.62,depthWrite:false});const geo=new THREE.IcosahedronGeometry(1,1);
  for(let i=0;i<18;i++){const cluster=new THREE.Group();const a=i*2.399;cluster.position.set(Math.sin(a)*(110+i*5),50+(i%4)*10,Math.cos(a)*(110+i*5));for(let j=0;j<4;j++){const puff=new THREE.Mesh(geo,mat);puff.position.set(j*8,Math.sin(j)*2,0);puff.scale.set(13,3+j%2,6);cluster.add(puff);}group.add(cluster);}
  return group;
}

