import { PENINSULA_TUTORIAL_ANCHORS as A } from './peninsula-tutorial.js';
const mix=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:(a.y??0)+((b.y??0)-(a.y??0))*t,z:a.z+(b.z-a.z)*t});
const clamp=t=>Math.max(0,Math.min(1,t));
/** A sheltered approach to the new pier. Retains the first-person arrival and
 * the companion in the bow, with a short walk onto the ramp. */
export function peninsulaOpening(seconds){
  const t=clamp(seconds/12),path=[{x:132,z:95},{x:137,z:75},{x:143,z:58}],leg=t<.6?0:1,u=t<.6?t/.6:(t-.6)/.4;
  const boat=mix(path[leg],path[leg+1],u);boat.yaw=Math.atan2(path[leg+1].x-path[leg].x,path[leg+1].z-path[leg].z);
  const aboard=seconds<12,step=clamp((seconds-12)/6),dock={x:144,y:2.1,z:53};
  const traveler=aboard?{...boat,y:1.75}:mix(dock,{...A.arrival,y:2.1},step);
  traveler.yaw=aboard?boat.yaw:Math.PI/2;
  const companion=aboard?{x:boat.x+Math.sin(boat.yaw)*2,y:.35,z:boat.z+Math.cos(boat.yaw)*2,yaw:boat.yaw,aboard:true,walking:false}
    :{...mix({x:147,y:2,z:53},{...A.chris,y:2},clamp(step+ .18)),yaw:Math.PI/2,walking:true,aboard:false};
  return {done:seconds>=18,boat,traveler,companion,bobWeight:aboard?1:0,
    camera:{position:{x:traveler.x,y:traveler.y+1.3,z:traveler.z},target:aboard?{x:158,y:2.5,z:50}:{x:168,y:3,z:49}},
    caption:{eyebrow:'A FIRST SHORE',text:aboard?'Jojo is waiting on the training peninsula.':'A sandwich, a few lessons, and the road ahead.',alpha:1}};
}
