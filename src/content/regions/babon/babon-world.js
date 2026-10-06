/** Babon's natural island: the open northeastern anchorage, old forested
 * ridges, damp ravines, cliff shores and occasional beach pockets. */
import { REGION_CELLS, REGION_OUTLINES, hexAt, regionAt, landDistance, SEA_LEVEL } from '../../../world/terrain/region-world.js';
import { PLAYABLE_SURVEY } from '../../../dev/tools/region-survey.js';
import { RIVER_EDGES } from '../../../world/terrain/region-rivers.js';
import { riverCourses } from '../../../world/terrain/region-layout.js';

const freeze=Object.freeze,point=(x,z)=>freeze({x,z});
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
const ellipse=(x,z,cx,cz,rx,rz)=>Math.hypot((x-cx)/rx,(z-cz)/rz);
export const BABON='Babon';
// Verified against azhora.wwmap: each of the22 deep-forest cells is Af; every
// one of the28 coastal grassland cells is Csa. The terrain export omits climate.
export const BABON_CELLS=freeze((REGION_CELLS.Babon??[]).map(c=>freeze({...c,climate:c.terrain==='deep_forest'?'Af':'Csa'})));
export const BABON_OUTLINES=REGION_OUTLINES.Babon??freeze([]);
const cells=new Map(BABON_CELLS.map(c=>[`${c.q},${c.r}`,c]));
export const BABON_BOUNDS=freeze({minX:Math.min(...BABON_CELLS.map(c=>c.x))-62,maxX:Math.max(...BABON_CELLS.map(c=>c.x))+62,
  minZ:Math.min(...BABON_CELLS.map(c=>c.z))-62,maxZ:Math.max(...BABON_CELLS.map(c=>c.z))+62});
export function babonOwns(x,z){
  const b=BABON_BOUNDS;if(x<b.minX||x>b.maxX||z<b.minZ||z>b.maxZ)return false;
  const h=hexAt(x,z);return cells.has(`${h.q},${h.r}`);
}
export function babonSegment(x,z,a,b){
  const dx=b.x-a.x,dz=b.z-a.z,t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1));
  return {distance:Math.hypot(x-a.x-dx*t,z-a.z-dz*t),t};
}
const lineDistance=(x,z,points)=>Math.min(...points.slice(1).map((b,i)=>babonSegment(x,z,points[i],b).distance));
const gaussian=(x,z,cx,cz,rx,rz,yaw=0)=>{
  const dx=x-cx,dz=z-cz,c=Math.cos(yaw),s=Math.sin(yaw),u=(dx*c+dz*s)/rx,v=(-dx*s+dz*c)/rz;
  return Math.exp(-(u*u+v*v));
};
const path=(id,width,coords)=>freeze({id,width,points:freeze(coords.map(([x,z])=>point(x,z)))});

/** Only a future reservation: no houses, piers, residents or city icon yet. */
export const BABON_TATHILIUM_RESERVE=freeze({x:-1300,z:2800,rx:135,rz:70});
export const BABON_ARRIVAL=point(-1320,2798);
export const BABON_BEACHES=freeze([
  freeze({id:'babon-palm-bight',x:-1810,z:3330,rx:73,rz:68}),
  freeze({id:'babon-eastern-cove',x:-1375,z:3275,rx:64,rz:68}),
  freeze({id:'babon-western-pocket',x:-2020,z:3220,rx:47,rz:63}),
]);
export const BABON_RAVINES=freeze([
  path('babon-fern-drainage',42,[[-1605,3037],[-1650,3100],[-1675,3180],[-1720,3250],[-1780,3305]]),
  path('babon-root-drainage',36,[[-1500,3030],[-1440,3085],[-1425,3180],[-1378,3260]]),
]);
export const BABON_LANDMARKS=freeze([
  freeze({id:'babon-harbor-plain',name:'The Northeastern Anchorage',region:60,...BABON_ARRIVAL,radius:68}),
  freeze({id:'babon-canopy-threshold',name:'The Old Canopy Threshold',region:60,x:-1500,z:2908,radius:48}),
  freeze({id:'babon-fern-ravine',name:'The Fern Ravine',region:60,x:-1620,z:3050,radius:45}),
  freeze({id:'babon-root-saddle',name:'The Rootbound Saddle',region:60,x:-1765,z:3115,radius:48}),
  freeze({id:'babon-western-overlook',name:'The Channel Cliffs',region:60,x:-1910,z:3105,radius:52}),
  freeze({id:'babon-palm-bight',name:'The Southern Palm Bight',region:60,x:-1810,z:3300,radius:48}),
  freeze({id:'babon-eastern-cove',name:'The Reef Cove',region:60,x:-1390,z:3270,radius:44}),
]);
export const BABON_TRAILS=freeze([
  path('babon-winding-interior',4.8,[[-1320,2798],[-1385,2840],[-1440,2865],[-1500,2908],[-1495,2970],[-1550,3035],[-1620,3050],[-1690,3100],[-1765,3115],[-1830,3160],[-1870,3230],[-1810,3300]]),
  path('babon-eastern-fold',4.3,[[-1550,3035],[-1510,3090],[-1490,3160],[-1420,3210],[-1390,3270]]),
  path('babon-channel-shoulder',4.3,[[-1765,3115],[-1840,3080],[-1910,3105]]),
]);

