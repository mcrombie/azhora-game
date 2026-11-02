// A bounded formation from the forces already committed to this battlefield.
// Entering a field battle does not intercept, kill, or conjure campaign troops.
export function fieldBattleFormation(pending,faction){
  const soldiers=strength=>Math.min(strength,12,Math.max(4,Math.ceil(strength/5)));
  const attacking=faction===pending.attacker;
  return {guards:soldiers(attacking?pending.defenders:pending.attackers),allies:soldiers(attacking?pending.attackers:pending.defenders)};
}

export function canEnterFieldBattle(battle){
  const p=battle?.participation;
  return battle?.status==='active'&&battle.rally?.status==='locked'&&!!battle.reinforcements
    &&p?.intercept.status==='available'&&!p.faction&&!p.intercept.stopped&&!p.intercept.escaped&&!battle.duel;
}

export function beginFieldBattle(battle,pending,faction){
  const formation=fieldBattleFormation(pending,faction);
  battle.participation.faction=pending.participation.faction=faction;
  battle.participation.intercept.status='skipped';
  battle.rally={status:'available',direct:true,faction,totalGuards:formation.guards,supportAllies:formation.allies,stopped:0,removed:0};
  pending.id=battle.id+':rally';pending.stage='rally';pending.participation.status='skipped';
  pending.rally={direct:true,faction,guards:formation.guards,totalGuards:formation.guards,supportAllies:formation.allies,stopped:0,blocked:0};
  delete pending.fieldBattleAvailable;delete pending.duelAvailable;
}
