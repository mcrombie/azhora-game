/** Kayla's own honey rounds. Pure state and dialogue; the host supplies collision movement. */
import { MAIN_ROAD, WORLD_BOUNDS, regionAt } from './region-world.js';
import { PUETH_ROAD, HIDEOUT_APPROACH_TRAIL, LIZ_HOME_PATHS } from './pueth-world.js';
import { CALOSS_BRIDGE } from './world-terrain.js';

export const KAYLA_VERSION = 1;
export const KAYLA_RADIUS = .8;
export const KAYLA_SPEED = 2.2;
export const KAYLA = Object.freeze({
  id: 'kayla', name: 'Kayla', role: 'A very large bear looking for honey',
  species: 'bear', modelRole: 'kayla', maxHp: 450, talk: 4.6,
});

const point = (at, extra = {}) => Object.freeze({ x: at.x, z: at.z, ...(at.swim ? { swim: true } : {}), ...extra });
// Use both banks of the Tessen bridge and the actual path into Liz's yard. The visitor's
// place is beside Liz, clear of her body, her bench, her mailbox and the cottage porch.
const toLiz = [
  ...PUETH_ROAD.slice(0, 10), ...HIDEOUT_APPROACH_TRAIL.slice(0, 4),
  ...LIZ_HOME_PATHS[0].slice(1, 3), { x: -33.4, z: -169 },
];
const crossingPoint = along => point({
  x: CALOSS_BRIDGE.crossing.x + CALOSS_BRIDGE.axis.x * along + CALOSS_BRIDGE.side.x * 8,
  z: CALOSS_BRIDGE.crossing.z + CALOSS_BRIDGE.axis.z * along + CALOSS_BRIDGE.side.z * 8,
}, { swim: true });
// The Caloss bridge starts broken. A bear can swim the narrow river beside it without
// depending on the traveler repairing it; the Tessen is always crossed on its sound deck.
export const KAYLA_RIVER_CROSSING = Object.freeze([-23, -12, 0, 12, 23].map(crossingPoint));
/** The host may allow swimming here only, retaining every solid collider. */
export function kaylaMaySwim(x, z) {
  const dx = x - CALOSS_BRIDGE.crossing.x, dz = z - CALOSS_BRIDGE.crossing.z;
  const along = dx * CALOSS_BRIDGE.axis.x + dz * CALOSS_BRIDGE.axis.z;
  const across = dx * CALOSS_BRIDGE.side.x + dz * CALOSS_BRIDGE.side.z;
  return Math.abs(along) <= 28 && across >= 4.5 && across <= 12;
}
/** A navigation-only surface: the renderer still uses real ground/water for her height. */
export function kaylaNavigationWorld(world) {
  return {
    get bounds() { return world.bounds; },
    get colliders() { return world.colliders; },
    waterAt: (x, z) => world.waterAt?.(x, z) ?? .45,
    heightAt: (x, z) => kaylaMaySwim(x, z)
      ? Math.max(world.heightAt(x, z), world.waterAt?.(x, z) ?? .45) : world.heightAt(x, z),
    nearColliders: (x, z, reach, out) => world.nearColliders
      ? world.nearColliders(x, z, reach, out) : [...world.colliders],
  };
}
const toLuscia = [...MAIN_ROAD.slice(13, 20), ...KAYLA_RIVER_CROSSING, ...MAIN_ROAD.slice(21, 25)];
export const KAYLA_ROUTE = Object.freeze([
  point(MAIN_ROAD[12], { stop: 'drent', name: "Drent's woodland road", wait: 28 }),
  ...toLiz.slice(0, -1).map(p => point(p)),
  point(toLiz.at(-1), { stop: 'liz', name: "Liz's clearing in Pueth", wait: 32 }),
  ...toLiz.slice(0, -1).reverse().map(p => point(p)),
  ...toLuscia.slice(0, -1).map(p => point(p)),
  point(toLuscia.at(-1), { stop: 'luscia', name: 'The road through Luscia', wait: 24 }),
  ...toLuscia.slice(0, -1).reverse().map(p => point(p)),
]);
export const KAYLA_START = point(KAYLA_ROUTE[0], { yaw: -Math.PI / 2 });

