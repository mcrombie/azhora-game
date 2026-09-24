import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand } from '../src/game-state.js';
import { BODY } from '../src/bodies.js';
import { LIZ, LIZ_STAND, LIZ_LINES, LIZ_ASKING, CAT, MOP, PURSE, STAGES, REWARDS,
  createCatQuest, createMopWalk, lizConversation, validateCatQuestSnapshot } from '../src/cat-quest.js';
import { LIZ_CLEARING, PUETH_NPC_POSITIONS, PUETH_CLEARINGS } from '../src/pueth-world.js';
import { FOREST_HIDEOUT_QUEST } from '../src/forest-hideout.js';
import { BEE_LINES, HONEYCOMB } from '../src/beekeeper.js';
import { SKILLS } from '../src/skills.js';
import { SPELLS } from '../src/sorcery.js';

function stage() {
  const opened = [];
  const context = {
    openDialogue: (npc, lines, event, action, options = {}) => opened.push({ npc, lines, action, options }),
    closeDialogue: () => {},
    acts: [],
    last: () => opened.at(-1),
  };
  context.act = (name, id) => context.acts.push([name, id]);
  return context;
}
const pick = (scene, id) => scene.last().options?.choices?.find(choice => choice.id === id);

test('the errand walks: he decides about you, he bolts, and he gets home alive', () => {
  const said = [];
  const quest = createCatQuest({ onEvent: event => said.push(event.type) });
  assert.equal(quest.state.stage, 'unmet');
  assert.equal(quest.found(), false, 'nobody finds a cat they were never asked to look for');
  assert.equal(quest.ask(), true);
  assert.equal(quest.ask(), false, 'she asks once');
  assert.equal(quest.accept(), true);
  assert.equal(quest.found(), true);
  assert.equal(quest.state.walking, true);
  assert.equal(quest.home(), true);
  assert.deepEqual(quest.choices().map(choice => choice.id), ['purse', 'lesson']);
  assert.deepEqual(said, ['cat-sought', 'cat-found', 'cat-home']);

  // A fight puts him under the nearest thing, and he has to be walked back to.
  const again = createCatQuest();
  again.ask(); again.accept(); again.found();
  assert.equal(again.bolts(), true);
  assert.equal(again.state.stage, 'looking');
  assert.equal(again.state.bolted, 1);
  assert.equal(again.home(), false, 'a cat under a hut is not a cat at home');
  assert.equal(again.found(), true, 'and he is found again where he went');
});

test('the one outcome she cannot be paid for', () => {
  const quest = createCatQuest();
  quest.ask(); quest.accept();
  assert.equal(quest.died(), false, 'a cat nobody has seen cannot be killed');
  quest.found();
  assert.equal(quest.died(), true);
  assert.equal(quest.state.stage, 'lost');
  assert.equal(quest.state.over, true);
  assert.deepEqual(quest.choices(), [], 'and there is nothing to be paid');
  assert.equal(quest.home(), false);
});

test('Liz pays once and still offers the earned bees lesson after taking coin', () => {
  for (const [id, stageName] of [['purse', 'paid'], ['lesson', 'taught']]) {
    const quest = createCatQuest();
    quest.ask(); quest.accept(); quest.found(); quest.home();
    assert.equal(quest.take(id).stage, stageName);
    assert.equal(quest.state.over, true);
    if(id==='purse'){
      assert.deepEqual(quest.choices().map(one=>one.id),['lesson']);
      assert.equal(quest.take('lesson').stage,'taught');
    }
    assert.equal(quest.take('purse'),null,'she paid twice');
    assert.equal(quest.take('lesson'),null,'she taught twice');
    assert.deepEqual(quest.choices(), []);
  }
  assert.equal(createCatQuest().take('purse'), null, 'nobody is paid for a cat that is still out');
  assert.equal(PURSE, 30);
  assert.deepEqual(Object.keys(REWARDS), ['purse', 'lesson']);
});

test('a save of it round-trips, and a state that cannot have happened is refused', () => {
  const quest = createCatQuest();
  quest.ask(); quest.accept(); quest.found(); quest.bolts(); quest.found(); quest.home(); quest.take('lesson');
  const saved = quest.snapshot();
  assert.equal(validateCatQuestSnapshot(saved), true);
  const loaded = createCatQuest();
  assert.equal(loaded.restore(saved), true);
  assert.deepEqual(loaded.snapshot(), saved);
  const before = loaded.snapshot();
  for (const bad of [null, {}, { ...before, version: 2 }, { ...before, stage: 'nowhere' },
    { ...before, found: 'yes' }, { ...before, bolted: -1 }, { ...before, bolted: 1.5 },
    // Home, or paid for, without ever having been found.
    { ...before, found: false }, { ...before, stage: 'following', found: false }]) {
    assert.equal(validateCatQuestSnapshot(bad), false, JSON.stringify(bad));
    assert.equal(loaded.restore(bad), false);
    assert.deepEqual(loaded.snapshot(), before, 'a refused save changed the live one');
  }
  assert.deepEqual([...STAGES].sort(), ['asked', 'following', 'home', 'looking', 'lost', 'paid', 'taught', 'unmet']);
});

