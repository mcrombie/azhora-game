import {TOWER_DOOR,TOWER_EXIT,TALETH_SPOT,LOOKOUT_TALETH} from '../../app/exploration/tower-state.js';
import {MINORA_STABLE as STABLE} from '../../content/regions/minora-frontier/minora-stable.js';
import {WORLD_WAR_KEY,validateWorldWarSave} from '../../app/exploration/war-checkpoint.js';
import {availableBattleStage} from '../../simulation/battle-stages.js';
import {driveWorldEncounter,clearCombatKeys} from './encounter-controls.js';
import {confirmTowerCampaign} from './tower-smoke.js';

// Isolated desktop smoke profile only. Travel uses the debug visit hook; every
// battle uses normal movement, strike and dodge inputs against ordinary AI.
const checks=[];
const assert=(value,label)=>{if(!value)throw Error(label);checks.push(label);console.log('EXPLORATION_CHECK '+label);};
const close=(a,b)=>Math.abs(a-b)<1e-7;
const clock=a=>a.war.clock();
const campaign=a=>a.war.state().campaign;
const combat=a=>a.war.state().encounter.encounter;
const key=code=>{for(const type of ['keydown','keyup'])document.dispatchEvent(new KeyboardEvent(type,{code,bubbles:true,cancelable:true}));};
const click=id=>{const button=document.getElementById(id);assert(button&&!button.disabled,'Available control: '+id);button.click();};
const tick=(a,count=40)=>{for(let i=0;i<count;i++)a.step(.04);};
const refresh=a=>{a.step(0);a.openingTime.update(true);};
const frame=()=>new Promise(requestAnimationFrame);
const move=a=>{a.hold('KeyS',true);a.step(.04,0);a.hold('KeyS',false);};
let opening,stable,otherSaves;
const otherKeys=['azhora-exploration-v1','azhora-lizeem-world-v1','azhora-lizeem-world-v2','azhora-hearthfall-v1'];
const storage=()=>otherKeys.map(key=>window.azhoraExplorationStorage.getItem(key));

async function until(predicate,label,timeout=300000){
  const end=performance.now()+timeout;
  while(!predicate()&&performance.now()<end)await new Promise(resolve=>setTimeout(resolve,50));
  assert(predicate(),label);
}
function held(a,label){
  const before=clock(a);tick(a);
  assert(close(clock(a).elapsedSeconds,before.elapsedSeconds),label+' holds exact adventure time');
  assert(close(a.dayNight.state().hour,before.hour),label+' holds the linked sky');
}
function checkpoint(a){
  assert(a.save().ok,'Full campaign checkpoint saves');
  const saved=a.store.read().data;
  assert(saved?.fullCampaign===true&&saved.sharedOpening===2&&validateWorldWarSave(saved),'Full campaign checkpoint validates with elapsed timestamps');
  return structuredClone(saved);
}
async function restore(a,saved){
  assert(a.store.save(structuredClone(saved)).ok,'Isolated full campaign checkpoint accepted');
  await a.loadSaved();a.resume();window.dispatchEvent(new Event('focus'));refresh(a);
}

