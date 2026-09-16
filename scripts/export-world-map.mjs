// Rebuild the journal atlas from the same authored map World Builder opens.
// Run from any directory: node scripts/export-world-map.mjs
//
// The atlas is drawn in the manner of a hand-inked fantasy chart: parchment,
// inked coastlines, hatched seas, mountain and forest glyphs, calligraphic
// names. Every shape still comes from the authored hexes: the land outline is
// the union of land hexes, the province borders are the authored region edges,
// rivers follow the authored river edges. Only the rendering is stylized.
// No reference photograph, generated geography, or game-specific location pins.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const builder = path.resolve(root, '../world-builder');
const sourcePath = path.join(builder, 'map/resources/examples/azhora.wwmap');
const palettePath = path.join(builder, 'map/src/renderer/src/lib/terrain.ts');
const assetDirectory = path.join(root, 'assets');
const bytes = await readFile(sourcePath);
const map = JSON.parse(bytes.toString('utf8').replace(/^﻿/, ''));
const paletteSource = await readFile(palettePath, 'utf8');
const paletteBlock = paletteSource.match(/TERRAIN_COLORS[^=]*=\s*\{([\s\S]*?)\}/)?.[1];
if (!paletteBlock) throw new Error('World Builder terrain palette was not found.');
const editorPalette = Object.fromEntries([...paletteBlock.matchAll(/(\w+)\s*:\s*['"](#[\da-fA-F]{6})['"]/g)].map(m => [m[1], m[2]]));
const hexes = Object.values(map.hexes).sort((a, b) => a.r - b.r || a.q - b.q);
if (!hexes.length || !Number.isFinite(map.hexSize) || map.hexSize <= 0) throw new Error('Invalid authored map.');
for (const hex of hexes) {
  if (!editorPalette[hex.terrain]) throw new Error(`Unknown authored terrain: ${hex.terrain}`);
  if (!Number.isFinite(hex.q) || !Number.isFinite(hex.r)) throw new Error('Invalid authored hex coordinate.');
  if (hex.region && !map.regions[hex.region]) throw new Error(`Undefined region: ${hex.region}`);
}

/** Names the traveler's own chart leaves blank. The dark lord's cape is rumor, not geography a hired sword carries. */
const UNCHARTED_LABELS = new Set(['Cape Thalmagar']);
const WATER = new Set(['ocean', 'coast', 'lake']);
const isLand = hex => !WATER.has(hex.terrain);

// Exact pointy-top axial projection and shared-edge slots from the editor's lib/hex.ts.
const neighbors = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
const neighborToEdge = [0, 5, 4, 3, 2, 1];
const size = map.hexSize;
const halfWidth = Math.sqrt(3) * size / 2;
const point = (q, r) => [size * Math.sqrt(3) * (q + r / 2), size * 1.5 * r];
const centers = hexes.map(h => point(h.q, h.r));
const minX = Math.min(...centers.map(c => c[0])) - halfWidth;
const minY = Math.min(...centers.map(c => c[1])) - size;
const width = Math.max(...centers.map(c => c[0])) + halfWidth - minX;
const height = Math.max(...centers.map(c => c[1])) + size - minY;
const normalizedPoint = (q, r) => { const [x, y] = point(q, r); return [x - minX, y - minY]; };
const corners = (q, r) => {
  const [x, y] = normalizedPoint(q, r);
  return Array.from({ length: 6 }, (_, i) => {
    const angle = Math.PI / 180 * (60 * i - 30);
    return [x + size * Math.cos(angle), y + size * Math.sin(angle)];
  });
};
const number = n => Number(n.toFixed(3));
const xy = p => `${number(p[0])},${number(p[1])}`;
const polygon = h => `M${corners(h.q, h.r).map(xy).join('L')}Z`;
const edgeCorners = (h, direction) => {
  const c = corners(h.q, h.r), slot = neighborToEdge[direction];
  return [c[slot], c[(slot + 1) % 6]];
};
const segment = (h, direction) => { const [a, b] = edgeCorners(h, direction); return `M${xy(a)}L${xy(b)}`; };
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);
const hexAt = (q, r) => map.hexes[`${q},${r}`];
const hash = (q, r, salt = 0) => { const v = Math.sin(q * 12.9898 + r * 78.233 + salt * 37.719) * 43758.5453; return v - Math.floor(v); };

// ---------------------------------------------------------------------------
// Geometry helpers: chain hex edges into polylines and soften them by hand.
const key = p => `${p[0].toFixed(2)},${p[1].toFixed(2)}`;

/** Chain oriented edges (land always on the same side) into closed loops. */
function chainOriented(edges) {
  const byStart = new Map();
  for (const edge of edges) { const k = key(edge[0]); if (!byStart.has(k)) byStart.set(k, []); byStart.get(k).push(edge); }
  const used = new Set(), loops = [];
  for (const edge of edges) {
    if (used.has(edge)) continue;
    const loop = [edge[0]]; let current = edge;
    while (current && !used.has(current)) {
      used.add(current); loop.push(current[1]);
      const candidates = (byStart.get(key(current[1])) ?? []).filter(next => !used.has(next));
      current = candidates[0];
      if (current && key(current[0]) === key(loop[0]) && candidates.length > 1) current = candidates[0];
    }
    if (loop.length > 3) { loop.pop(); loops.push(loop); }
  }
  return loops;
}

/** Chain unoriented edges into open polylines, breaking at junctions. */
function chainFree(edges) {
  const at = new Map();
  const add = (p, edge) => { const k = key(p); if (!at.has(k)) at.set(k, []); at.get(k).push(edge); };
  for (const edge of edges) { add(edge[0], edge); add(edge[1], edge); }
  const used = new Set(), lines = [];
  const extend = (line, from) => {
    let cursor = from;
    while (true) {
      const options = (at.get(key(cursor)) ?? []).filter(edge => !used.has(edge));
      if (options.length !== 1 || (at.get(key(cursor)) ?? []).length > 2) return;
      const edge = options[0]; used.add(edge);
      cursor = key(edge[0]) === key(cursor) ? edge[1] : edge[0];
      line.push(cursor);
    }
  };
  for (const edge of edges) {
    if (used.has(edge)) continue;
    used.add(edge);
    const line = [edge[0], edge[1]];
    extend(line, edge[1]);
    line.reverse(); extend(line, line[line.length - 1]);
    lines.push(line);
  }
  return lines;
}

/** Chaikin corner cutting: a zig-zag of hex edges becomes a hand-drawn line. */
function soften(points, iterations, closed) {
  let current = points;
  for (let pass = 0; pass < iterations; pass++) {
    const next = [];
    const count = closed ? current.length : current.length - 1;
    if (!closed) next.push(current[0]);
    for (let i = 0; i < count; i++) {
      const a = current[i], b = current[(i + 1) % current.length];
      next.push([a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25], [a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75]);
    }
    if (!closed) next.push(current[current.length - 1]);
    current = next;
  }
  return current;
}
const pathOf = (points, closed) => `M${points.map(xy).join('L')}${closed ? 'Z' : ''}`;

// ---------------------------------------------------------------------------
// Authored data, gathered once.
const regionHexes = new Map();
const terrainCounts = {};
const landEdges = [], lakeEdges = [], borderEdges = [], seenBorders = new Set();
for (const hex of hexes) {
  terrainCounts[hex.terrain] = (terrainCounts[hex.terrain] ?? 0) + 1;
  if (hex.region) {
    if (!regionHexes.has(hex.region)) regionHexes.set(hex.region, []);
    regionHexes.get(hex.region).push(hex);
  }
  const land = isLand(hex);
  neighbors.forEach(([dq, dr], direction) => {
    const other = hexAt(hex.q + dq, hex.r + dr);
    if (land && !(other && isLand(other))) landEdges.push(edgeCorners(hex, direction));
    if (hex.terrain === 'lake' && other?.terrain !== 'lake') lakeEdges.push(edgeCorners(hex, direction));
    if (hex.region && other?.region !== hex.region && (other?.region || (other && isLand(other)))) {
      const edgeKey = [`${hex.q},${hex.r}`, `${hex.q + dq},${hex.r + dr}`].sort().join('|');
      if (!seenBorders.has(edgeKey)) { seenBorders.add(edgeKey); borderEdges.push(edgeCorners(hex, direction)); }
    }
  });
}
const sortedRegions = [...regionHexes.entries()].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
const regionMetadata = sortedRegions.map(([id, cells]) => {
  const p = cells.map(h => normalizedPoint(h.q, h.r));
  const x = Math.min(...p.map(c => c[0])) - halfWidth;
  const y = Math.min(...p.map(c => c[1])) - size;
  return {
    id, name: map.regions[id].name,
    x: number(x), y: number(y),
    width: number(Math.max(...p.map(c => c[0])) + halfWidth - x),
    height: number(Math.max(...p.map(c => c[1])) + size - y),
    centerX: number(p.reduce((sum, c) => sum + c[0], 0) / p.length),
    centerY: number(p.reduce((sum, c) => sum + c[1], 0) / p.length),
    hexCount: cells.length,
  };
});
const riverEdges = new Map([['small', []], ['medium', []], ['large', []]]);
for (const [edgeKey, riverSize] of Object.entries(map.rivers).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) {
  const [a, b] = edgeKey.split('|').map(k => k.split(',').map(Number));
  const direction = neighbors.findIndex(([dq, dr]) => dq === b[0] - a[0] && dr === b[1] - a[1]);
  if (direction < 0 || !riverEdges.has(riverSize)) throw new Error(`Invalid river edge: ${edgeKey}`);
  riverEdges.get(riverSize).push(edgeCorners({ q: a[0], r: a[1] }, direction));
}
const settlements = hexes.filter(h => h.settlement);

// ---------------------------------------------------------------------------
// Ink and parchment.
const INK = '#3d2b1a', INK_SOFT = '#5e4630', PARCHMENT = '#e7d6ae', LAND = '#e3d1a5', SEA = '#cfd6c4', SEA_DEEP = '#c1cbbb', RIVER = '#5f7f95';
const terrainTint = {
  grassland: '#dfe0ac', plains: '#e8dcac', hills: '#dfcd9d', forest: '#cbd6a2', deep_forest: '#bfcd98', deep_jungle: '#b9ce9b',
  wetland: '#cddac8', highland: '#d9c79c', mountain: '#d8cfba', high_mountain: '#e3dfd2',
};
const desertRegions = new Set(sortedRegions.filter(([, cells]) => /Desert|Meroshe/i.test(map.regions[cells[0].region].name)).map(([id]) => id));
const terrainTintPaths = new Map();
for (const hex of hexes) {
  if (!isLand(hex)) continue;
  const tint = desertRegions.has(hex.region) && ['plains', 'grassland'].includes(hex.terrain) ? '#eedaa2' : terrainTint[hex.terrain];
  if (!tint) continue;
  if (!terrainTintPaths.has(tint)) terrainTintPaths.set(tint, []);
  terrainTintPaths.get(tint).push(polygon(hex));
}

/** Hand-drawn glyphs, one per hex, jittered deterministically so nothing lines up like a grid. */
const glyphs = { peakLine: [], peakShade: [], snow: [], hill: [], treeCrown: [], treeTrunk: [], deepCrown: [], jungle: [], marsh: [], hatch: [], tuft: [], dune: [] };
for (const hex of hexes) {
  if (!isLand(hex)) continue;
  const [cx, cy] = normalizedPoint(hex.q, hex.r);
  const jx = (hash(hex.q, hex.r, 1) - .5) * 9, jy = (hash(hex.q, hex.r, 2) - .5) * 7;
  const x = cx + jx, y = cy + jy, n = n => number(n);
  const desert = desertRegions.has(hex.region);
  switch (hex.terrain) {
    case 'high_mountain': {
      const s = 9 + hash(hex.q, hex.r, 3) * 3;
      glyphs.peakLine.push(`M${n(x - s)},${n(y + s * .7)}L${n(x - s * .2)},${n(y - s)}L${n(x + s * .15)},${n(y - s * .55)}L${n(x + s * .45)},${n(y - s * .85)}L${n(x + s)},${n(y + s * .7)}`);
      glyphs.peakShade.push(`M${n(x - s * .2)},${n(y - s)}L${n(x + s)},${n(y + s * .7)}L${n(x + s * .1)},${n(y + s * .7)}Z`);
      glyphs.snow.push(`M${n(x - s * .45)},${n(y - s * .45)}L${n(x - s * .2)},${n(y - s)}L${n(x + s * .05)},${n(y - s * .4)}Z`);
      break;
    }
    case 'mountain': {
      const s = 6.5 + hash(hex.q, hex.r, 3) * 2.5;
      glyphs.peakLine.push(`M${n(x - s)},${n(y + s * .65)}L${n(x - s * .1)},${n(y - s)}L${n(x + s * .3)},${n(y - s * .45)}L${n(x + s)},${n(y + s * .65)}`);
      glyphs.peakShade.push(`M${n(x - s * .1)},${n(y - s)}L${n(x + s)},${n(y + s * .65)}L${n(x + s * .15)},${n(y + s * .65)}Z`);
      break;
    }
    case 'hills': {
      const s = 5 + hash(hex.q, hex.r, 3) * 2;
      glyphs.hill.push(`M${n(x - s)},${n(y + 2)}Q${n(x)},${n(y - s)} ${n(x + s)},${n(y + 2)}`);
      if (hash(hex.q, hex.r, 4) > .55) glyphs.hill.push(`M${n(x - s * .3)},${n(y + 5)}Q${n(x + s * .5)},${n(y - 1)} ${n(x + s * 1.2)},${n(y + 5)}`);
      break;
    }
    case 'forest': {
      const r = 3.2 + hash(hex.q, hex.r, 3);
      glyphs.treeCrown.push(`M${n(x - r)},${n(y)}a${n(r)},${n(r)} 0 1,1 ${n(r * 2)},0a${n(r)},${n(r)} 0 1,1 ${n(-r * 2)},0`);
      glyphs.treeTrunk.push(`M${n(x)},${n(y + r * .6)}L${n(x)},${n(y + r * 1.8)}`);
      break;
    }
    case 'deep_forest': {
      for (const [ox, oy] of [[-4, 1], [4, -2], [0, 5]]) {
        const r = 2.8 + hash(hex.q, hex.r, 5 + ox);
        const tx = x + ox, ty = y + oy;
        glyphs.deepCrown.push(`M${n(tx - r)},${n(ty)}a${n(r)},${n(r)} 0 1,1 ${n(r * 2)},0a${n(r)},${n(r)} 0 1,1 ${n(-r * 2)},0`);
        glyphs.treeTrunk.push(`M${n(tx)},${n(ty + r * .6)}L${n(tx)},${n(ty + r * 1.7)}`);
      }
      break;
    }
    case 'deep_jungle': {
      const r = 4 + hash(hex.q, hex.r, 3) * 1.5;
      glyphs.jungle.push(`M${n(x - r)},${n(y + 2)}Q${n(x - r * .6)},${n(y - r)} ${n(x)},${n(y - r * .3)}Q${n(x + r * .6)},${n(y - r)} ${n(x + r)},${n(y + 2)}Q${n(x)},${n(y - 1)} ${n(x - r)},${n(y + 2)}Z`);
      glyphs.treeTrunk.push(`M${n(x)},${n(y)}L${n(x)},${n(y + r * 1.6)}`);
      break;
    }
    case 'wetland':
      for (const oy of [-3, 1, 5]) glyphs.marsh.push(`M${n(x - 6 + oy)},${n(y + oy)}L${n(x + 6 + oy)},${n(y + oy)}`);
      glyphs.marsh.push(`M${n(x - 1)},${n(y - 7)}L${n(x - 1)},${n(y - 1)}M${n(x + 3)},${n(y - 6)}L${n(x + 3)},${n(y - 1)}`);
      break;
    case 'highland':
      glyphs.hatch.push(`M${n(x - 6)},${n(y + 3)}L${n(x)},${n(y - 4)}M${n(x - 1)},${n(y + 5)}L${n(x + 6)},${n(y - 2)}`);
      break;
    case 'grassland': case 'plains':
      if (desert) { if (hash(hex.q, hex.r, 6) > .6) glyphs.dune.push(`M${n(x - 7)},${n(y + 2)}Q${n(x - 2)},${n(y - 3)} ${n(x + 2)},${n(y + 1)}Q${n(x + 5)},${n(y + 3)} ${n(x + 8)},${n(y + 1)}`); }
      else if (hash(hex.q, hex.r, 6) > (hex.terrain === 'grassland' ? .72 : .86)) glyphs.tuft.push(`M${n(x - 3)},${n(y + 2)}L${n(x - 1)},${n(y - 3)}L${n(x)},${n(y + 1)}L${n(x + 1.5)},${n(y - 3.5)}L${n(x + 3)},${n(y + 2)}`);
      break;
    default: break;
  }
}

// Labels: sized by extent, tilted along an elongated province's axis.
function splitLabel(label) {
  const words = label.trim().split(/\s+/);
  if (label.length <= 18 || words.length < 2) return [label];
  let best = 1, bestScore = Infinity;
  for (let i = 1; i < words.length; i++) {
    const left = words.slice(0, i).join(' '), right = words.slice(i).join(' ');
    const score = Math.abs(left.length - right.length) + Math.max(left.length, right.length) * .15;
    if (score < bestScore) { best = i; bestScore = score; }
  }
  return [words.slice(0, best).join(' '), words.slice(best).join(' ')];
}
function labelPose(cells) {
  const p = cells.map(h => normalizedPoint(h.q, h.r));
  const mx = p.reduce((s, c) => s + c[0], 0) / p.length, my = p.reduce((s, c) => s + c[1], 0) / p.length;
  let cxx = 0, cyy = 0, cxy = 0;
  for (const [x, y] of p) { cxx += (x - mx) ** 2; cyy += (y - my) ** 2; cxy += (x - mx) * (y - my); }
  const angle = .5 * Math.atan2(2 * cxy, cxx - cyy) * 180 / Math.PI;
  const trace = cxx + cyy, det = cxx * cyy - cxy * cxy, disc = Math.sqrt(Math.max(0, trace * trace / 4 - det));
  const elongation = (trace / 2 + disc) / Math.max(1e-6, trace / 2 - disc);
  const tilt = elongation > 2.2 && Math.abs(angle) <= 38 ? angle : 0;
  return { tilt: number(tilt), fontSize: number(Math.max(11.5, Math.min(27, 9 + Math.sqrt(p.length) * 2.4))) };
}
const labels = regionMetadata.filter(region => !UNCHARTED_LABELS.has(region.name)).map(region => {
  const cells = regionHexes.get(region.id), pose = labelPose(cells);
  const lines = splitLabel(region.name);
  const uppercase = /Mountains|Desert|Plain|Highlands|Plateau|Hills|Wetlands|Stones|Archipeligo/i.test(region.name);
  const lineHeight = pose.fontSize * 1.08;
  const text = lines.map((line, i) => `<tspan x="0" y="${number((i - (lines.length - 1) / 2) * lineHeight)}">${escape(uppercase ? line.toUpperCase() : line)}</tspan>`).join('');
  return `<text data-region="${escape(region.id)}" transform="translate(${region.centerX} ${region.centerY}) rotate(${pose.tilt})" font-size="${pose.fontSize}"${uppercase ? ' letter-spacing="2.4"' : ' font-style="italic"'}>${text}</text>`;
});

// Sea decorations: a few ships and one serpent, placed on open water far from any land.
const landCenters = hexes.filter(isLand).map(h => normalizedPoint(h.q, h.r));
function openWater(seed) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const x = 120 + hash(seed, attempt, 9) * (width - 240), y = 120 + hash(attempt, seed, 11) * (height - 240);
    const [cx, cy] = [x, y];
    let near = false;
    for (const [lx, ly] of landCenters) if (Math.abs(lx - cx) < 140 && Math.abs(ly - cy) < 140) { near = true; break; }
    if (!near) return [cx, cy];
  }
  return null;
}
const ships = [1, 2, 3].map(openWater).filter(Boolean).map(([x, y], i) => `<g transform="translate(${number(x)} ${number(y)}) scale(${1.1 + i * .15})"><path d="M-14,4 Q0,10 14,4 L11,0 L-11,0 Z" fill="${INK}"/><path d="M0,0 L0,-16 M0,-15 Q9,-9 1,-3 M0,-13 Q-8,-8 -1,-3" fill="${PARCHMENT}" stroke="${INK}" stroke-width="1.3"/><path d="M-20,8 q4,-3 8,0 t8,0 t8,0 t8,0" fill="none" stroke="${INK_SOFT}" stroke-width="1"/></g>`);
const serpent = (([x, y]) => x === undefined ? '' : `<g transform="translate(${number(x)} ${number(y)})"><path d="M-30,6 Q-20,-14 -10,4 T10,4 T30,4" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/><path d="M28,2 l7,-6 l-2,8 z" fill="${INK}"/><path d="M-40,12 q4,-3 8,0 t8,0 t8,0 t8,0 t8,0 t8,0 t8,0 t8,0" fill="none" stroke="${INK_SOFT}" stroke-width="1"/></g>`)(openWater(7) ?? []);

const landLoops = chainOriented(landEdges).map(loop => soften(loop, 2, true));
const lakeLoops = chainOriented(lakeEdges).map(loop => soften(loop, 2, true));
const borderLines = chainFree(borderEdges).map(line => soften(line, 1, false));
const riverLines = [...riverEdges].map(([riverSize, edges]) => [riverSize, chainFree(edges).map(line => soften(line, 2, false))]);
const landPath = landLoops.map(loop => pathOf(loop, true)).join('');
const lakePath = lakeLoops.map(loop => pathOf(loop, true)).join('');
const sha256 = createHash('sha256').update(bytes).digest('hex');
const serifFont = "Georgia, 'Palatino Linotype', 'Book Antiqua', 'Times New Roman', serif";
const compass = (x, y) => `<g transform="translate(${x} ${y})" fill="${INK}" stroke="${INK}"><circle r="46" fill="none" stroke-width="1.2"/><circle r="40" fill="none" stroke-width=".7"/>
<path d="M0,-58 L8,-8 L0,-2 L-8,-8 Z" fill="${INK}" stroke="none"/><path d="M0,58 L8,8 L0,2 L-8,8 Z M-58,0 L-8,-8 L-2,0 L-8,8 Z M58,0 L8,-8 L2,0 L8,8 Z" fill="${PARCHMENT}" stroke-width="1.3"/>
<path d="M-40,-40 L-6,-4 L-4,-6 Z M40,-40 L6,-4 L4,-6 Z M40,40 L6,4 L4,6 Z M-40,40 L-6,4 L-4,6 Z" fill="${INK_SOFT}" stroke="none"/>
<text y="-64" text-anchor="middle" font-family="${serifFont}" font-size="22" font-weight="700" stroke="none">N</text></g>`;

const svg = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  `<svg xmlns="http://www.w3.org/2000/svg" width="${number(width)}" height="${number(height)}" viewBox="0 0 ${number(width)} ${number(height)}" role="img" aria-labelledby="map-title map-description">`,
  '<title id="map-title">Azhora — a traveler’s chart drawn from the developed World Builder map</title>',
  `<desc id="map-description">Authored terrain, region boundaries, names, and rivers exported from azhora.wwmap and drawn as an inked parchment chart. ${hexes.length} hexes, ${Object.keys(map.regions).length} regions, ${Object.keys(map.rivers).length} river edges. The photographic sketch underlay is excluded. Uncharted: ${[...UNCHARTED_LABELS].join(', ')}.</desc>`,
  `<metadata>Source SHA-256: ${sha256}</metadata>`,
  '<defs>',
  '<filter id="parchment" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.0032" numOctaves="3" seed="7" result="grain"/><feColorMatrix in="grain" type="matrix" values="0 0 0 0 0.36  0 0 0 0 0.27  0 0 0 0 0.14  0 0 0 0.22 0"/></filter>',
  `<clipPath id="land-clip"><path d="${landPath}"/></clipPath>`,
  '</defs>',
  `<rect id="paper" width="${number(width)}" height="${number(height)}" fill="${SEA}"/>`,
  `<rect width="${number(width)}" height="${number(height)}" fill="${SEA_DEEP}" filter="url(#parchment)"/>`,
  // The sea darkens toward the shore and ripples beside it.
  `<g id="sea" fill="none" stroke-linejoin="round" stroke-linecap="round">`,
  `<path d="${landPath}" stroke="#a9b8b3" stroke-width="30" stroke-opacity=".28"/>`,
  `<path d="${landPath}" stroke="#93a6a2" stroke-width="16" stroke-opacity=".32"/>`,
  `<path d="${landPath}" stroke="#7f938f" stroke-width="7" stroke-opacity=".4" stroke-dasharray="11 7"/>`,
  '</g>',
  `<g id="land"><path d="${landPath}" fill="${LAND}"/></g>`,
  `<g id="terrain" clip-path="url(#land-clip)" stroke-width="0.6" stroke-linejoin="round">`,
  ...[...terrainTintPaths].map(([tint, paths]) => `<path fill="${tint}" stroke="${tint}" d="${paths.join('')}"/>`),
  `<rect width="${number(width)}" height="${number(height)}" fill="${PARCHMENT}" filter="url(#parchment)" opacity=".7"/>`,
  '</g>',
  '<g id="region-tints" opacity="0.07">',
  ...sortedRegions.map(([id, cells]) => `<path data-region="${escape(id)}" fill="${escape(map.regions[id].color)}" d="${cells.map(polygon).join('')}"/>`),
  '</g>',
  `<g id="relief" clip-path="url(#land-clip)" fill="none" stroke="${INK_SOFT}" stroke-linecap="round" stroke-linejoin="round">`,
  `<path data-glyph="tuft" stroke-width=".8" stroke-opacity=".55" d="${glyphs.tuft.join('')}"/>`,
  `<path data-glyph="dune" stroke-width="1" stroke-opacity=".6" d="${glyphs.dune.join('')}"/>`,
  `<path data-glyph="marsh" stroke-width="1" stroke-opacity=".75" d="${glyphs.marsh.join('')}"/>`,
  `<path data-glyph="hatch" stroke-width=".9" stroke-opacity=".7" d="${glyphs.hatch.join('')}"/>`,
  `<path data-glyph="hill" stroke-width="1.1" stroke-opacity=".8" d="${glyphs.hill.join('')}"/>`,
  `<path data-glyph="tree-trunk" stroke-width="1" d="${glyphs.treeTrunk.join('')}"/>`,
  `<path data-glyph="tree-crown" fill="#a9bd86" stroke="${INK_SOFT}" stroke-width=".9" d="${glyphs.treeCrown.join('')}"/>`,
  `<path data-glyph="deep-crown" fill="#8ea973" stroke="${INK_SOFT}" stroke-width=".9" d="${glyphs.deepCrown.join('')}"/>`,
  `<path data-glyph="jungle" fill="#86a56e" stroke="${INK_SOFT}" stroke-width=".9" d="${glyphs.jungle.join('')}"/>`,
  `<path data-glyph="peak-shade" fill="${INK}" fill-opacity=".28" stroke="none" d="${glyphs.peakShade.join('')}"/>`,
  `<path data-glyph="peak" stroke="${INK}" stroke-width="1.3" d="${glyphs.peakLine.join('')}"/>`,
  `<path data-glyph="snow" fill="#f4efe2" stroke="none" d="${glyphs.snow.join('')}"/>`,
  '</g>',
  `<g id="lakes"><path d="${lakePath}" fill="${SEA}" stroke="${INK_SOFT}" stroke-width="1.2"/></g>`,
  `<path id="region-boundaries" clip-path="url(#land-clip)" fill="none" stroke="${INK_SOFT}" stroke-opacity="0.75" stroke-width="1.5" stroke-dasharray="7 4" stroke-linecap="round" stroke-linejoin="round" d="${borderLines.map(line => pathOf(line, false)).join('')}"/>`,
  `<g id="rivers" fill="none" stroke="${RIVER}" stroke-linecap="round" stroke-linejoin="round">`,
  ...riverLines.filter(([, lines]) => lines.length).map(([riverSize, lines]) => {
    const widthBySize = { small: 1.4, medium: 2.2, large: 3.4 }[riverSize];
    return `<path data-size="${riverSize}" stroke-width="${widthBySize}" d="${lines.map(line => pathOf(line, false)).join('')}"/>`;
  }),
  '</g>',
  `<g id="coast" fill="none" stroke="${INK}" stroke-width="2.1" stroke-linejoin="round"><path d="${landPath}"/></g>`,
  `<g id="region-labels" text-anchor="middle" dominant-baseline="central" font-family="${serifFont}" font-weight="600" fill="${INK}" stroke="${PARCHMENT}" stroke-width="4.2" stroke-linejoin="round" paint-order="stroke fill">`,
  ...labels,
  '</g>',
  `<g id="settlements" font-family="${serifFont}" text-anchor="middle">`,
  ...settlements.map(hex => {
    const [x, y] = normalizedPoint(hex.q, hex.r);
    const radius = { village: 2, town: 3, city: 4, capital: 5 }[hex.settlementSize] ?? 2;
    return `<g><title>${escape(hex.settlement)}</title><circle cx="${number(x)}" cy="${number(y)}" r="${radius}" fill="${PARCHMENT}" stroke="${INK}" stroke-width="1"/><text x="${number(x)}" y="${number(y + radius + 12)}" font-size="11" fill="${INK}" stroke="${PARCHMENT}" stroke-width="3" paint-order="stroke fill">${escape(hex.settlement)}</text></g>`;
  }),
  '</g>',
  `<g id="ornaments">${ships.join('')}${serpent}${compass(number(width - 150), 190)}`,
  `<g transform="translate(120 130)"><rect x="-24" y="-64" width="470" height="118" rx="6" fill="${PARCHMENT}" stroke="${INK}" stroke-width="1.6"/><rect x="-18" y="-58" width="458" height="106" rx="4" fill="none" stroke="${INK_SOFT}" stroke-width=".8"/><text font-family="${serifFont}" font-size="54" letter-spacing="10" fill="${INK}" x="211" y="-6" text-anchor="middle">AZHORA</text><text font-family="${serifFont}" font-style="italic" font-size="17" fill="${INK_SOFT}" x="211" y="30" text-anchor="middle">a traveler’s chart of the continent, drawn from the road out of Drent</text></g>`,
  `<rect x="14" y="14" width="${number(width - 28)}" height="${number(height - 28)}" fill="none" stroke="${INK}" stroke-width="3"/><rect x="24" y="24" width="${number(width - 48)}" height="${number(height - 48)}" fill="none" stroke="${INK_SOFT}" stroke-width="1"/>`,
  '</g>',
  '</svg>',
  '',
].join('\n');

