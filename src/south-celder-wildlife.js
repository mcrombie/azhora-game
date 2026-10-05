/**
 * South Celder's animals, as ranges for the western wildlife rigs (`src/west-regions-life.js` draws them,
 * instanced and distance-culled; they are ambient: nobody can attack, catch or speak to them).
 *
 * **What the lore gives this plain, and it gives one animal by name.** The fauna overview's Plains section:
 * "the **frostback buffalo**, a heavy wild bovid of the Mithsla and Celder plains whose northern summer
 * circuit sometimes reaches Henborth... Their herds follow grass quality rather than political boundaries:
 * west through the mineral-rich Celder river terraces in some years, east and south across Mithsla in
 * others" (`azhora_lore/fauna/azhoran_fauna_overview.md`). The rig is Mithala's, built for exactly this
 * animal, and it is the one thing here that is not an extension. The same section names the **black
 * soar-bird**, which "follows both the herds and the predators"; the game has no bald vulture, so the
 * turkey-vulture stands in for it and says so, as it does over Mithala's herds.
 *
 * Everything else is an extension from the neighbours, and each note says which: the upland hare and the
 * harrier from the Mithala plain next door, the plateau hawk and the red deer from the West Lotharn and
 * Yunethre on the other side, the road fox from East Pyros. **The three Plains predators are left out on
 * purpose**, as the Mithala builder left them out: the hunt-hound pack, the grey grass-lion and the north
 * wolf want behaviour no ambient animal has, and a grass-lion that backs off at a walk would be a worse lie
 * about it than its absence.
 *
 * **Nothing here is anybody's.** The horses are the whole of Celder and every one of them is bred stock, so
 * there is not one horse on this plain, and no cattle, sheep or goats either.
 *
 * Ranges are on open grass with nothing to corner an animal in: the scenery keeps every tree and every
 * stone that blocks a walker out of them (`southCelderWildlifeClear`), and `tests/celder-life.test.js`
 * holds each home to its ground and each range to the west's laws.
 */
const freeze = Object.freeze;
export const SOUTH_CELDER_REGION = 'South Celder';
const zone = (id, species, radius, box, sites, note, traits = {}) => freeze({
  id, species, region: SOUTH_CELDER_REGION, radius, scale: 1, keepRegion: true,
  minX: box[0], maxX: box[1], minZ: box[2], maxZ: box[3],
  sites: freeze(sites.map(site => freeze(site))), note, maxSlope: .5, ...traits,
});

