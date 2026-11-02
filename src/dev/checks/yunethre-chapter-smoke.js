import {CHAPTER_LOCATIONS as places} from '../../content/chapters/yunethre/locations.js';
import {LOOKOUT_TALETH,TOWER_DOOR,TOWER} from '../../app/exploration/tower-state.js';
const check=(ok,message)=>{if(!ok)throw Error(message);};
const click=text=>{const b=[...document.querySelectorAll('#yunethre-dialog button')].find(b=>!b.hidden&&b.textContent.startsWith(text));check(b,'Missing dialogue action: '+text);b.click();};
async function until(fn){const end=performance.now()+300000;while(!fn()){if(performance.now()>end)throw Error('Chapter transition timed out');await new Promise(r=>setTimeout(r,100));}}
const nextFrame=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
async function meet(api,id){const p=places[id];await api.visit({x:p.x,z:p.z+2});check(api.chapter.meeting(id),'Could not meet '+id);await nextFrame();}
export async function tower(api){
  check(api.state().launch==='yunethre','Wrong launch');check(api.chapter.state().elapsed===0,'Tower advanced chapter time');check(!api.testWorld.state().exteriorLoaded,'Exterior loaded before departure');
  check(api.testWorld.state().room==='lookout','Chapter 2 must start on the lookout');
  check(Math.hypot(api.state().position[0]-LOOKOUT_TALETH.x,api.state().position[2]-LOOKOUT_TALETH.z)<4,'Start is not beside Taleth');
  check(api.minimap.state().visible,'Chapter 2 minimap missing');check(!document.getElementById('tower-main-quest').hidden,'Shared main quest panel missing');
  check(api.stable.owned,'Chapter 2 horse missing');
  check(api.chapter.interact(),'Taleth unavailable');click('Accept the diplomatic');
  api.step(.04,1);check(api.chapter.state().elapsed===0,'Tower did not hold time');
  return {state:api.chapter.state(),loaded:api.testWorld.loading.state().jobs.length};
}
export async function laketown(api){
  await api.chapterTransition('tower');
  await api.visit({...TOWER_DOOR,y:TOWER.y});check(api.chapter.interact(),'Door unavailable');await until(()=>api.chapter.state().departed&&api.state().mode==='playing');
  check(api.state().enabledRegions.join(',')==='16,17,25,13,14,38,61,62','Wrong region scope');
  check(api.state().region===16,'Tower departure skipped Minora');
  await meet(api,'town');const before=api.chapter.state().elapsed;api.step(.04,1);check(api.chapter.state().elapsed===before,'Dialogue advanced time');
  return {position:api.state().position,elapsed:before,jobs:api.testWorld.loading.state().jobs.filter(j=>j.status==='ready').map(j=>j.id)};
}
export async function centaurs(api){click('Return to the road');await meet(api,'centaurs');click('Agree to carry');return {consent:api.chapter.state().compact};}
export async function canerd(api){click('Travel to Canerd');await until(()=>api.state().mode==='playing');await meet(api,'celder');return {position:api.state().position,elapsed:api.chapter.state().elapsed};}
export async function peace(api){click('Secure Celder');check(api.chapter.state().battle.status==='averted','Peace did not avert battle');const before=api.chapter.state().elapsed;api.step(.04,5);check(api.chapter.state().elapsed===before,'Peace deadline still runs');return {battle:api.chapter.state().battle};}
export async function accession(api){click('Return to Yunethre');await until(()=>api.state().mode==='playing');await meet(api,'town');click('Welcome Laketown');check(api.chapter.state().laketown==='league','Accession failed');return {state:api.chapter.state()};}
export async function handoff(api){click('Return to the road');await api.visit({...places.departure});check(api.chapter.interact(),'Return road unavailable');click('Begin the return');check(api.chapter.state().returned,'Bird did not deliver handoff');check(api.save().ok,'Chapter save failed');click('View the changed');return {chapter:api.chapter.state(),saved:api.store.read().ok,errors:api.state().frameErrors};}
export async function restored(api){check(api.chapter.state().returned,'Completed chapter failed to reload');check(api.chapter.state().laketown==='league','Alliance lost on reload');check(api.state().frameErrors.length===0,'Frame errors');return {returned:true,laketown:api.chapter.state().laketown,regions:api.state().enabledRegions};}
