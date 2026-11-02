import {begin,introduction,skip} from './stillroom-arrival-smoke.js';

const assert=(condition,message)=>{if(!condition)throw Error(message);};
const frames=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
const host=()=>window.__STILLROOM__;
const marker=()=>document.querySelector('.arrival-objective');
const click=id=>{const el=document.getElementById(id);assert(el&&!el.disabled,'Missing '+id);el.click();};
const key=code=>{document.dispatchEvent(new KeyboardEvent('keydown',{code,bubbles:true}));document.dispatchEvent(new KeyboardEvent('keyup',{code,bubbles:true}));};
const visible=()=>!!marker()&&!marker().hidden&&!marker().closest('[hidden]');
function snapshot(){window.dispatchEvent(new Event('blur'));return {visible:visible(),text:marker().textContent,bounds:marker().getBoundingClientRect().toJSON(),progress:host().state().progress};}

export async function handoff(){
  await begin();await frames();assert(!visible(),'No Uguth objective before Taleth introduces the mission');
  await introduction();await frames();assert(!visible(),'No marker over Taleth introduction');
  click('arrival-handoff');window.dispatchEvent(new Event('focus'));
  for(let i=0;i<900;i++)host().step(1/60);
  host().visit({x:0,z:10});host().look({yaw:Math.PI,pitch:.16,distance:13.5});await frames();
  assert(visible(),'Handoff highlights Uguth');
  assert(marker().textContent.includes('Speak with Uguth'),'Distant marker identifies the next conversation');
  const bounds=marker().getBoundingClientRect();assert(bounds.top>0&&bounds.bottom<innerHeight&&bounds.left>0&&bounds.right<innerWidth,'Marker fits above Uguth on screen');
  assert(document.querySelectorAll('.arrival-objective').length===1,'Only one main-quest marker');
  return snapshot();
}

export async function nearby(){
  window.dispatchEvent(new Event('focus'));host().visit({x:-1,z:18});await frames();
  assert(visible()&&marker().textContent.includes('F · Talk to Uguth'),'Interaction key appears within talking range');
  assert(document.querySelector('.arrival-prompt').hidden,'No duplicate bottom prompt while Uguth is marked');
  key('KeyF');await frames();assert(!visible(),'Conversation hides the marker');
  click('arrival-train');await frames();assert(!visible(),'Combat briefing hides the marker');
  click('combat-trial-start');await frames();assert(!visible(),'Active combat hides the marker');
  key('Escape');await frames();assert(!host().state().encounter&&visible(),'Withdrawing restores the unfinished main quest');
  key('Escape');await frames();assert(!visible(),'Pause hides the marker');
  click('arrival-resume');await frames();assert(visible(),'Resume restores the marker');
  host().visit({x:0,z:10});host().look({yaw:0,pitch:.16,distance:4});await frames();
  assert(!visible(),'An objective behind the camera is not projected onto the screen');
  host().visit({x:-1,z:18});host().look({yaw:Math.PI,pitch:.16,distance:10});await frames();
  assert(visible(),'Turning back restores the marker');
  return snapshot();
}

export async function cleared(){
  await skip();await frames();assert(!visible(),'Approval clears the required-training objective');
  host().visit({x:-1,z:18});await frames();
  assert(!document.querySelector('.arrival-prompt').hidden,'Optional practice retains the ordinary interaction prompt');
  return snapshot();
}
