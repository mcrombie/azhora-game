import { moveInput, roadRoute, nearestOnPath } from './autopilot.js';
import { BODY, stepToward } from '../combat/bodies.js';
import { BATMAN_QUEST } from '../../content/quests/batman/batman-quest.js';
import { BAT_CAVE, SUVAL_HIGHLAND_TRAILS } from '../../content/regions/suval-highlands/suval-highlands.js';

const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const valid = p => p && Number.isFinite(p.x) && Number.isFinite(p.z);
const still = () => ({ forward: 0, side: 0, run: false });
const RIDGE = SUVAL_HIGHLAND_TRAILS.find(trail => trail.id === 'hollow-ridge-path').points;
const REPLIES = Object.freeze(['catie-accept', 'batman-speak', 'batman-fly', 'batman-landed']);

/** Join the public roads, then keep every narrow switchback of the hollow ridge.
 * If manual control stopped halfway up, rejoin the nearest segment rather than
 * walking back to Catie or cutting a straight line through a cliff.
 */
export function catieCaveRoute(world, from) {
  const onRidge = nearestOnPath(RIDGE, from);
  const points = onRidge.distance < 8
    ? [{ x: onRidge.x, z: onRidge.z }, ...RIDGE.slice(onRidge.index + 1)]
    : [...(roadRoute(world.paths ?? [], from, RIDGE[0]) ?? []), ...RIDGE];
  return points.map(p => ({ x: p.x, z: p.z })).filter((p, i, list) => !i || gap(p, list[i - 1]) > .1);
}

/** Catie's peaceful quest, using ordinary input only. The host supplies one fresh
 * test setup beside Catie; this controller never teleports, edits quest state,
 * moves Batman or advances his flight. read() supplies mode, position, quest,
 * flight, catie, batman, combat, riding, sneaking, dialogue and interaction.
 */
