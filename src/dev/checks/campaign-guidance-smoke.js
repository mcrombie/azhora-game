import {prepareWarExterior} from './tower-smoke.js';
import {LIZEEM_RESIDENTS} from '../../content/regions/minora-frontier/lizeem-residents.js';
const assert=(v,m)=>{if(!v)throw Error(m);};
const $=id=>document.getElementById(id),frame=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
const key=code=>{document.dispatchEvent(new KeyboardEvent('keydown',{code,bubbles:true,cancelable:true}));document.dispatchEvent(new KeyboardEvent('keyup',{code,bubbles:true}));};
const tick=(a,n=10)=>{for(let i=0;i<n;i++)a.step(.04);};
let baseline;
function layout(){
  const root=$('world-war-report'),box=root.getBoundingClientRect();
  assert(!root.hidden&&box.top>=0&&box.bottom<=innerHeight,'Objective stays on screen');
  assert(!root.querySelector('details').open,'Report starts collapsed');
  assert($('world-war-objective-detail').textContent.length<200,'Objective is at most two short sentences');
  assert(root.scrollHeight<=root.clientHeight+1,'Collapsed objective needs no scrolling');
  return {width:innerWidth,height:innerHeight,box:box.toJSON(),title:$('world-war-objective-title').textContent,detail:$('world-war-objective-detail').textContent};
}
export async function opening(a){
  await prepareWarExterior(a);window.dispatchEvent(new Event('focus'));a.war.advance();a.war.pause();tick(a);
  assert($('world-war-objective-title').textContent==='Meet Bear at the stable','Horse handoff is the first outdoor objective');
  assert($('world-war-next').hidden,'No competing army action during the horse handoff');
  a.look({yaw:1.4,pitch:.22,distance:8});baseline=a.war.save();await frame();return {checks:['One clear horse handoff with no competing primary action'],layout:layout()};
}
export async function battlefield(a){
  a.war.track(null);a.war.advance(2);a.war.pause();tick(a);const before=JSON.stringify(a.war.state().campaign);
  assert(/battlefield at Caricas/.test($('world-war-objective-title').textContent),'Battlefield becomes the current objective');
  assert(/boundary before day 6/.test($('world-war-objective-detail').textContent),'Current deadline and enter-or-decline choice visible');
  $('world-war-report-more').open=true;await frame();assert($('world-war-report-detail').getBoundingClientRect().height>0,'Full report readable on request');
  $('world-war-report-dismiss').click();tick(a);assert(!$('world-war-report').hidden,'Dismissing a dispatch keeps the objective');
  assert(JSON.stringify(a.war.state().campaign)===before,'Reading and dismissing do not change the war');
  $('world-war-next').click();tick(a);assert(a.war.state().guidance.location&&a.war.state().clock.running,'Primary action tracks actual battle and resumes time');a.war.pause();
  assert(a.save().ok,'Compact objective survives normal saving');await a.loadSaved();tick(a);assert(/battlefield at Caricas/.test($('world-war-objective-title').textContent),'Continue restores current objective');
  await frame();return {checks:['Report expands on request','Dismiss retains live objective','Primary tracks actual battlefield without enlisting','Save/Continue retains objective'],layout:layout()};
}
export async function finale(a){
  a.war.advance(200);a.war.pause();a.war.followNext();tick(a);
  assert($('world-war-objective-title').textContent==='Return to Taleth','Ended war gives one return destination');
  assert(a.war.state().guidance.label==='Taleth / Wizard Guild','Navigation names the same required destination');
  assert(!document.querySelector('.war-council-destinations').open,'Other council visits stay behind optional disclosure');
  const report=$('world-war-report-detail').textContent;assert(report.length>100,'Detailed summons remains available');
  await frame();return {checks:['Finale directs player to Taleth at the lookout','Optional council visits do not compete with main arc','Full summons retained'],layout:layout()};
}
export async function details(a){
  $('world-war-report-more').open=true;await frame();$('taleth-read-letter').scrollIntoView({block:'nearest'});
  assert(!$('taleth-read-letter').hidden,'Full letter is offered in the report');$('taleth-read-letter').click();await frame();
  assert(a.state().mode==='briefing'&&!$('taleth-letter-dialog').hidden,'Full letter opens and pauses play');
  assert($('taleth-letter-words').textContent.length>100,'Letter preserves narrative detail');
  return {checks:['Full letter remains readable and pauses the game'],letter:$('taleth-letter-words').textContent};
}
export async function civilian(a){
  key('Escape');a.war.restore(baseline);a.war.pause();const d=LIZEEM_RESIDENTS.find(p=>p.id==='nera');
  await a.visit({x:d.x+2.5,z:d.z});tick(a,35);a.look({yaw:1.3,pitch:.17,distance:6});key('KeyF');tick(a,35);
  assert(a.residentHost.state().speaking==='nera','Ordinary F opens orchard worker dialogue');
  document.querySelector('#resident-dialog [data-topic="news"]').click();await frame();
  assert(/army is coming toward Caricas/.test($('resident-words').textContent),'Resident gives nearby marching news');
  const person=a.tower.state().residents.people.find(p=>p.id==='nera');assert(Math.abs(person.yaw-Math.PI/2)<.15,'Speaker faces the player');
  assert(!a.state().frameErrors.length,'No frame errors');return {checks:['Local news is available through normal F dialogue','Speaker turns to player'],text:$('resident-words').textContent};
}
export async function resumed(a){
  key('Escape');tick(a,70);const d=LIZEEM_RESIDENTS.find(p=>p.id==='nera'),p=a.tower.state().residents.people.find(p=>p.id==='nera');
  assert(Math.abs(p.yaw-d.yaw)<.1&&p.phase==='working','Worker resumes original heading and routine');
  assert(a.tower.state().residents.constructed<=12,'Resident cache remains bounded');await frame();
  return {checks:['Goodbye restores work posture without spawning more people','Twelve-rig budget retained'],residents:a.tower.state().residents};
}
