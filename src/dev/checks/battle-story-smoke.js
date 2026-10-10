import {MINORA_COUNCIL,councilDoor,councilPerson} from '../../content/regions/minora-frontier/minora-council.js';
import {TOWER_EXIT,TOWER_DOOR,TALETH_SPOT} from '../../app/exploration/tower-state.js';
import {latestPersonalBattle} from '../../app/exploration/battle-consequences.js';
const assert=(v,m)=>{if(!v)throw Error(m);};
const frame=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
const f=()=>document.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyF',bubbles:true}));
async function doorway(a){f();for(let i=0;i<200&&a.state().mode==='loading';i++)await new Promise(r=>setTimeout(r,50));assert(a.state().mode==='playing','Doorway finished');}
let receipt,history;

export async function result(a){
  a.war.pause();receipt=latestPersonalBattle(a.war.state().campaign);assert(receipt?.region==='Caricas'&&receipt.day===6,'Result describes the completed Caricas battle');
  assert(!document.getElementById('world-war-report').hidden,'Battle report is visible immediately');
  assert(document.getElementById('world-war-report-facts').textContent.includes('Day 6'),'Battle receipt states the resolution day');
  assert(!document.getElementById('world-war-report-minora').hidden,'Optional council return is offered');
  document.getElementById('world-war-report-more').open=true;document.getElementById('world-war-report-minora').scrollIntoView({block:'nearest'});
  const box=document.getElementById('world-war-report').getBoundingClientRect(),action=document.getElementById('world-war-report-minora').getBoundingClientRect();
  assert(action.top>=box.top&&action.bottom<=box.bottom,'Optional council return is reachable inside the expanded report');
  assert(a.save().ok,'Final result saves');await a.loadSaved();a.war.pause();
  assert(JSON.stringify(latestPersonalBattle(a.war.state().campaign))===JSON.stringify(receipt),'Save/Continue preserves the exact result');
  document.getElementById('world-war-report-minora').click();
  assert(a.war.state().guidance.label==='Taleth / Wizard Guild','Return marker identifies Minora directly');
  assert(a.war.state().guidance.location.x===TOWER_EXIT.x,'Return guide has no intermediate waypoints');
  document.querySelector('[data-council-destination="mayor"]').click();
  assert(a.war.state().guidance.location.x===MINORA_COUNCIL.mayor.exit.x,'Mayor button points at his own doorway');
  assert(a.save().ok,'Selected council destination saves');await a.loadSaved();a.war.pause();
  assert(a.war.state().guidance.location.x===MINORA_COUNCIL.mayor.exit.x,'Continue preserves the council destination');
  a.war.track(null);assert(!a.war.state().guidance,'Return marker is optional and can be stopped');
  assert(a.save().ok,'Stopped guidance saves');await a.loadSaved();a.war.pause();assert(!a.war.state().guidance,'Continue respects Stop instead of restarting Bear guidance');
  a.war.trackCouncil('council');
  await frame();return {checks:['Immediate battle receipt has territory, personal contribution and resolution day','Save/Continue preserves final result without duplicate credit','Optional council destination buttons point directly to the correct door','Continue preserves chosen guidance and respects Stop'],receipt};
}
export async function taleth(a){
  await a.visit(TOWER_EXIT);await doorway(a);assert(a.tower.state().room==='tower','Actual Guild door opens');
  await a.visit({x:TALETH_SPOT.x,z:TALETH_SPOT.z+2});a.look({yaw:0,pitch:.12,distance:6});history=JSON.stringify(a.war.state().campaign);f();
  assert(a.state().mode==='briefing','Taleth opens through F');
  assert(document.getElementById('tower-words').textContent.includes('Caricas'),'Taleth knows the actual field');
  assert(document.getElementById('tower-words').textContent.includes(receipt.decisive?'final assault':'did not decide'),'Taleth distinguishes decisive wins from unresolved personal attempts');
  assert(document.getElementById('tower-road').textContent.includes('Civic Government'),'Taleth names the current highest banner');
  assert(JSON.stringify(a.war.state().campaign)===history,'Return conversation cannot rewrite the battle');
  await frame();return {checks:['Returning through Guild door gives Taleth a result-specific conversation','Taleth explains the provisional banner leadership without restarting the war']};
}
async function leaveRoom(a,id){await a.visit(id==='tower'?{...TOWER_DOOR,z:TOWER_DOOR.z-1}:{...councilDoor(id),z:councilDoor(id).z-1});await doorway(a);}
async function talkMember(a,id){await a.visit(MINORA_COUNCIL[id].exit);await doorway(a);const p=councilPerson(id);await a.visit({x:p.x+1.7,z:p.z+2.2});a.look({yaw:-.5,pitch:.17,distance:5});f();}
export async function mayor(a){
  document.getElementById('tower-next').click();await leaveRoom(a,'tower');await talkMember(a,'mayor');
  assert(document.getElementById('council-words').textContent.includes('Caricas'),'Mayor acknowledges Caricas');
  assert(document.getElementById('council-words').textContent.includes(receipt.won?'Word has reached us':'cost of this defeat'),'Mayor responds to whether his allies won');
  assert(a.council.state().influence.leader==='mayor','Recorded West intervention still leads the council');
  assert(a.tower.state().councilFlags.gates.every(g=>g.standards.find(s=>s.id==='mayor').x===0),'Visible central flags agree with dialogue');
  assert(JSON.stringify(a.war.state().campaign)===history,'Council visit adds no war commands');
  await frame();return {checks:['Mayor acknowledges allies and actual battle outcome','All four gate standards agree with dialogue']};
}
export async function priest(a){
  document.getElementById('council-close').click();await leaveRoom(a,'mayor');await talkMember(a,'temple');
  const text=document.getElementById('council-words').textContent;
  assert(text.includes('Caricas')&&text.includes(receipt.won?'do not mistake hospitality for approval':'despite your intervention'),'Priest responds differently as an eastern partisan');
  assert(JSON.stringify(a.war.state().campaign)===history,'All three discussions preserve the exact campaign');
  await frame();return {checks:['High Priest recognizes the opposing allegiance without denying access','All three responses preserve campaign state']};
}
export async function persisted(a){
  const words=document.getElementById('council-words').textContent;document.getElementById('council-close').click();assert(a.save().ok,'Council return saves');await a.loadSaved();f();
  assert(document.getElementById('council-words').textContent===words,'Saved return visit retains the same response');
  document.getElementById('council-peace').click();assert(document.getElementById('council-balance').textContent.includes('Placeholder'),'Peace option remains a placeholder');
  assert(!a.state().frameErrors.length,'No rendering errors');await frame();return {checks:['Saved council return restores its response','Peace path remains provisional; no new quest or campaign system','No renderer errors']};
}
