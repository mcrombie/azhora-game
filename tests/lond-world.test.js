import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {scopedWorld} from './scoped-world.js';
import {sourceModule} from './module-loader.js';
import {STONEFIST_ASCENT,LOND_BRIDGES,bridgePoint,bridgeHeight} from '../src/content/regions/lond/lond-layout.js';
import {LOND_BUILDINGS,LOND_MARKET_STALLS} from '../src/content/regions/lond/lond-country.js';
const {canStand}=await sourceModule('../src/gameplay/movement/locomotion.js');
const world=await scopedWorld(new THREE.Scene(),[94]);

test('Central Lond loads the real capital and keeps the winding ascent walkable',()=>{
  const scenery=world.outerRegions.find(e=>e.profile.id===94).scenery;
  assert.ok(scenery.metrics.lond.fields>50);
  assert.ok(world.landmarks.some(m=>m.id==='stonefist'));
  assert.ok(world.landmarks.some(m=>m.id==='lond-town'));
  for(const p of STONEFIST_ASCENT){
    assert.ok(Math.abs(world.heightAt(p.x,p.z)-p.y)<.15);
    assert.ok(canStand(p.x,p.z,world,.34,p.y+.1),'real movement at ascent '+STONEFIST_ASCENT.indexOf(p));
  }
});
test('real movement crosses Lond bridges, but cannot walk through town buildings',()=>{
  for(const b of LOND_BRIDGES)for(let u=-b.length/2;u<=b.length/2;u+=1){
    const p=bridgePoint(b,u);assert.ok(Math.abs(world.heightAt(p.x,p.z)-bridgeHeight(b,u))<.01);
    assert.ok(canStand(p.x,p.z,world,.34,world.heightAt(p.x,p.z)),b.id+' has no invisible obstacle at '+u);
  }
  for(const b of LOND_BUILDINGS)assert.equal(canStand(b.x,b.z,world,.34,b.base+.1),false,b.id+' is solid');
});


test('the reworked river market has solid stalls and an open approach to the guildhall',()=>{
  for(const s of LOND_MARKET_STALLS)assert.equal(canStand(s.x,s.z,world,.34,world.heightAt(s.x,s.z)),false,s.id);
  for(let x=-45;x<=-13;x+=.5){const z=-3243;assert.ok(canStand(x,z,world,.34,world.heightAt(x,z)),'market aisle at '+x);}
  for(let z=-3243;z>=-3258;z-=.5){const x=-38.9;assert.ok(canStand(x,z,world,.34,world.heightAt(x,z)),'guildhall approach at '+z);}
});
