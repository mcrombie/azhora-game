/** Inland Thoth, centred on the marked bend between North and Central Thoth.
 * Layout is pure data so terrain, movement, streaming and the atlas agree. */
const F=Object.freeze,clamp=v=>Math.max(0,Math.min(1,v));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
export const THOTH_CENTRE=F({x:-455.001927939128,z:-4784.657869368505});
export const thothPoint=(u,v)=>({x:THOTH_CENTRE.x+u,z:THOTH_CENTRE.z+v});
export const THOTH_TOWN=F({id:'thoth-town',name:'Thoth Town',region:'North Thoth',regions:F([86,87]),...thothPoint(17,-52),description:'A Swedish-inspired river town of timber lanes, a stone assembly hall, brick merchants and a market joining two banks.'});
export const THOTH_FINE=F({...thothPoint(-145,-145),w:300,d:285});
export const inThothFine=(x,z)=>x>THOTH_FINE.x&&x<THOTH_FINE.x+THOTH_FINE.w&&z>THOTH_FINE.z&&z<THOTH_FINE.z+THOTH_FINE.d;
export function thothSegment(x,z,a,b){const dx=b.x-a.x,dz=b.z-a.z,t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1));return {t,distance:Math.hypot(x-a.x-t*dx,z-a.z-t*dz)};}
export const thothTownRadius=(x,z)=>Math.hypot((x-THOTH_CENTRE.x)/105,(z-THOTH_CENTRE.z+6)/118);
export const thothTownLevel=(x,z)=>22.3+.012*(x-THOTH_CENTRE.x)+.01*(z-THOTH_CENTRE.z);
const road=ps=>F(ps.map(([u,v])=>F(thothPoint(u,v))));
export const THOTH_LANES=F([
  road([[-97,-30],[-30,-36],[0,-40],[38,-36],[87,-26]]),
  road([[-94,-88],[-42,-87],[15,-85],[83,-86]]),
  road([[-83,-120],[-82,-75],[-84,-31]]),road([[86,-115],[84,-60],[87,-26]]),
  road([[0,-40],[15,-48],[15,-85]]),road([[0,40],[0,62],[1,110]]),
  road([[-92,64],[-35,64],[0,62],[75,65],[96,70]]),
  road([[-85,30],[-84,65],[-78,110]]),road([[82,37],[81,73],[83,110]]),
  road([[30,13],[30,48],[31,64]]),
]);
export function thothLaneDistance(x,z){let d=Infinity;for(const l of THOTH_LANES)for(let i=1;i<l.length;i++)d=Math.min(d,thothSegment(x,z,l[i-1],l[i]).distance);return d;}
export const THOTH_MARKET=F({...thothPoint(19,-58),w:31,d:24});
function deck(id,a,b,width,y0,y1=y0){return F({id,a:F(thothPoint(...a)),b:F(thothPoint(...b)),width,y0,y1});}
export const THOTH_DECKS=F([
  deck('bridge',[0,-40],[0,40],6.5,23.25),
  deck('landing',[20,10],[42,16],3.4,21.6,22.1),
  deck('landing-ramp',[30,13],[30,48],3.4,21.827,23),
]);
export function thothDeckHeight(x,z){if(!inThothFine(x,z))return null;let y=null;for(const d of THOTH_DECKS){const hit=thothSegment(x,z,d.a,d.b);if(hit.distance<=d.width/2)y=Math.max(y??-Infinity,d.y0+(d.y1-d.y0)*hit.t);}return y;}
export const thothTownReserved=(x,z,r=0)=>inThothFine(x,z)&&(thothTownRadius(x,z)<1.12+r/90||thothLaneDistance(x,z)<5+r);
function edgeWeight(x,z){const b=THOTH_FINE;return smooth(0,22,Math.min(x-b.x,b.x+b.w-x,z-b.z,b.z+b.d-z));}
export const thothTownSink=(x,z)=>inThothFine(x,z)?7*edgeWeight(x,z):0;
export function thothTownGround(x,z,base){
  if(!inThothFine(x,z))return base;
  let y=base+(thothTownLevel(x,z)-base)*(1-smooth(1,1.45,thothTownRadius(x,z)));
  for(const d of THOTH_DECKS)if(d.id!=='bridge'){
    const hit=thothSegment(x,z,d.a,d.b),h=d.y0+(d.y1-d.y0)*hit.t-.22;
    if(y>h)y+=(h-y)*(1-smooth(d.width/2+.5,d.width/2+5,hit.distance));
  }
  for(const d of THOTH_DECKS)if(d.id==='bridge'||d.id==='landing-ramp')for(const [p,h] of [[d.a,d.y0],[d.b,d.y1]]){
    const distance=Math.hypot(x-p.x,z-p.z),dx=d.b.x-d.a.x,dz=d.b.z-d.a.z,target=h+((x-p.x)*dx+(z-p.z)*dz)/(dx*dx+dz*dz)*(d.y1-d.y0);
    if(distance<12)y+=(target-y)*(1-smooth(3,12,distance));
  }
  return base+(y-base)*edgeWeight(x,z);
}
