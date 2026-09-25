import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createFrameErrors, stackLine, messageOf } from '../src/frame-errors.js';

const source = name => readFileSync(fileURLToPath(new URL(`../${name}`, import.meta.url)), 'utf8');

/**
 * The game threw on the first frame of play for most of a day and nothing said so.
 *
 * Not because the throw was quiet — `render`'s catch calls `fail`, which writes to the console
 * and puts the fatal panel up — but because nothing was looking: the host's frame only ever runs
 * under Electron, and for a day nobody ran it. These are the three places that now look.
 */

test('the recorder counts every throw, keeps the first, and shouts about each fault once', () => {
  const shouted = [], toasted = [];
  const errors = createFrameErrors({ onNew: e => shouted.push(e.message), onAny: e => toasted.push(e.message) });
  assert.deepEqual(errors.view(), { count: 0, first: null }, 'a good frame says nothing');

  const first = new Error("Cannot access 'p' before initialization");
  errors.note(first, 412);
  assert.equal(errors.count, 1);
  assert.equal(errors.first.message, "Cannot access 'p' before initialization");
  assert.equal(errors.first.frame, 412, 'which frame it was, so a run can say when it started');

  errors.note(new Error("Cannot access 'p' before initialization"), 413);
  errors.note(new Error('something else entirely'), 414);
  assert.equal(errors.count, 3, 'every throw is counted');
  assert.equal(errors.first.frame, 412, 'and the first one is still the first one');
  assert.deepEqual(shouted, ["Cannot access 'p' before initialization", 'something else entirely'],
    'the console hears each distinct fault once, not once a frame');
  assert.equal(toasted.length, 3, 'the toast is for whoever is watching, and fires every time');
  assert.deepEqual(errors.messages, ["Cannot access 'p' before initialization", 'something else entirely']);

  errors.reset();
  assert.deepEqual(errors.view(), { count: 0, first: null });
});

test('what it keeps is plain data, and it never throws on its way to saying so', () => {
  const errors = createFrameErrors();
  // `view()` goes into state(), which is JSON on its way out of the page.
  errors.note(new Error('boom'), 1);
  assert.equal(JSON.parse(JSON.stringify(errors.view())).first.message, 'boom');
  // Anything at all can be thrown in JavaScript, and the recorder is not the place to find out.
  for (const thrown of [undefined, null, 'a string', 7, { message: 'an object' }, Symbol.iterator]) {
    assert.doesNotThrow(() => createFrameErrors().note(thrown));
    assert.equal(typeof messageOf(thrown), 'string');
  }
  assert.equal(stackLine({ stack: 'Error: x\n    at render (src/main.js:4026:7)\n    at foo' }), 'render (src/main.js:4026:7)');
  assert.equal(stackLine({}), null, 'no stack is not a crash');
});

test('all three places that look are wired, and the frame still behaves as it did', () => {
  const main = source('src/main.js');
  // 1. the catch records, and then does exactly what it did before.
  assert.match(main, /\}catch\(error\)\{frameErrors\.note\(error,frameCount\);fail\(error\);\}/,
    'the throw is written down before fail, and fail is unchanged');
  assert.doesNotMatch(main, /catch\(error\)\{frameErrors\.note\(error,frameCount\);fail\(error\);requestAnimationFrame/,
    'and the loop is still not rescheduled: one bad frame stops it, as it always has');
  // 2. state() carries it, which is what a harness can ask.
  assert.match(main, /const state=\(\)=>\(\{[^;\n]*\bframeErrors:frameErrors\.view\(\),/);
  // 3. the console once per fault, and a toast while the testing tools are open.
  assert.match(main, /onNew: entry => console\.error\(/);
  assert.match(main, /testingEnabled \|\| new URLSearchParams\(location\.search\)\.has\('test'\)/);

  // The walkthrough asks at every arrival, which is thirty-odd points down the road.
  const smoke = source('src/road-smoke.js');
  assert.match(smoke, /function noThrow\(where\)/);
  assert.match(smoke, /const thrown = state\(\)\.frameErrors;/);
  assert.match(smoke, /noThrow\(`after arriving at/, 'every arrive() asks');

  // And no picture is written over a broken frame.
  const shell = source('main.cjs');
  assert.match(shell, /const frameErrorsOf = async win =>/);
  assert.ok(shell.indexOf('FRAME THREW while composing') < shell.indexOf('const picture=await win.webContents.capturePage();'),
    'the review views ask before they photograph');
  assert.match(shell, /FRAME THREW during the draw review/);
});
