import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './module-loader.js';
import { scopedWorld } from './scoped-world.js';

/**
 * Henborth's scenery and wildlife: the continental grass running up from Celder and the Mithala, the thin pasture and
 * the cold-margin scrub under the mountains, the damp hollows' bog and the few trees - and the animals on it, the
 * frostback's summer band above all, and the three new ones (the bog crane, the steppe marmot, the willow grouse) -
 * held to the ground as it is built and to the west's laws (`tests/west-life.test.js`), law by law, for these ranges
 * only and on a world scoped to Henborth and its built neighbours, so that it runs in minutes rather than the full
 * world's hours. The scenery is built here on the world's own ground function, as the game builds it.
 */
const THREE = await sourceModule('../vendor/three.module.js');
const { REGION_CELLS, REGION_IDS, regionAt, WORLD_BOUNDS } = await sourceModule('../src/world/terrain/region-world.js');
const { groundWithRiver } = await sourceModule('../src/world/terrain/world-terrain.js');
const { canStand, canSwim } = await sourceModule('../src/gameplay/movement/game-state.js');
const { timberForSpecies } = await sourceModule('../src/gameplay/skills/woodcutting/wood-species.js');
const { HENBORTH_WILDLIFE_ZONES: ZONES, henborthWildlifeClear } = await sourceModule('../src/content/regions/henborth/henborth-wildlife.js');
const WORLD = await sourceModule('../src/content/regions/henborth/henborth-world.js');
const { WEST_LIFE_ZONES, createWestLife, LIFE_REACH } = await sourceModule('../src/content/regions/western-regions/west-regions-life.js');
const SCENERY = await sourceModule('../src/content/regions/henborth/henborth-scenery.js');
const { createHenborthScenery, createHenborthScenerySteps, readHenborthGround, henborthTrailDistance, henborthWaterAt, henborthReserved,
  HENBORTH_KEPT_POINTS, HENBORTH_HABITAT, HENBORTH } = SCENERY;
const { finishBuild } = await sourceModule('../src/world/loading/build-steps.js');
const { getTreeRegistry } = await sourceModule('../src/world/scenery/tree-registry.js');

const HEXES = REGION_CELLS[HENBORTH].length;
const ground = ZONES.filter(zone => !zone.air && !zone.sea);
const inBox = (zone, x, z, margin = 0) => x >= zone.minX - margin && x <= zone.maxX + margin && z >= zone.minZ - margin && z <= zone.maxZ + margin;
const slope = (heightAt, x, z, r = 1) => Math.hypot((heightAt(x + r, z) - heightAt(x - r, z)) / (2 * r), (heightAt(x, z + r) - heightAt(x, z - r)) / (2 * r));
const of = species => ZONES.filter(zone => zone.species === species);

