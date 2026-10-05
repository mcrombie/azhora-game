/** Persistent, habitat-selected homes, independent of player position or load order. */
import { NORTHERN_CELLS, NORTHERN_NAMES, NORTHERN_LAKES, northernCellAt, northernFeatures, northernWaterAt } from './northern-oremindi-world.js';
const freeze=Object.freeze;
const habitats={
  'oremindi-snowgoat':{radius:.6,minHeight:55,maxHeight:630,maxSlope:1.35},
  'red-deer':{radius:.55,minHeight:5,maxHeight:215,maxSlope:.7},
  'upland-hare':{radius:.3,minHeight:5,maxHeight:485,maxSlope:.85},
  'forest-cat':{radius:.42,minHeight:5,maxHeight:190,maxSlope:.75},
};
const result=[];
function zone(cell,species,sites,traits={}){
  const xs=sites.map(p=>p.x),zs=sites.map(p=>p.z);
  return freeze({id:`northern-${cell.q}-${cell.r}-${species}`,region:cell.region,species,keepRegion:true,scale:1,radius:.3,
    sourceCell:freeze([cell.q,cell.r]),minX:Math.min(...xs)-9,maxX:Math.max(...xs)+9,minZ:Math.min(...zs)-9,maxZ:Math.max(...zs)+9,
    ...habitats[species],sites:freeze(sites.map(p=>freeze([p.x,p.z]))),...traits});
}
for(const [index,cell] of NORTHERN_CELLS.entries()){
  if(cell.terrain==='lake'||cell.climate==='EF')continue;
  const candidates=[];
  for(let i=0;i<72;i++){
    const a=i*2.399963+cell.q*.19,r=58*Math.sqrt(i/72),x=cell.x+Math.cos(a)*r,z=cell.z+Math.sin(a)*r;
    if(northernCellAt(x,z)!==cell)continue;
    const f=northernFeatures(x,z);if(f.water!==null||f.snow>.72||f.pathDistance<9||f.shoreDistance<5)continue;
    candidates.push({x,z,...f});
  }
  const mountain=['high_mountain','mountain','highland'].includes(cell.terrain);
  const preferred=mountain?['oremindi-snowgoat','upland-hare']:index%11===0?['forest-cat','red-deer','upland-hare']:index%3===0?['upland-hare','red-deer']:['red-deer','upland-hare'];
  for(const species of preferred){
    const h=habitats[species],suitable=candidates.filter(p=>p.height>=h.minHeight&&p.height<=h.maxHeight&&p.grade<h.maxSlope*.72
      && (species!=='red-deer'||!['ET','Dwd'].includes(cell.climate))
      && [0,Math.PI/2,Math.PI,Math.PI*1.5].every(a=>{const f=northernFeatures(p.x+Math.cos(a)*3,p.z+Math.sin(a)*3);return f?.region===cell.region&&f.water===null&&f.grade<h.maxSlope;}));
    suitable.sort((a,b)=>a.grade-b.grade);
    if(!suitable.length)continue;
    const sites=[suitable[0]],second=suitable.find(p=>Math.hypot(p.x-sites[0].x,p.z-sites[0].z)>10&&Math.hypot(p.x-sites[0].x,p.z-sites[0].z)<24);
    if(second&&species!=='forest-cat'&&index%3!==0)sites.push(second);
    result.push(zone(cell,species,sites,{hornless:species==='red-deer'&&index%2===0,note:mountain?'Wild alpine animals on open rock shelves and short turf.':'Woodland-edge fauna in sheltered cold hollows.'}));break;
  }
}
for(const region of NORTHERN_NAMES){
  const cell=NORTHERN_CELLS.find(c=>c.region===region&&c.terrain!=='lake');
  result.push(zone(cell,'oremindi-mountain-eagle',[cell],{air:42,circle:24,period:25,follow:true,bob:2,minX:cell.x-50,maxX:cell.x+50,minZ:cell.z-50,maxZ:cell.z+50,note:'A solitary mountain eagle follows the real relief beneath its flight.'}));
}
const lake=NORTHERN_LAKES[0],c=northernCellAt(lake.centre.x,lake.centre.z);
result.push(zone(c,'duck',[{x:lake.centre.x-8,z:lake.centre.z},{x:lake.centre.x+8,z:lake.centre.z+2}],{float:true,radius:.24,maxSlope:3,minHeight:-Infinity,maxHeight:Infinity,note:'Ducks rest on the real elevated lake surface.'}));
export const NORTHERN_WILDLIFE_ZONES=freeze(result);
const buckets=new Map();
for(const z of result.filter(z=>!z.air&&!z.float))for(const [x,v] of z.sites){
  for(let ix=Math.floor((x-15)/24);ix<=Math.floor((x+15)/24);ix++)for(let iz=Math.floor((v-15)/24);iz<=Math.floor((v+15)/24);iz++){
    const k=`${ix},${iz}`;if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push({x,z:v});
  }
}
export const northernWildlifeClear=(x,z,r=0)=>(buckets.get(`${Math.floor(x/24)},${Math.floor(z/24)}`)??[]).some(p=>Math.hypot(x-p.x,z-p.z)<7+r);
