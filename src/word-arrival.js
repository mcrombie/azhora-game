/**
 * Ed the Word comes ashore. Six minutes into the game a sail stands straight in for
 * Tidehaven, the village braces, and then she rounds up well short of the pier, puts a man
 * over her side and stands out again without ever touching the boards. He swims the last
 * sixty-eight metres on the ordinary swimming mechanic (`src/swimming.js`), climbs out on
 * the strand north of the pier, and is the company's second hired sword from then on.
 *
 * He says he came for the adventure. It was a mutiny: that hull is the rebel ship the Peblos
 * faction quest later hides in a sea cave, and her crew are the men who put him over the side
 * (docs/design-answers.md). She is built from the Sultana's hull with a different sail and no
 * gold on her (`createRebelShip` in src/salt-ship.js), so whichever side the traveler takes at
 * Peblos is also a verdict on Ed.
 *
 * Everything here is a pure function of play time, exactly like the rest of the company's
 * clock, so nothing new goes in the save. What the traveler *did* about it - whether he was
 * taught to swim - is the swimming module's business, not this one's.
 *
 * Pure: no DOM, no three.
 */
import { mercenaryById } from './mercenaries.js';
import { swimSpeed } from './swimming.js';

const freeze = Object.freeze;
const point = (x, z) => freeze({ x, z });

/** The hired sword this is all about, and how well he swims when he does it. */
export const WORD_ID = 'merc-word';
/** His own row in the roster, so his hour and his loitering are written down once. */
const ED = mercenaryById(WORD_ID);
/**
 * Level 3, which is what his 260 experience buys (src/player-characters.js). It matters: his
 * crossing is sixty-eight metres and a full bar of wind carries him fifty-nine, so he spends
 * the last nine metres drowning and comes out of the water with about half his blood. That is
 * the demonstration. A traveler who watches it and then tries the same water learns the same
 * lesson for the same price.
 */
export const WORD_LEVEL = 3;
/**
 * `swims: true` on his roster row, read rather than admired. It is the roster's way of saying he
 * comes ashore through the water instead of off a boat, and it is the difference between the
 * swim below and a man simply standing on the strand from the moment the ship lets him go. Take
 * the flag off him and there is no crossing to watch.
 */
export const WORD_SWIMS = ED.swims === true;

/**
 * The clock, in seconds of play after the traveler lands. `drops` is `ARRIVALS.word`, because
 * the moment he goes over the side is the moment the company's own clock says he has arrived.
 */
export const WORD_SHIP = freeze({
  sighted: ED.arrival - 60,
  turns: ED.arrival - 12,
  drops: ED.arrival,
  away: ED.arrival + 12,
  gone: ED.arrival + 110,
});

/**
 * Her track, in world metres. The coast at Tidehaven runs roughly north-south at x ≈ 5 with
 * the open sea to +x, so she comes out of the offing, rounds up at `standOff`, and leaves the
 * way she came. Every point was checked against the real world: all water, all clear.
 */
export const WORD_TRACK = freeze({
  offing: point(260, 108),
  standOff: point(72, 48),
  away: point(280, 150),
});

/** The strand north of the pier where he walks out, and where he stands for the next while. */
export const WORD_BEACH = point(4.5, 38);

/** The crossing itself, measured: the drop is the stand-off, and the beach is the beach. */
export const WORD_SWIM = freeze({
  from: WORD_TRACK.standOff,
  to: WORD_BEACH,
  metres: Math.hypot(WORD_TRACK.standOff.x - WORD_BEACH.x, WORD_TRACK.standOff.z - WORD_BEACH.z),
  get seconds() { return this.metres / swimSpeed(WORD_LEVEL); },
});

/** How long he stands on that beach before he takes the road: twenty-five minutes of it. */
export const WORD_LINGERS = ED.departs;

/** What Tidehaven says while it happens, in the order it says it. */
export const WORD_TOASTS = freeze({
  sighted: freeze({ at: WORD_SHIP.sighted, title: 'A SAIL, STANDING IN',
    line: 'A sail out of the offing, coming straight for the pier and coming fast. Every hand on the harbour front has found something to do that faces the sea.' }),
  turns: freeze({ at: WORD_SHIP.turns, title: 'SHE IS NOT COMING IN',
    line: 'She rounds up a long way short of the boards, backs her sail and lies there. Nobody aboard her is looking at the village.' }),
  drops: freeze({ at: WORD_SHIP.drops, title: 'SOMETHING WENT OVER HER SIDE',
    line: 'A man. He went over her side, and he did not fall.' }),
  away: freeze({ at: WORD_SHIP.away, title: 'SHE IS STANDING OUT AGAIN',
    line: 'Her sail fills and she goes, without a word said to the shore and without once coming near it. Whatever she left is swimming.' }),
  ashore: freeze({ at: null, title: 'HE CAME ASHORE UNDER HIS OWN POWER',
    line: 'He walks out of the water on the strand north of the pier, stands there a while getting his breath back, and does not appear to be in any hurry at all.' }),
});

