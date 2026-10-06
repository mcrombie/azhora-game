/**
 * North Ibenal's animals, as ranges for the western wildlife rigs (`src/content/regions/western-regions/west-regions-life.js` draws them, instanced and
 * distance-culled; they are ambient: nobody can attack, catch or speak to them). The account of the corridor's fauna is
 * in `src/content/regions/south-ibenal/south-ibenal-wildlife.js`; this is its cold northern end, where the lore has the forest "as neighbor", the
 * coast "more exposed", "the sea here is cold", and the plain running out at the Oremindi's foot.
 *
 *  - **the forest edge-cat**, "the medium predator of the Ibenale and Alezhor forest margin", at the North Ibenwood's
 *    line, where the forest presses closest to the shore - "the tree line is visible from the settlement, the
 *    forest-edge sounds are audible at night" (`geography/regions/north_ibenal.md`). Trogo's rig, as in the south.
 *  - **otters** on the corridor's one northern stream, nearest of all the corridor's water to "the Oremindi meltwater
 *    sources" the overview runs them from, the Carica's otter at its own size.
 *  - **grey seals** on the rocky shore: an extension, and a new animal. The overview names grey seals for "the cold
 *    waters of the Bay of Lol and the northern Azhoran coast" and "large populations of southern grey seal" for the
 *    cold westernmost strip of Bouén; North Ibenal's cold open coast lies between the two, and the lore gives it "the
 *    crustaceans of the rocky northern shore". A seal hauled out goes into the sea when it is come upon, as an otter
 *    goes into its river; the sea off its stones is named on its range (`water`), because the open sea carries no
 *    marker of its own.
 *  - **the migrants**: "Several species of wading bird that appear on the northern coast in summer and depart in
 *    autumn", and the corridor "a north-south migration route" - stilts at the stream's mouth, an extension, as Gala's
 *    and the Mithala's are catalogued on other shores.
 *  - **the coast's and the forest's birds**: gulls on the strand, and the Ibenwood's own hawk over its tree line.
 *
 * **What the neighbours add**, each an extension and each saying so: red deer at the tree line, stags this time, as
 * the North Ibenwood and the South Oremindi's wooded feet keep them; the upland hare on the short turf of the north's
 * heath and its hill, as the South Oremindi keeps it "in short turf and mountain-edge scrub"; and over the hill under the
 * mountain's foot, the South Oremindi's own eagle.
 *
 * **Nothing here is anybody's**: the corridor's last communities' boats, nets, horses and dogs are theirs, and none of
 * them is on this ground. Every band has its own layout; `tests/ibenal-life.test.js` holds them to it.
 */
const freeze = Object.freeze;
export const NORTH_IBENAL_REGION = 'North Ibenal';
const zone = (id, species, radius, box, sites, note, traits = {}) => freeze({
  id, species, region: NORTH_IBENAL_REGION, radius, scale: 1, keepRegion: true,
  minX: box[0], maxX: box[1], minZ: box[2], maxZ: box[3],
  sites: freeze(sites.map(site => freeze(site))), note, maxSlope: .5, ...traits,
});
/** An otter goes down a bank to the water: its ground may be as steep as the earth bank it slides down. */
const OTTER_BANK = 1.4;

/**
 * The seals' rocks, each with the way to the sea from it, and the sea off them, which the open sea does not mark: a
 * circle of water a little offshore of each seal's stones, for it to go into when it is come upon (`water`, read by
 * `src/content/regions/western-regions/west-regions-life.js` as an otter's river is). The rocks are ledges where the drawn terrain lies on the ground
 * itself (the 7.1-metre terrain cannot follow every low ledge of a rocky shore, and a seal is drawn on what is drawn).
 */
const SEAL_ROCKS = [[-4001, -603, -1, 0], [-4000, -572, -1, 0], [-4001, -566, -1, 0], [-4000, -555, -1, 0], [-4005, -546, -Math.SQRT1_2, -Math.SQRT1_2]];
const offshore = (rocks, out, r) => freeze(rocks.map(([x, z, dx, dz]) => freeze({ x: x + dx * out, z: z + dz * out, r })));

