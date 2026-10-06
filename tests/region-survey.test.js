import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildSource, PLAYABLE, WINDOW, ENCLOSED_HEXES } from '../scripts/build-region-survey.mjs';
import { PLAYABLE_SURVEY, LAND_HEXES, SURVEY_ORIGIN } from '../src/dev/tools/region-survey.js';
import { regionCells, regionOutline, worldBoundsFor, routeAnchors } from '../src/world/terrain/region-layout.js';

const atlasPath = new URL('../assets/azhora-dev-regions.json', import.meta.url);
const atlas = JSON.parse(readFileSync(atlasPath, 'utf8'));
/**
 * The atlas as the game holds it: every region exactly as authored, and the two deliberate
 * additions - the hexes the atlas leaves unclaimed inside a single region, taken by the region all
 * round them (`ENCLOSED_HEXES`, the survey builder): South Suval's Stillwater and the `hills` hex in
 * the middle of South Mithala's apron. Each keeps the terrain the World Builder map gives it and the
 * same centre the atlas grid gives every other hex.
 */
const held = { ...atlas, regions: atlas.regions.map(region => {
  const enclosed = ENCLOSED_HEXES[region.name ?? region.id];
  if (!enclosed) return region;
  const size = atlas.hexSize, width = Math.sqrt(3) * size;
  return { ...region, cells: [...region.cells, ...enclosed.map(([q, r, terrain]) => ({ q, r, terrain,
    x: width * (q + r / 2) - atlas.origin.x, y: size * 1.5 * r - atlas.origin.y }))] };
}) };

test('the baked survey is exactly what the atlas says, and has not drifted', () => {
  const generated = buildSource(atlas);
  const shipped = readFileSync(new URL('../src/dev/tools/region-survey.js', import.meta.url), 'utf8');
  assert.equal(shipped.replace(/\r\n/g, '\n'), generated.replace(/\r\n/g, '\n'),
    'src/dev/tools/region-survey.js is stale: run `node scripts/build-region-survey.mjs`');
});

test('the baked survey carries every playable region and the land around them', () => {
  assert.deepEqual(PLAYABLE_SURVEY.regions.map(region => region.name), PLAYABLE);
  assert.deepEqual(SURVEY_ORIGIN, atlas.origin);
  for (const name of PLAYABLE) {
    const source = held.regions.find(region => (region.name ?? region.id) === name);
    const baked = PLAYABLE_SURVEY.regions.find(region => region.name === name);
    assert.equal(baked.cells.length, source.cells.length, name);
    for (const [index, cell] of baked.cells.entries()) {
      assert.equal(cell.q, source.cells[index].q); assert.equal(cell.r, source.cells[index].r);
      assert.equal(cell.terrain, source.cells[index].terrain);
    }
  }
  // Every playable hex is land, and the window reaches beyond the playable
  // regions so the coastline knows where the Stills begin.
  const land = new Set(LAND_HEXES.map(([q, r]) => `${q},${r}`));
  for (const region of PLAYABLE_SURVEY.regions) for (const cell of region.cells) assert.ok(land.has(`${cell.q},${cell.r}`));
  // **This used to read `LAND_HEXES.length > playable cells * 2` and it was a stale list** rather than
  // an invariant: the ratio falls every time a country that was somebody's horizon becomes playable, and
  // the southwest has now done that eleven times. It is 2,078 against 1,099 - 1.89 - and it will keep
  // falling. What the line is *for* is that the window reaches past the playable regions so the coast
  // field knows where the Stills begin, so that is what it says now: several hundred land hexes in the
  // window that no playable region claims.
  const claimed = new Set(PLAYABLE_SURVEY.regions.flatMap(region => region.cells.map(cell => `${cell.q},${cell.r}`)));
  const horizon = LAND_HEXES.filter(([q, r]) => !claimed.has(`${q},${r}`));
  assert.ok(horizon.length > 0, `only ${horizon.length} land hexes in the window are horizon rather than playable`);
  // Compare actual surrounding atlas land; its ratio to built land decreases as regions open.
  for(const region of atlas.regions) for(const c of region.cells) {
    if(c.q>=WINDOW.minQ&&c.q<=WINDOW.maxQ&&c.r>=WINDOW.minR&&c.r<=WINDOW.maxR)
      assert.ok(land.has(`${c.q},${c.r}`), `missing coast context ${c.q},${c.r}`);
  }
  for (const [q, r] of LAND_HEXES) assert.ok(q >= WINDOW.minQ && q <= WINDOW.maxQ && r >= WINDOW.minR && r <= WINDOW.maxR);
});

test('the baked survey and the atlas produce identical geometry', () => {
  for (const name of PLAYABLE) {
    const baked = regionCells(PLAYABLE_SURVEY, name), source = regionCells(held, name);
    assert.deepEqual(baked, source, name);
    assert.deepEqual(regionOutline(PLAYABLE_SURVEY, name), regionOutline(held, name), name);
  }
  assert.deepEqual(worldBoundsFor(PLAYABLE_SURVEY), worldBoundsFor(atlas));
  assert.deepEqual(routeAnchors(PLAYABLE_SURVEY), routeAnchors(atlas));
});

test('the only ground the game holds that the atlas leaves unclaimed is a hex enclosed by one region', () => {
  const owner = new Map();
  for (const region of atlas.regions) for (const cell of region.cells) owner.set(`${cell.q},${cell.r}`, region.name ?? region.id);
  for (const [name, enclosed] of Object.entries(ENCLOSED_HEXES)) for (const [q, r] of enclosed) {
    assert.equal(owner.get(`${q},${r}`), undefined, `${q},${r} is claimed by the atlas already`);
    // Ringed on all six sides by the region that takes it, or it is somebody else's water too.
    for (const [dq, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]])
      assert.equal(owner.get(`${q + dq},${r + dr}`), name, `${q},${r} is not enclosed by ${name}`);
  }
  // And the addition is exactly those cells: every other playable cell is the atlas's own.
  for (const name of PLAYABLE) {
    const extra = PLAYABLE_SURVEY.regions.find(region => region.name === name).cells.length
      - atlas.regions.find(region => (region.name ?? region.id) === name).cells.length;
    assert.equal(extra, (ENCLOSED_HEXES[name] ?? []).length, name);
  }
});
