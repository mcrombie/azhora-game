/**
 * Three people walking away from the battle.
 *
 * The field at the Lauvel is the end of Chapter 1, and its aftermath is the
 * first thing in this war the traveler sees with their own eyes. These three
 * left it on the same morning and are walking the same road east, to the port,
 * because the port is where people go when there is nothing behind them. They
 * start when the game starts and they walk while the game is played, so a
 * traveler who sets out west meets them coming the other way, and a traveler who
 * spends the morning in Tidehaven finds them already there, telling the landing
 * what happened.
 *
 * One of them blames the Empire, one blames the rebels, and the third is sick of
 * both of them and has spent four days keeping them from coming to blows.
 * Pure: no DOM, no three. The route is handed in, so it follows the real road.
 */
export const REFUGEES_VERSION = 1;

/** A tired walk, in metres a second, and how long they sit down for. */
export const REFUGEE_PACE = 1.15;
export const REFUGEE_REST = 90;

/**
 * Where they stop. `at` is metres walked from the Lauvel; the road's own
 * landmarks, so they rest at the crossing and again at the field gate.
 */
export const REFUGEE_RESTS = Object.freeze([
  Object.freeze({ id: 'caloss-crossing', at: 230, note: 'They are sitting on the parapet of the Caloss bridge with their boots off.' }),
  Object.freeze({ id: 'caloss-gate', at: 700, note: 'They are sitting against the field gate where Tidehaven’s wood begins.' }),
]);

export const REFUGEES = Object.freeze([
  Object.freeze({
    id: 'refugee-rebel', name: 'Aldis Ferrow', role: 'Off the Lauvel road',
    modelRole: 'field-courier', color: 0x6f6a52, side: 'rebel', order: 0, offset: 0,
  }),
  Object.freeze({
    id: 'refugee-empire', name: 'Berick Hale', role: 'Off the Lauvel road',
    modelRole: 'relay-clerk', color: 0x756b58, side: 'empire', order: 1, offset: -3.4,
  }),
  Object.freeze({
    id: 'refugee-peace', name: 'Maere Odd', role: 'Off the Lauvel road',
    modelRole: 'shelter-keeper', color: 0x827b6d, side: 'neither', order: 2, offset: -6.6,
  }),
]);

/**
 * The index on the game's main road (`world.paths[0]`) where they started: the
 * height above the field at the Lauvel, about 890 metres of road from Tidehaven.
 */
export const REFUGEE_START = 26;

/** Where the three of them settle once they have reached the landing. */
export const REFUGEE_STANDS = Object.freeze([
  Object.freeze({ x: -30, z: 30, yaw: Math.PI * .62 }),
  Object.freeze({ x: -30, z: 32, yaw: Math.PI * .58 }),
  Object.freeze({ x: -28, z: 28, yaw: Math.PI * -.4 }),
]);

export const REFUGEE_IDS = Object.freeze(REFUGEES.map(person => person.id));
export const refugee = id => REFUGEES.find(person => person.id === id) ?? null;

/** What each of them says on the road, and again once they have arrived. */
const SPEECH = Object.freeze({
  'refugee-rebel': Object.freeze({
    road: Object.freeze([
      'Do not go west. That is the whole of my advice and it is free.',
      'They broke us at the Lauvel and then they went through the villages behind it, and what they did there was not a battle. I watched an army sergeant stand in a doorway and tell a woman there was nothing personal in it. Nothing personal.',
      'The Empire calls it a province. We called it our own for two hundred years and nobody asked us which we preferred.',
    ]),
    arrived: Object.freeze([
      'Your landing here has been good to us. I will say that wherever I go, and I will be going.',
      'They are asking me what it was like and I keep telling them and they keep asking again, as though the answer will come out different.',
      'You will walk that road, I can see it on you. When you get to the field, look at which way the bodies are facing. That will tell you what kind of battle it was.',
    ]),
  }),
  'refugee-empire': Object.freeze({
    road: Object.freeze([
      'I am not going to argue about it on a road. I have been arguing about it on this road for four days.',
      'The rebels raised this. They took the towns, they took the grain, they swore everyone in at spear-point, and when the army came for them they stood in front of our houses to do their fighting. What did anybody think was going to happen?',
      'I want a road I can take a cart down and a season I can sell. That is not loyalty. That is arithmetic.',
    ]),
    arrived: Object.freeze([
      'There is a ship here and a customs man and a price for a sack of barley that has not changed in a month. Do you know how strange that is to look at now?',
      'Half this landing thinks I am a collaborator for saying the rebels started it. The other half has not thought about it at all, which I find I do not mind.',
      'When you go west: keep off the road at dusk and do not carry anything anybody would want. That is the only politics that matters out there.',
    ]),
  }),
  'refugee-peace': Object.freeze({
    road: Object.freeze([
      'If those two start again I am going to sit down in the road and let them walk on without me.',
      'Four days. Four days of who began it. I lost a house and a cow and a brother-in-law I was not fond of, and none of it cares who began it.',
      'They are both right, which is what neither of them can stand. Aldis is right about what the army did. Berick is right about who brought the army. Both of those are true at once and the house is still burnt.',
    ]),
    arrived: Object.freeze([
      'Sea air. I have not smelled anything but smoke since Thursday.',
      'They have not stopped, you know. They started up again at the fish stall. A woman selling crabs had to hear the whole war twice.',
      'Get work if you can, that is what I told them. A war will still be a war in a month and a roof will not.',
    ]),
  }),
});

export function speechFor(id, arrived) { return SPEECH[id]?.[arrived ? 'arrived' : 'road'] ?? null; }

