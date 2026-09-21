import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { sourceModule } from './module-loader.js';
import { MARKER_KINDS, MARKER_OPEN, MARKER_STYLE, MARKER_ROLES, markerFor, markerGrade, markerStyle, strongestMarker } from '../src/quest-markers.js';

const source = name => readFileSync(fileURLToPath(new URL(`../src/${name}`, import.meta.url)), 'utf8');

const IDS = Object.freeze({
  harbourmaster: 'harbormaster', warden: 'warden', doomsayer: 'doomsayer', acornCook: 'acorn-cook',
  pondFisher: 'pond-fisher', forestStory: 'forest-keeper', gardenKeeper: 'garden-keeper', birdWatcher: 'merc-lakota', vintner: 'winery-vintner',
});
const view = extra => ({ ids: IDS, questStage: 0, ...extra });
/** The state each role's own rule is waiting for. */
const OPENS = Object.freeze({
  harbourmaster: { questStage: 0 },
  warden: { questStage: 5 },
  doomsayer: { heardDoom: false },
  acornCook: { questStage: 1, acornQuestOpen: true },
  pondFisher: { hasRod: false },
  forestStory: { questStage: 1, forestOpen: true },
  gardenKeeper: { questStage: 1, birdingLearned: false },
  birdWatcher: { archaeologyReport: true },
  vintner: { wineRecommended: true },
});

test('three kinds of gold, each its own colour and its own shape, with the main arc the biggest', () => {
  assert.deepEqual(MARKER_KINDS, ['main', 'plot', 'skill']);
  assert.deepEqual(Object.keys(MARKER_STYLE), [...MARKER_KINDS]);
  const colours = new Set(), shapes = new Set();
  for (const kind of MARKER_KINDS) {
    const style = MARKER_STYLE[kind];
    assert.equal(style.kind, kind);
    assert.ok(style.what.length > 20, `${kind} says what it means`);
    assert.ok(!colours.has(style.colour), `${kind} has a colour of its own`);
    assert.ok(!shapes.has(style.shape), `${kind} has a shape of its own, so colour is not the only signal`);
    colours.add(style.colour); shapes.add(style.shape);
  }
  assert.equal(MARKER_STYLE.main.scale, 1);
  assert.ok(MARKER_STYLE.plot.scale < 1 && MARKER_STYLE.skill.scale < 1, 'the arc is the loudest of the three');
});

test('each kind is built as a different set of shapes, and carries which kind it is', async () => {
  const { makeQuestMarker } = await sourceModule('../src/characters.js');
  const built = new Map();
  for (const kind of MARKER_KINDS) {
    const marker = makeQuestMarker(kind);
    assert.equal(marker.name, 'quest-marker');
    assert.equal(marker.userData.markerKind, kind);
    assert.equal(marker.scale.x, MARKER_STYLE[kind].scale);
    const shapes = [];
    marker.traverse(object => { if (object.isMesh) { shapes.push(object.geometry.type); assert.equal(object.castShadow, false, `${kind} casts no shadow`); } });
    assert.ok(shapes.length >= 2, `${kind} is drawn`);
    built.set(kind, shapes.sort().join(','));
  }
  assert.equal(new Set(built.values()).size, MARKER_KINDS.length, `two kinds share a silhouette: ${[...built].map(([k, s]) => `${k}=${s}`).join(' | ')}`);
  assert.equal(makeQuestMarker().userData.markerKind, 'main', 'the arc is what you get if nobody says');
  assert.equal(makeQuestMarker('rumour').userData.markerKind, 'main', 'and what you get for a kind that does not exist');
});

test('at the start of the game the only gold on the main arc is the harbourmaster’s', () => {
  const main = Object.values(IDS).filter(id => markerGrade(markerFor(id, view())) === 'main');
  assert.deepEqual(main, [IDS.harbourmaster], 'somebody else is claiming the main arc at questStage 0');
  assert.equal(markerFor(IDS.harbourmaster, view({ questStage: 2 })), null, 'and she is done once the letter is in the satchel');
  assert.equal(markerFor('nobody-in-particular', view()), null);
});

test('every person with a mark has a kind, and main beats open beats plot beats skill', () => {
  for (const role of MARKER_ROLES) {
    const mark = markerFor(IDS[role], view(OPENS[role]));
    assert.ok(MARKER_KINDS.includes(mark?.kind), `${role} has no kind of gold`);
    assert.equal(mark.open, false, `${role} wears the solid stone`);
  }
  // The four that were one rule before: the harbourmaster and Eren on the arc, Orris with his cape,
  // Bran with his rod. Lysa is a skill twice over - the acorns and the feeder - and never anything else.
  assert.equal(markerGrade(markerFor(IDS.warden, view({ questStage: 5 }))), 'main');
  assert.equal(markerGrade(markerFor(IDS.doomsayer, view())), 'plot');
  assert.equal(markerGrade(markerFor(IDS.pondFisher, view())), 'skill');
  assert.equal(markerGrade(markerFor(IDS.acornCook, view({ questStage: 1, feederWantsCook: true }))), 'skill');
  // A chapter's destination outranks anything else that person might be offering.
  assert.equal(markerGrade(markerFor(IDS.vintner, view({ wineRecommended: true, chapterDestinations: [IDS.vintner] }))), 'main');
  assert.deepEqual([strongestMarker(['skill', 'main', 'plot']), strongestMarker(['skill', 'plot']), strongestMarker([]), strongestMarker(['rumour'])],
    ['main', 'plot', null, null]);
  assert.deepEqual([strongestMarker([MARKER_OPEN, 'main']), strongestMarker([MARKER_OPEN, 'plot'])], ['main', MARKER_OPEN],
    'the road you must take outranks the road you may, and both outrank a story of their own');
});

