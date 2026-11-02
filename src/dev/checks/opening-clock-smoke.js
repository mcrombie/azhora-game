import {confirmTowerCampaign} from './tower-smoke.js';
import {TOWER_DOOR,TALETH_SPOT} from '../../app/exploration/tower-state.js';
import {WORLD_WAR_KEY,validateWorldWarSave} from '../../app/exploration/war-checkpoint.js';
import {driveWorldEncounter,clearCombatKeys} from './encounter-controls.js';
import {MINORA_STABLE as STABLE} from '../../content/regions/minora-frontier/minora-stable.js';

const checks=[];
const assert=(value,label)=>{if(!value)throw Error(label);checks.push(label);console.log('EXPLORATION_CHECK '+label);};
const close=(a,b)=>Math.abs(a-b)<1e-7;
const frames=async(count=2)=>{for(let i=0;i<count;i++)await new Promise(requestAnimationFrame);};
const click=selector=>{const button=document.querySelector(selector);assert(button&&!button.disabled,'Available control: '+selector);button.click();};
const key=code=>{for(const type of ['keydown','keyup'])document.dispatchEvent(new KeyboardEvent(type,{code,bubbles:true,cancelable:true}));};
const tick=(a,count=40,dt=.04,skyDt=dt)=>{for(let i=0;i<count;i++)a.step(dt,skyDt);};
const clock=a=>a.war.clock();
const move=a=>{a.hold('KeyS',true);a.step(.04,0);a.hold('KeyS',false);};
const active=a=>a.war.state().campaign.engagements.find(b=>b.region==='caricas'&&b.status==='active');
const first=a=>a.war.state().campaign.engagements.find(b=>b.region==='caricas');
const combat=a=>a.war.state().encounter.encounter;
const refresh=a=>{a.step(0);a.openingTime.update(true);};
let stable={x:-2438,z:69};
let beforeBattle,storageBefore,openingSnapshot;

async function waitFor(predicate,label,timeout=300000){
  const end=performance.now()+timeout;
  while(!predicate()&&performance.now()<end)await new Promise(resolve=>setTimeout(resolve,50));
  assert(predicate(),label);
}
function held(a,label,open,leave){
  open();const before=clock(a);tick(a);
  assert(close(clock(a).elapsedSeconds,before.elapsedSeconds),label+' holds the shared campaign clock');
  assert(close(a.dayNight.state().hour,clock(a).hour),label+' holds sky and adventure time together');leave();
}
function storageSnapshot(){return ['azhora-exploration-v1','azhora-lizeem-world-v1','azhora-lizeem-world-v2',WORLD_WAR_KEY,'azhora-hearthfall-v1'].map(key=>window.azhoraExplorationStorage.getItem(key));}
function savedCheckpoint(a){
  assert(a.save().ok,'Rehearsal checkpoint saves in memory');const checkpoint=a.store.read().data;
  assert(checkpoint?.sharedOpening===2&&validateWorldWarSave(checkpoint),'Shared-clock checkpoint retains the normal validated save representation');
  assert(checkpoint.fraction>=0&&checkpoint.fraction<30,'Saved fraction remains compatible with normal campaign serialization');return structuredClone(checkpoint);
}
async function restore(a,data){
  assert(a.store.save(structuredClone(data)).ok,'Memory checkpoint accepted');await a.loadSaved();a.resume();window.dispatchEvent(new Event('focus'));refresh(a);
}

