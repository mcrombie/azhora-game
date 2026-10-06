import { moveInput } from './autopilot.js';
import { BODY, stepToward } from '../combat/bodies.js';
import { LOCOMOTION } from '../movement/locomotion-skills.js';
import { BALDRO_KINGDOMS, BALDRO_PATHS } from '../../content/regions/baldro/baldro-world.js';
import { createBaldroInteriorWalk } from '../../content/regions/baldro/baldro-interiors.js';

const QUEST_ID = 'dwarf-introduction';
const WEST = BALDRO_KINGDOMS[0];
const APPROACH = BALDRO_PATHS.find(path => path.id === 'west-baldro-approach').points;
const stages = ['unoffered', 'service', 'report', 'enter', 'smith', 'forge', 'reward', 'complete'];
const point = p => p && Number.isFinite(p.x) && Number.isFinite(p.z);
const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const still = () => ({ forward: 0, side: 0, run: false });

// These connect the actual doors and clear aisles, including the detour around
// the workshop benches. The visibility checks below use the same interior
// collision geometry as manual walking, and also permit resuming in a side room.
const indoorNodes = [
  [0, 27], [0, 14], [0, 0], [13, 0], [22, 0], [22, 4.8], [29, 4.8], [26, 5.8], [31, -3], [34, -3],
  [-13, 0], [-22, 0], [-31, 0], [-31, -12], [-31, -25], [-31, -34], [-25, -34], [-41, -34],
  [0, -16], [0, -28], [0, -40], [6, -43], [-6, -43],
];
const walks = new Map(BALDRO_KINGDOMS.map(kingdom => [kingdom.id, createBaldroInteriorWalk(kingdom)]));

function projection(position, path) {
  let best = null;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i], dx = b.x - a.x, dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((position.x - a.x) * dx + (position.z - a.z) * dz) / (dx * dx + dz * dz || 1)));
    const at = { x: a.x + dx * t, z: a.z + dz * t }, distance = gap(position, at);
    if (!best || distance < best.distance) best = { at, distance, progress: i - 1 + t };
  }
  return best;
}

function exteriorRoute(start, target) {
  // Join and leave a segment at its projection. Walking to the final polyline
  // vertex would otherwise steer a guard conversation into the closed gate.
  const from = projection(start, APPROACH), to = projection(target, APPROACH), route = [];
  if (gap(start, target) < 10) return [{ ...target }];
  if (from.distance > 1) route.push(from.at);
  if (from.progress <= to.progress) {
    for (let i = Math.floor(from.progress) + 1; i <= Math.floor(to.progress); i++) route.push(APPROACH[i]);
  } else {
    for (let i = Math.ceil(from.progress) - 1; i >= Math.ceil(to.progress); i--) route.push(APPROACH[i]);
  }
  route.push(to.at, { ...target });
  return route;
}

function indoorRoute(city, start, target) {
  const walk = walks.get(city);
  if (!walk) return null;
  const clear = (a, b) => {
    const steps = Math.max(1, Math.ceil(gap(a, b) / .22));
    for (let i = 1; i <= steps; i++) if (!walk.canStand(a.x + (b.x - a.x) * i / steps, a.z + (b.z - a.z) * i / steps)) return false;
    return true;
  };
  if (clear(start, target)) return [{ ...target }];
  const nodes = [start, ...indoorNodes.map(([x, z]) => walk.toWorld({ x, z })).filter(p => walk.canStand(p.x, p.z)), target];
  const last = nodes.length - 1, cost = nodes.map(() => Infinity), previous = nodes.map(() => -1), visited = new Set();
  cost[0] = 0;
  while (visited.size < nodes.length) {
    let here = -1;
    for (let i = 0; i < nodes.length; i++) if (!visited.has(i) && (here === -1 || cost[i] < cost[here])) here = i;
    if (here < 0 || !Number.isFinite(cost[here])) return null;
    if (here === last) break;
    visited.add(here);
    for (let next = 0; next < nodes.length; next++) {
      if (visited.has(next)) continue;
      const distance = gap(nodes[here], nodes[next]);
      if (distance > 45 || cost[here] + distance >= cost[next] || !clear(nodes[here], nodes[next])) continue;
      cost[next] = cost[here] + distance; previous[next] = here;
    }
  }
  const route = [];
  for (let index = last; index > 0; index = previous[index]) {
    if (index < 0) return null;
    route.unshift(nodes[index]);
  }
  return route;
}

