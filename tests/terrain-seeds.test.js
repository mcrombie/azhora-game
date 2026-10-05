import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceTerrainSeed,createTerrainSeedLookup } from '../src/terrain-seeds.js';

test('terrain seed jumps exactly match the sequential random stream',()=>{
  for(const seed of [0,1,0xffffffff,0x5a2f11b7]) {
    let next=seed;for(let i=0;i<12000;i++) { if(i<20||i%79===0)assert.equal(advanceTerrainSeed(seed,i),next);next=(Math.imul(next,1664525)+1013904223)>>>0; }
  }
});

test('out-of-order terrain sampling preserves full-world colors across village and extension boundaries',()=>{
  const xs=Array.from({length:53},(_,i)=>i*7-130),zs=Array.from({length:49},(_,i)=>i*9-120);
  const villageBounds={minX:-11,maxX:91,minZ:-13,maxZ:84},extensionSeed=(x,z)=>(Math.imul(x,731)+z)>>>0;
  for(const startColumn of [0,2,25,52]) {
    const lookup=createTerrainSeedLookup({xs,zs,startColumn,seed:0x5a2f11b7,villageBounds,extensionSeed});
    let seed=0x5a2f11b7;const expected=[];
    for(let j=0;j<zs.length;j++)for(let i=0;i<xs.length;i++) {
      expected.push(i<startColumn?extensionSeed(xs[i],zs[j]):seed);
      if(i<startColumn)continue;
      seed=advanceTerrainSeed(seed,1);
      if(xs[i]>villageBounds.minX&&xs[i]<villageBounds.maxX&&zs[j]>villageBounds.minZ&&zs[j]<villageBounds.maxZ)seed=advanceTerrainSeed(seed,1);
    }
    for(let k=expected.length-1;k>=0;k--)assert.equal(lookup(k%xs.length,Math.floor(k/xs.length)),expected[k]);
  }
});
