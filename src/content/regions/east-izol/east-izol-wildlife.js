/**
 * East Izol's animals, as ranges for the western wildlife rigs (`src/content/regions/western-regions/west-regions-life.js` draws them, instanced and
 * distance-culled; they are ambient: nobody can attack, catch or speak to them).
 *
 * **What the lore gives this coast.** The island's own file says nothing of its animals; the fauna overview's
 * **Iberos Coast and the Iberos Sea** section is about exactly this water (`azhora_lore/fauna/azhoran_fauna_overview.md`):
 * "The seabird colonies of the Iberos coast are among the most extensive on the continent. Certain rocky headlands and
 * offshore islands - particularly along the Svaleen coast and the exposed Legemum headlands - host breeding
 * populations of the gannet-relative the Academy catalogues as the Great White Sea-plunger", and "Grey dolphins are a
 * consistent presence in Iberos coastal waters". Izol is the large rocky island off the Svaleen coast, "cut by the sea
 * into dramatic coastal formations", so the colonies are on its headlands and the dolphins are off its shore. The
 * gulls are the seabird the game draws standing, as on every headland of the Iberos coast already built (West Izol,
 * the Ascarths, Legemum, Selemis); the sea-plunger is the one that circles and folds into the sea.
 *
 * Everything inland is an extension and says so: West Izol's own **hares in the gorse** (`izol-gorse-hares`,
 * src/world/life/regional-wildlife.js) carried over the line; the **dry-plateau hawk** over the north arm's hills and a
 * **harrier** over the central plain's pasture, as the Ascarths carry the pair of them.
 *
 * **Left out, and why.** No **wild goat** on the Presences: the one wild goat the game has is the Oremindi snowgoat,
 * which the overview keeps to "the steep high terrain between the treeline and the glaciers" of the Oremindi, and the
 * Presences are Mediterranean hills of a hundred and twenty to a hundred and forty metres - and on this island a goat on
 * a hill would be read as the highland tribes' own. No **boar** in the holm-oak folds, though the Ascarths have them in
 * their evergreen-oak wood: the island's woods are pockets a few dozen metres across, and a band's range must be open
 * ground with nothing that blocks a walker in it, so a boar range in a fold would cut a hole in one of the island's
 * only woods. The builder's call, and an easy one to reverse if a glade is wanted.
 *
 * **Nothing here is anybody's.** The highland tribes graze the interior and their flocks are stock, so there is not
 * one sheep or goat on this ground, and no cattle or horse either.
 *
 * **Every band has its own layout** - a line along a cliff edge, a knot on the turf, an arc round a head, a loose
 * three; a wide triangle, a pair and a straggler, a zigzag - because the Celder review found two herds put down in
 * one pattern. Ranges are on open ground with nothing that blocks a walker in them: the scenery keeps every tree, tall
 * shrub and boulder out (`eastIzolWildlifeClear`), and lets the gorse and the low garrigue grow among the hares.
 * `tests/east-izol-life.test.js` holds each home to its ground, each range to the west's laws, each pod and each
 * diving bird to open sea, and every band to a shape of its own.
 */
const freeze = Object.freeze;
export const EAST_IZOL_REGION = 'East Izol';
const zone = (id, species, radius, box, sites, note, traits = {}) => freeze({
  id, species, region: EAST_IZOL_REGION, radius, scale: 1, keepRegion: true,
  minX: box[0], maxX: box[1], minZ: box[2], maxZ: box[3],
  sites: freeze(sites.map(site => freeze(site))), note, maxSlope: .5, ...traits,
});
const PLUNGE = freeze({ every: 9, fall: 1.1, under: 1.8, climb: 3.2 });

