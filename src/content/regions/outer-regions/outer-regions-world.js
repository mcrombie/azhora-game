/** Continuous northern relief and island habitats, bounded by the authored atlas.
 * Region names never act as cliff edges. Ordinary passes and mountain faces share
 * the same heightfield, so walking, climbing and falling see the drawn landscape. */
import { OUTER_PROFILES, OUTER_NAMES } from './outer-regions-data.js';
import { OUTER_CLIMATE, OUTER_RIVER_EDGES } from './outer-regions-atlas.js';
import { REGION_CELLS, REGION_IDS, hexAt, SURVEY, TRANSFORM, landDistance, seamlessTerrainMix, relief } from '../../../world/terrain/region-world.js';
import { regionOutline, riverCourses, pointInPolygon } from '../../../world/terrain/region-layout.js';
import { eshtorLandform } from '../eshtor/eshtor-landform.js';
import { createHexBoundaryDistance } from '../../../world/terrain/hex-boundary-distance.js';
export { OUTER_NAMES };
const F=Object.freeze, key=c=>`${c.q},${c.r}`, clamp=v=>Math.max(0,Math.min(1,v));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);}, mix=(a,b,t)=>a+(b-a)*t;
export const OUTER_IDS=F(OUTER_PROFILES.map(p=>p.id));
export const OUTER_CELLS=F(OUTER_PROFILES.flatMap(p=>REGION_CELLS[p.name].map(c=>F({...c,region:p.name,profile:p,climate:OUTER_CLIMATE[key(c)]}))));
const cells=new Map(OUTER_CELLS.map(c=>[key(c),c]));
const bounds=ps=>F({minX:Math.min(...ps.map(p=>p.x)),maxX:Math.max(...ps.map(p=>p.x)),minZ:Math.min(...ps.map(p=>p.z)),maxZ:Math.max(...ps.map(p=>p.z))});
export const OUTER_BOUNDS=bounds(OUTER_CELLS);
export function outerCellAt(x,z){const b=OUTER_BOUNDS;return x<b.minX-60||x>b.maxX+60||z<b.minZ-60||z>b.maxZ+60?null:cells.get(key(hexAt(x,z)))??null;}
export const outerOwns=(x,z)=>{const c=outerCellAt(x,z);return !!c&&c.terrain!=='ocean';};
export function outerSegment(x,z,a,b){const dx=b.x-a.x,dz=b.z-a.z,t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1));return {t,distance:Math.hypot(x-a.x-dx*t,z-a.z-dz*t)};}
const loops=regionOutline({origin:SURVEY.origin,regions:[{name:'outer',cells:OUTER_CELLS.filter(c=>c.terrain!=='ocean')}]},'outer',TRANSFORM);
export const outerInset=createHexBoundaryDistance({cells:OUTER_CELLS.filter(c=>c.terrain!=='ocean'),edges:loops.flatMap(l=>l.map((p,i)=>[p,l[(i+1)%l.length]])),cellAt:(x,z)=>outerOwns(x,z)?outerCellAt(x,z):null,distanceToEdge:(x,z,[a,b])=>outerSegment(x,z,a,b).distance});
const profiles=new Map(OUTER_PROFILES.map(p=>{
  const land=OUTER_CELLS.filter(c=>c.region===p.name&&!['ocean','lake'].includes(c.terrain));
  const b=bounds(regionOutline(SURVEY,p.name,TRANSFORM).flat()),cx=(b.minX+b.maxX)/2,cz=(b.minZ+b.maxZ)/2;
  const sorted=[...land].sort((a,b)=>Math.hypot(a.x-cx,a.z-cz)-Math.hypot(b.x-cx,b.z-cz));
  const anchor=sorted.find(c=>!['mountain','ice'].includes(c.terrain))??sorted[0];
  const angle=(p.id*.71)%Math.PI,co=Math.cos(angle),si=Math.sin(angle);
  const local=(u,v)=>F({x:anchor.x+u*co-v*si,z:anchor.z+u*si+v*co});
  const points=[local(-34,0),local(-12,6),local(13,-5),local(34,0)];
  return [p.name,F({...p,bounds:b,cells:land,anchor,angle,points,owns:(x,z)=>outerOwns(x,z)&&outerCellAt(x,z).region===p.name})];
}));
export const outerProfile=name=>profiles.get(name);
export const OUTER_PATHS=F([...profiles.values()].map(p=>F({id:`outer-${p.id}-0`,name:p.features[0],region:p.name,points:p.points})));
export function outerPathDistance(x,z){const p=profiles.get(outerCellAt(x,z)?.region);if(!p)return Infinity;let d=Infinity;for(let i=1;i<p.points.length;i++)d=Math.min(d,outerSegment(x,z,p.points[i-1],p.points[i]).distance);return d;}
const terrainWeight=t=>t==='mountain'||t==='ice'?1:t==='hills'?.58:t==='deep_forest'?.32:.18;
function naturalAt(x,z,base){
  const c=outerCellAt(x,z);if(!c||c.terrain==='ocean')return base??11;
  if(base===undefined){const t=seamlessTerrainMix(x,z);base=t.base+relief(x,z,t.amp,t.wave);}
  let sum=0,total=0;
  for(let dq=-2;dq<=2;dq++)for(let dr=-2;dr<=2;dr++){
    const n=cells.get(`${c.q+dq},${c.r+dr}`);if(!n||n.terrain==='ocean')continue;
    const w=Math.max(0,1-Math.hypot(x-n.x,z-n.z)/185)**3;if(!w)continue;
    const p=profiles.get(n.region),u=(x-p.anchor.x)*Math.cos(p.angle)+(z-p.anchor.z)*Math.sin(p.angle),v=-(x-p.anchor.x)*Math.sin(p.angle)+(z-p.anchor.z)*Math.cos(p.angle);
    // Long folded ridges, secondary shoulders and sheltered bowls. The ridge
    // line meanders independently of hex centers; there are no per-hex cones.
    const bend=v-38*Math.sin(u*.006+p.id),ridge=Math.exp(-((bend/(p.kind==='alpine'?58:95))**2));
    const crest=.60+.24*Math.sin(u*.012)+.16*Math.cos(u*.025+1);
    const rolling=6+5*Math.sin(x*.009+Math.sin(z*.006))*Math.cos(z*.011);
    const broad=p.height*(.13+.77*terrainWeight(n.terrain))*(.3+.7*ridge)*crest;
    let h=13+rolling+broad;
    if(p.kind==='alpine'){const gully=Math.exp(-((Math.sin(u*.016+.4)/.24)**2));h-=p.height*.08*gully*(1-ridge);}
    if(p.kind==='dark')h-=8*Math.exp(-(((bend+48)/22)**2));
    if(p.kind==='karst')h+=12*Math.max(0,Math.sin(u*.024)*Math.cos(v*.018))**2;
    if(p.kind==='ice')h+=12*ridge;
    if(p.kind==='plateau')h=eshtorLandform(x,z,p.anchor).height;
    sum+=h*w;total+=w;
  }
  let raw=sum/(total||1);
  const path=outerPathDistance(x,z),p=profiles.get(c.region);
  // A broad natural saddle around each review arrival, never an invisible wall.
  const arrivalHeight=p.kind==='plateau'?142+1.6*Math.sin((x-p.anchor.x)*.018):22+1.6*Math.sin((x-p.anchor.x)*.018);
  raw=mix(raw,arrivalHeight,1-smooth(7,55,path));
  return mix(base,raw,smooth(0,65,outerInset(x,z))*smooth(0,34,Math.max(0,landDistance(x,z))));
}
function plateauPoolSite(p){
  let best=null;
  for(const c of p.cells)for(const dx of [-22,0,22])for(const dz of [-22,0,22]){
    const x=c.x+dx,z=c.z+dz;if(outerPathDistance(x,z)<70)continue;
    const rim=Array.from({length:12},(_,j)=>({x:x+Math.cos(j*Math.PI/6)*32,z:z+Math.sin(j*Math.PI/6)*32}));
    if(!rim.every(q=>p.owns(q.x,q.z)))continue;
    const hs=rim.map(q=>naturalAt(q.x,q.z)),lo=Math.min(...hs),hi=Math.max(...hs);
    const score=hi-lo;if(!best||score<best.score)best={...c,x,z,poolSurface:lo-.8,score};
  }
  return best??p.cells[0];
}
const makePool=(c,i)=>{
  const surface=c.poolSurface??Math.max(2,naturalAt(c.x,c.z)-2),radius=c.terrain==='lake'?49:14;
  const shore=Array.from({length:32},(_,j)=>{const a=j*Math.PI/16,r=radius*(1+.075*Math.sin(a*3+i));return F({x:c.x+Math.cos(a)*r,z:c.z+Math.sin(a)*r*.8});});
  return F({id:`outer-pool-${c.q}-${c.r}`,name:profiles.get(c.region).features[2]+' water',region:c.region,centre:F({x:c.x,z:c.z}),surface,depth:3.4,shore:F(shore),bounds:bounds(shore)});
};
export const OUTER_LAKES=F([...OUTER_CELLS.filter(c=>c.terrain==='lake'),...[...profiles.values()].filter(p=>['dark','boreal','tundra','highland','jungle','plateau'].includes(p.kind)).map(p=>p.kind==='plateau'?plateauPoolSite(p):p.cells.find(c=>Math.hypot(c.x-p.anchor.x,c.z-p.anchor.z)>105&&landDistance(c.x,c.z)>60)).filter(Boolean)].map(makePool));
const rawCourses=riverCourses(SURVEY,OUTER_RIVER_EDGES,TRANSFORM,{soften:2});
export const OUTER_RIVERS=F(rawCourses.map((c,i)=>F({id:'outer-river-'+i,name:'Northern watercourse',width:c.size==='large'?13:c.size==='medium'?8:4,points:F(c.points.map(p=>F({...p,y:Math.max(.5,naturalAt(p.x,p.z)-3)})))})));
const waterBuckets=new Map(),bucket=(x,z)=>`${Math.floor(x/80)},${Math.floor(z/80)}`;
function index(item,b,pad){for(let x=Math.floor((b.minX-pad)/80);x<=Math.floor((b.maxX+pad)/80);x++)for(let z=Math.floor((b.minZ-pad)/80);z<=Math.floor((b.maxZ+pad)/80);z++){const k=`${x},${z}`;if(!waterBuckets.has(k))waterBuckets.set(k,[]);waterBuckets.get(k).push(item);}}
for(const l of OUTER_LAKES)index({lake:l},l.bounds,28);
for(const r of OUTER_RIVERS)for(let i=1;i<r.points.length;i++)index({river:r,a:r.points[i-1],b:r.points[i]},bounds([r.points[i-1],r.points[i]]),r.width+28);
export function outerWaterSample(x,z){
  if(!outerOwns(x,z))return null;let best=null;
  for(const item of waterBuckets.get(bucket(x,z))??[]){let distance,surface;
    if(item.lake){const l=item.lake;distance=Infinity;for(let i=0;i<l.shore.length;i++)distance=Math.min(distance,outerSegment(x,z,l.shore[i],l.shore[(i+1)%l.shore.length]).distance);if(pointInPolygon(l.shore,x,z))distance=-distance;surface=l.surface;}
    else {const hit=outerSegment(x,z,item.a,item.b);distance=hit.distance-item.river.width;surface=mix(item.a.y,item.b.y,hit.t);}
    if(!best||distance<best.distance)best={distance,surface,...item};
  }
  return best;
}
export const outerWaterAt=(x,z)=>{const s=outerWaterSample(x,z);return s&&s.distance<0?s.surface:null;};
export function outerGround(x,z,base){
  if(!outerOwns(x,z))return base;
  let h=naturalAt(x,z,base);const w=outerWaterSample(x,z);
  if(w&&w.distance<26){const bed=w.surface-(w.lake?3.4:1.8),bank=mix(bed,h,smooth(4,26,w.distance));h=Math.min(h,bank);}
  return h;
}
export function outerFeatures(x,z){
  const c=outerCellAt(x,z);if(!c||c.terrain==='ocean')return null;
  const height=outerGround(x,z);
  const dx=((outerGround(x+1,z)??height)-(outerGround(x-1,z)??height))/2,dz=((outerGround(x,z+1)??height)-(outerGround(x,z-1)??height))/2;
  const p=c.profile,water=outerWaterSample(x,z),forest=['forest','deep_forest','deep_jungle','jungle'].includes(c.terrain)||['dark','boreal','jungle','warm-forest'].includes(p.kind);
  const plateau=p.kind==='plateau'?eshtorLandform(x,z,profiles.get(c.region).anchor):null;
  return {shelter:plateau?.shelter??0,rib:plateau?.rib??0,region:c.region,profile:p,terrain:c.terrain,climate:c.climate,height,grade:Math.hypot(dx,dz),forest,deep:p.kind==='dark'||c.terrain==='deep_forest'||c.terrain==='deep_jungle',wet:c.terrain==='wetland',water:outerWaterAt(x,z),shoreDistance:water?Math.abs(water.distance):Infinity,seaDistance:landDistance(x,z),pathDistance:outerPathDistance(x,z),snow:plateau?plateau.snow:p.kind==='ice'?smooth(35,105,height):p.kind==='alpine'?smooth(115,175,height):0,treeline:plateau?170:p.kind==='ice'?0:p.kind==='alpine'?110:300,rock:clamp(Math.hypot(dx,dz)*1.5)};
}
export function outerTint(x,z){const c=outerCellAt(x,z);if(!c||c.terrain==='ocean')return null;const h=naturalAt(x,z),p=c.profile;if(p.kind==='plateau'){const f=eshtorLandform(x,z,profiles.get(c.region).anchor);return f.snow>.50?'#d6ddd6':f.rib>.35?p.stone:f.shelter>.5?'#74856a':p.ground;}if(p.kind==='ice'&&h>58||p.kind==='alpine'&&h>148)return '#d4dbd3';const w=outerWaterSample(x,z);if(w&&w.distance<4)return '#7c8980';return Math.sin(x*.027+Math.sin(z*.013))*Math.cos(z*.019)>.45?p.stone:p.ground;}
export const OUTER_LANDMARKS=F([...profiles.values()].flatMap(p=>{
  const used=new Set();
  return p.features.map((name,i)=>{
    const preferred=i===0?p.anchor:p.cells[Math.floor(p.cells.length*(i===1?.25:.75))];
    const c=used.has(key(preferred))?p.cells.find(c=>!used.has(key(c))):preferred;used.add(key(c));
    return F({id:`outer-${p.id}-${i}`,name,region:p.name,x:c.x,z:c.z,description:name+' lies in '+p.name+', amid the surrounding wilderness.'});
  });
}));
