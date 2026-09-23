import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand } from '../src/game-state.js';
import { BODY } from '../src/bodies.js';
import { SPIDER_QUEST, BEN, SPIDER, STAGES, REWARDS, createSpiderQuest,
  validateSpiderQuestSnapshot } from '../src/spider-quest.js';
import { SORCERY, SPELLS, SCHOOL_IDS, castWith, castsWith, focusAt, spellXp, schoolLevel } from '../src/sorcery.js';
import { SKILLS, SKILL_IDS } from '../src/skills.js';
import { ENEMY_KINDS } from '../src/combat.js';

test('the whole of it, the way it goes if you help him', () => {
  const said = [];
  const quest = createSpiderQuest({ onEvent: event => said.push(event.type) });
  assert.equal(quest.state.stage, 'unmet');
  assert.equal(quest.ask(), true);
  assert.equal(quest.ask(), false, 'he asks once');
  assert.deepEqual(quest.choices(), [], 'and there is nothing to choose until the thing is dead');
  assert.equal(quest.accept(), true);
  assert.equal(quest.state.walking, true, 'from here he is taking you there');
  assert.equal(quest.begin(), true);
  assert.equal(quest.settle({ spiderDead: true, benAlive: true }), true);
  assert.equal(quest.state.stage, 'killed');
  assert.deepEqual(quest.choices().map(one => one.id), ['bounty', 'lesson']);
  assert.deepEqual(said, ['spider-accepted', 'spider-roused', 'spider-killed']);
});

test('the fork is the ending: one of them, once, and never both', () => {
  for (const [id, stage] of [['bounty', 'paid'], ['lesson', 'taught']]) {
    const quest = createSpiderQuest();
    quest.ask(); quest.accept(); quest.begin(); quest.settle({ spiderDead: true });
    assert.equal(quest.take(id).stage, stage);
    assert.equal(quest.state.stage, stage);
    assert.equal(quest.state.over, true);
    // The other one is gone, and so is this one.
    assert.equal(quest.take(id === 'bounty' ? 'lesson' : 'bounty'), null, 'he paid twice');
    assert.equal(quest.take(id), null);
    assert.deepEqual(quest.choices(), []);
  }
  assert.equal(createSpiderQuest().take('bounty'), null, 'nobody is paid for a spider that is alive');
});

test('stand back and the spider kills him, which is a real ending and not a failure state', () => {
  const said = [];
  const quest = createSpiderQuest({ onEvent: event => said.push(event.type) });
  quest.ask(); quest.accept(); quest.begin();
  assert.equal(quest.settle({ spiderDead: false, benAlive: false }), true);
  assert.equal(quest.state.stage, 'abandoned');
  assert.equal(quest.state.benDown, true);
  assert.equal(quest.state.over, true);
  assert.deepEqual(quest.choices(), [], 'there is nobody left to pay you');
  assert.equal(said.at(-1), 'spider-took-ben');
  // And the same if it happens while the traveler is somewhere else entirely.
  const away = createSpiderQuest();
  away.ask(); away.accept();
  assert.equal(away.benFell(), true);
  assert.equal(away.state.stage, 'abandoned');
  assert.equal(away.benFell(), false, 'he dies once');
});

test('a save of it round-trips, and a state that cannot have happened is refused', () => {
  const quest = createSpiderQuest();
  quest.ask(); quest.accept(); quest.begin(); quest.settle({ spiderDead: true }); quest.take('lesson');
  const saved = quest.snapshot();
  assert.equal(validateSpiderQuestSnapshot(saved), true);
  const loaded = createSpiderQuest();
  assert.equal(loaded.restore(saved), true);
  assert.deepEqual(loaded.snapshot(), saved);
  const before = loaded.snapshot();
  for (const bad of [null, {}, { ...before, version: 2 }, { ...before, stage: 'nowhere' },
    { ...before, benDown: 'yes' },
    // Paid by a dead man; finished with the thing alive; abandoned with him on his feet.
    { ...before, benDown: true }, { ...before, spiderDown: false },
    { ...before, stage: 'abandoned', benDown: false }]) {
    assert.equal(validateSpiderQuestSnapshot(bad), false, JSON.stringify(bad));
    assert.equal(loaded.restore(bad), false);
    assert.deepEqual(loaded.snapshot(), before, 'a refused save changed the live one');
  }
  assert.deepEqual([...STAGES].sort(), ['abandoned', 'asked', 'fighting', 'killed', 'paid', 'taught', 'unmet', 'walking']);
});

