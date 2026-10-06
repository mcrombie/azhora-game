/** Minora occupies the dry Isareos bank of the atlas's Isa–Lizeem confluence.
 * Nothing in this layout straightens, relocates, or fills the rivers. */
import { ISAREOS_RIVER, LIZEEM, ISAREOS_BECKS, courseDistance, coursePosition, courseHalfAt } from '../western-regions/west-regions.js';

const freeze = Object.freeze;
const pt = (x, z) => freeze({ x, z });
export const MENORA = freeze({ id: 'menora', name: 'Minora', region: 16,
  x: -2345, z: 120, elevation: 21.3, wallHeight: 18, towerHeight: 128,
  fork: pt(ISAREOS_RIVER.points.at(-1).x, ISAREOS_RIVER.points.at(-1).z),
  arrival: pt(-2308, -7), templeCourt: pt(-2338, 143), muster: pt(-2470, 85),
});
export const MENORA_OUTLINE = freeze([
  [-2440,10],[-2285,10],[-2285,55],[-2242,105],[-2244,160],[-2275,212],[-2360,214],[-2438,200],
].map(([x,z])=>pt(x,z)));

export function inMenora(x,z) {
  let inside = false;
  for(let i=0,j=MENORA_OUTLINE.length-1;i<MENORA_OUTLINE.length;j=i++) {
    const a=MENORA_OUTLINE[i], b=MENORA_OUTLINE[j];
    if((a.z>z)!==(b.z>z) && x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x) inside=!inside;
  }
  return inside;
}
export function menoraSegmentDistance(x,z,a,b) {
  const dx=b.x-a.x,dz=b.z-a.z,q=dx*dx+dz*dz,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/q));
  return Math.hypot(x-a.x-dx*t,z-a.z-dz*t);
}
export const MENORA_GATES = freeze([
  {id:'menora-north-gate',name:'The Northern Gate',edge:0,x:-2308,z:10,width:14},
  {id:'menora-river-gate',name:'The Lizeem Gate',edge:3,x:-2243.090909,z:135,width:14},
  {id:'menora-south-gate',name:'The Isa Gate',edge:5,x:-2308,z:212.776471,width:14},
  {id:'menora-west-gate',name:'The Muster Gate',edge:7,x:-2438.547368,z:148,width:14},
].map(freeze));
const path=(id,width,points)=>freeze({id,width,points:freeze(points.map(([x,z])=>pt(x,z)))});
export const MENORA_PATHS=freeze([
  path('menora-sacred-way',9,[[-2308,-27],[-2308,10],[-2308,60],[-2308,135],[-2308,190],[-2308,213],[-2308,299]]),
  path('menora-guild-way',7,[[-2434,70],[-2400,70],[-2360,70],[-2328,70],[-2308,70]]),
  path('menora-temple-way',8,[[-2440,148],[-2404,148],[-2370,148],[-2332,148],[-2332,135],[-2308,135],[-2243,135],[-2148,135]]),
  path('menora-market-lane',6,[[-2404,70],[-2404,105],[-2404,148],[-2404,184],[-2340,184],[-2308,184]]),
  path('menora-river-promenade',6,[[-2308,32],[-2298,55],[-2270,96],[-2270,135],[-2268,150],[-2268,173],[-2277,180],[-2308,180]]),
  path('menora-muster-approach',7,[[-2404,148],[-2439,148],[-2470,148],[-2470,105],[-2470,65]]),
]);
export const MENORA_BRIDGES=freeze([
  freeze({id:'menora-lizeem-bridge',name:'The White Bridge',axis:'x',x:-2210,z:135,start:-2258,end:-2162,width:10,deck:21.3,river:LIZEEM.id}),
  freeze({id:'menora-isa-bridge',name:'The Pilgrims’ Bridge',axis:'z',x:-2308,z:245,start:204,end:286,width:10,deck:21.3,river:ISAREOS_RIVER.id}),
  freeze({id:'menora-guild-footbridge',name:'The Guild Footbridge',axis:'x',x:-2371,z:70,start:-2391,end:-2351,width:8,deck:21.3,river:'isareos-beck-east'}),
  freeze({id:'menora-garden-footbridge',name:'The Garden Footbridge',axis:'x',x:-2385,z:148,start:-2407,end:-2362,width:10,deck:21.3,railInsetStart:9,river:'isareos-beck-east'}),
  freeze({id:'menora-south-footbridge',name:'The South Footbridge',axis:'x',x:-2390,z:184,start:-2413,end:-2370,width:9,deck:21.3,railInsetStart:15,river:'isareos-beck-east'}),
]);
export function menoraBridgeAt(x,z,margin=0) {
  return MENORA_BRIDGES.find(b=>b.axis==='x'
    ? x>=b.start-margin&&x<=b.end+margin&&Math.abs(z-b.z)<=b.width/2+margin
    : z>=b.start-margin&&z<=b.end+margin&&Math.abs(x-b.x)<=b.width/2+margin)??null;
}
export function menoraDeckHeight(x,z) {return menoraBridgeAt(x,z)?.deck??null;}
export const onMenoraBridge=(x,z)=>Boolean(menoraBridgeAt(x,z));