const count = value => Number.isInteger(value) && value >= 0 && value <= 1e6;
const duration = value => Number.isFinite(value) && value >= 0 && value <= 60;
const validPosition = p => p && Number.isFinite(p.x) && Number.isFinite(p.z)
  && p.x >= WORLD_BOUNDS.minX && p.x <= WORLD_BOUNDS.maxX
  && p.z >= WORLD_BOUNDS.minZ && p.z <= WORLD_BOUNDS.maxZ;

export function validateKaylaSnapshot(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  return !!data && typeof data === 'object' && !Array.isArray(data) && data.version === KAYLA_VERSION
    && validPosition(data.position) && Number.isInteger(data.next) && data.next >= 0 && data.next < KAYLA_ROUTE.length
    && duration(data.wait) && duration(data.honey) && typeof data.met === 'boolean'
    && count(data.gifts) && count(data.lizVisits) && count(data.lizGifts) && data.lizGifts <= data.lizVisits
    && count(data.loops) && ['drent', 'liz', 'luscia', null].includes(data.stop)
    && (data.provoked === undefined || typeof data.provoked === 'boolean');
}

export function createKayla({ onEvent = () => {} } = {}) {
  // The position object remains stable across frames AND restore. stepToward keeps local
  // detours in a WeakMap keyed by this object, so recreating it would strand her at props.
  const position = { x: KAYLA_START.x, z: KAYLA_START.z };
  let next = 1, wait = 28, honey = 0, met = false, gifts = 0, lizVisits = 0, lizGifts = 0, loops = 0, stop = 'drent';
  let walking = false;
  const state = () => ({ position: { ...position }, next, wait, honey, met, gifts, lizVisits, lizGifts, loops, stop,
    walking, action: walking ? 'walking' : honey > 0 ? 'honey' : wait > 0 ? 'resting' : 'idle',
    region: regionAt(position.x, position.z)?.name ?? 'Drent', destination: KAYLA_ROUTE[next] });
  const snapshot = () => ({ version: KAYLA_VERSION, position: { ...position }, next, wait, honey, met, gifts, lizVisits, lizGifts, loops, stop });
  function restore(data) {
    if (data === undefined) data = { version: KAYLA_VERSION, position: KAYLA_START, next: 1, wait: 28, honey: 0,
      met: false, gifts: 0, lizVisits: 0, lizGifts: 0, loops: 0, stop: 'drent' };
    if (!validateKaylaSnapshot(data, { allowMissing: false })) return false;
    position.x = data.position.x; position.z = data.position.z;
    ({ next, wait, honey, met, gifts, lizVisits, lizGifts, loops, stop } = data);
    walking = false;
    return true;
  }
  function meet() {
    const first = !met; met = true;
    if (first) onEvent({ type: 'kayla-met' });
    return { first };
  }
  /** Called only after choosing the gift. Liz's visits never touch this callback or inventory. */
  function giveHoney({ take = () => false } = {}) {
    if (!take()) return { ok: false, reason: 'There is no honeycomb in your satchel.' };
    gifts = Math.min(1e6, gifts + 1); honey = 12; wait = Math.max(wait, 12);
    onEvent({ type: 'kayla-honey-gift', gifts });
    return { ok: true, reason: 'Kayla takes the comb between two claws with extraordinary care.' };
  }
  /**
   * Real elapsed playing time, independent of camera/player distance. move mutates position
   * through the world's collision navigator. A blocked step leaves the route cursor intact.
   * Death, combat, conversation and pause freeze her rounds; no clock catches her up by warp.
   */
  function tick(dt, { paused = false, alive = true, engaged = false, lizAlive = true, move } = {}) {
    walking = false;
    if (!Number.isFinite(dt) || dt <= 0 || paused || !alive || engaged) return state();
    dt = Math.min(dt, .25);
    honey = Math.max(0, honey - dt);
    if (wait > 0) { wait = Math.max(0, wait - dt); return state(); }
    const target = KAYLA_ROUTE[next];
    if (Math.hypot(target.x - position.x, target.z - position.z) > .12) {
      if (typeof move !== 'function') return state();
      const beforeX = position.x, beforeZ = position.z;
      move(position, target, KAYLA_SPEED * dt);
      walking = Math.hypot(position.x - beforeX, position.z - beforeZ) > .001;
    }
    if (Math.hypot(target.x - position.x, target.z - position.z) <= .12) {
      stop = target.stop ?? null; wait = target.wait ?? 0;
      if (next === 0) loops = Math.min(1e6, loops + 1);
      next = (next + 1) % KAYLA_ROUTE.length;
      if (stop === 'liz') {
        lizVisits = Math.min(1e6, lizVisits + 1);
        // Liz offers a little honey every other visit, when she is here to offer it.
        if (lizAlive && lizVisits % 2 === 1) {
          lizGifts = Math.min(1e6, lizGifts + 1); honey = 18;
          onEvent({ type: 'kayla-liz-honey', visits: lizVisits,
            text: 'Liz hands Kayla a little honeycomb. Kayla thanks her and settles down to enjoy it.' });
        }
      }
      if (stop) onEvent({ type: 'kayla-stop', stop, loops });
    }
    return state();
  }
  return { position, state, snapshot, restore, meet, giveHoney, tick };
}

