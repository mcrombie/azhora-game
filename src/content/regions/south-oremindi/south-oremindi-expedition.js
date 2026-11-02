/** Physical glacial benches and shepherd/ranger trails. They exist independently
 * of chapter progress; battle rules never own the terrain beneath a traveler. */
const f=Object.freeze,clamp=v=>Math.max(0,Math.min(1,v)),smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
export const SOUTH_OREMINDI_EXPEDITION=f({
 refuge:f({x:-3508,z:-400,radius:14,reserve:17,blend:31,height:95,eastEdge:-3494}),
 rangers:f({x:-3350,z:-325,radius:12,reserve:14,blend:27,height:46.05}),
 ambush:f({x:-3625,z:-687,radius:30,reserve:33,blend:59,height:229}),
 highground:f({x:-3660,z:-588,radius:42,reserve:45,blend:73,height:211}),
});
const p=(x,z,y)=>f({x,z,y});
export const SOUTH_OREMINDI_EXPEDITION_PATHS=f([
 f({id:'oremindi-forest-connection',name:'The Birch Footpath',width:7,points:f([
  p(-3350,-325,46.05),p(-3380,-317,44),p(-3430,-317,42),p(-3500,-317,38),
 ])}),
 f({id:'oremindi-refuge-approach',name:'The Lakeside Climb',width:7,points:f([
  p(-3500,-317,38),p(-3530,-350,59),p(-3530,-390,84),p(-3508,-400,95),
 ])}),
 f({id:'oremindi-refuge-traverse',name:'The Cairn Traverse',width:8,points:f([
  p(-3508,-400,95),p(-3530,-390,84),p(-3570,-375,84),p(-3590,-357,80.35),
 ])}),
]);
function nearest(path,x,z){
 let result=null;
 for(let i=1;i<path.points.length;i++){
  const a=path.points[i-1],b=path.points[i],dx=b.x-a.x,dz=b.z-a.z,t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz));
  const d=Math.hypot(x-a.x-dx*t,z-a.z-dz*t);
  if(!result||d<result.distance)result={distance:d,y:a.y+(b.y-a.y)*t};
 }return result;
}
const benchHeight=(id,p,x,z)=>p.height+(id==='highground'?-(z-p.z)*.07+(x-p.x)*.012:id==='ambush'?(x-p.x)*.025:0);
/** Grade the existing route into its wider benches, keeping fixed resting
 * surfaces and original endpoints. The mountain beyond the tread is unchanged. */
export function createSouthOremindiTraverse(path){
 const points=[];
 for(let i=1;i<path.points.length;i++){
  const a=path.points[i-1],b=path.points[i],n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/3);
  for(let j=i===1?0:1;j<=n;j++){
   const t=j/n,point={x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,y:a.y+(b.y-a.y)*t,fixed:false};
   for(const [id,p]of Object.entries(SOUTH_OREMINDI_EXPEDITION))if(Math.hypot(point.x-p.x,point.z-p.z)<=p.radius){point.y=benchHeight(id,p,point.x,point.z);point.fixed=true;}
   points.push(point);
  }
 }
 points[0].fixed=points.at(-1).fixed=true;
 for(let pass=0;pass<points.length;pass++){
  for(let i=1;i<points.length;i++){
   const a=points[i-1],b=points[i],step=Math.hypot(b.x-a.x,b.z-a.z)*.60;
   if(!b.fixed)b.y=Math.max(a.y-step,Math.min(a.y+step,b.y));
  }
  for(let i=points.length-2;i>=0;i--){
   const a=points[i],b=points[i+1],step=Math.hypot(b.x-a.x,b.z-a.z)*.60;
   if(!a.fixed)a.y=Math.max(b.y-step,Math.min(b.y+step,a.y));
  }
 }
 return f({...path,points:f(points.map(({fixed,...p})=>f(p)))});
}
const indices=new WeakMap();
function traverseSample(path,x,z){
 if(!indices.has(path)){
  const cells=new Map(),parts=path.points.slice(1).map((p,i)=>({points:[path.points[i],p]}));
  for(const part of parts){const [a,b]=part.points;
   for(let X=Math.floor((Math.min(a.x,b.x)-18)/32);X<=Math.floor((Math.max(a.x,b.x)+18)/32);X++)for(let Z=Math.floor((Math.min(a.z,b.z)-18)/32);Z<=Math.floor((Math.max(a.z,b.z)+18)/32);Z++){
    const k=X+','+Z;if(!cells.has(k))cells.set(k,[]);cells.get(k).push(part);
   }
  }indices.set(path,cells);
 }
 let chosen=null;
 for(const part of indices.get(path).get(Math.floor(x/32)+','+Math.floor(z/32))??[]){const s=nearest(part,x,z);if(!chosen||s.distance<chosen.distance)chosen=s;}
 return chosen;
}
export function southOremindiExpeditionPathDistance(x,z){let d=Infinity;for(const path of SOUTH_OREMINDI_EXPEDITION_PATHS)d=Math.min(d,nearest(path,x,z).distance);return d;}
export function southOremindiExpeditionReserved(x,z,radius=0){
 if(Object.values(SOUTH_OREMINDI_EXPEDITION).some(p=>Math.hypot(x-p.x,z-p.z)<p.reserve+radius))return true;
 return SOUTH_OREMINDI_EXPEDITION_PATHS.some(path=>nearest(path,x,z).distance<path.width/2+radius);
}
export function southOremindiExpeditionGround(x,z,original,{inset=100,shore=100,traverse=null,peaks=[]}={}){
 if(inset<=0||shore<=.5)return original;
 let ground=original,trailWeight=0,trailHeight=0;
 for(const path of SOUTH_OREMINDI_EXPEDITION_PATHS){const s=nearest(path,x,z),w=1-smooth((s.distance-path.width/2)/12);
  if(w>0){trailWeight+=w*w;trailHeight+=s.y*w*w;}}
 if(trailWeight)ground+=(trailHeight/trailWeight-ground)*Math.min(1,trailWeight);
 let sum=0,height=0,remaining=1,coreHeight=null;
 for(const [id,p]of Object.entries(SOUTH_OREMINDI_EXPEDITION)){
  const d=Math.hypot(x-p.x,z-p.z);if(d>=p.blend)continue;
  let w=1-smooth((d-p.radius)/(p.blend-p.radius));
  if(p.eastEdge)w*=smooth((p.eastEdge-x)/3);
  // Negative Z is the defenders' upper shelf. A gentle continuous ramp joins
  // the 2.8 m difference between archers at -12 and the chief's approach at +28.
  const y=benchHeight(id,p,x,z);
  if(w>=.999999)coreHeight=y;
  sum+=w;height+=y*w;remaining*=1-w;
 }
 if(coreHeight!==null)ground=coreHeight;
 else if(sum)ground+=(height/sum-ground)*(1-remaining);
 if(traverse){const s=traverseSample(traverse,x,z);if(s){const w=1-smooth((s.distance-traverse.width/2)/10);ground+=(s.y-ground)*w;}}
 for(const peak of peaks)ground=original+(ground-original)*smooth((Math.hypot(x-peak.x,z-peak.z)-8)/8);
 return original+(ground-original)*smooth(inset/16)*smooth((shore-.5)/2);
}
