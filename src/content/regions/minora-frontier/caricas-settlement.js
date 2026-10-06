/** The occupied province's market town. The river-fox corridor remains woodland;
 * the new settlement and fields use the already open western shelf. */
const freeze = Object.freeze;
const p = (x, z) => freeze({x,z});
export const CARICAS_TOWN = freeze({id:'caricas-garrison-town',name:'Caricas market town',region:'Caricas',x:-2092,z:265,
  arrival:p(-2092,231),radius:57,description:'A working market town under Ambroni occupation. Red standards hang over the grain court; the province’s civil-war story is still to come.'});
export const CARICAS_BUILDINGS = freeze([
  ['granary',-2115,254,15,12,8,'granary'],['watch-house',-2068,240,14,14,7.8,'barracks'],
  ['west-house',-2120,281,11,10,6.7,'house'],['east-house',-2068,279,12,10,6.4,'house'],
  ['south-house',-2117,304,12,11,5.8,'house'],['east-store',-2069,302,13,11,5.6,'store'],
  ['north-house',-2120,229,10,10,5.6,'house'],['workshop',-2091,314,15,9,5.4,'workshop'],
].map(([id,x,z,w,d,h,kind])=>freeze({id:`caricas-${id}`,x,z,w,d,h,kind})));
export const CARICAS_ROADS = freeze([
  freeze({id:'menora-caricas-road',width:5,points:freeze([p(-2168,135),p(-2148,135),p(-2129,194),p(-2108,216),p(-2092,235),p(-2092,302)])}),
  freeze({id:'caricas-farm-road',width:3.2,points:freeze([p(-2092,302),p(-2080,302),p(-2080,328),p(-2089,336),p(-2070,351),p(-2020,352),p(-1980,349),p(-1950,315),p(-1950,270)])}),
  freeze({id:'caricas-high-fields-road',width:2.8,points:freeze([p(-2087,263),p(-2020,264),p(-1980,251),p(-1942,220),p(-1910,220)])}),
]);
export const CARICAS_GUARD_POSTS = freeze([
  p(-2097,232),p(-2087,232),p(-2080,245),p(-2080,252),p(-2105,263),p(-2099,293),p(-2085,301),p(-2107,247),
]);
export function distanceToFrontierPath(points,x,z){let best=Infinity;for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1)));
  best=Math.min(best,Math.hypot(x-a.x-t*dx,z-a.z-t*dz));}return best;}
export function caricasSettlementReserved(x,z,margin=0){
  if(Math.hypot(x-CARICAS_TOWN.x,z-CARICAS_TOWN.z)<57+margin)return true;
  return CARICAS_ROADS.some(r=>distanceToFrontierPath(r.points,x,z)<r.width/2+margin+1);
}
/** Small individual building pads, never a province-wide flattening. */
export function caricasSettlementGround(x,z,base,sample){
  if(Math.abs(x-CARICAS_TOWN.x)>60||Math.abs(z-CARICAS_TOWN.z)>70)return base;
  for(const b of CARICAS_BUILDINGS){const d=Math.max(Math.abs(x-b.x)-b.w/2-1.4,Math.abs(z-b.z)-b.d/2-1.4);
    if(d>=5)continue;const t=Math.max(0,d)/5,w=1-t*t*(3-2*t);return base+(sample(b.x,b.z)-base)*w;}
  return base;
}
