import {getMovementInput,moveCharacter,waterAt} from '../../gameplay/movement/locomotion.js';

// Movement has fixed tuning here: no skill levels, experience, health or encounters.
export function explorationMovement(position,world){
  let vertical=0,grounded=true,swimming=false,heading=Math.PI;
  const support=(x,z)=>world.supportAt?.(x,z,{maxY:position.y,stepUp:.45})?.height??world.heightAt(x,z);
  const collision={...world,heightAt:support};
  return {
    step(keys,yaw,dt,{walk=4.5,run=7,radius=.34,swimming:allowSwimming=true,wadingDepth=0,swim=3.4,swimDepth=.1,swimOffset=.65}={}){
      dt=Math.min(.04,Math.max(0,dt));
      const afloat=allowSwimming&&support(position.x,position.z)<waterAt(position.x,position.z,world)-swimDepth;
      const input=getMovementInput(keys),speed=afloat?swim:keys.has('ShiftLeft')||keys.has('ShiftRight')||keys.has('Tab')?run:walk;
      const dx=(-Math.sin(yaw)*input.forward+Math.cos(yaw)*input.side)*speed*dt;
      const dz=(-Math.cos(yaw)*input.forward-Math.sin(yaw)*input.side)*speed*dt;
      const before={x:position.x,z:position.z};let waiting=null,blockedBoundary=false;
      collision.waterAt=(x,z)=>waterAt(x,z,world)-(allowSwimming?0:wadingDepth);
      const depth=(x,z)=>waterAt(x,z,collision)-support(x,z),recoverShore=!allowSwimming&&depth(position.x,position.z)>0;
      moveCharacter(position,dx,dz,collision,radius,{swimming:allowSwimming||recoverShore,canTraverse:(px,pz,x,z)=>{
        if(world.canExploreAt&&!world.canExploreAt(x,z)){blockedBoundary=true;return false;}
        if(recoverShore&&depth(x,z)>0&&depth(x,z)>=depth(px,pz)-1e-6)return false;
        if(world.readyAt(x,z))return true;waiting={x,z};return false;
      }});
      const moved=Math.hypot(position.x-before.x,position.z-before.z);
      if(moved>.001)heading=Math.atan2(dx,dz);
      const ground=support(position.x,position.z),water=waterAt(position.x,position.z,world);
      swimming=allowSwimming&&ground<water-swimDepth;
      const floor=swimming?water-swimOffset:ground;
      if(grounded&&position.y-floor<.65)position.y=floor;
      else {grounded=false;vertical-=20*dt;position.y+=vertical*dt;if(position.y<=floor){position.y=floor;grounded=true;vertical=0;}}
      return {speed:moved/Math.max(dt,.001),grounded,swimming,heading,waiting,blockedBoundary,
        blockedWater:!allowSwimming&&Math.hypot(dx,dz)>0&&moved<.01&&depth(before.x+dx,before.z+dz)>0};
    },
    jump(){if(grounded&&!swimming){vertical=8.2;grounded=false;return true;}return false;},
    reset(value=heading){vertical=0;grounded=true;swimming=false;heading=value;},
    state:()=>({grounded,swimming,heading}),
  };
}