export async function prepare(a){
  window.dispatchEvent(new Event('focus'));storageBefore=storageSnapshot();
  assert(a.openingTime&&a.store.rehearsal&&clock(a).sharedOpening,'Opening timing uses its isolated rehearsal and UI');
  assert(a.tower.state().inside&&!a.tower.state().briefed,'Opening still begins with Taleth in his chamber');
  assert(close(clock(a).elapsedSeconds,0)&&close(clock(a).hour,6)&&!clock(a).running,'New timing rehearsal starts at dawn and Adventure 00:00, held for Taleth');
  assert(!a.war.waitOpening(a.war.waitForecast()?.key)?.ok,'Waiting cannot bypass Taleth before his briefing');
  await a.visit({x:TALETH_SPOT.x,z:TALETH_SPOT.z+2});key('KeyF');
  assert(a.state().mode==='briefing','F opens Taleth’s real briefing');
  const forecastClock=clock(a);click('#tower-forecast');tick(a);
  assert(/Caricas/.test(document.getElementById('tower-words').textContent)&&/03:00/.test(document.getElementById('tower-words').textContent),'Taleth’s Chronoscope shows the opening army forecast');
  assert(close(clock(a).fraction,forecastClock.fraction)&&close(clock(a).elapsedSeconds,forecastClock.elapsedSeconds),'Looking at a Chronoscope forecast does not advance time');
  held(a,'Taleth conversation',()=>{},()=>{});confirmTowerCampaign(a);
  assert(a.tower.state().briefed&&clock(a).running,'Taleth readies the adventure clock once');
  const inTower=clock(a).elapsedSeconds;move(a);tick(a);assert(close(clock(a).elapsedSeconds,inTower)&&/tower/.test(clock(a).heldReason),'Walking in the tower keeps adventure time and daylight still');
  await a.visit({...TOWER_DOOR,z:TOWER_DOOR.z-1});key('KeyF');
  await waitFor(()=>a.state().mode==='playing'&&!a.tower.state().inside,'Real tower door finishes loading Minora');
  stable=[{x:-2433.5,z:77},{x:-2444,z:73},{x:-2443,z:65},{x:-2427,z:77}].find(p=>{const ground=a.groundProbe(p.x,p.z);return ground.clear&&ground.height>=ground.water;})??stable;
  await a.visit(stable);tick(a,2);a.look({yaw:.45,pitch:.3,distance:11});refresh(a);
  assert(a.groundProbe(stable.x,stable.z).clear,'Stable waiting ground is unobstructed');
  assert(!document.getElementById('opening-world-time').hidden,'Adventure time and event countdown are visible outdoors');
  assert(a.dayNight.state().enabled&&close(a.dayNight.state().hour,clock(a).hour),'Exterior sky reads the campaign’s exact hour');
  assert(clock(a).periodLabel==='first light'&&a.dayNight.state().visibleCelestials.sun,'First tower exit reveals dawn with the sun at the horizon');
  const linkedHour=clock(a).hour;
  assert(a.dayNight.setHour(0)===false&&a.dayNight.setSpeed(24)===false&&a.dayNight.setEnabled(false)===false&&close(a.dayNight.state().hour,linkedHour),'Linked sky rejects independent manual time controls');
  held(a,'Map',()=>a.openMap(),()=>a.resume());
  held(a,'Developer menu',()=>a.openDeveloper(),()=>a.resume());
  held(a,'Pause menu',()=>a.pause(),()=>a.resume());
  held(a,'Unfocused window',()=>window.dispatchEvent(new Event('blur')),()=>window.dispatchEvent(new Event('focus')));
  const reading=clock(a);tick(a);assert(clock(a).elapsedSeconds>reading.elapsedSeconds&&!clock(a).heldReason,'Returning to the world resumes time while stationary');
  move(a);assert(!clock(a).heldReason,'Walking does not change the running clock');
  const before=clock(a);tick(a,40,.04,.25);const after=clock(a);
  assert(close(after.fraction-before.fraction,10),'Ten active real seconds advance ten seconds of adventure time');
  assert(close(after.hour-before.hour,1/6)&&close(a.dayNight.state().hour,after.hour),'Sky advances ten in-world minutes from the same elapsed time');
  a.openMap();assert(document.getElementById('world-war-step').hidden,'Legacy instant day-step control is locked in the shared-clock rehearsal');a.resume();
  a.war.pause();move(a);const pausedTime=clock(a).elapsedSeconds;tick(a);assert(close(clock(a).elapsedSeconds,pausedTime)&&!clock(a).running&&/held|paused/i.test(clock(a).heldReason),'Explicit campaign pause stays paused after movement');a.war.run();
  openingSnapshot=savedCheckpoint(a);const beforeLoad=clock(a);move(a);tick(a,30);await a.loadSaved();a.resume();refresh(a);
  assert(close(clock(a).fraction,beforeLoad.fraction),'Memory restore retains the exact shared-clock time');
  assert(JSON.stringify(storageSnapshot())===JSON.stringify(storageBefore),'Memory saves do not touch any normal desktop save slot');
  return {checks:[...checks],clock:clock(a),position:a.state().position,render:a.renderStats()};
}

