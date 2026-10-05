import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import './module-loader.js';
import { REGION_IDS, REGION_TERRAIN, hexOwnerAt } from '../src/region-world.js';
import { groundWithRiver as ground, groundBeforeCelder as before } from '../src/world-terrain.js';
import { westWaterSurface, WEST_PROFILES } from '../src/west-ground.js';
import { MITHALA_WEST_ARM, MITHALA_CELDER_WATER } from '../src/west-regions.js';
import { CELDER_EDGES, CELDER_BOX, celderStreamField } from '../src/south-celder-world.js';
import { NORTH_CELDER, NORTH_CELDER_CELLS, NORTH_CELDER_CLIMATE, NORTH_CELDER_KOPPEN, NORTH_CELDER_ARRIVAL,
  NORTH_CELDER_LANDMARKS, NORTH_CELDER_TRAILS, NORTH_CELDER_VIEWS, northCelderGround, northCelderTint, northCelderOwns } from '../src/north-celder-world.js';

const WWMAP = new URL('../../world-builder/map/resources/examples/azhora.wwmap', import.meta.url);
const OWN = CELDER_EDGES.filter(e => e.country === NORTH_CELDER);
const along = (e, s) => [e.a.x + (e.b.x - e.a.x) * s / e.length, e.a.z + (e.b.z - e.a.z) * s / e.length];
const isCelder = (x, z) => /Celder/.test(hexOwnerAt(x, z) ?? '');

test('North Celder: 34 hexes, 26 plains and the 8 eastern grassland, Dfa but one Dfc, and the borders the atlas draws', () => {
  assert.ok(Number.isInteger(REGION_IDS[NORTH_CELDER]));
  assert.equal(NORTH_CELDER_CELLS.length, 34);
  assert.equal(NORTH_CELDER_CELLS.filter(c => c.terrain === 'plains').length, 26);
  assert.equal(NORTH_CELDER_CELLS.filter(c => c.terrain === 'grassland').length, 8);
  assert.equal(NORTH_CELDER_KOPPEN, 'Dfa');
  assert.equal(Object.values(NORTH_CELDER_CLIMATE).filter(c => c === 'Dfa').length, 33);
  assert.equal(NORTH_CELDER_CLIMATE['-6,90'], 'Dfc');
  if (existsSync(WWMAP)) {
    const map = JSON.parse(readFileSync(WWMAP, 'utf8').replace(/^﻿/, ''));
    for (const [key, code] of Object.entries(NORTH_CELDER_CLIMATE)) assert.equal(map.hexes[key]?.climate, code, key);
  }
  for (const k of ['base', 'amp', 'wave']) assert.equal(REGION_TERRAIN[NORTH_CELDER][k], REGION_TERRAIN.outland[k], k);
  const tally = OWN.reduce((t, e) => ({ ...t, [e.far]: (t[e.far] ?? 0) + 1 }), {});
  assert.deepEqual(tally, { 'West Mithala': 12, 'South Mithala': 6, 'East Oremindi Mountains': 10, Henborth: 8 });
});

test('written on its own hexes only', () => {
  for (let x = CELDER_BOX.minX - 60; x <= CELDER_BOX.maxX + 60; x += 23) for (let z = CELDER_BOX.minZ - 60; z <= CELDER_BOX.maxZ + 60; z += 23) {
    if (hexOwnerAt(x, z) === NORTH_CELDER) continue;
    assert.equal(northCelderGround(x, z, 17.25, null), 17.25, `${x},${z}`);
    assert.equal(northCelderTint(x, z), null);
  }
});

test("the Mithala's border water is untouched, and nothing of Celder stands in it", () => {
  // The levels the Mithala report gives, to the centimetre: registering and building the two Celders moved none.
  const arm = WEST_PROFILES.get(MITHALA_WEST_ARM.id), celder = WEST_PROFILES.get(MITHALA_CELDER_WATER.id);
  assert.equal(arm[0].surface.toFixed(2), '13.96');
  assert.equal(celder[0].surface.toFixed(2), '12.32');
  assert.equal(celder.at(-1).surface.toFixed(2), '11.34');
  let wet = 0;
  for (const profile of [arm, celder]) for (const s of profile) for (let off = -12; off <= 12; off += .5) {
    const x = s.x + s.nx * off, z = s.z + s.nz * off;
    if (!isCelder(x, z)) continue;
    const surface = westWaterSurface(x, z);
    if (surface == null) continue;
    wet++;
    assert.ok(ground(x, z) < surface - .05, `ground ${ground(x, z).toFixed(2)} under water ${surface.toFixed(2)} at ${x.toFixed(1)},${z.toFixed(1)}`);
  }
  assert.ok(wet > 500, `${wet} wet points on Celder hexes`);
});

