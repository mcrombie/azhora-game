/** Pure atlas-owned ground and exterior access for the two surviving dwarf
 * city kingdoms. Their halls are interiors: this surface never flattens a city
 * sized hole through the mountains. Coordinates and levels are world metres. */
import { REGION_CELLS, REGION_OUTLINES, hexAt, hexCentre, seamlessTerrainMix, relief, TRANSFORM } from '../../../world/terrain/region-world.js';
import { PLAYABLE_SURVEY } from '../../../dev/tools/region-survey.js';
import { RIVER_EDGES } from '../../../world/terrain/region-rivers.js';
import { regionOutline, riverCourses } from '../../../world/terrain/region-layout.js';
import { createHexBoundaryDistance } from '../../../world/terrain/hex-boundary-distance.js';
import { cacheTerrainPointSamples } from '../../../world/terrain/terrain-point-cache.js';

const freeze=Object.freeze, clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), lerp=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
const point=(x,z,y)=>freeze({x,z,...(y===undefined?{}:{y})});
const anchor=(q,r,dx=0,dz=0,y)=>{const p=hexCentre(q,r);return point(p.x+dx,p.z+dz,y);};
export const BALDRO_REGIONS=freeze(['West Baldro Mountains','East Baldro Mountains']);
export const BALDRO_CELLS=freeze(BALDRO_REGIONS.flatMap((name,i)=>(REGION_CELLS[name]??[])
  .map(c=>freeze({...c,region:52+i,regionName:name,climate:c.q===44&&c.r===66?'Dfc':'Dwc'}))));
const cellMap=new Map(BALDRO_CELLS.map(c=>[`${c.q},${c.r}`,c]));
const bounds=points=>freeze({minX:Math.min(...points.map(p=>p.x)),maxX:Math.max(...points.map(p=>p.x)),minZ:Math.min(...points.map(p=>p.z)),maxZ:Math.max(...points.map(p=>p.z))});
export const BALDRO_BOUNDS=bounds(BALDRO_REGIONS.flatMap(name=>REGION_OUTLINES[name]??[]).flat());
const insideBox=(b,x,z,margin=0)=>x>=b.minX-margin&&x<=b.maxX+margin&&z>=b.minZ-margin&&z<=b.maxZ+margin;
export function baldroCellAt(x,z){if(!insideBox(BALDRO_BOUNDS,x,z))return null;const h=hexAt(x,z);return cellMap.get(`${h.q},${h.r}`)??null;}
export const baldroOwns=(x,z)=>baldroCellAt(x,z)!==null;
export const baldroRegionAt=(x,z)=>baldroCellAt(x,z)?.region??null;
function segment(x,z,a,b){const dx=b.x-a.x,dz=b.z-a.z,l2=dx*dx+dz*dz,t=l2?clamp(((x-a.x)*dx+(z-a.z)*dz)/l2,0,1):0;return {distance:Math.hypot(x-a.x-t*dx,z-a.z-t*dz),t};}
// Outline the UNION so the shared West/East boundary cannot become a trench.
const union=regionOutline({origin:PLAYABLE_SURVEY.origin,regions:[{name:'Baldro',cells:BALDRO_CELLS}]},'Baldro',TRANSFORM);
const edges=union.flatMap(loop=>loop.map((a,i)=>[a,loop[(i+1)%loop.length]]));
const boundaryDistance=createHexBoundaryDistance({cells:BALDRO_CELLS,edges,cellAt:baldroCellAt,
  distanceToEdge:(x,z,[a,b])=>segment(x,z,a,b).distance});
export function baldroInset(x,z){return boundaryDistance(x,z);}
const baseAt=(x,z)=>{const m=seamlessTerrainMix(x,z);return m.base+relief(x,z,m.amp,m.wave);};
const westGate=freeze({...anchor(47,66,0,20,106),yaw:0}),eastGate=freeze({...anchor(50,69,0,20,94),yaw:0});
const westArrival=anchor(46,68,0,0,50),eastArrival=anchor(51,70,0,0,44);

