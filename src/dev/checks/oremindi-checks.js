import {OREMINDI_LOCATIONS as P} from '../../content/chapters/oremindi/locations.js';
import {TALETH_SPOT,TOWER,TOWER_DOOR,LOOKOUT_DOOR} from '../../app/exploration/tower-state.js';
import {oremindiPolitics} from '../../content/chapters/oremindi/chapter.js';
import {controls,returnFromControls} from './oremindi-combat-parity.js';
const check=(ok,message)=>{if(!ok)throw Error(message);};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let historyJSON=null,observedEvents=new Set();
async function until(fn,label,timeout=600000){const end=performance.now()+timeout;while(!fn()){if(window.__EXPLORATION_ERROR__)throw Error(window.__EXPLORATION_ERROR__);if(performance.now()>end)throw Error('Chapter 3 timed out: '+label);await sleep(50);}}
function press(code,options={}){for(const type of ['keydown','keyup'])document.dispatchEvent(new KeyboardEvent(type,{code,bubbles:true,cancelable:true,...options}));}
function clickAction(id){const button=document.querySelector(`#yunethre-dialog [data-chapter-action="${id}"]`);check(button&&!document.getElementById('yunethre-dialog').hidden,'Missing Chapter 3 dialogue action '+id);button.click();}
function clickCombat(prefix){const button=[...document.querySelectorAll('#oremindi-encounter button')].find(b=>b.textContent.startsWith(prefix));check(button,'Missing combat action '+prefix);button.click();}
function errors(api){check(api.state().frameErrors.length===0,'Frame errors: '+api.state().frameErrors.join('; '));}
function historyIntact(api){check(JSON.stringify(api.store.read().data.history)===historyJSON,'Chapter 1/2 history changed');}
async function meet(api,id){await api.visit(P[id]);api.resume();api.step(0,0);check(api.chapter.interact(),'No interaction at '+id);await sleep(30);}
async function returnFromCombat(api){clickCombat('Continue to exploration');await until(()=>!api.oremindiCombat.controller()&&api.state().mode==='playing','encounter return');}
async function runFight(api,kind){
  const controller=api.oremindiCombat.controller();check(controller?.kind===kind,'Wrong active encounter');
  // Keep rendering, but hold the ordinary RAF's simulation while the harness
  // advances explicit 60 Hz steps. Coarse double-ticking changes dodge timing.
  window.dispatchEvent(new Event('blur'));
  try{
    check(controller.start(),'Battle Start was rejected');const before=api.chapter.state().elapsed;
    for(let i=0;i<16000&&!controller.snapshot().outcome;i++){
      controller.tick(1/60,true);for(const event of controller.snapshot().events??[])observedEvents.add(event.type);
      if(i%60===0)await sleep(5);
    }
    const state=controller.snapshot();window.__OREMINDI_FIGHT_DEBUG__={kind,state};check(state.outcome,'Computer battle did not reach an outcome');
    check(state.outcome.result==='victory',kind+' computer failed: '+JSON.stringify(state.outcome));
    check(api.chapter.state().elapsed===before,'Chapter time advanced during combat');check(!api.save().ok,'Mid-encounter save was accepted');
    controller.tick(2,true);api.step(0,0);errors(api);await sleep(100);
    return {outcome:state.outcome,heroHp:state.hero.hp,events:[...observedEvents],render:api.renderStats()};
  }finally{window.dispatchEvent(new Event('focus'));}
}

