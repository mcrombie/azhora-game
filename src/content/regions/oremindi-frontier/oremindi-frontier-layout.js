import {REGION_IDS} from '../../../world/terrain/region-world.js';

const freeze=Object.freeze,clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const site=(id,name,region,x,z,y,rx,rz,kind,accent)=>freeze({id,name,region,x,z,y,rx,rz,kind,accent,regionId:REGION_IDS[region],radius:Math.max(rx,rz)+20});
export const OREMINDI_HOLDS=freeze([
 site('oremindi-west-hold','Broken Horn Hold','West Oremindi Mountains',-3560,-1375,135,40,35,'orc','#9c5942'),
 site('oremindi-east-hold','Ashen Stair Hold','East Oremindi Mountains',-2990,-1175,140,40,35,'orc','#678a88'),
 site('oremindi-north-hold','White Anvil Hold','North Oreminidi Mountains',-3150,-1720,180,43,37,'orc','#b1a278'),
 site('oremindi-south-hold','Red Tarn Hold','South Oremindi Mountains',-3515,-475,140,40,36,'orc','#8f617d'),
]);
export const KUDAN_TOWN=site('kudan-town','Kudan Town','Cudon',-3430,-1775,25,35,39,'human','#64869c');
export const OREMINDI_REFUGE=site('oremindi-last-refuge','The Last Refuge','South Oremindi Mountains',-3250,-355,20,15,12,'refuge','#657fa0');
export const OREMINDI_RUINS=freeze([
 site('oremindi-west-ruins','Ruined Western Village','West Oremindi Mountains',-3600,-1315,130,18,15,'ruin'),
 site('oremindi-east-ruins','Burned Stair Village','East Oremindi Mountains',-3088,-1138,185,20,16,'ruin'),
 site('oremindi-north-ruins','The Broken King’s Road','North Oreminidi Mountains',-3200,-1632,195,20,16,'ruin'),
 site('oremindi-south-ruins','Ruined Tarn Village','South Oremindi Mountains',-3500,-540,178,18,15,'ruin'),
]);
export const FRONTIER_SITES=freeze([...OREMINDI_HOLDS,KUDAN_TOWN,OREMINDI_REFUGE,...OREMINDI_RUINS]);
const route=(id,region,coords,width=9)=>freeze({id,region,width,points:freeze(coords.map(([x,z,y])=>freeze({x,z,y})))});
export const FRONTIER_ROUTES=freeze([
 route('west-hold-lower-loop','West Oremindi Mountains',[[-3550,-1443,60],[-3535,-1420,63],[-3490,-1385,100],[-3560,-1375,135],[-3620,-1380,114]]),
 route('west-ruin-shelf','West Oremindi Mountains',[[-3560,-1375,135],[-3585,-1352,143],[-3600,-1315,130]],7),
 route('west-upper-lookout','West Oremindi Mountains',[[-3550,-913,224],[-3510,-960,250],[-3495,-1030,270]],7),
 route('east-hold-loop','East Oremindi Mountains',[[-2950,-1097,103],[-2980,-1120,118],[-3000,-1145,132],[-2990,-1175,140]]),
 route('east-ruined-high-road','East Oremindi Mountains',[[-2990,-1175,140],[-3050,-1180,160],[-3088,-1138,185],[-3105,-1190,201]],8),
 route('north-hold-approach','North Oreminidi Mountains',[[-3000,-1703,165],[-3055,-1748,175],[-3105,-1775,170],[-3150,-1755,180],[-3150,-1720,180]]),
 route('north-hanging-valley','North Oreminidi Mountains',[[-3150,-1720,180],[-3210,-1650,190],[-3200,-1632,195],[-3190,-1580,205],[-3130,-1545,235],[-3050,-1530,251]],10),
 route('south-hold-loop','South Oremindi Mountains',[[-3500,-317,38],[-3520,-360,65],[-3540,-410,100],[-3515,-475,140],[-3500,-540,178],[-3460,-560,195]]),
 route('kudan-coast-road','Cudon',[[-3350,-1790,73],[-3360,-1830,58],[-3390,-1845,54],[-3435,-1825,39],[-3450,-1800,25],[-3430,-1775,25],[-3430,-1740,25],[-3400,-1703,42]],8),
]);
export const KUDAN_FIELDS=freeze([
 {id:'kudan-west-fields',x:-3420,z:-1855,y:28,w:27,d:30},
 {id:'kudan-east-fields',x:-3380,z:-1720,y:50,w:24,d:25},
 {id:'kudan-north-fields',x:-3380,z:-1898,y:52,w:28,d:28},
].map(f=>freeze({...f,region:'Cudon'})));

function segment(x,z,a,b){const dx=b.x-a.x,dz=b.z-a.z,t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1));return {distance:Math.hypot(x-a.x-dx*t,z-a.z-dz*t),y:a.y+(b.y-a.y)*t};}
const ROUTE_SEGMENTS=FRONTIER_ROUTES.flatMap(r=>r.points.slice(1).map((b,i)=>({a:r.points[i],b,region:r.region,width:r.width})));
export function frontierRouteSample(x,z,region){
 let best=null;const near=[];
 for(const s of ROUTE_SEGMENTS){if(region&&s.region!==region)continue;
  if(x<Math.min(s.a.x,s.b.x)-55||x>Math.max(s.a.x,s.b.x)+55||z<Math.min(s.a.z,s.b.z)-55||z>Math.max(s.a.z,s.b.z)+55)continue;
  const p={...segment(x,z,s.a,s.b),width:s.width};near.push(p);if(!best||p.distance<best.distance)best=p;
 }
 if(!best)return null;
 let sum=0,weight=0;for(const p of near){const w=Math.max(0,1-(p.distance-best.distance)/2)**3;sum+=w*p.y;weight+=w;}
 return {...best,y:sum/weight};
}
/** Broader glacial benches around inhabited shoulders. Peaks, lake beds and
 * region boundaries remain owned by the existing regional terrain functions. */
