import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { sourceModule } from './module-loader.js';
import { scopedWorld } from './scoped-world.js';

/**
 * Henborth's ground (src/content/regions/henborth/henborth-world.js): the atlas's twenty-seven hexes, the plain laid on them and its rise toward
 * the mountains, the three ways up to the passes, the damp hollows and dry knolls, every line met - North Celder's held
 * as handed, so North Celder's own seam meets it - the colour, and the places. Pure functions first; one world scoped
 * to Henborth and its three built neighbours at the end.
 */
const THREE = await sourceModule('../vendor/three.module.js');
const { REGION_IDS, REGION_TERRAIN, hexOwnerAt, hexAt, terrainMix } = await sourceModule('../src/world/terrain/region-world.js');
const { groundWithRiver: ground, groundBeforeHenborth: before, groundTint, GROUND_TINT_FAMILIES } = await sourceModule('../src/world/terrain/world-terrain.js');
const { canStand, moveCharacter } = await sourceModule('../src/gameplay/movement/game-state.js');
const { regionBuildStatus } = await sourceModule('../src/dev/tools/build-status.js');
const Hb = await sourceModule('../src/content/regions/henborth/henborth-world.js');
const { HENBORTH, HENBORTH_CELLS, HENBORTH_CLIMATE, HENBORTH_BOX, HENBORTH_EDGES, HENBORTH_UNBUILT, HENBORTH_SEAM, HENBORTH_APPROACHES,
  HENBORTH_HOLLOWS, HENBORTH_KNOLLS, HENBORTH_RESERVED, HENBORTH_GROUND, HENBORTH_ARRIVAL, HENBORTH_LANDMARKS, HENBORTH_TRAILS, HENBORTH_VIEWS,
  henborthGround, henborthTint, henborthOwns, henborthWrites, henborthCover, henborthDamp, henborthNorthness, henborthDesign } = Hb;

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const WWMAP = new URL('../../world-builder/map/resources/examples/azhora.wwmap', import.meta.url);
const H = ground;
const face = (x, z, e = .4) => Math.hypot((H(x + e, z) - H(x - e, z)) / (2 * e), (H(x, z + e) - H(x, z - e)) / (2 * e));
const along = (e, s) => [e.a.x + (e.b.x - e.a.x) * s / e.length, e.a.z + (e.b.z - e.a.z) * s / e.length];
const segment = (x, z, a, b) => {
  const dx = b.x - a.x, dz = b.z - a.z, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
  return { distance: Math.hypot(x - a.x - dx * t, z - a.z - dz * t), t };
};
const lineDistance = (x, z, lines = HENBORTH_EDGES) => Math.min(...lines.map(e => segment(x, z, e.a, e.b).distance));
const lattice = function* (step, box = HENBORTH_BOX) { for (let x = box.minX; x <= box.maxX; x += step) for (let z = box.minZ; z <= box.maxZ; z += step) yield [x, z]; };
const walkLine = function* (points, step = .5) {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], l = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(1, Math.ceil(l / step));
    for (let s = i === 1 ? 0 : 1; s <= n; s++) yield [a.x + (b.x - a.x) * s / n, a.z + (b.z - a.z) * s / n];
  }
};
const tally = list => list.reduce((t, e) => ({ ...t, [e.far]: (t[e.far] ?? 0) + 1 }), {});
const CELDER = HENBORTH_EDGES.filter(e => e.kind === 'celder');
const MOUNTAINS = HENBORTH_EDGES.filter(e => e.kind === 'mountain');
const ellipse = (h, a, r) => {
  const c = Math.cos(h.yaw), s = Math.sin(h.yaw), u = Math.cos(a) * h.rx * r, v = Math.sin(a) * h.rz * r;
  return [h.x + u * c - v * s, h.z + u * s + v * c];
};

