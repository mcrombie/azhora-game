/** Jump the established 32-bit terrain random stream without sampling the world. */
export function advanceTerrainSeed(seed, draws) {
  let multiplier=1664525, increment=1013904223, accumulatedMultiplier=1, accumulatedIncrement=0;
  while (draws>0) {
    if (draws%2===1) {
      accumulatedMultiplier=Math.imul(accumulatedMultiplier,multiplier)>>>0;
      accumulatedIncrement=(Math.imul(accumulatedIncrement,multiplier)+increment)>>>0;
    }
    increment=Math.imul(multiplier+1,increment)>>>0;
    multiplier=Math.imul(multiplier,multiplier)>>>0;
    draws=Math.floor(draws/2);
  }
  return (Math.imul(accumulatedMultiplier,seed)+accumulatedIncrement)>>>0;
}

/** The village uses two draws per vertex; all other established columns use one.
 * Western extension columns have coordinate-based seeds and do not advance it. */
export function createTerrainSeedLookup({ xs,zs,startColumn=0,seed,villageBounds,extensionSeed }) {
  const rowSeeds=new Uint32Array(zs.length), extraRows=new Uint8Array(zs.length);
  let first=xs.findIndex((x,i)=>i>=startColumn&&x>villageBounds.minX);
  if(first<0)first=xs.length;
  let end=first;while(end<xs.length&&xs[end]<villageBounds.maxX)end++;
  let current=seed;
  for(let j=0;j<zs.length;j++) {
    rowSeeds[j]=current;
    extraRows[j]=zs[j]>villageBounds.minZ&&zs[j]<villageBounds.maxZ?1:0;
    current=advanceTerrainSeed(current,xs.length-startColumn+(extraRows[j]?end-first:0));
  }
  return (i,j)=>i<startColumn?extensionSeed(xs[i],zs[j]):advanceTerrainSeed(rowSeeds[j],i-startColumn+(extraRows[j]?Math.max(0,Math.min(i,end)-first):0));
}
