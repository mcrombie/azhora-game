import {LIZEEM,courseDistance} from '../western-regions/west-regions.js';
import {WEST_PROFILES,courseBetween} from '../western-regions/west-ground.js';
import {MINORA_HARBOR} from './minora-harbor.js';
import {NETHEREUM_QUAY} from '../nethereum/nethereum-agriculture.js';
import {CARICAS_AGRICULTURE_QUAY} from './caricas-agriculture.js';
import {OVESOS_AGRICULTURE_QUAY} from '../oves/ovesos-agriculture.js';
import {NESDOR_AGRICULTURE_QUAY} from '../nesdor/nesdor-agriculture.js';
import {LIZEEM_BRIDGES} from './lizeem-crossings.js';

// Physical hull envelopes shared by scenery and both boat services.
export const PASSAGE_HULL=Object.freeze({length:11.6,beam:3.5,airDraft:2.8,draft:.65});
export const TRADE_HULL=Object.freeze({length:10,beam:2.4,airDraft:2.15,draft:.55});
const townQuays={caricas:CARICAS_AGRICULTURE_QUAY,nethereum:NETHEREUM_QUAY,ovesos:OVESOS_AGRICULTURE_QUAY,nesdor:NESDOR_AGRICULTURE_QUAY};
export const RIVER_QUAYS=Object.freeze([
  {id:'minora',x:MINORA_HARBOR.x,z:MINORA_HARBOR.z,hx:MINORA_HARBOR.width/2,hz:MINORA_HARBOR.length/2},
  ...Object.entries(townQuays).map(([id,q])=>({id,x:(q.bank+q.end)/2,z:q.z,hx:Math.abs(q.end-q.bank)/2,hz:q.width/2})),
].map(Object.freeze));
export const riverWaterPoint=(x,z)=>({x,z,y:courseBetween(LIZEEM,x,z).surface});
const berth=(id,x,z)=>Object.freeze({id,...riverWaterPoint(x,z),yaw:0,heading:0});
export const LIZEEM_BERTHS=Object.freeze({
  minora:berth('minora',MINORA_HARBOR.boat.x,MINORA_HARBOR.boat.z),
  ...Object.fromEntries(Object.entries(townQuays).map(([id,q])=>[id,berth(id,q.end+Math.sign(q.end-q.bank)*3.2,q.z)])),
});
export const RIVER_GUARD_BERTH=Object.freeze({...riverWaterPoint(-2261,207),yaw:0,heading:0,length:23,beam:5.6});
export const RIVER_OBSTACLES=Object.freeze([
  ...RIVER_QUAYS.map(q=>({...q,kind:'quay'})),
  ...Object.values(LIZEEM_BERTHS).map(b=>({id:b.id,kind:'berth',x:b.x,z:b.z,hx:PASSAGE_HULL.beam/2,hz:PASSAGE_HULL.length/2})),
  {id:'river-guard',kind:'ship',x:RIVER_GUARD_BERTH.x,z:RIVER_GUARD_BERTH.z,hx:2.8,hz:11.5},
].map(Object.freeze));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const window=(z,a,b,c,d)=>smooth((z-a)/(b-a))*(1-smooth((z-c)/(d-c)));
const mix=(a,b,t)=>a+(b-a)*t;

export function riverHullPoints(p,hull,margin=0){
  const yaw=p.heading??p.yaw,s=Math.sin(yaw),c=Math.cos(yaw),points=[];
  for(const along of [-hull.length/2,0,hull.length/2])for(const across of [-hull.beam/2-margin,hull.beam/2+margin])points.push({x:p.x+s*along+c*across,z:p.z+c*along-s*across});
  return points;
}
export function riverHullOverlaps(p,hull,box,margin=.45){
  const a=p.heading??p.yaw,s=Math.sin(a),c=Math.cos(a),dx=p.x-box.x,dz=p.z-box.z,l=hull.length/2+margin,w=hull.beam/2+margin;
  return Math.abs(dx)<Math.abs(s)*l+Math.abs(c)*w+box.hx&&Math.abs(dz)<Math.abs(c)*l+Math.abs(s)*w+box.hz&&Math.abs(dx*s+dz*c)<l+box.hx*Math.abs(s)+box.hz*Math.abs(c)&&Math.abs(dx*c-dz*s)<w+box.hx*Math.abs(c)+box.hz*Math.abs(s);
}
export function riverHullClear(p,hull,{ignoreBerths=[]}={}){
  if(RIVER_OBSTACLES.some(o=>!(o.kind==='berth'&&ignoreBerths.includes(o.id))&&riverHullOverlaps(p,hull,o)))return false;
  return riverHullPoints(p,hull,.35).every(v=>courseBetween(LIZEEM,v.x,v.z).half-courseDistance(LIZEEM,v.x,v.z)>.2);
}

