import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';
import * as THREE from '../vendor/three.module.js';
import { scopedWorld } from './scoped-world.js';
import { sourceModule } from './module-loader.js';
import { DRENT_WILDLIFE_ZONES } from '../src/content/regions/drent/drent-wildlife.js';
import { REGIONAL_WILDLIFE_ZONES, WEST_SUVAL_WILDLIFE_ZONES } from '../src/world/life/regional-wildlife.js';
import { STARTING_COUNTRY_WILDLIFE_ZONES } from '../src/world/life/starting-country-wildlife.js';
import { canStand } from '../src/gameplay/movement/game-state.js';
import { hexOwnerAt } from '../src/world/terrain/region-world.js';

const capture = process.env.AZHORA_CAPTURE_R11_LIFE === '1';
const { createWestLife, WEST_LIFE_ZONES, LIFE_REACH } = await sourceModule('../src/content/regions/western-regions/west-regions-life.js');
const scene = new THREE.Scene(), world = await scopedWorld(scene, [1, 2, 3, 5]);
const legacyZones = [...DRENT_WILDLIFE_ZONES, ...WEST_SUVAL_WILDLIFE_ZONES, ...REGIONAL_WILDLIFE_ZONES.filter(z => z.region === 'West Suval')];
const zones = [...legacyZones, ...STARTING_COUNTRY_WILDLIFE_ZONES], legacyIds = new Set(legacyZones.map(z => z.id));
const life = createWestLife(scene, world, { zones }), actors = life.state().creatures, initial = life.snapshot();
const zoneOf = actor => zones.find(zone => actor.id.startsWith(zone.id + '-'));
const homes = new Map(actors.map(actor => [actor.id, { x: actor.x, z: actor.z }]));
const legacy = actors.filter(a => legacyIds.has(zoneOf(a).id)).map(a => [a.id, a.species, a.x, a.y, a.z, homes.get(a.id), zoneOf(a).scale ?? 1]);
const legacyHash = createHash('sha256').update(JSON.stringify(legacy)).digest('hex');
const ground = []; scene.updateMatrixWorld(true); scene.traverse(mesh => {
  if (mesh.isMesh && (mesh.name.startsWith('Terrain ') || ['Suval switchback ground', 'Suval exposed limestone faces'].includes(mesh.name))) ground.push(mesh);
});
const ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0), matrix = new THREE.Matrix4();
const drawnHeight = (x, z) => {
  ray.set(new THREE.Vector3(x, world.heightAt(x, z) + 300, z), down);
  const hit = ray.intersectObjects(ground, false)[0]; assert.ok(hit, `surface at ${x},${z}`); return hit.point.y;
};
const center = zone => ({ x: (zone.minX + zone.maxX) / 2, z: (zone.minZ + zone.maxZ) / 2 });
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const measurements = [];
for (const zone of zones) {
  const residents = actors.filter(actor => zoneOf(actor) === zone); life.setObserver(center(zone));
  const body = scene.getObjectByName(zone.id)?.getObjectByName(`${zone.species} bodies`); assert.ok(body, zone.id);
  residents.forEach((actor, i) => {
    body.getMatrixAt(i, matrix); const groundAnimal = !zone.air && !zone.sea && !zone.float;
    measurements.push({ id: actor.id, region: zone.region, legacy: legacyIds.has(zone.id), ground: groundAnimal,
      x: actor.x, z: actor.z, logicalY: actor.y, gap: matrix.elements[13] - (groundAnimal ? drawnHeight(actor.x, actor.z) + actor.lift : actor.y) });
  });
}
const report = { legacyCount: legacy.length, legacyHash, legacyHomes: legacy, actors: actors.length,
  regions: ['Drent', 'West Suval', 'Luscia', 'Moros Plain'].map(region => {
    const rows = measurements.filter(m => m.region === region && m.ground);
    return { region, count: rows.length, misplaced: rows.filter(m => Math.abs(m.gap) > .02).length,
      worst: [...rows].sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap)).slice(0, 4) };
  }), newHomes: actors.filter(a => !legacyIds.has(zoneOf(a).id)).map(a => ({ id: a.id, x: a.x, z: a.z, species: a.species, nearestTree: Math.min(...world.timberTrees.map(tree => distance(a, tree))) })),
};
mkdirSync(new URL('./artifacts/', import.meta.url), {recursive:true});
writeFileSync(new URL(`./artifacts/r11-wildlife-${capture ? 'before' : 'after'}.json`, import.meta.url), JSON.stringify(report, null, 2));

test('starting-country wildlife retains every established logical home and admits only the bounded new bands', t => {
  t.diagnostic(JSON.stringify({ legacyCount: legacy.length, legacyHash, actors: actors.length }));
  assert.equal(legacy.length, legacyZones.reduce((n, z) => n + z.sites.length, 0));
  assert.equal(actors.length, zones.reduce((n, z) => n + z.sites.length, 0));
  assert.equal(new Set(actors.map(a => a.id)).size, actors.length);
  if (!capture) {
    assert.equal(legacyHash, '55359edba93c8c17818e649d02c9b6c6b37394a1490916bfb2c087090d2cc49c');
    for (const zone of STARTING_COUNTRY_WILDLIFE_ZONES) assert.ok(WEST_LIFE_ZONES.includes(zone), zone.id);
  }
});

