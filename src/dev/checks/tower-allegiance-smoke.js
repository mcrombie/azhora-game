import {TOWER_SPAWN,TOWER_DOOR,TALETH_SPOT,TOWER_EXIT} from '../../app/exploration/tower-state.js';
import {validateWorldWarSave} from '../../app/exploration/war-checkpoint.js';

// Isolated native profile: launch through the actual menu, then use ordinary
// movement, conversation buttons, doorway interaction, and save/Continue.
const checks=[];
const $=id=>document.getElementById(id);
const assert=(ok,label)=>{if(!ok)throw Error(label);checks.push(label);console.log('EXPLORATION_CHECK '+label);};
const frame=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
const key=code=>{for(const type of ['keydown','keyup'])document.dispatchEvent(new KeyboardEvent(type,{code,bubbles:true,cancelable:true}));};
const click=id=>{assert($(id)&&!$(id).hidden&&!$(id).disabled,'Available tower control: '+id);$(id).click();};
const side=a=>a.war.state().campaignSide;
const refresh=a=>a.step(0);
const time=a=>{const c=a.war.clock();return JSON.stringify({day:a.war.state().campaign.day,fraction:c.fraction,elapsedSeconds:c.elapsedSeconds,hour:a.dayNight?.state().hour});};
const tick=a=>{for(let i=0;i<100;i++)a.step(.04);};
let undecided,west;

async function until(test,label,timeout=300000){const end=performance.now()+timeout;while(!test()&&performance.now()<end)await new Promise(resolve=>setTimeout(resolve,50));assert(test(),label);}
async function talk(a){await a.visit({x:TALETH_SPOT.x,z:TALETH_SPOT.z+2});key('KeyF');assert(a.state().mode==='briefing'&&!$('tower-briefing').hidden,'F talks to Taleth in the live tower');await frame();}
function save(a,label){assert(a.save().ok,label+' saves normally');const value=structuredClone(a.store.read().data);assert(validateWorldWarSave(value,value.format),label+' passes checkpoint validation');return value;}
async function restore(a,value){assert(a.store.save(structuredClone(value)).ok,'Isolated checkpoint is accepted');await a.loadSaved();a.resume();window.dispatchEvent(new Event('focus'));refresh(a);}
function held(a,label){const before=time(a);tick(a);assert(time(a)===before,label+' preserves campaign time and sky');}

export function menu(mode='war'){
  assert(!$('start-screen').hidden,'Main menu is available before the new journey');
  const button=document.querySelector(`[data-start-mode="${mode}"]`);assert(button,'Normal '+mode+' launch button exists');button.click();
  assert($('campaign-allegiance-menu').hidden,'New journey does not show a pregame allegiance screen');
  return {checks:[...checks],mode};
}

export async function explore(a){
  window.dispatchEvent(new Event('focus'));refresh(a);
  assert(a.state().mode==='playing'&&a.tower.state().inside&&!a.tower.state().briefed,'New game gives control inside the unbriefed tower');
  assert(!side(a),'New tower game has no selected campaign side');
  assert(!a.tower.state().exteriorLoaded,'Exploration of the chamber does not load the outdoor regions');
  assert($('tower-briefing').hidden,'Taleth does not force a conversation on arrival');
  const before=a.state().position;
  a.hold('KeyA',true);for(let i=0;i<15;i++)a.step(.04);a.hold('KeyA',false);
  assert(Math.hypot(a.state().position[0]-before[0],a.state().position[2]-before[2])>.5,'Ordinary walking works before choosing a league');held(a,'Exploring before the decision');
  a.war.run();a.war.advance(10);held(a,'Campaign controls before the decision');
  assert(a.war.state().campaign.day===0,'Campaign controls cannot advance the unstarted war');
  assert(!a.selectMount('dragon').ok,'Developer mount cannot bypass the unfinished introduction');
  assert(!await a.travelToRegion(13),'Developer travel cannot bypass the unfinished introduction');
  await a.visit({...TOWER_DOOR,z:TOWER_DOOR.z-1});key('KeyF');refresh(a);
  assert(a.state().mode==='playing'&&a.tower.state().inside&&!a.tower.state().exteriorLoaded,'The physical exit stays closed before the decision');
  await a.visit(TOWER_SPAWN);undecided=save(a,'Undecided tower');
  assert(!undecided.campaignSide,'Undecided save contains no accidental allegiance');
  await a.loadSaved();refresh(a);assert(!side(a)&&a.tower.state().inside&&!a.tower.state().briefed,'Continue restores the undecided tower');
  await talk(a);
  assert(!$('tower-allegiance-west').hidden&&!$('tower-allegiance-east').hidden,'Taleth presents both leagues inside his conversation');
  assert($('tower-next').disabled,'Taleth waits for an explicit choice');
  click('tower-allegiance-west');assert(!side(a)&&!a.tower.state().briefed,'Selecting a league alone is only a tentative choice');
  click('tower-close');assert(a.state().mode==='playing'&&!side(a)&&!a.tower.state().briefed,'Explore the tower postpones the decision without committing');
  await a.visit(TOWER_SPAWN);held(a,'Postponing the decision');await frame();
  return {checks:[...checks],state:a.tower.state(),side:side(a),readyMs:a.state().readyMs};
}

