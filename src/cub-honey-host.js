import { createStealth, STEALTH } from './stealth.js';
import { BODY, stepToward } from './bodies.js';
import { LIZ, LIZ_STAND } from './cat-quest.js';
import { LIZ_COTTAGE, LIZ_WOOD_HIVES } from './pueth-world.js';
import { CUB, CUB_HONEY_ITEM, CUB_HONEY_SOURCE, createCubHoneyQuest, validateCubHoneyQuestSnapshot } from './cub-honey-quest.js';

export const HONEY_STORE = Object.freeze({ ...LIZ_WOOD_HIVES[2], reach: 2.5, seconds: 2.2 });
export const HONEY_APPROACH = Object.freeze({ x: -37.2, z: -189 });
export const HONEY_WAIT = Object.freeze({ x: -36.8, z: -196 });
export const LIZ_HONEY_WORK = Object.freeze([
  Object.freeze({ x: -37, z: -180, yaw: -Math.PI / 2, wait: 14 }),
  Object.freeze({ x: -37, z: -185, yaw: -Math.PI / 2, wait: 10 }),
  Object.freeze({ x: -35, z: -172, yaw: 1.1, wait: 8 }),
]);
const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const point = p => p && Number.isFinite(p.x) && Number.isFinite(p.z);
const finite = (n, min, max) => Number.isFinite(n) && n >= min && n <= max;

/** Use the cottage's real wall footprint for vision. Flowers, low fences, open frames and
 * the hundreds of tiny decorative prop colliders cannot become magical opaque walls. */
export function honeyLineOfSight(a, b) {
  const dx = b.x - a.x, dz = b.z - a.z;
  let lo = 0, hi = 1;
  for (const [start, delta, middle, half] of [[a.x, dx, LIZ_COTTAGE.x, LIZ_COTTAGE.width / 2],
    [a.z, dz, LIZ_COTTAGE.z, LIZ_COTTAGE.depth / 2]]) {
    if (Math.abs(delta) < 1e-9) { if (start <= middle - half || start >= middle + half) return true; }
    else { const p = (middle - half - start) / delta, q = (middle + half - start) / delta;
      lo = Math.max(lo, Math.min(p, q)); hi = Math.min(hi, Math.max(p, q)); }
  }
  return !(lo < hi && hi > .02 && lo < .98);
}

export function validateCubHoneySnapshot(value, { allowMissing = true } = {}) {
  if (value === undefined) return allowMissing;
  if (!value || value.version !== 1 || !validateCubHoneyQuestSnapshot(value.quest, { allowMissing: false })
    || typeof value.alerted !== 'boolean' || !finite(value.alertTime, 0, 3600)
    || !Number.isInteger(value.patrol) || value.patrol < 0 || value.patrol >= LIZ_HONEY_WORK.length
    || !finite(value.wait, -1, 14) || !point(value.liz) || !finite(value.liz.yaw, -Math.PI * 4, Math.PI * 4)) return false;
  return gap(value.liz, LIZ_STAND) < 35 && (!value.alerted || ['learning', 'carrying'].includes(value.quest.stage));
}

/** This host owns Liz's actual feet while she tends the lesson's apiary and walks home. The root owns
 * the cub, player input, spell retaliation, inventory rendering and checkpoint storage. */