const home = regionMetadata.find(region => region.id === 'Drent');
if (!home) throw new Error('Drent was not found in the authored map.');
const metadata = {
  source: path.relative(assetDirectory, sourcePath).replaceAll('\\', '/'),
  sha256,
  width: number(width), height: number(height),
  hexCount: hexes.length,
  regionCount: Object.keys(map.regions).length,
  riverCount: Object.keys(map.rivers).length,
  settlementCount: settlements.length,
  grid: { width: map.width, height: map.height, hexSize: size, projection: 'pointy-top axial' },
  bounds: { x: 0, y: 0, width: number(width), height: number(height) },
  focus: { name: home.name, x: home.x, y: home.y, width: home.width, height: home.height },
  style: 'inked parchment chart', uncharted: [...UNCHARTED_LABELS],
  terrainCounts,
  regions: regionMetadata,
};
await mkdir(assetDirectory, { recursive: true });
await writeFile(path.join(assetDirectory, 'azhora-world-map.svg'), svg);
await writeFile(path.join(assetDirectory, 'azhora-world-map.json'), `${JSON.stringify(metadata, null, 2)}\n`);
console.log(JSON.stringify({
  source: metadata.source, sha256, width: metadata.width, height: metadata.height,
  hexCount: metadata.hexCount, regionCount: metadata.regionCount,
  riverCount: metadata.riverCount, settlementCount: metadata.settlementCount,
  landLoops: landLoops.length, lakeLoops: lakeLoops.length, borderLines: borderLines.length,
  glyphs: Object.fromEntries(Object.entries(glyphs).map(([k, v]) => [k, v.length])),
  focus: metadata.focus, svgBytes: Buffer.byteLength(svg),
}, null, 2));
