import { QUEST_DONE } from '../src/game-state.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_GAME_MODE, GAME_MODES, GAME_MODE_HARD, GAME_MODE_NORMAL, HARD_MODE_FEATURES, HARD_MODE_FEATURE_IDS,
  createGameMode, gameModeOf, hiddenSkillsIn, isGameMode, validateGameModeSnapshot,
} from '../src/game-mode.js';
import { SKILL_IDS, SKILLS, SKILLS_VERSION, createSkills, validateSkillsSnapshot } from '../src/skills.js';
import { createLinguist, renderLine } from '../src/linguist.js';
import { speechFor } from '../src/languages.js';
import { createRoadCheckpoint } from '../src/road-checkpoint.js';
import { createInventoryState } from '../src/inventory.js';
import { createWeapons } from '../src/weapons.js';
import { createJourney } from '../src/journey.js';
import { METRES_PER_HEX } from '../src/world-scale.js';

const srcDir = fileURLToPath(new URL('../src/', import.meta.url));
const source = name => readFileSync(`${srcDir}${name}`, 'utf8');

/* ------------------------------------------------------------------ *
 * The gate itself
 * ------------------------------------------------------------------ */

test('two modes, normal by default, and one frozen table of what hard mode holds', () => {
  assert.deepEqual([...GAME_MODES], [GAME_MODE_NORMAL, GAME_MODE_HARD]);
  assert.equal(DEFAULT_GAME_MODE, GAME_MODE_NORMAL);
  assert.equal(createGameMode().mode, GAME_MODE_NORMAL, 'a game nobody said anything about is normal');
  assert.equal(createGameMode({ mode: undefined }).mode, GAME_MODE_NORMAL);
  assert.equal(createGameMode({ mode: null }).mode, GAME_MODE_NORMAL, 'and so is one the query string never answered');
  assert.equal(createGameMode({ mode: 'HARD' }).mode, GAME_MODE_NORMAL, 'the flag is spelled the way the table spells it');
  assert.equal(createGameMode({ mode: GAME_MODE_HARD }).mode, GAME_MODE_HARD);
  assert.equal(gameModeOf('nonsense'), GAME_MODE_NORMAL);
  assert.equal(isGameMode(GAME_MODE_HARD), true);
  assert.equal(isGameMode('very hard'), false);

  // One table, and today it holds exactly one thing: the linguist.
  assert.deepEqual([...HARD_MODE_FEATURE_IDS], ['linguist']);
  assert.ok(Object.isFrozen(HARD_MODE_FEATURES) && Object.isFrozen(HARD_MODE_FEATURES.linguist));
  for (const id of HARD_MODE_FEATURE_IDS) {
    const feature = HARD_MODE_FEATURES[id];
    assert.equal(feature.id, id);
    assert.ok(feature.name && feature.note.length > 40, `${id} says what it is`);
    for (const skill of feature.skills) assert.ok(Object.hasOwn(SKILLS, skill), `${skill} is still in the registry`);
  }
});

test('has() answers for a feature by name, and never for a name it does not know', () => {
  const normal = createGameMode(), hard = createGameMode({ mode: GAME_MODE_HARD });
  for (const id of HARD_MODE_FEATURE_IDS) {
    assert.equal(normal.has(id), false, `normal mode does not have ${id}`);
    assert.equal(hard.has(id), true, `hard mode does`);
  }
  // A misspelling that came back true would switch a reserved thing back on in the mode we ship.
  for (const wrong of ['linguistics', 'Linguist', '', undefined, 'toString', 'constructor'])
    assert.equal(normal.has(wrong), false, `${String(wrong)} is not a feature`);
  for (const wrong of ['linguistics', 'Linguist', '', undefined, 'toString', 'constructor'])
    assert.equal(hard.has(wrong), false, `${String(wrong)} is not a feature in hard mode either`);
  assert.equal(normal.normal, true); assert.equal(normal.hard, false);
  assert.equal(hard.hard, true); assert.equal(hard.normal, false);
});

test('the mode is one field, it round-trips, and no field at all is normal', () => {
  const mode = createGameMode({ mode: GAME_MODE_HARD });
  assert.equal(mode.snapshot(), GAME_MODE_HARD, 'one field, not an object');
  const fresh = createGameMode();
  assert.equal(fresh.restore(mode.snapshot()), true);
  assert.equal(fresh.mode, GAME_MODE_HARD);
  assert.equal(fresh.restore('sideways'), false, 'and a mode this build does not know is refused');
  assert.equal(fresh.mode, GAME_MODE_NORMAL, 'falling back to the one we develop');
  assert.equal(fresh.restore(undefined), false, 'restore is told what to restore');
  assert.equal(validateGameModeSnapshot(undefined), true, 'a save with no field at all is a normal-mode game');
  assert.equal(validateGameModeSnapshot(undefined, { allowMissing: false }), false);
  assert.equal(validateGameModeSnapshot(GAME_MODE_NORMAL), true);
  assert.equal(validateGameModeSnapshot(GAME_MODE_HARD), true);
  for (const bad of ['easy', 1, {}, [], true]) assert.equal(validateGameModeSnapshot(bad), false, JSON.stringify(bad));
});