function path(id,name,raw,width=9){
  let points=raw.map(p=>({...p}));
  for(let pass=0;pass<2;pass++){const next=[points[0]];for(let i=1;i<points.length;i++)for(const t of[.25,.75])next.push({x:lerp(points[i-1].x,points[i].x,t),z:lerp(points[i-1].z,points[i].z,t),y:lerp(points[i-1].y,points[i].y,t)});next.push(points.at(-1));points=next;}
  points=freeze(points.map(freeze));return freeze({id,name,kind:'natural',width,points,bounds:bounds(points)});
}
const relative=(a,dx,dz,y)=>point(a.x+dx,a.z+dz,y);
const westPath=path('west-baldro-approach','The West Hold approach',[
  westArrival,relative(westGate,-62,151,55),relative(westGate,-114,116,66),relative(westGate,-100,74,82),
  relative(westGate,-56,55,97),relative(westGate,0,49,106),relative(westGate,0,25,106),westGate,
]);
const eastPath=path('east-baldro-approach','The East Hold approach',[
  eastArrival,relative(eastGate,132,96,48),relative(eastGate,87,115,59),relative(eastGate,36,94,77),
  relative(eastGate,0,64,94),relative(eastGate,0,25,94),eastGate,
]);
// The saddle joins the two kingdoms without leveling the ridge between them.
const saddlePath=path('baldro-saddle-traverse','The Baldro saddle',[
  relative(westGate,0,25,106),relative(westGate,82,33,119),relative(westGate,153,76,135),
  anchor(48,68,0,-10,142),anchor(49,68,0,18,145),relative(eastGate,-108,-5,133),
  relative(eastGate,-63,52,109),relative(eastGate,0,64,94),
],8);
export const BALDRO_PATHS=freeze([westPath,eastPath,saddlePath]);
function task(path,index,id,name){const p=path.points[index];return freeze({id,name,x:p.x,z:p.z,y:p.y});}
export const BALDRO_KINGDOMS=freeze([
  freeze({id:'west-baldro',region:52,regionName:BALDRO_REGIONS[0],name:'West Hold',gate:westGate,arrival:westArrival,cityY:westGate.y,
    taskSites:freeze([task(westPath,5,'west-cairn-1','Lower wayfinding cairn'),task(westPath,10,'west-cairn-2','Hollow wayfinding cairn'),task(westPath,15,'west-cairn-3','Upper wayfinding cairn')])}),
  freeze({id:'east-baldro',region:53,regionName:BALDRO_REGIONS[1],name:'East Hold',gate:eastGate,arrival:eastArrival,cityY:eastGate.y,
    taskSites:freeze([task(eastPath,4,'east-sluice-1','Lower drainage sluice'),task(eastPath,9,'east-sluice-2','Woodland drainage sluice'),task(eastPath,14,'east-sluice-3','Upper drainage sluice')])}),
]);
export const BALDRO_PEAKS=freeze([
  freeze({id:'baldro-west-rock-ridge',...anchor(44,66,6,-9),height:232,along:160,across:102,angle:.31,phase:.5}),
  freeze({id:'baldro-west-high-ridge',...anchor(48,65,10,-13),height:306,along:190,across:105,angle:-.43,phase:1.7}),
  freeze({id:'baldro-north-shoulder',...anchor(50,64,-8,6),height:269,along:151,across:90,angle:.78,phase:3.2}),
  freeze({id:'baldro-east-inner-ridge',...anchor(50,68,-16,-14),height:257,along:163,across:111,angle:.47,phase:4.1}),
  freeze({id:'baldro-east-outer-ridge',...anchor(53,69,-12,-7),height:214,along:175,across:82,angle:1.16,phase:2.4}),
]);
export const BALDRO_BASINS=freeze([
  freeze({id:'west-baldro-rock-basin',...anchor(46,67,-20,-12),along:61,across:47,depth:29}),
  freeze({id:'east-baldro-wooded-basin',...anchor(51,70,-5,-8),along:95,across:63,depth:26}),
]);
const mountainSpurs=[[BALDRO_PEAKS[0],BALDRO_PEAKS[1],140,89],[BALDRO_PEAKS[1],BALDRO_PEAKS[2],186,76],[BALDRO_PEAKS[1],BALDRO_PEAKS[3],151,108],[BALDRO_PEAKS[3],BALDRO_PEAKS[4],116,83]];
function mountain(x,z){
  let y=35+9*Math.sin(x*.012+z*.006)**2+7*Math.cos(z*.013-x*.009)**2;
  for(const p of BALDRO_PEAKS){const dx=x-p.x,dz=z-p.z,co=Math.cos(p.angle),si=Math.sin(p.angle),u=(dx*co+dz*si)/p.along,v=(-dx*si+dz*co)/p.across,theta=Math.atan2(v,u);
    const r=Math.hypot(u,v)/(1+.12*Math.sin(theta*3+p.phase)+.065*Math.cos(theta*5-p.phase));
    y=Math.max(y,p.height*Math.exp(-1.24*r**1.65));}
  // Low saddles and long sloping shoulders connect unequal crowns; no repeated cones.
  for(const[a,b,top,width]of mountainSpurs){
    const s=segment(x,z,a,b);y=Math.max(y,top*(.9+.1*Math.sin(s.t*Math.PI))*Math.exp(-((s.distance/width)**1.8)));}
  for(const b of BALDRO_BASINS)y-=b.depth*Math.exp(-(((x-b.x)/b.along)**2+((z-b.z)/b.across)**2));
  return Math.max(27,y+Math.sin(x*.049+Math.sin(z*.021))*Math.cos(z*.037-x*.017)*3.5+Math.sin(x*.023-z*.027)*2.8);
}
function calculatePathSample(path,x,z){if(!insideBox(path.bounds,x,z,44))return null;let chosen=null;for(let i=1;i<path.points.length;i++){const a=path.points[i-1],b=path.points[i],s=segment(x,z,a,b);if(!chosen||s.distance<chosen.distance)chosen={distance:s.distance,y:lerp(a.y,b.y,s.t),path};}return chosen;}
const pathSample=cacheTerrainPointSamples(calculatePathSample);
export function baldroPathDistance(x,z){let nearest=Infinity;for(const p of BALDRO_PATHS){const s=pathSample(p,x,z);if(s)nearest=Math.min(nearest,s.distance);}return nearest;}
function shaped(x,z){
  let y=mountain(x,z),near=null,routeY=0,routeWeight=0;
  for(const p of BALDRO_PATHS){const s=pathSample(p,x,z);if(!s)continue;if(!near||s.distance<near.distance)near=s;
    const w=Math.exp(-((s.distance/10)**2));routeY+=s.y*w;routeWeight+=w;}
  // At a junction both approaches describe one surface. A weighted merge avoids
  // an invisible height step where nearest-path ownership changes off-centre.
  if(near&&routeWeight>0)y=lerp(y,routeY/routeWeight,1-smooth(near.path.width,near.path.width+24,near.distance));
  for(const k of BALDRO_KINGDOMS){
    const g=k.gate,dx=Math.abs(x-g.x),dz=z-g.z;
    // Only the exterior forecourt is leveled. Rock rises behind the masonry;
    // the entire subterranean hall footprint stays beneath intact mountains.
    const courtyard=(1-smooth(36,53,dx))*(1-smooth(30,45,dz))*(1-smooth(18,32,-dz));
    y=lerp(y,g.y,courtyard);
    const a=k.arrival,d=Math.hypot(x-a.x,z-a.z);y=lerp(y,a.y,1-smooth(13,32,d));
    for(const site of k.taskSites){const d=Math.hypot(x-site.x,z-site.z);y=lerp(y,site.y,(1-smooth(3,22,d))*smooth(12,18,Math.hypot(x-a.x,z-a.z)));}
  }
  return y;
}
/** The map records water on a 100 m hex edge, not a surveyed channel bank.
 * Keep those exact centre lines as mappedPoints and seat the narrow thalweg
 * at least 20 m into the owned rock bank. That leaves the neighboring country untouched
 * while giving the visible water an actual cut bed at ordinary mesh resolution. */
