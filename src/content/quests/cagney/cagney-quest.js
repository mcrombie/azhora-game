import { ambronPoint } from '../../../world/terrain/region-world.js';
import { CALOSS_PROPHET_STAND, CALOSS_ELAGOS_ROAD, OSSEN_TRACK } from '../../regions/ambron/elagos-world.js';

const point = (x, z) => Object.freeze({ x, z });
export const CAGNEY = Object.freeze({
  id: 'cagney', name: 'Cagney', role: 'A traveler on her way home', modelRole: 'villager', color: 0x8294a6,
  look: Object.freeze({ slight: true, beard: false, hat: false, glasses: true,
    hair: 0x171310, hairStyle: 'long', straightHair: true, shirtRibbons: true }),
});
export const CAGNEY_START = point(-922,194);
export { CAGNEY_ROADSIDE_HAMLET as CAGNEY_HAMLET } from '../../regions/ambron/ambron-city-layout.js';
// The existing clerks' house, reached through the Ossen Gate and the upper lane.
export const CAGNEY_HOME = Object.freeze({ ...ambronPoint(22, -40), id: 'cagney-home', name: "Cagney's home" });
export const CAGNEY_ROUTE = Object.freeze([
  point(-922,202),...CALOSS_ELAGOS_ROAD.slice(7),...OSSEN_TRACK.slice(0,-1).reverse(),
  ambronPoint(115,132),ambronPoint(120,120),ambronPoint(70,120),ambronPoint(0,120),ambronPoint(-20,110),
  ambronPoint(-20,80),ambronPoint(-5,35),ambronPoint(-5,-42),ambronPoint(22,-42),CAGNEY_HOME,
].map(p=>point(p.x,p.z)));
/**
 * She goes home at a run (the user, 26 September 2026): a little slower than the traveler's own
 * run of 7.2, so she is faster than anybody walking with her and a traveler who runs can always
 * catch her up.
 */
export const CAGNEY_QUEST = Object.freeze({ id: 'cagney-escort', title: 'Cagney and the Cagnappers', reward: 45, pace: 6.4 });
/**
 * She fights back (the user, 26 September 2026), and without the traveler three cagnappers kill her
 * in about eleven seconds; with him she comes through a gang with some of this left, and binds her
 * cuts before the next stretch of road, so each gang meets her whole. (At 100 the escort autoplay,
 * fighting beside her, lost her to the middle gang two runs in three.)
 */
export const CAGNEY_HEALTH = 150;

// ---------------------------------------------------------------------------
// The road, measured
// ---------------------------------------------------------------------------
const RUNS = (() => {
  const runs = [0];
  for (let i = 1; i < CAGNEY_ROUTE.length; i++) runs.push(runs[i - 1] + Math.hypot(CAGNEY_ROUTE[i].x - CAGNEY_ROUTE[i - 1].x, CAGNEY_ROUTE[i].z - CAGNEY_ROUTE[i - 1].z));
  return runs;
})();
/** How far along the road a point lies, measured to its nearest point on it. */
function arcOf(p) {
  let best = { distance: Infinity, arc: 0 };
  for (let i = 1; i < CAGNEY_ROUTE.length; i++) {
    const a = CAGNEY_ROUTE[i - 1], b = CAGNEY_ROUTE[i], dx = b.x - a.x, dz = b.z - a.z, length2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / length2));
    const distance = Math.hypot(a.x + dx * t - p.x, a.z + dz * t - p.z);
    if (distance < best.distance) best = { distance, arc: RUNS[i - 1] + Math.sqrt(length2) * t };
  }
  return best.arc;
}
/** The point that far along the road, the way she is going there, and the waypoint after it. */
function alongRoad(arc) {
  let i = 1; while (i < RUNS.length - 1 && RUNS[i] < arc) i++;
  const a = CAGNEY_ROUTE[i - 1], b = CAGNEY_ROUTE[i], length = RUNS[i] - RUNS[i - 1] || 1, t = (arc - RUNS[i - 1]) / length;
  return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, dx: (b.x - a.x) / length, dz: (b.z - a.z) / length, next: i };
}

// ---------------------------------------------------------------------------
// The cagnappers: three waves of them
// ---------------------------------------------------------------------------
const TUNICS = [0x5d6548, 0x6b5945, 0x4f6259];
/**
 * They break from cover one after another, not all at once (`entry`, src/gameplay/combat/combat.js), as the
 * goblins of the first raid do. All three on her together killed her in under five seconds, before
 * the traveler beside her could do anything about it; one at a time, he can.
 */
const BREAK = [.3, 1.8, 3.3];
const gang = (ids, stands) => stands.map((p, i) => Object.freeze({ id: ids[i], x: p.x, z: p.z, name: 'Cagnapper', kind: 'rebel', hp: 48, entry: BREAK[i],
  model: Object.freeze({ role: 'mercenary', tunic: TUNICS[i], look: Object.freeze({ hat: false }) }) }));

