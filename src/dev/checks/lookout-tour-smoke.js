import {LOOKOUT_CHART_REGIONS} from '../../app/exploration/lookout-chart.js';
import {LOOKOUT_TOUR} from '../../content/regions/minora-frontier/lookout-tour.js';
const assert=(v,m)=>{if(!v)throw Error(m);};
const click=id=>document.getElementById(id).click();
let campaign,buildMs,hash;
export const regionCount=()=>LOOKOUT_TOUR.length;
export async function chart(a,concluded){
  const visits=JSON.stringify(a.state().cells);a.openMap();
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  const s=a.state();assert(s.map.scope.names.length===(concluded?5+LOOKOUT_CHART_REGIONS.length:5),'Map scope matches completion');
  assert(s.enabledRegions.length===5,'Chart does not load more playable regions');
  if(concluded)for(const name of LOOKOUT_CHART_REGIONS){assert(s.map.campaign.knownRegions.includes(name),'Political chart reveals '+name);assert(s.map.chart.labels.includes(name),'Atlas names '+name);}
  if(concluded){
    const coverage=a.tower.state().panorama.regions.map(r=>r.name).filter(name=>name!=='Urubond');
    assert(coverage.length===s.map.scope.names.length&&coverage.every(name=>s.map.scope.names.includes(name)),'Chart covers the same surrounding regions as the loaded lookout scenery');
    for(const name of ['Gala','Oves Desert','Nether Desert','Meneth','Vastos','Moros Plain'])assert(s.map.campaign.knownRegions.includes(name),'Missing landscape is now charted: '+name);
  }
  assert(!s.map.scope.names.includes('Urubond'),'Secret island stays outside the chart');
  assert(JSON.stringify(a.state().cells)===visits,'Chart does not invent visits');
  assert(JSON.stringify(a.war.state().campaign)===campaign,'Chart does not change the campaign');
  return {chart:concluded?'expanded':'five regions',scope:s.map.scope.names,known:s.map.campaign.knownRegions,visits:s.cells.length};
}
export async function chartBefore(a){click('tower-close');return chart(a,false);}
export function returnToReview(a){click('close-map');assert(a.tower.interact(),'Return to Taleth');}
export async function chartAfter(a){click('tower-close');a.reveal(false);return chart(a,true);}
export function resumeTour(a){click('close-map');a.reveal(true);assert(a.tower.interact(),'Resume Taleth tour');}
async function capture(a,view){
  for(let i=0;i<475;i++)a.step(.04);
  a.renderStats();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  const s=a.state(),p=a.tower.state().panorama,t=a.tower.lookoutState();
  assert(t.view===view&&s.panoramic&&!s.heroVisible,'Correct unobstructed view: '+view);
  assert(s.enabledRegions.length===5,'Tour leaves five-region gameplay intact');
  assert(p.buildMs===buildMs&&p.sourceHash===hash,'Every view reuses the same scenery');
  assert(JSON.stringify(a.war.state().campaign)===campaign,'Tour leaves recorded campaign unchanged');
  assert(!s.frameErrors.length,'No tour frame errors');
  return {view,title:document.getElementById('tower-topic').textContent,page:document.getElementById('tower-page').textContent,camera:s.cameraPosition,fov:s.cameraFov,render:a.renderStats()};
}
export async function river(a){
  campaign=JSON.stringify(a.war.state().campaign);const p=a.tower.state().panorama;buildMs=p.buildMs;hash=p.sourceHash;
  assert(!a.tower.state().concluded,'Tour begins before conclusion');return capture(a,'river');
}
export async function impact(a){click('tower-next');assert(/left the fighting/.test(document.getElementById('tower-words').textContent),'Recorded campaign review remains');return capture(a,'river');}
export async function ambron(a){
  click('tower-next');assert(a.tower.state().concluded&&a.store.read().data.tower.concluded,'Campaign concludes before the optional tour');
  assert(a.tower.lookoutState().menu,'Conclusion offers optional activities');
  click('tower-close');assert(a.state().mode==='playing','Tour can be skipped');
  assert(a.save().ok,'Skipping the tour keeps completion');await a.loadSaved();
  assert(a.tower.state().concluded,'Skipped-tour conclusion survives Continue');
  assert(a.tower.interact(),'Taleth remains available');click('tower-next');return capture(a,'east');
}
export async function region(a,index){click('tower-next');return capture(a,LOOKOUT_TOUR[index].view);}
export async function navigation(a){
  assert(a.tower.state().concluded,'Optional tour does not gate campaign completion');
  click('tower-previous');assert(a.tower.lookoutState().view==='yunethre','Previous returns to actual previous region');
  click('tower-close');assert(!a.state().panoramic&&a.state().heroVisible,'Closing restores free rooftop control');
  assert(a.tower.interact(),'Talk again from the actual Taleth position');
  assert(a.tower.lookoutState().view==='yunethre','Interrupted conversation resumes its view');
  click('tower-next');assert(a.tower.lookoutState().view==='west-lotharn','Last view restored');
  assert(document.getElementById('tower-next').textContent.includes('Finish'),'The optional tour finishes separately');
  return capture(a,'west-lotharn');
}
export function compact(a){
  a.renderStats();const checks=[];
  for(const id of ['tower-previous','tower-next','tower-close']){
    const e=document.getElementById(id),r=e.getBoundingClientRect();
    assert(r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight,'Action stays inside compact screen: '+id);
    assert(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===e,'Action remains reachable: '+id);checks.push(id);
  }
  return {width:innerWidth,height:innerHeight,checks};
}
export async function complete(a){
  click('tower-next');assert(a.tower.state().concluded&&a.store.read().data.tower.concluded,'Final confirmation saves conclusion');
  assert(!a.state().panoramic&&a.state().heroVisible,'Conclusion restores ordinary movement');
  assert(JSON.stringify(a.war.state().campaign)===campaign,'No wider campaign was started');
  assert(a.save().ok,'Concluded lookout saves');await a.loadSaved();
  assert(a.tower.state().concluded,'Continue keeps the conclusion');
  assert(a.tower.interact()&&a.tower.lookoutState().menu,'Completed campaign offers the optional tour again');
  assert(!a.state().frameErrors.length,'No saved-tour frame errors');return {concluded:true,pages:a.tower.lookoutState().pages,errors:a.state().frameErrors};
}

