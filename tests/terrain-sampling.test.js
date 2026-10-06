import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { REGION_CELLS, REGION_TERRAIN, WORLD_BOUNDS, hexAt, hexCentre, terrainMix, seamlessTerrainMix } from '../src/world/terrain/region-world.js';
import { METRES_PER_HEX } from '../src/world/terrain/region-layout.js';
import { groundWithRiver, groundTint } from '../src/world/terrain/world-terrain.js';

const clamp = x => Math.max(0, Math.min(1, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const adjacent = [[0, 0], [1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
const complete = [...adjacent, [2, 0], [2, -1], [2, -2], [1, -2], [0, -2], [-1, -1], [-2, 0], [-2, 1], [-2, 2], [-1, 2], [0, 2], [1, 1]];
const names = Object.keys(REGION_TERRAIN), cells = new Map();
for (const [name, entries] of Object.entries(REGION_CELLS)) for (const cell of entries) cells.set(`${cell.q},${cell.r}`, { name, terrain: cell.terrain });
const suvals = ['West Suval', 'South Suval', 'East Suval'];
const suvalCells = suvals.flatMap(name => REGION_CELLS[name]), margin = METRES_PER_HEX * 1.28;
const suvalBox = { minX: Math.min(...suvalCells.map(c => c.x)) - margin, maxX: Math.max(...suvalCells.map(c => c.x)) + margin,
  minZ: Math.min(...suvalCells.map(c => c.z)) - margin, maxZ: Math.max(...suvalCells.map(c => c.z)) + margin };

// The original dense calculation is deliberately retained as an independent
// reference: zero weight keys, neighbour order and rounding are part of its output.
function originalBlend(x, z, offsets) {
  const home = hexAt(x, z), weights = Object.fromEntries(names.map(name => [name, 0])), grounds = {};
  let total = 0, base = 0, amp = 0, wave = 0;
  for (const [dq, dr] of offsets) {
    const q = home.q + dq, r = home.r + dr, centre = hexCentre(q, r);
    const weight = Math.max(0, 1 - Math.hypot(x - centre.x, z - centre.z) / (METRES_PER_HEX * 1.28));
    if (!weight) continue;
    const cell = cells.get(`${q},${r}`), name = cell?.name ?? 'outland';
    const terrain = REGION_TERRAIN[name].byTerrain?.[cell?.terrain] ?? REGION_TERRAIN[name];
    total += weight; base += terrain.base * weight; amp += terrain.amp * weight; wave += terrain.wave * weight;
    weights[name] += weight; grounds[terrain.ground] = (grounds[terrain.ground] ?? 0) + weight;
  }
  if (!total) return { base: REGION_TERRAIN.outland.base, amp: REGION_TERRAIN.outland.amp, wave: REGION_TERRAIN.outland.wave, weights, grounds };
  for (const name of names) weights[name] /= total;
  for (const ground of Object.keys(grounds)) grounds[ground] /= total;
  return { base: base / total, amp: amp / total, wave: wave / total, weights, grounds };
}
function originalMix(x, z) {
  const b = suvalBox;
  if (x <= b.minX || x >= b.maxX || z <= b.minZ || z >= b.maxZ) return originalBlend(x, z, adjacent);
  const all = originalBlend(x, z, complete), share = suvals.reduce((sum, name) => sum + (all.weights[name] ?? 0), 0);
  const amount = smooth(0, .3, share);
  if (amount >= 1) return all;
  const old = originalBlend(x, z, adjacent);
  if (amount <= 0) return old;
  const blendValues = (a, c) => Object.fromEntries([...new Set([...Object.keys(a), ...Object.keys(c)])]
    .map(key => [key, lerp(a[key] ?? 0, c[key] ?? 0, amount)]));
  return { base: lerp(old.base, all.base, amount), amp: lerp(old.amp, all.amp, amount), wave: lerp(old.wave, all.wave, amount),
    weights: blendValues(old.weights, all.weights), grounds: blendValues(old.grounds, all.grounds) };
}

test('terrain sampling retains exact dense-reference results across every authored hex and its boundaries', () => {
  const points = Object.values(REGION_CELLS).flat().flatMap(cell => [[cell.x, cell.z], [cell.x + 49, cell.z + 28], [cell.x - 51, cell.z - 29]]);
  points.push([WORLD_BOUNDS.minX - 300, WORLD_BOUNDS.minZ - 300], [WORLD_BOUNDS.maxX + 300, WORLD_BOUNDS.maxZ + 300]);
  for (const [x, z] of points) {
    assert.deepEqual(terrainMix(x, z), originalMix(x, z), `terrain at ${x},${z}`);
    assert.deepEqual(seamlessTerrainMix(x, z), originalBlend(x, z, complete), `seamless at ${x},${z}`);
  }
});

test('each terrain mix owns its complete weight map and cannot change a later sample', () => {
  for (const sample of [terrainMix, seamlessTerrainMix]) {
    const before = sample(0, 0), changed = sample(0, 0);
    assert.deepEqual(Object.keys(before.weights), names);
    for (const name of names) assert.ok(Number.isFinite(before.weights[name]));
    changed.weights.Drent = 123; delete changed.weights.Gala; changed.grounds.extra = 456;
    assert.deepEqual(sample(0, 0), before);
  }
});

// Captured before the allocation changes, including Suval blending, authored
// mountain ground, regional colour overrides and ordinary lowland ground.
const surfaceSamples = [
  [-778.2519279391273,15.875,5.551364524671561,0.09965805325355766,0.21627304693718688,0.05574685882096911],
  [-678.2519279391279,881.9004037844386,11.635437428707485,0.35158209138745755,0.36560066956035064,0.11690136619036025],
  [-128.25192793912757,1141.7080249197702,28.76083353321085,0.2668397963741704,0.31209238187236493,0.16201238685641328],
  [-178.2519279391273,708.6953230275509,12.568926863403746,0.29703298182258586,0.31392393430829846,0.21577324942748907],
  [-1528.2519279391274,1141.7080249197702,4.445412561648134,0.3915724777393922,0.3277780980458375,0.14412847084818123],
  [-1778.2519279391277,-1196.560565298214,15.32214573557987,0.1700530562443031,0.23176685493066254,0.062420076874296467],
  [-2578.251927939127,2960.361372867091,56.632589256114926,0.025510700585538258,0.038204371589236,0.018500220124016652],
  [-3228.2519279391277,-590.342782649107,75.65,0.12743768042608497,0.1878207722902346,0.1912016827303171],
  [-2578.251927939127,-330.53516151377545,16.284695701952668,0.4019777798219466,0.36625259558833256,0.13013647668074665],
  [1121.7480720608737,-3448.2266151377544,125.07749004716149,0.24620132669705552,0.25818285291079235,0.20507873637973145],
  [1571.748072060874,-3188.418994002423,48.945008750430226,0.13843161502267545,0.20863687013464577,0.09989872823822872],
];
test('terrain heights and colours retain their captured values when tint scratch space is reused', () => {
  const output = new THREE.Color(), saved = new THREE.Color(), otherNamespace = { ...THREE };
  groundTint(saved, surfaceSamples[0][0], surfaceSamples[0][1], THREE);
  for (const namespace of [THREE, otherNamespace, THREE]) for (const [x, z, height, r, g, b] of [...surfaceSamples].reverse()) {
    assert.equal(groundWithRiver(x, z), height);
    assert.equal(groundTint(output, x, z, namespace), output);
    assert.deepEqual([output.r, output.g, output.b], [r, g, b]);
    assert.deepEqual([saved.r, saved.g, saved.b], surfaceSamples[0].slice(3));
  }
});
