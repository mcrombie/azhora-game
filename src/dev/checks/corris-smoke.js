import {prepareWarExterior} from './tower-smoke.js';
import {TOWER,TALETH_SPOT,LOOKOUT} from '../../app/exploration/tower-state.js';
import * as panorama from './lookout-panorama-smoke.js';
const $=id=>document.getElementById(id),assert=(v,m)=>{if(!v)throw Error(m);};
const tick=(a,n=20)=>{for(let i=0;i<n;i++)a.step(.04);};
const frame=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
const f=()=>{document.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyF',bubbles:true,cancelable:true}));document.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyF',bubbles:true}));};

export async function introduction(a){
  window.dispatchEvent(new Event('focus'));tick(a);
  assert(a.war.state().courier.visible,'Corris is present in the tower before the war');
  await a.visit({x:TALETH_SPOT.x,z:TALETH_SPOT.z+2});tick(a);f();
  assert($('tower-words').textContent.includes('Corris Weatherwise'),'Taleth introduces the raven envoy');
  tick(a);assert(a.war.state().courier.visible,'Corris remains beside Taleth during the introduction');$('tower-close').click();
  await a.visit({x:TOWER.x+5,z:TOWER.z+3});tick(a);a.look({yaw:2.4,pitch:.18,distance:6});f();
  assert(a.war.state().courier.conversation,'Normal F talks to Corris');
  assert(/A raven/.test($('corris-summary').textContent),'Corris introduces himself as a raven');
  assert(!a.tower.state().briefed&&a.war.state().campaign.day===0,'Talking to envoy does not bypass Taleth or begin time');
  await frame();return {checks:['Taleth introduces a visible raven envoy','F opens Corris dialogue','No campaign gate bypass']};
}
export async function arrival(a){
  $('corris-understood').click();await prepareWarExterior(a);a.war.advance(6);a.war.pause();tick(a,140);
  const c=a.war.state().courier;assert(c.delivery&&c.visible&&c.landed,'Messenger lands after the first resolved battle');
  assert(!$('corris-arrival').hidden,'Arrival is visible outside collapsed reports');
  const p=c.destination;await a.visit({x:p.x+2,z:p.z});tick(a);a.look({yaw:0,pitch:.15,distance:6});
  tick(a,450);assert(a.war.state().courier.visible,'Corris waits longer than the old pigeon timeout');
  a.hold('KeyA',true);tick(a,30);a.hold('KeyA',false);
  const at=a.state().position;assert(Math.hypot(at[0]-p.x,at[2]-p.z)>=.54&&at[0]>p.x,'Walking cannot pass through Corris');
  await a.visit({x:p.x+2,z:p.z});tick(a);
  await frame();return {checks:['Battle consequence summons Corris','Persistent arrival prompt','Waits without vanishing'],courier:a.war.state().courier};
}
export async function conversation(a){
  a.war.run();f();assert(a.war.state().courier.conversation,'F addresses arrived envoy');
  const before=JSON.stringify(a.war.state().campaign),clock=a.war.state().clock.fraction;tick(a,200);
  assert(JSON.stringify(a.war.state().campaign)===before&&a.war.state().clock.fraction===clock,'Conversation pauses the campaign');
  assert($('corris-summary').textContent.length<300&&!$('corris-strategy').open,'Short consequence precedes optional strategy');
  $('corris-strategy').open=true;assert($('taleth-letter-words').textContent.includes('Taleth'),'Detailed advice remains available');$('corris-strategy').open=false;
  await frame();return {checks:['Dialogue pauses simulation','Short consequence and live next step','Optional strategic explanation'],summary:$('corris-summary').textContent};
}
export async function persistence(a){
  $('taleth-letter-close').click();a.war.pause();const id=a.war.state().courier.delivery;
  assert(a.save().ok,'Postponed message saves');await a.loadSaved();tick(a,140);
  assert(a.war.state().courier.delivery===id,'Postponed message survives Continue');
  $('world-war-report-more').open=true;$('world-war-report-dismiss').click();tick(a);
  assert(a.war.state().courier.delivery===id&&!$('corris-arrival').hidden,'Dismissing the objective report cannot discard Corris');
  const p=a.war.state().courier.destination;await a.visit({x:p.x+2,z:p.z});tick(a);f();$('corris-understood').click();tick(a);
  assert(a.war.state().courier.delivery===null&&$('corris-arrival').hidden,'Acknowledgment clears pending arrival');
  assert(a.save().ok,'Acknowledgment saves');await a.loadSaved();tick(a);assert(a.war.state().courier.delivery===null,'Read news does not return after Continue');
  a.openMap();$('taleth-letters').click();assert(!$('taleth-letter-dialog').hidden,'Reports can be revisited on the map');
  $('taleth-letter-close').click();assert(a.state().mode==='map','Archive returns to map');a.resume();a.war.pause();
  assert(!a.state().frameErrors.length,'No rendering errors');await frame();return {checks:['Later survives save and reload','Report dismissal preserves messenger','Understood persists','Map archive restores previous mode']};
}
export async function layout(){
  await frame();const card=document.querySelector('#taleth-letter-dialog .tower-dialog-card').getBoundingClientRect(),close=$('taleth-letter-close').getBoundingClientRect();
  assert(card.left>=0&&card.right<=innerWidth&&card.top>=0&&card.bottom<=innerHeight,'Corris dialogue fits the viewport');
  assert(close.bottom<=innerHeight&&close.top>=0,'Conversation can be closed without scrolling');
  return {checks:['Phone dialogue and close action fit'],width:innerWidth,height:innerHeight};
}
export async function river(a){await panorama.settled(a);return panorama.river(a);}
export async function pigeons(a){
  $('tower-close').click();await a.visit({x:LOOKOUT.x-7,z:LOOKOUT.z+2});tick(a);
  a.look({yaw:3.6,pitch:.18,distance:4});await frame();
  assert(a.tower.state().room==='lookout','Pigeons are viewed from the playable lookout');
  assert(a.state().heroVisible,'Ordinary camera restores the player after raven dialogue');
  assert(!a.state().frameErrors.length,'No rendering errors');return {checks:['Life-sized lookout pigeons visible from player camera']};
}
export async function southern(a){await panorama.politics(a);await panorama.east(a);$('tower-next').click();tick(a);assert(a.tower.lookoutState().view==='southern-countries','Southern view remains separately available');assert(a.state().cameraFov===62,'Southern panorama remains broad');await frame();return {checks:['River tighter than separate southern panorama'],fov:a.state().cameraFov};}
