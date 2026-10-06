/**
 * The southwestern block: Navarth, West Pyros, the Ganesh Desert and the Ganesh Plain, as ground,
 * climate, water margin and named natural places.
 *
 * Pure: no three, no DOM. `src/content/regions/western-regions/west-ground.js` puts the landforms here into the ground
 * (`southwestGround`) in the same sum as Caricas's shelf, Nethereum's hollow, Gala's steppe rise,
 * the Oves's basin and the Mithala's levees, so the two rivers that run through them read the
 * ground they are cut in; `src/content/regions/western-regions/west-regions.js` declares those rivers with the rest of the west's
 * water; `src/content/regions/southwest/southwest-scenery.js` draws what grows, and `src/content/regions/southwest/southwest-wildlife.js` places what
 * lives there. The tests, the chart and the terrain tint read the same numbers.
 *
 * Authored directly in **world metres** (100 m per authored hex), like every country since Pueth.
 *
 * **Four countries in one module, because they are one dry quarter.** A hundred and seven hexes,
 * forty-six hex edges shared among the four, one wavelength, and a single climate gradient that
 * runs across all four borders without noticing them. Modules are named `southwest-*` rather than
 * after one country because three more jobs will extend them southward.
 *
 * **This is the first true desert in the game.** Eighty-one of the hundred and seven hexes read
 * `BWh` - hot desert - on the World Builder map, where everything built before this was `Cfa`,
 * `Csa`, `Csb`, `BSh` or `Dfa`. The Oves Desert, which is the game's existing dry country, is
 * `BSh` steppe on every one of its hexes and its own report says so: the map's author had `BWh`
 * available and did not use it there. He used it here, over three whole countries.
 *
 * **And unlike the Oves there is a gradient, which is the block's shape** (`southwestAridity`):
 * `BSh` × 18 down West Pyros's eastern columns beside the great river, `Csb` × 6 and `Csa` × 2 on
 * the block's two green corners - Navarth's north-eastern tip where the Ibenwood's southern edge
 * reaches in, and the south-eastern corner of West Pyros and the Ganesh Plain where Marosh's
 * country and the southern sea begin - and `BWh` over everything else, which is most of it.
 * **Aridity increases westward and inland**, and the driest ground in Azhora is the Ganesh Desert's
 * thirty-one hexes, every one of them `BWh`, running out at a gulf shore it is arid right up to.
 *
 * **The block is an island.** None of these four touches a built country: the built frontier in the
 * west is Nethereum and Isareos, which border the Ibenwoods, and the Ibenwoods are not built. So
 * every outer margin is `outland`, nothing here can step on anybody's ground, and the block's own
 * internal coherence is the only standard there is. **The datum is the two river mouths**: the
 * Alezhor Water reaches the gulf at the Ganesh Desert's north-western corner and the Vaellir
 * reaches the sea at West Pyros's southern tip, and those are the two places in this block where
 * the world's own sea level is a fact rather than a choice. Everything below is measured up from
 * them, and the two of them are the block's two outlets: the ground falls north-west to the first
 * and south-east to the second, and the low divide between the two runs down the Ganesh Plain.
 *
 * **Everything the lore of this quarter is actually about belongs to somebody, and none of it is
 * built**: Pyros the empire and both its halves, Gala on its hill above the confluence, the Fire
 * Memory with its fumarole sites and its ceremonies, Navarth's surrogate fires and its pilgrimage
 * and its grey sheep, the caravan crossing of the Ganesh with its waystations and its water points
 * and the Route Registry at Dinelv that issues the crossing guidance, the pastoral communities who
 * move through the plain by the drought cycle, the northern markets and Ganesh Ford at the head of
 * them, and every animal any of those people own.
 */
import { terrainMix, seamlessTerrainMix, relief, hexOwnerAt, hexAtlasCorners, TRANSFORM, REGION_CELLS, REGION_TERRAIN, landDistance } from '../../../world/terrain/region-world.js';
import { regionOutline } from '../../../world/terrain/region-layout.js';
import { PLAYABLE_SURVEY } from '../../../dev/tools/region-survey.js';
import { VAELLIR, ALEZHOR_WATER, MAROSH_NAHR, TROGORETH, SOUTHWEST_RIVERS, courseDistance, coursePosition } from '../western-regions/west-regions.js';

const freeze = Object.freeze;
const point = (x, z) => freeze({ x, z });
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const smooth = (a, b, x) => { const v = clamp((x - a) / (b - a), 0, 1); return v * v * (3 - 2 * v); };
const lerp = (a, b, t) => a + (b - a) * t;

/**
 * **The block in two halves, because it was built in two jobs and the halves are different
 * countries.** The northern four are job 1's: a plateau, a steppe with a great river down it, a
 * desert and a transition plain, with four climate codes across them and a gradient in them. The
 * southern four are job 2's: ninety-five hexes of `plains` and `BWh` with no gradient in them at
 * all, told apart by what the ground is made of and by which edge of the desert each one shows.
 *
 * `SOUTHWEST_REGIONS` is all eight and is what the box, the weights and the tilt read, because the
 * two halves share ten hex edges along the Ganesh Plain's southern row and a landform gated on
 * either half alone would die out in a valley down the middle of that seam. The two lists are
 * separate because the landforms are: benches, dunes, fans and fog belong to one half and washes,
 * channels, crests and galleries to the other.
 */
export const SOUTHWEST_NORTH_REGIONS = freeze(['Navarth', 'West Pyros', 'Ganesh Desert', 'Ganesh Plain']);
export const MEROSHE_REGIONS = freeze(['North Meroshe Desert', 'West Meroshe Desert', 'Central Meroshe Desert', 'South Meroshe Desert']);
/**
 * **The block's western edge, and the three countries that are each a first.** Job 3's three are kept
 * as their own list for the same reason the Meroshe's four are: their landforms are theirs. A cape
 * does not have a fan skirt and a plateau does not have a dune.
 *
 *  - **Cape Heth** holds the only `coast` hex any country on the atlas holds. Of the 1,332 `coast`
 *    hexes the map paints round the continent, 1,331 are unclaimed shoreline and one, (-39,127), falls
 *    inside somebody's outline: the point of this cape.
 *  - **The Dinelv Highlands** are the only desert highland - `BWh` on all thirty-five hexes with
 *    twenty-six `hills`, six `plains` and three `mountain`, and those three are the *only* hot-desert
 *    `mountain` hexes on the whole map. The Lotharns are humid and the Meroshe is flat; this is
 *    neither.
 *  - **Hama** is the wet edge of the desert: nine `Csb` hexes against ten `BWh`, and the atlas draws
 *    the same line twice, once with the terrain word and once with the climate code, with no hex where
 *    the two disagree.
 */
export const WEST_EDGE_REGIONS = freeze(['Cape Heth', 'Dinelv Highlands', 'Hama']);
/**
 * **The block's eastern edge, and the two countries that say why there is a desert behind them.**
 * Job 4's two are their own list for the reason job 2's four and job 3's three are: their landforms
 * are theirs, and neither a ridge crest nor a rainforest thicket belongs to a cape, a plateau or a
 * dune field. What these two have in common is what nothing else in thirteen countries has -
 * **not one `BWh` hex between them** - and fifty hex edges of open water on the far side of the
 * peninsula from every other shore in the block.
 *
 *  - **Marosh** is the wall. Eighteen hexes in a strip two wide: eight `hills` hexes that are every one
 *    of them `Csb` and **carry seventeen of the country's eighteen desert edges and none of its ocean
 *    ones**, and ten `grassland` hexes that are every one of them `Csa` and carry all twenty of its
 *    ocean edges and the eighteenth desert edge. The atlas states the same division three times over -
 *    by terrain word, by climate code, and by which side of the country each half faces - and no hex
 *    disagrees with any of the three.
 *  - **Trogo** is the first rainforest in the game. Twenty-two `deep_forest` hexes, `Af` on every one -
 *    the wettest code the atlas paints anywhere - and seven `Csa` `grassland` hexes along the exposed
 *    southern shore where the forest stops, again with no hex where the two fields disagree. **This is
 *    the first use of `deep_forest` anywhere in the game's world**: until now the word appeared only in
 *    `campaign-world.js`'s labels and in the developer atlas's own height table, which puts it at
 *    eighteen metres where `plains` is six - the map author's own hint that a deep forest stands over
 *    the ground round it.
 */
export const EAST_EDGE_REGIONS = freeze(['Marosh', 'Trogo']);
export const SOUTHWEST_REGIONS = freeze([...SOUTHWEST_NORTH_REGIONS, ...MEROSHE_REGIONS, ...WEST_EDGE_REGIONS, ...EAST_EDGE_REGIONS]);

// ---------------------------------------------------------------------------
// The climate, which for once is a gradient
// ---------------------------------------------------------------------------
/**
 * What the World Builder map paints on every hex of all four countries
 * (`world-builder/map/resources/examples/azhora.wwmap`, `hexes[key].climate`, `koppen-v1` - *not*
 * `azhora.cmap.json`, whose one-code-per-region field is a default and says `Cfb` for almost
 * everything). The dev export drops the field, so it is written out here and
 * `tests/southwest-world.test.js` holds it to the map hex for hex whenever the map is on the
 * machine to ask.
 *
 * **A hundred and seven entries and four codes**: `BWh` × 81, `BSh` × 18, `Csb` × 6, `Csa` × 2.
 * Where the Oves and the Mithala each had one code over a whole block and drew no gradient at all,
 * this one has a real one and it is the shape of the country - so `southwestAridity` below blends
 * it, the way Gala's three bands are blended, and the ground colour, the scatter and the wildlife
 * all read off it.
 *
 * Read down the columns rather than across the rows and the pattern is plain: in West Pyros and
 * the Ganesh Plain the codes change with **q** and not with **r**, which is to say from east to
 * west; in Navarth they change with **r**, from the forest belt southward. For context the whole
 * quarter agrees: East Pyros next door is `BSh` × 29 + `Csb` × 3 + `Csa` × 1 with its own green
 * southern tip, Alezhor over the northern border is `Csb` × 25, South and West Ibenwood are `Csb`
 * throughout, Marosh over the south-eastern border is `Csa` × 10 + `Csb` × 8, and everything west
 * and south - Cape Heth, the Dinelv Highlands, the North Meroshe Desert - is `BWh` like the Ganesh.
 */
export const NAVARTH_CLIMATE = freeze({
  '-24,116': 'Csb', '-23,116': 'Csb',
  '-26,117': 'BWh', '-25,117': 'BWh', '-24,117': 'BWh',
  '-27,118': 'BWh', '-26,118': 'BWh', '-25,118': 'BWh', '-24,118': 'BWh',
  '-28,119': 'BWh', '-27,119': 'BWh', '-26,119': 'BWh', '-25,119': 'BWh',
  '-28,120': 'BWh', '-27,120': 'BWh', '-26,120': 'BWh', '-25,120': 'BWh',
  '-28,121': 'BWh', '-27,121': 'BWh', '-26,121': 'BWh',
  '-27,122': 'BWh', '-26,122': 'BWh',
});
export const WEST_PYROS_CLIMATE = freeze({
  '-22,116': 'BSh',
  '-23,117': 'BSh', '-22,117': 'BSh',
  '-23,118': 'BSh', '-22,118': 'BSh',
  '-24,119': 'BWh', '-23,119': 'BSh', '-22,119': 'BSh',
  '-24,120': 'BWh', '-23,120': 'BSh', '-22,120': 'BSh',
  '-25,121': 'BWh', '-24,121': 'BWh', '-23,121': 'BSh', '-22,121': 'BSh', '-21,121': 'BSh',
  '-25,122': 'BWh', '-24,122': 'BWh', '-23,122': 'BSh', '-22,122': 'BSh', '-21,122': 'BSh',
  '-23,123': 'BWh', '-22,123': 'BSh', '-21,123': 'BSh',
  '-22,124': 'BSh', '-21,124': 'Csb',
  '-21,125': 'Csa',
});
export const GANESH_DESERT_CLIMATE = freeze({
  '-30,120': 'BWh', '-29,120': 'BWh',
  '-31,121': 'BWh', '-30,121': 'BWh', '-29,121': 'BWh',
  '-32,122': 'BWh', '-31,122': 'BWh', '-30,122': 'BWh', '-29,122': 'BWh', '-28,122': 'BWh',
  '-33,123': 'BWh', '-32,123': 'BWh', '-31,123': 'BWh', '-30,123': 'BWh', '-29,123': 'BWh', '-28,123': 'BWh', '-27,123': 'BWh',
  '-33,124': 'BWh', '-32,124': 'BWh', '-31,124': 'BWh', '-30,124': 'BWh', '-29,124': 'BWh', '-28,124': 'BWh',
  '-33,125': 'BWh', '-32,125': 'BWh', '-31,125': 'BWh', '-30,125': 'BWh', '-29,125': 'BWh', '-28,125': 'BWh',
  '-33,126': 'BWh', '-32,126': 'BWh',
});
export const GANESH_PLAIN_CLIMATE = freeze({
  '-26,123': 'BWh', '-25,123': 'BWh', '-24,123': 'BWh',
  '-27,124': 'BWh', '-26,124': 'BWh', '-25,124': 'BWh', '-24,124': 'BWh', '-23,124': 'BWh',
  '-27,125': 'BWh', '-26,125': 'BWh', '-25,125': 'BWh', '-24,125': 'BWh', '-23,125': 'BWh', '-22,125': 'Csb',
  '-28,126': 'BWh', '-27,126': 'BWh', '-26,126': 'BWh', '-25,126': 'BWh', '-24,126': 'BWh', '-23,126': 'Csb', '-22,126': 'Csa',
  '-28,127': 'BWh', '-27,127': 'BWh', '-26,127': 'BWh', '-25,127': 'BWh', '-24,127': 'BWh', '-23,127': 'Csb',
});
/**
 * **The four Meroshe deserts: ninety-five hexes and one code.** Read off the same map field, hex by
 * hex, and there is nothing in it - `BWh` ninety-five times, which with job 1's eighty-one makes a
 * hundred and seventy-six of this block's two hundred and two hexes hot desert.
 *
 * **This is the finding the whole job turns on.** Job 1's half has a climate gradient and that
 * gradient is its shape; this half has none, and four quarters the atlas bothered to name cannot be
 * told apart by their weather, their terrain word, their relief or their water, because the atlas
 * gives all four the same in every one of those fields. So they are told apart by **the surface** -
 * hamada, fan skirt and salt, erg, reg - and by **which edge of the desert each one looks out at**:
 * the Ganesh Plain and Marosh's Mediterranean hills north of the North, the Dinelv escarpment and
 * the open ocean west of the West, nothing at all from inside the Central, and Trogo's tropical
 * rainforest and the southern ocean south of the South.
 *
 * For context, and it is worth having: **every one of the two hundred and forty-five `BWh` hexes on
 * the whole claimed atlas is in this one quarter of the continent** - the Dinelv Highlands 35, these
 * four 95, the Ganesh Desert 31, the Ganesh Plain 23, Navarth 20, Cape Heth 18, Hama 10, West Pyros
 * 7 and the Aurumlis 6. There is no other desert in Azhora, and these ninety-five hexes are
 * thirty-nine per cent of the one there is.
 */
export const NORTH_MEROSHE_CLIMATE = freeze({
  '-28,128': 'BWh', '-27,128': 'BWh', '-26,128': 'BWh', '-25,128': 'BWh', '-24,128': 'BWh',
  '-29,129': 'BWh', '-28,129': 'BWh', '-27,129': 'BWh', '-26,129': 'BWh', '-25,129': 'BWh',
  '-30,130': 'BWh', '-29,130': 'BWh', '-28,130': 'BWh', '-27,130': 'BWh', '-26,130': 'BWh',
  '-32,131': 'BWh', '-31,131': 'BWh', '-30,131': 'BWh', '-29,131': 'BWh', '-28,131': 'BWh', '-27,131': 'BWh',
  '-32,132': 'BWh', '-31,132': 'BWh',
});
export const WEST_MEROSHE_CLIMATE = freeze({
  '-34,132': 'BWh', '-33,132': 'BWh',
  '-37,133': 'BWh', '-36,133': 'BWh', '-35,133': 'BWh', '-34,133': 'BWh', '-33,133': 'BWh',
  '-37,134': 'BWh', '-36,134': 'BWh', '-35,134': 'BWh', '-34,134': 'BWh', '-33,134': 'BWh',
  '-37,135': 'BWh', '-36,135': 'BWh', '-35,135': 'BWh', '-34,135': 'BWh',
  '-37,136': 'BWh', '-36,136': 'BWh', '-35,136': 'BWh', '-34,136': 'BWh',
});
export const CENTRAL_MEROSHE_CLIMATE = freeze({
  '-30,132': 'BWh', '-29,132': 'BWh', '-28,132': 'BWh', '-27,132': 'BWh',
  '-32,133': 'BWh', '-31,133': 'BWh', '-30,133': 'BWh', '-29,133': 'BWh', '-28,133': 'BWh', '-27,133': 'BWh',
  '-32,134': 'BWh', '-31,134': 'BWh', '-30,134': 'BWh', '-29,134': 'BWh', '-28,134': 'BWh', '-27,134': 'BWh',
  '-33,135': 'BWh', '-32,135': 'BWh', '-31,135': 'BWh', '-30,135': 'BWh', '-29,135': 'BWh', '-28,135': 'BWh', '-27,135': 'BWh',
  '-33,136': 'BWh', '-32,136': 'BWh', '-31,136': 'BWh', '-30,136': 'BWh', '-29,136': 'BWh',
  '-33,137': 'BWh', '-32,137': 'BWh', '-31,137': 'BWh',
});
export const SOUTH_MEROSHE_CLIMATE = freeze({
  '-28,136': 'BWh', '-27,136': 'BWh', '-26,136': 'BWh',
  '-30,137': 'BWh', '-29,137': 'BWh', '-28,137': 'BWh', '-27,137': 'BWh',
  '-31,138': 'BWh', '-30,138': 'BWh', '-29,138': 'BWh', '-28,138': 'BWh', '-27,138': 'BWh',
  '-31,139': 'BWh', '-30,139': 'BWh', '-29,139': 'BWh', '-28,139': 'BWh',
  '-32,140': 'BWh', '-31,140': 'BWh', '-30,140': 'BWh',
  '-32,141': 'BWh', '-31,141': 'BWh',
});
export const MEROSHE_CLIMATE = freeze({
  ...NORTH_MEROSHE_CLIMATE, ...WEST_MEROSHE_CLIMATE, ...CENTRAL_MEROSHE_CLIMATE, ...SOUTH_MEROSHE_CLIMATE,
});
/**
 * **Cape Heth: eighteen `BWh` hexes and one `Cfb`, and the `Cfb` is the sea's and not the air's.**
 *
 * The one odd hex is (-39,127), the point of the cape, and it is the only hex in the block whose
 * terrain word is `coast`. Its climate reads `Cfb`, which everywhere else in Azhora is oceanic
 * temperate - and taking it at face value would put a wet green headland on the tip of a desert cape.
 * It was measured before it was believed: **all 1,332 of the atlas's `coast` hexes read `Cfb`, and
 * 13,619 of its 13,622 `ocean` hexes read `Cfb` too.** So `Cfb` on a shoreline hex is the code the map
 * paints on water, the way `azhora.cmap.json` says `Cfb` for almost everything (job 1's finding), and
 * it says nothing whatever about the air over this cape. `CLIMATE_CENTRES` therefore gives this one hex
 * the desert's own dryness and records the map's word unchanged, and
 * `tests/southwest-world.test.js` holds both halves of that.
 */
export const CAPE_HETH_CLIMATE = freeze({
  '-35,125': 'BWh', '-34,125': 'BWh',
  '-38,126': 'BWh', '-37,126': 'BWh', '-36,126': 'BWh', '-35,126': 'BWh', '-34,126': 'BWh',
  '-39,127': 'Cfb', '-38,127': 'BWh', '-37,127': 'BWh', '-36,127': 'BWh', '-35,127': 'BWh', '-34,127': 'BWh',
  '-38,128': 'BWh', '-37,128': 'BWh', '-36,128': 'BWh', '-35,128': 'BWh',
  '-37,129': 'BWh', '-36,129': 'BWh',
});
/**
 * **The Dinelv Highlands: thirty-five hexes, one code, and every one of them hot.** `BWh` on the
 * `plains` in the basins, on the `hills` of the rolling upland and on all three `mountain` hexes,
 * which is the fact that decides how high those three can be: a summit high enough to be a mountain
 * in the Lotharn sense would read `ET` or `Dfc` at its top, and the map's author wrote `BWh`. Across
 * the whole atlas `mountain` reads `BWh` exactly three times, and these are the three.
 *
 * The lore agrees and is worth quoting, because it is the only place in the archive that describes a
 * desert upland: "The surface is arid - rainfall at the plateau elevation is somewhat higher than on
 * the coast directly below, but not substantially, and the thin soils and rocky substrate do not
 * retain what moisture falls."
 */
export const DINELV_CLIMATE = freeze({
  '-31,126': 'BWh', '-30,126': 'BWh', '-29,126': 'BWh',
  '-33,127': 'BWh', '-32,127': 'BWh', '-31,127': 'BWh', '-30,127': 'BWh', '-29,127': 'BWh',
  '-34,128': 'BWh', '-33,128': 'BWh', '-32,128': 'BWh', '-31,128': 'BWh', '-30,128': 'BWh', '-29,128': 'BWh',
  '-35,129': 'BWh', '-34,129': 'BWh', '-33,129': 'BWh', '-32,129': 'BWh', '-31,129': 'BWh', '-30,129': 'BWh',
  '-37,130': 'BWh', '-36,130': 'BWh', '-35,130': 'BWh', '-34,130': 'BWh', '-33,130': 'BWh', '-32,130': 'BWh', '-31,130': 'BWh',
  '-37,131': 'BWh', '-36,131': 'BWh', '-35,131': 'BWh', '-34,131': 'BWh', '-33,131': 'BWh',
  '-37,132': 'BWh', '-36,132': 'BWh', '-35,132': 'BWh',
});
/**
 * **Hama: nine `Csb` and ten `BWh`, and the terrain field draws the same line.** Every one of the nine
 * `grassland` hexes reads `Csb` and every one of the ten `plains` hexes reads `BWh`, with no hex
 * anywhere in the country where the two fields disagree. **That agreement is the most valuable single
 * fact in job 3**: it means the wet/dry line here is something the atlas states twice rather than
 * something a build has to interpolate, and it is the only country in the block where the two fields
 * agree over the whole of it. (Job 1 found the same agreement on its three odd hexes and made features
 * of all three; this is the same thing across nineteen.)
 *
 * The green is on the seaward side - the atlas gives Hama nineteen hex edges of ocean, west and south -
 * and the dry is inland toward the Meroshe, which is exactly what `hama.md` says the geography is: "the
 * western face is open-ocean coast, exposed to the weather patterns that originate in the far west and
 * arrive at the peninsula having crossed considerable water."
 */
export const HAMA_CLIMATE = freeze({
  '-36,137': 'Csb', '-35,137': 'BWh', '-34,137': 'BWh',
  '-37,138': 'Csb', '-36,138': 'Csb', '-35,138': 'BWh', '-34,138': 'BWh', '-33,138': 'BWh', '-32,138': 'BWh',
  '-36,139': 'Csb', '-35,139': 'Csb', '-34,139': 'BWh', '-33,139': 'BWh', '-32,139': 'BWh',
  '-35,140': 'Csb', '-34,140': 'Csb', '-33,140': 'BWh',
  '-34,141': 'Csb', '-33,141': 'Csb',
});
export const WEST_EDGE_CLIMATE = freeze({ ...CAPE_HETH_CLIMATE, ...DINELV_CLIMATE, ...HAMA_CLIMATE });
/**
 * **Marosh: ten `Csa` and eight `Csb`, and the atlas draws the line with the terrain field as well.**
 * Every `grassland` hex reads `Csa` and every `hills` hex reads `Csb`, on all eighteen, with no hex
 * where the two disagree - which is the third country in a row where the map states its own division
 * twice (job 1 found it on three odd hexes, job 3 on the whole of Hama).
 *
 * **What draws this line is height, and that is the answer to the question job 3 left.** Hama's wet/dry
 * line is the ocean's: measured, it runs sixty-nine to a hundred and ten metres inland of the surf all
 * the way round the corner of the continent. Marosh has no wet/dry line at all - both its halves are
 * Mediterranean - and the line it does have is between the two forms of the same climate. `Csa` is the
 * hot-summer form and `Csb` the warm-summer one, and the whole of what separates them in Koppen is
 * whether the warmest month passes twenty-two degrees. **On a coastal strip two hexes wide nothing but
 * altitude can decide that**, and the atlas obligingly writes `hills` on precisely the eight hexes it
 * writes `Csb` on. So the `Csb` is the ridge, and the ridge is also why everything west of Marosh is a
 * desert: it stands between twenty hex edges of open Iberos water and the Central Meroshe's sand sea,
 * and what crosses its crest has had the rain taken out of it.
 *
 * `Csb` is the *wetter* of the two on `ARIDITY`'s scale, so **Marosh's inland half is the wettest
 * ground in the block outside Trogo** - which reads backwards until the reason is stated, and the
 * reason is that the wet side of a rain-shadow wall is the top of it.
 */
