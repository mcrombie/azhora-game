import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { REGION_CELLS, REGION_IDS, hexOwnerAt, regionAt } from '../src/world/terrain/region-world.js';
import { canStand, moveCharacter } from '../src/gameplay/movement/game-state.js';
import { canWalkSlope, isClimbTerrain } from '../src/gameplay/movement/climbing.js';
import {
  UNDERGROWTH, UNDERGROWTH_REGIONS, canPushThrough, isThicketTerrain, onWayThrough, thicketAt, undergrowthOpen,
} from '../src/world/scenery/undergrowth.js';
import {
  SOUTHWEST_BOXES, TROGO_CREST, TROGO_GULLIES, TROGO_PATHS, TROGO_CLEARINGS, TROGO_WAY,
  trogoThicket, trogoWay, inTrogoClearing,
} from '../src/content/regions/southwest/southwest-world.js';
import { TROGORETH, courseDistance } from '../src/content/regions/western-regions/west-regions.js';
import { regions } from '../src/world/terrain/region-world.js';
import { DEFAULT_SKY, regionSky } from '../src/world/environment/region-sky.js';

/**
 * **What a deep forest is in Azhora**, and this file is half of the answer.
 *
 * Asked directly on 30 September 2026 what a deep forest should be, the user chose: *a country you
 * cannot see far in **and** cannot go straight through*. The first half is the haze - Trogo's
 * `palette.hazeDensity` is `.0144`, two and three quarter times the game's own default, and the last
 * test below holds it to the sight distances it buys. The second half is `src/world/scenery/undergrowth.js`, and
 * everything above that test is about it.
 *
 * **The hazard, which is the reason this file is long.** A movement gate can strand the autopilot, a
 * quest route or a traveler; the climbing rule is region-gated for exactly that reason, because the rest
 * of Azhora has river banks and seams steeper than its own limit sitting on the autoplays' roads. So
 * this file proves four things and not three:
 *
 *  1. **outside its own countries the rule has no opinion at all** - `canPushThrough` is true for every
 *     step anywhere else in Azhora, including inside the four climbing regions;
 *  2. **the country can be crossed along the ways**, from the desert margin to both shores, and the
 *     network is one piece rather than five stubs that do not meet;
 *  3. **it cannot be crossed without them**, which is what makes the rule a rule and not decoration -
 *     and it is proved the way `tests/west-lotharn-peaks.test.js` proves the ramps are the only way up,
 *     by flooding the same lattice twice;
 *  4. **nobody can be sealed in.** The rule refuses a step off a way *into* the thicket and never
 *     refuses a step out of it, so from any cell of the country the open ground is reachable - proved
 *     here by a reverse flood fill over every cell rather than argued from the source. And it adds no
 *     collider at all, so `canStand` cannot see it and `tests/nobody-sealed-in.test.js` is untouched by
 *     this country.
 */
const { createWorld } = await sourceModule('../src/world.js');
const world = createWorld(new THREE.Scene());
/** What `src/main.js` hands the two movement rules: the traveler's world, with `regionAt` on it. */
const walker = { bounds: world.bounds, colliders: world.colliders, heightAt: world.heightAt,
  waterAt: world.waterAt, regionAt: world.regionAt };

