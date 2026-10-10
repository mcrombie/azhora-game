import {next} from './campaign-autoplay-smoke.js';
const assert=(ok,message)=>{if(!ok)throw Error(message);};
export async function ready(a){
  for(let i=0;i<12;i++){
    const at=await next(a);
    if(at.stage!=='result')continue;
    window.dispatchEvent(new Event('blur'));
    assert(document.getElementById('battle-result-dialog')?.open,'The real interception result is modal');
    assert(a.campaignAutoplay.state().active,'Autoplay is running at the result');return;
  }
  throw Error('No interception result reached');
}
export function paused(a){
  assert(!a.campaignAutoplay.state().active&&a.campaignAutoplay.state().canResume,'P pauses autoplay through the modal input trap');
  const phase=a.campaignAutoplay.state().phases,day=a.war.state().campaign.day;
  for(let i=0;i<300;i++)a.step(.04);
  assert(a.war.state().campaign.day===day&&a.campaignAutoplay.state().phases===phase,'Paused result does not auto-continue');
  const button=document.getElementById('world-autoplay');
  assert(button.closest('dialog')?.open&&!button.hidden&&button.textContent.includes('Resume autoplay'),'Resume is accessible inside the modal');
}
export function resumed(a){assert(a.campaignAutoplay.state().active&&a.campaignAutoplay.state().stage==='result','P resumes the result countdown');}
export async function continued(a){
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  assert(!a.campaignAutoplay.state().active,'Manually pressing Enter takes control before the modal consumes the key');
  assert(a.state().mode==='encounter'&&a.war.state().campaign.pending?.stage==='rally','Manual Continue opens the final assault briefing exactly once');
  const campaign=JSON.stringify(a.war.state().campaign);
  for(let i=0;i<300;i++)a.step(.04);
  assert(JSON.stringify(a.war.state().campaign)===campaign,'Driver cannot finish or decline the next briefing behind the player');
  assert(!a.state().frameErrors.length,'Modal handoff has no frame errors');
  return {stage:a.campaignAutoplay.state().stage,day:a.war.state().campaign.day,mode:a.state().mode,errors:a.state().frameErrors};
}

export function layout(){
  const dialog=document.getElementById('battle-result-dialog'),control=document.getElementById('world-autoplay'),primary=document.getElementById('world-skirmish-continue');
  const box=dialog.getBoundingClientRect(),button=primary.getBoundingClientRect(),watch=control.getBoundingClientRect();
  const at=(node,r)=>node.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));
  const result={width:innerWidth,height:innerHeight,dialog:{top:box.top,bottom:box.bottom},continueVisible:button.top>=0&&button.bottom<=innerHeight&&at(primary,button),watchVisible:watch.top>=0&&watch.bottom<=innerHeight&&at(control,watch),overlap:button.left<watch.right&&button.right>watch.left&&button.top<watch.bottom&&button.bottom>watch.top};
  assert(result.continueVisible&&result.watchVisible&&!result.overlap,'Result controls remain separate and clickable: '+JSON.stringify(result));return result;
}

export function resumedBriefing(a){
  const s=a.campaignAutoplay.state();assert(s.active&&s.stage==='brief','Resume picks up the final assault after a manual Continue');
  for(let i=0;i<25;i++)a.step(.04);
  assert(a.state().mode==='encounter','Resuming still gives time to read the briefing');
  a.campaignAutoplay.stop();return {stage:s.stage,mode:a.state().mode,errors:a.state().frameErrors};
}

export async function finalResult(a){
  assert(a.campaignAutoplay.resume(),'Resume the paused assault briefing');
  for(let i=0;i<12;i++){
    const at=await next(a);
    if(at.stage!=='result'||at.phases<2)continue;
    window.dispatchEvent(new Event('blur'));
    assert(document.getElementById('battle-result-dialog')?.open,'Final assault result is modal');
    assert(a.war.state().encounter.encounter.stage==='rally','Manual handoff is tested on the final assault');return;
  }
  throw Error('No final assault result reached');
}
export function finalContinued(a){
  assert(!a.campaignAutoplay.state().active&&a.campaignAutoplay.state().canResume,'Native Continue hands the final result to the player');
  assert(a.state().mode==='playing'&&!a.war.state().campaign.pending,'Final Continue returns to exploration');
  const battle=a.war.state().campaign.engagements.find(b=>b.id===a.campaignAutoplay.state().battleId);
  assert(battle.status==='resolved','Final Continue records the battle exactly once');
  return {day:a.war.state().campaign.day,battle:battle.id,commands:a.war.state().campaign.commands.length};
}
export function resumedCampaign(a){
  const driver=a.campaignAutoplay,before=JSON.stringify(a.war.state().campaign),battles=driver.state().battles;
  assert(driver.state().active&&driver.state().stage==='letter-wait','Resume continues beyond the acknowledged final result');
  assert(battles===1,'The manually acknowledged battle counts once');
  driver.stop();assert(driver.resume(),'A second pause and resume remains available');
  assert(driver.state().battles===battles&&JSON.stringify(a.war.state().campaign)===before,'Repeated resume cannot duplicate battle accounting');
  window.dispatchEvent(new Event('focus'));
  for(let i=0;i<110;i++)a.step(.04);
  assert(driver.state().stage==='letter'&&!document.getElementById('taleth-letter-dialog').hidden,'Resumed campaign reaches Taleth\'s real letter');
  driver.stop();document.getElementById('taleth-letter-close').click();
  assert(!a.state().frameErrors.length,'Final-result handoff has no frame errors');
  return {stage:driver.state().stage,battles,day:a.war.state().campaign.day,errors:a.state().frameErrors};
}

export async function legacyResult(a){
  // The campaign handoff above now completes Caricas. Give the independent
  // older driver its own open-field fixture instead of replaying a closed battle.
  if(!a.war.state().campaign.engagements.some(b=>b.region==='caricas'&&b.status==='active'))await (await import('./afterlife-smoke.js')).setup(a);
  a.autoplay.start();window.dispatchEvent(new Event('focus'));
  for(let i=0;i<6000;i++){
    a.step(.04);
    if(a.war.state().encounter?.encounter?.outcome){
      window.dispatchEvent(new Event('blur'));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      assert(a.autoplay.state().active,'Caricas driver remains active at its result');
      assert(document.getElementById('world-autoplay').closest('dialog')?.open,'Legacy Stop control is inside the native result dialog');return;
    }
    if(i%60===59)await new Promise(r=>requestAnimationFrame(r));
  }
  throw Error('Caricas final assault did not reach its result');
}
export function legacyStopped(a){
  assert(!a.autoplay.state().active&&!a.campaignAutoplay.state().active,'P stops the active Caricas driver instead of resuming a paused campaign driver');
  assert(document.getElementById('battle-result-dialog').open,'Stopping does not dismiss or resolve the battle result');
  assert(!a.state().frameErrors.length,'Legacy result takeover has no frame errors');
}
