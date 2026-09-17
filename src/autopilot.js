/**
 * Autoplay: the computer walks the main quest while the player watches.
 *
 * Pure planning and steering with no DOM or render dependencies. Each frame the
 * host hands over a snapshot of the game and receives a command: where to walk,
 * where to look, and which of the ordinary player actions to perform (talk,
 * continue dialogue, choose a reply, swing, dodge, open the satchel). The
 * autopilot never teleports, edits quest state, or bypasses the game's own
 * rules; it presses the same buttons a person would. Any trusted input from the
 * person stops it (the host enforces that).
 */
import { canStand } from './game-state.js';

export const AUTOPILOT_VERSION = 1;
export const AUTOPILOT_DEFAULTS = Object.freeze({
  dialoguePace: 2.2,      // seconds a line stays up before the autopilot continues
  choicePace: 1.4,        // seconds before a reply is chosen
  interactEvery: .8,      // seconds between F presses
  swingEvery: .3,         // seconds between swing attempts
  stuckAfter: 1.6,        // seconds without progress before a detour
  idleLimit: 150,         // seconds without quest progress before giving up
  runBeyond: 6,           // metres from the goal beyond which the autopilot runs
});

/** Quest replies the autopilot will pick, most important first. */
export const CHOICE_PRIORITY = Object.freeze([
  'meet-courier', 'return-courier', 'meet-crossing-keeper', 'return-crossing-keeper', 'meet-ridge-keeper', 'deliver-report',
  'accept-lauvel-search', 'return-courier-satchel',
  'hollis-repair-wood',
]);
const LEAVE_PATTERN = /^(leave|back|until|done|goodbye)/i;

const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const angleTo = (from, to) => Math.atan2(-(to.x - from.x), -(to.z - from.z)); // camera yaw that faces `to`
const wrap = angle => Math.atan2(Math.sin(angle), Math.cos(angle));

/** Camera-relative movement input that walks the character along a world direction. */
export function moveInput(yaw, dx, dz, run = false) {
  const length = Math.hypot(dx, dz);
  if (length < 1e-6) return { forward: 0, side: 0, run: false };
  const ux = dx / length, uz = dz / length;
  // Host movement: world = (-sin(yaw)*forward + cos(yaw)*side, -cos(yaw)*forward - sin(yaw)*side).
  const forward = -(ux * Math.sin(yaw) + uz * Math.cos(yaw));
  const side = ux * Math.cos(yaw) - uz * Math.sin(yaw);
  return { forward, side, run };
}

/** Index of the polyline vertex nearest a point. */
export function nearestVertex(path, point) {
  let best = 0, bestDistance = Infinity;
  for (let i = 0; i < path.length; i++) {
    const d = distance(path[i], point);
    if (d < bestDistance) { bestDistance = d; best = i; }
  }
  return { index: best, distance: bestDistance };
}

/**
 * Where to head next. Long trips follow the main trail (the first authored
 * path, which runs from the landing up the whole northern road); short hops and
 * the last stretch go straight, sliding around anything in the way.
 */
export function nextWaypoint(position, target, world, memory = {}) {
  const trail = world.paths?.[0] ?? [];
  if (trail.length > 1) {
    const here = nearestVertex(trail, position), there = nearestVertex(trail, target);
    const alongTrail = Math.abs(there.index - here.index) >= 2 && here.distance < 14 && there.distance < 14;
    if (alongTrail) {
      const step = Math.sign(there.index - here.index);
      let index = here.index;
      // Do not walk back to the vertex behind us; aim one ahead, and skip a vertex we are already beside.
      if (distance(trail[index], position) < 1.4 || (index !== there.index && isBehind(position, trail[index], trail[index + step]))) index += step;
      index = step > 0 ? Math.min(index, there.index) : Math.max(index, there.index);
      if (index !== there.index) return { point: trail[index], onTrail: true };
    }
    // The destination sits on the road but the traveler has strayed off it —
    // onto a river bank, say. Walk back to the road before trying again, rather
    // than grinding against whatever stands between here and there.
    if (!alongTrail && there.distance < 7 && here.distance > 2.5 && here.distance < 26 && !clearLine(position, target, world))
      return { point: trail[here.index], onTrail: true };
  }
  return { point: target, onTrail: false };
}

/** Whether a straight walk from `from` to `to` stays on standable ground. */
export function clearLine(from, to, world, radius = .42) {
  const steps = Math.max(1, Math.ceil(distance(from, to) / .6));
  for (let step = 1; step <= steps; step++) {
    const t = step / steps;
    if (!canStand(from.x + (to.x - from.x) * t, from.z + (to.z - from.z) * t, world, radius)) return false;
  }
  return true;
}

