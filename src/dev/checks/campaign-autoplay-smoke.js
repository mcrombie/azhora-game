import {LOOKOUT_TOUR} from '../../content/regions/minora-frontier/lookout-tour.js';
const assert=(v,m)=>{if(!v)throw Error(m);};
const frame=()=>new Promise(r=>requestAnimationFrame(r));
let prior='',captures=0;const seen=new Set();
export async function next(a){
  const driver=a.campaignAutoplay;assert(driver,'The public autoplay launch constructed its driver');
  for(let i=0;i<30000;i++){
    const s=driver.state();seen.add(s.stage);
    if(!s.active){assert(s.stage==='complete','Autoplay stopped early: '+JSON.stringify(s)+' / '+JSON.stringify(a.state().position)+' / '+JSON.stringify({ground:a.groundProbe(a.state().position[0],a.state().position[2]),soldiers:a.war.state().soldiers.people,battles:a.war.state().campaign.engagements.filter(b=>b.status==='active')}));return {done:true,...s};}
    if(a.state().mode==='loading'||s.busy){await new Promise(r=>setTimeout(r,20));continue;}
    if(i%60===0)window.dispatchEvent(new Event('focus'));
    a.step(.04);if(i%60===59)await frame();
    const stamp=s.stage+':'+s.phases+':'+s.battles;
    if(['horse-lesson','fight','result','letter','river','politics','conclusion','east',...LOOKOUT_TOUR.map(p=>p.view)].includes(s.stage)&&stamp!==prior&&s.seconds>2){prior=stamp;captures++;await frame();return {done:false,...driver.state(),position:a.state().position,day:a.war.state().campaign.day,mode:a.state().mode};}
  }
  throw Error('Autoplay checkpoint timed out: '+JSON.stringify(driver.state()));
}
export function verify(a,side){
  const s=a.campaignAutoplay.state(),war=a.war.state().campaign;
  assert(s.stage==='complete'&&!s.active,'Full watchable run completes');
  assert(war.winner===side,'Chosen side won through real encounters');
  assert(s.phases>=4&&s.battles>=2,'Multiple battles and both phases were watched');
  assert(a.tower.state().concluded,'Taleth concluded the campaign at the lookout');
  assert(a.war.state().opportunity.kind==='complete','Live advice recognizes the completed campaign');
  assert(!a.war.state().guidance,'Completion clears the fulfilled return-to-Taleth marker');
  for(const view of ['river','politics','conclusion','east',...LOOKOUT_TOUR.map(p=>p.view)])assert(seen.has(view),'Autoplay visited '+view);
  assert(a.store.rehearsal,'The session cannot access the persistent save store');
  assert(!a.state().frameErrors.length,'No frame errors');
  return {side,captures,tour:[...seen].filter(v=>['river','politics','conclusion','east',...LOOKOUT_TOUR.map(p=>p.view)].includes(v)),driver:s,winner:war.winner,day:war.day,panorama:a.tower.state().panorama,render:a.renderStats()};
}