test('the rule is the climbing rule’s shape: one region set, one field, and no opinion anywhere else', () => {
  // The threshold and the region set, and the region set is the whole of what makes this safe.
  assert.equal(UNDERGROWTH.open, .5);
  assert.equal(UNDERGROWTH_REGIONS.length, 1, 'one forest country carries a thicket today');
  assert.ok(UNDERGROWTH_REGIONS[0].has('Trogo') && UNDERGROWTH_REGIONS[0].has(REGION_IDS.Trogo),
    'the set holds both the name and the id, as CLIMB_REGIONS does');
  // 44 as built, 51 as landed behind the Ibenwood belt. The rule's own literal was left at 44 for a day.
  assert.equal(REGION_IDS.Trogo, 51);
  // Inside Trogo the rule has an opinion; nowhere else in Azhora does it have one.
  assert.equal(isThicketTerrain(walker, -2300, 2900), true);
  for (const name of Object.keys(REGION_IDS)) {
    if (name === 'Trogo') continue;
    const region = regions.find(item => item.name === name);
    const at = region.spawn;
    assert.equal(isThicketTerrain(walker, at.x, at.z), false, `${name} is not a thicket`);
    assert.equal(undergrowthOpen(walker, at.x, at.z), 1, `${name} is open ground as far as this rule knows`);
    // And every step from there, in eight directions, is allowed - including in the four climbing
    // countries, where the other movement rule is the one with an opinion.
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [.7, .7], [-.7, .7], [.7, -.7], [-.7, -.7]])
      assert.equal(canPushThrough(at.x, at.z, at.x + dx, at.z + dz, walker), true,
        `${name}: a step of a metre is refused${isClimbTerrain(walker, at.x, at.z) ? ' (and it is a climbing country)' : ''}`);
  }
  // A world that answers nothing is a world this rule keeps out of.
  assert.equal(canPushThrough(-2300, 2900, -2301, 2900, {}), true);
  assert.equal(thicketAt({}, -2300, 2900), null);
  // And `src/main.js` composes the two rules into the one `canTraverse` hook `moveCharacter` takes.
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  // The step-wise loader puts its own gate first (a country still loading is not walked into); the two rules follow it.
  assert.match(main, /const walkingSlope=\(x,z,nextX,nextZ\)=>(?:regionTraversalReady\(nextX,nextZ\)&&)?canWalkSlope\(x,z,nextX,nextZ,climbWorld\)&&canPushThrough\(x,z,nextX,nextZ,climbWorld\)/,
    'the host must gate walking on both rules through one hook');
  assert.match(main, /import \{ canPushThrough \} from '\.\/undergrowth\.js'/);
});

/**
 * The ways: the atlas's own watercourse, the four gullies the slope cuts, the five animal paths that
 * join them and the five clearings on them. The numbers below are measurements rather than intentions -
 * the open share of the country, the open share of the canopy, and the worst-served hex - and each of
 * them is a number the next builder can compare a forest of their own against.
 */
const BOX = SOUTHWEST_BOXES.Trogo, STEP = 3;
const W = Math.ceil((BOX.maxX - BOX.minX) / STEP) + 1, H = Math.ceil((BOX.maxZ - BOX.minZ) / STEP) + 1;
const px = i => BOX.minX + i * STEP, pz = j => BOX.minZ + j * STEP;
const cellAt = (x, z) => [Math.round((x - BOX.minX) / STEP), Math.round((z - BOX.minZ) / STEP)];
const own = new Uint8Array(W * H), openness = new Float32Array(W * H), canopy = new Uint8Array(W * H);
let cells = 0, open = 0, thicketCells = 0, thicketOpen = 0;
for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
  const x = px(i), z = pz(j), k = j * W + i;
  if (hexOwnerAt(x, z) !== 'Trogo') continue;
  own[k] = 1; cells++;
  openness[k] = trogoWay(x, z);
  if (openness[k] >= UNDERGROWTH.open) open++;
  if (trogoThicket(x, z) > .78) { canopy[k] = 1; thicketCells++; if (openness[k] >= UNDERGROWTH.open) thicketOpen++; }
}

