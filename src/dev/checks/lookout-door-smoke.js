import {LOOKOUT} from '../../app/exploration/tower-state.js';
const assert=(v,m)=>{if(!v)throw Error(m);};
export async function entrance(a){
  document.getElementById('tower-close').click();window.dispatchEvent(new Event('focus'));
  await a.visit({x:LOOKOUT.x,y:LOOKOUT.y,z:LOOKOUT.z+4.2});a.look({yaw:Math.PI,pitch:.25,distance:7});a.step(.02);
  const root=a.testHero.group.parent;
  assert(root.getObjectByName('Oak double door to the guild stair'),'Actual oak door geometry present');
  assert(!document.getElementById('tower-interact').hidden,'Return interaction is visible at the entrance');
  assert(!a.state().frameErrors.length,'No rendering errors');
  assert(a.state().mode==='playing'&&!a.state().panoramic,'Normal third-person doorway view');
  window.dispatchEvent(new Event('blur'));a.renderStats();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  return {checks:['Arched door built','Readable return interaction','No rendering errors']};
}
export async function descent(a){
  window.dispatchEvent(new Event('focus'));assert(a.tower.interact(),'Door accepts interaction');
  const end=performance.now()+120000;
  while(a.state().mode==='loading'&&performance.now()<end)await new Promise(r=>setTimeout(r,30));
  assert(a.tower.state().room==='tower'&&a.state().mode==='playing','Door returns to Taleth chamber');
  assert(!a.state().frameErrors.length,'No frame errors after descent');return {checks:['Return to Taleth chamber works']};
}
