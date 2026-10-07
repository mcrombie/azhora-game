import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { validatePack } from '../src/settlements/editions.js';
const out = path.resolve(process.argv[2] ?? 'tests/artifacts/public-demo');
const pack = JSON.parse(await readFile(path.join(out, 'demo-pack.json'), 'utf8'));
if (!validatePack(pack) || pack.entries.length !== 93 || pack.entries.some(r => r.generation.status !== 'ready' || !r.generation.prose || !r.generation.imageUrl || r.generation.jobId || r.generation.imageExpiresAt)) throw Error('Export all 93 completed public pages before building the demo.');
const prose = new Set(), images = new Set();
for (const row of pack.entries) {
  const url = new URL(row.generation.imageUrl), name = path.posix.basename(url.pathname);
  if (url.protocol !== 'https:' || url.search || !/^[a-f0-9]{64}\.png$/.test(name)) throw Error('An image is not a permanent exported asset.');
  const bytes = await readFile(path.join(out, 'images', name));
  if (bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw Error('An exported image is not a PNG.');
  images.add(createHash('sha256').update(bytes).digest('hex'));
  prose.add(row.generation.prose);
}
if (prose.size !== 93 || images.size !== 93) throw Error('Every completed page must have its own prose and image.');
await mkdir(out, { recursive: true });
for (const file of ['index.html', 'demo.css', 'demo.js']) await copyFile(new URL('../demo/' + file, import.meta.url), path.join(out, file));
for (const file of ['book.js', 'book.css']) await copyFile(new URL('../src/settlements/' + file, import.meta.url), path.join(out, file));
console.log(`Built a read-only demonstration with ${pack.entries.length} preserved prose-and-image pairs in ${out}`);
