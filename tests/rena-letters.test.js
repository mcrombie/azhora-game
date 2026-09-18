import test from 'node:test';
import assert from 'node:assert/strict';
import { createInventoryState, INVENTORY_ITEMS } from '../src/inventory.js';
import { createWeapons } from '../src/weapons.js';
import { createJourney } from '../src/journey.js';
import { METRES_PER_HEX } from '../src/world-scale.js';
import { createRoadCheckpoint } from '../src/road-checkpoint.js';
import {
  createRenaLetters, validateRenaLettersSnapshot, LETTERS, LETTER_COUNT, EXCHANGES,
  LETTER_ITEM, LORN_ID, HESTA_ID, ARDRY_IDS, ARDRY_NAMES, letterById, REWARD_HOOK,
} from '../src/rena-letters.js';
import { RENA_NPCS, RENA_AMBIENT, renaConversation, ardryConversation, renaLines } from '../src/rena-people.js';

const satchel = () => createInventoryState();

/** Walks the whole errand, returning what happened at each leg. */
function carryEverything(letters, inventory) {
  const log = [];
  for (let i = 0; i < LETTER_COUNT; i++) {
    const next = letters.pending();
    const taken = letters.take(next.from, inventory);
    log.push({ stage: 'take', ok: taken.ok, id: taken.letter?.id, held: inventory.has(LETTER_ITEM) });
    const given = letters.deliver(next.to, inventory);
    log.push({ stage: 'give', ok: given.ok, id: given.letter?.id, held: inventory.has(LETTER_ITEM), complete: given.complete });
  }
  return log;
}

test('three exchanges, six letters, and each one is a real letter worth reading', () => {
  assert.equal(EXCHANGES, 3);
  assert.equal(LETTER_COUNT, 6);
  const ids = LETTERS.map(entry => entry.id);
  assert.equal(new Set(ids).size, ids.length, 'letter ids are unique');
  // They alternate, starting with the old man in Tidehaven.
  assert.deepEqual(LETTERS.map(entry => entry.from), [LORN_ID, HESTA_ID, LORN_ID, HESTA_ID, LORN_ID, HESTA_ID]);
  for (const entry of LETTERS) {
    assert.equal(entry.to, entry.from === LORN_ID ? HESTA_ID : LORN_ID, `${entry.id} is addressed to the other one`);
    assert.ok(entry.subject.length > 5 && entry.hand.length > 40, `${entry.id} says what the sheet looks like`);
    assert.ok(entry.text.length >= 4, `${entry.id} is longer than a note`);
    assert.ok(entry.text.join(' ').length > 400, `${entry.id} is worth reading`);
    assert.ok(entry.handed.length >= 2, `${entry.id} is reacted to when it is handed over`);
    assert.equal(letterById(entry.id), entry);
  }
  // The three beats the errand was written for: memory, disagreement, and the thing never said.
  assert.match(LETTERS[0].text.join(' '), /roof/);
  assert.match(LETTERS[1].text.join(' '), /I do not remember the roof/);
  assert.match(LETTERS[2].text.join(' '), /horses/);
  assert.match(LETTERS[3].text.join(' '), /ledger|tallyman/);
  assert.match(LETTERS[4].text.join(' '), /never said that to anybody/);
  assert.match(LETTERS[5].text.join(' '), /I saw you do it/);
  assert.equal(letterById('nothing'), null);
});

test('every exchange is carried in turn, and the sheet is in the satchel while it travels', () => {
  const events = [], letters = createRenaLetters({ onEvent: event => events.push(event) });
  const inventory = satchel();
  assert.equal(letters.complete, false);
  assert.equal(letters.carried(), null);
  assert.equal(letters.pending().id, LETTERS[0].id);
  // Nobody can be given a letter before one is written, and the sister does not write first.
  assert.equal(letters.deliver(HESTA_ID, inventory).ok, false);
  assert.equal(letters.take(HESTA_ID, inventory).ok, false, 'it is the old man’s turn to write');

  const log = carryEverything(letters, inventory);
  assert.ok(log.every(step => step.ok), 'every leg of the errand is walked');
  assert.deepEqual(log.filter(step => step.stage === 'take').map(step => step.id), LETTERS.map(entry => entry.id));
  assert.ok(log.filter(step => step.stage === 'take').every(step => step.held), 'a carried letter is in the satchel');
  assert.ok(log.filter(step => step.stage === 'give').every(step => !step.held), 'and leaves it on delivery');
  assert.equal(log.at(-1).complete, true);
  assert.equal(letters.complete, true);
  assert.equal(letters.carried(), null);
  assert.equal(letters.take(LORN_ID, inventory).ok, false, 'they have nothing left to say');
  assert.equal(events.filter(event => event.type === 'letter-delivered').length, LETTER_COUNT);
  assert.equal(events.filter(event => event.type === 'ardrys-caught-up').length, 1);
  assert.equal(letters.read().length, LETTER_COUNT, 'every letter is readable afterwards');
});