function isBehind(position, vertex, next) {
  if (!next) return false;
  const ax = next.x - vertex.x, az = next.z - vertex.z, bx = position.x - vertex.x, bz = position.z - vertex.z;
  return ax * bx + az * bz > 0;
}

/** A free direction toward `point`, trying wider angles when the straight line is blocked. */
export function freeDirection(position, point, world, preferredSide = 1) {
  const dx = point.x - position.x, dz = point.z - position.z, length = Math.hypot(dx, dz);
  if (length < 1e-6) return { x: 0, z: 0 };
  const base = Math.atan2(dx, dz);
  const probe = 1.1;
  for (const offset of [0, .5, -.5, 1.0, -1.0, 1.5, -1.5, 2.1, -2.1]) {
    const angle = base + offset * preferredSide;
    const ux = Math.sin(angle), uz = Math.cos(angle);
    if (canStand(position.x + ux * probe, position.z + uz * probe, world) && canStand(position.x + ux * probe * .5, position.z + uz * probe * .5, world))
      return { x: ux, z: uz };
  }
  return { x: Math.sin(base), z: Math.cos(base) };
}

/** Which reply to give in the open conversation, if any. */
export function chooseReply(choices, snapshot) {
  const enabled = choices.filter(choice => choice.enabled !== false);
  if (!enabled.length) return null;
  const wanted = new Set([...(snapshot.journey?.actions ?? []), ...(snapshot.luscia?.actions ?? [])]
    .filter(action => action.enabled).map(action => action.id));
  for (const id of CHOICE_PRIORITY) {
    if (id === 'hollis-repair-wood' && (snapshot.inventory?.sticks ?? 0) >= 3) continue;
    if (enabled.some(choice => choice.id === id) && (wanted.has(id) || id === 'hollis-repair-wood')) return id;
  }
  return enabled.find(choice => LEAVE_PATTERN.test(choice.id) || LEAVE_PATTERN.test(choice.label ?? ''))?.id ?? enabled[enabled.length - 1].id;
}

/** The combat decision for one frame. */
export function fightCommand(snapshot) {
  const { position, combat } = snapshot;
  const enemies = combat.enemies.filter(enemy => enemy.active !== false && enemy.action !== 'dead');
  if (!enemies.length) return { intent: 'Catching a breath', move: null, yaw: null, actions: [] };
  enemies.sort((a, b) => distance(position, a) - distance(position, b));
  const nearest = enemies[0], gap = distance(position, nearest);
  const yaw = angleTo(position, nearest);
  const threat = enemies.find(enemy => (enemy.action === 'windup' && enemy.progress >= .45 && distance(position, enemy) < 3.4)
    || (enemy.action === 'attack' && enemy.progress < .45 && distance(position, enemy) < 2.9));
  if (threat && combat.action !== 'dodge' && combat.stamina >= 25) {
    // Step aside, across the line of the strike.
    const tx = threat.x - position.x, tz = threat.z - position.z, length = Math.hypot(tx, tz) || 1;
    return { intent: 'Dodging a strike', move: null, yaw, actions: [{ type: 'dodge', x: -tz / length, z: tx / length }] };
  }
  if (combat.action === 'idle' && gap <= 2.3 && combat.stamina >= 6)
    return { intent: 'Striking', move: null, yaw, actions: [{ type: 'attack', yaw: Math.atan2(nearest.x - position.x, nearest.z - position.z) }] };
  if (gap > 2.0 && combat.action === 'idle') {
    const dx = nearest.x - position.x, dz = nearest.z - position.z;
    return { intent: 'Closing on a raider', move: moveInput(yaw, dx, dz, false), yaw, actions: [] };
  }
  return { intent: 'Waiting for an opening', move: null, yaw, actions: [] };
}