test('the long road wears the arc’s own gold, open, and never instead of the arc itself', () => {
  // Not a fourth kind: the table stays three and the open one is a variant of the first.
  assert.equal(MARKER_KINDS.length, 3);
  assert.ok(!MARKER_KINDS.includes(MARKER_OPEN));
  const open = markerFor(IDS.gardenKeeper, view({ questStage: 8, longWay: ['garden-keeper'], birdingLearned: true }));
  assert.deepEqual(open, { kind: 'main', open: true }, 'the long road’s next stop');
  assert.equal(markerGrade(open), MARKER_OPEN);
  assert.equal(markerStyle(open).colour, MARKER_STYLE.main.colour, 'the same gold');
  assert.equal(markerStyle(open).shape, MARKER_STYLE.main.shape, 'and the same cut stone');
  // A teacher keeps their leaf; the open gold rides over whichever of them is next.
  const teaching = markerFor(IDS.gardenKeeper, view({ questStage: 8, longWay: ['garden-keeper'], birdingLearned: false }));
  assert.deepEqual(teaching, { kind: 'main', open: true });
  // And it never takes the muster road's place.
  assert.deepEqual(markerFor(IDS.vintner, view({ longWay: [IDS.vintner], chapterDestinations: [IDS.vintner] })), { kind: 'main', open: false });
  assert.equal(markerFor(IDS.gardenKeeper, view({ questStage: 8, longWay: ['garden-keeper'], busy: true })), null, 'and a fight takes it down');
  assert.equal(markerGrade(null), null);
  assert.equal(markerStyle(null), null);
});

test('the open gold is the cut stone with nothing in it, and reads apart from the solid one', async () => {
  const { makeQuestMarker } = await sourceModule('../src/characters.js');
  const solid = makeQuestMarker('main'), hollow = makeQuestMarker('main', { open: true });
  assert.equal(hollow.userData.markerKind, 'main', 'the same kind');
  assert.equal(hollow.userData.markerOpen, true);
  assert.equal(solid.userData.markerOpen, false);
  assert.equal(hollow.scale.x, solid.scale.x, 'and the same size');
  const shapes = marker => { const out = []; marker.traverse(o => { if (o.isMesh) out.push(o.geometry.type); }); return out.sort().join(','); };
  assert.notEqual(shapes(hollow), shapes(solid), 'a hollow stone is not a solid one');
  assert.ok(!shapes(hollow).includes('Octahedron'), 'the stone is what is missing');
  // Only the arc has an open variant; a leaf asked to be hollow is still a leaf.
  assert.equal(makeQuestMarker('skill', { open: true }).userData.markerOpen, false);
});

test('a fight takes down the marks that were always taken down in a fight, and leaves the rest', () => {
  const fighting = extra => view({ busy: true, ...extra });
  for (const role of ['acornCook', 'forestStory', 'birdWatcher', 'vintner']) assert.equal(markerFor(IDS[role], fighting(OPENS[role])), null, `${role} keeps a mark up mid-fight`);
  for (const role of ['harbourmaster', 'warden', 'doomsayer', 'pondFisher']) assert.ok(markerFor(IDS[role], fighting(OPENS[role])), `${role} lost a mark a fight never used to take`);
});

test('src/main.js asks the table rather than keeping its own pile of rules', () => {
  const main = source('main.js');
  assert.match(main, /const mark=markerFor\(npc\.id,markerView\),grade=markerGrade\(mark\);/, 'one call decides');
  assert.match(main, /npc\.marker\.visible=!!grade;/);
  assert.doesNotMatch(main, /npc\.marker\.visible=\(npc\.id===HARBOURMASTER/, 'the old pile of rules is back');
  assert.doesNotMatch(main, /o\.material\.color\.set\(0xa9dcb1\)/, 'the cook’s hand-painted green marker is back');
  assert.match(main, /makeQuestMarker\('skill'\);feederMarker/, 'the feeder errand is a skill errand');
  // Everybody the old rules named is named in the view the table reads.
  for (const named of ['harbourmaster:HARBOURMASTER', "warden:'warden'", "doomsayer:'doomsayer'", "acornCook:'acorn-cook'",
    "pondFisher:'pond-fisher'", 'forestStory:FOREST_STORY_NPC.id', 'birdWatcher:BIRD_WATCHER.id', 'vintner:VINTNER.id'])
    assert.ok(main.includes(named), `${named} is missing from the marker view`);
});
