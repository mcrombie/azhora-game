import test from 'node:test';
import assert from 'node:assert/strict';
import { talkTarget, placeKeepsPrompt } from '../src/prompt-priority.js';

/**
 * Measured on the real road with the real company, two hours of play at a quarter-second step:
 * the repair on the Caloss bridge was silenced for 21 s in six passes, Mus stood nearer the
 * traveler than the meadow courier for 90 s running, and the crossing keeper was out-answered
 * for 127 s. Each case below is one of those, reduced to the numbers that decide it.
 */
const courier = { npc: 'meadow-courier', d: 1.8, marked: true, passing: false };
const keeper = { npc: 'crossing-keeper', d: 1.8, marked: false, passing: false };
const mus = { npc: 'merc-mus', d: 1.1, marked: false, passing: true };
const chris = { npc: 'merc-gotwood', d: .9, marked: false, passing: true };

test('the person the traveler came to see answers, however near a hired sword has stopped', () => {
  assert.equal(talkTarget([mus, courier]).npc, 'meadow-courier', 'Mus, stopped at the induction, answered for the courier');
  assert.equal(talkTarget([courier, mus]).npc, 'meadow-courier', 'and it does not depend on who was looked at first');
});

test('somebody who belongs there answers before a man who is only passing, marked or not', () => {
  assert.equal(talkTarget([chris, keeper]).npc, 'crossing-keeper');
  assert.equal(talkTarget([chris, mus]).npc, 'merc-gotwood', 'between two hired swords it is the nearer, as before');
  assert.equal(talkTarget([keeper, { ...courier, d: 3.2 }]).npc, 'meadow-courier', 'and the traveler’s business beats a nearer bystander');
});

test('a hired sword still answers when he is the only one there, and when he is the business', () => {
  assert.equal(talkTarget([mus]).npc, 'merc-mus');
  assert.equal(talkTarget([{ ...chris, marked: true, d: 3 }, keeper]).npc, 'merc-gotwood', 'the man on the landing, say');
  assert.equal(talkTarget([]), null);
  assert.equal(talkTarget([{ npc: 'nobody', d: Number.NaN }]), null, 'a distance that is not a number is nobody');
});

test('a place the traveler has business at keeps the prompt from a passer-by, and from nobody else', () => {
  const repair = { id: 'bridge-repair' };
  assert.equal(placeKeepsPrompt(chris, repair), true, 'a man crossing the bridge took the prompt off the repair');
  assert.equal(placeKeepsPrompt(null, repair), true);
  assert.equal(placeKeepsPrompt(keeper, repair), false, 'somebody who belongs there still answers first, as they always have');
  assert.equal(placeKeepsPrompt({ ...chris, marked: true }, repair), false, 'and so does a hired sword who is the business');
  assert.equal(placeKeepsPrompt(chris, null), false, 'with no place there is nothing to keep it for');
});
