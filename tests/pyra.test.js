import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { scopedWorld } from './scoped-world.js';
import { PYRA, PYRA_LANDMARKS, pyraPoint, pyraGround } from '../src/pyra-world.js';
import { runPyraChecks } from '../src/pyra-checks.js';
import { travelPlaces } from '../src/testing-travel.js';
import { canStand } from '../src/game-state.js';
import { regionAt } from '../src/region-world.js';
const scene=new THREE.Scene();
const world=await scopedWorld(scene,PYRA.regions);
test('Pyra spans two regions and preserves the original river channel',()=>{
 const west=pyraPoint(-100,0);assert.equal(regionAt(west.x,west.z).name,'West Pyros');
 const east=pyraPoint(100,0);assert.equal(regionAt(east.x,east.z).name,'East Pyros');
 for(let v=-100;v<=100;v+=5){const p=pyraPoint(0,v);assert.equal(pyraGround(p.x,p.z,17),17);}
 assert.ok(world.pyra.metrics.towers>=12);assert.ok(world.pyra.metrics.buildings>=20);
});
test('a full-size traveler crosses both banks, climbs the spiral into the palace and returns',t=>{
 const result=runPyraChecks(world);assert.equal(result.ok,true);for(const j of result.journeys)t.diagnostic(`${j.id}: ${j.distance.toFixed(1)}m, peak ${j.peak.toFixed(1)}m`);
});
test('rendered bridge, spiral and palace floors match their registered support',()=>{
 scene.updateMatrixWorld(true);const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0);
 for(const s of world.pyra.walkSurfaces.filter((s,i)=>i%8===0||s.id==='pyra-palace-court')){
  const x=(s.a.x+s.b.x)/2,z=(s.a.z+s.b.z)/2,y=(s.a.y+s.b.y)/2;
  ray.set(new THREE.Vector3(x,y+.12,z),down);const hit=ray.intersectObject(world.pyra.root,true)[0];
  assert.ok(hit,`${s.id}: visible floor`);assert.ok(Math.abs(hit.point.y-y)<.065,`${s.id}: drawn ${hit.point.y}, support ${y}`);
 }
});

test('all Pyra travel destinations are dry, clear ground-level arrivals',()=>{
 const entries=[...travelPlaces('West Pyros'),...travelPlaces('East Pyros')];
 for(const p of PYRA_LANDMARKS){assert.ok(canStand(p.x,p.z,world),`${p.id}: safe F8 arrival`);assert.ok(entries.some(e=>e.id===p.id),`${p.id}: listed in Go anywhere`);}
});
test('the city terrain and physical feet share the same visible triangles',()=>{
 scene.updateMatrixWorld(true);const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0);
 for(const [u,v] of [[-140,0],[-81,-45],[81,45],[140,0],[-33,43],[33,-43]]){
  const p=pyraPoint(u,v),y=world.heightAt(p.x,p.z);
  ray.set(new THREE.Vector3(p.x,y+1,p.z),down);const hit=ray.intersectObjects(world.pyraGround.patches,false)[0];
  assert.ok(hit);assert.ok(Math.abs(hit.point.y-y)<.03,`visible terrace at ${u},${v}`);
 }
});
