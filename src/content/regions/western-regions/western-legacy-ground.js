import { nearWesternDrySeam, westernDrySeamWeight } from './western-dry-seams.js';
import { terrainRoadHeight } from '../../../world/terrain/terrain-road.js';

/** Preserve the complete world callback, including village, pond and forest
 * layers. Only the three repaired bands substitute their old base terrain. */
export function createLegacyWesternGround({groundHeight,baseHeight,legacyBaseHeight}){
  return(x,z)=>{
    const current=groundHeight(x,z);
    if(!westernDrySeamWeight(x,z))return current;
    return legacyBaseHeight(x,z)+(current-baseHeight(x,z));
  };
}

/** Reconstruct only the old coarse vertices touched by a dry-seam repair.
 * This is used for seeded eligibility, never for visible placement or physics. */
export function createLegacyWesternGrid({xs,zs,positions,currentHeight,legacyVertexHeight}){
  const cache=new Map(),columns=xs.length;
  const below=(axis,v)=>{let lo=0,hi=axis.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(axis[m]<=v)lo=m;else hi=m;}return Math.min(axis.length-2,Math.max(0,lo));};
  const vertex=(i,j)=>{
    const k=j*columns+i,at=k*3;
    if(!cache.has(k))cache.set(k,westernDrySeamWeight(xs[i],zs[j])?Math.fround(legacyVertexHeight(xs[i],zs[j])):positions[at+1]);
    return [positions[at],cache.get(k),positions[at+2]];
  };
  return(x,z)=>{
    const current=currentHeight(x,z);
    if(!nearWesternDrySeam(x,z,8))return current;
    const i=below(xs,x),j=below(zs,z),local=new Float32Array([...vertex(i,j),...vertex(i+1,j),...vertex(i,j+1),...vertex(i+1,j+1)]);
    return terrainRoadHeight(x,z,[xs[i],xs[i+1]],[zs[j],zs[j+1]],local,0);
  };
}
