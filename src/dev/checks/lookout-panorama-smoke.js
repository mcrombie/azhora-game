import * as story from './taleth-story-smoke.js';
const assert=(ok,message)=>{if(!ok)throw Error(message);};
let buildMs;
export async function settled(a){
  const result=await story.settled(a);
  assert(a.tower.state().panorama===null,'Distant scenery is not built during the opening');
  return result;
}
export async function river(a){
  const result=await story.river(a),s=a.state(),p=a.tower.state().panorama;
  assert(s.panoramic&&!s.heroVisible&&s.cameraFov===66,'River dialogue uses unobstructed first-person framing');
  assert(s.enabledRegions.length===5,'The panorama does not unlock more playable regions');
  assert(p.prepared&&p.regions.some(r=>r.name==='Elagos')&&p.regions.some(r=>r.name==='East Pyros'),'Distant scenery stays within its static mesh budget');
  buildMs=p.buildMs;
  return {...result,panorama:p,render:JSON.parse(JSON.stringify(a.renderStats()))};
}
export const politics=story.politics;
export async function east(a){
  const result=await story.east(a),s=a.state();
  assert(s.panoramic&&!s.heroVisible&&s.cameraFov===45,'Ambron dialogue uses the east-facing first-person camera');
  assert(a.tower.state().panorama.buildMs===buildMs,'Changing view reuses the scenery');
  return {...result,render:JSON.parse(JSON.stringify(a.renderStats()))};
}
export async function complete(a){
  const result=await story.complete(a),s=a.state();
  assert(!s.panoramic&&s.heroVisible&&s.cameraFov===55,'Ordinary character camera returns after the dialogue');
  assert(!a.tower.state().panorama.visible,'Distant city is hidden in the chamber');
  return result;
}
