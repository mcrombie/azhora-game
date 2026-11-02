import * as THREE from 'three';
import {createCharacter,disposeCharacter,groundShadow} from '../../../content/characters/characters.js';
import {ROLLO_LOOK} from '../../../content/characters/rollo-look.js';
import {TALETH} from '../../../content/quests/lizeem-farmlands/taleth.js';
import {createUguth} from '../../../content/characters/uguth.js';
import {createWarHero} from '../afterlife-form.js';
import {openWorldSkirmish} from '../world-skirmish.js';
import {createFireballHost} from '../fireball-host.js';
import {getMovementInput} from '../../../gameplay/movement/locomotion.js';
import {createArrivalProgress} from './arrival-progress.js';
import {COMBAT_TRIALS,configuredTrial,trialOpponent} from '../../../gameplay/combat/combat-trials.js';
import {COMBAT_LESSONS} from '../../../gameplay/combat/combat-tutorial.js';
import {createArrivalScenery} from './arrival-scenery.js';
import {createArrivalView} from './arrival-view.js';

/** A pre-campaign host, sharing the real trials, spell controller and actor rig.
 * No campaign/world is constructed until the player enters the Azhora door. */
export function runStillroomArrival({saved=null,store,soundtrack}){
  if(saved?.departed)return Promise.resolve();
  return new Promise((resolve,reject)=>createStillroomSession({saved,store,soundtrack,onExit:resolve,onError:reject}));
}

