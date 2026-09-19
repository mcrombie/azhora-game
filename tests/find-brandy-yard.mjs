// Scratch: a level, open spot in Tidehaven for Brandy Frank's dye yard, clear of everyone and everything.
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand } from '../src/game-state.js';
import * as fights from '../src/opening-fights.js';

const { createWorld } = await sourceModule('../src/world.js');
const world = createWorld(new THREE.Scene());
const segs = world.paths.flatMap(path => path.slice(1).map((b, i) => [path[i], b]));
const road = (x, z) => { let m = Infinity; for (const [a, b] of segs) { const dx = b.x - a.x, dz = b.z - a.z, l = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / l)); m = Math.min(m, Math.hypot(x - a.x - dx * t, z - a.z - dz * t)); } return m - 2.2; };
const ids = ['harbormaster', 'fisher', 'acorn-cook', 'doomsayer', 'bird-watcher', 'peddler'];
const village = ids.map(id => world.npcPositions[id]).filter(Boolean);
const centre = { x: village.reduce((s, p) => s + p.x, 0) / village.length, z: village.reduce((s, p) => s + p.z, 0) / village.length };
console.log('village centre', centre.x.toFixed(1), centre.z.toFixed(1), village.length);
const avoid = [...Object.values(world.npcPositions), world.training, ...(world.firePits ?? []), world.birdGarden?.stand, world.birdGarden?.hook, ...(world.fishingSpots ?? []).map(s => s.stand ?? s),
  ...(world.repairBenches ?? []), ...Object.values(fights).filter(v => v && typeof v === 'object' && Number.isFinite(v.x)), ...Object.values(fights).flatMap(v => (v && typeof v === 'object' && v.centre) ? [v.centre] : [])].filter(p => p && Number.isFinite(p.x));
console.log('avoiding', avoid.length);
const local = (c, yaw, lx, lz) => ({ x: c.x + lx * Math.cos(yaw) + lz * Math.sin(yaw), z: c.z - lx * Math.sin(yaw) + lz * Math.cos(yaw) });
let best = [];
for (let r = 18; r <= 90; r += 3) for (let k = 0; k < 36; k++) {
  const a = k / 36 * Math.PI * 2, c = { x: centre.x + Math.cos(a) * r, z: centre.z + Math.sin(a) * r };
  if (world.regionAt(c.x, c.z)?.name !== 'Drent' || avoid.some(p => Math.hypot(p.x - c.x, p.z - c.z) < 11)) continue;
  for (let q = 0; q < 8; q++) {
    const yaw = q / 8 * Math.PI * 2, hs = []; let ok = true;
    for (let lx = -4.5; lx <= 4.5 && ok; lx += .6) for (let lz = -3.5; lz <= 5 && ok; lz += .6) {
      const p = local(c, yaw, lx, lz);
      if (!canStand(p.x, p.z, world, .35) || road(p.x, p.z) < 1.5) ok = false; else hs.push(world.heightAt(p.x, p.z));
    }
    if (!ok) continue;
    const rise = Math.max(...hs) - Math.min(...hs), front = local(c, yaw, 0, 6), toRoad = road(front.x, front.z);
    if (rise < .8) best.push({ x: +c.x.toFixed(1), z: +c.z.toFixed(1), yaw: +yaw.toFixed(3), rise: +rise.toFixed(2), toRoad: +toRoad.toFixed(1), r });
  }
}
best.sort((a, b) => (a.toRoad + a.r / 10) - (b.toRoad + b.r / 10));
console.log(best.slice(0, 6).map(b => JSON.stringify(b)).join('\n'));