const clamp01 = t => (t < 0 ? 0 : t > 1 ? 1 : t);
const ease = t => t * t * (3 - 2 * t);
const lerpPoint = (a, b, t) => point(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t);
/** A ship's heading is the way she is going, and +z is zero. */
const headingTo = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);

/**
 * Where the ship is at a moment of play. `phase` is one of `before`, `standing-in`,
 * `lying-to`, `standing-out`, `gone`; `sail` is how much canvas is set (the Sultana's own
 * `update` takes it), and `moving` heels her over.
 */
export function shipAt(playSeconds) {
  const t = Number.isFinite(playSeconds) ? playSeconds : 0;
  const { offing, standOff, away } = WORD_TRACK;
  if (t < WORD_SHIP.sighted) return { phase: 'before', visible: false, ...offing, yaw: headingTo(offing, standOff), sail: 1, moving: true };
  if (t >= WORD_SHIP.gone) return { phase: 'gone', visible: false, ...away, yaw: headingTo(standOff, away), sail: 1, moving: true };
  if (t < WORD_SHIP.turns) {
    const at = lerpPoint(offing, standOff, ease(clamp01((t - WORD_SHIP.sighted) / (WORD_SHIP.turns - WORD_SHIP.sighted))));
    return { phase: 'standing-in', visible: true, ...at, yaw: headingTo(offing, standOff), sail: 1, moving: true };
  }
  if (t < WORD_SHIP.away) {
    // Rounded up and lying there with her sail spilled, swinging a little on the swell.
    const turn = clamp01((t - WORD_SHIP.turns) / (WORD_SHIP.away - WORD_SHIP.turns));
    const held = headingTo(offing, standOff), out = headingTo(standOff, away);
    return { phase: 'lying-to', visible: true, ...standOff, yaw: held + (out - held) * ease(turn), sail: .25, moving: false };
  }
  const at = lerpPoint(standOff, away, ease(clamp01((t - WORD_SHIP.away) / (WORD_SHIP.gone - WORD_SHIP.away))));
  return { phase: 'standing-out', visible: true, ...at, yaw: headingTo(standOff, away), sail: 1, moving: true };
}

/**
 * Where Ed is at a moment of play, and whether the water still has him. Before the drop he is
 * aboard and nowhere; between the drop and the beach he is swimming it, at his own speed, in a
 * straight line, because a straight line is all that water asks for. After that he is standing
 * on the strand until `WORD_LINGERS` runs out and the road gets him.
 */
export function swimmerAt(playSeconds) {
  const t = Number.isFinite(playSeconds) ? playSeconds : 0;
  if (t < WORD_SHIP.drops) return { phase: 'aboard', swimming: false, ashore: false, ...WORD_SWIM.from, yaw: headingTo(WORD_SWIM.from, WORD_SWIM.to), metres: 0 };
  // A man who does not swim is simply ashore the moment the ship lets him go. Nobody on the
  // roster is authored that way today; the flag is read so that it means something.
  if (!WORD_SWIMS) return { phase: 'ashore', swimming: false, ashore: true, ...WORD_SWIM.to, yaw: headingTo(WORD_SWIM.from, WORD_SWIM.to), metres: 0 };
  const swum = Math.min(WORD_SWIM.metres, (t - WORD_SHIP.drops) * swimSpeed(WORD_LEVEL));
  const at = lerpPoint(WORD_SWIM.from, WORD_SWIM.to, WORD_SWIM.metres ? swum / WORD_SWIM.metres : 1);
  const done = swum >= WORD_SWIM.metres;
  return { phase: done ? 'ashore' : 'swimming', swimming: !done, ashore: done, ...at,
    yaw: headingTo(WORD_SWIM.from, WORD_SWIM.to), metres: swum };
}

/** The moment he steps out of the water, which nothing else in the clock names. */
export const WORD_ASHORE = WORD_SHIP.drops + WORD_SWIM.seconds;

/**
 * The lines for the toast that is owed at a moment, given the last one already said. The host
 * keeps the marker; this keeps the order. Returns null when nothing is owed.
 */
export function wordToastAt(playSeconds, said = null) {
  const t = Number.isFinite(playSeconds) ? playSeconds : 0;
  const order = ['sighted', 'turns', 'drops', 'away', 'ashore'];
  const at = key => (key === 'ashore' ? WORD_ASHORE : WORD_TOASTS[key].at);
  const from = said ? order.indexOf(said) + 1 : 0;
  let owed = null;
  for (let i = from; i < order.length; i++) if (t >= at(order[i])) owed = order[i];
  return owed ? { key: owed, ...WORD_TOASTS[owed] } : null;
}
