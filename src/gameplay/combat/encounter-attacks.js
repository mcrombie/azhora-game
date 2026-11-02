// Shared by collision, warning shapes, animation timing and demonstration input.
import {ENCOUNTER_TIMING as T} from './encounter-timing.js';
import {trialOpponent} from './combat-trials.js';
export const ENCOUNTER_ATTACKS=Object.freeze({
  thrust:Object.freeze({name:'Thrust',windup:.85,strike:.3,contact:.12,active:0,recovery:1.15,reach:3,halfAngle:Math.PI/7,color:0xed9856}),
  overhead:Object.freeze({name:'Overhead',windup:1.3,strike:.45,contact:.18,active:.08,recovery:1.65,reach:3.4,halfAngle:Math.PI/5,color:0xe8cc65,damage:28}),
  sweep:Object.freeze({name:'Sweep',windup:1.1,strike:.5,contact:.1,active:.28,recovery:1.35,reach:3.6,halfAngle:Math.PI*.62,color:0xdd76ad}),
});
const windup=.1,strike=T.swing-windup,contact=T.contact-windup;
// Match the committed motion and first contact, not the counter opportunity.
// A .20s recovery (the player's cooldown remainder) closed before a sideways
// dodge could return to staff range. .65s keeps that physical response viable.
export const MATCHED_ENCOUNTER_ATTACKS=Object.freeze(Object.fromEntries(Object.entries(ENCOUNTER_ATTACKS).map(([id,a])=>[id,Object.freeze({
  ...a,windup,strike,contact,active:Math.min(strike-contact,a.active*strike/a.strike),recovery:.65,
})])));
export const encounterAttack=g=>{
  if(g.combat?.attacks)return g.combat.attacks[g.attack]??g.combat.attacks[g.pattern[0]];
  if(g.archetype){const profile=trialOpponent(g.archetype);return profile.combat.attacks[g.attack]??profile.combat.attacks[profile.pattern[0]];}
  const attacks=g.tempo==='matched'?MATCHED_ENCOUNTER_ATTACKS:ENCOUNTER_ATTACKS;
  return attacks[g.attack]??attacks.thrust;
};
