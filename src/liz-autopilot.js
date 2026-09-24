import { moveInput } from './autopilot.js';
import { BODY, stepToward } from './bodies.js';
import { CAT, LIZ, MOP } from './cat-quest.js';
import { FOREST_HIDEOUT_QUEST } from './forest-hideout.js';

const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const point = value => value && Number.isFinite(value.x) && Number.isFinite(value.z);
const still = () => ({ forward: 0, side: 0, run: false });
const defaults = Object.freeze({ dialoguePace: 2.2, choicePace: 1.4, interactEvery: .8,
  idleLimit: 60, maxSeconds: 900, followWait: 7.4, followResume: 5.2 });

/** The cat is outside the camp. Local detours must not take a shortcut through its guards. */
function quietWoods(world) {
  const camp = { ...FOREST_HIDEOUT_QUEST.encounter.center, r: 18, kind: 'autopilot-avoid-camp' };
  return {
    bounds: world.bounds,
    get colliders() { return [...world.colliders, camp]; },
    heightAt: (x, z) => world.heightAt(x, z),
    waterAt: (x, z) => world.waterAt?.(x, z),
    nearColliders: (x, z, reach) => [...(world.nearColliders?.(x, z, reach) ?? world.colliders), camp],
  };
}

/**
 * Ordinary inputs for Liz's cat errand. The host owns the isolated testing save and launch warp.
 * read(): the Ben pilot snapshot, replacing ben with liz:{x,z,available} and
 * cat:{x,z,available,mode}; quest is catQuest.state. Actions are interact, continue,
 * choose({id:'cat-yes'}) and dismount. Reward selection always belongs to the player.
 */