export const MAROSH_CLIMATE = freeze({
  '-22,127': 'Csa',
  '-23,128': 'Csb', '-22,128': 'Csa',
  '-24,129': 'Csb', '-23,129': 'Csa', '-22,129': 'Csa',
  '-25,130': 'Csb', '-24,130': 'Csa',
  '-26,131': 'Csb', '-25,131': 'Csa',
  '-26,132': 'Csb', '-25,132': 'Csa',
  '-26,133': 'Csb', '-25,133': 'Csa',
  '-26,134': 'Csb', '-25,134': 'Csa',
  '-26,135': 'Csb', '-25,135': 'Csa',
});
/**
 * **Trogo: twenty-two `Af` and seven `Csa`, and `Af` is the wettest code on the map.** `Af` is tropical
 * rainforest with no dry season - no month under sixty millimetres - and it is the biggest climate step
 * this block has taken by a long way: job 1 found the first `BWh` in the game and this is the first
 * `Af`, and the two of them stand **thirteen hex edges apart** along Trogo's own north-western margin.
 * On `ARIDITY`'s scale that is 1.000 against 0.000 across a single hex edge, which is the whole range of
 * the field in one step, and there is nothing else like it anywhere in Azhora.
 *
 * The terrain field draws the same line for the third country running: every `deep_forest` hex reads
 * `Af` and every `grassland` hex reads `Csa`, on all twenty-nine, with no hex where the two disagree.
 * **The seven `Csa` hexes are where the forest stops**, and the atlas puts every one of them on the
 * *exposed* southern and south-eastern shore while it takes the `deep_forest` right down to the water
 * on the sheltered north-eastern one. That is a real distinction and it is the lore's: "The coast is not
 * extensively sheltered - no deep natural harbors on the scale of Hama." A tropical coast open to a
 * southern ocean is salt-pruned and carries grass and scrub; a sheltered embayment in the same climate
 * carries canopy to the tideline, which is what the lore's "mangrove and estuary ecology" is.
 *
 * And `Af` at this latitude on a slope is the lore's own explanation of itself: "where desert air meets
 * ocean-loaded humidity along the southeastern ridge, fog forms and stays, sometimes for days... it is
 * warm and thick and close, and it waters the middle elevation forest through the dry months when the
 * rainfall alone would not be enough." **The fog is why there is no dry season**, and the fog is the
 * reason the code is `Af` and not `Am` or `Aw`.
 */
export const TROGO_CLIMATE = freeze({
  '-25,136': 'Af',
  '-26,137': 'Af', '-25,137': 'Af', '-24,137': 'Af', '-23,137': 'Af',
  '-26,138': 'Af', '-25,138': 'Af', '-24,138': 'Af', '-23,138': 'Af',
  '-27,139': 'Af', '-26,139': 'Af', '-25,139': 'Af', '-24,139': 'Af', '-23,139': 'Csa',
  '-29,140': 'Af', '-28,140': 'Af', '-27,140': 'Af', '-26,140': 'Af', '-25,140': 'Af', '-24,140': 'Csa',
  '-30,141': 'Af', '-29,141': 'Af', '-28,141': 'Af', '-27,141': 'Af', '-26,141': 'Csa', '-25,141': 'Csa',
  '-29,142': 'Csa', '-28,142': 'Csa', '-27,142': 'Csa',
});
export const EAST_EDGE_CLIMATE = freeze({ ...MAROSH_CLIMATE, ...TROGO_CLIMATE });
export const SOUTHWEST_CLIMATE = freeze({
  ...NAVARTH_CLIMATE, ...WEST_PYROS_CLIMATE, ...GANESH_DESERT_CLIMATE, ...GANESH_PLAIN_CLIMATE,
  ...MEROSHE_CLIMATE, ...WEST_EDGE_CLIMATE, ...EAST_EDGE_CLIMATE,
});
/**
 * How dry a hex's code is, on one scale: 1 is hot desert, **0 is tropical rainforest**. The two
 * `Cs` codes are held apart by a little, because `Csb` is the cooler wetter-summer form and is what
 * the Ibenwood margin and Marosh's ridge read, where `Csa` is the hot-summer form on the hexes nearest
 * the southern sea.
 *
 * **`Af` is the only zero on this scale and job 4 is where it arrives.** For three jobs the wet end of
 * the field was `Csb` at 0.08 - a Mediterranean winter - and the whole block sat between that and 1.
 * Trogo is `Af` on twenty-two hexes, which is rain in every month of the year, and it shares thirteen
 * hex edges with a country that is `BWh` on all twenty-one of its own. So the field now spends its
 * entire range inside this block, and it spends most of it across one hex edge.
 */
export const ARIDITY = freeze({ BWh: 1, BSh: .58, Csa: .18, Csb: .08, Af: 0 });
/**
 * **A `coast` hex's code is the water's and not the air's, so it takes the desert's dryness.** The map
 * paints `Cfb` on all 1,332 of its `coast` hexes and on 13,619 of its 13,622 `ocean` ones, so the one
 * `Cfb` in this block - Cape Heth's point, (-39,127) - is the shoreline's default and not a wet hex.
 * Left to `ARIDITY[code] ?? 1` it would have fallen through to 1 by accident and looked right for the
 * wrong reason, which is the failure mode job 2's `groundTint` bug taught this block to distrust: it is
 * stated here instead, and the test asserts the point of the cape is as arid as the rest of it.
 */
export const COAST_HEX_DRY = 1;
const CLIMATE_CENTRES = freeze(Object.entries(SOUTHWEST_CLIMATE).map(([key, code]) => {
  const [q, r] = key.split(',').map(Number);
  const cell = SOUTHWEST_REGIONS.flatMap(name => REGION_CELLS[name] ?? []).find(c => c.q === q && c.r === r);
  const dry = cell?.terrain === 'coast' ? COAST_HEX_DRY : (ARIDITY[code] ?? 1);
  return freeze({ q, r, code, dry, x: cell?.x ?? 0, z: cell?.z ?? 0 });
}));
/**
 * The climate as a field rather than as a hex list, blended on the same falloff the ground's own
 * hex blend uses (`blendHexes`, reach 1.28 hexes), so the aridity changes over a hex and not at a
 * hex edge. Outside the block, and where no hex of the block is within reach, it answers the
 * block's own driest value, because everything round this quarter but the forest belt and Marosh
 * is desert too.
 *
 * **Gala's three bands are the precedent and the Oves's flat `BSh` is the counter-example.** This
 * is the third country in the game with a climate that varies inside it and the first where the
 * variation runs the width of four countries at once.
 */
export function southwestAridity(x, z) {
  let total = 0, sum = 0;
  for (const hex of CLIMATE_CENTRES) {
    const weight = 1 - Math.hypot(x - hex.x, z - hex.z) / 128;
    if (weight <= 0) continue;
    total += weight; sum += hex.dry * weight;
  }
  return total > 0 ? sum / total : 1;
}
/** The hex code at a point, for the tests and the chart: the nearest authored hex's own word. */
export function southwestKoppen(x, z) {
  let best = null, bestDistance = Infinity;
  for (const hex of CLIMATE_CENTRES) {
    const d = (hex.x - x) ** 2 + (hex.z - z) ** 2;
    if (d < bestDistance) { bestDistance = d; best = hex; }
  }
  return best?.code ?? null;
}

// ---------------------------------------------------------------------------
// The boxes, and how much of a point belongs to the block
// ---------------------------------------------------------------------------
const boxOf = names => {
  const box = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
  for (const name of names) for (const cell of REGION_CELLS[name] ?? []) {
    box.minX = Math.min(box.minX, cell.x - 95); box.maxX = Math.max(box.maxX, cell.x + 95);
    box.minZ = Math.min(box.minZ, cell.z - 95); box.maxZ = Math.max(box.maxZ, cell.z + 95);
  }
  return freeze(box);
};
export const SOUTHWEST_BOX = boxOf(SOUTHWEST_REGIONS);
export const SOUTHWEST_BOXES = freeze(Object.fromEntries(SOUTHWEST_REGIONS.map(name => [name, boxOf([name])])));
const inBox = (box, x, z) => x >= box.minX && x <= box.maxX && z >= box.minZ && z <= box.maxZ;
export const inSouthwestBox = (x, z) => inBox(SOUTHWEST_BOX, x, z);
/** The middle of one country's own hexes, measured rather than typed. */
const centreOf = name => {
  const cells = REGION_CELLS[name] ?? [];
  return point(cells.reduce((s, c) => s + c.x, 0) / cells.length, cells.reduce((s, c) => s + c.z, 0) / cells.length);
};
export const SOUTHWEST_CENTRES = freeze(Object.fromEntries(SOUTHWEST_REGIONS.map(name => [name, centreOf(name)])));

/**
 * The northern countries and six western-edge joins meet built neighbours. The old seven-hex
 * blend can drop an influencing hex at an ownership edge, producing metre-high
 * steps even over a millimetre. Correct both the handed base and the shares
 * used by this module within 36m of these joins; everything farther in keeps
 * its authored terrain. River centre profiles remain on their original ground.
 */
export const SOUTHWEST_SEAM = freeze({ core: 6, reach: 36, riverKeep: .25, riverFade: 1.5 });
// Keep the reviewed northern joins and add only the six measured western-edge pairs.
const WEST_EDGE_SEAM_PAIRS = new Set([
  ['Cape Heth', 'Dinelv Highlands'], ['Dinelv Highlands', 'North Meroshe Desert'],
  ['Dinelv Highlands', 'West Meroshe Desert'], ['Hama', 'West Meroshe Desert'],
  ['Hama', 'Central Meroshe Desert'], ['Hama', 'South Meroshe Desert'],
].map(pair => pair.sort().join('|')));
// The real controller reproduced 2.48 m and 1.09 m steps on these two
// internal Trogo edges. Keep all other forest terrain and scatter fields on
// their original blend; only the existing physical seam wrapper uses these.
export const TROGO_REVIEW_SEAMS = freeze([
  { id: 'north-link', q: -24, r: 137, edge: 2 },
  { id: 'south-gully', q: -28, r: 140, edge: 1 },
].map(spec => {
  const loop = hexAtlasCorners(spec.q, spec.r).map(p => TRANSFORM.atlasToWorld(p.x, p.y));
  const a = loop[spec.edge], b = loop[(spec.edge + 1) % 6], dx = b.x - a.x, dz = b.z - a.z;
  return freeze({ ...spec, a, b, dx, dz, length2: dx * dx + dz * dz, regions: freeze(['Trogo', 'Trogo']) });
}));
export function trogoReviewSeamWeight(x, z) {
  let distance = SOUTHWEST_SEAM.reach;
  for (const edge of TROGO_REVIEW_SEAMS) {
    const t = clamp(((x - edge.a.x) * edge.dx + (z - edge.a.z) * edge.dz) / edge.length2, 0, 1);
    distance = Math.min(distance, Math.hypot(x - edge.a.x - edge.dx * t, z - edge.a.z - edge.dz * t));
  }
  return 1 - smooth(SOUTHWEST_SEAM.core, SOUTHWEST_SEAM.reach, distance);
}
const SEAM_GRID = 64;
const SEAM_EDGES = (() => {
  const edges = [...TROGO_REVIEW_SEAMS], seen = new Set();
  for (const name of [...SOUTHWEST_NORTH_REGIONS, ...WEST_EDGE_REGIONS]) for (const loop of regionOutline(PLAYABLE_SURVEY, name))
    for (let i = 0; i < loop.length; i++) {
      const a = loop[i], b = loop[(i + 1) % loop.length], dx = b.x - a.x, dz = b.z - a.z;
      const length = Math.hypot(dx, dz), mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2;
      let nx = dz / length, nz = -dx / length;
      if (hexOwnerAt(mx + nx, mz + nz) === name) { nx = -nx; nz = -nz; }
      const other = hexOwnerAt(mx + nx, mz + nz);
      if (!REGION_CELLS[other] || other === name) continue;
      if (!SOUTHWEST_NORTH_REGIONS.includes(name) && !WEST_EDGE_SEAM_PAIRS.has([name, other].sort().join('|'))) continue;
      const key = [`${a.x.toFixed(5)},${a.z.toFixed(5)}`, `${b.x.toFixed(5)},${b.z.toFixed(5)}`].sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key); edges.push(freeze({ a, b, dx, dz, length2: length * length, regions: freeze([name, other]) }));
    }
  return freeze(edges);
})();
const SEAM_BUCKETS = (() => {
  const grid = new Map(), reach = SOUTHWEST_SEAM.reach;
  for (const edge of SEAM_EDGES)
    for (let i = Math.floor((Math.min(edge.a.x, edge.b.x) - reach) / SEAM_GRID); i <= Math.floor((Math.max(edge.a.x, edge.b.x) + reach) / SEAM_GRID); i++)
      for (let j = Math.floor((Math.min(edge.a.z, edge.b.z) - reach) / SEAM_GRID); j <= Math.floor((Math.max(edge.a.z, edge.b.z) + reach) / SEAM_GRID); j++) {
        const key = `${i},${j}`;
        if (!grid.has(key)) grid.set(key, []);
        grid.get(key).push(edge);
      }
  return grid;
})();
export function southwestSeamWeight(x, z) {
  const edges = SEAM_BUCKETS.get(`${Math.floor(x / SEAM_GRID)},${Math.floor(z / SEAM_GRID)}`);
  if (!edges) return 0;
  let distance = SOUTHWEST_SEAM.reach;
  for (const edge of edges) {
    const t = clamp(((x - edge.a.x) * edge.dx + (z - edge.a.z) * edge.dz) / edge.length2, 0, 1);
    distance = Math.min(distance, Math.hypot(x - edge.a.x - edge.dx * t, z - edge.a.z - edge.dz * t));
  }
  if (distance >= SOUTHWEST_SEAM.reach) return 0;
  const near = nearestSouthwestRiver(x, z, SOUTHWEST_SEAM.riverFade);
  const river = near ? smooth(SOUTHWEST_SEAM.riverKeep, SOUTHWEST_SEAM.riverFade, near.distance) : 1;
  return (1 - smooth(SOUTHWEST_SEAM.core, SOUTHWEST_SEAM.reach, distance)) * river;
}

/**
 * How much of a point is this block's own to shape, by the ground blend's own weights, at the
 * threshold Meneth's ridges, Nethereum's hollow, Gala's rise, the Oves's basin and the Mithala's
 * tilt all use.
 *
 * **It is the four countries together and never one of them**, for the reason the Mithala gives:
 * ask each name separately and the answer at an internal border is two halves that each fail the
 * threshold, and a landform gated on them would die out in a valley down the middle of the block
 * along every one of the forty-six internal edges.
 *
 * **There is no gate against a neighbour here, and that is worth saying.** The Mithala needed
 * `lotharnGate` because its low-threshold landforms reached into a built mountain range. Every
 * margin of this block is unbuilt `outland`: there is nobody to step on.
 */
export function southwestWeight(x, z, mix = null) {
  if (!inSouthwestBox(x, z)) return 0;
  const weights = (mix ?? terrainMix(x, z)).weights;
  let own = 0;
  for (const name of SOUTHWEST_REGIONS) own += weights[name] ?? 0;
  return own;
}
export const southwestShare = (x, z, mix = null) => smooth(.3, .8, southwestWeight(x, z, mix));
/**
 * The same weight at a much lower threshold, for the landforms that have to reach the water. Both
 * of this block's rivers are drawn **on a border with an unbuilt country** - the Vaellir on West
 * Pyros | East Pyros for all twenty of its edges, the Alezhor Water on Navarth | Alezhor and then
 * Ganesh Desert | Alezhor for all eight of its - so at the water's own edge the blend is a third
 * of this block and two thirds of `outland`, and a tilt or a swale gated at the ordinary threshold
 * would stop short of the river it belongs to. It is exactly the allowance the Sorten's bench makes
 * on the Oveth (`ovesWeights.sorten`) and the Mithala's banks make on the west arm.
 */
export const southwestBankShare = (x, z, mix = null) => smooth(.05, .30, southwestWeight(x, z, mix));

/** How much of a point is one named country's own, for the landforms that belong to one of them. */
export function regionShare(name, x, z, mix = null) {
  if (!inBox(SOUTHWEST_BOXES[name], x, z)) return 0;
  return smooth(.22, .70, (mix ?? terrainMix(x, z)).weights[name] ?? 0);
}

/**
 * The four Meroshe deserts together, for the two things that cross their internal seams: the fog off
 * the southern ocean, which does not stop at a hex edge, and the salt the wind carries off the pan.
 * Asking one country at a time would put a line down the middle of a seam, which is the reason
 * `southwestWeight` is the whole block and not one name.
 */
export const MEROSHE_BOX = boxOf(MEROSHE_REGIONS);
export function merosheShare(x, z, mix = null) {
  if (!inBox(MEROSHE_BOX, x, z)) return 0;
  const weights = (mix ?? terrainMix(x, z)).weights;
  let own = 0;
  for (const name of MEROSHE_REGIONS) own += weights[name] ?? 0;
  return smooth(.22, .70, own);
}

/** The three countries of the western edge together, for the tint and for the things that cross them. */
export const WEST_EDGE_BOX = boxOf(WEST_EDGE_REGIONS);
export function westEdgeShare(x, z, mix = null) {
  if (!inBox(WEST_EDGE_BOX, x, z)) return 0;
  const weights = (mix ?? terrainMix(x, z)).weights;
  let own = 0;
  for (const name of WEST_EDGE_REGIONS) own += weights[name] ?? 0;
  return smooth(.22, .70, own);
}

/** Marosh and Trogo together, for the tint and the one thing that crosses between them. */
export const EAST_EDGE_BOX = boxOf(EAST_EDGE_REGIONS);
export function eastEdgeShare(x, z, mix = null) {
  if (!inBox(EAST_EDGE_BOX, x, z)) return 0;
  const weights = (mix ?? terrainMix(x, z)).weights;
  let own = 0;
  for (const name of EAST_EDGE_REGIONS) own += weights[name] ?? 0;
  return smooth(.22, .70, own);
}

// ---------------------------------------------------------------------------
// The fall: two outlets, and a divide between them
// ---------------------------------------------------------------------------
/**
 * **The block tilts toward the Vaellir's mouth**, which is the outlet three of job 1's four
 * countries use: West Pyros down the river itself, the Ganesh Plain's eastern side over a low
 * divide, and Navarth's whole southern face. One plane over all of it, for the reason the Mithala
 * had one: a plane is continuous across every internal border, so none of the internal edges has a
 * step or a change of gradient in it.
 *
 * **Job 2 extended the plane rather than laying a second one**, and that is the whole of what the
 * four Meroshe deserts get for a fall. The plane's northing term takes the ground down 4.0 m at the
 * Ganesh Plain seam, 5.6 m at the middle of the sand sea and 8.7 m at the South Meroshe's own shore,
 * which is the fall a desert ninety-five hexes wide needs and no more; a second plane meeting this
 * one at the seam would put a change of gradient in the ten hex edges that seam is made of. The two
 * quarters whose outlet is *not* the way the plane falls get one of their own instead, which is
 * `ganeshBasin`'s rule: the Ganesh Desert to its gulf, and the West Meroshe to the western ocean
 * (`merosheFans`).
 *
 * It is small on purpose - five metres of easting over fourteen hundred and four of northing over
 * nine hundred and fifty, one in two hundred and eighty and one in two hundred and forty - because
 * the block's real shape is in its profile bases (Navarth's plateau at 36 against the Ganesh's 18)
 * and a tilt that competed with those would bury them.
 */
export const SOUTHWEST_TILT = freeze({ pivotX: -3230, pivotZ: 1370, perEast: 5 / 1400, perNorth: 4 / 950 });
export const southwestSlope = (x, z) => SOUTHWEST_TILT.perEast * (SOUTHWEST_TILT.pivotX - x)
  + SOUTHWEST_TILT.perNorth * (SOUTHWEST_TILT.pivotZ - z);

/**
 * **The Ganesh Desert's own fall, north-west to the gulf**, and the one landform in the block that
 * reverses the general tilt. It is a one-sided ramp rather than a plane: nought along the desert's
 * eastern side, where the Ganesh Plain's channels come in and the lore says the boundary is diffuse
 * and has no line in it, and its full drop at the shore. So there is no ridge anywhere - the two
 * drainages meet at a divide a traveler cannot see, which is what a watershed on ground this flat
 * is, and the Mithala's fen margin is the same trick for the same reason.
 *
 * The anchors are measured, not chosen: `to` is the last point of the Alezhor Water, which is where
 * the atlas's own river leaves this block, and `from` is the middle of the desert's eastern margin
 * against the Ganesh Plain.
 */
export const GANESH_BASIN = freeze({ from: point(-3230, 1600), to: point(-3718, 1194), drop: 13 });
export function ganeshBasin(x, z, own = 0) {
  if (own <= 0) return 0;
  const dx = GANESH_BASIN.to.x - GANESH_BASIN.from.x, dz = GANESH_BASIN.to.z - GANESH_BASIN.from.z;
  const length = Math.hypot(dx, dz);
  const along = ((x - GANESH_BASIN.from.x) * dx + (z - GANESH_BASIN.from.z) * dz) / (length * length);
  return -GANESH_BASIN.drop * smooth(0, 1, along) * own;
}

/**
 * **The Ganesh Plain's own fall, west-north-west into the desert.** "A series of shallow drainage
 * channels cross it, too diffuse to qualify as rivers, carrying water southward toward the Ganesh
 * Desert in wet years and lying dry in drought years." The atlas puts the desert west of the plain
 * rather than south of it, so the ground falls west and the lore is adjusted (docs/southwest-1-report.md);
 * everything else in that sentence is built exactly as written.
 *
 * Five metres over five hundred, pivoted on the middle of the plain, which puts the divide between
 * the two drainages about two hundred metres inland of the south-eastern corner - where the ground
 * turns over and the last of the plain falls to the sea instead.
 */
export const GANESH_PLAIN_FALL = freeze({ perMetre: 5 / 500, eastX: .966, eastZ: .261 });
export function ganeshPlainFall(x, z, own = 0) {
  if (own <= 0) return 0;
  const centre = SOUTHWEST_CENTRES['Ganesh Plain'];
  const along = (x - centre.x) * GANESH_PLAIN_FALL.eastX + (z - centre.z) * GANESH_PLAIN_FALL.eastZ;
  return along * GANESH_PLAIN_FALL.perMetre * own;
}

/**
 * **West Pyros falls south with its river.** Twelve metres over seven hundred and eighty, pivoted
 * on the middle of the country, so the Vaellir has a gradient of its own to run down instead of
 * being forced into one by `WEST_PROFILES`. Without it the river would stand level for seven
 * hundred metres and then drop fifteen in the last hundred and fifty, where the grassland hex at
 * the mouth and the coast field between them take the ground to the sea - which is a waterfall and
 * not a river mouth.
 */
export const PYROS_FALL = freeze({ perMetre: 12 / 780 });
export function pyrosFall(x, z, own = 0) {
  if (own <= 0) return 0;
  return (SOUTHWEST_CENTRES['West Pyros'].z - z) * PYROS_FALL.perMetre * own;
}

// ---------------------------------------------------------------------------
// Navarth: the swells on the plateau
// ---------------------------------------------------------------------------
/**
 * **The ten `hills` hexes the atlas gives Navarth, as broad worn crests.** The lore's whole account
 * of this country's ground is three phrases - "broad upland sweeps, exposed ridgelines, the
 * occasional sheltered hollow", on "a high, rolling tableland" - and that is what the atlas draws:
 * ten `hills` hexes scattered through eleven `plains` ones, not a range and not a rim, with open
 * ground between every pair of them.
 *
 * Each crest is a dome on its own hex centre, and they are taken as a **maximum and not a sum**,
 * which is `ovesRim`'s rule: two crests whose skirts overlap make one longer swell rather than a
 * hill twice as high. The heights vary by where the hex stands - the four along the western rim
 * above the Ganesh are the highest, because that is the side the ground has to fall from, and the
 * one at the north-eastern tip is the lowest, because it is the shoulder above the forest.
 *
 * Nobody has made anything of any of them. The lore's surrogate fires stand "in locations that
 * correspond to where fumaroles would be if the volcanic geology extended this far north", and a
 * maintained fire is a work and works are people, so there is not one.
 */
export const NAVARTH_CRESTS = freeze([
  freeze({ id: 'west-rim-north', x: -3550, z: 1155, lift: 14, radius: 108 }),
  freeze({ id: 'west-rim-mid', x: -3450, z: 1155, lift: 15, radius: 112 }),
  freeze({ id: 'west-rim-south', x: -3400, z: 1241, lift: 13, radius: 104 }),
  freeze({ id: 'west-rim-foot', x: -3350, z: 1328, lift: 11, radius: 98 }),
  freeze({ id: 'north-swell', x: -3350, z: 982, lift: 10, radius: 100 }),
  freeze({ id: 'middle-swell', x: -3300, z: 1068, lift: 11, radius: 102 }),
  freeze({ id: 'east-swell', x: -3200, z: 1241, lift: 10, radius: 98 }),
  freeze({ id: 'south-swell', x: -3250, z: 1328, lift: 11, radius: 100 }),
  freeze({ id: 'south-shoulder', x: -3200, z: 1415, lift: 9, radius: 94 }),
  freeze({ id: 'wood-shoulder', x: -3200, z: 895, lift: 6, radius: 88 }),
]);
export function navarthCrests(x, z, own = 0) {
  if (own <= 0) return 0;
  let best = 0;
  for (const crest of NAVARTH_CRESTS) {
    const d = Math.hypot(x - crest.x, z - crest.z);
    if (d >= crest.radius) continue;
    best = Math.max(best, crest.lift * (1 - smooth(0, 1, d / crest.radius)));
  }
  return best * own;
}

