import test from 'node:test';
import assert from 'node:assert/strict';
import { LUSCIA_PROPHET, lusciaProphetConversation } from '../src/luscia-prophet.js';

function fixture() {
  const dialogs = [];
  let closed = 0;
  const context = {
    openDialogue: (npc, lines, event, action, options) => dialogs.push({ npc, lines, event, action, ...options }),
    closeDialogue: () => { closed++; },
  };
  const current = () => dialogs.at(-1);
  const talk = () => lusciaProphetConversation(LUSCIA_PROPHET, context);
  const choose = id => {
    const choice = current().choices.find(entry => entry.id === id);
    assert.ok(choice, `available choice: ${id}`);
    choice.action();
  };
  return { context, dialogs, current, talk, choose, get closed() { return closed; } };
}

test('the optional seer only handles his own identity', () => {
  const f = fixture();
  assert.equal(lusciaProphetConversation(null, f.context), false);
  assert.equal(lusciaProphetConversation({ id: 'doomsayer' }, f.context), false);
  assert.equal(f.dialogs.length, 0);
  assert.equal(f.talk(), true);
  assert.equal(f.current().npc.name, 'Caelom');
  assert.equal(LUSCIA_PROPHET.look.eyePatch, true);
  assert.equal(f.current().event, null);
  f.choose('leave-luscia-prophet');
  assert.equal(f.closed, 1);
});

test('each warning returns to the conversation without needing game progression services', () => {
  const f = fixture();
  f.talk();
  for (const topic of ['winter', 'invaders', 'eye', 'directions']) {
    f.choose(`seer-${topic}`);
    assert.equal(f.current().npc, LUSCIA_PROPHET);
    assert.equal(f.current().event, null, 'no reward or quest event attached');
    assert.equal(typeof f.current().onComplete, 'function');
    f.current().onComplete();
    assert.ok(f.current().choices.some(choice => choice.id === 'leave-luscia-prophet'));
  }
  f.choose('leave-luscia-prophet');
  assert.equal(f.closed, 1);
});

test('directions describe the actual fork and visions do not promise a scheduled invasion', () => {
  const f = fixture();
  f.talk();
  f.choose('seer-directions');
  const directions = f.current().lines.join(' ');
  assert.match(directions, /Nothom\. South/);
  assert.match(directions, /Elagos\. West/);
  assert.match(directions, /east.*Caloss\. Bridge\. Drent/);
  f.current().onComplete();
  f.choose('seer-winter');
  assert.match(f.current().lines.join(' '), /possible future/);
  f.current().onComplete();
  f.choose('seer-invaders');
  assert.match(f.current().lines.join(' '), /neither a name nor a date/);
});

test('the host can modify a displayed page without changing later conversations', () => {
  const f = fixture();
  f.talk();
  f.choose('seer-winter');
  const original = f.current().lines[0];
  f.current().lines[0] = 'Host-rendered replacement';
  f.current().onComplete();
  f.choose('seer-winter');
  assert.equal(f.current().lines[0], original);
});
