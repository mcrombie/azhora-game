import test from 'node:test';
import assert from 'node:assert/strict';
import { createSkills } from '../src/skills.js';
import {
  CHART_STATES, CHART_XP, EXPLORED_HEXES, STARTING_CHART, CARTOGRAPHY_DIRECTIONS, REGION_NEIGHBOURS,
  createCartography, startingChart, validateCartographySnapshot, chartShapes,
} from '../src/cartography.js';
import { regionLevel, levelWords } from '../src/region-levels.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = name => readFileSync(fileURLToPath(new URL(`../src/${name}`, import.meta.url)), 'utf8');

const fixture = ({ taught = true } = {}) => {
  const skills = createSkills(), chart = createCartography({ skills });
  if (taught) chart.learn();
  return { skills, chart };
};
const xp = skills => skills.view().find(entry => entry.id === 'cartography').xp;

test('the chart starts as the rough one Tidehaven keeps, and nothing else', () => {
  assert.deepEqual(Object.keys(STARTING_CHART).sort(),
    ['Drent', 'East Suval', 'Feradom', 'Luscia', 'Pueth', 'West Suval'], 'Feradom to Pueth to Drent, and three more coasts');
  const { chart } = fixture();
  for (const name of Object.keys(STARTING_CHART)) assert.equal(chart.state(name), 'charted', name);
  // Only Drent is named: you can see what you are standing in is called Drent, and nothing in it.
  assert.deepEqual(Object.keys(STARTING_CHART).filter(name => chart.named(name)), ['Drent']);
  for (const name of Object.keys(STARTING_CHART)) assert.equal(chart.hexes(name), 0, `${name} is a shape, not ground walked`);
  // Everything else on the atlas is dark.
  for (const name of ['Peblos', 'Moros Plain', 'Elagos', 'Amod', 'Cape Thalmagar', 'Nowhere At All']) {
    assert.equal(chart.state(name), 'unknown', name);
    assert.equal(chart.named(name), false, name);
    assert.equal(chart.knows(name), false, name);
  }
  // And the starting chart is a copy, not the table itself.
  const fresh = startingChart();
  fresh.Drent.state = 'explored';
  assert.equal(STARTING_CHART.Drent.state, 'charted', 'the table is not written through');
});

test('a chart only goes forward, and each step forward is paid for once', () => {
  const { skills, chart } = fixture();
  const heard = chart.hear('Peblos');
  assert.deepEqual([heard.first, heard.state, heard.named, heard.xp], [true, 'heard', true, CHART_XP.heard]);
  assert.equal(chart.hear('Peblos').first, false, 'being told twice is worth nothing');
  assert.equal(xp(skills), CHART_XP.heard);

  const charted = chart.chart('Peblos');
  assert.deepEqual([charted.state, charted.named, charted.xp], ['charted', true, CHART_XP.charted], 'a name once given is not taken back');
  assert.equal(chart.chart('Peblos').first, false);
  // Hearing about a country you have already charted still adds the name, and nothing else.
  const quiet = chart.hear('Feradom');
  assert.deepEqual([quiet.first, quiet.state, quiet.named, quiet.xp], [true, 'charted', true, 0], 'no step back, and nothing paid for standing still');
  assert.equal(chart.state('Feradom'), 'charted');
  assert.equal(chart.hear('').ok, false, 'a nameless country is refused');
  assert.equal(chart.chart(undefined).ok, false);
});

test('charted means a shape; explored means six hexes of your own', () => {
  const { skills, chart } = fixture();
  const first = chart.noteHex('Moros Plain');
  assert.deepEqual([first.first, first.state, first.named, first.xp], [true, 'charted', true, CHART_XP.firstHex],
    'the first ground you put on the chart in a country names it and shapes it');
  for (let i = 2; i < EXPLORED_HEXES; i++) {
    const step = chart.noteHex('Moros Plain');
    assert.deepEqual([step.first, step.xp, step.state], [false, 0, 'charted'], `hex ${i}`);
  }
  const last = chart.noteHex('Moros Plain');
  assert.deepEqual([last.state, last.xp, last.hexes], ['explored', CHART_XP.explored, EXPLORED_HEXES]);
  assert.equal(chart.noteHex('Moros Plain').xp, 0, 'and walking it further is its own reward');
  assert.equal(xp(skills), CHART_XP.firstHex + CHART_XP.explored);
  assert.equal(chart.noteHex(null).ok, false);
});