export async function prepare(a,loadingTimeout=300000){
  window.dispatchEvent(new Event('focus'));otherSaves=storage();
  assert(a.openingTime&&clock(a).fullCampaign&&clock(a).sharedOpening,'Full campaign selects the shared adventure clock');
  assert(a.tower.state().inside&&!a.tower.state().briefed&&close(clock(a).elapsedSeconds,0)&&close(clock(a).hour,6),'Fresh campaign begins in the timeless tower at dawn');
  await a.visit({x:TALETH_SPOT.x,z:TALETH_SPOT.z+2});key('KeyF');
  assert(a.state().mode==='briefing','Ordinary F opens the introductory Taleth conversation');held(a,'Taleth introduction');
  confirmTowerCampaign(a);move(a);held(a,'Walking inside the tower');
  await a.visit({...TOWER_DOOR,z:TOWER_DOOR.z-1});key('KeyF');
  await until(()=>a.state().mode==='playing'&&!a.tower.state().inside,'The real tower door loads Minora',loadingTimeout);
  assert(clock(a).periodLabel==='first light'&&a.dayNight.state().visibleCelestials.sun,'First departure reveals dawn');
  stable=[{x:-2433.5,z:77},{x:-2444,z:73},{x:-2443,z:65},{x:-2427,z:77}].find(p=>{const probe=a.groundProbe(p.x,p.z);return probe.clear&&probe.height>=probe.water;});
  assert(stable,'The stable has dry clear waiting ground');a.war.pause();
  await a.visit({x:STABLE.bear.x+1,z:STABLE.bear.z-2.5});key('KeyF');
  assert(a.state().mode==='briefing'&&!document.getElementById('stable-lesson').hidden,'Bear offers the real starting horse lesson');held(a,'Bear conversation');
  click('stable-next');assert(a.stable.owned,'The lesson gives the starting horse');
  await a.visit({x:a.stable.state().horse.x+1.5,z:a.stable.state().horse.z});key('KeyG');
  assert(a.stable.mounted,'G mounts the starting horse');key('KeyG');
  assert(!a.stable.mounted&&a.state().grounded,'G dismounts onto clear ground');
  await a.visit(stable);a.war.run();move(a);a.openMap();held(a,'Map reading');a.resume();
  const resumed=clock(a).elapsedSeconds;tick(a);assert(clock(a).elapsedSeconds>resumed&&!clock(a).heldReason,'Closing the map resumes the campaign while stationary');a.war.pause();
  opening=checkpoint(a);const elapsed=clock(a).elapsedSeconds;await restore(a,opening);
  assert(close(clock(a).elapsedSeconds,elapsed)&&close(a.dayNight.state().hour,clock(a).hour),'Saving and restoring preserves exact elapsed time and daylight');
  return {checks:[...checks],clock:clock(a),position:a.state().position,render:a.renderStats()};
}

async function fight(a,side,battle,index){
  a.war.pause();await a.visit(battle.location);refresh(a);
  if(a.state().mode!=='encounter')assert(a.war.join(battle.id).ok,'Enter actual battlefield '+battle.region);
  assert(campaign(a).pending?.battleId===battle.id||campaign(a).pending?.id===battle.id,'Battle entry uses the chosen army');
  const at=clock(a).elapsedSeconds,phases=[];
  for(let phase=0;phase<3&&campaign(a).pending;phase++){
    const pending=campaign(a).pending;
    const method=index===0&&side==='west'&&phase===0?'duel':pending.stage==='rally'?undefined:'intercept';
    if(method==='duel'){
      const choice=document.getElementById('encounter-opening');
      assert(choice&&!choice.hidden,'The first battle offers its champion duel');
      choice.value='duel';choice.dispatchEvent(new Event('change'));
      const button=pending.attacker===side?'fight-attacker':'fight-defender';click(button);
      assert(/Serevan Dain/.test(document.getElementById('encounter-title').textContent),'The first challenge identifies the opposing army captain');
      assert(/assault|allies/.test(document.getElementById('encounter-brief').textContent),'The challenge explains that an allied assault follows');
      held(a,'Champion invitation');click(button);
      await until(()=>a.state().mode==='skirmish','Accepting the challenge starts the duel',30000);
    }else await a.war.help(side,method);
    assert(a.state().mode==='skirmish',side+' starts '+(method??'allied assault')+' at '+battle.region);
    let steps=0;
    for(;steps<9000&&!combat(a)?.outcome&&a.state().mode==='skirmish';steps++){
      driveWorldEncounter(a,combat(a));a.step(1/60);
      if(steps%120===119)await frame();
    }
    clearCombatKeys(a);const result=combat(a);
    assert(result?.outcome==='success','Ordinary inputs win '+side+' phase '+phase+' at '+battle.region);
    assert(document.getElementById('battle-result-dialog')?.matches(':modal'),'Battle result is a centered modal');held(a,'Combat result review');
    assert(close(clock(a).elapsedSeconds,at),'Battle and regrouping add no hidden time');
    phases.push({stage:result.stage,method:method??'assault',seconds:result.time,health:result.hero.hp,steps});
    click('world-skirmish-continue');refresh(a);
  }
  const result=campaign(a).engagements.find(b=>b.id===battle.id);
  assert(result.status==='resolved','The '+battle.region+' field resolves through the played final assault');
  assert(close(clock(a).elapsedSeconds,at)&&close(a.dayNight.state().hour,clock(a).hour),'Final assault retains the exact adventure instant');
  if(index===0){
    assert(!clock(a).complete&&!campaign(a).winner,'The first Caricas result continues the full war');
    assert(a.openingTime.state().modal!=='complete','Caricas does not show the old opening-only completion dialog');
  }
  return {battle:battle.id,region:battle.region,at,phases};
}

