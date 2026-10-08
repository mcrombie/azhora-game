import {createWorldWar} from '../../app/exploration/world-war.js';
import {explorationMovement} from '../../app/exploration/movement.js';

const frames=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
const checks=[];let rallyCheckpoint;
function assert(value,label){if(!value)throw Error(label);checks.push(label);console.log('EXPLORATION_CHECK '+label);}
export async function startJourney(h){
  window.dispatchEvent(new Event('focus'));
  const w=h.testWorld,p={x:-2437,y:w.heightAt(-2437,251),z:251},m=explorationMovement(p,w);
  const riding={walk:13,run:26,radius:.62,swimming:false};
  for(let i=0;i<30;i++)m.step(new Set(['KeyW']),0,.04,riding);
  const bank={...p};for(let i=0;i<15;i++)m.step(new Set(['KeyS']),0,.04,riding);
  assert(p.z>bank.z+2,'Horse backs away from the reproduced Minora riverbank trap');
  assert(!m.state().swimming,'Horse remains on land at the river');
  h.war.restore(null);h.resume();assert(h.save().ok,'Save sentinel before fresh demo');
  const saved=JSON.stringify(h.store.read());
  h.openDeveloper();assert(!document.getElementById('developer-autoplay').hidden,'Developer tools name both computer scenarios');
  document.getElementById('autoplay-ovesos').click();
  assert(h.journey.state().active,'Named Ovesos button starts the journey');
  return {saved};
}

export function checkRegionalGround(h){
  const jobs=h.testWorld.loading.state().jobs,tiles=jobs.filter(j=>j.id.startsWith('telemoniaTile-'));
  // No Telemonia mesh tile currently intersects an enabled region; retain the
  // region's dependency handle and allow only scenario-owned tiles if that changes.
  assert(jobs.find(j=>j.id==='telemoniaGround-25')?.status==='ready'&&tiles.every(j=>j.regions.length===1&&j.regions[0]===25&&j.status==='ready'),'Ovesos fine-ground dependency is ready without any unrelated Telemonia tiles');
  assert(!jobs.some(j=>j.id==='telemoniaGround-55'),'Telemonia interior is excluded from the scenario');
  assert(jobs.every(j=>j.regions.every(id=>h.state().enabledRegions.includes(id))),'Every registered build job belongs to an enabled scenario region');
  assert(h.testWorld.loading.isReady(25),'Ovesos terrain and scenery are ready at the end of the ride');
}
export async function rideJourney(h,until=Infinity){
  const end=performance.now()+300000;let previous='';
  while(h.journey.state().active&&performance.now()<end){
    const j=h.journey.state(),s=h.state(),stamp=j.stage+'/'+j.index+'/'+s.mode;
    if(stamp!==previous){console.log('EXPLORATION_JOURNEY '+stamp+' '+JSON.stringify(s.position));previous=stamp;}
    if(typeof until==='string'?j.stage===until:j.stage==='ride'&&j.index>=until)return;
    for(let i=0;i<8;i++)h.step(.04);
    await frames();
  }
  console.log('EXPLORATION_JOURNEY_END '+JSON.stringify({state:h.journey.state(),position:h.state().position,probe:h.groundProbe(h.state().position[0],h.state().position[2])}));
  assert(!h.journey.state().active,'Horse journey and combat finish without timing out: '+JSON.stringify(h.journey.state()));
}
export function finishJourney(h,saved){
  const state=h.war.state(),battle=state.campaign.engagements.find(b=>b.region==='ovesos');
  assert(h.journey.state().stage==='resolve','Journey reaches the regional resolution: '+document.getElementById('exploration-status').textContent);
  assert(battle?.heroResult?.objective.blocked===12,'Normal Ovesos combat intercepts all twelve East reinforcements');
  assert(battle.status==='resolved'&&battle.rally?.outcome==='success'&&state.campaign.day===8,'Successful rally assault advances to day eight and resolves Ovesos immediately');
  assert(state.campaign.regions.ovesos.owner==='west',"The player's rally victory actually holds Ovesos for West");
  assert(/forced their retreat/.test(document.getElementById('world-war-result').textContent),'Final report explains the decisive contribution');
  assert(h.state().mount.kind==='foot','Teresod dismounts before joining');
  assert(h.state().mode==='map'&&h.state().map.campaign.view==='geopolitical','Journey ends on the geopolitical result');
  assert(JSON.stringify(h.store.read())===saved,'Fresh demo never overwrites the saved game');
  assert(!h.state().frameErrors.length,'Horse travel, region streaming and combat have no frame errors');
  return {checks,state:h.journey.state(),lastCrossing:h.state().lastCrossing,battle};
}

