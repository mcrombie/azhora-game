import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { sourceModule } from './module-loader.js';
import { scopedWorld } from './scoped-world.js';

/**
 * East Izol's ground: the atlas's twenty-seven hexes, the Three Presences made real ground at West Izol's places
 * and heights, the headland coast, the kept places, the seam with West Izol, the colour, and the ways a walker has
 * in a country where steep rock is climbed. Pure functions first; one world scoped to the island at the end.
 */
const THREE = await sourceModule('../vendor/three.module.js');
const { REGION_IDS, REGION_TERRAIN, REGION_CELLS, REGION_OUTLINES, hexOwnerAt, regionAt, landDistance, terrainMix } = await sourceModule('../src/region-world.js');
const { groundWithRiver: ground, groundBeforeEastIzol: before, groundTint, SHORE_TINT_FAMILIES, GROUND_TINT_FAMILIES, shoreTintOf } = await sourceModule('../src/world-terrain.js');
const { canWalkSlope, isClimbTerrain, CLIMBING } = await sourceModule('../src/climbing.js');
const { canStand, moveCharacter, WATERLINE } = await sourceModule('../src/game-state.js');
const { westWaterSurface } = await sourceModule('../src/west-ground.js');
const { THREE_PRESENCES, IZOL_ROAD, SIGHTSTONE } = await sourceModule('../src/izol-world.js');
const { regionBuildStatus } = await sourceModule('../src/build-status.js');
const I = await sourceModule('../src/east-izol-world.js');
const { EAST_IZOL, EAST_IZOL_CELLS, EAST_IZOL_CLIMATE, EAST_IZOL_LINE, EAST_IZOL_PRESENCES, EAST_IZOL_KEPT, EAST_IZOL_COVES, EAST_IZOL_BAYS,
  EAST_IZOL_GULLIES, EAST_IZOL_ARRIVAL, EAST_IZOL_LANDMARKS, EAST_IZOL_TRAILS, EAST_IZOL_VIEWS, EAST_IZOL_RESERVED, EAST_IZOL_BOX,
  eastIzolGround, eastIzolTint, eastIzolShoreTint, eastIzolOwns, eastIzolCover, cliffShare, gullyAt, keptAt, HEARTH_ROAD_END } = I;

const WWMAP = new URL('../../world-builder/map/resources/examples/azhora.wwmap', import.meta.url);
const H = (x, z) => ground(x, z);
const face = (x, z, e = .4) => Math.hypot((H(x + e, z) - H(x - e, z)) / (2 * e), (H(x, z + e) - H(x, z - e)) / (2 * e));
const walker = { heightAt: H, regionAt };
const along = (e, s) => [e.a.x + (e.b.x - e.a.x) * s / e.length, e.a.z + (e.b.z - e.a.z) * s / e.length];
const lattice = function* (step, box = EAST_IZOL_BOX) { for (let x = box.minX; x <= box.maxX; x += step) for (let z = box.minZ; z <= box.maxZ; z += step) yield [x, z]; };
/** Every point of a polyline, `step` metres apart. */
const walkLine = function* (points, step = .5) {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], l = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(1, Math.ceil(l / step));
    for (let s = i === 1 ? 0 : 1; s <= n; s++) yield [a.x + (b.x - a.x) * s / n, a.z + (b.z - a.z) * s / n];
  }
};

test('East Izol is the atlas’s: twenty-seven hexes, Csa on the coast and Csb inland, ten edges against West Izol', () => {
  assert.ok(Number.isInteger(REGION_IDS[EAST_IZOL]));
  assert.equal(EAST_IZOL_CELLS.length, 27);
  const counts = {};
  for (const c of EAST_IZOL_CELLS) counts[c.terrain] = (counts[c.terrain] ?? 0) + 1;
  assert.deepEqual(counts, { grassland: 11, hills: 4, plains: 8, forest: 3, mountain: 1 });
  const codes = Object.values(EAST_IZOL_CLIMATE);
  assert.equal(codes.filter(c => c === 'Csa').length, 14);
  assert.equal(codes.filter(c => c === 'Csb').length, 13);
  if (existsSync(WWMAP)) {
    const map = JSON.parse(readFileSync(WWMAP, 'utf8').replace(/^﻿/, ''));
    for (const [key, code] of Object.entries(EAST_IZOL_CLIMATE)) assert.equal(map.hexes[key]?.climate, code, key);
  }
  // Registered on outland's own profile, so West Izol's hex blend - and its ground - did not move.
  for (const k of ['base', 'amp', 'wave']) assert.equal(REGION_TERRAIN[EAST_IZOL][k], REGION_TERRAIN.outland[k], k);
  assert.equal(EAST_IZOL_LINE.length, 10);
  for (const e of EAST_IZOL_LINE) {
    const [x, z] = along(e, e.length / 2);
    assert.equal(hexOwnerAt(x + e.nx, z + e.nz), 'West Izol');
    assert.equal(hexOwnerAt(x - e.nx, z - e.nz), EAST_IZOL);
  }
  assert.equal(regionBuildStatus(EAST_IZOL).state, 'environment');
});

