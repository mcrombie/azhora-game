import {driveWorldEncounter,clearCombatKeys} from './encounter-controls.js';
const frames=async(n=2)=>{for(let i=0;i<n;i++)await new Promise(requestAnimationFrame);};
const checks=[];
const assert=(value,label)=>{if(!value)throw Error(label);checks.push(label);console.log('EXPLORATION_CHECK '+label);};
export async function prepareOvesos(h){
  window.dispatchEvent(new Event('focus'));h.reveal(true);h.war.advance(6);h.openMap();await frames();
  [...document.getElementById('world-war-battles').children].find(b=>b.textContent.includes('Ovesos')).click();h.resume();await frames();
  assert(h.war.state().tracking.label==='Battle at Ovesos','Ovesos battle can be tracked from Minora');
  assert(await h.travelToRegion(25),'Existing Ovesos landscape loads through normal region preparation');await frames();
  for(let i=0;i<30;i++)h.step(.04);
  const b=h.war.state().campaign.engagements.find(b=>b.region==='ovesos');
  assert(b.started===5&&b.endsOn===8,'Ovesos has its own day 5 to 8 intervention window');
  console.log('EXPLORATION_OVESOS_POSITION '+JSON.stringify(h.state().position));
  assert(h.war.state().campaign.day===6,'Loading Ovesos does not consume campaign days');
  h.selectMount('horse');assert(!h.war.join(b.id).ok,'Mounted hero cannot join Ovesos field encounter');h.selectMount('foot');for(let i=0;i<30;i++)h.step(.04);
  assert(h.war.join(b.id).ok,'Grounded hero joins at the Ovesos flag');
  assert(document.getElementById('encounter-brief').textContent.includes('reinforcements'),'Ovesos briefing explains the interception objective');
  await h.war.help('west');await frames();
  assert(h.state().mode==='skirmish'&&h.war.state().encounter.encounter?.site==='ovesos-world','Ovesos uses the existing world, hero and shared field encounter');
  assert(h.war.state().encounter.encounter.presentation.speed===1&&h.war.state().encounter.encounter.presentation.introRemaining===0,'Manual combat retains normal speed without an autoplay countdown');
  assert(document.querySelector('#world-skirmish .eyebrow').textContent.startsWith('OVESOS'),'Encounter HUD identifies the correct site');
  assert(h.state().fieldActors.length===3&&h.state().fieldActors.every(a=>a.clear&&Math.abs(a.position[1]-a.ground)<.01),'All Ovesos opponents spawn on clear real terrain');
  assert(!document.getElementById('encounter-dialog').open,'The arena dialog is closed during Ovesos combat');
  return {checks:[...checks]};
}
export async function finishOvesos(h){
  const snapshot=()=>h.war.state().encounter.encounter;
  for(let i=0;i<3000&&!snapshot().outcome&&snapshot().guards.every(g=>g.hp);i++){driveWorldEncounter(h,snapshot());h.step(1/60);}
  clearCombatKeys(h);
  assert(snapshot().guards.filter(g=>!g.hp).length===1,'Ordinary combat stops one soldier in Ovesos');
  h.war.withdraw();await frames();
  let state=h.war.state().campaign,b=state.engagements.find(b=>b.region==='ovesos');
  assert(b.heroResult.objective.blocked===4,'Withdrawing retains four real reinforcement losses in Ovesos');
  assert(document.getElementById('world-war-report-title').textContent==='Reinforcements weakened at Ovesos','Partial report names Ovesos');
  assert(h.state().fieldActors.length===0,'Ovesos temporary opponents are cleaned up');
  assert(h.save().ok,'Partial Ovesos result saves');const saved=h.store.read().data;
  h.war.advance(2);assert(h.war.state().campaign.engagements.find(b=>b.region==='ovesos').status==='resolved','Ovesos territorial battle waits until day 8');
  await h.loadSaved();assert(h.war.state().campaign.engagements.find(b=>b.region==='ovesos').heroResult.objective.blocked===4,'Reload restores the exact partial Ovesos contribution');
  h.resume();h.war.restore(null);h.war.advance(6);assert(h.war.join().ok,'A fresh scenario can reuse the same loaded Ovesos site');await h.war.help('east');
  for(let i=0;i<3600&&!snapshot().outcome;i++){driveWorldEncounter(h,snapshot());h.step(1/60);}clearCombatKeys(h);await frames();
  assert(snapshot().outcome==='success','Normal combat can stop all three Ovesos soldiers for the other side');
  assert(document.getElementById('world-skirmish-result-detail').textContent.includes('control of Ovesos has not changed'),'Result review uses Ovesos rather than Caricas');
  document.getElementById('world-skirmish-continue').click();await frames();
  b=h.war.state().campaign.engagements.find(b=>b.region==='ovesos');assert(b.heroResult.objective.blocked===12,'Full Ovesos interception removes twelve strength from the opposing faction');
  h.war.advance(2);state=h.war.state().campaign;const result=state.events.find(e=>e.type==='battle'&&e.region==='ovesos');
  assert(h.state().map.campaign.owner('Ovesos')===state.regions.ovesos.owner,'Ovesos resolution updates geopolitical ownership');
  assert(result.unassistedChance!==result.chance,'Ovesos battle odds reflect the actual removed troops');
  assert(h.save().ok,'Resolved Ovesos campaign saves');
  assert(!h.state().frameErrors.length,'Ovesos combat and results have no frame errors');
  return {checks:[...checks],saved,finalSave:h.store.read().data,result};
}
