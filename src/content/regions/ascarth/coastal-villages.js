// Small mainland communities facing Selemis; shared coastal building craft,
// without importing its palaces, population simulation or city density.
import {hexOwnerAt,landDistance} from '../../../world/terrain/region-world.js';
export const COASTAL_VILLAGES=Object.freeze([
  {id:'west',x:-850,z:2208}, {id:'south',x:-704,z:2286}, {id:'east',x:-665,z:2204},
].map(Object.freeze));
export const COASTAL_HOMES=Object.freeze(COASTAL_VILLAGES.flatMap((v,k)=>[
  [-18,-12,8,9],[-3,-15,10,9],[14,-11,8,9],[-19,10,9,8],[1,12,9,8],[18,10,8,8],
].map(([dx,dz,width,depth],i)=>Object.freeze({id:`ascarth-coast-${v.id}-${i}`,name:'Coastal household',
  village:v.id,x:v.x+dx,z:v.z+dz,width,depth,height:i%3===0?9.5:8.4,kind:'house',palette:(k*2+i)%7,
  yaw:i<3?Math.PI:0,v:1,storeys:2}))).filter(h=>[-1,1].every(sx=>[-1,1].every(sz=>{
    const x=h.x+sx*(h.width/2+1),z=h.z+sz*(h.depth/2+1);
    return hexOwnerAt(x,z)==='Southern Ascarth'&&landDistance(x,z)>10;
  }))));
export const coastalVillageReserved=(x,z,r=0)=>COASTAL_VILLAGES.some(v=>Math.hypot(x-v.x,z-v.z)<38+r);