test('Henborth is the atlas’s: twenty-seven hexes of plains, all Dfa, on outland’s profile, with the borders the atlas draws and no water', () => {
  assert.equal(REGION_IDS[HENBORTH], 116);
  assert.equal(HENBORTH_CELLS.length, 27);
  assert.ok(HENBORTH_CELLS.every(c => c.terrain === 'plains'));
  const rows = {};
  for (const c of HENBORTH_CELLS) (rows[c.r] ??= []).push(c.q);
  assert.deepEqual(Object.fromEntries(Object.entries(rows).map(([r, qs]) => [r, qs.sort((a, b) => a - b)])),
    { 83: [4, 5], 84: [1, 2, 3, 4], 85: [0, 1, 2, 3], 86: [-2, -1, 0, 1, 2], 87: [-3, -2, -1, 0], 88: [-4, -3, -2, -1], 89: [-5, -4, -3, -2] });
  assert.ok(Object.values(HENBORTH_CLIMATE).every(c => c === 'Dfa') && Object.keys(HENBORTH_CLIMATE).length === 27);
  if (existsSync(WWMAP)) {
    const map = JSON.parse(readFileSync(WWMAP, 'utf8').replace(/^﻿/, ''));
    for (const [key, code] of Object.entries(HENBORTH_CLIMATE)) assert.equal(map.hexes[key]?.climate, code, key);
    // No river edge touches a Henborth hex.
    const own = new Set(Object.keys(HENBORTH_CLIMATE));
    for (const edge of Object.keys(map.rivers ?? {})) assert.ok(!edge.split('|').some(k => own.has(k)), `a river edge at ${edge}`);
  }
  // Registered and built on outland's own profile, so no neighbour's hex blend - and none of their ground - moved.
  for (const k of ['base', 'amp', 'wave']) assert.equal(REGION_TERRAIN[HENBORTH][k], REGION_TERRAIN.outland[k], k);
  assert.deepEqual(tally(HENBORTH_EDGES), { 'North Celder': 8, 'West Mithala': 8, 'North Mithala': 6, Narcosh: 9, 'Lesser Oremindi Mountains': 6,
    'North Oreminidi Mountains': 6, 'Acor Wetlands': 2, 'East Oremindi Mountains': 1 });
  // The unbuilt neighbours' names are the atlas's own.
  const atlas = JSON.parse(readFileSync(new URL('../assets/azhora-dev-regions.json', import.meta.url), 'utf8'));
  const owner = new Map(atlas.regions.flatMap(r => r.cells.map(c => [`${c.q},${c.r}`, r.name])));
  for (const [key, name] of Object.entries(HENBORTH_UNBUILT)) assert.equal(owner.get(key), name, key);
  for (const e of HENBORTH_EDGES) {
    const [x, z] = [(e.a.x + e.b.x) / 2, (e.a.z + e.b.z) / 2];
    assert.equal(hexOwnerAt(x - e.nx, z - e.nz), HENBORTH);
    const h = hexAt(x + e.nx * 10, z + e.nz * 10);
    assert.equal(owner.get(`${h.q},${h.r}`), e.far, `${e.far} across ${x.toFixed(0)},${z.toFixed(0)}`);
  }
  assert.equal(regionBuildStatus(HENBORTH).state, 'environment');
  assert.ok(GROUND_TINT_FAMILIES.includes('henborth'));
});

test('the ground is written on Henborth’s own hexes only, and nobody else’s moved', () => {
  let written = 0;
  const box = { minX: HENBORTH_BOX.minX - 40, maxX: HENBORTH_BOX.maxX + 40, minZ: HENBORTH_BOX.minZ - 40, maxZ: HENBORTH_BOX.maxZ + 40 };
  for (const [x, z] of lattice(9, box)) {
    if (!henborthWrites(x, z)) {
      assert.equal(henborthGround(x, z, 17.25, before), 17.25, `${x},${z}`);
      assert.equal(henborthTint(x, z, '#8d9a5c'), null);
      assert.equal(ground(x, z), before(x, z), `the ground moved at ${x},${z}`);
      continue;
    }
    assert.equal(hexOwnerAt(x, z), HENBORTH);
    assert.equal(ground(x, z), henborthGround(x, z, before(x, z), before), `${x},${z}`);
    written++;
  }
  assert.ok(written > 2500, `${written} points written`);
});

