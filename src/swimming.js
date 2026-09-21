/**
 * Swimming: walking on water at a fraction of walking speed while your wind runs
 * down, and drowning when it is gone. A skill on the same 99-level table as the
 * rest (`src/skills.js`). docs/swimming.md holds the design and the measured
 * crossings this curve was tuned against.
 *
 * Two lines, both straight in the level, and the interesting number is their
 * product. Speed climbs from 0.55 of a walk to 0.80; wind spent falls from 4.0 a
 * second to 1.2. So the distance a full bar carries you climbs from 58 m to
 * 279 m - nearly five times - and that is the whole skill gate. Past the bar
 * you are drowning at 12 health a second, which at level 1 is another 19 m and
 * eight and a third seconds: enough to get back to a shore you have just left,
 * not enough to finish a crossing you should not have started.
 *
 * The Pebbles were measured shore to shore with `canStand` itself, not from the
 * hex outlines: Drent to the nearest skerry is 61.3 m, so a level-1 swimmer
 * arrives having spent a little of the drowning; the hop on to Gull Scarp is
 * 98.0 m, which needs level 25 to survive and level 43 to do on wind alone; and
 * the open crossing to Cobble is 354.8 m, which nobody ever makes, at any level.
 * You island-hop or you do not go.
 *
 * Pure: no DOM, no three. `src/game-state.js` says what water is (`canSwim`).
 */
const freeze = Object.freeze;

export const SWIMMING_VERSION = 1;
export const SWIMMING_SKILL = 'swimming';

export const SWIM = freeze({
  /** The traveler's walking speed, which swimming is a share of. */
  walk: 4.2,
  /** The share of a walk at level 1 and at 99. */
  shareLow: .55, shareHigh: .80,
  /** Wind spent per second at level 1 and at 99. */
  drainLow: 4.0, drainHigh: 1.2,
  /** The bar the wind comes out of, which is combat's own stamina. */
  wind: 100,
  /** Health a second once the wind is gone. */
  drown: 12,
  /** A swimmer cannot fight, and a horse will not go in. */
  fights: false,
  /** How far the figure's feet sit below the surface while swimming, so head and shoulders show. */
  sink: 1.06,
});

const clampLevel = level => Math.max(1, Math.min(99, Math.floor(Number(level) || 1)));
const lerp = (low, high, level) => low + (high - low) * ((clampLevel(level) - 1) / 98);

/** How fast, in metres a second. */
export const swimSpeed = level => SWIM.walk * lerp(SWIM.shareLow, SWIM.shareHigh, level);
/** How much wind a second it costs. */
export const swimDrain = level => lerp(SWIM.drainLow, SWIM.drainHigh, level);
/** How far a full bar of wind carries you. */
export const swimReach = level => swimSpeed(level) * (SWIM.wind / swimDrain(level));
/** How far you go after the wind, on a full life, before you drown. */
export const swimGrace = (level, health = 100) => swimSpeed(level) * (health / SWIM.drown);
/** The furthest a crossing can be and still be survived, at a level and a state of health. */
export const swimRange = (level, health = 100) => swimReach(level) + swimGrace(level, health);
/** The lowest level at which a crossing of `metres` can be survived at all, or null if none can. */
export function levelForCrossing(metres, health = 100) {
  for (let level = 1; level <= 99; level++) if (swimRange(level, health) >= metres) return level;
  return null;
}
/** The lowest level at which a crossing of `metres` is made on wind alone, or null. */
export function levelForDryCrossing(metres) {
  for (let level = 1; level <= 99; level++) if (swimReach(level) >= metres) return level;
  return null;
}

/** What the skill is paid. Metres are paid in whole points as they accumulate. */
export const SWIM_XP = freeze({ metres: 4, water: 25, peblos: 150 });
/** The furthest a life's swimming is counted to, and what a saved total is checked against. */
export const METRES_CAP = 1e9;

/**
 * One frame in the water. Pure arithmetic: the host owns the bar and the blood and hands them in.
 * `wind` and `health` come back changed, `drowning` says whether the last of the wind has gone,
 * and `metres` is how far this frame carried the swimmer.
 */
export function swimStep({ dt = 0, level = 1, wind = SWIM.wind, health = 100 } = {}) {
  if (!(dt > 0)) return { wind, health, metres: 0, drowning: wind <= 0, spent: 0, damage: 0 };
  const speed = swimSpeed(level);
  const spent = Math.min(wind, swimDrain(level) * dt);
  const left = Math.max(0, wind - swimDrain(level) * dt);
  const drowning = left <= 0;
  // The frame is only partly drowning if the wind ran out inside it.
  const drownFor = drowning ? Math.max(0, dt - spent / swimDrain(level)) : 0;
  const damage = Math.min(health, SWIM.drown * drownFor);
  return { wind: left, health: health - damage, metres: speed * dt, drowning, spent, damage };
}

