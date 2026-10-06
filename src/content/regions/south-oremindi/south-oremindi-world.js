/** The southern Oremindi: an alpine spine, cirque lakes and sheltered forest feet.
 * Pure world-space geography. The atlas owns the cells and lake catchments; this
 * module owns no residents, roads or buildings. Renderers, swimmers, naturalists
 * and climbing all use these same shores and the same continuous heightfield. */
import { createHexBoundaryDistance } from '../../../world/terrain/hex-boundary-distance.js';
import { cacheTerrainPointSamples } from '../../../world/terrain/terrain-point-cache.js';
import { REGION_CELLS, REGION_OUTLINES, hexAt, hexCentre, TRANSFORM,
  seamlessTerrainMix, relief } from '../../../world/terrain/region-world.js';
import { PLAYABLE_SURVEY } from '../../../dev/tools/region-survey.js';
import { regionOutline, pointInPolygon } from '../../../world/terrain/region-layout.js';

const freeze=Object.freeze, clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const lerp=(a,b,t)=>a+(b-a)*t, key=c=>`${c.q},${c.r}`;
const point=(x,z,y)=>freeze({x,z,...(y===undefined?{}:{y})});
// Fit the alpine skyline to this atlas footprint without turning its shoulders
// into oversized columns. Lower lakes and neighboring forest levels are intact.
const altitude=y=>y<=95?y:95+(y-95)*.6;
export const SOUTH_OREMINDI='South Oremindi Mountains';
// Authored climates, from azhora.wwmap; the generated terrain survey omits these.
export const SOUTH_OREMINDI_CLIMATE=freeze({
  '-19,97':'Dwc','-18,97':'Dfb','-17,97':'ET','-16,97':'EF','-15,97':'EF','-14,97':'ET','-13,97':'ET','-12,97':'Dfc',
  '-20,98':'Dwc','-19,98':'Dwc','-18,98':'ET','-17,98':'EF','-16,98':'EF','-15,98':'ET','-14,98':'Cfb','-13,98':'Dfb','-12,98':'Dfc',
  '-20,99':'Dwc','-19,99':'Dfb','-18,99':'ET','-17,99':'ET','-16,99':'Cfb','-15,99':'Cfb','-14,99':'Dfb','-13,99':'Dfc',
  '-20,100':'Dwc','-19,100':'Dfb','-18,100':'Dfb','-17,100':'Cfb','-16,100':'Dfb','-15,100':'Dfb','-14,100':'Dfc','-13,100':'Dfc',
  '-20,101':'Dwc','-19,101':'Dwc','-18,101':'Cfb','-17,101':'Dfb','-16,101':'Dwc','-15,101':'Dwc','-14,101':'Dfa',
  '-20,102':'Dwc','-19,102':'Dwc','-18,102':'Dwc','-17,102':'Dwc','-15,102':'Dfa',
});
export const SOUTH_OREMINDI_CELLS=freeze((REGION_CELLS[SOUTH_OREMINDI]??[])
  .map(c=>freeze({...c,climate:SOUTH_OREMINDI_CLIMATE[key(c)]})));
