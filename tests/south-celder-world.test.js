import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import './module-loader.js';
import { canerdClear } from '../src/content/regions/canerd/canerd-world.js';
import { REGION_IDS, REGION_TERRAIN, REGION_OUTLINES, hexOwnerAt, regionAt } from '../src/world/terrain/region-world.js';
import { groundWithRiver as ground, groundBeforeCelder as before } from '../src/world/terrain/world-terrain.js';
import { westWaterSurface, courseSample } from '../src/content/regions/western-regions/west-ground.js';
import { MITHALA_CELDER_WATER } from '../src/content/regions/western-regions/west-regions.js';
import { SOUTH_CELDER, SOUTH_CELDER_CELLS, SOUTH_CELDER_CLIMATE, SOUTH_CELDER_KOPPEN, SOUTH_CELDER_ARRIVAL,
  SOUTH_CELDER_LANDMARKS, SOUTH_CELDER_TRAILS, SOUTH_CELDER_VIEWS, CELDER_EDGES, CELDER_BOX, CELDER_HEAD, CELDER_PLAIN,
  CELDER_MOUND_SITE, celderOwns, celderStreamField, celderPlainHeight, celderLand, southCelderGround, southCelderTint, southCelderOwns } from '../src/content/regions/south-celder/south-celder-world.js';

const WWMAP = new URL('../../world-builder/map/resources/examples/azhora.wwmap', import.meta.url);
const tally = edges => edges.reduce((t, e) => ({ ...t, [e.far]: (t[e.far] ?? 0) + 1 }), {});
const along = (e, s) => [e.a.x + (e.b.x - e.a.x) * s / e.length, e.a.z + (e.b.z - e.a.z) * s / e.length];
const OWN = CELDER_EDGES.filter(e => e.country === SOUTH_CELDER);
const BUILT = ['West Lotharn Mountains', 'Yunethre', 'South Oremindi Mountains', 'South Mithala', 'West Mithala'];
/** The worst step across an edge, every half metre along it, split into the edge's middle and its last two metres. */
function worstStep(e) {
  let middle = 0, corner = 0;
  for (let s = .1; s <= e.length - .1; s += .5) {
    const [x, z] = along(e, s);
    const step = Math.abs(ground(x + e.nx * .05, z + e.nz * .05) - ground(x - e.nx * .05, z - e.nz * .05));
    if (Math.min(s, e.length - s) < 2) corner = Math.max(corner, step); else middle = Math.max(middle, step);
  }
  return { middle, corner };
}

test('South Celder: 37 plains hexes, Dfa but one Cfa, the outland profile, and the borders the atlas draws', () => {
  assert.ok(Number.isInteger(REGION_IDS[SOUTH_CELDER]));
  assert.equal(SOUTH_CELDER_CELLS.length, 37);
  assert.ok(SOUTH_CELDER_CELLS.every(c => c.terrain === 'plains'));
  assert.equal(SOUTH_CELDER_KOPPEN, 'Dfa');
  const codes = Object.values(SOUTH_CELDER_CLIMATE);
  assert.equal(codes.length, 37);
  assert.equal(codes.filter(c => c === 'Dfa').length, 36);
  assert.equal(SOUTH_CELDER_CLIMATE['-2,96'], 'Cfa');
  if (existsSync(WWMAP)) {
    const map = JSON.parse(readFileSync(WWMAP, 'utf8').replace(/^﻿/, ''));
    for (const [key, code] of Object.entries(SOUTH_CELDER_CLIMATE)) assert.equal(map.hexes[key]?.climate, code, key);
  }
  // Registered on outland's own blend, so no neighbour's hex blend changed by it.
  for (const k of ['base', 'amp', 'wave']) assert.equal(REGION_TERRAIN[SOUTH_CELDER][k], REGION_TERRAIN.outland[k], k);
  assert.deepEqual(tally(OWN), { 'South Mithala': 1, 'West Lotharn Mountains': 16, Yunethre: 8, 'South Oremindi Mountains': 4, 'East Oremindi Mountains': 7 });
  let shared = 0;
  for (const loop of REGION_OUTLINES[SOUTH_CELDER]) for (let i = 0; i < loop.length; i++) {
    const a = loop[i], b = loop[(i + 1) % loop.length], mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2, l = Math.hypot(b.x - a.x, b.z - a.z);
    const n = [(b.z - a.z) / l, -(b.x - a.x) / l];
    if ([1, -1].some(k => hexOwnerAt(mx + k * n[0], mz + k * n[1]) === 'North Celder')) shared++;
  }
  assert.equal(shared, 14);
});

