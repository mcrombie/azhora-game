import {ENCOUNTER_TIMING} from './encounter-timing.js';

// Small encounter-only foundation. Equipment/moves own reach and base timing;
// attributes modify those moves, never the animation independently of collision.
export const COMBAT_ATTRIBUTES=Object.freeze({vitality:10,power:10,quickness:10,mobility:10});
export const COMBAT_ATTRIBUTE_INFO=Object.freeze([
  Object.freeze({id:'vitality',name:'Vitality',description:'10 health per point.'}),
  Object.freeze({id:'power',name:'Power',description:'Melee damage; 10 is normal weapon damage.'}),
  Object.freeze({id:'quickness',name:'Quickness',description:'Each point above 10 adds 4% attack speed.'}),
  Object.freeze({id:'mobility',name:'Mobility',description:'0.4 metres per second per point.'}),
]);
export function combatAttributes(values={}){
  if(!values||typeof values!=='object'||Array.isArray(values))throw Error('Combat attributes must be an object.');
  for(const key of Object.keys(values))if(!Object.hasOwn(COMBAT_ATTRIBUTES,key))throw Error('Unknown combat attribute: '+key);
  const result={...COMBAT_ATTRIBUTES,...values};
  for(const [key,value] of Object.entries(result))if(!Number.isFinite(value)||value<1||value>20)throw Error(key+' must be between 1 and 20.');
  return Object.freeze(result);
}
export function combatStats(values={}){
  const attributes=combatAttributes(values);
  return Object.freeze({attributes,maxHp:Math.round(attributes.vitality*10),damageScale:attributes.power/10,
    attackRate:1+(attributes.quickness-10)*.04,moveSpeed:attributes.mobility*4/10});
}
export function combatAttack(base,stats){
  const rate=stats.attackRate;
  return Object.freeze({...base,windup:base.windup/rate,strike:base.strike/rate,contact:base.contact/rate,
    active:(base.active??0)/rate,recovery:base.recovery/rate,damage:Math.max(1,Math.round(base.damage*stats.damageScale))});
}
export function playerCombatStats(values={}){
  const stats=combatStats(values),base=ENCOUNTER_TIMING;
  return Object.freeze({...stats,damage:Math.max(1,Math.round(25*stats.damageScale)),swingMoveSpeed:stats.moveSpeed*.7,
    timing:Object.freeze({...base,swing:base.swing/stats.attackRate,contact:base.contact/stats.attackRate,attackCooldown:base.attackCooldown/stats.attackRate})});
}
export const DEFAULT_PLAYER_COMBAT=playerCombatStats();
export const playerCombat=hero=>hero?.combat??DEFAULT_PLAYER_COMBAT;