const building=(id,name,x,z,width,depth,height,kind='house',roof='#547078')=>freeze({id,name,x,z,width,depth,height,kind,roof});
export const MENORA_BUILDINGS=freeze([
  building('menora-sorcerers-guild','The Sorcerers’ Guild',-2414,42,25,25,128,'sorcerers-tower'),
  building('menora-guild-library','The Guild Library',-2328,42,25,27,16,'guild','#526177'),
  building('menora-grand-temple','The Grand Temple',-2338,102,32,34,31,'temple','#d4c495'),
  building('menora-sanctuary-annex','Temple cloister',-2420,125,20,20,11,'cloister','#929591'),
  building('menora-river-hall','The River Hall',-2280,160,16,22,13,'hall'),
  building('menora-west-barracks','Western barracks',-2421,95,22,22,12,'hall','#7c6770'),
  building('menora-storehouse','River storehouse',-2337,202,24,11,8,'hall'),
  ...[
    [-2422,169,18,15,9],[-2417,194,17,10,8],[-2365,168,18,13,9],[-2340,168,18,13,12],
    [-2367,200,12,10,11],[-2390,96,12,16,10],[-2385,25,12,14,10],
    [-2347,22,12,12,9],[-2351,55,10,12,10],[-2281,112,13,16,8],
    [-2319,201,10,10,10],[-2286,191,12,13,9],[-2353,190,12,8,8],
  ].map(([x,z,w,d,h],i)=>building(`menora-house-${i+1}`,'Minora house',x,z,w,d,h,'house',['#526b75','#727c83','#809080','#836c75'][i%4])),
]);
export const MENORA_NPC_ANCHORS=freeze({
  cedric:freeze({x:-2338,z:138,yaw:0}),wilhelm:freeze({x:-2464,z:67,yaw:0}),
  army:freeze(Array.from({length:16},(_,i)=>freeze({x:-2493+(i%4)*5,z:78+Math.floor(i/4)*6,yaw:Math.PI/2}))),
  guards:freeze(MENORA_GATES.flatMap(g=>{const a=MENORA_OUTLINE[g.edge],b=MENORA_OUTLINE[(g.edge+1)%MENORA_OUTLINE.length],l=Math.hypot(b.x-a.x,b.z-a.z),dx=(b.x-a.x)/l,dz=(b.z-a.z)/l;
    // The south gate opens directly onto the bridge: stand inside its parapets.
    const offset=['menora-south-gate','menora-river-gate'].includes(g.id)?3.5:5.4;
    return [-1,1].map(s=>freeze({x:g.x+dx*offset*s-dz*4,z:g.z+dz*offset*s+dx*4,yaw:Math.atan2(dz,-dx)}));})),
});
/** The factors' market corner on the plaza by the Temple Way (the Farmlands of the Lizeem, approved and
 * ordered built on 5 October 2026). The east-bank factors keep the north side of the Temple Way and the
 * west-bank factors face them from the plaza's south edge, as the Lizeem divides their countries. Each stand is where the
 * factor waits, behind the counter and facing the street; the stalls are open, as the Caricas grain
 * court's are. Stands keep more than 4 m from water and 1 m from any building (tests/menora-city.test.js). */
