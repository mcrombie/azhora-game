import {TOWER_DOOR,TALETH_SPOT} from '../../app/exploration/tower-state.js';
import {MINORA_STABLE as STABLE} from '../../content/regions/minora-frontier/minora-stable.js';
import {confirmTowerCampaign} from './tower-smoke.js';
import {validateWorldWarSave} from '../../app/exploration/war-checkpoint.js';
import {canStand} from '../../gameplay/movement/locomotion.js';

// Normal menu, real Taleth choice and horse handoff, with ordinary discovery.
// No forced reveal-all, campaign rewrites, fabricated sightings or preview startup.
const checks=[],$=id=>document.getElementById(id);
const assert=(ok,label)=>{if(!ok)throw Error(label);checks.push(label);console.log('EXPLORATION_CHECK '+label);};
const frames=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
const key=code=>{for(const type of ['keydown','keyup'])document.dispatchEvent(new KeyboardEvent(type,{code,bubbles:true,cancelable:true}));};
const refresh=a=>{a.step(0,0);a.minimap.update(1,0);};
const war=a=>a.war.state(),clock=a=>a.war.clock();
const selected=a=>war(a).guidance?.target??war(a).tracking?.target;
const near=(a,b)=>!!a&&!!b&&Math.hypot(a.x-b.x,a.z-b.z)<.05;
let undecided;
async function until(test,label,timeout=300000){const end=performance.now()+timeout;while(!test()&&performance.now()<end)await new Promise(resolve=>setTimeout(resolve,50));assert(test(),label);}
function save(a,label){assert(a.save().ok,label+' saves');const value=structuredClone(a.store.read().data);assert(validateWorldWarSave(value,value.format),label+' validates');return value;}
async function restore(a,value){assert(a.store.save(structuredClone(value)).ok,'Isolated marker checkpoint accepted');await a.loadSaved();a.resume();window.dispatchEvent(new Event('focus'));a.war.pause();refresh(a);}
function advanceTo(a,seconds){
  window.dispatchEvent(new Event('focus'));a.war.run();a.hold('KeyS',true);a.step(.04,0);a.hold('KeyS',false);
  for(let n=0;n<1000&&clock(a).elapsedSeconds<seconds-.000001;n++)a.step(0,Math.min(.25,seconds-clock(a).elapsedSeconds));
  a.war.pause();refresh(a);assert(Math.abs(clock(a).elapsedSeconds-seconds)<.001,'Ordinary adventure clock reaches '+seconds+' seconds');
}
function result(a){return {checks:[...checks],side:war(a).campaignSide,clock:clock(a),guidance:war(a).guidance,tracking:war(a).tracking,light:war(a).light,minimap:a.minimap.state(),render:a.renderStats()};}

export function menu(){const button=document.querySelector('[data-start-mode="war"]');assert(button&&!$('start-screen').hidden,'Normal campaign menu is available');button.click();assert($('campaign-allegiance-menu').hidden,'Campaign opens without the obsolete side-selection screen');return {checks:[...checks]};}

export async function prepare(a){
  window.dispatchEvent(new Event('focus'));assert(a.tower.state().inside&&!war(a).campaignSide,'Ordinary new game starts undecided in the tower');
  assert(clock(a).fullCampaign&&clock(a).sharedOpening,'Ordinary campaign uses the complete adventure clock');
  undecided=save(a,'Undecided normal campaign');return result(a);
}

async function departure(a,side){
  if(war(a).campaignSide)await restore(a,undecided);
  await a.visit({x:TALETH_SPOT.x,z:TALETH_SPOT.z+2});key('KeyF');confirmTowerCampaign(a,side);
  assert(war(a).campaignSide===side,'Taleth commits the '+side+' campaign');
  await a.visit({...TOWER_DOOR,z:TOWER_DOOR.z-1});key('KeyF');
  await until(()=>a.state().mode==='playing'&&!a.tower.state().inside,'Real tower departure finishes for '+side);a.war.pause();
  await a.visit({x:STABLE.bear.x+1,z:STABLE.bear.z-2.5});key('KeyF');
  assert(a.state().mode==='briefing'&&!$('stable-lesson').hidden,'Bear gives the ordinary horse lesson');
  $('stable-next').click();refresh(a);assert(a.stable.owned,'Horse handoff completes before testing navigation');
  const onFoot=save(a,'Horse handoff before mounting');
  const onFootAction=$('world-war-next');assert(!onFootAction.hidden&&!onFootAction.disabled,'On foot, the objective offers the Caricas direction before departure');onFootAction.click();a.war.pause();refresh(a);
  assert(war(a).light.visible&&/Caricas/.test(war(a).guidance?.label),'A player traveling on foot can track Caricas before any army exists');
  await restore(a,onFoot);
  await a.visit({x:a.stable.state().horse.x+1.5,z:a.stable.state().horse.z});key('KeyG');assert(a.stable.mounted,'The real starting horse mounts normally');
  advanceTo(a,41);refresh(a);await frames();
  assert(!war(a).campaign.armies.some(ar=>ar.status==='marching'),'At 00:41 the opening army has not yet started marching');
  assert(!a.war.minimapEvents().some(e=>e.kind==='army'),'No fabricated predeparture army appears on the minimap');
  assert(war(a).guidance?.location&&/Caricas/i.test(war(a).guidance.label),'At 00:41 the objective gives a real Caricas destination');
  assert(war(a).light.visible,'At 00:41 the world direction indicator is visible after mounting');
  assert(a.minimap.state().target&&a.minimap.state().draw?.optional,'At 00:41 the destination is drawn on the minimap');
  assert(!$('world-war-track').hidden,'The compact direction and distance row remains visible');
  key('KeyG');refresh(a);assert(!a.stable.mounted&&war(a).light.visible&&/Caricas/.test(war(a).guidance?.label),'Dismounting keeps the campaign destination instead of restoring horse guidance');
  const routeSave=save(a,'Predeparture Caricas guide');await restore(a,routeSave);
  assert(war(a).light.visible&&/Caricas/.test(war(a).guidance?.label),'Continue preserves the predeparture destination on foot');
  assert(a.minimap.state().target!=='horse','Dismounting on Continue does not replace the campaign guide with a horse marker');
  await frames();
  return result(a);
}
export const westDeparture=a=>departure(a,'west');
export const eastDeparture=a=>departure(a,'east');

