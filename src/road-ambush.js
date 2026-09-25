/**
 * **The rebels on the Drent road.** An *event*, not a quest (the user, 22 September 2026): the
 * world does it on its own clock whether the traveler is there or not, it wears no mark over
 * anybody's head, and nothing in the journal asks you to go and do it. Ed the Word swimming
 * ashore from the rebel ship is the other one (src/word-arrival.js).
 *
 * Three rebels lie up at the unsigned Greenway junction, 116 m along the road from the pier.
 * Narrow woodland paths let an observant traveler bypass them. The hired company still takes
 * the main road and meets them independently. The company walks that road one man at a time on the
 * roster's clock (src/mercenaries.js), and each of them meets the rebels in his own way.
 *
 * **What happens, by default, if the traveler never goes near it:**
 *
 *   Chris Scotwood  first through, and alone. They kill him, and his body lies on the road
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

export const ROAD_AMBUSH_VERSION = 2;

/**
 * The Greenway/Fernway junction measured on `world.paths[0]`, not a screen coordinate.
 * Its side trail lies outside the trigger; accepting the investigation is optional afterwards.
 */
export const AMBUSH = Object.freeze({
  id: 'caloss-road-ambush',
  name: 'The rebels on the Drent road',
  distance: 116,
  point: Object.freeze({ x: -106, z: 40 }),
  rebels: 3,
  /**
   * What each of them can take. Measured against a dodging player over 200 runs a setting
   * (`poise` in src/combat.js has the numbers): at this he is finished at about forty health
   * alone and about eighty with somebody at his shoulder, which is the fight the user asked
   * for on 22 September 2026 - fairly difficult alone, not very hard with an ally.
   */
  hp: 120,
  /**
   * Tangent measured between the built road's 111 m and 121 m points.
   */
  forward: Object.freeze({ dx: -0.968, dz: 0.253 }),
  /** How near the traveler has to come before they show themselves. */
  reach: 8,
});

const ambushPoint = (along, across) => ({
  x: AMBUSH.point.x + AMBUSH.forward.dx * along + AMBUSH.forward.dz * across,
  z: AMBUSH.point.z + AMBUSH.forward.dz * along - AMBUSH.forward.dx * across,
});
/** These are three people, not three fresh enemies each time the road is used. */
export const AMBUSH_REBELS = Object.freeze([
  { id: 'rebel-lane', role: 'forest-woodcutter', tunic: 0x6d5b43, along: 3, across: -3.4 },
  { id: 'rebel-hedge', role: 'town-carter', tunic: 0x5a6350, along: -2, across: 3.6 },
  { id: 'rebel-stone', role: 'forest-woodcutter', tunic: 0x7a4f3c, along: 6, across: 2.8 },
].map(({ id, role, tunic, along, across }) => {
  const point = ambushPoint(along, across);
  return Object.freeze({ id, kind: 'rebel', name: 'Rebel ambusher', hp: AMBUSH.hp,
    model: Object.freeze({ role, tunic }), home: Object.freeze({ ...point,
      yaw: Math.atan2(AMBUSH.point.x - point.x, AMBUSH.point.z - point.z) }) });
}));
const freshAmbushers = () => AMBUSH_REBELS.map(one => ({ id: one.id, hp: one.hp, ...one.home, mode: 'watching' }));

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

/** Everybody this event can ever touch, including Cromb when another hero is played. */
export const AMBUSHED_IDS = Object.freeze([...PARTIES.flatMap(one => [...one.men]), 'merc-cromb']);

/** The player's chosen identity cannot also be an offscreen ambush victim.
 * Cromb takes the missing named mercenary's party slot. When Mus is played,
 * Cromb walks the main road independently and runs rather than inheriting Mus's
 * wilderness route. Keep original party IDs so old settled outcomes stay settled.
 */
export function ambushPartiesForRoster(roster) {
  if (!Array.isArray(roster)) return PARTIES;
  const present = new Set(roster.map(entry => typeof entry === 'string' ? entry : entry?.id));
  const absent = PARTIES.flatMap(one => one.men).filter(id => !present.has(id));
  const replaced = present.has('merc-cromb') && absent.length === 1 ? absent[0] : null;
  const parties = PARTIES.map(one => party(one.id, one.men.flatMap(id =>
    id === replaced ? ['merc-cromb'] : present.has(id) ? [id] : []), one.does))
    .filter(one => one.men.length);
  if (present.has('merc-cromb') && !replaced) parties.push(party('cromb', ['merc-cromb'], 'runs'));
  return Object.freeze(parties);
}

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
  settled: [], fallen: [], sprung: false, ambushers: freshAmbushers(),
});

