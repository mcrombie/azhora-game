/**
 * **Touch controls** (the user, 26 September 2026: "I need to be able to get to the testing tools
 * and move but that is not an option on mobile").
 *
 * On a phone there is no F8, no WASD and no right mouse button, so none of the game's own ways in
 * exist. This is a layer over the view, shown only on a touch screen (or with `?touch=1`, for a
 * desktop to look at it):
 *
 * - a **stick** for the left thumb, read as the same forward/side the keyboard gives, with a push
 *   to the rim for a run (`stickInput`);
 * - a drag **anywhere else on the view turns the camera** (src/main.js), which a mouse does with
 *   its right button;
 * - **buttons for the right thumb**, each of which is a key the game already listens for: use, strike,
 *   dodge, guard (held), jump, sneak, and a run that stays on until tapped again;
 * - a **top row** for what a phone cannot reach at all: the testing tools, autoplay, the journal
 *   and the pause menu.
 *
 * Moving the stick or pressing an action takes control from autoplay, as a key does on a desktop;
 * the top row and a look around do not, so a phone can watch a quest play and look at it.
 */
export const TOUCH_ACTIONS = Object.freeze([
  Object.freeze({ id: 'interact', label: 'Use', key: 'KeyF' }),
  Object.freeze({ id: 'attack', label: 'Strike', key: 'KeyR' }),
  Object.freeze({ id: 'dodge', label: 'Dodge', key: 'KeyC' }),
  Object.freeze({ id: 'guard', label: 'Guard', key: 'KeyV', hold: true }),
  Object.freeze({ id: 'jump', label: 'Jump', key: 'Space', hold: true }),
  Object.freeze({ id: 'sneak', label: 'Sneak', key: 'KeyX' }),
  Object.freeze({ id: 'run', label: 'Run', toggle: true }),
]);
export const TOUCH_TOP = Object.freeze([
  Object.freeze({ id: 'testing', label: 'Testing' }),
  Object.freeze({ id: 'autoplay', label: 'Autoplay' }),
  // On a phone the objectives are put away so the game can be seen (src/ui/input/touch-controls.css); this
  // brings them back over the view until it is tapped again.
  Object.freeze({ id: 'quest', label: 'Quest', toggle: true }),
  Object.freeze({ id: 'journal', label: 'Journal', key: 'KeyJ' }),
  Object.freeze({ id: 'menu', label: 'Menu', key: 'Escape' }),
]);

/**
 * The stick's reading. `dx`/`dy` are the finger's offset from the stick's middle in pixels (down
 * is +y, as the screen has it); `radius` is the ring's. Inside a small dead middle it reads nothing;
 * otherwise forward/side in the finger's direction, as far as it has been pushed, and a run once it
 * is pushed right out to the rim.
 */
export function stickInput(dx, dy, radius) {
  const length = Math.hypot(dx, dy);
  if (!(radius > 0) || length < radius * .14) return { forward: 0, side: 0, run: false };
  const amount = Math.min(1, length / radius);
  return { forward: -dy / length * amount, side: dx / length * amount, run: amount > .96 };
}

/** Whether to show them: a touch screen, or a page that asks with `?touch=1` (and `?touch=0` never). */
export function wantsTouch({ search = '', coarse = false, touchPoints = 0 } = {}) {
  const asked = /(?:^|[?&])touch=([01])/.exec(search);
  if (asked) return asked[1] === '1';
  return Boolean(coarse) || touchPoints > 0;
}

/**
 * Builds the layer into `root` (normally document.body). `press(code)` and `release(code)` are keys
 * down and up, delivered where the keyboard's go; `onTakeControl()` is a hand on the controls;
 * `onTesting()` and `onAutoplay()` are the two things a key cannot reach on a phone.
 *
 * Another host brings its own buttons (8 October 2026, the exploration host's war scenario on a
 * phone): `actions` and `top` replace the adventure's, and an entry with `when` shows only while
 * `setContext` names one of its contexts, so one layer serves walking about and a field skirmish.
 */
