/**
 * Which bird the traveler is watching, and where it is from where he stands.
 *
 * Birding already knows what a bird is worth (src/birding.js) and the birds
 * themselves fly about in src/drent-birds.js. This is the small piece between
 * them: given the birds that are out and the traveler's own position and
 * heading, it says which one is *the* bird right now, how far off it is, which
 * way he has to turn his head, and how to put that in words. The pointer over
 * the bird, the mark on the chart and the card all read from the one answer, so
 * they cannot disagree with each other.
 *
 * Pure: no DOM, no three, no world state. It is handed a plain list of birds.
 */

const TAU = Math.PI * 2;
const finite = point => !!point && Number.isFinite(point.x) && Number.isFinite(point.z);
/** Radians folded back into -pi..pi, so a bearing behind the traveler is not reported twice. */
const wrap = angle => { const a = (angle + Math.PI) % TAU; return (a < 0 ? a + TAU : a) - Math.PI; };

/** A bird on the wing is not a bird to point at: it will not be where the pointer is by the time you look up. */
export const BIRD_ON_THE_WING = Object.freeze(['flight', 'arrive', 'leave', 'away']);

/**
 * How much of the world is in front of the traveler, in radians either side of
 * his nose. The game's camera is 54 degrees vertically, which on a wide screen
 * is about 85 across; half of that, a little rounded down, is what counts as
 * "he can see it without turning".
 */
export const BIRD_VIEW_HALF_ANGLE = 0.72;

/**
 * How far off a bird reads as, in the traveler's own words rather than metres.
 * The bands are set against the observing range, which starts at 18 m and grows
 * to 30 with practice (observeRange in src/birding.js): most of what he can
 * observe is "close", and "far off" is the edge of what his eyes will do.
 */
export function birdNearness(distance) {
  if (!Number.isFinite(distance) || distance < 0) return '';
  if (distance < 6) return 'very close';
  if (distance < 12) return 'close';
  if (distance < 20) return 'a little way off';
  return 'far off';
}

/** Which way to turn. `bearing` is radians off the traveler's nose, positive to his right. */
export function birdDirection(bearing) {
  if (!Number.isFinite(bearing)) return '';
  const turn = wrap(bearing), away = Math.abs(turn), hand = turn < 0 ? 'left' : 'right';
  if (away <= Math.PI / 8) return 'straight ahead';
  if (away <= 3 * Math.PI / 8) return `ahead and to the ${hand}`;
  if (away <= 5 * Math.PI / 8) return `to your ${hand}`;
  if (away <= 7 * Math.PI / 8) return `behind you, to the ${hand}`;
  return 'straight behind you';
}

/** The whole of it in one line, as the card shows it: "Close, ahead and to the left". */
export function birdWords(found) {
  if (!found || !Number.isFinite(found.distance) || !Number.isFinite(found.bearing)) return '';
  const near = birdNearness(found.distance), direction = birdDirection(found.bearing);
  const line = near ? `${near}, ${direction}` : direction;
  return line ? line[0].toUpperCase() + line.slice(1) : '';
}

/**
 * Where a bird lies from a point, for a traveler facing `heading`.
 *
 * Heading follows the world's one convention: forward is (sin h, cos h), the
 * same as a character's rotation.y, a bird's yaw and the arrow on the chart.
 * The traveler's right hand is then (-cos h, sin h) - facing north, which is
 * -Z, his right is east - so a positive bearing is a bird to his right.
 */
export function birdBearing(position, heading, bird) {
  if (!finite(position) || !finite(bird)) return null;
  const h = Number.isFinite(heading) ? heading : 0;
  const dx = bird.x - position.x, dz = bird.z - position.z, distance = Math.hypot(dx, dz);
  const forward = dx * Math.sin(h) + dz * Math.cos(h);
  const side = -dx * Math.cos(h) + dz * Math.sin(h);
  return { distance, forward, side, bearing: distance ? Math.atan2(side, forward) : 0 };
}

/** The coarse quarter a bearing falls in, for anything that wants four answers rather than words. */
export function birdQuarter(bearing) {
  if (!Number.isFinite(bearing)) return '';
  const turn = wrap(bearing), away = Math.abs(turn);
  if (away <= Math.PI / 4) return 'ahead';
  if (away >= 3 * Math.PI / 4) return 'behind';
  return turn < 0 ? 'left' : 'right';
}

/**
 * The one bird the traveler is watching.
 *
 * A bird counts if it is out, settled rather than on the wing, and within
 * `range` - the observing range his practice has earned him. Of those:
 *
 *   1. the bird he is already watching, if it is still one of them. Pressing B
 *      settles on a bird, and the pointer should not hop off it the moment
 *      something closer lands;
 *   2. failing that, whichever bird the host offers as `preferred` - the one B
 *      would actually register, which the host works out with the camera in
 *      hand, so the pointer and the prompt never name different birds;
 *   3. failing that, the nearest. Ties go to the earlier bird in the list,
 *      which is stable because the flock's order is.
 *
 * A bird behind him still counts: it is reported as behind, which is the whole
 * use of a pointer. Nothing is returned when nothing qualifies, and the birding
 * the game already had carries on exactly as before.
 */
export function findBird(birds, { position, heading = 0, range = 18, watching = null, preferred = null,
  halfAngle = BIRD_VIEW_HALF_ANGLE } = {}) {
  if (!Array.isArray(birds) || !finite(position) || !Number.isFinite(range) || range <= 0) return null;
  const able = [];
  for (const bird of birds) {
    if (!finite(bird) || bird.visible === false || BIRD_ON_THE_WING.includes(bird.action)) continue;
    const seen = birdBearing(position, heading, bird);
    if (!seen || seen.distance > range) continue;
    able.push({ bird, ...seen });
  }
  if (!able.length) return null;
  const held = watching != null ? able.find(entry => entry.bird.id === watching) : null;
  const asked = preferred != null ? able.find(entry => entry.bird.id === preferred) : null;
  const nearest = able.reduce((best, entry) => entry.distance < best.distance ? entry : best);
  const pick = held ?? asked ?? nearest;
  const limit = Number.isFinite(halfAngle) && halfAngle > 0 ? halfAngle : BIRD_VIEW_HALF_ANGLE;
  const found = {
    id: pick.bird.id, species: pick.bird.species, variant: pick.bird.variant ?? null,
    x: pick.bird.x, y: Number.isFinite(pick.bird.y) ? pick.bird.y : 0, z: pick.bird.z,
    distance: pick.distance, bearing: pick.bearing, forward: pick.forward, side: pick.side,
    quarter: birdQuarter(pick.bearing), behind: Math.abs(wrap(pick.bearing)) > Math.PI / 2,
    inView: Math.abs(wrap(pick.bearing)) <= limit,
    watched: !!held, preferred: !held && !!asked, range, choices: able.length,
  };
  found.words = birdWords(found);
  return found;
}
