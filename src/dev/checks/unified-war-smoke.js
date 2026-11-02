import {TALETH_SPOT,TOWER_DOOR,TOWER_EXIT,TOWER_SPAWN,LOOKOUT_TALETH,LOOKOUT_DOOR} from '../../app/exploration/tower-state.js';
import {FARMLAND_REGIONS} from '../../app/farmland-review/regions.js';
import {createAdventureWar} from '../../experiments/day-night/opening-war.js';
import {UNIFIED_WORLD_WAR_ID,FOOD_WORLD_SCENARIO,OPENING_WORLD_WAR_SCENARIO,createWorldWar} from '../../app/exploration/world-war.js';
import {WORLD_WAR_KEY,validateWorldWarSave} from '../../app/exploration/war-checkpoint.js';
import {FOOD_WORLD_KEY} from '../../app/food-world/scenario.js';
import {confirmTowerCampaign} from './tower-smoke.js';
import {canStand} from '../../gameplay/movement/locomotion.js';
import {RIDE} from '../../gameplay/movement/riding.js';
import {columnGroundClear,createColumnRoutes} from '../../app/exploration/war-column-routes.js';
import {columnTransitAllowed} from '../../app/exploration/war-column-access.js';
import {driveWorldEncounter,clearCombatKeys} from './encounter-controls.js';

// Real main-menu launch, conversation controls and combat inputs. Later army
// observation uses a reproducible natural campaign; player saves are isolated.
const checks=[],$=id=>document.getElementById(id);
const assert=(ok,label)=>{if(!ok)throw Error(label);checks.push(label);console.log('EXPLORATION_CHECK '+label);};
const frames=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
const key=code=>{for(const type of ['keydown','keyup'])document.dispatchEvent(new KeyboardEvent(type,{code,bubbles:true,cancelable:true}));};
const refresh=a=>{a.step(0,0);a.minimap.update(1,0);};
const state=a=>a.war.state(),campaign=a=>state(a).campaign,clock=a=>a.war.clock();
const near=(a,b)=>!!a&&!!b&&Math.hypot(a.x-b.x,a.z-b.z)<.06;
function trackArmy(a,id){const current=state(a).tracking?.target??state(a).guidance?.target;if(current?.kind!=='army'||current.id!==id)a.war.track({kind:'army',id});}
const ticks=(a,count=60)=>{for(let i=0;i<count;i++)a.step(.04);};
const otherKeys=[FOOD_WORLD_KEY,'azhora-exploration-v1','azhora-hearthfall-v1','azhora-lizeem-world-v1','azhora-lizeem-world-v2'];
const otherStorage=()=>otherKeys.map(key=>window.azhoraExplorationStorage.getItem(key));
let opening,otherSaves,departMs,laterArmyId,bearApproach;
async function until(test,label,timeout=300000){const end=performance.now()+timeout;while(!test()&&performance.now()<end)await new Promise(resolve=>setTimeout(resolve,50));assert(test(),label);}
function click(id){const button=$(id);assert(button&&!button.hidden&&!button.disabled,'Available campaign control: '+id);button.click();}
function save(a,label){assert(a.save().ok,label+' saves');const value=structuredClone(a.store.read().data);assert(validateWorldWarSave(value),label+' validates in the standard campaign slot');return value;}
async function restore(a,value){assert(a.store.save(structuredClone(value)).ok,'Unified checkpoint accepted');await a.loadSaved();a.resume();window.dispatchEvent(new Event('focus'));a.war.pause();refresh(a);}
function move(a){a.hold('KeyS',true);a.step(.04,0);a.hold('KeyS',false);}
function hold(a,label){const before=JSON.stringify({campaign:campaign(a),elapsed:clock(a).elapsedSeconds,sky:a.dayNight.state().hour});ticks(a,80);assert(JSON.stringify({campaign:campaign(a),elapsed:clock(a).elapsedSeconds,sky:a.dayNight.state().hour})===before,label+' holds the campaign, food economy and sky');}
function idle(a,seconds,label){const before=clock(a),position={...a.snapshot().position};for(let left=seconds;left>1e-7;left-=.25)a.step(.04,Math.min(.25,left));assert(Math.abs(clock(a).elapsedSeconds-before.elapsedSeconds-seconds)<1e-7,label+' advances the clock without movement');assert(near(a.snapshot().position,position),label+' leaves the player stationary');assert(Math.abs(a.dayNight.state().hour-clock(a).hour)<1e-7&&!clock(a).heldReason,label+' keeps daylight linked and displays running');}
function advanceTo(a,seconds){window.dispatchEvent(new Event('focus'));a.war.run();move(a);for(let i=0;i<2000&&clock(a).elapsedSeconds<seconds-1e-7;i++)a.step(0,Math.min(.25,seconds-clock(a).elapsedSeconds));a.war.pause();refresh(a);assert(Math.abs(clock(a).elapsedSeconds-seconds)<.001,'Adventure clock reaches '+seconds+' seconds');}
function result(a,extra={}){return {checks:[...checks],clock:clock(a),mode:a.state().mode,render:a.renderStats(),...extra};}
function standing(a,at,min=30,max=55){for(let r=min;r<=max;r+=3)for(let n=0;n<32;n++){const angle=n*Math.PI/16,p={x:at.x+Math.sin(angle)*r,z:at.z+Math.cos(angle)*r};if(a.testWorld.readyAt(p.x,p.z)&&canStand(p.x,p.z,a.testWorld,.8))return p;}throw Error('No clear observation ground near '+JSON.stringify(at));}
async function planned(a,id){await until(()=>{refresh(a);return state(a).columns.columns.some(c=>c.id===id&&!c.pendingRoute);},'Army '+id+' has a physical route',60000);return state(a).columns.columns.find(c=>c.id===id);}

