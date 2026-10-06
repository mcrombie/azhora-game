/**
 * Alezhor's animals, as ranges for the western wildlife rigs (`src/content/regions/western-regions/west-regions-life.js` draws them, instanced and
 * distance-culled; they are ambient: nobody can attack, catch or speak to them).
 *
 * **What the lore gives this coast, and it gives more than most.** The fauna overview has a section for exactly this
 * ground, "Ibenale, Alezhor, and the Western Corridor" (`azhora_lore/fauna/azhoran_fauna_overview.md`): "The fauna of
 * the Ibenwood's western edge is shaped by the boundary between forest and coast - an edge environment that supports
 * species from both systems and species particular to the edge itself, which is a distinct habitat rather than merely
 * a transition." It names three things, and all three are here:
 *
 *  - **the forest edge-cat**, "the medium predator of the Ibenale and Alezhor forest margin. It is smaller than its
 *    highland relative, more arboreal, and has been observed hunting birds at the canopy level of the forest edge trees
 *    as readily as small mammals on the ground. The Alezhor coastal cities have lost it from the settled coastal strip;
 *    it persists in the wooded hinterland and in the margins of the gold-mining valleys". **Its rig is Trogo's**
 *    (`'forest-cat'`, built in job 4 of the southwest for Trogo's margin with the note that "the Ibenale and Alezhor
 *    margin is the animal's own home and is not built, so whoever builds it inherits this rig"): reused as it is, at
 *    the same size, and no new rig is spent. So the cats keep the tree line and nowhere else - none on the coast, none
 *    near a river-mouth flat where the cities stand - and the band by the gold river is the "margin of the gold-mining
 *    valleys", where the river comes out of the forest;
 *  - **otters**: "River otters and their larger relatives occupy the rivers from the Oremindi meltwater sources through
 *    the forest-margin watercourses of Alezhor. The largest form, the **great river otter**, is substantially more
 *    capable of taking fish than its smaller cousins". The great otter is the west's otter drawn a third again as big, as
 *    Trogo's and the Isa's are, at the head pool of the one medium river; the smaller cousins are the Carica's otter at
 *    its own size, on the west stream. Both go into the water when they are come upon: the ground lays its reaches' water
 *    as the world's (`river-water` markers, laid by `src/content/regions/alezhor/alezhor-scenery.js`), and an otter's way out is the water;
 *  - **the birds**: "The birds of the western corridor tend toward the forest species of the Ibenwood in the tree cover
 *    and toward coastal species near the sea, with a rich transition zone where both appear. The corridor is also a
 *    north-south migration route: species moving between northern Azhora and the southern peninsulas follow the coastal
 *    plain". The game has no small woodland bird; the forest edge's bird is the hawk the built Ibenwood already flies
 *    over its lighter outer woodland (`src/content/regions/ibenwood/ibenwood-life.js`), here over the tree line itself. The coast's are the gulls
 *    every built coast has. And the migration is the black geese - "the black migratory geese that appear on the Iberos
 *    coast in late autumn in vast flocks, winter in the coastal marshes and river mouths" - on the gold river's mouth,
 *    with the herons of the estuary, because a river mouth on a migration route is where both stop.
 *
 * **What the neighbours add**, each an extension and each saying so: red deer at the tree line, which every built
 * Ibenwood hex keeps (`src/content/regions/ibenwood/ibenwood-life.js`) and Navarth keeps at its one wood "where the air turns Csb"; the west's
 * upland hare on the open grass, as on every grassland from Vastos to Cape Heth; a harrier quartering the coastal
 * grassland, as Marosh's does its terrace between an oak ridge and an ocean; and the sea-plunger off the southern
 * cliffs, on the argument Cape Heth's builder made for the western ocean's other exposed headland.
 *
 * **Left out, and why.** No **boar**, though the Ibenwood keeps them: a band's range must be open ground with nothing
 * that blocks a walker in it, and the strip's woods are local - a boar range in a fold would cut a hole in one of them.
 * No **grey dolphins**: the overview keeps them to "Iberos coastal waters", and this is the open ocean on the other side
 * of the continent. No **river fox**: the vel-caric is "found reliably only in the Carica corridor". No **pale deer**:
 * the Ibenwood's own, "seen regularly by Forest Mittoli communities and rarely by outside travelers", and not to be put
 * out on the open grass where anybody can see it.
 *
 * **Nothing here is anybody's.** The coastal cities' herds, horses, mules and dogs are stock, and so is anything kept
 * at the gold workings: there is not one of them on this ground.
 *
 * **Every band has its own layout**, because the Celder review found two herds put down in one pattern: a pair at the
 * tree line, a loose line along a bank, a raft, a knot, a wide triangle. Ranges are open ground with nothing that blocks
 * a walker in them: the scenery keeps every tree, tall bush and boulder out (`alezhorWildlifeClear`), and lets the
 * bracken, the heather and the low gorse grow among the animals. `tests/alezhor-life.test.js` holds each home to its
 * ground, each range to the west's laws, every bird in the air to Alezhor's sky, and every band to a shape of its own.
 */
