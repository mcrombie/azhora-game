import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { regionAt, regionNameAt, insideRegion, isOpenCountry, OPEN_COUNTRY, REGION_ORDER, REGION_CELLS, WORLD_BOUNDS } from '../src/region-world.js';
import { createMapTutorial } from '../src/map-tutorial.js';

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
