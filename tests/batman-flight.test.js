import test from 'node:test';
import assert from 'node:assert/strict';
import { regionCells } from '../src/world/terrain/region-layout.js';
import { PLAYABLE_SURVEY } from '../src/dev/tools/region-survey.js';
import { hexOwnerAt } from '../src/world/terrain/region-world.js';
import { buildSuvalFlightRoute, createBatmanFlight, validateBatmanFlightSnapshot, SUVAL_FLIGHT_REGIONS } from '../src/content/quests/batman/batman-flight.js';
import { BAT_CAVE, BAT_LANDING } from '../src/content/regions/suval-highlands/suval-highlands.js';
import { BATMAN_HISTORY } from '../src/content/quests/batman/batman-quest.js';

const heightAt = (x, z) => 65 + Math.sin(x / 70) * 26 + Math.cos(z / 60) * 19;
const cells = SUVAL_FLIGHT_REGIONS.flatMap(region => regionCells(PLAYABLE_SURVEY, region));
const route = buildSuvalFlightRoute({ cells, cave: BAT_CAVE.perch, landing: BAT_LANDING, heightAt });
const advanceQuarter = flight => {
  for (let i = 0; i < 5000 && flight.state().progress < .25; i++) flight.tick(.1);
  assert.equal(flight.state().stage, 'flying');
};

