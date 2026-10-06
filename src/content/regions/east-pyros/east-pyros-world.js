/** The unwalled, unpeopled eastern Pyrosi country: old volcanic ground, open
 * grass and ash, a greener southern end, and small thermal basins. */
import { PLAYABLE_SURVEY } from '../../../dev/tools/region-survey.js';
import { regionCells, regionOutline } from '../../../world/terrain/region-layout.js';
import { hexOwnerAt, landDistance, terrainMix, seamlessTerrainMix, relief } from '../../../world/terrain/region-world.js';
import { VAELLIR, courseDistance, coursePosition, courseHalfAt } from '../western-regions/west-regions.js';

const freeze=Object.freeze;
const point=(x,z)=>freeze({x,z});
const clamp=t=>Math.max(0,Math.min(1,t));
const smooth=t=>{const s=clamp(t);return s*s*(3-2*s);};
const mix=(a,b,t)=>a+(b-a)*t;
const bell=(x,z,c)=>{const d=((x-c.x)/c.rx)**2+((z-c.z)/c.rz)**2;return d<1?(1-d)**2:0;};
export const EAST_PYROS='East Pyros';
export const EAST_PYROS_CELLS=freeze(regionCells(PLAYABLE_SURVEY,EAST_PYROS));
export const EAST_PYROS_OUTLINES=freeze(regionOutline(PLAYABLE_SURVEY,EAST_PYROS));
export const EAST_PYROS_BOX=freeze({minX:-3070,maxX:-2280,minZ:820,maxZ:1660});
export const EAST_PYROS_ARRIVAL=point(-2815,1115);
export const inEastPyrosBox=(x,z)=>x>EAST_PYROS_BOX.minX&&x<EAST_PYROS_BOX.maxX&&z>EAST_PYROS_BOX.minZ&&z<EAST_PYROS_BOX.maxZ;

export function eastPyrosSegment(x,z,a,b){
  const dx=b.x-a.x,dz=b.z-a.z,l2=dx*dx+dz*dz,t=l2?clamp(((x-a.x)*dx+(z-a.z)*dz)/l2):0;
  return {distance:Math.hypot(x-a.x-dx*t,z-a.z-dz*t),t};
}
export function eastPyrosBoundaryDistance(x,z){
  let distance=Infinity;
  for(const loop of EAST_PYROS_OUTLINES)for(let i=0;i<loop.length;i++)distance=Math.min(distance,eastPyrosSegment(x,z,loop[i],loop[(i+1)%loop.length]).distance);
  return distance;
}
// Telemonia's border is a zigzag of hex edges, and the nearest of them changes along the lines halfway between
// two: a feather laid off that distance creased there, as a lit band down the slope. Off Telemonia's edges alone
// the distance is a smooth minimum (over SOFT_SEAM metres), so the ground comes down to the rim's foot in one slope.
const SOFT_SEAM=8;
const besideTelemonia=(a,b)=>{const mx=(a.x+b.x)/2,mz=(a.z+b.z)/2,dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz)||1;
  return hexOwnerAt(mx-dz/l,mz+dx/l)==='Telemonia'||hexOwnerAt(mx+dz/l,mz-dx/l)==='Telemonia';};
