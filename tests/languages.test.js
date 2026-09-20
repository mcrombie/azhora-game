import test from 'node:test';
import assert from 'node:assert/strict';
import { PLAYABLE_REGIONS } from '../src/region-layout.js';
import { SUBREGIONS } from '../src/map-fog.js';
import { MERCENARY_ROSTER } from '../src/mercenaries.js';
import { FREQUENT_WORDS } from '../src/word-frequency.js';
import {
  LANGUAGES, LANGUAGE_IDS, DIALECTS, DIALECT_IDS, REGION_LANGUAGE, ORIGIN_LANGUAGE, KINSHIP,
  STARTING_PROFICIENCY, PLACE_NAMES, NEVER_A_NAME, INTERPRETER, SEEDED_WORDS, SIGN_READING_LEVEL,
  forgeWord, wordIn, lexiconFor, hashWord, regionSpeech, speechFor, originLanguage,
} from '../src/languages.js';

test('every tongue is whole: a name, a country, a sound and a seed lexicon', () => {
  assert.ok(LANGUAGE_IDS.length >= 8 && LANGUAGE_IDS.length <= 20, 'the world has a plausible number of tongues');
  for (const id of LANGUAGE_IDS) {
    const tongue = LANGUAGES[id];
    assert.equal(tongue.id, id);
    for (const field of ['name', 'endonym', 'family', 'where', 'sound', 'from', 'note']) {
      assert.equal(typeof tongue[field], 'string', `${id}.${field}`);
      assert.ok(tongue[field].length > 3, `${id}.${field} says something`);
    }
    for (const list of ['onsets', 'middles', 'suffixes']) {
      assert.ok(tongue[list].length >= 4, `${id}.${list}`);
      assert.ok(tongue[list].every(part => /^[a-z’]+$/.test(part)), `${id}.${list} is lower-case sound`);
    }
    assert.ok(Object.keys(tongue.roots).length >= 12, `${id} has a seed lexicon`);
    assert.ok(Object.keys(tongue.roots).every(word => word === word.toLowerCase()), `${id} roots are keyed in English lower case`);
  }
});

test('every region on the atlas has a tongue, and every tongue named is real', () => {
  for (const region of PLAYABLE_REGIONS) {
    const spoken = REGION_LANGUAGE[region];
    assert.ok(spoken, `${region} has no tongue`);
    assert.ok(LANGUAGES[spoken.language], `${region} speaks an unknown tongue`);
    if (spoken.dialect) {
      assert.ok(DIALECTS[spoken.dialect], `${region} speaks an unknown dialect`);
      assert.equal(DIALECTS[spoken.dialect].language, spoken.language, `${region}'s dialect belongs to another tongue`);
    }
  }
  for (const region of Object.keys(REGION_LANGUAGE)) assert.ok(PLAYABLE_REGIONS.includes(region), `${region} is not on the atlas`);
  // Every charted subregion stands in a region that has a tongue, so no ground is silent.
  for (const area of SUBREGIONS) assert.ok(REGION_LANGUAGE[area.region], `${area.name} is in ${area.region}, which has no tongue`);
});

test('every mercenary origin maps to a tongue', () => {
  for (const mercenary of MERCENARY_ROSTER) {
    const id = originLanguage(mercenary.origin);
    assert.ok(id, `${mercenary.name} of ${mercenary.origin} has no tongue`);
    assert.ok(LANGUAGES[id], `${mercenary.name} speaks an unknown tongue`);
    assert.equal(speechFor({ origin: mercenary.origin }, 'Drent').language, id, 'a foreigner keeps his tongue wherever he stands');
  }
  for (const origin of Object.keys(ORIGIN_LANGUAGE)) {
    assert.ok(MERCENARY_ROSTER.some(mercenary => mercenary.origin === origin), `nobody comes from ${origin}`);
  }
  assert.equal(originLanguage('the moon'), null);
});