test('the cat will not be carried and will not be led: it decides, it trails, it bolts', () => {
  const walk = createMopWalk({ random: () => .5 });
  let cat = { x: CAT.at.x, z: CAT.at.z };
  const step = (player, speed, extra = {}) => {
    walk.place(cat.x, cat.z);
    const want = walk.update(.1, { player, speed, ...extra });
    cat = { x: want.x, z: want.z };
    return want;
  };
  // Walked at, it stays where it is and goes on eating.
  let want = step({ x: CAT.at.x + 2, z: CAT.at.z }, 3);
  assert.equal(want.following, false, 'it went with somebody who ran at it');
  assert.equal(want.posture, 'eat');
  // Stood beside quietly, it decides about you.
  for (let i = 0; i < 20; i++) want = step({ x: CAT.at.x + 2, z: CAT.at.z }, 0);
  assert.equal(want.following, true);

  // Walk, and it comes: at its own distance, and never right up against you.
  const player = { x: CAT.at.x + 2, z: CAT.at.z };
  for (let i = 0; i < 300; i++) { player.x -= .25; want = step(player, 2.5); }
  const gap = Math.hypot(cat.x - player.x, cat.z - player.z);
  assert.ok(gap > MOP.follow - 1 && gap < MOP.follow + 4, `it is trailing ${gap.toFixed(1)} m behind`);
  assert.ok(Math.hypot(cat.x - CAT.at.x, cat.z - CAT.at.z) > 60, 'and it has actually come with you');
  // Stand still and it sits down too.
  for (let i = 0; i < 60; i++) want = step(player, 0);
  assert.equal(want.posture, 'sit');

  // A fight, and it is gone - and gone is not lost.
  want = step(player, 0, { fight: true, threat: player });
  assert.equal(want.bolted, true);
  assert.equal(want.mode, 'bolting');
  for (let i = 0; i < 400; i++) want = step(player, 0);
  assert.equal(want.mode, 'hiding');
  assert.equal(want.posture, 'crouch');
  assert.ok(Math.hypot(cat.x - player.x, cat.z - player.z) > 8, 'it went somewhere');
  assert.equal(want.following, false, 'and it does not simply fall back in behind you');
  // It comes out for somebody who walks over and waits.
  for (let i = 0; i < 40; i++) want = step({ x: cat.x + 1.5, z: cat.z }, 0);
  assert.equal(want.following, true);
  // Home is Liz's clearing, and only a cat that is following can arrive.
  assert.equal(step({ x: LIZ_STAND.x, z: LIZ_STAND.z }, 0, { home: LIZ_STAND }).home, false,
    'the cat is not at her feet, the traveler is');
});

test('Liz is who the user said, and the bees and the comb are hers now', () => {
  assert.equal(LIZ.name, 'Liz');
  assert.equal(LIZ.id, 'liz-beekeeper');
  assert.equal(LIZ.look.hairStyle, 'long', 'straight, long, and black');
  assert.ok(LIZ.look.hair < 0x2a2a2a, 'black hair');
  assert.ok(LIZ.skin > 0xa87840 && LIZ.skin < 0xd8b088, 'tan skin');
  assert.equal(LIZ.modelRole, 'skep-keeper', 'she has a build of her own: Troy’s trade, and none of his head');
  assert.notEqual(LIZ.modelRole, 'bee-keeper', 'which is a red beard and a grin');
  assert.match(SKILLS.beast.teacher, /Liz/);
  assert.equal(SPELLS['summon-bees'].school, 'beast');
  assert.ok(BEE_LINES.length >= 4 && LIZ_LINES.length >= 4 && LIZ_ASKING.length >= 3);
  assert.equal(HONEYCOMB, 'honeycomb', 'and the one source of comb in the game is still one source');
});

test('she asks for help with the cat, and pays one of the two ways once he is in', () => {
  const quest = createCatQuest();
  const comb = { price: () => 0 };
  const scene = stage();
  const context = { ...scene, cat: quest, comb, coppers: 0 };
  assert.equal(lizConversation({ id: 'somebody-else' }, context), false);
  assert.equal(lizConversation(LIZ, context), true);
  assert.equal(quest.state.stage, 'asked', 'the asking is the asking');
  assert.ok(pick(scene, 'cat-yes') && pick(scene, 'take-honeycomb'), 'the errand and the comb are both hers');
  pick(scene, 'cat-yes').action();
  assert.deepEqual(scene.acts.at(-1), ['cat-accept', undefined]);
  quest.accept();

  // Out looking, she has nothing to offer but directions and comb.
  lizConversation(LIZ, context);
  assert.equal(pick(scene, 'cat-yes'), undefined);
  quest.found(); quest.home();
  lizConversation(LIZ, context);
  assert.deepEqual(scene.last().options.choices.map(choice => choice.id), ['cat-purse', 'cat-lesson']);
  pick(scene, 'cat-purse').action();
  assert.deepEqual(scene.acts.at(-1), ['cat-reward', 'purse']);

  // A comb costs coppers after the first, and she does not offer what cannot be bought.
  const broke = { ...stage(), cat: createCatQuest(), comb: { price: () => 2 }, coppers: 0 };
  lizConversation(LIZ, broke);
  assert.equal(broke.last().options.choices.some(choice => choice.id === 'take-honeycomb'), false);
});