test('a letter cannot be given to the wrong person, taken twice, or delivered without a satchel to leave', () => {
  const letters = createRenaLetters(), inventory = satchel();
  assert.equal(letters.take(LORN_ID, inventory).ok, true);
  assert.equal(letters.take(LORN_ID, inventory).ok, false, 'one letter at a time');
  const wrong = letters.deliver(LORN_ID, inventory);
  assert.equal(wrong.ok, false);
  assert.match(wrong.reason, /Hesta/);
  assert.equal(inventory.has(LETTER_ITEM), true, 'a refused delivery leaves the letter in hand');
  assert.equal(letters.deliver('nobody', inventory).ok, false);
  assert.equal(letters.deliver(HESTA_ID, inventory).ok, true);
  assert.equal(inventory.has(LETTER_ITEM), false);
  assert.ok(INVENTORY_ITEMS[LETTER_ITEM], 'the sheet is a satchel item');
  assert.equal(INVENTORY_ITEMS[LETTER_ITEM].type, 'Quest item');
  // The errand also works without a satchel at all, for callers that do not carry one.
  const bare = createRenaLetters();
  assert.equal(bare.take(LORN_ID, null).ok, true);
  assert.equal(bare.deliver(HESTA_ID, null).ok, true);
});

test('both of them end fond of you, and nothing else is paid', () => {
  const letters = createRenaLetters(), inventory = satchel();
  for (const id of ARDRY_IDS) assert.equal(letters.friendship(id), 'unfamiliar');
  letters.meet(LORN_ID);
  assert.equal(letters.friendship(LORN_ID), 'acquainted');
  assert.equal(letters.friendship(HESTA_ID), 'unfamiliar');
  carryEverything(letters, inventory);
  for (const id of ARDRY_IDS) {
    assert.equal(letters.friendship(id), 'fond', `${ARDRY_NAMES[id]} is fond of you`);
    assert.equal(letters.friendshipLabel(id), 'Fond of you');
  }
  assert.equal(letters.friendship('somebody-else'), 'unfamiliar');
  // The whole reward: no coin and no item beyond the sheet itself, which is gone.
  assert.deepEqual(inventory.items().filter(id => id === LETTER_ITEM), []);
  assert.equal(REWARD_HOOK.granted, false, 'the reward hook is still open for the user to fill');
});

test('the errand names where to go next, and stops naming it when it is done', () => {
  const letters = createRenaLetters(), inventory = satchel();
  assert.equal(letters.task(), null, 'nothing is asked of a traveler who has not met them');
  letters.meet(LORN_ID);
  assert.equal(letters.task(), null, 'and nothing after meeting him: he has not asked yet');
  assert.match(letters.view().detail, /has been meaning to/);
  letters.take(LORN_ID, inventory);
  assert.equal(letters.task().stage, 'carrying');
  assert.equal(letters.task().target, HESTA_ID);
  assert.match(letters.task().detail, /Applegarth/);
  letters.deliver(HESTA_ID, inventory);
  assert.equal(letters.task().target, HESTA_ID, 'the answer is written at the other end');
  while (!letters.complete) { const next = letters.pending(); letters.take(next.from, inventory); letters.deliver(next.to, inventory); }
  assert.equal(letters.task(), null);
});

test('the journal shows the standing and every letter that has been read, and no more', () => {
  const letters = createRenaLetters(), inventory = satchel();
  assert.equal(letters.view().started, false);
  assert.deepEqual(letters.view().pages, []);
  letters.meet(LORN_ID);
  assert.equal(letters.view().started, true);
  letters.take(LORN_ID, inventory);
  const carrying = letters.view();
  assert.equal(carrying.pages.length, 1, 'the letter in hand can be read on the road');
  assert.deepEqual(carrying.pages[0].lines, [...LETTERS[0].text]);
  assert.match(carrying.pages[0].heading, /Lorn to Hesta/);
  assert.match(carrying.standing, /Lorn: .+ · Hesta: /);
  letters.deliver(HESTA_ID, inventory);
  assert.equal(letters.view().pages.length, 1, 'a delivered letter stays readable');
  letters.take(HESTA_ID, inventory);
  assert.equal(letters.view().pages.length, 2);
  while (!letters.complete) { const next = letters.pending(); letters.take(next.from, inventory); letters.deliver(next.to, inventory); }
  const done = letters.view();
  assert.equal(done.pages.length, LETTER_COUNT);
  assert.equal(done.complete, true);
  assert.match(done.detail, /caught up/);
  assert.match(done.standing, /Fond of you/);
});

