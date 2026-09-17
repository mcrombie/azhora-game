/**
 * The crossing to Peblos: Corran Sell's boat, the fee, and the short scene.
 *
 * The man who rowed the traveler ashore in the opening is still at Tidehaven's
 * landing. For three copper he takes them out to Cobble in the Pebbles, and for
 * three copper he brings them back. It is open from the first hour of the game:
 * a traveler who has just stepped off his boat can turn round and pay him.
 *
 * The crossing is not a sailing sim. The boat pulls out, the view fades, and
 * the traveler steps onto the other quay. The traveler is in control before and
 * after, the road is saved on the far side, and no save can be taken while the
 * boat is between the two — `mode` is `ferry` for those four seconds, which no
 * menu and no autosave opens.
 *
 * Everything the scene touches is a callback, so the whole of it runs in Node
 * under test without three, a DOM or a renderer.
 */
import { COPPER_ITEM, describeSum } from './economy.js';
import { COBBLE_QUAY, MAIN_ISLAND, FERRY_MOORINGS, quayHeight } from './peblos-world.js';

/**
 * Three copper each way. The traveler lands with `STARTING_PURSE` (24), so the
 * islands are open at once and four return trips still leave something for the
 * peddler; and three copper is a rye loaf, which is what an hour of somebody
 * else's rowing is worth on this coast.
 */
export const FERRY_FARE = 3;
export const FERRY_VERSION = 1;

export const FERRY_NPC = Object.freeze({
  id: 'boatman', name: 'Corran Sell', role: 'Boatman of the Stills', modelRole: 'bridge-keeper', color: 0x4f6f78,
});

const spot = (x, z, yaw = 0) => Object.freeze({ x, z, yaw });

/**
 * The two landings. `stand` is where the boatman waits, `ashore` where a
 * traveler is set down, `mooring` where the boat lies, and `out` the bearing it
 * pulls away on.
 */
export const FERRY_LANDINGS = Object.freeze({
  drent: Object.freeze({
    id: 'drent', name: 'Tidehaven', far: 'peblos', title: 'Tidehaven’s landing',
    // At the pier's seaward end by his boat, and far enough out that he is not
    // the first man the traveler meets in the second before they step ashore.
    stand: spot(27, 30.6, -Math.PI / 2),
    ashore: spot(14, 29, -Math.PI / 2),              // set down halfway along the pier, facing the village
    mooring: spot(FERRY_MOORINGS.drent.x, FERRY_MOORINGS.drent.z, FERRY_MOORINGS.drent.yaw),
    out: Object.freeze({ x: .68, z: .74 }),          // pulling away south-east, toward the Pebbles
  }),
  peblos: Object.freeze({
    id: 'peblos', name: 'Cobble', far: 'drent', title: 'the quay at Cobble',
    stand: spot(311, 430.2, Math.PI / 2),            // near the quay head, facing up the quay into the village
    ashore: spot(315.5, 428, Math.PI / 2),
    mooring: spot(FERRY_MOORINGS.peblos.x, FERRY_MOORINGS.peblos.z, FERRY_MOORINGS.peblos.yaw),
    out: Object.freeze({ x: -.56, z: -.83 }),        // pulling away north-west, toward Drent
  }),
});

/** The scene, in seconds from boarding. */
export const FERRY_SCENE = Object.freeze({ board: .8, out: 2.2, dark: 2.9, done: 3.9, veilFrom: .8, veilTo: 1.9, pace: 3.2 });