test('the gate is the only reader of the mode', () => {
  const files = readdirSync(srcDir).filter(name => name.endsWith('.js') && name !== 'game-mode.js');
  const importers = [];
  for (const name of files) {
    const text = source(name);
    const imported = text.match(/import \{([^}]*)\} from '\.\/game-mode\.js';/);
    if (imported) importers.push([name, imported[1].split(',').map(part => part.trim()).filter(Boolean)]);
    assert.doesNotMatch(text, /GAME_MODE_HARD|GAME_MODE_NORMAL|HARD_MODE_FEATURES|hiddenSkillsIn/,
      `${name} does not name a mode or reach past the gate for its table`);
  }
  // Two files, and each takes exactly what it needs: the host builds the gate, the checkpoint
  // checks the one field it carries.
  assert.deepEqual(importers.map(([name]) => name).sort(), ['main.js', 'road-checkpoint.js']);
  assert.deepEqual(Object.fromEntries(importers), { 'main.js': ['createGameMode'], 'road-checkpoint.js': ['validateGameModeSnapshot'] });
  const main = source('main.js');
  assert.match(main, /const gameMode=createGameMode\(\{mode:testingQuery\.get\('mode'\)\}\);/,
    'the only way in is the launch flag, beside the testing query');
  assert.doesNotMatch(main, /gameMode\.(mode|hard|normal)\b/,
    'and the host asks for a feature by name rather than for which mode it is in');
  assert.ok(main.includes("gameMode.has('linguist')"), 'which is how the linguist is asked for');
});

/* ------------------------------------------------------------------ *
 * Normal mode, in the game as played
 * ------------------------------------------------------------------ */

const LINE = 'The army’s post is up the road in the Avrel clearing. Ask for the quartermaster.';