export async function waitDialog(a){
  window.dispatchEvent(new Event('focus'));a.resume();if(a.stable.mounted)key('KeyG');await a.visit(stable);refresh(a);
  const forecast=a.war.waitForecast();assert(forecast?.key,'Chronoscope has an upcoming army forecast');
  const before=clock(a);click('#opening-world-time [data-wait]');
  assert(document.getElementById('opening-time-dialog').matches(':modal')&&a.state().mode==='time-wait','Wait is a focused native modal that pauses play');
  tick(a);assert(close(clock(a).fraction,before.fraction),'Reading the wait forecast spends no time');
  click('#opening-time-dialog [data-cancel]');
  assert(a.state().mode==='playing'&&close(clock(a).fraction,before.fraction),'Cancel returns to play without advancing the campaign');
  assert(!a.war.waitOpening('stale-opening-clock-key')?.ok&&close(clock(a).fraction,before.fraction),'Stale forecast cannot advance time');
  await a.visit({x:-2365,z:147});refresh(a);const unsafeBefore=clock(a);
  assert(!a.war.waitOpening(forecast.key)?.ok&&close(clock(a).fraction,unsafeBefore.fraction),'Away from a safe place, direct waiting is rejected');
  await a.visit(stable);refresh(a);click('#opening-world-time [data-wait]');
  const dialog=document.getElementById('opening-time-dialog'),destination=dialog.querySelector('[data-destination]').textContent;
  assert(/Adventure 03:00/.test(destination)&&!/day|noon/i.test(destination),'Wait forecast gives the elapsed arrival time without a calendar date');
  return {checks:[...checks],forecast:a.war.waitForecast(),destination,clock:clock(a)};
}

export async function arrival(a){
  click('#opening-time-dialog [data-confirm]');refresh(a);
  assert(a.state().mode==='playing'&&close(clock(a).elapsedSeconds,180),'Confirmed wait lands exactly at Adventure 03:00');
  assert(active(a)?.started===3&&active(a).endsOn===6,'The opening Caricas battle arrives with its six-minute intervention deadline');
  assert(close(a.dayNight.state().hour,9),'The sun advances by the elapsed waiting time');
  assert(!clock(a).complete,'Arrival does not finish the opening rehearsal');
  const arrived=savedCheckpoint(a);tick(a);assert(clock(a).elapsedSeconds>180&&!clock(a).heldReason,'Completed waiting resumes ordinary time while stationary');await restore(a,arrived);
  a.war.pause();await a.visit({x:-2092,z:135});tick(a,2);refresh(a);
  assert(!document.querySelector('#opening-world-time [data-wait]').hidden,'Caricas north road is a second usable resting place outside the battlefield');
  beforeBattle=savedCheckpoint(a);a.war.pause();refresh(a);
  return {checks:[...checks],clock:clock(a),battle:first(a),render:a.renderStats()};
}