export function checkWatchIntro(h){
  const before=h.war.state().encounter.encounter;
  assert(before.presentation.introRemaining>0&&before.time===0,'Watch mode freezes soldiers for a preparation countdown');
  for(let i=0;i<30;i++)h.step(.04);
  assert(h.war.state().encounter.encounter.time===0,'Preparation countdown consumes no combat time');
  assert(Math.abs(h.state().camera.yaw)<.01&&h.state().camera.distance===15,'Watch camera faces the incoming soldiers');
  for(let i=0;i<30;i++)h.step(.04);
  const fight=h.war.state().encounter.encounter;
  assert(fight.presentation.speed===1&&fight.time>.4&&fight.time<2,'Watch combat runs at normal speed after a short preparation');
  assert(!fight.outcome,'Soldiers remain visible long enough to follow the opening');
  const label=h.state().rallyLabels[0];
  assert(label&&!label.sizeAttenuation&&label.scale[0]<=.2,'Rally label has a bounded screen size instead of growing toward the camera');
}
export function checkWatchResult(h){
  const before=h.war.state().encounter.encounter;
  assert(before?.outcome,'Local result is available for review');
  assert(before.guards.filter(g=>g.role==='runner').length===1&&before.guards.filter(g=>g.role==='escort').length===2,'Ovesos autoplay fights the runner and two escorts');
  assert(before.skill.counterTypes.thrust>0&&before.skill.counterTypes.sweep>0,'Autoplay responds to both thrusts and sweeps through normal combat');
  assert(h.state().rallyLabels.every(l=>!l.visible),'Rally label is hidden after combat');
  assert(h.state().fieldActors.filter(a=>a.visible).length===3,'Stopped soldiers remain on the ground during review');
  for(let i=0;i<20;i++)h.step(.04);
  assert(h.journey.state().stage==='review'&&h.state().mode==='skirmish','Autoplay briefly holds the interception result before the next choice');
}

export async function checkCampaignBriefing(h){
  await frames();
  assert(h.state().mode==='map'&&h.state().map.campaign.view==='geopolitical','The demonstration opens the geopolitical map before riding');
  assert(document.getElementById('world-demo-caption').textContent.includes('neutral Minora'),"Opening map explains the war and Teresod's role");
  assert(h.war.state().campaign.regions.ovesos.owner==='west','Opening map shows West holding Ovesos');
}

export async function checkRallyBriefing(h){
  await frames();const s=h.war.state();
  rallyCheckpoint={simulation:{...s.campaign,commands:s.campaign.commands.slice(0,-1)},fraction:s.clock.fraction,speed:1};
  assert(s.campaign.pending?.stage==='rally','Result offers the real second-stage encounter');
  assert(s.campaign.pending.rally.guards===3,'Full interception reduces the assault to three guards');
  assert(document.getElementById('encounter-dialog').open,'Regrouping opens the assault briefing');
  assert(document.getElementById('fight-attacker').hidden&&!document.getElementById('fight-defender').hidden,'Chosen faction is preserved in the second stage');
  assert(/full health/.test(document.getElementById('encounter-brief').textContent),'Briefing explains the health reset');
}
export function checkRallyFight(h){
  const e=h.war.state().encounter.encounter;
  assert(e?.stage==='rally'&&e.objective.type==='rally','Second fight uses the rally objective');
  assert(e.guards.length===3&&e.guards.every(g=>g.role==='soldier'),'Rally guards fight instead of running to escape');
  assert(h.state().rallyLabels.some(l=>l.visible),'Gold rally marker is visible from the player camera');
}
export async function checkRallyAftermath(h){
  h.resume();h.step(.04);await frames();
  const a=h.war.state().aftermath;
  assert(a.visible&&a.survivors.length>0,'Victorious surviving troops regroup at Ovesos');
  for(const [x,y,z] of a.survivors){const p=h.groundProbe(x,z);assert(p.clear&&Math.abs(p.height-y)<.02,'Survivor stands on clear ground');}
  assert(!h.state().frameErrors.length,'Two-stage battle and aftermath have no renderer errors');
  return {aftermath:a};
}

export async function checkRallyChoices(h){
  const winner=h.war.save({}),sentinel=JSON.stringify(h.store.read());
  const baseline=createWorldWar(rallyCheckpoint);baseline.advance(8-baseline.snapshot().day);
  h.war.restore(rallyCheckpoint);h.resume();h.step(.04);await frames();
  assert(h.war.state().campaign.pending?.stage==='rally','Returning to the battlefield offers the saved final assault');
  assert(document.getElementById('encounter-dialog').open,'Final assault offers its choice without finding a captain');
  assert(h.save().ok,'Can save at the choice between the two fights');
  const between=JSON.stringify(h.war.state().campaign);await h.loadSaved();
  assert(JSON.stringify(h.war.state().campaign)===between,'Continue restores the earned second opportunity without replaying interception');
  document.getElementById('encounter-return').click();h.step(.04);await frames();
  let b=h.war.state().campaign.engagements.find(b=>b.region==='ovesos');
  assert(b.rally.status==='available'&&b.heroResult.objective.blocked===12,'Declining the assault preserves all intercepted strength and leaves the phase available');
  const button=document.getElementById('world-war-join');
  assert(!button.hidden&&!button.disabled&&/Final assault/.test(button.textContent),'Stay out leaves a usable F choice while inside the battlefield');
  button.click();await frames();assert(h.war.state().campaign.pending?.stage==='rally','F can reopen the declined final assault');
  document.getElementById('encounter-return').click();h.step(.04);
  h.war.advance(8-h.war.state().campaign.day);b=h.war.state().campaign.engagements.find(b=>b.region==='ovesos');
  assert(b.status==='resolved'&&b.resolvedOn===8,'Leaving still lets the armies reach their ordinary deadline');
  assert(h.war.state().campaign.regions.ovesos.owner===baseline.snapshot().regions.ovesos.owner,'Declining neither grants victory nor rerolls the ordinary battle');
  h.war.restore(winner);h.resume();
  const data=JSON.parse(sentinel);assert(h.store.save(data.data).ok,'Restore the test save sentinel after branch checks');
  assert(!h.state().frameErrors.length,'Leave, save, Continue and decline paths have no renderer errors');
  return {checks};
}
