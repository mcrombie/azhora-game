import { moveInput, roadRoute } from '../../../gameplay/autoplay/autopilot.js';
import { BODY, stepToward } from '../../../gameplay/combat/bodies.js';
import { LOCOMOTION } from '../../../gameplay/movement/locomotion-skills.js';
import { PENINSULA_TUTORIAL_ANCHORS as A, PENINSULA_TUTORIAL_PATHS as PATHS, PENINSULA_LESSONS, PENINSULA_TEACHERS } from './peninsula-tutorial.js';

export const PENINSULA_PLAYTEST_ID = 'peninsula-tutorial';
export const PENINSULA_AUTOPILOT_CHOICES = Object.freeze(Object.fromEntries([
  ...PENINSULA_LESSONS.map(lesson => [lesson.id, `peninsula-${lesson.id}`]), ['graduate', 'peninsula-graduate'],
]));
const TEACHERS = { ...PENINSULA_TEACHERS, 'merc-gotwood': A.chris };
const still = () => ({ forward: 0, side: 0, run: false });
const point = p => !!p && Number.isFinite(p.x) && Number.isFinite(p.z);
const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const angle = (a, b) => Math.atan2(a.x - b.x, a.z - b.z);

/**
 * Demonstrates the actual peninsula lessons through ordinary player controls.
 * read(): {mode,position,tutorial:model.view(),tutorialTeachers?:{id:{x,z}},
 *   combat:{hp,phase,action,stamina,maxStamina},riding,sneaking,inWater,
 *   dialogue:{npcId,choices},interaction:{npcId,fireId,nearFishing},
 *   campcraft:{phase},selectedItem,fishingStand?,movementSpeed?,
 *   movementSpeeds?:{walking,running,swimming}}.
 * act uses the existing interact/continue/choose, inventory/chart, attack/dodge
 * and dismount/toggleSneak inputs. No lesson, item, XP or clock mutation hooks.
 */