export function menu(){assert(!$('start-screen').hidden,'The ordinary main menu is available');const button=document.querySelector('[data-start-mode="war"]');assert(button,'The ordinary Lizeemi War launch exists');button.click();assert($('campaign-allegiance-menu').hidden,'New game enters the tower before asking for allegiance');return {checks:[...checks]};}

export async function openingTower(a){
  window.dispatchEvent(new Event('focus'));otherSaves=otherStorage();
  assert(a.state().launch==='war'&&campaign(a).scenario===UNIFIED_WORLD_WAR_ID,'Normal Lizeemi War launches the unified food campaign');
  assert(clock(a).fullCampaign&&clock(a).sharedOpening&&clock(a).elapsedSeconds===0,'The unified campaign starts with the complete elapsed adventure clock');
  assert(campaign(a).food&&Object.values(campaign(a).regions).every(r=>r.food&&r.housing),'All five regions have food production and housing from the start');
  assert(a.tower.state().inside&&!a.tower.state().briefed&&!state(a).campaignSide&&!a.tower.state().exteriorLoaded,'The uncommitted tower remains a lazy-loaded safe haven');
  a.war.run();move(a);hold(a,'Walking in the tower');
  await a.visit({...TOWER_DOOR,z:TOWER_DOOR.z-1});key('KeyF');assert(a.tower.state().inside&&!a.tower.state().briefed,'The tower exit remains locked until Taleth asks for a side');
  await a.visit({...TALETH_SPOT,z:TALETH_SPOT.z+2});key('KeyF');assert(a.state().mode==='briefing','Taleth opens the real introduction');hold(a,'Reading Taleth');
  const before=JSON.stringify(campaign(a));click('tower-training-start');await until(()=>a.state().mode==='training','Taleth offers Stillroom practice in the unified campaign',30000);
  const practice=a.training;const lesson=document.querySelector('[data-training-lesson="fireball"]');assert(lesson,'The fireball lesson is available');lesson.click();key('KeyQ');ticks(a,100);
  assert(practice.state().phase==='complete'&&practice.state().stats.fireballHits>0,'The real training fireball completes its lesson');
  assert(JSON.stringify(campaign(a))===before&&clock(a).elapsedSeconds===0&&!a.tower.state().exteriorLoaded,'Training changes no food, campaign time or outdoor loading');practice.exit();
  await a.visit({...TALETH_SPOT,z:TALETH_SPOT.z+2});key('KeyF');confirmTowerCampaign(a,'west');
  assert(a.tower.state().briefed&&state(a).campaignSide==='west','Taleth commits the chosen league inside the tower');
  a.war.run();move(a);hold(a,'Walking in the tower after committing');
  opening=save(a,'Unified tower checkpoint');assert(opening.format===WORLD_WAR_KEY,'The unified campaign uses the existing normal save slot');
  const original=createWorldWar(null,OPENING_WORLD_WAR_SCENARIO),legacySave={...opening,...original.checkpoint(),openingEventTimes:original.snapshot().events.map(e=>e.day*60)},legacy=createAdventureWar(legacySave);
  assert(validateWorldWarSave(legacySave),'Earlier elapsed campaign checkpoints remain accepted by the normal slot');
  assert(!legacy.snapshot().food&&legacy.snapshot().scenario==='lizeem-opening-v2','Earlier elapsed campaigns replay their original non-food scenario');
  const oldFood=createWorldWar(null,FOOD_WORLD_SCENARIO);assert(oldFood.snapshot().food&&!oldFood.clock().sharedOpening,'The separate food experiment retains its original day clock');
  assert(JSON.stringify(otherStorage())===JSON.stringify(otherSaves),'Starting and practicing leave every unrelated save slot untouched');
  return result(a,{readyMs:a.state().readyMs});
}

async function departForBear(a){
  await a.visit({...TOWER_DOOR,z:TOWER_DOOR.z-1});const begun=performance.now();key('KeyF');await until(()=>a.state().mode==='playing'&&!a.tower.state().inside,'Real tower departure loads the reviewed countryside');departMs=Math.round(performance.now()-begun);a.war.pause();
  const geometry=a.testWorld.agricultureState();assert(geometry&&Object.keys(geometry.regions).length===5&&!geometry.legacyFarms,'Normal campaign has all five reviewed farm layouts and no duplicate legacy farms');
  const traffic=a.testWorld.riverTrafficState();assert(traffic?.ships===3&&traffic.traders===2,'Minora retains its guardship and two river traders');
  assert(a.dayNight.state().visibleCelestials.sun&&clock(a).periodLabel==='first light','First departure still reveals dawn');
  return geometry;
}
async function awaitBear(a){
  for(let i=0;i<400&&!a.stable.state().offerOpen;i++){a.step(.04,0);if(i%40===39)await frames();}
  assert(a.stable.state().offerOpen&&a.state().mode==='briefing'&&!$('stable-lesson').hidden,'Bear approaches and opens his horse offer without an interaction key');
}
function bearPose(a){
  const bear=a.testHero.group.parent.getObjectByName('Bear and the Minora horse').children[0];
  return Object.fromEntries(['Left Hip','Right Hip','Left Knee','Right Knee','Head'].map(name=>[name,bear.getObjectByName(name).rotation.toArray().slice(0,3)]));
}
function assertBearStanding(a,label){
  const pose=bearPose(a);
  assert(Math.abs(pose['Left Hip'][0]-pose['Right Hip'][0])<.03&&Math.max(Math.abs(pose['Left Hip'][0]),Math.abs(pose['Right Hip'][0]))<.06&&Math.max(pose['Left Knee'][0],pose['Right Knee'][0])<.12,label);
  return pose;
}
function acceptBear(a){
  assert($('stable-next').textContent.trim()==='Continue','The horse offer has a single Continue action');click('stable-next');refresh(a);
  const stable=a.stable.state(),player=a.snapshot().position,distance=Math.hypot(stable.horse.x-player.x,stable.horse.z-player.z);
  assert(stable.owned&&stable.taught&&!stable.mounted&&a.state().mount.kind==='foot'&&a.state().mode==='playing'&&$('stable-lesson').hidden,'One Continue grants the taught horse and leaves the player on foot');
  assert(distance>1.3&&distance<=RIDE.reach&&stable.horseVisible,'The delivered horse is visible and immediately within G mounting reach');
  assert(stable.horse.z>player.z+.7,'The tower handover places the horse ahead of the departing player');
  assert(canStand(stable.horse.x,stable.horse.z,a.testWorld,RIDE.radius),'Bear delivers the horse on clear dry ground');
  const mountPrompt=$('stable-interact'),towerPrompt=$('tower-interact');
  if(!mountPrompt.hidden&&!towerPrompt.hidden){const mountRect=mountPrompt.getBoundingClientRect(),towerRect=towerPrompt.getBoundingClientRect();assert(mountRect.top>=towerRect.bottom||towerRect.top>=mountRect.bottom,'The nearby tower and horse prompts do not overlap');}
  return {player,horse:stable.horse,distance};
}
export async function departure(a){
  const geometry=await departForBear(a);await awaitBear(a);a.war.run();hold(a,'Horse offer');acceptBear(a);
  key('KeyG');assert(a.stable.mounted,'G mounts the delivered starting horse without walking to the old stable position');
  advanceTo(a,41);assert(state(a).light.visible&&/Caricas/.test(state(a).guidance?.label),'Before the first march, the world indicator points toward Caricas');assert(a.minimap.state().target,'The route is also visible on the minimap');key('KeyG');
  a.war.run();move(a);a.openMap();hold(a,'Map reading');a.resume();idle(a,1,'Closing the map');a.war.pause();
  return result(a,{departMs,geometry});
}