test('nothing is paid until Mara has handed the chart over', () => {
  const { skills, chart } = fixture({ taught: false });
  assert.equal(chart.met, false);
  chart.hear('Peblos'); chart.noteHex('Drent');
  assert.equal(skills.known('cartography'), false, 'the skill is not learned by walking about');
  assert.equal(chart.state('Peblos'), 'heard', 'though the chart still remembers what you were told');
  assert.equal(chart.learn().first, true);
  assert.equal(chart.learn().first, false);
  assert.equal(skills.known('cartography'), true);
  assert.equal(chart.hear('Elagos').xp, CHART_XP.heard);
});

test('asking the way only reaches the countries next door, and every one of them has an answer', () => {
  const { chart } = fixture();
  assert.deepEqual(chart.directionsFrom('Drent'), ['Pueth', 'Luscia', 'Elagos', 'Peblos']);
  assert.deepEqual(chart.directionsFrom('Peblos'), ['Drent'], 'islands border nobody; Drent’s coast carries them');
  assert.deepEqual(chart.directionsFrom('Nowhere'), []);
  for (const [home, near] of Object.entries(REGION_NEIGHBOURS)) {
    assert.ok(CARTOGRAPHY_DIRECTIONS[home], `nobody can be pointed at ${home}`);
    for (const other of near) assert.ok(REGION_NEIGHBOURS[other]?.includes(home) || !REGION_NEIGHBOURS[other],
      `${home} and ${other} disagree about the border between them`);
  }
  for (const [name, line] of Object.entries(CARTOGRAPHY_DIRECTIONS)) {
    assert.ok(line.length > 30 && /[.!]$/.test(line), `${name} is given a direction worth the asking`);
    assert.equal(regionLevel(name) !== null, true, `${name} is a country the atlas has`);
  }
});

test('the journal says how hard a country is only once its shape is on the chart', () => {
  const { chart } = fixture();
  chart.hear('Cape Thalmagar');
  const view = chart.view();
  const heard = view.entries.find(entry => entry.name === 'Cape Thalmagar');
  assert.deepEqual([heard.state, heard.level], ['heard', null], 'a name and a bearing is not a survey');
  const drent = view.entries.find(entry => entry.name === 'Drent');
  assert.deepEqual([drent.state, drent.level, drent.words], ['charted', 0, 'A quiet country']);
  assert.equal(view.total, Object.keys(STARTING_CHART).length + 1);
  assert.deepEqual([view.charted, view.heard, view.explored], [6, 1, 0]);
  chart.chart('Cape Thalmagar');
  assert.equal(chart.view().entries.find(entry => entry.name === 'Cape Thalmagar').level, 8);
});

test('the chart survives the road, and nonsense is refused', () => {
  const { chart } = fixture();
  chart.hear('Peblos'); chart.noteHex('Drent'); chart.noteHex('Drent');
  const saved = chart.snapshot();
  assert.equal(validateCartographySnapshot(saved), true);
  assert.equal(validateCartographySnapshot(undefined), true, 'older saves have no chart');
  assert.equal(validateCartographySnapshot(undefined, { allowMissing: false }), false);
  const copy = createCartography({ skills: createSkills() });
  assert.equal(copy.restore(saved), true);
  assert.deepEqual([copy.met, copy.state('Peblos'), copy.state('Drent'), copy.hexes('Drent')], [true, 'heard', 'charted', 2]);
  assert.deepEqual(copy.snapshot(), saved);
  // A save that has forgotten the starting chart still gets it back: it is where every game begins.
  const thin = createCartography();
  assert.equal(thin.restore({ version: 1, met: true, regions: { Peblos: { state: 'heard', named: true, hexes: 0 } } }), true);
  assert.equal(thin.state('Drent'), 'charted', 'Tidehaven’s own chart cannot be lost');
  for (const bad of [null, [], { version: 2, met: true, regions: {} }, { version: 1, regions: {} },
    { version: 1, met: true, regions: { Drent: { state: 'mapped', named: true, hexes: 0 } } },
    { version: 1, met: true, regions: { Drent: { state: 'charted', named: 'yes', hexes: 0 } } },
    { version: 1, met: true, regions: { Drent: { state: 'charted', named: true, hexes: -1 } } }])
    assert.equal(validateCartographySnapshot(bad), false, JSON.stringify(bad));
  const refused = createCartography();
  refused.learn();
  assert.equal(refused.restore({ version: 1, met: true, regions: { Drent: { state: 'nowhere' } } }), false);
  assert.equal(refused.met, false, 'a refused restore leaves a fresh chart');
  assert.deepEqual(CHART_STATES, ['unknown', 'heard', 'charted', 'explored']);
});

const ATLAS = JSON.parse(readFileSync(fileURLToPath(new URL('../assets/azhora-dev-regions.json', import.meta.url)), 'utf8')).regions;

