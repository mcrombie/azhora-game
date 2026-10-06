/**
 * The animals of the West Lotharn, as ranges for the western wildlife rigs
 * (`src/content/regions/western-regions/west-regions-life.js` draws them, instanced and distance-culled, and they are ambient:
 * nobody can attack, catch or speak to them).
 *
 * **This is the first country in the game with real altitude in it**, and the ranges are sorted by
 * it rather than by anything else. Five hundred and fifty metres from the long valley's floor to
 * the crest's bald puts three different kinds of ground one above another:
 *
 *  - **the valley floors**, flat, grassed, deep-soiled, with the wood standing back from them: the
 *    deer and the boar are there, and so is everything that needs cover and water;
 *  - **the ledge forest**, with resident deer and boar on its wider soil-covered shelves and
 *    wooded shoulders. They remember their paths between the trunks; steep faces and narrow
 *    cliff ledges remain outside their footing rather than excluding the whole forest;
 *  - **the balds above the tree line**, at two hundred and fifty metres and up, which are thin
 *    short-grazed turf ringed by cliff - the hares' ground, and nothing else's;
 *  - **and the air over the crest**, which is the one thing this range has that no other country in
 *    the game does. A bird riding the updraught off a five-hundred-metre face is a thing a traveler
 *    can only see from up there, and there are two.
 *
 * The lore catalogues no Lotharn fauna at all, so every one of these is an extension of an animal
 * documented elsewhere and says so. What the lore does give is the country: "managed old-growth,
 * forest that knows people", oak, chestnut and beech - mast for boar and browse for deer - the
 * burning practices "that maintained certain open ridgetop areas", and each valley's own water.
 *
 * **No domestic stock.** The East Lotharn has sheep on Upper Olveth because the lore puts them
 * there and because that country was built to an earlier brief; a flock with nobody near it is
 * still somebody's flock, and nothing here belongs to anybody (docs/west-lotharn-brief.md).
 *
 * **No new rig.** Everything below is a rig the game already has.
 *
 * Every site was measured on the built ground - dry, this country's own, off the water and standable
 * - and `tests/west-lotharn-world.test.js` holds each one to it.
 */
const freeze = Object.freeze;
const zone = (id, species, radius, box, sites, note, traits = {}) => freeze({
  id, species, region: 'West Lotharn Mountains', radius, scale: 1, keepRegion: true,
  minX: box[0], maxX: box[1], minZ: box[2], maxZ: box[3],
  sites: freeze(sites.map(site => freeze(site))), note, ...traits,
});

