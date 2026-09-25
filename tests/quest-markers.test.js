import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { sourceModule } from './module-loader.js';
import { MARKER_KINDS, MARKER_OPEN, MARKER_STYLE, MARKER_ROLES, markerFor, markerGrade, markerStyle, strongestMarker, magicTeacherIds, TUTORIAL_DONE } from '../src/quest-markers.js';
import { BEN, createSpiderQuest } from '../src/spider-quest.js';
import { LIZ, createCatQuest } from '../src/cat-quest.js';
import { TROY, MURDERER, WITNESS_IDS, createMurderQuest } from '../src/murder-quest.js';

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

test('quest grades share a diamond; ordinary and magic teachers have distinct books and colours', () => {
  assert.deepEqual(MARKER_KINDS, ['main', 'plot', 'deed', 'skill', 'magic', 'skill-locked']);
  assert.deepEqual(Object.keys(MARKER_STYLE), [...MARKER_KINDS]);
  const colours = new Set();
  for (const kind of MARKER_KINDS) {
    const style = MARKER_STYLE[kind];
    assert.equal(style.kind, kind);
    assert.ok(style.what.length > 20, `${kind} says what it means`);
    assert.ok(!colours.has(style.colour), `${kind} has a colour of its own`);
    assert.equal(style.shape, kind === 'magic' ? 'book-sparkle' : kind === 'skill-locked' ? 'book-lock' : kind === 'skill' ? 'book' : 'diamond');
    colours.add(style.colour);
  }
  assert.equal(MARKER_STYLE.main.scale, 1);
  for (const kind of MARKER_KINDS.filter(one => one !== 'main'))
    assert.equal(MARKER_STYLE[kind].scale, MARKER_STYLE.main.scale, `${kind} uses the same size`);
});

