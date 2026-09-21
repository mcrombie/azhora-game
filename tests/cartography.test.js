import test from 'node:test';
import assert from 'node:assert/strict';
import { createSkills } from '../src/skills.js';
import {
  CHART_STATES, CHART_XP, EXPLORED_HEXES, STARTING_CHART, CARTOGRAPHY_DIRECTIONS, REGION_NEIGHBOURS,
  createCartography, startingChart, validateCartographySnapshot,
} from '../src/cartography.js';
import { regionLevel } from '../src/region-levels.js';

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
