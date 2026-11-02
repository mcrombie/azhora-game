import {canStand,canSwim,waterAt} from '../../gameplay/movement/locomotion.js';
import {columnTransitAllowed} from './war-column-access.js';
import {LIZEEM_BRIDGES,lizeemBridgeEnd} from '../../content/regions/minora-frontier/lizeem-crossings.js';
import {LIZEEM_COLUMN_ASSEMBLY as ASSEMBLY,LIZEEM_ISA_WAY as ISA_WAY,LIZEEM_WESTERN_WAY as WESTERN_WAY,LIZEEM_EASTERN_WAY as EASTERN_WAY} from '../../content/scenarios/lizeem-column-corridors.js';
export const COLUMN_WADING_DEPTH=.9;

// Regional assembly points, not atlas centroids (several centroids lie in water).
// The farming world supplies its own town landmarks instead of reusing the old
// Ovesos/Nesdor settlements, which occupy different parts of their provinces.
// Isareos always assembles outside Minora; its town landmark is civilian ground.
const ROUTE_BOUNDS={minX:-3050,maxX:-1230,minZ:-270,maxZ:1030};
const p=([x,z])=>({x,z});
// Both leagues use the real public bridges south of Minora. The Isa's upper
// gravel reach remains only for neutral Isareos access west of the city.
const crossing=b=>[lizeemBridgeEnd(b,1),{x:b.x,z:b.z},lizeemBridgeEnd(b,-1)];
const UPPER_CROSSING=crossing(LIZEEM_BRIDGES[0]),LOWER_CROSSING=crossing(LIZEEM_BRIDGES[1]);
function corridor(from,to){
  const key=[from,to].sort().join(':');let points;
  if(key==='caricas:nethereum')points=UPPER_CROSSING;
  if(key==='caricas:isareos')points=[...UPPER_CROSSING,...ISA_WAY.slice().reverse()];
  if(key==='isareos:nethereum')points=ISA_WAY.slice(1);
  if(key==='caricas:ovesos')points=[...UPPER_CROSSING,...WESTERN_WAY];
  if(key==='nethereum:ovesos')points=WESTERN_WAY;
  if(key==='caricas:nesdor')points=EASTERN_WAY;
  if(key==='nesdor:ovesos')points=[p([-1510,700]),...LOWER_CROSSING];
  if(!points)return [];
  return from===key.split(':')[0]?points:[...points].reverse();
}
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export const columnRouteLength=points=>points.slice(1).reduce((sum,p,i)=>sum+distance(points[i],p),0);

export function columnGroundClear(world,p,radius=.4){
  if(!columnTransitAllowed(p.x,p.z,radius)||(world.canExploreAt&&!world.canExploreAt(p.x,p.z)))return false;
  const y=world.heightAt(p.x,p.z);
  const water=waterAt(p.x,p.z,world);
  return Number.isFinite(y)&&y>=water-COLUMN_WADING_DEPTH&&(canStand(p.x,p.z,world,radius,y)||canSwim(p.x,p.z,world,radius,y));
}

// Exact collision checks are also used when scenery finishes streaming after a
// route was planned. A standard and its marker always use this same location.
export function clearColumnPoint(world,p,{radius=.4,reach=12,loaded=false}={}){
  const clear=q=>(!loaded||world.readyAt(q.x,q.z))&&columnGroundClear(world,q,radius);
  if(clear(p))return p;
  for(let r=1;r<=reach;r++)for(let i=0;i<16;i++){
    const angle=i*Math.PI/8,q={x:p.x+Math.sin(angle)*r,z:p.z+Math.cos(angle)*r,yaw:p.yaw??0};
    if(clear(q))return q;
  }
  return null;
}

function heap(){
  const items=[];
  return {get length(){return items.length;},push(value){let i=items.length;items.push(value);while(i){const p=(i-1)>>1;if(items[p].f<=value.f)break;items[i]=items[p];i=p;}items[i]=value;},pop(){
    const first=items[0],last=items.pop();if(items.length){let i=0;while(i*2+1<items.length){let c=i*2+1;if(c+1<items.length&&items[c+1].f<items[c].f)c++;if(items[c].f>=last.f)break;items[i]=items[c];i=c;}items[i]=last;}return first;
  }};
}