// ---------------------------------------------------------------------------
// The tables
// ---------------------------------------------------------------------------
test('the Henborth ranges are wired, wild, sourced and sized to the reach they are run from', () => {
  for (const zone of ZONES) assert.ok(WEST_LIFE_ZONES.includes(zone), `${zone.id} is not in the west's table`);
  assert.equal(new Set(WEST_LIFE_ZONES.map(zone => zone.id)).size, WEST_LIFE_ZONES.length, 'a range id is used twice');
  for (const zone of ZONES) assert.equal(zone.region, HENBORTH, zone.id);
  // The lore's animal: the frostback's summer band, cows with the year's calves at foot inside their range, the bulls
  // apart, and the black soar-bird over the cows.
  const cows = of('frostback').filter(zone => zone.scale >= 1 && zone.sites.length >= 5);
  assert.ok(cows.length >= 1, 'the frostback\'s summer band is here, as a herd and not as single beasts');
  const calves = of('frostback').filter(zone => zone.scale < 1);
  assert.ok(calves.length && calves.every(calf => cows.some(cow => calf.minX >= cow.minX && calf.maxX <= cow.maxX && calf.minZ >= cow.minZ && calf.maxZ <= cow.maxZ)),
    'the calves are at foot inside a band of cows');
  assert.ok(of('turkey-vulture').some(bird => bird.air && cows.some(cow => inBox(cow, ...bird.sites[0]))), 'the black soar-bird is over the herd');
  // What the brief asks for besides: open-plain birds and small mammals, and the new animals each where its ground is.
  assert.ok(of('upland-hare').length >= 2, 'the overview\'s upland hares');
  assert.ok(ZONES.some(zone => zone.air && ['harrier', 'plateau-hawk', 'oremindi-mountain-eagle'].includes(zone.species)), 'a hunter in the air');
  for (const species of ['crane', 'marmot', 'grouse']) assert.ok(of(species).length, `the ${species} is here`);
  assert.ok(ZONES.reduce((n, zone) => n + zone.sites.length, 0) >= 30, 'a country\'s population, not a token');
  // Nothing anybody owns: no stock of any kind.
  const DOMESTIC = new Set(['longhorn', 'nethrani-cattle', 'hill-sheep', 'horse', 'goat', 'pig', 'dog']);
  for (const zone of ZONES) assert.ok(!DOMESTIC.has(zone.species), `${zone.id} is stock, and stock belongs to somebody`);
  for (const zone of ZONES) assert.ok(zone.note?.length > 40, `${zone.id} does not say where it comes from`);
  // The lore names the frostback here and the soar-bird over its herds; anything else is an extension and says so.
  const NAMED = new Set(['frostback', 'turkey-vulture']);
  for (const zone of ZONES) if (!NAMED.has(zone.species)) assert.match(zone.note, /extension/i, `${zone.id}: a ${zone.species} here is an extension, and says so`);
  for (const zone of ground) {
    const half = Math.hypot(zone.maxX - zone.minX, zone.maxZ - zone.minZ) / 2;
    assert.ok(half < LIFE_REACH, `${zone.id}: half its diagonal is ${half.toFixed(0)} m, past the ${LIFE_REACH} m it is run from`);
    for (const [x, z] of zone.sites) assert.ok(inBox(zone, x, z), `${zone.id}: a home lies outside its own range`);
    for (let i = 0; i < zone.sites.length; i++) for (let j = 0; j < i; j++)
      assert.ok(Math.hypot(zone.sites[i][0] - zone.sites[j][0], zone.sites[i][1] - zone.sites[j][1]) > zone.radius * 2 * zone.scale, `${zone.id}: two homes overlap`);
  }
  // A marmot's holes are in its range and among its homes: every home has a hole within a few strides, and a hole off by
  // itself is somewhere for nobody.
  for (const zone of of('marmot')) {
    assert.ok(zone.burrows?.length >= zone.sites.length, `${zone.id}: fewer holes than marmots`);
    for (const hole of zone.burrows) {
      assert.ok(inBox(zone, hole.x, hole.z, -2), `${zone.id}: a hole at ${hole.x},${hole.z} is at the edge of its range or outside it`);
      assert.ok(zone.sites.some(([x, z]) => Math.hypot(x - hole.x, z - hole.z) < 6), `${zone.id}: a hole at ${hole.x},${hole.z} is far from every home`);
    }
    for (const [x, z] of zone.sites) assert.ok(zone.burrows.some(hole => Math.hypot(x - hole.x, z - hole.z) < 4), `${zone.id}: the home at ${x},${z} has no hole near it`);
  }
});

/**
 * **Every band its own layout.** The Celder review found two herds put down in one pattern - the same homes, moved -
 * and a flock that reads as a stamp is the first thing a traveler's eye catches. So the shape of every band here (its
 * homes about their own middle) is held against every other band of the same kind in the west, as drawn and mirrored
 * and turned a quarter: no two may match home for home within a metre.
 */
test('no two bands are put down in one pattern', () => {
  const shape = sites => {
    const cx = sites.reduce((n, s) => n + s[0], 0) / sites.length, cz = sites.reduce((n, s) => n + s[1], 0) / sites.length;
    return sites.map(([x, z]) => [x - cx, z - cz]);
  };
  const same = (a, b) => {
    if (a.length !== b.length) return false;
    const turns = [b, b.map(([x, z]) => [z, -x])];
    const variants = turns.flatMap(t => [[1, 1], [-1, 1], [1, -1], [-1, -1]].map(([fx, fz]) => t.map(([x, z]) => [x * fx, z * fz])));
    return variants.some(v => a.every(([x, z]) => v.some(([u, w]) => Math.hypot(u - x, w - z) < 1)));
  };
  let compared = 0;
  for (const zone of ZONES) {
    if (zone.sites.length < 2) continue;
    const spread = shape(zone.sites).reduce((n, [x, z]) => Math.max(n, Math.hypot(x, z)), 0);
    assert.ok(spread > 1.5, `${zone.id}: every animal shares one home`);
    for (const other of WEST_LIFE_ZONES) {
      if (other === zone || other.species !== zone.species || other.sites.length !== zone.sites.length) continue;
      compared++;
      assert.ok(!same(shape(zone.sites), shape(other.sites)), `${zone.id} is laid out in the same pattern as ${other.id}`);
    }
  }
  assert.ok(compared > 0, 'nothing was compared');
});

