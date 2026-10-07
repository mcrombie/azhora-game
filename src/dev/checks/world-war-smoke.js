import {driveWorldEncounter,clearCombatKeys} from './encounter-controls.js';
import {LIZEEM_BATTLEFIELDS} from '../../content/scenarios/lizeem-battlefields.js';
const frames=async(n=2)=>{for(let i=0;i<n;i++)await new Promise(requestAnimationFrame);};
export async function checkWorldWar(h){
  const checks=[],assert=(value,label)=>{if(!value)throw Error(label);checks.push(label);console.log('EXPLORATION_CHECK '+label);};
  const war=()=>h.war.state(),click=id=>document.getElementById(id).click();
  window.dispatchEvent(new Event('focus'));
  assert(h.state().mode==='playing'&&!!h.war,'World test starts in the authored exploration world');
  assert(war().campaign.hero.region==='isareos'&&war().campaign.day===0,'Physical Minora start maps to Isareos in the new simulation');
  assert(!war().clock.running,'Campaign starts paused for exploration and setup');
  h.openMap();await frames(3);assert(h.state().map.campaign.view==='regions','M map still opens in Regions');
  document.querySelector('[data-atlas-view="geopolitical"]').click();
  assert(h.state().map.campaign.simulation.id==='lizeem-world-v4','Existing geopolitical map reads live simulation data');
  assert(h.state().map.chart.reveal&&document.getElementById('developer-reveal').checked&&document.getElementById('reveal-all').checked,'World development defaults both reveal controls to on');
  const discoveries=h.state().cells.length;h.reveal(false);assert(h.state().cells.length===discoveries,'Turning default reveal off preserves real discoveries');
  assert(h.state().map.campaign.owner('Isareos')==='minora'&&h.state().map.campaign.owner('Caricas')===null,'Ownership is shown only for discovered territory');
  click('world-war-run');for(let i=0;i<15;i++)h.step(.04);assert(war().clock.fraction>0,'Running campaign accumulates active world time');
  h.pause();const held=war().clock.fraction;for(let i=0;i<30;i++)h.step(.04);assert(war().clock.fraction===held,'Pause menu freezes campaign time');
  h.openDeveloper();for(let i=0;i<30;i++)h.step(.04);assert(war().clock.fraction===held,'Developer menu freezes campaign time');
  h.resume();window.dispatchEvent(new Event('blur'));for(let i=0;i<30;i++)h.step(.04);assert(war().clock.fraction===held,'Inactive window freezes campaign time');window.dispatchEvent(new Event('focus'));
  h.openMap();click('world-war-run');h.war.advance(10);await frames();
  const active=war().campaign.engagements.find(b=>b.status==='active');
  assert(active?.region==='caricas'&&active.started===9&&active.endsOn===12,'Caricas battle remains open for three days while the hero is elsewhere');
  assert(!h.state().map.battleMarkers.length&&document.getElementById('world-war-battles').hidden,'Undiscovered battles do not leak through markers or the battle list');
  h.reveal(true);assert(h.state().map.battleMarkers.includes(active.id),'Developer reveal exposes an active battlefield');
  h.resume();await frames();assert(!document.getElementById('world-war-report').hidden&&document.getElementById('world-war-report-detail').textContent.includes('Caricas')&&/before day 12|Expected day 13/.test(document.getElementById('world-war-report-detail').textContent),'Known battle or marching-army news is visible while exploring elsewhere');
  h.reveal(false);assert(!h.state().map.battleMarkers.length,'Turning reveal off hides an unknown battlefield again');
  assert(document.getElementById('world-war-report').hidden,'Turning reveal off also hides undiscovered battle reports');
  const beforeTravel=war().campaign.day;assert(await h.travelToRegion(13),'Developer Go loads real Caricas scenery');await frames(2);
  assert(war().campaign.day===beforeTravel,'Scenery loading does not consume campaign days');
  assert(war().campaign.hero.region==='caricas'&&h.state().region===13,'Physical arrival updates campaign hero location');
  assert(h.state().mode==='playing'&&!war().campaign.pending,'Entering a region with an ongoing battle does not force an encounter');
  assert(war().beacons.includes(active.id)&&!document.getElementById('world-war-join').hidden,'Discovered battlefield has a local flag and join prompt');
  assert(war().presence.banner?.color==='#bf7969'&&war().presence.banner.count===3,'Existing Caricas standards show the incumbent East faction');
  assert(war().presence.guards.length===0,'An ongoing battle does not show a peaceful guard detail');
  h.openMap();await frames();
  for(const view of ['regions','geopolitical','stability']){document.querySelector(`[data-atlas-view="${view}"]`).click();await frames();assert(!!document.querySelector(`[data-battle-id="${active.id}"]`),`Discovered battle marker is visible in ${view} view`);}
  assert(document.getElementById('world-war-battles').children.length===1,'Map lists only the discovered active battle');h.resume();
  const site={x:h.state().position[0],y:h.state().position[1],z:h.state().position[2]};
  await h.visit({...site,x:site.x+60});await frames();assert(h.state().region===13&&!h.war.join(active.id).ok,'Same region but far from the battle cannot join');
  await h.visit({...site,y:site.y+100});await frames();assert(!h.war.join(active.id).ok,'Flying far above the battlefield cannot join');
  await h.visit(site);await frames();
  h.selectMount('bat');h.step(.04);assert(war().campaign.hero.region==='caricas','Developer flight remains tied to the actual region');h.selectMount('foot');for(let i=0;i<60;i++)h.step(.04);
  const otherKeys=['azhora-exploration-v1','azhora-lizeem-world-v1','azhora-lizeem-world-v2','azhora-hearthfall-v1'];
  const otherSaves=otherKeys.map(key=>window.azhoraExplorationStorage.getItem(key));
  for(const key of otherKeys){let rejected=false;try{window.azhoraExplorationStorage.setItem(key,'{"sentinel":true}');}catch{rejected=true;}assert(rejected,'War mode cannot overwrite '+key);}
  h.pause();assert(h.save().ok,'Combined world and campaign checkpoint saves on the ground');const preBattle=h.store.read().data;
  assert(preBattle.format==='azhora-lizeem-world-v3'&&preBattle.exploration.position.x===h.state().position[0],'World save contains hero position and simulation history together');
  h.war.advance(2);assert(!h.war.join(active.id).ok,'Arriving after the deadline cannot reopen a resolved battle');
  assert(war().presence.banner.color==='#bf7969'&&war().presence.guards.length===1,'An unattended East hold keeps its banner and shows only its surviving strength');
  await h.loadSaved();assert(war().campaign.engagements.find(b=>b.id===active.id)?.status==='active'&&war().campaign.day===10,'Loading an active-battle checkpoint restores its remaining window');
  h.resume();const before=h.state().position;
  document.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyF',bubbles:true}));
  assert(h.state().mode==='encounter'&&war().campaign.pending?.region==='caricas','F joins an ongoing battle at its physical location');
  h.war.advance(20);assert(war().campaign.day===10,'A joined encounter freezes campaign time');
  assert(!h.save().ok&&!(await h.travelToRegion(17)),'Saving and developer teleport cannot escape an unresolved encounter');
  document.dispatchEvent(new KeyboardEvent('keydown',{code:'F8',bubbles:true}));assert(h.state().mode==='encounter','Developer hotkeys do not bypass the modal encounter');
  assert(document.getElementById('encounter-brief').textContent.includes('12 approaching reinforcements')&&!document.getElementById('encounter-brief').textContent.includes('20 percentage'),'Brief explains real reinforcements instead of a generic chance bonus');
  click('fight-attacker');
  const waitFor=async(fn,label)=>{const end=performance.now()+30000;while(!fn()&&performance.now()<end)await frames(2);assert(fn(),label);};
  await waitFor(()=>h.state().mode==='skirmish','Caricas encounter begins in the existing landscape');
  assert(war().encounter.encounter?.site==='caricas-world'&&!document.getElementById('encounter-dialog').open,'Field combat uses the world instead of the modal arena');
  assert(war().encounter.encounter.objective?.type==='intercept'&&document.getElementById('world-skirmish-objective').textContent.includes('rally point')&&document.getElementById('world-skirmish-objective').textContent.includes('reinforcement strength'),'Field objective identifies the detachment and rally point');
  assert(h.state().fieldActors.length===3&&h.state().fieldActors.every(a=>a.clear&&Math.abs(a.position[1]-a.ground)<.01),'Three opponents stand on clear actual Caricas ground');
  assert(Math.hypot(h.state().position[0]-before[0],h.state().position[2]-before[2])<.01,'Joining keeps the existing hero at the arrival position');
  const canvas=document.getElementById('exploration-canvas');canvas.focus();window.dispatchEvent(new Event('focus'));
  h.hold('KeyD',true);for(let i=0;i<10;i++)h.step(.04);h.hold('KeyD',false);
  assert(Math.hypot(h.state().position[0]-before[0],h.state().position[2]-before[2])>.5,'Field movement moves the physical exploration hero');
  h.hold('KeyW',true);h.hold('Space',true);h.step(.04);assert(war().encounter.encounter.hero.dodge>0,'Space dodges during field combat');h.hold('KeyW',false);h.hold('Space',false);
  const heldCombat=war().encounter.encounter.time;window.dispatchEvent(new Event('blur'));for(let i=0;i<10;i++)h.step(.04);
  assert(war().encounter.encounter.time===heldCombat,'Inactive window pauses actual field combat');window.dispatchEvent(new Event('focus'));
  for(const code of ['F8','F5','KeyM'])document.dispatchEvent(new KeyboardEvent('keydown',{code,bubbles:true}));
  assert(h.state().mode==='skirmish'&&!h.save().ok&&!(await h.travelToRegion(17)),'Map, saves and developer travel remain blocked while fighting in the world');
  for(let i=0;i<3600&&!war().encounter.encounter?.outcome;i++){driveWorldEncounter(h,war().encounter.encounter);h.step(1/60);}clearCombatKeys(h);
  await waitFor(()=>!!war().encounter.encounter?.outcome,'Field combat pauses on an explicit result before removing opponents');
  const fightingPosition=h.state().position;
  assert(h.state().mode==='skirmish'&&h.state().fieldActors.length===3&&!document.getElementById('world-skirmish-result').hidden,'Finished field scene remains available for review');
  assert(document.getElementById('world-skirmish-result-detail').textContent.includes('stopped all three'),'Victory review explains the local objective');
  const reviewButton=document.getElementById('world-skirmish-continue').getBoundingClientRect();
  assert(reviewButton.width>0&&reviewButton.bottom<innerHeight,'Result acknowledgement fits inside the game window');
  const frozen=JSON.stringify(war().encounter.encounter);for(let i=0;i<50;i++)h.step(.04);
  assert(JSON.stringify(war().encounter.encounter)===frozen&&war().campaign.pending,'Combat and campaign stay frozen until the player continues');
  click('world-skirmish-continue');
  assert(!!war().campaign.engagements.find(b=>b.id===active.id).heroResult,'Continue records the completed result and returns to exploration');
  assert(war().campaign.engagements.find(b=>b.id===active.id).heroResult.outcome==='success','Hero defeats the three field opponents');
  assert(war().campaign.regions.caricas.garrison===16&&war().campaign.engagements.find(b=>b.id===active.id).heroResult.objective.blocked===12,'Victory removes twelve real defending strength immediately');
  assert(h.state().mode==='playing'&&Math.hypot(h.state().position[0]-fightingPosition[0],h.state().position[2]-fightingPosition[2])<.01,'After combat the hero remains where the fighting ended');
  assert(h.state().fieldActors.length===0&&document.getElementById('world-skirmish').hidden,'Combat removes temporary opponents and its HUD');
  assert(!performance.getEntriesByType('resource').some(r=>r.name.includes('/encounter-view.js')),'Caricas fight does not load an arena renderer');
  assert(war().campaign.regions.caricas.owner==='east'&&war().campaign.engagements.find(b=>b.id===active.id).heroResult?.outcome==='success','Hero result is recorded while the regional battle remains underway');
  assert(war().presence.banner.color==='#bf7969'&&war().presence.guards.length===0,'Winning the interception does not prematurely change banners or station guards');
  assert(!document.getElementById('world-war-report').hidden&&document.getElementById('world-war-report-title').textContent==='Reinforcements stopped at Caricas','Returning to the world clearly reports the skirmish victory');
  assert(document.getElementById('world-war-report-detail').textContent.includes('still controls Caricas')&&document.getElementById('world-war-report-clock').textContent.includes('paused'),'Aftermath distinguishes pending regional outcome and explains how to resume time');
  const postEncounter=h.war.save(h.snapshot());
  click('world-war-report-dismiss');await frames();assert(document.getElementById('world-war-report').hidden,'Dismissed report stays dismissed during ordinary exploration');
  assert(!h.war.join(active.id).ok,'The hero cannot fight the same engagement twice');
  h.war.advance(2);
  assert(!document.getElementById('world-war-report').hidden&&document.getElementById('world-war-report-title').textContent==='West Lizeem captured Caricas','Regional resolution presents a new report after the skirmish report was dismissed');
  assert(document.getElementById('world-war-report-detail').textContent.includes('Your interception tipped the outcome'),'Conquest report explains when hero participation changed the outcome');
  assert(document.getElementById('world-war-report-detail').textContent.includes('64% to 76%'),'Consequence reports the chance from changed troops without an extra bonus');
  assert(war().campaign.regions.caricas.owner==='west'&&h.state().map.campaign.owner('Caricas')==='west','Battle resolution at its deadline updates simulation and the M map');
  assert(war().presence.banner.color==='#789e91'&&war().presence.guards.length===2,'Conquest changes the existing banners and places a West guard detail');
  assert(war().presence.guards.every(g=>g.clear&&Math.abs(g.position[1]-g.ground)<.01),'Aftermath guards stand on clear actual terrain');
  assert(!document.getElementById('world-site-status').hidden&&document.getElementById('world-site-status').textContent.includes('West Lizeem controls Caricas · recovering from battle'),'Nearby status identifies the new controller and recovery');
  assert(!war().beacons.includes(active.id)&&!h.state().map.battleMarkers.includes(active.id),'Resolved battle loses its flag and map marker');
  h.openMap();await frames();assert(h.state().map.campaign.view==='regions','Reopening M retains the ordinary regional default');
  document.querySelector('[data-atlas-view="geopolitical"]').click();
  assert(!document.querySelector('[data-info-tab="quests"]'),'World-test map does not bring back the authored quest arc');
  h.reveal(true);assert(h.state().map.campaign.owner('Nesdor')==='east'&&h.state().map.campaign.owner('West Ithzel')==='unassigned','Developer reveal shows live scenario control without inventing outside factions');
  h.reveal(false);assert(h.state().map.campaign.owner('Nesdor')===null,'Turning reveal off restores political fog');
  h.pause();assert(h.save().ok,'World save records the completed hero intervention');const saved=h.store.read().data;



  h.resume();
  h.war.advance(2);assert(!document.getElementById('world-site-status').textContent.includes('recovering'),'Site recovery wording ends when campaign recovery ends');
  for(const attempt of ['defeat','withdraw','let-pass']){
    const outcome=attempt==='let-pass'?'defeat':attempt;
    h.store.save(preBattle);await h.loadSaved();h.war.join(active.id);click('fight-defender');
    await waitFor(()=>h.state().mode==='skirmish','Another field encounter can start after cleanup');
    assert(war().presence.guards.length===0&&war().presence.banner.color==='#bf7969','Rewinding the save removes later guards and restores the earlier banner');
    if(outcome==='withdraw')document.dispatchEvent(new KeyboardEvent('keydown',{code:'Escape',bubbles:true}));
    if(attempt==='let-pass'){h.hold('KeyA',true);for(let i=0;i<200&&h.state().mode==='skirmish';i++)h.step(.04);h.hold('KeyA',false);}
    if(outcome!=='withdraw'){
      await waitFor(()=>!!war().encounter.encounter?.outcome,`Field ${outcome} shows its reason before returning`);
      const reason=attempt==='let-pass'?'runner-arrived':'driven-back';
      assert(war().encounter.encounter.objective.reason===reason,`Field ${attempt} retains the actual cause`);
      assert(document.getElementById('world-skirmish-result-detail').textContent.includes(attempt==='let-pass'?'The surviving runners':'health reached zero'),'Failure review explains what ended the interception');
      assert(h.state().fieldActors.length===3&&war().campaign.pending,'Failure keeps the battlefield visible until acknowledged');
      click('world-skirmish-continue');
      assert(war().campaign.engagements.find(b=>b.id===active.id).heroResult.reason===reason,'Campaign records the acknowledged failure reason');
    }
    await waitFor(()=>!!war().campaign.engagements.find(b=>b.id===active.id).heroResult,`Field ${outcome} resolves without trapping the hero`);
    assert(war().campaign.engagements.find(b=>b.id===active.id).heroResult.outcome===outcome&&h.state().fieldActors.length===0,`Field ${outcome} is recorded once and cleans up opponents`);
    assert(war().campaign.engagements.find(b=>b.id===active.id).heroResult.objective.blocked===0,`Field ${outcome} does not remove reinforcements`);
    assert(war().campaign.day===10&&!war().clock.running,'Campaign remains paused after field combat');
    if(attempt==='let-pass')assert(document.getElementById('world-war-report-title').textContent==='Interception failed at Caricas'&&document.getElementById('world-war-report-detail').textContent.includes('The surviving runners reached the blue enemy rally point'),'Runner failure report explains the cause in real scenery');
  }
  h.store.save(saved);await h.loadSaved();
  for(const [id,key]of [[17,'nethereum'],[25,'ovesos'],[14,'nesdor']]){
    const at=LIZEEM_BATTLEFIELDS[key];assert(await h.travelToRegion(id),`Battlefield region ${key} loads`);await frames();
    assert(h.state().region===id&&Math.hypot(h.state().position[0]-at.x,h.state().position[2]-at.z)<=24,`${key} has reachable ground within the join radius`);
    assert(war().presence.guards.length===0&&document.getElementById('world-site-status').hidden,'Caricas presence stays local when exploring elsewhere');
  }
  h.war.advance();await h.loadSaved();
  assert(war().campaign.day===saved.simulation.day&&war().campaign.hero.region==='caricas'&&h.state().region===13,'Load restores hero and war to the same point');
  assert(JSON.stringify(war().campaign.commands)===JSON.stringify(saved.simulation.commands),'Restored commands retain the actual encounter outcome');
  await frames();assert(war().presence.guards.length===2&&war().presence.banner.color==='#789e91','Returning to the saved aftermath restores the guard detail without duplication');
  const diskBeforeAutoplay=JSON.stringify(h.store.read());
  h.war.restore(null);h.resume();
  const pressP=(repeat=false)=>document.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyP',repeat,bubbles:true}));
  document.getElementById('autoplay-caricas').click();assert(h.autoplay.state().active,'Named Caricas button starts its autoplay');
  pressP(true);assert(h.autoplay.state().active,'Holding P does not repeatedly toggle autoplay');
  window.dispatchEvent(new Event('blur'));for(let i=0;i<100;i++)h.step(.04);
  assert(war().campaign.day===0,'Inactive window freezes autoplay campaign advancement');window.dispatchEvent(new Event('focus'));
  pressP();assert(!h.autoplay.state().active&&!war().clock.running,'P stops autoplay and leaves campaign time paused');
  document.getElementById('autoplay-caricas').click();
  let tookControl=false;const autoplayDeadline=performance.now()+180000;
  while(h.autoplay.state().active&&performance.now()<autoplayDeadline){
    h.step(.04);
    if(h.state().mode==='skirmish'&&!tookControl){
      pressP();assert(!h.autoplay.state().active&&h.state().mode==='skirmish','P hands the real fight to the player without withdrawing');
      document.getElementById('autoplay-caricas').click();tookControl=true;
    }
    await frames();
  }
  assert(!h.autoplay.state().active&&tookControl,'Computer autoplay completes the full Caricas demonstration');
  assert(war().campaign.day===12&&war().campaign.regions.caricas.owner==='west','Autoplay normal combat tips the seeded Caricas battle at its deadline');
  assert(war().campaign.engagements.find(b=>b.region==='caricas').heroResult?.objective.blocked===12,'Autoplay removes the real detachment through the encounter outcome');
  assert(h.state().mode==='map'&&h.state().map.campaign.view==='geopolitical','Autoplay finishes on the live geopolitical map');
  assert(war().presence.banner.color==='#789e91'&&war().presence.guards.length===2,'Autoplay produces the physical West aftermath');
  assert(JSON.stringify(h.store.read())===diskBeforeAutoplay,'Autoplay leaves the saved checkpoint untouched');
  pressP();assert(!h.autoplay.state().active&&h.state().mode==='developer'&&war().campaign.day===12,'P opens the chooser without resetting its campaign');
  await h.loadSaved();h.resume();
  assert(!h.state().frameErrors.length,'Integrated world test has no frame errors');
  for(const [i,key] of otherKeys.entries())assert(window.azhoraExplorationStorage.getItem(key)===otherSaves[i],'Other save remains unchanged: '+key);
  return {checks,saved,preBattle,postEncounter,readyMs:h.state().readyMs};
}
export async function checkWorldWarReload(h,saved){
  await frames();
  const checks=[],assert=(value,label)=>{if(!value)throw Error(label);checks.push(label);};const war=h.war.state();
  assert(h.state().region===13&&Math.hypot(h.state().position[0]-saved.exploration.position.x,h.state().position[2]-saved.exploration.position.z)<.01,'Fresh renderer restores the same physical location');
  assert(war.campaign.day===saved.simulation.day&&war.campaign.regions.caricas.owner==='west','Fresh renderer restores campaign time and conquest');
  assert(JSON.stringify(war.campaign.commands)===JSON.stringify(saved.simulation.commands),'Fresh renderer retains the complete campaign replay');
  assert(!war.clock.running,'Restored world campaign starts paused');
  assert(h.state().map.chart.reveal,'Fresh world-test window starts with developer reveal on');
  assert(!document.getElementById('world-war-report').hidden&&document.getElementById('world-war-report-title').textContent==='West Lizeem captured Caricas','Saved hero consequences remain readable after a fresh renderer');
  assert(!h.state().frameErrors.length,'Restored world test has no frame errors');
  assert(war.presence.guards.length===2&&war.presence.banner?.color==='#789e91','Fresh renderer restores the controlling faction banners and guards');
  assert(!document.getElementById('world-site-status').hidden&&document.getElementById('world-site-status').textContent.includes('recovering from battle'),'Fresh renderer restores the nearby recovery status');
  document.getElementById('autoplay-caricas').click();
  assert(!h.autoplay.state().active&&!document.getElementById('exploration-status').hidden&&document.getElementById('exploration-status').textContent.includes('already resolved'),'Restored completed run explains how to replay autoplay without resetting progress');
  h.resume();h.war.restore(null);h.war.advance(10);h.war.join();await h.war.help('west');
  window.dispatchEvent(new Event('focus'));h.hold('KeyA',true);
  for(let i=0;i<1000&&!h.war.state().encounter.encounter?.outcome;i++)h.step(.04);
  h.hold('KeyA',false);
  assert(h.war.state().encounter.encounter?.objective.reason==='runner-arrived','Fresh renderer reproduces a runner reaching the rally point');
  assert(!document.getElementById('world-skirmish-result').hidden&&document.getElementById('world-skirmish-controls').hidden&&document.getElementById('world-skirmish-objective').hidden,'Result review replaces combat instructions after a fresh load');
  document.dispatchEvent(new KeyboardEvent('keydown',{code:'Enter',bubbles:true}));
  assert(h.state().mode==='playing'&&h.war.state().campaign.engagements.find(b=>b.region==='caricas')?.heroResult?.reason==='runner-arrived','Enter acknowledges the completed result without changing it to withdrawal');
  await h.loadSaved();
  return {checks,readyMs:h.state().readyMs};
}