test('the ground is written on East Izol’s own land only: West Izol and the sea are the ground they were', () => {
  for (const [x, z] of lattice(7, { minX: EAST_IZOL_BOX.minX - 60, maxX: EAST_IZOL_BOX.maxX + 60, minZ: EAST_IZOL_BOX.minZ - 60, maxZ: EAST_IZOL_BOX.maxZ + 60 })) {
    const own = regionAt(x, z)?.name === EAST_IZOL && landDistance(x, z) > 0;
    if (own) continue;
    assert.equal(eastIzolGround(x, z, 17.25, before), 17.25, `${x},${z}`);
    assert.equal(H(x, z), before(x, z), `the ground moved at ${x},${z}`);
    if (regionAt(x, z)?.name !== EAST_IZOL) assert.equal(eastIzolTint(x, z, '#8f9471'), null);
  }
});

test('every border joins: half-metre samples along all ten edges with West Izol, and the far side never moves', () => {
  let worst = 0, samples = 0;
  for (const e of EAST_IZOL_LINE) for (let s = .1; s <= e.length - .1; s += .5) {
    const [x, z] = along(e, s);
    worst = Math.max(worst, Math.abs(H(x + e.nx * .05, z + e.nz * .05) - H(x - e.nx * .05, z - e.nz * .05)));
    const fx = x + e.nx * .3, fz = z + e.nz * .3;
    assert.equal(H(fx, fz), before(fx, fz), `West Izol moved at ${fx.toFixed(1)},${fz.toFixed(1)}`);
    samples++;
  }
  assert.ok(samples > 1100, `${samples} samples`);
  assert.ok(worst < .05, `worst step at the line ${worst.toFixed(3)} m`);
});

test('no steps: East Izol’s ground is continuous everywhere but the metre round two of West Izol’s own corners', () => {
  // A cliff is steep; a step is a jump that survives being looked at closer. Rows and columns every eight metres,
  // a tenth of a metre apart, and every jump bisected down to a millimetre.
  const corners = EAST_IZOL_LINE.flatMap(e => [e.a, e.b]);
  const steps = [];
  const look = (x0, z0, dx, dz, n) => {
    let prev = H(x0, z0);
    for (let i = 1; i <= n; i++) {
      const x = x0 + dx * i, z = z0 + dz * i, h = H(x, z);
      if (Math.abs(h - prev) > .08) {
        let ax = x - dx, az = z - dz, bx = x, bz = z, ha = prev, hb = h;
        for (let k = 0; k < 7; k++) { const mx = (ax + bx) / 2, mz = (az + bz) / 2, hm = H(mx, mz); if (Math.abs(hm - ha) > Math.abs(hb - hm)) { bx = mx; bz = mz; hb = hm; } else { ax = mx; az = mz; ha = hm; } }
        const own = regionAt(ax, az)?.name === EAST_IZOL, corner = corners.some(c => Math.hypot(ax - c.x, az - c.z) < 2);
        if (Math.abs(hb - ha) > .03 && own && !corner) steps.push(`${ax.toFixed(2)},${az.toFixed(2)}: ${Math.abs(hb - ha).toFixed(3)} m`);
      }
      prev = h;
    }
  };
  for (let z = EAST_IZOL_BOX.minZ + 20; z <= EAST_IZOL_BOX.maxZ - 20; z += 8) look(EAST_IZOL_BOX.minX + 20, z, .1, 0, Math.round((EAST_IZOL_BOX.maxX - EAST_IZOL_BOX.minX - 40) / .1));
  for (let x = EAST_IZOL_BOX.minX + 20; x <= EAST_IZOL_BOX.maxX - 20; x += 8) look(x, EAST_IZOL_BOX.minZ + 20, 0, .1, Math.round((EAST_IZOL_BOX.maxZ - EAST_IZOL_BOX.minZ - 40) / .1));
  assert.deepEqual(steps, []);
});

