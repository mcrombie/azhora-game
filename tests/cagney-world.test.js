import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { CAGNEY, CAGNEY_START, CAGNEY_ROUTE, CAGNEY_HOME, CAGNAPPERS, CAGNEY_AMBUSH } from '../src/cagney-quest.js';
import { bodyWorld, stepToward, BODY } from '../src/bodies.js';
import { canStand } from '../src/game-state.js';

const { createWorld } = await sourceModule('../src/world.js');
const scene = new THREE.Scene(), world = createWorld(scene);

test('Cagney can walk from the prophet along the actual west road and through Ambron to her front door', () => {
  const position = { ...CAGNEY_START }, nav = bodyWorld(world).moving(position, BODY.person);
  assert.ok(canStand(position.x, position.z, world, BODY.person), 'her starting place is clear');
  for (const [index, target] of CAGNEY_ROUTE.entries()) {
    assert.ok(canStand(target.x, target.z, world, BODY.person), `waypoint ${index} is clear`);
    const budget = Math.ceil((Math.hypot(target.x - position.x, target.z - position.z) * 2 + 30) / (2.8 / 30));
    let frames = 0;
    while (frames++ < budget && Math.hypot(target.x - position.x, target.z - position.z) > .25) {
      const before = { ...position };
      stepToward(position, target, 2.8 / 30, nav, BODY.person);
      assert.ok(Math.hypot(position.x - before.x, position.z - before.z) <= 2.8 / 30 + 1e-7, 'walking never teleports');
      assert.ok(canStand(position.x, position.z, world, BODY.person), 'she never clips through scenery');
    }
    assert.ok(Math.hypot(target.x - position.x, target.z - position.z) <= .25,
      `stalled before waypoint ${index} at ${position.x.toFixed(2)}, ${position.z.toFixed(2)}`);
  }
  assert.ok(Math.hypot(position.x - CAGNEY_HOME.x, position.z - CAGNEY_HOME.z) < .25);
});

test('the Cagnappers and retreat checkpoint have dry usable ground', () => {
  for (const p of [...CAGNAPPERS, CAGNEY_AMBUSH.checkpoint]) {
    assert.ok(canStand(p.x, p.z, world, BODY.person), `clear ground at ${p.x}, ${p.z}`);
    assert.ok(world.heightAt(p.x, p.z) > world.waterAt(p.x, p.z), 'the ambush is not in water');
  }
});

test('Cagney keeps her long hair, glasses and shirt ribbons on the ordinary civilian rig', async () => {
  const { createCharacter } = await sourceModule('../src/characters.js');
  const actor = createCharacter({ role: CAGNEY.modelRole, tunic: CAGNEY.color, look: CAGNEY.look });
  assert.ok(actor.group.getObjectByName('Shirt ribbons'));
  assert.ok(actor.group.getObjectByName('Spectacles'));
  for (let frame = 0; frame < 60; frame++) actor.animate(frame / 30, 1, true, {});
  actor.group.traverse(object => {
    assert.ok([...object.position.toArray(), ...object.scale.toArray()].every(Number.isFinite));
  });
});


test('cagnappers wait off the road in permanent shrubs and can step out of their cover',()=>{
  assert.ok(scene.getObjectByName('Cagnapper ambush undergrowth'));
  assert.equal(world.colliders.filter(c=>c.kind==='cagnapper-sapling').length,6);
  for(const foe of CAGNAPPERS){
    assert.ok(Math.abs(foe.z-CAGNEY_AMBUSH.center.z)>6,'Ambushers are off the road');
    const position={x:foe.x,z:foe.z},nav=bodyWorld(world).moving(position,BODY.person);
    for(let n=0;n<300&&Math.hypot(position.x-CAGNEY_AMBUSH.center.x,position.z-CAGNEY_AMBUSH.center.z)>.3;n++)
      stepToward(position,CAGNEY_AMBUSH.center,2.8/30,nav,BODY.person);
    assert.ok(Math.hypot(position.x-CAGNEY_AMBUSH.center.x,position.z-CAGNEY_AMBUSH.center.z)<.3,'Cover leaves an exit to the road');
  }
});

test('Cagney has a named mailbox beside her distinctive doorway without blocking the escort',()=>{
  assert.ok(scene.getObjectByName("Cagney's painted doorway and window boxes"));
  assert.ok(scene.getObjectByName('Cagney mailbox'));
  assert.ok(scene.getObjectByName('Cagney mailbox nameplate'));
  const box=world.colliders.find(c=>c.kind==='cagney-mailbox');assert.ok(box);
  assert.ok(Math.hypot(box.x-CAGNEY_HOME.x,box.z-CAGNEY_HOME.z)>2);
  assert.ok(canStand(CAGNEY_HOME.x,CAGNEY_HOME.z,world,BODY.person));
});
