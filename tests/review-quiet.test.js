import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { HAIL_FROM, createBurying, validateBuryingSnapshot, JOB_IDS, BURYING_STAGES, FOUND_ON_TRIP } from '../src/lauvel-burying.js';
import { fieldPoint } from '../src/lauvel-aftermath.js';
import { HANDOVER } from '../src/batman.js';

/**
 * Two things in the frame loop open a dialogue on their own: Sela's hail at the Lauvel and
 * the handover at the cart in Solis. Both are written to fire at a traveler who has walked
 * into earshot, and `review(view)` is not a traveler — it teleports the camera, and three of
 * the Lauvel views set the camera down inside her earshot with the quest still at 'unknown'.
 * Measured before the guard: lauvel-burial 5.6 m, lauvel-fallen 22.8 m, lauvel-dead 12.3 m,
 * all inside her reach of 34 m, and all three captures came back in dialogue mode with Sela
 * standing up out of her kneel. `reviewTarget` is what the troupe's scene already uses to
 * mean "a shot is being composed"; both triggers now use it too.
 */
const main = readFileSync(fileURLToPath(new URL('../src/main.js', import.meta.url)), 'utf8');

test('the Lauvel review views really do stand the camera inside Sela’s earshot', () => {
  // If this stops being true the guard below is no longer load-bearing, and somebody should know.
  for (const [view, at] of [['lauvel-dead', fieldPoint(10, 11)], ['lauvel-burial', fieldPoint(9, 19)], ['lauvel-fallen', fieldPoint(19.5, 5)]]) {
    const range = Math.hypot(HAIL_FROM.x - at.x, HAIL_FROM.z - at.z);
    assert.ok(range < HAIL_FROM.reach, `${view} stands ${range.toFixed(1)} m away, outside her reach of ${HAIL_FROM.reach}`);
    assert.match(main, new RegExp(`view==='${view}'`), `${view} is still a review view`);
  }
  // And those three still reset the quest to the stage the hail fires from.
  assert.match(main, /burying\.restore\(createBurying\(\)\.snapshot\(\)\)/, 'the Lauvel views still clear the quest');
  assert.equal(createBurying().stage, 'unknown');
});

test('nothing in the frame loop opens a dialogue while a review shot is being composed', () => {
  const from = main.indexOf('  function render(now) {');
  const to = main.indexOf('  requestAnimationFrame(render);', from);
  assert.ok(from > 0 && to > from, 'the render loop is still where it was');
  const loop = main.slice(from, to);
  const opens = [...loop.matchAll(/openDialogue\(/g)];
  assert.ok(opens.length >= 2, `only ${opens.length} loop-driven dialogues found`);
  for (const match of opens) {
    // Walk back to the `if(` that guards this call and check both conditions are on it.
    const guard = loop.lastIndexOf('if(mode===', match.index);
    assert.ok(guard > 0, 'a loop-driven dialogue with no mode guard at all');
    const condition = loop.slice(guard, match.index);
    assert.match(condition, /mode==='playing'/, 'a loop-driven dialogue that can open outside play');
    assert.match(condition, /!reviewTarget/, 'a loop-driven dialogue that can open over a review shot');
  }
});

test('the burying only accepts a save whose stage, jobs and tally agree with one another', () => {
  // Every one of these is a state the quest itself can never produce.
  const impossible = [
    { stage: 'found', done: [], carried: 0, why: 'found him without carrying anybody' },
    { stage: 'told', done: ['hurdle'], carried: 1, why: 'told her after one trip, not four' },
    { stage: 'done', done: ['hurdle'], carried: 3, why: 'buried him a trip early' },
    { stage: 'helping', done: [], carried: 5, why: 'carried five without ever taking the hurdle' },
    { stage: 'asked', done: ['spade'], carried: 0, why: 'worked before she asked' },
    { stage: 'unknown', done: [], carried: 2, why: 'carried two before she called out' },
    { stage: 'hailed', done: ['names'], carried: 0, why: 'kept the list before she asked' },
  ];
  for (const { why, ...snap } of impossible)
    assert.equal(validateBuryingSnapshot({ version: 1, ...snap }), false, `accepted a save that ${why}: ${JSON.stringify(snap)}`);
});

test('every state the burying can actually reach is one its own validator accepts', () => {
  const seen = new Map();
  const moves = [q => q.hail(), q => q.ask(), q => q.start(), q => q.tell(), q => q.finish(), ...JOB_IDS.map(id => q => q.work(id))];
  const key = s => `${s.stage}|${s.done.join(',')}|${s.carried}`;
  const walk = (seed, depth) => {
    const quest = createBurying();
    if (seed) assert.equal(quest.restore(seed), true, `its own snapshot was refused: ${JSON.stringify(seed)}`);
    const here = quest.snapshot();
    if (seen.has(key(here))) return;
    seen.set(key(here), here);
    assert.equal(validateBuryingSnapshot(here), true, `the validator rejects a state the quest reached: ${JSON.stringify(here)}`);
    if (depth >= 10) return;
    for (const move of moves) { const next = createBurying(); if (seed) next.restore(seed); move(next); walk(next.snapshot(), depth + 1); }
  };
  walk(null, 0);
  assert.ok(seen.size > 40, `only ${seen.size} states explored`);
  // The whole stage list is reachable, so the sweep above is not missing a branch.
  const stages = new Set([...seen.values()].map(s => s.stage));
  assert.deepEqual([...stages].sort(), [...BURYING_STAGES].sort());
  assert.equal(FOUND_ON_TRIP, 4);
});
