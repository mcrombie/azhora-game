import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { scopedWorld } from './scoped-world.js';
import { canStand } from '../src/gameplay/movement/game-state.js';
import { canWalkSlope } from '../src/gameplay/movement/climbing.js';
import { REGION_IDS, hexOwnerAt } from '../src/world/terrain/region-world.js';
import {
  TELEMONIA, KETHORN, KETHORN_WALL, TERRACES, INNER, kethornFrame, kethornPoint, onKethornTop, topOutside, kethornTopLevel,
  kethornLift, washAt, washWeight, passAt, onPassFloor, wayAt, onWayFloor, stairDistance, plainDistance, telemoniaPlace,
} from '../src/content/regions/telemonia/telemonia-world.js';
import {
  KETHORN_BUILDINGS, KETHORN_STREET, ALONG, ACROSS, HAMLETS, HUTS, HUT, PENS, PEN, FIELDS, TELEMONIA_TOWN_SITES, TOWN_SITE_LIST,
  fieldAt, sownAt, vineCourseLine, buildingOutside, onKethornStreet, buildingColliders, hutColliders, penColliders, penOutside, hutOutside,
} from '../src/content/regions/telemonia/telemonia-town.js';

/**
 * Telemonia, stage 2: Kethorn on its rock, the fields on the Galmeth, the vine on the terraces, the field
 * people's huts and the folds (src/content/regions/telemonia/telemonia-town.js, src/content/regions/telemonia/telemonia-town-scenery.js). The user: "their main
 * city in the center should be well fortified naturally and by walls and there should be helot-like slave
 * worked farmland surrounding it".
 *
 * The plan is held first, on its own numbers; then on Telemonia built alone (`scopedWorld`), with the game's
 * own `canStand` and `canWalkSlope` over a lattice a metre apart: the colliders are in the world, the street
 * from the gate to the king's hall is walked, and every site the people are stood at can be stood on and
 * walked away from.
 */
const footprint = b => {
  const out = [];
  if (b.round) { for (let a = 0; a < Math.PI * 2; a += .1) out.push({ x: b.x + Math.cos(a) * b.radius, z: b.z + Math.sin(a) * b.radius }); return out; }
  for (let s = -1; s <= 1.001; s += .1) for (const t of [-1, 1]) for (const [a, c] of [[s, t], [t, s]])
    out.push({ x: b.x + ALONG.x * a * b.along / 2 + ACROSS.x * c * b.across / 2, z: b.z + ALONG.z * a * b.along / 2 + ACROSS.z * c * b.across / 2 });
  return out;
};
const halls = KETHORN_BUILDINGS.filter(b => b.kind === 'band-hall' || b.kind === 'king-hall');
const king = KETHORN_BUILDINGS.find(b => b.kind === 'king-hall');
const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
/** The Galmeth's box, with the terrace belt round it. */
const BOX = { minX: -2300, maxX: -1850, minZ: 1050, maxZ: 1432 };

// ---------------------------------------------------------------------------
// The plan
// ---------------------------------------------------------------------------
test('Kethorn: the halls of the bands, the granaries, the cisterns and the king’s hall - and nothing else', () => {
  const tally = {};
  for (const b of KETHORN_BUILDINGS) tally[b.kind] = (tally[b.kind] ?? 0) + 1;
  assert.deepEqual(tally, { 'band-hall': 6, 'king-hall': 1, granary: 6, cistern: 2 });
  // "There is no inn, no foreign quarter, and no watch"; no market, temple or gatehouse either.
  for (const b of KETHORN_BUILDINGS) assert.ok(!/inn|market|temple|gate|quarter|watch|shrine/i.test(`${b.id} ${b.name}`), b.id);
  // Long on the rock's grain: every band hall is longer along it than across it.
  for (const b of halls.filter(h => h.kind === 'band-hall')) assert.ok(b.along > b.across * 1.3 && b.yaw === KETHORN_BUILDINGS[0].yaw, b.id);
  // No two buildings touch: a metre and a half between any two.
  for (const a of KETHORN_BUILDINGS) for (const b of KETHORN_BUILDINGS) {
    if (a === b) continue;
    for (const p of footprint(a)) assert.ok(buildingOutside(b, p.x, p.z) > 1.4, `${a.id} touches ${b.id}`);
  }
});

