import {createHarborHost} from './harbor-host.js';
import {horizontalHeading} from '../../gameplay/movement/facing.js';
import {createBirdingHost} from './birding-host.js';
import {STILLROOM_ARRIVAL} from './training/stillroom-door.js';
import {arrivalStore,PRACTICE_KEY,returnPracticeProgress} from './training/arrival-progress.js';
import {COMBAT_TRIALS} from '../../gameplay/combat/combat-trials.js';
import {createGuildDisguise} from './guild-disguise.js';
import {sanctuaryContains,sanctuaryReturnMarker,sanctuaryView,restoreSanctuaryPosition} from '../../content/regions/minora-frontier/guild-sanctuary-layout.js';
import * as THREE from 'three';
import {createCharacter,groundShadow} from '../../content/characters/characters.js';
import {ROLLO_LOOK} from '../../content/characters/rollo-look.js';
import {hexAt,TRANSFORM,regionAt} from '../../world/terrain/region-world.js';
import {canStand,canSwim} from '../../gameplay/movement/locomotion.js';
import {loadExplorationWorld} from './world-adapter.js';
import {explorationMovement} from './movement.js';
import {createCameraObstruction} from './camera-obstruction.js';
import {createConversationCamera} from './conversation-camera.js';
import {lookoutCamera} from './lookout-panorama.js';
import {lookoutChart} from './lookout-chart.js';
import {START} from './checkpoint.js';
import {createTowerState,TOWER_SPAWN,TOWER_EXIT} from './tower-state.js';
import {createAfterlifeHost} from './afterlife-host.js';
import {createWarHero,ghostStep} from './afterlife-form.js';
import {LIMBO_SPAWN} from '../../content/regions/minora-frontier/limbo-chamber.js';
import {createFireballHost} from './fireball-host.js';
import {createPigeonHost} from './pigeon-host.js';
import {createResidentHost} from './resident-host.js';
import {createMinoraCivicHost} from './minora-civic-host.js';
import {minoraCivicPublicReport,minoraResidentCivicContext} from '../../content/regions/minora-frontier/minora-civic-economy.js';
import {createCouncilHost} from './council-host.js';
import {councilRoom,councilSpawn,councilSavedPosition} from '../../content/regions/minora-frontier/minora-council.js';
import {createTowerHost} from './tower-host.js';
import {createTowerWizardHost} from './tower-wizard-host.js';
import {createTowerWorkshopHost} from './tower-workshop-host.js';
import {towerFloorAt,towerStairPoint} from '../../content/regions/minora-frontier/tower-floor-layout.js';
import {isUnbriefedTowerCheckpoint} from './campaign-allegiance.js';
import {createStableHost} from './stable-host.js';
import {createLocalMap} from './local-map.js';
import {TOWER,TALETH_SPOT,TOWER_DOOR,LOOKOUT,LOOKOUT_SPAWN} from './tower-state.js';
import {MODES,allowsRegion} from './modes.js';
import {explorationDestinations,findRegionArrival} from './developer-travel.js';
import {openWorldSkirmish} from './world-skirmish.js';
import {LIZEEM_BATTLEFIELDS} from '../../content/scenarios/lizeem-battlefields.js';
import {LIZEEM_FIELD_SITES} from '../../content/scenarios/lizeem-field-sites.js';
import {createExplorationMounts} from '../../dev/tools/exploration-mounts.js';
import {createYunethreAutoplay} from '../../gameplay/autoplay/yunethre-autoplay.js';
import {createYunethreTravel} from '../../gameplay/autoplay/yunethre-travel.js';
import {yunethreMusicArea} from '../../world/audio/yunethre-score.js';
import {CHAPTER_LOCATIONS} from '../../content/chapters/yunethre/locations.js';
import {yunethreRiding} from '../../content/chapters/yunethre/checkpoint.js';
import {createLizeemCampaignAutoplay} from '../../gameplay/autoplay/lizeem-campaign-autoplay.js';
import {createOvesosJourneyAutoplay} from '../../gameplay/autoplay/ovesos-journey-autoplay.js';
import {createLizeemWorldAutoplay} from '../../gameplay/autoplay/lizeem-world-autoplay.js';
import {createOvesosPractice} from '../../dev/tools/ovesos-practice.js';
import {selectedCombatTempo,selectedTrialAttributes,selectedMilitiaWeapon,selectedTrialRound} from './combat-testing.js';
import {MENORA_CAMP} from '../../content/regions/minora-frontier/menora-city.js';
import {createExplorationTouch,phoneLayout} from './exploration-touch.js';
import {explorationQuality,createFrameLog} from './exploration-quality.js';
import {createAdventureTimeGate} from './adventure-time.js';
import {createWeatherHost,createWeatherControls} from '../../world/environment/weather-host.js';

