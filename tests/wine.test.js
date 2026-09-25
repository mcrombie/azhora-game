import test from 'node:test';
import assert from 'node:assert/strict';
import { WINES, WINE_IDS, CELLAR_WINES, CELLAR_WINE_IDS, CELLAR_OPENS_AT, TASTING_TERMS, CELLAR_WALK, termsAt,
  WINE_SKILL, WINE_INTRO_TEACHERS, wineIntroChoice, createWine, vintnerConversation, cellarHandConversation, validateWineSnapshot } from '../src/wine.js';
import { WINEMAKER, CELLAR_HAND } from '../src/winery.js';
import { createSkills } from '../src/skills.js';

/** A dialogue box that records what was said and lets a test pick a reply. */
function talk(conversation, npc, extra = {}) {
  const screens = [], acted = [];
  conversation(npc, {
    openDialogue: (who, lines, event, action, options = {}) => screens.push({ lines, ...options }),
    closeDialogue: () => {}, act: id => acted.push(id), ...extra,
  });
  const pick = id => screens.at(-1).choices.find(choice => choice.id === id)?.action();
  return { screens, acted, pick, has: id => screens.at(-1).choices.some(choice => choice.id === id) };
}

test('the cellar makes five more wines out of the same eight grapes, each by its own method', () => {
  assert.equal(CELLAR_WINE_IDS.length, 5);
  for (const id of CELLAR_WINE_IDS) {
    const entry = CELLAR_WINES[id];
    assert.ok(WINE_IDS.includes(entry.from), `${id} starts in a block the vineyard has`);
    assert.ok(entry.note && entry.made && entry.lore, `${id} says what it is like and how it is made`);
    assert.ok(entry.xp >= 20, 'the cellar teaches more than a plain bottling');
  }
  // The five real methods, each named in its own entry.
  assert.match(CELLAR_WINES['sparkling-chardonnay'].made, /shut inside the bottle/);
  assert.match(CELLAR_WINES['cabernet-franc-rose'].made, /Pressed straight off the skins/);
  assert.match(CELLAR_WINES['vidal-ice'].made, /frozen/);
  assert.match(CELLAR_WINES['amber-viognier'].made, /sits on its own skins/);
  assert.match(CELLAR_WINES['fortified-norton'].made, /Spirit goes in while the ferment is still running/);
});

test('KAT keeps the cellar back until four of the eight are known, then pours all five', () => {
  const skills = createSkills(), wine = createWine({ skills });
  wine.learn();
  const early = talk(vintnerConversation, { id: WINEMAKER.id }, { wine });
  assert.equal(early.has('winery-cellar'), false, 'nothing from the cellar yet');
  assert.equal(early.has('winery-cellar-wait'), true, 'but she says why');
  for (const id of WINE_IDS.slice(0, CELLAR_OPENS_AT)) wine.taste(id);
  assert.equal(wine.cellarOpen, true);
  assert.equal(wine.plainTasted, CELLAR_OPENS_AT);
  const open = talk(vintnerConversation, { id: WINEMAKER.id }, { wine });
  assert.equal(open.has('winery-cellar'), true);
  open.pick('winery-cellar');
  for (const id of CELLAR_WINE_IDS) assert.ok(open.screens.at(-1).choices.some(choice => choice.id === `taste-${id}`), `she offers the ${id}`);
});

test('a cellar wine is tasted like any other and counts toward the skill', () => {
  const skills = createSkills(), wine = createWine({ skills });
  wine.learn();
  const result = wine.taste('vidal-ice');
  assert.equal(result.ok, true);
  assert.equal(result.first, true);
  assert.equal(result.xp, CELLAR_WINES['vidal-ice'].xp);
  assert.equal(wine.hasTasted('vidal-ice'), true);
  // It is remembered across a save, and nonsense is still refused.
  const restored = createWine({ skills: createSkills() });
  assert.equal(restored.restore(wine.snapshot()), true);
  assert.equal(restored.hasTasted('vidal-ice'), true);
  assert.equal(validateWineSnapshot({ version: 1, met: true, quest: 'none', tasted: { 'vidal-ice': 2 } }), true);
  assert.equal(validateWineSnapshot({ version: 1, met: true, quest: 'none', tasted: { 'pinot-nothing': 1 } }), false);
});