// Keep the complete ordered profile, including bends whose z runs backwards.
// Sampling and gentle smoothing happen once, never in the frame update.
const profile=WEST_PROFILES.get(LIZEEM.id),raw=[];
for(let i=1;i<profile.length;i++){
  const a=profile[i-1],b=profile[i],n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z));
  for(let j=0;j<n;j++)raw.push({x:mix(a.x,b.x,j/n),z:mix(a.z,b.z,j/n)});
}
raw.push(profile.at(-1));
const centers=raw.map((p,i)=>{
  let x=0,z=0,count=0;for(let j=Math.max(0,i-4);j<=Math.min(raw.length-1,i+4);j++){x+=raw[j].x;z+=raw[j].z;count++;}
  return {x:x/count,z:z/count};
});
function channelPoint(p,lane=0){
  const z=p.z;let x=p.x+lane*3;
  if(z<490){
    x=mix(x,-2210+lane*6,window(z,95,115,155,180))+(lane<0?11:7.5)*window(z,144,156,176,195);
    x=mix(x,CARICAS_AGRICULTURE_QUAY.end-13+lane*3,window(z,240,264,295,322));
    x=mix(x,NETHEREUM_QUAY.end+15+lane*3,window(z,315,354,383,414));
    x=mix(x,-2160+lane*3,window(z,322,338,351,361));
  }
  x=mix(x,LIZEEM_BRIDGES[1].x+lane*3,window(z,660,683,717,742));
  return riverWaterPoint(x,z);
}
export function makeRiverTrack(points){
  let length=0;const track=points.map((p,i)=>{if(i)length+=Math.hypot(p.x-points[i-1].x,p.z-points[i-1].z);return {...p,distance:length};});
  function at(distance){
    const d=clamp(distance,0,length);let lo=0,hi=track.length-1;
    while(lo+1<hi){const mid=(lo+hi)>>1;if(track[mid].distance<=d)lo=mid;else hi=mid;}
    const a=track[lo],b=track[hi],t=(d-a.distance)/Math.max(1e-9,b.distance-a.distance);
    return {x:mix(a.x,b.x,t),z:mix(a.z,b.z,t),y:mix(a.y,b.y,t)};
  }
  function pose(d){const p=at(d),a=at(d-1.5),b=at(d+1.5);return {...p,heading:Math.atan2(b.x-a.x,b.z-a.z)};}
  return {points:track,length,at,pose};
}
export const RIVER_CHANNEL=makeRiverTrack(centers.map(p=>channelPoint(p)));
export function riverChannelDistance(point){
  let best=Infinity,result=0;
  for(let i=1;i<RIVER_CHANNEL.points.length;i++){
    const a=RIVER_CHANNEL.points[i-1],b=RIVER_CHANNEL.points[i],dx=b.x-a.x,dz=b.z-a.z,t=clamp(((point.x-a.x)*dx+(point.z-a.z)*dz)/(dx*dx+dz*dz||1),0,1),gap=Math.hypot(point.x-a.x-t*dx,point.z-a.z-t*dz);
    if(gap<best){best=gap;result=mix(a.distance,b.distance,t);}
  }
  return result;
}
export function riverChannelAtZ(z,lane=0){
  const i=centers.findIndex(p=>p.z>=z),a=centers[Math.max(0,i-1)],b=centers[Math.max(0,i)],t=clamp((z-a.z)/(b.z-a.z||1),0,1);
  return channelPoint({x:mix(a.x,b.x,t),z},lane);
}
export function riverWorkingPose(p,speed=0,phase='sailing',turnRate=0){
  const nearBridge=[135,...LIZEEM_BRIDGES.map(b=>b.z)].some(z=>Math.abs(p.z-z)<20);
  const nearQuay=RIVER_QUAYS.some(q=>Math.hypot(p.x-q.x,p.z-q.z)<q.hx+22);
  return {...p,speed,phase,turnRate,rowing:Math.abs(speed)>.15&&!nearBridge&&!nearQuay&&Math.abs(turnRate)<.2};
}
