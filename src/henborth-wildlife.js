/**
 * Henborth's animals, as ranges for the western wildlife rigs (`src/west-regions-life.js` draws them, instanced and
 * distance-culled; they are ambient: nobody can attack, catch or speak to them).
 *
 * **What the lore gives this plain, and it gives one animal by name.** The fauna overview's Plains section: the
 * **frostback buffalo**, "a heavy wild bovid of the Mithsla and Celder plains whose northern summer circuit sometimes
 * reaches Henborth ... north into Henborth only when the thaw and summer moisture make the upland pasture worth the
 * risk" (`azhora_lore/fauna/azhoran_fauna_overview.md`). `henborth.md` says what the herds do when they come: they
 * "follow the first full flush of upland grass after the thaw, graze hard for three or four weeks, and turn south";
 * travelers "avoid getting between the cows and calves"; and "plains communities distinguish several local names for
 * them by age, sex, and route behavior". So Henborth has the summer face of the circuit: a band of cows with the
 * year's calves at foot on the southern grass nearest Celder and the Mithala, and a few bulls further up, where the
 * pasture thins toward the approaches. The **black soar-bird** follows the herds ("follows both the herds and the
 * predators"): the game has no bald vulture, so the turkey-vulture stands in for it and says so, as over Celder's.
 *
 * **What the neighbours and the overview add**, each an extension and each saying so: the overview's own **upland
 * hares** of the north's "cold-heath and high-meadow grazing community", on the thin pasture; the harrier that
 * quarters the Celder and Mithala grass next door; the road fox Celder carries; and the Oremindi's **mountain eagle**
 * working the foot of the range the approaches climb into.
 *
 * **Three new animals, each an extension, chosen for what this ground is**:
 *  - the **bog crane**, in the damp hollows: the overview's wading birds "use the Lizeem distributaries as both
 *    breeding grounds and wintering locations for populations that migrate from the north", and it keeps "a range
 *    of stilt-legged species for which Standard Mittoli maintains separate names"; a tall grey crane summering on a
 *    northern bog is that, and the bog it stands in is the lore's "northern bog cranberry" ground;
 *  - the **steppe marmot**, in a colony on a dry knoll of the thin northern pasture: the animal of the lore's
 *    "tough, short-grassed steppe, cold in winter and briefly lush in summer" (`the_plains.md`) at the foot of a
 *    range, which sleeps out the winter and lives in "the warm months", when Henborth "becomes worth visiting". It goes
 *    down its own burrow when it is come upon, and comes up at another;
 *  - the **willow grouse**, a covey in the cold-margin scrub of dwarf birch and willow toward the mountains, which
 *    sits tight and then goes up all at once.
 *
 * **Left out, and why**: the hunt-hound pack, the grey grass-lion and the north wolf, which the lore has following
 * the herds north ("draw north wolves and hunt-hound packs into places where travelers do not expect them"): they
 * want behaviour no ambient animal has, as the Celder and Mithala builders found, and a wolf that backs off at a walk
 * would be a worse lie than its absence. The hill elk of the Ganoss uplands' "cold-heath and high-meadow grazing
 * community" is not here either: the atlas puts Henborth against the Oremindi, not the Ganoss. **Nothing here is
 * anybody's**: the Lond families' cattle and sheep on the summer pasture are stock, and none of them is on this
 * ground.
 *
 * **Every band has its own layout**, because the Celder review found two herds put down in one pattern.
 * Ranges are open ground with nothing that blocks a walker in them: the scenery keeps every tree, tall bush and
 * boulder out (`henborthWildlifeClear`). `tests/henborth-life.test.js` holds each home to its ground, each range to
 * the west's laws, every bird in the air to its own sky, and every band to a shape of its own.
 */
import { HENBORTH_HOLLOWS, HENBORTH_KNOLLS } from './henborth-world.js';

const freeze = Object.freeze;
export const HENBORTH_REGION = 'Henborth';
const zone = (id, species, radius, box, sites, note, traits = {}) => freeze({
  id, species, region: HENBORTH_REGION, radius, scale: 1, keepRegion: true,
  minX: box[0], maxX: box[1], minZ: box[2], maxZ: box[3],
  sites: freeze(sites.map(site => freeze(site))), note, maxSlope: .5, ...traits,
});
const burrows = list => freeze(list.map(([x, z]) => freeze({ x, z, r: .3 })));
/**
 * **The bands that belong to a place the ground shapes are put down in that place's own frame**, read from the ground
 * module (`HENBORTH_HOLLOWS`, `HENBORTH_KNOLLS`, src/henborth-world.js), so that a hollow or a knoll moved by the ground's
 * hand takes its cranes or its marmots with it: a crane pair's homes are metres along and across its hollow's long axis
 * from the middle of its wet floor, a colony's are metres east and south of its knoll's crown. Where the ground no longer
 * names the place, the place as it stood when these were written stands in for it.
 */
