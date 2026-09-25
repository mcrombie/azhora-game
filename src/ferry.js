/**
 * Three resident ferry hosts link Tidehaven, Cobble and Port Calos.
 *
 * The woman who rowed the traveler ashore waits at Tidehaven's landing. She
 * sails to Cobble in the Pebbles or Port Calos in Luscia. Hallie and Maddie
 * handle onward crossings. Every route is open under the same fare policy.
 *
 * The crossing is not a sailing sim. The boat pulls out, the view fades, and
 * the traveler steps onto the other quay. The traveler is in control before and
 * after, the road is saved on the far side, and no save can be taken while the
 * boat is between shores — `mode` is `ferry` for those four seconds, which no
 * menu and no autosave opens.
 *
 * Everything the scene touches is a callback, so the whole of it runs in Node
 * under test without three, a DOM or a renderer.
 */
import { COPPER_ITEM, describeSum } from './economy.js';
import { COBBLE_QUAY, MAIN_ISLAND, FERRY_MOORINGS, quayHeight } from './peblos-world.js';
import { PORT_CALOS_LANDING, PORT_CALOS_NPC_POSITIONS, PORT_CALOS_MOORING, inPortCalos } from './port-calos-world.js';
import { PORT_CALOS_NPCS } from './port-calos-people.js';

/**
 * Three copper each way. The traveler lands with `STARTING_PURSE` (24), so the
 * islands are open at once and four return trips still leave something for the
 * peddler; and three copper is a rye loaf, which is what an hour of somebody
 * else's rowing is worth on this coast.
 */
export const FERRY_FARE = 3;
/**
 * The crossing is free: Jess carries anyone who asks while the islands are
 * young and worth showing. The fare above is what he would charge, and the
 * machinery that takes it is kept, so putting a price back is one flag.
 */
export const FERRY_FREE = true;
export const FERRY_VERSION = 1;

export const FERRY_NPC = Object.freeze({
  // Jess, who was Corran Sell until the user renamed her on 22 September 2026: a woman with
  // long black hair. She remains at Tidehaven; the other ports have their own hosts.
  id: 'boatman', name: 'Jess', role: 'Boatwoman of the Stills', modelRole: 'bridge-keeper', color: 0x4f6f78,
  look: Object.freeze({ beard: false, slight: true, hairStyle: 'long', hair: 0x1a1613, hat: false }),
});

export const HALLIE_NPC = Object.freeze({
  id: 'cobble-harbourmaster', name: 'Hallie', role: 'Harbourmaster of Cobble', modelRole: 'harbormaster', color: 0x536f74,
  look: Object.freeze({ beard: false, slight: true, hairStyle: 'long', straightHair: true, hair: 0xdcc16e, hat: false }),
});
/** Each requested character has one home and one identity, including after a crossing or reload. */
export const FERRY_HOSTS = Object.freeze({
  drent: FERRY_NPC, peblos: HALLIE_NPC,
  'port-calos': PORT_CALOS_NPCS.find(npc => npc.id === 'port-calos-harbourmaster'),
});
export const FERRY_HOST_IDS = Object.freeze(Object.values(FERRY_HOSTS).map(npc => npc.id));

const spot = (x, z, yaw = 0) => Object.freeze({ x, z, yaw });

/**
 * The landings. `stand` is where the resident host waits, `ashore` where a
 * traveler is set down, `mooring` where the boat lies, and `out` the bearing it
 * pulls away on.
 */
export const FERRY_LANDINGS = Object.freeze({
  drent: Object.freeze({
    id: 'drent', name: 'Tidehaven', far: 'peblos', title: 'Tidehaven’s landing',
    destinations: Object.freeze(['peblos', 'port-calos']),
    // At the pier's seaward end by his boat, and far enough out that he is not
    // the first man the traveler meets in the second before they step ashore.
    stand: spot(27, 30.6, -Math.PI / 2),
    ashore: spot(14, 29, -Math.PI / 2),              // set down halfway along the pier, facing the village
    mooring: spot(FERRY_MOORINGS.drent.x, FERRY_MOORINGS.drent.z, FERRY_MOORINGS.drent.yaw),
    out: Object.freeze({ x: .68, z: .74 }),          // pulling away south-east, toward the Pebbles
  }),
  peblos: Object.freeze({
    id: 'peblos', name: 'Cobble', far: 'drent', title: 'the quay at Cobble',
    destinations: Object.freeze(['drent', 'port-calos']),
    stand: spot(311, 430.2, Math.PI / 2),            // near the quay head, facing up the quay into the village
    ashore: spot(315.5, 428, Math.PI / 2),
    mooring: spot(FERRY_MOORINGS.peblos.x, FERRY_MOORINGS.peblos.z, FERRY_MOORINGS.peblos.yaw),
    out: Object.freeze({ x: -.56, z: -.83 }),        // pulling away north-west, toward Drent
  }),
  'port-calos': Object.freeze({
    id: 'port-calos', name: 'Port Calos', far: 'drent', title: 'Port Calos harbour',
    destinations: Object.freeze(['drent', 'peblos']),
    stand: PORT_CALOS_NPC_POSITIONS['port-calos-harbourmaster'],
    ashore: PORT_CALOS_LANDING,
    mooring: PORT_CALOS_MOORING,
    out: Object.freeze({ x: 1, z: 0 }),              // out of the inlet before turning toward Tidehaven
  }),
});