test('every building stands on the rock’s top, inside the wall, three metres back from the lip', () => {
  for (const b of KETHORN_BUILDINGS) {
    for (const p of footprint(b)) {
      assert.ok(onKethornTop(p.x, p.z, 3), `${b.id} at ${p.x.toFixed(1)}, ${p.z.toFixed(1)}: ${(-topOutside(p.x, p.z)).toFixed(1)} m from the lip`);
      assert.ok(kethornFrame(p.x, p.z).u < KETHORN.neck - 3, `${b.id} is at the wall`);
      assert.equal(hexOwnerAt(p.x, p.z), TELEMONIA);
    }
    // And on the rock's own level: its floor varies by little more than a metre under it.
    const levels = footprint(b).map(p => kethornTopLevel(p.x, p.z));
    assert.ok(Math.max(...levels) - Math.min(...levels) < 1.3, `${b.id} stands over ${(Math.max(...levels) - Math.min(...levels)).toFixed(2)} m of fall`);
  }
});

test('the king’s hall: at the north-eastern end, the highest and the furthest from the gate, built like the rest', () => {
  const gate = KETHORN_WALL.gate.centre;
  for (const b of KETHORN_BUILDINGS.filter(one => one !== king)) {
    assert.ok(king.u < b.u, `${b.id} is further along than the king’s hall`);
    assert.ok(gap(king, gate) > gap(b, gate), `${b.id} is further from the gate`);
  }
  // On the highest ground of the top: within a few tens of centimetres of the top's highest level.
  let highest = -Infinity;
  for (let u = -60; u < 40; u += 1) for (let v = -32; v <= 32; v += 1) { const p = kethornPoint(u, v); if (onKethornTop(p.x, p.z)) highest = Math.max(highest, kethornTopLevel(p.x, p.z)); }
  const floor = Math.min(...footprint(king).map(p => kethornTopLevel(p.x, p.z)));
  assert.ok(floor > highest - .8, `the king’s hall stands at ${floor.toFixed(2)}, the top’s highest is ${highest.toFixed(2)}`);
  for (const b of halls.filter(h => h !== king)) assert.ok(floor > Math.min(...footprint(b).map(p => kethornTopLevel(p.x, p.z))), `${b.id} stands as high`);
  // "Distinguishable from the others mainly by where it stands": a band hall's floor, give or take a fifth; its height.
  const area = b => b.along * b.across, band = halls.filter(h => h.kind === 'band-hall').map(area);
  assert.ok(area(king) <= Math.max(...band) * 1.2 && king.height === halls[0].height);
  // Across the head of the street.
  assert.ok(king.turned && king.u + king.along / 2 < KETHORN_STREET.to + 2 && Math.abs(king.v) - king.across / 2 < -KETHORN_STREET.half);
});

test('the street from the gate to the king’s hall is kept clear', () => {
  assert.ok(KETHORN_STREET.from > 30 && KETHORN_STREET.from < KETHORN.neck && KETHORN_STREET.to <= king.u + king.along / 2 + 1);
  for (let u = KETHORN_STREET.to; u <= KETHORN_STREET.from; u += .5) for (let v = -KETHORN_STREET.half; v <= KETHORN_STREET.half; v += .5) {
    const p = kethornPoint(u, v);
    assert.ok(onKethornTop(p.x, p.z), `the street leaves the top at u ${u}, v ${v}`);
    for (const b of KETHORN_BUILDINGS) assert.ok(buildingOutside(b, p.x, p.z) > .5, `${b.id} stands in the street at u ${u}, v ${v}`);
  }
  // And it runs on, inside the gate, to the gate itself.
  const inside = kethornFrame(KETHORN_WALL.inside.x, KETHORN_WALL.inside.z);
  assert.ok(inside.u < KETHORN_STREET.from && Math.abs(inside.v) < 1 && onKethornStreet(KETHORN_WALL.inside.x, KETHORN_WALL.inside.z));
});