test('every border joins: half-metre samples along all forty-six edges, and the far side never moves', () => {
  const worst = {};
  let samples = 0;
  for (const e of HENBORTH_EDGES) for (let s = .1; s <= e.length - .1; s += .5) {
    const [x, z] = along(e, s);
    const step = Math.abs(ground(x + e.nx * .05, z + e.nz * .05) - ground(x - e.nx * .05, z - e.nz * .05));
    samples++;
    const key = `${e.far}${Math.min(s, e.length - s) < 2 ? ' corner' : ''}`;
    if (step > (worst[key]?.step ?? -1)) worst[key] = { step, at: `${x.toFixed(1)},${z.toFixed(1)}` };
    // The far side never moves: it is whatever the world laid without this country.
    const fx = x + e.nx * .3, fz = z + e.nz * .3;
    if (!henborthWrites(fx, fz)) assert.equal(ground(fx, fz), before(fx, fz), `${e.far} moved at ${fx.toFixed(1)},${fz.toFixed(1)}`);
  }
  assert.ok(samples > 5000, `${samples} samples`);
  for (const [key, { step, at }] of Object.entries(worst)) assert.ok(step < (key.endsWith('corner') ? .5 : .05), `${key}: worst step ${step.toFixed(3)} m at ${at}`);
});

test('North Celder’s line is held exactly as handed and North Celder meets it: both directions at half a metre, whichever is asked first', () => {
  // Every point within fifteen centimetres of the line on this side is the ground this country was handed, so North
  // Celder's seam, which reads this side five centimetres in, meets the same ground with or without this country's layer.
  let held = 0;
  for (const e of CELDER) for (let s = 0; s <= e.length; s += .5) for (const off of [.02, .05, .1, .14]) {
    const [x, z] = along(e, s), px = x - e.nx * off, pz = z - e.nz * off;
    if (!henborthWrites(px, pz)) continue;
    assert.equal(ground(px, pz), before(px, pz), `the line moved at ${px.toFixed(2)},${pz.toFixed(2)}`);
    held++;
  }
  assert.ok(held > 3000, `${held} points of the line held`);
  // Both directions at half a metre: the two sides meet at every point of the eight edges.
  for (const e of CELDER) for (let s = .1; s <= e.length - .1; s += .5) {
    const [x, z] = along(e, s), corner = Math.min(s, e.length - s) < 2;
    const step = Math.abs(ground(x + e.nx * .05, z + e.nz * .05) - ground(x - e.nx * .05, z - e.nz * .05));
    assert.ok(step < (corner ? .5 : .05), `North Celder and Henborth part by ${step.toFixed(3)} m at ${x.toFixed(1)},${z.toFixed(1)}`);
  }
  // Whichever is asked first: North Celder's seam tables, read the first time against the ground with this country's layer
  // or without it, give North Celder the same ground to the last bit. Each order in a fresh process.
  const points = [];
  for (const e of CELDER) for (let s = 1; s < e.length; s += 4) for (const d of [.3, 1, 4, 15, 39]) {
    const [x, z] = along(e, s);
    points.push([+(x + e.nx * d).toFixed(3), +(z + e.nz * d).toFixed(3)]);
  }
  const run = order => execFileSync(process.execPath, ['--input-type=module', '-e', `
    import { pathToFileURL } from 'node:url';
    const url = p => pathToFileURL(${JSON.stringify(ROOT)} + p).href;
    await import(url('tests/module-loader.js'));
    const T = await import(url('src/world/terrain/world-terrain.js'));
    const points = ${JSON.stringify(points)};
    if (${JSON.stringify(order)} === 'without-first') for (const [x, z] of points) T.groundBeforeHenborth(x, z);
    process.stdout.write(JSON.stringify(points.map(([x, z]) => T.groundWithRiver(x, z))));`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 24 });
  const withFirst = JSON.parse(run('with-first')), withoutFirst = JSON.parse(run('without-first'));
  assert.equal(withFirst.length, points.length);
  assert.deepEqual(withoutFirst, withFirst, 'North Celder’s ground depends on which country was asked first');
  // And in this process North Celder's ground is the same with this country's layer as without it.
  points.forEach(([x, z], i) => assert.equal(ground(x, z), withFirst[i], `${x},${z}`));
});

