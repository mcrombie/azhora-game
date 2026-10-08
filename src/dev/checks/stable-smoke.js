import {MINORA_STABLE as STABLE} from '../../content/regions/minora-frontier/minora-stable.js';
import {TOWER_EXIT} from '../../app/exploration/tower-state.js';
import {RIDE} from '../../gameplay/movement/riding.js';
const assert=(ok,message)=>{if(!ok)throw Error(message);};
const frame=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
const key=code=>document.dispatchEvent(new KeyboardEvent('keydown',{code,bubbles:true}));
const click=id=>document.getElementById(id).click();

export async function meetBear(api){
  api.war.pause();api.step(.2);
  assert(api.minimap.state().visible,'Outdoor minimap visible');assert(api.minimap.state().target==='bear','Minimap points to Bear');
  assert(api.stable.state().bearVisible&&api.stable.state().horseVisible,'Bear and saddled horse wait outside');
  assert(api.groundProbe(STABLE.horse.x,STABLE.horse.z).clear,'Horse stands on clear ground');
  await api.visit({x:STABLE.bear.x+1,z:STABLE.bear.z-2.5});key('KeyF');
  assert(api.state().mode==='briefing'&&!document.getElementById('stable-lesson').hidden,'F speaks with Bear');
  const before=JSON.stringify({campaign:api.war.state().campaign,clock:api.war.state().clock});for(let i=0;i<100;i++)api.step(.04);
  assert(JSON.stringify({campaign:api.war.state().campaign,clock:api.war.state().clock})===before,'Riding explanation does not spend campaign time');
  click('stable-close');assert(!api.stable.owned,'Leaving early does not grant the horse');key('KeyF');click('stable-next');
  assert(/G to mount/.test(document.getElementById('stable-words').textContent),'Riding controls explained');
  await frame();return {checks:['Local map and Bear marker outside','Bear and horse on dry forecourt','F talks; lesson pauses campaign','Declining preserves unclaimed horse']};
}
export async function rideWithBear(api){
  click('stable-next');click('stable-next');assert(api.stable.state().owned&&api.stable.state().taught,'Lesson hands over horse');
  const first=api.stable.snapshot();key('KeyF');click('stable-next');click('stable-next');click('stable-next');assert(JSON.stringify(first)===JSON.stringify(api.stable.snapshot()),'Repeated lesson cannot duplicate or move horse');
  await api.visit({x:STABLE.horse.x+1.5,z:STABLE.horse.z});key('KeyG');api.step(.04);
  assert(api.stable.mounted&&api.state().mount.kind==='horse'&&api.state().mount.horseSpeed===1,'G mounts real horse');
  assert(!api.stable.state().horseVisible,'Parked model hidden while riding');
  api.hold('KeyW',true);api.hold('ShiftLeft',true);for(let i=0;i<12;i++)api.step(.04);api.hold('KeyW',false);api.hold('ShiftLeft',false);
  assert(Math.hypot(api.state().position[0]-STABLE.horse.x,api.state().position[2]-STABLE.horse.z)>4,'Canter moves the mounted player');
  assert(api.save().ok,'Mounted save succeeds');key('KeyG');api.step(.04);
  assert(!api.stable.mounted&&api.stable.state().horseVisible&&api.state().mount.kind==='foot','G safely dismounts and parks the horse');
  await api.loadSaved();api.step(.2);assert(api.stable.owned&&!api.stable.mounted,'Reload restores ownership on foot');
  const parked=api.stable.snapshot(),caller={x:-2409,z:73};await api.visit(caller);key('KeyH');
  assert(api.stable.state().called,'H begins recalling the horse');
  // Native checks show their window without stealing desktop focus. A blur
  // legitimately pauses stable simulation, even while api.step moves a rider.
  // Exercise that contract, then give this synchronous recall check an explicit
  // active-window fixture instead of relying on Windows foreground timing.
  const beforeBlur=JSON.stringify(api.stable.snapshot());
  window.dispatchEvent(new Event('blur'));
  try{api.step(.04);assert(JSON.stringify(api.stable.snapshot())===beforeBlur&&api.stable.state().called,'Background window pauses a called horse without cancelling the recall');}
  finally{window.dispatchEvent(new Event('focus'));}
  const distance=()=>Math.hypot(api.stable.snapshot().horse.x-caller.x,api.stable.snapshot().horse.z-caller.z);
  // Calling can include a swim and the existing obstruction-recovery delay;
  // wait for actual arrival, rather than assuming 3.6 seconds of dry trotting.
  let callSeconds=0;while(callSeconds<15&&distance()>RIDE.reach){api.step(.02);callSeconds+=.02;}
  if(distance()>RIDE.reach){
    const horse=api.stable.snapshot().horse,player=api.state().position;
    const probe=point=>{const ground=api.groundProbe(point.x,point.z);return {...ground,colliders:ground.colliders?.map(c=>({kind:c.kind,x:c.x,z:c.z,r:c.r,hx:c.hx,hz:c.hz,minY:c.minY,maxY:c.maxY})),supportFromPlayer:api.testWorld.supportAt?.(point.x,point.z,{maxY:player[1],stepUp:.45,groundSlope:false}),supportFromWater:api.testWorld.supportAt?.(point.x,point.z,{maxY:ground.water-RIDE.floatOffset,stepUp:.45,groundSlope:false})};};
    throw Error('H brings horse within mounting reach: '+JSON.stringify({callSeconds,distance:distance(),mode:api.state().mode,documentFocused:document.hasFocus(),parked,current:api.stable.state(),player,horse:probe(horse),caller:probe(caller)}));
  }
  assert(JSON.stringify(parked)!==JSON.stringify(api.stable.snapshot()),'Whistle moves the saved horse');
  api.step(.2);assert(api.minimap.state().target==='horse','Local map follows owned horse');
  assert(api.save().ok,'Parked horse saves');await api.visit({x:STABLE.bear.x+1,z:STABLE.bear.z+4});await frame();
  return {checks:['Repeatable lesson grants exactly one horse','G mounts at ordinary riding speed','Canter moves rider and horse together','Safe dismount leaves a visible horse','Mounted save reloads on foot with ownership intact','Background window pauses horse recall; focus resumes it','H calls the horse; minimap follows its location']};
}
export async function parkAtTower(api){
  const riding=api.stable.snapshot();await api.visit(TOWER_EXIT);key('KeyF');await frame();api.step(.2);
  assert(api.tower.state().inside&&!api.stable.state().bearVisible&&!api.stable.state().horseVisible,'Exterior occupants stay outside the chamber');
  assert(JSON.stringify(api.stable.snapshot())===JSON.stringify(riding),'Two-way doorway leaves horse where parked');
  assert(api.minimap.state().target==='door','Interior minimap points to the exit after briefing');
  assert(api.save().ok,'Save inside retains horse outside');await frame();
  return {riding,checks:['Bear and horse remain outside on tower return','Interior map shows the door','Indoor save retains parked horse']};
}