test('the fields: the Galmeth farmed to its edges, and nothing in a wash, on a pass, on the way, on a stair or on the rock', () => {
  let field = 0, sown = 0, open = 0, barley = 0, pulses = 0;
  const bad = [];
  for (let x = BOX.minX; x <= BOX.maxX; x += 1) for (let z = BOX.minZ; z <= BOX.maxZ; z += 1) {
    const pd = plainDistance(x, z);
    if (pd > 0) continue;
    const w = washAt(x, z), p = passAt(x, z), way = wayAt(x, z);
    const clear = !(w && w.distance < w.wash.half) && !(p && p.distance < p.half) && kethornLift(x, z) < .02 && !(way && way.distance < way.half + 1);
    if (clear && hexOwnerAt(x, z) === TELEMONIA) open++;
    const f = fieldAt(x, z);
    if (!f) continue;
    field++;
    if (f.crop === 'barley') barley++; if (f.crop === 'pulses') pulses++;
    if (f.crop !== 'fallow') sown++;
    if (washWeight(x, z) > 0 || (w && w.distance < w.wash.half + 1)) bad.push(`wash ${x},${z}`);
    if (onPassFloor(x, z) > 0 || (p && p.distance < p.half + 2)) bad.push(`pass ${x},${z}`);
    if (onWayFloor(x, z) > 0 || (way && way.distance < way.half + 2)) bad.push(`way ${x},${z}`);
    if (kethornLift(x, z) > 0) bad.push(`rock ${x},${z}`);
    if (pd > -1) bad.push(`edge ${x},${z}`);
    if (pd > -FIELDS.stairLane + .5 && stairDistance(x, z) < TERRACES.stairHalf + 1) bad.push(`stair foot ${x},${z}`);
    if (onKethornTop(x, z, -2)) bad.push(`top ${x},${z}`);
    for (const hut of HUTS) if (hutOutside(hut, x, z) < 2) bad.push(`hut ${x},${z}`);
    for (const pen of PENS) if (penOutside(pen, x, z) < 2) bad.push(`pen ${x},${z}`);
  }
  assert.deepEqual(bad.slice(0, 8), [], `${bad.length} m² of field where none should be`);
  // Farmed to its edges: well over half the open plain is in fields, and most of that is sown.
  assert.ok(field > open * .55 && sown > field * .7, `${field} m² of field (${sown} sown) of ${open} m² open`);
  assert.ok(barley > pulses && pulses > field * .15, `${barley} m² of barley, ${pulses} of pulses`);
  assert.equal(sownAt(KETHORN.x, KETHORN.z), false);
});

test('the vine: a row along the terraces’ treads, off every stair, pass, gully, wash and the way', () => {
  let points = 0;
  const bad = [];
  for (let x = BOX.minX; x <= BOX.maxX; x += 1) for (let z = BOX.minZ; z <= BOX.maxZ; z += 1) {
    const pd = plainDistance(x, z);
    if (pd < -1 || pd > INNER.terraceWidth + 1) continue;
    if (vineCourseLine(x, z) === null) continue;
    points++;
    if (!telemoniaPlace(x, z)?.terraced) bad.push(`off the belt ${x},${z}`);
    if (stairDistance(x, z) < TERRACES.stairHalf + 1) bad.push(`stair ${x},${z}`);
    if (onPassFloor(x, z) > 0) bad.push(`pass ${x},${z}`);
    if (onWayFloor(x, z) > 0) bad.push(`way ${x},${z}`);
    if (washWeight(x, z) > 0) bad.push(`wash ${x},${z}`);
  }
  assert.deepEqual(bad.slice(0, 8), [], `${bad.length} m² of vine where none should be`);
  assert.ok(points > 15000, `${points} m² of the belt carry the vine`);
});

test('the field people’s huts and the folds: low, at the plain’s edge, off the washes, the stairs, the passes and the way', () => {
  assert.equal(HAMLETS.length, 4);
  assert.ok(HUTS.length >= 10 && HUTS.length <= 16, `${HUTS.length} huts`);
  assert.ok(HUT.eaves + HUT.roof < 2.4, 'a hut is low');
  assert.equal(PENS.length, 2);
  assert.deepEqual(PENS.map(p => p.kind), ['cattle', 'horse']);
  assert.ok(PEN.wall > 1.1 && PEN.wall < 1.6);
  const things = [...HUTS.map(hut => ({ id: hut.id, outside: (x, z) => hutOutside(hut, x, z), at: hut, reach: 4 })),
    ...PENS.map(pen => ({ id: pen.id, outside: (x, z) => penOutside(pen, x, z), at: pen, reach: 12 }))];
  for (const t of things) {
    // At the plain's edge: within twenty metres of it, and all of it on the plain.
    assert.ok(plainDistance(t.at.x, t.at.z) > -20, `${t.id} is out in the plain`);
    for (let dx = -t.reach; dx <= t.reach; dx += .5) for (let dz = -t.reach; dz <= t.reach; dz += .5) {
      const x = t.at.x + dx, z = t.at.z + dz;
      if (t.outside(x, z) > 1) continue;
      assert.ok(plainDistance(x, z) < -1, `${t.id} reaches the terraces`);
      const w = washAt(x, z), p = passAt(x, z), way = wayAt(x, z);
      assert.ok(!(w && w.distance < w.wash.half + 4), `${t.id} is on a wash’s bank`);
      assert.ok(!(p && p.distance < p.half + 4), `${t.id} is on a pass’s floor`);
      assert.ok(!(way && way.distance < way.half + 4), `${t.id} is on the way`);
      assert.ok(stairDistance(x, z) > TERRACES.stairHalf + 1, `${t.id} stands at a stair’s foot`);
      assert.equal(kethornLift(x, z), 0, `${t.id} is on the rock’s apron`);
    }
  }
  // The folds are near the ground their beasts graze, and apart from the huts.
  for (const pen of PENS) for (const hut of HUTS) assert.ok(gap(pen, hut) > 18, `${pen.id} is among the huts`);
});

