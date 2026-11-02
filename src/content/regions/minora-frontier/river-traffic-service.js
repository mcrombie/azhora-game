import {minoraTraderPose} from './minora-river-route.js';
import {reserveRiverPassage} from './river-traffic-reservation.js';

// Owned by one exploration scene. Pausing and skipping use the same clock as
// the visible boats; no global reservations survive a return to the launcher.
export function createRiverTrafficService(){
  let active=null,offset=0;
  function settle(time){
    if(active&&time>=active.start+active.plan.trafficDuration){
      const end=active.start+active.plan.trafficDuration;
      offset=active.plan.trafficTimeAt(active.plan.trafficDuration)-end;active=null;
    }
  }
  function shipsAt(time){
    settle(time);
    return active?active.plan.shipsAt(Math.max(0,time-active.start)):[0,1].map(i=>minoraTraderPose(time+offset,i));
  }
  function reserve(route,time){
    settle(time);
    const prior=active,prefix=prior?Math.max(0,prior.start+prior.plan.trafficDuration-time):0;
    const ambient=prior?prior.plan.trafficTimeAt(prior.plan.trafficDuration):time+offset;
    const next=reserveRiverPassage(route,ambient);if(!next)return null;
    const plan=prefix?{...next,duration:prefix+next.duration,trafficDuration:prefix+next.trafficDuration,clearanceSeconds:prefix+next.clearanceSeconds,
      at:t=>t<prefix?{...route.at(0),phase:'waiting',speed:0,rowing:false}:next.at(t-prefix),
      shipsAt:t=>t<prefix?prior.plan.shipsAt(time+t-prior.start):next.shipsAt(t-prefix),
      trafficTimeAt:t=>t<prefix?prior.plan.trafficTimeAt(time+t-prior.start):next.trafficTimeAt(t-prefix),
    }:next;
    active={start:time,plan};return plan;
  }
  return {shipsAt,reserve,reset(){active=null;offset=0;},state(time){settle(time);return {reserved:!!active,remaining:active?Math.max(0,active.start+active.plan.trafficDuration-time):0};}};
}
