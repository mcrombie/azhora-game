import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { scopedWorld } from './scoped-world.js';
import { sourceModule } from './module-loader.js';
import { NORTHERN_NAMES, NORTHERN_IDS, NORTHERN_CELLS, NORTHERN_PATHS, NORTHERN_LAKES, northernGround, northernOwns, northernCellAt } from '../src/content/regions/northern-oremindi/northern-oremindi-world.js';
import { NORTHERN_WILDLIFE_ZONES } from '../src/content/regions/northern-oremindi/northern-oremindi-wildlife.js';
import { regions, REGION_IDS } from '../src/world/terrain/region-world.js';
import { isClimbTerrain } from '../src/gameplay/movement/climbing.js';
import { runNorthernChecks } from '../src/dev/checks/northern-oremindi-checks.js';
const scene=new THREE.Scene(),world=await scopedWorld(scene,NORTHERN_IDS);
test('five atlas regions have distinct built terrain, typed trees and working climbing',()=>{
  assert.equal(NORTHERN_CELLS.length,127);
  for(const name of NORTHERN_NAMES){
    const e=world.northernRegions.find(e=>e.name===name),r=regions.find(r=>r.name===name);
    assert.ok(world.loading.isReady(REGION_IDS[name]));assert.ok(e.scenery.metrics.trees>5,name+' woodland');
    assert.ok(e.scenery.metrics.rocks>15,name+' scree');assert.ok(e.ground.metrics.triangles>100);
    assert.ok(isClimbTerrain(world,r.spawn.x,r.spawn.z));
    for(const t of e.scenery.trees)assert.ok(t.species);
  }
  assert.equal(northernGround(0,0,17.123),17.123,'outside terrain untouched');
});
test('natural traverses work with the real movement controller in both directions',()=>{
  const result=runNorthernChecks(world);console.log(JSON.stringify(result));assert.equal(result.journeys.length,10);
});
test('rendered mountains and lake beds agree with collision heights',()=>{
  scene.updateMatrixWorld(true);const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0);
  for(const e of world.northernRegions)for(const c of e.profile.cells.filter((_,i)=>i%3===0)){
    const y=world.heightAt(c.x,c.z);ray.set(new THREE.Vector3(c.x,y+5,c.z),down);
    const hit=ray.intersectObjects(e.ground.patches,false)[0];
    if(hit)assert.ok(Math.abs(hit.point.y-y)<.025,e.name+' visible footing');
  }
  for(const l of NORTHERN_LAKES)assert.ok(world.mapWaters.some(w=>w.id===l.id));
});
test('persistent wildlife populates every region and animates on the actual surface',async()=>{
  const {createWestLife}=await sourceModule('../src/content/regions/western-regions/west-regions-life.js');
  const life=createWestLife(scene,world,{zones:NORTHERN_WILDLIFE_ZONES});
  const initial=life.snapshot();console.log('Northern animals',initial.creatures.length);
  for(const name of NORTHERN_NAMES){
    const animals=initial.creatures.filter(a=>a.region===name&&!a.species.includes('eagle')&&a.species!=='duck');
    assert.ok(animals.length>=6,name+' has grounded animals');
    for(const a of animals){assert.ok(northernOwns(a.x,a.z));assert.ok(Math.abs(a.groundY-world.heightAt(a.x,a.z))<.02,a.id);}
  }
  for(const name of NORTHERN_NAMES){
    const home=initial.creatures.find(a=>a.region===name&&!a.species.includes('eagle')&&a.species!=='duck');
    assert.ok(home,name+' ground wildlife');
    for(let i=0;i<120;i++)life.update(.1,{x:home.x+12,z:home.z+12},true);
    const animals=life.snapshot().creatures.filter(a=>a.region===name&&!a.species.includes('eagle')&&a.species!=='duck');
    assert.ok(animals.some(a=>a.clock>0),name+' wildlife ticked');
    for(const a of animals)assert.ok(Math.abs(a.groundY-world.heightAt(a.x,a.z))<.03,a.id+' animated footing');
  }
  assert.ok(initial.creatures.some(a=>a.species==='duck'));
});
