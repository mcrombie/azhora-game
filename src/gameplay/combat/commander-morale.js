import {commanderCombat} from './commander-combat.js';
import {unitBody} from './combat-units.js';
// Small local formations share their captain's fate. No extra AI population.
const clamp=n=>Math.max(0,Math.min(100,n));
// Re-entering a field must not restore the morale lost with earlier casualties.
// Commander losses are already carried by pending.morale; count only soldiers here.
export function assaultMorale(pending,side){
  if(!pending.commanders)return null;
  const enemy=side===pending.attacker?pending.defender:pending.attacker,rally=pending.rally;
  return {allies:(pending.morale?.[side]??0)-(rally?.allied?.lost??0)*8,
    enemies:(pending.morale?.[enemy]??0)-Math.max(0,(rally?.stopped??0)-(rally?.allied?.routed??0))*8};
}
export function commanderBody(c){if(!c)return {};const profile=c.unitType?unitBody(c.unitType):commanderCombat();return {...profile,commanderId:c.id,faction:c.faction,name:c.name,hp:c.hp??profile.maxHp,...(c.canRetreat===false?{canRetreat:false}:{})};}
export function updateCommanderMorale(state){
  if(!state.morale)return;
  const enemies=state.guards,allies=state.allies??[],m=state.morale;
  const lost=list=>list.filter(a=>a.commanderId&&(!a.hp||a.routed));
  m.allies=clamp(m.baseAllies-allies.filter(a=>!a.commanderId&&!a.hp).length*8-lost(allies).length*20+lost(enemies).length*20);
  m.enemies=clamp(m.baseEnemies-enemies.filter(a=>!a.commanderId&&!a.hp).length*8-lost(enemies).length*20+lost(allies).length*20);
  m.notice=[...lost(enemies).map(a=>`${a.name} ${a.hp?'retreats':'has fallen'}: your morale rises; theirs falls.`),...lost(allies).map(a=>`${a.name} ${a.hp?'retreats':'has fallen'}: your morale falls; theirs rises.`)].join(' ');
}
export function commanderReports(field){
  return Object.fromEntries([...field.guards,...(field.allies??[])].filter(a=>a.commanderId).map(a=>[a.faction,{id:a.commanderId,hp:a.hp,outcome:!a.hp?'slain':a.routed?'routed':'active'}]));
}