async function branch(a,side){
  await restore(a,{...opening,campaignSide:side});const battles=[];
  for(let event=0;event<100&&!campaign(a).winner;event++){
    const state=campaign(a);
    const active=state.engagements.filter(b=>b.status==='active'&&availableBattleStage(b)&&[b.attacker,b.defender].includes(side)).sort((a,b)=>a.endsOn-b.endsOn||a.started-b.started)[0];
    if(active&&state.hero.readyOn<=state.day){battles.push(await fight(a,side,active,battles.length));continue;}
    a.resume();await a.visit(stable);refresh(a);
    const forecast=a.war.waitForecast(),before=clock(a).elapsedSeconds;
    assert(forecast?.ok&&forecast.key,'Full campaign forecasts a next event after '+Math.floor(before)+' seconds');
    const waited=a.war.waitOpening(forecast.key);refresh(a);
    assert(waited.ok&&clock(a).elapsedSeconds>before,'Safe waiting reaches the next real campaign event');
  }
  assert(campaign(a).winner===side,'Playing for '+side+' wins the full Lizeemi War');
  assert(battles.length>=2,'Full '+side+' branch plays beyond Caricas');
  assert(clock(a).complete&&!clock(a).running,'War victory completes and stops the full campaign clock');
  const elapsed=clock(a).elapsedSeconds,saved=checkpoint(a);await restore(a,saved);
  assert(campaign(a).winner===side&&clock(a).complete&&close(clock(a).elapsedSeconds,elapsed),'Completed '+side+' campaign reloads with its exact outcome and time');
  const text=document.getElementById('world-war-objective-title').textContent;
  assert(/Taleth|tower/i.test(text),'Victory gives a clear return-to-Taleth objective');
  assert(!a.state().frameErrors.length,'Full '+side+' campaign has no frame errors');
  return {side,battles,winner:campaign(a).winner,clock:clock(a),checks:[...checks],render:a.renderStats()};
}
export const west=a=>branch(a,'west');
export const east=a=>branch(a,'east');

