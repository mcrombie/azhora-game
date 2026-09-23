/**
 * The opening sequence: sailing into Tidehaven with the first of the company, seen from the
 * traveler's own eyes and never under the traveler's control. Forty-four seconds from the roads
 * to the pier, six captions that say what the traveler knows, one bell, and a Skip button that
 * lands the traveler exactly where the boat would have.
 *
 * Pure: no DOM, no three. Everything here is data or a function of seconds. src/main.js reads
 * `stateAt(seconds)` each frame and moves the camera, the arrival boat and the companion to what
 * it says, fires `eventsBetween(last, now)`, and applies `SKIP` (which is `stateAt(end)`) when
 * the sequence ends or is skipped. The design is docs/opening-sequence.md; the wiring for the
 * host is docs/opening-sequence-build.md.
 *
 * The world, as measured headlessly through createWorld (see the design note): north is -z and
 * the open sea is east, +x. The pier deck runs x 2..28 along z 26.8..31.2 at 1.8 m. The traveler's
 * landing (world.spawn) is the outer half of that deck at (23, 29); the arrival boat lies against
 * the pier's south face at (23, 34), bow east, with the gangplank up to the deck; the
 * harbourmaster stands at the pier's root at (0, 25). All of those are derived below from the
 * village transform in src/region-world.js rather than typed in, so they move if the village does.
 */
import { VILLAGE, villageToWorld, SEA_LEVEL } from './region-world.js';
import { MERCENARY_ROSTER, LANDING_QUEUE } from './mercenaries.js';

const freeze = Object.freeze;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const lerp = (a, b, u) => a + (b - a) * u;
const smooth = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
const easeOut = u => { u = clamp(u, 0, 1); return 1 - (1 - u) * (1 - u); };
const lerpAngle = (a, b, u) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * u;
const forward = yaw => ({ x: Math.sin(yaw), z: Math.cos(yaw) });
const mix = (a, b, u) => ({ x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), z: lerp(a.z, b.z, u) });
const at = (lx, lz, extra = {}) => { const p = villageToWorld(lx, lz); return freeze({ x: p.x, z: p.z, ...extra }); };

export const OPENING_VERSION = 1;
/** Seconds from the first frame to the first controllable one. */
export const SEQUENCE_SECONDS = 44;
/** A shore variant (Ed the Word, Mus) is one card over the landed frame, then control. */
export const SHORE_SECONDS = 6;
export { SEA_LEVEL };

// ---------------------------------------------------------------------------
// The landing, from the world
// ---------------------------------------------------------------------------
/** world.spawn: the pier deck's outer half, and the deck's height (world.heightAt there). */
export const SPAWN = at(0, 43, { y: 1.8 });
/** world.pierHead: the pier's root on the shore, where the harbourmaster stands. */
export const PIER_HEAD = at(4, 20);
/** The Greenway warning bell, world.js `bellX, bellZ`, at the village's inland edge. */
export const BELL = at(4, -25);
/**
 * Where the arrival boat lies when the sequence is over, and in every game that never plays
 * it: world.js `boat(-5.0, 43, 1, -.12, true)`, a child of the village root, so its yaw is the
 * village's plus its own. Bow east along the pier's south face, the gangplank to the deck.
 */
export const BOAT_REST = at(-5, 43, { yaw: VILLAGE.yaw - .12 });

/** The small sailing boat the traveler arrives in: the world's own arrival boat, unchanged. */
export const BOAT = freeze({
  length: 6.4, beam: 2.6,
  /** The boat group's height over the sea and the bob world.update gives it; the host adds the bob to the eye. */
  float: .38, bob: freeze({ amplitude: .085, rate: .72 }),
  /**
   * The traveler sits on the middle thwart, just forward of the mast and on the port side, so the
   * sail is behind the right shoulder and the companion is not in the middle of the view. `right`
   * is to starboard (negative is port), `forward` toward the bow, both from the boat's centre;
   * the eye heights are above the boat's origin, seated on the thwart and standing on the boards.
   */
  seat: freeze({ right: -.45, forward: -.1, eyeSeated: 1.41, eyeStanding: 1.54 }),
  /** The companion stands in the bow on the starboard side, his feet on the bottom boards. */
  bow: freeze({ right: .3, forward: 2.3, floor: -.08 }),
});
/**
 * The fastest his legs are drawn as he comes ashore. He has two seconds to cross the last seven
 * metres from the bow to the head of the pier, which is a hurried walk at the ends of it and a
 * run through the middle, and a run through the middle of a landing reads as a man being dragged.
 * The legs are capped here; the man himself still arrives on the beat the captions are written to.
 */
