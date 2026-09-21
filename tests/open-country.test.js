import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { regionAt, regionNameAt, insideRegion, isOpenCountry, OPEN_COUNTRY, REGION_ORDER, REGION_CELLS, WORLD_BOUNDS,
  SHORE_FRINGE, hexAt, hexCentre } from '../src/region-world.js';
import { createMapTutorial } from '../src/map-tutorial.js';
import { canStand } from '../src/game-state.js';
import { WEATHERHEAD } from '../src/pipeweed.js';

const source = name => readFileSync(fileURLToPath(new URL(`../src/${name}`, import.meta.url)), 'utf8');
import { roadAudioProfile } from '../src/road-audio.js';
import { buildLocalMapModel } from '../src/local-map-data.js';
import { projectTrailPoint } from '../src/trail-map.js';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';

let world = null;
const built = async () => (world ??= (async () => {
  const { createWorld } = await sourceModule('../src/world.js');
  return createWorld(new THREE.Scene());
})());


/** The worst of the unowned west, measured in docs/known-issues.md. */
const UNOWNED = [
  { x: -1150, z: 1960, was: 'Nesdor', note: 'a kilometre south of Nesdor’s outline' },
  { x: -2250, z: 1092, was: 'Caricas', note: '606 m west of Caricas' },
  { x: -2310, z: -728, was: 'Meneth', note: 'the west edge past Meneth' },
  { x: -1146, z: 1964, was: 'West Izol', note: 'an island’s name on the mainland, a kilometre off' },
];

test('ground outside every outline is open country, not the nearest neighbour’s name', () => {
  assert.deepEqual([OPEN_COUNTRY.id, OPEN_COUNTRY.open, isOpenCountry(OPEN_COUNTRY)], [0, true, true]);
  assert.ok(OPEN_COUNTRY.name && OPEN_COUNTRY.subtitle && OPEN_COUNTRY.description, 'it has something to say for itself');
  assert.ok(!REGION_ORDER.includes(OPEN_COUNTRY.name), 'and it is not one of the provinces');
  for (const spot of UNOWNED) {
    const here = regionAt(spot.x, spot.z);
    assert.ok(isOpenCountry(here), `(${spot.x}, ${spot.z}) is still called ${here?.name} — ${spot.note}`);
    assert.equal(regionNameAt(spot.x, spot.z), OPEN_COUNTRY.name);
    assert.equal(insideRegion(spot.was, spot.x, spot.z), false, `and it is genuinely outside ${spot.was}`);
  }
  // No province answers to the sentinel's id, and nothing else answers isOpenCountry.
  for (const name of REGION_ORDER) {
    const cell = REGION_CELLS[name][0], here = regionAt(cell.x, cell.z);
    assert.equal(here.name, name, `${name}'s own ground still answers ${name}`);
    assert.ok(!isOpenCountry(here) && here.id > 0, `${name} is a province`);
  }
  assert.equal(regionAt(NaN, 0), null, 'nonsense is still nothing at all');
  assert.equal(isOpenCountry(null), false);
  assert.equal(isOpenCountry({ id: 0 }), false, 'an id of nought is not enough to be open country');
});

test('a traveler walks from a province into open country and back without the world guessing', () => {
  // Nesdor's outline ends at z = 953; the ground runs on to the bounds.
  const inside = regionAt(-1600, 800), beyond = regionAt(-1600, 1600);
  assert.equal(inside.name, 'Nesdor');
  assert.ok(isOpenCountry(beyond), `a kilometre further south is ${beyond.name}`);
  assert.ok(WORLD_BOUNDS.maxZ > 1600, 'and it is inside the world the traveler can walk');
});

test('walking off the atlas is not arriving in a province', () => {
  const tutorial = createMapTutorial();
  assert.equal(tutorial.shouldStart({ regionId: 1 }), false, 'Drent is where you start');
  assert.equal(tutorial.shouldStart({ regionId: OPEN_COUNTRY.id }), false, 'and open country is not a province');
  assert.equal(tutorial.shouldStart({ regionId: 2 }), true, 'Luscia is');
  assert.equal(tutorial.shouldStart({ regionId: 14 }), true);
});

test('the readers of regionAt say open country rather than borrowing a name', () => {
  const main = source('main.js'), world = source('world.js'), minimap = source('minimap.js');
  assert.match(main, /if\(isOpenCountry\(region\)\)return 'AZHORA . NO COUNTRY CLAIMS THIS'/, 'the kicker');
  assert.match(main, /OUTSIDE EVERY BORDER THE ATLAS DRAWS/, 'the region card');
  assert.match(main, /if\(widened\.cells\.length&&here&&!isOpenCountry\(here\)\)cartography\.noteHex\(here\.name\)/, 'the chart of countries');
  assert.match(main, /return here&&!isOpenCountry\(here\)\?here\.name:null;/, 'and nobody living nowhere gives directions');
  // The card gives the words; the number belongs to the cartography journal (docs/design-answers.md).
  assert.match(main, /levelWords\(regionLevel\(region\.name\)\)/, 'the card says how hard a country is, in words');
  assert.match(world, /regionAt\(batchCenter\.x, batchCenter\.z\)\?\.id \|\| 1/, 'scenery batching keeps its old district');
  assert.match(minimap, /open: region\?\.open === true/, 'the minimap knows');
});

