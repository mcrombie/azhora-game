const assert=(v,m)=>{if(!v)throw Error(m);};
export async function ready(a){
  window.dispatchEvent(new Event('focus'));
  for(let i=0;i<1000&&a.campaignAutoplay.state().stage!=='intro';i++)a.step(.04);
  assert(a.campaignAutoplay.state().stage==='intro'&&a.state().mode==='briefing','Watch reaches the actual Taleth dialogue');
  assert(!document.getElementById('world-autoplay').hidden,'Takeover control is visible during dialogue');
  window.dispatchEvent(new Event('blur'));
  const before=a.campaignAutoplay.state().total;
  for(let i=0;i<300;i++)a.step(.04);
  assert(a.campaignAutoplay.state().total===before,'Background window does not advance the rehearsal');
  assert(document.getElementById('world-autoplay').textContent.includes('Return to this window'),'Focus pause explains why autoplay is waiting');
  window.dispatchEvent(new Event('focus'));
  assert(document.getElementById('world-autoplay').textContent.includes('Stop (P)'),'Returning restores the current watch instruction');
  window.dispatchEvent(new Event('blur'));
}
export function verify(a){
  assert(!a.campaignAutoplay.state().active,'Native P stopped autoplay even while dialogue owns input');
  const day=a.war.state().campaign.day;
  window.dispatchEvent(new Event('focus'));for(let i=0;i<300;i++)a.step(.04);
  assert(!a.campaignAutoplay.state().active&&a.war.state().campaign.day===day,'Takeover does not restart or advance the campaign');
  document.getElementById('tower-close').click();
  assert(a.save().ok&&a.store.rehearsal&&a.store.read().data,'Taking control can save only to the rehearsal store');
  assert(!document.getElementById('world-autoplay').hidden&&document.getElementById('world-autoplay').textContent.includes('Resume autoplay'),'Takeover leaves an explicit resume control');
  return {driver:a.campaignAutoplay.state(),rehearsal:a.store.rehearsal,errors:a.state().frameErrors};
}

export function paused(a){
  assert(!a.campaignAutoplay.state().active&&a.campaignAutoplay.state().canResume,'Native P pauses without losing the rehearsal');
  assert(document.getElementById('world-autoplay').textContent.includes('Resume autoplay'),'Resume remains visible over the dialogue');
}
export function resumed(a){
  assert(a.campaignAutoplay.state().active&&!a.campaignAutoplay.state().canResume,'Native P resumes the same rehearsal');
  assert(a.campaignAutoplay.state().stage==='intro'&&a.state().mode==='briefing','Resume retains the Taleth dialogue');
}
