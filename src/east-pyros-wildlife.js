/** Small, persistent wild populations in open Pyrosi country. No livestock or
 * people are implied by the road-fox's species name. */
import { EAST_PYROS, EAST_PYROS_CELLS, EAST_PYROS_OUTCROPS,
  eastPyrosBoundaryDistance, eastPyrosClear, eastPyrosHabitat, eastPyrosWaterAt,
  eastPyrosRiverClearance } from './east-pyros-world.js';
import { hexOwnerAt, landDistance } from './region-world.js';
import { groundWithRiver as height } from './world-terrain.js';
import { pyraClear } from './pyra-world.js';

const freeze=Object.freeze;
const slope=(x,z)=>Math.hypot(height(x+1,z)-height(x-1,z),height(x,z+1)-height(x,z-1))/2;
const traits=freeze({
  'road-fox':freeze({radius:.3,scale:1,maxSlope:.55}),
  'spine-lizard':freeze({radius:.32,scale:1,maxSlope:.6}),
  'upland-hare':freeze({radius:.3,scale:1,maxSlope:.65}),
  boar:freeze({radius:.7,scale:1,maxSlope:.55}),
});
const zones=[];
for(const [index,cell] of EAST_PYROS_CELLS.entries()){
  if(index%2===1)continue;
  const habitat=eastPyrosHabitat(cell.x,cell.z);
  const species=cell.z>1400&&index%4===0?'boar':habitat.dry>.7&&index%3===0?'spine-lizard':index%4===0?'road-fox':'upland-hare';
  const candidates=[];
  for(let i=0;i<56;i++){
    const angle=i*2.39996323+index*.3,radius=36*Math.sqrt(i/56);
    const x=cell.x+Math.cos(angle)*radius,z=cell.z+Math.sin(angle)*radius;
    if(pyraClear(x,z,30)||hexOwnerAt(x,z)!==EAST_PYROS||landDistance(x,z)<20||eastPyrosBoundaryDistance(x,z)<16
      ||eastPyrosRiverClearance(x,z)<25||eastPyrosWaterAt(x,z)!==null||eastPyrosClear(x,z,2))continue;
    if(EAST_PYROS_OUTCROPS.some(p=>Math.hypot(x-p.x,z-p.z)<p.radius+6))continue;
    const grade=slope(x,z);if(grade<traits[species].maxSlope*.8)candidates.push({x,z,grade});
  }
  candidates.sort((a,b)=>a.grade-b.grade);
  if(!candidates.length)continue;
  const p=candidates[0],sites=[[p.x,p.z]];
  if(species==='upland-hare'){
    const companion=candidates.find(q=>Math.hypot(q.x-p.x,q.z-p.z)>12&&Math.hypot(q.x-p.x,q.z-p.z)<28);
    if(companion)sites.push([companion.x,companion.z]);
  }
  zones.push(freeze({id:`east-pyros-${cell.q}-${cell.r}-${species}`,species,region:EAST_PYROS,
    ...traits[species],keepRegion:true,minX:cell.x-49,maxX:cell.x+49,minZ:cell.z-49,maxZ:cell.z+49,
    sites:freeze(sites.map(freeze)),
    note:species==='spine-lizard'?'A basking Pyrosi spine-lizard in warm, rocky open scrub.'
      :species==='road-fox'?'A lean, wary road-fox ranging through the grass and ash.'
      :species==='boar'?'Wild boar in the greener southern scrub.':'Upland hares among the bunchgrass.'}));
}
for(const [id,species,x,z,air] of [
  ['talermolis-hawk','plateau-hawk',-2840,1030,30],
  ['red-ridge-hawk','plateau-hawk',-2500,1270,35],
  ['southern-harrier','harrier',-2465,1480,17],
])zones.push(freeze({id:`east-pyros-${id}`,species,region:EAST_PYROS,radius:.3,scale:1,
  air,keepRegion:true,minX:x-65,maxX:x+65,minZ:z-65,maxZ:z+65,
  sites:freeze([freeze([x,z])]),note:'A wild raptor working the open grassland; never a flock of decorative static birds.'}));

export const EAST_PYROS_WILDLIFE_ZONES=freeze(zones);
/** Scenery leaves each animal a real clearing, without erasing the broad habitat. */
export const eastPyrosWildlifeClear=(x,z,margin=0)=>zones.some(zone=>!zone.air&&zone.sites.some(([px,pz])=>Math.hypot(x-px,z-pz)<4+margin));
