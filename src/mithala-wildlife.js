/**
 * The animals of the Mithala plain, as ranges for the western wildlife rigs
 * (`src/west-regions-life.js` draws them, instanced and distance-culled, and they are ambient:
 * nobody can attack, catch or speak to them).
 *
 * **This is the most populous country in the game, and that is the honest reading.** A hundred and
 * sixteen hexes of deep river soil under a braided river system is the richest ground in Azhora, and
 * the fauna overview says so in as many words: "The river systems of Mittolo and Mithala - the
 * Lizeem and its distributaries, the Ond wetlands, the channeled floodplains of the eastern plains -
 * are among the richest non-marine waterways on the continent and support a fauna of corresponding
 * density and variety", and of its birds, "the richest avian assemblage documented on the
 * continent". Nineteen ranges, where the Oves has ten over two empty countries and the West Lotharn
 * nine over a mountain range.
 *
 * **What the lore names here, and it names more than anywhere else built so far:**
 *  - **the river boar**, "the dominant large predator of the wetlands, a misleadingly named animal
 *    that is not related to the domestic pig... heavily built, semi-aquatic, and capable of
 *    considerable patience and surprising speed over short distances". The game's `boar` rig is a
 *    woodland pig and this is not one, so it is labelled as standing in for the river boar rather
 *    than pretending to be it;
 *  - **the frostback buffalo**, "a heavy wild bovid of the Mithsla and Celder plains whose northern
 *    summer circuit sometimes reaches Henborth" - which is this plain, between exactly those two
 *    countries, named for it and for nowhere else. **It is the one new rig**, and it is the one the
 *    lore made unavoidable: it is not domestic ("not domestic tallhorns gone wild and... not
 *    considered available breeding stock"), so a country built with no stock in it can carry it;
 *  - **the wading birds of the Lizeem distributaries**, "herons, spoonbills, a range of stilt-legged
 *    species for which Standard Mittoli maintains separate names", using the channels "as both
 *    breeding grounds and wintering locations";
 *  - **waterfowl**, "old agricultural records note that high flood years correlate with exceptional
 *    hunting seasons for waterfowl across the eastern plains";
 *  - **the black migratory geese**, which "winter in the coastal marshes and river mouths, and
 *    depart in spring toward the north"; the fen margin is on that road and is where they stop;
 *  - **river otters and their larger relatives**, which "occupy the rivers" of the whole system;
 *  - **the black soar-bird**, "technically a vulture-relative... follows both the herds and the
 *    predators at heights that allow it to monitor several kilometers of grazing landscape
 *    simultaneously". The game has no bald vulture, so the turkey-vulture stands in and says so.
 *
 * Everything else is an extension and says so in its own note. **The three Plains predators are
 * deliberately absent** - the hunt-hound pack, the grey grass-lion and the north wolf - and the
 * reason is not squeamishness: every animal in this system is ambient and cannot be attacked or
 * attack, and a grass-lion that stands in the open and backs off at a walk is a worse lie about the
 * animal than leaving it out. They are in `docs/mithala-report.md` instead.
 *
 * **No domestic stock.** The river-horn - the wetland cattle that pull the harrows through flooded
 * fields and are "the primary rural wealth indicator in the valley communities" - is the animal this
 * plain is really about, and it belongs to households: "A household with grain but no river-horn is
 * not considered fully established by Mithala standards." A herd with nobody near it is still
 * somebody's herd, so there is none (docs/mithala-brief.md).
 *
 * **One new rig of the two the brief allowed**, and the second was not spent: the overview's other
 * named Plains animals want gaits the game has not got (the hunt-hound's coordinated pack, the
 * grass-lion's stillness-then-rush) or are fish (the broad-backed carp, the channel hunters).
 *
 * Every site below was measured on the built world - dry, this plain's own, off the water surface,
 * off a summer channel's floor and standable - and `tests/mithala-world.test.js` holds each one to
 * its ground. Every range's half-diagonal is well under `LIFE_REACH`.
 */