// ---------------------------------------------------------------------------
// The scenery, built on the ground as it is
// ---------------------------------------------------------------------------
// A drawn surface twelve centimetres off the logical one catches anything rooted to the wrong one.
const rendered = (x, z) => groundWithRiver(x, z) + .12;
const colliders = [], parent = new THREE.Group();
const built = createHenborthScenery({ parent, heightAt: groundWithRiver, renderedGroundHeight: rendered, colliders });
const field = finishBuild(readHenborthGround(groundWithRiver));
const instances = root => {
  const out = [], matrix = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  root.traverse(mesh => {
    if (!mesh.isInstancedMesh) return;
    for (let i = 0; i < mesh.count; i++) { mesh.getMatrixAt(i, matrix); matrix.decompose(p, q, s); out.push({ mesh, x: p.x, y: p.y, z: p.z, sy: s.y }); }
  });
  return out;
};
const trees = () => getTreeRegistry(colliders).trees.filter(tree => tree.region === HENBORTH);

test('Henborth is open grassland going over to steppe and scrub northward, with its bog in the hollows and its few trees by the water and in shelter', t => {
  const m = built.metrics;
  t.diagnostic(`habitats (10 m blocks): ${JSON.stringify(m.habitats)}`);
  t.diagnostic(`${m.prairie} prairie, ${m.steppe} steppe, ${m.meadow} meadow, ${m.sedge} sedge; ${m.forbs} flowers and herbs; ${m.shrubs} shrubs; ${m.sphagnum} sphagnum, ${m.cranberry} cranberry, ${m.lichenMats} lichen mats, ${m.lichens} dye lichens; ${m.stones} stones (${m.boulders} boulders); ${m.trees} trees`);
  const grass = m.prairie + m.steppe + m.meadow + m.sedge + m.rush;
  assert.ok(grass > 300 * HEXES, `${grass} tufts of grass on ${HEXES} hexes`);
  assert.ok(m.prairie > 20 * HEXES && m.steppe > 20 * HEXES, `the plain's prairie and the rise's steppe: ${m.prairie}, ${m.steppe}`);
  assert.ok(m.forbs > 8 * HEXES && m.yarrow > 0 && m.harebell > 0 && m.pasque > 0 && m.roseroot > 0, `the flowers: ${m.forbs}`);
  assert.ok(m.shrubs > 10 * HEXES && m.dwarfBirch > 0 && m.willowScrub > 0 && m.crowberry > 0, 'the cold margin\'s scrub');
  assert.ok(m.lichenMats > 0 && m.lichens > 0, 'the lore\'s lichens, on the thin ground and on its stones');
  assert.ok(m.stones > 3 * HEXES, `${m.stones} stones`);
  // **The damp hollows and the plants of the lore's herb and cranberry grounds**, wherever the ground has hollows.
  const wet = (m.habitats.bog ?? 0) + (m.habitats.damp ?? 0) + (m.habitats.margin ?? 0);
  assert.ok(wet > 0, 'not one damp hollow on the plain');
  assert.ok(m.cranberry > 0 && m.sphagnum > 0 && m.cotton > 0, `the bog: ${m.sphagnum} sphagnum, ${m.cranberry} cranberry, ${m.cotton} cotton grass`);
  assert.ok(m.angelica + m.meadowsweet + m.cinquefoil + m.bogbean > 0, 'the herb ground\'s plants');
  // **Sparse trees, by water and in shelter only.**
  assert.ok(m.trees >= 20 && m.trees < 8 * HEXES, `${m.trees} trees on ${HEXES} hexes`);
  assert.equal(m.trees, built.trees.length);
  for (const mesh of built.root.children) {
    assert.ok(Number.isFinite(mesh.boundingSphere?.radius ?? mesh.geometry.boundingSphere?.radius), mesh.name);
    if (/prairie grass|steppe sward|meadow grass|sedge|rush/.test(mesh.name) && mesh.isInstancedMesh)
      assert.ok(mesh.boundingSphere.radius < 175, `${mesh.name}: ${mesh.boundingSphere.radius.toFixed(0)} m, too wide to cull`);
  }
  const all = trees();
  assert.equal(all.length, m.trees);
  const words = new Map(), lone = [];
  for (const tree of all) {
    assert.ok(timberForSpecies(tree.species), tree.id); assert.equal(tree.harvestable, true);
    assert.equal(regionAt(tree.x, tree.z)?.name, HENBORTH, `${tree.id} stands in ${regionAt(tree.x, tree.z)?.name}`);
    assert.equal(henborthWaterAt(tree.x, tree.z, groundWithRiver(tree.x, tree.z)), null, `${tree.id} stands in the water`);
    assert.ok(Math.abs(tree.y - rendered(tree.x, tree.z)) < 1e-9, `${tree.id} is not on the drawn ground`);
    const here = field.sample(tree.x, tree.z), word = field.habitat(tree.x, tree.z, here);
    words.set(word, (words.get(word) ?? 0) + 1);
    if (['black-willow', 'black-alder'].includes(tree.species)) assert.ok(['margin', 'damp', 'bog', 'flush', 'shelter'].includes(word), `${tree.id}: a ${tree.species} away from the wet and the shelter, on the ${word}`);
    if (tree.species === 'silver-fir') assert.ok(here.cold > HENBORTH_HABITAT.firCold && ['shelter', 'scrub'].includes(word), `${tree.id}: a fir out on the ${word}, ${here.cold.toFixed(2)} into the cold`);
    if (tree.species === 'common-juniper') assert.ok(['rock', 'scrub', 'upland', 'knoll'].includes(word), `${tree.id}: a juniper in the ${word}`);
    if (['plain', 'knoll', 'upland'].includes(word) && tree.species !== 'common-juniper') lone.push(tree);
  }
  // The woods are the hollows' and the shelter's: everything but the rough ground's junipers stands by the wet or in a fold.
  const broadleaf = all.filter(tree => tree.species !== 'common-juniper');
  const sheltered = broadleaf.filter(tree => ['margin', 'damp', 'bog', 'flush', 'shelter', 'scrub', 'rock'].includes(field.habitat(tree.x, tree.z))).length;
  assert.ok(sheltered >= .8 * broadleaf.length, `only ${sheltered} of ${broadleaf.length} broadleaved trees are by the wet or in shelter: ${JSON.stringify([...words])}`);
  // And a tree out on the open grass is a lone tree: no two within thirty metres.
  for (let i = 0; i < lone.length; i++) for (let j = 0; j < i; j++)
    assert.ok(Math.hypot(lone[i].x - lone[j].x, lone[i].z - lone[j].z) >= 29.9, `${lone[i].id} and ${lone[j].id}: two lone trees together on the open grass`);
});

