import {LOOKOUT_DOOR,TOWER_DOOR,TOWER_EXIT,TALETH_SPOT} from '../../app/exploration/tower-state.js';
import {MINORA_COUNCIL,councilPerson,councilDoor} from '../../content/regions/minora-frontier/minora-council.js';
import {MINORA_RESIDENTS} from '../../content/regions/minora-frontier/minora-residents.js';
import {postwarPlans,postwarMemory} from '../../app/exploration/postwar-conversations.js';
import {localSight} from '../../app/exploration/local-sight.js';
const assert=(v,m)=>{if(!v)throw Error(m);},click=id=>document.getElementById(id).click();
const press=code=>document.dispatchEvent(new KeyboardEvent('keydown',{code,bubbles:true,cancelable:true}));
const frame=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
const step=(a,n)=>{window.dispatchEvent(new Event('focus'));for(let i=0;i<n;i++)a.step(.04);};
let campaign,birdId;
async function door(a){
  press('KeyF');
  const end=performance.now()+180000;
  while(a.state().mode==='loading'&&performance.now()<end)await new Promise(r=>setTimeout(r,50));
  assert(a.state().mode==='playing','Doorway returns to movement');await frame();
}
function unchanged(a){assert(JSON.stringify(a.war.state().campaign)===campaign,'Social interactions preserve recorded campaign');assert(!a.state().frameErrors.length,'No frame errors');}
export async function conclusion(a){
  window.dispatchEvent(new Event('focus'));campaign=JSON.stringify(a.war.state().campaign);
  assert(!a.tower.state().exteriorLoaded,'The rooftop preview does not build the walkable city');
  click('tower-next');click('tower-next');
  assert(a.tower.state().concluded&&a.store.read().data.tower.concluded,'Two-card review saves completion');
  assert(a.war.state().opportunity.kind==='complete','Current guidance recognizes completion immediately');
  assert(document.getElementById('world-war-report-title').textContent==='Lizeemi War complete','Live report replaces the fulfilled summons');
  assert(document.getElementById('world-war-next-detail').hidden,'Completion advice is not printed twice in the same card');
  assert(a.tower.lookoutState().menu,'Optional activities offered after completion');
  click('tower-close');assert(a.save().ok,'Save without viewing other countries');await a.loadSaved();
  assert(a.tower.state().concluded,'Continue keeps skipped-tour completion');
  assert(a.war.state().opportunity.kind==='complete','Continue restores optional postwar guidance');
  assert(document.getElementById('world-war-result').textContent.startsWith('The Lizeemi War campaign is complete.'),'Saved completion also updates the campaign map summary');
  assert(a.tower.interact()&&a.tower.lookoutState().menu,'Taleth offers optional activities again');
  click('tower-review-campaign');assert(a.state().mode==='chronicle','Completed campaign opens in the Chronoscope');
  await frame();press('Escape');assert(a.state().mode==='briefing'&&a.tower.lookoutState().menu,'Chronoscope returns to the optional-activities menu');unchanged(a);
  await frame();return {concluded:true,menu:a.tower.lookoutState().menu};
}
export async function pigeons(a){
  click('tower-close');await a.visit({x:-2423.3,z:43.9});a.look({yaw:-2,pitch:.18,distance:5});step(a,5);
  assert(a.tower.birds().length===3,'Exactly three local pigeons');press('KeyF');
  birdId=a.tower.pigeonState().selected;assert(birdId,'F observes a nearby pigeon');click('pigeon-feed');
  const before=a.tower.birds().find(b=>b.id===birdId);
  assert(before.feeding,'Grain starts feeding');step(a,30);
  assert(before.headPitch!==a.tower.birds().find(b=>b.id===birdId).headPitch,'Feeding bird moves while conversation is open');
  assert(!a.testWorld.flyLookoutBird(birdId),'Feeding bird stays on its perch');
  unchanged(a);await frame();return {birds:a.tower.birds(),selected:birdId,render:a.renderStats()};
}
export async function flight(a){
  step(a,160);click('pigeon-fly');
  assert(a.state().mode==='playing'&&a.tower.birds().find(b=>b.id===birdId).flying,'Release starts flight and restores control');
  step(a,55);assert(a.tower.birds().filter(b=>b.flying).length===1,'Only one bird flies at a time');
  await frame();return {birds:a.tower.birds()};
}
export async function archive(a){
  step(a,260);const bird=a.tower.birds().find(b=>b.id===birdId);
  assert(!bird.flying&&Math.abs(bird.position[2]-4.02)<.01,'Released pigeon returns to its own perch');
  assert(a.tower.pigeonInteract(),'Returned pigeon remains interactable');click('pigeon-letters');
  assert(!document.getElementById('taleth-letter-dialog').hidden,'Pigeon opens existing dispatch archive');
  assert(document.getElementById('taleth-letter-select').options.length>0,'Actual campaign letters are available');
  unchanged(a);await frame();return {dispatches:document.getElementById('taleth-letter-select').options.length};
}
export async function descent(a){
  click('taleth-letter-close');await a.visit({...LOOKOUT_DOOR,z:LOOKOUT_DOOR.z-1});await door(a);
  assert(a.tower.state().room==='tower','Lookout stair returns to guild chamber');
  await a.visit({x:-2414,z:42});assert(a.tower.interact(),'Taleth can be revisited in his chamber');
  assert(document.getElementById('tower-page').textContent.includes('Campaign complete'),'Returning to the chamber does not repeat an unfinished assignment');
  click('tower-close');
  const birds=JSON.stringify(a.tower.birds());step(a,400);assert(JSON.stringify(a.tower.birds())===birds,'Unoccupied loft does no bird updates');
  await a.visit({...TOWER_DOOR,z:TOWER_DOOR.z-1});await door(a);assert(!a.tower.state().inside,'Chamber door returns to Minora');
  assert(a.tower.state().exteriorLoaded&&!a.tower.state().panorama.visible,'Descending prepares the real city and hides the lookout export');unchanged(a);
  return {inside:false,birdsDormant:true};
}
export async function bear(a){
  await a.visit({x:-2417,z:65});step(a,12);assert(a.stable.interact(),'Bear is reachable');
  for(let i=0;i<3;i++)click('stable-next');assert(a.stable.owned,'Existing lesson grants the horse');
  const horse=JSON.stringify(a.stable.snapshot());assert(a.stable.interact(),'Bear can be revisited');
  assert(document.getElementById('stable-topic').textContent==='Home after the war','Bear greets the returning rider');
  assert(document.getElementById('stable-words').textContent.includes('Lizeemi League'),'Bear knows peace has come');
  click('stable-next');click('stable-next');click('stable-next');
  assert(!document.getElementById('stable-words').textContent.includes('day 3'),'Postwar riding reminder omits obsolete battle instructions');
  click('stable-close');assert(JSON.stringify(a.stable.snapshot())===horse,'Riding reminder leaves owned horse unchanged');a.stable.interact();
  unchanged(a);await frame();return {topic:document.getElementById('stable-topic').textContent,horse:a.stable.snapshot()};
}
async function council(a,id){
  const c=MINORA_COUNCIL[id];await a.visit(c.exit);await door(a);assert(a.tower.state().room===id,'Enter '+c.room);
  const p=councilPerson(id);await a.visit({x:p.x+1.7,z:p.z+2});press('KeyF');
  assert(a.council.state().speaking===id,'Speak to '+c.name);click('council-peace');
  assert(document.getElementById('council-words').textContent===postwarPlans(id,a.war.state().campaign),'Postwar intentions match winner');
  click('council-memory');assert(document.getElementById('council-words').textContent.includes('let the armies decide'),'No invented participation');
  click('council-peace');unchanged(a);await frame();return {id,words:document.getElementById('council-words').textContent};
}
async function leaveCouncil(a,id){click('council-close');const p=councilDoor(id);await a.visit({x:p.x,z:p.z-1});await door(a);}
export async function mayor(a){click('stable-close');return council(a,'mayor');}
export async function priest(a){await leaveCouncil(a,'mayor');return council(a,'temple');}
export async function residents(a){
  await leaveCouncil(a,'temple');const spoken=[];
  for(const def of MINORA_RESIDENTS){
    await a.visit({x:def.x,z:def.z+4});step(a,10);
    const person=a.tower.state().residents.people.find(p=>p.id===def.id);assert(person,'Resident exists: '+def.name);
    const [x,,z]=person.position;let at;
    for(const radius of [2.5,3,2,3.5])for(let i=0;i<24&&!at;i++){
      const p={x:x+Math.sin(i*Math.PI/12)*radius,z:z+Math.cos(i*Math.PI/12)*radius};
      if(a.groundProbe(p.x,p.z).clear&&localSight(a.testWorld,p,{x,z}))at=p;
    }
    assert(at,'Reachable speaker: '+def.name);await a.visit(at);a.look({yaw:Math.atan2(at.x-x,at.z-z),pitch:.16,distance:6});step(a,2);press('KeyF');
    assert(a.residentHost.state().speaking===def.id,'F opens '+def.name);
    for(const topic of ['future','memory']){
      const button=document.querySelector('#resident-dialog [data-topic="'+topic+'"]');assert(!button.hidden,'Postwar topic visible');button.click();
      assert(document.getElementById('resident-words').textContent===(topic==='future'?postwarPlans:postwarMemory)(def.id,a.war.state().campaign),'Accurate topic for '+def.name);
    }
    press('Tab');assert(document.activeElement.closest('#resident-dialog'),'Keyboard focus remains in dialogue');unchanged(a);spoken.push(def.name);
    if(spoken.length<MINORA_RESIDENTS.length)press('Escape');
  }
  await frame();return {spoken,errors:a.state().frameErrors};
}

export function compact(a){
  const buttons=[...document.querySelectorAll('#pigeon-dialog button')];
  for(const b of buttons){const r=b.getBoundingClientRect();assert(r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight,'Pigeon action stays within compact screen');assert(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===b,'Pigeon action remains reachable');}
  a.renderStats();return {width:innerWidth,height:innerHeight,actions:buttons.length};
}

export async function returnLookout(a){
  press('Escape');await a.visit(TOWER_EXIT);await door(a);
  await a.visit({...TALETH_SPOT,z:TALETH_SPOT.z+2});assert(a.tower.interact(),'Taleth is reachable after walking in Minora');
  click('tower-next');
  const end=performance.now()+15000;while(a.state().mode==='loading'&&performance.now()<end)await new Promise(r=>setTimeout(r,50));
  const state=a.tower.state();assert(state.room==='lookout'&&state.panorama.visible&&state.exteriorLoaded,'A warmed exterior and the cached lookout coexist on return');
  assert(!a.testWorld.loading.state().active.length,'Returning starts no terrain jobs');
  unchanged(a);await frame();return {room:state.room,exteriorLoaded:state.exteriorLoaded,errors:a.state().frameErrors};
}