function plainFactor(x,z){const p=BABON_TATHILIUM_RESERVE;return 1-smooth(.76,1.8,ellipse(x,z,p.x,p.z,p.rx,p.rz));}
function beachFactor(x,z){return Math.max(...BABON_BEACHES.map(p=>1-smooth(.35,1.8,ellipse(x,z,p.x,p.z,p.rx,p.rz))));}
function ravineDistance(x,z){return Math.min(...BABON_RAVINES.map(p=>lineDistance(x,z,p.points)));}
export function babonTrailDistance(x,z){return Math.min(...BABON_TRAILS.map(p=>lineDistance(x,z,p.points)));}

/** Joined asymmetric hills rather than separate cones or a high flat mesa. */
function naturalHeight(x,z){
  let y=13+2.1*Math.sin(x*.017+Math.sin(z*.012))*Math.cos(z*.019);
  y+=83*gaussian(x,z,-1650,2980,215,92,-.27);
  y+=77*gaussian(x,z,-1830,3140,176,94,-.49);
  y+=69*gaussian(x,z,-1550,3180,202,97,.2);
  y+=18*gaussian(x,z,-1710,3110,270,130,.2);
  // High saddles link the hills; shallow shaded runoff corridors divide their
  // lower shoulders. Authored perennial streams are cut separately below.
  const ravine=ravineDistance(x,z);
  y-=13*(1-smooth(7,55,ravine))*smooth(45,115,landDistance(x,z));
  const plain=plainFactor(x,z),beach=beachFactor(x,z);
  y=mix(y,11.8+.004*(2800-z)+.002*(x+1300),plain);
  y=mix(y,9.2+1.4*Math.sin(x*.015)*Math.cos(z*.02),beach*.93);
  return Math.max(6,y);
}
const trailHeights=BABON_TRAILS.map(trail=>({...trail,points:trail.points.map(p=>({...p,y:naturalHeight(p.x,p.z)}))}));
function trailGround(x,z,incoming){
  let nearest=null;
  for(const trail of trailHeights)for(let i=1;i<trail.points.length;i++){
    const a=trail.points[i-1],b=trail.points[i],p=babonSegment(x,z,a,b);
    if(!nearest||p.distance<nearest.distance)nearest={...p,y:mix(a.y,b.y,p.t)};
  }
  return nearest?mix(incoming,nearest.y,1-smooth(3.6,16,nearest.distance)):incoming;
}

export const BABON_RIVER_EDGES=freeze(RIVER_EDGES.filter(e=>e.regions.includes(BABON)));
/** Four small streams traced directly from the21 authored river edges. The
 * profile descends continuously, and its last reach joins the actual sea level.
 * Samples include normals so the renderer can draw narrow sloping ribbons. */
