import {COMBAT_TRIALS} from '../../gameplay/combat/combat-trials.js';
import {driveWorldEncounter,clearCombatKeys} from './encounter-controls.js';
const checks=[];
const assert=(v,m)=>{if(!v)throw Error(m);checks.push(m);};
const frame=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
const fight=a=>a.practice.state().encounter;
const press=code=>{document.dispatchEvent(new KeyboardEvent('keydown',{code,bubbles:true,cancelable:true}));document.dispatchEvent(new KeyboardEvent('keyup',{code,bubbles:true}));};
function stepUntil(a,condition,limit=1200){for(let i=0;i<limit&&!condition(fight(a));i++)a.step(1/60);assert(condition(fight(a)),'Expected combat state reached');}
async function start(a,round){
  window.dispatchEvent(new Event('focus'));clearCombatKeys(a);a.hold('KeyF',false);a.practice.finish();
  document.getElementById('trial-start-opponent').value=COMBAT_TRIALS[round].id;document.querySelector('[data-combat-exercise="trials"]').click();
  const end=performance.now()+45000;while((a.state().mode!=='skirmish'||!fight(a))&&performance.now()<end)await frame();
  assert(fight(a)?.trial===COMBAT_TRIALS[round].id&&fight(a).briefing,'Direct selection loads '+COMBAT_TRIALS[round].name);
  document.getElementById('combat-trial-start').click();a.look({yaw:Math.PI-.45,pitch:.28,distance:8});
}
async function capture(a){clearCombatKeys(a);a.hold('KeyF',false);window.dispatchEvent(new Event('blur'));await frame();assert(!a.state().frameErrors.length,'No renderer errors');return {checks:[...checks],fight:fight(a),render:a.renderStats()};}
export async function elf(a){
  await start(a,COMBAT_TRIALS.findIndex(t=>t.id==='elven-duelist'));stepUntil(a,s=>s.guards[0].attack==='elf-second'&&s.guards[0].phase==='windup');
  assert(!fight(a).guards[0].open,'The first blade offers no false counter cue');
  return capture(a);
}
export async function dwarf(a){
  await start(a,COMBAT_TRIALS.findIndex(t=>t.id==='dwarven-shieldwarden'));stepUntil(a,s=>s.guards[0].phase==='windup');
  const actor=a.testHero.group.parent.children.find(o=>o.userData.trialOpponent==='dwarven-shieldwarden');
  assert(actor.getObjectByName('Tower shield board')&&actor.getObjectByName('Forged war hammer'),'Shieldwarden has its actual armor, shield and hammer');
  return capture(a);
}
export async function mage(a){
  await start(a,COMBAT_TRIALS.findIndex(t=>t.id==='rogue-battlemage'));stepUntil(a,s=>s.projectiles.length===1);
  const root=a.testHero.group.parent.getObjectByName('Stillroom spell effects');assert(root.children.some(o=>o.userData.trialBolt&&o.visible),'Enemy bolt is rendered while traveling');
  const frozen=JSON.stringify(fight(a).projectiles);press('KeyH');for(let i=0;i<120;i++)a.step(1/60);
  assert(JSON.stringify(fight(a).projectiles)===frozen,'Help freezes enemy bolts without advancing them');press('Escape');
  return capture(a);
}
export async function troll(a){
  await start(a,COMBAT_TRIALS.findIndex(t=>t.id==='regenerating-troll'));a.step(1/60);press('KeyT');press('KeyQ');stepUntil(a,s=>s.guards[0].burnRemaining>0);
  assert(a.sorcery.state().mana===80&&fight(a).guards[0].hp===174,'A real staff-launched Fireball damages the troll and suppresses healing');
  const hp=fight(a).guards[0].hp;for(let i=0;i<180;i++){a.hold('KeyF',true);a.step(1/60);}
  assert(fight(a).guards[0].hp===hp&&fight(a).guards[0].burnRemaining>2,'Healing stays stopped after the impact effect ends');
  return capture(a);
}
export async function knight(a){
  await start(a,COMBAT_TRIALS.findIndex(t=>t.id==='undead-knight'));a.step(1/60);press('KeyT');press('KeyQ');
  stepUntil(a,()=>!a.sorcery.state().shots.length&&a.sorcery.state().cooldown===0);press('KeyQ');
  stepUntil(a,s=>s.guards[0].hp<=138);a.hold('KeyF',true);stepUntil(a,s=>s.guards[0].phase==='restore');
  assert(a.testHero.group.parent.getObjectByName('Knight restoration ritual').visible,'Restoration has visible violet bindings');
  return capture(a);
}
export async function interruptAndFinish(a){
  window.dispatchEvent(new Event('focus'));a.hold('KeyF',false);a.step(1/60);press('KeyQ');stepUntil(a,s=>s.guards[0].interruptions>0);
  assert(fight(a).guards[0].restorations===0,'Real Fireball interrupts restoration before it heals');
  // A fresh, full-health final opponent must also remain beatable without magic.
  press('KeyR');document.getElementById('combat-trial-start').click();
  for(let i=0;i<5500&&!fight(a).outcome;i++){driveWorldEncounter(a,fight(a));a.step(1/60);}clearCombatKeys(a);
  assert(fight(a).outcome==='success','Normal keyboard dodge-counter play wins the final trial');
  const result=fight(a);a.practice.finish();
  assert(!a.testHero.group.parent.getObjectByName('Stillroom spell effects'),'Leaving disposes all enemy spell effects');
  assert(!a.sorcery.state().shots.length,'Player spells are also cleared');
  await capture(a);return {checks:[...checks],result};
}
