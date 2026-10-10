import * as preview from './lookout-preview-smoke.js';
import {LOOKOUT,LOOKOUT_DOOR,TALETH_SPOT} from '../../app/exploration/tower-state.js';
const assert=(v,m)=>{if(!v)throw Error(m);};
const click=id=>document.getElementById(id).click();
const frames=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
let buildMs,hash,campaign,colliders;
async function shot(a,name){
  for(let i=0;i<(a.state().panoramic?500:20);i++)a.step(.04);await frames();
  const stats=[],baseline=[];for(let i=0;i<60;i++){await new Promise(r=>requestAnimationFrame(r));baseline.push(a.renderStats({withoutLookoutLandscape:true}));stats.push(a.renderStats());}
  const p=a.tower.state().panorama;
  assert(p.visible&&p.prepared,'Prepared landscape is visible throughout the lookout');
  assert(a.state().enabledRegions.length===5,'Five-region gameplay boundary stays intact');
  assert(!a.state().frameErrors.length,'No landscape frame errors');
  return {name,position:a.state().position,camera:a.state().camera,panorama:p,
    render:{...stats.at(-1),meanCpuMs:stats.reduce((n,s)=>n+s.cpuMs,0)/stats.length},baseline:{...baseline.at(-1),meanCpuMs:baseline.reduce((n,s)=>n+s.cpuMs,0)/baseline.length},heap:performance.memory?.usedJSHeapSize};
}
export async function river(a){
  preview.river(a);campaign=JSON.stringify(a.war.state().campaign);colliders=a.testWorld.colliders.length;
  const p=a.tower.state().panorama;buildMs=p.buildMs;hash=p.sourceHash;
  assert(['Telemonia','Elagos','East Pyros','West Pyros','Central Ibenwood'].every(name=>p.regions.some(r=>r.name===name)),'Both authored landmarks are prepared');
  assert(p.optimization.maxOmittedDiameterPixels<1,'Optimization only removes subpixel objects');
  return shot(a,'river dialogue');
}
export async function east(a){preview.east(a);return shot(a,'Ambron dialogue');}
async function walk(a,x,z){
  window.dispatchEvent(new Event('focus'));let reached=false;
  for(let i=0;i<900;i++){
    const p=a.state().position,dx=x-p[0],dz=z-p[2];if(Math.hypot(dx,dz)<.35){reached=true;break;}
    a.look({yaw:Math.atan2(-dx,-dz),pitch:.16,distance:5});a.hold('KeyW',true);a.step(1/60);
  }
  a.hold('KeyW',false);assert(reached,'Player can walk between rooftop viewpoints without a loading transition');
  assert(a.state().mode==='playing'&&a.state().position[1]===LOOKOUT.y,'Walking remains on the real rooftop');
}
export async function south(a){
  click('tower-close');assert(!a.state().panoramic&&a.state().heroVisible,'Dialogue closes to free rooftop control');
  await walk(a,LOOKOUT.x+5,LOOKOUT.z+7.8);a.look({yaw:Math.PI+.27,pitch:.2,distance:12});return shot(a,'Telemonia from south parapet');
}
export async function pyra(a){await walk(a,LOOKOUT.x+5,LOOKOUT.z);await walk(a,LOOKOUT.x-4,LOOKOUT.z);await walk(a,LOOKOUT.x-4,LOOKOUT.z+7.5);a.look({yaw:Math.PI-.60,pitch:.2,distance:12});return shot(a,'Pyra and the Pyros regions from southwest parapet');}
export async function west(a){
  await walk(a,LOOKOUT.x-4,LOOKOUT.z+7.5);await walk(a,LOOKOUT.x-4,LOOKOUT.z);await walk(a,LOOKOUT.x-7.5,LOOKOUT.z);a.look({yaw:Math.PI/2,pitch:.2,distance:12});return shot(a,'west parapet');
}
export async function north(a){
  await walk(a,LOOKOUT.x-7.5,LOOKOUT.z-7.5);await walk(a,LOOKOUT.x,LOOKOUT.z-7.5);a.look({yaw:0,pitch:.2,distance:12});return shot(a,'north parapet');
}
export async function freeEast(a){
  await walk(a,LOOKOUT.x+7.5,LOOKOUT.z-7.5);await walk(a,LOOKOUT.x+7.5,LOOKOUT.z);a.look({yaw:-Math.PI/2,pitch:.2,distance:12});return shot(a,'Ambron from east parapet');
}
async function ready(a){for(let i=0;i<900&&a.state().mode==='loading';i++)await new Promise(r=>setTimeout(r,50));assert(a.state().mode==='playing','Room transition completes');}
export async function lifecycle(a){
  assert(a.testWorld.colliders.length===colliders,'Distant scenery adds no rooftop collision');
  assert(a.save().ok,'Rooftop free exploration saves');await a.loadSaved();
  assert(a.tower.state().panorama.visible&&a.tower.state().room==='lookout','Continue restores landscape outside dialogue');
  await a.visit({...LOOKOUT_DOOR,z:LOOKOUT_DOOR.z-1});a.tower.interact();await ready(a);
  assert(a.tower.state().room==='tower'&&!a.tower.state().panorama.visible,'Landscape hides in the chamber');
  await a.visit({...TALETH_SPOT,z:TALETH_SPOT.z+2});a.tower.interact();click('tower-next');await ready(a);
  const p=a.tower.state().panorama;
  assert(p.visible&&p.buildMs===buildMs&&p.sourceHash===hash,'Revisiting reuses the prepared landscape');
  assert(JSON.stringify(a.war.state().campaign)===campaign,'Lookout exploration leaves the settled campaign untouched');
  a.look({yaw:Math.PI+.27,pitch:.14,distance:4});return shot(a,'returned lookout');
}