test('three kinds of way through, and four fifths of the canopy is not one of them', () => {
  assert.equal(TROGO_GULLIES.length, 4, 'four gullies off the crest');
  assert.equal(TROGO_PATHS.length, 5, 'five animal paths');
  assert.equal(TROGO_CLEARINGS.length, 6, 'six clearings');
  assert.equal(TROGO_CLEARINGS.filter(one => one.kind === 'desert-air').length, 4,
    'four of the clearings are the lore’s own dry corridors on the crest');
  // And three of those four hold a gully's head, because the crest line is laid on the margin where the
  // hex blend is pulling the base down and the local high ground is forty to fifty metres south-east of
  // it. A gully drawn from the line itself climbed six and a half metres before it fell.
  const heads = TROGO_GULLIES.map(one => one.line[0]);
  const inGap = heads.filter(head => TROGO_CLEARINGS.some(gap => Math.hypot(gap.x - head.x, gap.z - head.z) < gap.radius));
  assert.equal(inGap.length, 3, 'three of the four gully heads stand inside a clearing');
  for (const head of heads) assert.ok(onWayThrough(walker, head.x, head.z), `a gully head at ${head.x}, ${head.z} is not on a way`);
  // Every authored line and every clearing is inside the country, by the hex owner and not by a box.
  for (const line of [...TROGO_GULLIES, ...TROGO_PATHS]) for (const p of line.line)
    assert.equal(hexOwnerAt(p.x, p.z), 'Trogo', `${line.id} leaves the country at ${p.x}, ${p.z}`);
  for (const gap of TROGO_CLEARINGS) assert.equal(hexOwnerAt(gap.x, gap.z), 'Trogo', `${gap.id} is outside Trogo`);
  // **Every clearing stands on a way.** A clearing surrounded by thicket is a clearing nobody can walk
  // into, and five of those would be five pockets in a country with a movement gate in it.
  for (const gap of TROGO_CLEARINGS) assert.ok(onWayThrough(walker, gap.x, gap.z), `${gap.id} cannot be walked to`);
  // The watercourse is a way, and it is the widest of the three kinds.
  assert.ok(TROGO_WAY.river > TROGO_WAY.gully && TROGO_WAY.gully > TROGO_WAY.path, 'the widths step down by kind');
  for (const at of [.25, .5, .75]) {
    const sample = TROGORETH.samples[Math.round((TROGORETH.samples.length - 1) * at)];
    assert.ok(trogoWay(sample.x, sample.z) >= UNDERGROWTH.open, `the Trogoreth is not a way at ${at}`);
  }
  // Measured: a little under half the country is walkable, and **a little under a quarter of the closed
  // canopy is**. Those two numbers are what "you cannot go straight through" comes to in the end.
  const openShare = open / cells, canopyShare = thicketOpen / thicketCells;
  assert.ok(openShare > .35 && openShare < .55, `${(openShare * 100).toFixed(1)}% of the country is walkable`);
  assert.ok(canopyShare > .15 && canopyShare < .32, `${(canopyShare * 100).toFixed(1)}% of the closed canopy is walkable`);
  assert.ok(cells > 20000, `only ${cells} cells of Trogo on the lattice`);
  // And **no hex of the country is more than fifty paces from something a traveler can walk on**. This
  // was false when the network had four paths: (-24,138), the middle of the eastern canopy, sat between
  // the north link and the shore path with eighty metres of thicket to either, and the middle link was
  // put in to mend it.
  for (const cell of REGION_CELLS.Trogo) {
    let found = false;
    for (let dz = -48; dz <= 48 && !found; dz += STEP) for (let dx = -48; dx <= 48 && !found; dx += STEP) {
      const [i, j] = cellAt(cell.x + dx, cell.z + dz);
      if (i < 0 || j < 0 || i >= W || j >= H) continue;
      if (own[j * W + i] && openness[j * W + i] >= UNDERGROWTH.open) found = true;
    }
    assert.ok(found, `(${cell.q},${cell.r}) has no way within fifty paces of its centre`);
  }
});

/** One flood fill over the lattice, obeying the rule, from the seeds given. `shut` closes the ways. */
function flood(seeds, { shut = false } = {}) {
  const seen = new Uint8Array(W * H), queue = [];
  for (const [x, z] of seeds) {
    const [i, j] = cellAt(x, z), k = j * W + i;
    if (own[k] && !seen[k]) { seen[k] = 1; queue.push(k); }
  }
  let reached = 0;
  while (queue.length) {
    const k = queue.pop(), i = k % W, j = (k - i) / W;
    reached++;
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ii = i + a, jj = j + b;
      if (ii < 0 || jj < 0 || ii >= W || jj >= H) continue;
      const n = jj * W + ii;
      if (seen[n] || !own[n]) continue;
      // With the ways shut, a cell that is only open because a way runs through it is closed.
      if (shut && canopy[n] && openness[n] >= UNDERGROWTH.open) continue;
      if (!canPushThrough(px(i), pz(j), px(ii), pz(jj), walker)) continue;
      seen[n] = 1; queue.push(n);
    }
  }
  return { seen, reached };
}
/** Where a traveler arrives from the Meroshe: the crest, which is the country's whole desert margin. */
const DOORS = TROGO_CREST.line.map(p => [p.x, p.z]);
const SHORE = [-2400, 3160];

