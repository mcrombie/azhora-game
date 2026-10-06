import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './module-loader.js';
import { scopedWorld } from './scoped-world.js';

/**
 * East Izol's scenery and wildlife: the pasture, maquis, garrigue, rock, wind-bent trees and coves of the island's
 * eastern half, and the animals on it - the seabird colonies on the headlands, the dolphins offshore, the hares in
 * the gorse - held to the ground as it is built and to the west's laws (`tests/west-life.test.js`), law by law, for
 * these ranges only and on a world scoped to East and West Izol, so that it runs in a minute rather than the full
 * world's three. The scenery is built here on the world's own ground function, as the game builds it.
 */
const THREE = await sourceModule('../vendor/three.module.js');
const { REGION_CELLS, REGION_IDS, regionAt, WORLD_BOUNDS, SEA_LEVEL } = await sourceModule('../src/world/terrain/region-world.js');
const { groundWithRiver } = await sourceModule('../src/world/terrain/world-terrain.js');
const { canStand, canSwim, WATERLINE } = await sourceModule('../src/gameplay/movement/game-state.js');
const { timberForSpecies } = await sourceModule('../src/gameplay/skills/woodcutting/wood-species.js');
const { EAST_IZOL_WILDLIFE_ZONES, eastIzolWildlifeClear } = await sourceModule('../src/content/regions/east-izol/east-izol-wildlife.js');
const GROUND = await sourceModule('../src/content/regions/east-izol/east-izol-world.js');
const { WEST_LIFE_ZONES, createWestLife, LIFE_REACH } = await sourceModule('../src/content/regions/western-regions/west-regions-life.js');
const SCENERY = await sourceModule('../src/content/regions/east-izol/east-izol-scenery.js');
const { createEastIzolScenery, createEastIzolScenerySteps, readEastIzolGround, eastIzolTrailDistance, eastIzolWaterAt, eastIzolReserved,
  EAST_IZOL_SIGHTLINES, eastIzolSightline } = SCENERY;
const { finishBuild } = await sourceModule('../src/world/loading/build-steps.js');
const { getTreeRegistry } = await sourceModule('../src/world/scenery/tree-registry.js');

const NAME = 'East Izol', ZONES = EAST_IZOL_WILDLIFE_ZONES;
const ground = ZONES.filter(zone => !zone.air && !zone.sea);
const LANDMARKS = [...GROUND.EAST_IZOL_LANDMARKS, GROUND.EAST_IZOL_ARRIVAL];
const inBox = (zone, x, z, margin = 0) => x >= zone.minX - margin && x <= zone.maxX + margin && z >= zone.minZ - margin && z <= zone.maxZ + margin;
const slope = (heightAt, x, z, r = 1) => Math.hypot((heightAt(x + r, z) - heightAt(x - r, z)) / (2 * r), (heightAt(x, z + r) - heightAt(x, z - r)) / (2 * r));
const sea = (x, z) => groundWithRiver(x, z) < WATERLINE;

// ---------------------------------------------------------------------------
// The tables
// ---------------------------------------------------------------------------
test('the East Izol ranges are wired, wild, sourced and sized to the reach they are run from', () => {
  for (const zone of ZONES) assert.ok(WEST_LIFE_ZONES.includes(zone), `${zone.id} is not in the west's table`);
  assert.equal(new Set(WEST_LIFE_ZONES.map(zone => zone.id)).size, WEST_LIFE_ZONES.length, 'a range id is used twice');
  for (const zone of ZONES) assert.equal(zone.region, NAME, zone.id);
  // What the brief asks for on a rocky island in the Iberos: the seabird colonies on the headlands, the dolphins
  // offshore, the hares in the gorse.
  const kinds = species => ZONES.filter(zone => zone.species === species);
  assert.ok(kinds('gull').length >= 2 && kinds('gull').every(zone => !zone.air && zone.sites.length >= 3), 'the headland colonies are gulls on the ground, three or more');
  assert.ok(kinds('sea-plunger').length >= 1 && kinds('sea-plunger').every(zone => zone.air && zone.plunge), 'the sea-plungers fish off the headlands');
  assert.ok(kinds('dolphin').length >= 1 && kinds('dolphin').every(zone => zone.sea), 'the grey dolphins are out at sea');
  assert.ok(kinds('upland-hare').length >= 2, 'the hares are in the gorse');
  // Nothing anybody owns: the highland tribes' flocks are stock, and stock belongs to somebody.
  const DOMESTIC = new Set(['longhorn', 'nethrani-cattle', 'hill-sheep', 'horse', 'goat', 'pig', 'dog']);
  for (const zone of ZONES) assert.ok(!DOMESTIC.has(zone.species), `${zone.id} is stock, and stock belongs to somebody`);
  for (const zone of ZONES) assert.ok(zone.note?.length > 40, `${zone.id} does not say where it comes from`);
  for (const zone of ground) {
    const half = Math.hypot(zone.maxX - zone.minX, zone.maxZ - zone.minZ) / 2;
    assert.ok(half < LIFE_REACH, `${zone.id}: half its diagonal is ${half.toFixed(0)} m, past the ${LIFE_REACH} m it is run from`);
    for (const [x, z] of zone.sites) assert.ok(inBox(zone, x, z), `${zone.id}: a home lies outside its own range`);
    for (let i = 0; i < zone.sites.length; i++) for (let j = 0; j < i; j++)
      assert.ok(Math.hypot(zone.sites[i][0] - zone.sites[j][0], zone.sites[i][1] - zone.sites[j][1]) > zone.radius * 2 * zone.scale, `${zone.id}: two homes overlap`);
  }
});

