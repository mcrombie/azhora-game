import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLocalMapModel, localMapPoint, localMapBearing } from '../src/local-map-data.js';
import { regionAt, regions, WORLD_BOUNDS } from '../src/regions.js';
import { toWorld } from '../src/world-scale.js';

// The fixture is written in authored metres, like the content it stands in for,
// and converted here so every probe lands in the region it is meant to.
const at = (x, z) => toWorld(x, z);

function fixture() {
  return { bounds: { ...WORLD_BOUNDS }, regionAt, regions,
    landmarks: [
      { id: 'village', name: 'Tidehaven Village', description: 'A salt-weathered village.', ...at(-15, 29) },
      { id: 'secret-shrine', name: 'Mosskeeper Shrine', description: 'The hidden memorial inscription.', ...at(-107, 66) },
      { id: 'mill', name: 'The Clearing Mill', description: 'The canvas sails turn.', ...at(-235, 51) },
      { id: 'bridge', name: 'The Caloss Bridge', description: 'Cross here.', ...at(-345, 93) },
      { id: 'relay', name: 'The Lauvel Relay', description: 'Send the report onward.', ...at(-401, 196) },
    ], paths: [
      [at(5, 29), at(-176, 29), at(-345, 93), at(-549, 348)],
      [at(-400, 60), at(200, 60)],
      [at(-15, 29), at(-107, 66)],
      [at(60, 500), at(60, 560)],
    ], colliders: [
      { kind: 'house', ...at(-8, 34), width: 5.2, depth: 4.7, angle: .64 },
      { kind: 'house', ...at(120, 620), width: 5.2, depth: 4.4, angle: .35 },
      { kind: 'tree', ...at(-6, 9), r: 1 },
    ], pond: { ...at(-97, 2), radius: 5.4 }, mapWaters: [
      { id: 'coast-water', kind: 'polygon', points: [at(30, -160), at(140, -160), at(140, 300), at(30, 300)] },
      { id: 'willowmere-water', kind: 'circle', ...at(-97, 2), radius: 5.4 },
      { id: 'river-water', kind: 'polygon', points: [at(-580, 120), at(-520, 120), at(-520, 200), at(-580, 200)] },
    ] };
}

const model = (world, options = {}) => buildLocalMapModel({ world, position: at(-15, 29), ...options });
function deepFreeze(object) {
  if (!object || typeof object !== 'object' || Object.isFrozen(object)) return object;
  Object.freeze(object); Object.values(object).forEach(deepFreeze); return object;
}

test('the chart selects every actual region with eight metres of padding and never relocates the player', () => {
  const world = fixture(), position = { ...at(-14, 30), heading: .5 };
  for (const region of regions) {
    const chart = model(world, { position, regionId: String(region.id) });
    assert.equal(chart.region.id, region.id); assert.equal(chart.currentRegionId, 1);
    assert.deepEqual(chart.bounds, { minX: region.bounds.minX - 8, maxX: region.bounds.maxX + 8,
      minZ: region.bounds.minZ - 8, maxZ: region.bounds.maxZ + 8 });
    assert.deepEqual(chart.player, position); assert.notEqual(chart.player, position);
    assert.deepEqual(chart.regions.map(item => item.id), regions.map(item => item.id).sort((a, b) => a - b));
  }
  assert.equal(model(world, { position: at(-386, 183) }).region.id, 2);
  assert.equal(model(world, { position: at(-386, 183), regionId: 700 }).region.id, 2);
  assert.equal(model(world, { position: at(-549, 348) }).currentRegionId, regionAt(at(-549, 348).x, at(-549, 348).z).id);
  assert.equal(model(world, { position, heading: Math.PI / 2 }).player.heading, Math.PI / 2);
});

test('unexplored places expose no names, descriptions, extra source fields, or tracking affordance', () => {
  const world = fixture(); world.landmarks[1].secret = 'The archive below the stone';
  const chart = model(world, { discoveries: new Set(['village']), trackedId: 'secret-shrine' });
  const village = chart.landmarks.find(p => p.id === 'village'), shrine = chart.landmarks.find(p => p.id === 'secret-shrine');
  assert.equal(village.name, 'Tidehaven Village'); assert.equal(village.trackable, true); assert.equal(village.discovered, true);
  assert.equal(shrine.name, 'Unexplored place'); assert.equal(shrine.description, 'Follow a side path to see what lies there');
  assert.equal(shrine.known, false); assert.equal(shrine.trackable, false); assert.equal(shrine.discovered, false);
  assert.equal(chart.tracked, null);
  const serialized = JSON.stringify(chart);
  for (const hidden of ['Mosskeeper Shrine', 'hidden memorial inscription', 'archive below']) assert.equal(serialized.includes(hidden), false);
});

