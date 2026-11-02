import {COMBAT_TRIALS} from '../../gameplay/combat/combat-trials.js';
import {militiaWeapon} from '../../gameplay/combat/combat-units.js';
import {createArmyUnit} from '../../content/characters/army-unit-view.js';
import {createLizeemCommander} from '../../content/characters/lizeem-commanders.js';
import {assaultMorale} from '../../gameplay/combat/commander-morale.js';
import {createCommanderHud} from './commander-hud.js';
import {championFor,commanderFor} from '../../content/scenarios/lizeem-champions.js';
import * as THREE from 'three';
import {disposeCharacter} from '../../content/characters/characters.js';
import {createLizeemEncounter} from '../../gameplay/combat/lizeem-encounter.js';
import {createEncounterWarnings,createEncounterTarget,encounterGuardPose,encounterHeroPose} from '../lizeem/encounter-presentation.js';
import {encounterAutoplayInput} from '../../gameplay/autoplay/encounter-input.js';
import {encounterKeyboardDirections} from '../../gameplay/autoplay/encounter-navigation.js';
import {dodgeLesson} from '../../gameplay/combat/encounter-lesson.js';
import {createSkirmishGround,SKIRMISH_RADIUS,SKIRMISH_BODY_RADIUS} from './skirmish-ground.js';
import {getMovementInput} from '../../gameplay/movement/locomotion.js';
import {interceptionFeedback,interceptionReason} from './interception-feedback.js';
import {interceptedStrength} from '../../simulation/reinforcements.js';
import {createSkirmishFeedback} from './skirmish-feedback-view.js';
import {createSkirmishHud} from './skirmish-hud.js';
import {createEncounterEffects} from '../lizeem/encounter-effects.js';
import {roadsideBrief} from './roadside-presentation.js';
import {phaseDebrief} from './battle-progress.js';
import {createAlliedAssaultView} from './allied-assault-view.js';
import {ALLIED_ASSAULT} from '../../gameplay/combat/allied-assault.js';
import {localSight} from './local-sight.js';
import {createCombatFocus} from './combat-focus-view.js';
import {createBattleResultDialog} from './battle-result-dialog.js';
import {renderBattleFacts} from './battle-facts-view.js';
import {adventureTimeLabel} from '../../experiments/day-night/opening-time-label.js';
import {battleResultTime} from '../../experiments/day-night/opening-battle-time.js';
import {createTrialOpponent} from './trial-opponent-view.js';
import {createTrialBriefing} from './trial-briefing.js';
import {createTrialMagicView} from './trial-magic-view.js';

let nextMusicEncounter=0;
// Let the grounded fall settle, then hold the defeated silhouette in view
// before opening the report. This is presentation time, never simulation time.
const FALL_SECONDS=.65,RESULT_BEAT_SECONDS=1.25;

