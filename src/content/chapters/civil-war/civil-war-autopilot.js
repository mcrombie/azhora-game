import { fightCommand, moveInput, nextWaypoint } from '../../../gameplay/autoplay/autopilot.js';
import { BODY, stepToward } from '../../../gameplay/combat/bodies.js';
import { LOCOMOTION } from '../../../gameplay/movement/locomotion-skills.js';
import { meleeContacts } from '../../../gameplay/combat/melee-contact.js';
import { createEscortFollower } from '../../../gameplay/autoplay/escort-autopilot-follow.js';
import { DRENT_QUEST_ID } from './drent-civil-war.js';
import { LUSCIA_CIVIL_QUEST_ID, LUSCIA_OPERATIVE_ID, LUSCIA_SOLDIER_ID } from './luscia-civil-war.js';

const still = () => ({ forward: 0, side: 0, run: false });
const point = value => value && Number.isFinite(value.x) && Number.isFinite(value.z);
const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const defaults = Object.freeze({ dialoguePace: 2.2, choicePace: 1.4, interactEvery: .8,
  swingEvery: .3, idleLimit: 75, maxSeconds: 1200 });

const drentGoal = q => q.outcome ? { done: true, complete: true,
  reason: 'Civil War in Drent is complete. The outcome is recorded in this testing session.' }
  : !q.ambushDefeated ? { done: true, reason: 'Defeat the Greenway ambush before investigating Drent.' }
    : q.chosenPath === 'republican' ? { done: true, reason: 'This playtest follows Glun’s investigation. You have control of the Republican branch.' }
      : !q.accepted ? { id: 'instructor', intent: 'Reporting the ambush to Glun' }
        : !q.evidenceFound ? { id: 'drent-rebel-camp', site: true, intent: 'Searching the abandoned rebel camp' }
          : q.killianDefeated ? { id: 'instructor', intent: 'Reporting the outcome to Glun' }
            : q.confrontationStarted ? { id: 'instructor', follow: true, intent: 'Walking with Glun to Killian' }
              : { id: 'instructor', intent: q.chosenPath ? 'Joining Glun’s investigation' : 'Returning the sealed evidence to Glun' };

const lusciaGoal = q => q.republicContact ? { done: true, complete: false, boundary: true,
  reason: 'Luscia’s introduction and briefing are finished. Its next local job is not built yet; Civil War in Luscia remains open.' }
  : q.path === 'empire' ? { done: true, reason: 'This playtest follows the Republican introduction. You have control of the Imperial investigation.' }
    : q.operative && q.operative !== 'free' ? { done: true, reason: 'Hara is unavailable. The Republican introduction cannot continue.' }
      : q.introduced || q.mindRead || q.path === 'coalition'
        ? { id: LUSCIA_OPERATIVE_ID, intent: q.path === 'coalition' ? 'Hearing Hara’s local briefing' : 'Taking Davin’s introduction to Hara' }
        : ['hostile', 'dead', 'departed'].includes(q.soldier)
          ? { done: true, reason: 'Davin cannot provide this peaceful introduction. You have control.' }
          : { id: LUSCIA_SOLDIER_ID, intent: 'Hearing Davin at the relay hut' };

const definitions = Object.freeze({
  drent: { id: DRENT_QUEST_ID, name: 'Civil War in Drent', goal: drentGoal,
    speakers: ['instructor', 'killian', 'drent-camp-baggage'], encounter: 'drent-killian-confrontation',
    replies: ['drent-accept', 'drent-focus', 'drent-glun', 'drent-confront', 'drent-fight', 'drent-finish-imperial', 'drent-leave'] },
  luscia: { id: LUSCIA_CIVIL_QUEST_ID, name: 'Civil War in Luscia', goal: lusciaGoal,
    speakers: [LUSCIA_SOLDIER_ID, LUSCIA_OPERATIVE_ID, 'lauvel-seeker'], encounter: null,
    replies: ['luscia-listen-republican', 'luscia-join-republic', 'luscia-local-briefing', 'luscia-civil-leave'] },
});

/** Shared ordinary-input runner for the two built silver investigations.
 * read(): {...ordinaryAutopilotSnapshot, cameraYaw, quest: host.state(),
 *   people: {[id]: {x,z,available}}, sites: {[id]: {x,z}},
 *   interaction: {npcId,siteId}}.
 * The host owns resetting an isolated session, providing a fresh introduction,
 * and keeping this pilot running when its own confrontation starts. This code
 * never teleports, changes quest state, grants evidence, or invents a completion
 * for the unfinished Republican Luscia branch.
 */