test('the errand survives a save, and a checkpoint refuses nonsense in it', () => {
  const letters = createRenaLetters(), inventory = satchel();
  letters.take(LORN_ID, inventory);
  letters.deliver(HESTA_ID, inventory);
  letters.take(HESTA_ID, inventory);
  const copy = createRenaLetters();
  assert.equal(copy.restore(letters.snapshot()), true);
  assert.deepEqual(copy.snapshot(), letters.snapshot());
  assert.equal(copy.carried().id, LETTERS[1].id);
  assert.deepEqual(copy.met.sort(), [...ARDRY_IDS].sort());

  assert.equal(validateRenaLettersSnapshot(undefined), true, 'older saves carry no letters');
  for (const bad of [null, 'letters', { version: 2, leg: 0, carrying: false, met: [] },
    { version: 1, leg: -1, carrying: false, met: [] },
    { version: 1, leg: LETTER_COUNT + 1, carrying: false, met: [] },
    { version: 1, leg: LETTER_COUNT, carrying: true, met: ARDRY_IDS },
    { version: 1, leg: 0, carrying: 'yes', met: [] },
    { version: 1, leg: 0, carrying: false, met: ['somebody'] },
    { version: 1, leg: 0, carrying: false, met: [LORN_ID, LORN_ID] },
    { version: 1, leg: 2, carrying: false, met: [HESTA_ID] }])
    assert.equal(validateRenaLettersSnapshot(bad), false, JSON.stringify(bad));
  const fresh = createRenaLetters();
  assert.equal(fresh.restore({ version: 1, leg: 3, carrying: false, met: ['nobody'] }), false);
  assert.equal(fresh.leg, 0, 'a refused restore leaves the errand where it started');
});

test('the road checkpoint keeps the letters, and rejects a save whose letters are impossible', () => {
  const store = new Map();
  const checkpoint = createRoadCheckpoint({ storage: { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, value), removeItem: key => store.delete(key) } });
  const letters = createRenaLetters(), inventory = createInventoryState();
  for (const id of ['simple-sword', 'harbor-letter', 'road-token']) inventory.grant(id);
  const weapons = createWeapons({ inventory });
  const journey = createJourney({ inventory, weapons });
  journey.start();
  letters.take(LORN_ID, inventory);
  letters.deliver(HESTA_ID, inventory);
  const save = {
    version: 1, worldScale: METRES_PER_HEX, questStage: 10, journey: journey.snapshot(),
    inventory: inventory.items().map(id => ({ id, quantity: inventory.count(id) })),
    weapons: weapons.snapshot(),
    journeyGathered: [], meadowCleared: false, heardDoom: false, position: { x: -395, z: -70 },
    renaLetters: letters.snapshot(),
  };
  const written = checkpoint.save(save);
  assert.ok(written.ok, written.reason);
  assert.deepEqual(written.data.renaLetters, letters.snapshot());
  assert.deepEqual(checkpoint.read().data.renaLetters, letters.snapshot());
  const broken = checkpoint.save({ ...save, renaLetters: { version: 1, leg: 99, carrying: false, met: [] } });
  assert.equal(broken.ok, false);
  assert.match(broken.reason, /letters between the Ardrys/);
  // A save from before this pass still loads, with the errand untouched.
  const older = { ...save };
  delete older.renaLetters;
  assert.ok(checkpoint.save(older).ok);
  assert.equal(Object.hasOwn(checkpoint.read().data, 'renaLetters'), false);
});