export const BALDRO_RIVERS=freeze(riverCourses(PLAYABLE_SURVEY,RIVER_EDGES.filter(e=>e.regions.some(n=>BALDRO_REGIONS.includes(n))),TRANSFORM).map((r,i)=>{
  const raw=r.points.slice();if(raw[0].z>raw.at(-1).z)raw.reverse();
  const fitted=raw.map(p=>{let nearest=null,distance=Infinity;for(const c of BALDRO_CELLS){if(c.region!==53)continue;const d=Math.hypot(c.x-p.x,c.z-p.z);if(d<distance){nearest=c;distance=d;}}
    let at;for(let reach=20;reach<=60;reach+=2){at={x:p.x+(nearest.x-p.x)/distance*reach,z:p.z+(nearest.z-p.z)/distance*reach};if(baldroInset(at.x,at.z)>=23)break;}return at;});
  const samples=[];for(let n=1;n<fitted.length;n++){const a=fitted[n-1],b=fitted[n],steps=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/2);for(let j=n===1?0:1;j<=steps;j++)samples.push({x:lerp(a.x,b.x,j/steps),z:lerp(a.z,b.z,j/steps)});}
  let last=Infinity;const points=freeze(samples.map(p=>{const inset=baldroInset(p.x,p.z),base=baseAt(p.x,p.z),terrain=lerp(base,shaped(p.x,p.z),smooth(0,48,inset));last=Math.min(last,terrain-1.25);return freeze({...p,y:Math.max(2,last)});}));
  return freeze({id:`baldro-border-water-${i+1}`,name:'Baldro mountain water',width:2.6,points,mappedPoints:freeze(raw.map(freeze)),bounds:bounds(points),edges:freeze(r.edges)});
}));
function waterSample(x,z){let near=null;for(const r of BALDRO_RIVERS){if(!insideBox(r.bounds,x,z,14))continue;for(let i=1;i<r.points.length;i++){const a=r.points[i-1],b=r.points[i],s=segment(x,z,a,b);if(!near||s.distance<near.distance)near={distance:s.distance,y:lerp(a.y,b.y,s.t),river:r};}}return near;}
export const baldroRiverDistance=(x,z)=>waterSample(x,z)?.distance??Infinity;
export function baldroWaterAt(x,z){if(!baldroOwns(x,z))return null;const s=waterSample(x,z);return s&&s.distance<s.river.width/2?s.y:null;}
export function baldroHeight(x,z,base){
  if(!baldroOwns(x,z))return base;
  const inset=baldroInset(x,z),route=baldroPathDistance(x,z),blend=smooth(0,lerp(28,48,smooth(12,24,route)),inset);let y=lerp(base,shaped(x,z),blend);
  const water=waterSample(x,z);if(water&&water.distance<10)y=lerp(y,Math.min(y,water.y-.7),smooth(0,3,inset)*(1-smooth(2.8,10,water.distance)));
  return y;
}
export const baldroSurfaceHeight=(x,z)=>baldroHeight(x,z,baseAt(x,z));
export const baldroSlope=(x,z)=>Math.hypot(baldroSurfaceHeight(x+1,z)-baldroSurfaceHeight(x-1,z),baldroSurfaceHeight(x,z+1)-baldroSurfaceHeight(x,z-1))/2;
export function baldroTint(x,z){
  const cell=baldroCellAt(x,z);if(!cell)return null;
  if(baldroPathDistance(x,z)<7)return '#929181';
  const h=mountain(x,z);if(h>190)return '#81847f';
  if(cell.region===52)return h>112?'#888b7d':'#7d8869';
  return h>138?'#7f8978':'#687e59';
}
