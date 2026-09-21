/**
 * How much of somebody is drawn, by how far off they are.
 *
 * A figure is fifteen to twenty-eight separate meshes, and each is a draw call; the ones near
 * enough to cast a shadow are drawn twice. They are switched on by distance alone, out to 180 m,
 * and measured in the renderer at the places people gather, more than half of the figures being
 * drawn were over sixty metres away: 18 of 33 at the Tidehaven landing, 18 of 31 on the field at
 * the Lauvel, 14 of 26 in Lumber Town square. At sixty metres somebody is about thirty pixels
 * tall on a 1080-line screen, at a hundred about twenty, at a hundred and eighty eleven. Nobody
 * can see a belt buckle at that size, and the renderer was drawing one.
 *
 * So past a distance a figure is a stand-in: one mesh, the shape of somebody standing, in their
 * own colours, casting no shadow. This file is the rule and the description, and is pure: no
 * three, no DOM. `src/figure-stand-in.js` builds the mesh from the description.
 */

/**
 * Out at 62 m and back in at 56 m, and not the same number twice.
 *
 * A single threshold flickers: people amble a few metres round where they stand, the company
 * walks the road, and a traveler who stops with somebody on the line would watch them change
 * back and forth. Six metres is wider than anybody's amble, so a figure that is going nowhere
 * is never on both sides of it, and it is under a second of the traveler's own run (7.2 m/s), so
 * walking up to somebody does not hold them as a peg for long once they are near enough to tell.
 * Sixty is where a figure has come down to about thirty pixels: limbs are two or three pixels
 * across and no longer read as limbs, but a red tabard still reads as red.
 */
export const FIGURE_LOD = Object.freeze({ out: 62, in: 56 });

/**
 * Who is never a stand-in, however far off. Each is somebody the player is, or is about to be,
 * looking straight at: whoever is being spoken to; anybody walking at the traveler's shoulder;
 * anybody in a fight or running from one, because that is movement and a peg does not move;
 * anybody wearing the mark the player is being sent to, because the eye goes to the mark and
 * then to what is under it; and a horse with somebody on it. Two more that are not about where
 * the player is looking but about what a stand-in is: it stands, on the ground. Somebody swimming
 * is up to the neck in the sea and a peg would stand on it; somebody kneeling at a grave or
 * sitting on a wall is a third shorter than a peg, and would be seen to get up and sit down again
 * as the traveler crossed the line.
 */
export function alwaysInFull(figure = {}) {
  return !!(figure.talking || figure.escorting || figure.fighting || figure.fleeing || figure.marked || figure.ridden
    || figure.swimming || figure.posed);
}

/**
 * @param was 'full' | 'stand-in' | undefined  what they were last frame
 * @param distance metres from the traveler (or from whatever is looking)
 * @param figure the flags `alwaysInFull` reads, and `kind`: only people have a stand-in. A dog,
 *   a cat, a horse or an ogre is fewer meshes, a different shape, and rarer; they stay as they are.
 * @returns 'full' | 'stand-in'
 */
export function figureDetail(was, distance, figure = {}, bands = FIGURE_LOD) {
  if ((figure.kind ?? 'person') !== 'person' || alwaysInFull(figure) || !Number.isFinite(distance)) return 'full';
  if (was === 'stand-in') return distance < bands.in ? 'full' : 'stand-in';
  return distance > bands.out ? 'stand-in' : 'full';
}

const channel = (colour, shift) => (colour >> shift) & 255;
const mix = (a, b, t) => [16, 8, 0].reduce((out, shift) => out | (Math.round(channel(a, shift) + (channel(b, shift) - channel(a, shift)) * t) << shift), 0);

/**
 * The stand-in, as a description: three stacked pieces in one mesh, bottom to top - legs, body,
 * head - so that it has somebody's silhouette and not a post's. The body is the tunic, which is
 * most of what anybody is at a distance and the thing worth telling apart (a red tabard stays a
 * red tabard); the head is the skin under whatever is on it; the legs are the tunic darkened,
 * because nearly everybody's are darker than their coat and nothing records them. Sizes are
 * metres for somebody of ordinary height, scaled by `height` and `girth` as the full figure is.
 */
export function standInLook({ tunic = 0x7a6a55, skin = 0xd7ad7e, hair = null, height = 1, girth = 1 } = {}) {
  const tall = Number.isFinite(height) && height > 0 ? height : 1, wide = Number.isFinite(girth) && girth > 0 ? girth : 1;
  return Object.freeze({
    castShadow: false,
    pieces: Object.freeze([
      Object.freeze({ part: 'legs', colour: mix(tunic, 0x201a16, .55), size: Object.freeze([.34 * wide, .82 * tall, .24 * wide]), y: .41 * tall }),
      Object.freeze({ part: 'body', colour: tunic, size: Object.freeze([.48 * wide, .66 * tall, .30 * wide]), y: 1.15 * tall }),
      Object.freeze({ part: 'head', colour: hair === null ? skin : mix(skin, hair, .45), size: Object.freeze([.24 * wide, .26 * tall, .24 * wide]), y: 1.62 * tall }),
    ]),
  });
}

/**
 * What it buys, from a list of figures as the renderer would see them.
 * @param figures [{ distance, meshes, casters? }] - everybody within the old view range
 * @returns draw calls for figures as things are, with the stand-in, and with the view range brought in as well
 */
export function figureDrawCalls(figures, { out = FIGURE_LOD.out, viewRange = 180, shadowRange = 30 } = {}) {
  let full = 0, withStandIn = 0, drawn = 0, standIns = 0;
  for (const figure of figures) {
    if (!(figure.distance <= viewRange)) continue;
    drawn++;
    const shadow = figure.distance < shadowRange ? (figure.casters ?? figure.meshes) : 0;
    full += figure.meshes + shadow;
    const peg = figure.distance > out && !alwaysInFull(figure) && (figure.kind ?? 'person') === 'person';
    if (peg) standIns++;
    withStandIn += peg ? 1 : figure.meshes + shadow;
  }
  return { drawn, standIns, full, withStandIn, saved: full - withStandIn };
}