/**
 * **Every band its own layout.** The Celder review found two herds put down in one pattern - the same homes, moved
 * - and a flock that reads as a stamp is the first thing a traveler's eye catches. So the shape of every band here
 * (its homes about their own middle) is held against every other band of the same kind in the west, as drawn and
 * mirrored: no two may match home for home within a metre.
 */
test('no two bands are put down in one pattern', () => {
  const shape = sites => {
    const cx = sites.reduce((n, s) => n + s[0], 0) / sites.length, cz = sites.reduce((n, s) => n + s[1], 0) / sites.length;
    return sites.map(([x, z]) => [x - cx, z - cz]);
  };
  const same = (a, b) => {
    if (a.length !== b.length) return false;
    const variants = [[1, 1], [-1, 1], [1, -1], [-1, -1]].map(([fx, fz]) => b.map(([x, z]) => [x * fx, z * fz]));
    return variants.some(v => a.every(([x, z]) => v.some(([u, w]) => Math.hypot(u - x, w - z) < 1)));
  };
  for (const zone of ZONES) {
    if (zone.sites.length < 2) continue;
    // A band whose homes are all one point is a stamp of a different kind.
    const spread = shape(zone.sites).reduce((n, [x, z]) => Math.max(n, Math.hypot(x, z)), 0);
    assert.ok(spread > 1.5, `${zone.id}: every animal shares one home`);
    for (const other of WEST_LIFE_ZONES) {
      if (other === zone || other.species !== zone.species || other.sites.length !== zone.sites.length) continue;
      assert.ok(!same(shape(zone.sites), shape(other.sites)), `${zone.id} is laid out in the same pattern as ${other.id}`);
    }
  }
});

// ---------------------------------------------------------------------------
// The scenery, built on the ground as it is
// ---------------------------------------------------------------------------
// A drawn surface twelve centimetres off the logical one catches anything rooted to the wrong one.
const rendered = (x, z) => groundWithRiver(x, z) + .12;
const colliders = [], parent = new THREE.Group();
const built = createEastIzolScenery({ parent, heightAt: groundWithRiver, renderedGroundHeight: rendered, colliders });
const field = finishBuild(readEastIzolGround(groundWithRiver));
const instances = root => {
  const out = [], matrix = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  root.traverse(mesh => {
    if (!mesh.isInstancedMesh) return;
    for (let i = 0; i < mesh.count; i++) { mesh.getMatrixAt(i, matrix); matrix.decompose(p, q, s); out.push({ mesh, x: p.x, y: p.y, z: p.z, sy: s.y }); }
  });
  return out;
};

