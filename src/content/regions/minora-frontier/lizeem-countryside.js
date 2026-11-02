// Working landscape only: the existing farming beds, cast and quest state stay
// owned by their original farmsteads. Dimensions are world metres.
const specs=[
  ['caricas-west-close','Caricas',-2151,279,34,100,'meadow',.05],
  ['caricas-town-barley','Caricas',-2038,211,72,46,'grain',-.1],
  ['caricas-high-barley','Caricas',-1960,175,62,42,'grain',.06],
  ['caricas-south-rotation','Caricas',-2057,391,82,42,'fallow',-.1],
  ['caricas-shelf-barley','Caricas',-1854,345,65,46,'grain',.05],
  ['haethom-ridge-hay','Nethereum',-2360,288,60,35,'meadow',-.16],
  ['haethom-south-close','Nethereum',-2290,401,53,52,'meadow',.04],
  ['haethom-byre-pasture','Nethereum',-2450,277,65,38,'meadow',.08],
  ['haethom-rim-barley','Nethereum',-2237,399,36,65,'grain',-.12],
  ['ninehands-eastern-strips','Nesdor',-1502,643,78,35,'grain',.04],
  ['ninehands-western-strips','Nesdor',-1640,602,27,38,'grain',-.07],
  ['ninehands-lower-hay','Nesdor',-1530,752,76,48,'meadow',.13],
  ['ninehands-river-rotation','Nesdor',-1610,721,48,36,'fallow',-.08],
  ['velsorten-east-grain','Ovesos',-1830,687,68,64,'grain',.15],
  ['velsorten-west-grain','Ovesos',-1980,681,55,60,'grain',-.22],
  ['velsorten-tail-rotation','Ovesos',-1882,779,68,40,'fallow',-.2],
  ['velsorten-head-grain','Ovesos',-1910,590,34,54,'grain',-.12],
  ['minora-north-hay','Isareos',-2400,-70,77,48,'meadow',-.09],
  ['minora-muster-pasture','Isareos',-2510,-25,76,45,'meadow',.16],
  ['amalthea-upper-hay','Isareos',-2660,-40,68,40,'meadow',-.12],
  ['amalthea-east-pasture','Isareos',-2555,40,59,36,'meadow',.15],
];
export const LIZEEM_FIELDS=Object.freeze(specs.map(([id,region,x,z,w,d,kind,yaw],index)=>Object.freeze({id,region,x,z,w,d,kind,yaw,index})));
export function fieldLocal(f,x,z){const c=Math.cos(f.yaw),s=Math.sin(f.yaw),dx=x-f.x,dz=z-f.z;return {x:dx*c-dz*s,z:dx*s+dz*c};}
export function fieldPoint(f,x,z){const c=Math.cos(f.yaw),s=Math.sin(f.yaw);return {x:f.x+x*c+z*s,z:f.z-x*s+z*c};}
export function countrysideReserved(x,z,margin=0){return LIZEEM_FIELDS.some(f=>{
  if(Math.abs(x-f.x)>f.w/2+f.d/2+margin||Math.abs(z-f.z)>f.w/2+f.d/2+margin)return false;
  const p=fieldLocal(f,x,z);return Math.abs(p.x)<f.w/2+margin&&Math.abs(p.z)<f.d/2+margin;
});}
