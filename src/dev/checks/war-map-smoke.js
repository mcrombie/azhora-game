const frames=async(n=3)=>{for(let i=0;i<n;i++)await new Promise(requestAnimationFrame);};
export async function checkWarMap(h){
  const checks=[],assert=(v,label)=>{if(!v)throw Error(label);checks.push(label);console.log('EXPLORATION_CHECK '+label);};
  const $=id=>document.getElementById(id);
  h.war.restore(null);h.reveal(true);h.war.advance(4);await frames();
  assert($('world-war-report-title').textContent==='West Lizeem on the march','Remote march report announces approaching West army');
  assert($('world-war-report-detail').textContent.includes('Expected day 9 (5 days away)'),'Advance report gives actual destination and arrival estimate');
  $('world-war-report-map').click();await frames(6);
  assert(h.state().map.armies.selected===2&&!$('atlas-army-detail').hidden,'Report opens map focused on reported army');
  assert($('atlas-army-detail').textContent.includes('56 strength'),'Inspector shows existing simulated strength');
  assert(h.state().map.armies.route&&!!document.querySelector('#atlas-armies line'),'Selected army alone displays its route');
  for(const view of ['regions','geopolitical','stability']){
    document.querySelector(`[data-atlas-view="${view}"]`).click();await frames();
    assert(!!document.querySelector('[data-army-id="2"]'),`Army marker remains visible in ${view} view`);
  }
  const x=document.querySelector('[data-army-id="2"]').style.left;
  h.war.advance();await frames();
  assert($('atlas-army-detail').textContent.includes('4 days away'),'Selected arrival estimate updates as campaign advances');
  assert(document.querySelector('[data-army-id="2"]').style.left!==x,'Army marker advances with daily march progress');
  h.reveal(false);await frames();
  assert(!h.state().map.armies.markers.length&&$('atlas-army-detail').hidden&&!document.querySelector('#atlas-armies line'),'Turning reveal off removes unknown armies, selected details and routes');
  h.resume();await frames();assert($('world-war-report').hidden,'Unknown armies and battles do not leak through reports');
  h.reveal(true);h.war.restore(null);h.war.advance(4);await frames();
  $('world-war-report-map').click();await frames(6);
  $('atlas-army-detail').querySelector('button').click();await frames();
  assert($('atlas-army-detail').hidden&&!document.querySelector('#atlas-armies line'),'Closing inspector removes route clutter');
  document.querySelector('[data-army-id="2"]').click();await frames();
  assert(!$('atlas-army-detail').hidden,'Map marker can reopen its inspector');
  document.querySelector('[data-atlas-view="geopolitical"]').click();await frames();
  return {checks,armies:h.state().map.armies,day:h.war.state().campaign.day};
}

export async function checkWarTracking(h){
  const checks=[],assert=(v,label)=>{if(!v)throw Error(label);checks.push(label);console.log('EXPLORATION_CHECK '+label);};
  const $=id=>document.getElementById(id),state=()=>h.war.state().tracking;
  h.war.restore(null);h.reveal(true);h.war.advance(4);h.resume();await frames();
  $('world-war-report-map').click();await frames(6);$('atlas-track-army').click();await frames();
  assert(state()?.target.kind==='army'&&state().target.id===2,'Army inspector tracks the selected army');
  assert($('atlas-track-army').textContent==='Stop tracking','Map tracking action reflects selection');
  assert($('world-war-track').hidden,'Exploration tracker stays hidden while map is open');
  h.resume();await frames();
  assert(!$('world-war-track').hidden&&$('world-war-track').textContent.includes('Expected day 9'),'Returning to exploration shows army arrival estimate');
  assert($('world-war-track').textContent.includes('direct')&&!document.querySelector('.war-track-arrow').hidden,'Exploration tracker shows distance and camera-relative direction');
  const oldLocation=state().location;h.war.advance();await frames();
  assert(state().location.x!==oldLocation.x||state().location.z!==oldLocation.z,'Army waypoint moves as campaign advances');
  h.reveal(false);await frames();
  assert(state().location===null&&document.querySelector('.war-track-arrow').hidden,'Unknown target loses guidance without leaking its latest position');
  assert(!$('world-war-track').textContent.includes('day 9'),'Hidden target does not expose arrival date');
  h.reveal(true);await frames();assert(!!state().location,'Restoring discovery restores guidance');
  h.war.advance(4);await frames();
  assert(state().target.kind==='battle'&&state().label==='Battle at Caricas','Tracked army automatically hands off to discovered battlefield');
  assert(state().detail.includes('before day 12'),'Battle guidance gives intervention deadline');
  h.war.advance(3);await frames();
  assert(!state().location&&state().detail.includes('Battle ended'),'Expired battle stops directional guidance');
  $('world-war-track').querySelector('button').click();await frames();assert(!state()&&$('world-war-track').hidden,'Stop removes tracking');
  h.war.restore(null);h.war.advance(10);h.openMap();await frames();
  const battle=h.war.state().campaign.engagements.find(b=>b.region==='caricas');
  const button=[...$('world-war-battles').children].find(b=>b.textContent.includes('Caricas'));button.click();await frames();
  assert(state()?.target.id===battle.id,'Battle list Track action selects the actual battlefield');
  h.resume();await frames();
  h.war.restore(null);assert(!state(),'Starting or restoring a campaign clears the session waypoint');
  h.war.advance(10);h.openMap();await frames();
  [...$('world-war-battles').children].find(b=>b.textContent.includes('Caricas')).click();await frames();
  const marker=document.querySelector(`[data-battle-id="${h.war.state().tracking.target.id}"]`);marker.click();await frames();
  assert(!state(),'Battle map marker can stop tracking');
  document.querySelector(`[data-battle-id="${battle.id}"]`).click();h.resume();await frames();
  return {checks,tracking:state(),frameErrors:h.state().frameErrors};
}
