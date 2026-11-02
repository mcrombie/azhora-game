const assert=(v,m)=>{if(!v)throw Error(m);};
const click=id=>document.getElementById(id).click();
const paint=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
let campaign;
export async function before(a){
  campaign=JSON.stringify(a.war.state().campaign);click('tower-close');a.openMap();await paint();
  assert(a.state().map.scope.names.length===5,'Unfinished campaign remains five regions');
  assert(!document.querySelector('.atlas-campaign-info [data-faction="ambron"]'),'Uncharted context stays hidden even with developer reveal');
  assert(!document.querySelector('#atlas-nomadic-presences button'),'No uncharted nomads leak');
  click('close-map');assert(a.tower.interact(),'Resume review');click('tower-next');click('tower-next');click('tower-close');
  assert(a.save().ok,'Save concluded review');await a.loadSaved();a.reveal(false);a.openMap();await paint();
  return {scope:a.state().map.scope.names.length};
}
export async function countries(a){
  assert(a.state().enabledRegions.length===5,'No new 3D regions loaded');
  for(const [region,owner] of [['Elagos','ambron'],['Feradom','feradom'],['Yunethre','laketown'],['East Ibenwood','ibenwood-elves'],['South Suval','izol'],['Eer','nylon'],['Gala','ascarth'],['Telemonia','telemonia'],['West Lotharn Mountains','lotharn-disputed']]){
    const p=document.querySelector(`#atlas-campaign-layer #region-tints [data-region="${region}"]`);assert(p?.dataset.owner===owner,region+' controller');
  }
  assert(document.querySelector('.atlas-country[data-faction="lotharn-disputed"]').getAttribute('fill').includes('hatch'),'Disputed mountains are visibly hatched');
  document.querySelector('.atlas-campaign-info [data-faction="ambron"]').click();await paint();
  const text=document.querySelector('.atlas-campaign-content').textContent;
  assert(text.includes('Kingdom of Ambron')&&text.includes('Feradom is a vassal')&&text.includes('Izol and Ambron are at war'),'Country inspector gives actual relationships');
  assert(JSON.stringify(a.war.state().campaign)===campaign,'Reference map does not alter the war');
  return {fiveRegions:true,campaignUnchanged:true,countries:a.state().map.campaign.countries};
}
export async function nomads(a){
  click('back-factions');document.querySelector('.atlas-campaign-info [data-presence="yunethre-centaurs"]').click();await paint();
  assert(document.querySelector('.atlas-campaign-content').textContent.includes('not a territorial claim'),'Centaur inspector distinguishes presence');
  document.querySelector('.atlas-campaign-content [data-region="Yunethre"]').click();await paint();
  const marker=document.querySelector('#atlas-nomadic-presences [data-presence="yunethre-centaurs"]');assert(marker&&!marker.hidden,'Nomadic marker is visible over Yunethre');
  marker.click();await paint();assert(document.querySelector('.atlas-campaign-content').textContent.includes('Centaurs of Yunethre'),'Marker opens its own inspector');
  assert(a.state().map.armies.markers.every(m=>m.id!=='yunethre-centaurs'),'Nomads are not campaign combat armies');
  return {presences:a.state().map.campaign.presences};
}
export async function stability(a){
  document.querySelector('[data-atlas-view="stability"]').click();await paint();assert(document.getElementById('atlas-nomadic-presences').hidden,'Presence markers follow geopolitical view');
  assert(document.querySelector('#atlas-campaign-layer #region-tints [data-region="Eer"]').getAttribute('fill')==='#be7970','Nylon siege appears as conflict');
  document.querySelector('[data-atlas-view="regions"]').click();await paint();assert(!document.querySelector('.atlas-campaign-info:not([hidden])'),'Regional map remains ordinary atlas');
  document.querySelector('[data-atlas-view="geopolitical"]').click();click('back-factions');click('atlas-fit');await paint();
  assert(!a.state().frameErrors.length,'No frame errors');return {errors:a.state().frameErrors};
}
