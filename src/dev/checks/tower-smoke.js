import {TOWER_SPAWN,TOWER_EXIT,TOWER_DOOR,TALETH_SPOT} from '../../app/exploration/tower-state.js';
const assert=(ok,message)=>{if(!ok)throw Error(message);};
const frame=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
const click=id=>{const button=document.getElementById(id);assert(button&&!button.hidden,'Button missing: '+id);button.click();};
const f=()=>document.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyF',bubbles:true}));

export async function checkTowerOpening(api){
  const initial=api.state();assert(api.tower.state().inside&&!api.tower.state().briefed,'Starts inside an unbriefed tower');
  assert(!api.tower.state().exteriorLoaded,'Exterior must not be built before the opening');
  api.war.run();api.war.advance(10);for(let i=0;i<100;i++)api.step(.04);
  assert(api.war.state().campaign.day===0&&!api.war.state().clock.running,'Map/test controls cannot start the war before Taleth');
  assert(!api.selectMount('dragon').ok,'Mount cannot bypass the door');assert(!await api.travelToRegion(13),'Travel cannot bypass the door');
  await api.visit({...TOWER_DOOR,z:TOWER_DOOR.z-1});f();
  assert(api.tower.state().inside&&!api.tower.state().briefed,'Closed door keeps Teresod inside');
  await api.visit(TOWER_SPAWN);assert(api.save().ok,'Can save before the briefing');
  api.openMap();assert(document.getElementById('world-war-run').disabled&&document.getElementById('world-war-step').disabled,'Map clock buttons visibly locked');api.resume();
  api.hold('KeyW',true);for(let i=0;i<70;i++)api.step(.02);api.hold('KeyW',false);
  assert(Math.hypot(api.state().position[0]-TALETH_SPOT.x,api.state().position[2]-TALETH_SPOT.z)<3.7,'Ordinary movement reaches Taleth');f();
  assert(api.state().mode==='briefing'&&!document.getElementById('tower-briefing').hidden,'F opens conversation');
  assert(/neutral/.test(document.getElementById('tower-words').textContent),'Taleth explicitly represents neutral Minora');
  await frame();
  return {initial:{readyMs:initial.readyMs},checks:['Fresh start inside chamber without exterior loading','Locked door, mounts, developer travel and campaign controls','Save before briefing','Walk to Taleth and interact using F']};
}
export async function beginTowerCampaign(api){
  click('tower-close');assert(!api.tower.state().briefed,'Declining keeps the briefing unfinished');f();
  click('tower-next');
  assert(api.tower.state().briefed&&api.war.state().clock.running,'Confirmation starts the campaign');
  for(let i=0;i<20;i++)api.step(.04);
  const fraction=api.war.state().clock.fraction;
  f();for(let i=0;i<100;i++)api.step(.04);
  assert(api.war.state().clock.fraction===fraction,'Conversation freezes the campaign');click('tower-close');
  api.pause();const before=api.war.state().clock.fraction;for(let i=0;i<100;i++)api.step(.04);
  assert(api.war.state().clock.fraction===before,'Pause menu freezes the campaign');api.resume();
  assert(api.save().ok,'Can save completed briefing inside');
  await api.loadSaved();assert(api.tower.state().inside&&api.tower.state().briefed&&api.war.state().clock.running,'Reload inside restores briefing and clock status');
  await api.visit({...TOWER_DOOR,z:TOWER_DOOR.z-1});f();
  await new Promise((resolve,reject)=>{const end=Date.now()+300000;const poll=()=>api.state().mode==='playing'?resolve():Date.now()>end?reject(Error('Exterior transition timed out')):setTimeout(poll,100);poll();});
  assert(!api.tower.state().inside&&api.tower.state().exteriorLoaded,'Door reaches Minora exterior');
  assert(Math.hypot(api.state().position[0]-TOWER_EXIT.x,api.state().position[2]-TOWER_EXIT.z)<1,'Arrives on clear ground at actual tower door');
  assert(api.groundProbe(TOWER_EXIT.x,TOWER_EXIT.z).clear,'Exterior arrival is collision-free');
  assert(api.save().ok,'Can save outdoors');
  await frame();
  return {checks:['Not yet keeps door locked','Ready starts campaign once','Dialogue and pause freeze time','Save/load inside retains briefing','Exit loads bounded exterior at the real tower door','Exterior arrival is clear and saveable']};
}
export async function returnToTower(api){
  const legacy=api.store.read().data;delete legacy.tower;
  legacy.exploration.position={x:-350,y:20,z:-720};
  assert(api.store.save(legacy).ok,'Legacy outdoor save accepted');
  await api.loadSaved();assert(!api.tower.state().inside&&api.tower.state().briefed,'Legacy save bypasses the already completed introduction');
  assert(Math.hypot(api.state().position[0]-TOWER_EXIT.x,api.state().position[2]-TOWER_EXIT.z)<1,'Legacy out-of-region position returns to Minora');
  assert(JSON.stringify(api.store.read().data)===JSON.stringify(legacy),'Relocating a legacy save does not overwrite it');
  api.war.pause();api.war.advance(1);const campaign=api.war.state().campaign;
  f();await frame();assert(api.tower.state().inside,'Exterior F re-enters chamber');
  assert(JSON.stringify(api.war.state().campaign)===JSON.stringify(campaign),'Re-entry preserves campaign exactly');
  await api.visit({x:TALETH_SPOT.x,z:TALETH_SPOT.z+2});f();click('tower-next');
  assert(!api.war.state().clock.running,'Repeating completed briefing does not restart a paused campaign');
  assert(JSON.stringify(api.war.state().campaign)===JSON.stringify(campaign),'Repeating briefing does not reset history');
  assert(api.save().ok,'Can save return visit');
  await api.visit(TOWER_SPAWN);await frame();
  assert(!api.state().frameErrors.length,'No renderer errors');
  return {checks:['Legacy out-of-region save returns to Minora without overwriting its file','Two-way door','Re-entry and repeat briefing preserve campaign history and paused clock','Saved return visit'],campaign};
}

// Existing outdoor checks still start from their historical paused fixture,
// but reach it through the real briefing and doorway rather than a bypass.
export async function prepareWarExterior(api){
  if(!api.tower.state().inside)return;
  await api.visit({x:TALETH_SPOT.x,z:TALETH_SPOT.z+2});f();
  click('tower-next');
  await api.visit({...TOWER_DOOR,z:TOWER_DOOR.z-1});f();
  await new Promise((resolve,reject)=>{const end=Date.now()+300000;const poll=()=>api.state().mode==='playing'?resolve():Date.now()>end?reject(Error('Tower exit timed out')):setTimeout(poll,100);poll();});
  assert(!api.tower.state().inside,'War check must be outside');
  api.war.restore(null);await api.visit({x:-2414,z:63});
}