const place = (list, id, fallback) => (Array.isArray(list) && list.find(feature => feature?.id === id)) || fallback;
const tenth = v => Math.round(v * 10) / 10;
const inHollow = (hollow, along, across) => {
  const c = Math.cos(hollow.yaw ?? 0), s = Math.sin(hollow.yaw ?? 0);
  return [tenth(hollow.x + along * c - across * s), tenth(hollow.z + along * s + across * c)];
};
const onKnoll = (knoll, east, south) => [tenth(knoll.x + east), tenth(knoll.z + south)];
/** A range of `half` metres about a place's middle: wide enough to fly or run in, and well inside the reach it is run from. */
const about = (feature, half, halfZ = half) => [tenth(feature.x - half), tenth(feature.x + half), tenth(feature.z - halfZ), tenth(feature.z + halfZ)];
const CRANBERRY_BOG = place(HENBORTH_HOLLOWS, 'henborth-cranberry-bog', { x: -2398, z: -1770, rx: 46, rz: 32, yaw: .5 });
const WET_CORNER = place(HENBORTH_HOLLOWS, 'henborth-wet-corner', { x: -2072, z: -1946, rx: 34, rz: 26, yaw: .2 });
const DRY_KNOLL = place(HENBORTH_KNOLLS, 'henborth-dry-knoll', { x: -2300, z: -1862, radius: 34 });
/** The marmots' homes and their holes, in the dry knoll's frame: a hole within a few strides of every home, and two spare. */
const MARMOT_HOMES = [[-3, 4], [6, 9], [-11, 12], [11, -4], [-6, -9], [4, 17]];
const MARMOT_HOLES = [[-1.5, 6.2], [8.4, 7.1], [-13.1, 10.3], [12.6, -1.8], [-3.9, -10.6], [1.8, 18.7], [-6.4, .6], [9.6, -.2]];

