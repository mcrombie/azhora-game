// Scratch: find level, open camp spots for the players' wagon near an anchor in each region.
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand } from '../src/game-state.js';
import { FERNWAY_REST, LUMBER_TOWN, SOLIS_ROAD, regionLandmarks } from '../src/region-world.js';
import { RIMEHOLT } from '../src/pueth-world.js';
import { NEMMEL } from '../src/elagos-world.js';
import { OSTEL } from '../src/amod-world.js';
import { MOROS_WAYSIDE } from '../src/wayside.js';

const { createWorld } = await sourceModule('../src/world.js');
const world = createWorld(new THREE.Scene());
const segs = world.paths.flatMap(path => path.slice(1).map((b, i) => [path[i], b]));
const road = (x, z) => { let m = Infinity; for (const [a, b] of segs) { const dx = b.x - a.x, dz = b.z - a.z, l = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / l)); m = Math.min(m, Math.hypot(x - a.x - dx * t, z - a.z - dz * t)); } return m - 2.2; };
const avrel = regionLandmarks.find(l => l.id === 'sunmeadow');
const anchors = [
  ['avrel', 'Drent', avrel], ['fernway', 'Drent', FERNWAY_REST], ['lumber-town', 'Luscia', LUMBER_TOWN.square],
  ['moros', 'Moros Plain', MOROS_WAYSIDE[Math.floor(MOROS_WAYSIDE.length / 2)]], ['solis-road', 'West Suval', SOLIS_ROAD[Math.floor(SOLIS_ROAD.length * .6)]],
  ['rimeholt', 'Pueth', RIMEHOLT.square], ['nemmel', 'Elagos', NEMMEL], ['ostel', 'Amod', OSTEL.centre ?? OSTEL],
];
// In the wagon's frame: x along its length, +z toward its audience.
const local = (c, yaw, lx, lz) => ({ x: c.x + lx * Math.cos(yaw) + lz * Math.sin(yaw), z: c.z - lx * Math.sin(yaw) + lz * Math.cos(yaw) });
const homes = Object.values(world.npcPositions);
function score(c, yaw, region) {
  if (homes.some(h => Math.hypot(h.x - c.x, h.z - c.z) < 14)) return null;
  const pts = [];
  for (let lx = -2.6; lx <= 6.4; lx += .6) for (let lz = -1.6; lz <= 1.6; lz += .6) pts.push([lx, lz]);    // wagon and mare
  for (let lx = -3.4; lx <= 3.4; lx += .8) for (let lz = 2; lz <= 8; lz += .8) pts.push([lx, lz]);        // the audience
  const hs = [];
  for (const [lx, lz] of pts) {
    const p = local(c, yaw, lx, lz);
    if (!canStand(p.x, p.z, world, .35)) return null;
    if (world.regionAt(p.x, p.z)?.name !== region) return null;
    if (road(p.x, p.z) < 2.5) return null;
    hs.push(world.heightAt(p.x, p.z));
  }
  const rise = Math.max(...hs) - Math.min(...hs);
  if (rise > .9) return null;
  const front = local(c, yaw, 0, 5);
  return { rise, road: road(front.x, front.z) };
}
for (const [id, region, a] of anchors) {
  let best = null;
  for (let r = 14; r <= 70 && !best; r += 4) for (let k = 0; k < 24; k++) {
    const ang = k / 24 * Math.PI * 2, c = { x: a.x + Math.cos(ang) * r, z: a.z + Math.sin(ang) * r };
    for (let q = 0; q < 8; q++) {
      const yaw = q / 8 * Math.PI * 2, s = score(c, yaw, region);
      if (s && s.road < 14 && (!best || s.rise < best.rise)) best = { x: +c.x.toFixed(1), z: +c.z.toFixed(1), yaw: +yaw.toFixed(3), ...s, r };
    }
  }
  console.log(id, region, a && [a.x?.toFixed?.(1), a.z?.toFixed?.(1)], best ? JSON.stringify(best) : 'NONE');
}
