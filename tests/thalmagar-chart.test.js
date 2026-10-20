import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildThalmagarRelief } from '../scripts/atlas-thalmagar.mjs';
import { acorGround, acorProfile } from '../src/content/regions/acor/acor-world.js';
import { TRANSFORM } from '../src/world/terrain/region-world.js';
import { THALMAGAR_FORTRESS as site, THALMAGAR_CURTAIN, THALMAGAR_DARK_TOWER } from '../src/content/regions/thalmagar/thalmagar-fortress-site.js';
import { atlasPlaceMarks, atlasMarkKnown, atlasCellKey, splitAtlasRegionLabels } from '../src/ui/map/world-map-detail.js';

test('charted cape relief follows the playable height field with bounded export work', () => {
  const relief = buildThalmagarRelief(), region = acorProfile(site.region);
  assert.ok(relief.sampleCount < 3000);
  assert.ok(relief.hachures.length > 10);
  let points = 0;
  for (const contour of relief.contours) for (const line of contour.lines) for (const p of line) {
    assert.ok(Number.isFinite(p.x + p.z));
    assert.ok(Math.abs(acorGround(p.x, p.z) - contour.level) < 3, `contour ${contour.level} follows ground at ${p.x},${p.z}`);
    points++;
  }
  assert.ok(points > 100);
  assert.ok(THALMAGAR_CURTAIN.every(p => region.owns(p.x, p.z)));
  assert.equal(THALMAGAR_DARK_TOWER.x, site.x);
  assert.equal(THALMAGAR_DARK_TOWER.z, site.z);
});

test('fortress badge sits on the built keep, obeys discovery and preserves quest markers', () => {
  const original = { id: 'thalmagar-black-fortress', name: 'The Black Fortress', kind: 'area', ...TRANSFORM.worldToAtlas(site.arrival.x, site.arrival.z) };
  const badge = atlasPlaceMarks([original]).find(p => p.id === original.id);
  assert.equal(badge.subtitle, "Dark Wizard's Tower");
  assert.equal(badge.kind, 'city');
  assert.deepEqual({ x: badge.x, y: badge.y }, TRANSFORM.worldToAtlas(site.x, site.z));
  assert.equal(atlasMarkKnown(badge, new Set()), false);
  assert.equal(atlasMarkKnown(badge, new Set([atlasCellKey(badge)])), true);
  assert.equal(atlasMarkKnown(badge, new Set(), true), true);
  for (const kind of ['quest', 'tracked']) {
    const marker = { ...original, kind, name: 'Reach the southern gate' };
    assert.deepEqual(atlasPlaceMarks([marker]).find(p => p.id === marker.id), marker);
  }
});

test('exported cape relief and fortress remain in the fog-covered base map', () => {
  const svg = readFileSync(new URL('../assets/azhora-world-map.svg', import.meta.url), 'utf8');
  const { terrain, labels } = splitAtlasRegionLabels(svg);
  assert.match(terrain, /id="thalmagar-relief" clip-path="url\(#thalmagar-land-clip\)"/);
  assert.match(terrain, /data-feature="dark-tower"/);
  assert.match(terrain, /data-feature="curtain"/);
  assert.doesNotMatch(labels, /thalmagar-relief|data-feature=/);
  assert.equal((labels.match(/data-region="Cape Thalmagar"/g) ?? []).length, 1);
  const metadata = JSON.parse(readFileSync(new URL('../assets/azhora-world-map.json', import.meta.url), 'utf8'));
  assert.ok(metadata.authoredDetails.includes('thalmagar-dark-wizard-tower'));
  assert.equal(metadata.regionCount, 132);
  assert.equal(metadata.riverCount, 578);
});
