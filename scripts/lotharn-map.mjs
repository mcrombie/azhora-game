// A top-down picture of the East Lotharn's ground, for designing the peaks (src/content/regions/east-lotharn/east-lotharn-world.js):
// height as shade, ground above the selected hiking grade in red, climbs in brown, ramps yellow, ledge paths blue,
// peaks as white dots, a fifty-metre grid, and in green what a traveler can reach from the pass road
// under the authored hiking-route budget. Prints each summit and each way, reached or not. NORAMPS=1 closes the ways.
//   node scripts/lotharn-map.mjs [metres per pixel] [out.png] [climb limit] [minX,minZ,maxX,maxZ]
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from '../tests/module-loader.js';
import { hexOwnerAt } from '../src/world/terrain/region-world.js';
import { LOTHARN, LOTHARN_BOX, PEAKS, RAMPS, nearestOn } from '../src/content/regions/east-lotharn/east-lotharn-world.js';

const { createWorld } = await sourceModule('../src/world.js');
const world = createWorld(new THREE.Scene());
const g = world.groundHeight;
const scale = Number(process.argv[2] ?? 1.5), out = process.argv[3] ?? 'tests/artifacts/lotharn-map.png';
const sub = process.argv[5] ? process.argv[5].split(',').map(Number) : null;
const box = sub ? { minX: sub[0], minZ: sub[1], maxX: sub[2], maxZ: sub[3] } : LOTHARN_BOX, W = Math.ceil((box.maxX - box.minX) / scale), H = Math.ceil((box.maxZ - box.minZ) / scale);
const heights = new Float32Array(W * H);
let top = -Infinity, topAt = null;
for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
  const x = box.minX + i * scale, z = box.minZ + j * scale, h = g(x, z);
  heights[j * W + i] = h;
  if (h > top && hexOwnerAt(x, z) === LOTHARN) { top = h; topAt = [Math.round(x), Math.round(z)]; }
}
// Where the authored hiking-route budget can reach from the pass road (not the free-climbing limit): up no steeper than
// the limit, down anything, never through water deeper than wading.
const reach = new Uint8Array(W * H), queue = [];
const seed = (x, z) => { const i = Math.round((x - box.minX) / scale), j = Math.round((z - box.minZ) / scale); reach[j * W + i] = 1; queue.push(j * W + i); };
for (const [x, z] of [[-1128, -842], [-1090, -884], [-1062, -1000], [-1045, -900], [-1060, -940]]) if (x > box.minX && x < box.maxX && z > box.minZ && z < box.maxZ) seed(x, z);
const limit = Number(process.argv[4] ?? 1.19);
// With NORAMPS=1 the ramps are closed: a summit reached then is one that needs no ramp at all.
const closed = new Uint8Array(W * H);
if (process.env.NORAMPS) for (const ramp of RAMPS) for (let k = 0; k < W * H; k++) {
  const i = k % W, j = (k - i) / W, x = box.minX + i * scale, z = box.minZ + j * scale;
  if (x < ramp.line.bounds.minX - 5 || x > ramp.line.bounds.maxX + 5 || z < ramp.line.bounds.minZ - 5 || z > ramp.line.bounds.maxZ + 5) continue;
  if (nearestOn(ramp.line, x, z).distance < 4.2) closed[k] = 1;
}
while (queue.length) {
  const k = queue.pop(), i = k % W, j = (k - i) / W;
  for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const ii = i + a, jj = j + b; if (ii < 0 || jj < 0 || ii >= W || jj >= H) continue;
    const n = jj * W + ii; if (reach[n] || closed[n]) continue;
    if (hexOwnerAt(box.minX + ii * scale, box.minZ + jj * scale) !== LOTHARN) continue;
    const rise = heights[n] - heights[k], run = Math.hypot(a, b) * scale;
    if (rise / run > limit) continue;
    reach[n] = 1; queue.push(n);
  }
}
const pixels = Buffer.alloc(H * (W * 3 + 1));
const steepLimit = 1.19;
for (let j = 0; j < H; j++) {
  pixels[j * (W * 3 + 1)] = 0;
  for (let i = 0; i < W; i++) {
    const h = heights[j * W + i], x = box.minX + i * scale, z = box.minZ + j * scale;
    const hx = heights[j * W + Math.min(W - 1, i + 1)] - heights[j * W + Math.max(0, i - 1)];
    const hz = heights[Math.min(H - 1, j + 1) * W + i] - heights[Math.max(0, j - 1) * W + i];
    const grade = Math.hypot(hx, hz) / (2 * scale);
    let r, gg, b;
    const shade = Math.max(0, Math.min(1, h / 420));
    if (world.waterAt && world.waterAt(x, z) > h) { r = 40; gg = 80; b = 150; }
    else { r = gg = b = 40 + shade * 200; if (hexOwnerAt(x, z) !== LOTHARN) { r *= .7; gg *= .8; b *= .7; } }
    if (grade > steepLimit) { r = 200; gg = 40; b = 40; }
    else if (grade > .7) { r = Math.min(255, r + 60); gg = Math.min(255, gg + 30); }
    if (reach[j * W + i]) { gg = Math.min(255, gg + 70); r *= .75; b *= .75; }
    const o = j * (W * 3 + 1) + 1 + i * 3;
    pixels[o] = r; pixels[o + 1] = gg; pixels[o + 2] = b;
  }
}
const dot = (x, z, color, size = 2) => {
  const ci = Math.round((x - box.minX) / scale), cj = Math.round((z - box.minZ) / scale);
  for (let a = -size; a <= size; a++) for (let b = -size; b <= size; b++) {
    const i = ci + a, j = cj + b; if (i < 0 || j < 0 || i >= W || j >= H) continue;
    const o = j * (W * 3 + 1) + 1 + i * 3; pixels[o] = color[0]; pixels[o + 1] = color[1]; pixels[o + 2] = color[2];
  }
};
for (const ramp of RAMPS) for (const p of ramp.line.points) dot(p.x, p.z, ramp.kind === 'ledge' ? [80, 200, 255] : [250, 220, 40], 1);
// A fifty-metre grid, heavier every two hundred.
for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
  const x = box.minX + i * scale, z = box.minZ + j * scale;
  const onX = Math.abs(((x % 50) + 50) % 50) < scale, onZ = Math.abs(((z % 50) + 50) % 50) < scale;
  if (!onX && !onZ) continue;
  const heavy = (onX && Math.abs(((x % 200) + 200) % 200) < scale) || (onZ && Math.abs(((z % 200) + 200) % 200) < scale);
  const o = j * (W * 3 + 1) + 1 + i * 3; const k = heavy ? .45 : .75;
  pixels[o] *= k; pixels[o + 1] *= k; pixels[o + 2] *= k;
}
for (const peak of PEAKS) dot(peak.x, peak.z, [255, 255, 255], 3);
// The PNG.
const crcTable = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc = buf => { let c = -1; for (const byte of buf) c = crcTable[(c ^ byte) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2;
writeFileSync(out, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(pixels)), chunk('IEND', Buffer.alloc(0))]));
const summits = PEAKS.map(peak => { let best = -Infinity, got = false;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const x = box.minX + i * scale, z = box.minZ + j * scale;
    if (Math.hypot(x - peak.x, z - peak.z) > 30) continue; if (heights[j * W + i] > best) { best = heights[j * W + i]; got = !!reach[j * W + i]; } }
  let high = -Infinity; for (let k = 0; k < W * H; k++) if (reach[k]) { const i = k % W, j = (k - i) / W; if (Math.hypot(box.minX + i * scale - peak.x, box.minZ + j * scale - peak.z) < 140) high = Math.max(high, heights[k]); }
  return `${peak.id} ${best.toFixed(0)}m ${got ? 'REACHED' : 'not reached'} (highest reached nearby ${high.toFixed(0)})`; });
const at = (x, z) => { const i = Math.round((x - box.minX) / scale), j = Math.round((z - box.minZ) / scale); return i >= 0 && j >= 0 && i < W && j < H ? j * W + i : -1; };
for (const ramp of RAMPS) { const a = ramp.line.points[0], z = ramp.line.points.at(-1), ka = at(a.x, a.z), kz = at(z.x, z.z); if (ka < 0 || kz < 0) continue;
  const mid = ramp.line.points[Math.floor(ramp.line.points.length / 2)], km = at(mid.x, mid.z);
  console.log(ramp.id, 'start', reach[ka] ? 'in' : 'OUT', heights[ka].toFixed(0), 'mid', reach[km] ? 'in' : 'OUT', heights[km].toFixed(0), 'end', reach[kz] ? 'in' : 'OUT', heights[kz].toFixed(0), 'len', ramp.line.length.toFixed(0)); }
console.log(JSON.stringify({ W, H, top: top.toFixed(1), topAt, ramps: RAMPS.length, summits }, null, 1));
