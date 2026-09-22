/**
 * Ed the Chameleon, who is not the wine goblin of Solis and is tired of being
 * asked about him.
 *
 * Puck keeps Solis, the sea wall, the Prime Minister's cask and the whole of
 * that story (`src/wine-goblin.js`). Ed has the chameleon's body, the
 * sunglasses' cousin, and the one trick that was always the best thing about
 * him: he is somewhere, and then he is a puff of purple smoke, and then he is
 * somewhere else entirely, six hundred kilometres away, looking at a beetle.
 *
 * He hops the whole built world. One spot per region - seventeen of them now,
 * and one more with every country that is built - measured off the road on
 * ground that will hold him (`CHAMELEON_SPOTS`) - and
 * two in open country, because a creature that belongs to nowhere in particular
 * ought to turn up where the atlas gives out. He sits at one for a while and
 * then goes, on a schedule drawn once from the game's seed, so he is in the
 * same places at the same times on every reload of that game and in different
 * ones in the next.
 *
 * Come at him and he usually goes. He is not frightened; he simply has better
 * things to do than be looked at. What buys you a conversation is wine, or
 * anything else worth having: carry one and he stays, every time.
 *
 * Pure: no DOM, no three. `src/chameleon-model.js` draws him, and did before -
 * the body was always Ed's; only Solis went to Puck.
 */
import { ATTIC_BOTTLES } from './attic-wines.js';

const freeze = Object.freeze;

export const CHAMELEON_VERSION = 1;
/**
 * `stay`: seconds at a spot before he moves on. `spook`: how near you get before he goes, unless
 * you are carrying something. `talk`: how near you have to be for him to be worth speaking to.
 */
export const ED = freeze({ id: 'ed', name: 'Ed', role: 'A chameleon, some way from Solis', stay: 150, spook: 7.5, talk: 3.4 });

const spot = (id, region, name, x, z, note) => freeze({ id, region, name, x, z, note });

/**
 * Where he turns up. Each was found by flooding its region for ground `canStand` accepts, at least
 * 25 m off every road and 12 m off anybody's stand, out of water and above the tide line, and then
 * taking the one nearest that region's centre - so he is never on the road, never in the sea, and
 * never underfoot. The two open-country spots are on ground outside every outline the atlas draws
 * (`src/region-world.js`), which is a reasonable address for him.
 *
 * `open-north` moved 26 m, from (-1977, -273) to (-1991, -295), when open country was given its
 * 76 m shore fringe (2026-09-21): the old rock turned out to be 50 m from a Meneth hex centre,
 * which is inside Meneth's fringe, so a spot chosen for being in no country was in one. The new
 * one is the nearest ground to it that is honestly open country and still holds him — same rock
 * field west of the Lotharn, 724 m off the nearest road.
 */
