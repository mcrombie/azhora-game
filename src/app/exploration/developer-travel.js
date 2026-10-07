import {regions,REGION_CELLS,regionAt} from '../../world/terrain/region-world.js';
import {canStand} from '../../gameplay/movement/locomotion.js';

// Use the complete world roster, including regions with only basic scenery.
export const explorationDestinations=Object.freeze([...regions].sort((a,b)=>a.name.localeCompare(b.name))
  .map(r=>Object.freeze({id:r.id,name:r.name,spawn:r.spawn})));

export function arrivalCandidates(region){
  const cells=(REGION_CELLS[region.name]??[]).filter(c=>!['ocean','lake'].includes(c.terrain));
  return [region.spawn,...[...cells].sort((a,b)=>Math.hypot(a.x-region.spawn.x,a.z-region.spawn.z)-Math.hypot(b.x-region.spawn.x,b.z-region.spawn.z))]
    .filter(p=>regionAt(p.x,p.z)?.id===region.id);
}

// Called after the destination's collision geometry has loaded. Never silently
// land across a border, in water, or inside scenery when an authored spawn is blocked.
export function findRegionArrival(region,world){
  const clear=(x,z)=>world.regionAt(x,z)?.id===region.id&&canStand(x,z,world,.62);
  for(const p of arrivalCandidates(region)){
    if(clear(p.x,p.z))return {x:p.x,z:p.z};
    for(let radius=4;radius<=60;radius+=4)for(let i=0;i<12;i++){
      const x=p.x+Math.cos(i*Math.PI/6)*radius,z=p.z+Math.sin(i*Math.PI/6)*radius;
      if(clear(x,z))return {x,z};
    }
  }
  return null;
}