const cellMap=new Map(SOUTH_OREMINDI_CELLS.map(c=>[key(c),c]));
const outlines=REGION_OUTLINES[SOUTH_OREMINDI]??[];
const vertices=outlines.flat();
export const SOUTH_OREMINDI_BOUNDS=freeze({
  minX:Math.min(...vertices.map(p=>p.x)),maxX:Math.max(...vertices.map(p=>p.x)),
  minZ:Math.min(...vertices.map(p=>p.z)),maxZ:Math.max(...vertices.map(p=>p.z)),
});
export function inSouthOremindiBounds(x,z) {
  const b=SOUTH_OREMINDI_BOUNDS;return x>=b.minX&&x<=b.maxX&&z>=b.minZ&&z<=b.maxZ;
}
export const southOremindiCellAt=(x,z)=>inSouthOremindiBounds(x,z)?cellMap.get(key(hexAt(x,z)))??null:null;
export const southOremindiOwns=(x,z)=>southOremindiCellAt(x,z)!==null;
function segment(x,z,a,b) {
  const dx=b.x-a.x,dz=b.z-a.z,l2=dx*dx+dz*dz;
  const t=l2?clamp(((x-a.x)*dx+(z-a.z)*dz)/l2,0,1):0;
  return {distance:Math.hypot(x-a.x-t*dx,z-a.z-t*dz),t,x:a.x+t*dx,z:a.z+t*dz};
}
const edges=outlines.flatMap(loop=>loop.map((p,i)=>[p,loop[(i+1)%loop.length]]));
/** Positive only inside the exact owned hex union. No smoothing spills into Ibenwood. */
const boundaryDistance=createHexBoundaryDistance({cells:SOUTH_OREMINDI_CELLS,edges,cellAt:southOremindiCellAt,
  distanceToEdge:(x,z,[a,b])=>segment(x,z,a,b).distance});
export function southOremindiInset(x,z) { return boundaryDistance(x,z); }
const baseAt=(x,z)=>{const mix=seamlessTerrainMix(x,z);return mix.base+relief(x,z,mix.amp,mix.wave);};
const anchor=(q,r,dx=0,dz=0)=>{const p=hexCentre(q,r);return point(p.x+dx,p.z+dz);};

// Connected lake cells form one long glacial basin. Keep the isolated southern
// tarn separate, at a lower level. No rivers are invented where none are mapped.
const neighbors=[[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]];
const lakeCells=new Map(SOUTH_OREMINDI_CELLS.filter(c=>c.terrain==='lake').map(c=>[key(c),c]));
const lakeGroups=[];
while(lakeCells.size) {
  const group=[lakeCells.values().next().value];lakeCells.delete(key(group[0]));
  for(let i=0;i<group.length;i++)for(const [dq,dr] of neighbors) {
    const k=`${group[i].q+dq},${group[i].r+dr}`,c=lakeCells.get(k);
    if(c){group.push(c);lakeCells.delete(k);}
  }
  lakeGroups.push(group);
}
lakeGroups.sort((a,b)=>b.length-a.length);
export const LAKES=freeze(lakeGroups.map((cells,i)=>{
  const centre=point(cells.reduce((n,c)=>n+c.x,0)/cells.length,cells.reduce((n,c)=>n+c.z,0)/cells.length);
  const polygon=regionOutline({origin:PLAYABLE_SURVEY.origin,regions:[{name:'basin',cells}]},'basin',TRANSFORM,{soften:2})[0];
  // A little exposed shoreline separates water from an outer country edge.
  const inset=cells.length===1?.68:.96;
  const shore=freeze(polygon.map(p=>point(lerp(centre.x,p.x,inset),lerp(centre.z,p.z,inset))));
  return freeze({id:i?'oremindi-forest-tarn':'oremindi-long-tarn',name:i?'The Forest Tarn':'The Long Tarn',
    hexes:freeze(cells.map(c=>freeze([c.q,c.r]))),centre,shore,surface:i?35:95,depth:i?9:19,
    bounds:freeze({minX:Math.min(...shore.map(p=>p.x)),maxX:Math.max(...shore.map(p=>p.x)),minZ:Math.min(...shore.map(p=>p.z)),maxZ:Math.max(...shore.map(p=>p.z))})});
}));
function lakeDistance(lake,x,z) {
  let d=Infinity;for(let i=0;i<lake.shore.length;i++)d=Math.min(d,segment(x,z,lake.shore[i],lake.shore[(i+1)%lake.shore.length]).distance);
  return pointInPolygon(lake.shore,x,z)?-d:d;
}
export function southOremindiWaterAt(x,z) {
  if(!inSouthOremindiBounds(x,z))return null;
  for(const lake of LAKES) {
    const b=lake.bounds;if(x>=b.minX&&x<=b.maxX&&z>=b.minZ&&z<=b.maxZ&&pointInPolygon(lake.shore,x,z))return lake.surface;
  }
  return null;
}

