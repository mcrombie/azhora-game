/** Orsa's small, open timber port at the independent stream's western mouth.
 * Coordinates are relative to the existing mouth; no watercourse is rerouted. */
const F=Object.freeze,clamp=v=>Math.max(0,Math.min(1,v));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
export const ORSA_MOUTH=F({x:-1200.0019279391277,z:-4878.477288111819});
export const orsaPoint=(u,v)=>({x:ORSA_MOUTH.x+u,z:ORSA_MOUTH.z+v});
export const ORSA_TOWN=F({id:'orsa-town',name:'Orsa Town',region:'North Orsa',regions:F([84,85]),...orsaPoint(83,-28),
  description:'A Norwegian-inspired timber port across the Orsa stream: a carved stave hall, raised storehouses, fishing wharves and a bridge joining the two banks.'});
export const ORSA_FINE=F({...orsaPoint(-100,-100),w:265,d:235});
export const inOrsaFine=(x,z)=>x>ORSA_FINE.x&&x<ORSA_FINE.x+ORSA_FINE.w&&z>ORSA_FINE.z&&z<ORSA_FINE.z+ORSA_FINE.d;
export function orsaSegment(x,z,a,b){const dx=b.x-a.x,dz=b.z-a.z,t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1));return {t,distance:Math.hypot(x-a.x-t*dx,z-a.z-t*dz)};}
export function orsaTownRadius(x,z){const u=x-ORSA_MOUTH.x,v=z-ORSA_MOUTH.z;return Math.min(Math.hypot((u-67)/73,(v+26)/39),Math.hypot((u-53)/86,(v-71)/43));}
export const orsaTerraceHeight=x=>4+.086*Math.max(0,x-ORSA_MOUTH.x);
const road=ps=>F(ps.map(([u,v])=>F(orsaPoint(u,v))));
export const ORSA_LANES=F([
  road([[16,-26],[54,-23],[109,-19],[138,-14]]),road([[54,-23],[54,50],[64,65],[72,102]]),
  road([[-13,58],[22,58],[63,65],[122,70]]),road([[25,30],[24,93],[60,101]]),
]);
export function orsaLaneDistance(x,z){let d=Infinity;for(const line of ORSA_LANES)for(let i=1;i<line.length;i++)d=Math.min(d,orsaSegment(x,z,line[i-1],line[i]).distance);return d;}
function deck(id,a,b,width,y0,y1=y0){return F({id,a:F(orsaPoint(...a)),b:F(orsaPoint(...b)),width,y0,y1});}
export const ORSA_DECKS=F([
  deck('bridge',[54,-20],[54,49],6.2,8.644),
  deck('north-quay',[7,-53],[7,-12],5,3.6),deck('north-pier',[-38,-36],[7,-36],3.6,3.6),
  deck('north-ramp',[7,-26],[28,-26],4,3.6,6.408),
  deck('south-quay',[-50,30],[-50,79],5.2,3),deck('south-pier',[-82,60],[-50,60],3.6,3),
  deck('south-ramp',[-50,58],[21,58],4,3,5.806),
]);
export function orsaDeckHeight(x,z){if(!inOrsaFine(x,z))return null;let y=null;for(const d of ORSA_DECKS){const hit=orsaSegment(x,z,d.a,d.b);if(hit.distance<=d.width/2)y=Math.max(y??-Infinity,d.y0+(d.y1-d.y0)*hit.t);}return y;}
export function orsaTownReserved(x,z,r=0){return inOrsaFine(x,z)&&(orsaTownRadius(x,z)<1.1+r/65||ORSA_DECKS.some(d=>orsaSegment(x,z,d.a,d.b).distance<d.width/2+4+r));}
export function orsaTownSink(x,z){if(!inOrsaFine(x,z))return 0;const b=ORSA_FINE;return 8*smooth(0,12,Math.min(x-b.x,b.x+b.w-x,z-b.z,b.z+b.d-z));}
export function orsaTownGround(x,z,base,seaDistance){
  if(!inOrsaFine(x,z))return base;
  let y=base+(orsaTerraceHeight(x)-base)*(1-smooth(1.05,1.65,orsaTownRadius(x,z)))*smooth(0,12,seaDistance);
  // Keep the shoreline boardwalks above their graded approach instead of buried in the bank.
  for(const d of ORSA_DECKS)if(d.id!=='bridge'){const hit=orsaSegment(x,z,d.a,d.b),h=d.y0+(d.y1-d.y0)*hit.t-.24;const weight=1-smooth(d.width/2+.5,d.width/2+6,hit.distance);if(y>h)y+=(h-y)*weight;}
  // Ground meets the landward ends of the boardwalks and bridge smoothly.
  for(const d of ORSA_DECKS)if(d.id==='bridge'||d.id.endsWith('ramp'))for(const [p,h] of [[d.a,d.y0],[d.b,d.y1]]){
    const distance=Math.hypot(x-p.x,z-p.z),dx=d.b.x-d.a.x,dz=d.b.z-d.a.z,target=h+((x-p.x)*dx+(z-p.z)*dz)/(dx*dx+dz*dz)*(d.y1-d.y0);if(distance<10)y+=(target-y)*(1-smooth(3,10,distance))*smooth(0,12,seaDistance);
  }
  const b=ORSA_FINE,edge=smooth(0,18,Math.min(x-b.x,b.x+b.w-x,z-b.z,b.z+b.d-z));
  return base+(y-base)*edge;
}
