/** The capital's broad interlake circuit. Lakes remain lakes: ambron.js clips
 * the actual curtains to dry land rather than building across this outline's water arcs. */
const freeze = Object.freeze;
export const AMBRON_CENTRE = freeze({ x: -1130, z: 10 });
export const AMBRON_OUTLINE = freeze([
  [-1270,-230],[-1165,-220],[-1100,-205],[-1060,-180],[-1025,-140],
  [-995,-95],[-980,-45],[-984,35],[-975,110],[-1000,160],[-1080,210],
  [-1160,238],[-1220,235],[-1275,202],[-1320,153],[-1340,110],
  [-1328,65],[-1300,12],[-1280,-40],[-1265,-102],[-1265,-180],
].map(([x,z]) => freeze({x,z})));
export function inAmbronOutline(x,z) {
  let inside=false;
  for(let i=0,j=AMBRON_OUTLINE.length-1;i<AMBRON_OUTLINE.length;j=i++) {
    const a=AMBRON_OUTLINE[i],b=AMBRON_OUTLINE[j];
    if((a.z>z)!==(b.z>z)&&x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x)inside=!inside;
  }
  return inside;
}
const gate = (id,name,edge,at,face) => freeze({id,name,edge,at,face,kind:'gate'});
export const CITY_GATES=freeze([
  gate('lake-gate','The Lake Gate',0,15,'north'),
  gate('crown-gate','The Crown Gate',2,24,'north-east'),
  gate('thelas-gate','The Thelas Gate',17,25,'west'),
  gate('brul-gate','The Brul Gate',5,27,'north-east'),
  gate('ossen-gate','The Ossen Gate',9,35,'east'),
  gate('plain-gate','The Plain Gate',11,22,'south'),
  gate('raft-gate','The Raft Gate',19,28,'west'),
]);
export function cityGatePoint(id) {
  const g=CITY_GATES.find(g=>g.id===id),a=AMBRON_OUTLINE[g.edge],b=AMBRON_OUTLINE[(g.edge+1)%AMBRON_OUTLINE.length];
  const t=g.at/Math.hypot(b.x-a.x,b.z-a.z);
  return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t};
}
const street=(id,width,layer,points)=>freeze({id,width,layer,points:freeze(points.map(([a,b])=>freeze({a,b})))});
const gateLocal=id=>{const p=cityGatePoint(id);return [p.x-AMBRON_CENTRE.x,p.z-AMBRON_CENTRE.z];};
export const CITY_STREETS=freeze([
  street('ela-street',8,'imperial',[gateLocal('lake-gate'),[-125,-223],[-125,-165],[-95,-145],[-60,-145],[-15,-150],[6,-141],[6,-95],[-5,-95],[-5,-70],[-5,-35],[-5,0],[-5,35],[-20,80],[-20,120],[-20,142],[-45,152],[-45,180],[-30,200],gateLocal('plain-gate')]),
  street('royal-court',8,'imperial',[[-95,-95],[-55,-95],[-5,-95],[40,-95],[80,-85]]),
  street('north-ring',6,'new',[[-95,-145],[-60,-145],[-15,-150],[8,-143],[8,-100]]),
  street('upper-lane',6,'new',[[-5,-74],[30,-80],[64,-74],[64,-10],[30,-10],[-5,-10]]),
  street('ossen-way',8,'imperial',[gateLocal('ossen-gate'),[110,162],[120,120],[70,120],[0,120],[-20,110]]),
  street('strand-street',6,'patched',[[-5,50],[-42,50],[-82,48],[-96,70],[-99,90],[-100,99],[-59,99],[-58,115],[-20,120]]),
  street('guild-lane',6,'new',[[-20,110],[-20,77],[-44,77],[-70,77]]),
  street('garden-lane',5,'lake-stone',[[-5,50],[28,50],[35,85],[70,95],[105,120]]),
  street('plain-gate-way',9,'imperial',[[-20,120],[-45,145],[-45,180],[-30,200],gateLocal('plain-gate')]),
  street('raft-way',6,'patched',[gateLocal('raft-gate'),[-110,-126],[-106,-95],[-67,-95]]),
  street('lake-strand',6,'patched',[[-99,16],[-82,48],[-42,50],[-5,50]]),
  street('brul-processional',8,'new',[gateLocal('brul-gate'),[115,-65],[100,-50],[70,-35],[50,-10],[50,38],[60,45],[70,95],[70,120]]),
  street('palace-approach',12,'imperial',[[30,8],[30,-10],[30,-20]]),
  street('crown-gate-way',7,'imperial',[gateLocal('crown-gate'),[50,-174],[45,-158]]),
  street('thelas-gate-way',4.2,'patched',[gateLocal('thelas-gate'),[-162,-16],[-146.8,-10.2624],[-137.2,20.2624],[-146,40],[-99,16]]),
  street('southern-boulevard',8,'new',[[-110,170],[-65,188],[-20,170],[35,180],[80,160],[110,162]]),
]);

