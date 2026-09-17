import * as THREE from 'three';
import { createWorld } from './world.js';
import { createCharacter, makeQuestMarker } from './characters.js';
import { createCombat } from './combat.js';
import { createCombatView } from './combat-view.js';
import { createInventory, INVENTORY_ITEMS } from './inventory.js';
import { createWeapons } from './weapons.js';
import { createConsumables } from './consumables.js';
import { createCampcraft } from './campcraft.js';
import { createWorldMap } from './world-map.js';
import { createWoodlandLife } from './woodland-life.js';
import { createForestEcology } from './forest-ecology.js';
import { createForestStory, FOREST_STORY_NPC, FOREST_STORY_SITES, forestConversation, forestSiteConversation } from './forest-story.js';
import { runForestSmoke, verifyForestReload } from './forest-smoke.js';
import { createForestHideoutQuest, FOREST_HIDEOUT_QUEST, hideoutConversation, hideoutTamsinChoices } from './forest-hideout.js';
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
import { BEGGAR_NPC, createBeggar, beggarConversation } from './beggar.js';
import { createCampaign } from './campaign.js';
import { createAutopilot } from './autopilot.js';
import { HEX_WORLD_TRANSFORM, compassHeading } from './region-layout.js';
import { insideRegion } from './regions.js';
import { runAutoplaySmoke } from './autoplay-smoke.js';
import { describeRegion, computeAdjacency, FACTIONS } from './campaign-world.js';
import { runRoadSmoke, runRoadTestingSmoke } from './road-smoke.js';
import { runRoadTraversal } from './road-traversal.js';
import { runRoadCheckSmoke, verifyRoadReload } from './road-check-smoke.js';
import { createRoadLife } from './road-life.js';
import { createRoadVerges } from './road-verges.js';
import { createRoadAudio as createAudio } from './road-audio.js';
import { createDeveloperMode } from './developer-mode.js';
import { runDeveloperSmoke } from './developer-smoke.js';
import { moveCharacter, canStand, advanceQuest, questSteps, getMovementInput } from './game-state.js';