/**
 * **The gradient is northward and up.** "What was thin rough pasture becomes scrub, and what was scrub becomes
 * something colder and more exposed": the prairie grass is the low side's and the steppe sward the cold side's; the
 * scrub's dwarf birch and willow, and its stone, are colder ground than the plain's rose.
 */
test('the plain thins northward: prairie on the low side, steppe, stone and scrub toward the mountains', () => {
  const coldOf = (pattern, filter = () => true) => {
    const items = instances(built.root).filter(item => pattern.test(item.mesh.name) && filter(item));
    return { n: items.length, mean: items.reduce((n, item) => n + field.sample(item.x, item.z).cold, 0) / Math.max(1, items.length) };
  };
  const prairie = coldOf(/prairie grass/), steppe = coldOf(/steppe sward/);
  assert.ok(prairie.n && steppe.n && prairie.mean + .15 < steppe.mean, `prairie ${prairie.mean.toFixed(2)} into the cold, steppe ${steppe.mean.toFixed(2)}`);
  const stones = coldOf(/Henborth stone/), grass = coldOf(/prairie grass|steppe sward/);
  assert.ok(stones.mean > grass.mean, `the stone lies on colder ground than the grass does: ${stones.mean.toFixed(2)} against ${grass.mean.toFixed(2)}`);
  // And the census agrees: the cold margin's words are the north's.
  const words = Object.entries(built.metrics.habitats);
  assert.ok(words.some(([w, n]) => w === 'scrub' && n > 0) && words.some(([w, n]) => w === 'plain' && n > 0), JSON.stringify(built.metrics.habitats));
});

