import * as THREE from 'three';
import {createCharacter,disposeCharacter} from '../../content/characters/characters.js';
import {createLizeemEncounter,ENCOUNTER_TIMING as T} from '../../gameplay/combat/lizeem-encounter.js';
import {createEncounterWarnings,createEncounterTarget,encounterGuardPose} from '../lizeem/encounter-presentation.js';
import {encounterAutoplayInput} from '../../gameplay/autoplay/encounter-input.js';
import {dodgeLesson} from '../../gameplay/combat/encounter-lesson.js';
import {createSkirmishGround,SKIRMISH_RADIUS} from './skirmish-ground.js';
import {getMovementInput} from '../../gameplay/movement/locomotion.js';
import {interceptionFeedback} from './interception-feedback.js';
import {createSkirmishFeedback} from './skirmish-feedback-view.js';
import {createSkirmishHud} from './skirmish-hud.js';
import {createEncounterEffects} from '../lizeem/encounter-effects.js';
import {phaseDebrief} from './battle-progress.js';
import {createAlliedAssaultView} from './allied-assault-view.js';
import {ALLIED_ASSAULT} from '../../gameplay/combat/allied-assault.js';
import {localSight} from './local-sight.js';
import {createCombatFocus} from './combat-focus-view.js';
import {renderBattleFacts} from './battle-facts-view.js';

