import {createWorldWar} from '../../app/exploration/world-war.js';
import {prepareWarExterior} from './tower-smoke.js';
import {driveWorldEncounter,clearCombatKeys} from './encounter-controls.js';
import {validateWorldWarSave} from '../../app/exploration/war-checkpoint.js';
const assert=(ok,message)=>{if(!ok)throw Error(message);};
const frames=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
const fight=a=>a.war.state().encounter.encounter;
export async function setup(a){
  window.dispatchEvent(new Event('focus'));await prepareWarExterior(a);
  const w=createWorldWar();w.advance(3);const b=w.snapshot().engagements.find(b=>b.region==='caricas');
  await a.visit(b.location);a.reveal(true);a.war.restore(w.checkpoint());a.war.pause();a.step(.04);
  assert(a.state().mode==='encounter','Opening Caricas battlefield opens');return b;
}
function choose(a,side){
  document.getElementById('encounter-opening').value='duel';
  document.getElementById('encounter-opening').dispatchEvent(new Event('change'));
  assert(document.getElementById('encounter-title').textContent.includes('Champion duel'),'Selected approach updates the briefing');
  const p=a.war.state().campaign.pending;document.getElementById(p.attacker===side?'fight-attacker':'fight-defender').click();
}
export async function finish(a){
  window.dispatchEvent(new Event('focus'));
  for(let i=0;i<7400&&a.state().mode==='skirmish'&&!fight(a).outcome;i++){driveWorldEncounter(a,fight(a));a.step(1/60);}
  clearCombatKeys(a);assert(a.state().mode==='skirmish'&&fight(a).outcome==='success','Ordinary combat inputs win');
  await frames();return fight(a);
}
export async function opening(a){
  await setup(a);assert(!document.getElementById('encounter-duel-choice').hidden,'Duel offered in the very first Caricas battle');
  assert(document.getElementById('encounter-opening').value==='field','Full battle is the default');
  window.dispatchEvent(new Event('blur'));await frames();return {checks:['Opening battle offers optional duel for either league','Full battle is the default']};
}
export async function challenge(a){
  choose(a,'west');assert(document.getElementById('encounter-title').textContent.includes('Serevan Dain'),'Eastern champion introduces himself');
  assert(document.getElementById('encounter-brief').textContent.includes('common law'),'Opponent explains his allegiance');
  assert(!a.war.state().campaign.pending.duel,'Reading invitation does not consume challenge');
  document.getElementById('encounter-return').click();assert(!document.getElementById('encounter-duel-choice').hidden,'Back returns to all choices');
  choose(a,'west');await frames();return {checks:['Champion introduces his cause and clear stakes','Backing out costs nothing']};
}
export async function combat(a){
  window.dispatchEvent(new Event('focus'));document.getElementById('fight-attacker').click();
  assert(a.state().mode==='skirmish'&&fight(a).stage==='duel','Acceptance starts one-on-one fight');
  const s=fight(a);assert(s.guards.length===1&&!s.allies&&s.objective.type==='duel','Only the champion participates');
  assert(Math.hypot(s.staging.x-s.centre.x,s.staging.z-s.centre.z)<=24,'Combat staged centrally');
  a.look({yaw:Math.atan2(s.hero.x-s.guards[0].x,s.hero.z-s.guards[0].z),pitch:.3,distance:9});
  for(let i=0;i<500&&fight(a).guards[0].phase!=='windup';i++)a.step(1/60);
  window.dispatchEvent(new Event('blur'));await frames();return {checks:['One officer, no extra combatants or runner','Fixed central staging and normal staff controls'],state:fight(a)};
}
export async function overhead(a){
  window.dispatchEvent(new Event('focus'));
  for(let i=0;i<3000&&!fight(a).outcome;i++){
    driveWorldEncounter(a,fight(a));a.step(1/60);const g=fight(a).guards[0];
    if(g.attack==='overhead'&&g.phase==='windup'&&g.timer<.75)break;
  }
  clearCombatKeys(a);const s=fight(a),g=s.guards[0];
  assert(g.attack==='overhead'&&g.phase==='windup','Champion uses the overhead attack');
  a.look({yaw:Math.atan2(s.hero.x-g.x,s.hero.z-g.z)+.5,pitch:.45,distance:10});
  assert(a.state().combatCues.some(c=>c.visible&&c.cue==='warning'),'Overhead has a visible attack warning');
  window.dispatchEvent(new Event('blur'));await frames();return {checks:['Third attack has a distinct pose and warning'],state:s};
}
export async function compact(){
  const root=document.getElementById('encounter-dialog');
  assert(root.open&&root.scrollWidth<=root.clientWidth+2,'Battle choices fit without horizontal scrolling');
  for(const id of ['encounter-opening','fight-attacker','fight-defender','encounter-return']){
    const b=document.getElementById(id);b.scrollIntoView({block:'nearest'});await frames();const r=b.getBoundingClientRect();
    assert(r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight,id+' remains reachable');
    assert(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===b,id+' is not covered');
  }
  root.scrollTop=0;await frames();return {checks:['All choice controls reachable on compact screen'],width:innerWidth,height:innerHeight};
}
export async function victory(a){
  const s=await finish(a);assert(s.guards[0].yielded,'Champion yields instead of dying');
  assert(document.getElementById('battle-result-dialog').open,'Result is central and modal');
  assert(document.getElementById('world-skirmish-facts').textContent.includes('no kills'),'No false casualty credit');
  assert(document.getElementById('world-skirmish-facts').textContent.includes('two fell back'),'Morale effect is explicit');
  window.dispatchEvent(new Event('blur'));await frames();return {checks:['Duel won with real dodge/counter controls','Yield and morale advantage shown in result'],seconds:s.time,health:s.hero.hp};
}
export async function assault(a){
  document.getElementById('world-skirmish-continue').click();let p=a.war.state().campaign.pending;
  assert(p.stage==='rally'&&p.rally.direct&&p.rally.guards===p.duel.fieldBattle.guards-2&&p.rally.supportAllies===p.duel.fieldBattle.allies,'Duel reduces the full enemy formation by two without removing allies');
  assert(document.getElementById('encounter-duel-choice').hidden,'Duel cannot be selected for the assault');
  assert(document.getElementById('encounter-brief').textContent.includes('champion yielded'),'Assault explains the earned advantage');
  await a.war.help('west');const s=await finish(a);assert(s.allies.filter(a=>!a.commanderId).length===p.rally.supportAllies&&s.allies.some(a=>a.commanderId),'Allied formation and its captain actually fight');
  document.getElementById('world-skirmish-continue').click();const state=a.war.state().campaign;
  assert(state.day===6&&state.regions.caricas.owner==='west','Assault records immediate territorial result');
  assert(a.war.state().letters.some(l=>l.detail.includes('champion yielded')),'Taleth\'s message remembers the duel');
  assert(a.save().ok&&validateWorldWarSave(a.store.read().data),'Duel and assault checkpoint validates');
  await a.loadSaved();a.war.pause();assert(a.war.state().campaign.engagements[0].duel.moraleGuards===2,'Continue retains the exact effect');
  return {checks:['Duel flows into default allied assault','Taleth remembers its effect','Save/Continue keeps duel and field result']};
}
export async function withdrawal(a){
  await setup(a);choose(a,'east');assert(document.getElementById('encounter-title').textContent.includes('Meret Voss'),'Western champion offered when helping East');
  document.getElementById('fight-defender').click();assert(fight(a).guards[0].name==='Captain Meret Voss','Correct rival spawned');
  document.getElementById('world-skirmish-withdraw').click();assert(a.state().mode==='playing','Yield returns control');
  let b=a.war.state().campaign.engagements[0];assert(b.duel.outcome==='withdraw'&&b.duel.moraleGuards===0&&b.rally.totalGuards===5,'Yield forfeits advantage, not the assault');
  assert(a.war.join().ok,'Battle can be re-entered');assert(a.war.state().campaign.pending.stage==='rally','Re-entry offers assault, not repeatable duel');
  a.war.withdraw();await frames();return {checks:['Both faction champions work','Yield consumes challenge and leaves normal assault available']};
}
async function die(a){
  window.dispatchEvent(new Event('focus'));clearCombatKeys(a);
  for(let i=0;i<7200&&a.state().mode==='skirmish';i++)a.step(1/60);
  const end=performance.now()+8000;while((a.state().mode!=='limbo'||document.body.classList.contains('crossing-limbo'))&&performance.now()<end)await frames();
  assert(a.state().mode==='limbo','Ordinary enemy damage sends Teresod to Reaper');
}
export async function death(a){
  await setup(a);await a.war.help('east','duel');await die(a);
  assert(a.afterlife.snapshot().death.approach==='duel','Reaper remembers approach');
  assert(a.save().ok&&validateWorldWarSave(a.store.read().data),'Limbo saves with duel rewind');
  a.afterlife.talk();await frames();return {checks:['Real combat death enters limbo','Duel death checkpoint validates']};
}
export async function retry(a){
  assert(await a.afterlife.choose('retry'),'Retry restores duel');assert(fight(a).stage==='duel'&&fight(a).guards[0].hp===200&&fight(a).hero.hp===100,'Fresh champion and hero');
  assert(a.war.state().campaign.day===3,'Retry restores opening day');
  await die(a);assert(await a.afterlife.choose('before'),'Before choice restores invitation');
  assert(a.state().mode==='encounter'&&!a.war.state().campaign.pending.duel&&!document.getElementById('encounter-duel-choice').hidden,'May switch back to interception after rewind');
  await a.war.help('east','intercept');assert(fight(a).stage==='intercept'&&fight(a).guards.length===3,'Ordinary route still starts');
  a.war.withdraw();assert(!a.state().frameErrors.length,'No renderer errors');
  return {checks:['Retry restores same duel without duplicate credit','Before-choice allows the ordinary interception instead','No renderer errors']};
}

