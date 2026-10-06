/**
 * The animals of South Suval, as ranges for the western wildlife rigs (`src/content/regions/western-regions/west-regions-life.js`
 * draws them, instanced and distance-culled, and they are ambient: nobody can attack, catch or
 * speak to them).
 *
 * Every home site below was measured on the built world, not guessed: the herons a pace or two
 * inland of the lake's open shore, the duck well out on the water, the gulls a few metres back from
 * the cliff edge, the dolphins out at sea. `tests/south-suval-world.test.js` holds each site to its
 * ground.
 *
 * The lore names two animals on this coast in so many words - grey dolphins "a consistent presence
 * in Iberos coastal waters", and seabird colonies on "certain rocky headlands ... particularly
 * along the Svaleen coast" (`fauna/azhoran_fauna_overview.md`) - and the rest are extensions, each
 * of which says so: the peninsula's inland fauna is not catalogued, and what lives in a lake and a
 * limestone scrub is chosen from what the lore puts in the dry country next door and what any
 * permanent water has.
 */
const freeze = Object.freeze;
const zone = (id, species, radius, box, sites, note, traits = {}) => freeze({
  id, species, region: 'South Suval', radius, scale: 1, keepRegion: true,
  minX: box[0], maxX: box[1], minZ: box[2], maxZ: box[3],
  sites: freeze(sites.map(site => freeze(site))), note, ...traits,
});

export const SOUTH_SUVAL_WILDLIFE_ZONES = freeze([
  // The Stillwater.
  zone('stillwater-herons', 'wading-bird', .4, [-80, -40, 1200, 1290], [[-58, 1221], [-55, 1243], [-61, 1264]],
    'Extension. The overview names herons first among the wading birds of the great wetlands, and the Stillwater is the only standing fresh water on the peninsula - a lake that has not run dry in anybody’s memory has them. On its open south-east shore, away from the stone of the city’s front.'),
  zone('stillwater-duck', 'duck', .3, [-130, -75, 1205, 1275], [[-92, 1241], [-109, 1250], [-99, 1225], [-88, 1257]],
    'Extension, as Eer’s duck are: waterfowl on still water, the species chosen and the water the lore’s. Well out on the lake, where nothing from the shore comes near them.',
    { float: true }),
  // The hills and the grass.
  zone('south-suval-hares', 'upland-hare', .3, [-125, -60, 1280, 1345], [[-95, 1297], [-95, 1311], [-95, 1325]],
    'Extension. Hares on the open grass south of the lake, which is the same thin, short-grazed ground the western uplands’ hares keep.'),
  zone('south-suval-boar', 'boar', .7, [-240, -60, 1070, 1150], [[-159, 1123], [-146, 1121], [-155, 1130]],
    'Extension, as Eer’s boar are: the ordinary pig of a Mediterranean scrub, in the cushion scrub of the ridge above the lake because the scrub is there - and on the ridge because a boar backing off from somebody walking at it wants most of a hundred and fifty metres behind it, which the cliffed south-west does not have.'),
  zone('south-suval-road-foxes', 'river-fox', .32, [-60, 100, 1035, 1082], [[78, 1052], [68, 1064]],
    'Extension from the next country: the overview’s road fox of the eastern rain-shadow, "a lean, bold scavenger associated with caravan routes and settlement edges", which is what the city’s one road is: on the open saddle and along the road west of it toward the gate, where a fox that keeps its distance has room to - a fox backing away from somebody walking at it needs the best part of a hundred metres behind it. Drawn with the river fox’s rig, which is the fox the game has.'),
  zone('south-suval-hawk', 'plateau-hawk', .3, [-160, -40, 1010, 1130], [[-100, 1068]],
    'The overview’s dry-plateau hawk, which "hunts the upland grasslands" of the dry country east of here; the Svaleen interior is "hilly and arid in a way that Mediterranean climates produce reliably". One, riding the air over the ridge.',
    { air: 32 }),
  // The coast.
  zone('south-coast-gulls', 'gull', .3, [-260, -195, 1235, 1300], [[-244, 1250], [-240, 1266], [-224, 1278], [-208, 1286]],
    'The overview: the seabird colonies of the Iberos coast are among the most extensive on the continent, on "certain rocky headlands ... particularly along the Svaleen coast". Gulls, which are the seabird the game draws, on the cliff tops of the south-west where the land holds its height to the edge.'),
  zone('south-coast-dolphins', 'dolphin', 0, [-240, -140, 1420, 1470], [[-220, 1440], [-160, 1440]],
    'The overview: "Grey dolphins are a consistent presence in Iberos coastal waters." Out past the foot of the southern cliffs: seen from the top and not reachable from it.',
    { sea: true }),
]);