test('nothing is planted in the water, nothing over the line, and everything stands on the drawn ground', () => {
  let checked = 0;
  for (const item of instances(built.root)) {
    if (/trunks|crowns/.test(item.mesh.name)) continue;
    checked++;
    const owner = regionAt(item.x, item.z)?.name;
    // A lobed thing's side lobes stand a hand off its centre, which is planted a lobe's width inside; a lichen crust a
    // hand off its stone; a burrow's spoil a little off its hole.
    const lobed = /flowers|dwarf birch|sphagnum|lichen|burrows/.test(item.mesh.name);
    if (!lobed) assert.equal(owner, HENBORTH, `${item.mesh.name}: an instance at ${item.x.toFixed(1)},${item.z.toFixed(1)} is over the line in ${owner}`);
    if (!lobed) assert.equal(henborthWaterAt(item.x, item.z, groundWithRiver(item.x, item.z)), null, `${item.mesh.name}: planted in the water at ${item.x.toFixed(1)},${item.z.toFixed(1)}`);
    const surface = rendered(item.x, item.z);
    // Positions come back through a float32 matrix, so a centimetre is as near as the question can be asked.
    if (/prairie grass|steppe sward|meadow grass|sedge|rush/.test(item.mesh.name)) assert.ok(Math.abs(item.y - surface + .03) < .01, `${item.mesh.name} floats or sinks by ${(item.y - surface + .03).toFixed(3)} m`);
    else assert.ok(item.y > surface - 1.5 && item.y < surface + 2.5, `${item.mesh.name} is off the ground by ${(item.y - surface).toFixed(2)} m`);
  }
  assert.ok(checked > 20000, `${checked} instances`);
  // Trunks run into the ground they are drawn on, and however far the wind has laid one over, it comes out of the ground
  // at the tree's own point: where its collider stands and where it is felled from.
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
    if (lean > .05) leaning++;
  });
  assert.ok(leaning > 0, 'not one tree on a plain the north wind is channelled through is bent by it');
});

test('the ground\'s own water, if it lays any, is drawn and laid as the world\'s water', () => {
  const offered = pattern => Object.entries(WORLD).filter(([name, value]) => pattern.test(name)).map(([, value]) => value);
  const markerFns = offered(/WaterColliders$/).filter(fn => typeof fn === 'function');
  const pools = offered(/POOLS$/).flat().filter(p => Number.isFinite(p?.x));
  const laid = colliders.filter(c => /water/.test(c.kind ?? ''));
  if (markerFns.length) assert.equal(laid.length, markerFns.flatMap(fn => fn()).length, 'the ground\'s water markers are laid, once each');
  else assert.equal(laid.length, pools.length, 'a marker for each of the ground\'s pools');
  assert.equal(built.metrics.waterMarkers, laid.length);
});

test('nothing that blocks a walker stands on a trail, at a landmark, on a kept place or in a ground animal\'s range', () => {
  const world = { bounds: WORLD_BOUNDS, heightAt: groundWithRiver, colliders };
  for (const c of colliders.filter(c => !/water/.test(c.kind ?? ''))) {
    assert.ok(henborthTrailDistance(c.x, c.z) > c.r + .6, `${c.id} stands on a trail`);
    for (const p of HENBORTH_KEPT_POINTS) assert.ok(Math.hypot(c.x - p.x, c.z - p.z) > c.r + 4, `${c.id} stands at ${p.id}`);
    assert.ok(!henborthReserved(c.x, c.z, c.r), `${c.id} stands on a place kept for something to be built`);
    assert.ok(!henborthWildlifeClear(c.x, c.z, c.r), `${c.id} stands in an animal's range`);
  }
  for (const trail of WORLD.HENBORTH_TRAILS ?? []) for (let i = 1; i < trail.points.length; i++) {
    const a = trail.points[i - 1], b = trail.points[i], length = Math.hypot(b.x - a.x, b.z - a.z);
    for (let d = 0; d <= length; d += 1) {
      const x = a.x + (b.x - a.x) * d / length, z = a.z + (b.z - a.z) * d / length;
      if (henborthWaterAt(x, z, groundWithRiver(x, z)) !== null) continue;   // a ford is the ground agent's to answer for
      assert.ok(canStand(x, z, world, .5), `${trail.id}: scenery blocks the trail at ${x.toFixed(1)},${z.toFixed(1)}`);
    }
  }
  for (const p of HENBORTH_KEPT_POINTS) assert.ok(canStand(p.x, p.z, world, .5), `${p.id}: blocked`);
});

