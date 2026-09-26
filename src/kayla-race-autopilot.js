import { moveInput, freeDirection } from './autopilot.js';
import { canStand } from './game-state.js';
import { KAYLA_RACE, KAYLA_RACE_LANE } from './kayla-race.js';

const still = () => ({ forward: 0, side: 0, run: false });
const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
/** Normal camera-relative controls; no direct changes to race results or runner coordinates. */
export function createKaylaRaceAutopilot({ world, read, act = {}, options = {} } = {}) {
  const config = { dialoguePace: 1.5, choicePace: 1, timeout: 600, ...options }, listeners = new Set();
  let active = false, intent = '', reason = '', move = still(), yaw = null, elapsed = 0, speech = 0, touch = 0;
  const notify = event => { for (const listener of listeners) listener(event); };
  function stop(text = 'Kayla autoplay stopped. You have control.', completed = false) {
    if (!active) return false;
    active = false; intent = ''; reason = text; move = still(); yaw = null;
    notify({ type: 'stop', reason, completed, questId: KAYLA_RACE.id }); return true;
  }
  function start() {
    if (active) return false;
    active = true; intent = 'Speaking with Kayla'; reason = ''; move = still(); yaw = null; elapsed = speech = touch = 0;
    notify({ type: 'start', questId: KAYLA_RACE.id }); return true;
  }
  function walk(position, target, riding) {
    let direction = freeDirection(position, target, world);
    if (riding) {
      const dx = target.x - position.x, dz = target.z - position.z, length = Math.hypot(dx, dz);
      if (length < .05) return;
      direction = { x: dx / length, z: dz / length };
      // Check the bear's width, not the traveler's narrow footprint. Steering
      // still becomes ordinary input consumed by the same mounted controller.
      for (const turn of [0, .3, -.3, .6, -.6, 1, -1]) {
        const c = Math.cos(turn), s = Math.sin(turn), trial = { x: direction.x * c - direction.z * s, z: direction.x * s + direction.z * c };
        if ([.4, .8, 1.2, 1.8].every(d => canStand(position.x + trial.x * d, position.z + trial.z * d, world, KAYLA_RACE.radius + .02))) {
          direction = trial; break;
        }
      }
    }
    yaw = Math.atan2(-direction.x, -direction.z);
    move = { ...moveInput(yaw, direction.x, direction.z, riding), basisYaw: yaw };
  }
  function step(dt = 1 / 60) {
    if (!active) return null;
    move = still(); yaw = null;
    const s = read(), q = s?.quest ?? s?.race, actions = [];
    if (!s?.position || !q) { stop('Kayla autoplay could not read the race.'); return null; }
    if (q.stage === 'complete') { stop('You won the race and Kayla shared her honey.', true); return null; }
    if (q.stage === 'lost') { stop('Ed won this race. You can speak to Kayla to try again.'); return null; }
    if (s.mode === 'defeated' || s.combat?.phase === 'active') { stop('The race was interrupted. You have control.'); return null; }
    if (!['playing', 'dialogue'].includes(s.mode)) { intent = 'Paused'; return { intent, move, yaw, guard: false, actions }; }
    dt = Math.min(.25, Math.max(0, dt)); elapsed += dt; touch += dt;
    if (elapsed > config.timeout) { stop('Kayla autoplay could not finish the race. You have control.'); return null; }
    if (s.mode === 'dialogue') {
      speech += dt; intent = 'Listening to Kayla';
      if (s.dialogue?.npcId !== 'kayla') { stop('Another conversation interrupted Kayla’s race.'); return null; }
      const choices = (s.dialogue.choices ?? []).filter(c => c.enabled !== false);
      if (choices.length && speech >= config.choicePace) {
        const wanted = choices.find(c => ['kayla-race-accept', 'kayla-race-reward'].includes(c.id));
        if (!wanted) { stop('Kayla’s expected reply is unavailable.'); return null; }
        actions.push({ type: 'choose', id: wanted.id }); speech = 0;
      } else if (!choices.length && speech >= config.dialoguePace) { actions.push({ type: 'continue' }); speech = 0; }
    } else {
      speech = 0;
      if (q.stage === 'countdown') intent = `Get ready: ${Math.max(1, Math.ceil(q.countdown))}`;
      else if (q.stage === 'returning') intent = 'Riding back to Ambron for another race';
      else if (q.stage === 'racing') {
        intent = 'Racing Ed to the crossroads';
        walk(q.kayla, KAYLA_RACE_LANE[Math.min(q.kayla.next, KAYLA_RACE_LANE.length - 1)], true);
      } else if (['available', 'won'].includes(q.stage)) {
        intent = q.stage === 'won' ? 'Collecting Kayla’s honey' : 'Speaking with Kayla';
        if (s.interaction?.npcId === 'kayla' || gap(s.position, q.kayla) <= 3.5) {
          if (touch >= .8) { actions.push({ type: 'interact' }); touch = 0; }
        } else walk(s.position, q.kayla, false);
      }
    }
    for (const action of actions) act[action.type]?.(action);
    return { intent, move, yaw, guard: false, actions };
  }
  return { start, stop, step, get active() { return active; }, get intent() { return intent; }, get reason() { return reason; },
    get stopReason() { return reason; }, get move() { return move; }, get yaw() { return yaw; }, get guard() { return false; },
    onEvent(listener) { listeners.add(listener); return () => listeners.delete(listener); } };
}
