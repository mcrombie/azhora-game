import {prepareWarExterior} from './tower-smoke.js';
import {MINORA_HARBOR as H} from '../../content/regions/minora-frontier/minora-harbor.js';
import {LIZEEM_PORTS} from '../../content/regions/minora-frontier/lizeem-passages.js';
import {passageRoute} from '../../content/regions/minora-frontier/river-passage.js';
import {LIZEEM_BERTHS} from '../../content/regions/minora-frontier/river-navigation.js';
import {createAdventureWar} from '../../experiments/day-night/opening-war.js';
const assert=(ok,message)=>{if(!ok)throw Error(message);};
const frames=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
async function capture(){window.dispatchEvent(new Event('blur'));await frames();}
function guided(value){const box=document.querySelector('#harbor-dialog input');box.checked=value;box.dispatchEvent(new Event('change'));}
function visible(object){for(let p=object;p;p=p.parent)if(!p.visible)return false;return !!object;}
function passageBoat(a){
  const boats=a.testHero.group.parent.children.filter(o=>o.children.some(c=>c.userData.riverboatCrew)&&o.name==='Lizeem passage boat');
  assert(boats.length===1,'Exactly one live passenger hull is retained');
  const boat=boats[0],crew=boat.children.find(c=>c.userData.riverboatCrew),state=a.harbor.state().boat;
  assert(visible(boat)&&visible(crew)&&crew.geometry.attributes.position.count>0,'Crew geometry is visible aboard the physical boat');
  assert(crew.userData.crewCount===3&&state?.crew===3&&state.helmsmen===1&&state.rowers===2,'Passenger boat has a skipper and two rowers');
  return boat;
}
function atBerth(boat,id){
  const berth=LIZEEM_BERTHS[id];
  assert(Math.hypot(boat.position.x-berth.x,boat.position.y-berth.y,boat.position.z-berth.z)<.02,'Physical hull rests at the '+id+' berth');
}
function moored(a,id,original){
  const boat=passageBoat(a),state=a.harbor.state();
  assert(boat===original,'The arriving hull remains in the scene');
  assert(!state.voyage&&state.dockedPort===id&&state.boat.phase==='moored'&&!state.boat.rowing,'Arriving crew ships the oars and secures the boat');
  assert(!state.boat.horseAboard,'No unloaded horse remains visible aboard');atBerth(boat,id);
  return state.boat;
}
async function talk(a,id='minora'){
  const p=LIZEEM_PORTS.find(p=>p.id===id);await a.visit({x:p.keeper.x,z:p.keeper.z-1.5});a.step(.01);
  assert(a.harbor.interact(),'Boatkeeper approachable at '+id+' / '+JSON.stringify(a.harbor.state()));
  assert(a.state().mode==='briefing','Conversation holds the campaign');
}
export async function harbor(a){
  await prepareWarExterior(a);window.dispatchEvent(new Event('focus'));a.war.pause();
  assert(a.testWorld.passengerPorts.length===5,'All ports available');
  await a.visit({x:H.x,z:135});a.look({yaw:Math.PI,pitch:.4,distance:13});
  a.hold('KeyW',true);try{for(let i=0;i<150&&a.snapshot().position.z<159;i++)a.step(.04);}finally{a.hold('KeyW',false);}
  assert(a.snapshot().position.z>=159,'Player walks from bridge down onto the harbor: '+JSON.stringify(a.snapshot().position));
  assert(Math.abs(a.snapshot().position.y-H.y)<.1,'Feet reach the timber landing');
  assert(a.groundProbe(H.arrival.x,H.arrival.z).clear,'Arrival platform remains clear');
  a.look({yaw:1.25,pitch:.6,distance:22});await capture();
  return {checks:['Walked down the real bridge opening and gangway onto a dry landing','Passenger boat and harbor present'],position:a.snapshot().position,render:a.renderStats()};
}
export async function conversation(a){
  window.dispatchEvent(new Event('focus'));a.war.run();await talk(a);const before=a.war.clock().elapsedSeconds;
  for(let i=0;i<40;i++)a.step(.04);assert(a.war.clock().elapsedSeconds===before,'Talking does not spend battle time');
  assert(document.querySelectorAll('#harbor-dialog [data-port]').length===4,'One choice for each town');
  assert(a.state().heroVisible,'Third person conversation keeps Teresod visible');
  a.harbor.close();const idle=a.war.clock().elapsedSeconds;for(let i=0;i<40;i++)a.step(.04);
  assert(a.war.clock().elapsedSeconds>idle+1.5,'Cancel resumes time without moving');
  await talk(a);await capture();return {checks:['Four destinations','Clock held in dialogue and resumes on cancel','Third-person conversation']};
}
let visibleTrip;
async function board(a,id){
  const from=a.harbor.state().speaking;
  const promise=a.harbor.sail(id),until=performance.now()+120000;
  while(a.state().mode==='crossing'&&performance.now()<until)await new Promise(r=>setTimeout(r,30));
  assert(a.state().mode==='sailing','Real passage begins: '+document.querySelector('.harbor-error').textContent);
  const boat=passageBoat(a),state=a.harbor.state();
  assert(state.voyage.from===from&&['waiting','departing'].includes(state.voyage.position.phase),'Voyage begins safely at its berth');
  atBerth(boat,from);
  if(from==='minora'){
    const scenery=[];a.testHero.group.parent.traverse(o=>{if(o.userData.mooredPassengerPort===from)scenery.push(o);});
    assert(scenery.length>0&&scenery.every(o=>!o.visible),'The static berth boat is hidden while its crewed replacement casts off');
  }
  return {promise,boat};
}
async function skipTrip(a,id){const trip=await board(a,id);assert(a.harbor.skip(),'Skip is available aboard');assert(await trip.promise,'Passage arrives at '+id);moored(a,id,trip.boat);return trip;}
export async function voyage(a){
  window.dispatchEvent(new Event('focus'));a.harbor.close();a.war.pause();await talk(a);guided(false);
  const start=a.war.clock().elapsedSeconds;visibleTrip=await board(a,'ovesos');
  const before=a.snapshot().position,crewBefore=a.harbor.state().boat.updates,wait=a.harbor.state().voyage.clearanceSeconds;let previous=visibleTrip.boat.position.clone();
  const steps=Math.ceil((40+wait)/.25);
  for(let i=0;i<steps;i++){
    a.step(.25);const p=visibleTrip.boat.position,expected=a.harbor.state().voyage.position;
    assert(Math.hypot(p.x-previous.x,p.z-previous.z)<1.3,'Cast-off and sailing advance continuously without a channel teleport');
    assert(Math.hypot(p.x-expected.x,p.y-expected.y,p.z-expected.z)<.02,'Visible hull follows the voyage position');previous.copy(p);
  }
  const after=a.snapshot().position;
  assert(Math.hypot(after.x-before.x,after.z-before.z)>25,'Player physically rides away from the berth and down the river');
  assert(a.harbor.state().boat.updates>crewBefore,'Working crew animates during the visible voyage');passageBoat(a);
  assert(a.state().heroVisible&&a.harbor.state().voyage,'Player visible aboard');
  assert(a.war.clock().elapsedSeconds>start+39+wait,'Waiting for traffic and sailing both spend real campaign seconds');
  document.querySelector('#harbor-ride [data-pause]').click();const paused=a.war.clock().elapsedSeconds,pausedCrew=a.harbor.state().boat.updates,pausedPosition=visibleTrip.boat.position.clone();
  for(let i=0;i<20;i++)a.step(.25);assert(a.war.clock().elapsedSeconds===paused,'Voyage pause freezes travel time');
  assert(visibleTrip.boat.position.equals(pausedPosition)&&a.harbor.state().boat.updates===pausedCrew,'Pause freezes the physical hull and crew work');
  document.querySelector('#harbor-ride [data-pause]').click();
  a.look({yaw:2.35,pitch:.45,distance:16});await capture();
  return {checks:['Starts at the real berth with three visible crew','Continuous cast-off and visible sailing','Campaign time advances during sailing','Pause freezes time, boat and crew'],voyage:a.harbor.state().voyage,crew:a.harbor.state().boat};
}
export async function crewCloseup(a){
  const boat=passageBoat(a),voyage=a.harbor.state().voyage;assert(voyage,'Crew close-up follows the visible voyage');
  a.look({yaw:voyage.position.heading+Math.PI/2,pitch:.5,distance:11});await capture();
  const crew=boat.children.find(c=>c.userData.riverboatCrew);crew.geometry.computeBoundingBox();
  const center=crew.localToWorld(crew.geometry.boundingBox.getCenter(crew.position.clone())),projected=a.project(center);
  assert(Math.abs(projected.x)<.9&&Math.abs(projected.y)<.9&&projected.z>-1&&projected.z<1,'Working crew is framed in the close capture');
  return {checks:['Close view of the skipper, sweeps and rowers'],crew:a.harbor.state().boat,render:a.renderStats()};
}
export async function destinations(a){
  window.dispatchEvent(new Event('focus'));if(visibleTrip){a.harbor.skip();assert(await visibleTrip.promise,'Partial skip arrives');moored(a,'ovesos',visibleTrip.boat);visibleTrip=null;}
  const results=[];
  for(const port of LIZEEM_PORTS.slice(1)){
    const seed=createAdventureWar();a.war.restore(seed.checkpoint());a.war.pause();await talk(a);guided(false);
    const before=a.war.clock().elapsedSeconds,trip=await board(a,port.id);
    assert(!await a.harbor.sail(port.id),'Duplicate boarding rejected');
    const live=port.id==='caricas',expected=a.harbor.state().voyage.duration;
    assert(Math.abs(expected-passageRoute(LIZEEM_PORTS[0],port).duration-a.harbor.state().voyage.clearanceSeconds)<.001,'Declared timetable includes exactly the traffic clearance wait');
    if(live){for(let i=0;i<Math.ceil(expected/.25)+2&&a.state().mode==='sailing';i++)a.step(.25);assert(a.state().mode!=='sailing','Watched voyage reaches its full timetable');}else a.harbor.skip();
    assert(await trip.promise,'Passage completes '+port.name);
    assert(a.state().mode==='playing','Town passage does not start combat');
    assert(Math.hypot(a.snapshot().position.x-port.arrival.x,a.snapshot().position.z-port.arrival.z)<13,'Arrives beside '+port.name+' quay');
    assert(a.groundProbe(a.snapshot().position.x,a.snapshot().position.z).clear,'Dry clear arrival at '+port.name);
    assert(Math.abs(a.war.clock().elapsedSeconds-before-expected)<.001,'Exact travel time paid, live or skipped');
    results.push({town:port.name,seconds:expected,live,moored:moored(a,port.id,trip.boat)});
    await talk(a,port.id);assert(!await a.harbor.sail('minora'),'Upstream passage is rejected');
    assert(!document.querySelector('#harbor-dialog [data-port="minora"]'),'No upstream choice offered');a.harbor.close();
  }
  await capture();return {checks:['All four downstream destinations','No upstream travel','One fully watched voyage and three skips cost exact time','Safe dry arrivals','Same crewed boat remains moored at every destination'],landings:results};
}
export async function battleGuide(a){
  window.dispatchEvent(new Event('focus'));
  for(const id of ['caricas','ovesos']){
    await a.visit(H.arrival);
    // Depart when the clock begins. Ovesos opens during the longer voyage;
    // starting two minutes later would correctly arrive after that battle.
    const war=createAdventureWar();a.war.restore({...war.checkpoint(),campaignSide:'west'});a.war.run();
    await talk(a);guided(true);const before=a.war.clock().elapsedSeconds;
    await skipTrip(a,id);assert(a.war.clock().elapsedSeconds>before,'Travel advances the campaign / '+JSON.stringify({id,before,after:a.war.clock(),trip:a.harbor.state().lastTrip,hero:a.war.state().campaign.hero,pending:a.war.state().campaign.pending}));
    const t=a.harbor.state().lastTrip,b=a.war.state().campaign.engagements.find(b=>b.id===t.battleId),p=a.snapshot().position;
    assert(t.guided&&b,'Guide selects the current battle');
    assert(Math.hypot(p.x-b.location.x,p.z-b.location.z)>(b.entryRadius??70)+4,'Arrives outside battle boundary');
    assert(a.state().mode==='playing'&&!a.war.state().campaign.pending,'Player is not forced into combat');
    assert(a.war.state().tracking?.target?.id===b.id,'Battle guide marker selected');
    const idle=a.war.clock().elapsedSeconds;for(let i=0;i<40;i++)a.step(.04);assert(a.war.clock().elapsedSeconds>idle+1.5,'Time runs after passage while idle');
    a.hold('KeyW',true);try{for(let i=0;i<200&&a.state().mode==='playing';i++)a.step(.04);}finally{a.hold('KeyW',false);}
    assert(a.state().mode==='encounter','Walking straight ahead reaches the battle briefing at '+id+' / '+JSON.stringify({mode:a.state().mode,position:a.snapshot().position,camera:a.state().camera,grounded:a.state().grounded,hero:a.war.state().campaign.hero,entry:a.war.state().battlefield.entry}));
    a.war.withdraw();
  }
  await capture();return {checks:['Both active opening fronts are reachable with boat and guide','Landing outside battle boundary preserves choice','Walking straight ahead reaches the briefing','Marker follows chosen battle','Time resumes after travel']};
}
export async function horseAndSave(a){
  window.dispatchEvent(new Event('focus'));await a.visit(H.arrival);a.war.restore({...createAdventureWar().checkpoint(),campaignSide:'west'});a.war.pause();
  a.stable.restore({version:1,owned:true,taught:true,horse:{...H.arrival,yaw:0}});
  assert(a.stable.toggleMount(),'Can mount at harbor');assert(a.stable.mounted,'Mounted before boarding');a.step(.01);
  assert(a.harbor.interact(),'Can speak while mounted');guided(true);
  const trip=await board(a,'caricas'),aboardHorse=trip.boat.children.find(o=>o.name.startsWith('horse-'));
  assert(a.harbor.state().boat.horseAboard&&visible(aboardHorse),'Owned horse is visible aboard before departure');
  await a.loadSaved();
  assert(a.state().mode==='sailing'&&a.harbor.state().voyage,'Loading aboard cannot abandon an active passage');
  assert(a.harbor.skip(),'Mounted voyage can be skipped');assert(await trip.promise,'Mounted voyage arrives');moored(a,'caricas',trip.boat);
  assert(aboardHorse&&!aboardHorse.visible&&!a.harbor.state().boat.horseAboard,'The aboard horse is hidden after unloading');
  assert(a.stable.owned&&!a.stable.mounted,'Horse remains owned and unloads separately');
  const horse=a.stable.snapshot().horse,p=a.snapshot().position;
  assert(Math.hypot(horse.x-p.x,horse.z-p.z)>=2.5&&Math.hypot(horse.x-p.x,horse.z-p.z)<=5.1,'Horse unloads safely nearby');
  assert(a.groundProbe(horse.x,horse.z).clear,'Horse stands on clear dry ground');
  const heading=a.harbor.state().lastTrip.arrival.heading;
  assert((horse.x-p.x)*Math.sin(heading)+(horse.z-p.z)*Math.cos(heading)<.01,'Horse stays outside the forward guide lane');
  a.hold('KeyW',true);try{for(let i=0;i<200&&a.state().mode==='playing';i++)a.step(.04);}finally{a.hold('KeyW',false);}
  assert(a.state().mode==='encounter','Walking forward past the unloaded horse reaches the battle');a.war.withdraw();
  // Save the actual post-withdrawal position, outside the battlefield boundary.
  Object.assign(p,a.snapshot().position);
  assert(a.save().ok,'Arrival saves');await a.loadSaved();
  assert(Math.hypot(a.snapshot().position.x-p.x,a.snapshot().position.z-p.z)<.1,'Reload preserves landing');
  assert(a.stable.owned,'Reload preserves horse');assert(!a.state().frameErrors.length,'No frame errors');
  const restoredHarbor=a.harbor.state();
  assert(!restoredHarbor.traffic.reserved&&!restoredHarbor.boat&&!restoredHarbor.lastTrip,'Loading clears the abandoned timeline\'s river reservation and docked boat');
  await capture();return {checks:['Mounted boarding with visible horse aboard','Horse unloads nearby and its aboard copy is hidden','Crew remains on the moored boat','Arrival and ownership survive save/load','No runtime errors'],trip:a.harbor.state().lastTrip};
}