const marketStand=(factor,name,country,x,z,yaw)=>freeze({id:`menora-stall-${factor}`,factor,name,country,
  x,z:z+(Math.cos(yaw)<0?1.1:-1.1),yaw,stall:freeze({x,z,width:4.4,depth:2.6})});
export const LIZEEM_MARKET_STANDS=freeze([
  marketStand('portunus','Portunus','Caricas',-2362,140.1,0),marketStand('njord','Njord','Nesdor',-2368,140.1,0),
  marketStand('manawydan','Manawydan','Nethereum',-2371.5,156,Math.PI),marketStand('adapa','Adapa','Ovesos',-2365.5,156,Math.PI),
]);
export const MENORA_GARDENS=freeze([
  freeze({x:-2350,z:78,width:22,depth:7}),freeze({x:-2414,z:139,width:23,depth:5}),
  freeze({x:-2292,z:47,width:8,depth:25}),freeze({x:-2355,z:154,width:14,depth:6}),
]);
export const MENORA_CAMP=freeze({x:-2474,z:83,width:67,depth:95,
  tents:freeze([[-2500,47],[-2483,43],[-2464,43],[-2500,111],[-2483,114],[-2464,114]].map(([x,z],i)=>freeze({id:`blood-prince-tent-${i}`,x,z,width:i===2?10:8,depth:10,height:i===2?7:5}))),
});

const localRivers=[ISAREOS_RIVER,LIZEEM,...ISAREOS_BECKS];
/** Signed distance from visible water, using the actual varying channel width. */
export function menoraRiverClearance(x,z) {
  let result=Infinity;
  for(const river of localRivers) {
    const d=courseDistance(river,x,z);
    if(d<result+river.maxHalf)result=Math.min(result,d-courseHalfAt(river,coursePosition(river,x,z)));
  }
  return result;
}
function boundaryDistance(x,z) {
  return Math.min(...MENORA_OUTLINE.map((a,i)=>menoraSegmentDistance(x,z,a,MENORA_OUTLINE[(i+1)%MENORA_OUTLINE.length])));
}
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
function boxDistance(x,z,c){return Math.hypot(Math.max(0,Math.abs(x-c.x)-c.width/2),Math.max(0,Math.abs(z-c.z)-c.depth/2));}
export function menoraGround(x,z,base) {
  if(x<-2530||x>-2128||z<-25||z>309)return base;
  const water=menoraRiverClearance(x,z);
  if(water<6)return base;
  let weight=inMenora(x,z)?1:1-smooth(boundaryDistance(x,z)/22);
  weight=Math.max(weight,1-smooth(boxDistance(x,z,MENORA_CAMP)/18));
  // Small dry abutments meet the level bridge deck; a river bed never becomes a ramp.
  for(const b of MENORA_BRIDGES)for(const end of [b.start,b.end]) {
    const c=b.axis==='x'?{x:end,z:b.z,width:10,depth:11}:{x:b.x,z:end,width:11,depth:10};
    weight=Math.max(weight,1-smooth(boxDistance(x,z,c)/17));
  }
  weight*=smooth((water-6)/12);
  return base+(MENORA.elevation-base)*weight;
}
export function menoraReserved(x,z,margin=0) {
  if(x<-2530-margin||x>-2128+margin||z<-30-margin||z>311+margin)return false;
  if(inMenora(x,z)||boundaryDistance(x,z)<12+margin||boxDistance(x,z,MENORA_CAMP)<8+margin)return true;
  return MENORA_PATHS.some(p=>p.points.some((a,i)=>i>0&&menoraSegmentDistance(x,z,p.points[i-1],a)<p.width/2+3+margin));
}
