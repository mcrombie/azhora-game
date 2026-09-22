import * as THREE from 'three';
import { createWorld } from './world.js';
import { createCat, createCharacter, createDog, createHorse, createOgre, makeQuestMarker, setShadowCasting, tunicForRole, skinForRole, BUCKLER_NAME } from './characters.js';
import { markerFor, markerGrade } from './quest-markers.js';
import { createCombat, MAX_ALLIES } from './combat.js';
/** Held, not pressed: the one new verb melee gets (docs/combat-brief.md, phase 4). */
const GUARD_KEY='KeyV';
import { createCombatView } from './combat-view.js';
import { createInventory, INVENTORY_ITEMS } from './inventory.js';
import { createWeapons, WEAPON_TYPES, feelOf } from './weapons.js';
import { createConsumables } from './consumables.js';
import { createCampcraft } from './campcraft.js';
import { createWorldMap } from './world-map.js';
import { createMapTutorial } from './map-tutorial.js';
import { MERCENARY_ROSTER, CROMB, KIT_WEAPON_ITEM, ARRIVALS, mercenaryById, escortSpotFor, landingMateNote, mateIsEscorting, createMercenaryCompany, mercenaryLines, mercenaryStyleLines, mercenaryWeapon, tradeOffer, distanceAlongRoad } from './mercenaries.js';
import { ANCHORS as ROUTE_ANCHORS } from './regions.js';
import { createLongRoad, forkNotice, drillScene, landingAt, companionPace, COMPANION_REACH, DRILL_COUNT, CORNERS_XP, PLAY_TROUPE_STOPS } from './long-road.js';
import { FARM_ROWS, ORCHARD_TREES, CROPS, FARMING_SKILL, createFarming } from './farming.js';
import { METRES_PER_HEX, toWorld, toWorldXIn } from './world-scale.js';
import { GREENWAY_RAID, AVREL_RAID } from './opening-fights.js';
import { bystandersFor, createFallen } from './bystanders.js';
import { LEGION_POSTS, LEGION_POST_IDS, legionPostLines } from './legion-posts.js';
import { TOWN_LIFE_NPCS, TOWN_LIFE_IDS, townLifeLines, createWallWatch } from './town-life.js';
import { createBorderWatch, CLOSED_BORDER_TITLE } from './closed-border.js';
import { COPPER_ITEM, PEDDLER, PEDDLER_STOCK, STARTING_PURSE, describeSum, peddlerLines, peddlerOffers } from './economy.js';
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
import { OGRE_STAND, OSTEL } from './amod-world.js';
import { PEBLOS_NPCS, PEBLOS_NPC_IDS, peblosConversation } from './peblos-people.js';
import { EAST_SUVAL_PEOPLE, EAST_SUVAL_NPC_IDS, elodConversation } from './elod-people.js';
import { createIzolHost } from './izol-host.js';
import { izolDeckHeight } from './izol-world.js';
import { ELAGOS_NPCS, isElagosNpc, elagosConversation, TALKING_TREE_QUEST } from './ambron-people.js';
import { FERRY_NPC, FERRY_LANDINGS, createFerry, ferryConversation, quayHeight } from './ferry.js';
import { createMorosChapter, MOROS_SITES, MOROS_SITE_ACTIONS, MOROS_GATE_ID, MOROS_LEGATE_ID, MUSTER_EARLY, morosConversation } from './moros-chapter.js';
import { createBorderChapter, BORDER_NPCS, BORDER_ENCOUNTER_ID, BORDER_ARENA, borderEncounter, borderLine, borderLineSaid, borderConversation } from './border-chapter.js';
import { createWestSuvalHost } from './west-suval-host.js';
import { createAftermathChapter, AFTERMATH_NPCS, AFTERMATH_VARIANTS, aftermathEncounter, aftermathConversation, SIDE_GIFTS, giftOwed, GIFT_LINES, CAP_LINES } from './aftermath-chapter.js';
import { AFTERMATH_SITES, aftermathSite, aftermathArena, aftermathBuilt } from './aftermath-sites.js';
import { occupationControl, isOut, stakeOf } from './occupation.js';
import { createRiding, RIDE, RIDING_KEYS, DEVELOPER_HORSE_SPEED, DEVELOPER_HORSE_NAME, steer, drive } from './riding.js';
import { companyHorses, picketSpots, coatFor, ridePace, RIDE_FILE, staggerFor, fileSpotFor } from './company-horses.js';
import { OSTLER_NPC, OSTLER_OBJECTIVE, horseWaiting, redeemHorse, ostlerConversation } from './ostler.js';
import { SMITH_NPC, MOROS_ARMOURER_NPC, AMBRON_ARMOURER_NPC, smithConversation, buyFromSmith, smithOffers, pieceName, sellsHere } from './smith.js';
import { AMBRON_FORGE } from './ambron.js';
import { OUTPOST_LAYOUT } from './outpost.js';
import { LUMBER_TOWN_STABLE, TIDEHAVEN_SMITHY, SOLIS, SEA_LEVEL, solisPoint, villageToWorld } from './region-world.js';
import { BEGGAR_NPC, createBeggar, beggarConversation } from './beggar.js';
import { createSkills, skillLevel, SKILLS, SKILL_IDS, SKILLS_VERSION, skillGuide, levelUpLine, skillTip } from './skills.js';
import { skillIconSVG } from './skill-icons.js';
// Who you are: any of the eleven of the company, chosen at the opening (src/player-characters.js).
import { DEFAULT_PLAYER, SELECTABLE, companyFor, playableCharacter, playerLook, savedPlayerCharacter, startingGear, startingInventory, startingLanguages, startingSkills } from './player-characters.js';
import { createCharacterSelect } from './character-select.js';
// Sailing in: the forty-four seconds from the roads to the pier, as data (docs/opening-sequence.md).
import { stateAt, eventsBetween, variantFor, boatBob, SKIP_BY_VARIANT, ASHORE_PACE } from './opening-sequence.js';
import { WOODCUTTING_SKILL, BOWDEN, BOWDEN_STAND, WOODLOT_TREES, TREE_KINDS, AXES, SWING, CHOP_REACH, createWoodcutting, bowdenConversation, bowdenLines } from './woodcutting.js';
import { createBowden } from './woodcutter-model.js';
import { LAUVEL_PEOPLE, LAUVEL_LINES, bearersAt, bearersStandingBack, fieldPoint } from './lauvel-aftermath.js';
import { createBurying, selaConversation, workerChoice, HAIL, HAIL_FROM, JOBS, JOB_FIRST, JOB_AGAIN, THE_GREEN_COAT, THE_BURYING, SON } from './lauvel-burying.js';
import { createGravedigger, createStretcher } from './lauvel-people-models.js';
import { CONSTRUCTION_SKILL, PLANKS, PLANK_IDS, WORKBENCH, HOUSE_STAGES, HOUSE_PLOT, PLOT_STAND, WORKBENCH_SPOT, BIRDHOUSE_POSTS, BIRDHOUSE_KINDS, BUILD_LINES, createConstruction, sawOffer } from './construction.js';
import { createCombatSkills, familyOf, maxHealth } from './combat-skills.js';
import { createCompanions, armsOf, ASKS } from './companions.js';
import { createTeachers, TEACHERS, markOf } from './teachers.js';
import { BOW, JERRYS_BOW, flightOf, inTheLine, solidAt } from './archery.js';
import { FILE_FLOOR, isArmyBattle, fillFor, fillCount, fillLines } from './file-fill.js';
import { createFoundWeapons, fallenCompanions } from './found-weapons.js';
import { createGear, TIERS, tierSoldAt, WEIGHTS, tierScale } from './gear.js';
import { BIRD_WATCHER, GARDEN_KEEPER, BIRD_SPECIES, BIRDING_KEY, BIRDING_LESSON, SKILLS_KEY, FILLED_FEEDER_ITEM, createBirding, birdWatcherConversation, gardenKeeperConversation, lysaFeederChoice, observeRange } from './birding.js';
import { createLakota } from './lakota.js';
import { createDrentBirds } from './drent-birds.js';
import { findBird } from './bird-finder.js';
import { createFishing, FISHING_SKILL } from './fishing-skill.js';
import { MYCOLOGIST, MYCOLOGIST_STAND, MYCOLOGY_SKILL, MYCOLOGY_LESSON, createMycology, mycologistConversation } from './mycology.js';
import { createMushrooms } from './mushrooms.js';
import { BOTANIST, BOTANIST_STAND, BOTANY_SKILL, BOTANY_LESSON, JIMSON_ITEM, createBotany, botanistConversation } from './botany.js';
import { createDrentFlora } from './drent-flora.js';
import { createDrentTrees } from './drent-trees.js';
import { GEOLOGIST, GEOLOGIST_STAND, GEOLOGY_SKILL, GEOLOGY_LESSON, createGeology, geologistConversation } from './geology.js';
import { INSTRUCTOR, INSTRUCTOR_STAND, GUARD_SECONDS, lessonStage, instructorConversation } from './instructor.js';
import { trimCast } from './cast.js';
import { createLinguist, MAX_PROFICIENCY } from './linguist.js';
import { LANGUAGES, DIALECTS, INTERPRETER, interpreterFor, LINGUIST_KEY, PHRASEBOOK_ITEM } from './languages.js';
import { setSignReader, setForeignLettering } from './signs.js';
import { createGameMode } from './game-mode.js';
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
import { TALAELOS, TROUPE_PEOPLE, TROUPE_IDS, PLAYBILL_ITEM, createTroupe, troupeConversation, troupeThanks } from './troupe.js';
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
import { REFUGEES, REFUGEES_ENABLED, REFUGEE_IDS, REFUGEE_STANDS, REFUGEE_START, createRefugees, refugeeConversation } from './refugees.js';
import { createMapFog, subregionsAt } from './map-fog.js';
import { isOpenCountry } from './regions.js';
import { CARTOGRAPHY_SKILL, CARTOGRAPHY_DIRECTIONS, createCartography, chartShapes } from './cartography.js';
import { regionLevel, levelWords } from './region-levels.js';
import { DEFAULT_SKY, createSkyBlend } from './region-sky.js';
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
  MENETH_RIDGES, MENETH_BECKS, menethTroughZ, LIZEEM, CARICA, ELA_SOUTH_REACH,
  LIZEEM_REACH, EER_CHANNELS, WEST_BRAIDS, ISAREOS_RIVER,
  NETH, NETHEREUM_HOLLOW, NETHEREUM_STREAMS } from './west-regions.js';
import { createRoadVerges } from './road-verges.js';
import { createRoadAudio as createAudio } from './road-audio.js';
import { createDeveloperMode } from './developer-mode.js';
import { runDeveloperSmoke } from './developer-smoke.js';
import { moveCharacter, canStand, canSwim, WATERLINE, advanceQuest, questSteps, QUEST_DONE, SUBQUESTS, getMovementInput } from './game-state.js';
import { questLive } from './quest-slate.js';
import { SWIMMING_SKILL, SWIM, SWIMMING_LESSON, createSwimming, swimStep, swimSpeed } from './swimming.js';
import { BODY, bodyWorld, stepAround, lendFacing } from './bodies.js';
import { travelCountries, travelPlaces, landingSpot, nearestPlace, parsePoint } from './testing-travel.js';
import { talkTarget, placeKeepsPrompt } from './prompt-priority.js';
import { createFrameErrors } from './frame-errors.js';
import { figureDetail } from './figure-lod.js';
import { createStandIn } from './figure-stand-in.js';

const $ = id => document.getElementById(id);
const show = (id, visible) => $(id).classList.toggle('hidden', !visible);
let mode = 'opening', questStage = 0;
const keys = new Set(), discoveries = new Set();
let world, renderer, player, scene, camera;
try { init(); } catch(error) { fail(error); }
/**
 * What the frame's one catch caught (src/frame-errors.js). `fail` below is unchanged and still
 * does everything it did; this only writes the throw down where a harness can ask about it,
 * because for most of a day nothing did.
 */
const frameErrors = createFrameErrors({
  onNew: entry => console.error(`Frame error: ${entry.message}${entry.at ? ` (${entry.at})` : ''}`),
  onAny: entry => { try { if (testingEnabled || new URLSearchParams(location.search).has('test')) toast(entry.message, 'THE FRAME THREW'); } catch {} },
});
/**
 * **Anything thrown outside the frame, recorded with its stack.** A throw in a click handler or a
 * timer is not caught by the render loop's own guard, and all the runner ever heard of it was
 * "Uncaught TypeError" with no line: an hour of the 22 September 2026 session went on chasing one
 * of those. The window says where it came from now.
 */
addEventListener('error', event => { try { frameErrors.note(event.error ?? event.message, null); } catch {} });
addEventListener('unhandledrejection', event => { try { frameErrors.note(event.reason, null); } catch {} });

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
  // The sky starts as it always was, and stays that way until a region asks for its own
  // (src/region-sky.js). DEFAULT_SKY is these three numbers and no region declares another.
  scene=new THREE.Scene(); scene.background=new THREE.Color(DEFAULT_SKY.background); scene.fog=new THREE.FogExp2(DEFAULT_SKY.fog,DEFAULT_SKY.density);
  const sky=createSkyBlend();
  camera=new THREE.PerspectiveCamera(54,innerWidth/innerHeight,.1,650);
  scene.add(new THREE.HemisphereLight(0xd8efff,0x63783d,2));
  const sun=new THREE.DirectionalLight(0xffe2a8,3.1);sun.position.set(-45,90,38);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-65,right:65,top:65,bottom:-65,near:1,far:210});
  sun.shadow.normalBias=.045;sun.shadow.bias=-.00025;sun.shadow.camera.updateProjectionMatrix();scene.add(sun,sun.target);
  const clouds=createSky(scene);
  const testingQuery=new URLSearchParams(location.search);
  // Normal or hard (src/game-mode.js, docs/hard-mode.md). Normal is the game we develop and the
  // only one we test, and it is all in English; hard is where the linguist and its tongues are
  // reserved. There is no selector, because hard mode is not yet worth choosing: ?mode=hard beside
  // ?test=1 is the only way in, and it keeps the reserved code reachable with no interface work.
  // Nothing else in this file asks which mode it is - it asks the gate for a feature by name.
  const gameMode=createGameMode({mode:testingQuery.get('mode')});
  // The skills no sheet shows in this mode. The registry in src/skills.js keeps every one of them,
  // so a save holding linguist experience still validates and keeps every point of it.
  const hiddenSkills=new Set(gameMode.hiddenSkills);
  // The lettering atlas is cut once, when the world is built, so the answer has to be in before
  // the next line. In normal mode no sign will ever letter in a tongue, so the foreign words are
  // left out of it and the texture is halved (src/signs.js knows only yes or no, never the mode).
  setForeignLettering(gameMode.has('linguist'));
  world=createWorld(scene,{spatialBatches:!(testingQuery.has('test')&&testingQuery.get('spatial')==='0')});
  // You may be any of the eleven, so the body has to be replaceable. The rig around it is not:
  // combat and everything else took hold of this one position object at boot and keeps holding it.
  let playerId=DEFAULT_PLAYER,playerBody=null;
  const playerRig=new THREE.Group();playerRig.name='player';
  player={group:playerRig,animate:(...a)=>playerBody.animate(...a),setArmed:(...a)=>playerBody.setArmed(...a),
    // The shield hand. This facade is the whole of what the game may ask the body to do, so a
    // verb left out of it is a verb that silently does nothing.
    setShield:(...a)=>playerBody.setShield(...a),
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
  let npcData=[{id:'fisher',name:'Tobin',role:'Fisher',color:0xb97b50},{id:HARBOURMASTER,name:'Jojo',role:'Harbourmaster of Tidehaven',modelRole:'harbormaster',color:0x2f5a63,skin:0xc39a72,look:{beard:false,slight:true,hairStyle:'long',hair:0x3b2a1d}},{id:'warden',name:'Eren',role:'Waykeeper of the Greenway Watch',modelRole:'legion-soldier',color:0x8f3b30},{id:'acorn-cook',name:'Lysa',role:'Village cook',color:0x9c774b},{id:'doomsayer',name:'Orris',role:'Doomsayer',color:0x49434b},{id:'pond-fisher',name:'Bran',role:'Pond fisherman',color:0x7c8f73}];
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
  // Jess, who rowed the traveler ashore in the opening and rows them out to the Pebbles for a fee (src/ferry.js).
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
  // The ostler of Nothom hands over the army's horse and teaches riding.
  world.npcPositions[OSTLER_NPC.id]={x:LUMBER_TOWN_STABLE.stand.x,z:LUMBER_TOWN_STABLE.stand.z};npcData.push({...OSTLER_NPC,yaw:LUMBER_TOWN_STABLE.stand.yaw});
  // The smith of Tidehaven, at his own forge on the south street (src/smith.js).
  world.npcPositions[SMITH_NPC.id]={x:TIDEHAVEN_SMITHY.stand.x,z:TIDEHAVEN_SMITHY.stand.z};npcData.push({...SMITH_NPC,yaw:TIDEHAVEN_SMITHY.stand.yaw});
  // The army's armourer, beside the Moros camp's smithy tent. Amod's forge needed nobody: it
  // already had Goibniu, and a man who is evidently the smith is the smith (src/smith.js).
  world.npcPositions[MOROS_ARMOURER_NPC.id]={x:OUTPOST_LAYOUT.armourer.x,z:OUTPOST_LAYOUT.armourer.z};
  npcData.push({...MOROS_ARMOURER_NPC,yaw:OUTPOST_LAYOUT.armourer.yaw});
  // The capital's armourer, at the door of the Strand Forge on Ambron's working bank. He sells
  // above his country - the one exception, and it is a property of the seller (SELLER_TIERS).
  world.npcPositions[AMBRON_ARMOURER_NPC.id]={x:AMBRON_FORGE.stand.x,z:AMBRON_FORGE.stand.z};
  npcData.push({...AMBRON_ARMOURER_NPC,yaw:AMBRON_FORGE.stand.yaw});
  npcData.push({...FOREST_STORY_NPC});
  npcData.push(...REGIONAL_LIFE_NPCS.map(npc=>({...npc})));
  // The mercenary company walks the main road on its own clock; each man is an NPC whose home moves.
  // Eleven possible hired swords for ten places: whichever of them you are is not on the road,
  // and Cromb stands in the place you left (companyFor). A default game is the ten it always was.
  const mercenaryIds=new Set([...MERCENARY_ROSTER.map(m=>m.id),CROMB.id]);
  const companyPlan={road:world.paths[0],stops:[{id:'induction',point:world.npcPositions['meadow-courier'],dwell:90},{id:'crossing',point:world.npcPositions['crossing-keeper'],dwell:60},{id:'relay',point:world.npcPositions['relay-clerk'],dwell:120}].filter(stop=>stop.point),muster:ROUTE_ANCHORS.legionCamp,landing:world.spawn,shore:WORD_BEACH,
    // A stopped man holds his place for up to two minutes, so it has to be ground he can
    // actually reach; the company moves any that is not, once, when the formation is laid.
    standable:(x,z)=>canStand(x,z,world,BODY.person)};
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
  // Who walks with you, how well they know you, and who is gone (src/companions.js). It shares
  // `fallen` with the world's other dead on purpose: permanent death is one idea, not two.
  const companions=createCompanions({fallen,onEvent:event=>{
    if(event.type==='joined'||event.type==='sent-on'||event.type==='died'){rebuildCompany();placeMercenaries();}
    if(event.type==='rung')toast(`${mercenaryById(event.id)?.name??event.id}: ${event.label}.`,'THE COMPANY');
  }});
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
  // Jojo the harbourmaster meets the traveler off the boat and hands over the letter.
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
  // Odger Pell dries mushrooms at Fernway Rest, where the woodland paths meet (src/mycology.js).
  world.npcPositions[MYCOLOGIST.id]={x:MYCOLOGIST_STAND.x,z:MYCOLOGIST_STAND.z};npcData.push({...MYCOLOGIST,yaw:MYCOLOGIST_STAND.yaw});
  // Nell Harrow's drying frames on the Sunken Lane's hedge bank (src/botany.js), Toft on his
  // barrel in the village, and Cabe out on the Weatherhead south of the landing (src/pipeweed.js).
  world.npcPositions[BOTANIST.id]={x:BOTANIST_STAND.x,z:BOTANIST_STAND.z};npcData.push({...BOTANIST,yaw:BOTANIST_STAND.yaw});
  world.npcPositions[TOFT.id]={x:TOFT_STAND.x,z:TOFT_STAND.z};npcData.push({...TOFT,yaw:TOFT_STAND.yaw});
  world.npcPositions[PIPE_SMOKER.id]={x:WEATHERHEAD.stand.x,z:WEATHERHEAD.stand.z};npcData.push({...PIPE_SMOKER,yaw:Math.PI*.55});
  world.npcPositions[GEOLOGIST.id]={x:GEOLOGIST_STAND.x,z:GEOLOGIST_STAND.z};npcData.push({...GEOLOGIST,yaw:GEOLOGIST_STAND.yaw});
  // Officer Glun at the straw post: he teaches the sword and then hands over the chart
  // (src/instructor.js). The opening used to point a card at an unattended post.
  world.npcPositions[INSTRUCTOR.id]={x:INSTRUCTOR_STAND.x,z:INSTRUCTOR_STAND.z};npcData.push({...INSTRUCTOR,yaw:INSTRUCTOR_STAND.yaw});
  // The Greenway Watch, in world metres: the ground that ends the fifth step now that the man who
  // stood on it is out of the cast (src/cast.js).
  const WATCH_POINT=villageToWorld(0,-66);
  // The three off the Lauvel road (src/refugees.js): they start where the battle
  // was and walk the main road east while the game is played, so where they are
  // when the traveler meets them depends entirely on what the traveler did first.
  const refugeeRoute=world.paths[0].slice(0,REFUGEE_START+1).reverse().map(point=>({x:point.x,z:point.z}));
  const refugees=createRefugees({route:refugeeRoute,stands:REFUGEE_STANDS,onEvent:event=>{if(REFUGEES_ENABLED&&event.type==='refugees-arrived')toast('Three people off the Lauvel road have reached the landing. They are telling the village what they saw.','WORD FROM THE WEST');}});
  // Disabled at the user's request (REFUGEES_ENABLED): their clock still runs, but nobody is stood in the world.
  if(REFUGEES_ENABLED)for(const person of REFUGEES){const start=refugees.positions().find(entry=>entry.id===person.id);world.npcPositions[person.id]={x:start.x,z:start.z};npcData.push({...person,yaw:start.yaw});}
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
  // By name rather than by row: `placements()` leaves the dead out altogether, so its order is
  // the roster's order with holes in it and never a row number (src/mercenaries.js). Nobody is
  // dead at the first frame - a save is loaded later - but the figures are made here once, and
  // giving a man another man's place at build time is not a thing worth being able to do.
  for(const placement of company.placements(0)){const merc=roster.find(man=>man.id===placement.id);
    if(!merc)continue;world.npcPositions[merc.id]={x:placement.x,z:placement.z};npcData.push(mercNpc(merc,placement));}
  // **The cast, trimmed** (src/cast.js): while the main quest is built out, only the people it
  // sends you to, the soldiers, the hired company and the user's own characters stand up. Nobody
  // is deleted - every one of them is still written and still placed by their own module - and
  // the ones left out have their stands taken off the world so nothing walks into a ghost.
  {const kept=new Set(trimCast(npcData,{mercenaryIds}).map(npc=>npc.id));
    for(const npc of npcData)if(!kept.has(npc.id))delete world.npcPositions[npc.id];
    npcData=npcData.filter(npc=>kept.has(npc.id));}
  for(const npc of npcData) {
    npc.actor=npc.make?npc.make():npc.ogre?createOgre():npc.dog?createDog({variant:0}):npc.cat?createCat({variant:0}):createCharacter({tunic:npc.color,role:npc.modelRole||npc.id,skin:npc.skin,look:npc.look,armed:!!npc.armed});const p=world.npcPositions[npc.id];if(npc.hidden)npc.actor.group.visible=false;
    npc.actor.group.position.set(p.x,world.heightAt(p.x,p.z),p.z);scene.add(npc.actor.group);
    npc.actor.group.rotation.y=Number.isFinite(npc.yaw)?npc.yaw:Math.PI/3;npc.markerKind='main';npc.marker=makeQuestMarker('main');scene.add(npc.marker);
  }
  const npcById=new Map(npcData.map(npc=>[npc.id,npc]));
  /**
   * How much of somebody is drawn (src/figure-lod.js). The stand-in is a child of the figure's
   * own group, and that group stays visible: other code reads `npc.actor.group.visible` as "this
   * person is here" - the bodies list that makes people solid to one another, the draws() hook -
   * so hiding it would make everybody in the distance walk-through and uncounted. As a child it
   * also stands, turns and scales with them for nothing.
   *
   * What the rig itself has hidden stays hidden: a child is put back the way it was, not
   * switched on.
   */
  function showFigure(npc,detail){
    const group=npc.actor.group,peg=detail==='stand-in';
    if(peg&&!npc.standIn){
      const role=npc.modelRole||npc.id;
      npc.standIn=createStandIn({tunic:npc.look?.tunic??npc.color??tunicForRole(role),skin:npc.look?.skin??npc.skin??skinForRole(role),hair:npc.look?.hair??null});
      npc.standIn.visible=false;group.add(npc.standIn);}
    for(const child of group.children){
      if(child===npc.standIn){child.visible=peg;continue;}
      if(peg){if(npc.detail!=='stand-in')child.userData.shownInFull=child.visible;child.visible=false;}
      else child.visible=child.userData.shownInFull??true;}
    npc.detail=detail;
  }
  // Lakota's red-tailed hawk rides his glove and now and then goes up to circle the green (src/hawk-flight.js).
  const redTail=createRedTailHawk(),redTailFlight=createHawkFlight(),gloveAt=new THREE.Vector3();scene.add(redTail.group);
  // Everyone placed by now stands on open ground, and so does every place the traveler is sent.
  world.keepPropsClear([...Object.values(world.npcPositions),lakotaGarden,pierHead,...SALT_PORTS.map(p=>p.stand),...FOREST_STORY_SITES,...REGIONAL_LIFE_SITES,...Object.values(LUSCIA_SITES),...Object.values(MOROS_SITES)]);
  const wallWatch=createWallWatch({scene,createCharacter,heightAt:world.heightAt}),borderWatch=createBorderWatch();
  const garrisonHome=Object.fromEntries(HIDEOUT_GARRISON.map(g=>[g.id,{...world.npcPositions[g.id]}]));
  function placeMercenaries(){
    // **`createMercenaryCompany` reads the walking list once, at construction.** Every path that
    // changes who walks with you therefore has to remake the company, and `companions.restore` -
    // a loaded save, a story start, a review view - is a path that changes it without going
    // through the `joined`/`sent-on`/`died` events that remake it. A call site that forgets gets
    // a company that silently places nobody: the men are walking with you in the save and
    // nowhere in the world. Asked here instead, no call site can forget.
    if(companySignature()!==companyBuiltWith)rebuildCompany();
    // **A dead man has no placement**, so the loop below will never reach him again. Whatever he
    // was doing the frame he fell - drawn, solid, walking to a home - he would go on doing for
    // ever, so he is put out of the world here rather than left standing on the road. It is the
    // same pair of flags the Greenway raid sets over a villager it kills.
    for(const id of fallen.ids){const npc=mercenaryIds.has(id)?npcById.get(id):null;
      if(npc){npc.fallen=true;npc.hidden=true;npc.walkingWith=false;npc.escorting=false;npc.mounted=false;npc.lift=0;}}
    fileOrder=company.companionIds??(company.companionId?[company.companionId]:[]);
    // The stagger is measured from the moment the traveler went up or came down, so it is the
    // same clock for every man in the file and nothing has to be told about it.
    if(riding.mounted!==companyWasMounted){companyWasMounted=riding.mounted;companyMountedAt=elapsed;}
    // **The file starts on ground the horses have already taken** (companyHorseGround). Stepped
    // down, a company has eleven animals standing about it whose places nothing in the file could
    // see; now they are in `fileTaken` before the first man is placed, so every path that lays a
    // file - walked or snapped - avoids them.
    fileTaken=companyHorseGround().bodies;
    // **And the traveler is a body too.** `fileSpotFor` measures back from him and so can never
    // be given his ground - but the escort ring the file falls back on is a list of close-in
    // offsets, and nothing stopped it putting a man on top of him. On the road beside Lumber
    // Town it put Ciarán 1.9 m from the traveler's horse, where two riders want 2.6.
    fileTaken.push({x:player.group.position.x,z:player.group.position.z,
      room:riding.mounted?RIDE_FILE.room:BODY.person*2});
    for(const placement of company.placements(playSeconds)){const npc=npcById.get(placement.id);if(!npc)continue;
    if(placement.phase==='with-traveler'){placeCompanion(npc,placement,fileOrder.indexOf(npc.id));continue;}
    if(npc.escorting&&!mateIsEscorting({mate:npc,questStage,mode,arriving:!!opening})){npc.escorting=false;npc.pace=undefined;}
    npc.walkingWith=false;npc.mounted=false;npc.lift=0;
    // **A man on the road walks at his own pace.** His placement creeps forward at his roster
    // pace - 1.28 m/s for Chris Gotwood - while the npc loop chased it at the default 2.4, so he
    // caught it up, stalled inside the loop's tenth-of-a-metre dead zone, waited for the road to
    // pull ahead of him and set off again, six times a second, legs starting and stopping the
    // whole way up the road. Matched to the road he simply walks. `stride` also tells the loop
    // that the dead zone - which is there to stop a man standing still from shuffling - does not
    // apply to him; and a man who has been left behind (snapped home out of sight, or stepped
    // round a cart) is allowed to hurry until he is back on his mark.
    if(placement.walking&&placement.pace>0){const a=npc.actor.group.position;
      npc.stride=placement.pace;
      npc.pace=Math.hypot(placement.x-a.x,placement.z-a.z)>2?Math.max(2.4,placement.pace*2):placement.pace;}
    else{npc.stride=undefined;npc.pace=undefined;}
    world.npcPositions[placement.id]={x:placement.x,z:placement.z};npc.hidden=placement.phase==='coming'||fallen.has(placement.id);npc.placement=placement;if(!npc.hidden)npc.actor.group.visible=Math.hypot(placement.x-player.group.position.x,placement.z-player.group.position.z)<170;}}
  /**
   * The companion, placed: two and a half metres behind the traveler's left shoulder, which is
   * inside the twelve the interpreter's aside needs and out of the reach of every site prompt.
   * He walks when he is more than four metres off it and is simply set down beside you when he
   * is more than forty, because at forty there is a wall, a river or a boat between you.
   *
   * Two things stop him following. A fight: he keeps the street behind you and never steps in
   * the box, because Drent is level 0 and nothing there is his. And water or another country:
   * the ferry to Peblos and the road post over the Tessen are where he waits.
   */
  /**
   * Where each held man stands, by his own id. It was one variable, and `placeCompanion` runs
   * once per companion per frame - so the first man through set it from his own feet and the
   * other nine were handed a copy of it. Ten solid men shoving at one point, for the whole of
   * any fight and everywhere in Pueth and Peblos. A hold is a man staying where he is, which
   * is one place per man.
   */
  const companionHold=new Map();
  /**
   * **When you ride, everyone walking with you rides.** One rule, and this line is all of it:
   * a companion is in the saddle exactly when the traveler is, a short stagger down the file
   * behind him. Nothing else can put a man up or take him down, which is why a fight, a river,
   * a ferry and a cutscene need no line of their own - each already puts the traveler on the
   * ground, and the company comes with him.
   *
   * The same expression does both ways. Going up, a man's turn has come when enough of the
   * stagger has passed; coming down, he is still up until it has. So the file rises raggedly
   * from the front and steps down raggedly from the front, which is what a company looks like.
   */
  let companyMountedAt=-1e9,companyWasMounted=false;
  function companyUp(place){
    if(!riding.owned)return false;
    const since=elapsed-companyMountedAt,turn=staggerFor(Math.max(0,place));
    return riding.mounted?since>=turn:since<turn;}
  /**
   * Where the n-th man of the file wants to be. The first is where Chris has always been, at the
   * traveler's left shoulder; the rest are strung out behind him a stride apart, alternating
   * shoulders so the file reads as a file and not as a queue of one man's shadow.
   *
   * On narrow ground - the pier, a bridge, a lane - the shoulders have nowhere to be, so the
   * file closes up to the centreline and goes single. That is not a special case with a list of
   * places in it: it falls out of asking whether the shoulder spot is ground, and taking the
   * middle when it is not.
   */
  /**
   * The ground each man of the file has taken this frame. `placeCompanion` runs once per
   * companion per frame, so without this the men cannot see each other: two riders whose own
   * shoulder spot does not stand both fall back on the same piece of ground and stand inside one
   * another. The same class as the hold that was one closure variable - a file is one place per
   * man, and the only way to mean that is to remember the places already taken.
   */
  let fileTaken=[];
  /**
   * Where the n-th man of the file wants to be. The arithmetic is `fileSpotFor`
   * (src/company-horses.js), so the ground at a real place can be asked the same question a
   * test asks it. A file of horses is the same file with a horse's room in it: further back,
   * wider apart, and tested against the mount's own footprint rather than a man's.
   */
  function fileSpot(p,yaw,place,mounted=false){
    const reach=mounted?RIDE_FILE:COMPANION_REACH,radius=mounted?RIDE.radius:undefined;
    return fileSpotFor({at:p,yaw,place,reach,room:reach.room??BODY.person*2,taken:fileTaken,
      canStand:(x,z)=>canStand(x,z,world,radius)});}
  function placeCompanion(npc,placement,place=0){
    const p=player.group.position,pos=npc.actor.group.position,yaw=player.group.rotation.y;
    npc.hidden=false;npc.actor.group.visible=true;npc.walkingWith=true;
    // Two other hands are on him at the start: the arrival sequence has him in the bow, and
    // escortLandingMate walks him up the pier at the tighter offsets a three-metre pier wants.
    // Both run after this one and both would be fighting it, so it stands aside for them.
    if(mode==='arriving'||mateIsEscorting({mate:npc,questStage,mode,arriving:!!opening})){
      npc.placement={...placement,x:pos.x,z:pos.z,yaw:npc.actor.group.rotation.y};return;}
    const here=world.regionAt(p.x,p.z)?.name??null;
    // Only the fights he is taught alone in hold a companion out. Everywhere else the people
    // walking with him are in it, which is the design's own answer to hard country and the reason
    // each of them can be lost (docs/companions.md).
    const fight=combat.state.phase==='active'&&TEACHING_FIGHTS.has(combat.state.encounterId)?combat.state.center:null;
    if(here==='Pueth'||here==='Peblos'||fight){
      if(!companionHold.has(npc.id))companionHold.set(npc.id,{x:pos.x,z:pos.z});
      // The widest fight box reaches 24.2 m from its centre (fightBox, src/combat.js), so a man
      // kept COMPANION_KEEP_OUT metres off it is outside every one of them, whichever way it is laid.
      const held=fight?outsideTheFight(fight,companionHold.get(npc.id)):companionHold.get(npc.id);
      companionHold.set(npc.id,held);
      world.npcPositions[npc.id]={...held};npc.pace=2.4;npc.escorting=false;npc.mounted=false;npc.lift=0;
      npc.placement={...placement,x:held.x,z:held.z,yaw:npc.actor.group.rotation.y};
      return;}
    companionHold.delete(npc.id);
    const seat=companyUp(place),room=(seat?RIDE_FILE:COMPANION_REACH).room??BODY.person*2;
    // The fallback ring answers to the same taken ground as the file, horses included: an entry
    // that carries its own `room` is a horse and wants more of it than a man does.
    const stands=(sx,sz)=>canStand(sx,sz,world,seat?RIDE.radius:undefined)
      &&fileTaken.every(other=>Math.hypot(other.x-sx,other.z-sz)>=(Number.isFinite(other.room)?other.room:room));
    // His place in the file; failing that the escort ring, **asked for his own place in it**;
    // failing that he stands where he is. The old fallback was the man at the front's spot,
    // written out in full and the same for everybody, so a file that could not spread put every
    // rider on one stone - which is exactly what the yard did with three of them.
    const wanted=fileSpot(p,yaw,Math.max(0,place),seat)
      ??escortSpotFor({x:p.x,z:p.z,yaw},stands,Math.max(0,place))
      ??{x:pos.x,z:pos.z};
    const x=wanted.x,z=wanted.z;
    fileTaken.push({x,z});
    const gap=Math.hypot(pos.x-x,pos.z-z);
    // In the saddle he sits a seat's height above the ground the mover puts him on, and he keeps
    // up with whatever the traveler asked for - the canter, and the testing panel's horse that
    // goes twice as fast. On his feet he runs as he always has (companionPace).
    npc.mounted=seat;npc.lift=seat?RIDE.seat.up:0;
    world.npcPositions[npc.id]={x,z};npc.escorting=true;npc.pace=seat?ridePace(gap,riding.speed(true)):companionPace(gap);
    // Forty metres apart is a wall, a river, a ferry or a horse, and never running: he runs
    // faster than the traveler does, so he closes rather than falls behind (companionPace).
    if(gap>COMPANION_REACH.setDown)pos.set(x,world.heightAt(x,z),z);
    npc.placement={...placement,x,z,yaw};}
  /**
   * The file, in the order they walk it: whoever the company says is at the traveler's shoulder,
   * then the rest behind. It is read once a frame rather than per man so the order cannot change
   * halfway down the file.
   */
  let fileOrder=[];
  /**
   * **One voice per event.** A remark on a landing, the long road's noticing, an aside from the
   * interpreter: the first man in the file who has something to say says it, and the rest hold
   * their peace. With one companion this is exactly what it always was; with nine it is the
   * difference between a company and a crowd.
   *
   * `has` is asked of each id in turn and answers what that man would say, or null.
   */
  function oneVoice(has){
    for(const id of fileOrder){const said=has(id);if(said)return {id,said};}
    return null;}
  /**
   * **The three fights the player is taught alone in**, by id: the straw post's practice, the
   * raid on the Greenway, and the raiders in the Avrel clearing. Nobody walking with the traveler
   * joins these, and the hold keeps them clear of the box.
   *
   * It is a list of three authored fights and not a region test, because "the fights he is being
   * taught alone in" is not a place: Drent has later fights that are not lessons, and Luscia's
   * wolves are a lesson in nothing. The long road's piece 4 kept Chris out of the raid for
   * exactly this reason, and this is that rule written down rather than implied by `fight`.
   */
  /**
   * Sparring with a teacher (docs/combat-brief.md, phase 7). One id, because only one bout is
   * ever on: you stand up with one man, and the rest of the company stays out of it, which is
   * exactly what `TEACHING_FIGHTS` is for.
   */
  const SPARRING_ID='sparring-bout';
  const TEACHING_FIGHTS=new Set([GREENWAY_RAID.id,AVREL_RAID.id,SPARRING_ID]);
  /**
   * **Where the n-th man of the file stands: with the traveler, and never among the enemy.**
   *
   * This used to be `center - sign*(5 + (index%5)*3)`, five ranks measured from the arena's centre
   * away from the way out - which is the ENEMY's end of every arena the game lays. Its own comment
   * said "on the traveler's side of the centre" and it did the opposite: at the border battle the
   * side's own four soldiers stood 6.7 to 9.1 m from the traveler while the six the army assigned
   * him stood **18 to 30 m away, the fifth of them 1.8 m from an enemy soldier** before the first
   * blow (docs/known-issues.md). Every table taken since companions became allies was measured
   * with the file standing among the enemy.
   *
   * **A sign is not the repair**, because the arenas do not agree with each other. Measured, in
   * each arena's own along-axis (+ is the way out, - is the enemy's end):
   *
   * | arena | way out | checkpoint | enemies |
   * |---|---|---|---|
   * | border battle, and all four days after it | +21 | +13 | -9 to -20 |
   * | the Lauvel wolves | **+11** | **-11** | -7, -9 |
   * | Mallec at the pass stones | +27 | **+21** | -2 |
   * | the Bramble camp | +23 | +15 | +3, -3 |
   *
   * The Lauvel's traveler starts on the far side of his own wolves, and Mallec's starts at +21,
   * outside the +18 an ally is even allowed to stand at. So the file is laid **on the point the
   * fight forms up at** - the checkpoint, which is where the encounter lays its own soldiers too -
   * stepped the way that is **away from the enemies from there**, and clamped inside the ground
   * `encounterConfig` will accept. The clamp is not decoration: an ally one metre past the
   * retreat line makes the whole encounter invalid and `startEncounter` returns false, which at
   * the border is a toast telling the traveler to go and stand where he is already standing.
   *
   * Two shallow ranks of five, 2.2 m apart across and the second rank half a step over, so that
   * when the clamp puts both ranks on the same line - which it does at Mallec - the eleven men
   * still each have their own ground, and none of them stands on the side's authored four.
   */
  function companionAllies(config){
    if(!config?.center||TEACHING_FIGHTS.has(config.id))return [];
    const axis=config.retreatAxis==='x'?'x':'z',across=axis==='x'?'z':'x';
    const sign=config.retreatSign===-1?-1:1;
    // Only the room the encounter has left. This can never be the reason a fight does not start:
    // `encounterConfig` throws out a whole encounter whose ally list is too long, and the border
    // authors four of its own, so handing it everybody would have made the arc unfinishable with
    // three companions. If there is not room for all of them, the rest hold.
    const room=Math.max(0,MAX_ALLIES-(config.allies?.length??0));
    // The fight's own frame, read exactly as `encounterConfig` reads it.
    const along=p=>sign*(p[axis]-config.center[axis]),over=p=>p[across]-config.center[across];
    const line=Number.isFinite(config.retreatLine)?config.retreatLine:config.retreatZ;
    const anchor=config.checkpoint,anchorAlong=along(anchor),anchorOver=over(anchor);
    // Which way is away from them, from where the file forms up. A fight with no enemies at all
    // cannot happen (`encounterConfig` refuses one), so this is always a real bearing.
    const enemyAlong=config.enemies.reduce((sum,foe)=>sum+along(foe),0)/config.enemies.length;
    const back=anchorAlong>=enemyAlong?1:-1;
    // As far back as the arena allows: inside the 18 m `encounterConfig` permits toward the way
    // out, the 21 m it permits toward the enemy, and a metre and a half short of the retreat line.
    const far=Math.min(18,along({[axis]:line,[across]:0})-1.5),near=-19.5;
    // The line is **shifted** to fit the 12 m the arena allows across, never clamped man by man:
    // clamping put two of the file on the same spot at the Bramble camp, whose checkpoint stands 9
    // m off its own centre line. A rank runs from -4.4 to +5.5 of its base, so the base fits here.
    const overBase=Math.max(-6.6,Math.min(5.5,anchorOver));
    const place=index=>{
      const rank=index<5?0:1;
      return {[axis]:config.center[axis]+sign*Math.max(near,Math.min(far,anchorAlong+back*(2.6+rank*2.6))),
        [across]:config.center[across]+overBase+((index%5)-2)*2.2+rank*1.1};
    };
    const file=fileOrder.slice(0,room).map((id,index)=>{
      const merc=mercenaryById(id),arms=armsOf(id);
      if(!merc||!arms||fallen.has(id))return null;
      // Jerry does not close: an ally whose craft is the bow stands off and looses (src/archery.js).
      return {id,name:merc.name,kind:arms.weapon==='bows'?'archer':'legionary',level:arms.level,toughness:arms.toughness,
        ...place(index),
        model:{role:'mercenary',tunic:merc.look.tunic,skin:merc.look.skin,look:{...merc.look,weapon:merc.weapon,trades:false}}};
    }).filter(Boolean);
    /**
     * **The army fills your file** (src/file-fill.js, the user's ruling of 2026-09-21). Only at
     * the army's own battles, only when he is short, and only ever up to the room the fight has
     * left - so company plus the side's own men plus the fill can never pass `MAX_ALLIES`, and a
     * traveler with six friends is handed nobody and fights today's battle to the digit.
     *
     * They stand in the file because the file is the thing being filled, and they carry the one
     * pair of numbers `FILL_ARMS` gives them - trained a little, and strictly weaker than the
     * weakest man who ever chose to walk with him.
     */
    if(!isArmyBattle(config.id))return file;
    const fill=fillFor({side:armySide(),walking:file.length,room:room-file.length});
    return [...file,...fill.map((man,index)=>({...man,...place(file.length+index)}))];}
  /** Whichever army he signed with: the one that would be assigning him men (src/border-chapter.js). */
  const armySide=()=>border.view().side??campaign.view().side??'empire';
  /**
   * What his commander says about the men he is being assigned, in that man's own voice, and
   * **only when it is actually happening**. The number is the true one: the same `fillCount` the
   * fight itself will use, asked of the same file.
   */
  const fillSaid=()=>fillLines(armySide(),fillCount({walking:fileOrder.filter(id=>!fallen.has(id)).length}));
  /**
   * **How big his company is, for the two things that ask.** The men walking with him and still
   * alive - not the strangers the army is lending him, and not the side's own soldiers, who are
   * the side's whatever he brought. It is read at the moment it is wanted and saved nowhere.
   */
  const companyWalking=()=>fileOrder.filter(id=>!fallen.has(id)).length;
  /**
   * What his captain says when the other side has counted that company and answered it
   * (`borderLineSaid`, src/border-chapter.js), and nothing at all while the line is the eight it
   * has always been. The number he says is the number `borderEncounter` will lay.
   */
  const lineSaid=()=>borderLineSaid(armySide(),borderLine(companyWalking()));
  /**
   * What killed him, in the plainest words the fight has. The Marshal asks what happened and the
   * answer is built from this rather than invented - "At the Lauvel. Wolves, at night."
   */
  function enemyWordFor(encounterId){
    if(encounterId===LUSCIA_WOLVES.id)return 'Wolves';
    if(encounterId===OGRE_ENCOUNTER.id)return 'The ogre at the pass stones';
    if(encounterId===BORDER_ENCOUNTER_ID)return 'The border battle';
    if(encounterId===hideoutEncounter.id)return 'The scouts at the Bramble camp';
    return 'Goblins';}
  /**
   * Weapons lying in the world to be found (src/found-weapons.js). It owns nothing: a dead man's
   * weapon is already kept in src/companions.js, with where he fell and whether it has been
   * taken, so this asks rather than copies. A barrow or a gift can be another source later.
   */
  // What the traveler is wearing (src/gear.js): three pieces, three weights, and a material.
  // Nothing on is today's game exactly.
  const gear=createGear({onEvent:()=>saveRoad(false)});
  const foundWeapons=createFoundWeapons({sources:[fallenCompanions(companions)]});
  const foundWeaponProps=new Map();
  const foundWeaponGroup=new THREE.Group();foundWeaponGroup.name='Weapons on the ground';scene.add(foundWeaponGroup);
  /**
   * One mesh a lying weapon, put there the first time it is seen and taken away when it is picked
   * up. A weapon on the ground is **marked** - it stands a little proud of the grass with a quiet
   * upright over it - because a named weapon nobody can find is a weapon nobody is given.
   */
  function refreshFoundWeapons(){
    const lying=foundWeapons.lying();
    const here=new Set(lying.map(one=>one.id));
    for(const [id,prop] of foundWeaponProps){if(here.has(id))continue;foundWeaponGroup.remove(prop);foundWeaponProps.delete(id);}
    for(const one of lying){
      if(foundWeaponProps.has(one.id))continue;
      const prop=new THREE.Group();
      const blade=new THREE.Mesh(new THREE.BoxGeometry(.1,.08,1.15),new THREE.MeshStandardMaterial({color:0x8c8f96,roughness:.5,metalness:.55}));
      blade.rotation.z=.12;blade.position.y=.09;prop.add(blade);
      const mark=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,1.5,6),new THREE.MeshStandardMaterial({color:0x6b5a44,roughness:.9}));
      mark.position.y=.75;prop.add(mark);
      const cloth=new THREE.Mesh(new THREE.PlaneGeometry(.34,.22),new THREE.MeshStandardMaterial({color:0xb23b2e,roughness:.95,side:THREE.DoubleSide}));
      cloth.position.set(.17,1.33,0);prop.add(cloth);
      prop.position.set(one.x,world.heightAt(one.x,one.z),one.z);
      foundWeaponGroup.add(prop);foundWeaponProps.set(one.id,prop);}}
  const COMPANION_KEEP_OUT=26;
  /** The nearest standable spot clear of a fight, for a man who is not in it and must not be. */
  function outsideTheFight(centre,at){
    const dx=at.x-centre.x,dz=at.z-centre.z,d=Math.hypot(dx,dz);
    if(d>=COMPANION_KEEP_OUT)return at;
    const bearing=d>.5?{x:dx/d,z:dz/d}:{x:0,z:1};
    for(const reach of [COMPANION_KEEP_OUT,COMPANION_KEEP_OUT+4,COMPANION_KEEP_OUT+9]){
      const spot={x:centre.x+bearing.x*reach,z:centre.z+bearing.z*reach};
      if(canStand(spot.x,spot.z,world))return spot;}
    return at;}
  function settleMercenaries(){placeMercenaries();for(const npc of npcData)if(mercenaryIds.has(npc.id)){const p=world.npcPositions[npc.id];npc.actor.group.position.set(p.x,world.heightAt(p.x,p.z)+(npc.lift??0),p.z);npc.actor.group.rotation.y=npc.placement?.yaw??0;}}
  /**
   * Become one of the eleven. Exactly one man on the road changes: the one whose place you
   * have taken walks out of the world, and Cromb walks into the slot he left with his own
   * model, his own hour and his own lines. Everything else about the company is untouched.
   */
  function setPlayerCharacter(id){
    const chosen=savedPlayerCharacter(id);
    if(chosen===playerId&&playerBody)return chosen;
    const before=roster;
    playerId=chosen;roster=companyFor(playerId);rebuildCompany();
    for(const [i,merc] of roster.entries()){
      if(merc.id===before[i].id)continue;
      const npc=npcById.get(before[i].id);if(!npc)continue;
      scene.remove(npc.actor.group);npcById.delete(npc.id);mercenaryWeapons.delete(npc.id);
      // **By name, not by row.** A dead man has no placement at all (src/mercenaries.js), so the
      // list is no longer one entry per roster row and an index into it would hand this man the
      // next man's place. Nobody can be dead this early, but the invariant is cheaper to keep
      // than to remember.
      const placement=company.placements(playSeconds).find(one=>one.id===merc.id);
      if(!placement)continue;
      Object.assign(npc,mercNpc(merc,placement));world.npcPositions[merc.id]={x:placement.x,z:placement.z};
      npc.actor=createCharacter({tunic:npc.color,role:'mercenary',skin:npc.skin,look:npc.look});
      npc.shadows=undefined;npc.escorting=false;npc.pace=undefined;scene.add(npc.actor.group);npcById.set(npc.id,npc);
    }
    wearPlayerLook(playerId);settleMercenaries();
    // **His own shield, from the first step.** A loaded save puts its own gear on a moment after
    // this (`gear.restore`), so this is the new road's kit and never an old road's.
    for(const [slot,piece] of Object.entries(startingGear(playerId)??{}))if(!gear.wearing(slot))gear.wear(slot,piece);
    refreshShield();
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
    // A skill this mode does not show is not handed out either: nothing pays what is not on the
    // sheet. The table in src/player-characters.js keeps it, for the mode that does (game-mode.js).
    const known=Object.fromEntries(Object.entries(startingSkills(playerId)).filter(([id])=>SKILL_IDS.includes(id)&&!hiddenSkills.has(id)).map(([id,xp])=>[id,{xp}]));
    if(Object.keys(known).length)skills.restore({version:SKILLS_VERSION,skills:known});
    // And the tongues he already had. Chris Gotwood interprets for the company, so when he is the
    // player the Ambroni is his own from the first step and nobody has to lean in and repeat it.
    // Normal mode is all in English, so `startingLanguages` stays in the data and is never applied.
    if(gameMode.has('linguist'))for(const [id,proficiency] of Object.entries(startingLanguages(playerId)))linguist.speakAlready(id,proficiency);
    inventory.refresh();refreshSkillsSheet();updateHUD();
  }
  const objectiveMarker=makeQuestMarker();scene.add(objectiveMarker);
  // The long road's own gold on the ground, for a stop that is a place rather than a person.
  const openMarker=makeQuestMarker('main',{open:true});openMarker.visible=false;scene.add(openMarker);
  const trailMarker=makeQuestMarker();trailMarker.scale.setScalar(.7);trailMarker.visible=false;scene.add(trailMarker);
  trailMarker.traverse(object=>{if(object.isMesh){object.material=object.material.clone();object.material.color.set(0x8acfc2);object.material.emissive.set(0x437d76);}});
  const combatEvents=[];
  let weapons,consumables;
  // The seven fighting skills, whose margins combat and the weapons both read. It is filled in
  // below, once `skills` exists; until then the margins are the ones combat has always used.
  let arms=null;
  /**
   * The company is the faculty (src/teachers.js): who teaches what, the lessons each man owes at
   * each rung, and how high a bout with him pays. Filled in below beside `arms`, and `sparring`
   * is the bout that is on right now - who, in which family, and up to what.
   */
  let teachers=null,sparring=null;
  /**
   * **Jerry's mark**, and nothing else uses it: who set it up, in which family, what it pays up
   * to, where the straw is standing and the mesh that is standing there. It is a straw post with
   * a bow - practice, not a fight - so it is not in any snapshot, and it comes down the moment
   * the traveler walks off.
   */
  let mark=null;
  /**
   * **What a teacher has lent for the length of a bout**, and nothing else in the game has
   * anything like it: `{weapon}` or `{shield:true}`. It is not in the satchel, it is not in
   * `weapons`, it is not in `gear` and it is in no snapshot - the only thing that knows about it
   * is this variable and the three readers below. The traveler's own weapon is back in his hand
   * at `spar-over`, however the bout ended (src/teachers.js).
   */
  let lent=null;
  /**
   * The lent weapon as combat wants a weapon: a full profile, built from the weapon's own table
   * rather than from what the traveler owns, because he owns none of it. The hand that holds it
   * is still his, so his skill in that family still scales the damage.
   */
  function lentProfile(){
    if(!lent?.weapon)return null;
    const type=WEAPON_TYPES[lent.weapon];
    if(!type)return null;
    const scale=(arms?.margins().damageFor(lent.weapon)??1)*tierScale(type.tier??0);
    return {id:lent.weapon,name:type.name,owned:false,equipped:true,lent:true,
      durability:type.maxDurability,maxDurability:type.maxDurability,wornAt:type.wornAt,worn:false,usable:true,
      damage:type.damage.map(hit=>hit*scale),reachMultiplier:type.reachMultiplier,...feelOf(lent.weapon)};
  }
  /** What is actually in his hand this frame, lent or his own. */
  const heldWeapon=()=>lentProfile()??weapons?.profile()??null;
  /** Whether that thing is drawn rather than swung. One question, asked in four places. */
  const ranged=()=>!!heldWeapon()?.ranged;
  const combat=createCombat({world,position:player.group.position,onEvent:e=>combatEvents.push(e),getWeapon:()=>heldWeapon(),onWeaponContact:id=>{weapons.contact(id);inventory.refresh();},
    // Toughness buys the health, the wind and the length of a dodge; the weapon's own family
    // buys what a swing costs. All four are today's numbers while every skill is level 1.
    // A fight is as hard as the country it happens in (docs/difficulty-ladder.md, and
    // src/region-levels.js is that table). Off the atlas, or in open country, it is 0.
    getLevel:centre=>regionLevel(world.regionAt(centre?.x??0,centre?.z??0)?.name)??0,
    getAllies:config=>companionAllies(config),
    // How many arrows there are to shoot. The fight never touches the satchel; it only ever asks,
    // exactly as it asks who walks with the traveler and how hard the country is (src/archery.js).
    getArrows:()=>inventory.count(BOW.arrow),
    // Everybody standing in the world who is not in the fight, for the one question an arrow asks
    // of them: are you in the way (the user, 2026-09-21 — a villager, a horse or a beast stops a
    // shaft and is unhurt). It is the frame's own body list, the same one the traveler walks
    // against, and **only the arrows read it**: nothing about a swing, a step or where an enemy
    // may stand is told about these bodies, so every sword fight is the fight it was.
    getBodies:()=>gatherBodies(),
    getMargins:()=>{if(!arms)return {};const m=arms.margins();return {maxHp:m.maxHp,maxStamina:m.maxStamina,dodgeWindow:m.dodgeWindow,swingCost:m.swingCostFor(heldWeapon()?.id),
      // Armour turns a share of a blow and shortens the step aside; it never turns all of one.
      armourTurns:gear.turns,dodgeScale:gear.dodgeScale,
      // The shield: what a caught blow leaves him and what catching it costs in wind. `hasShield`
      // is the hand slot, because the hand slot IS the shield (src/gear.js) - or a shield lent
      // for a bout, which is on his arm without ever being his.
      guardShare:m.guardShare,guardCost:m.guardCost,hasShield:!!lent?.shield||!!gear.wearing('hand')};}});
  const combatView=createCombatView(scene,world,camera);
  // `practiceGuards` is not saved: like `lessonSet` it is worked out on a load from the stage
  // the traveler is at, because past the lesson it is always one (src/road-checkpoint.js).
  let practiceHits=0,practiceGuards=0,practiceDodges=0,guardHeld=0,reviewFrozen=false,reviewTarget=null,reviewCat=null,reviewLineup=null;
  // Whether Officer Glun has set the lesson. Nothing at the straw post counts before he has.
  let lessonSet=false;
  let yaw=0,pitch=.39,distance=9,targetDistance=9,verticalSpeed=0,grounded=true,walkTime=0,elapsed=0,lastTime=performance.now(),currentNPC=null,toastTimer,openingTime=0,openingFired=0,openingBells=0,opening=null,mateSaidGoodbye=false;
  /** Where the sequence wants the eye this frame, before the ordinary camera's lerp is bypassed. */
  const openingCamera={position:new THREE.Vector3(),target:new THREE.Vector3()};
  let drag=false,pointerX=0,pointerY=0,fullQuality=true,activeDialogue=null,audio=null,lastModalFocus=null;
  // Whether the swing button is *down*, which only a bow needs to know: it is the draw as well.
  let swingHeld=false;
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
    // Reading the letter used to be two steps of the tutorial of its own. Chapter 1 is three
    // subquests now and none of them is a button press in a menu (src/game-state.js).
    onInspect(){},
    onClose(){
      if(mode!=='inventory')return;
      mode='playing';stopInput();updateQuest('close-inventory');$('inventory-button').setAttribute('aria-expanded','false');canvas.focus();
    }
  });
  inventory.grant('simple-sword');
  // **And the shield he landed with**, for whoever is being played: only Cromb has one
  // (src/player-characters.js). A loaded save puts its own gear on over this; a new road
  // starts with it. `refreshShield` is called every frame by the loop, so the boards appear
  // on the arm without anything here having to ask for them.
  for(const [slot,piece] of Object.entries(startingGear(playerId)??{}))gear.wear(slot,piece);
  inventory.add(COPPER_ITEM,STARTING_PURSE);
  // How hard he hits with a given weapon: his level in that weapon's family, which is 1 - and
  // so a multiplier of exactly 1 - until somebody shows him how (src/combat-skills.js).
  weapons=createWeapons({inventory,damageScale:id=>arms?.margins().damageFor(id)??1,onEvent(event){
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
  // Every skill the mode shows begins at level 1 and pays from the first step (src/skills.js);
  // the linguist, which normal mode does not show, is not among them and never pays.
  const skills=createSkills({onEvent:skillEvent,begins:SKILL_IDS.filter(id=>!hiddenSkills.has(id))});
  // The seven fighting skills and the margins they buy (src/combat-skills.js). At level 1 in
  // everything those margins are today's game to the digit, which is the law phase 1 rests on.
  arms=createCombatSkills({skills,onEvent:()=>refreshSkillsSheet()});
  // **The company is the faculty** (src/teachers.js, docs/combat-brief.md phase 7). A lesson at
  // each rung, in the man's own voice, and a bout that pays up to what he himself knows. It owns
  // nothing but which lessons have been given: the standing is the companions', the experience
  // the skills'. The dead teach nothing and a man sent on ahead teaches nothing until he is back.
  teachers=createTeachers({companions,arms,onEvent:()=>refreshSkillsSheet()});
  // Linguist: in hard mode nobody in Azhora speaks the traveler's language, so what people say to
  // him arrives in theirs (src/languages.js, src/linguist.js). Chris Gotwood came off
  // the same boat with enough of the local speech to get two men up a road; while he is
  // beside you his interpretation runs under the line and every exposure counts double.
  // In normal mode everybody is understood: nothing here is fed, nothing here is paid, and the
  // module exists so that a save which holds a tongue keeps it (docs/hard-mode.md).
  const linguist=createLinguist({skills,onEvent:event=>{
    if(!gameMode.has('linguist')||event.type!=='tongue-level')return;
    if(event.read)toast(`${LANGUAGES[event.language].name} lettering has stopped being shapes. You will see it on the road ahead.`,'YOU CAN READ THE SIGNS');
    else if(event.level>=MAX_PROFICIENCY)toast(`There is nothing anybody says in ${LANGUAGES[event.language].name} that you cannot follow.`,'A TONGUE OF YOUR OWN');
    else if(event.level%10===0)toast(`${LANGUAGES[event.language].name} \u00b7 ${event.level}`,'A TONGUE IS COMING TO YOU');}});
  // A testing session is fluent in everything: the smoke tests read what people say to
  // check the content of it, and __AZHORA__.linguist.forget() puts the traveler back to
  // nothing when a review wants to look at the panel as a new player sees it.
  if(testingQuery.has('test'))linguist.fluent();
  // The road letters its signs in the country they stand in until the traveler can read it. With
  // nobody to ask, src/signs.js letters every board in English, which is normal mode exactly.
  if(gameMode.has('linguist'))setSignReader(id => linguist.canRead(id));
  // The long road through Drent: the optional walk that is exactly as long as the company takes
  // to come in (src/long-road.js, docs/drent-long-road.md). It reads every other module's view
  // and writes to none of them; what it keeps is the handful of things nobody else can answer.
  // Farming, the fourteenth skill: four rows at the Mill Commons and Applegarth's kept orchard
  // (src/farming.js). The only skill with a clock of its own, which is the long road's own point.
  const farming=createFarming({skills,inventory,onEvent:event=>{
    if(event.type==='row-sown')toast(`Sown. ${Math.round((event.ripeAt-playSeconds))} seconds, and it does not go faster for being watched.`,`${CROPS[event.crop].name.toUpperCase()} · THE COMMONS ROWS`);
    if(event.type==='row-reaped'||event.type==='tree-picked'){inventory.refresh();refreshSkillsSheet();audio?.effect('success');
      toast(event.type==='row-reaped'?`${event.quantity} × ${INVENTORY_ITEMS[event.item]?.name??event.item}. ${event.xp} farming.`:`An Avrel apple. ${event.xp} farming.`,
        event.levelled?`FARMING LEVEL ${event.level}`:'FARMING');}
    if(questStage>=1)saveRoad(false);}});
  let currentRow=null,currentAppleTree=null;
  const longRoad=createLongRoad();
  /** What the long road can see of the rest of the game, for deciding what is done. */
  const longRoadWorld=()=>({skills,acornQuest,journey:journey.state,mapFog,linguist,startingSkills:startingSkills(playerId),
    // Where the players are camped: the leg-3 stop is their play, so its gold follows the wagon
    // while it is open, and a wagon out of Drent does not hold the road up (src/long-road.js).
    troupe:{stop:troupe.stop.id,x:troupe.stop.x,z:troupe.stop.z},
    companion:companionOffTheClock&&!longRoad.released?{with:true}:false});
  /**
   * Any of the eleven may be the player and every one of them lands knowing something, so a
   * teacher may have somebody in front of them who already does this. The lesson is shortened
   * and never skipped: they say their one recognising line, the stop closes, and nothing is paid,
   * because the skill was already theirs (docs/drent-long-road.md §10). Answered before the
   * teacher's own conversation is built, and only ever once per stop.
   */
  function recogniseTeacher(npc){
    // Never before the letter. Jojo hands the letter and the rough chart to everybody, whatever
    // they already know, and a man who lands with cartography must not have that scene skipped.
    if(questStage<2)return false;
    const owed=longRoad.view(longRoadWorld()).recognising.filter(stop=>stop.npc===npc.id);
    if(!owed.length)return false;
    openDialogue(npc,owed.map(stop=>stop.line),null,'Go on',{onComplete:()=>{
      for(const stop of owed)longRoad.act('recognise',{id:stop.id});
      toast(owed.length>1?`${npc.name} can see you have done both of these before.`:`${npc.name} can see you have done this before. The lesson is shorter; the country is not.`,
        `${npc.name.toUpperCase()} · YOU HAVE DONE THIS`);
      saveRoad(false);closeDialogue();conversation(npc);}});
    return true;
  }
  /** The stop the open gold is on, with somewhere to put it: a person, or a place on the ground. */
  function longWayNext(){
    // **The long way round is off the slate** with the teachers it visits (src/quest-slate.js):
    // every one of its stops is somebody who was taken out of the cast, so the open gold has
    // nobody to stand over and the journal's block is not printed either (src/story-chapters.js).
    if(!questLive('teachers')||!longRoad.told||questStage<QUEST_DONE)return null;
    const next=longRoad.view(longRoadWorld()).next;
    if(!next)return null;
    const stand=next.npc?world.npcPositions[next.npc]:null;
    return {...next,at:stand?{x:stand.x,z:stand.z}:{...next.point}};}
  let longWayStop=null,landingSaid=null;
  /** The companion npc, while he is walking with the traveler and not before or after. */
  const companionBeside=()=>{
    if(!companionOffTheClock||longRoad.released)return null;
    const mate=npcById.get(landingMateId());
    return mate&&!mate.hidden&&mate.placement?.phase==='with-traveler'?mate:null;};
  /** The open gold as the charts want it: a named point to ring, or nothing. */
  const longWayTarget=()=>{const stop=longWayNext();return stop?{id:`long-road-${stop.id}`,name:stop.title,...stop.at}:null;};
  /**
   * Whether this game has a companion off the clock at all. A new game does, from the moment
   * he stops walking you up the pier; a save written before the long road existed does not, and
   * hands `createMercenaryCompany` an undefined companion, which is today's clock exactly.
   */
  let companionOffTheClock=false;
  const companionPlan=()=>{
    // The long road's own man, on his own terms - he is the one who can be released and taken
    // back - and then everybody else who said yes (src/companions.js). As many as will come.
    const release=longRoad.released;
    const mate=!companionOffTheClock?null
      :release?{id:landingMateId(),releasedAt:release.releasedAt,releasedDistance:release.releasedDistance}
      :{id:landingMateId(),with:true};
    const others=companions.companions.filter(entry=>entry.id!==landingMateId());
    const all=[...(mate?[mate]:[]),...others];
    // Empty is today's clock, exactly, and is spelled as nothing rather than as an empty list.
    return all.length?all:undefined;};
  let companyBuiltWith=null;
  /** The company's own dead, in roster order: who the clock must stop running. */
  const companyDead=()=>roster.filter(man=>fallen.has(man.id)).map(man=>man.id);
  /**
   * The signature is **the plan, not the companions list**. Chris is not in the companions list:
   * the landing mate is filtered out of it and carried separately, on the long road's own terms,
   * because he is the one who can be released and taken back. Watching the companions list alone
   * therefore misses every change to the one companion the user actually has.
   *
   * The dead are in it too, and for the same reason: `createMercenaryCompany` reads both lists
   * once, at construction, so a death that did not remake the company would leave a man's clock
   * running inside it.
   */
  const companySignature=()=>JSON.stringify([companionPlan()??null,companyDead()]);
  const rebuildCompany=()=>{companyBuiltWith=companySignature();
    company=createMercenaryCompany({...companyPlan,roster,companions:companionPlan(),dead:companyDead()});};
  /** Where he was standing when he left you, so he walks on from there and not from the landing. */
  function releaseCompanion(distance,line){
    if(!companionOffTheClock||longRoad.released)return false;
    const done=longRoad.act('release',{at:playSeconds,distance});
    if(!done.ok)return false;
    rebuildCompany();placeMercenaries();
    if(line)toast(line,`${companionName().toUpperCase()} \u00b7 GOES ON`);
    saveRoad(false);return true;}
  /** Until the march to the border begins, he can be asked back out of the camp. */
  function recallCompanion(){
    if(!companionOffTheClock||!longRoad.act('recall').ok)return false;
    rebuildCompany();placeMercenaries();
    toast('Walk Drent, then. I have nothing better on and you have a country to learn.',`${companionName().toUpperCase()} \u00b7 WITH YOU AGAIN`);
    saveRoad(false);return true;}
  /** Who came off your boat, by name: Chris Gotwood, or Cromb when you are Chris. */
  const companionName=()=>npcById.get(landingMateId())?.name??mercenaryById(landingMateId())?.name??'Chris Gotwood';
  // How Corvan's field register reads when he opens it: who of the eleven has already passed his
  // desk, and how many boats are still out. The long road's rule, in the army's own arithmetic.
  const registerView=()=>{const desk=company.stops.find(stop=>stop.id==='induction')?.distance??0,placed=company.placements(playSeconds);
    return {signed:placed.filter(p=>p.phase==='mustered'||((p.phase==='walking'||p.phase==='stopped')&&p.distance>=desk)).length,
      atSea:placed.filter(p=>p.phase==='coming').length};};
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
  // Everywhere a person stands, and the one place on the road that is read rather than talked
  // to: a bramble inside the Caloss Gate notice's own two metres ate the F that should have
  // read it, so the end of the tutorial pointed nowhere (found by the story smoke, 2026-09-22).
  const flora=createDrentFlora(scene,world,{avoid:[...Object.values(world.npcPositions),{x:world.border.x,z:world.border.z}]});
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
    if(action==='bowden-teach'){if(skills.learn(WOODCUTTING_SKILL).first||!AXES.some(a=>inventory.has(a.id))){if(!inventory.has('bronze-axe'))inventory.add('bronze-axe',1);inventory.refresh();refreshSkillsSheet();toast('Woodcutting, a new skill, and a bronze hatchet in your satchel. Stand at a tree in the Koopwood and press F.','NEW SKILL');saveRoad(false);}return;}
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
    openDialogue(bench,[skills.taught(CONSTRUCTION_SKILL)?'A heavy bench with a vice, a plank in it, and Bowden\u2019s tools along the back. What will you make?':'Bowden\u2019s workbench. You would need to know how; ask him.'],null,'Step away',{choices:[
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
    if(tip){let n=Number(tip[1]);if(n&&!inventory.remove(COPPER_ITEM,n))n=0;troupe.tip(n);
      // The long road's leg-3 stop is this play, watched to the end at either of the company's
      // camps in Drent - the Fernway verge it stands on, or the Avrel clearing, which is where an
      // older save may have left them. It has no view of its own, so the host is the one that can
      // say it happened (`PLAY_TROUPE_STOPS`). Read before the scene ends: the wagon is where it
      // was when the play began, and `endScene` is the end of it.
      const onTheLongWay=PLAY_TROUPE_STOPS.includes(troupe.stop.id),playedAt=troupe.stop.where;
      const done=troupe.endScene();placeTroupe(true);
      if(onTheLongWay&&longRoad.act('played').ok)toast(`A play at ${playedAt}, watched to the end.`,`${TALAELOS.name.toUpperCase()} · THE LONG WAY ROUND`);
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
    /**
     * `stand` is where the traveler is put, which is the camera's own spot unless a
     * view says otherwise. It says otherwise for the animals: the camera has to be
     * four metres from a heron to show one, and a heron four metres from a traveler
     * is a heron in the air. `review()` freezes the camera on `look` independently
     * of the player, so the two can be separated and the bird can be looked at
     * living rather than leaving.
     */
    const shot=(camera,target,pitch,height=1,self=false,stand=camera)=>({
      x:stand.x,z:stand.z,pitch,self,
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
    // Eer, the first of the six south-western countries. Prefixed `south-` on the
    // brief's naming, and worked out the same way: from the country's own numbers.
    if(view==='south-eer'){
      // The line the whole country is: standing on the black loam of the humid half,
      // looking south-east down the fall, across the change, to the dry grass and the
      // standing olives beyond it. Aimed above the ground so the horizon is in frame,
      // because the thing to see here is the colour of the far half.
      //
      // The camera stands between the two channels and clear of both — the first take
      // was nineteen metres off the north one and had a gallery willow filling a third
      // of the lens. Nearest water from here is forty-five metres.
      //
      // It looks from nine metres up rather than from head height, and that is the
      // second correction rather than a taste: `cameraPullIn` drags a review camera
      // forward to whatever stands on its line, and on a plain scattered with olives
      // and cushion scrub something always does — the second take was hauled a hundred
      // and twenty metres into the dry half and lost the very line it was taking. A
      // focus above `heightAt + 7` is a focus nothing on the ground can clamp against,
      // and the whole of both halves is in the frame because of it.
      //
      // The distance is fog rather than framing: `FogExp2` at Eer's own .0049 leaves
      // about half the light at 184 m and a fifth at 250, so a longer look across this
      // plain would show haze and not a country.
      return shot({x:-1170,z:1080},{x:-1030,z:1200},.02,9);
    }
    if(view==='south-eer-coast'){
      // The low bays from the grass behind one, out over the water. No cliff and no
      // beach to speak of: the point of the shot is that the grass gives out and the
      // sea is there. The dolphins' ground is out past the look.
      //
      // **Aimed at the waterline, not at the water.** Two takes aimed out to sea and
      // both lost it: a focus in the sea sits below sea level, which drags the whole
      // sight line down until it grazes the last few metres of shore and the sea is
      // behind the grass. Aiming at the last standable metre instead keeps the line
      // descending past it, so everything beyond — the bay, the far headlands and the
      // dolphins' water — falls below it and is in the frame.
      //
      // And looking from above the scrub rather than through it. `cameraPullIn` clamps
      // to whatever stands *nearest the focus*, so on a shore with cushion bushes right
      // down to the sand it does not nudge the camera, it hauls it to the waterline: one
      // take of this view came out as nothing but sea and sand. A focus above
      // `heightAt + 7` cannot be clamped against at all, and from sixteen metres the
      // shape of the bay is in the frame with the grass and the scrub in front of it,
      // which is what the lore means by "low headlands and small sheltered bays".
      return shot({x:-990,z:1176},{x:-900,z:1176},.05,11);
    }
    if(view==='south-eer-braids'){
      // The north channel where the gradient dies: three threads round bars of sand,
      // from far enough back and high enough up to see all three at once, which is the
      // same shot the Vastos braid takes and for the same reason.
      //
      // It differs from the Vastos one in the look height, and that is not taste: the
      // Vastos braid has nothing growing anywhere near it, and this one has a gallery
      // on both banks, so `cameraPullIn` clamped the camera to the first tamarisk and
      // took the view from twenty-five metres out with a crown across a third of it.
      // A focus ten metres up is above anything on this plain and cannot be clamped.
      const braid=WEST_BRAIDS.find(item=>item.id==='eer-north');
      const {sample,spot}=beside(EER_CHANNELS[0],(braid.from+braid.to)/2,58,-1);
      return shot(spot,sample,.22,10);
    }
    // Isareos, the second of the six and the first on the far bank of the Lizeem.
    if(view==='south-isareos'){
      // Across two valleys and the shoulder between them, which is the whole of what
      // this country is: the same modest rise over and over with thorn down in every
      // fold of it and grass to the top of all of them. Looked at from nine metres up
      // for the reason every view out here is — `cameraPullIn` clamps to whatever
      // stands nearest the focus, and a hollow full of blackthorn is exactly that.
      return shot({x:-2560,z:-120},{x:-2610,z:60},.03,9);
    }
    if(view==='south-isareos-river'){
      // The border river from the Isareos bank, with the gallery on it and the hills
      // behind. **Which bank that is, is measured and not assumed**: this course runs the
      // Nethereum line for the whole of its length, so one side of it is a country that
      // is not built and has nothing planted on it, and the first take stood there — a
      // bare slope with the water filling the bottom of the frame and no gallery at all.
      //
      // Taken below the ford rather than on it, because that is where the gallery is
      // thickest and where the river is a river, and from nine metres up for the reason
      // every view out here is: `cameraPullIn` clamps to whatever stands nearest the
      // focus, and a gallery is exactly that.
      // **Just outside the gallery, looking over it**, and that distance is measured
      // rather than chosen: the gallery is planted to `sample.half + 8`, so nothing in
      // it stands more than about fifteen metres off the water, and a camera at
      // twenty-four is behind the last tree with the whole ribbon in front of it. At
      // thirty-four it was *inside* the band a beck's own gallery makes where it comes
      // in, with a willow across half the lens; scoring the bank for clear ground
      // instead only moved it to a stretch that had no gallery to show.
      //
      // Ten metres up for the usual reason, and here for a second one: the subject is
      // a ribbon of trees, and a ribbon reads from above its own height and not from
      // under it.
      // Sixty per cent along, which is between two beck mouths and not on one. The three
      // becks come in at about a fifth, a half and seven tenths of the way down, each
      // trailing a gallery of its own across the bank, and forty-six per cent — chosen
      // for no better reason than being the middle — put the camera inside the middle
      // beck's, ten metres from where it joins.
      const bank=[1,-1].map(side=>beside(ISAREOS_RIVER,.60,24,side))
        .find(({spot})=>world.regionAt(spot.x,spot.z)?.name==='Isareos')
        ??beside(ISAREOS_RIVER,.60,24,-1);
      return shot(bank.spot,bank.sample,.12,10);
    }
    // Nethereum, the third of the six, and the one the atlas took a whole country away from.
    if(view==='south-nethereum'){
      // The dish, across its short axis, which is the only axis it fits on. Standing on the
      // northern shoulder and looking south, the ground falls away over a hundred and twenty
      // metres and does not stop; that fall is the whole of what this country is, and a lake
      // is what used to be at the bottom of it.
      //
      // **Across, and not along.** The long axis is six hundred metres and Nethereum's own
      // fog is .0071 - a shade thicker than the default, which is the lore's "muffled" light
      // and is deliberate - so at two hundred metres there is about a tenth of the light left
      // and the far rim is weather. The short axis is a hundred and twenty and reads.
      //
      // Nine metres up for the reason every landscape view out here is: `cameraPullIn` clamps
      // the camera to whatever stands nearest the focus, and a focus above `heightAt + 7`
      // cannot be clamped against at all. Worked out from the hollow's own numbers rather than
      // typed in, so it follows the dish if the dish ever moves.
      //
      // **And from well above it, which is the third correction and the one that made it a
      // picture.** Taken at .06 of pitch from nine metres up, a fall of seven and a half metres
      // over a hundred and twenty-five is four degrees of sight line and reads as flat green
      // carpet: the dish did not exist in the frame at all. A dish this shallow is only a dish
      // from above it, so the camera goes up to about thirty-five metres - `shot` puts it at
      // `distance * sin(pitch)` over the focus - and looks down at seventeen degrees.
      const H=NETHEREUM_HOLLOW;
      return shot({x:H.x,z:H.z-H.rz*.80},{x:H.x,z:H.z+H.rz*.15},.29,7);
    }
    if(view==='south-nethereum-hollow'){
      // Down on the floor, at a wet thread: where a hill-stream gives its channel up and what
      // runs on across the meadow is a line of rush and sedge in the grass. The subject is
      // knee-high, so the camera is low and near - the opposite of the view above, and the
      // reason there are two of them.
      //
      // **Out on the floor looking back up the thread**, and both halves of that are
      // corrections. The first take stood sixteen metres behind the stream's last sample and
      // photographed the inside of an alder: the gallery follows the water, so the ground
      // behind a stream's mouth is the one place in this country with trees on it. And the
      // thread itself is sown *forward* from there, out across the meadow, so looking back
      // along it puts the rush in the frame with the gallery and the rim behind it.
      const end=NETHEREUM_STREAMS[0].samples.at(-1);
      const to=Math.atan2(NETHEREUM_HOLLOW.x-end.x,NETHEREUM_HOLLOW.z-end.z);
      const along=(d)=>({x:end.x+Math.sin(to)*d,z:end.z+Math.cos(to)*d});
      return shot(along(112),along(34),.11,1.6);
    }
    if(view==='south-neth'){
      // The ford, from the Nethereum bank. **Which bank that is, is measured and not assumed**:
      // the Neth runs the Ovesos line for all of its length below the corner, and Ovesos is not
      // built, so one side of this river has nothing at all on it. Isareos's river view was
      // taken from exactly that empty side the first time it was taken.
      //
      // A fifth of the way along, which is inside the fordable third, and from twenty-two
      // metres out - just beyond the gallery, which is planted to `sample.half + 8` and so
      // stands about fifteen metres off the water.
      const bank=[1,-1].map(side=>beside(NETH,.20,22,side))
        .find(({spot})=>world.regionAt(spot.x,spot.z)?.name==='Nethereum')
        ??beside(NETH,.20,22,-1);
      return shot(bank.spot,bank.sample,.13,6);
    }
    if(view==='south-harrier'){
      // The one animal in this country that is never on the ground. The creature sweep below
      // works the front quarter at head height and would photograph nine metres of empty
      // meadow, so this one is worked out from the bird: settle it to a point of its own turn
      // where it is side on - which is where the wing V shows - stand well off, and aim at
      // where it then is. `look.y` is measured up from the ground under the subject, so for a
      // bird it is the whole of its height.
      let bird=westLife.snapshot().creatures.find(a=>a.species==='harrier');
      if(!bird)return null;
      for(let step=0;step<200;step++){
        westLife.update(1/30,{x:bird.x,z:bird.z},true);
        bird=westLife.snapshot().creatures.find(a=>a.id===bird.id);
        if(Math.abs(Math.sin(bird.yaw))>.96)break;
      }
      const off=bird.yaw+Math.PI/2;
      const from={x:bird.x+Math.sin(off)*30,z:bird.z+Math.cos(off)*30};
      return shot(from,bird,-.08,bird.y-world.heightAt(bird.x,bird.z),false,
        {x:bird.x+Math.sin(off)*34,z:bird.z+Math.cos(off)*34});
    }
    const creature={'west-longhorn':'longhorn','west-hare':'upland-hare','west-sheep':'hill-sheep',
      'west-fox':'river-fox','west-otter':'otter','west-wader':'wading-bird',
      'south-egret':'egret','south-stilt':'stilt','south-duck':'duck','south-boar':'boar',
      'south-gull':'gull','south-dolphin':'dolphin',
      'south-reddeer':'red-deer','south-vulture':'turkey-vulture',
      'south-nethrani':'nethrani-cattle'}[view];
    if(creature){
      let animal=westLife.snapshot().creatures.find(a=>a.species===creature);
      if(!animal)return null;
      /**
       * **A frozen review settles its subject before it takes the shot.** A dolphin is
       * under the water for most of its cycle, and photographed at whatever instant the
       * jump happened to land on it was a dark speck under the surface. So the pod is
       * run on until the one being looked at is up — which is the only moment anybody
       * has ever seen a dolphin in — and the camera is worked out from where it then is.
       * Nothing flees: `tickSea` does not look at the traveler at all.
       */
      if(creature==='dolphin')for(let step=0;step<300&&animal.y<SEA_LEVEL+.34;step++){
        westLife.update(1/30,{x:animal.x,z:animal.z},true);
        animal=westLife.snapshot().creatures.find(a=>a.id===animal.id);
      }
      const close=creature==='longhorn'||creature==='nethrani-cattle'?6:creature==='red-deer'?7:creature==='boar'?5:creature==='hill-sheep'?4.5:
        creature==='wading-bird'||creature==='egret'?4.5:creature==='dolphin'?9:3.2;
      /**
       * **Round to the front quarter of it, and to the side with room.** Sweeping the
       * circle from due north and taking the first standable bearing photographed half
       * these animals from behind, and an egret from the tail is a white lump when the
       * bill and the neck are the whole bird. Dead ahead is no better: nose-on, a boar
       * has no length and no ridge. So the sweep runs over the front quarter on both
       * sides, keeps the bearings there is ground to stand on, and of those takes the
       * one with least between the camera and the animal — the first boar was shot
       * through a gallery trunk that filled a quarter of the frame.
       */
      let from=null;
      if(creature!=='dolphin'){
        const eye={x:animal.x,z:animal.z,y:animal.y+.4};
        let best=Infinity;
        for(let i=0;i<12;i++){
          const a=animal.yaw+(i%2?-1:1)*(.85+Math.floor(i/2)*.26);
          const spot={x:animal.x+Math.sin(a)*close,z:animal.z+Math.cos(a)*close};
          if(!canStand(spot.x,spot.z,world,.4))continue;
          const crowd=cameraCrowding(eye,close,a);
          if(crowd<best){best=crowd;from=spot;}
          if(!crowd)break;
        }
      }
      // A dolphin has no side with ground on it at all. The camera goes out over the
      // water, which is the only place its own shape can be looked at; `south-eer-coast`
      // is the view of one from where a traveler can actually be.
      if(creature==='dolphin')from={x:animal.x+Math.sin(animal.yaw+1.15)*close,z:animal.z+Math.cos(animal.yaw+1.15)*close};
      from=from??{x:animal.x+Math.sin(animal.yaw+.85)*close,z:animal.z+Math.cos(animal.yaw+.85)*close};
      const height=creature==='longhorn'?1.1:creature==='nethrani-cattle'?.85:creature==='red-deer'?1.25:creature==='wading-bird'||creature==='egret'?.9:
        creature==='boar'?.7:creature==='stilt'?.45:creature==='dolphin'?.5:.35;
      /**
       * `look.y` is measured up from the ground under the subject, and for a dolphin
       * the ground is five and a half metres of seabed: the first take aimed the camera
       * at the bottom of the sea and photographed an empty bay. `groundY` is what the
       * animal is actually standing — or floating, or swimming — on, so the offset
       * between the two lifts the aim to where the animal is and is nought for
       * everything that walks.
       */
      const lift=animal.groundY-world.heightAt(animal.x,animal.z);
      // The traveler goes well outside the flee distance of anything here (the widest is
      // the egret's twelve metres), so the bird in the frame is standing and not leaving.
      const back=Math.hypot(from.x-animal.x,from.z-animal.z)||1;
      const stand={x:animal.x+(from.x-animal.x)/back*22,z:animal.z+(from.z-animal.z)/back*22};
      return shot(from,animal,creature==='dolphin'?.22:.07,height+lift,false,
        creature==='dolphin'?{x:animal.x-90,z:animal.z}:stand);
    }
    return null;
  }
  const roadVerges=createRoadVerges(scene,world);
  let acornQuest=createAcornQuest();
  const journey=createJourney({inventory,weapons});
  const campaign=createCampaign();
  // Luscia: the chapter at the Lauvel, Nothom's people, and Smiths on its square.
  const luscia=createLusciaChapter({inventory});
  // The burying at the Lauvel (src/lauvel-burying.js): Sela calls to whoever comes up the road,
  // and the valley is short-handed at every part of putting its dead in the ground.
  const burying=createBurying();let selaVisits=0;
  const riding=createRiding();
  let mountHeading=0,rideCamera=0;
  /**
   * How far back the camera actually gets to stand on a given bearing. Anything solid between it
   * and what it is looking at pulls it in - a wall, a roof, the stable at Bede Harrow's yard.
   * One arithmetic, because a review view that chooses its shot with a different one would
   * choose a shot the camera then refuses to take.
   */
  function cameraPullIn(focus,want,bearing){
    let got=want;
    for(const c of world.nearColliders(focus.x,focus.z,want+4,cameraColliders)){
      const vx=c.x-focus.x,vz=c.z-focus.z,along=vx*Math.sin(bearing)+vz*Math.cos(bearing),across=Math.abs(vx*Math.cos(bearing)-vz*Math.sin(bearing));
      const r=c.r??Math.max(c.hx,c.hz);
      if(along>0&&along<want+2&&across<r+.6&&focus.y<world.heightAt(c.x,c.z)+(c.kind==='house'?6:7))got=Math.min(got,Math.max(3.1,along-r-.6));}
    return got;}
  /**
    * The bearing that lets the camera stand furthest back from `focus`: a shot chosen by
    * measurement rather than by eye. `prefer` breaks a near-tie - within a metre of the best -
    * toward a bearing that was wanted for another reason, because a line that is clear straight
    * down a file of men hides three of them behind the first.
    */
  /**
   * What stands between the camera and what it is looking at on this bearing, whether or not it
   * is tall enough to push the camera in. A roof the camera clears still fills the frame, and
   * the first company-mounted shot was taken from over the stable roof for exactly that reason:
   * the line was the roomiest because nothing on it was tall enough to clamp against.
   */
  function cameraCrowding(focus,want,bearing){
    let count=0;
    for(const c of world.nearColliders(focus.x,focus.z,want+4,cameraColliders)){
      const vx=c.x-focus.x,vz=c.z-focus.z,along=vx*Math.sin(bearing)+vz*Math.cos(bearing),across=Math.abs(vx*Math.cos(bearing)-vz*Math.sin(bearing));
      const r=c.r??Math.max(c.hx,c.hz);
      if(along>0&&along<want+2&&across<r+1.2)count++;}
    return count;}
  /**
   * **A shot is composed, not discovered.** Sweeping the whole circle for room finds lines that
   * are roomy and useless: over the stable roof with the roof filling the corner, or from inside
   * a tree, since foliage is no collider and so nothing measurable is in the way at all. The few
   * bearings that actually frame the subject are written down by hand, and the measurement only
   * chooses between them - the one that stands furthest back with least in front of it.
   */
  function bestOf(focus,want,bearings){
    let best=null;
    for(const bearing of bearings){
      const got=cameraPullIn(focus,want,bearing),crowd=cameraCrowding(focus,want,bearing);
      const score=Math.min(got,want)-crowd*1.5;
      if(!best||score>best.score)best={yaw:bearing,distance:got,crowd,score};}
    return best;}
  function clearestBearing(focus,want,{turns=64,prefer=null}={}){
    const measured=[];
    for(let turn=0;turn<turns;turn++){const bearing=turn/turns*Math.PI*2;
      measured.push({yaw:bearing,distance:cameraPullIn(focus,want,bearing),crowd:cameraCrowding(focus,want,bearing)});}
    // Room first, then an empty foreground, then the bearing that was wanted for its own sake.
    const best=Math.max(...measured.map(one=>one.distance));
    const roomy=measured.filter(one=>one.distance>=best-1);
    const clearest=Math.min(...roomy.map(one=>one.crowd));
    const open=roomy.filter(one=>one.crowd===clearest);
    if(prefer===null)return open[0];
    const off=bearing=>Math.abs(Math.atan2(Math.sin(bearing-prefer),Math.cos(bearing-prefer)));
    return open.reduce((a,b)=>(off(b.yaw)<off(a.yaw)?b:a));}
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
  /**
   * The company's remounts: one per companion, made the first time he needs one, so a game that
   * never reaches Bede Harrow's yard never pays for a single mesh of them. The coat is fixed by
   * the man's id (src/company-horses.js), so it is the same horse every load and nothing about
   * it is saved.
   *
   * Like the traveler's own horse these are plain actors, not people: they have no stand-in and
   * no level of detail, so the file's horses are exempt from the distant peg exactly as the men
   * in the file are.
   */
  const companyHorseActors=new Map();
  function companyHorseFor(id){
    let horse=companyHorseActors.get(id);
    if(!horse){horse=createHorse({coat:coatFor(id),saddled:true});horse.group.visible=false;scene.add(horse.group);companyHorseActors.set(id,horse);}
    return horse;}
  /**
   * Under each man who is up, and picketed beside the traveler's own horse for each man who is
   * not. The picket is a straight line off one side of his horse, derived from `riding.horse` -
   * which is already saved - so nothing here is written down and a reload puts every horse back
   * where it was. A line, never a ring: ten picketed horses cannot pen anybody in.
   */
  /** What he is seen holding follows what he is wearing: the hand slot is the shield. */
  // Not `setShield?.()`: the optional call hid the fact that the facade above had no such verb
  // at all, so the buckler was quietly never built and four renders showed a man with no shield.
  // If it ever goes missing again it should throw.
  /**
   * Where the buckler actually is and which way it actually points, **as drawn**, in the
   * traveler's own frame: +z is in front of him, -x is his shield side, y is height off his
   * feet. Held up it should read about (-.16, 1.31, .36) facing .81 forward; at his side, about
   * (-.37, .84, .09) facing flat out.
   *
   * This exists because `up: true` was reported beside a hip-height shield for two commits. A
   * flag says what the rules decided; these say what the player is looking at.
   */
  function bucklerDrawn(){
    const node=player.group.getObjectByName(BUCKLER_NAME);
    if(!node||!node.visible)return null;
    player.group.updateMatrixWorld(true);
    const axis=new THREE.Vector3(0,1,0),turn=-player.group.rotation.y;
    const at=node.getWorldPosition(new THREE.Vector3()).sub(player.group.position).applyAxisAngle(axis,turn);
    const face=axis.clone().applyQuaternion(node.getWorldQuaternion(new THREE.Quaternion())).normalize().applyAxisAngle(axis,turn);
    const round=v=>[+v.x.toFixed(2),+v.y.toFixed(2),+v.z.toFixed(2)];
    return {at:round(at),face:round(face)};
  }
  /**
   * An eased pose cannot be shown in a frozen review: `damping` is `1 - exp(-rate * dt)` and a
   * frozen view stops `walkTime`, so dt is 0, `rotate` moves nothing, and the body keeps whatever
   * it was doing. Run the animator forward by hand first; the frozen frames afterwards then hold
   * exactly this.
   */
  function settlePose(pose,frames=48){
    for(let step=0;step<frames;step++)player.animate(walkTime+step/60,0,true,pose);
  }
  function refreshShield(){
    // A shield lent for a bout is on his arm and is drawn, and is his for exactly as long as the
    // bout lasts. This runs every frame, so it has to know about the loan or the borrowed boards
    // would be taken off him again a sixtieth of a second after he was handed them.
    const carried=!!lent?.shield||!!gear.wearing('hand');
    player.setShield(carried);
    // The footer says which key only while there is a shield on the arm to use it with. A
    // one-time toast at the smithy is not enough for something held in every fight.
    document.body.classList.toggle('shielded',carried);
  }
  /**
   * **The horses first, and the file yields to them.**
   *
   * A picketed horse's place is a function of the traveler's own horse, which the save carries;
   * a man's place is recomputed every frame from where the traveler is standing. So the horses
   * are laid first, and this hands the file the bodies it must not be given - the traveler's own
   * bay and every horse on the picket line - the same way `fileTaken` makes one man's ground not
   * ground for the next. Before it, the two layouts were blind to each other and a man on foot
   * was put inside a horse (three of forty-eight facings at Bede Harrow's yard, and Chris 0.32 m
   * inside the traveler's own bay in the picket review).
   *
   * **Computed, not stashed.** Both callers work it out from `riding` and the file, so the two
   * halves of a frame cannot fall out of step and no snapping path - `settleMercenaries`, a load,
   * a story start, a review view - can run one without the other.
   *
   * A *ridden* horse is no obstacle: its man is already a body, at a rider's own footprint.
   */
  function companyHorseGround(){
    const rule=companyHorses({owned:riding.owned,mounted:riding.mounted,
      walking:fileOrder.filter(id=>npcById.get(id)?.walkingWith)});
    const picket=picketSpots(riding.horse,rule.ids,(x,z)=>canStand(x,z,world,RIDE.radius));
    // A man is not inside a horse when his body and its body do not overlap.
    const room=BODY.horse+BODY.person,bodies=[];
    if(riding.owned&&riding.horse&&!riding.mounted)bodies.push({x:riding.horse.x,z:riding.horse.z,room});
    for(const [index,id] of rule.ids.entries()){
      const npc=npcById.get(id),spot=picket[index];
      if(!spot||(npc?.mounted&&npc.actor.group.visible))continue;
      bodies.push({x:spot.x,z:spot.z,room});}
    return {rule,picket,bodies};}
  function refreshCompanyHorses(){
    const {rule,picket}=companyHorseGround();
    const here=new Set(rule.ids);
    for(const [index,id] of rule.ids.entries()){
      const npc=npcById.get(id),actor=companyHorseFor(id);
      if(npc?.mounted&&npc.actor.group.visible){
        const at=npc.actor.group.position,turn=npc.actor.group.rotation.y;
        const hx=at.x-Math.sin(turn)*RIDE.seat.forward,hz=at.z-Math.cos(turn)*RIDE.seat.forward;
        actor.group.position.set(hx,world.heightAt(hx,hz),hz);actor.group.rotation.y=turn;
        actor.group.visible=true;actor.ridden=true;actor.animate(elapsed,npc.shownPace??0,true,{grazing:false});
        continue;}
      const spot=picket[index];
      actor.ridden=false;
      if(!spot){actor.group.visible=false;continue;}
      actor.group.position.set(spot.x,world.heightAt(spot.x,spot.z),spot.z);actor.group.rotation.y=spot.yaw;
      actor.group.visible=Math.hypot(spot.x-player.group.position.x,spot.z-player.group.position.z)<220;
      if(actor.group.visible)actor.animate(elapsed,0,true,{});}
    for(const [id,actor] of companyHorseActors)if(!here.has(id)){actor.group.visible=false;actor.ridden=false;}}
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
    // A companion in the saddle is a rider's footprint, the same as the traveler's is.
    for(const npc of npcData){if(npc.hidden||npc.fallen||!npc.actor.group.visible)continue;const p=npc.actor.group.position;list.push({id:npc.id,x:p.x,z:p.z,r:npc.mounted?RIDE.radius:npc.cat?BODY.cat:npc.dog?BODY.dog:npc.horse?BODY.horse:npc.ogre?BODY.ogre:BODY.person});}
    if(troupeWagon.visible)list.push(...troupe.bodies());
    for(const [i,h] of horseLine.entries())if(h.actor.group.visible)list.push({id:`line-horse-${i}`,x:h.actor.group.position.x,z:h.actor.group.position.z,r:BODY.horse});
    if(ownHorse.group.visible&&!riding.mounted)list.push({id:'own-horse',x:ownHorse.group.position.x,z:ownHorse.group.position.z,r:BODY.horse});
    // A picketed horse is solid like the traveler's own. A ridden one is not: its man already is.
    for(const [id,horse] of companyHorseActors)if(horse.group.visible&&!horse.ridden)
      list.push({id:`company-horse-${id}`,x:horse.group.position.x,z:horse.group.position.z,r:BODY.horse});
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
  /**
   * A row takes one press. Bare, it is sown with the best crop the level opens; ripe, it is
   * reaped; sown and growing, it says how long and nothing else, because the whole lesson is
   * that you go away and come back.
   */
  function workRow(){
    if(!currentRow)return;
    if(!farming.met){toast('Four drilled rows and nothing in them. Enna keeps the commons mill a few steps west; she will show you how a row goes in.','THE COMMONS ROWS');return;}
    if(currentRow.stage==='ripe'){const got=farming.reap(currentRow.id,playSeconds);if(!got.ok)toast(got.reason,'THE COMMONS ROWS');return;}
    if(currentRow.stage==='sown'){toast(`${currentRow.cropName} again in about ${Math.ceil(currentRow.left)} seconds. Go and do something else; it grows either way.`,'THE COMMONS ROWS');return;}
    const seeds=farming.sowable(currentRow.id);
    if(!seeds.length){toast('Nothing you know how to put in yet.','THE COMMONS ROWS');return;}
    const sown=farming.sow(currentRow.id,seeds.at(-1).id,playSeconds);
    if(!sown.ok)toast(sown.reason,'THE COMMONS ROWS');
  }
  function gatherStone(){
    if(!currentStone)return;
    if(!geology.met){toast('A stone that catches the eye. Silas Garrow, at the Toll House stream on the Caloss road, could tell you what it is.','A STONE');return;}
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
    if(!botany.met){toast('A tree worth looking at, and no name for it. Nell Harrow, at the Sunken Lane, has a name for every tree in this wood.','A TREE');return;}
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
    if(!botany.met){toast('A plant, and no name for it. Nell Harrow, at the Sunken Lane, has a name for everything here.','SOMETHING GROWING');return;}
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
    if(!mycology.met){toast('An unfamiliar mushroom. Odger Pell, at Fernway Rest where the paths meet, would name it for you.','A MUSHROOM');return;}
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
  // The skills sheet in the journal, RuneScape's way: a grid of the skills of the world, three to a
  // row, with the total level filling what the last of them leaves of the bottom row, and behind each
  // tile that skill's own guide and the collection log that belongs to it. Thirteen of them in normal
  // mode and the seven Arms under their own heading; the Linguist is hard mode's (src/game-mode.js).
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
    // The skills of the world first, then each heading's own block. The seven that are about
    // fighting sit under 'Arms'; everything else is ungrouped and comes first, exactly as it did
    // when there were only thirteen.
    const grid=skillEl('div','skill-grid');
    let ungrouped=0;
    for(const skill of view)if(!SKILLS[skill.id]?.group){grid.append(skillTile(skill));ungrouped++;}
    const total=skillEl('div','skill-tile skill-tile-total'),learned=view.filter(skill=>skill.learned).length;
    // It fills out the bottom row whatever that row has in it: one cell after fourteen ungrouped
    // skills, two after the thirteen normal mode shows, so the grid never ends in a hole.
    total.style.gridColumn=`span ${((3-ungrouped%3)%3)||1}`;
    total.append(skillEl('b','','Total level'),skillEl('span','skill-tile-level',String(shownTotalLevel())),
      skillEl('span','skill-tip',`Total level: ${shownTotalLevel()} · Skills learned: ${learned} / ${view.length}`));
    grid.append(total);sheet.append(grid);
    const headings=[];
    for(const skill of view){const group=SKILLS[skill.id]?.group;if(group&&!headings.includes(group))headings.push(group);}
    for(const heading of headings){
      sheet.append(skillEl('h3','skill-heading',heading));
      const block=skillEl('div','skill-grid');
      for(const skill of view)if(SKILLS[skill.id]?.group===heading)block.append(skillTile(skill));
      sheet.append(block);
    }
  }
  // One skill's page: what each of its levels opens, and everything that skill has collected.
  function renderSkillGuide(sheet,skill){
    const card=skillEl('section','skill-card');
    const back=skillEl('button','skill-back','‹ All skills');back.type='button';back.onclick=()=>{openSkillId=null;refreshSkillsSheet();};
    const head=skillEl('header','skill-detail-head'),titles=skillEl('div');
    titles.append(skillEl('span','eyebrow',`LEVEL ${skill.level} / ${skill.top}`),skillEl('h3','',skill.name));
    head.append(skillMark(skill),titles);card.append(back,head);
    if(skill.learned)card.append(skillProgressBar(skill.progress),skillEl('p','skill-xp',skill.max?`${skill.xp} experience · the highest level`:`${skill.xp} / ${skill.next} experience to level ${skill.level+1}`));
    card.append(skillEl('p','',skill.blurb));
    // Nobody is locked out of a skill any more, so the teacher is an offer rather than a gate:
    // named while the traveler has never done the thing, and out of the way once he has.
    if(!skill.xp)card.append(skillEl('p','skill-teacher',`Nobody has shown you yet. ${skill.teacher} can.`));
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
  /**
   * The skills this game shows. The registry in src/skills.js holds every skill in the build, so a
   * save that carries linguist experience still validates and keeps it; what comes out here is
   * whatever belongs to a mode this game is not being played in (src/game-mode.js).
   */
  function shownSkills(){return skills.view().filter(entry=>!hiddenSkills.has(entry.id));}
  /** RuneScape's total level, over the skills this mode shows. */
  function shownTotalLevel(){return shownSkills().reduce((sum,entry)=>sum+(entry.learned?entry.level:0),0);}
  function refreshSkillsSheet(){
    const sheet=$('skills-sheet');sheet.replaceChildren();
    const view=shownSkills(),open=openSkillId?view.find(entry=>entry.id===openSkillId):null;
    if(open)renderSkillGuide(sheet,open);else renderSkillGrid(sheet,view);
  }
  /** The journal, on the Skills tab, on one skill's guide: where a level-up banner sends you. */
  function openSkillGuide(id){
    if(!id||!Object.hasOwn(SKILLS,id)||hiddenSkills.has(id)||!['playing','journal','pause'].includes(mode))return false;
    clearTimeout(levelUpTimer);$('level-up').classList.remove('visible','flash');
    modal('journal');journalTab('skills');openSkillId=id;refreshSkillsSheet();return true;
  }
  /**
   * Buying a piece of armour. The action carries the piece itself - slot, weight and tier - so
   * the host never keeps a copy of the smith's stock that could drift from `smithStock`.
   */
  function smithAct(action){
    if(!action.startsWith('smith-buy:'))return {ok:false,reason:''};
    const [,seller,slot,weight,tier]=action.split(':');
    const level=regionLevel(world.regionAt(player.group.position.x,player.group.position.z)?.name)??0;
    // The board is **the seller's**, not the street's: a capital's armourer sells above his
    // country and every other smith sells what his country allows (SELLER_TIERS, src/smith.js).
    // The host rebuilds it from the man and the ground rather than trusting the action string.
    const board=smithOffers(level,{id:seller});
    // **Arrows, at every forge** (the user, 2026-09-21: the smiths sell them and there is no
    // fletcher). The same atomic buy, and the same rule that the host looks the line up in
    // today's board rather than trusting the action string.
    if(slot==='arrows'){
      const shafts=board.find(one=>one.kind==='arrows');
      const bought=buyFromSmith({inventory,gear,item:shafts});
      if(!bought.ok){toast(bought.reason,'THE SMITHY');return bought;}
      inventory.refresh();refreshQuiver();audio?.effect('success');
      toast(`${bought.arrows} arrows · ${bought.price} copper. You have ${bought.quiver}.${inventory.has(BOW.id)?' Hold the attack button to draw and let go to loose.':' You have nothing to shoot them out of yet.'}`,'THE SMITHY');
      saveRoad(false);return bought;}
    // Only ever what he actually has today: an action naming anything else buys nothing.
    const item=board.find(one=>one.kind==='armour'&&one.slot===slot&&one.weight===weight&&one.tier===Number(tier));
    const bought=buyFromSmith({inventory,gear,item});
    if(!bought.ok){toast(bought.reason,'THE SMITHY');return bought;}
    inventory.refresh();audio?.effect('success');
    const swapped=bought.had?` He takes the old ${pieceName({slot,...bought.had}).toLowerCase()} off your hands.`:'';
    // The shield is the one piece with a verb attached, so it is the one piece that says so.
    if(slot==='hand')toast(`A shield on your arm. Hold V and it is between you and the blow · it catches most of a strike from the front, and costs you wind.`,'THE SMITHY');
    toast(`${pieceName(item)} \u00b7 ${bought.price} copper. It turns ${Math.round(bought.turns*100)} in a hundred off a blow.${swapped}`,'THE SMITHY');
    saveRoad(false);return bought;}
  function ridingAct(action){
    const hitch=LUMBER_TOWN_STABLE.hitch;
    if(action==='fetch-horse'){riding.place(hitch,hitch.yaw);placeOwnHorse();toast('A stable boy goes out with a halter. Your horse is back in the yard.','NOTHOM · THE STABLE YARD');saveRoad(false);return {ok:true};}
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
  let currentFoundWeapon=null;
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
    // The long way round: a block under the chapter's steps, never a step of them. Walking the
    // whole of Drent closes none of the five above it and skipping it leaves none of them open.
    {const way=current?.longWay??null;
      show('chapter-long-way',!!way);
      if(way){
        $('chapter-long-way-title').textContent=way.title;
        $('chapter-long-way-detail').textContent=way.detail;
        const legs=$('chapter-long-way-legs');legs.replaceChildren();
        const walked=longRoad.view(longRoadWorld());
        way.legs.forEach((text,i)=>{const li=document.createElement('li');
          const leg=walked.legs[i];li.className=leg?.done?'done':i===walked.next?.leg?'current':'';
          li.textContent=`${leg?.done?'\u2713 ':''}${text}`;legs.append(li);});}}
    // A chapter closing is worth a word, once.
    const reached=current?current.number:chapterCount+1;
    if(chapterShown&&reached>chapterShown){
      const closed=progress.done.at(-1);
      if(closed)toast(chapterTitle(closed,state),`CHAPTER ${closed.number} COMPLETE · J FOR THE JOURNAL`);
    }
    chapterShown=reached;
  }
  function refreshQuest() {
    if(questStage===QUEST_DONE){
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
    // Three subquests, and a title can span two steps (SUBQUESTS): walking up the pier to Jojo
    // and speaking to her are one errand, so the card says 1 of 3 for both.
    const sub=SUBQUESTS.findIndex(entry=>questStage>=entry.from&&questStage<=entry.to);
    $('quest-step').textContent=`CHAPTER 1 · ${sub+1} / ${SUBQUESTS.length}`;
  }
  function updateQuest(event) {
    const previous=questStage;questStage=advanceQuest(questStage,event);
    if(previous===questStage)return;
    if(questStage===2){inventory.grant('harbor-letter');combat.startPractice(world.training);releaseLandingMate();}
    if(previous===2&&questStage===3){combat.finishPractice();audio?.effect('success');
      // **He acknowledges it on the spot, and the chart comes with the acknowledgment.** The
      // straw post is two metres from where he is standing, so the lesson ends where it was
      // set rather than leaving the traveler to remember to go back for the map.
      const glun=npcById.get(INSTRUCTOR.id);
      if(glun&&lessonSet&&!cartography.met)instructorConversation(glun,{stage:'done',openDialogue,finish:giveTheChart});}
    refreshQuest();
    if(questStage===2)toast('the letter of introduction','ADDED TO SATCHEL · I TO OPEN');
    // The fork is told the moment the road is his, because there is no watch post left on the way
    // to tell him at: the tutorial now ends at the practice post (src/long-road.js).
    else if(questStage===QUEST_DONE){longRoad.act('told');toast(questSteps[questStage].title,'YOUR ORDERS · WEST TO NOTHOM');}
    else toast(questSteps[questStage].title,'JOURNAL UPDATED');
    if(questStage>=1&&!testingEnabled)saveRoad(false);
  }
  // The opening screen's other way in: stand where the newest built chapter begins, with the road behind you.
  // Nothing is saved from this start, so a saved adventure is never overwritten (src/story-starts.js).
  function beginNewestChapter(){return beginStoryStart(newestStart());}
  function beginStoryStart(entry){
    const stand=entry&&world.npcPositions[entry.beside];
    if(!entry||!stand||!['opening','playing','pause','journal','testing'].includes(mode))return false;
    campaign.restore(createCampaign().snapshot());for(const id of entry.completed)campaign.completeChapter(id);
    // Everything before the start happened, including the report for duty in Nothom:
    // without it the chapter count stays on Chapter 1 however well Chapter 2 is played.
    if(entry.completed.includes('luscia-aftermath')){const done=luscia.snapshot();luscia.restore({version:done.version,revision:5,started:true,briefed:true,satchelTaken:true,wolvesCleared:true,returned:true});}
    if(entry.completed.includes('moros-camp')){const done=moros.snapshot();moros.restore({version:done.version,revision:4,started:true,admitted:true,mustered:true,horseClaimed:true});}
    questStage=QUEST_DONE;practiceHits=2;practiceDodges=1;lessonSet=true;cartography.learn();testingEnabled=true;meadowCleared=true;
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
    playSeconds=0;refugeeHold=0;landingSaid=null;companionOffTheClock=true;
    // **Nobody walks with you until you ask.** (The user, 22 September 2026: they should never
    // follow without being asked first.) The long road made the man off your boat a companion
    // from the first frame, so he was a step behind the traveler before a word had been said to
    // him. He now begins released - on his own clock, walking the road to the muster like the
    // other ten - and the choice he already offers, "Walk Drent with me.", is how he is asked.
    longRoad.act('release',{at:0,distance:0});
    rebuildCompany();settleMercenaries();mercenaryWeapons.clear();
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
    // He never walked you up the pier (LANDING_ESCORT) and was never at your shoulder, so there
    // is nothing to say goodbye about and no overrun to give back to his clock.
    if(longRoad.released)return;
    const mateId=landingMateId(),mate=npcById.get(mateId);
    const entry=roster.find(man=>man.id===mateId);
    const overrun=entry&&!companionOffTheClock?Math.max(0,playSeconds-entry.arrival-entry.departs):0;
    if(overrun>0){
      roster=roster.map(man=>man.id===mateId?Object.freeze({...man,arrival:man.arrival+overrun}):man);
      rebuildCompany();
    }
    if(!mate)return;
    mate.escorting=false;mate.pace=undefined;
    rebuildCompany();
    toast(companionOffTheClock?'I am not going up that road ahead of you. Wherever you go in this country I am a step behind you, and I will tell you what they said.'
      :'I will give the village a look and come up the road after you. No sense the two of us crowding one quartermaster.',`${mate.name.toUpperCase()} \u00b7 ON THE LANDING`);
  }
  /**
   * The two places the road takes him off you without your saying anything. The muster ground:
   * he musters a step behind you, which is what being last of eleven means. And the Caloss
   * bridge once the last boat is in, because somebody has to tell Venmor the eleventh is on the
   * road or he will post you missing (docs/drent-long-road.md \u00a73). The third way is your word,
   * and that is a choice in his conversation.
   */
  function watchCompanion(){
    if(!companionOffTheClock||longRoad.released||mode!=='playing')return;
    const p=player.group.position;
    if(Math.hypot(p.x-ROUTE_ANCHORS.legionCamp.x,p.z-ROUTE_ANCHORS.legionCamp.z)<70){
      releaseCompanion(company.musterDistance,'That is the eleventh of us in, and I am the tenth. Go and let them write you down.');return;}
    const bridge=world.npcPositions['crossing-keeper'];
    if(bridge&&playSeconds>=ARRIVALS.princes&&Math.hypot(p.x-bridge.x,p.z-bridge.z)<25)
      releaseCompanion(distanceAlongRoad(world.paths[0],{x:p.x,z:p.z}),'The princes\u2019 boat is in, so that is all of us landed. Somebody has to tell Venmor the eleventh is on the road, or he will post you missing. I will go ahead.');}
  /** Any start that is not the boat: the harbour as built, the traveler on their feet. */
  function leaveOpening(){opening=null;world.restArrivalBoat();player.group.visible=true;document.body.classList.remove('cutscene');show('cutscene',false);}
  function stopInput(){keys.clear();drag=false;swingHeld=false;}
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
    inventory.open({lesson:false});$('inventory-button').setAttribute('aria-expanded','true');
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
  /**
   * Where a man is, in the journal's words rather than the clock's. A companion is wherever the
   * traveler is, which is the one thing no phase can say, so it is asked first.
   */
  function whereHeStands(id,placement){
    if(fallen.has(id))return null;
    if(companions.walksWith(id))return 'Walking with you';
    const phase=placement?.phase;
    if(phase==='coming')return 'Not yet ashore';
    if(phase==='landing')return mercenaryById(id)?.route==='shore'?'On the strand, getting his breath':'At the landing';
    if(phase==='stopped')return 'Stopped on the road';
    if(phase==='walking')return mercenaryById(id)?.route==='wild'?'Somewhere off the road':'On the road';
    if(phase==='mustered')return 'At the muster';
    if(phase==='with-traveler')return 'Walking with you';
    return 'Somewhere on the road';}
  /**
   * The company, a line a man: where he is, how well he knows you, and the dead named as dead
   * rather than quietly missing. It reads `fallen`, which is the same list the world keeps its
   * own dead in, so a man cannot be alive on this page and dead anywhere else.
   */
  function refreshCompanyPage(){
    const list=$('company-list');if(!list)return;
    const placements=new Map(company.placements(playSeconds).map(p=>[p.id,p]));
    const seen=companions.view();
    list.replaceChildren();
    for(const man of seen){
      const li=document.createElement('li');
      const where=whereHeStands(man.id,placements.get(man.id));
      const name=document.createElement('b');name.textContent=man.name;li.append(name);
      const said=document.createElement('span');
      if(man.dead){
        const fell=man.fell?.where?` · fell in ${man.fell.where}`:'';
        const what=man.fell?.what?` · ${man.fell.what}`:'';
        li.classList.add('company-dead');
        said.textContent=` — Dead${fell}${what}. He will not be at the muster.`;
      }else said.textContent=` — ${where} · ${man.label}`;
      li.append(said);list.append(li);}
    const walking=seen.filter(man=>man.walking).length,gone=seen.filter(man=>man.dead).length;
    $('company-note').textContent=`${walking===0?'Nobody walks with you':walking===1?'One walks with you':`${walking} walk with you`}`
      +`${gone?` · ${gone} ${gone===1?'is':'are'} dead`:''} · ${seen.length+1-gone} of eleven still coming to the muster.`;}
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
  // **No chart, no map tab** (the user, 22 September 2026: you start with no map). Until Glun
  // hands one over there is nothing to open, so the tab is not offered and M does not answer.
  function mapTab(map){journalTab(map&&cartography.met?'world':'journey');}
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
    if(discoveries.has('pond')||inventory.has('fishing-rod'))knownNPCs.add('pond-fisher');
    if(forest.workAccepted||forest.bundleRecovered)knownNPCs.add('forest-woodcutter');
    if(hideout.inspected)knownNPCs.add('garrison-captain');
    if(acornQuest.status!=='available')knownNPCs.add('acorn-cook');
    if(katy.stage!=='unmet')knownNPCs.add(KATY.id);
    if(vineyard.met)knownNPCs.add(IMANI.id);
    if(light.met)knownNPCs.add(ADDISON.id);
    if(heist.spoke)knownNPCs.add(SUBTRACTIDAUGHTER.id);
    if(heardDoom)knownNPCs.add('doomsayer');
    if(questStage===QUEST_DONE)for(const id of journey.view().destinationIds)if(world.npcPositions[id])knownNPCs.add(id);
    for(const npc of JOURNEY_NPCS){const home=world.npcPositions[npc.id];if(discoveries.has(({2:'sunmeadow',3:'reedwater',4:'threefold'})[world.regionAt(home.x,home.z)?.id]))knownNPCs.add(npc.id);}
    const knownLocations=npcData.filter(npc=>knownNPCs.has(npc.id)).map(npc=>({id:npc.id,name:npc.name,description:npc.role,x:npc.actor.group.position.x,z:npc.actor.group.position.z}));
    for(const site of REGIONAL_LIFE_SITES)if(knownIds.has(site.id)&&!world.landmarks.some(place=>place.id===site.id))knownLocations.push({...site,description:site.note||site.prompt});
    return {knownIds,knownLocations};
  }
  function localMapModel(regionId){
    const known=localMapKnown();
    // The watched bird rides along on the sheet as it was when he opened the journal, which is what a note is.
    return {...buildLocalMapModel({world,position:player.group.position,heading:Math.PI-player.group.rotation.y,discoveries,...known,goal:destination(),openGoal:longWayTarget(),regionId,trackedId:trackedPlaceId}),bird:birdWatch};
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
  /**
   * **How many of the company stand in this camp**, which is now simply what the company says.
   *
   * It used to be a correction: `summary().mustered` counted a phase, the company's clock knew
   * nothing about the dead, and a man struck off the walking list went back onto the road
   * schedule and mustered on it - so the Marshal said one more stood in front of him than did,
   * for every man who had died, while living men were still on the road. The company is told who
   * is gone now (`dead`, src/mercenaries.js), a dead man has no placement at all, and the host
   * asks rather than subtracts.
   */
  function musteredInCamp(){return company.summary(playSeconds).mustered;}
  // Where the traveler stands in the hired company: who has landed, who has mustered, and the traveler's place on the road.
  function companyStanding(){
    const s=company.summary(playSeconds),rank=company.travelerRank(playSeconds,distanceAlongRoad(world.paths[0],{x:player.group.position.x,z:player.group.position.z}));
    const ordinal=n=>n+(n%100>=11&&n%100<=13?'th':['th','st','nd','rd'][n%10]||'th');
    return ` · the company: ${s.arrived} of ${s.total} landed, ${musteredInCamp()} at the muster, you stand ${ordinal(rank)} on the road`;
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
    refreshCompanyPage();
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
    if(questStage===QUEST_DONE){const next=journey.view();$('journal-quest-title').textContent=next.title;$('journal-quest-detail').textContent=next.detail;}
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
      // A refusal here was a silent no-op and the wolves simply never came, which is the one
      // shape of failure a player cannot tell from nothing happening.
      else toast('Something is wrong with the ground here and the wolves do not come. Step back onto the road and try again.','THE LAUVEL');
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
  /**
   * **The fine steel your side owes you for the border** (`SIDE_GIFTS`, src/aftermath-chapter.js;
   * the gear table's tier 4 is "officers, and gifts from a side you have served").
   *
   * **Two pieces, at the two moments the side has you in front of it.** The coat comes at the
   * rally, from the captain who is about to give you the next piece of work, before he gives it.
   * The cap comes at the debrief, **from whoever is counting out the pay** (the user, 2026-09-21:
   * "a second gift ... when the traveler's side pays him after the day-after fight, from whoever
   * already pays him in that scene"), which is the chapter's `principalId` and is not always the
   * same man. One table, one rule, and the stage picks both the piece and the speaker.
   *
   * **Nothing new is saved.** Nothing else in the game makes tier-4 armour, no smith sells above
   * steel, and nothing anywhere takes a piece off again — so the fine steel on him *is* the
   * record that it was given, and it is already in the gear snapshot. `giftOwed` asks what he is
   * wearing on that place, so a second walk up to the same man says nothing more about it.
   */
  function giveSideGift(npc){
    const chapter=aftermath.spec;
    if(!chapter)return [];
    const stage=aftermath.view().stage;
    const speaker=stage==='rally'?chapter.commanderId:stage==='report'?chapter.principalId:null;
    if(!speaker||npc.id!==speaker)return [];
    const gift=SIDE_GIFTS[stage],lines=stage==='rally'?GIFT_LINES[speaker]:CAP_LINES[speaker];
    if(!gift||!lines||!giftOwed(gift,gear.wearing(gift.slot)))return [];
    const had=gear.wearing(gift.slot);
    const worn=gear.wear(gift.slot,{weight:gift.weight,tier:gift.tier});
    if(!worn.ok)return [];
    audio?.effect('success');
    toast(`${pieceName(gift)} · given, not sold. It turns ${Math.round(worn.turns*100)} in a hundred off a blow.`
      +`${had?` He takes the old ${pieceName({slot:gift.slot,...had}).toLowerCase()} off your hands.`:''}`,
      chapter.side==='empire'?'THE ARMY ARMS YOU IN FINE STEEL':'THE REPUBLIC ARMS YOU IN FINE STEEL');
    saveRoad(false);
    return [...lines];
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
      // **The line is laid for the company that is actually there**, counted now and kept nowhere
      // (`borderLine`, src/border-chapter.js). Sounding the advance again counts again.
      if(!combat.startEncounter(borderEncounter(side,borderAllies(side),companyWalking()))){border.endEncounter(BORDER_ENCOUNTER_ID);toast('The line is not ready. Stand with your commander south-west of the stockade.','THE BORDER');return {ok:false,reason:'The encounter could not start.'};}
      stopInput();toast(side==='empire'?'The Coalition comes on in three waves. Hold your corner of the field.':'The army comes on in three waves. Hold your corner of the field.','THE BORDER BATTLE');audio?.effect('bell');
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
    // First of eleven. Venmor remembers who came first, and it is the one thing the short road
    // has that the long road cannot get (docs/drent-long-road.md §9). Once, and a little trust.
    if(action==='join-muster'&&musteredInCamp()+1<=MUSTER_EARLY&&campaign.earlyMuster().first)
      toast('You are the first of the eleven into this camp, and the Marshal has noticed. The pegs behind the standard are still empty.','THE ARMY REMEMBERS EARLY MEN');
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
    if(questStage<1||combat.state.phase==='active'||combat.state.player.hp<=0||inWater){if(notify)toast('Step ashore and finish any active fight before saving.','CHECKPOINT');return false;}
    if(questStage===QUEST_DONE)journey.start();
    const gathered=woodlandLife.state();
    const woodland={version:1,acornStatus:acornQuest.status,lessonSet,practiceHits:Math.min(2,practiceHits),practiceDodges:Math.min(1,practiceDodges),
      acorns:gathered.acorns.filter(s=>s.collected).map(s=>s.id),sticks:gathered.sticks.filter(s=>s.collected).map(s=>s.id),
      fruits:gathered.fruits.filter(s=>s.collected).map(s=>s.id),discoveries:[...discoveries],camp:campcraft.checkpoint()};
    const result=checkpoint.save({version:1,worldScale:METRES_PER_HEX,mode:gameMode.snapshot(),player:playerId,questStage,journey:journey.snapshot(),inventory:inventory.items().map(id=>({id,quantity:inventory.count(id)})),weapons:weapons.snapshot(),journeyGathered:[...journeyGathered],meadowCleared,position:{x:player.group.position.x,z:player.group.position.z},heardDoom,health:combat.state.player.hp,lysaComplete:acornQuest.status==='complete',woodland,forestStory:forestStory.snapshot(),forestHideout:forestHideout.snapshot(),regionalLife:regionalLife.snapshot(),campaign:campaign.snapshot(),luscia:luscia.snapshot(),burying:burying.snapshot(),mapTutorial:mapTutorial.snapshot(),playSeconds,mercenaryWeapons:Object.fromEntries(mercenaryWeapons),moros:moros.snapshot(),border:border.snapshot(),aftermath:aftermath.snapshot(),riding:riding.snapshot(),skills:skills.snapshot(),birding:birding.snapshot(),lakota:lakota.snapshot(),swimming:swimming.snapshot(),companions:companions.snapshot(),teachers:teachers.snapshot(),gear:gear.snapshot(),fishing:fishing.snapshot(),mycology:mycology.snapshot(),mushrooms:mushrooms.state().sites.filter(site=>site.gathered).map(site=>site.id),botany:botany.snapshot(),pipe:pipe.snapshot(),jimson:jimson.snapshot(),katy:katy.snapshot(),troy:troy.snapshot(),vineyard:vineyard.snapshot(),hunt:hunt.snapshot(),light:light.snapshot(),bosco:bosco.snapshot(),heist:heist.snapshot(),refugees:refugees.snapshot(),fallen:fallen.snapshot(),geology:geology.snapshot(),archaeology:archaeology.snapshot(),wine:wine.snapshot(),cooking:cooking.snapshot(),wineAttic:wineAttic.snapshot(),puck:puck.snapshot(),chameleon:chameleon.snapshot(),troupe:troupe.snapshot(),brandy:brandy.snapshot(),salt:salt.snapshot(),woodcutting:wood.snapshot(),construction:building.snapshot(),oldTree:oldTree.snapshot(),stones:stones.state().sites.filter(site=>site.gathered).map(site=>site.id),plants:flora.state().sites.filter(site=>site.gathered).map(site=>site.id),chart:mapFog.snapshot(),cartography:cartography.snapshot(),ferry:ferry.snapshot(),renaLetters:renaLetters.snapshot(),ogreToll:ogreToll.snapshot(),linguist:linguist.snapshot(),longRoad:longRoad.snapshot(),farming:farming.snapshot()});
    if(result.ok){checkpointFailureShown=false;checkpointAvailable=result;$('road-checkpoint-status').textContent='Adventure saved. Continue from the opening screen next time.';if(notify)toast('Your lessons, woodland discoveries, satchel, and weapon condition are saved.','ADVENTURE SAVED');}
    else{$('road-checkpoint-status').textContent=result.reason;if(notify||!checkpointFailureShown)toast(result.reason,'CHECKPOINT');checkpointFailureShown=true;}
    return result.ok;
  }
  function continueRoad(){
    const result=checkpoint.read();if(!result.ok||!result.data){toast(result.reason||'No road checkpoint has been saved yet.','CHECKPOINT');return false;}
    const saved=result.data;
    // **Nothing borrowed survives a reload.** A bout cannot be saved in the first place -
    // `saveRoad` refuses while a fight is on - so no checkpoint carries a loan; this is here so
    // that loading one *during* a bout cannot leave a man holding somebody else's pike.
    sparring=null;endMark(null);returnLoan();clearArrows();
    // `saved.mode` is not restored on purpose. The mode is a launch choice (src/game-mode.js): the
    // sheet, the sign lettering and the starting kit were settled when the page opened, and
    // switching them under a running game would leave half of it in the other mode. The field says
    // which game the save was written in; a save with no field at all is a normal-mode adventure.
    // Who the adventure was being played as. A save from before anyone could choose is Cromb.
    setPlayerCharacter(savedPlayerCharacter(saved.player));mateSaidGoodbye=saved.questStage>=2;
    trackedPlaceId=null;trailMarker.visible=false;
    for(const id of inventory.items())inventory.remove(id,inventory.count(id));
    for(const item of saved.inventory)inventory.add(item.id,item.quantity);
    weapons.restore(saved.weapons);journey.restore(saved.journey);questStage=saved.questStage;practiceHits=saved.woodland?.practiceHits??2;practiceDodges=saved.woodland?.practiceDodges??1;
    // A save from before Glun stood at the post has a traveler who was never briefed and is past
    // it anyway; anything at stage 3 or beyond has done the lesson by definition.
    lessonSet=saved.woodland?.lessonSet??(saved.questStage>2||practiceHits>0);
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
    skills.restore(saved.skills??skills.snapshot());birding.restore(saved.birding??createBirding().snapshot());lakota.restore(saved.lakota??createLakota().snapshot());swimming.restore(saved.swimming??createSwimming().snapshot());
    // **The dead come back off the road before the company does.** `companions.restore` asks
    // `fallen` who is dead, to keep a dead man out of the walking list it is handed - so a stale
    // `fallen` answers for the save being loaded. Restoring it three lines later meant that
    // loading a save written *before* a fight, in the same session as the death, struck the man
    // out of the file: he came back alive and no longer at your shoulder.
    fallen.restore(saved.fallen??createFallen().snapshot());
    companions.restore(saved.companions??createCompanions().snapshot());teachers.restore(saved.teachers??createTeachers().snapshot());gear.restore(saved.gear??createGear().snapshot());rebuildCompany();refreshFoundWeapons();world.setFeederHung(birding.feeder==='hung');refreshSkillsSheet();
    mapFog.restore(saved.chart??createMapFog().snapshot());cartography.restore(saved.cartography??createCartography().snapshot());fishing.restore(saved.fishing??createFishing().snapshot());mycology.restore(saved.mycology??createMycology().snapshot());mushrooms.restoreGathered(saved.mushrooms??[]);botany.restore(saved.botany??saved.herbology??createBotany().snapshot());pipe.restore(saved.pipe??createPipe().snapshot());jimson.restore(saved.jimson??createJimson().snapshot());katy.restore(saved.katy??createKaty().snapshot());troy.restore(saved.troy??createBeekeeper().snapshot());vineyard.restore(saved.vineyard??createVineyard().snapshot());hunt.restore(saved.hunt??createBatmanHunt().snapshot());light.restore(saved.light??createLightKeeper().snapshot());bosco.restore(saved.bosco??createBosco().snapshot());heist.restore(saved.heist??createHeist().snapshot());boscoModel.setDye(boscoDye=bosco.dye.colour);geology.restore(saved.geology??createGeology().snapshot());archaeology.restore(saved.archaeology??createArchaeology().snapshot());wine.restore(saved.wine??createWine().snapshot());cooking.restore(saved.cooking??createCooking().snapshot());wineAttic.restore(saved.wineAttic??createWineAttic().snapshot());// A road saved before the split keeps its `ed` key, which was always Puck's half of him.
    puck.restore(saved.puck??saved.ed??createPuck().snapshot());placePuck();
    chameleon.restore(saved.chameleon??createChameleon({seed:chameleonSeed}).snapshot());placeChameleon();brandy.restore(saved.brandy??createBrandy().snapshot());salt.restore(saved.salt??createSaltSultan().snapshot());placeSalt();wood.restore(saved.woodcutting??createWoodcutting().snapshot());building.restore(saved.construction??createConstruction().snapshot());world.homestead.setStages(building.stages);for(const spot of BIRDHOUSE_POSTS)world.homestead.setPost(spot.id,building.post(spot.id));troupe.restore(saved.troupe??createTroupe().snapshot());placeTroupe(true);digs.mark(id=>archaeology.hasFound(id));oldTree.restore(saved.oldTree??createTalkingTree().snapshot());stones.restoreGathered(saved.stones??[]);refugees.restore(saved.refugees??refugees.snapshot());burying.restore(saved.burying??createBurying().snapshot());world.lauvelField?.setBuried(burying.buried);for(const npc of npcData)npc.fallen=fallen.has(npc.id);flora.restoreGathered(saved.plants??[]);linguist.restore(saved.linguist??createLinguist().snapshot());longRoad.restore(saved.longRoad??createLongRoad().snapshot());farming.restore(saved.farming??createFarming().snapshot());companionOffTheClock=Object.hasOwn(saved,'longRoad');rebuildCompany();settleMercenaries();jimsonClock=elapsed;wordSaid=wordToastAt(playSeconds)?.key??null;landingSaid=landingAt(playSeconds)?.key??null;
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
    const point=onPlayableGround?saved.position:questStage<QUEST_DONE?world.spawn:world.regions.find(region=>region.id===journey.view().region).spawn;
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
    // The two recipes the acorn errand was always for. The leached meal had no use in the game
    // until now, and both of these start with it (docs/known-issues.md, the six foods).
    if(acornQuest.status==='complete'&&!(cooking.knows('acorn-flatbread')&&cooking.knows('honey-cake')))
      choices.push({id:'lysa-recipes',label:'What do you actually do with the meal?',action:()=>openDialogue(npc,[
        'Leach it in three waters until it stops fighting you, grind it coarse, and from there it is two things. Flatbread, which is dough on a hot stone and will keep you walking. And little cakes, if you can find me a comb of honey — Troy keeps bees at the fold in the wood and will give you one for the asking.',
        'Both of them cook on any fire you can light, which is what the tinderbox was for. Write them down; I am not going to be standing at the next fire you build.'],
        null,'Write them down',{onComplete:()=>{
          const taught=['acorn-flatbread','honey-cake'].map(id=>cooking.learn(id)).filter(result=>result.ok&&result.first);
          if(taught.length){refreshSkillsSheet();toast('Acorn flatbread and honey cake. Both of them start with Lysa’s meal, and both cook on any lit fire.','TWO RECIPES FROM LYSA');saveRoad(false);}
          lysaConversation(npc);}})});
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
  /**
   * The ground a man is standing on, in the companions module's own words. A man is asked where
   * he is, and each of them is somewhere of his own: Ed on the strand the sea put him down on,
   * Mus only ever in the country off the road, Chris at the landing, the rest on the road.
   *
   * `null` is "not now" rather than "no": a man at the muster is not recruited, because the
   * finding is the game and the muster is where the finding ends (docs/companions.md).
   */
  function whereHeIs(npc){
    const route=mercenaryById(npc.id)?.route??'road';
    const phase=npc.placement?.phase;
    if(route==='wild')return phase==='walking'?'wild':null;
    if(route==='shore')return phase==='landing'?'shore':null;
    if(phase==='landing')return 'landing';
    if(phase==='walking'||phase==='stopped')return 'road';
    return null;}
  /**
   * What the traveler can be vouched for, which is what three of them want before they will come.
   * Each is the plainest reading of the man's own line: Kristen wants somebody who knows the road
   * ("you know the road and we do not"), Lakota somebody who has looked at a bird, Eliana
   * somebody carrying an edge she might swap for.
   */
  function whatHeHas(){
    const here=world.regionAt(player.group.position.x,player.group.position.z)?.name??null;
    const edge=weapons?.profile();
    return {
      // Not merely charted: **explored**. Drent is charted from the first morning (STARTING_CHART),
      // so charted would be a gate that opens itself. Explored means he has walked the country's
      // hexes, which is the plain sense of "you know the road and we do not".
      charted:!!here&&cartography.state(here)==='explored',
      birded:birding.seenCount()>0,
      edge:!!edge?.usable&&Object.values(KIT_WEAPON_ITEM).includes(edge.id),
    };}
  /**
   * The one choice that asks a man to come, in his own words, or tells you in his own words why
   * not yet. It is only ever offered where he is: the module answers `'elsewhere'` for a man who
   * is somewhere else, and this shows nothing at all rather than a greyed-out line.
   */
  function askingChoice(npc){
    if(!mercenaryById(npc.id)||!Object.hasOwn(ASKS,npc.id))return null;
    if(companions.walksWith(npc.id))
      return {id:'merc-send-on',label:'Go on ahead of me.',action:()=>{
        companions.sendOn(npc.id);
        openDialogue(npc,['Right you are. I will see you up the road.'],null,'Back to the road',{onComplete:closeDialogue});}};
    const may=companions.askable(npc.id,{where:whereHeIs(npc),has:whatHeHas()});
    if(!may.ok&&may.reason!=='needs')return null;
    if(!may.ok)return {id:'merc-ask',label:'Walk with me.',action:()=>openDialogue(npc,[may.line],null,'Back to our conversation',{onComplete:()=>mercenaryConversation(npc)})};
    return {id:'merc-ask',label:'Walk with me.',action:()=>{
      const came=companions.ask(npc.id,{where:whereHeIs(npc),has:whatHeHas()});
      openDialogue(npc,[came.line],null,'Back to the road',{onComplete:closeDialogue});
      if(came.ok)saveRoad(false);}};}
  /** What any hired sword will answer for: his fighting style, and whether he will swap weapons. */
  function mercenaryChoices(npc,back=()=>mercenaryConversation(npc)){
    const kit=mercenaryWeapon(npc.id);if(!kit)return [];
    return [{id:'merc-style',label:`How do you fight? (${kit.style})`,action:()=>openDialogue(npc,mercenaryStyleLines(npc.id),null,'Back to our conversation',{onComplete:back})},
      {id:'merc-trade',label:'Would you trade weapons?',action:()=>offerTrade(npc)}];
  }
  function mercenaryConversation(npc){
    // A man who was walking with you when somebody fell, and heard you tell the Marshal he went
    // home, says so once - to you, on his own, and never in front of the Marshal. There is no
    // camp fire at the muster to say it by (the game's only fire pits are Drent's village and
    // pond), so it is said the next time you speak to him, which is the same privacy.
    const holds=companions.holdsAgainstYou(npc.id);
    if(holds){companions.letGo(npc.id);saveRoad(false);
      openDialogue(npc,[holds.line],null,'Back to the road',{onComplete:()=>mercenaryConversation(npc)});return;}
    const choices=[...mercenaryChoices(npc)];
    // **The company is the faculty** (src/teachers.js). A man who has reached a new standing with
    // you has something of his own craft to show, once each, and will stand up with you for a
    // bout once he has shown you anything at all. Both are offered only where he is - which is
    // beside you, because a man up the road teaches nothing until he is back.
    const spar=teachers.bout(npc.id,travelerHands());
    // A man whose craft is not in the traveler's hands lends his spare, and says so before the
    // bout rather than being found to have done it afterwards.
    if(spar.ok)choices.unshift({id:'teacher-spar',label:sparLabel(npc.id,spar),action:()=>{
      if(spar.loan)openDialogue(npc,[spar.loan.hand],null,'Take it and stand up',{onComplete:()=>{closeDialogue();startSpar(npc,spar);}});
      else{closeDialogue();startSpar(npc,spar);}}});
    else if(spar.reason==='hands')choices.unshift({id:'teacher-spar-no',label:'Stand up and go a few with me.',
      action:()=>openDialogue(npc,[spar.line],null,'Back to our conversation',{onComplete:()=>mercenaryConversation(npc)})});
    // **And the one man who will not stand up with you sets you a mark instead** (src/teachers.js).
    // Same gate as a bout and the same ceiling; what differs is that there is nobody in front of
    // the arrow. Taking it down is the same line offered back, so nothing is stranded.
    const aim=teachers.atTheMark(npc.id,travelerHands());
    if(mark&&mark.id===npc.id)choices.unshift({id:'teacher-mark-done',label:'That will do for today.',
      action:()=>{closeDialogue();endMark('done');}});
    else if(aim.ok)choices.unshift({id:'teacher-mark',label:`${aim.offer} (${SKILLS[aim.family]?.name??aim.family}, to ${aim.ceiling})`,
      action:()=>{closeDialogue();startMark(npc,aim);}});
    else if(aim.reason==='hands')choices.unshift({id:'teacher-mark-no',label:'Set me a mark.',
      action:()=>openDialogue(npc,[aim.line],null,'Back to our conversation',{onComplete:()=>mercenaryConversation(npc)})});
    const lesson=teachers.owed(npc.id);
    if(lesson)choices.unshift({id:'teacher-lesson',label:lesson.offer,
      action:()=>openDialogue(npc,[...lesson.lines],null,'Back to our conversation',{onComplete:()=>{giveLesson(npc.id);mercenaryConversation(npc);}})});
    // Whether he will come, or go on ahead. It sits above the rest because it is the thing the
    // player came over to ask.
    const asking=askingChoice(npc);
    if(asking)choices.unshift(asking);
    // The one man off your own boat: send him on, or ask him back, and neither is ever forced.
    if(companionOffTheClock&&npc.id===landingMateId()){
      // His five sittings exist to teach a tongue, so they are hard mode's and are not offered in
      // normal mode, where the army is understood already (src/game-mode.js, docs/hard-mode.md).
      const drill=gameMode.has('linguist')?longRoad.view(longRoadWorld()).drill:null;
      if(drill)choices.unshift({id:'companion-drill',label:`Teach me some of the army\u2019s speech. (${drill.title})`,action:()=>giveDrill(npc,drill)});
      if(!longRoad.released)choices.unshift({id:'companion-go-on',label:'Go on to the muster without me.',action:()=>{
        closeDialogue();
        releaseCompanion(distanceAlongRoad(world.paths[0],{x:player.group.position.x,z:player.group.position.z}),
          'Then I will see you at the plain. Take your time over this country; it is the last quiet one you will walk through.');}});
      else if(border.view().stage!=='march')choices.unshift({id:'companion-come-back',label:'Walk Drent with me.',action:()=>{closeDialogue();recallCompanion();}});}
    // Ed is the only man in Drent who has swum anything, and the only one who will explain it.
    // The men at her rail. He watched them watch him go over, and he is not going to say so
    // plainly, because he never says anything plainly (docs/design-answers.md: they are the
    // rebels the Peblos quest finds with that hull later).
    if(npc.id===WORD_ID)choices.unshift({id:'word-crew',label:'Whose ship was that?',
      action:()=>openDialogue(npc,['Mine! Well — mine in every sense that matters and none of the ones a clerk would accept. You saw the deck? Five of them at the rail watching me swim, and not one hand put out. That is my crew. The tall one at the tiller has my hat.',
        'I shall want it back. Not today. Today I have a war to be extremely useful in and a great deal of seawater to get out of my ears, and they have a hull with nowhere to take it.'],
        null,'Back to our conversation',{onComplete:()=>mercenaryConversation(npc)})});
    if(npc.id===WORD_ID&&!swimming.taught)choices.unshift({id:'word-swim',label:'Nobody swims that. How is it done?',
      action:()=>openDialogue(npc,[...SWIMMING_LESSON],null,'Back to our conversation',{onComplete:()=>{
        const learned=swimming.learn();
        if(learned.first){toast('Swimming, level 1. Walk into the water and it will hold you up for as long as your wind lasts.','ED THE WORD TAUGHT YOU TO SWIM');refreshSkillsSheet();saveRoad(false);}
        mercenaryConversation(npc);}}) });
    choices.push({id:'leave-mercenary',label:'Good road to you.',action:closeDialogue});
    // A man met in the country says the longer thing once. It is kept on the npc and not in the
    // save on purpose: nothing about Mus is written down, and a new session meeting him in the
    // woods again is a new meeting as far as he is concerned.
    openDialogue(npc,mercenaryLines(npc.id,npc.placement,{met:!!npc.metInTheCountry}),null,'Back to the road',{choices});
    if(npc.placement?.phase==='walking')npc.metInTheCountry=true;
  }
  /**
   * What the traveler has on him, in the teachers module's own words: the weapon actually in his
   * hand, and whether there is anything on the shield arm. **The hand slot IS the shield**
   * (src/gear.js), so a man who owns one is a man carrying one.
   */
  const travelerHands=()=>({weapon:weapons?.profile()?.usable?weapons.profile().id:null,shield:!!gear.wearing('hand')});
  /** His own invitation, and what standing up with him is worth today. */
  const sparLabel=(id,spar)=>`${spar.offer} (${SKILLS[spar.family]?.name??spar.family}, to ${spar.ceiling}${spar.loan?' — he lends you one':''})`;
  /**
   * He shows you something of his craft. The first one he gives is also the one that *shows* you
   * the weapon - until somebody has, it works and banks nothing - and every one of them raises
   * how far a bout with him will take you.
   */
  function giveLesson(id){
    const given=teachers.teach(id);
    if(!given.ok)return;
    const name=mercenaryById(id)?.name??id,skill=SKILLS[given.family]?.name??given.family;
    /**
     * **The first bow is Jerry's spare** (the user, 2026-09-21), handed over with his first
     * lesson. It is a *given* weapon, named the way the dead men's weapons are named, and it is
     * the only bow anybody in this company will part with: a second can come only off the ground
     * where an archer fell. Nothing else in the game is given this way, so this is one branch and
     * not a system.
     */
    if(given.gives?.weapon&&!inventory.has(given.gives.weapon)){
      inventory.add(given.gives.weapon,1);
      weapons.setCondition(given.gives.weapon,WEAPON_TYPES[given.gives.weapon].maxDurability);
      weapons.equip(given.gives.weapon);inventory.refresh();
      toast(`${given.gives.name}. ${inventory.count(BOW.arrow)?`You have ${inventory.count(BOW.arrow)} arrows for it.`:'You have nothing to shoot out of it — any smith sells arrows.'}`,
        `${name.toUpperCase()} GAVE YOU HIS SPARE BOW`);
    }
    showSkillCard({kicker:`${name.toUpperCase()} TAUGHT YOU SOMETHING`,skill:given.family,
      name:given.first?`${skill}, shown to you at last`:`${skill}, and a longer bout`,
      note:given.first?'Nothing counted before somebody showed you. It counts now, and he will stand up with you.'
        :`Sparring with him pays to ${given.ceiling}, and no further: nobody can teach past what he knows.`});
    refreshSkillsSheet();saveRoad(false);
  }
  /**
   * The ground a bout is fought on: the open metre or two between the two of them, with the
   * teacher three paces off along the line the traveler is already looking down. `bout: true` is
   * the whole of what makes it a lesson rather than a fight - **it can kill nobody**, on either
   * side (src/combat.js) - and `level: 0` because a friend is not a danger of the country.
   */
  function sparEncounter(npc){
    const me=player.group.position,merc=mercenaryById(npc.id),his=armsOf(npc.id);
    if(!merc||!his)return null;
    const him=npc.actor.group.position;
    const apart=Math.hypot(him.x-me.x,him.z-me.z);
    const face=apart>.4?Math.atan2(him.x-me.x,him.z-me.z):player.group.rotation.y;
    const stand={x:me.x+Math.sin(face)*3.2,z:me.z+Math.cos(face)*3.2};
    const centre={x:(me.x+stand.x)/2,z:(me.z+stand.z)/2};
    return {id:SPARRING_ID,bout:true,level:0,center:centre,checkpoint:{x:me.x,z:me.z},
      retreatAxis:'z',retreatLine:centre.z+24,
      enemies:[{id:`spar-${npc.id}`,kind:'sparring',name:merc.name,x:stand.x,z:stand.z,
        // What he can take is his own Toughness, exactly as it is when he stands beside you.
        hp:Math.round(maxHealth(his.toughness)),
        model:{role:'mercenary',tunic:merc.look.tunic,skin:merc.look.skin,look:{...merc.look,weapon:merc.weapon,trades:false}}}]};
  }
  /**
   * He puts his spare in the traveler's hands, for the length of the bout. It is not added to
   * anything: `lent` is the whole of it, and `lentProfile`, `getMargins` and `refreshShield` are
   * the only three readers. The body is told, because a man holding a pike must be seen to be
   * holding one - and `player.setWeapon` is called plainly, never with `?.`, because a verb
   * missing from the facade does nothing quietly (docs/known-issues.md).
   */
  function takeLoan(loan){
    if(!loan)return null;
    lent=loan.weapon?{weapon:loan.weapon}:loan.shield?{shield:true}:null;
    if(!lent)return null;
    if(lent.weapon){player.setWeapon(lent.weapon);player.setArmed(true);}
    refreshShield();
    return lent;
  }
  /**
   * And he takes it back. **However the bout ended** - a yield either way, a walk-away, or any
   * other road out of a fight - the traveler's own weapon is in his hand again and the borrowed
   * boards are off his arm. Safe to call when nothing is lent, which is what lets the frame loop
   * call it as a belt and braces.
   */
  function returnLoan(){
    if(!lent)return false;
    const had=lent;lent=null;
    if(had.weapon)player.setWeapon(weapons.equippedId);
    refreshShield();inventory.refresh();
    return true;
  }
  function startSpar(npc,offer){
    const built=sparEncounter(npc);
    if(!built||!combat.startEncounter(built)){toast('Not here. There is not the ground for it.','SPARRING');return;}
    sparring={id:npc.id,family:offer.family,ceiling:offer.ceiling,done:offer.done,
      loan:offer.loan?{...offer.loan}:null};
    takeLoan(offer.loan);
    stopInput();audio?.effect('bell');
    const held=lent?.weapon?` He has put his own ${(WEAPON_TYPES[lent.weapon]?.name??'weapon').toLowerCase()} in your hands and he will want it back.`
      :lent?.shield?' He has strapped his own shield on your arm and he will want it back.':'';
    toast(`${mercenaryById(npc.id)?.name??npc.id} takes his guard, and pulls everything. Neither of you can be killed in this; it ends when one of you has had the better of it, and it teaches ${SKILLS[offer.family]?.name??offer.family} to ${offer.ceiling}.${held}`,'SPARRING');
  }
  /**
   * A drill: six lines of the army's speech and what each one means, and no quiz at the end.
   * The lines are rendered through the linguist like every other line in the game, so the
   * tongue is Ambroni's own; the gloss under each is what makes it a lesson rather than
   * overhearing. It pays through `linguist.study`, which is the hook docs/languages.md left.
   *
   * When the traveler is Chris the same six run the other way round: he gives it, and it pays
   * the same, because giving a lesson in a tongue is how anybody keeps one.
   */
  function giveDrill(npc,offer){
    const asChris=playerId===INTERPRETER.playerId;
    const scene=drillScene(offer.index,{name:npc.name,asChris,
      render:line=>linguist.render(line,{language:'ambroni'},{full:true})});
    if(!scene){closeDialogue();return;}
    const pages=[scene.opening,...scene.lines.map(line=>`\u201c${line.said}\u201d \u2014 ${line.means}`),scene.closing];
    openDialogue(npc,pages,null,'That is enough for now',{onComplete:()=>{
      const given=longRoad.act('drill',longRoadWorld());
      if(!given.ok){closeDialogue();return;}
      linguist.study(scene.study.language,scene.study.exposure);
      refreshSkillsSheet();
      toast(`${scene.title}. ${given.index} of ${DRILL_COUNT} drills, and the army reads a little easier.`,`AMBRONI \u00b7 ${linguist.level('ambroni')}`);
      saveRoad(false);closeDialogue();}});
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
    toast(result.fare?`${result.fare} copper to Jess. ${describeSum(inventory.count(COPPER_ITEM))} left in your purse.`:'Corran takes no fare for the crossing.',result.to==='peblos'?'OUT TO THE PEBBLES':'BACK TO TIDEHAVEN');
  }
  function peddlerConversation(npc,opening=true){
    const purse=inventory.count(COPPER_ITEM);
    // A phrasebook is a lump of a tongue, so it is hard mode's: where it is not sold it is not on
    // the pack and Wendel does not offer it (src/game-mode.js, docs/hard-mode.md).
    const sellsPhrasebook=gameMode.has('linguist');
    const offers=peddlerOffers({purse,count:id=>inventory.count(id),items:INVENTORY_ITEMS,
      stock:sellsPhrasebook?PEDDLER_STOCK:PEDDLER_STOCK.filter(entry=>entry.id!==PHRASEBOOK_ITEM)});
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
    const lines=opening?peddlerLines({phrasebook:sellsPhrasebook}):[`You carry ${describeSum(purse)}. Anything else?`];
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
    // He is carrying something of yours now, which is one of the things that moves a rung
    // (REGARD.traded, src/companions.js) and therefore one of the ways a lesson is earned.
    companions.traded(npc.id);
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
    if(npc.id===FERRY_NPC.id){ferryConversation(npc,{ferry,openDialogue,closeDialogue,act:ferryAct,
      swimming,swimmingLesson:SWIMMING_LESSON,teachSwimming:()=>{
        const learned=swimming.learn();
        if(learned.first){toast('Swimming, level 1. Walk into the water and it will hold you up for as long as your wind lasts.','JESS TAUGHT YOU TO SWIM');refreshSkillsSheet();saveRoad(false);}
        ferryConversation(npc,{ferry,openDialogue,closeDialogue,act:ferryAct});}});return;}
    if(npc.id===PEDDLER.id){peddlerConversation(npc);return;}
    if(npc.id===HARBOURMASTER){jojoOnTheLanding(npc);return;}
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
      builder:{known:skills.taught(CONSTRUCTION_SKILL),saw:sawOffer(id=>inventory.count(id)),teach:BUILD_LINES.teach},openDialogue,closeDialogue,act:woodAct});return;}
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
    if(npc.id===INSTRUCTOR.id){
      instructorConversation(npc,{stage:lessonStage({briefed:lessonSet,hits:practiceHits,dodges:practiceDodges,taught:cartography.met}),openDialogue,
        begin:()=>{lessonSet=true;if(questStage===2)combat.startPractice(world.training);refreshQuest();if(questStage>=1)saveRoad(false);},
        finish:()=>{giveTheChart();}});
      return;}
    if(REFUGEE_IDS.includes(npc.id)){refugeeConversation(npc,{refugees,openDialogue,closeDialogue,act:refugeeAct});return;}
    if(npc.id===OSTLER_NPC.id){ostlerConversation(npc,{inventory,riding,hitch:LUMBER_TOWN_STABLE.hitch,playerPosition:player.group.position,openDialogue,closeDialogue,act:ridingAct,company:companions.companions.length});return;}
    // What he sells is a function of the country he stands in, so he needs no stock of his own.
    if(sellsHere(npc.id)){smithConversation(npc,{level:regionLevel(world.regionAt(player.group.position.x,player.group.position.z)?.name)??0,inventory,gear,openDialogue,closeDialogue,act:smithAct});return;}
    if((aftermathNpcIds.has(npc.id)||npc.id===MOROS_LEGATE_ID)&&aftermathConversation(npc,{aftermath,openDialogue,closeDialogue,act:aftermathAct,fill:fillSaid(),gift:giveSideGift(npc)}))return;
    if(aftermathNpcIds.has(npc.id)){openDialogue(npc,[npc.modelRole==='legion-officer'?'Not now. Form up with your company.':'Not now. Stand with the companies.'],null,'Step back');return;}
    if(westSuval.converse(npc,{border,control:heldControl??campaign.mapControl(),aftermath:aftermath.state,openDialogue,closeDialogue,act:borderAct}))return;
    if((borderNpcIds.has(npc.id)||npc.id===MOROS_LEGATE_ID)&&borderConversation(npc,{border,openDialogue,closeDialogue,act:borderAct,musterCount:musteredInCamp()+1,fill:fillSaid(),line:lineSaid()}))return;
    if(borderNpcIds.has(npc.id)){openDialogue(npc,[npc.id==='coalition-envoy'?'I wait for the Marshal’s man, under a flag both armies have agreed to respect until tomorrow.':npc.modelRole==='suvali-guard'?'We hold this ground under truce. Speak to the Envoy.':'Stand to your place in the line.'],null,'Back to the road');return;}
    if((npc.id===MOROS_GATE_ID||npc.id===MOROS_LEGATE_ID)&&morosConversation(npc,{moros,openDialogue,closeDialogue,act:morosAct,
      musterCount:musteredInCamp()+1,seenAt:longRoad.view(longRoadWorld()).seenAt,roster:roster.map(man=>man.id),
      // The men standing in front of him and the ones who are never coming: the count is
      // mustered plus those who walked in with you, and the dead are neither (src/companions.js).
      withYou:companions.walking,dead:fallen.ids.filter(id=>roster.some(man=>man.id===id)),
      // Asked, not handed: the conversation re-enters itself after each answer, and who is still
      // owed has changed by then.
      owed:()=>companions.owed(),answersFor:id=>companions.answersFor(id),
      report:(id,kind)=>{const told=companions.report(id,kind);if(told.ok)saveRoad(false);return told;},
      nameOf:id=>mercenaryById(id)?.name??id}))return;
    if(LEGION_POST_IDS.has(npc.id)){openDialogue(npc,legionPostLines(npc.id),null,'Back to the road');return;}
    if(TOWN_LIFE_IDS.has(npc.id)){openDialogue(npc,townLifeLines(npc.id),null,'Back to the road');return;}
    // A teacher with somebody in front of them who already does this says so first.
    if(recogniseTeacher(npc))return;
    if(mercenaryIds.has(npc.id)){mercenaryConversation(npc);return;}
    if(npc.id===BEGGAR_NPC.id){beggarConversation(npc,{beggar,inventory,openDialogue,closeDialogue,act:townAct});return;}
    if(TOWN_NPC_IDS.includes(npc.id)){townConversation(npc,{campaign,inventory,openDialogue,closeDialogue,act:townAct});return;}
    if(LUSCIA_NPC_IDS.has(npc.id)||(npc.id==='relay-clerk'&&luscia.state.started)){lusciaConversation(npc,{luscia,inventory,openDialogue,closeDialogue,act:lusciaAct,extraChoices:person=>regionalLifeRelayChoices(person,regionalContext)});return;}
    if(journeyNpcIds.has(npc.id)){journeyConversation(npc,{journey,inventory,openDialogue,closeDialogue,act:journeyAct,register:registerView(),extraChoices:person=>regionalLifeRelayChoices(person,regionalContext),
      provideBridgeWood:()=>{const needed=Math.max(0,3-inventory.count('forest-stick'));const ok=!needed||inventory.add('forest-stick',needed);if(ok&&needed){toast('Three sound branches are ready for the bridge.','HOLLIS’S REPAIR TIMBER');saveRoad(false);}return {ok,reason:ok?'':'There is no room for the repair timber.'};},
      teachFishing:()=>{const owned=inventory.has('fishing-rod');const result=campcraft.teachFishing();fishing.learn();refreshSkillsSheet();if(!owned)toast('A spare rod for your journey. Find the marked bank east of the bridge.','FISHING ROD · ADDED TO SATCHEL');return result;}});return;}
    if(npc.id==='acorn-cook'){lysaConversation(npc);return;}
    if(npc.id==='doomsayer'){doomsayerConversation(npc);return;}
    if(npc.id==='pond-fisher'){fisherConversation(npc);return;}
    let lines,event=null,action='Until next time';
    // **What anybody in Tidehaven says, by where the traveler is in Chapter 1.** This used to be
    // an eight-branch ladder written for eleven tutorial steps, and five of its branches - Eren's
    // token, the satchel lesson, the cairns to Fernway Rest - were for steps that no longer
    // exist, spoken by people who are no longer in the cast (src/cast.js, src/game-state.js).
    if(questStage<2)lines=['Speak to Jojo at the head of the pier before you go anywhere. She has the paperwork, and she has been up there since the bell started.',
      'Every river of Drent keeps its own small shrine. We leave a little water at the shore and ask for a safe return. Today, I am asking for yours.'];
    else if(questStage===2)lines=['Officer Glun has the straw post at the crossroads. Two clean hits, take one on the shield and step out of the way of one, and he will let you up that road.',
      'He is not unkind about it. He has buried enough of them who could not.'];
    else lines=['West, then. The Greenway under the trees, out at the Avrel clearing, over the Caloss, and Nothom is a day’s walk beyond the river.',
      'Those goblins came over the Tessen, the little river north of the landing. They wade its mouth at low water. The army keeps a post at the Tessen bridge now, up the road north from the Caloss Gate.'];
    openDialogue(npc,lines,event,action);
  }
  /**
   * Jojo, harbourmaster of Tidehaven, at the head of the pier: the bell, the letter for Corvan, and
   * which way the road goes. She is the first person the traveler speaks to, and the errand is hers
   * because it is her landing and her paperwork. Chris, who came off the same boat, keeps the sword
   * lesson below.
   */
  /**
   * **The chart, handed over by Officer Glun when the lesson is done** (the user, 22 September
   * 2026). It is blank, and the ground the traveler is standing on is the first thing on it:
   * `noteHex` runs every frame on the hex under his feet and records nothing until there is a
   * chart to record on, so Tidehaven's own hex draws itself the moment he owns one.
   */
  function giveTheChart(){
    if(!cartography.learn().first)return;
    // The road token came from Eren, who is out of the cast (src/cast.js). The man who sets you on
    // the road is the man who equips you for it.
    if(!inventory.has('road-token'))inventory.grant('road-token');
    const here=world.regionAt(player.group.position.x,player.group.position.z);
    if(here&&!isOpenCountry(here))cartography.noteHex(here.name);
    toast('Your own chart of Azhora, and nothing on it but the ground under your feet. Everything else is dark until you go and look. M opens it; ask anybody which way the next country is.','NEW SKILL · CARTOGRAPHY');
    // **And the road opens here.** The step moved to `Report to Nothom` a moment ago, but the
    // journey it hands over to will not start without the token, and the token is in this
    // function: without this the card sat on `Beyond the first shore` until something else
    // happened to refresh it.
    refreshSkillsSheet();refreshChart();refreshQuest();if(questStage>=1)saveRoad(false);
  }
  function jojoOnTheLanding(npc){
    if(questStage>=2){
      openDialogue(npc,[questStage>=QUEST_DONE
        ?'Glun has passed you, they tell me. Good. I have two boats waiting on a tide and a clerk in Nothom waiting on you, so neither of us is finished.'
        :'Officer Glun. The straw post, at the crossroads. I have said it twice and I will not enjoy saying it a third time.'],
        null,'Back to the landing',{choices:[...jojoCornerChoices(npc),{id:'leave-mara',label:'Back to the landing.',action:closeDialogue}]});
      return;
    }
    updateQuest('ashore');
    openDialogue(npc,['That bell was going before you were tied up. Goblins \u2014 bramble goblins, on Tidehaven this morning, and three of them still out on the Greenway north of the village. The landing is safe enough. The road is not.',
      'Jojo. Harbourmaster, which this morning means I am the one holding the paperwork nobody else will touch. This is yours: the letter of introduction, for Iven, the army’s relay clerk at Nothom over the Caloss. He holds your assignment and he does not hold it long.',
      'Nothom is a long way west of here and you are not walking it yet. Officer Glun first — the straw post at the crossroads, up through the village. He looks at every hired sword that comes off a boat and decides whether they go up that road or back down the gangway, and he will not take my word for you.',
      'Do what he asks and he will give you a chart and the rest of it. Then west: the Greenway under the trees, the Avrel clearing, the Caloss crossing, Luscia, Nothom.',
      `One of your own boat came up the pier with you \u2014 ${landingMateNote(npcById.get(landingMateId()))}. Talk to him before you go inland. He knows what to do with a sword and you look like somebody who is about to need to. And he will not be the last of you off the Stills — I have boats booked in on every tide today, and the paper says eleven.`],
      'accept-letter','Take the letter');
  }
  /**
   * Jojo's second cartography lesson, and the only errand she has after the letter: the three
   * corners of Tidehaven. The first lesson was the rough chart she hands over on the pier, which
   * is somebody else's drawing; this is the traveler's own, and she countersigns what comes back.
   *
   * She asks; the ground between the pier, the Weatherhead and the Koopwood draws itself as it is
   * walked (`mapFog`); she signs on the return, once, for a block of cartography. It never moves
   * the main journey and it is never in the way: it is a choice in a conversation she was going
   * to have anyway (docs/drent-long-road.md §4, leg 1).
   */
  function jojoCornerChoices(npc){
    const errand=longRoad.corners(longRoadWorld());
    if(errand.signed)return [];
    const back=()=>{closeDialogue();conversation(npc);};
    if(!errand.asked)return [{id:'mara-corners-ask',label:'Is there anything else worth drawing here?',action:()=>{
      longRoad.act('corners-ask');
      openDialogue(npc,['There is, and nobody ever asks. You have my chart of the coast and it is not yours until you have put something on it yourself.',
        'Three corners, and the village is inside them. The head of this pier, where you are standing. The Weatherhead, the low head south of the landing — Cabe Tolliver sits up there calling the weather, and he will talk your ear off. And the Koopwood, north-west, where Bowden takes the trees down.',
        'Walk to all three. The ground between them draws itself as you go; that is what a chart is. Bring it back and I will put my name on it, which means the next harbourmaster down the coast will take it seriously.'],
        null,'I will walk it',{onComplete:()=>{toast('The head of the pier, the Weatherhead, the Koopwood. Walk to all three and bring the chart back to Jojo.','JOJO · THE THREE CORNERS');saveRoad(false);}});}}];
    if(!errand.canSign){
      const left=errand.corners.filter(corner=>!corner.walked);
      return [{id:'mara-corners-report',label:`The three corners (${errand.walked} of ${errand.of})`,action:()=>openDialogue(npc,
        [`${errand.walked} of the three, and you know it as well as I do. Still to walk: ${left.map(corner=>corner.name).join(', ')}.`,
          left[0].hint],null,'Back to our conversation',{onComplete:back})}];
    }
    return [{id:'mara-corners-sign',label:'All three corners are on the chart.',action:()=>{
      const paid=longRoad.act('corners-sign',longRoadWorld());
      if(!paid.ok){openDialogue(npc,[paid.reason],null,'Back to our conversation',{onComplete:back});return;}
      const gained=skills.known(CARTOGRAPHY_SKILL)?skills.gain(CARTOGRAPHY_SKILL,CORNERS_XP):null;
      refreshSkillsSheet();refreshChart();
      openDialogue(npc,['So it is. Pier, head, woodlot, and the village sitting in the middle of them where it has always sat.',
        'There. Jojo, harbourmaster, Tidehaven — and the date, because a chart without a date is a rumour. Anybody on this coast will read that.',
        'Now go and do the same to the rest of the country. It is a great deal bigger and nobody has signed any of it.'],
        null,'Back to the landing',{onComplete:()=>{
          const skill=gained;
          toast(`Jojo has countersigned your chart of Tidehaven. ${CORNERS_XP} cartography.`,skill?.levelled?`CARTOGRAPHY LEVEL ${skill.level}`:'THE THREE CORNERS');
          audio?.effect('success');saveRoad(false);}});}}];
  }
  /**
   * The man who came ashore with you: the straw post, the dodge, what a blade costs, and where he
   * will be. He is a slot rather than a name - whoever stands first in the company, which is Chris
   * Gotwood unless you are Chris, in which case it is Cromb - so he introduces himself by npc.name.
   * The rest of the scene is written in Chris's voice, and docs/playable-characters.md records what
   * Cromb should say here instead. The letter is not his: Jojo hands that over at the head of the pier.
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
    if(['playing','pause','journal'].includes(mode)){testingWhereAmI();modal('testing');}
  }
  /** Where the traveler is standing, in the words the chart uses and in numbers you can paste back. */
  function testingWhereAmI(){
    const p=player.group.position,here=world.regionAt(p.x,p.z),near=nearestPlace(p);
    const country=isOpenCountry(here)?'open country':here?.name??'off the sheet';
    $('test-here').textContent=`You are at ${p.x.toFixed(1)}, ${p.z.toFixed(1)} — ${country}`
      +(near?`, ${near.away<1?'in':`${Math.round(near.away)} m from`} ${near.name}.`:'.');
  }
  function prepareTesting(){
    testingEnabled=true;
    forestHideout.endEncounter(hideoutEncounter.id);
    for(const id of ['harbor-letter','road-token','tinderbox'])inventory.grant(id);
    campcraft.teachFishing();
    for(const [id,count] of [['acorn',5],['forest-stick',6],['raw-fish',2]])if(inventory.count(id)<count)inventory.add(id,count-inventory.count(id));
    combat.startPractice(world.training);combat.finishPractice();weapons.repair();practiceHits=2;practiceDodges=1;lessonSet=true;cartography.learn();questStage=QUEST_DONE;refreshQuest();inventory.refresh();
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
   * once Jojo has handed the chart over and while there is still something they can tell you.
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
    // Normal mode: everybody is understood. The line is shown as it was authored, nothing is
    // heard into a tongue, and there is no aside under it (src/game-mode.js, docs/hard-mode.md).
    if(!gameMode.has('linguist')){const plain=$('speech-aside');if(plain){plain.textContent='';show('speech-aside',false);}return line;}
    const helping=linguist.interpreterNearby(npc,{interpreter:interpreterNpc(),languageId:tongue,at:player.group.position});
    if(!heard.has(index)){heard.add(index);linguist.hear(npc,line,{language:tongue,dialect:speech.dialect,times:helping?INTERPRETER.bonus:1});}
    const aside=$('speech-aside'),interpreted=helping&&linguist.level(tongue)<MAX_PROFICIENCY;
    if(aside){aside.textContent=interpreted?`${INTERPRETER.name} leans in: “${line}”`:'';show('speech-aside',interpreted);}
    return linguist.render(line,speech,{names:knownNames()});
  }
  /** What tongue this is, and the key that shows the line the way it was actually said. */
  function speechTongue(){
    if(!gameMode.has('linguist'))return '';
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
  /**
   * Out the other side. What the swim was worth is paid where he leaves the water, which is the
   * only place it counts - and there are two ways out: walking onto ground, and getting on a
   * horse from the shallows.
   */
  function payForTheSwim(x,z){
    // He is out. This has to be said before anything else, because the last thing the payout does
    // is write the checkpoint, and `saveRoad` refuses while `inWater` - so the crossing was paid
    // for in experience and in waters crossed, and then never written down, by either way out.
    inWater=false;
    const landed=world.regionAt(x,z)?.name??null;
    const paid=swimming.swam(swimMetres);
    if(paid.xp)toast(`Swimming +${paid.xp}${paid.levelled?` · level ${paid.level}`:''}. ${Math.round(swimMetres)} m of it.`,'OUT OF THE WATER');
    if(swimMetres>12&&landed&&landed!==swimFrom)swimming.crossed(`${swimFrom??'open water'} to ${landed}`);
    if(swimMetres>12&&landed==='Peblos')swimming.reachedPeblos();
    if(paid.xp||swimMetres>12)saveRoad(false);
    swimMetres=0;
  }
  function swimTick(dt,before){
    const p=player.group.position;
    // A horse will not go in, and `moveCharacter` will not carry one over the waterline, so a
    // rider simply cannot get wet. This says so out loud the first time he tries.
    if(riding.mounted){
      // Mounting is one of the ways out of the water: the horse waits on land and you can reach
      // him from the shallows. Whatever the swim was worth is paid before the saddle takes over,
      // or a man who pressed G instead of taking one more step lost the lot.
      if(inWater)payForTheSwim(p.x,p.z);
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
      if(inWater)payForTheSwim(p.x,p.z);
      inWater=false;drowning=false;return;
    }
    swimMetres+=Math.hypot(p.x-before.x,p.z-before.z);
    // **Armour drowns people.** Plate spends the wind twice as fast, which is what makes the
    // swim to Peblos a decision rather than a walk (docs/combat-brief.md).
    const step=swimStep({dt:dt*gear.windScale,level:skills.level(SWIMMING_SKILL)||1,wind:combat.state.player.stamina,health:combat.state.player.hp});
    combat.exhaust(step.spent,step.damage);
    // 'player-hit' and not 'hurt': the table has no sound of that name (src/road-audio.js), and a
    // name it does not have is silence, which is what the moment your wind goes had been. This is
    // the sound the game already makes when the traveler takes damage, and drowning is damage.
    if(step.drowning&&!drowning){drowning=true;audio?.effect('player-hit');toast('Your wind is gone. You are not swimming any more.','DROWNING');}
    if(!step.drowning)drowning=false;
  }
  /**
   * **Spent arrows, lying where they stopped.** About two in three survive the landing
   * (src/archery.js decides which, by the arrow's own number rather than a roll), and the ones
   * that do are small things stuck in the ground that the traveler gathers by walking over them.
   * No prompt and no key: stooping for a shaft is not a decision.
   *
   * They live only as long as the session - an arrow is a thing you go and pick up now, not a
   * thing the world remembers for you - so nothing here is saved.
   */
  const spentArrows=[];
  /**
   * **A spent shaft has to be findable from where the player's eye actually is**, which is seven
   * to nine metres back and thirty degrees up. The first draft was a 12 mm stick 0.62 m long and
   * it simply was not there: against grass at that distance it is under two pixels across.
   *
   * It gets help rather than a prompt (the coordinator's ruling): the shaft is thicker and longer
   * than a real arrow, and it carries **pale fletching** - three vanes of the same bleached cream
   * the game already uses for a bowstring, which is the one colour nothing in Drent's grass has.
   * A man who has loosed six arrows can see where four of them are from where he is standing.
   */
  const arrowShaft=(()=>{let shared=null;return()=>{
    if(!shared){
      shared=new THREE.Group();
      const wood=new THREE.MeshLambertMaterial({color:0x6f5236}),iron=new THREE.MeshLambertMaterial({color:0x9a9d96});
      const feather=new THREE.MeshLambertMaterial({color:0xf0e6cc,side:THREE.DoubleSide});
      const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.022,.022,.88,5),wood);shaft.position.y=.44;shared.add(shaft);
      const head=new THREE.Mesh(new THREE.ConeGeometry(.032,.1,5),iron);head.position.y=.03;head.rotation.x=Math.PI;shared.add(head);
      // Three vanes at the nock, where they stand clear of the grass and catch the light.
      for(const turn of [0,2.094,4.189]){
        const vane=new THREE.Mesh(new THREE.PlaneGeometry(.075,.24),feather);
        vane.position.set(Math.sin(turn)*.034,.76,Math.cos(turn)*.034);
        vane.rotation.y=turn;shared.add(vane);
      }
    }
    return shared.clone();};})();
  function dropArrow(x,z){
    if(spentArrows.length>=40)return;
    const mesh=arrowShaft();
    // Stuck at an angle, as a shaft that has hit something is: the pose is the whole of the read.
    mesh.position.set(x,world.heightAt(x,z),z);
    mesh.rotation.set(.42,(spentArrows.length*2.399)%(Math.PI*2),.22);
    scene.add(mesh);
    spentArrows.push({x,z,mesh});
  }
  /** Walk over one and it is yours again. */
  function gatherArrows(){
    if(!spentArrows.length)return;
    const p=player.group.position;
    let taken=0;
    for(let i=spentArrows.length-1;i>=0;i--){
      const shaft=spentArrows[i];
      if(Math.hypot(shaft.x-p.x,shaft.z-p.z)>BOW.reach)continue;
      scene.remove(shaft.mesh);spentArrows.splice(i,1);
      if(inventory.add(BOW.arrow,1))taken++;
    }
    if(!taken)return;
    inventory.refresh();refreshQuiver();audio?.effect('gather');
    toast(`You pull ${taken===1?'a shaft':`${taken} shafts`} out of the ground. You have ${inventory.count(BOW.arrow)}.`,'ARROWS RECOVERED');
  }
  /** Clear the field: the shafts belong to the fight they were loosed in. */
  function clearArrows(){for(const shaft of spentArrows)scene.remove(shaft.mesh);spentArrows.length=0;}
  /** What the satchel says, so the HUD and the inventory agree about the quiver. */
  function refreshQuiver(){document.body.classList.toggle('quivered',inventory.count(BOW.arrow)>0);}
  /** A blow at the straw post is worth what a light one is; the post's own ceiling does the rest. */
  const POST_BLOW=12;
  /** What an Arms payment shows: a level is worth saying, and the sheet follows it. */
  function armsPaid(paid){
    if(!paid?.levelled)return;
    refreshSkillsSheet();
    if(questStage>=1)saveRoad(false);
  }
  /**
   * What a blow in this fight counts as. A bout is practice: it pays the same skills a fight
   * does, and **nothing it pays goes past the ceiling this teacher can take you to** - the rung
   * he has reached with you, cut down to his own level in `MERCENARY_ARMS`, because nobody can
   * teach past what he knows (src/teachers.js). A real fight has no ceiling at all.
   */
  const sparringPay=()=>(sparring&&combat.state.encounterId===SPARRING_ID?{source:'sparring',ceiling:sparring.ceiling}:{});
  /**
   * **Jerry's mark** (the user, 2026-09-21; docs/combat-brief.md). He cannot spar - two archers at
   * three paces is not a lesson and he says so - so he sets a bundle of straw on a stake and the
   * traveler shoots at it from a distance. It is the bow's straw post and it runs in the same
   * `practice` phase: nothing shoots back, no damage is dealt to anything, and no victory or
   * defeat is ever emitted. Arrows are spent and two in three are still arrows on the ground,
   * exactly as in a fight.
   *
   * **A hit pays Bows to the ceiling a bout with him would pay** - the lessons he has given, cut
   * down to his own level (`sparringCeiling`, src/teachers.js) - and never past it. Only arrows
   * pay: a sword at a target set up for archery is not what he set it up for.
   */
  const MARK_BLOW=12, MARK_NEAR=6;
  /** How far he can walk off before the straw is behind him for good: past the bow's own range. */
  const MARK_WALK=BOW.range+12;
  /**
   * **And distance matters, within reason.** A hit from six metres is worth what a blow at the
   * straw post is worth; one from the bow's full range is worth twice that, and nothing past the
   * range can be shot at all. `flown` is how far the arrow actually went, which the fight
   * measures itself, so nothing here has to remember where the shot was taken from.
   */
  const markWorth=flown=>MARK_BLOW*(1+Math.min(1,Math.max(0,((Number(flown)||0)-MARK_NEAR)/(BOW.range-MARK_NEAR))));
  /**
   * A bundle of straw lashed to a stake, with a ring painted on it. Built by the host and thrown
   * away with the mark: it is a thing one man set up for an afternoon, not scenery, and it is
   * **not a collider** - straw stops nothing, and the arrow is stopped by the target behind it
   * being a target rather than by anything solid.
   */
  function markMesh(at){
    const group=new THREE.Group();group.name='Jerry’s mark';
    const wood=new THREE.MeshLambertMaterial({color:0x6b5334}),straw=new THREE.MeshLambertMaterial({color:0xc9b071});
    const ring=new THREE.MeshLambertMaterial({color:0x8a3a2c}),ground=world.heightAt(at.x,at.z);
    const stake=new THREE.Mesh(new THREE.CylinderGeometry(.06,.07,1.5,5),wood);stake.position.y=.75;group.add(stake);
    const boss=new THREE.Mesh(new THREE.CylinderGeometry(.42,.42,.22,9),straw);
    boss.position.y=1.3;boss.rotation.x=Math.PI/2;group.add(boss);
    const eye=new THREE.Mesh(new THREE.CylinderGeometry(.13,.13,.24,9),ring);
    eye.position.y=1.3;eye.rotation.x=Math.PI/2;group.add(eye);
    group.position.set(at.x,ground,at.z);
    scene.add(group);
    return group;
  }
  /**
   * He sets it up. The straw goes out along the open ground the traveler is already looking down,
   * far enough that walking back is a decision; the traveler then goes back further himself,
   * because a long shot he had to think about is the whole of what the mark teaches.
   */
  /**
   * **Nobody in the line of it.** Since a body stops an arrow (the user, 2026-09-21), a straw
   * mark set across a street is a target the traveler cannot hit and a villager he can: the
   * `jerry-mark` render on main showed one standing about two metres to the right of the straw.
   * So the line is asked the arrow's three questions before the stake goes in - is the ground
   * clear of solid things, does it rise above the flight, and **is anybody standing in it** -
   * and Jerry himself is not, because he stands behind the shooter's shoulder.
   */
  const lineIsClear=(from,at,ignore=[])=>flightOf({x:from.x,z:from.z,yaw:Math.atan2(at.x-from.x,at.z-from.z),
    range:Math.hypot(at.x-from.x,at.z-from.z),world}).stopped==='spent'
    &&!inTheLine(from,at,gatherBodies().filter(body=>body.id!=='traveler'&&!ignore.includes(body.id)),{far:-1.6});
  function startMark(npc,offer){
    endMark(null);
    const me=player.group.position,face=player.group.rotation.y;
    // Out along the line he is facing, on the furthest standable spot of the three that is clear.
    let at=null;
    for(const reach of [18,14,10]){
      const spot={x:me.x+Math.sin(face)*reach,z:me.z+Math.cos(face)*reach};
      if(canStand(spot.x,spot.z,world)&&!solidAt(world,spot.x,spot.z,.6)&&lineIsClear(me,spot)){at=spot;break;}
    }
    if(!at){toast('There is no open ground here to put a target on — and nothing to shoot past. Find some, and ask him again.','THE MARK');return false;}
    combat.startPractice(at);
    mark={id:npc.id,family:offer.family,ceiling:offer.ceiling,done:offer.done,at,group:markMesh(at),hits:0};
    audio?.effect('bell');
    openDialogue(npc,[...offer.lines],null,'Back to the road',{onComplete:closeDialogue});
    toast(`A bundle of straw on a stake, ${Math.round(Math.hypot(at.x-me.x,at.z-me.z))} m out. Walk back and shoot at it: hold the attack button to draw and let go to loose. It pays ${SKILLS[offer.family]?.name??offer.family} to ${offer.ceiling}, and a hit from further out pays more.`,'JERRY SETS YOU A MARK');
    return true;
  }
  /** And it comes down: he takes it up, or the traveler walks away from it, or a real fight starts. */
  function endMark(why){
    const was=mark;mark=null;
    if(!was)return false;
    scene.remove(was.group);
    combat.finishPractice();
    if(why==='walked-away')toast('You leave the straw where it stands. He will pull the stake up when he notices.','THE MARK');
    else if(why==='done'){
      const npc=npcById.get(was.id);
      if(npc&&mode==='playing'&&!reviewTarget)openDialogue(npc,[was.done],null,'Back to the road',{onComplete:closeDialogue});
    }
    return true;
  }
  /** What a hit on the mark counts as: Bows, at his ceiling, by how far the arrow actually went. */
  const markPay=()=>(mark?{source:'sparring',ceiling:mark.ceiling}:{});
  /** The bout is over: who had the better of it, and the one thing he says about it. */
  function endSpar(winner){
    const bout=sparring;sparring=null;
    // **The loan dies with the bout**, before anything else happens and whichever way it ended.
    returnLoan();
    if(!bout)return;
    const npc=npcById.get(bout.id),name=mercenaryById(bout.id)?.name??bout.id;
    const skill=SKILLS[bout.family]?.name??bout.family;
    const back=bout.loan?.back?[bout.loan.back]:[];
    if(winner==='walked-away'){toast(`${name} lowers his guard and lets you go${bout.loan?', and holds his hand out for what he lent you':''}.`,'SPARRING · BROKEN OFF');return;}
    toast(winner==='traveler'
      ?`You had the better of it, and nobody is hurt — he is on his feet before you are. Practice with him pays ${skill} to ${bout.ceiling}.`
      :`He had the better of it, and nobody is hurt. Practice with him pays ${skill} to ${bout.ceiling}.`,
      `SPARRING · ${name.toUpperCase()}`);
    if(npc&&mode==='playing'&&!reviewTarget)openDialogue(npc,[bout.done,...back],null,'Back to the road',{onComplete:closeDialogue});
    saveRoad(false);
  }
  function retry() {
    retriesTaken++;
    // The field is cleared with the fight: a shaft belongs to the try it was loosed in.
    clearArrows();
    // Drowning is not a fight, so there is no fight to restart. `resetEncounter` would start
    // `lastEncounter`, which is DEFAULT_ENCOUNTER until somebody has fought, and a man who had
    // never drawn on anybody woke in a goblin raid a hundred metres from the water.
    if(drownedDefeat){
      drownedDefeat=false;inWater=false;drowning=false;swimMetres=0;
      // A drowning does not restart the fight it interrupted, so whatever was told a fight had
      // begun has to be told it has ended. The hideout and the toll are already ended in the
      // defeat handler above; the aftermath is not, because the ordinary retry restarts its
      // fight and so leaves it running on purpose. Without this it goes on believing its
      // encounter is underway, and will not let the commander be given the word again.
      if(inAftermathFight())aftermath.endEncounter(combat.state.encounterId);
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
    if(combat.state.phase!=='active'&&currentRow){workRow();return;}
    if(combat.state.phase!=='active'&&currentAppleTree){const picked=farming.pick(currentAppleTree.id,playSeconds);if(!picked.ok)toast(picked.reason,'APPLEGARTH’S ORCHARD');return;}
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
    if(combat.state.phase!=='active'&&currentFoundWeapon){
      const taken=foundWeapons.take(currentFoundWeapon.id);
      if(taken.ok){
        inventory.add(taken.weapon);currentFoundWeapon=null;refreshFoundWeapons();inventory.refresh();saveRoad(false);
        toast(`${taken.name}. Open I to equip it.`,'TAKEN UP FROM THE GROUND');audio?.effect('success');
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
        questStage>=QUEST_DONE?'Keep the letter of introduction in your satchel and follow the road: the Caloss crossing, then Luscia, then Nothom, where Iven holds your assignment. All four regions of Drent stay open behind you.':'Officer Glun has not finished with you. The straw post is back at the village crossroads.'
      ]);
    }
  }
  function attack(){if(mode==='playing'&&grounded){
    // **A bow is not swung at anything.** The same button draws it, and the draw is held rather
    // than pressed, so the press does nothing and the frame loop does the work (src/archery.js).
    if(ranged())return;
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
  const characterSelect=createCharacterSelect({root:$('character-line'),detail:$('character-detail'),lookFor:playerLook,selected:playerId,hidden:hiddenSkills,
    onChange:id=>{setPlayerCharacter(id);const chosen=playableCharacter(id);
      $('opening-who').textContent=id===DEFAULT_PLAYER?crombOpeningLine:`${chosen.name}: ${chosen.title.toLowerCase()}.`;}});
  // Only Cromb can be chosen for now (src/player-characters.js), so the row of tiles has
  // nothing to choose between and the opening does not ask.
  show('opening-characters',SELECTABLE.length>1);
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
    toast('Cobble, on the main island. Jess waits at the quay head; while testing he asks no fare either way.','TESTING · PEBLOS');
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
  /**
   * **Go anywhere the world is built.** The four buttons above are the countries somebody
   * remembered; these two rows are every country and every named ground the game has, taken
   * from the world itself (src/testing-travel.js), so the next one built is here the day it is
   * built. The point box takes a coordinate in any of the shapes this project writes them in -
   * a report's (-1050, 982), a log line's [-1050, 982], or the review runner's own
   * stand-at:-806.1,-521,-1.57, whose third number is the facing.
   */
  function testGoTo(point,title,note){
    const here=world.regionAt(point.x,point.z),id=Number(here?.id);
    // The region shortcut closes the road errands behind you; open country has none to close.
    if(Number.isFinite(id)&&id>0)testTravel(id);
    else{if(!testingEnabled)prepareTesting();testingEnabled=true;show('testing-badge',true);}
    if(riding.mounted)stepDown(true);
    player.group.position.set(point.x,world.heightAt(point.x,point.z),point.z);
    if(Number.isFinite(point.facing))yaw=point.facing;
    pitch=.33;distance=targetDistance=8;grounded=true;verticalSpeed=0;
    settleCamera();closeModal();toast(note,title);
  }
  {
    const countryBox=$('test-country'),placeBox=$('test-place'),countries=travelCountries();
    const standable=(x,z)=>canStand(x,z,world,BODY.person);
    for(const country of countries)countryBox.add(new Option(`${country.id} · ${country.name} — ${country.subtitle}`,country.name));
    const fillPlaces=()=>{const places=travelPlaces(countryBox.value);placeBox.replaceChildren();
      places.forEach((place,index)=>placeBox.add(new Option(place.radius?`${place.name} · ${place.radius} m`:place.name,String(index))));};
    countryBox.value=(countries.find(one=>one.id===1)??countries[0]).name;fillPlaces();
    countryBox.onchange=fillPlaces;
    $('test-goto').onclick=()=>{
      const place=travelPlaces(countryBox.value)[Number(placeBox.value)||0];
      if(!place)return;
      // A ground's centre is a chart fact, not a standing place: the middle of the Caloss Bank
      // is the river. The search is the panel's, the answer is the world's own canStand.
      const spot=place.radius?landingSpot(place,standable):{x:place.x,z:place.z,away:0};
      if(!spot){toast(`${place.name} has no ground a body fits on within ${Math.max(60,place.radius)} m of its middle. You have not moved.`,'TESTING · NOWHERE TO STAND');return;}
      testGoTo(spot,`TESTING · ${countryBox.value.toUpperCase()}`,
        `${place.name}${spot.away?` — set down ${Math.round(spot.away)} m off its middle, on ground that holds you`:''}. ${place.note}`);
    };
    const goToPoint=()=>{
      const point=parsePoint($('test-point').value);
      if(!point){toast('Give me two numbers: -1050, 982. A third is the facing, as the review runner writes it.','TESTING · NOT A PLACE');return;}
      const here=world.regionAt(point.x,point.z),near=nearestPlace(point);
      testGoTo(point,'TESTING · A POINT',
        `${point.x.toFixed(1)}, ${point.z.toFixed(1)} — ${isOpenCountry(here)?'open country':here?.name??'off the sheet'}${near?`, ${Math.round(near.away)} m from ${near.name}`:''}.`);
    };
    $('test-point-go').onclick=goToPoint;
    $('test-point').onkeydown=event=>{if(event.code==='Enter'){event.preventDefault();goToPoint();}};
  }
  // The three lives along the road are out of the cast while the main quest is built out
  // (src/cast.js), so their buttons go with them rather than warping the traveler to a ghost.
  for(const [button,npcId,region] of [['test-mill-life','commons-miller',2],['test-reed-life','reed-worker',3],['test-shelter-life','shelter-keeper',4]]){
    const here=world.npcPositions[npcId];show(button,!!here);
    if(here)$(button).onclick=()=>{testTravel(region);const p=world.npcPositions[npcId];player.group.position.set(p.x+1.2,world.heightAt(p.x+1.2,p.z+1.2),p.z+1.2);settleCamera();toast('F to talk. These local activities are optional.','LIVES ALONG THE ROAD');};};
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
    repairBenches:[world.repairBench,...(world.repairBenches||[])].filter(Boolean),watch:WATCH_POINT,training:world.training,encounter:world.encounter,northTrail:world.northTrail,border:world.border,
    // Walled places have gates, and the autopilot only knows that if it is told (src/autopilot.js).
    enclosures:world.enclosures,
    sideSeat:(side,conquest)=>sideSeat(side,conquest)};
  const autopilotRead=()=>({mode,questStage,practiceHits,practiceDodges,lessonSet,position:{x:player.group.position.x,z:player.group.position.z},
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
    if(mode==='playing'&&['Tab','Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyR','KeyC'].includes(e.code))e.preventDefault();
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
    // T shows a line the way it was actually said, which is hard mode's: in normal mode it was
    // said in English and the key does nothing at all (src/game-mode.js).
    if(e.code===LINGUIST_KEY&&mode==='dialogue'&&gameMode.has('linguist')){e.preventDefault();linguist.toggle();updateSpeech();return;}
    if(e.code==='KeyF'){interact();return;}
    if(e.code==='KeyR'){attack();return;}
    if(e.code===RIDING_KEYS.mount){toggleMount();return;}
    if(e.code===RIDING_KEYS.whistle){whistleHorse();return;}
    if(e.code===BIRDING_KEY){observeBird();return;}
    // **C alone.** Ctrl used to dodge as well, and every screenshot shortcut on the machine
    // goes through Ctrl, so taking a picture of the game made the traveler jump sideways
    // (the user, 22 September 2026).
    if(e.code==='KeyC'){dodge();return;}
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
    if(e.button===0){swingHeld=true;attack();return;}
    if(e.button===2){drag=true;pointerX=e.clientX;pointerY=e.clientY;canvas.setPointerCapture(e.pointerId);canvas.focus();}
  });
  canvas.addEventListener('pointermove',e=>{if(drag){yaw-=(e.clientX-pointerX)*.006;pitch=THREE.MathUtils.clamp(pitch+(e.clientY-pointerY)*.004,.16,1.04);pointerX=e.clientX;pointerY=e.clientY;}});
  // The swing button is also the draw button, so whether it is *down* has to be known and not
  // only when it went down. Every road out of holding it lets the bow go (src/archery.js).
  canvas.addEventListener('pointerup',()=>{drag=false;swingHeld=false;});
  canvas.addEventListener('pointercancel',()=>swingHeld=false);
  canvas.addEventListener('pointerleave',()=>swingHeld=false);
  canvas.addEventListener('lostpointercapture',()=>drag=false);canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('wheel',e=>{e.preventDefault();if(mode==='playing')targetDistance=THREE.MathUtils.clamp(targetDistance+e.deltaY*.008,4,19);},{passive:false});
  /**
   * **Leaving the window no longer pauses the game** (the user, 21 September 2026). Azhora goes
   * on without you: the clock runs, the troupe moves on, the hired swords keep walking to the
   * muster, and a fight you walk away from is a fight that is still happening. Esc still pauses
   * when you want it. Two things the blur still does, and both are safety rather than policy:
   * held keys are released, because the browser never delivers the keyup for a key let go in
   * another window and the traveler would walk on for ever; and a cast is reeled in, because
   * fishing is worked with the pointer and cannot be played from somewhere else.
   *
   * The window keeps drawing while it is unfocused because `backgroundThrottling` is off
   * (main.cjs), and a long gap cannot jump the world because the frame step is clamped at 50 ms.
   */
  window.addEventListener('blur',()=>{stopInput();if(!location.search.includes('test')&&mode==='fishing')endFishing(true);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopInput();});
  window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();fail(new Error('The graphics device paused. Reopen the game to continue.'));});canvas.tabIndex=-1;

  function destination() {
    if(questStage===0)return{x:0,z:20,name:'Village landing'};
    if(questStage===1)return{...npcById.get(HARBOURMASTER).actor.group.position,name:'Jojo \u00b7 the harbourmaster'};
    // The card says report to Officer Glun, so the gold stands over Glun until he has set the
    // lesson; after that it is the straw he sent you to.
    if(questStage===2)return lessonSet?{...world.training,name:'Practice post'}
      :{...INSTRUCTOR_STAND,name:`${INSTRUCTOR.name} · at the practice post`};
    if(questStage===QUEST_DONE){
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
        // **And it says what actually killed her.** With arrows stopping on bodies the villager
        // who took up an axe can be shot by the traveler, and "the goblins cut her down" would be
        // a lie in the one place the raid is remembered (the user, 2026-09-21).
        if(e.type==='ally-down'&&fallen.fall(e.id)){npc.fallen=true;raid.fell=true;
          toast(e.arrow?(e.by==='traveler'?`Your arrow kills ${npc.name}.`:`An arrow from your own line kills ${npc.name}.`)
            :`The goblins cut ${npc.name} down.`,'KILLED ON THE GREENWAY');}
        if(e.type==='ally-wounded')toast(`${npc.name} is down, badly hurt, but breathing.`,'THE GREENWAY');
        if(e.type==='ally-escaped')toast(`${npc.name} got clear of the fight.`,'THE GREENWAY');}
      // How each villager came through the Greenway, for Eren to speak of.
      if(e.type==='victory'&&combat.state.encounterId===greenwayEncounter.id)raid.outcome=combat.state.allies.map(a=>({name:a.name,fate:a.hp<=0?(a.wounded?'wounded':'dead'):a.escaped?'escaped':a.hp<a.maxHp?'hurt':'unhurt'}));
      if(['victory','retreat','defeat'].includes(e.type)&&raid.fell){raid.fell=false;saveRoad(false);}
      if(e.type==='practice-hit'&&questStage===2&&lessonSet)practiceHits++;
      // The shield is not counted here: a held key is not an event. It is measured in the frame
      // loop, below, because what Glun asks for is the holding and not the pressing.

      // Jojo's straw post is where Blades is shown, in the first ten minutes, and it is the one
      // place a swing teaches without anything swinging back. A post pays as a light blow does,
      // and stops at level 5 (`ARMS.ceiling.post`): nobody reaches sixty by hitting straw.
      // Jerry's mark runs in the same phase and is not that post: what it teaches is Bows, and it
      // is paid where the arrow lands rather than here, so a sword at his straw banks nothing.
      if(e.type==='practice-hit'&&!mark){arms.learn('blades');armsPaid(arms.dealt({weapon:weapons?.profile()?.id,damage:POST_BLOW,source:'post'}));}
      // A real blow pays the weapon's own family, by what it did and where it was done.
      if(e.type==='hit'&&e.damage>0&&combat.state.phase==='active')
        armsPaid(arms.dealt({weapon:e.weaponId,damage:e.damage,killed:!!e.killed,countryLevel:e.level??0,...sparringPay()}));
      // Toughness is taught by being hit and living, and by a step aside that actually worked.
      if(e.type==='player-hit'&&e.damage>0){arms.learn('toughness');armsPaid(arms.hurt({damage:e.damage,countryLevel:e.level??0,...sparringPay()}));}
      if(e.type==='dodged'){arms.learn('toughness');armsPaid(arms.dodged({countryLevel:e.level??0,...sparringPay()}));}
      // Shield is paid by blows caught on it, by what the shield actually took off the blow -
      // so a bigger blow caught teaches more, and catching nothing teaches nothing.
      if(e.type==='caught'&&e.absorbed>0){arms.learn('shield');armsPaid(arms.caught({damage:e.absorbed,countryLevel:e.level??0,...sparringPay()}));}
      // Sparring is over. Nobody is dead, nobody is hurt, and neither of them has moved: the
      // bout has its own ending so that not one victory branch below can fire on a lesson.
      if(e.type==='spar-over')endSpar(e.winner);
      // **Every arrow loosed leaves the quiver.** The fight only ever asks how many there are
      // (`getArrows`); the satchel is the host's, and this is the one place it is emptied.
      if(e.type==='loose'){inventory.remove(BOW.arrow,1);inventory.refresh();refreshQuiver();}
      // And where it stopped, two shafts in three are still arrows lying on the ground.
      if(e.type==='arrow-landed'&&e.recovered)dropArrow(e.x,e.z);
      // **A hit on Jerry's mark pays Bows**, at the ceiling a bout with him would pay and no
      // further, by how far the arrow actually went. Only his own shafts: an ally's are his.
      if(e.type==='arrow-landed'&&e.stopped==='target'&&!e.owner&&mark){
        mark.hits++;arms.learn('bows');
        armsPaid(arms.dealt({weapon:BOW.id,damage:markWorth(e.flown),...markPay()}));
      }
      // **A draw that came to nothing says so.** A blow that lands mid-draw eats the draw and the
      // arrow stays in the quiver; until today the player was told nothing at all and simply
      // found his bow at rest (docs/known-issues.md, round 5). A twitch too short to be a shot
      // is the other half of the same event and has its own words.
      if(e.type==='draw-spent')toast(e.why==='struck'?'The blow takes the draw with it. The arrow is still on the string.':'Not drawn far enough to be a shot. Hold it longer.','THE DRAW');
      // **Arrows hurt whoever they hit** (the user, 2026-09-21). A companion the traveler shoots
      // and does not kill loses a little of what he thought of you, and says one word about it.
      if(e.type==='ally-hit'&&e.arrow&&e.by==='traveler'&&companions.walksWith(e.id)&&combat.state.allies.find(a=>a.id===e.id)?.active){
        const name=mercenaryById(e.id)?.name??e.id;
        companions.struckByYou(e.id);
        toast(`${name} takes your arrow and turns round. “That was yours. Look where you are shooting.”`,`${name.toUpperCase()} · YOUR ARROW`);
      }
      if(e.type==='dodge'&&questStage===2&&Math.hypot(player.group.position.x-world.training.x,player.group.position.z-world.training.z)<9)practiceDodges++;
      if(e.type==='victory'){
        // **A fight come through together** is what moves a man's regard fastest, and a little
        // more if he was hurt in it and lived (REGARD.fought, src/companions.js). It is counted
        // here rather than where he is placed because this is the one moment that says the fight
        // was survived; a bout never reaches it, so sparring can never be farmed for standing.
        for(const ally of combat.state.allies)
          if(companions.walksWith(ally.id))companions.fought(ally.id,{bled:ally.hp<ally.maxHp});
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
      // A companion who goes down is gone for good, in any fight, anywhere. The first time it
      // happens it must be unmistakable: who, where, and that it is final - here, and in the
      // journal's company page, which reads the same `fallen` list.
      if(e.type==='ally-down'&&companions.walksWith(e.id)){
        const name=mercenaryById(e.id)?.name??e.id;
        const where=world.regionAt(e.x,e.z)?.name??'the road';
        // His weapon lies where he fell, named, until somebody takes it - and if he was
        // carrying the traveler's own traded sword, that is what is lying there.
        const held=mercenaryHeld({id:e.id});
        // **What killed him**, and it is the record the Marshal is answered from, so it has to be
        // the truth even when the truth is the traveler (the user, 2026-09-21). An arrow of his
        // own is named as his own; one from the line beside him is named as that.
        const mine=!!e.arrow&&e.by==='traveler';
        const what=e.arrow?(mine?'Your own arrow':'An arrow from your own line'):enemyWordFor(combat.state.encounterId);
        companions.died(e.id,{where,what,x:e.x,z:e.z,
          weapon:held?.id??null,weaponName:held?.id?(INVENTORY_ITEMS[held.id]?.name??'weapon').toLowerCase():null});
        // **And everyone who saw it drops a rung**, which is the cost of a lie at the muster paid
        // the moment it happens instead: the same mechanism, because it is the same idea - the
        // men who were walking with you know what you did (src/companions.js).
        const saw=mine?companions.costWitnesses(e.id):[];
        showSkillCard({kicker:`${name.toUpperCase()} IS DEAD`,name:`${name} fell in ${where}`,
          note:mine?`Your arrow killed him. It is written down as that, and it is what the Marshal will be told.${saw.length?' Every man who was with you saw it.':''}`
            :'He does not get up, and he will not be at the muster. Nobody in this company comes back.'});
        audio?.effect('player-hit');refreshFoundWeapons();saveRoad(false);}
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
    // **The guard, held.** The straw post does not hit back, so this is measured the way the step
    // is: near the post, while the lesson is set, with the shield actually up - `player.guarding`
    // is what the rules decided this frame and not what the key is doing (src/combat.js).
    if(questStage===2&&lessonSet&&!practiceGuards&&combat.state.player.guarding
      &&Math.hypot(player.group.position.x-world.training.x,player.group.position.z-world.training.z)<9){
      guardHeld+=dt;
      if(guardHeld>=GUARD_SECONDS){practiceGuards=1;audio?.effect('success');
        toast('The shield stays where you put it. Behind it you can see the whole of him and he can see none of you.','OFFICER GLUN · GUARD');}
    } else if(!combat.state.player.guarding)guardHeld=0;
    if(questStage===2&&practiceHits>=2&&practiceGuards>=1&&practiceDodges>=1&&combat.state.player.action==='idle')updateQuest('trained');
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
    show('lesson',mode==='playing'&&questStage<QUEST_DONE);show('practice-progress',questStage===2);
    $('inventory-count').textContent=inventory.items().length;
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
    $('practice-hits').textContent=`${Math.min(2,practiceHits)} / 2 hits`;
    $('practice-guard').textContent=practiceGuards?'✓ Shield held':'0 / 1 guard';
    $('practice-dodge').textContent=practiceDodges?'✓ Dodge tried':'0 / 1 dodge';
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
    // Every step of Chapter 1 has somewhere to be, so the gold on the ground is up for all of
    // them - except where the person it would stand over is already wearing it over their head
    // (`markerFor`, src/quest-markers.js): Jojo on the pier, and Glun until he has set the
    // lesson and sent the traveler to the straw. Two golds for one errand reads as two errands.
    const markerGoal=combat.state.phase==='active'||questStage===1||(questStage===2&&!lessonSet)?null:goal;
    objectiveMarker.visible=!!markerGoal;
    if(markerGoal){objectiveMarker.position.set(markerGoal.x,world.heightAt(markerGoal.x,markerGoal.z)+2.8+Math.sin(elapsed*2.5)*.12,markerGoal.z);objectiveMarker.rotation.y=elapsed*.7;}
    // Beside it, the open one. A stop with a person of his own wears it over his head instead,
    // so the ground marker is only for the places: the Watch, the firepit, Rena, the players' camp.
    const openAt=longWayStop&&!longWayStop.npc?longWayStop.at:null;
    openMarker.visible=!!openAt;
    if(openAt){openMarker.position.set(openAt.x,world.heightAt(openAt.x,openAt.z)+2.8+Math.sin(elapsed*2.5+1.1)*.12,openAt.z);openMarker.rotation.y=elapsed*.7;}
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
      // **Nothing is held while nothing is being played.** `combat.guard` latches the key it was
      // last offered, and it is only offered from inside the branch below - so the defeat panel,
      // a dialogue or the pause menu left the last frame's key held, and the first playing frame
      // after one resolved a blow against a shield the player was no longer asking for
      // (docs/known-issues.md). A hand off the keyboard is a hand off the shield.
      // (A frozen review is still `playing` and is left alone on purpose: `shield-guard` holds
      // the guard by hand and then stops the clock, and clearing it here would lower the shield
      // the picture exists to show.)
      // **And the bow comes down rather than going off.** `combat.draw(false)` is the loose, so
      // this line used to send the arrow: pausing, alt-tabbing (the blur handler opens the pause
      // modal) or a dialogue opening spent a shaft and put it in the air to land while the game
      // was stopped (docs/known-issues.md, round 5). Only a release while the game is being
      // played is a shot; anything that stops the game lowers the bow and keeps the arrow.
      if(mode!=='playing'){combat.guard(false,player.group.rotation.y);combat.lowerBow();}
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
        // The 45 m leash ends a fight for anybody who walks out of it, and it does so with
        // `restorePlayer()`: full health and a full bar. The bar is wind. A traveler who swims
        // out of a fight would come out of it with his breath back and the sea still to cross,
        // and nothing but the geography of where fights happen to be authored keeps that out of
        // reach. So the rule is code: while the water has him, his wind only ever goes down.
        // **Hold V to guard.** The shield is aimed by looking: while it is up he turns to face
        // the way the camera does, so the player chooses which blow it is between him and. The
        // combat module is told every frame and remembers no press of its own.
        //
        // **It is offered before the fight is stepped.** `combat.update` is where blows land, so
        // a guard answered for afterwards answers for the frame that has just been resolved -
        // this frame's key against last frame's blow (docs/known-issues.md).
        refreshShield();const guardKey=!autopilot.active&&keys.has(GUARD_KEY);
        if(guardKey&&p.action==='idle'){const angle=Math.PI+yaw;player.group.rotation.y+=Math.atan2(Math.sin(angle-player.group.rotation.y),Math.cos(angle-player.group.rotation.y))*(1-Math.exp(-14*dt));}
        combat.guard(guardKey,player.group.rotation.y);
        /**
         * **Hold the swing button to draw; let go to loose** (the user's answers, 2026-09-21:
         * no new key). With a bow in his hands the attack button is the draw, and everything
         * else about it is the guard's rule read again - offered every frame, latched nowhere,
         * aimed by looking, and offered *before* the fight is stepped so the arrow leaves on the
         * frame the player let go rather than the one after it.
         */
        const drawKey=ranged()&&!inWater&&!riding.mounted&&(swingHeld||(!autopilot.active&&keys.has('KeyR')));
        if(drawKey&&p.action==='idle'){const angle=Math.PI+yaw;player.group.rotation.y+=Math.atan2(Math.sin(angle-player.group.rotation.y),Math.cos(angle-player.group.rotation.y))*(1-Math.exp(-16*dt));}
        combat.draw(drawKey,player.group.rotation.y);
        const windBefore=combat.state.player.stamina;
        combatClock+=dt;combat.update(dt);
        if(inWater&&combat.state.player.stamina>windBefore)combat.state.player.stamina=windBefore;
        handleCombatEvents();
        // **A loan cannot outlive the bout it was made for**, by any road out of one: the yield
        // either way and the walk-away all go through `spar-over` and are handled above, but a
        // drowning goes through `combat.revive()` and a fight can be ended from outside. This is
        // the belt to that brace, and it is cheap: one null check a frame.
        if(lent&&!(sparring&&combat.state.phase==='active'&&combat.state.encounterId===SPARRING_ID))returnLoan();
        // **Walking away ends the mark**, and so does anything that takes the game out of the
        // practice phase - a real fight beginning, a drowning, a load. Past the bow's own range
        // there is nothing he could be shooting at anyway, so it is not a rule he has to learn.
        if(mark){
          if(combat.state.phase!=='practice')endMark(null);
          else if(Math.hypot(player.group.position.x-mark.at.x,player.group.position.z-mark.at.z)>MARK_WALK)endMark('walked-away');
        }
        // Walk over a spent shaft and it is yours again. No prompt and no key: stooping for an
        // arrow is not a decision (src/archery.js - about two in three survive the landing).
        gatherArrows();
        if(p.action==='attack'||p.action==='dodge'){const angle=p.yaw;player.group.rotation.y+=Math.atan2(Math.sin(angle-player.group.rotation.y),Math.cos(angle-player.group.rotation.y))*(1-Math.exp(-24*dt));}
        const floor=world.heightAt(player.group.position.x,player.group.position.z);
        if(!grounded){verticalSpeed-=17*dt;player.group.position.y+=verticalSpeed*dt;if(player.group.position.y<=floor){player.group.position.y=floor;grounded=true;verticalSpeed=0;}}
        // In the water he floats at the surface rather than walking the seabed: the feet hang a
        // little over a metre down, which puts the head and shoulders above the waterline.
        else player.group.position.y=(!riding.mounted&&floor<WATERLINE)?WATERLINE-SWIM.sink:floor+(riding.mounted?RIDE.seat.up:0);
        {const turned=borderWatch.step(before,player.group.position,elapsed);if(turned.refused){player.group.position.x=before.x;player.group.position.z=before.z;if(turned.toast)toast(turned.toast,CLOSED_BORDER_TITLE);}}
        swimTick(dt,before);
        movement=Math.hypot(player.group.position.x-before.x,player.group.position.z-before.z)/dt;
        // **The road actually walked together** (REGARD.perMinute, src/companions.js): the slow
        // honest thing that moves a rung, paid by the metre rather than by the minute so that
        // standing in a village all afternoon is not friendship. It is the only reason anybody
        // in the company ever gets past `unfamiliar`, and therefore the only reason a lesson is
        // ever owed - before this nothing in the game moved regard past the asking at all.
        if(movement>.5&&combat.state.phase!=='active')for(const id of companions.walking)companions.travelled(id,dt);
        if(riding.mounted)riding.ride({x:player.group.position.x-Math.sin(mountHeading)*RIDE.seat.forward,z:player.group.position.z-Math.cos(mountHeading)*RIDE.seat.forward},mountHeading,movement);
        if(questStage===0&&player.group.position.z<21)updateQuest('ashore');
        // **The goblins at the woodland bell are off the slate** (`greenway`, src/quest-slate.js).
        // The fight is still built, still tested and still here; nothing walks into it.
        if(questLive('greenway')&&questStage===3&&player.group.position.x< -46&&player.group.position.x> -68&&Math.abs(player.group.position.z-29)<8)startAmbush();
        if(questStage===QUEST_DONE&&!meadowCleared&&journey.state.courierAccepted&&combat.state.phase!=='active'&&Math.hypot(player.group.position.x-meadowEncounter.center.x,player.group.position.z-meadowEncounter.center.z)<14){
          if(combat.startEncounter(meadowEncounter)){toast('Two raiders among the field walls. Give their swings room.','THE AVREL CLEARING · WATCH THE AMBER TELLS');audio?.effect('bell');}
          else toast('The raiders hold off. Step back to the road and come at the clearing again.','THE AVREL CLEARING');
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
      player.animate(walkTime,riding.mounted?0:movement,grounded,{...weaponPose,armed:weaponPose.weaponUsable&&!riding.mounted&&!inWater,fishing:mode==='fishing',swimming:inWater,riding:riding.mounted?{pace:movement}:null,
        // The shield is up in the picture exactly when it is up in the rules: `player.guarding`
        // is what `combat.guard` decided this frame, not what the key is doing.
        guarding:!!combat.state.player.guarding,
        // And so is the bow. `combat.drawn` is how far it is *actually* drawn, which needs an
        // arrow, the wind and an idle body - never the button. The shaft goes on the string with
        // it (src/characters.js), so a man standing about with a bow is not nocked.
        draw:combat.drawn});
      if(riding.owned){
        if(!riding.mounted&&mode==='playing')riding.update(dt,player.group.position,mountFooting);
        placeOwnHorse();const away=riding.distanceTo(player.group.position);(riding.developerMount?devHorse:ownHorse).group.visible=away<220;
        refreshCompanyHorses();
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
      // The horizon belongs to the country the traveler is *told* they are in, so it reads
      // regionAt and not hexOwnerAt, and open country keeps the default. It comes round over
      // a second or two when they walk over a border and snaps when they are put down
      // somewhere - a review view, a travel button - which is what the position is for
      // (src/region-sky.js). No region declares a sky yet, so today this changes nothing.
      {const s=sky.step(world.regionAt(player.group.position.x,player.group.position.z),dt,player.group.position);
        scene.background.setHex(s.background);scene.fog.color.setHex(s.fog);scene.fog.density=s.density;}
      if(mode==='fishing')world.setFishingOrigin(player.fishingTip());
      // The roster counts arrivals from the landing, not from the title screen or the sail in.
      if(!['opening','pause','arriving'].includes(mode)&&!reviewFrozen)playSeconds+=dt;
      placeMercenaries();
      // Which stop wears the open gold this frame: the HUD, the npc marks and both charts read it.
      longWayStop=longWayNext();
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
          // **`scripted` is the cutscene saying: he is mine this frame.** The npc loop below puts a
          // standing character on the ground, and the ground under the bow of a boat halfway across
          // the bay is the seabed - six metres under him - so he sailed in submerged and shot up out
          // of the water the moment the boat crossed the shoreline. That is the glitchy walk
          // (the user, 22 September 2026). His pace is measured off the place he was in last frame
          // and only while the sequence says he is on his own feet: aboard he crosses the bay at the
          // boat's speed without taking a step, and coming ashore he walks the last seven metres.
          if(mate){const c=s.companion,was=mate.actor.group.position;
            mate.scriptedPace=c.walking&&dt>0?Math.min(Math.hypot(c.x-was.x,c.z-was.z)/dt,ASHORE_PACE):0;
            mate.scripted=true;
            was.set(c.x,c.y+(c.aboard?bob:0),c.z);mate.actor.group.rotation.y=c.yaw;mate.actor.group.visible=true;mate.hidden=false;world.npcPositions[mate.id]={x:c.x,z:c.z};}
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
      const lusciaDestinations=questStage===QUEST_DONE&&luscia.state.started?[...luscia.view().destinationIds,...moros.view().destinationIds,...border.view().destinationIds,...aftermath.view().destinationIds,...(horseWaiting({inventory,riding})?[OSTLER_NPC.id]:[])]:[];
      const markerView={questStage,busy:combat.state.phase==='active',heardDoom,
        ids:{harbourmaster:HARBOURMASTER,instructor:INSTRUCTOR.id,warden:'warden',doomsayer:'doomsayer',acornCook:'acorn-cook',pondFisher:'pond-fisher',forestStory:FOREST_STORY_NPC.id,gardenKeeper:GARDEN_KEEPER.id,birdWatcher:BIRD_WATCHER.id,vintner:VINTNER.id},
        arcDestinations:questStage===QUEST_DONE?journey.view().destinationIds:[],chapterDestinations:lusciaDestinations,
        // Hollis's copper, which is on whenever his bridge is down and is nobody's step.
        bridge:journey.state.bridge,
        longWay:longWayStop?.npc?[longWayStop.npc]:[],
        acornQuestOpen:acornQuest.status!=='complete',feederWantsCook:birding.task()?.target==='acorn-cook',hasRod:inventory.has('fishing-rod'),
        birdingLearned:birding.met,archaeologyReport:archaeology.task()?.stage==='report',
        forestOpen:!forestStory.state.bundleReturned||(forestHideout.state.recovered&&!forestHideout.state.returned),wineRecommended:wine.quest==='recommended'};
      const beggarStep=smiths&&mode==='playing'&&combat.state.phase!=='active'?beggar.update(dt,{position:player.group.position,here:smiths.actor.group.position}):null;
      if(beggarStep?.line)toast(beggarStep.line,'SMITHS');
      currentNPC=null;let nearest=3.3;const talkers=[];
      // The man you are sparring with is drawn by the fight, not by the road, exactly as a
      // villager caught in the raid is: otherwise he is standing in two places at once
      // (tests/no-avatar-twins.test.js), because `placeCompanion` holds a companion clear of
      // any TEACHING_FIGHT and a bout is one.
      if(sparring){const npc=npcById.get(sparring.id);
        const him=combat.state.phase==='active'?combat.state.enemies.find(one=>one.id===`spar-${sparring.id}`):null;
        if(npc&&him){npc.hidden=true;npc.lastFight={x:him.x,z:him.z};}}
      else for(const id of mercenaryIds){const npc=npcById.get(id);
        if(npc?.hidden&&npc.lastFight){npc.actor.group.position.set(npc.lastFight.x,world.heightAt(npc.lastFight.x,npc.lastFight.z),npc.lastFight.z);npc.lastFight=null;npc.hidden=false;}}
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
        // **A figure the cutscene is holding is not steered, not grounded and not marked**: his
        // place, his height and his facing were all written a few lines up by the sequence that
        // owns him, and everything below this would argue with them.
        if(npc.scripted&&mode==='arriving'&&opening){npc.shownPace=npc.scriptedPace??0;
          npc.actor.animate(walkTime+2,npc.shownPace,true,{});npc.marker.visible=false;continue;}
        // Ed in the water: no path, no colliders and no ground under him. He floats at the
        // surface exactly as the traveler does, and swims a straight line for the strand.
        if(npc.swimming){pos.set(npc.swimming.x,WATERLINE-SWIM.sink,npc.swimming.z);npc.actor.group.rotation.y=npc.swimming.yaw;}
        const alarm=!npc.cat&&combat.state.phase==='active'&&Math.hypot(home.x-player.group.position.x,home.z-player.group.position.z)<65;
        // Nobody strolls about beside a fight: a villager near one backs off and watches from a distance.
        const fleeing=!!fightAt&&civilian(npc)&&Math.hypot(home.x-fightAt.x,home.z-fightAt.z)<26;
        // Past sixty-two metres somebody is thirty pixels tall and seventeen to twenty-four draw
        // calls; there he is one mesh instead (src/figure-lod.js). `npc.marker.visible` is last
        // frame's, which is soon enough for a mark that is about to be looked at.
        {const detail=figureDetail(npc.detail,Math.hypot(pos.x-player.group.position.x,pos.z-player.group.position.z),
            {kind:npc.dog?'dog':npc.cat?'cat':npc.horse?'horse':npc.ogre?'ogre':'person',talking:activeDialogue?.npc===npc,
            // Anybody walking with you is drawn in full, wherever he is in the file. `escorting`
            // is the pacing flag and the fight-hold clears it deliberately; `walkingWith` is the
            // other question, and the tenth man at sixty-two metres is not a peg either.
            escorting:!!npc.escorting||!!npc.walkingWith,
              fighting:alarm||!!npc.lastFight,fleeing,marked:npc.marker.visible,swimming:!!npc.swimming,posed:!!npc.sitting||!!npc.posture,made:!!npc.make});
          if(detail!==(npc.detail??'full'))showFigure(npc,detail);}
        let destX=home.x,destZ=home.z;
        if(fleeing){const dx=home.x-fightAt.x,dz=home.z-fightAt.z,d=Math.hypot(dx,dz)||1;destX=fightAt.x+dx/d*26;destZ=fightAt.z+dz/d*26;}
        const dHome=Math.hypot(destX-pos.x,destZ-pos.z);let pace=0;
        if(mode==='playing'&&dHome>(npc.stride?0:.1)&&!npc.swimming){const move=Math.min(dHome,dt*(fleeing?Math.max(3.4,npc.pace||0):npc.pace||2.4)),bx=pos.x,bz=pos.z;const bodyR=npc.cat?BODY.cat:npc.dog?BODY.dog:npc.horse?BODY.horse:npc.ogre?BODY.ogre:BODY.person;const moverWorld=npc.cat?catWorld:npcWorld;moverWorld.moving(pos,bodyR);stepAround(pos,(destX-pos.x)/dHome*move,(destZ-pos.z)/dHome*move,moverWorld,bodyR,npc.id.length%2?1:-1);pos.y=world.heightAt(pos.x,pos.z)+(npc.lift??0);pace=Math.hypot(pos.x-bx,pos.z-bz)/dt;if(pace>.1)npc.actor.group.rotation.y=Math.atan2(destX-pos.x,destZ-pos.z);}
        // A man in the saddle who has ARRIVED is still in the saddle. The line above only
        // runs while he is moving, so a mounted companion who reached his place sank to the
        // ground and left his horse standing beside him - which is what the render showed, four
        // times over. His height is a fact about him, not about whether he is walking.
        else if(!npc.swimming)pos.y=world.heightAt(pos.x,pos.z)+(npc.lift??0);
        if(pace<=.1&&npc.face&&!npc.swimming){const turn=Math.atan2(npc.face.x-pos.x,npc.face.z-pos.z)-npc.actor.group.rotation.y;npc.actor.group.rotation.y+=Math.atan2(Math.sin(turn),Math.cos(turn))*(1-Math.exp(-4*dt));}
        // A man in the saddle sits in it: his legs do not walk, and the pace goes to the horse
        // under him instead (refreshCompanyHorses).
        npc.shownPace=pace;
        if(npc.detail!=='stand-in')npc.actor.animate(walkTime+2,npc.swimming?swimSpeed(WORD_LEVEL):npc.mounted?0:pace,true,{alert:alarm,sitting:!!npc.sitting&&pace<.1,posture:npc.posture,falconer:!!npc.falconer,swimming:!!npc.swimming,riding:npc.mounted?{pace}:null});
        // Talk range is centre to centre, so a body wider than a person's eats into it: the ogre
        // is stopped a metre out by his own bulk before the traveler is anywhere near him.
        const reachIn=npc.ogre?BODY.ogre-BODY.person:0;
        const d=pos.distanceTo(player.group.position)-reachIn+(npc.dog||npc.cat?1.5:npc.id===BEGGAR_NPC.id?1.1:0);if(d<nearest&&!(npc.escorting&&currentHideoutSite))talkers.push({npc,d});
        // A figure is twenty-odd moving parts, and each casts its own shadow: near the traveler that is worth drawing, across a town square it is not.
        {const shadows=d<30;if(npc.shadows!==shadows){setShadowCasting(npc.actor,shadows);npc.shadows=shadows;}}
        // What kind of gold somebody wears changes at most once in a game, so the mark is only rebuilt when it does.
        const mark=markerFor(npc.id,markerView),grade=markerGrade(mark);
        if(grade&&npc.markerKind!==grade){scene.remove(npc.marker);npc.marker=makeQuestMarker(mark.kind,{open:mark.open});npc.markerKind=grade;scene.add(npc.marker);}
        npc.marker.visible=!!grade;
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
      watchCompanion();
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
        // **Her own clock, not the session's.** Everything else about this arrival is a function
        // of `playSeconds` - where she is, which way she heads, how far the two at the rail lean -
        // and src/rebel-crew.js says in as many words that a game reloaded mid-arrival shows the
        // right pose without anything being saved. Handing her `elapsed` broke exactly that half
        // of it: the helmsman's tiller, everybody's sway and the man at the sail were on a clock
        // that starts at nought every time the game is opened, so the same second looked different
        // after a reload - up to fifteen degrees of the helmsman.
        if(seen){rebelShip.group.position.set(pose.x,SEA_LEVEL+.04,pose.z);rebelShip.group.rotation.y=pose.yaw;rebelShip.update(playSeconds,pose);}
        if(mode==='playing'){const owed=wordToastAt(playSeconds,wordSaid);
          if(owed){wordSaid=owed.key;toast(owed.line,owed.title);if(owed.key!=='turns')audio?.effect('bell');if(owed.key==='ashore')saveRoad(false);}}
        // A boat in. Two of the five cannot be seen from where the player is and the bell is
        // silent until somebody clicks Sound, so the landing is said rather than left to be
        // noticed. Reloading past one says nothing: landingSaid is derived from the clock.
        if(mode==='playing'){const boat=landingAt(playSeconds,landingSaid);
          if(boat){landingSaid=boat.key;audio?.effect('bell');
            const mate=companionBeside();
            toast(mate?boat.said:boat.caption,mate?`${mate.name.toUpperCase()} \u00b7 ${boat.title}`:boat.title);}}
        // Somebody of the company going past. He is recorded whether anybody is beside you to
        // remark on it or not, because the muster asks where you were and not who told you.
        if(mode==='playing'&&companionOffTheClock){
          const seen=longRoad.notice(company.placements(playSeconds),player.group.position,point=>subregionsAt(point.x,point.z)[0]??null);
          const mate=companionBeside();
          if(seen.length&&mate)toast(`${seen[0].name}, going past. ${seen.length>1?`And ${seen.length-1} more of us with him.`:'That is one more of us in this country than there was.'}`,`${mate.name.toUpperCase()} \u00b7 ONE OF OURS`);
          if(seen.length)saveRoad(false);}
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
      currentFoundWeapon=mode==='playing'&&combat.state.phase!=='active'?foundWeapons.nearest(player.group.position.x,player.group.position.z):null;
      show('found-weapon-prompt',!!currentFoundWeapon);
      if(currentFoundWeapon)$('found-weapon-label').textContent=`Take up ${currentFoundWeapon.name}`;
      currentFruit=mode==='playing'?woodlandLife.nearestFruit(player.group.position,2):null;
      currentMushroom=mode==='playing'&&combat.state.phase!=='active'?mushrooms.nearest(player.group.position,2.2):null;
      currentPlant=mode==='playing'&&combat.state.phase!=='active'&&!currentMushroom?flora.nearest(player.group.position,2.2):null;
      currentStone=mode==='playing'&&combat.state.phase!=='active'&&!currentMushroom&&!currentPlant?stones.nearest(player.group.position,2.2):null;
      // A row at the commons and a kept tree at Applegarth: the two things farming is done at.
      {const working=mode==='playing'&&combat.state.phase!=='active';
        currentRow=working?FARM_ROWS.map(row=>farming.rowState(row.id,playSeconds)).find(row=>Math.hypot(row.x-player.group.position.x,row.z-player.group.position.z)<2.4)??null:null;
        currentAppleTree=working&&!currentRow?ORCHARD_TREES.map(tree=>farming.treeState(tree.id,playSeconds)).find(tree=>Math.hypot(tree.x-player.group.position.x,tree.z-player.group.position.z)<2.4)??null:null;}
      currentDig=mode==='playing'&&combat.state.phase!=='active'&&!currentMushroom&&!currentPlant&&!currentStone?digs.nearest(player.group.position):null;
      currentVine=mode==='playing'&&combat.state.phase!=='active'&&!currentDig?vinePlateNear(player.group.position):null;
      currentTree=mode==='playing'&&combat.state.phase!=='active'&&!currentMushroom&&!currentPlant&&!currentStone?specimenTrees.nearest(player.group.position):null;
      nearOldTree=mode==='playing'&&Math.hypot(player.group.position.x-TALKING_TREE.x,player.group.position.z-TALKING_TREE.z)<TALKING_TREE.trunkRadius*1.6+2.4;
      if(mode==='playing'){oldTreeView.pose(oldTree.update(dt,{x:player.group.position.x,z:player.group.position.z}));specimenTrees.update(player.group.position);}
      if(mode==='playing'){if(jimson.tick(Math.min(1,Math.max(0,elapsed-jimsonClock))))jimsonNight();jimsonClock=elapsed;}
      if(mode==='playing'){if(fightAt&&refugees.positions().some(walker=>Math.hypot(walker.x-fightAt.x,walker.z-fightAt.z)<60))refugeeHold+=dt;refugees.setClock(playSeconds-refugeeHold);if(REFUGEES_ENABLED)for(const walker of refugees.positions()){world.npcPositions[walker.id]={x:walker.x,z:walker.z};const npc=npcById.get(walker.id);if(npc)npc.pace=walker.pace;}}
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
      const prompting=mode==='playing'&&(!!currentNPC||currentFeederHook||!!currentMushroom||!!currentPlant||!!currentStone||!!currentDig||!!currentVine||!!currentCask||!!currentTree||!!currentChop||!!currentBench||!!currentPlot||!!currentPost||nearOldTree||!!currentHideoutSite||!!currentForestSite||!!currentRegionalSite||!!currentLusciaSite||!!currentMorosSite||!!currentJourneySite||!!currentFire||nearFishing||!!currentAcorn||!!currentStick||!!currentFruit||!!currentRow||!!currentAppleTree||nearRepair||nearBorder)&&combat.state.phase!=='active';show('interaction',prompting);
      if(currentNPC)$('interaction-label').textContent=currentNPC.greet?currentNPC.greet:currentNPC.dog?'Greet the dog':currentNPC.cat?'Greet the cat':'Speak with '+currentNPC.name;else if(currentFire)$('interaction-label').textContent='Tend the fire · cooking';else if(nearFishing)$('interaction-label').textContent=inventory.has('fishing-rod')?'Cast a line':`Fishing bank · ask ${currentFishingSpot?.id==='reedwater'?'Hollis':'Bran'} for a rod`;else if(nearRepair)$('interaction-label').textContent='Repair weapons · free';else if(currentFruit)$('interaction-label').textContent='Gather ripe pawpaw · +25 health';else if(currentStick)$('interaction-label').textContent='Gather fallen stick';else if(currentAcorn)$('interaction-label').textContent='Gather acorn';else if(nearBorder)$('interaction-label').textContent='Read the border notice';
      if(currentJourneySite&&!currentNPC)$('interaction-label').textContent=journey.availableActions().find(action=>action.objectiveId===currentJourneySite.id)?.label||(['sticks','fruit'].includes(currentJourneySite.type)?'Gather '+currentJourneySite.name:currentJourneySite.name);
      if(currentForestSite&&!currentNPC)$('interaction-label').textContent=currentForestSite.prompt;
      if(currentRegionalSite&&!currentNPC)$('interaction-label').textContent=currentRegionalSite.prompt;
      if(currentLusciaSite&&!currentNPC)$('interaction-label').textContent=currentLusciaSite.prompt;
      if(currentMorosSite&&!currentNPC)$('interaction-label').textContent=currentMorosSite.prompt;
      if(currentFeederHook&&!currentNPC)$('interaction-label').textContent='Hang the hummingbird feeder';
      if(currentRow&&!currentNPC)$('interaction-label').textContent=!farming.met?'A drilled row, and nobody has shown you what to do with it'
        :currentRow.stage==='ripe'?`Reap the ${currentRow.cropName.toLowerCase()} · ${currentRow.name.toLowerCase()}`
        :currentRow.stage==='sown'?`${currentRow.cropName} · ${Math.ceil(currentRow.left)} seconds`:`Sow ${currentRow.name.toLowerCase()}`;
      if(currentAppleTree&&!currentNPC)$('interaction-label').textContent=!farming.met?'An apple tree somebody keeps'
        :currentAppleTree.stage==='fruiting'?'Pick an Avrel apple':`Picked out · bearing again in ${Math.ceil(currentAppleTree.left)} seconds`;
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
      // A prompt that is off the screen must not leave its words behind. Opening a conversation
      // hides this panel on the spot (openDialogue), and everything that writes the label is
      // gated on play, so the HUD otherwise keeps offering whatever it offered last. No player
      // reads a hidden panel; a harness does, and a stale “Speak with Iven” sent two hunts wrong.
      if(!prompting)$('interaction-label').textContent='';
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
        const actualDistance=cameraPullIn(cameraFocus,viewDistance,yaw);
        cameraTarget.set(cameraFocus.x+Math.sin(yaw)*actualDistance*Math.cos(viewPitch),cameraFocus.y+Math.sin(viewPitch)*actualDistance,cameraFocus.z+Math.cos(yaw)*actualDistance*Math.cos(viewPitch));cameraTarget.y=Math.max(cameraTarget.y,world.heightAt(cameraTarget.x,cameraTarget.z)+1.2);
      }
      camera.position.lerp(cameraTarget,1-Math.exp(-5*dt));
      cameraFocus.x+=Math.sin(combatClock*73)*shake;cameraFocus.y+=Math.sin(combatClock*59)*shake*.45;camera.lookAt(cameraFocus);
      shake=combatView.update(mode==='playing'&&!reviewFrozen?dt:0,combatClock,combat.state,player.group.position,mode==='playing');
      if(frameCount%15===0){sun.target.position.copy(player.group.position);sun.position.copy(player.group.position).add(new THREE.Vector3(-45,90,38));}
      // Compass bearings are true to the chart: today's road runs south-west across Drent, not north.
      const {index:headingIndex,labels:headings}=compassHeading(yaw,HEX_WORLD_TRANSFORM);
      [...$('compass').children].slice(0,5).forEach((node,i)=>node.textContent=headings[(headingIndex+2-i+8)%8]);
      mapClock+=dt;if(mapClock>.1){updateHUD();drawMinimap(map,{world,position:player.group.position,goal:destination(),openGoal:longWayTarget(),combat:combat.state,angle:player.group.rotation.y,time:elapsed,discoveries,tracked:trackedPlace(),bird:birdWatch,northOffset:HEX_WORLD_TRANSFORM.northOffset});mapClock=0;}
      renderer.render(scene,camera);requestAnimationFrame(render);
    // Recorded before `fail`, which is otherwise untouched: the loading screen goes, the fatal
    // panel comes up, and the loop is NOT rescheduled, exactly as it was.
    }catch(error){frameErrors.note(error,frameCount);fail(error);}
  }
  requestAnimationFrame(render);
  setTimeout(()=>{$('loading').style.opacity='0';setTimeout(()=>show('loading',false),850);},250);

  if(new URLSearchParams(location.search).has('test')) {
    const state=()=>({frameErrors:frameErrors.view(),mode,testingEnabled,heardDoom,mapTutorial:mapTutorial.step,playSeconds,mercenaries:company.summary(playSeconds),journey:journey.state,journeyView:journey.view(),campaign:campaign.view(),luscia:luscia.view(),burying:burying.snapshot(),moros:moros.view(),border:border.view(),autoplay:autopilot.active,mounted:riding.mounted,retries:retriesTaken,meadowCleared,region:world.regionAt(player.group.position.x,player.group.position.z).id,campcraft:campcraft.state,questStage,practiceHits,practiceDodges,inventory:inventory.items(),weapons:weapons.snapshot(),sticks:inventory.count('forest-stick'),pawpaws:inventory.count('pawpaw'),acorns:inventory.count('acorn'),sideQuest:acornQuest.status,chapter:chapterProgress(storyState()).number,ardryLetters:renaLetters.snapshot(),ardryFriendship:renaLetters.friendship('rena-lorn'),birding:birding.snapshot(),lakota:lakota.snapshot(),swimming:swimming.view(),fishing:fishing.snapshot(),mycology:mycology.snapshot(),mushroomSites:mushrooms.state().sites.length,botany:botany.snapshot(),pipe:pipe.snapshot(),jimson:jimson.snapshot(),katy:katy.snapshot(),troy:troy.snapshot(),vineyard:vineyard.snapshot(),hunt:hunt.snapshot(),light:light.snapshot(),bosco:bosco.snapshot(),heist:heist.snapshot(),plantSites:flora.state().sites.length,geology:geology.snapshot(),archaeology:archaeology.snapshot(),wine:wine.snapshot(),cooking:cooking.snapshot(),wineAttic:wineAttic.snapshot(),puck:puck.snapshot(),chameleon:chameleon.snapshot(),troupe:troupe.snapshot(),brandy:brandy.snapshot(),salt:salt.snapshot(),woodcutting:wood.snapshot(),construction:building.snapshot(),woodlot:WOODLOT_TREES.filter(t=>!wood.standing(t.id)).map(t=>t.id),stoneSites:stones.state().sites.length,oldTree:oldTree.view(),specimenTrees:specimenTrees.state().trees.length,refugees:refugees.snapshot(),fallen:fallen.snapshot(),refugeesArrived:refugees.arrived,skills:skills.view(),birds:drentBirds.state(),birdWatch,birdPointer:birdPointer.visible,chart:mapFog.snapshot(),cartography:cartography.snapshot(),chartRevealed,lysaFriendship:acornQuest.friendship,selectedItem:inventory.selectedId(),phase:combat.state.phase,hp:combat.state.player.hp,playerAction:combat.state.player.action,enemies:combat.state.enemies.map(e=>({id:e.id,hp:e.hp,action:e.action,progress:e.progress,x:e.x,z:e.z})),position:player.group.position.toArray(),discoveries:[...discoveries],frames:frameCount,averageFrameMs:Math.round(1000*frameDeltas.reduce((a,b)=>a+b,0)/frameDeltas.length),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles});
    const focusedRoadHooks=()=>({world,player,journey,inventory,weapons,campcraft,combat,checkpoint,journeyAct,saveRoad,continueRoad,
      frames:async(count=1)=>{for(let i=0;i<count;i++)await new Promise(resolve=>requestAnimationFrame(resolve));},
      // The opening sequence, for a harness that would rather not sit through forty-four seconds.
      openingState:()=>opening&&stateAt(openingTime,{variant:opening.id,companion:opening.companion}),
      advanceOpening:seconds=>{openingTime+=seconds;},
      openingBells:()=>openingBells,
      prepare:()=>{questStage=QUEST_DONE;practiceHits=2;practiceDodges=1;lessonSet=true;cartography.learn();testingEnabled=false;inventory.grant('harbor-letter');inventory.grant('road-token');
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
      prepareHideout:(stage=QUEST_DONE)=>{forestHooks().prepareVillage();questStage=stage;journey.restore(createJourney().snapshot());if(stage>=QUEST_DONE)journey.start();reviewFrozen=false;reviewTarget=null;forestHideout.restore();syncHideout();
        if(stage>=2)inventory.grant('harbor-letter');if(stage>=6)inventory.grant('road-token');if(stage>=3){practiceHits=2;practiceDodges=1;lessonSet=true;cartography.learn();}weapons.repair();
        const p=FOREST_HIDEOUT_QUEST.approach;player.group.position.set(p.x,world.heightAt(p.x,p.z),p.z);yaw=0;refreshQuest();settleCamera();},
      hideoutEncounter});
    const localMapHooks=()=>({...forestHooks(),trailMap,localMapModel,trackPlace,clearTrailPin,trackedPlace,openLocalMap,discoverySet:discoveries,
      normalSnapshot:()=>({questStage,position:player.group.position.toArray(),inventory:inventory.items().map(id=>({id,quantity:inventory.count(id)})),weapons:weapons.snapshot(),journey:journey.snapshot(),forestStory:forestStory.snapshot(),forestHideout:forestHideout.snapshot(),discoveries:[...discoveries].sort(),health:combat.state.player.hp,checkpoint:checkpoint.read().data}),
      prepareLocalMap:()=>{forestHooks().prepareVillage();discoveries.clear();forestStory.restore();forestHideout.restore();journey.restore(createJourney().snapshot());syncForest();syncHideout();
        trackedPlaceId=null;reviewFrozen=false;reviewTarget=null;player.group.visible=true;show('modal-backdrop',false);show('dialogue',false);
        player.group.position.set(-15,world.heightAt(-15,29),29);yaw=Math.PI/2;pitch=.4;distance=targetDistance=9;refreshQuest();settleCamera();}});
    const regionalHooks=()=>({...forestHooks(),regionalLife,regionalAct,farming:farming.view(playSeconds),teachFarming:()=>{const first=farming.learn().first;if(first){toast('Farming, level 1. Four rows at the commons: sow, walk away, come back. Barley is four minutes.','ENNA TAUGHT YOU TO FARM');refreshSkillsSheet();saveRoad(false);}},localMapModel,openLocalMap,trackPlace,
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
      camera:()=>({position:camera.position.toArray().map(v=>+v.toFixed(2)),focus:cameraFocus.toArray().map(v=>+v.toFixed(2)),yaw:+yaw.toFixed(2),pitch:+pitch.toFixed(2),distance:+distance.toFixed(2),
        // What the camera was given and what it actually got: the difference is whatever it was
        // pulled in against, and it is the difference that tells you the shot is wrong.
        stoodBackBy:+cameraPullIn(cameraFocus,distance,yaw).toFixed(2),mode,
        // Every link in the company's chain, so one render says which of them is broken rather
        // than costing another guess: does he own a horse, is he on it, who does the companions
        // module say walks with him, who did the mercenary company actually place, and for each
        // of them - where he is, whether he is drawn, whether he is up, and whether his horse
        // exists and is in the frame.
        guard:{up:!!combat.state.player.guarding,shield:!!gear.wearing('hand'),phase:combat.state.phase,action:combat.state.player.action,stamina:Math.round(combat.state.player.stamina),cost:arms?arms.margins().guardCost:null,shielded:document.body.classList.contains('shielded'),
        // What is on the screen, not what was decided: `up` beside a hip-height buckler is a bug.
        buckler:bucklerDrawn()},
        /**
         * The bow: what is in his hand, how far it is actually drawn, whether the shaft is on the
         * string *in the scene*, how many arrows he has, what is in the air and what is lying on
         * the ground. Numbers rather than intentions - "drawing: true" beside a nocked arrow that
         * was never built would read as a working bow.
         */
        archery:(()=>{const bow=heldWeapon()?.ranged?heldWeapon():null;
          const nocked=player.group.getObjectByName?.('Nocked arrow')??null;
          const jerry=combat.state.allies.find(one=>one.kind==='archer')??null;
          return{held:heldWeapon()?.id??null,bow:!!bow,drawn:+combat.drawn.toFixed(2),
            drawing:!!combat.state.player.drawing,quiver:inventory.count(BOW.arrow),
            nocked:nocked?{drawn:nocked.visible,at:[+nocked.getWorldPosition(new THREE.Vector3()).y.toFixed(2)]}:null,
            flying:combat.state.arrows.length,onTheGround:spentArrows.length,
            archerAlly:jerry?{id:jerry.id,action:jerry.action,progress:+(jerry.progress??0).toFixed(2),
              apart:+Math.hypot(jerry.x-player.group.position.x,jerry.z-player.group.position.z).toFixed(1),
              off:+Math.min(...combat.state.enemies.filter(one=>one.active).map(one=>Math.hypot(one.x-jerry.x,one.z-jerry.z))).toFixed(1)}:null};})(),
        /**
         * The file, if a fight is on: who is actually standing with him, told apart into the
         * friends who came and the soldiers the army assigned (src/file-fill.js). Numbers rather
         * than intentions - "six were assigned" beside four men on the field is the bug the
         * hunter warned about, and this is what would say so.
         */
        line:(()=>{if(combat.state.phase!=='active')return null;
          const ours=combat.state.allies;
          const fill=ours.filter(one=>one.id.startsWith('file-fill-'));
          return{fight:combat.state.encounterId,army:isArmyBattle(combat.state.encounterId),side:armySide(),
            allies:ours.length,companions:fileOrder.filter(id=>!fallen.has(id)).length,
            assigned:fill.length,wanted:fillCount({walking:fileOrder.filter(id=>!fallen.has(id)).length}),floor:FILE_FLOOR,
            drawn:fill.filter(one=>one.hp>0).length,
            at:fill.map(one=>[+one.x.toFixed(1),+one.z.toFixed(1)])};})(),
        // The bout, if one is on: who, in what family, how high it pays, what he can take and
        // what is left of it, and whether his road body has actually been taken off the ground.
        // Numbers, not intentions - a flag saying "sparring" would not have caught a twin.
        teaching:(()=>{if(!sparring)return null;const him=combat.state.enemies.find(one=>one.id===`spar-${sparring.id}`)??null,npc=npcById.get(sparring.id);
          return{with:sparring.id,family:sparring.family,ceiling:sparring.ceiling,encounter:combat.state.encounterId,phase:combat.state.phase,
            bout:combat.state.encounterId===SPARRING_ID,heldOut:[...TEACHING_FIGHTS].includes(combat.state.encounterId),allies:combat.state.allies.length,
            him:him?{at:[+him.x.toFixed(1),+him.z.toFixed(1)],hp:Math.round(him.hp),maxHp:Math.round(him.maxHp),action:him.action,active:!!him.active,
              apart:+Math.hypot(him.x-player.group.position.x,him.z-player.group.position.z).toFixed(2)}:null,
            roadBody:{drawn:!!npc?.actor.group.visible,hidden:!!npc?.hidden},
            // The loan: what is in his hand against what he owns, what the fight was actually
            // handed, and that none of it is in the satchel. A flag saying "lent" would not have
            // caught a pike that swung in a doorway because the feel never reached combat.
            loan:lent?{lent:lent.weapon??'shield',own:weapons?.equippedId??null,
              held:heldWeapon()?.id??null,usable:!!heldWeapon()?.usable,
              feel:lent.weapon?{tempo:heldWeapon()?.tempo??null,arc:+(heldWeapon()?.arc??0).toFixed(3),room:heldWeapon()?.room??null}:null,
              inSatchel:!!lent.weapon&&inventory.has(lent.weapon),shield:!!lent.shield&&!gear.wearing('hand')}:null,
            given:teachers?teachers.given(sparring.id):0,level:TEACHERS[sparring.id]?.level??null,hp:Math.round(combat.state.player.hp)};})(),
        company:{owned:riding.owned,mounted:riding.mounted,grounded,seat:+player.group.position.y.toFixed(2),ground:+world.heightAt(player.group.position.x,player.group.position.z).toFixed(2),horse:riding.horse?[+riding.horse.x.toFixed(1),+riding.horse.z.toFixed(1)]:null,
          mountBlock:riding.mountBlock(player.group.position,{fighting:combat.state.phase==='active',busy:!grounded||combat.state.player.action!=='idle'}),
          walking:companions.companions.map(one=>one.id),placed:[...(company.companionIds??[])],file:[...fileOrder],
          men:fileOrder.map(id=>{const npc=npcById.get(id),at=npc?.actor.group.position,horse=companyHorseActors.get(id);
            return{id,known:!!npc,at:at?[+at.x.toFixed(1),+at.z.toFixed(1)]:null,drawn:!!npc?.actor.group.visible,
              walkingWith:!!npc?.walkingWith,up:!!npc?.mounted,detail:npc?.detail??null,
              horse:horse?(horse.group.visible?(horse.ridden?'ridden':'picketed'):'hidden'):'none'};})}}),
      // Performance: what is drawn and how much there is (main.cjs --perf-review), and render timing once asked for.
      perf:()=>{let objects=0,meshes=0;scene.traverse(o=>{objects++;if(o.isMesh)meshes++;});const info=renderer.info;
        return{calls:info.render.calls,triangles:info.render.triangles,geometries:info.memory.geometries,textures:info.memory.textures,programs:info.programs?.length??0,objects,meshes,
          npcs:npcData.length,visibleNpcs:npcData.filter(n=>n.actor.group.visible).length,colliders:world.colliders.length,shadows:renderer.shadowMap.enabled,pixelRatio:renderer.getPixelRatio(),size:renderer.getSize(new THREE.Vector2()).toArray()};},
      // What the last frame drew, and who was in it: the figures drawn, the ones near enough to cast their own
      // shadow (thirty metres, below), and how many meshes that is either way (main.cjs --draw-review).
      draws:()=>{const p=player.group.position,info=renderer.info,drawn=npcData.filter(n=>!n.hidden&&!n.fallen&&n.actor.group.visible);
        const shown=(o,top)=>{for(let a=o;a&&a!==top.parent;a=a.parent)if(!a.visible)return false;return true;};
        const parts=n=>{let meshes=0,casters=0;n.actor.group.traverse(o=>{if(o.isMesh&&shown(o,n.actor.group)){meshes++;if(o.castShadow)casters++;}});return{meshes,casters};};
        let visibleMeshes=0,visibleCasters=0;scene.traverse(o=>{if(!o.isMesh)return;for(let a=o;a;a=a.parent)if(!a.visible)return;visibleMeshes++;if(o.castShadow)visibleCasters++;});
        const within=r=>drawn.filter(n=>n.actor.group.position.distanceTo(p)<r),shadowed=drawn.filter(n=>n.shadows);
        return{calls:info.render.calls,triangles:info.render.triangles,position:[+p.x.toFixed(1),+p.z.toFixed(1)],region:world.regionAt(p.x,p.z)?.name??null,
          figures:npcData.length,figuresDrawn:drawn.length,figuresWithin30:within(30).length,figuresWithin60:within(60).length,figuresWithin100:within(100).length,figuresWithin120:within(120).length,
          standIns:drawn.filter(n=>n.detail==='stand-in').length,shadowFigures:shadowed.length,
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
        // Anything thrown in here comes back through Electron's IPC, which loses a message it
        // cannot serialise and reports only "Script failed to execute". Re-throwing as a plain
        // Error with the text in it is the difference between a name and a shrug.
        let out;try{out=await this.runSmokeBody();}catch(e){throw new Error(String(e&&e.stack||e&&e.message||e));}
        // The result crosses Electron's IPC, which clones it: a value it cannot clone is reported
        // as "Script failed to execute" with nothing else, so the summary is checked here by name.
        for(const [k,v] of Object.entries(out??{})){try{structuredClone(v);}catch{throw new Error(`summary field ${k} cannot cross the IPC: ${Object.prototype.toString.call(v)}`);}}
        return out;
      },
      async runSmokeBody(){
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
        // **Nobody walks with you up the pier.** (The user, 22 September 2026: they should never
        // follow without being asked first.) He used to escort the traveler to the letter because
        // in hard mode he is the only one who can say what Jojo is saying; normal mode is all
        // English and the escort is switched off (LANDING_ESCORT, src/mercenaries.js), so he
        // lands, walks his own road to the muster, and is asked with "Walk Drent with me."
        {const mate=npcById.get(landingMateId());
          assert(!mate.escorting,'The man off the boat is walking with you unasked');
          for(const spot of [[18,29],[12,29],[6,28.6]]){warp(spot[0],spot[1]);await frames(24);
            assert(!mate.escorting,`He started escorting at ${spot[0]}, ${spot[1]}`);
            assert(canStand(mate.actor.group.position.x,mate.actor.group.position.z,world),'He is standing in the water');}
          assert(longRoad.released,'He is not on his own road: something made him a companion unasked');}
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
        // Beside Jojo at the head of the pier, on her open side: people and the harbour crates around her are solid now.
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
        // Officer Glun sets the lesson, and the straw counts for nothing until he has
        // (src/instructor.js): the post used to be an unattended card in the quest panel.
        {const glun=npcById.get(INSTRUCTOR.id);
          warp(glun.actor.group.position.x,glun.actor.group.position.z+1.6);await frames();
          tap('KeyF');assert(mode==='dialogue','Officer Glun would not set the lesson');finishDialogue();
          assert(lessonSet,'Talking to him did not set the lesson');}
        warp(world.training.x,world.training.z+1.5);player.group.rotation.y=Math.PI;await frames();
        tap('KeyR');await until(()=>practiceHits===1,'First practice swing did not connect');await until(()=>combat.state.player.action==='idle','Practice recovery failed');
        canvas.dispatchEvent(new PointerEvent('pointerdown',{button:0}));await until(()=>practiceHits>=2,'Left-click practice swing did not connect');await until(()=>combat.state.player.action==='idle','Practice recovery failed');
        press('KeyA');tap('KeyC');release('KeyA');await until(()=>questStage===3,'Dodge lesson failed');await until(()=>combat.state.player.action==='idle','Dodge recovery failed');
        assert(weapons.status('simple-sword').durability===22,'Practice hits did not wear the sword exactly once each');
        // He acknowledges the lesson where it was set, and the chart comes with it: blank, and
        // with the ground under the traveler's feet the only thing on it.
        assert(mode==='dialogue','Officer Glun did not acknowledge the lesson');finishDialogue();
        assert(cartography.met,'He did not hand the chart over');
        assert(cartography.state('Drent')==='charted'&&cartography.named('Drent'),'The chart did not open on the ground he is standing on');
        for(const dark of ['Luscia','Pueth','Feradom','East Suval','West Suval'])
          assert(cartography.state(dark)==='unknown',`${dark} was on the chart before anybody went there`);
        // **The chart is the end of Chapter 1's second subquest and the whole of the tutorial.**
        // Three steps, not eleven: Jojo, Glun, and the road west (src/game-state.js).
        assert(questStage===QUEST_DONE,'The chart did not finish the tutorial');
        assert(inventory.has('road-token'),'Officer Glun did not hand over the road token');
        assert($('quest-title').textContent.includes('Nothom'),'The card does not say where the orders send him');
        // The fight the Greenway used to force on him is off the slate (src/quest-slate.js) and
        // nothing walks into it any more - but it is still built, and the rendered battle, the
        // defeat screen and the checkpoint retry are worth as much coverage as they ever were.
        warp(-47,29);await frames(2);
        assert(combat.state.phase!=='active','Walking to the bell still starts a fight');
        startAmbush();await frames();assert(combat.state.enemies.length===3,'The Greenway encounter no longer lays out');
        // Pause freezes a committed encounter. A reduced-health fixture then
        // exercises an actual enemy strike, defeat screen, and checkpoint retry.
        modal('pause');const pausedEnemies=combat.state.enemies.map(e=>[e.x,e.z,e.progress]);await frames(4);
        assert(JSON.stringify(pausedEnemies)===JSON.stringify(combat.state.enemies.map(e=>[e.x,e.z,e.progress])),'Pause did not freeze combat');closeModal();
        combat.state.player.hp=17;warp(-54.5,30.3);
        await until(()=>mode==='defeated','Enemy did not land the defeat strike');await frames(18);
        assert(!$('defeat').classList.contains('hidden'),'Defeat screen missing');assert(combat.state.player.progress>0,'Defeat pose froze');
        $('retry').click();assert(mode==='playing'&&combat.state.player.hp===100&&questStage===QUEST_DONE,'Checkpoint retry failed');assert(practiceHits>=2&&practiceDodges>=1,'Retry lost lessons');
        assert(weapons.status('simple-sword').durability===22,'Checkpoint retry repaired weapon wear');
        // Real input drives the rendered fight. Only travel between targets is
        // shortened here; damage, tells, cooldowns and victory use normal rules.
        if(combat.state.phase!=='active'){startAmbush();await frames();}
        let landed=0;const battleDeadline=performance.now()+90000;
        while(combat.state.phase==='active') {
          assert(performance.now()<battleDeadline,'Rendered battle did not resolve');
          const enemy=combat.state.enemies.find(e=>e.hp>0&&e.active!==false);
          if(!enemy){await frames();continue;}
          if(combat.state.player.action==='idle') {
            warp(enemy.x,enemy.z+1.35);player.group.rotation.y=Math.PI;
            if(enemy.action==='windup'&&enemy.progress>.55&&combat.state.player.stamina>=25){press('KeyD');tap('KeyC');release('KeyD');}
            else{tap('KeyR');landed++;}
          }
          await frames(2);assert(mode!=='defeated','Player lost the smoke fight');
        }
        assert(questStage===QUEST_DONE,'A fight off the slate moved the main quest');
        // The satchel is not a tutorial step any more, but the letter is still in it and still reads.
        tap('KeyI');assert(mode==='inventory','The satchel would not open');
        const letterButton=document.querySelector('[data-item-id="harbor-letter"]');
        letterButton.dispatchEvent(new PointerEvent('pointerenter'));await frames();
        assert(!$('inventory-tooltip').hidden&&$('inventory-tooltip').textContent.includes('select'),'Item selection tooltip missing');
        document.querySelector('[data-item-id="harbor-letter"]').click();
        assert($('inventory-letter-body').textContent.includes('Ambroni'),'Message contents are missing');
        assert(inventory.isOpen(),'Inspection dismissed the satchel');tap('KeyI');assert(mode==='playing','I did not dismiss the satchel');
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
        assert(questStage===QUEST_DONE,'Arrival at the forest boundary did not finish Region 1');
        assert(discoveries.has('northTrail')&&discoveries.has('border'),'Northern landmarks missing');
        yaw=Math.PI/2;press('KeyW');await until(()=>player.group.position.x<world.border.barrierX-1,'Could not cross the open gate');release('KeyW');
        assert(world.regionAt(player.group.position.x,player.group.position.z).id===1,'Beyond the gate the road stays in Drent');
        warp(world.border.x,world.border.z);await frames(2);tap('KeyF');assert(mode==='dialogue'&&$('speech').textContent.includes('Avrel'),`Border notice did not explain the onward road - something else took the key (mode ${mode}, npc ${currentNPC?.id??'none'}, tree ${currentTree?.species??'none'}, plant ${currentPlant?.id??'none'}, stone ${currentStone?.id??'none'}, mushroom ${currentMushroom?.id??'none'})`);finishDialogue();
        const pick=async acorn=>{warp(acorn.x,acorn.z);await frames(2);assert(currentAcorn?.id===acorn.id,'Acorn pickup not reachable');tap('KeyF');assert(woodlandLife.state().acorns.find(a=>a.id===acorn.id).collected,'F failed to gather acorn');};
        const sites=woodlandLife.state().acorns;assert(sites.length===24,'Woodland pickup count changed');
        await pick(sites[0]);assert(inventory.count('acorn')===1&&acornQuest.status==='available','Acorns cannot be gathered before accepting the favor');
        const inCast=id=>!!world.npcPositions[id];
        const bank=world.pond.fishingSpot;
        const choose=id=>{const button=document.querySelector(`[data-choice="${id}"]`);assert(button,'Missing conversation choice '+id);button.click();};
        const finishTangent=()=>{let limit=10;while(activeDialogue&&!activeDialogue.choices&&limit-->0)nextSpeech();};
        // The two the run's summary counts, declared out here so the block above may be skipped.
        let stickSites=woodlandLife.state().sticks,fruitSites=woodlandLife.state().fruits;
        // **The village life of Drent is out of the cast** while the main quest is built out
        // (src/cast.js): Lysa's acorns, the doomsayer's cape and Bran's rod belong to people who
        // are not standing in the world. Every line of it is still written and still tested the
        // day they come back; it is skipped here rather than failed.
        if(inCast('acorn-cook')&&inCast('doomsayer')&&inCast('pond-fisher')){
        const lysa=npcData.find(npc=>npc.id==='acorn-cook');
        const visitLysa=async()=>{const home=world.npcPositions['acorn-cook'];warp(home.x+1,home.z+1);await frames(2);tap('KeyF');assert(activeDialogue?.npc===lysa,'Lysa is not reachable for conversation');};
        await visitLysa();choose('acorn-tangent');assert(acornQuest.status==='available','Optional tangent silently accepted quest');
        nextSpeech();assert($('speech').textContent.includes('tannins'),'Acorn cookery tangent missing');finishTangent();
        choose('pawpaw-tangent');assert($('speech').textContent.includes('pawpaw'),'Lysa did not explain forest fruit');
        nextSpeech();assert($('speech').textContent.includes('25 health'),'Lysa did not teach how to eat fruit');finishTangent();
        choose('leave-lysa');assert(mode==='playing'&&acornQuest.status==='available','Declining forced side quest');
        await visitLysa();choose('accept-acorns');assert(acornQuest.status==='active'&&questStage===QUEST_DONE,'Side quest changed the main tutorial');
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
        stickSites=woodlandLife.state().sticks;
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
        tap('KeyC');assert(combat.state.player.action==='dodge','Broken sword prevented escape dodge');
        await until(()=>combat.state.player.action==='idle','Broken-weapon dodge did not recover');
        tap('KeyI');inventory.select('simple-sword');assert($('inventory-detail').textContent.includes('Broken'),'Broken condition missing from satchel');tap('KeyI');
        warp(world.repairBench.x,world.repairBench.z);await frames(2);assert(nearRepair&&!currentNPC,'Repair bench not reachable');tap('KeyF');
        assert(weapons.profile().durability===24&&weapons.profile().usable,'Village bench did not repair a broken sword');
        combat.finishPractice();
        fruitSites=woodlandLife.state().fruits;
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
        tap('KeyI');assert(mode==='playing'&&questStage===QUEST_DONE,'Eating changed the main tutorial or blocked dismissal');
        // The new optional loop uses real NPC choices, casts, catches, firewood,
        // cooking controls, and the food button without using testing supplies.
        // While the cast is trimmed (src/cast.js) these people are not standing in the world, so
        // the sections that visit them are skipped rather than failed: they are still written.
        const visit=async id=>{const npc=npcData.find(n=>n.id===id),home=world.npcPositions[id];warp(home.x+.8,home.z+.8);await frames(2);tap('KeyF');assert(activeDialogue?.npc===npc,'Could not talk to '+id);};
        await visit('doomsayer');choose('doom-warning');assert($('speech').textContent.includes('Cape Thalmagar'),'Doomsayer failed to introduce the far cape');nextSpeech();assert($('speech').textContent.includes('Oremindi'),'Doomsayer omitted the mountain barrier');finishTangent();
        assert(!document.querySelector('[data-choice="doom-map"]'),'The doomsayer must not point to Cape Thalmagar on the chart');choose('leave-doomsayer');await frames(2);assert(mode==='playing','Leaving Orris did not return to the road');
        await visit('doomsayer');choose('cooking-lesson');finishTangent();choose('leave-doomsayer');
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
        assert(!testingEnabled&&questStage===QUEST_DONE&&acornQuest.status==='complete','Normal campcraft required override or changed completed quests');
        }
        const roadResults=await runRoadSmoke({world,player,npcData,combat,journey,inventory,weapons,beggar,press,release,tap,until,frames,warp,getMode:()=>mode,finishDialogue:()=>{let n=0;while(mode==='dialogue'&&!(activeDialogue.choices&&activeDialogue.index===activeDialogue.lines.length-1)){assert(n++<12,'Road dialogue failed to reach its choices');nextSpeech();}},choose,setYaw:value=>yaw=value,readState:state});
        assert(saveRoad(false),'Completed road checkpoint did not save');const savedRoad=checkpoint.read().data;
        const savedWear=weapons.profile().durability;inventory.add('forest-stick',1);weapons.repair();warp(0,9);
        assert(continueRoad()&&journey.view().complete&&weapons.profile().durability===savedWear&&inventory.count('forest-stick')===savedRoad.inventory.find(item=>item.id==='forest-stick').quantity,'Checkpoint did not restore road progress, inventory, and wear');
        tap('F8');assert(mode==='testing','F8 did not open testing tools');$('test-prepare').click();
        assert(testingEnabled&&inventory.has('tinderbox')&&inventory.has('fishing-rod')&&inventory.count('acorn')>=5&&inventory.count('forest-stick')>=6,'Testing supplies failed');
        $('test-pond').click();assert(mode==='playing'&&Math.hypot(player.group.position.x-bank.x,player.group.position.z-bank.z)<.01,'Testing pond travel failed');
        tap('F8');$('test-village').click();assert(mode==='playing'&&player.group.position.x===-11,'Testing village travel failed');
        const roadTestingResults=await runRoadTestingSmoke({world,player,tap,frames,until,getMode:()=>mode,readState:state,journey,inventory});
        warp(world.border.x,world.border.z);assert(questStage===QUEST_DONE,'Side quest overwrote completed main tutorial');
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
        /**
         * The company's horses, at Bede Harrow's yard: the traveler up with three riders in file
         * behind him (company-mounted), and the same four stepped down with the horses picketed
         * beside his (company-picket).
         *
         * This runs **before** the unconditional practice branch below, which arms the traveler
         * and starts a practice fight for every view that is not `battle`. The first draft ran
         * after it and was photographed with a sword in hand.
         *
         * Everything here is idempotent, because the runner composes the first view twice
         * (`[reviewViews[0], ...reviewViews]`, main.cjs) and photographs both. The first draft
         * called `toggleMount()`, which on the second pass stepped him back down - which is why
         * the picture showed him on the ground beside his horse.
         */
        // Tidehaven's smithy, from the street it stands on. The plot was chosen by measurement
        // (TIDEHAVEN_SMITHY, src/region-world.js); the shot is too.
        /**
         * **Goibniu at his board**, in Ostel's street. He had no view of his own and was never
         * photographed until the hunter stood a traveler in front of him with `stand-at:` and
         * found him with his back 0.9 m from the smithy wall, unframeable from any ground you
         * can talk to him from (docs/known-issues.md, round 5). He has been moved to the street
         * corner of his own smithy (`OSTEL_STANDS`, src/amod-world.js) and this is the picture
         * of him there: the traveler at talking distance, the smith between him and his forge,
         * and the smithy's end wall behind the two of them.
         *
         * Idempotent, like every view: nothing here toggles anything, and the stand is computed
         * from the man's own spot rather than from wherever the last view left the traveler.
         */
        if(view==='ostel-smith'){
          questStage=QUEST_DONE;combat.finishPractice();player.setArmed(false);
          // His spot, from the world's own table rather than from his actor: an npc a long way
          // from the traveler has not been placed or turned yet, and this view is the first thing
          // that happens after the world is built.
          const him=npcById.get('ostel-smith'),spot=world.npcPositions['ostel-smith'];
          /**
           * **The town's own frame, not the world's.** Ostel stands on a bench and everything in
           * it is laid along the contour (`OSTEL.along`) and down the fall line (`OSTEL.across`,
           * which is +b, toward the water). The street runs the contour at b≈4, the smithy sits
           * below it at b=9, and Goibniu now stands at its street corner - so **up the street**
           * and **toward the street** are the two directions this shot is composed in, and both
           * of them are read off the town rather than searched for.
           */
          const along=OSTEL.along,across=OSTEL.across;
          // The traveler comes up the street and stops in front of him: two and a half metres
          // toward the road, which is inside the talk radius and out of the smithy's shadow.
          const stand={x:spot.x-across.x*2.5,z:spot.z-across.z*2.5};
          player.group.position.set(stand.x,world.heightAt(stand.x,stand.z),stand.z);
          player.group.rotation.y=Math.atan2(spot.x-stand.x,spot.z-stand.z);
          grounded=true;verticalSpeed=0;
          // The sword goes away, and it goes away *by hand*: a frozen review has no clock, so a
          // pose that eases is a pose that never arrives (docs/builder-handover.md). The first
          // draft photographed a man buying armour with his blade out.
          settlePose({armed:false});
          /**
           * **And his board is open**, which is the whole point of the view: the hunter could
           * stand a traveler in front of him with `stand-at:` but not show what he sells, because
           * the board opens from a dialogue (docs/known-issues.md, round 5). It is opened through
           * the real door - `smithConversation`, the same call `interact` makes - so the picture
           * is of the panel the player is actually given, arrows and all.
           */
          smithConversation(him,{level:regionLevel(world.regionAt(spot.x,spot.z)?.name)??0,
            inventory,gear,openDialogue,closeDialogue,act:smithAct});
          // Aimed between the two of them, at chest height rather than head height, because the
          // board is a panel across the bottom of the frame and the men have to stand above it.
          const mid={x:(spot.x+stand.x)/2,z:(spot.z+stand.z)/2};
          reviewTarget=new THREE.Vector3(mid.x,world.heightAt(mid.x,mid.z)+1.1,mid.z);
          // From up the street, three-quarters on to the pair: the smithy's end and its roof
          // behind them at an angle rather than a flat wall filling the frame, which is what the
          // first draft got by letting the camera pick a bearing off the line between them.
          const upStreet=Math.atan2(-along.x,-along.z),toStreet=Math.atan2(-across.x,-across.z);
          const shot=bestOf(reviewTarget,7,[(upStreet+toStreet)/2,upStreet,toStreet,upStreet+.4,toStreet-.4]);
          yaw=shot.yaw;pitch=.1;distance=targetDistance=shot.distance;reviewFrozen=true;
          return;
        }
        // The army's armourer at the Moros camp's smithy tent, which was standing with nobody
        // to sell from it.
        if(view==='camp-armourer'){
          questStage=QUEST_DONE;combat.finishPractice();player.setArmed(false);
          const post=OUTPOST_LAYOUT.armourer,stand=startingSpot(post,(x,z)=>canStand(x,z,world),{reaches:[2.4,3.4,4.6]})??post;
          player.group.position.set(stand.x,world.heightAt(stand.x,stand.z),stand.z);
          player.group.rotation.y=Math.atan2(post.x-stand.x,post.z-stand.z);
          grounded=true;verticalSpeed=0;
          reviewTarget=new THREE.Vector3(post.x,world.heightAt(post.x,post.z)+1.3,post.z);
          const shot=bestOf(reviewTarget,10,[post.yaw,post.yaw+.6,post.yaw-.6,post.yaw+1.1,post.yaw-1.1]);
          yaw=shot.yaw;pitch=.16;distance=targetDistance=shot.distance;reviewFrozen=true;
          return;
        }
        // The capital's armourer at the Strand Forge, from the raft way his yard fronts. The plot
        // was swept headlessly before anything was drawn (AMBRON_FORGE, src/ambron.js).
        if(view==='ambron-armourer'){
          questStage=QUEST_DONE;combat.finishPractice();player.setArmed(false);
          // Off his shoulder, not in front of him: `startingSpot` rings the man, and the far side
          // of that ring stands one figure exactly behind the other (measured, first draft).
          const post=AMBRON_FORGE.stand,stand={x:post.x+2.7,z:post.z+1.0};
          player.group.position.set(stand.x,world.heightAt(stand.x,stand.z),stand.z);
          player.group.rotation.y=Math.atan2(post.x-stand.x,post.z-stand.z);
          grounded=true;verticalSpeed=0;
          reviewTarget=new THREE.Vector3((post.x+stand.x)/2,world.heightAt(post.x,post.z)+1.3,(post.z+stand.z)/2);
          const shot=bestOf(reviewTarget,10,[.35,.1,.65,-.25]);
          yaw=shot.yaw;pitch=.12;distance=targetDistance=shot.distance;reviewFrozen=true;
          return;
        }
        // The shield up, in a real fight, seen from the shield side. It needs a live encounter:
        // the guard is only ever up while one is on, which is the rule and not the view's choice.
        // The traveler holding one of the three poles he can only get off the ground where its
        // owner fell: arms-spear, arms-pike, arms-staff.
        if(view.startsWith('arms-')){
          const held={'arms-spear':'ash-spear','arms-pike':'war-pike','arms-staff':'quarterstaff'}[view];
          if(held){
            questStage=QUEST_DONE;combat.finishPractice();
            inventory.add(held);weapons.equip(held);player.setArmed(true);
            const post=world.training,stand=startingSpot(post,(x,z)=>canStand(x,z,world),{reaches:[2.6,3.4,4.4]})??post;
            player.group.position.set(stand.x,world.heightAt(stand.x,stand.z),stand.z);
            const face=Math.atan2(post.x-stand.x,post.z-stand.z);
            player.group.rotation.y=face;grounded=true;verticalSpeed=0;
            // The weapon is on his wrist, so settle the arm before freezing or the pose is
            // whatever the last view left (settlePose, and the frozen-clock trap it exists for).
            settlePose({armed:true});
            reviewTarget=new THREE.Vector3(player.group.position.x,world.heightAt(stand.x,stand.z)+1.2,player.group.position.z);
            const shot=bestOf(reviewTarget,4.8,[face+1.45,face-1.45,face+1.8,face-1.8]);
            yaw=shot.yaw;pitch=.08;distance=targetDistance=shot.distance;reviewFrozen=true;
            return;
          }
        }
        if(view==='shield-guard'){
          questStage=QUEST_DONE;combat.finishPractice();player.setArmed(true);
          gear.wear('hand',{weight:'light',tier:0});refreshShield();
          const at=greenwayEncounter.center;
          player.group.position.set(at.x+2.6,world.heightAt(at.x+2.6,at.z+1.6),at.z+1.6);
          combat.startEncounter(greenwayEncounter);
          // The guard is only ever up in a fight that has actually begun, so let it begin: a
          // handful of frames takes the encounter to `active`, and holding the key before that
          // photographed a man with his shield down, correctly and uselessly.
          for(let step=0;step<12;step++)combat.update(1/60);
          grounded=true;verticalSpeed=0;
          const foe=combat.state.enemies.find(one=>one.active)??at;
          const face=Math.atan2(foe.x-player.group.position.x,foe.z-player.group.position.z);
          player.group.rotation.y=face;
          // Held, through the same door the player uses. If the rules say it is not up, the
          // picture will show it not up, which is the point of the picture.
          combat.guard(true,face);
          // On guard the face points forward, at whatever he is guarding against - so a camera on
          // his shield side sees the rim edge-on. To show the face of it the camera has to stand
          // roughly where the blow would come from: in front, and off his weapon side so the
          // goblin is not between the two of them.
          reviewTarget=new THREE.Vector3(player.group.position.x,world.heightAt(player.group.position.x,player.group.position.z)+1.25,player.group.position.z);
          // The arm eases into the guard over about half a second, and the frames after this
          // are frozen ones that move nothing, so it has to be eased in here or the picture keeps
          // the rest pose while the block says the shield is up - which is what it did.
          settlePose({armed:true,guarding:true});
          const shot=bestOf(reviewTarget,4.4,[face+.95,face+1.25,face+.7,face+1.6]);
          yaw=shot.yaw;pitch=.06;distance=targetDistance=shot.distance;reviewFrozen=true;
          return;
        }
        /**
         * **A bout.** Ed the Word, who teaches the dagger and is therefore the one man in the
         * company a traveler with the sword he landed with can stand up against, two lessons in
         * and holding his guard three paces off.
         *
         * Everything here is written to be run twice, because the runner composes the first view
         * twice: `combat.revive()` and `sparring=null` put the game back to nothing-happening
         * before the bout is laid on, so the second pass builds the same bout rather than finding
         * one already running.
         */
        /**
         * **The bow** (docs/combat-brief.md, phase 6). Three shots:
         *
         *   `bow-drawn` the traveler at full draw, bow in the off hand, shaft on the string;
         *   `bow-jerry` Jerry standing off at his own distance and drawing on a goblin;
         *   `bow-spent` the shafts that survived a volley, stuck in the ground to be picked up.
         *
         * The draw is a *held* verb, so these hold it rather than pressing it, and none of them
         * ever calls `combat.draw(false)` — that is the loose, and it would fire the picture off
         * down the clearing. Everything is laid afresh (`combat.revive()`, `clearArrows()`)
         * because the runner composes the first view twice.
         */
        /**
         * **A lone traveler going in with his file** (src/file-fill.js). Nobody walks with him,
         * so his commander has assigned him six ordinary soldiers of the side he signed with, and
         * the shot is of the file they stand in. `filled-file-coalition` is the other army's.
         */
        if(view==='filled-file'||view==='filled-file-coalition'){playSeconds=4000;   // on the view's own line: tests/session-clock.test.js reads a pin only where it names a view
          const side=view==='filled-file-coalition'?'coalition':'empire';
          questStage=QUEST_DONE;combat.revive();sparring=null;endMark(null);returnLoan();clearArrows();player.setArmed(true);
          companionOffTheClock=true;
          companions.restore({...createCompanions().snapshot(),walking:[]});
          rebuildCompany();settleMercenaries();
          border.restore({...createBorderChapter().snapshot(),started:true,ordered:true,entered:true,side,ready:true,marched:true,revision:6});
          const at=BORDER_ARENA.checkpoint;
          player.group.position.set(at.x,world.heightAt(at.x,at.z),at.z);
          player.group.rotation.y=Math.PI;grounded=true;verticalSpeed=0;
          combat.startEncounter(borderEncounter(side,borderAllies(side),companyWalking()),{atCheckpoint:true});
          // A few frames to bring the fight to `active` and let the file take its places.
          for(let step=0;step<12;step++){combat.update(1/60);combatClock+=1/60;
            combatView.update(1/60,combatClock,combat.state,player.group.position,true);}
          settlePose({armed:true});
          /**
           * **Aimed across the file, not down it.** The first draft aimed at the traveler and let
           * `bestOf` choose a bearing; it chose one looking at the enemy, and put the six men it
           * was a picture of behind the camera. A file is a line, and a line reads side-on.
           *
           * **Which way that is changed with the repair to `companionAllies`.** While the file was
           * strung out toward the enemy, "side-on" meant looking across the retreat axis. Now that
           * the men stand as a rank abreast beside the traveler - which is what they were always
           * meant to be - across the retreat axis looks straight *down* the rank and photographs
           * it as a column of shoulders. Side-on to a rank abreast is **along** the retreat axis:
           * from behind the line, or from in front of it, with the arena's own length going away.
           */
          const me=player.group.position;
          const mine=[{x:me.x,z:me.z},...combat.state.allies.map(one=>({x:one.x,z:one.z}))];
          const heart={x:mine.reduce((s,o)=>s+o.x,0)/mine.length,z:mine.reduce((s,o)=>s+o.z,0)/mine.length};
          reviewTarget=new THREE.Vector3(heart.x,world.heightAt(heart.x,heart.z)+1.2,heart.z);
          const across=BORDER_ARENA.retreatAxis==='x'?Math.PI/2:0;
          const shot=bestOf(reviewTarget,17,[across,across+Math.PI,across+.5,across-.5+Math.PI]);
          yaw=shot.yaw;pitch=.3;distance=targetDistance=shot.distance;reviewFrozen=true;
          $('toast').classList.remove('visible');show('dialogue',false);show('modal-backdrop',false);
          return;
        }
        /**
         * **The battle a full company meets** (`borderLine`, src/border-chapter.js). Ten walk with
         * him, so the other side has counted them and put **twelve** across the field - the largest
         * line `encounterConfig` will accept - and the shot is of the two lines facing each other
         * with the open ground between them.
         *
         * Aimed **across** the confrontation, which is the opposite of `filled-file`: that one
         * photographs a rank abreast and so looks along the retreat axis; this one photographs two
         * ranks thirty metres apart along that axis, and they only both fit from the side. The
         * focus is the midpoint of the ground between the nearest man of each line rather than the
         * arena's centre, so neither line is pushed out of frame by the other's depth.
         *
         * Written to be run twice, because the runner composes the first view twice: `revive`,
         * `restore` and `startEncounter` all lay the thing afresh rather than adding to it.
         */
        if(view==='border-line-ten'){playSeconds=4000;   // on the view's own line: tests/session-clock.test.js reads a pin only where it names a view
          questStage=QUEST_DONE;combat.revive();sparring=null;endMark(null);returnLoan();clearArrows();player.setArmed(true);
          companionOffTheClock=true;
          // The whole company: nine asked and the landing mate carried, which is ten in the file.
          companions.restore({...createCompanions().snapshot(),walking:Object.keys(ASKS).filter(id=>id!==landingMateId())});
          rebuildCompany();settleMercenaries();
          border.restore({...createBorderChapter().snapshot(),started:true,ordered:true,entered:true,side:'empire',ready:true,marched:true,revision:6});
          const at=BORDER_ARENA.checkpoint;
          player.group.position.set(at.x,world.heightAt(at.x,at.z),at.z);
          player.group.rotation.y=Math.PI;grounded=true;verticalSpeed=0;
          combat.startEncounter(borderEncounter('empire',borderAllies('empire'),companyWalking()),{atCheckpoint:true});
          // A few frames to bring the fight to `active` and let both lines take their places. The
          // last wave walks on late, so this is only the men who are already on the field.
          for(let step=0;step<12;step++){combat.update(1/60);combatClock+=1/60;
            combatView.update(1/60,combatClock,combat.state,player.group.position,true);}
          settlePose({armed:true});
          const me=player.group.position;
          const ours=[{x:me.x,z:me.z},...combat.state.allies.map(one=>({x:one.x,z:one.z}))];
          const theirs=combat.state.enemies.filter(one=>one.active).map(one=>({x:one.x,z:one.z}));
          const near=(list,other)=>list.reduce((best,one)=>{
            const far=Math.min(...other.map(o=>Math.hypot(o.x-one.x,o.z-one.z)));
            return !best||far<best.far?{one,far}:best;},null).one;
          const front=near(ours,theirs),facing=near(theirs,ours);
          const heart={x:(front.x+facing.x)/2,z:(front.z+facing.z)/2};
          reviewTarget=new THREE.Vector3(heart.x,world.heightAt(heart.x,heart.z)+1.2,heart.z);
          const side=BORDER_ARENA.retreatAxis==='x'?0:Math.PI/2;
          // **Thirty-four metres**, which is what it takes to hold both lines: they stand about
          // thirty apart along the arena and at anything nearer one of them is out of the frame.
          // The pitch below is the view's preference and not its angle - a fight of its own lifts
          // the camera to at least .56 (`viewPitch`), and this shot is taken inside a live fight.
          const shot=bestOf(reviewTarget,34,[side,side+Math.PI]);
          yaw=shot.yaw;pitch=.3;distance=targetDistance=shot.distance;reviewFrozen=true;
          $('toast').classList.remove('visible');show('dialogue',false);show('modal-backdrop',false);
          return;
        }
        if(view==='bow-drawn'||view==='bow-jerry'||view==='bow-spent'){playSeconds=4000;   // on the view's own line: tests/session-clock.test.js reads a pin only where it names a view
          questStage=QUEST_DONE;combat.revive();sparring=null;endMark(null);returnLoan();clearArrows();
          companionOffTheClock=true;
          const jerry=view==='bow-jerry';
          companions.restore({...createCompanions().snapshot(),walking:jerry?['merc-jerry']:[],regard:jerry?{'merc-jerry':60}:{}});
          teachers.restore({version:1,lessons:jerry?{'merc-jerry':1}:{}});
          rebuildCompany();
          // His own bow and a quiver, granted rather than played for: Jerry's gift is a
          // friendship away and this is a picture of what it looks like afterwards.
          // **Settle the company before the fight is laid.** `placeMercenaries` only says where
          // the file *should* be and `fileOrder` is filled while it does, so on the first pass
          // `companionAllies` had nobody to add and the shot came back with `archerAlly: null` -
          // and the runner composes the first view twice, so the two passes disagreed.
          settleMercenaries();
          if(!inventory.has(BOW.id))inventory.add(BOW.id,1);
          weapons.setCondition(BOW.id,WEAPON_TYPES[BOW.id].maxDurability);weapons.equip(BOW.id);
          if(inventory.count(BOW.arrow)<12)inventory.add(BOW.arrow,12-inventory.count(BOW.arrow));
          inventory.refresh();refreshQuiver();player.setArmed(true);
          /**
           * **`bow-spent` stands somewhere else, and its bearing is authored by hand.** The first
           * draft put it on the Greenway with `bestOf`, which reads colliders - and **foliage is
           * not a collider** (docs/builder-handover.md), so nothing measurable saw the canopy the
           * camera ended up inside: a green polygon over the top half of the frame, two pairs of
           * boots under it and no arrow anywhere. Nothing will find that automatically. This
           * stands him on the open field the traveler lands on and looks down it from behind, and
           * the bearing below is a number rather than a search.
           */
          const spent=view==='bow-spent';
          /**
           * **`bow-spent` finds its own open ground, by asking the arrow's own question.**
           * `bestOf` is no use here twice over: it searches for a clear *camera*, and it reads
           * colliders - and **foliage is not a collider** (docs/builder-handover.md), which is how
           * the first draft ended up inside a canopy with a green polygon over half the frame.
           * The second draft stood on the strand and every one of its nine arrows stopped inside
           * a metre, because there are rocks there: `onTheGround: 6` with all six under his boots.
           *
           * So the view sweeps bearings with `flightOf` - the same arithmetic the arrow flies by,
           * against the same colliders - and takes the first that carries a full draw the whole
           * way. Measured, not guessed, and it will find new ground by itself if the world moves.
           */
          const clearShot=()=>{
            for(const from of [world.training,{x:6,z:78},greenwayEncounter.center])
              for(let turn=0;turn<24;turn++){
                const bearing=turn/24*Math.PI*2;
                // Solids, rising ground and people, which is everything that now stops a shaft:
                // nine arrows down a lane with a villager in it is a picture of one arrow.
                const at={x:from.x+Math.sin(bearing)*BOW.range,z:from.z+Math.cos(bearing)*BOW.range};
                if(lineIsClear(from,at))return {from,bearing};
              }
            return {from:world.training,bearing:0};
          };
          const open=spent?clearShot():null;
          const at=spent?open.from:greenwayEncounter.center;
          const me=spent?{x:open.from.x,z:open.from.z}:{x:at.x+(jerry?7:2),z:at.z+(jerry?9:14)};
          player.group.position.set(me.x,world.heightAt(me.x,me.z),me.z);
          const face=spent?open.bearing:Math.atan2(at.x-me.x,at.z-me.z);
          player.group.rotation.y=face;grounded=true;verticalSpeed=0;
          /**
           * **Not the Greenway.** That raid is in `TEACHING_FIGHTS`, which is exactly the set a
           * companion is held *out* of, so the first draft of this stood Jerry a hundred metres
           * away and photographed nobody (`archerAlly: null` said so). This is an ordinary fight
           * on the same ground, with no `level` of its own so it takes the country's like every
           * other authored fight does (tests/held-battles.test.js).
           */
          // Named `foe`, not `mark`: `mark` is Jerry's straw target and is an outer variable of
          // this closure, and a block-scoped shadow of it here would be a trap for the next reader.
          const foe={x:at.x,z:at.z-6};
          combat.startEncounter({id:'bow-review',center:at,checkpoint:{x:me.x,z:me.z},
            retreatAxis:'z',retreatLine:at.z+30,
            enemies:[{id:'goblin-mark',x:foe.x,z:foe.z,hp:400,entry:0}]});
          // A fight is only `active` a few frames in, and a draw only fills while one is on.
          for(let step=0;step<10;step++)combat.update(1/60);
          if(spent){
            // Nine shafts down the open field, at slightly different bearings so they do not land
            // on top of one another, and every one let fly and followed home. Six come back, which
            // is the two-in-three rule, and they are what the picture is of.
            for(let shot=0;shot<9;shot++){
              const aim=face+(shot-4)*.045;
              for(let step=0;step<80;step++){combat.draw(true,aim);combat.update(1/60);}
              combat.draw(false,aim);
              for(let step=0;step<120&&combat.state.arrows.length;step++)combat.update(1/60);
              handleCombatEvents();
              // A quiver of twelve does not stretch to nine shots and a tenth: keep it filled, so
              // the shot is of the shafts and not of a man who has run out.
              if(inventory.count(BOW.arrow)<3)inventory.add(BOW.arrow,9);
            }
          } else {
            // Held, through the same door the player uses. If the rules say it is not drawing,
            // the picture will show it not drawing, which is the point of the picture.
            for(let step=0;step<90;step++){combat.draw(true,face);combat.update(1/60);}
          }
          if(jerry){
            // Wind his own clock on until he is actually at his draw, and ease his arm in with
            // it: a frozen review has no clock, so his pose is whatever the last frame left.
            for(let step=0;step<420;step++){
              combat.update(1/60);combatClock+=1/60;
              combatView.update(1/60,combatClock,combat.state,player.group.position,true);
              const him=combat.state.allies.find(one=>one.id==='merc-jerry');
              if(him?.action==='windup'&&him.progress>.72)break;
            }
            /**
             * **And then ease his arm in without letting the fight move on**, which is
             * `settlePose` for somebody who is not the player: the view's clock is about to stop,
             * and the animator's damping is `1 - exp(-rate * dt)` on the *change* in the time it
             * is handed, so a pose reached on the last live frame is a pose barely begun. The
             * first draft stopped the moment he reached his draw and photographed him carrying
             * the bow at his hip with `action: windup, progress: .94` in the facts beside it.
             */
            for(let step=0;step<60;step++){combatClock+=1/60;combatView.update(1/60,combatClock,combat.state,player.group.position,true);}
          }
          settlePose({armed:true,draw:combat.drawn});
          const him=jerry?combat.state.allies.find(one=>one.id==='merc-jerry'):null;
          if(spent){
            /**
             * **Stand where the player would be standing.** An arrow lands thirty-odd metres out,
             * so a shot from where it was loosed is a shot of empty grass with six specks at the
             * far end of it - which is what the first draft was, and it answered the wrong
             * question. A player finds his arrows by *walking up to them*, so the traveler walks
             * up to them: to the middle of where they fell, a few paces short, with the camera at
             * the eight metres and third of a radian the game's own camera uses. That is the
             * whole question - a shaft he cannot see from there is a shaft he never picks up.
             *
             * And the bearing is authored, not searched: `bestOf` reads colliders, **foliage is
             * not a collider** (docs/builder-handover.md), and the first draft of this view ended
             * up inside a canopy with a green polygon over half the frame.
             */
            const mid=spentArrows.length
              ?{x:spentArrows.reduce((sum,one)=>sum+one.x,0)/spentArrows.length,z:spentArrows.reduce((sum,one)=>sum+one.z,0)/spentArrows.length}
              :{x:at.x,z:at.z};
            const stand={x:mid.x-Math.sin(face)*5,z:mid.z-Math.cos(face)*5};
            player.group.position.set(stand.x,world.heightAt(stand.x,stand.z),stand.z);
            player.group.rotation.y=face;
            // Aimed between the two of them, so the man and what he is walking towards are both
            // in it: aimed at the shafts alone he stands at the very bottom edge of the frame.
            const between={x:(stand.x+mid.x)/2,z:(stand.z+mid.z)/2};
            reviewTarget=new THREE.Vector3(between.x,world.heightAt(between.x,between.z)+.9,between.z);
            yaw=face-Math.PI;pitch=.3;distance=targetDistance=9;reviewFrozen=true;
          } else {
            const focus=him?{x:him.x,z:him.z}:{x:me.x,z:me.z};
            reviewTarget=new THREE.Vector3(focus.x,world.heightAt(focus.x,focus.z)+1.3,focus.z);
            const shot=bestOf(reviewTarget,5.4,[face+1.4,face-1.4,face+1.9,face-1.9,face+2.5]);
            yaw=shot.yaw;pitch=.08;distance=targetDistance=shot.distance;reviewFrozen=true;
          }
          player.group.visible=!jerry;
          $('toast').classList.remove('visible');show('dialogue',false);show('modal-backdrop',false);
          return;
        }
        if(view==='jerry-mark'){playSeconds=4000;   // on the view's own line: tests/session-clock.test.js reads a pin only where it names a view
          /**
           * **Jerry teaches by shooting at a mark** (the user, 2026-09-21). He cannot spar, so
           * there is no fight here at all: the straw stands in the `practice` phase, which is the
           * straw post's own phase, and nothing in this picture can hurt anybody.
           */
          questStage=QUEST_DONE;combat.revive();sparring=null;endMark(null);returnLoan();clearArrows();player.setArmed(true);
          // **The landing mate is off**, which is what takes Chris out of the file: with him in it
          // he stands between the camera and the shooter, and this picture is about two men.
          companionOffTheClock=false;
          // Two lessons given, which is `friendly` and a ceiling of min(35, his own 40) = 35.
          companions.restore({...createCompanions().snapshot(),walking:['merc-jerry'],regard:{'merc-jerry':60}});
          teachers.restore({version:1,lessons:{'merc-jerry':2}});
          rebuildCompany();settleMercenaries();
          if(!inventory.has(BOW.id))inventory.add(BOW.id,1);
          weapons.setCondition(BOW.id,WEAPON_TYPES[BOW.id].maxDurability);weapons.equip(BOW.id);
          if(inventory.count(BOW.arrow)<12)inventory.add(BOW.arrow,12-inventory.count(BOW.arrow));
          inventory.refresh();refreshQuiver();
          /**
           * **Ground the straw can stand on, and a line the arrow can cross to it.** The first
           * draft asked only the arrow's question (`flightOf`, as `bow-spent` does) and the
           * clearest line at the landing beach is straight out over the water: it photographed a
           * man shooting at the sea with his target on the hill behind him. `flightOf` reads
           * colliders and **the sea is not a collider**, so the sweep asks `canStand` at the
           * straw's own spot as well, which is the question `startMark` will ask a moment later.
           *
           * **And it asks the people question too**, through the same `lineIsClear` the real door
           * uses, so the bearing the picture is taken on is a bearing `startMark` will accept: on
           * main a villager stood about two metres to the right of the straw, which with bodies
           * stopping arrows is a man in the line of fire. Jerry is left out of it because he is
           * put behind the shooter's shoulder a few lines below.
           */
          const MARK_OUT=18;
          const open=(()=>{
            for(const from of [greenwayEncounter.center,world.training,{x:6,z:78}])
              for(let turn=0;turn<36;turn++){
                const bearing=turn/36*Math.PI*2;
                const at={x:from.x+Math.sin(bearing)*MARK_OUT,z:from.z+Math.cos(bearing)*MARK_OUT};
                if(!canStand(from.x,from.z,world)||!canStand(at.x,at.z,world))continue;
                if(!lineIsClear(from,at,['merc-jerry']))continue;
                return {from,bearing};
              }
            return {from:world.training,bearing:0};})();
          const me={x:open.from.x,z:open.from.z},face=open.bearing;
          player.group.position.set(me.x,world.heightAt(me.x,me.z),me.z);
          player.group.rotation.y=face;grounded=true;verticalSpeed=0;
          // Where he said he would be: behind the shooter's shoulder and well out of the line.
          const jerry=npcById.get('merc-jerry');
          const by={x:me.x-Math.sin(face)*1.9+Math.cos(face)*1.7,z:me.z-Math.cos(face)*1.9-Math.sin(face)*1.7};
          world.npcPositions['merc-jerry']={x:by.x,z:by.z};
          if(jerry){jerry.hidden=false;jerry.actor.group.position.set(by.x,world.heightAt(by.x,by.z),by.z);
            jerry.actor.group.rotation.y=face;}
          // Set through the real door, so the picture is of the thing the player is given. The
          // dialogue it opens is closed again: a review is not a conversation.
          const aim=teachers.atTheMark('merc-jerry',travelerHands());
          if(aim.ok&&jerry)startMark(jerry,aim);
          closeDialogue();
          // Held, through the same door the player uses, and never let go: if the rules say a
          // draw cannot fill at a mark, the picture will show it not drawing.
          for(let step=0;step<90;step++){combat.draw(true,face);combat.update(1/60);}
          combatClock+=1;combatView.update(1,combatClock,combat.state,player.group.position,true);
          settlePose({armed:true,draw:combat.drawn});
          /**
           * **Behind the whole file, looking down the line.** The company places a companion
           * *behind* the traveler and goes on doing it every frame, so putting Jerry by hand does
           * nothing - measured: he came to rest 6.5 m back, which the first draft's camera at 5.3 m
           * back stood in front of, and the picture had no teacher in it at all. The camera goes
           * behind him instead: his shoulder in the near ground, the traveler at his draw in the
           * middle, and the straw at the far end of the same line.
           */
          const ahead={x:me.x+Math.sin(face)*6,z:me.z+Math.cos(face)*6};
          reviewTarget=new THREE.Vector3(ahead.x,world.heightAt(ahead.x,ahead.z)+1.3,ahead.z);
          yaw=face-Math.PI+.5;pitch=.16;distance=targetDistance=14;reviewFrozen=true;
          player.group.visible=true;
          $('toast').classList.remove('visible');show('dialogue',false);show('modal-backdrop',false);
          return;
        }
        if(view==='sparring'||view==='sparring-pike'){playSeconds=4000;   // on the view's own line: tests/session-clock.test.js reads a pin only where it names a view
          // **Two bouts.** `sparring` is Ed the Word, who teaches the dagger and is therefore the
          // one man a traveler with the sword he landed with can already stand up against.
          // `sparring-pike` is Matt, whose craft is not in the traveler's hands at all - so he
          // lends his spare pike, and the picture is of a borrowed weapon being used.
          const teach=view==='sparring-pike'?'merc-matt':WORD_ID;
          questStage=QUEST_DONE;combat.revive();sparring=null;endMark(null);returnLoan();player.setArmed(true);
          companionOffTheClock=true;
          // Two lessons given, which is `friendly` (RUNG_AT.friendly, src/companions.js) and a
          // ceiling of min(35, his own 35). Restored rather than played, so the shot is the same
          // every time it is taken.
          companions.restore({...createCompanions().snapshot(),walking:[teach],regard:{[teach]:60}});
          teachers.restore({version:1,lessons:{[teach]:2}});
          rebuildCompany();
          const at=greenwayEncounter.center,me={x:at.x+4,z:at.z+6};
          player.group.position.set(me.x,world.heightAt(me.x,me.z),me.z);
          const face=Math.atan2(at.x-me.x,at.z-me.z);
          player.group.rotation.y=face;grounded=true;verticalSpeed=0;
          // Put him where the bout wants him before it is laid on: `sparEncounter` stands the
          // teacher three paces down the line between the two of them, so putting him on that
          // line first is what makes the shot repeatable.
          const npc=npcById.get(teach),spot={x:me.x+Math.sin(face)*3.2,z:me.z+Math.cos(face)*3.2};
          world.npcPositions[teach]={x:spot.x,z:spot.z};
          npc.hidden=false;npc.actor.group.position.set(spot.x,world.heightAt(spot.x,spot.z),spot.z);
          const may=teachers.bout(teach,travelerHands());
          if(may.ok)startSpar(npc,may);
          // A fight is only `active` a few frames in, which is what the guard's view found out
          // the expensive way: a bout photographed before then is two people standing about.
          for(let step=0;step<16;step++)combat.update(1/60);
          combatView.update(1/60,combatClock,combat.state,player.group.position,true);
          const him=combat.state.enemies.find(one=>one.id===`spar-${teach}`);
          // He is drawn by the fight from here on, so his road body comes off the ground.
          npc.hidden=true;npc.lastFight={x:him?.x??spot.x,z:him?.z??spot.z};
          // The lent weapon is on his wrist, so the arm has to be settled before the clock stops
          // or the pose is whatever the last view left it (settlePose, and the frozen-clock trap).
          settlePose({armed:true});
          const mid={x:(me.x+(him?.x??spot.x))/2,z:(me.z+(him?.z??spot.z))/2};
          reviewTarget=new THREE.Vector3(mid.x,world.heightAt(mid.x,mid.z)+1.3,mid.z);
          const shot=bestOf(reviewTarget,7.5,[face+1.45,face-1.45,face+1.9,face-1.9]);
          yaw=shot.yaw;pitch=.1;distance=targetDistance=shot.distance;reviewFrozen=true;
          $('toast').classList.remove('visible');show('dialogue',false);show('modal-backdrop',false);
          return;
        }
        if(view==='tidehaven-smithy'){
          questStage=QUEST_DONE;combat.finishPractice();player.setArmed(false);
          const forge=TIDEHAVEN_SMITHY,stand=startingSpot(forge,(x,z)=>canStand(x,z,world),{reaches:[4,5.5,7]})??forge;
          player.group.position.set(stand.x,world.heightAt(stand.x,stand.z),stand.z);
          player.group.rotation.y=Math.atan2(forge.x-stand.x,forge.z-stand.z);
          grounded=true;verticalSpeed=0;
          // **The focus goes in front of the smithy, not on it.** The camera pulls in against
          // whatever stands between it and what it looks at, and the shelter's own corner posts
          // are 2.7 m from the forge on every bearing - so aiming at the forge clamped the camera
          // to 3.1 m and photographed the inside of its own roof. Aimed at a spot out on the open
          // side, nothing is in the way and the smithy sits just beyond it.
          const out={x:forge.x+Math.sin(forge.yaw)*3.4,z:forge.z+Math.cos(forge.yaw)*3.4};
          reviewTarget=new THREE.Vector3(out.x,world.heightAt(out.x,out.z)+1.3,out.z);
          const shot=bestOf(reviewTarget,9,[forge.yaw,forge.yaw+.5,forge.yaw-.5,forge.yaw+.9,forge.yaw-.9]);
          yaw=shot.yaw;pitch=.14;distance=targetDistance=shot.distance;reviewFrozen=true;
          return;
        }
        // The clock is pinned on the line that names the view, which is what
        // `tests/session-clock.test.js` asks of every pin: a review that moves the session clock
        // must be able to be read as a review at a glance. On its own line below the guard it was
        // the one pin in the file the test could not see, and the suite has been red on it.
        if(view==='company-mounted'||view==='company-picket'){playSeconds=4000;
          questStage=QUEST_DONE;combat.finishPractice();player.setArmed(false);
          // **Chris is not in the companions list.** The landing mate is filtered out of it and
          // carried on the long road's own terms, which is why the first render placed Jerry and
          // Kristen and not him. A game that walked down the long road with him has him off the
          // clock; so does this, or the shot would be of the two men the user did not ask about.
          companionOffTheClock=true;
          companions.restore({...companions.snapshot(),walking:['merc-jerry','merc-christin']});
          rebuildCompany();
          const hitch=LUMBER_TOWN_STABLE.hitch;
          if(!riding.owned)riding.grant(hitch,hitch.yaw);else riding.place(hitch,hitch.yaw);
          riding.teach();placeOwnHorse();
          grounded=true;verticalSpeed=0;
          /**
           * **Face him the way the file fits.** A yard with a stable in it has directions in
           * which the second and third man cannot stand at their own places and have to trail:
           * the first render strung the three of them over 22.8 m and put two of them out by the
           * sawmill. This asks the ground which way a file of three actually goes, and takes the
           * facing that needs no retreat - the same arithmetic the file itself uses.
           */
          const fits=(()=>{
            let best={yaw:hitch.yaw,span:Infinity};
            for(let step=0;step<48;step++){
              const turn=step/48*Math.PI*2,taken=[];let span=0,all=true;
              for(let place=0;place<3;place++){
                const spot=fileSpotFor({at:hitch,yaw:turn,place,reach:RIDE_FILE,room:RIDE_FILE.room,taken,
                  canStand:(x,z)=>canStand(x,z,world,RIDE.radius)});
                if(!spot){all=false;break;}
                taken.push(spot);span=Math.max(span,Math.hypot(spot.x-hitch.x,spot.z-hitch.z));}
              if(all&&span<best.span)best={yaw:turn,span};}
            return best;})();
          if(view==='company-mounted'){
            // He must be within RIDE.reach of the horse to get on it, so he stands at the hitch
            // and `toggleMount` puts him in the seat from there, facing the way the file fits.
            riding.place(hitch,fits.yaw);placeOwnHorse();
            player.group.position.set(hitch.x,world.heightAt(hitch.x,hitch.z),hitch.z);
            if(!riding.mounted)toggleMount();
            // **He sits whether he mounted just now or was already up.** The runner composes the
            // first view twice, and on the second pass the line above had just put him on the
            // ground while `toggleMount` was skipped for being already mounted - so the picture
            // was of a traveler standing beside his own horse. The seat is a fact, not a step.
            mountHeading=fits.yaw;
            const sx=hitch.x+Math.sin(mountHeading)*RIDE.seat.forward,sz=hitch.z+Math.cos(mountHeading)*RIDE.seat.forward;
            player.group.position.set(sx,world.heightAt(sx,sz)+RIDE.seat.up,sz);
          }else{
            if(riding.mounted)stepDown(true);
            // Stepped down, he stands beside his horse and not inside it: the first draft put
            // both on the hitch point and the traveler was standing in his own bay.
            const stand=startingSpot(hitch,(x,z)=>canStand(x,z,world),{reaches:[2.6,3.6,5]})??hitch;
            player.group.position.set(stand.x,world.heightAt(stand.x,stand.z),stand.z);
          }
          // `fits` is for the mounted file. The picket shot was right as it stood, and the picket
          // line is laid off the horse's yaw, so turning him would move it: it keeps the hitch's
          // own facing.
          const facing=view==='company-mounted'?fits.yaw:hitch.yaw;
          player.group.rotation.y=facing;
          // A photograph, not a sequence: the stagger is spent, so the file is all up or all down.
          companyWasMounted=riding.mounted;companyMountedAt=-1e9;
          // **Settle, do not place.** placeMercenaries only says where each man should be; he
          // then walks there, and the file forms over a couple of seconds. The runner gives a
          // view 120 frames, which is not enough to bring a man in from the muster road - the
          // first render had Jerry and Kristen still out by the sawmill. settleMercenaries puts
          // every one of them on his computed spot at once, which is what a photograph wants.
          settleMercenaries();refreshCompanyHorses();
          // The file trails behind him, so the shot is framed on the middle of it rather than on
          // the man in front. The bearing is **measured, not guessed**: the camera pulls in
          // against anything between it and the focus, and the stable roof did exactly that to
          // the first draft - 17 m asked for, about 7 m given. `clearestBearing` sweeps the
          // circle with the camera's own arithmetic and takes the line that lets it stand back.
          const p=player.group.position,back=(RIDE_FILE.shoulder+2*RIDE_FILE.stride)/2;
          reviewTarget=new THREE.Vector3(p.x-Math.sin(facing)*back,world.heightAt(p.x,p.z)+1.5,p.z-Math.cos(facing)*back);
          // Perpendicular to the file is the shot that reads; the sweep takes it if it is clear
          // and the nearest clear line to it if it is not.
          const shot=view==='company-mounted'
            ?bestOf(reviewTarget,20,[facing+1.35,facing-1.35,facing+1.1,facing-1.1,facing+1.6,facing-1.6])
            :clearestBearing(reviewTarget,21,{prefer:facing+Math.PI/2});
          yaw=shot.yaw;pitch=.2;distance=targetDistance=shot.distance;reviewFrozen=true;
          return;
        }
        // **The whole company, mounted, on a road.** The two views above are about the yard and
        // carry three men on purpose; this one is the thing the arithmetic says is sixty metres
        // long (RIDE_FILE.shoulder + 9 * stride) and that no render had ever shown.
        if(view==='company-ten'){playSeconds=4000;
          questStage=QUEST_DONE;combat.finishPractice();player.setArmed(false);
          companionOffTheClock=true;
          // Nine asked, and Chris carried as the landing mate: ten in the file (companionPlan).
          companions.restore({...companions.snapshot(),walking:Object.keys(ASKS).filter(id=>id!==landingMateId())});
          rebuildCompany();
          // The main road where it leaves Nothom, and the way it runs from there.
          const road=world.paths[0],hitch=LUMBER_TOWN_STABLE.hitch;
          let near=0;for(let i=0;i<road.length;i++)if(Math.hypot(road[i].x-hitch.x,road[i].z-hitch.z)<Math.hypot(road[near].x-hitch.x,road[near].z-hitch.z))near=i;
          // Two waypoints on from the town: a file of ten is sixty metres long on open ground and
          // near a hundred among houses, and the camera cannot stand back inside a street either.
          const from=Math.min(road.length-2,near+2);
          const at=road[from],next=road[from+1];
          const facing=Math.atan2(next.x-at.x,next.z-at.z);
          if(!riding.owned)riding.grant(at,facing);else riding.place(at,facing);
          riding.teach();placeOwnHorse();
          player.group.position.set(at.x,world.heightAt(at.x,at.z),at.z);
          if(!riding.mounted)toggleMount();
          // The seat is a fact, not a step - the runner composes a view twice.
          mountHeading=facing;
          const sx=at.x+Math.sin(facing)*RIDE.seat.forward,sz=at.z+Math.cos(facing)*RIDE.seat.forward;
          player.group.position.set(sx,world.heightAt(sx,sz)+RIDE.seat.up,sz);
          player.group.rotation.y=facing;grounded=true;verticalSpeed=0;
          companyWasMounted=riding.mounted;companyMountedAt=-1e9;
          settleMercenaries();refreshCompanyHorses();
          // Framed on the middle of a sixty-metre file, from far enough back to hold both ends.
          const p=player.group.position,back=(RIDE_FILE.shoulder+9*RIDE_FILE.stride)/2;
          reviewTarget=new THREE.Vector3(p.x-Math.sin(facing)*back,world.heightAt(p.x,p.z)+2,p.z-Math.cos(facing)*back);
          const shot=bestOf(reviewTarget,48,[facing+1.35,facing-1.35,facing+1.1,facing-1.1,facing+1.6,facing-1.6]);
          yaw=shot.yaw;pitch=.26;distance=targetDistance=shot.distance;reviewFrozen=true;
          return;
        }
        if(view==='battle'){questStage=QUEST_DONE;combat.startPractice(world.training);combat.finishPractice();combat.startEncounter(greenwayEncounter);player.group.position.set(-52,world.heightAt(-52,29),29);yaw=Math.PI/2+.28;pitch=.32;distance=targetDistance=7;player.setArmed(true);}
        else{questStage=2;practiceHits=0;practiceDodges=0;combat.startPractice(world.training);player.group.position.set(world.training.x,world.heightAt(world.training.x,world.training.z+3),world.training.z+3);player.group.rotation.y=Math.PI*.85;yaw=.42;pitch=.3;distance=targetDistance=5;player.setArmed(true);}
        // The traveler stood at a place and looking a given way, with nothing staged: for a measurement that
        // wants the place as it is rather than a composed shot. stand-at:x,z,facing[,pitch,distance] (main.cjs --draw-review).
        if(view.startsWith('stand-at:')){const [sx,sz,facing=0,tilt=.3,back=7]=view.slice(9).split(',').map(Number);
          if(Number.isFinite(sx)&&Number.isFinite(sz)){questStage=QUEST_DONE;combat.finishPractice();player.setArmed(false);player.group.position.set(sx,world.heightAt(sx,sz),sz);yaw=facing;pitch=tilt;distance=targetDistance=back;player.group.rotation.y=Math.PI+yaw;}}
        if(view==='walk'){questStage=QUEST_DONE;combat.finishPractice();player.group.position.set(-52,world.heightAt(-52,29),29);yaw=Math.PI/2+1.15;pitch=.3;distance=targetDistance=6;player.group.rotation.y=Math.PI+yaw;}
        if(view==='inventory'){questStage=6;combat.finishPractice();inventory.grant('harbor-letter');inventory.grant('simple-sword');inventory.grant('road-token');if(!inventory.has(COPPER_ITEM))inventory.add(COPPER_ITEM,STARTING_PURSE);player.group.position.set(-86,world.heightAt(-86,28),28);yaw=Math.PI/2+.2;pitch=.3;distance=targetDistance=7;toggleInventory();inventory.select('harbor-letter');}
        if(view==='border'){questStage=QUEST_DONE;combat.finishPractice();player.group.position.set(world.border.x,world.heightAt(world.border.x,world.border.z),world.border.z);player.group.rotation.y=Math.PI;yaw=0;pitch=.16;distance=targetDistance=7;}
        if(view==='map'){combat.finishPractice();modal('journal');mapTab(true);}
        // The skills sheet as the journal draws it, for checking what this mode shows.
        if(view==='skills'){combat.finishPractice();modal('journal');journalTab('skills');}
        // The testing panel itself, so the go-anywhere rows can be looked at rather than believed.
        // Render this one WITHOUT --review-clean: that flag hides every element of the interface.
        if(view==='testing-panel'){combat.finishPractice();testingWhereAmI();modal('testing');}
        // A lettered board, close enough to read: the Greenway fingerpost above the landing. What
        // it is for is the lettering atlas, whose cells move when it is cut for fewer words.
        if(view==='signpost'){questStage=QUEST_DONE;combat.finishPractice();player.group.visible=false;
          player.group.position.set(-4.9,world.heightAt(-4.9,29.4),29.4);yaw=0;pitch=.02;distance=targetDistance=3.2;}
        // Amod, for review by eye: the terraces from the Pueth road, the bridge, Ostel from below,
        // the street, and Mallec standing beside a person so the scale can be judged rather than asserted.
        if(view.startsWith('amod-')){
          questStage=QUEST_DONE;combat.finishPractice();player.setArmed(true);
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
        // The western regions, for review by eye, and the south-western ones on the same
        // machinery: Eer's ground and animals are built in the same modules, so its views
        // are worked out by the same function. The spots come from the regions' own numbers
        // rather than typed in, so a view cannot drift off the thing it is meant to show
        // when the ground under it is adjusted.
        if(view.startsWith('west-')||view.startsWith('south-')){
          questStage=QUEST_DONE;combat.finishPractice();player.setArmed(true);
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
        // A view of somebody who is out of the cast (src/cast.js) photographs nothing rather than
        // throwing: the view is still written, and comes back with them.
        if(view==='lysa'&&npcById.get('acorn-cook')){questStage=QUEST_DONE;combat.finishPractice();const npc=npcData.find(n=>n.id==='acorn-cook'),home=world.npcPositions[npc.id];player.group.position.set(home.x+1.5,world.heightAt(home.x+1.5,home.z+1.4),home.z+1.4);yaw=.65;pitch=.36;distance=targetDistance=5;conversation(npc);}
        // Anyone, close and face on: 'npc-<id>' (Toft is 'npc-jimson-toft').
        if(view.startsWith('npc-')&&npcById.has(view.slice(4))){questStage=QUEST_DONE;combat.finishPractice();player.group.visible=false;
          const npc=npcById.get(view.slice(4)),g=npc.actor.group,turn=g.rotation.y+.35;g.visible=true;
          const px=g.position.x+Math.sin(turn)*3,pz=g.position.z+Math.cos(turn)*3;player.group.position.set(px,world.heightAt(px,pz),pz);
          reviewTarget=new THREE.Vector3(g.position.x,g.position.y+1.1,g.position.z);yaw=turn;pitch=.08;distance=targetDistance=3;}
        // Katy by the spring pool with her spyglass: face on ('katy'), and from behind, for the hair and the cape ('katy-back').
        if(view==='katy'||view==='katy-back'){questStage=QUEST_DONE;combat.finishPractice();player.group.visible=false;
          const k=npcById.get(KATY.id).actor.group,at=k.position,face=KATY_STAND.yaw,turn=view==='katy'?face+.45:face+Math.PI+.35;
          player.group.position.set(at.x+Math.sin(turn)*3,world.heightAt(at.x+Math.sin(turn)*3,at.z+Math.cos(turn)*3),at.z+Math.cos(turn)*3);
          reviewTarget=new THREE.Vector3(at.x,world.heightAt(at.x,at.z)+1.2,at.z);yaw=turn;pitch=.08;distance=targetDistance=2.8;}
        // Bosco in the dye yard, from about the height of somebody crouching down to him ('bosco').
        if(view==='bosco'){questStage=QUEST_DONE;combat.finishPractice();player.group.visible=false;
          // He will not hold still for a portrait: he comes at a run and sits down on your boot,
          // so the camera stands off his spot and looks at where he stops, which is here.
          const at=BOSCO_HAUNTS[1],turn=1.6;boscoModel.group.visible=true;
          boscoPose={x:at.x,z:at.z,yaw:turn+Math.PI};
          const px=at.x+Math.sin(turn)*1.4,pz=at.z+Math.cos(turn)*1.4;
          player.group.position.set(px,world.heightAt(px,pz),pz);
          reviewTarget=new THREE.Vector3(at.x,world.heightAt(at.x,at.z)+.2,at.z);yaw=turn+Math.PI;pitch=.3;distance=targetDistance=1.2;}
        // Mallec at the pass stones, head to foot ('ogre'), and the road he holds ('amod-road').
        if(view==='ogre'||view==='amod-road'){questStage=QUEST_DONE;combat.finishPractice();player.group.visible=false;
          const o=npcById.get(OGRE_NPC.id),at=o.actor.group.position,turn=OGRE_STAND.yaw+.4;
          if(view==='ogre'){const px=at.x+Math.sin(turn)*7,pz=at.z+Math.cos(turn)*7;
            player.group.position.set(px,world.heightAt(px,pz),pz);
            reviewTarget=new THREE.Vector3(at.x,world.heightAt(at.x,at.z)+1.9,at.z);yaw=turn;pitch=.04;distance=targetDistance=7;}
          else{const px=at.x+Math.sin(turn)*34,pz=at.z+Math.cos(turn)*34;
            player.group.position.set(px,world.heightAt(px,pz),pz);
            reviewTarget=new THREE.Vector3(at.x,world.heightAt(at.x,at.z)+4,at.z);yaw=turn;pitch=.14;distance=targetDistance=34;}}
        // Ambron from the south, over the chain and up the channel into the city ('ambron').
        if(view==='ambron'){questStage=QUEST_DONE;combat.finishPractice();player.group.visible=false;
          const c=AMBRON.centre,turn=0;
          const px=c.x,pz=c.z-150;
          player.group.position.set(px,world.heightAt(px,pz),pz);
          reviewTarget=new THREE.Vector3(c.x,world.heightAt(c.x,c.z)+18,c.z);yaw=turn;pitch=.26;distance=targetDistance=150;}
        // The Elod Light from the landing below it ('elod-light'), and its keeper ('subtractidaughter').
        if(view==='elod-light'||view==='subtractidaughter'){questStage=QUEST_DONE;combat.finishPractice();player.group.visible=false;
          if(view==='subtractidaughter'){const g=npcById.get(SUBTRACTIDAUGHTER.id).actor.group,at=g.position,turn=SUBTRACTIDAUGHTER_STAND.yaw+.4;
            const px=at.x+Math.sin(turn)*3,pz=at.z+Math.cos(turn)*3;
            player.group.position.set(px,world.heightAt(px,pz),pz);
            reviewTarget=new THREE.Vector3(at.x,world.heightAt(at.x,at.z)+1.2,at.z);yaw=turn;pitch=.06;distance=targetDistance=3;}
          else{const t=ELOD_LIGHT.tower,turn=2.2;
            const px=t.x+Math.sin(turn)*30,pz=t.z+Math.cos(turn)*30;
            player.group.position.set(px,world.heightAt(px,pz),pz);
            reviewTarget=new THREE.Vector3(t.x,world.heightAt(t.x,t.z)+9,t.z);yaw=turn;pitch=.2;distance=targetDistance=30;}}
        // Addison at her yard gate ('addison'), and the whole light from the lane ('suval-light').
        if(view==='addison'||view==='suval-light'){questStage=QUEST_DONE;combat.finishPractice();player.group.visible=false;
          if(view==='addison'){const g=npcById.get(ADDISON.id).actor.group,at=g.position,turn=2.2;
            const px=at.x+Math.sin(turn)*3,pz=at.z+Math.cos(turn)*3;
            player.group.position.set(px,world.heightAt(px,pz),pz);
            reviewTarget=new THREE.Vector3(at.x,world.heightAt(at.x,at.z)+1.2,at.z);yaw=turn;pitch=.1;distance=targetDistance=3.6;g.rotation.y=turn;}
          else{const t=SUVAL_LIGHT.tower,turn=2.5;
            const px=t.x+Math.sin(turn)*26,pz=t.z+Math.cos(turn)*26;
            player.group.position.set(px,world.heightAt(px,pz),pz);
            reviewTarget=new THREE.Vector3(t.x,world.heightAt(t.x,t.z)+7,t.z);yaw=turn;pitch=.16;distance=targetDistance=26;}}
        // Batman on his rock above the spring: face on ('batman'), and with the wings open ('batman-flare').
        if(view==='batman'||view==='batman-flare'){questStage=QUEST_DONE;combat.finishPractice();player.group.visible=false;
          hunt.restore({version:1,stage:'sighted',found:['vial'],ending:null});placeBatman();batman.group.visible=true;
          batmanFlare=view==='batman-flare'?1:0;batman.update(4,{flare:batmanFlare});
          const at=batman.group.position,turn=BATMAN_PERCH.yaw+.25;
          const px=at.x+Math.sin(turn)*4.4,pz=at.z+Math.cos(turn)*4.4;
          player.group.position.set(px,world.heightAt(px,pz),pz);
          reviewTarget=new THREE.Vector3(at.x,at.y+1.2,at.z);yaw=turn;pitch=.06;distance=targetDistance=4.4;}
        // Kat on the crush pad at the hall doors, face on ('kat').
        if(view==='kat'){questStage=QUEST_DONE;combat.finishPractice();player.group.visible=false;
          const g=npcById.get(WINEMAKER.id).actor.group,at=g.position,turn=WINERY_STANDS.winemaker.yaw+.3;
          player.group.position.set(at.x+Math.sin(turn)*3,world.heightAt(at.x+Math.sin(turn)*3,at.z+Math.cos(turn)*3),at.z+Math.cos(turn)*3);
          reviewTarget=new THREE.Vector3(at.x,world.heightAt(at.x,at.z)+1.2,at.z);yaw=turn;pitch=.08;distance=targetDistance=2.8;}
        // Imani in the rows: face on ('imani'), and from behind, for the bob ('imani-back'). Both
        // look along the aisle, because three metres either side of her is a wall of vine.
        if(view==='imani'||view==='imani-back'){questStage=QUEST_DONE;combat.finishPractice();player.group.visible=false;
          const g=npcById.get(IMANI.id).actor.group,at=g.position,face=IMANI_STAND.yaw,turn=view==='imani'?face+.12:face+Math.PI+.06;
          player.group.position.set(at.x+Math.sin(turn)*3,world.heightAt(at.x+Math.sin(turn)*3,at.z+Math.cos(turn)*3),at.z+Math.cos(turn)*3);
          reviewTarget=new THREE.Vector3(at.x,world.heightAt(at.x,at.z)+1.2,at.z);yaw=turn;pitch=.08;distance=targetDistance=2.8;}
        // Solis three years after the sack: the north wall from the road ('solis-sack-gate'), the east breach,
        // the burnt houses inside the north wall, and the ruins of the lower town.
        if(view.startsWith('solis-sack-')){questStage=QUEST_DONE;combat.finishPractice();player.group.visible=false;
          const [a,b,turn,d,p,rise]={'solis-sack-gate':[16,-44,-2.68,36,.2,3],'solis-sack-east':[56,10,1.86,26,.3,7.5],'solis-sack-town':[-30,-28,.54,20,.55,7.5],'solis-sack-ruins':[-30,20,2.36,24,.6,7.5],'solis-sack-horses':[0,-50,Math.PI+.25,16,.12,8]}[view]??[0,0,0,20,.3,2];
          const at=solisPoint(a,b);player.group.position.set(at.x,world.heightAt(at.x,at.z),at.z);reviewTarget=new THREE.Vector3(at.x,world.heightAt(at.x,at.z)+rise,at.z);
          yaw=turn;pitch=p;distance=targetDistance=d;}
        // The whole cast shoulder to shoulder: those with a model of their own ('cast-line'), and the
        // villagers who wear one of the shared bodies in their own colours ('cast-folk'); and the
        // company of eleven as the road sees them, Cromb first and then the ten in the order they
        // land, each in their own build with their own weapon ('cast-company').
        if(view==='cast-line'||view==='cast-folk'||view.startsWith('cast-company')){questStage=QUEST_DONE;combat.finishPractice();player.group.visible=false;
          const lineup=view.startsWith('cast-company')?'cast-company':view;   // '-left' and '-right' look at the same line, closer
          if(reviewLineup&&reviewLineup.userData.cast!==lineup){scene.remove(reviewLineup);reviewLineup=null;}
          if(!reviewLineup){
            const person=options=>()=>({actor:createCharacter(options),kind:'person'});
            const cast=lineup==='cast-company'?[CROMB,...MERCENARY_ROSTER].map(m=>person({role:'mercenary',tunic:m.look.tunic,skin:m.look.skin,look:{...m.look,weapon:m.weapon,trades:m.trades}}))
            :view==='cast-line'?[
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
            reviewLineup=new THREE.Group();reviewLineup.name='Review lineup';reviewLineup.userData.cast=lineup;
            cast.forEach((build,i)=>{const {actor,kind}=build();actor.group.position.set((i-(cast.length-1)/2)*1.5,0,0);
              actor.group.userData.actor=actor;actor.group.userData.kind=kind;reviewLineup.add(actor.group);});
            scene.add(reviewLineup);}
          // Open ground west of the village: nothing of the village stands in the line or in front of it.
          const at={x:-70,z:38},ground=world.heightAt(at.x,at.z);
          reviewLineup.position.set(at.x,ground,at.z);reviewLineup.rotation.y=0;reviewLineup.visible=true;
          player.group.position.set(at.x,ground,at.z);
          // Settle every pose: a character reads its idle over a second or two, and Ed keeps his own clock.
          for(const g of reviewLineup.children)for(let t=0;t<3;t+=1/60)g.userData.kind==='ed'?g.userData.actor.animate(t,1/60,{}):g.userData.actor.animate(t,0,true,{});
          const half=view==='cast-company-left'?-4.1:view==='cast-company-right'?4.1:0;
          reviewTarget=new THREE.Vector3(at.x+half,ground+1.05,at.z);yaw=.02;pitch=.04;distance=targetDistance=half?5.4:view==='cast-folk'?12.2:10.8;}
        // The Empire's soldiers in a row, close up: a footman at attention, one with his sword drawn, an officer, and a Suvali guard beside them for scale.
        if(view==='soldiers'||view==='soldiers-back'){questStage=QUEST_DONE;combat.finishPractice();player.group.visible=false;
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
        // `word-crew` is `word-ship` at the moment he goes over the side, close enough to see
        // the two men at her port rail looking down at the water (src/rebel-crew.js).
        if(view==='word-ship'||view==='word-ashore'||view==='word-crew'){questStage=QUEST_DONE;combat.finishPractice();player.group.visible=false;
          const atShip=view==='word-ship'||view==='word-crew';
          playSeconds=view==='word-ship'?WORD_SHIP.turns+8:view==='word-crew'?WORD_SHIP.drops:WORD_ASHORE+3;
          wordSaid=wordToastAt(playSeconds)?.key??null;
          settleMercenaries();
          const look=atShip?WORD_TRACK.standOff:WORD_BEACH;
          const spot=atShip?{x:26,z:29}:{x:WORD_BEACH.x-7,z:WORD_BEACH.z-6};
          const ground=Math.max(SEA_LEVEL,world.heightAt(spot.x,spot.z));
          player.group.position.set(spot.x,ground,spot.z);
          reviewTarget=new THREE.Vector3(look.x,atShip?SEA_LEVEL+3.4:world.heightAt(look.x,look.z)+1.1,look.z);
          yaw=Math.atan2(spot.x-look.x,spot.z-look.z);pitch=atShip?.08:.12;
          distance=targetDistance=view==='word-ship'?Math.hypot(spot.x-look.x,spot.z-look.z)
            :view==='word-crew'?18:9.2;}
        if(view==='traveler'){questStage=QUEST_DONE;combat.finishPractice();player.group.position.set(-35,world.heightAt(-35,29),29);player.group.rotation.y=Math.PI;yaw=Math.PI+.35;pitch=.24;distance=targetDistance=4.5;}
        if(view==='weapons'){questStage=QUEST_DONE;combat.finishPractice();inventory.grant('forest-stick');weapons.setWear(true);weapons.contact('simple-sword');toggleInventory();inventory.select('simple-sword');}
        if(view==='repair'){questStage=QUEST_DONE;combat.finishPractice();player.group.position.set(world.repairBench.x,world.heightAt(world.repairBench.x,world.repairBench.z),world.repairBench.z);yaw=.9;pitch=.45;distance=targetDistance=5;}
        if(view.startsWith('cat-')){questStage=QUEST_DONE;combat.finishPractice();const spot=VILLAGE_CAT.spots[1],at={x:spot.x+1.5,z:spot.z+1},npc=npcById.get(VILLAGE_CAT.id);reviewCat={posture:view.slice(4),at};npc.actor.group.position.set(at.x,world.heightAt(at.x,at.z),at.z);npc.actor.group.rotation.y=-.6;player.group.position.set(at.x+6,world.heightAt(at.x+6,at.z+6),at.z+6);player.group.visible=false;reviewTarget=new THREE.Vector3(at.x,world.heightAt(at.x,at.z)+.22,at.z);yaw=.25;pitch=.3;distance=targetDistance=1.7;}
        // Paradise Springs from the lane's end, Livia at the cabin, and the threshold slab at Rena.
        if(['winery','winery-cabin','winery-spring','winery-vines','rena-track'].includes(view)){questStage=QUEST_DONE;combat.finishPractice();player.group.visible=false;
          const spot=view==='winery'?{x:WINERY_STANDS.vintner.x-22,z:WINERY_STANDS.vintner.z+14,look:{x:WINERY_STANDS.vintner.x+14,z:WINERY_STANDS.vintner.z-6},d:34,p:.34}
            :view==='winery-cabin'?{x:WINERY_STANDS.vintner.x,z:WINERY_STANDS.vintner.z+5,look:{x:WINERY_STANDS.vintner.x,z:WINERY_STANDS.vintner.z-2},d:7,p:.18}
            :view==='winery-spring'?{x:WINERY_LAYOUT.spring.pool.x+4,z:WINERY_LAYOUT.spring.pool.z+5,look:WINERY_LAYOUT.spring.basin,d:13,p:.42}
            :view==='winery-vines'?{x:WINERY_LAYOUT.plates[3].x-1.5,z:WINERY_LAYOUT.plates[3].z-5,look:WINERY_LAYOUT.plates[3],d:5,p:.12}
            :{x:digs.sites.find(s=>s.id==='track').x,z:digs.sites.find(s=>s.id==='track').z+3,look:digs.sites.find(s=>s.id==='track'),d:3.2,p:.6};
          player.group.position.set(spot.x,world.heightAt(spot.x,spot.z),spot.z);reviewTarget=new THREE.Vector3(spot.look.x,world.heightAt(spot.look.x,spot.look.z)+1,spot.look.z);
          yaw=Math.atan2(spot.x-spot.look.x,spot.z-spot.look.z);pitch=spot.p;distance=targetDistance=spot.d;}
        // Ed close, face on, at Aurel Mendo's stall: the glasses, the pipe and its smoke.
        if(view==='ed-pipe'){questStage=QUEST_DONE;combat.finishPractice();player.group.visible=false;
          while(puck.haunt.id!=='merchant-stall')puck.grab();placePuck();const g=puckView.group.position,face=puckView.group.rotation.y;
          player.group.position.set(g.x+Math.sin(face)*4,world.heightAt(g.x+Math.sin(face)*4,g.z+Math.cos(face)*4),g.z+Math.cos(face)*4);
          reviewTarget=new THREE.Vector3(g.x+Math.sin(face)*.45,g.y+.5,g.z+Math.cos(face)*.45);yaw=face+1.25;pitch=.1;distance=targetDistance=2.3;}
        if(view==='ed'||view==='ed-ridge'||view==='ed-cask'){questStage=QUEST_DONE;combat.finishPractice();player.group.visible=false;
          if(view!=='ed-cask'){while(view==='ed-ridge'?!puck.haunt.perch:puck.haunt.id!=='fountain')puck.grab();placePuck();}
          const g=view==='ed-cask'?{x:SEA_WALL_NICHE.x,y:world.heightAt(SEA_WALL_NICHE.x,SEA_WALL_NICHE.z),z:SEA_WALL_NICHE.z}:puckView.group.position,face=view==='ed-cask'?SEA_WALL_NICHE.yaw:puckView.group.rotation.y;
          player.group.position.set(g.x+Math.sin(face)*5,world.heightAt(g.x+Math.sin(face)*5,g.z+Math.cos(face)*5),g.z+Math.cos(face)*5);
          reviewTarget=new THREE.Vector3(g.x,g.y+(view==='ed-cask'?.8:.75),g.z);yaw=face+.4;pitch=view==='ed-ridge'?.3:.12;distance=targetDistance=view==='ed-ridge'?7:2.3;}
        if(['wine-attic','wine-attic-inside','wine-attic-juan','wine-attic-nika'].includes(view)){questStage=QUEST_DONE;combat.finishPractice();player.group.visible=false;
          const P=(a,b)=>({x:SOLIS.centre.x+a,z:SOLIS.centre.z+b});
          if(view==='wine-attic'||view==='wine-attic-inside'){const spot=view==='wine-attic'?{...P(-9,-11),look:P(2.2,-16.8),d:12,p:.2,up:2.6}:{...ATTIC_HEAD,look:P(13.5,-17.2),d:2.2,p:.08,up:1.25};
            player.group.position.set(spot.x,world.heightAt(spot.x,spot.z),spot.z);reviewTarget=new THREE.Vector3(spot.look.x,world.heightAt(spot.look.x,spot.look.z)+spot.up,spot.look.z);
            yaw=Math.atan2(spot.x-spot.look.x,spot.z-spot.look.z);pitch=spot.p;distance=targetDistance=spot.d;}
          else{const npc=npcById.get(view==='wine-attic-juan'?JUAN.id:NIKA.id),a=npc.actor.group,at=a.position,face=a.rotation.y;
            player.group.position.set(at.x+Math.sin(face)*2,at.y,at.z+Math.cos(face)*2);reviewTarget=new THREE.Vector3(at.x,at.y+(view==='wine-attic-juan'?1.45:1.15),at.z);yaw=face+.35;pitch=.08;distance=targetDistance=2.6;}}
        // Brandy Frank in her dye yard: the yard from the lane, and her close.
        if(view==='brandy'||view==='brandy-close'){questStage=QUEST_DONE;combat.finishPractice();player.group.visible=false;
          const npc=npcById.get(BRANDY.id),a=npc.actor.group,at=a.position,face=a.rotation.y,close=view==='brandy-close';
          const look=close?{x:at.x,y:at.y+1.45,z:at.z}:{x:at.x-Math.sin(face)*2.2,y:at.y+.9,z:at.z-Math.cos(face)*2.2},d=close?2.4:10,turn=face+(close?.25:-.15);
          player.group.position.set(look.x+Math.sin(turn)*d,world.heightAt(look.x+Math.sin(turn)*d,look.z+Math.cos(turn)*d),look.z+Math.cos(turn)*d);
          reviewTarget=new THREE.Vector3(look.x,look.y,look.z);yaw=turn;pitch=close?.06:.42;distance=targetDistance=d;}
        // The Empire's assault on the Gate of Sun Horses, as it forms up: the company on the road, the Coalition before the gate.
        if(view==='solis-assault'){questStage=QUEST_DONE;combat.finishPractice();const spec=AFTERMATH_VARIANTS['solis-sweep'];
          combat.startEncounter(aftermathEncounter(spec.id,aftermathArena(spec.arena),borderAllies('empire')),{atCheckpoint:true});reviewFrozen=true;
          const c=aftermathArena(spec.arena).center;reviewTarget=new THREE.Vector3(c.x,world.heightAt(c.x,c.z)+1.5,c.z+4);yaw=Math.PI-.35;pitch=.3;distance=targetDistance=19;}
        // The Koopwood: the lot from the road, Bowden, and the traveler cutting an oak.
        if(['woodlot','bowden','bowden-close','bowden-back','chopping','woodlot-felled'].includes(view)){questStage=QUEST_DONE;combat.finishPractice();
          const bowden=npcById.get(BOWDEN.id);
          if(!bowden)return;   // out of the cast while the main quest is built (src/cast.js)
          const b=bowden.actor.group,at=b.position,face=b.rotation.y;let look,turn,d,p;
          if(view==='woodlot'){look={x:at.x-Math.sin(face)*6,y:at.y+2.5,z:at.z-Math.cos(face)*6};turn=face+.45;d=22;p=.32;}
          else if(view==='bowden'){look={x:at.x,y:at.y+1.25,z:at.z};turn=face+.5;d=4.4;p=.08;}
          else if(view==='bowden-close'){look={x:at.x,y:at.y+1.85,z:at.z};turn=face+.35;d=2.3;p=.04;}
          else if(view==='bowden-back'){look={x:at.x,y:at.y+1.4,z:at.z};turn=face+Math.PI-.6;d=3.8;p=.1;}
          else{if(!skills.taught(WOODCUTTING_SKILL))skills.learn(WOODCUTTING_SKILL);if(skills.level(WOODCUTTING_SKILL)<15){skills.gain(WOODCUTTING_SKILL,2411);clearTimeout(levelUpTimer);}if(!inventory.has('steel-axe'))inventory.add('steel-axe',1);
            const t=woodlotTree.get('koopwood-oak-1');world.woodlot.set(t.id,true);const sx=t.x-1.6,sz=t.z+1.1;player.group.position.set(sx,world.heightAt(sx,sz),sz);player.group.visible=true;
            if(view==='chopping'){chop={id:t.id,next:SWING*.3};look={x:t.x-.8,y:world.heightAt(t.x,t.z)+1.3,z:t.z+.55};turn=-2.1;d=5.2;p=.12;}
            else{world.woodlot.fell(t.id,{x:sx,z:sz});look={x:t.x+1.5,y:world.heightAt(t.x,t.z)+1.6,z:t.z-1.2};turn=-2.4;d=9;p=.22;}}
          if(view!=='chopping'&&view!=='woodlot-felled')player.group.visible=false;
          if(!player.group.visible){const px=look.x+Math.sin(turn)*d,pz=look.z+Math.cos(turn)*d;player.group.position.set(px,world.heightAt(px,pz),pz);}
          reviewTarget=new THREE.Vector3(look.x,look.y,look.z);yaw=turn;pitch=p;distance=targetDistance=d;}
        // The field at the Lauvel: across the fallen to the burial ground ('lauvel-dead'), close on the row ('lauvel-burial'), with the bearers halfway in,
        // and close among the fallen where the bearers lift the next one ('lauvel-fallen').
        if(view==='lauvel-dead'||view==='lauvel-burial'||view==='lauvel-fallen'){questStage=QUEST_DONE;combat.finishPractice();player.group.visible=false;playSeconds=view==='lauvel-fallen'?3:10;
          burying.restore(createBurying().snapshot());world.lauvelField?.setBuried(false);
          const [look,turn,d,p,rise]=view==='lauvel-dead'?[fieldPoint(10,11),-2.55,26,.42,.5]:view==='lauvel-burial'?[fieldPoint(9,19),.6,11,.3,.8]:[fieldPoint(19.5,5),2.3,8,.38,.4];
          player.group.position.set(look.x,world.heightAt(look.x,look.z),look.z);reviewTarget=new THREE.Vector3(look.x,world.heightAt(look.x,look.z)+rise,look.z);
          yaw=turn;pitch=p;distance=targetDistance=d;}
        // The burying: Sela on her feet calling across the field ('lauvel-hail'), and the grave
        // she is given at the end of it, with a board at its head ('lauvel-grave').
        if(view==='lauvel-hail'||view==='lauvel-grave'){questStage=QUEST_DONE;combat.finishPractice();player.group.visible=false;playSeconds=10;
          const grave=view==='lauvel-grave';
          burying.restore({version:1,stage:grave?'done':'asked',done:grave?['spade','hurdle','names']:[],carried:grave?4:0});
          world.lauvelField?.setBuried(grave);
          const [look,turn,d,pp,rise]=grave?[fieldPoint(6.5,15.6),.15,5.5,.26,.7]:[fieldPoint(4.2,21.9),-.1,4.6,.16,1.3];
          player.group.position.set(look.x,world.heightAt(look.x,look.z),look.z);reviewTarget=new THREE.Vector3(look.x,world.heightAt(look.x,look.z)+rise,look.z);
          yaw=turn;pitch=pp;distance=targetDistance=d;}
        // Construction: the house at stage n ('house-3'), the workbench, and a birdhouse with somebody in it.
        if(/^house-\d$/.test(view)||view==='workbench'||view==='birdhouse'){questStage=QUEST_DONE;combat.finishPractice();player.group.visible=false;
          if(!skills.taught(CONSTRUCTION_SKILL))skills.learn(CONSTRUCTION_SKILL);building.claimPlot();let look,turn,d,p;
          if(view.startsWith('house-')){const n=Number(view.slice(6));world.homestead.setStages(n);const c=HOUSE_PLOT;look={x:c.x,y:world.homestead.floorY+(n>3?1.8:1),z:c.z+1};turn=.55;d=n?12:9;p=.2;}
          else if(view==='workbench'){look={x:WORKBENCH_SPOT.x,y:world.heightAt(WORKBENCH_SPOT.x,WORKBENCH_SPOT.z)+1,z:WORKBENCH_SPOT.z};turn=.9;d=4.2;p=.25;}
          else{const spot=BIRDHOUSE_POSTS[0];building.hang(spot.id,'birdhouse');building.update(1e4);world.homestead.setPost(spot.id,building.post(spot.id));
            look={x:spot.x,y:world.heightAt(spot.x,spot.z)+2.2,z:spot.z};turn=Math.atan2(-spot.x,-spot.z)+.5;d=2.2;p=.05;}
          const px=look.x+Math.sin(turn)*d,pz=look.z+Math.cos(turn)*d;player.group.position.set(px,world.heightAt(px,pz),pz);
          reviewTarget=new THREE.Vector3(look.x,look.y,look.z);yaw=turn;pitch=p;distance=targetDistance=d;}
        // John and the Sultana: him on the pier at Tidehaven, her at anchor off it, her coming in under sail, and him on the quay at Solis.
        if(['john','john-pier','sultana','sultana-sailing','john-solis'].includes(view)){questStage=QUEST_DONE;combat.finishPractice();player.group.visible=false;
          const at=view==='john-solis'?'solis':'tidehaven';salt.berth(at);if(view==='sultana-sailing')salt.berth(at,'arriving',sailTime(salt.port)*.55);placeSalt();
          const s=salt.port.stand,ship=salt.pose(),hy=world.heightAt(s.x,s.z);let look,turn,d,p;
          if(view==='john'){look={x:s.x,y:hy+1.5,z:s.z};turn=s.yaw+.3;d=2.6;p=.06;}
          else if(view==='john-pier'||view==='john-solis'){turn=Math.atan2(s.x-ship.x,s.z-ship.z)+.35;look={x:s.x-Math.sin(turn)*3,y:hy+2.2,z:s.z-Math.cos(turn)*3};d=9;p=.12;}
          else{const lead=view==='sultana'?0:9;look={x:ship.x+Math.sin(ship.yaw)*lead,y:3.4,z:ship.z+Math.cos(ship.yaw)*lead};turn=ship.yaw+(view==='sultana'?2.1:1.1);d=view==='sultana'?17:26;p=.12;}
          const px=look.x+Math.sin(turn)*d,pz=look.z+Math.cos(turn)*d;player.group.position.set(px,Math.max(SEA_LEVEL,world.heightAt(px,pz)),pz);
          reviewTarget=new THREE.Vector3(look.x,look.y,look.z);yaw=turn;pitch=p;distance=targetDistance=d;}
        // Brandy's boards from the lane: the three cut like houses, and the yard behind them.
        if(view==='brandy-houses'||view==='brandy-boards'){questStage=QUEST_DONE;combat.finishPractice();player.group.visible=false;
          const houses=view==='brandy-houses',at=yardPoint(houses?-.6:0,houses?3.4:-.5),y=world.heightAt(at.x,at.z),turn=BRANDY_YARD.yaw+(houses?.05:.15),d=houses?6.5:11;
          const px=at.x+Math.sin(turn)*d,pz=at.z+Math.cos(turn)*d;player.group.position.set(px,world.heightAt(px,pz),pz);
          reviewTarget=new THREE.Vector3(at.x,y+(houses?1.4:1.2),at.z);yaw=turn;pitch=houses?.08:.3;distance=targetDistance=d;}
        // Talaelos at its Avrel camp: the company, and a play in progress.
        if(view.startsWith('troupe-')){questStage=QUEST_DONE;combat.finishPractice();player.group.visible=false;troupe.moveTo(view.startsWith('troupe-stop-')?view.slice(12):'avrel');
          if(view==='troupe-scene')troupe.beginScene();else troupe.cancelScene();placeTroupe(true);
          const s=troupe.stop,look={x:s.x+Math.sin(s.yaw)*1.4,z:s.z+Math.cos(s.yaw)*1.4},d=view==='troupe-scene'?8:11;
          const px=look.x+Math.sin(s.yaw+.25)*d,pz=look.z+Math.cos(s.yaw+.25)*d;player.group.position.set(px,world.heightAt(px,pz),pz);
          reviewTarget=new THREE.Vector3(look.x,world.heightAt(look.x,look.z)+1.6,look.z);yaw=s.yaw+.25;pitch=.12;distance=targetDistance=d;}
        // Birding with the pointer up: a bird he has not named yet, close enough to observe,
        // with the caret over it, its wings on the chart and the box beside them.
        if(view==='birding-pointer'){questStage=QUEST_DONE;combat.finishPractice();player.setArmed(false);testTravel('village');show('testing-badge',false);birding.meet();refreshSkillsSheet();
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
        if(view==='lakota'||view==='lakota-aloft'){questStage=QUEST_DONE;combat.finishPractice();const npc=npcById.get(BIRD_WATCHER.id),a=npc.actor.group,at=a.position,face=a.rotation.y;
          player.group.position.set(at.x+Math.sin(face+1.2)*4,world.heightAt(at.x,at.z),at.z+Math.cos(face+1.2)*4);player.group.visible=false;
          if(view==='lakota'){reviewTarget=new THREE.Vector3(at.x,at.y+1.35,at.z);yaw=face+.55;pitch=.1;distance=targetDistance=2.7;}
          else{a.getObjectByName('Left Wrist').getWorldPosition(gloveAt);const glove={x:gloveAt.x,y:gloveAt.y,z:gloveAt.z,yaw:face},anchor={x:at.x,y:at.y,z:at.z};
            redTailFlight.update(60,{glove,anchor});redTailFlight.update(2.5,{glove,anchor});const step=redTailFlight.update(.1,{glove,anchor});redTail.pose(step,elapsed);
            // Hold her mid-circle and look at her, wings out, from a little below and to the side.
            reviewFrozen=true;reviewTarget=new THREE.Vector3(step.x,step.y,step.z);yaw=step.yaw+1.3;pitch=-.25;distance=targetDistance=3;}}
        if(view==='goblin'){questStage=4;combat.finishPractice();combat.startEncounter(greenwayEncounter);const enemy=combat.state.enemies[0];reviewTarget=new THREE.Vector3(enemy.x,world.heightAt(enemy.x,enemy.z)+1.15,enemy.z);reviewFrozen=true;player.group.visible=false;yaw=0;pitch=.13;distance=targetDistance=3.8;}
        if(view==='stick'){questStage=QUEST_DONE;combat.finishPractice();inventory.grant('forest-stick');weapons.equip('forest-stick');player.group.position.set(-35,world.heightAt(-35,29),29);player.group.rotation.y=Math.PI;yaw=Math.PI+.35;pitch=.24;distance=targetDistance=4.5;}
        if(view==='acorns'){questStage=QUEST_DONE;combat.finishPractice();if(!inventory.count('acorn'))inventory.add('acorn');toggleInventory();inventory.select('acorn');}
        if(view==='pawpaw'){questStage=QUEST_DONE;combat.finishPractice();if(!inventory.count('pawpaw'))inventory.add('pawpaw',2);combat.state.player.hp=62;toggleInventory();inventory.select('pawpaw');}
        if(view==='pawpaw-patch'){questStage=QUEST_DONE;combat.finishPractice();woodlandLife.restoreCollectedFruit([]);const f=woodlandLife.state().fruits[0],patch=woodlandLife.state().fruitPatches[0];player.group.position.set(f.x+.5,world.heightAt(f.x+.5,f.z+1),f.z+1);reviewTarget=new THREE.Vector3(patch.x,world.heightAt(patch.x,patch.z)+1.2,patch.z);distance=targetDistance=6;pitch=.35;yaw=.4;}
        if((view==='doomsayer'||view==='doomsayer-dialogue')&&npcById.get('doomsayer')){questStage=QUEST_DONE;combat.finishPractice();const npc=npcData.find(n=>n.id==='doomsayer'),home=world.npcPositions.doomsayer;player.group.position.set(home.x+1.5,world.heightAt(home.x+1.5,home.z+2),home.z+2);npc.actor.group.rotation.y=.25;yaw=.35;pitch=.2;distance=targetDistance=5;reviewTarget=npc.actor.group.position.clone().add(new THREE.Vector3(0,1.4,0));if(view==='doomsayer-dialogue')conversation(npc);}
        if(view==='pond'||view==='fishing'){questStage=QUEST_DONE;combat.finishPractice();currentFishingSpot=world.fishingSpots[0];const bank=world.pond.fishingSpot;player.group.position.set(bank.x,world.heightAt(bank.x,bank.z),bank.z);player.group.rotation.y=Math.PI/2;yaw=-Math.PI/2+.4;pitch=.38;distance=targetDistance=view==='pond'?11:6.2;if(view==='fishing'){campcraft.teachFishing();startFishing();campcraft.update(3.03);reviewFrozen=true;}}
        if(view==='river-fishing'){questStage=QUEST_DONE;combat.finishPractice();currentFishingSpot=world.fishingSpots.find(spot=>spot.id==='reedwater');const bank=currentFishingSpot.fishingSpot;player.group.position.set(bank.x,world.heightAt(bank.x,bank.z),bank.z);yaw=.2;pitch=.34;distance=targetDistance=8;campcraft.teachFishing();startFishing();campcraft.update(3.03);reviewFrozen=true;}
        if(view==='cooking'){questStage=QUEST_DONE;combat.finishPractice();inventory.grant('tinderbox');inventory.add('raw-fish',2);inventory.add('forest-stick',2);const fire=world.firePits[0];campcraft.light(fire.id);player.group.position.set(fire.x,world.heightAt(fire.x,fire.z),fire.z);yaw=.7;pitch=.5;distance=targetDistance=6.5;fireMenu(fire);}
        if(view==='cooked-fish'){questStage=QUEST_DONE;combat.finishPractice();if(!inventory.has('cooked-fish'))inventory.add('cooked-fish',2);combat.state.player.hp=43;toggleInventory();inventory.select('cooked-fish');}
        if(view==='testing'){questStage=QUEST_DONE;combat.finishPractice();modal('testing');}
        const roadViews={sunmeadow:{x:-232,z:34,yaw:1.9,pitch:.26,distance:17},reedwater:{x:-330,z:84,yaw:2.2,pitch:.29,distance:14},threefold:{x:-378,z:130,yaw:2.6,pitch:.25,distance:17},'north-relay':{x:-398,z:190,yaw:2.8,pitch:.25,distance:12},'lauvel-field':{x:-386,z:176,yaw:3.0,pitch:.26,distance:20},'moros-gate':{x:-424,z:252,yaw:2.5,pitch:.24,distance:16},'legion-camp':{x:-520,z:330,yaw:2.3,pitch:.26,distance:26},'suval-border':{x:-232,z:288,yaw:1.4,pitch:.24,distance:14},elod:{x:-78,z:638,yaw:-1.55,pitch:.3,distance:20},'elod-harbour':{x:-8,z:642,yaw:0,pitch:.26,distance:15},'elod-quay':{x:-14,z:620,yaw:-1.5,pitch:.24,distance:12},'elod-city':{x:-24,z:682,yaw:0,pitch:.3,distance:20},'elod-inner-gate':{x:-41,z:597,yaw:Math.PI,pitch:.22,distance:13}};
        roadViews['road-sign']={x:-326,z:80,yaw:2.1,pitch:.2,distance:5};
        if(roadViews[view]){const v=roadViews[view];questStage=QUEST_DONE;combat.finishPractice();inventory.grant('harbor-letter');inventory.grant('road-token');journey.start();player.group.position.set(v.x,world.heightAt(v.x,v.z),v.z);player.group.rotation.y=Math.PI+v.yaw;yaw=v.yaw;pitch=v.pitch;distance=targetDistance=v.distance;reviewFrozen=true;}
        if(view==='waymarker-before'||view==='waymarker-after'){
          questStage=QUEST_DONE;combat.finishPractice();const site=world.journeySites['beacon-west'];
          world.setJourneySiteState(site.id,view==='waymarker-after');
          player.group.position.set(site.x+2,world.heightAt(site.x+2,site.z+3),site.z+3);player.group.visible=false;
          reviewTarget=new THREE.Vector3(site.x-2.1,world.heightAt(site.x-2.1,site.z)+1,site.z);
          yaw=.15;pitch=.18;distance=targetDistance=5;reviewFrozen=true;
        }
        if(view==='road-dialogue'){questStage=QUEST_DONE;combat.finishPractice();inventory.grant('harbor-letter');inventory.grant('road-token');journey.start();const npc=npcData.find(n=>n.id==='meadow-courier'),p=world.npcPositions[npc.id];player.group.position.set(p.x,world.heightAt(p.x,p.z+1.8),p.z+1.8);yaw=.5;pitch=.3;distance=targetDistance=6;conversation(npc);}
        if(view.startsWith('portrait-')){const npc=npcData.find(n=>n.id===view.slice(9));if(npc){questStage=QUEST_DONE;combat.finishPractice();const p=world.npcPositions[npc.id];player.group.position.set(p.x,world.heightAt(p.x,p.z+2),p.z+2);player.group.visible=false;npc.actor.group.rotation.y=.3;reviewTarget=npc.actor.group.position.clone().add(new THREE.Vector3(0,1.3,0));yaw=.3;pitch=.15;distance=targetDistance=4;reviewFrozen=true;}}
        if(['sheep','river-bird','rock-hare'].includes(view)){questStage=QUEST_DONE;combat.finishPractice();const animal=roadLife.state().creatures.find(a=>a.species===({sheep:'sheep','river-bird':'bank-bird','rock-hare':'rock-hare'})[view]);if(animal){player.group.position.set(animal.x+4,world.heightAt(animal.x+4,animal.z+3),animal.z+3);roadLife.update(.03,player.group.position,true);reviewTarget=new THREE.Vector3(animal.x,animal.groundY+.6,animal.z);yaw=.6;pitch=.18;distance=targetDistance=view==='sheep'?5:3.4;player.group.visible=false;reviewFrozen=true;}}
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
        if(view==='squirrel'){questStage=QUEST_DONE;combat.finishPractice();let s=woodlandLife.state().squirrels[0];const observer={x:s.x+1,z:s.z+1};for(let i=0;i<100;i++)woodlandLife.update(.03,observer);s=woodlandLife.state().squirrels[0];reviewTarget=new THREE.Vector3(s.x,s.y+.28,s.z);reviewFrozen=true;player.group.visible=false;distance=targetDistance=3.1;pitch=.12;yaw=Math.atan2(s.x-s.tree.x,s.z-s.tree.z);}
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