test('no steps: the plain is smooth, and the only steep metres are the neighbours’ own ground within a few metres of their lines', () => {
  let steep = 0, worstInside = 0, at = null;
  for (let x = Math.ceil(HENBORTH_BOX.minX); x <= HENBORTH_BOX.maxX; x += 1) for (let z = Math.ceil(HENBORTH_BOX.minZ); z <= HENBORTH_BOX.maxZ; z += 1) {
    if (!henborthWrites(x, z)) continue;
    const h = H(x, z);
    for (const [nx, nz] of [[x + 1, z], [x, z + 1]]) {
      if (!henborthWrites(nx, nz)) continue;
      const step = Math.abs(H(nx, nz) - h);
      if (step > 1) { steep++; assert.ok(lineDistance(x, z) < 5, `a step of ${step.toFixed(2)} m at ${x},${z}, ${lineDistance(x, z).toFixed(1)} m from a line`); }
      else if (lineDistance(x, z) > 6 && step > worstInside) { worstInside = step; at = `${x},${z}`; }
    }
  }
  // Where the hex blend's relief changes its wavelength along the Mithala's margin, the neighbours' own ground swings by a
  // metre or two every few metres at the line; it is met there and smoothed out within a few metres (the base had 27,190
  // such metres on these hexes).
  assert.ok(steep < 120, `${steep} steep metres`);
  assert.ok(worstInside < .6, `the plain's steepest metre away from the lines rises ${worstInside.toFixed(2)} m at ${at}`);
});

test('the plain stands at the Mithala’s level and rises gently toward the mountains, in long low swells', () => {
  let south = [], north = [], faces = [], sides = 0;
  for (const [x, z] of lattice(4)) {
    if (!henborthWrites(x, z) || lineDistance(x, z) < 90) continue;
    const t = henborthNorthness(x, z), h = H(x, z), c = henborthCover(x, z);
    if (t < .35) south.push(h); else if (t > .65) north.push(h);
    // The hollows' sides and the knolls' shoulders are their own landforms, held below; the rest is the plain.
    if (c.hollow > .01 || c.knoll > .01) { sides = Math.max(sides, face(x, z, 1)); continue; }
    faces.push(face(x, z, 1));
  }
  assert.ok(sides < .3, `a hollow's side or a knoll's shoulder slopes ${sides.toFixed(2)}`);
  const mean = list => list.reduce((p, q) => p + q, 0) / list.length;
  assert.ok(south.length > 30 && north.length > 200);
  assert.ok(mean(north) > mean(south) + 1, `the mountain side stands ${(mean(north) - mean(south)).toFixed(2)} m over the low side`);
  assert.ok(mean(south) > 14 && mean(south) < 17.5 && mean(north) < 19.5, `the plain stands at ${mean(south).toFixed(1)} to ${mean(north).toFixed(1)} m`);
  // Restrained relief: nineteen in twenty of the interior's metres slope less than one in ten, and none more than one in four.
  faces.sort((a, b) => a - b);
  assert.ok(faces[Math.floor(faces.length * .95)] < .1 && faces.at(-1) < .25, `interior slopes ${faces[Math.floor(faces.length * .95)].toFixed(3)} / ${faces.at(-1).toFixed(3)}`);
  // The Mithala's own ground is met at its level: within ten metres of its lines the plain is within two metres of 15.
  for (const e of HENBORTH_EDGES.filter(l => l.kind === 'mithala')) for (let s = 5; s < e.length - 5; s += 10) {
    const [x, z] = along(e, s), px = x - e.nx * 10, pz = z - e.nz * 10;
    assert.ok(Math.abs(H(px, pz) - 15) < 2.5, `the plain stands at ${H(px, pz).toFixed(2)} m by the Mithala at ${px.toFixed(0)},${pz.toFixed(0)}`);
  }
});

