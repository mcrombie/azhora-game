import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';

const { createHorse } = await sourceModule('../src/characters.js');

test('a horse stands at the height of a rider’s shoulder, hooves at the ground, saddled or bare', () => {
  for (const [variant, saddled] of [[0, false], [1, true], [2, true]]) {
    const horse = createHorse({ variant, saddled });
    assert.equal(horse.group.name, `horse-${variant}${saddled ? '-saddled' : ''}`);
    assert.equal(horse.saddled, saddled);
    for (const name of ['Weight and hips', 'Spine', 'Neck', 'Head', 'Tail', 'Left Fore Hip', 'Right Fore Knee', 'Left Hind Hip', 'Right Hind Knee']) {
      assert.ok(horse.group.getObjectByName(name)?.isGroup, `horse has a ${name}`);
    }
    assert.equal(Boolean(horse.group.getObjectByName('Saddle')), saddled);
    let draws = 0, triangles = 0;
    horse.group.traverse(object => {
      if (!object.isMesh) return;
      draws++; triangles += (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3;
      for (const key of ['position', 'normal']) assert.ok(object.geometry.attributes[key].array.every(Number.isFinite), `invalid ${key}`);
    });
    assert.ok(draws <= 18, `horse draws ${draws} batches`);
    assert.ok(triangles < 6000, `horse has ${triangles} triangles`);
    horse.group.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(horse.group);
    assert.ok(bounds.min.y > -0.08 && bounds.min.y < 0.08, `hooves rest at the ground (${bounds.min.y.toFixed(2)})`);
    assert.ok(bounds.max.y > 1.55 && bounds.max.y < 2.1, `a horse's ears stand above a man's head (${bounds.max.y.toFixed(2)})`);
    assert.ok(bounds.max.z - bounds.min.z > 1.9, `a horse is long (${(bounds.max.z - bounds.min.z).toFixed(2)})`);
    assert.ok(bounds.max.x - bounds.min.x < 0.9, `and narrow (${(bounds.max.x - bounds.min.x).toFixed(2)})`);
  }
});

test('a horse idles, grazes and walks with a four-beat gait that keeps every joint finite', () => {
  const horse = createHorse({ variant: 0 });
  const legs = ['Left Fore Hip', 'Right Fore Hip', 'Left Hind Hip', 'Right Hind Hip'].map(name => horse.group.getObjectByName(name));
  let time = 0;
  for (let i = 0; i < 90; i++) { time += 1 / 30; horse.animate(time, 0, true, { grazing: false }); }
  const head = horse.group.getObjectByName('Head'), neck = horse.group.getObjectByName('Neck');
  const restingNeck = neck.rotation.x;
  for (let i = 0; i < 60; i++) { time += 1 / 30; horse.animate(time, 0, true, { grazing: true }); }
  assert.ok(neck.rotation.x > restingNeck + 0.4, `grazing lowers the neck (${restingNeck.toFixed(2)} → ${neck.rotation.x.toFixed(2)})`);
  const swings = [];
  for (let i = 0; i < 120; i++) {
    time += 1 / 30; horse.animate(time, 1.5, true, {});
    swings.push(legs.map(leg => leg.rotation.x));
  }
  const amplitude = index => Math.max(...swings.map(s => s[index])) - Math.min(...swings.map(s => s[index]));
  for (let i = 0; i < 4; i++) assert.ok(amplitude(i) > 0.5, `leg ${i} swings while walking (${amplitude(i).toFixed(2)})`);
  const last = swings[swings.length - 1];
  assert.ok(Math.abs(last[0] - last[1]) > 0.05 || Math.abs(last[2] - last[3]) > 0.05, 'the legs do not move as one block');
  horse.group.traverse(object => {
    if (!object.isGroup) return;
    for (const value of [...object.position.toArray(), object.rotation.x, object.rotation.y, object.rotation.z]) assert.ok(Number.isFinite(value), object.name);
  });
  assert.ok(Number.isFinite(head.rotation.y));
});
