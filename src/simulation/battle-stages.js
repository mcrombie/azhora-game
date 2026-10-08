import {stationed,inflictLosses} from './forces.js';

// Authored opportunities use committed troops, not a second army simulation.
export function availableBattleStage(battle){
  if(battle.status!=='active')return null;
  if(battle.participation){
    if(battle.participation.intercept.status==='available')return 'intercept';
    return battle.rally?.status==='available'?'rally':null;
  }
  if(!battle.heroResult)return 'intercept';
  return battle.rally?.status==='available'?'rally':null;
}

export function rallyGuardCount(battle){
  if(battle.rally?.totalGuards!==undefined)return Math.max(0,battle.rally.totalGuards-(battle.rally.stopped??0));
  const first=battle.heroResult?.objective;
  return 3+Math.ceil(Math.max(0,(first?.strength??12)-(first?.blocked??0))/6);
}

export function removeRallyGuards(state,battle,faction,count){
  const enemy=faction===battle.attacker?battle.defender:battle.attacker;
  const garrison={strength:state.regions[battle.region].garrison};
  const forces=enemy===battle.attacker?battle.attackingIds.map(id=>state.armies.find(a=>a.id===id)):
    [garrison,...stationed(state,battle.region,enemy)];
  const removed=Math.min(count,forces.reduce((n,a)=>n+a.strength,0));
  inflictLosses(forces,removed);
  if(enemy===battle.defender)state.regions[battle.region].garrison=garrison.strength;
  return {enemy,removed};
}

// Re-entry consumes only new casualties from the original reserve. The source
// contributions remain immutable so small detachments round exactly once.
export function continueInterception(state,battle,faction,stopped,escaped){
  const progress=battle.participation.intercept,enemy=faction===battle.attacker?battle.defender:battle.attacker;
  const squad=battle.reinforcements[enemy],prior=progress.blocked;
  progress.stopped+=stopped;progress.escaped+=escaped;
  const blocked=Math.floor(squad.strength*progress.stopped/progress.totalGuards);
  let offset=0;
  for(const source of squad.contributions){
    const oldShare=Math.max(0,Math.min(source.strength,prior-offset));
    const newShare=Math.max(0,Math.min(source.strength,blocked-offset));
    const loss=newShare-oldShare;offset+=source.strength;
    if(source.armyId===null)state.regions[battle.region].garrison-=loss;
    else state.armies.find(a=>a.id===source.armyId).strength-=loss;
  }
  progress.blocked=blocked;
  squad.blocked=blocked;squad.remaining=squad.strength-blocked;
  squad.status=blocked===squad.strength?'intercepted':blocked?'partially-intercepted':'approaching';
  return {type:'intercept',targetFaction:enemy,strength:squad.strength,blocked,stopped:progress.stopped,escaped:progress.escaped,removed:blocked-prior};
}
