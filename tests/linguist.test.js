import test from 'node:test';
import assert from 'node:assert/strict';
import { createSkills, RUNESCAPE_TABLE, SKILLS } from '../src/skills.js';
import { LANGUAGE_IDS, LANGUAGES, INTERPRETER, SIGN_READING_LEVEL, PHRASEBOOK_EXPOSURE } from '../src/languages.js';
import {
  createLinguist, renderLine, comprehension, proficiencyForExposure, exposureForProficiency,
  exposureWeight, validateLinguistSnapshot, LINGUIST_VERSION, LINGUIST_SKILL, MAX_PROFICIENCY, FLUENT_EXPOSURE,
} from '../src/linguist.js';

const LINE = 'Chris Gotwood. Same boat, same coin, and I have the letter they gave us both — you take it, you are the one they wrote it about.';
const SHORT = 'The army’s post is up the road in the Avrel clearing. Ask for the quartermaster, and show him 3 copper.';
const names = new Set(['chris', 'gotwood', 'lakota']);

const english = line => line.match(/[A-Za-z][A-Za-z’']*/g) ?? [];
/** Which words of the original survived into the rendering, in order. */
const survived = (line, rendered) => {
  const want = english(line), got = new Set(english(rendered).map(word => word.toLowerCase()));
  return want.filter(word => got.has(word.toLowerCase()));
};

test('a line rendered is the same line every time, whatever order it is asked in', () => {
  for (const id of ['drentish', 'koleth', 'cant']) {
    const once = renderLine(LINE, id, { level: 30, names });
    assert.equal(renderLine(LINE, id, { level: 30, names }), once);
    assert.equal(renderLine(`${LINE} ${LINE}`, id, { level: 30, names }), `${once} ${once}`, 'a word is that word wherever it stands');
  }
});

test('names, numbers, punctuation and spacing come through untouched', () => {
  const made = renderLine(SHORT, 'izoli', { level: 0, names });
  assert.ok(made.includes('Avrel'), 'a charted place keeps its name');
  assert.ok(made.includes('3 copper.') || made.includes('3 '), 'a number is a number in every language');
  assert.match(made, /^The? |^[A-Z]/, 'the line still opens with a capital');
  assert.equal((made.match(/,/g) ?? []).length, (SHORT.match(/,/g) ?? []).length, 'every comma survives');
  assert.equal(made.at(-1), '.', 'and the full stop');
  assert.ok(renderLine(LINE, 'izoli', { level: 0, names }).startsWith('Chris Gotwood.'), 'a person keeps his name');
  assert.ok(renderLine(LINE, 'izoli', { level: 0, names }).includes('—'), 'the dash survives');
});

test('at nothing you understand nothing, and at ninety-nine the line is exactly what was said', () => {
  const nothing = renderLine(LINE, 'drentish', { level: 0, names });
  assert.deepEqual(survived(LINE, nothing), ['Chris', 'Gotwood'], 'only the names');
  assert.equal(renderLine(LINE, 'drentish', { level: MAX_PROFICIENCY, names }), LINE);
  assert.equal(renderLine(SHORT, 'koleth', { level: MAX_PROFICIENCY, names }), SHORT);
  assert.equal(comprehension(0), 0);
  assert.equal(comprehension(MAX_PROFICIENCY), 1);
  assert.ok(comprehension(20) < .2 && comprehension(50) > .4 && comprehension(50) < .6, 'slow at first, half the way at half');
});

test('the words arrive in order, commonest first, and a word once known stays known', () => {
  let held = new Set();
  for (let level = 0; level <= MAX_PROFICIENCY; level += 3) {
    const known = new Set(survived(LINE, renderLine(LINE, 'mittoli', { level, names })));
    for (const word of held) assert.ok(known.has(word), `"${word}" was known at a lower level and is not known at ${level}`);
    held = known;
  }
  assert.equal(new Set([...held].map(word => word.toLowerCase())).size, new Set(english(LINE).map(word => word.toLowerCase())).size,
    'and at the top there is nothing left to learn');
  // Scaffolding first: the function words come before the nouns.
  const early = survived(LINE, renderLine(LINE, 'mittoli', { level: 33, names }));
  assert.ok(early.includes('the') && early.includes('and'), 'the commonest words come first');
  assert.ok(!early.includes('quartermaster'), 'and the rarest do not');
});

test('the toggle shows what was actually said, however much of it you understand', () => {
  const heard = renderLine(LINE, 'drentish', { level: 70, names });
  const spoken = renderLine(LINE, 'drentish', { level: 70, full: true, names });
  assert.notEqual(heard, spoken, 'at seventy the two differ');
  assert.deepEqual(survived(LINE, spoken), ['Chris', 'Gotwood'], 'the full line is all Drentish but the names');
  assert.equal(spoken, renderLine(LINE, 'drentish', { level: 0, names }), 'and it is the same line you heard on the first day');
});

test('a dialect changes the sound and never the order of the words', () => {
  const plain = renderLine(SHORT, 'drentish', { level: 20, names });
  const pebble = renderLine(SHORT, 'drentish', { level: 20, dialect: 'pebble', names });
  assert.notEqual(plain, pebble);
  assert.equal(english(plain).length, english(pebble).length, 'the same number of words');
  assert.equal(renderLine(SHORT, 'drentish', { level: 20, dialect: 'highland', names }), plain, 'an Izoli accent means nothing in Drentish');
});

test('exposure raises a tongue, with less from every repetition of the same mouth', () => {
  const linguist = createLinguist();
  const speaker = { id: 'villager', name: 'Nell' };
  assert.equal(linguist.level('drentish'), 0);
  const first = linguist.hear(speaker, 'Good morning to you.', { region: 'Drent' });
  assert.equal(first.language, 'drentish');
  assert.equal(first.gained, 1, 'the first thing anybody says is worth all of it');
  const second = linguist.hear(speaker, 'And a fine one.', { region: 'Drent' });
  assert.ok(second.gained < first.gained, 'the second is worth less');
  for (let i = 0; i < 40; i++) linguist.hear(speaker, 'More of the same.', { region: 'Drent' });
  const late = linguist.hear(speaker, 'Still talking.', { region: 'Drent' });
  assert.ok(late.gained < second.gained / 2, 'and one man cannot teach you his language');
  assert.equal(linguist.heardFrom('villager'), 43);
  assert.ok(linguist.level('drentish') > 0 && linguist.level('drentish') < 40, 'forty lines from one villager is a beginning');
  assert.ok(exposureWeight(1) > exposureWeight(4) && exposureWeight(4) > exposureWeight(100));
  assert.ok(exposureWeight(1e6) > 0, 'and never quite nothing');
});

test('the exposure curve is a real climb that ends exactly at ninety-nine', () => {
  assert.equal(proficiencyForExposure(0), 0);
  assert.equal(proficiencyForExposure(FLUENT_EXPOSURE), MAX_PROFICIENCY);
  assert.equal(proficiencyForExposure(FLUENT_EXPOSURE * 10), MAX_PROFICIENCY);
  for (let level = 0; level <= MAX_PROFICIENCY; level++) {
    assert.equal(proficiencyForExposure(exposureForProficiency(level)), level, `level ${level} round-trips`);
  }
  // Diminishing: the first half of the levels costs far less than the second.
  assert.ok(exposureForProficiency(50) < FLUENT_EXPOSURE / 4, 'the first fifty are cheap');
  assert.ok(exposureForProficiency(90) > FLUENT_EXPOSURE / 2, 'the last nine are not');
});

test('an interpreter beside you is worth two people saying it at you', () => {
  const alone = createLinguist(), helped = createLinguist();
  for (let i = 0; i < 20; i++) {
    alone.hear({ id: `person-${i}` }, 'A line.', { region: 'Drent' });
    helped.hear({ id: `person-${i}` }, 'A line.', { region: 'Drent', times: INTERPRETER.bonus });
  }
  assert.ok(helped.level('drentish') > alone.level('drentish'), 'sticking with Chris is the fast road');
  assert.equal(helped.exposure('drentish'), alone.exposure('drentish') * INTERPRETER.bonus);
});

test('Chris interprets what he knows, while he is beside you and still walking', () => {
  const linguist = createLinguist();
  const chris = { id: INTERPRETER.npcId, placement: { phase: 'walking', x: 0, z: 0 } };
  const near = { id: 'villager', placement: { x: 5, z: 0 } };
  const far = { id: 'villager', placement: { x: 400, z: 0 } };
  assert.equal(linguist.interpreterNearby(near, { interpreter: chris, languageId: 'drentish' }), true);
  assert.equal(linguist.interpreterNearby(far, { interpreter: chris, languageId: 'drentish' }), false);
  assert.equal(linguist.interpreterNearby(near, { interpreter: chris, languageId: 'maroshi' }), false, 'he does not know the fens');
  assert.equal(linguist.interpreterNearby(near, { interpreter: { ...chris, placement: { phase: INTERPRETER.reached, x: 0, z: 0 } }, languageId: 'drentish' }), false, 'once he has mustered you are on your own');
  assert.equal(linguist.interpreterNearby(near, { interpreter: { ...chris, hidden: true }, languageId: 'drentish' }), false);
  assert.equal(linguist.interpreterNearby(near, { interpreter: null }), false);
  assert.equal(linguist.interpreterNearby(chris, { interpreter: chris, languageId: 'drentish' }), false, 'and he does not interpret himself');
});

test('a relative of a tongue you know gives you a floor in it, one hop and no further', () => {
  const linguist = createLinguist();
  linguist.study('drentish', exposureForProficiency(80));
  assert.equal(linguist.ownLevel('drentish'), 80);
  assert.equal(linguist.ownLevel('feradom'), 0, 'you have never heard a word of it');
  assert.equal(linguist.level('feradom'), Math.floor(80 * .45), 'and you still catch the shape of it');
  assert.equal(linguist.level('ambroni'), Math.floor(80 * .2));
  assert.equal(linguist.level('mittoli'), Math.floor(Math.floor(80 * .2) * 0), 'never through a third tongue');
  assert.equal(linguist.level('cant'), Math.floor(80 * .25), 'and a quay half-understands anybody who has been anywhere');
});

test('signs are all or nothing, and turn over halfway', () => {
  const linguist = createLinguist();
  assert.equal(linguist.canRead('drentish'), false);
  const foreign = linguist.readSign('The Caloss Gate', 'Drent');
  assert.ok(foreign.includes('Caloss'), 'the name is the name');
  assert.ok(!foreign.includes('Gate'), 'and the rest of it is Drentish');
  linguist.study('drentish', exposureForProficiency(SIGN_READING_LEVEL - 1));
  assert.equal(linguist.canRead('drentish'), false, 'one short of it and the road still says nothing');
  linguist.study('drentish', exposureForProficiency(SIGN_READING_LEVEL) - linguist.exposure('drentish'));
  assert.equal(linguist.canRead('drentish'), true);
  assert.equal(linguist.readSign('The Caloss Gate', 'Drent'), 'The Caloss Gate');
  assert.equal(linguist.readSign('Elod', 'East Suval'), 'Elod', 'a name letters the same in every tongue');
});

test('the traveler’s own skill climbs with the tongues, and ninety-nine is the whole world', () => {
  // A stand-in skill sheet, so the arithmetic is checked whether or not
  // src/skills.js has registered `linguist` yet; the real sheet is checked below.
  const sheet = () => { let xp = 0, learned = false; return { known: () => learned, learn: () => { learned = true; return { ok: true }; },
    gain: (id, amount) => { assert.equal(id, LINGUIST_SKILL); xp += amount; return { ok: true, levelled: false }; }, total: () => xp }; };
  const heard = sheet(), linguist = createLinguist({ skills: heard });
  linguist.hear({ id: 'a' }, 'A line.', { region: 'Drent' });
  assert.ok(heard.total() > 0, 'every line heard is experience');

  const world = sheet(), whole = createLinguist({ skills: world });
  for (const id of LANGUAGE_IDS) whole.study(id, FLUENT_EXPOSURE);
  for (const id of LANGUAGE_IDS) assert.equal(whole.level(id), MAX_PROFICIENCY, `${id} is fluent`);
  assert.equal(whole.view().fluent, LANGUAGE_IDS.length);
  assert.ok(world.total() >= RUNESCAPE_TABLE[98],
    `every tongue in Azhora is worth a 99: ${world.total()} of ${RUNESCAPE_TABLE[98]}`);

  // And once the skill is on the sheet, the traveler picks it up by himself.
  if (Object.hasOwn(SKILLS, LINGUIST_SKILL)) {
    const skills = createSkills(), real = createLinguist({ skills });
    real.hear({ id: 'a' }, 'A line.', { region: 'Drent' });
    assert.equal(skills.known(LINGUIST_SKILL), true, 'the first word he cannot follow makes him a linguist');
    assert.ok(skills.level(LINGUIST_SKILL) >= 1);
  }
});

test('a phrasebook is a lump of a tongue bought instead of overheard', () => {
  const linguist = createLinguist();
  const bought = linguist.study('koleth', PHRASEBOOK_EXPOSURE);
  assert.equal(bought.ok, true);
  assert.ok(linguist.level('koleth') > 0 && linguist.level('koleth') < 40, 'a book is a start and not a language');
  assert.equal(linguist.study('the old tongue of the moon').ok, false);
});

test('the toggle lasts the session and is not written into the save', () => {
  const linguist = createLinguist();
  assert.equal(linguist.showingFull, false);
  assert.equal(linguist.toggle(), true);
  assert.equal(linguist.render('The road is that way.', { language: 'drentish' }), linguist.render('The road is that way.', { language: 'drentish' }, { full: true }));
  assert.equal(linguist.toggle(false), false);
  assert.ok(!Object.hasOwn(linguist.snapshot(), 'showingFull'));
});

test('the save carries the tongues and refuses nonsense', () => {
  const linguist = createLinguist();
  linguist.hear({ id: 'nell' }, 'A line.', { region: 'Drent' });
  linguist.hear({ id: 'nell' }, 'Another.', { region: 'Drent' });
  linguist.study('koleth', 120);
  const saved = JSON.parse(JSON.stringify(linguist.snapshot()));
  assert.equal(validateLinguistSnapshot(saved), true);
  const back = createLinguist();
  assert.equal(back.restore(saved), true);
  assert.equal(back.level('drentish'), linguist.level('drentish'));
  assert.equal(back.level('koleth'), linguist.level('koleth'));
  assert.equal(back.heardFrom('nell'), 2);
  assert.equal(validateLinguistSnapshot(undefined), true, 'a save from before the skill existed is allowed');
  assert.equal(validateLinguistSnapshot(undefined, { allowMissing: false }), false);
  for (const rubbish of [null, 7, [], { version: 99, exposure: {}, heard: {} },
    { version: LINGUIST_VERSION, exposure: { klingon: 4 }, heard: {} },
    { version: LINGUIST_VERSION, exposure: { drentish: -1 }, heard: {} },
    { version: LINGUIST_VERSION, exposure: { drentish: Infinity }, heard: {} },
    { version: LINGUIST_VERSION, exposure: {}, heard: { nell: -2 } },
    { version: LINGUIST_VERSION, exposure: {}, heard: { nell: 1.5 } },
    { version: LINGUIST_VERSION, exposure: {} }]) {
    assert.equal(validateLinguistSnapshot(rubbish), false, JSON.stringify(rubbish));
  }
  const spoiled = createLinguist();
  spoiled.study('drentish', 500);
  assert.equal(spoiled.restore({ version: LINGUIST_VERSION, exposure: { klingon: 4 }, heard: {} }), false);
  assert.equal(spoiled.level('drentish'), 0, 'a refused save leaves the traveler knowing nothing, not knowing half');
});

test('the panel can say where every tongue stands', () => {
  const linguist = createLinguist();
  assert.equal(linguist.view().met, 0);
  assert.match(linguist.task().detail, /Chris Gotwood/);
  linguist.study('drentish', 300);
  const view = linguist.view();
  assert.equal(view.met, 1);
  assert.equal(view.tongues.length, LANGUAGE_IDS.length);
  assert.equal(view.tongues[0].id, 'drentish', 'the best-known tongue comes first');
  assert.equal(view.tongues[0].name, LANGUAGES.drentish.name);
  assert.ok(view.tongues[0].share > 0 && view.tongues[0].share <= 100);
  assert.match(linguist.task().title, /Drentish/);
});