export const AMBRON_PALACE=freeze({id:'ambron-royal-palace',x:-1100,z:-36,w:48,d:38,height:80});
const smoothRise=(low,high,v)=>{const t=Math.max(0,Math.min(1,(v-low)/(high-low)));return t*t*(3-2*t);};
/** Broad, walkable slopes between three city levels; the royal precinct is highest. */
export function ambronTerraceLevel(x,z) {
  return 20+(x-AMBRON_CENTRE.x)*.008+8*(1-smoothRise(45,105,z))
    +10*(1-smoothRise(-105,-55,z))+4*(1-smoothRise(-195,-135,z));
}
export function ambronGroundLevel(x,z) {
  let level=ambronTerraceLevel(x,z);
  // Keep existing frontages on small level foundations within the larger slope.
  for(const [a,b,w,d] of GROUND_PLOTS) {
    const px=a+AMBRON_CENTRE.x,pz=b+AMBRON_CENTRE.z;
    const outside=Math.max(Math.abs(x-px)-w/2,Math.abs(z-pz)-d/2,0);
    if(outside<4)level+=(ambronTerraceLevel(px,pz)-level)*(1-smoothRise(0,4,outside));
  }
  const palaceDistance=Math.max(Math.abs(x-AMBRON_PALACE.x)-AMBRON_PALACE.w/2-3,Math.abs(z-AMBRON_PALACE.z)-AMBRON_PALACE.d/2-3,0);
  if(palaceDistance<15)level+=(50-level)*(1-smoothRise(0,15,palaceDistance));
  return level;
}
// Shipping cuts use world coordinates and their lakes' water levels. A continuous
// wet bed remains beneath road bridges; the walking deck is a separate surface.
const canal=(id,width,from,to,points)=>freeze({id,width,from,to,navigable:true,
  points:freeze(points.map(([x,z,surface])=>freeze({a:x-AMBRON_CENTRE.x,b:z-AMBRON_CENTRE.z,surface})))});
export const CITY_CANALS=freeze([
  canal('thelas-north',12,'thelas-upper','ambron-northern-lake',[
    [-1280,-88,16.8],[-1240,-88,16.8],[-1240,-170,16.8],[-1216,-214,16.8],[-1188,-235,16.8]]),
  canal('north-brul',12,'ambron-northern-lake','lake-brul',[
    [-1130,-190,16.8],[-1100,-164,16.8],[-1074,-154,16.4],[-1035,-144,16.4]]),
  canal('brul-ossen',14,'lake-brul','lake-ossen',[
    [-1005,-102,16.4],[-1010,-78,16.4],[-1015,-52,16],[-1015,5,16]]),
  canal('grand-southern',16,'lake-ossen','lake-ela',[
    [-985,58,16],[-997,120,16],[-1018,148,16],[-1060,180,16],[-1130,190,15.3],[-1185,200,15.3],[-1240,182,14.6],[-1280,158,14.6]]),
]);
export function segmentProjection(x,z,a,b) {
  const dx=b.a-a.a,dz=b.b-a.b,t=Math.max(0,Math.min(1,((x-a.a)*dx+(z-a.b)*dz)/(dx*dx+dz*dz||1)));
  return {distance:Math.hypot(x-a.a-t*dx,z-a.b-t*dz),t};
}
function segmentDistance(x,z,a,b){return segmentProjection(x,z,a,b).distance;}
export function cityCanalAt(x,z) {
  const a=x-AMBRON_CENTRE.x,b=z-AMBRON_CENTRE.z;
  if(a< -162||a>157||b< -255||b>202)return null;
  let best=null;
  for(const c of CITY_CANALS)for(let i=1;i<c.points.length;i++) {
    const sample=segmentProjection(a,b,c.points[i-1],c.points[i]);
    if(sample.distance>c.width/2+2||best&&sample.distance>=best.distance)continue;
    const bridge=CITY_STREETS.some(s=>s.points.slice(1).some((p,j)=>segmentDistance(a,b,s.points[j],p)<s.width/2+1));
    const surface=c.points[i-1].surface+(c.points[i].surface-c.points[i-1].surface)*sample.t;
    best={id:c.id,distance:sample.distance,width:c.width,bridge,surface};
  }
  return best;
}
export function cityCanalDeck(x,z){
  const c=cityCanalAt(x,z);
  return c?.bridge&&c.distance<c.width/2+1.5?Math.max(ambronGroundLevel(x,z),c.surface+4.5):null;
}
/** Existing identities keep their building ids; coordinates describe a new
 * capital, not a translation of the former two-bank settlement. */