// ---------------------------------------------------------------------------
// The Ganesh Desert: what the wind leaves
// ---------------------------------------------------------------------------
/**
 * **"Wind is the defining physical force in the Ganesh."** The lore is explicit about what that
 * makes: "a surface shaped by wind and by the occasional floodwater that crosses it in the wetter
 * years, depositing a thin layer of fine sediment over the rocky substrate", with no canyon, no
 * escarpment and no deep carving anywhere; and "summer winds blow from the north and northwest, hot
 * and desiccating".
 *
 * So the desert's own roughness is **three quarters of a metre**, which is the lowest relief any
 * landform in the game has, laid on two turned bearings - one field on a single bearing reads as
 * corrugation, which is the Ascarth plateau's lesson - plus **a long grain on the summer wind's own
 * bearing**, a two-hundred-metre wave of half a metre running north-west to south-east. The grain
 * is the one thing a traveler crossing this country can navigate by, and it is the wind's.
 *
 * `ganeshLie` reads the field back on a nought-to-one scale: 1 where the ground is swept and the
 * sediment is gone, 0 in a pocket where it has gathered a hand deep. The scatter and the ground
 * tint are both read off it, the way the Oves's are off `ovesLie`.
 */
export const GANESH_WIND = freeze({ amp: .42, waveA: 47, waveB: 71, bearingA: -.62, bearingB: 1.05,
  grainAmp: .5, grainWave: 205, grainBearing: -.71 });
const turned = (x, z, bearing) => x * Math.cos(bearing) + z * Math.sin(bearing);
export function ganeshStone(x, z, own = 0) {
  if (own <= 0) return 0;
  const g = GANESH_WIND;
  const a = Math.sin(turned(x, z, g.bearingA) * 6.2831853 / g.waveA);
  const b = Math.sin(turned(x, z, g.bearingB) * 6.2831853 / g.waveB);
  const grain = Math.sin(turned(x, z, g.grainBearing) * 6.2831853 / g.grainWave);
  return (g.amp * (a * .6 + b * .4) + g.grainAmp * grain) * own;
}
/** 1 on a swept rise where the rock is at the surface, 0 in a pocket where the sediment has gathered. */
export function ganeshLie(x, z) {
  const own = regionShare('Ganesh Desert', x, z);
  if (own <= 0) return 0;
  const raw = ganeshStone(x, z, 1);
  return clamp((raw + GANESH_WIND.amp + GANESH_WIND.grainAmp) / (2 * (GANESH_WIND.amp + GANESH_WIND.grainAmp)), 0, 1);
}

/**
 * **The two washes, and there is nothing in either of them.** "Water in the Ganesh follows a simple
 * rule: almost none on the surface, some below it." What crosses this desert crosses it in the
 * wetter years, so what it leaves is a cut bed with a floor of coarse gravel and no water surface,
 * no ribbon, no reed, and a traveler walks down the middle of either as a road - which is the Oves
 * Desert's four dry channels, the same machinery for the same reason.
 *
 * Both carry on the Ganesh Plain's own shallow channels westward and fade out before the shore,
 * because a bed that only runs after rain does not keep a mouth open. The lower one holds **the
 * damp reach**: a hundred and twenty metres where the subsurface water is near enough the gravel to
 * keep something green in the bed, which is the lore's "some below it" and the only green in the
 * whole of the Ganesh. There is nothing to drink there and nothing has been built to reach it; the
 * waystations the lore puts at the water points are somebody's.
 */
const washLine = points => freeze(points.map(([x, z]) => point(x, z)));
export const GANESH_WASHES = freeze([
  freeze({ id: 'north-wash', name: 'The North Wash', cut: 1.35, half: 11, fade: 150,
    line: washLine([[-3240, 1487], [-3390, 1440], [-3520, 1400], [-3620, 1345], [-3670, 1300]]) }),
  freeze({ id: 'south-wash', name: 'The South Wash', cut: 1.15, half: 9, fade: 140,
    line: washLine([[-3215, 1655], [-3360, 1636], [-3500, 1594], [-3640, 1540], [-3760, 1472]]) }),
]);
export const GANESH_DAMP = freeze({ wash: 'south-wash', from: .40, to: .62 });

function lineWalk(line, x, z, limit) {
  let best = Infinity, along = 0, total = 0, seen = 0;
  for (let i = 1; i < line.length; i++) total += Math.hypot(line[i].x - line[i - 1].x, line[i].z - line[i - 1].z);
  let walked = 0;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i];
    const dx = b.x - a.x, dz = b.z - a.z, len2 = dx * dx + dz * dz;
    const t = len2 > 0 ? clamp(((x - a.x) * dx + (z - a.z) * dz) / len2, 0, 1) : 0;
    const d = Math.hypot(x - (a.x + dx * t), z - (a.z + dz * t));
    if (d < best) { best = d; along = (walked + t * Math.sqrt(len2)) / (total || 1); }
    walked += Math.sqrt(len2);
    seen++;
  }
  return best <= limit ? { distance: best, along, length: total } : null;
}
/** The wash a point is in, with how far along it and how far from its middle. */
export function nearestWash(x, z, margin = 0) {
  let best = null;
  for (const wash of GANESH_WASHES) {
    const found = lineWalk(wash.line, x, z, wash.half * 3 + margin);
    if (found && (!best || found.distance < best.distance)) best = { wash, ...found };
  }
  return best;
}
export function ganeshWashCut(x, z, own = 0) {
  if (own <= 0) return 0;
  const found = nearestWash(x, z);
  if (!found) return 0;
  const { wash, distance, along } = found;
  const across = 1 - smooth(wash.half, wash.half * 2.6, distance);
  const ends = smooth(0, .09, along) * (1 - smooth(1 - wash.fade / (found.length || 1), 1, along));
  return -wash.cut * across * ends * own;
}
/** True on a wash's own floor, where nothing grows and nothing is scattered. */
export function onWashFloor(x, z, margin = 0) {
  const found = nearestWash(x, z, margin);
  if (!found) return false;
  const ends = smooth(0, .09, found.along) * (1 - smooth(1 - found.wash.fade / (found.length || 1), 1, found.along));
  return ends > .35 && found.distance < found.wash.half + margin;
}
/** How damp a point on the south wash's floor is: 1 in the middle of the damp reach, 0 outside it. */
export function ganeshDamp(x, z) {
  const found = nearestWash(x, z);
  if (!found || found.wash.id !== GANESH_DAMP.wash) return 0;
  const inReach = smooth(GANESH_DAMP.from - .05, GANESH_DAMP.from + .03, found.along)
    * (1 - smooth(GANESH_DAMP.to - .03, GANESH_DAMP.to + .05, found.along));
  return inReach * (1 - smooth(found.wash.half, found.wash.half * 2.2, found.distance));
}

// ---------------------------------------------------------------------------
// The Ganesh Plain: the channels, and the depressions that are the whole of it
// ---------------------------------------------------------------------------
/**
 * **"These channels and their associated depressions are the terrain's most ecologically
 * significant features."** The lore gives the Ganesh Plain one landform and it is this: shallow
 * drainage channels "too diffuse to qualify as rivers", running toward the Ganesh, with closed
 * hollows strung along them where "water concentrates in the depressions, plants do better there,
 * livestock do better there, and the routes across the plain follow the depressions' alignment
 * because they are the corridors where grass persists longest".
 *
 * So: three channels, a metre of cut and nine metres across, with no water surface anywhere in any
 * of them - this is the dry-year face and in a dry year they are dry - **two of them running west
 * into the Ganesh and the third east to the sea**, which is the divide the plain sits on, and eight
 * depressions on their lines, a metre or so below the plain and a hundred and twenty to two hundred metres across,
 * which are where the grass is. `inDepression` is what the scatter and the ground tint read, and
 * the wildlife is placed on them, because on this plain a depression is the only thing that decides
 * where anything can be.
 */