export const ASHORE_PACE = 2.6;

/** The arrival boat's bob, exactly as world.update applies it; `clock` is the game's `elapsed`. */
export const boatBob = clock => Math.sin(clock * BOAT.bob.rate) * BOAT.bob.amplitude;

/** The game's own third-person camera at rest: src/main.js `yaw, pitch, distance`; yaw PI/2 puts it east of the traveler, looking west. */
export const THIRD_PERSON = freeze({ yaw: Math.PI / 2, pitch: .39, distance: 9, focusUp: 1.5 });
const thirdPersonCamera = (() => {
  const { yaw, pitch, distance } = THIRD_PERSON;
  const target = freeze({ x: SPAWN.x, y: SPAWN.y + THIRD_PERSON.focusUp, z: SPAWN.z });
  const position = freeze({ x: target.x + Math.sin(yaw) * distance * Math.cos(pitch), y: target.y + Math.sin(pitch) * distance, z: target.z + Math.cos(yaw) * distance * Math.cos(pitch) });
  return freeze({ position, target });
})();

/**
 * The first controllable frame, and what skipping sets. The traveler stands on the landing
 * facing west up the pier (rotation -PI/2, the way the ferry sets a traveler down); the camera
 * is the ordinary one behind them; the companion is where placements() in src/mercenaries.js
 * puts the first man of the roster while he waits at the landing, so settleMercenaries() in the
 * host agrees with this to the metre. That used to be a ring around the landing, which did not
 * fit the pier; it is the head of the queue down it now (LANDING_QUEUE), one lead in front of
 * the traveler and half a metre off the line, facing the way they are both about to walk.
 */
export const LANDED = freeze({
  traveler: freeze({ x: SPAWN.x, y: SPAWN.y, z: SPAWN.z, yaw: -Math.PI / 2 }),
  companion: freeze({ x: SPAWN.x - LANDING_QUEUE.lead, y: SPAWN.y, z: SPAWN.z - LANDING_QUEUE.offset, yaw: -Math.PI / 2 }),
  camera: thirdPersonCamera,
  view: freeze({ yaw: THIRD_PERSON.yaw, pitch: THIRD_PERSON.pitch, distance: THIRD_PERSON.distance }),
  /** The toast the landing shows, in the quest's own words; the errand is the harbourmaster's. */
  toast: freeze({ title: 'Goblins have attacked the northern road.', kicker: 'SPEAK TO JOJO AT THE HEAD OF THE PIER' }),
});

// ---------------------------------------------------------------------------
// The boat's way in
// ---------------------------------------------------------------------------
/**
 * Keyframes in world metres and seconds; the boat is straight-line between them, and `ease`
 * 'out' lets the last leg lose way and stop. Headings are `Math.atan2(dx, dz)` like every actor's
 * rotation.y (forward is (sin, cos)), kept unwrapped so they interpolate without a seam: -PI/2 is
 * west, -PI north, -3PI/2 east. The way in is the Sultana's channel (src/salt-sultan.js, from
 * (240, 70)), then past the pier's end eleven metres off its south face, a round-up to starboard
 * through a four-metre circle in the little bay south of the pier root, and a glide east along
 * the face to where the boat has always lain. The Sultana herself is at sea for the first
 * fifteen minutes of every game, so her berth at (44, 40) is empty as the boat passes it.
 */