export async function bearArrival(a){
  const geometry=await departForBear(a),before={...a.stable.state().bear},player={...a.snapshot().position};
  assert(!a.stable.owned&&a.state().mount.kind==='foot','The first tower exit starts without an owned horse');
  for(let i=0;i<20&&!a.stable.state().offerOpen;i++)a.step(.04,0);
  const after={...a.stable.state().bear},distance=p=>Math.hypot(p.x-player.x,p.z-player.z);
  assert(distance(after)<distance(before)-.3&&distance(after)>1,'Bear visibly walks closer before speaking');
  assert(near(player,a.snapshot().position),'Bear approaches the stationary player rather than requiring a trip to the stable');
  bearApproach={before,after,player};await frames();return result(a,{geometry,approach:bearApproach,stable:a.stable.state()});
}
export async function bearOffer(a){
  await awaitBear(a);const at=JSON.stringify(a.stable.state().bear);a.war.run();ticks(a,25);
  const settled=assertBearStanding(a,'Bear settles from his walking approach to a planted standing pose within one second');
  hold(a,'Reading Bear\'s one-line offer');
  assert(JSON.stringify(a.stable.state().bear)===at,'Bear stays in place throughout his conversation');
  assert(JSON.stringify(bearPose(a).Head)!==JSON.stringify(settled.Head),'Bear retains a subtle idle instead of freezing during dialogue');
  window.dispatchEvent(new Event('blur'));const blurred=JSON.stringify(bearPose(a));hold(a,'Unfocused Bear conversation');
  assert(JSON.stringify(bearPose(a))===blurred,'Bear\'s cosmetic animation also pauses when the window loses focus');window.dispatchEvent(new Event('focus'));
  const words=$('stable-words').textContent;
  assert(/\bG\b/.test(words)&&/\bWASD\b/.test(words)&&/\bH\b/.test(words),'Bear explains mounting, riding and whistling in the same short offer');
  assert(words.length<330&&!/\d\s*\/\s*\d/.test($('stable-page').textContent),'The offer is concise and has no multi-page lesson counter');
  assert([...$('stable-lesson').querySelectorAll('button')].filter(button=>!button.hidden).length===1,'The initial horse offer presents only one visible button');
  const button=$('stable-next').getBoundingClientRect();assert(button.top>=0&&button.bottom<=innerHeight&&button.left>=0&&button.right<=innerWidth,'Bear\'s Continue button stays fully within the viewport');
  await frames();return result(a,{words,approach:bearApproach,settled,stable:a.stable.state()});
}
export async function bearAccept(a){
  const delivered=acceptBear(a);idle(a,.5,'Continuing Bear\'s offer');a.war.pause();
  a.pause();const paused=JSON.stringify(bearPose(a));ticks(a,25);assert(JSON.stringify(bearPose(a))===paused,'The pause menu freezes Bear\'s animation');a.resume();
  await frames();return result(a,{delivered,stable:a.stable.state()});
}
export async function bearOwnership(a){
  const delivered={...a.stable.snapshot().horse},player={...a.snapshot().position};
  // Walk an actual dry lane away from the offered horse before ever mounting.
  let lane;
  for(let n=0;n<32&&!lane;n++){
    const angle=n*Math.PI/16,point=r=>({x:player.x+Math.sin(angle)*r,z:player.z+Math.cos(angle)*r});let clear=true;
    for(let r=0;r<=10;r+=.5){const p=point(r);if(!canStand(p.x,p.z,a.testWorld,.8)||Math.hypot(p.x-delivered.x,p.z-delivered.z)<1.8)clear=false;}
    if(clear)lane={target:point(10),yaw:angle+Math.PI};
  }
  assert(lane,'There is a safe walking route away from the offered horse');a.look({yaw:lane.yaw,pitch:.18,distance:7});a.hold('KeyW',true);
  try{for(let i=0;i<65;i++)a.step(.04,0);}finally{a.hold('KeyW',false);}refresh(a);
  const walking=a.snapshot().position;assert(Math.hypot(walking.x-delivered.x,walking.z-delivered.z)>6&&!a.stable.mounted,'The player may walk away without ever mounting');
  assert(near(a.stable.snapshot().horse,delivered),'The horse waits where Bear handed it over');
  assert(state(a).tracking?.target?.kind!=='horse'&&/Caricas/.test(state(a).guidance?.label??''),'Walking away advances the route to the campaign instead of trapping the horse objective');
  key('KeyH');assert(a.stable.state().called,'H still calls the owned horse after choosing to travel on foot');
  for(let i=0;i<400&&a.stable.state().called;i++)a.step(.04,0);
  const called=a.stable.state(),gap=Math.hypot(called.horse.x-walking.x,called.horse.z-walking.z);
  assert(!called.called&&gap<=RIDE.reach&&gap>2.4,'The whistled horse comes back and stops safely within mounting reach');
  key('KeyG');assert(a.stable.mounted,'G mounts the horse after the optional whistle');key('KeyG');assert(!a.stable.mounted,'G dismounts normally after the new introduction');
  const saved=save(a,'One-step Bear handover'),horse=JSON.stringify(a.stable.snapshot());await restore(a,saved);
  assert(JSON.stringify(a.stable.snapshot())===horse,'Continue preserves ownership, teaching and the exact parked horse');
  await a.visit(TOWER_EXIT);ticks(a,150);assert(!a.stable.state().offerOpen&&a.state().mode==='playing','Returning to the tower exit does not repeat the automatic handover');
  const bear=a.stable.state().bear;await a.visit({x:bear.x+1,z:bear.z-2});key('KeyF');assert(a.state().mode==='briefing','Bear remains available for a manual riding reminder');ticks(a,25);
  assertBearStanding(a,'Bear also stands normally in his riding reminder after save and restore');click('stable-next');refresh(a);
  assert(JSON.stringify(a.stable.snapshot())===horse,'The reminder cannot duplicate or relocate an already owned horse');
  assert(!a.state().frameErrors.length&&JSON.stringify(otherStorage())===JSON.stringify(otherSaves),'Bear approach, handover and Continue finish without frame errors or unrelated save changes');
  await frames();return result(a,{delivered,walking,calledGap:gap,stable:a.stable.state()});
}

