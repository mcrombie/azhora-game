import {explorationMovement} from '../../app/exploration/movement.js';

const frames=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
const checks=[];
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
  assert(tiles.length===41&&tiles.filter(j=>j.status==='ready').length<tiles.length/2,'Ovesos becomes ready without constructing the whole Telemonia ground');
  assert(jobs.find(j=>j.id==='telemoniaGround-55').status!=='ready','Telemonia interior remains deferred after the Ovesos ride');
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
  assert(battle.status==='resolved'&&state.campaign.day===8,'Ovesos territorial result resolves at its normal deadline');
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
  assert(h.journey.state().stage==='review'&&h.state().mode==='skirmish','Autoplay briefly holds the result before showing the campaign map');
}

export async function checkCampaignBriefing(h){
  await frames();
  assert(h.state().mode==='map'&&h.state().map.campaign.view==='geopolitical','The demonstration opens the geopolitical map before riding');
  assert(document.getElementById('world-demo-caption').textContent.includes('neutral Minora'),"Opening map explains the war and Teresod's role");
  assert(h.war.state().campaign.regions.ovesos.owner==='west','Opening map shows West holding Ovesos');
}
