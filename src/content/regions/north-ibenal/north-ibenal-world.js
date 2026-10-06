/**
 * North Ibenal: terrain, climate and water only (src/content/regions/north-ibenal/north-ibenal-scenery.js and src/content/regions/north-ibenal/north-ibenal-wildlife.js carry what
 * grows and what lives here). Nothing here belongs to anybody: no fishing harbour, edge settlement, pass provisioner or
 * road through the Narrows. The flats at the last stream's mouth and at the Narrows' end are kept level and open.
 *
 * **The ground is the corridor's one plain, laid on these hexes** (`ibenalLand`, src/content/regions/south-ibenal/south-ibenal-world.js): the two
 * countries are one corridor to the lore and one function here, so nothing changes at the eight hex edges they share,
 * and the border stream crosses their line as it wanders. What this country has that South Ibenal does not: the plain
 * at its widest, under North Ibenwood, with the last stream crossing it in a narrower, deeper vale; a colder, higher,
 * rockier coast; the Oremindi's foot along its north-eastern edge; the foothill on the atlas's one hills cell, (-21,99);
 * and the Narrows, where the corridor pinches between the sea and the mountains from six hexes to two and ends at a
 * rocky point.
 */
import { regionAt, REGION_CELLS, REGION_IDS } from '../../../world/terrain/region-world.js';
// Only South Ibenal's functions are imported, and only called at runtime: its constants are re-exported live below, never
// read while this module loads, because a cycle through src/world/terrain/world-terrain.js can load this module before that one.
import { ibenalWriter, ibenalLand, ibenalTint, ibenalShoreTint, ibenalCover, ibenalRiverAt, ibenalWaterAt, ibenalWaterRibbons,
  ibenalWaterColliders } from '../south-ibenal/south-ibenal-world.js';
/**
 * The places kept for what belongs to somebody (the border stream's flat, the last stream's, and the Narrows' end), and
 * the ways the ground gives (the corridor's northern half to the Narrows, and the way to the Oremindi's foot): laid with
 * the plain, because the streams' fords are where these ways cross them.
 */
export { NORTH_IBENAL_RESERVED, NORTH_IBENAL_TRAILS, IBENAL_FOOTHILL, IBENAL_NARROWS } from '../south-ibenal/south-ibenal-world.js';

const freeze = Object.freeze, point = (x, z) => freeze({ x, z });
export const NORTH_IBENAL = 'North Ibenal';
export const NORTH_IBENAL_CELLS = freeze(REGION_CELLS[NORTH_IBENAL] ?? []);
/**
 * The climate per hex, off the World Builder map: `Csc` on all thirty-four, the cold-summer Mediterranean of the
 * corridor's northern end. The sky stays the world's default, as South Ibenal's and Alezhor's do.
 */
