import {TRADE_HULL,RIVER_GUARD_BERTH,riverChannelAtZ,riverWaterPoint,makeRiverTrack,riverWorkingPose} from './river-navigation.js';

// Ambient traffic shares the passenger service's reserved channel and berths.
// The loop is baked once; no navigation search or physics runs each frame.
export const MINORA_SHIPPING=Object.freeze({traders:2,speed:1.9,secondPhase:.56,...TRADE_HULL,guardLength:23,guardBeam:5.6});
function lanePoint(z,lane){
  const p=riverChannelAtZ(z,lane),end=Math.min(z-55,465-z),extra=3*Math.max(0,1-end/22);
  return riverWaterPoint(p.x+lane*extra,p.z);
}
function turn(points,at,lane){
  const a=lanePoint(at,lane),b=lanePoint(at,-lane),next=lanePoint(at-lane,lane),dx=(a.x-next.x)*lane,dz=(a.z-next.z)*lane,len=Math.hypot(dx,dz),handle=12;
  const c={x:a.x+dx/len*handle*lane,z:a.z+dz/len*handle*lane},d={x:b.x+dx/len*handle*lane,z:b.z+dz/len*handle*lane};
  for(let i=1;i<=48;i++){const t=i/48,u=1-t;points.push(riverWaterPoint(u*u*u*a.x+3*u*u*t*c.x+3*u*t*t*d.x+t*t*t*b.x,u*u*u*a.z+3*u*u*t*c.z+3*u*t*t*d.z+t*t*t*b.z));}
}
function makeRoute(){
  const points=[];for(let z=55;z<=465;z++)points.push(lanePoint(z,1));turn(points,465,1);
  for(let z=464;z>=55;z--)points.push(lanePoint(z,-1));turn(points,55,-1);
  return makeRiverTrack(points);
}
export const MINORA_TRADE_ROUTE=makeRoute();
const wrap=d=>(d%MINORA_TRADE_ROUTE.length+MINORA_TRADE_ROUTE.length)%MINORA_TRADE_ROUTE.length;
function pose(d){const p=MINORA_TRADE_ROUTE.at(wrap(d)),a=MINORA_TRADE_ROUTE.at(wrap(d-1)),b=MINORA_TRADE_ROUTE.at(wrap(d+1));return {...p,yaw:Math.atan2(b.x-a.x,b.z-a.z)};}
export function minoraTraderPose(time,index=0){
  // The stagger keeps opposing hulls and working oars out of the same narrow
  // bends; both boats' full simultaneous cycle is checked by the route tests.
  const d=time*MINORA_SHIPPING.speed+(index?MINORA_TRADE_ROUTE.length*MINORA_SHIPPING.secondPhase:180),p=pose(d),a=pose(d-.5),b=pose(d+.5),turnRate=Math.atan2(Math.sin(b.yaw-a.yaw),Math.cos(b.yaw-a.yaw))*MINORA_SHIPPING.speed;
  return riverWorkingPose(p,MINORA_SHIPPING.speed,'sailing',turnRate);
}
export const MINORA_GUARDSHIP=RIVER_GUARD_BERTH;
