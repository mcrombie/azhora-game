/** The drowned range: exact atlas ownership; continuous surface and quiet, hidden entrances. */
import {REGION_CELLS,REGION_OUTLINES,hexAt,hexCentre,seamlessTerrainMix,relief} from '../../../world/terrain/region-world.js';
import {createHexBoundaryDistance} from '../../../world/terrain/hex-boundary-distance.js';
const freeze=Object.freeze,clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
const lerp=(a,b,t)=>a+(b-a)*t,key=c=>`${c.q},${c.r}`;
export const WEST_OREMINDI='West Oremindi Mountains';
export const WEST_OREMINDI_CLIMATE=freeze({"-12,88": "Dwd", "-11,88": "ET", "-14,89": "Dwd", "-13,89": "Dwd", "-12,89": "Dfb", "-11,89": "ET", "-15,90": "Dwd", "-14,90": "Dwd", "-13,90": "Dfb", "-12,90": "ET", "-11,90": "EF", "-15,91": "Dwd", "-14,91": "Dfb", "-13,91": "Dfb", "-12,91": "ET", "-11,91": "EF", "-16,92": "Dwd", "-15,92": "Dfb", "-14,92": "Dfb", "-13,92": "ET", "-12,92": "EF", "-16,93": "Dwd", "-15,93": "ET", "-14,93": "ET", "-13,93": "EF", "-17,94": "Dwd", "-16,94": "ET", "-15,94": "ET", "-14,94": "EF", "-17,95": "Dwd", "-16,95": "ET", "-15,95": "EF", "-14,95": "EF", "-18,96": "Dwd", "-17,96": "Dwd", "-16,96": "EF", "-15,96": "EF", "-14,96": "EF"});
export const WEST_OREMINDI_CELLS=freeze(REGION_CELLS[WEST_OREMINDI].map(c=>freeze({...c,climate:WEST_OREMINDI_CLIMATE[key(c)]})));
const cellMap=new Map(WEST_OREMINDI_CELLS.map(c=>[key(c),c])),outlines=REGION_OUTLINES[WEST_OREMINDI],vertices=outlines.flat();
export const WEST_OREMINDI_BOUNDS=freeze({minX:Math.min(...vertices.map(p=>p.x)),maxX:Math.max(...vertices.map(p=>p.x)),minZ:Math.min(...vertices.map(p=>p.z)),maxZ:Math.max(...vertices.map(p=>p.z))});
export function westOremindiCellAt(x,z){const b=WEST_OREMINDI_BOUNDS;return x<b.minX||x>b.maxX||z<b.minZ||z>b.maxZ?null:cellMap.get(key(hexAt(x,z)))??null;}
export const westOremindiOwns=(x,z)=>!!westOremindiCellAt(x,z);
function segment(x,z,a,b){const dx=b.x-a.x,dz=b.z-a.z,t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1),0,1);return {distance:Math.hypot(x-a.x-dx*t,z-a.z-dz*t),t,y:lerp(a.y??0,b.y??0,t)};}
export const westOremindiInset=createHexBoundaryDistance({cells:WEST_OREMINDI_CELLS,edges:outlines.flatMap(loop=>loop.map((a,i)=>[a,loop[(i+1)%loop.length]])),cellAt:westOremindiCellAt,distanceToEdge:(x,z,[a,b])=>segment(x,z,a,b).distance});
export const WEST_OREMINDI_ARRIVAL=freeze({...hexCentre(-18,96)});
export const WEST_OREMINDI_PEAKS=freeze([
 {x:-3440,z:-1330,height:445,along:144,across:114,angle:.35},
 {x:-3435,z:-1070,height:472,along:188,across:121,angle:-.28},
 {x:-3530,z:-960,height:328,along:135,across:98,angle:.75},
 {x:-3368,z:-1432,height:418,along:110,across:83,angle:.1},
].map(freeze));
const route=(id,raw,width=6)=>freeze({id,width,points:freeze(raw.map(([x,z,y])=>freeze({x,z,y})))});
export const WEST_OREMINDI_PATHS=freeze([
 route('west-oremindi-south-approach',[[-3700,-789,15],[-3700,-837,24],[-3650,-924,45],[-3700,-1010,79],[-3650,-1097,103],[-3620,-1110,119],[-3570,-1150,119],[-3560,-1187,119]]),
 route('west-oremindi-coastal-traverse',[[-3700,-1010,79],[-3695,-1050,63],[-3675,-1098,39],[-3680,-1140,23],[-3705,-1180,23],[-3690,-1204,23],[-3650,-1270,48],[-3700,-1357,43],[-3650,-1443,58],[-3550,-1443,60],[-3500,-1510,30]],5),
 route('west-oremindi-high-pass',[[-3620,-1110,119],[-3580,-1040,158],[-3610,-977,184],[-3550,-913,224],[-3480,-915,251],[-3420,-958,274],[-3400,-1010,295],[-3390,-1100,260]],5),
 route('west-oremindi-upper-shelf',[[-3570,-1150,119],[-3530,-1190,147],[-3510,-1240,170],[-3550,-1280,180],[-3570,-1340,156],[-3620,-1380,114]],4),
]);
export const SEVRON_ENTRANCES=freeze([
 freeze({id:'hidden-gallery',name:'Repaired stone passage',x:-3560,z:-1187,local:{x:0,z:40},kind:'city'}),
 freeze({id:'sea-breach',name:'Breached sea works',x:-3705,z:-1180,local:{x:-29,z:22},kind:'ruin'}),
 freeze({id:'inspection-passage',name:'Old inspection stair',x:-3550,z:-1280,local:{x:45,z:8},kind:'treasury'}),
]);
export function westOremindiPathDistance(x,z){let d=Infinity;for(const path of WEST_OREMINDI_PATHS)for(let i=1;i<path.points.length;i++)d=Math.min(d,segment(x,z,path.points[i-1],path.points[i]).distance);return d;}
const baseAt=(x,z)=>{const p=seamlessTerrainMix(x,z);return p.base+relief(x,z,p.amp,p.wave);};
export function westOremindiGround(x,z,base){const original=typeof base==='function'?base(x,z):base??baseAt(x,z);if(!westOremindiOwns(x,z))return original;
 let h=42+13*Math.sin(x*.014-z*.011)**2;
 for(const [i,p] of WEST_OREMINDI_PEAKS.entries()){const dx=x-p.x,dz=z-p.z,co=Math.cos(p.angle),si=Math.sin(p.angle),u=(dx*co+dz*si)/p.along,v=(-dx*si+dz*co)/p.across,a=Math.atan2(v,u),r=Math.hypot(u,v)/(1+.08*Math.sin(a*3+i)+.055*Math.cos(a*5));h=Math.max(h,p.height*Math.exp(-1.6*r**1.63));}
 h+=5*Math.sin(x*.045+Math.sin(z*.031))*Math.cos(z*.024);
 // Incised sheltered hollow, eastern cirque and a long glacial shoulder.
 h-=35*Math.exp(-(((x+3590)/57)**2+((z+1200)/89)**2));
 h-=42*Math.exp(-(((x+3370)/48)**2+((z+1155)/53)**2));
 let nearest=null;const treadSamples=[];
 for(const path of WEST_OREMINDI_PATHS)for(let i=1;i<path.points.length;i++){const p=segment(x,z,path.points[i-1],path.points[i]);treadSamples.push(p);if(!nearest||p.distance<nearest.distance)nearest={...p,width:path.width};}
 if(nearest){let y=0,w=0;for(const p of treadSamples){const k=Math.max(0,1-(p.distance-nearest.distance)/2.5)**3;y+=p.y*k;w+=k;}nearest.y=y/w;}
 // A pass erodes a broad shoulder into the massif, rather than slicing a narrow
 // artificial trench through a peak. The final walking tread stays narrow.
 if(nearest&&nearest.distance<64)h=lerp(h,nearest.y,1-smooth(nearest.width*.5,64,nearest.distance));
 for(const e of SEVRON_ENTRANCES){const d=Math.hypot(x-e.x,z-e.z),y=e.id==='sea-breach'?23:e.id==='inspection-passage'?180:119;h=lerp(h,y,1-smooth(6,19,d));}
 const inset=westOremindiInset(x,z);let result=lerp(original,h,smooth(0,35,inset));
 // Narrow walking treads retain their grade through the broad border shoulder.
 if(nearest&&nearest.distance<14)result=lerp(result,nearest.y,(1-smooth(nearest.width*.5,14,nearest.distance))*smooth(0,10,inset));
 return result;
}
export const westOremindiWaterAt=()=>null;
export const WEST_OREMINDI_LAKES=freeze([]);
export function westOremindiFeatures(x,z,height){const c=westOremindiCellAt(x,z);if(!c)return null;const h=height??westOremindiGround(x,z),grade=Math.hypot(westOremindiGround(x+.75,z)-westOremindiGround(x-.75,z),westOremindiGround(x,z+.75)-westOremindiGround(x,z-.75))/1.5;
 const treeline=175+35*Math.sin(x*.021)*Math.cos(z*.013),snow=smooth(c.climate==='EF'?170:315,c.climate==='EF'?300:480,h)*(1-smooth(1.2,3.1,grade)*.75);
 return {height:h,grade,snow,treeline,rock:smooth(.45,1.5,grade),pathDistance:westOremindiPathDistance(x,z),shoreDistance:westOremindiInset(x,z),water:null,climate:c.climate};}
export function westOremindiTint(x,z){const f=westOremindiFeatures(x,z);return !f?null:f.snow>.55?'#dae2df':f.rock>.6?'#7c8587':f.height>280?'#969f97':f.height>160?'#828c70':'#63795a';}
export const WEST_OREMINDI_LANDMARKS=freeze([
 freeze({id:'west-oremindi-south-pass',name:'The Broken Approach',...WEST_OREMINDI_ARRIVAL,kind:'pass'}),
 freeze({id:'west-oremindi-sea-works',name:'The Breached Works',x:-3705,z:-1180,kind:'ruin'}),
 freeze({id:'west-oremindi-high-pass',name:'The High Traverse',x:-3480,z:-915,kind:'pass'}),
]);
