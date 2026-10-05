/** Maritime lowlands. The atlas owns their footprint, climate and forest classes;
 * relief stays low and continuous across political boundaries. */
import { REGION_CELLS, REGION_IDS, hexAt, hexCentre, TRANSFORM, SURVEY, landDistance, seamlessTerrainMix, relief } from './region-world.js';
import { regionOutline, pointInPolygon } from './region-layout.js';
import { createHexBoundaryDistance } from './hex-boundary-distance.js';
import { thalmagarFortressGround, thalmagarFortressReserved, THALMAGAR_FORTRESS_LANDMARK } from './thalmagar-fortress-site.js';
import { ACOR_CLIMATE } from './acor-climate.js';
const F=Object.freeze, clamp=(v)=>Math.max(0,Math.min(1,v));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t,key=c=>`${c.q},${c.r}`;
export const ACOR_NAMES=F(['Cape Thalmagar','Acor Wetlands','West Acorwood','South Acordwood','North Acorwood','East Acordwood','South Endevor','West Endevor','North Endevor','East Endevor']);
export const ACOR_IDS=F(ACOR_NAMES.map(n=>REGION_IDS[n]));
export const ACOR_CELLS=F(ACOR_NAMES.flatMap(region=>REGION_CELLS[region].map(c=>F({...c,region,climate:ACOR_CLIMATE[key(c)]}))));
const cells=new Map(ACOR_CELLS.map(c=>[key(c),c]));
const bounds=ps=>F({minX:Math.min(...ps.map(p=>p.x)),maxX:Math.max(...ps.map(p=>p.x)),minZ:Math.min(...ps.map(p=>p.z)),maxZ:Math.max(...ps.map(p=>p.z))});
const loops=regionOutline({origin:SURVEY.origin,regions:[{name:'maritime',cells:ACOR_CELLS.filter(c=>c.terrain!=='ocean')}]},'maritime',TRANSFORM);
export const ACOR_BOUNDS=bounds(loops.flat());
export function acorCellAt(x,z){const b=ACOR_BOUNDS;return x<b.minX||x>b.maxX||z<b.minZ||z>b.maxZ?null:cells.get(key(hexAt(x,z)))??null;}
export const acorOwns=(x,z)=>{const c=acorCellAt(x,z);return !!c&&c.terrain!=='ocean';};
export function acorSegment(x,z,a,b){const dx=b.x-a.x,dz=b.z-a.z,t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz));return {t,distance:Math.hypot(x-a.x-t*dx,z-a.z-t*dz)};}
export const acorInset=createHexBoundaryDistance({cells:ACOR_CELLS.filter(c=>c.terrain!=='ocean'),edges:loops.flatMap(l=>l.map((p,i)=>[p,l[(i+1)%l.length]])),cellAt:(x,z)=>acorOwns(x,z)?acorCellAt(x,z):null,distanceToEdge:(x,z,[a,b])=>acorSegment(x,z,a,b).distance});
const inletLoops=regionOutline({origin:SURVEY.origin,regions:[{name:'inlet',cells:ACOR_CELLS.filter(c=>c.terrain==='ocean')}]},'inlet',TRANSFORM);
const at=(q,r,dx=0,dz=0)=>{const p=hexCentre(q,r);return F({x:p.x+dx,z:p.z+dz});};
const path=(index,name,coords)=>F({id:'acor-route-'+index,name,region:ACOR_NAMES[index],points:F(coords.map(c=>at(...c)))});
export const ACOR_PATHS=F([
  path(0,'The Windward Heath',[[-3,78],[-3,79],[-4,79]]),
  path(1,'The Clay Hummocks',[[7,80],[7,81],[7,82]]),
  path(2,'The Alder Fringe',[[13,80],[13,81],[13,82]]),
  path(3,'The Mast Hollows',[[17,84],[17,85],[16,85]]),
  path(4,'The Old Acor Vault',[[20,77],[20,78],[19,79]]),
  path(5,'The Fern Valleys',[[24,79],[24,80],[23,81]]),
  path(6,'The Sedge Swales',[[13,74],[14,74],[15,74]]),
  path(7,'The Shale Heath',[[9,72],[9,73],[9,74]]),
  path(8,'The Birch Horizon',[[15,69],[16,69],[17,69]]),
  path(9,'The Eastern Grass Folds',[[20,71],[20,72],[19,73]]),
]);
export function acorPathDistance(x,z){let d=Infinity;for(const p of ACOR_PATHS)for(let i=1;i<p.points.length;i++)d=Math.min(d,acorSegment(x,z,p.points[i-1],p.points[i]).distance);return d;}
const pool=(id,name,region,q,r,rx,rz,surface=8,angle=0)=>{
  const centre=at(q,r),co=Math.cos(angle),si=Math.sin(angle);
  const shore=Array.from({length:48},(_,i)=>{const a=i*Math.PI/24,ripple=1+.08*Math.sin(a*3)+.04*Math.cos(a*5),u=Math.cos(a)*rx*ripple,v=Math.sin(a)*rz*ripple;return F({x:centre.x+u*co-v*si,z:centre.z+u*si+v*co});});
  return F({id,name,region,centre,shore:F(shore),bounds:bounds(shore),surface,depth:3.8});
};
export const ACOR_WATERS=F([
  pool('acor-long-water','The Acor Reedwater',ACOR_NAMES[1],9,80,64,154),
  pool('acor-north-water','The Velsond Fan',ACOR_NAMES[1],9,78,53,116,8,-.65),
  pool('acor-east-water','The Alder Backwater',ACOR_NAMES[1],10,81,61,90),
  pool('west-acor-black-pool','The Black Pool',ACOR_NAMES[2],14,84,25,34,10),
  pool('south-acor-mast-pool','The Mast Mirror',ACOR_NAMES[3],18,82,30,26,12),
  pool('north-acor-shade-pool','The Still Vault',ACOR_NAMES[4],22,76,26,34,12),
  pool('east-acor-fern-pool','The Fern Spring',ACOR_NAMES[5],25,78,22,35,12),
  pool('south-endevor-sedge-pool','The Sedge Mere',ACOR_NAMES[6],16,75,35,23,10),
  pool('east-endevor-rush-pool','The Rush Hollow',ACOR_NAMES[9],22,70,32,23,12),
]);
function near(l,x,z,pad=0){const b=l.bounds;return x>=b.minX-pad&&x<=b.maxX+pad&&z>=b.minZ-pad&&z<=b.maxZ+pad;}
export function acorWaterDistance(l,x,z){if(!near(l,x,z,40))return Infinity;let d=Infinity;for(let i=0;i<l.shore.length;i++)d=Math.min(d,acorSegment(x,z,l.shore[i],l.shore[(i+1)%l.shore.length]).distance);return pointInPolygon(l.shore,x,z)?-d:d;}
export function acorWaterAt(x,z){if(!acorOwns(x,z))return null;for(const l of ACOR_WATERS)if(near(l,x,z)&&pointInPolygon(l.shore,x,z))return l.surface;return null;}
const baseAt=(x,z)=>{const t=seamlessTerrainMix(x,z);return t.base+relief(x,z,t.amp,t.wave);};
function countryRelief(region,x,z){
  if(region===ACOR_NAMES[1])return 11.6+1.2*Math.sin(x*.017)*Math.cos(z*.014);
  if(region===ACOR_NAMES[6])return 14+3*Math.sin(x*.012)*Math.cos(z*.018);
  if(region===ACOR_NAMES[7])return 19+4*Math.sin(x*.017+z*.010)+2*Math.max(0,Math.sin(x*.035+z*.019))**2;
  if(region===ACOR_NAMES[8])return 18+4*Math.sin(x*.009+z*.004)*Math.cos(z*.014);
  if(region===ACOR_NAMES[9])return 20+6*Math.sin(x*.013+Math.sin(z*.011))*Math.cos(z*.008);
  return 18+5*Math.sin(x*.009+Math.sin(z*.007))*Math.cos(z*.011)+2.4*Math.sin(x*.021-z*.015);
}
export function acorGround(x,z,base=baseAt(x,z)){
  if(acorCellAt(x,z)?.terrain==='ocean'){
    let shore=Infinity;for(const l of inletLoops)for(let i=0;i<l.length;i++)shore=Math.min(shore,acorSegment(x,z,l[i],l[(i+1)%l.length]).distance);
    return mix(base,-4,smooth(0,24,shore));
  }
  if(!acorOwns(x,z))return base;
  const c=acorCellAt(x,z),inset=acorInset(x,z),sea=landDistance(x,z);
  // Long shallow swells, with small drainage folds rather than conical hills.
  let sum=0,total=0;
  for(let dq=-2;dq<=2;dq++)for(let dr=-2;dr<=2;dr++){
    const neighbour=cells.get(`${c.q+dq},${c.r+dr}`);if(!neighbour||neighbour.terrain==='ocean')continue;
    const w=Math.max(0,1-Math.hypot(neighbour.x-x,neighbour.z-z)/150)**3;if(!w)continue;
    sum+=countryRelief(neighbour.region,x,z)*w;total+=w;
  }
  let raw=sum/total;
  if(c.region===ACOR_NAMES[0])raw=22+10*Math.sin(x*.012)*Math.cos(z*.008)+3*Math.sin(x*.037+z*.017);
  let y=mix(base,raw,smooth(0,85,inset)*smooth(0,32,Math.max(0,sea)));
  for(const l of ACOR_WATERS){if(!near(l,x,z,35))continue;const d=acorWaterDistance(l,x,z);if(d>35)continue;
    const floor=d<0?l.surface-.4-l.depth*smooth(0,15,-d):mix(l.surface-.4+d*.18,y,smooth(0,35,d));
    y=Math.min(y,mix(y,floor,smooth(0,15,inset)));
  }
  return thalmagarFortressGround(x,z,y,sea);
}
export function acorFeatures(x,z,height){
  const c=acorCellAt(x,z);if(!c||c.terrain==='ocean')return null;
  const h=height??acorGround(x,z),grade=Math.hypot(acorGround(x+1,z)-acorGround(x-1,z),acorGround(x,z+1)-acorGround(x,z-1))/2;
  let shore=Infinity;for(const l of ACOR_WATERS)shore=Math.min(shore,Math.abs(acorWaterDistance(l,x,z)));
  const forest=c.terrain==='forest'||c.terrain==='deep_forest',wet=c.region===ACOR_NAMES[1];
  return {region:c.region,terrain:c.terrain,climate:c.climate,height:h,grade,forest,wet,deep:c.terrain==='deep_forest',shoreDistance:shore,seaDistance:landDistance(x,z),water:acorWaterAt(x,z),pathDistance:acorPathDistance(x,z),snow:0,treeline:500,rock:clamp((grade-.18)*2)};
}
export function acorTint(x,z){
  if(thalmagarFortressReserved(x,z))return '#696b5a';
  const c=acorCellAt(x,z);if(!c||c.terrain==='ocean')return null;
  if(acorWaterAt(x,z)!==null)return '#5b6d57';
  const stripe=Math.sin(x*.027+Math.sin(z*.019))*Math.cos(z*.021);
  const i=ACOR_NAMES.indexOf(c.region),tones=[['#929c79','#7b876b'],['#758653','#8a9070'],['#677a50','#7a885c'],['#7b8854','#687d4b'],['#5c7048','#6b8052'],['#7c925d','#708557'],['#8d9c65','#9eaa78'],['#929275','#80876b'],['#8e9d70','#9eaa7f'],['#829460','#95a170']];
  return tones[i][stripe>.1?0:1];
}
export const ACOR_LANDMARKS=F([THALMAGAR_FORTRESS_LANDMARK,...ACOR_PATHS.map(p=>F({id:p.id,name:p.name,region:p.region,...p.points[0],description:'A natural, open route through the local vegetation.'})),...ACOR_WATERS.map(l=>F({id:l.id,name:l.name,region:l.region,...l.centre,description:'Permanent water with reeds, damp margins and firm ground beyond the bank.'}))]);
export const acorProfile=region=>({name:region,id:REGION_IDS[region],index:ACOR_NAMES.indexOf(region),cells:ACOR_CELLS.filter(c=>c.region===region),bounds:bounds(regionOutline(SURVEY,region,TRANSFORM).flat()),owns:(x,z)=>acorOwns(x,z)&&acorCellAt(x,z).region===region,lakes:ACOR_WATERS.filter(l=>l.region===region)});
