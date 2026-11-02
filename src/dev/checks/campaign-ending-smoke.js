import {createWorldWar} from '../../app/exploration/world-war.js';
import {availableBattleStage} from '../../simulation/battle-stages.js';
import {prepareWarExterior} from './tower-smoke.js';
import {TOWER_EXIT,TALETH_SPOT,LOOKOUT_DOOR,LOOKOUT_TALETH} from '../../app/exploration/tower-state.js';
import {MINORA_COUNCIL,councilPerson,councilDoor} from '../../content/regions/minora-frontier/minora-council.js';
import {residentWords} from '../../app/exploration/resident-dialogue.js';
import {nextCampaignOpportunity} from '../../app/exploration/campaign-opportunity.js';
import {worldWarArmies} from '../../app/exploration/war-armies.js';
import {WORLD_WAR_SCENARIO} from '../../app/exploration/world-war.js';

const $=id=>document.getElementById(id),assert=(ok,message)=>{if(!ok)throw Error(message);};
const frame=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
const f=()=>{for(const type of ['keydown','keyup'])document.dispatchEvent(new KeyboardEvent(type,{code:'KeyF',bubbles:true,cancelable:true}));};
let template,history,intervened;
const tick=a=>{window.dispatchEvent(new Event('focus'));for(let i=0;i<25;i++)a.step(.04);};
async function enter(a,point){await a.visit(point);f();for(let i=0;i<600&&a.state().mode==='loading';i++)await new Promise(r=>setTimeout(r,50));assert(a.state().mode==='playing','Doorway restores movement');}
const unchanged=a=>assert(JSON.stringify(a.war.state().campaign)===history,'End conversations preserve campaign history');

export async function strategy(a){
  await prepareWarExterior(a);a.war.pause();const w=createWorldWar();let next;
  for(let day=0;day<80&&!w.snapshot().winner;day++){
    w.advance();const s=w.snapshot();next=nextCampaignOpportunity(s,WORLD_WAR_SCENARIO,worldWarArmies(s,WORLD_WAR_SCENARIO));
    if(next.alternative)break;
  }
  assert(next?.alternative,'Two-front fixture is available');a.war.restore(w.checkpoint());a.reveal(true);tick(a);
  a.openMap();$('taleth-letters').click();const current=a.war.state().opportunity;
  assert(current.alternative&&!$('taleth-letter-alternative').hidden,'Both known fronts can be selected');
  assert(!$('corris-strategy').open,'Detailed strategy starts collapsed');$('corris-strategy').open=true;
  assert($('corris-live-strategy').textContent.includes(current.tradeoff),'Current strategic tradeoff is available');
  assert($('corris-report-date').textContent.startsWith('Report from day '),'Older report is explicitly dated');
  const before=JSON.stringify(a.war.state().campaign);tick(a);assert(JSON.stringify(a.war.state().campaign)===before,'Reading does not consume either battle window');
  await frame();return {checks:['Short advice offers both fronts','Expanded reasoning separates current choice from dated report','Conversation holds campaign time'],next:current.region,alternative:current.alternative.region};
}

export function closeStrategy(a){$('taleth-letter-close').click();a.resume();a.war.restore(null);}

// Seeded end-state UI coverage, separate from the ordinary-input West/East
// autoplay. The unattended fixture advances only the default simulation.
export async function setup(a,side){
  window.dispatchEvent(new Event('focus'));
  if(!template){await prepareWarExterior(a);a.war.pause();assert(a.save().ok,'Fixture starting point saves');template=structuredClone(a.store.read().data);}
  const w=createWorldWar();intervened=!!side;
  while(!w.snapshot().winner&&w.snapshot().day<100){
    const b=w.snapshot().engagements.find(availableBattleStage);
    if(!side||!b){w.advance();continue;}
    w.campaign.locateHero(b.region);assert(w.campaign.joinBattle(b.id,b.location).ok,'Fixture enters a legal battle');
    const p=w.snapshot().pending,progress=p.rally?{commanders:Object.fromEntries(Object.entries(p.commanders??{}).filter(([,c])=>c.status==='active').map(([f,c])=>[f,{id:c.id,hp:f===side?c.hp:1,outcome:f===side?'active':'routed'}]))}:null;
    assert(w.campaign.resolveEncounter(p.id,side,'success',p.rally?'rally-secured':'vanguard-broken',p.rally?p.rally.guards:3,progress).ok,'Fixture records a valid battle result');
  }
  assert(w.snapshot().winner&&(!side||w.snapshot().winner===side),'Fixture reaches requested ending');
  const data={...structuredClone(template),...w.checkpoint(),navigation:null,reportReadThrough:0,corris:undefined,tower:{version:1,location:'world',briefed:true,running:false,concluded:false}};
  assert(a.store.save(data).ok,'Ending checkpoint validates');await a.loadSaved();tick(a);a.war.pause();history=JSON.stringify(a.war.state().campaign);
  assert(a.war.state().opportunity.kind==='finale','Ending points to Taleth');
  // Old saved battle bookmarks are cleared, without selecting another front.
  const resolved=a.war.state().campaign.engagements[0];
  const saved=a.war.save(a.snapshot());a.war.restore({...saved,navigation:{kind:'battle',id:resolved.id}});tick(a);
  assert(!a.war.state().tracking&&$('world-war-track').hidden,'Ended battle tracker no longer competes with the return objective');
  unchanged(a);await frame();return {side:side??'unattended',winner:a.war.state().campaign.winner,day:a.war.state().campaign.day};
}