export const FERRY_CAPTIONS = Object.freeze({
  peblos: 'An hour of open water. Gulls, and the smell of the Stills.',
  drent: 'The Pebbles fall away astern. Drent comes up out of the haze.',
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
 * `purse()`, `pay(n)`, `free()` (the developer override), `mounted()`,
 * `position()`, `place(x, z, yaw)`, `setMode(name)`, `veil(value, caption)`,
 * `boat(x, z, yaw)`, `carry(x, y, z)`, `save()`, `toast(text, kicker)`,
 * `stand(side, point)` and `onArrive(side)`.
 */
export function createFerry(hooks = {}) {
  const {
    purse = () => 0, pay = () => false, free = () => false, mounted = () => false,
    position = () => ({ x: 0, z: 0 }), place = noop, setMode = noop, veil = noop,
    boat = noop, carry = noop, save = noop, toast = noop, stand = noop, onArrive = noop,
    // The boat serves Cobble and nowhere else, so "the island side" is the main
    // island's own water: the quay head lies outside the authored hex outline,
    // which makes `insideRegion` the wrong question to ask here.
    onPeblos = point => Math.hypot(point.x - MAIN_ISLAND.centre.x, point.z - MAIN_ISLAND.centre.z) < 260,
  } = hooks;

  let side = 'drent', crossings = 0, met = false, crossing = null, settled = false;

  const landing = () => FERRY_LANDINGS[side];
  const fare = () => (free() ? 0 : FERRY_FARE);

  /** Where the traveler is standing, as the ferry sees it. Never asked mid-crossing. */
  function settle() {
    if (crossing) return side;
    const next = onPeblos(position()) ? 'peblos' : 'drent';
    if (settled && next === side) return side;
    side = next; settled = true;
    stand(side, FERRY_LANDINGS[side].stand);
    boat(FERRY_LANDINGS[side].mooring.x, FERRY_LANDINGS[side].mooring.z, FERRY_LANDINGS[side].mooring.yaw);
    return side;
  }

  /** Can the traveler board here and now, and what would it cost? */
  function offer() {
    const price = fare(), coins = purse();
    if (crossing) return { ok: false, fare: price, free: price === 0, reason: 'The boat is already out.' };
    if (mounted()) return { ok: false, fare: price, free: price === 0,
      reason: 'Not with the horse. He will not stand in a boat this size. Leave him ashore and I will take you.' };
    if (coins < price) return { ok: false, fare: price, free: false,
      reason: `That is ${price} copper, and you have ${describeSum(coins)}.` };
    return { ok: true, fare: price, free: price === 0, reason: '' };
  }

  /** Take the fare and push off. */
  function board() {
    const chance = offer();
    if (!chance.ok) return { ok: false, reason: chance.reason };
    if (chance.fare > 0 && !pay(chance.fare)) return { ok: false, reason: 'The fare would not come out of your satchel.' };
    const from = FERRY_LANDINGS[side], to = FERRY_LANDINGS[from.far];
    met = true;
    crossing = { t: 0, from, to, paid: chance.fare, teleported: false };
    setMode('ferry');
    veil(0, FERRY_CAPTIONS[to.id]);
    boat(from.mooring.x, from.mooring.z, Math.atan2(from.out.x, from.out.z));
    carry(from.mooring.x, from.mooring.z, 0);
    return { ok: true, reason: '', fare: chance.fare, to: to.id };
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
    veil(Math.max(0, Math.min(1, shown)), FERRY_CAPTIONS[to.id]);
    // The traveler is set ashore while the screen is black, so nothing that
    // reads their position after this point can read a position on the water.
    if (!crossing.teleported && t >= S.out) {
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
      toast(side === 'peblos'
        ? 'Cobble, on the big island. The quay, the net loft, and the Empire’s tally shed.'
        : 'Tidehaven’s pier. The road inland begins at the crates.', side === 'peblos' ? 'PEBLOS · THE PEBBLES' : 'DRENT · TIDEHAVEN');
    }
    return { t, side, crossing: !!crossing };
  }

  function snapshot() { return { version: FERRY_VERSION, crossings, met }; }
  function restore(data) {
    crossings = 0; met = false; crossing = null;
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
 * Corran Sell's conversation, on either shore. `context` needs `ferry`,
 * `openDialogue`, `closeDialogue` and `act`, which is called with the result of
 * boarding so the host can toast and start the scene.
 */
export function ferryConversation(npc, context) {
  const { ferry, openDialogue, closeDialogue, act = noop } = context;
  const here = ferry.state.side, chance = ferry.offer();
  const lines = here === 'drent' ? drentLines(ferry.state) : peblosLines(ferry.state);
  // Why not, in his own mouth: a greyed-out choice with a tooltip is not an answer.
  if (!chance.ok && chance.reason) lines.push(chance.reason);
  const label = chance.free ? 'Take me out to Peblos. (testing · no fare)'
    : here === 'drent' ? `Take me out to Peblos. (${FERRY_FARE} copper)` : `Take me back to Tidehaven. (${FERRY_FARE} copper)`;
  const choices = [
    { id: 'board-ferry', label, enabled: chance.ok, reason: chance.reason, title: chance.reason,
      action: () => { const result = ferry.board(); closeDialogue(); act(result); } },
    { id: 'leave-ferry', label: here === 'drent' ? 'Another day.' : 'Not yet. I have not seen it all.', action: closeDialogue },
  ];
  openDialogue(npc, lines, null, 'Back to the shore', { choices });
  return true;
}

function drentLines(state) {
  if (!state.met) return [
    'You will not remember much of the crossing. You were the colour of the water the whole way in, and you did not once look up.',
    'Corran Sell. That is my boat, and she is sound, whatever she looked like to you yesterday.',
    `I go out to the Pebbles and back while the tide serves. Cobble is the village, on the big island — my own people. ${FERRY_FARE} copper and I will put you on the quay there, and ${FERRY_FARE} more when you want to come home.`,
  ];
  if (state.crossings > 0) return [
    'Back again. The tide serves for another hour, then it does not, and I would rather not row against it.',
    `Same fare out: ${FERRY_FARE} copper. The Pebbles do not get any further away.`,
  ];
  return [
    'Corran Sell. The boat is sound and the water is quiet, which is as much as anyone gets on this coast.',
    `${FERRY_FARE} copper out to Cobble, ${FERRY_FARE} back. There is nothing on the islands that will eat you, whatever they tell you in the village.`,
  ];
}

function peblosLines(state) {
  return [
    state.crossings > 1 ? 'You again. Seen enough of us?' : 'Cobble. It is smaller than it looked from the water, and it looked small from the water.',
    `${FERRY_FARE} copper back to Tidehaven, whenever you are ready. I will not go without you; I have a sister up that quay who would hear about it.`,
  ];
}

export const FERRY_ITEM = COPPER_ITEM;
/** The quay's deck is standable ground, so a checkpoint taken on it is a checkpoint on land. */
export { quayHeight };
