import {driveWorldEncounter,clearCombatKeys} from './encounter-controls.js';
const frame=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
const assert=(v,m)=>{if(!v)throw Error(m);};
const fight=a=>a.practice.state().encounter;
async function start(a,exercise='lesson'){
  window.dispatchEvent(new Event('focus'));clearCombatKeys(a);a.practice.finish();
  document.querySelector(`[data-combat-exercise="${exercise}"]`).click();
  const end=performance.now()+10000;
  while((a.state().mode!=='skirmish'||!fight(a))&&performance.now()<end)await frame();
  assert(fight(a)&&document.getElementById('combat-testing-menu').hidden,'Exercise button starts combat and hides selection');
  a.look({yaw:0,pitch:.36,distance:9});
}
function until(a,predicate,drive=false){
  for(let i=0;i<3600&&!predicate(fight(a))&&!fight(a).outcome;i++){
    if(drive){driveWorldEncounter(a,fight(a));a.hold('KeyX',false);}a.step(1/60);
  }
  clearCombatKeys(a);assert(predicate(fight(a)),'Expected combat cue before the encounter ended');
}
async function capture(a,checks){
  window.dispatchEvent(new Event('blur'));await frame();assert(!a.state().frameErrors.length,'No combat renderer errors');
  return {checks,hero:fight(a).hero,guards:fight(a).guards,cues:a.state().combatCues};
}
export async function thrust(a){
  await start(a);until(a,s=>s.guards.some(g=>g.phase==='windup'&&g.timer<.5));
  assert(a.state().combatCues.some(c=>c.kind==='edge'&&c.visible),'Thrust footprint has a visible outline');
  assert(a.state().combatCues.some(c=>c.kind==='label'&&c.cue==='warning'&&c.visible),'Attacking soldier has a timing label');
  return capture(a,['Thrust windup shows its actual footprint, outline and filling timing cue']);
}
export async function opening(a){
  await start(a);until(a,s=>s.guards.some(g=>g.phase==='recover'&&g.open&&g.timer<.8),true);
  assert(fight(a).hero.hp===100,'Ordinary sidestep avoids the thrust');
  assert(a.state().combatCues.some(c=>c.kind==='opening'&&c.visible&&c.remaining>0),'A missed strike exposes its counter ring');
  return capture(a,['Dodged thrust exposes a lowered guard and a draining counter opening']);
}
export async function sweep(a){
  await start(a,'advanced');until(a,s=>s.guards.some(g=>g.attack==='sweep'&&g.phase==='windup'&&g.timer<.65),true);
  return capture(a,['Advanced practice shows the distinct wide sweep warning']);
}
export async function hurt(a){
  await start(a);until(a,s=>s.hero.hp<100);
  assert(fight(a).hero.hp===80&&fight(a).hero.hitGrace>0,'One hit costs 20 health and starts brief protection');
  assert(a.state().combatCues.some(c=>c.kind==='protection'&&c.visible),'Damage protection has a visible ring');
  return capture(a,['A real enemy hit removes 20 health and shows the damage/protection cues']);
}
export async function comeback(a){
  window.dispatchEvent(new Event('focus'));
  for(let i=0;i<3600&&!fight(a).outcome;i++){driveWorldEncounter(a,fight(a));a.step(1/60);}clearCombatKeys(a);
  assert(fight(a).outcome==='success'&&fight(a).hero.hp>0,'Player can recover from the hit and win using ordinary inputs');
  a.practice.finish();assert(!a.state().combatCues.length,'Exercise exit disposes warning, timing and protection cues');
  return {checks:['Taking a hit still allows a successful dodge/counter comeback','Exercise exit disposes all added combat cues']};
}
export async function crowd(a){
  await start(a,'squad');until(a,s=>s.guards.some(g=>g.phase==='windup'&&g.timer<.5));
  const labels=a.state().combatCues.filter(c=>c.kind==='label'&&c.visible&&c.detailed);
  assert(labels.length===1&&labels[0].cue==='warning','Only the active threat gets the large timing label in a crowd');
  return capture(a,['Three-soldier fight prioritizes one active threat label and keeps other health bars compact']);
}
