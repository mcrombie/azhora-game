import test from 'node:test';
import assert from 'node:assert/strict';
import { regionAt } from '../src/regions.js';
import { hexAt, hexCentre, insideRegion } from '../src/region-world.js';
import { PLAYABLE_REGIONS } from '../src/region-layout.js';
import { SUBREGIONS, createMapFog, chartKnowsPoint, subregionsAt, validateMapFogSnapshot } from '../src/map-fog.js';
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

test('entering a hex confirms it and only glimpses the terrain in its six neighbours', () => {
  const fog = createMapFog(), home = hexAt(TIDEHAVEN.x, TIDEHAVEN.z);
  const first = fog.reveal(TIDEHAVEN.x, TIDEHAVEN.z), view = fog.view();
  assert.equal(first.cells.length, 1, 'cartography can count only this entered hex');
  assert.equal(first.glimpsed.length, 6);
  assert.equal(view.cellCount, 1);
  assert.equal(view.glimpsed.length, 6);
  assert.ok(!view.glimpsed.includes(first.cells[0]));
  const next = hexCentre(home.q + 1, home.r);
  assert.equal(chartKnowsPoint(view.cells, next.x, next.z), false, 'a vague neighbour cannot expose roads or location details');
  assert.equal(chartKnowsPoint(new Set(view.cells), TIDEHAVEN.x, TIDEHAVEN.z), true);
  const entered = fog.reveal(next.x, next.z);
  assert.equal(entered.cells.length, 1, 'walking into a glimpse earns one actual visit');
  assert.ok(!fog.glimpsed.includes(`${home.q + 1},${home.r}`), 'the confirmed hex leaves the vague ring');
  assert.equal(fog.glimpsed.length, 8, 'two adjacent visits share one continuous outer ring');
  assert.equal(fog.view().cellCount, 2);
  assert.deepEqual(fog.reveal(next.x, next.z), { cells: [], glimpsed: [], subregions: [] }, 'standing still grants no extra progress');
  assert.equal(chartKnowsPoint(fog.cells, NaN, 0), false);
});

test('old visited cells survive intact while adjacent terrain is rebuilt without expanding the save', () => {
  const home = hexAt(TIDEHAVEN.x, TIDEHAVEN.z), key = `${home.q},${home.r}`;
  const fog = createMapFog(), legacy = { version: 1, cells: [key], subregions: ['eastreena', 'lumber-town'] };
  assert.equal(fog.restore(legacy), true);
  assert.deepEqual(fog.snapshot(), legacy, 'legacy discoveries and deliberate revealed cells are preserved');
  assert.equal(fog.glimpsed.length, 6);
  assert.equal(fog.cells.length, 1, 'no adjacent hex is mistaken for walked ground');
  assert.deepEqual(fog.view().found.map(area => area.id), ['eastreena'], 'unentered location details remain off the chart');
  fog.reveal(LUMBER_TOWN.x, LUMBER_TOWN.z);
  assert.deepEqual(fog.view().found.map(area => area.id), ['eastreena', 'lumber-town']);
  const copy = createMapFog(); copy.restore(fog.snapshot());
  assert.deepEqual(new Set(copy.glimpsed), new Set(fog.glimpsed));
  assert.deepEqual(copy.snapshot(), fog.snapshot());
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
    // regionAt used to snap unowned ground to the nearest region, which let a centre sit outside
    // its own outline and still pass. It answers open country now, so the outline itself is checked.
    assert.ok(insideRegion(area.region, area.x, area.z), `${area.name} stands outside ${area.region}'s own outline`);
    let owned = 0, samples = 0;
    for (let a = 0; a < 24; a++) for (let r = 1; r <= 4; r++) {
      const d = area.radius * r / 4, angle = a / 24 * Math.PI * 2;
      samples++; if (insideRegion(area.region, area.x + Math.cos(angle) * d, area.z + Math.sin(angle) * d)) owned++;
    }
    // A border post, a harbour and a river bank are meant to straddle: ten areas sit between 63%
    // and 75%. Most of the disc inside is the real bar, and it catches the two that were half out.
    assert.ok(owned / samples > .6, `${area.name} is only ${Math.round(owned / samples * 100)}% inside ${area.region}`);
    assert.ok(area.radius >= 18 && area.radius <= 130, `${area.id} is a believable size`);
    // The usual floor is 28. A ground under it has to have a *reason* to be small, and the reason
    // is always the same one: a neighbour's reach is right there and the ground is sized to what
    // is actually in it. The Toll House, Drent's tenth, is the first - the Caloss Bank's disc
    // comes within twenty metres of the stream crossing.
    if (area.radius < 28) {
      const elbow = SUBREGIONS.filter(other => other !== area)
        .map(other => Math.hypot(area.x - other.x, area.z - other.z) - other.radius - area.radius)
        .sort((a, b) => a - b)[0];
      assert.ok(elbow < 25, `${area.id} is only ${area.radius} m across with ${elbow.toFixed(0)} m of open ground round it`);
    }
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