test('the sites: every list named, every id once, every site in the country and on its own ground', () => {
  assert.deepEqual(Object.keys(TELEMONIA_TOWN_SITES), ['hallDoors', 'gate', 'cisterns', 'granaries', 'plainWork', 'terraceWork', 'hutDoors', 'pens']);
  assert.equal(TELEMONIA_TOWN_SITES.hallDoors.length, 7);
  assert.deepEqual(TELEMONIA_TOWN_SITES.gate.map(s => s.id), ['kethorn-gate-inside', 'kethorn-gate-outside']);
  assert.equal(TELEMONIA_TOWN_SITES.cisterns.length, 2);
  assert.ok(TELEMONIA_TOWN_SITES.plainWork.length >= 20 && TELEMONIA_TOWN_SITES.terraceWork.length >= 8);
  assert.equal(TELEMONIA_TOWN_SITES.hutDoors.length, HUTS.length);
  assert.equal(TELEMONIA_TOWN_SITES.pens.length, 2);
  assert.equal(new Set(TOWN_SITE_LIST.map(s => s.id)).size, TOWN_SITE_LIST.length);
  assert.ok(Object.isFrozen(TELEMONIA_TOWN_SITES) && Object.values(TELEMONIA_TOWN_SITES).every(list => Object.isFrozen(list) && list.every(Object.isFrozen)));
  for (const s of TOWN_SITE_LIST) {
    assert.ok(Number.isFinite(s.x) && Number.isFinite(s.z) && typeof s.kind === 'string', s.id);
    assert.equal(hexOwnerAt(s.x, s.z), TELEMONIA, s.id);
    assert.ok(washWeight(s.x, s.z) === 0, `${s.id} is in a wash`);
  }
  for (const s of [...TELEMONIA_TOWN_SITES.hallDoors, ...TELEMONIA_TOWN_SITES.cisterns, ...TELEMONIA_TOWN_SITES.granaries, TELEMONIA_TOWN_SITES.gate[0]])
    assert.ok(onKethornTop(s.x, s.z, 1.5), `${s.id} is not on the top`);
  for (const s of TELEMONIA_TOWN_SITES.plainWork) assert.ok(sownAt(s.x, s.z) && ['barley', 'pulses'].includes(s.crop), s.id);
  for (const s of TELEMONIA_TOWN_SITES.terraceWork) assert.ok(telemoniaPlace(s.x, s.z)?.terraced && plainDistance(s.x, s.z) > 1, s.id);
  for (const s of TELEMONIA_TOWN_SITES.pens) assert.ok(penOutside(PENS.find(p => p.id === s.id), s.x, s.z) < -3 && penOutside(PENS.find(p => p.id === s.id), s.mouth.x, s.mouth.z) > 1, s.id);
});

// ---------------------------------------------------------------------------
// Built: Telemonia alone
// ---------------------------------------------------------------------------
const scene = new THREE.Scene();
const world = await scopedWorld(scene, [REGION_IDS[TELEMONIA]]);
const RADIUS = .34;

/**
 * A lattice a metre apart over the Galmeth, its belt and the rock, judged by the game's own rules - as the
 * country's own test judges the whole country (tests/telemonia-world.test.js): `canStand` with every collider
 * the world holds, and `canWalkSlope` for every step up.
 */
