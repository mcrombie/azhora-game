/** Two authored estuary towns. The atlas river mouths stay fixed; plans are in
 * local metres relative to them. This module has no terrain/rendering imports. */
const clamp=v=>Math.max(0,Math.min(1,v));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
export function segmentDistance(x,z,a,b){const dx=b.x-a.x,dz=b.z-a.z,t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1));return Math.hypot(x-a.x-t*dx,z-a.z-t*dz);}
function town(id,name,region,regions,x,z,style){
  const at=(u,v)=>({x:x+u,z:z+v});
  return Object.freeze({id,name,region,regions,style,mouth:{x,z},x:x-102,z:z-2,
    description:style==='finnish'?'A timber fishing town at the Riesov inlet, with log yards, a fieldstone hall, a wooden belfry and shingled storehouses.':'A brick-and-timber trading town at the Witherst mouth, with a stepped-gable guildhall, limewashed houses and a herring waterfront.',
    fine:{x:x-175,z:z-105,w:260,d:245},centre:at(-70,15),rx:104,rz:91,
    market:{...at(-105,-9),w:40,d:38},
    bridge:{...at(-50,52),length:70,width:5.8,y:6},
    quays:[{...at(-66,30),w:6,d:44,low:2.8,high:6},{...at(-44,9),w:50,d:5,low:2.8,high:2.8}],
    roads:[[-147,52,-50,52,12,52],[-91,-61,-91,52,-91,99],[-145,-34,-72,-34,-66,8]].map(a=>Array.from({length:a.length/2},(_,i)=>at(a[i*2],a[i*2+1])))
  });
}
export const RIESOV=town('riesov-town','Riesov Town','North Riesov',[102,103],1949.9980720608733,-3752.6442631920486,'finnish');
export const WITHERST=town('witherst-town','Witherst Town','West Witherst',[104,105],899.9980720608733,-4532.067126598044,'danish');
export const NORTHERN_TOWNS=Object.freeze([RIESOV,WITHERST]);
export const northernTownAt=(x,z)=>NORTHERN_TOWNS.find(t=>x>t.fine.x&&x<t.fine.x+t.fine.w&&z>t.fine.z&&z<t.fine.z+t.fine.d)??null;
export const inNorthernTownFine=(x,z)=>northernTownAt(x,z)!==null;
export const townRadius=(t,x,z)=>Math.hypot((x-t.centre.x)/t.rx,(z-t.centre.z)/t.rz);
export function townRoadDistance(t,x,z){let d=Infinity;for(const line of t.roads)for(let i=1;i<line.length;i++)d=Math.min(d,segmentDistance(x,z,line[i-1],line[i]));return d;}
export function northernTownReserved(x,z,r=0){const t=northernTownAt(x,z);return !!t&&(townRadius(t,x,z)<1.14+r/90||townRoadDistance(t,x,z)<5+r);}
export function northernTownSink(x,z){const t=northernTownAt(x,z);if(!t)return 0;const b=t.fine;return 8*smooth(0,12,Math.min(x-b.x,b.x+b.w-x,z-b.z,b.z+b.d-z));}
export const townQuayHeight=(q,z)=>q.low+(q.high-q.low)*clamp((z-q.z+q.d/2)/q.d);
export function northernTownDeck(x,z){const t=northernTownAt(x,z);if(!t)return null;const b=t.bridge;
  if(Math.abs(x-b.x)<=b.length/2&&Math.abs(z-b.z)<=b.width/2)return b.y;
  for(const q of t.quays)if(Math.abs(x-q.x)<=q.w/2&&Math.abs(z-q.z)<=q.d/2)return townQuayHeight(q,z);
  return null;
}
export function northernTownGround(x,z,base,seaDistance){const t=northernTownAt(x,z);if(!t)return base;
  let y=base+(6-base)*(1-smooth(.82,1.12,townRadius(t,x,z)))*smooth(0,22,seaDistance);
  // A small made terrace carries the east-bank storehouses, rather than
  // balancing their floors on a tall wedge at the edge of the town platform.
  const east=Math.hypot((x-t.mouth.x+16)/30,(z-t.mouth.z-77)/25);
  y+=(6-y)*(1-smooth(.85,1.5,east))*smooth(0,22,seaDistance);
  for(const q of t.quays){const d=Math.max(Math.abs(x-q.x)-q.w/2,Math.abs(z-q.z)-q.d/2,0);if(d<10)y+=(townQuayHeight(q,z)-y)*(1-smooth(0,10,d))*smooth(0,8,seaDistance);}
  return y;
}
export function northernTownRiverProfile(course){
  const t=NORTHERN_TOWNS.find(t=>[course.points[0],course.points.at(-1)].some(p=>Math.hypot(p.x-t.mouth.x,p.z-t.mouth.z)<.1));if(!t)return null;
  const points=course.points.map(p=>({...p}));if(Math.hypot(points[0].x-t.mouth.x,points[0].z-t.mouth.z)>.1)points.reverse();
  let distance=0;return {name:t.name.replace(' Town',' River'),town:t.id,width:5.5,points:points.map((p,i)=>{if(i)distance+=Math.hypot(p.x-points[i-1].x,p.z-points[i-1].z);return {...p,y:.04+distance*.025};})};
}
export function northernTownOutlet(x,z,base){
  for(const t of NORTHERN_TOWNS){const m=t.mouth;if(Math.abs(x-m.x)>50||Math.abs(z-m.z)>45)continue;const d=segmentDistance(x,z,m,{x:m.x+30,z:m.z-17.32});if(d<16)return Math.min(base,-1.8+(base+1.8)*smooth(6,16,d));}
  return base;
}
