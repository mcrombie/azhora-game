import * as THREE from 'three';
import {createCharacter,groundShadow} from '../../content/characters/characters.js';
import {ROLLO_LOOK} from '../../content/characters/rollo-look.js';
import {createWorldMap} from '../../ui/map/world-map.js';
import {hexAt,TRANSFORM} from '../../world/terrain/region-world.js';
import {canStand,canSwim} from '../../gameplay/movement/locomotion.js';
import {loadExplorationWorld} from './world-adapter.js';
import {explorationMovement} from './movement.js';
import {START} from './checkpoint.js';
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

export async function startExploration({saved,warSaved=null,warMode=false,hearthfallSaved=null,launch=warMode?MODES.war:MODES.explore,store,begun}){
  const hearthfallMode=launch.id==='hearthfall',startPoint=launch.start??START;
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
  const world=await loadExplorationWorld(scene,saved?.position??startPoint,loading,{enabledRegions:launch.regions});
  const actor=createCharacter({role:'traveler',look:ROLLO_LOOK,armed:false,hat:false});actor.setArmed(false);scene.add(actor.group);
  const shadow=groundShadow(.28);scene.add(shadow);
  const position=new THREE.Vector3(),keys=new Set(),cells=new Set(saved?.cells??[]);
  let elapsed=saved?.elapsed??0,yaw=saved?.camera.yaw??0,pitch=saved?.camera.pitch??.27,distance=saved?.camera.distance??8;
  let mode='playing',drag=false,frameId,last=performance.now(),disposed=false,statusTimer,dirty=false;
  let hearthfall=null,boundaryBlocked=false;
  let frameErrors=[],frames=0,streamClock=0,war=null,windowActive=true,skirmish=null,autoplay=null,journey=null,practice=null,waterBlocked=false,lastCrossing=null;
  const movement=explorationMovement(position,world),map=createWorldMap({includeQuests:false});
  const mounts=createExplorationMounts({scene,actor,position,world,movement});
  const footHelp=$('exploration-help').textContent;
  const focus=new THREE.Vector3(),desired=new THREE.Vector3(),cameraOffset=new THREE.Vector3(0,1.55,0);

  function stopAutoplay(){autoplay?.stop();journey?.stop();}
  function autoplayStatus(message,active){const button=$('world-autoplay');button.hidden=!active;button.textContent=message+' / Stop (P)';button.setAttribute('aria-pressed',String(active));if(!active)notice(message);}
  function notice(message){$('exploration-status').classList.toggle('on-map',mode==='map');$('exploration-status').hidden=false;$('exploration-status').textContent=message;clearTimeout(statusTimer);statusTimer=setTimeout(()=>{$('exploration-status').hidden=true;},4500);}
  function discover(){const h=hexAt(position.x,position.z),key=`${h.q},${h.r}`;if(!cells.has(key)){cells.add(key);dirty=true;}}
  function updateChart(){
    const glimpsed=new Set();for(const key of cells){const [q,r]=key.split(',').map(Number);for(const [dq,dr] of [[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]]){const near=`${q+dq},${r+dr}`;if(!cells.has(near))glimpsed.add(near);}}
    map.setChart({cells:[...cells],glimpsed:[...glimpsed],reveal:$('reveal-all').checked});
    map.setTraveler(TRANSFORM.worldToAtlas(position.x,position.z),{region:world.regionAt(position.x,position.z).name,heading:TRANSFORM.worldHeadingToAtlas(actor.group.rotation.y)});
    war?.refreshKnowledge();
  }
  function setMode(next){
    mode=next;keys.clear();drag=false;
    if(next==='skirmish'||next==='encounter'){$('exploration-status').hidden=true;clearTimeout(statusTimer);}
    $('exploration-developer').hidden=next!=='developer';
    $('map-screen').hidden=next!=='map';$('exploration-pause').hidden=next!=='pause';
    $('exploration-hud').hidden=next!=='playing';$('exploration-help').hidden=next!=='playing';
    if(next==='playing'){world.loading.start();canvas.focus();}else world.stop();
  }
  function openMap(options={}){if(hearthfallMode)options={...options,regions:['Feradom']};if(mode==='loading'||mode==='encounter'||mode==='skirmish')return;$('exploration-status').hidden=true;clearTimeout(statusTimer);setMode('map');updateChart();$('world-demo-caption').hidden=!options?.regions;map.open(options?.regions?options:{});$('close-map').focus();}
  function pause(){if(mode==='loading'||mode==='encounter'||mode==='skirmish')return;setMode('pause');$('save-note').textContent=hearthfallMode?(dirty?'You have unsaved Hearthfall progress. Save before leaving.':'Hearthfall uses its own local save slot.'):war?(dirty?'You have unsaved world-test progress. Save the hero and war before leaving.':'Your world-test save is separate from ordinary exploration.'):dirty?'You have unsaved exploration. Save before leaving to keep it.':'Your last saved exploration is kept separately from the adventure.';$('resume-exploration').focus();}
  function refreshTravelHelp(){
    $('exploration-help').textContent=waterBlocked?'Horse stops at water. Back away and use a bridge, or G to dismount.':mounts.airborne()?`${mounts.kind==='dragon'?'Developer dragon':'Developer bat'} \u00b7 WASD fly \u00b7 Space up \u00b7 Ctrl down \u00b7 Shift boost \u00b7 Tab turbo \u00b7 G land \u00b7 F8 tools`
      :mounts.kind==='horse'?'Developer horse \u00b7 WASD ride \u00b7 Shift canter \u00b7 G dismount \u00b7 Right-drag look \u00b7 M map \u00b7 F8 tools':footHelp;
  }
  function openDeveloper(){
    if(mode==='loading'||mode==='encounter'||mode==='skirmish')return;setMode('developer');$('exploration-status').hidden=true;
    $('developer-current').textContent=mounts.kind==='foot'?'On foot':`Riding developer ${mounts.kind}${mounts.state().landing?' \u00b7 landing':''}`;
    for(const button of document.querySelectorAll('[data-exploration-mount]'))button.setAttribute('aria-pressed',String(button.dataset.explorationMount===mounts.kind));
    $('developer-region').value=String(world.regionAt(position.x,position.z).id);$('developer-reveal').checked=$('reveal-all').checked;$('developer-region').focus();
  }
  function selectMount(kind){
    if(mode==='encounter'||mode==='skirmish')return {ok:false,reason:'Finish the encounter first.'};
    const result=mounts.select(kind);if(!result.ok){notice(result.reason);return result;}
    if(kind==='dragon')distance=Math.max(15,distance);else if(kind==='bat')distance=Math.max(10,distance);
    mounts.draw(elapsed,{...movement.state(),heading:actor.group.rotation.y,speed:0});refreshTravelHelp();setMode('playing');updateCamera(true);return result;
  }
  function setReveal(value){$('reveal-all').checked=!!value;$('developer-reveal').checked=!!value;updateChart();}
  async function travelToRegion(id){
    if(mode==='loading'||mode==='encounter'||mode==='skirmish')return false;
    if(!allowsRegion(launch,Number(id))){notice('Hearthfall is limited to Feradom. Use Explore the World from the main menu for other regions.');return false;}
    const region=explorationDestinations.find(r=>r.id===Number(id));if(!region){notice('Choose a region first.');return false;}
    setMode('loading');$('loading-screen').hidden=false;loading('Preparing '+region.name);
    try{
      await world.prepareRegion(region.id);const at=findRegionArrival(region,world);
      if(!at)throw new Error('No clear, dry arrival found in '+region.name+'. Your position has not changed.');
      place(at);dirty=true;updateLocation();updateCamera(true);setMode('playing');notice('Arrived in '+region.name+'.');return true;
    }catch(error){setMode('developer');openDeveloper();notice(error.message);return false;}
    finally{$('loading-screen').hidden=true;if(mode==='loading')setMode('developer');}
  }
  function updateLocation(){const region=world.regionAt(position.x,position.z).name;$('location-name').textContent=Math.hypot(position.x-START.x,position.z-START.z)<250?'Minora':region;}
  function snapshot(){return {version:1,character:'teresod',position:{x:position.x,y:position.y,z:position.z},heading:actor.group.rotation.y,
    camera:{yaw,pitch,distance},elapsed,cells:[...cells]};}
  function save(){
    if(mode==='loading'||mode==='encounter'||mode==='skirmish'||mounts.airborne()||!movement.state().grounded){notice('Wait until you are on the ground before saving.');return {ok:false};}
    const result=store.save(hearthfall?hearthfall.save(snapshot()):war?war.save(snapshot()):snapshot());if(result.ok)dirty=false;
    const message=result.ok?(hearthfall?'Hearthfall saved.':war?'World test saved.':'Exploration saved.'):result.reason;$('save-note').textContent=message;notice(message);return result;
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
    const at=clearPosition(point),floor=Math.max(world.heightAt(at.x,at.z),world.waterAt(at.x,at.z)-.65);
    mounts.reset();refreshTravelHelp();position.set(at.x,at===point&&Number.isFinite(point.y)?Math.max(point.y,floor):floor,at.z);
    actor.group.rotation.y=heading;actor.group.position.copy(position);movement.reset(heading);world.loading.update(position);world.update(elapsed,0,position);discover();
  }
  async function loadSaved(){
    if(mode==='encounter'||mode==='skirmish'||mode==='loading')return;
    stopAutoplay();
    const result=store.read();if(!result.ok||!result.data){notice(result.reason||'No exploration has been saved yet.');return;}
    const data=war||hearthfall?result.data.exploration:result.data;setMode('loading');$('loading-screen').hidden=false;loading('Returning to your saved place');
    try{await world.prepare(data.position.x,data.position.z);cells.clear();for(const key of data.cells)cells.add(key);elapsed=data.elapsed;
      ({yaw,pitch,distance}=data.camera);place(data.position,data.heading);if(war)war.restore(result.data);if(hearthfall)hearthfall.restore(result.data);dirty=false;updateLocation();updateCamera(true);setMode('playing');notice(war?'Saved world test restored.':'Saved exploration restored.');
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
  let cameraYaw=yaw;const followOffset=new THREE.Vector3();
  function updateCamera(snap=false,dt=1/60){
    const blend=1-Math.exp(-10*dt);
    cameraYaw=snap?yaw:cameraYaw+Math.atan2(Math.sin(yaw-cameraYaw),Math.cos(yaw-cameraYaw))*blend;
    focus.copy(actor.group.position).add(cameraOffset);
    desired.set(focus.x+Math.sin(cameraYaw)*Math.cos(pitch)*distance,focus.y+Math.sin(pitch)*distance,focus.z+Math.cos(cameraYaw)*Math.cos(pitch)*distance);
    // Collision probes keep the follow camera in front of walls without raycasting the entire world.
    for(let i=1;i<=24;i++){
      const t=i/24,x=focus.x+(desired.x-focus.x)*t,y=focus.y+(desired.y-focus.y)*t,z=focus.z+(desired.z-focus.z)*t;
      const blocked=world.nearColliders(x,z,.12).some(c=>{
        if(c.kind==='river-water'||c.kind==='pond-water')return false;
        const bottom=c.minY??world.heightAt(c.x,c.z),top=c.maxY??bottom+2;
        return y>bottom-.1&&y<top+.12&&(c.r!==undefined?Math.hypot(x-c.x,z-c.z)<c.r+.12:Math.abs(x-c.x)<c.hx+.12&&Math.abs(z-c.z)<c.hz+.12);
      });
      if(blocked){desired.lerpVectors(focus,desired,Math.max(.12,(i-1)/24));break;}
    }
    desired.y=Math.max(desired.y,world.heightAt(desired.x,desired.z)+.6);
    if(snap||desired.distanceTo(focus)<followOffset.length())followOffset.copy(desired).sub(focus);else followOffset.lerp(desired.clone().sub(focus),blend);
    camera.position.copy(focus).add(followOffset);camera.position.y=Math.max(camera.position.y,world.heightAt(camera.position.x,camera.position.z)+.6);camera.lookAt(focus);
  }
  function step(dt){
    autoplay?.tick(dt,windowActive);journey?.tick(dt,windowActive);
    if(mode==='loading')return; // The loading veil keeps the last frame; give terrain construction the frame budget.
    if(mode==='skirmish'){if(windowActive)elapsed+=dt;skirmish?.tick(dt,windowActive);if(!practice?.state().active){discover();dirty=true;}}
    if(mode==='playing'){
      elapsed+=dt;const previousMount=mounts.kind,moved=mounts.step(keys,yaw,dt);mounts.draw(elapsed,moved);
      if(moved.blockedBoundary&&!boundaryBlocked)notice('The Hearthfall workspace ends at Feradom. Return to the main menu for the full world.');
      boundaryBlocked=!!moved.blockedBoundary;hearthfall?.tick(dt,elapsed);
      if(previousMount!==mounts.kind||waterBlocked!==!!moved.blockedWater){waterBlocked=!!moved.blockedWater;refreshTravelHelp();}
      if(moved.speed>.001){dirty=true;discover();}
      if(moved.waiting)prepareCrossing(moved.waiting);
      streamClock+=dt;if(streamClock>.4){world.loading.update(position,actor.group.rotation.y,moved.speed);streamClock=0;
        updateLocation();}
    }
    if(!practice?.state().active)war?.tick(dt,windowActive&&['playing','map'].includes(mode));
    if(mode==='encounter')return;
    if(mode==='playing'||mode==='skirmish')world.update(elapsed,dt,position);
    shadow.position.set(position.x,world.heightAt(position.x,position.z)+.025,position.z);shadow.visible=!mounts.airborne()&&!movement.state().swimming;
    updateCamera(false,dt);renderer.render(scene,camera);
  }
  function frame(now){if(disposed)return;const dt=Math.min(.04,(now-last)/1000);last=now;frames++;
    try{step(dt);}catch(error){stopAutoplay();frameErrors.push(String(error.stack||error));console.error(error);if(practice?.state().active)practice.finish();else if(mode==='skirmish')war.withdraw();setMode('pause');notice('Exploration paused after a rendering error.');}
    frameId=requestAnimationFrame(frame);
  }
  function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}
  listen(window,'resize',resize);listen(window,'blur',()=>{keys.clear();drag=false;windowActive=false;});listen(window,'focus',()=>{windowActive=true;});
  listen(document,'keydown',event=>{
    if(event.code==='KeyP'&&autoplay&&!event.target?.closest?.('input,select,textarea,[contenteditable="true"]')){
      event.preventDefault();if(!event.repeat){if(autoplay.state().active||journey?.state().active)stopAutoplay();else openDeveloper();}return;
    }
    if(['KeyW','KeyA','KeyS','KeyD','KeyX','Space','Enter','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Escape','KeyM','KeyF','KeyG','F5','F8'].includes(event.code))stopAutoplay();
    if(mode==='encounter')return;
    if(mode==='skirmish'){event.preventDefault();if(!event.repeat&&practice?.state().active&&event.code==='KeyR')practice.retry();else if(!event.repeat&&(event.code==='Escape'||event.code==='Enter'&&skirmish?.snapshot().outcome)){if(practice?.state().active)practice.finish();else war.withdraw();}else keys.add(event.code);return;}
    if(event.code==='F8'){event.preventDefault();if(!event.repeat){if(mode==='developer')setMode('playing');else openDeveloper();}return;}
    if(event.code==='F5'){event.preventDefault();if(!event.repeat)save();return;}
    if(event.code==='Escape'){event.preventDefault();if(!event.repeat){if(mode==='playing')pause();else if(mode!=='loading')setMode('playing');}return;}
    if(event.code==='KeyM'&&(mode==='playing'||mode==='map')){event.preventDefault();if(!event.repeat){if(mode==='map')setMode('playing');else if(mode==='playing')openMap();}return;}
    if(mode!=='playing')return;
    if(event.code==='KeyF'&&war){event.preventDefault();if(!event.repeat)war.join();return;}
    if(['Tab','Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code))event.preventDefault();
    if(event.code==='KeyG'&&!event.repeat){selectMount('foot');return;}
    if(event.code==='Space'&&!event.repeat&&mounts.kind==='foot')movement.jump();keys.add(event.code);
  });
  listen(document,'keyup',event=>keys.delete(event.code));listen(canvas,'contextmenu',event=>event.preventDefault());
  listen(document,'pointerdown',event=>{if(event.target.closest('button,input,select')&&!event.target.closest('[data-autoplay-control]'))stopAutoplay();});
  listen(document,'click',event=>{if(event.target.closest('button,input,select')&&!event.target.closest('[data-autoplay-control]'))stopAutoplay();});
  listen(canvas,'pointerdown',event=>{canvas.focus();if(event.button===2&&['playing','skirmish'].includes(mode)){drag=true;canvas.setPointerCapture(event.pointerId);}});
  listen(canvas,'click',event=>{if(event.button===0&&mode==='skirmish')skirmish?.attack();});
  listen(canvas,'pointerup',()=>drag=false);listen(canvas,'pointercancel',()=>drag=false);
  listen(canvas,'pointermove',event=>{if(drag&&['playing','skirmish'].includes(mode)){yaw-=event.movementX*.006;pitch=Math.max(.05,Math.min(1.15,pitch+event.movementY*.004));}});
  listen(canvas,'wheel',event=>{if(['playing','skirmish'].includes(mode))distance=Math.max(3,Math.min(22,distance+event.deltaY*.008));});
  function startWorldFight(options){
    if(mounts.kind!=='foot'||!movement.state().grounded||movement.state().swimming)throw Error('Land and dismount before fighting.');
    if(journey?.state().active||practice?.state().active){yaw=0;pitch=.4;distance=15;updateCamera(true);}
    const controller=openWorldSkirmish({...options,scene,world,actor,position,keys,watch:()=>!!journey?.state().active||!!autoplay?.state().active,yaw:()=>yaw,centre:options.centre??LIZEEM_BATTLEFIELDS[options.pending.region],site:options.site??LIZEEM_FIELD_SITES[options.pending.region]});
    skirmish=controller;setMode('skirmish');canvas.focus();
    return {snapshot:controller.snapshot,dispose(){controller.dispose();skirmish=null;movement.reset(actor.group.rotation.y);updateLocation();}};
  }
  $('world-war-hud').onclick=openMap;
  $('open-map').onclick=openMap;$('close-map').onclick=()=>setMode('playing');$('open-pause').onclick=pause;
  $('resume-exploration').onclick=()=>setMode('playing');$('save-exploration').onclick=save;$('load-exploration').onclick=loadSaved;
  $('return-start').textContent='Exit to main menu without saving';$('return-start').onclick=()=>{const url=new URL(location.href);url.searchParams.delete('mode');url.searchParams.delete('war');url.searchParams.set('menu','1');location.href=url.href;};
  $('reveal-all').onchange=()=>setReveal($('reveal-all').checked);$('developer-reveal').onchange=()=>setReveal($('developer-reveal').checked);
  $('open-developer').onclick=openDeveloper;$('close-developer').onclick=()=>setMode('playing');$('developer-map').onclick=openMap;
  const atlas=await fetch('./assets/azhora-world-map.json').then(response=>{if(!response.ok)throw new Error('Region list could not load.');return response.json();});
  const available=new Map(explorationDestinations.map(r=>[r.name,r]));
  for(const region of [...atlas.regions].filter(r=>!hearthfallMode||r.name==='Feradom').sort((a,b)=>a.name.localeCompare(b.name))){
    const destination=available.get(region.name),option=new Option(region.name+(destination?'':' (atlas only)'),destination?String(destination.id):'atlas:'+region.name);
    option.disabled=!destination;$('developer-region').add(option);
  }
  $('developer-go').onclick=()=>travelToRegion($('developer-region').value);
  for(const button of document.querySelectorAll('[data-exploration-mount]'))button.onclick=()=>selectMount(button.dataset.explorationMount);
  listen(window,'pagehide',()=>{disposed=true;stopAutoplay();cancelAnimationFrame(frameId);clearTimeout(statusTimer);abort.abort();hearthfall?.dispose();war?.dispose();world.stop();renderer.dispose();});
  place(saved?.position??(hearthfallMode?findRegionArrival({...explorationDestinations.find(r=>r.id===21),spawn:startPoint},world):START)??startPoint,saved?.heading??Math.PI);if(saved)dirty=false;
  resize();updateCamera(true);if(!await map.ready)throw new Error('The world map could not initialize.');
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
      cameraYaw:()=>yaw,
      localEncounter:{supports:pending=>!!pending.reinforcements&&!!LIZEEM_FIELD_SITES[pending.region],open:startWorldFight},
      canFightOnFoot:()=>mounts.kind==='foot'&&movement.state().grounded&&!movement.state().swimming,
      known:at=>{const h=hexAt(at.x,at.z);return $('reveal-all').checked||cells.has(`${h.q},${h.r}`);},
      knowledgeStamp:()=>`${cells.size}/${$('reveal-all').checked}`,openMap,getMode:()=>mode,setMode,onDirty:()=>{dirty=true;}});
    war.sync();war.refresh();
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
        document.querySelector('#world-skirmish .eyebrow').textContent=`MINORA CAMP / ${exercise==='lesson'?'DODGE LESSON':exercise==='advanced'?'THRUST AND SWEEP LESSON':'INTERCEPTION PRACTICE'} / ATTEMPT ${attempt}`;
        return view;
      },
      restore(saved){
        const s=saved.hero;elapsed=s.elapsed;place(s.position,s.heading);yaw=s.camera.yaw;pitch=s.camera.pitch;distance=s.camera.distance;
        cells.clear();for(const cell of s.cells)cells.add(cell);dirty=saved.dirty;setMode('playing');updateLocation();updateChart();updateCamera(true);notice('Practice ended. Returned on foot; campaign and saved game unchanged.');
      },onError:error=>notice('Practice could not start: '+error.message),
    });
    $('practice-minora').onclick=()=>practice.start();
    $('practice-minora-advanced').onclick=()=>practice.start('advanced');
    $('practice-minora-squad').onclick=()=>practice.start('squad');
    $('developer-autoplay').hidden=false;
    $('autoplay-ovesos').onclick=()=>{stopAutoplay();journey.start();};
    $('autoplay-caricas').onclick=()=>{stopAutoplay();autoplay.start();};
    $('world-autoplay').onclick=stopAutoplay;
    document.querySelector('#exploration-hud .eyebrow').textContent='TERESOD / LIZEEM WORLD TEST';
    $('save-exploration').textContent='Save world test (F5)';$('load-exploration').textContent='Load saved world test';
    document.querySelector('.atlas-help').textContent='Developer reveal starts on; switch it off to test discovery. Live campaign control covers five Lizeem regions.';
    document.querySelector('#exploration-pause p').textContent='Your hero position, discoveries and the campaign are saved together in the separate world-test slot.';
  }
  $('loading-screen').hidden=true;$('exploration-hud').hidden=false;$('exploration-help').hidden=false;
  const readyMs=Math.round(performance.now()-begun);console.log('EXPLORATION_READY '+readyMs+'ms');
  setMode('playing');frameId=requestAnimationFrame(frame);
  if(new URLSearchParams(location.search).has('test'))window.__EXPLORATION__={
    state:()=>({launch:launch.id,character:'teresod',enabledRegions:world.enabledRegions,lastCrossing,rallyLabels:scene.children.filter(o=>o.userData.rallyLabel).map(o=>({visible:o.visible,scale:o.scale.toArray(),sizeAttenuation:o.material.sizeAttenuation})),fieldActors:scene.children.filter(o=>o.userData.worldSkirmish).map(o=>({position:o.position.toArray(),ground:world.heightAt(o.position.x,o.position.z),clear:canStand(o.position.x,o.position.z,world,.34),visible:o.visible})),mode,position:position.toArray(),camera:{yaw,pitch,distance},cells:[...cells],readyMs,frames,frameErrors:[...frameErrors],map:map.state(),dirty,grounded:!mounts.airborne()&&movement.state().grounded,mount:mounts.state(),region:world.regionAt(position.x,position.z).id}),
    war,hearthfall,autoplay,journey,practice,
    groundProbe(x,z){return {x,z,height:world.heightAt(x,z),water:world.waterAt(x,z),region:world.regionAt(x,z).id,ready:world.readyAt(x,z),clear:canStand(x,z,world,.62),colliders:world.nearColliders(x,z,1).map(c=>({...c}))};},
    testWorld:world,
    snapshot,save,store,loadSaved,openMap,openDeveloper,travelToRegion,selectMount,pause,resume:()=>setMode('playing'),step,
    hold:(code,on)=>on?keys.add(code):keys.delete(code),jump:()=>movement.jump(),
    async visit(point){setMode('loading');await world.prepare(point.x,point.z);place(point);setMode('playing');updateCamera(true);},
    reveal:setReveal,
  };
}
