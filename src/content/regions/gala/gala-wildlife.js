/**
 * The animals of Gala, as ranges for the western wildlife rigs (`src/content/regions/western-regions/west-regions-life.js` draws them,
 * instanced and distance-culled, and they are ambient: nobody can attack, catch or speak to them).
 *
 * Every home site below was measured on the built world, not guessed: the geese on the water of the
 * distributary's last reach, the stilts on the bars between its braided threads, the egrets a pace
 * off its middle reach, the herons on the Lizeem's western bank clear of the wall of deep water, the
 * gulls on the upper beach, the dolphins out past it, the hares on the open steppe and the boar among
 * the maquis. `tests/gala-world.test.js` holds each site to its ground.
 *
 * The fauna overview names three of these on this coast in so many words — the **black migratory
 * geese** that "winter in the coastal marshes and river mouths", **grey dolphins**, "a consistent
 * presence in Iberos coastal waters" and documented in the Lizeem estuary, and the Lizeem
 * distributaries' wading birds, "the richest avian assemblage documented on the continent", herons
 * and "a range of stilt-legged species" among them. The rest are extensions and each says so: Gala's
 * inland fauna is not catalogued, and what lives on a steppe and in a Mediterranean scrub is taken
 * from what the lore puts in the dry country next door and on the coast either side.
 *
 * **Nothing domestic.** The lore's north is "grazed rather than farmed", and the stock that grazes it
 * belongs to the herding communities, who are people; a flock with nobody near it is still somebody's
 * flock (docs/gala-brief.md: "Domestic stock is somebody's: none").
 */
const freeze = Object.freeze;
const zone = (id, species, radius, box, sites, note, traits = {}) => freeze({
  id, species, region: 'Gala', radius, scale: 1, keepRegion: true,
  minX: box[0], maxX: box[1], minZ: box[2], maxZ: box[3],
  sites: freeze(sites.map(site => freeze(site))), note, ...traits,
});

export const GALA_WILDLIFE_ZONES = freeze([
  // The river mouths.
  zone('gala-geese', 'goose', .3, [-1790, -1740, 1305, 1385],
    [[-1755, 1320], [-1760, 1323], [-1760, 1330], [-1765, 1334], [-1764, 1341], [-1769, 1345], [-1768, 1351], [-1773, 1356], [-1772, 1361], [-1776, 1366]],
    'The fauna overview: "The black migratory geese that appear on the Iberos coast in late autumn in vast flocks, winter in the coastal marshes and river mouths, and depart in spring toward the north." A raft of them on the widest slow water in Gala, the distributary’s last reach above its braided mouths. Resident here until the game has seasons to bring them and take them away; the one new rig the brief allows.',
    { float: true }),
  zone('gala-stilts', 'stilt', .3, [-1790, -1735, 1300, 1380], [[-1746, 1311], [-1758, 1337], [-1764, 1353], [-1769, 1368]],
    'The overview’s "range of stilt-legged species" of the Lizeem distributaries: on the sand bars between the braided threads of the mouths, a metre off the water, where the water is shallow enough for them and nowhere else in the country is.'),
  zone('gala-egrets', 'egret', .4, [-1715, -1620, 1170, 1255], [[-1635, 1183], [-1662, 1209], [-1689, 1236]],
    'The same assemblage as Eer’s across the river, in white: egrets a pace off the distributary’s middle reach, where it crosses from the steppe into the Mediterranean rows and the tamarisk starts. On ground this open a white bird is seen from the far side of the country.',
    { scale: .86 }),
  zone('gala-herons', 'wading-bird', .4, [-1515, -1455, 1015, 1100], [[-1498, 1032], [-1476, 1049], [-1468, 1089]],
    'Herons on the Lizeem’s western bank, the reed bank below the Nesdor bend: the overview names herons first among the wading birds of the Lizeem distributaries. Clear of the wall of deep water, which is the whole river here.'),
  zone('gala-gulls', 'gull', .3, [-1800, -1725, 1425, 1462], [[-1776, 1444], [-1764, 1444], [-1752, 1436], [-1740, 1440]],
    'Gulls on Gala’s short piece of shore. The seabird colonies of the Iberos coast are among the most extensive on the continent, and the game draws the gull; these are on the upper beach at the mouths, where the plain’s water brings down what gulls come for.'),
  zone('gala-dolphins', 'dolphin', 0, [-1780, -1660, 1500, 1560], [[-1740, 1520], [-1700, 1540]],
    'The overview: "Grey dolphins are a consistent presence in Iberos coastal waters and have been documented in the Lizeem estuary." Out past the break off the Galan shore: seen from the sand and not reachable from it.',
    { sea: true }),
  // The steppe.
  zone('gala-hares', 'upland-hare', .3, [-1740, -1630, 985, 1085], [[-1700, 1022], [-1674, 1044], [-1700, 1066], [-1674, 1000]],
    'Extension: the Ganoss upland hare, the hare the west already has, at its dry limit on the steppe rows — the same short-grazed open ground it keeps on the Vastos plain, with the bare earth showing between the tussocks.'),
  zone('gala-harrier', 'harrier', .3, [-1790, -1570, 990, 1090], [[-1680, 1040]],
    'Extension: the overview names no raptor for Gala. A steppe of bunch grass is a harrier’s living as surely as Nethereum’s meadow is, and a harrier quarters low over it rather than soaring. Measured: the ground under its beat rises and falls four metres, and it follows the ground at nine.',
    { air: 9, circle: 34, period: 19, quarter: 70, bob: 1.6, follow: true }),
  zone('gala-hawk', 'plateau-hawk', .3, [-1800, -1600, 1000, 1160], [[-1720, 1080]],
    'The overview’s dry-plateau hawk, which "hunts the upland grasslands" of the eastern rain-shadow; the six-regions brief puts it on Gala’s dry north "because the country there is the Oves Desert with a different name on it". One, riding the air over the steppe shoulder.',
    { air: 34 }),
  // The maquis.
  zone('gala-boar', 'boar', .7, [-1690, -1530, 1225, 1335], [[-1605, 1270], [-1590, 1282], [-1608, 1292]],
    'Extension, as Eer’s boar are: the ordinary pig of a Mediterranean scrub, in the maquis on the rises of the middle rows because the scrub is there. The six-regions brief marks wild boar as Gala’s level-three animal — "the animal that actually hurts people in a Mediterranean farmland" — so they are sited with clear ground round them for the day they are made an encounter: measured against the chase laws from all four quarters, walked at and run at, and never reached. Ambient until then.'),
]);