test('three ways up to the passes: firm, raised ground from the plain to the mountain foot, unmarked, their lines of travel kept', () => {
  assert.deepEqual(HENBORTH_APPROACHES.map(a => a.pass), ['Henborth Main', 'the Eastern Cold', 'Vel-Henboth']);
  for (const a of HENBORTH_APPROACHES) {
    const head = a.points.at(-1), foot = a.points[0];
    // Each runs from the plain to a mountain line, where the ground across it is highest along that stretch.
    assert.ok(lineDistance(head.x, head.z, MOUNTAINS) < .5, `${a.id}'s head is off the mountain line`);
    assert.ok(Math.hypot(head.x - foot.x, head.z - foot.z) > 100, `${a.id} is short`);
    assert.ok(henborthWrites(foot.x, foot.z) && lineDistance(foot.x, foot.z) > 40);
    // Raised, firm ground: the cover says so along its upper three-fifths, where the rise has come in.
    let crest = 0, n = 0, run = 0;
    const length = a.points.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - a.points[i].x, p.z - a.points[i].z), 0);
    for (const [x, z] of walkLine(a.points, 2)) {
      run += 2;
      if (run < length * .4 || !henborthWrites(x, z)) continue;
      n++; if (henborthCover(x, z).approach > .6) crest++;
    }
    assert.ok(n > 20 && crest / n > .9, `${a.id} is raised along ${(crest / n * 100).toFixed(0)}% of its upper line`);
    // Walkable all the way.
    let prev = null;
    for (const [x, z] of walkLine(a.points, .5)) {
      if (!henborthWrites(x, z)) continue;
      if (prev) assert.ok(Math.abs(H(x, z) - prev) / .5 < .5, `${a.id} is steep at ${x.toFixed(1)},${z.toFixed(1)}`);
      prev = H(x, z);
    }
  }
  // The main and eastern approaches climb from their feet: two metres and more, and a metre and a half and more.
  const top = a => Math.max(...[...walkLine(a.points, 2)].map(([x, z]) => H(x, z)));
  const [main, east] = HENBORTH_APPROACHES;
  assert.ok(top(main) > H(main.points[0].x, main.points[0].z) + 2, 'the main approach does not climb');
  assert.ok(top(east) > H(east.points[0].x, east.points[0].z) + 1.5, 'the eastern approach does not climb');
  // The eastern one has its gullies, cut down its flanks.
  let gullies = 0;
  for (const [x, z] of lattice(2, { minX: -2260, maxX: -2120, minZ: -1960, maxZ: -1800 })) if (henborthWrites(x, z) && henborthCover(x, z).gully > .8) gullies++;
  assert.ok(gullies > 20, `${gullies} points in the eastern approach's gullies`);
  // Their lines of travel are kept for whoever keeps the passes: nothing built, just kept clear.
  assert.equal(HENBORTH_RESERVED.length, 3);
  for (const r of HENBORTH_RESERVED) { assert.equal(r.kind, 'way'); assert.ok(r.half > 2 && r.points.length >= 2); }
});

test('the damp hollows hold their water level and the knolls stand dry', () => {
  for (const h of HENBORTH_HOLLOWS) {
    assert.ok(henborthWrites(h.x, h.z), h.id);
    assert.ok(henborthDamp(h.x, h.z) > .95, `${h.id} is dry`);
    let lo = Infinity, hi = -Infinity, rim = Infinity;
    for (let a = 0; a < Math.PI * 2; a += .1) {
      for (const r of [0, .1, .2, .3, .4]) { const g = H(...ellipse(h, a, r)); lo = Math.min(lo, g); hi = Math.max(hi, g); }
      rim = Math.min(rim, H(...ellipse(h, a, 1.15)));
    }
    if (h.id === 'henborth-wet-corner') {
      // The plain's north-eastern tip runs down into the Acor Wetlands: this one is open on that side.
      assert.ok(H(...ellipse(h, Math.PI * 1.25, .8)) < H(h.x, h.z), 'the wet corner does not run down to the wetlands');
      continue;
    }
    assert.ok(hi - lo < .15, `${h.id}'s floor is not level: ${lo.toFixed(2)} to ${hi.toFixed(2)}`);
    assert.ok(rim > hi + .5, `${h.id} is not closed: its rim falls to ${rim.toFixed(2)} over a floor at ${hi.toFixed(2)}`);
  }
  for (const k of HENBORTH_KNOLLS) {
    let ring = 0;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) ring += H(k.x + Math.cos(a) * k.radius * 1.3, k.z + Math.sin(a) * k.radius * 1.3) / 16;
    assert.ok(H(k.x, k.z) > ring + 1.5, `${k.id} does not stand up`);
    assert.ok(henborthDamp(k.x, k.z) < .05 && henborthCover(k.x, k.z).stony > .8, `${k.id} is not dry and stony`);
    assert.ok(face(k.x, k.z, 1) < .1);
  }
  // Off the hollows and the low mountain foot the plain is dry.
  let wet = 0, n = 0;
  for (const [x, z] of lattice(10)) { if (!henborthWrites(x, z)) continue; n++; if (henborthDamp(x, z) > .5) wet++; }
  assert.ok(wet / n > .02 && wet / n < .2, `${(wet / n * 100).toFixed(1)}% of the plain is wet`);
});