export const GANESH_PLAIN_CHANNELS = freeze([
  freeze({ id: 'upper-channel', name: 'The Upper Channel', cut: .95, half: 9,
    line: washLine([[-2790, 1556], [-2900, 1543], [-3040, 1516], [-3110, 1524]]) }),
  freeze({ id: 'middle-channel', name: 'The Middle Channel', cut: 1.05, half: 10,
    line: washLine([[-2690, 1726], [-2850, 1700], [-3010, 1660], [-3160, 1628], [-3190, 1622]]) }),
  // **The third one runs the other way, and that is the divide made visible.** Two channels carry
  // the plain's water west into the Ganesh; this one leaves the same low rise and runs east-south-east
  // to the sea at the green corner, four hundred metres away. It is not a decision: measured on the
  // built ground, the plain's southern rows do not fall west at all - they rise again toward the
  // Dinelv Highlands margin - and the only way off them is the way this one goes. "West of it every
  // drop goes to the Ganesh and is gone; east of it the ground falls a few hundred paces to the sea."
  freeze({ id: 'sea-channel', name: 'The Sea Channel', cut: .9, half: 8,
    line: washLine([[-2800, 1810], [-2730, 1795], [-2670, 1780], [-2630, 1766]]) }),
]);
export const GANESH_DEPRESSIONS = freeze([
  freeze({ id: 'upper-pan', x: -2880, z: 1548, depth: 1.05, radius: 88 }),
  freeze({ id: 'north-pan', x: -3080, z: 1514, depth: .95, radius: 78 }),
  freeze({ id: 'middle-pan', x: -2830, z: 1704, depth: 1.25, radius: 104 }),
  freeze({ id: 'long-pan', x: -3030, z: 1657, depth: 1.15, radius: 96 }),
  freeze({ id: 'west-pan', x: -3170, z: 1626, depth: .9, radius: 74 }),
  freeze({ id: 'lower-pan', x: -2880, z: 1826, depth: 1.1, radius: 92 }),
  freeze({ id: 'south-pan', x: -3050, z: 1792, depth: 1, radius: 82 }),
  freeze({ id: 'corner-pan', x: -2720, z: 1846, depth: .85, radius: 70 }),
]);
export function ganeshPlainChannelCut(x, z, own = 0) {
  if (own <= 0) return 0;
  let cut = 0;
  for (const channel of GANESH_PLAIN_CHANNELS) {
    const found = lineWalk(channel.line, x, z, channel.half * 3);
    if (!found) continue;
    const across = 1 - smooth(channel.half, channel.half * 2.8, found.distance);
    const ends = smooth(0, .06, found.along) * (1 - smooth(.94, 1, found.along));
    cut = Math.max(cut, channel.cut * across * ends);
  }
  return -cut * own;
}
export function ganeshDepressionCut(x, z, own = 0) {
  if (own <= 0) return 0;
  let cut = 0;
  for (const pan of GANESH_DEPRESSIONS) {
    const d = Math.hypot(x - pan.x, z - pan.z);
    if (d >= pan.radius) continue;
    cut = Math.max(cut, pan.depth * (1 - smooth(0, 1, d / pan.radius)));
  }
  return -cut * own;
}
/** 1 in the middle of a depression, 0 on the open plain between them. */
export function inDepression(x, z) {
  let best = 0;
  for (const pan of GANESH_DEPRESSIONS) {
    const d = Math.hypot(x - pan.x, z - pan.z);
    if (d >= pan.radius) continue;
    best = Math.max(best, 1 - smooth(0, 1, d / pan.radius));
  }
  return best;
}
/** True on a Ganesh Plain channel's own floor. */
export function onChannelFloor(x, z, margin = 0) {
  for (const channel of GANESH_PLAIN_CHANNELS) {
    const found = lineWalk(channel.line, x, z, channel.half + margin);
    if (!found) continue;
    const ends = smooth(0, .06, found.along) * (1 - smooth(.94, 1, found.along));
    if (ends > .4) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// The Meroshe: four surfaces, because the atlas gives four countries one word
// ---------------------------------------------------------------------------
/**
 * **Ninety-five hexes, `plains` on every one and `BWh` on every one.** No relief, no variety, no
 * water, no gradient: the largest single-character expanse the atlas draws anywhere. That is not a
 * licence to invent mountains, and it is not a reason to draw the Ganesh Desert four more times
 * either. It is the country's subject, and the answer to it is underfoot.
 *
 * **A hot desert is not one surface, it is four, and the game had drawn none of them at scale.**
 * `moroshe_desert.md` says so itself, in the one paragraph it spends on geography: the Moroshe
 * "ranges from the rocky hammada of the northern transition zone - flat gravel plains and exposed
 * bedrock where scrubby thorn trees still manage to exist - through the great sand seas of the
 * central interior, to the canyon country of the south". Three named surfaces in one sentence, in
 * the order the atlas names the quarters, and the fourth - the salt pan at the foot of a fan skirt -
 * is what the atlas adds by putting an ocean on the west.
 *
 * So:
 *
 *  - **North Meroshe is hamada**, bare rock: a stone floor with the hard beds standing out of it in
 *    low steps (`MEROSHE_BENCHES`), and the only trees in ninety-five hexes growing in their joints.
 *    It is the highest of the four and the transition from the Ganesh Plain's clay.
 *  - **West Meroshe is a fan skirt and a salt pan** (`merosheSkirt`, `MEROSHE_FANS`,
 *    `MEROSHE_SALT`): three coalesced gravel fans spread off the Dinelv escarpment to an ocean,
 *    sorting finer as they go, with the salt where the last of the water stops.
 *  - **Central Meroshe is erg** (`MEROSHE_SINK`, `MEROSHE_DUNES`): the first sand sea in the game,
 *    linear ridges on the summer wind's bearing with dead-flat corridors between them, in a shallow
 *    closed sink that is why the sand is there.
 *  - **South Meroshe is reg** (`merosheFog`, `merosheVarnish`): a pavement of close-packed varnished
 *    pebbles, under the fog that comes off the southern ocean where Trogo's rainforest begins.
 *
 * **Four surfaces, four sight-lines, four edges.** What tells a traveler which quarter they are in
 * is what the ground is made of, how far they can see across it, and which single thing stands on
 * its horizon: the Ganesh Plain and Marosh's green hills from the North, the Dinelv escarpment and
 * the sea from the West, **nothing whatever** from inside the Central, and Trogo's forest wall and
 * the southern ocean from the South.
 */

/**
 * **North Meroshe: the benches.** "Flat gravel plains and exposed bedrock", and what exposed bedrock
 * does on a desert floor is stand up in steps where a harder bed outcrops - a metre or two of riser,
 * a long back slope, and then the next one. `dinelv_highlands.md` gives the strike: "a series of
 * ridge systems crosses it from roughly north to south, aligned with the peninsula's long axis", so
 * these run **north and south**, which is the one navigational fact this country has. The sand sea
 * next door runs north-west to south-east on the wind's bearing, so a traveler always knows which of
 * the two they are standing on by which way the lines go.
 *
 * Each bench is a straight line with an asymmetric profile across it: the riser over sixteen metres
 * on the **west** side, because the beds dip away from the highland, and then the back slope decaying
 * over a hundred and ten. They are taken as a **maximum and not a sum** (`ovesRim`'s rule), so nine
 * benches ninety metres apart make a stepped floor and not a staircase nine risers high: the whole
 * field is between nought and two metres, which is a little more than the Ganesh's wind field and a
 * great deal less than a landform.
 */
const bench = (id, name, x, z, length, rise) => freeze({ id, name, x, z, length, rise, run: 8, fade: 110, cap: 40 });
export const MEROSHE_BENCHES = freeze([
  bench('bench-corner', 'The Corner Step', -3290, 2310, 150, 1.4),
  bench('bench-west', 'The West Step', -3200, 2300, 300, 1.7),
  bench('bench-mid-west', 'The Long Step', -3110, 2215, 300, 2.0),
  bench('bench-mid', 'The Middle Step', -3020, 2210, 295, 1.6),
  bench('bench-short-south', 'The Short Step', -3060, 2130, 120, 1.2),
  bench('bench-mid-east', 'The Broken Step', -2930, 2210, 290, 1.8),
  bench('bench-marosh', 'The Marosh Step', -2830, 2210, 290, 1.5),
  bench('bench-step-north', 'The North Step', -2880, 1990, 90, 1.1),
  bench('bench-east', 'The East Step', -2740, 2040, 130, 1.3),
]);
/** How high the rock stands at a point, and how near a riser it is: the scatter reads both. */
export function merosheBench(x, z) {
  let lift = 0, edge = 0;
  for (const b of MEROSHE_BENCHES) {
    const along = b.z - z;                                   // the line runs north from (x, z)
    if (along < -b.cap || along > b.length + b.cap) continue;
    const ends = smooth(-b.cap, b.cap * .35, along) * (1 - smooth(b.length - b.cap * .35, b.length + b.cap, along));
    if (ends <= 0) continue;
    const s = b.x - x;                                       // positive west: the up-dip side
    if (s < -b.run || s > b.run + b.fade) continue;
    const face = smooth(-b.run, b.run, s);
    const here = b.rise * face * (1 - smooth(b.run, b.run + b.fade, s)) * ends;
    if (here > lift) lift = here;
    edge = Math.max(edge, ends * (1 - smooth(0, b.run * 2.2, Math.abs(s))));
  }
  return { lift, edge };
}
export function merosheBenches(x, z, own = 0) {
  if (own <= 0) return 0;
  return merosheBench(x, z).lift * own;
}

/**
 * **West Meroshe: the skirt.** The atlas puts an ocean on this country's west and the Dinelv
 * Highlands on its north-east, and `dinelv_highlands.md` says what is between them: the plateau
 * "extends twenty to forty miles inland before the terrain descends again toward the Meroshe
 * interior". So the ground falls west-south-west from the highland's foot to the sea, seven metres
 * over four hundred and thirty, and it is a **one-sided ramp and not a plane** - nought along the
 * margin against the sand sea, its full drop at the shore - for `ganeshBasin`'s reason: a ramp
 * leaves no ridge anywhere, and on ground this flat a watershed is something a traveler walks over
 * without seeing it.
 *
 * Without it the shore came out at eleven and a half metres with the coast field having forty metres
 * to take it to the water, which is a bluff and not a desert shore. It is the same measurement job 1
 * made at the Ganesh's gulf and the same answer.
 *
 * **And it lets go at the shore**, which is the swale's own rule and was found the same way: the
 * coast field has already blended the last forty metres down to the beach by the time
 * `southwestGround` sees the ground, so a seven-metre drop laid on top of that put the ground at the
 * West Meroshe's own westernmost hex centres **four metres under the sea**. So the ramp holds its
 * full drop to thirty-four metres inland and releases over the last six, which leaves a shore that
 * runs 0 at the water, 1.7 m six metres in, 2.6 at twenty and 4.5 at forty: a gravel beach on a
 * desert, which is what the atlas draws.
 */
export const MEROSHE_SKIRT = freeze({ from: point(-3380, 2400), to: point(-3810, 2500), drop: 7, shoreFrom: 6, shoreTo: 34 });
export function merosheSkirt(x, z, own = 0) {
  if (own <= 0) return 0;
  const dx = MEROSHE_SKIRT.to.x - MEROSHE_SKIRT.from.x, dz = MEROSHE_SKIRT.to.z - MEROSHE_SKIRT.from.z;
  const length2 = dx * dx + dz * dz;
  const along = ((x - MEROSHE_SKIRT.from.x) * dx + (z - MEROSHE_SKIRT.from.z) * dz) / length2;
  const shore = smooth(MEROSHE_SKIRT.shoreFrom, MEROSHE_SKIRT.shoreTo, landDistance(x, z));
  return -MEROSHE_SKIRT.drop * smooth(0, 1, along) * shore * own;
}

/**
 * **The three fans that make the skirt a bajada and not a plane.** An alluvial fan is what a desert
 * does with the water that comes down an escarpment twice in a decade: a cone of gravel spreading
 * out of one mouth, coarsest at the apex and sorting finer the further from it, and where several of
 * them overlap the result is a bajada. So: three apexes on the Dinelv margin, each spreading
 * south-west through a sector, and taken as a **maximum and not a sum**, because two fans that
 * overlap make one longer apron rather than a cone twice as high.
 *
 * They are small on purpose - four metres and a bit at the apex against the skirt's seven - because
 * the atlas says `plains` and a fan five metres high on a slope of one in sixty is the most a
 * traveler would call a swell. What they are for is the **grain size**, which is the whole of how
 * this country reads: `merosheFan` comes back 1 at an apex and 0 at the toe, and the scatter puts
 * cobbles at one end and dust at the other.
 */
const fan = (id, name, x, z, bearingX, bearingZ, reach, lift) => freeze({ id, name, x, z, bearingX, bearingZ, reach, lift });
export const MEROSHE_FANS = freeze([
  fan('north-fan', 'The North Fan', -3720, 2345, -.38, .92, 290, 4.2),
  fan('middle-fan', 'The Middle Fan', -3590, 2345, -.71, .71, 330, 5.0),
  fan('east-fan', 'The East Fan', -3450, 2270, -.64, .77, 340, 4.6),
]);
/** 1 at a fan's apex where the gravel is coarsest, 0 at its toe where it is dust. */
export function merosheFan(x, z) {
  let best = 0;
  for (const f of MEROSHE_FANS) {
    const dx = x - f.x, dz = z - f.z, d = Math.hypot(dx, dz);
    if (d >= f.reach) continue;
    const forward = d > 0 ? (dx * f.bearingX + dz * f.bearingZ) / d : 1;
    if (forward <= .1) continue;                             // behind the apex: not on the fan
    const sector = smooth(.1, .55, forward);
    best = Math.max(best, (1 - smooth(0, 1, d / f.reach)) * sector);
  }
  return best;
}
export function merosheFans(x, z, own = 0) {
  if (own <= 0) return 0;
  let best = 0;
  for (const f of MEROSHE_FANS) {
    const dx = x - f.x, dz = z - f.z, d = Math.hypot(dx, dz);
    if (d >= f.reach) continue;
    const forward = d > 0 ? (dx * f.bearingX + dz * f.bearingZ) / d : 1;
    if (forward <= .1) continue;
    best = Math.max(best, f.lift * (1 - smooth(0, 1, d / f.reach)) ** 1.4 * smooth(.1, .55, forward));
  }
  return best * own;
}

/**
 * **The Malhat: the salt, and the only water in ninety-five hexes that can be seen.** Where a
 * desert's internal drainage stops near sea level what it leaves is a sabkha - a pan floored with
 * salt, dead flat because standing water levels everything it lies in, hard enough to ring underfoot
 * in the dry months and rotten under a crust in the others. It is not a watercourse and there is no
 * water surface on it; what is drawn is the crust. The name is the tongue's own word for salt
 * (`maroshi.roots.salt` = *malhat*, `src/gameplay/skills/languages.js`), taken rather than coined, exactly as job 1
 * took *vaellir* for the river.
 *
 * **It is a levelled floor and not a bowl**, which is why it is applied as a `lerp` toward a plane
 * in `southwestGround` rather than added as a cut: a playa is flat to the centimetre over hundreds
 * of metres, and a smooth depression of the same depth would read as a hollow in a field and not as
 * the thing that makes a traveler stop walking and look at their feet. The floor's own level is
 * measured rather than typed - the designed surface at the pan's own centre, less the depth.
 */
export const MEROSHE_SALT = freeze({ id: 'malhat', name: 'The Malhat', x: -3500, z: 2560, radiusX: 150, radiusZ: 105, depth: 1.1, rim: .28 });
/** 1 on the pan's own flat floor, 0 off it, feathered over the rim. */
export function onSaltPan(x, z, margin = 0) {
  const p = MEROSHE_SALT;
  const r = Math.hypot((x - p.x) / (p.radiusX + margin), (z - p.z) / (p.radiusZ + margin));
  return 1 - smooth(1 - p.rim, 1, r);
}
let saltLevel = null;
export function saltPanLevel() {
  if (saltLevel === null) {
    const p = MEROSHE_SALT, mix = terrainMix(p.x, p.z);
    saltLevel = mix.base + southwestSlope(p.x, p.z) + merosheSkirt(p.x, p.z, 1) - p.depth;
  }
  return saltLevel;
}

/**
 * **Central Meroshe: the sink, and the sand sea that sits in it.** An erg is not sand blown onto a
 * plain, it is sand that had nowhere left to go: a shallow closed basin with no outlet, which is what
 * the atlas draws by putting this country's thirty-one hexes between a hamada on the north, a
 * highland skirt on the west, a stone floor on the south and Marosh's hills on the east, and giving
 * it no river edge at all. So the sink first - three and a half metres over six hundred, no rim, the
 * lowest ground in the Meroshe - and the dunes on top of it.
 */
export const MEROSHE_SINK = freeze({ x: -2980, z: 2480, radiusX: 340, radiusZ: 255, depth: 3.5 });
const sinkRadius = (x, z) => Math.hypot((x - MEROSHE_SINK.x) / MEROSHE_SINK.radiusX, (z - MEROSHE_SINK.z) / MEROSHE_SINK.radiusZ);
export function merosheSink(x, z, own = 0) {
  if (own <= 0) return 0;
  const r = sinkRadius(x, z);
  if (r >= 1) return 0;
  return -MEROSHE_SINK.depth * (1 - smooth(0, 1, r)) * own;
}

/**
 * **The sand sea.** "The central sand seas are genuinely extreme... Navigating the sand seas without
 * local knowledge is considered one of the more reliable methods of dying on Azhora." What makes
 * them that is not the height of a dune, it is that **you cannot go straight**: linear dunes run in
 * parallel ridges for miles, and the only fast ground is the corridor between two of them, which
 * goes where the ridges go and not where the traveler wants to.
 *
 * So: ridges on **the summer wind's own bearing**, which is job 1's - `GANESH_WIND.grainBearing`,
 * -0.71 radians, from the north-west, because it is the same wind seven hundred metres of desert
 * apart - a wavelength of **a hundred and forty metres** and **six metres** crest to floor. The
 * cross-section is deliberately asymmetric and deliberately mostly floor: **forty-eight per cent of
 * every wavelength is dead-flat corridor**, sixty-seven metres of it, then fifty-nine metres of
 * gentle windward rise at about six degrees, then a lee face of fourteen metres at twenty-three.
 *
 * **The wavelength is a measurement and was wrong once.** Real linear dunes are fifty metres high and
 * a mile and a half apart, one in thirty; at two hundred and thirty metres, which is what that ratio
 * first gave, the hillshade came back with **two ridges in the whole country** - correct arithmetic
 * and not a sand sea. A country six hundred metres across has to fit enough of them to be a field, so
 * the spacing came down to a hundred and forty (still one in twenty-three, still a real erg's ratio)
 * and the field now crosses four to five ridges over its long axis and three over its short one.
 *
 * **The field has an edge**, because an erg does: it is full inside about four fifths of the sink and
 * gone a little past its rim, so the outer corners of this country are sheet sand with low ridges in
 * them - which is where a traveler stands to look at the thing, and the only place in it with a
 * horizon.
 */
export const MEROSHE_DUNES = freeze({ wave: 140, height: 6, bearing: GANESH_WIND.grainBearing,
  floor: .48, crest: .90, inner: .78, outer: 1.10 });
/** How much of a point is inside the dune field proper: 1 in the sand sea, 0 on the sheet sand. */
export function merosheErg(x, z, own = 0) {
  if (own <= 0) return 0;
  return own * (1 - smooth(MEROSHE_DUNES.inner, MEROSHE_DUNES.outer, sinkRadius(x, z)));
}
/** The dune's own profile at a point, 0 on a corridor floor and 1 on a crest. */
export function duneProfile(x, z) {
  const d = MEROSHE_DUNES;
  const u = turned(x, z, d.bearing) / d.wave;
  const t = u - Math.floor(u);
  if (t < d.floor) return 0;
  if (t < d.crest) return ((t - d.floor) / (d.crest - d.floor)) ** 1.35;
  return 1 - smooth(d.crest, 1, t);
}
export function merosheDunes(x, z, erg = 0) {
  if (erg <= 0) return 0;
  return MEROSHE_DUNES.height * duneProfile(x, z) * erg;
}
/** 1 on a flat interdune corridor a traveler can walk fast on, 0 on a dune. */
export function merosheCorridor(x, z) {
  const own = regionShare('Central Meroshe Desert', x, z);
  if (own <= 0) return 0;
  return 1 - duneProfile(x, z) * merosheErg(x, z, own);
}

/**
 * **South Meroshe: the fog, which is the one thing in this quarter that is not dry.** `trogo.md` is
 * explicit and it is the best single sentence in the lore for this job: "Where desert air meets
 * ocean-loaded humidity along the southeastern ridge, fog forms and stays, sometimes for days. This
 * is not the cold sea-fog of Bouén's coast. It is warm and thick and close, and it waters the middle
 * elevation forest through the dry months when the rainfall alone would not be enough."
 *
 * The atlas says `BWh` on every hex of this country, so it does not rain here; the fog is how the
 * surface gets wet without it. Two fronts - one off the southern ocean, one off the Trogo margin to
 * the east - taken as a maximum, so the south-eastern corner is fog and the north-western one, against
 * Hama and the sand sea, is not. The game has no weather, so what is drawn is what the fog leaves:
 * a crust on the pavement, a varnish on the stone, and the only thorn scrub in the Meroshe that
 * stands closer together than a man can walk between. The **sky** reads it too - this is the one
 * desert country in Azhora with thicker air rather than thinner (`REGION_TEXT`).
 */
export const MEROSHE_FOG = freeze({ seaFrom: 2760, seaTo: 3080, landFrom: -2900, landTo: -2560 });
export function merosheFog(x, z, mix = null) {
  const own = merosheShare(x, z, mix);
  if (own <= 0) return 0;
  const f = MEROSHE_FOG;
  const sea = smooth(f.seaFrom, f.seaTo, z);
  const land = smooth(f.landFrom, f.landTo, x);
  return Math.max(sea, land) * own;
}
/**
 * How dark the pavement is: desert varnish is a film of manganese and iron that takes millennia to
 * form and only forms where the surface does not move, so a reg is the darkest ground in a desert and
 * the fog belt is the darkest part of it. 0 is pale gravel, 1 is stone so dark a footprint in it
 * shows from a hundred paces.
 */
export function merosheVarnish(x, z, mix = null) {
  const own = regionShare('South Meroshe Desert', x, z, mix);
  if (own <= 0) return 0;
  return own * (.34 + .66 * merosheFog(x, z, mix));
}

// ---------------------------------------------------------------------------
// Cape Heth: one low ridge decides everything on it
// ---------------------------------------------------------------------------
/**
 * **The cape the lore is careful to say is not dramatic.** "It is not a dramatic geographical feature
 * in the mode of high cliff headlands or bold rocky outcrops; it is a low, extended point of land that
 * juts far enough west to matter as a navigational landmark" - and the atlas agrees, `plains` on
 * eighteen of nineteen hexes and nothing that could carry a cliff. So this country gets **one landform
 * and two consequences of it**, and both are the lore's own sentences.
 *
 * The landform is **the spine**: "buildings in the lee of the cape's slight ridge". It runs the length
 * of the cape, east and a little south from the point, and it is *slight* - six metres at its highest
 * and nothing at either end - because six metres is what a low sedimentary point has. What it does is
 * split the cape in two, which is the whole of the lore's geography here:
 *
 *  - **"The cape's western face is the maritime face - the side that ships at sea see, the side that
 *    weather hits first."** The seaward third and the ridge's own south-west flank are swept: bare
 *    grey-brown sandstone, gravel, salt, and lichen, and nothing that roots. The lore measures storms
 *    on this cape by how far up it the salt water got.
 *  - **"The eastern, landward side of the cape is more sheltered... gardens on the soil that has
 *    accumulated in the drainage hollows."** So the lee flank carries `HETH_HOLLOWS`, five shallow
 *    closed hollows a metre or two deep, which hold every scrap of soil the cape has. There are no
 *    gardens in them: a garden is a work.
 *
 * The cross-section is asymmetric on purpose - the fall is short and steep on the weather side and long
 * and slack on the lee - because that is what a ridge with a prevailing wind on one side of it becomes,
 * and it is the only reason the lee is a lee.
 */
export const HETH_SPINE = freeze({
  from: point(-4215, 1845), to: point(-3810, 1892), lift: 6,
  weather: 62,          // the short steep fall on the south-western side
  lee: 128,             // the long slack fall on the north-eastern side
  head: .10, tail: .74, // nothing at the point, and gone before the escarpment foot takes over
});
const hethAxis = (() => {
  const dx = HETH_SPINE.to.x - HETH_SPINE.from.x, dz = HETH_SPINE.to.z - HETH_SPINE.from.z;
  const length = Math.hypot(dx, dz);
  return freeze({ ax: dx / length, az: dz / length, nx: -dz / length, nz: dx / length, length });
})();
/** How far along the cape a point is (0 at the point, 1 at the landward end) and how far off the spine. */
export function hethSpineAt(x, z) {
  const dx = x - HETH_SPINE.from.x, dz = z - HETH_SPINE.from.z;
  const along = (dx * hethAxis.ax + dz * hethAxis.az) / hethAxis.length;
  const across = dx * hethAxis.nx + dz * hethAxis.nz;   // positive on the north-eastern, lee side
  return { along, across };
}
export function hethSpine(x, z, own = 0) {
  if (own <= 0) return 0;
  const { along, across } = hethSpineAt(x, z);
  const ends = smooth(-.04, HETH_SPINE.head, along) * (1 - smooth(HETH_SPINE.tail, 1.04, along));
  if (ends <= 0) return 0;
  const reach = across >= 0 ? HETH_SPINE.lee : HETH_SPINE.weather;
  return HETH_SPINE.lift * ends * (1 - smooth(0, reach, Math.abs(across))) * own;
}
/**
 * **The drainage hollows on the lee flank**, which are the only ground on this cape with soil in it -
 * "gardens on the soil that has accumulated in the drainage hollows". Shallow, closed and small; a
 * metre and a half is as much as a cape six metres high can cut.
 */
export const HETH_HOLLOWS = freeze([
  // The seaward-most hollow, and it is as far out as a hollow can be and still be in the lee: at
  // (-4145,1895) the spray field reads 0.91 and nothing roots at all, which is the weather face and not
  // a hollow. Measured, this is where it drops under two thirds.
  freeze({ id: 'point-hollow', x: -4104, z: 1912, depth: 1.3, radius: 44 }),
  freeze({ id: 'west-hollow', x: -4060, z: 1918, depth: 1.8, radius: 56 }),
  freeze({ id: 'mid-hollow', x: -3975, z: 1930, depth: 1.6, radius: 52 }),
  freeze({ id: 'north-hollow', x: -4020, z: 1798, depth: 1.4, radius: 46 }),
  freeze({ id: 'lee-hollow', x: -3890, z: 1936, depth: 1.5, radius: 50 }),
]);
/** 1 in the middle of a hollow, 0 on the open cape: what the scatter and the tint read for soil. */
export function inHethHollow(x, z) {
  let best = 0;
  for (const hollow of HETH_HOLLOWS) {
    const d = Math.hypot(x - hollow.x, z - hollow.z);
    if (d >= hollow.radius) continue;
    best = Math.max(best, 1 - smooth(0, 1, d / hollow.radius));
  }
  return best;
}
export function hethHollows(x, z, own = 0) {
  if (own <= 0) return 0;
  let cut = 0;
  for (const hollow of HETH_HOLLOWS) {
    const d = Math.hypot(x - hollow.x, z - hollow.z);
    if (d >= hollow.radius) continue;
    cut = Math.max(cut, hollow.depth * (1 - smooth(0, 1, d / hollow.radius)));
  }
  return -cut * own;
}
/**
 * **How hard the sea gets at a point**: 1 on the weather face - the seaward third of the cape and the
 * ridge's south-western flank, near the water - and 0 in the lee hollows at the landward end. It is
 * read off two things the lore puts together, the westerly exposure and the distance from the surf, and
 * the scatter, the tint and the wildlife all sort by it. Nothing roots where this is above about .7.
 */
export function hethSpray(x, z) {
  const own = regionShare('Cape Heth', x, z);
  if (own <= 0) return 0;
  const { along, across } = hethSpineAt(x, z);
  const seaward = 1 - smooth(.06, .70, along);            // the point end takes it worst
  const face = across >= 0 ? 1 - smooth(0, 90, across) : 1;
  const near = 1 - smooth(8, 86, landDistance(x, z));
  return clamp(near * (.30 + .70 * Math.max(seaward, face * .72)), 0, 1) * own;
}

// ---------------------------------------------------------------------------
// The Dinelv Highlands: the first desert highland, and the bedding is the point
// ---------------------------------------------------------------------------
/**
 * **Thirty-five hexes of hot desert standing eighty metres over everything round them.** The game has
 * built humid mountains (both Lotharns, both Ascarth hills, Feradom's barrier) and flat desert (the
 * Ganesh, the four Meroshe quarters) and has never built the two together. The lore's account is
 * short and every sentence of it is a landform:
 *
 *  1. "rises sharply from the coastal strip through **a series of stepped escarpments**";
 *  2. "**exposed sedimentary rock cut by seasonal water channels**, with the older geological layers
 *     visible in the cliff faces as **horizontal bands** of different character. The lower bands are
 *     the warm-toned desert stone that the Dinelv construction trade prizes; the upper bands shift to a
 *     harder, darker stone";
 *  3. "the plateau opens into **a rolling upland** that extends twenty to forty miles inland";
 *  4. "**a series of ridge systems crosses it from roughly north to south**, aligned with the
 *     peninsula's long axis. These ridges create **the passes**";
 *  5. "the thin soils and rocky substrate do not retain what moisture falls... **deeper-rooted plants
 *     occupying the water-concentration points**".
 *
 * So: `DINELV_BANDS` is the bedding, `DINELV_RIDGES` the ridge systems with their gaps,
 * `DINELV_MESAS` the three `mountain` hexes, `DINELV_BASINS` the six `plains` hexes as the
 * water-concentration points, `DINELV_CHANNELS` the seasonal channels down the face, and
 * `DINELV_ASCENT` the one graded way up. Everything the lore is actually *about* - the city below, the
 * plateau road, the garrisons at the passes, their cisterns, the quarries, the Plateau Watch, the
 * pastoral communities and their herds - belongs to somebody and none of it is built.
 *
 * **The escarpment is not authored at all**, and that is worth saying: `hills` at base 96 against the
 * Ganesh Desert's 20, Cape Heth's 13 and the West Meroshe's 14 makes the hex blend do the whole of it,
 * which is the West Lotharn's rule - "that fall belongs to the hex blend and is measured rather than
 * being hidden by a lower base, because a mountain front is what the atlas draws here". What is authored
 * is what the face is *made of*: the bands, the channels and the one way up.
 */

/**
 * **The bedding, and it is a function of height and nothing else.** A sedimentary bed is horizontal, so
 * a term that depends only on `h` is horizontal by construction: it needs no bearing, no line and no
 * anchor, it cannot be laid crooked, and it draws a stack of benches and risers up every steep face in
 * the country while leaving flat ground nothing but a smooth offset. That is the whole trick and it is
 * the cheapest landform in the block.
 *
 * `h + A sin(2 pi h / period)` is monotone in `h` as long as `A < period / 2 pi`, so the surface stays
 * single-valued and nothing overhangs: at period 16 and amplitude 1.9 the slope is multiplied by
 * between 0.25 and 1.75 (the first pass ran at 15 and 1.1 and the courses did not show on the mesa
 * flanks at all in the review render), which turns an even fall into treads a traveler can stand on and risers they
 * cannot, without changing the total fall by a centimetre. On the plateau itself, where the ground
 * wanders three metres over three hundred, it adds a set of low contour-parallel benches, which is what
 * a stripped bedded surface in a desert actually looks like.
 *
 * The tint reads the same term (`SOUTHWEST_GROUND.warmStone` low, `hardStone` high), because the lore
 * says the bands differ in character as well as in height and names both stones.
 */
export const DINELV_BANDS = freeze({ period: 16, amp: 1.9, from: 8, to: 205, feather: 11 });
export function dinelvBands(height, own = 0) {
  if (own <= 0) return 0;
  const b = DINELV_BANDS;
  const gate = smooth(b.from - b.feather, b.from + b.feather, height) * (1 - smooth(b.to - b.feather, b.to + b.feather, height));
  if (gate <= 0) return 0;
  return b.amp * Math.sin(height * 6.2831853 / b.period) * gate * own;
}

/**
 * **The ridge systems, on the peninsula's own axis.** The lore says the ridges run "from roughly north
 * to south, aligned with the peninsula's long axis", and those are two claims; on the atlas they are
 * nearly but not quite the same claim, so the atlas wins and the lore's "roughly" carries it. Measured
 * off this country's own hexes, the row centres walk from x = -3400 at row 126 to x = -3700 at row 132,
 * which is a long axis running **north-north-east to south-south-west at about thirty degrees west of
 * south**. The ridges are laid on that bearing, in a frame of its own: `a` along the strike and `c`
 * across it, so a ridge is one number and a length.
 *
 * Job 2 took the same sentence for the hamada's benches one hex-row south and built them due north and
 * south. The thirty degrees between them is inside the lore's "roughly", and the two are the same
 * structure seen twice: these are the ridges and the hamada's benches are their dip slope, which is why
 * job 2's report calls them "harder beds outcropping on a dip that runs east off the Dinelv highland".
 *
 * **Taken as a maximum and not a sum** (`ovesRim`'s rule): two ridges whose skirts overlap make one
 * broader double-crested system rather than a ridge twice as high, and a ridge *system* is exactly that.
 *
 * **And the lines are not chosen - the atlas draws them.** In the strike frame every one of these
 * thirty-five hexes falls on one of six rows of constant `c`, eighty-six and a half metres apart, and
 * read along those rows the terrain field says this:
 *
 * ```
 *   c = -2237   hills hills hills hills hills                     an unbroken ridge
 *   c = -2150   hills hills PLAINS PLAINS  mtn   hills hills       a ridge with a wide gap
 *   c = -2064   hills PLAINS  mtn   mtn   hills PLAINS hills       a ridge with two gaps
 *   c = -1977   hills hills PLAINS PLAINS hills hills hills        a ridge with a wide gap
 *   c = -1891   hills hills hills hills hills                      an unbroken ridge
 *   c = -1804   hills hills hills                                  the inner shoulder
 * ```
 *
 * So the six rows are the six ridges, **the `plains` hexes are the gaps in them**, and the three
 * `mountain` hexes are the high points of two of the middle rows. Nothing is imposed: the structure is
 * read off the terrain field in the frame the lore's own sentence names.
 *
 * **The gaps and the water points are the same ground, and that is the finding.** The lore says two
 * things about this plateau without joining them - "these ridges create the passes that matter to the
 * Route Registry" and "the deeper-rooted plants occupying the water-concentration points that only
 * become visible in wet years" - and on this structure they are one thing, because the ridges are the
 * divides and the gaps are the only low ground there is. That is why the court's cisterns are at the
 * passes and why the pastoral communities move between them. `DINELV_BASINS` cuts the same four places
 * this list leaves open. The garrisons, the road surface, the cisterns and the tariff inspection are the
 * court's and are not built.
 */
export const DINELV_STRIKE = freeze({ ax: -.5, az: .866, cx: .866, cz: .5 });
export const dinelvAlong = (x, z) => x * DINELV_STRIKE.ax + z * DINELV_STRIKE.az;
export const dinelvAcross = (x, z) => x * DINELV_STRIKE.cx + z * DINELV_STRIKE.cz;
/** A point in the strike frame back in world metres: the frame is a reflection, so it is its own inverse. */
export const dinelvPoint = (a, c) => point(DINELV_STRIKE.ax * a + DINELV_STRIKE.cx * c, DINELV_STRIKE.az * a + DINELV_STRIKE.cz * c);
const ridge = (id, name, c, from, to, lift, half, gaps) => freeze({ id, name, c, from, to, lift, half, gaps: freeze(gaps.map(g => freeze(g))) });
export const DINELV_RIDGES = freeze([
  ridge('seaward-ridge', 'The Seaward Ridge', -2237, 3380, 3870, 12, 26, []),
  ridge('saddle-ridge', 'The Saddle Ridge', -2150, 3230, 3920, 13, 26, [{ a: 3525, half: 88, id: 'middle-saddle', name: 'The Middle Saddle' }]),
  ridge('table-ridge', 'The Table Ridge', -2064, 3180, 3870, 15, 26,
    [{ a: 3325, half: 52, id: 'north-gap', name: 'The North Gap' }, { a: 3725, half: 52, id: 'rim-gap', name: 'The Rim Gap' }]),
  ridge('low-ridge', 'The Low Ridge', -1977, 3130, 3820, 12, 26, [{ a: 3425, half: 88, id: 'low-gap', name: 'The Low Gap' }]),
  ridge('inner-ridge', 'The Inner Ridge', -1891, 3180, 3670, 11, 26, []),
  ridge('shoulder-ridge', 'The Inner Shoulder', -1804, 3230, 3520, 9, 24, []),
]);
/** Every gap in every ridge, with where it stands: the four crossings of the plateau's grain. */
export const DINELV_GAPS = freeze(DINELV_RIDGES.flatMap(r => r.gaps.map(g =>
  freeze({ ...g, ridge: r.id, ...dinelvPoint(g.a, r.c) }))));
/** How high the ridge systems stand at a point, and how near a crest it is: the scatter reads both. */
export function dinelvRidgeAt(x, z) {
  const a = dinelvAlong(x, z), c = dinelvAcross(x, z);
  let lift = 0, crest = 0;
  for (const r of DINELV_RIDGES) {
    const ends = smooth(r.from - 34, r.from + 34, a) * (1 - smooth(r.to - 34, r.to + 34, a));
    if (ends <= 0) continue;
    let gap = 1;
    for (const g of r.gaps) gap = Math.min(gap, 1 - (1 - smooth(g.half * .45, g.half, Math.abs(a - g.a))) * .92);
    const across = 1 - smooth(0, r.half * 2.3, Math.abs(c - r.c));
    const here = r.lift * ends * gap * across;
    if (here > lift) lift = here;
    crest = Math.max(crest, ends * gap * (1 - smooth(0, r.half * .9, Math.abs(c - r.c))));
  }
  return { lift, crest };
}
export function dinelvRidges(x, z, own = 0) {
  if (own <= 0) return 0;
  return dinelvRidgeAt(x, z).lift * own;
}

/**
 * **The three `mountain` hexes are mesas, and the climate code is what decides it.** The atlas paints
 * all three `BWh`, and across the whole map `mountain` reads `BWh` exactly three times - these three.
 * A summit high enough to be a mountain in the Lotharn sense (the West's crest is 550 m) would read
 * `ET` or `Dfc` at its top; the map's author wrote hot desert, so these are low. What a hot desert
 * makes of a bedded plateau that is being stripped away is not a peak, it is **a residual block with a
 * flat top and cliff sides** - the last piece of an older and higher surface, standing over the present
 * one - and that is what these are: fifty-five to seventy-four metres over the plateau, tops at a
 * hundred and eighty to two hundred, sides too steep to walk.
 *
 * **Two of the three lie on one strike line and the third on the next ridge west**, which was measured
 * and not chosen: (-32,128) and (-33,129) have the same across-strike coordinate to a fifth of a metre,
 * so they are the highest exposures of `middle-ridge`, and (-35,130) stands eighty-seven metres west of
 * that line on `west-ridge`. Taken as a maximum with the ridges, because a mesa on a ridge is the
 * ridge's own high point and not a hill on top of one.
 *
 * Their flanks carry `DINELV_BANDS` like everything else in the country, so the courses run round them
 * at the same heights they run along the escarpment - which is the one thing that says these three and
 * the escarpment face are the same rock. Their steep faces require the normal climbing controller
 * and its stamina limits; the authored ascent remains the walkable way onto the plateau. The lore's
 * ridge-exposure mines, whose families hold the knowledge of where the good stone runs,
 * are people's and are not built.
 */
const mesa = (id, name, x, z, lift, top, reach) => freeze({ id, name, x, z, lift, top, reach });
export const DINELV_MESAS = freeze([
  // **The tops are most of the radius and the fall is short**, which is what makes a table a table: the
  // first pass put the full lift inside forty metres of an eighty-eight-metre reach and the review
  // render came back with three rounded domes. Now the fall is twenty-six to thirty metres of run for
  // fifty-five to seventy-four of lift, which is a cliff.
  mesa('north-mesa', 'The North Table', -3500, 1934, 62, 46, 74),
  mesa('long-mesa', 'The Long Table', -3550, 2021, 74, 52, 82),
  mesa('west-mesa', 'The West Table', -3700, 2107, 55, 42, 68),
]);
export function dinelvMesaAt(x, z) {
  let lift = 0, top = 0, flank = 0;
  for (const m of DINELV_MESAS) {
    const d = Math.hypot(x - m.x, z - m.z);
    if (d >= m.reach) continue;
    const here = m.lift * (1 - smooth(m.top, m.reach, d));
    if (here > lift) lift = here;
    top = Math.max(top, 1 - smooth(m.top * .8, m.top, d));
    flank = Math.max(flank, smooth(m.top, m.top + 10, d) * (1 - smooth(m.reach - 12, m.reach, d)));
  }
  return { lift, top, flank };
}
export function dinelvMesas(x, z, own = 0) {
  if (own <= 0) return 0;
  return dinelvMesaAt(x, z).lift * own;
}

/**
 * **The six `plains` hexes are the basins, and they are the only ground on the plateau where anything
 * roots deep.** A `plains` hex ringed by `hills` is not a lowland: it is a hollow in an upland, and on
 * an arid plateau with no outlet a hollow is where the runoff dies. The lore names them without calling
 * them anything: "the water-concentration points that only become visible in wet years when they green
 * faster than the surrounding ground". So they are cut nine to fourteen metres below the ridges round
 * them, closed, with nothing leaving any of them, and the scatter reads `inDinelvBasin` for the one
 * place on this plateau a deeper-rooted plant can be.
 *
 * **They are the ridge gaps, and they are placed by arithmetic rather than by eye**: each one is the
 * centre of one of `DINELV_RIDGES`' four gaps, so the six `plains` hexes fall into four basins - two of
 * them two hexes wide, where a row has two `plains` hexes side by side, and two of them one hex. The cut
 * is small, eight or nine metres, because the ridge lift that is *absent* here has already put this ground
 * ten to fifteen metres below the crests on either side; what the cut adds is the closure, so that
 * nothing leaves a basin in any direction and the water that reaches one stays until it goes upward.
 */
export const DINELV_BASINS = freeze(DINELV_GAPS.map(gap => freeze({
  id: gap.id + '-basin', gap: gap.id, x: gap.x, z: gap.z,
  depth: gap.half > 70 ? 9 : 8, radius: gap.half > 70 ? 88 : 64,
})));
/** 1 in the middle of a basin, 0 on the ridges: where the plateau's water goes and its only deep roots. */
export function inDinelvBasin(x, z) {
  let best = 0;
  for (const b of DINELV_BASINS) {
    const d = Math.hypot(x - b.x, z - b.z);
    if (d >= b.radius) continue;
    best = Math.max(best, 1 - smooth(0, 1, d / b.radius));
  }
  return best;
}
export function dinelvBasins(x, z, own = 0) {
  if (own <= 0) return 0;
  let cut = 0;
  for (const b of DINELV_BASINS) {
    const d = Math.hypot(x - b.x, z - b.z);
    if (d >= b.radius) continue;
    cut = Math.max(cut, b.depth * (1 - smooth(0, 1, d / b.radius)));
  }
  return -cut * own;
}

/**
 * **The seasonal channels down the escarpment face**, and three of the four end where job 2's fans
 * begin. `dinelv_highlands.md`: "exposed sedimentary rock cut by seasonal water channels". Job 2's own
 * open question asked for exactly this - "what will need a look is the three fan apexes, which sit
 * thirty to fifty metres inside my own hexes and should read as being at the mouths of the escarpment's
 * own channels" - so these three run down to `MEROSHE_FANS`' three apexes and stop at this country's
 * edge, and the fan takes over below. The fourth runs west off the plateau onto Cape Heth, which is the
 * coastal strip the lore says the ascent starts from.
 *
 * They are dry. There is no water surface anywhere in these thirty-five hexes and the atlas draws no
 * river edge on any of them, which is the same reading the Ganesh's washes and the Meroshe's absence of
 * water got: what crosses this face crosses it twice in a decade, and what it leaves is a cut bed with
 * coarse rubble in it. They are narrow and deep for their width, because a channel on a bedded face cuts
 * rather than spreads.
 */
const dinelvChannel = (id, name, cut, half, target, line) => freeze({ id, name, cut, half, target, line: freeze(line.map(([x, z]) => point(x, z))) });
export const DINELV_CHANNELS = freeze([
  dinelvChannel('north-channel', 'The North Channel', 2.6, 8, 'north-fan',
    [[-3790, 2180], [-3766, 2245], [-3740, 2300], [-3722, 2338]]),
  dinelvChannel('middle-channel', 'The Middle Channel', 2.8, 9, 'middle-fan',
    [[-3655, 2196], [-3628, 2254], [-3604, 2308], [-3592, 2338]]),
  dinelvChannel('east-channel', 'The East Channel', 2.4, 8, 'east-fan',
    [[-3492, 2120], [-3476, 2178], [-3460, 2230], [-3452, 2264]]),
  dinelvChannel('cape-channel', 'The Cape Channel', 2.2, 7, null,
    [[-3772, 2032], [-3820, 2050], [-3870, 2062], [-3906, 2070]]),
]);
export function nearestDinelvChannel(x, z, margin = 0) {
  let best = null;
  for (const channel of DINELV_CHANNELS) {
    const found = lineWalk(channel.line, x, z, channel.half * 3 + margin);
    if (found && (!best || found.distance < best.distance)) best = { channel, ...found };
  }
  return best;
}
export function dinelvChannelCut(x, z, own = 0) {
  if (own <= 0) return 0;
  const found = nearestDinelvChannel(x, z);
  if (!found) return 0;
  const { channel, distance, along } = found;
  const across = 1 - smooth(channel.half, channel.half * 2.4, distance);
  const ends = smooth(0, .12, along) * (1 - smooth(.88, 1.02, along));
  return -channel.cut * across * ends * own;
}
/** True on a channel's own rubble floor, where nothing roots. */
export function onDinelvChannelFloor(x, z, margin = 0) {
  const found = nearestDinelvChannel(x, z, margin);
  if (!found) return false;
  const ends = smooth(0, .12, found.along) * (1 - smooth(.88, 1.02, found.along));
  return ends > .35 && found.distance < found.channel.half + margin;
}

/**
 * **The one way up, and it is the lore's own.** "The northern plateau pass is the primary overland
 * connection between Dinelv and the plateau interior, and through the plateau interior, to the caravan
 * routes that cross the Meroshe... The ascent from the city takes a full day on the standard road."
 *
 * Everything else on this country's margin is an escarpment: measured on the built ground before this
 * was laid, the fall to the sea on the south-western corner is sixty-four metres in fifty, which is a
 * sea cliff, and the faces to Cape Heth and to the Meroshe are half of that. Somewhere there has to be
 * ground a loaded animal can be walked up, or the plateau is an island inside an island and the lore's
 * whole account of it - a stone trade downhill, food uphill, a pass that can be closed - means nothing.
 *
 * So the northern margin, where the plateau meets the Ganesh Desert across ten hex edges and the fall is
 * already the gentlest it gets, carries a graded ascent: the ground within `half` metres of the line is
 * levelled toward a constant grade and comes back to the ordinary escarpment by `half * 2.6`. It is the
 * swale's own machinery (`SOUTHWEST_SWALE`) turned on its side, and the grade is **measured** in
 * `tests/southwest-world.test.js` rather than typed here - the test walks it and holds every two-metre
 * step on it inside the walking budget, and floods the country to prove the plateau can be reached at
 * all. Nothing is built on it: no road surface, no cutting, no cistern, no waystation and no garrison.
 */
export const DINELV_ASCENT = freeze({
  // Laid **along the grain**, up the swale between the inner ridge and the low ridge (c ~ -1935), which
  // is how a plateau of parallel ridges is actually climbed: along a valley rather than over the ribs.
  // It arrives in the swale and the Low Gap takes a traveler across to the next one.
  line: freeze([point(-3222, 1716), point(-3262, 1772), point(-3300, 1826), point(-3330, 1878), point(-3352, 1926), point(-3368, 1968)]),
  half: 19, outer: 48,
});
const dinelvAscentProfile = (() => {
  const line = DINELV_ASCENT.line;
  let total = 0;
  for (let i = 1; i < line.length; i++) total += Math.hypot(line[i].x - line[i - 1].x, line[i].z - line[i - 1].z);
  return freeze({ total });
})();
/**
 * How much of a point the ascent owns, and where along it: the ground function levels toward the
 * straight line between the ascent's two measured ends, which are the ordinary ground at each end so
 * the ramp joins what it joins without a step.
 */
export function dinelvAscentAt(x, z) {
  const found = lineWalk(DINELV_ASCENT.line, x, z, DINELV_ASCENT.outer);
  if (!found) return null;
  const inner = 1 - smooth(DINELV_ASCENT.half, DINELV_ASCENT.outer, found.distance);
  const ends = smooth(0, .18, found.along) * (1 - smooth(.82, 1, found.along));
  return { along: found.along, weight: inner * ends };
}
let ascentEnds = null;
export function dinelvAscentLevel(along) {
  if (ascentEnds === null) {
    const line = DINELV_ASCENT.line, foot = line[0], head = line[line.length - 1];
    const level = p => terrainMix(p.x, p.z).base + southwestSlope(p.x, p.z);
    ascentEnds = freeze({ foot: level(foot), head: level(head) });
  }
  return lerp(ascentEnds.foot, ascentEnds.head, clamp(along, 0, 1));
}

// ---------------------------------------------------------------------------
// Hama: the wet edge of the desert, and the line is the country
// ---------------------------------------------------------------------------
/**
 * **The only place in the block where the aridity gradient reaches a green country from the dry side.**
 * Job 1's gradient ran from `BWh` down to two green corners at the block's *other* end; job 2's half was
 * flat 1.000 on ninety-four of ninety-five hexes. Here the field has somewhere to go again, and this
 * time the atlas states where: nine `Csb` `grassland` hexes on the seaward side, ten `BWh` `plains`
 * hexes inland, and **not one hex where the terrain word and the climate code disagree**.
 *
 * So Hama needs no field of its own to decide where the green is - `southwestAridity` already knows,
 * because it is the same blend of the same hex codes on the same falloff. `hamaGreen` is that field read
 * back on Hama's own hexes and stretched, so 1 is the wet half and 0 the dry one and the whole of the
 * change happens over about two hundred paces, which is what the blend's reach of 1.28 hexes comes to.
 * The scatter, the ground colour and the wildlife all sort by it, and where it crosses a half is **the
 * line** - a measured curve, reported rather than authored.
 */
export function hamaGreen(x, z, mix = null) {
  const own = regionShare('Hama', x, z, mix);
  if (own <= 0) return 0;
  return clamp(1 - smooth(.22, .86, southwestAridity(x, z)), 0, 1) * own;
}
/**
 * **The friction, which is the one thing the lore says about this country's ground**: "The terrain
 * between Hama and the Meroshe interior is rough without being impassable - enough friction to make
 * overland access from the desert difficult for large-scale military movement, easy enough for the small
 * commercial caravans and courier traffic that are Hama's normal overland commerce."
 *
 * The atlas gives the inland half `plains`, so the friction cannot be relief: it is **surface**, which is
 * job 2's answer to flat country used a fourth time. A metre and three quarters on two turned bearings
 * of forty and sixty-three metres - one field on one bearing reads as corrugation, which is the Ascarth
 * plateau's lesson - which is a stony broken rise a laden animal picks its way over and a column cannot
 * keep ranks on. It is twice the roughest thing in the Meroshe and it is gated on the **dry** half by
 * `hamaGreen`, because the green side is grass over soil and has no friction in it at all.
 */
export const HAMA_BROKEN = freeze({ amp: .95, waveA: 40, waveB: 63, bearingA: .34, bearingB: -1.18, ribAmp: .8, ribWave: 118, ribBearing: .52 });
export function hamaBroken(x, z, own = 0, green = 0) {
  if (own <= 0) return 0;
  const b = HAMA_BROKEN;
  const a = Math.sin(turned(x, z, b.bearingA) * 6.2831853 / b.waveA);
  const c = Math.sin(turned(x, z, b.bearingB) * 6.2831853 / b.waveB);
  const rib = Math.sin(turned(x, z, b.ribBearing) * 6.2831853 / b.ribWave);
  return (b.amp * (a * .6 + c * .4) + b.ribAmp * rib) * own * (1 - green * .88);
}
/** 1 on a bare stony rib the walking is bad on, 0 in the fine ground between: what the scatter reads. */
export function hamaLie(x, z) {
  const own = regionShare('Hama', x, z);
  if (own <= 0) return 0;
  const raw = hamaBroken(x, z, 1, 0);
  return clamp((raw + HAMA_BROKEN.amp + HAMA_BROKEN.ribAmp) / (2 * (HAMA_BROKEN.amp + HAMA_BROKEN.ribAmp)), 0, 1);
}
/**
 * **The winter watercourses, and they are dry.** `Csb` is a Mediterranean code and what it means is that
 * the rain comes in winter and the summer is dry; `hama.md` says the consequence - "the soils thin, the
 * seasonal water supply unreliable in dry years" - and the atlas draws no river edge on any of Hama's
 * nineteen hexes, so there is no permanent water in this country at all. What the winter rain leaves is
 * three shallow beds running off the stony rise, across the green and into the two seas, with the
 * greenest growth in the whole block standing in their floors and nothing running in any of them.
 *
 * They are the Ganesh Plain's channels on a wetter country: shallower cuts, softer banks, and grass
 * rather than gravel in them, because on this side of the line the ground has soil in it.
 */
const hamaBed = (id, name, cut, half, line) => freeze({ id, name, cut, half, line: freeze(line.map(([x, z]) => point(x, z))) });
export const HAMA_BEDS = freeze([
  hamaBed('north-bed', 'The North Bed', 1.5, 9, [[-3330, 2726], [-3386, 2752], [-3444, 2778], [-3488, 2798]]),
  hamaBed('middle-bed', 'The Middle Bed', 1.6, 10, [[-3186, 2856], [-3236, 2876], [-3268, 2888], [-3292, 2898]]),
  hamaBed('south-bed', 'The South Bed', 1.4, 8, [[-2962, 2988], [-2980, 3024], [-2992, 3048], [-3002, 3066]]),
]);
export function nearestHamaBed(x, z, margin = 0) {
  let best = null;
  for (const bed of HAMA_BEDS) {
    const found = lineWalk(bed.line, x, z, bed.half * 3 + margin);
    if (found && (!best || found.distance < best.distance)) best = { bed, ...found };
  }
  return best;
}
export function hamaBedCut(x, z, own = 0) {
  if (own <= 0) return 0;
  const found = nearestHamaBed(x, z);
  if (!found) return 0;
  const { bed, distance, along } = found;
  const across = 1 - smooth(bed.half, bed.half * 2.8, distance);
  const ends = smooth(0, .10, along) * (1 - smooth(.90, 1.02, along));
  // **It lets go at the shore**, which is `merosheSkirt`'s lesson and the swale's before it: the coast
  // field has already brought the last forty metres down to the water before `southwestGround` sees the
  // ground, so a metre and a half of cut laid on top of that put the mouth of the middle bed below sea
  // level. It holds its full cut to fifty-two metres inland and releases over the last thirty-four, and
  // all three lines were trimmed back to ground that stands thirty metres clear of the surf.
  const shore = smooth(18, 52, landDistance(x, z));
  return -bed.cut * across * ends * shore * own;
}
/** How near a winter bed's damp floor a point is: the greenest thing in the southwest stands here. */
export function inHamaBed(x, z) {
  const found = nearestHamaBed(x, z);
  if (!found) return 0;
  const ends = smooth(0, .10, found.along) * (1 - smooth(.90, 1.02, found.along));
  return ends * (1 - smooth(found.bed.half * .4, found.bed.half * 1.9, found.distance));
}

// ---------------------------------------------------------------------------
// The swale: a designed floor for two rivers drawn on unbuilt borders
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Marosh: one ridge, one gap in it, four dry combes and the one river the atlas draws
// ---------------------------------------------------------------------------
/**
 * **The crest, and it is the wall the whole Meroshe stands behind.** The atlas gives Marosh eight
 * `hills` hexes in an unbroken chain nine rows long and one hex wide, and it says three separate things
 * about them: they are `hills` where the rest of the country is `grassland`, they are `Csb` where the
 * rest is `Csa`, and **every one of them touches the desert and not one of them touches the sea** while
 * every one of the ten `grassland` hexes touches the sea. Seventeen of Marosh's eighteen desert edges
 * are on the hills and all twenty of its ocean edges are on the grass. Nothing in this block is stated
 * that many times.
 *
 * So the crest is laid along those eight hex centres and nowhere else, and it is taken as a **maximum**
 * over the line rather than a sum (`ovesRim`'s rule), because a ridge is a ridge and not a row of hills
 * added together. Fifteen metres of crest on a base of 74 puts the top of it near ninety, which is the
 * second highest ground in the game outside the two Lotharns, behind the Dinelv plateau.
 *
 * The line bends, and the bend is the atlas's: the chain runs south-west from (-23,128) to (-26,131) and
 * then south-east again to (-26,135), so the ridge has an elbow at its western apex and the apex is
 * where the water comes out of it.
 */
export const MAROSH_RIDGE = freeze({
  lift: 15, half: 42, fade: 136,
  line: freeze([[-2588, 1896], [-2600, 1934], [-2650, 2021], [-2700, 2107], [-2750, 2194],
    [-2700, 2281], [-2650, 2367], [-2600, 2454], [-2550, 2540], [-2538, 2578]].map(([x, z]) => point(x, z))),
});
/**
 * **The one gap, and the atlas put a river in it.** Marosh's crest is unbroken on the terrain field, so
 * a gap through it cannot be read off the hex words the way the Dinelv plateau's four could. What can be
 * read off the atlas is its water: the only three river edges it draws on this whole coast meet at one
 * corner, the corner of (-25,131) - which is the seaward hex beside the ridge's own western apex. A
 * river crossing a ridge line is a water gap, so the notch is there and its depth is measured against
 * the crest either side of it.
 *
 * It is also the only place a loaded animal crosses this country, which is the whole of why Marosh
 * exists as a kingdom: "The caravan routes across the Meroshe are Marosh's revenue base... They connect
 * the Iberos Sea coast with the peninsula's western face." The road through the gap, the Route Registry
 * that issues it and the waystation at the top are the Maroshi court's, and none of them is built.
 */
export const MAROSH_GAP = freeze({ id: 'marosh-water-gap', name: 'The Water Gap', x: -2716, z: 2152, half: 64, cut: .74 });
/** How high the ridge stands at a point, and how near the crest it is: the scatter and the tint read both. */
export function maroshRidgeAt(x, z) {
  const line = MAROSH_RIDGE.line;
  let near = Infinity;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i];
    const dx = b.x - a.x, dz = b.z - a.z, length = dx * dx + dz * dz;
    const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (length || 1), 0, 1);
    near = Math.min(near, Math.hypot(x - (a.x + dx * t), z - (a.z + dz * t)));
  }
  const crest = 1 - smooth(MAROSH_RIDGE.half, MAROSH_RIDGE.fade, near);
  const gap = 1 - smooth(0, MAROSH_GAP.half, Math.hypot(x - MAROSH_GAP.x, z - MAROSH_GAP.z));
  return { lift: MAROSH_RIDGE.lift * crest * (1 - MAROSH_GAP.cut * gap), crest, gap };
}
export function maroshRidge(x, z, own = 0) {
  return own > 0 ? maroshRidgeAt(x, z).lift * own : 0;
}
/** 1 on the ridge's own crest, 0 out on the terrace: the field Marosh's scatter and colour sort by. */
export const maroshCrest = (x, z) => maroshRidgeAt(x, z).crest;
/** 1 within thirty metres of the Iberos surf, 0 two hundred metres in. */
export const maroshShore = (x, z) => 1 - smooth(30, 200, landDistance(x, z));