test('a normal-mode dialogue is the authored English, whatever tongue the speaker has', () => {
  // The speaker really does have a tongue of his own, and rendering through it really does change
  // the line — so a normal mode that rendered anyway would be caught here and not pass by luck.
  const spoken = speechFor({ id: 'harbormaster' }, 'Drent');
  assert.equal(spoken.language, 'drentish', 'Jojo is not an English speaker in this world');
  assert.notEqual(renderLine(LINE, spoken.language, { level: 0 }), LINE, 'and her tongue changes a line');

  // The panel's own line. The gate is the first thing in it, what it hands back is the line as
  // it was authored, and nothing is heard into a tongue before that.
  const main = source('main.js');
  const heard = main.slice(main.indexOf('function heardSpeech(){'));
  const gate = heard.indexOf("if(!gameMode.has('linguist'))");
  assert.ok(gate > 0 && gate < heard.indexOf('linguist.interpreterNearby('), 'the gate is the first thing the panel asks');
  assert.match(heard.slice(gate, gate + 220), /return line;\}/, 'and the authored line is what comes back');
  assert.ok(gate < heard.indexOf('linguist.hear('), 'nothing is heard into a tongue before it');
  // No aside, no tongue in the caption, and the key that shows a line as it was said does nothing.
  assert.match(heard.slice(gate, gate + 220), /show\('speech-aside',false\)/, 'and no interpreter aside under it');
  assert.match(main, /function speechTongue\(\)\{\s*if\(!gameMode\.has\('linguist'\)\)return '';/, 'no “T in <tongue>” suffix');
  assert.match(main, /e\.code===LINGUIST_KEY&&mode==='dialogue'&&gameMode\.has\('linguist'\)/, 'and T is hard mode’s key');
  // The signs letter in English because nobody is asked whether they can be read.
  assert.match(main, /if\(gameMode\.has\('linguist'\)\)setSignReader\(/, 'no sign reader in normal mode');
});

test('normal mode shows twenty-five skills, pays none of the Linguist, and offers nothing that teaches a tongue', () => {
  assert.deepEqual([...hiddenSkillsIn(GAME_MODE_NORMAL)], ['linguist']);
  assert.deepEqual([...hiddenSkillsIn(GAME_MODE_HARD)], [], 'hard mode hides nothing');
  assert.deepEqual([...hiddenSkillsIn(undefined)], ['linguist'], 'and the default is normal');
  const shown = SKILL_IDS.filter(id => !hiddenSkillsIn(GAME_MODE_NORMAL).includes(id));
  assert.equal(shown.length, 25, 'the seven Arms and the five schools of sorcery are on the sheet too');
  assert.equal(shown.includes('linguist'), false, 'the tile is not on the sheet');
  assert.equal(SKILL_IDS.includes('linguist'), true, 'and the registry keeps it all the same');

  const main = source('main.js');
  assert.match(main, /const hiddenSkills=new Set\(gameMode\.hiddenSkills\);/, 'one set, taken from the gate');
  assert.match(main, /function shownSkills\(\)\{return skills\.view\(\)\.filter\(entry=>!hiddenSkills\.has\(entry\.id\)\);\}/, 'the sheet draws what this mode shows');
  assert.match(main, /const view=shownSkills\(\),open=openSkillId/, 'and so does the guide behind a tile');
  assert.match(main, /\|\|hiddenSkills\.has\(id\)\|\|/, 'a hidden skill has no page to open');
  assert.match(main, /String\(shownTotalLevel\(\)\)/, 'the total level counts what is shown');
  assert.match(main, /SKILL_IDS\.includes\(id\)&&!hiddenSkills\.has\(id\)/, 'and a hidden skill is not handed out at the start either');
  assert.match(main, /if\(gameMode\.has\('linguist'\)\)for\(const \[id,proficiency\] of Object\.entries\(startingLanguages\(playerId\)\)\)/,
    'startingLanguages stays in the data and is not applied');
  assert.match(main, /hidden:hiddenSkills,/, 'nor claimed at character selection');
  // The two things that exist only to teach a tongue.
  assert.match(main, /const drill=gameMode\.has\('linguist'\)\?longRoad\.view\(longRoadWorld\(\)\)\.drill:null;/, 'the five sittings are not offered');
  assert.match(main, /const sellsPhrasebook=gameMode\.has\('linguist'\);/, 'and the phrasebook is not sold');
  assert.match(main, /stock:sellsPhrasebook\?PEDDLER_STOCK:PEDDLER_STOCK\.filter\(entry=>entry\.id!==PHRASEBOOK_ITEM\)/, 'it is off the pack');
  assert.match(main, /peddlerLines\(\{phrasebook:sellsPhrasebook\}\)/, 'and Wendel does not offer it');
});

test('no line in normal mode says the traveler cannot follow what is said', () => {
  const swept = ['long-road.js', 'story-chapters.js', 'moros-chapter.js', 'economy.js'];
  for (const name of swept) {
    const text = source(name);
    for (const phrase of ['you cannot hear what is being said', 'a language you did not have',
      'a man you could not follow', 'the tongue first'])
      assert.ok(!text.includes(phrase), `${name} still says “${phrase}”`);
  }
  // Wendel offers a phrasebook only out of the line kept for the mode that sells one.
  const economy = source('economy.js');
  const [, lines] = economy.match(/lines: Object\.freeze\(\[([\s\S]*?)\]\),/);
  assert.ok(!lines.includes('phrasebook'), 'his opening does not mention one');
  assert.match(economy, /phrasebookLine: 'Now\./, 'and the line that does is kept beside it');
});

test('every other surface a tongue could reach is shut in normal mode', () => {
  // The sweep behind this one: speech, the aside, signs, the phrasebook, Chris's five drills,
  // the skill tile, the starting tongues, and the character sheet's own list of them.
  const main = source('main.js');

  // **Signs.** The host hands the world a reader only in hard mode, and with nobody to ask every
  // sign letters in the traveler's own language (driven in tests/signs.test.js, which can load
  // the module that draws them).
  assert.match(main, /if\(gameMode\.has\('linguist'\)\)setSignReader\(id => linguist\.canRead\(id\)\);/,
    'only hard mode ever sets one');

  // **Speech and the aside.** The gate returns the authored line and clears the aside, before
  // anything is heard or rendered: `linguist.hear` is below the early return, so nothing is paid.
  assert.match(main, /if\(!gameMode\.has\('linguist'\)\)\{const plain=\$\('speech-aside'\);if\(plain\)\{plain\.textContent='';show\('speech-aside',false\);\}return line;\}/,
    'the authored English, and no aside');

  // **The phrasebook**, and so the tongue it would teach, is not on Wendel's boards.
  assert.match(main, /const sellsPhrasebook=gameMode\.has\('linguist'\);/);
  assert.match(main, /stock:sellsPhrasebook\?PEDDLER_STOCK:PEDDLER_STOCK\.filter\(entry=>entry\.id!==PHRASEBOOK_ITEM\)/);

  // **Chris's five sittings** exist to teach a tongue, so they are not offered.
  assert.match(main, /const drill=gameMode\.has\('linguist'\)\?longRoad\.view\(longRoadWorld\(\)\)\.drill:null;/);

  // **What he lands knowing**: the skill's experience and the tongues are both behind the gate,
  // and the character sheet is handed the hidden list so nobody reads a Linguist level off it.
  assert.match(main, /if\(gameMode\.has\('linguist'\)\)for\(const \[id,proficiency\] of Object\.entries\(startingLanguages\(playerId\)\)\)/);
  assert.match(main, /SKILL_IDS\.includes\(id\)&&!hiddenSkills\.has\(id\)/);
  assert.match(source('character-select.js'), /describeStartingSkills\(entry, hidden\)/);
});

/* ------------------------------------------------------------------ *
 * Saves
 * ------------------------------------------------------------------ */

function memoryStorage() {
  const values = new Map();
  return { values, getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
}

/** The smallest checkpoint the validator accepts, so a field can be added to it one at a time. */
function fixture() {
  const inventory = createInventoryState();
  for (const id of ['simple-sword', 'harbor-letter', 'road-token']) inventory.grant(id);
  const weapons = createWeapons({ wear: true, inventory });
  const journey = createJourney({ inventory, weapons });
  journey.start();
  return {
    checkpoint: createRoadCheckpoint({ storage: memoryStorage() }),
    data: {
      version: 1, worldScale: METRES_PER_HEX, questStage: QUEST_DONE, journey: journey.snapshot(),
      inventory: inventory.items().map(id => ({ id, quantity: inventory.count(id) })),
      weapons: weapons.snapshot(), journeyGathered: [], meadowCleared: false,
      position: { x: 3, z: -190 }, heardDoom: true, lysaComplete: true, health: 74,
    },
  };
}

test('a save with no mode field loads, and is a normal-mode adventure', () => {
  const { checkpoint, data } = fixture();
  assert.equal(Object.hasOwn(data, 'mode'), false, 'every save written before there were modes');
  assert.equal(checkpoint.save(data).ok, true);
  assert.equal(checkpoint.read().data.mode, undefined);
  assert.equal(createGameMode({ mode: checkpoint.read().data.mode }).mode, GAME_MODE_NORMAL);
  assert.equal(createGameMode({ mode: checkpoint.read().data.mode }).has('linguist'), false);
  // The field itself keeps, and a mode this build does not know is refused rather than assumed.
  for (const mode of GAME_MODES) {
    assert.equal(checkpoint.save({ ...data, mode }).ok, true, mode);
    assert.equal(checkpoint.read().data.mode, mode);
  }
  const refused = checkpoint.save({ ...data, mode: 'merciless' });
  assert.equal(refused.ok, false);
  assert.match(refused.reason, /game mode/);
  // And the host writes it: one field beside the rest.
  assert.match(source('main.js'), /mode:gameMode\.snapshot\(\)/, 'the save says which game it was');
});

test('a save that holds linguist experience keeps every point of it', () => {
  const held = { version: SKILLS_VERSION, skills: { birding: { xp: 140 }, linguist: { xp: 12_345 } } };
  assert.equal(validateSkillsSnapshot(held), true, 'the registry keeps the skill, so the save still validates');
  const skills = createSkills();
  assert.equal(skills.restore(held), true);
  assert.equal(skills.known('linguist'), true);
  // The snapshot also carries who taught what now (src/skills.js); a save from before that says
  // it with its own keys, so both skills come back taught.
  assert.deepEqual(skills.snapshot(), { ...held, taught: ['birding', 'linguist'] }, 'and it comes back untouched');
  // It is simply not drawn: the sheet filters, it does not forget.
  assert.equal(skills.view().find(entry => entry.id === 'linguist').xp, 12_345);
  assert.equal(skills.view().filter(entry => !hiddenSkillsIn(GAME_MODE_NORMAL).includes(entry.id))
    .some(entry => entry.id === 'linguist'), false);

  // The tongues themselves, likewise: the checkpoint carries them and restore hands them back.
  const linguist = createLinguist();
  linguist.study('drentish', 300);
  const kept = linguist.snapshot();
  const { checkpoint, data } = fixture();
  assert.equal(checkpoint.save({ ...data, linguist: kept }).ok, true);
  const back = createLinguist();
  assert.equal(back.restore(checkpoint.read().data.linguist), true);
  assert.equal(back.level('drentish'), linguist.level('drentish'));
  assert.ok(back.level('drentish') > 0, 'a tongue that was learned is still there');
});