test('the Three Presences are ground: at West Izol’s places and heights, isolated, each its own shape, rock round a level summit', () => {
  assert.equal(EAST_IZOL_PRESENCES.length, 3);
  for (const p of EAST_IZOL_PRESENCES) {
    const prop = THREE_PRESENCES.find(q => q.id === p.id);
    // The summit is where the prop's apex stood, at the prop's own height.
    assert.ok(Math.hypot(p.x - prop.x, p.z - prop.z) < 6, `${p.id} has moved`);
    assert.equal(p.top, prop.topY);
    let lo = Infinity, hi = -Infinity;
    for (let a = 0; a < 6.3; a += .2) for (const r of [0, p.platform * .5, p.platform - .6]) {
      const h = H(p.x + Math.cos(a) * r, p.z + Math.sin(a) * r); lo = Math.min(lo, h); hi = Math.max(hi, h);
    }
    assert.ok(Math.abs(hi - prop.topY) < .05 && hi - lo < .05, `${p.id}'s platform runs ${lo.toFixed(2)} to ${hi.toFixed(2)}`);
    // Nothing stands higher than its own summit on the ground nearer it than either of the others: the summit is the top.
    for (let a = 0; a < 6.3; a += .1) for (let r = p.platform; r < 150; r += 3) {
      const x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r;
      if (EAST_IZOL_PRESENCES.some(q => q !== p && Math.hypot(x - q.x, z - q.z) < r)) continue;
      assert.ok(H(x, z) <= p.top + .01, `${p.id} is overtopped at ${x.toFixed(0)},${z.toFixed(0)}`);
    }
    // The prop's skyline is retired by this (src/izol-scenery.js): the ground already stands at the peak's height.
    assert.ok(H(prop.x + prop.lean, prop.z - 1.5) > prop.topY - 3);
    // Rock: most of the flank between a third and nine tenths of the way up is steeper than a walker can climb.
    let steep = 0, flank = 0;
    for (let x = p.x - 150; x <= p.x + 150; x += 3) for (let z = p.z - 150; z <= p.z + 150; z += 3) {
      const h = H(x, z); if (h < 20 + (p.top - 20) * .35 || h > 20 + (p.top - 20) * .9 || Math.hypot(x - p.x, z - p.z) > 150) continue;
      flank++; if (face(x, z) > CLIMBING.grabSlope) steep++;
    }
    assert.ok(steep / flank > .6, `${p.id}: only ${(steep / flank * 100).toFixed(0)}% of its flank is rock to climb`);
  }
  // Isolated: between any two the ground falls to the island's own levels, far below either summit.
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
    const a = EAST_IZOL_PRESENCES[i], b = EAST_IZOL_PRESENCES[j];
    let low = Infinity; for (let t = 0; t <= 1; t += .01) low = Math.min(low, H(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t));
    assert.ok(low < 30, `${a.id} and ${b.id} are joined at ${low.toFixed(1)} m`);
  }
  // Distinct in profile: the dome's top is broad, the horn's sharp, and the block's summit stands at one end of its top.
  const top = (p, f) => {
    const level = 20 + (p.top - 20) * f, seen = new Set(['0,0']), stack = [[0, 0]], cells = [];
    while (stack.length) {
      const [i, j] = stack.pop(), x = p.x + i * 2, z = p.z + j * 2;
      if (H(x, z) < level) continue;
      cells.push([x, z]);
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = `${i + a},${j + b}`; if (!seen.has(k)) { seen.add(k); stack.push([i + a, j + b]); } }
    }
    const mx = cells.reduce((s, c) => s + c[0], 0) / cells.length, mz = cells.reduce((s, c) => s + c[1], 0) / cells.length;
    return { area: cells.length * 4, off: Math.hypot(mx - p.x, mz - p.z) };
  };
  const [north, east, south] = EAST_IZOL_PRESENCES.map(p => top(p, .85));
  assert.ok(north.area > 2.2 * east.area, `the dome's top (${north.area} m²) is not broader than the horn's (${east.area} m²)`);
  assert.ok(south.off > 14 && north.off < 9, `the block's summit is ${south.off.toFixed(1)} m off its top's middle, the dome's ${north.off.toFixed(1)}`);
  assert.deepEqual(EAST_IZOL_PRESENCES.map(p => p.kind), ['dome', 'horn', 'block']);
  // The northern one stands on the atlas's one mountain hex.
  const cell = EAST_IZOL_CELLS.find(c => c.terrain === 'mountain');
  assert.ok(Math.hypot(cell.x - EAST_IZOL_PRESENCES[0].x, cell.z - EAST_IZOL_PRESENCES[0].z) < 58);
});

