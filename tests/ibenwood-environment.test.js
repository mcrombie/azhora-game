import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './module-loader.js';
import * as registered from '../src/world/terrain/region-world.js';
import { timberForSpecies } from '../src/gameplay/skills/woodcutting/wood-species.js';
import { createWalkSurfaces } from '../src/world/collision/walk-surfaces.js';
import { canStand } from '../src/gameplay/movement/game-state.js';

const names=['East Ibenwood','North Ibenwood','South Ibenwood','West Ibenwood','Central Ibenwood'];
const geography=registered;
const env=await import('../src/content/regions/ibenwood/ibenwood-environment.js');
const THREE=await sourceModule('../vendor/three.module.js');
const {createIbenwoodRegionalScenery}=await sourceModule('../src/content/regions/ibenwood/ibenwood-regional-scenery.js');
const forest=env.ibenwoodForestTrees();
const ground=(x,z)=>20+.003*x+.006*z;
const colliders=[],scene=createIbenwoodRegionalScenery({parent:new THREE.Group(),heightAt:ground,renderedGroundHeight:ground,colliders});
const floors=createWalkSurfaces(scene.walkSurfaces,ground);
const colliderIndex=new Map(),bucket=(x,z)=>`${Math.floor(x/10)},${Math.floor(z/10)}`;
for(const c of colliders) {
  const hx=(c.r??c.hx)+.34,hz=(c.r??c.hz)+.34;
  for(let ix=Math.floor((c.x-hx)/10);ix<=Math.floor((c.x+hx)/10);ix++)for(let iz=Math.floor((c.z-hz)/10);iz<=Math.floor((c.z+hz)/10);iz++) {
    const key=`${ix},${iz}`;if(!colliderIndex.has(key))colliderIndex.set(key,[]);colliderIndex.get(key).push(c);
  }
}

