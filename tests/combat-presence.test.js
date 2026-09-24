import test from 'node:test';
import assert from 'node:assert/strict';
import { combatPresence } from '../src/combat-presence.js';

test('road companions yield to their battle models until the encounter releases them', () => {
  const ed = { id: 'merc-word', hp: 80, x: 5, z: 7 };
  const state = { phase: 'active', allies: [ed], enemies: [] };
  assert.equal(combatPresence(state).get('merc-word'), ed);
  state.phase = 'defeated';
  assert.equal(combatPresence(state).get('merc-word'), ed);
  for (const phase of ['won', 'practice', 'idle', 'retreated']) {
    state.phase = phase;
    assert.equal(combatPresence(state).size, 0, phase);
  }
});

test('named enemies and sparring partners suppress the same original person', () => {
  const guard = { id: 'law-instructor', npcId: 'instructor' };
  const spar = { id: 'spar-merc-word' };
  const state = { phase: 'active', allies: [], enemies: [guard, spar] };
  assert.equal(combatPresence(state).get('instructor'), guard);
  assert.equal(combatPresence(state).get('merc-word'), spar);
  assert.equal(combatPresence(state).has('law-instructor'), false);
});
