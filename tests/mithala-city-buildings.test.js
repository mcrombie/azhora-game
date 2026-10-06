import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './module-loader.js';
import { MITHALA_CITY, MITHALA_BUILDINGS, MITHALA_TOWER_STAIR, MITHALA_STREETS, mithalaCityGround } from '../src/content/regions/mithala/mithala-city.js';
import { WALK_STEP, createWalkSurfaces, colliderOverlapsHeight, validWalkSurfaceId } from '../src/world/collision/walk-surfaces.js';
import { finishBuild } from '../src/world/loading/build-steps.js';

// Mithala's buildings on their own: the step run with a bare group, empty lists and the city's made ground over a flat
// plain, with no world built (src/content/regions/mithala/mithala-city-buildings.js).
const THREE = await sourceModule('../vendor/three.module.js');
const { createMithalaCityBuildingSteps } = await sourceModule('../src/content/regions/mithala/mithala-city-buildings.js');
const ground = (x, z) => mithalaCityGround(x, z, 12);
const root = new THREE.Group(), colliders = [], walkSurfaces = [];
const metrics = { buildings: 0, batches: 0, vertices: 0, colliders: 0, walkSurfaces: 0, stairFlights: 0 };
finishBuild(createMithalaCityBuildingSteps({ root, groundHeight: ground, colliders, walkSurfaces, metrics }));
const surfaces = createWalkSurfaces(walkSurfaces, ground);
const P = MITHALA_CITY.platform, TRAVELER = .34;

/** The collider that stops a walker of `radius` with its feet at `feet` standing at (x, z), as src/gameplay/movement/game-state.js asks. */
const blocker = (x, z, feet, radius = TRAVELER) => colliders.find(c => colliderOverlapsHeight(c, feet)
  && (c.r !== undefined ? Math.hypot(x - c.x, z - c.z) < c.r + radius : Math.abs(x - c.x) < c.hx + radius && Math.abs(z - c.z) < c.hz + radius));
const inFootprint = (b, x, z, margin) => Math.abs(x - b.x) <= b.width / 2 + margin && Math.abs(z - b.z) <= b.depth / 2 + margin;

/** Walks a polyline in short steps on the walking surfaces, as the traveler does: never stepping up more than
 * `WALK_STEP`, never through a collider at its own height. Returns the heights it stood at. */
function walkAlong(points, start) {
  let y = start;
  const heights = [y];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], c = points[i], n = Math.max(1, Math.ceil(Math.hypot(c.x - a.x, c.z - a.z) / .1));
    for (let k = 1; k <= n; k++) {
      const x = a.x + (c.x - a.x) * k / n, z = a.z + (c.z - a.z) * k / n;
      const support = surfaces.supportAt(x, z, { maxY: y, stepUp: WALK_STEP, groundSlope: false });
      assert.ok(support.height - y <= WALK_STEP + 1e-9, `a step up of ${(support.height - y).toFixed(3)} m at ${x.toFixed(2)},${z.toFixed(2)}`);
      const wall = blocker(x, z, support.height);
      assert.equal(wall, undefined, `blocked at ${x.toFixed(2)},${z.toFixed(2)} (${support.height.toFixed(2)} m) by ${wall?.id}`);
      heights.push(y = support.height);
    }
  }
  return heights;
}

