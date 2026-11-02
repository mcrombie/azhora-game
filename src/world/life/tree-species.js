// Botanical identities for observation. Stable IDs are shared with timber and
// placed trees; observing a tree never changes harvesting or campaign values.
// Identification notes describe real plants, not a promise of seasonal simulation.
const records=[
  ['kapok','Kapok','Ceiba pentandra','A tall straight trunk with spreading buttresses, tiers of broad limbs and a high umbrella crown.','Humid tropical forest.'],
  ['strangler-fig','Florida strangler fig','Ficus aurea','A broad evergreen crown with hanging aerial roots and joined, root-like trunks.','Warm forest and wetland margins.'],
  ['coconut-palm','Coconut palm','Cocos nucifera','A ringed, often leaning trunk carries a single crown of long arching feather-shaped fronds.','Warm coasts.'],
  ['mahogany','West Indian mahogany','Swietenia mahagoni','A stout trunk supports an open rounded crown; the leaves are divided into paired glossy leaflets.','Warm tropical woodland.'],
  ['loblolly-pine','Loblolly pine','Pinus taeda','Long needles grow in bundles of three. Mature trees have reddish plated bark and high, uneven crowns.','Sunny lowland forest and old fields.'],
  ['white-oak','White oak','Quercus alba','Broad spreading limbs, pale scaly bark and leaves with rounded lobes.','Well-drained woodland and field margins.'],
  ['black-willow','Black willow','Salix nigra','Narrow leaves cover slender twigs above crooked trunks with dark furrowed bark. The crown is loose and spreading.','Wet banks and floodplains.'],
  ['red-maple','Red maple','Acer rubrum','A rounded crown, opposite lobed leaves and reddish young twigs; older grey trunks develop ridges.','Moist woods and wetland edges.'],
  ['black-walnut','Black walnut','Juglans nigra','Dark deeply furrowed bark, long compound leaves and a broad open crown; nuts have rounded green husks.','Rich soils and farm margins.'],
  ['red-oak','Northern red oak','Quercus rubra','Leaves end in pointed, bristle-tipped lobes. Older trunks show long pale ridges between dark furrows.','Well-drained temperate woods.'],
  ['tulip-poplar','Tulip poplar','Liriodendron tulipifera','A very straight trunk and high crown; leaves have four broad lobes and a distinctive notched end.','Deep moist woodland soils.'],
  ['hickory','Shagbark hickory','Carya ovata','Long strips of grey bark peel away from the trunk. Compound leaves usually have five leaflets.','Rich upland woods.'],
  ['beech','American beech','Fagus grandifolia','Smooth grey bark, long pointed buds and oval toothed leaves under a dense spreading crown.','Sheltered temperate woods.'],
  ['sweetgum','American sweetgum','Liquidambar styraciflua','Star-shaped leaves and hanging spiky seed balls distinguish a tree with a tall, fairly regular crown.','Moist lowland woods.'],
  ['sycamore','American sycamore','Platanus occidentalis','Patches of pale bark reveal white upper limbs beneath a wide irregular crown; leaves are large and lobed.','Riverbanks and floodplains.'],
  ['bald-cypress','Bald cypress','Taxodium distichum','A flared trunk carries soft feathery foliage. Trees in wet ground may have woody knees around their roots.','Swamps and wet river margins.'],
  ['red-cedar','Eastern red cedar','Juniperus virginiana','A dense evergreen crown with fine scale-like foliage, reddish fibrous bark and small blue berry-like cones.','Open fields and dry woodland edges.'],
  ['holly','American holly','Ilex opaca','A dense evergreen crown with leathery spiny leaves. Female trees can carry bright red berries.','Sheltered woods and woodland edges.'],
  ['dogwood','Flowering dogwood','Cornus florida','A small tree with spreading layered branches; four broad white or pink bracts surround each spring flower cluster.','Open woodland understory.'],
  ['persimmon','American persimmon','Diospyros virginiana','Dark bark breaks into chunky blocks. Oval leaves and rounded orange fruit hang from a spreading crown.','Old fields and woodland margins.'],
  ['silver-birch','Silver birch','Betula pendula','White bark has dark cracks near the base, with slender drooping twigs and small triangular toothed leaves.','Sunny temperate woods and clearings.'],
  ['silver-fir','Silver fir','Abies alba','Level branch tiers form a tall spire. Flat needles have pale undersides; cones stand upright.','Cool mountain forests.'],
  ['stone-pine','Stone pine','Pinus pinea','Mature trees have a broad umbrella crown on a clear trunk, with long needles and large rounded cones.','Warm dry coastal and lowland woods.'],
  ['sweet-orange','Sweet orange','Citrus × sinensis','A compact evergreen crown with glossy leaves, fragrant pale blossoms and rounded orange fruit.','Warm cultivated groves.'],
  ['pawpaw','Common pawpaw','Asimina triloba','Large drooping oval leaves form a small spreading crown; green fruit grows in clusters.','Rich moist woodland understory.'],
  ['common-juniper','Common juniper','Juniperus communis','Prickly needles occur in whorls of three; blue-black berry-like cones appear on female plants.','Open scrub and rocky ground.'],
  ['sweet-chestnut','Sweet chestnut','Castanea sativa','Long sharply toothed leaves and spiny nut cases; old trunks develop deeply twisted bark ridges.','Temperate woods and cultivated groves.'],
  ['olive','European olive','Olea europaea','A low gnarled trunk, narrow grey-green leaves with pale undersides and an airy spreading crown.','Warm dry slopes and orchards.'],
  ['holm-oak','Holm oak','Quercus ilex','A dense rounded evergreen crown with dark leathery leaves and pale undersides; young leaves can be spiny.','Warm dry woods and planted avenues.'],
  ['common-hazel','Common hazel','Corylus avellana','Several slim stems rise together, carrying broad rounded toothed leaves, long catkins and nuts in leafy husks.','Hedgerows and woodland margins.'],
  ['black-alder','Black alder','Alnus glutinosa','Rounded leaves often have notched tips. Small woody cone-like fruits and dangling catkins distinguish its branches.','Wet banks and waterlogged ground.'],
  ['white-poplar','White poplar','Populus alba','Leaves have pale felted undersides; a broad crown rises above pale bark with dark markings.','Floodplains and riverside woods.'],
  ['tamarisk','French tamarisk','Tamarix gallica','Fine scale-like leaves make a light feathery crown on reddish twigs; slender pink flower sprays appear in season.','Warm shores and saline river margins.'],
  ['fig','Common fig','Ficus carica','Low spreading limbs, smooth grey bark and large deeply lobed leaves; fruit grows close to the twigs.','Warm sheltered gardens and groves.'],
  ['apple','Domestic apple','Malus domestica','A modest spreading tree with crooked branches, oval toothed leaves, pale spring blossom and rounded fruit.','Cultivated orchards and farm gardens.'],
  ['hawthorn','Common hawthorn','Crataegus monogyna','A small thorny tree with a dense irregular crown, deeply lobed leaves, white spring blossom and red haws.','Hedgerows, pasture and woodland edges.'],
  ['desert-thorn','Umbrella thorn acacia','Vachellia tortilis','Small divided leaves cover a broad flat crown above a branching thorny trunk; seed pods curl into coils.','Dry scrub and desert margins.'],
  ['red-mangrove','Red mangrove','Rhizophora mangle','Arching prop roots brace the trunk in shallow water below glossy oval leaves and long hanging propagules.','Tropical tidal shores.'],
  ['black-poplar','Black poplar','Populus nigra','Dark furrowed bark and triangular leaves; ordinary trees spread widely, while Lombardy forms grow in narrow columns.','Floodplains and planted windbreaks.'],
  ['english-oak','English oak','Quercus robur','Heavy spreading limbs form a broad crown above deeply fissured bark. Rounded leaf lobes and acorns on long stalks distinguish it.','Temperate woodland and rich lowland soils.'],
  ['european-beech','European beech','Fagus sylvatica','Smooth silver-grey bark, pointed buds and oval leaves with wavy edges beneath a dense spreading crown.','Sheltered temperate woodland.'],
  ['wych-elm','Wych elm','Ulmus glabra','A broad branching crown with rough, sharply toothed leaves whose bases are uneven; the bark becomes ridged with age.','Moist temperate woodland and sheltered slopes.'],
  ['small-leaved-lime','Small-leaved lime','Tilia cordata','Small heart-shaped leaves and slender twigs form a rounded crown; fragrant summer flowers hang below pale narrow bracts.','Temperate woodland and planted town courts.'],
  ['date-palm','Date palm','Phoenix dactylifera','A stout patterned trunk supports a crown of long grey-green feather-shaped fronds, with clusters of dates below.','Warm dry cultivated groves and gardens.'],
  ['mediterranean-cypress','Mediterranean cypress','Cupressus sempervirens','Dark scale-like foliage and round woody cones; the commonly planted upright form makes a narrow evergreen spire.','Warm dry slopes and planted avenues.'],
];