test('the island is pasture, maquis, garrigue and rock, with its trees in the folds and the forest cells', () => {
  const m = built.metrics, hexes = REGION_CELLS[NAME].length;
  assert.ok(m.turf + m.pasture > 150 * hexes, `${m.turf + m.pasture} tufts of grass on ${hexes} hexes`);
  assert.ok(m.garrigue > 10 * hexes && m.maquis > 10 * hexes && m.gorse > 2 * hexes, `the scrub: ${JSON.stringify(m)}`);
  assert.ok(m.stones > 15 * hexes && m.boulders > 2 * hexes, `the stone: ${m.stones} stones, ${m.boulders} boulders`);
  assert.ok(m.forbs > 4 * hexes && m.asphodel > 0 && m.thrift > 0, `the flowers: ${m.forbs}`);
  assert.ok(m.shingle > 50, `the coves: ${m.shingle} pebbles of shingle`);
  assert.ok(m.trees >= 80 && m.trees < 30 * hexes, `${m.trees} trees on ${hexes} hexes`);
  assert.ok(m.pines > 20 && m.oaks > 20, `wind-bent pine and evergreen oak: ${m.pines} pines, ${m.oaks} oaks`);
  assert.equal(m.trees, built.trees.length);
  for (const mesh of built.root.children) {
    assert.ok(Number.isFinite(mesh.boundingSphere?.radius ?? mesh.geometry.boundingSphere?.radius), mesh.name);
    if (/sea turf|pasture grass|damp rush/.test(mesh.name)) assert.ok(mesh.boundingSphere.radius < 175, `${mesh.name}: ${mesh.boundingSphere.radius.toFixed(0)} m, too wide to cull`);
  }
  const trees = getTreeRegistry(colliders).trees;
  assert.equal(trees.length, m.trees);
  const wooded = new Map();
  for (const tree of trees) {
    assert.ok(timberForSpecies(tree.species), tree.id); assert.equal(tree.harvestable, true);
    assert.equal(regionAt(tree.x, tree.z)?.name, NAME, `${tree.id} stands in ${regionAt(tree.x, tree.z)?.name}`);
    assert.equal(eastIzolWaterAt(tree.x, tree.z, groundWithRiver(tree.x, tree.z)), null, `${tree.id} stands in the water`);
    assert.ok(Math.abs(tree.y - rendered(tree.x, tree.z)) < 1e-9, `${tree.id} is not on the drawn ground`);
    const word = field.habitat(tree.x, tree.z);
    wooded.set(word, (wooded.get(word) ?? 0) + 1);
    // Each species where it grows: pine and oak in the sheltered ground, juniper out in the wind, tamarisk at a cove.
    if (tree.species === 'tamarisk') assert.ok(['strand', 'bank'].includes(word), `${tree.id}: a tamarisk out on the ${word}`);
    if (tree.species === 'holm-oak' || tree.species === 'stone-pine')
      assert.ok(['wood', 'fold', 'bank', 'maquis', 'pasture', 'height'].includes(word), `${tree.id}: a ${tree.species} out on the ${word}`);
    if (tree.species === 'common-juniper') assert.ok(['headland', 'garrigue', 'crag', 'height'].includes(word), `${tree.id}: a juniper in the ${word}`);
    if (tree.species === 'hawthorn') assert.ok(['pasture', 'garrigue'].includes(word), `${tree.id}: a thorn in the ${word}`);
  }
  // The woods are pockets in the folds and the forest cells, not a cover over the island.
  const sheltered = (wooded.get('wood') ?? 0) + (wooded.get('fold') ?? 0);
  assert.ok(sheltered > .6 * trees.length, `only ${sheltered} of ${trees.length} trees are in the woods and folds: ${JSON.stringify([...wooded])}`);
});