test('the words for what is in the glass arrive as the skill levels', () => {
  assert.deepEqual(termsAt(1).map(term => term.id), ['acid', 'tannin']);
  assert.equal(termsAt(4).length, 5);
  assert.equal(termsAt(99).length, TASTING_TERMS.length);
  for (const term of TASTING_TERMS) {
    assert.ok(term.what.length > 40, `${term.id} is explained`);
    assert.ok(term.level >= 1 && term.level <= 20);
  }
  // The levels only ever go up, so nothing arrives twice.
  const levels = TASTING_TERMS.map(term => term.level);
  assert.deepEqual(levels, [...levels].sort((a, b) => a - b));
  // And the journal reads them off the skill's own level.
  const skills = createSkills(), wine = createWine({ skills });
  wine.learn();
  assert.deepEqual(wine.terms().map(term => term.id), termsAt(skills.level(WINE_SKILL)).map(term => term.id));
  assert.deepEqual(wine.view().terms, wine.terms());
});

test('MAT walks anybody who asks through the making, in the order it happens', () => {
  const walk = talk(cellarHandConversation, { id: CELLAR_HAND.id });
  assert.equal(walk.has('cellar-walk'), true);
  walk.pick('cellar-walk');
  assert.deepEqual(walk.screens.at(-1).lines, [...CELLAR_WALK]);
  const said = CELLAR_WALK.join(' ');
  for (const step of [/sorting table/, /crusher/, /Ferment/, /Press/, /acid turns to the soft milk acid/, /rack it off its lees/, /bottling/])
    assert.match(said, step, 'every step of the making is in the walk');
});

test('the winery journal counts the cellar in, and says how to open it', () => {
  const skills = createSkills(), wine = createWine({ skills });
  wine.learn();
  const view = wine.view();
  assert.equal(view.total, WINE_IDS.length + CELLAR_WINE_IDS.length + 8, 'eight grapes, five from the cellar, eight of Juan’s');
  const locked = view.entries.find(entry => entry.id === 'amber-viognier');
  assert.match(locked.detail, /Taste 4 of the eight first/);
  assert.equal(locked.name, 'Something of KAT’s made from the Viognier');
  for (const id of WINE_IDS.slice(0, CELLAR_OPENS_AT)) wine.taste(id);
  assert.match(wine.view().entries.find(entry => entry.id === 'amber-viognier').detail, /offered it from the cellar/);
  wine.taste('amber-viognier');
  assert.equal(wine.view().entries.find(entry => entry.id === 'amber-viognier').name, CELLAR_WINES['amber-viognier'].name);
});


test('five requested teachers introduce Wine without a Farming prerequisite and Rob does not', () => {
  assert.deepEqual(WINE_INTRO_TEACHERS, ['winemaker', 'cellar-hand', 'ben-sorcerer', 'liz-beekeeper', 'bee-keeper']);
  for (const id of WINE_INTRO_TEACHERS) {
    const npc = { id }, skills = createSkills(), wine = createWine({ skills }), taughtBy = [];
    const farmBefore = skills.xp('farming');
    assert.equal(skills.taught('farming'), false);
    const choice = wineIntroChoice(npc, { wine, teach: who => { taughtBy.push(who); wine.learn(); } });
    assert.ok(choice && /wine/i.test(choice.label), `${id} clearly offers the Wine introduction`);
    assert.equal(wine.met, false, 'Showing the choice does not silently teach the skill');
    choice.action();
    assert.deepEqual(taughtBy, [npc], 'The host receives the actual chosen teacher');
    assert.equal(wine.met, true);
    assert.equal(wineIntroChoice(npc, { wine, teach: () => assert.fail('Already taught') }), null);
    assert.equal(skills.taught('farming'), false, 'Wine does not introduce Farming');
    assert.equal(skills.xp('farming'), farmBefore, 'Wine leaves Farming experience untouched');
  }
  for (const id of ['vintner', 'unknown-person']) {
    assert.equal(wineIntroChoice({ id }, { wine: createWine(), teach: () => assert.fail('Not a Wine teacher') }), null);
  }
});
