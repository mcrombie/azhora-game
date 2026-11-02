import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule} from './module-loader.js';
import {assertRegisteredTrees} from './tree-identity-assertions.js';
import * as THREE from '../vendor/three.module.js';
import {GANUN_TOWN,GANUN_MOUTH,GANUN_BRIDGES,bridgePoint} from '../src/content/regions/ganun/ganun-layout.js';
import {GANUN_BUILDINGS} from '../src/content/regions/ganun/ganun-town.js';
import {OUTER_RIVERS,OUTER_LANDMARKS,outerGround,outerWaterAt,outerCellAt} from '../src/content/regions/outer-regions/outer-regions-world.js';
import {regionBase,groundWithRiver} from '../src/world/terrain/world-terrain.js';
const heightAt=(x,z)=>outerGround(x,z,regionBase(x,z));
const {createGanunScenery}=await sourceModule('../src/content/regions/ganun/ganun-scenery.js');
test('Ganun is on the marked estuary and the preview uses production terrain',()=>{
  assert.equal(outerCellAt(GANUN_TOWN.x,GANUN_TOWN.z).region,'South Ganun');
  assert.ok(OUTER_LANDMARKS.some(p=>p.id===GANUN_TOWN.id));
  for(const b of GANUN_BUILDINGS){assert.equal(outerWaterAt(b.x,b.z),null,b.id);assert.ok(Math.abs(heightAt(b.x,b.z)-groundWithRiver(b.x,b.z))<.001,b.id);}
});
test('Ganun courses join at matching levels and open into the sea',()=>{
  const courses=OUTER_RIVERS.filter(r=>r.ganun),ends=new Map();assert.equal(courses.length,3);
  for(const r of courses){let previous=-Infinity;for(const p of r.points){assert.ok(p.y>=previous);previous=p.y;assert.ok(heightAt(p.x,p.z)<p.y-.5);}
    for(const p of [r.points[0],r.points.at(-1)]){const key=p.x.toFixed(2)+','+p.z.toFixed(2);if(ends.has(key))assert.ok(Math.abs(ends.get(key)-p.y)<.001);ends.set(key,p.y);}}
  assert.ok(heightAt(GANUN_MOUTH.x,GANUN_MOUTH.z)<0);
  for(const b of GANUN_BRIDGES)for(const sign of [-1,1]){const p=bridgePoint(b,sign*(b.length/2+.1));assert.ok(Math.abs(heightAt(p.x,p.z)-b.y)<.5,'bridge landing '+b.id);}
});
test('Ganun geometry remains finite and batched',()=>{
  const parent=new THREE.Group(),colliders=[],town=createGanunScenery({parent,heightAt,colliders});
  assert.equal(assertRegisteredTrees(parent,colliders).length,town.metrics.trees);
  assert.ok(town.metrics.buildings>=25);assert.equal(town.metrics.boats,5);assert.equal(town.metrics.bridges,2);
  let meshes=0,vertices=0;parent.traverse(o=>{if(o.isMesh){meshes++;vertices+=o.geometry.attributes.position.count;assert.ok(o.geometry.attributes.position.array.every(Number.isFinite));}});
  assert.ok(meshes<20);assert.ok(vertices<450000);assert.ok(colliders.length>=GANUN_BUILDINGS.length);
});