/**
 * **Four dry combes down the seaward face, and the reason they are dry is the reason the Nahr is not.**
 * `Csa` means the rain comes in winter and the summer does not, and the atlas draws exactly one river on
 * this coast - so the other drainages off the ridge carry water for a few weeks a year and are cut beds
 * for the rest of it. It is Hama's winter beds one country east, on a face instead of a flat, and the
 * greenest grass in Marosh stands in the floor of each.
 */
const maroshCombe = (id, name, cut, half, line) => freeze({ id, name, cut, half, line: freeze(line.map(([x, z]) => point(x, z))) });
export const MAROSH_COMBES = freeze([
  maroshCombe('north-combe', 'The north combe', 1.3, 8, [[-2596, 1948], [-2552, 1960], [-2508, 1972], [-2470, 1986]]),
  maroshCombe('upper-combe', 'The upper combe', 1.25, 7.5, [[-2648, 2016], [-2608, 2023], [-2570, 2030], [-2534, 2037]]),
  maroshCombe('middle-combe', 'The middle combe', 1.35, 8.5, [[-2694, 2296], [-2650, 2308], [-2606, 2320], [-2568, 2332]]),
  maroshCombe('south-combe', 'The south combe', 1.3, 8, [[-2594, 2466], [-2550, 2478], [-2506, 2490], [-2468, 2502]]),
]);
export function nearestMaroshCombe(x, z, margin = 0) {
  let best = null;
  for (const combe of MAROSH_COMBES) {
    const found = lineWalk(combe.line, x, z, combe.half * 3 + margin);
    if (found && (!best || found.distance < best.distance)) best = { combe, ...found };
  }
  return best;
}
export function maroshCombeCut(x, z, own = 0) {
  if (own <= 0) return 0;
  const found = nearestMaroshCombe(x, z);
  if (!found) return 0;
  const { combe, distance, along } = found;
  const across = 1 - smooth(combe.half, combe.half * 2.6, distance);
  const ends = smooth(0, .12, along) * (1 - smooth(.88, 1.02, along));
  // The shore release, which is `merosheSkirt`'s lesson and Hama's after it: the coast field has
  // already taken the last forty metres down to the water before `southwestGround` sees the ground,
  // so a cut laid on top of that would put a combe's mouth under the Iberos.
  return -combe.cut * across * ends * smooth(16, 48, landDistance(x, z)) * own;
}
/** How near a combe's damp floor a point is: the greenest grass in Marosh stands here. */
export function inMaroshCombe(x, z) {
  const found = nearestMaroshCombe(x, z);
  if (!found) return 0;
  const ends = smooth(0, .12, found.along) * (1 - smooth(.88, 1.02, found.along));
  return ends * (1 - smooth(found.combe.half * .4, found.combe.half * 1.8, found.distance));
}

// ---------------------------------------------------------------------------
// Trogo: the ridge that makes the rainforest, and the ways through it
// ---------------------------------------------------------------------------
/**
 * **The crest, and it is the whole explanation of the country.** `trogo.md`, in one sentence: "a
 * ridgeline that catches the southern moisture and drops a fog wall on its windward face while the
 * leeward side stays desert." That sentence is the design, and the atlas says where the ridgeline runs:
 * **the seven Trogo hexes that share an edge with the South Meroshe** - (-25,136), (-26,137), (-26,138),
 * (-27,139), (-28,140), (-29,140) and (-30,141) - are its north-western margin, and they are read off the
 * map rather than chosen. The crest is laid along them; everything south-east of it is the windward
 * face, which is twenty-two hexes of `Af`; everything north-west of it is job 2's fog belt and then
 * ninety-five hexes of hot desert.
 *
 * Seventeen metres of crest on a base of 52, against the South Meroshe's 14 across thirteen hex edges.
 * The front that produces is the "wall of dark canopy" job 2's own landmark promised a job in advance,
 * and **no landform is authored on that margin at all**: it is the hex blend carrying a base difference,
 * which is the West Lotharn's and the Dinelv escarpment's contract - a front is what the atlas draws
 * here, and the report measures it rather than lowering a base to hide it.
 */
export const TROGO_CREST = freeze({
  lift: 26, half: 46, fade: 152,
  line: freeze([[-2400, 2600], [-2418, 2660], [-2428, 2750], [-2424, 2840], [-2462, 2916],
    [-2520, 2962], [-2600, 2978], [-2652, 3048], [-2660, 3080]].map(([x, z]) => point(x, z))),
});
export function trogoCrestAt(x, z) {
  const line = TROGO_CREST.line;
  let near = Infinity;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i];
    const dx = b.x - a.x, dz = b.z - a.z, length = dx * dx + dz * dz;
    const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (length || 1), 0, 1);
    near = Math.min(near, Math.hypot(x - (a.x + dx * t), z - (a.z + dz * t)));
  }
  const crest = 1 - smooth(TROGO_CREST.half, TROGO_CREST.fade, near);
  return { lift: TROGO_CREST.lift * crest, crest, off: near };
}
export function trogoCrest(x, z, own = 0) {
  return own > 0 ? trogoCrestAt(x, z).lift * own : 0;
}

/**
 * **Four gullies off the crest, and they are the country's own drainage.** The lore: "The land itself is
 * steep. Trogo is not a lowland rainforest... it is a slope forest, on the descending face of the
 * peninsula's interior plateau, and the terrain reflects this - rivers run fast, elevation changes
 * quickly." Thirty-nine metres of fall from canopy to shore grass over a hex, with rain in every month
 * of the year, cuts gullies; the atlas draws only the one of them that is big enough to be a river.
 *
 * So there is no water surface in any of these - `westWaterSurface` is null on every one of them, and
 * the test asserts it - and what they are is a cut a traveler can walk down. **They are the second of
 * `src/world/scenery/undergrowth.js`'s three kinds of way through**, and between them and the Trogoreth they are the
 * only lines that cross this country from the desert margin to the sea.
 *
 * **Every one of them begins in a clearing on the crest rather than on the crest itself, and that is a
 * measurement rather than a flourish.** The crest line is laid on the hexes the atlas puts against the
 * desert, where the hex blend is pulling the base down toward the Meroshe's fourteen metres - so the
 * highest ground is forty to fifty metres south-east of the divide, not on it, and a gully drawn from the
 * line itself climbed six and a half metres before it began to fall. Each head now stands on its own
 * local high point, and a clearing straddles the gap between it and the crest path, which is what the
 * lore describes anyway: "gaps in the ridge where the desert air pushes through in the dry months,
 * creating corridors of sparse growth cutting into the forest." The clearing is the gap and the gully is
 * the corridor.
 */
const trogoGully = (id, name, cut, half, line) => freeze({ id, name, cut, half, line: freeze(line.map(([x, z]) => point(x, z))) });
export const TROGO_GULLIES = freeze([
  trogoGully('north-gully', 'The north gully', 2.1, 9,
    [[-2424, 2702], [-2352, 2706], [-2312, 2709], [-2232, 2716], [-2164, 2724], [-2138, 2728]]),
  trogoGully('middle-gully', 'The middle gully', 2.3, 9.5,
    [[-2404, 2877], [-2362, 2880], [-2318, 2883], [-2272, 2886], [-2182, 2890], [-2104, 2892]]),
  trogoGully('head-gully', 'The head gully', 1.9, 8,
    [[-2424, 2920], [-2400, 2926], [-2360, 2932], [-2322, 2938], [-2262, 2944]]),
  trogoGully('south-gully', 'The south gully', 2.2, 9,
    [[-2510, 3008], [-2486, 3030], [-2458, 3054], [-2440, 3078], [-2422, 3102]]),
]);
export function nearestTrogoGully(x, z, margin = 0) {
  let best = null;
  for (const gully of TROGO_GULLIES) {
    const found = lineWalk(gully.line, x, z, gully.half * 3 + margin);
    if (found && (!best || found.distance < best.distance)) best = { gully, ...found };
  }
  return best;
}
export function trogoGullyCut(x, z, own = 0) {
  if (own <= 0) return 0;
  const found = nearestTrogoGully(x, z);
  if (!found) return 0;
  const { gully, distance, along } = found;
  const across = 1 - smooth(gully.half, gully.half * 2.5, distance);
  const ends = smooth(0, .09, along) * (1 - smooth(.91, 1.02, along));
  return -gully.cut * across * ends * smooth(18, 54, landDistance(x, z)) * own;
}
/** True on a gully's own stony floor, where the canopy breaks and nothing large roots. */
export function onTrogoGullyFloor(x, z, margin = 0) {
  const found = nearestTrogoGully(x, z);
  if (!found) return false;
  return found.along > .05 && found.along < .95 && found.distance < found.gully.half * .62 + margin;
}