test('the country is crossed along the ways, in both directions, and the network is one piece', () => {
  const fromDesert = flood(DOORS);
  // Both shores and the river's mouth, from the desert margin.
  for (const [label, x, z] of [
    ['the southern shore', ...SHORE],
    ['the eastern grass', -2050, 2887],
    ['the Trogoreth’s mouth', -2110, 3026],
    ['the coastal grass at row 142', -2400, 3147],
  ]) {
    const [i, j] = cellAt(x, z);
    assert.ok(own[j * W + i], `${label} is not Trogo’s own ground`);
    assert.ok(fromDesert.seen[j * W + i], `${label} cannot be reached from the crest`);
  }
  // **And it reaches every walkable cell in the country**, which is the stronger claim: the watercourse,
  // the four gullies, the five paths, the five clearings and the whole coastal collar are one network and
  // not five stubs. This is what the fifth path and the head gully are for.
  let missed = 0;
  for (let k = 0; k < own.length; k++) if (own[k] && openness[k] >= UNDERGROWTH.open && !fromDesert.seen[k]) missed++;
  assert.equal(missed, 0, `${missed} walkable cells cannot be reached from the desert margin`);
  // The other direction, which the brief asks for by name: from the southern shore back to every point
  // of the crest, which is every door out of the country into the Meroshe.
  const fromShore = flood([SHORE]);
  for (const p of TROGO_CREST.line) {
    const [i, j] = cellAt(p.x, p.z);
    assert.ok(fromShore.seen[j * W + i], `the crest at ${p.x}, ${p.z} cannot be reached from the shore`);
  }
  assert.equal(fromShore.reached, fromDesert.reached, 'the two fills reach the same ground');
});

test('and it cannot be crossed without them: with the ways shut, nothing moves', () => {
  const shut = flood(DOORS, { shut: true });
  // The crest's own cells are open because the crest path runs along them, so shutting the ways strands
  // the fill where it starts. Nine seeds and a handful of cells, against twenty-seven thousand.
  assert.ok(shut.reached < 60, `${shut.reached} cells reached with the ways shut`);
  for (const [label, x, z] of [
    ['the southern shore', ...SHORE],
    ['the eastern grass', -2050, 2887],
    ['the Trogoreth’s mouth', -2110, 3026],
  ]) {
    const [i, j] = cellAt(x, z);
    assert.equal(shut.seen[j * W + i], 0, `${label} is still reached with the ways shut`);
  }
  const openFill = flood(DOORS);
  assert.ok(openFill.reached > shut.reached * 200,
    `the ways are worth ${(openFill.reached / Math.max(1, shut.reached)).toFixed(0)}x, which is not a rule`);
});

test('nobody can be sealed into the thicket: every cell of the country can walk out of it', () => {
  // The rule refuses a step off a way *into* the thicket and never refuses a step out of it, so the
  // proof is a reverse flood fill: start from all the walkable ground and walk backwards, asking of each
  // neighbour "could a body have come from there to here?". If that covers the country, then from
  // anywhere in the country a body can reach walkable ground - however it got there.
  const seen = new Uint8Array(W * H), queue = [];
  for (let k = 0; k < own.length; k++) if (own[k] && openness[k] >= UNDERGROWTH.open) { seen[k] = 1; queue.push(k); }
  while (queue.length) {
    const k = queue.pop(), i = k % W, j = (k - i) / W;
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ii = i + a, jj = j + b;
      if (ii < 0 || jj < 0 || ii >= W || jj >= H) continue;
      const n = jj * W + ii;
      if (seen[n] || !own[n]) continue;
      if (!canPushThrough(px(ii), pz(jj), px(i), pz(j), walker)) continue;
      seen[n] = 1; queue.push(n);
    }
  }
  let stuck = 0, example = null;
  for (let k = 0; k < own.length; k++) if (own[k] && !seen[k]) { stuck++; example ??= [px(k % W), pz((k - k % W) / W)]; }
  assert.equal(stuck, 0, `${stuck} cells cannot walk out, the first at ${example}`);
  // Stated the other way as well, because it is the clause the whole safety of the rule rests on: from
  // the middle of the thicket, every one of the four steps is allowed.
  const deep = [-2300, 2900];
  assert.ok(trogoWay(...deep) < UNDERGROWTH.open, 'the sample point is thicket');
  for (const [dx, dz] of [[2, 0], [-2, 0], [0, 2], [0, -2]])
    assert.equal(canPushThrough(deep[0], deep[1], deep[0] + dx, deep[1] + dz, walker), true,
      'a body in the thicket is held');
  // And a step off a way into the thicket is refused while the step back onto it is allowed, which is
  // the asymmetry `canWalkSlope` makes for a descent.
  const onGully = TROGO_GULLIES[1].line[2], intoThicket = { x: onGully.x, z: onGully.z + 30 };
  assert.ok(onWayThrough(walker, onGully.x, onGully.z), 'the gully is a way');
  assert.ok(!onWayThrough(walker, intoThicket.x, intoThicket.z), 'thirty metres off it is not');
  assert.equal(canPushThrough(onGully.x, onGully.z, intoThicket.x, intoThicket.z, walker), false);
  assert.equal(canPushThrough(intoThicket.x, intoThicket.z, onGully.x, onGully.z, walker), true);
});