// Owns only the temporary opponents and their warnings. The exploration host
// keeps its renderer, scene, camera and hero and drives this controller's tick.
export function openWorldSkirmish({scene,world,actor,position,keys,yaw,centre,site,enemyColor,allyColor='#548d88',allyName,allyFaction,watch=()=>false,reinforcements,pending,practice=false,tempo='classic',trial=null,tutorial=null,round=0,trialResults=[],heroAttributes={},onEnd,onContinue,onWithdraw,onCompare,timeNotice='',campaignClock=()=>null}){
  const musicEncounter=++nextMusicEncounter;let musicOutcome=null;
  const ground=createSkirmishGround(world,centre,site.regionId,pending.entryRadius??SKIRMISH_RADIUS);
  const navigation={canOccupy:(p,r)=>ground.clear(p.x,p.z,r),canTraverse:ground.segment,terrainRadius:SKIRMISH_BODY_RADIUS};
  const lesson=practice==='lesson'||practice==='advanced',advanced=practice==='advanced';
  const assaultPractice=practice==='allied'||practice==='solo-assault',assault=!!pending.rally||assaultPractice;
  const allied=practice==='allied'||pending.rally?.style==='allied';
  const allyCount=allied?(pending.rally?.allied?pending.rally.allied.totalAllies-pending.rally.allied.lost:ALLIED_ASSAULT.allies):0;
  const duel=pending.duel?.status==='accepted'?{...championFor(pending),...commanderFor(pending,pending.duel.enemy)}:null;
  const side=pending.rally?.faction,enemySide=side===pending.attacker?pending.defender:pending.attacker;
  const enemyCommander=assault&&!practice?commanderFor(pending,enemySide):null,allyCommander=allied&&!practice?commanderFor(pending,side):null;
  const count=duel?1:assaultPractice?ALLIED_ASSAULT.practiceEnemies:assault?pending.rally.guards:pending.participation?.guards??3;
  const staged=allied||assaultPractice?ground.assaultStage(site.approachHeading??0,count+(enemyCommander?1:0),allyCount+(allyCommander?1:0)):practice?null:ground.stage(site.approachHeading??0,count,assault||!!duel);
  const heroStart=staged?.hero??{x:position.x,z:position.z};
  const setup=staged??(lesson||trial?{guards:ground.spawn(heroStart,site.approachHeading??yaw(),1),route:null}:ground.interception(heroStart,site.approachHeading??yaw(),count));
  if(enemyCommander)setup.guards[setup.guards.length-1].commander=enemyCommander;
  if(allyCommander)setup.allies[setup.allies.length-1].commander=allyCommander;
  if(!practice&&!duel)for(const list of [setup.guards,setup.allies??[]])list.forEach((p,i)=>{if(!p.commander){p.unitType='militiaman';p.weapon=militiaWeapon(i);}});
  const model=createLizeemEncounter({tutorial,tempo,heroAttributes,opponent:trial?.id,opponentWeapon:trial?.weapon,duel,fieldBattle:!!pending.rally?.direct,morale:assault?assaultMorale(pending,side):null,heroStart,guardStarts:setup.guards,move:ground.move,...navigation,canHit:ground.canHit,retreatRoute:ground.retreatRoute,reinforcementRoute:setup.route,rallyPoint:assault?(setup.rally??heroStart):null,allyStarts:allied?setup.allies:null,attackPattern:practice==='lesson'?['thrust']:['thrust','sweep']});
  const autoplayInput=keyboardYaw=>encounterAutoplayInput(model.snapshot(),{...navigation,...(Number.isFinite(keyboardYaw)?{directions:encounterKeyboardDirections(keyboardYaw)}:{})});
  const alliedView=allied?createAlliedAssaultView(scene,world,allyCount+(allyCommander?1:0),allyColor,allyCommander,model.snapshot().allies):null;
  const commanderHud=createCommanderHud();
  const guards=model.snapshot().guards.map(g=>{const guard=trial?createTrialOpponent(trial.id,trial.weapon):duel||g.commanderId?createLizeemCommander(duel?pending.duel.enemy:g.faction):createArmyUnit({unitType:g.unitType??'ambron-soldier',weapon:g.weapon,tunic:new THREE.Color(enemyColor).getHex(),variant:g.id});if(g.role==='runner')guard.setShield(false);guard.group.userData.worldSkirmish=true;guard.group.userData.encounterRole=g.role;scene.add(guard.group);return guard;});
  const combatFeedback=createSkirmishFeedback(scene,world,guards.length),targetMarker=createEncounterTarget(scene),effects=createEncounterEffects(scene,document.getElementById('world-skirmish-settings'));
  const ringGeometry=new THREE.RingGeometry(1.7,2.4,28),warnings=createEncounterWarnings(scene,guards.length);
  const trialMagic=trial?createTrialMagicView(scene,world):null;
  const rally=setup.rally??setup.route?.at(-1)??heroStart,rallyMaterial=new THREE.MeshBasicMaterial({color:assault?0xe5bc62:0x58c6f2,transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false});
  const rallyMarker=new THREE.Mesh(ringGeometry,rallyMaterial);rallyMarker.rotation.x=-Math.PI/2;rallyMarker.position.set(rally.x,world.heightAt(rally.x,rally.z)+.1,rally.z);scene.add(rallyMarker);
  const beaconGeometry=new THREE.ConeGeometry(.35,2.8,4),beacon=new THREE.Mesh(beaconGeometry,rallyMaterial);
  beacon.position.set(rally.x,world.heightAt(rally.x,rally.z)+1.4,rally.z);scene.add(beacon);
  const labelCanvas=document.createElement('canvas');labelCanvas.width=384;labelCanvas.height=64;
  const context=labelCanvas.getContext('2d');let rallyTitle=null;
  function paintRally(title){context.fillStyle=assault?'#54401d':'#163744';context.fillRect(0,0,384,64);context.textAlign='center';context.fillStyle=assault?'#ffe6a3':'#bcecff';context.font='bold 36px sans-serif';context.fillText(title,192,44);rallyTitle=title;}
  paintRally(assault?'BREAK THEIR RALLY':'ENEMY RALLY POINT');
  const labelTexture=new THREE.CanvasTexture(labelCanvas),labelMaterial=new THREE.SpriteMaterial({map:labelTexture,depthTest:true,depthWrite:false,sizeAttenuation:false});
  const label=new THREE.Sprite(labelMaterial);label.position.set(rally.x,beacon.position.y+2.5,rally.z);label.scale.set(.20,.034,1);label.userData.rallyLabel=true;scene.add(label);
  const panel=document.getElementById('world-skirmish');
  panel.querySelector('.eyebrow').textContent=`${site.name.toUpperCase()} / ${allyName?'HELPING '+allyName.toUpperCase():assault?(allied?'ALLIED ASSAULT':'SOLO ASSAULT'):'INTERCEPT REINFORCEMENTS'}`;
  const resultPanel=document.getElementById('world-skirmish-result'),withdraw=document.getElementById('world-skirmish-withdraw');
  const compare=assaultPractice&&onCompare?document.createElement('button'):null;
  if(compare){compare.id='world-skirmish-compare';compare.textContent=allied?'Try solo · same 4 enemies':'Try with 3 allies · same 4 enemies';compare.onclick=onCompare;document.getElementById('world-skirmish-result-actions').append(compare);}
  const resultDialog=createBattleResultDialog(panel,resultPanel);
  panel.hidden=false;resultPanel.hidden=true;withdraw.hidden=false;withdraw.onclick=onWithdraw;
  renderBattleFacts(document.getElementById('world-skirmish-facts'));
  document.getElementById('world-skirmish-next').hidden=true;
  document.getElementById('world-skirmish-continue').onclick=onContinue;
  document.getElementById('world-skirmish-continue').textContent=practice?'Leave practice (Enter)':pending.stage==='intercept'?'Regroup for rally assault (Enter)':'Continue to exploration (Enter)';
  const leave=document.getElementById('world-skirmish-leave');leave.hidden=practice||pending.stage!=='intercept';leave.onclick=onWithdraw;
  leave.textContent=duel?'Leave / keep the challenge result':'Leave / keep the interception';
  withdraw.textContent=practice?'Leave practice (Esc)':'Withdraw (Esc)';
  actor.setArmed(true);actor.setWeapon('oak-staff');
  if(duel)withdraw.textContent='Yield / forfeit challenge (Esc)';
  let accumulator=0,ended=false,disposed=false,clickAttack=false,clickDodge=false,introRemaining=watch()?2:0,visualTime=0,lastDrawTime=0,resultSettling=0,resultShown=false;
  const dodgeButton=document.getElementById('world-skirmish-dodge');
  document.getElementById('world-skirmish-strike').onclick=()=>{clickAttack=true;};
  dodgeButton.onclick=()=>{clickDodge=true;};
  const fallenAt=new Map();
  const focus=createCombatFocus({scene,world,yaw,canSee:(a,b)=>localSight(world,a,b),snapshot:model.snapshot});
  const hud=createSkirmishHud({practice,reinforcements,pending,site,trial,onGuardChange:value=>value?keys.add('KeyF'):keys.delete('KeyF'),onPauseChange(){keys.clear();accumulator=0;clickAttack=clickDodge=false;}});
  if(!practice&&campaignClock()?.sharedOpening){
    const deadline=adventureTimeLabel(pending.endsOn*60);
    document.getElementById('world-skirmish-context').textContent=(duel
      ?`${duel.name}: ${duel.words} Defeat the champion within two minutes to make two rally guards fall back. Esc yields and forfeits this challenge; the final assault remains available.`
      :assault?`Break the remaining ${pending.rally?.guards??count} guards${enemyCommander?' and defeat or rout '+enemyCommander.name:''}. Victory follows when their line breaks. Continue records the battle result now. Withdraw to preserve your casualties and return before ${deadline}.`
      :`Intercept the remaining ${pending.participation?.guards??count} reinforcements before they reach the blue rally point. Earlier casualties and escapes are preserved. Completing this phase opens the final assault immediately; you may leave and return before ${deadline}.`)
      +' Adventure time is held during combat. Completing a phase does not skip time or move other armies.';
  }
  if(pending.kind==='roadside')document.getElementById('world-skirmish-context').textContent=roadsideBrief(pending,{elapsed:!!campaignClock()?.sharedOpening});
  function draw(s,paused){
    const elapsed=visualTime-lastDrawTime,speed=elapsed>0?Math.min(s.hero.combat.moveSpeed,Math.hypot(s.hero.x-position.x,s.hero.z-position.z)/elapsed):0;lastDrawTime=visualTime;
    position.set(s.hero.x,world.heightAt(s.hero.x,s.hero.z),s.hero.z);actor.group.position.copy(position);actor.group.rotation.set(0,s.hero.heading,0);
    if(!s.hero.hp&&!fallenAt.has('hero'))fallenAt.set('hero',visualTime);
    const heroPose=s.outcome?{...s.hero,swing:0,dodge:0,hurt:0,blocking:false,blockImpact:0}:s.hero;
    actor.animate(visualTime,s.outcome?0:speed,true,encounterHeroPose(heroPose,Math.min(1,(visualTime-(fallenAt.get('hero')??visualTime))/FALL_SECONDS)));
    guards.forEach((guard,i)=>{const g=s.guards[i],y=world.heightAt(g.x,g.z);guard.group.position.set(g.x,y,g.z);guard.group.rotation.y=g.heading;guard.group.visible=!g.escaped||g.routed&&!g.departed;
      if(!g.hp&&!fallenAt.has(i))fallenAt.set(i,visualTime);
      if(g.yielded)guard.setArmed(false);
      const pose=s.outcome?{...g,hurt:0,block:0,open:false,guarding:false,phase:'approach'}:g;
      guard.animate(visualTime,s.outcome?0:g.speed,true,encounterGuardPose(pose,Math.min(1,(visualTime-(fallenAt.get(i)??visualTime))/FALL_SECONDS)));});
    warnings.draw(s.outcome?s.guards.map(g=>({...g,phase:'approach',open:false})):s.guards,(x,z)=>world.heightAt(x,z));
    targetMarker.draw(s,(x,z)=>world.heightAt(x,z));
    effects.draw(s,(x,z)=>world.heightAt(x,z),visualTime);
    trialMagic?.draw(s,visualTime);
    combatFeedback.draw(s);alliedView?.draw(s,visualTime);commanderHud.draw(s);
    const title=assault?(s.guards.every(g=>!g.hp||g.routed)?'FIELD SECURED':'BREAK THEIR RALLY'):'ENEMY RALLY POINT';
    if(title!==rallyTitle){paintRally(title);labelTexture.needsUpdate=true;}
    rallyMarker.visible=beacon.visible=label.visible=(!!setup.route||assault)&&!s.outcome;
    if(assault&&title==='BREAK THEIR RALLY'&&Math.hypot(s.hero.x-rally.x,s.hero.z-rally.z)<8)label.visible=false;
    hud.draw(s,{inactive:paused,introRemaining,watching:watch()});
    focus.update(s,elapsed,hud.paused()||paused||watch());
  }
  draw(model.snapshot(),false);
  const briefing=trial?createTrialBriefing({trial,round,state:model.snapshot(),onLeave:onWithdraw,onStart(){keys.clear();accumulator=0;clickAttack=clickDodge=false;document.getElementById('exploration-canvas').focus();}}):null;
  return {reviewing:()=>ended||briefing?.active(),autoplayInput,
    musicState:()=>trial?{id:musicEncounter,round,tier:trial.musicTier,outcome:musicOutcome}:null,
    // Finish the fall and lower surviving actors' weapons before the report.
    // Only presentation advances; health, positions and both clocks stay fixed.
    settleResult(dt,active){
      if(disposed||!ended||!active||resultShown)return;
      const delta=Math.min(.1,Math.max(0,dt),RESULT_BEAT_SECONDS-resultSettling);
      if(!delta)return;resultSettling+=delta;visualTime+=delta;draw(model.snapshot(),true);
      if(resultSettling>=RESULT_BEAT_SECONDS){resultShown=true;keys.clear();resultDialog.open();}
    },
    paused:()=>hud.paused(),cameraTarget:focus.cameraTarget,manualCamera:focus.manual,focusId:focus.id,spellTargets:model.spellTargets,fireballHit:model.fireballHit,canCast:model.canCast,beginCast:model.beginCast,spellPaused:()=>briefing?.active()||hud.paused()||ended||!model.snapshot().hero.hp||model.snapshot().objective?.secured>0,
    snapshot:()=>({...model.snapshot(),trial:trial?.id??null,round,briefing:!!briefing?.active(),site:pending.region+'-world',staging:{...heroStart},centre:{...centre},interception:!trial&&!assault&&!duel,stage:trial?'trial':duel?'duel':assault?'rally':'intercept',rally:{...rally},radius:pending.entryRadius??SKIRMISH_RADIUS,presentation:{focus:focus.state(),introRemaining,speed:1,helpOpen:hud.paused(),sound:effects.state(),resultPending:ended&&!resultShown,resultElapsed:resultSettling}}),keydown:event=>hud.keydown(event)||focus.keydown(event),attack:()=>{if(!ended&&!hud.paused()&&!briefing?.active())clickAttack=true;},
    tick(dt,active){
      if(disposed)return;
      if(briefing?.active()){keys.clear();accumulator=0;clickAttack=clickDodge=false;return;}
      if(hud.paused()){keys.clear();accumulator=0;clickAttack=clickDodge=false;draw(model.snapshot(),!active);return;}
      if(ended)return; // The result modal explicitly pauses the whole scene.
      if(active)visualTime+=Math.min(.1,dt);
      if(!watch())introRemaining=0;
      if(introRemaining>0){if(active)introRemaining=Math.max(0,introRemaining-dt);keys.clear();clickAttack=clickDodge=false;draw(model.snapshot(),!active);return;}
      if(active)accumulator+=Math.min(.1,dt);else{accumulator=0;clickAttack=clickDodge=false;}
      while(accumulator>=1/60&&!ended){
        const intent=getMovementInput(keys),angle=yaw();
        const s=model.tick(1/60,watch()?autoplayInput():{focusId:focus.id(),x:-Math.sin(angle)*intent.forward+Math.cos(angle)*intent.side,z:-Math.cos(angle)*intent.forward-Math.sin(angle)*intent.side,block:keys.has('KeyF'),attack:keys.has('KeyX')||clickAttack,dodge:keys.has('Space')||clickDodge});
        clickAttack=clickDodge=false;accumulator-=1/60;
        if(s.outcome){
          ended=true;musicOutcome=s.outcome;keys.clear();draw(s,false);
          if(!practice&&s.hero.hp===0){onEnd(s.outcome,s.objective?.reason,s);return;}
          let feedback=practice?null:duel?{title:s.outcome==='success'?`${duel.name} yields`:'Challenge ended',detail:'Regroup for the final assault.'}:assault?{title:s.outcome==='success'?`Rally broken / ${site.name} won`:'Rally assault repelled',detail:s.outcome==='success'?`You broke the enemy line. ${allyName} wins ${site.name}: the enemy retreats and surviving allies regroup here. Your interception removed ${(pending.rally?.blocked??0)} strength before this final push. Continue to record the victory and see the aftermath.`:`${s.hero.hp===0?'You were driven back.':`The ${pending.commanders?120:90}-second assault window ended.`} ${s.guards.filter(g=>!g.hp).length} rally guards stopped. Your earlier ${(pending.rally?.blocked??0)} strength interception still counts. The armies will decide the battle on day ${pending.endsOn}; there is no second rally attempt.`}:interceptionFeedback(s,{strength:reinforcements.strength,endsOn:pending.endsOn,regionName:site.name});
          if(feedback&&!pending.participation&&pending.stage==='intercept')feedback.detail+=` Next: regroup at full health and break the enemy rally to win ${site.name}. Leaving keeps your contribution, but leaves the outcome to the armies. You can re-enter the battlefield before the deadline.`;
          const clock=practice?null:campaignClock(),timing=practice?null:battleResultTime(pending,clock,s.outcome);
          const debrief=!practice&&phaseDebrief(pending,s,{regionName:site.name,allyName,strength:reinforcements?.strength,faction:allyFaction,clock});
          if(clock?.sharedOpening&&feedback&&!debrief){
            const deadline=adventureTimeLabel(pending.endsOn*60);
            if(assault&&s.outcome!=='success')feedback.detail=`The assault ended before the enemy line broke. Your casualties and earlier contribution count. ${timing?.next??''}`;
            else if(!assault&&!duel){
              const stopped=s.guards.filter(g=>!g.hp).length,blocked=interceptedStrength(reinforcements.strength,stopped);
              feedback.detail=`${interceptionReason(s.objective?.reason)} ${stopped} of 3 soldiers stopped. ${blocked} of ${reinforcements.strength} reinforcement strength removed. Control of ${site.name} has not changed. If you stay out, the armies resolve the battle at ${deadline}.`;
            }
          }
          if(debrief){feedback=debrief;renderBattleFacts(document.getElementById('world-skirmish-facts'),debrief.facts);const next=document.getElementById('world-skirmish-next');next.hidden=false;next.textContent=debrief.next;document.getElementById('world-skirmish-continue').textContent=debrief.button;}
          document.getElementById('world-skirmish-result-title').textContent=practice?(lesson?(dodgeLesson(s,advanced).complete?(advanced?'Thrust and sweep lesson complete':'Dodge lesson complete'):'Try the dodge lesson again'):(s.outcome==='success'?'Practice complete':'Practice ended')):feedback.title;
          document.getElementById('world-skirmish-result-detail').textContent=practice?`${s.guards.filter(g=>!g.hp).length} of ${guards.length} soldiers defeated. ${s.hero.hp===0?'Teresod was defeated. ':''}${s.skill.dodgeCounters} dodge counters.${setup.route?' '+s.guards.filter(g=>g.escaped).length+' escaped.':''} Health remaining: ${s.hero.hp}/${s.hero.maxHp}. Time: ${s.time.toFixed(1)}s. ${s.squad?`${s.allies.filter(a=>a.hp).length}/${s.allies.length} allies survived; allies dealt ${s.squad.damageByAllies} damage, Teresod dealt ${s.squad.damageByHero}. ${s.squad.routed} enemy retreated. `:''}${lesson?dodgeLesson(s,advanced).text+' ':''}No campaign troops or territory changed. Press R to try again.`:feedback.detail;
          document.getElementById('world-skirmish-review').textContent=timing?.review??(timeNotice||'Game paused. Choose Continue when you are ready.');
          if(trial){
            const won=s.outcome==='success',last=round===COMBAT_TRIALS.length-1;
            document.getElementById('world-skirmish-result-title').textContent=won?(last?(trialResults.length===COMBAT_TRIALS.length-1?`${COMBAT_TRIALS.length} trials complete`:'Trial run complete'):`${trial.name} defeated`):`${trial.name} / Try again`;
            document.getElementById('world-skirmish-result-detail').textContent=won
              ?`${trialResults.length+1} round${trialResults.length?'s':''} won in this run. Health: ${s.hero.hp}/${s.hero.maxHp}. Time: ${s.time.toFixed(1)}s. ${s.skill.dodgeCounters} dodge counters. `+(last?trialResults.map(r=>`${r.name}: ${r.hp}/${r.maxHp??100} health, ${r.time.toFixed(1)}s.`).join(' '):'The next round starts at full health. Continue when you are ready.')
              :`${s.hero.hp===0?'You were defeated.':'Time ran out.'} Press R to retry this round at full health. Your earlier rounds remain complete.`;
            document.getElementById('world-skirmish-continue').textContent=won&&!last?'Next opponent (Enter)':'Choose exercise (Enter)';
          }
          withdraw.hidden=true;resultDialog.waitForAnimation();onEnd(s.outcome,s.objective?.reason,s);return;
        }
      }
      draw(model.snapshot(),!active);
    },
    dispose(){if(disposed)return;disposed=true;briefing?.dispose();resultDialog.dispose();compare?.remove();focus.dispose();trialMagic?.dispose();hud.dispose();commanderHud.dispose();alliedView?.dispose();combatFeedback.dispose();targetMarker.dispose();effects.dispose();panel.hidden=true;resultPanel.hidden=true;document.getElementById('world-skirmish-retry').hidden=true;keys.clear();actor.setArmed(false);for(const guard of guards)disposeCharacter(guard);warnings.dispose();scene.remove(rallyMarker,beacon,label);labelTexture.dispose();labelMaterial.dispose();beaconGeometry.dispose();rallyMaterial.dispose();ringGeometry.dispose();}
  };
}
