import {menu} from './tower-floors-smoke.js';
import {TOWER} from '../../app/exploration/tower-state.js';
import {SNERO_WINDOWS} from '../../content/regions/minora-frontier/snero-window-views.js';
export {menu};
const checks=[],assert=(ok,label)=>{if(!ok)throw Error(label);checks.push(label);console.log('EXPLORATION_CHECK '+label);};
const frame=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
const windows=a=>a.testWorld.state().guild.senro.windows;
const report=a=>({checks:[...checks],windows:windows(a),render:a.renderStats(),camera:a.state().cameraPosition,position:a.state().position});
let clock,center;
export async function opening(a){
  window.dispatchEvent(new Event('focus'));a.step(0);clock=JSON.stringify(a.war.clock());
  assert(windows(a).remoteScenes===0,'Opening Taleth room does not load any window landscapes');
  return report(a);
}
export async function view(a,id,offset=0,depth=2.5){
  const v=SNERO_WINDOWS.find(v=>v.id===id),normal={x:Math.sin(v.yaw),z:Math.cos(v.yaw)},right={x:Math.cos(v.yaw),z:-Math.sin(v.yaw)};
  await a.visit({x:TOWER.x+v.x+normal.x*depth+right.x*offset,y:TOWER.y-10.8,z:TOWER.z+v.z+normal.z*depth+right.z*offset});
  a.look({yaw:v.yaw,pitch:.12,distance:4});a.step(0);
  const end=performance.now()+20000;
  while(!windows(a).views.find(r=>r.id===id).frames&&performance.now()<end){await new Promise(r=>setTimeout(r,40));}
  await frame();const r=windows(a).views.find(r=>r.id===id);
  assert(r.ready&&!r.error&&r.frames>0,id+' renders real 3D terrain through the opening');
  assert(r.drawCalls>0&&r.triangles>100,id+' draws landscape geometry');
  assert(!a.tower.state().exteriorLoaded&&windows(a).remoteSimulations===0,'Window views leave the campaign exterior unloaded');
  assert(JSON.stringify(a.war.clock())===clock,'Viewing '+id+' holds the campaign clock');
  if(id==='drent'&&offset===0)center={eye:r.eye,projection:r.projection};
  if(id==='drent'&&offset!==0){assert(JSON.stringify(r.eye)!==JSON.stringify(center.eye),'Moving beside Drent changes the remote viewpoint');assert(JSON.stringify(r.projection)!==JSON.stringify(center.projection),'Moving beside Drent changes its off-axis frustum');}
  return report(a);
}
export async function finish(a){
  const frames=windows(a).views.map(r=>r.frames);await a.visit({x:TOWER.x,y:TOWER.y,z:TOWER.z+5});a.step(0);await frame();
  for(let i=0;i<8;i++)a.step(.04);
  assert(windows(a).activeCount===0&&windows(a).views.every((r,i)=>r.frames===frames[i]),'Leaving Snero stops all remote rendering');
  assert(a.state().frameErrors.length===0,'Window visit has no rendering errors');
  a.look({pitch:.12,distance:5});const saved=a.save();assert(saved.ok,'Tower saves after the live windows: '+(saved.reason??'ok'));
  await a.loadSaved();a.resume();window.dispatchEvent(new Event('focus'));a.step(0);await frame();
  assert(windows(a).activeCount===0&&a.state().position[1]===TOWER.y,'Continue restores the saved floor without rendering its cached remote scenery');
  return report(a);
}