export function createCatieAutopilot({ world, read, act = {}, options = {} } = {}) {
  const config = { dialoguePace: 1.8, choicePace: 1.1, interactEvery: .7, maxSeconds: 1800, idleLimit: 65, ...options };
  const listeners = new Set(), probe = { x: 0, z: 0 };
  let active = false, intent = '', reason = '', move = still(), yaw = null;
  let elapsed = 0, idle = 0, speech = 0, touch = 0, previous = null, stamp = '', route = null, cursor = 0;
  const notify = e => { for (const fn of listeners) fn(e); };
  function stop(text = 'Catie autoplay stopped. You have control.', completed = false) {
    if (!active) return false;
    active = false; reason = text; intent = ''; move = still(); yaw = null;
    notify({ type: 'stop', reason: text, completed, questId: BATMAN_QUEST.id }); return true;
  }
  function start() {
    if (active) return false;
    active = true; reason = ''; intent = 'Speaking with Catie'; move = still(); yaw = null;
    elapsed = idle = speech = touch = cursor = 0; previous = null; stamp = ''; route = null;
    notify({ type: 'start', questId: BATMAN_QUEST.id }); return true;
  }
  function walk(s, target, radius, run = false) {
    const distance = gap(s.position, target);
    if (distance <= radius) return true;
    Object.assign(probe, s.position);
    stepToward(probe, target, Math.min(.4, distance - radius), world, BODY.traveler);
    const dx = probe.x - s.position.x, dz = probe.z - s.position.z, length = Math.hypot(dx, dz);
    if (length > .001) {
      yaw = Math.atan2(-dx, -dz);
      move = { ...moveInput(yaw, dx / length, dz / length, run), basisYaw: yaw };
    }
    return false;
  }
  function interact(actions) { if (touch >= config.interactEvery) { actions.push({ type: 'interact' }); touch = 0; } }
  function talk(s, person, id, actions) {
    if (!valid(person) || person.available === false) { stop(`${id === 'katy' ? 'Catie' : 'Batman'} is unavailable. You have control.`); return; }
    if (s.interaction?.npcId === id) { yaw = Math.atan2(s.position.x - person.x, s.position.z - person.z); interact(actions); }
    else walk(s, person, id === 'batman' ? 1.65 : 1.3);
  }
  function step(dt = 1 / 60) {
    if (!active) return null;
    move = still(); yaw = null;
    if (!Number.isFinite(dt) || dt <= 0) return null;
    dt = Math.min(dt, .25);
    const s = read(), actions = [];
    if (!s || !valid(s.position) || !s.quest) { stop('Catie autoplay could not read the quest.'); return null; }
    const q = s.quest, combat = s.combat ?? {};
    if (s.mode === 'defeated' || combat.hp <= 0) { stop('The traveler has fallen. Choose how to recover.'); return null; }
    if (['hostile', 'dead'].includes(q.stage) || combat.phase === 'active') { stop('A fight interrupted Catie\'s peaceful search. You have control.'); return null; }
    if (!['playing', 'dialogue'].includes(s.mode)) { intent = 'Paused'; return { move, yaw, guard: false, actions, intent }; }
    if (q.stage === 'complete' && s.mode !== 'dialogue') { stop('Catie\'s quest is complete. You heard Batman\'s story and learned Flying.', true); return null; }
    elapsed += dt; touch += dt; idle += dt;
    const progress = `${q.stage}:${s.flight?.stage}:${s.flight?.distance ?? 0}:${cursor}`;
    if (progress !== stamp || (previous && gap(previous, s.position) > .015) || q.stage === 'flying') idle = 0;
    stamp = progress; previous = { ...s.position };
    if (elapsed > config.maxSeconds || idle > config.idleLimit) { stop('Catie autoplay could not find a way forward. You have control.'); return null; }
    if (s.mode === 'dialogue') {
      intent = s.dialogue?.npcId === 'katy' ? 'Listening to Catie' : 'Listening to Batman'; speech += dt;
      if (!['katy', 'batman'].includes(s.dialogue?.npcId)) { stop('Another conversation interrupted Catie\'s quest. You have control.'); return null; }
      const choices = (s.dialogue?.choices ?? []).filter(c => c.enabled !== false);
      if (choices.length && speech >= config.choicePace) {
        const wanted = REPLIES.map(id => choices.find(c => c.id === id)).find(Boolean);
        if (!wanted) { stop('Catie autoplay did not find the peaceful reply it expected. You have control.'); return null; }
        actions.push({ type: 'choose', id: wanted.id }); speech = 0; idle = 0;
      } else if (!choices.length && speech >= config.dialoguePace) { actions.push({ type: 'continue' }); speech = 0; idle = 0; }
    } else if (q.stage === 'flying' || s.flight?.mounted) {
      // The quest's own carrier owns every metre. Never steer, dismount or run here.
      speech = 0; intent = 'Flying over Suval and hearing Batman\'s story';
    } else if (s.riding?.mounted) {
      intent = 'Dismounting for the mountain path';
      if (touch >= config.interactEvery) { actions.push({ type: 'dismount' }); touch = 0; }
    } else if (s.sneaking) {
      intent = 'Standing to walk with Catie\'s directions';
      if (touch >= config.interactEvery) { actions.push({ type: 'toggleSneak' }); touch = 0; }
    } else {
      speech = 0;
      if (q.stage === 'available') { intent = 'Speaking with Catie'; talk(s, s.catie, 'katy', actions); }
      else if (['searching', 'found', 'friendly'].includes(q.stage)) {
        if (gap(s.position, BAT_CAVE.perch) < 4.5) {
          intent = 'Speaking peacefully with Batman'; talk(s, s.batman, 'batman', actions);
        } else {
          if (!route) route = catieCaveRoute(world, s.position);
          while (cursor < route.length - 1 && gap(s.position, route[cursor]) < .45) { cursor++; idle = 0; }
          const onRidge = nearestOnPath(RIDGE, s.position).distance < 9;
          intent = onRidge ? 'Climbing the winding hollow ridge path' : 'Following the roads to the Suval highlands';
          walk(s, route[cursor] ?? BAT_CAVE.perch, .32, !onRidge);
        }
      } else { stop('Catie\'s quest cannot continue from here. You have control.'); return null; }
    }
    for (const action of actions) act[action.type]?.(action);
    return { move, yaw, guard: false, actions, intent };
  }
  return { start, stop, step, get active() { return active; }, get intent() { return intent; },
    get reason() { return reason; }, get stopReason() { return reason; }, get move() { return move; },
    get yaw() { return yaw; }, get guard() { return false; },
    onEvent(fn) { listeners.add(fn); return () => listeners.delete(fn); } };
}
