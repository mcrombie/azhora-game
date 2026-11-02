import {combatStats,combatAttack} from './combat-stats.js';
export const profile=data=>{const base=combatStats(data.attributes),stats={...base,maxHp:base.maxHp*(data.healthMultiplier??1)};return Object.freeze({...data,attributes:stats.attributes,hp:stats.maxHp,speed:stats.moveSpeed,
  combat:Object.freeze({...stats,attacks:Object.freeze(Object.fromEntries(Object.entries(data.attacks).map(([id,move])=>[id,combatAttack(move,stats)])))})});};
export const attack=(name,windup,strike,contact,recovery,reach,halfAngle,damage,color,extra={})=>Object.freeze({name,windup,strike,contact,recovery,reach,halfAngle,damage,color,active:0,...extra});
