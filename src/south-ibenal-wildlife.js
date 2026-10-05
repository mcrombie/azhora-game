/**
 * South Ibenal's animals, as ranges for the western wildlife rigs (`src/west-regions-life.js` draws them, instanced and
 * distance-culled; they are ambient: nobody can attack, catch or speak to them). North Ibenal's are in
 * `src/north-ibenal-wildlife.js`; `ibenalWildlifeClear`, below, answers for both.
 *
 * **The fauna overview names this ground.** Its section "Ibenale, Alezhor, and the Western Corridor"
 * (`azhora_lore/fauna/azhoran_fauna_overview.md`) is about exactly this corridor - "the boundary between forest and
 * coast - an edge environment that supports species from both systems and species particular to the edge itself, which
 * is a distinct habitat rather than merely a transition" - and South Ibenal, its warm south-western end, carries what it
 * names:
 *
 *  - **the forest edge-cat**, "the medium predator of the Ibenale and Alezhor forest margin ... more arboreal, and ...
 *    hunting birds at the canopy level of the forest edge trees as readily as small mammals on the ground". Trogo's rig
 *    (`'forest-cat'`), inherited as Alezhor inherited it, at its own size. At the West Ibenwood's line only: the
 *    corridor's towns have lost it from the open strip as Alezhor's cities have ("it persists in the wooded hinterland").
 *  - **otters** in "the forest-margin watercourses": the streams that "come out of the forest at angles, crossing the
 *    plain and reaching the sea at intervals" (`geography/regions/ibenale.md`). They are small streams, so these are the
 *    great river otter's "smaller cousins", the Carica's otter at its own size, and each goes into its stream when it is
 *    come upon: the ground lays the streams' water as the world's (`river-water` markers, laid by the scenery).
 *  - **the birds**: "the forest species of the Ibenwood in the tree cover and ... coastal species near the sea, with a
 *    rich transition zone where both appear" - the Ibenwood's own hawk over its tree line, gulls on the open-ocean
 *    strand - and the corridor as "a north-south migration route: species moving between northern Azhora and the
 *    southern peninsulas follow the coastal plain in preference to mountain crossing": the black geese at a stream's
 *    mouth, and the herons that stop where they stop.
 *
 * **What the neighbours add**, each an extension and each saying so: red deer at the tree line, which every built
 * Ibenwood hex keeps (`src/ibenwood-life.js`) and Alezhor keeps under the same line; the west's upland hare and a
 * quartering harrier on the open summer-dry plain, as Alezhor has them on its grass next door.
 *
 * **Left out, and why**, on the arguments Alezhor's builder made for the same coast: no boar (a band's range is open
 * ground, and a boar's in the woods would be a hole cut in them); no grey dolphins ("Iberos coastal waters", the far
 * side of the continent); no river fox ("found reliably only in the Carica corridor"); no pale deer (the Ibenwood's own,
 * "seen regularly by Forest Mittoli communities and rarely by outside travelers"). **Nothing here is anybody's**: the
 * corridor's towns' herds, horses, mules and dogs are stock, and so is anything kept at an anchorage; not one of them
 * is on this ground.
 *
 * **Every band has its own layout**, because the Celder review found two herds put down in one pattern. Ranges are open
 * ground with nothing that blocks a walker in them: the scenery keeps every tree, tall bush and boulder out
 * (`ibenalWildlifeClear`) and lets the bracken, the heather and the low gorse grow among the animals.
 * `tests/ibenal-life.test.js` holds each home to its ground, each range to the west's laws, every bird in the air to its
 * own sky, and every band to a shape of its own.
 */
import { NORTH_IBENAL_WILDLIFE_ZONES } from './north-ibenal-wildlife.js';

const freeze = Object.freeze;
export const SOUTH_IBENAL_REGION = 'South Ibenal';
const zone = (id, species, radius, box, sites, note, traits = {}) => freeze({
  id, species, region: SOUTH_IBENAL_REGION, radius, scale: 1, keepRegion: true,
  minX: box[0], maxX: box[1], minZ: box[2], maxZ: box[3],
  sites: freeze(sites.map(site => freeze(site))), note, maxSlope: .5, ...traits,
});
/**
 * An otter goes down a bank to the water, which is how it is never caught: its ground may be as steep as the earth bank
 * it slides down, where everything else here keeps to ground of a half.
 */
const OTTER_BANK = 1.4;

