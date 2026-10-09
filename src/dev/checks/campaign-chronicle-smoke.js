import {createWorldWar} from '../../app/exploration/world-war.js';
import {TALETH_SPOT} from '../../app/exploration/tower-state.js';
const checks=[],assert=(v,m)=>{if(!v)throw Error(m);checks.push(m);console.log('EXPLORATION_CHECK '+m);};
const frame=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
const key=code=>document.dispatchEvent(new KeyboardEvent('keydown',{code,bubbles:true,cancelable:true}));
const click=id=>document.getElementById(id).click();
const record=a=>JSON.stringify({campaign:a.war.state().campaign,clock:a.war.state().clock,save:a.store.read().data});
let before;
async function open(a){
  key('KeyF');assert(!document.getElementById('tower-review-campaign').hidden,'Taleth offers the current campaign separately from prewar background');
  before=record(a);click('tower-review-campaign');const end=performance.now()+10000;
  while(!a.tower.chronicleState().ready&&performance.now()<end)await frame();
  assert(a.tower.chronicleState().ready&&a.tower.chronicleState().kind==='campaign','Recorded campaign loads in the existing Chronoscope');click('chronicle-play');
}
const seek=fn=>{const buttons=[...document.querySelectorAll('#chronicle-timeline button')],b=buttons.find(fn);assert(b,'Recorded event is on the timeline');b.click();};
export async function ongoing(a){
  window.dispatchEvent(new Event('focus'));await a.visit({x:TALETH_SPOT.x,z:TALETH_SPOT.z+2});key('KeyF');click('tower-next');a.war.pause();
  const w=createWorldWar();w.advance(3);w.syncRegion('Caricas');const b=w.snapshot().engagements.find(b=>b.region==='caricas');
  assert(w.campaign.joinBattle(b.id,b.location).ok,'Fixture enters actual interception');
  assert(w.campaign.resolveEncounter(b.id,'west','success','vanguard-broken',3).ok,'Fixture records actual interception');
  a.war.restore(w.checkpoint());a.war.pause();assert(a.save().ok,'In-progress campaign saves');await open(a);
  seek(b=>b.title.startsWith('Day 3:'));assert(document.getElementById('chronicle-caption').textContent.includes('12 reinforcement strength removed'),'Projection describes Teresod’s actual contribution');
  assert(document.querySelector('#chronicle-map .chronicle-battle'),'Active battlefield appears on the map');
  seek(b=>b.title.startsWith('Day 1:'));assert(document.querySelector('#chronicle-map .chronicle-army-route'),'Recorded army route appears on the map');
  seek(b=>b.title.startsWith('Day 3:'));click('chronicle-speed');click('chronicle-play');for(let i=0;i<400;i++)a.step(.04);
  assert(a.tower.chronicleState().completed,'Review can play quickly through to the current day');
  assert(record(a)===before,'Playback and speed controls preserve campaign, clock and saved checkpoint');
  assert(!a.testWorld.state().exteriorLoaded,'Campaign review loads no exterior regions');
  click('chronicle-start');assert(a.state().mode==='briefing','Return action leads back to Taleth rather than starting or rewinding');
  assert(record(a)===before,'Returning leaves the campaign intact');click('tower-close');return {checks:[...checks]};
}
async function peace(a,side){
  const w=createWorldWar();w.campaign.reinforce(side==='west'?'nethereum':'caricas',500);w.advance(200);assert(w.snapshot().winner===side,'Fixture has an actual '+side+' victory');
  a.war.restore(w.checkpoint());a.war.pause();assert(a.save().ok,'Completed campaign saves');await open(a);
  document.querySelector('#chronicle-timeline button:last-child').click();
  assert(document.getElementById('chronicle-caption').textContent.includes('Lizeemi League'),'Conclusion records the united country');
  assert([...document.querySelectorAll('#chronicle-map .chronicle-region')].every(p=>p.dataset.owner===side),'All five postwar regions share the winning color');
  assert([...document.querySelectorAll('#chronicle-map .chronicle-owner-name')].every(p=>p.textContent==='Lizeemi League'),'Postwar chart uses the unified name');
  assert(record(a)===before,'Completed campaign replay cannot change the winner or save');await new Promise(r=>setTimeout(r,1500));await frame();
  const expected=side==='west'?'rgb(120, 158, 145)':'rgb(191, 121, 105)';
  assert([...document.querySelectorAll('#chronicle-map .chronicle-region')].every(p=>getComputedStyle(p).fill===expected),'Rendered postwar colors finish transitioning to the winning color');return {checks:[...checks]};
}
export async function west(a){return peace(a,'west');}
export async function east(a){click('chronicle-start');click('tower-close');return peace(a,'east');}
export async function finished(a){
  click('chronicle-start');click('tower-background');const end=performance.now()+10000;while(!a.tower.chronicleState().ready&&performance.now()<end)await frame();
  assert(a.tower.chronicleState().kind==='prelude','The original preceding-thirty-days history remains available');
  assert(record(a)===before,'Prewar history also leaves the ended campaign unchanged');
  click('chronicle-close');click('tower-close');assert(!a.state().frameErrors.length,'Both histories and both winners have no renderer errors');return {checks:[...checks]};
}