/**
 * One seeded stream, built the same every time; and in short steps. The renderer runs as many steps a frame as its
 * budget allows, so what matters is that no one step takes long once the code is warm (the first build of anything
 * pays its compilation once).
 */
test('the scenery is one seeded stream: it pauses throughout, builds the same plain every time, in short steps', t => {
  // Warm means the engine has finished with the code: the build at the top of this file compiles it, and one more
  // unmeasured build lets the optimiser settle what the first taught it. Measured on a busy machine, the second build
  // still carried the optimiser's pauses (a 99.9th percentile of 11.5 ms where the third ran to 4.1).
  createHenborthScenery({ parent: new THREE.Group(), heightAt: groundWithRiver, renderedGroundHeight: rendered, colliders: [] });
  const again = [], iterator = createHenborthScenerySteps({ parent: new THREE.Group(), heightAt: groundWithRiver, renderedGroundHeight: rendered, colliders: again });
  let step, pauses = 0;
  const times = [];
  do { const t0 = performance.now(); step = iterator.next(); times.push(performance.now() - t0); if (!step.done) pauses++; } while (!step.done);
  assert.ok(pauses > 500, `${pauses} scheduling points`);
  assert.deepEqual(step.value.metrics, built.metrics);
  assert.deepEqual(again.filter(c => !/water/.test(c.kind ?? '')).map(c => c.id), colliders.filter(c => !/water/.test(c.kind ?? '')).map(c => c.id));
  times.sort((a, b) => b - a);
  const p999 = times[Math.floor(times.length / 1000)];
  t.diagnostic(`${times.length} steps, slowest ${times[0].toFixed(1)} ms, 99.9th percentile ${p999.toFixed(1)} ms`);
  assert.ok(p999 < 8, `a warm build's steps run to ${p999.toFixed(1)} ms`);
});

// ---------------------------------------------------------------------------
// The animals on the world as the game builds it
// ---------------------------------------------------------------------------
let scoped = null;
const henborthWorld = () => scoped ??= scopedWorld(new THREE.Scene(), [REGION_IDS[HENBORTH], REGION_IDS['North Celder'], REGION_IDS['West Mithala'], REGION_IDS['North Mithala']]);