export const KAYLA_LINES = Object.freeze({
  greeting: 'Oh, hello. I am Kayla. Do mind your toes; I have rather a lot of feet. You look as though you could use a quiet minute.',
  honey: 'I follow the flowers through Drent, Pueth and Luscia. Then I follow the bees. Then, if everybody agrees, there is honey. A very good system.',
  liz: 'Liz sometimes saves me a little comb when I visit her clearing in Pueth. I ask first. They are her bees, and being bigger than the beekeeper does not make them mine.',
  strength: 'Yes, I am quite strong. It is useful when a branch falls across the path. It is more useful if I remember that most things are much smaller than I am.',
  home: 'Drent has good shade, Pueth has Liz, and Luscia has whole hillsides of flowers. I walk between them. There is always something worth stopping for.',
  farewell: 'Take your time on the road, dear. A person need not hurry just because their legs are smaller.',
});

/** Optional conversation and optional honey gift; speaking never starts a player quest. */
export function kaylaConversation(npc, context) {
  if (npc?.id !== KAYLA.id) return false;
  const { kayla, openDialogue, closeDialogue, hasHoney = false, takeHoney = () => false, onChange = () => {} } = context;
  const first = kayla.meet().first;
  const back = () => kaylaConversation(npc, context);
  const ask = (id, label, lines) => ({ id, label, action: () => openDialogue(npc, lines, null, 'Back to Kayla', { onComplete: back }) });
  const choices = [
    ask('kayla-honey', 'What are you looking for?', [KAYLA_LINES.honey, KAYLA_LINES.liz]),
    ask('kayla-home', 'Where do you live?', [KAYLA_LINES.home]),
    ask('kayla-strength', 'You look very strong.', [KAYLA_LINES.strength]),
  ];
  if (typeof hasHoney === 'function' ? hasHoney() : hasHoney) choices.push({
    id: 'kayla-give-honey', label: 'Give her a honeycomb.', action: () => {
      const result = kayla.giveHoney({ take: takeHoney });
      if (result.ok) onChange();
      openDialogue(npc, result.ok ? [result.reason, 'For me? Thank you, dear. That is a lovely thing to do. I shall make it last. Well. I shall try.']
        : [result.reason], null, 'Back to Kayla', { onComplete: back });
    },
  });
  choices.push({ id: 'leave-kayla', label: 'Wish her a good walk.', action: closeDialogue });
  openDialogue(npc, [first ? KAYLA_LINES.greeting : kayla.state().honey > 0
    ? 'Hello again, dear. Forgive me if I am a little sticky. It has been an excellent day.'
    : 'Hello again. Come and rest your feet a moment, if you like. I am in no great hurry.'], null, 'Talk with Kayla', { choices });
  return true;
}