const $ = id => document.getElementById(id);
const show = (id, visible) => $(id).classList.toggle('hidden', !visible);
let mode = 'opening', questStage = 0;
const keys = new Set(), discoveries = new Set();
let world, renderer, player, scene, camera;
try { init(); } catch(error) { fail(error); }
function fail(error) {
  console.error(error); show('loading',false); show('fatal',true);
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
  world=createWorld(scene,{spatialBatches:!(testingQuery.has('test')&&testingQuery.get('spatial')==='0')});player=createCharacter();scene.add(player.group);
  player.group.position.set(world.boatStart.x,world.boatStart.y,world.boatStart.z);player.group.rotation.y=Math.PI;
  const npcData=[{id:'harbormaster',name:'Mara',role:'Harbormaster',color:0x4b8291},{id:'fisher',name:'Tobin',role:'Fisher',color:0xb97b50},{id:'warden',name:'Eren',role:'Waykeeper',color:0x647b4d},{id:'acorn-cook',name:'Lysa',role:'Village cook',color:0x9c774b},{id:'doomsayer',name:'Orris',role:'Doomsayer',color:0x49434b},{id:'pond-fisher',name:'Bran',role:'Pond fisherman',color:0x7c8f73}];
  npcData.push(...JOURNEY_NPCS);
  npcData.push(...LUSCIA_NPCS,...TOWN_NPCS,BEGGAR_NPC);
  npcData.push({...FOREST_STORY_NPC});
  npcData.push(...REGIONAL_LIFE_NPCS.map(npc=>({...npc})));
  for(const npc of npcData) {
    npc.actor=createCharacter({tunic:npc.color,role:npc.modelRole||npc.id});const p=world.npcPositions[npc.id];
    npc.actor.group.position.set(p.x,world.heightAt(p.x,p.z),p.z);scene.add(npc.actor.group);
    npc.actor.group.rotation.y=npc.id==='harbormaster'?-Math.PI/2:Math.PI/3;npc.marker=makeQuestMarker();scene.add(npc.marker);
    if(npc.id==='acorn-cook'){npc.marker.scale.setScalar(.8);npc.marker.traverse(o=>{if(o.isMesh){o.material.color.set(0xa9dcb1);o.material.emissive.set(0x477c53);}});}
  }
  const objectiveMarker=makeQuestMarker();scene.add(objectiveMarker);
  const trailMarker=makeQuestMarker();trailMarker.scale.setScalar(.7);trailMarker.visible=false;scene.add(trailMarker);
  trailMarker.traverse(object=>{if(object.isMesh){object.material=object.material.clone();object.material.color.set(0x8acfc2);object.material.emissive.set(0x437d76);}});
  const combatEvents=[];
  let weapons,consumables;
  const combat=createCombat({world,position:player.group.position,onEvent:e=>combatEvents.push(e),getWeapon:()=>weapons?.profile(),onWeaponContact:id=>{weapons.contact(id);inventory.refresh();}});
  const combatView=createCombatView(scene,world,camera);
  let practiceHits=0,practiceDodges=0,reviewFrozen=false,reviewTarget=null;
  let yaw=0,pitch=.39,distance=9,targetDistance=9,verticalSpeed=0,grounded=true,walkTime=0,elapsed=0,lastTime=performance.now(),currentNPC=null,toastTimer,arrivalProgress=0;
  let drag=false,pointerX=0,pointerY=0,fullQuality=true,activeDialogue=null,audio=null,lastModalFocus=null;
  const cameraFocus=new THREE.Vector3(),cameraTarget=new THREE.Vector3();
  camera.position.set(16,14,59);camera.lookAt(0,3,13);
  let mapClock=0,frameCount=0,shake=0,combatClock=0,combatCamera=0;
  const frameDeltas=[],map=$('minimap').getContext('2d');
  const inventory=createInventory({
    getWeaponStatus:id=>weapons?.status(id)?{...weapons.status(id),equipBlocked:combat.state.player.action!=='idle'}:null,
    onEquip(id){if(combat.state.player.action!=='idle')return false;return weapons.equip(id);},
    getConsumableStatus:id=>consumables?.status(id),
    onConsume:id=>consumables.consume(id),
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
  weapons=createWeapons({inventory,onEvent(event){
    if(event.type==='weapon-worn')toast(`${event.name} is wearing thin. Repair it at the nearest repair bench.`,`${event.durability} HITS LEFT · I TO CHECK EQUIPMENT`);
    if(event.type==='weapon-broken')toast(event.id==='simple-sword'?'Your sword broke. Find a repair bench, or equip a stick.':event.remaining?'Your stick snapped. Another carried stick is ready.':'Your last stick snapped. Equip your sword or gather another.', 'WEAPON BROKEN');
  }});
  inventory.refresh();combat.setWeaponReady(true);
  consumables=createConsumables({inventory,combat,onEvent(event){
    toast(`Recovered ${event.healed} health.`, `ATE ${(INVENTORY_ITEMS[event.id]?.eatName??'food').toUpperCase()}`);audio?.effect('success');updateHUD();
    if(questStage>=1)saveRoad(false);
  }});
  const campEvents=[];
  const campcraft=createCampcraft({inventory,weapons,fireIds:world.firePits.map(f=>f.id),onEvent:event=>campEvents.push(event)});
  const worldMap=createWorldMap();
  const woodlandLife=createWoodlandLife(scene,world);
  const woodlandSites=woodlandLife.state();
  const forestEcology=createForestEcology(scene,world,{exclusionSites:[...woodlandSites.acorns,...woodlandSites.sticks,...woodlandSites.fruits,...woodlandSites.fruitPatches,{x:-138,z:-31,radius:12},{x:-129,z:-16,radius:3.5}]});
  const forestStory=createForestStory({inventory,weapons});
  const regionalLife=createRegionalLife({inventory});
  const forestHideout=createForestHideoutQuest({inventory});
  const hideoutEncounter=FOREST_HIDEOUT_QUEST.encounter;
  const hideoutWatch=createForestHideoutWatch(scene,world,hideoutEncounter);
  const roadLife=createRoadLife(scene,world);
  const roadVerges=createRoadVerges(scene,world);
  let acornQuest=createAcornQuest();
  const journey=createJourney({inventory,weapons});
  const campaign=createCampaign();
  // Luscia: the chapter at the Lauvel, Lumber Town's people, and Smiths on its square.
  const luscia=createLusciaChapter({inventory});
  const beggar=createBeggar({waypoints:TOWN_BEGGAR_ROUTE});
  const LUSCIA_NPC_IDS=new Set(LUSCIA_NPCS.map(person=>person.id));
  const smiths=npcData.find(person=>person.id===BEGGAR_NPC.id);
  // Regions the journal explains while the road is still Drent's: the start, its neighbors, and the main-quest path.
  const CAMPAIGN_JOURNAL_REGIONS=['Drent','Luscia','Pueth','Elagos','Peblos','Moros Plain','West Suval','East Suval'];
  let atlasRegions=null,atlasAdjacency=null;
  fetch('./assets/azhora-dev-regions.json').then(response=>response.ok?response.json():null).then(data=>{if(data?.regions){atlasRegions=data.regions;atlasAdjacency=computeAdjacency(data.regions);}}).catch(()=>{});
  const journeyGathered=new Set();
  let currentJourneySite=null,currentRegionId=1;
  let currentForestSite=null;
  let currentRegionalSite=null;
  let currentLusciaSite=null;
  let currentHideoutSite=null;
  let meadowCleared=false;
  const greenwayEncounter={id:'tidehaven-raiders',center:{x:-56,z:29},checkpoint:{x:-45,z:29},retreatAxis:'x',retreatLine:-36,enemies:[{id:'goblin-scout',x:-56,z:30.3,hp:75,entry:.2},{id:'goblin-scrapper',x:-60,z:27.7,hp:75,entry:1.5},{id:'goblin-lookout',x:-64,z:29,hp:75,entry:2.8}]};
  const meadowEncounter={id:'meadow-raiders',center:{x:-250,z:12},checkpoint:{x:-236,z:22},retreatAxis:'x',retreatLine:-222,enemies:[{id:'meadow-scout',x:-253,z:8,hp:65,entry:.2},{id:'meadow-scrapper',x:-256,z:18,hp:65,entry:1.5}]};
  let roadStorage;try{roadStorage=window.azhoraRoadStorage||localStorage;}catch{/* Play remains available when storage is disabled. */}
  const checkpoint=createRoadCheckpoint({storage:roadStorage});
  let checkpointAvailable=checkpoint.read();
  let checkpointFailureShown=false;
  let currentAcorn=null,currentStick=null,currentFruit=null,nearRepair=false,currentFire=null,nearFishing=false,currentFishingSpot=null;
  let testingEnabled=false,pendingTesting=false,heardDoom=false;
  let trackedPlaceId=null;
  const trailMap=createTrailMap({mount:$('trail-map'),getModel:localMapModel,onTrack:trackPlace,onClear:clearTrailPin});
  const developer=createDeveloperMode({renderer,normalScene:scene,world,player,onExit:()=>{mode='playing';stopInput();settleCamera();canvas.focus();}});
  function openDeveloper(){
    if(mode!=='testing')return false;
    closeModal();stopInput();mode='developer';
    audio?.update(.1,{position:player.group.position,speed:0,region:world.regionAt(player.group.position.x,player.group.position.z),playing:false});
    developer.open();return true;
  }

  function toast(title,kicker='ALONG THE WAY') {
    $('toast').replaceChildren();const small=document.createElement('small');small.textContent=kicker;
    $('toast').append(small,document.createTextNode(title));$('toast').classList.add('visible');
    clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),4200);
  }
  function refreshQuest() {
    if(questStage===10){
      journey.start();const quest=journey.view();
      if(quest.complete&&campaign.view().chapterId==='luscia-aftermath')luscia.start();
      if(luscia.state.started){const chapter=luscia.view();$('quest-title').textContent=chapter.title;$('quest-detail').textContent=chapter.detail;$('quest-step').textContent=chapter.kicker;return;}
      $('quest-title').textContent=quest.title;$('quest-detail').textContent=quest.detail;
      $('quest-step').textContent=quest.complete?'FOUR REGIONS · ROAD RESTORED':`REGION ${quest.region} · THE ROAD OUT OF DRENT`;
      return;
    }
    const quest=questSteps[questStage];$('quest-title').textContent=quest.title;$('quest-detail').textContent=quest.detail;
    $('lesson-title').textContent=quest.lesson;$('lesson-hint').textContent=quest.hint;
    $('quest-step').textContent=questStage===10?'REGION ONE · COMPLETE':`FIRST SHORE · ${questStage+1} / ${questSteps.length-1}`;
  }
  function updateQuest(event) {
    const previous=questStage;questStage=advanceQuest(questStage,event);
    if(previous===questStage)return;
    if(questStage===2){inventory.grant('harbor-letter');combat.startPractice(world.training);}
    if(previous===2&&questStage===3){combat.finishPractice();audio?.effect('success');}
    if(questStage===5)audio?.effect('success');
    if(questStage===6)inventory.grant('road-token');
    refreshQuest();
    if(questStage===2)toast('Mara’s message','ADDED TO SATCHEL · I TO OPEN');
    else if(questStage===6)toast('Eren’s travel token','ADDED TO SATCHEL · PRESS I');
    else if(questStage===7)toast('Message inspected. Close your satchel to continue.','I OR ESC · BACK TO THE WORLD');
    else toast(questSteps[questStage].title,questStage===10?'REGION ONE COMPLETE · THE PLAIN LIES AHEAD':'JOURNAL UPDATED');
    if(questStage>=1&&!testingEnabled)saveRoad(false);
  }
  function begin() {
    if(mode!=='opening')return;
    campaign.restore(createCampaign().snapshot());
    mode='arriving';document.body.classList.add('playing');$('opening').style.opacity='0';$('opening').style.transform='translateY(15px)';
    world.ringBell?.(elapsed);audio?.effect('bell');
    setTimeout(()=>show('opening',false),700);canvas.focus();
  }
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
    if(tab==='world')worldMap.setTraveler(HEX_WORLD_TRANSFORM.worldToAtlas(player.group.position.x,player.group.position.z));
    show('world-map',tab==='world');show('journal-content',tab==='journey');show('trail-map',tab==='trails');
    for(const [id,name] of [['tab-map','world'],['tab-journey','journey'],['tab-trails','trails']])$(id).classList.toggle('active',tab===name);
    $('journal').classList.toggle('map-open',tab==='world');$('journal').classList.toggle('trail-open',tab==='trails');
    $('journal-title').textContent=tab==='world'?'Azhora':tab==='trails'?'Paths worth taking':'Small beginnings';
    if(tab==='world'){worldMap.open();$('tab-map').focus();}
    if(tab==='trails'){trailMap.open();$('tab-trails').focus();}
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
    if(questStage>=1)knownNPCs.add('harbormaster');
    if(discoveries.has('village'))for(const id of ['fisher','acorn-cook','doomsayer','forest-woodcutter'])knownNPCs.add(id);
    if(questStage>=5)knownNPCs.add('warden');
    if(discoveries.has('pond')||inventory.has('fishing-rod'))knownNPCs.add('pond-fisher');
    if(forest.workAccepted||forest.bundleRecovered||hideout.recovered)knownNPCs.add('forest-woodcutter');
    if(acornQuest.status!=='available')knownNPCs.add('acorn-cook');
    if(heardDoom)knownNPCs.add('doomsayer');
    if(questStage===10)for(const id of journey.view().destinationIds)if(world.npcPositions[id])knownNPCs.add(id);
    for(const npc of JOURNEY_NPCS){const home=world.npcPositions[npc.id];if(discoveries.has(({2:'sunmeadow',3:'reedwater',4:'threefold'})[world.regionAt(home.x,home.z)?.id]))knownNPCs.add(npc.id);}
    const knownLocations=npcData.filter(npc=>knownNPCs.has(npc.id)).map(npc=>({id:npc.id,name:npc.name,description:npc.role,x:npc.actor.group.position.x,z:npc.actor.group.position.z}));
    for(const site of REGIONAL_LIFE_SITES)if(knownIds.has(site.id)&&!world.landmarks.some(place=>place.id===site.id))knownLocations.push({...site,description:site.note||site.prompt});
    return {knownIds,knownLocations};
  }
  function localMapModel(regionId){
    const known=localMapKnown();
    return buildLocalMapModel({world,position:player.group.position,heading:Math.PI-player.group.rotation.y,discoveries,...known,goal:destination(),regionId,trackedId:trackedPlaceId});
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
  function refreshCampaign(){
    const view=campaign.view(),control=campaign.mapControl();
    $('campaign-chapter-title').textContent=`${view.title}${view.region?` · ${view.region}`:''}${view.levelName?` · level ${view.level} ${view.levelName}`:''}`;
    $('campaign-chapter-detail').textContent=view.detail;
    $('campaign-standing').textContent=`${view.sideName}${view.exposed?' · your double-dealing is known':''} · Empire trust ${Math.round(view.trust.empire)} · Coalition trust ${Math.round(view.trust.coalition)}${view.horse?' · a Legion horse':''}`;
    const list=$('campaign-regions');list.replaceChildren();
    for(const id of CAMPAIGN_JOURNAL_REGIONS){
      const info=describeRegion(id,atlasRegions,atlasAdjacency);if(!info)continue;
      const li=document.createElement('li');li.textContent=`${id} · level ${info.level} ${info.levelName}`;
      const small=document.createElement('small');const holder=FACTIONS[control[id]]??info.faction;
      small.textContent=`${holder.name}. ${info.threats.length?info.threats.map(threat=>threat.name).join(', ')+'. ':'No wild threats. '}${info.role}`;
      li.append(small);list.append(li);
    }
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
    if(complete&&campaign.view().chapterId==='drent-road'){campaign.completeChapter('drent-road');inventory.add('silver-coin',3);inventory.refresh();refreshQuest();}
    toast(complete?'The road is restored. Iven will send your report ahead; Luscia waits across the Caloss.':journey.view().title,complete?'FOUR REGIONS EXPLORED':'JOURNAL UPDATED');
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
    const view=luscia.view();
    toast(view.complete?'The rolls are filed. A Legion horse token and four silver for the road west.':view.title,view.complete?'LUSCIA · CHAPTER COMPLETE':'JOURNAL UPDATED');
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
      if(!inventory.remove('silver-coin',1))return {ok:false,reason:'You have no silver to give.'};
      beggar.satisfy();inventory.refresh();toast('Smiths thanks you twice and shuffles back to his corner of the square.','A SILVER COIN');saveRoad(false);
      return {ok:true,reason:''};
    }
    if(action==='dismiss-smiths'){beggar.dismiss();return {ok:true,reason:''};}
    return {ok:false,reason:''};
  }
  function saveRoad(notify=true){
    if(testingEnabled){if(notify)toast('Testing sessions leave your road checkpoint unchanged.','CHECKPOINT');return false;}
    if(questStage<1||questStage===4||combat.state.phase==='active'||combat.state.player.hp<=0){if(notify)toast('Step ashore and finish any active fight before saving.','CHECKPOINT');return false;}
    if(questStage===10)journey.start();
    const gathered=woodlandLife.state();
    const woodland={version:1,acornStatus:acornQuest.status,practiceHits:Math.min(2,practiceHits),practiceDodges:Math.min(1,practiceDodges),
      acorns:gathered.acorns.filter(s=>s.collected).map(s=>s.id),sticks:gathered.sticks.filter(s=>s.collected).map(s=>s.id),
      fruits:gathered.fruits.filter(s=>s.collected).map(s=>s.id),discoveries:[...discoveries],camp:campcraft.checkpoint()};
    const result=checkpoint.save({version:1,questStage,journey:journey.snapshot(),inventory:inventory.items().map(id=>({id,quantity:inventory.count(id)})),weapons:weapons.snapshot(),journeyGathered:[...journeyGathered],meadowCleared,position:{x:player.group.position.x,z:player.group.position.z},heardDoom,health:combat.state.player.hp,lysaComplete:acornQuest.status==='complete',woodland,forestStory:forestStory.snapshot(),forestHideout:forestHideout.snapshot(),regionalLife:regionalLife.snapshot(),campaign:campaign.snapshot(),luscia:luscia.snapshot()});
    if(result.ok){checkpointFailureShown=false;checkpointAvailable=result;$('road-checkpoint-status').textContent='Adventure saved. Continue from the opening screen next time.';if(notify)toast('Your lessons, woodland discoveries, satchel, and weapon condition are saved.','ADVENTURE SAVED');}
    else{$('road-checkpoint-status').textContent=result.reason;if(notify||!checkpointFailureShown)toast(result.reason,'CHECKPOINT');checkpointFailureShown=true;}
    return result.ok;
  }
  function continueRoad(){
    const result=checkpoint.read();if(!result.ok||!result.data){toast(result.reason||'No road checkpoint has been saved yet.','CHECKPOINT');return false;}
    const saved=result.data;
    trackedPlaceId=null;trailMarker.visible=false;
    for(const id of inventory.items())inventory.remove(id,inventory.count(id));
    for(const item of saved.inventory)inventory.add(item.id,item.quantity);
    weapons.restore(saved.weapons);journey.restore(saved.journey);questStage=saved.questStage;practiceHits=saved.woodland?.practiceHits??2;practiceDodges=saved.woodland?.practiceDodges??1;
    journeyGathered.clear();saved.journeyGathered.forEach(id=>journeyGathered.add(id));
    meadowCleared=saved.meadowCleared;heardDoom=saved.heardDoom;
    acornQuest=createAcornQuest({status:saved.woodland?.acornStatus||(saved.lysaComplete?'complete':'available')});
    forestStory.restore(saved.forestStory);forestHideout.restore(saved.forestHideout);regionalLife.restore(saved.regionalLife);
    campaign.restore(saved.campaign??createCampaign().snapshot());if(journey.view().complete&&campaign.view().chapterId==='drent-road')campaign.completeChapter('drent-road');
    luscia.restore(saved.luscia??createLusciaChapter().snapshot());beggar.reset();
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
      &&world.regions.some(region=>insideRegion(region.name,saved.position.x,saved.position.z));
    const point=onPlayableGround?saved.position:questStage<10?world.spawn:world.regions.find(region=>region.id===journey.view().region).spawn;
    player.group.position.set(point.x,world.heightAt(point.x,point.z),point.z);grounded=true;verticalSpeed=0;yaw=Math.PI/2;
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
      if(!combat.startEncounter(hideoutEncounter)){
        forestHideout.endEncounter(hideoutEncounter.id);return {ok:false,changed:false,reason:'The encounter could not start.'};
      }
      stopInput();toast('Two scouts. Watch their swings; the trail behind you is a way out.','OPTIONAL ENCOUNTER · BRAMBLE SCOUT CAMP');audio?.effect('bell');
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
    if(!result.ok){toast(result.reason||'Take a closer look first.','EASTREENA WOODS');return result;}
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
    choices.push({id:'acorn-tangent',label:'How do you turn acorns into food?',action:tangent},{id:'squirrel-tangent',label:'Tell me about the squirrels.',action:squirrels},{id:'pawpaw-tangent',label:'Is there fruit I can eat on the road?',action:fruit},{id:'leave-lysa',label:acornQuest.status==='available'?'Maybe another time.':'Until next time.',action:closeDialogue});
    openDialogue(npc,[line],null,'Back to the road',{choices});
  }
  function conversation(npc) {
    if(mode!=='playing'||!npc||combat.state.phase==='active')return;
    if(REGIONAL_LIFE_NPCS.some(person=>person.id===npc.id)){regionalLifeConversation(npc,regionalContext);return;}
    if(npc.id===FOREST_STORY_NPC.id){forestConversation(npc,forestContext);return;}
    if(npc.id===BEGGAR_NPC.id){beggarConversation(npc,{beggar,inventory,openDialogue,closeDialogue,act:townAct});return;}
    if(TOWN_NPC_IDS.includes(npc.id)){townConversation(npc,{campaign,inventory,openDialogue,closeDialogue,act:townAct});return;}
    if(LUSCIA_NPC_IDS.has(npc.id)||(npc.id==='relay-clerk'&&luscia.state.started)){lusciaConversation(npc,{luscia,inventory,openDialogue,closeDialogue,act:lusciaAct,extraChoices:person=>regionalLifeRelayChoices(person,regionalContext)});return;}
    if(npc.modelRole){journeyConversation(npc,{journey,inventory,openDialogue,closeDialogue,act:journeyAct,extraChoices:person=>regionalLifeRelayChoices(person,regionalContext),
      provideBridgeWood:()=>{const needed=Math.max(0,3-inventory.count('forest-stick'));const ok=!needed||inventory.add('forest-stick',needed);if(ok&&needed){toast('Three sound branches are ready for the bridge.','HOLLIS’S REPAIR TIMBER');saveRoad(false);}return {ok,reason:ok?'':'There is no room for the repair timber.'};},
      teachFishing:()=>{const owned=inventory.has('fishing-rod');const result=campcraft.teachFishing();if(!owned)toast('A spare rod for your journey. Find the marked bank east of the bridge.','FISHING ROD · ADDED TO SATCHEL');return result;}});return;}
    if(npc.id==='acorn-cook'){lysaConversation(npc);return;}
    if(npc.id==='doomsayer'){doomsayerConversation(npc);return;}
    if(npc.id==='pond-fisher'){fisherConversation(npc);return;}
    let lines,event=null,action='Until next time';
    if(npc.id==='harbormaster') {
      if(questStage<2) {
        updateQuest('ashore');
        lines=['You heard the bell from the boat? Bramble goblins have attacked Tidehaven. Three raiders are still on the Greenway, north of the village. The landing is safe, but the road needs help.',
          'You came for the Ambroni contract? Take this letter to Quartermaster Corvan at the Legion post in the Avrel clearing, just beyond our forest. He will enter you into service. Eren at the watch will show you the road.',
          'A mercenary with a sword is welcome here, even in plain cloth. Those raiders carry snapped branches, but you have no armor to hide behind. Try two swings on the straw post at the northern crossroads, then a dodge. Watch their raised sticks and counter after the swing.',
          'Your blade wears with each hit, even in practice. The village repair bench is beside the straw post: press F there to mend your weapons, free of charge. I opens your satchel to check condition or equip a fallen stick gathered in the woods.'];
        event='accept-letter';action='Take the message';
      } else if(questStage===2)lines=['The straw post is north through the square, beside the crossroads. Left-click or R to swing. Hold a direction and tap Ctrl to dodge. Try two hits and one dodge; then follow the road to Eren.'];
      else if(questStage>=6)lines=['Keep my message safe in your satchel. Follow Eren’s road south-west, through the forest and out to the clearing. Quartermaster Corvan in the Avrel clearing will receive your letter and assign your Legion work.'];
      else if(questStage===5)lines=['The bell has gone quiet. You stood your ground for people you had only just met. Thank you. Tell Eren at the watch that all three raiders are gone.'];
      else lines=['Eren is at the Greenway Watch, farther north. If you hear the bell, watch for goblins. Give their sticks room, then strike while they recover.'];
    } else if(npc.id==='fisher') {
      lines=questStage>=5?['You cleared the road! Bran keeps a quieter fishing spot at Willowmere Pond, east of the forest road beyond Eren’s watch. He will lend you a rod if you want to learn. Orris by Lysa’s cottage can show you how to cook what you catch.']:['The bell means goblins. They came down the woodland road this morning; Mara needs a hand before anyone can travel north.', 'Every river of Drent keeps its own small shrine. We leave a little water at the shore and ask for a safe return. Today, I am asking for yours.'];
    } else if(questStage===5) {
      lines=['Three raiders down. Good work. Their rotten sticks made them an easier fight, but remember what kept you standing: watch the windup, dodge to the side, and counter while the stick is down. Leave yourself enough stamina to escape.',
        'Now for a traveler’s other essentials. Keep Mara’s message and this travel token in your satchel. Press I to open it. Hover over an item for a hint, then select the message to read it. I or Escape closes the satchel.',
        'Select a weapon in your satchel to see its condition and choose Equip. A broken sword cannot strike until repaired; a broken stick is used up. Fallen branches make weak spare weapons. The free repair bench is back in the village, beside the straw post.',
        'If those sticks left you hurting, look for ripe pawpaws under the little trees with long leaves. F gathers the fruit. Open I, select a pawpaw, and choose Eat to recover up to 25 health. Lysa can tell you more about them.',
        'Follow the forest road to Fernway Rest, then keep going until the trees open on the Avrel farm clearing. That gate is called the Caloss Gate. The open road leads on toward the Caloss. Find Quartermaster Corvan at the Legion post. The Ambroni Empire hired you from abroad; he will tell you what service means here.'];
      event='meet-waykeeper';action='Take the token';
    } else if(questStage===6||questStage===7)lines=['Press I to open your satchel. Select Mara’s message and read it; then press I or Escape to return to the road. Keep the message and my travel token together.'];
    else if(questStage>=8)lines=['Follow the cairns to Fernway Rest, and then the road south-west to the Caloss Gate. The forest thins there and the Avrel clearing opens out. Beyond the gate, the farm road begins the next leg of your journey.'];
    else if(questStage<2)lines=['Speak to Mara beside the landing before you head inland. She has a small errand and something to help you on the road.'];
    else if(questStage===2)lines=['Try the straw post by the northern crossroads first. Two hits and a dodge. Those simple habits will keep you on your feet.'];
    else lines=['There is movement near the woodland bell, south of here. Approach along the main road, and keep an eye on the trees.'];
    openDialogue(npc,lines,event,action);
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
    const act=(verb)=>{const result=campcraft[verb](fire.id);inventory.refresh();fireMenu(fire,result.ok?(verb==='light'?'The tinder catches. Your fire is lit.':'One fish cooked. Open I to eat it and restore up to 40 health.'):result.reason);};
    openDialogue({id:fire.id,name:fire.id==='village-fire'?'Village fire pit':fire.id==='pond-fire'?'Pondside fire pit':'Roadside fire pit',role:'Camp cooking'},[`${feedback?feedback+' ':''}${condition} ${supplies}`],null,'Leave the fire',{choices:[
      {id:'light-fire',label:status.lit?'Fire already lit':'Light fire · 2 sticks',disabled:!status.canLight,title:status.lightReason,action:()=>act('light')},
      {id:'cook-fish',label:'Cook one raw fish',disabled:!status.canCook,title:status.cookReason,action:()=>act('cook')},
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
      if(event.type==='catch'){toast('A raw fish for your satchel. Cook it over a fire.','FRESH CATCH');audio?.effect('success');}
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
    if(mode==='arriving'){pendingTesting=true;return;}
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
  function openDialogue(npc,lines,event=null,action='Back to the road',options={}){
    activeDialogue={npc,lines,index:0,event,action,...options};mode='dialogue';stopInput();show('interaction',false);show('dialogue',true);
    $('speaker').textContent=npc.name;$('speaker-role').textContent=npc.role.toUpperCase();updateSpeech();
    ($('dialogue-choices').querySelector('button:not(:disabled)')||$('dialogue-next')).focus();
  }
  function updateSpeech() {
    const last=activeDialogue.index===activeDialogue.lines.length-1,choices=last?activeDialogue.choices:null;
    $('speech').textContent=activeDialogue.lines[activeDialogue.index];$('dialogue-next').textContent=last?activeDialogue.action:'Continue  ↵';
    $('speech-page').textContent=choices?'Choose a response · Tab / Enter':`${activeDialogue.index+1} / ${activeDialogue.lines.length} · F or Enter`;
    $('dialogue-choices').replaceChildren();show('dialogue-choices',!!choices);show('dialogue-next',!choices);
    for(const choice of choices||[]){const button=document.createElement('button');button.type='button';button.dataset.choice=choice.id;button.textContent=choice.label;button.disabled=!!choice.disabled||choice.enabled===false;button.title=choice.title||choice.reason||'';button.onclick=choice.action;$('dialogue-choices').append(button);}
    if(choices)$('dialogue-choices').querySelector('button:not(:disabled)')?.focus();
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
  function retry() {
    if(combat.state.encounterId===hideoutEncounter.id)forestHideout.begin({questStage});
    combat.resetEncounter();mode='playing';show('modal-backdrop',false);show('defeat',false);stopInput();grounded=true;verticalSpeed=0;yaw=0;
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
    if(combat.state.phase!=='active'&&currentHideoutSite){
      if(currentHideoutSite==='supplies')hideoutAct('recover-hideout-supplies');else hideoutConversation(hideoutContext);
      return;
    }
    if(combat.state.phase!=='active'&&currentForestSite){forestSiteConversation(currentForestSite.id,forestContext);return;}
    if(combat.state.phase!=='active'&&currentRegionalSite){regionalLifeSiteConversation(currentRegionalSite.id,regionalContext);return;}
    if(combat.state.phase!=='active'&&currentLusciaSite){lusciaAct(LUSCIA_SITE_ACTIONS[currentLusciaSite.id]);return;}
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
        questStage>=10?'You have completed the first-shore tutorial. Keep Mara’s message and Eren’s token in your satchel. Corvan waits beside a stranded cart in the Avrel clearing. All four regions remain open for your return.':'Before setting out, clear the goblins, report to Eren, and check the message in your satchel. Follow the north trail through Fernway Rest to finish this leg of the journey.'
      ]);
    }
  }
  function attack(){if(mode==='playing'&&grounded){
    if(!weapons.profile().usable){toast('Repair your sword at any repair bench, or equip a gathered stick in I.','NO USABLE WEAPON');return;}
    combat.attack(player.group.rotation.y);canvas.focus();
  }}
  function dodge(){
    if(mode!=='playing'||!grounded)return;
    const {forward,side}=getMovementInput(keys);
    const dx=-Math.sin(yaw)*forward+Math.cos(yaw)*side,dz=-Math.cos(yaw)*forward-Math.sin(yaw)*side;
    combat.dodge(Math.hypot(dx,dz)>.01?{x:dx,z:dz}:{x:-Math.sin(player.group.rotation.y),z:-Math.cos(player.group.rotation.y)});
  }
  $('begin').onclick=begin;$('dialogue-next').onclick=nextSpeech;$('resume').onclick=closeModal;$('recover').onclick=recover;$('retry').onclick=retry;
  $('testing-button').onclick=testingMenu;$('opening-testing').onclick=testingMenu;$('test-prepare').onclick=prepareTesting;
  $('test-hideout').onclick=()=>{testTravel('village');forestHideout.restore();syncHideout();const p=FOREST_HIDEOUT_QUEST.approach;player.group.position.set(p.x,world.heightAt(p.x,p.z),p.z);yaw=-.95;settleCamera();toast('F inspects the camp. Choose whether to challenge its two scouts.','OPTIONAL WOODLAND ENCOUNTER');};
  $('test-pond').onclick=()=>testTravel('pond');$('test-village').onclick=()=>testTravel('village');
  $('test-forest').onclick=()=>{testTravel('village');const p=FOREST_STORY_NPC;player.group.position.set(p.x+1.5,world.heightAt(p.x+1.5,p.z+1),p.z+1);settleCamera();toast('Meet Tamsin, then take the little paths into the woods.','EASTREENA · WOODLAND TRAILS');};
  $('ghost-dev-open').onclick=openDeveloper;
  for(const id of [2,3,4])$('test-region-'+id).onclick=()=>testTravel(id);
  for(const [button,npcId,region] of [['test-mill-life','commons-miller',2],['test-reed-life','reed-worker',3],['test-shelter-life','shelter-keeper',4]])$(button).onclick=()=>{testTravel(region);const p=world.npcPositions[npcId];player.group.position.set(p.x+1.2,world.heightAt(p.x+1.2,p.z+1.2),p.z+1.2);settleCamera();toast('F to talk. These local activities are optional.','LIVES ALONG THE ROAD');};
  $('save-road').onclick=()=>saveRoad();$('continue-road').onclick=continueRoad;
  show('continue-road',checkpointAvailable.ok&&!!checkpointAvailable.data);
  if(!checkpointAvailable.ok)$('road-checkpoint-status').textContent=checkpointAvailable.reason;
  $('journal-button').onclick=()=>{if(mode==='journal')closeModal();else{modal('journal');mapTab(false);}};
  $('inventory-button').onclick=toggleInventory;
  $('journal-satchel').onclick=toggleInventory;
  document.querySelectorAll('[data-close]').forEach(b=>b.onclick=closeModal);
  $('tab-journey').onclick=()=>mapTab(false);$('tab-map').onclick=()=>mapTab(true);$('tab-trails').onclick=()=>journalTab('trails');
  $('open-trail-map').onclick=openLocalMap;$('trail-pin-open').onclick=openLocalMap;$('trail-pin-clear').onclick=clearTrailPin;
  $('quality').onclick=()=>{fullQuality=!fullQuality;renderer.setPixelRatio(fullQuality?Math.min(devicePixelRatio,1.7):1);renderer.shadowMap.enabled=fullQuality;$('quality').textContent='Graphics: '+(fullQuality?'full':'light');};
  $('sound').onclick=()=>{audio??=createAudio();$('sound').textContent=audio.toggle()?'Sound on':'Sound off';};
  // Autoplay: the computer plays the road with ordinary inputs; any trusted key or click takes control back.
  const autopilotWorld={bounds:world.bounds,colliders:world.colliders,heightAt:(x,z)=>world.heightAt(x,z),paths:world.paths,npcPositions:world.npcPositions,
    npcNames:Object.fromEntries([...npcData,...JOURNEY_NPCS].map(npc=>[npc.id,npc.name])),journeySites:world.journeySites,lusciaSites:LUSCIA_SITES,
    get stickSites(){return Object.values(world.journeySites||{}).filter(site=>site.type==='sticks').map(site=>({...site,collected:journeyGathered.has(site.id)}));},
    repairBenches:[world.repairBench,...(world.repairBenches||[])].filter(Boolean),training:world.training,northTrail:world.northTrail,border:world.border};
  const autopilotRead=()=>({mode,questStage,practiceHits,practiceDodges,position:{x:player.group.position.x,z:player.group.position.z},
    combat:{phase:combat.state.phase,action:combat.state.player.action,stamina:combat.state.player.stamina,hp:combat.state.player.hp,enemies:combat.state.enemies.map(e=>({id:e.id,x:e.x,z:e.z,action:e.action,progress:e.progress,active:e.active,hp:e.hp}))},
    weapon:weapons.profile(),inventory:{sticks:inventory.count('forest-stick'),cookedFish:inventory.count('cooked-fish'),pawpaws:inventory.count('pawpaw')},
    dialogue:mode==='dialogue'?{choices:[...document.querySelectorAll('#dialogue-choices button')].map(b=>({id:b.dataset.choice,label:b.textContent,enabled:!b.disabled}))}:null,
    journey:{started:journey.state.started,stage:journey.view().stage,complete:journey.view().complete,destinationIds:journey.view().destinationIds,actions:journey.availableActions()},
    luscia:{stage:luscia.view().stage,complete:luscia.view().complete,destinationIds:luscia.view().destinationIds,actions:luscia.availableActions()},
    interaction:{npcId:currentNPC?.id??null,siteId:currentJourneySite?.id??currentLusciaSite?.id??null,nearRepair:!!nearRepair,stickId:currentStick?.id??null}});
  const autopilotActs={begin:()=>begin(),retry:()=>retry(),continue:()=>nextSpeech(),choose:({id})=>document.querySelector(`[data-choice="${id}"]`)?.click(),interact:()=>interact(),
    attack:({yaw:aim})=>{if(mode==='playing'&&grounded&&weapons.profile().usable)combat.attack(aim);},dodge:({x,z})=>{if(mode==='playing'&&grounded)combat.dodge({x,z});},
    'open-inventory':()=>{if(mode==='playing')toggleInventory();},'close-inventory':()=>{if(mode==='inventory')inventory.close();},'select-item':({id})=>inventory.select(id),
    equip:({id})=>{if(combat.state.player.action==='idle'&&weapons.equip(id))inventory.refresh();},eat:({id})=>consumables.consume(id)};
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
    if(mode==='playing'&&['Tab','Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ControlLeft','ControlRight','KeyR'].includes(e.code))e.preventDefault();
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
      if(mode==='dialogue')closeDialogue();
      else if(mode==='playing')modal('pause');else if(['journal','pause','testing'].includes(mode))closeModal();return;
    }
    if(e.code==='Enter'){if(mode==='opening'){if(document.activeElement?.closest('button'))return;e.preventDefault();begin();}else if(mode==='dialogue'){if(document.activeElement?.closest('#dialogue-choices'))return;e.preventDefault();nextSpeech();}else if(mode==='defeated')retry();return;}
    if(e.code==='Tab'&&['pause','journal','testing','dialogue','defeated'].includes(mode)) {
      const container=mode==='dialogue'?$('dialogue'):mode==='defeated'?$('defeat'):$(mode);
      const buttons=[...container.querySelectorAll('button:not(:disabled), [tabindex="0"]')].filter(b=>b.getClientRects().length);
      if(e.shiftKey&&document.activeElement===buttons[0]){e.preventDefault();buttons.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===buttons.at(-1)){e.preventDefault();buttons[0].focus();}return;
    }
    if(e.code==='KeyJ'||e.code==='KeyM'){if(mode==='journal')closeModal();else{modal('journal');mapTab(e.code==='KeyM');}return;}
    if(e.code==='KeyL'){e.preventDefault();if(mode==='journal'&&$('tab-trails').classList.contains('active'))closeModal();else openLocalMap();return;}
    if(e.code==='KeyF'){interact();return;}
    if(e.code==='KeyR'){attack();return;}
    if(e.code==='ControlLeft'||e.code==='ControlRight'){dodge();return;}
    if(mode==='playing'){
      keys.add(e.code);
      if(e.code==='Space'&&grounded&&combat.state.player.action==='idle'){verticalSpeed=6.3;grounded=false;}
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
    if(questStage===1)return{...npcData[0].actor.group.position,name:'Mara'};
    if(questStage===2)return{...world.training,name:'Practice post'};
    if(questStage===3)return{x:-48,z:29,name:'Woodland bell'};
    if(questStage===5)return{...npcData[2].actor.group.position,name:'Eren · Greenway Watch'};
    if(questStage===8)return world.northTrail;
    if(questStage===9)return world.border;
    if(questStage===10){
      const candidates=[...journey.view().destinationIds,...luscia.view().destinationIds].map(id=>{const point=world.journeySites?.[id]||LUSCIA_SITES[id]||world.npcPositions[id]||(id==='border'?world.border:null);return point?{...point,name:point.name||npcData.find(n=>n.id===id)?.name||'The road ahead'}:null;}).filter(Boolean);
      const p=player.group.position;
      return candidates.sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0]||null;
    }
    return null;
  }
  function startAmbush() {
    updateQuest('ambush');combat.startEncounter(greenwayEncounter);world.ringBell?.(elapsed);audio?.effect('bell');
    toast('Goblins on the Greenway!','THE VILLAGE BELL');
  }
  function handleCombatEvents() {
    for(const e of combatEvents.splice(0)) {
      combatView.event(e);audio?.effect(e.type);
      if(e.type==='practice-hit'&&questStage===2)practiceHits++;
      if(e.type==='dodge'&&questStage===2&&Math.hypot(player.group.position.x-world.training.x,player.group.position.z-world.training.z)<9)practiceDodges++;
      if(e.type==='victory'){
        if(combat.state.encounterId==='meadow-raiders'){meadowCleared=true;toast('The field road is quiet again. Recover Corvan’s parcels.','SUNMEADOW RAIDERS DRIVEN OFF');saveRoad(false);}
        else if(combat.state.encounterId===hideoutEncounter.id){
          const result=forestHideout.markCleared(hideoutEncounter.id);syncHideout();
          if(result.ok){toast(result.message,'BRAMBLE SCOUT CAMP · CLEARED');saveRoad(false);}
        }
        else if(combat.state.encounterId===LUSCIA_WOLVES.id){const cleared=luscia.clearWolves(LUSCIA_WOLVES.id);if(cleared.ok){toast('The pack breaks for the copses. Carry the courier\u2019s satchel back to Iven.','THE LAUVEL · WOLVES DRIVEN OFF');saveRoad(false);}}
        else{updateQuest('victory');toast('The Greenway is safe.','THREE RAIDERS DRIVEN OFF');}
      }
      if(e.type==='retreat'){
        if(combat.state.encounterId==='meadow-raiders')toast('Rest near Corvan’s camp; the raiders remain by the cart.','SUNMEADOW · A CHANCE TO RECOVER');
        else if(combat.state.encounterId===hideoutEncounter.id){forestHideout.endEncounter(hideoutEncounter.id);toast('The camp can wait. Return to its approach when you are ready.','BACK TO THE GREENWAY');saveRoad(false);}
        else{updateQuest('retreat');toast('Catch your breath in the village.','RETURN TO THE BELL WHEN READY');}
      }
      if(e.type==='defeat'){
        $('defeat-checkpoint').textContent=combat.state.encounterId==='meadow-raiders'?'Full health · Restart beside the Avrel clearing road':combat.state.encounterId===LUSCIA_WOLVES.id?'Full health · Restart on the road at the Lauvel':'Full health · Restart at the woodland bell';
        if(combat.state.encounterId===hideoutEncounter.id){forestHideout.endEncounter(hideoutEncounter.id);$('defeat-checkpoint').textContent='Full health · Retry from the Bramble Scout Camp approach';}
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
    $('weapon-condition').classList.toggle('worn',weapon.durability<=Math.ceil(weapon.maxDurability*.25));
    show('lesson',mode==='playing'&&questStage<10);show('practice-progress',questStage===2);
    $('inventory-count').textContent=inventory.items().length;
    $('inventory-button').classList.toggle('needs-attention',questStage===6||questStage===7);
    const hideoutTask=forestHideout.view().task;
    const forestTask=hideoutTask&&!hideoutTask.complete?hideoutTask:forestStory.view().task,showForestTask=forestTask&&!forestTask.complete&&world.regionAt(player.group.position.x,player.group.position.z)?.id===1;
    const localRegion=world.regionAt(player.group.position.x,player.group.position.z)?.id;
    const regionalTask=regionalLife.view().tasks.find(task=>task.region===localRegion&&!task.complete);
    show('side-quest',mode==='playing'&&((acornQuest.status==='active'&&localRegion===1)||showForestTask||!!regionalTask)&&!active);
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
    if(showForestTask&&forestTask===hideoutTask)$('side-quest-progress').textContent=forestHideout.state.recovered?'Return the village supplies to Tamsin. J · Woodland notes':forestHideout.state.cleared?'F · Lift the marked sacks beyond the camp.':'Follow the blue cloth trail in the eastern woods. J · Details';
    if(regionalTask){$('side-quest-title').textContent=regionalTask.title;$('side-quest-progress').textContent=regionalTask.detail;}
    show('border-status',mode==='playing'&&player.group.position.z<world.bounds.minZ+18);
    $('practice-hits').textContent=`${Math.min(2,practiceHits)} / 2 hits`;$('practice-dodge').textContent=practiceDodges?'✓ Dodge tried':'0 / 1 dodge';
    show('encounter-status',active&&mode==='playing');
    $('raiders-left').textContent=combat.state.enemies.filter(e=>['goblin','wolf'].includes(e.kind)&&e.hp>0).length;
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
      $('region-kicker').textContent=region.id===1?'THE FIRST SHORE · DRENT':`AZHORA · REGION ${region.id}`;
      if(mode==='playing'&&currentRegionId!==region.id){currentRegionId=region.id;toast(region.subtitle,`REGION ${region.id} · ${region.name.toUpperCase()}`);}
    }
    $('encounter-title').textContent=combat.state.encounterId==='meadow-raiders'?'THE AVREL CLEARING RAIDERS':combat.state.encounterId===hideoutEncounter.id?'BRAMBLE SCOUT CAMP':combat.state.encounterId===LUSCIA_WOLVES.id?'WOLVES ON THE BURIAL LINE':'DEFEND THE GREENWAY';
    const nearestPlace=world.landmarks.reduce((best,place)=>Math.hypot(place.x-player.group.position.x,place.z-player.group.position.z)<Math.hypot(best.x-player.group.position.x,best.z-player.group.position.z)?place:best);
    $('area-name').textContent=nearestPlace.name;
    $('objective-distance').textContent=goal?`${goal.name} · ${Math.round(Math.hypot(goal.x-player.group.position.x,goal.z-player.group.position.z))} m`:'';
    const markerGoal=[0,2,3,8,9,10].includes(questStage)?goal:null;
    objectiveMarker.visible=!!markerGoal;
    if(markerGoal){objectiveMarker.position.set(markerGoal.x,world.heightAt(markerGoal.x,markerGoal.z)+2.8+Math.sin(elapsed*2.5)*.12,markerGoal.z);objectiveMarker.rotation.y=elapsed*.7;}
  }
  refreshQuest();
  function render(now) {
    const rawDt=(now-lastTime)/1000,dt=Math.min(rawDt,.05);lastTime=now;elapsed+=dt;frameCount++;
    if(frameCount>20){frameDeltas.push(rawDt);if(frameDeltas.length>180)frameDeltas.shift();}
    try {
      if(developer.active){
        developer.update(dt);
        if(developer.scene===scene){
          const observer=developer.camera.position;
          woodlandLife.setObserver(observer);roadLife.setObserver(observer);forestEcology.setObserver(observer);
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
      world.updateRegionalPlaces?.(dt,player.group.position,['playing','fishing'].includes(mode)&&!reviewFrozen);
      forestEcology.update(dt,elapsed,player.group.position,['playing','fishing'].includes(mode)&&!reviewFrozen);
      hideoutWatch.update(dt,player.group.position,{cleared:forestHideout.state.cleared,active:combat.state.encounterId===hideoutEncounter.id&&['active','defeated'].includes(combat.state.phase),playing:mode==='playing'&&!reviewFrozen});
      let movement=0;
      if(mode==='opening')player.group.position.y=world.boatStart.y+Math.sin(elapsed*.72)*.085;
      if(mode==='arriving') {
        arrivalProgress=Math.min(1,arrivalProgress+dt/1.9);
        player.group.position.set(THREE.MathUtils.lerp(world.boatStart.x,world.spawn.x,arrivalProgress),THREE.MathUtils.lerp(world.boatStart.y,1.8,Math.min(1,arrivalProgress*1.5)),world.spawn.z);
        player.group.rotation.y=Math.PI/2;movement=2.5;
        if(arrivalProgress===1){mode='playing';player.group.rotation.y=Math.PI;toast('Goblins have attacked the northern road.','FIND MARA AT THE LANDING');if(pendingTesting){pendingTesting=false;modal('testing');}}
      }
      if(autopilot.active&&!reviewFrozen){
        autopilot.step(dt);
        if(Number.isFinite(autopilot.yaw))yaw+=Math.atan2(Math.sin(autopilot.yaw-yaw),Math.cos(autopilot.yaw-yaw))*(1-Math.exp(-3.5*dt));
        if(autopilot.intent!==autopilotIntent){autopilotIntent=autopilot.intent;$('autoplay-intent').textContent=autopilotIntent;}
      }
      if(mode==='playing'&&!reviewFrozen) {
        const before=player.group.position.clone();
        const {forward,side}=autopilot.active?autopilot.move:getMovementInput(keys),magnitude=Math.hypot(forward,side);
        const p=combat.state.player;
        if(magnitude>0) {
          const speed=((autopilot.active?autopilot.move.run:(keys.has('ShiftLeft')||keys.has('ShiftRight')||keys.has('Tab')))?7.2:4.2)*combat.movementScale();
          const dx=(-Math.sin(yaw)*forward+Math.cos(yaw)*side)*speed*dt,dz=(-Math.cos(yaw)*forward-Math.sin(yaw)*side)*speed*dt;
          moveCharacter(player.group.position,dx,dz,world);
          if(p.action==='idle'&&speed>0){const angle=Math.atan2(dx,dz);player.group.rotation.y+=Math.atan2(Math.sin(angle-player.group.rotation.y),Math.cos(angle-player.group.rotation.y))*(1-Math.exp(-15*dt));p.yaw=player.group.rotation.y;}
        }
        combatClock+=dt;combat.update(dt);handleCombatEvents();
        if(p.action==='attack'||p.action==='dodge'){const angle=p.yaw;player.group.rotation.y+=Math.atan2(Math.sin(angle-player.group.rotation.y),Math.cos(angle-player.group.rotation.y))*(1-Math.exp(-24*dt));}
        const floor=world.heightAt(player.group.position.x,player.group.position.z);
        if(!grounded){verticalSpeed-=17*dt;player.group.position.y+=verticalSpeed*dt;if(player.group.position.y<=floor){player.group.position.y=floor;grounded=true;verticalSpeed=0;}}
        else player.group.position.y=floor;
        movement=Math.hypot(player.group.position.x-before.x,player.group.position.z-before.z)/dt;
        if(questStage===0&&player.group.position.z<21)updateQuest('ashore');
        if(questStage===3&&player.group.position.x< -46&&player.group.position.x> -68&&Math.abs(player.group.position.z-29)<8)startAmbush();
        if(questStage===8&&Math.hypot(player.group.position.x-world.northTrail.x,player.group.position.z-world.northTrail.z)<5)updateQuest('reach-north-trail');
        if(questStage===9&&Math.hypot(player.group.position.x-world.border.x,player.group.position.z-world.border.z)<4.5)updateQuest('reach-border');
        if(questStage===10&&!meadowCleared&&journey.state.courierAccepted&&combat.state.phase!=='active'&&Math.hypot(player.group.position.x+250,player.group.position.z-12)<14){
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
      const weaponPose=combat.pose();
      player.setWeapon(weaponPose.weaponUsable?weaponPose.weaponId:null);
      player.setFishing(mode==='fishing');
      player.animate(walkTime,movement,grounded,{...weaponPose,armed:weaponPose.weaponUsable,fishing:mode==='fishing'});
      audio?.update(dt,{position:player.group.position,speed:movement,region:world.regionAt(player.group.position.x,player.group.position.z),playing:['playing','fishing'].includes(mode)&&!reviewFrozen});
      if(mode==='fishing')world.setFishingOrigin(player.fishingTip());
      const lusciaDestinations=questStage===10&&luscia.state.started?luscia.view().destinationIds:[];
      const beggarStep=mode==='playing'&&combat.state.phase!=='active'?beggar.update(dt,{position:player.group.position,here:smiths.actor.group.position}):null;
      if(beggarStep?.line)toast(beggarStep.line,'SMITHS');
      currentNPC=null;let nearest=3.3;
      for(const npc of npcData) {
        const pos=npc.actor.group.position,home=npc.id===BEGGAR_NPC.id&&beggarStep?beggarStep.target:world.npcPositions[npc.id];
        const alarm=combat.state.phase==='active'&&Math.hypot(home.x-player.group.position.x,home.z-player.group.position.z)<65;
        const destX=home.x+(alarm?(npc.id==='warden'?3:npc.id==='harbormaster'?4:-3):0),destZ=home.z+(alarm?2:0);
        const dHome=Math.hypot(destX-pos.x,destZ-pos.z);let pace=0;
        if(mode==='playing'&&dHome>.1){const move=Math.min(dHome,dt*2.4),bx=pos.x,bz=pos.z;moveCharacter(pos,(destX-pos.x)/dHome*move,(destZ-pos.z)/dHome*move,world);pos.y=world.heightAt(pos.x,pos.z);pace=Math.hypot(pos.x-bx,pos.z-bz)/dt;if(pace>.1)npc.actor.group.rotation.y=Math.atan2(destX-pos.x,destZ-pos.z);}
        npc.actor.animate(walkTime+2,pace,true,{alert:alarm});
        const d=pos.distanceTo(player.group.position)+(npc.id===BEGGAR_NPC.id?1.1:0);if(d<nearest){nearest=d;currentNPC=npc;}
        npc.marker.visible=(questStage===1&&npc.id==='harbormaster')||(questStage===5&&npc.id==='warden')||(npc.id==='acorn-cook'&&questStage>=1&&acornQuest.status!=='complete'&&combat.state.phase!=='active')||(npc.id==='doomsayer'&&!heardDoom)||(npc.id==='pond-fisher'&&!inventory.has('fishing-rod'));
        if(npc.modelRole)npc.marker.visible=questStage===10&&journey.view().destinationIds.includes(npc.id);
        if(lusciaDestinations.includes(npc.id))npc.marker.visible=combat.state.phase!=='active';
        if(npc.id===FOREST_STORY_NPC.id)npc.marker.visible=(!forestStory.state.bundleReturned||(forestHideout.state.recovered&&!forestHideout.state.returned))&&questStage>=1&&combat.state.phase!=='active';
        npc.marker.position.set(pos.x,pos.y+3.15+Math.sin(elapsed*2.5)*.12,pos.z);npc.marker.rotation.y=elapsed*.7;
        if(mode==='dialogue'&&activeDialogue?.npc===npc){const p=player.group.position;npc.actor.group.rotation.y=Math.atan2(p.x-pos.x,p.z-pos.z);}
      }
      const nearBorder=Math.hypot(player.group.position.x-world.border.x,player.group.position.z-world.border.z)<9;
      currentAcorn=mode==='playing'?woodlandLife.nearestAcorn(player.group.position,2):null;
      currentStick=mode==='playing'?woodlandLife.nearestStick(player.group.position,2):null;
      currentFruit=mode==='playing'?woodlandLife.nearestFruit(player.group.position,2):null;
      const p=player.group.position,nearestPickup=[currentAcorn,currentStick,currentFruit].filter(Boolean).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];
      if(currentAcorn!==nearestPickup)currentAcorn=null;if(currentStick!==nearestPickup)currentStick=null;if(currentFruit!==nearestPickup)currentFruit=null;
      nearRepair=(world.repairBenches||[world.repairBench]).some(bench=>Math.hypot(p.x-bench.x,p.z-bench.z)<2.1);
      const js=journey.state;
      currentJourneySite=mode==='playing'?Object.values(world.journeySites||{}).filter(site=>!journeyGathered.has(site.id)&&!js.parcels.includes(site.id)&&!js.beacons.includes(site.id)&&!(site.id==='bridge-repair'&&js.bridgeRepaired)&&Math.hypot(p.x-site.x,p.z-site.z)<2.7).sort((a,b)=>Math.hypot(p.x-a.x,p.z-a.z)-Math.hypot(p.x-b.x,p.z-b.z))[0]||null:null;
      currentFire=mode==='playing'?world.firePits.find(fire=>Math.hypot(p.x-fire.x,p.z-fire.z)<2.1):null;
      currentForestSite=mode==='playing'?FOREST_STORY_SITES.find(site=>Math.hypot(p.x-site.x,p.z-site.z)<2.7)||null:null;
      currentRegionalSite=mode==='playing'?REGIONAL_LIFE_SITES.filter(site=>Math.hypot(p.x-site.x,p.z-site.z)<2.3).sort((a,b)=>Math.hypot(p.x-a.x,p.z-a.z)-Math.hypot(p.x-b.x,p.z-b.z))[0]||null:null;
      currentLusciaSite=mode==='playing'&&luscia.view().stage==='find-satchel'?Object.values(LUSCIA_SITES).find(site=>Math.hypot(p.x-site.x,p.z-site.z)<2.7)||null:null;
      currentHideoutSite=null;
      if(mode==='playing'){
        const state=forestHideout.state,config=FOREST_HIDEOUT_QUEST;
        if(state.cleared&&!state.recovered&&Math.hypot(p.x-config.supplies.x,p.z-config.supplies.z)<2.7)currentHideoutSite='supplies';
        else if(Math.hypot(p.x-config.approach.x,p.z-config.approach.z)<3.5||Math.hypot(p.x-config.encounter.center.x,p.z-config.encounter.center.z)<9)currentHideoutSite='approach';
      }
      currentFishingSpot=(world.fishingSpots||[{...world.pond,name:'Willowmere Pond'}]).find(spot=>Math.hypot(p.x-spot.fishingSpot.x,p.z-spot.fishingSpot.z)<2.1)||null;
      nearFishing=!!currentFishingSpot;
      show('interaction',mode==='playing'&&(!!currentNPC||!!currentHideoutSite||!!currentForestSite||!!currentRegionalSite||!!currentLusciaSite||!!currentJourneySite||!!currentFire||nearFishing||!!currentAcorn||!!currentStick||!!currentFruit||nearRepair||nearBorder)&&combat.state.phase!=='active');
      if(currentNPC)$('interaction-label').textContent='Speak with '+currentNPC.name;else if(currentFire)$('interaction-label').textContent='Tend the fire · cooking';else if(nearFishing)$('interaction-label').textContent=inventory.has('fishing-rod')?'Cast a line':`Fishing bank · ask ${currentFishingSpot?.id==='reedwater'?'Hollis':'Bran'} for a rod`;else if(nearRepair)$('interaction-label').textContent='Repair weapons · free';else if(currentFruit)$('interaction-label').textContent='Gather ripe pawpaw · +25 health';else if(currentStick)$('interaction-label').textContent='Gather fallen stick';else if(currentAcorn)$('interaction-label').textContent='Gather acorn';else if(nearBorder)$('interaction-label').textContent='Read the border notice';
      if(currentJourneySite&&!currentNPC)$('interaction-label').textContent=journey.availableActions().find(action=>action.objectiveId===currentJourneySite.id)?.label||(['sticks','fruit'].includes(currentJourneySite.type)?'Gather '+currentJourneySite.name:currentJourneySite.name);
      if(currentForestSite&&!currentNPC)$('interaction-label').textContent=currentForestSite.prompt;
      if(currentRegionalSite&&!currentNPC)$('interaction-label').textContent=currentRegionalSite.prompt;
      if(currentLusciaSite&&!currentNPC)$('interaction-label').textContent=currentLusciaSite.prompt;
      if(currentHideoutSite&&!currentNPC)$('interaction-label').textContent=currentHideoutSite==='supplies'?'Recover the village supplies':'Inspect Bramble Scout Camp · optional';
      distance=THREE.MathUtils.lerp(distance,targetDistance,1-Math.exp(-6*dt));
      combatCamera=THREE.MathUtils.lerp(combatCamera,combat.state.phase==='active'?1:0,1-Math.exp(-3*dt));
      const viewDistance=distance+combatCamera*1.2,viewPitch=THREE.MathUtils.lerp(pitch,Math.max(pitch,.56),combatCamera);
      cameraFocus.copy(player.group.position).add(new THREE.Vector3(0,1.5-combatCamera*.22,0));
      if(mode==='opening'){cameraTarget.set(15+Math.sin(elapsed*.09)*2,12.5,57);cameraFocus.set(0,3.5,14);}
      else {
        if(reviewTarget)cameraFocus.copy(reviewTarget);
        let actualDistance=viewDistance;
        for(const c of world.colliders){const vx=c.x-cameraFocus.x,vz=c.z-cameraFocus.z,along=vx*Math.sin(yaw)+vz*Math.cos(yaw),across=Math.abs(vx*Math.cos(yaw)-vz*Math.sin(yaw));const r=c.r??Math.max(c.hx,c.hz);if(along>0&&along<viewDistance+2&&across<r+.6&&cameraFocus.y<world.heightAt(c.x,c.z)+(c.kind==='house'?6:7))actualDistance=Math.min(actualDistance,Math.max(3.1,along-r-.6));}
        cameraTarget.set(cameraFocus.x+Math.sin(yaw)*actualDistance*Math.cos(viewPitch),cameraFocus.y+Math.sin(viewPitch)*actualDistance,cameraFocus.z+Math.cos(yaw)*actualDistance*Math.cos(viewPitch));cameraTarget.y=Math.max(cameraTarget.y,world.heightAt(cameraTarget.x,cameraTarget.z)+1.2);
      }
      camera.position.lerp(cameraTarget,1-Math.exp(-5*dt));
      cameraFocus.x+=Math.sin(combatClock*73)*shake;cameraFocus.y+=Math.sin(combatClock*59)*shake*.45;camera.lookAt(cameraFocus);
      shake=combatView.update(mode==='playing'&&!reviewFrozen?dt:0,combatClock,combat.state,player.group.position,mode==='playing');
      if(frameCount%15===0){sun.target.position.copy(player.group.position);sun.position.copy(player.group.position).add(new THREE.Vector3(-45,90,38));}
      // Compass bearings are true to the chart: today's road runs south-west across Drent, not north.
      const {index:headingIndex,labels:headings}=compassHeading(yaw,HEX_WORLD_TRANSFORM);
      [...$('compass').children].slice(0,5).forEach((node,i)=>node.textContent=headings[(headingIndex+2-i+8)%8]);
      mapClock+=dt;if(mapClock>.1){updateHUD();drawMinimap(map,{world,position:player.group.position,goal:destination(),combat:combat.state,angle:player.group.rotation.y,time:elapsed,discoveries,tracked:trackedPlace(),northOffset:HEX_WORLD_TRANSFORM.northOffset});mapClock=0;}
      renderer.render(scene,camera);requestAnimationFrame(render);
    }catch(error){fail(error);}
  }
  requestAnimationFrame(render);
  setTimeout(()=>{$('loading').style.opacity='0';setTimeout(()=>show('loading',false),850);},250);

  if(new URLSearchParams(location.search).has('test')) {
    const state=()=>({mode,testingEnabled,heardDoom,journey:journey.state,journeyView:journey.view(),campaign:campaign.view(),luscia:luscia.view(),autoplay:autopilot.active,meadowCleared,region:world.regionAt(player.group.position.x,player.group.position.z).id,campcraft:campcraft.state,questStage,practiceHits,practiceDodges,inventory:inventory.items(),weapons:weapons.snapshot(),sticks:inventory.count('forest-stick'),pawpaws:inventory.count('pawpaw'),acorns:inventory.count('acorn'),sideQuest:acornQuest.status,lysaFriendship:acornQuest.friendship,selectedItem:inventory.selectedId(),phase:combat.state.phase,hp:combat.state.player.hp,enemies:combat.state.enemies.map(e=>({id:e.id,hp:e.hp,action:e.action,progress:e.progress,x:e.x,z:e.z})),position:player.group.position.toArray(),discoveries:[...discoveries],frames:frameCount,averageFrameMs:Math.round(1000*frameDeltas.reduce((a,b)=>a+b,0)/frameDeltas.length),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles});
    const focusedRoadHooks=()=>({world,player,journey,inventory,weapons,campcraft,combat,checkpoint,journeyAct,saveRoad,continueRoad,
      frames:async(count=1)=>{for(let i=0;i<count;i++)await new Promise(resolve=>requestAnimationFrame(resolve));},
      prepare:()=>{questStage=10;practiceHits=2;practiceDodges=1;testingEnabled=false;inventory.grant('harbor-letter');inventory.grant('road-token');
        combat.startPractice(world.training);combat.finishPractice();mode='playing';document.body.classList.add('playing');
        show('opening',false);player.group.position.set(-198,world.heightAt(-198,26),26);refreshQuest();settleCamera();},
      press:code=>document.dispatchEvent(new KeyboardEvent('keydown',{code})),
      release:code=>document.dispatchEvent(new KeyboardEvent('keyup',{code})),
      getMode:()=>mode,setYaw:value=>yaw=value,audioState:()=>audio?.state(),toggleAudio:()=>$('sound').click(),
      startFishing,endFishing,setFishingSpot:id=>{currentFishingSpot=world.fishingSpots.find(spot=>spot.id===id);},
      handleCampEvents,readState:state,setMode:value=>value==='pause'?modal('pause'):closeModal(),
      cameraState:()=>({position:camera.position.toArray(),target:cameraFocus.toArray()})});
    const forestHooks=()=>({...focusedRoadHooks(),forestStory,forestAct,forestEcology,woodlandLife,
      warp:(x,z)=>{player.group.position.set(x,world.heightAt(x,z),z);grounded=true;verticalSpeed=0;},
      prepareVillage:()=>{questStage=1;testingEnabled=false;practiceHits=0;practiceDodges=0;combat.startPractice(world.training);combat.finishPractice();
        mode='playing';document.body.classList.add('playing');show('opening',false);show('loading',false);
        player.group.position.set(FOREST_STORY_NPC.x+1.5,world.heightAt(FOREST_STORY_NPC.x+1.5,FOREST_STORY_NPC.z+1),FOREST_STORY_NPC.z+1);refreshQuest();settleCamera();}});
    const hideoutHooks=()=>({...forestHooks(),forestHideout,hideoutAct,hideoutWatch,handleCombatEvents,attack,
      prepareHideout:(stage=5)=>{forestHooks().prepareVillage();questStage=stage;journey.restore(createJourney().snapshot());reviewFrozen=false;reviewTarget=null;forestHideout.restore();syncHideout();
        if(stage>=2)inventory.grant('harbor-letter');if(stage>=6)inventory.grant('road-token');if(stage>=3){practiceHits=2;practiceDodges=1;}weapons.repair();
        const p=FOREST_HIDEOUT_QUEST.approach;player.group.position.set(p.x,world.heightAt(p.x,p.z),p.z);yaw=-.95;refreshQuest();settleCamera();},
      hideoutEncounter});
    const localMapHooks=()=>({...forestHooks(),trailMap,localMapModel,trackPlace,clearTrailPin,trackedPlace,openLocalMap,discoverySet:discoveries,
      normalSnapshot:()=>({questStage,position:player.group.position.toArray(),inventory:inventory.items().map(id=>({id,quantity:inventory.count(id)})),weapons:weapons.snapshot(),journey:journey.snapshot(),forestStory:forestStory.snapshot(),forestHideout:forestHideout.snapshot(),discoveries:[...discoveries].sort(),health:combat.state.player.hp,checkpoint:checkpoint.read().data}),
      prepareLocalMap:()=>{forestHooks().prepareVillage();discoveries.clear();forestStory.restore();forestHideout.restore();journey.restore(createJourney().snapshot());syncForest();syncHideout();
        trackedPlaceId=null;reviewFrozen=false;reviewTarget=null;player.group.visible=true;show('modal-backdrop',false);show('dialogue',false);
        player.group.position.set(-15,world.heightAt(-15,29),29);yaw=Math.PI/2;pitch=.4;distance=targetDistance=9;refreshQuest();settleCamera();}});
    const regionalHooks=()=>({...forestHooks(),regionalLife,regionalAct,localMapModel,openLocalMap,trackPlace,
      prepareRegional:()=>{focusedRoadHooks().prepare();regionalLife.restore();syncRegionalLife();reviewFrozen=false;reviewTarget=null;player.group.visible=true;show('modal-backdrop',false);show('dialogue',false);yaw=0;pitch=.35;distance=targetDistance=8;stopInput();settleCamera();saveRoad(false);}});
    window.__AZHORA__={state,woodland:()=>woodlandLife.state(),roadLife:()=>roadLife.state(),roadVerges:()=>roadVerges.state(),forestEcology:()=>forestEcology.state(),forestStory:()=>forestStory.state,
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
        if(view==='hideout-approach'){p=FOREST_HIDEOUT_QUEST.approach;yaw=-1.01;pitch=.27;distance=targetDistance=6.5;}
        if(view==='hideout-supplies'){p=FOREST_HIDEOUT_QUEST.supplies;yaw=-.25;pitch=.38;distance=targetDistance=6;}
        player.group.position.set(p.x,world.heightAt(p.x,p.z),p.z);player.group.rotation.y=Math.PI+yaw;
        if(view==='hideout-overview')reviewTarget=new THREE.Vector3(-140,world.heightAt(-140,-31)+1,-31);
        if(view==='hideout-dialogue')hideoutConversation(hideoutContext);
        if(view==='hideout-cleared'){forestHideout.inspect();forestHideout.begin({questStage});forestHideout.markCleared(hideoutEncounter.id);syncHideout();reviewTarget=new THREE.Vector3(-140,world.heightAt(-140,-31)+1,-31);}
        if(view==='hideout-tamsin'){
          forestHideout.inspect();forestHideout.begin({questStage});forestHideout.markCleared(hideoutEncounter.id);forestHideout.recover();syncHideout();
          const npc=npcData.find(n=>n.id===FOREST_STORY_NPC.id),home=world.npcPositions[npc.id];
          player.group.position.set(home.x+1.2,world.heightAt(home.x+1.2,home.z+.6),home.z+.6);yaw=.5;pitch=.3;distance=targetDistance=5;
          forestConversation(npc,forestContext);
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
      runAutoplayChecks:()=>runAutoplaySmoke({...focusedRoadHooks(),autopilot,start:startAutopilot,stop:stopAutopilot,readState:state}),
      autoplay:()=>({active:autopilot.active,intent:autopilot.intent,stopReason:autopilot.stopReason}),
      verifyReload:expected=>verifyRoadReload({...focusedRoadHooks(),continueRoad:()=>{$('continue-road').click();return mode==='playing';}},expected),
      async runRecoveryCheck(){
        const assert=(value,message)=>{if(!value)throw new Error(message);};
        const frames=focusedRoadHooks().frames;
        const saved=JSON.stringify(checkpoint.read().data);
        if(mode==='fishing')endFishing(true);
        mode='playing';player.group.position.set(-244,world.heightAt(-244,12),12);
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
        const assert=(condition,message)=>{if(!condition)throw new Error(message);};
        const wait=ms=>new Promise(r=>setTimeout(r,ms));
        const until=async(condition,message)=>{const deadline=performance.now()+30000;while(!condition()){assert(performance.now()<deadline,message);await wait(40);}};
        const frames=async(count=2)=>{const target=frameCount+count;await until(()=>frameCount>=target,'Rendering stopped');};
        const press=code=>document.dispatchEvent(new KeyboardEvent('keydown',{code}));const release=code=>document.dispatchEvent(new KeyboardEvent('keyup',{code}));
        const tap=code=>{press(code);release(code);};
        const warp=(x,z)=>{player.group.position.set(x,world.heightAt(x,z),z);};
        const finishDialogue=()=>{let limit=10;while(activeDialogue&&limit-->0)nextSpeech();};
        await frames(3);$('begin').click();await until(()=>mode==='playing','Boat arrival did not finish');
        assert(inventory.has('simple-sword')&&weapons.profile().usable&&weapons.profile().durability===24,'Mercenary did not arrive equipped with a sound sword');
        assert(!inventory.has('tinderbox')&&!inventory.has('fishing-rod')&&!testingEnabled,'Normal game unexpectedly granted test supplies');
        assert(renderer.info.render.triangles>1000,'World did not draw');assert(canStand(world.spawn.x,world.spawn.z,world),'Spawn blocked');
        const startingZ=player.group.position.z;press('KeyW');await until(()=>player.group.position.z<startingZ-1,'WASD did not move');release('KeyW');
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
        const harbor=npcData[0];player.group.position.copy(harbor.actor.group.position).add(new THREE.Vector3(-1,0,0));await frames();
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
        const warden=npcData[2];player.group.position.copy(warden.actor.group.position).add(new THREE.Vector3(1,0,0));await frames();tap('KeyF');finishDialogue();assert(questStage===6&&inventory.has('road-token'),'Eren did not introduce inventory or grant the token');
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
          while(Math.hypot(point.x-player.group.position.x,point.z-player.group.position.z)>.75){
            assert(performance.now()<deadline,'Northern path blocked before '+point.x+','+point.z);
            yaw=Math.atan2(player.group.position.x-point.x,player.group.position.z-point.z);await frames(1);
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
        const swordWear=weapons.status('simple-sword').durability;
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
        const roadResults=await runRoadSmoke({world,player,npcData,combat,journey,inventory,weapons,press,release,tap,until,frames,warp,getMode:()=>mode,finishDialogue:()=>{let n=0;while(mode==='dialogue'&&!(activeDialogue.choices&&activeDialogue.index===activeDialogue.lines.length-1)){assert(n++<12,'Road dialogue failed to reach its choices');nextSpeech();}},choose,setYaw:value=>yaw=value,readState:state});
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
        reviewFrozen=false;reviewTarget=null;player.group.visible=true;
        clearTimeout(toastTimer);$('toast').classList.remove('visible');
        document.body.classList.add('playing');show('opening',false);show('loading',false);show('modal-backdrop',false);show('dialogue',false);mode='playing';
        if(view==='battle'){questStage=4;combat.startPractice(world.training);combat.finishPractice();combat.startEncounter(greenwayEncounter);player.group.position.set(-52,world.heightAt(-52,29),29);yaw=Math.PI/2+.28;pitch=.32;distance=targetDistance=7;player.setArmed(true);}
        else{questStage=2;practiceHits=0;practiceDodges=0;combat.startPractice(world.training);player.group.position.set(world.training.x,world.heightAt(world.training.x,world.training.z+3),world.training.z+3);player.group.rotation.y=Math.PI*.85;yaw=.42;pitch=.3;distance=targetDistance=5;player.setArmed(true);}
        if(view==='walk'){questStage=10;combat.finishPractice();player.group.position.set(-52,world.heightAt(-52,29),29);yaw=Math.PI/2+1.15;pitch=.3;distance=targetDistance=6;player.group.rotation.y=Math.PI+yaw;}
        if(view==='inventory'){questStage=6;combat.finishPractice();inventory.grant('harbor-letter');inventory.grant('simple-sword');inventory.grant('road-token');player.group.position.set(-86,world.heightAt(-86,28),28);yaw=Math.PI/2+.2;pitch=.3;distance=targetDistance=7;toggleInventory();inventory.select('harbor-letter');}
        if(view==='border'){questStage=10;combat.finishPractice();player.group.position.set(world.border.x,world.heightAt(world.border.x,world.border.z),world.border.z);player.group.rotation.y=Math.PI;yaw=0;pitch=.16;distance=targetDistance=7;}
        if(view==='map'){combat.finishPractice();modal('journal');mapTab(true);}
        if(view==='lysa'){questStage=10;combat.finishPractice();const npc=npcData.find(n=>n.id==='acorn-cook'),home=world.npcPositions[npc.id];player.group.position.set(home.x+1.5,world.heightAt(home.x+1.5,home.z+1.4),home.z+1.4);yaw=.65;pitch=.36;distance=targetDistance=5;conversation(npc);}
        if(view==='traveler'){questStage=10;combat.finishPractice();player.group.position.set(-35,world.heightAt(-35,29),29);player.group.rotation.y=Math.PI;yaw=Math.PI+.35;pitch=.24;distance=targetDistance=4.5;}
        if(view==='weapons'){questStage=10;combat.finishPractice();inventory.grant('forest-stick');weapons.contact('simple-sword');toggleInventory();inventory.select('simple-sword');}
        if(view==='repair'){questStage=10;combat.finishPractice();player.group.position.set(world.repairBench.x,world.heightAt(world.repairBench.x,world.repairBench.z),world.repairBench.z);yaw=.9;pitch=.45;distance=targetDistance=5;}
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
        const roadViews={sunmeadow:{x:-232,z:34,yaw:1.9,pitch:.26,distance:17},reedwater:{x:-330,z:84,yaw:2.2,pitch:.29,distance:14},threefold:{x:-378,z:130,yaw:2.6,pitch:.25,distance:17},'north-relay':{x:-398,z:190,yaw:2.8,pitch:.25,distance:12},'lauvel-field':{x:-386,z:176,yaw:3.0,pitch:.26,distance:20},'moros-gate':{x:-424,z:252,yaw:2.5,pitch:.24,distance:16},'legion-camp':{x:-520,z:330,yaw:2.3,pitch:.26,distance:26},'suval-border':{x:-232,z:288,yaw:1.4,pitch:.24,distance:14},elod:{x:-48,z:360,yaw:1.6,pitch:.24,distance:18}};
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
        roadLife.update(.001,player.group.position,true);
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

