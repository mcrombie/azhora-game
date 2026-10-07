const frames=async(n=3)=>{for(let i=0;i<n;i++)await new Promise(requestAnimationFrame);};
export async function checkHearthfall(h){
  const checks=[],assert=(value,label)=>{if(!value)throw Error(label);checks.push(label);};
  assert(h.state().launch==='hearthfall'&&h.state().region===21,'Hearthfall starts inside Feradom');
  assert(h.state().enabledRegions.join()==='21','World builder is restricted to Feradom');
  assert(!h.war&&!window.__AZHORA__,'No war or adventure controller');
  const jobs=h.testWorld.loading.state().jobs;
  assert(jobs.length>0&&jobs.every(j=>j.regions.every(id=>id===21)),'All registered build jobs belong to Feradom');
  assert(jobs.every(j=>j.status==='ready'),'Feradom has completely loaded');
  assert(!await h.travelToRegion(16),'Travel to Minora is rejected');
  let refused=false;try{await h.testWorld.prepareRegion(16);}catch{refused=true;}assert(refused,'Direct preparation outside sandbox is rejected');
  assert(h.testWorld.loading.state().jobs.length===jobs.length,'Rejected travel adds no loading jobs');
  h.openDeveloper();assert(document.getElementById('developer-region').options.length===1,'Developer destination list contains Feradom only');h.resume();
  assert(h.selectMount('dragon').ok,'Developer dragon is available');
  const x0=h.state().position[0],z0=h.state().position[2];
  h.hold('Space',true);for(let i=0;i<10;i++)h.step(.04);h.hold('Space',false);
  h.hold('KeyW',true);h.hold('Tab',true);for(let i=0;i<300;i++)h.step(.04);h.hold('KeyW',false);h.hold('Tab',false);
  assert(h.state().region===21&&h.state().mode==='playing','Turbo flight stops at Feradom boundary without a loading screen');
  assert(Math.hypot(h.state().position[0]-x0,h.state().position[2]-z0)>10,'Boundary check exercised actual flight');
  assert(await h.travelToRegion(21),'Return to a safe Feradom arrival');
  assert(h.save().ok,'Sandbox checkpoint saves');const saved=h.store.read().data;
  assert(saved.format==='azhora-hearthfall-v1'&&saved.sandbox.settlements===null,'Save marks the integration as scaffold, not an installed settlement simulation');
  for(const key of ['azhora-exploration-v1','azhora-lizeem-world-v3','azhora-road-checkpoint-v1']){
    let blocked=false;try{window.azhoraExplorationStorage.setItem(key,'{"sentinel":true}');}catch{blocked=true;}assert(blocked,'Desktop blocks Hearthfall writes to '+key);
  }
  h.openMap();await frames();assert(h.state().map.campaign.knownRegions.includes('Feradom'),'Feradom appears on the working atlas');h.resume();
  const resources=performance.getEntriesByType('resource').map(r=>new URL(r.name).pathname);
  assert(!resources.some(p=>/settlement-service|generation-client|\/auth\.js|world-war-host\.js/.test(p)),'No cloud publishing or campaign host loaded');
  assert((await fetch('/reference-private/unavailable.txt')).status===403,'Private manuscripts remain unserved');
  assert(!h.state().frameErrors.length,'No rendering errors');await frames(8);
  return {checks,saved,readyMs:h.state().readyMs,jobs:jobs.map(j=>({id:j.id,regions:j.regions,status:j.status}))};
}