async function moving(a){
  advanceTo(a,65);refresh(a);await frames();
  const target=selected(a);
  assert(target?.kind==='army','The destination automatically becomes the real marching army');
  const mark=a.war.minimapEvents().find(e=>e.target?.kind==='army'&&e.target.id===target.id);
  assert(mark&&war(a).light.visible&&near(mark,war(a).light.location),'Marching army has agreeing world and minimap indicators with normal launch discovery settings');
  assert(a.minimap.state().events.some(e=>e.target?.id===target.id&&e.selected&&e.clamped),'The selected distant army appears at the minimap edge');
  const count=a.state().cells.length,position={...war(a).light.location};
  a.pause();refresh(a);assert(!war(a).light.visible&&!a.minimap.state().visible,'Pause hides outdoor navigation');a.resume();refresh(a);
  assert(war(a).light.visible&&near(war(a).light.location,position),'Resume restores the same army indicator');
  const saved=save(a,'Tracked opening army');await restore(a,saved);
  assert(selected(a)?.id===target.id&&war(a).light.visible,'Continue restores automatic army tracking');
  assert(a.state().cells.length===count,'Saving and restoring tracking reveals no extra map cells');
  $('world-war-track').querySelector('button[aria-label="Stop tracking"]').click();refresh(a);
  assert(!war(a).light.visible,'Stop tracking removes the world guide');
  a.step(.04,0);refresh(a);assert(!war(a).light.visible,'Automatic guidance respects an explicit Stop');
  const action=$('world-war-next');assert(!action.hidden&&!action.disabled,'The main objective exposes a way to resume tracking');action.click();a.war.pause();refresh(a);
  assert(selected(a)?.id===target.id&&war(a).light.visible,'The objective action restores the real army indicator');
  await frames();return result(a);
}
export const westMarch=moving;
export const eastMarch=moving;

async function physical(a){
  const id=selected(a)?.id;
  await until(()=>{refresh(a);return war(a).columns.columns.some(c=>c.id===id);},'Tracked army receives its cached physical route',60000);
  const initial=war(a).columns.columns.find(c=>c.id===id);await a.testWorld.prepare(initial.location.x,initial.location.z);
  let vantage;for(let r=35;r<=60&&!vantage;r+=5)for(let n=0;n<32;n++){const angle=n*Math.PI/16,p={x:initial.location.x+Math.sin(angle)*r,z:initial.location.z+Math.cos(angle)*r};if(a.testWorld.readyAt(p.x,p.z)&&canStand(p.x,p.z,a.testWorld,1)){vantage=p;break;}}
  assert(vantage,'There is ordinary clear ground to observe the opening column');await a.visit(vantage);a.war.pause();refresh(a);
  const column=war(a).columns.columns.find(c=>c.id===id),mark=a.war.minimapEvents().find(e=>e.target?.kind==='army'&&e.target.id===id);
  assert(column?.visible&&column.soldiers.length>0,'The selected army has visible physical soldiers');
  assert(near(column.location,war(a).light.location)&&near(column.location,mark),'World light and minimap match the actual column standard');
  a.look({yaw:Math.atan2(vantage.x-column.location.x,vantage.z-column.location.z),pitch:.18,distance:11});await frames();
  return result(a);
}
export const westPhysical=physical;
export const eastPhysical=physical;

async function handoff(a){
  // Remain safely outside the battlefield while the real clock issues arrival.
  await a.visit({x:-2433.5,z:77});advanceTo(a,180);refresh(a);
  const target=selected(a),battle=war(a).campaign.engagements.find(b=>b.region==='caricas'&&b.status==='active');
  assert(battle&&target?.kind==='battle'&&target.id===battle.id,'At 03:00 army tracking hands off to its Caricas battle');
  const marker=a.war.minimapEvents().find(e=>e.target?.kind==='battle'&&e.target.id===battle.id);
  assert(marker&&war(a).light.visible&&near(marker,war(a).light.location),'Arrived battlefield keeps agreeing world and minimap indicators');
  assert(!a.state().frameErrors.length,'Normal '+war(a).campaignSide+' marker journey has no renderer errors');
  await frames();return result(a);
}
export const westBattle=handoff;
export const eastBattle=handoff;
