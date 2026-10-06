import { moveInput } from './autopilot.js';
import { BODY, stepToward } from '../combat/bodies.js';
import { ARI, SUNFLOWER_ROWS } from '../../content/quests/ari/ari-garden.js';
import { SUNFLOWER_QUEST_ID } from '../../content/quests/skill-lessons/sunflower-lesson.js';

const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const point = p => p && Number.isFinite(p.x) && Number.isFinite(p.z);
const still = () => ({ forward: 0, side: 0, run: false });
const stages = ['offered', 'plant', 'water', 'growing', 'harvest', 'report', 'complete'];

/** Ari's ordinary gardening inputs. The host resets only her lesson and its two
 * beds for an F8 start. This pilot never grants seeds/XP, moves a character,
 * changes farming state, or accelerates the active-play crop clock.
 * read(): { mode, position, quest:lesson.view(clock), beds:[rowState], ari,
 *   interaction:{npcId,rowId}, dialogue:{npcId,choices}, combat,riding,sneaking }.
 */
export function createAriAutopilot({ world, read, act = {}, options = {} } = {}) {
  const config = { dialoguePace: 1.8, choicePace: 1.1, interactEvery: .7, idleLimit: 50, maxSeconds: 480, ...options };
  const listeners = new Set(), probe = {};
  let active = false, intent = '', reason = '', move = still(), yaw = null;
  let elapsed = 0, idle = 0, speech = 0, touch = 0, stamp = '', dialogueStamp = '', previous = null;
  const notify = event => { for (const listener of listeners) listener(event); };
  function stop(text = 'Ari autoplay stopped. You have control.', completed = false) {
    if (!active) return false;
    active = false; reason = text; intent = ''; move = still(); yaw = null;
    notify({ type: 'stop', reason: text, completed, questId: SUNFLOWER_QUEST_ID }); return true;
  }
  function start() {
    if (active) return false;
    active = true; reason = ''; intent = 'Speaking with Ari'; move = still(); yaw = null;
    elapsed = idle = speech = touch = 0; stamp = dialogueStamp = ''; previous = null;
    notify({ type: 'start', questId: SUNFLOWER_QUEST_ID }); return true;
  }
  function walk(s, target, radius) {
    const distance = gap(s.position, target);
    if (distance <= radius) return;
    Object.assign(probe, s.position);
    stepToward(probe, target, Math.min(.4, distance - radius), world, BODY.traveler);
    const dx = probe.x - s.position.x, dz = probe.z - s.position.z, length = Math.hypot(dx, dz);
    if (length > .001) {
      yaw = Math.atan2(-dx, -dz);
      move = { ...moveInput(yaw, dx / length, dz / length, false), basisYaw: yaw };
    }
  }
  function interact(s, actions) {
    if ((!s.combat?.action || s.combat.action === 'idle') && touch >= config.interactEvery) {
      actions.push({ type: 'interact' }); touch = 0;
    }
  }
  function step(dt = 1 / 60) {
    if (!active) return null;
    move = still(); yaw = null;
    if (!Number.isFinite(dt) || dt <= 0) return null;
    dt = Math.min(dt, .25);
    const s = read(), actions = [];
    if (!s || !point(s.position) || !s.quest || !stages.includes(s.quest.stage)) { stop('Ari autoplay could not read the lesson.'); return null; }
    const q = s.quest;
    if (s.mode === 'defeated' || s.combat?.hp <= 0) { stop('The traveler has fallen. Choose how to recover.'); return null; }
    if (s.combat?.phase === 'active') { stop('A fight interrupted Ari\'s lesson. You have control.'); return null; }
    if (!['playing', 'dialogue'].includes(s.mode)) { intent = 'Paused'; return { goal: 'wait', intent, move, yaw, guard: false, actions }; }
    if (q.complete && s.mode !== 'dialogue') { stop('Ari\'s sunflower lesson is complete. You planted, watered and harvested your flowers, and earned Farming experience.', true); return null; }
    if (!point(s.ari) || s.ari.available === false) { stop('Ari is unavailable. You have control.'); return null; }
    const beds = (s.beds ?? []).filter(b => SUNFLOWER_ROWS.some(row => row.id === b.id));
    const bed = beds.find(b => b.id === q.target?.id) ?? beds.find(b => b.stage === 'bare');
    elapsed += dt; idle += dt; touch += dt;
    // A changing remaining growth time is progress, even while standing still.
    const progress = JSON.stringify([q.stage, bed?.id, bed?.stage, bed?.watered, Math.ceil(bed?.left ?? 0)]);
    if (progress !== stamp || (previous && gap(previous, s.position) > .015)) idle = 0;
    stamp = progress; previous = { ...s.position };
    if (elapsed > config.maxSeconds || idle > config.idleLimit) { stop('Ari autoplay could not make progress. You have control.'); return null; }
    let goal = 'talk', targetId = ARI.id;
    if (s.mode === 'dialogue') {
      goal = 'dialogue';
      const speaker = s.dialogue?.npcId, isAri = speaker === ARI.id;
      if (!isAri && !SUNFLOWER_ROWS.some(row => row.id === speaker)) { stop('Another conversation interrupted Ari\'s lesson. You have control.'); return null; }
      intent = isAri ? 'Listening to Ari' : 'Working the sunflower bed';
      const offered = s.dialogue.choices ?? [], choices = offered.filter(c => c.enabled !== false && c.disabled !== true);
      const signature = `${speaker}:${q.stage}:${offered.map(c => `${c.id}:${c.enabled !== false && c.disabled !== true}`).join(',')}`;
      if (signature !== dialogueStamp) { speech = 0; dialogueStamp = signature; }
      speech += dt;
      if (offered.length && speech >= config.choicePace) {
        let wanted;
        if (isAri) wanted = q.stage === 'offered' ? 'ari-sunflower-accept' : q.stage === 'report' ? 'ari-sunflower-report' : 'ari-sunflower-leave';
        else if (q.stage === 'plant') wanted = choices.some(c => c.id === 'farm-sow-sunflower') ? 'farm-sow-sunflower' : 'farm-shared-seeds';
        else if (q.stage === 'water') wanted = choices.some(c => c.id === 'farm-water') ? 'farm-water' : 'farm-harvest';
        else if (q.stage === 'harvest') wanted = 'farm-harvest';
        else wanted = 'farm-back';
        if (!choices.some(c => c.id === wanted)) { stop('Ari autoplay\'s expected reply is unavailable. You have control.'); return null; }
        actions.push({ type: 'choose', id: wanted }); speech = 0; idle = 0;
      } else if (!offered.length && speech >= config.dialoguePace) { actions.push({ type: 'continue' }); speech = 0; idle = 0; }
    } else {
      speech = 0; dialogueStamp = '';
      if (s.riding?.mounted || s.sneaking) {
        intent = s.riding?.mounted ? 'Dismounting for the garden' : 'Standing to tend the garden';
        if (touch >= config.interactEvery) { actions.push({ type: s.riding?.mounted ? 'dismount' : 'toggleSneak' }); touch = 0; }
      } else if (['plant', 'water', 'growing', 'harvest'].includes(q.stage)) {
        if (!point(bed)) { stop('Ari autoplay could not find the sunflower bed. You have control.'); return null; }
        goal = q.stage; targetId = bed.id;
        intent = q.stage === 'plant' ? 'Planting sunflower seeds' : q.stage === 'water' ? 'Watering the young sunflowers'
          : q.stage === 'harvest' ? 'Harvesting the sunflowers' : `Watching the sunflowers grow · ${Math.ceil(bed.left)} seconds`;
        if (q.stage === 'growing') { yaw = Math.atan2(s.position.x - bed.x, s.position.z - bed.z); }
        else if (!s.interaction?.npcId && s.interaction?.rowId === bed.id) interact(s, actions);
        else walk(s, bed, 1.2);
      } else {
        intent = q.stage === 'offered' ? 'Speaking with Ari' : 'Returning to Ari with the sunflowers';
        if (s.interaction?.npcId === ARI.id) { yaw = Math.atan2(s.position.x - s.ari.x, s.position.z - s.ari.z); interact(s, actions); }
        else walk(s, s.ari, 1.3);
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
