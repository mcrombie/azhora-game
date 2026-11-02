/** The Endevor's authored atlas edges, projected through the ordinary map transform.
 * Water height follows distance upstream, so all five branches meet without steps. */
import {SURVEY,TRANSFORM,SEA_LEVEL} from '../../../world/terrain/region-world.js';
import {riverCourses} from '../../../world/terrain/region-layout.js';
const edges=[
  [15,71,15,72],[15,72,16,71],[14,72,15,71],[14,71,14,72],[13,72,14,71],
  [12,72,13,71],[13,71,13,72],[12,71,12,72],[11,72,12,71],[11,68,12,68],
  [11,69,12,68],[11,69,12,69],[11,70,12,69],[11,70,12,70],[11,71,12,70],
  [11,71,12,71],[11,73,11,74],[11,73,12,73],[11,73,12,72],[11,72,12,72],
  [15,72,16,72],[15,73,16,72],[16,71,16,72],[16,71,17,71],[17,70,17,71],[17,71,18,70],
].map(([q,r,s,t])=>({a:[q,r],b:[s,t],size:'small'}));
const courses=riverCourses(SURVEY,edges,TRANSFORM),key=p=>`${p.x.toFixed(2)},${p.z.toFixed(2)}`;
export const ENDEVOR_MOUTH=Object.freeze(courses.flatMap(c=>[c.points[0],c.points.at(-1)]).sort((a,b)=>a.z-b.z)[0]);
const distances=new Map([[key(ENDEVOR_MOUTH),0]]);
for(const c of courses)c.length=c.points.slice(1).reduce((s,p,i)=>s+Math.hypot(p.x-c.points[i].x,p.z-c.points[i].z),0);
for(let pass=0;pass<courses.length;pass++)for(const c of courses){
  const a=key(c.points[0]),b=key(c.points.at(-1)),da=distances.get(a)??Infinity,db=distances.get(b)??Infinity;
  distances.set(a,Math.min(da,db+c.length));distances.set(b,Math.min(db,da+c.length));
}
export const ENDEVOR_RIVERS=Object.freeze(courses.map((c,i)=>{
  if(distances.get(key(c.points[0]))>distances.get(key(c.points.at(-1))))c.points.reverse();
  let d=distances.get(key(c.points[0]));
  const points=c.points.map((p,j)=>{if(j)d+=Math.hypot(p.x-c.points[j-1].x,p.z-c.points[j-1].z);return Object.freeze({...p,surface:SEA_LEVEL+d*.014,halfWidth:6+6*Math.exp(-d/120),upstream:d});});
  if(d-c.length<.01)points.unshift(Object.freeze({...ENDEVOR_MOUTH,z:ENDEVOR_MOUTH.z-45,surface:SEA_LEVEL,halfWidth:15,upstream:0}));
  return Object.freeze({id:`endevor-river-${i}`,points:Object.freeze(points)});
}));
const grid=new Map(),clamp=v=>Math.max(0,Math.min(1,v));
export const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
for(const c of ENDEVOR_RIVERS)for(let i=1;i<c.points.length;i++){
  const a=c.points[i-1],b=c.points[i],segment={a,b};
  for(let x=Math.floor((Math.min(a.x,b.x)-45)/64);x<=Math.floor((Math.max(a.x,b.x)+45)/64);x++)for(let z=Math.floor((Math.min(a.z,b.z)-45)/64);z<=Math.floor((Math.max(a.z,b.z)+45)/64);z++){
    const k=`${x},${z}`;if(!grid.has(k))grid.set(k,[]);grid.get(k).push(segment);
  }
}
export function endevorRiverSample(x,z){
  if(x< -2200||x> -1350||z< -3380||z> -2700)return null;
  let best=null;
  for(const {a,b} of grid.get(`${Math.floor(x/64)},${Math.floor(z/64)}`)??[]){
    const dx=b.x-a.x,dz=b.z-a.z,t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1));
    const distance=Math.hypot(x-a.x-t*dx,z-a.z-t*dz),halfWidth=a.halfWidth+(b.halfWidth-a.halfWidth)*t;
    if(!best||distance-halfWidth<best.distance)best={distance:distance-halfWidth,surface:a.surface+(b.surface-a.surface)*t,halfWidth};
  }
  return best;
}
export const endevorWaterAt=(x,z)=>{const s=endevorRiverSample(x,z);return s&&s.distance<=0?s.surface:null;};
export function endevorChannelGround(x,z,base){
  const s=endevorRiverSample(x,z);if(!s||s.distance>22)return base;
  const floor=s.surface-1.9+1.8*smooth(-s.halfWidth,0,s.distance);
  return Math.min(base,floor+(base-floor)*smooth(0,22,s.distance));
}
