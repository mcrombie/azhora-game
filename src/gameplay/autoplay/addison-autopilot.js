import { moveInput } from './autopilot.js';
import { BODY, stepToward } from '../combat/bodies.js';
import { ADDISON } from '../../content/quests/lighthouse/lighthouse.js';
import { RIVAL_HEAD, ROUTE_TO_DOOR, ROUTE_IN, ROUTE_OUT, TOWER_STEP, SMUGGLERS_DOOR } from '../../content/quests/rival-light/rival-light.js';

const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const valid = p => p && Number.isFinite(p.x) && Number.isFinite(p.z);
const still = () => ({ forward: 0, side: 0, run: false });
const defaults = Object.freeze({ dialoguePace: 1.6, choicePace: 1.1, interactEvery: .7, idleLimit: 70, maxSeconds: 1200, sneakWithin: 48 });
/** The answers the pilot gives, in the order it looks for them. It keeps the fire in Addison's light. */
const WANTED = Object.freeze(['light-sister', 'light-sister-ask', 'light-deliver', 'lift-sovik', 'fire-keep']);
const LEAVING = Object.freeze(['leave-addison', 'leave-rival']);
/** Home along the downs: the way to the door, backwards. */
const OUT_WEST = Object.freeze([...ROUTE_TO_DOOR].reverse());

/**
 * **Addison's errand, played the quiet way** (src/content/quests/rival-light/rival-light.js): hear her out and take her key;
 * east along the downs to the smugglers' door; through; across East Suval by the authored route that
 * keeps out of the landward guard's sight, sneaking once the light is near; in at the postern and up
 * the stair; lift Sovik; the same way back; give him to Addison and keep him in her light.
 *
 * Ordinary inputs only. read() supplies {position, mode, quest:{stage, alarm, way}, addison:{x,z,available},
 * dialogue:{npcId, choices}, combat, interaction:{npcId, id}, sneaking, inEast, riding}; act handles
 * interact, continue, choose({id}), toggleSneak and dismount. **A fight is a failure** for this pilot:
 * the quiet way is what it demonstrates, and the watch starting one means the quiet way broke.
 */