export const SOUTH_IBENAL_WILDLIFE_ZONES = freeze([
  // -------------------------------------------------------------------------
  // The tree line: the forest edge-cat, and the deer that feed out from under the trees
  // -------------------------------------------------------------------------
  zone('south-ibenal-margin-cats', 'forest-cat', .42, [-4620, -4478, 585, 680],
    [[-4512, 629], [-4521, 653]],
    'The **forest edge-cat** on its own ground, "the medium predator of the Ibenale and Alezhor forest margin", at the West Ibenwood\'s line where the strip is narrowest, under the forest\'s beech and chestnut a little north of where its border stream comes down to Alezhor. A female and her grown young of the year, the most of them anybody sees together, each a bound from the trees it hunts "birds at the canopy level of the forest edge trees" in. Trogo\'s rig, inherited as Alezhor inherited it.'),
  zone('south-ibenal-stream-head-cat', 'forest-cat', .42, [-4405, -4330, 352, 432],
    [[-4361, 394]],
    'The same cat alone at the forest\'s corner where the middle stream comes out from under the trees: the corridor\'s own version of the overview\'s "margins of the gold-mining valleys", where a watercourse leaves the forest and the cat "persists ... where human activity does not maintain continuous pressure". One, on the open edge above the stream\'s head.'),
  zone('south-ibenal-edge-hinds', 'red-deer', .55, [-4205, -4115, 125, 205],
    [[-4161, 156], [-4146, 150], [-4158, 165], [-4167, 180]],
    'Extension: red deer feeding out onto the grass under the West Ibenwood near the corner where it meets the North Ibenwood, a little south of the border stream\'s head. Every hex of the built Ibenwood keeps them (`src/ibenwood-life.js`), and Alezhor keeps hinds under the same line; a deer is seen where a wood has open ground beside it. Four hinds in a loose knot, back under the trees in a minute.',
    { hornless: true }),
  // -------------------------------------------------------------------------
  // The streams
  // -------------------------------------------------------------------------
  zone('south-ibenal-south-stream-otters', 'otter', .35, [-4640, -4560, 420, 515],
    [[-4604, 441], [-4597, 461], [-4599, 479]],
    'Otters on the south stream, the corridor\'s shortest and quickest, where it turns north-west through its vale toward the sea: "River otters and their larger relatives occupy the rivers from the Oremindi meltwater sources through the forest-margin watercourses of Alezhor", and these are the great river otter\'s "smaller cousins", the Carica\'s otter at its own size on a small stream. Three along its banks, each a slide from the water.',
    { maxSlope: OTTER_BANK }),
  zone('south-ibenal-north-stream-otters', 'otter', .35, [-4430, -4350, 115, 195],
    [[-4398, 133], [-4393, 150], [-4380, 152]],
    'Otters on the north stream at the bend where it swings south down the atlas\'s edges toward its broad meadow floor above the mouth: the same smaller otter, three on the bend, in the first deep water below the trees.',
    { maxSlope: OTTER_BANK }),
  // -------------------------------------------------------------------------
  // The mouths: the migrants
  // -------------------------------------------------------------------------
  zone('south-ibenal-mouth-geese', 'goose', .3, [-4440, -4370, 45, 112],
    [[-4410, 66], [-4404, 72], [-4398, 78], [-4416, 94], [-4390, 96], [-4412, 104]],
    'The **black migratory geese**, which the overview has wintering "in the coastal marshes and river mouths", grazing the north stream\'s broad meadow floor above its mouth, beside the flat kept at the bay. The coast is the open ocean\'s, not the Iberos\' where the overview catalogues them, so this is an extension along the overview\'s own migration route: "The corridor is also a north-south migration route: species moving between northern Azhora and the southern peninsulas follow the coastal plain in preference to mountain crossing". Six spread over the grass; resident until the game has seasons to bring them and take them away.'),
  zone('south-ibenal-mouth-herons', 'wading-bird', .4, [-4575, -4495, 212, 256],
    [[-4540, 232], [-4528, 241], [-4519, 254]],
    'Herons on the middle stream\'s banks where it comes out into its bay: a river mouth on a migration route is where the overview\'s "rich transition zone where both [forest and coastal birds] appear" is richest. Three spaced up the last reach of the water. Extension: their wading assemblage is catalogued on the Lizeem.'),
  // -------------------------------------------------------------------------
  // The open plain and the shore
  // -------------------------------------------------------------------------
  zone('south-ibenal-plain-hares', 'upland-hare', .3, [-4615, -4525, 548, 648],
    [[-4566, 586], [-4538, 574], [-4554, 622]],
    'Extension: the west\'s upland hare on the summer-dry plain between the dunes and the tree line, the ground it keeps on Alezhor\'s grass next door and on every grassland from Vastos to Cape Heth: short grass with the gorse a bound away. Three, wide apart.'),
  zone('south-ibenal-strand-gulls', 'gull', .3, [-4730, -4660, 590, 690],
    [[-4697, 619], [-4693, 631], [-4689, 639], [-4695, 653]],
    'Gulls on the open-ocean strand below the dunes of the warm south-west: the overview\'s "coastal species near the sea", the half of the corridor\'s birds that are not the forest\'s. Four strung along the upper beach, facing the wind.'),
  zone('south-ibenal-plain-harrier', 'harrier', .3, [-4600, -4520, 440, 500], [[-4560, 470]],
    'Extension: a harrier quartering the summer-dry plain between the south stream and the tree line, low and following the ground, as Alezhor\'s quarters its grassland next door. Grass going gold with voles in it is a harrier\'s whole living, and it hunts nine metres up.',
    { air: 9, circle: 30, period: 21, quarter: 52, bob: 1.2, follow: true }),
  zone('south-ibenal-edge-hawk', 'plateau-hawk', .3, [-4385, -4305, 260, 340], [[-4345, 300]],
    'The forest edge\'s bird of the air: the hawk the built Ibenwood already flies "above lighter outer woodland" (`src/ibenwood-life.js`), here over the tree line itself between the middle and north streams\' heads, where the overview\'s birds of the forest and of the coast meet. One, riding the air over the West Ibenwood\'s foot.',
    { air: 32, circle: 22, bob: 2 }),
]);

/**
 * Where scenery that blocks a walker must not stand: inside a range of anything that lives on the ground in either
 * Ibenal, `margin` metres out. An animal giving ground backs straight away from whoever comes at it, and a boulder or
 * a trunk behind it is a corner; the ranges are open ground, so this costs the corridor nothing it should have. Both
 * countries' ranges are asked, because a range near the line between them may reach over it.
 */
export function ibenalWildlifeClear(x, z, margin = 0) {
  for (const list of [SOUTH_IBENAL_WILDLIFE_ZONES, NORTH_IBENAL_WILDLIFE_ZONES]) for (const zone of list) {
    if (zone.air || zone.sea) continue;
    if (x >= zone.minX - margin && x <= zone.maxX + margin && z >= zone.minZ - margin && z <= zone.maxZ + margin) return true;
  }
  return false;
}
