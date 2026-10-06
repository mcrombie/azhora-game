/**
 * North Celder's animals, as ranges for the western wildlife rigs (`src/content/regions/western-regions/west-regions-life.js`). Ambient, as
 * everything in the west is. The account of what the lore gives this plain is in
 * `src/content/regions/south-celder/south-celder-wildlife.js`, because the two countries are one plain and one fauna; this file is the
 * northern half of it.
 *
 * **This half has the water**, and it has the ground the lore singles out for the frostback: "west through
 * the **mineral-rich Celder river terraces** in some years". The only water in either Celder is the pair of
 * Mithala border streams down North Celder's eastern side - the West Arm and the Celder Water
 * (`src/content/regions/western-regions/west-regions.js`) - and the terraces are their Celder bank, so the main herd is there, between the two,
 * with the West Mithala herd a few hundred metres north-east on the other side of the arm.
 *
 * At the streams: **otters**, which the overview puts on exactly this water - "river otters and their larger
 * relatives occupy the rivers from the Oremindi meltwater sources through the forest-margin watercourses" -
 * and **herons**, an extension upstream from the Mithala's wading birds, standing on the gravel of a cold
 * stream rather than the silt of a slow one.
 *
 * Nothing owned: no horse, no cattle, nothing with a keeper.
 */
const freeze = Object.freeze;
export const NORTH_CELDER_REGION = 'North Celder';
const zone = (id, species, radius, box, sites, note, traits = {}) => freeze({
  id, species, region: NORTH_CELDER_REGION, radius, scale: 1, keepRegion: true,
  minX: box[0], maxX: box[1], minZ: box[2], maxZ: box[3],
  sites: freeze(sites.map(site => freeze(site))), note, maxSlope: .5, ...traits,
});