export async function stationaryClock(a){
  window.dispatchEvent(new Event('focus'));const saved=save(a,'Stationary-clock baseline');
  a.war.run();const before=campaign(a),elapsed=clock(a).elapsedSeconds;idle(a,62,'Standing outdoors for more than a minute');
  const after=campaign(a);assert(after.day>before.day&&after.food.last&&JSON.stringify(after.food)!==JSON.stringify(before.food),'Stationary outdoor time runs the real food economy through a completed minute');
  assert(after.armies.some(ar=>ar.supply)&&JSON.stringify(after.armies)!==JSON.stringify(before.armies),'Stationary outdoor time provisions and moves the real campaign armies');
  assert(clock(a).elapsedSeconds>elapsed&&after.day<3,'The unattended clock check stays before the first battle');
  move(a);idle(a,2,'Stopping after walking');
  const toggle=$('campaign-panel-toggle');if(toggle.getAttribute('aria-expanded')!=='true')click('campaign-panel-toggle');idle(a,1,'Expanded objective instructions');
  for(const [id,label] of [['world-war-report-more','Report and strategy'],['opening-time-help','Time and waiting']]){
    const detail=$(id);assert(detail,'The reading panel exists: '+id);detail.querySelector('summary').click();assert(detail.open,label+' opens from its normal summary');hold(a,label);detail.querySelector('summary').click();assert(!detail.open,label+' closes from its normal summary');idle(a,1,'Closing '+label);
  }
  $('world-war-report-more').querySelector('summary').click();$('opening-time-help').querySelector('summary').click();hold(a,'Two open reading panels');$('world-war-report-more').querySelector('summary').click();hold(a,'The remaining time-help panel');$('opening-time-help').querySelector('summary').click();idle(a,1,'Closing the final reading panel');
  a.openMap();hold(a,'Stationary map reading');key('Escape');assert(a.state().mode==='playing','Escape returns from the map to the world');idle(a,1,'Leaving the map with Escape');
  const bear=a.stable.state().bear;await a.visit({x:bear.x+1,z:bear.z-2.5});key('KeyF');assert(a.state().mode==='briefing','F opens a real outdoor conversation while the clock runs');hold(a,'Outdoor conversation');key('Escape');assert(a.state().mode==='playing','Escape closes the outdoor conversation');idle(a,1,'Closing the outdoor conversation');
  a.war.pause();hold(a,'Explicit campaign pause');move(a);hold(a,'Moving during an explicit campaign pause');a.war.run();idle(a,1,'Explicit campaign resume');
  a.pause();hold(a,'Pause menu');key('Escape');idle(a,1,'Leaving the pause menu');
  window.dispatchEvent(new Event('blur'));hold(a,'Unfocused window');window.dispatchEvent(new Event('focus'));idle(a,1,'Returning window focus');
  const tested={elapsed:clock(a).elapsedSeconds,day:campaign(a).day};await restore(a,saved);assert(Math.abs(clock(a).elapsedSeconds-elapsed)<.001,'Clock regression restores the pre-battle fixture');
  assert(!a.state().frameErrors.length,'Stationary clock and reading transitions finish without frame errors');assert(JSON.stringify(otherStorage())===JSON.stringify(otherSaves),'Stationary clock checks preserve unrelated save slots');return result(a,{tested,departMs});
}

