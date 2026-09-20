import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { SALTWIND_LIGHT, ADDISON, ADDISON_STAND, LIGHT_HEAD_LOCAL, SIGHTLINES, LIGHT_WORK, WRECK_BOOK,
  WEATHER_LORE, HER_OWN, FROM_THE_GALLERY, SEEN_FROM_THE_LIGHT, createLightKeeper, addisonConversation,
  validateLightSnapshot } from '../src/lighthouse.js';
import { villageToWorld, SEA_LEVEL } from '../src/region-world.js';
import { createBatmanHunt } from '../src/batman.js';
import { createMapFog } from '../src/map-fog.js';

function talk(npc, context) {
  const screens = [], acted = [];
  addisonConversation(npc, {
    openDialogue: (who, lines, event, action, options = {}) => screens.push({ lines, ...options }),
    closeDialogue: () => {}, act: id => acted.push(id), ...context,
  });
  return { screens, acted,
    pick: id => screens.at(-1).choices.find(choice => choice.id === id)?.action(),
    has: id => screens.at(-1).choices.some(choice => choice.id === id) };
}
const npc = { id: ADDISON.id };

test('the light stands on the head, and everything on it is inside its own wall', () => {
  const L = SALTWIND_LIGHT, head = villageToWorld(LIGHT_HEAD_LOCAL.lx, LIGHT_HEAD_LOCAL.lz);
  assert.equal(L.head.x, head.x);
  assert.equal(L.head.z, head.z);
  // The tower is on the head; the cottage, store and bell are all within a stone's throw of it.
  for (const part of [L.cottage, L.store, L.bell, L.staff, L.gate]) {
    assert.ok(Math.hypot(part.x - L.tower.x, part.z - L.tower.z) < 12, 'everything is on the head');
  }
  // It tapers, and it is tall enough to be worth climbing.
  assert.ok(L.tower.top < L.tower.base);
  assert.ok(L.tower.height > 10);
  // The yard wall is open to landward only, which is where the lane and Addison are.
  assert.ok(L.yard.openFrom < L.yard.openTo);
  // She stands inside her own yard, and clear of everything in it that is solid.
  assert.ok(Math.hypot(ADDISON_STAND.x - L.yard.x, ADDISON_STAND.z - L.yard.z) < L.yard.radius - 1, 'inside the wall');
  assert.ok(Math.hypot(ADDISON_STAND.x - L.tower.x, ADDISON_STAND.z - L.tower.z) > L.tower.base + 1, 'clear of the tower');
  assert.ok(Math.hypot(ADDISON_STAND.x - L.cottage.x, ADDISON_STAND.z - L.cottage.z) > 4, 'clear of the cottage');
});

test('she looks out over water from a head that has nothing growing on it', async () => {
  const { createWorld } = await sourceModule('../src/world.js');
  const scene = new THREE.Scene(), world = createWorld(scene);
  const L = SALTWIND_LIGHT;
  // The head is well above the sea, and the water is close on the seaward side.
  assert.ok(world.heightAt(L.tower.x, L.tower.z) > SEA_LEVEL + 6, 'eight metres of headland');
  // Sea on two sides of it: the local frame is rotated against the world, so check the compass.
  const wet = [[0, 34], [0, -34], [34, 0], [-34, 0], [26, 26], [-26, 26], [26, -26], [-26, -26]]
    .filter(([dx, dz]) => world.heightAt(L.tower.x + dx, L.tower.z + dz) < SEA_LEVEL);
  assert.ok(wet.length >= 2, `open water off at least two sides of the head, found ${wet.length}`);
  // The light went up. Its meshes are merged into the world's batches, so the groups and the
  // colliders are what a test can hold on to.
  assert.ok(scene.getObjectByName('The Saltwind Light'), 'the light is built');
  assert.ok(scene.getObjectByName('Saltwind Light gear'), 'and her gear is in the yard');
  assert.ok(scene.getObjectByName('Place board: The Saltwind Light'), 'and the lane is signed');
  for (const kind of ['lighthouse', 'lighthouse-cottage', 'lighthouse-store']) {
    assert.ok(world.colliders.some(c => c.kind === kind), `nobody walks through the ${kind}`);
  }
  // Addison stands on ground she can stand on.
  const { canStand } = await import('../src/game-state.js');
  assert.equal(canStand(ADDISON_STAND.x, ADDISON_STAND.z, world), true);
});

test('the gallery is worth the two hundred and six steps: it charts the coast', () => {
  const chart = createMapFog(), keeper = createLightKeeper();
  const before = chart.snapshot().cells.length;
  assert.equal(keeper.climbed, false);
  const climb = keeper.climb(chart);
  assert.equal(climb.ok, true);
  assert.equal(climb.first, true);
  assert.equal(keeper.climbed, true);
  assert.ok(chart.snapshot().cells.length > before, 'seeing the coast is charting it');
  assert.ok(SIGHTLINES.length >= 8, 'she points out the whole compass of it');
  // Going up again is welcome and charts nothing new.
  const again = keeper.climb(chart);
  assert.equal(again.first, false);
  // And it works without a chart at all.
  assert.equal(createLightKeeper().climb().ok, true);
});

test('she is a sailor first and a keeper second, and says so in that order', () => {
  const keeper = createLightKeeper(), hunt = createBatmanHunt();
  const first = talk(npc, { light: keeper, hunt });
  assert.equal(keeper.met, true);
  assert.match(first.screens[0].lines.join(' '), /I keep this light/);
  assert.match(first.screens[0].lines.join(' '), /bell/, 'and the one rule of the yard');
  for (const id of ['light-climb', 'light-work', 'light-wrecks', 'light-weather', 'light-her']) {
    assert.equal(first.has(id), true, `${id} is offered`);
  }
  first.pick('light-climb');
  assert.deepEqual(first.acted, ['climb-light']);
  // The wreck book is the reason the tower exists, and it is not romantic about it.
  assert.match(WRECK_BOOK[0], /before there was a light here at all/);
  assert.match(WRECK_BOOK.join(' '), /The sea does not need a reason/);
  assert.ok(LIGHT_WORK.length >= 4 && WEATHER_LORE.length >= 4 && HER_OWN.length >= 4);
  assert.match(FROM_THE_GALLERY.join(' '), /ledge/, 'from the gallery she shows you what the light is for');
});

test('what she has seen over the water is only mentioned to somebody already looking', () => {
  const keeper = createLightKeeper(), hunt = createBatmanHunt();
  keeper.meet();
  assert.equal(talk(npc, { light: keeper, hunt }).has('light-seen'), false, 'she does not bring it up');
  hunt.find('vial'); hunt.sight();
  const seen = talk(npc, { light: keeper, hunt });
  assert.equal(seen.has('light-seen'), true);
  seen.pick('light-seen');
  const said = seen.screens.at(-1).lines.join(' ');
  assert.match(said, /none of them have hands/);
  assert.match(said, /welcome on this rock/, 'and she is on his side about it');
});

test('the visit survives a save', () => {
  const keeper = createLightKeeper();
  keeper.meet(); keeper.climb();
  const restored = createLightKeeper();
  assert.equal(restored.restore(keeper.snapshot()), true);
  assert.equal(restored.met, true);
  assert.equal(restored.climbed, true);
  assert.equal(validateLightSnapshot(undefined), true);
  assert.equal(validateLightSnapshot({ version: 1, met: true, climbed: false }), true);
  assert.equal(validateLightSnapshot({ version: 1, met: 'yes', climbed: false }), false);
  assert.equal(validateLightSnapshot({ version: 2, met: true, climbed: true }), false);
});