const PEAK_SHAPES=freeze([
  {id:'oremindi-southern-crown',name:'The Southern Crown',...anchor(-17,98,12,-14),height:728,along:188,across:132,angle:.38,phase:.6},
  {id:'oremindi-western-horn',name:'The Western Horn',...anchor(-19,99,45,12),height:636,along:122,across:111,angle:-.6,phase:2.2},
  {id:'oremindi-eastern-spire',name:'The Eastern Spire',...anchor(-14,99,49,-2),height:632,along:121,across:89,angle:1.1,phase:4.1},
].map(freeze));
export const PEAKS=freeze(PEAK_SHAPES.map(p=>freeze({...p,height:altitude(p.height)})));
export const SOUTH_OREMINDI_ARRIVAL=anchor(-19,102);
/** Local glacial shelves and talus toes collect thin turf. These unequal patches
 * interrupt the steep faces without imposing a repeating altitude band. */
const SHELF_SHAPES=freeze([
  freeze({id:'oremindi-western-cirque-meadow',...anchor(-19,100,7,0),height:304,along:27,across:20,angle:.35}),
  freeze({id:'oremindi-eastern-talus-shelf',...anchor(-14,100,0,-12),height:284,along:23,across:18,angle:-.5}),
]);
export const SOUTH_OREMINDI_SHELVES=freeze(SHELF_SHAPES.map(p=>freeze({...p,height:altitude(p.height)})));
function shelfSample(shelf,x,z) {
  const dx=x-shelf.x,dz=z-shelf.z,co=Math.cos(shelf.angle),si=Math.sin(shelf.angle);
  const u=dx*co+dz*si,v=-dx*si+dz*co;
  return {distance:Math.hypot(u/shelf.along,v/shelf.across),height:shelf.height+.045*u+.06*v+.16*Math.sin(u*.2)*Math.cos(v*.16)};
}
const spurs=[
  [anchor(-17,98,20,-5),anchor(-15,97,0,28),480,89],
  [anchor(-19,99),anchor(-19,100,-5,5),325,85],
  [anchor(-17,98),anchor(-18,100,-20,-20),300,77],
  [anchor(-14,99,0,5),anchor(-15,100,14,10),265,74],
  [anchor(-17,101),anchor(-17,102,0,-18),200,61],
];
function mountainHeight(x,z) {
  // Broad unequal shoulders and projecting spurs join pointed, asymmetric crowns.
  // Smooth kernels avoid repeated horizontal courses or clipped tabletop caps.
  let h=35+16*Math.sin(x*.011+z*.005)**2+13*Math.cos(z*.012-x*.008)**2;
  for(const peak of PEAK_SHAPES) {
    const co=Math.cos(peak.angle),si=Math.sin(peak.angle),dx=x-peak.x,dz=z-peak.z;
    const u=(dx*co+dz*si)/peak.along,v=(-dx*si+dz*co)/peak.across,theta=Math.atan2(v,u);
    const radius=Math.hypot(u,v)/(1+.11*Math.sin(theta*3+peak.phase)+.065*Math.cos(theta*5-peak.phase));
    const crown=peak.height*Math.exp(-1.46*radius**1.62);
    h=Math.max(h,crown);
  }
  for(const [a,b,top,width] of spurs) {
    const p=segment(x,z,a,b),endFade=1-smooth(.65,1,p.t);
    h=Math.max(h,(top*(.48+.52*endFade))*Math.exp(-((p.distance/width)**1.7)));
  }
  const rough=(Math.sin(x*.067+Math.sin(z*.023))*Math.cos(z*.048-x*.021)*3.3
    +Math.sin(x*.026-z*.039)*4.4)*smooth(100,300,h);
  // Unequal glacial hollows on the lee face: bowls, not holes with vertical rims.
  const cirque1=Math.exp(-(((x+3394)/64)**2+((z+636)/48)**2))*68;
  const cirque2=Math.exp(-(((x+3578)/54)**2+((z+510)/60)**2))*43;
  const meadow=Math.hypot((x-SOUTH_OREMINDI_ARRIVAL.x)/74,(z-SOUTH_OREMINDI_ARRIVAL.z)/56);
  const sheltered=38+(SOUTH_OREMINDI_ARRIVAL.z-z)*.2+2*Math.sin((x-SOUTH_OREMINDI_ARRIVAL.x)*.025);
  return lerp(Math.max(25,h+rough-cirque1-cirque2),sheltered,1-smooth(.25,1.65,meadow));
}