const key = (t, x, z, yaw, ease = 'linear') => freeze({ at: t, x, z, yaw, ease });
const TURN = freeze({ x: 17, z: 38, r: 4 });
const arc = (t, angle, yaw) => key(t, TURN.x + Math.cos(angle) * TURN.r, TURN.z + Math.sin(angle) * TURN.r, yaw);
export const BOAT_PATH = freeze([
  key(0, 190, 62, Math.atan2(60 - 190, 44 - 62)),           // in the roads, 170 m out, the coast a line ahead
  key(25, 60, 44, Math.atan2(17 - 60, 42 - 44)),            // the pier's end coming abeam, thirty metres off
  arc(35, Math.PI / 2, -Math.PI / 2),                       // past the end, heading west; the helm goes over
  arc(36, Math.PI * 3 / 4, -Math.PI * 3 / 4),
  arc(37, Math.PI, -Math.PI),                               // head to the shore, the pier dead ahead
  arc(38, Math.PI * 5 / 4, -Math.PI * 5 / 4),
  arc(39, Math.PI * 3 / 2, -Math.PI * 3 / 2),               // round, heading east along the face
  key(SEQUENCE_SECONDS, BOAT_REST.x, BOAT_REST.z, -Math.PI * 3 / 2 + (BOAT_REST.yaw - Math.PI / 2), 'out'), // alongside, stopped
]);

/** Moments inside the sequence: the traveler stands, steps up onto the pier, and the frame is theirs. */
export const PHASES = freeze({ companionTurns: 36, stand: 40, ashore: 42, end: SEQUENCE_SECONDS });
/** How long the eye takes to turn from one beat's look to the next's. */
export const LOOK_TURN = 1.5;
/** Captions fade in and out over this. */
export const CAPTION_FADE = .6;
/** What fits in the caption block at its type size: two lines of Adventure serif at 24 px in 640 px. */
export const CAPTION_LIMITS = freeze({ eyebrow: 40, text: 120 });

/** Points the eye rests on, in world metres. */
export const LOOKS = freeze({
  /** The rise north of the harbour: 9 m at (0, -70), the coast jutting east from it toward the north cape. */
  headland: freeze({ x: 30, y: 7, z: -70 }),
  /** The cottage roofs west of the landing; the cottages stand between x -41 and -7. */
  village: freeze({ x: -20, y: 5, z: 29 }),
  /** The pier's middle. */
  pier: freeze({ x: 15, y: 2.5, z: 29 }),
  /** The warning bell at the village's inland edge, seventy metres beyond the pier's root. */
  bell: freeze({ x: BELL.x, y: 3, z: BELL.z }),
});

// ---------------------------------------------------------------------------
// The beats and their words
// ---------------------------------------------------------------------------
const caption = (from, until, eyebrow, text) => freeze({ at: from, until, eyebrow, text });
const event = (type, when) => freeze({ type, at: when });
const beat = (id, from, until, look, cap = null, events = []) => freeze({ id, at: from, until, look, caption: cap, events: freeze(events) });

/**
 * `look` is where the eye rests during the beat: 'ahead' along the bow, a name from LOOKS, the
 * 'companion', or 'settle' (the third-person camera's target). Each caption sits inside its beat.
 * `{companion}` is the slot for whoever came off the boat with the traveler.
 */
export const BEATS = freeze([
  beat('open-water', 0, 7, 'ahead',
    caption(1.5, 6.5, 'THE STILLS', 'The last morning of the crossing. {companion} is in the bow, watching the coast come up.')),
  beat('the-headland', 7, 14.5, 'headland',
    caption(8.5, 14, 'A HIRED SWORD', 'You are a mercenary, hired from abroad by the Ambroni Empire to help put down a rebellion.')),
  beat('drent', 14.5, 22, 'village',
    caption(16, 21.5, 'DRENT', 'Drent, the quietest province the Empire has left. The village ahead is Tidehaven.')),
  beat('ambron', 22, 29.5, 'ahead',
    caption(23.5, 29, 'AMBRON', 'The Empire is ruled from Ambron, a city built in a lake, to the west.')),
  beat('the-bell', 29.5, 35, 'bell',
    caption(31, 34.5, 'TIDEHAVEN', 'The warning bell carries across the water.'), [event('bell', 30)]),
  beat('rounding-up', 35, 39, 'pier', null, [event('companion-turns', PHASES.companionTurns)]),
  beat('alongside', 39, SEQUENCE_SECONDS, 'companion',
    caption(39.5, 43.5, 'THE FIRST SHORE', 'There is a war in this country. You have been told what it is. You have not understood it yet.'),
    [event('stand', PHASES.stand), event('ashore', PHASES.ashore), event('landed', PHASES.end)]),
]);