// One ordinary campaign exterior is reused for the neutral-city routing audit.
// Both directions matter: later attacks and retreats reverse the opening road.
export async function minoraRoutes(a){
  a.war.pause();const before=JSON.stringify(campaign(a)),routes=createColumnRoutes(a.testWorld),links=FOOD_WORLD_SCENARIO.routes.map(route=>route.regions),samples=[];
  for(const [from,to] of links)routes.get(from,to);
  const end=performance.now()+120000;
  while(routes.state().pending.length&&performance.now()<end){routes.step({budgetMs:3,maxSteps:250});await frames();}
  assert(!routes.state().pending.length&&!routes.state().failed.length,'All seven real-terrain campaign roads finish planning outside Minora / '+JSON.stringify(routes.state()));
  for(const [from,to] of links)for(const [origin,destination] of [[from,to],[to,from]]){
    const route=routes.get(origin,destination),label=origin+' to '+destination;assert(route?.points.length>1,label+' has a cached physical route');
    let count=0,blocked=null,unclear=null;
    for(let i=1;i<route.points.length;i++){
      const p=route.points[i-1],q=route.points[i],steps=Math.max(1,Math.ceil(Math.hypot(q.x-p.x,q.z-p.z)/1.5));
      for(let j=0;j<=steps;j++){const t=j/steps,at={x:p.x+(q.x-p.x)*t,z:p.z+(q.z-p.z)*t};count++;if(!columnTransitAllowed(at.x,at.z,.4))blocked??=at;if(!columnGroundClear(a.testWorld,at))unclear??=at;}
    }
    assert(!blocked,label+' remains outside Minora and its wall clearance / '+JSON.stringify(blocked));
    assert(!unclear,label+' stays on actual passable countryside or shallow crossings / '+JSON.stringify(unclear));
    const reverse=routes.get(destination,origin);assert(JSON.stringify(route.points)===JSON.stringify([...reverse.points].reverse()),label+' reverses exactly for the return journey');
    samples.push({from:origin,to:destination,length:route.length,samples:count,points:route.points});
  }
  assert(JSON.stringify(campaign(a))===before,'Physical bypass planning does not change army orders, supplies or the campaign clock');return result(a,{routes:samples});
}

async function observeOutsideMinora(a,checkpoint,armyId,side,label){
  a.resume();a.selectMount('foot');a.war.restore({...checkpoint,campaignSide:side,reportReadThrough:9999});a.war.pause();refresh(a);
  const staging=state(a).columns.columns.filter(c=>c.pendingRoute);
  if(staging.length){
    assert(staging.every(c=>columnTransitAllowed(c.location.x,c.location.z,.4)&&!c.visible&&!c.contactEligible&&!c.soldiers.length),label+' pending routes stage safely outside Minora without false troops or contact');
    const markers=a.war.minimapEvents();assert(staging.every(c=>near(markers.find(m=>m.target?.kind==='army'&&m.target.id===c.id),c.location)),label+' pending minimap markers use the permitted assembly points');
  }
  const orders=()=>JSON.stringify({armies:campaign(a).armies,food:campaign(a).food,elapsed:clock(a).elapsedSeconds}),before=orders(),model=await planned(a,armyId);await a.testWorld.prepare(model.location.x,model.location.z);
  const vantage=standing(a,model.location);await a.visit(vantage);trackArmy(a,armyId);refresh(a);
  const shown=state(a).columns.columns.find(c=>c.id===armyId),marker=a.war.minimapEvents().find(e=>e.target?.kind==='army'&&e.target.id===armyId);
  assert(shown.visible&&shown.soldiers.length>0,label+' has visible physical troops');
  assert(columnTransitAllowed(shown.location.x,shown.location.z,.4),label+' standard stays outside neutral Minora');
  assert(shown.soldiers.every(([x,y,z])=>columnTransitAllowed(x,z,.4)&&columnGroundClear(a.testWorld,{x,z})&&Math.abs(a.groundProbe(x,z).height-y)<.03),label+' soldiers are grounded and stay outside the walls');
  assert(marker&&near(marker,shown.location)&&state(a).light.visible&&near(state(a).light.location,shown.location),label+' world indicator and minimap follow the same bypass');
  assert(a.state().mode==='playing'&&orders()===before,label+' observation preserves campaign orders and does not force combat');
  a.look({yaw:Math.atan2(vantage.x-shown.location.x,vantage.z-shown.location.z),pitch:.2,distance:13});await frames();
  return {army:campaign(a).armies.find(ar=>ar.id===armyId),column:shown,staging};
}

export async function minoraOpening(a){
  const fixture=createAdventureWar();fixture.advance(2);const army=fixture.snapshot().armies.find(ar=>ar.owner==='west'&&ar.status==='marching'&&ar.to==='caricas');
  assert(army,'The actual opening West army is marching toward Caricas');const checkpoint={...fixture.checkpoint(),fraction:17};
  const sample=await observeOutsideMinora(a,checkpoint,army.id,'east','Opening West army at 02:34');
  assert(clock(a).elapsedSeconds===154,'The Minora regression reproduces the screenshot time of 02:34');
  const expected={...sample.column.location},saved=save(a,'Opening neutral-city bypass');await restore(a,saved);const restored=await planned(a,army.id);
  assert(near(restored.location,expected),'Continue preserves the same bypass location');return result(a,{...sample});
}

async function minoraLaterSample(a,retreat){
  const fixture=createAdventureWar();let army;
  for(let i=0;i<100&&!fixture.snapshot().winner;i++){fixture.advance(1);const current=fixture.snapshot();army=current.day>=10?current.armies.find(ar=>retreat?ar.status==='retreating':ar.owner==='east'&&ar.status==='marching'):null;if(army)break;}
  const label=retreat?'Later retreating army':'Later East army';assert(army,label+' arises from the normal food campaign');
  const sample=await observeOutsideMinora(a,{...fixture.checkpoint(),fraction:15},army.id,army.owner,label);
  assert(!a.state().frameErrors.length,label+' renders without frame errors');assert(JSON.stringify(otherStorage())===JSON.stringify(otherSaves),'Neutral-city checks preserve unrelated save slots');return result(a,{...sample});
}
export const minoraEast=a=>minoraLaterSample(a,false);
export const minoraRetreat=a=>minoraLaterSample(a,true);

