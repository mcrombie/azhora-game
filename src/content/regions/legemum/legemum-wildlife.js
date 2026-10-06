/** Legemum's natural residents. Sea-plungers are explicitly placed on these
 * headlands by the fauna overview. Terrestrial mammals, gulls, the marsh harrier
 * and grey dolphins are habitat extensions using existing animal rigs. No
 * domestic sheep/goats/cattle: those belong to the future settled landscape. */
const freeze=Object.freeze;
const zone=(id,species,radius,box,sites,note,traits={})=>freeze({id,species,region:'Legemum',radius,scale:1,keepRegion:true,
  minX:box[0],maxX:box[1],minZ:box[2],maxZ:box[3],sites:freeze(sites.map(s=>freeze(s))),note,maxSlope:.65,...traits});
export const LEGEMUM_WILDLIFE_ZONES=freeze([
  zone('legemum-tin-hill-deer','red-deer',.55,[-2040,-1910,1505,1608],[[-1980,1548],[-1986,1554],[-1995,1545]],
    'Habitat extension: a small red-deer band on the damp northern hill grass and the edges of sheltered woodland.',{hornless:true}),
  zone('legemum-haur-hares','upland-hare',.3,[-2110,-1995,1637,1715],[[-2056,1678],[-2047,1683],[-2070,1680]],
    'Habitat extension: wild hares browse the open Haur meadow while its seasonal assembly ground is unoccupied.'),
  zone('legemum-alder-boar','boar',.7,[-2010,-1902,1695,1785],[[-1948,1738],[-1957,1734],[-1955,1748]],
    'Habitat extension: wild boar forage the damp alder fold and its oak margins.'),
  zone('legemum-south-heath-hares','upland-hare',.3,[-1960,-1805,1865,1950],[[-1888,1910],[-1881,1904],[-1895,1901]],
    'Habitat extension: hares shelter among low heather and maritime turf near the southern slate tor.'),
  zone('legemum-headland-gulls','gull',.3,[-2420,-2335,1563,1630],[[-2380,1607],[-2388,1609],[-2371,1605],[-2397,1600]],
    'Habitat extension: ground-nesting gulls share the exposed headlands with the lore’s sea-plunger colonies.',{maxSlope:.8}),
  zone('legemum-peat-harrier','harrier',.3,[-2190,-1990,1680,1810],[[-2080,1746]],
    'Habitat extension: one harrier quarters the peat hollows and damp heath.',{air:10,circle:25,period:19,quarter:38,bob:1.2,follow:true}),
  zone('legemum-sea-plungers','sea-plunger',.3,[-2430,-2310,1630,1740],[[-2370,1680],[-2370,1680],[-2370,1680],[-2370,1680]],
    'Lore: Great White Sea-plungers breed on the exposed Legemum headlands and dive from height into coastal shoals.',
    {air:27,circle:25,period:18,bob:1.4,keepRegion:false,plunge:freeze({every:10,fall:1.2,under:1.8,climb:3.2})}),
  zone('legemum-ocean-dolphins','dolphin',0,[-2470,-2345,1685,1730],[[-2410,1705],[-2395,1710]],
    'Habitat extension: grey dolphins work the open ocean below the exposed headland, beyond the dangerous surf.',{sea:true,keepRegion:false}),
]);
/** Scatter keeps authored homes clear; movement still checks actual colliders
 * and terrain every step through the existing regional wildlife system. */
export function legemumWildlifeClear(x,z,margin=0){return LEGEMUM_WILDLIFE_ZONES.some(zone=>!zone.air&&!zone.sea&&zone.sites.some(([a,b])=>Math.hypot(x-a,z-b)<2.6+margin));}
