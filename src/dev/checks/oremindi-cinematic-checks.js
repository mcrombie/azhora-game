import {CHAPTER_LOCATIONS} from '../../content/chapters/yunethre/locations.js';
import {MINORA_FALL_LAYOUT as L} from '../../content/chapters/oremindi/minora-fall-layout.js';

const check=(ok,message)=>{if(!ok)throw Error(message);};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let before=null,completion=null;
const points={column:8,gate:19,standards:33,messenger:56};
function unchanged(api){check(JSON.stringify(api.chapter.state())===before,'The presentation changed Chapter 3 progress');}
function sceneFacts(api){
  const outside=api.testWorld.exteriorRoot,scene=outside.parent,names=[],standards=[];
  let tableau=null;scene.traverse(o=>{if(o.name?.startsWith('Chapter 3 / Minora'))tableau=o;if(o.name==='Minora Council standards'||o.name==='Minora legacy gate flags')names.push({name:o.name,visible:o.visible});});
  check(tableau,'The Minora fall scene is absent');tableau.traverse(o=>{if(o.isGroup&&o.name==='Blood Prince / broken-crown standard')standards.push({visible:o.visible,point:o.position.toArray(),screen:api.project(o.position)});});
  const army=tableau.getObjectByName('Wilhelm assault / articulated ranks'),heads=tableau.getObjectByName('Muster road / occupation stakes'),bird=tableau.getObjectByName('Wizard Guild / speaking messenger');
  check(outside.visible,'The banner transition hid the entire city');
  check(army?.visible&&army.children.some(o=>o.isInstancedMesh&&o.count===56),'The actual army is absent');
  return {outsideVisible:outside.visible,armyParts:army.children.length,standards,oldStandards:names,
    headsVisible:heads?.visible,bird:bird?{visible:bird.visible,position:bird.position.toArray(),screen:api.project(bird.position)}:null};
}

export async function review(api,stage){
  window.dispatchEvent(new Event('focus'));
  if(stage==='column'){
    check(api.state().launch==='oremindi','Cinematic review needs Chapter 3 rehearsal mode');
    await api.chapterTransition(null,CHAPTER_LOCATIONS.departure);api.resume();
    check(api.minoraFall.reset(),'Could not reset the occupation tableau');
    // Do not await start: it resolves after the final shot, not on construction.
    completion=api.minoraFall.start();before=JSON.stringify(api.chapter.state());
  }
  if(stage==='complete'){
    check(api.minoraFall.active(),'The messenger shot ended before its completion check');
    api.minoraFall.keydown({code:'Escape',repeat:false,preventDefault(){}});window.dispatchEvent(new Event('blur'));
    check(await completion,'Presentation completion did not resolve');api.step(0,0);
    check(!api.minoraFall.active()&&api.minoraFall.state().completed,'The completed film still holds the camera');unchanged(api);
    check(document.querySelector('[aria-label="The fall of Minora"]').hidden,'The completed film left its caption open');await sleep(100);
    check(api.state().frameErrors.length===0,'Frame errors: '+api.state().frameErrors.join('; '));
    return {stage,presentation:api.minoraFall.state(),facts:sceneFacts(api),chapterUnchanged:true,render:api.renderStats()};
  }
  const target=points[stage];check(Number.isFinite(target),'Unknown cinematic review stage '+stage);
  for(let i=0;i<60&&api.minoraFall.state().elapsed<target;i++)api.step(0,Math.min(1,target-api.minoraFall.state().elapsed));
  const state=api.minoraFall.state();check(state.ready&&Math.abs(state.elapsed-target)<.01,'Cinematic did not reach '+stage);
  window.dispatchEvent(new Event('blur'));api.step(0,0);await sleep(100);
  check(state.actors===56&&state.standards===12,'The invasion presentation has the wrong cast or gate standards');unchanged(api);
  const camera=api.minoraFall.camera();check(camera?.id===stage,'Wrong cinematic camera '+camera?.id);
  const facts=sceneFacts(api);check(api.state().frameErrors.length===0,'Frame errors: '+api.state().frameErrors.join('; '));
  if(stage==='standards'){check(facts.headsVisible&&state.heads===4,'Occupation stakes are absent');check(facts.oldStandards.every(o=>!o.visible),'Council flags remain over the occupied city');check(facts.standards.some(s=>s.visible&&Math.abs(s.screen.x)<1&&Math.abs(s.screen.y)<1&&s.screen.z<1),'No new gate standard appears in the standards shot');}
  if(stage==='messenger'){check(state.messenger==='perched'&&facts.bird?.visible,'The speaking bird did not arrive');const p=facts.bird.screen;check(Math.abs(p.x)<1&&Math.abs(p.y)<1&&p.z<1,'The messenger camera misses its bird');}
  return {stage,presentation:state,camera,facts,ground:L.march.map(p=>api.groundProbe(p.x,p.z)),render:api.renderStats()};
}
