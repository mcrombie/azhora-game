import test from 'node:test';
import assert from 'node:assert/strict';
import { RIVER_EDGES, RIVER_SOURCE } from '../src/region-rivers.js';
import { PLAYABLE_SURVEY } from '../src/region-survey.js';
import { hexCentre, hexOwnerAt } from '../src/region-world.js';
import { WEST_RIVERS, LIZEEM, CARICA, VASTOS_RIVER, courseDistance } from '../src/west-regions.js';

/**
 * The west's rivers are chained out of the atlas's own hex edges, and which chains exist
 * depends on which regions `scripts/build-region-rivers.mjs` was asked for: `riverCourses`
 * breaks a chain wherever three edges meet a corner, so a tributary that nobody asked for
 * is not a confluence at all — it is one river running past.
 *
 * Adding the six southern countries to `RIVER_REGIONS` gave the Lizeem four tributaries it
 * did not have (the Oveth, the Neth, the Isareos border river, and its own reach on past
 * Nesdor) and broke its two chains into five. `src/west-regions.js` joins them back, and
 * this file is what holds it to having joined them back *correctly* — because Caricas and
 * Nesdor were built against the river as it was, and a Lizeem a metre out of place moves
 * every tree on both banks.
 *
 * The test below does not freeze a hundred and twenty-eight coordinates. It asserts the
 * thing that would actually be wrong if a chain were dropped, reversed or mis-joined: that
 * the built river still passes along every authored river edge of the bank it is built on,
 * end to end, with no gap anywhere in it.
 */

