import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSuvalFlightRoute, createBatmanFlight, SUVAL_FLIGHT_REGIONS } from '../src/content/quests/batman/batman-flight.js';
import { REGION_CELLS } from '../src/world/terrain/region-world.js';
import { BAT_CAVE, BAT_LANDING } from '../src/content/regions/suval-highlands/suval-highlands.js';
import { BATMAN_HISTORY } from '../src/content/quests/batman/batman-quest.js';
const routes = buildSuvalFlightRoute({ cells: SUVAL_FLIGHT_REGIONS.flatMap(region =>
  REGION_CELLS[region].map(cell => ({ ...cell, region }))), cave: BAT_CAVE.perch,
  apron: BAT_CAVE.apron, landing: BAT_LANDING, heightAt: () => 2 });
const length = route => route.slice(1).reduce((total, b, i) => {
  const a = route[i]; return total + Math.hypot(b.x-a.x, b.y-a.y, b.z-a.z);
}, 0);
const old = routes.legacyRoutes(), oldLength = length(old.route), oldHomeLength = length(old.returnRoute);
function legacy(progress, stage = 'flying', returnProgress = 0) {
  let traveled = 0; const visited = [];
  old.route.forEach((p, i) => {
    if (i) { const a = old.route[i-1]; traveled += Math.hypot(p.x-a.x,p.y-a.y,p.z-a.z); }
    if (p.cell && traveled <= oldLength * progress + 1e-5) visited.push(`${p.cell.region}:${p.cell.q},${p.cell.r}`);
  });
  return { version: 1, stage, distance: oldLength * progress, returnDistance: oldHomeLength * returnProgress,
    landTime: 0, narration: Math.min(BATMAN_HISTORY.length, Math.floor(progress / .91 * BATMAN_HISTORY.length) + 1), visited };
}

test('An existing long-tour checkpoint resumes at the same progress on the shorter tour', () => {
  const events = [], flight = createBatmanFlight({ ...routes, onEvent: e => events.push(e) }), saved = legacy(.62);
  assert.ok(saved.visited.length > 0 && saved.visited.length < 63);
  const original = structuredClone(saved);
  assert.equal(flight.restore(saved), true); assert.deepEqual(saved, original);
  assert.equal(flight.snapshot().version, 3); assert.ok(Math.abs(flight.state().progress - .62) < 1e-8);
  assert.equal(flight.state().narration, saved.narration); assert.deepEqual(flight.state().visited, []);
  assert.deepEqual(events, [], 'loading never awards map or skill rewards');
  while (flight.mounted) flight.tick(.1);
  assert.equal(events.filter(e => e.type === 'cell-revealed').length, 63);
  assert.deepEqual(events.filter(e => e.type === 'narration').map(e => e.id), BATMAN_HISTORY.slice(saved.narration).map(e => e.id));
});

test('Completed and returning old tours stay complete without replaying chart rewards', () => {
  for (const [stage, back] of [['landed', 0], ['returning', .4], ['home', 1]]) {
    const events = [], flight = createBatmanFlight({ ...routes, onEvent: e => events.push(e) });
    assert.equal(flight.restore(legacy(1, stage, back)), true, stage);
    assert.equal(flight.state().stage, stage); assert.equal(flight.state().visited.length, 63);
    assert.equal(flight.state().progress, 1); assert.ok(Math.abs(flight.state().returnDistance - length(routes.returnRoute)*back) < 1e-8);
    flight.tick(.1); assert.equal(events.filter(e => e.type === 'cell-revealed').length, 0);
  }
});

test('Invalid legacy coverage cannot erase or replace the active short-tour save', () => {
  const flight = createBatmanFlight(routes); flight.start(); flight.tick(.1); const before = flight.snapshot();
  const bad = legacy(.5); bad.visited.shift(); assert.equal(flight.restore(bad), false);
  assert.equal(flight.restore({ ...legacy(.5), distance: oldLength + 20 }), false);
  assert.deepEqual(flight.snapshot(), before);
});

const changedRoutes = buildSuvalFlightRoute({ cells: routes.cells, cave: BAT_CAVE.perch,
  apron: BAT_CAVE.apron, landing: BAT_LANDING,
  heightAt: (x, z) => 18 + 90 * Math.exp(-((x + 280) ** 2 + (z - 910) ** 2) / 18000) });
const withoutLengths = snapshot => {
  const { tourLength, returnLength, ...old } = snapshot;
  return { ...old, version: 2 };
};
function scenicSave(stage, progress = .4) {
  const flight = createBatmanFlight(routes); flight.start();
  while (flight.state().progress < (stage === 'flying' ? progress : 1)) flight.tick(.25);
  if (stage === 'returning' || stage === 'home') {
    flight.returnHome();
    while (flight.state().returnDistance < length(routes.returnRoute) * (stage === 'home' ? 1 : progress)) flight.tick(.25);
  }
  return flight.snapshot();
}