export const CITY_BUILDING_PLOTS=freeze({
  'toll-house':[-40,30,18,20,10], 'chain-house':[-54,58,12,14,6],
  'warehouse-1':[-55,-130,16,20,9], 'warehouse-2':[-44,-74,18,18,8],
  'harbour-inn':[26,25,20,20,10], 'warehouse-3':[20,77,18,18,8],
  'record-house':[25,-122,20,26,12], 'house-ne':[-112,-216,12,18,8],
  'lake-temple':[-84,-118,20,30,15], 'clerks-house':[-92,-173,12,18,7.5],
  'legate-seat':[-20,-121,32,30,18], 'lake-granary':[-4,145,24,20,12],
  'house-se':[60,140,14,18,8], 'raft-shed':[-75,30,14,16,6],
  'sawpit-shed':[-75,61,14,16,6], 'salt-house':[-70,110,14,14,7],
  'strand-store':[-80,127,16,16,7], 'ropewalk':[-108,61,14,20,6],
  'poor-row-1':[-82,85,18,18,6], 'boatyard':[10,105,18,16,7],
  'poor-row-2':[80,130,16,18,6], 'ambron-forge':[-90,111,12,10,6],
});
const GROUND_PLOTS=Object.values(CITY_BUILDING_PLOTS);
export const CITY_MARKET=freeze({minA:-30,maxA:15,minB:-18,maxB:17});
export const CITY_GARDEN=freeze({minA:22,maxA:52,minB:55,maxB:68,
  beds:freeze([[28,58],[28,65],[36,58],[36,65],[44,58],[44,65]].map(([a,b])=>freeze({a,b}))),
  trees:freeze([[24,57],[50,57],[50,66]].map(([a,b])=>freeze({a,b}))),
  specimenWall:freeze({a:40,b:55.6}),dovecote:freeze({a:50,b:62})});
export const CITY_EXTRA_BUILDINGS=freeze([
  {id:'carpenters-guild',name:"The Carpenters' Guild",a:-44,b:91,w:16,d:16,h:9,kind:'hall',layer:'new',door:'north'},
  {id:'royal-bell-tower',name:'The Assembly Tower',a:-47,b:-113,w:8,d:10,h:23,kind:'hall',layer:'imperial',door:'south'},
  {id:'lake-archive-wing',a:25,b:-151,w:16,d:12,h:10,kind:'hall',layer:'imperial',door:'west'},
  {id:'south-guild-hall',a:27,b:141,w:22,d:20,h:11,kind:'hall',layer:'new',door:'north'},
].map(freeze));

/** No new residents are implied by these anonymous building plots. The loose
 * street blocks differ in size/height and reserve the old residents' frontages. */
