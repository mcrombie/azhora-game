import {LIZEEM_FOOD_TARGETS} from '../../scenarios/lizeem-food-targets.js';

// Authored scenery represents regional life, not a census or productive acreage.
// The economy retains its own totals when a house or field is moved or removed.
export const CARICAS_FARM_TARGET=LIZEEM_FOOD_TARGETS.caricas.production;
export const caricasFoodCapacity=()=>CARICAS_FARM_TARGET;
export const CARICAS_FARM_VIEW={x:-2260,z:-30,width:680,depth:600};
export const CARICAS_AGRICULTURE_TOWN={name:'Caricas Town',x:-2098,z:279};
export const CARICAS_AGRICULTURE_QUAY={bank:-2157,end:-2197,z:279,width:5};
export const CARICAS_AGRICULTURE_WOODS={x:-1740,z:421,rx:30,rz:75,count:160,treeEvery:2,treeScale:1.8,clearance:5};
const plans=[
  {id:'north-hamlet',name:'North Farm',home:[-2070,157],fields:[
    [-2125,116,40,36,'grain'],[-2072,98,38,32,'grain'],[-2122,173,28,22,'pasture'],
  ]},
  {id:'east-hamlet',name:'East Meadow Farm',home:[-1960,198],fields:[
    [-1918,159,34,34,'grain'],[-1853,208,32,30,'hay'],[-1908,221,32,26,'grain'],
  ]},
  {id:'south-hamlet',name:'South Farm',home:[-1990,395],fields:[
    [-2052,424,32,32,'grain'],[-1992,444,36,26,'grain'],
    [-1931,440,32,28,'pasture'],[-1922,386,30,28,'hay'],
  ]},
];
export const CARICAS_FARMS=plans.map(f=>({...f,fields:f.fields.map(([x,z,width,depth,crop],i)=>({id:`${f.id}-${i+1}`,x,z,width,depth,crop}))}));
export const CARICAS_FIELDS=CARICAS_FARMS.flatMap(f=>f.fields);
const lot=(id,name,purpose,x,z,w,d,h,kind='house',storeys=1)=>({id,name,purpose,x,z,w,d,h,kind,storeys});
export const CARICAS_AGRICULTURE_BUILDINGS=[
  ...CARICAS_FARMS.flatMap(f=>[
    lot(`${f.id}-house`,`${f.name} cottage`,'Farm household',f.home[0]-11,f.home[1]-6,9,10,4.7),
    lot(`${f.id}-barn`,`${f.name} barn`,'Tools, fodder and harvest shelter',f.home[0]+10,f.home[1]+12,10,14,5.3,'barn'),
  ]),
  lot('caricas-market-hall','Council and market hall','Council meetings and market business',-2117,250,16,12,8.5,'hall',2),
  lot('caricas-town-granary','Public granary','Regional food storage and weighing',-2074,252,12,14,7.4,'granary',2),
  lot('caricas-watch-house','Watch house','Town watch and bridge patrols',-2076,329,11,12,6.2,'barracks'),
  lot('caricas-river-inn','River inn','Meals and beds for travelers',-2125,306,13,12,7.8,'inn',2),
  lot('caricas-smithy','Toolsmith','Repairs and farm tools',-2075,307,11,10,5.4,'workshop'),
  lot('caricas-stable','Carrier stable','Horse shelter and cart handling',-2144,320,14,10,5.3,'stable'),
  lot('caricas-west-house','West household','Family home',-2135,234,10,10,6.4,'house',2),
  lot('caricas-north-house','North household','Family home',-2075,222,10,10,5.8,'house',2),
  lot('caricas-east-house','Orchard household','Family home beside the orchard road',-2050,263,10,11,6.7,'house',2),
  lot('caricas-south-house','South household','Family home overlooking the bridge road',-2117,334,10,10,6,'house',2),
  lot('caricas-quay-store','Quay warehouse','Cargo awaiting river transport',-2152,259,12,12,6.7,'warehouse'),
  lot('caricas-merchant-house','Merchant household','Home and small trading office',-2144,298,10,10,6.7,'house',2),
];
// Continue Minora's Temple Way from the White Bridge's eastern approach.
// Skirt the north pasture instead of cutting through its sheep and fence.
// This same lane owns the drawn road, map line and farm clearance.
export const CARICAS_MINORA_APPROACH=[[-2148,135],[-2145,150],[-2144,190],[-2124,196],[-2098,196]];
// The old town's sentries and regrouping soldiers stood in this narrower
// north street. Keep both groups beside it, including room for passing horses.
export const CARICAS_AGRICULTURE_POSTS={
  guards:[{x:-2102,z:232},{x:-2094,z:232}],
  survivors:[{x:-2106,z:226},{x:-2108,z:224},{x:-2104,z:224}],
};
export const CARICAS_AGRICULTURE_LANES=[
  [[-2197,279],[-2098,279],[-2030,279],[-1960,237],[-1960,198],[-1937,198],[-1880,198]],
  [...CARICAS_MINORA_APPROACH,[-2098,244],[-2098,279],[-2098,318],[-2065,318],[-2065,350],[-1990,350],[-1990,395]],
  [[-2098,196],[-2098,169],[-2070,157],[-2040,157],[-2040,176],[-1960,176],[-1960,198]],
  [[-1990,395],[-1955,395],[-1955,322],[-1960,237]],
  [[-2098,263],[-2117,263]],
  [[-2098,264],[-2074,264]],
  [[-2098,317],[-2125,317],[-2128,329],[-2144,331]],
  [[-2098,316],[-2075,316]],
  [[-2065,339],[-2076,339]],
  [[-2084,348],[-2078,350],[-2065,350]],
  [[-2158,279],[-2158,306],[-2144,306]],
  [[-2030,279],[-2030,273],[-2050,273]],
];
export const CARICAS_MARKET={market:[-2098,279,46,34],stalls:[[-2112,269],[-2083,287]],carts:[[-2140,272]]};
export const CARICAS_ORCHARD=[[-2022,304],[-2014,300],[-2006,304],[-2022,316],[-2014,312],[-2006,316]];
export const caricasFieldAt=(x,z)=>CARICAS_FIELDS.find(f=>Math.abs(x-f.x)<=f.width/2&&Math.abs(z-f.z)<=f.depth/2);
export const inCaricasAgricultureWoods=(x,z)=>((x-CARICAS_AGRICULTURE_WOODS.x)/CARICAS_AGRICULTURE_WOODS.rx)**2+((z-CARICAS_AGRICULTURE_WOODS.z)/CARICAS_AGRICULTURE_WOODS.rz)**2<1;
