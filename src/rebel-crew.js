/**
 * The men on the rebel ship's deck.
 *
 * She stands in for Tidehaven at six minutes, rounds up sixty-eight metres short, puts Ed the
 * Word over her side and stands out again (`src/word-arrival.js`), and until now her deck was
 * empty. A ship that does all that with nobody aboard reads as a ghost ship, and the user said
 * so: *there are no pirates on the ship.*
 *
 * These are not extras. **Ed's old crew are the rebels at Peblos** — the mutineers who put him
 * over the side are the same men the faction quest later finds with this hull in a sea cave
 * (`docs/design-answers.md`). So they are described here, apart from the ship that carries them,
 * in the shape `createCharacter` takes: the same five can be stood on the same deck in the cave,
 * or on a beach, or anywhere else, by handing this table to whatever builds that scene.
 *
 * Nobody is named. Nobody is spoken to, because she never touches the boards, and a name
 * invented at the keyboard is exactly what the house rules forbid; when Peblos is built the
 * user's own registers can name whichever of them needs it.
 *
 * Pure: no DOM, no three.
 */
import { HULL, REBEL_STERN_HOUSE } from './salt-sultan.js';

const freeze = Object.freeze;
const B = HULL.beam / 2, L = HULL.length / 2;
/** The deck inside the bulwarks, in the ship's own frame: bow is +z, starboard is +x. */
export const DECK_Y = 1.16;
/**
 * **Her poop**, which is the top of the stern house's tarpaulin.
 *
 * Her helmsman's station is abaft the house, where the tiller is, and the house is a solid box
 * from 1.21 to 2.16 with a tarpaulin over it. Standing on the deck he was inside it, with the
 * roof cutting him off at the chest, which is what `word-crew` showed. A low poop is exactly
 * what a stern house on a hull this size is, so he stands on it and steers from up there. The
 * house is not moved, lowered or shortened.
 */
export const POOP_Y = REBEL_STERN_HOUSE.roof;
/** Whether a point in her own frame is over the stern house, and so is a place with a floor on it. */
export const overTheHouse = (x, z) =>
  Math.abs(x - REBEL_STERN_HOUSE.x) <= REBEL_STERN_HOUSE.roofWidth
  && Math.abs(z - REBEL_STERN_HOUSE.z) <= REBEL_STERN_HOUSE.roofLength;

/**
 * Which rail he goes over.
 *
 * At the moment he drops she is halfway through her turn — 12 s into the 24 s between rounding
 * up and standing out — and her heading is about -0.39 rad. Tidehaven's strand lies at (4.5, 38)
 * and she lies at (72, 48), so the shore bears (-0.99, -0.15) from her, and the dot of that with
 * her starboard (cos yaw, -sin yaw) is -0.97: the shore is over her **port** rail, hard over.
 * That is the rail the two of them are at, and it is why they are looking down at the water
 * rather than at the village.
 */
export const DROP_RAIL = freeze({ x: -B * .78, z: .4 });

/**
 * `y` is where his feet are, and it is `DECK_Y` for everybody who stands on her deck. The one
 * man it is not is the helmsman, whose station is over her stern house.
 */
const hand = (id, station, x, z, yaw, look, y = DECK_Y) => freeze({ id, station, x, z, yaw, y, look: freeze(look) });

/**
 * Five of them, and no two alike: weathered colours, varied builds and skins, a headscarf and a
 * hood between them. Rough sailors, not a uniform — she is a hull nobody has spent money on in
 * years and they are dressed like it. The looks are `createCharacter`'s own vocabulary, the way
 * the roster's men and the villagers vary theirs, so nothing new had to be invented to draw them.
 */
