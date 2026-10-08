import * as THREE from 'three';
import {createCharacter,groundShadow} from '../../content/characters/characters.js';
import {ROLLO_LOOK} from '../../content/characters/rollo-look.js';
import {hexAt,TRANSFORM,regionAt} from '../../world/terrain/region-world.js';
import {canStand,canSwim} from '../../gameplay/movement/locomotion.js';
import {loadExplorationWorld} from './world-adapter.js';
import {explorationMovement} from './movement.js';
import {createCameraObstruction} from './camera-obstruction.js';
import {START} from './checkpoint.js';
import {createTowerState,TOWER_SPAWN,TOWER_EXIT} from './tower-state.js';
import {createAfterlifeHost} from './afterlife-host.js';
import {createWarHero,ghostStep} from './afterlife-form.js';
import {LIMBO_SPAWN} from '../../content/regions/minora-frontier/limbo-chamber.js';
import {createFireballHost} from './fireball-host.js';
import {createResidentHost} from './resident-host.js';
import {createCouncilHost} from './council-host.js';
import {councilRoom,councilSpawn} from '../../content/regions/minora-frontier/minora-council.js';
import {createTowerHost} from './tower-host.js';
import {createStableHost} from './stable-host.js';
import {createLocalMap} from './local-map.js';
import {TOWER,TALETH_SPOT,TOWER_DOOR} from './tower-state.js';
import {MODES,allowsRegion} from './modes.js';
import {explorationDestinations,findRegionArrival} from './developer-travel.js';
import {openWorldSkirmish} from './world-skirmish.js';
import {LIZEEM_BATTLEFIELDS} from '../../content/scenarios/lizeem-battlefields.js';
import {LIZEEM_FIELD_SITES} from '../../content/scenarios/lizeem-field-sites.js';
import {createExplorationMounts} from '../../dev/tools/exploration-mounts.js';
import {createOvesosJourneyAutoplay} from '../../gameplay/autoplay/ovesos-journey-autoplay.js';
import {createLizeemWorldAutoplay} from '../../gameplay/autoplay/lizeem-world-autoplay.js';
import {createOvesosPractice} from '../../dev/tools/ovesos-practice.js';
import {MENORA_CAMP} from '../../content/regions/minora-frontier/menora-city.js';
import {createExplorationTouch} from './exploration-touch.js';