test('the dark chart draws a shape for every coast you know and a name for every country you have been given', () => {
  const { chart } = fixture();
  // The chart Mara hands over: six coasts, one name.
  const opening = chartShapes(chart.view().entries, ATLAS);
  assert.deepEqual(opening.silhouettes.map(s => s.name).sort(),
    ['Drent', 'East Suval', 'Feradom', 'Luscia', 'Pueth', 'West Suval'], 'six coasts against the sea');
  assert.deepEqual(opening.labels.map(l => l.name), ['Drent'], 'and one name on it');
  // Feradom is not one of the built regions and has no REGION_OUTLINES entry; the atlas carries it anyway.
  const feradom = opening.silhouettes.find(s => s.name === 'Feradom');
  assert.ok(feradom.cells.length > 4, `Feradom's coast is ${feradom.cells.length} hexes`);
  for (const shape of opening.silhouettes) for (const cell of shape.cells)
    assert.ok(Number.isFinite(cell.q) && Number.isFinite(cell.r), `${shape.name} draws in hexes`);
  // A label sits at the atlas's own centre for that country, sized by how big it is.
  const drent = opening.labels[0], atlas = ATLAS.find(region => region.name === 'Drent');
  assert.deepEqual([drent.x, drent.y], [atlas.centerX, atlas.centerY]);
  assert.ok(drent.size >= 22 && drent.size <= 46);

  // Hearing of somewhere puts its name up without its shape; charting it adds the shape.
  chart.hear('Cape Thalmagar');
  const heard = chartShapes(chart.view().entries, ATLAS);
  assert.ok(heard.labels.some(l => l.name === 'Cape Thalmagar'), 'a name and a rough bearing is a label');
  assert.ok(!heard.silhouettes.some(s => s.name === 'Cape Thalmagar'), 'and no shape at all');
  chart.chart('Cape Thalmagar');
  assert.ok(chartShapes(chart.view().entries, ATLAS).silhouettes.some(s => s.name === 'Cape Thalmagar'));
  // Walked ground keeps its shape: the fog cuts the atlas out of the dark over the top of it.
  for (let i = 0; i < EXPLORED_HEXES; i++) chart.noteHex('Moros Plain');
  const walked = chartShapes(chart.view().entries, ATLAS);
  assert.ok(walked.silhouettes.some(s => s.name === 'Moros Plain') && walked.labels.some(l => l.name === 'Moros Plain'));
  // Nothing is drawn for a country the atlas does not have, or for no atlas at all.
  assert.deepEqual(chartShapes([{ name: 'Nowhere', state: 'charted', named: true }], ATLAS), { silhouettes: [], labels: [] });
  assert.deepEqual(chartShapes(chart.view().entries, null), { silhouettes: [], labels: [] });
  assert.deepEqual(chartShapes(null, ATLAS), { silhouettes: [], labels: [] });
});