export async function history(a){
  await restore(a,undecided);
  await talk(a);
  if($('tower-background').hidden){
    assert(a.state().launch==='food-world','Only the separate food fixture omits the historical prelude');
    assert($('tower-next').disabled&&!side(a),'Food-world introduction still requires an explicit choice');
    return {checks:[...checks],history:'No historical prelude in this scenario'};
  }
  click('tower-background');assert(a.state().mode==='chronicle','The Chronoscope is available before allegiance');held(a,'Reading the history');
  click('chronicle-start');await frame();
  assert(a.state().mode==='briefing'&&!$('tower-briefing').hidden&&!side(a)&&!a.tower.state().briefed,'Leaving the history returns to Taleth without choosing or starting the war');
  assert($('tower-next').disabled,'The returned conversation still requires an explicit league selection');
  return {checks:[...checks],topic:$('tower-topic').textContent};
}

export async function westChoice(a){
  click('tower-allegiance-west');assert(/West Lizeem/.test($('tower-next').textContent),'Confirmation names the selected West Lizeem cause');
  click('tower-next');refresh(a);
  assert(side(a)==='west'&&a.tower.state().briefed&&a.state().mode==='playing','Confirming with Taleth starts the West campaign and returns control');
  assert(a.tower.state().inside,'Choosing a side does not teleport out of the tower');held(a,'The tower after committing West');
  west=save(a,'West tower');assert(west.campaignSide==='west','The chosen West side is saved');
  await a.loadSaved();refresh(a);assert(side(a)==='west'&&a.tower.state().briefed,'Continue preserves the chosen West campaign');
  await talk(a);assert($('tower-allegiance-west').hidden&&$('tower-allegiance-east').hidden,'A later conversation does not ask the committed player to choose again');click('tower-close');
  await restore(a,undecided);assert(!side(a)&&!a.tower.state().briefed,'Loading a predecision save clears the later West commitment');
  await a.visit({...TOWER_DOOR,z:TOWER_DOOR.z-1});key('KeyF');assert(a.tower.state().inside&&!a.tower.state().briefed,'Restored predecision save locks the door again');
  await talk(a);return {checks:[...checks],state:a.tower.state(),side:side(a)};
}

export async function eastChoice(a){
  click('tower-allegiance-east');assert(/East Lizeem/.test($('tower-next').textContent),'Confirmation names the selected East Lizeem cause');click('tower-next');refresh(a);
  assert(side(a)==='east'&&a.tower.state().briefed&&a.state().mode==='playing','Confirming with Taleth starts the East campaign');held(a,'The tower after committing East');
  const east=save(a,'East tower');assert(east.campaignSide==='east','The chosen East side is saved');await a.loadSaved();refresh(a);
  assert(side(a)==='east'&&a.tower.state().briefed,'Continue preserves the chosen East campaign');
  await restore(a,west);assert(side(a)==='west'&&a.tower.state().briefed,'An existing chosen save retains its original side when loaded');
  await restore(a,east);assert(!a.state().frameErrors.length,'Tower choice, history and save changes have no renderer errors');
  await a.visit(TOWER_SPAWN);await frame();return {checks:[...checks],side:side(a),state:a.tower.state(),render:a.renderStats()};
}

export async function exterior(a){
  await a.visit({...TOWER_DOOR,z:TOWER_DOOR.z-1});key('KeyF');
  await until(()=>a.state().mode==='playing'&&!a.tower.state().inside,'After committing, the same physical door reaches Minora');
  assert(a.tower.state().exteriorLoaded&&Math.hypot(a.state().position[0]-TOWER_EXIT.x,a.state().position[2]-TOWER_EXIT.z)<1,'The player emerges at the actual tower entrance');
  assert(side(a)==='east','Leaving keeps the selected East allegiance');
  const before=time(a);a.hold('KeyS',true);for(let i=0;i<25;i++)a.step(.04);a.hold('KeyS',false);tick(a);
  assert(time(a)!==before,'Campaign time resumes outside after movement');
  assert(!a.state().frameErrors.length,'The unlocked departure has no renderer errors');await frame();
  return {checks:[...checks],side:side(a),clock:a.war.clock(),position:a.state().position};
}