test('dialects belong to their parents and change only the sound', () => {
  for (const id of DIALECT_IDS) {
    const dialect = DIALECTS[id];
    assert.equal(dialect.id, id);
    assert.ok(LANGUAGES[dialect.language], `${id} has no parent tongue`);
    assert.ok(LANGUAGES[dialect.language].dialects.includes(id), `${dialect.language} does not claim ${id}`);
    assert.ok(dialect.of.length > 20, `${id} explains itself`);
    const word = LANGUAGES[dialect.language].roots.town ?? 'kalon';
    const twisted = dialect.twist(word);
    assert.equal(typeof twisted, 'string');
    assert.ok(twisted.length > 0 && Math.abs(twisted.length - word.length) <= 3, `${id} is an accent, not another word`);
  }
});

test('kinship is one hop, mutual where it is claimed, and never a whole language', () => {
  for (const id of LANGUAGE_IDS) assert.ok(KINSHIP[id], `${id} has no kinship entry`);
  for (const [id, kin] of Object.entries(KINSHIP)) {
    for (const [other, share] of Object.entries(kin)) {
      assert.ok(LANGUAGES[other], `${id} claims kin with an unknown tongue`);
      assert.notEqual(other, id, `${id} is not its own relative`);
      assert.ok(share > 0 && share <= .5, `${id}–${other} is a family resemblance, not a translation`);
      assert.ok(KINSHIP[other]?.[id], `${other} does not admit its kinship with ${id}`);
    }
  }
});

test('the traveler lands knowing nothing, and the table says so in one place', () => {
  assert.deepEqual(Object.keys(STARTING_PROFICIENCY).sort(), [...LANGUAGE_IDS].sort());
  for (const [id, level] of Object.entries(STARTING_PROFICIENCY)) {
    assert.equal(level, 0, `${id} starts at nothing`);
  }
});

test('Chris Gotwood interprets three tongues and not the world', () => {
  assert.ok(MERCENARY_ROSTER.some(mercenary => mercenary.id === INTERPRETER.npcId), 'the interpreter is on the roster');
  assert.ok(INTERPRETER.knows.length >= 1 && INTERPRETER.knows.length < LANGUAGE_IDS.length / 2, 'he knows some of it, not most of it');
  for (const id of INTERPRETER.knows) assert.ok(LANGUAGES[id], `he claims to know ${id}`);
  assert.ok(INTERPRETER.range > 0 && INTERPRETER.bonus > 1);
});

test('a forged word is the same word every time, and different in every tongue', () => {
  const words = ['road', 'stranger', 'remember', 'goblin', 'quartermaster', 'a', 'to'];
  for (const id of LANGUAGE_IDS) {
    for (const word of words) {
      assert.equal(wordIn(id, word), wordIn(id, word), `${id}/${word} is not stable`);
      assert.ok(/^[a-z’]+$/.test(wordIn(id, word)), `${id}/${word} is sayable: ${wordIn(id, word)}`);
    }
  }
  const spread = new Set(LANGUAGE_IDS.map(id => wordIn(id, 'stranger')));
  assert.ok(spread.size >= LANGUAGE_IDS.length - 1, 'the tongues do not all say the same thing');
  // The forge itself, below the lexicon, is a pure function of tongue, word and salt.
  assert.equal(forgeWord(LANGUAGES.drentish, 'road', 0), forgeWord(LANGUAGES.drentish, 'road', 0));
  assert.notEqual(forgeWord(LANGUAGES.drentish, 'road', 0), forgeWord(LANGUAGES.drentish, 'road', 1));
  assert.equal(hashWord('road'), hashWord('road'));
  assert.notEqual(hashWord('road'), hashWord('roads'));
});