/**
 * **Two more waves** (the user, 26 September 2026): "one midway between the start and the current
 * attack and one midway between the current attack and the end". Each is laid out exactly as the
 * first gang is, turned to the road where it stands: two in cover on one side and one on the other,
 * the retry point twenty-two metres back up the road and the retreat line thirty-one.
 */
function waveAt(id, ids, arc) {
  const p = alongRoad(arc), d = { x: p.dx, z: p.dz }, n = { x: d.z, z: -d.x };
  const at = (a, b) => point(p.x + d.x * a + n.x * b, p.z + d.z * a + n.z * b);
  const axis = Math.abs(d.x) >= Math.abs(d.z) ? 'x' : 'z';
  return Object.freeze({ id, center: point(p.x, p.z), checkpoint: at(-22, 0), retreatAxis: axis, retreatSign: -Math.sign(d[axis]),
    retreatLine: p[axis] - Math.sign(d[axis]) * 31, forward: Object.freeze({ dx: d.x, dz: d.z }),
    enemies: Object.freeze(gang(ids, [at(6, -7.3), at(-3, -8.3), at(3, 7.7)])) });
}
// All three attacks occur after accepting at the wayside hamlet and before the
// capital's gate. Moving the city must not leave a gang waiting inside its market.
export const CAGNEY_AMBUSH = waveAt('cagnapper-ambush',['cagnapper-1','cagnapper-2','cagnapper-3'],76);
export const CAGNAPPERS = CAGNEY_AMBUSH.enemies;
export const CAGNEY_WAVES = Object.freeze([
  waveAt('cagnapper-ambush-first',['cagnapper-a1','cagnapper-a2','cagnapper-a3'],30),
  CAGNEY_AMBUSH,
  waveAt('cagnapper-ambush-last',['cagnapper-c1','cagnapper-c2','cagnapper-c3'],123),
].map((wave,index)=>Object.freeze({...wave,index,waypoint:alongRoad(arcOf(wave.center)+.01).next})));
export const ALL_CAGNAPPERS = Object.freeze(CAGNEY_WAVES.flatMap(wave => wave.enemies));
export const cagneyWave = id => CAGNEY_WAVES.find(wave => wave.id === id) ?? null;

// ---------------------------------------------------------------------------
// The quest
// ---------------------------------------------------------------------------
/**
 * `wave` is how many of the three gangs are beaten, so it is also which one is next; `enemies` is
 * that gang's health. When a gang is beaten the next one's full health takes its place, and after
 * the third there is nobody left: all three at nought is the road clear (`ambushCleared`).
 */
const stages = ['unmet', 'asked', 'escorting', 'ambushed', 'home', 'complete', 'captured', 'dead'];
const WAVES = CAGNEY_WAVES.length;
const FULL = () => CAGNEY_WAVES[0].enemies.map(e => e.hp);
const validPoint = p => Number.isFinite(p?.x) && Number.isFinite(p?.z);
const fresh = () => ({ version: 2, layoutVersion: 2, stage: 'unmet', wave: 0, hp: CAGNEY_HEALTH, enemies: FULL(), walk: { ...CAGNEY_START, waypoint: 0, waiting: false } });
const allDown = enemies => enemies.every(hp => hp === 0);

/** The first saves had one gang; theirs becomes the middle one, and where she had got to decides the rest. */
function upgrade(s) {
  if (!s || s.version !== 1) return s;
  if (!stages.includes(s.stage) || typeof s.ambushCleared !== 'boolean' || !Array.isArray(s.enemies) || !validPoint(s.walk)) return null;
  if (s.ambushCleared !== allDown(s.enemies)) return null;
  const { ambushCleared, ...rest } = s;
  const passed = wave => Number.isInteger(s.walk.waypoint) && s.walk.waypoint >= CAGNEY_WAVES[wave].waypoint;
  let wave, enemies;
  if (['home', 'complete'].includes(s.stage) || (ambushCleared && passed(2))) { wave = WAVES; enemies = [0, 0, 0]; }
  else if (ambushCleared) { wave = 2; enemies = FULL(); }
  else if (['captured', 'dead'].includes(s.stage) || passed(0)) { wave = 1; enemies = [...s.enemies]; }
  else { wave = 0; enemies = FULL(); }
  return { ...rest, version: 2, wave, enemies };
}

