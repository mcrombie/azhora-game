/** Endevor's river-mouth port. Its open streets, bridge and quays are shared by
 * exploration collision and the city review. East Endevor has no town plots. */
import {smooth,endevorRiverSample,endevorChannelGround} from './endevor-river.js';
export { ENDEVOR_TOWN } from './endevor-site.js';
export const ENDEVOR_FINE=Object.freeze({x:-2260,z:-3340,w:280,d:260});
export function inEndevorFine(x,z){const b=ENDEVOR_FINE;return x>b.x&&x<b.x+b.w&&z>b.z&&z<b.z+b.d;}
export function endevorTerrainSink(x,z){const b=ENDEVOR_FINE;return inEndevorFine(x,z)?8*smooth(0,12,Math.min(x-b.x,b.x+b.w-x,z-b.z,b.z+b.d-z)):0;}
export const inEndevorTown=(x,z,pad=0)=>Math.hypot((x+2140)/(99+pad),(z+3244)/(76+pad))<1;
export const ENDEVOR_ROADS=Object.freeze([
  [{x:-2227,z:-3258},{x:-2180,z:-3258},{x:-2120,z:-3258},{x:-2094,z:-3258},{x:-2051,z:-3263}],
  [{x:-2167,z:-3280},{x:-2176,z:-3258},{x:-2167,z:-3232},{x:-2150,z:-3200},{x:-2141,z:-3161},{x:-2170,z:-3087}],
  [{x:-2128,z:-3278},{x:-2124,z:-3258},{x:-2118,z:-3238},{x:-2100,z:-3210},{x:-2075,z:-3180},{x:-2025,z:-3115}],
]);
export function endevorRoadDistance(x,z){
  if(x< -2250||x> -1990||z< -3300||z> -3060)return Infinity;
  let d=Infinity;for(const line of ENDEVOR_ROADS)for(let i=1;i<line.length;i++){
    const a=line[i-1],b=line[i],dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)));
    d=Math.min(d,Math.hypot(x-a.x-t*dx,z-a.z-t*dz));
  }return d;
}
export const ENDEVOR_BRIDGE=Object.freeze({x:-2150,z:-3258,length:64,width:6,y:6.5});
export const ENDEVOR_QUAYS=Object.freeze([
  {x:-2165,z:-3273,w:5,d:32,y:6.5,ramp:true},{x:-2135,z:-3273,w:5,d:32,y:6.5,ramp:true},
  {x:-2173,z:-3290,w:21,d:4,y:3.4},{x:-2126,z:-3290,w:21,d:4,y:3.4},
]);
export const endevorQuayHeight=(q,z)=>q.ramp?3.4+3.1*Math.max(0,Math.min(1,(z-(q.z-q.d/2))/q.d)):q.y;
export function endevorDeckHeight(x,z){
  const b=ENDEVOR_BRIDGE;
  if(Math.abs(x-b.x)<=b.length/2&&Math.abs(z-b.z)<=b.width/2)return b.y;
  for(const q of ENDEVOR_QUAYS)if(Math.abs(x-q.x)<=q.w/2&&Math.abs(z-q.z)<=q.d/2)return endevorQuayHeight(q,z);
  return null;
}
export function endevorTownGround(x,z,base,seaDistance){
  if(x< -2270||x> -1990||z< -3350||z> -3130)return endevorChannelGround(x,z,base);
  if(inEndevorTown(x,z,18)){
    const r=Math.hypot((x+2140)/99,(z+3244)/76),weight=(1-smooth(.82,1.15,r))*smooth(1,18,seaDistance);
    base+=(6.5-base)*weight;
    // Sloping waterside lanes connect the low landing stages to the bridge.
    for(const q of ENDEVOR_QUAYS){const d=Math.max(Math.abs(x-q.x)-q.w/2,Math.abs(z-q.z)-q.d/2,0);if(d<8)base+=(endevorQuayHeight(q,z)-base)*(1-smooth(0,8,d))*smooth(1,6,seaDistance);}
  }
  // The two civic buildings stand on modest made-ground terraces.
  for(const [cx,cz,w,d] of [[-2088,-3243,15,25],[-2080,-3208,14,25]]){
    const edge=Math.max(Math.abs(x-cx)-w/2,Math.abs(z-cz)-d/2,0);
    if(edge<7)base+=(6.5-base)*(1-smooth(0,7,edge));
  }
  return endevorChannelGround(x,z,base);
}
export const endevorSettlementReserved=(x,z,r=0)=>inEndevorTown(x,z,r+5)||endevorRoadDistance(x,z)<4+r;
export const endevorDry=(x,z,r=0)=>(endevorRiverSample(x,z)?.distance??Infinity)>r;
