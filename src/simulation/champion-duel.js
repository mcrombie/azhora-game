// A bounded alternative to interception, not a second army or diplomacy system.
export function canOfferChampionDuel(state,battle,enabled){
  const p=battle?.participation;
  return !!enabled&&battle.status==='active'&&!!battle.rally&&!!battle.reinforcements
    &&p?.intercept.status==='available'&&!p.faction&&!p.intercept.stopped&&!p.intercept.escaped
    &&(battle.commanders?Object.values(battle.commanders).some(c=>c.status==='active')&&!battle.duel:!state.engagements.some(b=>b.duel));
}

export function finishChampionDuel(state,battle,faction,outcome,reason){
  if(battle.duel?.status!=='accepted'||battle.duel.faction!==faction||
    !({success:['champion-yielded'],defeat:['driven-back','time-expired'],withdraw:['withdrew']}[outcome]?.includes(reason)))
    return {ok:false,reason:'Invalid or already resolved champion duel.'};
  const enemy=battle.duel.enemy,strength=battle.reinforcements[enemy].strength;
  const moraleGuards=outcome==='success'?2:0,totalGuards=Math.max(0,(battle.duel.fieldBattle?.guards??(3+Math.ceil(strength/6)))-moraleGuards);
  Object.assign(battle.duel,{status:'finished',outcome,reason,moraleGuards});
  battle.participation.intercept.status='finished';
  // These guards fall back; no soldiers, reinforcements or hit points in the
  // strategic armies are removed by a champion's surrender.
  const objective={type:'duel',targetFaction:enemy,strength,blocked:0,moraleGuards};
  battle.heroResult={faction,outcome,reason,objective};
  battle.rally={status:'available',faction,totalGuards,stopped:0,removed:0,...(battle.duel.fieldBattle?{direct:true,supportAllies:battle.duel.fieldBattle.allies}:{})};
  return {ok:true,objective};
}
