import {TOWER_DOOR,TALETH_SPOT} from '../../app/exploration/tower-state.js';
import {LIZEEM_PRELUDE} from '../../content/scenarios/lizeem-prelude.js';

const assert=(ok,message)=>{if(!ok)throw Error(message);};
const frames=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
const settled=async()=>{await new Promise(resolve=>setTimeout(resolve,1250));await frames();};
const click=id=>{const button=document.getElementById(id);assert(button&&!button.hidden&&!button.disabled,'Available button: '+id);button.click();};
const key=(code,options={})=>{const event=new KeyboardEvent('keydown',{code,bubbles:true,cancelable:true,...options});document.dispatchEvent(event);return event;};
const state=api=>api.tower.chronicleState();
const secondsOn=day=>LIZEEM_PRELUDE.frames.find(f=>f.day===day).seconds;
export function advance(api,seconds){for(let remaining=seconds;remaining>1e-8;remaining-=.04)api.step(Math.min(.04,remaining));}
const records=new WeakMap();
const record=api=>({campaign:JSON.stringify(api.war.state().campaign),clock:JSON.stringify(api.war.state().clock),save:JSON.stringify(api.store.read().data)});
function unchanged(api,expected=records.get(api)){
  const actual=record(api);assert(actual.campaign===expected.campaign,'Historical playback does not change the live campaign');
  assert(actual.clock===expected.clock,'Historical playback does not move or start the live clock');
  assert(actual.save===expected.save,'Historical playback does not write or alter the save');
}
async function ready(api){
  const end=performance.now()+10000;
  while(!state(api).ready&&!state(api).error&&performance.now()<end)await frames();
  assert(state(api).active&&state(api).ready&&!state(api).error,'Historical atlas loads successfully');
}
function checkLayout(){
  const rect=selector=>document.querySelector(selector).getBoundingClientRect();
  const body=rect('.chronicle-body'),narration=rect('.chronicle-narration'),projection=rect('.chronicle-projection'),controls=rect('.chronicle-controls');
  assert(controls.top>=Math.max(body.bottom,narration.bottom,projection.bottom)-1,'Playback controls stay below the map and narration');
  const buttons=['chronicle-previous','chronicle-play','chronicle-next'].map(id=>rect('#'+id));
  assert(buttons.every(b=>b.top>=controls.top&&b.bottom<=controls.bottom),'Playback buttons remain inside their control row');
}
function seek(day){
  const index=LIZEEM_PRELUDE.frames.findIndex(f=>f.day===day),button=document.querySelector(`[data-chronicle-frame="${index}"]`);
  assert(button,'Historical event exists for day '+day);button.click();
}
function owners(api,expected){
  const actual=state(api).owners;
  for(const [id,value]of Object.entries(expected)){
    assert(actual[id]===value,`Day ${state(api).day}: ${id} belongs to ${value}`);
    assert(document.querySelector(`#chronicle-map .chronicle-region[data-region="${id}"]`).dataset.owner===value,'Visible borders match historical ownership');
  }
}

