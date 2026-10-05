/** Stable homes chosen from habitat, never spawned around the player. */
import { ACOR_CELLS, ACOR_NAMES, ACOR_WATERS, acorCellAt, acorFeatures } from './acor-world.js';
import { thalmagarFortressReserved } from './thalmagar-fortress-site.js';
const zones=[],F=Object.freeze;
function add(c,species,sites,traits={}){
  zones.push(F({id:`acor-${c.q}-${c.r}-${species}`,region:c.region,species,keepRegion:true,scale:1,radius:.4,maxSlope:.65,minHeight:.8,
    minX:Math.min(...sites.map(p=>p.x))-10,maxX:Math.max(...sites.map(p=>p.x))+10,minZ:Math.min(...sites.map(p=>p.z))-10,maxZ:Math.max(...sites.map(p=>p.z))+10,
    sites:F(sites.map(p=>F([p.x,p.z]))),...traits}));
}
for(const [i,c] of ACOR_CELLS.entries()){
  if(c.terrain==='ocean')continue;
  const sites=[];
  for(let j=0;j<32;j++){
    const a=j*2.399963+c.q*.31,r=40*Math.sqrt((j+1)/32),x=c.x+Math.cos(a)*r,z=c.z+Math.sin(a)*r;
    if(acorCellAt(x,z)!==c||thalmagarFortressReserved(x,z,24))continue;const f=acorFeatures(x,z);
    if(f.water!==null||f.grade>.42||f.height<1.2||f.pathDistance<10||f.shoreDistance<4)continue;
    if(![0,1.57,3.14,4.71].every(a=>{const p=acorFeatures(x+Math.cos(a)*5,z+Math.sin(a)*5);return p&&p.water===null&&p.height>1&&p.grade<.6;}))continue;
    sites.push({x,z,...f});
  }
  if(!sites.length)continue;
  sites.sort((a,b)=>a.grade-b.grade);const home=sites[0],second=sites.find(p=>Math.hypot(p.x-home.x,p.z-home.z)>11);
  let species;
  if(c.region===ACOR_NAMES[0])species=home.seaDistance<48?'thalmagar-shore-elder':i%9===0?'thalmagar-hul':i%3===0?'thalmagar-long-back':'thalmagar-palmant';
  else if(c.region===ACOR_NAMES[1])species=i%3===0?'otter':i%2?'wading-bird':'egret';
  else if(c.terrain==='deep_forest')species=i%9===0?'forest-cat':i%3===0?'boar':'red-deer';
  else if(c.terrain==='forest')species=i%3===0?'boar':i%2?'red-deer':'road-fox';
  else species=i%7===0?'road-fox':i%3===0?'red-deer':'upland-hare';
  add(c,species,second&&!['forest-cat','road-fox','thalmagar-hul'].includes(species)?[home,second]:[home],{radius:species.startsWith('thalmagar')?1.1:.4,note:'Persistent wild animals in their own open habitat.'});
}
for(const name of ACOR_NAMES){const c=ACOR_CELLS.find(c=>c.region===name&&c.terrain!=='ocean');
  add(c,name===ACOR_NAMES[0]?'plateau-hawk':'harrier',[c],{air:32,circle:22,period:28,follow:true,bob:1.5});
}
for(const l of ACOR_WATERS){const c=acorCellAt(l.centre.x,l.centre.z);add(c,'duck',[{x:l.centre.x-5,z:l.centre.z},{x:l.centre.x+5,z:l.centre.z}],{float:true,radius:.24,minHeight:-Infinity,maxSlope:3});}
export const ACOR_WILDLIFE_ZONES=F(zones);
const homes=new Map();
for(const zone of zones.filter(z=>!z.air&&!z.float))for(const [x,z] of zone.sites)for(let ix=Math.floor((x-20)/32);ix<=Math.floor((x+20)/32);ix++)for(let iz=Math.floor((z-20)/32);iz<=Math.floor((z+20)/32);iz++){
  const k=`${ix},${iz}`;if(!homes.has(k))homes.set(k,[]);homes.get(k).push({x,z,r:zone.species.startsWith('thalmagar')?10:6});
}
export const acorWildlifeClear=(x,z,r=0)=>(homes.get(`${Math.floor(x/32)},${Math.floor(z/32)}`)??[]).some(p=>Math.hypot(x-p.x,z-p.z)<p.r+r);