test('all three Presences stand in view from the Hearthstone’s site and from the Sightstone', () => {
  const site = EAST_IZOL_KEPT.find(k => k.id === 'hearthstone-site');
  for (const from of [site, SIGHTSTONE]) {
    const eye = { x: from.x, z: from.z, y: H(from.x, from.z) + 1.8 };
    for (const p of EAST_IZOL_PRESENCES) {
      const L = Math.hypot(p.x - eye.x, p.z - eye.z);
      // Clear sky over every metre of ground until the line is on the peak's own upper body.
      for (let s = 2; s < L - 25; s++) {
        const t = s / L, y = eye.y + (p.top + 1 - eye.y) * t;
        assert.ok(H(eye.x + (p.x - eye.x) * t, eye.z + (p.z - eye.z) * t) < y, `${p.id} is hidden from ${from.id ?? 'the site'} at ${s} m`);
      }
    }
  }
});

test('the kept places: the Hearthstone’s site at the Hearth Road’s end, Merrath’s flat on the east coast, the north-east bay’s', () => {
  const [site, merrath, northEast] = EAST_IZOL_KEPT;
  // Level, open, at the island's middle and where the brief put it, with the road's end on its western edge.
  assert.ok(site.x >= 500 && site.x <= 560 && site.z >= 1860 && site.z <= 1920);
  assert.ok(Math.hypot(HEARTH_ROAD_END.x - site.x, HEARTH_ROAD_END.z - site.z) < 30, 'the road ends at the site');
  let lo = Infinity, hi = -Infinity;
  for (let a = 0; a < 6.3; a += .2) for (const r of [0, 7, 14, 20]) { const h = H(site.x + Math.cos(a) * r, site.z + Math.sin(a) * r); lo = Math.min(lo, h); hi = Math.max(hi, h); }
  assert.ok(hi - lo < .05, `the site varies ${(hi - lo).toFixed(3)} m`);
  assert.ok(landDistance(site.x, site.z) > 190, 'it is the middle of the island');
  // The road's last metres on this ground: gentle, and walkable both ways under the climbing country's rule.
  const road = IZOL_ROAD.filter((p, i) => i === IZOL_ROAD.length - 1 || hexOwnerAt(p.x, p.z) === EAST_IZOL || hexOwnerAt(IZOL_ROAD[i + 1].x, IZOL_ROAD[i + 1].z) === EAST_IZOL);
  for (const pts of [road, [...road].reverse()]) {
    let prev = null;
    for (const [x, z] of walkLine(pts, .25)) { if (prev) assert.ok(canWalkSlope(prev[0], prev[1], x, z, walker), `the road at ${x.toFixed(1)},${z.toFixed(1)}`); prev = [x, z]; }
  }
  // Merrath's flat: on the east coast, at the head of a bay with a strand, big enough for a town, and gentle.
  assert.ok(merrath.x > 700 && merrath.halfA * 2 >= 96 && merrath.halfB * 2 >= 140);
  assert.equal(cliffShare(800, 1674), 0, 'a strand at the head of the east bay');
  let steepest = 0, where = null;
  for (let x = merrath.x - merrath.halfA + 8; x <= merrath.x + merrath.halfA - 20; x += 4) for (let z = merrath.z - merrath.halfB + 10; z <= merrath.z + merrath.halfB - 10; z += 4) {
    // The Merrath gully crosses the flat to the strand in a shallow bed of its own.
    if (!keptAt(x, z) || (gullyAt(x, z)?.distance ?? Infinity) < 14) continue;
    if (face(x, z, 1) > steepest) { steepest = face(x, z, 1); where = `${x},${z}`; }
    assert.ok(H(x, z) > WATERLINE + 1, `the flat is dry at ${x},${z}`);
  }
  assert.ok(steepest < .16, `the flat is ${steepest.toFixed(3)} at its steepest, at ${where}`);
  assert.ok(northEast.x > 640 && H(northEast.x, northEast.z) > WATERLINE + 1);
  // The scenery is told where they are, and the summit platforms with them.
  for (const k of EAST_IZOL_KEPT) assert.ok(EAST_IZOL_RESERVED.some(r => r.id === k.id));
  for (const p of EAST_IZOL_PRESENCES) assert.ok(EAST_IZOL_RESERVED.some(r => Math.hypot(r.x - p.x, r.z - p.z) < 1 && r.radius >= p.platform));
});