/**
 * **The clearings, and the lore names them as a mechanism rather than as scenery.** "And then the
 * reverse - gaps in the ridge where the desert air pushes through in the dry months, creating corridors
 * of sparse growth cutting into the forest." Four of the six below are exactly that: openings on the
 * crest, where the desert's own air comes over and the canopy does not close, and three of the four hold
 * a gully's head as well. The other two are ordinary treefall gaps, which is what a closed-canopy forest
 * has instead of fields.
 *
 * **Every one of them stands on a way**, and that is deliberate rather than tidy: a clearing surrounded
 * by thicket is a clearing nobody can walk into, and six of those would be six pockets in a country with
 * a movement gate in it.
 */
const clearing = (id, name, x, z, radius, kind) => freeze({ id, name, x, z, radius, kind });
export const TROGO_CLEARINGS = freeze([
  clearing('north-gap', 'The north gap', -2418, 2662, 33, 'desert-air'),
  clearing('middle-gap', 'The middle gap', -2420, 2860, 32, 'desert-air'),
  clearing('head-gap', 'The head gap', -2432, 2916, 30, 'desert-air'),
  clearing('south-gap', 'The south gap', -2516, 2986, 34, 'desert-air'),
  clearing('canopy-fall', 'The canopy fall', -2288, 2812, 25, 'treefall'),
  clearing('river-head', 'The river head', -2264, 2942, 27, 'treefall'),
]);
/** 1 in the middle of a clearing, 0 under closed canopy. */
export function inTrogoClearing(x, z) {
  let most = 0;
  for (const open of TROGO_CLEARINGS)
    most = Math.max(most, 1 - smooth(open.radius * .55, open.radius, Math.hypot(x - open.x, z - open.z)));
  return most;
}

/**
 * **The animal paths, the third kind of way.** The lore gives the country three human populations and
 * every one of them moves through it - "families who know both desert and forest and work seasonally
 * between them, moving up with the dry season and down with the rains" - and it gives the carnivores
 * that hunt both zones as the thing the communities study hardest. A path in a closed forest is worn by
 * whatever walks it most, and none of these is anybody's: no cutting, no blaze, no bridge, no camp.
 *
 * Five of them, and what they do is join the gullies to each other so the network is a network: the
 * crest path along the divide, two rungs between the north and middle gullies through the middle of the
 * forest, a path just inside the north-eastern shore, and a link along the southern forest edge from the
 * south gully's foot to the Trogoreth's own grass.
 *
 * **The second rung was put in by measurement rather than by eye.** With four ways and four paths, one
 * hex of the country - (-24,138), the middle of the eastern canopy - had no open ground within fifty
 * paces of its centre: it sat between the north link and the shore path with eighty metres of thicket to
 * either. The invariant the test now holds is that **no hex of Trogo is more than fifty paces from
 * something a traveler can walk on**, and the middle link is what makes it true.
 */
const trogoPath = (id, name, line) => freeze({ id, name, line: freeze(line.map(([x, z]) => point(x, z))) });
// The direct old endpoint reaches the steep coastal taper. The walk instead
// joins the north gully along its already open inner bank. Keep the original
// line as the vegetation/undergrowth footprint so saved trees do not reroll.
export const TROGO_NORTH_LINK_WALK = freeze([
  [-2352, 2706], [-2332, 2714], [-2312, 2718], [-2300, 2723],
  [-2290, 2778], [-2286, 2840], [-2294, 2884],
].map(([x, z]) => point(x, z)));
export const TROGO_PATHS = freeze([
  trogoPath('crest-path', 'The crest path', TROGO_CREST.line.map(p => [p.x, p.z])),
  freeze({ ...trogoPath('north-link', 'The north link', [[-2302, 2712], [-2290, 2778], [-2286, 2840], [-2294, 2884]]), walkLine: TROGO_NORTH_LINK_WALK }),
  trogoPath('middle-link', 'The middle link', [[-2196, 2722], [-2206, 2790], [-2198, 2848], [-2192, 2888]]),
  trogoPath('shore-path', 'The shore path', [[-2140, 2726], [-2118, 2782], [-2104, 2840], [-2098, 2888]]),
  trogoPath('south-link', 'The south link', [[-2424, 3098], [-2358, 3072], [-2302, 3050], [-2258, 3040]]),
]);

/**
 * **How much of a point is deep forest**, blended on the same falloff the climate field uses, so the
 * thicket thins over a hex rather than at a hex edge. Read off Trogo's own twenty-nine cells: a
 * `deep_forest` hex counts one and a `grassland` hex counts nothing, so the seven `Csa` hexes along the
 * southern shore are open ground and the collar between them and the canopy is a walkable forest edge.
 */
const THICKET_CENTRES = freeze((REGION_CELLS.Trogo ?? []).map(cell =>
  freeze({ x: cell.x, z: cell.z, thicket: cell.terrain === 'deep_forest' ? 1 : 0 })));
export function trogoThicket(x, z) {
  let total = 0, sum = 0;
  for (const cell of THICKET_CENTRES) {
    const weight = 1 - Math.hypot(x - cell.x, z - cell.z) / 128;
    if (weight <= 0) continue;
    total += weight; sum += cell.thicket * weight;
  }
  return total > 0 ? sum / total : 0;
}

/**
 * **The ways through, as one field, and this is what `src/world/scenery/undergrowth.js` reads.**
 *
 * 1 is ground a traveler can walk and 0 is thicket they cannot push into. It is four things taken as a
 * maximum, and no more:
 *
 *  - **anything that is not deep forest** - the seven `Csa` grassland hexes of the southern shore, and
 *    the collar of forest edge that blends into them;
 *  - **the watercourse**, the Trogoreth and its banks out to thirteen metres either side of the centre
 *    line, which is the lore's own way in: "Follow the rivers down";
 *  - **the gullies**, nine metres either side of each of the four;
 *  - **the clearings** and **the animal paths**, four and a half metres either side of a path.
 *
 * Each of them feathers rather than stopping dead, so there is no hard edge anywhere in the field, and
 * the rule that reads it takes a step as passable at half. **The widths are the whole safety margin of
 * this country**: a way narrower than a few metres is a way the walking resolver, which moves X and Z
 * separately, can fall off and then not get back on. `tests/trogo-undergrowth.test.js` floods the
 * country both ways and proves it is crossable along these and not crossable without them.
 */
export const TROGO_WAY = freeze({ river: 13, gully: 9, path: 4.6, feather: 1.45, open: .5,
  thicketFrom: .42, thicketTo: .78 });
export function trogoWay(x, z) {
  const thicket = trogoThicket(x, z);
  let open = 1 - smooth(TROGO_WAY.thicketFrom, TROGO_WAY.thicketTo, thicket);
  if (open >= 1) return 1;
  const near = (distance, half) => 1 - smooth(half, half * TROGO_WAY.feather, distance);
  const river = courseDistance(TROGORETH, x, z, TROGO_WAY.river * TROGO_WAY.feather + 2);
  open = Math.max(open, near(river, TROGO_WAY.river));
  if (open >= 1) return 1;
  for (const gully of TROGO_GULLIES) {
    const found = lineWalk(gully.line, x, z, TROGO_WAY.gully * TROGO_WAY.feather);
    if (found) open = Math.max(open, near(found.distance, TROGO_WAY.gully));
  }
  if (open >= 1) return 1;
  for (const path of TROGO_PATHS) {
    const found = lineWalk(path.line, x, z, TROGO_WAY.path * TROGO_WAY.feather);
    if (found) open = Math.max(open, near(found.distance, TROGO_WAY.path));
  }
  return Math.max(open, inTrogoClearing(x, z));
}
/**
 * The altitude band a point stands in: 0 on the shore and 1 on the crest. **The lore sorts this country
 * by height and by nothing else** - "Trogo's ecology is layered by altitude... The upper edge, where the
 * canyon meets the fog zone, is adapted to intermittent moisture... The mid-slope forest is full
 * tropical rainforest by the measures that matter... At the coast and along the lower river systems, the
 * mangrove and estuary ecology takes over" - so the band is a function of the finished height and of
 * nothing else, which is the Dinelv bedding's own argument and makes it impossible to lay crooked.
 */
export const trogoBand = (x, z) => smooth(17, 60, groundLevelFor(x, z));
/**
 * 1 where the fog sits: the upper slopes of the windward face, which is the lore's own fog-forest - "an
 * intermediate world of mosses and cloud-dependent plants that exists only because two atmospheric
 * systems are pressing against each other at this latitude". **The endpoints are measurements**: over
 * Trogo's own hexes the band's mean is 0.650 in the forest and 0.827 on the crest, so 0.62 to 0.92 puts
 * the fog on the crest and almost none of it on the mid-slope, where the first try (0.52 to 0.93) put it
 * over forty-two per cent of the country and made the whole forest a cloud forest.
 */
export const trogoFogForest = (x, z) => smooth(.62, .92, trogoBand(x, z));

/**
 * Both of this block's courses are drawn **on a border with a country nobody has built**, so up to
 * two thirds of the hex blend along them is `outland`, whose relief is six metres on a
 * hundred-and-fifty-metre wave against this block's own nine tenths of a metre on three hundred and
 * twenty. Left alone the water is dragged up and down by somebody else's sine - the Mithala
 * measured its west arm forced down 6.79 m over a thousand metres of exactly this - so every course
 * here is given a swale, on the Mithala's own numbers: within forty-five metres the ground is the
 * block's own designed surface (the blend's base, the tilt and no relief at all), coming back to
 * the ordinary ground by a hundred and sixty-five.
 *
 * The blend's `base` is kept and only `relief()` is dropped, because a base blends linearly across
 * a hex boundary and is therefore already smooth; it is the sine that chirps. The swale lets go at
 * the shore, because the coast field lowers the last forty metres to the sea and a levelled floor
 * laid over that would draw the river's bed in the air above the beach.
 */
export const SOUTHWEST_SWALE = freeze({ inner: 45, outer: 165, shoreFrom: 22, shoreTo: 72 });
/**
 * **Only the two courses that need one, and job 4 found out the hard way why that matters.** The swale
 * exists because job 1's two rivers are drawn on a border with unbuilt country, so two thirds of the
 * blend along them is `outland`'s six metres on a hundred-and-fifty-metre wave; there is nothing to
 * flatten on a course whose own country is on both banks. Job 4's two are exactly that - the Nahr and
 * the Trogoreth have Marosh and Trogo on both sides of every one of their seven atlas edges - and
 * leaving them in this list **flattened the ridges they run off**: measured, the Trogoreth's own bank
 * reaches within sixty-seven metres of the middle of Trogo's canopy, and the swale there ran at 0.91,
 * which pulled thirteen of the crest's seventeen metres back down to the blend's own base and made the
 * whole rainforest read as a flat shelf. The list is the two border courses and nothing else.
 */
export const SOUTHWEST_SWALE_RIVERS = freeze([VAELLIR, ALEZHOR_WATER]);
export function nearestSouthwestRiver(x, z, limit = SOUTHWEST_SWALE.outer) {
  let best = null, distance = limit;
  for (const course of SOUTHWEST_SWALE_RIVERS) {
    const d = courseDistance(course, x, z, distance);
    if (d < distance) { distance = d; best = course; }
  }
  return best ? { course: best, distance } : null;
}
export function southwestSwaleWeight(x, z, bank = null, near = null) {
  const own = bank ?? southwestBankShare(x, z);
  if (own <= 0) return 0;
  const found = near === undefined ? null : (near ?? nearestSouthwestRiver(x, z));
  if (!found) return 0;
  const inner = 1 - smooth(SOUTHWEST_SWALE.inner, SOUTHWEST_SWALE.outer, found.distance);
  const shore = smooth(SOUTHWEST_SWALE.shoreFrom, SOUTHWEST_SWALE.shoreTo, landDistance(x, z));
  return inner * shore * own;
}

// ---------------------------------------------------------------------------
// The ground
// ---------------------------------------------------------------------------
/**
 * **Every landform of this block, in one term of `west-ground.js`'s sum.** `southwestGround` wraps
 * the ground it is handed rather than adding to it, for the reason `mithalaGround` does: the swale
 * reshapes the ground rather than adding to it, and a wrapper is the only honest shape for that.
 * Two comparisons reject the rest of Azhora.
 *
 * The order inside it does not matter much - most of the terms are added - but which of them is
 * which does. The block tilts to the Vaellir's mouth; the Ganesh Desert reverses that with its own
 * fall to the gulf; West Pyros falls south with its river and the Ganesh Plain west with its
 * channels; Navarth's swells stand on top of all of it; the wind field roughens the desert's floor
 * by three quarters of a metre; and the washes, the channels and the depressions are cut into
 * whatever the rest leave, so a dry bed on the tilt runs downhill with it.
 */
export function southwestGround(x, z, ground) {
  if (!inSouthwestBox(x, z)) return ground;
  let mix = terrainMix(x, z);
  const seam = southwestSeamWeight(x, z);
  if (seam > 0) {
    const complete = seamlessTerrainMix(x, z);
    // These joins are outside the village and terrain pads. Retain the world's
    // beach attenuation rather than lifting the sea with an inland correction.
    const before = mix.base + relief(x, z, mix.amp, mix.wave);
    const after = complete.base + relief(x, z, complete.amp, complete.wave);
    ground += (after - before) * seam * smooth(2, 40, landDistance(x, z));
    const weights = Object.fromEntries(SOUTHWEST_REGIONS.map(name => [name, lerp(mix.weights[name] ?? 0, complete.weights[name] ?? 0, seam)]));
    mix = { ...mix, base: lerp(mix.base, complete.base, seam), weights };
  }
  const raw = southwestWeight(x, z, mix);
  if (raw <= 0) return ground;
  const bank = smooth(.05, .30, raw), own = smooth(.3, .8, raw);
  const navarth = regionShare('Navarth', x, z, mix);
  const desert = regionShare('Ganesh Desert', x, z, mix);
  const plain = regionShare('Ganesh Plain', x, z, mix);
  const pyros = regionShare('West Pyros', x, z, mix);
  const hamada = regionShare('North Meroshe Desert', x, z, mix);
  const skirt = regionShare('West Meroshe Desert', x, z, mix);
  const erg = regionShare('Central Meroshe Desert', x, z, mix);
  const cape = regionShare('Cape Heth', x, z, mix);
  const plateau = regionShare('Dinelv Highlands', x, z, mix);
  const hama = regionShare('Hama', x, z, mix);
  const marosh = regionShare('Marosh', x, z, mix);
  const trogo = regionShare('Trogo', x, z, mix);
  const tilt = southwestSlope(x, z) * bank
    + ganeshBasin(x, z, desert) + ganeshPlainFall(x, z, plain) + pyrosFall(x, z, pyros)
    + merosheSkirt(x, z, skirt) + merosheSink(x, z, erg);
  let height = ground + tilt + navarthCrests(x, z, navarth) + ganeshStone(x, z, desert)
    + merosheBenches(x, z, hamada) + merosheFans(x, z, skirt) + merosheDunes(x, z, merosheErg(x, z, erg))
    // Job 3's three. The cape's one ridge; the plateau's ridge systems and its three mesas, taken as
    // one maximum because a mesa on a ridge is the ridge's own high point; and Hama's broken ground,
    // which is gated on the dry half of it by `hamaGreen`.
    + hethSpine(x, z, cape)
    + (plateau > 0 ? Math.max(dinelvRidgeAt(x, z).lift, dinelvMesaAt(x, z).lift) * plateau : 0)
    + hamaBroken(x, z, hama, hamaGreen(x, z, mix))
    // Job 4's two, and both are one crest apiece. Marosh's ridge is the wall the Meroshe stands behind,
    // notched once at the water gap; Trogo's is the ridgeline the lore hangs the whole rainforest on,
    // laid along the seven hexes the atlas puts against the desert. **Nothing is authored on either
    // country's outward margin**: the front against the Meroshe is the hex blend carrying a base
    // difference, which is the West Lotharn's contract and the Dinelv escarpment's.
    + maroshRidge(x, z, marosh) + trogoCrest(x, z, trogo);
  const near = nearestSouthwestRiver(x, z);
  const swale = southwestSwaleWeight(x, z, bank, near);
  // The designed surface: the blend's own base, the tilt, and no relief at all.
  if (swale > 0) height = height + (mix.base + tilt - height) * swale;
  height += ganeshWashCut(x, z, desert) + ganeshPlainChannelCut(x, z, plain) + ganeshDepressionCut(x, z, plain)
    + hethHollows(x, z, cape) + dinelvBasins(x, z, plateau) + dinelvChannelCut(x, z, plateau)
    + hamaBedCut(x, z, hama) + maroshCombeCut(x, z, marosh) + trogoGullyCut(x, z, trogo);
  // **The salt pan is levelled, not cut**: a playa is flat to the centimetre over hundreds of metres.
  const salt = skirt > 0 ? onSaltPan(x, z) * skirt : 0;
  if (salt > 0) height = lerp(height, saltPanLevel(), salt);
  // **The one way up the escarpment is levelled toward a constant grade**, the swale's machinery turned
  // on its side. It is applied before the bedding, so the bands run across the ramp rather than being
  // flattened out of it: a graded road cut through bedded rock still shows the courses in its sides.
  if (plateau > 0) {
    const ascent = dinelvAscentAt(x, z);
    if (ascent && ascent.weight > 0) height = lerp(height, dinelvAscentLevel(ascent.along), ascent.weight * plateau);
    // **The bedding, last, because it is a function of the finished height and nothing else** - which is
    // what makes it horizontal by construction. It moves no ground by more than 1.1 m and changes the
    // total fall of the escarpment by nothing at all.
    height += dinelvBands(height, plateau);
  }
  return height;
}

/**
 * Whether the scatter must keep off a point for this block's own reasons: a dry bed's floor, or the
 * salt pan's crust, where nothing roots at all because the ground it would root in is brine.
 */
export const southwestClear = (x, z, margin = 0) => onWashFloor(x, z, margin) || onChannelFloor(x, z, margin)
  || onSaltPan(x, z, margin) > .25 || onDinelvChannelFloor(x, z, margin);

// ---------------------------------------------------------------------------
// The colour of the ground
// ---------------------------------------------------------------------------
/**
 * Four grounds the atlas's terrain field cannot colour, for the reason Gala's, the Oves's and the
 * Mithala's could not be: the field says `plains` in all four countries and means several different
 * things, and what decides the colour here changes over a hundred metres where the terrain word
 * changes over a hex.
 *
 * What decides it is **how dry the air is** (`southwestAridity`, which is a gradient across the
 * whole block), **whether the wind has swept the sediment off** (`ganeshLie`, which changes over
 * forty metres in the desert), **whether a point is in one of the Ganesh Plain's depressions**,
 * which is where all the grass on that plain is, and **whether it is on the damp reach**, which is
 * the only green in the desert.
 *
 * Hooked into `groundTint` (src/world/terrain/world-terrain.js) for these four countries' own swatches only;
 * everywhere else it answers null and nothing changes.
 */
export const SOUTHWEST_GROUND = freeze({
  swept: 0x7a7159,     // the wind's own floor: pale stone under a skin of grit, the driest colour in the game
  pocket: 0x685f45,    // where the fine sediment has gathered a hand deep, and darker for it
  green: 0x68753f,     // the two wet corners, and the depressions on the plain
  damp: 0x5c6c3f,      // the damp reach in the south wash, the one green thing in the Ganesh
  // The four Meroshe surfaces. **These are the whole of how four countries with one terrain word and
  // one climate code are told apart from the air**, and they are the four real colours of a hot
  // desert: bare rock, sand, varnished pavement, salt.
  rock: 0x67644f,      // hamada: bedrock under a skin of grit - grey where everything else here is warm
  sand: 0x7e7250,      // erg: clean quartz sand, the warmest and lightest ground in the block
  reg: 0x352a1c,       // reg: close-packed pebbles under desert varnish, the darkest dry ground in the game
  crust: 0x9c9a89,     // sabkha: a salt crust, and the only near-white the block is allowed
  // Job 3's five. The two escarpment stones are the lore's own two - "the lower bands are the
  // warm-toned desert stone that the Dinelv construction trade prizes; the upper bands shift to a
  // harder, darker stone" - and they are read off height, which is what a bedding plane is.
  // **All five were pulled a third darker after the first review render**, which is job 2's lesson met
  // for the second time: the renderer reads an authored colour as linear and lifts it a long way, so
  // the first set - chosen as numbers - came back on screen as pale tan on the escarpment and as a
  // sand spit on the cape. The warm stone in particular had to go a long way down, because mixing a
  // warm colour into a ground at up to sixty per cent pushes the whole country orange.
  warmStone: 0x53422a, // the lower escarpment bands: the warm-toned stone the Dinelv trade quarries
  hardStone: 0x37362c, // the upper bands and the mesa caps: harder, darker, no commercial appeal
  capeRock: 0x47453a,  // Cape Heth's grey-brown marine sandstone, soft enough to cut with hand tools
  spray: 0x5c5a51,     // the weather face: salt-bleached bare rock where nothing roots
  meadow: 0x394d22,    // Hama's `Csb` half - the greenest ground in the southwest, and the only wet one
  // Job 4's five, and one of them takes a record off job 2. **`canopy` is the darkest ground in the
  // game**, darker than the reg's desert varnish, and it has to be: the floor of a closed tropical
  // canopy gets a few per cent of the light that falls on the top of it, and job 1's arithmetic about
  // the haze applies twice over here, because Trogo's haze is six times the density job 1 was measuring.
  maquis: 0x2f3d1d,    // Marosh's ridge: holm oak and dense evergreen scrub on a `Csb` crest
  terrace: 0x5d6331,   // Marosh's `Csa` terrace, bleached olive by the end of a hot dry summer
  canopy: 0x1c2415,    // Trogo's forest floor under closed canopy - the darkest ground in the game
  cloudFloor: 0x333f2d, // the fog forest's own floor: moss and wet leaf, greyer and lighter than the canopy
  saltPruned: 0x54602d, // the coastal collar where the forest stops, salt-pruned and hot-summer dry
});
const SWATCHES = freeze(new Set(SOUTHWEST_REGIONS.flatMap(name => {
  const profile = REGION_TERRAIN[name];
  return [profile.ground, ...Object.values(profile.byTerrain ?? {}).map(entry => entry.ground)];
})));
const mixHex = (from, to, t) => {
  const k = clamp(t, 0, 1);
  const channel = shift => { const a = (from >> shift) & 255, b = (to >> shift) & 255; return Math.round(a + (b - a) * k) & 255; };
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
};
const hexOf = swatch => (typeof swatch === 'string' ? parseInt(swatch.replace('#', ''), 16) : swatch);
/**
 * **The per-country tints as one table walked in order, which is the last thing the southwestern
 * programme owed itself.**
 *
 * This was a chain: four block-wide terms, then three `if (inBox(...))` blocks with a nested
 * `if (share > 0)` per country inside each. **The shape failed silently twice.** Job 2 found that
 * `southwestTint` had been computed in `groundTint` and dropped on the floor since the day the block was
 * built, so four countries' authored colour had never once been drawn; job 3 met the same failure mode
 * one level down here, where an early `return` for the Meroshe would have thrown the Dinelv plateau's
 * colours away on the three hundred metres its box overlaps `MEROSHE_BOX`. A missing branch in a chain
 * like that produces no error, no warning and no visible difference until somebody photographs the right
 * place. So: **adding a country's colour is adding a row here, and a missing row is a missing row.**
 *
 * Each row names the country it speaks for (`region`, or `null` for the one term that is the whole
 * block's) and paints by returning a colour. The order is the chain's own, to the call, because mixing is
 * not commutative: the block's aridity first, then the Ganesh's swept floor, the Ganesh Plain's
 * depressions, the damp reach, the four Meroshe surfaces, the three western-edge countries and the two
 * eastern ones. The group boxes are gone with the chain and nothing is lost by it: `regionShare` already
 * answers 0 outside a country's own box, and each country's box is inside its group's by construction.
 *
 * `tests/southwest-world.test.js` holds two guards on it: **every row must move the colour of the ground
 * somewhere on its own country's hexes**, and **every one of the thirteen countries must be tinted
 * somewhere in it** - so a row that quietly stops painting turns the test red with its own id in the
 * message, and a country whose row was never written turns it red with its own name.
 */
