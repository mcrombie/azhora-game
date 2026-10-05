import { PYRA, pyraLocal } from './pyra-world.js';
import { BODY, bodyWorld } from './bodies.js';
import { canStand, moveCharacter } from './game-state.js';
import { WALK_STEP } from './walk-surfaces.js';
import { shouldStartTerrainFall } from './terrain-fall.js';
const gap=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const check=(yes,message)=>{if(!yes)throw new Error(`Pyra: ${message}`);};
export function runPyraChecks(world){
 check(world.pyra?.root,'city is installed');
 const journeys=[];
 for(const route of world.pyra.walkRoutes){
  const at={...route.points[0],y:world.heightAt(route.points[0].x,route.points[0].z)},walking=bodyWorld(world).moving(at,BODY.traveler);
  for(const [direction,points] of [['out',route.points],['return',[...route.points].reverse()]]){
   let steps=0,distance=0,peak=at.y;
   for(const goal of points.slice(1))while(gap(at,goal)>.012){
    check(++steps<18000,`${route.id} exceeds movement budget`);
    const before={...at},d=gap(at,goal),step=Math.min(.12,d);
    moveCharacter(at,(goal.x-at.x)/d*step,(goal.z-at.z)/d*step,walking,BODY.traveler);
    const local=pyraLocal(at.x,at.z),label=`${route.id} ${direction} at ${local.u.toFixed(2)},${local.v.toFixed(2)} y=${at.y.toFixed(2)}`;
    check(gap(before,at)>.00001,`${label}: blocked`);
    const floor=world.supportAt(at.x,at.z,{maxY:before.y,stepUp:WALK_STEP});
    check(!shouldStartTerrainFall({before,after:at,floor:floor.height,groundSlope:floor.slope}),`${label}: lost support, floor=${floor.height}`);
    at.y=floor.height;check(canStand(at.x,at.z,walking),`${label}: enters solid`);distance+=gap(before,at);peak=Math.max(peak,at.y);
   }
   const goal=points.at(-1);check(Math.abs(at.y-goal.y)<.12,`${route.id} ${direction}: wrong destination height ${at.y}, expected ${goal.y}`);
   journeys.push({id:`${route.id}-${direction}`,distance,steps,peak,end:{...at}});
  }
 }
 check(journeys.some(j=>j.peak>=PYRA.palace-.1),'the spiral reaches the palace');
 return {ok:true,journeys,metrics:world.pyra.metrics};
}
