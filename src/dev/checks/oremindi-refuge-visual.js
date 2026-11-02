import {OREMINDI_LOCATIONS as P} from '../../content/chapters/oremindi/locations.js';
import {TOWER,TALETH_SPOT,LOOKOUT,LOOKOUT_DOOR,TOWER_DOOR} from '../../app/exploration/tower-state.js';

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const check=(ok,message)=>{if(!ok)throw Error(message);};
async function until(fn,label){const end=performance.now()+300000;while(!fn()){if(window.__EXPLORATION_ERROR__)throw Error(window.__EXPLORATION_ERROR__);if(performance.now()>end)throw Error('Refuge review timed out: '+label);await sleep(50);}}
function action(id){const button=document.querySelector(`#yunethre-dialog [data-chapter-action="${id}"]`);check(button,'Missing dialogue action '+id);button.click();}
function restore(api){api.testHero.group.scale.setScalar(1);api.resume();window.dispatchEvent(new Event('focus'));}
async function frame(api,point,view,{hideHero=false}={}){
  restore(api);await api.visit(point);api.step(0,0);api.pause();
  // A paused, isolated review holds the elevated survey camera without changing
  // gameplay camera rules or saving an impossible airborne hero checkpoint.
  document.getElementById('exploration-pause').hidden=true;
  if(hideHero)api.testHero.group.scale.setScalar(0);
  api.look(view);api.renderStats();await sleep(100);
  check(api.state().frameErrors.length===0,'Refuge review produced a frame error');
  const state=api.state();return {position:state.position,camera:state.camera,cameraPosition:state.cameraPosition,room:api.testWorld.state().room,render:api.renderStats()};
}
async function enterLookout(api){
  restore(api);await api.visit(P.refuge);check(api.chapter.interact(),'No refuge entrance');
  await until(()=>api.testWorld.state().room==='tower'&&api.state().mode==='playing','tower interior');
  await api.visit({...TALETH_SPOT,y:TOWER.y});check(api.chapter.interact(),'Taleth unavailable');
  if(!api.chapter.state().briefed){action('accept');check(api.chapter.interact(),'Taleth unavailable after briefing');}
  action('lookout');await until(()=>api.testWorld.state().room==='lookout'&&api.state().mode==='playing','mountain lookout');
}
async function leaveLookout(api){
  restore(api);await api.visit(LOOKOUT_DOOR);check(api.chapter.interact(),'Lookout return door unavailable');
  await until(()=>api.testWorld.state().room==='tower'&&api.state().mode==='playing','tower return');
  await api.visit({...TOWER_DOOR,y:TOWER.y});check(api.chapter.interact(),'Exterior door unavailable');
  await until(()=>!api.testWorld.state().room&&api.state().mode==='playing','exterior return');
}

export async function review(api,stage){
  if(stage==='tower-lake'){
    restore(api);await api.visit(P.refuge);api.step(0,0);await until(()=>api.chapter.scenery().tower,'tower mesh');
    const y=api.testWorld.heightAt(P.tower.x,P.tower.z);
    const shot=await frame(api,{x:P.tower.x+20,z:P.tower.z+42,y:y+65},{yaw:.7,pitch:.2,distance:185},{hideHero:true});
    const bottom=api.project({...P.tower,y}),top=api.project({...P.tower,y:y+129});
    check(Math.abs(bottom.x)<.92&&Math.abs(bottom.y)<.92&&Math.abs(top.x)<.92&&Math.abs(top.y)<.92,'Survey camera clips the refuge tower');
    return {stage,...shot,towerProjection:{bottom,top},tower:api.chapter.scenery()};
  }
  if(stage==='lookout-mountains'){
    await enterLookout(api);
    const shot=await frame(api,{x:LOOKOUT.x+3,z:LOOKOUT.z-8,y:LOOKOUT.y+4.5},{yaw:0,pitch:.24,distance:2},{hideHero:true});
    const offset=api.testWorld.exteriorRoot.position;
    check(Math.abs(offset.x-(TOWER.x-P.tower.x))<.01&&Math.abs(offset.z-(TOWER.z-P.tower.z))<.01,'Lookout exterior is not relocated');
    return {stage,...shot,exteriorOffset:offset.toArray()};
  }
  if(stage==='lookout-lake'){
    return {stage,...await frame(api,{x:LOOKOUT.x+8,z:LOOKOUT.z-4,y:LOOKOUT.y+4.5},{yaw:-Math.PI/2,pitch:.52,distance:2},{hideHero:true})};
  }
  if(stage==='alpine-wildlife'){
    await leaveLookout(api);api.step(.04,.04);await until(()=>api.testWorld.mountainLife()?.loaded,'alpine life');
    const candidates=api.testWorld.mountainLife().animals.creatures.filter(a=>a.species==='oremindi-snowgoat'&&!a.hidden);
    candidates.sort((a,b)=>Math.hypot(a.x-P.tower.x,a.z-P.tower.z)-Math.hypot(b.x-P.tower.x,b.z-P.tower.z));
    check(candidates.length,'No resident mountain goats');const goat=candidates[0];
    const shot=await frame(api,{x:goat.x+2.5,z:goat.z+3,y:goat.groundY+1},{yaw:.6,pitch:.3,distance:12},{hideHero:true});
    return {stage,...shot,goat,life:api.testWorld.mountainLife().visuals};
  }
  if(stage==='traverse'){
    const x=-3560,z=-378,y=api.testWorld.heightAt(x,z);
    return {stage,...await frame(api,{x,z,y:y+15},{yaw:1.1,pitch:.32,distance:65},{hideHero:true}),terrain:api.groundProbe(x,z)};
  }
  throw Error('Unknown refuge visual review stage '+stage);
}