const AXIAL = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
/** The world midpoint of an authored river edge: halfway between the two hex centres. */
const edgeMidpoint = edge => {
  const a = hexCentre(edge.a[0], edge.a[1]), b = hexCentre(edge.b[0], edge.b[1]);
  return { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
};
const touches = (edge, ...regions) => edge.regions.some(region => regions.includes(region));

test('the generated river file is the six southern countries wide, and still carries the old five', () => {
  for (const region of ['Pueth', 'Vastos', 'Meneth', 'Caricas', 'Nesdor',
    'Isareos', 'Nethereum', 'Ovesos', 'Oves Desert', 'Gala', 'Eer'])
    assert.ok(RIVER_SOURCE.regions.includes(region), `${region} is missing from RIVER_REGIONS`);
  assert.equal(RIVER_EDGES.length, RIVER_SOURCE.edgeCount);
  // An edge is kept when *either* of its hexes is in one of those regions, so every course
  // arrives with the region on both banks.
  for (const edge of RIVER_EDGES) assert.ok(edge.regions.some(region => RIVER_SOURCE.regions.includes(region)));
});

test('every atlas river edge on the Caricas and Nesdor banks is still under the Lizeem, and the line has no gap in it', () => {
  // The Lizeem is the border river of both regions: every authored edge with Caricas or
  // Nesdor on one side and one of the four countries across the water on the other.
  const far = ['Isareos', 'Nethereum', 'Ovesos', 'Gala'];
  const mine = RIVER_EDGES.filter(edge => touches(edge, 'Caricas', 'Nesdor') && touches(edge, ...far));
  assert.ok(mine.length >= 30, `only ${mine.length} authored Lizeem edges found`);
  for (const edge of mine) {
    const mid = edgeMidpoint(edge);
    const off = courseDistance(LIZEEM, mid.x, mid.z, 60);
    assert.ok(off < 12, `the Lizeem runs ${off.toFixed(1)} m off the authored edge at (${mid.x.toFixed(0)}, ${mid.z.toFixed(0)})`);
  }
  // No gap: the softened polyline steps about fourteen metres at most, and a dropped chain
  // would leave a jump of a hex or more.
  for (let i = 1; i < LIZEEM.points.length; i++) {
    const a = LIZEEM.points[i - 1], b = LIZEEM.points[i];
    assert.ok(Math.hypot(b.x - a.x, b.z - a.z) < 20, `the Lizeem jumps at point ${i}`);
  }
});

test('the Lizeem still runs from the head above Caricas to the foot of the Flats, in that order', () => {
  const head = LIZEEM.points[0], mouth = LIZEEM.points.at(-1);
  assert.ok(Math.abs(head.x - -2150) < 1 && Math.abs(head.z - -115) < 1, `head at (${head.x.toFixed(0)}, ${head.z.toFixed(0)})`);
  assert.ok(Math.abs(mouth.x - -1500) < 1 && Math.abs(mouth.z - 953) < 1, `mouth at (${mouth.x.toFixed(0)}, ${mouth.z.toFixed(0)})`);
  assert.equal(LIZEEM.points.length, 128);
  // It ends where the country that is built ends. Gala and Eer carry it on from here and
  // are not built yet, so the last corner of it is the last corner Nesdor's bank reaches.
  assert.equal(hexOwnerAt(mouth.x + 30, mouth.z - 30), 'Nesdor');
});

test('the Carica and the Vastos River were not touched by the wider river file', () => {
  assert.equal(CARICA.points.length, 36);
  assert.ok(Math.abs(CARICA.points[0].x - -1600) < 1 && Math.abs(CARICA.points[0].z - 260) < 1);
  assert.ok(Math.abs(CARICA.points.at(-1).x - -1800) < 1 && Math.abs(CARICA.points.at(-1).z - 606) < 1);
  assert.equal(VASTOS_RIVER.points.length, 40);
  // Every course still has a bounding box, samples and a mouth below its source.
  for (const course of WEST_RIVERS) {
    assert.ok(course.points.length > 2, course.id);
    assert.ok(course.samples.length > course.points.length / 3, course.id);
    assert.ok(Number.isFinite(course.bounds.minX) && Number.isFinite(course.bounds.maxZ), course.id);
  }
});

test('the Lizeem is a wall: four of the six southern countries share no dry border with the built world', () => {
  // The atlas's own arithmetic, asserted so the next builder does not have to redo it, and
  // so that a change to the map that opens a dry crossing is noticed rather than discovered.
  // Every metre of Ovesos's border with Caricas and Nesdor, and of Gala's with Nesdor, is
  // the great river, which cannot be waded anywhere (LIZEEM.fordUntil is 0). The only way
  // to those countries on foot is round the head of it, through Isareos.
  const owner = new Map();
  for (const region of PLAYABLE_SURVEY.regions) for (const cell of region.cells) owner.set(`${cell.q},${cell.r}`, region.name);
  const wet = new Set();
  for (const edge of RIVER_EDGES) { wet.add(`${edge.a}|${edge.b}`); wet.add(`${edge.b}|${edge.a}`); }
  const between = (near, far) => {
    let shared = 0, dry = 0;
    for (const [key, name] of owner) {
      if (name !== near) continue;
      const [q, r] = key.split(',').map(Number);
      for (const [dq, dr] of AXIAL) {
        if (owner.get(`${q + dq},${r + dr}`) !== far) continue;
        shared++;
        if (!wet.has(`${[q, r]}|${[q + dq, r + dr]}`)) dry++;
      }
    }
    return { shared, dry };
  };
  for (const [near, far] of [['Caricas', 'Ovesos'], ['Nesdor', 'Ovesos'], ['Nesdor', 'Gala'], ['Caricas', 'Nethereum']]) {
    const { shared, dry } = between(near, far);
    assert.ok(shared > 0, `${near} and ${far} do not touch`);
    assert.equal(dry, 0, `${dry} of ${shared} ${near}-${far} hex edges have no river on them`);
  }
  // And the way in that does exist: one dry edge from Meneth and two from Caricas into
  // Isareos, all of them above the Lizeem's first authored edge.
  assert.equal(between('Meneth', 'Isareos').dry, 1);
  assert.equal(between('Caricas', 'Isareos').dry, 2);
  assert.ok(LIZEEM.points[0].z < -100, 'and the head of the river is north of all three');
});