const LAT = (() => {
  const step = 1, B = BOX;
  const cols = Math.floor((B.maxX - B.minX) / step) + 1, rows = Math.floor((B.maxZ - B.minZ) / step) + 1;
  const h = new Float32Array(cols * rows), stand = new Uint8Array(cols * rows);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x = B.minX + i * step, z = B.minZ + j * step, k = j * cols + i;
    h[k] = world.heightAt(x, z);
    stand[k] = plainDistance(x, z) < INNER.terraceWidth + 1 && hexOwnerAt(x, z) === TELEMONIA && canStand(x, z, world, RADIUS) ? 1 : 0;
  }
  const heightAt = (x, z) => {
    const fx = (x - B.minX) / step, fz = (z - B.minZ) / step, i = Math.max(0, Math.min(cols - 2, Math.floor(fx))), j = Math.max(0, Math.min(rows - 2, Math.floor(fz)));
    const u = fx - i, v = fz - j, k = j * cols + i;
    return (h[k] * (1 - u) + h[k + 1] * u) * (1 - v) + (h[k + cols] * (1 - u) + h[k + cols + 1] * u) * v;
  };
  const climbWorld = { heightAt, regionAt: world.regionAt };
  const at = k => ({ x: B.minX + (k % cols) * step, z: B.minZ + Math.floor(k / cols) * step });
  const index = (x, z) => Math.round((z - B.minZ) / step) * cols + Math.round((x - B.minX) / step);
  const neighbours = k => {
    const i = k % cols, out = [];
    if (i > 0) out.push(k - 1); if (i < cols - 1) out.push(k + 1);
    if (k >= cols) out.push(k - cols); if (k < cols * (rows - 1)) out.push(k + cols);
    return out;
  };
  const walk = (a, b) => { const p = at(a), q = at(b); return canWalkSlope(p.x, p.z, q.x, q.z, climbWorld); };
  /** Everywhere a walker gets to from `seeds` (`back`: everywhere a walker gets to `seeds` from). */
  const flood = (seeds, { back = false, keep = () => true } = {}) => {
    const seen = new Uint8Array(cols * rows), queue = new Int32Array(cols * rows);
    let tail = 0;
    for (const k of seeds) if (stand[k] && !seen[k]) { seen[k] = 1; queue[tail++] = k; }
    for (let head = 0; head < tail; head++) {
      const k = queue[head];
      for (const n of neighbours(k)) {
        if (seen[n] || !stand[n] || !keep(n)) continue;
        if (back ? walk(n, k) : walk(k, n)) { seen[n] = 1; queue[tail++] = n; }
      }
    }
    return seen;
  };
  /** The lattice points within `reach` of a point that can be stood on. */
  const around = (x, z, reach = 1.1) => {
    const out = [];
    for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
      const k = index(x + dx, z + dz), p = at(k);
      if (stand[k] && Math.hypot(p.x - x, p.z - z) <= reach) out.push(k);
    }
    return out;
  };
  return { cols, rows, stand, at, index, flood, around };
})();
/** The travel button's landing, on the plain north-east of the rock: where the walking is measured from. */
const LANDING = { x: -2016, z: 1196 };
const FROM = LAT.flood(LAT.around(LANDING.x, LANDING.z)), TO = LAT.flood(LAT.around(LANDING.x, LANDING.z), { back: true });