export const WEST_LOTHARN_WILDLIFE_ZONES = freeze([
  // -----------------------------------------------------------------------
  // The valley floors
  // -----------------------------------------------------------------------
  zone('long-valley-deer', 'red-deer', .55, [-1880, -1690, -740, -610], [[-1717, -679], [-1767, -677], [-1827, -676], [-1790, -690]],
    'Extension: red deer, the game’s deer, on the long valley’s eastern floor. This is the one piece of ground in the range that is both open and level — fifty paces of meadow on deep soil with the wood standing back from it on both sides — and in a closed broadleaf forest the open ground is where a deer is seen at all.',
    { hornless: true }),
  zone('long-valley-boar', 'boar', .7, [-2145, -1965, -625, -505], [[-2065, -556], [-1985, -592], [-2093, -540], [-2032, -570]],
    'Extension: boar at the wood’s edge on the long valley’s western floor, where the chestnut and the oak come down to the grass. The lore’s forest is "oak, chestnut, maple, hickory, walnut, beech" — six mast trees out of seven — and the pig of every oak country there is follows the mast down the hill in the autumn and works the valley floor for it.'),
  zone('north-valley-deer', 'red-deer', .55, [-1940, -1810, -930, -820], [[-1882, -853], [-1872, -881], [-1893, -866]],
    'Extension: a second band on the north valley’s floor, which is the range’s own drainage to the Mithala plain and the only open ground on the whole north face. The lore has the range showing the plain "a long forested wall"; this is the one notch in it, and everything that grazes on the north side comes down to it.',
    { hornless: true }),
  zone('west-beck-fox', 'river-fox', .32, [-2380, -2180, -480, -390], [[-2229, -447], [-2323, -405], [-2276, -426]],
    'The *vel-caric*, "a small, semi-aquatic carnivore with a distinctive dark-tipped tail and the narrow, mobile face of a creature that lives in river margins", documented on the Carica four countries south-west. Extension, and the only animal in the range that will look at a traveler instead of leaving: the west beck’s lower reach is a slow stream on a flat valley floor with cover on both banks, which is the margin the fox wants and the only one this country has.'),
  zone('notch-herons', 'wading-bird', .4, [-1660, -1570, -975, -905], [[-1606, -943], [-1611, -957]],
    'Extension: grey herons on the Kemrath reach where it comes out of the notch and slows on the last of the fall to the Mithala margin. The fauna overview calls the Lizeem system’s wading birds "the richest avian assemblage documented on the continent", and this water joins that system a few hundred paces north of where they stand.'),
  // -----------------------------------------------------------------------
  // Above the tree line
  // -----------------------------------------------------------------------
  zone('crest-hares', 'upland-hare', .3, [-1900, -1770, -850, -730], [[-1836, -797], [-1846, -791], [-1838, -785]],
    'Extension: hares on the crest’s bald, five hundred and fifty metres up and two hundred metres above the last tree — the highest ground any animal in the game stands on. It is the same thin, short-grazed turf the Ganoss upland hares keep in the north, on the one patch of it in the range that nothing can reach without using the ramps.'),
  zone('cold-head-hares', 'upland-hare', .3, [-2470, -2320, -560, -415], [[-2400, -494], [-2384, -478], [-2364, -474]],
    'Extension: hares on the cold head’s bald at the range’s western tip, where the World Builder map puts the country’s one continental hex. Bare stone and thin turf in courses, with the westerly weather arriving here first and nothing between it and the summit.'),
  // -----------------------------------------------------------------------
  // The air over the crest
  // -----------------------------------------------------------------------
  zone('crest-vulture', 'turkey-vulture', .3, [-1960, -1740, -900, -690], [[-1842, -792]],
    'Extension: one bird riding the updraught off the crest’s faces. A five-hundred-metre wall of cliff in courses is a lift generator, and a soaring bird over it hangs without a wingbeat for as long as anybody watches — which is the whole point of having got to the top. It is also the only thing in the game a traveler looks *down* at while it flies.',
    { air: 42 }),
  zone('west-shoulder-hawk', 'plateau-hawk', .3, [-2210, -2050, -700, -540], [[-2130, -615]],
    'The dry-plateau hawk, which the fauna overview places on the upland grasslands of the country east of the Lotharn; an extension here, over the west shoulder’s bald and the long valley below it. One bird, high, quartering the open ground between the tree line and the summit.',
    { air: 36 }),
  // Append resident woodland bands: the original twenty-four animals retain
  // their zone order, site positions and saved identities.
  zone('west-lotharn-spur-woodland-boar', 'boar', .7, [-2060, -1930, -460, -360], [[-1990, -410], [-2002, -410], [-1994, -419]],
    'Extension: boar rooting in the oak and chestnut woods on the low southern spur. Broad soil-covered shoulders give them room to turn among the trunks; the rocky faces and summit bald are excluded by their footing limits.',
    { habitat: 'woodland', maxSlope: .6 }),
  zone('west-lotharn-valley-woodland-deer', 'red-deer', .55, [-1960, -1830, -700, -605], [[-1890, -650], [-1902, -650], [-1894, -640]],
    'Extension: red deer browsing inside the woods above the middle of the long valley, between its established open meadow bands. They use the sheltered, gently sloping shelf and remembered gaps between trees, not the cliff courses above it.',
    { habitat: 'woodland', hornless: true, maxSlope: .6 }),
  zone('west-lotharn-cold-head-woodland-boar', 'boar', .7, [-2360, -2240, -560, -460], [[-2300, -510], [-2306, -508]],
    'Extension: a pair of boar on the cold head\'s broad wooded shoulder, below its bald, where fallen broadleaf mast gathers beneath the mountain. They can retreat through the grove while their footing limits exclude the steep faces around it.',
    { habitat: 'woodland', maxSlope: .6 }),
  zone('west-lotharn-east-foot-woodland-deer', 'red-deer', .55, [-1680, -1570, -735, -640], [[-1610, -690], [-1622, -696]],
    'Extension: two red deer in the eastern foothill woods below the east arm, beyond the notch and its water birds. The open understory supplies browse and a level retreat through the trees while the steeper mountain ground stays out of reach.',
    { habitat: 'woodland', hornless: true, maxSlope: .6 }),
]);