test('every building is drawn and collided, in a few merged batches under budget', () => {
  assert.equal(metrics.buildings, MITHALA_BUILDINGS.length);
  assert.equal(metrics.colliders, colliders.length);
  assert.equal(metrics.walkSurfaces, walkSurfaces.length);
  assert.equal(metrics.stairFlights, MITHALA_TOWER_STAIR.flights.length);
  assert.ok(metrics.vertices < 160000, `${metrics.vertices} vertices`);
  assert.ok(metrics.batches <= 6 && metrics.batches === root.children.length, `${metrics.batches} batches`);
  const positions = root.children.map(mesh => {
    assert.ok(mesh.isMesh && Number.isFinite(mesh.geometry.boundingSphere.radius) && mesh.geometry.boundingSphere.radius > 0, mesh.name);
    return mesh.geometry.attributes.position;
  });
  assert.equal(positions.reduce((n, p) => n + p.count, 0), metrics.vertices);
  for (const b of MITHALA_BUILDINGS) {
    let drawn = 0;
    for (const p of positions) for (let i = 0; i < p.count; i++) if (inFootprint(b, p.getX(i), p.getZ(i), .3)) drawn++;
    assert.ok(drawn >= 300, `${b.id}: ${drawn} vertices in its footprint`);
    const own = colliders.filter(c => c.id.startsWith(b.id));
    assert.ok(own.length > 0, `${b.id} has no collider`);
    for (const c of own) assert.ok(inFootprint(b, c.x, c.z, 1.2), `${c.id} stands outside ${b.id}`);
  }
  for (const c of colliders) {
    assert.ok([c.x, c.z, c.minY, c.maxY].every(Number.isFinite) && c.maxY > c.minY, c.id);
    assert.ok(c.r !== undefined ? c.r > 0 : c.hx > 0 && c.hz > 0 && c.r === undefined, c.id);
  }
  assert.equal(new Set(colliders.map(c => c.id)).size, colliders.length, 'collider ids are unique');
  // The crane on the quay collides by its mast alone, so the five-metre quay stays passable beside it.
  for (const b of MITHALA_BUILDINGS.filter(b => b.onQuay))
    for (const c of colliders.filter(c => c.id.startsWith(b.id))) assert.ok((c.r ?? Math.max(c.hx, c.hz)) <= .7, `${c.id} is slim`);
  // Nothing of the buildings stands down to the plain or floats: every building's lowest stone is under the ground.
  for (const b of MITHALA_BUILDINGS.filter(b => !b.onQuay)) {
    const body = colliders.filter(c => c.id.startsWith(b.id)).reduce((low, c) => Math.min(low, c.minY), Infinity);
    assert.ok(body <= ground(b.x, b.z) + .01, `${b.id} reaches the ground (${body.toFixed(2)})`);
  }
});

test('the streets stay clear of the buildings', () => {
  for (const s of MITHALA_STREETS) for (let i = 1; i < s.points.length; i++) {
    const a = s.points[i - 1], c = s.points[i], len = Math.hypot(c.x - a.x, c.z - a.z), nx = -(c.z - a.z) / len, nz = (c.x - a.x) / len;
    for (let t = 0; t <= len; t += .5) for (const off of [0, -(s.width / 2 - .6), s.width / 2 - .6]) {
      const x = a.x + (c.x - a.x) * t / len + nx * off, z = a.z + (c.z - a.z) * t / len + nz * off;
      const wall = blocker(x, z, ground(x, z), .3);
      assert.equal(wall, undefined, `${s.name} at ${x.toFixed(1)},${z.toFixed(1)} is blocked by ${wall?.id}`);
    }
  }
});

test('the King’s Hall is shut; the sky tower’s door is open', () => {
  const hall = MITHALA_BUILDINGS.find(b => b.shut);
  assert.equal(hall.id, 'mithala-kings-hall');
  const doors = colliders.filter(c => c.kind === 'shut-door');
  assert.deepEqual(doors.map(c => c.id), ['mithala-kings-hall-doors'], 'only the king’s doors are shut');
  const door = doors[0], l = Math.hypot(door.x - hall.x, door.z - hall.z), ox = (door.x - hall.x) / l, oz = (door.z - hall.z) / l;
  const porch = { x: door.x + ox * 1.6, z: door.z + oz * 1.6 }, feet = surfaces.supportAt(porch.x, porch.z, { maxY: P, stepUp: WALK_STEP }).height;
  assert.ok(feet > P + .1 && feet - P <= WALK_STEP, `the porch is a step up (${(feet - P).toFixed(2)})`);
  assert.equal(blocker(porch.x, porch.z, feet), undefined, 'the porch before the doors is open');
  for (let k = 0; k <= 10; k++) assert.ok(blocker(door.x - ox * k * .3, door.z - oz * k * .3, feet), `the doors stop a walker ${(k * .3).toFixed(1)} m in`);
  for (const e of [-1, 1]) assert.ok(blocker(door.x + oz * e * (door.width / 2 - .3), door.z - ox * e * (door.width / 2 - .3), feet), 'shut across their width');
  const { door: towerDoor, tower } = MITHALA_TOWER_STAIR;
  const into = { x: Math.sign(tower.x - towerDoor.x), z: 0 };
  for (const k of [-1, 0, 1, 1.5]) assert.equal(blocker(towerDoor.x + into.x * k, towerDoor.z, P)?.id, undefined, `the tower door at ${k} m`);
  assert.ok(blocker(towerDoor.x, towerDoor.z, P + MITHALA_TOWER_STAIR.landings[4].y), 'the doorway is walled above its head');
});

