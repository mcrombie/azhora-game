import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand } from '../src/game-state.js';
import { BODY } from '../src/bodies.js';
import { TROY, TROY_LINES, TROY_OPENING, MURDERER, MURDERER_READING, TESTIMONY, WITNESS_IDS, CLUES, CLEARED,
  UNPROVEN, STAGES, REWARDS, PURSE, ACCUSE_REST, VICTIM, createMurderQuest, validateMurderQuestSnapshot,
  troyConversation, cobbleConversation } from '../src/murder-quest.js';
import { PEBLOS_NPCS, PEBLOS_NPC_IDS, PEBLOS_AMBIENT } from '../src/peblos-people.js';
import { SKILLS } from '../src/skills.js';
import { SPELLS } from '../src/sorcery.js';

/** Everything a scene needs to be opened and read back. */
function stage() {
  const opened = [];
  const context = {
    openDialogue: (npc, lines, event, action, options = {}) => opened.push({ npc, lines, action, options }),
    closeDialogue: () => {},
    act: (name, id) => context.acts.push([name, id]),
    acts: [],
    last: () => opened.at(-1),
    opened,
  };
  return context;
}
const pick = (scene, id) => scene.last().options.choices.find(choice => choice.id === id);

test('the case walks: three true things, a fourth name, and Troy will not act on a guess', () => {
  const said = [];
  const quest = createMurderQuest({ onEvent: event => said.push(event.type) });
  assert.equal(quest.state.stage, 'unmet');
  assert.equal(quest.hear('cobble-jessi'), null, 'nobody talks to you before Troy has asked them to');
  assert.equal(quest.begin(), true);
  assert.equal(quest.begin(), false, 'he sets it out once');

  // The right name, with nothing behind it, is a guess and he says so.
  const early = quest.accuse(MURDERER, 0);
  assert.equal(early.ok, false);
  assert.equal(early.why, 'unproven');
  assert.equal(quest.state.accused.includes(MURDERER), false, 'and it is not held against the man');

  // A name of nobody is not a name, and it costs nothing.
  assert.deepEqual(quest.accuse('a-man-who-is-not-here', 0), { ok: false, why: 'nobody', named: 'a-man-who-is-not-here' });
  assert.deepEqual(quest.snapshot().accused, [], 'and it is not written down');

  // The list cannot be walked: he will not hear another name for a while.
  assert.equal(quest.accuse('cobble-ari', 10).why, 'resting');
  assert.equal(Math.round(quest.rests(10)), ACCUSE_REST - 10);
  let now = ACCUSE_REST + 1;
  const wrong = quest.accuse('cobble-ari', now);
  assert.equal(wrong.why, 'wrong');
  assert.ok(CLEARED[wrong.named], 'and he says why it cannot be her');

  for (const id of WITNESS_IDS) assert.ok(quest.hear(id), `${id} says nothing`);
  assert.equal(quest.hear('cobble-jessi'), null, 'the same person twice tells you nothing new');
  assert.equal(quest.state.ready, true);
  now += ACCUSE_REST + 1;
  const named = quest.accuse(MURDERER, now);
  assert.equal(named.ok, true);
  assert.equal(quest.state.stage, 'solved');
  assert.deepEqual(said, ['murder-begun', 'murder-unproven', 'murder-wrong',
    ...WITNESS_IDS.map(() => 'murder-heard'), 'murder-solved']);
});

test('the fork is the ending: the purse or the reading, once, and never both', () => {
  for (const [id, stageName] of [['purse', 'paid'], ['lesson', 'taught']]) {
    const quest = createMurderQuest();
    quest.begin();
    for (const witness of WITNESS_IDS) quest.hear(witness);
    quest.accuse(MURDERER, 0);
    assert.deepEqual(quest.choices().map(choice => choice.id), ['purse', 'lesson']);
    assert.equal(quest.take(id).stage, stageName);
    assert.equal(quest.state.over, true);
    assert.equal(quest.take(id === 'purse' ? 'lesson' : 'purse'), null, 'he paid twice');
    assert.deepEqual(quest.choices(), []);
  }
  assert.equal(createMurderQuest().take('purse'), null, 'nobody is paid for a case nobody has closed');
  assert.equal(PURSE, 40, 'above Liz’s thirty and Ben’s thirty-five is the border battle, so this sits with them');
});

test('a save of it round-trips, and a state that cannot have happened is refused', () => {
  const quest = createMurderQuest();
  quest.begin();
  for (const witness of WITNESS_IDS) quest.hear(witness);
  quest.accuse(MURDERER, 120);
  quest.take('lesson');
  const saved = quest.snapshot();
  assert.equal(validateMurderQuestSnapshot(saved), true);
  const loaded = createMurderQuest();
  assert.equal(loaded.restore(saved), true);
  assert.deepEqual(loaded.snapshot(), saved);
  const before = loaded.snapshot();
  for (const bad of [null, {}, { ...before, version: 2 }, { ...before, stage: 'nowhere' },
    { ...before, heard: ['a-thing-nobody-said'] }, { ...before, heard: [...CLUES, ...CLUES] },
    { ...before, accused: ['somebody-who-is-not-here'] }, { ...before, restUntil: -1 },
    // Paid for a case that was never closed, and closed without the name ever being said.
    { ...before, accused: [] }, { ...before, stage: 'solved', accused: [] },
    { ...before, stage: 'asking', accused: [MURDERER] }]) {
    assert.equal(validateMurderQuestSnapshot(bad), false, JSON.stringify(bad));
    assert.equal(loaded.restore(bad), false);
    assert.deepEqual(loaded.snapshot(), before, 'a refused save changed the live one');
  }
  assert.deepEqual([...STAGES].sort(), ['asking', 'paid', 'solved', 'taught', 'unmet']);
  assert.deepEqual(Object.keys(REWARDS), ['purse', 'lesson']);
});

