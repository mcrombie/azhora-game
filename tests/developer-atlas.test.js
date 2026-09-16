import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createDeveloperAtlasData, DEV_WORLD_DESTINATIONS, DEV_ATLAS_PROVENANCE,
  hitAtlasRegion, developerRegionSelection, developerAtlasMarkup, developerLocalRouteMarkup } from '../src/developer-atlas.js';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const metadata = JSON.parse(await read('../assets/azhora-world-map.json'));
const survey = JSON.parse(await read('../assets/azhora-dev-regions.json'));
const svg = await read('../assets/azhora-world-map.svg');
const atlas = createDeveloperAtlasData(metadata, svg, survey);

test('all authored regions have exact polygons, matching survey cells, and their original terrain colors', () => {
  assert.equal(atlas.regions.length, 131);
  assert.equal(atlas.regions.reduce((count, region) => count + region.cells.length, 0), 3733);
  assert.equal(atlas.width, 3062.266);
  assert.equal(atlas.height, 4088);
  assert.equal(atlas.hexSize, 16);
  for (const region of atlas.regions) {
    assert.equal(region.polygons.length, region.cells.length, region.id);
    assert.equal(region.cells.length, region.hexCount, region.id);
    for (const cell of region.cells) {
      assert.match(atlas.palette[cell.terrain], /^#[\da-f]{6}$/i);
      assert.equal(hitAtlasRegion(atlas, cell.x, cell.y)?.id, region.id, `${region.id}: ${cell.q},${cell.r}`);
    }
  }
});

test('developer export is derived from unchanged World Builder source using the same axial projection', async () => {
  const sourceBytes = await readFile(new URL('../../world-builder/map/resources/examples/azhora.wwmap', import.meta.url));
  const hash = createHash('sha256').update(sourceBytes).digest('hex');
  assert.equal(hash, metadata.sha256);
  assert.equal(hash, survey.sha256);
  assert.equal(hash, DEV_ATLAS_PROVENANCE.sha256);
  const source = JSON.parse(sourceBytes.toString('utf8').replace(/^\uFEFF/, ''));
  const size = source.hexSize, halfWidth = Math.sqrt(3) * size / 2;
  const raw = Object.values(source.hexes).map(cell => [size * Math.sqrt(3) * (cell.q + cell.r / 2), size * 1.5 * cell.r]);
  const minX = Math.min(...raw.map(point => point[0])) - halfWidth;
  const minY = Math.min(...raw.map(point => point[1])) - size;
  for (const region of survey.regions) for (const cell of region.cells) {
    const authored = source.hexes[`${cell.q},${cell.r}`];
    assert.equal(authored.region, region.id);
    assert.equal(authored.terrain, cell.terrain);
    assert.ok(Math.abs(cell.x - (size * Math.sqrt(3) * (cell.q + cell.r / 2) - minX)) <= .00051);
    assert.ok(Math.abs(cell.y - (size * 1.5 * cell.r - minY)) <= .00051);
  }
});

test('local regions share one honest provisional world anchor and a separate schematic route', () => {
  const locals = DEV_WORLD_DESTINATIONS.filter(destination => destination.region);
  assert.deepEqual(locals.map(destination => destination.region), [1, 2, 3, 4]);
  for (const destination of locals) {
    assert.equal(destination.regionId, 'Drent');
    assert.equal(destination.atlas, locals[0].atlas);
    assert.equal(destination.placement, 'provisional-locality');
    assert.equal(hitAtlasRegion(atlas, destination.atlas.x, destination.atlas.y)?.id, 'Drent');
    assert.ok(destination.atlas.u > 0 && destination.atlas.u < 1);
    assert.ok(destination.atlas.v > 0 && destination.atlas.v < 1);
  }
  assert.equal(new Set(locals.map(destination => destination.inset.y)).size, 4);
  assert.match(DEV_ATLAS_PROVENANCE.localityNote, /provisional/);
  assert.match(DEV_ATLAS_PROVENANCE.localityNote, /not to world-map scale/);
});

test('Cape Thalmagar keeps its authored region location while the fortress is explicitly new', () => {
  const cape = DEV_WORLD_DESTINATIONS.find(destination => destination.id === 'cape-thalmagar');
  assert.equal(cape.scene, 'cape-thalmagar');
  assert.equal(hitAtlasRegion(atlas, cape.atlas.x, cape.atlas.y)?.id, 'Cape Thalmagar');
  const region = atlas.regions.find(region => region.id === 'Cape Thalmagar');
  assert.equal(region.cells.length, 31);
  assert.ok(region.cells.every(cell => cell.terrain === 'plains'));
  assert.match(DEV_ATLAS_PROVENANCE.capeNote, /new gameplay prototype/);
  assert.ok(cape.atlas.x < DEV_WORLD_DESTINATIONS[0].atlas.x);
  assert.ok(cape.atlas.y < DEV_WORLD_DESTINATIONS[0].atlas.y);
});

test('every region selection supports a survey, while built destinations remain specific', () => {
  for (const region of atlas.regions) {
    const selection = developerRegionSelection(atlas, region.id);
    assert.equal(selection.canSurvey, true);
    assert.equal(selection.survey.scene, 'terrain-survey');
    assert.equal(selection.survey.travelTarget, region.id);
    assert.match(selection.survey.status, /gameplay not built/);
    assert.ok(selection.destinations.length > 0);
  }
  assert.equal(developerRegionSelection(atlas, 'Drent').destinations.length, 4);
  assert.equal(developerRegionSelection(atlas, 'Cape Thalmagar').destinations[0].scene, 'cape-thalmagar');
  const other = developerRegionSelection(atlas, 'West Izol');
  assert.equal(other.destinations[0].scene, 'terrain-survey');
  assert.equal(other.destinations[0].travelTarget, 'West Izol');
  assert.equal(developerRegionSelection(atlas, 'invented-country'), null);
  assert.equal(hitAtlasRegion(atlas, 0, 0), null);
  assert.equal(hitAtlasRegion(atlas, NaN, 0), null);
  assert.equal(hitAtlasRegion(atlas, Infinity, 0), null);
});

test('overlapping region bounding boxes never substitute for exact land polygons', () => {
  const source = atlas.regions.find(region => region.id === 'Cape Thalmagar');
  let demonstrated = false;
  for (let y = source.y + 1; y < source.y + source.height; y += 7) {
    for (let x = source.x + 1; x < source.x + source.width; x += 7) {
      if (hitAtlasRegion(atlas, x, y)?.id !== source.id) { demonstrated = true; break; }
    }
    if (demonstrated) break;
  }
  assert.equal(demonstrated, true, 'irregular region bounds contain points outside the region');
});

test('map markup provides all exact region targets, labels and keyboard access without changing the atlas asset', () => {
  const markup = developerAtlasMarkup(atlas, { selectedRegionId: 'Drent' });
  assert.equal((markup.match(/data-dev-region=/g) ?? []).length, 131);
  assert.equal((markup.match(/tabindex="0"/g) ?? []).length, 131);
  assert.match(markup, /href="\.\/assets\/azhora-world-map\.svg"/);
  assert.match(markup, /aria-label="Drent · open playable destinations · level 0 Tutorial"/);
  assert.match(markup, /data-dev-region="Cold Stones" data-level="4"/);
  assert.match(markup, /Cold Stones · open terrain survey; gameplay not built · level 4 Perilous \(provisional\)/);
  assert.equal((markup.match(/data-level="/g) ?? []).length, 131);
  assert.match(markup, /aria-pressed="true"/);
  assert.match(markup, /open terrain survey; gameplay not built/);
  assert.doesNotMatch(markup, /onclick=/);
  const inset = developerLocalRouteMarkup({ selectedId: 'region-2' });
  assert.equal((inset.match(/data-dev-destination=/g) ?? []).length, 4);
  assert.match(inset, /schematic, not to world-map scale/);
});

test('mismatched source exports, damaged polygons and missing terrain reject instead of relocating regions', () => {
  assert.throws(() => createDeveloperAtlasData(metadata, svg, { ...survey, sha256: 'wrong' }), /does not match/);
  assert.throws(() => createDeveloperAtlasData(metadata, svg, { ...survey, width: 2 }), /does not match/);
  assert.throws(() => createDeveloperAtlasData(metadata, '<svg/>', survey), /polygons were not found/);
  const badPaths = svg.replace(/(<path data-region="[^"]+"[^>]*\bd=")[^"]+/, '$1M0,0Q1,1Z');
  assert.throws(() => createDeveloperAtlasData(metadata, badPaths, survey), /Unsupported/);
  assert.throws(() => createDeveloperAtlasData(metadata, svg, { ...survey, regions: survey.regions.slice(1) }), /Missing or invalid survey/);
  const noSurvey = createDeveloperAtlasData(metadata, svg);
  assert.equal(developerRegionSelection(noSurvey, 'West Izol').canSurvey, false);
});
