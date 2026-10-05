import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { scopedWorld } from './scoped-world.js';
import { sourceModule } from './module-loader.js';
import { ACOR_NAMES, ACOR_IDS, ACOR_CELLS, ACOR_WATERS, acorGround, acorOwns, acorCellAt } from '../src/acor-world.js';
import { ACOR_WILDLIFE_ZONES } from '../src/acor-wildlife.js';
import { runAcorChecks } from '../src/acor-checks.js';
import { WOOD_SPECIES } from '../src/wood-species.js';
const scene=new THREE.Scene(),world=await scopedWorld(scene,ACOR_IDS);
test('all ten atlas countries build through the production fast loader with typed vegetation',()=>{
  assert.equal(ACOR_CELLS.length,332);
  for(const [i,name] of ACOR_NAMES.entries()){
    assert.ok(world.loading.isReady(ACOR_IDS[i]));const e=world.acorRegions.find(e=>e.name===name);
    assert.ok(e.scenery.metrics.trees>5,name+' trees');assert.ok(e.scenery.metrics.tufts>50,name+' ground vegetation');
    for(const t of e.scenery.trees)assert.ok(WOOD_SPECIES[t.species],name+' '+t.species);
    if(i>=2&&i<=5)assert.ok(e.scenery.trees.some(t=>t.species==='acor'),name+' Acor trees');
    console.log(name,JSON.stringify(e.scenery.metrics));
  }
  assert.equal(acorGround(0,0,17.25),17.25);
  for(const c of ACOR_CELLS.filter(c=>c.terrain==='ocean')){assert.equal(acorOwns(c.x,c.z),false);assert.ok(world.heightAt(c.x,c.z)<world.waterAt(c.x,c.z),'authored inlet remains sea');}
});
test('natural routes are walkable both ways and every mapped pool has a submerged bed',()=>{
  const result=runAcorChecks(world);console.log(JSON.stringify(result));assert.equal(result.journeys.length,20);
  for(const l of ACOR_WATERS)assert.ok(world.mapWaters.some(w=>w.id===l.id));
});
test('wildlife has persistent homes and visible footing throughout the ten countries',async()=>{
  const {createWestLife}=await sourceModule('../src/west-regions-life.js');const life=createWestLife(scene,world,{zones:ACOR_WILDLIFE_ZONES});
  for(const name of ACOR_NAMES){
    const animals=life.snapshot().creatures.filter(a=>a.region===name);assert.ok(animals.length>=8,name);
    const home=animals.find(a=>a.species!=='duck'&&!['plateau-hawk','harrier'].includes(a.species));assert.ok(home,name+' ground wildlife');
    for(let i=0;i<100;i++)life.update(.1,{x:home.x+12,z:home.z+12},true);
    for(const a of life.snapshot().creatures.filter(a=>a.region===name&&a.species!=='duck'&&!['plateau-hawk','harrier'].includes(a.species))){
      assert.equal(acorCellAt(a.x,a.z)?.region,name);assert.ok(Number.isFinite(a.x)&&Number.isFinite(a.y),a.id);
      assert.ok(Math.abs(a.groundY-world.heightAt(a.x,a.z))<.035,a.id+' footing');
    }
  }
  for(const s of ['palmant','long-back','hul','shore-elder'])assert.ok(life.snapshot().creatures.some(a=>a.species==='thalmagar-'+s),s);
});
