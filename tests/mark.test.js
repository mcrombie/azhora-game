import test from 'node:test';
import assert from 'node:assert/strict';
import { MARK, MARK_SKILLS, markConversation } from '../src/mark.js';
import { createSkills, SKILLS } from '../src/skills.js';
import { createBotany } from '../src/botany.js';
import { createGeology } from '../src/geology.js';

function fixture(saved = null) {
  const events = [], learned = [], dialogs = [];
  const skills = createSkills({ onEvent: event => events.push(event) });
  const botany = createBotany({ skills }), geology = createGeology({ skills });
  if (saved) { skills.restore(saved.skills); botany.restore(saved.botany); geology.restore(saved.geology); }
  let closed = 0;
  const context = { skills, botany, geology,
    openDialogue: (npc, lines, event, action, options) => dialogs.push({ npc, lines, action, ...options }),
    closeDialogue: () => { closed++; },
    onLearn: (id, result) => learned.push({ id, result }),
  };
  const talk = () => markConversation(MARK, context);
  const current = () => dialogs.at(-1);
  const choose = id => { const choice = current().choices.find(entry => entry.id === id); assert.ok(choice, id); choice.action(); };
  const complete = () => current().onComplete();
  const snapshot = () => ({ skills: skills.snapshot(), botany: botany.snapshot(), geology: geology.snapshot() });
  return { skills, botany, geology, events, learned, dialogs, context, talk, current, choose, complete, snapshot, get closed() { return closed; } };
}

test('Mark keeps his stable identity, warning and separate Botany and Geology choices', () => {
  const f = fixture();
  assert.equal(MARK.id, 'doomsayer'); assert.equal(MARK.name, 'Mark'); assert.equal(MARK.modelRole, 'doomsayer');
  assert.deepEqual(MARK_SKILLS, ['botany', 'geology']);
  assert.equal(markConversation({ id: 'fisher' }, f.context), false);
  assert.ok(f.talk());
  assert.deepEqual(f.current().choices.map(choice => choice.id), ['doom-warning', 'learn-botany', 'learn-geology', 'leave-doomsayer']);
  assert.ok(!f.current().choices.some(choice => /cook/i.test(`${choice.id} ${choice.label}`)));
  assert.equal(f.skills.taught('cooking'), false);
  f.choose('doom-warning');
  assert.match(f.current().lines.join(' '), /Cape Thalmagar.*Oremindi/);
  f.complete(); f.choose('leave-doomsayer'); assert.equal(f.closed, 1);
});

for (const first of MARK_SKILLS) test(`Mark's ${first} lesson teaches only that skill after the explanation is completed`, () => {
  const f = fixture(), other = MARK_SKILLS.find(id => id !== first);
  f.talk(); f.choose(`learn-${first}`);
  assert.equal(f.current().action, `Learn ${SKILLS[first].name}`);
  assert.equal(f.skills.taught(first), false, 'choosing the explanation has not completed the lesson');
  f.complete();
  assert.equal(f.skills.taught(first), true); assert.equal(f[first].met, true);
  assert.equal(f.skills.taught(other), false); assert.equal(f[other].met, false);
  assert.deepEqual(f.events.filter(event => event.type === 'skill-learned').map(event => event.id), [first]);
  assert.deepEqual(f.learned.map(entry => entry.id), [first]);
  f.talk();
  assert.equal(f.current().choices.find(choice => choice.id === `learn-${first}`).label, `Remind me about ${SKILLS[first].name}.`);
  assert.equal(f.current().choices.find(choice => choice.id === `learn-${other}`).label, `Teach me ${SKILLS[other].name}.`);
});

test('separate lesson progress survives saving, and reminders do not repeat NEW SKILL events', () => {
  const initial = fixture(); initial.talk(); initial.choose('learn-botany'); initial.complete();
  const f = fixture(initial.snapshot());
  assert.equal(f.botany.met, true); assert.equal(f.geology.met, false); assert.deepEqual(f.events, []);
  f.talk(); f.choose('learn-botany'); f.complete();
  assert.deepEqual(f.events, [], 'remembered Botany does not announce again after reload');
  f.choose('learn-geology'); f.complete();
  assert.equal(f.geology.met, true);
  assert.deepEqual(f.events.filter(event => event.type === 'skill-learned').map(event => event.id), ['geology']);
  assert.equal(f.skills.taught('cooking'), false, 'neither lesson teaches Cooking');
  const restored = fixture(f.snapshot());
  restored.talk();
  for (const id of MARK_SKILLS) {
    assert.match(restored.current().choices.find(choice => choice.id === `learn-${id}`).label, /^Remind me/);
    assert.match(SKILLS[id].teacher, /Mark/);
  }
});
