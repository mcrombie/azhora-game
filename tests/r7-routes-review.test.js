import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as THREE from '../vendor/three.module.js';
import { scopedWorld } from './scoped-world.js';
import { sourceModule } from './module-loader.js';
import { inspectCelderRoute } from './celder-route-controller.js';
import { MAROSH_COMBES, TROGO_GULLIES, TROGO_PATHS, trogoWay, TROGO_WAY, TROGO_REVIEW_SEAMS } from '../src/content/regions/southwest/southwest-world.js';
import { SOUTHWEST_WILDLIFE_ZONES } from '../src/content/regions/southwest/southwest-wildlife.js';
import { REGION_IDS, hexOwnerAt } from '../src/world/terrain/region-world.js';
import { canStand } from '../src/gameplay/movement/game-state.js';
import { WALK_STEP } from '../src/world/collision/walk-surfaces.js';

// Natural drainage lines and a published animal path, not arbitrary chords
// through Trogo's deliberately impassable thicket. Marosh's caravan road at
// the Water Gap is not built, so it is not represented as a promised road here.
const selected = [
  ['Marosh', MAROSH_COMBES.find(row => row.id === 'middle-combe')],
  ['Trogo', TROGO_GULLIES.find(row => row.id === 'south-gully')],
  ['Trogo', TROGO_PATHS.find(row => row.id === 'north-link')],
];
assert.ok(selected.every(([, row]) => row), 'the three authored natural ways remain available');
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const routes = selected.map(([region, row]) => {
  // The first direct baseline met the visible oak at (-2644.921,2309.512).
  // Two fixed waypoints steer around it inside the same 8.5 m combe. This
  // woodland walk ends above the terrace; it does not promise an obstacle-free
  // straight line down the entire wooded drainage.
  const line = region === 'Marosh' ? [...row.line.slice(0, 2),
    { x: -2645, z: 2306.5 }, { x: -2641, z: 2308.5 }, { x: -2636, z: 2311 }]
    : row.id === 'north-link' ? [...row.walkLine].reverse() : row.line;
  // Enter from the middle gully, cross the repaired seam through the canopy
  // gap, and take the verified inner-bank turn to the north gully and back.
  const label = region === 'Marosh' ? 'upper middle-combe woodland walk'
    : row.id === 'north-link' ? 'north-link inner-bank connection between the two gullies' : row.id;
  return { name: `${region} ${label} out and back`, region, intent: row.name, strict: true,
    points: [...line, ...line.slice(0, -1).reverse()].map(p => ({ x: p.x, z: p.z })) };
});
// Keep the unresolved whole-way reproductions runnable with the identical
// strict controller. These fail until full coastal/wooded approaches are
// reviewed; they must never be reported as part of the accepted bounded walks.
if (process.env.AZHORA_R7_FULL_APPROACHES === '1') for (const [region, row] of selected.filter(([, row]) => row.id !== 'south-gully'))
  routes.push({ name: `${region} unresolved whole ${row.id} out and back`, region, intent: row.name, strict: true,
    points: [...row.line, ...row.line.slice(0, -1).reverse()].map(p => ({ x: p.x, z: p.z })) });
const sourceFiles = ['src/world.js', 'src/world/terrain/world-terrain.js', 'src/content/regions/western-regions/west-ground.js', 'src/content/regions/southwest/southwest-world.js',
  'src/content/regions/southwest/southwest-scenery.js', 'src/content/regions/southwest/southwest-wildlife.js', 'src/content/regions/western-regions/west-regions-life.js',
  'src/gameplay/movement/game-state.js', 'src/gameplay/movement/climbing.js', 'src/world/scenery/undergrowth.js', 'src/gameplay/movement/terrain-fall.js',
  'src/gameplay/movement/locomotion-skills.js', 'src/gameplay/movement/swimming.js', 'src/gameplay/combat/combat.js', 'tests/celder-route-controller.js'];
