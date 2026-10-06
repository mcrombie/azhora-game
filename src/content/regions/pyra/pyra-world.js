/** Pyra: the user's twin imperial capital, spanning the existing Vaellir. */
import { REGION_IDS } from '../../../world/terrain/region-world.js';
import { EAST_PYROS_POOLS } from '../east-pyros/east-pyros-world.js';
const C=Math.cos(Math.PI/6),S=.5;
export const PYRA=Object.freeze({x:-2940,z:1098,yaw:Math.PI/6,ground:30,bridge:38,palace:72,
  regions:[REGION_IDS['West Pyros'],REGION_IDS['East Pyros']]});
export const pyraPoint=(u,v,y=PYRA.ground)=>({x:PYRA.x+C*u+S*v,z:PYRA.z-S*u+C*v,y});
export const pyraLocal=(x,z)=>({u:(x-PYRA.x)*C-(z-PYRA.z)*S,v:(x-PYRA.x)*S+(z-PYRA.z)*C});
const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
export function pyraClear(x,z,margin=0){if(Math.abs(x-PYRA.x)>260+margin||Math.abs(z-PYRA.z)>240+margin)return false;const {u,v}=pyraLocal(x,z);return Math.abs(u)<182+margin&&Math.abs(v)<132+margin;}
export function pyraGround(x,z,incoming){
  if(!pyraClear(x,z,30))return incoming;
  const {u,v}=pyraLocal(x,z),a=Math.abs(u);
  // Keep the river bed and water profile intact; the quays begin beyond it.
  const springWeight=EAST_PYROS_POOLS.reduce((w,p)=>w*smooth(p.radius*1.4,p.radius*1.75,Math.hypot(x-p.x,z-p.z)),1);
  const weight=springWeight*smooth(18,28,a)*(1-smooth(153,207,a))*(1-smooth(100,157,Math.abs(v)));
  return incoming+(PYRA.ground-incoming)*weight;
}
export function pyraTint(x,z){if(!pyraClear(x,z))return null;const {u,v}=pyraLocal(x,z);if(Math.abs(u)<23)return null;return Math.abs(u)<145&&Math.abs(v)<96?0xc2ad73:0x929859;}
export const PYRA_GROUND_BOUNDS=Object.freeze({minX:-3215,maxX:-2665,minZ:842,maxZ:1354});
export function pyraGroundPatchWeight(x,z){const {u,v}=pyraLocal(x,z);return (1-smooth(215,230,Math.abs(u)))*(1-smooth(165,180,Math.abs(v)));}
export function pyraTerrainSink(x,z){if(Math.abs(x-PYRA.x)>275||Math.abs(z-PYRA.z)>256)return 0;const {u,v}=pyraLocal(x,z);return 4*(1-smooth(205,215,Math.abs(u)))*(1-smooth(155,165,Math.abs(v)));}
export const PYRA_ARRIVAL=pyraPoint(-142,0);
export const PYRA_SPIRAL=Object.freeze(Array.from({length:161},(_,i)=>{
 const a=i/160*Math.PI*4;return pyraPoint(10*Math.cos(a),8+10*Math.sin(a),PYRA.bridge+(PYRA.palace-PYRA.bridge)*i/160);
}));
const mark=(id,name,u,v,radius,description)=>({id,name,...pyraPoint(u,v),radius,region:u<0?PYRA.regions[0]:PYRA.regions[1],description});
export const PYRA_LANDMARKS=Object.freeze([
 mark('pyra','Pyra — the golden twin city',-115,0,160,'One imperial city in two regions: East Pyra and West Pyra, united across the Vaellir beneath the suspended golden palace.'),
 mark('west-pyra','West Pyra',-81,-45,38,'The older administrative half of Pyra. Golden local masonry encloses courts, records halls and residential lanes.'),
 mark('east-pyra','East Pyra',81,45,38,'Markets, granaries and river warehouses serve the fertile lands on both banks and trade downriver to the sea.'),
 mark('pyra-golden-bridge','The golden bridge',-87,-16,18,'A monumental golden bridge joins the two halves of one city. Its central channel remains open to river traffic.'),
 mark('pyra-palace','The Emperor’s suspended palace',95,0,14,'An immaculate golden palace is drawn toward the clouds by sorcery. A spiral stair ascends from the bridge. The centuries-old emperor is worshipped as a god-king; outsiders dispute his divinity.'),
 mark('pyra-quays','The imperial river quays',-33,54,18,'River cargo and produce pass through the heart of the capital. The diminished empire retains West and East Pyros and outlying fortifications; Naresh and Hama have regained independence, while rising Ambrone has taken eastern provinces.'),
]);
const view=(eye,target)=>({eye:pyraPoint(...eye),target:pyraPoint(...target)});
export const PYRA_VIEWS=Object.freeze({
 pyra:view([245,270,190],[0,0,49]),
 'pyra-bridge':view([-64,57,43],[0,-10,71]),
 'pyra-palace':view([85,85,104],[0,-22,81]),
 'pyra-market':view([132,69,37],[63,28,42]),
 'pyra-stair':view([29,35,53],[0,8,57]),
});
