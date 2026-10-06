import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { sourceModule } from './module-loader.js';

/**
 * North Ibenal's ground (src/content/regions/north-ibenal/north-ibenal-world.js): the atlas's thirty-four hexes, the corridor's plain laid on them
 * (`ibenalLand`, src/content/regions/south-ibenal/south-ibenal-world.js, whose tests hold the plain, its streams, its borders and its built world),
 * and what this country has of its own: the last stream's deeper vale, the colder rockier coast, the Oremindi's foot,
 * the foothill on the hills cell and the Narrows. Pure functions only.
 */
const { REGION_IDS, REGION_TERRAIN, hexAt, hexCentre, landDistance } = await sourceModule('../src/world/terrain/region-world.js');
const { groundWithRiver: ground, groundBeforeNorthIbenal: before, GROUND_TINT_FAMILIES, SHORE_TINT_FAMILIES } = await sourceModule('../src/world/terrain/world-terrain.js');
const { WATERLINE } = await sourceModule('../src/gameplay/movement/game-state.js');
const { regionBuildStatus } = await sourceModule('../src/dev/tools/build-status.js');
const S = await sourceModule('../src/content/regions/south-ibenal/south-ibenal-world.js');
const N = await sourceModule('../src/content/regions/north-ibenal/north-ibenal-world.js');
const { NORTH_IBENAL, NORTH_IBENAL_CELLS, NORTH_IBENAL_CLIMATE, NORTH_IBENAL_ARRIVAL, NORTH_IBENAL_LANDMARKS, NORTH_IBENAL_TRAILS,
  NORTH_IBENAL_VIEWS, NORTH_IBENAL_RESERVED, IBENAL_FOOTHILL, IBENAL_NARROWS, northIbenalGround, northIbenalTint, northIbenalShoreTint,
  northIbenalOwns, northIbenalWrites, northIbenalCover } = N;
const { IBENAL_EDGES, ibenalLand, ibenalStreams, ibenalWaterAt, cliffShare } = S;

const WWMAP = new URL('../../world-builder/map/resources/examples/azhora.wwmap', import.meta.url);
const H = ground;
const face = (x, z, e = .4) => Math.hypot((H(x + e, z) - H(x - e, z)) / (2 * e), (H(x, z + e) - H(x, z - e)) / (2 * e));
const tally = list => list.reduce((t, e) => ({ ...t, [e.far]: (t[e.far] ?? 0) + 1 }), {});
const CELLS_BOX = {
  minX: Math.min(...NORTH_IBENAL_CELLS.map(c => c.x)) - 60, maxX: Math.max(...NORTH_IBENAL_CELLS.map(c => c.x)) + 60,
  minZ: Math.min(...NORTH_IBENAL_CELLS.map(c => c.z)) - 60, maxZ: Math.max(...NORTH_IBENAL_CELLS.map(c => c.z)) + 60,
};
const lattice = function* (step, box = CELLS_BOX) { for (let x = box.minX; x <= box.maxX; x += step) for (let z = box.minZ; z <= box.maxZ; z += step) yield [x, z]; };

test('North Ibenal is the atlas’s: thirty-four hexes, one of them hills, all Csc, on outland’s profile, with the borders and water the atlas draws', () => {
  assert.equal(REGION_IDS[NORTH_IBENAL], 115);
  assert.equal(NORTH_IBENAL_CELLS.length, 34);
  const hills = NORTH_IBENAL_CELLS.filter(c => c.terrain === 'hills');
  assert.deepEqual(hills.map(c => [c.q, c.r]), [[-21, 99]]);
  assert.ok(NORTH_IBENAL_CELLS.every(c => c.terrain === 'plains' || c.terrain === 'hills'));
  assert.ok(Object.values(NORTH_IBENAL_CLIMATE).every(c => c === 'Csc') && Object.keys(NORTH_IBENAL_CLIMATE).length === 34);
  if (existsSync(WWMAP)) {
    const map = JSON.parse(readFileSync(WWMAP, 'utf8').replace(/^﻿/, ''));
    for (const [key, code] of Object.entries(NORTH_IBENAL_CLIMATE)) assert.equal(map.hexes[key]?.climate, code, key);
    for (const k of ['-24,101|-25,102', '-24,102|-25,102', '-24,102|-25,103', '-24,103|-25,103', '-24,103|-25,104', '-24,104|-25,104'])
      assert.equal(map.rivers[k], 'small', k);
  }
  for (const k of ['base', 'amp', 'wave']) assert.equal(REGION_TERRAIN[NORTH_IBENAL][k], REGION_TERRAIN.outland[k], k);
  assert.deepEqual(tally(IBENAL_EDGES.filter(e => e.country === NORTH_IBENAL)),
    { sea: 18, 'South Oremindi Mountains': 8, 'North Ibenwood': 8, 'West Ibenwood': 6, 'South Ibenal': 8 });
  assert.equal(regionBuildStatus(NORTH_IBENAL).state, 'environment');
  assert.ok(GROUND_TINT_FAMILIES.includes('north-ibenal') && SHORE_TINT_FAMILIES.includes('north-ibenal'));
});