export async function missedBattle(a){
  window.dispatchEvent(new Event('focus'));await a.visit(H.arrival);
  const war=createAdventureWar();war.advance(2);a.war.restore({...war.checkpoint(),campaignSide:'west'});a.war.pause();
  await talk(a);guided(true);const before=a.war.clock().elapsedSeconds;
  await skipTrip(a,'caricas');
  const trip=a.harbor.state().lastTrip,port=LIZEEM_PORTS.find(p=>p.id==='caricas');
  assert(a.war.clock().elapsedSeconds>180,'Caricas finishes during this voyage');
  assert(!trip.guided&&!trip.battleId,'Guide does not lead to a battle which ended en route');
  assert(a.state().mode==='playing'&&!a.war.state().campaign.pending,'Late arrival leaves the player free at the quay');
  assert(Math.hypot(a.snapshot().position.x-port.arrival.x,a.snapshot().position.z-port.arrival.z)<13,'Late arrival uses the safe town landing');
  assert(Math.abs(a.war.clock().elapsedSeconds-before-passageRoute(LIZEEM_PORTS[0],port).duration-trip.clearanceSeconds)<.001,'Late arrival still pays exactly the voyage and clearance time');
  await capture();return {checks:['Battle ending during a voyage falls back to the town quay','No stale guide or forced combat; exact sailing time retained'],trip};
}
