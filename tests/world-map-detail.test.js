import test from 'node:test';
import assert from 'node:assert/strict';
import { atlasCellKey, atlasLocalDetail, atlasCityDetail, atlasCityBoundaries, atlasRevealedCityMarks, ATLAS_CITY_DESIGNATIONS, atlasPlaceMarks, atlasMarkKnown, atlasRegionLabelKnown, atlasExplorationScope, splitAtlasRegionLabels, GLIMPSED_TERRAIN } from '../src/ui/map/world-map-detail.js';
import { readFileSync } from 'node:fs';
import { TRANSFORM, hexAt, hexCentre, landDistance, villageToWorld } from '../src/world/terrain/region-world.js';
import { groundWithRiver } from '../src/world/terrain/world-terrain.js';
import { buildLocalMapModel } from '../src/ui/map/local-map-data.js';
import { regions, regionAt, WORLD_BOUNDS } from '../src/world/terrain/regions.js';
import { createMapFog, SUBREGIONS } from '../src/ui/map/map-fog.js';
import { VARN, VARN_CORNERS } from '../src/content/regions/varn/varn-world.js';
import { NYLON, NYLON_OUTLINE } from '../src/content/regions/nylon/nylon-city.js';
import { AEVIS, AEVIS_OUTLINE } from '../src/content/regions/aevis/aevis-city.js';
import { createCartography, chartShapes, EXPLORED_HEXES } from '../src/ui/map/cartography.js';
import { AMBRON_CENTRE, AMBRON_OUTLINE, inAmbronOutline } from '../src/content/regions/ambron/ambron-city-layout.js';
import { applyGameAtlasAdjustments, GAME_ATLAS_ADJUSTMENTS } from '../src/world/terrain/game-atlas-adjustments.js';
import { TESSEN } from '../src/content/regions/pueth/pueth-world.js';

test('the capital marker and city footprint agree with the relocated city between the four lakes', () => {
  const detail = atlasCityDetail(), center = TRANSFORM.atlasToWorld(detail.marker.x, detail.marker.y);
  assert.ok(Math.hypot(center.x - AMBRON_CENTRE.x, center.z - AMBRON_CENTRE.z) < 1e-8);
  assert.equal(inAmbronOutline(center.x, center.z), true);
  assert.equal(detail.marker.name, 'Ambron'); assert.equal(detail.marker.kind, 'capital');
  assert.deepEqual(detail.boundary, AMBRON_OUTLINE.map(p => TRANSFORM.worldToAtlas(p.x, p.z)));
  assert.equal(atlasMarkKnown(detail.marker, new Set()), false, 'unvisited capital remains unnamed');
  assert.equal(atlasMarkKnown(detail.marker, new Set([atlasCellKey(detail.marker)])), true);
  assert.equal(atlasMarkKnown(detail.marker, new Set(), true), true, 'developer reveal shows the capital');
  const next = atlasCityDetail(); detail.boundary[0].x = 0;
  assert.notEqual(next.boundary[0].x, 0, 'drawing data cannot mutate the city definition');
});

test('the capital replaces duplicate ordinary Ambron labels while preserving quests and tracked destinations', () => {
  const ordinary = { id: 'ambron', name: 'Ambron', kind: 'place', x: 12, y: 30 };
  assert.deepEqual(atlasPlaceMarks([ordinary], [{ ...ordinary, kind: 'local' }]), [atlasCityDetail().marker]);
  for (const kind of ['quest', 'tracked']) {
    const objective = { ...ordinary, kind }, marks = atlasPlaceMarks([], [objective]);
    assert.deepEqual(marks.find(mark => mark.id === 'ambron'), objective);
    assert.deepEqual(marks.find(mark => mark.id === 'ambron-capital'), atlasCityDetail().marker);
  }
});