const isId = value => typeof value === 'string' && /^[a-z0-9-]{1,64}$/.test(value);
const listOf = (value, allowed) => Array.isArray(value) && value.every(id => allowed.includes(id))
  && new Set(value).size === value.length;

export function validateRoadAmbushSnapshot(value) {
  if (!value || typeof value !== 'object' || ![1, ROAD_AMBUSH_VERSION].includes(value.version)) return false;
  if (!Number.isSafeInteger(value.seed) || value.seed < 0) return false;
  if (!Number.isSafeInteger(value.rebels) || value.rebels < 0 || value.rebels > AMBUSH.rebels) return false;
  if (typeof value.sprung !== 'boolean') return false;
  if (!listOf(value.settled, [...PARTIES.map(one => one.id), 'cromb'])) return false;
  if (!listOf(value.fallen, [...AMBUSHED_IDS])) return false;
  // A man cannot have fallen to rebels who were already dead before his party came up, and the
  // rebels cannot be alive after a party that clears them has settled.
  if (!value.rebels && !value.sprung) return false;
  if (value.version === ROAD_AMBUSH_VERSION) {
    if (!Array.isArray(value.ambushers) || value.ambushers.length !== AMBUSH_REBELS.length) return false;
    for (const [i, one] of value.ambushers.entries()) {
      if (one?.id !== AMBUSH_REBELS[i].id || !Number.isFinite(one.hp) || one.hp < 0 || one.hp > AMBUSH.hp
        || !Number.isFinite(one.x) || !Number.isFinite(one.z) || !Number.isFinite(one.yaw)
        || Math.hypot(one.x - AMBUSH.point.x, one.z - AMBUSH.point.z) > 100
        || !['watching', 'active', 'returning', 'dead'].includes(one.mode)
        || (one.hp === 0) !== (one.mode === 'dead')) return false;
    }
    if (value.rebels !== value.ambushers.filter(one => one.hp > 0).length) return false;
  }
  return true;
}

/**
 * `seed` is the playthrough's own; `companions` answers whether a man is walking with the
 * traveler at the moment his party would reach the road, and `dead` whether he is already gone.
 */
