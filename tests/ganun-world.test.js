import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {scopedWorld} from './scoped-world.js';
import {sourceModule} from './module-loader.js';
import {GANUN_BRIDGES,GANUN_QUAYS,bridgePoint} from '../src/content/regions/ganun/ganun-layout.js';
import {GANUN_BUILDINGS} from '../src/content/regions/ganun/ganun-town.js';
const {canStand}=await sourceModule('../src/gameplay/movement/locomotion.js');
const scene=new THREE.Scene(),world=await scopedWorld(scene,[99]);
test('Ganun streams once with solid buildings and walkable bridge and quay routes',()=>{
  let count=0;scene.traverse(o=>{if(o.name==='Ganun Town / estuary market')count++;});assert.equal(count,1);
  for(const b of GANUN_BUILDINGS)assert.equal(canStand(b.x,b.z,world,.34,world.heightAt(b.x,b.z)),false,b.id);
  for(const b of GANUN_BRIDGES)for(let u=-b.length/2-1;u<=b.length/2+1;u+=.5){const p=bridgePoint(b,u);assert.ok(canStand(p.x,p.z,world,.34,world.heightAt(p.x,p.z)),b.id+' '+u);}
  for(const q of GANUN_QUAYS){const long=q.w>q.d,len=long?q.w:q.d;for(let u=-len/2+.5;u<len/2;u+=.5){const x=q.x+(long?u:0),z=q.z+(long?0:u);assert.ok(canStand(x,z,world,.34,world.heightAt(x,z)),`quay ${x},${z}`);}}
});
