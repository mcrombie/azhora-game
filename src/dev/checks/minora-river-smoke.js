import {prepare,view} from './caricas-polish-smoke.js';
import * as story from './taleth-story-smoke.js';
const assert=(ok,text)=>{if(!ok)throw Error(text);};
export {prepare};
export async function waterfront(a){
  const shot=await view(a,{x:-2192,z:205},{yaw:1.4,pitch:.52,distance:90});
  const traffic=a.testWorld.riverTrafficState();assert(traffic?.ships===3,'Exterior has one guard and two traders');
  const before=traffic.positions[1];for(let i=0;i<100;i++)a.step(.04);
  const after=a.testWorld.riverTrafficState().positions[1];assert(Math.hypot(before.x-after.x,before.z-after.z)>3,'Actual exterior boats move');
  return {shot,traffic};
}
export async function bridge(a){return view(a,{x:-2204,z:135},{yaw:1.9,pitch:.2,distance:30});}
export async function galley(a){return view(a,{x:-2219,z:196},{yaw:1.5,pitch:.2,distance:28});}
export async function lookout(a){
  await story.settled(a);await story.river(a);window.dispatchEvent(new Event('focus'));
  for(let i=0;i<20;i++)a.step(.04);
  const panorama=a.tower.state().panorama,traffic=a.testWorld.riverTrafficState();assert(traffic?.ships===3&&traffic.updates>1,'Lookout has live river traffic');
  assert(!a.state().frameErrors.length,'No renderer errors');
  return {panorama,render:a.renderStats()};
}