/**
 * **Sorcery**: its own table beside Arms, and the four decisions the user made on 22 September
 * 2026 — a pool of its own, the weapon hand, thirty-five copper, and a spider on Mallec's shape.
 */
test('a fireball costs focus, wants a wand, and grows the way Arms grows', () => {
  const low = castWith('fireball', { level: 1, weapon: 'wand' });
  const high = castWith('fireball', { level: 99, weapon: 'wand' });
  assert.ok(low.damage > 24 && low.damage < 30, `a first fireball is ${low.damage}, and a first sword swing is 24`);
  assert.ok(high.damage > low.damage * 2.5, 'ninety-nine is worth being');
  assert.ok(high.cost < low.cost && high.cast < low.cast, 'cheaper and quicker, not different');
  // Three of them at level one, out of a pool of sixty.
  const pool = focusAt(1);
  assert.equal(Math.floor(pool.focus / low.cost), 3, `${Math.floor(pool.focus / low.cost)} casts before the focus is out`);
  assert.ok(focusAt(99).focus > pool.focus * 3 && focusAt(99).regain > pool.regain * 6);
  // **The weapon hand, and nothing else.** A sword casts nothing at all.
  assert.equal(castWith('fireball', { level: 50, weapon: 'simple-sword' }), null);
  assert.equal(castWith('fireball', { level: 50, weapon: null }), null, 'and neither does a bare hand');
  assert.equal(castsWith('wand'), 'wand');
  assert.equal(castsWith('oak-staff'), 'staff');
  // A staff hits harder and is slower, which is the only difference between the two.
  const staff = castWith('fireball', { level: 1, weapon: 'oak-staff' });
  assert.ok(staff.damage > low.damage && staff.cast > low.cast);
  assert.equal(castWith('nothing-like-that', { level: 1, weapon: 'wand' }), null);
});

test('only damage pays a school, and only Ben teaches one', () => {
  assert.ok(spellXp(26) > 0);
  assert.ok(spellXp(26, { killing: true }) > spellXp(26), 'a killing blow pays a little more');
  assert.equal(spellXp(0), 0);
  assert.equal(spellXp(-5), 0);
  assert.ok(schoolLevel(0) === 1 && schoolLevel(spellXp(26) * 400) > 1, 'the same table as every other skill');
  // Five schools, three of them taught, and the journal carries all five.
  assert.deepEqual([...SCHOOL_IDS], ['fire', 'mind', 'beast', 'frost', 'wards']);
  for (const id of SCHOOL_IDS) {
    assert.ok(SKILL_IDS.includes(id), `${id} is not on the sheet`);
    assert.equal(SKILLS[id].group, 'Sorcery');
    assert.ok(SKILLS[id].blurb && SKILLS[id].teacher, `${id} says who teaches it`);
  }
  assert.match(SKILLS.fire.teacher, /Ben/);
  assert.match(SKILLS.frost.teacher, /nobody/i, 'and nobody teaches the other two yet');
  assert.match(SKILLS.wards.teacher, /nobody/i);
  assert.deepEqual(Object.keys(SPELLS), ['fireball', 'mindread', 'summon-bees'], 'one spell each, and Ben’s is the plainest thing in the world');
  assert.equal(SPELLS.fireball.school, 'fire');
});

