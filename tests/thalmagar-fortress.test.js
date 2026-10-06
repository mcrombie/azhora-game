import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { scopedWorld } from './scoped-world.js';
import { THALMAGAR_FORTRESS as site, thalmagarFortressReserved } from '../src/content/regions/thalmagar/thalmagar-fortress-site.js';
import { ACOR_WILDLIFE_ZONES } from '../src/content/regions/acor/acor-wildlife.js';
import { hexOwnerAt, landDistance } from '../src/world/terrain/region-world.js';
import { canStand, moveCharacter } from '../src/gameplay/movement/game-state.js';
import { BODY, bodyWorld } from '../src/gameplay/combat/bodies.js';
import { SUBREGIONS } from '../src/ui/map/map-fog.js';

const scene=new THREE.Scene(),world=await scopedWorld(scene,[70]);
scene.updateMatrixWorld(true);
test('the original fortress is built once on Cape Thalmagar, with its gate facing the mainland',()=>{
  const root=scene.getObjectByName('The Black Fortress');assert.ok(root);
  assert.equal(root.children.length,3,'architecture only: no duplicate sea, sky, terrain or dead forest');
  assert.equal(root.rotation.y,0);
  const gate=root.localToWorld(new THREE.Vector3(0,65,-109));
  assert.ok(Math.abs(gate.x-site.gate.x)<.01&&Math.abs(gate.z-site.gate.z)<.01);
  assert.ok(site.gate.z>site.z&&site.arrival.z>site.gate.z,'south is inland from the northern headland');
  assert.equal(hexOwnerAt(site.x,site.z),site.region);
  let minShore=Infinity;
  const mesh=root.getObjectByName('Outer fortress walls and battlements'),p=mesh.geometry.attributes.position;
  for(let i=0;i<p.count;i++){
    const v=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);
    minShore=Math.min(minShore,landDistance(v.x,v.z));
  }
  assert.ok(minShore>10,`wall footprint stays ashore: ${minShore}`);
  assert.ok(new THREE.Box3().setFromObject(root).max.y>190,'the original needle crown keeps its scale');
  assert.ok(SUBREGIONS.some(l=>l.id==='thalmagar-black-fortress'));
  assert.ok(world.landmarks.some(l=>l.id==='thalmagar-black-fortress'));
});
test('the cleared approach walks to the gate and back, and visible iron doors block entry',()=>{
  const at={...site.arrival,y:world.heightAt(site.arrival.x,site.arrival.z)};
  const walking=bodyWorld(world).moving(at,BODY.traveler);
  for(const goal of [{x:site.x,z:site.z+70},site.arrival]){
    let steps=0;
    while(Math.hypot(goal.x-at.x,goal.z-at.z)>.05){
      assert.ok(++steps<2000);const before={...at},d=Math.hypot(goal.x-at.x,goal.z-at.z),step=Math.min(.25,d);
      moveCharacter(at,(goal.x-at.x)/d*step,(goal.z-at.z)/d*step,walking,BODY.traveler);
      const moved=Math.hypot(at.x-before.x,at.z-before.z);assert.ok(moved>.01,`blocked at ${at.x},${at.z}`);
      at.y=world.heightAt(at.x,at.z);assert.ok(Math.abs(at.y-before.y)/moved<.75);
      assert.ok(at.y>world.waterAt(at.x,at.z));
    }
  }
  assert.equal(canStand(site.x,site.z+48,world),false,'closed doors have matching collision');
  const cape=world.acorRegions.find(r=>r.name===site.region);
  assert.ok(cape.scenery.trees.every(t=>!thalmagarFortressReserved(t.x,t.z,t.height*.4)));
  for(const zone of ACOR_WILDLIFE_ZONES.filter(z=>z.region===site.region&&!z.air&&!z.float))
    for(const [x,z] of zone.sites)assert.ok(!thalmagarFortressReserved(x,z,24),zone.id);
});