function soften(points,passes=2) {
  let out=points;
  for(let pass=0;pass<passes;pass++) {
    const next=[out[0]];
    for(let i=1;i<out.length;i++)for(const t of [.25,.75])next.push({x:lerp(out[i-1].x,out[i].x,t),y:lerp(out[i-1].y,out[i].y,t),z:lerp(out[i-1].z,out[i].z,t)});
    next.push(out.at(-1));out=next;
  }
  return out;
}
const route=(id,name,raw,width=5)=>{
  const rounded=soften(raw.map(([x,z,y])=>({x,z,y}))),runs=[0],grade=.73;
  for(let i=1;i<rounded.length;i++)runs.push(runs[i-1]+Math.hypot(rounded[i].x-rounded[i-1].x,rounded[i].z-rounded[i-1].z));
  const end=rounded.at(-1).y,total=runs.at(-1);
  for(let i=1;i<rounded.length;i++) {
    const step=grade*(runs[i]-runs[i-1]),remaining=grade*(total-runs[i]);
    rounded[i].y=clamp(rounded[i].y,Math.max(rounded[i-1].y-step,end-remaining),Math.min(rounded[i-1].y+step,end+remaining));
  }
  const points=freeze(rounded.map(p=>freeze(p)));
  return freeze({id,name,kind:'natural',width,points,bounds:freeze({minX:Math.min(...points.map(p=>p.x))-42,maxX:Math.max(...points.map(p=>p.x))+42,
    minZ:Math.min(...points.map(p=>p.z))-42,maxZ:Math.max(...points.map(p=>p.z))+42})});
};
const crownTraverse=route('oremindi-crown-traverse','The Shoulder Traverse',[
    [-3500,-317,38],[-3590,-357,76],[-3640,-410,130],[-3680,-495,193],[-3660,-588,262],
    [-3625,-687,351],[-3490,-735,445],[-3400,-708,510],[-3425,-642,550],[-3480,-605,596],
    [-3520,-620,625],
  ],6);
const crownScramble=(()=>{
  const start=crownTraverse.points.at(-1),peak=PEAKS[0],distance=Math.hypot(peak.x-start.x,peak.z-start.z),length=distance+2.5;
  const ux=(peak.x-start.x)/distance,uz=(peak.z-start.z)/distance;
  const runs=[0,4,10,16,22,28,34,41,47,54,60,length],levels=[625,625,644,644,663,663,682,682,701,701,720,720];
  const points=[];
  for(let d=0;d<length;d+=.5) {
    let i=1;while(i<runs.length-1&&runs[i]<d)i++;
    points.push(freeze({x:start.x+ux*d,z:start.z+uz*d,y:lerp(levels[i-1],levels[i],smooth(runs[i-1],runs[i],d))}));
  }
  points.push(freeze({x:start.x+ux*length,z:start.z+uz*length,y:720}));
  const rests=freeze([[0,4],[10,16],[22,28],[34,41],[47,54],[60,length]].map(([a,b])=>freeze({
    ...point(start.x+ux*(a+b)/2,start.z+uz*(a+b)/2),length:b-a})));
  return freeze({id:'oremindi-crown-scramble',name:'The Broken Crown',kind:'scramble',width:6,points:freeze(points),rests,
    bounds:freeze({minX:Math.min(...points.map(p=>p.x))-42,maxX:Math.max(...points.map(p=>p.x))+42,
      minZ:Math.min(...points.map(p=>p.z))-42,maxZ:Math.max(...points.map(p=>p.z))+42})});
})();
/** Exposed stone treads, broad cols and meadow benches, not constructed roads.
 * The final headwall has unequal local resting shelves, not global height bands. */
