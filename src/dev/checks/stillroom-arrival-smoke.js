import {STILLROOM_ARRIVAL} from '../../app/exploration/training/stillroom-door.js';
import {TOWER,TALETH_SPOT,TOWER_DOOR} from '../../app/exploration/tower-state.js';
import {BIRD_LIFE_KEY} from '../../app/exploration/bird-life-list.js';
import {driveWorldEncounter,clearCombatKeys} from './encounter-controls.js';
import {ARRIVAL_KEY,ARRIVAL_TRIALS} from '../../app/exploration/training/arrival-progress.js';
const assert=(condition,message)=>{if(!condition)throw Error(message);};
const frames=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
const click=id=>{const el=document.getElementById(id);assert(el&&!el.disabled,'Missing enabled '+id);el.click();};
const key=code=>{document.dispatchEvent(new KeyboardEvent('keydown',{code,bubbles:true}));document.dispatchEvent(new KeyboardEvent('keyup',{code,bubbles:true}));};
async function wait(predicate){const end=performance.now()+60000;while(!predicate()){if(window.__EXPLORATION_ERROR__)throw Error(window.__EXPLORATION_ERROR__);if(performance.now()>end)throw Error('Stillroom did not become ready');await frames();}}
const host=()=>window.__STILLROOM__;
const current=()=>host().state();
function capture(){clearCombatKeys(host());window.dispatchEvent(new Event('blur'));return {progress:current().progress,round:current().round,render:host().renderStats()};}
export async function begin(){
  await wait(()=>!!document.getElementById('new-world-war'));click('new-world-war');await wait(()=>!!host());window.dispatchEvent(new Event('focus'));
  assert(!window.__EXPLORATION__,'Campaign must not be constructed before the portal');assert(current().scenery.buildings===1,'One refuge in the mist');
  return capture();
}
export async function introduction(){
  window.dispatchEvent(new Event('focus'));for(let i=0;i<300;i++)host().step(1/60);
  assert(current().dialogue&&current().progress.introduced,'Taleth walks up and explains the mission');assert(!current().approaching,'Taleth settles before speaking');
  assert(document.getElementById('stillroom-conversation').textContent.includes('across places and ages'),'Mission explains guild travel');
  const before=current().clock;for(let i=0;i<120;i++)host().step(1/60);assert(current().clock===before,'Talking holds time');return capture();
}
export async function refuge(){
  click('arrival-handoff');window.dispatchEvent(new Event('focus'));for(let i=0;i<900;i++)host().step(1/60);assert(current().talethGone&&!host().testTaleth.group.visible,'Taleth walks to the portal and leaves');assert(host().testUguth.group.visible,'Uguth stays in the realm');host().visit({x:0,z:31});host().look({yaw:Math.PI-.45,pitch:.17,distance:6.5});host().step(0);
  assert(current().position.z>30,'Refuge interior is physically accessible');assert(current().scenery.colliders>15,'Walls and furniture are solid');return capture();
}
export async function lockedDoor(){
  window.dispatchEvent(new Event('focus'));host().visit({x:0,z:38.8});key('KeyF');assert(current().dialogue,'Door offers locked explanation');assert(!document.getElementById('arrival-depart'),'No departure action before approval');
  return capture();
}
export async function doorApproach(){
  window.dispatchEvent(new Event('focus'));host().visit({x:0,z:33});host().look({yaw:Math.PI,pitch:.12,distance:8});host().step(0);
  return capture();
}
export async function doorSide(){
  window.dispatchEvent(new Event('focus'));host().visit({x:-1.2,z:36.1});host().look({yaw:Math.PI-.48,pitch:.12,distance:6.5});host().step(0);
  return capture();
}
export async function doorClose(){
  window.dispatchEvent(new Event('focus'));host().visit({x:0,z:42});
  assert(current().position.z<40.1,'The physical door stops movement before its front face');
  assert(document.getElementById('arrival-prompt')?.textContent.includes('door')||document.getElementById('stillroom-arrival').textContent.includes('The door is sealed'),'Door destination uses the nearby interaction prompt');
  host().look({yaw:Math.PI-.3,pitch:.18,distance:5.5});return capture();
}
export async function doorApproved(){
  window.dispatchEvent(new Event('focus'));key('KeyF');assert(document.getElementById('arrival-depart'),'Approved physical door still offers Enter Azhora');return capture();
}
function complete(expected,midFall=false){
  window.dispatchEvent(new Event('focus'));let s=current().encounter;assert(s?.trial===expected,'Expected trial '+expected);
  if(s.briefing){const clock=s.time;for(let i=0;i<30;i++)host().step(1/60);assert(current().encounter.time===clock,'Briefing freezes combat');click('combat-trial-start');key('KeyT');}
  if(expected==='bramble-goblin'){
    // A real projectile through the shared spell host, followed by normal staff
    // and dodge input. No state mutation or automatic encounter outcome.
    key('KeyQ');assert(host().sorcery.state().mana===80,'Fireball costs the same 20 mana');
    host().hold('KeyF',true);for(let i=0;i<45;i++)host().step(1/60);host().hold('KeyF',false);
  }
  for(let i=0;i<7200&&!current().encounter.outcome;i++){driveWorldEncounter(host(),current().encounter);host().step(1/60);}
  clearCombatKeys(host());s=current().encounter;assert(s.outcome==='success','Normal combat input wins '+expected);
  assert(!document.getElementById('battle-result-dialog').open,'Defeat is visible before the report');
  const before=JSON.stringify({hero:s.hero,guards:s.guards,time:s.time});
  window.dispatchEvent(new Event('blur'));for(let i=0;i<120;i++)host().step(1/60);
  assert(current().encounter.presentation.resultElapsed<.05,'Backgrounding holds the defeat beat');
  window.dispatchEvent(new Event('focus'));
  for(const code of ['Enter','KeyR','Escape','Space','KeyX'])key(code);
  assert(current().encounter.outcome==='success'&&current().encounter.trial===expected,'Combat keys cannot skip the defeat or restart early');
  for(let i=0;i<(midFall?15:90);i++)host().step(1/60);
  const after=current().encounter;
  assert(JSON.stringify({hero:after.hero,guards:after.guards,time:after.time})===before,'Defeat presentation cannot advance combat or damage');
  assert(document.getElementById('battle-result-dialog').open===!midFall,'Report waits for the complete fall and hold');
  assert(current().progress.wins.includes(expected),'Victory is saved for '+expected);assert(current().clock===0,'No war time during training');return {...capture(),fight:{hp:s.hero.hp,time:s.time,trial:s.trial}};
}
export async function lesson(){if(current().dialogue)click('arrival-explore');host().visit({x:-1,z:18});key('KeyF');assert(document.getElementById('stillroom-conversation').textContent.includes('UGUTH'),'Uguth teaches');click('arrival-train');assert(current().encounter.briefing,'Opening lesson explains controls before combat');return capture();}
export async function guard(){
  window.dispatchEvent(new Event('focus'));click('combat-trial-start');key('KeyT');host().hold('KeyF',true);
  for(let i=0;i<360;i++)host().step(1/60);
  const h=current().encounter.hero;assert(h.blocking&&h.hp>90&&h.hp<100,'Staff guard reduces a real incoming goblin hit');host().hold('KeyF',false);host().step(1/60);
  return capture();
}
export async function goblin(){return complete('bramble-goblin',true);}
export async function goblinFallen(){
  window.dispatchEvent(new Event('focus'));for(let i=0;i<42;i++)host().step(1/60);
  assert(current().encounter.presentation.resultElapsed>.9&&!document.getElementById('battle-result-dialog').open,'Settled opponent remains visible before the prompt');return capture();
}
export async function goblinReport(){
  window.dispatchEvent(new Event('focus'));for(let i=0;i<30;i++)host().step(1/60);
  assert(document.getElementById('battle-result-dialog').open,'Next-round prompt opens after the defeat beat');return capture();
}
export async function wolf(){click('world-skirmish-continue');return complete('wolf');}
export async function save(){
  assert(host().save(),'Checkpoint saves');const saved=JSON.parse(window.azhoraExplorationStorage.getItem(ARRIVAL_KEY));assert(saved.wins.length===2&&!saved.approved,'Two wins are durable without unlocking the portal');return capture();
}
export async function continued(){
  await wait(()=>!document.querySelector('[data-continue-mode="war"]').disabled);document.querySelector('[data-continue-mode="war"]').click();await wait(()=>!!host());
  assert(current().progress.wins.length===2&&!current().progress.approved,'Continue restores the preparation checkpoint');
  window.dispatchEvent(new Event('focus'));host().visit({x:-1,z:18});key('KeyF');assert(current().dialogue,'Uguth available after resume');return capture();
}
export async function bandit(){click('arrival-train');return complete('bandit');}
export async function failed(){
  click('arrival-train');window.dispatchEvent(new Event('focus'));click('combat-trial-start');
  for(let i=0;i<7200&&!current().encounter.outcome;i++)host().step(1/60);
  assert(current().encounter.outcome==='defeat','An idle player can lose preparation');assert(current().progress.wins.length===2&&!current().progress.approved,'Defeat gives no progress and does not unlock the door');
  for(let i=0;i<90;i++)host().step(1/60);
  assert(document.getElementById('battle-result-dialog').open,'Player fall also precedes the retry prompt');
  click('world-skirmish-retry');assert(current().encounter.hero.hp===100&&host().sorcery.state().mana===100,'Retry replenishes health and mana');
  click('combat-trial-leave');host().visit({x:-1,z:18});key('KeyF');return capture();
}
export async function militia(){click('world-skirmish-continue');return complete('militiaman');}
export async function approval(){
  assert(current().progress.approved&&!current().progress.skipped,'Four real victories earn approval');
  assert(['world-skirmish-continue','arrival-continue-training','world-skirmish-leave'].every(id=>document.getElementById(id)&&!document.getElementById(id).hidden),'Three choices immediately after the fourth victory');return capture();
}
export async function advanced(){
  click('arrival-continue-training');assert(current().encounter.trial===ARRIVAL_TRIALS[4].id,'Continuing reaches the first optional trial');assert(current().encounter.hero.hp===100&&host().sorcery.state().mana===100,'Full health and mana in optional trial');
  click('combat-trial-leave');assert(!current().encounter&&current().progress.approved,'Leaving optional training retains approval');return capture();
}
export async function portal(){
  if(current().dialogue)click('arrival-explore');window.dispatchEvent(new Event('focus'));host().visit({x:0,z:38.5});key('KeyF');
  assert(document.getElementById('arrival-depart'),'Approved door opens through interaction');
  const progress=current().progress;click('arrival-depart');await frames();return {progress};
}
export async function tower(){
  const a=window.__EXPLORATION__;assert(a&&a.tower,'Portal leads to existing campaign tower');
  const state=a.tower.state();assert(state.location==='tower'&&!state.briefed,'Existing Taleth explanation and allegiance choice remain ahead');
  assert(!window.__STILLROOM__,'Arrival renderer and controls disposed');assert(a.war.state().clock.elapsedSeconds===0||a.war.clock?.().elapsedSeconds===0,'Adventure begins at zero');
  const saved=a.store.read();assert(saved.ok&&saved.data,'New tower arrival has a campaign checkpoint');assert(window.azhoraExplorationStorage.getItem(ARRIVAL_KEY)==='null','Prologue checkpoint cleared after safe handoff');
  return {tower:state.location,briefed:state.briefed,clock:a.war.state().clock,render:a.renderStats()};
}
export async function skip(){
  if(document.getElementById('arrival-handoff'))click('arrival-handoff');window.dispatchEvent(new Event('focus'));host().visit({x:-1,z:18});key('KeyF');
  document.querySelector('#stillroom-conversation details').open=true;click('arrival-skip');
  assert(current().progress.skipped&&current().progress.approved&&current().progress.wins.length===0,'Explicit skip unlocks without invented victories');return capture();
}