/** The scene, in seconds from boarding. */
export const FERRY_SCENE = Object.freeze({ board: .8, out: 2.2, dark: 2.9, done: 3.9, veilFrom: .8, veilTo: 1.9, pace: 3.2 });

export const FERRY_CAPTIONS = Object.freeze({
  peblos: 'An hour of open water. Gulls, and the smell of the Stills.',
  drent: 'The Pebbles fall away astern. Drent comes up out of the haze.',
  'port-calos': 'The coast slips by. At the mouth of the Caloss, harbour masts rise above the water.',
});

export function validateFerrySnapshot(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== FERRY_VERSION) return false;
  if (!Number.isInteger(data.crossings) || data.crossings < 0 || data.crossings > 100000) return false;
  return typeof data.met === 'boolean';
}

const noop = () => {};

/**
 * The ferry. Hooks, all optional:
 * `purse()`, `pay(n)`, `free()` (the developer override), `charges()` (whether a
 * fare is asked at all; free while the islands are young), `mounted()`,
 * `position()`, `place(x, z, yaw)`, `setMode(name)`, `veil(value, caption)`,
 * `boat(x, z, yaw)`, `carry(x, y, z)`, `save()`, `toast(text, kicker)`,
 * `stand(side, point)` and `onArrive(side)`.
 */