const PATH_SHAPES=freeze([
  crownTraverse,
  route('oremindi-tarn-approach','The Sheltered Hollow',[
    [-3300,-317,35],[-3285,-355,53],[-3298,-406,86],[-3360,-437,107],[-3373,-421,107],
  ],7),
  crownScramble,
]);
export const PATHS=freeze(PATH_SHAPES.map(p=>freeze({...p,points:freeze(p.points.map(at=>freeze({...at,y:altitude(at.y)})))})));
function calculatePathSample(path,x,z) {
  const b=path.bounds;if(x<b.minX||x>b.maxX||z<b.minZ||z>b.maxZ)return null;
  let nearest=Infinity,chosen=null;
  const samples=[];
  for(let i=1;i<path.points.length;i++) {
    const a=path.points[i-1],b=path.points[i],p=segment(x,z,a,b),y=lerp(a.y,b.y,p.t);
    samples.push({distance:p.distance,y});
    if(p.distance<nearest){nearest=p.distance;chosen={...p,y};}
  }
  if(path.kind==='scramble')return chosen;
  // Adjacent pieces agree continuously at the inside of a rounded bend. The
  // main traverse never overlaps itself; the straight headwall has one profile.
  let sum=0,total=0;
  for(const p of samples){const w=Math.max(0,1-(p.distance-nearest)/1.6)**3;sum+=p.y*w;total+=w;}
  return {...chosen,y:sum/total};
}
const pathSample=cacheTerrainPointSamples(calculatePathSample);
export function southOremindiPathDistance(x,z) {
  let d=Infinity;for(const path of PATH_SHAPES){const p=pathSample(path,x,z);if(p)d=Math.min(d,p.distance);}return d;
}
function ownedGround(x,z,base,inset) {
  const share=smooth(0,82,inset);let ground=lerp(base,mountainHeight(x,z),share);
  for(const shelf of SHELF_SHAPES) {
    const s=shelfSample(shelf,x,z);
    if(s.distance<1.8)ground=lerp(ground,s.height,(1-smooth(.72,1.8,s.distance))*smooth(0,30,inset));
  }
  let waterMargin=Infinity;
  for(const lake of LAKES) {
    const b=lake.bounds,reach=82;
    if(x<b.minX-reach||x>b.maxX+reach||z<b.minZ-reach||z>b.maxZ+reach)continue;
    const d=lakeDistance(lake,x,z);if(d>=reach)continue;
    waterMargin=Math.min(waterMargin,d);
    const bed=lake.surface-.35-lake.depth*smooth(0,23,-d);
    const shore=d<=0?bed:lerp(lake.surface-.35+d*.28,ground,smooth(0,reach,d));
    ground=lerp(ground,shore,smooth(0,16,inset));
  }
  // The narrow stone tread has its own continuous crossfall, independent of
  // the broader mountain-to-forest taper. It never extends across the border.
  const samples=[];let nearest=Infinity;
  for(const path of PATH_SHAPES) {
    const p=pathSample(path,x,z);if(!p||p.distance>=40)continue;
    samples.push({...p,width:path.width});nearest=Math.min(nearest,p.distance);
  }
  if(samples.length) {
    let y=0,total=0,width=0;
    // Each tread keeps its own level. Between distinct treads, broad shoulders
    // interpolate continuously instead of switching altitude at a Voronoi seam.
    for(const p of samples){const w=((40-p.distance)/Math.max(.01,p.distance-p.width/2))**2;y+=p.y*w;width+=p.width*w;total+=w;}
    ground=lerp(ground,y/total,(1-smooth(width/total/2,40,nearest))*smooth(0,16,inset)*smooth(0,8,waterMargin));
  }
  return ground;
}
export function southOremindiGround(x,z,base) {
  const original=typeof base==='function'?base(x,z):base??baseAt(x,z);
  if(!southOremindiOwns(x,z))return original;
  // Compress only the regional relief. Even a supplied high neighboring base
  // keeps its exact boundary value, rather than being lowered at ownership.
  return original+altitude(ownedGround(x,z,original,southOremindiInset(x,z)))-altitude(original);
}