test('the ground is the corridor’s one plain, written on North Ibenal’s own land only', () => {
  let written = 0;
  for (const [x, z] of lattice(9)) {
    if (!northIbenalWrites(x, z)) {
      assert.equal(northIbenalGround(x, z, 17.25, before), 17.25, `${x},${z}`);
      assert.equal(northIbenalTint(x, z, '#879a63'), null);
      continue;
    }
    if (landDistance(x, z) <= 0) continue;
    // The same function as South Ibenal's, on this country's hexes, over the ground handed to it.
    assert.equal(ground(x, z), ibenalLand(x, z, before(x, z)), `${x},${z}`);
    written++;
  }
  assert.ok(written > 1000, `${written} points written`);
});

test('the Narrows: the corridor pinches between the sea and the Oremindi, and keeps a flat way a hundred metres wide by the shore', () => {
  // Rows 99 to 101: from six hexes wide to two between the sea and the South Oremindi's line.
  const width = z => {
    let first = null, last = null;
    for (let x = -4340; x <= -3600; x += 2) if (northIbenalWrites(x, z) && landDistance(x, z) > 0) { first ??= x; last = x; }
    return last - first;
  };
  assert.ok(width(-318) > width(-404) + 80 && width(-404) > width(-491) + 60 && width(-491) > width(-577) + 60, 'the corridor does not narrow');
  // A flat way along the shore through every row of the Narrows - ground no steeper than one in ten and between three and
  // eight metres up, behind the shore's rocks - over a hundred metres wide in rows 100 and 101, and narrowest at the very
  // end in row 99, where the foothill takes the landward half: "perhaps a quarter-mile wide at its narrowest".
  const flatWay = z => {
    let run = 0, best = 0;
    for (let x = -4120; x <= -3700; x += 1) {
      const d = landDistance(x, z), ok = northIbenalWrites(x, z) && d > 12 && H(x, z) > 3 && H(x, z) < 8 && face(x, z, 1) < .1;
      run = ok ? run + 1 : 0; best = Math.max(best, run);
    }
    return best;
  };
  for (let z = -515; z <= -400; z += 15) assert.ok(flatWay(z) >= 120, `the flat way is ${flatWay(z)} m wide at z ${z}`);
  let narrowest = Infinity;
  for (let z = -590; z <= -530; z += 15) { const w = flatWay(z); narrowest = Math.min(narrowest, w); assert.ok(w >= 35, `the flat way is ${w} m wide at z ${z}`); }
  assert.ok(narrowest < 80, 'the Narrows do not narrow at the end');
  // And it rises to the mountains' foot on the landward side, where the Oremindi's ground is met at the line.
  const share = northIbenalCover(IBENAL_NARROWS.x, IBENAL_NARROWS.z).narrows;
  assert.ok(share > .5, 'the Narrows are not where they are said to be');
  assert.ok(H(-3760, -491) > H(-3980, -491) + 6, 'no rise to the Oremindi’s foot');
});

test('the foothill on the hills cell is a foothill: rounded, walkable, over the Narrows, under the mountains', () => {
  const c = hexCentre(-21, 99);
  let crest = -Infinity, steepest = 0;
  for (let x = c.x - 50; x <= c.x + 50; x += 2) for (let z = c.z - 50; z <= c.z + 50; z += 2) {
    const h = hexAt(x, z);
    if (h.q !== -21 || h.r !== 99 || landDistance(x, z) < 12) continue;
    crest = Math.max(crest, H(x, z));
    steepest = Math.max(steepest, face(x, z, 1));
  }
  assert.ok(crest > 13 && crest < 24, `the foothill's crest stands at ${crest.toFixed(1)} m`);
  assert.ok(steepest < .75, `the foothill is ${steepest.toFixed(2)} at its steepest`);
  assert.ok(crest > H(IBENAL_NARROWS.x, IBENAL_NARROWS.z) + 7, 'the foothill does not stand over the Narrows');
  assert.ok(northIbenalCover(IBENAL_FOOTHILL.x, IBENAL_FOOTHILL.z).hill > .9);
  // The South Oremindi stands over it beyond the line.
  assert.ok(H(c.x + 110, c.z) > crest + 20, 'the mountains do not stand over the foothill');
});