export function createFerry(hooks = {}) {
  const {
    purse = () => 0, pay = () => false, free = () => false, mounted = () => false, charges = () => !FERRY_FREE,
    position = () => ({ x: 0, z: 0 }), place = noop, setMode = noop, veil = noop,
    boat = noop, carry = noop, save = noop, toast = noop, stand = noop, onArrive = noop,
    // Quays can lie outside the atlas's land hexes. Use each landing's actual
    // surroundings so the current departure stays correct while the traveler walks ashore.
    onPeblos = point => Math.hypot(point.x - MAIN_ISLAND.centre.x, point.z - MAIN_ISLAND.centre.z) < 260,
    onPortCalos = point => inPortCalos(point.x, point.z, 25),
  } = hooks;

  let side = 'drent', crossings = 0, met = false, crossing = null, settled = false;

  const landing = () => FERRY_LANDINGS[side];
  const fare = () => (charges() && !free() ? FERRY_FARE : 0);

  /** Where the traveler is standing, as the ferry sees it. Never asked mid-crossing. */
  function settle() {
    if (crossing) return side;
    const point = position();
    const next = onPortCalos(point) ? 'port-calos' : onPeblos(point) ? 'peblos' : 'drent';
    if (settled && next === side) return side;
    side = next; settled = true;
    stand(side, FERRY_LANDINGS[side].stand);
    boat(FERRY_LANDINGS[side].mooring.x, FERRY_LANDINGS[side].mooring.z, FERRY_LANDINGS[side].mooring.yaw);
    return side;
  }

  /** Can the traveler board here and now, and what would it cost? */
  function offer(destination) {
    const price = fare(), coins = purse();
    if (crossing) return { ok: false, fare: price, free: price === 0, reason: 'The boat is already out.' };
    settle();
    const to = destination === undefined ? landing().far : destination;
    if (!landing().destinations.includes(to)) return { ok: false, fare: price, free: price === 0,
      reason: 'That is not a crossing I make from this shore.' };
    if (mounted()) return { ok: false, fare: price, free: price === 0,
      reason: 'Not with the horse. He will not stand in a boat this size. Leave him ashore and I will take you.' };
    if (coins < price) return { ok: false, fare: price, free: false,
      reason: `That is ${price} copper, and you have ${describeSum(coins)}.` };
    return { ok: true, fare: price, free: price === 0, reason: '', to };
  }

  /** Take the fare and push off. */
  function board(destination) {
    const chance = offer(destination);
    if (!chance.ok) return { ok: false, reason: chance.reason };
    if (chance.fare > 0 && !pay(chance.fare)) return { ok: false, reason: 'The fare would not come out of your satchel.' };
    const from = FERRY_LANDINGS[side], to = FERRY_LANDINGS[chance.to];
    const caption = from.id === 'port-calos' && to.id === 'drent'
      ? 'The Caloss falls away astern. Tidehaven comes up out of the coastal haze.' : FERRY_CAPTIONS[to.id];
    met = true;
    crossing = { t: 0, from, to, caption, paid: chance.fare, teleported: false };
    setMode('ferry');
    veil(0, caption);
    boat(from.mooring.x, from.mooring.z, Math.atan2(from.out.x, from.out.z));
    carry(from.mooring.x, from.mooring.z, 0);
    return { ok: true, reason: '', fare: chance.fare, from: from.id, to: to.id, host: FERRY_HOSTS[from.id].name };
  }

  /** Advance the scene. Safe to call every frame whether or not a boat is out. */
  function frame(dt = 0) {
    if (!crossing) return null;
    const S = FERRY_SCENE, previous = crossing.t;
    crossing.t = Math.min(S.done, crossing.t + Math.max(0, dt));
    const t = crossing.t, { from, to } = crossing;
    const heading = Math.atan2(from.out.x, from.out.z);
    if (t <= S.out) {
      const run = Math.max(0, t - S.board) * S.pace;
      const x = from.mooring.x + from.out.x * run, z = from.mooring.z + from.out.z * run;
      boat(x, z, heading);
      carry(x, z, 0);
    }
    const shown = t < S.veilFrom ? 0 : t < S.veilTo ? (t - S.veilFrom) / (S.veilTo - S.veilFrom)
      : t < S.dark ? 1 : 1 - (t - S.dark) / (S.done - S.dark);
    veil(Math.max(0, Math.min(1, shown)), crossing.caption);
    // The traveler is set ashore while the screen is black, so nothing that
    // reads their position after this point can read a position on the water.
    if (!crossing.teleported && t >= S.out) {
      // A slow frame may jump over the fully dark interval. Cover the transfer
      // explicitly rather than exposing a teleport or saving a visible water frame.
      veil(1, crossing.caption);
      crossing.teleported = true;
      side = to.id; crossings++; settled = true;
      boat(to.mooring.x, to.mooring.z, to.mooring.yaw);
      stand(side, to.stand);
      place(to.ashore.x, to.ashore.z, to.ashore.yaw);
      save();
      onArrive(side);
    }
    if (t >= S.done && previous < S.done) {
      crossing = null;
      setMode('playing');
      veil(0, '');
      if (side === 'port-calos') toast('Port Calos, on the Luscian bank of the Caloss. The road inland leads toward Nothom.', 'LUSCIA · PORT CALOS');
      else toast(side === 'peblos'
        ? 'Cobble, on the big island. The quay, the net loft, and the Empire’s tally shed.'
        : 'Tidehaven’s pier. The road inland begins at the crates.', side === 'peblos' ? 'PEBLOS · THE PEBBLES' : 'DRENT · TIDEHAVEN');
    }
    return { t, side, crossing: !!crossing };
  }

  function snapshot() { return { version: FERRY_VERSION, crossings, met }; }
  function restore(data) {
    crossings = 0; met = false; crossing = null; settled = false;
    if (!validateFerrySnapshot(data, { allowMissing: false })) return false;
    crossings = data.crossings; met = data.met;
    return true;
  }

  return {
    offer, board, frame, settle, snapshot, restore,
    get state() { return { side, crossings, met, crossing: !!crossing, fare: fare() }; },
    get fare() { return fare(); },
    quay: COBBLE_QUAY,
  };
}

/**
 * A resident host's conversation. `context` needs `ferry`,
 * `openDialogue`, `closeDialogue` and `act`, which is called with the result of
 * boarding so the host can toast and start the scene.
 */
