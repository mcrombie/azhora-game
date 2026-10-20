/** Ganun's estuary market town. North is -Z; the mouth and fork come directly
 * from the atlas. Architecture occupies the peninsula facing Ithzel. */
export const GANUN_TOWN=Object.freeze({id:'ganun-town',name:'Ganun Town',region:'South Ganun',x:1568,z:-2418,
  description:'A brick-and-timber market town at the Ganun mouth, with a tall civic tower, grain quays and houses around its river fork.'});
export const GANUN_JUNCTION=Object.freeze({x:1649.9980720608733,z:-2367.003617136947});
export const GANUN_MOUTH=Object.freeze({x:1699.998072060874,z:-2338.1361036774656});
export const GANUN_FINE=Object.freeze({x:1490,z:-2530,w:290,d:340});
const clamp=v=>Math.max(0,Math.min(1,v));
export const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
export function segmentSample(x,z,a,b){const dx=b.x-a.x,dz=b.z-a.z,t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1));return {t,distance:Math.hypot(x-a.x-dx*t,z-a.z-dz*t)};}
export function inGanunFine(x,z){const b=GANUN_FINE;return x>b.x&&x<b.x+b.w&&z>b.z&&z<b.z+b.d;}
export const inGanunTown=(x,z,pad=0)=>Math.hypot((x-1623)/(110+pad),(z+2387)/(113+pad))<1;
export function ganunTerrainSink(x,z){const b=GANUN_FINE;return inGanunFine(x,z)?8*smooth(0,12,Math.min(x-b.x,b.x+b.w-x,z-b.z,b.z+b.d-z)):0;}
export const GANUN_ROADS=Object.freeze([
  [{x:1515,z:-2410},{x:1575,z:-2410},{x:1610,z:-2410},{x:1685,z:-2410},{x:1716,z:-2390}],
  [{x:1584,z:-2498},{x:1584,z:-2450},{x:1582,z:-2410},{x:1605,z:-2382},{x:1605,z:-2308},{x:1587,z:-2288}],
  [{x:1678,z:-2461},{x:1687,z:-2437},{x:1685,z:-2410},{x:1682,z:-2380}],
  [{x:1570,z:-2320},{x:1605,z:-2320},{x:1642,z:-2320}],
]);
export function ganunRoadDistance(x,z){
  if(!inGanunFine(x,z))return Infinity;let d=Infinity;
  for(const line of GANUN_ROADS)for(let i=1;i<line.length;i++)d=Math.min(d,segmentSample(x,z,line[i-1],line[i]).distance);
  return d;
}
export const GANUN_BRIDGES=Object.freeze([
  {id:'ganun-market-bridge',x:1648,z:-2410,length:70,width:6,y:7,axis:'x'},
  {id:'ganun-grain-bridge',x:1605,z:-2346,length:68,width:5.5,y:7,axis:'z'},
]);
export const bridgePoint=(b,u,v=0)=>({x:b.x+(b.axis==='x'?u:v),z:b.z+(b.axis==='z'?u:v)});
export const GANUN_QUAYS=Object.freeze([
  {x:1636,z:-2389,w:5,d:36,y:7,highZ:-2407,lowZ:-2371,lowY:4.4},
  {x:1605,z:-2331,w:70,d:6,y:7},
  {x:1581,z:-2339,w:4,d:13,y:7},
  {x:1629,z:-2339,w:4,d:13,y:7},
]);
export function quayHeight(q,z){return q.highZ===undefined?q.y:(q.lowY??2.6)+(q.y-(q.lowY??2.6))*clamp((q.lowZ-z)/(q.lowZ-q.highZ));}
export function ganunDeckHeight(x,z){
  for(const b of GANUN_BRIDGES){const u=b.axis==='x'?x-b.x:z-b.z,v=b.axis==='x'?z-b.z:x-b.x;if(Math.abs(u)<=b.length/2&&Math.abs(v)<=b.width/2)return b.y;}
  for(const q of GANUN_QUAYS)if(Math.abs(x-q.x)<=q.w/2&&Math.abs(z-q.z)<=q.d/2)return quayHeight(q,z);
  return null;
}
export const ganunReserved=(x,z,r=0)=>inGanunTown(x,z,r+8)||ganunRoadDistance(x,z)<5+r;
export function ganunMadeGround(x,z,base,seaDistance){
  if(!inGanunFine(x,z))return base;
  const r=Math.hypot((x-1623)/110,(z+2387)/113),weight=(1-smooth(.83,1.16,r))*smooth(0,22,seaDistance);
  let y=base+(7-base)*weight;
  for(const q of GANUN_QUAYS){const d=Math.max(Math.abs(x-q.x)-q.w/2,Math.abs(z-q.z)-q.d/2,0);if(d<12)y+=(quayHeight(q,z)-y)*(1-smooth(0,12,d))*smooth(0,8,seaDistance);}
  return y;
}
/** Only these three connected courses belong to the Ganun mouth. Other rivers
 * retain their existing profile. Height increases with upstream distance. */
export function ganunRiverProfile(course){
  const points=course.points.map(p=>({...p})),near=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z)<.1;
  if(![points[0],points.at(-1)].some(p=>near(p,GANUN_JUNCTION)))return null;
  if(Math.hypot(points[0].x-GANUN_MOUTH.x,points[0].z-GANUN_MOUTH.z)>Math.hypot(points.at(-1).x-GANUN_MOUTH.x,points.at(-1).z-GANUN_MOUTH.z))points.reverse();
  let distance=near(points[0],GANUN_MOUTH)?0:Math.hypot(GANUN_MOUTH.x-GANUN_JUNCTION.x,GANUN_MOUTH.z-GANUN_JUNCTION.z);
  return {name:'Ganun River',width:8,ganun:true,points:points.map((p,i)=>{if(i)distance+=Math.hypot(p.x-points[i-1].x,p.z-points[i-1].z);return {...p,y:.06+distance*.015};})};
}
export function ganunOutletGround(x,z,base){
  if(x<1680||x>1750||z< -2360||z> -2290)return base;
  const s=segmentSample(x,z,GANUN_MOUTH,{x:1730,z:-2320});if(s.distance>18)return base;
  return Math.min(base,-1.7+(base+1.7)*smooth(7,18,s.distance));
}
