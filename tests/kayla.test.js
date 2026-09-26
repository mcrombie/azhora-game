import test from 'node:test';
import assert from 'node:assert/strict';
import { createKayla, validateKaylaSnapshot, KAYLA, KAYLA_ROUTE, KAYLA_SPEED, KAYLA_LINES, kaylaConversation } from '../src/kayla.js';

const direct = (position, target, maximum) => {
  const distance = Math.hypot(target.x - position.x, target.z - position.z);
  if (!distance) return;
  const step = Math.min(distance, maximum);
  position.x += (target.x - position.x) / distance * step;
  position.z += (target.z - position.z) / distance * step;
};
function until(kayla, check, options = {}) {
  for (let frame = 0; frame < 40000; frame++) {
    kayla.tick(.25, { move: direct, ...options });
    if (check(kayla.state())) return;
  }
  assert.fail('Kayla did not reach the expected point on her rounds.');
}

test('Kayla makes her own rounds through Drent, Pueth and Luscia without a player or a quest', () => {
  const events = [], kayla = createKayla({ onEvent: event => events.push(event) });
  const regions = new Set();
  until(kayla, state => { regions.add(state.region); return state.loops === 1; });
  for (const region of ['Drent', 'Pueth', 'Luscia']) assert.ok(regions.has(region), `visited ${region}`);
  assert.deepEqual(events.filter(e => e.type === 'kayla-stop').map(e => e.stop), ['liz', 'luscia', 'drent']);
  assert.equal(kayla.state().met, false, 'she need not have met the traveler to travel');
  assert.equal(kayla.state().lizGifts, 1);
});

test('a blocked destination never advances Kayla or transports her through it', () => {
  const kayla = createKayla(), stable = kayla.position;
  until(kayla, state => state.wait === 0);
  const before = kayla.snapshot();
  for (let frame = 0; frame < 100; frame++) kayla.tick(.25, { move() {} });
  assert.deepEqual(kayla.snapshot(), before);
  assert.equal(kayla.position, stable);
  const old = { ...stable }; kayla.tick(999, { move: direct });
  assert.ok(Math.hypot(stable.x - old.x, stable.z - old.z) <= KAYLA_SPEED * .25 + 1e-8, 'a long absent frame never catches her up by warp');
});

test('pause, dialogue, death and combat suspend every part of Kayla\'s rounds', () => {
  const kayla = createKayla();
  kayla.giveHoney({ take: () => true });
  const before = kayla.snapshot();
  for (const options of [{ paused: true }, { alive: false }, { engaged: true }]) {
    for (let frame = 0; frame < 100; frame++) kayla.tick(.25, { move: direct, ...options });
    assert.deepEqual(kayla.snapshot(), before);
  }
  kayla.tick(NaN, { move: direct }); kayla.tick(-1, { move: direct });
  assert.deepEqual(kayla.snapshot(), before);
});

test('Liz sometimes gives Kayla her own honey, never when absent, and never on restore', () => {
  const events = [], kayla = createKayla({ onEvent: event => events.push(event) });
  until(kayla, state => state.lizVisits === 1);
  assert.equal(kayla.state().honey, 18); assert.equal(kayla.state().lizGifts, 1);
  const saved = kayla.snapshot(); assert.equal(kayla.restore(saved), true);
  assert.equal(events.filter(e => e.type === 'kayla-liz-honey').length, 1);
  until(kayla, state => state.lizVisits === 2);
  assert.equal(kayla.state().lizGifts, 1, 'not every visit comes with a comb');
  until(kayla, state => state.lizVisits === 3, { lizAlive: false });
  assert.equal(kayla.state().lizGifts, 1, 'a dead or absent Liz gives no honey');
  assert.equal(kayla.state().gifts, 0, 'Liz visits do not pretend the player gave anything');
});

test('Kayla resumes from her exact saved feet and route cursor with a stable navigation identity', () => {
  const kayla = createKayla(); until(kayla, state => state.next >= 8);
  kayla.tick(.25, { move: direct });
  const saved = kayla.snapshot(), restored = createKayla(), stable = restored.position;
  assert.equal(restored.restore(saved), true); assert.equal(restored.position, stable);
  assert.deepEqual(restored.snapshot(), saved);
  for (let frame = 0; frame < 120; frame++) {
    kayla.tick(.25, { move: direct }); restored.tick(.25, { move: direct });
  }
  assert.deepEqual(restored.snapshot(), kayla.snapshot());
  assert.equal(restored.restore(undefined), true); assert.equal(restored.position, stable);
  assert.deepEqual(restored.snapshot(), createKayla().snapshot(), 'old saves receive defaults');
});

test('invalid Kayla saves are rejected without touching a running round', () => {
  const kayla = createKayla(); until(kayla, state => state.next >= 3);
  const before = kayla.snapshot();
  const invalid = [null, [], { ...before, version: 2 }, { ...before, position: { x: Infinity, z: 0 } },
    { ...before, position: { x: 1e9, z: 0 } }, { ...before, next: KAYLA_ROUTE.length }, { ...before, next: 1.5 },
    { ...before, wait: -1 }, { ...before, honey: 100 }, { ...before, met: 'yes' },
    { ...before, lizVisits: 0, lizGifts: 1 }, { ...before, gifts: 1.5 }, { ...before, stop: 'anywhere' },
    { ...before, provoked: 'yes' }];
  for (const data of invalid) {
    assert.equal(validateKaylaSnapshot(data), false); assert.equal(kayla.restore(data), false);
    assert.deepEqual(kayla.snapshot(), before);
  }
  assert.equal(validateKaylaSnapshot(undefined), true);
  assert.equal(validateKaylaSnapshot(undefined, { allowMissing: false }), false);
  assert.equal(validateKaylaSnapshot({ ...before, provoked: true }), true);
});

test('Kayla talks kindly about all three regions, her strength and asking Liz before taking honey', () => {
  assert.match(KAYLA_LINES.honey, /Drent, Pueth and Luscia/);
  assert.match(KAYLA_LINES.liz, /Liz/); assert.match(KAYLA_LINES.liz, /ask first/);
  assert.match(KAYLA_LINES.strength, /quite strong/);
  const kayla = createKayla(), dialogs = []; let stock = 1, changes = 0, closed = 0;
  const context = { kayla, hasHoney: () => stock > 0, takeHoney: () => stock > 0 ? (stock--, true) : false,
    onChange: () => changes++, closeDialogue: () => closed++,
    openDialogue: (npc, lines, event, label, options) => dialogs.push({ lines, ...options }) };
  assert.equal(kaylaConversation({ id: 'someone-else' }, context), false);
  assert.equal(kaylaConversation(KAYLA, context), true);
  assert.equal(stock, 1, 'meeting Kayla does not take honey');
  assert.equal(kayla.state().gifts, 0);
  const choices = dialogs.at(-1).choices;
  choices.find(c => c.id === 'kayla-give-honey').action();
  assert.equal(stock, 0); assert.equal(kayla.state().gifts, 1); assert.equal(changes, 1);
  choices.find(c => c.id === 'kayla-give-honey').action();
  assert.equal(stock, 0); assert.equal(kayla.state().gifts, 1); assert.equal(changes, 1, 'a stale choice cannot manufacture a comb');
  assert.match(dialogs.at(-1).lines.join(' '), /no honeycomb/);
  choices.find(c => c.id === 'leave-kayla').action(); assert.equal(closed, 1);
});
