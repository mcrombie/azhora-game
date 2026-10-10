const assert=(v,m)=>{if(!v)throw Error(m);};
export function river(a){
  const s=a.state(),c=a.war.state().campaign;
  assert(a.store.rehearsal&&!a.campaignAutoplay,'Lookout preview uses temporary storage without an autoplay driver');
  assert(a.tower.state().room==='lookout'&&!a.tower.state().concluded,'Preview starts at the unfinished lookout');
  assert(c.winner&&c.engagements.every(b=>!b.heroResult),'The settled war contains no player battles');
  assert(s.mode==='briefing'&&s.panoramic&&!s.heroVisible,'First-person river dialogue opens automatically');
  assert(document.getElementById('tower-topic').textContent==='The river country','River comes first');
  return {winner:c.winner,day:c.day,regions:s.enabledRegions,panorama:a.tower.state().panorama};
}
export function east(a){
  document.getElementById('tower-next').click();
  assert(document.getElementById('tower-words').textContent.includes('left the fighting to the armies'),'Taleth accurately describes nonintervention');
  document.getElementById('tower-next').click();
  assert(a.tower.state().concluded,'River review concludes the campaign');
  document.getElementById('tower-next').click();
  assert(document.getElementById('tower-topic').textContent==='Beyond the Lizeem'&&a.state().cameraFov===45,'Next view is Ambron');
  return {view:document.getElementById('tower-topic').textContent};
}
export function complete(a){
  for(let i=0;i<10&&a.state().mode==='briefing';i++)document.getElementById('tower-next').click();
  assert(a.tower.state().concluded&&a.store.read().data.tower.concluded,'Completion saves only to the preview store');
  assert(a.state().heroVisible&&!a.state().panoramic,'Ordinary lookout control returns');
  assert(!a.state().frameErrors.length,'Preview has no frame errors');
  return {concluded:true,errors:a.state().frameErrors};
}

export async function paint(a){
  for(let i=0;i<25;i++)a.step(.04);
  a.renderStats();
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
}
