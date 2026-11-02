import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {sourceModule} from './module-loader.js';
import {scopedWorld} from './scoped-world.js';
import {NONTH_TOWN,NONTH_DECKS,NONTH_LANES,nonthPoint} from '../src/content/regions/nonth/nonth-town-layout.js';
import {NONTH_BUILDINGS} from '../src/content/regions/nonth/nonth-town-buildings.js';
const {canStand}=await sourceModule('../src/gameplay/movement/locomotion.js');
const scene=new THREE.Scene(),world=await scopedWorld(scene,NONTH_TOWN.regions);

test('Nonth streams once, with solid houses and usable streets, quay and open market aisle',()=>{
  let count=0;scene.traverse(o=>{if(o.name==='Nonth Town / west bank')count++;});assert.equal(count,1);
  for(const s of NONTH_BUILDINGS)assert.equal(canStand(s.x,s.z,world,.34,world.heightAt(s.x,s.z)),false,s.id);
  function walk(a,b,label){const n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.5);for(let i=0;i<=n;i++){const x=a.x+(b.x-a.x)*i/n,z=a.z+(b.z-a.z)*i/n;assert.ok(canStand(x,z,world,.34,world.heightAt(x,z)),label+' at '+i+'/'+n);}}
  for(const d of NONTH_DECKS)walk(d.a,d.b,d.id);
  for(const [i,l] of NONTH_LANES.entries())for(let j=1;j<l.length;j++)walk(l[j-1],l[j],'lane '+i);
  walk(nonthPoint(-8,-4),nonthPoint(-8,23),'covered market aisle');
});