// A bounded, incremental search through actual dry ground and bridge decks.
// It never loads regions, changes terrain, or advances campaign time. Each
// yield is one expanded node, so the host can stop work between render frames.
export function* planColumnRoute(world,from,to,{bounds=ROUTE_BOUNDS,step=4,maxNodes=65000,via=[]}={}){
  if(via.length){
    const controls=[from,...via,to],joined=[];
    for(let i=1;i<controls.length;i++){
      const a=joined.at(-1)??controls[i-1],b=controls[i],margin=145;
      const local={minX:Math.max(bounds.minX,Math.min(a.x,b.x)-margin),maxX:Math.min(bounds.maxX,Math.max(a.x,b.x)+margin),minZ:Math.max(bounds.minZ,Math.min(a.z,b.z)-margin),maxZ:Math.min(bounds.maxZ,Math.max(a.z,b.z)+margin)};
      const leg=yield* planColumnRoute(world,a,b,{bounds:local,step,maxNodes:Math.min(maxNodes,14000)});
      if(!leg){yield {failedLeg:{from:a,to:b}};return null;}joined.push(...(joined.length?leg.slice(1):leg));yield;
    }return joined;
  }
  const samples=new Map(),edges=new Map(),queue=heap(),cost=new Map(),previous=new Map();
  // Clearance asks for the same ground height several times per probe. Cache
  // it only for this finite search leg; rendered-world terrain is expensive,
  // and a later streamed region must still be checked afresh.
  const heights=new Map(),terrain=Object.create(world);
  Object.defineProperty(terrain,'heightAt',{value:(x,z)=>{
    const id=`${x},${z}`;if(!heights.has(id))heights.set(id,world.heightAt(x,z));return heights.get(id);
  }});
  const key=p=>`${Math.round(p.x/step)},${Math.round(p.z/step)}`;
  const point=k=>{const [x,z]=k.split(',').map(Number);return {x:x*step,z:z*step};};
  const sample=(x,z)=>{
    const id=`${x.toFixed(2)},${z.toFixed(2)}`;if(samples.has(id))return samples.get(id);
    const inside=x>=bounds.minX&&x<=bounds.maxX&&z>=bounds.minZ&&z<=bounds.maxZ;
    // Include half the line-sample interval in clearance. A building corner or
    // narrow post between samples must not disappear during path smoothing.
    const p={x,z},good=inside&&columnGroundClear(terrain,p,.8)&&[[.5,0],[-.5,0],[0,.5],[0,-.5]].every(([dx,dz])=>terrain.heightAt(x+dx,z+dz)>=waterAt(x+dx,z+dz,terrain)-COLUMN_WADING_DEPTH);
    const value={clear:good,y:good?terrain.heightAt(x,z):0};samples.set(id,value);return value;
  };
  const clearLine=(a,b)=>{
    const count=Math.max(1,Math.ceil(distance(a,b)/.75));let prior=null;
    for(let i=0;i<=count;i++){
      const t=i/count,v=sample(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t);
      if(!v.clear||prior!==null&&Math.abs(v.y-prior)>Math.max(1.8,distance(a,b)/count*1.4))return false;
      prior=v.y;
    }return true;
  };
  const nearest=p=>{
    const centre=point(key(p));for(let ring=0;ring<=14;ring++)for(let dx=-ring;dx<=ring;dx++)for(let dz=-ring;dz<=ring;dz++){
      if(Math.max(Math.abs(dx),Math.abs(dz))!==ring)continue;
      const q={x:centre.x+dx*step,z:centre.z+dz*step};if(sample(q.x,q.z).clear)return q;
    }return null;
  };
  const start=nearest(from),goal=nearest(to);if(!start||!goal)return null;
  if(clearLine(start,goal))return [start,goal];
  const startId=key(start),goalId=key(goal);cost.set(startId,0);queue.push({id:startId,g:0,f:distance(start,goal)});
  let expanded=0;
  while(queue.length&&expanded++<maxNodes){
    const current=queue.pop();if(current.g!==cost.get(current.id))continue;
    const at=point(current.id);
    if(current.id===goalId){
      const reverse=[];for(let id=goalId;id;id=previous.get(id))reverse.push(point(id));const path=reverse.reverse(),result=[path[0]];
      // Straighten only collision-checked portions; never cut a river bend or
      // the inside of a wall merely to make the line look smoother.
      for(let i=0;i<path.length-1;){let next=Math.min(path.length-1,i+20);while(next>i+1&&!clearLine(path[i],path[next]))next--;result.push(path[next]);i=next;yield;}
      return result;
    }
    for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){
      if(!dx&&!dz)continue;const next={x:at.x+dx*step,z:at.z+dz*step},id=key(next);
      const g=current.g+Math.hypot(dx,dz)*step;if(g>=(cost.get(id)??Infinity))continue;
      if(!sample(next.x,next.z).clear)continue;
      const edge=[current.id,id].sort().join('/');let clear=edges.get(edge);if(clear===undefined){clear=clearLine(at,next);edges.set(edge,clear);}if(!clear)continue;
      cost.set(id,g);previous.set(id,current.id);queue.push({id,g,f:g+distance(next,goal)});
    }
    yield {expanded,frontier:queue.length};
  }
  return null;
}

