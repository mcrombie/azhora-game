/**
 * John, the Sultan of the Salt Trade. Not a real sultan: there is no such
 * office, he asked, so he took it. He sails the Sultana round the coast with a
 * hold full of salt (Saltings white off the Pebbles, and grey, and a pink he
 * will not talk about), and judges everything he meets by how salty it is. The
 * sea does not pass. "That's pasta water."
 *
 * He employs Ed, the wine chameleon of Solis (src/wine-chameleon.js), as his
 * Chief Taster: perhaps not wisely. We'll see.
 *
 * The Sultana goes round four ports in turn (Tidehaven, Cobble, Izolveth and
 * Solis), lies in each for a while, and is at sea between them, where nobody
 * sees her. She comes in and puts out in plain view: a traveler on the quay
 * can watch her do it. She will not sail while the traveler is standing with
 * John. Pure: no DOM, no three. The ship and the man are in src/salt-ship.js.
 */
import { solisPoint } from './region-world.js';

const freeze = Object.freeze;

export const JOHN = freeze({ id: 'john-salt', name: 'John', role: 'Sultan of the Salt Trade', color: 0x27306e, skin: 0xb98460 });
export const SHIP_NAME = 'the Sultana';
/** Seconds in port; how near the traveler must stay to keep him there; how near to see her come and go; how near to hear him. */
export const STAY = 480, KEEP = 30, SIGHT = 260, HEAR = 45;
/** Metres a second she makes under sail at her fastest, coming in or going out; and at sea, for the passages between ports. */
export const SAIL_SPEED = 6, SEA_SPEED = 3;
/** Her length and beam, for the model and for the depth she needs. */
export const HULL = freeze({ length: 12, beam: 3.8, draft: 1.3 });
export const PHASES = freeze(['moored', 'departing', 'at-sea', 'arriving']);

const spot = (x, z, yaw) => freeze({ x, z, yaw });
const S = (a, b, yaw) => spot(solisPoint(a, b).x, solisPoint(a, b).z, yaw);
/**
 * The ports, in the order she goes round them. `stand` is John's place on the
 * quay, `ship` where the Sultana lies (alongside, or at anchor off the quay),
 * and `route` the way in from open water, ending at `ship`; she goes out the
 * same way. `edge` is what the traveler calls the thing he stands on, and
 * `bound` what John says of the next leg.
 */
const port = (id, name, region, edge, stand, ship, route, bound) => freeze({ id, name, region, edge, stand, ship, route: freeze(route.map(([x, z]) => freeze({ x, z }))), bound });
export const SALT_PORTS = freeze([
  port('tidehaven', 'Tidehaven', 'Drent', 'pier', spot(19.5, 28.6, -Math.PI / 2), spot(44, 40, -1.72),
    [[240, 70], [44, 40]], 'Cobble next, for the Saltings white.'),
  // Down the channel between the Pebbles to the bay north of the quay, clear of the ferry's berth.
  port('cobble', 'Cobble', 'Peblos', 'quay', spot(305, 429.4, Math.PI / 2), spot(292, 408, -.6),
    [[325, 180], [325, 360], [292, 408]], 'Izolveth next, where the Izoli pay in fish and argue in both directions.'),
  port('izolveth', 'Izolveth', 'West Izol', 'quay', spot(51, 1716.2, 0), spot(47, 1640, 0),
    [[40, 1400], [47, 1640]], 'Solis next, where my Chief Taster will have lost something.'),
  port('solis', 'Solis', 'West Suval', 'quay', S(-72.5, -12, Math.PI / 2), spot(-626, 955, Math.PI / 2),
    [[-860, 990], [-626, 955]], 'Home to Tidehaven next, if I have a home, which my mother says I don’t.'),
]);
export const SALT_PORT_IDS = freeze(SALT_PORTS.map(p => p.id));
const portIndex = id => SALT_PORT_IDS.indexOf(id);
const wrap = i => (i + SALT_PORTS.length) % SALT_PORTS.length;

const routeLength = route => route.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - route[i].x, p.z - route[i].z), 0);
/** Seconds to come in along a port's route, or go out along it. */
export const sailTime = p => Math.max(30, 2 * routeLength(p.route) / SAIL_SPEED);
/** Seconds at sea from one port's roads to the next's, between 2½ and 8 minutes. */
export function passage(fromId, toId) {
  const a = SALT_PORTS[portIndex(fromId)].route[0], b = SALT_PORTS[portIndex(toId)].route[0];
  return Math.round(Math.min(480, Math.max(150, Math.hypot(a.x - b.x, a.z - b.z) / SEA_SPEED)));
}
/** A point `s` metres along a route, and the way it runs there. */
function along(route, s) {
  let left = Math.max(0, s);
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1], b = route[i], len = Math.hypot(b.x - a.x, b.z - a.z);
    if (left <= len || i === route.length - 1) {
      const t = len ? Math.min(1, left / len) : 1;
      return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, heading: Math.atan2(b.x - a.x, b.z - a.z) };
    }
    left -= len;
  }
  const last = route[route.length - 1];
  return { x: last.x, z: last.z, heading: 0 };
}
const turn = (from, to, t) => { const d = Math.atan2(Math.sin(to - from), Math.cos(to - from)); return from + d * Math.max(0, Math.min(1, t)); };
/** Metres short of the berth over which she swings from her course to the way she lies. */
const SWING = 14;