export const BABON_RIVERS=freeze(riverCourses(PLAYABLE_SURVEY,BABON_RIVER_EDGES,undefined,{soften:2}).map((course,index)=>{
  let points=[...course.points];
  if(landDistance(points[0].x,points[0].z)<landDistance(points.at(-1).x,points.at(-1).z))points.reverse();
  const last=points.at(-1),before=points.at(-2),dx=last.x-before.x,dz=last.z-before.z,len=Math.hypot(dx,dz);
  // Carry the mapped mouth through the small coastline smoothing inset and
  // into the sea. This extends its final direction, never cuts a new river.
  let tail={...last};
  for(let d=2;d<=40;d+=2){tail={x:last.x+dx/len*d,z:last.z+dz/len*d};if(landDistance(tail.x,tail.z)<-5)break;}
  points.push(tail);
  const samples=[];let along=0;
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz),steps=Math.max(1,Math.ceil(length/3));
    for(let j=0;j<steps;j++)samples.push({x:mix(a.x,b.x,j/steps),z:mix(a.z,b.z,j/steps),nx:-dz/length,nz:dx/length,along:along+length*j/steps});
    along+=length;
  }
  samples.push({...tail,nx:samples.at(-1).nx,nz:samples.at(-1).nz,along});
  let previous=Infinity;
  for(const sample of samples){
    const remaining=along-sample.along,local=trailGround(sample.x,sample.z,naturalHeight(sample.x,sample.z))-.24;
    const descending=Math.max(SEA_LEVEL,Math.min(local,previous));
    sample.y=mix(SEA_LEVEL,descending,smooth(0,55,remaining));
    sample.halfWidth=1.85*smooth(0,10,sample.along);previous=descending;
    Object.freeze(sample);
  }
  return freeze({id:`babon-stream-${index+1}`,name:tail.x>-1400?'The Anchorage Beck':tail.z<2900?'The Western Canopy Beck':tail.x<-1800?'The Rootbound Beck':'The Southern Jungle Beck',
    region:60,halfWidth:1.85,depth:.55,points:freeze(points.map(p=>point(p.x,p.z))),samples:freeze(samples),
    bounds:freeze({minX:Math.min(...samples.map(p=>p.x))-18,maxX:Math.max(...samples.map(p=>p.x))+18,
      minZ:Math.min(...samples.map(p=>p.z))-18,maxZ:Math.max(...samples.map(p=>p.z))+18})});
}));
export function babonRiverAt(x,z,margin=0){
  let nearest=null;
  for(const river of BABON_RIVERS){
    const b=river.bounds;if(x<b.minX-margin||x>b.maxX+margin||z<b.minZ-margin||z>b.maxZ+margin)continue;
    for(let i=1;i<river.samples.length;i++){
      const a=river.samples[i-1],b=river.samples[i],p=babonSegment(x,z,a,b),width=mix(a.halfWidth,b.halfWidth,p.t);
      if(width<.01||p.distance>width+margin||nearest&&p.distance>=nearest.distance)continue;
      nearest={...p,river,halfWidth:width,waterY:mix(a.y,b.y,p.t),along:mix(a.along,b.along,p.t)};
    }
  }
  return nearest;
}
export function babonWaterAt(x,z){const p=babonRiverAt(x,z);return p?p.waterY:null;}

