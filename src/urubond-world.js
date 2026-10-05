/** One barren volcanic island. Ground and the traversable crater ledges share one field. */
import {hexAt,REGION_CELLS,landDistance} from './region-world.js';
const F=Object.freeze,clamp=v=>Math.max(0,Math.min(1,v));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
export const URUBOND=F({id:117,name:'Urubond',x:-3490,z:-3450,
  bounds:F({minX:-3780,maxX:-3230,minZ:-3710,maxZ:-3060}),
  landing:F({x:-3500,z:-3160}),entrance:F({x:-3490,z:-3422,y:220})});
const cells=new Set((REGION_CELLS.Urubond??[]).map(c=>`${c.q},${c.r}`));
export function urubondOwns(x,z){const b=URUBOND.bounds;if(x<b.minX||x>b.maxX||z<b.minZ||z>b.maxZ)return false;const c=hexAt(x,z);return cells.has(`${c.q},${c.r}`);}
export function urubondPatchWeight(x,z){const b=URUBOND.bounds;return smooth(0,24,Math.min(x-b.minX,b.maxX-x,z-b.minZ,b.maxZ-z));}
export const urubondTerrainSink=(x,z)=>600*urubondPatchWeight(x,z);
// The exposed route is a winding erosion ledge, with no masonry or signposts.
const route=[{...URUBOND.landing,y:12},{x:-3480,z:-3220,y:26},{x:URUBOND.x,z:URUBOND.z+185,y:40}];
for(let i=1;i<=160;i++){const t=i/160,a=Math.PI/2+t*Math.PI*4+.12*Math.sin(t*Math.PI*6),r=185-133*t+7*Math.sin(t*Math.PI*6)*Math.sin(t*Math.PI);route.push({x:URUBOND.x+Math.cos(a)*r,z:URUBOND.z+Math.sin(a)*r,y:40+278*t});}
for(let i=1;i<=80;i++){const t=i/80,a=Math.PI/2+t*Math.PI*2,r=52-24*t;route.push({x:URUBOND.x+Math.cos(a)*r,z:URUBOND.z+Math.sin(a)*r,y:318-98*t});}
export const URUBOND_ROUTE=F(route.map(F));
const buckets=new Map(),size=24;
for(let i=1;i<route.length;i++){const a=route[i-1],b=route[i];for(let x=Math.floor((Math.min(a.x,b.x)-11)/size);x<=Math.floor((Math.max(a.x,b.x)+11)/size);x++)for(let z=Math.floor((Math.min(a.z,b.z)-11)/size);z<=Math.floor((Math.max(a.z,b.z)+11)/size);z++){const key=`${x},${z}`;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push([a,b]);}}
export function urubondLedge(x,z){let best={distance:Infinity,y:0};for(const [a,b]of buckets.get(`${Math.floor(x/size)},${Math.floor(z/size)}`)??[]){const dx=b.x-a.x,dz=b.z-a.z,t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)),d=Math.hypot(x-a.x-dx*t,z-a.z-dz*t);if(d<best.distance)best={distance:d,y:a.y+(b.y-a.y)*t};}return best;}
export function urubondGround(x,z,base=0){
 if(!urubondOwns(x,z))return base;
 const sea=landDistance(x,z);if(sea<=0)return base;
 const dx=x-URUBOND.x,dz=z-URUBOND.z,r=Math.hypot(dx,dz),a=Math.atan2(dz,dx);
 const radius=r/(1+(.055*Math.sin(a*3)+.025*Math.sin(a*7))*smooth(55,140,r));
 const rim=318+13*Math.sin(a*3)+7*Math.cos(a*5);
 const baseRock=18+8*Math.sin(x*.019+z*.013)**2+5*Math.sin(z*.041)*Math.sin(x*.025);
 let y=r<52?208+(rim-208)*smooth(18,52,r):baseRock+(rim-baseRock)*Math.max(0,1-(radius-52)/180)**1.5;
 const ledge=urubondLedge(x,z);if(ledge.distance<10)y+=(ledge.y-y)*(1-smooth(3.8,10,ledge.distance));
 // Shore ramps end in black gravel; higher promontories remain columnar cliffs.
 return base+(y-base)*smooth(0,33,sea);
}
export function urubondTint(x,z){if(!urubondOwns(x,z))return null;const r=Math.hypot(x-URUBOND.x,z-URUBOND.z),h=urubondGround(x,z);
 if(r<20)return '#241919';if(r<57)return h>285?'#514440':'#363036';
 const vein=Math.sin(x*.055+Math.sin(z*.018)*3);return vein>.86?'#484149':vein<-.74?'#303139':h>100?'#434148':'#393a40';}
// No entrance landmark: the cleft must be found physically, inside the crater.
export const URUBOND_LANDMARKS=F([{id:'urubond-shore',name:'The Ashen Strand',region:'Urubond',...URUBOND.landing,description:'Black gravel beneath a lifeless volcanic island.'}]);