test('the plain is written on its own hexes only, and the far side of every border is never moved', () => {
  for (let x = CELDER_BOX.minX - 60; x <= CELDER_BOX.maxX + 60; x += 23) for (let z = CELDER_BOX.minZ - 60; z <= CELDER_BOX.maxZ + 60; z += 23) {
    if (hexOwnerAt(x, z) === SOUTH_CELDER) continue;
    assert.equal(southCelderGround(x, z, 17.25, null), 17.25, `${x},${z}`);
    assert.equal(southCelderTint(x, z), null);
  }
  for (const e of CELDER_EDGES) for (let s = .5; s < e.length; s += 4) {
    const [x, z] = along(e, s);
    assert.equal(ground(x + e.nx * .3, z + e.nz * .3), before(x + e.nx * .3, z + e.nz * .3), `${e.far} at ${x.toFixed(1)},${z.toFixed(1)}`);
  }
});

test('the plain falls from the foothills to the water at about 1 in 110, in low swells a horse can climb', () => {
  const bands = new Map();
  let steepest = 0, roll = [Infinity, -Infinity];
  for (let x = CELDER_BOX.minX; x <= CELDER_BOX.maxX; x += 9) for (let z = CELDER_BOX.minZ; z <= CELDER_BOX.maxZ; z += 9) {
    if (!celderOwns(x, z) || canerdClear(x,z,2)) continue;
    let edge = Infinity;
    for (const e of CELDER_EDGES) edge = Math.min(edge, Math.hypot(x - (e.a.x + e.b.x) / 2, z - (e.a.z + e.b.z) / 2));
    if (edge < 140) continue;
    const field = celderStreamField(x, z), band = Math.floor(field.distance / 100);
    const b = bands.get(band) ?? []; b.push(ground(x, z)); bands.set(band, b);
    steepest = Math.max(steepest, Math.hypot(ground(x + 1, z) - ground(x - 1, z), ground(x, z + 1) - ground(x, z - 1)) / 2);
    if (field.distance > 220) {
      const P = CELDER_PLAIN, datum = field.level + P.bank + P.fall * field.distance + P.terrace;
      const r = celderPlainHeight(x, z, field) - datum;
      roll = [Math.min(roll[0], r), Math.max(roll[1], r)];
    }
  }
  const mean = band => { const b = bands.get(band); return b.reduce((s, v) => s + v, 0) / b.length; };
  const fall = (mean(6) - mean(2)) / 400;
  assert.ok(fall > 1 / 220 && fall < 1 / 60, `the plain falls 1 in ${(1 / fall).toFixed(0)}`);
  assert.ok(steepest < .3, `the plain's steepest is ${steepest.toFixed(3)}`);
  assert.ok(roll[1] - roll[0] > 3 && roll[1] - roll[0] < 14, `the swells and foothills roll ${roll.map(v => v.toFixed(1))}`);
});

test('the natural plain stays smooth across the fourteen Celder edges outside the separately tested Canerd mound', () => {
  let worst = 0, kink = 0, n = 0;
  for (const loop of REGION_OUTLINES[SOUTH_CELDER]) for (let i = 0; i < loop.length; i++) {
    const a = loop[i], b = loop[(i + 1) % loop.length], l = Math.hypot(b.x - a.x, b.z - a.z), mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2;
    let nx = (b.z - a.z) / l, nz = -(b.x - a.x) / l;
    if (hexOwnerAt(mx + nx, mz + nz) === SOUTH_CELDER) { nx = -nx; nz = -nz; }
    if (hexOwnerAt(mx + nx, mz + nz) !== 'North Celder') continue;
    for (let s = .1; s <= l - .1; s += .5) {
      const x = a.x + (b.x - a.x) * s / l, z = a.z + (b.z - a.z) * s / l; n++;
      if (canerdClear(x,z,7)) continue;
      worst = Math.max(worst, Math.abs(ground(x + nx * .05, z + nz * .05) - ground(x - nx * .05, z - nz * .05)));
      if (celderStreamField(x, z).head < 12) continue;
      kink = Math.max(kink, Math.abs(ground(x + nx * 6, z + nz * 6) + ground(x - nx * 6, z - nz * 6) - 2 * ground(x, z)));
    }
  }
  assert.ok(n > 1500);
  assert.ok(worst < .05, `worst step at the shared line ${worst.toFixed(3)} m`);
  assert.ok(kink < .4, `worst bend across the shared line over 12 m ${kink.toFixed(3)} m`);
});

test('every border joins: half-metre samples along all fifty edges, under half a metre against every built neighbour', () => {
  for (const e of OWN) {
    const { middle, corner } = worstStep(e);
    const where = `${e.far} edge at ${e.a.x.toFixed(0)},${e.a.z.toFixed(0)}`;
    if (BUILT.includes(e.far)) { assert.ok(middle < .5, `${where}: ${middle.toFixed(2)} m`); assert.ok(corner < .5, `${where}, corner: ${corner.toFixed(2)} m`); }
    else { assert.ok(middle < .1, `${where}: ${middle.toFixed(2)} m`); assert.ok(corner < .5, `${where}, corner: ${corner.toFixed(2)} m`); }
  }
});