export const CHAMELEON_SPOTS = freeze([
  spot('drent-wood', 'Drent', 'a stump in the Greenway wood', -424, -17, 'He is lying along a stump with his eyes going different ways, which is a thing he can do and you cannot.'),
  spot('luscia-scrub', 'Luscia', 'a thorn bush north of Nothom', -693, 364, 'He is hanging under a thorn branch by four feet and a tail, upside down, entirely at ease.'),
  spot('moros-grass', 'Moros Plain', 'a fence post on the Moros', -975, 642, 'He is on a fence post in open grass with nothing to hide against, and has gone the colour of the post anyway, badly.'),
  spot('east-suval-rock', 'East Suval', 'a warm rock above Elod', -144, 727, 'He is flat on a rock that has had the sun on it all day, and appears to be asleep. He is not.'),
  spot('west-suval-vine', 'West Suval', 'a vine row above the coast road', -560, 900, 'He is in the vines, exactly the colour of the leaves, and gives himself away by moving one eye.'),
  spot('pueth-pine', 'Pueth', 'a pine branch in the cold north', -275, -276, 'He is on a pine branch with his arms wrapped round it, looking cold and pretending not to be.'),
  spot('peblos-skerry', 'Peblos', 'a rock on one of the Pebbles', 207, 296, 'He is on a rock surrounded by water, which raises a question nobody has ever heard him answer.'),
  spot('izol-wall', 'West Izol', 'a sun-warmed wall in Izol', 190, 1889, 'He is along the top of a wall, tail curled, watching a beetle with total concentration.'),
  spot('elagos-orchard', 'Elagos', 'an orchard tree in the Lake Lands', -1193, 33, 'He is in the crook of a fruit tree, and there are fewer fruit on that branch than there were.'),
  spot('amod-terrace', 'Amod', 'a terrace wall in Amod', -943, -570, 'He is on a terrace wall with his feet in the crack of it, watching the valley go about its business.'),
  spot('vastos-stone', 'Vastos', 'a standing stone on the Vastos tableland', -1527, -312, 'He is up a leaning stone in the middle of a great deal of nothing, looking pleased about the nothing.'),
  spot('meneth-ridge', 'Meneth', 'a ridge above the Meneth valleys', -1777, -105, 'He is on the spine of a ridge with the wind flattening him, holding on with all four hands.'),
  spot('caricas-reeds', 'Caricas', 'the reeds along the Lizeem', -1927, 206, 'He is in the reeds, striped like the reeds, and only the pipe gives him away.'),
  spot('nesdor-flats', 'Nesdor', 'a thorn on the Nesdor Flats', -1477, 588, 'He is on the one thorn bush for a kilometre in any direction, which he says is the point.'),
  spot('eer-scrub', 'Eer', 'a cushion bush on the dry half of Eer', -1114, 1076, 'He is in a low bush that smells of itself, gone the same grey-green as the leaves, and only the tail is wrong.'),
  spot('isareos-thorn', 'Isareos', 'a blackthorn in an Isareos hollow', -2446, -29, 'He is down in a fold of the hills in a blackthorn, out of a wind that has not let up since morning.'),
  spot('nethereum-willow', 'Nethereum', 'a willow over the Nethereum outlet', -2461, 404, 'He is along a willow branch above the water with his feet in the wet bark, watching the meadow steam.'),
  spot('open-north', 'Open country', 'a rock west of the Lotharn', -1991, -295, 'He is on a rock on ground no country on the atlas claims, which suits him down to the ground.'),
  spot('open-south', 'Open country', 'a dead tree in the far south-west', -1705, 1461, 'He is in a dead tree a long way past the last border anybody has drawn, and did not come here to be found.'),
]);
export const CHAMELEON_SPOT_IDS = freeze(CHAMELEON_SPOTS.map(entry => entry.id));

/**
 * What buys a conversation. Any bottle from the Wine Attic, and a short list of small things worth
 * having. Carry one and he stays put, however fast you came at him.
 */
export const CHAMELEON_GIFTS = freeze([...Object.keys(ATTIC_BOTTLES), 'honeycomb', 'hot-chocolate', 'chocolate', 'pawpaw', 'herbs']);
/** True if the satchel holds anything he would stay for. */
export const carryingForEd = inventory => CHAMELEON_GIFTS.filter(item => inventory?.has?.(item));

/**
 * His schedule, drawn once from the game's seed. Each hop is a spot and the moment he leaves it,
 * so the whole evening is decided before it starts and the same seed gives the same evening. The
 * hash is the sine mix used for Mus's arrival (src/mercenaries.js), which is there because a plain
 * multiply left neighbouring seeds landing in the same place.
 */