test('the thicket is a rule and not three thousand colliders, so canStand cannot see it', () => {
  // **This is why `tests/nobody-sealed-in.test.js` is untouched by this country.** The understory - the
  // tree-fern, the palm and the rattan, which is what actually stops a body in a rainforest - is drawn
  // with no collider at all; the emergents and the canopy trees carry one each, as any tree does, and
  // they are kept off the ways. So `canStand` in the thicket answers exactly what it answers in an open
  // wood, and the only thing that refuses a step is the rule.
  const deep = { x: -2300, z: 2900 };
  assert.ok(canStand(deep.x, deep.z, world, .34), 'the middle of the thicket is standable ground');
  // Walked with the gate on, a traveler pushed straight into the thicket from a way does not move.
  const gully = TROGO_GULLIES[1].line[2];
  const gate = (x, z, nx, nz) => canWalkSlope(x, z, nx, nz, walker) && canPushThrough(x, z, nx, nz, walker);
  const held = { x: gully.x, z: gully.z };
  for (let i = 0; i < 40; i++) moveCharacter(held, 0, .18, walker, .34, { canTraverse: gate });
  assert.ok(Math.hypot(held.x - gully.x, held.z - gully.z) < 12,
    `a traveler walked ${Math.hypot(held.x - gully.x, held.z - gully.z).toFixed(1)} m straight off the gully`);
  // And the same walk with no gate at all goes where it likes, which is what the gate is worth.
  const free = { x: gully.x, z: gully.z };
  for (let i = 0; i < 40; i++) moveCharacter(free, 0, .18, walker, .34);
  assert.ok(Math.hypot(free.x - gully.x, free.z - gully.z) > 4,
    'with no gate the same walk gets nowhere either, so this test proves nothing');
  // The trees are colliders and the understory is not: every collider in Trogo is a tree's or the
  // world's, and none of them is on a way.
  const inside = world.colliders.filter(c => hexOwnerAt(c.x, c.z) === 'Trogo');
  assert.ok(inside.length > 400, `only ${inside.length} colliders in Trogo`);
  const kinds = [...new Set(inside.map(c => c.kind))].sort();
  assert.deepEqual(kinds.filter(kind => /undergrowth|thicket/.test(kind)), [], 'the thicket has no collider kind of its own');
  const onWay = inside.filter(c => c.kind === 'southwest-tree' && trogoWay(c.x, c.z) >= UNDERGROWTH.open);
  assert.ok(onWay.length < inside.length * .06, `${onWay.length} of ${inside.length} colliders stand on a way`);
});