export function createTouchControls({ document, root, actions = TOUCH_ACTIONS, top: topEntries = TOUCH_TOP, press = () => {},
  release = () => {}, onTakeControl = () => {}, onTesting = () => {}, onAutoplay = () => {} }) {
  const state = { move: { forward: 0, side: 0 }, stickRun: false, runToggle: false, visible: true, playing: true, context: null };
  const make = (tag, className, parent, text = '') => {
    const element = document.createElement(tag);
    element.className = className;
    if (text) element.textContent = text;
    parent.appendChild(element);
    return element;
  };
  const layer = make('div', 'touch-controls', root);
  layer.id = 'touch-controls';
  // A thumb lifted from the stick or a button ends there (8 October 2026). Otherwise the browser's click for
  // that tap lands on whatever the button has just opened beneath it, such as a card's or a conversation's
  // own button. The top row acts on that click, so it keeps it.
  layer.addEventListener('touchend', event => { if (event.cancelable && !event.target?.closest?.('.touch-top')) event.preventDefault(); }, { passive: false });
  // The page knows, so the keyboard's legend can step out and the HUD make room (src/ui/input/touch-controls.css).
  root.classList?.add('touch');
  const top = make('div', 'touch-top', layer);
  const stick = make('div', 'touch-stick', layer), knob = make('div', 'touch-knob', stick);
  const actionRow = make('div', 'touch-actions', layer);
  const buttons = new Map(), contexts = new Map();

  // The stick. It keeps the finger that started it, wherever that finger goes.
  let finger = null;
  const moveKnob = (dx, dy) => { knob.style.transform = `translate(${dx}px, ${dy}px)`; };
  function readStick(event) {
    const box = stick.getBoundingClientRect(), radius = box.width / 2;
    let dx = event.clientX - (box.left + radius), dy = event.clientY - (box.top + radius);
    const length = Math.hypot(dx, dy);
    if (length > radius) { dx *= radius / length; dy *= radius / length; }
    const input = stickInput(dx, dy, radius);
    state.move = { forward: input.forward, side: input.side }; state.stickRun = input.run;
    moveKnob(dx, dy);
  }
  stick.addEventListener('pointerdown', event => {
    event.preventDefault(); finger = event.pointerId;
    stick.setPointerCapture?.(event.pointerId);
    onTakeControl();
    readStick(event);
  });
  stick.addEventListener('pointermove', event => { if (event.pointerId === finger) { event.preventDefault(); readStick(event); } });
  const letGo = event => {
    if (event.pointerId !== finger) return;
    finger = null; state.move = { forward: 0, side: 0 }; state.stickRun = false; moveKnob(0, 0);
  };
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) stick.addEventListener(type, letGo);

  // The right thumb's buttons: a key down and up, or held for as long as the finger is on it.
  for (const action of actions) {
    const button = make('button', `touch-button touch-${action.id}`, actionRow, action.label);
    button.type = 'button'; button.dataset.touch = action.id;
    buttons.set(action.id, button); if (action.when) contexts.set(action.id, action.when);
    button.addEventListener('pointerdown', event => {
      event.preventDefault();
      onTakeControl();
      if (action.toggle) { state.runToggle = !state.runToggle; button.classList.toggle('on', state.runToggle); return; }
      button.classList.add('down');
      press(action.key);
      if (!action.hold) release(action.key);
    });
    const up = () => { button.classList.remove('down'); if (action.hold) release(action.key); };
    for (const type of ['pointerup', 'pointercancel', 'pointerleave']) button.addEventListener(type, up);
  }
  for (const entry of topEntries) {
    const button = make('button', `touch-top-button touch-${entry.id}`, top, entry.label);
    button.type = 'button'; button.dataset.touch = entry.id;
    buttons.set(entry.id, button); if (entry.when) contexts.set(entry.id, entry.when);
    button.addEventListener('click', event => {
      event.preventDefault();
      if (entry.id === 'testing') onTesting();
      else if (entry.id === 'autoplay') onAutoplay();
      else if (entry.toggle) { const on = !root.classList?.contains?.('touch-info'); root.classList?.toggle?.('touch-info', on); button.classList.toggle('on', on); }
      else { press(entry.key); release(entry.key); }
    });
  }

  function sync() {
    layer.hidden = !state.visible;
    // The stick and the action buttons are for walking about; in a conversation or a menu they would
    // sit on its buttons, so they step aside and only the top row stays.
    layer.classList.toggle('touch-away', !state.playing);
  }
  sync();
  return {
    element: layer, buttons,
    /** What the stick is asking for, in the keyboard's terms. */
    get move() { return state.playing ? state.move : { forward: 0, side: 0 }; },
    /** Whether the traveler should run: the stick pushed to the rim, or the Run button left on. */
    get run() { return state.playing && (state.stickRun || state.runToggle); },
    setVisible(visible) { state.visible = Boolean(visible); sync(); },
    /** Tell it whether the game is being walked about in (`mode === 'playing'`). */
    setPlaying(playing) {
      const next = Boolean(playing);
      if (next === state.playing) return;
      state.playing = next;
      if (!next) { state.move = { forward: 0, side: 0 }; state.stickRun = false; finger = null; moveKnob(0, 0); }
      sync();
    },
    /** Which of the host's contexts is current: the buttons with `when` that do not name it step out. */
    setContext(name) {
      state.context = name; layer.dataset.context = name ?? '';
      for (const [id, when] of contexts) buttons.get(id).hidden = !when.includes(name);
    },
    get context() { return state.context; },
  };
}