// Run the ordinary interception route through the real landscape and result dialog.
async function combined(a,side){
  await setup(a);await a.war.help(side,'intercept');
  const first=await finish(a);assert(first.stage==='intercept','Ordinary route starts with reinforcements');
  document.getElementById('world-skirmish-continue').click();
  assert(document.getElementById('encounter-brief').textContent.includes('must defeat or rout'),'Briefing makes the army commander mandatory');
  await a.war.help(side);let s=fight(a);
  assert(s.guards.some(g=>g.commanderId)&&s.allies.some(g=>g.commanderId),'Both army captains stand with their soldiers');
  const enemy=s.guards.find(g=>g.commanderId);assert(enemy.name.includes(side==='west'?'Dain':'Voss'),'Correct opposing captain');
  s=await finish(a);assert(s.guards.find(g=>g.commanderId).routed||!s.guards.find(g=>g.commanderId).hp,'Captain is beaten before victory');
  assert(document.getElementById('world-skirmish-facts').textContent.includes('Morale'),'Results explain morale');
  const review={seconds:s.time,health:s.hero.hp,morale:s.morale,commanders:[...s.guards,...s.allies].filter(g=>g.commanderId).map(g=>({name:g.name,hp:g.hp,routed:g.routed??false}))};
  document.getElementById('world-skirmish-continue').click();
  assert(a.war.state().campaign.regions.caricas.owner===side,'Victory recorded for supported side');
  assert(a.save().ok&&validateWorldWarSave(a.store.read().data),'Combined battle checkpoint validates');
  await a.loadSaved();a.war.pause();assert(a.war.state().campaign.engagements[0].commanders,'Continue preserves commander fates');
  assert(!a.state().frameErrors.length,'No renderer errors');
  return {checks:['Mandatory opposing commander, friendly commander and regular soldiers fight together','Morale and persistent commander fate recorded','Save/Continue validated'],...review};
}
export const combinedWest=a=>combined(a,'west');
export const combinedEast=a=>combined(a,'east');
