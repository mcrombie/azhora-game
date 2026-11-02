import test from 'node:test';
import assert from 'node:assert/strict';
import { RIVER_EDGES, RIVER_SOURCE } from '../src/world/terrain/region-rivers.js';
import { PLAYABLE_SURVEY } from '../src/dev/tools/region-survey.js';
import { hexCentre, hexOwnerAt } from '../src/world/terrain/region-world.js';
import { WEST_RIVERS, LIZEEM, LIZEEM_HEAD, VAELLIR, MITHALA_MAIN, CARICA, VASTOS_RIVER, ISAREOS_RIVER, ISAREOS_BECKS, NETHEREUM_STREAMS, MENETH_BECKS, courseDistance, coursePosition, courseHalfAt } from '../src/content/regions/western-regions/west-regions.js';
import { WEST_PROFILES, courseSurface, westWaterSurface } from '../src/content/regions/western-regions/west-ground.js';
import {groundWithRiver} from '../src/world/terrain/world-terrain.js';

/**
 * The west's rivers are chained out of the atlas's own hex edges, and which chains exist
 * depends on which regions `scripts/build-region-rivers.mjs` was asked for: `riverCourses`
 * breaks a chain wherever three edges meet a corner, so a tributary that nobody asked for
 * is not a confluence at all — it is one river running past.
 *
 * Adding the six southern countries to `RIVER_REGIONS` gave the Lizeem four tributaries it
 * did not have (the Oveth, the Neth, the Isareos border river, and its own reach on past
 * Nesdor) and broke its two chains into five. `src/content/regions/western-regions/west-regions.js` joins them back, and
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

test('reshaped Lizeem banks still overlap all four tributary mouths', () => {
  for (const id of ['isareos-river', 'neth', 'carica', 'oveth-reach']) {
    const tributary = WEST_RIVERS.find(r => r.id === id), mouth = tributary.points.at(-1);
    const half = courseHalfAt(LIZEEM, coursePosition(LIZEEM, mouth.x, mouth.z));
    assert.ok(courseDistance(LIZEEM, mouth.x, mouth.z) < half + tributary.halfWidthEnd,
      `${id} must join the water instead of ending on a dry bank`);
  }
});

test('the Lizeem grows from a narrow descending headwater without a square cutoff or an abrupt reverse bend',()=>{
  const profile=WEST_PROFILES.get(LIZEEM_HEAD.id),end=profile.at(-1),main=WEST_PROFILES.get(LIZEEM.id);
  assert.ok(profile[0].half<.15&&end.half>2);
  assert.ok(Math.hypot(end.x-main[0].x,end.z-main[0].z)<.001);
  assert.ok(Math.abs(end.surface-main[0].surface)<.001);
  const a=profile.at(-2),b=LIZEEM.points[1],u=[end.x-a.x,end.z-a.z],v=[b.x-end.x,b.z-end.z];
  assert.ok((u[0]*v[0]+u[1]*v[1])/(Math.hypot(...u)*Math.hypot(...v))>.95);
  for(let i=1;i<profile.length;i++)assert.ok(profile[i].surface<profile[i-1].surface);
  for(const p of profile)for(const sign of [-1,1]){
    const offset=p.half+3,x=p.x+sign*p.nx*offset,z=p.z+sign*p.nz*offset;
    if(westWaterSurface(x,z)===null)assert.ok(groundWithRiver(x,z)>p.surface-.1,'the water has banks: '+JSON.stringify({x,z,ground:groundWithRiver(x,z),surface:p.surface}));
  }
});

test('Pyros and Mithala carry broad rivers while the Lizeem remains larger',()=>{
  const average=course=>Array.from({length:11},(_,i)=>courseHalfAt(course,i/10)).reduce((a,b)=>a+b)/11;
  const pyros=average(VAELLIR),mithala=average(MITHALA_MAIN),lizeem=average(LIZEEM);
  assert.ok(pyros>=20&&mithala>=20);
  assert.ok(Math.abs(pyros-mithala)<5);
  assert.ok(lizeem>pyros&&lizeem>mithala);
});

test('Isareos streams carry continuous water down to the Isa at its actual level', () => {
  for (const beck of ISAREOS_BECKS) {
    const profile = WEST_PROFILES.get(beck.id), mouth = profile.at(-1);
    assert.ok(courseDistance(ISAREOS_RIVER, mouth.x, mouth.z) < .01, `${beck.id}: no dry gap to the receiver`);
    assert.ok(Math.abs(mouth.surface - courseSurface(ISAREOS_RIVER, mouth.x, mouth.z)) < .001,
      `${beck.id}: no water hanging above the receiver`);
    assert.ok(profile[0].half < .25 && profile[5].half > profile[0].half * 2, 'a narrow source grows into the beck');
    for (let i = 1; i < profile.length; i++) {
      assert.ok(profile[i].surface < profile[i - 1].surface, `${beck.id}: water must descend`);
      for (let step = 0; step <= 4; step++) {
        const a = profile[i - 1], b = profile[i], t = step / 4;
        const x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
        assert.notEqual(westWaterSurface(x, z), null, `${beck.id}: dry break at segment ${i}`);
      }
    }
  }
});

test('seasonal streams fade into meadow without blunt ends or detached puddles', () => {
  for (const course of [...NETHEREUM_STREAMS, ...MENETH_BECKS]) {
    const profile = WEST_PROFILES.get(course.id);
    let ended = false, lastWet = null;
    for (let i = 0; i < profile.length; i++) {
      const p = profile[i], wet = westWaterSurface(p.x, p.z) !== null;
      if (i) assert.ok(p.surface < profile[i - 1].surface, course.id + ' flows downhill');
      if (!wet) ended = true;
      else { assert.ok(!ended, course.id + ' must not reappear as a detached strip'); lastWet = p; }
    }
    assert.ok(lastWet?.along > .65 && lastWet.half < .4, course.id + ' narrows before drying');
    assert.ok(profile[0].half < .2, course.id + ' begins as a narrow spring');
    assert.ok(profile.some(p => p.half > 1), course.id + ' retains a readable middle reach');
    assert.ok(ended, course.id + ' gives up its channel on the meadow');
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
