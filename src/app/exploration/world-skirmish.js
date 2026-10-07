import * as THREE from 'three';
import {createCharacter} from '../../content/characters/characters.js';
import {createLizeemEncounter,ENCOUNTER_TIMING as T} from '../../gameplay/combat/lizeem-encounter.js';
import {createEncounterWarnings,encounterGuardPose} from '../lizeem/encounter-presentation.js';
import {encounterAutoplayInput} from '../../gameplay/autoplay/encounter-input.js';
import {dodgeLesson} from '../../gameplay/combat/encounter-lesson.js';
import {createSkirmishGround,SKIRMISH_RADIUS} from './skirmish-ground.js';
import {getMovementInput} from '../../gameplay/movement/locomotion.js';
import {interceptionFeedback} from './interception-feedback.js';
import {createSkirmishFeedback} from './skirmish-feedback-view.js';

// Owns only the temporary opponents and their warnings. The exploration host
// keeps its renderer, scene, camera and hero and drives this controller's tick.
export function openWorldSkirmish({scene,world,actor,position,keys,yaw,centre,site,enemyColor,allyName,watch=()=>false,reinforcements,pending,practice=false,onEnd,onContinue,onWithdraw}){
  const ground=createSkirmishGround(world,centre,site.regionId),heroStart={x:position.x,z:position.z};
  const lesson=practice==='lesson'||practice==='advanced',advanced=practice==='advanced';
  const setup=lesson?{guards:ground.spawn(heroStart,site.approachHeading??yaw()).slice(0,1),route:null}:ground.interception(heroStart,site.approachHeading??yaw());
  const model=createLizeemEncounter({heroStart,guardStarts:setup.guards,move:ground.move,canHit:ground.canHit,reinforcementRoute:setup.route,attackPattern:practice==='lesson'?['thrust']:['thrust','sweep']});
  const guards=model.snapshot().guards.map(g=>{const guard=createCharacter({role:'legion-soldier',tunic:new THREE.Color(enemyColor).getHex(),armed:true});if(g.role==='runner')guard.setShield(false);guard.group.userData.worldSkirmish=true;guard.group.userData.encounterRole=g.role;scene.add(guard.group);return guard;});
  const combatFeedback=createSkirmishFeedback(scene,world,guards.length);
  const ringGeometry=new THREE.RingGeometry(1.7,2.4,28),warnings=createEncounterWarnings(scene,guards.length);
  const rally=setup.route?.at(-1)??heroStart,rallyMaterial=new THREE.MeshBasicMaterial({color:0x58c6f2,transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false});
  const rallyMarker=new THREE.Mesh(ringGeometry,rallyMaterial);rallyMarker.rotation.x=-Math.PI/2;rallyMarker.position.set(rally.x,world.heightAt(rally.x,rally.z)+.1,rally.z);scene.add(rallyMarker);
  const beaconGeometry=new THREE.ConeGeometry(.35,2.8,4),beacon=new THREE.Mesh(beaconGeometry,rallyMaterial);
  beacon.position.set(rally.x,world.heightAt(rally.x,rally.z)+1.4,rally.z);scene.add(beacon);
  const labelCanvas=document.createElement('canvas');labelCanvas.width=384;labelCanvas.height=64;
  const context=labelCanvas.getContext('2d');context.fillStyle='#163744';context.fillRect(0,0,384,64);context.textAlign='center';context.fillStyle='#bcecff';context.font='bold 36px sans-serif';context.fillText('ENEMY RALLY POINT',192,44);
  const labelTexture=new THREE.CanvasTexture(labelCanvas),labelMaterial=new THREE.SpriteMaterial({map:labelTexture,depthTest:true,depthWrite:false,sizeAttenuation:false});
  const label=new THREE.Sprite(labelMaterial);label.position.set(rally.x,beacon.position.y+2.5,rally.z);label.scale.set(.20,.034,1);label.userData.rallyLabel=true;scene.add(label);
  const panel=document.getElementById('world-skirmish'),hud=document.getElementById('world-skirmish-health');
  panel.querySelector('.eyebrow').textContent=`${site.name.toUpperCase()} / ${allyName?'HELPING '+allyName.toUpperCase():'INTERCEPT REINFORCEMENTS'}`;
  const resultPanel=document.getElementById('world-skirmish-result'),warning=document.getElementById('world-skirmish-warning'),withdraw=document.getElementById('world-skirmish-withdraw');
  panel.hidden=false;resultPanel.hidden=true;withdraw.hidden=false;withdraw.onclick=onWithdraw;
  for(const id of ['world-skirmish-objective','world-skirmish-controls','world-skirmish-health','world-skirmish-actions'])document.getElementById(id).hidden=false;
  document.getElementById('world-skirmish-continue').onclick=onContinue;
  const objective=document.getElementById('world-skirmish-objective');
  objective.textContent=practice?'Stop the runner before the rally point while two escorts engage you. Thrust: sidestep. Sweep: retreat. Practice has no campaign effect.':`One runner heads for the blue rally point while two ${reinforcements.name} escorts engage you. Each soldier stopped removes ${Math.floor(reinforcements.strength/3)} reinforcement strength. Prioritize the runner or fight the escorts; escaped soldiers remain available to the regional battle.`;
  document.getElementById('world-skirmish-continue').textContent=practice?'Leave practice (Enter)':'Continue to exploration (Enter)';
  withdraw.textContent=practice?'Leave practice (Esc)':'Withdraw (Esc)';
  actor.setArmed(true);actor.setWeapon('oak-staff');
  let accumulator=0,ended=false,disposed=false,clickAttack=false,clickDodge=false,introRemaining=watch()?2:0,visualTime=0,lastDrawTime=0;
  const dodgeButton=document.getElementById('world-skirmish-dodge');
  document.getElementById('world-skirmish-strike').onclick=()=>{clickAttack=true;};
  dodgeButton.onclick=()=>{clickDodge=true;};
  const fallenAt=new Map();
  const pace=document.createElement('p');pace.id='world-skirmish-pace';panel.insertBefore(pace,hud);
  function draw(s,paused){
    const elapsed=visualTime-lastDrawTime,speed=elapsed>0?Math.min(4,Math.hypot(s.hero.x-position.x,s.hero.z-position.z)/elapsed):0;lastDrawTime=visualTime;
    position.set(s.hero.x,world.heightAt(s.hero.x,s.hero.z),s.hero.z);actor.group.position.copy(position);actor.group.rotation.y=s.hero.heading;
    if(!s.hero.hp&&!fallenAt.has('hero'))fallenAt.set('hero',visualTime);
    actor.animate(visualTime,speed,true,{action:!s.hero.hp?'dead':s.hero.dodge?'dodge':s.hero.hurt?'hurt':s.hero.swing?'attack':'idle',progress:!s.hero.hp?Math.min(1,(visualTime-fallenAt.get('hero'))/.4):s.hero.dodge?1-s.hero.dodge/T.dodge:s.hero.hurt?1-s.hero.hurt/T.hurt:s.hero.swing?1-s.hero.swing/T.swing:0});
    guards.forEach((guard,i)=>{const g=s.guards[i],y=world.heightAt(g.x,g.z);guard.group.position.set(g.x,y,g.z);guard.group.rotation.y=g.heading;guard.group.visible=!g.escaped;
      if(!g.hp&&!fallenAt.has(i))fallenAt.set(i,visualTime);
      guard.animate(visualTime,g.speed,true,encounterGuardPose(g,Math.min(1,(visualTime-(fallenAt.get(i)??visualTime))/.4)));});
    warnings.draw(s.guards,(x,z)=>world.heightAt(x,z));
    combatFeedback.draw(s);
    pace.hidden=!!s.outcome||!watch();
    pace.textContent=introRemaining>0?`Prepare: helping ${allyName??'your side'}. Soldiers advance in ${Math.ceil(introRemaining)}s. Campaign paused.`:'Watching combat at normal speed. P takes control.';
    rallyMarker.visible=beacon.visible=label.visible=!!setup.route&&!s.outcome;
    dodgeButton.disabled=!!s.hero.dodgeCooldown||!!s.outcome;
    dodgeButton.textContent=s.hero.dodgeCooldown?'Dodge recovering…':'Dodge (Space)';
    hud.textContent=`Health ${s.hero.hp}/100 · ${practice?'Defeated':'Stopped'} ${s.guards.filter(g=>!g.hp).length}/${guards.length}${!setup.route?'':' · Escaped '+s.guards.filter(g=>g.escaped).length+'/3'} · ${s.hero.dodgeCooldown?'Dodge recovering':'Dodge ready'}${s.time>60?' · '+Math.ceil(90-s.time)+'s remaining':''}${paused?' · Paused while window is inactive':''}`;
    if(lesson)objective.textContent=dodgeLesson(s,advanced).text;
    const runners=s.guards.filter(g=>g.hp>0&&g.phase==='march'),runner=s.guards.find(g=>g.role==='runner');
    warning.hidden=!!s.outcome||!runners.length&&!runner?.escaped;
    if(runner?.escaped)warning.textContent='The runner got through. Keep fighting: each escort you stop still counts.';
    else if(runner?.hp>0)warning.textContent=`Runner heading to rally: ${Math.ceil(Math.hypot(runner.x-rally.x,runner.z-rally.z))}m remaining. The escorts are buying time.`;
    else if(runners.length){const nearest=Math.min(...runners.map(g=>Math.hypot(g.x-rally.x,g.z-rally.z)));warning.textContent=`${runners.length} soldier${runners.length===1?' is':'s are'} heading toward the enemy rally point! Nearest: ${Math.ceil(nearest)}m. Intercept them before they get through.`;}
  }
  draw(model.snapshot(),false);
  return {snapshot:()=>({...model.snapshot(),site:pending.region+'-world',interception:true,rally:{...rally},radius:SKIRMISH_RADIUS,presentation:{introRemaining,speed:1}}),attack:()=>{clickAttack=true;},
    tick(dt,active){
      if(disposed)return;
      if(active)visualTime+=Math.min(.1,dt);
      if(ended){draw(model.snapshot(),!active);return;}
      if(!watch())introRemaining=0;
      if(introRemaining>0){if(active)introRemaining=Math.max(0,introRemaining-dt);keys.clear();clickAttack=clickDodge=false;draw(model.snapshot(),!active);return;}
      if(active)accumulator+=Math.min(.1,dt);else{accumulator=0;clickAttack=clickDodge=false;}
      while(accumulator>=1/60&&!ended){
        const intent=getMovementInput(keys),angle=yaw();
        const s=model.tick(1/60,watch()?encounterAutoplayInput(model.snapshot()):{x:-Math.sin(angle)*intent.forward+Math.cos(angle)*intent.side,z:-Math.cos(angle)*intent.forward-Math.sin(angle)*intent.side,attack:keys.has('KeyX')||clickAttack,dodge:keys.has('Space')||clickDodge});
        clickAttack=clickDodge=false;accumulator-=1/60;
        if(s.outcome){
          ended=true;keys.clear();draw(s,false);onEnd(s.outcome,s.objective?.reason);
          const feedback=practice?null:interceptionFeedback(s,{strength:reinforcements.strength,endsOn:pending.endsOn,regionName:site.name});
          document.getElementById('world-skirmish-result-title').textContent=practice?(lesson?(dodgeLesson(s,advanced).complete?(advanced?'Thrust and sweep lesson complete':'Dodge lesson complete'):'Try the dodge lesson again'):(s.outcome==='success'?'Practice complete':'Practice ended')):feedback.title;
          document.getElementById('world-skirmish-result-detail').textContent=practice?`${s.guards.filter(g=>!g.hp).length} of ${guards.length} soldiers defeated. ${s.hero.hp===0?'Teresod was defeated. ':''}${s.skill.dodgeCounters} dodge counters.${setup.route?' '+s.guards.filter(g=>g.escaped).length+' escaped.':''} Health remaining: ${s.hero.hp}/100. ${lesson?dodgeLesson(s,advanced).text+' ':''}No campaign troops or territory changed. Press R to try again.`:feedback.detail;
          for(const id of ['world-skirmish-objective','world-skirmish-controls','world-skirmish-health','world-skirmish-actions'])document.getElementById(id).hidden=true;
          resultPanel.hidden=false;withdraw.hidden=true;return;
        }
      }
      draw(model.snapshot(),!active);
    },
    dispose(){if(disposed)return;disposed=true;pace.remove();combatFeedback.dispose();panel.hidden=true;resultPanel.hidden=true;document.getElementById('world-skirmish-retry').hidden=true;keys.clear();actor.setArmed(false);for(const guard of guards)scene.remove(guard.group);warnings.dispose();scene.remove(rallyMarker,beacon,label);labelTexture.dispose();labelMaterial.dispose();beaconGeometry.dispose();rallyMaterial.dispose();ringGeometry.dispose();}
  };
}
