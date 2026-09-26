import { moveInput } from './autopilot.js';
import { BODY, stepToward } from './bodies.js';
import { TESSEN_BRIDGE, HIDEOUT_APPROACH_TRAIL } from './pueth-world.js';
import { CUB, CUB_STAND, CUB_HONEY_SOURCE } from './cub-honey-quest.js';
import { HONEY_APPROACH, HONEY_STORE, HONEY_WAIT } from './cub-honey-host.js';

export const CUB_HONEY_ROUTE = Object.freeze([
  Object.freeze({ x: -100, z: CUB_STAND.z }), TESSEN_BRIDGE.south, TESSEN_BRIDGE.north,
  ...HIDEOUT_APPROACH_TRAIL.slice(0, 3), Object.freeze({ x: -35, z: -203 }), HONEY_WAIT,
]);
const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const valid = p => p && Number.isFinite(p.x) && Number.isFinite(p.z);
const still = () => ({ forward: 0, side: 0, run: false });
const defaults = Object.freeze({ dialoguePace: 1.8, choicePace: 1.1, interactEvery: .7, idleLimit: 75, maxSeconds: 900 });

/** A normal-input demonstration. Only the root's initial playtest setup teleports.
 * read() supplies {position,mode,quest:host.state(),cub:{x,z,available},liz,
 * dialogue:{npcId,choices},combat,interaction:{npcId,id},sneaking,riding}.
 * act handles interact,continue,choose,toggleSneak,dismount. */