export function frontierRelief(x,z,original,region,inset=100){
 let y=original;
 for(const s of FRONTIER_SITES){if(s.region!==region)continue;
  const u=x-s.x,v=z-s.z,r=Math.hypot(u/s.rx,v/s.rz);if(r>1.8)continue;
  const level=s.y+.018*u+.012*v;
  y+=(level-y)*(1-smooth(.85,1.8,r))*smooth(0,18,inset);
 }
 for(const f of KUDAN_FIELDS){if(region!==f.region)continue;
  const u=x-f.x,v=z-f.z,r=Math.max(Math.abs(u)/(f.w/2),Math.abs(v)/(f.d/2));if(r>1.8)continue;
  y+=(f.y+.045*u+.025*v-y)*(1-smooth(1,1.8,r))*smooth(0,18,inset);
 }
 const p=frontierRouteSample(x,z,region);
 if(p&&p.distance<50)y+=(p.y-y)*(1-smooth(p.width/2,50,p.distance))*smooth(0,18,inset);
 for(const s of FRONTIER_SITES){if(s.region!==region||Math.abs(x-s.x)>60||Math.abs(z-s.z)>60)continue;
  for(const h of frontierBuildings(s)){
   const d=Math.max(Math.abs(x-h.x)-h.w/2,Math.abs(z-h.z)-h.d/2);if(d>4)continue;
   const q=frontierRouteSample(h.x,h.z,region),base=s.y+.018*(h.x-s.x)+.012*(h.z-s.z);
   const level=q?base+(q.y-base)*(1-smooth(q.width/2,50,q.distance)):base;
   const clear=p?smooth(p.width/2+.5,p.width/2+2,p.distance):1;
   y+=(level-y)*(1-smooth(.6,4,d))*clear*smooth(0,18,inset);
  }
 }
 return y;
}
export function frontierReserved(x,z,r=0){
 for(const s of FRONTIER_SITES)if(Math.hypot((x-s.x)/(s.rx+r),(z-s.z)/(s.rz+r))<1.12)return true;
 for(const f of KUDAN_FIELDS)if(Math.abs(x-f.x)<f.w/2+r+3&&Math.abs(z-f.z)<f.d/2+r+3)return true;
 const p=frontierRouteSample(x,z);return !!p&&p.distance<p.width/2+r+1;
}
export function frontierBuildings(s){
 if(BUILDINGS.has(s.id))return BUILDINGS.get(s.id);
 if(s.kind==='ruin')return [[-10,-4,7,5],[3,-6,9,7],[0,7,6,5]].map(([u,v,w,d],i)=>({id:s.id+'-'+i,x:s.x+u,z:s.z+v,w,d,h:2.2,kind:'ruin',variant:i}));
 if(s.kind==='refuge')return [[-8,-3,4,5],[6,-3,5,5],[2,6,4,4]].map(([u,v,w,d],i)=>({id:s.id+'-'+i,x:s.x+u,z:s.z+v,w,d,h:2.5,kind:'tent',variant:i}));
 const orc=s.kind==='orc';
 const rows=orc?[
  [-17,-15,8,7,4],[17,-17,7,7,4.6],[-22,0,7,6,3.6],[23,0,8,7,4],[-19,16,7,6,3.8],[20,17,7,6,3.7],
  [0,-20,13,10,7,'hall'],[-6,19,6,5,3.4],[7,20,6,5,3.6],[-9,0,6,5,3.6,'smith'],[11,0,5,5,3.2,'store'],
 ]:[[-21,-19,7,7,5],[-10,-22,8,7,5.7],[5,-20,9,8,5],[20,-16,7,7,5.5],[-22,-5,8,7,5.5],[19,-2,8,7,5],
  [-21,10,7,7,5],[20,11,7,6,4.8],[-22,23,8,7,4.8],[20,24,8,7,5],[-6,26,8,8,4.8],[6,26,8,7,5.3],
  [-12,-6,9,9,9,'hall'],[-13,13,6,6,4,'smith'],[11,12,6,6,4,'store']];
 const result=rows.map(([u,v,w,d,h,kind='house'],i)=>({id:s.id+'-'+i,x:s.x+u,z:s.z+v,w,d,h,kind,variant:i})).filter(h=>{
  const p=frontierRouteSample(h.x,h.z,s.region);
  return !p||p.distance>p.width/2+Math.hypot(h.w,h.d)/2+1;
 });
 if(!result.some(h=>h.kind==='hall')&&result.length){result[0]={...result[0],kind:'hall',h:7.5};}
 BUILDINGS.set(s.id,result);return result;
}
const BUILDINGS=new Map();
export const FRONTIER_LANDMARKS=freeze(FRONTIER_SITES.map(s=>freeze({...s,
 description:s.kind==='orc'?'An independent orc chieftain’s settlement on the conquered mountain surface.':s.kind==='ruin'?'A destroyed human mountain community; only broken masonry and burned timbers remain.':s.kind==='refuge'?'A small refuge of the nearly destroyed Oremindi Kingdom.':'Kudan’s main coastal settlement, independent and fearful of Thalmagar.'})));
