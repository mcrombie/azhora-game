import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { sourceModule } from './module-loader.js';
import { MARKER_KINDS, MARKER_OPEN, MARKER_STYLE, MARKER_ROLES, markerFor, markerGrade, markerStyle, strongestMarker , TUTORIAL_DONE} from '../src/quest-markers.js';

const source = name => readFileSync(fileURLToPath(new URL(`../src/${name}`, import.meta.url)), 'utf8');

const IDS = Object.freeze({
  harbourmaster: 'harbormaster', instructor: 'instructor', crossingKeeper: 'crossing-keeper',
  doomsayer: 'doomsayer', acornCook: 'acorn-cook',
  pondFisher: 'pond-fisher', forestStory: 'forest-keeper', gardenKeeper: 'garden-keeper', birdWatcher: 'merc-lakota', vintner: 'winery-vintner',
});
/**
 * **These tests read the rules with every quest on the slate**, which is not how the game is
 * playing today: Chapter 1 and the bridge are live and the rest is put away (src/quest-slate.js).
 * The rules for the rest are still written, so they are still tested; `the trimmed slate` at the
 * foot of this file is the other half, and says what a player actually sees.
 */
const view = extra => ({ ids: IDS, questStage: 0, live: () => true, ...extra });
/**
 * The state each role's own rule is waiting for. Everything but the arc also waits for the
 * tutorial to be behind the traveler (TUTORIAL_DONE): the user, 22 September 2026, on a
 * screenshot of the landing with half a dozen marks over the rooftops.
 */
const OPENS = Object.freeze({
  harbourmaster: { questStage: 0 },
  instructor: { questStage: 2 },
  crossingKeeper: { questStage: TUTORIAL_DONE, bridge: 'offered' },
  doomsayer: { questStage: TUTORIAL_DONE, heardDoom: false },
  acornCook: { questStage: TUTORIAL_DONE, acornQuestOpen: true },
  pondFisher: { questStage: TUTORIAL_DONE, hasRod: false },
  forestStory: { questStage: TUTORIAL_DONE, forestOpen: true },
  gardenKeeper: { questStage: TUTORIAL_DONE, birdingLearned: false },
  birdWatcher: { questStage: TUTORIAL_DONE, archaeologyReport: true },
  vintner: { questStage: TUTORIAL_DONE, wineRecommended: true },
});

test('the first shore wears one mark, and it is the road the game is about', () => {
  // Every side offer in Drent used to light up the moment the traveler stepped off the boat.
  for (const [role, open] of Object.entries(OPENS)) {
    if (['harbourmaster', 'instructor', 'crossingKeeper'].includes(role)) continue;
    assert.equal(markerFor(IDS[role], view({ ...open, questStage: 1 })), null, `${role} is marked before the tutorial is done`);
    assert.ok(markerFor(IDS[role], view(open)), `${role} never gets his mark at all`);
  }
  // And the arc keeps its gold the whole way through the tutorial.
  assert.equal(markerGrade(markerFor(IDS.harbourmaster, view({ questStage: 0 }))), 'main');
  assert.equal(markerGrade(markerFor(IDS.instructor, view({ questStage: 2 }))), 'main');
  assert.equal(markerGrade(markerFor('corvan', view({ questStage: 3, chapterDestinations: ['corvan'] }))), 'main');
});

test('four kinds of mark, each its own colour and its own shape, with the main arc the biggest', () => {
  assert.deepEqual(MARKER_KINDS, ['main', 'plot', 'deed', 'skill']);
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
  for (const kind of MARKER_KINDS.filter(one => one !== 'main'))
    assert.ok(MARKER_STYLE[kind].scale < 1, `the arc is louder than ${kind}`);
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
  assert.equal(markerGrade(markerFor(IDS.instructor, view({ questStage: 2 }))), 'main');
  assert.equal(markerGrade(markerFor(IDS.crossingKeeper, view({ questStage: TUTORIAL_DONE, bridge: 'accepted' }))), 'deed');
  assert.equal(markerGrade(markerFor(IDS.crossingKeeper, view({ questStage: TUTORIAL_DONE, bridge: 'done' }))), null, 'a mended bridge asks for nothing');
  assert.equal(markerGrade(markerFor(IDS.doomsayer, view({ questStage: TUTORIAL_DONE }))), 'plot');
  assert.equal(markerGrade(markerFor(IDS.pondFisher, view({ questStage: TUTORIAL_DONE }))), 'skill');
  assert.equal(markerGrade(markerFor(IDS.acornCook, view({ questStage: TUTORIAL_DONE, feederWantsCook: true }))), 'skill');
  // A chapter's destination outranks anything else that person might be offering - and it is the
  // arc, so it is the one mark that does not wait for the tutorial to be over.
  assert.equal(markerGrade(markerFor(IDS.vintner, view({ wineRecommended: true, chapterDestinations: [IDS.vintner] }))), 'main');
  assert.deepEqual([strongestMarker(['skill', 'main', 'plot']), strongestMarker(['skill', 'plot']), strongestMarker([]), strongestMarker(['rumour'])],
    ['main', 'plot', null, null]);
  assert.deepEqual([strongestMarker(['skill', 'deed']), strongestMarker(['deed', 'plot']), strongestMarker(['deed', 'main'])],
    ['deed', 'plot', 'main'], 'a good deed outranks a lesson and nothing else');
  assert.deepEqual([strongestMarker([MARKER_OPEN, 'main']), strongestMarker([MARKER_OPEN, 'plot'])], ['main', MARKER_OPEN],
    'the road you must take outranks the road you may, and both outrank a story of their own');
});