test('built: the colliders of every building, hut and fold are in the world, and nothing walks through a wall', () => {
  const byBuilding = new Map();
  for (const c of world.colliders) if (c.building) byBuilding.set(c.building, (byBuilding.get(c.building) ?? 0) + 1);
  for (const b of KETHORN_BUILDINGS) {
    assert.equal(byBuilding.get(b.id), buildingColliders(b).length, `${b.id}’s colliders`);
    assert.equal(canStand(b.x, b.z, world, RADIUS), false, `${b.id} can be stood in`);
  }
  for (const hut of HUTS) { assert.equal(byBuilding.get(hut.id), hutColliders(hut).length, hut.id); assert.equal(canStand(hut.x, hut.z, world, RADIUS), false, hut.id); }
  for (const pen of PENS) {
    assert.equal(byBuilding.get(pen.id), penColliders(pen).length, pen.id);
    // Its walls stop a body; its middle and its gateway do not.
    const fx = Math.sin(pen.yaw), fz = Math.cos(pen.yaw);
    assert.equal(canStand(pen.x - fx * pen.deep / 2, pen.z - fz * pen.deep / 2, world, RADIUS), false, `${pen.id}’s back wall`);
    assert.ok(canStand(pen.x + fx * pen.deep / 2, pen.z + fz * pen.deep / 2, world, RADIUS), `${pen.id}’s gateway`);
  }
  // Every one of them in the country and on the colliders' own kinds; none in a wash.
  const kinds = new Set();
  for (const c of world.colliders) {
    if (!['kethorn-hall', 'kethorn-granary', 'kethorn-cistern', 'telemonia-hut', 'telemonia-pen'].includes(c.kind)) continue;
    kinds.add(c.kind);
    assert.equal(hexOwnerAt(c.x, c.z), TELEMONIA);
    assert.equal(washWeight(c.x, c.z), 0, `a ${c.kind} collider in a wash at ${c.x.toFixed(1)}, ${c.z.toFixed(1)}`);
    if (c.kind.startsWith('kethorn')) assert.ok(onKethornTop(c.x, c.z, 2.5), `a ${c.kind} collider off the top at ${c.x.toFixed(1)}, ${c.z.toFixed(1)}`);
  }
  assert.equal(kinds.size, 5);
  const m = world.telemoniaTownMetrics;
  assert.ok(m.buildings === KETHORN_BUILDINGS.length && m.bandHalls === 6 && m.kingHall === 1 && m.huts === HUTS.length && m.pens === 2, JSON.stringify(m));
  assert.ok(m.barleyRows > 500 && m.pulseRows > 200 && m.vines > 2000, JSON.stringify(m));
  // Drawn as instances: the rows and the vine.
  const names = new Set(); scene.traverse(o => { if (o.isInstancedMesh) names.add(o.name); });
  for (const name of ['Galmeth barley', 'Galmeth pulses', 'Terrace vines']) assert.ok(names.has(name), name);
});

test('built: the way from the gate to the king’s hall is walked, and the rock is still reached only by the gate', () => {
  // From outside the gate on the spur, keeping to the rock: through the gate, up the street, to the king's door.
  const onRock = k => { const p = LAT.at(k); return kethornLift(p.x, p.z) > 8; };
  const out = KETHORN_WALL.outside, inside = KETHORN_WALL.inside;
  const reached = LAT.flood(LAT.around(out.x, out.z), { keep: onRock });
  for (const s of [inside, ...TELEMONIA_TOWN_SITES.hallDoors, ...TELEMONIA_TOWN_SITES.cisterns])
    assert.ok(LAT.around(s.x, s.z).some(k => reached[k]), `${s.id ?? 'inside the gate'} is not walked to from the gate`);
  // Every metre of the street down its middle and both its sides is stood on.
  for (let u = KETHORN_STREET.to; u <= KETHORN_STREET.from; u += 1) for (const v of [-KETHORN_STREET.half + .6, 0, KETHORN_STREET.half - .6]) {
    const p = kethornPoint(u, v);
    assert.ok(canStand(p.x, p.z, world, RADIUS), `the street is blocked at u ${u}, v ${v}`);
  }
  // From the plain, the top is reached, and only through the gate: with the gate's own cells refused, none of it.
  const gate = KETHORN_WALL.gate.centre;
  const shut = LAT.flood(LAT.around(LANDING.x, LANDING.z), { keep: k => gap(LAT.at(k), gate) > 4 });
  let top = 0, topShut = 0;
  for (let k = 0; k < LAT.cols * LAT.rows; k++) { const p = LAT.at(k); if (!onKethornTop(p.x, p.z, 1)) continue; if (FROM[k]) top++; if (shut[k]) topShut++; }
  assert.ok(top > 2000, `${top} m² of the top walked onto`);
  assert.equal(topShut, 0, `${topShut} m² of the top walked onto without the gate`);
});

test('built: every site is stood on, reached from the plain and walked away from', () => {
  const lost = [];
  for (const s of TOWN_SITE_LIST) {
    if (!canStand(s.x, s.z, world, RADIUS)) { lost.push(`${s.id}: cannot be stood on`); continue; }
    const cells = LAT.around(s.x, s.z);
    if (!cells.some(k => FROM[k])) lost.push(`${s.id}: not reached from the plain`);
    if (!cells.some(k => TO[k])) lost.push(`${s.id}: not walked away from`);
  }
  for (const pen of TELEMONIA_TOWN_SITES.pens) {
    if (!canStand(pen.mouth.x, pen.mouth.z, world, RADIUS)) lost.push(`${pen.id}: its mouth is blocked`);
    if (!LAT.around(pen.mouth.x, pen.mouth.z).some(k => FROM[k] && TO[k])) lost.push(`${pen.id}: its mouth is not on the walked plain`);
  }
  assert.deepEqual(lost, []);
});
