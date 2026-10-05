import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './module-loader.js';
import { groundWithRiver } from '../src/world-terrain.js';
import { SEA_LEVEL, hexOwnerAt } from '../src/region-world.js';
import { SELAMUS_BUILDINGS, selamusGround, selamusCanalAt, selamusLocal } from '../src/selamus-city.js';
import { createWalkSurfaces, colliderOverlapsHeight } from '../src/walk-surfaces.js';
import { SELEMIS_WILDLIFE_ZONES } from '../src/selemis-wildlife.js';
import { ASCARTH_WILDLIFE_ZONES } from '../src/ascarth-wildlife.js';

const THREE = await sourceModule('../vendor/three.module.js');
const { createSelamusHarbor, createSelamusHarborSteps, SELAMUS_BERTHS, SELAMUS_PIERS, selamusBerthPoint, selamusHullSamples } = await sourceModule('../src/selamus-harbor.js');
const heightAt = (x, z) => selamusGround(x, z, groundWithRiver(x, z));
const colliders = [], harbor = createSelamusHarbor({ parent: new THREE.Group(), heightAt, colliders });

// These rectangles cover every spar, oar and bowsprit, not only the hull.
function envelope(berth) {
  const [left, right, front, rear] = berth.kind === 'merchant' ? [-.233, .233, -.678, .531] : berth.kind === 'galley' ? [-.219, .219, -.631, .536] : [-.1, .315, -.553, .512];
  return [[left, front], [right, front], [right, rear], [left, rear]].map(([x, z]) => selamusBerthPoint(berth, x * berth.length, z * berth.length));
}
function separated(a, b, margin = 0) {
  for (const polygon of [a, b]) for (let i = 0; i < polygon.length; i++) {
    const p = polygon[i], q = polygon[(i + 1) % polygon.length], length = Math.hypot(q.x - p.x, q.z - p.z), nx = -(q.z - p.z) / length, nz = (q.x - p.x) / length;
    const pa = a.map(v => v.x * nx + v.z * nz), pb = b.map(v => v.x * nx + v.z * nz);
    if (Math.max(...pa) + margin < Math.min(...pb) || Math.max(...pb) + margin < Math.min(...pa)) return true;
  }
  return false;
}

test('Every Selemis ship has water under its complete hull with room below its keel', () => {
  assert.equal(SELAMUS_BERTHS.length, 12);
  for (const berth of SELAMUS_BERTHS) {
    const ship = harbor.root.children.find(c => c.userData.berthId === berth.id);
    assert.ok(ship, berth.id);
    assert.equal(ship.position.y, SEA_LEVEL);
    for (const p of selamusHullSamples(berth, berth.kind === 'gondola' ? .75 : 2)) {
      const bed = heightAt(p.x, p.z);
      assert.ok(bed < SEA_LEVEL - ship.userData.metrics.hullDraft - .25, `${berth.id} keel grounds at ${p.x},${p.z}: ${bed}`);
      if (berth.kind === 'gondola') assert.ok(selamusCanalAt(p.x, p.z).edge < -.3, `${berth.id} leaves its canal`);
    }
  }
});

test('Masts, bowsprits and oarbanks have separate berths outside the sea wildlife circuits', () => {
  for (let i = 0; i < SELAMUS_BERTHS.length; i++) for (let j = i + 1; j < SELAMUS_BERTHS.length; j++) {
    assert.ok(separated(envelope(SELAMUS_BERTHS[i]), envelope(SELAMUS_BERTHS[j]), .5), `${SELAMUS_BERTHS[i].id} overlaps ${SELAMUS_BERTHS[j].id}`);
  }
  for (const zone of [...SELEMIS_WILDLIFE_ZONES, ...ASCARTH_WILDLIFE_ZONES].filter(z => z.sea || z.plunge)) {
    const range = [{ x: zone.minX, z: zone.minZ }, { x: zone.maxX, z: zone.minZ }, { x: zone.maxX, z: zone.maxZ }, { x: zone.minX, z: zone.maxZ }];
    for (const berth of SELAMUS_BERTHS) assert.ok(separated(envelope(berth), range, 3), `${berth.id} enters ${zone.id}`);
  }
});