// The seed is folded into a small range before it is multiplied: 1e308 is a finite number, and
// 1e308 * 127.1 is not, and Math.sin of that is NaN, and NaN is not an index into anything.
const SEED_LIMIT = 1e9;
const foldSeed = seed => (Number.isFinite(seed) ? Math.trunc(seed) % 100000 : 0);
const hash = (seed, step) => {
  const x = Math.sin(foldSeed(seed) * 127.1 + step * 311.7 + 74.7) * 43758.5453;
  return x - Math.floor(x);
};
/** Which spot he is at on hop `step`, never the one he was at last. */
export function chameleonSpotAt(seed, step) {
  let at = Math.floor(hash(seed, 0) * CHAMELEON_SPOTS.length) % CHAMELEON_SPOTS.length;
  for (let i = 1; i <= step; i++) {
    let next = Math.floor(hash(seed, i) * (CHAMELEON_SPOTS.length - 1));
    if (next >= at) next++;
    at = next;
  }
  return CHAMELEON_SPOTS[at] ?? CHAMELEON_SPOTS[0];
}

export function validateChameleonSnapshot(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== CHAMELEON_VERSION) return false;
  if (!CHAMELEON_SPOT_IDS.includes(data.spot)) return false;
  if (!Number.isInteger(data.seed) || Math.abs(data.seed) > SEED_LIMIT) return false;
  if (!Number.isInteger(data.step) || data.step < 0 || data.step > 1e7) return false;
  if (typeof data.clock !== 'number' || !(data.clock >= 0) || data.clock > 1e7) return false;
  return typeof data.met === 'boolean' && Number.isInteger(data.gifts) && data.gifts >= 0 && data.gifts <= 1e6;
}

export function createChameleon({ seed = 0, onEvent = () => {} } = {}) {
  const state = { seed: Number.isFinite(seed) ? Math.trunc(seed) % (SEED_LIMIT + 1) : 0, step: 0, clock: 0, met: false, gifts: 0 };
  const spotNow = () => chameleonSpotAt(state.seed, state.step);

  function hop(reason) {
    const from = spotNow();
    state.step += 1; state.clock = 0;
    const event = { type: 'poof', reason, from, to: spotNow() };
    onEvent(event);
    return event;
  }

  /**
   * One step of his day. `traveler` is `{ x, z, carrying }`, where `carrying` is truthy when the
   * satchel holds something he would stay for. He goes when his time is up, and when somebody
   * empty-handed comes inside his reach.
   */
  function update(dt, traveler = null) {
    if (!(dt > 0)) return [];
    state.clock += dt;
    const here = spotNow();
    const near = traveler ? Math.hypot(traveler.x - here.x, traveler.z - here.z) : Infinity;
    if (traveler && !traveler.carrying && near < ED.spook) return [hop('approached')];
    // He will not leave somebody who is standing there holding a bottle out at him.
    if (state.clock > ED.stay && !(traveler && traveler.carrying && near < ED.talk * 3)) return [hop('wandered')];
    return [];
  }

  /** Somebody grabbed at him. Nobody has ever caught him. */
  const grab = () => hop('grabbed');

  function meet() { const first = !state.met; state.met = true; return { first }; }

  /** A bottle, or anything else worth having. He takes it and stays exactly as long as he likes. */
  function give(item) {
    if (!CHAMELEON_GIFTS.includes(item)) return { ok: false, reason: 'He looks at it. He looks at you. He does not take it.' };
    state.gifts += 1; state.clock = 0;
    return { ok: true, first: state.gifts === 1, gifts: state.gifts, wine: !!ATTIC_BOTTLES[item] };
  }

  function snapshot() { return { version: CHAMELEON_VERSION, seed: state.seed, step: state.step, clock: state.clock, spot: spotNow().id, met: state.met, gifts: state.gifts }; }

  function restore(data) {
    Object.assign(state, { step: 0, clock: 0, met: false, gifts: 0 });
    if (!validateChameleonSnapshot(data, { allowMissing: false })) return false;
    Object.assign(state, { seed: data.seed, step: data.step, clock: data.clock, met: data.met, gifts: data.gifts });
    return true;
  }

  return { update, hop, grab, meet, give, snapshot, restore,
    get spot() { return spotNow(); }, get seed() { return state.seed; }, get step() { return state.step; },
    get met() { return state.met; }, get gifts() { return state.gifts; }, get clock() { return state.clock; } };
}

