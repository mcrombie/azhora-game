/** Babon's exceptionally large reptiles are explicit lore. Monitor and
 * hornbill are working naturalist names; boar and offshore birds/dolphins are
 * ecological extensions, not invented peoples or supernatural creatures. */
import { BABON } from './babon-world.js';

const freeze=Object.freeze,zones=[];
const sites=points=>freeze(points.map(point=>freeze(point)));
function groundZone(id,species,homes,extra={}) {
  const [x,z]=homes[0];
  return freeze({id:`babon-${id}`,species,region:BABON,scale:1,keepRegion:true,habitat:'woodland',
    radius:species==='babon-giant-monitor'?1.7:.7,minX:x-58,maxX:x+58,minZ:z-58,maxZ:z+58,
    maxSlope:species==='babon-giant-monitor'?.3:.55,sites:sites(homes),...extra});
}

// Sampled against the final island ground, river channels, routes and sea.
// Keep the chosen sites as data: searching for level clearings at startup is
// needlessly expensive, and regression tests revalidate these actual homes.
const monitorHomes=[
  [-1357.958803554345,2935.110563488484],
  [-1701.9736219310553,3024.4231450126276],
  [-1725.6022444154128,3275.1199187722573],
  [-1584.2046717046533,3164.210223799186],
  [-2011.6919725477258,3219.44686083702],
];
for(const [i,home]of monitorHomes.entries())zones.push(groundZone(`giant-monitor-${i+1}`,'babon-giant-monitor',[home],{
  territorial:true,
  note:'Lore: extraordinarily large island reptiles occupy apex-predator roles. This heavy monitor watches, slowly stalks and displays within its forest territory instead of scurrying away.'}));

const boarHomes=[
  [[-1435.6022444154128,2965.1199187722573],[-1431.6022444154128,2968.1199187722573],[-1439.6022444154128,2969.1199187722573]],
  [[-1754.7589501231287,3081.849425322901],[-1750.7589501231287,3084.849425322901],[-1758.7589501231287,3085.849425322901]],
  [[-1813.7477015196039,3125.865618105964],[-1817.7477015196039,3129.865618105964]],
  [[-1539.1948083692964,3176.252344601379],[-1535.1948083692964,3179.252344601379],[-1543.1948083692964,3180.252344601379]],
];
for(const[i,homes]of boarHomes.entries())zones.push(groundZone(`forest-boar-${i+1}`,'boar',homes,{
  note:'Habitat extension: wild boar forage roots, fallen fruit and damp litter beneath the ancient canopy.'}));

for(const[i,[x,z]]of[[-1470,2930],[-1625,3090],[-1830,3200],[-1480,3215]].entries())
  zones.push(freeze({id:`babon-hornbills-${i+1}`,species:'babon-canopy-hornbill',region:BABON,radius:.3,scale:1,
    minX:x-60,maxX:x+60,minZ:z-60,maxZ:z+60,air:28,circle:25,period:19,
    follow:true,bob:1.1,keepRegion:true,sites:sites([[x,z],[x+7,z-5]]),
    note:'Ecological extension: large pale-billed canopy birds fly between old fruiting crowns, alternating deliberate wingbeats with short glides.'}));

zones.push(freeze({id:'babon-outer-reef-dolphins',species:'dolphin',region:BABON,radius:0,scale:1,
  minX:-1330,maxX:-1230,minZ:3325,maxZ:3375,sea:true,keepRegion:false,
  sites:sites([[-1310,3340],[-1280,3354],[-1255,3348]]),
  note:'Habitat extension: grey dolphins work shoals beyond the southeastern reef, in actual open water inside the playable bounds.'}));
const plungeHome={x:-2010,z:3350};
zones.push(freeze({id:'babon-reef-sea-plungers',species:'sea-plunger',region:BABON,radius:.3,scale:1,
  minX:plungeHome.x-65,maxX:plungeHome.x+65,minZ:plungeHome.z-65,maxZ:plungeHome.z+65,
  air:25,circle:27,period:20,bob:1.5,keepRegion:false,
  sites:sites(Array.from({length:4},()=>[plungeHome.x,plungeHome.z])),
  plunge:freeze({every:11,fall:1.3,under:1.8,climb:3.4}),
  note:'Habitat extension: existing sea-plungers hunt offshore reef shoals; the full dive circuit stays over the sea.'}));

export const BABON_WILDLIFE_ZONES=freeze(zones);
export const BABON_MONITOR_SHOWCASE=freeze({x:monitorHomes[0][0],z:monitorHomes[0][1]});
/** True means leave the home opening clear of trunks and solid scenery. */
export function babonWildlifeClear(x,z,margin=0) {
  return zones.some(zone=>!zone.air&&!zone.sea&&zone.sites.some(([px,pz])=>Math.hypot(x-px,z-pz)<(zone.territorial?10:4)+margin));
}
