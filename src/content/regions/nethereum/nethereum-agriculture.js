import {LIZEEM_FOOD_TARGETS} from '../../scenarios/lizeem-food-targets.js';
import {withHousingCapacity} from '../../settlements/housing-capacity.js';
import {LIZEEM_HOUSING_TARGETS} from '../../scenarios/lizeem-housing-targets.js';

// Replacement layout, authored from the regional budget rather than old quest
// plots. World metres; north is -Z. These parcels are visual representations of
// productive land at the game's compressed world scale, not real-world yields.
// The campaign consumes their total capacity and alone applies losses/recovery.
export const NETHEREUM_FARM_TARGET = LIZEEM_FOOD_TARGETS.nethereum.production;
export const NETHEREUM_FARM_VIEW = {x:-2975,z:110,width:980,depth:530};
export const NETHEREUM_WILDLAND = {x:-2890,z:212,rx:85,rz:56};
export const NETHEREUM_TOWN = {name:'Nethereum Town',x:-2215,z:387};
// Leave the bridge's downstream turning reach and passenger berth out of the channel.
export const NETHEREUM_QUAY = {bank:-2190,end:-2166,z:365,width:4};
const plans = [
  {id:'western-fields',name:'Western fields',home:[-2770,339],fields:[
    [-2778,254,42,48,'grain'],[-2810,313,50,52,'grain'],[-2738,271,36,64,'grain'],
    [-2741,395,54,61,'grain'],[-2800,384,45,44,'pasture'],[-2767,454,30,44,'hay'],
    [-2778,204,36,40,'grain'],[-2770,312,26,26,'hay'],[-2716,443,33,26,'grain'],
  ]},
  {id:'north-fields',name:'Northern fields',home:[-2601,268],fields:[
    [-2720,208,64,60,'grain'],[-2638,208,62,60,'grain'],[-2580,206,38,47,'hay'],
    [-2640,281,48,57,'grain'],[-2556,305,42,31,'grain'],[-2700,397,20,40,'pasture'],
    [-2710,274,20,65,'grain'],
  ]},
  {id:'hollow-fields',name:'Hollow meadows',home:[-2553,393],fields:[
    [-2580,355,62,42,'grain'],[-2504,345,60,54,'grain'],[-2657,379,48,28,'hay'],
    [-2590,420,43,44,'hay'],[-2510,418,42,39,'grain'],[-2635,461,30,25,'pasture'],
    [-2450,335,28,46,'grain'],[-2666,411,24,20,'hay'],
  ]},
  {id:'south-fields',name:'Southern fields',home:[-2460,467],fields:[
    [-2398,548,28,25,'pasture'],[-2590,468,44,39,'grain'],[-2519,467,58,42,'grain'],
    [-2441,440,42,30,'grain'],[-2410,499,43,40,'grain'],[-2289,465,49,39,'hay'],
    [-2310,526,38,48,'pasture'],
  ]},
  {id:'river-fields',name:'River fields',home:[-2311,365],fields:[
    [-2470,290,67,35,'grain'],[-2395,286,56,31,'grain'],[-2303,290,55,38,'grain'],
    [-2307,330,47,28,'hay'],[-2342,408,40,49,'grain'],[-2287,411,36,44,'pasture'],
    [-2390,385,40,32,'grain'],
    [-2270,348,25,28,'grain'],[-2250,304,34,58,'grain'],[-2332,455,22,22,'hay'],
  ]},
];
const weight={grain:1,hay:.7,pasture:.55};
const total=plans.flatMap(p=>p.fields).reduce((n,[,,w,d,c])=>n+w*d*weight[c],0);
// Round to cents; put the exact remainder in the final parcel so the campaign
// target stays identical across browser/CLI and never depends on rendered LOD.
let allocated=0,index=0;
const count=plans.reduce((n,p)=>n+p.fields.length,0);
export const NETHEREUM_FARMS=plans.map(p=>({...p,fields:p.fields.map(([x,z,width,depth,crop],i)=>{
  const capacity=++index===count?Math.round((NETHEREUM_FARM_TARGET-allocated)*100)/100:Math.round(NETHEREUM_FARM_TARGET*width*depth*weight[crop]/total*100)/100;
  allocated+=capacity;
  return {id:`${p.id}-${i+1}`,x,z,width,depth,crop,capacity};
})}));
export const NETHEREUM_FIELDS=NETHEREUM_FARMS.flatMap(p=>p.fields);
export const nethereumFoodCapacity=()=>Math.round(NETHEREUM_FIELDS.reduce((n,p)=>n+p.capacity,0)*100)/100;

// Cart lanes leave meadow drains open. Small bridges are explicit walk surfaces.
export const NETHEREUM_LANES=[
  [[-2827,343],[-2770,339],[-2725,339],[-2670,315],[-2601,321],[-2601,268]],
  [[-2601,268],[-2600,324],[-2540,324],[-2540,382],[-2553,393],[-2473,386],[-2391,346],[-2336,346],[-2336,370],[-2311,365],[-2289,364],[-2240,382],[-2215,387]],
  [[-2553,393],[-2560,446],[-2482,474],[-2460,467],[-2410,467],[-2370,494],[-2322,443],[-2311,365]],
  [[-2311,365],[-2308,272]],
  [[-2215,387],[-2193,378],[-2180,365],[-2158,365]],
];
export const NETHEREUM_BRIDGES=[
  {x:-2669.79,z:315.02,yaw:1.4841,length:18,width:4.5},
  {x:-2420.82,z:360.55,yaw:2.0246,length:16,width:4.5},
  {x:-2363.17,z:486.75,yaw:2.3865,length:18,width:4.5},
];
export const NETHEREUM_BUILDINGS=withHousingCapacity([
  ...NETHEREUM_FARMS.flatMap(f=>[
    {id:`${f.id}-house`,x:f.home[0]-11,z:f.home[1]-6,w:8,d:10,h:3.8,kind:'house'},
    {id:`${f.id}-barn`,x:f.home[0]+10,z:f.home[1]+9,w:9,d:14,h:4.7,kind:'barn'},
    {id:`${f.id}-granary`,x:f.home[0]-10,z:f.home[1]+13,w:5,d:6,h:3.6,kind:'granary'},
  ]),
  ...[
    [-2241,368,8,10,4,'house'],[-2227,367,8,12,5,'house'],[-2212,364,10,13,5,'hall'],
    [-2242,398,8,10,4,'house'],[-2228,403,9,11,4.8,'house'],[-2210,409,9,12,4,'house'],
    [-2194,398,8,12,4.3,'house'],[-2193,366,10,14,5.2,'granary'],[-2200,427,9,12,4,'barn'],
    [-2256,421,8,10,4,'house'],[-2225,426,7,11,4.2,'house'],
  ].map(([x,z,w,d,h,kind],i)=>({id:`town-${i}`,x,z,w,d,h,kind})),
],LIZEEM_HOUSING_TARGETS.nethereum);

export function fieldAt(x,z){return NETHEREUM_FIELDS.find(f=>Math.abs(x-f.x)<=f.width/2&&Math.abs(z-f.z)<=f.depth/2);}
export function inNethereumWildland(x,z){const p=NETHEREUM_WILDLAND;return ((x-p.x)/p.rx)**2+((z-p.z)/p.rz)**2<1;}
