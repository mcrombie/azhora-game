import { REGION_CELLS } from '../../../world/terrain/region-world.js';
import { FARMLAND_WILDLIFE_EXCLUSIONS } from '../../../world/scenery/regional-farmland.js';

/**
 * Persistent Feradom wildlife, drawn by the existing distance-culled western
 * animal rigs. The authored pass-valley bands remain, with resident countryside
 * bands across the plains and woods beyond them. No people are added.
 *
 * The lore supplies the dense oak and fir barrier hills, managed lower woods and
 * open country behind them rather than a species catalogue. Deer, boar, hares
 * and the hawk are explicitly marked as fauna extensions. Live-world tests check
 * safe footing, regional coverage, actual rendering and persistent identities.
 */
const freeze = Object.freeze;
const zone = (id, species, radius, box, sites, note, traits = {}) => freeze({
  id, species, region: 'Feradom', radius, scale: 1, keepRegion: true,
  minX: box[0], maxX: box[1], minZ: box[2], maxZ: box[3],
  exclusions: freeze(FARMLAND_WILDLIFE_EXCLUSIONS.filter(area => area.maxX >= box[0] && area.minX <= box[1]
    && area.maxZ >= box[2] && area.minZ <= box[3])),
  sites: freeze(sites.map(site => freeze(site))), note, ...traits,
});

export const FERADOM_PASS_WILDLIFE_ZONES = freeze([
  zone('road-pass-deer', 'red-deer', .55, [-436, -392, -710, -645], [[-409, -662], [-420, -670], [-416, -686], [-408, -678]],
    'Extension: red deer, the game’s deer, down on the open floor of the Road Pass’s valley behind the castle, where the oak and fir of the hills come to an edge and there is grass to graze. The garrison’s horns do not trouble them.',
    { hornless: true }),
  zone('birch-pass-boar', 'boar', .7, [-560, -505, -765, -715], [[-539, -727], [-532, -732], [-526, -737]],
    'Extension: boar at the wood’s edge in the Birch Pass’s valley - the pig of every oak country there is, and the barrier hills are oak on their lower slopes, where the mast comes down.'),
  zone('amod-pass-deer', 'red-deer', .55, [-730, -680, -930, -875], [[-705, -893], [-698, -906], [-712, -896]],
    'Extension: a few more red deer in the Amod Pass’s valley, on the grass below the managed wood of the back slopes, where the felled stands grow back and there is young browse.',
    { hornless: true }),
  zone('stone-pass-hares', 'upland-hare', .3, [-815, -770, -945, -910], [[-797, -922], [-790, -932], [-783, -931]],
    'Extension: hares on the short grass of the Stone Pass’s valley under the East Lotharn’s foot - the same thin turf the upland hares keep on the mountain’s balds above.'),
  zone('barrier-hills-hawk', 'plateau-hawk', .3, [-530, -410, -700, -580], [[-470, -640]],
    'Extension: a hawk riding the air over the barrier hills between the Road Pass and the Birch Pass - one bird, high, over the old wood of the tops.',
    { air: 34 }),
]);

/**
 * The pass bands alone left the rest of the duchy empty. Every Feradom hex now
 * has a small resident band, with stable identities and homes on both sides of
 * its meadow. These are ordinary ambient animals: they graze, flee and return;
 * camera distance only pauses/culls them, never recreates their population.
 * The live world's dry-ground/collider checks move a home clear of a tree, farm
 * building or road. Overlapping ranges let the animals retreat naturally across
 * hex edges, while keepRegion prevents them wandering out into the sea.
 */
export const FERADOM_COUNTRYSIDE_WILDLIFE_ZONES = freeze(REGION_CELLS.Feradom.map(cell => {
  const choice = (cell.q * 17 + cell.r * 31) % 12;
  const wooded = cell.terrain !== 'plains';
  const species = wooded && choice < 4 ? 'boar' : choice < 7 ? 'upland-hare' : 'red-deer';
  const flip = (cell.q + cell.r) % 2 ? 1 : -1;
  const radius = species === 'boar' ? .7 : species === 'red-deer' ? .55 : .3;
  return zone(`feradom-country-${cell.q}-${cell.r}`, species, radius,
    [cell.x - 84, cell.x + 84, cell.z - 84, cell.z + 84],
    [[cell.x - 32, cell.z - 20 * flip], [cell.x + 32, cell.z + 20 * flip]],
    wooded
      ? 'Extension: resident boar, deer and hares browse the managed woods and grassy hill margins, returning to their home range after travelers pass.'
      : 'Extension: resident hares and small deer bands graze the coastal meadows and farm margins, bringing life to the open plains between the barrier hills and the sea.',
    { habitat: 'countryside', hornless: choice % 3 !== 0, scale: species === 'red-deer' ? .9 : 1 });
}));

export const FERADOM_WILDLIFE_ZONES = freeze([
  ...FERADOM_PASS_WILDLIFE_ZONES,
  ...FERADOM_COUNTRYSIDE_WILDLIFE_ZONES,
]);