export const REBEL_CREW = freeze([
  // At the tiller, on the poop: his station is over her stern house, so the house's roof is his
  // deck. On `DECK_Y` he stood inside it and showed from the chest up.
  hand('rebel-helm', 'tiller', 0, -L * .74, 0,
    { tunic: 0x4f4636, skin: 0x8f6a4a, build: 'raw-boned', headgear: 'bare', hairStyle: 'lank', hair: 0x2a231b, facialHair: 'full', garment: 'jerkin' }, POOP_Y),
  hand('rebel-rail-fore', 'rail', DROP_RAIL.x, DROP_RAIL.z + 1.1, -Math.PI / 2,
    { tunic: 0x6a5240, skin: 0xd7ad7e, build: 'broad', headgear: 'bandana', hairStyle: 'cropped', hair: 0x16120f, facialHair: 'stubble', garment: 'sash' }),
  hand('rebel-rail-aft', 'rail', DROP_RAIL.x, DROP_RAIL.z - 1.2, -Math.PI / 2,
    { tunic: 0x57605a, skin: 0x9d7350, build: 'slight', headgear: 'bare', hairStyle: 'ponytail', hair: 0x1f1a16, facialHair: 'clean', garment: 'plain' }),
  hand('rebel-sail', 'sail', B * .34, L * .30, Math.PI,
    { tunic: 0x7a6448, skin: 0xe2bd93, build: 'wiry', headgear: 'hood', hairStyle: 'cropped', hair: 0x4a3524, facialHair: 'trimmed', garment: 'short-cloak' }),
  hand('rebel-waist', 'deck', B * .46, -L * .22, -2.3,
    { tunic: 0x3f4a5c, skin: 0xe8c8a0, build: 'short-stocky', headgear: 'bandana', hairStyle: 'lank', hair: 0x16130f, facialHair: 'clean', garment: 'gambeson' }),
]);
export const CREW_IDS = freeze(REBEL_CREW.map(man => man.id));

const clamp01 = t => (t < 0 ? 0 : t > 1 ? 1 : t);

/**
 * How a man stands, given what the ship is doing and what time it is.
 *
 * A pure function of the same clock and the same `phase` the hull already takes, so a game
 * reloaded in the middle of the arrival shows the right pose without anything being saved, and
 * nothing here allocates: it is called once per man per frame and returns four numbers.
 *
 *   `lean`    forward at the waist, in radians. The two at the rail lean out over the water
 *             from the moment she rounds up until she fills again: they are the ones who put
 *             him over, and what they are doing is watching to see whether he comes up.
 *   `turn`    a little off their own heading; the helmsman's body goes with his tiller.
 *   `sway`    what the deck does to somebody standing on it, which is more when she is moving.
 *   `lift`    a hand's worth of rise and fall, for the man at the sail.
 */
export function crewPose(man, pose = {}, time = 0) {
  const t = Number.isFinite(time) ? time : 0;
  const phase = pose?.phase, over = clamp01(Number(pose?.lean) || 0);
  const under = phase === 'standing-in' || phase === 'standing-out';
  const seed = (man?.id?.length ?? 4) * 1.7;
  const sway = Math.sin(t * .55 + seed) * (under ? .05 : .025);
  if (man?.station === 'rail') {
    // Leaning out is the whole of what these two are for. How far is the ship's own clock's
    // business (`lean` on `shipAt`), so it comes on as she rounds up, is hard over as he goes
    // over the side, and goes off as her sail fills again.
    return { lean: .06 + .34 * over, turn: sway * .6 + over * .12, sway, lift: 0 };
  }
  if (man?.station === 'tiller') return { lean: .06, turn: Math.sin(t * .31 + seed) * (under ? .26 : .1), sway, lift: 0 };
  if (man?.station === 'sail') return { lean: under ? .18 : .05, turn: sway, sway, lift: Math.sin(t * .8 + seed) * (under ? .05 : .015) };
  return { lean: .03, turn: Math.sin(t * .23 + seed) * .18, sway, lift: 0 };
}

/**
 * Why they are never stand-ins.
 *
 * `src/figure-lod.js` turns a figure past sixty-two metres into one mesh, and she lies at
 * sixty-eight: every one of them would be a peg. Two reasons they are exempt, and both are
 * reasons the LOD already names. They are `posed` — men on a set piece, in fixed places, doing
 * one thing each — and they are `made`, built by a hand that chose their colours, which is the
 * case the rule keeps Bowden and John in full for. And the plain one: the whole scene is a
 * distant ship watched from a pier for a hundred and ten seconds of a whole game, and a row of
 * pegs on her deck would be worse than an empty deck.
 *
 * The cost is bounded by the same hundred and ten seconds. They are built with the hull, the
 * first time she is drawn, and go out of the scene with her.
 */
export const CREW_ALWAYS_IN_FULL = freeze({ posed: true, made: true });
