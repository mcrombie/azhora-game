import {LIZEEM_FOOD_TARGETS} from '../../scenarios/lizeem-food-targets.js';
import {LIZEEM_HOUSING_TARGETS} from '../../scenarios/lizeem-housing-targets.js';
import {withHousingCapacity,housingCapacity} from '../../settlements/housing-capacity.js';

// New productive land outside the retained city, not legacy quest farms.
// Small plots occupy gentle lower slopes; the steep northern hills stay wild.
export const ISAREOS_FARM_VIEW={x:-2840,z:-305,width:750,depth:625};
const plans=[
  {id:'western-smallholdings',name:'Western smallholdings',home:[-2635,-15],fields:[
    [-2560,0,24,24,'grain'],[-2610,40,24,24,'grain'],[-2575,30,24,24,'hay'],
    [-2655,65,24,24,'grain'],[-2590,-5,24,24,'pasture'],[-2580,60,24,24,'grain'],
  ]},
  {id:'northern-fields',name:'Northern fields',home:[-2440,-115],fields:[
    [-2420,-30,24,24,'grain'],[-2480,0,24,24,'grain'],[-2485,-35,24,24,'hay'],
    [-2450,-35,24,24,'grain'],[-2390,-45,24,24,'grain'],[-2395,-95,24,24,'pasture'],
  ]},
  {id:'city-gardens',name:'City garden farms',home:[-2255,-125],fields:[
    [-2365,-90,24,24,'grain'],[-2290,-60,24,24,'grain'],[-2325,-90,24,24,'grain'],
    [-2270,-90,24,24,'hay'],[-2340,-30,24,24,'grain'],[-2250,-35,24,24,'pasture'],
  ]},
];
const weight={grain:1,hay:.7,pasture:.55},target=LIZEEM_FOOD_TARGETS.isareos.production;
const total=plans.flatMap(f=>f.fields).reduce((n,[,,w,d,c])=>n+w*d*weight[c],0);
let allocated=0,index=0;const count=plans.reduce((n,f)=>n+f.fields.length,0);
export const ISAREOS_FARMS=plans.map(f=>({...f,fields:f.fields.map(([x,z,width,depth,crop],i)=>{
  const capacity=++index===count?Math.round((target-allocated)*100)/100:Math.round(target*width*depth*weight[crop]/total*100)/100;
  allocated+=capacity;return {id:`${f.id}-${i+1}`,x,z,width,depth,crop,capacity};
})}));
export const ISAREOS_FIELDS=ISAREOS_FARMS.flatMap(f=>f.fields);
export const isareosFoodCapacity=()=>Math.round(ISAREOS_FIELDS.reduce((n,f)=>n+f.capacity,0)*100)/100;
// Explicit accommodation split: 300 rural places, the remainder in Minora.
// Existing city homes receive that budget in the scenery adapter; importing
// this economic definition never imports the city's terrain or renderer.
export const ISAREOS_RURAL_BUILDINGS=withHousingCapacity(ISAREOS_FARMS.flatMap(f=>[
  {id:`${f.id}-house`,x:f.home[0]-11,z:f.home[1]-6,w:8,d:10,h:4.1,kind:'house'},
  {id:`${f.id}-barn`,x:f.home[0]+10,z:f.home[1]+9,w:9,d:14,h:4.9,kind:'barn'},
  {id:`${f.id}-granary`,x:f.home[0]-10,z:f.home[1]+13,w:5,d:6,h:3.8,kind:'granary'},
]),300);
export const MINORA_HOUSING_CAPACITY=LIZEEM_HOUSING_TARGETS.isareos-housingCapacity(ISAREOS_RURAL_BUILDINGS);
export const ISAREOS_AGRICULTURE_LANES=[
  [[-2635,-15],[-2608,-15],[-2608,-65],[-2308,-65],[-2308,-27]],
  [[-2440,-115],[-2440,-65]],
  [[-2255,-125],[-2308,-125],[-2308,-65]],
  [[-2635,-15],[-2635,122]],
];
export const ISAREOS_AGRICULTURE_WOODS={x:-2767,z:15,rx:37,rz:105,count:120,treeEvery:3,clearance:4};
export const isareosFieldAt=(x,z)=>ISAREOS_FIELDS.find(f=>Math.abs(x-f.x)<=f.width/2&&Math.abs(z-f.z)<=f.depth/2);
export const inIsareosAgricultureWoods=(x,z)=>{const w=ISAREOS_AGRICULTURE_WOODS;return ((x-w.x)/w.rx)**2+((z-w.z)/w.rz)**2<1;};
