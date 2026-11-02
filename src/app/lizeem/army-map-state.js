// Attackers remain committed to an engagement with region:null in the core.
// Their map location is the battlefield, never the region they departed from.
export function armyMapRegion(state,army){
  if(army.region)return army.region;
  if(army.status==='engaged')return state.engagements.find(b=>b.status==='active'&&b.attackingIds.includes(army.id))?.region??army.to;
  return army.to;
}