export function createCubHoneyHost({ npc, liz, world, skills, inventory, position,
  sneaking = () => false, onCaught = () => {}, onCalm = () => {}, onChange = () => {},
  toast = () => {}, prepareCheckpoint = () => {}, isLizAlive = () => true,
  isCubAlive = () => true, busy = () => false } = {}) {
  const quest = createCubHoneyQuest({ onEvent: event => onChange(event) });
  const stealth = createStealth({ lineOfSight: honeyLineOfSight });
  let patrol = 0, wait = -1, taking = 0, alerted = false, alertTime = 0, restoreAlert = false;
  let suspicion = stealth.view(), near = null, entrySaved = false, xpClock = 0, previous = null;
  const lizFeet = () => liz?.actor?.group?.position ?? world.npcPositions[LIZ.id] ?? LIZ_STAND;
  const lizYaw = () => liz?.actor?.group?.rotation?.y ?? LIZ_STAND.yaw;
  const active = () => ['learning', 'carrying'].includes(quest.state().stage);
  const alive = () => isLizAlive() && isCubAlive();
  const returning = () => quest.completed && gap(lizFeet(), LIZ_STAND) > .015;
  const controls = () => (active() || returning()) && !alerted && alive();
  const state = () => ({ ...quest.state(), alerted, alertTime, taking: taking > 0, theftProgress: taking / HONEY_STORE.seconds,
    suspicion: suspicion.suspicion, visible: suspicion.visible, danger: suspicion.danger,
    patrol: { index: patrol, wait }, available: alive(), busy: active() && busy(), honey: { ...HONEY_STORE } });
  function snapshot() { return { version: 1, quest: quest.snapshot(), alerted, alertTime, patrol, wait,
    liz: { x: lizFeet().x, z: lizFeet().z, yaw: lizYaw() } }; }
  function syncPosition(p, yaw) {
    world.npcPositions[LIZ.id] = { x: p.x, z: p.z };
    if (liz?.actor?.group) { Object.assign(liz.actor.group.position, { x: p.x, z: p.z, y: world.heightAt(p.x, p.z) }); liz.actor.group.rotation.y = yaw; }
    if (liz) liz.face = { x: p.x + Math.sin(yaw) * 3, z: p.z + Math.cos(yaw) * 3 };
  }
  function restore(saved) {
    if (!validateCubHoneySnapshot(saved)) return false;
    quest.restore(saved?.quest); patrol = saved?.patrol ?? 0; wait = saved?.wait ?? -1;
    alerted = saved?.alerted ?? false; alertTime = saved?.alertTime ?? 0; restoreAlert = alerted;
    taking = 0; near = null; previous = null; entrySaved = false; xpClock = 0; suspicion = stealth.reset(position());
    if (saved && (active() || quest.completed) && isLizAlive()) syncPosition(saved.liz, saved.liz.yaw);
    if (liz) { liz.honeyTending = controls(); liz.honeyMotion = 0; }
    return true;
  }
  function calm() {
    const was = alerted; alerted = false; alertTime = 0; restoreAlert = false; taking = 0;
    suspicion = stealth.reset(position()); entrySaved = false;
    if (was) { onCalm(); onChange({ type: 'cub-honey-calm' }); } return was;
  }
  function catchThief(reason = 'Liz spotted you taking her honey.') {
    if (alerted || !active() || !alive() || busy()) return false;
    taking = 0; alerted = true; alertTime = 0; quest.caught();
    toast(`${reason} Run from the apiary!`, 'LIZ HAS SEEN YOU');
    onCaught({ liz, position: { ...lizFeet() }, target: 'player', swarms: 10 });
    return true;
  }
  function walkLiz(target, dt) {
    const feet = lizFeet();
    const before = { x: feet.x, z: feet.z };
    stepToward(feet, target, 1.05 * dt, world, BODY.person);
    const moved = gap(before, feet), yaw = moved > .001 ? Math.atan2(feet.x - before.x, feet.z - before.z) : lizYaw();
    liz.honeyMotion = dt ? moved / dt : 0; syncPosition(feet, yaw);
  }
  function tend(dt) {
    if (!liz || !controls()) return;
    if (quest.completed || busy()) {
      walkLiz(LIZ_STAND, dt);
      if (gap(lizFeet(), LIZ_STAND) <= .015) syncPosition(lizFeet(), LIZ_STAND.yaw);
      liz.honeyTending = controls(); return;
    }
    const feet = lizFeet(), target = LIZ_HONEY_WORK[patrol];
    // A cat-rescue interruption may have taken her home in the middle of a wait.
    // Walk back to that hive before continuing its remaining tending time.
    if (wait > 0 && gap(feet, target) <= .18) { wait = Math.max(0, wait - dt); syncPosition(feet, target.yaw); return; }
    if (wait === 0) { patrol = (patrol + 1) % LIZ_HONEY_WORK.length; wait = -1; return; }
    if (gap(feet, target) <= .18) { wait = target.wait; syncPosition(feet, target.yaw); return; }
    walkLiz(target, dt);
  }
  function frame(dt, { playing = true, talking = false, lizAlive = true, cubAlive = true } = {}) {
    const p = position(); near = null;
    if (!point(p)) return state();
    const enabled = alive() && lizAlive && cubAlive;
    if (liz) { liz.honeyTending = controls() && enabled; liz.honeyMotion = 0; }
    if (!playing || talking || !Number.isFinite(dt) || dt <= 0) {
      stealth.update({ dt: 0, position: p, paused: true }); previous = { ...p }; return state();
    }
    dt = Math.min(dt, .25);
    if (!enabled) { taking = 0; if (alerted) calm(); if (liz) { liz.honeyTending = false; liz.honeyMotion = 0; } return state(); }
    tend(dt);
    if (!active()) { suspicion = stealth.reset(p); previous = { ...p }; return state(); }
    if (restoreAlert) { restoreAlert = false; onCaught({ liz, position: { ...lizFeet() }, target: 'player', swarms: 10, restored: true }); }
    if (alerted) {
      alertTime = Math.min(3600, alertTime + dt);
      if (alertTime >= 12 && gap(p, HONEY_STORE) > 32) calm();
      previous = { ...p }; return state();
    }
    if (busy()) { taking = 0; suspicion = stealth.reset(p); previous = { ...p }; return state(); }
    // A normal visitor or someone who merely accepted the lesson remains welcome.
    // Trespass begins only in the private strip of hive stores, not on Liz's public approach.
    const privateStore = gap(p, HONEY_STORE) < 6.5;
    if (!entrySaved && gap(p, HONEY_STORE) < 20 && !privateStore) { prepareCheckpoint(); entrySaved = true; }
    const guard = { x: lizFeet().x, z: lizFeet().z, yaw: lizYaw(), range: 13 };
    const step = previous ? gap(p, previous) : 0;
    const noisy = privateStore && !sneaking() && step > dt * 2.8 && gap(p, guard) < 6;
    if (noisy) guard.yaw = Math.atan2(p.x - guard.x, p.z - guard.z);
    suspicion = stealth.update({ dt, position: p, sneaking: sneaking(), taught: skills.taught('stealth'), guards: privateStore ? [guard] : [] });
    previous = { ...p };
    if (suspicion.xp) { skills.gain('stealth', suspicion.xp); xpClock += dt; if (xpClock > 5) { xpClock = 0; onChange({ type: 'cub-stealth-practice' }); } }
    if (suspicion.caught) { catchThief(); return state(); }
    if (quest.state().stage === 'learning' && gap(p, HONEY_STORE) <= HONEY_STORE.reach) {
      near = { id: CUB_HONEY_SOURCE, questId: 'cub-honey', prompt: taking ? 'Quietly lifting the honeycomb...' : 'Steal a honeycomb for the cub' };
    }
    if (taking > 0) {
      if (!near || !sneaking() || step > .06) { taking = 0; toast('The comb is still in the hive. Stay crouched and still while lifting it.', 'HONEY STORES'); }
      else if (suspicion.visible) catchThief('Liz saw your hand in the hive.');
      else {
        taking = Math.min(HONEY_STORE.seconds, taking + dt);
        if (taking >= HONEY_STORE.seconds) {
          taking = 0;
          const ok = quest.collect({ source: CUB_HONEY_SOURCE, unseen: true, grant: () => inventory.add(CUB_HONEY_ITEM, 1) });
          if (ok) { near = null; toast('A stolen comb is in your satchel. Sneak out and return to the cub.', 'HONEY TAKEN'); }
          else toast('You cannot carry the comb yet. Make room and try again.', 'HONEY STORES');
        }
      }
    }
    return state();
  }
  function interact() {
    if (!near || !alive() || alerted || busy() || quest.state().stage !== 'learning') return false;
    if (taking > 0) return true;
    if (!sneaking() || suspicion.visible || suspicion.suspicion > STEALTH.clearAt) {
      catchThief('Liz caught you reaching for her honey.'); return true;
    }
    taking = .001; return true;
  }
  function conversation({ openDialogue, closeDialogue } = {}) {
    if (!npc) return false;
    const say = (lines, choices) => openDialogue(npc, lines, null, 'Back to the river', choices ? { choices } : undefined);
    if (!isCubAlive()) return false;
    if (!isLizAlive() && quest.state().stage !== 'complete') { say(['Liz is gone. I wanted honey, but not like this.']); return true; }
    if (alerted) { say(['Those bees look furious! Get well away from the hives and let Liz calm down first.']); return true; }
    const stage = quest.state().stage;
    if (['unmet', 'offered'].includes(stage)) {
      quest.offer();
      say(['Mum is very good at finding honey. I am very good at wanting more of it. Liz has a whole row of hives across the river.',
        'Could you sneak me one comb? I can show you how to be quiet. Mum says she used to be brilliant at it before she became a great big bear. I am still small enough to practise.',
        'This is stealing, mind. Watch which way Liz is looking. If she catches you, her bees will make a very strong argument.'], [
        { id: 'cub-honey-yes', label: "Teach me Stealth. I'll try to bring you a comb.", action() {
          if (quest.accept({ teach: () => skills.learn('stealth').ok })) {
            say(['Press X to crouch and sneak. Cross the bridge, go around the far side of the cottage, and watch Liz tending the hives.',
              'The northern wooden hive has the comb I want. Wait until she is looking away. Press F beside it, then stay crouched and still while you lift it. Bring it back to me.']);
          }
        } },
        { id: 'cub-honey-no', label: 'Not now.', action: () => closeDialogue() },
      ]);
    } else if (stage === 'learning') say(busy()
      ? ['Liz is waiting for her cat. Help her get home safely first; we can practise sneaking when Liz is back tending the hives.']
      : ['The northern wooden hive, across the river. X to sneak, F to lift the comb. Wait for Liz to look away, then stay still. Please do not hurt her.']);
    else if (stage === 'carrying') say(['You did it! I knew you could be quiet. Is that comb for me?'], [
      { id: 'cub-honey-give', label: 'Give the stolen honeycomb to the cub.', action() {
        if (quest.deliver({ take: () => inventory.remove(CUB_HONEY_ITEM, 1), reward: xp => skills.gain('stealth', xp) })) {
          say(['Oh, that is lovely. Thank you! Being quiet really does pay off.', 'I will wait for Mum here. When her race and my little adventure are both done, we can go looking for honey together.']);
        } else say(['That particular comb is not in your satchel. The lesson was to take one quietly from the hive.']);
      } }, { id: 'cub-honey-later', label: 'A moment.', action: () => closeDialogue() },
    ]);
    else say(['Thank you for the honey. Next time, perhaps we should ask. Mum and I have a lot of woodland to explore.']);
    return true;
  }
  return { quest, state, snapshot, restore, frame, interact, conversation, calm, catchThief,
    interaction: () => near, get nearby() { return near; }, get awareness() { return { ...suspicion, label: "Liz's suspicion" }; },
    get controlsLiz() { return Boolean(liz?.honeyTending); } };
}
