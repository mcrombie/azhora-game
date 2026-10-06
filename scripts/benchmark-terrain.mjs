import { createHash } from 'node:crypto';
import * as THREE from '../vendor/three.module.js';
const started = performance.now();
const { WORLD_BOUNDS, REGION_CELLS, terrainMix, seamlessTerrainMix } = await import('../src/world/terrain/region-world.js');
const { groundWithRiver, groundTint } = await import('../src/world/terrain/world-terrain.js');
const importMs = performance.now() - started;
const points = [];
for (let j = 0; j < 80; j++) for (let i = 0; i < 80; i++) points.push({
  x: WORLD_BOUNDS.minX + (WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX) * (i + .371) / 80,
  z: WORLD_BOUNDS.minZ + (WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ) * (j + .613) / 80,
});
for (const cells of Object.values(REGION_CELLS)) for (const cell of cells) {
  points.push({ x: cell.x, z: cell.z }, { x: cell.x + 48, z: cell.z + 26 });
}
const color = new THREE.Color(), heights = [], colors = [], mixes = [], seamless = [];
const measure = action => { const times = []; for (let run = 0; run < 3; run++) {
  const start = performance.now(); action(run === 2); times.push(performance.now() - start);
} return times; };
const mixMs = measure(save => { for (const p of points) { const mix = terrainMix(p.x, p.z);
  if (save) mixes.push(mix); } });
const heightTintMs = measure(save => { for (const p of points) {
  const height = groundWithRiver(p.x, p.z); groundTint(color, p.x, p.z, THREE);
  if (save) { heights.push(height); colors.push([color.r, color.g, color.b]); }
} });
for (const p of points) seamless.push(seamlessTerrainMix(p.x, p.z));
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
console.log(JSON.stringify({ samples: points.length, importMs, mixMs, heightTintMs,
  checksums: { mix: hash(mixes), seamless: hash(seamless), height: hash(heights), color: hash(colors) } }, null, 2));