const freeze = Object.freeze;
const zone = (id, species, region, radius, box, sites, note, traits = {}) => freeze({
  id, species, region, radius, scale: 1, keepRegion: true,
  minX: box[0], maxX: box[1], minZ: box[2], maxZ: box[3],
  sites: freeze(sites.map(site => freeze(site))), note, ...traits,
});

export const MITHALA_WILDLIFE_ZONES = freeze([
  // -----------------------------------------------------------------------
  // South Mithala: the meeting, the flood plain and the apron
  // -----------------------------------------------------------------------
  // Two of the three homes moved off the city that now stands round the meeting (docs/mithala-city-brief.md) to the main
  // channel's south bank just below the Ford, the nearest open bank in South Mithala; the range reaches 40 m further east for it.
  zone('mithala-meeting-otters', 'otter', 'South Mithala', .35, [-1780, -1600, -1410, -1330],
    [[-1748, -1386], [-1642, -1384], [-1606, -1396]],
    'The fauna overview puts otters on the whole Lizeem system - "river otters and their larger relatives occupy the rivers from the Oremindi meltwater sources through the forest-margin watercourses" - and names the great river otter, which takes fish the size of a river-horn calf and is not loved by the farming communities for it. These are on the bank at the meeting of the arms, where three channels come together and the fish that are going anywhere on this plain have to pass.',
    { scale: 1.2 }),
  zone('south-mithala-buffalo', 'frostback', 'South Mithala', .8, [-1540, -1370, -1390, -1270],
    [[-1494, -1302], [-1452, -1332], [-1410, -1350]],
    'Frostback buffalo on the flood plain between the apron and the main channel. The overview gives the animal this plain by name - "a heavy wild bovid of the Mithsla and Celder plains" - and gives its herds a circuit rather than a range: "west through the mineral-rich Celder river terraces in some years, east and south across Mithsla in others, and north into Henborth only when the thaw and summer moisture make the upland pasture worth the risk." This is the summer face of that: the grass on the levee backs, which is the best of it and the only ground here that is never under water.',
    { scale: 1.06 }),
  zone('south-mithala-herons', 'wading-bird', 'South Mithala', .4, [-1660, -1550, -1420, -1350],
    [[-1626, -1390], [-1602, -1390], [-1578, -1384]],
    'Grey herons on the main channel’s upper reach, standing a pace off the water on the levee. "Wetland birds of Mitholo and Ond constitute what the Academy’s natural historians call... the richest avian assemblage documented on the continent. Wading birds in particular - herons, spoonbills, a range of stilt-legged species - use the Lizeem distributaries as both breeding grounds and wintering locations." This is the Lizeem’s own plain and they are not an extension here.'),
  zone('apron-hares', 'upland-hare', 'South Mithala', .3, [-1590, -1440, -1340, -1250],
    [[-1556, -1285], [-1496, -1321], [-1472, -1285]],
    'Extension: the Ganoss upland hare, the hare the west already has, on the apron’s swells. It is the only ground in the country that is both dry every year and higher than the grass round it, which on a flood plain is the whole of what a hare wants - and twelve metres of rise is enough to see a long way from when the country either side of you is flat to the horizon.'),
  zone('south-mithala-vulture', 'turkey-vulture', 'South Mithala', .3, [-1500, -1320, -1440, -1280],
    [[-1410, -1360]],
    'The overview’s **black soar-bird**: "technically a vulture-relative, not a bird of prey - follows both the herds and the predators at heights that allow it to monitor several kilometers of grazing landscape simultaneously; its presence circling at low altitude indicates a kill within the hour and is used by both predators and human hunters as a locating signal." The game has no bald vulture, so this is the turkey-vulture standing in for it and labelled as doing so - but the bird itself is the lore’s and the plain is the ground the lore gives it. It hangs over the buffalo.',
    { air: 40 }),
  // -----------------------------------------------------------------------
  // West Mithala: the upper grass
  // -----------------------------------------------------------------------
  zone('west-mithala-buffalo', 'frostback', 'West Mithala', .8, [-2190, -2050, -1620, -1500],
    [[-2154, -1586], [-2118, -1562], [-2082, -1538]],
    'The western half of the same circuit, on the tall grass of the upper plain. The lore has the herds moving "west through the mineral-rich Celder river terraces in some years", and this is the ground they cross to get there: the last of the Mithala before the Celder margin, with nothing at all between the two.',
    { scale: 1.06 }),
  zone('west-mithala-harrier', 'harrier', 'West Mithala', .3, [-2080, -1920, -1440, -1310],
    [[-2000, -1374]],
    'Extension: the overview names no raptor for this plain. What the ground argues for is the bird that hunts it - a hundred square miles of tall grass with no tree in it is a harrier’s whole living, as Nethereum’s wet meadow is - and a harrier quarters low over it rather than soaring, nine metres up, following the ground as it rises and falls under the beat. On this ground it never has to climb.',
    { air: 9, circle: 34, period: 19, quarter: 70, bob: 1.6, follow: true }),
  // **The widest range on the plain, and it has to be.** A fox is the one animal here that does not
  // flee: it drifts back as fast as anybody comes on and keeps an arm's length, so it needs a
  // straight run of clear ground behind it or it is cornered and walked up to. Measured: 170 m of
  // West Mithala west of its first site, dry and standable the whole way, which is the most any
  // point beside any of the eight channels has. The first range tried was a hundred metres across
  // and a walker got within 1.98 m of it (tests/west-life.test.js).
  zone('west-arm-fox', 'river-fox', 'West Mithala', .32, [-1990, -1780, -1350, -1230],
    [[-1811, -1284], [-1845, -1294], [-1872, -1266]],
    'The *vel-caric*, "a small, semi-aquatic carnivore with a distinctive dark-tipped tail and the narrow, mobile face of a creature that lives in river margins", documented on the Carica in the south-west. Extension, and the only animal on the plain that will look at a traveler instead of leaving: the west arm is a slow stream on a flat floor with reed and willow on both banks, which is the margin the fox wants, and the plain has several hundred metres of it.'),
  zone('west-mithala-hares', 'upland-hare', 'West Mithala', .3, [-2330, -2190, -1530, -1380],
    [[-2290, -1496], [-2260, -1472], [-2230, -1406]],
    'Extension: hares on the driest and highest corner of the plain, where the grass is tallest and the channels are furthest apart. This is as far from water as it is possible to get in the Mithala, which is two hundred metres.'),
  // -----------------------------------------------------------------------
  // East Mithala: where the channels gather
  // -----------------------------------------------------------------------
  zone('east-mithala-boar', 'boar', 'East Mithala', .7, [-1580, -1430, -1600, -1470],
    [[-1546, -1488], [-1516, -1572], [-1462, -1506]],
    'The **river boar**, and the overview is emphatic that it is not the animal the name suggests: "a misleadingly named animal that is not related to the domestic pig despite the name persisting in Minoran administrative records for at least four centuries. It is heavily built, semi-aquatic, and capable of considerable patience and surprising speed over short distances." It is the dominant predator of this wetland and it keeps to the backswamps behind the gallery, which is the standing water and the cover together. **The game’s rig is a woodland pig and this is a stand-in**, not the animal: what is right about it is the build and the ground, and what is wrong about it is everything else.',
    { scale: 1.15 }),
  zone('east-mithala-egrets', 'egret', 'East Mithala', .4, [-1410, -1290, -1550, -1490],
    [[-1378, -1516], [-1342, -1510], [-1312, -1516]],
    'White egrets on the silt bars of the braided reach, where the threads run round them and the water is a hand deep at the edges. The overview’s "range of stilt-legged species for which Standard Mittoli maintains separate names that Academy records have not always preserved accurately" is this assemblage; the game has three of its shapes and the bars are where they are seen from a distance, because they are the only white thing on the plain.'),
  zone('east-mithala-duck', 'duck', 'East Mithala', .3, [-1670, -1520, -1430, -1370],
    [[-1640, -1394], [-1589, -1409], [-1552, -1393]],
    'Duck on the main channel’s ford reach, floating, where the water is shallow over gravel and the threads are just beginning to separate. "In high flood years, the extended inundation of the lower plains creates temporary wetland habitat that draws concentrations of birds... high flood years correlate with exceptional hunting seasons for waterfowl across the eastern plains." This is an ordinary year and an ordinary raft of them.',
    { float: true }),
  zone('east-mithala-deer', 'red-deer', 'East Mithala', .55, [-1700, -1570, -1590, -1470],
    [[-1640, -1506], [-1624, -1554], [-1594, -1536]],
    'Extension: red deer, the game’s deer, on the open grass behind the gallery. The overview gives the Plains their own grazers and the forests their deer, and this ground is the seam between the two - open country with the Acorwood a few miles north and a wood two trees deep on every channel. A deer that can feed in the open and be back in cover in a minute is the animal that lives on a boundary like that.',
    { hornless: true }),
  zone('river-mouth-stilts', 'stilt', 'East Mithala', .4, [-1150, -1040, -1490, -1410],
    [[-1112, -1466], [-1070, -1436]],
    'Stilts at the river mouth, on the last silt before the beach, where the channel widens and the levees flatten out. This is where the plain’s fresh water meets the sea and where the wading assemblage is thickest; the overview’s Iberos coast entry has grey dolphins "documented in the Lizeem estuary at Nylon during upriver fish migrations", and Nylon is the next country east, off the atlas.'),
  // -----------------------------------------------------------------------
  // North Mithala: the shelf and the fen margin
  // -----------------------------------------------------------------------
  zone('north-mithala-geese', 'goose', 'North Mithala', .4, [-1900, -1770, -2010, -1900],
    [[-1860, -1974], [-1830, -1986], [-1800, -1920]],
    'The **black migratory geese**, "which appear on the Iberos coast in late autumn in vast flocks, winter in the coastal marshes and river mouths, and depart in spring toward the north - these are among the most visible seasonal markers in coastal Azhoran culture and calendrical tradition. They come from somewhere north." The fen margin is on that road and this is a flock down on it. Everything about them is a season, which is the thing this plain has and the world cannot yet draw.'),
  zone('fen-wading-birds', 'wading-bird', 'North Mithala', .4, [-1740, -1630, -1940, -1850],
    [[-1700, -1918], [-1670, -1870]],
    'Herons on the fen margin, where the sedge comes up through the grass and there is standing water between the tussocks. It is the same assemblage as the channels’ and a different ground: shallow, still and everywhere, rather than deep and in a line.'),
  zone('north-braid-otters', 'otter', 'North Mithala', .35, [-1990, -1880, -1780, -1700],
    [[-1948, -1728], [-1918, -1740]],
    'Otters on the north braid below its heads, where the cross braid comes in and the water first has something in it worth having. Extension only in the sense that the overview does not name this channel: it names the system.',
    { scale: 1.1 }),
  zone('shelf-buffalo', 'frostback', 'North Mithala', .8, [-1640, -1500, -1870, -1730],
    [[-1602, -1832], [-1566, -1796], [-1530, -1760]],
    'The northern end of the circuit, on the dry shelf above the fen. "North into Henborth only when the thaw and summer moisture make the upland pasture worth the risk" - this is the ground they stand on before deciding, two metres above the sedge and the last grass before the wetland. It is also the third of the three bands, which is what a species with a continental range looks like on a map that only shows one plain.',
    { scale: 1.06 }),
  zone('north-mithala-harrier', 'harrier', 'North Mithala', .3, [-1580, -1420, -1950, -1820],
    [[-1500, -1880]],
    'Extension: a second harrier over the north-eastern corner, between the fen margin and the first trees of the Acorwood. Quartering ground that is half grass and half sedge, and the last open country before a forest that closes off the north of the continent.',
    { air: 9, circle: 30, period: 20, quarter: 64, bob: 1.5, follow: true }),
]);