test('Ibenwood groves and open arrivals belong to the exact authored atlas regions',()=>{
  assert.deepEqual(env.IBENWOOD_NAMES,names);
  assert.equal(names.reduce((n,r)=>n+geography.REGION_CELLS[r].length,0),159);
  assert.equal(env.IBENWOOD_GROVES.length,4);
  assert.equal(env.IBENWOOD_GROVES.filter(g=>g.kind==='royal').length,1);
  for(const g of env.IBENWOOD_GROVES) {
    assert.equal(geography.hexOwnerAt(g.x,g.z),g.region);
    assert.ok(env.ibenwoodProtected(g.x,g.z));
    assert.ok(Math.hypot(g.x-env.IBENWOOD_PILOT.x,g.z-env.IBENWOOD_PILOT.z)>g.radius+87);
    for(const other of env.IBENWOOD_GROVES)if(other!==g)assert.ok(Math.hypot(g.x-other.x,g.z-other.z)>g.radius+other.radius+100);
  }
  for(const n of names) {
    const a=env.IBENWOOD_ARRIVALS[n];assert.equal(geography.hexOwnerAt(a.x,a.z),n);
    assert.ok(forest.every(t=>Math.hypot(t.x-a.x,t.z-a.z)>4+t.radius));
  }
});
test('Forest placement is deterministic, species aware, dense and outside the pilot',()=>{
  assert.deepEqual(env.ibenwoodForestTrees(),forest);
  assert.ok(forest.length>=15000&&forest.length<=25000,`actual forest count ${forest.length}`);
  assert.equal(new Set(forest.map(t=>t.id)).size,forest.length);
  for(const t of forest) {
    assert.equal(geography.hexOwnerAt(t.x,t.z),t.region);
    assert.ok(env.ibenwoodFeatureClear(t.x,t.z,1.1));
    assert.ok(env.ibenwoodWaterClear(t.x,t.z,4));
    assert.ok(Math.hypot(t.x-env.IBENWOOD_PILOT.x,t.z-env.IBENWOOD_PILOT.z)>87);
    assert.ok(timberForSpecies(t.species));
    if(env.ibenwoodProtected(t.x,t.z)) {
      assert.equal(t.harvestable,false);assert.ok(t.protectedReason);assert.ok(env.IBENWOOD_SPECIES.includes(t.species));
    } else { assert.equal(t.harvestable,true);assert.ok(timberForSpecies(t.species).log); }
  }
  for(const n of names.slice(0,4))assert.ok(forest.some(t=>t.region===n&&t.harvestable));
  for(const species of env.IBENWOOD_SPECIES)assert.ok(forest.some(t=>t.species===species));
  assert.ok(scene.metrics.wildTreesPerHectare>scene.metrics.groveTreesPerHectare*5);
});
test('Canopy stairs and landings provide connected supports and clear adult centerlines',()=>{
  assert.equal(scene.walkRoutes.filter(r=>r.id.endsWith('canopy-loop')).length,2);
  const support=(p,s)=>{const found=floors.supportAt(p.x,p.z,{surfaceId:s.id});return found&&Math.abs(found.height-p.y)<.01;};
  for(const s of scene.walkSurfaces) {
    const length=Math.hypot(s.b.x-s.a.x,s.b.z-s.a.z);
    assert.ok(Math.abs(s.b.y-s.a.y)/length<=.5);
    if(s.kind==='deck')assert.equal(s.a.y,s.b.y);
    assert.ok(s.width>=2);
  }
  for(const tread of scene.walkTreads) {
    assert.ok(tread.rise<=.25);assert.ok(tread.depth>=.4);
    const matrix=new THREE.Matrix4();tread.handle.mesh.getMatrixAt(tread.handle.index,matrix);
    assert.ok(Math.abs(matrix.elements[13]+matrix.elements[5]/2-tread.y)<.0001,'rendered tread top matches support height');
    assert.ok(scene.walkSurfaces.some(s=>s.id===tread.surfaceId&&support({x:tread.x,y:tread.y,z:tread.z},s)));
  }
  for(const route of scene.walkRoutes)for(let i=1;i<route.points.length;i++) {
    const a=route.points[i-1],b=route.points[i],n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)*4);
    for(let k=0;k<=n;k++) {
      const t=k/n,p={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t};
      const floor=floors.supportAt(p.x,p.z,{maxY:Infinity});
      assert.ok(floor.id,`${route.id} support`);p.y=floor.height;
      for(const c of colliderIndex.get(bucket(p.x,p.z))??[]) {
        if(c.minY!==undefined&&(p.y+1.8<c.minY||p.y>=c.maxY))continue;
        const hit=c.r!==undefined?Math.hypot(p.x-c.x,p.z-c.z)<c.r+.34:Math.abs(p.x-c.x)<c.hx+.34&&Math.abs(p.z-c.z)<c.hz+.34;
        assert.equal(hit,false,`${route.id} blocked by ${c.kind} at ${p.x},${p.z}`);
      }
    }
  }
});
test('Visible landing floors are supported to their edges and stairs meet them without a lip',()=>{
  assert.equal(scene.walkLandings.length,10);
  const matrix=new THREE.Matrix4(),point=new THREE.Vector3();
  for(const landing of scene.walkLandings) {
    landing.handle.mesh.getMatrixAt(landing.handle.index,matrix);
    for(const x of [-.49,0,.49])for(const z of [-.49,0,.49]) {
      point.set(x,.5,z).applyMatrix4(matrix);
      const floor=floors.supportAt(point.x,point.z,{surfaceId:landing.surfaceId});
      assert.ok(floor,`${landing.surfaceId} visible corner has support`);
      assert.ok(Math.abs(floor.height-point.y)<.001,'drawn and physical deck heights agree');
    }
  }
  for(const route of scene.walkRoutes.filter(r=>r.id.endsWith('canopy-loop')))for(let i=1;i<route.points.length;i++) {
    const a=route.points[i-1],b=route.points[i],length=Math.hypot(b.x-a.x,b.z-a.z),n=Math.ceil(length/.1);
    let previous=floors.supportAt(a.x,a.z,{maxY:Infinity}).height;
    for(let k=1;k<=n;k++) {
      const floor=floors.supportAt(a.x+(b.x-a.x)*k/n,a.z+(b.z-a.z)*k/n,{maxY:previous,stepUp:.35});
      assert.ok(floor.id,`${route.id} stays on its stairs`);
      assert.ok(Math.abs(floor.height-previous)<.052,`${route.id} has no raised landing lip`);
      previous=floor.height;
    }
  }
});

