import { clearLine, freeDirection, moveInput } from './autopilot.js';
import { LOCOMOTION } from '../movement/locomotion-skills.js';

const gap=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const still=()=>({forward:0,side:0,run:false});
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

/** Follow a moving quest guide with an analogue walking input. Matching the guide's
 * pace avoids repeatedly pressing/releasing forward at the desired following gap.
 * Translation has an explicit yaw basis, so a gently turning camera cannot steer
 * the traveler away from the breadcrumb path and start a correction oscillation.
 * A guide faster than a walk (Cagney runs home) is followed at a run, which is faster still. */
export function createEscortFollower({world,distance,walkSpeed=LOCOMOTION.walkStart,runSpeed=LOCOMOTION.runStart,guideSpeed=2.8}={}){
  // Behind a runner he keeps a longer gap and changes pace harder, or her stopping puts him in her back.
  const running=guideSpeed>walkSpeed;
  distance??=running?4.5:3;
  let trail=[],lastGuide=null,sample=null,lastPosition=null,lastDt=0,pace=0,speed=0,stuck=0,detour=0,side=1;
  function reset(){trail=[];lastGuide=sample=lastPosition=null;lastDt=pace=speed=stuck=detour=0;side=1;}
  function step(position,guide,dt,movementSpeeds){
    if(!Number.isFinite(dt)||dt<=0)return {move:still(),yaw:null};
    dt=Math.min(dt,.25);
    // Inputs are fractions of the current host pace, including skill and combat
    // modifiers. Keep our smoothed command in metres/second across those changes.
    const walking=movementSpeeds?.walking??walkSpeed,runningSpeed=movementSpeeds?.running??runSpeed;
    // Hurt/dodge animations can temporarily make both host speeds zero.
    if(!(walking>0)||!(runningSpeed>0)){
      speed=0;lastPosition={...position};lastGuide={...guide};lastDt=dt;
      return {move:still(),yaw:null};
    }
    // Keep running available to catch a running guide even once mastery lets
    // the traveler match that guide at a walk.
    const top=(running||guideSpeed>walking)?runningSpeed:walking,brisk=top/walking;
    if(lastGuide&&gap(guide,lastGuide)>Math.max(2,top*lastDt*3)
      ||lastPosition&&gap(position,lastPosition)>Math.max(3,top*lastDt*3))reset();
    const separation=gap(position,guide);
    if(lastGuide){
      const measured=Math.min(top,gap(guide,lastGuide)/Math.max(lastDt,1/240));
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
    const wanted=clamp(pace+(separation-distance)*1.8,0,top);
    const change=(wanted>speed?5:8)*brisk*dt;
    // Exhaustion can reduce a requested run to walking immediately. Never
    // emit more than full input while our previous velocity decelerates.
    speed=clamp(speed+clamp(wanted-speed,-change,change),0,top);
    if(separation<=Math.max(1.5,Math.min(2.1,distance-.9))||speed<.015&&wanted<.015)speed=0;
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
    const run=speed>walking,yaw=Math.atan2(-direction.x,-direction.z),input=moveInput(yaw,direction.x,direction.z),amount=speed/(run?runningSpeed:walking);
    return {yaw,move:{forward:input.forward*amount,side:input.side*amount,run,basisYaw:yaw}};
  }
  return {step,reset};
}
