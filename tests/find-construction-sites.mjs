// Scratch: ground for the traveler's house plot, the Tidehaven notice board, and four birdhouse posts in the wood.
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand } from '../src/game-state.js';
import { TROUPE_STOPS } from '../src/troupe.js';
import { BRANDY_YARD } from '../src/brandy.js';
import { KOOPWOOD, inKoopwood } from '../src/woodcutting.js';

const { createWorld } = await sourceModule('../src/world.js');
const { SPECIMEN_TREES } = await sourceModule('../src/drent-trees.js');
const world = createWorld(new THREE.Scene());
const segs = world.paths.flatMap(path => path.slice(1).map((b, i) => [path[i], b]));
const road = (x, z) => { let m = Infinity; for (const [a, b] of segs) { const dx = b.x - a.x, dz = b.z - a.z, l = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / l)); m = Math.min(m, Math.hypot(x - a.x - dx * t, z - a.z - dz * t)); } return m - 2.2; };
const avoid = [...Object.values(world.npcPositions), ...Object.values(world.storySites ?? {}), ...SPECIMEN_TREES, ...TROUPE_STOPS, BRANDY_YARD, KOOPWOOD, world.training,
  ...(world.firePits ?? []), ...(world.fishingSpots ?? []).map(s => s.stand ?? s), ...(world.repairBenches ?? []), ...(world.roadSigns ?? [])].filter(p => p && Number.isFinite(p.x));
const local = (c, yaw, lx, lz) => ({ x: c.x + lx * Math.cos(yaw) + lz * Math.sin(yaw), z: c.z - lx * Math.sin(yaw) + lz * Math.cos(yaw) });
function area(c, yaw, W, D) {
  const hs = []; let blocked = 0, total = 0;
  for (let lx = -W; lx <= W; lx += 1) for (let lz = -D; lz <= D; lz += 1) { const p = local(c, yaw, lx, lz); total++; if (!canStand(p.x, p.z, world, .35) || road(p.x, p.z) < 1 || world.heightAt(p.x, p.z) < .5 || inKoopwood(p.x, p.z, 3)) blocked++; else hs.push(world.heightAt(p.x, p.z)); }
  return { blocked, total, rise: hs.length ? Math.max(...hs) - Math.min(...hs) : 99 };
}
const centre = { x: +(process.argv[2] ?? -20), z: +(process.argv[3] ?? 29) }, plots = [], boards = [];
for (let r = 30; r <= 130; r += 3) for (let k = 0; k < 72; k++) {
  const a = k / 72 * Math.PI * 2, c = { x: centre.x + Math.cos(a) * r, z: centre.z + Math.sin(a) * r };
  if (world.regionAt(c.x, c.z)?.name !== 'Drent' || avoid.some(p => Math.hypot(p.x - c.x, p.z - c.z) < 12)) continue;
  for (let q = 0; q < 8; q++) {
    const yaw = q / 8 * Math.PI * 2, got = area(c, yaw, 6, 5);
    if (got.blocked === 0 && got.rise < 1.2) { const front = local(c, yaw, 0, 8); plots.push({ x: +c.x.toFixed(1), z: +c.z.toFixed(1), yaw: +yaw.toFixed(3), rise: +got.rise.toFixed(2), toRoad: +road(front.x, front.z).toFixed(1), r }); }
  }
}
plots.sort((a, b) => (a.toRoad + a.r / 10 + a.rise * 4) - (b.toRoad + b.r / 10 + b.rise * 4));
console.log('house plots', plots.length); console.log(plots.slice(0, 8).map(p => JSON.stringify(p)).join('\n'));
// The notice board: a spot on the village's main street, a step off the road, clear of everyone.
for (let x = -40; x <= 30; x += 1) for (let z = 15; z <= 50; z += 1) {
  const d = road(x, z);
  if (d < 1 || d > 3 || !canStand(x, z, world, .6) || avoid.some(p => Math.hypot(p.x - x, p.z - z) < 5)) continue;
  boards.push({ x, z, toRoad: +d.toFixed(1), fromCentre: +Math.hypot(x - centre.x, z - centre.z).toFixed(1) });
}
boards.sort((a, b) => a.fromCentre - b.fromCentre);
console.log('notice board spots', boards.length); console.log(boards.slice(0, 8).map(p => JSON.stringify(p)).join('\n'));
// Birdhouse posts: open ground in the wood west of the village, a little off the Greenway, each well apart.
const posts = [];
for (let x = -150; x <= -40; x += 2) for (let z = -40; z <= 90; z += 2) {
  if (posts.length >= 12) break;
  const d = road(x, z);
  if (d < 3 || d > 12 || !canStand(x, z, world, .9) || avoid.some(p => Math.hypot(p.x - x, p.z - z) < 8) || inKoopwood(x, z, 6)) continue;
  if (posts.some(p => Math.hypot(p.x - x, p.z - z) < 25)) continue;
  posts.push({ x, z, toRoad: +d.toFixed(1) });
}
console.log('birdhouse posts'); console.log(posts.map(p => JSON.stringify(p)).join('\n'));
