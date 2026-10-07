import {defendingStrength} from '../../simulation/forces.js';

// A read-only projection: drawing guards must never recruit strategic troops.
export function caricasPresence(state,scenario){
  const region=state.regions.caricas,faction=scenario.factions.find(f=>f.id===region.owner);
  const contested=state.engagements.some(b=>b.region==='caricas'&&b.status==='active');
  const strength=defendingStrength(state,'caricas');
  const condition=contested?'Battle underway':region.recovery?'Recovering from battle':state.winner?'War ended':'At war';
  return {owner:region.owner,color:faction.color,strength,guards:contested?0:Math.min(2,strength),
    status:`${faction.short} controls Caricas · ${condition.toLowerCase()}`};
}
