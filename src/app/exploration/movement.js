import {getMovementInput,moveCharacter,waterAt} from '../../gameplay/movement/locomotion.js';
import {resolveVerticalMotion} from '../../gameplay/movement/vertical-motion.js';

// Movement has fixed tuning here: no skill levels, experience, health or encounters.
export function explorationMovement(position,world){
  let vertical=0,grounded=true,swimming=false,onObstacle=false,heading=Math.PI;
  const support=(x,z)=>world.supportAt?.(x,z,{maxY:position.y,stepUp:.45})?.height??world.heightAt(x,z);
  const collision={...world,heightAt:support};
  return {
    step(keys,yaw,dt,{walk=4.5,run=7,radius=.34,bodyHeight=1.75,swimming:allowSwimming=true,wadingDepth=0,swim=3.4,swimDepth=.1,swimOffset=.65}={}){
      dt=Math.min(.04,Math.max(0,dt));
      const startWater=waterAt(position.x,position.z,world);
      const afloat=allowSwimming&&support(position.x,position.z)<startWater-swimDepth&&(grounded||position.y<=startWater-swimOffset+.01);
      const input=getMovementInput(keys),speed=afloat?swim:keys.has('ShiftLeft')||keys.has('ShiftRight')||keys.has('Tab')?run:walk;
      const dx=(-Math.sin(yaw)*input.forward+Math.cos(yaw)*input.side)*speed*dt;
      const dz=(-Math.cos(yaw)*input.forward-Math.sin(yaw)*input.side)*speed*dt;
      const before={x:position.x,z:position.z};let waiting=null,blockedBoundary=false;
      collision.waterAt=(x,z)=>waterAt(x,z,world)-(allowSwimming?0:wadingDepth);
      collision.bodyHeight=bodyHeight;
      const depth=(x,z)=>waterAt(x,z,collision)-support(x,z),recoverShore=!allowSwimming&&depth(position.x,position.z)>0;
      moveCharacter(position,dx,dz,collision,radius,{swimming:allowSwimming||recoverShore,canTraverse:(px,pz,x,z)=>{
        if(world.canExploreAt&&!world.canExploreAt(x,z)){blockedBoundary=true;return false;}
        if(recoverShore&&depth(x,z)>0&&depth(x,z)>=depth(px,pz)-1e-6)return false;
        if(world.readyAt(x,z))return true;waiting={x,z};return false;
      }});
      const moved=Math.hypot(position.x-before.x,position.z-before.z);
      if(moved>.001)heading=Math.atan2(dx,dz);
      const ground=support(position.x,position.z),water=waterAt(position.x,position.z,world);
      const wet=allowSwimming&&ground<water-swimDepth;
      const floor=wet?water-swimOffset:ground;
      const followGround=grounded&&position.y-floor<.65;
      vertical=followGround?0:vertical-20*dt;
      const result=resolveVerticalMotion(world,{x:position.x,z:position.z,radius,bodyHeight,fromY:position.y,toY:followGround?floor:position.y+vertical*dt,velocity:vertical,floor});
      position.y=result.y;vertical=result.velocity;grounded=result.grounded;
      onObstacle=grounded&&position.y>floor+.05;
      swimming=wet&&position.y<=floor+.01;
      return {speed:moved/Math.max(dt,.001),grounded,swimming,onObstacle,heading,verticalSpeed:vertical,waiting,blockedBoundary,
        blockedWater:!allowSwimming&&Math.hypot(dx,dz)>0&&moved<.01&&depth(before.x+dx,before.z+dz)>0};
    },
    jump(speed=8.2){if(grounded&&!swimming){vertical=speed;grounded=false;return true;}return false;},
    reset(value=heading){vertical=0;grounded=true;swimming=false;onObstacle=false;heading=value;},
    state:()=>({grounded,swimming,onObstacle,heading,verticalSpeed:vertical}),
  };
}
