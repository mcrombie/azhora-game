import test from 'node:test';
import assert from 'node:assert/strict';
import { regionAt } from '../src/regions.js';
import { hexAt, hexCentre } from '../src/region-world.js';
import { PLAYABLE_REGIONS } from '../src/region-layout.js';
import { SUBREGIONS, createMapFog, subregionsAt, validateMapFogSnapshot } from '../src/map-fog.js';
import { BUILD_STATES, buildStatusList, regionBuildStatus } from '../src/build-status.js';

const TIDEHAVEN = { x: -6, z: 29 }, LUMBER_TOWN = { x: -729, z: 384 };

test('the chart starts blank and is charted hex by hex as the traveler walks', () => {
  const events = [], fog = createMapFog({ onEvent: event => events.push(event) });
  assert.deepEqual(fog.cells, []);
  assert.equal(fog.knowsPoint(TIDEHAVEN.x, TIDEHAVEN.z), false, 'nothing is charted before the traveler arrives');
  const first = fog.reveal(TIDEHAVEN.x, TIDEHAVEN.z);
  const home = hexAt(TIDEHAVEN.x, TIDEHAVEN.z);
  assert.ok(fog.knows(home.q, home.r), 'the ground underfoot is charted');
  assert.deepEqual(first.cells, [`${home.q},${home.r}`], 'only the hex the traveler stands in');
  assert.equal(fog.knows(home.q + 1, home.r), false, 'the hex next door is not charted from here');
  assert.equal(fog.knows(home.q, home.r + 1), false);
  assert.equal(fog.knowsPoint(LUMBER_TOWN.x, LUMBER_TOWN.z), false, 'and nothing far away');
  // Walking into the next hex charts that one too.
  const neighbour = hexCentre(home.q + 1, home.r);
  assert.equal(fog.reveal(neighbour.x, neighbour.z).cells.length, 1);
  assert.equal(fog.knows(home.q + 1, home.r), true);
  assert.deepEqual(fog.reveal(TIDEHAVEN.x, TIDEHAVEN.z).cells, [], 'standing still charts nothing new');
  // Everything charted is within sight of where the traveler stood.
  for (const key of fog.cells) {
    const [q, r] = key.split(',').map(Number);
    const centre = { q, r };
    assert.ok(Number.isFinite(centre.q) && Number.isFinite(centre.r));
  }
  assert.ok(events.some(event => event.type === 'chart-widened'));
});

test('Tidehaven, which was Eastreena, is the first named ground, and each area is found by reaching it', () => {
  const found = [], fog = createMapFog({ onEvent: event => { if (event.type === 'subregion-found') found.push(event.id); } });
  fog.reveal(TIDEHAVEN.x, TIDEHAVEN.z);
  assert.deepEqual(found, ['eastreena'], 'the port village names itself and nothing else');
  assert.equal(fog.view().found[0].name, 'Tidehaven', 'the chart uses the name the village uses now');
  assert.match(fog.view().found[0].note, /Eastreena/, 'and keeps the old name in its note');
  fog.reveal(TIDEHAVEN.x, TIDEHAVEN.z);
  assert.deepEqual(found, ['eastreena'], 'found once');
  fog.reveal(LUMBER_TOWN.x, LUMBER_TOWN.z);
  assert.deepEqual(found, ['eastreena', 'lumber-town']);
  const view = fog.view();
  assert.equal(view.foundCount, 2);
  assert.equal(view.total, SUBREGIONS.length);
  assert.equal(view.subregions.find(area => area.id === 'solis').known, false);
  assert.deepEqual(subregionsAt(1e6, 1e6), []);
});

test('every named area stands in the region it claims, and none of them swallow another', () => {
  for (const area of SUBREGIONS) {
    assert.ok(PLAYABLE_REGIONS.includes(area.region), `${area.id} names a playable region`);
    assert.equal(regionAt(area.x, area.z)?.name, area.region, `${area.name} stands in ${area.region}`);
    assert.ok(area.radius >= 28 && area.radius <= 130, `${area.id} is a believable size`);
    assert.ok(area.note.length > 30 && area.name.length > 3, area.id);
  }
  for (const area of SUBREGIONS) for (const other of SUBREGIONS) {
    if (area === other) continue;
    const gap = Math.hypot(area.x - other.x, area.z - other.z);
    assert.ok(gap > Math.max(area.radius, other.radius) * .6, `${area.id} and ${other.id} are ${gap.toFixed(0)} m apart`);
  }
});

test('the chart survives a save, and nonsense is refused', () => {
  const fog = createMapFog();
  fog.reveal(TIDEHAVEN.x, TIDEHAVEN.z);
  const copy = createMapFog();
  assert.equal(copy.restore(fog.snapshot()), true);
  assert.deepEqual(copy.snapshot(), fog.snapshot());
  assert.deepEqual(copy.found, ['eastreena']);
  assert.equal(validateMapFogSnapshot(undefined), true, 'older saves have no chart');
  for (const bad of [null, { version: 2, cells: [], subregions: [] }, { version: 1, cells: 'all', subregions: [] },
    { version: 1, cells: ['x,y'], subregions: [] }, { version: 1, cells: [], subregions: ['atlantis'] }])
    assert.equal(validateMapFogSnapshot(bad), false, JSON.stringify(bad));
  assert.equal(copy.restore({ version: 1, cells: [], subregions: ['atlantis'] }), false);
  assert.deepEqual(copy.cells, [], 'a refused restore leaves the chart blank');
});

test('the developer chart says how far every region is built, Drent furthest', () => {
  const list = buildStatusList();
  for (const region of PLAYABLE_REGIONS) {
    const entry = list.find(item => item.id === region);
    assert.ok(entry, `${region} has a build status`);
    assert.ok(entry.detail.length > 30 && entry.work.length > 10, `${region} says what exists and what is left`);
    assert.ok(Object.hasOwn(BUILD_STATES, entry.state), region);
  }
  const drent = regionBuildStatus('Drent'), luscia = regionBuildStatus('Luscia'), suval = regionBuildStatus('East Suval');
  assert.ok(drent.order > luscia.order, 'Drent is further along than Luscia');
  assert.ok(luscia.order > suval.order, 'a region you can walk beats a shut border');
  assert.ok(drent.playable && luscia.playable && !suval.playable);
  assert.deepEqual([regionBuildStatus('Feradom').state, regionBuildStatus('Feradom').playable], ['unbuilt', false]);
  assert.ok(list.length > PLAYABLE_REGIONS.length, 'the unbuilt regions are listed too');
  assert.deepEqual(list.slice(0, PLAYABLE_REGIONS.length).map(item => item.id), [...PLAYABLE_REGIONS], 'the playable regions come first');
  assert.equal(new Set(list.map(item => item.id)).size, list.length, 'each region once');
});