test('no two of the commonest words share a word in the same tongue', () => {
  const common = FREQUENT_WORDS.slice(0, SEEDED_WORDS);
  for (const id of LANGUAGE_IDS) {
    const seen = new Map(), clashes = [];
    for (const word of common) {
      const made = wordIn(id, word);
      const held = seen.get(made);
      // Two English words may share one word only where the seed lexicon means them to.
      if (held !== undefined && LANGUAGES[id].roots[word] !== LANGUAGES[id].roots[held]) clashes.push(`${word}/${held}=${made}`);
      seen.set(made, word);
    }
    assert.deepEqual(clashes, [], `${id} confuses words a traveler hears all day`);
    assert.ok(lexiconFor(id).size() >= SEEDED_WORDS, `${id} seeded its lexicon`);
  }
});

test('a glossed root is the tongue’s real word and never a forged one', () => {
  assert.equal(wordIn('suvalen', 'water'), 'cael');          // src/winery.js: Vaervelm Caelazh
  assert.equal(wordIn('suvalen', 'good'), 'vaer');
  assert.equal(wordIn('suvalen', 'green'), 'velm');
  assert.equal(wordIn('izoli', 'hold'), 'veth');             // Izol's domain: the bond that holds
  assert.equal(wordIn('izoli', 'keep'), 'veth');
  assert.equal(wordIn('mittoli', 'measure'), 'nessar');       // the Academy's pre-Mittoli reconstruction under Nesdor
  assert.equal(wordIn('ibnael', 'sky'), 'vorn');
  assert.equal(wordIn('ibnael', 'lake'), 'ond');
  assert.equal(wordIn('koleth', 'word'), 'koleth');
});

test('the Cant is everybody’s: its words come out of other tongues', () => {
  const donors = LANGUAGES.cant.donors;
  assert.ok(donors.length >= 6, 'a pidgin needs a quay full of people');
  for (const id of donors) assert.ok(LANGUAGES[id] && id !== 'cant', `${id} is a real donor`);
  const made = ['road', 'stranger', 'weather', 'letter', 'mountain', 'promise'].map(word => wordIn('cant', word));
  assert.equal(new Set(made).size, made.length, 'and still says one thing at a time');
  assert.equal(wordIn('cant', 'yes'), 'savo', 'over a core of its own');
});

test('places are names and ordinary words are not', () => {
  for (const name of ['tidehaven', 'caloss', 'rena', 'elod', 'izolveth', 'ambron', 'drent', 'luscia', 'amod']) {
    assert.ok(PLACE_NAMES.has(name), `${name} is a name`);
  }
  for (const word of ['the', 'gate', 'road', 'camp', 'field', 'stone', 'bridge', 'town', 'of']) {
    assert.ok(!PLACE_NAMES.has(word), `${word} is a word, not a name`);
  }
  assert.ok(NEVER_A_NAME.has('i'), 'a capital I is a pronoun');
});

test('who speaks what: an override, then an origin, then the Empire, then the ground', () => {
  assert.equal(regionSpeech('Drent').language, 'drentish');
  assert.equal(regionSpeech('East Suval').language, 'koleth');
  assert.equal(regionSpeech('Peblos').dialect, 'pebble');
  assert.equal(regionSpeech('nowhere charted').language, REGION_LANGUAGE.Drent.language, 'unknown ground falls back to the road the game opens on');
  assert.equal(speechFor({ language: 'maroshi' }, 'Drent').language, 'maroshi', 'an explicit tongue wins');
  assert.equal(speechFor({ origin: 'Zorkys' }, 'Luscia').language, 'kellith', 'then where he came from');
  assert.equal(speechFor({ modelRole: 'legion-officer' }, 'West Izol').language, 'ambroni', 'the Empire answers in its own tongue anywhere');
  assert.equal(speechFor({ id: 'villager' }, 'West Suval').language, 'suvalen', 'and everybody else speaks the country they are standing in');
  assert.ok(SIGN_READING_LEVEL > 0 && SIGN_READING_LEVEL < 99, 'lettering turns over somewhere in the middle');
});