export async function returnDoor(){
  const a=window.__EXPLORATION__;window.dispatchEvent(new Event('focus'));
  assert(Math.hypot(a.snapshot().position.x-STILLROOM_ARRIVAL.x,a.snapshot().position.z-STILLROOM_ARRIVAL.z)<.1,'First arrival emerges from matching tower door');
  const before=JSON.stringify(a.war.state().campaign),clock=a.war.clock().elapsedSeconds;
  await a.visit(STILLROOM_ARRIVAL);key('KeyF');await wait(()=>!!a.training&&!!host());
  assert(current().returnVisit&&current().talethGone,'Return visits retain Uguth, not a duplicate Taleth');
  for(let i=0;i<180;i++)a.step(1/60,0);
  assert(JSON.stringify(a.war.state().campaign)===before&&a.war.clock().elapsedSeconds===clock,'Return training holds campaign state and time');
  host().visit({x:-1,z:18});key('KeyF');assert(document.getElementById('stillroom-conversation').textContent.includes('UGUTH'),'Returning player speaks to Uguth');
  click('arrival-train');assert(current().encounter&&current().encounter.hero.hp===100,'Return visit can start a real trial');
  assert(document.querySelectorAll('#teresod-sorcery').length===1,'Training owns one active spell panel');
  click('combat-trial-leave');host().visit({x:0,z:38.5});key('KeyF');click('arrival-depart');
  assert(!a.training&&!host()&&a.state().mode==='playing','Door returns to retained world');
  assert(JSON.stringify(a.war.state().campaign)===before&&a.war.clock().elapsedSeconds===clock,'Round trip preserves campaign');
  assert(Math.hypot(a.snapshot().position.x-STILLROOM_ARRIVAL.x,a.snapshot().position.z-STILLROOM_ARRIVAL.z)<.1,'Return comes out of matching threshold');
  a.look({yaw:Math.PI/2,pitch:.2,distance:6});a.step(0,0);
  return {clock,position:a.snapshot().position,render:a.renderStats()};
}
export async function bird(){
  const a=window.__EXPLORATION__;window.dispatchEvent(new Event('focus'));
  await a.visit({x:TOWER.x+4.6,y:TOWER.y,z:TOWER.z+5});a.step(.01,0);
  const first=a.testWorld.state().guild.floors.find(f=>f.id==='taleth').bird.position;
  let moved=false;for(let i=0;i<190;i++){a.step(.1,0);const at=a.testWorld.state().guild.floors.find(f=>f.id==='taleth').bird.position;if(Math.hypot(at[0]-first[0],at[1]-first[1],at[2]-first[2])>.05)moved=true;}
  assert(moved,'Taleth owl occasionally hops on its perch');
  const time=a.war.clock().elapsedSeconds;assert(!document.getElementById('bird-observe').hidden,'Bird observation button available');
  click('bird-observe');assert(a.birding.state().species.includes('barn-owl'),'Observation adds barn owl');
  assert(JSON.parse(window.azhoraExplorationStorage.getItem(BIRD_LIFE_KEY)).species.includes('barn-owl'),'Life list saves through durable desktop bridge');
  key('Escape');await frames();key('KeyJ');assert(document.getElementById('birding-dialog').open,'J reopens life list');
  assert(a.war.clock().elapsedSeconds===time,'Observing bird never advances campaign in tower');
  return {bird:a.birding.state(),clock:time,render:a.renderStats()};
}
async function openingBattles(side){
  const a=window.__EXPLORATION__;window.dispatchEvent(new Event('focus'));if(document.getElementById('birding-dialog')?.open){key('Escape');await frames();}
  await a.visit({x:TALETH_SPOT.x+1,y:TOWER.y,z:TALETH_SPOT.z+2});key('KeyF');click('tower-allegiance-'+side);click('tower-next');
  await a.visit({...TOWER_DOOR,y:TOWER.y,z:TOWER_DOOR.z-1});key('KeyF');await wait(()=>!a.tower.state().inside&&a.state().mode==='playing');
  a.war.pause();a.step(.01,0);
  const battles=a.war.state().campaign.engagements.filter(b=>b.status==='active');
  assert(battles.length===1&&battles[0].region==='caricas'&&battles[0].started===0,'Caricas begins on departure');
  const names=a.war.minimapEvents().filter(e=>e.kind==='battle').map(e=>e.label);assert(names.some(n=>n.includes('Caricas'))&&!names.some(n=>n.includes('Ovesos')),'Only the active battle is on the minimap');
  assert(!document.getElementById('opening-fronts'),'No competing opening quest cards');
  assert(document.getElementById('world-war-objective-title').textContent.includes(side==='west'?'Take Caricas':'Defend Caricas'),'Main recommendation reflects chosen side');
  assert(a.war.state().opportunity.region==='caricas','Taleth recommends Caricas first');
  assert(a.war.state().clock.elapsedSeconds<2,'Opening does not skip campaign time');
  const saved=a.save();assert(saved.ok,'Opening battles save normally');
  return {side,battles:battles.map(b=>({region:b.region,attacker:b.attacker,started:b.started})),markers:names,clock:a.war.clock(),render:a.renderStats()};
}
export const openingWest=()=>openingBattles('west');
export const openingEast=()=>openingBattles('east');
