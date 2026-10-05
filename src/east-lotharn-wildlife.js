/**
 * The animals of the East Lotharn, as ranges for the western wildlife rigs (`src/west-regions-life.js`
 * draws them, instanced and distance-culled, and they are ambient: nobody can attack, catch or speak
 * to them).
 *
 * The lore catalogues no Lotharn fauna, so every one of these is an extension and says so. What it
 * does give is the country: "managed old-growth, forest that knows people", oak, chestnut and beech
 * - mast for boar and browse for deer - "sheep... kept on the seasonal upland pastures for as long as
 * anyone has records", open ridge-tops kept for grazing, and the valleys' own water. The wolves, the
 * trolls and the giants of the Empire arc's level-three range are not here: they are fights, and
 * fights are the campaign's to place.
 *
 * The original open-ground populations keep their identities. Small resident bands also browse
 * the lower woodland interior: the shared woodland movement remembers a safe route through the
 * trunks and retraces it home. Those ranges exclude steep faces at every movement step; animals
 * are still instanced only on approach, with no new species rigs or distant simulation cost.
 */
const freeze = Object.freeze;
const zone = (id, species, radius, box, sites, note, traits = {}) => freeze({
  id, species, region: 'East Lotharn Mountains', radius, scale: 1, keepRegion: true,
  minX: box[0], maxX: box[1], minZ: box[2], maxZ: box[3],
  sites: freeze(sites.map(site => freeze(site))), note, ...traits,
});

export const EAST_LOTHARN_WILDLIFE_ZONES = freeze([
  zone('olveth-sheep', 'hill-sheep', .55, [-1395, -1262, -1075, -955], [[-1340, -1010], [-1300, -1030], [-1310, -1022], [-1352, -1026], [-1346, -1048]],
    'The lore’s own: "the textile traditions of the higher, cooler valleys - where sheep have been kept on the seasonal upland pastures for as long as anyone has records". Upper Olveth’s summer grass, the fold on it, and a flock with nobody watching it yet.'),
  zone('central-bald-deer', 'red-deer', .55, [-1295, -1160, -1035, -910], [[-1228, -972], [-1214, -960], [-1242, -986], [-1220, -990]],
    'Extension: red deer, the game’s deer, on the grazed top of the central massif at the edge of the wood - the open ground in an old broadleaf forest is where a deer is seen at all.',
    { hornless: true }),
  zone('eastern-bald-hares', 'upland-hare', .3, [-1030, -905, -885, -765], [[-966, -824], [-952, -838], [-980, -810]],
    'Extension: hares on the eastern bald, the same thin, short-grazed turf the upland hares keep elsewhere, at the top of the range.'),
  zone('kemrath-herons', 'wading-bird', .4, [-1575, -1450, -855, -795], [[-1493, -821], [-1524, -821]],
    'Extension: grey herons on the Kemrath water’s slow reach below the fields, the one place in the range where a stream meanders over a flat floor and stands still enough to fish. A heron put up goes over the wood and comes back to the same bend.'),
  zone('kemrath-boar', 'boar', .7, [-1585, -1455, -880, -790], [[-1520, -842], [-1540, -838], [-1505, -834]],
    'Extension: boar at the wood’s edge on Kemrath’s western floor, where the chestnut and oak mast comes down to the valley - the pig of every oak country there is.'),
  zone('central-massif-hawk', 'plateau-hawk', .3, [-1320, -1140, -1050, -890], [[-1230, -965]],
    'Extension: the dry-plateau hawk, which the lore puts on the upland grass of the country east of here, riding the air over the central massif’s bald - one bird, high.',
    { air: 34 }),
  zone('north-face-woodland-deer', 'red-deer', .55, [-1560, -1390, -1060, -950], [[-1500, -1010], [-1488, -1011], [-1500, -998]],
    'Extension: a small band of red deer browsing the broadleaf interior below the western massif, away from the grazed balds. The north-facing foot has gentler soil-covered ground between the trunks and room to retreat along the slope.',
    { habitat: 'woodland', hornless: true, maxSlope: .65 }),
  zone('kemrath-woodland-boar', 'boar', .7, [-1610, -1470, -970, -875], [[-1548, -924], [-1538, -924], [-1550, -936]],
    'Extension: boar rooting for oak and chestnut mast inside the western Kemrath woods, beyond the existing valley-floor group. Their home ground follows the wooded slope above the water and uses remembered paths between the trunks.',
    { habitat: 'woodland', maxSlope: .65 }),
  zone('stonegate-woodland-deer', 'red-deer', .55, [-1160, -1040, -1070, -950], [[-1100, -1010], [-1100, -998]],
    'Extension: two red deer in the sheltered woodland west of the Stonegate gorge, encountered on a detour from the pass. They browse the lower soil-covered shoulder; steep rock and the gorge water remain outside their usable footing.',
    { habitat: 'woodland', hornless: true, maxSlope: .65 }),
  zone('southwest-woodland-boar', 'boar', .7, [-1610, -1480, -795, -710], [[-1550, -750], [-1538, -750]],
    'Extension: a second small woodland sounder on the broad southwestern shoulder, where the oak forest continues beyond the Kemrath approach. This is sheltered mast habitat within the wood, not another animal group on a summit clearing.',
    { habitat: 'woodland', maxSlope: .65 }),
]);