/**
 * Two of the eleven never took this boat. Ed the Word swims ashore out of a pirate ship that
 * turns away without docking; Mus beaches his own boat on the shingle round the headland. For
 * either as the traveler the sequence is one card over the landed frame, because the world has
 * one landing and the harbourmaster's errand waits on it.
 */
export const SHORE_BEATS = freeze({
  word: freeze([beat('ashore-word', 0, SHORE_SECONDS, 'settle',
    caption(.6, SHORE_SECONDS - .6, 'ED THE WORD · TIDEHAVEN', 'You swam the last of it. The ship that brought you has turned for open water and will not be back.'),
    [event('landed', SHORE_SECONDS)])]),
  mus: freeze([beat('ashore-mus', 0, SHORE_SECONDS, 'settle',
    caption(.6, SHORE_SECONDS - .6, 'MUS · ROUND THE HEADLAND', 'You put your boat on the shingle round the headland and came in on foot. The pier is where the paperwork is.'),
    [event('landed', SHORE_SECONDS)])]),
});

export const VARIANT_IDS = freeze(['standard', 'word', 'mus']);
const VARIANTS = freeze({
  standard: freeze({ id: 'standard', seconds: SEQUENCE_SECONDS, beats: BEATS }),
  word: freeze({ id: 'word', seconds: SHORE_SECONDS, beats: SHORE_BEATS.word }),
  mus: freeze({ id: 'mus', seconds: SHORE_SECONDS, beats: SHORE_BEATS.mus }),
});

// ---------------------------------------------------------------------------
// Who is in the boat
// ---------------------------------------------------------------------------
/**
 * The eleven the traveler may be: Cromb the Barbarian by default, then the ten of the roster by
 * their bare names. The playable-characters module may hand ids over with the roster's `merc-`
 * prefix or a first name; `normalisePlayer` takes all three, and `crom` as well, which is what
 * Cromb was called for one morning before the b (src/player-characters.js).
 */
export const DEFAULT_PLAYER = 'cromb';
export const PLAYABLE_IDS = freeze([DEFAULT_PLAYER, ...MERCENARY_ROSTER.map(m => m.id.replace(/^merc-/, ''))]);
// `whenGotwood` is keyed off the player id `gotwood`, not off his name: ids are sticky in this
// game, so he kept his when he became Chris Scotwood (the user, 22 September 2026).
export const COMPANIONS = freeze({ default: 'Chris Scotwood', whenGotwood: 'Cromb' });
const ALIASES = freeze({ crom: DEFAULT_PLAYER, chris: 'gotwood', ed: 'word', 'ed-the-word': 'word', 'al-the-tun': 'altun', al: 'altun' });

export function normalisePlayer(playerId) {
  const bare = String(playerId ?? DEFAULT_PLAYER).trim().toLowerCase().replace(/^merc-/, '').replace(/\s+/g, '-');
  const id = ALIASES[bare] ?? bare;
  return PLAYABLE_IDS.includes(id) ? id : DEFAULT_PLAYER;
}
/** Who steps ashore beside the traveler: Chris Scotwood, unless the traveler is Chris, when it is Cromb. */
export function companionFor(playerId) {
  return normalisePlayer(playerId) === 'gotwood' ? COMPANIONS.whenGotwood : COMPANIONS.default;
}
const fill = (text, companion) => text.replaceAll('{companion}', companion);

/** The captions of a variant with the companion's name in the slot, in order. */
export function captionsFor(companionName = COMPANIONS.default, variant = 'standard') {
  const v = VARIANTS[variant] ?? VARIANTS.standard;
  return v.beats.filter(b => b.caption).map(b => freeze({ beat: b.id, ...b.caption, text: fill(b.caption.text, companionName) }));
}
/** Which sequence a traveler gets, and with whom. */
export function variantFor(playerId) {
  const player = normalisePlayer(playerId);
  const id = player === 'word' || player === 'mus' ? player : 'standard';
  const companion = companionFor(player);
  return freeze({ id, player, companion, seconds: VARIANTS[id].seconds, captions: captionsFor(companion, id) });
}