const SOUTHWEST_TINTS = freeze([
  /**
   * The block's own gradient, and the only row that is not one country's: `southwestAridity` runs across
   * all thirteen, and what it decides at the wet end of it is the two green corners - Navarth's north
   * wood and West Pyros's green tip - which have no other row and are coloured by this one alone.
   */
  freeze({ id: 'aridity', region: null, paint: (colour, x, z) => {
    const dry = southwestAridity(x, z);
    return dry < .55 ? mixHex(colour, SOUTHWEST_GROUND.green, smooth(.55, .12, dry) * .8) : colour;
  } }),
  /** The Ganesh's swept floor and its sediment pockets, which change over forty metres. */
  freeze({ id: 'ganesh-lie', region: 'Ganesh Desert', paint: (colour, x, z) => {
    const lie = ganeshLie(x, z);
    return lie > 0 ? mixHex(colour, lie > .5 ? SOUTHWEST_GROUND.swept : SOUTHWEST_GROUND.pocket, Math.abs(lie - .5) * 1.3) : colour;
  } }),
  /** The Ganesh Plain's depressions, which is where all the grass on that plain is. */
  freeze({ id: 'ganesh-plain-pans', region: 'Ganesh Plain', paint: (colour, x, z) => {
    const pan = inDepression(x, z);
    return pan > 0 ? mixHex(colour, SOUTHWEST_GROUND.green, smooth(.05, .8, pan) * .55) : colour;
  } }),
  /** The damp reach in the south wash, which is the only green in the desert. */
  freeze({ id: 'ganesh-damp', region: 'Ganesh Desert', paint: (colour, x, z) => {
    const damp = ganeshDamp(x, z);
    return damp > 0 ? mixHex(colour, SOUTHWEST_GROUND.damp, smooth(.05, .7, damp) * .8) : colour;
  } }),
  /**
   * The four Meroshe surfaces, in the order a traveler crossing from the Ganesh Plain meets them.
   * **The rock and the sand are pulled well below the swatch they start from** and the salt crust is
   * the only pale thing allowed, which is job 1's haze lesson taken at its word: at .0024 with a warm
   * dust haze, more than half of every pixel past a hundred and fifty metres is haze rather than
   * ground, so a ground that is honest about a desert on the screen has to be darker than a desert.
   */
  freeze({ id: 'north-meroshe-hamada', region: 'North Meroshe Desert', paint: (colour, x, z, mix) => {
    const rock = regionShare('North Meroshe Desert', x, z, mix);
    return rock > 0 ? mixHex(colour, SOUTHWEST_GROUND.rock, rock * (.58 + merosheBench(x, z).edge * .34)) : colour;
  } }),
  freeze({ id: 'central-meroshe-erg', region: 'Central Meroshe Desert', paint: (colour, x, z, mix) => {
    const erg = merosheErg(x, z, regionShare('Central Meroshe Desert', x, z, mix));
    return erg > 0 ? mixHex(colour, SOUTHWEST_GROUND.sand, erg * (.50 + duneProfile(x, z) * .42)) : colour;
  } }),
  freeze({ id: 'south-meroshe-reg', region: 'South Meroshe Desert', paint: (colour, x, z, mix) => {
    const varnish = merosheVarnish(x, z, mix);
    return varnish > 0 ? mixHex(colour, SOUTHWEST_GROUND.reg, varnish * .88) : colour;
  } }),
  freeze({ id: 'west-meroshe-fan', region: 'West Meroshe Desert', paint: (colour, x, z, mix) => {
    const skirt = regionShare('West Meroshe Desert', x, z, mix);
    if (skirt <= 0) return colour;
    colour = mixHex(colour, SOUTHWEST_GROUND.rock, skirt * merosheFan(x, z) * .52);
    const salt = onSaltPan(x, z) * skirt;
    return salt > 0 ? mixHex(colour, SOUTHWEST_GROUND.crust, smooth(.05, .75, salt) * .94) : colour;
  } }),
  /**
   * **Cape Heth is one rock and one gradient across it**: grey-brown sandstone everywhere, bleached
   * pale where the sea gets at it and darkened toward the ordinary swatch in the lee hollows, which
   * are the only ground on the cape with soil in them.
   */
  freeze({ id: 'cape-heth-sandstone', region: 'Cape Heth', paint: (colour, x, z, mix) => {
    const cape = regionShare('Cape Heth', x, z, mix);
    if (cape <= 0) return colour;
    colour = mixHex(colour, SOUTHWEST_GROUND.capeRock, cape * .66);
    const salt = hethSpray(x, z);
    if (salt > 0) colour = mixHex(colour, SOUTHWEST_GROUND.spray, smooth(.15, .95, salt) * .74);
    const hollow = inHethHollow(x, z) * cape;
    return hollow > 0 ? mixHex(colour, SOUTHWEST_GROUND.green, smooth(.1, .9, hollow) * .30) : colour;
  } }),
  /**
   * **The plateau is coloured by height, because a bedding plane is a height.** The lore names two
   * stones and says which is where: warm-toned low on the face, harder and darker above it. So the
   * mix runs from `warmStone` at the escarpment foot to `hardStone` on the mesa caps, with the
   * bedding's own sine on top of it so the individual courses read as courses - the one thing that
   * says the mesa flanks and the escarpment face are the same rock.
   */
  freeze({ id: 'dinelv-bands', region: 'Dinelv Highlands', paint: (colour, x, z, mix) => {
    const plateau = regionShare('Dinelv Highlands', x, z, mix);
    if (plateau <= 0) return colour;
    const height = groundLevelFor(x, z);
    const warm = 1 - smooth(22, 96, height);
    colour = mixHex(colour, SOUTHWEST_GROUND.warmStone, plateau * warm * .62);
    colour = mixHex(colour, SOUTHWEST_GROUND.hardStone, plateau * smooth(66, 172, height) * .70);
    const course = .5 + .5 * Math.sin(height * 6.2831853 / DINELV_BANDS.period);
    colour = mixHex(colour, course > .5 ? SOUTHWEST_GROUND.hardStone : SOUTHWEST_GROUND.warmStone,
      plateau * Math.abs(course - .5) * .46);
    const basin = inDinelvBasin(x, z) * plateau;
    return basin > 0 ? mixHex(colour, SOUTHWEST_GROUND.green, smooth(.08, .85, basin) * .34) : colour;
  } }),
  /**
   * **Hama is the one country in the block that is allowed to be green**, and the mix is the aridity
   * field's own answer: `meadow` where the map says `Csb`, nothing at all where it says `BWh`, and the
   * whole change over two hundred paces. The winter beds are greener again, because they are the only
   * damp ground in the southwest outside the Vaellir.
   */
  freeze({ id: 'hama-sward', region: 'Hama', paint: (colour, x, z, mix) => {
    const hama = regionShare('Hama', x, z, mix);
    if (hama <= 0) return colour;
    const green = hamaGreen(x, z, mix);
    if (green > 0) colour = mixHex(colour, SOUTHWEST_GROUND.meadow, smooth(.04, .9, green) * .80);
    const bed = inHamaBed(x, z) * hama;
    if (bed > 0) colour = mixHex(colour, SOUTHWEST_GROUND.damp, smooth(.05, .8, bed) * .68);
    return mixHex(colour, SOUTHWEST_GROUND.swept, hama * (1 - green) * hamaLie(x, z) * .34);
  } }),
  /**
   * **Marosh is coloured by how high on the ridge a point stands**, which is the same thing the climate
   * field is coloured by: the eight `Csb` hexes are the eight `hills` hexes, so the crest is oak and
   * maquis and the terrace below it is hot-summer grass. The four combes are the only damp ground.
   */
  freeze({ id: 'marosh-ridge', region: 'Marosh', paint: (colour, x, z, mix) => {
    const marosh = regionShare('Marosh', x, z, mix);
    if (marosh <= 0) return colour;
    const crest = maroshCrest(x, z);
    colour = mixHex(colour, SOUTHWEST_GROUND.maquis, marosh * smooth(.12, .86, crest) * .78);
    colour = mixHex(colour, SOUTHWEST_GROUND.terrace, marosh * (1 - smooth(.05, .62, crest)) * .56);
    const combe = inMaroshCombe(x, z) * marosh;
    return combe > 0 ? mixHex(colour, SOUTHWEST_GROUND.damp, smooth(.05, .8, combe) * .62) : colour;
  } }),
  /**
   * **Trogo is coloured by how much of a point is thicket and how high it stands**, in that order, and
   * the two of them are the whole country: a closed canopy floor, a mossy cloud-forest floor on the
   * crest, a lighter break wherever a way or a clearing opens the canopy, and the salt-pruned collar of
   * the southern shore where the forest stops. The clearings and the ways are painted *lighter* than
   * the floor between them, which is the reverse of everything else in this block and is the only way a
   * corridor reads as a corridor from above: what a light gap in a rainforest is, is light.
   */
  freeze({ id: 'trogo-canopy', region: 'Trogo', paint: (colour, x, z, mix) => {
    const trogo = regionShare('Trogo', x, z, mix);
    if (trogo <= 0) return colour;
    const thicket = smooth(.28, .88, trogoThicket(x, z));
    colour = mixHex(colour, SOUTHWEST_GROUND.canopy, trogo * thicket * .9);
    colour = mixHex(colour, SOUTHWEST_GROUND.saltPruned, trogo * (1 - thicket) * .72);
    const fog = trogoFogForest(x, z);
    if (fog > 0) colour = mixHex(colour, SOUTHWEST_GROUND.cloudFloor, trogo * thicket * smooth(.1, .9, fog) * .64);
    const open = Math.max(inTrogoClearing(x, z), smooth(TROGO_WAY.open, .95, trogoWay(x, z)) * thicket);
    return open > 0 ? mixHex(colour, SOUTHWEST_GROUND.cloudFloor, trogo * open * .5) : colour;
  } }),
]);
/** The rows in the order they are walked, for the guard. */
export const SOUTHWEST_TINT_ROWS = freeze(SOUTHWEST_TINTS.map(row => row.id));
/** Which country each row speaks for, by row id, and `null` for the one row that is the whole block's. */
export const SOUTHWEST_TINT_REGIONS = freeze(Object.fromEntries(SOUTHWEST_TINTS.map(row => [row.id, row.region])));
/** One row of the table on its own, so the guard can ask whether that row paints anything. */
export const southwestTintRow = (id, colour, x, z) =>
  SOUTHWEST_TINTS.find(row => row.id === id).paint(colour, x, z, terrainMix(x, z));

export function southwestTint(x, z, ground) {
  if (!inSouthwestBox(x, z) || !SWATCHES.has(ground)) return null;
  const own = southwestShare(x, z);
  if (own <= 0) return null;
  const base = hexOf(ground), mix = terrainMix(x, z);
  let colour = base;
  for (const row of SOUTHWEST_TINTS) colour = row.paint(colour, x, z, mix);
  return colour === base ? null : colour;
}
/**
 * The plateau's finished height at a point, for the tint alone. The tint runs outside the ground pass
 * and has no height in hand, so it asks for one - and it asks the same way the salt pan's own level does,
 * through the blend's base and this block's tilt plus the plateau's own landforms, rather than calling
 * back into the terrain chain (which would recurse through `groundTint`).
 */
function groundLevelFor(x, z) {
  const mix = terrainMix(x, z);
  const base = mix.base + southwestSlope(x, z) * smooth(.05, .30, southwestWeight(x, z, mix));
  const plateau = regionShare('Dinelv Highlands', x, z, mix);
  const trogo = regionShare('Trogo', x, z, mix);
  const marosh = regionShare('Marosh', x, z, mix);
  if (plateau <= 0 && trogo <= 0 && marosh <= 0) return base;
  // Job 4's two crests are here for `trogoBand`'s sake, which sorts the rainforest by altitude and is
  // read by the tint and the scatter both. Without the crest in it the band would read the blend's own
  // base and call the top of the ridge the middle of the slope.
  const lift = plateau > 0 ? Math.max(dinelvRidgeAt(x, z).lift, dinelvMesaAt(x, z).lift) * plateau : 0;
  return base + lift + (plateau > 0 ? dinelvBasins(x, z, plateau) : 0)
    + trogoCrest(x, z, trogo) + maroshRidge(x, z, marosh);
}

// ---------------------------------------------------------------------------
// The places
// ---------------------------------------------------------------------------
/**
 * The natural places worth a name on the chart.
 *
 * **One name is taken and nothing is coined.** This is the first block in the west whose people's
 * tongue is actually in `world-builder/azhoran_language_profiles.py` - there is a `pyrosi` profile,
 * where there is no Mithali, no Ovesi and no Lothi - and `src/gameplay/skills/languages.js` carries it with its
 * lexicon. So the great river is **the Vaellir**, which is that lexicon's own word for a river,
 * used the way an Avon is a river: the tongue's word rather than an invention. Everything else is
 * either the lore's own word (the Ganesh, the Navarth Plateau, the washes, the depressions) or
 * plain English. The Ganesh's own name is left entirely alone, because `ganesh_desert.md` is
 * emphatic that it is pre-Moreshi and that "whoever named this desert named it in a way that no
 * current language on the peninsula can explain".
 *
 * Two places are named for what is *not* on them, because leaving them unnamed would be dishonest
 * about the ground: **the Vaellir's ford**, which is the only crossing of the largest river in this
 * quarter and has nothing built at it, and **the damp reach**, which is where the lore puts a
 * caravan waystation and where there is none.
 */
const onCourse = (course, t, offset = 0) => {
  const samples = course.samples;
  const sample = samples[clamp(Math.round((samples.length - 1) * t), 0, samples.length - 1)];
  if (!offset) return point(sample.x, sample.z);
  for (const side of [1, -1]) {
    const x = sample.x + sample.nx * offset * side, z = sample.z + sample.nz * offset * side;
    if (SOUTHWEST_REGIONS.includes(hexOwnerAt(x, z))) return point(x, z);
  }
  return point(sample.x, sample.z);
};
const onWash = (wash, t) => {
  const line = wash.line;
  const index = clamp(Math.round((line.length - 1) * t), 0, line.length - 1);
  return point(line[index].x, line[index].z);
};