test('the overlay goes dark, and the shapes and names are drawn into it', () => {
  const map = source('world-map.js'), main = source('main.js');
  assert.match(map, /fill: '#0b1620'/, 'unknown country is dark');
  // Opaque, both of them. At .93 the whole continent - shapes and lettering - could be read through
  // the dark by a traveler who had charted a single hex, and a known coast showed its interior.
  assert.match(map, /fill: '#0b1620', 'fill-opacity': '1', mask:/, 'and nothing of the atlas shows through it');
  assert.match(map, /fill: '#243a4e', 'fill-opacity': '1', stroke: '#243a4e', 'stroke-opacity': '1'/, 'nor through a coast you have only been shown');
  assert.doesNotMatch(map, /mask: 'url\(#atlas-charted\)'[^\n]*'fill-opacity': '\.\d/, 'no masked layer of the fog is translucent');
  assert.doesNotMatch(map, /'fill-opacity': '\.\d+'[^\n]*mask: 'url\(#atlas-charted\)'/, 'whichever way round it is written');
  assert.doesNotMatch(map, /#e8dcba/, 'the old parchment blank is gone');
  assert.doesNotMatch(map, /atlas-unknown/, 'and so is its hatch');
  assert.match(map, /for \(const region of chart\.silhouettes \?\? \[\]\)/, 'a shape per known coast');
  assert.match(map, /for \(const label of chart\.labels \?\? \[\]\)/, 'a name per named country');
  assert.match(map, /mask: 'url\(#atlas-charted\)'/, 'and the ground you have walked is cut out of both');
  assert.match(map, /silhouettes: chart\.silhouettes\.length/, 'the state says how many were asked for');
  assert.match(map, /labels: \[\.\.\.overlay\.querySelectorAll\('\[data-role="labels"\] text'\)\]/, 'and which names were drawn');
  assert.match(main, /chartShapes\(cartography\.view\(\)\.entries,atlasRegions\)/, 'main.js asks the model rather than working it out');
  assert.match(main, /silhouettes:drawn\.silhouettes,labels:drawn\.labels/, 'and hands both to the chart');
});

test('a chart in a state no country can be in is refused', () => {
  const { chart } = fixture();
  chart.hear('Peblos'); chart.noteHex('Drent');
  assert.equal(validateCartographySnapshot(chart.snapshot()), true);
  assert.equal(validateCartographySnapshot({ version: 1, met: true, regions: { Drent: { state: 'lost' } } }), false);
  // The whole save path is tests/road-checkpoint.test.js and tests/save-round-trip.test.js; this holds
  // that the chart is one of the things they carry, which the source assertions below pin in place.
});

test('the game keeps the chart, feeds it and hands it over on the landing', () => {
  const main = source('main.js'), checkpoint = source('road-checkpoint.js');
  assert.match(main, /const cartography=createCartography\(\{skills,/, 'the chart earns its experience through the skill');
  assert.match(main, /cartography:cartography\.snapshot\(\)/, 'and is written down with the road');
  assert.match(main, /cartography\.restore\(saved\.cartography\?\?createCartography\(\)\.snapshot\(\)\)/, 'and read back with it');
  assert.match(checkpoint, /validateCartographySnapshot\(data\.cartography\)/, 'and checked on the way in');
  assert.match(main, /if\(widened\.cells\.length&&here&&!isOpenCountry\(here\)\)cartography\.noteHex\(here\.name\)/, 'a new hex is a hex of some country');
  const hers = main.slice(main.indexOf('function maraOnTheLanding'), main.indexOf('function chrisOnTheLanding'));
  assert.match(hers, /own chart and it is not much/, 'she hands over the rough chart');
  assert.match(hers, /cartography\.learn\(\)\.first/, 'and that is the lesson');
  assert.match(hers, /NEW SKILL . CARTOGRAPHY/);
  assert.match(main, /function wayfindingChoice\(npc,back\)/, 'anybody can be asked which way the next country is');
  assert.match(main, /if\(options\.choices\?\.length&&!options\.noWayfinding\)/, 'from the one place every conversation goes through');
  assert.match(main, /cartography\.directionsFrom\(homeRegion\(npc\)\)/, 'and only about the countries next door');
  assert.match(main, /const countries=cartography\.view\(\);/, 'the journal lists what is known of each country');
  assert.match(main, /A shape against the sea/);
});

test('the difficulty is a number in the journal and words everywhere else', () => {
  // The user's ruling (docs/design-answers.md, and the note at the head of src/region-levels.js):
  // the region card gives a country's difficulty in the ladder's words on first entering, and the
  // number appears only in the cartography journal, once the country is charted, because finding
  // out how dangerous a place is, is part of charting it. The HUD never shows the number at all.
  const main = source('main.js');
  const kicker = main.slice(main.indexOf('function regionKicker'), main.indexOf('function enterRegion'));
  assert.doesNotMatch(kicker, /LEVEL/, 'the location header does not put a difficulty number on the screen');
  assert.doesNotMatch(kicker, /\blevel\b/, 'nor a difficulty at all: the header says who holds the country');
  assert.match(kicker, /info\.faction\.name\.toUpperCase\(\)/, 'which is the faction that holds it');

  const card = main.slice(main.indexOf('function enterRegion'), main.indexOf("$('region-card').classList.add"));
  assert.match(card, /levelWords\(regionLevel\(region\.name\)\)/, 'the card gives the ladder\u2019s words');
  assert.doesNotMatch(card, /LEVEL \$\{/, 'and never the number, on any branch, including the one for a name the ladder has no words for');
  assert.doesNotMatch(card, /info\.level/, 'nor the campaign table\u2019s own number by another name');

  // Nowhere else in the game draws a region difficulty. The LEVEL kickers that remain are skill
  // levels, which are the player's own and are meant to be read as numbers.
  for (const line of main.split('\n')) {
    const code = line.trim();
    if (!/LEVEL /.test(code) || code.startsWith('*') || code.startsWith('//') || code.startsWith('/*')) continue;
    assert.ok(/\$\{(found|result|landed|skill|event|gained)\.level/.test(code) || /skill\.level/.test(code),
      `a LEVEL on screen that is not a skill level: ${code.slice(0, 120)}`);
  }

  // And the one place the number does belong still has it, for a country whose shape is known.
  const { chart } = fixture();
  const drent = chart.view().entries.find(entry => entry.name === 'Drent');
  assert.deepEqual([drent.state, drent.level, drent.words], ['charted', 0, 'A quiet country'],
    'the journal keeps the number, and the words beside it');
  assert.equal(levelWords(regionLevel('Drent')), 'A quiet country', 'which is what the card says instead');
});