test("the streams' Celder bank is real ground at the water's level: a metre over it, no cliff, and the plain never below it", () => {
  let steepest = 0, low = Infinity, high = -Infinity;
  for (const course of [MITHALA_WEST_ARM, MITHALA_CELDER_WATER]) for (const s of WEST_PROFILES.get(course.id)) {
    const sign = isCelder(s.x + s.nx * 20, s.z + s.nz * 20) ? 1 : -1;
    for (let d = s.half + 1; d <= 45; d += 1) {
      const x = s.x + s.nx * d * sign, z = s.z + s.nz * d * sign, x1 = s.x + s.nx * (d + 1) * sign, z1 = s.z + s.nz * (d + 1) * sign;
      if (!isCelder(x, z) || !isCelder(x1, z1)) continue;
      // Near the junction a walk out from one stream reaches the other's channel: that is its bank, not this one's.
      if (celderStreamField(x1, z1).near < d + .5) continue;
      steepest = Math.max(steepest, Math.abs(ground(x1, z1) - ground(x, z)));
      if (d >= 14) { const over = ground(x, z) - s.surface; low = Math.min(low, over); high = Math.max(high, over); }
    }
  }
  assert.ok(steepest < .5, `the bank's steepest metre rises ${steepest.toFixed(2)} m`);
  assert.ok(low > .3 && high < 3.2, `from 14 to 45 m out the bank stands ${low.toFixed(2)} to ${high.toFixed(2)} m over the water`);
  // Beyond the streams' own ground the plain stands above the water it falls to, all over this country.
  let lowest = Infinity;
  for (let x = CELDER_BOX.minX; x <= CELDER_BOX.maxX; x += 6) for (let z = CELDER_BOX.minZ; z <= CELDER_BOX.maxZ; z += 6) {
    if (hexOwnerAt(x, z) !== NORTH_CELDER) continue;
    const field = celderStreamField(x, z);
    if (field.near < 20 || field.head < 8) continue; // the head's dry bed lies under its own notional water line
    let edge = Infinity;
    for (const e of OWN) if (!/Mithala/.test(e.far)) edge = Math.min(edge, Math.hypot(x - (e.a.x + e.b.x) / 2, z - (e.a.z + e.b.z) / 2));
    if (edge < 120) continue;
    lowest = Math.min(lowest, ground(x, z) - field.level);
  }
  assert.ok(lowest > .5, `the plain's lowest is ${lowest.toFixed(2)} m over its water`);
});

test('every border joins: half-metre samples along every edge, the far side never moved', () => {
  for (const e of OWN) {
    let middle = 0, corner = 0;
    for (let s = .1; s <= e.length - .1; s += .5) {
      const [x, z] = along(e, s);
      const step = Math.abs(ground(x + e.nx * .05, z + e.nz * .05) - ground(x - e.nx * .05, z - e.nz * .05));
      if (Math.min(s, e.length - s) < 2) corner = Math.max(corner, step); else middle = Math.max(middle, step);
      if (s % 4 < .5) assert.equal(ground(x + e.nx * .3, z + e.nz * .3), before(x + e.nx * .3, z + e.nz * .3));
    }
    const where = `${e.far} edge at ${e.a.x.toFixed(0)},${e.a.z.toFixed(0)}`;
    assert.ok(middle < .15, `${where}: ${middle.toFixed(2)} m`);
    assert.ok(corner < .5, `${where}, corner: ${corner.toFixed(2)} m`);
  }
});

test('landmarks, trails, views and arrival: natural places on dry ground, and nothing anybody owns', () => {
  for (const p of [NORTH_CELDER_ARRIVAL, ...NORTH_CELDER_LANDMARKS]) {
    assert.ok(northCelderOwns(p.x, p.z), p.name ?? 'arrival');
    assert.equal(westWaterSurface(p.x, p.z), null);
  }
  for (const p of NORTH_CELDER_LANDMARKS) {
    assert.equal(p.region, REGION_IDS[NORTH_CELDER]);
    assert.doesNotMatch(`${p.name} ${p.description}`, /canerd|castle|mound|house|stud|farm|road|quarr|fair|crom/i, p.name);
  }
  for (const trail of NORTH_CELDER_TRAILS) for (const p of trail.points) assert.ok(isCelder(p.x, p.z), `${trail.id} ${p.x},${p.z}`);
  for (const [id, view] of Object.entries(NORTH_CELDER_VIEWS)) {
    assert.match(id, /^north-celder/);
    assert.ok(view.eye.y > ground(view.eye.x, view.eye.z) + 1.5, `${id} is above the ground`);
  }
});