export function createPeninsulaAutopilot({ world, read, act = {}, options = {} } = {}) {
  const config = { dialoguePace: 1.8, choicePace: 1, interactEvery: .7, readingPace: 3,
    swingEvery: .35, idleLimit: 55, maxSeconds: 900, ...options };
  const listeners = new Set(), probe = {};
  let active = false, intent = '', reason = '', move = still(), yaw = null, guard = false;
  let elapsed = 0, idle = 0, speech = 0, touch = 0, reading = 0, swing = 0;
  let previous = null, progressStamp = '', dialogueStamp = '', routeStamp = '', route = [], runLeg = 0, swimLeg = 0, walkingDetour = false;
  const notify = event => { for (const listener of listeners) listener(event); };
  function stop(message = 'Peninsula autoplay stopped. You have control.', completed = false) {
    if (!active) return false;
    active = false; reason = message; intent = ''; move = still(); yaw = null; guard = false;
    notify({ type: 'stop', reason: message, completed, questId: PENINSULA_PLAYTEST_ID }); return true;
  }
  function start() {
    if (active) return false;
    active = true; intent = 'Meeting Jojo at the peninsula pier'; reason = ''; move = still(); yaw = null; guard = false;
    elapsed = idle = speech = touch = reading = swing = runLeg = 0;
    previous = null; progressStamp = dialogueStamp = routeStamp = ''; route = []; swimLeg = 0; walkingDetour = false;
    notify({ type: 'start', questId: PENINSULA_PLAYTEST_ID }); return true;
  }
  const send = (actions, type, payload = {}) => {
    if (touch < config.interactEvery) return false;
    actions.push({ type, ...payload }); touch = 0; return true;
  };
  function walk(s, target, radius, dt, { running = false, swim = false, routeId = '' } = {}) {
    if (!point(target)) { stop('The next tutorial station is unavailable. You have control.'); return false; }
    const finalGap = gap(s.position, target);
    if (finalGap <= radius + .015) return true;
    const key = `${routeId}:${target.x}:${target.z}:${swim}`;
    if (key !== routeStamp) {
      routeStamp = key;
      route = swim || finalGap < 8 ? [target] : [...(roadRoute(PATHS, s.position, target) ?? []), target];
    }
    // Teaching stations are also path junctions; pass beside their solid people.
    while (route.length > 1 && gap(s.position, route[0]) < 1.1) route.shift();
    const aim = route[0], distance = gap(s.position, aim), stopWithin = route.length === 1 ? radius : .25;
    let dx = aim.x - s.position.x, dz = aim.z - s.position.z;
    if (!swim) {
      Object.assign(probe, s.position);
      stepToward(probe, aim, Math.min(.4, Math.max(0, distance - stopWithin)), world, BODY.traveler);
      dx = probe.x - s.position.x; dz = probe.z - s.position.z;
    }
    const length = Math.hypot(dx, dz);
    if (length < .001) return false;
    yaw = Math.atan2(-dx, -dz);
    const pace = swim && s.inWater ? 'swimming' : running ? 'running' : 'walking';
    const speed = s.movementSpeeds?.[pace] ?? s.movementSpeed
      ?? (pace === 'swimming' ? 2.31 : running ? LOCOMOTION.runStart : LOCOMOTION.walkStart);
    const strength = Math.min(1, Math.max(0, distance - stopWithin) / (Math.max(.1, speed) * dt),
      swim ? 1 : length / (Math.max(.1, speed) * dt));
    const input = moveInput(yaw, dx / length, dz / length, running);
    move = { forward: input.forward * strength, side: input.side * strength, run: running, basisYaw: yaw };
    return false;
  }
  function talk(s, id, actions, dt) {
    const teacher = s.tutorialTeachers?.[id] ?? TEACHERS[id];
    if (!point(teacher) || teacher.available === false) { stop('A tutorial teacher is unavailable. You have control.'); return; }
    if (s.interaction?.npcId === id) { yaw = angle(s.position, teacher); send(actions, 'interact'); }
    else walk(s, teacher, 1.2, dt, { routeId: id });
  }
  function step(dt = 1 / 60) {
    if (!active) return null;
    move = still(); yaw = null; guard = false;
    if (!Number.isFinite(dt) || dt <= 0) return null;
    dt = Math.min(.25, dt);
    const s = read(), q = s?.tutorial, actions = [];
    if (!s || !point(s.position) || !q?.lessons) { stop('Peninsula autoplay could not read the tutorial.'); return null; }
    if (s.mode === 'defeated' || s.combat?.hp <= 0 || q.boundary?.encounter) { stop('The tutorial was interrupted. You have control.'); return null; }
    if (s.combat?.phase === 'active') { stop('A fight interrupted training. You have control.'); return null; }
    if (!['playing', 'dialogue', 'inventory', 'journal', 'fishing'].includes(s.mode)) {
      intent = 'Paused'; return { goal: 'wait', intent, move, yaw, guard, actions };
    }
    if (q.completed && s.mode !== 'dialogue') {
      stop("Training complete. Glun's letter opens the gate, and Ed's arrival has begun. You have control.", true); return null;
    }
    if (!q.active && !q.completed) { stop('Start the peninsula tutorial before resuming its playtest.'); return null; }
    elapsed += dt; idle += dt; touch += dt; swing += dt;
    const stamp = JSON.stringify([q.next?.id, q.lessons, q.practice, s.campcraft?.phase, q.canGraduate, q.completed]);
    if (stamp !== progressStamp || (previous && gap(s.position, previous) > .012)) idle = 0;
    progressStamp = stamp; previous = { ...s.position };
    if (elapsed > config.maxSeconds || idle > config.idleLimit) { stop('Peninsula autoplay could not make progress. You have control.'); return null; }
    const lesson = q.next?.id, practice = q.practice ?? {};
    let goal = lesson ?? 'graduate';
    if (s.mode === 'dialogue') {
      goal = 'dialogue'; intent = 'Listening to the tutorial lesson';
      const speaker = s.dialogue?.npcId, offered = s.dialogue?.choices ?? [], enabled = offered.filter(c => c.enabled !== false && !c.disabled);
      const fire = s.interaction?.fireId === speaker || /peninsula.*fire/.test(speaker ?? '') || offered.some(c => c.id === 'cook-fish');
      if (!fire && !Object.hasOwn(TEACHERS, speaker ?? '')) { stop('Another conversation interrupted the tutorial. You have control.'); return null; }
      const signature = `${speaker}:${lesson}:${offered.map(c => `${c.id}:${c.enabled !== false && !c.disabled}`).join(',')}`;
      if (signature !== dialogueStamp) { dialogueStamp = signature; speech = 0; }
      speech += dt;
      if (offered.length && speech >= config.choicePace) {
        const desired = fire ? (q.lessons.cooking.practiced ? 'leave-fire' : 'cook-fish')
          : q.completed ? 'peninsula-leave' : PENINSULA_AUTOPILOT_CHOICES[q.canGraduate ? 'graduate' : lesson];
        const choice = enabled.find(c => c.id === desired);
        if (!choice) { stop('The expected tutorial reply is unavailable. You have control.'); return null; }
        actions.push({ type: 'choose', id: choice.id }); speech = 0; idle = 0;
      } else if (!offered.length && speech >= config.dialoguePace) { actions.push({ type: 'continue' }); speech = 0; idle = 0; }
    } else if (s.mode === 'inventory') {
      intent = 'Inspecting the sandwich in the satchel'; reading += dt;
      if (!q.lessons.inventory.practiced) send(actions, 'select-item', { id: 'jojo-sandwich' });
      else if (reading >= config.readingPace) send(actions, 'close-inventory');
    } else if (s.mode === 'journal') {
      intent = 'Finding the peninsula and Tidewater Haven on the chart'; reading += dt;
      if (reading >= config.readingPace) send(actions, 'close-journal');
    } else if (s.mode === 'fishing') {
      intent = s.campcraft?.phase === 'bite' ? 'Reeling in the fish' : 'Watching the float for a bite';
      if (s.campcraft?.phase === 'bite' || s.campcraft?.phase === 'idle') send(actions, 'interact');
    } else {
      speech = reading = 0; dialogueStamp = '';
      if (s.riding?.mounted || s.sneaking) {
        intent = s.riding?.mounted ? 'Stepping down for the lesson' : 'Standing to practice';
        send(actions, s.riding?.mounted ? 'dismount' : 'toggleSneak');
      } else if (q.canGraduate) { intent = "Returning to Glun for the recruitment letter"; talk(s, 'instructor', actions, dt); }
      else if (!lesson || !q.lessons[lesson]) { stop('The next tutorial lesson is unavailable. You have control.'); return null; }
      else if (!q.lessons[lesson].introduced) {
        intent = `Learning ${lesson === 'inventory' ? 'about the satchel from Jojo' : lesson}`;
        // Jojo can recall Chris's persistent demonstration after he has moved on.
        talk(s, lesson === 'walking' ? 'harbormaster' : q.next.teacher, actions, dt);
      } else if (lesson === 'inventory') { intent = "Opening Jojo's sandwich in the satchel"; send(actions, 'open-inventory'); }
      else if (lesson === 'walking') {
        intent = "Following Chris's walking example";
        if (practice.walked >= 4 || gap(s.position, A.jojo) < 1.4) walkingDetour = false;
        else if (gap(s.position, A.walkingEnd) < 1.4) walkingDetour = true;
        const target = walkingDetour ? A.jojo : A.walkingEnd;
        walk(s, target, .6, dt, { routeId: 'walking' });
      } else if (lesson === 'running') {
        if (practice.ran >= 6) { intent = 'Resting to recover after the run'; }
        else {
          intent = 'Practising a run along the forest trail';
          const targets = [A.glun, A.walkingEnd];
          if (gap(s.position, targets[runLeg % 2]) < 1.6) { runLeg++; routeStamp = ''; }
          // The movement host's exhaustion latch handles running out of wind.
          walk(s, targets[runLeg % 2], 1.2, dt, { running: true, routeId: `running-${runLeg}` });
        }
      } else if (lesson === 'combat') {
        intent = practice.strikes < 2 ? 'Striking the training dummy' : practice.guarded < 1.5 ? 'Holding the shield guard' : 'Practising a dodge';
        if (gap(s.position, A.dummy) > 1.85) walk(s, A.dummy, 1.6, dt, { routeId: 'dummy' });
        else {
          yaw = angle(s.position, A.dummy);
          if (practice.strikes < 2 && s.combat?.action === 'idle' && s.combat.stamina >= 6 && swing >= config.swingEvery) {
            actions.push({ type: 'attack', yaw: Math.PI + yaw }); swing = 0;
          } else if (practice.strikes >= 2 && practice.guarded < 1.5) guard = true;
          else if (practice.strikes >= 2 && practice.guarded >= 1.5 && practice.dodges < 1 && s.combat?.action === 'idle' && s.combat.stamina >= 25) {
            const dx = A.dummy.x - s.position.x, dz = A.dummy.z - s.position.z, length = Math.hypot(dx, dz) || 1;
            actions.push({ type: 'dodge', x: -dz / length, z: dx / length });
          }
        }
      } else if (lesson === 'cartography') { intent = "Reading Bear's chart"; send(actions, 'open-chart'); }
      else if (lesson === 'swimming') {
        const returning = practice.buoy && practice.swam >= 4;
        intent = returning ? 'Swimming back to the sheltered beach' : practice.buoy ? 'Practising a short swim around the buoy' : 'Swimming to the blue buoy';
        let target = returning ? { x: A.swimExit.x + 1, z: A.swimExit.z + 2 } : A.swimTurn;
        // The gradual shore includes wading. Loop on the buoy's seaward side
        // until four seconds of actual swimming accrue before coming ashore.
        if (practice.buoy && !returning) {
          const loops = [{ x: A.swimTurn.x - 2, z: A.swimTurn.z + 3 }, { x: A.swimTurn.x - 2, z: A.swimTurn.z - 3 }];
          if (gap(s.position, loops[swimLeg % 2]) < .8) swimLeg++;
          target = loops[swimLeg % 2];
        }
        walk(s, target, .7, dt, { swim: true, routeId: returning ? 'swim-return' : `swim-out-${swimLeg}` });
      } else if (lesson === 'fishing') {
        intent = "Casting beside Ryan's fishing ledge";
        if (s.interaction?.nearFishing && !s.interaction?.npcId) { yaw = angle(s.position, A.fishingCast); send(actions, 'interact'); }
        else walk(s, s.fishingStand ?? { x: A.ryan.x - 2, z: A.ryan.z + 4 }, .35, dt, { routeId: 'fishing-bank' });
      } else if (lesson === 'cooking') {
        intent = "Cooking the catch at Jojo's lit fire";
        if (s.interaction?.fireId && !s.interaction?.npcId) send(actions, 'interact');
        else walk(s, A.cookfire, 1.5, dt, { routeId: 'cooking-fire' });
      }
    }
    for (const action of actions) act[action.type]?.(action);
    return { goal, targetId: q.next?.teacher ?? 'instructor', intent, move, yaw, guard, actions };
  }
  return { start, stop, step, get active() { return active; }, get intent() { return intent; },
    get stopReason() { return reason; }, get reason() { return reason; }, get move() { return move; },
    get yaw() { return yaw; }, get guard() { return guard; },
    onEvent(listener) { listeners.add(listener); return () => listeners.delete(listener); } };
}
