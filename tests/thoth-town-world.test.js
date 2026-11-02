import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {sourceModule} from './module-loader.js';
import {scopedWorld} from './scoped-world.js';
import {THOTH_TOWN,THOTH_DECKS,THOTH_LANES} from '../src/content/regions/thoth/thoth-town-layout.js';
import {THOTH_BUILDINGS} from '../src/content/regions/thoth/thoth-town-buildings.js';
const {canStand}=await sourceModule('../src/gameplay/movement/locomotion.js');
const scene=new THREE.Scene(),world=await scopedWorld(scene,THOTH_TOWN.regions);
test('Thoth streams once, with solid houses and usable bridge, landing and streets',()=>{
  let count=0;scene.traverse(o=>{if(o.name==='Thoth Town / river bend')count++;});assert.equal(count,1);
  for(const s of THOTH_BUILDINGS)assert.equal(canStand(s.x,s.z,world,.34,world.heightAt(s.x,s.z)),false,s.id);
  function walk(a,b,label){const n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.5);for(let i=0;i<=n;i++){const x=a.x+(b.x-a.x)*i/n,z=a.z+(b.z-a.z)*i/n;assert.ok(canStand(x,z,world,.34,world.heightAt(x,z)),label+' at '+i+'/'+n);}}
  for(const d of THOTH_DECKS)walk(d.a,d.b,d.id);
  for(const [i,l] of THOTH_LANES.entries())for(let j=1;j<l.length;j++)walk(l[j-1],l[j],'lane '+i);
});