export const LANDMARKS=freeze([
  ...PEAKS.map(p=>freeze({id:p.id,name:p.name,x:p.x,z:p.z,kind:'peak',description:p.id==='oremindi-southern-crown'
    ?'A pale crown of wind-cut snow above broken cirques and long exposed shoulders.'
    :'An unequal horn of grey stone, with scree below its ribs and snow in the sheltered clefts.'})),
  ...LAKES.map(l=>freeze({id:l.id,name:l.name,x:l.centre.x,z:l.centre.z,kind:'lake',description:l.hexes.length>1
    ?'A long cold lake follows the glacial hollow, narrowing between the feet of the mountains.'
    :'A small tarn lies behind a low moraine where the forest gives way to open hill country.'})),
  freeze({id:'oremindi-forest-foot',name:'The Forest Foot',...SOUTH_OREMINDI_ARRIVAL,kind:'pass',description:'Sheltered birch and fir give way to grass, loose stone and the long ascent.'}),
]);

/** Scenery may supply its final height to avoid repeating that query. Grade uses
 * the same analytic surface as movement; root placement should still sample the
 * rendered triangle beneath each tree. Snow is a cover fraction, not a new floor. */
export function southOremindiFeatures(x,z,height) {
  const cell=southOremindiCellAt(x,z);if(!cell)return null;
  const h=Number.isFinite(height)?height:southOremindiGround(x,z);
  const grade=Math.hypot(southOremindiGround(x+.75,z)-southOremindiGround(x-.75,z),
    southOremindiGround(x,z+.75)-southOremindiGround(x,z-.75))/1.5;
  let shoreDistance=Infinity;for(const lake of LAKES)shoreDistance=Math.min(shoreDistance,Math.abs(lakeDistance(lake,x,z)));
  const lee=.5+.5*Math.sin(x*.032+z*.022),snow=smooth(altitude(425-lee*45),altitude(620-lee*30),h)*(1-smooth(1.3,3.7,grade)*.8);
  return {region:SOUTH_OREMINDI,terrain:cell.terrain,climate:cell.climate,height:h,grade,snow,
    treeline:altitude(300+25*Math.sin(x*.012)-15*Math.cos(z*.02))+12,rock:smooth(.48,1.5,grade)*(1-snow*.7),
    pathDistance:southOremindiPathDistance(x,z),shoreDistance,water:southOremindiWaterAt(x,z),
    shelf:SOUTH_OREMINDI_SHELVES.find(s=>shelfSample(s,x,z).distance<.72)?.id??null};
}
export function southOremindiTint(x,z) {
  const f=southOremindiFeatures(x,z);if(!f)return null;
  if(f.water!==null)return '#647879';
  if(f.snow>.58)return '#e3e9e6';
  if(f.rock>.55)return '#7f888b';
  if(f.height>altitude(430))return '#a1aba8';
  if(f.height>altitude(270))return '#858f73';
  return f.shoreDistance<7?'#b2ad92':'#758562';
}
export { PEAKS as SOUTH_OREMINDI_PEAKS, PATHS as SOUTH_OREMINDI_PATHS,
  LAKES as SOUTH_OREMINDI_LAKES, LANDMARKS as SOUTH_OREMINDI_LANDMARKS };