test('established cities share a designation badge without turning towns, ruins or hidden places into capitals', () => {
  const areas = SUBREGIONS.map(area => ({ ...TRANSFORM.worldToAtlas(area.x, area.z), id: area.id, name: area.name, kind: 'area' }));
  const marks = atlasPlaceMarks(areas);
  for (const [id, designation] of Object.entries(ATLAS_CITY_DESIGNATIONS)) {
    if (id === 'sevron-city') continue;
    const badge = marks.find(p => p.id === id);
    assert.ok(badge, `The built city ${id} has an authored map area.`);
    assert.equal(badge.kind, 'city'); assert.equal(badge.name, designation.name); assert.equal(badge.subtitle, designation.subtitle);
    assert.equal(atlasMarkKnown(badge, new Set()), false, 'The badge cannot reveal its own unvisited hex.');
    assert.equal(atlasMarkKnown(badge, new Set([atlasCellKey(badge)])), true);
  }
  assert.equal(marks.find(p => p.id === 'menora').name, 'Minora', 'The displayed correction preserves the old discovery ID.');
  assert.equal(marks.find(p => p.id === 'imlamdris').subtitle, 'City ruins');
  assert.equal(marks.find(p => p.id === 'zecron-ruins').subtitle, 'City ruins');
  assert.equal(marks.find(p => p.id === 'eastreena').kind, 'area', 'Tidehaven is still a village.');
  assert.equal(marks.find(p => p.id === 'ostel').kind, 'area', 'Ostel is still a town.');
  assert.equal(marks.some(p => p.name === 'Sevron'), false, 'The secret settlement is not revealed by a global registry.');
  assert.deepEqual(atlasRevealedCityMarks(), []);
  const hidden = atlasRevealedCityMarks({ sevron: true });
  assert.equal(hidden.length, 1); assert.equal(hidden[0].name, 'Sevron'); assert.equal(hidden[0].subtitle, 'Elven city');
  assert.equal(atlasPlaceMarks([...areas, ...hidden]).filter(p => p.id === 'sevron-city').length, 1);
  for (const kind of ['quest', 'tracked']) {
    const objective = { ...areas.find(p => p.id === 'varn'), name: 'Reach the Pass Gate', kind };
    assert.deepEqual(atlasPlaceMarks([], [objective]).find(p => p.id === 'varn'), objective);
  }
});

