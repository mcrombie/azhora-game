/** Tolgufeld's paired capital sites, in atlas world metres (north is -Z).
 * Stonefist occupies the small northwestern circle; the unwalled town occupies
 * the river bend southeast of it. No renderer or terrain dependency. */
const F=Object.freeze, clamp=v=>Math.max(0,Math.min(1,v));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
export const LOND_REGIONS=F(['North Lond','West Lond','Central Lond','East Lond','South Lond']);
export const STONEFIST=F({id:'stonefist',name:'Stonefist',region:'Central Lond',x:-160,z:-3385,
  description:'The natural rock citadel and royal seat of Tolgufeld, High Kingdom of the Crefs.'});
export const LOND_TOWN=F({id:'lond-town',name:'Lond Town',region:'Central Lond',x:24,z:-3246,
  description:'An unwalled river town sheltered by Stonefist, with German-inspired timber frames, steep tiled gables, a brick guildhall and river markets.'});
export const LOND_LANDMARKS=F([STONEFIST,LOND_TOWN]);
export const stonePoint=(x,z)=>({x:STONEFIST.x+x,z:STONEFIST.z+z});
export const STONEFIST_OUTLINE=F(Array.from({length:40},(_,i)=>{
  const a=i*Math.PI/20,r=53*(1+.085*Math.cos(a*5)+.055*Math.sin(a*3));return F(stonePoint(Math.cos(a)*r,Math.sin(a)*r));
}));
// A winding, walkable ascent cut into the natural rock, rather than a straight
// stair disappearing through a solid mountain. Heights are shared by scenery
// and the movement surface; roughly one in five throughout the climb.
export const STONEFIST_ASCENT=F(Array.from({length:100},(_,i)=>{
  const t=i/99,a=.85+t*Math.PI*3.35,r=57-40*t;
  return F({...stonePoint(Math.cos(a)*r,Math.sin(a)*r),y:26+70*t});
}));
export const LOND_ROADS=F([
  F([STONEFIST_ASCENT[0],{x:-111,z:-3317},{x:-71,z:-3294},{x:-21,z:-3270},{x:15,z:-3262}].map(F)),
  F([{x:18,z:-3320},{x:16,z:-3288},{x:16,z:-3262},{x:-2,z:-3238},{x:-30,z:-3215},{x:-35,z:-3163}].map(F)),
  F([{x:85,z:-3320},{x:84,z:-3287},{x:84,z:-3262},{x:76,z:-3235},{x:44,z:-3195},{x:39,z:-3157}].map(F)),
]);
export function segmentSample(x,z,a,b){const dx=b.x-a.x,dz=b.z-a.z,t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1));return {t,distance:Math.hypot(x-a.x-dx*t,z-a.z-dz*t)};}
export function pathSample(x,z,points){let best={distance:Infinity};for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],s=segmentSample(x,z,a,b);if(s.distance<best.distance)best={...s,y:a.y+(b.y-a.y)*s.t,index:i};}return best;}
export function londRoadDistance(x,z){if(x< -230||x>110||z< -3460||z> -3140)return Infinity;return Math.min(...LOND_ROADS.map(p=>pathSample(x,z,p).distance));}
export const inLondTown=(x,z,margin=0)=>Math.hypot((x-27)/(91+margin),(z+3244)/(96+margin))<1;
export const inStonefist=(x,z,margin=0)=>Math.hypot(x-STONEFIST.x,z-STONEFIST.z)<72+margin;
/** The fine rock mesh replaces the coarse terrain, which must stay below it. */
export const stonefistTerrainSink=(x,z)=>inStonefist(x,z)?145*(1-smooth(58,72,Math.hypot(x-STONEFIST.x,z-STONEFIST.z))):0;
export function londSettlementReserved(x,z,r=0){return inStonefist(x,z,r)||inLondTown(x,z,r)||londRoadDistance(x,z)<5+r;}
export function londGround(x,z,base){
  if(!inStonefist(x,z))return base;
  const dx=x-STONEFIST.x,dz=z-STONEFIST.z,a=Math.atan2(dz,dx);
  const radius=53*(1+.085*Math.cos(a*5)+.055*Math.sin(a*3)),r=Math.hypot(dx,dz)/radius;
  // Broad fractured shoulders, a high central crown and five natural northern
  // fins. Human construction rests on this rock; the rock remains dominant.
  let h=base+(49-base)*(1-smooth(.76,1.10,r));
  h+=(72-49)*(1-smooth(.55,.64,r));
  h+=(96-72)*(1-smooth(.30,.39,r));
  for(const [cx,cz,top,rx,rz] of [[-29,-21,105,8,12],[-17,-30,123,7,12],[0,-33,137,8,13],[17,-29,121,7,12],[29,-20,106,8,12]]){
    const d=Math.hypot((dx-cx)/rx,(dz-cz)/rz);h=Math.max(h,base+(top-base)*(1-smooth(.12,1.25,d)));
  }
  const path=pathSample(x,z,STONEFIST_ASCENT);
  if(path.distance<5.8)h=h+(path.y-h)*(1-smooth(2.7,5.8,path.distance));
  return h;
}
// Three genuinely traversable crossings: two over the main river and a smaller
// bridge over its western tributary. Approaches slope down to ordinary ground.
export const LOND_BRIDGES=F([
  F({id:'lond-high-bridge',x:50,z:-3262,y:23.2,length:69,width:7.2,axis:'x',startY:21.7,endY:20.1}),
  F({id:'lond-market-bridge',x:0,z:-3188,y:25.3,length:70,width:6.4,axis:'x',startY:22.77,endY:21.09}),
  F({id:'lond-mill-bridge',x:-32,z:-3218,y:26,length:44,width:4.6,axis:'z',startY:21.1,endY:22.45}),
]);
export function bridgePoint(b,u,v=0){return {x:b.x+(b.axis==='x'?u:v),z:b.z+(b.axis==='z'?u:v)};}
export function bridgeHeight(b,u){const end=u<0?b.startY:b.endY;return end+(b.y-end)*clamp((b.length/2-Math.abs(u))/12);}
export function londDeckHeight(x,z){for(const b of LOND_BRIDGES){const u=b.axis==='x'?x-b.x:z-b.z,v=b.axis==='x'?z-b.z:x-b.x;if(Math.abs(u)<=b.length/2&&Math.abs(v)<b.width/2)return bridgeHeight(b,u);}return null;}
