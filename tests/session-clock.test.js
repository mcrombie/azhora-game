import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRefugees } from '../src/refugees.js';
import { createLivingStory } from '../src/living-story.js';
import { advanceHostClock } from './host-function.js';

/**
 * `playSeconds` is the clock of one game: it is zeroed when a game begins and set from the save
 * when one is loaded. Anything subtracted from it belongs to the same game and has to be reset
 * with it. `refugeeHold` — the seconds the Lauvel refugees have stood waiting for a fight ahead
 * of them to finish — is subtracted from it, and carried into the next game it makes their clock
 * negative. `setClock` refuses a negative, so they do not break: they stand still on the road
 * until the new game's clock passes the old game's total, which can be a minute of play.
 */
const main = readFileSync(fileURLToPath(new URL('../src/main.js', import.meta.url)), 'utf8');

test('the refugees stand still rather than break when their clock goes backwards', () => {
  const walkers = createRefugees();
  walkers.setClock(90);
  const walked = walkers.snapshot().walked;
  for (const backwards of [-0.001, -1, -600]) {
    assert.equal(walkers.setClock(backwards), false, `a clock of ${backwards} was accepted`);
    assert.equal(walkers.snapshot().walked, walked, 'a refused clock still moved them');
  }
  // Forwards again works, so the freeze ends rather than being permanent.
  walkers.setClock(120);
  assert.ok(walkers.snapshot().walked >= walked);
});

test('the host advances one saved world clock only during active play and fishing', () => {
  const world = createLivingStory();
  for (const mode of ['opening', 'arriving', 'pause', 'dialogue', 'inventory', 'journal', 'testing', 'defeated']) {
    assert.equal(advanceHostClock({ living: world, mode, dt: 60 }), 0, `${mode} consumes no active time`);
  }
  for (const mode of ['playing', 'fishing']) {
    const before = world.clock();
    assert.equal(advanceHostClock({ living: world, mode, dt: 1.25 }), before + 1.25);
    assert.equal(advanceHostClock({ living: world, mode, reviewFrozen: true, dt: 60 }), before + 1.25);
  }
  const saved = world.snapshot(), later = createLivingStory({ saved });
  assert.equal(later.clock(), 2.5, 'reload consumes no offline time');
  assert.equal(advanceHostClock({ living: later, mode: 'playing', dt: .5 }), 3);
  assert.equal(createLivingStory().clock(), 0, 'another new game starts its own clock');
});

test('fresh and loaded games reset refugee waiting against the new saved clock', () => {
  // Developer fixtures and frozen screenshots also set clocks; they are not new-game entry
  // points. Check the actual production entry points rather than counting assignments globally.
  const production = main.slice(0, main.indexOf("if(new URLSearchParams(location.search).has('test'))"));
  const starts = production.split('\n').filter(line => !/^\s*let /.test(line) && /playSeconds=0;|playSeconds=.*saved\.playSeconds/.test(line));
  assert.equal(starts.length, 2, 'fresh game and Continue both reset the legacy offset');
  for (const line of starts) assert.match(line, /refugeeHold=0/);
  const fresh = starts.find(line => line.includes('playSeconds=0;'));
  assert.match(fresh, /resetLivingStory\(\)/, 'fresh entry resets the saved story as well');
  assert.ok(production.includes('resetLivingStory(saved)'), 'Continue restores the saved story');
  assert.match(production, /refugees\.setClock\(playSeconds-refugeeHold\)/,
    'the legacy walkers still subtract their encounter hold from the shared clock');
});