/**
 * Where the Sultana is and how she carries her sail, `sail` 0 (brailed up to
 * the yard) to 1 (full). At sea she is nowhere anybody can see.
 */
export function shipPose(portId, phase, clock) {
  const p = SALT_PORTS[portIndex(portId)];
  if (phase === 'at-sea') return null;
  if (phase === 'moored') return { x: p.ship.x, z: p.ship.z, yaw: p.ship.yaw, sail: 0, moving: false };
  const L = routeLength(p.route), T = sailTime(p), u = Math.max(0, Math.min(1, clock / T));
  if (phase === 'arriving') {
    const s = L * (1 - (1 - u) * (1 - u)), at = along(p.route, s), left = L - s;
    return { x: at.x, z: at.z, yaw: turn(at.heading, p.ship.yaw, 1 - left / SWING), sail: Math.min(1, left / 40), moving: u < 1 };
  }
  // Going out: the route backwards, from the berth to open water, gathering way.
  const back = [...p.route].reverse(), s = L * u * u, at = along(back, s);
  return { x: at.x, z: at.z, yaw: turn(p.ship.yaw, at.heading, s / SWING), sail: Math.min(1, s / 25), moving: u < 1 };
}

// ---------------------------------------------------------------------------
// Where she is, and when she sails
// ---------------------------------------------------------------------------
export function validateSaltSnapshot(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== 1) return false;
  if (!SALT_PORT_IDS.includes(data.port) || !PHASES.includes(data.phase) || !Number.isFinite(data.clock) || data.clock < 0 || data.clock > 1e7) return false;
  if (!Number.isFinite(data.due) || data.due < 0 || data.due > 1e5) return false;
  if (typeof data.met !== 'boolean' || typeof data.edTold !== 'boolean' || !Number.isInteger(data.visits) || data.visits < 0 || data.visits > 1e6) return false;
  return data.met || (!data.edTold && data.visits === 0);
}

/**
 * `start` puts her somewhere to begin with; by default she is at sea, bound
 * for Tidehaven, and comes in some minutes into the game.
 */
export function createSaltSultan({ start = null } = {}) {
  const state = { port: 0, phase: 'at-sea', clock: 0, due: 900, met: false, edTold: false, visits: 0, heard: false };
  if (start) { state.port = Math.max(0, portIndex(start.port)); state.phase = start.phase ?? 'moored'; state.clock = start.clock ?? 0; state.due = start.due ?? 0; }
  const here = () => SALT_PORTS[state.port];
  const near = (t, p, r) => !!t && Math.hypot(t.x - p.x, t.z - p.z) < r;

  /** One step. `traveler` is { x, z }. Events: 'sighted' and 'putting-out' for a traveler who can see, 'heard' near the quay, and 'moored' and 'gone' always. */
  function update(dt, traveler = null) {
    const events = [], p = here();
    state.clock += Math.max(0, dt);
    if (state.phase === 'at-sea' && state.clock >= state.due) {
      state.phase = 'arriving'; state.clock = 0; state.heard = false;
      if (near(traveler, p.stand, SIGHT)) events.push({ type: 'sighted', port: p });
    }
    if (state.phase === 'arriving' && state.clock >= sailTime(p)) { state.phase = 'moored'; state.clock = 0; events.push({ type: 'moored', port: p }); }
    if (state.phase === 'moored') {
      if (!state.heard && near(traveler, p.stand, HEAR)) { state.heard = true; events.push({ type: 'heard', port: p }); }
      if (state.clock >= STAY && !near(traveler, p.stand, KEEP)) {
        state.phase = 'departing'; state.clock = 0;
        if (near(traveler, p.stand, SIGHT)) events.push({ type: 'putting-out', port: p, next: SALT_PORTS[wrap(state.port + 1)] });
      }
    }
    if (state.phase === 'departing' && state.clock >= sailTime(p)) {
      const from = p.id;
      state.port = wrap(state.port + 1); state.phase = 'at-sea'; state.clock = 0; state.due = passage(from, here().id);
      events.push({ type: 'gone', from, to: here().id });
    }
    return events;
  }
  /** Put her in a port at once, at her berth or `clock` seconds into coming in: for the review views. */
  function berth(id, phase = 'moored', clock = 0) { const i = portIndex(id); if (i < 0 || !PHASES.includes(phase)) return false; Object.assign(state, { port: i, phase, clock, heard: true }); return true; }
  function meet() { const first = !state.met; state.met = true; return { first }; }
  function visit() { if (state.met) state.visits++; }
  function tellOfEd() { const first = !state.edTold; state.edTold = true; return { first }; }
  const pose = () => shipPose(here().id, state.phase, state.clock);
  const inPort = id => state.phase === 'moored' && here().id === id;
  function snapshot() { return { version: 1, port: here().id, phase: state.phase, clock: Math.round(state.clock * 10) / 10, due: state.due, met: state.met, edTold: state.edTold, visits: state.visits }; }
  function restore(data) {
    Object.assign(state, { port: 0, phase: 'at-sea', clock: 0, due: 900, met: false, edTold: false, visits: 0, heard: false });
    if (!validateSaltSnapshot(data, { allowMissing: false })) return false;
    Object.assign(state, { port: portIndex(data.port), phase: data.phase, clock: data.clock, due: data.due, met: data.met, edTold: data.edTold, visits: data.visits, heard: data.phase === 'moored' });
    return true;
  }
  return { update, berth, meet, visit, tellOfEd, pose, inPort, snapshot, restore,
    get port() { return here(); }, get phase() { return state.phase; }, get ashore() { return state.phase === 'moored'; },
    get met() { return state.met; }, get edTold() { return state.edTold; }, get visits() { return state.visits; } };
}

