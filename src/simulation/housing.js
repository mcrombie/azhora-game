// Optional, read-only capacity in this first pass. The campaign owns the state;
// construction, migration and housing shortages have no automatic effects yet.
export function initializeHousing(scenario,state){
  for(const r of scenario.regions){
    if(r.housing===undefined)continue;
    if(!r.housing||!Number.isSafeInteger(r.housing.capacity)||r.housing.capacity<0)throw Error('Invalid housing capacity: '+r.id);
    state.regions[r.id].housing={capacity:r.housing.capacity};
  }
}

export function housingSummary(region){
  if(!region.housing)return null; // Not authored is distinct from no housing.
  const capacity=region.housing.capacity,population=region.food?.population??null;
  return {capacity,population,
    spareCapacity:population===null?null:Math.max(0,capacity-population),
    overCapacity:population===null?null:Math.max(0,population-capacity),
    occupancy:population===null||capacity===0?null:population/capacity};
}