test('nothing is planted in the sea, nothing over the line, and everything stands on the drawn ground', () => {
  let checked = 0;
  for (const item of instances(built.root)) {
    if (/trunks|crowns/.test(item.mesh.name)) continue;
    checked++;
    const owner = regionAt(item.x, item.z)?.name;
    // A shrub's or a flower's side lobes stand a hand off its centre, which is planted a lobe's width inside.
    if (!/composites|garrigue|maquis|gorse|driftwood/.test(item.mesh.name)) assert.equal(owner, NAME, `${item.mesh.name}: an instance at ${item.x.toFixed(1)},${item.z.toFixed(1)} is over the line in ${owner}`);
    if (!/maquis|gorse|garrigue|driftwood/.test(item.mesh.name))
      assert.equal(eastIzolWaterAt(item.x, item.z, groundWithRiver(item.x, item.z)), null, `${item.mesh.name}: planted in the water at ${item.x.toFixed(1)},${item.z.toFixed(1)}`);
    const surface = rendered(item.x, item.z);
    // Positions come back through a float32 matrix, so a centimetre is as near as the question can be asked.
    if (/turf|grass|rush/.test(item.mesh.name)) assert.ok(Math.abs(item.y - surface + .03) < .01, `${item.mesh.name} floats or sinks by ${(item.y - surface + .03).toFixed(3)} m`);
    else assert.ok(item.y > surface - 1.5 && item.y < surface + 2.5, `${item.mesh.name} is off the ground by ${(item.y - surface).toFixed(2)} m`);
  }
  assert.ok(checked > 12000, `${checked} instances`);
  // Trunks run into the ground they are drawn on, and however far the wind has laid one over, it comes out of the
  // ground at the tree's own point: where its collider stands and where it is felled from.
  const matrix = new THREE.Matrix4(), base = new THREE.Vector3(), top = new THREE.Vector3();
  const trunk = built.root.children.find(mesh => /typed living trunks/.test(mesh.name));
  let leaning = 0;
  built.trees.forEach((tree, i) => {
    trunk.getMatrixAt(i, matrix); base.set(0, -.5, 0).applyMatrix4(matrix); top.set(0, .5, 0).applyMatrix4(matrix);
    const surface = rendered(tree.x, tree.z), t = (surface - base.y) / (top.y - base.y);
    assert.ok(base.y < surface - .05, `${tree.species} at ${tree.x.toFixed(1)},${tree.z.toFixed(1)}: a floating root`);
    assert.ok(Math.hypot(base.x + (top.x - base.x) * t - tree.x, base.z + (top.z - base.z) * t - tree.z) < 1e-2,
      `${tree.species} at ${tree.x.toFixed(1)},${tree.z.toFixed(1)}: its trunk does not come out of the ground where it stands`);
    assert.ok(top.y < surface + tree.height, `${tree.species}: its trunk stands out of the top of its crown`);
    const lean = Math.atan2(Math.hypot(top.x - base.x, top.z - base.z), top.y - base.y);
    assert.ok(lean < .45, `${tree.species}: laid over ${lean.toFixed(2)} rad`);
    // And it leans away from the channel wind, to the south-east, give or take.
    if (lean > .05) { leaning++; assert.ok(top.x - base.x > -.2 && top.z - base.z > -.2, `${tree.species} at ${tree.x.toFixed(1)},${tree.z.toFixed(1)} leans into the wind`); }
  });
  assert.ok(leaning > built.trees.length / 2, `only ${leaning} of ${built.trees.length} trees are wind-bent`);
});

test('nothing that blocks a walker stands on a trail, at a landmark, on a reserved place or in a ground animal\'s range', () => {
  const world = { bounds: WORLD_BOUNDS, heightAt: groundWithRiver, colliders };
  for (const c of colliders) {
    assert.ok(eastIzolTrailDistance(c.x, c.z) > c.r + .6, `${c.id} stands on a trail`);
    for (const p of LANDMARKS) assert.ok(Math.hypot(c.x - p.x, c.z - p.z) > c.r + 4, `${c.id} stands at ${p.id ?? 'the arrival'}`);
    assert.ok(!eastIzolReserved(c.x, c.z, c.r), `${c.id} stands on a place kept for something to be built`);
    assert.ok(!eastIzolWildlifeClear(c.x, c.z, c.r), `${c.id} stands in an animal's range`);
  }
  for (const trail of GROUND.EAST_IZOL_TRAILS) for (let i = 1; i < trail.points.length; i++) {
    const a = trail.points[i - 1], b = trail.points[i], length = Math.hypot(b.x - a.x, b.z - a.z);
    for (let d = 0; d <= length; d += 1) {
      const x = a.x + (b.x - a.x) * d / length, z = a.z + (b.z - a.z) * d / length;
      if (eastIzolWaterAt(x, z, groundWithRiver(x, z)) !== null) continue;   // a wet foot is the ground agent's to answer for
      assert.ok(canStand(x, z, world, .5), `${trail.id}: scenery blocks the trail at ${x.toFixed(1)},${z.toFixed(1)}`);
    }
  }
  for (const p of LANDMARKS) if (!sea(p.x, p.z)) assert.ok(canStand(p.x, p.z, world, .5), `${p.id ?? 'the arrival'}: blocked`);
  // "Where all three presences can witness it": no tree between the Hearthstone's site and any of the three summits.
  assert.equal(EAST_IZOL_SIGHTLINES.length, 3, 'the Hearthstone sees three Presences');
  for (const tree of built.trees) assert.ok(!eastIzolSightline(tree.x, tree.z, tree.radius), `${tree.species} at ${tree.x.toFixed(1)},${tree.z.toFixed(1)} stands between the Hearthstone and a Presence`);
});