test('a walker reaches every summit, every kept place, every landmark and the arrival from the Hearth Road’s end, without climbing or falling', () => {
  assert.ok(isClimbTerrain(walker, 600, 1800) && isClimbTerrain(walker, 515, 1688) && !isClimbTerrain(walker, 300, 1850), 'East Izol, and East Izol only, climbs');
  // The lattice: a metre apart over the country, every step asked the way `canWalkSlope` asks it, and a step down a
  // face steeper than the grab slope refused too, because that is a fall rather than a walk.
  const box = EAST_IZOL_BOX, W = Math.round(box.maxX - box.minX) + 1, D = Math.round(box.maxZ - box.minZ) + 1;
  const h = new Float32Array(W * D), climb = new Uint8Array(W * D);
  for (let j = 0; j < D; j++) for (let i = 0; i < W; i++) { const x = box.minX + i, z = box.minZ + j; h[j * W + i] = H(x, z); climb[j * W + i] = regionAt(x, z)?.name === EAST_IZOL ? 1 : 0; }
  const cell = (x, z) => Math.round(z - box.minZ) * W + Math.round(x - box.minX);
  const seen = new Uint8Array(W * D), start = cell(HEARTH_ROAD_END.x, HEARTH_ROAD_END.z), queue = [start];
  seen[start] = 1;
  for (let q = 0; q < queue.length; q++) {
    const k = queue[q], i = k % W, j = (k - i) / W;
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ii = i + a, jj = j + b; if (ii < 0 || jj < 0 || ii >= W || jj >= D) continue;
      const n = jj * W + ii; if (seen[n] || h[n] < WATERLINE) continue;
      if (climb[k] || climb[n]) {
        const rise = h[n] - h[k];
        if (rise > CLIMBING.grabSlope + .08) continue;
        if (face(box.minX + i + a / 2, box.minZ + j + b / 2) > CLIMBING.grabSlope) continue;
      }
      seen[n] = 1; queue.push(n);
    }
  }
  const reached = (x, z) => { for (let r = 0; r <= 2; r++) for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) if (seen[cell(x + a, z + b)]) return true; return false; };
  for (const p of EAST_IZOL_PRESENCES) assert.ok(reached(p.x, p.z), `the ${p.id} summit cannot be walked to`);
  for (const k of EAST_IZOL_KEPT) assert.ok(reached(k.x, k.z), `${k.id} cannot be walked to`);
  for (const p of [EAST_IZOL_ARRIVAL, ...EAST_IZOL_LANDMARKS]) assert.ok(reached(p.x, p.z), `${p.id ?? 'the arrival'} cannot be walked to`);
  const gate = EAST_IZOL_COVES.find(c => c.id === 'gate-cove');
  assert.ok(reached(gate.x + gate.inland.x * 8, gate.z + gate.inland.z * 8), 'the gate gully does not come down to its cove');
});