export async function checkScenarioTools(h){
  const checks=[],assert=(value,label)=>{if(!value)throw Error(label);checks.push(label);};
  h.resume();
  document.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyP',bubbles:true}));
  assert(h.state().mode==='developer'&&!h.journey.state().active,'Idle P opens named scenario tools without starting a run');
  document.getElementById('developer-autoplay').scrollIntoView({block:'center'});await frames();
  for(const id of ['autoplay-ovesos','autoplay-caricas']){
    const element=document.getElementById(id),rect=element.getBoundingClientRect();
    assert(rect.width>200&&rect.top>=0&&rect.bottom<=innerHeight&&element.checkVisibility(),id+' is visible and reachable in the developer panel');
  }
  const before=JSON.stringify(h.war.state().campaign);
  document.getElementById('autoplay-ovesos').click();
  assert(h.journey.state().active,'Developer Ovesos button selects the fresh-ride scenario');
  document.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyP',bubbles:true}));await frames();
  assert(!h.journey.state().active&&JSON.stringify(h.war.state().campaign)===before,'Stopping queued Ovesos setup leaves the current campaign intact');
  return {checks,readyMs:h.state().readyMs};
}

// Focused native regression for result review; avoids rebuilding unrelated regions.
export async function checkInterceptionFeedback(h){
  const checks=[],assert=(value,label)=>{if(!value)throw Error(label);checks.push(label);console.log('EXPLORATION_CHECK '+label);};
  window.dispatchEvent(new Event('focus'));
  document.getElementById('autoplay-caricas').click();
  assert(h.war.state().clock.speed===20&&document.getElementById('world-war-speed').value==='20','Autoplay selects 20x campaign speed in the model and map');
  const end=performance.now()+180000;let reviewed=false;
  while(h.autoplay.state().active&&performance.now()<end){
    h.step(.04);
    if(!document.getElementById('world-skirmish-result').hidden)reviewed=true;
    await frames();
    if(!document.getElementById('world-skirmish-result').hidden)reviewed=true;
  }
  assert(!h.autoplay.state().active&&reviewed,'Autoplay presents and acknowledges the result review');
  assert(h.war.state().campaign.day===12&&h.war.state().campaign.regions.caricas.owner==='west','Autoplay completes conquest after reviewing the normal combat result');
  assert(h.save().ok,'Autoplay result saves through the ordinary world checkpoint');
  const saved=h.store.read().data;
  const begin=async()=>{h.resume();h.war.restore(null);h.war.advance(10);assert(h.war.join().ok,'Partial-success test joins Caricas');await h.war.help('west');};
  const stopSoldiers=count=>{
    for(let i=0;i<3600;i++){const s=h.war.state().encounter.encounter;if(s.outcome||s.guards.filter(g=>!g.hp).length>=count)break;driveWorldEncounter(h,s);h.step(1/60);}
    clearCombatKeys(h);
    assert(h.war.state().encounter.encounter.guards.filter(g=>!g.hp).length===count,`Real combat stops exactly ${count} soldiers`);
    assert(/Hit soldier|Countered soldier/.test(document.getElementById('world-skirmish-feedback').textContent),'A landed strike produces readable hit feedback');
  };
  await begin();stopSoldiers(1);h.war.withdraw();
  assert(h.war.state().campaign.engagements.find(b=>b.region==='caricas').heroResult.objective.blocked===4,'Retreat keeps four strength removed after one stopped soldier');
  assert(document.getElementById('world-war-report-title').textContent==='Reinforcements weakened at Caricas','Partial contribution gets a distinct campaign report');
  assert(h.store.save(h.war.save(h.snapshot())).ok,'Partial withdrawal checkpoint saves');await h.loadSaved();await frames();
  assert(h.war.state().campaign.engagements.find(b=>b.region==='caricas').heroResult.objective.blocked===4,'Reload preserves the partial withdrawal contribution');
  h.store.save(saved);
  await begin();stopSoldiers(2);h.hold('KeyA',true);
  for(let i=0;i<1000&&!h.war.state().encounter.encounter.outcome;i++){
    h.hold('Space',h.war.state().encounter.encounter.guards.some(g=>g.hp>0&&g.phase==='windup'&&g.timer<.25));h.step(.04);
  }
  h.hold('KeyA',false);h.hold('Space',false);await frames();
  assert(document.getElementById('world-skirmish-result-title').textContent==='Partial interception'&&document.getElementById('world-skirmish-result-detail').textContent.includes('8 of 12 reinforcement strength removed; 4 remains'),'Two stopped soldiers produce an eight-strength partial result');
  const partial=h.war.state().encounter.encounter;assert(partial.outcome&&partial.guards.filter(g=>!g.hp).length===2,'Partial encounter finishes normally');
  document.getElementById('world-skirmish-continue').click();
  assert(h.war.state().campaign.engagements.find(b=>b.region==='caricas').heroResult.objective.blocked===8,'Acknowledging partial success deducts eight real strength');
  await h.loadSaved();await frames();
  h.resume();h.war.restore(null);h.war.advance(10);assert(h.war.join().ok,'Focused runner test joins the real Caricas site');await h.war.help('west');
  h.hold('KeyA',true);
  for(let i=0;i<50;i++)h.step(.04);
  assert(!document.getElementById('world-skirmish-warning').hidden,'Marching soldiers trigger a visible rally warning');
  for(let i=0;i<1000&&!h.war.state().encounter.encounter?.outcome;i++)h.step(.04);
  h.hold('KeyA',false);await frames();
  assert(h.war.state().encounter.encounter?.objective.reason==='runner-arrived','Runner reaching the rally point ends the local objective');
  assert(h.state().fieldActors.length===3&&!document.getElementById('world-skirmish-result').hidden,'Runner failure holds the scene for review');
  assert(document.getElementById('world-skirmish-result-detail').textContent.includes('The surviving runners reached the blue enemy rally point'),'Result names the actual trigger');
  const bounds=document.getElementById('world-skirmish-continue').getBoundingClientRect();assert(bounds.width>0&&bounds.bottom<innerHeight,'Continue button fits the result screen');
  assert(!h.state().frameErrors.length,'Focused result review has no frame errors');
  return {checks,saved};
}
