/**
 * **The rebels on the Drent road.** An *event*, not a quest (the user, 22 September 2026): the
 * world does it on its own clock whether the traveler is there or not, it wears no mark over
 * anybody's head, and nothing in the journal asks you to go and do it. Ed the Word swimming
 * ashore from the rebel ship is the other one (src/word-arrival.js).
 *
 * Three rebels lie up on the emptiest stretch of the road out of Drent — 520 m along it, between
 * the Sunken Lane and the Toll House, seventy-six metres from the nearest living soul and the
 * last open country before the Caloss. The company walks that road one man at a time on the
 * roster's clock (src/mercenaries.js), and each of them meets the rebels in his own way.
 *
 * **What happens, by default, if the traveler never goes near it:**
 *
 *   Chris Gotwood  first through, and alone. They kill him, and his body lies on the road
 *                  where the next man will walk past it.
 *   Ed the Word    gets clear without drawing anything. He always does.
 *   Jerry, Kristen and Ciarán  agree to walk to Luscia together, and three swords beat three:
 *                  the rebels die there. It costs them, sometimes: one of the three may not
 *                  get up, and it can be any of them.
 *   Lakota, Eliana  run, and get away, like Ed.
 *   Matt and Al the Tun  travel together and fight if there is anything left to fight. They
 *                  always finish the last of them; one of the two may fall doing it.
 *   Mus            never goes that way (src/wild-route.js), so he can neither spring it nor die in it.
 *
 * So by the time Lakota comes up the road the rebels are usually already dead — usually, because
 * the traveler can change any of it.
 *
 * **What the traveler changes.** Walk with Chris and he is not on that road alone, so nothing
 * happens to him. Go up the road ahead of him and spring it yourself and there is nothing left
 * for him to walk into. Take one of the three riders as a companion and the other two walk it
 * two-handed instead of three, which they still win, and more often at a price. Take two and the
 * last of them walks it alone, and a man alone on that road dies, whoever he is.
 *
 * **The roll.** One seed, stored with the save, hashed with the party's own name: the same
 * playthrough always loses the same man, and a reload never re-rolls him. Nothing here reads a
 * clock or a random number of its own.
 *
 * Pure: no DOM, no three, no world. The host places the rebels, starts the fight when the
 * traveler walks into it, and lays the bodies where this module says they fell.
 */

export const ROAD_AMBUSH_VERSION = 1;

/**
 * Where they lie up, measured on the built road (`world.paths[0]`): the largest gap between
 * anything the road passes, on the Drent side of the Caloss and a long way outside Tidehaven.
 * Both verges are standable nine metres out, so there is ground for three men to come off.
 */
export const AMBUSH = Object.freeze({
  id: 'caloss-road-ambush',
  name: 'The rebels on the Drent road',
  distance: 520,
  point: Object.freeze({ x: -493.7, z: 68.3 }),
  rebels: 3,
  /**
   * What each of them can take. Measured against a dodging player over 200 runs a setting
   * (`poise` in src/combat.js has the numbers): at this he is finished at about forty health
   * alone and about eighty with somebody at his shoulder, which is the fight the user asked
   * for on 22 September 2026 - fairly difficult alone, not very hard with an ally.
   */
  hp: 120,
  /**
   * The road's own bearing where they lie, measured on the built road: the points at 515 m
   * and 525 m are (-489.5, 65.6) and (-498.0, 70.9), which is this, and a test holds it to
   * what the world actually draws.
   */
  forward: Object.freeze({ dx: -0.849, dz: 0.529 }),
  /** How near the traveler has to come before they show themselves. */
  reach: 24,
});

const party = (id, men, does) => Object.freeze({ id, men: Object.freeze(men), does });

/**
 * Who walks that road, in the order the roster sends them. **Mus is deliberately not here**: his
 * line never touches the road (src/wild-route.js), and a test holds him out of it.
 */
export const PARTIES = Object.freeze([
  party('gotwood', ['merc-gotwood'], 'stands'),
  party('word', ['merc-word'], 'runs'),
  party('riders', ['merc-jerry', 'merc-christin', 'merc-ciaran'], 'fights'),
  party('lakota', ['merc-lakota'], 'runs'),
  party('eliana', ['merc-eliana'], 'runs'),
  party('princes', ['merc-matt', 'merc-altun'], 'fights'),
]);

/** Everybody this event can ever touch, which is every mercenary but Mus. */
export const AMBUSHED_IDS = Object.freeze(PARTIES.flatMap(one => [...one.men]));

/**
 * The chance a winning party loses a man, by how many of them walked into it. Three swords
 * against three is a fight they win and can still be hurt by; two is the same fight with a
 * thinner margin. One is not a party at all - see `outcomeFor`.
 */
export const RISK = Object.freeze({ 3: 1 / 3, 2: 1 / 2 });