test('Version-2 completed scenic tours survive a changed terrain height without replaying rewards', () => {
  assert.notEqual(length(routes.route), length(changedRoutes.route));
  for (const stage of ['landed', 'returning', 'home']) {
    const saved = withoutLengths(scenicSave(stage)), original = structuredClone(saved), events = [];
    const loaded = createBatmanFlight({ ...changedRoutes, onEvent: e => events.push(e) });
    assert.equal(loaded.restore(saved), true, stage);
    assert.equal(loaded.state().stage, stage); assert.equal(loaded.state().progress, 1);
    assert.equal(loaded.state().visited.length, 63); assert.equal(loaded.snapshot().version, 3);
    assert.equal(loaded.snapshot().tourLength, length(changedRoutes.route));
    assert.deepEqual(saved, original); assert.deepEqual(events, []);
    if (stage === 'home') assert.equal(loaded.state().returnDistance, length(changedRoutes.returnRoute));
  }
});

test('Version-2 midair saves retain bounded travel and spoken history after a terrain change', () => {
  const saved = withoutLengths(scenicSave('flying')), loaded = createBatmanFlight(changedRoutes);
  assert.equal(loaded.restore(saved), true);
  assert.equal(loaded.state().stage, 'flying'); assert.equal(loaded.state().distance, saved.distance);
  assert.equal(loaded.state().narration, saved.narration); assert.deepEqual(loaded.state().visited, []);
  while (loaded.mounted) loaded.tick(.25);
  assert.equal(loaded.state().stage, 'landed'); assert.equal(loaded.state().visited.length, 63);
});

test('Version-3 stores route totals so midair and return progress survive future height changes exactly', () => {
  for (const stage of ['flying', 'landed', 'returning', 'home']) {
    const saved = scenicSave(stage), loaded = createBatmanFlight(changedRoutes);
    assert.equal(loaded.restore(saved), true, stage);
    assert.equal(loaded.state().stage, stage);
    assert.ok(Math.abs(loaded.state().progress - saved.distance / saved.tourLength) < 1e-10);
    assert.ok(Math.abs(loaded.state().returnDistance / loaded.snapshot().returnLength - saved.returnDistance / saved.returnLength) < 1e-10);
    assert.equal(loaded.state().narration, saved.narration);
    assert.equal(loaded.restore(loaded.snapshot()), true, 'An upgraded save remains self-consistent');
  }
});

test('Terrain compatibility rejects corrupted totals, fabricated completion and implausible legacy distances atomically', () => {
  const loaded = createBatmanFlight(changedRoutes); loaded.start(); loaded.tick(.2); const before = loaded.snapshot();
  const saved = scenicSave('flying'), complete = withoutLengths(scenicSave('landed'));
  const invalid = [
    { ...saved, tourLength: Infinity }, { ...saved, returnLength: 0 },
    { ...saved, tourLength: saved.distance / 2 }, { ...saved, stage: 'landed' },
    { ...complete, distance: 1 }, { ...complete, distance: 50000 },
    { ...complete, visited: complete.visited.slice(1) }, { ...complete, narration: 0 },
    { ...withoutLengths(saved), distance: 50000 }, { ...withoutLengths(saved), narration: 0 },
    { ...withoutLengths(scenicSave('home')), returnDistance: 50000 },
  ];
  for (const bad of invalid) { assert.equal(loaded.restore(bad), false); assert.deepEqual(loaded.snapshot(), before); }
});


test('Version-1 long tours also retain completion and chart history across terrain revisions', () => {
  for (const [stage, progress, back] of [['flying', .62, 0], ['landed', 1, 0], ['returning', 1, .4], ['home', 1, 1]]) {
    const saved = legacy(progress, stage, back), events = [];
    const loaded = createBatmanFlight({ ...changedRoutes, onEvent: e => events.push(e) });
    assert.equal(loaded.restore(saved), true, stage);
    assert.equal(loaded.state().stage, stage); assert.equal(loaded.state().narration, saved.narration);
    assert.equal(loaded.snapshot().version, 3); assert.deepEqual(events, []);
    if (stage !== 'flying') { assert.equal(loaded.state().progress, 1); assert.equal(loaded.state().visited.length, 63); }
    else { assert.equal(loaded.state().visited.length, 0); assert.ok(loaded.state().progress > .5 && loaded.state().progress < .7); }
  }
  const loaded = createBatmanFlight(changedRoutes), before = loaded.snapshot();
  const reordered = legacy(.62); [reordered.visited[1], reordered.visited[2]] = [reordered.visited[2], reordered.visited[1]];
  const invalid = [reordered, { ...legacy(.62), distance: 1 }, { ...legacy(.62), distance: 50000 },
    { ...legacy(1, 'landed'), narration: 0 }, { ...legacy(1, 'landed'), visited: legacy(.62).visited }];
  for (const bad of invalid) { assert.equal(loaded.restore(bad), false); assert.deepEqual(loaded.snapshot(), before); }
});
