import { moveInput } from './autopilot.js';
import { BODY, stepToward } from './bodies.js';
import { CLUES, MURDERER, TESTIMONY, TROY, WITNESS_IDS } from './murder-quest.js';

const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const point = value => value && Number.isFinite(value.x) && Number.isFinite(value.z);
const still = () => ({ forward: 0, side: 0, run: false });
const defaults = Object.freeze({ dialoguePace: 2.2, choicePace: 1.4, interactEvery: .8,
  idleLimit: 60, maxSeconds: 900 });

/** Ordinary walking and conversation inputs for the tally-keeper's case.
 * read(): {mode,position,cameraYaw,quest:murder.state,now,troy:{x,z,available},
 *   witnesses:{[id]:{x,z,available}},combat,dialogue,interaction,riding?}.
 * act supplies interact/continue/choose/dismount, just like the main pilot.
 * The host owns the initial testing teleport and manual interruption. This
 * controller cannot grant clues, accuse through a back door, or choose a reward.
 */
export function createTroyAutopilot({ world, read, act = {}, options = {} } = {}) {
  const config = { ...defaults, ...options }, listeners = new Set();
  let active = false, intent = '', stopReason = '', move = still(), yaw = null;
  let elapsed = 0, idle = 0, dialogueClock = 0, interactClock = 0;
  let lastProgress = '', lastDialogue = '', leg = '', bestGap = Infinity, probe = { x: 0, z: 0 };
  const notify = event => { for (const listener of listeners) listener(event); };
  function stop(reason = 'Troy autoplay stopped. You have control.', completed = false) {
    if (!active) return false;
    active = false; move = still(); yaw = null; stopReason = reason; intent = '';
    notify({ type: 'stop', reason, completed, questId: 'cobble-murder' }); return true;
  }
  function start() {
    if (active) return false;
    active = true; intent = 'Speaking with Troy'; stopReason = ''; move = still(); yaw = null;
    elapsed = idle = dialogueClock = interactClock = 0;
    lastProgress = lastDialogue = leg = ''; bestGap = Infinity; probe = { x: 0, z: 0 };
    notify({ type: 'start', questId: 'cobble-murder' }); return true;
  }
  function walk(snapshot, target, targetId) {
    const distance = gap(snapshot.position, target);
    if (leg !== targetId) { leg = targetId; bestGap = distance; idle = 0; }
    if (distance < bestGap - .2) { bestGap = distance; idle = 0; }
    if (distance <= 1.3) return;
    // Cobble's short visits need persistent detours around houses and people,
    // not the regional road's next vertex. Plan using a stable copy so the
    // host still moves the real traveler through ordinary walk inputs.
    Object.assign(probe, snapshot.position);
    stepToward(probe, target, Math.min(.45, distance - 1.3), world, BODY.traveler);
    const dx = probe.x - snapshot.position.x, dz = probe.z - snapshot.position.z, length = Math.hypot(dx, dz);
    if (length < .001) return;
    yaw = Math.atan2(-dx, -dz);
    // The camera eases into turns. Resolve the planned direction against the
    // current camera, so that easing does not steer a walker through a corner.
    move = moveInput(Number.isFinite(snapshot.cameraYaw) ? snapshot.cameraYaw : yaw, dx / length, dz / length, false);
  }
  function step(dt = 1 / 60) {
    if (!active) return null;
    move = still(); yaw = null;
    if (!Number.isFinite(dt) || dt <= 0) return null;
    dt = Math.min(dt, .25);
    const snapshot = read(), actions = [];
    if (!snapshot || !point(snapshot.position)) { stop('Troy autoplay could not read the traveler\u2019s position.'); return null; }
    const quest = snapshot.quest ?? {}, combat = snapshot.combat ?? {}, stage = quest.stage;
    if (stage === 'taught' || stage === 'paid') {
      stop(stage === 'taught' ? 'Troy\u2019s case is complete. Mind Read is learned.' : 'Troy\u2019s case is complete. You chose the purse.', true); return null;
    }
    if (snapshot.mode === 'defeated' || combat.hp <= 0) { stop('The traveler has fallen. Choose how to recover.'); return null; }
    if (!['playing', 'dialogue'].includes(snapshot.mode)) {
      intent = 'Paused'; return { goal: 'wait', intent, move, yaw, guard: false, actions };
    }
    if (!['unmet', 'asking', 'solved'].includes(stage)) { stop('Troy\u2019s case cannot continue from here. You have control.'); return null; }
    if (combat.phase === 'active') { stop('A fight interrupted Troy\u2019s case. You have control.'); return null; }
    if (!point(snapshot.troy) || snapshot.troy.available === false) { stop('Troy is not available to continue. You have control.'); return null; }
    const heard = quest.heard ?? [], ready = CLUES.every(clue => heard.includes(clue));
    const witnessId = stage === 'asking' && !ready ? WITNESS_IDS.find(id => !heard.includes(TESTIMONY[id].gives)) : null;
    const targetId = witnessId ?? TROY.id, target = witnessId ? snapshot.witnesses?.[witnessId] : snapshot.troy;
    if (!point(target) || target.available === false) {
      stop(`${TESTIMONY[witnessId]?.name ?? 'Troy'} is not available to continue. You have control.`); return null;
    }
    // A resumed case may include a previous wrong accusation. The ordinary world
    // clock must expire it; reopening dialogue would otherwise freeze that clock.
    const cooling = stage === 'asking' && ready && Number.isFinite(snapshot.now) && quest.restUntil > snapshot.now;
    if (stage === 'asking' && ready && quest.restUntil > 0 && !Number.isFinite(snapshot.now)) {
      stop('Troy autoplay could not read the accusation cooldown. You have control.'); return null;
    }
    elapsed += dt; idle += dt; interactClock += dt;
    const progress = JSON.stringify([stage, heard, targetId]);
    if (progress !== lastProgress || cooling) idle = 0;
    lastProgress = progress;
    if (elapsed > config.maxSeconds || idle > config.idleLimit) { stop('Troy autoplay could not make progress. You have control.'); return null; }
    let goal = 'talk';
    if (snapshot.mode === 'dialogue') {
      goal = 'dialogue';
      const dialogue = snapshot.dialogue, npcId = dialogue?.npcId;
      if (npcId !== TROY.id && !WITNESS_IDS.includes(npcId)) { stop('Another conversation interrupted Troy\u2019s case.'); return null; }
      const offered = dialogue.choices ?? [], choices = offered.filter(choice => choice.enabled !== false);
      const signature = `${npcId}:${choices.map(choice => choice.id).join(',')}`;
      if (signature !== lastDialogue) { dialogueClock = 0; lastDialogue = signature; }
      dialogueClock += dt;
      intent = npcId === TROY.id ? 'Listening to Troy' : `Listening to ${TESTIMONY[npcId].name}`;
      if (stage === 'solved' && npcId === TROY.id
        && choices.some(choice => choice.id === 'murder-purse') && choices.some(choice => choice.id === 'murder-lesson')) {
        stop('The case is solved. Choose your reward: money or the Mind Read lesson.', true); return null;
      }
      if (offered.length && dialogueClock >= config.choicePace) {
        let wanted;
        if (npcId !== TROY.id) wanted = heard.includes(TESTIMONY[npcId].gives) ? 'leave-cobble-talk' : 'ask-bregga';
        else if (stage === 'unmet') wanted = 'murder-take';
        else if (stage === 'asking' && (!ready || cooling)) wanted = 'leave-troy';
        else if (stage === 'asking' && ready) wanted = choices.some(choice => choice.id === 'murder-name') ? 'murder-name' : `accuse-${MURDERER}`;
        if (!choices.some(choice => choice.id === wanted)) { stop('Troy autoplay\u2019s expected reply is unavailable. You have control.'); return null; }
        actions.push({ type: 'choose', id: wanted }); dialogueClock = 0;
      } else if (!offered.length && dialogueClock >= config.dialoguePace) {
        actions.push({ type: 'continue' }); dialogueClock = 0;
      }
    } else {
      dialogueClock = 0; lastDialogue = '';
      if (snapshot.riding?.mounted) {
        intent = 'Stepping down to investigate Cobble';
        if (interactClock >= config.interactEvery) { actions.push({ type: 'dismount' }); interactClock = 0; }
      } else if (cooling) {
        goal = 'wait'; intent = 'Giving Troy time to reconsider the evidence';
      } else {
        intent = witnessId ? `Asking ${TESTIMONY[witnessId].name} about Bregga Sell`
          : stage === 'solved' ? 'Returning to Troy for your reward' : ready ? 'Bringing the evidence back to Troy' : 'Speaking with Troy';
        if (snapshot.interaction?.npcId === targetId && (!combat.action || combat.action === 'idle')) {
          yaw = Math.atan2(snapshot.position.x - target.x, snapshot.position.z - target.z);
          if (interactClock >= config.interactEvery) { actions.push({ type: 'interact' }); interactClock = 0; }
        } else walk(snapshot, target, targetId);
      }
    }
    for (const action of actions) act[action.type]?.(action);
    return { goal, targetId, intent, move, yaw, guard: false, actions };
  }
  return { start, stop, step, get active() { return active; }, get intent() { return intent; },
    get stopReason() { return stopReason; }, get reason() { return stopReason; },
    get move() { return move; }, get yaw() { return yaw; }, get guard() { return false; },
    onEvent(listener) { listeners.add(listener); return () => listeners.delete(listener); } };
}