/** Leave the first event paused, ready for a comparable native screenshot. */
export async function checkChronicleOpening(api){
  assert(api.tower.state().inside&&!api.tower.state().briefed,'Fresh, unbriefed tower opening');
  if(api.state().mode==='briefing')click('tower-close');
  await api.visit({...TOWER_DOOR,z:TOWER_DOOR.z-1});key('KeyF');
  assert(api.tower.state().inside&&!api.tower.state().briefed,'Tower exit is locked before the briefing');
  await api.visit({x:TALETH_SPOT.x,z:TALETH_SPOT.z+2});assert(api.save().ok,'Pre-briefing save is available');
  key('KeyF');assert(api.state().mode==='briefing','Taleth conversation opens');
  assert(document.getElementById('tower-next').textContent==='Start campaign','Start campaign is the first briefing action');
  assert(!document.getElementById('tower-background').hidden,'Background is available as the optional second action');
  records.set(api,record(api));click('tower-background');await ready(api);click('chronicle-play');
  assert(api.state().mode==='chronicle'&&state(api).day===1&&!state(api).playing,'History opens on day one and can be paused');
  const paths=[...document.querySelectorAll('#chronicle-map .chronicle-region')];
  assert(paths.length===5&&new Set(paths.map(p=>p.dataset.region)).size===5,'Only five actual atlas region outlines appear');
  assert(paths.every(p=>p.getAttribute('d').startsWith('M')&&p.getAttribute('d').length>100),'Regions use detailed atlas unions, not substitute rectangles');
  owners(api,{isareos:'empire',nethereum:'empire',caricas:'empire',ovesos:'empire',nesdor:'empire'});
  assert(document.querySelector('#chronicle-map .chronicle-minora'),'Minora stays identifiable on the chart');
  const paused=state(api).elapsed;advance(api,3);assert(state(api).elapsed===paused,'Pause holds historical time');
  assert(key('F5').defaultPrevented,'F5 cannot reload the game from the historical projection');
  document.getElementById('chronicle-start').focus();key('Tab',{shiftKey:true});
  assert(document.activeElement===document.querySelector('#chronicle-timeline button:last-child'),'Reverse Tab stays within the projection');
  key('Tab');assert(document.activeElement===document.getElementById('chronicle-start'),'Tab wraps to the primary action');
  unchanged(api);await settled();checkLayout();
  return {checks:['Unbriefed door remains locked','Start is primary; background is optional','Five atlas boundaries and Minora marker','Day one has five imperial provinces','Pause and keyboard focus trap','F5 reload suppressed','Live campaign, clock and save unchanged'],state:state(api)};
}

/** Advance through successive declarations, then pause at the western league. */
export async function checkChronicleProgress(api){
  assert(state(api).day===1&&!state(api).playing,'Opening stage left day one paused');
  key('Space');assert(state(api).playing,'Space resumes historical time');
  const beforeBlur=state(api).elapsed;window.dispatchEvent(new Event('blur'));advance(api,4);
  assert(state(api).elapsed===beforeBlur,'Background window freezes historical playback');window.dispatchEvent(new Event('focus'));
  advance(api,secondsOn(1)+.01);assert(state(api).day===3,'Autoplay advances to Minora independence');owners(api,{isareos:'minora',nethereum:'empire'});
  advance(api,secondsOn(3));assert(state(api).day===4,'Next day is Nethereum');owners(api,{nethereum:'nethereum',caricas:'empire'});
  advance(api,secondsOn(4));assert(state(api).day===5,'Next day is Caricas');owners(api,{caricas:'caricas',ovesos:'empire'});
  advance(api,secondsOn(5));assert(state(api).day===6,'Next day is Ovesos');owners(api,{ovesos:'ovesos',nesdor:'empire'});
  advance(api,secondsOn(6));assert(state(api).day===7,'Fifth state appears on day seven');owners(api,{isareos:'minora',nethereum:'nethereum',caricas:'caricas',ovesos:'ovesos',nesdor:'nesdor'});
  key('Space');assert(!state(api).playing,'Space pauses playback again');
  click('chronicle-next');assert(state(api).day===21&&!state(api).playing,'Next event skips the quiet days for readable pacing');
  owners(api,{isareos:'minora',nethereum:'west',ovesos:'west',caricas:'caricas',nesdor:'nesdor'});
  key('ArrowLeft');assert(state(api).day===7,'Left arrow returns to the preceding event');
  key('ArrowRight');assert(state(api).day===21,'Right arrow advances again');
  seek(3);assert(state(api).day===3&&!state(api).playing,'Timeline can revisit an earlier date without playing');
  seek(21);unchanged(api);await settled();checkLayout();
  return {checks:['Autoplay shows consecutive independence declarations','Blur suspends playback','Day seven contains five independent states','Day twenty-one unites only the western provinces','Previous, next, arrows and timeline work','Live campaign, clock and save remain unchanged'],state:state(api)};
}