export async function farmland(a){
  const views=[];a.war.pause();
  for(const r of Object.values(FARMLAND_REGIONS)){
    const [x,z]=r.spawns.town;await a.visit({x,z});refresh(a);assert(a.groundProbe(x,z).clear,r.name+' town arrival is clear');
    const geometry=a.testWorld.agricultureState();assert(geometry.regions[r.id].capacity===campaign(a).regions[r.id].food.production,r.name+' visible farm capacity matches simulated production');
    let clear=true;for(const lane of r.lanes)for(let i=1;i<lane.length;i++){const [ax,az]=lane[i-1],[bx,bz]=lane[i],n=Math.ceil(Math.hypot(bx-ax,bz-az)/4);for(let j=0;j<=n;j++)if(!canStand(ax+(bx-ax)*j/n,az+(bz-az)*j/n,a.testWorld,.34))clear=false;}
    assert(clear,r.name+' farm lanes stay walkable');a.look({distance:20,pitch:.4,yaw:r.spawns.town[2]});await frames();views.push({region:r.id,render:a.renderStats()});
  }
  assert(!performance.getEntriesByType('resource').some(e=>new URL(e.name).pathname==='/src/world.js'),'The normal campaign avoids loading the legacy world builder');
  return result(a,{views});
}

export async function openingMarch(a){
  await a.visit({x:-2433.5,z:77});advanceTo(a,65);
  assert(campaign(a).food.last&&campaign(a).armies.some(ar=>ar.supply),'Advancing adventure time updates regional food and provisions armies');
  const id=state(a).guidance?.target?.id??state(a).tracking?.target?.id;assert(id!==undefined,'The opening route automatically tracks a real army');const model=await planned(a,id);await a.testWorld.prepare(model.location.x,model.location.z);
  const vantage=standing(a,model.location);await a.visit(vantage);a.war.pause();trackArmy(a,id);refresh(a);
  const column=state(a).columns.columns.find(c=>c.id===id),marker=a.war.minimapEvents().find(e=>e.target?.kind==='army'&&e.target.id===id);
  assert(column.visible&&column.soldiers.length>0,'The opening army is visibly marching through the reviewed countryside');
  assert(near(column.location,marker)&&near(column.location,state(a).light.location),'Army standard, world indicator and minimap agree');
  assert(column.soldiers.every(([x,y,z])=>columnGroundClear(a.testWorld,{x,z})&&Math.abs(a.groundProbe(x,z).height-y)<.03),'Opening soldiers stand on clear reviewed terrain');
  a.look({yaw:Math.atan2(vantage.x-column.location.x,vantage.z-column.location.z),pitch:.16,distance:11});await frames();
  return result(a,{column});
}

export async function report(a){
  a.openMap();a.war.openFoodReport('caricas');await frames();const panel=$('food-world-report'),text=panel.textContent;
  assert(panel.open&&text.includes('Housing capacity')&&/food in store/.test(text),'The ordinary campaign map exposes real food and housing');
  assert(/Adventure\s+\d\d:\d\d/.test(text)&&!(/\bDay\s+\d|next day|last completed day/i.test(text)),'Food report uses adventure time instead of calendar days');
  hold(a,'Food report');return result(a,{report:text});
}

export async function firstBattle(a){
  a.resume();await a.visit({x:-2433.5,z:77});advanceTo(a,180);const battle=campaign(a).engagements.find(b=>b.region==='caricas'&&b.status==='active');assert(battle,'The first Caricas battle still opens at 03:00');
  await a.visit(battle.location);refresh(a);if(!campaign(a).pending)assert(a.war.join(battle.id).ok,'The real Caricas battlefield can be joined');
  const elapsed=clock(a).elapsedSeconds,food=JSON.stringify(campaign(a).food),phases=[];
  for(let phase=0;phase<3&&campaign(a).pending;phase++){
    await a.war.help('west',campaign(a).pending.stage==='rally'?undefined:'intercept');assert(a.state().mode==='skirmish','Actual combat begins on the reviewed Caricas ground');
    let fight=state(a).encounter.encounter,steps=0;
    for(;steps<10000&&!fight?.outcome&&a.state().mode==='skirmish';steps++){driveWorldEncounter(a,fight);a.step(1/60);if(steps%120===119)await frames();fight=state(a).encounter.encounter;}
    clearCombatKeys(a);assert(fight?.outcome==='success','Ordinary staff, dodge and fireball inputs win phase '+phase);assert(a.state().fieldActors.every(actor=>actor.clear),'Caricas combat actors stay clear of farm buildings');
    assert(clock(a).elapsedSeconds===elapsed&&JSON.stringify(campaign(a).food)===food,'Combat does not spend adventure time or tick the food economy');phases.push({stage:fight.stage,steps,health:fight.hero.hp});click('world-skirmish-continue');refresh(a);
  }
  assert(campaign(a).engagements.find(b=>b.id===battle.id).status==='resolved'&&!clock(a).complete,'Caricas resolves and the food-enabled full campaign continues');
  assert(/\S/.test($('world-war-objective-title').textContent),'Taleth gives a next directive after the first battle');
  const saved=save(a,'Played battle and food economy'),expected=JSON.stringify(campaign(a));await restore(a,saved);assert(JSON.stringify(campaign(a))===expected,'Continue exactly restores the battle result, food and housing');
  return result(a,{phases});
}