export function validateCagneySnapshot(saved) {
  const s = upgrade(saved);
  if (!s || s.version !== 2 || !stages.includes(s.stage) || !Number.isInteger(s.wave) || s.wave < 0 || s.wave > WAVES
    || !Number.isFinite(s.hp) || s.hp < 0 || s.hp > CAGNEY_HEALTH
    || !Array.isArray(s.enemies) || s.enemies.length !== 3
    || !s.enemies.every((hp, i) => Number.isFinite(hp) && hp >= 0 && hp <= CAGNEY_WAVES[0].enemies[i].hp)
    || !validPoint(s.walk) || !Number.isInteger(s.walk.waypoint) || s.walk.waypoint < 0
    || s.walk.waypoint >= CAGNEY_ROUTE.length || typeof s.walk.waiting !== 'boolean') return false;
  const failed = ['captured', 'dead'].includes(s.stage);
  // The road is clear exactly when all three gangs are down. A gang beaten mid-fight waits for the
  // fight to end before the next is counted, and a failed escort keeps whatever it had.
  if (s.wave === WAVES && !allDown(s.enemies)) return false;
  if (s.wave < WAVES && allDown(s.enemies) && s.stage !== 'ambushed' && !failed) return false;
  if (!failed && s.hp <= 0) return false;
  if (['home', 'complete'].includes(s.stage) && (s.wave !== WAVES || s.hp <= 0)) return false;
  if (failed && s.hp !== 0) return false;
  return true;
}

export function createCagneyQuest({ onEvent = () => {} } = {}) {
  let state = fresh();
  const snapshot = () => ({ ...state, enemies: [...state.enemies], walk: { ...state.walk } });
  const ended = () => ['complete', 'captured', 'dead'].includes(state.stage);
  const cleared = () => state.wave >= WAVES;
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
    if (state.stage !== 'escorting' || cleared()) return false;
    state.stage = 'ambushed'; onEvent({ type: 'cagney-ambushed', wave: state.wave }); return true;
  }
  function rememberBattle({ hp, enemies }) {
    if (state.stage !== 'ambushed') return false;
    const next = { ...snapshot(), hp, enemies: [...enemies] };
    if (!validateCagneySnapshot(next)) return false;
    state = next; return true;
  }
  function rememberEnemies(enemies) {
    const next = { ...snapshot(), enemies: [...enemies] };
    if (!validateCagneySnapshot(next)) return false;
    state = next; return true;
  }
  /**
   * A fight is over: she is down, or on her feet with the gang's health as it ended. A beaten gang
   * lets the next one in, and she binds her cuts before she meets it.
   */
  function settle({ hp = state.hp, enemies = state.enemies, dead = false } = {}) {
    if (ended() || !['ambushed', 'escorting'].includes(state.stage)) return false;
    const beaten = allDown(enemies), lost = hp <= 0;
    const wave = beaten && !lost ? state.wave + 1 : state.wave;
    const next = { ...snapshot(), hp: beaten && !lost ? CAGNEY_HEALTH : hp, wave,
      enemies: beaten && !lost ? (wave >= WAVES ? [0, 0, 0] : FULL()) : [...enemies],
      stage: lost ? dead ? 'dead' : 'captured' : 'escorting' };
    if (!validateCagneySnapshot(next)) return false;
    state = next; onEvent({ type: `cagney-${state.stage}`, cleared: cleared(), wave: state.wave, beaten: beaten && !lost }); return true;
  }
  function died() {
    if (ended()) return false; state.hp = 0; state.stage = 'dead'; onEvent({ type: 'cagney-dead' }); return true;
  }
  function arrive(position) {
    if (state.stage !== 'escorting' || !cleared() || !validPoint(position)
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
    const s = upgrade(saved);
    state = { ...s, enemies: [...s.enemies], walk: { ...s.walk } };
    if (state.stage === 'ambushed') {
      state.stage = 'escorting';
      // Saved in the moment the last of a gang went down: that gang is beaten.
      if (allDown(state.enemies) && state.wave < WAVES) { state.wave++; state.hp = CAGNEY_HEALTH; state.enemies = state.wave >= WAVES ? [0, 0, 0] : FULL(); }
    }
    return true;
  }
  function trackableView() {
    const gangs = Math.min(state.wave + 1, WAVES);
    return { id: CAGNEY_QUEST.id, title: CAGNEY_QUEST.title, type: 'secondary', stage: state.stage,
      active: ['escorting', 'ambushed', 'home'].includes(state.stage), complete: ended(),
      detail: state.stage === 'home' ? 'Speak to Cagney at her home to receive your reward.'
        : state.stage === 'ambushed' ? `Protect Cagney from the cagnappers (gang ${gangs} of ${WAVES}). They are after her, not you.`
          : `Escort Cagney west along the road through Elagos to her home in Ambron. She runs; keep up with her. ${cleared() ? 'The road is clear.' : `${WAVES - state.wave} ${WAVES - state.wave === 1 ? 'gang of cagnappers is' : 'gangs of cagnappers are'} still waiting on the road.`}`,
      destinationIds: [CAGNEY.id] };
  }
  return { ask, accept, rememberWalk, rememberBattle, rememberEnemies, begin, settle, died, arrive, take, restore, snapshot, trackableView,
    get state() { return { ...snapshot(), over: ended(), ambushCleared: cleared(), currentWave: cleared() ? null : CAGNEY_WAVES[state.wave] }; } };
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