test('The short scenic itinerary crosses all three Suvals without visiting every chart hex', () => {
  assert.equal(route.cells.length, 63);
  const regions = new Set(route.route.map(p => hexOwnerAt(p.x, p.z)));
  for (const region of SUVAL_FLIGHT_REGIONS) assert.ok(regions.has(region), `The tour shows ${region}`);
  assert.ok(route.route.filter(p => p.cell).length < 63, 'Map coverage is independent of the scenic stops');
  assert.deepEqual(route.route[0], { ...BAT_CAVE.perch, y: heightAt(BAT_CAVE.perch.x, BAT_CAVE.perch.z), phase: 'approach' });
  const last = route.route.at(-1); assert.equal(last.x, BAT_LANDING.x); assert.equal(last.z, BAT_LANDING.z);
  assert.equal(last.y, heightAt(last.x, last.z));
  for (const p of route.route.slice(2, -1)) assert.ok(p.y >= heightAt(p.x, p.z) + 37.99);
  for (const p of route.returnRoute.slice(1, -2)) assert.ok(p.y >= heightAt(p.x, p.z) + 37.99);
  assert.equal(route.route[1].x, BAT_CAVE.apron.x); assert.equal(route.route[1].z, BAT_CAVE.apron.z);
  const flight = createBatmanFlight(route); flight.start(); let seconds = 0;
  while (flight.mounted && seconds < 200) { flight.tick(.1); seconds += .1; }
  assert.equal(flight.state().stage, 'landed');
  assert.ok(seconds <= 160, `The scenic tour took ${seconds.toFixed(1)} seconds`);
  assert.ok(flight.state().routeLength < 3000, 'The scenic route is shorter than a full hex survey');
});
test('All Suval hexes are revealed once after landing and Batman returns physically', () => {
  const events = [], flight = createBatmanFlight({ ...route, onEvent: e => events.push(e) });
  assert.equal(flight.start(), true); assert.equal(flight.start(), false);
  assert.equal(events.filter(e => e.type === 'cell-revealed').length, 0);
  let previous = flight.state(), largestStep = 0, landed = null;
  for (let i = 0; i < 20000 && flight.state().stage !== 'home'; i++) {
    const current = flight.tick(.1);
    largestStep = Math.max(largestStep, Math.hypot(current.x - previous.x, current.y - previous.y, current.z - previous.z));
    if (current.stage === 'flying') {
      assert.equal(current.visited.length, 0);
      assert.equal(events.filter(e => e.type === 'cell-revealed').length, 0);
    }
    if (current.stage === 'landed') { landed ??= current; assert.equal(current.mounted, false); }
    previous = current;
  }
  assert.ok(largestStep <= 2.10001, `A frame traveled ${largestStep} m`);
  assert.equal(flight.state().stage, 'home'); assert.ok(landed);
  assert.equal(landed.x, BAT_LANDING.x); assert.equal(landed.z, BAT_LANDING.z);
  assert.equal(landed.visited.length, 63);
  assert.equal(flight.state().x, BAT_CAVE.perch.x); assert.equal(flight.state().z, BAT_CAVE.perch.z);
  const reveals = events.filter(e => e.type === 'cell-revealed');
  assert.equal(reveals.length, 63);
  assert.equal(new Set(reveals.map(e => `${e.region}:${e.q},${e.r}`)).size, 63);
  assert.ok(events.indexOf(reveals[0]) > events.findIndex(e => e.type === 'landed'));
  assert.ok(events.findIndex(e => e.type === 'regions-revealed') > events.indexOf(reveals.at(-1)));
  assert.deepEqual(events.filter(e => e.type === 'narration').map(e => e.id), BATMAN_HISTORY.map(beat => beat.id));
  assert.equal(events.filter(e => e.type === 'landed').length, 1);
  assert.equal(events.filter(e => e.type === 'regions-revealed').length, 1);
});
test('Flight and return pause in menus and reload without revealing maps early or repeating the reward', () => {
  const flight = createBatmanFlight(route); flight.start(); advanceQuarter(flight);
  const saved = flight.snapshot(); assert.deepEqual(saved.visited, []); assert.equal(saved.version, 3);
  for (let i = 0; i < 100; i++) flight.tick(.1, { playing: false });
  assert.deepEqual(flight.snapshot(), saved);
  const events = [], loaded = createBatmanFlight({ ...route, onEvent: e => events.push(e) });
  assert.equal(loaded.restore(saved), true); assert.deepEqual(loaded.state(), flight.state());
  assert.equal(events.length, 0);
  while (loaded.state().stage === 'flying') loaded.tick(.25);
  const landed = loaded.snapshot(); loaded.tick(100, { playing: false }); assert.deepEqual(loaded.snapshot(), landed);
  assert.equal(landed.visited.length, 63);
  const completedEvents = [], completedLoad = createBatmanFlight({ ...route, onEvent: e => completedEvents.push(e) });
  assert.equal(completedLoad.restore(landed), true); assert.deepEqual(completedLoad.snapshot(), landed);
  assert.equal(completedEvents.length, 0, 'Reloading a completed landing cannot replay map discovery');
  assert.equal(loaded.returnHome(), true); const returning = loaded.snapshot();
  const returnLoad = createBatmanFlight(route); assert.equal(returnLoad.restore(returning), true);
  while (returnLoad.state().stage !== 'home') returnLoad.tick(.25);
  assert.equal(events.filter(e => e.type === 'cell-revealed').length, 63);
  assert.equal(returnLoad.state().visited.length, 63);
});
test('A flight save cannot fabricate chart coverage or corrupt live progress', () => {
  const flight = createBatmanFlight(route); flight.start(); const before = flight.snapshot();
  assert.equal(flight.restore({ ...before, visited: ['West Suval:999,999'] }), false);
  assert.equal(flight.restore({ ...before, visited: [`${cells[0].region}:${cells[0].q},${cells[0].r}`] }), false);
  assert.equal(flight.restore({ ...before, stage: 'home' }), false);
  assert.deepEqual(flight.snapshot(), before);
  assert.equal(validateBatmanFlightSnapshot({ ...before, distance: Infinity }), false);
  assert.equal(flight.restore(undefined), true); assert.equal(flight.state().stage, 'idle');
  flight.start(); while (flight.mounted) flight.tick(.25);
  const complete = flight.snapshot(); assert.equal(flight.restore({ ...complete, visited: complete.visited.slice(1) }), false);
  assert.deepEqual(flight.snapshot(), complete, 'Completed coverage cannot be erased and reclaimed');
});
