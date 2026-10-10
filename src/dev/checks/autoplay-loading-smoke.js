const assert=(ok,message)=>{if(!ok)throw Error(message);};
const pause=()=>new Promise(resolve=>setTimeout(resolve,20));
// Observe the actual asynchronous doorway, then let the native host press P.
export async function waitForDoor(a){
  const deadline=performance.now()+90000;
  while(performance.now()<deadline){
    if(a.campaignAutoplay.state().stage==='door'&&a.state().mode==='loading')return;
    assert(a.campaignAutoplay.state().active,'Autoplay remains active until the doorway');await pause();
  }
  throw Error('Doorway transition was not observed');
}
export async function outsidePaused(a){
  const deadline=performance.now()+180000;
  while(a.state().mode==='loading'&&performance.now()<deadline)await pause();
  const driver=a.campaignAutoplay.state();
  assert(!driver.active&&driver.canResume&&driver.stage==='door','Native P during loading preserves the pending doorway step');
  assert(a.state().mode==='playing'&&!a.tower.state().inside,'Exterior finishes loading despite the paused rehearsal');
  const before=JSON.stringify(a.state().position),day=a.war.state().campaign.day;
  await new Promise(resolve=>setTimeout(resolve,1200));
  assert(JSON.stringify(a.state().position)===before&&a.war.state().campaign.day===day,'Paused hero and campaign remain still outside');
  assert(!document.getElementById('world-autoplay').hidden,'Resume is visible at the original reported stopping place');
  const watch=document.getElementById('world-autoplay').getBoundingClientRect(),help=document.getElementById('exploration-help').getBoundingClientRect(),prompt=document.getElementById('tower-interact').getBoundingClientRect();
  if(innerWidth>960)assert(prompt.bottom<=help.top&&help.bottom<=watch.top,'Interaction, movement instructions and autoplay occupy separate desktop rows');
  return {driver,day,position:a.state().position,errors:a.state().frameErrors};
}
