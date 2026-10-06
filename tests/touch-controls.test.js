import test from 'node:test';
import assert from 'node:assert/strict';
import { createTouchControls, stickInput, wantsTouch, TOUCH_ACTIONS, TOUCH_TOP } from '../src/ui/input/touch-controls.js';

/**
 * Touch controls (the user, 26 September 2026): on a phone, a way to reach the testing tools and to
 * move. A small fake DOM, enough for the layer's own elements and their pointer events.
 */
function fakeDocument() {
  const element = tag => {
    const listeners = {}, classes = new Set();
    return { tag, children: [], dataset: {}, style: {}, hidden: false, textContent: '', className: '',
      classList: { add: c => classes.add(c), remove: c => classes.delete(c), toggle: (c, on) => (on ?? !classes.has(c)) ? classes.add(c) : classes.delete(c), contains: c => classes.has(c) },
      appendChild(child) { this.children.push(child); return child; },
      addEventListener(type, fn) { (listeners[type] ??= []).push(fn); },
      fire(type, event = {}) { for (const fn of listeners[type] ?? []) fn({ preventDefault() {}, pointerId: 1, clientX: 0, clientY: 0, ...event }); },
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }), setPointerCapture() {} };
  };
  return { createElement: element, body: element('body') };
}
function fixture() {
  const document = fakeDocument(), log = [];
  const touch = createTouchControls({ document, root: document.body,
    press: code => log.push(['down', code]), release: code => log.push(['up', code]),
    onTakeControl: () => log.push(['take']), onTesting: () => log.push(['testing']), onAutoplay: () => log.push(['autoplay']) });
  const stick = touch.element.children.find(child => child.className === 'touch-stick');
  return { touch, log, stick, button: id => touch.buttons.get(id) };
}

test('the stick reads as the keyboard does, analog, and runs at the rim', () => {
  assert.deepEqual(stickInput(0, 0, 50), { forward: 0, side: 0, run: false }, 'a thumb resting in the middle is nothing');
  const up = stickInput(0, -50, 50);
  assert.ok(Math.abs(up.forward - 1) < 1e-9 && Math.abs(up.side) < 1e-9 && up.run, 'pushed right up to the rim: forward, at a run');
  const half = stickInput(25, 0, 50);
  assert.ok(Math.abs(half.side - .5) < 1e-9 && !half.run, 'halfway right: a sidestep at half pace');
});

test('it shows itself on a touch screen, and on request, and never when told not to', () => {
  assert.equal(wantsTouch({ coarse: true }), true);
  assert.equal(wantsTouch({ coarse: false }), false, 'a desktop with a mouse does not get it');
  assert.equal(wantsTouch({ search: '?test=1&touch=1' }), true, 'a desktop can ask to see it');
  assert.equal(wantsTouch({ search: '?touch=0', coarse: true }), false);
});

test('the stick moves the traveler and takes the reins; letting go stops', () => {
  const f = fixture();
  f.stick.fire('pointerdown', { clientX: 50, clientY: 0 });
  assert.deepEqual(f.log, [['take']], 'a hand on the stick takes control from autoplay');
  assert.ok(f.touch.move.forward > .9 && f.touch.run, 'pushed up to the rim');
  f.stick.fire('pointermove', { clientX: 75, clientY: 50 });
  assert.ok(Math.abs(f.touch.move.side - .5) < 1e-9 && Math.abs(f.touch.move.forward) < 1e-9 && !f.touch.run);
  f.stick.fire('pointerup');
  assert.deepEqual(f.touch.move, { forward: 0, side: 0 });
});

test('every button is a key the game already listens for; guard and jump are held', () => {
  const f = fixture();
  assert.deepEqual(TOUCH_ACTIONS.map(a => a.id), ['interact', 'attack', 'dodge', 'guard', 'jump', 'sneak', 'run']);
  f.button('interact').fire('pointerdown');
  assert.deepEqual(f.log, [['take'], ['down', 'KeyF'], ['up', 'KeyF']]);
  f.log.length = 0;
  f.button('guard').fire('pointerdown');
  assert.deepEqual(f.log, [['take'], ['down', 'KeyV']], 'guard stays up while the finger does');
  f.button('guard').fire('pointerup');
  assert.deepEqual(f.log.at(-1), ['up', 'KeyV']);
  f.button('run').fire('pointerdown');
  assert.equal(f.touch.run, true, 'Run stays on');
  f.button('run').fire('pointerdown');
  assert.equal(f.touch.run, false, 'until tapped again');
});

test('the top row reaches the testing tools and autoplay without taking the reins', () => {
  const f = fixture();
  assert.deepEqual(TOUCH_TOP.map(t => t.id), ['testing', 'autoplay', 'quest', 'journal', 'menu']);
  f.button('testing').fire('click');
  f.button('autoplay').fire('click');
  f.button('menu').fire('click');
  assert.deepEqual(f.log, [['testing'], ['autoplay'], ['down', 'Escape'], ['up', 'Escape']]);
});

test('on a phone the objectives are put away, and Quest brings them back until tapped again', () => {
  const document = fakeDocument(), log = [];
  const touch = createTouchControls({ document, root: document.body, press: code => log.push(code), release: () => {} });
  touch.buttons.get('quest').fire('click');
  assert.equal(document.body.classList.contains('touch-info'), true, 'the page shows the objectives');
  assert.equal(touch.buttons.get('quest').classList.contains('on'), true);
  touch.buttons.get('quest').fire('click');
  assert.equal(document.body.classList.contains('touch-info'), false, 'and puts them away again');
  assert.deepEqual(log, [], 'no key was pressed for it');
});

test('out of play the stick and buttons step aside and read nothing', () => {
  const f = fixture();
  f.stick.fire('pointerdown', { clientX: 50, clientY: 0 });
  f.touch.setPlaying(false);
  assert.equal(f.touch.element.classList.contains('touch-away'), true);
  assert.deepEqual(f.touch.move, { forward: 0, side: 0 });
  assert.equal(f.touch.run, false);
  f.touch.setPlaying(true);
  assert.deepEqual(f.touch.move, { forward: 0, side: 0 }, 'and a thumb has to go back on the stick');
});
