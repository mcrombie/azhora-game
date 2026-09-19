// Scratch: open, fairly level ground at the edge of the wood outside Tidehaven for the woodcutter's lot, clear of everyone and everything.
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand } from '../src/game-state.js';
import { TROUPE_STOPS } from '../src/troupe.js';
import { BRANDY_YARD } from '../src/brandy.js';

const { createWorld } = await sourceModule('../src/world.js');
const { SPECIMEN_TREES } = await sourceModule('../src/drent-trees.js');
const world = createWorld(new THREE.Scene());
const segs = world.paths.flatMap(path => path.slice(1).map((b, i) => [path[i], b]));
const road = (x, z) => { let m = Infinity; for (const [a, b] of segs) { const dx = b.x - a.x, dz = b.z - a.z, l = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / l)); m = Math.min(m, Math.hypot(x - a.x - dx * t, z - a.z - dz * t)); } return m - 2.2; };
const centre = { x: 5, z: 30 };
const avoid = [...Object.values(world.npcPositions), ...Object.values(world.storySites ?? {}), ...SPECIMEN_TREES, ...TROUPE_STOPS, BRANDY_YARD, world.training,
  ...(world.firePits ?? []), ...(world.fishingSpots ?? []).map(s => s.stand ?? s), ...(world.repairBenches ?? [])].filter(p => p && Number.isFinite(p.x));
const local = (c, yaw, lx, lz) => ({ x: c.x + lx * Math.cos(yaw) + lz * Math.sin(yaw), z: c.z - lx * Math.sin(yaw) + lz * Math.cos(yaw) });
const W = +(process.argv[2] ?? 15), D = +(process.argv[3] ?? 11);
const best = [];
for (let r = 50; r <= 190; r += 4) for (let k = 0; k < 72; k++) {
  const a = k / 72 * Math.PI * 2, c = { x: centre.x + Math.cos(a) * r, z: centre.z + Math.sin(a) * r };
  if (world.regionAt(c.x, c.z)?.name !== 'Drent' || avoid.some(p => Math.hypot(p.x - c.x, p.z - c.z) < W + 8)) continue;
  for (let q = 0; q < 8; q++) {
    const yaw = q / 8 * Math.PI * 2, hs = []; let blocked = 0, total = 0, wet = false;
    for (let lx = -W; lx <= W; lx += 1.5) for (let lz = -D; lz <= D; lz += 1.5) {
      const p = local(c, yaw, lx, lz); total++;
      const h = world.heightAt(p.x, p.z); if (h < .4) wet = true;
      if (!canStand(p.x, p.z, world, .35) || road(p.x, p.z) < 1) blocked++; else hs.push(h);
    }
    if (wet || blocked / total > .04) continue;
    const rise = Math.max(...hs) - Math.min(...hs), front = local(c, yaw, 0, D + 4), toRoad = road(front.x, front.z);
    if (rise < 3.5) best.push({ x: +c.x.toFixed(1), z: +c.z.toFixed(1), yaw: +yaw.toFixed(3), rise: +rise.toFixed(2), blocked, toRoad: +toRoad.toFixed(1), r });
  }
}
best.sort((a, b) => (a.toRoad + a.rise * 3 + a.r / 8) - (b.toRoad + b.rise * 3 + b.r / 8));
console.log(best.length, 'candidates');
console.log(best.slice(0, 12).map(b => JSON.stringify(b)).join('\n'));