test('the spider is harder than the rebels and a long way short of the border', () => {
  const { spider, rebel, goblin, soldier } = ENEMY_KINDS;
  assert.ok(spider, 'there is no spider');
  assert.ok(spider.damage > rebel.damage, 'it hits harder than the men on the Drent road');
  assert.ok(spider.damage < ENEMY_KINDS.ogre.damage, 'and a long way short of Mallec');
  assert.ok(spider.damage > goblin.damage && spider.damage > soldier.damage * .9);
  // Read a long way off, and cannot be interrupted: trading blows with it is how Ben dies.
  assert.ok(spider.tell >= 1, 'its tell is long and honest');
  assert.equal(spider.stagger, false, 'a hit does not stop it');
  assert.ok(spider.lunge > 5, 'it leaps, so backing straight up is no answer');
  assert.equal(spider.pack, 1, 'there is one of it');
  assert.ok(SPIDER.hp > 200, 'and it takes some killing');
});

test('Ben is who the user said, and the guild pays what it pays', () => {
  assert.equal(BEN.name, 'Ben');
  assert.equal(BEN.modelRole, 'sorcerer');
  assert.equal(BEN.look.hairStyle, 'bald', 'bald, which is not the same as leaving the hair unsaid');
  assert.equal(BEN.look.hat, true, 'and he wears a hat, which the user asked for by name');
  assert.ok(BEN.skin > 0x8a5a30 && BEN.skin < 0xc89a70, 'light brown');
  assert.match(BEN.role, /guild/);
  // Above the goblin camp's thirty, below the border battle's forty.
  assert.equal(SPIDER_QUEST.bounty, 35);
  assert.deepEqual(SPIDER_QUEST.lesson, { skill: 'fire', spell: 'fireball' });
  assert.equal(SPIDER_QUEST.ben, BEN.id);
  assert.deepEqual(Object.keys(REWARDS), ['bounty', 'lesson']);
});

test('the den is far enough out to be a walk, and has room for the fight', async () => {
  const { createWorld } = await sourceModule('../src/world.js');
  const world = createWorld(new THREE.Scene());
  const den = SPIDER_QUEST.den, square = world.npcPositions['relay-clerk'];
  assert.equal(world.regionAt(den.x, den.z)?.name, 'Luscia');
  assert.ok(canStand(den.x, den.z, world, BODY.person), 'the den floor is standable');
  const walk = Math.hypot(den.x - square.x, den.z - square.z);
  assert.ok(walk > 80 && walk < 200, `the den is ${walk.toFixed(0)} m from the square`);
  // Nine clear metres round it, because a thing with a three-metre reach needs room.
  for (let turn = 0; turn < 16; turn++) for (const out of [4, 7, 9]) {
    const angle = turn / 16 * Math.PI * 2;
    assert.ok(canStand(den.x + Math.cos(angle) * out, den.z + Math.sin(angle) * out, world, BODY.person),
      `the den is walled ${out} m out at ${(angle * 180 / Math.PI).toFixed(0)}°`);
  }
  // Nobody lives near enough to watch, and Ben himself stands on the square, not out here.
  for (const [id, stand] of Object.entries(world.npcPositions)) {
    const gap = Math.hypot(stand.x - den.x, stand.z - den.z);
    assert.ok(gap > 50, `${id} stands ${gap.toFixed(0)} m from the spider`);
  }
  const ben = world.npcPositions[BEN.id];
  assert.ok(ben, 'Ben is not placed anywhere');
  assert.ok(Math.hypot(ben.x - square.x, ben.z - square.z) < 30, 'he is on the square');
  assert.ok(canStand(ben.x, ben.z, world, BODY.person), 'and on ground that holds him');
  // Level enough to be spoken to: talk range is a 3-D distance (Chip, 22 September 2026).
  const here = world.heightAt(ben.x, ben.z);
  for (let turn = 0; turn < 12; turn++) {
    const angle = turn / 12 * Math.PI * 2, x = ben.x + Math.cos(angle) * 1.9, z = ben.z + Math.sin(angle) * 1.9;
    assert.ok(canStand(x, z, world, BODY.person), `there is nowhere to stand beside him at ${(angle * 180 / Math.PI).toFixed(0)}°`);
    assert.ok(Math.hypot(1.9, world.heightAt(x, z) - here) < 3.3, 'a traveler beside him is out of talk range');
  }
});