export const NORTH_IBENAL_KOPPEN = 'Csc';
export const NORTH_IBENAL_CLIMATE = freeze(Object.fromEntries(NORTH_IBENAL_CELLS.map(c => [`${c.q},${c.r}`, NORTH_IBENAL_KOPPEN])));
/** Whether a point is on North Ibenal's own ground. */
export function northIbenalOwns(x, z) { return regionAt(x, z)?.name === NORTH_IBENAL; }
/** Whether this country writes the ground at a point: its hexes, and its own shore past them. */
export const northIbenalWrites = (x, z) => ibenalWriter(x, z) === NORTH_IBENAL;
/** Where the developer's travel tool sets a traveler down. */
export const NORTH_IBENAL_ARRIVAL = point(-4150, -140);
/** North Ibenal's cover, and its share of the streams: the cover where it writes, the stream its scenery draws. */
export function northIbenalCover(x, z) { return northIbenalWrites(x, z) ? ibenalCover(x, z) : null; }
export const northIbenalRiverAt = (x, z, limit = 30) => ibenalRiverAt(x, z, limit);
export const northIbenalWaterAt = (x, z) => ibenalWaterAt(x, z);
export const northIbenalWaterRibbons = () => ibenalWaterRibbons().filter(r => r.country === NORTH_IBENAL);
export const northIbenalWaterColliders = () => ibenalWaterColliders().filter(c => c.country === NORTH_IBENAL);
const place = (id, name, x, z, radius, description) => freeze({ id, name, region: REGION_IDS[NORTH_IBENAL], x, z, radius, description });
const view = (eye, target, walk = false) => freeze({ eye: freeze({ x: eye[0], z: eye[1], y: eye[2] }), target: freeze({ x: target[0], z: target[1], y: target[2] }), ...(walk ? { walk: true } : {}) });
/** Places for the chart: natural places only, named in plain words - no harbour, settlement, road or pass is named. */
export const NORTH_IBENAL_LANDMARKS = freeze([
  place('north-ibenal-border-mouth', "The border stream's mouth", -4372, -62, 30,
    'The border stream reaches the sea in a small bay on the line between the two Ibenals, with a stretch of level grass on its northern side.'),
  place('north-ibenal-open-plain', 'The open plain', -4130, -160, 45,
    "North Ibenal's plain at its widest: five hundred metres of cold grass between the open ocean and North Ibenwood's dark line, rising all the way to the trees."),
  place('north-ibenal-tree-line', 'Under North Ibenwood', -3890, -200, 34,
    'Where the plain rises to the North Ibenwood: the trees stand close and dark at the top of the rise, near enough to hear at night.'),
  place('north-ibenal-last-vale', "The last stream's vale", -3975, -215, 30,
    'The last water before the Narrows runs in a narrower, deeper vale than the southern streams, over gravel, between grass banks a few metres high.'),
  place('north-ibenal-rocky-shore', 'The rocky shore', -4288, -253, 30,
    "The colder, more exposed northern shore: low points of broken rock between small coves, with the open ocean's weather coming straight in."),
  place('north-ibenal-last-mouth', "The last stream's mouth", -4113, -334, 30,
    'The last stream comes down to a small bay at the foot of the Narrows, with level grass beside its mouth and rock on either hand.'),
  place('north-ibenal-mountain-foot', "The Oremindi's foot", -3690, -318, 34,
    "The plain's north-eastern corner, where North Ibenwood's edge meets the first slopes of the South Oremindi and the long ascent toward the passes begins."),
  place('north-ibenal-narrows', 'The Narrows', -3975, -480, 45,
    "The last flat ground of the corridor: a way a little over a hundred metres wide between the shore's rocks and the rise to the mountains' foot."),
  place('north-ibenal-narrows-end', "The corridor's end", -3944, -540, 30,
    'Where the Narrows end in level grass under the foothill, the sea on one hand and the Oremindi rising on the other: as far north as the coast goes.'),
  place('north-ibenal-foothill', 'The foothill', -3866, -585, 34,
    "A rounded hill of grass and broken rock at the corridor's end, under the South Oremindi's first slopes, with the sea below it on two sides."),
]);
/**
 * Review views: high ones over the country, and walker's ones with the eye 1.8 m over the ground at its own place
 * (`walk: true`; the heights are the ground's, written out). The wildlife view is low over the last stream's mouth.
 */
export const NORTH_IBENAL_VIEWS = freeze({
  // Over the whole northern corridor from the open sea, to the Narrows and the mountains.
  'north-ibenal': view([-4520, -300, 170], [-4050, -260, 10]),
  // In the Narrows, looking north along the flat way to the foothill and the Oremindi.
  'north-ibenal-narrows': view([-3992, -430, 6.12], [-3880, -590, 16], true),
  // On the foothill, looking back down the corridor.
  'north-ibenal-foothill': view([-3866, -585, 16.94], [-4120, -300, 6], true),
  // Under North Ibenwood, looking east into the trees.
  'north-ibenal-tree-line': view([-3925, -200, 15.65], [-3820, -195, 26], true),
  // At the Oremindi's foot, looking up the first slopes toward the passes.
  'north-ibenal-mountain-foot': view([-3705, -322, 16.27], [-3560, -340, 60], true),
  // The rocky shore from the sea.
  'north-ibenal-rocky-shore': view([-4360, -300, 14], [-4280, -255, 4]),
  // Low over the last stream's mouth.
  'north-ibenal-wildlife': view([-4140, -405, 7], [-4095, -370, 1]),
});
/**
 * The ground. `incoming` is the ground every other layer laid; `before(x, z)` answers the ground without this country's
 * layer (src/world/terrain/world-terrain.js `groundBeforeNorthIbenal`), which the plain reads through its own copy for each line.
 * Writes only on North Ibenal's own land and answers `incoming` everywhere else.
 */
export function northIbenalGround(x, z, incoming, before) {
  if (!northIbenalWrites(x, z)) return incoming;
  return ibenalLand(x, z, incoming);
}
/** The colour of the ground on North Ibenal's own ground, as 0xRRGGBB, or null for "no opinion here". */
export function northIbenalTint(x, z, ground = null) {
  if (!northIbenalWrites(x, z)) return null;
  return ibenalTint(x, z, ground);
}
/** The shore's colour on North Ibenal's own rocks (`SHORE_TINTS`, src/world/terrain/world-terrain.js), or null. */
export function northIbenalShoreTint(x, z, d) { return northIbenalWrites(x, z) ? ibenalShoreTint(x, z, d) : null; }
