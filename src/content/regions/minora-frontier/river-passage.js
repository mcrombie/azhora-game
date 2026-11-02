import {LIZEEM_BERTHS,RIVER_CHANNEL,riverChannelDistance,riverChannelAtZ,riverWaterPoint,makeRiverTrack,riverWorkingPose} from './river-navigation.js';

export const PASSAGE_SPEED=5;
const DOCK_SPEED=1.15,MOOR_SECONDS=2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const angle=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
export const portDistance=port=>riverChannelDistance(LIZEEM_BERTHS[port.id]??port.keeper);
export const downstreamPorts=(from,ports)=>ports.filter(p=>portDistance(p)>portDistance(from)+10).sort((a,b)=>portDistance(a)-portDistance(b));
function curve(a,b,handle=15){
  const distance=Math.hypot(b.x-a.x,b.z-a.z),n=Math.ceil(distance*2),h=Math.min(handle,distance*.7),c={x:a.x+Math.sin(a.heading)*h,z:a.z+Math.cos(a.heading)*h},d={x:b.x-Math.sin(b.heading)*h,z:b.z-Math.cos(b.heading)*h},points=[];
  for(let i=0;i<=n;i++){const t=i/n,u=1-t;points.push(riverWaterPoint(u*u*u*a.x+3*u*u*t*c.x+3*u*t*t*d.x+t*t*t*b.x,u*u*u*a.z+3*u*u*t*c.z+3*u*t*t*d.z+t*t*t*b.z));}
  return points;
}
const cache=new Map();
export function passageRoute(from,to){
  const key=from.id+':'+to.id;if(cache.has(key))return cache.get(key);
  const start=portDistance(from),end=portDistance(to),source=LIZEEM_BERTHS[from.id],destination=LIZEEM_BERTHS[to.id];
  if(!source||!destination||end<=start+10)return null;
  // Move parallel to the quay until the entire stern is free before turning.
  // Arrival mirrors that leg, aligning the hull before its bow reaches the quay.
  const departure={...riverWaterPoint(source.x,source.z+(from.id==='minora'?15:10)),heading:0},arrival={...riverWaterPoint(destination.x,destination.z-10),heading:0};
  const join=riverChannelDistance(riverChannelAtZ(source.z+48)),leave=riverChannelDistance(riverChannelAtZ(destination.z-43));
  const points=[source,departure,...curve(departure,RIVER_CHANNEL.pose(join)).slice(1)];
  if(leave>join)points.push(...RIVER_CHANNEL.points.filter(p=>p.distance>join&&p.distance<leave));
  const approach=RIVER_CHANNEL.pose(Math.max(join,leave));points.push(approach,...curve(approach,arrival).slice(1),destination);
  const track=makeRiverTrack(points),last=track.length,table=[];
  // A bounded table is prepared once per pair. Watching and skipping use the
  // same travel time, including cautious bends, departure and mooring.
  const count=Math.ceil(last/.5);
  for(let i=0;i<=count;i++){
    const distance=last*i/count,a=track.pose(Math.max(0,distance-2)),b=track.pose(Math.min(last,distance+2)),curvature=Math.abs(angle(a.heading,b.heading))/Math.max(1,Math.min(last,distance+2)-Math.max(0,distance-2));
    const edge=Math.min(distance,last-distance),cruise=Math.min(PASSAGE_SPEED,.24/Math.max(.001,curvature)),speed=Math.min(cruise,DOCK_SPEED+Math.max(0,edge-10)*.15,Math.sqrt(.9*edge));
    table.push({distance,speed});
  }
  for(let i=1;i<table.length;i++)table[i].speed=Math.min(table[i].speed,Math.sqrt(table[i-1].speed**2+1.2*(table[i].distance-table[i-1].distance)));
  for(let i=table.length-2;i>=0;i--)table[i].speed=Math.min(table[i].speed,Math.sqrt(table[i+1].speed**2+1.2*(table[i+1].distance-table[i].distance)));
  let elapsed=MOOR_SECONDS;table[0].time=elapsed;
  for(let i=1;i<table.length;i++){elapsed+=2*(table[i].distance-table[i-1].distance)/(table[i].speed+table[i-1].speed);table[i].time=elapsed;}
  const duration=elapsed+MOOR_SECONDS;
  function at(seconds){
    const t=clamp(seconds,0,duration);let lo=0,hi=table.length-1;
    while(lo+1<hi){const mid=(lo+hi)>>1;if(table[mid].time<=t)lo=mid;else hi=mid;}
    const a=table[lo],b=table[hi],span=b.time-a.time,f=clamp((t-a.time)/(span||1),0,1),dt=f*span,distance=a.distance+a.speed*dt+(b.speed-a.speed)*dt*dt/(2*span),p=track.pose(distance);
    if(t<=MOOR_SECONDS)return riverWorkingPose(source,0,'departing',0);
    if(t>=elapsed)return riverWorkingPose(destination,0,'moored',0);
    const speed=a.speed+(b.speed-a.speed)*f,before=track.pose(distance-.5),after=track.pose(distance+.5),turnRate=angle(before.heading,after.heading)*speed;
    return riverWorkingPose(p,speed,distance<45?'departing':last-distance<45?'arriving':'sailing',turnRate);
  }
  const route={duration,distance:last,at,fromBerth:source,toBerth:destination};cache.set(key,route);return route;
}