test('quest geometry is consistent and the teacher book faces the camera', async () => {
  const { makeQuestMarker } = await sourceModule('../src/characters.js');
  const built = new Map();
  for (const kind of MARKER_KINDS) {
    const marker = makeQuestMarker(kind);
    assert.equal(marker.name, 'quest-marker');
    assert.equal(marker.userData.markerKind, kind);
    assert.equal(marker.scale.x, MARKER_STYLE[kind].scale);
    assert.equal(marker.children[0].material.color.getHex(), MARKER_STYLE[kind].colour);
    const shapes = [];
    marker.traverse(object => { if (object.isMesh) { shapes.push(object.geometry.type); assert.equal(object.castShadow, false, `${kind} casts no shadow`); } });
    assert.ok(shapes.length >= 2, `${kind} is drawn`);
    built.set(kind, shapes.sort().join(','));
  }
  assert.equal(new Set(['main','plot','deed'].map(kind=>built.get(kind))).size, 1, 'quest categories share one silhouette');
  assert.notEqual(built.get('skill'),built.get('main'),'teacher book is visibly distinct');
  assert.notEqual(built.get('magic'),built.get('skill'),'magic book has its own sparkle silhouette');
  assert.equal(makeQuestMarker('skill').userData.billboard,true);
  const magic = makeQuestMarker('magic');
  assert.equal(magic.userData.billboard,true);
  assert.ok(magic.getObjectByName('Sorcery sparkle')?.isMesh, 'a magic teacher has a visible sparkle');
  assert.equal(built.get('main'), 'OctahedronGeometry,TorusGeometry');
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

test('the optional-road grade preserves its metadata but uses the same filled symbol', async () => {
  const { makeQuestMarker } = await sourceModule('../src/characters.js');
  const solid = makeQuestMarker('main'), hollow = makeQuestMarker('main', { open: true });
  assert.equal(hollow.userData.markerKind, 'main', 'the same kind');
  assert.equal(hollow.userData.markerOpen, true);
  assert.equal(solid.userData.markerOpen, false);
  assert.equal(hollow.scale.x, solid.scale.x, 'and the same size');
  const shapes = marker => { const out = []; marker.traverse(o => { if (o.isMesh) out.push(o.geometry.type); }); return out.sort().join(','); };
  assert.equal(shapes(hollow), shapes(solid), 'optional and main quests share their icon');
  assert.ok(shapes(hollow).includes('Octahedron'), 'the optional-road stone is filled too');
  // Only the main road can carry optional-road metadata; a lesson keeps its category.
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

test('an independent escort uses the shared silver marker, hides during combat and yields to gold', () => {
  const offer = { escortDestinations: ['cagney'], questStage: 0 };
  assert.equal(markerGrade(markerFor('cagney', offer)), 'plot');
  assert.equal(markerFor('cagney', { ...offer, busy: true }), null);
  assert.equal(markerFor('cagney', { ...offer, escortDestinations: [] }), null);
  assert.equal(markerFor('somebody-else', offer), null);
  assert.equal(markerGrade(markerFor('cagney', { ...offer, arcDestinations: ['cagney'] })), 'main');
});

test('src/main.js asks the table rather than keeping its own pile of rules', () => {
  const main = source('main.js');
  assert.match(main, /const mark=markerFor\(npc\.id,markerView\),grade=markerGrade\(mark\);/, 'one call decides');
  assert.match(main, /npc\.marker\.visible=!!grade;/);
  assert.doesNotMatch(main, /npc\.marker\.visible=\(npc\.id===HARBOURMASTER/, 'the old pile of rules is back');
  assert.doesNotMatch(main, /o\.material\.color\.set\(0xa9dcb1\)/, 'the cook’s hand-painted green marker is back');
  assert.match(main, /makeQuestMarker\('skill'\);feederMarker/, 'the feeder errand is a skill errand');
  // Everybody the old rules named is named in the view the table reads.
  for (const named of ['harbourmaster:HARBOURMASTER', 'instructor:INSTRUCTOR.id', "doomsayer:null", "acornCook:'acorn-cook'",
    "pondFisher:'pond-fisher'", 'forestStory:FOREST_STORY_NPC.id', 'birdWatcher:BIRD_WATCHER.id', 'vintner:VINTNER.id'])
    assert.ok(main.includes(named), `${named} is missing from the marker view`);
});

test('the parked Vastos silver story can be reenabled without restoring teachers', () => {
  const current = { questStage: TUTORIAL_DONE, silverDestinations: ['vastos-herder'], live:id=>id==='civil-war-vastos' };
  assert.equal(markerGrade(markerFor('vastos-herder', current)), 'plot');
  assert.equal(markerFor('vastos-republican', current), null);
  assert.equal(markerFor('vastos-covenant', current), null, 'the undiscovered covenant is never advertised');
  assert.equal(markerFor('vastos-herder', { ...current, questStage: 0 }), null);
  assert.equal(markerFor('vastos-herder', { ...current, busy: true }), null);
  assert.equal(markerFor('vastos-herder', { ...current, live: () => false }), null);
  assert.equal(markerGrade(markerFor('vastos-herder', { ...current, chapterDestinations: ['vastos-herder'] })), 'main');
  assert.equal(markerFor('vastos-herder', { ...current, silverDestinations: [] }), null, 'the mark leaves after settlement');
});

test('an available first lesson has a book marker independently of parked quest chains',()=>{
  const view={questStage:TUTORIAL_DONE,skillTeachers:['doomsayer'],live:()=>false};
  assert.equal(markerFor('doomsayer',view)?.kind,'skill');
  assert.equal(markerFor('doomsayer',{...view,skillTeachers:[]}),null);
  assert.equal(markerFor('doomsayer',{...view,busy:true}),null);
  assert.equal(markerFor('doomsayer',{...view,questStage:0}),null);
});

test('magic teachers keep their violet book while a quest or earned lesson is available', () => {
  const spider = createSpiderQuest(), cat = createCatQuest(), murder = createMurderQuest();
  const teachers = () => magicTeacherIds({ spider: spider.state, cat: cat.state, murder: murder.state });
  const marked = id => assert.ok(teachers().includes(id));
  assert.deepEqual(teachers(), [BEN.id, LIZ.id, TROY.id]);
  for (const step of [() => spider.ask(), () => spider.accept(), () => spider.begin(),
    () => spider.settle(), () => spider.begin(), () => spider.settle({ spiderDead: true })]) {
    step(); marked(BEN.id);
  }
  assert.ok(spider.take('lesson'));
  assert.ok(!teachers().includes(BEN.id), 'Ben no longer advertises a learned spell');
  for (const step of [() => cat.ask(), () => cat.accept(), () => cat.found(), () => cat.bolts(),
    () => cat.found(), () => cat.home(), () => cat.take('purse')]) {
    step(); marked(LIZ.id);
  }
  assert.ok(cat.take('lesson'));
  assert.ok(!teachers().includes(LIZ.id), 'Liz keeps the offer through paid, then removes it after teaching');
  murder.begin(); marked(TROY.id);
  assert.equal(murder.accuse(WITNESS_IDS.find(id => id !== MURDERER), 0).ok, false);
  marked(TROY.id);
  for (const id of WITNESS_IDS) murder.hear(id);
  assert.equal(murder.accuse(MURDERER, 1000).ok, true); marked(TROY.id);
  assert.ok(murder.take('purse')); marked(TROY.id);
  assert.ok(murder.take('lesson'));
  assert.deepEqual(teachers(), []);
});

test('unavailable or already known magic lessons are not advertised', () => {
  const spider = createSpiderQuest(), cat = createCatQuest();
  spider.ask(); spider.accept(); spider.begin(); spider.settle({ spiderDead: true });
  spider.take('bounty');
  assert.ok(!magicTeacherIds({ spider: spider.state }).includes(BEN.id), 'Ben cannot teach after his final coin choice');
  const fallen = createSpiderQuest(); fallen.benFell();
  assert.ok(!magicTeacherIds({ spider: fallen.state }).includes(BEN.id));
  assert.ok(!magicTeacherIds({ spider: { stage: 'fighting', benDown: true } }).includes(BEN.id));
  cat.ask(); cat.accept(); cat.died();
  assert.ok(!magicTeacherIds({ cat: cat.state }).includes(LIZ.id), 'Mop dying permanently closes the lesson');
  for (const [spell, id] of [['fireball', BEN.id], ['summon-bees', LIZ.id], ['mindread', TROY.id]]) {
    for (const knownSpells of [[spell], new Set([spell])]) {
      const ids = magicTeacherIds({ knownSpells });
      assert.equal(ids.length, 2);
      assert.ok(!ids.includes(id), `${spell} learned elsewhere removes its teaching offer`);
    }
  }
  assert.deepEqual(magicTeacherIds({ spider: { stage: 'taught' }, cat: { stage: 'taught' }, murder: { stage: 'taught' } }), []);
});

test('magic books follow busy and tutorial rules, work on the current slate and yield to gold', () => {
  const base = { questStage: TUTORIAL_DONE, magicTeachers: magicTeacherIds(), live: () => false };
  for (const id of base.magicTeachers) {
    assert.deepEqual(markerFor(id, base), { kind: 'magic', open: false });
    assert.equal(markerFor(id, { ...base, busy: true }), null);
    assert.equal(markerFor(id, { ...base, questStage: 0 }), null);
    assert.equal(markerFor(id, { ...base, magicTeachers: [] }), null);
    assert.equal(markerFor(id, { ...base, skillTeachers: [id], escortDestinations: [id] })?.kind, 'magic');
    assert.equal(markerFor(id, { ...base, arcDestinations: [id] })?.kind, 'main');
  }
  assert.equal(strongestMarker(['skill', 'magic', 'plot', 'deed']), 'magic');
  assert.equal(strongestMarker(['magic', MARKER_OPEN]), MARKER_OPEN);
});

test('Drent silver markers follow known leads without advertising Killian before reading evidence', () => {
  const current={questStage:TUTORIAL_DONE,drentDestinations:['instructor']};
  assert.equal(markerGrade(markerFor('instructor',current)),'plot');
  assert.equal(markerFor('killian',current),null);
  assert.equal(markerGrade(markerFor('killian',{...current,drentDestinations:['killian','instructor']})),'plot');
  assert.equal(markerFor('killian',{...current,drentDestinations:[]}),null);
  assert.equal(markerFor('vastos-herder',{questStage:TUTORIAL_DONE,silverDestinations:['vastos-herder']}),null);
});

test('Sela offers a copper deed, then marks its workers, independently of teacher quests', () => {
  const base={questStage:TUTORIAL_DONE,live:()=>false};
  assert.equal(markerFor('lauvel-seeker',{...base,burying:'hailed'})?.kind,'deed');
  assert.equal(markerFor('lauvel-seeker',{...base,burying:'helping'}),null);
  assert.equal(markerFor('lauvel-bearer-front',{...base,burying:'helping',buryingDestinations:['lauvel-bearer-front']})?.kind,'deed');
  assert.equal(markerFor('lauvel-seeker',{...base,burying:'found'})?.kind,'deed');
  assert.equal(markerFor('lauvel-seeker',{...base,burying:'done'}),null);
  assert.equal(markerFor('lauvel-seeker',{...base,burying:'hailed',busy:true}),null);
});


test('a locked teacher is visibly gated and cannot be unlocked by an old wine recommendation', async () => {
  const id = 'vintner', base = { questStage: TUTORIAL_DONE, ids: { vintner: id }, lockedSkillTeachers: [id], wineRecommended: true, live: () => true };
  assert.equal(markerGrade(markerFor(id, base)), 'skill-locked');
  assert.equal(markerFor(id, { ...base, lockedSkillTeachers: new Set([id]) })?.kind, 'skill-locked');
  assert.equal(markerFor(id, { ...base, busy: true }), null);
  assert.equal(markerFor(id, { ...base, questStage: 1 }), null);
  assert.equal(markerGrade(markerFor(id, { ...base, skillTeachers: [id] })), 'skill', 'An actual available lesson has priority');
  assert.equal(markerGrade(markerFor(id, { ...base, arcDestinations: [id] })), 'main');
  assert.equal(markerGrade(markerFor(id, { ...base, magicTeachers: [id] })), 'magic');
  const { makeQuestMarker } = await sourceModule('../src/characters.js');
  const marker = makeQuestMarker('skill-locked');
  assert.equal(marker.userData.billboard, true);
  assert.equal(marker.userData.markerLocked, true);
  assert.ok(marker.getObjectByName('Lesson padlock'), 'The gate has a padlock silhouette as well as a muted colour');
  assert.notEqual(marker.children[0].material.color.getHex(), makeQuestMarker('skill').children[0].material.color.getHex());
});