export async function quickChart(a){
  campaign=JSON.stringify(a.war.state().campaign);
  const pre=await chartBefore(a);returnToReview(a);
  click('tower-next');click('tower-next');
  assert(a.tower.state().concluded,'Explicit campaign completion charts the surroundings');
  click('tower-close');assert(a.save().ok,'Completion saves');await a.loadSaved();
  a.reveal(false);const post=await chart(a,true);
  assert(a.state().map.campaign.knownRegions.length===5+LOOKOUT_CHART_REGIONS.length,'All supplied map knowledge survives without developer reveal');
  const target=document.querySelector('.atlas-campaign-info button[data-faction="charted:Telemonia"]');assert(target,'Charted region can be inspected');target.click();
  assert(document.querySelector('.atlas-campaign-content').textContent.includes('outside the five playable'),'Surrounding region explains its scope');
  document.querySelector('[data-atlas-view="stability"]').click();
  assert(a.state().map.campaign.knownRegions.includes('Telemonia'),'Stability layer retains chart knowledge');
  document.querySelector('[data-atlas-view="regions"]').click();
  assert(a.state().map.chart.labels.includes('Telemonia'),'Regional atlas retains chart names');
  document.querySelector('[data-atlas-view="geopolitical"]').click();
  click('back-factions');await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  return {pre,post,visitsUnchanged:true,campaignUnchanged:true};
}