export const HENBORTH_WILDLIFE_ZONES = freeze([
  // -------------------------------------------------------------------------
  // The frostback's summer circuit, and the bird that follows it
  // -------------------------------------------------------------------------
  zone('henborth-summer-buffalo', 'frostback', .8, [-2560, -2400, -1585, -1480],
    [[-2437, -1527], [-2449, -1520], [-2455, -1536], [-2468, -1531], [-2474, -1517], [-2486, -1540]],
    'The **frostback buffalo** on its summer circuit, which the fauna overview says "sometimes reaches Henborth" - "north into Henborth only when the thaw and summer moisture make the upland pasture worth the risk". Six cows strung across the first good grass north of Celder, grazing hard and moving on: `henborth.md` has the Henborth herds "follow the first full flush of upland grass after the thaw, graze hard for three or four weeks, and turn south". Walked at, they put their heads up, turn and give ground at a shade over a walk, the cattle answer the frostback was given on the Mithala.',
    { scale: 1.06 }),
  zone('henborth-summer-calves', 'frostback', .8, [-2560, -2400, -1585, -1480],
    [[-2458, -1527], [-2476, -1524], [-2471, -1541]],
    'Three of the year\'s calves at foot inside the summer band, drawn at three-fifths of an adult. `henborth.md`: northern travelers "avoid getting between the cows and calves", and a strong arrival "usually means the upland grass has taken well". The calves are this band\'s and nobody else\'s.',
    { scale: .62 }),
  zone('henborth-upland-bulls', 'frostback', .8, [-2365, -2280, -1745, -1660],
    [[-2318, -1700], [-2336, -1688], [-2305, -1716]],
    'Three frostback bulls out ahead of the cows, on the thinner pasture where the plain starts to lift toward the approaches. The lore has the plains peoples naming them "by age, sex, and route behavior", and the bulls are the ones that go furthest up the circuit and come back last; it is the bulls that "trample marker lines" and "open side paths through scrub". Drawn a little heavier than the cows.',
    { scale: 1.12 }),
  zone('henborth-soar-bird', 'turkey-vulture', .3, [-2560, -2400, -1585, -1480],
    [[-2470, -1555]],
    'The overview\'s **black soar-bird**, which "follows both the herds and the predators at heights that allow it to monitor several kilometers of grazing landscape simultaneously", over the summer band. The game has no bald vulture, so the turkey-vulture stands in for it and is labelled so, as over every frostback herd in the west.',
    { air: 40 }),
  // -------------------------------------------------------------------------
  // The open grass and the thin pasture: hares, the harrier, the fox
  // -------------------------------------------------------------------------
  zone('henborth-south-hares', 'upland-hare', .3, [-2700, -2585, -1495, -1395],
    [[-2625, -1440], [-2611, -1452], [-2638, -1418]],
    'Extension: the overview\'s **upland hares**, of northern Azhora\'s "cold-heath and high-meadow grazing community", "in densities that fluctuate in long cycles", here on the open southern grass a few hundred metres from Celder\'s own. Three, wide apart, each a bound from the next.'),
  zone('henborth-rise-hares', 'upland-hare', .3, [-2475, -2406, -1750, -1675],
    [[-2433.4, -1706.2], [-2417.9, -1719.6], [-2446.3, -1727.1]],
    'Extension: a second band of upland hares on the thin pasture of the rise, where the soil "thins" and the grass is short enough to see over. This is the ground the overview\'s hares are named for, cold and high and open.'),
  zone('henborth-harrier', 'harrier', .3, [-2540, -2360, -1690, -1560],
    [[-2450, -1625]],
    'Extension from the Mithala and Celder: the harrier that quarters their grass, here over Henborth\'s open middle, low and following the ground. A short-grass plain with voles in it and almost no tree is a harrier\'s whole living, and it hunts nine metres up.',
    { air: 9, circle: 31, period: 22, quarter: 58, bob: 1.3, follow: true }),
  zone('henborth-fox', 'road-fox', .3, [-2665, -2540, -1580, -1480],
    [[-2597, -1517], [-2611, -1534]],
    'Extension from Celder: the **road fox**, "a lean, bold scavenger", standing in for the plain\'s fox as it does on Celder\'s grass next door. The frostback\'s summer carrion and the voles of the short grass are a living; it goes at twelve metres and does not come back until you have.'),
  // -------------------------------------------------------------------------
  // The damp hollows: the bog crane
  // -------------------------------------------------------------------------
  zone('henborth-bog-cranes', 'crane', .4, about(CRANBERRY_BOG, 30, 28),
    [inHollow(CRANBERRY_BOG, -6.3, 2.8), inHollow(CRANBERRY_BOG, 5.1, -3.7)],
    'Extension, and a new animal: the **bog crane**, a pair on the wet floor of the cranberry bog among the sedge, the cotton grass and the cranberry. The overview\'s wading birds "use the Lizeem distributaries as both breeding grounds and wintering locations for populations that migrate from the north", among "a range of stilt-legged species for which Standard Mittoli maintains separate names"; a tall grey crane summering on a northern bog is one of those, and the bog it stands in is the lore\'s "northern bog cranberry" ground. Wary: it is up and away at twenty metres. Its homes are in the bog\'s own frame, so they go where the ground puts the bog.',
    { scale: 1.15 }),
  zone('henborth-acor-cranes', 'crane', .4, about(WET_CORNER, 28, 25),
    [inHollow(WET_CORNER, 4.4, 1.9), inHollow(WET_CORNER, -3.8, -2.6)],
    'Extension: a second pair of bog cranes on the floor of the wet corner, where Henborth runs down toward the Acor Wetlands at its north-eastern tip: the same bird, the same summer, a different hollow.',
    { scale: 1.15 }),
  // -------------------------------------------------------------------------
  // The cold margin: the marmot colony, the grouse, and the eagle off the range
  // -------------------------------------------------------------------------
  zone('henborth-marmots', 'marmot', .25, about(DRY_KNOLL, 32),
    MARMOT_HOMES.map(([east, south]) => onKnoll(DRY_KNOLL, east, south)),
    'Extension, and a new animal: the **steppe marmot**, a colony on a dry knoll of the thin northern pasture. It is the animal of the lore\'s "tough, short-grassed steppe, cold in winter and briefly lush in summer" (`the_plains.md`) where it meets a mountain range, and the one that lives as Henborth does: asleep under the frost for most of the year and fattening through "the warm months", when Henborth "becomes worth visiting". Six about their burrows on the knoll\'s crown and flanks, among eight holes: each sits up on its haunches and watches whoever comes within thirty metres, and at a dozen it runs for the nearest hole that is not past them, goes down it, and comes up again at another hole well away once they are.',
    { burrows: burrows(MARMOT_HOLES.map(([east, south]) => onKnoll(DRY_KNOLL, east, south))) }),
  zone('henborth-scrub-grouse', 'grouse', .22, [-2655, -2600, -1660, -1600],
    [[-2622.2, -1628.4], [-2614.6, -1634.9], [-2629.8, -1637.3], [-2617.1, -1621.7], [-2633.5, -1625.6]],
    'Extension, and a new animal: the **willow grouse**, a covey in the cold-margin scrub of dwarf birch and willow where the pasture gives out toward the mountains - the "scrub" that `henborth.md` has the thin pasture becoming on its way to "something colder and more exposed". Rufous in summer, with white wings that show only when it goes: it sits tight in the scrub until a traveler is nearly on it, and then the whole covey is up at once.'),
  zone('henborth-mountain-eagle', 'oremindi-mountain-eagle', .3, [-2390, -2270, -1910, -1790],
    [[-2330, -1850]],
    'Extension from the range: the Oremindi\'s **mountain eagle**, "the apex aerial predator of the high range", working the foot of the Lesser Oremindi and Narcosh where the approaches leave the plain - and the marmot colony on the knoll below is what it is working.',
    { air: 46, circle: 40, period: 34, bob: 2.5 }),
]);

/**
 * Where scenery that blocks a walker must not stand: inside a range of anything that lives on the ground, `margin`
 * metres out. An animal giving ground backs straight away from whoever comes at it, and a boulder or a trunk behind
 * it is a corner; the ranges are open ground, so this costs the plain nothing it should have.
 */
export function henborthWildlifeClear(x, z, margin = 0) {
  for (const zone of HENBORTH_WILDLIFE_ZONES) {
    if (zone.air || zone.sea) continue;
    if (x >= zone.minX - margin && x <= zone.maxX + margin && z >= zone.minZ - margin && z <= zone.maxZ + margin) return true;
  }
  return false;
}