export function validateSwimmingSnapshot(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== SWIMMING_VERSION) return false;
  if (!Number.isFinite(data.metres) || data.metres < 0 || data.metres > METRES_CAP) return false;
  if (!Array.isArray(data.waters) || data.waters.some(id => typeof id !== 'string' || !id)) return false;
  return typeof data.taught === 'boolean' && typeof data.peblos === 'boolean';
}

export function createSwimming({ skills = null, onEvent = () => {} } = {}) {
  const state = { taught: false, metres: 0, paid: 0, waters: [], peblos: false };

  const level = () => skills?.level?.(SWIMMING_SKILL) || 1;
  const gain = amount => {
    if (!state.taught || !amount) return { levelled: false, level: level() };
    const result = skills?.gain?.(SWIMMING_SKILL, amount);
    return { levelled: !!result?.levelled, level: result?.level ?? level() };
  };

  /** Ed the Word, at the water's edge, having just done it the hard way. */
  function learn() {
    if (state.taught) return { ok: true, first: false };
    state.taught = true;
    skills?.learn?.(SWIMMING_SKILL);
    onEvent({ type: 'swimming-learned' });
    return { ok: true, first: true };
  }

  /**
   * Metres swum. Paid in whole points, one for every four metres, as they add up. The running
   * total is capped at the same figure the validator accepts, because a frame that hands in a
   * number nobody could swim must not produce a save that cannot be written as JSON.
   *
   * Nothing counts before Ed's lesson. A traveler can walk into the sea on his first morning -
   * the water does not ask whether he has been shown - but there is no skill to pay it into, and
   * leaving the record unwritten means the crossing he made blind still pays once he knows how.
   */
  function swam(metres) {
    if (!state.taught || !Number.isFinite(metres) || !(metres > 0)) return { ok: true, xp: 0, levelled: false };
    state.metres = Math.min(METRES_CAP, state.metres + metres);
    const owed = Math.floor(state.metres / SWIM_XP.metres) - state.paid;
    if (owed <= 0) return { ok: true, xp: 0, levelled: false, level: level() };
    state.paid += owed;
    return { ok: true, xp: owed, ...gain(owed) };
  }

  /** A named body of water crossed for the first time. */
  function crossed(id) {
    if (!state.taught || typeof id !== 'string' || !id || state.waters.includes(id)) return { ok: true, first: false, xp: 0, levelled: false };
    state.waters.push(id);
    const paid = gain(SWIM_XP.water);
    onEvent({ type: 'water-crossed', id, xp: SWIM_XP.water, ...paid });
    return { ok: true, first: true, xp: SWIM_XP.water, ...paid };
  }

  /** The Pebbles, reached on your own. Once. */
  function reachedPeblos() {
    if (!state.taught || state.peblos) return { ok: true, first: false, xp: 0, levelled: false };
    state.peblos = true;
    const paid = gain(SWIM_XP.peblos);
    onEvent({ type: 'peblos-swum', xp: SWIM_XP.peblos, ...paid });
    return { ok: true, first: true, xp: SWIM_XP.peblos, ...paid };
  }

  const view = () => ({ taught: state.taught, level: level(), metres: Math.round(state.metres),
    reach: Math.round(swimReach(level())), grace: Math.round(swimGrace(level())),
    waters: [...state.waters], peblos: state.peblos });

  function snapshot() { return { version: SWIMMING_VERSION, taught: state.taught, metres: Math.round(state.metres * 10) / 10, waters: [...state.waters], peblos: state.peblos }; }

  function restore(data) {
    Object.assign(state, { taught: false, metres: 0, paid: 0, waters: [], peblos: false });
    if (!validateSwimmingSnapshot(data, { allowMissing: false })) return false;
    Object.assign(state, { taught: data.taught, metres: data.metres, paid: Math.floor(data.metres / SWIM_XP.metres), waters: [...data.waters], peblos: data.peblos });
    return true;
  }

  return { learn, swam, crossed, reachedPeblos, view, snapshot, restore,
    get taught() { return state.taught; }, get metres() { return state.metres; },
    get waters() { return [...state.waters]; }, get peblos() { return state.peblos; } };
}

/** What Ed the Word says at the water's edge, which is the whole lesson. */
export const SWIMMING_LESSON = freeze([
  'Right. You are going to want to know this, because there is a good deal of water between here and anywhere.',
  'Walk in. That is it, that is the whole of the first part. There is no trick and there is no prompt; the ground stops holding you up and you start swimming, and when you find ground again you walk out.',
  'You go slower than you walk and you get tired, and that is the part that kills people. Watch your wind. When it is gone you are not swimming any more, you are drowning, and drowning takes about eight seconds and does not care whose son you are.',
  'So: look at where you are going before you go. If you cannot see the other side, you cannot reach the other side. The skerries off this coast are a pull each; the gap past them is a good deal more than a pull, and I would not try it this year.',
  'And get off the horse. I should not have to say that. I have had to say that.',
]);