async function finishFight(a){
  window.dispatchEvent(new Event('focus'));let steps=0;
  for(;steps<7400&&a.state().mode==='skirmish'&&!combat(a)?.outcome;steps++){driveWorldEncounter(a,combat(a));a.step(1/60);}
  clearCombatKeys(a);assert(a.state().mode==='skirmish'&&combat(a)?.outcome==='success','Ordinary movement, strike and dodge inputs win the combat phase');
  const result=combat(a);assert(document.getElementById('battle-result-dialog')?.matches(':modal'),'Combat result remains a central modal');
  const before=clock(a);tick(a);assert(close(clock(a).elapsedSeconds,before.elapsedSeconds),'Battle result review holds the shared clock');
  return {stage:result.stage,seconds:result.time,health:result.hero.hp,steps};
}
async function campaign(a,side){
  await restore(a,{...beforeBattle,campaignSide:side});a.war.run();move(a);tick(a,68,.04,.25);assert(close(clock(a).elapsedSeconds,197),'Seventeen elapsed seconds pass before entering combat');a.war.pause();const fightTime=clock(a).elapsedSeconds,battle=active(a);await a.visit(battle.location);tick(a,2);
  if(a.state().mode!=='encounter')assert(a.war.join(battle.id).ok,'Battlefield entry opens the first encounter');
  assert(a.war.state().campaign.pending?.region==='caricas','Entry selects the first Caricas army');
  assert(/no hidden wait/.test(document.getElementById('encounter-time-notice').textContent),'Interception briefing explains there is no hidden regrouping time');
  await a.war.help(side,'intercept');assert(a.state().mode==='skirmish','Interception starts for '+side);
  const opening=await finishFight(a);click('#world-skirmish-continue');refresh(a);
  assert(a.war.state().campaign.pending?.stage==='rally','Interception continues into the allied final assault');
  assert(close(clock(a).elapsedSeconds,fightTime)&&close(a.dayNight.state().hour,clock(a).hour),'Regrouping preserves the exact adventure time and sky');
  assert(/current adventure time/.test(document.getElementById('encounter-time-notice').textContent),'Assault briefing explains immediate settlement at the current time');
  await a.war.help(side);const rally=await finishFight(a);
  assert(/03:17/.test(document.getElementById('world-skirmish-review').textContent)&&!/day|noon/i.test(document.getElementById('world-skirmish-review').textContent),'Final battle result records elapsed time without calendar-day jumps');
  click('#world-skirmish-continue');refresh(a);
  assert(first(a).status==='resolved'&&a.war.state().campaign.regions.caricas.owner===side,'Final assault records the '+side+' Caricas outcome');
  assert(clock(a).complete&&close(clock(a).elapsedSeconds,fightTime)&&!clock(a).running,'First aftermath ends the bounded prototype at the played battle time');
  await waitFor(()=>{a.openingTime.update(true);return a.openingTime.state().modal==='complete';},'Completion waits for a settled exploration mode',5000);
  assert(a.openingTime.state().modal==='complete'&&document.getElementById('opening-time-dialog').matches(':modal'),'First aftermath has its own clear completion announcement');
  const end=clock(a);tick(a);a.war.run();tick(a);assert(close(clock(a).fraction,end.fraction)&&!clock(a).running,'Completed opening cannot restart the rest of the campaign');
  await frames();return {side,opening,rally,clock:clock(a),battle:first(a),checks:[...checks]};
}
export const west=a=>campaign(a,'west');
export const east=a=>campaign(a,'east');

export async function aftermath(a){
  click('#opening-time-dialog [data-cancel]');refresh(a);
  assert(a.state().mode==='playing'&&clock(a).complete,'Explore aftermath returns control with time held');
  assert(document.getElementById('world-war-objective-title').textContent==='The first battle is settled','Aftermath objective stops directing the player to the next campaign battle');
  const saved=savedCheckpoint(a),savedTime=clock(a).elapsedSeconds;await a.loadSaved();a.resume();refresh(a);
  assert(clock(a).complete&&close(clock(a).elapsedSeconds,savedTime),'Aftermath memory checkpoint restores its exact elapsed time and stopped clock');
  if(a.openingTime.state().modal==='complete')click('#opening-time-dialog [data-cancel]');
  assert(saved.sharedOpening===2&&JSON.stringify(storageSnapshot())===JSON.stringify(storageBefore),'Aftermath memory restoration leaves normal saves untouched');
  return {checks:[...checks],clock:clock(a),render:a.renderStats()};
}

export async function unattended(a){
  await restore(a,beforeBattle);a.war.pause();await a.visit(stable);refresh(a);
  const forecast=a.war.waitForecast();click('#opening-world-time [data-wait]');
  const words=document.getElementById('opening-time-dialog').textContent;
  assert(/without|unattended|resolve/i.test(words),'Waiting past an active battle explicitly explains non-intervention');
  click('#opening-time-dialog [data-confirm]');refresh(a);
  if(!clock(a).complete){
    assert(close(clock(a).elapsedSeconds,300)&&first(a).status==='active'&&a.war.state().campaign.engagements.some(b=>b.region==='ovesos'&&b.status==='active'),'A new Ovesos battle interrupts waiting before the Caricas deadline');
    assert(a.openingTime.state().modal==='interrupted'&&clock(a).heldReason&&/Ovesos/.test(document.getElementById('opening-time-dialog').textContent),'Interrupted rest names the new battle and holds time for review');
    click('#opening-time-dialog [data-cancel]');refresh(a);
    tick(a);assert(clock(a).elapsedSeconds>300&&clock(a).elapsedSeconds<302&&first(a).status==='active','Closing interrupted rest resumes ordinary elapsed time without finishing the wait');assert(!clock(a).heldReason&&clock(a).running,'Interrupted rest resumes ordinary adventure time without movement');
    click('#opening-world-time [data-wait]');click('#opening-time-dialog [data-confirm]');refresh(a);
  }
  assert(first(a).status==='resolved'&&!first(a).heroResult,'Unattended wait resolves the actual battle without inventing a hero intervention');
  const other=a.war.state().campaign.engagements.find(b=>b.region==='ovesos');assert(!other||!a.war.join(other.id).ok,'The finished opening cannot launch another campaign battle');
  assert(clock(a).complete&&close(clock(a).elapsedSeconds,360),'Unattended aftermath ends at the actual six-minute deadline');
  await waitFor(()=>{a.openingTime.update(true);return a.openingTime.state().modal==='complete';},'Unattended completion is announced once',5000);
  assert(!a.state().frameErrors.length,'Opening clock, waiting and aftermath have no frame errors');
  assert(JSON.stringify(storageSnapshot())===JSON.stringify(storageBefore),'Normal saves remain unchanged after every branch');
  return {checks:[...checks],forecast,clock:clock(a),battle:first(a),automation:'Real tower and wait UI; scenery travel uses debug visit; fights use normal movement, strike and dodge input driver; no combat state is patched.',openingCheckpoint:!!openingSnapshot};
}

