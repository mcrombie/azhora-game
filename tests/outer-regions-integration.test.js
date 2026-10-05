import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { scopedWorld } from './scoped-world.js';
import { sourceModule } from './module-loader.js';
import { OUTER_IDS, OUTER_NAMES, outerProfile } from '../src/outer-regions-world.js';
import { OUTER_WILDLIFE_ZONES } from '../src/outer-regions-wildlife.js';
import { runOuterChecks } from '../src/outer-regions-checks.js';
import { WOOD_SPECIES } from '../src/wood-species.js';
const scene=new THREE.Scene(),world=await scopedWorld(scene,OUTER_IDS);
test('all 34 environments build through the production loader and their passes can be walked both ways',()=>{
  for(const id of OUTER_IDS)assert.ok(world.loading.isReady(id),id);
  const result=runOuterChecks(world);assert.equal(result.journeys.length,68);
  console.log(JSON.stringify(result));
});
test('new regional scenery has grounded species-bearing trees, surface detail and bounded batches',()=>{
  const owners=new Map();
  for(const e of world.outerRegions){
    const p=outerProfile(e.name),m=e.scenery.metrics;
    if(p.trees.length)assert.ok(m.trees>=3,e.name+' trees');else assert.equal(m.trees,0,e.name);
    assert.ok(m.rocks>25,e.name+' rocks');assert.ok(m.tufts>25,e.name+' ground cover');
    for(const t of e.scenery.trees){assert.ok(WOOD_SPECIES[t.species],t.species);assert.ok(Math.abs(t.y-world.renderedGroundHeight(t.x,t.z))<.01,e.name+' root');}
    e.scenery.root.traverse(mesh=>{if(mesh.isInstancedMesh){assert.ok(!owners.has(mesh.geometry)||owners.get(mesh.geometry)===e.name,'regions own their batch geometry');owners.set(mesh.geometry,e.name);assert.ok(mesh.count<10000,mesh.name);assert.ok(mesh.geometry.attributes.position.array.every(Number.isFinite),mesh.name);}});
  }
});
test('the production wildlife system creates ground populations and updates them in every new region',async()=>{
  const {createWestLife}=await sourceModule('../src/west-regions-life.js');
  const life=createWestLife(scene,world,{zones:OUTER_WILDLIFE_ZONES});
  for(const zone of OUTER_WILDLIFE_ZONES.filter(z=>z.sea)){const [x,z]=zone.sites[0];life.update(.1,{x,z},true);assert.ok(life.snapshot().creatures.some(a=>a.id.startsWith(zone.id)&&Number.isFinite(a.y)),zone.id);}
  for(const n of OUTER_NAMES){
    const initial=life.snapshot().creatures.filter(a=>a.region===n);assert.ok(initial.length>=5,n+' actual animals');
    const a=initial.find(a=>!['gull','harrier','plateau-hawk','grey-seal','dolphin'].includes(a.species));assert.ok(a,n+' ground population');
    for(let i=0;i<12;i++)life.update(.1,{x:a.x+15,z:a.z+10},true);
    for(const b of life.snapshot().creatures.filter(b=>b.region===n)){assert.ok(Number.isFinite(b.x)&&Number.isFinite(b.y),b.id);}
  }
});
