import {CARICAS_COLUMN_LENGTH as COLUMN_LENGTH,columnRoadPoint} from '../../app/exploration/war-columns.js';
const assert=(value,message)=>{if(!value)throw Error(message);};
const frames=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
let saved,previous;
export async function roadLight(api){
  window.dispatchEvent(new Event('focus'));
  api.war.pause();saved=api.war.save(api.snapshot());previous=api.state().position;
  assert(api.war.state().campaign.day===1,'First marching orders already issued at Taleth confirmation');
  api.war.trackRoute();await api.visit({x:-2320,z:430});api.look({yaw:Math.PI,pitch:.15,distance:9});api.step(.04);await frames();
  const selected=api.war.state(),event=api.war.minimapEvents().find(m=>m.target.kind==='army'&&m.target.id===selected.tracking.target.id);
  assert(selected.light.visible&&event,'Selected distant army has a directional light');
  assert(Math.hypot(selected.light.location.x-event.x,selected.light.location.z-event.z)<.01,'Light points at the army, not an intermediate crossing');
  assert(!/Guild Way|ford|bridge/i.test(selected.light.label),'No intermediate road marker');
  assert(api.save().ok,'Selected army saves');await api.loadSaved();api.war.pause();api.step(.04);
  assert(api.war.state().tracking?.target.id===selected.tracking.target.id,'Continue preserves selected army');
  const campaign=JSON.stringify(api.war.state().campaign);
  api.war.track(null);api.step(.04);assert(!api.war.state().light.visible,'Stop clears the only light');
  api.war.trackRoute();api.step(.04);assert(JSON.stringify(api.war.state().campaign)===campaign,'Changing guidance cannot change the war');
  return {checks:['Briefing issues first orders immediately','Selected light points directly at the distant army','Stop removes light; selecting it leaves campaign unchanged']};
}
export async function column(api){
  await api.visit({x:-2082,z:351});api.look({yaw:0,pitch:.2,distance:10});api.step(.04);
  // Prepare the short authored approach, then check it against the real scenery.
  for(let d=0;d<=COLUMN_LENGTH;d+=1){const p=columnRoadPoint(d,'caricas');await api.testWorld.prepare(p.x,p.z);const probe=api.groundProbe(p.x,p.z);assert(probe.clear,'Column road obstructed: '+JSON.stringify(probe));}
  api.war.run();for(let i=0;i<300;i++)api.step(.04);api.war.pause();api.step(.04);
  let view=api.war.state().columns;assert(view.visible&&view.soldiers.length>=3,'Actual West Lizeem marching column appears on the Caricas farm road');
  for(const [x,y,z] of view.soldiers){const p=api.groundProbe(x,z);assert(p.clear&&Math.abs(p.height-y)<.02,'Every visible soldier is grounded and clear');}
  const at={...view.location},before=JSON.stringify(api.war.state().campaign);api.war.run();for(let i=0;i<25;i++)api.step(.04);api.war.pause();api.step(.04);
  view=api.war.state().columns;assert(Math.hypot(view.location.x-at.x,view.location.z-at.z)>.5,'Column moves continuously within a campaign day');
  assert(JSON.stringify(api.war.state().campaign)===before,'Marching visuals do not resolve or mutate forces');
  api.look({yaw:Math.atan2(api.state().position[0]-view.location.x,api.state().position[2]-view.location.z),pitch:.12,distance:9});
  if(api.war.state().tracking?.target.id!==view.army)api.war.track({kind:'army',id:view.army});api.step(.04);await frames();
  assert(api.war.state().light.visible,'Selected army guide points at the physical column');
  assert(Math.hypot(api.war.state().light.location.x-view.location.x,api.war.state().light.location.z-view.location.z)<.01,'World light matches the moving column exactly');
  const marker=api.war.minimapEvents().find(m=>m.target.kind==='army'&&m.target.id===view.army);
  assert(marker&&Math.hypot(marker.x-view.location.x,marker.z-view.location.z)<.01,'Minimap and world share the same column position');
  return {checks:['Entire column road is traversable in the built world','Column visibly advances between campaign turns','Visible troops have grounded, clear positions','Tracking the army points to its real road position','Minimap matches the physical column'],column:view};
}
export async function closeColumn(api){
  const view=api.war.state().columns;await api.visit({x:view.location.x+3,z:view.location.z+13});
  api.look({yaw:.1,pitch:.08,distance:7});document.getElementById('world-war-report-dismiss').click();api.step(.04);await frames();
  assert(api.war.state().columns.soldiers.length>=3,'Column remains visible at conversational range');
  return {checks:['Column remains visible at conversational range']};
}
export async function handoff(api){
  api.war.advance(2);api.war.trackRoute();await api.visit({x:-2092,z:281});api.look({yaw:0,pitch:.2,distance:8});api.step(.04);await frames();
  assert(api.war.state().campaign.day===3&&api.war.state().campaign.pending?.region==='caricas','Entering the first Caricas battlefield on day three opens the battle choice');
  assert(document.getElementById('encounter-dialog').open,'The battlefield choice opens without approaching a captain or flag');
  api.war.withdraw();api.step(.04);
  assert(/Battle at Caricas/.test(api.war.state().guidance.label),'Approach becomes a battle only when the campaign starts one');
  const join=document.getElementById('world-war-join');assert(!join.hidden&&!join.disabled,'Staying out keeps a usable F re-entry choice inside the battlefield');
  api.pause();api.step(.04);assert(!api.war.state().light.visible&&!api.war.state().columns.visible,'Navigation and column hide behind menus');api.resume();
  api.war.advance(3);api.step(.04);assert(!api.war.state().light.visible,'Resolved battle retires the light');
  api.war.restore(saved);await api.visit({x:previous[0],z:previous[2]});api.look({yaw:0,pitch:.27,distance:8});
  assert(!api.state().frameErrors.length,'No guidance renderer errors');
  return {checks:['Walking into the battlefield opens the entry choice; declining preserves re-entry','Pause hides scene guidance','Resolved battle clears its beacon']};
}