export async function message(a){
  refresh(a);await frames();
  const courier=a.war.state().courier,banner=document.getElementById('corris-arrival');
  assert(courier.telepathic&&!courier.visible&&!courier.landed&&courier.people.length===0&&courier.destination===null,'Telepathic delivery has no actor or landing and proximity state');
  assert(!banner.hidden&&/Taleth/.test(banner.textContent)&&!/Corris|raven|landing/i.test(banner.textContent),'Unread news is clearly announced as Taleth speaking');
  const br=banner.getBoundingClientRect(),cr=document.getElementById('opening-world-time').getBoundingClientRect();
  assert(document.getElementById('world-war-report').contains(banner)&&document.getElementById('world-war-report').contains(document.getElementById('opening-world-time')),'Telepathic notice and adventure clock share the objective panel');
  assert(br.bottom<=cr.top||cr.bottom<=br.top,'Telepathic notice and adventure clock occupy separate rows');
  const before=clock(a).elapsedSeconds;key('KeyV');assert(a.state().mode==='briefing'&&a.war.state().courier.conversation,'V opens Taleth directly without moving to a messenger');
  tick(a);assert(close(clock(a).elapsedSeconds,before),'Reading Taleth holds adventure time');key('Escape');refresh(a);
  assert(a.war.state().courier.delivery===courier.delivery,'Listening later preserves unread news');
  click('#corris-call');assert(/Taleth/.test(document.getElementById('taleth-letter-title').textContent),'The visible listen button opens the same message');
  assert(/Adventure/.test(document.getElementById('corris-report-date').textContent)&&!/day/i.test(document.getElementById('corris-report-date').textContent),'Message history uses elapsed event timestamps');
  assert(document.getElementById('taleth-letter-follow').hidden&&document.getElementById('taleth-letter-alternative').hidden,'Completed opening does not direct the player to an untested next front');
  click('#corris-understood');refresh(a);assert(a.war.state().courier.delivery===null,'Understood records that the message was heard');
  savedCheckpoint(a);await a.loadSaved();a.resume();refresh(a);
  if(a.openingTime.state().modal==='complete')click('#opening-time-dialog [data-cancel]');
  assert(a.war.state().courier.delivery===null&&a.war.state().letters.length>0,'Memory restore preserves both receipt and message history');
  a.openMap();click('#taleth-letters');assert(!document.getElementById('taleth-letter-dialog').hidden&&a.war.state().letters.length>0,'Acknowledged messages remain accessible from the map');
  await frames();return {checks:[...checks],clock:clock(a),courier:a.war.state().courier,noticeBounds:{x:br.x,y:br.y,w:br.width,h:br.height},clockBounds:{x:cr.x,y:cr.y,w:cr.width,h:cr.height}};
}

