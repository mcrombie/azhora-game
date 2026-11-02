import {encounterFacing} from './encounter-target.js';

// All opponents use the same guard openings whether struck by Teresod or an
// allied soldier. A committed swing is not itself an exposed shield opening.
export const isEncounterGuarding=g=>g.guarding!==false&&g.hp>0&&!g.escaped&&g.role!=='runner'&&!g.open&&!['stagger','restore','inscribe','veil','offering','submerged','emerge','vent'].includes(g.phase);

// A staff softens frontal blows; it is not the militia's complete shield cover.
export const STAFF_GUARD=Object.freeze({reduction:.55,halfAngle:Math.PI/3,moveScale:.45});
export function staffDefense(hero,attacker,attack,damage){
  const blocked=!!hero.blocking&&attack.style!=='stomp'&&!attack.guardBreak&&encounterFacing(hero,attacker,STAFF_GUARD.halfAngle);
  return {blocked,damage:blocked?Math.max(1,Math.ceil(damage*(1-STAFF_GUARD.reduction))):damage};
}