function matchingInteraction(interaction, target) {
  if (!interaction || !target) return false;
  const id = interaction.personId ?? interaction.siteId ?? interaction.id;
  if (target.kind === 'exit') return interaction.kind === 'exit';
  if (target.kind === 'gate') return interaction.kind === 'gate' && (!id || id === WEST.id || id === target.id);
  return interaction.kind === target.kind && id === target.id;
}

/** A Place at the Forge, performed with ordinary walking, F and dialogue.
 * read(): {mode,position,quest:host.introductionView(),inside:host.current,
 * interaction:{kind,id,personId,siteId},dialogue:{npcId,choices},combat,riding,sneaking}.
 * The host supplies a safe stand in quest.target, even when a checkpoint resumes
 * a later workshop stage outside the gate. No quest mutation or portal action
 * is available to this controller: entering must happen through normal F/menus.
 */
export function createDwarfAutopilot({ world, read, act = {}, options = {} } = {}) {
  const config = { dialoguePace: 1.7, choicePace: 1, interactEvery: .8, forgeEvery: 1.6, idleLimit: 35, maxSeconds: 600, ...options };
  const listeners = new Set(), probe = {};
  let active = false, intent = '', reason = '', move = still(), yaw = null;
  let elapsed = 0, idle = 0, speech = 0, touch = 0, stamp = '', dialogueStamp = '', previous = null, routeStamp = '', route = [];
  const notify = event => { for (const listener of listeners) listener(event); };
  function stop(message = 'Dwarfland autoplay stopped. You have control.', completed = false) {
    if (!active) return false;
    active = false; reason = message; intent = ''; move = still(); yaw = null;
    notify({ type: 'stop', reason: message, completed, questId: QUEST_ID }); return true;
  }
  function start() {
    if (active) return false;
    active = true; reason = ''; intent = 'Approaching the West Hold gatekeeper'; move = still(); yaw = null;
    elapsed = idle = speech = touch = 0; stamp = dialogueStamp = routeStamp = ''; previous = null; route = [];
    notify({ type: 'start', questId: QUEST_ID }); return true;
  }
  function walk(s, target, dt) {
    const city = typeof s.inside === 'string' ? s.inside : s.quest.currentCity;
    const key = `${city ?? 'outside'}:${target.id}:${target.x}:${target.z}`;
    if (key !== routeStamp) {
      route = city ? indoorRoute(city, s.position, target) : exteriorRoute(s.position, target);
      routeStamp = key;
      if (!route?.length) { stop('The route through the dwarf hall is blocked. You have control.'); return; }
    }
    while (route.length > 1 && gap(s.position, route[0]) < .5) route.shift();
    const aim = route[0], distance = gap(s.position, aim), final = route.length === 1, radius = final ? .12 : .25;
    if (distance <= radius) return;
    let dx = aim.x - s.position.x, dz = aim.z - s.position.z;
    if (!city) {
      Object.assign(probe, s.position);
      stepToward(probe, aim, Math.min(.4, distance - radius), world, BODY.traveler);
      dx = probe.x - s.position.x; dz = probe.z - s.position.z;
    }
    const length = Math.hypot(dx, dz);
    if (length <= .001) return;
    yaw = Math.atan2(-dx, -dz);
    const run = !city && distance > 6, strength = Math.min(1, (distance - radius) / ((run ? s.movementSpeeds?.running ?? LOCOMOTION.runStart : s.movementSpeeds?.walking ?? LOCOMOTION.walkStart) * dt));
    const input = moveInput(yaw, dx / length, dz / length, run);
    move = { forward: input.forward * strength, side: input.side * strength, run, basisYaw: yaw };
  }
  function step(dt = 1 / 60) {
    if (!active) return null;
    move = still(); yaw = null;
    if (!Number.isFinite(dt) || dt <= 0) return null;
    dt = Math.min(dt, .25);
    const s = read(), actions = [];
    if (!s || !point(s.position) || !s.quest || !stages.includes(s.quest.stage)) { stop('Dwarfland autoplay could not read the introduction.'); return null; }
    const q = s.quest;
    if (s.mode === 'defeated' || s.combat?.hp <= 0) { stop('The traveler has fallen. Choose how to recover.'); return null; }
    if (s.combat?.phase === 'active') { stop('A fight interrupted the dwarf introduction. You have control.'); return null; }
    if (!['playing', 'dialogue'].includes(s.mode)) { intent = 'Paused'; return { goal: 'wait', intent, move, yaw, guard: false, actions }; }
    if (q.complete && s.mode !== 'dialogue') { stop('A Place at the Forge is complete. You earned entry and learned your first Dwarven Smithing technique.', true); return null; }
    elapsed += dt; idle += dt; touch += dt;
    const progress = JSON.stringify([q.stage, q.forgeStep, q.repaired, q.currentCity]);
    if (progress !== stamp || (previous && gap(previous, s.position) > .015)) idle = 0;
    stamp = progress; previous = { ...s.position };
    if (elapsed > config.maxSeconds || idle > config.idleLimit) { stop('Dwarfland autoplay could not make progress. You have control.'); return null; }
    let goal = q.stage;
    if (s.mode === 'dialogue') {
      goal = 'dialogue';
      const speaker = s.dialogue?.npcId;
      if (!/^west-baldro-(?:guard-[01]|smith)$/.test(speaker ?? '')) { stop('Another conversation interrupted the dwarf introduction. You have control.'); return null; }
      intent = speaker.endsWith('smith') ? 'Learning from the hold artisan' : 'Speaking with the West Hold gatekeeper';
      const offered = s.dialogue?.choices ?? [], choices = offered.filter(c => c.enabled !== false && c.disabled !== true);
      const signature = `${speaker}:${q.stage}:${offered.map(c => `${c.id}:${c.enabled !== false && c.disabled !== true}`).join(',')}`;
      if (signature !== dialogueStamp) { speech = 0; dialogueStamp = signature; }
      speech += dt;
      if (offered.length && speech >= config.choicePace) {
        const artisan = speaker.endsWith('smith');
        const expected = artisan ? (['unoffered', 'enter', 'smith'].includes(q.stage) ? 'lesson' : q.stage === 'reward' ? 'lesson-finish' : 'lesson-leave')
          : ({ unoffered: 'intro-accept', report: 'report', enter: 'enter' }[q.stage] ?? 'leave');
        const wanted = `west-baldro-${expected}`;
        // Re-entering after a saved workshop stage uses the guard's earned-entry
        // reply, never the smith's instruction or reward choice.
        const id = speaker.includes('-guard-') && ['smith', 'forge', 'reward'].includes(q.stage) ? 'west-baldro-enter' : wanted;
        if (!choices.some(c => c.id === id)) { stop('The expected dwarf reply is unavailable. You have control.'); return null; }
        actions.push({ type: 'choose', id }); speech = 0; idle = 0;
      } else if (!offered.length && speech >= config.dialoguePace) { actions.push({ type: 'continue' }); speech = 0; idle = 0; }
    } else {
      speech = 0; dialogueStamp = '';
      if (s.riding?.mounted || s.sneaking) {
        intent = s.riding?.mounted ? 'Dismounting at the dwarf gate' : 'Standing to meet the dwarves';
        if (touch >= config.interactEvery) { actions.push({ type: s.riding?.mounted ? 'dismount' : 'toggleSneak' }); touch = 0; }
      } else {
        const target = q.target;
        if (!point(target)) { stop('Dwarfland autoplay could not find the next task. You have control.'); return null; }
        intent = target.kind === 'exit' ? 'Returning to the West Hold approach' : target.kind === 'gate' ? 'Entering West Hold through its guarded door'
          : q.stage === 'service' ? 'Restoring the dwarf wayfinding cairns' : q.stage === 'report' ? 'Reporting the restored approach'
            : q.stage === 'smith' ? 'Walking to the hold workshop' : q.stage === 'forge' ? ['Heating the repair rivet', 'Fitting and peening the rivet', 'Quenching the finished joint'][q.forgeStep ?? 0]
              : q.stage === 'reward' ? 'Showing the repaired joint to the artisan' : 'Meeting the West Hold gatekeeper';
        if (matchingInteraction(s.interaction, target)) {
          yaw = Math.atan2(s.position.x - target.x, s.position.z - target.z);
          const pace = target.kind === 'forge' ? config.forgeEvery : config.interactEvery;
          if ((!s.combat?.action || s.combat.action === 'idle') && touch >= pace) { actions.push({ type: 'interact' }); touch = 0; }
        } else walk(s, target, dt);
      }
    }
    for (const action of actions) act[action.type]?.(action);
    return { goal, targetId: q.target?.id, intent, move, yaw, guard: false, actions };
  }
  return { start, stop, step, get active() { return active; }, get intent() { return intent; },
    get reason() { return reason; }, get stopReason() { return reason; }, get move() { return move; },
    get yaw() { return yaw; }, get guard() { return false; },
    onEvent(listener) { listeners.add(listener); return () => listeners.delete(listener); } };
}
