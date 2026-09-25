const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const angleDelta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const look=sample=>{
  const dx=sample.focus.x-sample.camera.x,dy=sample.focus.y-sample.camera.y,dz=sample.focus.z-sample.camera.z;
  return {heading:Math.atan2(dx,dz),pitch:Math.atan2(dy,Math.hypot(dx,dz))};
};

/** Observe live renderer frames, not planner promises. Only measure steady escort
 * travel; dialogue, fights, pause, reload and a guide deliberately waiting are
 * separate states. Rates expose repeated shake without rejecting a road corner. */
export function createEscortMotionChecks(){
  let previous=null,lastSpeed=null,lastInput=null,lastAngular=null,warmup=0;
  const totals={seconds:0,samples:0,stops:0,inputStops:0,speedJumps:0,cameraReversals:0,maxSpeedJump:0};
  function resetWindow(){previous=null;lastSpeed=lastInput=lastAngular=null;warmup=0;}
  function observe(sample,following){
    if(!following||!sample?.guide||!sample?.camera||!sample?.focus){resetWindow();return;}
    const before=previous;previous=sample;if(!before)return;
    const dt=sample.time-before.time;
    if(dt<=0||dt>.25){lastSpeed=lastInput=lastAngular=null;warmup=0;return;}
    const guidePace=distance(sample.guide,before.guide)/dt,separation=distance(sample.position,sample.guide);
    if(guidePace<1.5||guidePace>4.5||separation<2||separation>6){lastSpeed=lastInput=lastAngular=null;warmup=0;return;}
    warmup+=dt;
    const speed=distance(sample.position,before.position)/dt,input=Math.hypot(sample.input.forward,sample.input.side);
    const currentLook=look(sample),oldLook=look(before),angular={heading:angleDelta(currentLook.heading,oldLook.heading)/dt,pitch:(currentLook.pitch-oldLook.pitch)/dt};
    if(warmup>2&&lastSpeed!==null){
      totals.seconds+=dt;totals.samples++;
      if((speed>.25)!==(lastSpeed>.25))totals.stops++;
      if((input>.06)!==(lastInput>.06))totals.inputStops++;
      const jump=Math.abs(speed-lastSpeed);totals.maxSpeedJump=Math.max(totals.maxSpeedJump,jump);
      if(jump>1.2)totals.speedJumps++;
      if(lastAngular&&['pitch','heading'].some(key=>Math.abs(angular[key])>.025&&Math.abs(lastAngular[key])>.025&&angular[key]*lastAngular[key]<0))totals.cameraReversals++;
    }
    lastSpeed=speed;lastInput=input;lastAngular=angular;
  }
  function result(){const seconds=Math.max(totals.seconds,.001);return {...totals,stopRate:totals.stops/seconds,inputStopRate:totals.inputStops/seconds,
    speedJumpRate:totals.speedJumps/seconds,cameraReversalRate:totals.cameraReversals/seconds};}
  return {observe,result,resetWindow};
}