test('Varn uses its actual six-wall footprint and discovered fortress location on the atlas', () => {
  const boundaries = atlasCityBoundaries(), varn = boundaries.find(city => city.id === 'varn');
  assert.deepEqual(varn.boundary, VARN_CORNERS.map(p => TRANSFORM.worldToAtlas(p.x, p.z)));
  const area = SUBREGIONS.find(p => p.id === 'varn');
  assert.deepEqual({ x: area.x, z: area.z }, { x: VARN.x, z: VARN.z });
  varn.boundary[0].x = 0;
  assert.notEqual(atlasCityBoundaries().find(city => city.id === 'varn').boundary[0].x, 0);
  const css = readFileSync(new URL('../src/ui/map/world-map.css', import.meta.url), 'utf8');
  assert.match(css, /\.atlas-place\.capital i,\.atlas-place\.city i\{/);
  assert.match(css, /\.atlas-place\.capital span,\.atlas-place\.city span\{/);
});

test('Nylon keeps its city badge and wall footprint on the Eer side of the estuary', () => {
  const area = SUBREGIONS.find(p => p.id === 'nylon');
  assert.deepEqual({ x: area.x, z: area.z }, { x: NYLON.x, z: NYLON.z });
  assert.equal(regionAt(area.x, area.z).name, 'Eer');
  assert.deepEqual(atlasCityBoundaries().find(city => city.id === 'nylon').boundary,
    NYLON_OUTLINE.map(p => TRANSFORM.worldToAtlas(p.x, p.z)));
  const mark = atlasPlaceMarks([{ id: area.id, name: area.name, kind: 'area', ...TRANSFORM.worldToAtlas(area.x, area.z) }]).find(p => p.id === 'nylon');
  assert.equal(mark.kind, 'city'); assert.equal(mark.subtitle, 'City-state');
  assert.equal(atlasMarkKnown(mark, new Set()), false);
  assert.equal(atlasMarkKnown(mark, new Set([atlasCellKey(mark)])), true);
});

test('the atlas close view uses the same world transform for roads, houses and quest destinations', () => {
  const house = { x: -600, z: 130, width: 6, depth: 8, angle: Math.PI / 2 };
  const model = { paths: [[{ x: -603, z: 130 }, { x: -615, z: 140 }]], buildings: [house],
    goal: { id: 'bridge', name: 'Mend the Caloss bridge', x: -615, z: 140 },
    landmarks: [{ id: 'known', name: 'Chip', known: true, x: -600, z: 134 }] };
  const before = structuredClone(model), detail = atlasLocalDetail(model);
  assert.deepEqual(detail.paths[0][1], TRANSFORM.worldToAtlas(-615, 140));
  assert.deepEqual(detail.buildings[0][0], TRANSFORM.worldToAtlas(-604, 133));
  assert.deepEqual(detail.markers.find(p => p.id === 'bridge'), { id: 'bridge', name: 'Mend the Caloss bridge', kind: 'quest', ...TRANSFORM.worldToAtlas(-615, 140), markerKind: 'main', colour: '#f3c46a' });
  assert.deepEqual(model, before, 'viewing detail neither discovers places nor edits the adventure');
});

test('unknown names and missing cast locations never become local marks, and broken paths remain broken', () => {
  const detail = atlasLocalDetail({ paths: [[{ x: 0, z: 0 }, { x: 1, z: 1 }, undefined, { x: 5, z: 5 }, { x: 6, z: 6 }]],
    landmarks: [undefined, { id: 'secret', name: 'Secret hideout', x: 0, z: 0 }, { id: 'removed', name: 'Removed NPC', known: true }],
    goal: { id: 'missing', name: 'Missing destination' } });
  assert.equal(detail.paths.length, 2);
  assert.deepEqual(detail.markers, []);
  assert.deepEqual(atlasLocalDetail(null), { paths: [], buildings: [], markers: [] });
});

test('an adjacent tile provides terrain only until the traveler enters it', () => {
  const center = hexCentre(10, 106), adjacent = hexCentre(11, 106);
  const mark = { id: 'next-place', name: 'Unvisited detail', ...TRANSFORM.worldToAtlas(adjacent.x, adjacent.z) };
  const h = hexAt(center.x, center.z), visited = new Set([`${h.q},${h.r}`]);
  assert.equal(atlasCellKey(mark), '11,106');
  assert.equal(atlasMarkKnown(mark, visited), false);
  visited.add('11,106');
  assert.equal(atlasMarkKnown(mark, visited), true);
  assert.equal(atlasMarkKnown(mark, new Set(), true), true, 'developer reveal remains explicit');
  assert.ok(GLIMPSED_TERRAIN.forest !== GLIMPSED_TERRAIN.mountain);
  assert.equal(atlasCellKey(undefined), null);
});

test('the unified atlas carries discovered detail in other regions without losing quest colors', () => {
  const here = hexCentre(10, 106), remote = hexCentre(-2, 112);
  const world = { bounds: WORLD_BOUNDS, regions, regionAt,
    landmarks: [{ id: 'remote', name: 'An earlier stop', ...remote }],
    colliders: [{ kind: 'house', ...remote, width: 6, depth: 4 }], paths: [[here, remote]] };
  const options = { world, position: here, discoveries: new Set(['remote']), goal: { id: 'remote', name: 'Repair the crossing', ...remote, markerKind: 'deed' } };
  assert.equal(buildLocalMapModel(options).landmarks.some(p => p.id === 'remote'), false);
  const global = buildLocalMapModel({ ...options, globalDetail: true });
  assert.ok(global.landmarks.some(p => p.id === 'remote'));
  assert.equal(global.buildings.length, 1);
  assert.equal(global.goal.markerKind, 'deed');
  const marker = atlasLocalDetail(global).markers.find(p => p.id === 'remote');
  assert.equal(marker.colour, '#c87a3c');
  assert.equal(atlasMarkKnown(marker, new Set(['10,106'])), false, 'global detail remains hidden until its hex is confirmed');
});

test('the original region lettering is separated intact from the terrain, with no duplicate underneath', () => {
  const source = readFileSync(new URL('../assets/azhora-world-map.svg', import.meta.url), 'utf8');
  const { terrain, labels } = splitAtlasRegionLabels(source);
  assert.ok(source.includes(labels), 'all original fonts, rotations, positions and tspans are preserved byte for byte');
  assert.match(labels, /<text data-region="Drent"[^>]+transform="translate\([^)]+\) rotate\([^)]+\)"/);
  assert.match(labels, /paint-order="stroke fill"/);
  assert.doesNotMatch(terrain, /<text data-region=/, 'no country name can appear twice when fog is lifted');
  assert.match(terrain, /data-region="Drent" fill=/, 'the authored terrain itself stays intact');
  assert.throws(() => splitAtlasRegionLabels('<svg/>'), /no region lettering layer/);
});

test('hearing a country name reveals its original lettering without revealing a terrain hex', () => {
  const known = [{ name: 'Drent' }, { name: 'Feradom' }], visited = new Set();
  assert.equal(atlasRegionLabelKnown('Feradom', known), true, 'a name requires no explored cell');
  assert.equal(atlasRegionLabelKnown('Vastos', known), false, 'unheard names remain hidden');
  assert.equal(atlasRegionLabelKnown('Vastos', known, true), true, 'developer reveal names the complete atlas');
  assert.equal(atlasMarkKnown({ x: 1500, y: 2400 }, visited), false, 'knowing the name never uncovers local details');
  assert.equal(visited.size, 0);
});

test('hearing and entering a province leave every hex beyond local exploration unknown', () => {
  const atlas = JSON.parse(readFileSync(new URL('../assets/azhora-dev-regions.json', import.meta.url), 'utf8')).regions;
  const chart = createCartography(), fog = createMapFog(); chart.learn();
  chart.hear('Drent'); chart.hear('Peblos'); chart.hear('Elagos');
  let names = chartShapes(chart.view().entries, atlas), scope = atlasExplorationScope({ ...fog.view(), ...names });
  assert.equal(scope.visited.size + scope.nearby.size, 0, 'hearing three names reveals no geography');
  assert.ok(names.labels.some(label => label.name === 'Drent'));
  const here = hexCentre(10, 106); fog.reveal(here.x, here.z); chart.noteHex('Drent');
  names = chartShapes(chart.view().entries, atlas);
  // Feed even the old full-province payload: the drawing scope must still ignore it.
  const drent = atlas.find(region => region.name === 'Drent');
  scope = atlasExplorationScope({ ...fog.view(), ...names, silhouettes: [drent] });
  assert.equal(scope.visited.size, 1);
  assert.equal(scope.nearby.size, 6);
  const distant = drent.cells.find(cell => !scope.visited.has(`${cell.q},${cell.r}`) && !scope.nearby.has(`${cell.q},${cell.r}`));
  assert.ok(distant, 'the province extends beyond the local seven-cell view');
  for (let i = 1; i < EXPLORED_HEXES; i++) chart.noteHex('Drent');
  const later = atlasExplorationScope({ ...fog.view(), ...chartShapes(chart.view().entries, atlas) });
  assert.deepEqual([...later.visited], [...scope.visited]);
  assert.deepEqual([...later.nearby], [...scope.nearby], 'even the explored rank grants no remote hexes');
  assert.equal(later.visited.has(`${distant.q},${distant.r}`) || later.nearby.has(`${distant.q},${distant.r}`), false);
});


test('Cape Thalmagar has authored lettering that normal discovery and developer reveal can both show', () => {
  const source = readFileSync(new URL('../assets/azhora-world-map.svg', import.meta.url), 'utf8');
  const metadata = JSON.parse(readFileSync(new URL('../assets/azhora-world-map.json', import.meta.url), 'utf8'));
  const { terrain, labels } = splitAtlasRegionLabels(source), name = 'Cape Thalmagar';
  assert.equal((labels.match(/<text data-region="Cape Thalmagar"/g) ?? []).length, 1, 'the exported map includes the cape exactly once');
  assert.doesNotMatch(terrain, /<text data-region="Cape Thalmagar"/, 'its label still belongs to the fog-controlled layer');
  assert.ok(!metadata.uncharted.includes(name), 'no permanent export exclusion overrides discovery');
  const names = [...labels.matchAll(/<text data-region="([^"]+)"/g)].map(match => match[1]);
  assert.equal(names.length, metadata.regions.length, 'every authored region can be named');
  const chart = createCartography(); chart.learn();
  const known = () => chartShapes(chart.view().entries, metadata.regions).labels;
  assert.equal(atlasRegionLabelKnown(name, known()), false, 'the cape does not start revealed');
  assert.equal(atlasRegionLabelKnown(name, known(), true), true, 'developer map reveal names the cape');
  chart.hear(name);
  assert.equal(atlasRegionLabelKnown(name, known()), true, 'normal knowledge also reveals its original lettering');
});


test('Tidehaven northeast bank belongs to Drent in the developer atlas, baked world and journal polygons', () => {
  const survey = JSON.parse(readFileSync(new URL('../assets/azhora-dev-regions.json', import.meta.url), 'utf8'));
  const metadata = JSON.parse(readFileSync(new URL('../assets/azhora-world-map.json', import.meta.url), 'utf8'));
  const source = readFileSync(new URL('../assets/azhora-world-map.svg', import.meta.url), 'utf8');
  const owners = survey.regions.filter(region => region.cells.some(cell => cell.q === 15 && cell.r === 105));
  assert.deepEqual(owners.map(region => region.id), ['Drent']);
  assert.equal(regionAt(...Object.values(hexCentre(15, 105))).name, 'Drent');
  assert.equal(regionAt(...Object.values(hexCentre(15, 104))).name, 'Pueth', 'the neighboring north bank remains Pueth');
  assert.deepEqual(metadata.gameAdjustments, GAME_ATLAS_ADJUSTMENTS);
  const drent = metadata.regions.find(region => region.id === 'Drent');
  assert.equal(drent.hexCount, owners[0].cells.length);
  const polygons = [...source.matchAll(/<path data-region="Drent"[^>]*d="([^"]+)"/g)];
  assert.equal(polygons.length, 1);
  assert.equal((polygons[0][1].match(/M/g) ?? []).length, drent.hexCount, 'the journal paints every Drent hex');
});

test('the journal Tessen and real river share the corrected mouth without a second obsolete reach', () => {
  const source = readFileSync(new URL('../assets/azhora-world-map.svg', import.meta.url), 'utf8');
  const riverLayer = source.match(/<g id="rivers"[^>]*>([\s\S]*?)<\/g>/)?.[1];
  assert.ok(riverLayer);
  const paths = [...riverLayer.matchAll(/d="([^"]+)"/g)].flatMap(match => match[1].split('M').filter(Boolean))
    .map(line => line.split('L').map(pair => { const [x, y] = pair.split(',').map(Number); return { x, y }; }));
  const built = TESSEN.points.map(p => TRANSFORM.worldToAtlas(p.x, p.z));
  const near = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) < .001;
  const corresponding = paths.filter(points => points.length === built.length &&
    (near(points[0], built[0]) || near(points.at(-1), built[0])));
  assert.equal(corresponding.length, 1, 'only one Tessen course is drawn');
  const points = near(corresponding[0][0], built[0]) ? corresponding[0] : [...corresponding[0]].reverse();
  for (let i = 0; i < points.length; i++) assert.ok(near(points[i], built[i]), `charted and built Tessen point ${i} agree`);
  assert.deepEqual(TESSEN.points, TESSEN.mapLine);
});

test('the local bank correction preserves upstream data and is safe to apply twice', () => {
  const source = { hexes: { '15,105': { q: 15, r: 105, region: 'Pueth', terrain: 'plains' },
    '15,104': { q: 15, r: 104, region: 'Pueth', terrain: 'grassland' },
    '16,105': { q: 16, r: 105, terrain: 'coast', climate: 'Cfb' },
    '16,106': { q: 16, r: 106, terrain: 'coast', climate: 'Cfb' },
    '15,106': { q: 15, r: 106, terrain: 'coast', climate: 'Cfb' } },
    rivers: { '14,104|14,105': 'small', '14,105|15,105': 'small', '14,106|15,105': 'small', '1,2|1,3': 'large' } };
  const before = structuredClone(source), adjusted = applyGameAtlasAdjustments(source);
  assert.deepEqual(source, before, 'imports never mutate the upstream map');
  assert.equal(adjusted.hexes['15,105'].region, 'Drent');
  assert.equal(adjusted.hexes['15,105'].terrain, 'plains');
  assert.deepEqual(adjusted.hexes['15,104'], source.hexes['15,104']);
  for (const key of ['16,105', '16,106']) {
    assert.equal(adjusted.hexes[key].region, 'Drent');
    assert.equal(adjusted.hexes[key].terrain, 'forest');
    assert.equal(adjusted.hexes[key].climate, 'Cfb');
  }
  assert.deepEqual(adjusted.hexes['15,106'], source.hexes['15,106'], 'the harbor channel stays open');
  assert.throws(() => applyGameAtlasAdjustments({ ...source, hexes: { ...source.hexes,
    '16,105': { ...source.hexes['16,105'], region: 'Peblos' } } }), /overlaps another authored region/);
  assert.equal(adjusted.rivers['14,104|14,105'], undefined);
  assert.equal(adjusted.rivers['14,105|15,105'], undefined);
  assert.equal(adjusted.rivers['14,106|15,105'], undefined);
  assert.equal(adjusted.rivers['15,104|15,105'], 'small');
  assert.equal(adjusted.rivers['15,105|16,104'], 'small');
  assert.equal(adjusted.rivers['16,104|16,105'], 'small');
  assert.equal(adjusted.rivers['1,2|1,3'], 'large');
  assert.deepEqual(applyGameAtlasAdjustments(adjusted), adjusted);
  assert.throws(() => applyGameAtlasAdjustments({ hexes: {}, rivers: {} }), /no longer matches/);
});


test('the two forested peninsula hexes belong to Drent on both charts and the playable ground', () => {
  const survey = JSON.parse(readFileSync(new URL('../assets/azhora-dev-regions.json', import.meta.url), 'utf8'));
  const metadata = JSON.parse(readFileSync(new URL('../assets/azhora-world-map.json', import.meta.url), 'utf8'));
  for (const [q, r] of [[16, 105], [16, 106]]) {
    const owners = survey.regions.filter(region => region.cells.some(cell => cell.q === q && cell.r === r));
    assert.deepEqual(owners.map(region => region.id), ['Drent']);
    const cell = owners[0].cells.find(cell => cell.q === q && cell.r === r), point = hexCentre(q, r);
    assert.equal(cell.terrain, 'forest');
    assert.equal(regionAt(point.x, point.z).name, 'Drent');
    assert.ok(landDistance(point.x, point.z) > 10, 'the village bay cannot carve through the peninsula');
    assert.ok(groundWithRiver(point.x, point.z) > 1.4, 'the new forest stands on dry ground');
  }
  assert.deepEqual(survey.gameAdjustments, metadata.gameAdjustments);
  const longstone = hexCentre(17, 107);
  assert.equal(regionAt(longstone.x, longstone.z).name, 'Peblos');
  for (const point of [hexCentre(15, 106), hexCentre(16, 107), villageToWorld(0, 47)]) {
    assert.ok(landDistance(point.x, point.z) < -2, 'harbor and offshore channels remain sea');
    assert.ok(groundWithRiver(point.x, point.z) < 0, 'the harbor keeps water below its pier');
  }
});

test('the forested headland has a dry walking connection north of Tidehaven harbor', () => {
  // Flood the local terrain, not a prescribed straight line through the inlet.
  const step = 4, minX = -20, minZ = -103, width = 64, depth = 40;
  const ground = new Float64Array(width * depth), seen = new Uint8Array(ground.length);
  for (let j = 0; j < depth; j++) for (let i = 0; i < width; i++)
    ground[j * width + i] = groundWithRiver(minX + i * step, minZ + j * step);
  const start = 10 * width, queue = [start]; seen[start] = 1;
  assert.ok(ground[start] > 1.2, 'the starting Drent bank is dry');
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const id = queue[cursor], i = id % width, j = Math.floor(id / width);
    for (const [x, z] of [[i - 1, j], [i + 1, j], [i, j - 1], [i, j + 1]]) {
      if (x < 0 || z < 0 || x >= width || z >= depth) continue;
      const next = z * width + x;
      if (seen[next] || ground[next] < 1.2 || Math.abs(ground[next] - ground[id]) / step > .75) continue;
      seen[next] = 1; queue.push(next);
    }
  }
  for (const [q, r] of [[16, 105], [16, 106]]) {
    const target = hexCentre(q, r);
    assert.ok(queue.some(id => Math.hypot(minX + id % width * step - target.x,
      minZ + Math.floor(id / width) * step - target.z) < step), `walkable connection to ${q},${r}`);
  }
});

test('Aevis uses its coastal city footprint and discovery-gated bronze city badge', () => {
  const area=SUBREGIONS.find(p=>p.id==='aevis');
  assert.equal(area.x,AEVIS.x);assert.equal(area.z,AEVIS.z);
  assert.deepEqual(atlasCityBoundaries().find(city=>city.id==='aevis').boundary,AEVIS_OUTLINE.map(p=>TRANSFORM.worldToAtlas(p.x,p.z)));
  const mark=atlasPlaceMarks([{id:area.id,name:area.name,kind:'area',...TRANSFORM.worldToAtlas(area.x,area.z)}]).find(p=>p.id==='aevis');
  assert.equal(mark.kind,'city');assert.equal(mark.subtitle,'Bronze city');
  assert.equal(atlasMarkKnown(mark,new Set()),false);assert.equal(atlasMarkKnown(mark,new Set([atlasCellKey(mark)])),true);
});