export function ferryConversation(npc, context) {
  const { ferry, openDialogue, closeDialogue, act = noop, swimming = null, swimmingLesson = [], teachSwimming = noop } = context;
  const here = ferry.settle();
  if (npc.id !== FERRY_HOSTS[here].id) return false;
  const chance = ferry.offer();
  const lines = here === 'drent' ? drentLines(ferry.state) : here === 'port-calos' ? portCalosLines() : peblosLines();
  // Why not, in her own mouth: a greyed-out choice with a tooltip is not an answer.
  if (!chance.ok && chance.reason) lines.push(chance.reason);
  const choices = FERRY_LANDINGS[here].destinations.map(destination => {
    const offer = ferry.offer(destination);
    const label = destination === 'peblos' ? 'Take me out to Peblos.'
      : destination === 'port-calos' ? 'Take me to Port Calos, in Luscia.' : 'Take me back to Tidehaven.';
    return {
      id: destination === FERRY_LANDINGS[here].far ? 'board-ferry' : `board-ferry-${destination}`,
      label: offer.free ? label : `${label} (${offer.fare} copper)`,
      enabled: offer.ok, reason: offer.reason, title: offer.reason,
      // Closing dialogue restores walking mode. Do it before boarding establishes
      // ferry mode, or the host would let the traveler walk away mid-crossing.
      action: () => { closeDialogue(); const result = ferry.board(destination); act(result); },
    };
  });
  choices.push(
    { id: 'leave-ferry', label: here === 'drent' ? 'Another day.' : 'Not yet. I have not seen it all.', action: closeDialogue },
  );
  // All three hosts can introduce the same swimming skill. Learning from one
  // removes the introductory lesson everywhere without affecting ferry access.
  if (swimming && !swimming.taught && swimmingLesson.length) {
    choices.unshift({ id: 'ferry-swim', label: 'Can you teach me to swim?',
      action: () => openDialogue(npc, [...swimmingLesson], null, 'Back to the shore', { onComplete: teachSwimming }) });
  }
  openDialogue(npc, lines, null, 'Back to the shore', { choices });
  return true;
}

function drentLines(state) {
  const port = 'I also sail to Port Calos, at the mouth of the Caloss in Luscia. You can take the coast with me instead of walking across Drent. There is a road inland toward Nothom. Ask Maddie on the Port Calos quay, or Hallie in Cobble, for your next crossing.';
  if (!state.met) return [
    'You will not remember much of the crossing. You were the colour of the water the whole way in, and you did not once look up.',
    'Jess. That is my boat, and she is sound, whatever she looked like to you yesterday.',
    FERRY_FREE
      ? 'I go out to the Pebbles and back while the tide serves. Cobble is the village, on the big island — my own people. Say the word and I will put you on the quay there, and bring you home after. You paid your passage across the sea; I am not taking your coin for a mile of flat water.'
      : `I go out to the Pebbles and back while the tide serves. Cobble is the village, on the big island — my own people. ${FERRY_FARE} copper and I will put you on the quay there, and ${FERRY_FARE} more when you want to come home.`,
    port,
  ];
  if (state.crossings > 0) return [
    'Back again. The tide serves for another hour, then it does not, and I would rather not row against it.',
    FERRY_FREE ? 'Out again whenever you like. The Pebbles do not get any further away.' : `Same fare out: ${FERRY_FARE} copper. The Pebbles do not get any further away.`,
    port,
  ];
  return [
    'Jess. The boat is sound and the water is quiet, which is as much as anyone gets on this coast.',
    FERRY_FREE ? 'Out to Cobble and back, and no charge for it. There is nothing on the islands that will eat you, whatever they tell you in the village.'
      : `${FERRY_FARE} copper out to Cobble, ${FERRY_FARE} back. There is nothing on the islands that will eat you, whatever they tell you in the village.`,
    port,
  ];
}

function portCalosLines() {
  return [
    'Maddie. I keep Port Calos harbour. This is Luscia; the road inland will take you toward Nothom.',
    FERRY_FREE ? 'I can take you to Tidehaven or to Cobble in Peblos, with no charge. Jess keeps the Tidehaven crossing, and Hallie keeps the quay at Cobble.'
      : `${FERRY_FARE} copper to Tidehaven or to Cobble in Peblos. Jess and Hallie can arrange your onward crossing when you land.`,
  ];
}

function peblosLines() {
  return [
    'Hallie. I am the harbourmaster here at Cobble. Welcome to Peblos.',
    FERRY_FREE ? 'I sail to Tidehaven and Port Calos, and there is no charge. Jess will meet you at Tidehaven; Maddie keeps Port Calos harbour.'
      : `${FERRY_FARE} copper to Tidehaven or Port Calos. Jess will meet you at Tidehaven; Maddie keeps Port Calos harbour.`,
  ];
}

export const FERRY_ITEM = COPPER_ITEM;
/** The quay's deck is standable ground, so a checkpoint taken on it is a checkpoint on land. */
export { quayHeight };
