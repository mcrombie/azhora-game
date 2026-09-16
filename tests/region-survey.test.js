import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildSource, PLAYABLE, WINDOW } from '../scripts/build-region-survey.mjs';
import { PLAYABLE_SURVEY, LAND_HEXES, SURVEY_ORIGIN } from '../src/region-survey.js';
import { regionCells, regionOutline, worldBoundsFor, routeAnchors } from '../src/region-layout.js';

const atlasPath = new URL('../assets/azhora-dev-regions.json', import.meta.url);
const atlas = JSON.parse(readFileSync(atlasPath, 'utf8'));

test('the baked survey is exactly what the atlas says, and has not drifted', () => {
  const generated = buildSource(atlas);
  const shipped = readFileSync(new URL('../src/region-survey.js', import.meta.url), 'utf8');
  assert.equal(shipped.replace(/\r\n/g, '\n'), generated.replace(/\r\n/g, '\n'),
    'src/region-survey.js is stale: run `node scripts/build-region-survey.mjs`');
});

test('the baked survey carries the four playable regions and the land around them', () => {
  assert.deepEqual(PLAYABLE_SURVEY.regions.map(region => region.name), PLAYABLE);
  assert.deepEqual(SURVEY_ORIGIN, atlas.origin);
  for (const name of PLAYABLE) {
    const source = atlas.regions.find(region => (region.name ?? region.id) === name);
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
  assert.ok(LAND_HEXES.length > PLAYABLE_SURVEY.regions.reduce((sum, region) => sum + region.cells.length, 0) * 2);
  for (const [q, r] of LAND_HEXES) assert.ok(q >= WINDOW.minQ && q <= WINDOW.maxQ && r >= WINDOW.minR && r <= WINDOW.maxR);
});

test('the baked survey and the atlas produce identical geometry', () => {
  for (const name of PLAYABLE) {
    const baked = regionCells(PLAYABLE_SURVEY, name), source = regionCells(atlas, name);
    assert.deepEqual(baked, source, name);
    assert.deepEqual(regionOutline(PLAYABLE_SURVEY, name), regionOutline(atlas, name), name);
  }
  assert.deepEqual(worldBoundsFor(PLAYABLE_SURVEY), worldBoundsFor(atlas));
  assert.deepEqual(routeAnchors(PLAYABLE_SURVEY), routeAnchors(atlas));
});