test('her clearing is a walk from the camp, and the cat is on the edge of it', async () => {
  const { createWorld } = await sourceModule('../src/world.js');
  const world = createWorld(new THREE.Scene());
  const stand = world.npcPositions[LIZ.id];
  assert.ok(stand, 'Liz is not placed anywhere');
  assert.deepEqual({ x: stand.x, z: stand.z }, { x: LIZ_STAND.x, z: LIZ_STAND.z },
    'the world and the quest disagree about where she is');
  assert.deepEqual({ x: LIZ_CLEARING.x, z: LIZ_CLEARING.z }, { x: LIZ_STAND.x, z: LIZ_STAND.z });
  assert.equal(PUETH_NPC_POSITIONS[LIZ.id] !== undefined, true);
  assert.ok(PUETH_CLEARINGS.some(clearing => clearing.x === LIZ_CLEARING.x && clearing.z === LIZ_CLEARING.z),
    'the scatter will grow birch through her skeps');
  assert.equal(world.regionAt(stand.x, stand.z)?.name, 'Pueth');

  // Level ground, with somewhere to stand beside her: talk range is a 3-D distance.
  const here = world.heightAt(stand.x, stand.z);
  for (let turn = 0; turn < 12; turn++) {
    const angle = turn / 12 * Math.PI * 2, x = stand.x + Math.cos(angle) * 1.9, z = stand.z + Math.sin(angle) * 1.9;
    assert.ok(canStand(x, z, world, BODY.person), `nowhere to stand beside her at ${(angle * 180 / Math.PI).toFixed(0)}°`);
    assert.ok(Math.hypot(1.9, world.heightAt(x, z) - here) < 3.3, 'a traveler beside her is out of talk range');
  }
  // Nobody else is in her woods.
  for (const [id, other] of Object.entries(world.npcPositions)) {
    if (id === LIZ.id || id === CAT.id) continue;
    assert.ok(Math.hypot(other.x - stand.x, other.z - stand.z) > 50, `${id} stands in her clearing`);
  }

  // The cat is on the camp's outskirts: close enough to be the camp's business, not in the middle.
  const camp = FOREST_HIDEOUT_QUEST.encounter;
  const out = Math.hypot(CAT.at.x - camp.center.x, CAT.at.z - camp.center.z);
  assert.ok(out > 15 && out < 30, `the cat is ${out.toFixed(0)} m from the middle of the camp`);
  assert.ok(canStand(CAT.at.x, CAT.at.z, world, BODY.cat), 'the midden is not standable');
  const nearest = Math.min(...camp.enemies.map(enemy => Math.hypot(enemy.x - CAT.at.x, enemy.z - CAT.at.z)));
  assert.ok(nearest > 12 && nearest < 25, `the nearest goblin is ${nearest.toFixed(0)} m off`);
  const walk = Math.hypot(CAT.at.x - stand.x, CAT.at.z - stand.z);
  assert.ok(walk > 60 && walk < 140, `it is ${walk.toFixed(0)} m from her clearing to the midden`);
});

test('she wears the trade and none of the man: a smock, a smoker, and her own head', async () => {
  const { createCharacter } = await sourceModule('../src/characters.js');
  const actor = createCharacter({ role: LIZ.modelRole, tunic: LIZ.color, skin: LIZ.skin, look: LIZ.look });
  assert.ok(actor.group.getObjectByName('Liz’s bee smoker'), 'she works without a smoker');
  assert.equal(actor.group.getObjectByName('Troy’s spectacles'), undefined, 'she is wearing his glasses');
  assert.ok(actor.group.getObjectByName('mercenary-hair-long'), 'her hair is not long');
  // None of Troy's ginger anywhere on her head.
  const head = actor.group.getObjectByName('Head'), ginger = new THREE.Color(0x87301a);
  let red = 0;
  head.traverse(object => {
    const colours = object.isMesh ? object.geometry.attributes.color : null;
    if (!colours) return;
    for (let i = 0; i < colours.count; i++)
      if (Math.abs(colours.getX(i) - ginger.r) < .03 && Math.abs(colours.getY(i) - ginger.g) < .03
        && Math.abs(colours.getZ(i) - ginger.b) < .03) red++;
  });
  assert.equal(red, 0, 'she has his beard');
  for (let t = 0; t < 3; t += 1 / 30) actor.animate(t, 0, true, {});
});
