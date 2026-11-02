import {LOOKOUT_TOUR} from '../../content/regions/minora-frontier/lookout-tour.js';
import {createWorldWar} from '../../app/exploration/world-war.js';
const assert=(v,m)=>{if(!v)throw Error(m);};
const frame=()=>new Promise(r=>requestAnimationFrame(r));
let prior='',captures=0;const seen=new Set(),encounters=[],handoffs=new Set();
function resumeConversation(a){
  const driver=a.campaignAutoplay,stage=driver.state().stage;
  if(handoffs.has(stage)||!['horse-lesson','river','east',LOOKOUT_TOUR.at(-1).view].includes(stage))return;
  const before=JSON.stringify(a.war.state().campaign);
  driver.stop();
  if(stage==='horse-lesson'){
    document.getElementById('stable-next').click();
    assert(a.stable.owned&&!a.stable.mounted,'One Continue grants the horse without mounting it');
    assert(driver.resume()&&driver.state().stage==='travel','Manual reins handoff resumes toward the horse');
  }else{
    document.getElementById('tower-next').click();
    assert(driver.resume(),'A manually advanced Taleth page can resume');
    if(stage===LOOKOUT_TOUR.at(-1).view)assert(driver.state().stage==='complete'&&!driver.state().active,'Finishing the tour manually completes the rehearsal');
    else{
      assert(driver.state().stage===(stage==='river'?'politics':LOOKOUT_TOUR[0].view),'Resume follows the displayed page');
      driver.stop();document.getElementById('tower-previous').click();
      assert(driver.resume()&&driver.state().stage===stage,'Previous view restores its matching watch stage');
      driver.stop();document.getElementById('tower-close').click();
      assert(driver.resume()&&driver.state().stage==='panorama','Closing a view can resume without reopening it manually');
      a.step(.04);assert(driver.state().stage===stage,'Reopening preserves the same view');
    }
  }
  assert(JSON.stringify(a.war.state().campaign)===before,'Dialogue takeover does not alter battle history');handoffs.add(stage);
}
export async function next(a,{conversationResume=false}={}){
  const driver=a.campaignAutoplay;assert(driver,'The public autoplay launch constructed its driver');
  for(let i=0;i<30000;i++){
    const s=driver.state();seen.add(s.stage);
    if(s.stage==='letter'){
      const message=a.war.state().courier;
      assert(message.conversation&&message.telepathic&&!message.people.length,'Autoplay listens to Taleth\'s telepathic message without a messenger actor');
    }
    if(!s.active){assert(s.stage==='complete','Autoplay stopped early: '+JSON.stringify(s)+' / '+JSON.stringify(a.state().position)+' / '+JSON.stringify({ground:a.groundProbe(a.state().position[0],a.state().position[2]),soldiers:a.war.state().soldiers.people,battles:a.war.state().campaign.engagements.filter(b=>b.status==='active')}));return {done:true,...s};}
    if(a.state().mode==='loading'||s.busy){await new Promise(r=>setTimeout(r,20));continue;}
    if(i%60===0)window.dispatchEvent(new Event('focus'));
    a.step(.04);if(i%60===59)await frame();
    const stamp=s.stage+':'+s.phases+':'+s.battles;
    if(['horse-lesson','fight','result','letter','river','politics','conclusion','east',...LOOKOUT_TOUR.map(p=>p.view)].includes(s.stage)&&stamp!==prior&&s.seconds>2){
      prior=stamp;captures++;
      const w=a.war.state(),campaign=w.campaign;
      assert(JSON.stringify(createWorldWar({simulation:campaign,fraction:0,speed:1}).snapshot())===JSON.stringify(campaign),'Campaign and commander history replays exactly at '+stamp);
      if(s.stage==='fight'){
        const p=campaign.pending,field=w.encounter.encounter,b=campaign.engagements.find(b=>b.id===s.battleId);
        assert(campaign.day<b.endsOn,'Ordinary travel reaches the field before its deadline');
        if(p.stage==='rally')for(const [side,c] of Object.entries(p.commanders??{})){
          const actors=side===s.side?field.allies:field.guards,actor=actors.find(g=>g.commanderId===c.id);
          assert(c.status==='active'?!!actor&&!actor.routed&&actor.hp<=c.hp:!actor,'Only the actual active army captain enters this assault: '+c.name);
        }
        encounters.push({battle:b.id,region:b.region,phase:p.stage,day:campaign.day,endsOn:b.endsOn,secondsRemaining:(b.endsOn-campaign.day)*30-w.clock.fraction,commanders:p.commanders??{}});
      }
      if(s.stage==='letter')assert(!w.tracking?.finished,'Finished battlefield is no longer tracked');
      if(conversationResume)resumeConversation(a);
      await frame();return {done:false,...driver.state(),position:a.state().position,day:campaign.day,mode:a.state().mode};
    }
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
  assert(a.war.state().courier.telepathic&&a.war.state().courier.introduced&&!a.war.state().courier.delivery,'Taleth explained his voice and the latest news was acknowledged');
  assert(!a.state().frameErrors.length,'No frame errors');
  return {side,captures,encounters,handoffs:[...handoffs],tour:[...seen].filter(v=>['river','politics','conclusion','east',...LOOKOUT_TOUR.map(p=>p.view)].includes(v)),driver:s,winner:war.winner,day:war.day,panorama:a.tower.state().panorama,render:a.renderStats()};
}
