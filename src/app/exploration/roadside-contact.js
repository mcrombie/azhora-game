import {ROADSIDE_REACH,roadsideOrderKey} from '../../simulation/roadside-interception.js';

// Declining must return control instead of reopening the same invitation.
// Forget a contact only after leaving the column, or when its order changes.
export function createRoadsideContact(){
  const seen=new Set();
  const remember=key=>{seen.add(key);if(seen.size>64)seen.delete(seen.values().next().value);};
  return {
    update(columns,position,eligible,enabled=true){
      const near=columns.filter(c=>Math.hypot(c.location.x-position.x,c.location.z-position.z)<=22);
      for(const c of columns)if(Math.hypot(c.location.x-position.x,c.location.z-position.z)>22)seen.delete(roadsideOrderKey(c));
      if(!enabled)return null;
      const column=near.filter(c=>!seen.has(roadsideOrderKey(c))&&eligible(c)&&Math.hypot(c.location.x-position.x,c.location.z-position.z)<=ROADSIDE_REACH)
        .sort((a,b)=>Math.hypot(a.location.x-position.x,a.location.z-position.z)-Math.hypot(b.location.x-position.x,b.location.z-position.z))[0];
      if(column)remember(roadsideOrderKey(column));
      return column??null;
    },
    suppress(column){if(column)remember(roadsideOrderKey(column));},
    suppressOrder:remember,
    reset(){seen.clear();},
    state:()=>({suppressed:[...seen]})
  };
}