export const SOUTH_CELDER_WILDLIFE_ZONES = freeze([
  // -------------------------------------------------------------------------
  // The frostback: two herds on the open plain, and the bird that follows them
  // -------------------------------------------------------------------------
  zone('south-celder-swell-buffalo', 'frostback', .8, [-2700, -2490, -850, -740],
    [[-2512, -796], [-2521, -804], [-2526, -788], [-2534, -798], [-2541, -790], [-2547, -806], [-2556, -797]],
    'The **frostback buffalo**, and Celder is half of its name in the lore: "a heavy wild bovid of the Mithsla and Celder plains". Seven together on the low swells of the middle plain, because a frostback is a herd animal before it is anything else - "their herds follow grass quality rather than political boundaries" - and a herd of three reads as three cows. Heavy and unhurried: walked at, they put their heads up, turn and give ground at a shade over a walk, the cattle answer in `src/west-regions-life.js`, which the frostback was given when Mithala was built.',
    { scale: 1.06 }),
  zone('south-celder-swell-calves', 'frostback', .8, [-2700, -2490, -850, -740],
    [[-2530, -794], [-2544, -800]],
    'Two of the year\'s calves inside the swell herd, drawn at three-fifths of an adult. Extension in the sense that the lore does not mention calves; it does put the herds here at midsummer, which is when a wild bovid has them at foot.',
    { scale: .62 }),
  zone('south-celder-south-buffalo', 'frostback', .8, [-2700, -2490, -685, -585],
    [[-2516, -636], [-2526, -628], [-2531, -644], [-2541, -634], [-2550, -642]],
    'A second, smaller herd on the southern rows of the plain, towards the Yunethre steppe: the same circuit, a different year\'s grass. "West through the mineral-rich Celder river terraces in some years, east and south across Mithsla in others."',
    { scale: 1.06 }),
  zone('south-celder-soar-bird', 'turkey-vulture', .3, [-2700, -2490, -850, -740],
    [[-2580, -790]],
    'The overview\'s **black soar-bird**, "technically a vulture-relative, not a bird of prey", which "follows both the herds and the predators at heights that allow it to monitor several kilometers of grazing landscape simultaneously". The game has no bald vulture, so the turkey-vulture stands in for it and is labelled so; the bird and the herd under it are the lore\'s.',
    { air: 40 }),
  // -------------------------------------------------------------------------
  // The grass: hares on the swells, and the harrier that hunts them
  // -------------------------------------------------------------------------
  zone('south-celder-north-hares', 'upland-hare', .3, [-2600, -2470, -935, -825],
    [[-2490, -880], [-2502, -872], [-2511, -886]],
    'Extension: the upland hare, the hare the west already has, on the northern swells at the toe of the southern silt fan - the ground a hare wants on a plain, dry and a little above the grass round it, where a couple of metres of rise is enough to see a long way.'),
  zone('south-celder-west-hares', 'upland-hare', .3, [-2800, -2680, -770, -650],
    [[-2700, -712], [-2712, -704], [-2720, -718]],
    'Extension: a second band of hares on the western rows, where the plain begins to lift towards the foothills.'),
  zone('south-celder-harrier', 'harrier', .3, [-2720, -2480, -740, -600],
    [[-2600, -680]],
    'Extension from the Mithala: the harrier that quarters the West Mithala grass, here over the southern plain. Open grass with almost no tree in it is a harrier\'s whole living; it hunts low, nine metres up, and follows the swells as they rise and fall under it.',
    { air: 9, circle: 32, period: 19, quarter: 60, bob: 1.5, follow: true }),
  // -------------------------------------------------------------------------
  // The western margin: the foothills of the Oremindi
  // -------------------------------------------------------------------------
  zone('south-celder-foothill-hawk', 'plateau-hawk', .3, [-2950, -2760, -900, -640],
    [[-2860, -770]],
    'Extension from the West Lotharn\'s shoulder hawk: the overview\'s **dry-plateau hawk**, "which hunts the upland grasslands", circling high over the foothill margin where the plain meets the Oremindi.',
    { air: 30 }),
  zone('south-celder-foothill-deer', 'red-deer', .55, [-2945, -2800, -650, -560],
    [[-2814, -604], [-2826, -612], [-2836, -598], [-2848, -608]],
    'Extension: red deer, the game\'s deer, which the Yunethre steppe next door carries and the overview gives the lower Oremindi ("the lower forested slopes support Ibenwood-adjacent fauna"). Hinds on the open grass of the south-western foothills, with the oak and birch of the foothill draws a few paces off: feeding in the open, back in cover in a minute.',
    { hornless: true }),
  // -------------------------------------------------------------------------
  // A small predator
  // -------------------------------------------------------------------------
  zone('south-celder-fox', 'road-fox', .3, [-2560, -2380, -720, -620],
    [[-2400, -668], [-2414, -660]],
    'Extension from East Pyros: the **road fox**, "a lean, bold scavenger", standing in for whatever fox works this plain. Nothing in the lore names a small predator for Celder, and a grass plain with wild herds on it has carrion and voles enough for a fox; it goes at twelve metres and does not come back until you have.'),
]);

/**
 * Where scenery that blocks a walker must not stand: inside a range of anything that lives on the ground,
 * `margin` metres out. An animal giving ground backs straight away from whoever comes at it, and a boulder or
 * a trunk behind it is a corner; the ranges are open grass, so this costs the plain nothing it should have.
 */
export function southCelderWildlifeClear(x, z, margin = 0) {
  return SOUTH_CELDER_WILDLIFE_ZONES.some(zone => !zone.air && !zone.sea
    && x >= zone.minX - margin && x <= zone.maxX + margin && z >= zone.minZ - margin && z <= zone.maxZ + margin);
}