export async function review(api,stage){
  if(stage==='combat-controls')return {stage,...await controls(api)};
  if(stage==='combat-return')return {stage,...await returnFromControls(api)};
  window.dispatchEvent(new Event('focus'));
  if(stage==='opening'){
    check(api.state().launch==='oremindi','Wrong launch mode');check(!api.chapter.state().arrived&&!api.chapter.state().briefed,'Fresh start skipped the refuge journey');
    check(api.state().enabledRegions.join(',')==='16,17,25,13,14,38,61,62,37,33','Incorrect Chapter 3 region scope');
    check(api.minimap.state().visible,'Chapter 3 minimap missing');check(!document.getElementById('tower-main-quest').hidden,'Chapter 3 main quest panel missing');
    check(api.stable.owned,'Owned horse missing');check(api.save().ok,'Initial Chapter 3 save failed');const saved=api.store.read().data;historyJSON=JSON.stringify(saved.history);
    check(saved.history.chapter.returned,'Chapter 2 history was not completed');check(saved.historySource==='unattended','Direct-start background is not labelled');
    check(oremindiPolitics(api.chapter.state(),saved.history.chapter).originalLeagueOwner==='blood-prince','Minora occupation missing');
    return {stage,chapter:api.chapter.state(),regions:api.state().enabledRegions,position:api.state().position};
  }
  if(stage==='refuge'){
    await meet(api,'refuge');await until(()=>api.testWorld.state().room==='tower'&&api.state().mode==='playing','refuge entry');
    check(api.chapter.state().arrived,'Entering the relocated tower did not record arrival');await api.visit({...TALETH_SPOT,y:TOWER.y});
    check(api.chapter.interact(),'Taleth cannot be approached');clickAction('accept');const before=api.chapter.state().elapsed;api.step(.04,10);
    check(api.chapter.state().elapsed===before,'Tower did not hold Chapter 3 time');errors(api);await sleep(100);
    return {stage,chapter:api.chapter.state(),position:api.state().position};
  }
  if(stage==='refuge-exterior'){
    await api.visit({x:P.refuge.x+15,z:P.refuge.z+45});api.resume();api.look({yaw:.1,pitch:.66,distance:120});api.step(.04,0);
    check(api.chapter.scenery().tower,'Relocated tower exterior was not built');check(api.groundProbe(P.refuge.x,P.refuge.z).clear,'Refuge entry is blocked');
    await sleep(100);return {stage,scenery:api.chapter.scenery(),position:api.state().position,render:api.renderStats()};
  }
  if(stage==='lookout'){
    check(api.chapter.interact(),'Taleth cannot open mountain lookout');clickAction('lookout');
    await until(()=>api.testWorld.state().room==='lookout'&&api.state().mode==='playing','mountain lookout');
    const outside=api.testWorld.exteriorRoot,expected={x:TOWER.x-P.tower.x,z:TOWER.z-P.tower.z};
    check(outside.visible&&Math.abs(outside.position.x-expected.x)<.01&&Math.abs(outside.position.z-expected.z)<.01,'Lookout shows exterior at old Minora position');
    check(api.chapter.worldPosition().x===P.refuge.x&&api.chapter.worldPosition().z===P.refuge.z,'Lookout map position still points to Minora');
    const before=api.chapter.state().elapsed;api.step(.04,10);check(api.chapter.state().elapsed===before,'Lookout advances chapter time');
    check(api.save().ok,'Mountain lookout cannot save');historyIntact(api);api.look({yaw:Math.PI/2,pitch:.15,distance:10});await sleep(100);
    return {stage,exteriorOffset:outside.position.toArray(),worldPosition:api.chapter.worldPosition(),room:api.testWorld.state().room,render:api.renderStats()};
  }
  if(stage==='rangers'){
    if(api.testWorld.state().room==='lookout'){
      await api.visit(LOOKOUT_DOOR);check(api.chapter.interact(),'Lookout chamber door unavailable');await until(()=>api.testWorld.state().room==='tower'&&api.state().mode==='playing','lookout chamber return');
    }
    await api.visit({...TOWER_DOOR,y:TOWER.y});check(api.chapter.interact(),'Relocated tower door unavailable');await until(()=>!api.testWorld.state().room&&api.state().mode==='playing','tower exit');
    await meet(api,'rangers');check(api.chapter.conversation().actions.includes('accept-rangers'),'Ranger agreement missing');clickAction('accept-rangers');
    check(api.chapter.state().rangersMet,'Ranger terms did not persist');await sleep(100);return {stage,chapter:api.chapter.state(),render:api.renderStats()};
  }
  if(stage==='ambush-briefing'){
    await meet(api,'ambush');check(api.chapter.conversation().actions.includes('fight'),'Physical ambush prompt missing');clickAction('close');
    check(await api.oremindiCombat.open({kind:'ambush',watch:true}),'Ambush could not be prepared');const c=api.oremindiCombat.controller();
    check(!c.snapshot().started&&c.snapshot().paused,'Ambush skipped readable briefing');check(api.chapter.state().ambush.attempt===0,'Loading the briefing prematurely committed an attempt');
    check(!api.save().ok,'Saving was allowed in the combat briefing');await sleep(100);return {stage,guards:c.snapshot().guards.length,position:api.state().position};
  }
  if(stage==='ambush-result'){
    const result=await runFight(api,'ambush'),state=api.chapter.state();check(state.ambush.fallen===2&&state.ambush.retreated,'Ambush was not resolved from physical retreat');
    check(state.proof==='available','Victory skipped the explicit loot step');check(api.chapter.journal().inventory.length===0,'Proof appeared without being collected');
    return {stage,...result,chapter:state};
  }
  if(stage==='proof'){
    await returnFromCombat(api);check(api.save().ok,'Could not save the uncollected proof');historyIntact(api);await api.loadSaved();
    check(api.chapter.state().proof==='available','Reload lost uncollected evidence');await meet(api,'proof');clickAction('collect-proof');
    check(api.chapter.state().proof==='carried'&&api.chapter.journal().inventory.length===1,'Explicit collection did not create the quest item');
    check(api.save().ok,'Carried proof did not save');await api.loadSaved();check(api.chapter.journal().inventory.length===1,'Reload lost quest inventory');
    await meet(api,'rangers');clickAction('present-proof');const s=api.chapter.state();check(s.rangerAlliance&&s.proof==='delivered','Alliance did not consume the proof');
    check(s.rendezvousAt-s.elapsed<=360&&s.rendezvousAt-s.elapsed>355,'Six-minute meeting was not scheduled');return {stage,chapter:s};
  }
  if(stage==='rendezvous'){
    await meet(api,'rendezvous');check(api.chapter.conversation().actions.includes('wait'),'Wait here is missing at the meeting point');
    const before=api.chapter.state().elapsed;api.step(.04,10);check(api.chapter.state().elapsed===before,'Rendezvous dialogue advanced time');
    clickAction('wait');check(api.chapter.state().elapsed>=api.chapter.state().rendezvousAt,'Wait did not advance the chapter clock');
    check(api.chapter.conversation().actions.includes('fight'),'Ready war party has no battle option');clickAction('close');
    check(await api.oremindiCombat.open({kind:'highground',watch:true}),'High-ground battle could not be prepared');const c=api.oremindiCombat.controller(),s=c.snapshot();
    check(s.allies.length<s.guards.length&&s.allies.length>0,'Rangers are not outnumbered');check(api.chapter.state().battle.attempt===0,'Briefing committed a battle attempt');
    await sleep(100);return {stage,allies:s.allies.length,orcs:s.guards.length,render:api.renderStats()};
  }
  if(stage==='battle-result'){
    const result=await runFight(api,'highground'),s=api.chapter.state();check(s.battle.status==='victory'&&s.battle.chiefDefeated,'Actual chief defeat did not reach campaign');
    check(!s.reported,'Battle silently skipped Taleth report');return {stage,...result,chapter:s};
  }
  if(stage==='report'){
    await returnFromCombat(api);await meet(api,'refuge');await until(()=>api.testWorld.state().room==='tower'&&api.state().mode==='playing','return to Taleth');
    await api.visit({...TALETH_SPOT,y:TOWER.y});check(api.chapter.interact(),'Taleth report interaction missing');clickAction('report');clickAction('close');
    check(api.chapter.state().reported,'Taleth did not complete Chapter 3');check(api.save().ok,'Final Chapter 3 save failed');historyIntact(api);
    const facts=oremindiPolitics(api.chapter.state(),api.store.read().data.history.chapter);check(facts.southOremindiOwner==='oremindi-south-orcs'&&!facts.regionalConquest,'Victory annexed the mountain region');
    errors(api);return {stage,chapter:api.chapter.state(),historyUnchanged:true,politics:facts};
  }
  if(stage==='journal'){
    press('KeyJ',{shiftKey:true});const dialog=document.getElementById('yunethre-journal');check(dialog?.open,'Quest journal did not open');
    const tabs=[...dialog.querySelectorAll('[role="tab"]')];check(tabs.length===3,'Journal is missing prior chapters');check(dialog.querySelector('[data-chapter="chapter-three"]').getAttribute('aria-selected')==='true','Wrong initial journal chapter');
    dialog.querySelector('[data-chapter="chapter-two"]').click();check(dialog.textContent.includes('background'),'Unattended chapter presented as played achievements');
    dialog.querySelector('[data-chapter="chapter-three"]').click();await sleep(100);return {stage,complete:api.chapter.journal().complete,chapters:tabs.map(t=>t.textContent)};
  }
  if(stage==='map'){
    press('Escape');api.openMap({view:'geopolitical'});await sleep(150);check(api.state().mode==='map','Geopolitical map did not open');
    check(api.state().map.scope.names.includes('South Oremindi Mountains')&&api.state().map.scope.names.includes('North Ibenwood'),'Chapter 3 map scope missing new regions');
    const map=api.state().map;return {stage,regions:map.scope.names,zoom:map.zoom,objectives:map.objectives,errors:api.state().frameErrors};
  }
  throw Error('Unknown Chapter 3 review stage '+stage);
}

export async function restored(api,expected){
  const saved=api.store.read().data;check(api.state().launch==='oremindi','Reload chose wrong chapter');check(api.chapter.state().reported,'Reload lost completed Chapter 3');
  check(JSON.stringify(api.chapter.state())===JSON.stringify(expected.chapter),'Reload rewrote Chapter 3 facts');
  check(JSON.stringify(saved.history)===JSON.stringify(expected.history),'Reload rewrote prior chapters');check(api.stable.owned,'Reload lost the horse');
  check(api.chapter.journal().complete&&api.chapter.journal().chapters.length===3,'Reload lost quest journal');errors(api);
  return {reported:true,chapter:api.chapter.state(),horse:api.stable.owned,errors:api.state().frameErrors};
}