test('the haze: .0144, which hides a traveler at a hundred and twenty paces', () => {
  // `FogExp2` hides a fraction 1 - exp(-(density * depth)^2) of a surface, so a density fixes three
  // distances, and these three are the country's sight line: half hidden, nine tenths gone, invisible.
  const trogo = regions.find(item => item.name === 'Trogo'), sky = regionSky(trogo);
  assert.equal(sky.density, .0144);
  const hidden = share => Math.sqrt(-Math.log(1 - share)) / sky.density;
  assert.ok(Math.abs(hidden(.5) - 58) < 2, `half hidden at ${hidden(.5).toFixed(0)} m`);
  assert.ok(Math.abs(hidden(.9) - 105) < 3, `nine tenths gone at ${hidden(.9).toFixed(0)} m`);
  assert.ok(Math.abs(hidden(.95) - 120) < 3, `invisible at ${hidden(.95).toFixed(0)} m`);
  // **Shorter than anything else in the game**, which is what the decision asks for: the default sky
  // takes 279 m to hide a surface as far as this hides one at 120, and the thickest air anybody had
  // asked for before this was Nethereum's .0071 at 244 m. Job 2's erg blocks the view at 140 m with a
  // six-metre dune, on flat ground; this blocks it at 120 with cloud, and there are trees in the way.
  const every = regions.filter(item => item.id !== 0).map(item => regionSky(item).density);
  assert.equal(Math.max(...every), sky.density, 'some other country has thicker air than the rainforest');
  assert.ok(sky.density / DEFAULT_SKY.density > 2.3, 'the haze is not thick enough to be the subject');
  const secondThickest = [...new Set(every)].sort((a, b) => b - a)[1];
  assert.ok(sky.density / secondThickest > 2, `only ${(sky.density / secondThickest).toFixed(2)}x the next thickest air`);
  // And the haze is **dark**, which is job 1's lesson and job 3's: a near-white haze is over half of
  // every pixel past a hundred and fifty metres, so an air this thick has to be cloud in a canopy
  // rather than milk. Measured against every other sky in the game.
  const luma = hex => ((hex >> 16 & 255) * .299 + (hex >> 8 & 255) * .587 + (hex & 255) * .114) / 255;
  assert.ok(luma(trogo.palette.haze) < .52, `the haze is ${(luma(trogo.palette.haze) * 100).toFixed(0)}% bright`);
  for (const item of regions) {
    if (item.id === 0 || item.name === 'Trogo') continue;
    assert.ok(luma(regionSky(item).fog) > luma(trogo.palette.haze), `${item.name} has a darker haze than the rainforest`);
  }
  // Marosh's own air is the wettest Mediterranean air in the block, and it is an ordinary number.
  const marosh = regions.find(item => item.name === 'Marosh');
  assert.equal(regionSky(marosh).density, .0055);
  assert.ok(regionSky(marosh).density > regionSky(regions.find(item => item.name === 'Hama')).density,
    'Marosh has one more ocean edge than Hama and not a single desert hex');
});

test('the rule is written to be reused, and the Ibenwoods are one row of it', () => {
  // The whole of what a forest country hands over is a region set and a field. The table in
  // `src/world/scenery/undergrowth.js` holds nothing else - no polyline, no clearing, no watercourse - so the five
  // Ibenwood regions and their hundred and fifty-odd hexes of `forest` and `deep_forest` are one row
  // there and one field in their own world module.
  const source = readFileSync(new URL('../src/world/scenery/undergrowth.js', import.meta.url), 'utf8');
  assert.match(source, /const THICKETS = Object\.freeze\(\[/);
  assert.match(source, /regions: new Set\(\[51, 'Trogo'\]\), open: trogoWay/);
  assert.equal(source.includes('TROGO_GULLIES'), false, 'the rule must not know one country’s geometry');
  assert.equal(source.includes('TROGO_PATHS'), false);
  // And it owns no input, no rendering and no saved state, which is the climbing rule's contract.
  for (const forbidden of ["from 'three'", 'document.', 'window.', 'localStorage', 'snapshot(', 'restore(', 'addEventListener'])
    assert.equal(source.includes(forbidden), false, `undergrowth.js uses ${forbidden}`);
  // The field is a field: continuous, bounded, and 1 wherever the rule says nothing.
  for (const [x, z] of [[-2300, 2900], [-2400, 3147], [-2050, 2887], [-2418, 2662], [0, 0], [-3560, 1520]]) {
    const value = undergrowthOpen(walker, x, z);
    assert.ok(value >= 0 && value <= 1, `openness at ${x}, ${z} is ${value}`);
  }
  assert.equal(inTrogoClearing(TROGO_CLEARINGS[0].x, TROGO_CLEARINGS[0].z), 1, 'a clearing is fully open at its middle');
  assert.ok(courseDistance(TROGORETH, -2300, 2900, 400) > TROGO_WAY.river, 'the sample thicket point is off the river');
});