test('Canopy rail spans block crossing between posts while door openings and ground beneath stay clear',()=>{
  const bounds={minX:-10000,maxX:10000,minZ:-10000,maxZ:10000};
  const world={bounds,colliders,nearColliders:(x,z)=>colliderIndex.get(bucket(x,z))??[],heightAt:ground};
  for(const surface of scene.walkSurfaces.filter(s=>s.id.includes('-walk-'))) {
    const dx=surface.b.x-surface.a.x,dz=surface.b.z-surface.a.z,length=Math.hypot(dx,dz),nx=-dz/length,nz=dx/length;
    const grove=scene.groves.find(g=>surface.id.startsWith(g.id));
    for(const t of [.13,.37,.61,.87])for(const side of [-1,1]) {
      const x=surface.a.x+dx*t+nx*side*1.65,z=surface.a.z+dz*t+nz*side*1.65,y=surface.a.y+(surface.b.y-surface.a.y)*t;
      const doorway=surface.id.endsWith('-walk-2')&&side===-1&&z>grove.z-7.5&&z<grove.z-1.5;
      assert.equal(canStand(x,z,world,.34,y),doorway,`${surface.id} rail at ${t}/${side}`);
      if(y-ground(x,z)>2)assert.equal(canStand(x,z,world,.34,ground(x,z)),true,'space beneath a high rail remains walkable');
    }
  }
});

test('Every authored ground-path centerline remains clear of actual tree trunk radii',()=>{
  for(const tree of forest)for(const path of env.IBENWOOD_PATHS)for(let i=1;i<path.points.length;i++)
    assert.ok(env.segmentDistance(tree.x,tree.z,path.points[i-1],path.points[i])>=tree.radius+.34,`${tree.id} obstructs ${path.id}`);
});

test('Forest renders in bounded local batches, grounds trunks and registers harvest handles',()=>{
  assert.equal(scene.trees.length,forest.length+scene.metrics.groveTrees);
  assert.ok(scene.metrics.meshes<2000,`meshes ${scene.metrics.meshes}`);
  assert.ok(scene.metrics.triangles<3500000,`triangles ${scene.metrics.triangles}`);
  const geometry=new Set(),materials=new Set();
  scene.root.traverse(m=>{if(m.isInstancedMesh){geometry.add(m.geometry);materials.add(m.material);assert.ok(m.boundingSphere);assert.ok(m.boundingBox);assert.ok(m.boundingBox.max.x-m.boundingBox.min.x<165);}});
  assert.ok(geometry.size<=7);assert.equal(materials.size,2);
  const trunkById=new Map(colliders.filter(c=>c.id).map(c=>[c.id,c]));
  for(const t of scene.trees) {assert.equal(t.y,ground(t.x,t.z));assert.equal(trunkById.get(t.id)?.species,t.species);}
  assert.equal(env.ibenwoodRegionalGround(0,0,17),17);
  console.log('Ibenwood metrics',JSON.stringify(scene.metrics));
});
test('Root registration exposes all five regions for production integration',()=>{
  for(const [i,n] of names.entries()) {
    assert.equal(registered.REGION_IDS[n],32+i);
    assert.equal(registered.hexOwnerAt(env.IBENWOOD_ARRIVALS[n].x,env.IBENWOOD_ARRIVALS[n].z),n);
    assert.ok(env.ibenwoodWaterClear(env.IBENWOOD_ARRIVALS[n].x,env.IBENWOOD_ARRIVALS[n].z,4));
  }
  assert.equal(env.IBENWOOD_WATER_EDGES.length,21);
  for(const edge of env.IBENWOOD_WATER_EDGES) {
    assert.ok(Math.abs(Math.hypot(edge.a.x-edge.b.x,edge.a.z-edge.b.z)-100/Math.sqrt(3))<.001);
    assert.equal(env.ibenwoodWaterClear((edge.a.x+edge.b.x)/2,(edge.a.z+edge.b.z)/2),false);
  }
});