const EAST_PYROS_EDGES=EAST_PYROS_OUTLINES.flatMap(loop=>loop.map((a,i)=>[a,loop[(i+1)%loop.length]]));
const TELEMONIA_EDGES=EAST_PYROS_EDGES.filter(([a,b])=>besideTelemonia(a,b)),OTHER_EDGES=EAST_PYROS_EDGES.filter(([a,b])=>!besideTelemonia(a,b));
function eastPyrosFeatherDistance(x,z){
  let other=Infinity,sum=0;
  for(const [a,b] of OTHER_EDGES)other=Math.min(other,eastPyrosSegment(x,z,a,b).distance);
  for(const [a,b] of TELEMONIA_EDGES)sum+=Math.exp(-eastPyrosSegment(x,z,a,b).distance/SOFT_SEAM);
  return Math.min(other,sum>0?-SOFT_SEAM*Math.log(sum):Infinity);
}
// The border with the Oves Desert (2026-10-03). Both sides are handed the world's hex blend, which steps along that
// line where this country's outland roll (6 m on a 150 m wave) meets the desert's 320 m one, and the desert's basin
// and rim, gated by the same blend's weights, step with it: up to 5.7 m between two points half a metre apart across
// the line, and 1.6 m at the corner with Telemonia, where the desert and Telemonia agree and this side stood low.
// The desert is the older country and its ground is left exactly as it is: this side's handed ground is moved to
// meet it. The step from this side to the far one is measured every half metre along each edge this country shares
// with the Oves Desert, and with Telemonia (its side met this one already, with `telemoniaSeamBedrock`, except by
// the corner the three share; elsewhere the step and so the move there are nothing). A point is moved by the step
// read off its nearest edges - a soft nearest, which hardens to the edge itself at the line, so the zigzag's
// corners crease nothing - and averaged along the border over as many metres either way as the point stands in
// (`widen`): the two blends' ribs are out of step, so the step swings by five metres in ten along the line, and
// carried straight in it stood up new ribs of its own. The move lets go over `reach` metres in. `baseAt` is the
// ground handed to this country, asked on both sides of the line (src/world/terrain/world-terrain.js); without it nothing moves.
export const EAST_PYROS_SEAM=freeze({reach:40,probe:.05,step:.5,widen:1,neighbours:freeze(['Oves Desert','Telemonia'])});
// Toward the Nether Desert (2026-10-03). The hex blend this country is handed steps by up to 8 m along this
// country's own hex edge that runs in from the corner at (-2600, 952.8), over its first twenty metres, where the
// blend takes in a hex two steps away all at once; the Nether Desert meets this side at the line and cannot meet
// both halves of that step. Within `inside` metres of the Nether Desert the handed ground is laid on the blend that
// has no seams (src/world/terrain/region-world.js `seamlessTerrainMix`), letting go by `outside`; the Oves Desert's border is
// measured against the same ground (`seamLines`, below), so its join is unchanged by it.
export const EAST_PYROS_NETHER_SIDE=freeze({inside:30,outside:60});
const NETHER_EDGES=EAST_PYROS_EDGES.filter(([a,b])=>{const mx=(a.x+b.x)/2,mz=(a.z+b.z)/2,dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz)||1;
  return [1,-1].some(k=>hexOwnerAt(mx+k*dz/l,mz-k*dx/l)==='Nether Desert');});
