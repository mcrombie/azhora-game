/** Persistent homes selected from local habitat, never a ring spawned around the player. */
import { OUTER_CELLS, OUTER_NAMES, outerCellAt, outerFeatures, outerProfile } from './outer-regions-world.js';
import { landDistance } from './region-world.js';
const zones=[],F=Object.freeze;
function add(c,species,sites,traits={}){
  zones.push(F({id:`outer-${c.q}-${c.r}-${species}`,region:c.region,species,keepRegion:true,scale:1,radius:.4,minHeight:1,maxSlope:.65,
    minX:Math.min(...sites.map(p=>p.x))-12,maxX:Math.max(...sites.map(p=>p.x))+12,minZ:Math.min(...sites.map(p=>p.z))-12,maxZ:Math.max(...sites.map(p=>p.z))+12,
    sites:F(sites.map(p=>F([p.x,p.z]))),...traits}));
}
for(const [i,c] of OUTER_CELLS.entries()){
  if(c.terrain==='ocean'||c.terrain==='lake')continue;
  const sites=[];
  for(let j=0;j<12;j++){
    const a=j*2.399963+c.q*.13,r=37*Math.sqrt((j+1)/12),x=c.x+Math.cos(a)*r,z=c.z+Math.sin(a)*r;
    if(outerCellAt(x,z)!==c)continue;const f=outerFeatures(x,z);
    if(f.water!==null||f.grade>.48||f.height<2||f.pathDistance<10||f.shoreDistance<5)continue;
    sites.push({x,z,...f});
  }
  if(!sites.length)continue;
  sites.sort((a,b)=>c.profile.kind==='plateau'?(b.shelter-a.shelter)||a.grade-b.grade:a.grade-b.grade);const home=sites[0],other=sites.find(p=>Math.hypot(p.x-home.x,p.z-home.z)>12),p=c.profile;
  let species=p.fauna[i%p.fauna.length];
  if(p.kind==='plateau'){
    // Long-Backs browse lee-side dwarf groves; Palmants only visit lower margins.
    species=home.shelter>.58&&home.height>85?'thalmagar-long-back':home.height<70&&i%5===0?'thalmagar-palmant':p.fauna[i%p.fauna.length];
  }
  if(p.kind!=='plateau'&&home.shoreDistance<15&&home.height<60)species=i%2?'wading-bird':'otter';
  if(home.height>100&&p.kind==='alpine')species='oremindi-snowgoat';
  const herd=['red-deer','frostback','thalmagar-palmant','thalmagar-long-back'].includes(species);
  add(c,species,herd&&other?[home,other]:[home],{radius:species==='frostback'?1.1:species.startsWith('thalmagar')?.9:.4,scale:p.kind==='dark'&&species==='boar'?1.18:1,note:'Wild '+p.kind+' habitat; permanent home and ordinary movement.'});
}
for(const name of OUTER_NAMES){
  const p=outerProfile(name),c=p.anchor;
  const bird=['ice','island','warm-island','karst'].includes(p.kind)?'gull':['alpine','plateau'].includes(p.kind)?'plateau-hawk':'harrier';
  add(c,bird,[{x:c.x+20,z:c.z+15}],{air:Math.max(28,p.height*.35),circle:25,period:30,follow:true,bob:1.2});
}
// Sheltered offshore ranges stay wholly over water, even while swimming.
for(const name of OUTER_NAMES){const p=outerProfile(name);if(!['ice','island','warm-island','karst'].includes(p.kind))continue;
  const homes=[];
  for(const c of p.cells){for(let i=0;i<8;i++){const a=i*Math.PI/4,x=c.x+Math.cos(a)*90,z=c.z+Math.sin(a)*90;
    if(landDistance(x,z)>-20||![[-15,-15],[-15,15],[15,-15],[15,15]].every(([dx,dz])=>landDistance(x+dx,z+dz)<-8))continue;
    if(homes.some(h=>Math.hypot(h.x-x,h.z-z)<150))continue;homes.push({x,z});
    add({...c,q:c.q+'sea'+i},['ice','island'].includes(p.kind)?'grey-seal':'dolphin',[{x,z}],{sea:true,keepRegion:false,radius:0,minHeight:-Infinity,maxSlope:Infinity});
    if(homes.length>=3)break;
  }if(homes.length>=3)break;}
}
export const OUTER_WILDLIFE_ZONES=F(zones);
const homes=new Map();
for(const z of zones.filter(z=>!z.air&&!z.sea))for(const [x,y] of z.sites){
  const r=z.species==='frostback'||z.species.startsWith('thalmagar')?9:6;
  for(let i=Math.floor((x-r-12)/40);i<=Math.floor((x+r+12)/40);i++)for(let j=Math.floor((y-r-12)/40);j<=Math.floor((y+r+12)/40);j++){
    const k=`${i},${j}`;if(!homes.has(k))homes.set(k,[]);homes.get(k).push({x,z:y,r});
  }
}
export const outerWildlifeClear=(x,z,r=0)=>(homes.get(`${Math.floor(x/40)},${Math.floor(z/40)}`)??[]).some(p=>Math.hypot(p.x-x,p.z-z)<p.r+r);
