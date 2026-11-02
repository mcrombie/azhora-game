import {driveWorldEncounter,clearCombatKeys} from './encounter-controls.js';
import {encounterAttack} from '../../gameplay/combat/encounter-attacks.js';
import {ENCOUNTER_TIMING as T} from '../../gameplay/combat/encounter-timing.js';
const assert=(v,m)=>{if(!v)throw Error(m);return m;};
const frame=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
const fight=a=>a.practice.state().encounter;
async function start(a,exercise,tempo){
  window.dispatchEvent(new Event('focus'));clearCombatKeys(a);a.practice.finish();
  const select=document.getElementById('combat-tempo');select.value=tempo;select.dispatchEvent(new Event('change'));
  document.querySelector(`[data-combat-exercise="${exercise}"]`).click();
  const until=performance.now()+10000;while((a.state().mode!=='skirmish'||!fight(a))&&performance.now()<until)await frame();
  assert(fight(a)?.tempo===tempo,'Menu passes selected tempo to the encounter');a.look({yaw:0,pitch:.36,distance:9});
}
async function capture(a){window.dispatchEvent(new Event('blur'));await frame();assert(!a.state().frameErrors.length,'No renderer errors');}
export async function warning(a){
  assert(document.getElementById('combat-tempo').value==='matched','Fresh Combat Testing defaults to matched swing speed');
  await start(a,'lesson','matched');
  for(let i=0;i<600&&fight(a).guards[0].phase!=='windup';i++)a.step(1/60);
  const s=fight(a),g=s.guards[0],attack=encounterAttack(g);assert(g.phase==='windup','Enemy begins a real fast windup');
  assert(attack.windup+attack.contact===T.contact&&attack.windup+attack.strike===T.swing,'Enemy matches the player motion/contact clock');
  assert(a.state().combatCues.some(c=>c.kind==='edge'&&c.visible),'Warning footprint still visible');
  assert(a.state().combatCues.some(c=>c.kind==='label'&&c.cue==='warning'),'Timing label follows fast windup');
  await capture(a);return {checks:['Matched speed selected by default','NPC motion/contact matches player','Fast windup retains its footprint and timing cue'],attack,guard:g};
}
export async function opening(a){
  window.dispatchEvent(new Event('focus'));
  for(let i=0;i<1500&&!fight(a).guards.some(g=>g.open)&&!fight(a).outcome;i++){driveWorldEncounter(a,fight(a));a.hold('KeyX',false);a.step(1/60);}
  clearCombatKeys(a);assert(fight(a).guards.some(g=>g.open),'Fast strike can be dodged into a counter opening');
  assert(a.state().combatCues.some(c=>c.kind==='opening'&&c.visible&&c.remaining>0),'Counter ring follows actual remaining time');
  const before=fight(a);await capture(a);for(let i=0;i<30;i++)a.step(1/60);assert(fight(a).time===before.time,'Inactive window freezes fast combat');
  return {checks:['Ordinary dodge produces a visible counter opening','Inactive window freezes fast combat'],hero:before.hero};
}
export async function comparison(a){
  const results=[];const world=a.testWorld;
  for(const tempo of ['classic','matched'])for(const exercise of ['lesson','advanced','squad','allied','solo-assault']){
    await start(a,exercise,tempo);a.practice.retry();assert(fight(a).tempo===tempo,'Retry keeps the selected tempo');
    for(const g of [...fight(a).guards,...(fight(a).allies??[])])assert(g.tempo===tempo,'All combatants share the selected tempo');
    for(let i=0;i<7300&&!fight(a).outcome;i++){driveWorldEncounter(a,fight(a));a.step(1/60);}
    clearCombatKeys(a);const s=fight(a);
    assert(s.outcome,'Exercise completes without hanging');if(exercise==='lesson'||exercise==='advanced')assert(s.outcome==='success','Single enemy remains winnable: '+tempo+'/'+exercise);
    results.push({tempo,exercise,outcome:s.outcome,hp:s.hero.hp,seconds:+s.time.toFixed(2),counters:s.skill.dodgeCounters,alliesLost:s.squad?.alliesLost??null});
    assert(a.state().mode==='skirmish','Result remains reviewable');
    document.getElementById('world-skirmish-continue').click();assert(a.state().mode==='combat-menu','Result returns to exercise selection');
    assert(!a.state().combatCues.length,'Exit disposes all warning/timing cues');
  }
  assert(a.testWorld===world,'Comparisons reuse the loaded camp');assert(!a.save().ok,'Experiment cannot write campaign saves');
  await start(a,'lesson','matched');a.hold('KeyX',true);
  for(let i=0;i<2000&&!fight(a).outcome;i++)a.step(1/60);clearCombatKeys(a);
  assert(fight(a).outcome==='defeat','Standing attack spam loses at matched speed');
  await capture(a);return {checks:['Both tempos run all five exercises to a result','Single-enemy matched lessons remain winnable','Retries retain tempo for enemies and allies','Camp is reused, cues disposed and campaign saves inaccessible','Standing attack spam still loses'],results};
}
export async function menu(a){
  window.dispatchEvent(new Event('focus'));a.practice.finish();const select=document.getElementById('combat-tempo');select.value='matched';select.dispatchEvent(new Event('change'));await frame();
  assert(!document.getElementById('combat-testing-menu').hidden,'Experiment menu visible');assert(!a.state().frameErrors.length,'No errors during tempo switching');
  return {checks:['Demo menu ready with matched swing speed selected','No renderer errors during comparisons']};
}