test('the scenery is one seeded stream: it pauses throughout and builds the same island every time', () => {
  const again = [], steps = createEastIzolScenerySteps({ parent: new THREE.Group(), heightAt: groundWithRiver, renderedGroundHeight: rendered, colliders: again });
  let step, pauses = 0;
  do { step = steps.next(); if (!step.done) pauses++; } while (!step.done);
  assert.ok(pauses > 500, `${pauses} scheduling points`);
  assert.deepEqual(step.value.metrics, built.metrics);
  assert.deepEqual(again.map(c => c.id), colliders.map(c => c.id));
});

// ---------------------------------------------------------------------------
// The animals on the world as the game builds it
// ---------------------------------------------------------------------------
let scoped = null;
const izolWorld = () => scoped ??= scopedWorld(new THREE.Scene(), [REGION_IDS[NAME], REGION_IDS['West Izol']]);

test('every East Izol home is its own dry, standable, gentle ground, off the trails', async () => {
  const world = await izolWorld(), H = (x, z) => world.heightAt(x, z);
  for (const zone of ground) for (const [x, z] of zone.sites) {
    const at = `${zone.id} at ${x},${z}`;
    assert.equal(regionAt(x, z)?.name, zone.region, at);
    assert.ok(canStand(x, z, world, zone.radius), `${at}: cannot stand there`);
    assert.ok(H(x, z) >= world.waterAt(x, z), `${at}: under water`);
    assert.ok(slope(H, x, z, Math.max(.4, zone.radius)) <= zone.maxSlope, `${at}: slope ${slope(H, x, z).toFixed(2)}`);
    assert.ok(eastIzolTrailDistance(x, z) > 3, `${at}: on a trail`);
    assert.ok(!eastIzolReserved(x, z, 2), `${at}: on a place kept for something to be built`);
  }
  // And each band is put down where it was written, not shuffled to the nearest clear spot.
  const life = createWestLife(new THREE.Scene(), world, { zones: ZONES });
  try {
    const homes = new Map(life.state().creatures.map(animal => [animal.id, { x: animal.x, z: animal.z }]));
    for (const zone of ZONES) zone.sites.forEach(([x, z], i) => {
      const home = homes.get(`${zone.id}-${i + 1}`);
      assert.ok(home, `${zone.id}-${i + 1} has no home it can stand on`);
      assert.ok(Math.hypot(home.x - x, home.z - z) < .01, `${zone.id}-${i + 1} was moved off its written home`);
    });
  } finally { life.dispose(); }
});

/**
 * **The sea's own laws.** A dolphin works a line up and down its range and never looks at the ground under it, so
 * every point of its range must be open water nobody can stand in; a sea-plunger folds and falls into the sea from
 * wherever it is on its circle, so the whole circle must be over water. Asked of the world as built.
 */
test('the dolphins and the diving sea-plungers are over open sea throughout, where nobody can walk to them', async () => {
  const world = await izolWorld();
  for (const zone of ZONES.filter(zone => zone.sea || zone.plunge)) {
    const points = zone.sea
      ? Array.from({ length: 49 }, (_, i) => [zone.minX + (zone.maxX - zone.minX) * (i % 7) / 6, zone.minZ + (zone.maxZ - zone.minZ) * Math.floor(i / 7) / 6])
      : zone.sites.flatMap(([x, z]) => Array.from({ length: 36 }, (_, i) => [x + Math.cos(i * Math.PI / 18) * zone.circle, z + Math.sin(i * Math.PI / 18) * zone.circle]));
    for (const [x, z] of points) {
      assert.ok(world.heightAt(x, z) < SEA_LEVEL - 1, `${zone.id}: ${x.toFixed(0)},${z.toFixed(0)} is not open sea (ground ${world.heightAt(x, z).toFixed(2)})`);
      assert.ok(!canStand(x, z, world, .4), `${zone.id}: ${x.toFixed(0)},${z.toFixed(0)} can be stood on`);
    }
    // Seen from the island: the middle of the range is within the reach the band is run from of East Izol's dry ground.
    const cx = (zone.minX + zone.maxX) / 2, cz = (zone.minZ + zone.maxZ) / 2;
    let shore = Infinity;
    for (let a = 0; a < 72; a++) for (let d = 5; d < LIFE_REACH; d += 5) {
      const x = cx + Math.cos(a * Math.PI / 36) * d, z = cz + Math.sin(a * Math.PI / 36) * d;
      if (regionAt(x, z)?.name === NAME && canStand(x, z, world, .4)) { shore = Math.min(shore, d); break; }
    }
    assert.ok(shore < LIFE_REACH - 20, `${zone.id}: nobody on East Izol's shore is near enough for it to be running (${shore} m)`);
  }
  // The pods swim at the sea's level.
  const life = createWestLife(new THREE.Scene(), world, { zones: ZONES.filter(zone => zone.sea) });
  try {
    for (const zone of ZONES.filter(zone => zone.sea)) {
      const watcher = { x: (zone.minX + zone.maxX) / 2, z: (zone.minZ + zone.maxZ) / 2 };
      for (let step = 0; step < 90; step++) life.update(1 / 30, watcher, true);
    }
    for (const animal of life.snapshot().creatures) assert.ok(Math.abs(animal.groundY - (SEA_LEVEL - .5)) < .01, `${animal.id} is not swimming at the sea's level`);
  } finally { life.dispose(); }
});

