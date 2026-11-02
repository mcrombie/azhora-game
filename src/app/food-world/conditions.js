// Read-only regional projection. The model currently records regional condition,
// not individual damaged holdings, and buildings always retain their capacity.
export function farmCondition(scenario,state,id){
  const f=state.regions[id].food;
  const battle=state.engagements.some(b=>b.region===id&&b.status==='active');
  const output=f.condition*(1-f.unrest*scenario.food.unrestProductionPenalty)*(battle?scenario.food.battleProductionFactor:1);
  const label=f.condition<1||battle?'Disrupted':f.unrest>0?'Recovering':'Productive';
  return {label,condition:f.condition,output,unrest:f.unrest,battle};
}
