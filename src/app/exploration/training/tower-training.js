import * as THREE from 'three';
import {createCharacter,disposeCharacter,groundShadow} from '../../../content/characters/characters.js';
import {ROLLO_LOOK} from '../../../content/characters/rollo-look.js';
import {TALETH} from '../../../content/quests/lizeem-farmlands/taleth.js';
import {createWarHero} from '../afterlife-form.js';
import {encounterHeroPose} from '../../lizeem/encounter-presentation.js';
import {selectFireballTarget,focusCandidates} from '../../../gameplay/combat/combat-focus.js';
import {getMovementInput} from '../../../gameplay/movement/locomotion.js';
import {createEncounterWarnings,createEncounterTarget,encounterGuardPose} from '../../lizeem/encounter-presentation.js';
import {createTrainingScenery} from './chamber.js';
import {createTrainingModel,trainingLesson,TRAINING_LESSONS} from './training-model.js';
import {createTrainingView} from './training-view.js';

// A transient scene on the existing renderer. No campaign clock, saves, loading
// service, mount, player health or spell pool crosses into this room.
export function createTowerTraining({onExit,canvas,keys=new Set(),notice=()=>{}}){
  const scene=new THREE.Scene(),scenery=createTrainingScenery(scene),camera=new THREE.PerspectiveCamera(45,1,.1,180);
  const hero=createWarHero(ROLLO_LOOK);hero.setArmed(true);hero.setWeapon('oak-staff');scene.add(hero.group);
  const taleth=createCharacter({...TALETH,role:TALETH.modelRole,tunic:TALETH.color,armed:false});taleth.group.position.set(scenery.taleth.x,0,scenery.taleth.z);scene.add(taleth.group);
  // Contact discs anchor the figures to the featureless mist floor without
  // enabling character shadow maps or adding any animated lighting work.
  const heroShadow=groundShadow(.18),talethShadow=groundShadow(.16),guardShadow=groundShadow(.12);
  for(const shadow of [heroShadow,talethShadow,guardShadow]){shadow.scale.setScalar(.85);scene.add(shadow);}
  talethShadow.position.set(scenery.taleth.x,.018,scenery.taleth.z);guardShadow.visible=false;
  let guard=null,guardMaterials=[],guardOriginalMaterials=new Map(),paused=true,disposed=false,focusId=null,angle=Math.PI,pitch=.32,distance=18,visualTime=0,accumulator=0,gesture=0;
  let clickAttack=false,clickDodge=false,drag=null,lastPosition={...scenery.spawn},position={...scenery.spawn},roamHeading=Math.PI;
  function moveInRoom(body,x,z){
    let next=scenery.canMove(body,x,z);
    const dx=next.x-scenery.taleth.x,dz=next.z-scenery.taleth.z,length=Math.hypot(dx,dz);
    if(length<.95)next=scenery.canMove(body,scenery.taleth.x+(length?dx/length:1)*.95,scenery.taleth.z+(length?dz/length:0)*.95);
    return next;
  }
  const model=createTrainingModel({move:(body,dx,dz)=>moveInRoom(body,body.x+dx,body.z+dz)});
  const warnings=createEncounterWarnings(scene,1),targetMarker=createEncounterTarget(scene);
  const shotGeometry=new THREE.IcosahedronGeometry(1,1),flameCore=new THREE.MeshBasicMaterial({color:0xffeb9b}),flameGlow=new THREE.MeshBasicMaterial({color:0xef692c,transparent:true,opacity:.72,depthWrite:false});
  const shots=new Map(),sparks=new Map();
  const lockGeometry=new THREE.OctahedronGeometry(.2),lockMaterial=new THREE.MeshBasicMaterial({color:0x69e0eb});
  const lockMarker=new THREE.Mesh(lockGeometry,lockMaterial);scene.add(lockMarker);lockMarker.visible=false;
  const view=createTrainingView({select:selectLesson,pause:togglePause,exit,retry:()=>selectLesson(model.snapshot().lesson),next:()=>selectLesson(model.snapshot().next),attack:()=>{if(!paused)clickAttack=true;},cast,dodge:()=>{if(!paused)clickDodge=true;},focus:toggleFocus});
  function clearInput(){keys.clear();accumulator=0;clickAttack=clickDodge=false;drag=null;}
  function clearGuard(){
    // Restore the rig's borrowed cached materials before its normal disposal;
    // only these apparition clones belong exclusively to this presentation.
    for(const [mesh,material]of guardOriginalMaterials)mesh.material=material;
    if(guard)disposeCharacter(guard);for(const material of guardMaterials)material.dispose();
    guardOriginalMaterials.clear();guardMaterials=[];guard=null;
  }
  function selectLesson(id){
    if(disposed||!model.start(id))return false;
    clearInput();clearGuard();focusId=null;gesture=0;paused=false;angle=0;pitch=.42;distance=13;
    const definition=trainingLesson(id);position={...definition.hero};lastPosition={...position};roamHeading=Math.PI;
    guard=createCharacter({role:'legion-soldier',tunic:0x658a97,armed:!definition.passive});
    if(definition.passive){guard.setShield(false);guard.group.traverse(mesh=>{if(!mesh.isMesh||!mesh.material)return;guardOriginalMaterials.set(mesh,mesh.material);const clone=material=>{const next=material.clone();next.color.lerp(new THREE.Color(0x91d2e1),.56);next.transparent=true;next.opacity=.64;guardMaterials.push(next);return next;};mesh.material=Array.isArray(mesh.material)?mesh.material.map(clone):clone(mesh.material);});}
    guard.group.name='Taleth training apparition';scene.add(guard.group);canvas.focus();draw(0);return true;
  }
  function togglePause(){if(disposed)return;paused=!paused;clearInput();draw(0);if(paused)view.focusLesson();else canvas.focus();}
  function toggleFocus(){
    if(paused||model.snapshot().phase!=='running')return;
    const state=model.snapshot();focusId=focusId===null?(focusCandidates(state.hero,state.guards,angle)[0]?.id??null):null;
  }
  function cast(){
    if(paused||disposed)return false;
    const state=model.snapshot(),origin={x:position.x,y:1.5,z:position.z};
    const direction={x:-Math.sin(angle),y:0,z:-Math.cos(angle)},targets=state.guards.map(g=>({...g,y:1}));
    const aimed=selectFireballTarget(origin,direction,targets,{lockedId:focusId});
    if(aimed){direction.x=aimed.x-origin.x;direction.z=aimed.z-origin.z;}
    hero.setSpellPose(.5,Math.atan2(direction.x,direction.z));
    const hand=hero.focusTip()??hero.handTip(),source={x:hand.x,y:hand.y,z:hand.z};
    if(aimed){direction.x=aimed.x-source.x;direction.y=aimed.y-source.y;direction.z=aimed.z-source.z;}
    const result=model.cast(source,direction);
    if(result.ok)gesture=.45;else{hero.setSpellPose(null);if(result.reason)notice(result.reason);}return result.ok;
  }
  function exit(){if(!disposed)onExit();}
  function state(){const current=model.snapshot();return {...current,active:!disposed,paused,hero:{...current.hero,...position,...(current.phase==='running'?{}:{heading:roamHeading})},focusId,camera:{yaw:angle,pitch,distance,position:{x:camera.position.x,y:camera.position.y,z:camera.position.z},target:{x:position.x,y:1.2,z:position.z},near:camera.near,far:camera.far},portal:{...scenery.portal},nearPortal:Math.hypot(position.x-scenery.portal.x,position.z-scenery.portal.z)<=scenery.portalRadius,nearTaleth:Math.hypot(position.x-scenery.taleth.x,position.z-scenery.taleth.z)<3,scene:scenery.state?.()};}
  function makeFlame(){const group=new THREE.Group();for(let i=0;i<4;i++){const mesh=new THREE.Mesh(shotGeometry,i?flameGlow:flameCore);mesh.scale.setScalar(i===0?.19:i===1?.34:.12);if(i>1)mesh.position.z=-(i-1)*.22;group.add(mesh);}scene.add(group);return group;}
  function drawSpells(spell){
    for(const [collection,list]of [[shots,spell.shots],[sparks,spell.impacts]]){
      const live=new Set(list.map(shot=>shot.id));for(const [id,object]of collection)if(!live.has(id)){object.removeFromParent();collection.delete(id);}
      for(const shot of list){let object=collection.get(shot.id);if(!object){object=makeFlame();collection.set(shot.id,object);}object.position.set(shot.x,shot.y,shot.z);object.lookAt(shot.x+shot.dx,shot.y+shot.dy,shot.z+shot.dz);for(let i=2;i<object.children.length;i++)object.children[i].visible=collection===sparks||shot.travel>(i-1)*.22+.16;if(collection===sparks)object.scale.setScalar(1+shot.age*4);}
    }
  }
  function draw(dt){
    const current=state(),h=current.hero,running=current.phase==='running',speed=dt>0?Math.min(4,Math.hypot(position.x-lastPosition.x,position.z-lastPosition.z)/dt):0;
    hero.group.position.set(position.x,0,position.z);hero.group.rotation.y=h.heading;
    heroShadow.position.set(position.x,.018,position.z);
    hero.animate(visualTime,speed,true,running?encounterHeroPose(h):{action:'idle',progress:0});
    if(gesture>0){hero.setSpellPose(.5+(1-gesture/.45)*.5);if(dt)gesture=Math.max(0,gesture-dt);}else hero.setSpellPose(null);
    lastPosition={...position};
    guardShadow.visible=false;
    if(guard){const g=current.guards[0];guard.group.position.set(g.x,0,g.z);guard.group.rotation.y=g.heading;guard.group.visible=running&&g.hp>0;guard.animate(visualTime,g.speed,true,encounterGuardPose(g));guardShadow.position.set(g.x,.018,g.z);guardShadow.visible=guard.group.visible;}
    warnings.draw(current.guards.length?current.guards.map(g=>running?g:{...g,hp:0}):[{x:0,z:0,hp:0,phase:'down',heading:0,attack:'thrust',timer:0}]);targetMarker.draw({...current,outcome:running?null:'finished'});
    const locked=current.guards.find(g=>g.id===focusId&&g.hp>0);lockMarker.visible=running&&!!locked;if(locked)lockMarker.position.set(locked.x,2.7,locked.z);
    taleth.group.rotation.y=Math.atan2(position.x-scenery.taleth.x,position.z-scenery.taleth.z);taleth.animate(visualTime,0,true);
    const target=new THREE.Vector3(position.x,1.2,position.z);camera.position.set(target.x+Math.sin(angle)*distance*Math.cos(pitch),target.y+Math.sin(pitch)*distance,target.z+Math.cos(angle)*distance*Math.cos(pitch));
    // Keep the camera in front of the pavilion roof and walls when the player
    // walks back to its door. One static box is cheaper than mesh raycasts.
    const bounds=scenery.cameraBounds;
    if(bounds){
      const delta=camera.position.clone().sub(target);let enter=0,leave=1,hit=true;
      for(const axis of ['x','y','z']){
        const low=bounds['min'+axis.toUpperCase()],high=bounds['max'+axis.toUpperCase()],step=delta[axis];
        if(Math.abs(step)<1e-8){if(target[axis]<low||target[axis]>high)hit=false;continue;}
        const a=(low-target[axis])/step,b=(high-target[axis])/step;enter=Math.max(enter,Math.min(a,b));leave=Math.min(leave,Math.max(a,b));if(enter>leave)hit=false;
      }
      if(hit&&enter>0&&enter<1)camera.position.copy(target).addScaledVector(delta,Math.max(.04,enter-.4/distance));
      else if(hit&&enter===0){camera.position.set(target.x,Math.min(camera.position.y,4.8),bounds.minZ-.7);}
    }
    camera.lookAt(target);
    drawSpells(current.sorcery);view.draw(current);
  }
  function tick(dt,active=true){
    if(disposed)return;
    if(paused||!active){clearInput();draw(0);return;}
    const step=Math.min(.1,Math.max(0,dt));visualTime+=step;accumulator+=step;
    while(accumulator>=1/60){
      const intent=getMovementInput(keys),x=-Math.sin(angle)*intent.forward+Math.cos(angle)*intent.side,z=-Math.cos(angle)*intent.forward-Math.sin(angle)*intent.side;
      const before=model.snapshot();
      if(before.phase==='running'){
        const current=model.tick(1/60,{x,z,attack:keys.has('KeyX')||clickAttack,dodge:keys.has('Space')||clickDodge,focusId});position={x:current.hero.x,z:current.hero.z};
        if(current.phase!=='running'){roamHeading=current.hero.heading;clearInput();gesture=0;break;}
      }else if(x||z){const length=Math.max(1,Math.hypot(x,z));position=moveInRoom(position,position.x+x/length*4/60,position.z+z/length*4/60);roamHeading=Math.atan2(x,z);}
      clickAttack=clickDodge=false;accumulator-=1/60;
    }
    draw(step);
  }
  function keydown(event){
    if(disposed)return false;
    if(event.target?.closest?.('button')&&['Enter','Space'].includes(event.code))return true;
    if(event.code==='Tab'){event.preventDefault();view.focusNext(event.shiftKey);return true;}
    event.preventDefault();
    if(event.repeat)return true;
    if(event.code==='Escape')togglePause();
    else if(event.code==='KeyQ')cast();
    else if(event.code==='KeyT'||event.code==='KeyE')toggleFocus();
    else if(event.code==='KeyR'&&model.snapshot().lesson)selectLesson(model.snapshot().lesson);
    else if(event.code==='Enter'&&model.snapshot().phase==='complete'&&model.snapshot().next)selectLesson(model.snapshot().next);
    else if(event.code==='KeyF'&&state().nearPortal)exit();
    else if(event.code==='KeyF'&&state().nearTaleth){if(!paused)togglePause();}
    else if(paused&&/^Digit[1-4]$/.test(event.code))selectLesson(TRAINING_LESSONS[Number(event.code.slice(-1))-1].id);
    else if(!paused)keys.add(event.code);
    return true;
  }
  draw(0);view.focusLesson();
  return {tick,state,keydown,selectLesson,cast,attack(){if(!paused)clickAttack=true;},togglePause,pause(){if(!paused)togglePause();},resume(){if(paused)togglePause();},exit,
    render(renderer){const width=canvas.clientWidth||innerWidth,height=canvas.clientHeight||innerHeight;camera.aspect=width/Math.max(1,height);camera.updateProjectionMatrix();renderer.render(scene,camera);},
    pointerdown(event){if(event.button===0&&!paused)clickAttack=true;if(event.button===2)drag={x:event.clientX,y:event.clientY};canvas.focus();},
    pointermove(event){if(!drag||paused)return;angle-=(event.clientX-drag.x)*.005;pitch=Math.max(.14,Math.min(1.1,pitch+(event.clientY-drag.y)*.004));drag={x:event.clientX,y:event.clientY};},
    pointerup(){drag=null;},wheel(event){event.preventDefault();distance=Math.max(7,Math.min(22,distance+event.deltaY*.015));},
    dispose(){if(disposed)return;disposed=true;clearInput();view.dispose();clearGuard();warnings.dispose();targetMarker.dispose();disposeCharacter(taleth);disposeCharacter(hero);hero.dispose();scenery.dispose();shotGeometry.dispose();flameCore.dispose();flameGlow.dispose();lockGeometry.dispose();lockMaterial.dispose();for(const shadow of [heroShadow,talethShadow,guardShadow]){shadow.removeFromParent();shadow.material.dispose();}for(const object of [...shots.values(),...sparks.values(),lockMarker])object.removeFromParent();},
  };
}
