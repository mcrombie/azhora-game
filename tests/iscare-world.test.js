import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { REGION_CELLS, regionAt, hexOwnerAt, WORLD_BOUNDS } from '../src/world/terrain/region-world.js';
import { groundWithRiver } from '../src/world/terrain/world-terrain.js';
import { ISCARE_REGION, ISCARE_ISLANDS, ZECRON, ZECRON_BUILDINGS, ISCARE_RUIN_SITES, ISCARE_WILDLIFE_ZONES } from '../src/content/regions/iscare/iscare-world.js';
import { REGIONAL_WILDLIFE_ZONES } from '../src/world/life/regional-wildlife.js';

test('Iscare uses its ten authored island hexes and is distinct from inland Isareos', () => {
  const atlas = JSON.parse(readFileSync(new URL('../assets/azhora-dev-regions.json', import.meta.url)));
  const cells = atlas.regions.find(r => r.name === ISCARE_REGION).cells;
  assert.equal(ISCARE_ISLANDS.length, 10);
  assert.deepEqual(REGION_CELLS[ISCARE_REGION].map(c => [c.q, c.r]), cells.map(c => [c.q, c.r]));
  for (const island of ISCARE_ISLANDS) {
    assert.equal(regionAt(island.x, island.z).name, ISCARE_REGION);
    assert.ok(groundWithRiver(island.x, island.z) > 1);
    assert.ok(island.x >= WORLD_BOUNDS.minX && island.x <= WORLD_BOUNDS.maxX && island.z >= WORLD_BOUNDS.minZ && island.z <= WORLD_BOUNDS.maxZ);
  }
  assert.notEqual(REGION_CELLS[ISCARE_REGION], REGION_CELLS.Isareos);
});

test('Zecron is abandoned and five smaller island settlements carry the same devastation', () => {
  assert.equal(ZECRON.abandoned, true); assert.equal(ZECRON_BUILDINGS.length, 12);
  assert.equal(ISCARE_RUIN_SITES.length, 6);
  for (const site of ISCARE_RUIN_SITES) assert.equal(hexOwnerAt(site.x, site.z), ISCARE_REGION);
  for (const h of ZECRON_BUILDINGS) assert.equal(hexOwnerAt(h.x, h.z), ISCARE_REGION);
});

test('every island has persistent mammals and seabirds wired into the existing wildlife simulation', () => {
  assert.equal(ISCARE_WILDLIFE_ZONES.length, 20);
  for (const island of ISCARE_ISLANDS) {
    const zones = ISCARE_WILDLIFE_ZONES.filter(z => z.id.startsWith(island.id + '-'));
    assert.deepEqual(zones.map(z => z.species), ['upland-hare', 'gull']);
    for (const zone of zones) {
      assert.equal(zone.keepRegion, true); assert.ok(REGIONAL_WILDLIFE_ZONES.includes(zone));
      for (const [x, z] of zone.sites) assert.equal(hexOwnerAt(x, z), ISCARE_REGION);
    }
  }
});
