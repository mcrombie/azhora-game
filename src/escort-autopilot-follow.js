import { clearLine, freeDirection, moveInput } from './autopilot.js';

const gap=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const still=()=>({forward:0,side:0,run:false});
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

/** Follow a moving quest guide with an analogue walking input. Matching the guide's
 * pace avoids repeatedly pressing/releasing forward at the desired following gap.
 * Translation has an explicit yaw basis, so a gently turning camera cannot steer
 * the traveler away from the breadcrumb path and start a correction oscillation. */
export function createEscortFollower({world,distance=3,walkSpeed=4.2,guideSpeed=2.8}={}){
  let trail=[],lastGuide=null,sample=null,lastPosition=null,lastDt=0,pace=0,speed=0,stuck=0,detour=0,side=1;
  function reset(){trail=[];lastGuide=sample=lastPosition=null;lastDt=pace=speed=stuck=detour=0;side=1;}
  function step(position,guide,dt){
    if(!Number.isFinite(dt)||dt<=0)return {move:still(),yaw:null};
    dt=Math.min(dt,.25);
    if(lastGuide&&gap(guide,lastGuide)>Math.max(2,walkSpeed*lastDt*3)
      ||lastPosition&&gap(position,lastPosition)>Math.max(3,walkSpeed*lastDt*3))reset();
    const separation=gap(position,guide);
    if(lastGuide){
      const measured=Math.min(walkSpeed,gap(guide,lastGuide)/Math.max(lastDt,1/240));
      pace+=(measured-pace)*(1-Math.exp(-8*dt));
    }else pace=separation>distance?guideSpeed:0;
    if(!sample||gap(guide,sample)>.6){trail.push({x:guide.x,z:guide.z});sample={...guide};}
    while(trail.length>1){
      const here=trail[0],next=trail[1];
      const passed=(position.x-here.x)*(next.x-here.x)+(position.z-here.z)*(next.z-here.z)>0;
      if(gap(position,here)<1.2||(passed&&clearLine(position,next,world)))trail.shift();else break;
    }
    const target=trail.length>1?trail[0]:guide;
    // A guide can halt to wait, finish, or turn. Decelerate into the gap, and stop
    // immediately if already inside personal space rather than pushing their body.
    const wanted=clamp(pace+(separation-distance)*1.8,0,walkSpeed);
    const change=(wanted>speed?5:8)*dt;
    speed+=clamp(wanted-speed,-change,change);
    if(separation<=Math.max(1.5,distance-.9)||speed<.015&&wanted<.015)speed=0;
    if(lastPosition&&lastDt>0&&speed>.5){
      const actual=gap(position,lastPosition)/lastDt;
      stuck=actual<speed*.15?stuck+dt:0;
    }else stuck=0;
    if(stuck>1.6){side=-side;detour=.65;stuck=0;}
    lastPosition={...position};lastGuide={...guide};lastDt=dt;
    if(speed===0)return {move:still(),yaw:null};
    let direction=freeDirection(position,target,world,side);
    if(detour>0){
      detour-=dt;const sideways={x:direction.z*side,z:-direction.x*side};
      if(clearLine(position,{x:position.x+sideways.x,z:position.z+sideways.z},world))direction=sideways;
    }
    const yaw=Math.atan2(-direction.x,-direction.z),input=moveInput(yaw,direction.x,direction.z),amount=speed/walkSpeed;
    return {yaw,move:{forward:input.forward*amount,side:input.side*amount,run:false,basisYaw:yaw}};
  }
  return {step,reset};
}