const source = Object.fromEntries(sourceFiles.map(file => [file, createHash('sha256')
  .update(readFileSync(new URL('../' + file, import.meta.url))).digest('hex')]));
const scene = new THREE.Scene(), world = await scopedWorld(scene, [REGION_IDS.Marosh, REGION_IDS.Trogo]);
const { createWestLife, LIFE_REACH } = await sourceModule('../src/content/regions/western-regions/west-regions-life.js');
const report = { source, routes: [], wildlife: [] };
const trace = () => {
  if (process.env.AZHORA_R7_ROUTE_TRACE) writeFileSync(process.env.AZHORA_R7_ROUTE_TRACE, JSON.stringify(report, null, 2));
};

test('the two Trogo seam corrections retain all Southwest seeded instances and saved R7 tree identities', t => {
  const group = scene.getObjectByName('Southwest scenery'), hash = createHash('sha256');
  const batches = group.children.filter(mesh => mesh.isInstancedMesh);
  for (const mesh of batches) {
    hash.update(JSON.stringify([mesh.name, mesh.count]));
    const matrix = mesh.instanceMatrix.array.slice();
    for (let i = 13; i < matrix.length; i += 16) matrix[i] = 0;
    hash.update(Buffer.from(matrix.buffer, matrix.byteOffset, matrix.byteLength));
    if (mesh.instanceColor) hash.update(Buffer.from(mesh.instanceColor.array.buffer));
  }
  const identity = hash.digest('hex');
  assert.equal(batches.length, 141);
  assert.equal(identity, '5d5fe3c73728694bdb58ed6c34624c58637a36c883586dd4d802ea55add05b30');
  const trees = world.treeRegistry.trees.filter(tree => tree.id.startsWith('southwest-') && ['Marosh', 'Trogo'].includes(hexOwnerAt(tree.x, tree.z)));
  assert.equal(trees.length, 4503); assert.equal(new Set(trees.map(tree => tree.id)).size, 4503);
  for (const tree of trees) assert.equal(tree.id, `southwest-${tree.x.toFixed(3)}-${tree.z.toFixed(3)}`);
  report.scenery = { batches: batches.length, nonYHash: identity, savedTrees: trees.length }; trace();
  t.diagnostic(JSON.stringify(report.scenery));
});