export async function council(a,id){
  tick(a);await enter(a,MINORA_COUNCIL[id].exit);const p=councilPerson(id);await a.visit({x:p.x+1.7,y:p.y,z:p.z+2.2});f();
  assert(a.council.state().speaking===id,'Actual doorway and F reach '+id);
  const winner=a.war.state().campaign.winner,leader=winner==='west'?'mayor':'temple';
  assert(a.council.state().influence.leader===leader,'Council leadership follows the victor');
  assert($('council-words').textContent.includes('Lizeemi League'),'Council recognizes the united country');
  assert(a.tower.state().councilFlags.gates.every(g=>g.standards.find(s=>s.id===leader).x===0),'All gates show the same council leader');
  $('council-memory').click();assert($('council-words').textContent.includes(intervened?'I heard you chose':'let the armies decide'),'Memory accurately reflects intervention');
  unchanged(a);await frame();return {member:id,leader,memory:$('council-words').textContent};
}

export async function civilian(a){
  tick(a);await a.visit({x:-2400,z:91});tick(a);
  let person;
  for(const candidate of a.testWorld.residentPeople()){
    if(!residentWords(candidate.id,'hello',a.war.state().campaign)?.includes('Lizeemi League'))continue;
    await a.visit({x:candidate.x+1.8,z:candidate.z});tick(a);
    if(a.residentHost.interact()){person=a.residentHost.state().speaking;break;}
  }
  assert(person,'A nearby civilian remains interactable after the war');
  assert($('resident-words').textContent.includes('Lizeemi League'),'Civilian remembers the settlement');
  document.querySelector('#resident-dialog [data-topic="memory"]').click();
  assert($('resident-words').textContent.includes(intervened?'I heard you chose':'let the armies decide'),'Civilian does not invent player service');
  unchanged(a);await frame();return {person,words:$('resident-words').textContent};
}

export async function closeConversation(a){
  const member=a.council.state().speaking;
  if(member){$('council-close').click();await enter(a,{...councilDoor(member),z:councilDoor(member).z-1});}
  if(a.residentHost.state().speaking)document.querySelector('#resident-dialog [data-topic="close"]').click();
}

export async function lookout(a){
  tick(a);await enter(a,TOWER_EXIT);await a.visit({...TALETH_SPOT,z:TALETH_SPOT.z+2});f();$('tower-next').click();
  for(let i=0;i<600&&a.state().mode==='loading';i++)await new Promise(r=>setTimeout(r,50));
  assert(a.tower.state().room==='lookout','Invitation reaches the actual lookout');
  await a.visit({...LOOKOUT_TALETH,z:LOOKOUT_TALETH.z+2});f();
  assert(a.state().panoramic&&!a.state().heroVisible,'River review uses first-person panorama');
  assert($('tower-topic').textContent==='The river country','Loading another save resets the review to its opening page');$('tower-next').click();
  assert($('tower-words').textContent.includes(intervened?'You fought in':'left the fighting to the armies'),'Taleth describes the actual campaign');
  $('tower-next').click();assert(a.tower.state().concluded,'Two-page review completes the campaign');
  $('tower-review-campaign').click();
  for(let i=0;i<300&&!a.tower.chronicleState().ready;i++)await new Promise(r=>setTimeout(r,20));
  assert(a.tower.chronicleState().kind==='campaign'&&a.tower.chronicleState().ready,'Chronoscope opens this campaign');
  const controls=[...document.querySelectorAll('[data-chronicle-frame]')];controls.at(-1).click();
  assert($('chronicle-caption').textContent.includes('Lizeemi League'),'Last memory records unification');
  // Let the existing political-color transition finish before capturing it.
  await new Promise(r=>setTimeout(r,1200));
  const regions=[...document.querySelectorAll('#chronicle-map .chronicle-region')];
  assert(regions.length===5&&regions.every(p=>p.dataset.owner===a.war.state().campaign.winner&&getComputedStyle(p).fill===p.style.fill),'All five displayed regions take the victor colors');
  unchanged(a);await frame();return {frames:controls.length,day:a.tower.chronicleState().day,caption:$('chronicle-caption').textContent};
}

export async function persisted(a){
  $('chronicle-start').click();assert(a.state().mode==='briefing','Chronoscope returns to Taleth');$('tower-close').click();
  assert(a.save().ok,'Completed campaign saves');await a.loadSaved();tick(a);
  assert(a.tower.state().concluded&&a.war.state().opportunity.kind==='complete','Continue retains completion without another summons');
  assert(!a.war.state().clock.running&&!a.war.state().guidance,'Completed war has no running clock or stale target');
  unchanged(a);await enter(a,{...LOOKOUT_DOOR,z:LOOKOUT_DOOR.z-1});
  assert(a.tower.state().room==='tower','Stair door leaves the lookout');assert(!a.state().frameErrors.length,'Ending has no renderer errors');
  return {checks:['Council and gate flags agree','Civilian and council memories reflect participation','First-person river review completes','Actual Chronoscope retains campaign history','Save/Continue preserves completion','No stale battlefield marker','No renderer errors']};
}
