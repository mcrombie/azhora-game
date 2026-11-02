import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {sourceModule} from './module-loader.js';
import {LAKETOWN_FISHING as F} from '../src/content/regions/minora-frontier/laketown-waterfront-layout.js';
import {YUNETHRE_TOWN as T,YUNETHRE_TOWN_LOTS,YUNETHRE_LAKE} from '../src/content/regions/minora-frontier/yunethre-world.js';
import {southOremindiWaterAt} from '../src/content/regions/south-oremindi/south-oremindi-world.js';
import {groundWithRiver} from '../src/world/terrain/world-terrain.js';
import {createWalkSurfaces} from '../src/world/collision/walk-surfaces.js';
const {buildYunethrePromenade}=await sourceModule('../src/content/regions/minora-frontier/yunethre-polish.js');

test('All five architectural traditions reuse the original town lots and keep economy out of scenery',()=>{
 assert.equal(YUNETHRE_TOWN_LOTS.length,17);
 assert.deepEqual(new Set(YUNETHRE_TOWN_LOTS.map(l=>l.style)),new Set(['human','elf','centaur','satyr','dwarf']));
 for(const lot of YUNETHRE_TOWN_LOTS)for(const key of ['population','production','dailyFood','foodCapacity'])assert.ok(!(key in lot));
});

test('The resident fishing route has water clearance for its hull, oars and return turn',()=>{
 assert.equal(F.surface,YUNETHRE_LAKE.surface);assert.equal(F.route[0],F.berth);
 for(let k=1;k<F.route.length;k++){
  const a=F.route[k-1],b=F.route[k],n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z));
  for(let i=0;i<=n;i++)for(let j=0;j<24;j++){
   const angle=j*Math.PI/12,x=a.x+(b.x-a.x)*i/n+Math.cos(angle)*2.8,z=a.z+(b.z-a.z)*i/n+Math.sin(angle)*2.8;
   assert.equal(southOremindiWaterAt(x,z),F.surface,`Fishing clearance at ${x},${z}`);
  }
 }
 assert.ok(Math.hypot(F.berth.x-F.unload.x,F.berth.z-F.unload.z)<3.2);
});

test('The shore house connects to the original pier with matching visible and walkable decks',()=>{
 const root=new THREE.Group(),walkSurfaces=[],colliders=[],metrics={};
 for(const unused of buildYunethrePromenade({root,heightAt:groundWithRiver,walkSurfaces,colliders,metrics})){}
 const support=createWalkSurfaces(walkSurfaces,groundWithRiver),G=F.gangway,A=F.apron;
 assert.equal(walkSurfaces.length,5);assert.equal(metrics.lakeBoats,1);assert.equal(metrics.fishingHuts,1);
 assert.equal(support.supportAt(G.a.x,G.a.z,{surfaceId:'yunethre-tarn-walk-3'}).height,F.deckY);
 assert.equal(support.supportAt(G.b.x,G.b.z,{surfaceId:'laketown-fisher-apron'}).height,F.deckY);
 const paths=[[G.a,G.b],[G.b,{x:F.hut.x,z:F.hut.z-F.hut.d/2-1.5}]];
 for(const path of paths){const [a,b]=path,n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z));
  for(let i=0;i<=n;i++){
   const x=a.x+(b.x-a.x)*i/n,z=a.z+(b.z-a.z)*i/n,hit=support.supportAt(x,z,{maxY:F.deckY,groundSlope:false});
   assert.ok(Math.abs(hit.height-F.deckY)<.001,`Fishing landing unsupported at ${x-T.x},${z-T.z}`);
   for(const c of colliders)assert.ok(Math.hypot(x-c.x,z-c.z)>=c.r+.65,`Approach blocked by ${c.kind}`);
  }
 }
 // The shore platform must stay above the unmodified natural bank, not sink
 // into the same high lake berm the promenade was built to cross.
 for(let x=A.x-A.w/2;x<=A.x+A.w/2;x+=1)for(let z=A.z-A.d/2;z<=A.z+A.d/2;z+=1)
  assert.ok(groundWithRiver(x,z)<=F.deckY+.12,`Bank protrudes through landing at ${x-T.x},${z-T.z}`);
 root.traverse(o=>{if(o.isMesh)for(const value of o.geometry.attributes.position.array)assert.ok(Number.isFinite(value));});
});
