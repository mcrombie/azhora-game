#!/usr/bin/env node
/**
 * Generate src/world/terrain/region-rivers.js from the authored World Builder map.
 *
 * The atlas keeps its rivers on hex edges (`map.rivers`, keyed "q,r|q,r" with a
 * size), exactly as scripts/export-world-map.mjs reads them for the journal
 * chart. The game only needs the edges that belong to the regions it builds
 * rivers for, so this script bakes those raw edges into a small ES module; the
 * chaining and softening into a watercourse is geometry, and lives in
 * `riverCourses()` in src/region-layout.js.
 *
 * `RIVER_REGIONS` names the regions whose rivers are built from the map. An
 * edge is kept when either of its two hexes belongs to one of them, so a
 * border river comes with the region on both banks. The Caloss predates this
 * file and is still authored by hand in src/region-world.js.
 *
 * tests/pueth-world.test.js re-derives the module and fails if it drifts (when
 * the World Builder repository is checked out beside this one). Never hand-edit
 * src/world/terrain/region-rivers.js; run `node scripts/build-region-rivers.mjs`.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyGameAtlasAdjustments } from '../src/world/terrain/game-atlas-adjustments.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const MAP_PATH = path.resolve(root, '../world-builder/map/resources/examples/azhora.wwmap');
/**
 * An edge is kept when either of its hexes belongs to one of these, so a river
 * on a shared border arrives whole. The four western regions are listed together
 * even though they are built one at a time: the Carica runs along the
 * Caricas-Nesdor border and the Lizeem along Caricas's and Nesdor's both, so
 * naming them one at a time would chop those courses into pieces and then
 * silently re-join them, changing rivers that were already built.
 */
export const RIVER_REGIONS = ['Pueth', 'Vastos', 'Meneth', 'Caricas', 'Nesdor',
  'Isareos', 'Nethereum', 'Ovesos', 'Oves Desert', 'Gala', 'Eer', 'East Lotharn Mountains',
  // The four Mithala countries, added together for the reason the four western ones were: the
  // atlas braids one river system across all four, and naming them one at a time would chop the
  // braids into pieces at each border and then silently re-join them. Sixty-one edges come in
  // with them. Measured before they were added: no existing chain loses its key, changes a
  // single point, or gains a confluence - the nearest built water is the East Lotharn's border
  // water, and its two Lotharn-only pieces are 14 and 2 points before and after, to the digit.
  'South Mithala', 'West Mithala', 'East Mithala', 'North Mithala',
  // The four southwestern countries, added together for the same reason again: the atlas draws
  // twenty-eight edges on them in two chains, and both chains cross a country border - the
  // northern water runs along Navarth's border with Alezhor and then along the Ganesh Desert's,
  // and the Vaellir runs the whole of West Pyros's eastern border. Naming them one at a time
  // would chop both into pieces at a border and then silently re-join them. Measured before they
  // were added: no chain that already existed loses its key, changes a point or gains a
  // confluence - the nearest built water is the Oveth, a thousand metres east of West Pyros.
  'Navarth', 'West Pyros', 'Ganesh Desert', 'Ganesh Plain',
  // Marosh and Trogo, and **these are the first river edges the atlas draws inside a southwestern
  // country rather than along its border.** Job 1's twenty-eight all run on a border with unbuilt
  // country and jobs 2 and 3 have none at all - ninety-five hexes of Meroshe and seventy-three of the
  // western edge with not one river edge on any of them. There are seven here: three small edges round
  // the corner of Marosh's (-25,131), which is the water gap through its ridge, and four round
  // Trogo's (-25,140) and (-25,141), which is the Trogoreth. Both chains have the same country on both
  // banks, so neither can chop or re-join anything that already exists; measured before they were
  // added, no existing chain loses its key, changes a point or gains a confluence, and the nearest
  // built water is the Vaellir, six hundred metres north-west of Marosh's northern tip.
  'Marosh', 'Trogo',
    'North Ibenwood', 'East Ibenwood', 'South Ibenwood', 'West Ibenwood', 'Central Ibenwood', 'South Oremindi Mountains', 'Yunethre', 'West Baldro Mountains', 'East Baldro Mountains', 'Babon'];
const NEIGHBORS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
const SIZES = new Set(['small', 'medium', 'large']);

export function readMap(file = MAP_PATH) {
  if (!existsSync(file)) return null;
  const bytes = readFileSync(file);
  return { bytes, map: JSON.parse(bytes.toString('utf8').replace(/^﻿/, '')) };
}

export function buildSource({ bytes, map }) {
  map = applyGameAtlasAdjustments(map);
  const regionOf = (q, r) => map.hexes[`${q},${r}`]?.region ?? null;
  const edges = [];
  for (const [edgeKey, size] of Object.entries(map.rivers).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
    const [a, b] = edgeKey.split('|').map(part => part.split(',').map(Number));
    if (!NEIGHBORS.some(([dq, dr]) => dq === b[0] - a[0] && dr === b[1] - a[1]) || !SIZES.has(size))
      throw new Error(`Invalid river edge: ${edgeKey}`);
    const regions = [regionOf(...a), regionOf(...b)];
    if (!regions.some(region => RIVER_REGIONS.includes(region))) continue;
    edges.push({ a, b, size, regions });
  }
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const line = edge => `  Object.freeze({ a: Object.freeze([${edge.a}]), b: Object.freeze([${edge.b}]), size: '${edge.size}', `
    + `regions: Object.freeze([${edge.regions.map(region => JSON.stringify(region)).join(', ')}]) }),`;
  return `${HEADER}export const RIVER_SOURCE = Object.freeze({ map: 'world-builder/map/resources/examples/azhora.wwmap', sha256: '${sha256}',
  regions: Object.freeze(${JSON.stringify(RIVER_REGIONS)}), edgeCount: ${edges.length} });

/** Every authored river edge on or inside the regions above: the hex pair it runs between, and its size. */
export const RIVER_EDGES = Object.freeze([
${edges.map(line).join('\n')}
]);
`;
}

const HEADER = `// GENERATED by scripts/build-region-rivers.mjs from the World Builder map's river edges.
// Do not edit by hand; tests/pueth-world.test.js checks it against the map.
`;

if (process.argv[1]?.endsWith('build-region-rivers.mjs')) {
  const source = readMap();
  if (!source) throw new Error(`The World Builder map was not found at ${MAP_PATH}.`);
  const target = path.join(root, 'src/world/terrain/region-rivers.js');
  writeFileSync(target, buildSource(source));
  console.log(`Wrote ${target}`);
}