const freeze = Object.freeze;
export const ALEZHOR_REGION = 'Alezhor';
const zone = (id, species, radius, box, sites, note, traits = {}) => freeze({
  id, species, region: ALEZHOR_REGION, radius, scale: 1, keepRegion: true,
  minX: box[0], maxX: box[1], minZ: box[2], maxZ: box[3],
  sites: freeze(sites.map(site => freeze(site))), note, maxSlope: .5, ...traits,
});

const PLUNGE = freeze({ every: 10, fall: 1.1, under: 1.8, climb: 3.3 });
/**
 * An otter goes down a bank to the water, which is how it is never caught: its ground may be as steep as an earth bank
 * it slides down (the west stream's lower banks are a slope of 1.15 for a metre and a half), where everything else here
 * keeps to ground of a half.
 */
const OTTER_BANK = 1.4;

export const ALEZHOR_WILDLIFE_ZONES = freeze([
  // -------------------------------------------------------------------------
  // The tree line: the forest edge-cat, and the deer that feed out from under the trees
  // -------------------------------------------------------------------------
  zone('alezhor-gold-margin-cats', 'forest-cat', .42, [-3860, -3772, 852, 930],
    [[-3829, 868], [-3802, 875]],
    'The **forest edge-cat**, on the ground the overview names for it: "it persists in the wooded hinterland and **in the margins of the gold-mining valleys** where human activity does not maintain continuous pressure". This is the margin of the gold river\'s valley where it comes out of the South Ibenwood and drops through its gorge to the sea: the open edge under the trees a hundred metres east of the gorge\'s rim, past the otters\' pool. A pair - a female and the grown young of the year, which is the most of them anybody sees together. Trogo\'s rig, inherited as its builder meant it to be.'),
  zone('alezhor-north-margin-cats', 'forest-cat', .42, [-4372, -4258, 772, 850],
    [[-4338, 792], [-4301, 806]],
    'The same cat under the West Ibenwood\'s line, at the north-west of the strip where the plain is narrowest under the trees, between the heads of the west fold and the centre fold - "the medium predator of the Ibenale and Alezhor forest margin", hunting "birds at the canopy level of the forest edge trees as readily as small mammals on the ground". Two, wide apart, each with the trees a bound behind it.'),
  zone('alezhor-edge-hinds', 'red-deer', .55, [-4176, -4040, 776, 852],
    [[-4128, 798], [-4110, 809], [-4136, 822], [-4097, 826]],
    'Extension: red deer feeding out onto the open grass under the West Ibenwood, toward the corner where its line meets the South Ibenwood\'s. Every hex of the built Ibenwood keeps them (`src/content/regions/ibenwood/ibenwood-life.js`) and Navarth keeps them at its one wood "where the air turns Csb"; a deer is seen where a wood has open ground beside it, and this strip is the open ground beside the largest wood on the atlas. Hinds, four, back under the trees in a minute.',
    { hornless: true }),
  // -------------------------------------------------------------------------
  // The open grass
  // -------------------------------------------------------------------------
  zone('alezhor-west-plain-hares', 'upland-hare', .3, [-4372, -4274, 868, 958],
    [[-4330, 896], [-4303, 909], [-4318, 933]],
    'Extension: the west\'s upland hare, on the open grass between the west fold and the centre fold - short grass with the gorse a bound away, the ground the animal keeps on every grassland from Vastos to Cape Heth. Three in a loose triangle.'),
  zone('alezhor-south-plain-hares', 'upland-hare', .3, [-3730, -3610, 950, 1022],
    [[-3690, 972], [-3668, 985], [-3683, 1004], [-3656, 1009]],
    'Extension: the same hare on the plains of the narrow south, the tilted strip between the cliffs and the Alezhor Water, between its two folds, where the grass is shortest and driest - four, zigzagging down the slope.'),
  zone('alezhor-grass-harrier', 'harrier', .3, [-4240, -4060, 860, 940], [[-4150, 900]],
    'Extension: a harrier quartering the coastal grassland in the middle of the strip, low and following the ground, as Marosh\'s quarters its terrace between an oak ridge and an ocean. Bunch grass going gold with voles in it is a harrier\'s whole living, and it hunts nine metres up.',
    { air: 9, circle: 30, period: 19, quarter: 52, bob: 1.3, follow: true }),
  zone('alezhor-edge-hawk', 'plateau-hawk', .3, [-4240, -4160, 790, 860], [[-4200, 824]],
    'The forest edge\'s bird of the air: the hawk the built Ibenwood already flies "above lighter outer woodland" (`src/content/regions/ibenwood/ibenwood-life.js`), here over the tree line itself, where the fauna overview\'s "rich transition zone" of forest and coastal birds is. The game has no small woodland bird; this is the one that hunts them. One, riding the air over the West Ibenwood\'s foot.',
    { air: 32, circle: 24, bob: 2 }),
  // -------------------------------------------------------------------------
  // The coast
  // -------------------------------------------------------------------------
  zone('alezhor-beach-gulls', 'gull', .3, [-4470, -4380, 990, 1035],
    [[-4441, 1004], [-4430, 1012], [-4417, 1006], [-4406, 1015]],
    'Gulls on the west lobe\'s open-ocean beach, between the river mouths. The game draws the gull on every built coast, and the overview\'s "coastal species near the sea" are the half of the corridor\'s birds that are not the forest\'s. Four in a ragged line along the upper beach, facing the wind.'),
  zone('alezhor-cliff-plungers', 'sea-plunger', .3, [-3930, -3870, 1100, 1160], [[-3900, 1128], [-3893, 1136]],
    'Extension, and the same one Cape Heth\'s builder argued for the western ocean\'s other exposed headland: the **Great White Sea-plunger**, which the overview puts on "the exposed Legemum headlands" diving "from height into the Iberos shoals". Off the cliffs of the narrow south, "where the forest presses close to the cliffs", the open ocean comes straight in; two birds circle off them and fold into the sea in turn.',
    { air: 22, circle: 18, period: 16, bob: 1.4, keepRegion: false, plunge: PLUNGE }),
  // -------------------------------------------------------------------------
  // The water: the gold river's head pool and estuary, and the west stream
  // -------------------------------------------------------------------------
  zone('alezhor-gold-otters', 'otter', .35, [-3958, -3862, 858, 912],
    [[-3948, 870], [-3947, 879]],
    'The **great river otter**, on the river the overview names: "River otters and their larger relatives occupy the rivers from the Oremindi meltwater sources through the forest-margin watercourses of Alezhor. The largest form, the great river otter, is substantially more capable of taking fish than its smaller cousins". A pair on the east bank of the gold river\'s head pool, where it comes out from under the forest into its gorge: the first deep water out of the trees, and the one an otter goes into when it is come upon. The west\'s otter drawn a third again as big, as Trogo\'s and the Isa\'s are.',
    { scale: 1.32, maxSlope: OTTER_BANK }),
  zone('alezhor-west-stream-otters', 'otter', .35, [-4594, -4452, 858, 956],
    [[-4535, 884], [-4534, 911], [-4533, 930]],
    'The great otter\'s "smaller cousins" in "the forest-margin watercourses of Alezhor": the Carica\'s otter at its own size on the west stream, where it comes down from the West Ibenwood along the strip\'s western edge to the sea. Three along its east bank, the strip\'s side of it, each a slide from the water.',
    { maxSlope: OTTER_BANK }),
  zone('alezhor-estuary-herons', 'wading-bird', .4, [-4036, -3952, 926, 952],
    [[-4018, 940], [-3998, 947], [-3980, 940]],
    'Herons on the gold river\'s estuary where its gravel comes out into the bay: three along the sand spit the river\'s load has laid out into the bay beside its mouth, below the flat. The overview\'s "rich transition zone where both [forest and coastal birds] appear" is nowhere richer than at a river mouth on a migration route. Extension: its wading assemblage is catalogued on the Lizeem.'),
  zone('alezhor-estuary-geese', 'goose', .3, [-4040, -3952, 928, 952],
    [[-3968, 946], [-3961, 950], [-3956, 944], [-3964, 939], [-3958, 935], [-3953, 949]],
    'The **black migratory geese**, which the overview has wintering "in the coastal marshes and river mouths": a raft on the gold river\'s mouth where it opens into the bay. The coast here is the open ocean\'s, not the Iberos\' where the overview catalogues them, so this is an extension along the overview\'s own north-south corridor - "species moving between northern Azhora and the southern peninsulas follow the coastal plain in preference to mountain crossing". Resident until the game has seasons to bring them and take them away.',
    // A bird that floats has no slope under it: the bed under the water is no business of its.
    { float: true, maxSlope: undefined }),
]);

/**
 * Where scenery that blocks a walker must not stand: inside a range of anything that lives on the ground, `margin`
 * metres out. An animal giving ground backs straight away from whoever comes at it, and a boulder or a trunk behind it
 * is a corner; the ranges are open ground, so this costs the strip nothing it should have.
 */
export function alezhorWildlifeClear(x, z, margin = 0) {
  return ALEZHOR_WILDLIFE_ZONES.some(zone => !zone.air && !zone.sea
    && x >= zone.minX - margin && x <= zone.maxX + margin && z >= zone.minZ - margin && z <= zone.maxZ + margin);
}
