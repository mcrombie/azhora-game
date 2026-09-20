import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRefugees } from '../src/refugees.js';

/**
 * `playSeconds` is the clock of one game: it is zeroed when a game begins and set from the save
 * when one is loaded. Anything subtracted from it belongs to the same game and has to be reset
 * with it. `refugeeHold` — the seconds the Lauvel refugees have stood waiting for a fight ahead
 * of them to finish — is subtracted from it, and carried into the next game it makes their clock
 * negative. `setClock` refuses a negative, so they do not break: they stand still on the road
 * until the new game's clock passes the old game's total, which can be a minute of play.
 */
const main = readFileSync(fileURLToPath(new URL('../src/main.js', import.meta.url)), 'utf8');
const lines = main.split('\n');

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

test('everything subtracted from playSeconds is reset wherever playSeconds is', () => {
  // Every assignment of the clock that is not its declaration.
  const assignments = lines.map((line, i) => ({ line: line.trim(), at: i + 1 }))
    .filter(entry => /(?:^|[^a-zA-Z_$.])playSeconds\s*=[^=]/.test(entry.line))
    .filter(entry => !/^let playSeconds=0;$/.test(entry.line));
  // Two of them begin a game: one fresh, one from a save. The rest pin the clock for a review shot.
  const starts = assignments.filter(entry => /playSeconds=0;/.test(entry.line) || /saved\.playSeconds/.test(entry.line));
  assert.equal(starts.length, 2, `expected a fresh start and a load, found ${starts.length} at ${starts.map(s => s.at)}`);
  const pins = assignments.filter(entry => !starts.includes(entry));
  for (const pin of pins) assert.match(pin.line, /view===/, `src/main.js:${pin.at} sets the clock outside a review view and outside the two starts`);

  // Whatever is subtracted from playSeconds anywhere in the file must be reset at both starts.
  const offsets = new Set([...main.matchAll(/playSeconds\s*-\s*([a-zA-Z_$][\w$]*)/g)].map(m => m[1]));
  assert.ok(offsets.size >= 1, 'nothing is subtracted from playSeconds any more; drop this test');
  for (const name of offsets) {
    assert.match(main, new RegExp(`${name}\\s*\\+=`), `${name} is not a running total, so it is not an offset of the clock`);
    for (const start of starts)
      assert.match(start.line, new RegExp(`\\b${name}\\s*=\\s*0`),
        `${name} is subtracted from playSeconds but src/main.js:${start.at} sets the clock without resetting it`);
  }
});