// Owns only the temporary opponents and their warnings. The exploration host
// keeps its renderer, scene, camera and hero and drives this controller's tick.
export function openWorldSkirmish({scene,world,actor,position,keys,yaw,centre,site,enemyColor,allyColor='#548d88',allyName,watch=()=>false,reinforcements,pending,practice=false,onEnd,onContinue,onWithdraw}){
  const ground=createSkirmishGround(world,centre,site.regionId,pending.entryRadius??SKIRMISH_RADIUS);
  const lesson=practice==='lesson'||practice==='advanced',advanced=practice==='advanced';
  const assaultPractice=practice==='allied'||practice==='solo-assault',assault=!!pending.rally||assaultPractice;
  const allied=practice==='allied'||pending.rally?.style==='allied';
  const allyCount=allied?(pending.rally?.allied?pending.rally.allied.totalAllies-pending.rally.allied.lost:ALLIED_ASSAULT.allies):0;
  const count=assaultPractice?ALLIED_ASSAULT.practiceEnemies:assault?pending.rally.guards:pending.participation?.guards??3;
  const staged=allied||assaultPractice?ground.assaultStage(site.approachHeading??0,count,allyCount):practice?null:ground.stage(site.approachHeading??0,count,assault);
  const heroStart=staged?.hero??{x:position.x,z:position.z};
  const setup=staged??(lesson?{guards:ground.spawn(heroStart,site.approachHeading??yaw()).slice(0,1),route:null}:ground.interception(heroStart,site.approachHeading??yaw(),count));
  const model=createLizeemEncounter({heroStart,guardStarts:setup.guards,move:ground.move,canHit:ground.canHit,reinforcementRoute:setup.route,rallyPoint:assault?(setup.rally??heroStart):null,allyStarts:allied?setup.allies:null,attackPattern:practice==='lesson'?['thrust']:['thrust','sweep']});
  const alliedView=allied?createAlliedAssaultView(scene,world,allyCount,allyColor):null;
  const guards=model.snapshot().guards.map(g=>{const guard=createCharacter({role:'legion-soldier',tunic:new THREE.Color(enemyColor).getHex(),armed:true});if(g.role==='runner')guard.setShield(false);guard.group.userData.worldSkirmish=true;guard.group.userData.encounterRole=g.role;scene.add(guard.group);return guard;});
  const combatFeedback=createSkirmishFeedback(scene,world,guards.length),targetMarker=createEncounterTarget(scene),effects=createEncounterEffects(scene,document.getElementById('world-skirmish-settings'));
  const ringGeometry=new THREE.RingGeometry(1.7,2.4,28),warnings=createEncounterWarnings(scene,guards.length);
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
  panel.hidden=false;resultPanel.hidden=true;withdraw.hidden=false;withdraw.onclick=onWithdraw;
  renderBattleFacts(document.getElementById('world-skirmish-facts'));
  document.getElementById('world-skirmish-next').hidden=true;
  document.getElementById('world-skirmish-continue').onclick=onContinue;
  document.getElementById('world-skirmish-continue').textContent=practice?'Leave practice (Enter)':pending.stage==='intercept'?'Regroup for rally assault (Enter)':'Continue to exploration (Enter)';
  const leave=document.getElementById('world-skirmish-leave');leave.hidden=practice||pending.stage!=='intercept';leave.onclick=onWithdraw;
  withdraw.textContent=practice?'Leave practice (Esc)':'Withdraw (Esc)';
  actor.setArmed(true);actor.setWeapon('oak-staff');
  let accumulator=0,ended=false,disposed=false,clickAttack=false,clickDodge=false,introRemaining=watch()?2:0,visualTime=0,lastDrawTime=0;
  const dodgeButton=document.getElementById('world-skirmish-dodge');
  document.getElementById('world-skirmish-strike').onclick=()=>{clickAttack=true;};
  dodgeButton.onclick=()=>{clickDodge=true;};
  const fallenAt=new Map();
  const focus=createCombatFocus({scene,world,yaw,canSee:(a,b)=>localSight(world,a,b),snapshot:model.snapshot});
  const hud=createSkirmishHud({practice,reinforcements,pending,site,onPauseChange(){keys.clear();accumulator=0;clickAttack=clickDodge=false;}});
  function draw(s,paused){
    const elapsed=visualTime-lastDrawTime,speed=elapsed>0?Math.min(4,Math.hypot(s.hero.x-position.x,s.hero.z-position.z)/elapsed):0;lastDrawTime=visualTime;
    position.set(s.hero.x,world.heightAt(s.hero.x,s.hero.z),s.hero.z);actor.group.position.copy(position);actor.group.rotation.y=s.hero.heading;
    if(!s.hero.hp&&!fallenAt.has('hero'))fallenAt.set('hero',visualTime);
    actor.animate(visualTime,speed,true,{action:!s.hero.hp?'dead':s.hero.dodge?'dodge':s.hero.hurt?'hurt':s.hero.swing?'attack':'idle',progress:!s.hero.hp?Math.min(1,(visualTime-fallenAt.get('hero'))/.4):s.hero.dodge?1-s.hero.dodge/T.dodge:s.hero.hurt?1-s.hero.hurt/T.hurt:s.hero.swing?1-s.hero.swing/T.swing:0});
    guards.forEach((guard,i)=>{const g=s.guards[i],y=world.heightAt(g.x,g.z);guard.group.position.set(g.x,y,g.z);guard.group.rotation.y=g.heading;guard.group.visible=!g.escaped||g.routed;
      if(!g.hp&&!fallenAt.has(i))fallenAt.set(i,visualTime);
      guard.animate(visualTime,g.speed,true,encounterGuardPose(g,Math.min(1,(visualTime-(fallenAt.get(i)??visualTime))/.4)));});
    warnings.draw(s.guards,(x,z)=>world.heightAt(x,z));
    targetMarker.draw(s,(x,z)=>world.heightAt(x,z));
    effects.draw(s,(x,z)=>world.heightAt(x,z),visualTime);
    combatFeedback.draw(s);alliedView?.draw(s,visualTime);
    const title=assault?(s.guards.every(g=>!g.hp||g.routed)?'SECURE THE FIELD':'BREAK THEIR RALLY'):'ENEMY RALLY POINT';
    if(title!==rallyTitle){paintRally(title);labelTexture.needsUpdate=true;}
    rallyMarker.visible=beacon.visible=label.visible=(!!setup.route||assault)&&!s.outcome;
    if(assault&&title==='BREAK THEIR RALLY'&&Math.hypot(s.hero.x-rally.x,s.hero.z-rally.z)<8)label.visible=false;
    hud.draw(s,{inactive:paused,introRemaining,watching:watch()});
    focus.update(s,elapsed,hud.paused()||paused||watch());
  }
  draw(model.snapshot(),false);
  return {cameraTarget:focus.cameraTarget,manualCamera:focus.manual,focusId:focus.id,spellTargets:()=>model.snapshot().guards,fireballHit:model.fireballHit,spellPaused:()=>hud.paused()||ended||!model.snapshot().hero.hp,
    snapshot:()=>({...model.snapshot(),site:pending.region+'-world',staging:{...heroStart},centre:{...centre},interception:!assault,stage:assault?'rally':'intercept',rally:{...rally},radius:pending.entryRadius??SKIRMISH_RADIUS,presentation:{focus:focus.state(),introRemaining,speed:1,helpOpen:hud.paused(),sound:effects.state()}}),keydown:event=>hud.keydown(event)||focus.keydown(event),attack:()=>{if(!hud.paused())clickAttack=true;},
    tick(dt,active){
      if(disposed)return;
      if(hud.paused()){keys.clear();accumulator=0;clickAttack=clickDodge=false;draw(model.snapshot(),!active);return;}
      if(active)visualTime+=Math.min(.1,dt);
      if(ended){draw(active?model.aftermath(dt):model.snapshot(),!active);return;}
      if(!watch())introRemaining=0;
      if(introRemaining>0){if(active)introRemaining=Math.max(0,introRemaining-dt);keys.clear();clickAttack=clickDodge=false;draw(model.snapshot(),!active);return;}
      if(active)accumulator+=Math.min(.1,dt);else{accumulator=0;clickAttack=clickDodge=false;}
      while(accumulator>=1/60&&!ended){
        const intent=getMovementInput(keys),angle=yaw();
        const s=model.tick(1/60,watch()?encounterAutoplayInput(model.snapshot()):{focusId:focus.id(),x:-Math.sin(angle)*intent.forward+Math.cos(angle)*intent.side,z:-Math.cos(angle)*intent.forward-Math.sin(angle)*intent.side,attack:keys.has('KeyX')||clickAttack,dodge:keys.has('Space')||clickDodge});
        clickAttack=clickDodge=false;accumulator-=1/60;
        if(s.outcome){
          ended=true;keys.clear();draw(s,false);
          if(!practice&&s.hero.hp===0){onEnd(s.outcome,s.objective?.reason,s);return;}
          let feedback=practice?null:assault?{title:s.outcome==='success'?`Rally broken / ${site.name} won`:'Rally assault repelled',detail:s.outcome==='success'?`You broke all ${guards.length} rally guards and held the standard. ${allyName} wins ${site.name}: the enemy retreats and surviving allies regroup here. Your interception removed ${(pending.rally?.blocked??0)} strength before this final push. Continue to record the victory and see the aftermath.`:`${s.hero.hp===0?'You were driven back.':'The 90-second assault window ended.'} ${s.guards.filter(g=>!g.hp).length} rally guards stopped. Your earlier ${(pending.rally?.blocked??0)} strength interception still counts. The armies will decide the battle on day ${pending.endsOn}; there is no second rally attempt.`}:interceptionFeedback(s,{strength:reinforcements.strength,endsOn:pending.endsOn,regionName:site.name});
          if(feedback&&!pending.participation&&pending.stage==='intercept')feedback.detail+=` Next: regroup at full health and break the enemy rally to win ${site.name}. Leaving keeps your contribution, but leaves the outcome to the armies. You can re-enter the battlefield before the deadline.`;
          const debrief=!practice&&phaseDebrief(pending,s,{regionName:site.name,allyName,strength:reinforcements?.strength});
          if(debrief){feedback=debrief;renderBattleFacts(document.getElementById('world-skirmish-facts'),debrief.facts);const next=document.getElementById('world-skirmish-next');next.hidden=false;next.textContent=debrief.next;document.getElementById('world-skirmish-continue').textContent=debrief.button;}
          document.getElementById('world-skirmish-result-title').textContent=practice?(lesson?(dodgeLesson(s,advanced).complete?(advanced?'Thrust and sweep lesson complete':'Dodge lesson complete'):'Try the dodge lesson again'):(s.outcome==='success'?'Practice complete':'Practice ended')):feedback.title;
          document.getElementById('world-skirmish-result-detail').textContent=practice?`${s.guards.filter(g=>!g.hp).length} of ${guards.length} soldiers defeated. ${s.hero.hp===0?'Teresod was defeated. ':''}${s.skill.dodgeCounters} dodge counters.${setup.route?' '+s.guards.filter(g=>g.escaped).length+' escaped.':''} Health remaining: ${s.hero.hp}/100. ${s.squad?`${s.allies.filter(a=>a.hp).length}/${s.allies.length} allies survived; allies dealt ${s.squad.damageByAllies} damage, Teresod dealt ${s.squad.damageByHero}. ${s.squad.routed} enemy retreated. `:''}${lesson?dodgeLesson(s,advanced).text+' ':''}No campaign troops or territory changed. Press R to try again.`:feedback.detail;
          document.getElementById('world-skirmish-review').textContent=s.squad&&s.outcome==='success'?'The surviving allies regroup while you review the result.':'Encounter ended. The scene is paused for review.';
          resultPanel.hidden=false;withdraw.hidden=true;onEnd(s.outcome,s.objective?.reason,s);return;
        }
      }
      draw(model.snapshot(),!active);
    },
    dispose(){if(disposed)return;disposed=true;focus.dispose();hud.dispose();alliedView?.dispose();combatFeedback.dispose();targetMarker.dispose();effects.dispose();panel.hidden=true;resultPanel.hidden=true;document.getElementById('world-skirmish-retry').hidden=true;keys.clear();actor.setArmed(false);for(const guard of guards)disposeCharacter(guard);warnings.dispose();scene.remove(rallyMarker,beacon,label);labelTexture.dispose();labelMaterial.dispose();beaconGeometry.dispose();rallyMaterial.dispose();ringGeometry.dispose();}
  };
}
