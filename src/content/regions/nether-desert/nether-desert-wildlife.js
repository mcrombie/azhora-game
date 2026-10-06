/** Sparse persistent animals of the stony plateau, concentrated where wash
 * vegetation and fractured-rock shelter make a living possible. These ranges
 * extend existing Azhora fauna; the Nether lore names no endemic species. */
import { NETHER_DESERT, NETHER_DESERT_CELLS, netherDesertCellAt, netherDesertFeatures,
  netherDesertOwns } from './nether-desert-world.js';

const freeze=Object.freeze;
const result=[];
function zone(id,species,sites,extra={}) {
  const cx=sites.reduce((n,p)=>n+p.x,0)/sites.length,cz=sites.reduce((n,p)=>n+p.z,0)/sites.length;
  return freeze({id:`nether-${id}`,species,region:NETHER_DESERT,radius:species==='canyon-tortoise'?.42:.3,scale:1,
    keepRegion:true,habitat:'dry-plateau',minX:cx-35,maxX:cx+35,minZ:cz-35,maxZ:cz+35,
    minHeight:5,maxHeight:55,maxSlope:.6,sites:freeze(sites.map(p=>freeze([p.x,p.z]))),...extra});
}
function candidates(cell) {
  const points=[];
  for(let i=0;i<90;i++) {
    const a=i*2.39996323+cell.q*.17,r=42*Math.sqrt(i/90),x=cell.x+Math.cos(a)*r,z=cell.z+Math.sin(a)*r;
    const c=netherDesertCellAt(x,z);if(c?.q!==cell.q||c?.r!==cell.r)continue;
    const f=netherDesertFeatures(x,z);
    if(f.inset<12||f.riverDistance<20||f.grade>.5||f.pan>.5)continue;
    points.push({x,z,...f});
  }
  return points;
}
const homes=[
  {q:-18,r:112,species:'spine-lizard',count:2},
  {q:-16,r:113,species:'spine-lizard',count:2},
  {q:-20,r:115,species:'spine-lizard',count:1},
  {q:-17,r:115,species:'spine-lizard',count:2},
  {q:-17,r:113,species:'upland-hare',count:2},
  {q:-14,r:113,species:'upland-hare',count:1},
  {q:-19,r:114,species:'canyon-tortoise',count:1},
  {q:-16,r:114,species:'canyon-tortoise',count:1},
];
for(const h of homes) {
  const c=NETHER_DESERT_CELLS.find(c=>c.q===h.q&&c.r===h.r);if(!c)continue;
  const choices=candidates(c).filter(p=>h.species==='spine-lizard'||p.washDistance<24);
  choices.sort((a,b)=>h.species==='spine-lizard'?b.shelf-a.shelf||a.grade-b.grade:a.washDistance-b.washDistance);
  const sites=[];
  for(const p of choices){if(sites.every(s=>Math.hypot(p.x-s.x,p.z-s.z)>9))sites.push(p);if(sites.length>=h.count)break;}
  if(sites.length)result.push(zone(`${h.q}-${h.r}-${h.species}`,h.species,sites,{sourceCell:freeze([c.q,c.r]),
    note:h.species==='spine-lizard'?'Extension: spine lizards bask beside fractured rock and dart for cover.'
      :h.species==='upland-hare'?'Extension of the adjacent Neth upland hare, using sparse scrub beside the dry wash.'
        :'Extension: a solitary canyon tortoise browses the seasonal-wash vegetation; no permanent water is invented.'}));
}
const bird={x:-2742,z:693},circle=35;
if(Array.from({length:40},(_,i)=>i*Math.PI/20).every(a=>netherDesertOwns(bird.x+Math.sin(a)*circle,bird.z+Math.cos(a)*circle)))
  result.push(zone('plateau-bone-bird','bone-bird',[bird],{air:30,circle,period:32,follow:true,bob:1.3,
    note:'Extension: one desert-margin scavenger circles high over the bare plateau.'}));
export const NETHER_DESERT_WILDLIFE_ZONES=freeze(result);