test('the trails are walked both ways under the climbing country’s rule, and the shoulders are the way up', () => {
  for (const trail of EAST_IZOL_TRAILS) {
    assert.match(trail.id, /^east-izol-/);
    for (const pts of [trail.points, [...trail.points].reverse()]) {
      let prev = null;
      for (const [x, z] of walkLine(pts, .25)) {
        assert.ok(regionAt(x, z)?.name === EAST_IZOL, `${trail.id} leaves East Izol at ${x},${z}`);
        if (prev) assert.ok(canWalkSlope(prev[0], prev[1], x, z, walker) && face(x, z) <= CLIMBING.grabSlope, `${trail.id} at ${x.toFixed(1)},${z.toFixed(1)} (${face(x, z).toFixed(2)})`);
        assert.ok(H(x, z) > WATERLINE, `${trail.id} is wet at ${x},${z}`);
        prev = [x, z];
      }
    }
  }
  // Each Presence's own trail ends on its summit platform.
  for (const p of EAST_IZOL_PRESENCES) {
    assert.ok(EAST_IZOL_TRAILS.some(t => { const end = t.points.at(-1); return Math.hypot(end.x - p.x, end.z - p.z) <= p.platform; }), `no trail reaches ${p.id}`);
  }
});

test('the coast: cliffs for most of it, strands at seven coves and two bays, a slope to the water, and the waterline where the coast field puts it', () => {
  // Round the whole coast at two metres in: mostly cliff.
  let cliff = 0, shore = 0;
  for (const [x, z] of lattice(2)) {
    const d = landDistance(x, z);
    if (d < 1.5 || d > 2.5 || regionAt(x, z)?.name !== EAST_IZOL || I.lineDistance(x, z) < 30) continue;
    shore++; if (cliffShare(x, z) > .9) cliff++;
  }
  assert.ok(cliff / shore > .6, `${(cliff / shore * 100).toFixed(0)}% of the coast is cliff`);
  // The cliffs stand: four metres in from the water a headland is well above it.
  let tall = 0, heads = 0;
  for (const [x, z] of lattice(3)) {
    const d = landDistance(x, z);
    if (d < 4 || d > 5 || regionAt(x, z)?.name !== EAST_IZOL || cliffShare(x, z) < .99 || I.lineDistance(x, z) < 40) continue;
    heads++; if (H(x, z) > 8) tall++;
  }
  assert.ok(tall / heads > .8, `${tall} of ${heads} clifftop samples stand over eight metres`);
  // Each cove: a strand at the water, under a wall.
  assert.equal(EAST_IZOL_COVES.length, 7);
  for (const c of EAST_IZOL_COVES) {
    const x = c.x + c.inland.x * 6, z = c.z + c.inland.z * 6;
    assert.ok(H(x, z) > WATERLINE && H(x, z) < 3, `${c.id}'s strand stands at ${H(x, z).toFixed(2)}`);
    assert.equal(cliffShare(c.x, c.z), 0, `${c.id} has a strand`);
  }
  assert.equal(EAST_IZOL_BAYS.length, 2);
  // At sea and under the water nothing is East Izol's to write: the shore every region shares.
  for (const [x, z] of lattice(5)) {
    const d = landDistance(x, z);
    if (d > 0) {
      // No dry land below the water: inland of the strand every metre of East Izol stands clear of it.
      if (d > 8 && regionAt(x, z)?.name === EAST_IZOL) assert.ok(H(x, z) > WATERLINE + .5, `low ground at ${x},${z}: ${H(x, z).toFixed(2)}`);
      continue;
    }
    assert.equal(H(x, z), before(x, z), `the sea floor moved at ${x},${z}`);
  }
});

test('no river and no lake: five dry gullies, falling the whole way, never steeper than their grade', () => {
  for (const [x, z] of lattice(6)) if (regionAt(x, z)?.name === EAST_IZOL) assert.equal(westWaterSurface(x, z), null, `water at ${x},${z}`);
  assert.equal(EAST_IZOL_GULLIES.length, 5);
  for (const g of EAST_IZOL_GULLIES) {
    let previous = Infinity, run = 0, last = null;
    for (const [x, z] of walkLine(g.points, 1)) {
      const at = gullyAt(x, z);
      assert.equal(at.gully.id, g.id, `${g.id} at ${x},${z} reads ${at.gully.id}`);
      if (last) run = Math.hypot(x - last[0], z - last[1]);
      assert.ok(at.level <= previous + 1e-6, `${g.id} rises at ${x},${z}`);
      // (Its own grade is held down its own line; read between two points of the drawn line a bend can add a quarter.)
      if (last) assert.ok(previous - at.level <= g.grade * run * 1.25 + .05, `${g.id} falls ${(previous - at.level).toFixed(2)} in ${run.toFixed(2)} m at ${x},${z}`);
      // The bed is cut: the ground on its line is no higher than the bed.
      // (Where it comes out onto a strand the strand's own slope takes over; a hanging one lets go on the clifftop.)
      const strand = g.mouth !== null && cliffShare(x, z) < 1 && landDistance(x, z) < 40;
      assert.ok(H(x, z) <= at.level + .3 || strand || (g.mouth === null && at.along > at.length - 8), `${g.id} is not cut at ${x},${z}`);
      previous = at.level; last = [x, z];
    }
  }
});

