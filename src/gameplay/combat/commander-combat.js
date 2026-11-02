import {combatUnit,UNIT_ATTACKS} from './combat-units.js';
import {combatStats,combatAttack} from './combat-stats.js';

// Both league captains have veteran training and sword/shield equipment. Their
// authored 200-health endurance stays compatible with wounded campaign saves.
// Duels and combined battles must use this same profile, including armor.
export function commanderCombat(){
  const veteran=combatUnit('veteran-ambron-soldier');
  const stats=combatStats({...veteran.attributes,vitality:20});
  const attacks={thrust:UNIT_ATTACKS['sword-cut'],sweep:UNIT_ATTACKS['sword-sweep'],overhead:UNIT_ATTACKS['sword-overhead']};
  return {archetype:'lizeem-captain',weapon:'sword',combat:{...stats,attacks:Object.fromEntries(Object.entries(attacks).map(([id,a])=>[id,combatAttack(a,stats)]))},
    maxHp:stats.maxHp,defense:{...veteran.defense},armor:veteran.armor,engage:veteran.engage,
    pattern:Object.keys(attacks),guarding:true,labelHeight:3};
}
