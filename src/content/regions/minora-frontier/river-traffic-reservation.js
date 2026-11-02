import {MINORA_SHIPPING,minoraTraderPose} from './minora-river-route.js';
import {PASSAGE_HULL,TRADE_HULL,riverHullClear,riverHullPoints,riverHullOverlaps,riverWaterPoint,makeRiverTrack} from './river-navigation.js';
import {LIZEEM_BRIDGES} from './lizeem-crossings.js';

const MAX_CLEARANCE=30,STEP=.2,SPEED=MINORA_SHIPPING.speed;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const angle=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
const heading=p=>p.heading??p.yaw;
// Separating axes for two complete hulls, with working oars where applicable.
export function riverVesselsOverlap(a,ah,b,bh,margin=.35){
  const aa=heading(a),ba=heading(b),af=[Math.sin(aa),Math.cos(aa)],as=[af[1],-af[0]],bf=[Math.sin(ba),Math.cos(ba)],bs=[bf[1],-bf[0]],dx=a.x-b.x,dz=a.z-b.z;
  const al=ah.length/2+margin,aw=ah.beam/2+margin+(a.rowing?1.1:0),bl=bh.length/2+margin,bw=bh.beam/2+margin+(b.rowing?1.1:0);
  if(Math.hypot(dx,dz)>al+aw+bl+bw)return false;
  for(const axis of [af,as,bf,bs]){
    const dot=v=>Math.abs(v[0]*axis[0]+v[1]*axis[1]);
    if(Math.abs(dx*axis[0]+dz*axis[1])>=al*dot(af)+aw*dot(as)+bl*dot(bf)+bw*dot(bs))return false;
  }
  return true;
}
function bridgeClear(p){
  const hull=TRADE_HULL;
  if(Math.abs(p.z-135)<12){
    for(let x=-2258;x<=-2162;x+=12)if(riverHullOverlaps(p,hull,{x,z:135,hx:1.65,hz:6.5},.3))return false;
    for(const v of riverHullPoints(p,hull,.2))if(Math.abs(v.z-135)<5.2){
      const center=-2252+12*Math.round((v.x+2252)/12),across=Math.abs(v.x-center);
      if(across>=4.95||14.45+Math.sqrt(4.95**2-across**2)-p.y<hull.airDraft+.3)return false;
    }
  }
  for(const b of LIZEEM_BRIDGES){
    if(Math.abs(p.z-b.z)>12)continue;
    const span=(b.length-2*b.ramp)/3;
    for(let i=0;i<=3;i++)if(riverHullOverlaps(p,hull,{x:b.x-1.5*span+i*span,z:b.z,hx:1.8,hz:b.width/2+.6},.3))return false;
    for(const v of riverHullPoints(p,hull,.2))if(Math.abs(v.z-b.z)<b.width/2+.2){
      const u=(v.x-b.x+1.5*span)/span,f=u-Math.floor(u);
      if(b.y-4.8+4*Math.sin(Math.PI*f)-p.y<hull.airDraft+.3)return false;
    }
  }
  return true;
}
export const riverReservationPoseClear=p=>riverHullClear(p,TRADE_HULL)&&bridgeClear(p);