export function createAddisonAutopilot({ world, read, act = {}, options = {} } = {}) {
  const config = { ...defaults, ...options }, listeners = new Set();
  let active = false, intent = '', stopReason = '', move = still(), yaw = null;
  let elapsed = 0, idle = 0, dialogueClock = 0, interactClock = 0, leg = '', route = [], cursor = 0, best = Infinity, previous = null;
  const probe = { x: 0, z: 0 };
  const notify = event => { for (const listener of listeners) listener(event); };
  function stop(reason = 'Addison autoplay stopped. You have control.', completed = false) {
    if (!active) return false;
    active = false; move = still(); yaw = null; intent = ''; stopReason = reason;
    notify({ type: 'stop', reason, completed, questId: 'addison-fire' }); return true;
  }
  function start() {
    if (active) return false;
    active = true; intent = 'Walking to Addison'; stopReason = ''; move = still(); yaw = null;
    elapsed = idle = dialogueClock = interactClock = 0; leg = ''; route = []; cursor = 0; best = Infinity; previous = null;
    notify({ type: 'start', questId: 'addison-fire' }); return true;
  }
  function walk(s, target, radius, name) {
    const distance = gap(s.position, target);
    if (leg !== name) { leg = name; best = distance; idle = 0; }
    if (distance < best - .15) { best = distance; idle = 0; }
    if (distance <= radius + .025) return true;
    Object.assign(probe, s.position); stepToward(probe, target, Math.min(.4, distance - radius), world, BODY.traveler);
    const dx = probe.x - s.position.x, dz = probe.z - s.position.z, length = Math.hypot(dx, dz);
    if (length > .001) { yaw = Math.atan2(-dx, -dz); move = { ...moveInput(yaw, dx / length, dz / length, false), basisYaw: yaw }; }
    return false;
  }
  /** A route taken up where the traveler already is: the nearest point on it, and on from there. */
  function follow(s, points, name, finalRadius = .45) {
    if (route !== points) {
      route = points; cursor = 0;
      let nearest = Infinity;
      points.forEach((p, i) => { const d = gap(s.position, p); if (d < nearest) { nearest = d; cursor = i; } });
      if (nearest < 2.5 && cursor < points.length - 1) cursor++;
    }
    while (cursor < route.length) {
      const last = cursor === route.length - 1;
      if (walk(s, route[cursor], last ? finalRadius : .8, `${name}-${cursor}`)) { cursor++; idle = 0; if (last) return true; continue; }
      return false;
    }
    return true;
  }
  function sneak(s, want, actions) {
    if (Boolean(s.sneaking) !== want && interactClock >= config.interactEvery) { actions.push({ type: 'toggleSneak' }); interactClock = 0; }
  }
  function interact(actions) { if (interactClock >= config.interactEvery) { actions.push({ type: 'interact' }); interactClock = 0; } }

  function step(dt = 1 / 60) {
    if (!active) return null;
    move = still(); yaw = null;
    if (!Number.isFinite(dt) || dt <= 0) return null;
    dt = Math.min(dt, .25);
    const s = read(), actions = [];
    if (!s || !valid(s.position)) { stop('Addison autoplay could not find the traveler.'); return null; }
    const q = s.quest ?? {}, combat = s.combat ?? {};
    if (s.mode === 'defeated' || combat.hp <= 0) { stop('The traveler has fallen. Choose how to recover.'); return null; }
    if (combat.phase === 'active') { stop('The Elodi saw you: a fight started. The quiet way failed.'); return null; }
    if (!['playing', 'dialogue'].includes(s.mode)) { intent = 'Paused'; return { move, yaw, guard: false, actions, intent }; }
    if (q.stage === 'done' && s.mode !== 'dialogue') { stop('Sovik burns in the Suval Light now. Addison’s errand is done.', true); return null; }
    elapsed += dt; idle += dt; interactClock += dt;
    if (previous && gap(previous, s.position) > .015) idle = 0;
    previous = { ...s.position };
    if (elapsed > config.maxSeconds || idle > config.idleLimit) { stop('Addison autoplay could not find a way forward. You have control.'); return null; }

    if (s.mode === 'dialogue') {
      intent = 'Listening'; dialogueClock += dt;
      const choices = (s.dialogue?.choices ?? []).filter(c => c.enabled !== false);
      if (choices.length && dialogueClock >= config.choicePace) {
        const choice = WANTED.map(id => choices.find(c => c.id === id)).find(Boolean) ?? LEAVING.map(id => choices.find(c => c.id === id)).find(Boolean);
        if (!choice) { stop('Addison autoplay did not find the reply it expected. You have control.'); return null; }
        actions.push({ type: 'choose', id: choice.id }); dialogueClock = 0;
      } else if (!choices.length && dialogueClock >= config.dialoguePace) { actions.push({ type: 'continue' }); dialogueClock = 0; }
    } else if (s.riding?.mounted) {
      intent = 'Dismounting'; if (interactClock >= config.interactEvery) { actions.push({ type: 'dismount' }); interactClock = 0; }
    } else {
      dialogueClock = 0;
      const talkToAddison = () => {
        if (!valid(s.addison) || s.addison.available === false) { stop('Addison is unavailable. You have control.'); return; }
        sneak(s, false, actions);
        if (s.interaction?.npcId === ADDISON.id) { yaw = Math.atan2(s.position.x - s.addison.x, s.position.z - s.addison.z); interact(actions); }
        else walk(s, s.addison, 1.3, 'addison');
      };
      if (['unknown', 'told'].includes(q.stage)) { intent = 'Asking Addison about the other light'; talkToAddison(); }
      else if (q.stage === 'asked') {
        if (!s.inEast) {
          intent = 'East along the downs to the smugglers’ door';
          sneak(s, false, actions);
          if (s.interaction?.id === 'smugglers-door') { intent = 'Unlocking the smugglers’ door'; interact(actions); }
          else { follow(s, ROUTE_TO_DOOR, 'to-door'); move.run = true; }
        } else {
          const near = gap(s.position, RIVAL_HEAD) < config.sneakWithin;
          sneak(s, near, actions);
          if (s.interaction?.id === 'elod-stair') { intent = 'Climbing to the lantern'; yaw = TOWER_STEP.yaw; interact(actions); }
          else { intent = near ? 'Sneaking in at the postern, behind the landward guard' : 'Across East Suval, out of the watch’s sight'; follow(s, ROUTE_IN, 'in');
            move.run = gap(s.position, RIVAL_HEAD) > config.sneakWithin + 25; }
        }
      } else if (q.stage === 'taken') {
        if (s.inEast) {
          sneak(s, gap(s.position, RIVAL_HEAD) < config.sneakWithin, actions);
          if (s.interaction?.id === 'smugglers-hatch') { intent = 'Back through the smugglers’ door'; interact(actions); }
          else { intent = 'Smuggling Sovik out the way you came'; follow(s, ROUTE_OUT, 'out'); move.run = gap(s.position, RIVAL_HEAD) > config.sneakWithin + 25; }
        } else if (gap(s.position, s.addison ?? SMUGGLERS_DOOR.west) > 12) { intent = 'Carrying Sovik home along the downs'; sneak(s, false, actions); follow(s, OUT_WEST, 'home'); move.run = true; }
        else { intent = 'Bringing Sovik to Addison'; talkToAddison(); }
      } else if (q.stage === 'home') { intent = 'Deciding with Addison'; talkToAddison(); }
    }
    for (const action of actions) act[action.type]?.(action);
    return { move, yaw, guard: false, actions, intent };
  }
  return { start, stop, step, get active() { return active; }, get intent() { return intent; },
    get stopReason() { return stopReason; }, get reason() { return stopReason; }, get move() { return move; },
    get yaw() { return yaw; }, get guard() { return false; },
    onEvent(fn) { listeners.add(fn); return () => listeners.delete(fn); } };
}
