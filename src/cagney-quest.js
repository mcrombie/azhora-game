import { ambronPoint } from './region-world.js';
import { CALOSS_PROPHET_STAND, CALOSS_ELAGOS_ROAD, OSSEN_TRACK } from './elagos-world.js';

const point = (x, z) => Object.freeze({ x, z });
export const CAGNEY = Object.freeze({
  id: 'cagney', name: 'Cagney', role: 'A traveler on her way home', modelRole: 'villager', color: 0x8294a6,
  look: Object.freeze({ slight: true, beard: false, hat: false, glasses: true,
    hair: 0x171310, hairStyle: 'long', straightHair: true, shirtRibbons: true }),
});
export const CAGNEY_START = point(CALOSS_PROPHET_STAND.x - 4, CALOSS_PROPHET_STAND.z - 2);
// The existing clerks' house, reached through the Ossen Gate and the upper lane.
export const CAGNEY_HOME = Object.freeze({ ...ambronPoint(84, -37), id: 'cagney-home', name: "Cagney's home" });
export const CAGNEY_ROUTE = Object.freeze([
  ...CALOSS_ELAGOS_ROAD, ...OSSEN_TRACK.slice(0, -1).reverse(),
  ambronPoint(80, -6), ambronPoint(56, -6), ambronPoint(56, -40), ambronPoint(84, -40), CAGNEY_HOME,
].map(p => point(p.x, p.z)));
export const CAGNEY_QUEST = Object.freeze({ id: 'cagney-escort', title: 'Cagney and the Cagnappers', reward: 45, pace: 2.8 });
export const CAGNAPPERS = Object.freeze([
  { id: 'cagnapper-1', x: -946, z: 196 }, { id: 'cagnapper-2', x: -943, z: 206 }, { id: 'cagnapper-3', x: -941, z: 210 },
].map((p, i) => Object.freeze({ ...p, name: 'Cagnapper', kind: 'rebel', hp: 48,
  model: Object.freeze({ role: 'mercenary', tunic: [0x5d6548, 0x6b5945, 0x4f6259][i], look: Object.freeze({ hat: false }) }) })));
export const CAGNEY_AMBUSH = Object.freeze({
  id: 'cagnapper-ambush', center: point(-940, 202.33), checkpoint: point(-918, 202.1),
  retreatAxis: 'x', retreatLine: -909, enemies: CAGNAPPERS,
});
const stages = ['unmet', 'asked', 'escorting', 'ambushed', 'home', 'complete', 'captured', 'dead'];
const validPoint = p => Number.isFinite(p?.x) && Number.isFinite(p?.z);
const fresh = () => ({ version: 1, stage: 'unmet', ambushCleared: false, hp: 85,
  enemies: CAGNAPPERS.map(e => e.hp), walk: { ...CAGNEY_START, waypoint: 0, waiting: false } });