test('open country plays no country’s bed: wind, and earth underfoot', () => {
  const at = { x: -1600, z: 1600 };
  const open = roadAudioProfile({ position: at, region: OPEN_COUNTRY });
  assert.equal(open.region, 0, 'it keeps its own id rather than falling back to Drent');
  // Drent's forest bed was what the fallback used to play a kilometre south of Nesdor.
  const drent = roadAudioProfile({ position: at, region: 1 });
  assert.ok(drent.forest > 0, 'Drent has a forest bed');
  for (const bed of ['sea', 'forest', 'field', 'river', 'ridge']) assert.equal(open[bed], 0, `open country plays no ${bed}`);
  assert.equal(open.surface, 'earth');
  // A region that is missing or nonsense still falls back to 1, as it always did.
  for (const bad of [undefined, null, NaN, -1, 'somewhere']) assert.equal(roadAudioProfile({ position: at, region: bad }).region, 1, String(bad));
  assert.equal(roadAudioProfile({ position: at, region: { id: 0, open: true } }).region, 0);
});

test('the trails tab opens the nearest sheet in open country, and says you are off it', async () => {
  const world = await built();
  // Nesdor's outline ends at z = 953; this is a kilometre past it, on ground nobody owns.
  const away = { x: -1600, z: 1900 };
  assert.ok(isOpenCountry(world.regionAt(away.x, away.z)), 'the ground under him is open country');
  const model = buildLocalMapModel({ world, position: away });
  assert.equal(model.outside, true, 'the model says he is outside every border');
  const sheet = model.regions.find(region => region.id === model.currentRegionId);
  assert.ok(sheet, 'and still opens somebody’s sheet');
  // The nearest one, not Drent-by-default a thousand kilometres away.
  const gapTo = region => Math.hypot(Math.max(region.bounds.minX - away.x, 0, away.x - region.bounds.maxX),
    Math.max(region.bounds.minZ - away.z, 0, away.z - region.bounds.maxZ));
  for (const other of model.regions) assert.ok(gapTo(sheet) <= gapTo(other) + 1e-6, `${other.name} is nearer than ${sheet.name}`);
  assert.notEqual(sheet.name, 'Drent', 'the far west does not open Tidehaven’s sheet');
  // And the player is honestly off the sheet rather than clamped onto its edge.
  assert.equal(projectTrailPoint(model.player, model.bounds).inside, false, 'he is not pretended onto the border');
  // Inside a country, nothing changed.
  const home = buildLocalMapModel({ world, position: { x: -20, z: 29 } });
  assert.equal(home.outside, false);
  assert.equal(home.regions.find(region => region.id === home.currentRegionId).name, 'Drent');
  assert.equal(projectTrailPoint(home.player, home.bounds).inside, true);
  // The caption is the one place a player reads it.
  const map = readFileSync(fileURLToPath(new URL('../src/trail-map.js', import.meta.url)), 'utf8');
  assert.match(map, /model\.outside \? `You are outside every border the atlas draws/, 'the sheet says so');
});

test('a country’s own shore is that country, and the fringe stops at the shore', async () => {
  const world = await built();
  // The atlas is drawn in 100 m hexes; the world is built in metres, so Drent's beach runs on
  // east of the last hex Drent owns. That fringe is Drent (SHORE_FRINGE, src/region-world.js);
  // the unowned west, which is hundreds of metres past the outlines, is not.
  assert.equal(SHORE_FRINGE, 76, 'the fringe is the measured one, not a rounder guess');

  // The Weatherhead, where Cabe sits: every standable cell of his hill is Drent, not nowhere.
  const r = WEATHERHEAD.r ?? 14;
  let standable = 0, offAtlas = 0;
  for (let dx = -r; dx <= r; dx += 0.5) for (let dz = -r; dz <= r; dz += 0.5) {
    if (Math.hypot(dx, dz) > r) continue;
    const x = WEATHERHEAD.x + dx, z = WEATHERHEAD.z + dz;
    if (!canStand(x, z, world, 0.5)) continue;
    standable++;
    if (!insideRegion('Drent', x, z)) offAtlas++;
    assert.equal(regionAt(x, z).name, 'Drent', `the Weatherhead reads ${regionAt(x, z).name} at ${x}, ${z}`);
  }
  assert.ok(standable > 1000, `the hill is walkable (${standable} cells)`);
  assert.ok(offAtlas > 0, 'and a real part of it is off the atlas’s own hexes, which is the point');
  assert.equal(regionAt(WEATHERHEAD.stand.x, WEATHERHEAD.stand.z).name, 'Drent', 'including the stand itself');

  // Walking inland out to the water is not a border crossing: no standable step of it is
  // nowhere, so the card, the kicker, the minimap caption and the autosave-on-enter never
  // fire on a man walking down Tidehaven's own beach. Past the water's edge there is nothing
  // to stand on and open country is the right answer again.
  for (const z of [104, 120, 127]) {
    let walked = 0;
    for (let x = -30; x <= 40; x += 0.5) {
      if (!canStand(x, z, world, 0.5)) continue;
      walked++;
      assert.equal(regionAt(x, z).name, 'Drent', `a hole in the shore at ${x}, ${z}`);
    }
    assert.ok(walked > 40, `the strand at z=${z} is walkable (${walked} steps)`);
  }

  // Well out to sea is still open country: the fringe is a fringe, not a claim on the water.
  for (const at of [{ x: 200, z: 104 }, { x: 300, z: 40 }]) {
    assert.ok(isOpenCountry(regionAt(at.x, at.z)), `(${at.x}, ${at.z}) at sea reads ${regionAt(at.x, at.z).name}`);
    assert.equal(canStand(at.x, at.z, world), false, 'and nobody can stand there anyway');
  }
  // And deep in the unowned west it changes nothing at all.
  for (const at of UNOWNED) assert.ok(isOpenCountry(regionAt(at.x, at.z)), `${at.note} reads ${regionAt(at.x, at.z).name}`);

  // The fringe is never wider than it says: a point beyond it, off every hex, is open country.
  const far = { x: -1600, z: 1600 }, home = hexAt(far.x, far.z), centre = hexCentre(home.q, home.r);
  assert.ok(Math.hypot(centre.x - far.x, centre.z - far.z) < SHORE_FRINGE, 'even within a hex of its own centre');
  assert.ok(isOpenCountry(regionAt(far.x, far.z)), 'it is the owner that is missing, not the distance');

  // insideRegion stays strict: it promises no fringe and its callers rely on that.
  assert.equal(insideRegion('Drent', WEATHERHEAD.stand.x, WEATHERHEAD.stand.z), false,
    'the stand is genuinely outside the authored outline; only regionAt forgives it');
});

test('what the traveler is told and where a tree may go are two questions', () => {
  // `regionAt` carries the shore fringe and `regionNameAt` does not, which is a trap unless it
  // is written down and held. Every caller of `regionNameAt` in src/ is a scatter filter — it
  // asks whose hex this is, so that Caricas's forest goes on Caricas's hexes — and handing it
  // the fringe re-seeds all of them: about 4,700 colliders moved across the west when it was
  // tried, because a rejected candidate still advances the seeded stream, and the west's
  // animals are tuned against the scatter as it stands (tests/west-life.test.js).
  const stand = WEATHERHEAD.stand;
  assert.equal(regionAt(stand.x, stand.z).name, 'Drent', 'the traveler is in Drent on his own beach');
  assert.equal(regionNameAt(stand.x, stand.z), OPEN_COUNTRY.name, 'and no tree of Drent’s is planted there');
  assert.equal(insideRegion('Drent', stand.x, stand.z), false, 'the authored outline agrees with the scatter');

  // On a region's own hexes the two never disagree, which is all the scatter ever sees.
  for (const name of REGION_ORDER) {
    const cell = REGION_CELLS[name][0];
    assert.equal(regionAt(cell.x, cell.z).name, name);
    assert.equal(regionNameAt(cell.x, cell.z), name, `${name} disagrees with itself on its own ground`);
  }
  // And out in the unowned west they agree too: the fringe is tens of metres, that is hundreds.
  for (const spot of UNOWNED) {
    assert.equal(regionAt(spot.x, spot.z).name, OPEN_COUNTRY.name);
    assert.equal(regionNameAt(spot.x, spot.z), OPEN_COUNTRY.name);
  }
  assert.equal(regionNameAt(NaN, 0), null, 'nonsense is nothing to either of them');

  // The scatter modules are the callers this is for; if one of them moves to regionAt, the
  // west's scenery moves with it and this test should be the thing that asks why.
  for (const name of ['west-regions-scenery.js', 'amod-scenery.js', 'pueth-scenery.js', 'world-regions.js']) {
    const text = source(name);
    assert.match(text, /regionNameAt/, `${name} scatters by hex ownership`);
    assert.doesNotMatch(text, /\bregionAt\(/, `${name} should not scatter by what the traveler is told`);
  }
});