/** How much of the seamless blend's correction this point takes: 1 by the Nether Desert, 0 past `outside`. */
function netherSide(x,z){
  const S=EAST_PYROS_NETHER_SIDE;
  let near=Infinity;for(const [a,b] of NETHER_EDGES)near=Math.min(near,eastPyrosSegment(x,z,a,b).distance);
  return 1-smooth((near-S.inside)/(S.outside-S.inside));
}
/** The ground handed to this country, its hex blend made seamless toward the Nether Desert. */
export function eastPyrosHanded(x,z,handed){
  const side=netherSide(x,z);
  if(side<=0)return handed;
  const seamless=seamlessTerrainMix(x,z),mixed=terrainMix(x,z),shore=smooth((landDistance(x,z)-2)/38);
  return handed+side*shore*(seamless.base+relief(x,z,seamless.amp,seamless.wave)-mixed.base-relief(x,z,mixed.amp,mixed.wave));
}
let SEAM_LINES=null;
function seamLines(baseAt){
  if(SEAM_LINES)return SEAM_LINES;
  const S=EAST_PYROS_SEAM,lines=[],box={minX:Infinity,maxX:-Infinity,minZ:Infinity,maxZ:-Infinity};
  for(const [a,b] of EAST_PYROS_EDGES){
    const dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz),mx=(a.x+b.x)/2,mz=(a.z+b.z)/2;
    let nx=dz/length,nz=-dx/length;
    if(hexOwnerAt(mx+nx,mz+nz)===EAST_PYROS){nx=-nx;nz=-nz;}
    if(!S.neighbours.includes(hexOwnerAt(mx+nx,mz+nz)))continue;
    const count=Math.max(1,Math.ceil(length/S.step)),steps=new Float64Array(count+1);
    for(let i=0;i<=count;i++){
      // A hand's breadth in from either end, so neither probe lands in the third hex at a corner.
      const s=Math.max(.1,Math.min(length-.1,length*i/count)),x=a.x+dx*s/length,z=a.z+dz*s/length;
      const ix=x-nx*S.probe,iz=z-nz*S.probe;
      steps[i]=baseAt(x+nx*S.probe,z+nz*S.probe)-eastPyrosHanded(ix,iz,baseAt(ix,iz));
    }
    // The step's running integral at each sample, the step being straight between samples: any stretch's mean in two reads.
    const h=length/count,sums=new Float64Array(count+1);
    for(let i=1;i<=count;i++)sums[i]=sums[i-1]+(steps[i-1]+steps[i])/2*h;
    lines.push({a,b,length,h,steps,sums,count});
    for(const p of [a,b]){box.minX=Math.min(box.minX,p.x-S.reach);box.maxX=Math.max(box.maxX,p.x+S.reach);box.minZ=Math.min(box.minZ,p.z-S.reach);box.maxZ=Math.max(box.maxZ,p.z+S.reach);}
  }
  // The edges end to end, as runs of border measured along: the average reads across a corner as along an edge.
  const joined=(p,q)=>Math.hypot(p.b.x-q.a.x,p.b.z-q.a.z)<1e-6,breakAt=lines.findIndex((l,i)=>!joined(lines[(i+lines.length-1)%lines.length],l));
  const ordered=breakAt>0?[...lines.slice(breakAt),...lines.slice(0,breakAt)]:lines;
  let run=null;
  for(const [i,line] of ordered.entries()){
    if(!i||!joined(ordered[i-1],line))run={lines:[],before:[],length:0};
    line.run=run;line.start=run.length;run.before.push(run.lines.length?run.before.at(-1)+run.lines.at(-1).sums.at(-1):0);
    run.lines.push(line);run.length+=line.length;
  }
  return SEAM_LINES=freeze({lines:freeze(lines),box:freeze(box),distance:new Float64Array(lines.length),along:new Float64Array(lines.length)});
}
function seamIntegral(line,s){
  const f=s/line.h,j=Math.min(line.count-1,Math.floor(f)),u=f-j,a=line.steps[j],b=line.steps[j+1];
  return line.sums[j]+line.h*(a*u+(b-a)*u*u/2);
}
function runIntegral(run,s){
  let e=0;while(e<run.lines.length-1&&run.lines[e+1].start<=s)e++;
  const line=run.lines[e];
  return run.before[e]+seamIntegral(line,Math.max(0,Math.min(line.length,s-line.start)));
}
/** The step `s` metres along one edge, averaged over `w` metres either way along the border it is part of. */
function seamStep(line,s,w){
  const run=line.run,at=line.start+s,from=Math.max(0,at-w),to=Math.min(run.length,at+w);
  if(to-from<1e-6){const f=s/line.h,j=Math.min(line.count-1,Math.floor(f));return mix(line.steps[j],line.steps[j+1],f-j);}
  return (runIntegral(run,to)-runIntegral(run,from))/(to-from);
}
/** How far this side's handed ground is moved to meet the Oves Desert's (and Telemonia's) across the border. */
export function eastPyrosSeamMove(x,z,baseAt){
  if(!baseAt)return 0;
  const {lines,box,distance,along}=seamLines(baseAt);
  if(x<box.minX||x>box.maxX||z<box.minZ||z>box.maxZ)return 0;
  let near=Infinity;
  for(let i=0;i<lines.length;i++){const p=eastPyrosSegment(x,z,lines[i].a,lines[i].b);distance[i]=p.distance;along[i]=p.t;near=Math.min(near,p.distance);}
  if(near>=EAST_PYROS_SEAM.reach)return 0;
  const soft=.1+.5*near;
  let sum=0,total=0;
  for(let i=0;i<lines.length;i++){
    const k=(distance[i]-near)/soft;if(k>24)continue;
    const w=Math.exp(-k),line=lines[i];
    total+=w;sum+=w*seamStep(line,along[i]*line.length,distance[i]*EAST_PYROS_SEAM.widen);
  }
  return sum/total*(1-smooth(near/EAST_PYROS_SEAM.reach));
}
export function eastPyrosRiverClearance(x,z){
  return courseDistance(VAELLIR,x,z)-courseHalfAt(VAELLIR,coursePosition(VAELLIR,x,z));
}
export const EAST_PYROS_SWELLS=freeze([
  freeze({id:'talermolis',x:-2845,z:990,rx:180,rz:150,rise:32}),
  freeze({id:'ash-shoulder',x:-2705,z:1158,rx:152,rz:178,rise:22}),
  freeze({id:'red-ridge',x:-2468,z:1248,rx:91,rz:182,rise:20}),
  freeze({id:'southern-fold',x:-2470,z:1480,rx:118,rz:132,rise:7}),
]);
const dryWash=(id,points,width,depth)=>freeze({id,points:freeze(points.map(([x,z])=>point(x,z))),width,depth});
/** These are dry runnels and shallow gravel fans, not invented perennial rivers. */
export const EAST_PYROS_WASHES=freeze([
  dryWash('talermolis-wash',[[-2797,1037],[-2832,1074],[-2865,1120],[-2878,1153]],11,2.4),
  dryWash('red-stone-wash',[[-2471,1272],[-2518,1310],[-2566,1344],[-2611,1386]],12,1.9),
]);
export function eastPyrosWashAt(x,z){
  let best={distance:Infinity,wash:null};
  for(const wash of EAST_PYROS_WASHES)for(let i=1;i<wash.points.length;i++){
    const p=eastPyrosSegment(x,z,wash.points[i-1],wash.points[i]);if(p.distance<best.distance)best={...p,wash};
  }
  return best;
}
export const EAST_PYROS_ROUTES=freeze([
  freeze({id:'east-pyros-open-valley',width:8,points:freeze([[-2890,1020],[-2860,1050],[-2815,1115],[-2754,1135],[-2667,1222],[-2600,1310],[-2518,1420],[-2460,1500]].map(([x,z])=>point(x,z)))}),
  freeze({id:'east-pyros-red-saddle',width:7,points:freeze([[-2667,1222],[-2585,1188],[-2530,1176],[-2455,1165]].map(([x,z])=>point(x,z)))}),
]);
export const EAST_PYROS_TRAILS=EAST_PYROS_ROUTES;
export function eastPyrosRouteDistance(x,z){
  let best=Infinity;
  for(const route of EAST_PYROS_ROUTES)for(let i=1;i<route.points.length;i++)best=Math.min(best,eastPyrosSegment(x,z,route.points[i-1],route.points[i]).distance);
  return best;
}
export function eastPyrosNaturalHeight(x,z){
  let y=26+Math.sin(x/173)*Math.cos(z/191)*1.1;
  for(const hill of EAST_PYROS_SWELLS)y+=hill.rise*bell(x,z,hill);
  const wash=eastPyrosWashAt(x,z);
  if(wash.wash)y-=wash.wash.depth*(1-smooth(wash.distance/wash.wash.width));
  return y;
}
const pool=(id,name,x,z,radius)=>freeze({id,name,x,z,radius,surfaceY:eastPyrosNaturalHeight(x,z)-1.35,depth:.7});
export const EAST_PYROS_POOLS=freeze([
  pool('east-pyros-warm-spring','The Warm Ash Spring',-2775,1060,7.2),
  pool('east-pyros-green-spring','The Green-Rim Spring',-2515,1390,5.7),
]);
export function eastPyrosWaterAt(x,z){
  if(!inEastPyrosBox(x,z))return null;
  const p=EAST_PYROS_POOLS.find(p=>Math.hypot(x-p.x,z-p.z)<p.radius*.73);
  return p?p.surfaceY:null;
}
export const EAST_PYROS_OUTCROPS=freeze([
  freeze({id:'talermolis-basalt',name:'The Talermolis Basalt',x:-2882,z:968,radius:12,kind:'basalt'}),
  freeze({id:'east-pyros-ash-columns',name:'The Ash Columns',x:-2680,z:1128,radius:17,kind:'basalt'}),
  freeze({id:'east-pyros-red-stone',name:'The Red Stone Fold',x:-2458,z:1280,radius:17,kind:'red-stone'}),
  freeze({id:'east-pyros-pumice',name:'The Pumice Hollow',x:-2548,z:1188,radius:13,kind:'pumice'}),
]);
export const EAST_PYROS_LANDMARKS=freeze([
  freeze({id:'east-pyros-talermolis',name:'The Talermolis Rise',region:57,x:-2860,z:996,radius:58}),
  ...EAST_PYROS_POOLS.map(p=>freeze({...p,x:p.x+p.radius*2.5,region:57,radius:25})),
  ...EAST_PYROS_OUTCROPS.slice(1).map(p=>freeze({...p,x:p.x+p.radius+8,region:57,radius:32})),
  freeze({id:'east-pyros-southern-grass',name:'The Southern Green',region:57,x:-2460,z:1500,radius:45}),
]);
export const EAST_PYROS_VIEWS=freeze({
  'east-pyros':freeze({eye:freeze({x:-2610,z:1290,y:133}),target:freeze({x:-2790,z:1080,y:37})}),
  'east-pyros-springs':freeze({eye:freeze({x:-2739,z:1100,y:64}),target:freeze({x:-2775,z:1060,y:EAST_PYROS_POOLS[0].surfaceY})}),
  'east-pyros-red-stone':freeze({eye:freeze({x:-2388,z:1325,y:75}),target:freeze({x:-2458,z:1280,y:38})}),
  'east-pyros-south':freeze({eye:freeze({x:-2390,z:1530,y:76}),target:freeze({x:-2490,z:1480,y:25})}),
  // The border with Telemonia (src/content/regions/telemonia/telemonia-world.js, `telemoniaSeamBedrock`): the rim's foot from under the
  // Red Ridge, and the same foot from over the western rim's outer face.
  'east-pyros-border':freeze({eye:freeze({x:-2440,z:1250,y:47}),target:freeze({x:-2356,z:1242,y:14})}),
  'east-pyros-border-from-telemonia':freeze({eye:freeze({x:-2385,z:1330,y:40}),target:freeze({x:-2450,z:1385,y:24})}),
});

