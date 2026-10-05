import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './module-loader.js';
import { scopedWorld } from './scoped-world.js';

/**
 * South and North Celder's scenery and wildlife: the one plain, its grass, scrub, stone and water's margin,
 * and the animals on it - the frostback herds above all - held to the ground as it is built and to the west's
 * laws (`tests/west-life.test.js`), law by law, for these ranges only and on a world scoped to the two
 * countries, so that it runs in a minute rather than the full world's three.
 */
const THREE = await sourceModule('../vendor/three.module.js');
const { REGION_CELLS, REGION_IDS, regionAt, WORLD_BOUNDS } = await sourceModule('../src/region-world.js');
const { groundWithRiver, legacyCelderGroundHeight } = await sourceModule('../src/world-terrain.js');
const { canStand, canSwim } = await sourceModule('../src/game-state.js');
const { timberForSpecies } = await sourceModule('../src/wood-species.js');
const { SOUTH_CELDER_WILDLIFE_ZONES, southCelderWildlifeClear } = await sourceModule('../src/south-celder-wildlife.js');
const { NORTH_CELDER_WILDLIFE_ZONES, northCelderWildlifeClear } = await sourceModule('../src/north-celder-wildlife.js');
const SOUTH = await sourceModule('../src/south-celder-world.js');
const NORTH = await sourceModule('../src/north-celder-world.js');
const { WEST_LIFE_ZONES, createWestLife, LIFE_REACH } = await sourceModule('../src/west-regions-life.js');
const { createSouthCelderScenery, celderTrailDistance, celderWaterAt, readCelderGround } = await sourceModule('../src/south-celder-scenery.js');
const { finishBuild } = await sourceModule('../src/build-steps.js');
const { createNorthCelderScenery } = await sourceModule('../src/north-celder-scenery.js');
const { getTreeRegistry } = await sourceModule('../src/tree-registry.js');

const ZONES = [...SOUTH_CELDER_WILDLIFE_ZONES, ...NORTH_CELDER_WILDLIFE_ZONES];
const ground = ZONES.filter(zone => !zone.air && !zone.sea);
const TRAILS = [...SOUTH.SOUTH_CELDER_TRAILS, ...NORTH.NORTH_CELDER_TRAILS];
const LANDMARKS = [...SOUTH.SOUTH_CELDER_LANDMARKS, ...NORTH.NORTH_CELDER_LANDMARKS];
const inBox = (zone, x, z, margin = 0) => x >= zone.minX - margin && x <= zone.maxX + margin && z >= zone.minZ - margin && z <= zone.maxZ + margin;
const slope = (heightAt, x, z, r = 1) => Math.hypot((heightAt(x + r, z) - heightAt(x - r, z)) / (2 * r), (heightAt(x, z + r) - heightAt(x, z - r)) / (2 * r));

