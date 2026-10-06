/**
 * The animals of the Ascarth Peninsula, as ranges for the western wildlife rigs (`src/content/regions/western-regions/west-regions-life.js`
 * draws them, instanced and distance-culled, and they are ambient: nobody can attack, catch or speak
 * to them).
 *
 * The fauna overview names three things on this coast in so many words: **grey dolphins**, "a
 * consistent presence in Iberos coastal waters"; the **seabird colonies** of the Iberos coast, "among
 * the most extensive on the continent", on "certain rocky headlands"; and the **Great White
 * Sea-plunger**, whose "vertical dives from height into the Iberos shoals" it places on the Svaleen
 * coast and "the exposed Legemum headlands" - Legemum being the next peninsula west. Everything on
 * the land is an extension and says so: the lore catalogues no fauna for the peninsula, and what lives
 * in an evergreen-oak wood on a Mediterranean hill and on the thin grass round it is chosen from what
 * the game already has and what such country carries everywhere.
 *
 * Domestic stock is somebody's, so there is none: no sheep on the grass, no goats on the hills.
 *
 * Every home site below was measured on the built ground - standable, on its own country's hexes,
 * clear of every trunk and stone - and `tests/ascarth-world.test.js` holds each one to it.
 */
const freeze = Object.freeze;
const zone = (id, species, region, radius, box, sites, note, traits = {}) => freeze({
  id, species, region, radius, scale: 1, keepRegion: true,
  minX: box[0], maxX: box[1], minZ: box[2], maxZ: box[3],
  sites: freeze(sites.map(site => freeze(site))), note, ...traits,
});
const NORTH = 'Northern Ascarth', SOUTH = 'Southern Ascarth';

export const ASCARTH_WILDLIFE_ZONES = freeze([
  // The interior hills.
  zone('interior-hills-deer', 'red-deer', NORTH, .55, [-1430, -1320, 1555, 1615], [[-1392, 1586], [-1376, 1598], [-1404, 1600], [-1360, 1584]],
    'Extension: red deer, the game’s deer, on the open saddle between the two wooded hills, where the evergreen oak comes to an edge on both sides and there is grass between. The lore catalogues nothing wild here; a wood of oak and pine on a hill is deer country wherever it stands.'),
  zone('interior-hills-boar', 'boar', NORTH, .7, [-1200, -1130, 1640, 1720], [[-1170, 1668], [-1160, 1684], [-1178, 1698]],
    'Extension: boar at the edge of the south hill’s wood, on its eastern foot, where the acorns of the evergreen oak come down onto the scrub - the pig of every oak country there is, and of every Mediterranean one.'),
  zone('north-ascarth-hares', 'upland-hare', NORTH, .3, [-1440, -1375, 1380, 1450], [[-1414, 1402], [-1398, 1414], [-1420, 1428]],
    'Extension: hares on the open plateau between the north hill and the east shore - thin short grass over rock, which is what the upland hare keeps everywhere else it is drawn.'),
  zone('ascarth-hills-hawk', 'plateau-hawk', NORTH, .3, [-1420, -1280, 1540, 1660], [[-1350, 1600]],
    'Extension: the dry-plateau hawk the overview puts on the upland grass of the rain-shadow country, here riding the air over the interior hills - one bird, high, over the wood.',
    { air: 34 }),
  zone('west-cliff-gulls', 'gull', NORTH, .3, [-1580, -1500, 1540, 1615], [[-1546, 1572], [-1544, 1586], [-1546, 1598]],
    'The overview: the seabird colonies of the Iberos coast are "among the most extensive on the continent", on "certain rocky headlands and offshore islands". Gulls, the seabird the game draws, on the tops of the west cliffs a few metres back from the edge.'),
  // The tip.
  zone('south-ascarth-hares', 'upland-hare', SOUTH, .3, [-1130, -1050, 1900, 1970], [[-1100, 1924], [-1086, 1938], [-1108, 1948]],
    'Extension: hares on the thin grass of the finger, the same animal as on the north’s plateau.'),
  zone('tip-gulls', 'gull', SOUTH, .3, [-755, -680, 2290, 2340], [[-736, 2312], [-720, 2321], [-704, 2329]],
    'The same colony’s kind on the cliffs round the tip, the most exposed rock on the peninsula and the headland the overview’s words are about.'),
  zone('tip-harrier', 'harrier', SOUTH, .3, [-860, -680, 2110, 2190], [[-770, 2150]],
    'Extension: a harrier quartering the grass toward the tip, low and following the ground - the plateau hawk’s rig on the harrier’s flight, as in Nethereum. The brief asked for a hawk or a harrier over the tip; the grass is a harrier’s living.',
    { air: 9, circle: 30, period: 19, quarter: 45, bob: 1.6, follow: true }),
  // The sea.
  zone('ascarth-dolphins', 'dolphin', SOUTH, 0, [-575, -525, 2020, 2180], [[-552, 2050], [-540, 2140]],
    'The overview: "Grey dolphins are a consistent presence in Iberos coastal waters." Off the east shore of the finger, out past the foot of the headlands: seen from the top and not reachable from it.',
    { sea: true }),
  zone('iberos-sea-plungers', 'sea-plunger', SOUTH, .3, [-600, -520, 2240, 2320], [[-560, 2280], [-560, 2280], [-560, 2280]],
    'The Great White Sea-plunger, which the overview places on "the exposed Legemum headlands" one peninsula west and whose "vertical dives from height into the Iberos shoals" it calls one of the more visible demonstrations of the sea’s productivity. Extension by the width of a sea: circling off the tip and folding into the water in turn.',
    { air: 22, circle: 26, period: 17, bob: 1.4, plunge: freeze({ every: 9, fall: 1.1, under: 1.8, climb: 3.2 }) }),
]);
