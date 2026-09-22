import * as THREE from '../vendor/three.module.js';
import { sourceModule } from '../tests/module-loader.js';
import { roadLengths, distanceAlongRoad } from '../src/mercenaries.js';
import { canStand } from '../src/game-state.js';
import { BODY } from '../src/bodies.js';
const { createWorld } = await sourceModule('../src/world.js');
const world = createWorld(new THREE.Scene());
const road = world.paths[0], lengths = roadLengths(road);
const total = lengths.at(-1);
console.log(`road: ${road.length} points, ${total.toFixed(0)} m`);
// Everything that stands on or near the road, by its distance along it.
const marks = [];
const add = (name, p) => { if (!p) return; const d = distanceAlongRoad(road, p, lengths);
  const at = pointAt(d); const off = Math.hypot(at.x - p.x, at.z - p.z);
  if (off < 55) marks.push({ name, d, off }); };
function pointAt(d) {
  for (let i = 1; i < lengths.length; i++) if (d <= lengths[i]) {
    const t = (d - lengths[i - 1]) / (lengths[i] - lengths[i - 1] || 1);
    return { x: road[i - 1].x + (road[i].x - road[i - 1].x) * t, z: road[i - 1].z + (road[i].z - road[i - 1].z) * t };
  }
  return road.at(-1);
}
for (const [id, p] of Object.entries(world.npcPositions)) add(`npc ${id}`, p);
for (const place of world.landmarks) add(`place ${place.name}`, place);
for (const [id, p] of Object.entries(world.journeySites ?? {})) add(`site ${id}`, p);
marks.sort((a, b) => a.d - b.d);
let prev = 0, best = null;
for (const m of marks) { if (m.d - prev > (best?.gap ?? 0)) best = { gap: m.d - prev, from: prev, to: m.d, after: m.name }; prev = m.d; }
console.log('marks along the road (distance, name, metres off the road):');
for (const m of marks) console.log(`  ${m.d.toFixed(0).padStart(5)}  ${m.name}  (${m.off.toFixed(0)} m off)`);
console.log('biggest empty stretch:', JSON.stringify(best));
for (const d of [best.from + best.gap * .5]) {
  const p = pointAt(d);
  console.log(`midpoint at ${d.toFixed(0)} m: (${p.x.toFixed(1)}, ${p.z.toFixed(1)}) region ${world.regionAt(p.x, p.z)?.name}, standable ${canStand(p.x, p.z, world, BODY.person)}`);
}
