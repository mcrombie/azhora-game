import {begin,introduction,refuge,portal,tower} from './stillroom-arrival-smoke.js';
import {driveWorldEncounter,clearCombatKeys} from './encounter-controls.js';
import {TOWER,TALETH_SPOT} from '../../app/exploration/tower-state.js';
import {COMBAT_TRIALS} from '../../gameplay/combat/combat-trials.js';
export {begin,introduction,refuge,portal};
const assert=(c,m)=>{if(!c)throw Error(m);};
const host=()=>window.__STILLROOM__,current=()=>host().state();
const click=id=>{const b=document.getElementById(id);assert(b&&!b.disabled,'Missing action '+id);b.click();};
const key=code=>{document.dispatchEvent(new KeyboardEvent('keydown',{code,bubbles:true}));document.dispatchEvent(new KeyboardEvent('keyup',{code,bubbles:true}));};
const frames=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
const focus=()=>window.dispatchEvent(new Event('focus'));
function talk(){focus();host().visit({x:-1,z:18});key('KeyF');}
function capture(){window.dispatchEvent(new Event('blur'));return {progress:current().progress,activity:current().activity,round:current().round,fight:current().encounter?{outcome:current().encounter.outcome,hp:current().encounter.hero.hp,time:current().encounter.time,opponent:current().encounter.trial,lesson:current().encounter.tutorial}:null};}
function finish(kind){
  focus();if(current().encounter.briefing){click('combat-trial-start');key('KeyT');}
  for(let i=0;i<18000&&!current().encounter.outcome;i++){
    const s=current().encounter;
    if(kind==='block')host().hold('KeyF',true);
    else if(kind==='fireball'){if(i%60===1)key('KeyQ');}
    else driveWorldEncounter(host(),s);
    host().step(1/60);
  }
  clearCombatKeys(host());host().hold('KeyF',false);
  const s=current().encounter;assert(s.outcome==='success',kind+' must complete through normal controls: '+JSON.stringify({hp:s.hero.hp,tutorial:s.tutorial,hero:s.hero,guard:s.guards[0]}));
  if(s.tutorial)assert(s.tutorial.complete,'Technique demonstrated');
  for(let i=0;i<90;i++)host().step(1/60);assert(document.getElementById('battle-result-dialog').open,'Report follows visible conclusion');
  return capture();
}
export async function activities(){talk();for(const id of ['arrival-train','arrival-challenge','arrival-duel'])assert(document.getElementById(id),'Three separate activities');return capture();}
export async function challenge(){
  click('arrival-challenge');document.getElementById('arrival-challenge-opponent').value=COMBAT_TRIALS.findIndex(t=>t.id==='bramble-goblin');click('arrival-challenge-start');
  const result=finish('challenge');assert(current().progress.wins.includes('bramble-goblin')&&!current().progress.approved&&current().progress.lessons.length===0,'Challenge cannot unlock tutorial');return result;
}
export async function uguthStance(){
  click('world-skirmish-leave');click('arrival-duel');focus();assert(current().encounter.guards[0].hp===1600,'Master endurance');assert(!host().testUguth.group.visible,'No duplicate Uguth at refuge');click('combat-trial-start');key('KeyT');host().step(1/60);host().look({yaw:.1,pitch:.2,distance:6});return capture();
}
export async function uguth(){
  focus();for(let i=0;i<3600&&!current().encounter.outcome;i++){driveWorldEncounter(host(),current().encounter);host().step(1/60);}
  clearCombatKeys(host());assert(current().encounter.outcome==='defeat','Master defeats the ordinary challenge fighter');for(let i=0;i<90;i++)host().step(1/60);
  assert(!current().progress.approved,'Optional duel does not change gate');return capture();
}
export async function retry(){click('world-skirmish-retry');assert(current().encounter.hero.hp===100&&host().sorcery.state().mana===100,'Retry restores player');assert(current().encounter.guards[0].hp===1600,'Retry restores master');click('combat-trial-leave');assert(host().testUguth.group.visible,'Instructor returns after duel');talk();return capture();}
export async function staff(){click('arrival-train');return finish('staff');}
export async function block(){click('world-skirmish-continue');return finish('block');}
export async function dodge(){click('world-skirmish-continue');return finish('dodge');}
export async function fireball(){click('world-skirmish-continue');return finish('fireball');}
export async function militia(){click('world-skirmish-continue');const result=finish('militia');assert(current().progress.approved&&current().progress.lessons.length===5,'Final militia unlocks Azhora');assert(current().progress.wins.length===1,'Tutorial awards no challenge wins');return result;}
export async function handoff(){click('world-skirmish-continue');host().step(0);assert(document.querySelector('.arrival-task').textContent.includes('Speak with Taleth'),'Next quest names Taleth before leaving');return capture();}
export async function taleth(){
  await tower();const a=window.__EXPLORATION__;focus();await a.visit({x:TALETH_SPOT.x,y:TOWER.y,z:TALETH_SPOT.z+5});a.look({yaw:0,pitch:.24,distance:7});a.step(.01,0);await frames();
  assert(!document.getElementById('tower-main-quest').hidden,'Left quest card after training');assert(!document.getElementById('taleth-main-quest-marker').hidden,'Taleth overhead marker visible');
  const rect=document.getElementById('taleth-main-quest-marker').getBoundingClientRect();assert(rect.top>0&&rect.bottom<innerHeight,'Marker stays on screen');
  assert(!a.state().frameErrors?.length,'No frame errors');window.dispatchEvent(new Event('blur'));return {quest:document.getElementById('tower-main-quest').textContent,marker:rect.toJSON()};
}
export async function returnVisit(){
  const a=window.__EXPLORATION__;focus();await a.visit((await import('../../app/exploration/training/stillroom-door.js')).STILLROOM_ARRIVAL);key('KeyF');
  for(let i=0;i<300&&!host();i++)await frames();assert(host(),'Return to Uguth');assert(current().progress.lessons.length===5&&current().progress.wins.length===1,'Both progress records survive world handoff');assert(document.getElementById('tower-main-quest').hidden,'Tower quest hides during training');
  talk();assert(document.getElementById('arrival-train')&&document.getElementById('arrival-duel')&&document.getElementById('arrival-challenge'),'All activities remain available');
  click('arrival-challenge');document.getElementById('arrival-challenge-opponent').value=COMBAT_TRIALS.length-1;click('arrival-challenge-start');assert(current().encounter.trial===COMBAT_TRIALS.at(-1).id,'Can skip to last challenge');click('combat-trial-leave');
  host().visit({x:0,z:38.5});key('KeyF');click('arrival-depart');assert(!host()&&a.state().mode==='playing','Returns to retained tower');
  await a.visit({x:TALETH_SPOT.x+1,y:TOWER.y,z:TALETH_SPOT.z+2});key('KeyF');click('tower-allegiance-west');click('tower-next');a.step(.01,0);await frames();
  assert(document.getElementById('tower-main-quest').hidden&&document.getElementById('taleth-main-quest-marker').hidden,'Taleth quest clears after mission briefing');
  return {tower:a.tower.state(),frameErrors:a.state().frameErrors??[],clock:a.war.clock().elapsedSeconds};
}