// Legacy instance/product IDs remain stable for saved worlds. These are local
// names for real trees, not separate species or extra life-list discoveries.
export const TREE_LOCAL_NAMES=Object.freeze({
  acor:Object.freeze({id:'english-oak',name:'Acor'}),
  'grey-vault':Object.freeze({id:'european-beech',name:'Grey Vault'}),
  'pale-witness':Object.freeze({id:'sycamore',name:'Pale Witness'}),
  bloodoak:Object.freeze({id:'red-oak',name:'Bloodoak'}),
  'midnight-elm':Object.freeze({id:'wych-elm',name:'Midnight Elm'}),
  ridgeback:Object.freeze({id:'sweet-chestnut',name:'Ridgeback'}),
  deeproot:Object.freeze({id:'white-oak',name:'Deeproot'}),
});
export const TREE_SPECIES=Object.freeze(records.map(([id,name,scientificName,identification,habitat])=>Object.freeze({id,name,scientificName,identification,habitat,
  localNames:Object.freeze(Object.values(TREE_LOCAL_NAMES).filter(local=>local.id===id).map(local=>local.name))})));
export const TREE_SPECIES_BY_ID=Object.freeze(Object.fromEntries(TREE_SPECIES.map(tree=>[tree.id,tree])));
export const treeSpecies=id=>TREE_SPECIES_BY_ID[TREE_LOCAL_NAMES[id]?.id??id]??null;

// Sources for the bank palette and previously ambiguous tropical/desert names.
export const TREE_REFERENCE_SOURCES=Object.freeze([
  'https://www.nrcs.usda.gov/conservation-basics/land/forests/agroforestry-systems/riparian-forest-buffer',
  'https://plants.ces.ncsu.edu/plants/salix-nigra/',
  'https://plants.ces.ncsu.edu/plants/platanus-occidentalis/',
  'https://plants.ces.ncsu.edu/plants/alnus-glutinosa/',
  'https://plants.ces.ncsu.edu/plants/populus-nigra/',
  'https://ask.ifas.ufl.edu/publication/ST250',
  'https://www.nparks.gov.sg/florafaunaweb/flora/3/1/3151',
  'https://powo.science.kew.org/taxon/77087190-1',
  'https://www.rhs.org.uk/plants/18586/ulmus-glabra/details',
  'https://plants.ces.ncsu.edu/plants/tilia-cordata/',
  'https://plants.ces.ncsu.edu/plants/cupressus-sempervirens/',
  'https://plants.sc.egov.usda.gov/plant-profile/PHDA4',
]);