export async function checkWarDirections(api){
  api.war.pause();api.war.advance(Math.max(0,4-api.war.state().campaign.day));api.step(.2);
  let events=api.minimap.state().events;
  assert(events.some(m=>m.kind==='army'&&m.clamped),'Marching armies have off-map direction pointers');
  const moving=events.find(m=>m.kind==='army'),before=JSON.stringify(api.war.state().campaign);
  const canvas=document.querySelector('#exploration-minimap canvas'),b=canvas.getBoundingClientRect();
  document.getElementById('exploration-minimap').dispatchEvent(new MouseEvent('click',{bubbles:true,detail:1,clientX:b.left+moving.x*b.width/300,clientY:b.top+moving.y*b.height/300}));
  api.step(.2);assert(api.minimap.state().events.some(m=>m.id===moving.id&&m.selected),'Clicking a direction marker tracks its army');
  assert(JSON.stringify(api.war.state().campaign)===before,'Tracking does not alter campaign');
  api.war.advance(1);api.step(.2);events=api.minimap.state().events;
  assert(events.some(m=>m.kind==='battle'&&m.clamped),'Active battles have off-map direction pointers');
  await frame();return {checks:['Marching army and active battle edge indicators','Click a minimap event to track it without changing the campaign'],events};
}
export async function checkScenarioMap(api){
  api.openMap();await frame();await frame();
  const map=api.state().map;
  assert(map.campaign.view==='geopolitical','Map opens in Geopolitical mode');
  assert(map.scope.clipped&&map.scope.names.length===5,'Five-region visual clipping enabled');
  assert(map.campaign.knownRegions.length===5,'Political layer has exactly five regions');
  assert(document.getElementById('atlas-fit').textContent==='Five regions','Fit button is scenario-specific');
  click('atlas-fit');await frame();const fitted=api.state().map;
  for(let i=0;i<12;i++)click('atlas-out');
  assert(Math.abs(api.state().map.zoom-fitted.zoom)<.001,'Cannot zoom out beyond the scenario');
  const campaignClip=document.getElementById('atlas-campaign-layer').style.clipPath;
  assert(campaignClip.startsWith('path(')&&document.getElementById('atlas-image').style.clipPath.startsWith('path('),'Both map views clip to the same region geography');
  await frame();return {checks:['Geopolitical map is default','Terrain and political maps clipped to five regions','Fit and zoom-out stop at the scenario boundary']};
}
