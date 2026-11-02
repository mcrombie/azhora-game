import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule} from './module-loader.js';
import {createYunethreLifeHost} from '../src/content/regions/minora-frontier/yunethre-life-host.js';
const THREE = await sourceModule('../vendor/three.module.js');
const {createYunethreLife} = await sourceModule('../src/content/regions/minora-frontier/yunethre-life.js');
const {YUNETHRE_TOWN: T, YUNETHRE_CAMP: C} = await sourceModule('../src/content/regions/minora-frontier/yunethre-world.js');
const {groundWithRiver} = await sourceModule('../src/world/terrain/world-terrain.js');
const {regionAt} = await sourceModule('../src/world/terrain/region-world.js');

test('exploration does not import animal rigs until a ready Yunethre visit; disposal cancels late creation', async () => {
  let ready = false, loads = 0, made = 0, resolve;
  const world = {regionAt: x => ({id: x === 38 ? 38 : 16}), loading: {isReady: () => ready}};
  const host = createYunethreLifeHost({}, world, {load: () => {loads++; return new Promise(r => {resolve = r;});}});
  host.update(0, .1, {x: 16, z: 0}); ready = true;
  host.update(0, .1, {x: 16, z: 0}); assert.equal(loads, 0);
  ready = false; host.update(0, .1, {x: 38, z: 0}); assert.equal(loads, 0);
  ready = true; host.update(0, .1, {x: 38, z: 0}); host.update(0, .1, {x: 38, z: 0}); assert.equal(loads, 1);
  host.dispose(); resolve({createYunethreLife() {made++;}}); await new Promise(r => setImmediate(r)); assert.equal(made, 0);
});

test('Yunethre life renders local residents, stays paused with the game and releases distant flocks', () => {
  const scene = new THREE.Scene(), world = {bounds: {minX: -10000, maxX: 10000, minZ: -10000, maxZ: 10000},
    heightAt: groundWithRiver, renderedGroundHeight: groundWithRiver, waterAt: () => -100, colliders: [], paths: [], regionAt,
    enabledRegions: [38], loading: {isReady: () => true}};
  const life = createYunethreLife(scene, world);
  try {
    life.update(0, .1, T); const initial = life.state();
    assert.equal(initial.campResidents, 0, 'Distant camp actors wait for an actual visit'); assert.ok(initial.visuals.loadedGroups > 0);
    assert.deepEqual(new Set(initial.animals.creatures.map(a => a.species)), new Set(['boar', 'red-deer', 'upland-hare', 'hill-sheep', 'plateau-hawk', 'gull']));
    assert.ok(initial.animals.creatures.every(a => [a.x, a.y, a.z].every(Number.isFinite)));
    const stopped = initial.animals; life.update(0, 0, T); assert.deepEqual(life.state().animals, stopped);
    for(let i=0;i<9;i++)life.update(1+i*.1,.1,C);
    assert.equal(life.state().campResidents,6);assert.equal(life.state().camp.people.length,6);
    assert.equal(scene.getObjectByName('Centaur bow practice'),undefined,'The old anonymous cast is replaced, not duplicated');
    const saera=life.residentPeople().find(p=>p.id==='centaur-saera');assert.ok(saera);
    const visitor={x:saera.x+2,y:saera.y,z:saera.z};assert.equal(life.residentTarget(visitor)?.id,saera.id);
    life.setResidentTalking(saera.id,visitor);assert.equal(life.state().camp.speaking,saera.id);life.setResidentTalking(null);
    life.setCampActive(false); life.update(2, .1, C);
    assert.equal(life.residentPeople().some(p=>p.id.startsWith('centaur-')),false,'A defeated camp has no visible or targetable camp residents');
    assert.equal(life.residentTarget(visitor),null);
    assert.equal(life.state().campResidents, 0); life.setCampActive(true);
    life.update(1, .1, {x: 0, z: 0}); assert.equal(life.state().visuals.loadedGroups, 0);
    assert.equal(life.state().camp.people.length,0,'Distant camp rigs are hidden');
  } finally {life.dispose();}
  assert.equal(scene.children.length, 0);
});