// ---------------------------------------------------------------------------
// What he says
// ---------------------------------------------------------------------------
export const PASTA_WATER = '“That’s pasta water.”';
const FIRST = freeze([
  'A big man in a turban as white as a salt pan is crouched at the edge of the {edge} with one finger in the sea. He licks it. He considers.',
  PASTA_WATER,
  'He wipes the finger on a sash that cost more than the {edge}, and stands up. “John. Sultan of the Salt Trade. Not a real sultan: there’s no such office. I asked. So I took it.”',
]);
const AGAIN = freeze([
  '“The traveler! Come here. Taste this.” He holds out a pinch of grey salt. You taste it. “Well?” You say it is salty. “Salty,” he says, to the sky. “Salty, they say.”',
  '“Still alive? Good. Salt keeps. So do you, apparently.”',
  '“Ah. You again. The sea’s no better, before you ask. I checked.”',
  '“Every port on this coast, and there you are in it. Either you’re following me or you’re in salt, and nobody’s in salt but me.”',
]);
const TALK = freeze({
  sultan: [
    '“Every sack of salt that moves on this sea moves in the Sultana, or it moves in somebody’s hold who wishes it had. Saltings white off the Pebbles. The grey, from wherever the sea lies still long enough to leave it. And a pink I will not talk about.”',
    '“The army salts its pork with my salt. The Izoli salt their fish with it. The Suvali bake it in their bread, and in Drent they put a line of it on the doorstep against goblins.”',
    '“It doesn’t work against goblins. I don’t tell them that. A man has to eat.”',
  ],
  pasta: [
    '“Taste it. Go on.” You taste the sea. It tastes like the sea. “That’s pasta water. Fit to boil a noodle in and nothing else. Everybody thinks the sea is salty. The sea is barely trying.”',
    '“Real salt is what’s left when the sea gives up. You let the sun argue with it all summer on a flat pan, and whatever it won’t let go of, that’s salt. The rest is pasta water.”',
    '“The soup at the inn: pasta water. The Emperor’s last speech: pasta water. My brother-in-law: pasta water, with a hat on.”',
  ],
  crew: [
    '“My crew are four Pebble men who don’t talk and a cook who won’t. And in Solis, my Chief Taster.” He says it with the pride and dread of a man whose son has joined the theatre. “Ed.”',
    '“A chameleon. Drunk. Always drunk. But put a pinch of salt on that tongue (it comes out as long as your arm, and faster than you can see) and he’ll tell you which pan it came off, which week, and whether the man who raked it was happy.”',
    '“Is it wise, employing him? My accountant asks me that. My mother asks me that. Ed asks me that, and then he rhymes it with something rude.”',
    '“We’ll see.”',
  ],
  edGood: [
    '“At the tasting? The best there is. At the rest of it?” He pulls a folded paper out of his sash. “His accounts, for the last quarter. Read it.”',
    'It says: “Forty sacks came in, and thirty went out; / the other ten went to salt a trout.”',
    '“One trout. Ten sacks. I asked him about the trout. He said it was a very big trout, and very sad, and that I wouldn’t understand.”',
    '“I pay him in salt. He wanted wine. I said, Ed, I’m in salt. He said, so am I, now, and salt makes a fellow terribly thirsty. That was the whole negotiation, and I believe I lost it.”',
  ],
});
/** Where he is bound after this port, and the rest of the round. */
export function johnBound(portId) {
  return [`“${SALT_PORTS[portIndex(portId)].bound}”`, '“Round and round. The sea is very big, and the salt is very heavy, and I am the only man on it who knows the difference.”'];
}