export function validateRefugeesSnapshot(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== REFUGEES_VERSION) return false;
  if (!Number.isFinite(data.walked) || data.walked < 0 || data.walked > 1e7) return false;
  if (!Array.isArray(data.met) || data.met.some(id => !REFUGEE_IDS.includes(id))) return false;
  return new Set(data.met).size === data.met.length;
}

/** Cumulative distance along a route, from its first point. */
function measure(route) {
  const marks = [0];
  for (let i = 1; i < route.length; i++) marks.push(marks[i - 1] + Math.hypot(route[i].x - route[i - 1].x, route[i].z - route[i - 1].z));
  return marks;
}

/**
 * `route` runs from where they started (the Lauvel) to where they are going
 * (the Tidehaven landing). `stands` is where each of them settles once arrived.
 */
export function createRefugees({ route = [], stands = [], pace = REFUGEE_PACE, onEvent = () => {} } = {}) {
  const marks = measure(route);
  const total = marks[marks.length - 1] ?? 0;
  const state = { walked: 0, met: new Set() };

  /** Where a walker `back` metres behind the leader is, and which way they face. */
  function along(distance) {
    if (route.length < 2) return null;
    // The two walking behind the leader are still short of the start at the
    // beginning, so the road is extended backwards along its first heading.
    if (distance < 0) {
      const from = route[0], to = route[1], span = Math.hypot(to.x - from.x, to.z - from.z) || 1;
      return { x: from.x + (from.x - to.x) / span * -distance, z: from.z + (from.z - to.z) / span * -distance,
        yaw: Math.atan2(to.x - from.x, to.z - from.z) };
    }
    const want = Math.min(total, distance);
    let i = 1;
    while (i < marks.length - 1 && marks[i] < want) i++;
    const from = route[i - 1], to = route[i], span = marks[i] - marks[i - 1];
    const t = span > 0 ? (want - marks[i - 1]) / span : 0;
    return { x: from.x + (to.x - from.x) * t, z: from.z + (to.z - from.z) * t,
      yaw: Math.atan2(to.x - from.x, to.z - from.z) };
  }

  /** Rests are subtracted from the distance walked, so they arrive later than the arithmetic says. */
  function restedBy(seconds) {
    let resting = 0;
    for (const rest of REFUGEE_RESTS) {
      const reach = rest.at / pace + resting;
      if (seconds <= reach) break;
      resting += Math.min(REFUGEE_REST, seconds - reach);
    }
    return resting;
  }

  function tick(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0 || arrived()) return false;
    const before = arrived();
    state.walked = Math.max(0, Math.min(total, state.walked + seconds * pace));
    // A rest costs them ground: the clock runs and the road does not go by.
    if (!before && arrived()) { onEvent({ type: 'refugees-arrived' }); return true; }
    return false;
  }

  /** The same journey, driven by the play clock rather than by frames. */
  function setClock(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return false;
    const before = arrived();
    state.walked = Math.max(0, Math.min(total, (seconds - restedBy(seconds)) * pace));
    if (!before && arrived()) { onEvent({ type: 'refugees-arrived' }); return true; }
    return false;
  }

  const arrived = () => total > 0 && state.walked >= total;

  /** Are they sitting down right now? Used for what the traveler is told. */
  function resting() {
    if (arrived()) return null;
    return REFUGEE_RESTS.find(rest => Math.abs(state.walked - rest.at) < 1.5) ?? null;
  }

  function positions() {
    // No road, nobody on it. `along` already says so by returning null, and the module's
    // other readers agree: `arrived` needs a total above zero and `setClock` clamps to it.
    // This was the one place that took `along`'s answer without asking.
    if (route.length < 2) return [];
    return REFUGEES.map((person, i) => {
      if (arrived()) {
        const stand = stands[i] ?? stands[stands.length - 1] ?? along(total);
        return { id: person.id, x: stand.x, z: stand.z, yaw: stand.yaw ?? 0, pace: 0, arrived: true };
      }
      const point = along(state.walked + person.offset);
      return { id: person.id, x: point.x, z: point.z, yaw: point.yaw, pace, arrived: false };
    });
  }

  function meet(id) {
    if (!REFUGEE_IDS.includes(id)) return { ok: false, first: false };
    const first = !state.met.has(id);
    state.met.add(id);
    if (first) onEvent({ type: 'refugee-met', id });
    return { ok: true, first, arrived: arrived() };
  }

  function snapshot() { return { version: REFUGEES_VERSION, walked: state.walked, met: [...state.met] }; }
  function restore(data) {
    state.walked = 0; state.met = new Set();
    if (!validateRefugeesSnapshot(data, { allowMissing: false })) return false;
    state.walked = Math.min(total, data.walked); state.met = new Set(data.met);
    return true;
  }

  return { tick, setClock, positions, meet, resting, snapshot, restore, along,
    get walked() { return state.walked; }, get total() { return total; },
    get arrived() { return arrived(); }, met: id => state.met.has(id) };
}

/** Their conversation. The three of them are one conversation in three parts. */
export function refugeeConversation(npc, context) {
  const { refugees, openDialogue, closeDialogue, act } = context;
  const person = refugee(npc.id);
  if (!person) return false;
  const lines = speechFor(person.id, refugees.arrived);
  const first = !refugees.met(person.id);
  act?.('meet-refugee', person.id);
  const opening = first
    ? refugees.arrived
      ? [`${person.name}. Off the Lauvel road, four days ago, and glad of a door to stand in.`, ...lines]
      : [`${person.name}. We came off the Lauvel road. You are the first person we have met walking the wrong way.`, ...lines]
    : [...lines];
  openDialogue(npc, opening, null, refugees.arrived ? 'Back to the village' : 'Back to the road', {
    choices: [{ id: 'leave-refugee', label: refugees.arrived ? 'Rest well.' : 'Safe road.', action: closeDialogue }],
  });
  return true;
}