export async function startExploration({saved,warSaved=null,warMode=false,hearthfallSaved=null,chapterSaved=null,launch=warMode?MODES.war:MODES.explore,store,begun,loadingMode='fast',combatExercise=null,autoplaySide=null,lookoutPreview=false,openingClock=false,adventureClock=false,campaignSide=null,soundtrack=null,fromStillroom=false,onCombatMenu=()=>{}}){
  openingClock=openingClock||adventureClock;
  const chapterTwo=launch.id==='yunethre',chapterThree=launch.id==='oremindi',chapterMode=chapterTwo||chapterThree;
  if(chapterTwo&&!(await import('../../content/chapters/yunethre/checkpoint.js')).validYunethreSave(chapterSaved))throw Error('The Chapter 2 checkpoint is incompatible.');
  if(chapterThree&&!(await import('../../content/chapters/oremindi/checkpoint.js')).validOremindiSave(chapterSaved))throw Error('The Chapter 3 checkpoint is incompatible.');
  const mountainPlaces=chapterThree?(await import('../../content/chapters/oremindi/locations.js')).OREMINDI_LOCATIONS:null;
  const foodWorld=launch.id==='food-world',hearthfallMode=launch.id==='hearthfall',combatMode=launch.id==='combat',startPoint=combatMode?MENORA_CAMP:launch.start??START;
  const warRules=warMode?await import('./world-war.js'):null;
  const campaignScenario=warMode?(warSaved?warRules.worldWarScenario(warSaved.simulation.scenario):foodWorld?warRules.FOOD_WORLD_SCENARIO:adventureClock?warRules.UNIFIED_WORLD_WAR_SCENARIO:openingClock?warRules.OPENING_WORLD_WAR_SCENARIO:warRules.WORLD_WAR_SCENARIO):null;
  const reviewedCountryside=warMode&&warRules.usesReviewedAgriculture(campaignScenario.id);
  const $=id=>document.getElementById(id),canvas=$('exploration-canvas');
  const autoplayButton=$('world-autoplay');
  const abort=new AbortController();
  const listen=(target,type,handler,options={})=>target.addEventListener(type,handler,{...options,signal:abort.signal});
  const scene=new THREE.Scene();scene.background=new THREE.Color(0xb6c8b0);scene.fog=new THREE.Fog(0xb6c8b0,180,560);
  // A phone draws less (8 October 2026; src/app/exploration/exploration-quality.js): ?quality=full|phone overrides.
  const quality=explorationQuality({search:location.search,phone:phoneLayout(),coarse:!!globalThis.matchMedia?.('(pointer: coarse)').matches}),frameLog=quality.frameLog?createFrameLog():null;
  const renderer=new THREE.WebGLRenderer({canvas,antialias:quality.antialias});renderer.setPixelRatio(Math.min(devicePixelRatio,quality.pixelRatio));
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  const camera=new THREE.PerspectiveCamera(55,innerWidth/innerHeight,.12,quality.far);
  const hemisphere=new THREE.HemisphereLight(0xf0f2d8,0x53644b,1.65);scene.add(hemisphere);
  const sun=new THREE.DirectionalLight(0xffe6ba,2.1);sun.position.set(-100,180,70);scene.add(sun);
  const loading=message=>{$('loading-message').textContent=message;console.log('EXPLORATION_LOADING '+message);};
  let minoraFall=null,chapterMusic=null,chapterAutoplay=null,chapter=null,towerState=warMode||chapterMode?createTowerState(chapterMode?chapterSaved:warSaved):null,tower=null,guildWizards=null,workshop=null,council=null,pigeons=null,birding=null,lookoutView=null,lookoutTime=0;
  function boundedWarSave(data,opening){
    if(data&&opening?.room==='tower'){const restored=restoreSanctuaryPosition(data.position);if(restored!==data.position)data={...data,position:restored};}
    return warMode&&data&&!opening.inside&&!allowsRegion(launch,regionAt(data.position.x,data.position.z).id)
      ?{...data,position:{...TOWER_EXIT,y:21.3},heading:0}:data;
  }
  const originalSaved=saved;saved=boundedWarSave(saved,towerState);
  const relocatedSave=saved!==originalSaved;
  const world=warMode||chapterMode?await (await import('./tower-world.js')).createTowerWorld(scene,loading,{inside:towerState.inside||!!warSaved?.afterlife?.inLimbo,room:towerState.room,position:saved?.position??TOWER_EXIT,enabledRegions:launch.regions,foodWorld,reviewedCountryside,relocatedTower:mountainPlaces?.tower})
    :combatMode?await (await import('./combat-practice-world.js')).loadCombatPracticeWorld(scene,loading,{exercise:combatExercise??'lesson',outdoorLights:[hemisphere,sun]})
    :await loadExplorationWorld(scene,saved?.position??startPoint,loading,{enabledRegions:launch.regions,loadingMode});
  if(warSaved?.afterlife?.inLimbo)world.showLimbo();
  const actor=warMode||combatMode||chapterMode?createWarHero(ROLLO_LOOK):createCharacter({role:'traveler',look:ROLLO_LOOK,armed:false,hat:false});
  if(warMode)actor.setForm(warSaved?.afterlife?.inLimbo?'living':warSaved?.afterlife?.form??'living');actor.setArmed(false);scene.add(actor.group);
  const guildDisguise=createGuildDisguise(actor);
  const shadow=groundShadow(.28);scene.add(shadow);
  const position=new THREE.Vector3(),keys=new Set(),cells=new Set(saved?.cells??[]);
  const adventureTime=createAdventureTimeGate();
  let elapsed=saved?.elapsed??0,yaw=saved?.camera.yaw??0,pitch=saved?.camera.pitch??.27,distance=saved?.camera.distance??8;
  let mode='playing',drag=false,frameId,last=performance.now(),disposed=false,statusTimer,dirty=false,courierView=null;
  let sorcery=null,afterlife=null,hearthfall=null,residentHost=null,civicHost=null,harbor=null,stable=null,minimap=null,dayNight=null,openingTime=null,foodDemo=null,boundaryBlocked=false;
  let training=null,trainingLoading=false,weather=null,weatherControls=null;
  let frameErrors=[],frames=0,streamClock=0,war=null,windowActive=true,skirmish=null,autoplay=null,journey=null,campaignAutoplay=null,practice=null,waterBlocked=false,horseSwimming=false,lastCrossing=null,autoplayMessage='',startCavalry=null,startMountain=null,cavalryOpening=false,recoverCavalry=null;
  const movement=explorationMovement(position,world),map=combatMode?null:(await import('../../ui/map/world-map.js')).createWorldMap({includeQuests:false,regionScope:launch.mapRegions??null});
  const mounts=createExplorationMounts({scene,actor,position,world,movement});
  const footHelp=$('exploration-help').textContent;
  // Touch controls for a phone (8 October 2026; src/app/exploration/exploration-touch.js): a stick and buttons that
  // press the keys read below, a finger on the view to look; `touch.sync` once a frame, `touch.steer` for travel.
  const touch=createExplorationTouch({document,keys,search:location.search,coarse:!!globalThis.matchMedia?.('(pointer: coarse)').matches,onTakeControl:()=>stopAutoplay()});
  const combatAim=new THREE.Vector3();
  const focus=new THREE.Vector3(),desired=new THREE.Vector3(),cameraOffset=new THREE.Vector3(0,1.55,0);

  function autoplayActive(){return !!(chapterAutoplay?.state().active||campaignAutoplay?.state().active||autoplay?.state().active||journey?.state().active);}
  function stopAutoplay(){chapterAutoplay?.stop();autoplay?.stop();journey?.stop();campaignAutoplay?.stop();}
  function autoplayStatus(message,active){autoplayMessage=message;const button=autoplayButton;if(!button.isConnected)document.body.append(button);const canResume=(chapterMode&&!chapter?.state().returned)||campaignAutoplay?.state().canResume;button.hidden=!active&&!canResume;button.textContent=message+(active?' / Stop (P)':canResume?' / Resume autoplay (P)':'');button.setAttribute('aria-pressed',String(active));refreshAutoplayFocus();if(!active){notice(message);if(campaignAutoplay?.state().error)clearTimeout(statusTimer);}}
  function refreshAutoplayFocus(){if(autoplayActive())autoplayButton.textContent=windowActive?autoplayMessage+' / Stop (P)':'Autoplay waiting / Return to this window to resume';}
  function notice(message){$('exploration-status').classList.toggle('on-map',mode==='map');$('exploration-status').hidden=false;$('exploration-status').textContent=message;clearTimeout(statusTimer);statusTimer=setTimeout(()=>{$('exploration-status').hidden=true;},4500);}
  function discover(){if(towerState?.inside||world.state?.().inLimbo)return;const h=hexAt(position.x,position.z),key=`${h.q},${h.r}`;if(!cells.has(key)){cells.add(key);dirty=true;}}
  function clockHoldReason(){
    // Read actual open panels, including immediately after closing one: native
    // details toggle events are deferred and can otherwise re-pause travel.
    const reading=mode==='map'?!!$('food-world-report')?.open:!!$('world-war-report').querySelector('details[open]');
    return adventureTime.reason({mode,room:towerState?.room,active:windowActive,reading,mapRunning:war?.mapTimeRunning()});
  }
  function updateAtmosphere(dt=0){weather?.restore();dayNight?.update(dt);weather?.update(dt);}
  function updateChart(){
    if(!map)return;
    const glimpsed=new Set();for(const key of cells){const [q,r]=key.split(',').map(Number);for(const [dq,dr] of [[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]]){const near=`${q+dq},${r+dr}`;if(!cells.has(near))glimpsed.add(near);}}
    const tourChart=warMode?lookoutChart(launch.mapRegions,towerState.snapshot().concluded):null;
    if(tourChart){map.setRegionScope(tourChart.regions,{label:tourChart.label});document.querySelector('.atlas-help').textContent=tourChart.help;}
    map.setChart({cells:[...cells],glimpsed:[...glimpsed],reveal:$('reveal-all').checked,chartedRegions:tourChart?.chartedRegions??[],marks:chapter?.mapMarks()});
    const chartPosition=chapter?.worldPosition?.()??position;
    map.setTraveler(TRANSFORM.worldToAtlas(chartPosition.x,chartPosition.z),{region:regionAt(chartPosition.x,chartPosition.z).name,heading:TRANSFORM.worldHeadingToAtlas(horizontalHeading(actor.group.quaternion))});
    war?.refreshKnowledge();
  }
  function setMode(next){
    if(training&&next!=='training')return;
    mode=next;keys.clear();drag=false;war?.mapMode(next==='map');
    if(chapterMode)autoplayButton.hidden=chapterThree||next==='cinematic'||next==='skirmish'||next==='loading'||next==='briefing'&&!autoplayActive()||!!chapter?.state().returned;
    soundtrack?.refresh();
    document.body.classList.toggle('in-tower-training',next==='training');
    if(['skirmish','encounter','briefing','chronicle','training'].includes(next)){$('exploration-status').hidden=true;clearTimeout(statusTimer);}
    $('exploration-developer').hidden=next!=='developer';
    $('map-screen').hidden=next!=='map';$('exploration-pause').hidden=next!=='pause';
    $('exploration-hud').hidden=next!=='playing';$('exploration-help').hidden=!['playing','limbo'].includes(next);
    if(next==='playing'){world.loading.start();canvas.focus();}else world.stop();
    chapter?.update();tower?.update();guildWizards?.update();workshop?.update();council?.update();residentHost?.update();civicHost?.update();harbor?.update();pigeons?.update();birding?.update();sorcery?.update(0);stable?.update(0,elapsed);minimap?.update(1,elapsed);afterlife?.update();updateAtmosphere(0);openingTime?.update(true);
  }
  function openMap(options={}){if(combatMode||training||trainingLoading)return;if(warMode)options={view:'geopolitical',...options,regions:lookoutChart(launch.mapRegions,towerState.snapshot().concluded).regions};if(hearthfallMode)options={...options,regions:['Feradom']};if(mode==='loading'||mode==='encounter'||mode==='skirmish')return;$('exploration-status').hidden=true;clearTimeout(statusTimer);setMode('map');updateChart();$('world-demo-caption').hidden=!options?.regions;map.open({...options,objective:chapterMode});$('close-map').focus();}
  function pause(){if(training){training.pause();return;}if(combatMode)return;if(mode==='loading'||mode==='encounter'||mode==='skirmish')return;setMode('pause');$('save-note').textContent=store.rehearsal?'This is a temporary testing rehearsal. Saving keeps a checkpoint in memory only. Your normal campaign is untouched.':hearthfallMode?(dirty?'You have unsaved Hearthfall progress. Save before leaving.':'Hearthfall uses its own local save slot.'):war?(dirty?'You have unsaved campaign progress. Save the hero and war before leaving.':'Your war scenario save is separate from ordinary exploration.'):dirty?'You have unsaved exploration. Save before leaving to keep it.':'Your last saved exploration is kept separately from the adventure.';$('resume-exploration').focus();}
  function refreshTravelHelp(){
    if(world.state?.().inLimbo){$('exploration-help').textContent='WASD walk / Right-drag look / F speak with the Reaper';return;}
    if(actor.form==='ghost'){$('exploration-help').textContent='Ghost / WASD drift / Shift faster / M map / Return to the Reaper to choose another fate';return;}
    if(towerState?.inside){$('exploration-help').textContent='WASD / arrows \u00b7 Shift run \u00b7 Space jump \u00b7 F interact \u00b7 Right-drag look \u00b7 Scroll zoom \u00b7 Esc pause \u00b7 F5 save';return;}
    $('exploration-help').textContent=waterBlocked?'Find a gentler bank to enter the water.':mounts.airborne()?`${mounts.kind==='dragon'?'Developer dragon':'Developer bat'} \u00b7 WASD fly \u00b7 Space up \u00b7 Ctrl down \u00b7 Shift boost \u00b7 Tab turbo \u00b7 G land \u00b7 F8 tools`
      :mounts.kind==='horse'&&horseSwimming?'Horse swimming / WASD steer / Reach a dry bank to dismount':mounts.kind==='horse'?`${stable?.mounted?'Your horse':'Developer horse'} \u00b7 WASD ride \u00b7 Shift canter \u00b7 Space jump \u00b7 G dismount \u00b7 Right-drag look \u00b7 M map \u00b7 F8 tools`:stable?.owned?footHelp+' \u00b7 G mount \u00b7 H whistle':footHelp;
  }
  function openDeveloper(){
    if(training||trainingLoading)return;
    if(combatMode||afterlife?.inLimbo||afterlife?.form==='ghost')return;
    if(towerState?.inside){notice('Leave the building before using mounts, travel or combat playtests.');return;}
    if(mode==='loading'||mode==='encounter'||mode==='skirmish')return;setMode('developer');$('exploration-status').hidden=true;
    $('developer-current').textContent=mounts.kind==='foot'?'On foot':`Riding developer ${mounts.kind}${mounts.state().landing?' \u00b7 landing':''}`;
    for(const button of document.querySelectorAll('[data-exploration-mount]'))button.setAttribute('aria-pressed',String(button.dataset.explorationMount===mounts.kind));
    $('developer-region').value=String(world.regionAt(position.x,position.z).id);$('developer-reveal').checked=$('reveal-all').checked;$('developer-region').focus();
  }
  function selectMount(kind){
    if(training||trainingLoading)return {ok:false,reason:'Return to the tower before changing mounts.'};
    if(afterlife?.inLimbo||afterlife?.form==='ghost')return {ok:false,reason:'This form cannot ride.'};
    if(towerState?.inside&&kind!=='foot'){const reason='Mounts wait outside the building.';notice(reason);return {ok:false,reason};}
    if(mode==='encounter'||mode==='skirmish')return {ok:false,reason:'Finish the encounter first.'};
    if(stable?.mounted){if(kind==='foot'){stable.toggleMount();refreshTravelHelp();return {ok:mounts.kind==='foot'};}stable.park();}
    const result=mounts.select(kind);if(!result.ok){notice(result.reason);return result;}
    if(kind==='dragon')distance=Math.max(15,distance);else if(kind==='bat')distance=Math.max(10,distance);
    mounts.draw(elapsed,{...movement.state(),heading:actor.group.rotation.y,speed:0});refreshTravelHelp();setMode('playing');updateCamera(true);return result;
  }
  function setReveal(value){$('reveal-all').checked=!!value;$('developer-reveal').checked=!!value;updateChart();}
  async function travelToRegion(id){
    if(towerState?.inside){notice('Use the tower door after speaking with Taleth.');return false;}
    if(afterlife?.inLimbo||afterlife?.form==='ghost'||mode==='loading'||mode==='encounter'||mode==='skirmish')return false;
    if(!allowsRegion(launch,Number(id))){notice(warMode?'The war scenario is limited to its five regions. Use Explore the World for the full continent.':'Hearthfall is limited to Feradom. Use Explore the World from the main menu for other regions.');return false;}
    const region=explorationDestinations.find(r=>r.id===Number(id));if(!region){notice('Choose a region first.');return false;}
    setMode('loading');$('loading-screen').hidden=false;loading('Preparing '+region.name);
    try{
      await world.prepareRegion(region.id);const at=findRegionArrival(region,world);
      if(!at)throw new Error('No clear, dry arrival found in '+region.name+'. Your position has not changed.');
      place(at);dirty=true;updateLocation();updateCamera(true);setMode('playing');notice('Arrived in '+region.name+'.');return true;
    }catch(error){setMode('developer');openDeveloper();notice(error.message);return false;}
    finally{$('loading-screen').hidden=true;if(mode==='loading')setMode('developer');}
  }
  let sanctuaryEnvironmentActive=false;
  function setTowerEnvironment(){
    if(!towerState)return;
    weather?.restore();
    const limbo=world.state().inLimbo,lookout=towerState.room==='lookout';
    const sanctuary=towerState.room==='tower'&&sanctuaryView(position);sanctuaryEnvironmentActive=sanctuary;
    scene.background=new THREE.Color(sanctuary?0xb7c9c4:limbo?0x101c2b:lookout?0xb6c8b0:towerState.inside?0x354751:0xb6c8b0);
    scene.fog=sanctuary?new THREE.Fog(0xb7c9c4,260,950):lookout?new THREE.Fog(0xb6c8b0,2500,4100):towerState.inside||limbo?null:new THREE.Fog(0xb6c8b0,180,560);
    camera.far=sanctuary?4000:lookout?Math.max(quality.far,6000):quality.far;camera.updateProjectionMatrix();
    sun.intensity=limbo?.15:towerState.inside&&!lookout?.45:2.1;updateAtmosphere(0);refreshTravelHelp();
  }
  const changeTower=enter=>changeRoom(enter?'tower':null);
  async function enterTraining(){
    if(training||trainingLoading||mode!=='playing'||!['tower','lookout'].includes(towerState?.room)||actor.form==='ghost')return false;
    stopAutoplay();trainingLoading=true;setMode('loading');$('loading-screen').hidden=false;loading('Entering Taleth\u2019s Stillroom');
    try{
      const {createStillroomSession}=await import('./training/arrival.js');
      if(disposed)return false;
      // The tower checkpoint stays in place. The separate practice scene uses
      // this renderer, but cannot advance campaign time or spend real resources.
      const practiceStore=arrivalStore(window.azhoraExplorationStorage??window.localStorage,PRACTICE_KEY);
      sorcery.suspendPresentation(true);
      training=createStillroomSession({onExit:leaveTraining,sharedRenderer:renderer,returnVisit:true,store:practiceStore,saved:returnPracticeProgress(practiceStore.read()??arrivalStore(window.azhoraExplorationStorage??window.localStorage).read())});
      setMode('training');war.tick(0,false);touch.sync('training');return true;
    }catch(error){training?.dispose();training=null;sorcery.suspendPresentation(false);setMode('playing');notice('The Stillroom could not open: '+error.message);return false;}
    finally{trainingLoading=false;$('loading-screen').hidden=true;}
  }
  function leaveTraining(){
    if(!training)return;
    const session=training;training=null;session.dispose();sorcery.suspendPresentation(false);keys.clear();drag=false;
    world.show('tower');towerState.enter('tower');place(STILLROOM_ARRIVAL,Math.PI/2);yaw=-Math.PI/2;pitch=.27;distance=7;setTowerEnvironment();
    setMode('playing');updateLocation();updateCamera(true);war.tick(0,false);
    notice('Back in Taleth\u2019s tower. Time is still held; you can train again whenever you wish.');
  }
  async function changeRoom(next){
    if(mode!=='playing'||next===towerState.room)return false;
    if(!towerState.briefed){notice('Speak with Taleth before leaving.');return false;}
    if(next==='lookout'&&!war.state().campaign.winner){notice('Taleth will invite you to the lookout once the war is settled.');return false;}
    if(mounts.kind!=='foot'||!movement.state().grounded){notice('Land and dismount before entering.');return false;}
    const before=snapshot(),opening=towerState.snapshot(war.state().clock.running),previous=towerState.room;
    const exit=councilRoom(previous)?.exit??TOWER_EXIT,spawn=next==='lookout'?LOOKOUT_SPAWN:next==='tower'?TOWER_SPAWN:next?councilSpawn(next):exit;
    if(!campaignAutoplay?.state().active)stopAutoplay();setMode('loading');$('loading-screen').hidden=false;loading(next==='lookout'?'Ascending to the guild lookout':next?'Entering '+(councilRoom(next)?.room??'Taleth\u2019s chamber'):'Returning to Minora');
    try{
      if(!next)await world.prepareExterior(exit);
      if(next==='lookout')await world.prepareLookout();
      world.show(next);if(next)towerState.enter(next);else towerState.leave();
      place(spawn,next?Math.PI:0);yaw=next?0:Math.PI-.55;pitch=.27;distance=8;setTowerEnvironment();
      dirty=true;updateLocation();updateCamera(true);war.sync();war.refresh();setMode('playing');return true;
    }catch(error){world.show(opening.location==='world'?null:opening.location);towerState=createTowerState({tower:opening});place(before.position,before.heading);({yaw,pitch,distance}=before.camera);setTowerEnvironment();updateLocation();updateCamera(true);setMode('playing');notice('The doorway could not open: '+error.message);return false;}
    finally{$('loading-screen').hidden=true;}
  }
  async function chapterTransition(next,point){
    if(!chapterMode||mode==='loading')return false;
    const oldRoom=towerState.room,before=snapshot();
    if(next){stable?.park();mounts.reset();}
    setMode('loading');$('loading-screen').hidden=false;loading(next==='lookout'?'Opening the Sky Lookout':next?'Returning to Taleth': 'Opening the road');
    try{
      if(next==='lookout')await world.prepareLookout();
      else if(!next)await world.prepareExterior(point);
      world.show(next);if(next)towerState.enter(next);else towerState.leave();
      place(next==='lookout'?LOOKOUT_SPAWN:next?TOWER_SPAWN:point,Math.PI);yaw=0;pitch=.27;distance=8;
      setTowerEnvironment();updateLocation();updateCamera(true);setMode('playing');dirty=true;return true;
    }catch(error){world.show(oldRoom);if(oldRoom)towerState.enter(oldRoom);else towerState.leave();place(before.position,before.heading);({yaw,pitch,distance}=before.camera);setTowerEnvironment();updateLocation();updateCamera(true);setMode('playing');notice('The journey could not open: '+error.message);return false;}
    finally{$('loading-screen').hidden=true;}
  }
  function updateLocation(){if(world.state?.().inLimbo){$('location-name').textContent='The room between departures';return;}const region=world.regionAt(position.x,position.z).name,home=chapterThree?'Mountain refuge':'Minora';$('location-name').textContent=towerState?.room==='lookout'?home+' / Guild lookout':towerState?.inside?home+' / '+(sanctuaryContains(position.x,position.z,position.y)?'Bolbur\u2019s folded sanctuary':councilRoom(towerState.room)?.room??towerFloorAt(position.y).name):Math.hypot(position.x-START.x,position.z-START.z)<250?'Minora':region;}
  function snapshot(){return {version:1,character:'teresod',position:{x:position.x,y:position.y,z:position.z},heading:actor.group.rotation.y,
    camera:{yaw,pitch,distance},elapsed,cells:[...cells]};}
  function save(){
    if(cavalryOpening||recoverCavalry||skirmish?.isYunethre||skirmish?.isOremindi||minoraFall?.active()){notice('Return from the encounter before saving.');return {ok:false};}
    if(harbor?.state().busy){notice('Finish the river passage before saving.');return {ok:false};}
    if(training||trainingLoading){notice('Return to the tower before saving. Training does not change your campaign.');return {ok:false};}
    if(foodDemo?.state().active){notice('Return from the food demonstration before saving. Your campaign save is unchanged.');return {ok:false};}
    if(combatMode)return store.save();
    if(mode==='loading'||mode==='crossing'||mode==='encounter'||mode==='skirmish'||mounts.airborne()||!movement.state().grounded){notice('Wait until you are on the ground before saving.');return {ok:false};}
    if(movement.state().onObstacle){notice('Move off the obstacle onto clear ground before saving.');return {ok:false};}
    const data=chapter?chapter.save(snapshot(),towerState.snapshot(false),stable.snapshot(),sorcery?.snapshot()):hearthfall?hearthfall.save(snapshot()):war?{...captureWarCheckpoint(),afterlife:afterlife.snapshot()}:snapshot();
    const result=store.save(data);if(result.ok)dirty=false;
    const message=result.ok?(store.rehearsal?'Rehearsal kept in memory only. Your campaign save is untouched.':chapterThree?'Chapter 3 saved.':chapter?'Chapter 2 saved.':hearthfall?'Hearthfall saved.':war?'War scenario saved.':'Exploration saved.'):result.reason;$('save-note').textContent=message;notice(message);return result;
  }
  function captureWarCheckpoint(){return {...war.save(snapshot()),tower:towerState.snapshot(war.runningPreference()),riding:stable.snapshot(),council:council.snapshot(),sorcery:sorcery.snapshot()};}
  async function enterLimbo(){
    stopAutoplay();war.pause();war.track(null);setMode('crossing');document.body.classList.add('crossing-limbo');
    await new Promise(resolve=>setTimeout(resolve,450));stable.park();mounts.reset();world.showLimbo();actor.setForm('living');
    place(LIMBO_SPAWN,Math.PI);yaw=0;pitch=.2;distance=8;setTowerEnvironment();updateLocation();setMode('limbo');updateCamera(true);
    await new Promise(resolve=>setTimeout(resolve,500));document.body.classList.remove('crossing-limbo');
  }
  async function restoreWarAttempt(checkpoint,side,form,approach=null){
    setMode('loading');const s=checkpoint.exploration,restored=createTowerState(checkpoint);
    if(!restored.inside)await world.prepareExterior(s.position);world.show(restored.room);towerState=restored;actor.setForm(form);
    cells.clear();for(const cell of s.cells)cells.add(cell);harbor?.resetTimeline();elapsed=s.elapsed;
    place(s.position,s.heading);({yaw,pitch,distance}=s.camera);stable.restore(checkpoint.riding);council.restore(checkpoint.council);sorcery.restore(checkpoint.sorcery);war.restore(checkpoint);war.track(null);tower.restore();guildWizards?.restore();workshop?.restore();
    setTowerEnvironment();updateLocation();updateChart();updateCamera(true);setMode('playing');war.tick(0,false);
    if(side)await war.help(side,approach);
  }
  async function returnFromLimbo(destination,fallen,form){
    setMode('loading');actor.setForm(form);
    if(destination==='tower'){towerState.enter();world.show(true);place(TOWER_SPAWN,Math.PI);}
    else{await world.prepareExterior(fallen);towerState.leave();world.show(false);place(fallen,Math.PI);}
    yaw=0;pitch=.27;distance=8;setTowerEnvironment();updateLocation();updateChart();updateCamera(true);setMode('playing');war.sync();war.run();
  }
  function clearPosition(point){
    if(!world.canExploreAt(point.x,point.z))throw new Error('The saved position is outside this sandbox. Your save has been kept.');
    const b=world.bounds;
    if(point.x<b.minX||point.x>b.maxX||point.z<b.minZ||point.z>b.maxZ)throw new Error('The saved position is outside the world. Begin a new exploration from the start screen.');
    const candidates=[point];for(let r=1;r<=8;r++)for(let i=0;i<12;i++)candidates.push({x:point.x+Math.cos(i*Math.PI/6)*r,z:point.z+Math.sin(i*Math.PI/6)*r});
    const feet=p=>['tower','mayor'].includes(towerState?.room)&&!world.state().inLimbo?world.supportAt(p.x,p.z,{maxY:point.y??councilRoom(towerState.room)?.y??TOWER.y,stepUp:.45,groundSlope:false})?.height:undefined;
    const at=candidates.find(p=>world.canExploreAt(p.x,p.z)&&(canStand(p.x,p.z,world,.34,feet(p))||canSwim(p.x,p.z,world,.34,feet(p))));
    if(!at)throw new Error('There is no clear footing near this saved position. Your save has been kept.');
    return at;
  }
  function place(point,heading=Math.PI){
    guildDisguise.restore();
    // Council room migration belongs to the tower campaign. Explore and combat
    // use exterior-only worlds, which have no tower/limbo state API.
    if(towerState&&!world.state().inLimbo)point=councilSavedPosition(towerState.room,point);
    const at=actor.form==='ghost'&&world.canExploreAt(point.x,point.z)?point:clearPosition(point);
    const towerFloor=['tower','mayor'].includes(towerState?.room)&&!world.state().inLimbo?world.supportAt(at.x,at.z,{maxY:point.y??councilRoom(towerState.room)?.y??TOWER.y,stepUp:.45,groundSlope:false})?.height:null;
    const floor=Math.max(towerFloor??world.heightAt(at.x,at.z),world.waterAt(at.x,at.z)-.65);
    stable?.park();mounts.reset();refreshTravelHelp();position.set(at.x,towerFloor??(at===point&&Number.isFinite(point.y)?Math.max(point.y,floor):floor),at.z);
    actor.group.rotation.y=heading;actor.group.position.copy(position);movement.reset(heading);world.loading.update(position);world.update(elapsed,0,position);discover();
  }
  async function loadSaved(){
    if(cavalryOpening||recoverCavalry||skirmish?.isYunethre)return;
    if(harbor?.state().busy){notice('Finish the river passage before loading.');return;}
    if(training||trainingLoading)return;
    if(foodDemo?.state().active)return;
    if(mode==='encounter'||mode==='skirmish'||mode==='loading')return;
    stopAutoplay();
    const result=store.read();if(!result.ok||!result.data){notice(result.reason||'No exploration has been saved yet.');return;}
    if(war&&(!!result.data.fullCampaign!==adventureClock||!!result.data.sharedOpening!==openingClock)){notice('This save uses a different campaign clock. Return to the main menu and choose Continue war scenario to load it.');return;}
    if(war&&result.data.simulation.scenario!==campaignScenario.id){notice('This save uses different campaign rules. Return to the main menu and choose Continue to load its countryside and supplies together.');return;}
    if(war&&!result.data.campaignSide&&war.state().campaignSide&&!isUnbriefedTowerCheckpoint(result.data)){
      const candidate={...result.data,campaignSide:war.state().campaignSide};
      const {validateWorldWarSave}=await import('./war-checkpoint.js');
      if(!validateWorldWarSave(candidate,result.data.format)){notice('This older save has a different unfinished allegiance. Return to the main menu and choose Continue to preserve its battle and retry.');return;}
      result.data=candidate;
    }
    let data=war||hearthfall||chapter?result.data.exploration:result.data;setMode('loading');$('loading-screen').hidden=false;loading('Returning to your saved place');
    try{
      if(chapter){const restored=createTowerState(result.data);if(!restored.inside)await world.prepareExterior(data.position);if(restored.room==='lookout')await world.prepareLookout();world.show(restored.room);towerState=restored;chapter.restore(result.data);minoraFall?.reset();if(chapterThree||chapter.state().returned)minoraFall.occupied();setTowerEnvironment();}
      else if(towerState){const restored=createTowerState(result.data);data=boundedWarSave(data,restored);afterlife.restore(result.data.afterlife);actor.setForm(afterlife.inLimbo?'living':afterlife.form);if(!restored.inside&&!afterlife.inLimbo)await world.prepareExterior(data.position);if(restored.room==='lookout'&&!afterlife.inLimbo)await world.prepareLookout();towerState=restored;if(afterlife.inLimbo)world.showLimbo();else world.show(restored.room);setTowerEnvironment();}
      await world.prepare(data.position.x,data.position.z,data.position.y);cells.clear();for(const key of data.cells)cells.add(key);harbor?.resetTimeline();elapsed=data.elapsed;
      ({yaw,pitch,distance}=data.camera);place(data.position,data.heading);if(towerState)setTowerEnvironment();stable?.restore(chapter?yunethreRiding(result.data):result.data.riding);council?.restore(result.data.council);sorcery?.restore(result.data.sorcery);if(war){war.restore(result.data);tower.restore();guildWizards?.restore();workshop?.restore();if(towerState.snapshot().running&&!afterlife.inLimbo)war.run();}if(hearthfall)hearthfall.restore(result.data);dirty=false;updateLocation();updateCamera(true);setMode(afterlife?.inLimbo?'limbo':'playing');notice(war?'Saved war scenario restored.':'Saved exploration restored.');
    }catch(error){setMode('pause');notice(error.message);}finally{$('loading-screen').hidden=true;}
  }
  async function prepareCrossing(point){
    setMode('loading');$('loading-screen').hidden=false;const region=world.regionAt(point.x,point.z),started=performance.now();loading('Preparing '+region.name);
    const before=new Map(world.loading.state().jobs.map(j=>[j.id,j.buildMs]));
    const progress=setInterval(()=>{
      const state=world.loading.state(),jobs=state.jobs.filter(j=>j.regions.includes(region.id));
      $('loading-message').textContent=`Preparing ${region.name} / ${jobs.filter(j=>j.status==='ready').length} of ${jobs.length} parts ready / ${Math.round((performance.now()-started)/1000)}s`;
    },500);
    try{await world.prepare(point.x,point.z,point.y??position.y);setMode('playing');}
    catch(error){setMode('pause');notice('This region could not load: '+error.message);}
    finally{clearInterval(progress);$('loading-screen').hidden=true;lastCrossing={region:region.name,ms:Math.round(performance.now()-started),jobs:world.loading.state().jobs.map(j=>({id:j.id,buildMs:Math.round(j.buildMs-(before.get(j.id)??0))})).filter(j=>j.buildMs>0).sort((a,b)=>b.buildMs-a.buildMs)};console.log('EXPLORATION_CROSSING '+JSON.stringify(lastCrossing));}
  }
  let cameraYaw=yaw;const followOffset=new THREE.Vector3(),cameraObstruction=createCameraObstruction(world);
  const conversationCamera=createConversationCamera(camera,cameraObstruction);
  function updateCamera(snap=false,dt=1/60){
    const shot=minoraFall?.camera();if(shot){camera.position.copy(shot.position);camera.lookAt(shot.target.x,shot.target.y,shot.target.z);camera.fov=shot.fov;camera.updateProjectionMatrix();return;}
    const blend=1-Math.exp(-10*dt);
    const panoramic=towerState?.room==='lookout'&&mode==='briefing'&&!!lookoutView;
    const guildSpeaker=mode==='briefing'?guildWizards?.speaker():null;
    const harborSpeaker=mode==='briefing'?harbor?.speaker():null;
    const residentSpeaker=mode==='briefing'?residentHost?.speaker():null;
    const stableSpeaker=mode==='briefing'?(guildSpeaker??harborSpeaker??stable?.speaker()):null;
    const closeConversation=mode==='briefing'&&(stableSpeaker||residentSpeaker||courierView);
    const exhibit=mode==='briefing'?workshop?.view():null;
    const mirrorView=exhibit?.id==='borrow-face';
    actor.group.visible=!panoramic&&(!exhibit||mirrorView);
    if(!closeConversation||panoramic||exhibit)conversationCamera.reset();
    const fov=panoramic?lookoutCamera(lookoutView).fov:55;
    if(camera.fov!==fov){camera.fov=fov;camera.updateProjectionMatrix();}
    if(panoramic){
      if(windowActive)lookoutTime+=dt;
      const {eye,target}=lookoutCamera(lookoutView,lookoutTime);
      camera.position.set(eye.x,eye.y,eye.z);camera.lookAt(target.x,target.y,target.z);shadow.visible=false;return;
    }
    if(exhibit){
      if(mirrorView){
        // Stay beside the visitor: both their body and its true reflection remain
        // visible while trying an appearance. The observation card sits at right.
        actor.group.rotation.y=Math.atan2(exhibit.x-position.x,exhibit.z-position.z);
        const narrow=innerWidth<=650;
        camera.position.set(exhibit.x+2.1,exhibit.y+3.1,exhibit.z-8.1);
        camera.lookAt(exhibit.x-(narrow?0:1.7),exhibit.y+(narrow?1:2.65),exhibit.z-.7);return;
      }
      // Authored, unobstructed workbench views. Keep the object beside its
      // observation card and frame the whole golem, including moving hands.
      const narrow=innerWidth<=650,reach=exhibit.viewDistance??(exhibit.id==='golem'?5.6:4.3);
      desired.set(exhibit.x,exhibit.y+(exhibit.eyeY??(exhibit.id==='golem'?3.2:3.7)),exhibit.z+exhibit.front*reach);
      focus.set(exhibit.x+(narrow?0:exhibit.front*(exhibit.id==='golem'?1.35:1.0)),exhibit.y+exhibit.aimY-(narrow?1.1:0),exhibit.z);
      camera.position.copy(desired);camera.lookAt(focus);shadow.visible=false;return;
    }
    if(closeConversation){
      const p=closeConversation,dialog=$(guildSpeaker?'guild-wizard-dialog':harborSpeaker?'harbor-dialog':stableSpeaker?'stable-lesson':residentSpeaker?'resident-dialog':'taleth-letter-dialog');
      actor.group.rotation.y=Math.atan2(p.x-position.x,p.z-position.z);
      conversationCamera.update({hero:actor.group.position,speaker:p,width:innerWidth,height:innerHeight,
        speakerHeight:residentSpeaker?.id==='canerd-sacred-oak'?4.8:guildSpeaker||harborSpeaker||residentSpeaker?1.95:stableSpeaker?1.4:.5,
        ...(residentSpeaker?.id==='canerd-sacred-oak'?{backWeight:.28,sideWeight:1}:{}),
        dialogRect:dialog?.querySelector('.tower-dialog-card')?.getBoundingClientRect(),
        ignoreCollider:guildSpeaker?c=>c.kind==='guild-wizard'&&c.id===guildWizards.state().id:undefined});
      return;
    }
    if(mode==='chronicle'){
      desired.set(TOWER.x+7,TOWER.y+7,TOWER.z+1);
      if(snap)camera.position.copy(desired);else camera.position.lerp(desired,blend);
      camera.lookAt(TOWER.x+1,TOWER.y+2,TOWER.z-6.5);return;
    }
    const target=mode==='skirmish'?skirmish?.cameraTarget():null;
    if(target&&!drag){const targetYaw=Math.atan2(position.x-target.x,position.z-target.z),turn=Math.atan2(Math.sin(targetYaw-yaw),Math.cos(targetYaw-yaw));yaw+=Math.max(-2*dt,Math.min(2*dt,turn*(1-Math.exp(-6*dt))));}
    const aimWeight=target&&!drag?Math.min(.18,2/Math.max(.01,Math.hypot(target.x-position.x,target.z-position.z))):0;
    const aim=new THREE.Vector3(target?(target.x-position.x)*aimWeight:0,0,target?(target.z-position.z)*aimWeight:0);
    if(snap)combatAim.copy(aim);else combatAim.lerp(aim,blend);
    cameraYaw=snap?yaw:cameraYaw+Math.atan2(Math.sin(yaw-cameraYaw),Math.cos(yaw-cameraYaw))*blend;
    focus.copy(actor.group.position).add(cameraOffset);
    desired.set(focus.x+Math.sin(cameraYaw)*Math.cos(pitch)*distance,focus.y+Math.sin(pitch)*distance,focus.z+Math.cos(cameraYaw)*Math.cos(pitch)*distance);
    // Keep the same wall-safe probe positions, with one local collision query.
    const clip=cameraObstruction(focus,desired);if(clip<1)desired.lerpVectors(focus,desired,clip);
    desired.y=Math.max(desired.y,world.heightAt(desired.x,desired.z)+.6);
    if(snap||desired.distanceTo(focus)<followOffset.length())followOffset.copy(desired).sub(focus);else followOffset.lerp(desired.clone().sub(focus),blend);
    camera.position.copy(focus).add(followOffset);camera.position.y=Math.max(camera.position.y,world.heightAt(camera.position.x,camera.position.z)+.6);camera.lookAt(focus.clone().add(combatAim));
    world.caricasStandards?.updateCamera?.(camera,position);
  }
  function step(dt,skyDt=dt){
    soundtrack?.tick(skyDt);
    minoraFall?.update(skyDt,windowActive&&mode!=='loading',position,!!towerState?.inside);
    if(training){training.tick(dt,windowActive);training?.render(renderer);return;}
    touch.sync(mode);
    if(autoplayActive()||campaignAutoplay?.state().canResume){const button=autoplayButton,parent=document.querySelector('dialog[open]')??document.body;if(button.parentElement!==parent)parent.append(button);}
    if(mode==='combat-menu')return;
    autoplay?.tick(dt,windowActive);journey?.tick(dt,windowActive);campaignAutoplay?.tick(dt,windowActive);chapterAutoplay?.tick(dt,windowActive);
    foodDemo?.tick(dt,windowActive);
    if(mode==='loading')return; // The loading veil keeps the last frame; give terrain construction the frame budget.
    if(mode==='skirmish'&&skirmish?.reviewing()){keys.clear();skirmish.settleResult?.(dt,windowActive);updateAtmosphere(0);renderer.render(scene,camera);return;}
    if(mode==='skirmish'){if(windowActive)elapsed+=dt;skirmish?.tick(dt,windowActive);if(!practice?.state().active&&!skirmish?.snapshot().rehearsal){discover();dirty=true;}}
    if(mode==='playing'||mode==='limbo'){
      if(windowActive)elapsed+=dt;const previousPosition={x:position.x,y:position.y,z:position.z},previousMount=mounts.kind,moved=actor.form==='ghost'&&!world.state?.().inLimbo?ghostStep(position,world,...touch.steer(keys,yaw),dt,actor.group.rotation.y):mounts.step(...touch.steer(keys,yaw),dt);
      const edge=(!towerState?.inside&&war?.constrainTravel(previousPosition))||war?.constrainCourierTravel(previousPosition);
      if(edge){position.x=edge.x;position.z=edge.z;position.y=Math.max(position.y,world.heightAt(edge.x,edge.z));}
      const horseEdge=stable?.constrainTravel(previousPosition)??harbor?.constrain(previousPosition);
      if(horseEdge){position.x=horseEdge.x;position.z=horseEdge.z;if(moved.grounded&&!moved.swimming)position.y=world.supportAt?.(position.x,position.z,{maxY:previousPosition.y,stepUp:.45,groundSlope:false})?.height??world.heightAt(position.x,position.z);}
      if(edge||horseEdge)moved.speed=Math.hypot(position.x-previousPosition.x,position.z-previousPosition.z)/Math.max(.001,Math.min(.04,dt));
      mounts.draw(elapsed,moved);
      if(moved.blockedBoundary&&!boundaryBlocked&&!towerState?.inside)notice(world.state?.().inLimbo?'Speak with the Reaper to leave this room.':warMode?'The war scenario ends at this border. Explore the World opens the wider continent.':chapterThree?'Chapter 3 opens South Oremindi and North Ibenwood, alongside your earlier regions.':chapterMode?'Chapter 2 ends at this border. The centaur speaker offers passage to Canerd.':'The Hearthfall workspace ends at Feradom. Return to the main menu for the full world.');
      boundaryBlocked=!!moved.blockedBoundary;hearthfall?.tick(dt,elapsed);
      if(previousMount!==mounts.kind||waterBlocked!==!!moved.blockedWater||horseSwimming!==(mounts.kind==='horse'&&!!moved.swimming)){waterBlocked=!!moved.blockedWater;horseSwimming=mounts.kind==='horse'&&!!moved.swimming;refreshTravelHelp();}
      if(moved.speed>.001){dirty=true;discover();if(warMode){for(const details of $('world-war-report').querySelectorAll('details[open]'))details.open=false;}}
      if(moved.waiting)prepareCrossing(moved.waiting);
      streamClock+=dt;if(streamClock>.4){world.loading.update(position,actor.group.rotation.y,moved.speed);streamClock=0;
        updateLocation();}
    }
    if(!practice?.state().active)war?.tick(openingClock?skyDt:dt,!clockHoldReason());
    chapter?.tick(skyDt,!clockHoldReason(),elapsed);
    openingTime?.update();
    if(towerState&&sanctuaryEnvironmentActive!==(towerState.room==='tower'&&sanctuaryView(position)))setTowerEnvironment();
    guildDisguise.update(towerState?.room,position,windowActive?dt:0);tower?.tick(dt,windowActive);tower?.update();guildWizards?.update();workshop?.update();council?.update();residentHost?.update();civicHost?.update();harbor?.update(windowActive?skyDt:0);pigeons?.update();birding?.update();stable?.update(mode==='playing'&&windowActive?dt:0,elapsed,windowActive?dt:0);minimap?.update(dt,elapsed);afterlife?.update();
    sorcery?.update(windowActive?dt:0);
    if(mode==='encounter')return;
    if(['playing','skirmish','limbo','reaper','sailing'].includes(mode))world.update(elapsed,windowActive?dt:0,position);
    if(['briefing','chronicle'].includes(mode))world.update(elapsed,windowActive?dt:0,position);
    shadow.position.set(position.x,world.heightAt(position.x,position.z)+.025,position.z);shadow.visible=!['sailing','sailing-paused'].includes(mode)&&actor.form!=='ghost'&&!mounts.airborne()&&!movement.state().swimming;
    updateCamera(false,dt);tower?.drawQuest(camera);chapter?.drawQuest(camera);war?.drawGuidance(camera);updateAtmosphere(skyDt);world.renderWindows?.(renderer,camera,elapsed);renderer.render(scene,camera);
  }
  function frame(now){if(disposed)return;frameLog?.tick(now-last);const frameSeconds=Math.max(0,(now-last)/1000),dt=Math.min(.04,frameSeconds);last=now;frames++;
    try{step(dt,Math.min(.25,frameSeconds));}catch(error){stopAutoplay();frameErrors.push(String(error.stack||error));console.error(error);if(training)leaveTraining();if(recoverCavalry){setMode('briefing');recoverCavalry().finally(()=>setMode('pause'));}else{if(practice?.state().active)practice.finish();else if(mode==='skirmish')war?.withdraw();if(!combatMode)setMode('pause');}notice('Exploration paused after a rendering error.');}
    frameId=requestAnimationFrame(frame);
  }
  function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}
  listen(window,'resize',resize);listen(window,'blur',()=>{keys.clear();drag=false;windowActive=false;refreshAutoplayFocus();});listen(window,'focus',()=>{windowActive=true;refreshAutoplayFocus();});
  // Capture takeover before a native result dialog consumes keyboard input.
  // Continue by keyboard must relinquish the driver just like a manual click.
  listen(document,'keydown',event=>{
    if(minoraFall?.keydown(event))return;
    if(training||trainingLoading)return;
    const active=autoplayActive(),canResume=chapterTwo||campaignAutoplay?.state().canResume;if(!active&&!canResume)return;
    if(event.target?.closest?.('[data-autoplay-control]')&&['Enter','Space'].includes(event.code)){
      event.preventDefault();event.stopImmediatePropagation();if(!event.repeat)autoplayButton.click();return;
    }
    if(event.code==='KeyP'&&!event.target?.closest?.('input,select,textarea,[contenteditable="true"]')){
      event.preventDefault();event.stopImmediatePropagation();
      if(!event.repeat){if(active)stopAutoplay();else if(chapterAutoplay)chapterAutoplay.start();else campaignAutoplay?.resume();}return;
    }
    if(active&&event.isTrusted&&['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','KeyF','KeyG','KeyH','KeyV','KeyX','KeyT','Space','Enter','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Escape','KeyM','F5','F8'].includes(event.code))stopAutoplay();
  },{capture:true});
  listen(document,'keydown',event=>{
    if(training){training.keydown(event);return;}
    if(mode==='crossing'){event.preventDefault();return;}
    if(chapter?.keydown(event)||harbor?.keydown(event)||openingTime?.keydown(event)||war?.keydown(event)||afterlife?.keydown(event)||tower?.keydown(event)||guildWizards?.keydown(event)||workshop?.keydown(event)||council?.keydown(event)||stable?.keydown(event)||residentHost?.keydown(event)||civicHost?.keydown(event)||pigeons?.keydown(event)||birding?.keydown(event))return;
    if(mode==='limbo'){
      if(event.code==='KeyF'||event.code==='Escape'){event.preventDefault();if(!event.repeat)afterlife.talk();return;}
      if(event.code==='F5'){event.preventDefault();if(!event.repeat)save();return;}
      if(['Space','Tab','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code))event.preventDefault();
      if(event.code==='Space'&&!event.repeat)movement.jump();keys.add(event.code);return;
    }
    if(combatMode&&mode==='combat-menu')return;
    if(event.code==='KeyP'&&autoplay&&!event.target?.closest?.('input,select,textarea,[contenteditable="true"]')){
      event.preventDefault();if(!event.repeat){if(autoplay.state().active||journey?.state().active||campaignAutoplay?.state().active)stopAutoplay();else openDeveloper();}return;
    }
    if(['KeyT','KeyE','KeyQ','KeyH','KeyV','KeyW','KeyA','KeyS','KeyD','KeyX','Space','Enter','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Escape','KeyM','KeyF','KeyG','F5','F8'].includes(event.code))stopAutoplay();
    if(mode==='encounter')return;
    if(event.code==='KeyQ'&&['playing','skirmish'].includes(mode)){event.preventDefault();if(!event.repeat)sorcery?.cast();return;}
    if(mode==='skirmish'){if(skirmish?.keydown(event))return;if(event.code==='Tab'||['Enter','Space'].includes(event.code)&&event.target?.closest?.('button'))return;event.preventDefault();if(!event.repeat&&practice?.state().active&&event.code==='KeyR')practice.retry();else if(!event.repeat&&(event.code==='Escape'||event.code==='Enter'&&skirmish?.snapshot().outcome)){if(practice?.state().active){if(event.code==='Enter')practice.advance();else practice.finish();}else if(event.code==='Enter')war.continue();else war.withdraw();}else keys.add(event.code);return;}
    if(event.code==='F8'){event.preventDefault();if(!event.repeat){if(mode==='developer')setMode('playing');else openDeveloper();}return;}
    if(event.code==='F5'){event.preventDefault();if(!event.repeat)save();return;}
    if(event.code==='Escape'){event.preventDefault();if(!event.repeat){if(mode==='playing')pause();else if(mode!=='loading')setMode('playing');}return;}
    if(event.code==='KeyM'&&(mode==='playing'||mode==='map')){event.preventDefault();if(!event.repeat){if(mode==='map')setMode('playing');else if(mode==='playing')openMap();}return;}
    if(mode!=='playing')return;
    if(event.code==='KeyF'&&(war||chapter||birding)){event.preventDefault();if(!event.repeat&&!tower?.interact()&&!guildWizards?.interact()&&!workshop?.interact()&&!pigeons?.interact()&&!birding?.interact()&&!council?.interact()&&!harbor?.interact()&&!stable?.interact()&&!residentHost?.interact()&&!war?.interactSoldier()&&!civicHost?.interact())war?.join();return;}
    if(['Tab','Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code))event.preventDefault();
    if(afterlife?.form==='ghost'&&['KeyG','KeyH','KeyF','Space'].includes(event.code)){event.preventDefault();return;}
    if(event.code==='KeyG'&&!event.repeat){if(!stable?.toggleMount())selectMount('foot');refreshTravelHelp();return;}
    if(event.code==='KeyH'&&!event.repeat){stable?.whistle();return;}
    if(event.code==='Space'&&!event.repeat&&!mounts.airborne())mounts.jump();keys.add(event.code);
  });
  listen(document,'keyup',event=>keys.delete(event.code));listen(canvas,'contextmenu',event=>event.preventDefault());
  listen(document,'pointerdown',event=>{if(event.isTrusted&&event.target.closest('button,input,select')&&!event.target.closest('[data-autoplay-control]'))stopAutoplay();});
  listen(document,'click',event=>{if(event.isTrusted&&event.target.closest('button,input,select')&&!event.target.closest('[data-autoplay-control]'))stopAutoplay();});
  // The right mouse button, or on a touch screen a finger on the view, turns the camera; two fingers pinch it (8 October 2026).
  listen(canvas,'pointerdown',event=>{if(training){training.pointerdown(event);return;}if(event.isTrusted&&mode==='skirmish'&&event.button===0)stopAutoplay();canvas.focus();if(touch.look.start(event)&&['playing','skirmish','limbo','sailing','sailing-paused'].includes(mode)){skirmish?.manualCamera();drag=true;canvas.setPointerCapture(event.pointerId);}});
  listen(canvas,'click',event=>{if(event.button===0&&mode==='skirmish')skirmish?.attack();});
  listen(canvas,'pointerup',event=>{if(training)training.pointerup(event);else drag=touch.look.end(event);});listen(canvas,'pointercancel',event=>{if(training)training.pointerup(event);else drag=touch.look.end(event);});
  listen(canvas,'pointermove',event=>{if(training){training.pointermove(event);return;}const turn=drag&&['playing','skirmish','limbo','sailing','sailing-paused'].includes(mode)&&touch.look.move(event);if(turn){skirmish?.manualCamera();yaw-=turn.dx*.006;pitch=Math.max(.05,Math.min(1.15,pitch+turn.dy*.004));distance=Math.max(3,Math.min(22,distance*turn.zoom));}});
  listen(canvas,'wheel',event=>{if(training){training.wheel(event);return;}if(['playing','skirmish','limbo','sailing','sailing-paused'].includes(mode))distance=Math.max(3,Math.min(22,distance+event.deltaY*.008));});
  function startWorldFight(options){
    if(actor.form==='ghost'||world.state?.().inLimbo)throw Error('This form cannot fight.');
    if(mounts.kind!=='foot'||!movement.state().grounded||movement.state().swimming)throw Error('Land and dismount before fighting.');
    if(journey?.state().active||practice?.state().active){yaw=options.site?.approachHeading??0;pitch=.4;distance=options.trial?9:15;updateCamera(true);}
    if(options.pending.kind==='roadside'){options={...options,centre:options.pending.location,site:{name:'Roadside / '+options.pending.armyName,regionId:null,approachHeading:options.pending.location.yaw??0}};}
    const controller=openWorldSkirmish({...options,scene,world,actor,position,keys,watch:()=>!!journey?.state().active||!!autoplay?.state().active||!!campaignAutoplay?.state().active,yaw:()=>cameraYaw,centre:options.centre??LIZEEM_BATTLEFIELDS[options.pending.region],site:options.site??LIZEEM_FIELD_SITES[options.pending.region]});
    skirmish=controller;if(!options.practice){pitch=Math.max(.36,pitch);distance=Math.max(10,distance);yaw=options.site?.approachHeading??LIZEEM_FIELD_SITES[options.pending.region]?.approachHeading??0;movement.reset(actor.group.rotation.y);updateCamera(true);}setMode('skirmish');canvas.focus();
    return {snapshot:controller.snapshot,dispose(){controller.dispose();skirmish=null;movement.reset(actor.group.rotation.y);updateLocation();}};
  }
  $('world-war-hud').onclick=openMap;
  $('open-map').onclick=openMap;$('close-map').onclick=()=>setMode('playing');$('open-pause').onclick=pause;
  $('resume-exploration').onclick=()=>setMode('playing');$('save-exploration').onclick=save;$('load-exploration').onclick=loadSaved;
  function mainMenu(){const url=new URL(location.href);url.searchParams.delete('autoplay');url.searchParams.delete('preview');url.searchParams.delete('mode');url.searchParams.delete('war');url.searchParams.set('menu','1');location.href=url.href;}
  $('return-start').textContent='Exit to main menu without saving';$('return-start').onclick=mainMenu;
  $('save-return-start').onclick=()=>{if(save().ok)mainMenu();};
  $('reveal-all').onchange=()=>setReveal($('reveal-all').checked);$('developer-reveal').onchange=()=>setReveal($('developer-reveal').checked);
  $('open-developer').onclick=openDeveloper;$('close-developer').onclick=()=>setMode('playing');$('developer-map').onclick=openMap;
  if(!combatMode){
  const atlas=await fetch('./assets/azhora-world-map.json').then(response=>{if(!response.ok)throw new Error('Region list could not load.');return response.json();});
  const available=new Map(explorationDestinations.map(r=>[r.name,r]));
  for(const region of [...atlas.regions].filter(r=>{const destination=available.get(r.name);return (!hearthfallMode||r.name==='Feradom')&&(!(warMode||chapterMode)||destination&&allowsRegion(launch,destination.id));}).sort((a,b)=>a.name.localeCompare(b.name))){
    const destination=available.get(region.name),option=new Option(region.name+(destination?'':' (atlas only)'),destination?String(destination.id):'atlas:'+region.name);
    option.disabled=!destination;$('developer-region').add(option);
  }
  }
  $('developer-go').onclick=()=>travelToRegion($('developer-region').value);
  for(const button of document.querySelectorAll('[data-exploration-mount]'))button.onclick=()=>selectMount(button.dataset.explorationMount);
  listen(window,'pagehide',()=>{disposed=true;stopAutoplay();cancelAnimationFrame(frameId);clearTimeout(statusTimer);abort.abort();skirmish?.dispose();training?.dispose();openingTime?.dispose();weatherControls?.dispose();weather?.dispose();dayNight?.dispose();minoraFall?.dispose();chapter?.dispose();hearthfall?.dispose();war?.dispose();tower?.dispose();guildWizards?.dispose();workshop?.dispose();council?.dispose();residentHost?.dispose();civicHost?.dispose();harbor?.dispose();pigeons?.dispose();birding?.dispose();stable?.dispose();minimap?.dispose();afterlife?.dispose();sorcery?.dispose();guildDisguise.dispose();actor.dispose?.();world.stop();world.dispose?.();renderer.dispose();});
  place(saved?.position??(towerState?.inside?(fromStillroom?STILLROOM_ARRIVAL:TOWER_SPAWN):hearthfallMode?findRegionArrival({...explorationDestinations.find(r=>r.id===21),spawn:startPoint},world):startPoint)??startPoint,saved?.heading??Math.PI);if(saved)dirty=false;
  if(fromStillroom&&!saved){place(STILLROOM_ARRIVAL,Math.PI/2);yaw=-Math.PI/2;pitch=.27;distance=7;}
  resize();updateLocation();updateCamera(true);if(map&&!await map.ready)throw new Error('The world map could not initialize.');
  setReveal(launch.reveal);
  if(!combatMode)birding=createBirdingHost({world,position,mode:()=>mode,setMode,storage:window.azhoraExplorationStorage??window.localStorage,
    treeAvailable:()=>!['yunethre-interact','tower-interact','guild-wizard-interact','tower-workshop-interact','pigeon-interact','council-interact','harbor-interact','stable-interact','resident-interact','soldier-interact','minora-civic-interact'].some(id=>{const prompt=$(id);return prompt&&!prompt.hidden;})});
  document.querySelector('#exploration-hud .eyebrow').textContent='TERESOD / '+launch.name.toUpperCase();
  if(hearthfallMode){
    const {createHearthfallSession}=await import('../../experiments/hearthfall/session.js');
    hearthfall=createHearthfallSession({saved:hearthfallSaved,scene,world,player:position,onDirty:()=>{dirty=true;}});
    $('world-site-status').hidden=false;$('world-site-status').textContent='Feradom sandbox / Settlement port pending';
    $('save-exploration').textContent='Save Hearthfall (F5)';$('load-exploration').textContent='Load saved Hearthfall';
    document.querySelector('#exploration-pause p').textContent='This local workspace loads Feradom only. Living settlements from PR #1 are not installed yet. Its save is separate from exploration and the war.';
    $('developer-heading').textContent='Explore Feradom';
    document.querySelector('.atlas-help').textContent='Feradom only is loaded in this workspace. The wider atlas is a reference; it does not enable travel out of Feradom.';
  }
  if(chapterMode){
    const {createMinoraFallPresentation}=await import('../../content/chapters/oremindi/minora-fall-host.js');
    minoraFall=createMinoraFallPresentation({scene,world,setMode});
    if(chapterThree||chapterSaved.chapter.returned)minoraFall.occupied();
  }
  if(chapterTwo){
    const {createYunethreHost}=await import('../../content/chapters/yunethre/host.js');
    const {CENTAUR_BATTLEFIELD}=await import('../../content/regions/minora-frontier/centaur-camp-layout.js');
    startCavalry=async({side='centaurs',rehearsal=false,watch=false,mounted=true}={})=>{
      if(cavalryOpening||skirmish||!['playing','developer','briefing'].includes(mode))return false;
      const facts=chapter.state();if(!rehearsal&&(facts.battle.status!=='active'||facts.battle.joined&&facts.battle.joined!==side))return false;
      cavalryOpening=true;stopAutoplay();const before=snapshot(),beforeRoom=towerState.room,wasDirty=dirty,riding=stable.snapshot(),wasMounted=stable.mounted,previousMount=mounts.kind;setMode('briefing');
      let view=null,closed=false,started=false;
      async function finish(){if(closed)return;closed=true;cavalryOpening=true;view?.dispose();skirmish=null;mounts.reset();movement.reset(actor.group.rotation.y);
        if(rehearsal||!started){setMode('briefing');const restored=await chapterTransition(beforeRoom,before.position);if(!restored){world.show(beforeRoom);if(beforeRoom)towerState.enter(beforeRoom);else towerState.leave();setTowerEnvironment();}place(before.position,before.heading);({yaw,pitch,distance}=before.camera);elapsed=before.elapsed;cells.clear();for(const key of before.cells)cells.add(key);dirty=wasDirty;}
        stable.restore(riding);setMode('playing');if(rehearsal||!started){if(wasMounted)stable.toggleMount();else if(previousMount!=='foot')selectMount(previousMount);({yaw,pitch,distance}=before.camera);dirty=wasDirty;}updateLocation();updateChart();refreshTravelHelp();updateCamera(true);recoverCavalry=null;cavalryOpening=false;
        if(!rehearsal&&started)notice('The field report is recorded in your quest journal. Return to Laketown for its decision.');}
      try{
        recoverCavalry=async()=>{if(started)view?.withdraw();await finish();};
        const {openYunethreCavalry}=await import('../../content/chapters/yunethre/cavalry-view.js');
        stable.park();mounts.reset();
        if(!await chapterTransition(null,CENTAUR_BATTLEFIELD.approach)){await finish();return false;}
        setMode('loading');
        view=openYunethreCavalry({scene,world,actor,position,keys,yaw:()=>cameraYaw,centre:CENTAUR_BATTLEFIELD,side,mounted,rehearsal,watch,
          onStart(){if(!rehearsal&&!chapter.state().battle.joined&&!chapter.command({type:'join',side}).ok)return false;started=true;return true;},
          onEnd(outcome){if(!rehearsal&&started)chapter.command({type:'battle-result',result:outcome.result});},
          onContinue:finish,onWithdraw:finish});
        skirmish=view;pitch=.42;distance=14;yaw=side==='centaurs'?Math.PI:0;setMode('skirmish');updateCamera(true);canvas.focus();return true;
      }catch(error){await finish();notice('The cavalry encounter could not open: '+error.message);return false;}
      finally{cavalryOpening=false;}
    };
    chapter=createYunethreHost({saved:chapterSaved,scene,world,position,towerState:()=>towerState,mode:()=>mode,setMode,transition:chapterTransition,notice,onDirty:()=>{dirty=true;},map,save,mainMenu,onJournalOpen:stopAutoplay,onBattle:options=>startCavalry(options),
      onWitness:async()=>{stopAutoplay();stable.park();mounts.reset();setMode('loading');$('loading-screen').hidden=false;loading('The return to Minora');try{await world.prepareExterior(CHAPTER_LOCATIONS.departure);$('loading-screen').hidden=true;return await minoraFall.start();}catch(error){setMode('playing');notice('The assault could not open: '+error.message);return false;}finally{$('loading-screen').hidden=true;}},
      onContinueChapter(){if(!save().ok)return;const url=new URL(location.href);for(const key of ['test','autoplay','preview','war'])url.searchParams.delete(key);url.searchParams.set('mode','oremindi');url.searchParams.set('continuation','oremindi');location.href=url.href;}});
    stable=createStableHost({scene,world,actor,position,mounts,movement,saved:yunethreRiding(chapterSaved),campaign:()=>chapter.residentCampaign(),inside:()=>towerState.inside,mode:()=>mode,setMode,notice,onChange(){dirty=true;refreshTravelHelp();}});
    minimap=createLocalMap({world,position,heading:()=>horizontalHeading(actor.group.quaternion),inside:()=>towerState.inside,mode:()=>mode,openMap,marker:()=>chapter.navigation(),chart:()=>({cells,reveal:$('reveal-all').checked}),showWarLegend:false});
    const plan=createYunethreTravel({world,room:()=>towerState.room,prepare:p=>{$('loading-screen').hidden=false;loading('Preparing the Chapter 2 route');return world.prepare(p.x,p.z,p.y??position.y);},
      setPlanning(active){if(active)setMode('loading');else{$('loading-screen').hidden=true;if(mode==='loading')setMode('playing');}}});
    chapterAutoplay=createYunethreAutoplay({chapter,position:()=>position,room:()=>towerState.room,region:()=>world.regionAt(position.x,position.z).id,mode:()=>mode,plan,
      clearInput:()=>keys.clear(),interact:()=>chapter.interact(),status:autoplayStatus,canStart:()=>{if(mounts.kind!=='foot'){notice('Press G to dismount before starting quest autoplay.');return false;}return true;},
      steer(target){yaw=Math.atan2(position.x-target.x,position.z-target.z);pitch=.25;distance=stable.mounted?11:8;keys.clear();keys.add('KeyW');keys.add('ShiftLeft');},
      showMap(){openMap({view:'geopolitical',regions:launch.mapRegions});},resumeWorld:()=>setMode('playing')});
    autoplayButton.onclick=()=>chapterAutoplay.toggle();autoplayStatus('Chapter 2 / Follow the main quests (P)',false);
    setTowerEnvironment();
    $('save-exploration').textContent='Save Chapter 2 (F5)';$('load-exploration').textContent='Load Chapter 2';
    document.querySelector('#exploration-pause p').textContent='Yunethre uses its own save. Chapter 1 history and free exploration remain separate.';
    $('developer-heading').textContent='Chapter 2 / Yunethre';
    const wait=document.createElement('button');wait.id='yunethre-neutral-test';wait.textContent='Chapter 2 test / Resolve the neutral battle';wait.onclick=()=>chapter.developerWait();$('developer-go').after(wait);
    const field=document.createElement('button');field.id='yunethre-start-battle';field.textContent='Chapter 2 / Advance to the battle opening';field.onclick=()=>{if(chapter.developerBattle())setMode('playing');};wait.after(field);
    for(const [id,text,options]of [['cavalry-practice','Cavalry rehearsal / Defend the centaurs',{rehearsal:true}],['cavalry-autoplay','Computer rehearsal / Centaurs versus Celder',{rehearsal:true,watch:true}]]){const b=document.createElement('button');b.id=id;b.textContent=text;b.onclick=()=>startCavalry(options);field.after(b);}
    document.querySelector('.atlas-help').textContent='Chapter 2 / Diplomacy changes allegiance; an alliance does not grant ownership.';
  }
  if(chapterThree){
    const {createOremindiHost}=await import('../../content/chapters/oremindi/host.js');
    const {oremindiRiding}=await import('../../content/chapters/oremindi/checkpoint.js');
    startMountain=async({kind='ambush',rehearsal=false,watch=false}={})=>{
      if(cavalryOpening||skirmish||!['playing','developer','briefing'].includes(mode))return false;
      const name=kind==='ambush'?'ambush':'battle',centre=mountainPlaces[name],facts=chapter.state();
      if(!rehearsal&&(facts[name].status==='victory'||kind==='ambush'&&!facts.rangersMet||kind!=='ambush'&&(!facts.rangerAlliance||!facts.rendezvousVisited||facts.elapsed<facts.rendezvousAt)))return false;
      cavalryOpening=true;stopAutoplay();const before=snapshot(),beforeRoom=towerState.room,wasDirty=dirty,riding=stable.snapshot(),wasMounted=stable.mounted,spellBefore=sorcery.snapshot();let view=null,closed=false,attempt=null;
      async function finish(){if(closed)return;closed=true;cavalryOpening=true;view?.dispose();skirmish=null;mounts.reset();movement.reset(actor.group.rotation.y);
        sorcery.clear();if(rehearsal||!attempt){setMode('briefing');await chapterTransition(beforeRoom,before.position);place(before.position,before.heading);({yaw,pitch,distance}=before.camera);elapsed=before.elapsed;cells.clear();for(const key of before.cells)cells.add(key);sorcery.restore(spellBefore);dirty=wasDirty;}
        stable.restore(riding);setMode('playing');if((rehearsal||!attempt)&&wasMounted)stable.toggleMount();updateLocation();updateChart();refreshTravelHelp();updateCamera(true);recoverCavalry=null;cavalryOpening=false;
        if(attempt&&!rehearsal)notice('The encounter is recorded. Follow the main quest and read Shift+J for its consequences.');}
      try{
        recoverCavalry=async()=>{if(attempt)view?.withdraw();await finish();};stable.park();mounts.reset();sorcery.clear();if(rehearsal)sorcery.restore();
        if(!await chapterTransition(null,{x:centre.x,z:centre.z+(kind==='ambush'?4:-7)})){await finish();return false;}
        setMode('loading');const {openOremindiEncounter}=await import('../../content/chapters/oremindi/encounter-view.js');
        view=openOremindiEncounter({scene,world,actor,position,keys,yaw:()=>cameraYaw,kind,centre,watch,rehearsal,
          onStart(){if(rehearsal)return true;const r=chapter.command({type:'start-'+name});if(!r.ok)return false;attempt=r.attempt;return true;},
          onEnd(outcome){if(attempt&&!rehearsal)chapter.command({type:name+'-result',attempt,result:outcome.result,...(kind==='ambush'?{fallen:outcome.fallen,retreated:outcome.retreated}:{chiefDefeated:outcome.chiefDefeated})});},
          onContinue:finish,onWithdraw:finish,onRetry:async()=>{await finish();return startMountain({kind,rehearsal,watch});}});
        skirmish=view;pitch=.45;distance=12;yaw=Math.atan2(position.x-centre.x,position.z-centre.z);setMode('skirmish');updateCamera(true);canvas.focus();return true;
      }catch(error){await finish();notice('The mountain encounter could not open: '+error.message);return false;}finally{cavalryOpening=false;}
    };
    chapter=createOremindiHost({saved:chapterSaved,scene,world,position,towerState:()=>towerState,mode:()=>mode,setMode,transition:chapterTransition,notice,onDirty:()=>{dirty=true;},map,onBattle:options=>startMountain(options),onJournalOpen:stopAutoplay});
    stable=createStableHost({scene,world,actor,position,mounts,movement,saved:oremindiRiding(chapterSaved),campaign:()=>chapter.residentCampaign(),inside:()=>towerState.inside,mode:()=>mode,setMode,notice,onChange(){dirty=true;refreshTravelHelp();}});
    sorcery=createFireballHost({scene,world,actor,position,yaw:()=>cameraYaw,mode:()=>mode,inside:()=>towerState.inside,
      canCast:()=>actor.form!=='ghost'&&mounts.kind==='foot',combat:()=>skirmish,saved:chapterSaved.sorcery,notice,onDirty(){dirty=true;}});
    minimap=createLocalMap({world,position,heading:()=>horizontalHeading(actor.group.quaternion),inside:()=>towerState.inside,mode:()=>mode,openMap,marker:()=>chapter.navigation(),chart:()=>({cells,reveal:$('reveal-all').checked}),showWarLegend:false});
    $('save-exploration').textContent='Save Chapter 3 (F5)';$('load-exploration').textContent='Load Chapter 3';$('developer-heading').textContent='Chapter 3 / The Mountain Alliance';
    document.querySelector('#exploration-pause p').textContent='Chapter 3 has a separate save, retaining your Chapter 1 and Chapter 2 history.';
    document.querySelector('.atlas-help').textContent='Chapter 3 / The tower is a refuge inside occupied South Oremindi. Allies retain their own lands.';
    for(const [kind,label]of [['ambush','Three-raider ambush'],['highground','Rangers versus the mountain chief']])for(const watch of [false,true]){const b=document.createElement('button');b.id='oremindi-'+kind+(watch?'-autoplay':'-practice');b.textContent=(watch?'Computer rehearsal / ':'Combat rehearsal / ')+label;b.onclick=()=>startMountain({kind,watch,rehearsal:true});$('developer-go').after(b);}
    setTowerEnvironment();
  }
  if(warMode){
    for(const type of ['keydown','keyup'])listen($('world-war-report'),type,event=>{if(['Space','Enter','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code))event.stopPropagation();});
    const {connectWorldWar}=await import('./world-war-host.js');
    const foodSaveKey=foodWorld?(await import('../food-world/scenario.js')).FOOD_WORLD_KEY:undefined;
    const elapsedWar=openingClock?await import('../../experiments/day-night/opening-war.js'):null;
    const createSession=foodWorld?(saved=>warRules.createWorldWar(saved,campaignScenario)):adventureClock?elapsedWar.createAdventureWar:openingClock?elapsedWar.createOpeningWar:undefined;
    const openingBattleTime=openingClock?(await import('../../experiments/day-night/opening-battle-time.js')).openingBattleTime:null;
    const battleTime=pending=>openingBattleTime?.(pending,war.state().campaign.engagements.find(b=>b.id===pending.battleId),war.clock())??'';
    function safeOpeningPlace(){
      if(!openingClock||!towerState.briefed||towerState.inside||world.state().inLimbo||actor.form==='ghost'||mounts.kind!=='foot'||!movement.state().grounded||movement.state().swimming)return null;
      if(adventureClock&&war.nearActiveBattle())return null;
      if(Math.hypot(position.x+2433.5,position.z-65)<=20)return 'Bear\u2019s stable';
      if(Math.hypot(position.x+2092,position.z-135)<=20)return 'Caricas north road';
      if(adventureClock&&world.readyAt(position.x,position.z)&&canStand(position.x,position.z,world,.34,position.y))return 'Quiet ground in '+world.regionAt(position.x,position.z).name;
      return null;
    }
    war=connectWorldWar({scenario:campaignScenario,saveKey:foodSaveKey,saved:warSaved,campaignSide,map,regionName:()=>world.regionAt(position.x,position.z).name,position,scene,world,
      encounterTimeNotice:battleTime,createSession,openingWaitAllowed:()=>!!safeOpeningPlace(),clockActive:()=>!clockHoldReason(),clockHoldReason,
      courierRoom:()=>towerState.room,courierAvailable:()=>mode!=='limbo'&&mode!=='reaper',
      onCourierTalk(point){courierView=point?{...point}:null;if(point)actor.group.rotation.y=Math.atan2(point.x-position.x,point.z-position.z);updateCamera(true);},
      onCampaignChange:state=>world.setCouncil(state),cameraYaw:()=>yaw,canBegin:()=>towerState.briefed,isConcluded:()=>!!towerState.snapshot().concluded,horseOwned:()=>stable?.owned??false,horseState:()=>stable?.state(),isGhost:()=>actor.form==='ghost',
      onBeforeFight:()=>afterlife.beforeFight(),onDeath:context=>{stopAutoplay();afterlife.died(context).then(()=>save()).catch(e=>notice('Could not enter limbo: '+e.message));},
      localEncounter:{supports:pending=>pending.kind==='roadside'||!!pending.reinforcements&&!!LIZEEM_FIELD_SITES[pending.region],open:options=>startWorldFight({...options,timeNotice:battleTime(options.pending),campaignClock:()=>war.clock()})},
      autoEntry:()=>!journey?.state().active&&!autoplay?.state().active&&!campaignAutoplay?.state().active,
      canEnterBattle:()=>actor.form!=='ghost'&&!mounts.airborne()&&movement.state().grounded&&!movement.state().swimming,
      prepareBattle(pending){
        const battlefield=pending?.location??LIZEEM_BATTLEFIELDS[pending?.region];
        const canDismountAt=(x,z)=>!pending?.entryRadius||!battlefield||Math.hypot(x-battlefield.x,z-battlefield.z)<=pending.entryRadius-.3;
        if(mounts.kind==='horse'){
          if(stable?.mounted)stable.toggleMount({forBattle:true,canDismountAt});else mounts.land({canDismountAt});
          refreshTravelHelp();
        }
        if(mounts.kind!=='foot'||!movement.state().grounded||movement.state().swimming)throw Error('Reach clear, dry ground to dismount before joining.');
      },
      canFightOnFoot:()=>actor.form!=='ghost'&&mounts.kind==='foot'&&movement.state().grounded&&!movement.state().swimming,
      known:at=>{const h=hexAt(at.x,at.z);return $('reveal-all').checked||cells.has(`${h.q},${h.r}`);},
      knowledgeStamp:()=>`${cells.size}/${$('reveal-all').checked}`,openMap,getMode:()=>towerState.inside&&mode==='playing'?'tower':mode,setMode,onDirty:()=>{dirty=true;}});
    war.sync();war.refresh();
    if(towerState.snapshot().running)war.run();
    tower=createTowerHost({state:()=>towerState,position,mode:()=>mode,setMode,notice,openingClock,openingForecast:()=>war.waitForecast(),campaignClock:()=>war.clock(),campaignSide:()=>war.state().campaignSide,scenario:()=>war.state().campaign.scenario,campaign:()=>war.state().campaign,onChronicle:value=>world.setChronicle(value),
      campaignChoiceRequired:()=>!towerState.briefed&&!war.state().campaignSide,onChooseCampaignSide:side=>war.chooseCampaignSide(side),
      onContinueChapter(){if(!save().ok)return;const url=new URL(location.href);for(const key of ['test','autoplay','preview','war'])url.searchParams.delete(key);url.searchParams.set('mode','yunethre');url.searchParams.set('continuation','yunethre');location.href=url.href;},
      onTrain:enterTraining,onLookout:enter=>changeRoom(enter?'lookout':'tower'),onLookoutView:view=>{if(lookoutView!==view)lookoutTime=0;lookoutView=view;world.setLookoutView(view);updateCamera(true);},onConclude(){dirty=true;war.completeReview();updateChart();save();},
      onBegin(){dirty=true;war.begin();notice(openingClock?(campaignScenario.openingBattles?'Caricas is already under attack. Time starts when you leave the tower. Bear will greet you outside with your horse.':'Caricas opens at Adventure 03:00. Time starts when you leave the tower. Bear will greet you outside with your horse.'):'The tower holds time still. Bear will greet you outside with your horse.');},onDoor:changeTower});
    workshop=createTowerWorkshopHost({state:()=>towerState,position,mode:()=>mode,setMode,demonstrate:id=>guildDisguise.demonstrate(id)||world.demonstrateWorkshop(id),guides:()=>world.guildGuides(),travel:async id=>{const at=await world.guildTravel(id);if(!at)return false;place(at,Math.PI);yaw=0;pitch=.22;distance=7;setTowerEnvironment();updateLocation();updateCamera(true);dirty=true;return true;},available:()=>!guildWizards.state().near});
    council=createCouncilHost({saved:warSaved?.council,state:()=>towerState,position,mode:()=>mode,setMode,campaign:()=>war.state().campaign,getCivicReport:()=>minoraCivicPublicReport(war.state().campaign),onDoor:changeRoom,onDirty(){dirty=true;}});
    pigeons=createPigeonHost({world,position,mode:()=>mode,setMode});
    stable=createStableHost({scene,world,actor,position,mounts,movement,saved:warSaved?.riding,campaign:()=>war.state().campaign,campaignClock:()=>war.clock(),inside:()=>towerState.inside||world.state().inLimbo,mode:()=>actor.form==='ghost'?'ghost':mode,setMode,notice,onChange(){dirty=true;refreshTravelHelp();}});
    harbor=createHarborHost({scene,world,position,mode:()=>mode,setMode,stable,notice,
      advanceTime:seconds=>{war.advancePassage(seconds);elapsed+=seconds;},riverTime:()=>elapsed,canSail:()=>war.canSail(),
      aboard(p,first){
        if(first){stopAutoplay();stable.park();mounts.reset();yaw=p.heading+Math.PI;pitch=.34;distance=13;}
        // The bow rower works at +3.05m; stand in the open passenger space
        // between that bench and the horse instead of through the rower.
        position.set(p.x+Math.sin(p.heading)*1.4,p.y+.56,p.z+Math.cos(p.heading)*1.4);
        actor.group.position.copy(position);actor.group.rotation.set(0,p.heading,0);actor.group.visible=true;actor.animate(elapsed,0,true,{armed:false});
        if(first)updateCamera(true);
      },
      available:()=>!towerState.inside&&!world.state().inLimbo&&!mounts.airborne()&&actor.form!=='ghost',
      battles:()=>war.state().campaign.engagements,land:place,
      arrived(port,at){
        dirty=true;
        // The guide identifies this battlefield on the chart. Its centre can
        // occupy an unseen hex beyond the boundary the player cannot cross.
        const battle=at.battleId?war.state().campaign.engagements.find(b=>b.id===at.battleId):null;
        if(battle){const h=hexAt(battle.location.x,battle.location.z);cells.add(`${h.q},${h.r}`);}
        war.sync();war.refresh();if(at.battleId&&war.state().tracking?.target?.id!==at.battleId)war.track({kind:'battle',id:at.battleId});
        yaw=at.heading+Math.PI;pitch=.32;distance=8;updateLocation();updateChart();updateCamera(true);}});
    minimap=createLocalMap({world,position,heading:()=>horizontalHeading(actor.group.quaternion),inside:()=>towerState.inside,mode:()=>mode,openMap,events:()=>war.minimapEvents(),track:target=>war.track(target),
      marker:()=>sanctuaryReturnMarker(position.x,position.z,position.y)??tower.marker()??(towerState.room==='tower'&&towerFloorAt(position.y).id!=='taleth'?{...towerStairPoint(towerFloorAt(position.y).y/10.8+1),id:'guild-stair',label:'Spiral stair / Return to Taleth'}:null)??council.marker()??(towerState.inside?(towerState.briefed?{...TOWER_DOOR,id:'door',label:'Door to Minora'}:{...TALETH_SPOT,id:'taleth',label:'Taleth'}):war.minimapDestination()??(war.clock().complete&&!stable.owned?null:stable.marker())),
      chart:()=>({cells, reveal:$('reveal-all').checked})});
    afterlife=createAfterlifeHost({saved:warSaved?.afterlife,position,mode:()=>mode,setMode,capture:captureWarCheckpoint,enter:enterLimbo,restore:restoreWarAttempt,returnToWorld:returnFromLimbo,save,mainMenu,onChange(){dirty=true;refreshTravelHelp();},notice});
    sorcery=createFireballHost({scene,world,actor,position,yaw:()=>yaw,mode:()=>mode,inside:()=>towerState.inside||world.state().inLimbo,canCast:()=>actor.form!=='ghost'&&mounts.kind==='foot',combat:()=>skirmish,saved:warSaved?.sorcery,notice,onDirty(){dirty=true;}});
    setTowerEnvironment();
    if(openingClock){
      const {createOpeningTimeView}=await import('../../experiments/day-night/opening-view.js');
      openingTime=createOpeningTimeView({war,getMode:()=>mode,setMode,safePlace:safeOpeningPlace,onExit:mainMenu});
    }
    if(autoplaySide)campaignAutoplay=createLizeemCampaignAutoplay({side:autoplaySide,war,world,position,stable,mode:()=>mode,room:()=>towerState.room,
      towerProgress:()=>({...tower.lookoutState(),briefed:towerState.briefed}),
      clearInput:()=>keys.clear(),interact:()=>tower.interact(),click:id=>$(id)?.click(),status:autoplayStatus,
      readingText:stage=>{
        const ids=stage==='letter'?['corris-summary','taleth-campaign-now']:stage==='horse-lesson'?['stable-words']
          :stage==='brief'?['encounter-brief','encounter-duel-choice','encounter-phase-path']
          :stage==='result'?['world-skirmish-result']:['tower-words','tower-road'];
        return ids.map(id=>$(id)).filter(e=>e&&!e.hidden).map(e=>e.innerText).join(' ');
      },
      steer(target){yaw=Math.atan2(position.x-target.x,position.z-target.z);pitch=.25;distance=stable.mounted?11:8;keys.clear();keys.add('KeyW');keys.add('ShiftLeft');},
      async prepareTravel(){setMode('loading');$('loading-screen').hidden=false;loading('Preparing the five-region rehearsal');try{for(const id of launch.regions){if(!campaignAutoplay?.state().active)break;await world.prepareRegion(id);}}finally{$('loading-screen').hidden=true;setMode('playing');}},
    });
    autoplay=createLizeemWorldAutoplay({war,mode:()=>mode,
      resume:()=>setMode('playing'),clearInput:()=>keys.clear(),attack:()=>keys.clear(), // Encounter view drives ordinary dodge/counter inputs while watching.
      showMap(){openMap();map.setView('geopolitical');map.focus('Caricas');},
      async prepare(){
        if(!await travelToRegion(13))return false;
        yaw=0;pitch=.27;distance=10;updateCamera(true);return true;
      },
      status:(message,active)=>autoplayStatus('Caricas: '+message,active),
    });
    journey=createOvesosJourneyAutoplay({war,mode:()=>mode,position:()=>position,
      resume:()=>setMode('playing'),clearInput:()=>keys.clear(),attack:()=>keys.clear(),dismount:()=>selectMount('foot'),
      ride(target){yaw=Math.atan2(position.x-target.x,position.z-target.z);keys.clear();keys.add('KeyW');keys.add('ShiftLeft');},
      showMap(stage){
        openMap({view:'geopolitical',regions:['Isareos','Nethereum','Ovesos','Caricas','Nesdor']});
        $('world-demo-caption').hidden=false;
        $('world-demo-caption').textContent=stage==='opening'?'The East-West War: East is marching on West-held Ovesos. Teresod starts in neutral Minora and will ride to help West.':stage==='battle'?"Battle at Ovesos: East is attacking West. Join before day 8. Teresod will intercept East's approaching reinforcements.":stage==='interception'?'Your interception is recorded. Watch the regional battle resolve on day 8; stopping reinforcements does not guarantee victory.':'Regional outcome: compare the new border with the opening map. The war report explains your contribution and who now controls Ovesos.';
      },status:autoplayStatus,
      async prepare(stillActive){
        setMode('loading');$('loading-screen').hidden=false;loading('Preparing Minora to Ovesos horse journey');
        try{
          await world.prepare(START.x,START.z);if(!stillActive()){setMode('playing');return false;}
          cells.clear();harbor?.resetTimeline();elapsed=0;place(START);war.restore(null);setReveal(true);dirty=true;
          yaw=0;pitch=.27;distance=11;setMode('playing');updateLocation();updateCamera(true);
          world.prefetchRegion(25);return selectMount('horse').ok;
        }finally{$('loading-screen').hidden=true;if(mode==='loading')setMode('playing');}
      },
    });
  }
  if(!combatMode){
    // Local conversations also belong to unrestricted Explore.
    const campaign=()=>chapter?chapter.residentCampaign():war?.state().campaign??null;
    const available=()=>!towerState?.inside&&!world.state?.().inLimbo&&!mounts.airborne();
    residentHost=createResidentHost({world,position,campaign,chapter:()=>chapter?.state(),civicContext:()=>minoraResidentCivicContext(campaign()),mode:()=>mode,setMode,available,treeLifeList:()=>birding?.state().treeSpecies??[]});
  }
  if(warMode||chapterMode){
    const campaign=()=>chapter?chapter.residentCampaign():war.state().campaign;
    const available=()=>!towerState.inside&&!world.state().inLimbo&&!mounts.airborne();
    guildWizards=createTowerWizardHost({state:()=>towerState,position,mode:()=>mode,setMode,notice});
    civicHost=createMinoraCivicHost({world,position,campaign,mode:()=>mode,setMode,available,
      occupied:()=>['oremindi-interact','yunethre-interact','tower-interact','stable-interact','resident-interact','council-interact'].some(id=>$(id)&&!$(id).hidden)});
  }
  if(combatMode)sorcery=createFireballHost({scene,world,actor,position,yaw:()=>cameraYaw,mode:()=>mode,inside:()=>false,canCast:()=>mounts.kind==='foot',combat:()=>skirmish,notice,onDirty(){}});
  if(warMode||combatMode){
    practice=createOvesosPractice({
      militiaWeapon:selectedMilitiaWeapon,startingRound:()=>combatMode?selectedTrialRound():0,
      attributes:()=>combatMode?selectedTrialAttributes():{},
      capture(){stopAutoplay();return {hero:snapshot(),dirty,sorcery:sorcery?.snapshot()};},
      async prepare(exercise){
        setMode('loading');$('loading-screen').hidden=false;loading(exercise==='trials'?'Opening the Stillroom':'Preparing Minora practice field practice');
        const begun=performance.now(),before=new Map(world.loading.state().jobs.map(j=>[j.id,j.buildMs]));
        try{
          if(combatMode)await world.selectExercise(exercise);
          await world.prepareRegion(16);
          const jobs=world.loading.state().jobs.map(j=>({id:j.id,buildMs:Math.round(j.buildMs-(before.get(j.id)??0)),longestSliceMs:Math.round(j.longestSliceMs)})).filter(j=>j.buildMs>0).sort((a,b)=>b.buildMs-a.buildMs);
          return {wallMs:Math.round(performance.now()-begun),jobs};
        }finally{$('loading-screen').hidden=true;}
      },
      open({retry,finish,compare,advance,attempt,exercise,trial,round,results,heroAttributes}){
        sorcery?.clear();sorcery?.restore();place(MENORA_CAMP,trial?0:Math.PI);setMode('playing');
        const view=startWorldFight({practice:exercise,tempo:trial?'classic':combatMode?selectedCombatTempo():'classic',trial,round,trialResults:results,heroAttributes,pending:{region:'minora-practice'},centre:MENORA_CAMP,site:{name:trial?'The Stillroom':'Minora practice field',regionId:16,approachHeading:trial?Math.PI:0},enemyColor:'#b77162',reinforcements:{name:'Training',strength:0},onEnd(){},onContinue:advance,onWithdraw:finish,onCompare:compare});
        $('world-skirmish-retry').hidden=false;$('world-skirmish-retry').onclick=retry;
        if(combatMode){$('world-skirmish-continue').textContent='Choose exercise (Enter)';$('world-skirmish-withdraw').textContent='Choose exercise (Esc)';}
        document.querySelector('#world-skirmish .eyebrow').textContent=`MINORA PRACTICE FIELD / ${exercise==='lesson'?'DODGE LESSON':exercise==='advanced'?'THRUST AND SWEEP LESSON':exercise==='allied'?'ALLIED ASSAULT':exercise==='solo-assault'?'SOLO ASSAULT':'INTERCEPTION PRACTICE'} / ATTEMPT ${attempt}`;
        if(trial){document.querySelector('#world-skirmish .eyebrow').textContent=`STILLROOM / ROUND ${round+1} OF ${COMBAT_TRIALS.length} / ${trial.name.toUpperCase()} / ATTEMPT ${attempt}`;$('combat-trial-start').focus();}
        return view;
      },
      restore(saved){
        sorcery?.clear();sorcery?.restore(saved.sorcery);
        const s=saved.hero;harbor?.resetTimeline();elapsed=s.elapsed;place(s.position,s.heading);yaw=s.camera.yaw;pitch=s.camera.pitch;distance=s.camera.distance;
        cells.clear();for(const cell of s.cells)cells.add(cell);dirty=saved.dirty;setMode(combatMode?'combat-menu':'playing');updateLocation();updateChart();updateCamera(true);
        if(combatMode)onCombatMenu();else notice('Practice ended. Returned on foot; campaign and saved game unchanged.');
      },onError:error=>notice('Practice could not start: '+error.message),
    });
    $('practice-minora').onclick=()=>practice.start();
    $('practice-minora-advanced').onclick=()=>practice.start('advanced');
    $('practice-minora-allied').onclick=()=>practice.start('allied');
    $('practice-minora-solo-assault').onclick=()=>practice.start('solo-assault');
    $('practice-minora-squad').onclick=()=>practice.start('squad');
  }
  if(warMode){
    $('developer-autoplay').hidden=openingClock||foodWorld;
    const {createDayNightHost}=await import('../../experiments/day-night/host.js');
    dayNight=createDayNightHost({scene,camera,sun,hemisphere,world,position,onExplore:()=>setMode('playing'),linkedClock:openingClock?()=>war.clock():null,beforeChange:()=>weather?.restore(),afterChange:()=>weather?.update(0),
      context:()=>({mode,exterior:!world.state().inLimbo&&(!towerState.inside||towerState.room==='lookout'),active:!clockHoldReason()})});
    $('developer-residents').onchange=()=>world.setResidents($('developer-residents').checked);
    $('autoplay-ovesos').onclick=()=>{stopAutoplay();journey.start();};
    $('autoplay-caricas').onclick=()=>{stopAutoplay();autoplay.start();};
    autoplayButton.onclick=()=>{if(autoplayActive())stopAutoplay();else if(campaignAutoplay?.state().canResume)campaignAutoplay.resume();};
    document.querySelector('#exploration-hud .eyebrow').textContent=foodWorld?'TERESOD / LIZEEMI WAR / FOOD WORLD TEST':'TERESOD / LIZEEMI WAR';
    $('save-exploration').textContent='Save war scenario (F5)';$('load-exploration').textContent='Load saved war scenario';
    document.querySelector('.atlas-help').textContent='Five regions are playable in this scenario. Speak with Taleth before beginning; M shows the current armies and battles.'+(campaignScenario.food?' Open Food and housing to inspect regional supplies.':'');
    document.querySelector('#exploration-pause p').textContent='Your hero position, discoveries and the campaign are saved together in the separate war scenario slot.';
    if(foodWorld){
      const {createFoodWorldDemo}=await import('../food-world/demo.js');
      const {FARMLAND_REGIONS}=await import('../farmland-review/regions.js');
      foodDemo=createFoodWorldDemo({war,notice,
        canStart:()=>towerState.inside?'Leave the building before starting this exercise.':!['playing','developer','map','pause'].includes(mode)||mounts.airborne()||actor.form==='ghost'?'Start this exercise while safely on the ground, outside combat.':null,
        capture:()=>({checkpoint:captureWarCheckpoint(),dirty,running:war.state().clock.running,reveal:$('reveal-all').checked,mount:mounts.kind,riding:stable.mounted}),
        prepare(){stopAutoplay();setMode('playing');keys.clear();setReveal(true);},
        showFields(id){const [x,z,heading]=FARMLAND_REGIONS[id].spawns.fields;setMode('playing');place({x,z},heading);yaw=heading+Math.PI;pitch=.55;distance=28;updateLocation();updateCamera(true);war.sync();},
        showMap(id){openMap({view:'stability'});$('world-demo-caption').textContent='Nesdor shortage and recovery / temporary exercise / armies held';war.openFoodReport(id);},
        async restore(saved){await restoreWarAttempt(saved.checkpoint,null,actor.form);war.restore(saved.checkpoint);if(saved.riding)stable.toggleMount();else if(saved.mount!=='foot')selectMount(saved.mount);setReveal(saved.reveal);dirty=saved.dirty;if(saved.running)war.run();dirty=saved.dirty;},
      });
      listen(window,'pagehide',()=>foodDemo.dispose());
      $('save-exploration').textContent='Save food world test (F5)';$('load-exploration').textContent='Load saved food world test';
      document.querySelector('#exploration-pause p').textContent='Your hero, war and food supplies are saved together in the separate food world test slot.';
      document.querySelector('.atlas-help').textContent='Reviewed farms and towns / M for borders and battles. Open Food and housing to inspect the same campaign economy.';
    }
  }
  if(!combatMode){
    weather=createWeatherHost({scene,camera,sun,hemisphere,world,position,context:()=>({
      time:openingClock?war.clock().elapsedSeconds:elapsed,night:dayNight?.state().night??0,dayNight:!!dayNight?.state().visible,
      exterior:!training&&!world.state?.()?.inLimbo&&(!towerState?.inside||towerState.room==='lookout'),
      active:windowActive&&['playing','skirmish','sailing','briefing','chronicle'].includes(mode)&&!skirmish?.paused()&&!skirmish?.reviewing(),
    })});weatherControls=createWeatherControls(weather);updateAtmosphere(0);
  }
  soundtrack?.bind(()=>{chapterMusic=chapterMode?yunethreMusicArea({regionId:world.regionAt(position.x,position.z).id,position,inside:!!towerState?.inside,town:CHAPTER_LOCATIONS.town,centaurs:CHAPTER_LOCATIONS.centaurs},chapterMusic):null;return {weather:weather?.audio(),musicArea:chapterMusic,mode:training?.state().paused||skirmish?.paused()?'pause':mode,active:windowActive,inside:!!towerState?.inside,room:towerState?.room,
    training:!!training||(combatMode&&world.state().arena==='stillroom'),reviewing:!!skirmish?.reviewing(),trial:training?.state().trial??skirmish?.musicState(),combatActive:mode==='encounter'&&!!war?.fighting(),hour:dayNight?.state().hour??10,regionId:world.regionAt(position.x,position.z).id};});
  $('loading-screen').hidden=true;$('exploration-hud').hidden=false;$('exploration-help').hidden=false;
  const readyMs=Math.round(performance.now()-begun);console.log('EXPLORATION_READY '+readyMs+'ms');
  setMode(afterlife?.inLimbo?'limbo':'playing');frameId=requestAnimationFrame(frame);
  if(relocatedSave)notice(towerState?.inside?'The sanctuary entrance has moved. You are back at Bolbur’s doorway; your campaign progress is kept.':'This scenario now covers five regions. You have returned to Minora; your campaign progress is kept.');
  if(new URLSearchParams(location.search).has('test'))window.__EXPLORATION__={
    state:()=>({launch:launch.id,reviewedCountryside,foodEconomy:!!campaignScenario?.food,quality:quality.id,touch:touch.state(),character:'teresod',panoramic:!!lookoutView,heroVisible:actor.group.visible,cameraPosition:camera.position.toArray(),cameraFov:camera.fov,enabledRegions:world.enabledRegions,lastCrossing,combatCues:scene.children.filter(o=>o.userData.combatWarningEdge||o.userData.counterOpening||o.userData.combatHealth||o.userData.hitRecovery).map(o=>({kind:o.userData.combatWarningEdge?'edge':o.userData.counterOpening?'opening':o.userData.combatHealth?'label':'protection',visible:o.visible,cue:o.userData.cue??null,remaining:o.userData.remaining??null,detailed:o.userData.combatHealth&&o.scale.y>.2})),combatImpacts:scene.children.filter(o=>o.userData.combatImpact).map(o=>({kind:o.userData.kind,visible:o.visible})),combatMarkers:scene.children.filter(o=>o.userData.combatTarget||o.userData.combatFacing).map(o=>({target:o.userData.combatTarget===true,targetId:o.userData.targetId??null,visible:o.visible,position:o.position.toArray()})),rallyLabels:scene.children.filter(o=>o.userData.rallyLabel).map(o=>({visible:o.visible,scale:o.scale.toArray(),sizeAttenuation:o.material.sizeAttenuation})),fieldActors:scene.children.filter(o=>o.userData.worldSkirmish).map(o=>({position:o.position.toArray(),ground:world.heightAt(o.position.x,o.position.z),clear:canStand(o.position.x,o.position.z,world,.34),visible:o.visible})),mode,form:actor.form??'living',position:position.toArray(),camera:{yaw,pitch,distance},cells:[...cells],readyMs,frames,frameErrors:[...frameErrors],map:map?.state()??null,dirty,grounded:!mounts.airborne()&&movement.state().grounded,mount:mounts.state(),region:world.regionAt(position.x,position.z).id}),
    war,hearthfall,chapter,chapterTransition,chapterAutoplay,minoraFall,oremindiCombat:{open:options=>startMountain?.(options),controller:()=>skirmish?.isOremindi?skirmish:null},cavalry:{open:options=>startCavalry?.(options),controller:()=>skirmish?.isYunethre?skirmish:null},autoplay,journey,campaignAutoplay,foodDemo,practice,stable,harbor,minimap,afterlife,council,sorcery,residentHost,civicHost,dayNight,openingTime,weather,soundtrack,
    tower:warMode?{state:()=>({...towerState.snapshot(war.state().clock.running),...world.state()}),interact:()=>tower.interact(),chronicleState:()=>tower.chronicleState(),lookoutState:()=>tower.lookoutState(),birds:()=>world.lookoutBirds(),pigeonInteract:()=>pigeons.interact(),pigeonState:()=>pigeons.state()}:null,
    groundProbe(x,z){return {x,z,height:world.heightAt(x,z),water:world.waterAt(x,z),region:world.regionAt(x,z).id,ready:world.readyAt(x,z),clear:canStand(x,z,world,.62),colliders:world.nearColliders(x,z,1).map(c=>({...c}))};},
    testWorld:world,testHero:actor,birding,guildDisguise,guildWizards,workshop,get training(){return training;},encounterInput:keyboardYaw=>skirmish?.autoplayInput(keyboardYaw),
    project(point){const p=new THREE.Vector3(point.x,point.y,point.z).project(camera);return {x:p.x,y:p.y,z:p.z};},
    renderStats({withoutLookoutLandscape=false}={}){const backdrop=scene.getObjectByName('Guild lookout / prepared surrounding landscape'),visible=backdrop?.visible;if(withoutLookoutLandscape&&backdrop)backdrop.visible=false;
      const begun=performance.now();try{if(training)training.render(renderer);else {world.renderWindows?.(renderer,camera,elapsed);renderer.render(scene,camera);}return {...renderer.info.render,cpuMs:performance.now()-begun,geometries:renderer.info.memory.geometries};}finally{if(backdrop)backdrop.visible=visible;}},
    look(view){skirmish?.manualCamera();yaw=view.yaw??yaw;pitch=view.pitch??pitch;distance=view.distance??distance;updateCamera(true);},
    snapshot,save,store,loadSaved,openMap,openDeveloper,travelToRegion,selectMount,pause,resume:()=>training?training.resume():setMode('playing'),step,
    hold:(code,on)=>on?keys.add(code):keys.delete(code),jump:()=>mounts.jump(),
    async visit(point){setMode('loading');await world.prepare(point.x,point.z,point.y??position.y);place(point);setMode('playing');updateCamera(true);},
    reveal:setReveal,
  };
  if(store.rehearsal){document.querySelector('#exploration-hud .eyebrow').textContent=openingClock?'LIZEEMI WAR / ADVENTURE CLOCK OPENING':lookoutPreview?'LIZEEMI WAR / UNATTENDED LOOKOUT PREVIEW':'LIZEEMI WAR / AUTOPLAY REHEARSAL';$('save-exploration').textContent='Keep rehearsal in memory (F5)';$('load-exploration').textContent='Restore rehearsal checkpoint';$('save-return-start').hidden=true;$('return-start').textContent='Exit rehearsal to main menu';campaignAutoplay?.start();}
  if(lookoutPreview)tower.interact();
  if(combatMode)await practice.start(combatExercise??'lesson');
  return {practice,chapter,save};
}