test('Every wooden landing connects dry Selemi ground to a continuous unobstructed walking deck', () => {
  const walking = createWalkSurfaces(harbor.walkSurfaces, heightAt);
  assert.equal(harbor.walkSurfaces.length, SELAMUS_PIERS.length * 2);
  for (const pier of SELAMUS_PIERS) {
    assert.equal(hexOwnerAt(pier.a.x, pier.a.z), 'Selemi');
    assert.ok(heightAt(pier.a.x, pier.a.z) > SEA_LEVEL + 1);
    assert.ok(heightAt(pier.b.x, pier.b.z) < SEA_LEVEL);
    const ramp = harbor.walkSurfaces.find(s => s.id === `${pier.id}-ramp`), deck = harbor.walkSurfaces.find(s => s.id === `${pier.id}-deck`);
    assert.deepEqual(ramp.b, deck.a);
    assert.ok(Math.abs(ramp.a.y - heightAt(ramp.a.x, ramp.a.z)) < .08);
    for (const surface of [ramp, deck]) {
      const length = Math.hypot(surface.b.x - surface.a.x, surface.b.z - surface.a.z);
      assert.ok(Math.abs(surface.b.y - surface.a.y) / length < .4);
      for (let step = 0; step <= Math.ceil(length * 2); step++) {
        const t = step / Math.ceil(length * 2), x = surface.a.x + (surface.b.x - surface.a.x) * t, z = surface.a.z + (surface.b.z - surface.a.z) * t;
        const support = walking.supportAt(x, z, { surfaceId: surface.id });
        assert.ok(support.height >= heightAt(x, z) - .015, `${surface.id} cuts through its shore`);
        const local = selamusLocal(x, z), building = SELAMUS_BUILDINGS.find(b => Math.abs(local.u - b.u) < b.width / 2 + .7 && Math.abs(local.v - b.v) < b.depth / 2 + .7);
        assert.equal(building, undefined, `${surface.id} enters ${building?.id}`);
        const blockage = colliders.find(c => colliderOverlapsHeight(c, support.height) && Math.hypot(x - c.x, z - c.z) < c.r + .55);
        assert.equal(blockage, undefined, `${surface.id} center is blocked by ${blockage?.id}`);
      }
    }
    const dx = pier.b.x - pier.a.x, dz = pier.b.z - pier.a.z, length = Math.hypot(dx, dz), nx = -dz / length * pier.width / 2, nz = dx / length * pier.width / 2;
    const footprint = [{ x: pier.a.x + nx, z: pier.a.z + nz }, { x: pier.a.x - nx, z: pier.a.z - nz }, { x: pier.b.x - nx, z: pier.b.z - nz }, { x: pier.b.x + nx, z: pier.b.z + nz }];
    for (const berth of SELAMUS_BERTHS) assert.ok(separated(footprint, envelope(berth), .25), `${pier.id} intersects ${berth.id}`);
  }
});

test('Outer vessels have anchored moorings and the open harbor stays within a fixed scenery budget', () => {
  assert.equal(harbor.metrics.merchants, 4); assert.equal(harbor.metrics.galleys, 3); assert.equal(harbor.metrics.gondolas, 5);
  assert.equal(harbor.metrics.piers, 3); assert.equal(harbor.metrics.moorings, 20);
  assert.equal(harbor.metrics.cranes, 2); assert.ok(harbor.metrics.bollards >= 24);
  assert.ok(harbor.metrics.batches < 210); assert.ok(harbor.metrics.vertices < 420000);
  for (const berth of SELAMUS_BERTHS.filter(b => b.mooring === 'anchor-buoy')) {
    const buoy = selamusBerthPoint(berth, berth.length * .12, -berth.length * .73);
    assert.ok(heightAt(buoy.x, buoy.z) < SEA_LEVEL - 2, `${berth.id} buoy stands on land`);
  }
  assert.ok(!colliders.some(c => /wall|gate|boom|mole/.test(c.kind)));
  assert.ok(colliders.some(c => c.kind === 'naval-pedestal'));
});

test('Harbor construction yields between vessels and finishes with the same public result', () => {
  const parent = new THREE.Group(), iterator = createSelamusHarborSteps({ parent, heightAt, colliders: [] });
  let result, yields = 0;
  do { result = iterator.next(); if (!result.done) yields++; } while (!result.done);
  assert.ok(yields > SELAMUS_BERTHS.length + SELAMUS_PIERS.length);
  assert.equal(result.value.root.parent, parent);
  assert.deepEqual(result.value.metrics, harbor.metrics);
  assert.deepEqual(result.value.walkSurfaces, harbor.walkSurfaces);
});