export const NORTH_CELDER_WILDLIFE_ZONES = freeze([
  // -------------------------------------------------------------------------
  // The terraces between the West Arm and the Celder Water
  // -------------------------------------------------------------------------
  zone('north-celder-terrace-buffalo', 'frostback', .8, [-2285, -2075, -1195, -1085],
    [[-2112, -1142], [-2121, -1150], [-2126, -1134], [-2135, -1146], [-2142, -1136], [-2150, -1152], [-2158, -1142], [-2166, -1132]],
    'The **frostback buffalo** on the ground the lore names for it: "west through the mineral-rich Celder river terraces in some years". Eight, the largest herd in either Celder, on the terrace grass between the West Arm and the Celder Water - the grass the Celder breeders say has "a particular mineral quality... that has no equivalent further east on the plain", which is the reason a wild herd with the whole of the Mithala to choose from comes this far west. It is also the reason the horse-breeders know it: the overview calls the frostback "unusually visible to three very different knowledge systems", one of which is "Celder horse-breeding land management".',
    { scale: 1.06 }),
  zone('north-celder-terrace-calves', 'frostback', .8, [-2285, -2075, -1195, -1085],
    [[-2130, -1140], [-2147, -1144], [-2160, -1136]],
    'Three calves at foot inside the terrace herd, drawn at three-fifths of an adult. The lore does not mention calves; it puts the herds on these terraces at midsummer, when they have them.',
    { scale: .62 }),
  zone('north-celder-soar-bird', 'turkey-vulture', .3, [-2285, -2075, -1195, -1085],
    [[-2180, -1140]],
    'The **black soar-bird** over the terrace herd: "its presence circling at low altitude indicates a kill within the hour and is used by both predators and human hunters as a locating signal". The turkey-vulture stands in for it, labelled, as over every herd in the west.',
    { air: 40 }),
  // -------------------------------------------------------------------------
  // The water
  // -------------------------------------------------------------------------
  zone('north-celder-arm-herons', 'wading-bird', .4, [-2250, -2060, -1240, -1180],
    [[-2148, -1213], [-2198, -1227], [-2098, -1227]],
    'Extension upstream: grey herons on the Celder bank of the West Arm, a pace off the water. The overview gives the wading birds the Lizeem distributaries "as both breeding grounds and wintering locations"; this is the same system a few miles nearer the mountains, colder, quicker and over gravel, and a heron stands in a riffle as readily as in a backwater.'),
  // The widest range the reach allows, laid along the stream's own bank: the Celder water is waded, not swum, so
  // there is no deep water for an otter to go into, and its way out is a long run west along the terrace.
  zone('north-celder-celder-water-otters', 'otter', .35, [-2250, -2005, -1100, -1035],
    [[-2048, -1051], [-2098, -1069], [-2125, -1060]],
    'Otters on the Celder Water, the one stream that comes onto the plain from the hill country. Lore, not extension: "river otters and their larger relatives occupy the rivers from the Oremindi meltwater sources through the forest-margin watercourses", and this is a meltwater stream within sight of the Oremindi.',
    { scale: 1.1 }),
  // -------------------------------------------------------------------------
  // The open plain, west of the water
  // -------------------------------------------------------------------------
  zone('north-celder-plain-buffalo', 'frostback', .8, [-2700, -2490, -1300, -1190],
    [[-2560, -1200], [-2569, -1208], [-2574, -1193], [-2583, -1204], [-2591, -1196]],
    'A second herd on the open plain of the north-west, moving between the terraces and the Henborth road the lore gives them: "north into Henborth only when the thaw and summer moisture make the upland pasture worth the risk". North Celder is the last of Celder before Henborth, and this is the herd that is deciding.',
    { scale: 1.06 }),
  zone('north-celder-hares', 'upland-hare', .3, [-2800, -2740, -1150, -1040],
    [[-2760, -1090], [-2772, -1082], [-2782, -1097]],
    'Extension: upland hares on the western swells, where the plain starts to lift towards the foothills.'),
  zone('north-celder-harrier', 'harrier', .3, [-2520, -2320, -1250, -1070],
    [[-2420, -1160]],
    'Extension from the Mithala: a harrier quartering the middle of the plain, low and following the ground. The West Mithala\'s harrier hunts the same grass a mile east.',
    { air: 9, circle: 32, period: 20, quarter: 64, bob: 1.5, follow: true }),
  zone('north-celder-fox', 'road-fox', .3, [-2500, -2450, -1180, -1080],
    [[-2470, -1130], [-2486, -1122]],
    'Extension from East Pyros: the road fox, "a lean, bold scavenger", standing in for the plain\'s fox. It goes at twelve metres, fast, and the herds\' carrion and the voles in the grass are a living.'),
]);

/** Where blocking scenery must not stand: inside a ground animal's range, `margin` metres out. */
export function northCelderWildlifeClear(x, z, margin = 0) {
  return NORTH_CELDER_WILDLIFE_ZONES.some(zone => !zone.air && !zone.sea
    && x >= zone.minX - margin && x <= zone.maxX + margin && z >= zone.minZ - margin && z <= zone.maxZ + margin);
}

// Candidate eligibility retains the delivered scatter stream when Canerd
// relocates these two ranges. Actual blockers are filtered against the live
// ranges after all seeded choices, including instance colours, are consumed.
const candidateRanges = NORTH_CELDER_WILDLIFE_ZONES.map(zone => zone.id === 'north-celder-hares'
  ? { ...zone, minX: -2700, maxX: -2570, minZ: -1130, maxZ: -1010 }
  : zone.id === 'north-celder-fox' ? { ...zone, minX: -2640, maxX: -2450, minZ: -1180, maxZ: -1080 } : zone);
export function northCelderCandidateWildlifeClear(x, z, margin = 0) {
  return candidateRanges.some(zone => !zone.air && !zone.sea
    && x >= zone.minX - margin && x <= zone.maxX + margin && z >= zone.minZ - margin && z <= zone.maxZ + margin);
}
