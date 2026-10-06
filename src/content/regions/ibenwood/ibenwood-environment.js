import { finishBuild } from '../../../world/loading/build-steps.js';
import { REGION_CELLS, hexOwnerAt, hexAtlasCorners, TRANSFORM } from '../../../world/terrain/region-world.js';
import { IBENWOOD_RIVER_EDGES } from './ibenwood-rivers.js';

export const IBENWOOD_NAMES = Object.freeze(['East Ibenwood','North Ibenwood','South Ibenwood','West Ibenwood','Central Ibenwood']);
export const IBENWOOD_PILOT = Object.freeze({x:-3100.0019279391277,z:375.41016151377545,radius:87});
export const IBENWOOD_PROTECTION = 'Living trees in the elven forest are protected. Felling is forbidden; fallen wood may be gathered.';
export const IBENWOOD_SPECIES = Object.freeze(['grey-vault','pale-witness','bloodoak','midnight-elm','ridgeback','deeproot']);
// Keep scenery exclusions tied to the same generated atlas edges as the rendered rivers.
// These wider distances reserve the banks as well as the actual water ribbons.
const waterEdges=IBENWOOD_RIVER_EDGES.map(edge=>[`${edge.a.join(',')}|${edge.b.join(',')}`,edge.size==='medium'?10:6]);
export const IBENWOOD_WATER_EDGES=Object.freeze(waterEdges.map(([id,halfWidth])=>{
  const [first,second]=id.split('|').map(h=>h.split(',').map(Number)),a=hexAtlasCorners(...first),b=hexAtlasCorners(...second);
  const shared=a.filter(p=>b.some(q=>Math.hypot(p.x-q.x,p.y-q.y)<.001)).map(p=>TRANSFORM.atlasToWorld(p.x,p.y));
  return Object.freeze({id,halfWidth,a:shared[0],b:shared[1]});
}));
export function ibenwoodWaterClear(x,z,padding=0) {
  return !IBENWOOD_WATER_EDGES.some(e=>segmentDistance(x,z,e.a,e.b)<e.halfWidth+padding);
}
const cells = name => REGION_CELLS[name] ?? [];
const all = IBENWOOD_NAMES.flatMap(cells);
const central = cells('Central Ibenwood');
const distance = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);
const distanceField=new Map(),FIELD=20;
if(all.length&&central.length) {
  const minX=Math.floor((Math.min(...all.map(c=>c.x))-80)/FIELD),maxX=Math.ceil((Math.max(...all.map(c=>c.x))+80)/FIELD);
  const minZ=Math.floor((Math.min(...all.map(c=>c.z))-80)/FIELD),maxZ=Math.ceil((Math.max(...all.map(c=>c.z))+80)/FIELD);
  for(let ix=minX;ix<=maxX;ix++)for(let iz=minZ;iz<=maxZ;iz++)distanceField.set(`${ix},${iz}`,Math.max(0,Math.min(...central.map(c=>Math.hypot(ix*FIELD-c.x,iz*FIELD-c.z)))-57.735));
}
const centralDistance = (x,z) => {
  const ix=Math.floor(x/FIELD),iz=Math.floor(z/FIELD),tx=x/FIELD-ix,tz=z/FIELD-iz;
  const a=distanceField.get(`${ix},${iz}`),b=distanceField.get(`${ix+1},${iz}`),c=distanceField.get(`${ix},${iz+1}`),d=distanceField.get(`${ix+1},${iz+1}`);
  return a===undefined||b===undefined||c===undefined||d===undefined?Infinity:(a*(1-tx)+b*tx)*(1-tz)+(c*(1-tx)+d*tx)*tz;
};
const beltWidth = (x,z) => 135+24*Math.sin(x/117)+19*Math.cos(z/93)+12*Math.sin((x+z)/61);
export function ibenwoodProtected(x,z) {
  if(distance({x,z},IBENWOOD_PILOT)<88)return true;
  const owner=hexOwnerAt(x,z);
  return owner==='Central Ibenwood'||(IBENWOOD_NAMES.includes(owner)&&centralDistance(x,z)<beltWidth(x,z));
}
// Authored-cell selection is independent of survey order and existing regional IDs.
function select(name,score) { return [...cells(name)].sort((a,b)=>score(a)-score(b)||a.q-b.q||a.r-b.r)[0]; }
const groveSpecs=[['north-root-hollow','North Ibenwood','Cedar Root Hollow','root',42],['west-stone-boughs','West Ibenwood','Mossbound Stone Boughs','stone',43],['central-high-boughs','Central Ibenwood','High Bough Grove','branch',44],['central-royal-glade','Central Ibenwood','Royal Glade','royal',47]];
const selected=[];
export const IBENWOOD_GROVES=Object.freeze(groveSpecs.flatMap(([id,region,name,kind,radius])=>{
  const c=select(region,p=>{
    const inward=centralDistance(p.x,p.z);
    const separation=Math.min(1000,...selected.map(g=>distance(p,g)));
    return (kind==='royal'?inward:Math.abs(inward-55)) + Math.max(0,260-separation)*8 + Math.max(0,180-distance(p,IBENWOOD_PILOT))*8;
  });
  if(!c)return [];
  const g=Object.freeze({id,region,name,kind,radius,x:c.x,z:c.z});selected.push(g);return[g];
}));
export const IBENWOOD_ARRIVALS=Object.freeze(Object.fromEntries(IBENWOOD_NAMES.flatMap(name=>{
  const c=select(name,p=>-centralDistance(p.x,p.z)+Math.max(0,150-distance(p,IBENWOOD_PILOT))*5);
  return c?[[name,Object.freeze({x:c.x,z:c.z})]]:[];
})));
export function segmentDistance(x,z,a,b) {
  const dx=b.x-a.x,dz=b.z-a.z,l=dx*dx+dz*dz;
  const t=l?Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/l)):0;
  return Math.hypot(x-a.x-t*dx,z-a.z-t*dz);
}
// Paths are local winding walks, not five radial roads. Bucket lookup keeps scatter linear.
const cellKey=c=>`${c.q},${c.r}`,cellMap=new Map(all.map(c=>[cellKey(c),c])),pathCells=new Map();
const steps=[[1,0],[-1,0],[0,1],[0,-1],[1,-1],[-1,1]];
// Connected woodland walks use atlas neighbours; short secondary tracks occur only
// occasionally, leaving ample off-trail forest rather than a path in every hex.
for(const arrival of Object.values(IBENWOOD_ARRIVALS)) {
  const start=all.find(c=>distance(c,arrival)<1),target=[...IBENWOOD_GROVES].sort((a,b)=>distance(a,arrival)-distance(b,arrival))[0];
  if(!start||!target)continue;
  const goal=all.find(c=>distance(c,target)<1),queue=[start],previous=new Map([[cellKey(start),null]]);
  for(let i=0;i<queue.length&&!previous.has(cellKey(goal));i++)for(const [dq,dr] of steps) {
    const c=cellMap.get(`${queue[i].q+dq},${queue[i].r+dr}`);
    if(c&&!previous.has(cellKey(c))) {previous.set(cellKey(c),queue[i]);queue.push(c);}
  }
  let c=goal;
  while(c&&previous.has(cellKey(c))) {
    pathCells.set(cellKey(c),c);const before=previous.get(cellKey(c));
    if(before)pathCells.set(`link-${cellKey(c)}`,{id:`ibenwood-link-${cellKey(c)}`,points:[{x:c.x,z:c.z},{x:(c.x+before.x)/2+4*Math.sin(c.r),z:(c.z+before.z)/2+4*Math.cos(c.q)},{x:before.x,z:before.z}]});
    c=before;
  }
}
for(const c of all)if((Math.abs(c.q*7+c.r*11)%9)===0)pathCells.set(cellKey(c),c);
export const IBENWOOD_PATHS=Object.freeze([...pathCells.values()].map(c=>c.points?c:({id:`ibenwood-path-${c.q}-${c.r}`,points:[
  {x:c.x-43,z:c.z+12*Math.sin(c.q)}, {x:c.x-15,z:c.z+7*Math.cos(c.r)},
  {x:c.x+16,z:c.z-9*Math.sin(c.q+c.r)}, {x:c.x+43,z:c.z+12*Math.sin(c.q+1)},
]})));
const pathIndex=new Map(),key=(x,z)=>`${Math.floor(x/100)},${Math.floor(z/100)}`;
for(const p of IBENWOOD_PATHS)for(let i=1;i<p.points.length;i++) {
  const a=p.points[i-1],b=p.points[i];
  for(let ix=Math.floor((Math.min(a.x,b.x)-12)/100);ix<=Math.floor((Math.max(a.x,b.x)+12)/100);ix++)
    for(let iz=Math.floor((Math.min(a.z,b.z)-12)/100);iz<=Math.floor((Math.max(a.z,b.z)+12)/100);iz++) {
      const k=`${ix},${iz}`;if(!pathIndex.has(k))pathIndex.set(k,[]);pathIndex.get(k).push([a,b]);
    }
}
export function ibenwoodFeatureClear(x,z,padding=0) {
  if(!ibenwoodWaterClear(x,z,padding))return false;
  if(distance({x,z},IBENWOOD_PILOT)<87+padding)return false;
  if(IBENWOOD_GROVES.some(g=>distance({x,z},g)<g.radius+padding))return false;
  if(Object.values(IBENWOOD_ARRIVALS).some(a=>distance({x,z},a)<4+padding))return false;
  return !(pathIndex.get(key(x,z))??[]).some(([a,b])=>segmentDistance(x,z,a,b)<1.2+padding);
}
// Leave the base terrain unchanged: it preserves continuous old-country borders and
// the root's authored river relief. Local scenery follows this same surface exactly.
export function ibenwoodRegionalGround(x,z,baseHeight) { return typeof baseHeight==='function'?baseHeight(x,z):baseHeight; }
const outer={
  'North Ibenwood':['silver-fir','silver-birch','red-cedar'],
  'East Ibenwood':['holm-oak','stone-pine','beech','white-oak'],
  'South Ibenwood':['black-alder','black-willow','bald-cypress','sycamore'],
  'West Ibenwood':['beech','white-oak','sweet-chestnut','black-walnut'],
};
export function ibenwoodTreeSpecies(region,x,z,roll) {
  const list=ibenwoodProtected(x,z)?IBENWOOD_SPECIES:outer[region]??outer['West Ibenwood'];
  return list[Math.min(list.length-1,Math.floor(roll*list.length))];
}
export function ibenwoodForestTrees(options) { return finishBuild(ibenwoodForestTreesSteps(options)); }
export function* ibenwoodForestTreesSteps({waterClear=ibenwoodWaterClear}={}) {
  const trees=[],grid=new Map(),spacing=2.5;
  for(const region of IBENWOOD_NAMES)for(const c of cells(region)) {
    let seed=(Math.imul(c.q,73856093)^Math.imul(c.r,19349663)^903021)>>>0;
    const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<250;i++) {
      if(i%32===0)yield;
      const x=c.x+(random()-.5)*100,z=c.z+(random()-.5)*115.47,size=random(),choice=random();
      if(hexOwnerAt(x,z)!==region||!ibenwoodFeatureClear(x,z,1.1)||!waterClear(x,z,4))continue;
      // Dense regeneration patches and open old stands, with no regular trunk grid.
      const patch=(Math.sin(x/24)+Math.cos(z/31)+Math.sin((x+z)/18))/3;
      if(size>(patch>.2?.98:patch<-.35?.48:.81))continue;
      const gx=Math.floor(x/spacing),gz=Math.floor(z/spacing);let crowded=false;
      for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)for(const t of grid.get(`${gx+dx},${gz+dz}`)??[])if(Math.hypot(t.x-x,t.z-z)<spacing)crowded=true;
      if(crowded)continue;
      const protectedTree=ibenwoodProtected(x,z),age=size<.24?'sapling':size>.76?'veteran':'mature';
      const height=age==='sapling'?3+choice*5:age==='veteran'?25+choice*14:13+choice*13;
      const t={id:`ibenwood-regional-${c.q}-${c.r}-${i}`,region,x,z,species:ibenwoodTreeSpecies(region,x,z,choice),height,radius:age==='sapling'?.13+choice*.09:age==='veteran'?1.1+choice*1.1:.32+choice*.45,age,harvestable:!protectedTree,...(protectedTree?{protectedReason:IBENWOOD_PROTECTION}:{})};
      trees.push(t);const k=`${gx},${gz}`;if(!grid.has(k))grid.set(k,[]);grid.get(k).push(t);
    }
  }
  return trees;
}