export async function death(a){
  await restore(a,beforeBattle);a.war.pause();const battle=active(a);await a.visit(battle.location);tick(a,2);
  if(a.state().mode!=='encounter')assert(a.war.join(battle.id).ok,'Death rehearsal opens the first battle');
  const before=clock(a).elapsedSeconds;await a.war.help('west','duel');
  assert(a.state().mode==='skirmish','Champion duel opens for the death rehearsal');
  for(let batch=0;batch<240&&a.state().mode==='skirmish';batch++){for(let i=0;i<30&&a.state().mode==='skirmish';i++)a.step(.04);await frames();}
  await waitFor(()=>a.state().mode==='limbo','Ordinary champion AI defeats the idle hero and enters limbo',20000);
  assert(a.afterlife.inLimbo&&!clock(a).complete&&first(a).status==='active','Duel death preserves the still-active Caricas battle');
  assert(close(clock(a).elapsedSeconds,before),'Death and crossing to the Reaper add no hidden adventure time');
  a.afterlife.talk();const report=document.getElementById('reaper-report').textContent;
  assert(/still|continues|active|underway/i.test(report)&&!/day \d/i.test(report),'The Reaper explains the unfinished battle without inventing calendar days');
  const limboSave=savedCheckpoint(a);assert(limboSave.afterlife?.inLimbo,'Limbo and its rewind checkpoint save together');
  assert(await a.afterlife.choose('retry'),'The Reaper can retry the same champion duel');
  assert(a.state().mode==='skirmish'&&combat(a).hero.hp===100,'Retry restores full health in a live fight');
  assert(close(clock(a).elapsedSeconds,before)&&first(a).status==='active'&&!a.afterlife.inLimbo,'Retry restores the same adventure time and uncompleted campaign');
  assert(!a.state().frameErrors.length,'Death and retry produce no frame errors');
  return {checks:[...checks],clock:clock(a),report,automation:'Real champion duel; hero deliberately idles until defeated by ordinary AI. No health or combat result is patched.'};
}

export async function noticeLayout(a){
  refresh(a);await frames();
  const notice=document.getElementById('corris-arrival'),bar=document.getElementById('opening-world-time');
  assert(!notice.hidden&&!bar.hidden,'Aftermath shows Taleth notification with the held adventure clock');
  const n=notice.getBoundingClientRect(),b=bar.getBoundingClientRect();
  assert(document.getElementById('world-war-report').contains(notice),'Taleth notification is integrated in the objective panel');
  assert(n.top>=b.bottom||b.top>=n.bottom,'Taleth notification has its own row beside the objective');
  assert(!/Bear \/ your horse/.test(document.getElementById('world-war-track').textContent)||document.getElementById('world-war-track').hidden,'Completed prototype clears obsolete horse tracking');
  return {...await hudLayout(a),noticeBounds:{top:n.top,bottom:n.bottom},clockBounds:{top:b.top,bottom:b.bottom}};
}

const shown=node=>!!node&&!node.hidden&&getComputedStyle(node).display!=='none'&&node.getClientRects().length>0;
const inside=(a,b)=>a.left>=b.left-1&&a.right<=b.right+1&&a.top>=b.top-1&&a.bottom<=b.bottom+1;
const separate=(a,b)=>a.right<=b.left+1||b.right<=a.left+1||a.bottom<=b.top+1||b.bottom<=a.top+1;
export async function hudLayout(a){
  refresh(a);await frames();
  const panel=document.getElementById('world-war-report'),bar=document.getElementById('opening-world-time'),track=document.getElementById('world-war-track'),notice=document.getElementById('corris-arrival');
  const p=panel.getBoundingClientRect(),b=bar.getBoundingClientRect();
  assert(shown(panel)&&shown(bar)&&panel.contains(bar),'Clock is visible inside the single campaign side panel');
  assert(inside(p,{left:0,right:innerWidth,top:0,bottom:innerHeight}),'Campaign panel stays within the viewport');
  assert(inside(b,p),'Adventure clock is contained by the campaign panel');
  assert(panel.scrollWidth<=panel.clientWidth+1,'Campaign panel has no horizontal clipping');
  assert(!shown(document.getElementById('world-war-hud')),'Top toolbar does not duplicate the adventure clock');
  if(innerWidth>=800)assert(p.right<=innerWidth*.43,'Campaign information leaves the center of the world unobstructed');
  if(shown(track))assert(panel.contains(track)&&inside(track.getBoundingClientRect(),p),'Tracking directions occupy the campaign panel instead of a second side card');
  if(shown(notice))assert(panel.contains(notice)&&inside(notice.getBoundingClientRect(),p),'Unread Taleth notice is visible inside the campaign panel');
  for(const id of ['exploration-minimap','teresod-sorcery']){const other=document.getElementById(id);if(shown(other))assert(separate(p,other.getBoundingClientRect()),'Campaign panel does not cover '+id);}
  const toast=document.getElementById('exploration-status');
  if(innerWidth<800&&shown(toast))assert(separate(p,toast.getBoundingClientRect()),'Phone status notification leaves the campaign panel unobstructed');
  const pointer=document.getElementById('war-world-pointer');
  if(shown(pointer))for(const id of ['world-war-report','exploration-minimap','teresod-sorcery']){const other=document.getElementById(id);if(shown(other))assert(separate(pointer.getBoundingClientRect(),other.getBoundingClientRect()),'World destination pointer clears '+id);}
  const primary=[bar.querySelector('[data-wait]'),document.getElementById('world-war-next'),document.getElementById('corris-call')].filter(shown);
  for(const button of primary)assert(inside(button.getBoundingClientRect(),p),'Primary campaign control stays reachable: '+button.textContent.trim());
  assert(!a.state().frameErrors.length,'Integrated HUD has no frame errors');
  return {checks:[...checks],size:[innerWidth,innerHeight],clock:clock(a),mounted:a.stable.mounted,panel:p.toJSON(),clockBounds:b.toJSON(),tracking:shown(track)?track.getBoundingClientRect().toJSON():null,notice:shown(notice)?notice.getBoundingClientRect().toJSON():null,render:a.renderStats()};
}

