import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { REGION_IDS } from '../src/region-world.js';
import { REGIONAL_LIFE_SITES } from '../src/regional-life.js';

/**
 * A place that carries a region says which country it belongs to. `world.regionAt`
 * says which country its coordinates are in. When those two disagree the map, the
 * journal and the story layer are describing different worlds — and the coordinates
 * are the ones a traveler actually walks on, so they are what a region field has to
 * agree with.
 */
const { createWorld } = await sourceModule('../src/world.js');
const { REGIONAL_PLACES, REGIONAL_ACTIVITY_SITES } = await sourceModule('../src/regional-places.js');
const world = createWorld(new THREE.Scene());
const REGION_NAMES = Object.fromEntries(Object.entries(REGION_IDS).map(([name, id]) => [id, name]));
const disagreements = places => places.filter(place => Number.isFinite(place.x) && place.region !== undefined)
  .map(place => ({ id: place.id, says: REGION_NAMES[place.region] ?? place.region, stands: world.regionAt(place.x, place.z)?.name, x: place.x, z: place.z }))
  .filter(row => row.says !== row.stands)
  .map(row => `${row.id} says ${row.says} but stands in ${row.stands} at ${row.x.toFixed(0)}, ${row.z.toFixed(0)}`);

test('every landmark that names a region names the region its coordinates are in', () => {
  assert.deepEqual(disagreements(world.landmarks), []);
});

test('the three workyards agree with the ground under them in both the scenery layer and the story layer', () => {
  // The header of src/regional-places.js names them in prose: the Avrel clearing mill in
  // Drent, the reedcutters' landing on the Luscia bank, the roofless waystation in East Suval.
  assert.deepEqual(disagreements([...REGIONAL_PLACES, ...Object.values(REGIONAL_ACTIVITY_SITES), ...REGIONAL_LIFE_SITES]), []);
  const byId = new Map([...REGIONAL_PLACES, ...Object.values(REGIONAL_ACTIVITY_SITES)].map(place => [place.id, place]));
  for (const site of REGIONAL_LIFE_SITES) {
    const twin = byId.get(site.id);
    if (twin) assert.equal(twin.region, site.region, `${site.id} is in one region for the scenery and another for the story`);
  }
});

test('nobody the world places is standing outside every region', () => {
  const lost = Object.entries(world.npcPositions).filter(([, place]) => !world.regionAt(place.x, place.z))
    .map(([id, place]) => `${id} at ${place.x.toFixed(0)}, ${place.z.toFixed(0)}`);
  assert.deepEqual(lost, []);
});