/** Reach the present, with the last event held for native visual inspection. */
export async function checkChronicleFinish(api){
  click('chronicle-next');assert(state(api).day===23,'Eastern league follows western league');
  owners(api,{isareos:'minora',nethereum:'west',ovesos:'west',caricas:'east',nesdor:'east'});
  click('chronicle-next');assert(state(api).day===29,'The final week holds the same borders');
  click('chronicle-next');assert(state(api).day===30,'Final event is the declaration of war');
  assert(document.querySelector('#chronicle-map svg.at-war'),'Map marks the declaration of war');
  click('chronicle-play');advance(api,secondsOn(30)+.01);
  assert(state(api).day===30&&state(api).completed&&!state(api).playing,'End of history holds at the present');
  assert(api.state().mode==='chronicle'&&!api.tower.state().briefed,'Watching does not automatically begin the campaign');
  assert(document.getElementById('chronicle-play').textContent==='Replay','Completed history offers replay');
  unchanged(api);await settled();checkLayout();
  return {checks:['Eastern league forms on day twenty-three','Final week retains stable borders','War is declared on historical day thirty','Projection stops at the present and waits for confirmation','No automatic start or save changes'],state:state(api)};
}

/** Check replay, dismissal and explicit start; a return visit cannot reset war. */
export async function finishChronicle(api){
  click('chronicle-play');assert(state(api).day===1&&state(api).playing&&!state(api).completed,'Replay begins the history again');
  click('chronicle-play');owners(api,{isareos:'empire',nethereum:'empire',caricas:'empire',ovesos:'empire',nesdor:'empire'});unchanged(api);
  key('Escape');assert(!state(api).active&&api.state().mode==='briefing','Escape returns to Taleth');
  assert(!api.tower.state().briefed,'Viewing history is not consent to begin');click('tower-close');
  await api.visit({...TOWER_DOOR,z:TOWER_DOOR.z-1});key('KeyF');assert(api.tower.state().inside&&!api.tower.state().briefed,'The door stays locked after merely viewing history');
  await api.visit({x:TALETH_SPOT.x,z:TALETH_SPOT.z+2});key('KeyF');click('tower-background');await ready(api);click('chronicle-start');
  assert(api.tower.state().briefed&&api.state().mode==='playing'&&api.war.state().clock.running,'Explicit projection action begins the campaign');
  api.war.pause();api.war.advance(2);const begun=record(api);
  key('KeyF');click('tower-background');await ready(api);
  assert(document.getElementById('chronicle-start').textContent==='Return to the chamber','Later visits offer return, not another campaign start');
  assert(/memory of the war/.test(document.getElementById('chronicle-held-caption').textContent),'Replay header acknowledges the campaign already began');
  advance(api,LIZEEM_PRELUDE.frames.reduce((sum,f)=>sum+f.seconds,0)+.01);assert(state(api).completed,'A later visit can view all thirty historical days');unchanged(api,begun);
  assert(/where your campaign began/.test(document.getElementById('chronicle-present').textContent),'Replay ending describes history without claiming the present was reset');
  click('chronicle-start');assert(api.state().mode==='playing'&&!api.war.state().clock.running,'Returning preserves an intentionally paused campaign');unchanged(api,begun);
  key('KeyF');click('tower-next');unchanged(api,begun);
  assert(!api.tower.state().exteriorLoaded,'History never loads exterior regions');assert(!api.state().frameErrors.length,'No renderer errors');
  await frames();
  return {checks:['Replay only rewinds the projection','Escape returns to Taleth without starting','Watching history does not unlock the tower exit','Explicit Start begins the live campaign once','Later projection and briefing preserve existing day, events, paused clock and save','No exterior loads or renderer errors'],campaign:api.war.state().campaign};
}