test('actual woodland and downs animal bodies follow visible triangles while simulation and flight remain unchanged', t => {
  t.diagnostic(JSON.stringify(report.regions));
  assert.deepEqual(life.snapshot().creatures, initial.creatures);
  assert.equal(life.snapshot().updates, initial.updates);
  if (!capture) assert.deepEqual(measurements.filter(m => Math.abs(m.gap) > .002).slice(0, 8), []);
});

test('the new woodland and plain homes remain dry, owned, and clear of actual routes and quest sites', t => {
  const sites = [...Object.values(world.npcPositions), ...Object.values(world.journeySites ?? {}), ...Object.values(world.storySites ?? {}),
    ...world.firePits, ...world.repairBenches].filter(p => Number.isFinite(p?.x) && Number.isFinite(p?.z));
  const routeDistance = point => Math.min(...world.paths.flatMap(path => path.slice(1).map((b, i) => {
    const a = path[i], dx = b.x - a.x, dz = b.z - a.z, v = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.z - a.z) * dz) / (dx * dx + dz * dz || 1)));
    return Math.hypot(point.x - a.x - dx * v, point.z - a.z - dz * v) - (path.width ?? 2) / 2;
  })));
  for (const zone of STARTING_COUNTRY_WILDLIFE_ZONES) {
    assert.ok(Math.hypot(zone.maxX - zone.minX, zone.maxZ - zone.minZ) / 2 < LIFE_REACH);
    const rows = actors.filter(a => zoneOf(a) === zone); assert.equal(rows.length, zone.sites.length, zone.id);
    for (const actor of rows) {
      assert.equal(hexOwnerAt(actor.x, actor.z), zone.region, actor.id);
      if (zone.air) continue;
      assert.ok(canStand(actor.x, actor.z, world, zone.radius), actor.id);
      assert.ok((world.waterAt(actor.x, actor.z) ?? -Infinity) <= world.heightAt(actor.x, actor.z), actor.id);
      assert.ok(routeDistance(actor) > 3, `${actor.id} route margin`);
      assert.ok(sites.every(site => distance(actor, site) >= 8), `${actor.id} quest/site margin`);
      if (zone.habitat === 'woodland') assert.ok(Math.min(...world.timberTrees.map(tree => distance(actor, tree))) < 30, `${actor.id} actual woodland`);
    }
  }
  t.diagnostic(JSON.stringify(report.newHomes));
});

test('new residents visibly retreat and return through their actual dry home ranges without changing identity', t => {
  const identity = new Map(actors.map(a => [a.id, a])), journeys = [];
  for (const zone of STARTING_COUNTRY_WILDLIFE_ZONES.filter(z => !z.air)) {
    const actor = actors.find(a => zoneOf(a) === zone), home = homes.get(actor.id); let furthest = 0, fled = false;
    for (let tick = 0; tick < 180; tick++) {
      life.update(.05, { x: actor.x - 3, z: actor.z - 3 });
      furthest = Math.max(furthest, distance(actor, home)); fled ||= actor.action === 'flee';
      assert.equal(hexOwnerAt(actor.x, actor.z), zone.region); assert.ok(canStand(actor.x, actor.z, world, zone.radius));
    }
    assert.ok(fled && furthest > 16, `${actor.id} must retreat past the existing 16 m home threshold: ${furthest}`);
    const middle = center(zone), observer = [[108, 0], [-108, 0], [0, 108], [0, -108]].map(([x, z]) => ({ x: middle.x + x, z: middle.z + z }))
      .sort((a, b) => distance(b, actor) - distance(a, actor))[0];
    for (let tick = 0; tick < 1000 && distance(actor, home) > 6; tick++) {
      life.update(.1, observer);
      assert.equal(hexOwnerAt(actor.x, actor.z), zone.region);
      assert.ok(canStand(actor.x, actor.z, world, zone.radius));
    }
    journeys.push({ id: actor.id, furthest, returned: distance(actor, home) });
    t.diagnostic(JSON.stringify(journeys.at(-1)));
    assert.ok(distance(actor, home) <= 6, `${actor.id} return ${distance(actor, home)}`);
    assert.equal(actors.find(a => a.id === actor.id), identity.get(actor.id));
  }
  const before = life.snapshot(); life.update(.25, actors[0], false); assert.deepEqual(life.snapshot(), before);
  life.setObserver({ x: 10000, z: 10000 }); assert.ok(life.state().groups.every(g => !g.visible));
  for (const actor of actors) assert.equal(identity.get(actor.id), actor);
});

test('the new plain hawk completes its circle above its own country without acquiring ground footing', () => {
  const zone = STARTING_COUNTRY_WILDLIFE_ZONES.find(z => z.air), actor = actors.find(a => zoneOf(a) === zone);
  const start = actor.clock;
  for (let tick = 0; tick < 120; tick++) {
    life.update(.25, center(zone));
    assert.equal(hexOwnerAt(actor.x, actor.z), zone.region);
    assert.ok(actor.y - drawnHeight(actor.x, actor.z) > 20);
    assert.equal(actor.action, 'soar');
  }
  assert.ok(actor.clock - start >= 27, 'a complete existing 27-second circle');
});

test.after(() => life.dispose());