// ---------------------------------------------------------------------------
// The tables
// ---------------------------------------------------------------------------
test('the Celder ranges are wired, wild and sized to the reach they are run from', () => {
  for (const zone of ZONES) assert.ok(WEST_LIFE_ZONES.includes(zone), `${zone.id} is not in the west's table`);
  assert.equal(new Set(WEST_LIFE_ZONES.map(zone => zone.id)).size, WEST_LIFE_ZONES.length, 'a range id is used twice');
  for (const zone of SOUTH_CELDER_WILDLIFE_ZONES) assert.equal(zone.region, 'South Celder', zone.id);
  for (const zone of NORTH_CELDER_WILDLIFE_ZONES) assert.equal(zone.region, 'North Celder', zone.id);
  // The lore's animal, in both halves of the plain it is named for, as herds and not as single beasts.
  for (const list of [SOUTH_CELDER_WILDLIFE_ZONES, NORTH_CELDER_WILDLIFE_ZONES]) {
    const herds = list.filter(zone => zone.species === 'frostback' && zone.scale >= 1);
    assert.ok(herds.length >= 2 && herds.every(zone => zone.sites.length >= 5), 'a frostback herd is five or more');
    assert.ok(list.some(zone => zone.species === 'turkey-vulture' && zone.air), 'the black soar-bird follows the herds');
  }
  // Nothing anybody owns: not a horse on the horse plain, nor any other stock.
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

// ---------------------------------------------------------------------------
// The scenery, built on the ground as it is
// ---------------------------------------------------------------------------
// A drawn surface twelve centimetres off the logical one catches anything rooted to the wrong one.
const rendered = (x, z) => groundWithRiver(x, z) + .12;
// Match world.js: preserve the established candidate layout while drawing and
// grounding survivors on today's terrain, including Canerd's made ground.
const candidateHeightAt = legacyCelderGroundHeight;
const colliders = [], parent = new THREE.Group();
const built = {
  'South Celder': createSouthCelderScenery({ parent, heightAt: groundWithRiver, renderedGroundHeight: rendered, candidateHeightAt, colliders }),
  'North Celder': createNorthCelderScenery({ parent, heightAt: groundWithRiver, renderedGroundHeight: rendered, candidateHeightAt, colliders }),
};
const instances = root => {
  const out = [], matrix = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  root.traverse(mesh => {
    if (!mesh.isInstancedMesh) return;
    for (let i = 0; i < mesh.count; i++) { mesh.getMatrixAt(i, matrix); matrix.decompose(p, q, s); out.push({ mesh, x: p.x, y: p.y, z: p.z, sy: s.y }); }
  });
  return out;
};

test('the plain is open grass by habitat, with trees only on the water and in the foothills', () => {
  const trees = getTreeRegistry(colliders).trees;
  let total = 0;
  for (const [name, scene] of Object.entries(built)) {
    const m = scene.metrics;
    assert.equal(m.cells, REGION_CELLS[name].length, name);
    const hexes = m.cells;
    assert.ok(m.grass + m.terraceGrass + m.fanGrass > 150 * hexes, `${name}: ${m.grass + m.terraceGrass + m.fanGrass} tufts of grass in ${hexes} hexes`);
    assert.ok(m.forbs > 6 * hexes && m.scrub > 2 * hexes && m.stones > 4 * hexes, `${name}: ${JSON.stringify(m)}`);
    assert.ok(m.trees >= 20 && m.trees < 6 * hexes, `${name}: ${m.trees} trees on ${hexes} hexes of a Dfa plain`);
    assert.equal(m.trees, scene.trees.length); total += m.trees;
    for (const mesh of scene.root.children) {
      assert.ok(Number.isFinite(mesh.boundingSphere?.radius ?? mesh.geometry.boundingSphere?.radius), mesh.name);
      if (/prairie grass|terrace turf/.test(mesh.name)) assert.ok(mesh.boundingSphere.radius < 175, `${mesh.name}: ${mesh.boundingSphere.radius.toFixed(0)} m, too wide to cull`);
    }
  }
  // The water's margin is North Celder's: the Mithala border streams are the only water in either country.
  const north = built['North Celder'].metrics;
  assert.ok(north.terraceGrass > 300 && north.sedge > 60 && north.gravel > 60, JSON.stringify(north));
  assert.ok(north.willows + north.alders + north.poplars > 3, 'the streams have no fringe of willow and alder');
  assert.equal(trees.length, total);
  for (const tree of trees) {
    assert.ok(timberForSpecies(tree.species), tree.id); assert.equal(tree.harvestable, true);
    const owner = regionAt(tree.x, tree.z)?.name;
    assert.ok(owner === 'South Celder' || owner === 'North Celder', `${tree.id} stands in ${owner}`);
    assert.equal(celderWaterAt(tree.x, tree.z, groundWithRiver(tree.x, tree.z)), null, `${tree.id} stands in the water`);
    assert.ok(Math.abs(tree.y - rendered(tree.x, tree.z)) < 1e-9, `${tree.id} is not on the drawn ground`);
  }
  const lowland = ['black-willow', 'black-alder', 'white-poplar'], foothill = ['white-oak', 'silver-birch', 'common-juniper'];
  const fields = new Map(Object.keys(built).map(name => [name, finishBuild(readCelderGround(name, candidateHeightAt))]));
  const field = name => fields.get(name);
  for (const tree of trees) {
    const name = regionAt(tree.x, tree.z).name, habitat = field(name).habitat(tree.x, tree.z);
    // On the bank, or on the floodplain the plain lays a metre above the water for fifty metres out.
    if (lowland.includes(tree.species)) assert.ok(field(name).sample(tree.x, tree.z).water <= 16 || ['bank', 'floodplain'].includes(habitat), `${tree.id}: a stream tree out on the ${habitat}`);
    if (foothill.includes(tree.species)) assert.equal(habitat, 'foothill', `${tree.id}: a foothill tree out on the ${habitat}`);
  }
});

test('nothing is planted in the water, and everything stands on the drawn ground', () => {
  let checked = 0;
  for (const [name, scene] of Object.entries(built)) for (const item of instances(scene.root)) {
    const owner = regionAt(item.x, item.z)?.name;
    if (/trunks|crowns/.test(item.mesh.name)) continue;
    checked++;
    // A forb's or a shrub's side lobes stand a hand off its centre, which is planted a lobe's width inside.
    if (!/forbs|scrub/.test(item.mesh.name)) assert.equal(owner, name, `${item.mesh.name}: an instance at ${item.x.toFixed(1)},${item.z.toFixed(1)} is over the line in ${owner}`);
    assert.equal(celderWaterAt(item.x, item.z, groundWithRiver(item.x, item.z)), null, `${item.mesh.name}: planted in the water at ${item.x.toFixed(1)},${item.z.toFixed(1)}`);
    const surface = rendered(item.x, item.z);
    // Positions come back through a float32 matrix, so a centimetre is as near as the question can be asked.
    if (/grass|turf|sedge/.test(item.mesh.name)) assert.ok(Math.abs(item.y - surface + .03) < .01, `${item.mesh.name} floats or sinks by ${(item.y - surface + .03).toFixed(3)} m`);
    else assert.ok(item.y > surface - 1.5 && item.y < surface + 2.5, `${item.mesh.name} at ${item.x.toFixed(3)},${item.z.toFixed(3)} is off the ground by ${(item.y - surface).toFixed(2)} m`);
  }
  assert.ok(checked > 15000, `${checked} instances`);
  // Trunks run into the ground they are drawn on, and the blocker is the visible trunk.
  const matrix = new THREE.Matrix4(), base = new THREE.Vector3();
  for (const scene of Object.values(built)) {
    const trunk = scene.root.children.find(mesh => /typed living trunks/.test(mesh.name));
    scene.trees.forEach((tree, i) => {
      trunk.getMatrixAt(i, matrix); base.set(0, -.5, 0).applyMatrix4(matrix);
      assert.ok(base.y < rendered(tree.x, tree.z) - .05, `${tree.species} at ${tree.x.toFixed(1)},${tree.z.toFixed(1)}: a floating root`);
      assert.ok(Math.hypot(base.x - tree.x, base.z - tree.z) < 1e-3);
    });
  }
});

test('nothing that blocks a walker stands on a trail, at a landmark or in a ground animal\'s range', () => {
  const world = { bounds: WORLD_BOUNDS, heightAt: groundWithRiver, colliders };
  for (const c of colliders) {
    assert.ok(celderTrailDistance(c.x, c.z) > c.r + .6, `${c.id} stands on a trail`);
    for (const p of LANDMARKS) assert.ok(Math.hypot(c.x - p.x, c.z - p.z) > c.r + 4, `${c.id} stands at ${p.id}`);
    assert.ok(!southCelderWildlifeClear(c.x, c.z, c.r) && !northCelderWildlifeClear(c.x, c.z, c.r), `${c.id} stands in an animal's range`);
  }
  let samples = 0;
  for (const trail of TRAILS) for (let i = 1; i < trail.points.length; i++) {
    const a = trail.points[i - 1], b = trail.points[i], length = Math.hypot(b.x - a.x, b.z - a.z);
    for (let d = 0; d <= length; d += 1) {
      const x = a.x + (b.x - a.x) * d / length, z = a.z + (b.z - a.z) * d / length; samples++;
      if (celderWaterAt(x, z, groundWithRiver(x, z)) !== null) continue;   // a ford is the ground agent's to answer for
      assert.ok(canStand(x, z, world, .5), `${trail.id}: scenery blocks the trail at ${x.toFixed(1)},${z.toFixed(1)}`);
    }
  }
  for (const p of LANDMARKS) if (celderWaterAt(p.x, p.z, groundWithRiver(p.x, p.z)) === null) assert.ok(canStand(p.x, p.z, world, .5), p.id);
  assert.ok(samples >= 0);
});

// ---------------------------------------------------------------------------
// The animals on the world as the game builds it
// ---------------------------------------------------------------------------
let scoped = null;
const celderWorld = () => scoped ??= scopedWorld(new THREE.Scene(), [REGION_IDS['South Celder'], REGION_IDS['North Celder']]);

test('every Celder home is its own country\'s dry, standable, gentle ground, off the trails', async () => {
  const world = await celderWorld(), H = (x, z) => world.heightAt(x, z);
  for (const zone of ground) for (const [x, z] of zone.sites) {
    const at = `${zone.id} at ${x},${z}`;
    assert.equal(regionAt(x, z)?.name, zone.region, at);
    assert.ok(canStand(x, z, world, zone.radius), `${at}: cannot stand there`);
    assert.ok(H(x, z) >= world.waterAt(x, z) && celderWaterAt(x, z, H(x, z)) === null, `${at}: under water`);
    assert.ok(slope(H, x, z, Math.max(.4, zone.radius)) <= zone.maxSlope, `${at}: slope ${slope(H, x, z).toFixed(2)}`);
    assert.ok(celderTrailDistance(x, z) > 3, `${at}: on a trail`);
  }
  // And each band is put down where it was written, not shuffled to the nearest clear spot.
  const life = createWestLife(new THREE.Scene(), world, { zones: ZONES });
  try {
    // Before the first tick every animal stands at its home.
    const homes = new Map(life.state().creatures.map(animal => [animal.id, { x: animal.x, z: animal.z }]));
    for (const zone of ZONES) zone.sites.forEach(([x, z], i) => {
      const home = homes.get(`${zone.id}-${i + 1}`);
      assert.ok(home, `${zone.id}-${i + 1} has no home it can stand on`);
      assert.ok(Math.hypot(home.x - x, home.z - z) < .01, `${zone.id}-${i + 1} was moved off its written home`);
    });
  } finally { life.dispose(); }
});

/**
 * The chase from `tests/west-life.test.js`, to the line: a traveler forty metres off makes straight for the
 * band's first animal for `seconds`, and the report says how near they got and what the band did.
 */
const WALK = 4.2, RUN = 7.2, HZ = 60;
const turn = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
function chase(world, zone, pace, seconds, { bearing = Math.PI / 2, arm = 3 } = {}) {
  let held = 0;
  const life = createWestLife(new THREE.Scene(), world, { zones: [zone] });
  const band = () => life.state().creatures;
  const first = band()[0], homes = new Map(band().map(animal => [animal.id, { x: animal.x, z: animal.z }]));
  const player = { x: first.x + Math.sin(bearing) * 40, z: first.z + Math.cos(bearing) * 40 };
  const seen = new Set(), report = { life, band, homes, player, zone, target: first.id, closest: Infinity, reachedAt: null, held: 0, within: 0, actions: seen, offFooting: 0, facing: [], yielders: new Set() };
  const watch = t => {
    for (const animal of band()) {
      seen.add(animal.action); if (animal.action === 'yield') report.yielders.add(animal.id);
      const grounded = !animal.hidden && animal.lift < 1, standing = !animal.hidden && animal.action !== 'fly' && animal.action !== 'dive';
      if (standing && !((canStand(animal.x, animal.z, world, zone.radius) || (zone.float && canSwim(animal.x, animal.z, world, zone.radius)))
        && inBox(zone, animal.x, animal.z))) report.offFooting++;
      if (animal.id !== first.id) continue;
      const d = Math.hypot(animal.x - player.x, animal.z - player.z);
      if (grounded) { report.closest = Math.min(report.closest, d); if (d < 1.5 && report.reachedAt === null) report.reachedAt = t; }
      held = grounded && d < arm ? held + 1 : 0; report.held = Math.max(report.held, held / HZ);
      if (grounded && d < arm) report.within += 1 / HZ;
      if (animal.action === 'yield' || animal.action === 'withdraw') report.facing.push(turn(animal.yaw, Math.atan2(player.x - animal.x, player.z - animal.z)));
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

test('the west\'s first law, for Celder: nothing on this plain can be walked down', async () => {
  const world = await celderWorld();
  for (const zone of ground) {
    // `tests/west-life.test.js` gives cattle five metres and everything else three; the frostback is not in its
    // cattle set, so it is held to three, the harder of the two.
    const walked = chase(world, zone, WALK, 30, { arm: 3 });
    assert.ok(!walked.actions.has('shut'), `${zone.id}: only the tortoise shuts`);
    assert.ok(walked.closest >= 3, `${zone.id}: somebody walking got within ${walked.closest.toFixed(2)} m of ${walked.target}`);
    assert.equal(walked.offFooting, 0, `${zone.id}: an animal on the ground stood somewhere it cannot stand`);
    walked.life.dispose();
  }
});

test('the quick ones cannot be run down either: the hares on their legs, the herons into the air, the otters', async () => {
  const world = await celderWorld();
  for (const zone of ground.filter(zone => ['upland-hare', 'wading-bird', 'otter'].includes(zone.species))) {
    const run = chase(world, zone, RUN, 30);
    assert.equal(run.reachedAt, null, `${zone.id}: somebody running reached ${run.target} after ${run.reachedAt?.toFixed(1)} s`);
    assert.equal(run.offFooting, 0, `${zone.id}: an animal on the ground stood somewhere it cannot stand`);
    if (zone.species === 'wading-bird') assert.ok(run.actions.has('fly'), `${zone.id}: a heron that is run at takes to the air`);
    run.life.dispose();
  }
});

/**
 * **The cattle law, for the frostback.** `tests/west-life.test.js` writes it for longhorns and the Nethrani beast,
 * and the controller already answers a frostback the cattle way (`CATTLE`, src/west-regions-life.js): "too big to
 * bolt". So a herd here is held to it as cattle are: it never flees, it turns to face whoever comes and gives
 * ground, and somebody running can still get up to it.
 */
test('a frostback herd behaves like one: heads up, facing you, giving ground, never bolting', async () => {
  const world = await celderWorld();
  for (const zone of ground.filter(zone => zone.species === 'frostback')) {
    const walked = chase(world, zone, WALK, 30);
    assert.ok(walked.actions.has('yield') && !walked.actions.has('flee'), `${zone.id}: ${[...walked.actions].join(', ')}`);
    const settled = walked.facing.slice(HZ);
    assert.ok(settled.length > HZ && settled.every(off => off < .8), `${zone.id}: it turns its back (worst ${Math.max(0, ...settled).toFixed(2)} rad off)`);
    // A herd answers as a herd: the traveler walking into it is faced by every animal they come near, not only by
    // the one they made for. (The calves are a band of two or three inside a herd, held to the rest of the law.)
    if (zone.sites.length >= 5) assert.ok(walked.yielders.size >= 3, `${zone.id}: only ${walked.yielders.size} of the herd gave ground`);
    walked.life.dispose();
    const run = chase(world, zone, RUN, 25);
    assert.ok(run.reachedAt !== null, `${zone.id}: somebody running can still get up to a frostback`);
    assert.ok(!run.actions.has('flee'), `${zone.id}: a frostback bolted from somebody running`);
    run.life.dispose();
  }
});

test('a chased Celder band is home again in a few minutes, watched or not', async () => {
  const world = await celderWorld();
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
