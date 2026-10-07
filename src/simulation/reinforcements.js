import {stationed} from './forces.js';

// A reserve is earmarked inside existing committed strength, never newly spawned
// troops. It joins at the deadline unless the hero breaks its local detachment.
export function reserveReinforcements(state,battle,limit){
  const reserve=components=>{
    let left=limit;
    const contributions=components.map(c=>{
      const strength=Math.min(left,Math.floor(c.strength/2));left-=strength;
      return {armyId:c.armyId,strength};
    }).filter(c=>c.strength);
    return {strength:limit-left,status:'approaching',contributions};
  };
  return {
    [battle.attacker]:reserve(battle.attackingIds.map(id=>({armyId:id,strength:state.armies.find(a=>a.id===id).strength}))),
    [battle.defender]:reserve([{armyId:null,strength:state.regions[battle.region].garrison},...stationed(state,battle.region,battle.defender).map(a=>({armyId:a.id,strength:a.strength}))]),
  };
}

export const interceptedStrength=(strength,stopped)=>Math.floor(strength*stopped/3);

export function interceptReinforcements(state,battle,faction,outcome,stopped=null){
  const targetFaction=faction===null?null:faction===battle.attacker?battle.defender:battle.attacker;
  const squad=battle.reinforcements[targetFaction];
  const objective={type:'intercept',targetFaction,strength:squad?.strength??0,blocked:0};
  const blocked=stopped===null?(outcome==='success'?squad.strength:0):interceptedStrength(objective.strength,stopped);
  if(stopped!==null)objective.stopped=stopped;
  if(!blocked)return objective;
  let left=blocked;
  for(const c of squad.contributions){
    const removed=Math.min(left,c.strength);left-=removed;
    if(c.armyId===null)state.regions[battle.region].garrison-=removed;
    else state.armies.find(a=>a.id===c.armyId).strength-=removed;
  }
  squad.status=blocked===squad.strength?'intercepted':'partially-intercepted';objective.blocked=blocked;
  if(stopped!==null){squad.blocked=blocked;squad.remaining=squad.strength-blocked;}
  return objective;
}
