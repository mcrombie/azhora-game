// Read-only source import for ghost-mode terrain surveys. Never writes World Builder.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const builder = path.resolve(root, '../world-builder');
const sourcePath = path.join(builder, 'map/resources/examples/azhora.wwmap');
const bytes = await readFile(sourcePath);
const source = JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''));
const terrainSource = await readFile(path.join(builder, 'map/src/renderer/src/lib/terrain.ts'), 'utf8');
const paletteBlock = terrainSource.match(/TERRAIN_COLORS[^=]*=\s*\{([\s\S]*?)\}/)?.[1];
if (!paletteBlock) throw new Error('World Builder terrain colors were not found.');
const palette = Object.fromEntries([...paletteBlock.matchAll(/(\w+)\s*:\s*['"](#[\da-fA-F]{6})['"]/g)].map(match => [match[1], match[2]]));
const hexes = Object.values(source.hexes).sort((a, b) => a.r - b.r || a.q - b.q);
const size = source.hexSize;
if (!hexes.length || !Number.isFinite(size) || size <= 0) throw new Error('Invalid authored hex map.');
const halfWidth = Math.sqrt(3) * size / 2;
const rawPoint = cell => [size * Math.sqrt(3) * (cell.q + cell.r / 2), size * 1.5 * cell.r];
const centers = hexes.map(rawPoint);
const minX = Math.min(...centers.map(point => point[0])) - halfWidth;
const minY = Math.min(...centers.map(point => point[1])) - size;
const number = value => Number(value.toFixed(3));
const width = number(Math.max(...centers.map(point => point[0])) + halfWidth - minX);
const height = number(Math.max(...centers.map(point => point[1])) + size - minY);
const buckets = new Map();
for (const cell of hexes) {
  if (!palette[cell.terrain]) throw new Error(`Unknown authored terrain: ${cell.terrain}`);
  if (!cell.region) continue;
  if (!source.regions[cell.region]) throw new Error(`Unknown authored region: ${cell.region}`);
  const [rawX, rawY] = rawPoint(cell);
  const sample = { q: cell.q, r: cell.r, x: number(rawX - minX), y: number(rawY - minY), terrain: cell.terrain };
  if (!buckets.has(cell.region)) buckets.set(cell.region, []);
  buckets.get(cell.region).push(sample);
}
const regions = [...buckets.entries()].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([id, cells]) => {
  const x = Math.min(...cells.map(cell => cell.x)) - halfWidth, y = Math.min(...cells.map(cell => cell.y)) - size;
  return { id, name: source.regions[id].name,
    bounds: { x: number(x), y: number(y), width: number(Math.max(...cells.map(cell => cell.x)) + halfWidth - x), height: number(Math.max(...cells.map(cell => cell.y)) + size - y) },
    centerX: number(cells.reduce((sum, cell) => sum + cell.x, 0) / cells.length),
    centerY: number(cells.reduce((sum, cell) => sum + cell.y, 0) / cells.length),
    cells };
});
const data = { version: 1, source: '../../world-builder/map/resources/examples/azhora.wwmap',
  sha256: createHash('sha256').update(bytes).digest('hex'),
  purpose: 'Authored terrain categories and exact region locations for developer surveys. These are not completed game regions.',
  width, height, hexSize: size, projection: 'pointy-top axial', origin: { x: number(minX), y: number(minY) },
  palette, regions };
await writeFile(path.join(root, 'assets/azhora-dev-regions.json'), `${JSON.stringify(data)}\n`);
console.log(JSON.stringify({ source: data.source, sha256: data.sha256, regions: regions.length,
  cells: regions.reduce((sum, region) => sum + region.cells.length, 0), width, height }));
