import {prepareWarExterior} from './tower-smoke.js';
import {MINORA_CIVIC_BUILDINGS} from '../../content/regions/minora-frontier/minora-civic-layout.js';
import {MINORA_CIVIC_RESIDENTS} from '../../content/regions/minora-frontier/minora-civic-residents.js';
import {minoraCivicPublicReport} from '../../content/regions/minora-frontier/minora-civic-economy.js';
import {MINORA_COUNCIL,councilPerson} from '../../content/regions/minora-frontier/minora-council.js';
const assert=(v,m)=>{if(!v)throw Error(m);};
const frame=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
const key=code=>{document.dispatchEvent(new KeyboardEvent('keydown',{code,bubbles:true,cancelable:true}));document.dispatchEvent(new KeyboardEvent('keyup',{code,bubbles:true}));};
const tick=(a,n=30)=>{for(let i=0;i<n;i++)a.step(.04);};
const people=a=>a.tower.state().residents;

export async function city(a){
  await prepareWarExterior(a);window.dispatchEvent(new Event('focus'));a.war.pause();
  const rows=[];
  for(const d of MINORA_CIVIC_RESIDENTS){
    await a.visit({x:d.x,z:d.z+5});tick(a);
    const p=people(a).people.find(p=>p.id===d.id);assert(p,d.id+' is present');
    const [x,y,z]=p.position,ground=a.groundProbe(x,z);
    assert(ground.clear,d.id+' has a clear placement');assert(Math.abs(y-ground.height)<.15,d.id+' is grounded');
    assert(people(a).constructed<=12,'Resident cache remains bounded');rows.push({id:d.id,position:p.position,visible:p.visible,phase:p.phase});
  }
  await a.visit({x:-2360,z:184});a.look({yaw:0,pitch:.22,distance:7});tick(a);await frame();
  assert(!a.state().frameErrors.length,'No frame errors');
  return {checks:['All civic residents ground on clear world terrain','Resident cache stays at twelve rigs','No frame errors'],rows,render:a.renderStats(),publicReport:minoraCivicPublicReport(a.war.state().campaign)};
}
export async function building(a){
  const b=MINORA_CIVIC_BUILDINGS.find(b=>b.service==='bakery');
  a.testWorld.setResidents(false);await a.visit({...b.entrance,z:b.entrance.z+2.5});tick(a);await frame();
  a.look({yaw:0,pitch:.18,distance:7});
  a.war.run();const before=JSON.stringify(a.war.state().campaign);assert(a.civicHost.interact(),'Building inspection opens');
  assert(a.state().mode==='briefing','Inspection holds time');tick(a,100);
  assert(JSON.stringify(a.war.state().campaign)===before,'Inspection does not advance campaign');
  assert(document.querySelector('#minora-civic-name').textContent===b.name,'Correct building shown');
  assert(!/sealed|secret|\.2|\.3|2380/i.test(document.querySelector('#minora-civic-dialog').textContent),'No private reserve data');
  await frame();return {checks:['Building purpose and ownership readable','Reading holds time','No private temple data'],building:b.id};
}
export async function relief(a){
  key('Escape');a.war.pause();a.testWorld.setResidents(true);
  await a.visit({x:-2421,z:182});a.look({yaw:Math.PI,pitch:.28,distance:11});tick(a,50);await frame();
  return {checks:['Both leagues shelter in the same city'],residents:people(a),render:a.renderStats()};
}
export async function hall(a){
  if(a.tower.state().inside)await prepareWarExterior(a);
  a.war.pause();
  await a.visit(MINORA_COUNCIL.mayor.exit);key('KeyF');
  for(let i=0;i<200&&a.state().mode==='loading';i++)await new Promise(r=>setTimeout(r,50));
  assert(a.tower.state().room==='mayor','River Hall opens');
  a.look({yaw:0,pitch:.24,distance:5});await frame();
  return {checks:['Assembly chamber entered through actual street doorway'],room:a.tower.state().room,render:a.renderStats()};
}
export async function mayor(a){
  const r=MINORA_COUNCIL.mayor;
  await a.visit({x:r.x-5.3,y:r.y,z:r.z+7.5});a.look({yaw:0,pitch:.2,distance:4});
  a.hold('KeyW',true);tick(a,110);a.hold('KeyW',false);
  assert(a.state().position[1]>r.y+4.9,'Player walks up real hall stairs');
  await a.visit({x:r.x-5.3,y:r.y+5.4,z:r.z-5.5});a.look({yaw:Math.PI,pitch:.2,distance:4});
  a.hold('KeyW',true);tick(a,110);a.hold('KeyW',false);
  assert(a.state().position[1]<r.y+.4,'Player can descend to Assembly');
  const p=councilPerson('mayor');await a.visit({x:p.x+1.7,y:p.y,z:p.z+2.2});a.look({yaw:.5,pitch:.15,distance:5});tick(a,5);key('KeyF');
  assert(a.council.state().met.includes('mayor'),'Mayor reachable upstairs');
  assert(a.state().position[1]>MINORA_COUNCIL.mayor.y+4,'Office is above Assembly');
  await frame();assert(!a.state().frameErrors.length,'No frame errors');
  return {checks:['Stairs walked up and down','Mayor can be met in upstairs office','No frame errors'],position:a.state().position};
}
export async function saves(a){
  key('Escape');const p=councilPerson('mayor');
  assert(a.save().ok,'Save upstairs succeeds');await a.loadSaved();
  assert(a.tower.state().room==='mayor'&&Math.abs(a.state().position[1]-p.y)<.2,'Continue retains upper office');
  const r=MINORA_COUNCIL.mayor;
  await a.visit({x:r.x+12,y:r.y,z:r.z+14});
  assert(a.tower.state().room==='mayor'&&a.state().mode==='playing','Legacy hall position safely relocated');
  assert(Math.abs(a.state().position[0]-r.x)<.5&&Math.abs(a.state().position[1]-r.y)<.2,'Legacy position lands in lower entry');
  assert(!a.state().frameErrors.length,'No frame errors after restore');
  await frame();return {checks:['Upper office Save/Continue preserves floor','Old oversized hall coordinates recover at entry','No frame errors']};
}