export async function laterMarch(a){
  const fixture=createAdventureWar();let army;
  for(let i=0;i<60&&!fixture.snapshot().winner;i++){fixture.advance(1);const s=fixture.snapshot();army=s.day>=10?s.armies.find(ar=>ar.owner==='east'&&ar.status==='marching'):null;if(army)break;}
  assert(army,'An unattended unified campaign naturally creates a later hostile march');laterArmyId=army.id;
  a.war.restore({...fixture.checkpoint(),campaignSide:'west',reportReadThrough:9999});a.war.pause();refresh(a);const model=await planned(a,army.id);await a.testWorld.prepare(model.location.x,model.location.z);
  const vantage=standing(a,model.location);await a.visit(vantage);trackArmy(a,army.id);refresh(a);let shown=state(a).columns.columns.find(c=>c.id===army.id);
  assert(shown.visible&&shown.soldiers.length>0,'A later food-supplied army also has physical soldiers');assert(shown.soldiers.every(([x,y,z])=>columnGroundClear(a.testWorld,{x,z})&&Math.abs(a.groundProbe(x,z).height-y)<.03),'Later soldiers stand on clear terrain');
  const budget=state(a).columns;assert(budget.columns.filter(c=>c.visible).length<=budget.budget.columns&&budget.columns.reduce((n,c)=>n+c.soldiers.length,0)<=budget.budget.soldiers,'Later marching keeps the bounded scenery budget');
  const at={...shown.location},saved=save(a,'Later supplied march');await restore(a,saved);shown=state(a).columns.columns.find(c=>c.id===army.id);assert(near(shown.location,at),'Later army position survives Continue without jumping');
  assert(near(a.war.minimapEvents().find(e=>e.target?.id===army.id&&e.target.kind==='army'),shown.location),'Later army keeps its minimap position');
  a.look({yaw:Math.atan2(vantage.x-shown.location.x,vantage.z-shown.location.z),pitch:.16,distance:11});await frames();return result(a,{army,column:shown});
}

export async function roadside(a){
  const at=state(a).columns.columns.find(c=>c.id===laterArmyId).location;
  let lane;for(let i=0;i<32&&!lane;i++){const angle=i*Math.PI/16,point=r=>({x:at.x+Math.sin(angle)*r,z:at.z+Math.cos(angle)*r});let clear=true;for(let r=10;r<=30;r+=1.5){const p=point(r);if(!canStand(p.x,p.z,a.testWorld,.75))clear=false;}if(clear)lane={away:point(30),close:point(10),yaw:angle};}
  assert(lane,'The later column has a clear physical approach');await a.visit(lane.away);a.look({yaw:lane.yaw,pitch:.15,distance:10});const before=JSON.stringify(campaign(a).armies);a.hold('KeyW',true);for(let i=0;i<220&&a.state().mode==='playing';i++)a.step(.04,0);a.hold('KeyW',false);await frames();
  assert(campaign(a).pending?.kind==='roadside'&&campaign(a).pending.armyId===laterArmyId,'Walking up to a later enemy column opens its own interception');
  assert($('encounter-dialog').matches(':modal')&&!/choose (?:a|your) side/i.test($('encounter-brief').textContent),'Interception keeps the committed league and asks only for confirmation');hold(a,'Roadside invitation');
  a.war.withdraw();refresh(a);assert(a.state().mode==='playing'&&JSON.stringify(campaign(a).armies)===before,'Declining interception leaves army orders and supplies unchanged');
  return result(a);
}

export async function lookout(a){
  const fixture=createAdventureWar();fixture.advance(300);assert(!!fixture.snapshot().winner,'The unified food economy reaches a natural unattended war result');
  a.war.restore({...fixture.checkpoint(),campaignSide:'west',reportReadThrough:9999});a.war.pause();await a.visit(TOWER_EXIT);key('KeyF');await until(()=>a.tower.state().inside&&a.state().mode==='playing','The real tower entrance accepts the completed unified campaign');
  await a.visit({...TALETH_SPOT,z:TALETH_SPOT.z+2});key('KeyF');click('tower-next');await until(()=>a.tower.state().room==='lookout'&&a.state().mode==='playing','The postwar lookout loads the surrounding landscape');
  await a.visit({...LOOKOUT_TALETH,z:LOOKOUT_TALETH.z+2});key('KeyF');refresh(a);await frames();
  const panorama=a.testWorld.state().panorama;assert(panorama?.visible&&panorama.landmarks.includes('Ambron')&&panorama.landmarks.includes('Pyra'),'The authentic Ambron and Pyra landscapes remain in the unified lookout');
  assert(panorama.countrysideMask?.active&&panorama.countrysideMask.materialVariants>0,'The lookout combines current farmland and distant regions without duplicate nearby scenery');
  const traffic=a.testWorld.riverTrafficState();assert(traffic?.ships===3&&traffic.traders===2,'The lookout uses the same Minora guardship and moving traders');hold(a,'The postwar lookout');
  assert(!a.state().frameErrors.length,'The combined lookout material shaders render without frame errors');return result(a,{panorama,traffic});
}

export async function finish(a){
  const samples=[];for(let i=0;i<30;i++){const begin=performance.now();a.step(1/60,0);samples.push(performance.now()-begin);await frames();}samples.sort((a,b)=>a-b);
  assert(JSON.stringify(otherStorage())===JSON.stringify(otherSaves),'The unified test leaves separate food and older save slots unchanged');assert(!a.state().frameErrors.length,'Unified countryside, training, battle and later march finish without frame errors');
  return result(a,{departMs,agriculture:a.testWorld.agricultureState(),cpuFrameMs:{median:samples[15],p95:samples[28],max:samples[29]},automation:'Real main-menu, Taleth, training, Bear, horse and combat controls. Debug travel between sites; later armies arise from an unmodified deterministic unified campaign.'});
}

