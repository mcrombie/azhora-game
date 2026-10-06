/** Ambron's dry interlake footprint. World-space shoreline geometry is fixed;
 * this outline follows the dry shoulders between Ela, Thelas, Brul and Ossen. */
const freeze = Object.freeze;
export const AMBRON_CENTRE = freeze({ x: -1130, z: 10 });
export const AMBRON_OUTLINE = freeze([
  [-1245,-158],[-1085,-158],[-1080,-95],[-1010,-60],[-1075,-25],[-1080,80],
  [-1010,110],[-970,150],[-1120,180],[-1230,145],[-1260,70],[-1190,5],
  [-1170,-25],[-1190,-65],[-1230,-95],
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
  gate('lake-gate','The Lake Gate',0,100,'north'),
  gate('brul-gate','The Brul Gate',2,39,'north-east'),
  gate('ossen-gate','The Ossen Gate',7,42,'east'),
  gate('plain-gate','The Plain Gate',8,58,'south'),
  gate('raft-gate','The Raft Gate',10,35,'west'),
]);
export function cityGatePoint(id) {
  const g=CITY_GATES.find(g=>g.id===id),a=AMBRON_OUTLINE[g.edge],b=AMBRON_OUTLINE[(g.edge+1)%AMBRON_OUTLINE.length];
  const t=g.at/Math.hypot(b.x-a.x,b.z-a.z);
  return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t};
}
const street=(id,width,layer,points)=>freeze({id,width,layer,points:freeze(points.map(([a,b])=>freeze({a,b})))});
export const CITY_STREETS=freeze([
  street('ela-street',8,'imperial',[[-15,-168],[-15,-150],[6,-141],[6,-95],[-5,-95],[-5,-70],[-5,-35],[-5,0],[-5,35],[-20,80],[-20,120],[-20,142],[-45.269695,152.414188]]),
  street('royal-court',8,'imperial',[[-95,-95],[-55,-95],[-5,-95],[40,-95],[80,-85]]),
  street('north-ring',6,'new',[[-95,-145],[-60,-145],[-15,-150],[8,-143],[8,-100]]),
  street('upper-lane',5,'new',[[-5,-74],[22,-74],[40,-74],[40,-42],[22,-42],[-5,-42]]),
  street('ossen-way',8,'imperial',[[118.8156,148.2369],[115,132],[120,120],[70,120],[0,120],[-20,110]]),
  street('strand-street',6,'patched',[[-5,50],[-42,50],[-82,48],[-96,70],[-99,90],[-100,99],[-59,99],[-58,115],[-20,120]]),
  street('guild-lane',6,'new',[[-20,110],[-20,77],[-44,77],[-70,77]]),
  street('garden-lane',5,'lake-stone',[[-5,50],[28,50],[35,85],[70,95],[105,120]]),
  street('plain-gate-way',7,'imperial',[[-20,120],[-45,145],[-45.269695,152.414188]]),
  street('raft-way',6,'patched',[[-104.352228,36.184212],[-82,48],[-42,50],[-5,50]]),
]);
/** Existing identities keep their building ids; coordinates describe a new
 * capital, not a translation of the former two-bank settlement. */
export const CITY_BUILDING_PLOTS=freeze({
  'toll-house':[-40,30,18,20,10], 'chain-house':[-54,58,12,14,6],
  'warehouse-1':[-55,-130,16,20,9], 'warehouse-2':[-44,-74,18,18,8],
  'harbour-inn':[26,25,20,20,10], 'warehouse-3':[20,77,18,18,8],
  'record-house':[25,-122,20,26,12], 'house-ne':[22,-59,12,18,8],
  'lake-temple':[-84,-118,20,30,15], 'clerks-house':[22,-28,12,18,7.5],
  'legate-seat':[-20,-121,32,30,18], 'lake-granary':[-4,145,24,20,12],
  'house-se':[60,140,14,18,8], 'raft-shed':[-75,30,14,16,6],
  'sawpit-shed':[-75,61,14,16,6], 'salt-house':[-70,110,14,14,7],
  'strand-store':[-80,127,16,16,7], 'ropewalk':[-108,61,14,20,6],
  'poor-row-1':[-82,85,18,18,6], 'boatyard':[10,105,18,16,7],
  'poor-row-2':[80,130,16,18,6], 'ambron-forge':[-90,111,12,10,6],
});
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
export function cityInfill(existing) {
  const entries=[],districts=[
    {id:'north',minA:-102,maxA:32,minB:-153,maxB:-70,layer:'imperial'},
    {id:'north-east',minA:46,maxA:100,minB:-94,maxB:-54,layer:'new'},
    {id:'middle',minA:-35,maxA:42,minB:-67,maxB:68,layer:'lake-stone'},
    {id:'south',minA:-108,maxA:130,minB:78,maxB:154,layer:'patched'},
  ];
  const distance=(x,z,a,b)=>{const dx=b.a-a.a,dz=b.b-a.b,t=Math.max(0,Math.min(1,((x-a.a)*dx+(z-a.b)*dz)/(dx*dx+dz*dz||1)));return Math.hypot(x-a.a-dx*t,z-a.b-dz*t);};
  let index=0;
  for(const d of districts)for(let b=d.minB;b<=d.maxB;b+=14)for(let a=d.minA;a<=d.maxA;a+=12) {
    const w=7+(index%3)*.7,depth=8+(index%2)*1.1,indexNow=index++;const points=[[a,b],[a-w/2-4,b-depth/2-4],[a+w/2+2,b-depth/2-4],[a-w/2-4,b+depth/2+2],[a+w/2+2,b+depth/2+2]];
    if(points.some(([x,z])=>!inAmbronOutline(x+AMBRON_CENTRE.x,z+AMBRON_CENTRE.z)))continue;
    if([...existing,...entries].some(h=>Math.abs(h.a-a)<(h.w+w)/2+2.3&&Math.abs(h.b-b)<(h.d+depth)/2+2.3))continue;
    if(CITY_STREETS.some(s=>s.points.slice(1).some((q,i)=>points.some(([x,z])=>distance(x,z,s.points[i],q)<s.width/2+2))))continue;
    if(a+w/2>CITY_MARKET.minA-4&&a-w/2<CITY_MARKET.maxA+4&&b+depth/2>CITY_MARKET.minB-4&&b-depth/2<CITY_MARKET.maxB+4)continue;
    if(a+w/2>CITY_GARDEN.minA-4&&a-w/2<CITY_GARDEN.maxA+4&&b+depth/2>CITY_GARDEN.minB-4&&b-depth/2<CITY_GARDEN.maxB+4)continue;
    entries.push(freeze({id:`${d.id}-townhouse-${indexNow}`,a,b,w,d:depth,h:6.4+(indexNow%4)*1.2,layer:d.layer,kind:indexNow%3?'house':'row',door:'south'}));
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