export function eastPyrosGround(x,z,handed,baseAt=null){
  if(!inEastPyrosBox(x,z)||hexOwnerAt(x,z)!==EAST_PYROS)return handed;
  const shore=landDistance(x,z),edge=eastPyrosBoundaryDistance(x,z),river=eastPyrosRiverClearance(x,z);
  if(shore<=8||river<=25)return handed;
  // The handed ground, met to the Oves Desert's across the border (`eastPyrosSeamMove`); the country feathers to that.
  // Toward the Nether Desert it is first laid seamless (`eastPyrosHanded`), only where the world asks with `baseAt`.
  const incoming=(baseAt?eastPyrosHanded(x,z,handed):handed)+eastPyrosSeamMove(x,z,baseAt);
  if(edge<.001)return incoming;
  const weight=smooth(eastPyrosFeatherDistance(x,z)/72)*smooth((shore-8)/48)*smooth((river-25)/36);
  let target=eastPyrosNaturalHeight(x,z);
  for(const pool of EAST_PYROS_POOLS){
    const r=Math.hypot(x-pool.x,z-pool.z)/pool.radius;
    // The visible water edge and the zero-depth shoreline are the same circle.
    // A low mineral lip then blends into the slope, keeping water from ending
    // halfway up an open, below-water bank on the downhill side.
    if(r<.73)target=pool.surfaceY-pool.depth*(1-smooth((r-.4)/.33));
    else if(r<1.08)target=pool.surfaceY+.35*smooth((r-.73)/.35);
    else if(r<2.2)target=mix(pool.surfaceY+.35,target,smooth((r-1.08)/1.12));
  }
  return mix(incoming,target,weight);
}
/** Moisture comes from shelter and the south; the atlas's eastern margin is dry. */
export function eastPyrosHabitat(x,z){
  const north=bell(x,z,{x:-2860,z:1000,rx:190,rz:165}),south=smooth((z-1390)/170);
  const river=eastPyrosRiverClearance(x,z),wash=eastPyrosWashAt(x,z);
  const moist=Math.max(north*.76,south,river<35?.65:0);
  return {moist,river,washDistance:wash.distance,dry:1-moist,flower:moist>.4};
}
export function eastPyrosTint(x,z){
  if(!inEastPyrosBox(x,z)||hexOwnerAt(x,z)!==EAST_PYROS||eastPyrosBoundaryDistance(x,z)<8||landDistance(x,z)<10)return null;
  const habitat=eastPyrosHabitat(x,z);
  if(EAST_PYROS_POOLS.some(p=>Math.hypot(x-p.x,z-p.z)<p.radius*1.7))return '#afa98c';
  if(habitat.washDistance<5)return '#857d6b';
  if(EAST_PYROS_OUTCROPS.some(p=>p.kind==='red-stone'&&Math.hypot(x-p.x,z-p.z)<p.radius*1.6))return '#a17a61';
  if(habitat.moist>.68)return '#85905a';
  return Math.sin(x*.026+Math.sin(z*.019))>.58?'#82785d':'#aaa06a';
}
export function eastPyrosClear(x,z,margin=0){
  if(Math.hypot(x-EAST_PYROS_ARRIVAL.x,z-EAST_PYROS_ARRIVAL.z)<8+margin)return true;
  if(EAST_PYROS_LANDMARKS.some(p=>Math.hypot(x-p.x,z-p.z)<5+margin))return true;
  if(eastPyrosRouteDistance(x,z)<4.5+margin)return true;
  return EAST_PYROS_POOLS.some(p=>Math.hypot(x-p.x,z-p.z)<p.radius*1.7+margin);
}