/**
 * The chase from `tests/west-life.test.js`, to the line: a traveler forty metres off makes straight for the band's
 * first animal for `seconds`, and the report says how near they got and what the band did.
 */
const WALK = 4.2, RUN = 7.2, HZ = 60;
function chase(world, zone, pace, seconds, { bearing = Math.PI / 2, arm = 3 } = {}) {
  let held = 0;
  const life = createWestLife(new THREE.Scene(), world, { zones: [zone] });
  const band = () => life.state().creatures;
  const first = band()[0], homes = new Map(band().map(animal => [animal.id, { x: animal.x, z: animal.z }]));
  const player = { x: first.x + Math.sin(bearing) * 40, z: first.z + Math.cos(bearing) * 40 };
  const seen = new Set(), report = { life, band, homes, player, zone, target: first.id, closest: Infinity, reachedAt: null, held: 0, actions: seen, offFooting: 0 };
  const watch = t => {
    for (const animal of band()) {
      seen.add(animal.action);
      const grounded = !animal.hidden && animal.lift < 1, standing = !animal.hidden && animal.action !== 'fly' && animal.action !== 'dive';
      if (standing && !((canStand(animal.x, animal.z, world, zone.radius) || (zone.float && canSwim(animal.x, animal.z, world, zone.radius)))
        && inBox(zone, animal.x, animal.z))) report.offFooting++;
      if (animal.id !== first.id) continue;
      const d = Math.hypot(animal.x - player.x, animal.z - player.z);
      if (grounded) { report.closest = Math.min(report.closest, d); if (d < 1.5 && report.reachedAt === null) report.reachedAt = t; }
      held = grounded && d < arm ? held + 1 : 0; report.held = Math.max(report.held, held / HZ);
    }
  };
  for (let i = 0; i < seconds * HZ; i++) {
    const animal = band().find(item => item.id === first.id), dx = animal.x - player.x, dz = animal.z - player.z, d = Math.hypot(dx, dz);
    if (d > .4) { const step = Math.min(d - .3, pace / HZ); player.x += dx / d * step; player.z += dz / d * step; }
    life.update(1 / HZ, player, true); watch(i / HZ);
  }
  report.watch = watch;
  return report;
}
const fromHome = report => report.band().map(animal => { const home = report.homes.get(animal.id); return Math.hypot(animal.x - home.x, animal.z - home.z); });

test('the west\'s first law, for East Izol: nothing on this island can be walked down', async () => {
  const world = await izolWorld();
  // From both sides, which is what "a band has room behind it" asks: the west's own law comes from the east only.
  for (const zone of ground) for (const bearing of [Math.PI / 2, -Math.PI / 2]) {
    const walked = chase(world, zone, WALK, 30, { arm: 3, bearing });
    assert.ok(!walked.actions.has('shut'), `${zone.id}: only the tortoise shuts`);
    assert.ok(walked.closest >= 3, `${zone.id} (from ${bearing.toFixed(2)}): somebody walking got within ${walked.closest.toFixed(2)} m of ${walked.target}`);
    assert.equal(walked.offFooting, 0, `${zone.id}: an animal on the ground stood somewhere it cannot stand`);
    walked.life.dispose();
  }
});