const passageSamples=new WeakMap();
function samplesFor(route){
  if(passageSamples.has(route))return passageSamples.get(route);
  const samples=[];for(let t=0;t<route.duration;t+=.4)samples.push(route.at(t));samples.push(route.at(route.duration));
  passageSamples.set(route,samples);return samples;
}
function makePullOff(points,start,endHeading){
  const track=makeRiverTrack(points),table=[],steps=Math.ceil(track.length/.3);
  function pose(distance){
    distance=clamp(distance,0,track.length);const p=track.pose(distance);
    let yaw=p.heading;
    if(distance<2)yaw=start.yaw+angle(start.yaw,yaw)*distance/2;
    if(track.length-distance<2)yaw+=angle(yaw,endHeading)*(1-(track.length-distance)/2);
    return {...p,yaw,heading:yaw};
  }
  for(let i=0;i<=steps;i++){
    const distance=track.length*i/steps,a=pose(distance-.4),b=pose(distance+.4),curvature=Math.abs(angle(a.yaw,b.yaw))/.8;
    table.push({distance,speed:i===steps?0:Math.min(SPEED,.45/Math.max(.001,curvature))});
  }
  for(let i=1;i<table.length;i++)table[i].speed=Math.min(table[i].speed,Math.sqrt(table[i-1].speed**2+1.2*(table[i].distance-table[i-1].distance)));
  for(let i=table.length-2;i>=0;i--)table[i].speed=Math.min(table[i].speed,Math.sqrt(table[i+1].speed**2+1.2*(table[i+1].distance-table[i].distance)));
  let duration=0;table[0].time=0;
  for(let i=1;i<table.length;i++){duration+=2*(table[i].distance-table[i-1].distance)/(table[i].speed+table[i-1].speed);table[i].time=duration;}
  function at(t){
    t=clamp(t,0,duration);let lo=0,hi=table.length-1;
    while(lo+1<hi){const mid=(lo+hi)>>1;if(table[mid].time<=t)lo=mid;else hi=mid;}
    const a=table[lo],b=table[hi],span=b.time-a.time,dt=clamp(t-a.time,0,span),speed=a.speed+(b.speed-a.speed)*dt/span,distance=a.distance+a.speed*dt+(b.speed-a.speed)*dt*dt/(2*span),p=pose(distance),before=pose(distance-.4),after=pose(distance+.4);
    return {...p,speed,turnRate:angle(before.yaw,after.yaw)/.8*speed,rowing:false,phase:t<duration?'yielding':'moored'};
  }
  return {duration,at,end:at(duration)};
}
function candidates(route,trafficTime,index,maxClearance){
  const start=minoraTraderPose(trafficTime,index),source={...route.fromBerth,rowing:false},samples=samplesFor(route),result=[];
  function accept(points,endHeading){
    const plan=makePullOff(points,start,endHeading);if(plan.duration>maxClearance-1)return;
    if(samples.some(p=>riverVesselsOverlap(plan.end,TRADE_HULL,p,PASSAGE_HULL,.55)))return;
    for(let t=0;t<=plan.duration+STEP/2;t+=STEP){
      const p=plan.at(Math.min(t,plan.duration));
      if(!riverReservationPoseClear(p)||riverVesselsOverlap(p,TRADE_HULL,source,PASSAGE_HULL,.45))return;
    }
    result.push(plan);
  }
  // A trader already outside the entire voyage only needs a short braking run.
  const stop=[];for(let t=0;t<=1;t+=.2)stop.push(minoraTraderPose(trafficTime+t,index));
  accept(stop,stop.at(-1).yaw);
  for(const lead of [0,2,4,6])for(const advance of [6,10,16])for(const offset of [5,-5,8,-8,11,-11]){
    const points=[start];for(let t=.25;t<=lead;t+=.25)points.push(minoraTraderPose(trafficTime+t,index));
    const a=minoraTraderPose(trafficTime+lead,index),anchor=minoraTraderPose(trafficTime+lead+advance/SPEED,index),end=riverWaterPoint(anchor.x+Math.cos(anchor.yaw)*offset,anchor.z-Math.sin(anchor.yaw)*offset);
    const h=6,c={x:a.x+Math.sin(a.yaw)*h,z:a.z+Math.cos(a.yaw)*h},d={x:end.x-Math.sin(anchor.yaw)*h,z:end.z-Math.cos(anchor.yaw)*h},n=Math.ceil((advance+Math.abs(offset))*3);
    for(let i=1;i<=n;i++){
      const t=i/n,u=1-t;points.push(riverWaterPoint(u*u*u*a.x+3*u*u*t*c.x+3*u*t*t*d.x+t*t*t*end.x,u*u*u*a.z+3*u*u*t*c.z+3*u*t*t*d.z+t*t*t*end.z));
    }
    accept(points,anchor.yaw);
  }
  return result.sort((a,b)=>a.duration-b.duration).slice(0,10);
}

/** A finite reservation prepared while boarding. There is no per-frame search.
 * Ambient phase stops during the reservation; both boats return along the same
 * checked maneuvers before their original common phase resumes. Reversing the
 * maneuvers also preserves their mutual separation and avoids a visible reset.
 * A null result means this launch must wait/retry; never start an unsafe trip. */
function planRiverPassage(baseRoute,trafficTime,maxClearance){
  const options=[0,1].map(index=>candidates(baseRoute,trafficTime,index,maxClearance));
  let chosen=null,best=Infinity;
  for(const a of options[0])for(const b of options[1]){
    const duration=Math.ceil(Math.max(a.duration,b.duration)*4)/4+1;if(duration>maxClearance||duration>=best)continue;
    let clear=true;
    for(let t=0;t<=duration;t+=STEP)if(riverVesselsOverlap(a.at(t),TRADE_HULL,b.at(t),TRADE_HULL,.45)){clear=false;break;}
    if(clear){chosen=[a,b];best=duration;}
  }
  if(!chosen)return null;
  const clearanceSeconds=best,duration=clearanceSeconds+baseRoute.duration,returnEnd=duration+clearanceSeconds,trafficDuration=returnEnd+2;
  const resumedTime=t=>{const d=Math.max(0,t-returnEnd);return trafficTime+(d<2?d*d/4:d-1);};
  function shipsAt(t){
    if(t>=returnEnd)return [0,1].map(index=>{const p=minoraTraderPose(resumedTime(t),index);return {...p,speed:p.speed*Math.min(1,(t-returnEnd)/2)};});
    if(t>=duration){const u=(t-duration)/clearanceSeconds,smooth=u*u*(3-2*u);return chosen.map(plan=>{const p=plan.at(clearanceSeconds*(1-smooth));return {...p,speed:-p.speed*6*u*(1-u),phase:p.speed?'returning':'moored'};});}
    return chosen.map(plan=>plan.at(Math.min(t,clearanceSeconds)));
  }
  return {...baseRoute,baseRoute,clearanceSeconds,baseDuration:baseRoute.duration,duration,trafficDuration,
    at(t){return t<clearanceSeconds?{...baseRoute.fromBerth,speed:0,turnRate:0,rowing:false,phase:'waiting'}:baseRoute.at(t-clearanceSeconds);},
    shipsAt,trafficTimeAt:resumedTime,
  };
}
const reservations=new WeakMap();
export function reserveRiverPassage(baseRoute,trafficTime,{maxClearance=MAX_CLEARANCE}={}){
  maxClearance=clamp(maxClearance,0,MAX_CLEARANCE);
  if(!baseRoute||!Number.isFinite(trafficTime)||maxClearance<1)return null;
  let cache=reservations.get(baseRoute);if(!cache){cache=new Map();reservations.set(baseRoute,cache);}
  const key=trafficTime+':'+maxClearance;if(cache.has(key))return cache.get(key);
  const result=planRiverPassage(baseRoute,trafficTime,maxClearance);cache.set(key,result);
  if(cache.size>12)cache.delete(cache.keys().next().value);
  return result;
}