export const EAST_IZOL_WILDLIFE_ZONES = freeze([
  // -------------------------------------------------------------------------
  // The headland colonies: gulls on the clifftop turf, each colony laid out as its own head lets it
  // -------------------------------------------------------------------------
  zone('east-izol-east-head-gulls', 'gull', .3, [820, 846, 1556, 1608],
    [[838.5, 1566.5], [836.5, 1575], [839, 1583], [837, 1591.5], [838.5, 1599.5]],
    'The overview: the seabird colonies of the Iberos coast are "among the most extensive on the continent", on "certain rocky headlands and offshore islands". On the island\'s easternmost point (the ground\'s own east head: "seabirds on its face"), a line of gulls along the clifftop turf six to ten metres back from the edge, one to a stance and all facing the open sea - the seabird the game draws standing, as on every headland of the Iberos coast already built.',
    { maxSlope: .7 }),
  zone('east-izol-north-head-gulls', 'gull', .3, [588, 626, 1366, 1396],
    [[601, 1377.5], [606.5, 1376.5], [608.5, 1381.5], [603, 1383]],
    'The same colonies\' kind at the tip of the north arm, the headland that looks toward the Svaleen coast across the channel - the coast the overview names for its seabird colonies. Four in a knot on the turf above the north cliffs.',
    { maxSlope: .7 }),
  zone('east-izol-south-head-gulls', 'gull', .3, [622, 646, 2114, 2140],
    [[633, 2118.5], [637.5, 2123.5], [636, 2129], [631.5, 2133.5], [627, 2136]],
    'Gulls on the south head, "cliffed on every side": five in an arc along the curve of its eastern clifftop, between the edge and the way that climbs from the head onto the back of the southern Presence, with the open sea to the east and south.',
    { maxSlope: .7 }),
  zone('east-izol-north-east-head-gulls', 'gull', .3, [756, 796, 1456, 1494],
    [[776, 1468], [785.5, 1477], [771, 1481.5]],
    'A loose three on the headland east of the north-east bay, where the cliff turns from the north coast to the east: the smallest of the island\'s colonies, on the same clifftop turf.',
    { maxSlope: .7 }),
  // -------------------------------------------------------------------------
  // The sea
  // -------------------------------------------------------------------------
  zone('east-izol-north-sea-plungers', 'sea-plunger', .3, [604, 652, 1312, 1360],
    [[624, 1334], [630, 1338.5], [627, 1331]],
    'The **Great White Sea-plunger**, the gannet-relative the overview puts on "certain rocky headlands and offshore islands - particularly along the Svaleen coast", whose "vertical dives from height into the Iberos shoals are one of the more visible demonstrations of the sea\'s productivity". Izol is the island off the Svaleen coast, and this is its north arm\'s tip, facing that coast: three birds circling off the north head and folding into the sea in turn.',
    { air: 24, circle: 20, period: 16, bob: 1.4, keepRegion: false, plunge: PLUNGE }),
  zone('east-izol-east-sea-plungers', 'sea-plunger', .3, [820, 868, 1632, 1680],
    [[842, 1652], [848, 1658.5], [844.5, 1661.5], [839, 1656.5]],
    'The same bird off the east coast, over the mouth of the east bay between the east head and the headland south of it: four fishing the bay where the open sea comes in, the island\'s other face. An extension from the Svaleen coast by the width of the channel, as the north arm\'s are.',
    { air: 26, circle: 20, period: 18, bob: 1.6, keepRegion: false, plunge: freeze({ every: 11, fall: 1.2, under: 1.8, climb: 3.4 }) }),
  zone('east-izol-east-dolphins', 'dolphin', 0, [860, 908, 1574, 1706],
    [[881, 1596], [889, 1640], [877, 1688]],
    'The overview: "Grey dolphins are a consistent presence in Iberos coastal waters." A placement and not an extension - Izol is in the Iberos - off the east coast, which "faces the open sea": a pod of three working the water off the east bay, seen from the east head and the bay\'s strand and not reachable from either.',
    { sea: true, keepRegion: false }),
  zone('east-izol-south-dolphins', 'dolphin', 0, [506, 642, 2177, 2223],
    [[540, 2192], [566, 2206]],
    'Two more of the same grey dolphins off the south head, where Solne\'s boats go out to meet the deep-water schools that "run" off the island\'s south coast: a pair, out past the foot of the cliffs.',
    { sea: true, keepRegion: false }),
  // -------------------------------------------------------------------------
  // The gorse
  // -------------------------------------------------------------------------
  zone('east-izol-north-arm-hares', 'upland-hare', .3, [510, 578, 1484, 1542],
    [[530, 1504], [555, 1508], [541, 1525]],
    'Extension: West Izol\'s own hares, which "keep to gorse and open turf behind the eastern headlands" (`izol-gorse-hares`, src/world/life/regional-wildlife.js), carried over the line onto the north arm\'s garrigue - dry, open, stony ground with gorse a bound away, which is what an upland hare keeps everywhere it is drawn. Three, wide apart.'),
  zone('east-izol-central-plain-hares', 'upland-hare', .3, [442, 504, 1786, 1840],
    [[466, 1811], [469.5, 1815.5], [487, 1803]],
    'Extension: the same hares on the pasture of the central plain\'s western side, between West Izol\'s line and the Hearth Road\'s end - a pair and one on its own.'),
  zone('east-izol-south-coast-hares', 'upland-hare', .3, [704, 752, 1908, 1962],
    [[724, 1924], [733.5, 1933], [726, 1944], [738, 1952]],
    'Extension: hares in the gorse and garrigue between the east coast\'s clifftop way and the cliffs, south of the eastern Presence - four, zigzagging down the slope.'),
  // -------------------------------------------------------------------------
  // The air over the land
  // -------------------------------------------------------------------------
  zone('east-izol-north-arm-hawk', 'plateau-hawk', .3, [480, 680, 1380, 1540], [[580, 1460]],
    'Extension: the overview\'s dry-plateau hawk, "which hunts the upland grasslands", as West Suval and the Ascarths carry it - one bird riding the air high over the north arm\'s grass hills.',
    { air: 32 }),
  zone('east-izol-central-plain-harrier', 'harrier', .3, [440, 540, 1790, 1866], [[490, 1828]],
    'Extension from the Ascarths\' tip: a harrier quartering the central plain\'s pasture, low and following the ground, between West Izol\'s line and the foot of the Presences.',
    { air: 9, circle: 22, period: 19, quarter: 22, bob: 1.2, follow: true }),
]);

/**
 * Where scenery that blocks a walker must not stand: inside a range of anything that lives on the ground, `margin`
 * metres out. An animal giving ground backs straight away from whoever comes at it, and a boulder or a trunk behind it
 * is a corner; the ranges are open ground, so this costs the island nothing it should have.
 */
export function eastIzolWildlifeClear(x, z, margin = 0) {
  return EAST_IZOL_WILDLIFE_ZONES.some(zone => !zone.air && !zone.sea
    && x >= zone.minX - margin && x <= zone.maxX + margin && z >= zone.minZ - margin && z <= zone.maxZ + margin);
}