test('explicit quest hints reveal stable places without marking them discovered or moving their coordinates', () => {
  const world = fixture(), discoveries = new Set(['village']);
  const chart = model(world, { discoveries, knownIds: ['secret-shrine'], trackedId: 'secret-shrine' });
  assert.equal(chart.tracked.name, 'Mosskeeper Shrine'); assert.equal(chart.tracked.discovered, false);
  assert.equal(chart.tracked.known, true); assert.equal(discoveries.size, 1);
  const hint = model(world, { knownLocations: [{ id: 'secret-shrine', x: 99, z: 99, name: 'A shrine in the woods', description: 'Follow the western path.' }] });
  const marker = hint.landmarks.find(p => p.id === 'secret-shrine');
  assert.equal(marker.x, -107); assert.equal(marker.z, 66); assert.equal(marker.known, true);
});

test('named NPC hints and main objectives share stable locations without duplicating the goal in the place list', () => {
  const world = fixture(), knownLocations = [{ id: 'warden', name: 'Eren', ...at(-86, 29), description: 'The Greenway watch.' }];
  const chart = model(world, { knownLocations, goal: { name: 'Eren · Report the goblins', ...at(-86, 29) }, trackedId: 'warden' });
  assert.equal(chart.goal.id, 'warden'); assert.equal(chart.goal.trackable, true);
  assert.equal(chart.landmarks.filter(p => p.x === -86 && p.z === 29).length, 1);
  assert.equal(chart.tracked.id, 'warden'); assert.equal(chart.tracked.name, 'Eren');
  const next = model(world, { knownLocations, goal: { name: 'The road to the Caloss', ...at(-160, 27) }, trackedId: 'warden' });
  assert.equal(next.goal.id, 'main-objective'); assert.equal(next.goal.trackable, false); assert.equal(next.tracked.id, 'warden');
  assert.equal(model(world, { goal: next.goal, trackedId: 'main-objective' }).tracked, null);
});

test('an explicit landmark objective reveals just that landmark and cross-region tracking remains stable', () => {
  const world = fixture();
  const chart = model(world, { regionId: 2, goal: { id: 'secret-shrine', name: 'Visit the shrine', ...at(-107, 66) }, trackedId: 'secret-shrine' });
  assert.equal(chart.goal.id, 'secret-shrine'); assert.equal(chart.tracked.name, 'Mosskeeper Shrine');
  assert.equal(chart.landmarks.some(p => p.id === 'secret-shrine'), false);
  assert.equal(chart.landmarks.find(p => p.id === 'mill').known, false);
  assert.equal(model(world, { knownIds: ['does-not-exist'], trackedId: 'does-not-exist' }).tracked, null);
});

test('the model preserves actual full paths across map edges without fabricating joins or routes', () => {
  const world = fixture();
  world.paths.push([at(90, 0), null, at(-90, 0)]);
  const chart = model(world);
  assert.deepEqual(chart.paths, world.paths.slice(0, 3));
  assert.equal(chart.paths[1][0].x, at(-400, 60).x); assert.equal(chart.paths[1][1].x, at(200, 60).x);
  assert.notEqual(chart.paths[0], world.paths[0]); assert.notEqual(chart.paths[0][0], world.paths[0][0]);
  assert.equal(model(world, { regionId: 4 }).paths.length, 1);
});

test('water and building descriptors come from actual local geometry and are filtered by chart bounds', () => {
  const world = fixture(), village = model(world), river = model(world, { regionId: 2 });
  assert.deepEqual(village.waters.map(w => w.id), ['coast-water', 'willowmere-water']);
  assert.deepEqual(village.buildings, [{ ...at(-8, 34), width: 5.2, depth: 4.7, angle: .64 }]);
  assert.deepEqual(river.waters, [world.mapWaters[2]]); assert.equal(river.buildings.length, 0);
  delete world.mapWaters;
  assert.deepEqual(model(world).waters, [{ id: 'willowmere-water', kind: 'circle', ...at(-97, 2), radius: 5.4 }]);
  assert.equal(model(world, { regionId: 2 }).waters.length, 0, 'missing water metadata must not manufacture a river');
});

test('chart creation neither mutates world facts nor lets callers change facts through returned objects', () => {
  const world = deepFreeze(fixture()), position = Object.freeze(at(-15, 29));
  const before = JSON.stringify(world), discoveries = new Set(['village']);
  const chart = model(world, { position, discoveries, trackedId: 'village' });
  chart.landmarks[0].name = 'changed'; chart.paths[0][0].x = 400; chart.waters[0].points[0].x = 300;
  chart.region.bounds.minX = 999; chart.regions[0].bounds.minX = 800; chart.tracked.name = 'also changed';
  assert.equal(JSON.stringify(world), before); assert.deepEqual([...discoveries], ['village']);
  assert.deepEqual(position, at(-15, 29)); assert.equal(chart.bounds.minX, regions[0].bounds.minX - 8);
  assert.equal(model(world, { discoveries }).landmarks.find(p => p.id === 'village').name, 'Tidehaven Village');
});