test('the sky tower’s stair is walked from the door to the open platform and back, flight by flight', () => {
  const { landings, door, tower, top } = MITHALA_TOWER_STAIR;
  const outside = { x: door.x - 1.5 * Math.sign(tower.x - door.x), z: door.z };
  const last = landings.at(-1), onTop = [{ x: last.x, z: tower.z - 1.5 }, { x: tower.x - 1.5, z: tower.z - 1.5 }];
  const up = walkAlong([outside, door, ...landings, ...onTop], ground(outside.x, outside.z));
  assert.ok(Math.abs(up.at(-1) - (P + top)) < 1e-6, `reached ${up.at(-1).toFixed(3)} of ${P + top}`);
  for (let i = 1; i < up.length; i++) assert.ok(up[i] >= up[i - 1] - 1e-9, 'never drops on the way up');
  // The platform: every landing is passed through at its own height, and the top stands at the layout's floor.
  assert.ok(walkSurfaces.some(s => s.kind === 'deck' && s.a.y === P + top && s.width > 5), 'an open platform');
  assert.equal(walkSurfaces.filter(s => s.kind === 'ramp' && s.id.startsWith(`${MITHALA_BUILDINGS.find(b => b.kind === 'tower').id}-flight-`)).length, 12);
  const down = walkAlong([...onTop].reverse().concat([...landings].reverse(), [door, outside]), P + top);
  assert.ok(Math.abs(down.at(-1) - ground(outside.x, outside.z)) < 1e-6, 'back on the ground');
  for (let i = 1; i < down.length; i++) assert.ok(down[i] <= down[i - 1] + 1e-9 && down[i - 1] - down[i] <= WALK_STEP, 'never falls on the way down');
});

test('the railings and the parapet keep a climber on the stair', () => {
  const { flights, tower, top } = MITHALA_TOWER_STAIR;
  // From the middle of each flight, a step toward the open well is refused; from the platform, the parapet stops them.
  for (const [k, f] of flights.entries()) {
    const x = (f.from.x + f.to.x) / 2, z = (f.from.z + f.to.z) / 2, y = P + (f.from.y + f.to.y) / 2;
    const ix = Math.sign(tower.x - x) * (Math.abs(tower.x - x) > 1 ? 1 : 0), iz = Math.sign(tower.z - z) * (Math.abs(tower.z - z) > 1 ? 1 : 0);
    assert.equal(blocker(x, z, y), undefined, `flight ${k} is clear along its middle`);
    assert.ok(blocker(x + ix * .6, z + iz * .6, y), `flight ${k} is railed on its open side`);
  }
  const half = tower.size / 2 - tower.wall;
  for (const [dx, dz] of [[1, 0], [0, -1], [-1, 0]]) assert.ok(blocker(tower.x + dx * (half - .1), tower.z + dz * (half - .1), P + top), 'the parapet');
  assert.ok(blocker(tower.x + 1, tower.z + half - 1.2, P + top), 'the hatch is railed');
});

test('the walking surfaces are valid, and the floors a step proud of the street are a step', () => {
  assert.doesNotThrow(() => createWalkSurfaces([...walkSurfaces], ground));
  for (const s of walkSurfaces) {
    assert.ok(validWalkSurfaceId(s.id), s.id);
    assert.ok(MITHALA_BUILDINGS.some(b => s.id.startsWith(`${b.id}-`)), `${s.id} belongs to a building`);
    if (s.kind === 'deck' && !s.id.includes('sky-tower')) {
      assert.equal(s.a.y, s.b.y);
      assert.ok(s.a.y - P > 0 && s.a.y - P <= WALK_STEP, `${s.id} is ${(s.a.y - P).toFixed(2)} m up`);
    }
  }
  // The raised granaries are walked under, between their staddles.
  for (const g of MITHALA_BUILDINGS.filter(b => b.kind === 'granary')) {
    let open = 0;
    for (let i = -3; i <= 3; i++) for (let k = -3; k <= 3; k++) if (!blocker(g.x + i * g.width / 8, g.z + k * g.depth / 8, P)) open++;
    assert.ok(open > 20, `${g.id}: ${open} open points underneath`);
  }
});