// ---------------------------------------------------------------------------
// What he says, which is not much and is never about Solis
// ---------------------------------------------------------------------------
const FIRST = freeze([
  'The chameleon turns one eye on you without moving anything else. The other eye stays on whatever it was watching.',
  '“Ed.” A pause. “Not that one. I get asked.”',
  'He goes back to watching the beetle. The conversation, as far as he is concerned, has gone very well.',
]);
const AGAIN = freeze([
  '“You again. You are a long way from where you were.” One eye swivels. “So am I.”',
  'He has gone almost exactly the colour of what he is sitting on, and is visibly pleased that you found him anyway.',
  '“I was not hiding. I am never hiding. I am simply this colour now.”',
  'He does not appear to have moved in some time. He was four hundred kilometres away this morning.',
]);
const TALK = freeze({
  who: freeze([
    '“Ed. A chameleon. There is a goblin in Solis called Puck who drinks and rhymes and gets me blamed for things, and no, we are not related, and no, I will not be passing on a message.”',
    '“We have met. Once. It was extremely noisy and there was a great deal of purple smoke and neither of us came out of it well.”',
  ]),
  how: freeze([
    '“How do I get about? The same way you do. Slowly, mostly. And then not slowly.”',
    'The purple smoke, he explains, is not strictly necessary. He does it because it is a nice touch.',
  ]),
  here: freeze([
    '“Why here? Look at it.” He does not elaborate. After a while you look at it, and there is, in fact, quite a lot to look at.',
    '“Nobody comes here. That is not a complaint.”',
  ]),
});
const THANKS = freeze([
  'He takes it in both front feet, which involves letting go of the branch with both back ones, and manages it.',
  '“Well. Yes. That does change things.” He settles in. He is not going anywhere for a while.',
]);

/**
 * Ed, if he has not gone. `inventory` says what the traveler is carrying; `act` runs
 * 'ed-chameleon-meet', 'ed-chameleon-grab' and 'ed-chameleon-give-<item>'.
 */
export function chameleonConversation(npc, context) {
  const { chameleon, inventory = null, openDialogue, closeDialogue, act } = context;
  if (npc.id !== ED.id) return false;
  const again = () => chameleonConversation(npc, { ...context, back: true });
  const first = !chameleon.met;
  if (first) act('ed-chameleon-meet');
  const opening = first ? [...FIRST] : context.back ? ['He waits, with one eye.'] : [AGAIN[chameleon.gifts % AGAIN.length], chameleon.spot.note];
  const talk = lines => openDialogue(npc, [...lines], null, 'Back to Ed', { onComplete: again });
  const holding = carryingForEd(inventory);
  openDialogue(npc, opening, null, 'Leave him to it', { choices: [
    { id: 'ed-chameleon-who', label: 'Are you the one from Solis?', action: () => talk(TALK.who) },
    { id: 'ed-chameleon-how', label: 'How did you get here?', action: () => talk(TALK.how) },
    { id: 'ed-chameleon-here', label: 'Why this spot?', action: () => talk(TALK.here) },
    ...(holding.length ? [{ id: 'ed-chameleon-give', label: 'Here. Have this.', action: () => openDialogue(npc, ['Both eyes come round at once, which is the most attention he has ever paid anybody.'], null, 'Back to Ed', { choices: [
      ...holding.map(item => ({ id: `ed-chameleon-give-${item}`, label: item.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase()), action: () => { closeDialogue(); act(`ed-chameleon-give-${item}`); } })),
      { id: 'ed-chameleon-give-none', label: 'On second thought.', action: again },
    ] }) }] : []),
    { id: 'ed-chameleon-grab', label: 'Grab him!', action: () => { closeDialogue(); act('ed-chameleon-grab'); } },
    { id: 'leave-ed-chameleon', label: 'Leave him to it.', action: closeDialogue },
  ] });
  return true;
}

/** What he says to a gift. */
export const chameleonThanks = () => [...THANKS];