export function createRoadAmbush({ seed = 1 } = {}) {
  let state = emptyState();
  state.seed = Number.isSafeInteger(seed) && seed >= 0 ? seed : 1;

  const snapshot = () => ({ ...state, settled: [...state.settled], fallen: [...state.fallen],
    ambushers: state.ambushers.map(one => ({ ...one })) });
  const alive = () => state.rebels > 0;
  const recount = () => { state.rebels = state.ambushers.filter(one => one.hp > 0).length; };
  const actors = () => state.ambushers.map((one, i) => ({ ...AMBUSH_REBELS[i], ...one,
    maxHp: AMBUSH.hp, home: { ...AMBUSH_REBELS[i].home } }));

  /** Capture real combat damage and positions before combat releases its actors. A dead
   * identity can never be revived by stale fight data or a second arrival. */
  function remember(enemies = []) {
    let changed = false;
    for (const enemy of enemies) {
      const one = state.ambushers.find(actor => actor.id === enemy.id);
      if (!one || one.hp <= 0 || !Number.isFinite(enemy.hp)) continue;
      const hp = Math.max(0, Math.min(one.hp, enemy.hp));
      changed ||= hp !== one.hp; one.hp = hp;
      if (Number.isFinite(enemy.x) && Number.isFinite(enemy.z)
        && Math.hypot(enemy.x - AMBUSH.point.x, enemy.z - AMBUSH.point.z) <= 100) {
        one.x = enemy.x; one.z = enemy.z;
      }
      if (Number.isFinite(enemy.yaw)) one.yaw = enemy.yaw;
      if (!one.hp) one.mode = 'dead';
    }
    recount(); return changed;
  }
  function withdraw(enemies = []) {
    remember(enemies);
    for (const one of state.ambushers) if (one.hp > 0) one.mode = 'returning';
    return alive();
  }
  function update(dt, { move = null } = {}) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    for (const one of state.ambushers) {
      if (one.mode !== 'returning' || one.hp <= 0) continue;
      const home = AMBUSH_REBELS.find(def => def.id === one.id).home;
      const dx = home.x - one.x, dz = home.z - one.z, gap = Math.hypot(dx, dz);
      if (gap < .15) { one.mode = 'watching'; one.yaw = home.yaw; continue; }
      const step = Math.min(gap, 2.2 * dt), displacement = { x: dx / gap * step, z: dz / gap * step };
      const next = move ? move(one, displacement, home) : { x: one.x + displacement.x, z: one.z + displacement.z };
      if (next && Number.isFinite(next.x) && Number.isFinite(next.z)) { one.x = next.x; one.z = next.z; }
      one.yaw = Math.atan2(dx, dz);
    }
  }
  function settleParties(ids = [], fallen = []) {
    for (const id of ids) if ([...PARTIES.map(one => one.id), 'cromb'].includes(id) && !state.settled.includes(id)) state.settled.push(id);
    for (const id of fallen) if (AMBUSHED_IDS.includes(id) && !state.fallen.includes(id)) state.fallen.push(id);
  }
  function encounter(base) {
    return { ...base, enemies: actors().filter(one => one.hp > 0).map(one => ({
      id: one.id, kind: one.kind, name: one.name, model: one.model,
      hp: one.maxHp, currentHp: one.hp, x: one.x, z: one.z, entry: 0,
    })) };
  }

  /**
   * A party reaches the ambush. The host calls this once per party, in clock order; calling it
   * twice for the same party does nothing, so a frame loop may call it as often as it likes.
   *
   * `withTraveler` and `dead` are sets or arrays of ids.
   */
  function reach(partyId, { withTraveler = [], dead = [], roster } = {}) {
    const party = ambushPartiesForRoster(roster).find(one => one.id === partyId);
    if (!party || state.settled.includes(partyId)) return null;
    state.settled.push(partyId);
    if (!alive()) return { party: partyId, met: false, cleared: false, fallen: [] };
    const holds = (list, id) => list instanceof Set ? list.has(id) : list.includes(id);
    const present = party.men.filter(id => !holds(withTraveler, id) && !holds(dead, id) && !state.fallen.includes(id));
    if (!present.length) return { party: partyId, met: false, cleared: false, fallen: [] };
    const result = outcomeFor(party, present, state.seed);
    state.sprung = true;
    if (result.cleared) cleared();
    else if (result.fallen.length) {
      // Offscreen fights cost the survivors something too. Never restore injuries
      // from an earlier player encounter merely because another traveler arrives.
      for (const one of state.ambushers) if (one.hp > 0) one.hp = Math.max(1, one.hp - 18);
    }
    for (const id of result.fallen) if (!state.fallen.includes(id)) state.fallen.push(id);
    return { party: partyId, met: true, ...result };
  }

  /** The traveler sprang it himself and won: nobody after him meets anybody. */
  function cleared() {
    if (!alive()) return false;
    for (const one of state.ambushers) { one.hp = 0; one.mode = 'dead'; }
    state.rebels = 0; state.sprung = true;
    return true;
  }

  /** The traveler walked into it. Only the first time counts as a springing. */
  function sprang() {
    if (!alive()) return false;
    state.sprung = true;
    for (const one of state.ambushers) if (one.hp > 0) one.mode = 'active';
    return true;
  }

  function restore(data = emptyState()) {
    if (!validateRoadAmbushSnapshot(data)) return false;
    state = { version: ROAD_AMBUSH_VERSION, seed: data.seed, rebels: data.rebels,
      sprung: data.sprung, settled: [...data.settled], fallen: [...data.fallen],
      ambushers: data.version === 1 ? freshAmbushers().map((one, i) => i < data.rebels ? one : { ...one, hp: 0, mode: 'dead' })
        : data.ambushers.map(one => ({ ...one, mode: one.mode === 'active' ? 'returning' : one.mode })) };
    return true;
  }

  return {
    reach, cleared, sprang, snapshot, restore, actors, remember, withdraw, update, encounter, settleParties,
    get ready() { return alive() && state.ambushers.every(one => ['watching', 'dead'].includes(one.mode)); },
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
