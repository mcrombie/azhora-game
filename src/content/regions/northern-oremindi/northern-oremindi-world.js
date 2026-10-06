/** The remaining Oremindi chain and its northern approaches. Atlas ownership,
 * climate and lakes are authoritative; relief is a continuous, shared surface.
 * No settlements, people or campaign triggers belong to this environment pass. */
import { REGION_CELLS, REGION_IDS, hexAt, hexCentre, TRANSFORM, SURVEY, landDistance, seamlessTerrainMix, relief } from '../../../world/terrain/region-world.js';
import { regionOutline, pointInPolygon } from '../../../world/terrain/region-layout.js';
import { createHexBoundaryDistance } from '../../../world/terrain/hex-boundary-distance.js';
import { NORTHERN_CLIMATE } from './northern-oremindi-climate.js';
const freeze=Object.freeze,clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const lerp=(a,b,t)=>a+(b-a)*t,key=c=>`${c.q},${c.r}`;
export const NORTHERN_NAMES=freeze(['East Oremindi Mountains','North Oreminidi Mountains','Lesser Oremindi Mountains','Cudon','Narcosh']);
export const NORTHERN_IDS=freeze(NORTHERN_NAMES.map(n=>REGION_IDS[n]));
export const NORTHERN_CELLS=freeze(NORTHERN_NAMES.flatMap(region=>REGION_CELLS[region].map(c=>freeze({...c,region,climate:NORTHERN_CLIMATE[key(c)]}))));
const cells=new Map(NORTHERN_CELLS.map(c=>[key(c),c]));
const outlines=regionOutline({origin:SURVEY.origin,regions:[{name:'range',cells:NORTHERN_CELLS}]},'range',TRANSFORM);
const bounds=points=>freeze({minX:Math.min(...points.map(p=>p.x)),maxX:Math.max(...points.map(p=>p.x)),minZ:Math.min(...points.map(p=>p.z)),maxZ:Math.max(...points.map(p=>p.z))});
export const NORTHERN_BOUNDS=bounds(outlines.flat());
export const northernCellAt=(x,z)=>x<NORTHERN_BOUNDS.minX||x>NORTHERN_BOUNDS.maxX||z<NORTHERN_BOUNDS.minZ||z>NORTHERN_BOUNDS.maxZ?null:cells.get(key(hexAt(x,z)))??null;
export const northernOwns=(x,z)=>!!northernCellAt(x,z);
export function segmentAt(x,z,a,b){const dx=b.x-a.x,dz=b.z-a.z,t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz));return {t,distance:Math.hypot(x-a.x-t*dx,z-a.z-t*dz)};}
const edges=outlines.flatMap(loop=>loop.map((p,i)=>[p,loop[(i+1)%loop.length]]));
export const northernInset=createHexBoundaryDistance({cells:NORTHERN_CELLS,edges,cellAt:northernCellAt,distanceToEdge:(x,z,[a,b])=>segmentAt(x,z,a,b).distance});
const at=(q,r,dx=0,dz=0)=>{const p=hexCentre(q,r);return {x:p.x+dx,z:p.z+dz};};
const peak=(id,name,q,r,height,along,across,angle)=>freeze({id,name,...at(q,r),height,along:along*1.18,across:across*1.2,angle});
export const NORTHERN_PEAKS=freeze([
  peak('east-oremindi-split-crown','The Split Crown',-11,94,540,170,110,.42),
  peak('east-oremindi-glass-shoulder','The Glass Shoulder',-9,91,610,145,100,-.35),
  peak('north-oremindi-white-anvil','The White Anvil',-7,87,745,150,125,.7),
  peak('north-oremindi-blue-horn','The Blue Horn',-5,85,610,120,85,-.45),
  peak('lesser-oremindi-folded-crags','The Folded Crags',-3,83,290,138,73,.8),
  peak('lesser-oremindi-west-tooth','The Western Tooth',-7,84,240,110,70,-.3),
  peak('cudon-gateway-shoulder','The Gateway Shoulder',-7,83,225,105,78,.3),
  peak('narcosh-black-ridge','The Black Ridge',-1,83,435,116,76,-.65),
  peak('narcosh-lake-crown','The Lake Crown',4,82,230,80,65,.6),
]);
const terrainLevel={plains:17,grassland:28,hills:65,highland:100,mountain:148,high_mountain:205,lake:60};
function rawRelief(x,z){
  const h=hexAt(x,z);let sum=0,total=0;
  for(let dq=-2;dq<=2;dq++)for(let dr=-2;dr<=2;dr++){
    const c=cells.get(`${h.q+dq},${h.r+dr}`);if(!c)continue;
    const w=Math.max(0,1-Math.hypot(x-c.x,z-c.z)/175)**3;if(!w)continue;
    sum+=(terrainLevel[c.terrain]??40)*w;total+=w;
  }
  let y=(total?sum/total:20)+5*Math.sin(x*.016+Math.sin(z*.009))*Math.cos(z*.011);
  for(const p of NORTHERN_PEAKS){
    const dx=x-p.x,dz=z-p.z,co=Math.cos(p.angle),si=Math.sin(p.angle),u=(dx*co+dz*si)/p.along,v=(-dx*si+dz*co)/p.across;
    const theta=Math.atan2(v,u),r=Math.hypot(u,v)/(1+.11*Math.cos(theta*3+p.angle)+.055*Math.sin(theta*5));
    // Unequal horns sit on long shoulders; no rings, clipped cones or flat caps.
    y=Math.max(y,p.height*Math.exp(-1.45*r**1.55));
  }
  const texture=(Math.sin(x*.041+Math.sin(z*.013))*Math.cos(z*.034)*4+Math.sin(x*.019-z*.024)*6)*smooth(90,280,y);
  // Match South Oremindi's vertical scale while retaining a high, steep spine.
  const raw=y+texture;return raw<=95?raw:95+(raw-95)*.6;
}
const baseAt=(x,z)=>{const t=seamlessTerrainMix(x,z);return t.base+relief(x,z,t.amp,t.wave);};
const lakeCells=NORTHERN_CELLS.filter(c=>c.terrain==='lake');
const lakeCentre={x:lakeCells.reduce((s,c)=>s+c.x,0)/lakeCells.length,z:lakeCells.reduce((s,c)=>s+c.z,0)/lakeCells.length};
const lakeShore=regionOutline({origin:SURVEY.origin,regions:[{name:'water',cells:lakeCells}]},'water',TRANSFORM,{soften:3})[0].map(p=>freeze({x:lerp(lakeCentre.x,p.x,.91),z:lerp(lakeCentre.z,p.z,.83)}));
const hot=at(2,82,5,18);
const springShore=Array.from({length:24},(_,i)=>{const a=i*Math.PI/12,r=1+.08*Math.sin(a*3);return freeze({x:hot.x+Math.cos(a)*8*r,z:hot.z+Math.sin(a)*5*r});});
export const NORTHERN_LAKES=freeze([
  freeze({id:'narcosh-long-basin',name:'The Long Basin',region:'Narcosh',centre:freeze(lakeCentre),shore:freeze(lakeShore),surface:62,depth:16}),
  freeze({id:'narcosh-warm-spring',name:'The Warm Hollow',region:'Narcosh',centre:freeze(hot),shore:freeze(springShore),surface:86,depth:2,thermal:true}),
]);
export function northernLakeDistance(l,x,z){let d=Infinity;for(let i=0;i<l.shore.length;i++)d=Math.min(d,segmentAt(x,z,l.shore[i],l.shore[(i+1)%l.shore.length]).distance);return pointInPolygon(l.shore,x,z)?-d:d;}
export function northernWaterAt(x,z){if(!northernOwns(x,z))return null;for(const l of NORTHERN_LAKES)if(pointInPolygon(l.shore,x,z))return l.surface;return null;}
function naturalGround(x,z,base=baseAt(x,z)){
  if(!northernOwns(x,z))return base;
  const inset=northernInset(x,z);let y=lerp(base,rawRelief(x,z),smooth(0,100,inset)*smooth(0,35,Math.max(0,landDistance(x,z))));
  for(const l of NORTHERN_LAKES){
    if(Math.abs(x-l.centre.x)>300||Math.abs(z-l.centre.z)>180)continue;
    const d=northernLakeDistance(l,x,z),reach=l.thermal?24:65;if(d>reach)continue;
    const basin=d<=0?l.surface-.35-l.depth*smooth(0,l.thermal?4:22,-d):lerp(l.surface-.35+d*.3,y,smooth(0,reach,d));
    y=lerp(y,basin,smooth(0,18,inset));
  }
  return y;
}
const path=(id,name,region,coords)=>{
  const points=coords.map(([q,r,dx=0,dz=0])=>{const p=at(q,r,dx,dz);return {...p,y:naturalGround(p.x,p.z)};});
  // Travel follows glacial shelves, with sensible walking grades between rests.
  for(let pass=0;pass<3;pass++)for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],step=Math.hypot(b.x-a.x,b.z-a.z)*.38;
    b.y=clamp(b.y,a.y-step,a.y+step);
  }
  return freeze({id,name,region,width:12,points:freeze(points.map(freeze))});
};
export const NORTHERN_PATHS=freeze([
  path('east-oremindi-lee-traverse','The Lee Traverse',NORTHERN_NAMES[0],[[-10,96],[-11,95],[-10,94],[-9,93],[-8,92],[-8,91,24,20],[-7,90],[-6,89]]),
  path('north-oremindi-ice-saddle','The Ice Saddle',NORTHERN_NAMES[1],[[-4,87],[-5,87,10,30],[-6,87,20,25],[-6,86],[-5,85,25,40],[-5,84]]),
  path('lesser-oremindi-birch-gully','The Birch Gully',NORTHERN_NAMES[2],[[0,84],[-1,84],[-2,84,15,20],[-3,84,20,35],[-3,83,25,40],[-3,82]]),
  path('cudon-cold-approach','The Cold Approach',NORTHERN_NAMES[3],[[-4,80],[-4,81],[-5,81,-20,20],[-6,82],[-7,82],[-8,83],[-9,84],[-9,85],[-10,86]]),
  path('narcosh-lake-ledges','The Lake Ledges',NORTHERN_NAMES[4],[[3,82],[2,82,20,0],[1,82],[0,82],[-1,81,28,20]]),
]);
export function northernPathSample(x,z){let best=null;const samples=[];
  for(const path of NORTHERN_PATHS)for(let i=1;i<path.points.length;i++){
    const a=path.points[i-1],b=path.points[i],s={...segmentAt(x,z,a,b),id:path.id};s.y=lerp(a.y,b.y,s.t);
    samples.push(s);if(!best||s.distance<best.distance)best=s;
  }
  // Blend the adjoining grades around bends instead of switching abruptly
  // between projections on two different legs of the same shelf.
  let y=0,total=0;for(const s of samples){if(s.id!==best.id)continue;const w=Math.max(0,1-(s.distance-best.distance)/2)**3;y+=s.y*w;total+=w;}
  return {...best,y:y/total};
}
export function northernGround(x,z,base=baseAt(x,z)){
  if(!northernOwns(x,z))return base;
  let y=naturalGround(x,z,base),p=northernPathSample(x,z);
  const wet=northernWaterAt(x,z);if(wet!==null)return y;
  if(p.distance<32){let shore=Infinity;for(const l of NORTHERN_LAKES)shore=Math.min(shore,northernLakeDistance(l,x,z));
    y=lerp(y,p.y,(1-smooth(6,32,p.distance))*smooth(0,18,northernInset(x,z))*smooth(2,14,shore));}
  return y;
}
export function northernFeatures(x,z,height){
  const c=northernCellAt(x,z);if(!c)return null;
  const h=height??northernGround(x,z),d=1,grade=Math.hypot(northernGround(x+d,z)-northernGround(x-d,z),northernGround(x,z+d)-northernGround(x,z-d))/(2*d);
  const cold=['EF','ET','Dwd'].includes(c.climate),treeline=cold?125:225;
  const snow=smooth(cold?161:251,cold?275:380,h)*(1-smooth(1.1,3,grade)*.78);
  let shore=Infinity;for(const l of NORTHERN_LAKES)shore=Math.min(shore,Math.abs(northernLakeDistance(l,x,z)));
  return {region:c.region,terrain:c.terrain,climate:c.climate,height:h,grade,snow,treeline,rock:smooth(.45,1.5,grade),pathDistance:northernPathSample(x,z).distance,shoreDistance:shore,water:northernWaterAt(x,z)};
}
export function northernTint(x,z){const f=northernFeatures(x,z);if(!f)return null;
  if(f.water!==null)return '#577c80';if(f.snow>.55)return '#dce6e4';
  if(f.shoreDistance<8)return '#b8b2a0';if(f.rock>.5)return f.region==='Narcosh'?'#68716f':'#858f91';
  return f.height>f.treeline?'#969f88':f.region==='Cudon'?'#809474':'#758969';
}
export const NORTHERN_LANDMARKS=freeze([
  ...NORTHERN_PEAKS.map(p=>freeze({...p,region:northernCellAt(p.x,p.z).region,description:'Wind-cut stone rises above glacial hollows and broken, naturally climbable shoulders.'})),
  ...NORTHERN_PATHS.map(p=>freeze({id:p.id,name:p.name,region:p.region,...p.points[0],description:'A natural route along sheltered shelves, with open rests between the steeper faces.'})),
  ...NORTHERN_LAKES.map(l=>freeze({id:l.id,name:l.name,region:l.region,...l.centre,description:l.thermal?'Warm water collects inside pale mineral rims.':'A long cold lake fills the mapped basin between dark ridges.'})),
]);
export const northernProfile=region=>({name:region,id:REGION_IDS[region],cells:NORTHERN_CELLS.filter(c=>c.region===region),bounds:bounds(regionOutline(SURVEY,region,TRANSFORM).flat()),owns:(x,z)=>northernCellAt(x,z)?.region===region,lakes:NORTHERN_LAKES.filter(l=>l.region===region)});