test('the colour: grass by lie and place, the bogs, the stony ground and the ways, faded into the swatch at every line', () => {
  const lum = c => ((c >> 16) & 255) * .3 + ((c >> 8) & 255) * .59 + (c & 255) * .11;
  const swatch = '#8d9a5c';
  for (const h of HENBORTH_HOLLOWS) assert.ok(lum(henborthTint(h.x, h.z, swatch)) < lum(HENBORTH_GROUND.south) - 8, `${h.id} is not darker than the grass`);
  for (const k of HENBORTH_KNOLLS) {
    const c = henborthTint(k.x, k.z, swatch);
    assert.ok(Math.abs(((c >> 16) & 255) - ((c >> 8) & 255)) < 14, `${k.id} is not grey-stony`);
  }
  // Within half a metre of every line the colour is the swatch it was given; at twelve metres in it is this country's own.
  for (const e of HENBORTH_EDGES) for (let s = 2; s < e.length - 2; s += 7) {
    const [x, z] = along(e, s);
    const near = henborthTint(x - e.nx * .3, z - e.nz * .3, swatch);
    if (near === null) continue;
    const sw = parseInt(swatch.slice(1), 16);
    for (const shift of [16, 8, 0]) assert.ok(Math.abs(((near >> shift) & 255) - ((sw >> shift) & 255)) <= 2, `the colour steps at the line at ${x.toFixed(0)},${z.toFixed(0)}`);
  }
  // And it reaches the screen.
  const painted = new THREE.Color(), blend = new THREE.Color(), one = new THREE.Color();
  let moved = 0;
  for (const c of HENBORTH_CELLS) {
    groundTint(painted, c.x, c.z, THREE);
    const mix = terrainMix(c.x, c.z);
    blend.setRGB(0, 0, 0);
    let total = 0;
    for (const [g, w] of Object.entries(mix.grounds)) { if (!w) continue; one.set(g); blend.r += one.r * w; blend.g += one.g * w; blend.b += one.b * w; total += w; }
    moved = Math.max(moved, Math.hypot(painted.r - blend.r / total, painted.g - blend.g / total, painted.b - blend.b / total));
  }
  assert.ok(moved > .02, `the tint never reaches the screen (${moved.toFixed(4)})`);
});