export function createCubAutopilot({ world, read, act = {}, options = {} } = {}) {
  const config = { ...defaults, ...options }, listeners = new Set();
  let active = false, intent = '', stopReason = '', move = still(), yaw = null;
  let elapsed = 0, idle = 0, dialogueClock = 0, interactClock = 0, stage = '', route = [], cursor = 0, finalApproach = false;
  let best = Infinity, leg = '', probe = { x: 0, z: 0 }, previous = null;
  const notify = event => { for (const listener of listeners) listener(event); };
  function stop(reason = 'Cub autoplay stopped. You have control.', completed = false) {
    if (!active) return false;
    active = false; move = still(); yaw = null; intent = ''; stopReason = reason;
    notify({ type: 'stop', reason, completed, questId: 'cub-honey' }); return true;
  }
  function start() {
    if (active) return false;
    active = true; intent = 'Meeting the bear cub'; stopReason = ''; move = still(); yaw = null;
    elapsed = idle = dialogueClock = interactClock = 0; stage = ''; route = []; cursor = 0; finalApproach = false;
    best = Infinity; leg = ''; probe = { x: 0, z: 0 }; previous = null;
    notify({ type: 'start', questId: 'cub-honey' }); return true;
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
  function selectRoute(s, returning) {
    route = returning ? [HONEY_WAIT, ...CUB_HONEY_ROUTE.slice(0, -1).reverse(), s.cub] : [...CUB_HONEY_ROUTE];
    cursor = 0;
    // Resuming chooses the closest remaining road leg, never a straight line across the river.
    let nearest = Infinity;
    for (let i = 0; i < route.length; i++) { const d = gap(s.position, route[i]); if (d < nearest) { nearest = d; cursor = i; } }
    if (nearest < 2 && cursor < route.length - 1) cursor++;
  }
  function step(dt = 1 / 60) {
    if (!active) return null;
    move = still(); yaw = null;
    if (!Number.isFinite(dt) || dt <= 0) return null;
    dt = Math.min(dt, .25);
    const s = read(), actions = [];
    if (!s || !valid(s.position)) { stop('Cub autoplay could not find the traveler.'); return null; }
    const q = s.quest ?? {}, combat = s.combat ?? {};
    if (s.mode === 'defeated' || combat.hp <= 0) { stop('The traveler has fallen. Choose how to recover.'); return null; }
    if (!['playing', 'dialogue'].includes(s.mode)) { intent = 'Paused'; return { move, yaw, guard: false, actions, intent, goal: 'wait' }; }
    if (!valid(s.cub) || s.cub.available === false || q.available === false) { stop('The cub or Liz is unavailable. You have control.'); return null; }
    elapsed += dt; idle += dt; interactClock += dt;
    if (previous && gap(previous, s.position) > .015) idle = 0;
    previous = { ...s.position };
    if (q.stage !== stage) { stage = q.stage; idle = 0; finalApproach = false; if (['learning', 'carrying'].includes(stage)) selectRoute(s, stage === 'carrying'); }
    if (elapsed > config.maxSeconds || idle > config.idleLimit) { stop('Cub autoplay could not find a safe way forward. You have control.'); return null; }
    if (q.stage === 'complete' && s.mode !== 'dialogue') { stop('The cub has the honey. The Stealth lesson is complete.', true); return null; }
    if (combat.phase === 'active') { stop('Another fight interrupted the honey lesson. Resolve it before resuming.'); return null; }
    let goal = 'talk';
    if (q.alerted) {
      goal = 'escape'; intent = "Fleeing Liz's bees";
      if (s.sneaking && interactClock >= config.interactEvery) { actions.push({ type: 'toggleSneak' }); interactClock = 0; }
      walk(s, { x: -72, z: -212 }, 1.5, 'escape'); move.run = true;
      if (gap(s.position, HONEY_STORE) > 37) { stop('Escaped the apiary. Let Liz calm down, then resume the lesson.'); return null; }
    } else if (s.mode === 'dialogue') {
      goal = 'dialogue'; intent = 'Listening to the cub'; dialogueClock += dt;
      if (s.dialogue?.npcId && s.dialogue.npcId !== CUB.id) { stop('Another conversation interrupted the cub lesson.'); return null; }
      const choices = (s.dialogue?.choices ?? []).filter(c => c.enabled !== false);
      if (choices.length && dialogueClock >= config.choicePace) {
        const choice = choices.find(c => ['cub-honey-yes', 'cub-honey-give'].includes(c.id));
        if (!choice) { stop('The expected cub reply is unavailable. You have control.'); return null; }
        actions.push({ type: 'choose', id: choice.id }); dialogueClock = 0;
      } else if (!choices.length && dialogueClock >= config.dialoguePace) { actions.push({ type: 'continue' }); dialogueClock = 0; }
    } else {
      dialogueClock = 0;
      if (s.riding?.mounted) { intent = 'Dismounting for the stealth lesson'; if (interactClock >= config.interactEvery) { actions.push({ type: 'dismount' }); interactClock = 0; } }
      else if (['unmet', 'offered'].includes(stage) || (stage === 'carrying' && cursor >= route.length)) {
        intent = stage === 'carrying' ? 'Giving the honey to the cub' : 'Asking the cub about Stealth';
        if (s.sneaking && interactClock >= config.interactEvery) { actions.push({ type: 'toggleSneak' }); interactClock = 0; }
        if (s.interaction?.npcId === CUB.id) {
          yaw = Math.atan2(s.position.x - s.cub.x, s.position.z - s.cub.z);
          if (interactClock >= config.interactEvery) { actions.push({ type: 'interact' }); interactClock = 0; }
        } else walk(s, s.cub, 1.25, 'cub');
      } else if (stage === 'learning' || stage === 'carrying') {
        goal = stage === 'carrying' ? 'return' : 'sneak';
        const needSneak = gap(s.position, HONEY_STORE) < 20;
        if (needSneak !== Boolean(s.sneaking) && interactClock >= config.interactEvery) { actions.push({ type: 'toggleSneak' }); interactClock = 0; }
        if (cursor < route.length) {
          intent = stage === 'carrying' ? 'Returning over the bridge with the honey' : 'Crossing the bridge and approaching the apiary';
          if (walk(s, route[cursor], cursor === route.length - 1 ? (stage === 'carrying' ? 1.5 : .45) : .7, `route-${stage}-${cursor}`)) { cursor++; idle = 0; }
        } else if (stage === 'learning') {
          // Wait outside the private stores. Approach only while Liz visibly faces her hives.
          const ready = q.patrol?.index === 0 && q.patrol?.wait >= 11;
          if (!finalApproach && ready && s.sneaking) finalApproach = true;
          if (!finalApproach) { intent = 'Waiting for Liz to turn toward her hives'; idle = 0; }
          else if (q.taking) { intent = 'Quietly lifting the honeycomb'; idle = 0; }
          else if (s.interaction?.id === CUB_HONEY_SOURCE && !q.visible && q.suspicion <= .25) {
            intent = 'Taking one comb while Liz looks away';
            if (interactClock >= config.interactEvery) { actions.push({ type: 'interact' }); interactClock = 0; }
          } else { intent = 'Sneaking behind the honey stores'; walk(s, HONEY_APPROACH, .18, 'hive'); }
        }
      }
    }
    for (const action of actions) act[action.type]?.(action);
    return { move, yaw, guard: false, actions, intent, goal };
  }
  return { start, stop, step, get active() { return active; }, get intent() { return intent; },
    get stopReason() { return stopReason; }, get reason() { return stopReason; }, get move() { return move; },
    get yaw() { return yaw; }, get guard() { return false; },
    onEvent(fn) { listeners.add(fn); return () => listeners.delete(fn); } };
}
