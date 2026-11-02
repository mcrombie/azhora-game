import {setup,finish} from './champion-duel-smoke.js';
import {validateWorldWarSave} from '../../app/exploration/war-checkpoint.js';
import {combatUnit} from '../../gameplay/combat/combat-units.js';
import {encounterAttack} from '../../gameplay/combat/encounter-attacks.js';
export {withdrawal as savedWounds} from './caricas-commander-smoke.js';
const assert=(ok,message)=>{if(!ok)throw Error(message);};
const fight=a=>a.war.state().encounter.encounter;
const press=code=>{for(const type of ['keydown','keyup'])document.dispatchEvent(new KeyboardEvent(type,{code,bubbles:true,cancelable:true}));};
const frames=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
async function capture(){window.dispatchEvent(new Event('blur'));await frames();}
function profiles(s){
  for(const g of [...s.guards,...(s.allies??[])]){
    assert(g.combat&&g.defense?.type==='shield','Every campaign soldier has real stats and shield rules');
    assert(g.commanderId?g.maxHp===200&&g.armor===.25:g.unitType==='militiaman'&&g.maxHp===100&&g.armor===0,'Campaign equipment matches captain or militia tier');
    if(!g.commanderId)assert(JSON.stringify(g.combat)===JSON.stringify(combatUnit('militiaman',g.weapon).combat),'Campaign militia shares the trial weapon profile');
    assert(encounterAttack(g).damage>0&&encounterAttack(g).windup<.7,'Equipped stats supply actual damage and modern attack timing');
  }
}
export async function duelControls(a){
  await setup(a);await a.war.help('west','duel');let s=fight(a);profiles(s);
  const g=s.guards[0];a.look({yaw:Math.atan2(s.hero.x-g.x,s.hero.z-g.z),pitch:.35,distance:9});
  press('KeyT');a.hold('KeyF',true);
  for(let i=0;i<600&&!fight(a).skill.staffBlocks;i++)a.step(1/60);
  s=fight(a);assert(s.hero.blocking&&s.skill.staffBlocks===1&&s.hero.hp>70&&s.hero.hp<100,'F reduces a real captain hit while allowing chip damage');
  const mana=a.sorcery.state().mana;press('KeyQ');assert(a.sorcery.state().mana===mana,'Raised staff prevents simultaneous spell casting');
  a.hold('KeyF',false);a.step(1/60);press('KeyQ');assert(a.sorcery.state().mana===mana-20,'Q spends the usual 20 mana in a campaign duel');
  for(let i=0;i<90&&fight(a).hero.lastStrike?.kind!=='fireball';i++)a.step(1/60);
  s=fight(a);assert(s.hero.lastStrike?.kind==='fireball'&&s.guards[0].hp===174,'The actual Fireball deals 26 spell damage through captain armor');
  document.getElementById('world-skirmish-help').click();const before=fight(a).time,spell=JSON.stringify(a.sorcery.state());
  for(let i=0;i<60;i++)a.step(1/60);press('KeyQ');
  assert(fight(a).time===before&&JSON.stringify(a.sorcery.state())===spell,'Help pauses both melee and magic');
  document.getElementById('world-skirmish-help').click();await capture();
  return {checks:['Captain stats and armor match the shared veteran system','F guards, Q casts, guard/cast exclusion and Help pause work in the campaign'],hp:s.hero.hp,captain:s.guards[0].combat};
}
export async function duelResult(a){
  const s=await finish(a);assert(s.guards[0].yielded,'Duel still yields instead of killing the captain');
  document.getElementById('world-skirmish-continue').click();await a.war.help('west');profiles(fight(a));
  assert(!fight(a).guards.some(g=>g.commanderId)&&fight(a).allies.some(g=>g.commanderId),'Yielded captain stays out; friendly captain joins');
  await finish(a);document.getElementById('world-skirmish-continue').click();
  assert(a.war.state().campaign.regions.caricas.owner==='west','Duel advantage and final assault settle the battle');
  assert(a.save().ok&&validateWorldWarSave(a.store.read().data),'Updated duel and assault save correctly');
  await capture();return {checks:['Duel yield, morale advantage, final assault and campaign save remain valid'],seconds:s.time,hp:s.hero.hp};
}
async function formation(a,side){
  await setup(a);await a.war.help(side,'intercept');profiles(fight(a));await finish(a);
  document.getElementById('world-skirmish-continue').click();await a.war.help(side);const s=fight(a);profiles(s);
  assert(s.guards.some(g=>g.commanderId)&&s.allies.some(g=>g.commanderId),'Combined fight includes both captains');
  a.look({yaw:Math.atan2(s.hero.x-s.centre.x,s.hero.z-s.centre.z),pitch:.5,distance:12});await capture();
  return {checks:[side+' interception and combined armies use the current weapon profiles'],soldiers:[...s.guards,...s.allies].map(g=>({name:g.name,weapon:g.weapon,hp:g.hp,armor:g.armor}))};
}
async function victory(a,side){
  const s=await finish(a);assert(s.guards.some(g=>g.commanderId&&(g.routed||!g.hp)),'Captain is defeated before victory');
  document.getElementById('world-skirmish-continue').click();assert(a.war.state().campaign.regions.caricas.owner===side,'Victory belongs to the supported league');
  assert(a.save().ok&&validateWorldWarSave(a.store.read().data),'Combined battle save validates');
  await a.loadSaved();a.war.pause();assert(!a.state().frameErrors.length,'No frame errors');await capture();
  return {checks:[side+' combined battle is winnable with ordinary staff/dodge inputs and survives Save/Continue'],seconds:s.time,hp:s.hero.hp,morale:s.morale};
}
export const formationWest=a=>formation(a,'west');
export const victoryWest=a=>victory(a,'west');
export const formationEast=a=>formation(a,'east');
export const victoryEast=a=>victory(a,'east');
