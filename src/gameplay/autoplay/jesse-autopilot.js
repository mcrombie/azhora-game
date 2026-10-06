import { moveInput } from './autopilot.js';
import { BODY, stepToward } from '../combat/bodies.js';
import { JESSE, CARRIAGE_PARTS } from '../../content/quests/jesse/jesse-carriage-world.js';
import { JESSE_QUEST, CARRIAGE_ASSEMBLY } from '../../content/quests/jesse/jesse-carriage-quest.js';

const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const point = value => value && Number.isFinite(value.x) && Number.isFinite(value.z);
const still = () => ({ forward: 0, side: 0, run: false });
const stages = ['available', 'collecting', 'assembling', 'ready', 'riding', 'arrived', 'entering', 'inside', 'coming-out', 'outside'];

/** Ordinary inputs for Jesse's workshop lesson. The host owns the initial F8
 * setup and all carriage/passenger movement; this controller never edits quest
 * state, grants cargo or experience, or advances the carriage itself.
 * read(): {mode,position,quest:jesseHost.state(),jesse:{x,z,available},combat,
 *   dialogue:{npcId,choices:[{id,enabled}]},interaction:{npcId,siteId},riding,sneaking}.
 * siteId names the interaction that F actually performs, after NPC priority.
 */
export function createJesseAutopilot({ world, read, act = {}, options = {} } = {}) {
  const config = { dialoguePace: 1.8, choicePace: 1.1, interactEvery: .7, idleLimit: 75, maxSeconds: 1800, ...options };
  const listeners = new Set(), probe = { x: 0, z: 0 };
  let active = false, intent = '', reason = '', move = still(), yaw = null;
  let elapsed = 0, idle = 0, speech = 0, touch = 0, stamp = '', dialogueStamp = '', previous = null;
  const notify = event => { for (const listener of listeners) listener(event); };
  function stop(text = 'Jesse autoplay stopped. You have control.', completed = false) {
    if (!active) return false;
    active = false; reason = text; intent = ''; move = still(); yaw = null;
    notify({ type: 'stop', reason: text, completed, questId: JESSE_QUEST.id }); return true;
  }
  function start() {
    if (active) return false;
    active = true; reason = ''; intent = 'Speaking with Jesse'; move = still(); yaw = null;
    elapsed = idle = speech = touch = 0; stamp = dialogueStamp = ''; previous = null;
    notify({ type: 'start', questId: JESSE_QUEST.id }); return true;
  }
  function walk(snapshot, target, radius) {
    const distance = gap(snapshot.position, target);
    if (distance <= radius) return;
    Object.assign(probe, snapshot.position);
    stepToward(probe, target, Math.min(.4, distance - radius), world, BODY.traveler);
    const dx = probe.x - snapshot.position.x, dz = probe.z - snapshot.position.z, length = Math.hypot(dx, dz);
    if (length > .001) {
      yaw = Math.atan2(-dx, -dz);
      move = { ...moveInput(yaw, dx / length, dz / length, false), basisYaw: yaw };
    }
  }
  function interact(snapshot, actions) {
    if ((!snapshot.combat?.action || snapshot.combat.action === 'idle') && touch >= config.interactEvery) {
      actions.push({ type: 'interact' }); touch = 0;
    }
  }
  function step(dt = 1 / 60) {
    if (!active) return null;
    move = still(); yaw = null;
    if (!Number.isFinite(dt) || dt <= 0) return null;
    dt = Math.min(dt, .25);
    const s = read(), actions = [];
    if (!s || !point(s.position) || !s.quest) { stop('Jesse autoplay could not read the quest.'); return null; }
    const q = s.quest, combat = s.combat ?? {};
    if (s.mode === 'defeated' || combat.hp <= 0) { stop('The traveler has fallen. Choose how to recover.'); return null; }
    if (combat.phase === 'active') { stop('A fight interrupted Jesse\'s lesson. You have control.'); return null; }
    if (!['playing', 'dialogue'].includes(s.mode)) {
      intent = 'Paused'; return { goal: 'wait', intent, move, yaw, guard: false, actions };
    }
    if (!stages.includes(q.stage)) { stop('Jesse\'s lesson cannot continue from here. You have control.'); return null; }
    if (['inside', 'coming-out', 'outside'].includes(q.stage)) {
      stop('Jesse\'s carriage lesson is complete. You reached the Carpenter\'s Guild; knock to speak with Jesse again.', true); return null;
    }
    if (!point(s.jesse) || s.jesse.available === false) { stop('Jesse is unavailable. You have control.'); return null; }
    if (['ready', 'riding', 'arrived', 'entering'].includes(q.stage) && !point(q.cart)) {
      stop('Jesse autoplay could not find the carriage. You have control.'); return null;
    }
    elapsed += dt; idle += dt; touch += dt;
    const progress = JSON.stringify([q.stage, q.collected, q.assembly, q.cart?.next, q.jesse?.next]);
    if (progress !== stamp || (previous && [
      [previous.position, s.position], [previous.cart, q.cart], [previous.jesse, q.jesse],
    ].some(([before, after]) => point(before) && point(after) && gap(before, after) > .015))) idle = 0;
    stamp = progress;
    previous = { position: { ...s.position }, cart: q.cart && { ...q.cart }, jesse: q.jesse && { ...q.jesse } };
    if (elapsed > config.maxSeconds || idle > config.idleLimit) { stop('Jesse autoplay could not make progress. You have control.'); return null; }
    const missing = CARRIAGE_PARTS.filter(part => !(q.collected ?? []).includes(part.id));
    let goal = 'talk', targetId = JESSE.id;
    if (s.mode === 'dialogue') {
      goal = 'dialogue'; intent = 'Listening to Jesse';
      if (s.dialogue?.npcId !== JESSE.id) { stop('Another conversation interrupted Jesse\'s lesson. You have control.'); return null; }
      const offered = s.dialogue.choices ?? [], choices = offered.filter(choice => choice.enabled !== false && choice.disabled !== true);
      const signature = `${q.stage}:${q.assembly}:${offered.map(choice => `${choice.id}:${choice.enabled !== false && choice.disabled !== true}`).join(',')}`;
      if (signature !== dialogueStamp) { speech = 0; dialogueStamp = signature; }
      speech += dt;
      if (offered.length && speech >= config.choicePace) {
        let wanted;
        if (q.stage === 'available') wanted = 'jesse-accept';
        else if (q.stage === 'collecting') wanted = missing.length ? 'jesse-leave' : 'jesse-timber-pine';
        else if (q.stage === 'assembling') wanted = `jesse-assemble-${CARRIAGE_ASSEMBLY[q.assembly]?.id}`;
        // The lesson finishes beside Jesse, too far from the cart to board.
        // Leave the conversation and physically walk to its boarding side first.
        else if (q.stage === 'ready') wanted = gap(s.position, q.cart) <= 6 ? 'jesse-board' : 'jesse-leave';
        if (!choices.some(choice => choice.id === wanted)) { stop('Jesse autoplay\'s expected reply is unavailable. You have control.'); return null; }
        actions.push({ type: 'choose', id: wanted }); speech = 0;
      } else if (!offered.length && speech >= config.dialoguePace) { actions.push({ type: 'continue' }); speech = 0; }
    } else {
      speech = 0; dialogueStamp = '';
      if (['riding', 'arrived', 'entering'].includes(q.stage)) {
        goal = 'wait'; targetId = null;
        intent = q.stage === 'riding' ? 'Riding to Ambron with Jesse' : 'Watching Jesse enter the Carpenter\'s Guild';
      } else if (s.riding?.mounted) {
        intent = 'Dismounting for Jesse\'s workshop';
        if (touch >= config.interactEvery) { actions.push({ type: 'dismount' }); touch = 0; }
      } else if (s.sneaking) {
        intent = 'Standing to help Jesse with the carriage';
        if (touch >= config.interactEvery) { actions.push({ type: 'toggleSneak' }); touch = 0; }
      } else if (q.stage === 'collecting' && missing.length) {
        goal = 'collect';
        const target = missing.sort((a, b) => gap(s.position, a) - gap(s.position, b))[0]; targetId = target.id;
        intent = `Collecting ${target.name.toLowerCase()}`;
        if (s.interaction?.siteId === target.id) interact(s, actions);
        else walk(s, target, Math.min(1.5, target.reach - .3));
      } else if (q.stage === 'ready') {
        goal = 'board'; targetId = 'jesse-board'; intent = 'Walking to the carriage for the ride to Ambron';
        if (s.interaction?.siteId === 'jesse-board') interact(s, actions);
        else walk(s, q.cart, 3.4);
      } else {
        intent = q.stage === 'available' ? 'Speaking with Jesse' : 'Returning to Jesse to assemble the carriage';
        if (s.interaction?.npcId === JESSE.id) {
          yaw = Math.atan2(s.position.x - s.jesse.x, s.position.z - s.jesse.z); interact(s, actions);
        } else walk(s, s.jesse, 1.3);
      }
    }
    for (const action of actions) act[action.type]?.(action);
    return { goal, targetId, intent, move, yaw, guard: false, actions };
  }
  return { start, stop, step, get active() { return active; }, get intent() { return intent; },
    get reason() { return reason; }, get stopReason() { return reason; }, get move() { return move; },
    get yaw() { return yaw; }, get guard() { return false; },
    onEvent(listener) { listeners.add(listener); return () => listeners.delete(listener); } };
}