/** The current goal of the main quest, from the tutorial through the road out of Drent. */
export function planGoal(snapshot, world) {
  const { mode, questStage, journey } = snapshot;
  if (mode === 'opening') return { kind: 'begin', intent: 'Stepping ashore' };
  if (mode === 'arriving') return { kind: 'wait', intent: 'Coming ashore' };
  if (mode === 'defeated') return { kind: 'retry', intent: 'Getting back up' };
  if (mode === 'dialogue') return { kind: 'dialogue', intent: 'Talking' };
  if (mode === 'inventory') return questStage === 6 ? { kind: 'inspect-letter', intent: 'Reading Mara’s message' } : { kind: 'close-inventory', intent: 'Closing the satchel' };
  if (mode !== 'playing') return { kind: 'wait', intent: 'Paused' };
  if (snapshot.combat.phase === 'active') return { kind: 'fight', intent: 'Fighting' };
  if (!snapshot.weapon.usable) {
    if ((snapshot.inventory.sticks ?? 0) > 0) return { kind: 'equip', item: 'forest-stick', intent: 'Readying a spare stick' };
    const bench = nearestOf(world.repairBenches ?? [], snapshot.position);
    if (bench) return { kind: 'use', target: bench, radius: 1.6, check: 'nearRepair', intent: 'Finding a repair bench' };
  }
  if (snapshot.combat.hp < 40) {
    if (snapshot.inventory.cookedFish > 0) return { kind: 'eat', item: 'cooked-fish', intent: 'Eating' };
    if (snapshot.inventory.pawpaws > 0) return { kind: 'eat', item: 'pawpaw', intent: 'Eating' };
  }
  const npc = id => world.npcPositions[id];
  switch (questStage) {
    case 0: return { kind: 'talk', target: npc('harbormaster'), npcId: 'harbormaster', intent: 'Walking up from the landing to Mara' };
    case 1: return { kind: 'talk', target: npc('harbormaster'), npcId: 'harbormaster', intent: 'Speaking with Mara' };
    case 2: return { kind: 'practice', target: world.training, intent: snapshot.practiceHits < 2 ? 'Practising at the straw post' : 'Practising a dodge' };
    // The ambush clearing on the Greenway, a little past the warning bell.
    case 3: return { kind: 'walk', target: world.encounter ?? { x: -58, z: 29 }, radius: 2.5, intent: 'Following the Greenway to the bell' };
    case 4: return { kind: 'walk', target: world.encounter ?? { x: -58, z: 29 }, radius: 2.5, intent: 'Returning to the bell' };
    case 5: return { kind: 'talk', target: npc('warden'), npcId: 'warden', intent: 'Reporting to Eren' };
    case 6: return { kind: 'open-inventory', intent: 'Opening the satchel' };
    case 7: return { kind: 'close-inventory', intent: 'Closing the satchel' };
    case 8: return { kind: 'walk', target: world.northTrail, radius: 4, intent: 'Walking to Fernway Rest' };
    case 9: return { kind: 'walk', target: world.border, radius: 3.5, intent: 'Walking to the forest boundary' };
    default: break;
  }
  if (!journey?.started) return { kind: 'walk', target: world.border, radius: 3.5, intent: 'Walking to the forest boundary' };
  if (journey.complete) return lusciaGoal(snapshot, world);
  if (journey.stage === 'repair-bridge' && (snapshot.inventory.sticks ?? 0) < 3) {
    const site = nearestOf((world.stickSites ?? []).filter(site => !site.collected), snapshot.position);
    if (site) return { kind: 'use', target: site, radius: 1.5, siteId: site.id, intent: 'Gathering driftwood' };
    return { kind: 'talk', target: npc('crossing-keeper'), npcId: 'crossing-keeper', intent: 'Asking Hollis for timber' };
  }
  const id = journey.destinationIds?.[0];
  if (!id) return { kind: 'done', intent: 'Nothing left on the road' };
  if (world.npcPositions[id]) return { kind: 'talk', target: world.npcPositions[id], npcId: id, intent: `Speaking with ${world.npcNames?.[id] ?? id}` };
  if (world.journeySites?.[id]) return { kind: 'use', target: world.journeySites[id], radius: 1.5, siteId: id, intent: `Heading to ${world.journeySites[id].name ?? id}` };
  if (id === 'border') return { kind: 'walk', target: world.border, radius: 3.5, intent: 'Walking to the forest boundary' };
  return { kind: 'wait', intent: 'Looking for the next step' };
}

/**
 * The Luscia chapter, once the road out of Drent is filed: the clerk on Lumber
 * Town's square, the courier's satchel at the Lauvel, the wolves that come off
 * the burial line (the ordinary fight policy handles those), and back again.
 */