test('every Henborth home is its own dry, standable, gentle ground, off the trails and the kept places, and each hole is on it too', async () => {
  const world = await henborthWorld(), H = (x, z) => world.heightAt(x, z);
  for (const zone of ground) for (const [x, z] of zone.sites) {
    const at = `${zone.id} at ${x},${z}`;
    assert.equal(regionAt(x, z)?.name, zone.region, at);
    assert.ok(canStand(x, z, world, zone.radius), `${at}: cannot stand there`);
    assert.ok(H(x, z) >= world.waterAt(x, z), `${at}: under water`);
    assert.ok(slope(H, x, z, Math.max(.4, zone.radius)) <= zone.maxSlope, `${at}: slope ${slope(H, x, z).toFixed(2)}`);
    assert.ok(henborthTrailDistance(x, z) > 3, `${at}: on a trail`);
    assert.ok(!henborthReserved(x, z, 2), `${at}: on a place kept for something to be built`);
  }
  for (const zone of of('marmot')) for (const hole of zone.burrows) {
    assert.equal(regionAt(hole.x, hole.z)?.name, HENBORTH, `${zone.id}: a hole over the line`);
    assert.ok(canStand(hole.x, hole.z, world, .3) && H(hole.x, hole.z) >= world.waterAt(hole.x, hole.z), `${zone.id}: a hole at ${hole.x},${hole.z} is not on dry ground`);
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
 * The chase from `tests/west-life.test.js`, to the line: a traveler forty metres off makes straight for the band's
 * first animal for `seconds`, and the report says how near they got and what the band did.
 */
const WALK = 4.2, RUN = 7.2, HZ = 60;
const turn = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
function chase(world, zone, pace, seconds, { bearing = Math.PI / 2, arm = 3 } = {}) {
  let held = 0;
  const life = createWestLife(new THREE.Scene(), world, { zones: [zone] });
  const band = () => life.state().creatures;
  const first = band()[0], homes = new Map(band().map(animal => [animal.id, { x: animal.x, z: animal.z }]));
  const player = { x: first.x + Math.sin(bearing) * 40, z: first.z + Math.cos(bearing) * 40 };
  const seen = new Set(), report = { life, band, homes, player, zone, target: first.id, closest: Infinity, reachedAt: null, held: 0, actions: seen,
    offFooting: 0, facing: [], yielders: new Set(), sat: 0 };
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
      if (animal.action === 'yield' || animal.action === 'withdraw') report.facing.push(turn(animal.yaw, Math.atan2(player.x - animal.x, player.z - animal.z)));
      if (animal.watching > .9 && animal.speed < .05 && !animal.hidden) report.sat += 1 / HZ;
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

test('the west\'s first law, for Henborth: nothing on this plain can be walked down', async () => {
  const world = await henborthWorld();
  // From both sides, which is what "a band has room behind it" asks: the west's own law comes from the east only. The
  // frostback is held to three metres, not the cattle's five, which is the harder of the two.
  for (const zone of ground) for (const bearing of [Math.PI / 2, -Math.PI / 2]) {
    const walked = chase(world, zone, WALK, 30, { arm: 3, bearing });
    assert.ok(!walked.actions.has('shut'), `${zone.id}: only the tortoise shuts`);
    assert.ok(walked.closest >= 3, `${zone.id} (from ${bearing.toFixed(2)}): somebody walking got within ${walked.closest.toFixed(2)} m of ${walked.target}`);
    assert.equal(walked.offFooting, 0, `${zone.id}: an animal on the ground stood somewhere it cannot stand`);
    walked.life.dispose();
  }
});

test('the quick ones cannot be run down either: the hares and the fox on their legs, the cranes and the grouse into the air, the marmots down their holes', async () => {
  const world = await henborthWorld();
  const QUICK = ['upland-hare', 'road-fox', 'crane', 'grouse', 'marmot'];
  for (const zone of ground.filter(zone => QUICK.includes(zone.species))) {
    const run = chase(world, zone, RUN, 30);
    assert.equal(run.reachedAt, null, `${zone.id}: somebody running reached ${run.target} after ${run.reachedAt?.toFixed(1)} s`);
    assert.equal(run.offFooting, 0, `${zone.id}: an animal on the ground stood somewhere it cannot stand`);
    if (['crane', 'grouse'].includes(zone.species)) assert.ok(run.actions.has('fly'), `${zone.id}: a bird that is run at takes to the air`);
    if (zone.species === 'marmot') assert.ok(run.actions.has('dive'), `${zone.id}: it did not go down a hole`);
    run.life.dispose();
  }
});

/**
 * **The cattle law, for the frostback**, as Celder's herds are held to it: it never flees, it turns to face whoever
 * comes and gives ground, the herd answers as a herd, and somebody running can still get up to it.
 */
test('the frostback band behaves like one: heads up, facing you, giving ground, never bolting', async () => {
  const world = await henborthWorld();
  for (const zone of ground.filter(zone => zone.species === 'frostback')) {
    const walked = chase(world, zone, WALK, 30);
    assert.ok(walked.actions.has('yield') && !walked.actions.has('flee'), `${zone.id}: ${[...walked.actions].join(', ')}`);
    const settled = walked.facing.slice(HZ);
    assert.ok(settled.length > HZ && settled.every(off => off < .8), `${zone.id}: it turns its back (worst ${Math.max(0, ...settled).toFixed(2)} rad off)`);
    if (zone.sites.length >= 5) assert.ok(walked.yielders.size >= 3, `${zone.id}: only ${walked.yielders.size} of the herd gave ground`);
    walked.life.dispose();
    const run = chase(world, zone, RUN, 25);
    assert.ok(run.reachedAt !== null, `${zone.id}: somebody running can still get up to a frostback`);
    assert.ok(!run.actions.has('flee'), `${zone.id}: a frostback bolted from somebody running`);
    run.life.dispose();
  }
});

test('a chased Henborth band is home again in a few minutes, watched or not', async () => {
  const world = await henborthWorld();
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
    assert.ok(left.band().every(animal => !animal.hidden && animal.action !== 'fly'), `${zone.id}: somebody is still in the air or down a hole`);
    left.life.dispose();
  }
});

/**
 * **The marmot's own law**, after the otter's (`tests/west-life.test.js`): walked at, the colony's sentinel sits up and
 * watches first; at a dozen metres it runs for a hole and goes down it where it can be seen going - sinking, never
 * rising - is under for a while, and comes up again at another hole well away from whoever sent it down, on ground it
 * can stand on.
 */
test('a marmot sits up and watches, goes down its hole where you can see it go, and comes up at another', async () => {
  const world = await henborthWorld();
  for (const zone of of('marmot')) {
    const walked = chase(world, zone, WALK, 6);
    assert.ok(walked.sat > .5, `${zone.id}: it sat up and watched for only ${walked.sat.toFixed(2)} s as somebody walked up`);
    walked.life.dispose();
    const life = createWestLife(new THREE.Scene(), world, { zones: [zone] });
    try {
      const marmot = () => life.snapshot().creatures.find(animal => animal.id === `${zone.id}-1`);
      const home = marmot(), player = { x: home.x + 30, z: home.z }, seen = [];
      let sent = false;
      for (let i = 0; i < 16 * HZ; i++) {
        const at = marmot(), dx = at.x - player.x, dz = at.z - player.z, d = Math.hypot(dx, dz);
        sent ||= at.action === 'dive';
        if (!sent && d > 3) { const step = Math.min(d - 3, WALK / HZ); player.x += dx / d * step; player.z += dz / d * step; }
        life.update(1 / HZ, player, true);
        seen.push(marmot());
      }
      const slip = seen.filter(now => now.action === 'dive' && !now.hidden);
      assert.ok(slip.length / HZ >= .3 && slip.length / HZ <= .8, `${zone.id}: it was seen going down for ${(slip.length / HZ).toFixed(2)} s`);
      for (let i = 1; i < slip.length; i++) assert.ok(slip[i].y <= slip[i - 1].y + 1e-6, `${zone.id}: it only ever goes down`);
      assert.ok(slip[0].y - slip.at(-1).y > .3, `${zone.id}: it sank ${(slip[0].y - slip.at(-1).y).toFixed(2)} m before it was gone`);
      const hole = zone.burrows.reduce((best, b) => Math.hypot(b.x - slip.at(-1).x, b.z - slip.at(-1).z) < Math.hypot(best.x - slip.at(-1).x, best.z - slip.at(-1).z) ? b : best);
      assert.ok(Math.hypot(hole.x - slip.at(-1).x, hole.z - slip.at(-1).z) < 2, `${zone.id}: it went down ${Math.hypot(hole.x - slip.at(-1).x, hole.z - slip.at(-1).z).toFixed(1)} m from the nearest hole`);
      assert.ok(seen.filter(now => now.hidden).length / HZ > 3, `${zone.id}: and then it is under for a while`);
      const upAgain = seen.at(-1);
      assert.ok(!upAgain.hidden && upAgain.action !== 'dive', `${zone.id}: sixteen seconds on it is ${upAgain.action}, ${upAgain.hidden ? 'still under' : 'up'}`);
      assert.ok(Math.hypot(upAgain.x - player.x, upAgain.z - player.z) >= 14, `${zone.id}: and it came up well away from whoever sent it down`);
      assert.ok(canStand(upAgain.x, upAgain.z, world, zone.radius), `${zone.id}: on ground it can stand on`);
    } finally { life.dispose(); }
  }
});

/** The birds that only fly circle over Henborth, and keep clear of the ground under them. */
test('the birds of the air fly over Henborth, clear of the ground', async () => {
  const world = await henborthWorld();
  const life = createWestLife(new THREE.Scene(), world, { zones: ZONES.filter(zone => zone.air) });
  try {
    for (const zone of ZONES.filter(zone => zone.air)) {
      const watcher = { x: (zone.minX + zone.maxX) / 2, z: (zone.minZ + zone.maxZ) / 2 };
      let lowest = Infinity;
      for (let step = 0; step < 60 * 20; step++) {
        life.update(1 / 20, watcher, true);
        for (const bird of life.snapshot().creatures.filter(animal => animal.id.startsWith(`${zone.id}-`))) {
          lowest = Math.min(lowest, bird.y - world.heightAt(bird.x, bird.z));
          assert.equal(regionAt(bird.x, bird.z)?.name, HENBORTH, `${zone.id}: a bird is over ${regionAt(bird.x, bird.z)?.name} at ${bird.x.toFixed(0)},${bird.z.toFixed(0)}`);
        }
      }
      assert.ok(lowest > 4, `${zone.id}: a bird came within ${lowest.toFixed(1)} m of the ground`);
    }
  } finally { life.dispose(); }
});