test('the colder north: a higher, rockier coast than the south’s, and the last stream in a deeper vale', () => {
  let rock = 0, shore = 0;
  for (const [x, z] of lattice(2)) {
    const d = landDistance(x, z);
    if (d < 1.5 || d > 2.5 || !northIbenalWrites(x, z)) continue;
    shore++; if (cliffShare(x, z) > .9) rock++;
  }
  assert.ok(rock / shore > .2, `${(rock / shore * 100).toFixed(0)}% of the shore is rock`);
  let stone = 0;
  for (const [x, z] of lattice(2)) { const d = landDistance(x, z); if (d < 0 || d > 3) continue; if (northIbenalShoreTint(x, z, d)?.rock > .9) stone++; }
  assert.ok(stone > 80, `${stone} samples of stone on the shore`);
  const last = ibenalStreams().find(s => s.id === 'north-ibenal-last-stream');
  assert.equal(last.country, NORTH_IBENAL);
  let deep = 0, n = 0;
  for (const p of last.samples) {
    if (p.estuary || p.along < 80 || p.along > 300) continue;
    n++;
    const side = Math.max(H(p.x + p.nx * 22, p.z + p.nz * 22), H(p.x - p.nx * 22, p.z - p.nz * 22));
    if (side > p.surface + 1.6) deep++;
  }
  assert.ok(deep / n > .8, `the last stream runs in a deep vale over ${(deep / n * 100).toFixed(0)}% of its middle`);
});

test('landmarks, trails, views and arrival: natural places on dry ground, walker’s views at a walker’s eye, and nothing anybody owns', () => {
  for (const p of [NORTH_IBENAL_ARRIVAL, ...NORTH_IBENAL_LANDMARKS]) {
    assert.ok(northIbenalOwns(p.x, p.z), p.id ?? 'arrival');
    assert.ok(landDistance(p.x, p.z) > 0 && H(p.x, p.z) > WATERLINE + .5, `${p.id ?? 'arrival'} is wet`);
    assert.equal(ibenalWaterAt(p.x, p.z), null, p.id ?? 'arrival');
    assert.ok(face(p.x, p.z) < .6, `${p.id ?? 'arrival'} stands on a slope`);
  }
  for (const p of NORTH_IBENAL_LANDMARKS) {
    assert.equal(p.region, REGION_IDS[NORTH_IBENAL]);
    assert.match(p.id, /^north-ibenal-/);
    assert.ok(p.description.length > 60, `${p.id} has discovery text`);
    assert.doesNotMatch(`${p.name} ${p.description}`, /\bcity|cities|town|village|harbou?r|anchorage|quay|port\b|mine|mining|working|farm|road|temple|shrine|house|settlement/i, p.id);
  }
  for (const a of NORTH_IBENAL_LANDMARKS) for (const b of NORTH_IBENAL_LANDMARKS) if (a !== b)
    assert.ok(Math.hypot(a.x - b.x, a.z - b.z) > Math.max(28, a.radius ?? 40, b.radius ?? 40), `${a.id} and ${b.id}`);
  assert.ok(NORTH_IBENAL_TRAILS.length === 2 && NORTH_IBENAL_TRAILS.every(t => /^north-ibenal-/.test(t.id)));
  // The corridor ends at the Narrows' end, under the foothill.
  const end = NORTH_IBENAL_TRAILS[0].points.at(-1);
  assert.ok(end.z < -560 && Math.hypot(end.x - IBENAL_FOOTHILL.x, end.z - IBENAL_FOOTHILL.z) < 100, 'the corridor does not reach the Narrows’ end');
  assert.equal(NORTH_IBENAL_RESERVED.length, 3);
  const ids = Object.keys(NORTH_IBENAL_VIEWS);
  assert.ok(ids.includes('north-ibenal') && ids.includes('north-ibenal-wildlife'));
  let walks = 0;
  for (const [id, v] of Object.entries(NORTH_IBENAL_VIEWS)) {
    assert.match(id, /^north-ibenal/);
    for (const p of [v.eye, v.target]) assert.ok([p.x, p.y, p.z].every(Number.isFinite));
    const over = v.eye.y - H(v.eye.x, v.eye.z);
    if (v.walk) { walks++; assert.ok(Math.abs(over - 1.8) < .02, `${id}'s eye is ${over.toFixed(2)} m over the ground`); }
    else assert.ok(over > 1.5, `${id} is above the ground`);
  }
  assert.ok(walks >= 4, `${walks} walker's views`);
  // The places the life agent's scenery reads are offered by this country's module.
  assert.equal(typeof N.northIbenalWaterRibbons, 'function');
  assert.equal(typeof N.northIbenalWaterColliders, 'function');
  assert.equal(N.northIbenalWaterRibbons().length, 1);
});