test('the colour: stone by height, pasture, maquis, folds, beds and kept ground, faded into the swatch at the line; stone and shingle on the shore', () => {
  assert.ok(GROUND_TINT_FAMILIES.includes('east-izol') && SHORE_TINT_FAMILIES.includes('east-izol'));
  const colours = new Set();
  for (const [x, z] of lattice(11)) {
    const c = eastIzolTint(x, z, '#8f9471');
    if (regionAt(x, z)?.name !== EAST_IZOL) { assert.equal(c, null); continue; }
    assert.ok(Number.isInteger(c) && c >= 0 && c <= 0xffffff);
    colours.add(c >> 3);
  }
  assert.ok(colours.size > 60, `${colours.size} colours`);
  // Slate-grey at height, iron-brown low: the summits are paler and greyer than the low rock of the coves' walls.
  const rgb = c => [(c >> 16) & 255, (c >> 8) & 255, c & 255];
  const summit = rgb(eastIzolTint(EAST_IZOL_PRESENCES[1].x, EAST_IZOL_PRESENCES[1].z - 20, null));
  assert.ok(summit[2] >= summit[1] - 12 && summit[0] < summit[2] + 12, `the eastern Presence's north face is ${summit}`);
  // At the West Izol line the colour is the swatch it was given.
  const e = EAST_IZOL_LINE[4], [x, z] = along(e, e.length / 2);
  assert.equal(eastIzolTint(x - e.nx * .01, z - e.nz * .01, '#a4a363') >> 2, 0xa4a363 >> 2);
  // The shore: stone on the cliffs, shingle in a shingle cove, the world's sand in the bays.
  let stone = 0;
  for (const [px, pz] of lattice(2)) {
    const d = landDistance(px, pz);
    if (d < 0 || d > 3) continue;
    const answer = shoreTintOf('east-izol', px, pz, d);
    if (regionAt(px, pz)?.name !== EAST_IZOL) { assert.equal(answer, null); continue; }
    if (answer?.rock > .9) stone++;
  }
  assert.ok(stone > 200, `${stone} samples of stone on the cliffs`);
  const shingle = EAST_IZOL_COVES.find(c => c.shingle);
  assert.equal(eastIzolShoreTint(shingle.x + shingle.inland.x * 3, shingle.z + shingle.inland.z * 3, 2).stone, I.EAST_IZOL_GROUND.shingle);
  assert.equal(eastIzolShoreTint(799, 1674, 2), null, 'the east bay is sand');
  // The cover the scenery reads is the same design.
  const fold = eastIzolCover(680, 1700), height = eastIzolCover(EAST_IZOL_PRESENCES[1].x + 20, EAST_IZOL_PRESENCES[1].z + 20);
  assert.ok(fold.fold > .3 && height.rock > .5, 'the folds and the faces are what they are');
  // The tint reaches the screen: the fold is drawn in its own colour, not the blend's swatches.
  const painted = new THREE.Color(), swatch = new THREE.Color();
  groundTint(painted, 680, 1700, THREE);
  let r = 0, g = 0, b = 0, total = 0;
  for (const [name, weight] of Object.entries(terrainMix(680, 1700).grounds)) { if (!weight) continue; swatch.set(name); r += swatch.r * weight; g += swatch.g * weight; b += swatch.b * weight; total += weight; }
  assert.ok(Math.hypot(painted.r - r / total, painted.g - g / total, painted.b - b / total) > .02, 'the fold is drawn as the bare swatch');
});