test('the quick ones cannot be run down either: the hares on their legs, the gulls into the air', async () => {
  const world = await izolWorld();
  for (const zone of ground.filter(zone => ['upland-hare', 'gull'].includes(zone.species))) {
    const run = chase(world, zone, RUN, 30);
    assert.equal(run.reachedAt, null, `${zone.id}: somebody running reached ${run.target} after ${run.reachedAt?.toFixed(1)} s`);
    assert.equal(run.offFooting, 0, `${zone.id}: an animal on the ground stood somewhere it cannot stand`);
    if (zone.species === 'gull') assert.ok(run.actions.has('fly'), `${zone.id}: a gull that is run at takes to the air`);
    run.life.dispose();
  }
});

test('a chased East Izol band is home again in a few minutes, watched or not', async () => {
  const world = await izolWorld();
  for (const zone of ground) {
    const watched = chase(world, zone, RUN, 20), centre = { x: (zone.minX + zone.maxX) / 2, z: (zone.minZ + zone.maxZ) / 2 };
    const clear = spot => Math.min(...watched.band().map(animal => Math.hypot(animal.x - spot.x, animal.z - spot.z)));
    const park = [[100, 0], [-100, 0], [0, 100], [0, -100], [70, 70], [-70, -70], [70, -70], [-70, 70]]
      .map(([dx, dz]) => ({ x: centre.x + dx, z: centre.z + dz })).sort((a, b) => clear(b) - clear(a))[0];
    assert.ok(clear(park) > 40, `${zone.id}: nowhere within reach of the band is clear of all of it`);
    watched.player.x = park.x; watched.player.z = park.z;
    for (let i = 0; i < 180 * 30; i++) { watched.life.update(1 / 30, watched.player, true); watched.watch(0); }
    assert.ok(Math.max(...fromHome(watched)) <= 20, `${zone.id}: three minutes on, watched, one is still ${Math.max(...fromHome(watched)).toFixed(0)} m from home`);
    assert.equal(watched.offFooting, 0, `${zone.id}: an animal going home stood somewhere it cannot stand`);
    watched.life.dispose();
    const left = chase(world, zone, RUN, 20), far = { x: centre.x + 1000, z: centre.z };
    const fromHomes = spot => Math.min(...[...left.homes.values()].map(home => Math.hypot(home.x - spot.x, home.z - spot.z)));
    const back = [[100, 0], [-100, 0], [0, 100], [0, -100]].map(([dx, dz]) => ({ x: centre.x + dx, z: centre.z + dz }))
      .sort((a, b) => fromHomes(b) - fromHomes(a))[0];
    for (let i = 0; i < 240 * 30; i++) left.life.update(1 / 30, far, true);
    left.life.update(1 / 30, back, true);
    assert.ok(Math.max(...fromHome(left)) <= 20, `${zone.id}: left alone for four minutes and still ${Math.max(...fromHome(left)).toFixed(0)} m from home`);
    assert.ok(left.band().every(animal => !animal.hidden && animal.action !== 'fly'), `${zone.id}: somebody is still in the air or under the water`);
    left.life.dispose();
  }
});

/** The birds that only fly circle over the island or its own water, and a low one keeps clear of the ground under it. */
test('the hawk, the harrier and the sea-plungers fly over East Izol and its sea, clear of the ground', async () => {
  const world = await izolWorld();
  const life = createWestLife(new THREE.Scene(), world, { zones: ZONES.filter(zone => zone.air) });
  try {
    for (const zone of ZONES.filter(zone => zone.air)) {
      const watcher = { x: (zone.minX + zone.maxX) / 2, z: (zone.minZ + zone.maxZ) / 2 };
      let lowest = Infinity;
      for (let step = 0; step < 60 * 20; step++) {
        life.update(1 / 20, watcher, true);
        for (const bird of life.snapshot().creatures.filter(animal => animal.id.startsWith(`${zone.id}-`))) {
          if (bird.hidden || ['plunge', 'under', 'climb'].includes(bird.action)) continue;
          lowest = Math.min(lowest, bird.y - Math.max(world.heightAt(bird.x, bird.z), SEA_LEVEL));
          const owner = regionAt(bird.x, bird.z)?.name;
          assert.ok(owner === NAME || groundWithRiver(bird.x, bird.z) < WATERLINE, `${zone.id}: a bird is over ${owner}`);
        }
      }
      assert.ok(lowest > 4, `${zone.id}: a bird came within ${lowest.toFixed(1)} m of the ground`);
    }
  } finally { life.dispose(); }
});