export function lusciaGoal(snapshot, world) {
  const luscia = snapshot.luscia;
  if (!luscia?.destinationIds?.length || luscia.complete)
    return { kind: 'done', intent: luscia?.complete ? 'The field at the Lauvel is settled' : 'The road out of Drent is done',
      reason: luscia?.complete ? 'The field at the Lauvel is settled and the Legion owes you a horse. The Moros camp is the next chapter, and it is not built yet.' : null };
  const id = luscia.destinationIds[0];
  if (world.npcPositions?.[id])
    return { kind: 'talk', target: world.npcPositions[id], npcId: id, intent: `Speaking with ${world.npcNames?.[id] ?? id}` };
  const site = world.lusciaSites?.[id];
  if (site) return { kind: 'use', target: site, radius: 1.5, siteId: id, intent: `Searching ${site.name ?? id}` };
  return { kind: 'wait', intent: 'Looking for the next step in Luscia' };
}

function nearestOf(points, position) {
  let best = null, bestDistance = Infinity;
  for (const point of points) { const d = distance(point, position); if (d < bestDistance) { bestDistance = d; best = point; } }
  return best;
}

/**
 * The autopilot itself. `read()` returns the snapshot; `act` carries out
 * commands; `step(dt)` runs once per rendered frame while active.
 */