const sampleSummary=values=>{const s=[...values].sort((a,b)=>a-b);return {median:s[Math.floor(s.length/2)],p95:s[Math.floor(s.length*.95)],min:s[0],max:s.at(-1)};};
async function naturalFrames(a,name){
  const frame=()=>new Promise(requestAnimationFrame);for(let i=0;i<20;i++)await frame();
  let last=await frame();const intervals=[];
  // The game supplies every frame here. No manual step or extra render is
  // inserted into these intervals, unlike the deterministic combat driver.
  for(let i=0;i<80;i++){const now=await frame();intervals.push(now-last);last=now;}
  const submit=[];let render;for(let i=0;i<12;i++){render=a.renderStats();submit.push(render.cpuMs);}
  assert(!a.state().frameErrors.length,name+' profiles without renderer errors');
  return {name,frames:80,automaticFrameMs:sampleSummary(intervals),renderSubmitCpuMs:sampleSummary(submit),render};
}
export async function legacyLookout(a){
  assert(a.testWorld.setLookoutCountrysideReview(false),'The diagnostic switches to the original cached panorama');await frames();
  return result(a,{profile:await naturalFrames(a,'Original cached lookout')});
}
export async function reviewedLookout(a){
  assert(a.testWorld.setLookoutCountrysideReview(true),'The diagnostic restores the current reviewed countryside');await frames();
  return result(a,{profile:await naturalFrames(a,'Reviewed farms with distant cached landscape')});
}
export async function groundProfile(a){
  click('tower-close');await a.visit({...LOOKOUT_DOOR,z:LOOKOUT_DOOR.z-1});key('KeyF');await until(()=>a.tower.state().room==='tower'&&a.state().mode==='playing','The lookout stairs return to the chamber');
  await a.visit({...TOWER_DOOR,z:TOWER_DOOR.z-1});key('KeyF');await until(()=>!a.tower.state().inside&&a.state().mode==='playing','The tower reuses the already loaded countryside');
  await a.visit({x:-2365,z:147});a.look({yaw:.4,pitch:.2,distance:10});await frames();return result(a,{profile:await naturalFrames(a,'Minora street / reviewed countryside')});
}
export async function caricasProfile(a){
  const r=FARMLAND_REGIONS.caricas,[x,z]=r.spawns.town;await a.visit({x,z});a.look({yaw:r.spawns.town[2],pitch:.2,distance:10});await frames();
  return result(a,{profile:await naturalFrames(a,'Caricas street / reviewed countryside')});
}

export function prepareReload(a){
  save(a,'Fresh-page Continue fixture');return {campaign:campaign(a),elapsed:clock(a).elapsedSeconds,position:a.snapshot().position,side:state(a).campaignSide,others:otherStorage()};
}
export function continueMenu(){
  const button=document.querySelector('[data-continue-mode="war"]');assert(button&&!button.disabled&&!$('start-screen').hidden,'A newly loaded main menu offers Continue war scenario');button.click();return {checks:[...checks]};
}
export async function continued(a,expected){
  window.dispatchEvent(new Event('focus'));a.war.pause();refresh(a);
  assert(a.state().foodEconomy&&a.state().reviewedCountryside&&campaign(a).scenario===UNIFIED_WORLD_WAR_ID,'Fresh-page Continue selects unified food rules and reviewed scenery');
  assert(JSON.stringify(campaign(a))===JSON.stringify(expected.campaign)&&clock(a).elapsedSeconds===expected.elapsed&&state(a).campaignSide===expected.side,'Fresh-page Continue preserves the exact food campaign, elapsed time and allegiance');
  assert(Math.hypot(a.snapshot().position.x-expected.position.x,a.snapshot().position.z-expected.position.z)<.01,'Fresh-page Continue restores the outdoor hero position');
  assert(Object.keys(a.testWorld.agricultureState().regions).length===5,'Fresh-page outdoor Continue builds the five reviewed farm regions');
  assert(JSON.stringify(otherStorage())===JSON.stringify(expected.others),'Fresh-page Continue does not change separate save slots');await frames();return result(a);
}
export function prepareLegacyReload(a){
  const original=createWorldWar(null,OPENING_WORLD_WAR_SCENARIO),saved=structuredClone(a.store.read().data);
  const legacy={...saved,...original.checkpoint(),sharedOpening:2,fullCampaign:true,openingEventTimes:original.snapshot().events.map(e=>e.day*60),
    tower:{version:1,location:'tower',briefed:true,running:false},exploration:{...saved.exploration,position:{...TOWER_SPAWN}},reportReadThrough:0};delete legacy.navigation;
  assert(validateWorldWarSave(legacy)&&a.store.save(legacy).ok,'A genuine earlier elapsed campaign is saved in the isolated normal slot');return {others:otherStorage(),scenario:legacy.simulation.scenario};
}
export async function continuedLegacy(a,expected){
  a.war.pause();refresh(a);assert(campaign(a).scenario===expected.scenario&&!campaign(a).food&&clock(a).fullCampaign,'Fresh-page Continue keeps earlier elapsed campaign rules');
  assert(!a.state().foodEconomy&&!a.state().reviewedCountryside,'Fresh-page Continue selects original countryside for an earlier non-food save');
  assert(a.tower.state().inside&&!a.tower.state().exteriorLoaded&&!a.testWorld.agricultureState(),'Earlier tower saves still defer exterior construction');
  assert(a.store.read().data.simulation.scenario===expected.scenario&&JSON.stringify(otherStorage())===JSON.stringify(expected.others),'Reading an earlier campaign neither migrates it nor changes other save slots');
  assert(!a.state().frameErrors.length,'Fresh-page legacy Continue has no renderer errors');await frames();return result(a);
}
