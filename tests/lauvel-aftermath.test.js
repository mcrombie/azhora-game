import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand } from '../src/game-state.js';
import { LAUVEL_PEOPLE, LAUVEL_PEOPLE_IDS, LAUVEL_LINES, BEARERS_ROUND, BURIAL, FALLEN, HEWES_GRAVE, bearersAt, bearersStandingBack, fieldPoint } from '../src/lauvel-aftermath.js';
import { LUSCIA_NPCS, LUSCIA_WOLVES } from '../src/luscia-chapter.js';

const { pickUp, layDown, pace, lift, rest } = BEARERS_ROUND;
const CYCLE = 2 * Math.hypot(layDown.x - pickUp.x, layDown.z - pickUp.z) / pace + lift + rest;

test('the bearers go out empty-handed, lift one, carry him to the row, and lay him down', () => {
  const seen = [];
  for (let t = 0; t < CYCLE; t += .25) {
    const b = bearersAt(t);
    if (seen.at(-1) !== b.phase) seen.push(b.phase);
    // Two metres apart, the back one behind the front one on the line they walk.
    assert.ok(Math.abs(Math.hypot(b.front.x - b.back.x, b.front.z - b.back.z) - 2) < 1e-9);
    assert.ok((b.front.x - b.back.x) * Math.sin(b.heading) + (b.front.z - b.back.z) * Math.cos(b.heading) > 1.99);
    if (b.phase === 'carrying') assert.equal(b.carrying, true, `carrying at ${t}s`);
    if (b.phase === 'returning') assert.equal(b.carrying, false, `going back empty at ${t}s`);
  }
  assert.deepEqual(seen, ['lifting', 'carrying', 'laying', 'returning']);
  assert.equal(bearersAt(0).carrying, false, 'he is lifted halfway through the pause, not before');
  assert.equal(bearersAt(lift * .75).carrying, true);
  // The round repeats, and it runs from where the dead lie to the head of the shroud row.
  for (const t of [1.3, 9.2, 21.7]) {
    const a = bearersAt(t), b = bearersAt(t + CYCLE * 3);
    assert.ok(Math.abs(a.front.x - b.front.x) < 1e-6 && Math.abs(a.front.z - b.front.z) < 1e-6 && a.phase === b.phase);
  }
  assert.ok(FALLEN.some(f => Math.hypot(fieldPoint(f.dx, f.dz).x - pickUp.x, fieldPoint(f.dx, f.dz).z - pickUp.z) < 3), 'they lift the dead where the dead are');
  const row = BURIAL.shrouds.at(-1);
  assert.ok(Math.abs(fieldPoint(row.dx, row.dz).z - layDown.z) < 1e-9 && layDown.x > fieldPoint(row.dx, row.dz).x, 'and lay them at the end of the row');
});

test('when there is a fight on the field the bearers put the dead man down at the row and stand back', () => {
  const back = bearersStandingBack();
  assert.equal(back.carrying, false);
  assert.equal(back.phase, 'standing-back');
  assert.ok(Math.hypot(back.front.x - layDown.x, back.front.z - layDown.z) < 1e-9);
});

test('everyone on the field has a name, something to say, and an id of their own', () => {
  assert.equal(new Set(LAUVEL_PEOPLE_IDS).size, LAUVEL_PEOPLE.length);
  assert.deepEqual(Object.keys(LAUVEL_LINES).sort(), [...LAUVEL_PEOPLE_IDS].sort());
  for (const person of LAUVEL_PEOPLE) {
    assert.ok(person.name && person.role, `${person.id} is somebody`);
    assert.ok(LAUVEL_LINES[person.id].length >= 2, `${person.name} has more than one thing to say`);
    assert.ok(!LUSCIA_NPCS.some(npc => npc.id === person.id), `${person.id} is not already one of the chapter's people`);
  }
  // The two mourners are down on the ground; the gravedigger digs; the bearers are the round's.
  assert.deepEqual(LAUVEL_PEOPLE.filter(p => p.posture).map(p => [p.name, p.posture]), [['Sela', 'kneel'], ['Kerrin', 'sit-ground']]);
  assert.deepEqual(LAUVEL_PEOPLE.filter(p => p.bearer).map(p => p.bearer), ['front', 'back']);
  assert.equal(LAUVEL_PEOPLE.filter(p => p.digs).length, 1);
});

test('the gravedigger is turned towards the grave he is digging', () => {
  // His spade swings straight out in front of him, so his yaw is not decoration: it is the
  // difference between digging the grave and digging the turf beside it. Anything that turns him
  // - the traveler stopping to talk, a scare off the field - has to turn him back again, which is
  // what the facing loan in src/bodies.js is for.
  const hewe = LAUVEL_PEOPLE.find(person => person.digs);
  const grave = fieldPoint(BURIAL.graves[HEWES_GRAVE].dx, BURIAL.graves[HEWES_GRAVE].dz);
  assert.equal(BURIAL.graves[HEWES_GRAVE].open, true, 'the grave he stands at has been filled in');
  const toGrave = Math.atan2(grave.x - hewe.x, grave.z - hewe.z);
  const off = Math.abs(Math.atan2(Math.sin(toGrave - hewe.yaw), Math.cos(toGrave - hewe.yaw)));
  assert.ok(off < .25, `${hewe.name} faces ${(off * 180 / Math.PI).toFixed(0)} degrees away from his own grave`);
  const reach = Math.hypot(grave.x - hewe.x, grave.z - hewe.z);
  assert.ok(reach > .5 && reach < 2, `he is ${reach.toFixed(2)}m from it, which is not a spade's length`);
});

test('the field at the Lauvel has its dead and its graves, and its people have footing off the road and out of the wolves’ way', async () => {
  const { createWorld } = await sourceModule('../src/world.js');
  const scene = new THREE.Scene();
  const world = createWorld(scene);
  assert.ok(scene.getObjectByName('The field at the Lauvel, after'), 'the field is built');
  // How far from the middle of the nearest road.
  const segments = world.paths.flatMap(path => path.slice(1).map((b, i) => [path[i], b]));
  const road = (x, z) => Math.min(...segments.map(([a, b]) => {
    const dx = b.x - a.x, dz = b.z - a.z, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1)));
    return Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
  }));
  for (const person of LAUVEL_PEOPLE) {
    assert.ok(canStand(person.x, person.z, world, .45), `${person.name} has footing`);
    assert.ok(road(person.x, person.z) > 6, `${person.name} is off the road`);
    for (const wolf of LUSCIA_WOLVES.enemies) assert.ok(Math.hypot(person.x - wolf.x, person.z - wolf.z) > 8, `${person.name} is clear of where the wolves come in`);
  }
  for (let t = 0; t < CYCLE; t += .5) {
    const b = bearersAt(t);
    for (const [who, at] of [['front', b.front], ['back', b.back]]) assert.ok(canStand(at.x, at.z, world, .4), `the ${who} bearer has footing ${b.phase} at ${t}s`);
  }
  for (const f of FALLEN) { const p = fieldPoint(f.dx, f.dz); assert.ok(road(p.x, p.z) >= 3, `nobody lies on the road at ${f.dx},${f.dz}`); }
});