export function createLizAutopilot({ world, read, act = {}, options = {} } = {}) {
  const config = { ...defaults, ...options }, listeners = new Set(), navigation = quietWoods(world);
  let active = false, intent = '', stopReason = '', move = still(), yaw = null;
  let elapsed = 0, idle = 0, dialogueClock = 0, interactClock = 0, waitingForCat = false;
  let lastProgress = '', lastCat = null, leg = '', bestGap = Infinity, probe = { x: 0, z: 0 };
  const notify = event => { for (const listener of listeners) listener(event); };
  function stop(reason = 'Liz autoplay stopped. You have control.', completed = false) {
    if (!active) return false;
    active = false; move = still(); yaw = null; intent = ''; stopReason = reason;
    notify({ type: 'stop', reason, completed, questId: 'liz-cat' }); return true;
  }
  function start() {
    if (active) return false;
    active = true; intent = 'Speaking with Liz'; stopReason = ''; move = still(); yaw = null;
    elapsed = idle = dialogueClock = interactClock = 0; waitingForCat = false;
    lastProgress = ''; lastCat = null; leg = ''; bestGap = Infinity; probe = { x: 0, z: 0 };
    notify({ type: 'start', questId: 'liz-cat' }); return true;
  }
  function walk(snapshot, target, radius, name) {
    const distance = gap(snapshot.position, target);
    if (leg !== name) { leg = name; bestGap = distance; idle = 0; }
    if (distance < bestGap - .2) { bestGap = distance; idle = 0; }
    if (distance <= radius) return;
    // Plan on a copy. This reuses the world's collision detours without moving the traveler:
    // the host still applies the resulting walk input through normal player movement.
    Object.assign(probe, snapshot.position);
    stepToward(probe, target, Math.min(.45, distance - radius), navigation, BODY.traveler);
    const dx = probe.x - snapshot.position.x, dz = probe.z - snapshot.position.z, length = Math.hypot(dx, dz);
    if (length < .001) return;
    yaw = Math.atan2(-dx, -dz); move = moveInput(yaw, dx / length, dz / length, false);
  }
  function step(dt = 1 / 60) {
    if (!active) return null;
    move = still(); yaw = null;
    if (!Number.isFinite(dt) || dt <= 0) return null;
    dt = Math.min(dt, .25);
    const snapshot = read(), actions = [];
    if (!snapshot || !point(snapshot.position)) { stop('Liz autoplay could not read the traveler\u2019s position.'); return null; }
    const quest = snapshot.quest ?? {}, combat = snapshot.combat ?? {}, stage = quest.stage;
    if (['paid', 'taught'].includes(stage)) { stop('Liz\u2019s quest is already complete.', true); return null; }
    if (stage === 'lost' || snapshot.cat?.dead) { stop('Mop has died. Liz\u2019s errand cannot continue. You have control.'); return null; }
    if (snapshot.mode === 'defeated' || combat.hp <= 0) { stop('The traveler has fallen. Choose how to recover.'); return null; }
    if (!['playing', 'dialogue'].includes(snapshot.mode)) {
      intent = 'Paused'; return { goal: 'wait', intent, move, yaw, guard: false, actions };
    }
    elapsed += dt; idle += dt; interactClock += dt;
    const progress = JSON.stringify([stage, quest.bolted, snapshot.cat?.mode]);
    if (progress !== lastProgress || (point(snapshot.cat) && lastCat && gap(snapshot.cat, lastCat) > .015)) idle = 0;
    lastProgress = progress; lastCat = point(snapshot.cat) ? { ...snapshot.cat } : null;
    if (elapsed > config.maxSeconds || idle > config.idleLimit) {
      stop('Liz autoplay could not find a safe way forward. You have control.'); return null;
    }
    if (combat.phase === 'active') { stop('A fight has frightened Mop. Resolve the danger, then resume Liz autoplay.'); return null; }
    if (!point(snapshot.liz) || snapshot.liz.available === false) { stop('Liz is not available to continue. You have control.'); return null; }
    let goal = 'talk';
    if (snapshot.mode === 'dialogue') {
      goal = 'dialogue'; intent = 'Listening to Liz'; dialogueClock += dt;
      if (snapshot.dialogue?.npcId && snapshot.dialogue.npcId !== LIZ.id) {
        stop('Another conversation interrupted Liz\u2019s quest.'); return null;
      }
      const choices = (snapshot.dialogue?.choices ?? []).filter(choice => choice.enabled !== false);
      if (stage === 'home' && choices.some(choice => choice.id === 'cat-lesson') && choices.some(choice => choice.id === 'cat-purse')) {
        stop('Mop is home. Choose your reward: money or the Summon Bees lesson.', true); return null;
      }
      if (choices.length && dialogueClock >= config.choicePace) {
        const choice = choices.find(reply => reply.id === 'cat-yes');
        if (!choice) { stop('Liz\u2019s expected reply is unavailable. You have control.'); return null; }
        actions.push({ type: 'choose', id: choice.id }); dialogueClock = 0; idle = 0;
      } else if (!choices.length && dialogueClock >= config.dialoguePace) {
        actions.push({ type: 'continue' }); dialogueClock = 0; idle = 0;
      }
    } else {
      dialogueClock = 0;
      if (snapshot.riding?.mounted) {
        intent = 'Stepping down to walk quietly';
        if (interactClock >= config.interactEvery) { actions.push({ type: 'dismount' }); interactClock = 0; }
      } else if (['unmet', 'asked', 'home'].includes(stage)) {
        intent = stage === 'home' ? 'Returning to Liz for your reward' : 'Speaking with Liz';
        if (snapshot.interaction?.npcId === LIZ.id && (!combat.action || combat.action === 'idle')) {
          yaw = Math.atan2(snapshot.position.x - snapshot.liz.x, snapshot.position.z - snapshot.liz.z);
          if (interactClock >= config.interactEvery) { actions.push({ type: 'interact' }); interactClock = 0; }
        } else walk(snapshot, snapshot.liz, 1.3, 'liz');
      } else if (stage === 'looking' || stage === 'following') {
        goal = stage === 'looking' ? 'find-cat' : 'bring-home';
        const cat = snapshot.cat;
        if (!point(cat) || cat.available === false) { stop('Mop is not available to follow. You have control.'); return null; }
        const following = stage === 'following' && (!cat.mode || cat.mode === 'following');
        if (cat.mode === 'bolting') intent = 'Giving Mop room to hide';
        else if (!following) {
          waitingForCat = false;
          intent = gap(snapshot.position, cat) < CAT.reach - .4
            ? cat.mode === 'hiding' ? 'Waiting quietly for Mop to come out' : 'Standing still so Mop can decide'
            : 'Approaching Mop quietly';
          walk(snapshot, cat, CAT.reach - .8, 'cat');
        } else {
          const distance = gap(snapshot.position, cat);
          if (distance > config.followWait) waitingForCat = true;
          if (distance <= config.followResume) waitingForCat = false;
          if (distance >= MOP.lose - 2) {
            intent = 'Going back for Mop'; walk(snapshot, cat, config.followResume, 'recover-cat');
          } else if (waitingForCat) intent = 'Waiting for Mop to catch up';
          else { intent = 'Walking Mop home to Liz'; walk(snapshot, snapshot.liz, 1.2, 'home'); }
        }
      } else { stop('Liz\u2019s quest cannot continue from here. You have control.'); return null; }
    }
    for (const action of actions) act[action.type]?.(action);
    return { goal, intent, move, yaw, guard: false, actions };
  }
  return { start, stop, step, get active() { return active; }, get intent() { return intent; },
    get stopReason() { return stopReason; }, get reason() { return stopReason; },
    get move() { return move; }, get yaw() { return yaw; }, get guard() { return false; },
    onEvent(listener) { listeners.add(listener); return () => listeners.delete(listener); } };
}