export const SOUTHWEST_LANDMARKS = freeze([
  // ----- Navarth -----
  freeze({ id: 'navarth-plateau', name: 'The Navarth Plateau', x: -3330, z: 1150,
    description: 'The high ground of this whole quarter of the continent: a worn tableland standing forty metres over the plain on the one side and thirty over the desert on the other, open in every direction, with broad sweeps of bare scrub between rounded swells of pale stone. The lore calls Navarth cold plateau country. The map says hot desert, and the map wins: what this altitude buys here is not snow but a night you can feel, and a wind off the open ground that never stops.' }),
  freeze({ id: 'navarth-swells', name: 'The Swells', x: -3300, z: 1068,
    description: 'Ten rounded rises through the middle of the plateau, none of them more than fifteen metres over the sweeps between them and every one of them visible from the last. Worn round rather than cut, with the stone showing grey through the thin soil along their tops. The Pyrosi of this country keep their fire ceremonies on ground like this, at places that stand where a fumarole would be if the volcanic rock reached this far north. There is no fire on any of these.' }),
  freeze({ id: 'navarth-west-rim', name: 'The Western Rim', x: -3480, z: 1200,
    description: 'Where the plateau ends. Four swells in a line along the western edge, and from the top of any of them the ground goes down thirty metres and then does not come up again: the Ganesh runs from the foot of this rim to a horizon that has nothing on it at all. It is the one view in the southwest that explains the geography in a single look.' }),
  freeze({ id: 'navarth-wood', name: 'The North Wood', x: -3300, z: 900,
    description: 'The block’s one hex of forest, at Navarth’s north-eastern tip, where the air turns Mediterranean for two hexes and the Ibenwood’s southern edge begins. Oak and pine standing well apart on a shoulder falling north-east, with the desert scrub thinning out behind them and the great forest going on north out of sight. Two hundred paces south of the last tree it has not rained properly in years.' }),
  // **Twenty-six metres off the water became thirty, and the reason is the world box.** Growing the
  // world west for Cape Heth shifted every vertex of the renderer's coarse band, and at twenty-six
  // this place stood on a bank the seven-metre grid cannot follow: measured, 1.56 m buried in the
  // drawn ground against a limit of 1. Four metres further back it reads -0.02. **This is exactly
  // what job 1 had to do to a Mithala landmark when it grew the world west**, for exactly the same
  // reason, and it is the second time the box has done it.
  freeze({ id: 'alezhor-water', name: 'The Alezhor Water', ...onCourse(ALEZHOR_WATER, .45, 30),
    description: 'A small river running west along the top of Navarth and then down the Ganesh’s north-eastern edge to the sea. It rises in the green grassland country over the northern border and gains nothing at all on the way through: what reaches the gulf is what left Alezhor, less what the ground and the air took. Waded anywhere along it, and the only running water in eighty hexes.' }),
  // ----- West Pyros -----
  freeze({ id: 'the-vaellir', name: 'The Vaellir', ...onCourse(VAELLIR, .55, 30),
    description: 'The great river of the southwest and the second the atlas draws large, after the Lizeem itself. It comes down the whole of West Pyros’s eastern side out of the Pyros hill country, growing from a gravel head a traveler wades to a hundred paces of slow green water nobody crosses. The far bank is East Pyros and there is no way to it here, or anywhere below the ford. The lore’s Gala stands on a terraced hill above a confluence somewhere on this water; it is not on this ground and it is not built.' }),
  freeze({ id: 'vaellir-ford', name: 'The Vaellir Ford', ...onCourse(VAELLIR, .12, 22),
    description: 'The head of the river, where it still runs shallow and quick over gravel: shin-deep, forty paces across, and the only place in a day’s walk that either bank can be reached from the other. Nothing is built at it. Everything that has ever crossed this river on foot has crossed it here.' }),
  freeze({ id: 'vaellir-mouth', name: 'The Vaellir Mouth', ...onCourse(VAELLIR, .97, 28),
    description: 'Where the river reaches the sea at the southern tip of West Pyros. The banks flatten, the water goes wide and grey with what it is carrying, and the grass on both sides turns green for the last hex and a half - the only properly wet ground in the southwest, and the smallest of the two corners where this block stops being a desert.' }),
  freeze({ id: 'pyros-open-plain', name: 'The Open Plain', x: -2950, z: 1300,
    description: 'The body of West Pyros: semi-arid bunch grass in tussocks with bare pale earth showing between them, falling south for eight hundred metres with nothing on it but the line of trees along the river to the east. The lore calls this the wetter half of Pyros and the most productive farmland on the continent; the map calls it steppe with desert on its western columns, and the terraces and the orchards are somewhere the atlas does not draw.' }),
  freeze({ id: 'pyros-green-tip', name: 'The Green Tip', x: -2560, z: 1660,
    description: 'One hex of Mediterranean grass at the river’s mouth, where the sea and Marosh’s country begin together. Walking south down this plain the grass gets greener over about four hundred paces and then there is a horizon of water. It is the only place in the southwest where anything is green because of the weather rather than because of a hollow in the ground.' }),
  // ----- The Ganesh Desert -----
  freeze({ id: 'ganesh-floor', name: 'The Ganesh', x: -3560, z: 1520,
    description: 'The driest country in Azhora and the largest of these four: thirty-one hexes of hot desert, flat to gently rolling, with no canyon, no escarpment and nothing whatever between a traveler and the horizon. The surface is a thin skin of pale sediment over stone, swept down to grit on every rise and gathered a hand deep in every pocket. Scrub the height of a knee stands far enough apart to walk between, each plant with roots reaching further out than it stands tall, and between them nothing.' }),
  freeze({ id: 'ganesh-wind-grain', name: 'The Wind Grain', x: -3620, z: 1400,
    description: 'The long low ridges the summer wind has combed into the sediment, running north-west to south-east across the whole desert two hundred paces apart and half a metre high. In a country with no landmark at all they are the one thing that can be steered by, and they point where the wind comes from: out of the north-west, hot and drying, all summer.' }),
  freeze({ id: 'ganesh-washes', name: 'The Washes', ...onWash(GANESH_WASHES[0], .5),
    description: 'Two cut beds crossing the desert from east to west with nothing in either of them. They carry the Ganesh Plain’s channels on toward the gulf in the wet years and are dry in every other, floored with coarse gravel, deep enough to stand in and out of the wind, and walked down the middle as a road. Neither reaches the shore: a bed that runs once in five years does not keep a mouth open.' }),
  freeze({ id: 'ganesh-damp-reach', name: 'The Damp Reach', ...onWash(GANESH_WASHES[1], .5),
    description: 'A hundred and twenty metres of the south wash where the water below the gravel comes near enough the surface to keep something alive: grey-green scrub standing in a dry bed, twice the size of anything within a mile of it, and nothing at all to drink. The lore puts the caravan waystations at points like this one, at the old water places with worked stone round them. There is nothing here but the scrub.' }),
  freeze({ id: 'ganesh-shore', name: 'The Gulf Shore', x: -3740, z: 1240,
    description: 'The strangest thing in the southwest: a desert that runs out at the sea. The scrub thins, the sediment turns to sand within forty paces, and the water is there - and the ground a hundred paces inland is as dry as the ground twenty miles in. The Alezhor Water comes in beside it, having crossed the desert without gaining a drop.' }),
  // ----- The Ganesh Plain -----
  freeze({ id: 'ganesh-plain-channels', name: 'The Drainage Channels', x: -3010, z: 1660,
    description: 'Three shallow cuts across the plain, a metre deep and nine across, too diffuse to be called rivers by anybody who has seen one. Two run west into the Ganesh and the third leaves the same low ground going the other way, to the sea. They carry water in the wet years and lie dry in the drought years, which is most of them, and this is a drought year. The pastoral communities of this plain know every one of them by name and read the state of the grass in them the way other people read a calendar.' }),
  freeze({ id: 'ganesh-depressions', name: 'The Depressions', x: -2880, z: 1700,
    description: 'Eight shallow closed hollows strung along the channels, a metre below the plain and a hundred and fifty paces across, and every one of them greener than the ground round it. Water gathers in them, the clay holds it longer than the desert’s rock does, and the grass lasts weeks longer. On this plain in a dry year the depressions are the only green there is, and every route across it goes from one to the next.' }),
  freeze({ id: 'ganesh-plain-divide', name: 'The Divide', x: -2700, z: 1790,
    description: 'The low rise along the eastern side of the plain, and it is a divide a traveler walks over without noticing. West of it every drop goes to the Ganesh and is gone; east of it the ground falls a few hundred paces to the sea. Two metres of rise decide it, and on ground this flat two metres is what a watershed is.' }),
  freeze({ id: 'ganesh-plain-green-corner', name: 'The Green Corner', x: -2620, z: 1780,
    description: 'The south-eastern corner, where Marosh’s country begins: one hex of Mediterranean grass and three of something between that and desert, all of it a different colour from the plain behind it. The lore calls this whole plain ground that cannot decide which zone it belongs to, and this corner is where the argument is settled in favour of the green.' }),
  // ----- The North Meroshe Desert: the hamada -----
  freeze({ id: 'meroshe-hamada', name: 'The Hamada', x: -2950, z: 2110,
    description: 'The northern transition of the great desert, and it is not sand: it is rock. A floor of bare bedrock under a skin of gravel, swept clean, ringing under a boot, with the hard beds standing out of it in low steps a metre or two high that run north and south for three hundred paces at a time. The lore calls it "the rocky hammada of the northern transition zone — flat gravel plains and exposed bedrock where scrubby thorn trees still manage to exist", and that is exactly what stands here: thorn, and nothing else, and a great deal of stone.' }),
  freeze({ id: 'meroshe-benches', name: 'The Stone Steps', x: -3110, z: 2100,
    description: 'Nine low escarpments crossing the hamada from north to south, each of them a metre or two of riser and then a long back slope to the next. They are the outcrops of harder beds dipping east off the Dinelv highland, and they are the only thing in this country that gives a direction: the sand sea one hex south runs north-west to south-east on the wind, and the stone runs north and south on the rock, so a traveler who knows which way the lines go knows which country they are standing in.' }),
  freeze({ id: 'meroshe-thorn', name: 'The Thorn Ground', x: -2860, z: 2020,
    description: 'The only trees in ninety-five hexes of desert, and they are growing out of a crack in a rock. Thorn, waist-high to head-high, rooted in the joints of the bedrock where the last rain went and stayed — a dozen paces apart where the joints are close and half a mile apart where they are not. Nothing else in the Meroshe is tall enough to stand in the shade of.' }),
  freeze({ id: 'meroshe-dust-line', name: 'The Dust Line', x: -2900, z: 1940,
    description: 'Where the Ganesh Plain stops. Walking south off the plain the pale clay thins over about two hundred paces, the grass tufts give out one by one, and then there is stone underfoot and nothing standing anywhere. There is no ridge, no river and no line on any map: the plain simply runs out of soil. It is the northern door of the whole Meroshe and there is nothing at it.' }),
  freeze({ id: 'meroshe-green-shoulder', name: 'The Green Shoulder', x: -2730, z: 1950,
    description: 'The north-eastern corner, and on the atlas the one place in the Meroshe where a traveler could see green. Two hexes east the ground goes up into Marosh’s Mediterranean hills — grass, olive, oak scrub, winter rain — and from the last of the hamada it is a low green shoulder on the horizon with heat shimmer between. The distance is under a mile and the difference is a climate. **The promise this landmark was written as has come true.** Job 2 wrote it about unbuilt country and job 4 built Marosh: what stands on that horizon now is the ridge itself, seventy-four metres of base with holm oak and maquis on it, a hundred and thirty metres east of here — and the aridity under a traveler’s boots at this corner has gone from the flat 1.000 job 2 measured to 0.922, because a country with no desert hex in it is one hex away. The far side of the argument is still the real thing here: hot desert to the last hex and a dry wind coming off the crest.' }),
  // ----- The West Meroshe Desert: the fan skirt and the salt -----
  freeze({ id: 'meroshe-fan-skirt', name: 'The Fan Skirt', x: -3590, z: 2420,
    description: 'The apron below the Dinelv escarpment: three broad cones of gravel spread south-west out of the highland’s mouths and grown together into one skirt falling to the sea. What a traveler notices is the size of the stones. At the heads they are cobbles a hand across and the walking is bad; four hundred paces down the fan they are pebbles; at the toe they are dust deep enough to print. Water comes down these twice in a decade and the sorting is all it has left behind.' }),
  freeze({ id: 'meroshe-salt-pan', name: 'The Malhat', x: -3500, z: 2560,
    description: 'The one place in ninety-five hexes where water can be seen, and it cannot be drunk. Three hundred paces of floor so flat it has no features at all, floored in a white salt crust that rings under a boot in the dry months and gives way to grey mud under it in the others. This is where the fan skirt’s drainage stops: nothing leaves the Malhat except upward. The Moreshi word for salt is *malhat*, and the pan has no other name.' }),
  freeze({ id: 'meroshe-dry-shore', name: 'The Dry Shore', x: -3700, z: 2440,
    description: 'A desert that runs out at an open ocean, which is the second time this block does it and the more extreme of the two: the Ganesh has a sheltered gulf and this has the whole western sea, with the weather of half a world arriving on it and not a drop of it falling here. Gravel, then sand for forty paces, then surf. A hundred paces inland the ground is as arid as it is twenty miles in, and the only things alive on it came out of the water.' }),
  freeze({ id: 'meroshe-escarpment-foot', name: 'The Escarpment Foot', x: -3660, z: 2350,
    description: 'The northern edge of the fan skirt, where the Dinelv plateau stands up out of the desert. Looking north from here the ground goes up in stepped bands of rock — the warm-toned stone the Dinelv trade quarries low down, the harder dark stone above it — and the seasonal channels that cut the face are visible as dark lines all the way to the rim. The caravan road to the plateau passes somewhere along this foot. It is not built and neither is the plateau.' }),
  // ----- The Central Meroshe Desert: the erg -----
  freeze({ id: 'meroshe-sand-sea', name: 'The Sand Sea', x: -3150, z: 2585,
    description: 'The erg, and the only one in Azhora. Parallel ridges of clean sand running north-west to south-east on the summer wind’s bearing, seven metres from floor to crest and two hundred and thirty paces apart, with a flat gravel corridor between every pair. From the crest of one the next is the horizon. The lore is plain about what this ground is: "the central sand seas are genuinely extreme… Navigating the sand seas without local knowledge is considered one of the more reliable methods of dying on Azhora."' }),
  freeze({ id: 'meroshe-corridors', name: 'The Corridors', x: -2960, z: 2460,
    description: 'The floors between the dunes, and the only fast ground in the sand sea. They are swept flat and hard by the same wind that piled the ridge beside them, and a traveler can walk one at speed for half a mile — north-west or south-east, and no other direction, because that is the way the ridges go. Crossing the erg against the grain means climbing every ridge in turn, and there are a dozen of them.' }),
  freeze({ id: 'meroshe-sink', name: 'The Sink', x: -2920, z: 2520,
    description: 'The reason the sand is here. This whole country lies in a shallow closed basin three and a half metres below its own rim, with no river edge anywhere on it and no outlet in any direction — hamada to the north, a highland skirt to the west, a stone floor to the south and Marosh’s hills to the east. Sand that gets into the Meroshe gets into this, and does not leave.' }),
  freeze({ id: 'meroshe-sand-edge', name: 'The Sand Edge', x: -2780, z: 2610,
    description: 'Where the sand sea gives out. The ridges get lower over about three hundred paces, then broken, then they are just streaks of sand lying on a gravel floor, and the horizon comes back. It is the only place in this country from which the erg can be seen as a thing rather than walked in, and it is where anybody with sense turns round.' }),
  // ----- The South Meroshe Desert: the reg and the fog -----
  freeze({ id: 'meroshe-stone-floor', name: 'The Stone Floor', x: -2800, z: 2800,
    description: 'The reg: a pavement of pebbles packed edge to edge over the whole country, flat enough to see twenty miles across and dark enough to look wet. The colour is desert varnish, a film of iron and manganese that takes an age to form and only forms where the surface never moves — so the ground here is old in a way that the sand sea two hexes north is not, and a footprint on it will still be there next year.' }),
  freeze({ id: 'meroshe-fog-margin', name: 'The Fog Margin', x: -2650, z: 2720,
    description: 'The strangest ground in the Meroshe: desert that gets wet without being rained on. The atlas gives this hex hot desert like all the rest, and the fog off the southern ocean and off Trogo’s ridge comes in over it and stays, sometimes for days — "warm and thick and close", the lore says, not the cold sea-fog of the northern coasts. What it leaves is a crust on the stone, lichen in the lee of every pebble, and thorn standing close enough together to make a traveler walk round it, which nothing else in this desert does.' }),
  freeze({ id: 'meroshe-forest-wall', name: 'The Forest Wall', x: -2560, z: 2640,
    description: 'The eastern edge of the stone floor, and the sharpest boundary the atlas draws anywhere: thirteen hex edges of hot desert against tropical rainforest. Trogo begins at the next hex east and goes up in one wall of dark canopy with cloud sitting in it: "the desert’s last water meets the coast’s first moisture and produces a consequence that neither the desert peoples to the northwest nor the Maroshi kingdom to the north has entirely figured out what to do with: tropical rainforest." **The canopy is on that horizon now.** Job 4 built Trogo, and from the last of the stone floor a traveler sees the forest standing some fifty metres over the desert with cloud in the top of it. The fog had already crossed the line before the forest did, and this is still where it stands thickest; what has changed is that the aridity on these hexes has gone from job 2’s flat 1.000 to between 0.646 and 0.913, which is the wettest code on the map pulling on the driest from one hex away.' }),
  freeze({ id: 'meroshe-south-shore', name: 'The Southern Shore', x: -2860, z: 3040,
    description: 'The bottom of the desert and the bottom of the continent’s southwest: the stone floor runs south until the pebbles turn to shingle and then to the southern ocean, with the whole Meroshe behind it and nothing but water in front. Four hex edges of it, and the fog comes ashore here first.' }),
  // ----- Cape Heth -----
  freeze({ id: 'heth-point', name: 'The Point', x: -4245, z: 1848,
    description: 'The westernmost ground in Azhora, and the only hex on the whole atlas where the map draws the shoreline itself inside somebody’s country: one `coast` hex, with open water on four of its six sides and the cape behind it on the other two. Bare wave-cut grey-brown sandstone three metres above the water, scoured clean, with gravel in the joints and lichen in the lee of anything that stands. The lore says this point is the whole reason the cape matters - "it reaches far enough west into the ocean to be visible at sea when the coast behind it has already dropped below the horizon" - and there is nothing on it at all. Four hundred metres of ocean further west than the Ganesh’s gulf shore, and it is the same desert: a hundred paces inland it has not rained in years.' }),
  freeze({ id: 'heth-spine', name: 'The Spine', x: -4020, z: 1868,
    description: 'The cape’s one landform, and the lore calls it exactly what it is: "the cape’s slight ridge". Six metres at its highest, running the length of the promontory from the point east-north-east, and it decides everything on this ground. Standing on it a traveler has the open ocean on one hand a hundred and fifty paces off and the shelter of its own lee on the other, and the difference between the two sides is the difference between bare rock and the only soil the cape has.' }),
  freeze({ id: 'heth-weather-face', name: 'The Weather Face', x: -4150, z: 1892,
    description: 'The seaward side, which is the side the lore measures storms by: "the ocean-facing slope is low enough that spray overtops it in the largest winter storms; the cape’s residents describe major storm events by how far the salt water got". So there is nothing growing on it for eighty metres up from the water - bare sandstone with the bedding showing, gravel, a crust of salt in the hollows of the rock, and lichen in whatever lies in the lee of a stone. It is hot desert and it is soaked in salt water twice a decade, which is a combination nowhere else in Azhora manages.' }),
  freeze({ id: 'heth-hollows', name: 'The Drainage Hollows', x: -4046, z: 1899,
    description: 'Five shallow closed hollows on the landward flank of the spine, a metre and a half deep and fifty paces across, and every scrap of soil on this cape is in one of them. "Gardens on the soil that has accumulated in the drainage hollows", the lore says, and the hollows are here; the gardens are the cape communities’ and are not built. What stands in them is what a desert puts on soil that keeps a little water: scrub twice the size of anything on the open rock, and a stubble of grass round the lowest part of each.' }),
  freeze({ id: 'heth-bight', name: 'The Heth Bight', x: -3968, z: 1718,
    description: 'The shallow water north of the cape, in the angle between the promontory running west and the Ganesh’s shore running away north-east - "a shallow embayment where the cape and the mainland form two sides of an angle... too shallow for deep-draft vessels but provides additional shelter for the small-boat traffic that moves along the coast". The lore puts it east of the cape; the atlas puts the angle on the north, and the atlas wins. From the shore here the water is flat where the weather face a hundred and fifty paces south has surf on it, which is the whole of what a bight is.' }),
  // ----- The Dinelv Highlands -----
  freeze({ id: 'dinelv-plateau', name: 'The Dinelv Plateau', x: -3420, z: 1900,
    description: 'The first desert highland in the game and the high ground of the whole southwest: a rolling arid upland at a hundred metres and more, hot desert on every one of its thirty-five hexes, with thin soil over bedded rock and scrub so widely spaced that the ground between it is the thing a traveler remembers. "The plateau opens into a rolling upland that extends twenty to forty miles inland before the terrain descends again toward the Meroshe interior." From here the ground falls away on three sides - to the cape on the west, to the Ganesh on the north, to the sand deserts on the south - and on a clear day all three are visible at once, which is a view no other country in Azhora has.' }),
  freeze({ id: 'dinelv-escarpment', name: 'The Escarpment', x: -3786, z: 2075,
    description: 'The way up, and the lore calls it "the most dramatic terrain on the eastern peninsula": eighty metres of exposed sedimentary rock in stepped bands, a tread a traveler can walk and then a riser they cannot, over and over to the rim. The bands are what the rock is - "the older geological layers visible in the cliff faces as horizontal bands of different character. The lower bands are the warm-toned desert stone that the Dinelv construction trade prizes; the upper bands shift to a harder, darker stone" - so the face changes colour as it goes up, warm at the foot and grey at the top. The quarries that cut the warm stone, the road that climbs the face and the day it takes to walk it are all somebody’s. On the south-western corner there is no face at all and no coastal strip: the plateau stands straight over the open ocean, sixty metres of it in fifty paces.' }),
  freeze({ id: 'dinelv-ridges', name: 'The Ridge Systems', x: -3317, z: 1974,
    description: 'Four ridge systems crossing the plateau, "from roughly north to south, aligned with the peninsula’s long axis" - which on the atlas is north-north-east to south-south-west, thirty degrees off due north, and that is the bearing they are laid on. Ten to fifteen metres of crest with a broad swale between each pair, and they are the reason this plateau is not flat and the reason it has passes: a traveler crossing it along the grain walks four hundred paces of open swale, and a traveler crossing against the grain climbs every one of them. The hamada one hex-row south is the dip slope of the same beds, which is why its steps run on almost the same line.' }),
  freeze({ id: 'dinelv-north-pass', name: 'The North Pass', x: -3300, z: 1844,
    description: 'The one place a loaded animal can be walked onto this plateau. "The northern plateau pass is the primary overland connection between Dinelv and the plateau interior, and through the plateau interior, to the caravan routes that cross the Meroshe... The ascent from the city takes a full day on the standard road." Every other margin of this country is an escarpment, and this one is a graded ramp up the northern face at a walking grade the whole way, four hundred paces long, with the bedding still showing in the rock on both sides of it. There is no road surface on it, no cutting, no cistern, no waystation and no garrison: the pass is ground, and the establishment the lore hangs on it is the Maroshi court’s.' }),
  freeze({ id: 'dinelv-middle-saddle', name: 'The Middle Saddle', x: -3647, z: 1967,
    description: 'A gap through the west ridge, and the second of the lore’s two named crossings: "the middle saddle is used by lighter traffic: express riders, small trading parties, and the livestock movements that the highland pastoral communities manage seasonally. It is not maintained to the standard of the northern pass and is not operable for full caravan trains." It is a notch forty paces wide where the ridge simply stops and starts again, with the crest standing ten metres over it on either hand. The smaller gaps in the other ridges are the routes the Registry calls "local use" and does not record; there are three of them and nothing at any of them.' }),
  freeze({ id: 'dinelv-massifs', name: 'The Tables', x: -3419, z: 1844,
    description: 'Three flat-topped blocks standing sixty and seventy metres over the plateau with sides too steep to walk, and they are the only three hot-desert `mountain` hexes on the whole atlas. That climate code is what decides what they are: a summit high enough to be a mountain in the Lotharn sense would carry snow at the top, and the map’s author wrote hot desert, so these are not peaks - they are what is left of a higher and older plateau surface that the desert has stripped away round them, with the same horizontal courses running across their flanks that run along the escarpment face. Two of them stand on one ridge line and the third on the next ridge west. The ridge-exposure mines the lore puts on ground like this, and the families who know where the good stone runs, are people’s.' }),
  freeze({ id: 'dinelv-basins', name: 'The Water Points', x: -3399, z: 1989,
    description: 'Six closed hollows in the plateau, nine to fourteen metres below the ridges round them, with no outlet from any of them - and on an arid upland with thin soil over rock, a hollow with no outlet is the only place water goes. The lore names them by what they do: "the deeper-rooted plants occupying the water-concentration points that only become visible in wet years when they green faster than the surrounding ground". So the scrub in these is twice the size of the scrub outside them and stands close enough together to walk round, and everything else on this plateau is spaced wide. The pastoral communities who move between them - higher and inland in the wet months, down toward the escarpment in the dry summer - are the plateau’s own people and none of them is built.' }),
  // ----- Hama -----
  freeze({ id: 'hama-green-line', name: 'The Line', x: -3206, z: 2880,
    description: 'Where the desert stops, and the only place in the southwest where it stops in something green. Walking inland from the grass a traveler watches it happen over about two hundred paces: the sward breaks into tussocks, the tussocks stand further apart, the soil thins to grit between them, and then there is gravel underfoot and a stony rise ahead and the Meroshe beyond it. The atlas draws this line twice over - nine `grassland` hexes that are every one of them Mediterranean and ten `plains` hexes that are every one of them hot desert, with no hex where the two fields disagree - which makes it the only boundary in this block that the map states rather than implies. It has no name in the lore and nothing is built on it.' }),
  freeze({ id: 'hama-grass', name: 'The Seaward Grass', x: -3200, z: 2973,
    description: 'Two hexes of real Mediterranean country at the bottom corner of the continent: winter-rain grass thick enough to walk through, low evergreen scrub in the hollows, and a few trees leaning inland off the sea wind. After two hundred hexes of desert it is the first ground in this block since the Vaellir’s mouth where the green is because of the weather and not because of a hollow. The lore is careful about how much of it there is - "the coastal strip at the peninsula’s tip is narrow, the soils thin, the seasonal water supply unreliable in dry years" - and the plots that the Haman houses work on this margin are theirs and are not built.' }),
  freeze({ id: 'hama-broken-ground', name: 'The Broken Ground', x: -3000, z: 2887,
    description: 'The inland half, and the lore gives it one sentence that is exactly a landform: "the terrain between Hama and the Meroshe interior is rough without being impassable - enough friction to make overland access from the desert difficult for large-scale military movement, easy enough for the small commercial caravans and courier traffic". The atlas says `plains`, so the friction is not relief: it is surface. Stony ribs a pace or two high on two crossing grains, with coarse gravel between them and a low ridge every hundred paces, over ten hexes of hot desert. A laden animal picks its way over it at a walk and a column cannot keep ranks on it, which is the whole reason Marosh has never put a garrison at Hama.' }),
  freeze({ id: 'hama-corner', name: 'The Corner', x: -3365, z: 2900,
    description: 'The bottom-left corner of the continent, where the western ocean and the southern ocean meet: "Hama sits at the southwestern tip of the Dinova Peninsula where the peninsula’s two coasts converge and the open-ocean approaches narrow toward the cape." Standing here the water runs away north on one hand and east on the other and there is nothing but ocean between the two. The grass comes down to within thirty paces of the water, which no other shore in the southwest does - the Ganesh’s gulf, the fan skirt’s dry shore and the Meroshe’s southern beach are all desert to the surf. Hama Harbour is somewhere on this corner and it is the Council of Merchant Houses’; it is not built.' }),
  freeze({ id: 'hama-winter-beds', name: 'The Winter Beds', x: -3271, z: 2881,
    description: 'Three shallow beds running off the stony rise, across the grass and into the two seas, and all three are dry. `Csb` means the rain comes in winter and the summer is not wet, and the atlas draws no river edge anywhere on Hama’s nineteen hexes, so there is no permanent water in this country at all - the lore says as much when it calls the seasonal supply "unreliable in dry years". What a traveler finds is a metre and a half of soft-banked cut with the greenest grass in the southwest standing in the floor of it, and nothing whatever to drink.' }),
  // ----- Marosh -----
  freeze({ id: 'marosh-ridge', name: 'The Marosh Ridge', x: -2650, z: 2367,
    description: 'The wall the whole Meroshe stands behind, and the atlas says so three times over: eight `hills` hexes in an unbroken chain one hex wide, every one of them `Csb` where the rest of the country is `Csa`, and every one of them touching the desert while not one of them touches the sea. Seventy-four metres of base with fifteen of crest on top of it, holm oak and dense maquis over grey limestone, and from the top of it the Iberos on one hand three hundred metres below and the sand sea on the other. Sea air comes in off the east, this ridge takes the rain out of it, and what crosses the crest is the driest air in Azhora. It is the second highest ground in the game outside the two Lotharns and there is nothing on it.' }),
  freeze({ id: 'marosh-water-gap', name: 'The Water Gap', x: -2716, z: 2152,
    description: 'The one break in the ridge, and the atlas found it rather than a builder: the only three river edges the map draws on this whole coast meet at the corner of the hex beside the crest’s own western elbow, which is what a water gap is. Eleven metres of notch in fifteen of crest, sixty paces wide, with the Nahr running out of the bottom of it eastward to the sea. **This is where the caravan road crosses**, and the road is the whole reason Marosh is a kingdom - "the caravan routes across the Meroshe are Marosh’s revenue base, its military rationale, its diplomatic leverage, and its vulnerability". There is no road surface on it, no waystation, no gate and no toll: the gap is ground, and everything the Route Registry does with it is the Maroshi court’s.' }),
  freeze({ id: 'marosh-water', name: 'The Nahr', ...onCourse(MAROSH_NAHR, .5, 22),
    description: 'The only river the atlas draws on the eastern face of the peninsula, and it is small: three `small` edges out of the water gap, east-south-east across the terrace and into the Iberos in a hundred and seventy metres. `nahr` is simply the Maroshi for "river" (`maroshi.roots.river`), so the one river this coast has is called the river, the way job 1’s Vaellir is the Pyrosi word and job 2’s Malhat the Moreshi one. Waded anywhere along it. **It is also the first water the atlas draws inside a southwestern country rather than along its border** - a hundred and sixty-eight hexes of desert, cape and plateau have none at all.' }),
  freeze({ id: 'marosh-terrace', name: 'The Seaward Terrace', x: -2550, z: 2367,
    description: 'The seaward half: ten `grassland` hexes that are every one of them `Csa`, the hot-summer form, falling from the ridge’s foot to twenty hex edges of open water. Winter-rain grass with bare earth showing between the tufts by the end of a dry summer, aromatic scrub in the low places, and the olive-grey of a coast that gets four months of nothing. After two hundred and seventy-five hexes of desert it is ordinary Mediterranean country, and it is the most ordinary ground in the whole southwest - which is the point of it: this is what the Meroshe would be if the ridge were not there. The small agricultural plots the lore puts on this margin and the coastal towns they feed are the Maroshi court’s and are not built.' }),
  freeze({ id: 'marosh-shore', name: 'The Iberos Shore', x: -2465, z: 2020,
    description: 'The sheltered side of the peninsula, and the only shore in the block that is not exposed to an open ocean. Hama takes the western weather and Cape Heth takes it twice; this coast faces the Iberos Sea across a warm sheltered water, and what that does to the air is put more of it in: the haze here is the thickest Mediterranean air in the southwest. The grass comes down to within forty paces of the water with low turf and shingle for the last of it. Dinelv the capital sits somewhere on this shore - "at the junction of the overland road from the desert’s edge and the coastal trade lanes" - and it is a city and is not built.' }),
  freeze({ id: 'marosh-dry-side', name: 'The Dry Side', x: -2742, z: 2194,
    description: 'The western foot of the ridge, where the oak stops and the desert starts. Seventeen of Marosh’s eighteen hex edges against the Meroshe are on these eight `hills` hexes, and the aridity field crosses almost its whole range over them: `Csb` on this side of the crest and `BWh` one hex over, which is the second sharpest climate step in the block after Trogo’s. Standing here the scrub thins downhill over about two hundred paces, the ground turns to gravel, and the Central Meroshe’s sand sea begins. It is the same sentence Hama’s Line makes on the far side of the desert, four hundred metres of hot sand apart, and this side is the one with a hill on it.' }),
  // ----- Trogo -----
  freeze({ id: 'trogo-forest', name: 'The Trogo Forest', x: -2300, z: 2900,
    description: '**The first rainforest in the game.** Twenty-two hexes of `deep_forest`, `Af` on every one - tropical, with no dry season, the wettest code the atlas paints anywhere on the map - and one hex west of them is hot desert on all twenty-one of its own. The lore explains both in a single sentence: "a ridgeline that catches the southern moisture and drops a fog wall on its windward face while the leeward side stays desert." Standing under it: tall emergents over a closed canopy over an understory of tree-fern and palm over a floor of leaf litter with nothing green on it, buttress roots a metre high, and a haze so thick that another traveler is half hidden at fifty-eight paces and gone at a hundred and twenty. Nothing can be seen far in it and nothing can be walked straight through it.' }),
  freeze({ id: 'trogo-fog-ridge', name: 'The Fog Ridge', x: -2424, z: 2840,
    description: 'The crest, and it is the reason the country exists. The atlas draws it: the seven Trogo hexes that share an edge with the South Meroshe are the north-western margin, the crest is laid along them, and everything south-east of the line is windward face. Fifty-four metres of it against the desert’s six, which is the "wall of dark canopy" the Meroshe’s own Forest Wall landmark promised a job in advance. On top, the lore’s fog forest - "an intermediate world of mosses and cloud-dependent plants that exists only because two atmospheric systems are pressing against each other at this latitude" - shorter, denser and greyer than the canopy below it, standing in cloud that does not lift. The fog job 2 built into the Meroshe’s stone floor comes off this crest, and from up here a traveler can see the desert it is going to.' }),
  freeze({ id: 'trogoreth', name: 'The Trogoreth', ...onCourse(TROGORETH, .5, 18),
    description: 'The only permanent water in the rainforest, and the lore names it itself: "the largest, which Maroshi records call the Trogoreth (‘the Trogo river,’ a construction that acknowledges they have no better name for it), has a wide delta mouth that has silted into a shallow estuary system." Four `small` atlas edges through the south-eastern corner, out of the canopy and across the coastal grass into the southern ocean. It is waded anywhere, deliberately: **this country already has one movement rule and a walled river inside it would be a second barrier crossing the first.** It is also the first of the three ways through - "follow the rivers down" - and a traveler who cannot push into the thicket can walk up the water.' }),
  freeze({ id: 'trogo-animal-paths', name: 'The Animal Paths', x: -2290, z: 2778,
    description: 'Five worn lines through a country with no roads in it: one along the crest, two rungs between the north and middle gullies, one just inside the north-eastern shore, and one along the southern forest edge. Nobody cut them and nobody maintains them - the lore’s three peoples move through this forest and so do the carnivores they study hardest, and a path in a closed canopy is worn by whatever walks it most. Four and a half metres of trodden ground with a wall of fern down both sides and nothing to see past it. At the north gully, take the upper, inland bank and curve south into the forest; the direct coastal face below that turn is steep. **They are the third of the three kinds of way through, and what they do is join the other two to each other**: without them the gullies and the river would be five lines that do not meet.' }),
  freeze({ id: 'trogo-clearings', name: 'The Dry Corridors', x: -2418, z: 2662,
    description: 'The lore gives these as a mechanism rather than as scenery: "and then the reverse - gaps in the ridge where the desert air pushes through in the dry months, creating corridors of sparse growth cutting into the forest." Three of the five clearings are exactly that, openings on the crest where the Meroshe’s own air comes over the top and the canopy does not close; the other two are treefall gaps, which is what a forest like this has instead of fields. Light, grass, saplings and a sky, in a country that has none of those anywhere else - and every one of them stands on a way, because a clearing in a thicket that nobody can walk into is a picture of nothing.' }),
  freeze({ id: 'trogo-thicket', name: 'The Thicket', x: -2250, z: 2830,
    description: '**The ground the rule refuses.** Between the watercourse, the four gullies, the five paths and the five clearings there are four fifths of the canopy where a traveler cannot go: understory to the chest, rattan, tree-fern, buttress and litter, with a metre of visibility and no line of sight to steer by. It is not a wall and there is nothing solid in the way - measured, the thicket carries no collider of its own at all, which is why nobody can be shut inside it - it is simply ground that will not be pushed into. A body already in it is never held: the openness of the ground is a gradient and every step that makes it larger is allowed, so whoever is dropped in the middle of this walks out and the fence closes behind them.' }),
  freeze({ id: 'trogo-forest-edge', name: 'The Forest Edge', x: -2320, z: 3105,
    description: 'Where the forest stops, and the atlas draws the line twice: seven `grassland` hexes that are every one of them `Csa` against twenty-two `deep_forest` hexes that are every one of them `Af`, with no hex where the two fields disagree. And it puts every one of the seven on the **exposed** southern and south-eastern shore while taking the canopy right down to the water on the sheltered north-eastern one, which is the honest reading of "the coast is not extensively sheltered - no deep natural harbors on the scale of Hama": a tropical coast open to a southern ocean is salt-pruned, and the collar here is tussock, low scrub and wind, with a wall of canopy behind it that stands nearly forty metres over it.' }),
  freeze({ id: 'trogo-estuary', name: 'The Estuary', x: -2130, z: 3010,
    description: 'The Trogoreth’s mouth, and the one place in the southwest where a forest reaches the sea. "At the coast and along the lower river systems, the mangrove and estuary ecology takes over - brackish-adapted vegetation, root systems that make the river mouths look solid but are not, and the bird and fish populations that the estuary communities depend on." So the trees come down to the tideline on prop roots with the water between them, and the same thing happens again on the sheltered north-eastern shore where the atlas takes `deep_forest` to the waterline across ten hex edges. The fishing communities the lore puts on this estuary, and the small anchorages in the river mouths that Hama has been quietly buying timber through for a century, are theirs and are not built.' }),
]);