export function validateCagneySnapshot(s) {
  if (!s || s.version !== 1 || !stages.includes(s.stage) || typeof s.ambushCleared !== 'boolean'
    || !Number.isFinite(s.hp) || s.hp < 0 || s.hp > 85
    || !Array.isArray(s.enemies) || s.enemies.length !== 3
    || !s.enemies.every((hp, i) => Number.isFinite(hp) && hp >= 0 && hp <= CAGNAPPERS[i].hp)
    || !validPoint(s.walk) || !Number.isInteger(s.walk.waypoint) || s.walk.waypoint < 0
    || s.walk.waypoint >= CAGNEY_ROUTE.length || typeof s.walk.waiting !== 'boolean') return false;
  if (s.ambushCleared !== s.enemies.every(hp => hp === 0)) return false;
  if (!['captured', 'dead'].includes(s.stage) && s.hp <= 0) return false;
  if (['home', 'complete'].includes(s.stage) && (!s.ambushCleared || s.hp <= 0)) return false;
  if (['captured', 'dead'].includes(s.stage) && s.hp !== 0) return false;
  return true;
}
export function createCagneyQuest({ onEvent = () => {} } = {}) {
  let state = fresh();
  const snapshot = () => ({ ...state, enemies: [...state.enemies], walk: { ...state.walk } });
  const ended = () => ['complete', 'captured', 'dead'].includes(state.stage);
  function ask() { if (state.stage !== 'unmet') return false; state.stage = 'asked'; return true; }
  function accept() {
    if (!['unmet', 'asked'].includes(state.stage)) return false;
    state.stage = 'escorting'; onEvent({ type: 'cagney-accepted' }); return true;
  }
  function rememberWalk(walk) {
    if (!validateCagneySnapshot({ ...snapshot(), walk })) return false;
    state.walk = { ...walk }; return true;
  }
  function begin() {
    if (state.stage !== 'escorting' || state.ambushCleared) return false;
    state.stage = 'ambushed'; onEvent({ type: 'cagney-ambushed' }); return true;
  }
  function rememberBattle({ hp, enemies }) {
    if (state.stage !== 'ambushed') return false;
    const next = { ...snapshot(), hp, enemies: [...enemies], ambushCleared: enemies.every(n => n === 0) };
    if (!validateCagneySnapshot(next)) return false;
    state = next; return true;
  }
  function rememberEnemies(enemies) {
    const next = { ...snapshot(), enemies: [...enemies], ambushCleared: enemies.every(n => n === 0) };
    if (!validateCagneySnapshot(next)) return false;
    state = next; return true;
  }
  function settle({ hp = state.hp, enemies = state.enemies, dead = false } = {}) {
    if (ended() || !['ambushed', 'escorting'].includes(state.stage)) return false;
    const next = { ...snapshot(), hp, enemies: [...enemies], ambushCleared: enemies.every(n => n === 0),
      stage: hp <= 0 ? dead ? 'dead' : 'captured' : 'escorting' };
    if (!validateCagneySnapshot(next)) return false;
    state = next; onEvent({ type: `cagney-${state.stage}`, cleared: state.ambushCleared }); return true;
  }
  function died() {
    if (ended()) return false; state.hp = 0; state.stage = 'dead'; onEvent({ type: 'cagney-dead' }); return true;
  }
  function arrive(position) {
    if (state.stage !== 'escorting' || !state.ambushCleared || !validPoint(position)
      || Math.hypot(position.x - CAGNEY_HOME.x, position.z - CAGNEY_HOME.z) > 2.5) return false;
    state.stage = 'home'; onEvent({ type: 'cagney-home' }); return true;
  }
  function take() {
    if (state.stage !== 'home') return 0;
    state.stage = 'complete'; onEvent({ type: 'cagney-complete', money: CAGNEY_QUEST.reward }); return CAGNEY_QUEST.reward;
  }
  function restore(saved) {
    if (saved === undefined) { state = fresh(); return true; }
    if (!validateCagneySnapshot(saved)) return false;
    state = { ...saved, enemies: [...saved.enemies], walk: { ...saved.walk } };
    if (state.stage === 'ambushed') state.stage = 'escorting';
    return true;
  }
  function trackableView() {
    return { id: CAGNEY_QUEST.id, title: CAGNEY_QUEST.title, type: 'secondary', stage: state.stage,
      active: ['escorting', 'ambushed', 'home'].includes(state.stage), complete: ended(),
      detail: state.stage === 'home' ? 'Speak to Cagney at her home to receive your reward.'
        : state.stage === 'ambushed' ? 'Protect Cagney from the three cagnappers.'
          : 'Escort Cagney west along the road through Elagos to her home in Ambron. Stay close; she waits if you fall behind.',
      destinationIds: [CAGNEY.id] };
  }
  return { ask, accept, rememberWalk, rememberBattle, rememberEnemies, begin, settle, died, arrive, take, restore, snapshot, trackableView,
    get state() { return { ...snapshot(), over: ended() }; } };
}

export function cagneyGuideTarget(position, player, progress = {}) {
  let waypoint = Math.max(0, Math.min(CAGNEY_ROUTE.length - 1, progress.waypoint ?? 0));
  while (waypoint < CAGNEY_ROUTE.length - 1 && Math.hypot(position.x - CAGNEY_ROUTE[waypoint].x, position.z - CAGNEY_ROUTE[waypoint].z) < 1) waypoint++;
  const gap = Math.hypot(position.x - player.x, position.z - player.z), waiting = progress.waiting ? gap > 7 : gap > 12;
  const target = CAGNEY_ROUTE[waypoint];
  return { target: waiting ? position : target, pace: CAGNEY_QUEST.pace,
    progress: { x: position.x, z: position.z, waypoint, waiting },
    arrived: waypoint === CAGNEY_ROUTE.length - 1 && Math.hypot(position.x - target.x, position.z - target.z) < 1 };
}
