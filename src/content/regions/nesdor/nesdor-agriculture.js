import {LIZEEM_FOOD_TARGETS} from '../../scenarios/lizeem-food-targets.js';
import {LIZEEM_HOUSING_TARGETS} from '../../scenarios/lizeem-housing-targets.js';
import {withHousingCapacity} from '../../settlements/housing-capacity.js';

// Fresh clearings and river town, independent of the old farm/quest layout.
// Forested land represents uncultivated potential; it produces no food or timber
// in this experiment. The campaign alone owns output, stores and disruptions.
export const NESDOR_FARM_TARGET=LIZEEM_FOOD_TARGETS.nesdor.production;
export const NESDOR_FARM_VIEW={x:-1810,z:400,width:700,depth:610};
export const NESDOR_AGRICULTURE_TOWN={name:'Nesdor Town',x:-1578,z:850};
export const NESDOR_AGRICULTURE_QUAY={bank:-1623,end:-1650,z:860,width:4.5};
export const NESDOR_AGRICULTURE_WOODS=[
  {x:-1450,z:570,rx:125,rz:133,count:650,treeEvery:1,treeScale:1.75,clearance:5.5},
  {x:-1364,z:804,rx:153,rz:132,count:750,treeEvery:1,treeScale:1.85,clearance:5.5},
  {x:-1658,z:495,rx:43,rz:73,count:160,treeEvery:1,treeScale:1.7,clearance:5.5},
];
const plans=[
  {id:'northern-clearings',name:'Northern clearings',home:[-1480,565],fields:[
    [-1490,500,36,40,'grain'],[-1438,500,40,32,'grain'],[-1420,550,42,38,'hay'],
    [-1484,622,38,40,'grain'],[-1430,607,39,38,'pasture'],
  ]},
  {id:'beck-meadows',name:'Beck meadows',home:[-1570,710],fields:[
    [-1615,675,34,38,'grain'],[-1615,727,35,38,'hay'],[-1490,671,42,37,'grain'],
    [-1490,726,43,35,'pasture'],[-1547,753,43,25,'grain'],
  ]},
  {id:'eastern-clearings',name:'Eastern clearings',home:[-1370,832],fields:[
    [-1410,780,38,36,'grain'],[-1356,784,37,33,'grain'],[-1419,842,40,38,'grain'],
    [-1400,899,42,40,'hay'],[-1345,891,39,43,'pasture'],
  ]},
];
const weight={grain:1,hay:.7,pasture:.55};
const total=plans.flatMap(f=>f.fields).reduce((n,[,,w,d,c])=>n+w*d*weight[c],0);
let allocated=0,index=0;const count=plans.reduce((n,f)=>n+f.fields.length,0);
export const NESDOR_FARMS=plans.map(f=>({...f,fields:f.fields.map(([x,z,width,depth,crop],i)=>{
  const capacity=++index===count?Math.round((NESDOR_FARM_TARGET-allocated)*100)/100:Math.round(NESDOR_FARM_TARGET*width*depth*weight[crop]/total*100)/100;
  allocated+=capacity;return {id:`${f.id}-${i+1}`,x,z,width,depth,crop,capacity};
})}));
export const NESDOR_FIELDS=NESDOR_FARMS.flatMap(f=>f.fields);
export const nesdorFoodCapacity=()=>Math.round(NESDOR_FIELDS.reduce((n,f)=>n+f.capacity,0)*100)/100;
export const NESDOR_AGRICULTURE_BUILDINGS=withHousingCapacity([
  ...NESDOR_FARMS.flatMap(f=>[
    {id:`${f.id}-house`,x:f.home[0]-11,z:f.home[1]-6,w:8,d:10,h:4.1,kind:'house'},
    {id:`${f.id}-barn`,x:f.home[0]+10,z:f.home[1]+9,w:9,d:14,h:4.9,kind:'barn'},
    {id:`${f.id}-granary`,x:f.home[0]-10,z:f.home[1]+13,w:5,d:6,h:3.8,kind:'granary'},
  ]),
  ...[803,830,874].flatMap((z,row)=>[-1615,-1595,-1560,-1540].map((x,i)=>({
    id:`town-house-${row}-${i}`,x:x+(row===1?2:0),z:z+(i%2)*2,w:8+(i%2),d:10,h:row===1&&i===1?6.1:4.1+(i%2)*.4,storeys:row===1&&i===1?2:1,kind:'house',
  }))),
  ...[-1590,-1565,-1540].map((x,i)=>({id:`town-north-${i}`,x,z:781,w:8,d:11,h:4.3,kind:'house'})),
  {id:'town-granary',x:-1620,z:842,w:10,d:14,h:5.5,kind:'granary'},
  {id:'town-hall',x:-1550,z:851,w:12,d:12,h:6.2,kind:'hall'},
  {id:'town-store',x:-1526,z:841,w:10,d:13,h:4.9,kind:'barn'},
],LIZEEM_HOUSING_TARGETS.nesdor);
export const NESDOR_AGRICULTURE_LANES=[
  [[-1480,565],[-1455,565],[-1455,650],[-1510,700],[-1570,710]],
  [[-1570,710],[-1544,710],[-1513,729],[-1513,802],[-1515,850],[-1515,860],[-1578,860],[-1578,850]],
  [[-1578,850],[-1597,860],[-1623,860],[-1650,860]],
  [[-1515,850],[-1496,825],[-1450,815],[-1398,815],[-1398,835],[-1370,832]],
  [[-1578,850],[-1578,814],[-1578,781]],
  [[-1578,850],[-1578,899]],
];
export const nesdorFieldAt=(x,z)=>NESDOR_FIELDS.find(f=>Math.abs(x-f.x)<=f.width/2&&Math.abs(z-f.z)<=f.depth/2);
export const inNesdorAgricultureWoods=(x,z)=>NESDOR_AGRICULTURE_WOODS.some(w=>((x-w.x)/w.rx)**2+((z-w.z)/w.rz)**2<1);