test('the two who remember offer the errand in conversation, and everyone else has a line', () => {
  const letters = createRenaLetters(), inventory = satchel();
  const opened = [];
  const context = {
    letters, inventory,
    openDialogue: (npc, lines, _a, _b, extra = {}) => opened.push({ npc, lines, choices: extra.choices ?? [], onComplete: extra.onComplete }),
    closeDialogue: () => {},
    act: (action, id) => (action === 'meet-ardry' ? letters.meet(id)
      : action === 'take-ardry-letter' ? letters.take(id, inventory)
      : action === 'give-ardry-letter' ? letters.deliver(id, inventory) : { ok: false }),
  };
  const lorn = RENA_NPCS.find(npc => npc.id === LORN_ID), hesta = RENA_NPCS.find(npc => npc.id === HESTA_ID);

  // First meeting: he says who he is, and the topics explain Rena, the razing and the old names.
  assert.equal(ardryConversation(lorn, context), true);
  const first = opened.at(-1);
  assert.match(first.lines.join(' '), /Lorn Ardry/);
  assert.match(first.lines.join(' '), /eighty-seven|Eighty-seven/);
  const topicIds = first.choices.map(choice => choice.id);
  for (const id of ['ask-rena', 'ask-razing', 'ask-names', 'ask-other']) assert.ok(topicIds.includes(id), id);
  // The meeting is recorded by opening the conversation, not by finishing it: a
  // dialogue that offers choices never completes, so an onComplete would be lost.
  assert.equal(letters.hasMet(LORN_ID), true);
  assert.equal(first.onComplete, undefined, 'the first meeting does not hang anything on completion');
  assert.equal(first.choices.some(choice => choice.id === 'take-ardry-letter'), false, 'no letter until he has said there is a sister');

  // Meeting done: he offers the first letter, and the choice takes it.
  assert.equal(ardryConversation(lorn, context), true);
  const offer = opened.at(-1).choices.find(choice => choice.id === 'take-ardry-letter');
  assert.ok(offer, 'he asks the traveler to carry one');
  offer.action();
  assert.equal(letters.carried().id, LETTERS[0].id);
  // He will not take it back, and she is the one who can be given it.
  assert.equal(ardryConversation(lorn, context), true);
  assert.equal(opened.at(-1).choices.some(choice => choice.id === 'give-ardry-letter'), false);
  ardryConversation(hesta, context);
  assert.equal(letters.hasMet(HESTA_ID), true, 'walking up to her counts as meeting her');
  ardryConversation(hesta, context);
  const hand = opened.at(-1).choices.find(choice => choice.id === 'give-ardry-letter');
  assert.ok(hand, 'she can be given it');
  hand.action();
  assert.equal(letters.leg, 1);
  assert.equal(letters.carrying, false);

  // The old names are used in ordinary speech, and only ever as names.
  const names = [...Object.values(RENA_AMBIENT).flat(), ...renaLines(LORN_ID), ...renaLines(HESTA_ID)].join(' ');
  assert.match(names, /Eastreena/);
  assert.match(names, /Westerina/);
  for (const npc of RENA_NPCS) {
    assert.ok(npc.name && npc.role && npc.modelRole, npc.id);
    if (ARDRY_IDS.includes(npc.id)) continue;
    const lines = RENA_AMBIENT[npc.id];
    assert.ok(lines && lines.length >= 2, `${npc.id} has two lines`);
    for (const line of lines) {
      assert.ok(line.length > 12 && line.length < 320, `${npc.id} speaks in lines, not speeches`);
      assert.doesNotMatch(line, /goblin|South Pyros/i, `${npc.id}: ${line}`);
    }
    // Everybody else gets a plain conversation, and nobody unknown gets one at all.
    opened.length = 0;
    assert.equal(renaConversation(npc, context), true);
    assert.deepEqual(opened.at(-1).lines, [...lines]);
  }
  assert.equal(renaConversation({ id: 'harbormaster' }, context), false);
  assert.deepEqual(renaLines('nobody'), []);
});

test('who pulled Rena down is told the same way by both of them, and it is why Drent is quiet', () => {
  const letters = createRenaLetters();
  const opened = [];
  const context = { letters, inventory: satchel(), openDialogue: (npc, lines, _a, _b, extra = {}) => opened.push({ lines, extra }), closeDialogue: () => {}, act: () => ({ ok: true }) };
  const lorn = RENA_NPCS.find(npc => npc.id === LORN_ID);
  ardryConversation(lorn, context);
  opened.at(-1).extra.choices.find(choice => choice.id === 'ask-razing').action();
  const told = opened.at(-1).lines.join(' ');
  assert.match(told, /congress/);
  assert.match(told, /Lord Protector|Protector/);
  assert.match(told, /Torn/);
  assert.match(told, /quiet/);
  assert.doesNotMatch(told, /goblin/i);
});