/** John on his quay. `salt` is his module; `act` runs 'john-meet' and 'john-ed'. */
/** What a piece out of the barrel costs, which is less than it is worth and more than it is. */
export const BEEF_PRICE = 2;
export const SALT_BEEF = 'salt-beef';

export function johnConversation(npc, context) {
  const { salt, openDialogue, closeDialogue, act } = context;
  if (npc.id !== JOHN.id) return false;
  const p = salt.port, fill = line => line.replaceAll('{edge}', p.edge);
  const again = () => johnConversation(npc, { ...context, back: true });
  const talk = lines => openDialogue(npc, lines.map(fill), null, 'Back to John', { onComplete: again });
  const first = !salt.met;
  if (first) act('john-meet');
  const opening = first ? FIRST.map(fill) : context.back ? ['“Anything else? Quickly. The tide is going out, and it is taking all that lovely pasta water with it.”'] : [AGAIN[salt.visits % AGAIN.length]];
  openDialogue(npc, opening, null, 'Back to the ' + p.edge, { choices: [
    { id: 'john-sultan', label: 'Sultan of the Salt Trade?', action: () => talk(TALK.sultan) },
    { id: 'john-pasta', label: 'What’s wrong with the sea?', action: () => talk(TALK.pasta) },
    { id: 'john-crew', label: 'Who works for you?', action: () => { act('john-ed'); talk(TALK.crew); } },
    ...(salt.edTold ? [{ id: 'john-ed-good', label: 'Is Ed any good at it?', action: () => talk(TALK.edGood) }] : []),
    { id: 'john-bound', label: 'Where are you bound?', action: () => talk(johnBound(p.id)) },
    // The hold has salt in it and things kept in salt. A dog in Drent knows this (src/bosco.js).
    ...(context.coppers >= BEEF_PRICE ? [{ id: 'john-beef', label: `A piece of salt beef (${BEEF_PRICE} copper).`,
      action: () => { closeDialogue(); act('buy-salt-beef'); } }] : []),
    // A man who sails four ports in a war is offered every kind of cargo (src/batman.js).
    ...(context.hunt?.stage === 'hunting' && !context.hunt.has('pass') ? [{ id: 'john-refused', label: 'Has anyone offered you a cargo you would not take?',
      action: () => openDialogue(npc, [
        '“Ha! Everyone offers me everything. I carry salt. Salt is honest: it is heavy, it is boring, and nobody has ever been hanged over a sack of it.”',
        '“But yes. Once. Two winters ago, at the east quay, a very polite young man with very clean boots, and crates that weighed nothing and smelled — my friend, they smelled like rain on a hot road, right through the wood.”',
        '“Three hundred silver for one night’s sailing. Three hundred! For salt I make forty and I am at sea a week.” A shrug that uses the whole body. “So of course I said no. That price is not a price, it is a warning.”',
        '“He had a pass, for the lines, after dark. Signed by a Coalition captain, Trelith. He left it with me while he went for his master, to prove the thing was official, and he did not come back for it, because I had already told the harbourman and the harbourman told the quay and the boots went away.”',
        '“I wrote my refusal on the back of it, in my own hand, so that if it ever came to it there would be a paper that said John said no. Here. I have been carrying it for two years waiting for somebody to want it. Somebody wants it, I think.”',
      ], null, 'Take the pass', { onComplete: () => { closeDialogue(); act('take-trelith-pass'); } }) }] : []),
    { id: 'leave-john', label: 'Fair winds, John.', action: closeDialogue },
  ] });
  return true;
}

/** What the traveler hears and sees of him: toasts for the host, by event. */
export function saltToast(event) {
  const where = event.port?.name;
  if (event.type === 'sighted') return { title: where.toUpperCase(), line: `A ship is coming in to ${where} under a white sail, low in the water and crusted white along her waterline: ${SHIP_NAME}, the salt ship.` };
  if (event.type === 'heard') return { title: where.toUpperCase(), line: `Somebody on the ${event.port.edge} has tasted the sea, and is telling it so: “That’s pasta water!”` };
  if (event.type === 'putting-out') return { title: where.toUpperCase(), line: `${SHIP_NAME[0].toUpperCase()}${SHIP_NAME.slice(1)} is putting out, bound for ${event.next.name}. John waves from her stern. It might be at you. It might be at the sea, rudely.` };
  return null;
}