function createCivilWarAutopilot(kind, { world, read, act = {}, options = {} } = {}) {
  const spec = definitions[kind], config = { ...defaults, ...options }, listeners = new Set();
  const follower = createEscortFollower({ world, distance: 3, guideSpeed: 3.1 });
  let active = false, intent = '', stopReason = '', move = still(), yaw = null, guard = false;
  let elapsed = 0, idle = 0, dialogueClock = 0, interactClock = 0, swingClock = 0, eatClock = 0;
  let lastProgress = '', lastDialogue = '', leg = '', progressPosition = null;
  let probe = { x: 0, z: 0 };
  const notify = event => { for (const listener of listeners) listener(event); };
  function stop(reason = `${spec.name} autoplay stopped. You have control.`, completed = false, boundary = false) {
    if (!active) return false;
    active = false; move = still(); yaw = null; guard = false; intent = ''; stopReason = reason;
    notify({ type: 'stop', reason, completed, boundary, questId: spec.id }); return true;
  }
  function start() {
    if (active) return false;
    active = true; intent = `Starting ${spec.name}`; stopReason = ''; move = still(); yaw = null; guard = false;
    elapsed = idle = dialogueClock = interactClock = swingClock = eatClock = 0;
    lastProgress = lastDialogue = leg = ''; progressPosition = null; probe = { x: 0, z: 0 }; follower.reset();
    notify({ type: 'start', questId: spec.id }); return true;
  }
  function walk(snapshot, target, id, dt) {
    const distance = gap(snapshot.position, target);
    if (leg !== id) { leg = id; probe = { ...snapshot.position }; progressPosition = { ...snapshot.position }; idle = 0; }
    if (distance <= 1.25) return;
    // Regional roads lead between settlements; persistent local navigation then
    // finds its way around a cottage or a chest without moving the real actor.
    const waypoint = distance > 18 ? nextWaypoint(snapshot.position, target, world).point : target;
    Object.assign(probe, snapshot.position);
    stepToward(probe, waypoint, Math.min(.4, Math.max(.05, gap(snapshot.position, waypoint))), world, BODY.traveler);
    const dx = probe.x - snapshot.position.x, dz = probe.z - snapshot.position.z;
    if (Math.hypot(dx, dz) < .001) return;
    yaw = Math.atan2(-dx, -dz);
    const run = distance > 8, input = moveInput(yaw, dx, dz, run);
    // A planned corner can be closer than one rendered frame's stride. Keep
    // that short step: normalizing it to full speed overshoots the corner and
    // oscillates forever at the engine's 20 Hz movement cap.
    const fraction = Math.min(1, Math.hypot(dx, dz) / ((run ? snapshot.movementSpeeds?.running ?? LOCOMOTION.runStart : snapshot.movementSpeeds?.walking ?? LOCOMOTION.walkStart) * dt));
    move = { ...input, forward: input.forward * fraction, side: input.side * fraction, basisYaw: yaw };
  }
  function step(dt = 1 / 60) {
    if (!active) return null;
    move = still(); yaw = null; guard = false;
    if (!Number.isFinite(dt) || dt <= 0) return null;
    dt = Math.min(dt, .25);
    const s = read(), actions = [];
    if (!s || !point(s.position)) { stop(`${spec.name} autoplay could not read the traveler’s position.`); return null; }
    const q = s.quest ?? {}, combat = s.combat ?? {};
    if (s.mode === 'defeated' || combat.hp <= 0) { stop('The traveler has fallen. Choose how to recover.'); return null; }
    if (!['playing', 'dialogue'].includes(s.mode)) {
      intent = 'Paused'; return { goal: 'wait', intent, move, yaw, guard, actions };
    }
    const targetGoal = spec.goal(q);
    // Finish a final spoken line before ending, but do not reopen a completed quest.
    if (targetGoal.done && s.mode !== 'dialogue') { stop(targetGoal.reason, targetGoal.complete, targetGoal.boundary); return null; }
    elapsed += dt; idle += dt; interactClock += dt; swingClock += dt; eatClock += dt;
    const progress = JSON.stringify([q, combat.hp, (combat.enemies ?? []).map(enemy => [enemy.id, enemy.hp])]);
    if (progress !== lastProgress) { idle = 0; lastProgress = progress; }
    if (!progressPosition || gap(s.position, progressPosition) > .75) { progressPosition = { ...s.position }; idle = 0; }
    if (elapsed > config.maxSeconds || idle > config.idleLimit) { stop(`${spec.name} autoplay could not make progress. You have control.`); return null; }
    let goal = targetGoal.follow ? 'follow' : targetGoal.site ? 'site' : 'talk';
    intent = targetGoal.intent ?? spec.name;
    if (s.mode === 'dialogue') {
      goal = 'dialogue'; const dialogue = s.dialogue, npcId = dialogue?.npcId;
      if (!spec.speakers.includes(npcId)) { stop(`Another conversation interrupted ${spec.name}.`); return null; }
      const offered = dialogue.choices ?? [], enabled = offered.filter(choice => choice.enabled !== false);
      const signature = `${npcId}:${offered.map(choice => `${choice.id}:${choice.enabled}`).join(',')}`;
      if (signature !== lastDialogue) { lastDialogue = signature; dialogueClock = 0; }
      dialogueClock += dt; intent = `Listening: ${spec.name}`;
      if (offered.length && dialogueClock >= config.choicePace) {
        const wanted = spec.replies.find(id => enabled.some(choice => choice.id === id));
        if (!wanted) { stop(`${spec.name} has a decision this playtest cannot make. You have control.`); return null; }
        // Disabled progression is not permission to quietly leave the conversation.
        if (wanted.endsWith('leave') && offered.some(choice => spec.replies.includes(choice.id) && !choice.id.endsWith('leave'))) {
          stop(`${spec.name}’s expected reply is unavailable. You have control.`); return null;
        }
        actions.push({ type: 'choose', id: wanted }); dialogueClock = 0;
      } else if (!offered.length && dialogueClock >= config.dialoguePace) {
        actions.push({ type: 'continue' }); dialogueClock = 0;
      }
    } else if (combat.phase === 'active') {
      goal = 'fight'; follower.reset();
      if (!spec.encounter || combat.encounterId !== spec.encounter) { stop(`Another fight interrupted ${spec.name}. You have control.`); return null; }
      if (s.weapon?.usable === false) { stop('The equipped weapon cannot fight. You have control.'); return null; }
      const command = fightCommand({ ...s, combat: { ...combat, enemies: combat.enemies ?? [] } });
      intent = command.intent; yaw = command.yaw; guard = !!command.guard;
      move = command.move ? { ...command.move, basisYaw: yaw } : still();
      const strike = command.actions.find(action => action.type === 'attack');
      if (strike) {
        const enemyIds = new Set((combat.enemies ?? []).flatMap(enemy => [enemy.id, enemy.npcId]));
        const friends = [...(combat.allies ?? []), ...Object.entries(s.people ?? {})
          .filter(([id, person]) => person?.available !== false && !enemyIds.has(id))
          .map(([id, person]) => ({ id, ...person }))].filter(person => point(person) && person.active !== false && person.hp !== 0 && person.action !== 'dead');
        // An ordinary sword can hit everybody in its sweep. Allow room for the
        // officer's next stride during windup, rather than swinging through him
        // and relying on the watch to forgive friendly fire after the victory.
        const danger = meleeContacts({ origin: s.position, yaw: strike.yaw,
          range: 2.65 * (s.weapon?.reachMultiplier ?? 1) + 1.1,
          arc: Math.min(Math.PI, (s.weapon?.arc ?? Math.PI * .34) + .4) }, friends, world);
        if (danger.length) {
          command.actions = command.actions.filter(action => action.type !== 'attack');
          const enemy = (combat.enemies ?? []).filter(one => point(one) && one.active !== false && one.hp > 0 && one.action !== 'dead')
            .sort((a, b) => gap(s.position, a) - gap(s.position, b))[0];
          if (enemy) {
            const friend = danger.sort((a, b) => gap(enemy, a) - gap(enemy, b))[0];
            const length = gap(enemy, friend), away = length > .05
              ? { x: (enemy.x - friend.x) / length, z: (enemy.z - friend.z) / length }
              : { x: Math.cos(strike.yaw), z: -Math.sin(strike.yaw) };
            const flank = { x: enemy.x + away.x * 2.25, z: enemy.z + away.z * 2.25 };
            walk(s, flank, 'combat-flank', dt);
            intent = 'Giving Glun room to fight';
          }
        }
      }
      if (combat.action === 'idle' && combat.hp < 55 && (s.inventory?.pawpaws ?? 0) > 0 && eatClock >= 3 && !guard
        && !command.actions.some(action => action.type === 'dodge')) { actions.push({ type: 'eat', id: 'pawpaw' }); eatClock = 0; }
      else for (const action of command.actions) if (action.type !== 'attack' || swingClock >= config.swingEvery) {
        actions.push(action); if (action.type === 'attack') swingClock = 0;
      }
    } else if (s.riding?.mounted) {
      intent = 'Stepping down to investigate';
      if (interactClock >= config.interactEvery) { actions.push({ type: 'dismount' }); interactClock = 0; }
    } else {
      dialogueClock = 0; lastDialogue = '';
      const target = (targetGoal.site ? s.sites : s.people)?.[targetGoal.id];
      if (!point(target) || target.available === false) { stop(`${spec.name}’s next destination is unavailable. You have control.`); return null; }
      if (targetGoal.follow) ({ move, yaw } = follower.step(s.position, target, dt, s.movementSpeeds));
      else {
        follower.reset();
        const ready = targetGoal.site ? s.interaction?.siteId === targetGoal.id : s.interaction?.npcId === targetGoal.id;
        if (ready && (!combat.action || combat.action === 'idle')) {
          yaw = Math.atan2(s.position.x - target.x, s.position.z - target.z);
          if (interactClock >= config.interactEvery) { actions.push({ type: 'interact' }); interactClock = 0; }
        } else walk(s, target, targetGoal.id, dt);
      }
    }
    for (const action of actions) act[action.type]?.(action);
    return { goal, targetId: targetGoal.id, intent, move, yaw, guard, actions };
  }
  return { start, stop, step, get active() { return active; }, get intent() { return intent; },
    get stopReason() { return stopReason; }, get reason() { return stopReason; }, get move() { return move; },
    get yaw() { return yaw; }, get guard() { return guard; },
    onEvent(listener) { listeners.add(listener); return () => listeners.delete(listener); } };
}

export const createDrentAutopilot = options => createCivilWarAutopilot('drent', options);
export const createLusciaCivilAutopilot = options => createCivilWarAutopilot('luscia', options);