// ---------------------------------------------------------------------------
// The state at any moment
// ---------------------------------------------------------------------------
function boatAt(t) {
  const keys = BOAT_PATH, last = keys[keys.length - 1];
  if (t >= last.at) return { x: last.x, z: last.z, y: BOAT.float, yaw: last.yaw, moving: false };
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1], b = keys[i];
    if (t <= b.at) {
      let u = clamp((t - a.at) / (b.at - a.at), 0, 1);
      if (b.ease === 'out') u = easeOut(u);
      return { x: lerp(a.x, b.x, u), z: lerp(a.z, b.z, u), y: BOAT.float, yaw: lerp(a.yaw, b.yaw, u), moving: true };
    }
  }
  return { x: keys[0].x, z: keys[0].z, y: BOAT.float, yaw: keys[0].yaw, moving: true };
}
/** A point in the boat's frame: `right` to starboard, `fwd` toward the bow, `up` from the boat's origin. */
function aboard(boat, right, fwd, up = 0) {
  const f = forward(boat.yaw);
  return { x: boat.x + f.x * fwd - f.z * right, y: boat.y + up, z: boat.z + f.z * fwd + f.x * right };
}
/**
 * `walking` is the one thing about him the host cannot work out for itself. Standing in the bow
 * he crosses the bay at the boat's speed without taking a step, and coming ashore he covers the
 * last seven metres on his own feet - the same movement on the screen, and only the sequence
 * knows which is which. Without it he either slid ashore rigid or ran on the spot for a mile of
 * open water.
 */
function companionAt(t, boat) {
  const facing = t < PHASES.companionTurns ? boat.yaw
    : lerpAngle(boat.yaw, boat.yaw + Math.PI, smooth(t - PHASES.companionTurns));
  const inBoat = aboard(boat, BOAT.bow.right, BOAT.bow.forward, BOAT.bow.floor);
  if (t < PHASES.ashore) return { ...inBoat, yaw: facing, aboard: true, walking: false };
  const u = smooth((t - PHASES.ashore) / (PHASES.end - PHASES.ashore));
  return { ...mix(inBoat, LANDED.companion, u), yaw: lerpAngle(facing, LANDED.companion.yaw, u), aboard: u < 1, walking: u < 1 };
}
function eyeAt(t, boat) {
  const up = t < PHASES.stand ? BOAT.seat.eyeSeated
    : lerp(BOAT.seat.eyeSeated, BOAT.seat.eyeStanding, smooth((t - PHASES.stand) / (PHASES.ashore - PHASES.stand)));
  return aboard(boat, BOAT.seat.right, BOAT.seat.forward, up);
}
function lookPoint(name, boat, companion, eye) {
  if (name === 'ahead') { const f = forward(boat.yaw); return { x: eye.x + f.x * 60, y: eye.y - 2, z: eye.z + f.z * 60 }; }
  if (name === 'companion') return { x: companion.x, y: companion.y + 1.5, z: companion.z };
  if (name === 'settle') return { ...LANDED.camera.target };
  const p = LOOKS[name];
  if (!p) throw new RangeError(`No look called ${name}`);
  return { x: p.x, y: p.y, z: p.z };
}
function beatIndexAt(t, beats) {
  for (let i = beats.length - 1; i >= 0; i--) if (t >= beats[i].at) return i;
  return 0;
}
function cameraAt(t, boat, companion, beats) {
  const eye = eyeAt(t, boat);
  const i = beatIndexAt(t, beats), current = beats[i], previous = beats[i - 1];
  let target = lookPoint(current.look, boat, companion, eye);
  if (previous) {
    const u = smooth((t - current.at) / LOOK_TURN);
    if (u < 1) target = mix(lookPoint(previous.look, boat, companion, eye), target, u);
  }
  if (t >= PHASES.ashore) {
    const u = smooth((t - PHASES.ashore) / (PHASES.end - PHASES.ashore));
    return { position: mix(eye, LANDED.camera.position, u), target: mix(target, LANDED.camera.target, u) };
  }
  return { position: eye, target };
}
function captionAt(t, beats, companion) {
  for (const b of beats) {
    const c = b.caption;
    if (!c || t < c.at || t > c.until) continue;
    const alpha = clamp(Math.min((t - c.at) / CAPTION_FADE, (c.until - t) / CAPTION_FADE), 0, 1);
    return { beat: b.id, eyebrow: c.eyebrow, text: fill(c.text, companion), alpha };
  }
  return null;
}