test('the long road wears the arc’s own gold, open, and never instead of the arc itself', () => {
  // Not a kind of its own: the open one is a variant of the first and is not in the table.
  assert.ok(!MARKER_KINDS.includes(MARKER_OPEN));
  const open = markerFor(IDS.gardenKeeper, view({ questStage: TUTORIAL_DONE, longWay: ['garden-keeper'], birdingLearned: true }));
  assert.deepEqual(open, { kind: 'main', open: true }, 'the long road’s next stop');
  assert.equal(markerGrade(open), MARKER_OPEN);
  assert.equal(markerStyle(open).colour, MARKER_STYLE.main.colour, 'the same gold');
  assert.equal(markerStyle(open).shape, MARKER_STYLE.main.shape, 'and the same cut stone');
  // A teacher keeps their leaf; the open gold rides over whichever of them is next.
  const teaching = markerFor(IDS.gardenKeeper, view({ questStage: TUTORIAL_DONE, longWay: ['garden-keeper'], birdingLearned: false }));
  assert.deepEqual(teaching, { kind: 'main', open: true });
  // And it never takes the muster road's place.
  assert.deepEqual(markerFor(IDS.vintner, view({ questStage: TUTORIAL_DONE, longWay: [IDS.vintner], chapterDestinations: [IDS.vintner] })), { kind: 'main', open: false });
  assert.equal(markerFor(IDS.gardenKeeper, view({ questStage: TUTORIAL_DONE, longWay: ['garden-keeper'], busy: true })), null, 'and a fight takes it down');
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
  for (const role of ['harbourmaster', 'instructor', 'doomsayer', 'pondFisher']) assert.ok(markerFor(IDS[role], fighting(OPENS[role])), `${role} lost a mark a fight never used to take`);
  assert.equal(markerFor(IDS.crossingKeeper, fighting(OPENS.crossingKeeper)), null, 'and the copper goes down with the rest');
});

/**
 * And the slate as it actually stands: gold on the arc, copper on Chip, nothing else anywhere.
 */
test('the trimmed slate wears gold and copper and nothing else', () => {
  const real = extra => ({ ids: IDS, questStage: TUTORIAL_DONE, ...extra });   // no `live`: the real one
  for (const role of ['doomsayer', 'acornCook', 'pondFisher', 'forestStory', 'gardenKeeper', 'birdWatcher', 'vintner'])
    assert.equal(markerFor(IDS[role], real(OPENS[role])), null, `${role} is still being advertised`);
  assert.equal(markerGrade(markerFor(IDS.harbourmaster, real({ questStage: 0 }))), 'main');
  assert.equal(markerGrade(markerFor(IDS.instructor, real({ questStage: 2 }))), 'main');
  assert.equal(markerGrade(markerFor(IDS.crossingKeeper, real({ bridge: 'offered' }))), 'deed');
  assert.equal(markerGrade(markerFor('iven', real({ arcDestinations: ['iven'] }))), 'main');
  // A chapter's destination is still the arc, so a chapter still points at people.
  assert.equal(markerGrade(markerFor(IDS.vintner, real({ wineRecommended: true, chapterDestinations: [IDS.vintner] }))), 'main');
});

test('src/main.js asks the table rather than keeping its own pile of rules', () => {
  const main = source('main.js');
  assert.match(main, /const mark=markerFor\(npc\.id,markerView\),grade=markerGrade\(mark\);/, 'one call decides');
  assert.match(main, /npc\.marker\.visible=!!grade;/);
  assert.doesNotMatch(main, /npc\.marker\.visible=\(npc\.id===HARBOURMASTER/, 'the old pile of rules is back');
  assert.doesNotMatch(main, /o\.material\.color\.set\(0xa9dcb1\)/, 'the cook’s hand-painted green marker is back');
  assert.match(main, /makeQuestMarker\('skill'\);feederMarker/, 'the feeder errand is a skill errand');
  // Everybody the old rules named is named in the view the table reads.
  for (const named of ['harbourmaster:HARBOURMASTER', 'instructor:INSTRUCTOR.id', "doomsayer:'doomsayer'", "acornCook:'acorn-cook'",
    "pondFisher:'pond-fisher'", 'forestStory:FOREST_STORY_NPC.id', 'birdWatcher:BIRD_WATCHER.id', 'vintner:VINTNER.id'])
    assert.ok(main.includes(named), `${named} is missing from the marker view`);
});

test('the Vastos silver story stays available with teachers trimmed, and follows only its active targets', () => {
  const current = { questStage: TUTORIAL_DONE, silverDestinations: ['vastos-herder'] };
  assert.equal(markerGrade(markerFor('vastos-herder', current)), 'plot');
  assert.equal(markerFor('vastos-republican', current), null);
  assert.equal(markerFor('vastos-covenant', current), null, 'the undiscovered covenant is never advertised');
  assert.equal(markerFor('vastos-herder', { ...current, questStage: 0 }), null);
  assert.equal(markerFor('vastos-herder', { ...current, busy: true }), null);
  assert.equal(markerFor('vastos-herder', { ...current, live: () => false }), null);
  assert.equal(markerGrade(markerFor('vastos-herder', { ...current, chapterDestinations: ['vastos-herder'] })), 'main');
  assert.equal(markerFor('vastos-herder', { ...current, silverDestinations: [] }), null, 'the mark leaves after settlement');
});