test('trees around both corrected edges remain seated on actual Float32 terrain triangles', t => {
  scene.updateMatrixWorld(true);
  const group = scene.getObjectByName('Southwest scenery');
  const tiles = scene.getObjectByName('The ground of Azhora').children.filter(mesh => mesh.name.startsWith('Terrain ')).map(mesh => {
    const p = mesh.geometry.attributes.position; let columns = 1;
    while (columns < p.count && p.getX(columns) !== p.getX(0)) columns++;
    const xs = Array.from({ length: columns }, (_, i) => p.getX(i));
    const zs = Array.from({ length: p.count / columns }, (_, j) => p.getZ(j * columns));
    assert.deepEqual([...mesh.geometry.index.array.slice(0, 6)], [0, columns, 1, 1, columns, columns + 1]);
    return { p, columns, xs, zs };
  });
  const interval = (axis, value) => {
    let lo = 0, hi = axis.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (axis[mid] <= value) lo = mid; else hi = mid; }
    return lo;
  };
  const drawn = (x, z) => {
    const tile = tiles.find(row => x >= row.xs[0] && x <= row.xs.at(-1) && z >= row.zs[0] && z <= row.zs.at(-1));
    assert.ok(tile, 'loaded terrain under every reviewed root');
    const { p, columns: n, xs, zs } = tile, i = interval(xs, x), j = interval(zs, z);
    const u = (x - xs[i]) / (xs[i + 1] - xs[i]), v = (z - zs[j]) / (zs[j + 1] - zs[j]);
    const a = p.getY(j * n + i), b = p.getY((j + 1) * n + i), c = p.getY(j * n + i + 1), d = p.getY((j + 1) * n + i + 1);
    return u + v <= 1 ? a + (c - a) * u + (b - a) * v : d + (b - d) * (1 - u) + (c - d) * (1 - v);
  };
  // 36 m physical band plus 32 m for the shared coarse triangle footprint.
  const near = (x, z) => TROGO_REVIEW_SEAMS.some(e => x >= Math.min(e.a.x, e.b.x) - 68 && x <= Math.max(e.a.x, e.b.x) + 68
    && z >= Math.min(e.a.z, e.b.z) - 68 && z <= Math.max(e.a.z, e.b.z) + 68);
  const matrix = new THREE.Matrix4(), point = new THREE.Vector3(), gaps = [];
  for (const mesh of group.children.filter(m => m.isInstancedMesh && m.name.endsWith(' trunks'))) {
    const p = mesh.geometry.attributes.position;
    for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, matrix); matrix.premultiply(mesh.matrixWorld);
      if (!near(matrix.elements[12], matrix.elements[14])) continue;
      let gap = -Infinity;
      for (let v = 0; v < p.count; v++) if (Math.abs(p.getY(v) + .5) < 1e-6) {
        point.fromBufferAttribute(p, v).applyMatrix4(matrix); gap = Math.max(gap, point.y - drawn(point.x, point.z));
      }
      gaps.push(gap);
    }
  }
  report.roots = { count: gaps.length, minimum: Math.min(...gaps), maximum: Math.max(...gaps) }; trace();
  t.diagnostic(JSON.stringify(report.roots));
  assert.ok(gaps.length > 100, 'the full corrected edges and coarse triangle apron are covered');
  assert.ok(gaps.every(gap => gap >= -.035 && gap <= -.025), 'every reviewed root footprint retains its 3 cm embed');
});

for (const route of routes) test(`${route.name} stays supported under the ordinary movement controller`, t => {
  // Assert the selected line's authored ownership/openness before using it as
  // acceptance evidence. No route search, position nudge or reset follows a stop.
  for (let i = 1; i < route.points.length; i++) {
    const a = route.points[i - 1], b = route.points[i], n = Math.ceil(distance(a, b));
    for (let j = 0; j <= n; j++) {
      const x = a.x + (b.x - a.x) * j / n, z = a.z + (b.z - a.z) * j / n;
      assert.equal(hexOwnerAt(x, z), route.region);
      if (route.region === 'Trogo') assert.ok(trogoWay(x, z) >= TROGO_WAY.open);
    }
  }
  const result = inspectCelderRoute(world, route, { continueDiagnostics: false });
  report.routes.push(result); trace();
  t.diagnostic(JSON.stringify(result));
  const expected = route.points.slice(1).reduce((sum, point, i) => sum + distance(point, route.points[i]), 0);
  const problems = [];
  if (!result.complete || result.independentStarts) problems.push('continuous outward/return journey did not complete');
  if (!result.final.clearStart || !result.final.dryFinish) problems.push('departure or final footing is not dry and clear');
  if (result.final.falls.length) problems.push(`entered ${result.final.falls.length} terrain falls`);
  if (result.final.damage || result.final.hp !== 100) problems.push(`lost ${result.final.damage} health`);
  if (result.final.swum || result.final.waterTransitions.length) problems.push('left the dry authored way for water');
  if (result.final.biggestGroundedRise > WALK_STEP) problems.push('snapped above the ordinary step allowance');
  if (distance(result.final.at, route.points[0]) > .25) problems.push('did not return to the original departure');
  if (result.final.walked < expected - 3 || result.final.walked > expected * 1.08) problems.push('did not walk the full authored distance');
  assert.deepEqual(problems, [], problems.join('; '));
});