test('the three suspects are innocent, and the one who did it is not among them', () => {
  assert.equal(WITNESS_IDS.includes(MURDERER), false, 'the murderer is a suspect');
  assert.equal(WITNESS_IDS.length, 3);
  assert.deepEqual([...CLUES].sort(), WITNESS_IDS.map(id => TESTIMONY[id].gives).sort(),
    'every clue comes from somebody, and everybody has one');
  assert.equal(new Set(CLUES).size, CLUES.length, 'and no two of them are the same thing');
  for (const id of WITNESS_IDS) {
    assert.ok(CLEARED[id], `Troy has no answer to ${id}`);
    assert.ok(TESTIMONY[id].says.length > 40 && TESTIMONY[id].reading.length > 40, `${id} is thin`);
    assert.ok(PEBLOS_AMBIENT[id]?.length >= 2, `${id} has nothing to say when the case is not on`);
  }
  // Only the man at the beam is thinking about where the book went.
  assert.match(MURDERER_READING, /book/);
  assert.equal(Object.values(TESTIMONY).some(witness => /book went|put the book/.test(witness.reading)), false);
  assert.match(UNPROVEN, /three things/);
  assert.match(VICTIM.name, /Bregga Sell/);
  // And the four of them are people the world actually stands somewhere.
  for (const id of [...WITNESS_IDS, MURDERER, TROY.id]) assert.ok(PEBLOS_NPC_IDS.includes(id) || id === TROY.id, id);
  assert.equal(PEBLOS_NPCS.some(npc => npc.id === VICTIM.name), false, 'the dead woman is not standing on the quay');
});

test('Troy is the user’s man, half of him gone dirty blonde, and the only teacher of the reading', () => {
  assert.equal(TROY.name, 'Troy');
  assert.equal(TROY.id, 'bee-keeper', 'ids are sticky even when the man moves');
  assert.equal(TROY.modelRole, 'bee-keeper');
  assert.equal(Number.isInteger(TROY.look.hairSplit), true, 'half his hair is a second colour');
  assert.ok(TROY.look.hairSplit > 0x998855 && TROY.look.hairSplit < 0xd8c8a0, 'and that colour is dirty blonde');
  assert.match(TROY.role, /guild/);
  assert.ok(TROY_LINES.length >= 4 && TROY_OPENING.length >= 3);
  assert.match(SKILLS.mind.teacher, /Troy/);
  assert.equal(SPELLS.mindread.school, 'mind');
});

test('he takes the errand, takes names, and refuses the ones that are guesses', () => {
  const quest = createMurderQuest();
  const scene = stage();
  const context = { ...scene, murder: quest, act: (name, id) => scene.acts.push([name, id]) };
  assert.equal(troyConversation({ id: 'somebody-else' }, context), false);
  troyConversation(TROY, context);
  assert.ok(scene.last().lines.length >= 3);
  pick(scene, 'murder-take').action();
  assert.deepEqual(scene.acts.at(-1), ['murder-begin', undefined]);
  quest.begin();

  // With nothing in hand he is still willing to hear a name, and every name is on the list.
  troyConversation(TROY, { ...context, now: 0 });
  pick(scene, 'murder-name').action();
  const names = scene.last().options.choices.map(choice => choice.id);
  assert.deepEqual(names, [...WITNESS_IDS, MURDERER].map(id => `accuse-${id}`).concat('accuse-nobody'));
  scene.last().options.choices[0].action();
  assert.deepEqual(scene.acts.at(-1), ['murder-accuse', WITNESS_IDS[0]]);

  // While he is going back over it there is no name to say.
  quest.accuse(WITNESS_IDS[0], 0);
  troyConversation(TROY, { ...context, now: 1 });
  assert.equal(pick(scene, 'murder-name'), undefined, 'he heard a name inside the rest');
  troyConversation(TROY, { ...context, now: ACCUSE_REST + 2 });
  assert.ok(pick(scene, 'murder-name'), 'and hears one again afterwards');

  // Closed, he offers one of two things and nothing else.
  for (const witness of WITNESS_IDS) quest.hear(witness);
  quest.accuse(MURDERER, ACCUSE_REST * 3);
  troyConversation(TROY, context);
  assert.deepEqual(scene.last().options.choices.map(choice => choice.id), ['murder-purse', 'murder-lesson']);
  pick(scene, 'murder-lesson').action();
  assert.deepEqual(scene.acts.at(-1), ['murder-reward', 'lesson']);
});

