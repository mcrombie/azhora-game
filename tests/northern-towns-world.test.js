import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {scopedWorld} from './scoped-world.js';
import {sourceModule} from './module-loader.js';
import {NORTHERN_TOWNS} from '../src/content/regions/northern-towns/northern-towns-layout.js';
import {NORTHERN_TOWN_BUILDINGS} from '../src/content/regions/northern-towns/northern-towns-buildings.js';
const {canStand}=await sourceModule('../src/gameplay/movement/locomotion.js');
const scene=new THREE.Scene(),world=await scopedWorld(scene,[102,103,104,105]);
for(const t of NORTHERN_TOWNS)test(t.name+' streams once across both banks with solid houses and walkable crossings',()=>{
  let count=0;scene.traverse(o=>{if(o.name===t.name+' / river mouth')count++;});assert.equal(count,1);
  for(const b of NORTHERN_TOWN_BUILDINGS[t.id])assert.equal(canStand(b.x,b.z,world,.34,world.heightAt(b.x,b.z)),false,b.id);
  const b=t.bridge;for(let x=b.x-b.length/2-1;x<=b.x+b.length/2+1;x+=.5)assert.ok(canStand(x,b.z,world,.34,world.heightAt(x,b.z)),`bridge ${x}`);
  for(const q of t.quays){const long=q.w>q.d,len=long?q.w:q.d;for(let u=-len/2+.5;u<len/2;u+=.5){const x=q.x+(long?u:0),z=q.z+(long?0:u);assert.ok(canStand(x,z,world,.34,world.heightAt(x,z)),`quay ${x},${z}`);}}
});