export function cityInfill(existing, dryAt=()=>Infinity, reservedAt=()=>false) {
  const entries=[],districts=[
    {id:'north',minA:-130,maxA:105,minB:-207,maxB:-68,layer:'imperial'},
    {id:'middle',minA:-160,maxA:142,minB:-67,maxB:74,layer:'lake-stone'},
    {id:'south',minA:-175,maxA:140,minB:75,maxB:212,layer:'patched'},
  ];
  const distance=(x,z,a,b)=>{const dx=b.a-a.a,dz=b.b-a.b,t=Math.max(0,Math.min(1,((x-a.a)*dx+(z-a.b)*dz)/(dx*dx+dz*dz||1)));return Math.hypot(x-a.a-dx*t,z-a.b-dz*t);};
  let index=0;
  for(const d of districts)for(let b=d.minB;b<=d.maxB;b+=9)for(let a=d.minA;a<=d.maxA;a+=9) {
    const indexNow=index++,w=5.6+(indexNow%4)*1.05,depth=6.2+(indexNow%3)*1.35;
    const points=[[a,b],[a-w/2-1,b-depth/2-1],[a+w/2+1,b-depth/2-1],[a-w/2-1,b+depth/2+1],[a+w/2+1,b+depth/2+1]];
    if(points.some(([x,z])=>!inAmbronOutline(x+AMBRON_CENTRE.x,z+AMBRON_CENTRE.z)))continue;
    if(reservedAt(a+AMBRON_CENTRE.x,b+AMBRON_CENTRE.z,w,depth))continue;
    if(CITY_GATES.some(g=>{const p=cityGatePoint(g.id);return Math.abs(p.x-a-AMBRON_CENTRE.x)<w/2+18&&Math.abs(p.z-b-AMBRON_CENTRE.z)<depth/2+18;}))continue;
    if(points.some(([x,z])=>dryAt(x+AMBRON_CENTRE.x,z+AMBRON_CENTRE.z)<3.5||cityCanalAt(x+AMBRON_CENTRE.x,z+AMBRON_CENTRE.z)||reservedAt(x+AMBRON_CENTRE.x,z+AMBRON_CENTRE.z)))continue;
    if(Math.abs(a+AMBRON_CENTRE.x-AMBRON_PALACE.x)<AMBRON_PALACE.w/2+w/2+6&&Math.abs(b+AMBRON_CENTRE.z-AMBRON_PALACE.z)<AMBRON_PALACE.d/2+depth/2+8)continue;
    if(Math.max(...points.map(([x,z])=>ambronGroundLevel(x+AMBRON_CENTRE.x,z+AMBRON_CENTRE.z)))-Math.min(...points.map(([x,z])=>ambronGroundLevel(x+AMBRON_CENTRE.x,z+AMBRON_CENTRE.z)))>6)continue;
    if([...existing,...entries].some(h=>Math.abs(h.a-a)<(h.w+w)/2+(existing.includes(h)?3.4:.85)&&Math.abs(h.b-b)<(h.d+depth)/2+(existing.includes(h)?3.4:.85)))continue;
    if(CITY_STREETS.some(s=>s.points.slice(1).some((q,i)=>points.some(([x,z])=>distance(x,z,s.points[i],q)<s.width/2+.8))))continue;
    if(a+w/2>CITY_MARKET.minA-4&&a-w/2<CITY_MARKET.maxA+4&&b+depth/2>CITY_MARKET.minB-4&&b-depth/2<CITY_MARKET.maxB+4)continue;
    if(a+w/2>CITY_GARDEN.minA-4&&a-w/2<CITY_GARDEN.maxA+4&&b+depth/2>CITY_GARDEN.minB-4&&b-depth/2<CITY_GARDEN.maxB+4)continue;
    entries.push(freeze({id:`${d.id}-townhouse-${indexNow}`,a,b,w,d:depth,h:[6.5,21,28,14,32,9,25,18][indexNow%8],layer:indexNow%7===0?'new':d.layer,kind:indexNow%8===0?'shed':indexNow%3?'house':'row',door:'south'}));
  }
  return entries;
}

/** Minimum distance outside the irregular city circuit, zero inside. */
export function ambronOutsideDistance(x,z) {
  if(inAmbronOutline(x,z))return 0;
  let nearest=Infinity;
  for(let i=0;i<AMBRON_OUTLINE.length;i++){
    const a=AMBRON_OUTLINE[i],b=AMBRON_OUTLINE[(i+1)%AMBRON_OUTLINE.length],dx=b.x-a.x,dz=b.z-a.z;
    const t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)));
    nearest=Math.min(nearest,Math.hypot(x-a.x-t*dx,z-a.z-t*dz));
  }
  return nearest;
}
export function ambronTerraceWeight(x,z) {
  const outside=ambronOutsideDistance(x,z);
  // The wall and its dry berm share a plane; beyond them the shore resumes
  // naturally. No rectangular reclamation of the four surrounding lakes.
  const t=Math.max(0,Math.min(1,(outside-7)/17));
  return 1-t*t*(3-2*t);
}
export const AMBRON_LAYOUT_VERSION=2;
export const AMBRON_LEGACY_BOUNDS=freeze({minX:-1390,maxX:-1158,minZ:192,maxZ:398});
export const AMBRON_SAFE_ARRIVAL=freeze({x:-1013.342,z:147.45});
export const CAGNEY_ROADSIDE_HAMLET=freeze({id:'cagney-roadside-hamlet',x:-922,z:186,radius:31,buildings:freeze([
  freeze({x:-934,z:184,w:8,d:7,h:4.3}),freeze({x:-914,z:182,w:7,d:7,h:4.0}),freeze({x:-895,z:184,w:9,d:7,h:4.6}),
])});