test('malformed facts cannot leak NaN coordinates, invalid tracking, or connected fragments', () => {
  const world = fixture();
  world.landmarks.push({ id: 'bad', name: 'Bad coordinates', x: NaN, z: 1 });
  world.colliders.push({ kind: 'house', x: 0, z: 0, width: -4, depth: 3 });
  world.mapWaters.push({ id: 'bad-water', kind: 'polygon', points: [{ x: 0, z: 0 }, { x: 1, z: 1 }, { x: Infinity, z: 2 }] });
  const chart = model(world, { goal: { name: 'Invalid destination', x: NaN, z: 0 }, knownLocations: [{ id: 'bad-hint', name: 'Invalid hint', x: 2, z: Infinity }], trackedId: 'bad-hint' });
  assert.equal(chart.goal, null); assert.equal(chart.tracked, null);
  assert.equal(chart.landmarks.some(p => p.id.startsWith('bad')), false); assert.equal(chart.buildings.length, 1);
  assert.equal(chart.waters.length, 2);
  assert.throws(() => model(world, { position: { x: NaN, z: 0 } }), /finite player position/);
  assert.throws(() => buildLocalMapModel({ world: { bounds: {} }, position: { x: 0, z: 0 } }), /finite world bounds/);
});

test('north-up projection keeps metres proportional, pads, and clamps only when requested', () => {
  const bounds = { minX: -50, maxX: 50, minZ: -100, maxZ: 100 };
  assert.deepEqual(localMapPoint({ x: 0, z: 0 }, bounds, { width: 400, height: 400, padding: 20 }), { x: 200, y: 200, inside: true });
  const north = localMapPoint({ x: 0, z: -100 }, bounds, { width: 400, height: 400, padding: 20 });
  assert.equal(north.y, 20);
  const east = localMapPoint({ x: 50, z: 0 }, bounds, { width: 400, height: 400, padding: 20 });
  assert.equal(east.x, 290);
  assert.deepEqual(localMapPoint({ x: 100, z: -200 }, bounds, { width: 400, height: 400, padding: 20, clamp: true }), { x: 290, y: 20, inside: false });
  assert.equal(localMapPoint({ x: NaN, z: 0 }, bounds), null);
  assert.throws(() => localMapPoint({ x: 0, z: 0 }, bounds, { width: 10, padding: 8 }), /positive drawing area/);
});

test('bearing rings put north above, east right, and retain distance outside the local map', () => {
  const origin = { x: 0, z: 0 };
  const north = localMapBearing(origin, { x: 0, z: -10 }, { radius: 4 });
  assert.equal(north.x, 0); assert.equal(north.y, -4); assert.equal(north.angle, 0); assert.equal(north.distance, 10);
  const east = localMapBearing(origin, { x: 10, z: 0 });
  assert.equal(east.x, 1); assert.equal(east.y, 0); assert.equal(east.angle, Math.PI / 2);
  const west = localMapBearing(origin, { x: -10, z: 0 }); assert.equal(west.angle, Math.PI * 1.5);
  assert.deepEqual(localMapBearing(origin, origin), { x: 0, y: 0, angle: 0, distance: 0 });
  assert.equal(localMapBearing(origin, { x: Infinity, z: 0 }), null);
});

test('the real world exports immutable shoreline, pond, and unbroken Caloss chart geometry', async () => {
  const { sourceModule } = await import('./module-loader.js');
  const THREE = await import('../vendor/three.module.js');
  const { createWorld } = await sourceModule('../src/world.js');
  const world = createWorld(new THREE.Scene());
  assert.equal(Object.isFrozen(world.mapWaters), true);
  for (const water of world.mapWaters) assert.equal(Object.isFrozen(water), true);
  const coast = world.mapWaters.find(w => w.id === 'coast-water');
  assert.ok(coast.points.length > 80, 'the coast traces the authored shoreline');
  assert.ok(coast.points.every(p => Number.isFinite(p.x) && Number.isFinite(p.z)));
  const river = world.mapWaters.find(w => w.id === 'caloss-water');
  assert.ok(river.points.length > 100 && river.points.length % 2 === 0, 'both banks of the Caloss are charted');
  assert.throws(() => { river.points[0].x = 99; }, TypeError);
  const village = model(world), crossing = model(world, { regionId: 2 });
  assert.equal(village.buildings.length, 11, 'nine Tidehaven cottages, the woodland watch, and the Avrel clearing farm');
  const oldCamp = at(-138, -31), lusciaCamp = at(-456, 154), campCentre = world.forestHideout.center;
  const hasPoint = (chart, point) => chart.paths.some(path => path.some(p => Math.abs(p.x - point.x) < .01 && Math.abs(p.z - point.z) < .01));
  assert.ok(!hasPoint(village, oldCamp), 'Drent is a level 0 province: no goblin camp trail remains on its chart');
  assert.ok(!hasPoint(crossing, lusciaCamp), 'Luscia’s wolves have its woods to themselves: the camp trail has left its chart');
  const pueth = model(world, { regionId: regions.find(region => region.name === 'Pueth').id });
  assert.ok(hasPoint(pueth, campCentre), 'the goblin camp trail appears on Pueth’s chart');
  assert.ok(pueth.waters.some(w => w.id === 'tessen-water') && pueth.waters.some(w => w.id === 'ordel-water'), 'Pueth’s chart carries both its rivers');
  assert.equal(crossing.waters.find(w => w.id === 'caloss-water').points.length, river.points.length);
  assert.equal(village.landmarks.every(place => !place.known && place.name === 'Unexplored place'), true);
});