test('landmarks, trails, views and arrival: natural places on dry ground, walker’s views at a walker’s eye, and nothing anybody owns', () => {
  for (const p of [EAST_IZOL_ARRIVAL, ...EAST_IZOL_LANDMARKS]) {
    assert.ok(eastIzolOwns(p.x, p.z), p.id ?? 'arrival');
    assert.ok(landDistance(p.x, p.z) > 0 && H(p.x, p.z) > WATERLINE + .5, `${p.id ?? 'arrival'} is dry`);
    assert.ok(face(p.x, p.z) < .6, `${p.id ?? 'arrival'} stands on a slope`);
  }
  for (const p of EAST_IZOL_LANDMARKS) {
    assert.equal(p.region, REGION_IDS[EAST_IZOL]);
    assert.ok(p.description.length > 60, `${p.id} has discovery text`);
    assert.doesNotMatch(`${p.name} ${p.description}`, /merrath|shrine|temple|town|village|farm|quay|harbour|house|hearthstone/i, p.id);
  }
  // No named area swallows another's centre (the chart's rule, tests/map-fog.test.js).
  for (const a of EAST_IZOL_LANDMARKS) for (const b of EAST_IZOL_LANDMARKS) if (a !== b)
    assert.ok(Math.hypot(a.x - b.x, a.z - b.z) > Math.max(28, a.radius ?? 40, b.radius ?? 40), `${a.id} and ${b.id}`);
  const ids = Object.keys(EAST_IZOL_VIEWS);
  assert.ok(ids.includes('east-izol') && ids.includes('east-izol-wildlife'));
  let walks = 0;
  for (const [id, v] of Object.entries(EAST_IZOL_VIEWS)) {
    assert.match(id, /^east-izol/);
    for (const p of [v.eye, v.target]) assert.ok([p.x, p.y, p.z].every(Number.isFinite));
    const over = v.eye.y - H(v.eye.x, v.eye.z);
    if (v.walk) { walks++; assert.ok(Math.abs(over - 1.8) < .02, `${id}'s eye is ${over.toFixed(2)} m over the ground`); }
    else assert.ok(over > 1.5, `${id} is above the ground`);
  }
  assert.ok(walks >= 4, `${walks} walker's views`);
});

// ---------------------------------------------------------------------------
// The built island
// ---------------------------------------------------------------------------
let scoped = null;
const island = () => scoped ??= (async () => { const scene = new THREE.Scene(); return { scene, world: await scopedWorld(scene, [REGION_IDS[EAST_IZOL], REGION_IDS['West Izol']]) }; })();

test('built: the props are gone from West Izol’s skyline, and the island can be walked where its ways say', async () => {
  const { scene, world } = await island();
  const props = [];
  scene.traverse(o => { if (/^Presence \d$/.test(o.name)) props.push(o.name); });
  assert.deepEqual(props, [], 'the skyline props are still drawn over the ground that carries the Presences');
  for (const p of [EAST_IZOL_ARRIVAL, ...EAST_IZOL_LANDMARKS]) {
    assert.ok(canStand(p.x, p.z, world, .4), `${p.id ?? 'arrival'} has clear footing`);
    assert.equal(world.regionAt(p.x, p.z).name, EAST_IZOL);
  }
  assert.ok(canStand(HEARTH_ROAD_END.x, HEARTH_ROAD_END.z, world, .4), 'the Hearth Road ends on open ground');
  // Every trail, both ways, by the traveler's own movement and the climbing country's rule.
  for (const trail of EAST_IZOL_TRAILS) for (const points of [trail.points, [...trail.points].reverse()]) {
    const at = { ...points[0], y: world.heightAt(points[0].x, points[0].z) };
    for (const target of points.slice(1)) {
      const steps = Math.ceil(Math.hypot(target.x - at.x, target.z - at.z) / .3), dx = (target.x - at.x) / steps, dz = (target.z - at.z) / steps;
      for (let s = 0; s < steps; s++) {
        moveCharacter(at, dx, dz, world, .4, { canTraverse: (x, z, nx, nz) => canWalkSlope(x, z, nx, nz, world) });
        at.y = world.heightAt(at.x, at.z);
      }
      assert.ok(Math.hypot(at.x - target.x, at.z - target.z) < .15, `${trail.id} is blocked short of ${target.x}, ${target.z} at ${at.x.toFixed(1)}, ${at.z.toFixed(1)}`);
    }
  }
});