// Cheap UI regression after the combat checks: no repeated fights or patched
// outcomes. Safe waiting lets the campaign produce its natural winner.
export async function polish(a){
  await restore(a,opening);a.war.pause();await a.visit(stable);refresh(a);
  let forecast=a.war.waitForecast();
  assert(a.war.waitOpening(forecast.key).ok,'Polish fixture reaches the opening battle through safe waiting');
  refresh(a);a.war.pause();
  assert(campaign(a).engagements.some(b=>b.region==='caricas'&&b.status==='active'),'The real Caricas battlefield is active for rest safety checks');
  await a.visit({x:-2092,z:135});refresh(a);
  assert(a.state().mode==='playing'&&!a.war.nearActiveBattle(),'Caricas north road outside the safety margin remains ordinary exploration');
  assert(!document.querySelector('#opening-world-time [data-wait]').hidden,'Quiet ground outside the battlefield offers a waiting preview');
  // This point is inside the old named north-road resting place, but only 77m
  // from the 70m field. The full campaign must reject the named-place shortcut.
  await a.visit({x:-2092,z:154});refresh(a);
  assert(a.state().mode==='playing'&&a.war.nearActiveBattle(),'The former north-road rest area overlaps the active battle safety margin');
  assert(document.querySelector('#opening-world-time [data-wait]').hidden,'Active battlefield proximity hides waiting even at a named rest location');
  const unsafeAt=clock(a).elapsedSeconds;
  assert(!a.war.waitOpening(a.war.waitForecast().key).ok&&close(clock(a).elapsedSeconds,unsafeAt),'Direct waiting near the battlefield is rejected without spending time');
  await a.visit(campaign(a).engagements.find(b=>b.region==='caricas'&&b.status==='active').location);refresh(a);
  if(a.state().mode==='encounter')a.war.withdraw();refresh(a);
  assert(!a.war.waitOpening(a.war.waitForecast().key).ok,'Waiting inside an active field is also rejected after declining the fight');
  await a.visit(stable);refresh(a);
  let waits=0,regroups=0;
  while(!campaign(a).winner&&waits++<100){
    const next=a.war.state().opportunity;
    if(next.kind==='regroup'){
      regroups++;
      for(const id of ['world-war-next','world-war-map-next'])assert(document.getElementById(id).hidden,'Regrouping hides the unusable legacy follow control: '+id);
      assert(/rest|wait/i.test(document.getElementById('world-war-objective-detail').textContent),'Regrouping explains resting instead of a broken follow action');
    }
    forecast=a.war.waitForecast();const before=clock(a).elapsedSeconds;
    assert(forecast?.ok,'Unattended full campaign keeps a meaningful waiting forecast');
    assert(a.war.waitOpening(forecast.key).ok&&clock(a).elapsedSeconds>before,'Unattended rest advances a real army event');refresh(a);
  }
  assert(!!campaign(a).winner&&clock(a).complete,'Unattended waiting reaches the natural full-war result');
  assert(campaign(a).engagements.every(b=>!b.heroResult),'Unattended UI checks invent no hero battle contribution');
  for(const id of ['world-war-next','world-war-map-next']){
    const button=document.getElementById(id);
    assert(!button.hidden&&!button.disabled&&/Taleth/.test(button.textContent),'Completed full war exposes a working return-to-Taleth control: '+id);
  }
  a.openMap();click('taleth-letters');
  assert(a.war.state().courier.archiveOpen&&!document.getElementById('taleth-letter-dialog').hidden,'The map opens the real Taleth message archive');
  const follow=document.getElementById('taleth-letter-follow');
  assert(!follow.hidden&&!follow.disabled&&/Taleth/.test(follow.textContent),'The completed campaign archive also offers Return to Taleth');held(a,'Completed message archive');
  click('taleth-letter-follow');refresh(a);
  assert(a.state().mode==='playing'&&!a.war.state().courier.archiveOpen,'Archive navigation returns to exploration');
  assert(/Council|Taleth|Minora/.test(a.war.state().guidance?.label??''),'Archive return action creates real Minora council guidance');
  assert(JSON.stringify(storage())===JSON.stringify(otherSaves),'Unattended polish leaves unrelated saves unchanged');
  assert(!a.state().frameErrors.length,'Full campaign UI polish produces no frame errors');
  return {checks:[...checks],waits,regroups,winner:campaign(a).winner,clock:clock(a),guidance:a.war.state().guidance,automation:'Actual safe-rest forecasts, natural unattended battle results, and live map/message controls; no combat or campaign result is patched.'};
}

export async function returnToTaleth(a){
  const at=clock(a).elapsedSeconds;
  await a.visit(TOWER_EXIT);key('KeyF');
  await until(()=>a.tower.state().inside&&a.state().mode==='playing','Victory allows returning through the real tower door');
  move(a);held(a,'Returning to Taleth\'s tower');
  await a.visit({x:TALETH_SPOT.x,z:TALETH_SPOT.z+2});key('KeyF');
  assert(/lookout/i.test(document.getElementById('tower-next').textContent),'Taleth offers the lookout after the full campaign');click('tower-next');
  await until(()=>a.tower.state().location==='lookout'&&a.state().mode==='playing','Taleth brings the player to the lookout');
  await a.visit({x:LOOKOUT_TALETH.x-2,z:LOOKOUT_TALETH.z});key('KeyF');held(a,'Lookout campaign review');
  click('tower-next');click('tower-next');refresh(a);
  assert(a.tower.state().concluded,'The two-page Lizeem review concludes the campaign');
  assert(document.getElementById('tower-forecast').hidden,'Completed lookout review hides the obsolete next-event forecast');
  assert(!document.getElementById('tower-review-campaign').hidden,'Completed lookout keeps the campaign Chronoscope review available');
  assert(close(clock(a).elapsedSeconds,at),'The whole tower return and review preserves final adventure time');
  checkpoint(a);
  assert(JSON.stringify(storage())===JSON.stringify(otherSaves),'The full-war checks leave every unrelated save slot unchanged');
  assert(!a.state().frameErrors.length,'The full-war return and panorama have no frame errors');
  return {checks:[...checks],clock:clock(a),tower:a.tower.state(),saveKey:WORLD_WAR_KEY,automation:'Real tower, Bear, horse and battle result controls; debug travel between sites; ordinary combat input driver against unmodified enemies; safe-rest forecast advances strategic time.'};
}
