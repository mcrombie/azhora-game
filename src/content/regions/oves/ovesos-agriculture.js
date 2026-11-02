import {LIZEEM_FOOD_TARGETS} from '../../scenarios/lizeem-food-targets.js';
import {LIZEEM_HOUSING_TARGETS} from '../../scenarios/lizeem-housing-targets.js';
import {withHousingCapacity} from '../../settlements/housing-capacity.js';

// Replacement countryside at the actual Ovesos coordinates. No legacy quest
// plots, canal machinery or old settlement budget is used in this layout.
export const OVESOS_FARM_TARGET=LIZEEM_FOOD_TARGETS.ovesos.production;
export const OVESOS_FARM_VIEW={x:-2360,z:440,width:740,depth:540};
export const OVESOS_AGRICULTURE_TOWN={name:'Ovesos Town',x:-1910,z:602};
export const OVESOS_AGRICULTURE_QUAY={bank:-1876,end:-1848,z:580,width:4.5};
export const OVESOS_AGRICULTURE_WILDLAND={x:-2260,z:660,rx:24,rz:60,count:80,treeEvery:10,treeScale:.8};
const plans=[
  {id:'north-meadows',name:'Northern meadows',home:[-2110,575],fields:[
    [-2200,570,56,43,'grain'],[-2200,623,52,44,'hay'],[-2140,540,43,25,'grain'],
    [-2050,560,45,43,'grain'],[-2030,616,55,45,'grain'],[-2090,626,48,40,'grain'],[-2148,605,48,44,'pasture'],
  ]},
  {id:'western-furrows',name:'Western furrows',home:[-2100,690],fields:[
    [-2190,681,50,46,'grain'],[-2142,723,36,20,'hay'],[-2085,738,45,29,'grain'],
    [-2035,707,40,44,'grain'],[-1983,680,44,48,'grain'],[-1980,738,43,45,'pasture'],
  ]},
  {id:'lower-fields',name:'Lower fields',home:[-1870,775],fields:[
    [-1920,726,48,34,'grain'],[-1857,727,45,36,'grain'],[-1934,785,43,44,'grain'],
    [-1805,854,35,24,'hay'],[-1805,796,50,42,'grain'],[-1807,740,22,28,'pasture'],
  ]},
];
const weight={grain:1,hay:.7,pasture:.55};
const total=plans.flatMap(f=>f.fields).reduce((n,[,,w,d,c])=>n+w*d*weight[c],0);
let allocated=0,index=0;const count=plans.reduce((n,f)=>n+f.fields.length,0);
export const OVESOS_FARMS=plans.map(f=>({...f,fields:f.fields.map(([x,z,width,depth,crop],i)=>{
  const capacity=++index===count?Math.round((OVESOS_FARM_TARGET-allocated)*100)/100:Math.round(OVESOS_FARM_TARGET*width*depth*weight[crop]/total*100)/100;
  allocated+=capacity;return {id:`${f.id}-${i+1}`,x,z,width,depth,crop,capacity};
})}));
export const OVESOS_FIELDS=OVESOS_FARMS.flatMap(f=>f.fields);
export const ovesosFoodCapacity=()=>Math.round(OVESOS_FIELDS.reduce((n,f)=>n+f.capacity,0)*100)/100;
export const OVESOS_AGRICULTURE_BUILDINGS=withHousingCapacity([
  ...OVESOS_FARMS.flatMap(f=>[
    {id:`${f.id}-house`,x:f.home[0]-11,z:f.home[1]-6,w:8,d:10,h:4.1,kind:'house'},
    {id:`${f.id}-barn`,x:f.home[0]+10,z:f.home[1]+9,w:9,d:14,h:4.9,kind:'barn'},
    {id:`${f.id}-granary`,x:f.home[0]-10,z:f.home[1]+13,w:5,d:6,h:3.8,kind:'granary'},
  ]),
  ...[555,578,625,650].flatMap((z,row)=>[-1950,-1931,-1887]
    .filter(x=>!(row===1&&x===-1887))
    .map((x,i)=>({id:`town-house-${row}-${i}`,x,z,w:8+(i%2),d:10,h:row===1?6.1:4.2+(i%2)*.4,storeys:row===1?2:1,kind:'house'}))),
  ...[[-1968,580],[-1968,605],[-1913,555],[-1913,650]].map(([x,z],i)=>({id:`town-edge-${i}`,x,z,w:8,d:11,h:4.3,kind:'house'})),
  {id:'town-river-granary',x:-1890,z:580,w:11,d:15,h:5.5,kind:'granary'},
  {id:'town-market-hall',x:-1908,z:630,w:12,d:13,h:6.4,kind:'hall'},
  {id:'town-river-store',x:-1869,z:635,w:10,d:12,h:4.8,kind:'barn'},
],LIZEEM_HOUSING_TARGETS.ovesos);
export const OVESOS_AGRICULTURE_LANES=[
  [[-2110,575],[-2082,575],[-2082,590],[-2000,590],[-1910,602],[-1876,602],[-1876,580],[-1848,580]],
  [[-2110,575],[-2110,578],[-2136,578],[-2170,586],[-2170,659],[-2100,659],[-2100,690]],
  [[-2100,690],[-2075,678],[-2009,652],[-1980,614],[-1910,602]],
  [[-2100,690],[-2075,690],[-2075,703],[-2060,741],[-2010,742],[-1950,753],[-1900,755],[-1900,778],[-1870,775]],
  [[-1910,602],[-1910,611],[-1897,616],[-1897,665],[-1870,690],[-1870,701],[-1827,757],[-1827,775],[-1870,775]],
];
export const ovesosFieldAt=(x,z)=>OVESOS_FIELDS.find(f=>Math.abs(x-f.x)<=f.width/2&&Math.abs(z-f.z)<=f.depth/2);
export const inOvesosAgricultureWildland=(x,z)=>((x-OVESOS_AGRICULTURE_WILDLAND.x)/OVESOS_AGRICULTURE_WILDLAND.rx)**2+((z-OVESOS_AGRICULTURE_WILDLAND.z)/OVESOS_AGRICULTURE_WILDLAND.rz)**2<1;