test('Cobble says one more thing while the case is open, and one thing more again to a reader', () => {
  const quest = createMurderQuest();
  const scene = stage();
  const jessi = PEBLOS_NPCS.find(npc => npc.id === 'cobble-jessi');
  const context = { ...scene, murder: quest, ambient: PEBLOS_AMBIENT['cobble-jessi'],
    act: (name, id) => scene.acts.push([name, id]) };
  assert.equal(cobbleConversation(jessi, context), false, 'nobody is asked about it before Troy asks');
  quest.begin();
  assert.equal(cobbleConversation(jessi, context), true);
  assert.deepEqual(scene.last().lines, [...PEBLOS_AMBIENT['cobble-jessi']], 'her own lines are still hers');
  assert.equal(pick(scene, 'read-them'), undefined, 'and nobody is read who has not been taught it');
  pick(scene, 'ask-bregga').action();
  assert.deepEqual(scene.acts.at(-1), ['murder-hear', 'cobble-jessi']);
  assert.deepEqual(scene.last().lines, [TESTIMONY['cobble-jessi'].says]);

  // Taught the reading, every one of the four has something they decided not to say.
  for (const id of [...WITNESS_IDS, MURDERER]) {
    const npc = PEBLOS_NPCS.find(person => person.id === id);
    assert.equal(cobbleConversation(npc, { ...context, ambient: PEBLOS_AMBIENT[id], reads: true }), true);
    pick(scene, 'read-them').action();
    assert.deepEqual(scene.last().lines, [id === MURDERER ? MURDERER_READING : TESTIMONY[id].reading]);
  }
  // A soldier is not part of it, taught or not.
  assert.equal(cobbleConversation({ id: 'peblos-decurion' }, context), false);
  assert.equal(cobbleConversation({ id: 'peblos-decurion' }, { ...context, reads: true }), false);
  // And the reading outlives the case it was paid for: closed, they have nothing left to say,
  // but a traveler Troy taught can still hear what they are carrying.
  for (const witness of WITNESS_IDS) quest.hear(witness);
  quest.accuse(MURDERER, 0);
  quest.take('lesson');
  assert.equal(cobbleConversation(jessi, context), false, 'there is nothing left to ask her');
  assert.equal(cobbleConversation(jessi, { ...context, reads: true }), true);
  assert.equal(pick(scene, 'ask-bregga'), undefined, 'and no case to ask about');
  assert.ok(pick(scene, 'read-them'), 'but she is still a person with a thing she is not saying');
});

test('the four of them stand in Cobble, and Troy stands where he can be talked to', async () => {
  const { createWorld } = await sourceModule('../src/world.js');
  const world = createWorld(new THREE.Scene());
  const stands = [...WITNESS_IDS, MURDERER, TROY.id].map(id => [id, world.npcPositions[id]]);
  for (const [id, stand] of stands) {
    assert.ok(stand, `${id} is not placed`);
    assert.equal(world.regionAt(stand.x, stand.z)?.name, 'Peblos', `${id} is not in the islands`);
    assert.ok(canStand(stand.x, stand.z, world, BODY.person) || world.quayHeight?.(stand.x, stand.z) !== null,
      `${id} stands on nothing`);
  }
  // Troy is close enough to the village to be part of it, and everybody is within a walk of him.
  const troy = world.npcPositions[TROY.id];
  for (const [id, stand] of stands) {
    const gap = Math.hypot(stand.x - troy.x, stand.z - troy.z);
    assert.ok(gap < 70, `${id} is ${gap.toFixed(0)} m from Troy`);
  }
});

test('he is still red-bearded and grinning, and half of him is not red any more', async () => {
  const { createCharacter } = await sourceModule('../src/characters.js');
  const actor = createCharacter({ role: TROY.modelRole, tunic: TROY.color, skin: TROY.skin, look: TROY.look });
  for (const name of ['Troy’s spectacles', 'Troy’s bee smoker']) assert.ok(actor.group.getObjectByName(name), `he has no ${name}`);
  assert.equal(actor.group.getObjectByName('Troy’s bee hat'), undefined, 'and no hat');
  // The curls are two colours now: the red he came with, and the dirty blonde down one side.
  const head = actor.group.getObjectByName('Head');
  const red = new THREE.Color(0x87301a), blonde = new THREE.Color(TROY.look.hairSplit);
  const seen = { red: 0, blonde: 0 };
  head.traverse(object => {
    const colours = object.isMesh ? object.geometry.attributes.color : null;
    if (!colours) return;
    for (let i = 0; i < colours.count; i++) {
      const near = want => Math.abs(colours.getX(i) - want.r) < .03 && Math.abs(colours.getY(i) - want.g) < .03
        && Math.abs(colours.getZ(i) - want.b) < .03;
      if (near(red)) seen.red++;
      if (near(blonde)) seen.blonde++;
    }
  });
  assert.ok(seen.red > 0, 'his hair and beard are red');
  assert.ok(seen.blonde > 0, 'and half his curls are not');
  for (let t = 0; t < 3; t += 1 / 30) actor.animate(t, 0, true, {});
});