export function createStillroomSession({saved=null,store,soundtrack,onExit=()=>{},onError=error=>{throw error;},sharedRenderer=null,returnVisit=false}){
    const progress=createArrivalProgress(saved);
    const managed=!!sharedRenderer;
    const canvas=document.getElementById('exploration-canvas'),scene=new THREE.Scene(),room=createArrivalScenery(scene);
    const renderer=sharedRenderer??new THREE.WebGLRenderer({canvas,antialias:true});if(!managed){renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;}
    const camera=new THREE.PerspectiveCamera(55,innerWidth/innerHeight,.1,180),position=new THREE.Vector3(room.spawn.x,0,room.spawn.z);
    const hero=createWarHero(ROLLO_LOOK);hero.setArmed(false);scene.add(hero.group);
    const taleth=createCharacter({...TALETH,role:TALETH.modelRole,tunic:TALETH.color,armed:false});scene.add(taleth.group);taleth.group.position.set(3,0,20);
    const uguth=createUguth();uguth.group.position.set(-2.8,0,19.5);scene.add(uguth.group);
    const objectivePoint=new THREE.Vector3(),objectiveHeight=new THREE.Box3().setFromObject(uguth.group).max.y-uguth.group.position.y+.4;
    const shadows=[groundShadow(.2),groundShadow(.17),groundShadow(.2)];shadows.forEach(s=>scene.add(s));
    const world={bounds:{minX:-96,maxX:96,minZ:-96,maxZ:96},heightAt:()=>0,waterAt:()=>-1,readyAt:(x,z)=>Math.hypot(x,z)<96,regionAt:()=>({id:16}),colliders:room.colliders,nearColliders:()=>room.colliders};
    const keys=new Set(),abort=new AbortController();
    const listen=(target,type,fn,options={})=>target.addEventListener(type,fn,{...options,signal:abort.signal});
    let yaw=Math.PI,pitch=.16,distance=13.5,heading=0,visualTime=0,fight=null,round=0,activity='tutorial',drag=null,raf,disposed=false,focused=true,last=performance.now(),approaching=!saved?.introduced;
    let leaving=false,departurePoint=0,talethGone=!!saved?.introduced,speaker='uguth';
    taleth.group.visible=!talethGone;
    const departurePath=[{x:0,z:22},{x:0,z:29},{x:0,z:40.55}];
    const view=createArrivalView({returnVisit,handoff(){leaving=true;speaker='uguth';exploreRoom();view.notice('Taleth is returning to Minora. Speak with Uguth beside the refuge for your lessons.');},train:()=>startActivity('tutorial',progress.snapshot().lessons.length%COMBAT_LESSONS.length),challenge:index=>startActivity('challenge',index),duel:()=>startActivity('duel',0),explore:exploreRoom,skip(){progress.skip();persist();exploreRoom();view.notice('Uguth has cleared you to join Taleth. The Azhora door is open.');},depart,saveExit(){if(!persist())return;const url=new URL(location.href);url.searchParams.set('menu','1');location.href=url.href;},resume(){keys.clear();canvas.focus();}});
    const sorcery=createFireballHost({scene,world,actor:hero,position,yaw:()=>yaw,mode:()=>fight?'skirmish':'playing',inside:()=>!fight,canCast:()=>focused&&!view.active(),combat:()=>fight,onDirty(){},notice:view.notice});
    function persist(){const ok=store.save(progress.snapshot());if(!ok)view.notice('Progress could not be saved. Keep this session open.');return ok;}
    function near(at,r=2.7){return Math.hypot(position.x-at.x,position.z-at.z)<r;}
    function talk(kind='options'){
      keys.clear();if(!progress.snapshot().introduced){progress.introduce();persist();kind='intro';}speaker=kind==='intro'?'taleth':'uguth';
      view.show(kind,progress.snapshot());
    }
    function clearFight(){fight?.dispose();fight=null;sorcery.clear();sorcery.restore();keys.clear();hero.setArmed(false);hero.setSpellPose(null);uguth.group.visible=true;shadows[2].visible=true;}
    function exploreRoom(atDoor=false){
      const wasFighting=!!fight;clearFight();view.close();if(progress.snapshot().approved)view.notice('Taleth awaits in his chamber in Minora.');
      if(wasFighting){position.set(0,0,20);heading=0;yaw=Math.PI;pitch=.25;distance=10;}
      if(atDoor){position.set(0,0,36.5);heading=0;yaw=Math.PI;pitch=.25;distance=6.5;}
      approaching=false;canvas.focus();
    }
    function startActivity(kind,index){activity=kind;startTrial(index);}
    function continueTrial(){
      const result=fight?.snapshot();if(!result)return;
      if(result.outcome!=='success'||activity==='duel'){exploreRoom();talk();return;}
      const total=activity==='tutorial'?COMBAT_LESSONS.length:COMBAT_TRIALS.length;
      if(round+1>=total){exploreRoom(activity==='tutorial');return;}
      startTrial(round+1);
    }
    function startTrial(index){
      if(!progress.snapshot().introduced)return;
      clearFight();view.close();round=index;position.set(0,0,6);yaw=.28;pitch=.45;distance=10;heading=Math.PI;
      hero.group.position.copy(position);hero.group.rotation.y=heading;sorcery.restore();
      const lesson=activity==='tutorial'?COMBAT_LESSONS[round]:null;
      const opponent=activity==='duel'?trialOpponent('uguth'):lesson?trialOpponent(lesson.opponent):configuredTrial(round,'sword');
      const trial=lesson?{...opponent,lesson:lesson.name,description:lesson.instruction,instruction:lesson.instruction}:opponent;
      // The instructor is the opponent during his duel, never simultaneously
      // standing at the refuge watching his own double fight.
      uguth.group.visible=activity!=='duel';shadows[2].visible=activity!=='duel';
      fight=openWorldSkirmish({scene,world,actor:hero,position,keys,yaw:()=>yaw,centre:{x:0,z:0},site:{name:'The Spirit and Time Realm',regionId:16,approachHeading:0},enemyColor:'#a7755d',pending:{region:'stillroom-preparation'},practice:'trials',trial,tutorial:lesson?.id??null,tempo:activity==='duel'?'matched':'classic',round,reinforcements:{name:'Apparitions',strength:0},timeNotice:'Time stands still. Practice cannot harm Azhora.',
        onEnd(outcome){
          const result=fight.snapshot();
          if(lesson)progress.recordLesson(lesson.id,outcome,!!result.tutorial?.complete);
          else if(activity==='duel')progress.recordUguth(outcome);
          else progress.recordChallenge(trial.id,outcome);
          persist();
          const leave=document.getElementById('world-skirmish-leave');leave.hidden=false;leave.textContent='Return to Uguth';leave.onclick=()=>{exploreRoom();talk();};
          const title=document.getElementById('world-skirmish-result-title'),detail=document.getElementById('world-skirmish-result-detail'),next=document.getElementById('world-skirmish-continue');
          if(outcome!=='success'){leave.textContent='Explore the Stillroom';leave.onclick=()=>exploreRoom();title.textContent=activity==='duel'?'Uguth: Again, when you are ready':'A chance to try again';detail.textContent='No campaign time or resources were lost. Retry with full health and mana, or choose another activity with Uguth.';next.textContent='Return to Uguth';}
          else if(lesson){
            title.textContent=lesson.id==='militia'?'Uguth: You are ready for Azhora':'Lesson complete / '+lesson.name;
            detail.textContent=lesson.id==='militia'?'You have practiced your staff, blocking, dodging, countering and Fireball, and defeated a militiaman. Pass through the blue-lit door and speak with Taleth in his tower chamber. You can return here for the challenge or a duel whenever you wish.':'Technique demonstrated. The next lesson begins with full health and mana. You may return to Uguth now and resume later.';
            next.textContent=lesson.id==='militia'?'Go to the Azhora door':'Next lesson / '+COMBAT_LESSONS[round+1].name;
          }else if(activity==='duel'){leave.textContent='Explore the Stillroom';leave.onclick=()=>exploreRoom();title.textContent='Uguth yields';detail.textContent='You have bested the Battle Wizard. This optional victory is recorded separately from your training and challenge.';next.textContent='Return to Uguth';}
          else{detail.textContent=trial.name+' defeated. Challenge progress saved separately from your combat tutorial.';next.textContent=round+1<COMBAT_TRIALS.length?'Next opponent / '+COMBAT_TRIALS[round+1].name:'Challenge complete / Return to refuge';}
        },onContinue:continueTrial,onWithdraw:()=>exploreRoom(),
      });
      const retry=document.getElementById('world-skirmish-retry');retry.hidden=false;retry.onclick=()=>startTrial(round);
      document.getElementById('combat-trial-leave').textContent='Return to the refuge';
      const activityLabel=activity==='tutorial'?`COMBAT TRAINING TUTORIAL / LESSON ${round+1} OF ${COMBAT_LESSONS.length}`:activity==='duel'?'DUEL UGUTH / OPTIONAL MASTER CHALLENGE':`ESCALATING CHALLENGE / ROUND ${round+1} OF ${COMBAT_TRIALS.length}`;
      document.querySelector('#combat-trial-briefing .eyebrow').textContent=activityLabel+' / PAUSED';
      document.getElementById('world-skirmish-withdraw').textContent='Return to the refuge (Esc)';
      document.querySelector('#world-skirmish .eyebrow').textContent=activityLabel;
      canvas.focus();
    }
    function depart(){if(!returnVisit&&!progress.depart()){talk('portal');return;}persist();dispose();onExit();}
    function interact(){if(fight||approaching)return;if(near(room.portal))talk('portal');else if(near(uguth.group.position,3))talk();}
    function updateCamera(){
      const locked=fight?.cameraTarget();if(locked&&!drag){const desired=Math.atan2(position.x-locked.x,position.z-locked.z)+.28;yaw+=Math.atan2(Math.sin(desired-yaw),Math.cos(desired-yaw))*.12;}
      const target=new THREE.Vector3(position.x,1.35,position.z);
      if(view.active()&&!near(room.portal)){const npc=speaker==='taleth'?taleth:uguth;target.x=(position.x+npc.group.position.x)*.5;target.z=(position.z+npc.group.position.z)*.5;}
      const d=distance;camera.position.set(target.x+Math.sin(yaw)*d*Math.cos(pitch),target.y+Math.sin(pitch)*d,target.z+Math.cos(yaw)*d*Math.cos(pitch));
      if(position.z>25&&Math.abs(position.x)<7.6)camera.position.y=Math.min(camera.position.y,5.9);
      // Static boxes, including furnishing, shorten the boom before a wall.
      const delta=camera.position.clone().sub(target);let stop=1;
      for(const c of room.colliders){let enter=0,leave=1,hit=true;for(const [axis,lo,hi]of [['x',c.x-c.hx-.15,c.x+c.hx+.15],['y',c.minY,c.maxY],['z',c.z-c.hz-.15,c.z+c.hz+.15]]){if(Math.abs(delta[axis])<1e-8){if(target[axis]<lo||target[axis]>hi)hit=false;}else{const a=(lo-target[axis])/delta[axis],b=(hi-target[axis])/delta[axis];enter=Math.max(enter,Math.min(a,b));leave=Math.min(leave,Math.max(a,b));}if(enter>leave)hit=false;}if(hit&&enter>0)stop=Math.min(stop,Math.max(.08,enter-.03));}
      camera.position.copy(target).addScaledVector(delta,stop);camera.lookAt(target);
    }
    function step(dt){
      if(disposed)return;dt=Math.min(.1,Math.max(0,dt));const active=focused&&!view.active();if(active)visualTime+=dt;
      if(fight){fight.tick(dt,active);fight.settleResult(dt,focused);}
      else{
        let speed=0;
        if(active&&!approaching){const input=getMovementInput(keys),x=-Math.sin(yaw)*input.forward+Math.cos(yaw)*input.side,z=-Math.cos(yaw)*input.forward-Math.sin(yaw)*input.side;if(x||z){const scale=(keys.has('ShiftLeft')?6:4)*dt/Math.max(1,Math.hypot(x,z));let next=room.canMove(position,position.x+x*scale,position.z+z*scale);for(const npc of [uguth,...(talethGone?[]:[taleth])]){const at=npc.group.position,dx=next.x-at.x,dz=next.z-at.z,len=Math.hypot(dx,dz);if(len<.95)next=room.canMove(position,at.x+(len?dx/len:1)*.95,at.z+(len?dz/len:0)*.95);}speed=Math.hypot(next.x-position.x,next.z-position.z)/Math.max(.001,dt);position.set(next.x,0,next.z);heading=Math.atan2(x,z);}}
        hero.group.position.copy(position);hero.group.rotation.y=heading;hero.animate(visualTime,speed,true);
      }
      let talethSpeed=0;
      if(approaching&&active){const target={x:position.x+2.1,z:position.z+1.5},dx=target.x-taleth.group.position.x,dz=target.z-taleth.group.position.z,d=Math.hypot(dx,dz);if(d>.06){const move=Math.min(d,2.2*dt);taleth.group.position.x+=dx/d*move;taleth.group.position.z+=dz/d*move;taleth.group.rotation.y=Math.atan2(dx,dz);talethSpeed=2.2;}else{approaching=false;talk('intro');}}
      if(leaving&&active&&!talethGone){const target=departurePath[departurePoint],dx=target.x-taleth.group.position.x,dz=target.z-taleth.group.position.z,d=Math.hypot(dx,dz),move=Math.min(d,2.8*dt);if(d>.01){taleth.group.position.x+=dx/d*move;taleth.group.position.z+=dz/d*move;taleth.group.rotation.y=Math.atan2(dx,dz);talethSpeed=2.8;}if(d<=.06&&++departurePoint===departurePath.length){talethGone=true;leaving=false;taleth.group.visible=false;}}
      if(!approaching&&!leaving&&!talethGone)taleth.group.rotation.y=Math.atan2(position.x-taleth.group.position.x,position.z-taleth.group.position.z);
      // Always settle to an idle pose before dialogue freezes movement.
      taleth.animate(visualTime,talethSpeed,true);
      uguth.group.rotation.y=Math.atan2(position.x-uguth.group.position.x,position.z-uguth.group.position.z);uguth.animate(visualTime,0,true);
      shadows[0].position.set(position.x,.025,position.z);shadows[1].position.set(taleth.group.position.x,.025,taleth.group.position.z);
      shadows[1].visible=!talethGone;shadows[2].position.set(uguth.group.position.x,.025,uguth.group.position.z);
      sorcery.update(active?dt:0);updateCamera();view.draw(progress.snapshot(),{combat:!!fight,nearPortal:near(room.portal),nearUguth:near(uguth.group.position,3),approaching,leaving});if(!managed)soundtrack?.tick(dt);
    }
    function render(){
      renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.render(scene,camera);
      objectivePoint.copy(uguth.group.position);objectivePoint.y+=objectiveHeight;
      view.placeObjective(objectivePoint.project(camera));
    }
    function frame(now){if(disposed)return;try{step((now-last)/1000);last=now;render();raf=requestAnimationFrame(frame);}catch(error){dispose();onError(error);}}
    listen(document,'keydown',event=>{
      if(view.active())return;
      if(event.target?.closest?.('button,input,select,dialog'))return;
      if(event.code==='F5'){event.preventDefault();view.notice(persist()?'Preparation saved.':'Saving failed.');return;}
      if(fight?.keydown(event))return;
      if(event.repeat&&['Escape','KeyQ','KeyR','KeyF'].includes(event.code))return;
      if(event.code==='Escape'){event.preventDefault();keys.clear();if(fight)exploreRoom();else view.show('pause',progress.snapshot());}
      else if(event.code==='KeyR'&&fight){event.preventDefault();startTrial(round);}
      else if(event.code==='KeyQ'&&fight){event.preventDefault();sorcery.cast();}
      else if(event.code==='KeyF'&&!fight){event.preventDefault();interact();}
      else if(['KeyW','KeyA','KeyS','KeyD','KeyX','KeyF','Space','ShiftLeft','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code)){event.preventDefault();keys.add(event.code);}
    });
    listen(document,'keyup',event=>keys.delete(event.code));listen(window,'blur',()=>{focused=false;keys.clear();drag=null;});listen(window,'focus',()=>{focused=true;});
    listen(canvas,'contextmenu',e=>e.preventDefault());listen(canvas,'pointerdown',e=>{if(view.active())return;canvas.focus();if(e.button===2){drag={x:e.clientX,y:e.clientY};fight?.manualCamera();}else if(e.button===0)fight?.attack();});
    listen(window,'pointermove',e=>{if(!drag||view.active())return;yaw-=(e.clientX-drag.x)*.005;pitch=Math.max(.12,Math.min(.9,pitch+(e.clientY-drag.y)*.004));drag={x:e.clientX,y:e.clientY};});listen(window,'pointerup',()=>{drag=null;});
    listen(canvas,'wheel',e=>{e.preventDefault();distance=Math.max(4,Math.min(19,distance+e.deltaY*.012));},{passive:false});
    function dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);abort.abort();clearFight();sorcery.dispose();view.dispose();room.dispose();disposeCharacter(hero);hero.dispose();disposeCharacter(taleth);disposeCharacter(uguth);shadows.forEach(s=>{s.removeFromParent();s.material.dispose();});if(!managed)renderer.dispose();delete window.__STILLROOM__;if(!managed)soundtrack?.bind(()=>({mode:'loading'}));}
    listen(window,'pagehide',()=>{persist();dispose();});
    if(!managed)soundtrack?.bind(()=>({mode:fight?'skirmish':'playing',training:true,trial:fight?.musicState(),reviewing:!!fight?.reviewing(),active:focused}));
    document.getElementById('loading-screen').hidden=true;canvas.focus();
    if(saved?.introduced)exploreRoom();
    if(returnVisit){position.set(0,0,37.8);heading=Math.PI;yaw=0;pitch=.25;distance=6.5;}
    if(!saved)persist();
    // Read-only snapshots and ordinary input seams used by the native checks.
    if(new URLSearchParams(location.search).has('test'))window.__STILLROOM__={
      state:()=>({...state(),progress:progress.snapshot(),position:{x:position.x,y:position.y,z:position.z},approaching,leaving,talethGone,dialogue:view.active(),activity,round,encounter:fight?.snapshot()??null,scenery:room.state(),clock:0}),
      snapshot:()=>({camera:{yaw,pitch,distance}}),hold:(code,on)=>on?keys.add(code):keys.delete(code),step,
      look(v){yaw=v.yaw??yaw;pitch=v.pitch??pitch;distance=v.distance??distance;updateCamera();},
      visit(p){const next=room.canMove(position,p.x,p.z);position.set(next.x,0,next.z);step(0);},
      sorcery,testHero:hero,testTaleth:taleth,testUguth:uguth,save:persist,renderStats:()=>({...renderer.info.render,geometries:renderer.info.memory.geometries}),
    };
    function state(){return {paused:view.active(),returnVisit,progress:progress.snapshot(),hero:{x:position.x,y:position.y,z:position.z},portal:{...room.portal},talethGone,leaving,uguth:{x:uguth.group.position.x,z:uguth.group.position.z},nearPortal:near(room.portal),trial:fight?.musicState()};}
    step(0);if(!managed){render();raf=requestAnimationFrame(frame);}
    // The exploration host forwards control ownership here; our listeners
    // consume input once, and its renderer draws this scene once per frame.
    return {tick(dt,active=true){focused=active;step(dt);},render,state,dispose,exit:depart,
      pause(){keys.clear();view.show('pause',progress.snapshot());},resume(){view.close();keys.clear();canvas.focus();},
      keydown(){},pointerdown(){},pointermove(){},pointerup(){},wheel(){}};
}