export const NORTH_IBENAL_WILDLIFE_ZONES = freeze([
  // -------------------------------------------------------------------------
  // The tree line
  // -------------------------------------------------------------------------
  zone('north-ibenal-edge-cats', 'forest-cat', .42, [-3900, -3830, -215, -130],
    [[-3862, -166], [-3847, -187]],
    'The **forest edge-cat** at the North Ibenwood\'s line, under its fir, birch and red cedar, where the lore has the forest "as neighbor" and "the forest-edge sounds ... audible at night": "the medium predator of the Ibenale and Alezhor forest margin". A pair, the trees a bound behind each. Trogo\'s rig, as in the south.'),
  zone('north-ibenal-edge-stags', 'red-deer', .55, [-3950, -3880, -75, -15],
    [[-3923, -61], [-3905, -43]],
    'Extension: red deer under the North Ibenwood near its corner with the West, a little south of where the last stream comes out from under the trees - stags this time, which the South Oremindi\'s wooded feet keep with their hinds (`src/content/regions/south-oremindi/south-oremindi-wildlife.js`) and the built Ibenwood keeps by the hex (`src/content/regions/ibenwood/ibenwood-life.js`). Two, grazing out from the edge.'),
  // -------------------------------------------------------------------------
  // The last stream and its mouth
  // -------------------------------------------------------------------------
  zone('north-ibenal-last-stream-otters', 'otter', .35, [-4035, -3970, -275, -195],
    [[-4005, -262], [-4002, -241], [-4002, -211]],
    'Otters on the last stream, the corridor\'s last water before the Narrows, in its narrower, deeper vale - of all the corridor\'s water the nearest to "the Oremindi meltwater sources" the overview runs its otters from. The great river otter\'s "smaller cousins", the Carica\'s otter at its own size: three down its west bank, each a slide from the water.',
    { maxSlope: OTTER_BANK }),
  zone('north-ibenal-mouth-stilts', 'stilt', .3, [-4125, -4055, -395, -340],
    [[-4097, -379], [-4102, -372], [-4092, -376], [-4086, -363]],
    'Stilts on the last stream\'s mouth: the overview\'s "several species of wading bird that appear on the northern coast in summer and depart in autumn", stopping on the corridor\'s north-south migration route at the last fresh water before the Narrows. Extension: the stilt is catalogued at the Mithala\'s and Gala\'s river mouths. Four picking along the water\'s edge below the flat kept at the bay.'),
  // -------------------------------------------------------------------------
  // The cold shore
  // -------------------------------------------------------------------------
  zone('north-ibenal-haulout-seals', 'grey-seal', .5, [-4016, -3985, -612, -538],
    SEAL_ROCKS.map(([x, z]) => [x, z]),
    'Extension, and a new animal: **grey seals** hauled out on the low rock below the foothill at the corridor\'s end. The overview names grey seals for "the cold waters of the Bay of Lol and the northern Azhoran coast" and "large populations of southern grey seal" for the cold westernmost strip of Bou\u00e9n; North Ibenal\'s is the cold open coast between the two - "the sea here is cold", "the rocky northern shore" (`north_ibenal.md`). Five along the rock, spread so that one sent into the sea always has somewhere along the stones to haul out again away from whoever sent it.',
    { scale: .85, maxSlope: .6, water: offshore(SEAL_ROCKS, 3.6, 2.6) }),
  zone('north-ibenal-strand-gulls', 'gull', .3, [-4330, -4270, -235, -170],
    [[-4298, -210], [-4292, -214], [-4296, -200], [-4302, -192]],
    'Gulls on the strand between two of the north\'s rocky points: the overview\'s "coastal species near the sea". Four in a loose knot on the upper beach.'),
  // -------------------------------------------------------------------------
  // The Narrows and the hill
  // -------------------------------------------------------------------------
  zone('north-ibenal-narrows-hares', 'upland-hare', .3, [-3975, -3870, -515, -440],
    [[-3944, -490], [-3924, -482], [-3908, -462], [-3932, -458]],
    'Extension: the upland hare on the short turf of the Narrows, the last flat ground before the passes, below the foothill: the South Oremindi keeps it "in short turf and mountain-edge scrub" a few hundred metres east, and the overview\'s upland hares are the cold north\'s. Four in a ragged arc.'),
  zone('north-ibenal-edge-hawk', 'plateau-hawk', .3, [-3876, -3796, -272, -192], [[-3836, -232]],
    'The forest edge\'s bird of the air over the North Ibenwood\'s line: the hawk the built Ibenwood flies "above lighter outer woodland" (`src/content/regions/ibenwood/ibenwood-life.js`). One, riding the air where the forest comes nearest the shore.',
    { air: 32, circle: 22, bob: 2 }),
  zone('north-ibenal-foothill-eagle', 'oremindi-mountain-eagle', .3, [-3910, -3830, -625, -545], [[-3870, -585]],
    'Extension: the South Oremindi\'s own eagle (`src/content/regions/south-oremindi/south-oremindi-wildlife.js`), "the apex aerial predator of the high range", seen from the corridor\'s last flat ground riding the air over the foothill under the mountain\'s foot - the first of the mountains\' animals a traveler going north meets. One, following the hill\'s ground.',
    { air: 40, circle: 26, period: 24, follow: true, bob: 2 }),
]);