export async function startExploration({saved,warSaved=null,warMode=false,hearthfallSaved=null,launch=warMode?MODES.war:MODES.explore,store,begun,combatExercise=null,onCombatMenu=()=>{}}){
  const hearthfallMode=launch.id==='hearthfall',combatMode=launch.id==='combat',startPoint=combatMode?MENORA_CAMP:launch.start??START;
  const $=id=>document.getElementById(id),canvas=$('exploration-canvas');
  const abort=new AbortController();
  const listen=(target,type,handler)=>target.addEventListener(type,handler,{signal:abort.signal});
  const scene=new THREE.Scene();scene.background=new THREE.Color(0xb6c8b0);scene.fog=new THREE.Fog(0xb6c8b0,180,560);
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  const camera=new THREE.PerspectiveCamera(55,innerWidth/innerHeight,.12,1800);
  scene.add(new THREE.HemisphereLight(0xf0f2d8,0x53644b,1.65));
  const sun=new THREE.DirectionalLight(0xffe6ba,2.1);sun.position.set(-100,180,70);scene.add(sun);
  const loading=message=>{$('loading-message').textContent=message;console.log('EXPLORATION_LOADING '+message);};
  let towerState=warMode?createTowerState(warSaved):null,tower=null,council=null;
  function boundedWarSave(data,opening){
    return warMode&&data&&!opening.inside&&!allowsRegion(launch,regionAt(data.position.x,data.position.z).id)
      ?{...data,position:{...TOWER_EXIT,y:21.3},heading:0}:data;
  }
  const originalSaved=saved;saved=boundedWarSave(saved,towerState);
  const relocatedSave=saved!==originalSaved;
  const world=warMode?await (await import('./tower-world.js')).createTowerWorld(scene,loading,{inside:towerState.inside||!!warSaved?.afterlife?.inLimbo,room:towerState.room,position:saved?.position??TOWER_EXIT,enabledRegions:launch.regions})
    :combatMode?await (await import('./combat-camp-world.js')).loadCombatCampWorld(scene,loading)
    :await loadExplorationWorld(scene,saved?.position??startPoint,loading,{enabledRegions:launch.regions});
  if(combatMode)scene.fog=new THREE.Fog(0xb6c8b0,100,300);
  if(warSaved?.afterlife?.inLimbo)world.showLimbo();
  const actor=warMode?createWarHero(ROLLO_LOOK):createCharacter({role:'traveler',look:ROLLO_LOOK,armed:false,hat:false});
  if(warMode)actor.setForm(warSaved?.afterlife?.inLimbo?'living':warSaved?.afterlife?.form??'living');actor.setArmed(false);scene.add(actor.group);
  const shadow=groundShadow(.28);scene.add(shadow);
  const position=new THREE.Vector3(),keys=new Set(),cells=new Set(saved?.cells??[]);
  let elapsed=saved?.elapsed??0,yaw=saved?.camera.yaw??0,pitch=saved?.camera.pitch??.27,distance=saved?.camera.distance??8;
  let mode='playing',drag=false,frameId,last=performance.now(),disposed=false,statusTimer,dirty=false;
  let sorcery=null,afterlife=null,hearthfall=null,residentHost=null,stable=null,minimap=null,boundaryBlocked=false;
  let frameErrors=[],frames=0,streamClock=0,war=null,windowActive=true,skirmish=null,autoplay=null,journey=null,practice=null,waterBlocked=false,horseSwimming=false,lastCrossing=null;
  const movement=explorationMovement(position,world),map=combatMode?null:(await import('../../ui/map/world-map.js')).createWorldMap({includeQuests:false,regionScope:launch.mapRegions??null});
  const mounts=createExplorationMounts({scene,actor,position,world,movement});
  const footHelp=$('exploration-help').textContent;
  // Touch controls for a phone (8 October 2026; src/app/exploration/exploration-touch.js): a stick and buttons that
  // press the keys read below, a finger on the view to look; `touch.sync` once a frame, `touch.steer` for travel.
  const touch=createExplorationTouch({document,keys,search:location.search,coarse:!!globalThis.matchMedia?.('(pointer: coarse)').matches,onTakeControl:()=>stopAutoplay()});
  const combatAim=new THREE.Vector3();
  const focus=new THREE.Vector3(),desired=new THREE.Vector3(),cameraOffset=new THREE.Vector3(0,1.55,0);

  function stopAutoplay(){autoplay?.stop();journey?.stop();}
  function autoplayStatus(message,active){const button=$('world-autoplay');button.hidden=!active;button.textContent=message+' / Stop (P)';button.setAttribute('aria-pressed',String(active));if(!active)notice(message);}
  function notice(message){$('exploration-status').classList.toggle('on-map',mode==='map');$('exploration-status').hidden=false;$('exploration-status').textContent=message;clearTimeout(statusTimer);statusTimer=setTimeout(()=>{$('exploration-status').hidden=true;},4500);}
  function discover(){if(towerState?.inside||world.state?.().inLimbo)return;const h=hexAt(position.x,position.z),key=`${h.q},${h.r}`;if(!cells.has(key)){cells.add(key);dirty=true;}}
  function updateChart(){
    if(!map)return;
    const glimpsed=new Set();for(const key of cells){const [q,r]=key.split(',').map(Number);for(const [dq,dr] of [[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]]){const near=`${q+dq},${r+dr}`;if(!cells.has(near))glimpsed.add(near);}}
    map.setChart({cells:[...cells],glimpsed:[...glimpsed],reveal:$('reveal-all').checked});
    map.setTraveler(TRANSFORM.worldToAtlas(position.x,position.z),{region:world.regionAt(position.x,position.z).name,heading:TRANSFORM.worldHeadingToAtlas(actor.group.rotation.y)});
    war?.refreshKnowledge();
  }
  function setMode(next){
    mode=next;keys.clear();drag=false;
    if(['skirmish','encounter','briefing','chronicle'].includes(next)){$('exploration-status').hidden=true;clearTimeout(statusTimer);}
    $('exploration-developer').hidden=next!=='developer';
    $('map-screen').hidden=next!=='map';$('exploration-pause').hidden=next!=='pause';
    $('exploration-hud').hidden=next!=='playing';$('exploration-help').hidden=!['playing','limbo'].includes(next);
    if(next==='playing'){world.loading.start();canvas.focus();}else world.stop();
    tower?.update();council?.update();residentHost?.update();sorcery?.update(0);stable?.update(0,elapsed);minimap?.update(1,elapsed);afterlife?.update();
  }
  function openMap(options={}){if(combatMode)return;if(warMode)options={view:'geopolitical',...options,regions:launch.mapRegions};if(hearthfallMode)options={...options,regions:['Feradom']};if(mode==='loading'||mode==='encounter'||mode==='skirmish')return;$('exploration-status').hidden=true;clearTimeout(statusTimer);setMode('map');updateChart();$('world-demo-caption').hidden=!options?.regions;map.open(options?.regions?options:{});$('close-map').focus();}
  function pause(){if(combatMode)return;if(mode==='loading'||mode==='encounter'||mode==='skirmish')return;setMode('pause');$('save-note').textContent=hearthfallMode?(dirty?'You have unsaved Hearthfall progress. Save before leaving.':'Hearthfall uses its own local save slot.'):war?(dirty?'You have unsaved campaign progress. Save the hero and war before leaving.':'Your war scenario save is separate from ordinary exploration.'):dirty?'You have unsaved exploration. Save before leaving to keep it.':'Your last saved exploration is kept separately from the adventure.';$('resume-exploration').focus();}
  function refreshTravelHelp(){
    if(world.state?.().inLimbo){$('exploration-help').textContent='WASD walk / Right-drag look / F speak with the Reaper';return;}
    if(actor.form==='ghost'){$('exploration-help').textContent='Ghost / WASD drift / Shift faster / M map / Return to the Reaper to choose another fate';return;}
    if(towerState?.inside){$('exploration-help').textContent='WASD / arrows \u00b7 Shift run \u00b7 Space jump \u00b7 F talk / door \u00b7 Right-drag look \u00b7 Scroll zoom \u00b7 Esc pause \u00b7 F5 save';return;}
    $('exploration-help').textContent=waterBlocked?'Find a gentler bank to enter the water.':mounts.airborne()?`${mounts.kind==='dragon'?'Developer dragon':'Developer bat'} \u00b7 WASD fly \u00b7 Space up \u00b7 Ctrl down \u00b7 Shift boost \u00b7 Tab turbo \u00b7 G land \u00b7 F8 tools`
      :mounts.kind==='horse'&&horseSwimming?'Horse swimming / WASD steer / Reach a dry bank to dismount':mounts.kind==='horse'?`${stable?.mounted?'Your horse':'Developer horse'} \u00b7 WASD ride \u00b7 Shift canter \u00b7 G dismount \u00b7 Right-drag look \u00b7 M map \u00b7 F8 tools`:stable?.owned?footHelp+' \u00b7 G mount \u00b7 H whistle':footHelp;
  }
  function openDeveloper(){
    if(combatMode||afterlife?.inLimbo||afterlife?.form==='ghost')return;
    if(towerState?.inside){notice('Leave the building before using mounts, travel or combat playtests.');return;}
    if(mode==='loading'||mode==='encounter'||mode==='skirmish')return;setMode('developer');$('exploration-status').hidden=true;
    $('developer-current').textContent=mounts.kind==='foot'?'On foot':`Riding developer ${mounts.kind}${mounts.state().landing?' \u00b7 landing':''}`;
    for(const button of document.querySelectorAll('[data-exploration-mount]'))button.setAttribute('aria-pressed',String(button.dataset.explorationMount===mounts.kind));
    $('developer-region').value=String(world.regionAt(position.x,position.z).id);$('developer-reveal').checked=$('reveal-all').checked;$('developer-region').focus();
  }
  function selectMount(kind){
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
  function setTowerEnvironment(){
    if(!towerState)return;
    const limbo=world.state().inLimbo;
    scene.background=new THREE.Color(limbo?0x101c2b:towerState.inside?0x354751:0xb6c8b0);
    scene.fog=towerState.inside||limbo?null:new THREE.Fog(0xb6c8b0,180,560);
    sun.intensity=limbo?.15:towerState.inside?.45:2.1;refreshTravelHelp();
  }
  const changeTower=enter=>changeRoom(enter?'tower':null);
  async function changeRoom(next){
    if(mode!=='playing'||next===towerState.room)return false;
    if(!towerState.briefed){notice('Speak with Taleth before leaving.');return false;}
    if(mounts.kind!=='foot'||!movement.state().grounded){notice('Land and dismount before entering.');return false;}
    const before=snapshot(),opening=towerState.snapshot(war.state().clock.running),previous=towerState.room;
    const exit=councilRoom(previous)?.exit??TOWER_EXIT,spawn=next==='tower'?TOWER_SPAWN:next?councilSpawn(next):exit;
    stopAutoplay();setMode('loading');$('loading-screen').hidden=false;loading(next?'Entering '+(councilRoom(next)?.room??'Taleth\u2019s chamber'):'Returning to Minora');
    try{
      if(!next)await world.prepareExterior(exit);
      world.show(next);if(next)towerState.enter(next);else towerState.leave();
      place(spawn,next?Math.PI:0);yaw=next?0:Math.PI-.55;pitch=.27;distance=8;setTowerEnvironment();
      dirty=true;updateLocation();updateCamera(true);war.sync();war.refresh();setMode('playing');return true;
    }catch(error){world.show(opening.location==='world'?null:opening.location);towerState=createTowerState({tower:opening});place(before.position,before.heading);({yaw,pitch,distance}=before.camera);setTowerEnvironment();updateLocation();updateCamera(true);setMode('playing');notice('The doorway could not open: '+error.message);return false;}
    finally{$('loading-screen').hidden=true;}
  }
  function updateLocation(){if(world.state?.().inLimbo){$('location-name').textContent='The room between departures';return;}const region=world.regionAt(position.x,position.z).name;$('location-name').textContent=towerState?.inside?'Minora / '+(councilRoom(towerState.room)?.room??'Guild chamber'):Math.hypot(position.x-START.x,position.z-START.z)<250?'Minora':region;}
  function snapshot(){return {version:1,character:'teresod',position:{x:position.x,y:position.y,z:position.z},heading:actor.group.rotation.y,
    camera:{yaw,pitch,distance},elapsed,cells:[...cells]};}
  function save(){
    if(combatMode)return store.save();
    if(mode==='loading'||mode==='crossing'||mode==='encounter'||mode==='skirmish'||mounts.airborne()||!movement.state().grounded){notice('Wait until you are on the ground before saving.');return {ok:false};}
    const data=hearthfall?hearthfall.save(snapshot()):war?{...captureWarCheckpoint(),afterlife:afterlife.snapshot()}:snapshot();
    const result=store.save(data);if(result.ok)dirty=false;
    const message=result.ok?(hearthfall?'Hearthfall saved.':war?'War scenario saved.':'Exploration saved.'):result.reason;$('save-note').textContent=message;notice(message);return result;
  }
  function captureWarCheckpoint(){return {...war.save(snapshot()),tower:towerState.snapshot(war.state().clock.running),riding:stable.snapshot(),council:council.snapshot(),sorcery:sorcery.snapshot()};}
  async function enterLimbo(){
    stopAutoplay();war.pause();war.track(null);setMode('crossing');document.body.classList.add('crossing-limbo');
    await new Promise(resolve=>setTimeout(resolve,450));stable.park();mounts.reset();world.showLimbo();actor.setForm('living');
    place(LIMBO_SPAWN,Math.PI);yaw=0;pitch=.2;distance=8;setTowerEnvironment();updateLocation();setMode('limbo');updateCamera(true);
    await new Promise(resolve=>setTimeout(resolve,500));document.body.classList.remove('crossing-limbo');
  }
  async function restoreWarAttempt(checkpoint,side,form){
    setMode('loading');const s=checkpoint.exploration,restored=createTowerState(checkpoint);
    if(!restored.inside)await world.prepareExterior(s.position);world.show(restored.room);towerState=restored;actor.setForm(form);
    cells.clear();for(const cell of s.cells)cells.add(cell);elapsed=s.elapsed;
    place(s.position,s.heading);({yaw,pitch,distance}=s.camera);stable.restore(checkpoint.riding);council.restore(checkpoint.council);sorcery.restore(checkpoint.sorcery);war.restore(checkpoint);war.track(null);
    setTowerEnvironment();updateLocation();updateChart();updateCamera(true);setMode('playing');war.tick(0,false);
    if(side)await war.help(side);
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
    const at=candidates.find(p=>world.canExploreAt(p.x,p.z)&&(canStand(p.x,p.z,world,.34)||canSwim(p.x,p.z,world,.34)));
    if(!at)throw new Error('There is no clear footing near this saved position. Your save has been kept.');
    return at;
  }
  function place(point,heading=Math.PI){
    const at=actor.form==='ghost'&&world.canExploreAt(point.x,point.z)?point:clearPosition(point),floor=Math.max(world.heightAt(at.x,at.z),world.waterAt(at.x,at.z)-.65);
    stable?.park();mounts.reset();refreshTravelHelp();position.set(at.x,at===point&&Number.isFinite(point.y)?Math.max(point.y,floor):floor,at.z);
    actor.group.rotation.y=heading;actor.group.position.copy(position);movement.reset(heading);world.loading.update(position);world.update(elapsed,0,position);discover();
  }
  async function loadSaved(){
    if(mode==='encounter'||mode==='skirmish'||mode==='loading')return;
    stopAutoplay();
    const result=store.read();if(!result.ok||!result.data){notice(result.reason||'No exploration has been saved yet.');return;}
    let data=war||hearthfall?result.data.exploration:result.data;setMode('loading');$('loading-screen').hidden=false;loading('Returning to your saved place');
    try{
      if(towerState){const restored=createTowerState(result.data);data=boundedWarSave(data,restored);afterlife.restore(result.data.afterlife);actor.setForm(afterlife.inLimbo?'living':afterlife.form);if(!restored.inside&&!afterlife.inLimbo)await world.prepareExterior(data.position);towerState=restored;if(afterlife.inLimbo)world.showLimbo();else world.show(restored.room);setTowerEnvironment();}
      await world.prepare(data.position.x,data.position.z);cells.clear();for(const key of data.cells)cells.add(key);elapsed=data.elapsed;
      ({yaw,pitch,distance}=data.camera);place(data.position,data.heading);stable?.restore(result.data.riding);council?.restore(result.data.council);sorcery?.restore(result.data.sorcery);if(war){war.restore(result.data);if(towerState.snapshot().running&&!afterlife.inLimbo)war.run();}if(hearthfall)hearthfall.restore(result.data);dirty=false;updateLocation();updateCamera(true);setMode(afterlife?.inLimbo?'limbo':'playing');notice(war?'Saved war scenario restored.':'Saved exploration restored.');
    }catch(error){setMode('pause');notice(error.message);}finally{$('loading-screen').hidden=true;}
  }
  async function prepareCrossing(point){
    setMode('loading');$('loading-screen').hidden=false;const region=world.regionAt(point.x,point.z),started=performance.now();loading('Preparing '+region.name);
    const before=new Map(world.loading.state().jobs.map(j=>[j.id,j.buildMs]));
    const progress=setInterval(()=>{
      const state=world.loading.state(),jobs=state.jobs.filter(j=>j.regions.includes(region.id));
      $('loading-message').textContent=`Preparing ${region.name} / ${jobs.filter(j=>j.status==='ready').length} of ${jobs.length} parts ready / ${Math.round((performance.now()-started)/1000)}s`;
    },500);
    try{await world.prepare(point.x,point.z);setMode('playing');}
    catch(error){setMode('pause');notice('This region could not load: '+error.message);}
    finally{clearInterval(progress);$('loading-screen').hidden=true;lastCrossing={region:region.name,ms:Math.round(performance.now()-started),jobs:world.loading.state().jobs.map(j=>({id:j.id,buildMs:Math.round(j.buildMs-(before.get(j.id)??0))})).filter(j=>j.buildMs>0).sort((a,b)=>b.buildMs-a.buildMs)};console.log('EXPLORATION_CROSSING '+JSON.stringify(lastCrossing));}
  }
  let cameraYaw=yaw;const followOffset=new THREE.Vector3(),cameraObstruction=createCameraObstruction(world);
  function updateCamera(snap=false,dt=1/60){
    const blend=1-Math.exp(-10*dt);
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
  }
  function step(dt){
    touch.sync(mode);
    if(mode==='combat-menu')return;
    autoplay?.tick(dt,windowActive);journey?.tick(dt,windowActive);
    if(mode==='loading')return; // The loading veil keeps the last frame; give terrain construction the frame budget.
    if(mode==='skirmish'){if(windowActive)elapsed+=dt;skirmish?.tick(dt,windowActive);if(!practice?.state().active){discover();dirty=true;}}
    if(mode==='playing'||mode==='limbo'){
      elapsed+=dt;const previousPosition={x:position.x,z:position.z},previousMount=mounts.kind,moved=actor.form==='ghost'&&!world.state?.().inLimbo?ghostStep(position,world,...touch.steer(keys,yaw),dt,actor.group.rotation.y):mounts.step(...touch.steer(keys,yaw),dt);
      const edge=!towerState?.inside&&war?.constrainTravel(previousPosition);
      if(edge){position.x=edge.x;position.z=edge.z;position.y=Math.max(position.y,world.heightAt(edge.x,edge.z));}
      mounts.draw(elapsed,moved);
      if(moved.blockedBoundary&&!boundaryBlocked&&!towerState?.inside)notice(world.state?.().inLimbo?'Speak with the Reaper to leave this room.':warMode?'The war scenario ends at this border. Explore the World opens the wider continent.':'The Hearthfall workspace ends at Feradom. Return to the main menu for the full world.');
      boundaryBlocked=!!moved.blockedBoundary;hearthfall?.tick(dt,elapsed);
      if(previousMount!==mounts.kind||waterBlocked!==!!moved.blockedWater||horseSwimming!==(mounts.kind==='horse'&&!!moved.swimming)){waterBlocked=!!moved.blockedWater;horseSwimming=mounts.kind==='horse'&&!!moved.swimming;refreshTravelHelp();}
      if(moved.speed>.001){dirty=true;discover();}
      if(moved.waiting)prepareCrossing(moved.waiting);
      streamClock+=dt;if(streamClock>.4){world.loading.update(position,actor.group.rotation.y,moved.speed);streamClock=0;
        updateLocation();}
    }
    if(!practice?.state().active)war?.tick(dt,windowActive&&!towerState?.inside&&['playing','map'].includes(mode));
    tower?.tick(dt,windowActive);tower?.update();council?.update();residentHost?.update();stable?.update(mode==='playing'&&windowActive?dt:0,elapsed);minimap?.update(dt,elapsed);afterlife?.update();
    sorcery?.update(windowActive?dt:0);
    if(mode==='encounter')return;
    if(['playing','skirmish','limbo','reaper'].includes(mode))world.update(elapsed,dt,position);
    if(['briefing','chronicle'].includes(mode))world.update(elapsed,windowActive?dt:0,position);
    shadow.position.set(position.x,world.heightAt(position.x,position.z)+.025,position.z);shadow.visible=actor.form!=='ghost'&&!mounts.airborne()&&!movement.state().swimming;
    updateCamera(false,dt);war?.drawGuidance(camera);renderer.render(scene,camera);
  }
  function frame(now){if(disposed)return;const dt=Math.min(.04,(now-last)/1000);last=now;frames++;
    try{step(dt);}catch(error){stopAutoplay();frameErrors.push(String(error.stack||error));console.error(error);if(practice?.state().active)practice.finish();else if(mode==='skirmish')war.withdraw();if(!combatMode)setMode('pause');notice('Exploration paused after a rendering error.');}
    frameId=requestAnimationFrame(frame);
  }
  function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}
  listen(window,'resize',resize);listen(window,'blur',()=>{keys.clear();drag=false;windowActive=false;});listen(window,'focus',()=>{windowActive=true;});
  listen(document,'keydown',event=>{
    if(mode==='crossing'){event.preventDefault();return;}
    if(afterlife?.keydown(event)||tower?.keydown(event)||council?.keydown(event)||stable?.keydown(event)||residentHost?.keydown(event))return;
    if(mode==='limbo'){
      if(event.code==='KeyF'||event.code==='Escape'){event.preventDefault();if(!event.repeat)afterlife.talk();return;}
      if(event.code==='F5'){event.preventDefault();if(!event.repeat)save();return;}
      if(['Space','Tab','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code))event.preventDefault();
      if(event.code==='Space'&&!event.repeat)movement.jump();keys.add(event.code);return;
    }
    if(combatMode&&mode==='combat-menu')return;
    if(event.code==='KeyP'&&autoplay&&!event.target?.closest?.('input,select,textarea,[contenteditable="true"]')){
      event.preventDefault();if(!event.repeat){if(autoplay.state().active||journey?.state().active)stopAutoplay();else openDeveloper();}return;
    }
    if(['KeyT','KeyE','KeyQ','KeyH','KeyW','KeyA','KeyS','KeyD','KeyX','Space','Enter','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Escape','KeyM','KeyF','KeyG','F5','F8'].includes(event.code))stopAutoplay();
    if(mode==='encounter')return;
    if(event.code==='KeyQ'&&['playing','skirmish'].includes(mode)){event.preventDefault();if(!event.repeat)sorcery?.cast();return;}
    if(mode==='skirmish'){if(skirmish?.keydown(event))return;if(event.code==='Tab'||['Enter','Space'].includes(event.code)&&event.target?.closest?.('button'))return;event.preventDefault();if(!event.repeat&&practice?.state().active&&event.code==='KeyR')practice.retry();else if(!event.repeat&&(event.code==='Escape'||event.code==='Enter'&&skirmish?.snapshot().outcome)){if(practice?.state().active)practice.finish();else if(event.code==='Enter')war.continue();else war.withdraw();}else keys.add(event.code);return;}
    if(event.code==='F8'){event.preventDefault();if(!event.repeat){if(mode==='developer')setMode('playing');else openDeveloper();}return;}
    if(event.code==='F5'){event.preventDefault();if(!event.repeat)save();return;}
    if(event.code==='Escape'){event.preventDefault();if(!event.repeat){if(mode==='playing')pause();else if(mode!=='loading')setMode('playing');}return;}
    if(event.code==='KeyM'&&(mode==='playing'||mode==='map')){event.preventDefault();if(!event.repeat){if(mode==='map')setMode('playing');else if(mode==='playing')openMap();}return;}
    if(mode!=='playing')return;
    if(event.code==='KeyF'&&war){event.preventDefault();if(!event.repeat&&!tower?.interact()&&!council?.interact()&&!stable?.interact()&&!residentHost?.interact())war.join();return;}
    if(['Tab','Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code))event.preventDefault();
    if(afterlife?.form==='ghost'&&['KeyG','KeyH','KeyF','Space'].includes(event.code)){event.preventDefault();return;}
    if(event.code==='KeyG'&&!event.repeat){if(!stable?.toggleMount())selectMount('foot');refreshTravelHelp();return;}
    if(event.code==='KeyH'&&!event.repeat){stable?.whistle();return;}
    if(event.code==='Space'&&!event.repeat&&mounts.kind==='foot')movement.jump();keys.add(event.code);
  });
  listen(document,'keyup',event=>keys.delete(event.code));listen(canvas,'contextmenu',event=>event.preventDefault());
  listen(document,'pointerdown',event=>{if(event.target.closest('button,input,select')&&!event.target.closest('[data-autoplay-control]'))stopAutoplay();});
  listen(document,'click',event=>{if(event.target.closest('button,input,select')&&!event.target.closest('[data-autoplay-control]'))stopAutoplay();});
  // The right mouse button, or on a touch screen a finger on the view, turns the camera; two fingers pinch it (8 October 2026).
  listen(canvas,'pointerdown',event=>{canvas.focus();if(touch.look.start(event)&&['playing','skirmish','limbo'].includes(mode)){skirmish?.manualCamera();drag=true;canvas.setPointerCapture(event.pointerId);}});
  listen(canvas,'click',event=>{if(event.button===0&&mode==='skirmish')skirmish?.attack();});
  listen(canvas,'pointerup',event=>drag=touch.look.end(event));listen(canvas,'pointercancel',event=>drag=touch.look.end(event));
  listen(canvas,'pointermove',event=>{const turn=drag&&['playing','skirmish','limbo'].includes(mode)&&touch.look.move(event);if(turn){skirmish?.manualCamera();yaw-=turn.dx*.006;pitch=Math.max(.05,Math.min(1.15,pitch+turn.dy*.004));distance=Math.max(3,Math.min(22,distance*turn.zoom));}});
  listen(canvas,'wheel',event=>{if(['playing','skirmish','limbo'].includes(mode))distance=Math.max(3,Math.min(22,distance+event.deltaY*.008));});
  function startWorldFight(options){
    if(actor.form==='ghost'||world.state?.().inLimbo)throw Error('This form cannot fight.');
    if(mounts.kind!=='foot'||!movement.state().grounded||movement.state().swimming)throw Error('Land and dismount before fighting.');
    if(journey?.state().active||practice?.state().active){yaw=0;pitch=.4;distance=15;updateCamera(true);}
    const controller=openWorldSkirmish({...options,scene,world,actor,position,keys,watch:()=>!!journey?.state().active||!!autoplay?.state().active,yaw:()=>cameraYaw,centre:options.centre??LIZEEM_BATTLEFIELDS[options.pending.region],site:options.site??LIZEEM_FIELD_SITES[options.pending.region]});
    skirmish=controller;if(!options.practice){pitch=Math.max(.36,pitch);distance=Math.max(10,distance);yaw=options.site?.approachHeading??LIZEEM_FIELD_SITES[options.pending.region]?.approachHeading??0;movement.reset(actor.group.rotation.y);updateCamera(true);}setMode('skirmish');canvas.focus();
    return {snapshot:controller.snapshot,dispose(){controller.dispose();skirmish=null;movement.reset(actor.group.rotation.y);updateLocation();}};
  }
  $('world-war-hud').onclick=openMap;
  $('open-map').onclick=openMap;$('close-map').onclick=()=>setMode('playing');$('open-pause').onclick=pause;
  $('resume-exploration').onclick=()=>setMode('playing');$('save-exploration').onclick=save;$('load-exploration').onclick=loadSaved;
  function mainMenu(){const url=new URL(location.href);url.searchParams.delete('mode');url.searchParams.delete('war');url.searchParams.set('menu','1');location.href=url.href;}
  $('return-start').textContent='Exit to main menu without saving';$('return-start').onclick=mainMenu;
  $('save-return-start').onclick=()=>{if(save().ok)mainMenu();};
  $('reveal-all').onchange=()=>setReveal($('reveal-all').checked);$('developer-reveal').onchange=()=>setReveal($('developer-reveal').checked);
  $('open-developer').onclick=openDeveloper;$('close-developer').onclick=()=>setMode('playing');$('developer-map').onclick=openMap;
  if(!combatMode){
  const atlas=await fetch('./assets/azhora-world-map.json').then(response=>{if(!response.ok)throw new Error('Region list could not load.');return response.json();});
  const available=new Map(explorationDestinations.map(r=>[r.name,r]));
  for(const region of [...atlas.regions].filter(r=>{const destination=available.get(r.name);return (!hearthfallMode||r.name==='Feradom')&&(!warMode||destination&&allowsRegion(launch,destination.id));}).sort((a,b)=>a.name.localeCompare(b.name))){
    const destination=available.get(region.name),option=new Option(region.name+(destination?'':' (atlas only)'),destination?String(destination.id):'atlas:'+region.name);
    option.disabled=!destination;$('developer-region').add(option);
  }
  }
  $('developer-go').onclick=()=>travelToRegion($('developer-region').value);
  for(const button of document.querySelectorAll('[data-exploration-mount]'))button.onclick=()=>selectMount(button.dataset.explorationMount);
  listen(window,'pagehide',()=>{disposed=true;stopAutoplay();cancelAnimationFrame(frameId);clearTimeout(statusTimer);abort.abort();hearthfall?.dispose();war?.dispose();tower?.dispose();council?.dispose();residentHost?.dispose();stable?.dispose();minimap?.dispose();afterlife?.dispose();sorcery?.dispose();actor.dispose?.();world.stop();world.dispose?.();renderer.dispose();});
  place(saved?.position??(towerState?.inside?TOWER_SPAWN:hearthfallMode?findRegionArrival({...explorationDestinations.find(r=>r.id===21),spawn:startPoint},world):startPoint)??startPoint,saved?.heading??Math.PI);if(saved)dirty=false;
  resize();updateLocation();updateCamera(true);if(map&&!await map.ready)throw new Error('The world map could not initialize.');
  setReveal(launch.reveal);
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
  if(warMode){
    const {connectWorldWar}=await import('./world-war-host.js');
    war=connectWorldWar({saved:warSaved,map,regionName:()=>world.regionAt(position.x,position.z).name,position,scene,world,
      onCampaignChange:state=>world.setCouncil(state),cameraYaw:()=>yaw,canBegin:()=>towerState.briefed,horseOwned:()=>stable?.owned??false,horseState:()=>stable?.state(),isGhost:()=>actor.form==='ghost',
      onBeforeFight:()=>afterlife.beforeFight(),onDeath:context=>{stopAutoplay();afterlife.died(context).then(()=>save()).catch(e=>notice('Could not enter limbo: '+e.message));},
      localEncounter:{supports:pending=>!!pending.reinforcements&&!!LIZEEM_FIELD_SITES[pending.region],open:startWorldFight},
      autoEntry:()=>!journey?.state().active&&!autoplay?.state().active,
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
    tower=createTowerHost({state:()=>towerState,position,mode:()=>mode,setMode,notice,scenario:()=>war.state().campaign.scenario,campaign:()=>war.state().campaign,onChronicle:value=>world.setChronicle(value),
      onBegin(){dirty=true;war.begin();notice('Day 1: the armies are on the march. Meet Bear outside the tower.');},onDoor:changeTower});
    council=createCouncilHost({saved:warSaved?.council,state:()=>towerState,position,mode:()=>mode,setMode,campaign:()=>war.state().campaign,onDoor:changeRoom,onDirty(){dirty=true;}});
    residentHost=createResidentHost({world,position,mode:()=>mode,setMode,available:()=>!towerState.inside&&!world.state().inLimbo&&!mounts.airborne()});
    stable=createStableHost({scene,world,actor,position,mounts,movement,saved:warSaved?.riding,inside:()=>towerState.inside||world.state().inLimbo,mode:()=>actor.form==='ghost'?'ghost':mode,setMode,notice,onChange(){dirty=true;refreshTravelHelp();}});
    minimap=createLocalMap({world,position,heading:()=>actor.group.rotation.y,inside:()=>towerState.inside,mode:()=>mode,openMap,events:()=>war.minimapEvents(),track:target=>war.track(target),
      marker:()=>council.marker()??(towerState.inside?(towerState.briefed?{...TOWER_DOOR,id:'door',label:'Door to Minora'}:{...TALETH_SPOT,id:'taleth',label:'Taleth'}):war.minimapDestination()??stable.marker()),
      chart:()=>({cells, reveal:$('reveal-all').checked})});
    afterlife=createAfterlifeHost({saved:warSaved?.afterlife,position,mode:()=>mode,setMode,capture:captureWarCheckpoint,enter:enterLimbo,restore:restoreWarAttempt,returnToWorld:returnFromLimbo,save,mainMenu,onChange(){dirty=true;refreshTravelHelp();},notice});
    sorcery=createFireballHost({scene,world,actor,position,yaw:()=>yaw,mode:()=>mode,inside:()=>towerState.inside||world.state().inLimbo,canCast:()=>actor.form!=='ghost'&&mounts.kind==='foot',combat:()=>skirmish,saved:warSaved?.sorcery,notice,onDirty(){dirty=true;}});
    setTowerEnvironment();
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
          cells.clear();elapsed=0;place(START);war.restore(null);setReveal(true);dirty=true;
          yaw=0;pitch=.27;distance=11;setMode('playing');updateLocation();updateCamera(true);
          world.prefetchRegion(25);return selectMount('horse').ok;
        }finally{$('loading-screen').hidden=true;if(mode==='loading')setMode('playing');}
      },
    });
  }
  if(warMode||combatMode){
    practice=createOvesosPractice({
      capture(){stopAutoplay();return {hero:snapshot(),dirty};},
      async prepare(){
        setMode('loading');$('loading-screen').hidden=false;loading('Preparing Minora camp practice');
        const begun=performance.now(),before=new Map(world.loading.state().jobs.map(j=>[j.id,j.buildMs]));
        try{
          await world.prepareRegion(16);
          const jobs=world.loading.state().jobs.map(j=>({id:j.id,buildMs:Math.round(j.buildMs-(before.get(j.id)??0)),longestSliceMs:Math.round(j.longestSliceMs)})).filter(j=>j.buildMs>0).sort((a,b)=>b.buildMs-a.buildMs);
          return {wallMs:Math.round(performance.now()-begun),jobs};
        }finally{$('loading-screen').hidden=true;}
      },
      open({retry,finish,attempt,exercise}){
        place(MENORA_CAMP);setMode('playing');
        const view=startWorldFight({practice:exercise,pending:{region:'minora-practice'},centre:MENORA_CAMP,site:{name:'Minora camp',regionId:16,approachHeading:0},enemyColor:'#b77162',reinforcements:{name:'Training',strength:0},onEnd(){},onContinue:finish,onWithdraw:finish});
        $('world-skirmish-retry').hidden=false;$('world-skirmish-retry').onclick=retry;
        if(combatMode){$('world-skirmish-continue').textContent='Choose exercise (Enter)';$('world-skirmish-withdraw').textContent='Choose exercise (Esc)';}
        document.querySelector('#world-skirmish .eyebrow').textContent=`MINORA CAMP / ${exercise==='lesson'?'DODGE LESSON':exercise==='advanced'?'THRUST AND SWEEP LESSON':exercise==='allied'?'ALLIED ASSAULT':exercise==='solo-assault'?'SOLO ASSAULT':'INTERCEPTION PRACTICE'} / ATTEMPT ${attempt}`;
        return view;
      },
      restore(saved){
        const s=saved.hero;elapsed=s.elapsed;place(s.position,s.heading);yaw=s.camera.yaw;pitch=s.camera.pitch;distance=s.camera.distance;
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
    $('developer-autoplay').hidden=false;
    $('developer-residents').onchange=()=>world.setResidents($('developer-residents').checked);
    $('autoplay-ovesos').onclick=()=>{stopAutoplay();journey.start();};
    $('autoplay-caricas').onclick=()=>{stopAutoplay();autoplay.start();};
    $('world-autoplay').onclick=stopAutoplay;
    document.querySelector('#exploration-hud .eyebrow').textContent='TERESOD / LIZEEMI WAR';
    $('save-exploration').textContent='Save war scenario (F5)';$('load-exploration').textContent='Load saved war scenario';
    document.querySelector('.atlas-help').textContent='Five regions are playable in this scenario. Speak with Taleth before beginning; M shows the current armies and battles.';
    document.querySelector('#exploration-pause p').textContent='Your hero position, discoveries and the campaign are saved together in the separate war scenario slot.';
  }
  $('loading-screen').hidden=true;$('exploration-hud').hidden=false;$('exploration-help').hidden=false;
  const readyMs=Math.round(performance.now()-begun);console.log('EXPLORATION_READY '+readyMs+'ms');
  setMode(afterlife?.inLimbo?'limbo':'playing');frameId=requestAnimationFrame(frame);
  if(relocatedSave)notice('This scenario now covers five regions. You have returned to Minora; your campaign progress is kept.');
  if(new URLSearchParams(location.search).has('test'))window.__EXPLORATION__={
    state:()=>({launch:launch.id,touch:touch.state(),character:'teresod',enabledRegions:world.enabledRegions,lastCrossing,combatCues:scene.children.filter(o=>o.userData.combatWarningEdge||o.userData.counterOpening||o.userData.combatHealth||o.userData.hitRecovery).map(o=>({kind:o.userData.combatWarningEdge?'edge':o.userData.counterOpening?'opening':o.userData.combatHealth?'label':'protection',visible:o.visible,cue:o.userData.cue??null,remaining:o.userData.remaining??null,detailed:o.userData.combatHealth&&o.scale.y>.2})),combatImpacts:scene.children.filter(o=>o.userData.combatImpact).map(o=>({kind:o.userData.kind,visible:o.visible})),combatMarkers:scene.children.filter(o=>o.userData.combatTarget||o.userData.combatFacing).map(o=>({target:o.userData.combatTarget===true,targetId:o.userData.targetId??null,visible:o.visible,position:o.position.toArray()})),rallyLabels:scene.children.filter(o=>o.userData.rallyLabel).map(o=>({visible:o.visible,scale:o.scale.toArray(),sizeAttenuation:o.material.sizeAttenuation})),fieldActors:scene.children.filter(o=>o.userData.worldSkirmish).map(o=>({position:o.position.toArray(),ground:world.heightAt(o.position.x,o.position.z),clear:canStand(o.position.x,o.position.z,world,.34),visible:o.visible})),mode,form:actor.form??'living',position:position.toArray(),camera:{yaw,pitch,distance},cells:[...cells],readyMs,frames,frameErrors:[...frameErrors],map:map?.state()??null,dirty,grounded:!mounts.airborne()&&movement.state().grounded,mount:mounts.state(),region:world.regionAt(position.x,position.z).id}),
    war,hearthfall,autoplay,journey,practice,stable,minimap,afterlife,council,sorcery,residentHost,
    tower:warMode?{state:()=>({...towerState.snapshot(war.state().clock.running),...world.state()}),interact:()=>tower.interact(),chronicleState:()=>tower.chronicleState()}:null,
    groundProbe(x,z){return {x,z,height:world.heightAt(x,z),water:world.waterAt(x,z),region:world.regionAt(x,z).id,ready:world.readyAt(x,z),clear:canStand(x,z,world,.62),colliders:world.nearColliders(x,z,1).map(c=>({...c}))};},
    testWorld:world,testHero:actor,
    project(point){const p=new THREE.Vector3(point.x,point.y,point.z).project(camera);return {x:p.x,y:p.y,z:p.z};},
    renderStats(){const begun=performance.now();renderer.render(scene,camera);return {...renderer.info.render,cpuMs:performance.now()-begun,geometries:renderer.info.memory.geometries};},
    look(view){skirmish?.manualCamera();yaw=view.yaw??yaw;pitch=view.pitch??pitch;distance=view.distance??distance;updateCamera(true);},
    snapshot,save,store,loadSaved,openMap,openDeveloper,travelToRegion,selectMount,pause,resume:()=>setMode('playing'),step,
    hold:(code,on)=>on?keys.add(code):keys.delete(code),jump:()=>movement.jump(),
    async visit(point){setMode('loading');await world.prepare(point.x,point.z);place(point);setMode('playing');updateCamera(true);},
    reveal:setReveal,
  };
  if(combatMode)await practice.start(combatExercise??'lesson');
  return {practice};
}
