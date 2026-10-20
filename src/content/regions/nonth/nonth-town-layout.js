/** The user's west-bank outline at the North Nonoth / Noth Hills river bend.
 * Nonth is the settlement's name; the existing region remains North Nonoth. */
const F=Object.freeze,clamp=v=>Math.max(0,Math.min(1,v));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
export const NONTH_CENTRE=F({x:-950.001927939128,z:-4210});
export const nonthPoint=(u,v)=>({x:NONTH_CENTRE.x+u,z:NONTH_CENTRE.z+v});
export const NONTH_TOWN=F({id:'nonth-town',name:'Nonth Town',region:'North Nonoth',regions:F([83]),...nonthPoint(-16,3),description:'A compact French-inspired market town on the west bank, with jettied timber houses, a covered market, limestone keep and working river quay.'});
export const NONTH_FINE=F({...nonthPoint(-88,-99),w:157,d:195});
export const inNonthFine=(x,z)=>x>NONTH_FINE.x&&x<NONTH_FINE.x+NONTH_FINE.w&&z>NONTH_FINE.z&&z<NONTH_FINE.z+NONTH_FINE.d;
export const nonthTownRadius=(x,z)=>Math.hypot((x-NONTH_CENTRE.x+16)/53,(z-NONTH_CENTRE.z+3)/65);
export const nonthTownLevel=(x,z)=>27+.015*(x-NONTH_CENTRE.x)+.008*(z-NONTH_CENTRE.z);
export function nonthSegment(x,z,a,b){const dx=b.x-a.x,dz=b.z-a.z,t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1));return {t,distance:Math.hypot(x-a.x-t*dx,z-a.z-t*dz)};}
const road=ps=>F(ps.map(([u,v])=>F(nonthPoint(u,v))));
export const NONTH_LANES=F([
  road([[-45,-75],[-44,-42],[-23,-18],[-23,32],[-24,68]]),
  road([[-62,-16],[-23,-16],[7,-16],[17,-16]]),
  road([[7,-24],[7,30],[5,34]]),road([[-63,34],[-23,34],[5,34]]),
  road([[-44,-12],[-44,30],[-45,57]]),
]);
export function nonthLaneDistance(x,z){let d=Infinity;for(const l of NONTH_LANES)for(let i=1;i<l.length;i++)d=Math.min(d,nonthSegment(x,z,l[i-1],l[i]).distance);return d;}
export const NONTH_MARKET=F({...nonthPoint(-8,9),w:14,d:21,h:4.3});
function deck(id,a,b,width,y0,y1=y0){return F({id,a:F(nonthPoint(...a)),b:F(nonthPoint(...b)),width,y0,y1});}
export const NONTH_DECKS=F([
  deck('quay',[35,-25],[35,11],4,26.3),deck('landing',[35,-6],[47,-6],3,26.3),
  deck('quay-ramp',[11,-16],[35,-16],3.5,27.1,26.3),
]);
export function nonthDeckHeight(x,z){if(!inNonthFine(x,z))return null;let y=null;for(const d of NONTH_DECKS){const hit=nonthSegment(x,z,d.a,d.b);if(hit.distance<=d.width/2)y=Math.max(y??-Infinity,d.y0+(d.y1-d.y0)*hit.t);}return y;}
export const nonthTownReserved=(x,z,r=0)=>inNonthFine(x,z)&&(nonthTownRadius(x,z)<1.13+r/50||nonthLaneDistance(x,z)<4+r||NONTH_DECKS.some(d=>nonthSegment(x,z,d.a,d.b).distance<d.width/2+4+r));
function edgeWeight(x,z){const b=NONTH_FINE;return smooth(0,18,Math.min(x-b.x,b.x+b.w-x,z-b.z,b.z+b.d-z));}
export const nonthTownSink=(x,z)=>inNonthFine(x,z)?7*edgeWeight(x,z):0;
export function nonthTownGround(x,z,base){
  if(!inNonthFine(x,z))return base;
  let y=base+(nonthTownLevel(x,z)-base)*(1-smooth(1.02,1.48,nonthTownRadius(x,z)));
  for(const d of NONTH_DECKS){const hit=nonthSegment(x,z,d.a,d.b),h=d.y0+(d.y1-d.y0)*hit.t-.22;if(y>h)y+=(h-y)*(1-smooth(d.width/2+.5,d.width/2+5,hit.distance));}
  const d=NONTH_DECKS.find(d=>d.id==='quay-ramp');
  for(const [p,h] of [[d.a,d.y0],[d.b,d.y1]]){
    const distance=Math.hypot(x-p.x,z-p.z),dx=d.b.x-d.a.x,dz=d.b.z-d.a.z,target=h+((x-p.x)*dx+(z-p.z)*dz)/(dx*dx+dz*dz)*(d.y1-d.y0);
    if(distance<10)y+=(target-y)*(1-smooth(3,10,distance));
  }
  return base+(y-base)*edgeWeight(x,z);
}