export function createAutopilot({ world, read, act, options = {} } = {}) {
  const config = { ...AUTOPILOT_DEFAULTS, ...options };
  let active = false, intent = '', reason = '', lastYaw = null, move = { forward: 0, side: 0, run: false };
  let timers = { dialogue: 0, interact: 0, swing: 0, idle: 0, stuck: 0 };
  let progressKey = '', bestDistance = Infinity, detour = 0, detourSide = 1, stopReason = '';
  const listeners = new Set();
  const notify = event => { for (const listener of listeners) listener(event); };

  function start() {
    if (active) return false;
    active = true; stopReason = ''; timers = { dialogue: 0, interact: 0, swing: 0, idle: 0, stuck: 0 };
    progressKey = ''; bestDistance = Infinity; detour = 0; move = { forward: 0, side: 0, run: false }; lastYaw = null;
    notify({ type: 'start' });
    return true;
  }

  function stop(why = 'stopped') {
    if (!active) return false;
    active = false; stopReason = why; move = { forward: 0, side: 0, run: false }; lastYaw = null; intent = '';
    notify({ type: 'stop', reason: why });
    return true;
  }

  function walkToward(snapshot, target, radius) {
    const position = snapshot.position;
    const gap = distance(position, target);
    if (gap <= radius) { move = { forward: 0, side: 0, run: false }; return true; }
    const waypoint = nextWaypoint(position, target, world);
    let direction = freeDirection(position, waypoint.point, world, detourSide);
    if (detour > 0) {
      // Swap to a sidestep for a moment when progress has stalled.
      direction = { x: direction.z * detourSide, z: -direction.x * detourSide };
      if (!canStand(position.x + direction.x, position.z + direction.z, world)) direction = { x: -direction.x, z: -direction.z };
    }
    const yaw = Math.atan2(-direction.x, -direction.z);
    lastYaw = yaw;
    move = moveInput(yaw, direction.x, direction.z, gap > config.runBeyond);
    return false;
  }

  function trackProgress(snapshot, key, gap, dt) {
    if (key !== progressKey) { progressKey = key; bestDistance = gap; timers.stuck = 0; timers.idle = 0; detour = 0; return; }
    if (gap < bestDistance - .05) { bestDistance = gap; timers.stuck = 0; }
    else timers.stuck += dt;
    if (detour > 0) detour -= dt;
    else if (timers.stuck > config.stuckAfter) { detour = .9; detourSide = -detourSide; timers.stuck = 0; }
  }

  function step(dt = 1 / 60) {
    if (!active) return null;
    const snapshot = read();
    if (!snapshot) return null;
    timers.dialogue += dt; timers.interact += dt; timers.swing += dt; timers.idle += dt;
    const goal = planGoal(snapshot, world);
    intent = goal.intent;
    const actions = [];
    lastYaw = null; move = { forward: 0, side: 0, run: false };
    const key = `${snapshot.questStage}:${goal.kind}:${goal.npcId ?? goal.siteId ?? ''}:${snapshot.journey?.stage ?? ''}`;
    if (key !== progressKey) timers.idle = 0;
    switch (goal.kind) {
      case 'begin': actions.push({ type: 'begin' }); timers.idle = 0; break;
      case 'retry': actions.push({ type: 'retry' }); timers.idle = 0; break;
      case 'wait': break;
      case 'done': stop(goal.reason || 'The road out of Drent is finished. Luscia is the next chapter, and it is not built yet.'); return null;
      case 'dialogue': {
        const dialogue = snapshot.dialogue;
        if (dialogue?.choices?.length) {
          if (timers.dialogue >= config.choicePace) { const id = chooseReply(dialogue.choices, snapshot); if (id) { actions.push({ type: 'choose', id }); timers.dialogue = 0; timers.idle = 0; } }
        } else if (timers.dialogue >= config.dialoguePace) { actions.push({ type: 'continue' }); timers.dialogue = 0; timers.idle = 0; }
        break;
      }
      case 'inspect-letter': if (timers.interact >= config.interactEvery) { actions.push({ type: 'select-item', id: 'harbor-letter' }); timers.interact = 0; } break;
      case 'open-inventory': if (timers.interact >= config.interactEvery) { actions.push({ type: 'open-inventory' }); timers.interact = 0; } break;
      case 'close-inventory': if (timers.interact >= config.interactEvery) { actions.push({ type: 'close-inventory' }); timers.interact = 0; } break;
      case 'equip': actions.push({ type: 'equip', id: goal.item }); break;
      case 'eat': if (timers.interact >= config.interactEvery) { actions.push({ type: 'eat', id: goal.item }); timers.interact = 0; } break;
      case 'fight': {
        const command = fightCommand(snapshot);
        intent = command.intent; lastYaw = command.yaw; if (command.move) move = command.move;
        for (const action of command.actions) {
          if (action.type === 'attack') { if (timers.swing >= config.swingEvery) { actions.push(action); timers.swing = 0; } }
          else actions.push(action);
        }
        timers.idle = 0;
        break;
      }
      case 'walk': {
        const arrived = walkToward(snapshot, goal.target, goal.radius ?? 2);
        trackProgress(snapshot, key, distance(snapshot.position, goal.target), dt);
        if (arrived && goal.radius) lastYaw = null;
        break;
      }
      case 'talk':
      case 'use': {
        const target = goal.target, gap = distance(snapshot.position, target);
        const ready = goal.kind === 'talk' ? snapshot.interaction?.npcId === goal.npcId
          : goal.siteId ? snapshot.interaction?.siteId === goal.siteId : goal.check ? !!snapshot.interaction?.[goal.check] : gap <= (goal.radius ?? 1.5);
        if (ready && snapshot.combat.action === 'idle') {
          move = { forward: 0, side: 0, run: false }; lastYaw = angleTo(snapshot.position, target);
          if (timers.interact >= config.interactEvery) { actions.push({ type: 'interact' }); timers.interact = 0; }
        } else {
          // Approach until the game offers the F prompt; inch closer if it has not.
          const radius = gap <= (goal.radius ?? 1.9) && !ready ? Math.max(.6, (goal.radius ?? 1.9) - .8) : (goal.radius ?? 1.9);
          walkToward(snapshot, target, radius);
        }
        trackProgress(snapshot, key, gap, dt);
        break;
      }
      case 'practice': {
        const gap = distance(snapshot.position, goal.target);
        if (gap > 1.9) { walkToward(snapshot, goal.target, 1.9); trackProgress(snapshot, key, gap, dt); break; }
        lastYaw = angleTo(snapshot.position, goal.target);
        if (snapshot.practiceHits < 2) {
          if (snapshot.combat.action === 'idle' && snapshot.combat.stamina >= 6 && timers.swing >= config.swingEvery) {
            actions.push({ type: 'attack', yaw: Math.atan2(goal.target.x - snapshot.position.x, goal.target.z - snapshot.position.z) }); timers.swing = 0;
          }
        } else if (snapshot.practiceDodges < 1 && snapshot.combat.action === 'idle' && snapshot.combat.stamina >= 25) {
          const dx = goal.target.x - snapshot.position.x, dz = goal.target.z - snapshot.position.z, length = Math.hypot(dx, dz) || 1;
          actions.push({ type: 'dodge', x: -dz / length, z: dx / length });
        }
        timers.idle = 0;
        break;
      }
      default: break;
    }
    if (timers.idle > config.idleLimit) { stop('Autoplay could not find the way forward. You have control.'); return null; }
    for (const action of actions) act?.[action.type]?.(action);
    return { goal: goal.kind, intent, move, yaw: lastYaw, actions };
  }

  return {
    start, stop, step,
    configure(overrides = {}) { Object.assign(config, overrides); return { ...config }; },
    get active() { return active; },
    get intent() { return intent; },
    get move() { return move; },
    get yaw() { return lastYaw; },
    get stopReason() { return stopReason; },
    get reason() { return reason; },
    onEvent(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  };
}
