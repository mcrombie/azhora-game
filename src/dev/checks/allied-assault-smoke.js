import {driveWorldEncounter,clearCombatKeys} from './encounter-controls.js';
import {validateWorldWarSave} from '../../app/exploration/war-checkpoint.js';
import {createWorldWar} from '../../app/exploration/world-war.js';
import {prepareWarExterior} from './tower-smoke.js';
import {setup as prepareRally} from './afterlife-smoke.js';
const checks=[];
const assert=(value,label)=>{if(!value)throw Error(label);checks.push(label);console.log('EXPLORATION_CHECK '+label);};
const frames=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
const fight=a=>a.practice.state().encounter;
async function exercise(a,id){window.dispatchEvent(new Event('focus'));a.practice.finish();document.querySelector(`[data-combat-exercise="${id}"]`).click();for(let n=0;n<100&&!fight(a);n++)await frames();assert(fight(a),'Assault practice starts');a.look({yaw:0,pitch:.4,distance:15});window.dispatchEvent(new Event('blur'));await frames();}
function renderCost(a){const samples=Array.from({length:24},()=>a.renderStats()),cpu=samples.map(s=>s.cpuMs).sort((a,b)=>a-b);return {...samples.at(-1),medianCpuMs:cpu[12],p95CpuMs:cpu[22]};}
export async function solo(a){
  await exercise(a,'solo-assault');assert(fight(a).guards.length===4&&!fight(a).allies,'Solo comparison has four enemies and no allies');
  return {checks:[...checks],render:renderCost(a),staging:fight(a).staging};
}
export async function formation(a){
  await exercise(a,'allied');const s=fight(a);assert(s.allies.length===3&&s.guards.length===4,'Allied practice stages three allies and four enemies');
  assert(a.state().fieldActors.length===7,'Exactly seven temporary soldiers are rendered');
  assert(document.getElementById('allied-assault-status').textContent.includes('Allies 3/3'),'Friendly status is readable without enemy targeting');
  return {checks:[...checks],render:renderCost(a),staging:s.staging,state:s};
}
export async function fighting(a){
  window.dispatchEvent(new Event('focus'));for(let i=0;i<240;i++)a.step(1/60);
  const s=fight(a);assert(s.allies.some(a=>a.hp<50)&&s.guards.some(g=>g.hp<50),'Both sides independently advance, attack and take damage');
  window.dispatchEvent(new Event('blur'));await frames();return {checks:[...checks],state:s};
}
export async function reaction(a){
  window.dispatchEvent(new Event('focus'));a.practice.retry();
  for(let i=0;i<2400&&!fight(a).outcome&&!fight(a).guards.some(g=>g.phase==='turn');i++){driveWorldEncounter(a,fight(a));a.step(1/60);}clearCombatKeys(a);
  const s=fight(a);assert(s.guards.some(g=>g.phase==='turn'&&g.targetId===-1),'Flank attacks produce a visible turn toward Teresod in the native scene');
  assert(a.state().combatCues.some(c=>c.visible&&c.cue==='attention'),'Turning warning is rendered on the reacting soldier');
  window.dispatchEvent(new Event('blur'));await frames();return {checks:[...checks],state:s};
}
export async function breaking(a){
  window.dispatchEvent(new Event('focus'));
  for(let i=0;i<2400&&!fight(a).outcome&&!fight(a).guards.some(g=>g.phase==='breaking');i++){driveWorldEncounter(a,fight(a));a.step(1/60);}clearCombatKeys(a);
  const s=fight(a);assert(s.guards.some(g=>g.phase==='breaking'&&g.routed&&g.hp>0),'Last survivor lowers their guard before visibly retreating');
  assert(document.getElementById('allied-assault-status').textContent.includes('Enemy line broken'),'Rout announces the transition to securing the field');
  window.dispatchEvent(new Event('blur'));await frames();return {checks:[...checks],state:s};
}
export async function result(a){
  window.dispatchEvent(new Event('focus'));a.practice.retry();
  for(let i=0;i<5401&&!fight(a).outcome;i++){driveWorldEncounter(a,fight(a));a.step(1/60);}clearCombatKeys(a);
  const s=fight(a);assert(s.outcome==='success','Allied practice is winnable with ordinary movement, dodge and strike controls');
  assert(s.squad.damageByAllies>0&&s.squad.damageByHero>0,'Both allied soldiers and Teresod contributed actual damage');
  assert(s.squad.routed===1&&s.guards.filter(g=>!g.hp).length===3,'Final survivor retreats and is not reported as killed');
  for(let i=0;i<180;i++)a.step(1/60);assert(fight(a).squad.regrouped,'Living allies regroup after victory');
  assert(document.getElementById('world-skirmish-result-detail').textContent.includes('allies survived'),'Result names survivors and contribution');
  window.dispatchEvent(new Event('blur'));await frames();return {checks:[...checks],state:fight(a)};
}
export async function passive(a){
  window.dispatchEvent(new Event('focus'));a.practice.retry();for(let i=0;i<5401&&!fight(a).outcome;i++)a.step(1/60);
  assert(fight(a).outcome==='defeat'&&fight(a).squad.alliesLost===3,'Remaining passive does not let allies win the battle alone');
  a.practice.finish();assert(!document.getElementById('allied-assault-status')&&!a.state().fieldActors.length,'Leaving removes allied rigs and status');
  assert(!a.save().ok&&a.store.read().data===null,'Allied practice never writes campaign or adventure saves');
  assert(!a.state().frameErrors.length,'Allied practice and disposal have no frame errors');return {checks:[...checks]};
}
export async function disposal(a){
  await exercise(a,'allied');a.renderStats();const initial=a.renderStats().geometries;
  for(let n=0;n<4;n++){a.practice.retry();a.renderStats();}
  const final=a.renderStats().geometries;assert(final===initial,`Retrying allied practice releases old geometry (${initial} before / ${final} after)`);
  assert(document.querySelectorAll('#allied-assault-status').length===1,'Retry keeps one allied status panel');
  a.practice.finish();return {checks:[...checks],geometriesDuringFight:initial,geometriesAfterLeaving:a.renderStats().geometries};
}
const warFight=a=>a.war.state().encounter.encounter;
export async function rout(a){
  await prepareWarExterior(a);await prepareRally(a);document.getElementById('assault-with-allies').checked=true;await a.war.help('west');
  for(let i=0;i<5401&&a.state().mode==='skirmish'&&!warFight(a).outcome&&!warFight(a).guards.some(g=>g.routed);i++){driveWorldEncounter(a,warFight(a));a.step(1/60);}clearCombatKeys(a);
  const s=warFight(a);assert(s.guards.some(g=>g.routed&&g.hp>0),'Real Caricas final assault reaches a living enemy rout with ordinary inputs');
  const yaw=Math.atan2(s.hero.x-s.rally.x,s.hero.z-s.rally.z);a.look({yaw,pitch:.3,distance:12});
  a.hold('KeyS',true);for(let i=0;i<120;i++)a.step(1/60);clearCombatKeys(a);
  assert(!warFight(a).outcome&&Math.hypot(warFight(a).hero.x-s.rally.x,warFight(a).hero.z-s.rally.z)>3,'Player can leave the gold ring while the enemy retreats');
  assert(!document.getElementById('world-skirmish-rally-guide').hidden&&document.getElementById('world-skirmish-rally-guide').textContent.includes('Gold standard'),'Gold direction and distance remain visible after combat');
  assert(a.state().combatCues.some(c=>c.visible&&c.cue==='retreat'),'Routed soldier remains clearly labelled during evacuation');
  window.dispatchEvent(new Event('blur'));await frames();return {checks:[...checks],state:warFight(a)};
}
export async function evacuated(a){
  window.dispatchEvent(new Event('focus'));for(let i=0;i<2000&&!warFight(a).outcome;i++)a.step(1/60);
  const s=warFight(a),routed=s.guards.find(g=>g.routed);
  assert(routed.departed&&routed.phase==='escaped','Routed soldier finishes leaving the real field instead of freezing beside Teresod');
  assert(routed.retreatRetries===0&&routed.retreatElapsed<30,'Terrain route reaches its exit without needing the obstruction fallback');
  assert(!a.state().fieldActors.some(g=>g.visible&&Math.hypot(g.position[0]-routed.x,g.position[2]-routed.z)<.01),'Departed soldier is absent from the rendered scene');
  assert(!a.state().combatCues.some(c=>c.visible&&c.cue==='retreat'),'Departed soldier leaves no floating combat label');
  assert(s.squad.routed===1&&s.guards.filter(g=>!g.hp).length===3,'Evacuation preserves one survivor and exactly three kills');
  window.dispatchEvent(new Event('blur'));await frames();return {checks:[...checks],state:s};
}
export async function secure(a){
  window.dispatchEvent(new Event('focus'));
  for(let i=0;i<3000&&!warFight(a).outcome;i++){driveWorldEncounter(a,warFight(a));a.step(1/60);}clearCombatKeys(a);
  assert(warFight(a).outcome==='success','After watching the retreat, ordinary movement and holding the gold ring still wins');
  assert(document.getElementById('world-skirmish-rally-guide').hidden,'Victory removes capture guidance');
  document.getElementById('world-skirmish-continue').click();const s=a.war.state().campaign;
  assert(s.day===6&&s.regions.caricas.owner==='west','Second-round victory records West Lizeem control immediately on day six');
  assert(a.save().ok&&validateWorldWarSave(a.store.read().data),'Fixed assault still produces a valid isolated campaign save');
  assert(!a.state().frameErrors.length,'Retreat, capture and continuation produce no frame errors');
  window.dispatchEvent(new Event('blur'));await frames();return {checks:[...checks],campaign:s};
}
export async function campaign(a){
  await prepareWarExterior(a);await prepareRally(a);assert(!document.getElementById('assault-choice').hidden&&!document.getElementById('assault-with-allies').checked,'Final assault offers allies without changing the default solo choice');
  document.getElementById('assault-with-allies').checked=true;await a.war.help('west');assert(a.state().mode==='skirmish'&&warFight(a).allies.length===3,'Campaign checkbox starts three allied soldiers in the central field');
  for(let i=0;i<1400&&a.state().mode==='skirmish'&&!warFight(a).squad.alliesLost;i++)a.step(1/60);
  assert(a.state().mode==='skirmish'&&warFight(a).squad.alliesLost>0,'Actual allied AI produces a campaign casualty before withdrawal');
  const losses=warFight(a).squad.alliesLost,defeated=warFight(a).guards.filter(g=>!g.hp||g.routed).length;
  document.getElementById('world-skirmish-withdraw').click();const prior=a.war.state().campaign;
  assert(prior.day===4&&prior.engagements[0].rally.allied.lost===losses,'Withdrawal preserves friendly losses without advancing to battle end');
  assert(a.save().ok&&validateWorldWarSave(a.store.read().data),'Allied choice and partial losses save and validate through command replay');
  assert(a.war.join().ok,'Can return to the same unfinished battle');
  assert(document.getElementById('assault-with-allies').checked&&document.getElementById('assault-with-allies').disabled,'Re-entry retains the chosen variant');
  await a.war.help('west');assert(warFight(a).allies.length===3-losses&&warFight(a).guards.length===4-defeated,'Neither side receives replacement soldiers after re-entry');
  for(let i=0;i<5401&&a.state().mode==='skirmish'&&!warFight(a).outcome;i++){driveWorldEncounter(a,warFight(a));a.step(1/60);}clearCombatKeys(a);
  assert(a.state().mode==='skirmish'&&warFight(a).outcome==='success','Partially depleted allied campaign assault remains winnable');
  document.getElementById('world-skirmish-continue').click();const after=a.war.state().campaign;
  assert(after.day===6&&after.engagements[0].status==='resolved'&&after.regions.caricas.owner==='west','Continue immediately records the day-six territorial victory');
  assert(a.save().ok&&validateWorldWarSave(a.store.read().data),'Completed allied battle remains a valid isolated save');
  assert(!a.state().frameErrors.length,'Campaign allied integration has no frame errors');
  window.dispatchEvent(new Event('blur'));await frames();return {checks:[...checks],campaign:after};
}
export async function reaper(a){
  await prepareWarExterior(a);await prepareRally(a);document.getElementById('assault-with-allies').checked=true;await a.war.help('west');
  for(let i=0;i<5401&&a.state().mode==='skirmish';i++)a.step(1/60);
  for(let i=0;i<200&&(a.state().mode!=='limbo'||document.body.classList.contains('crossing-limbo'));i++)await frames();
  assert(a.state().mode==='limbo','Losing an allied fight enters the Reaper room');
  assert(createWorldWar(a.afterlife.snapshot().death.before).snapshot().pending.rally.style==='allied','Death checkpoint retains the allied choice');
  assert(a.save().ok&&validateWorldWarSave(a.store.read().data),'Allied death and rewind history validate in the isolated save');
  assert(await a.afterlife.choose('retry'),'Reaper can retry the allied assault');
  assert(a.state().mode==='skirmish'&&warFight(a).allies.length===3&&warFight(a).allies.every(a=>a.hp===50),'Retry restores the original three allies at full health');
  assert(a.war.state().campaign.day===4&&!a.war.state().campaign.events.some(e=>e.type==='rally-result'),'Retry removes failed-attempt casualties and restores the preceding day');
  assert(a.war.state().campaign.engagements[0].heroResult.objective.blocked===8,'Retry preserves the earlier interception');
  assert(!a.state().frameErrors.length,'Allied death and retry have no frame errors');
  window.dispatchEvent(new Event('blur'));await frames();return {checks:[...checks]};
}