/** A stable number in [0,1) from a seed and a name. No clock, no Math.random. */
export function roll(seed, key) {
  let hash = 2166136261 ^ (Number(seed) >>> 0);
  for (const character of String(key)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return ((hash >>> 8) % 100000) / 100000;
}

/**
 * What happens when `party` walks into it, given who of them is actually on the road. `present`
 * is the party's own men minus whoever is walking with the traveler and whoever is already dead.
 *
 * Answers `{ cleared, fallen }`: whether the rebels die here, and which of the party does.
 */
export function outcomeFor(party, present, seed) {
  if (!party || !present?.length) return { cleared: false, fallen: [] };
  // Ed, Lakota and Eliana do not stop to be asked. Nothing is decided and nobody is hurt.
  if (party.does === 'runs') return { cleared: false, fallen: [] };
  // Chris stands, because he is the one who does not know yet what this road is.
  if (party.does === 'stands') return { cleared: false, fallen: [...present] };
  // And a man alone against three dies, whoever he is: any of the others whose party the
  // traveler has taken apart down to one man walks into exactly what Chris walked into.
  if (present.length === 1) return { cleared: false, fallen: [present[0]] };
  // Two or more: the rebels die here. Whether it costs the party a man is the one roll.
  const risk = RISK[Math.min(present.length, 3)] ?? RISK[2];
  const chance = roll(seed, `${party.id}:cost`);
  if (chance >= risk) return { cleared: true, fallen: [] };
  const who = present[Math.floor(roll(seed, `${party.id}:who`) * present.length) % present.length];
  return { cleared: true, fallen: [who] };
}

const emptyState = () => ({
  version: ROAD_AMBUSH_VERSION, seed: 1, rebels: AMBUSH.rebels,
  settled: [], fallen: [], sprung: false,
});

const isId = value => typeof value === 'string' && /^[a-z0-9-]{1,64}$/.test(value);
const listOf = (value, allowed) => Array.isArray(value) && value.every(id => allowed.includes(id))
  && new Set(value).size === value.length;

export function validateRoadAmbushSnapshot(value) {
  if (!value || typeof value !== 'object' || value.version !== ROAD_AMBUSH_VERSION) return false;
  if (!Number.isSafeInteger(value.seed) || value.seed < 0) return false;
  if (!Number.isSafeInteger(value.rebels) || value.rebels < 0 || value.rebels > AMBUSH.rebels) return false;
  if (typeof value.sprung !== 'boolean') return false;
  if (!listOf(value.settled, PARTIES.map(one => one.id))) return false;
  if (!listOf(value.fallen, [...AMBUSHED_IDS])) return false;
  // A man cannot have fallen to rebels who were already dead before his party came up, and the
  // rebels cannot be alive after a party that clears them has settled.
  if (!value.rebels && !value.sprung) return false;
  return true;
}

/**
 * `seed` is the playthrough's own; `companions` answers whether a man is walking with the
 * traveler at the moment his party would reach the road, and `dead` whether he is already gone.
 */
export function createRoadAmbush({ seed = 1 } = {}) {
  let state = emptyState();
  state.seed = Number.isSafeInteger(seed) && seed >= 0 ? seed : 1;

  const snapshot = () => ({ ...state, settled: [...state.settled], fallen: [...state.fallen] });
  const alive = () => state.rebels > 0;

  /**
   * A party reaches the ambush. The host calls this once per party, in clock order; calling it
   * twice for the same party does nothing, so a frame loop may call it as often as it likes.
   *
   * `withTraveler` and `dead` are sets or arrays of ids.
   */
  function reach(partyId, { withTraveler = [], dead = [] } = {}) {
    const party = PARTIES.find(one => one.id === partyId);
    if (!party || state.settled.includes(partyId)) return null;
    state.settled.push(partyId);
    if (!alive()) return { party: partyId, met: false, cleared: false, fallen: [] };
    const holds = (list, id) => list instanceof Set ? list.has(id) : list.includes(id);
    const present = party.men.filter(id => !holds(withTraveler, id) && !holds(dead, id) && !state.fallen.includes(id));
    if (!present.length) return { party: partyId, met: false, cleared: false, fallen: [] };
    const result = outcomeFor(party, present, state.seed);
    state.sprung = true;
    if (result.cleared) state.rebels = 0;
    for (const id of result.fallen) if (!state.fallen.includes(id)) state.fallen.push(id);
    return { party: partyId, met: true, ...result };
  }

  /** The traveler sprang it himself and won: nobody after him meets anybody. */
  function cleared() {
    if (!alive()) return false;
    state.rebels = 0; state.sprung = true;
    return true;
  }

  /** The traveler walked into it. Only the first time counts as a springing. */
  function sprang() {
    if (!alive()) return false;
    state.sprung = true;
    return true;
  }

  function restore(data) {
    if (!validateRoadAmbushSnapshot(data)) return false;
    state = { version: ROAD_AMBUSH_VERSION, seed: data.seed, rebels: data.rebels,
      sprung: data.sprung, settled: [...data.settled], fallen: [...data.fallen] };
    return true;
  }

  return {
    reach, cleared, sprang, snapshot, restore,
    get alive() { return alive(); },
    /** Whether this man was killed on that road, and so has a body lying on it. */
    fell: id => state.fallen.includes(id),
    get state() { return { ...snapshot(), alive: alive() }; },
  };
}

/**
 * Where a body lies. They fall on the road, a little apart so two of them are two bodies and not
 * one heap, along the road's own line: `forward` is the road's direction at the ambush.
 */
export function bodyPlace(id, { x = AMBUSH.point.x, z = AMBUSH.point.z, dx = 1, dz = 0 } = {}) {
  const index = AMBUSHED_IDS.indexOf(id);
  if (index < 0) return null;
  const along = ((index % 3) - 1) * 2.4, across = ((index % 2) ? 1 : -1) * 1.1;
  return { x: x + dx * along + dz * across, z: z + dz * along - dx * across,
    yaw: (index * 1.7) % (Math.PI * 2) };
}