test('landmarks, trails, views and arrival: natural places on open ground, walker’s views at a walker’s eye, and nothing anybody owns', () => {
  for (const p of [HENBORTH_ARRIVAL, ...HENBORTH_LANDMARKS]) {
    assert.ok(henborthOwns(p.x, p.z) && henborthWrites(p.x, p.z), p.id ?? 'arrival');
    assert.ok(face(p.x, p.z) < .3, `${p.id ?? 'arrival'} stands on a slope`);
  }
  assert.ok(henborthDamp(HENBORTH_ARRIVAL.x, HENBORTH_ARRIVAL.z) < .05, 'the arrival is wet');
  for (const p of HENBORTH_LANDMARKS) {
    assert.equal(p.region, REGION_IDS[HENBORTH]);
    assert.match(p.id, /^henborth-/);
    assert.ok(p.description.length > 60, `${p.id} has discovery text`);
    assert.doesNotMatch(`${p.name} ${p.description}`, /\b(city|cities|towns?|villages?|farms?|roads?|camps?|cairns?|markers?|keepers?|folds?|huts?|houses?|shrines?|settlements?|Lond)\b/i, p.id);
  }
  for (const a of HENBORTH_LANDMARKS) for (const b of HENBORTH_LANDMARKS) if (a !== b)
    assert.ok(Math.hypot(a.x - b.x, a.z - b.z) > Math.max(28, a.radius ?? 40, b.radius ?? 40), `${a.id} and ${b.id}`);
  for (const trail of HENBORTH_TRAILS) {
    assert.match(trail.id, /^henborth-/);
    let prev = null;
    for (const [x, z] of walkLine(trail.points, .5)) {
      assert.ok(henborthWrites(x, z), `${trail.id} leaves Henborth at ${x.toFixed(1)},${z.toFixed(1)}`);
      assert.ok(henborthDamp(x, z) < .5, `${trail.id} runs through a bog at ${x.toFixed(1)},${z.toFixed(1)}`);
      if (prev) assert.ok(Math.abs(H(x, z) - prev) / .5 < .5, `${trail.id} climbs steeply at ${x.toFixed(1)},${z.toFixed(1)}`);
      prev = H(x, z);
    }
  }
  // The plain's way carries North Celder's own on from its line, and every other way leaves it.
  const plain = HENBORTH_TRAILS.find(t => t.id === 'henborth-the-plain');
  assert.ok(lineDistance(plain.points[0].x, plain.points[0].z, CELDER) < 15, 'the plain’s way does not start at Celder');
  for (const t of HENBORTH_TRAILS) if (t !== plain) assert.ok(plain.points.some(p => p.x === t.points[0].x && p.z === t.points[0].z), `${t.id} does not leave the plain's way`);
  const ids = Object.keys(HENBORTH_VIEWS);
  assert.ok(ids.includes('henborth') && ids.includes('henborth-wildlife'));
  let walks = 0;
  for (const [id, v] of Object.entries(HENBORTH_VIEWS)) {
    assert.match(id, /^henborth/);
    for (const p of [v.eye, v.target]) assert.ok([p.x, p.y, p.z].every(Number.isFinite));
    const over = v.eye.y - H(v.eye.x, v.eye.z);
    if (v.walk) { walks++; assert.ok(Math.abs(over - 1.8) < .02, `${id}'s eye is ${over.toFixed(2)} m over the ground`); }
    else assert.ok(over > 1.5, `${id} is above the ground`);
  }
  assert.ok(walks >= 6, `${walks} walker's views`);
  // What the life agent's scenery reads is offered here.
  for (const k of ['slope', 'north', 'damp', 'hollow', 'approach', 'gully', 'knoll', 'stony', 'foot', 'foothill', 'swell', 'celder', 'mithala'])
    assert.ok(Number.isFinite(henborthCover(HENBORTH_ARRIVAL.x, HENBORTH_ARRIVAL.z)[k]), k);
  assert.equal(henborthDamp(-2600, -1200), null);
  assert.ok(Number.isFinite(henborthDesign(HENBORTH_ARRIVAL.x, HENBORTH_ARRIVAL.z)));
});

// ---------------------------------------------------------------------------
// The built country
// ---------------------------------------------------------------------------
test('built: the world stands a traveler on this ground, and its ways can be walked both ways', async () => {
  const scene = new THREE.Scene();
  const world = await scopedWorld(scene, [REGION_IDS[HENBORTH], REGION_IDS['North Celder'], REGION_IDS['West Mithala'], REGION_IDS['North Mithala']]);
  for (const p of [HENBORTH_ARRIVAL, ...HENBORTH_LANDMARKS]) {
    assert.ok(Math.abs(world.heightAt(p.x, p.z) - H(p.x, p.z)) < 1e-6, `${p.id ?? 'arrival'}: the world's ground is not this ground`);
    assert.ok(canStand(p.x, p.z, world, .4), `${p.id ?? 'arrival'} has no clear footing`);
  }
  assert.equal(world.regionAt(HENBORTH_ARRIVAL.x, HENBORTH_ARRIVAL.z).name, HENBORTH);
  for (const trail of HENBORTH_TRAILS) for (const points of [trail.points, [...trail.points].reverse()]) {
    const at = { ...points[0], y: world.heightAt(points[0].x, points[0].z) };
    for (const target of points.slice(1)) {
      const steps = Math.ceil(Math.hypot(target.x - at.x, target.z - at.z) / .3), dx = (target.x - at.x) / steps, dz = (target.z - at.z) / steps;
      for (let s = 0; s < steps; s++) { moveCharacter(at, dx, dz, world, .34); at.y = world.heightAt(at.x, at.z); }
      assert.ok(Math.hypot(at.x - target.x, at.z - target.z) < .15, `${trail.id} is blocked short of ${target.x}, ${target.z} at ${at.x.toFixed(1)}, ${at.z.toFixed(1)}`);
    }
  }
});