export function babonGround(x,z,incoming){
  if(x<BABON_BOUNDS.minX||x>BABON_BOUNDS.maxX||z<BABON_BOUNDS.minZ||z>BABON_BOUNDS.maxZ)return incoming;
  const owned=babonOwns(x,z),stream=babonRiverAt(x,z,15);
  // The coast is smoothed across atlas hex edges. An authored mouth must cut
  // that last low sliver too; offshore beds remain unchanged unless already
  // under the mapped mouth, and are never raised into new land.
  if(!owned&&!stream)return incoming;
  const shore=landDistance(x,z),sheltered=Math.max(plainFactor(x,z),beachFactor(x,z));
  const shoreWeight=smooth(2,mix(28,65,sheltered),shore)*smooth(.45,1.5,incoming-SEA_LEVEL);
  let target=owned?mix(incoming,trailGround(x,z,naturalHeight(x,z)),shoreWeight):incoming;
  if(stream){
    const width=stream.halfWidth,wet=stream.distance<=width;
    const bed=stream.waterY-stream.river.depth*(1-smooth(width*.62,width,stream.distance));
    // Below-sea incoming beds stay below the mouth rather than rising to a
    // shallow artificial sill. Banks meet the same ribbon used by waterAt.
    target=wet?Math.min(target,bed):mix(Math.min(target,stream.waterY),target,smooth(width,width+15,stream.distance));
    // The movement controller treats any depth as swimming. Natural gravel
    // bars at the few path crossings therefore sit just above local water,
    // rather than pretending a submerged ford is walkable. No bridge is built.
    const gravel=(1-smooth(2.6,4.5,babonTrailDistance(x,z)))*(1-smooth(width+1,width+6,stream.distance));
    if(gravel>0)target=mix(target,Math.max(target,stream.waterY+.045),gravel);
  }
  return target;
}
export function babonSlope(x,z,heightAt){
  return Math.hypot(heightAt(x+1,z)-heightAt(x-1,z),heightAt(x,z+1)-heightAt(x,z-1))/2;
}
export function babonHabitat(x,z){
  if(!babonOwns(x,z))return null;
  const shore=landDistance(x,z),plain=plainFactor(x,z),beach=beachFactor(x,z),ravine=ravineDistance(x,z),height=naturalHeight(x,z);
  const h=hexAt(x,z),cell=cells.get(`${h.q},${h.r}`),forest=cell?.terrain==='deep_forest';
  // Cell identity guides habitat without leaving a visible straight canopy
  // edge: warm coastal woodland thickens over roughly sixty metres inland.
  const interior=smooth(18,115,shore),canopy=clamp((.3+.68*interior)*(1-plain*.86)*(1-beach*.73));
  const kind=plain>.57?'coastal-plain':shore<24&&beach>.25?'beach':shore<28?'cliff'
    :ravine<23&&height>22?'ravine':height>72?'ridge':'jungle';
  return {kind,shore,canopy,wet:clamp(.55+(1-smooth(5,55,ravine))*.45-plain*.16),rough:smooth(25,95,height),height,
    climate:cell.climate,atlasTerrain:cell.terrain,ancient:forest&&canopy>.68,plain,beach,trailDistance:babonTrailDistance(x,z)};
}
export function babonTint(x,z){
  const f=babonHabitat(x,z);if(!f)return null;
  if(f.trailDistance<4.5&&babonRiverAt(x,z,4))return 0x939781;
  return f.kind==='beach'?0xb4b58a:f.kind==='coastal-plain'?0x83925d:f.kind==='cliff'?0x777c69
    :f.kind==='ravine'?0x475d43:f.kind==='ridge'?0x5e714e:0x596e43;
}
export function babonShoreTint(x,z,distance){
  if(distance<-30||distance>28||regionAt(x,z)?.name!==BABON)return null;
  const sheltered=Math.max(plainFactor(x,z),beachFactor(x,z));
  if(sheltered>.5)return {sand:1,rock:0,stone:'#a9ab84'};
  return {sand:0,rock:1-smooth(13,28,distance),stone:'#6c786b'};
}
export function babonClear(x,z,margin=0){
  if(BABON_LANDMARKS.some(p=>Math.hypot(x-p.x,z-p.z)<6+margin))return true;
  return BABON_TRAILS.some(p=>lineDistance(x,z,p.points)<p.width/2+1.7+margin);
}
export const BABON_VIEWS=freeze({
  'babon-harbor':freeze({eye:{x:-1170,z:2670,y:74},target:{x:-1320,z:2798,y:12}}),
  'babon-interior':freeze({eye:{x:-1560,z:3110,y:182},target:{x:-1700,z:3010,y:140}}),
  'babon-ravine':freeze({eye:{x:-1582,z:3041.857,y:74.65},target:{x:-1611,z:3048.071,y:80.76}}),
  'babon-river':freeze({eye:{x:-1339,z:2808,y:13.71},target:{x:-1350,z:2790,y:11.56}}),
  'babon-cliffs':freeze({eye:{x:-2025,z:3065,y:132},target:{x:-1910,z:3105,y:96}}),
  'babon-reef':freeze({eye:{x:-1300,z:3330,y:60},target:{x:-1390,z:3270,y:15}}),
});