export async function hudMounted(a){
  a.resume();window.dispatchEvent(new Event('focus'));a.war.pause();
  await a.visit({x:STABLE.bear.x+1,z:STABLE.bear.z-2.5});key('KeyF');
  assert(a.state().mode==='briefing'&&!document.getElementById('stable-lesson').hidden,'HUD rehearsal uses Bear\'s real riding lesson');
  click('#stable-next');
  assert(a.stable.owned,'Bear hands over the horse through the ordinary conversation');
  await a.visit({x:a.stable.state().horse.x+1.5,z:a.stable.state().horse.z});key('KeyG');refresh(a);
  assert(a.stable.mounted,'HUD rehearsal mounts the real starting horse');
  a.war.run();move(a);for(let i=0;i<400&&clock(a).elapsedSeconds<60;i++)a.step(0,Math.min(.25,60-clock(a).elapsedSeconds));
  assert(clock(a).elapsedSeconds>=60&&a.war.followNext(),'Army order supplies a real trackable destination');
  a.war.pause();refresh(a);a.look({yaw:.45,pitch:.3,distance:11});
  assert(!document.getElementById('world-war-track').hidden,'Mounted scene includes live tracking directions');
  return hudLayout(a);
}

export async function hudReading(a){
  const panel=document.getElementById('world-war-report'),toggle=document.getElementById('campaign-panel-toggle');
  if(toggle.getAttribute('aria-expanded')==='true')click('#campaign-panel-toggle');
  await frames();assert(panel.classList.contains('campaign-panel-compact')&&shown(document.getElementById('opening-world-time'))&&shown(document.getElementById('world-war-objective-title')),'Less keeps the clock and current objective visible');
  a.war.run();move(a);click('#campaign-panel-toggle');await frames();
  const expandedAt=clock(a).elapsedSeconds;tick(a);assert(clock(a).elapsedSeconds>expandedAt&&toggle.getAttribute('aria-expanded')==='true','Expanded objective instructions keep ordinary time running');
  const help=document.getElementById('opening-time-help');help.open=true;await frames();
  const before=clock(a).elapsedSeconds;tick(a);
  assert(close(clock(a).elapsedSeconds,before),'Reading Time and waiting pauses the adventure clock');
  help.open=false;await frames();tick(a);
  assert(clock(a).elapsedSeconds>before&&!clock(a).heldReason,'Closing time help resumes adventure time without movement');
  a.war.pause();refresh(a);return hudLayout(a);
}

export async function waitLayout(a){
  await frames();const dialog=document.getElementById('opening-time-dialog'),box=dialog.getBoundingClientRect();
  assert(dialog.matches(':modal')&&a.state().mode==='time-wait','Safe wait remains a focused decision dialog');
  assert(inside(box,{left:0,right:innerWidth,top:0,bottom:innerHeight}),'Wait dialog fits the viewport');
  assert(dialog.scrollWidth<=dialog.clientWidth+1,'Wait explanation has no horizontal clipping');
  const button=dialog.querySelector('[data-confirm]');button.scrollIntoView({block:'nearest'});await frames();
  assert(inside(button.getBoundingClientRect(),box),'Wait confirmation is reachable in the dialog');
  return {checks:[...checks],size:[innerWidth,innerHeight],dialog:box.toJSON(),clock:clock(a)};
}
