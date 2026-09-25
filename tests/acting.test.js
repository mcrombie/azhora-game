import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTING_EMOTES, ACTING_LESSON, ACTING_XP, createActing, actingPracticeConversation } from '../src/acting.js';
import { createSkills, RUNESCAPE_TABLE, SKILLS } from '../src/skills.js';
import { createTroupe, troupeConversation } from '../src/troupe.js';

test('Acting introduces the skill without resetting prior practice or excluding other teachers', () => {
  const skills = createSkills(), acting = createActing({ skills });
  assert.ok(acting.perform('happy').ok, 'level-one skills can be practised before a formal lesson');
  acting.update(3);
  assert.equal(acting.teach().first, true);
  assert.equal(skills.xp('acting'), ACTING_XP);
  assert.equal(skills.learn('acting').first, false, 'a later teacher does not reset or duplicate the introduction');
  assert.equal(acting.taught(), true);
  assert.equal(skills.xp('acting'), ACTING_XP);
  assert.match(ACTING_LESSON.join(' '), /Emotes/);
});

test('finished expressions award XP once and level-two unlocks a new expression', () => {
  const events = [], skills = createSkills(), acting = createActing({ skills, onEvent: event => events.push(event) });
  assert.deepEqual(acting.list().filter(entry => entry.unlocked).map(entry => entry.id), ['happy', 'sad']);
  assert.equal(acting.perform('surprised').ok, false);
  for (let n = 0; n < 7; n++) {
    assert.ok(acting.perform('happy').ok);
    assert.equal(acting.perform('happy').ok, false, 'restarting an active animation cannot farm XP');
    acting.update(3);
  }
  assert.equal(skills.xp('acting'), 84);
  assert.equal(acting.level(), 2);
  assert.deepEqual(events.filter(event => event.type === 'acting-completed').at(-1).unlocked, ['surprised']);
  assert.ok(acting.perform('surprised').ok);
  acting.update(3);
  const xp = skills.xp('acting');
  acting.update(60);
  assert.equal(skills.xp('acting'), xp, 'completed poses do not keep paying');
});

test('pause freezes an expression, interruption cancels it, and invalid time cannot pay XP', () => {
  const skills = createSkills(), acting = createActing({ skills });
  assert.equal(acting.perform('happy', { blocked: true }).ok, false);
  acting.perform('sad'); acting.update(1);
  const held = acting.pose();
  acting.update(20, { paused: true });
  assert.deepEqual(acting.pose(), held);
  for (const dt of [NaN, Infinity, -1, 0]) acting.update(dt);
  assert.deepEqual(acting.pose(), held);
  acting.update(.1, { blocked: true });
  assert.equal(acting.pose(), null);
  assert.equal(skills.xp('acting'), 0);
  acting.perform('happy'); assert.ok(acting.cancel('travel'));
  assert.equal(skills.xp('acting'), 0);
});

test('Acting unlocks and introduction survive the normal skill save', () => {
  const skills = createSkills(), acting = createActing({ skills });
  acting.teach(); skills.gain('acting', RUNESCAPE_TABLE[4]);
  const restoredSkills = createSkills(); assert.ok(restoredSkills.restore(skills.snapshot()));
  const restored = createActing({ skills: restoredSkills });
  assert.equal(restored.taught(), true);
  assert.ok(restored.list().every(entry => entry.unlocked));
  assert.equal(restored.pose(), null, 'a half-finished performance is not replayed by loading');
  for (const entry of ACTING_EMOTES) assert.ok(SKILLS.acting.unlocks.some(unlock => unlock.level === entry.level && unlock.text.includes(entry.name)));
});

test('Amanda offers practice and labels future expressions by required level', () => {
  const skills = createSkills(), acting = createActing({ skills });
  let opened, closed = false, action;
  actingPracticeConversation({ id: 'troupe-amanda' }, { acting,
    openDialogue: (npc, lines, event, close, options) => { opened = options; },
    closeDialogue: () => { closed = true; }, act: id => { action = id; } });
  assert.ok(opened.noWayfinding);
  assert.equal(opened.choices.find(choice => choice.id === 'acting-emote-angry').enabled, false);
  assert.equal(opened.choices.find(choice => choice.id === 'acting-emote-angry').disabled, true);
  opened.choices.find(choice => choice.id === 'acting-emote-happy').action();
  assert.equal(closed, true); assert.equal(action, 'acting-emote-happy');
});

test('Amanda exposes both a clear skill introduction and the practice picker', () => {
  const skills = createSkills(), acting = createActing({ skills }), troupe = createTroupe();
  let opened, action;
  const context = { troupe, acting, openDialogue: (npc, lines, event, close, options) => { opened = options; },
    closeDialogue() {}, act: id => { action = id; } };
  troupeConversation({ id: 'troupe-amanda' }, context);
  const lesson = opened.choices.find(choice => choice.id === 'amanda-learn-acting');
  assert.equal(lesson.label, 'Learn Acting'); lesson.action();
  assert.equal(action, 'amanda-learn-acting');
  opened.choices.find(choice => choice.id === 'amanda-practice-acting').action();
  assert.ok(opened.choices.some(choice => choice.id === 'acting-emote-happy'));
});
