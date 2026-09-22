import * as THREE from '../vendor/three.module.js';
import { sourceModule } from '../tests/module-loader.js';
import { roadLengths } from '../src/mercenaries.js';
import { canStand } from '../src/game-state.js';
import { BODY } from '../src/bodies.js';
const { createWorld } = await sourceModule('../src/world.js');
const world = createWorld(new THREE.Scene());
const road = world.paths[0], lengths = roadLengths(road);
function pointAt(d) {
  for (let i = 1; i < lengths.length; i++) if (d <= lengths[i]) {
    const t = (d - lengths[i - 1]) / (lengths[i] - lengths[i - 1] || 1);
    const a = road[i - 1], b = road[i];
    const dx = (b.x - a.x) / (lengths[i] - lengths[i - 1] || 1), dz = (b.z - a.z) / (lengths[i] - lengths[i - 1] || 1);
    return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, dx, dz };
  }
  return { ...road.at(-1), dx: 0, dz: 1 };
}
for (const d of [500, 510, 515, 520, 525, 530, 540]) {
  const p = pointAt(d);
  const region = world.regionAt(p.x, p.z)?.name ?? 'open country';
  // How much standable ground is there either side of the road for men to stand in?
  const sides = [];
  for (const off of [-9, -6, -3, 3, 6, 9]) {
    const x = p.x + p.dz * off, z = p.z - p.dx * off;
    sides.push(canStand(x, z, world, BODY.person) ? '.' : '#');
  }
  console.log(`${d} m: (${p.x.toFixed(1)}, ${p.z.toFixed(1)}) ${region} road ${canStand(p.x,p.z,world,BODY.person)?'ok':'BLOCKED'} sides ${sides.join('')}`);
}
// And how far the nearest person of the trimmed cast stands from 520 m.
const p = pointAt(520);
let best = null;
for (const [id, s] of Object.entries(world.npcPositions)) {
  const gap = Math.hypot(s.x - p.x, s.z - p.z);
  if (!best || gap < best.gap) best = { id, gap };
}
console.log('nearest npc stand:', best.id, best.gap.toFixed(0), 'm');
