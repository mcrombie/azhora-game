import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand } from '../src/game-state.js';
import { REFUGEES, REFUGEES_ENABLED, REFUGEE_IDS, REFUGEE_PACE, REFUGEE_REST, REFUGEE_RESTS, REFUGEE_START, REFUGEE_STANDS,
  refugee, speechFor, createRefugees, validateRefugeesSnapshot, refugeeConversation } from '../src/refugees.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Switched off at the user's request (2026-09-21, "they get in the way, just disable them for
 * now"): the host must stand nobody in the world, move nobody, and say nothing when they arrive,
 * while everything below still holds so the switch can be thrown back without a rebuild.
 */
test('the three are disabled for now: one switch, and the host reads it at every place it would show them', () => {
  assert.equal(REFUGEES_ENABLED, false, 'the user asked for them off; turn this on only when asked');
  const main = readFileSync(fileURLToPath(new URL('../src/main.js', import.meta.url)), 'utf8');
  assert.match(main, /if\(REFUGEES_ENABLED\)for\(const person of REFUGEES\)\{/, 'nobody is stood in the world unless the switch is on');
  assert.match(main, /if\(REFUGEES_ENABLED&&event\.type==='refugees-arrived'\)toast\(/, 'the landing hears nothing unless the switch is on');
  assert.match(main, /if\(REFUGEES_ENABLED\)for\(const walker of refugees\.positions\(\)\)\{/, 'nobody is moved unless the switch is on');
});

let built = null;
async function road() {
  built ??= (async () => {
    const { createWorld } = await sourceModule('../src/world.js');
    const world = createWorld(new THREE.Scene());
    const route = world.paths[0].slice(0, REFUGEE_START + 1).reverse().map(point => ({ x: point.x, z: point.z }));
    return { world, route };
  })();
  return built;
}
const walkers = route => createRefugees({ route, stands: REFUGEE_STANDS });

test('three of them, and they do not agree', () => {
  assert.equal(REFUGEES.length, 3);
  assert.deepEqual(REFUGEES.map(person => person.side).sort(), ['empire', 'neither', 'rebel']);
  assert.equal(new Set(REFUGEES.map(person => person.modelRole)).size, 3, 'they should not all look the same');
  assert.equal(refugee('nobody'), null);
  for (const id of REFUGEE_IDS) {
    for (const arrived of [false, true]) {
      const lines = speechFor(id, arrived);
      assert.ok(lines?.length >= 3, `${id} ${arrived ? 'arrived' : 'road'}`);
      assert.ok(lines.every(line => line.length > 40));
    }
    assert.notDeepEqual(speechFor(id, false), speechFor(id, true), `${id} should say something else once they are here`);
  }
  // The peacemaker names the other two, because that is the whole of her position.
  const peace = speechFor('refugee-peace', false).join(' ');
  assert.ok(peace.includes('Aldis') && peace.includes('Berick'));
});

test('they start at the Lauvel and walk the real road to the landing', async () => {
  const { world, route } = await road();
  const people = walkers(route);
  assert.ok(people.total > 800 && people.total < 1000, `the walk is ${people.total.toFixed(0)} m`);
  const start = people.positions();
  assert.equal(world.regionAt(start[0].x, start[0].z)?.name, 'Luscia', 'they set out from the battle, which is in Luscia');
  assert.ok(start.every(walker => !walker.arrived && walker.pace === REFUGEE_PACE));
  // They walk in a loose file, not on top of each other.
  for (let i = 1; i < start.length; i++) {
    const gap = Math.hypot(start[i].x - start[i - 1].x, start[i].z - start[i - 1].z);
    assert.ok(gap > 1.5 && gap < 6, `walker ${i} is ${gap.toFixed(1)} m from the one ahead`);
  }
  // Every step of the road they walk is ground a person could stand on.
  for (let d = 0; d <= people.total; d += 20) {
    const point = people.along(d);
    assert.ok(canStand(point.x, point.z, world, .5), `the road is blocked ${d} m along at ${point.x.toFixed(0)},${point.z.toFixed(0)}`);
  }
});

test('where they are depends on how long the game has been played', async () => {
  const { world, route } = await road();
  const people = walkers(route);

  people.setClock(60);
  const early = people.positions()[0];
  assert.equal(world.regionAt(early.x, early.z)?.name, 'Luscia', 'a minute in, they are still in Luscia');

  // The straightforward traveler heads west and meets them coming the other way.
  people.setClock(8 * 60);
  const middle = people.positions()[0];
  assert.ok(!people.arrived, 'they have not arrived after eight minutes');
  assert.ok(middle.x > early.x, 'they are further east');
  assert.ok(people.walked > 200 && people.walked < people.total - 100, `eight minutes puts them ${people.walked.toFixed(0)} m along`);

  // They rest twice, which is why they take longer than the arithmetic says.
  const plain = people.total / REFUGEE_PACE;
  assert.ok(!createRefugees({ route, stands: REFUGEE_STANDS, onEvent: () => {} }).arrived);
  const resting = walkers(route);
  resting.setClock(plain);
  assert.ok(!resting.arrived, 'the rests should still be owed at the walking time');
  resting.setClock(plain + REFUGEE_RESTS.length * REFUGEE_REST + 5);
  assert.ok(resting.arrived, 'and paid by the time the rests are over');
  assert.ok(plain + REFUGEE_RESTS.length * REFUGEE_REST > 900, 'a dawdler in Tidehaven should have a quarter of an hour before they turn up');
});

test('once they arrive they stand in the village, on ground a person can stand on', async () => {
  const { world, route } = await road();
  const people = walkers(route);
  let arrivals = 0;
  const watched = createRefugees({ route, stands: REFUGEE_STANDS, onEvent: event => { if (event.type === 'refugees-arrived') arrivals++; } });
  watched.setClock(4000);
  watched.setClock(4200);
  assert.equal(arrivals, 1, 'the village is told once');

  people.setClock(4000);
  assert.equal(people.arrived, true);
  const stands = people.positions();
  assert.equal(stands.length, 3);
  for (const stand of stands) {
    assert.equal(stand.arrived, true);
    assert.equal(stand.pace, 0, 'they have stopped walking');
    assert.equal(world.regionAt(stand.x, stand.z)?.name, 'Drent');
    assert.ok(canStand(stand.x, stand.z, world, .5), `${stand.id} arrived inside something`);
    for (const other of Object.values(world.npcPositions)) {
      assert.ok(Math.hypot(other.x - stand.x, other.z - stand.z) > 3, `${stand.id} is standing on top of somebody`);
    }
  }
  assert.equal(new Set(stands.map(stand => `${stand.x},${stand.z}`)).size, 3, 'they stand in three different places');
});

test('their road survives a save, and a bad one is refused', async () => {
  const { route } = await road();
  const people = walkers(route);
  people.setClock(300);
  people.meet('refugee-rebel');
  const saved = people.snapshot();
  assert.equal(validateRefugeesSnapshot(saved), true);
  assert.equal(validateRefugeesSnapshot(undefined), true);
  assert.equal(validateRefugeesSnapshot(undefined, { allowMissing: false }), false);
  for (const bad of [null, [], { version: 2, walked: 0, met: [] }, { version: 1, walked: -1, met: [] },
    { version: 1, walked: 0, met: ['nobody'] }, { version: 1, walked: 0, met: ['refugee-rebel', 'refugee-rebel'] }]) {
    assert.equal(validateRefugeesSnapshot(bad), false, JSON.stringify(bad));
  }
  const other = walkers(route);
  assert.equal(other.restore(saved), true);
  assert.ok(Math.abs(other.walked - people.walked) < .001);
  assert.equal(other.met('refugee-rebel'), true);
  assert.equal(other.met('refugee-empire'), false);
  assert.equal(other.restore({ version: 1, walked: 'far', met: [] }), false);
  assert.equal(other.walked, 0);
});

test('meeting them says who they are the first time and not the second', async () => {
  const { route } = await road();
  const people = walkers(route);
  const npc = { id: 'refugee-empire' };
  let opened = null, acted = null;
  const context = { refugees: people, closeDialogue: () => {}, act: (action, id) => { acted = [action, id]; },
    openDialogue: (who, lines, _p, _d, options = {}) => { opened = { who, lines, ...options }; } };

  assert.equal(refugeeConversation({ id: 'not-a-refugee' }, context), false);
  assert.equal(refugeeConversation(npc, context), true);
  assert.deepEqual(acted, ['meet-refugee', 'refugee-empire']);
  assert.ok(opened.lines[0].includes('Berick Hale'), 'he says his name the first time');
  assert.ok(opened.lines[0].includes('Lauvel'));

  people.meet('refugee-empire');
  refugeeConversation(npc, context);
  assert.ok(!opened.lines[0].includes('Berick Hale'), 'and not the second');
  assert.deepEqual(opened.lines, [...speechFor('refugee-empire', false)]);

  people.setClock(4000);
  refugeeConversation(npc, context);
  assert.deepEqual(opened.lines, [...speechFor('refugee-empire', true)], 'once they are here they have something else to say');
  assert.equal(opened.dismiss, undefined);
});

test('a company with no road to walk is empty rather than broken', () => {
  // `along` answers null when there is no road, and `arrived` and `setClock` both check the
  // total before they do anything. `positions` used to take `along`'s answer without asking
  // and threw on it, so constructing the company before its route was known was a trap.
  for (const route of [undefined, [], [{ x: 0, z: 0 }]]) {
    const company = createRefugees(route === undefined ? undefined : { route, stands: REFUGEE_STANDS });
    assert.deepEqual(company.positions(), [], `a route of ${JSON.stringify(route)} put people on the road`);
    assert.equal(company.arrived, false);
    assert.equal(company.setClock(90), false, 'a company with nowhere to go cannot have got there');
    assert.deepEqual(company.positions(), [], 'and still nobody after the clock moved');
    assert.equal(validateRefugeesSnapshot(company.snapshot()), true, 'its snapshot is still a valid one');
  }
});