test("the Celder water's head: the one atlas edge between the two Celders is a dry gravel bed falling into the stream", () => {
  const H = CELDER_HEAD, len = Math.hypot(H.to.x - H.from.x, H.to.z - H.from.z), nx = -(H.to.z - H.from.z) / len, nz = (H.to.x - H.from.x) / len;
  let previous = Infinity, rises = 0;
  const foot = courseSample(MITHALA_CELDER_WATER, H.to.x, H.to.z).surface;
  for (let s = 2; s <= len - 2; s += 2) {
    const x = H.from.x + (H.to.x - H.from.x) * s / len, z = H.from.z + (H.to.z - H.from.z) * s / len, bed = ground(x, z);
    if (bed > previous + .02) rises++;
    previous = bed;
    assert.equal(westWaterSurface(x, z), null, 'dry: no water stands in it');
    assert.ok(Math.min(ground(x + nx * 8, z + nz * 8), ground(x - nx * 8, z - nz * 8)) - bed > .25, `a bed between banks at ${s} m`);
  }
  assert.equal(rises, 0, 'it falls the whole way');
  const top = ground(H.from.x + (H.to.x - H.from.x) * 2 / len, H.from.z + (H.to.z - H.from.z) * 2 / len);
  assert.ok(top - previous > .3 && top - previous < 1.2, `it falls ${(top - previous).toFixed(2)} m`);
  assert.ok(Math.abs(previous - (foot - .2)) < .6, `and arrives at the Celder water's head, ${previous.toFixed(2)} against ${foot.toFixed(2)}`);
});

test('the colour: terrace, swells, fans, foothills and the gravel head, faded into the blend at the border', () => {
  const colours = new Set();
  for (let x = CELDER_BOX.minX; x <= CELDER_BOX.maxX; x += 13) for (let z = CELDER_BOX.minZ; z <= CELDER_BOX.maxZ; z += 13) {
    const c = southCelderTint(x, z, '#8e9a57');
    if (hexOwnerAt(x, z) !== SOUTH_CELDER) { assert.equal(c, null); continue; }
    assert.ok(Number.isInteger(c) && c >= 0 && c <= 0xffffff);
    colours.add(c >> 3);
  }
  assert.ok(colours.size > 40, `${colours.size} colours`);
  const e = OWN.find(edge => edge.far === 'Yunethre'), [x, z] = along(e, e.length / 2);
  assert.equal(southCelderTint(x - e.nx * .01, z - e.nz * .01, '#a4a363') >> 2, 0xa4a363 >> 2, 'the blend own swatch at the line');
});

test('landmarks, trails, views and arrival: natural places on dry ground, and nothing anybody owns', () => {
  for (const p of [SOUTH_CELDER_ARRIVAL, ...SOUTH_CELDER_LANDMARKS]) {
    assert.ok(southCelderOwns(p.x, p.z), p.name ?? 'arrival');
    assert.equal(westWaterSurface(p.x, p.z), null);
    assert.ok(Number.isFinite(ground(p.x, p.z)));
  }
  for (const p of SOUTH_CELDER_LANDMARKS) {
    assert.equal(p.region, REGION_IDS[SOUTH_CELDER]);
    assert.doesNotMatch(`${p.name} ${p.description}`, /canerd|castle|house|stud|farm|road|quarr|fair|crom/i, p.name);
  }
  for (const trail of SOUTH_CELDER_TRAILS) for (const p of trail.points) assert.ok(celderOwns(p.x, p.z), `${trail.id} ${p.x},${p.z}`);
  for (const [id, view] of Object.entries(SOUTH_CELDER_VIEWS)) {
    assert.match(id, /^south-celder/);
    for (const p of [view.eye, view.target]) assert.ok([p.x, p.y, p.z].every(Number.isFinite));
    assert.ok(view.eye.y > ground(view.eye.x, view.eye.z) + 1.5, `${id} is above the ground`);
  }
  // The natural foundation beneath the separately authored Canerd mound stays level.
  assert.equal(regionAt(CELDER_MOUND_SITE.x, CELDER_MOUND_SITE.z)?.name, 'North Celder');
  let lo = Infinity, hi = -Infinity;
  for (let a = 0; a < 6.3; a += .5) for (const r of [0, 30, 60]) {
    const x = CELDER_MOUND_SITE.x + Math.cos(a) * r, z = CELDER_MOUND_SITE.z + Math.sin(a) * r;
    const h = celderLand(x,z,before(x,z),before); lo = Math.min(lo, h); hi = Math.max(hi, h);
  }
  assert.ok(hi - lo < 2.5, `the mound's site varies ${(hi - lo).toFixed(2)} m`);
});
