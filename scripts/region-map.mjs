// A top-down picture of a region and its neighbours, for designing ground: height as shade, each
// country its own tint, water blue, ground steeper than the climbing rule allows in red, a fifty-metre
// grid, and white dots at the given points. Not a test.
//   node scripts/region-map.mjs <minX,minZ,maxX,maxZ> [metres per pixel] [out.png] [x,z;x,z;...]
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from '../tests/module-loader.js';
import { hexOwnerAt } from '../src/world/terrain/region-world.js';

const [minX, minZ, maxX, maxZ] = process.argv[2].split(',').map(Number);
const scale = Number(process.argv[3] ?? 2), out = process.argv[4] ?? 'tests/artifacts/region-map.png';
const dots = (process.argv[5] ?? '').split(';').filter(Boolean).map(p => p.split(',').map(Number));
const { createWorld } = await sourceModule('../src/world.js');
const world = createWorld(new THREE.Scene());
const g = world.groundHeight, W = Math.ceil((maxX - minX) / scale), H = Math.ceil((maxZ - minZ) / scale);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const tints = { Feradom: [110, 170, 90], Pueth: [190, 150, 90], 'East Lotharn Mountains': [120, 140, 190], Amod: [180, 170, 110], Drent: [150, 110, 170] };
const heights = new Float32Array(W * H);
for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) heights[j * W + i] = g(minX + i * scale, minZ + j * scale);
// MAP_LO and MAP_HI fix the shading's range, so a low country beside a high one still reads.
let lo = Infinity, hi = -Infinity;
for (const h of heights) { lo = Math.min(lo, h); hi = Math.max(hi, h); }
if (process.env.MAP_LO) lo = Number(process.env.MAP_LO);
if (process.env.MAP_HI) hi = Number(process.env.MAP_HI);
const pixels = Buffer.alloc(H * (W * 3 + 1));
for (let j = 0; j < H; j++) {
  for (let i = 0; i < W; i++) {
    const x = minX + i * scale, z = minZ + j * scale, h = heights[j * W + i], o = j * (W * 3 + 1) + 1 + i * 3;
    const hx = heights[j * W + Math.min(W - 1, i + 1)] - heights[j * W + Math.max(0, i - 1)];
    const hz = heights[Math.min(H - 1, j + 1) * W + i] - heights[Math.max(0, j - 1) * W + i];
    const grade = Math.hypot(hx, hz) / (2 * scale), shade = .35 + .65 * clamp((h - lo) / Math.max(1, hi - lo), 0, 1.2);
    // Lit from the north-west, so a slope reads as a slope and a summit as a summit.
    const nx = -hx / (2 * scale), nz = -hz / (2 * scale), lambert = clamp((nx * -.6 + nz * -.6 + .75) / Math.hypot(nx, nz, 1) / 1.1, .25, 1.25);
    let c = (tints[hexOwnerAt(x, z)] ?? [140, 140, 140]).map(v => v * shade * lambert);
    if (world.waterAt && world.waterAt(x, z) > h) c = [40, 80, 150];
    else if (grade > 1.19) c = [200, 40, 40];
    else if (grade > .7) c = [c[0] + 50, c[1] + 20, c[2]];
    const onGrid = Math.abs(((x % 50) + 50) % 50) < scale || Math.abs(((z % 50) + 50) % 50) < scale;
    if (onGrid) c = c.map(v => v * .75);
    pixels[o] = Math.min(255, c[0]); pixels[o + 1] = Math.min(255, c[1]); pixels[o + 2] = Math.min(255, c[2]);
  }
}
for (const [x, z] of dots) {
  const ci = Math.round((x - minX) / scale), cj = Math.round((z - minZ) / scale);
  for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) {
    const i = ci + a, j = cj + b; if (i < 0 || j < 0 || i >= W || j >= H) continue;
    const o = j * (W * 3 + 1) + 1 + i * 3; pixels[o] = pixels[o + 1] = pixels[o + 2] = 255;
  }
}
const crcTable = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc = buf => { let c = -1; for (const byte of buf) c = crcTable[(c ^ byte) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2;
writeFileSync(out, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(pixels)), chunk('IEND', Buffer.alloc(0))]));
console.log(JSON.stringify({ W, H, lo: lo.toFixed(1), hi: hi.toFixed(1) }));