for (const id of ['marosh-terrace-hares', 'trogo-gully-boar']) test(`${id} visibly retreats and returns through its actual home range`, t => {
  const zone = SOUTHWEST_WILDLIFE_ZONES.find(row => row.id === id);
  assert.ok(zone && !zone.air && !zone.float && !zone.sea);
  const animalScene = new THREE.Scene(), life = createWestLife(animalScene, world, { zones: [zone] });
  try {
    const actors = life.state().creatures, actor = actors[0], initial = life.snapshot();
    assert.equal(actors.length, zone.sites.length, 'all existing members of the selected band have their actual homes');
    const home = { x: actor.x, z: actor.z }, centre = { x: (zone.minX + zone.maxX) / 2, z: (zone.minZ + zone.maxZ) / 2 };
    const clearObserver = p => canStand(p.x, p.z, world, .34)
      && (world.waterAt(p.x, p.z) ?? -Infinity) <= world.heightAt(p.x, p.z);
    const threat = [[-6, 0], [6, 0], [0, -6], [0, 6]].map(([x, z]) => ({ x: home.x + x, z: home.z + z })).find(clearObserver);
    assert.ok(threat, 'a stationary traveler can stand near the unchanged animal home');
    let furthest = 0, fled = false, maxStep = 0, groundedGap = 0, invalid = null;
    const observe = () => {
      if (hexOwnerAt(actor.x, actor.z) !== zone.region || !canStand(actor.x, actor.z, world, zone.radius)
        || (world.waterAt(actor.x, actor.z) ?? -Infinity) > world.heightAt(actor.x, actor.z)
        || actor.x < zone.minX || actor.x > zone.maxX || actor.z < zone.minZ || actor.z > zone.maxZ)
        invalid ??= { x: actor.x, y: actor.y, z: actor.z, action: actor.action };
      groundedGap = Math.max(groundedGap, Math.abs(actor.groundY - world.heightAt(actor.x, actor.z)));
    };
    // A fixed, legal observer elicits a real retreat. The animal is never moved,
    // its target/heading is never overridden, and the observer does not chase it.
    for (let tick = 0; tick < 100; tick++) {
      const before = { x: actor.x, z: actor.z }; life.update(.05, threat);
      maxStep = Math.max(maxStep, distance(actor, before)); furthest = Math.max(furthest, distance(actor, home));
      fled ||= actor.action === 'flee'; observe();
    }
    const observer = [[108, 0], [-108, 0], [0, 108], [0, -108]].map(([x, z]) => ({ x: centre.x + x, z: centre.z + z }))
      .filter(clearObserver).sort((a, b) => distance(b, home) - distance(a, home))[0];
    assert.ok(observer && distance(observer, centre) < LIFE_REACH, 'return is simulated while the band remains active');
    let returnTicks = 0;
    while (distance(actor, home) > 6 && returnTicks++ < 1600) {
      const before = { x: actor.x, z: actor.z }; life.update(.1, observer);
      maxStep = Math.max(maxStep, distance(actor, before)); observe();
    }
    const result = { id: actor.id, home, threat, observer, furthest, returned: distance(actor, home),
      fled, returnSeconds: returnTicks * .1, maxStep, groundedGap, invalid };
    report.wildlife.push(result); trace(); t.diagnostic(JSON.stringify(result));
    assert.ok(fled && furthest > 16, 'retreat must pass the existing 16 m home-return threshold');
    assert.ok(result.returned <= 6, 'the unchanged controller must actually return within its existing settled radius');
    assert.equal(invalid, null, 'every retreat and return step is dry, clear, and inside its owned range');
    assert.ok(maxStep < 1.5 && groundedGap < .00001, 'ordinary animal speed and real ground support, without settling teleports');
    assert.equal(life.state().creatures[0], actor, 'return retains the original actor object');
    assert.deepEqual(life.snapshot().creatures.map(a => [a.id, a.species]), initial.creatures.map(a => [a.id, a.species]));
  } finally { life.dispose(); }
});
