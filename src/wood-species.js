/** A tree keeps its species from the world through harvesting and sawing.
 * Each species has its own timber: a cedar never turns into pine, and a red oak
 * is not a white oak. Unimplemented planks remain unavailable at the sawpit. */
const freeze = Object.freeze;
const timber = (species, name, woodKind = species, log = null, plank = null, carriageUse = null) => freeze({ species, woodName: name, woodKind, log, plank, carriageUse });
export const WOOD_SPECIES = freeze({
  acor: timber('acor', 'Acor', 'acor', 'acor-logs'),
  kapok: timber('kapok', 'Kapok', 'kapok', 'kapok-logs'),
  'strangler-fig': timber('strangler-fig', 'Strangler fig', 'strangler-fig', 'strangler-fig-logs'),
  'coconut-palm': timber('coconut-palm', 'Coconut palm', 'coconut-palm', 'coconut-palm-logs'),
  mahogany: timber('mahogany', 'Mahogany', 'mahogany', 'mahogany-logs'),
  // Protected Ibenwood species have identity but no harvest products or recipes.
  'grey-vault': timber('grey-vault', 'Grey Vault'),
  'pale-witness': timber('pale-witness', 'Pale Witness'),
  bloodoak: timber('bloodoak', 'Bloodoak'),
  'midnight-elm': timber('midnight-elm', 'Midnight Elm'),
  ridgeback: timber('ridgeback', 'Ridgeback'),
  deeproot: timber('deeproot', 'Deeproot'),
  'loblolly-pine': timber('loblolly-pine', 'Loblolly pine', 'pine', 'pine-logs', 'pine-plank', 'Light carriage panels and the first repair lesson.'),
  'white-oak': timber('white-oak', 'White oak', 'oak', 'oak-logs', 'oak-plank', 'Sturdy carriage frames and running gear.'),
  'black-willow': timber('black-willow', 'Black willow', 'willow', 'willow-logs'),
  'red-maple': timber('red-maple', 'Red maple', 'maple', 'maple-logs'),
  'black-walnut': timber('black-walnut', 'Black walnut', 'walnut', 'walnut-logs', 'walnut-plank', 'Fine carriage trim and finished fittings.'),
  'red-oak': timber('red-oak', 'Northern red oak', 'red-oak', 'red-oak-logs'),
  'tulip-poplar': timber('tulip-poplar', 'Tulip poplar', 'tulip-poplar', 'tulip-poplar-logs'),
  hickory: timber('hickory', 'Shagbark hickory', 'hickory', 'hickory-logs'),
  beech: timber('beech', 'American beech', 'beech', 'beech-logs'),
  sweetgum: timber('sweetgum', 'American sweetgum', 'sweetgum', 'sweetgum-logs'),
  sycamore: timber('sycamore', 'American sycamore', 'sycamore', 'sycamore-logs'),
  'bald-cypress': timber('bald-cypress', 'Bald cypress', 'bald-cypress', 'bald-cypress-logs'),
  'red-cedar': timber('red-cedar', 'Eastern red cedar', 'red-cedar', 'red-cedar-logs'),
  holly: timber('holly', 'American holly', 'holly', 'holly-logs'),
  dogwood: timber('dogwood', 'Flowering dogwood', 'dogwood', 'dogwood-logs'),
  persimmon: timber('persimmon', 'American persimmon', 'persimmon', 'persimmon-logs'),
  'silver-birch': timber('silver-birch', 'Silver birch', 'silver-birch', 'silver-birch-logs'),
  'silver-fir': timber('silver-fir', 'Silver fir', 'silver-fir', 'silver-fir-logs'),
  'stone-pine': timber('stone-pine', 'Stone pine', 'stone-pine', 'stone-pine-logs'),
  'sweet-orange': timber('sweet-orange', 'Sweet orange', 'sweet-orange', 'sweet-orange-logs'),
  pawpaw: timber('pawpaw', 'Common pawpaw', 'pawpaw', 'pawpaw-logs'),
  'common-juniper': timber('common-juniper', 'Common juniper', 'common-juniper', 'common-juniper-logs'),
  'sweet-chestnut': timber('sweet-chestnut', 'Sweet chestnut', 'sweet-chestnut', 'sweet-chestnut-logs'),
  'olive': timber('olive', 'European olive', 'olive', 'olive-logs'),
  'holm-oak': timber('holm-oak', 'Holm oak', 'holm-oak', 'holm-oak-logs'),
  'common-hazel': timber('common-hazel', 'Common hazel', 'common-hazel', 'common-hazel-logs'),
  'black-alder': timber('black-alder', 'Black alder', 'black-alder', 'black-alder-logs'),
  'white-poplar': timber('white-poplar', 'White poplar', 'white-poplar', 'white-poplar-logs'),
  'tamarisk': timber('tamarisk', 'French tamarisk', 'tamarisk', 'tamarisk-logs'),
  'fig': timber('fig', 'Common fig', 'fig', 'fig-logs'),
  'apple': timber('apple', 'Domestic apple', 'apple', 'apple-logs'),
  'hawthorn': timber('hawthorn', 'Common hawthorn', 'hawthorn', 'hawthorn-logs'),
  // Builder identity for the existing Meroshe thorn; no botanical species is specified in the lore.
  'desert-thorn': timber('desert-thorn', 'Desert thorn', 'desert-thorn', 'desert-thorn-logs'),
  'red-mangrove': timber('red-mangrove', 'Red mangrove', 'red-mangrove', 'red-mangrove-logs'),
  'black-poplar': timber('black-poplar', 'Black poplar', 'black-poplar', 'black-poplar-logs'),
});

export const WOOD_KIND_SPECIES = freeze(Object.fromEntries(Object.values(WOOD_SPECIES).filter(wood => wood.log).map(wood => [wood.woodKind, wood.species])));
export function timberForSpecies(species) { return WOOD_SPECIES[species] ?? null; }
export function timberForKind(kind) { return timberForSpecies(WOOD_KIND_SPECIES[kind]); }

/** Existing simplified forest styles already depict oak crowns and pine cones.
 * This attaches their fixed identity without rolling another random number,
 * changing a tree ID, changing its silhouette, or replacing one species with another. */
export const forestTimber = pine => timberForKind(pine ? 'pine' : 'oak');
