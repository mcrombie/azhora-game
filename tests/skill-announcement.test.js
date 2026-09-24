import test from 'node:test';
import assert from 'node:assert/strict';
import { createSkills, SKILL_IDS } from '../src/skills.js';
import { createSkillAnnouncementQueue, skillIntroduction } from '../src/skill-announcement.js';

test('real first lessons announce; seeded skills and restored lessons do not', () => {
  const queue = createSkillAnnouncementQueue();
  const skills = createSkills({ begins: SKILL_IDS, onEvent: e => { if (e.type === 'skill-learned') queue.enqueue(e.id); } });
  assert.equal(queue.tick(0), null);
  skills.learn('blades'); skills.learn('blades'); skills.learn('cartography');
  assert.equal(queue.tick(0).id, 'blades'); assert.equal(queue.pending, 1);
  const save = skills.snapshot(); queue.clear(); skills.restore(save); skills.learn('blades');
  assert.equal(queue.tick(0), null);
});

test('dialogue and maps defer lessons without consuming their reading time', () => {
  const queue = createSkillAnnouncementQueue({ duration: 8 });
  queue.enqueue('cartography');
  assert.equal(queue.tick(30, false), null);
  assert.equal(queue.tick(0).id, 'cartography');
  assert.equal(queue.tick(3).id, 'cartography');
  assert.equal(queue.tick(60, false), null);
  assert.equal(queue.tick(4).id, 'cartography');
  assert.equal(queue.tick(2), null);
});

test('consecutive lessons queue, dismissal moves on, and reset clears stale lessons', () => {
  const queue = createSkillAnnouncementQueue();
  assert.equal(queue.enqueue('unknown'), false);
  queue.enqueue('blades'); queue.enqueue('shield'); queue.enqueue('stealth');
  assert.match(queue.tick(0).title, /Combat/);
  queue.dismiss(); assert.equal(queue.tick(0).id, 'shield');
  assert.equal(queue.tick(9).id, 'stealth');
  queue.clear(); assert.equal(queue.tick(0), null);
  assert.equal(queue.enqueue('blades'), true);
});

test('every teachable skill has a readable introduction; tutorials include controls', () => {
  for (const id of SKILL_IDS) {
    const intro = skillIntroduction(id); assert.ok(intro.title && intro.text && intro.controls, id);
  }
  assert.match(skillIntroduction('blades').controls, /V to guard/);
  assert.match(skillIntroduction('cartography').controls, /M to open/);
  assert.match(skillIntroduction('stealth').controls, /X to sneak/);
});