/**
 * Everything the host needs at `seconds` into the sequence: the boat (world metres, heading as
 * rotation.y, the host adds boatBob), the companion (position, facing, whether still aboard),
 * the traveler (hidden and riding at the eye until the last frame, then standing on the pier),
 * the camera (a position and a point to look at), the caption with its fade, and when done the
 * landed state. Past the end it is the end.
 */
export function stateAt(seconds, { variant = 'standard', companion = COMPANIONS.default } = {}) {
  const v = VARIANTS[variant] ?? VARIANTS.standard;
  const t = clamp(Number.isFinite(seconds) ? seconds : 0, 0, v.seconds);
  const done = t >= v.seconds;
  if (v.id !== 'standard') {
    return {
      t, seconds: v.seconds, variant: v.id, done, beat: v.beats[beatIndexAt(t, v.beats)].id,
      boat: { x: BOAT_REST.x, z: BOAT_REST.z, y: BOAT.float, yaw: BOAT_REST.yaw, moving: false },
      companion: { ...LANDED.companion, aboard: false, walking: false },
      traveler: { visible: true, ...LANDED.traveler },
      camera: { position: { ...LANDED.camera.position }, target: { ...LANDED.camera.target } },
      bobWeight: 0, caption: captionAt(t, v.beats, companion), landed: done ? LANDED : null,
    };
  }
  const boat = boatAt(t);
  const companionState = companionAt(t, boat);
  const camera = cameraAt(t, boat, companionState, v.beats);
  const eye = eyeAt(t, boat);
  // How much of the boat's bob the eye and the traveler take: all of it aboard, none once ashore,
  // fading through the step up so the crane back to the pier does not end with a drop.
  const bobWeight = done ? 0 : t < PHASES.ashore ? 1 : 1 - smooth((t - PHASES.ashore) / (PHASES.end - PHASES.ashore));
  return {
    t, seconds: v.seconds, variant: v.id, done, beat: v.beats[beatIndexAt(t, v.beats)].id,
    boat: done ? { x: BOAT_REST.x, z: BOAT_REST.z, y: BOAT.float, yaw: BOAT_REST.yaw, moving: false } : boat,
    companion: done ? { ...LANDED.companion, aboard: false, walking: false } : companionState,
    traveler: done ? { visible: true, ...LANDED.traveler } : { visible: false, x: eye.x, y: eye.y, z: eye.z, yaw: boat.yaw },
    camera: done ? { position: { ...LANDED.camera.position }, target: { ...LANDED.camera.target } } : camera,
    bobWeight, caption: captionAt(t, v.beats, companion), landed: done ? LANDED : null,
  };
}

/** The events with `from < at <= to`, in order, so a host stepping the clock fires each once. */
export function eventsBetween(from, to, variant = 'standard') {
  const v = VARIANTS[variant] ?? VARIANTS.standard;
  return v.beats.flatMap(b => b.events).filter(e => e.at > from && e.at <= to).sort((a, b) => a.at - b.at);
}
/** Every event of a variant, in order. */
export function eventsOf(variant = 'standard') { return eventsBetween(-Infinity, Infinity, variant); }

/** What skipping sets: the end of the sequence, which is also where it lands on its own. */
export const SKIP = freeze(stateAt(SEQUENCE_SECONDS));
/** The same for the shore variants. */
export const SKIP_BY_VARIANT = freeze(Object.fromEntries(VARIANT_IDS.map(id => [id, freeze(stateAt(VARIANTS[id].seconds, { variant: id }))])));
