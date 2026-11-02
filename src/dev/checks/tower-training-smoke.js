import {TALETH_SPOT,TOWER_DOOR,LOOKOUT_TALETH} from '../../app/exploration/tower-state.js';
import {createAdventureWar} from '../../experiments/day-night/opening-war.js';
import {createWorldWar,worldWarScenario} from '../../app/exploration/world-war.js';
import {encounterKeys} from './encounter-controls.js';
import {validateWorldWarSave} from '../../app/exploration/war-checkpoint.js';

// Isolated native profile. Exercise the real conversation and combat inputs;
// fixture campaign outcomes never alter the normal player's save slot.
const checks=[];
const $=id=>document.getElementById(id);
const assert=(value,label)=>{if(!value)throw Error(label);checks.push(label);console.log('EXPLORATION_CHECK '+label);};
const frame=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
const training=a=>typeof a.training==='function'?a.training():a.training;
const state=a=>training(a)?.state();
const key=code=>{for(const type of ['keydown','keyup'])document.dispatchEvent(new KeyboardEvent(type,{code,bubbles:true,cancelable:true}));};
const down=code=>document.dispatchEvent(new KeyboardEvent('keydown',{code,bubbles:true,cancelable:true}));
const up=code=>document.dispatchEvent(new KeyboardEvent('keyup',{code,bubbles:true,cancelable:true}));
const click=id=>{const button=$(id);assert(button&&!button.hidden&&!button.disabled,'Available training control: '+id);button.click();};
const ticks=(a,count=40)=>{for(let i=0;i<count;i++)a.step(.04);};
const position=a=>JSON.stringify({position:a.snapshot().position,heading:a.snapshot().heading,camera:a.snapshot().camera,cells:a.snapshot().cells});
const campaign=a=>JSON.stringify({campaign:a.war.state().campaign,clock:a.war.clock().elapsedSeconds??a.war.clock().fraction,sky:a.dayNight?.state().hour,side:a.war.state().campaignSide,mana:a.sorcery.snapshot(),save:a.store.read().data});
let initialCampaign,initialPosition,undecided;
async function until(test,label,timeout=30000){const end=performance.now()+timeout;while(!test()&&performance.now()<end)await new Promise(resolve=>setTimeout(resolve,40));assert(test(),label);}
async function talk(a){const point=a.tower.state().room==='lookout'?LOOKOUT_TALETH:TALETH_SPOT;await a.visit({...point,z:point.z+2});key('KeyF');assert(a.state().mode==='briefing','F opens Taleth conversation');}
async function enter(a){click('tower-training-start');await until(()=>a.state().mode==='training'&&state(a)?.active,'Taleth opens the mist training chamber');window.dispatchEvent(new Event('focus'));}
function lesson(a,id){if($('training-lessons').hidden)key('Escape');const button=document.querySelector(`[data-training-lesson="${id}"]`);assert(button&&!button.disabled&&button.getClientRects().length,'Available lesson: '+id);button.click();assert(state(a).lesson===id,'Selected lesson runs: '+id);}
function leave(a){training(a).exit();assert(a.state().mode==='playing','Leaving training restores ordinary exploration');}
function unchanged(a,before,label){assert(campaign(a)===before,label+' preserves campaign, clock, sky, mana and saved checkpoint');}

