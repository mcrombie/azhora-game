import {prepare} from './adventure-war-smoke.js';
import {finish} from './champion-duel-smoke.js';
import {createAdventureWar} from '../../experiments/day-night/opening-war.js';
const $=id=>document.getElementById(id),assert=(ok,message)=>{if(!ok)throw Error(message);};
const focus=()=>window.dispatchEvent(new Event('focus'));
const frames=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
const capture=async()=>{window.dispatchEvent(new Event('blur'));await frames();};
const state=a=>a.war.state(),snapshot=a=>state(a).campaign;
const click=id=>{assert($(id)&&!$(id).hidden&&!$(id).disabled,'Available '+id);$(id).click();};
const trackedRegion=a=>snapshot(a).engagements.find(b=>b.id===state(a).tracking?.target?.id)?.region;
let records;
export async function opening(a){
  await prepare(a,900000);focus();a.reveal(true);
  a.war.restore({...createAdventureWar().checkpoint(),campaignSide:'west',navigation:null,navigationMode:'taleth'});
  a.war.run();a.step(0);
  assert(snapshot(a).engagements.length===1,'Only Caricas is fighting at 00:00');
  assert(state(a).opportunity.region==='caricas'&&trackedRegion(a)==='caricas','Quest and tracking start at Caricas');
  assert(!$('opening-fronts'),'No competing two-front quest cards');
  assert($('world-war-objective-stage').textContent.includes('TALETH'),'Quest attributed to Taleth');
  assert($('corris-arrival').hidden,'No required report summons');
  await capture();return {quest:$('world-war-objective-title').textContent,tracking:state(a).tracking,clock:a.war.clock().elapsedSeconds};
}
export async function secondFront(a){
  focus();const war=createAdventureWar();war.begin();for(let i=0;i<119;i++)war.tick(1,true);
  a.war.restore({...war.checkpoint(),campaignSide:'west',navigation:null,navigationMode:'taleth'});a.war.run();
  assert(snapshot(a).engagements.length===1,'Ovesos not fighting at 01:59');a.war.tick(1,true);
  const b=snapshot(a).engagements.find(b=>b.region==='ovesos');assert(b?.startedAt===120&&b.endsAt===300,'Ovesos begins exactly at 02:00, ends 05:00');
  assert(state(a).opportunity.region==='caricas','Earlier Caricas battle remains recommended');
  assert(a.war.minimapEvents().filter(e=>e.kind==='battle').length===2,'Both real battles appear on minimap');
  a.step(0);await capture();return {battles:snapshot(a).engagements.map(b=>({region:b.region,startedAt:b.startedAt,endsAt:b.endsAt})),quest:$('world-war-objective-title').textContent};
}
export async function manualTracking(a){
  focus();a.openMap();const buttons=[...$('world-war-battles').querySelectorAll('button')],ovesos=buttons.find(b=>b.textContent.includes('Ovesos'));
  assert(ovesos,'Map offers Ovesos override');ovesos.click();a.resume();a.war.refresh();
  assert(state(a).navigationMode==='manual'&&trackedRegion(a)==='ovesos','Manual selection survives guidance refresh');
  assert(state(a).opportunity.region==='caricas','Taleth advice stays independent');
  assert(a.save().ok,'Manual override saves');await a.loadSaved();a.resume();focus();a.step(0);
  assert(state(a).navigationMode==='manual'&&trackedRegion(a)==='ovesos','Override survives full reload');
  click('world-war-next');assert(state(a).navigationMode==='taleth'&&trackedRegion(a)==='caricas','One click returns to Taleth');
  a.war.track(null);a.war.refresh();assert(!state(a).tracking&&state(a).navigationMode==='manual','Explicit stop is respected');click('world-war-next');
  await capture();return {checks:['Map override','Saved manual selection','Return to Taleth','Explicit stop'],mode:state(a).navigationMode};
}
export async function battle(a){
  focus();const b=snapshot(a).engagements.find(b=>b.region==='caricas');await a.visit(b.location);a.step(0);
  if(a.state().mode!=='encounter')assert(a.war.join(b.id).ok,'Enter Caricas');await a.war.help('west');
  const result=await finish(a);for(let i=0;i<90;i++)a.step(1/60);click('world-skirmish-continue');a.step(.04);
  assert(a.state().mode==='playing','Battle closes without Taleth conversation');
  assert(state(a).opportunity.region==='ovesos'&&trackedRegion(a)==='ovesos','Next recommendation and marker update automatically');
  assert($('corris-arrival').hidden,'No post-battle summons');
  const time=a.war.clock().elapsedSeconds;for(let i=0;i<30;i++)a.step(.04);assert(a.war.clock().elapsedSeconds>time+1,'Campaign resumes while idle');
  await capture();return {outcome:result.outcome,seconds:result.time,health:result.hero.hp,next:state(a).opportunity.region};
}
export async function journal(a){
  focus();click('war-log-open');const before=a.war.clock().elapsedSeconds;
  for(let i=0;i<30;i++)a.step(.04);assert(a.war.clock().elapsedSeconds===before,'Reading journal holds time');
  assert($('war-log-entries').textContent.includes('Your fighting at Caricas'),'Journal shows actual intervention');
  assert($('war-log-entries').textContent.includes('captured Caricas'),'Journal shows changed ownership');
  records=[...$('war-log-entries').children].map(e=>e.textContent);
  $('war-log-personal').checked=true;$('war-log-personal').dispatchEvent(new Event('change'));
  assert([...$('war-log-entries').children].every(e=>e.textContent.includes('Your impact')),'Personal impact filter');
  await capture();return {records,personal:$('war-log-entries').textContent};
}
export async function reload(a){
  focus();document.dispatchEvent(new KeyboardEvent('keydown',{code:'Escape',bubbles:true,cancelable:true}));assert($('campaign-war-log').hidden,'Escape closes journal');
  assert(a.state().mode==='playing','Returns to exploration');assert(a.save().ok,'Campaign and log save');await a.loadSaved();a.resume();focus();
  a.openMap();click('war-log-map-open');$('war-log-personal').checked=false;$('war-log-personal').dispatchEvent(new Event('change'));
  assert(JSON.stringify([...$('war-log-entries').children].map(e=>e.textContent))===JSON.stringify(records),'Full event log survives save/load');
  click('war-log-close');assert(a.state().mode==='map','Journal returns to map');a.resume();await capture();return {checks:['Escape and prior view restored','Map access','All journal entries restored'],frameErrors:a.state().frameErrors};
}
export async function ignoredFront(a){
  focus();a.war.run();for(let i=0;i<185;i++)a.war.tick(1,true);a.step(0);click('war-log-open');
  assert($('war-log-entries').textContent.includes('You left this field to the armies'),'Ignored battle recorded honestly');
  assert(!a.state().frameErrors.length,'No frame errors');await capture();return {log:$('war-log-entries').textContent,frameErrors:a.state().frameErrors};
}
export async function earlyWin(a){
  focus();if(!$('campaign-war-log').hidden)click('war-log-close');await a.visit({x:-2444,z:73});a.war.restore({...createAdventureWar().checkpoint(),campaignSide:'east',navigation:null,navigationMode:'taleth'});a.war.run();
  const b=snapshot(a).engagements.find(b=>b.region==='caricas');await a.visit(b.location);a.step(0);
  if(a.state().mode!=='encounter'){const result=a.war.join(b.id);assert(result.ok,'Enter early Caricas / '+JSON.stringify({result,mode:a.state().mode,hero:snapshot(a).hero,entry:state(a).battlefield.entry,position:a.snapshot().position}));}await a.war.help('east');
  await finish(a);for(let i=0;i<90;i++)a.step(1/60);click('world-skirmish-continue');a.step(.04);
  assert(a.war.clock().elapsedSeconds<120,'Win before second battle begins');
  assert(!snapshot(a).engagements.some(b=>b.region==='ovesos'),'No premature second battle');
  assert(state(a).opportunity.region==='ovesos'&&state(a).opportunity.kind==='army','Early victory prepares for Ovesos');
  assert(state(a).guidance?.location,'Next task provides a usable destination');
  assert(!a.state().frameErrors.length,'No frame errors');await capture();return {next:state(a).opportunity,guidance:state(a).guidance,clock:a.war.clock().elapsedSeconds,frameErrors:a.state().frameErrors};
}
