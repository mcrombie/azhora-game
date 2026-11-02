import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {scopedWorld} from './scoped-world.js';
import {sourceModule} from './module-loader.js';
import {ORSA_TOWN,ORSA_DECKS} from '../src/content/regions/orsa/orsa-town-layout.js';
import {ORSA_BUILDINGS} from '../src/content/regions/orsa/orsa-town-buildings.js';
const {canStand}=await sourceModule('../src/gameplay/movement/locomotion.js');
const scene=new THREE.Scene(),world=await scopedWorld(scene,ORSA_TOWN.regions);
test('Orsa streams once across two regions, with solid houses and passable bridge and piers',()=>{
  let count=0;scene.traverse(o=>{if(o.name==='Orsa Town / river mouth')count++;});assert.equal(count,1);
  for(const b of ORSA_BUILDINGS)assert.equal(canStand(b.x,b.z,world,.34,world.heightAt(b.x,b.z)),false,b.id);
  for(const d of ORSA_DECKS){
    const length=Math.hypot(d.b.x-d.a.x,d.b.z-d.a.z),n=Math.ceil(length/.4);
    for(let i=0;i<=n;i++){
      const t=i/n,x=d.a.x+(d.b.x-d.a.x)*t,z=d.a.z+(d.b.z-d.a.z)*t;
      assert.ok(canStand(x,z,world,.34,world.heightAt(x,z)),d.id+' at '+t);
      assert.ok(Math.abs(world.heightAt(x,z)-(d.y0+(d.y1-d.y0)*t))<.08,'rendered/walked '+d.id);
    }
  }
});