// Only seven regional links exist in this campaign. Cache both directions of
// each physical route and reuse them across replacements, retreats and saves.
// Terrain search has a three-millisecond soft frame budget, yielding between
// search nodes instead of constructing or pathfinding for individual soldiers.
export function createColumnRoutes(world){
  const cache=new Map(),pending=new Map(),failed=new Map(),progress=new Map(),stagingCache=new Map();
  const assembly=id=>{if(id==='isareos')return ASSEMBLY.isareos;const town=world.landmarks?.find(p=>p.id===id+'-town');return town??ASSEMBLY[id];};
  function request(from,to){
    if(!ASSEMBLY[from]||!ASSEMBLY[to]||from===to)return null;
    const ids=[from,to].sort(),id=ids.join(':');
    if(cache.has(id)){
      const route=cache.get(id),points=from===ids[0]?route.points:[...route.points].reverse();
      return {...route,id:`${from}:${to}`,points,name:`${from[0].toUpperCase()+from.slice(1)}–${to[0].toUpperCase()+to.slice(1)} road`};
    }
    if(!pending.has(id)&&!failed.has(id))pending.set(id,planColumnRoute(world,assembly(ids[0]),assembly(ids[1]),{via:corridor(ids[0],ids[1])}));
    return null;
  }
  return {
    get:request,
    staging(from,to){
      if(!ASSEMBLY[from]||!ASSEMBLY[to]||from===to)return null;
      if(!stagingCache.has(from))stagingCache.set(from,clearColumnPoint(world,assembly(from),{reach:12}));
      const at=stagingCache.get(from);if(!at)return null;
      return {id:`${from}:${to}`,points:[at],length:0,pendingRoute:true,name:`${from[0].toUpperCase()+from.slice(1)} assembly point`};
    },
    step({budgetMs=3,maxSteps=250}={}){
      const until=performance.now()+budgetMs;let steps=0;
      while(pending.size&&steps++<maxSteps&&performance.now()<until){
        const [id,search]=pending.entries().next().value,result=search.next();
        if(result.done){pending.delete(id);if(result.value)cache.set(id,{points:result.value,length:columnRouteLength(result.value)});else failed.set(id,progress.get(id)??null);progress.delete(id);}else if(result.value)progress.set(id,result.value);
      }
    },
    state:()=>({ready:[...cache.keys()],pending:[...pending.keys()],failed:[...failed.keys()],progress:Object.fromEntries(progress),failureDetails:Object.fromEntries(failed)}),
  };
}