export function menu(mode='war'){
  assert(!$('start-screen').hidden,'The ordinary main menu is available');
  const button=document.querySelector(`[data-start-mode="${mode}"]`);assert(button,'Normal '+mode+' launch exists');button.click();
  return {checks:[...checks],mode};
}
export async function opening(a){
  window.dispatchEvent(new Event('focus'));a.step(0);
  assert(a.tower.state().inside&&!a.tower.state().briefed&&!a.war.state().campaignSide,'Training is available before choosing allegiance');
  assert(!a.tower.state().exteriorLoaded,'Opening chamber has no outdoor region loaded');
  assert(a.save().ok,'Uncommitted tower checkpoint saves before training');undecided=structuredClone(a.store.read().data);
  await talk(a);initialCampaign=campaign(a);initialPosition=position(a);await enter(a);
  assert($('tower-briefing').hidden,'Training closes Taleth dialogue');
  assert(!a.tower.state().exteriorLoaded,'The mist chamber loads without building the outdoor regions');
  ticks(a,200);unchanged(a,initialCampaign,'Walking time in the mist chamber');
  assert(position(a)===initialPosition,'Training owns a separate character and leaves the tower position intact');
  assert(!a.tower.state().briefed&&!a.war.state().campaignSide,'Entering training cannot commit a league or unlock the exit');
  for(const code of ['KeyM','F8','KeyV'])key(code);
  assert(a.state().mode==='training','Map, developer and counsel shortcuts cannot escape the training scene');
  await frame();return {checks:[...checks],training:state(a),render:a.renderStats()};
}
export async function lobbyView(a){
  if(state(a).paused)key('Escape');
  training(a).pointerdown({button:2,clientX:0,clientY:0});training(a).pointermove({clientX:(state(a).camera.yaw-Math.PI)/.005,clientY:0});training(a).pointerup();ticks(a,2);
  unchanged(a,initialCampaign,'Looking around the mist chamber');await frame();
  return {checks:[...checks],training:state(a),render:a.renderStats()};
}
export async function staffReady(a){
  lesson(a,'staff');await frame();return {checks:[...checks],training:state(a),render:a.renderStats()};
}
export async function staff(a){
  lesson(a,'staff');const starting=state(a).hero;
  down('KeyW');ticks(a,13);up('KeyW');
  assert(Math.hypot(state(a).hero.x-starting.x,state(a).hero.z-starting.z)>.5,'W moves the training hero toward the staff target');
  down('KeyX');for(let i=0;i<250&&state(a).phase!=='complete';i++)a.step(.04);up('KeyX');
  assert(state(a).phase==='complete'&&state(a).stats.staffHits>=2,'Real staff strikes complete Taleth staff lesson');
  unchanged(a,initialCampaign,'Staff practice');
  await frame();return {checks:[...checks],training:state(a)};
}
export async function fireballReady(a){
  lesson(a,'fireball');await frame();return {checks:[...checks],training:state(a),render:a.renderStats()};
}
export async function fireball(a){
  lesson(a,'fireball');const mana=state(a).sorcery.mana;key('KeyQ');
  assert(state(a).sorcery.mana<mana,'Q spends the training copy of fireball mana');
  for(let i=0;i<150&&state(a).phase!=='complete';i++)a.step(.04);
  assert(state(a).phase==='complete'&&state(a).stats.fireballHits>=1,'A real fireball projectile reaches the target and completes its lesson');
  unchanged(a,initialCampaign,'Fireball practice');
  await frame();return {checks:[...checks],training:state(a)};
}
export async function counter(a){
  lesson(a,'counter');
  for(let i=0;i<1200&&state(a).phase==='running';i++){
    for(const [code,on] of Object.entries(encounterKeys(state(a),state(a).camera.yaw)))a.hold(code,on);
    a.step(.04);
  }
  for(const code of ['KeyW','KeyS','KeyD','KeyA','KeyX','Space'])a.hold(code,false);
  assert(state(a).phase==='complete'&&state(a).stats.dodgeCounters>=1,'Ordinary movement and dodge inputs earn a real dodge counter');
  unchanged(a,initialCampaign,'Dodge-counter practice');
  await frame();return {checks:[...checks],training:state(a)};
}
export async function sparringFailure(a){
  lesson(a,'practice');
  for(let i=0;i<2000&&state(a).phase==='running';i++)a.step(.04);
  assert(state(a).phase==='retry'&&state(a).hero.hp===0,'Losing a sparring match offers a safe retry');
  assert(a.state().mode==='training'&&!a.afterlife.inLimbo,'Training defeat does not send the real hero to the Reaper');
  unchanged(a,initialCampaign,'Losing a sparring match');
  click('training-retry');assert(state(a).phase==='running'&&state(a).hero.hp===100&&state(a).sorcery.mana===100,'Retry restores training health and mana');
  await frame();return {checks:[...checks],training:state(a)};
}
export async function returnAndRepeat(a){
  lesson(a,'staff');const hero=JSON.stringify(state(a).hero);key('Escape');assert(state(a).paused,'Escape pauses the training exercise');
  down('KeyW');ticks(a,80);up('KeyW');assert(JSON.stringify(state(a).hero)===hero,'Paused training does not move or injure the hero');
  key('Escape');assert(!state(a).paused,'Escape resumes the exercise');
  window.dispatchEvent(new Event('blur'));const away=JSON.stringify(state(a).hero);ticks(a,80);assert(JSON.stringify(state(a).hero)===away,'An unfocused game freezes the exercise');window.dispatchEvent(new Event('focus'));
  unchanged(a,initialCampaign,'Pausing and unfocusing training');
  leave(a);assert(position(a)===initialPosition,'Leaving an unfinished lesson restores the exact chamber viewpoint');
  assert(!$('tower-training'),'The training interface is removed on exit');
  assert(!a.tower.state().exteriorLoaded&&!a.tower.state().briefed&&!a.war.state().campaignSide,'Returning early preserves the uncommitted tower and lazy exterior');
  await a.visit({...TOWER_DOOR,z:TOWER_DOOR.z-1});key('KeyF');
  assert(a.tower.state().inside&&!a.tower.state().briefed,'The real outside door remains locked after combat practice');
  await talk(a);await enter(a);assert(state(a).phase==='idle','A second visit starts ready for another lesson');
  const start=state(a).hero,portal=state(a).portal;
  if(state(a).paused)key('Escape');
  training(a).pointerdown({button:2,clientX:0,clientY:0});training(a).pointermove({clientX:state(a).camera.yaw/.005,clientY:0});training(a).pointerup();
  // The foyer starts close to its return doorway. Use normal walking toward it.
  if(!state(a).nearPortal){const code=portal.z>=start.z?'KeyS':'KeyW';down(code);for(let i=0;i<300&&!state(a).nearPortal;i++)a.step(.04);up(code);}
  assert(state(a).nearPortal,'The base building return portal is reachable on foot');key('KeyF');
  assert(a.state().mode==='playing','F at the base building returns from the mist chamber');
  assert(a.save().ok&&validateWorldWarSave(a.store.read().data,a.store.read().data.format),'The post-training tower remains saveable');
  assert(!a.store.read().data.campaignSide,'The saved tutorial visit has no accidental campaign allegiance');
  await frame();return {checks:[...checks],tower:a.tower.state()};
}
export async function committed(a){
  await talk(a);click('tower-allegiance-west');click('tower-next');
  assert(a.tower.state().briefed&&a.war.state().campaignSide==='west','The normal Taleth choice still commits West after training');
  await talk(a);const before=campaign(a),at=position(a);await enter(a);lesson(a,'fireball');key('KeyQ');ticks(a,120);unchanged(a,before,'Training during a committed war');leave(a);
  assert(position(a)===at&&a.tower.state().briefed&&a.war.state().campaignSide==='west','Training returns to the committed tower with allegiance intact');
  assert(a.save().ok,'The committed campaign still saves after training');
  await frame();return {checks:[...checks],tower:a.tower.state()};
}
export async function concluded(a){
  const existing=a.store.read().data;
  const fixture=existing.fullCampaign?createAdventureWar():createWorldWar(null,worldWarScenario(existing.simulation.scenario));
  fixture.campaign.reinforce('nethereum',500);fixture.advance(300);
  assert(!!fixture.snapshot().winner,'The postwar fixture resolves a real campaign');
  a.war.restore({...existing,...fixture.checkpoint()});a.war.pause();
  await talk(a);const before=campaign(a),at=position(a);await enter(a);lesson(a,'staff');ticks(a,30);unchanged(a,before,'Postwar combat training');leave(a);
  assert(position(a)===at&&!!a.war.state().campaign.winner,'Postwar training returns without changing the campaign result');
  await frame();return {checks:[...checks],winner:a.war.state().campaign.winner};
}
export async function lookout(a){
  await talk(a);click('tower-next');await until(()=>a.state().mode==='playing'&&a.tower.state().room==='lookout','The postwar lookout loads',300000);
  await talk(a);assert(a.state().panoramic,'Taleth lookout dialogue uses the panorama before training');const before=campaign(a);await enter(a);ticks(a,50);unchanged(a,before,'Training entered from the lookout');leave(a);
  assert(a.tower.state().room==='lookout'&&a.state().mode==='playing'&&!a.state().panoramic,'Training returns to walking in the lookout');
  await talk(a);assert(a.state().panoramic,'Taleth panorama remains usable after training');click('tower-close');await frame();
  return {checks:[...checks],tower:a.tower.state()};
}
export async function finish(a){
  assert(!state(a)?.active&&!$('tower-training'),'No training controller or interface remains after returning');
  assert(!a.state().frameErrors.length,'All training visits complete without renderer errors');
  assert(a.store.save(undecided).ok,'Original isolated uncommitted checkpoint remains valid');await a.loadSaved();a.resume();
  assert(!a.tower.state().briefed&&!a.war.state().campaignSide,'An older pre-training save restores the ordinary tower');
  await talk(a);await enter(a);lesson(a,'staff');await frame();
  assert(!a.state().frameErrors.length,'Training remains reusable after loading an older checkpoint');
  return {checks:[...checks],training:state(a),render:a.renderStats()};
}
