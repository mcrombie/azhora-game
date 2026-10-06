// A deliberately partial environment, centred on East Ibenwood hex (-19,110).
// Coordinates use the atlas's existing 100 m transform. No other territory is reassigned.
export const IBENWOOD = Object.freeze({ x: -3100.0019279391277, z: 375.41016151377545,
  atlas: { region: 'East Ibenwood', q: -19, r: 110 }, radius: 88,
  title: 'East Ibenwood — partial grove pilot' });
export const grovePoint = (x, z) => ({ x: IBENWOOD.x + x, z: IBENWOOD.z + z });
export const GROVE_ROUTE = [[65,42],[46,34],[30,23],[17,15],[4,8],[-7,0],[-17,-11],[-25,-25]].map(p => grovePoint(...p));
export const GROVE_LOOP = [[-7,0],[-20,7],[-36,0],[-38,-17],[-25,-25],[-17,-11]].map(p => grovePoint(...p));
export const GROVE_SPAWN = GROVE_ROUTE[0];
const PILOT_BOUNDARY=Array.from({length:48},(_,i)=>grovePoint(Math.sin(i*Math.PI/24)*88,Math.cos(i*Math.PI/24)*88));
export const IBENWOOD_REGION = Object.freeze({id:32,name:'East Ibenwood',subtitle:'Partial grove pilot — one ordinary grove',
  description:'A single inhabited-looking grove and its forest approach. The rest of East Ibenwood is not built; this is not the royal heart.',
  partial:true,spawn:GROVE_SPAWN,biome:'grove-pilot',npcIds:[],landmarks:[],
  outline:[PILOT_BOUNDARY],border:[PILOT_BOUNDARY],bounds:{minX:IBENWOOD.x-88,maxX:IBENWOOD.x+88,minZ:IBENWOOD.z-88,maxZ:IBENWOOD.z+88},
  palette:{ground:'#5c7049',accent:'#c0bb9e',fog:'#b9c7af'},
  minX:IBENWOOD.x-88,maxX:IBENWOOD.x+88,minZ:IBENWOOD.z-88,maxZ:IBENWOOD.z+88});
export const GROVE_WOOD = [[34,27],[-19,5],[-32,-20]].map((p,i) => ({ ...grovePoint(...p), id: `ibenwood-fallen-${i}`, name: 'Fallen Ibenwood branch', collected: false }));
export const GROVE_PROTECTION = 'Elven grove trees are living shelter and protected habitat. Felling living trees is forbidden here; gathering fallen branches is permitted. This grants no permission to enter other elven territory.';
export function inGrove(x,z) { return Math.hypot(x-IBENWOOD.x,z-IBENWOOD.z)<IBENWOOD.radius; }
export function groveGround(x,z,base) {
  const d=Math.hypot(x-IBENWOOD.x,z-IBENWOOD.z), t=Math.max(0,Math.min(1,(88-d)/35));
  if(!t)return base(x,z);
  const local=22+.008*(x-IBENWOOD.x)+.012*(z-IBENWOOD.z)+.3*Math.sin((x-IBENWOOD.x)/22)*Math.sin((z-IBENWOOD.z)/20);
  return base(x,z)*(1-t*t*(3-2*t))+local*t*t*(3-2*t);
}
export function routeDistance(x,z) {
  let distance=Infinity;
  for(const route of [GROVE_ROUTE,GROVE_LOOP])for(let i=1;i<route.length;i++){
    const a=route[i-1],b=route[i],dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)));
    distance=Math.min(distance,Math.hypot(x-a.x-dx*t,z-a.z-dz*t));
  }
  return distance;
}
export const GROVE_VETERANS = [
  [-21,-8,'ridgeback',28,3.1],[-39,-33,'grey-vault',34,2.8],[8,-24,'pale-witness',32,2.0],
  [30,2,'bloodoak',24,1.8],[-54,20,'deeproot',26,2.4],[48,53,'midnight-elm',24,1.6],
  [3,49,'grey-vault',30,2.5],[-61,-41,'pale-witness',31,2], [52,-31,'bloodoak',25,1.8],
].map(([x,z,species,height,radius],i)=>({...grovePoint(x,z),id:`ibenwood-veteran-${i}`,species,height,radius,age:'veteran'}));
export function groveTrees(){
  const trees=[...GROVE_VETERANS]; let seed=903021;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<330;i++){
    const x=(random()-.5)*164,z=(random()-.5)*164,p=grovePoint(x,z),size=random();
    if(Math.hypot(x,z)>80||routeDistance(p.x,p.z)<4||Math.hypot(x+24,z+13)<25||GROVE_VETERANS.some(t=>Math.hypot(t.x-p.x,t.z-p.z)<12))continue;
    if(trees.some(t=>Math.hypot(t.x-p.x,t.z-p.z)<3.8))continue;
    const sapling=(x>18&&z<-35)||size<.22;
    trees.push({...p,id:`ibenwood-growth-${i}`,species:['bloodoak','midnight-elm','pale-witness'][i%3],height:sapling?3+size*7:10+size*10,radius:sapling?.13:.35+size*.3,age:sapling?'sapling':'mature'});
  }
  return trees;
}
export const GROVE_WILDLIFE = [
  ['deer','red-deer',[[19,43],[26,49]],{hornless:true}],['boar','boar',[[-50,5],[-58,11]],{}],
  ['hares','upland-hare',[[38,-43],[42,-38]],{}],['birds','plateau-hawk',[[3,-38],[-8,34]],{air:32}],
].map(([id,species,points,options])=>({id:`ibenwood-${id}`,species,region:'East Ibenwood',habitat:'woodland',radius:.35,scale:1,
  minX:IBENWOOD.x-72,maxX:IBENWOOD.x+72,minZ:IBENWOOD.z-72,maxZ:IBENWOOD.z+72,
  sites:points.map(p=>{const a=grovePoint(...p);return[a.x,a.z];}),note:'Resident fauna of the partial grove pilot, using existing ambient habitat behavior.',...options}));
