import * as THREE from 'three';
import {createHorse,disposeCharacter} from '../../characters/characters.js';
import {createCentaur} from '../../../world/actors/centaur-model.js';
import {createCelderKnight} from '../../../world/actors/celder-knight.js';
import {RIDE} from '../../../gameplay/movement/riding.js';

const angle=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const clamp=(v,a=0,b=1)=>THREE.MathUtils.clamp(Number(v)||0,a,b);
const rigs=new WeakMap(),up=new THREE.Vector3(0,1,0),direction=new THREE.Vector3(),rotation=new THREE.Quaternion(),parentRotation=new THREE.Quaternion();
function rig(actor){
  if(!rigs.has(actor)){
    const group=actor.group,chest=group.getObjectByName('Chest');
    rigs.set(actor,{chest,body:chest?.parent,head:chest?.getObjectByName('Head'),
      hips:['Left','Right'].map(s=>group.getObjectByName(s+' Hip')),
      knees:['Left','Right'].map(s=>group.getObjectByName(s+' Knee')),
      ankles:['Left','Right'].map(s=>group.getObjectByName(s+' Ankle')),
      shoulders:['Left','Right'].map(s=>chest?.getObjectByName(s+' Shoulder')),
      elbows:['Left','Right'].map(s=>chest?.getObjectByName(s+' Elbow')),
      cloak:group.getObjectByName('Traveler cloak hem')??group.getObjectByName('Heavy wool cloak')});
  }return rigs.get(actor);
}
// Align the actual weapon, after all parent joints animate, with the committed
// attack direction. Neither a turning horse nor a residual wrist pose can make
// the displayed shaft point opposite the simulation's shot/contact heading.
function aimWeapon(weapon,yaw,{bow=false,elevation=0}={}){
  if(!weapon)return;weapon.parent.updateWorldMatrix(true,false);
  if(bow)rotation.setFromAxisAngle(up,yaw);
  else rotation.setFromUnitVectors(up,direction.set(Math.sin(yaw)*Math.cos(elevation),Math.sin(elevation),Math.cos(yaw)*Math.cos(elevation)));
  weapon.quaternion.copy(weapon.parent.getWorldQuaternion(parentRotation).invert().multiply(rotation));
}
function sit(r,time,speed){
  const gait=clamp(speed/12),beat=Math.sin(time*(5.5+gait*8))*.012*gait;
  for(let i=0;i<2;i++){
    const hip=r.hips[i];if(hip)hip.rotation.set(-1.08,0,Math.sign(hip.position.x||1)*.65);
    r.knees[i]?.rotation.set(1.22,0,0);r.ankles[i]?.rotation.set(-.12,0,0);
  }
  // Both rigs retain a standing pelvis origin. Merely bending their legs leaves
  // them hovering above the saddle. Place that pelvis on its padded seat.
  const hip=r.hips.find(Boolean);
  if(r.body&&hip){r.body.rotation.set(0,0,0);r.body.position.y=1.43-RIDE.seat.up-hip.position.y*r.body.scale.y+beat;
    r.body.position.z=.14-RIDE.seat.forward-hip.position.z*r.body.scale.z;}
  if(r.cloak)r.cloak.rotation.x=.58+gait*.06;
}
function drawBow(r,amount){
  // The older foot-archery pose faces -Z; this encounter, its mounts and its
  // projectile model face +Z. Mirror the draw's pitch, preserving its spread
  // between the extended bow hand and the string hand beside the cheek.
  const draw=clamp(amount);
  r.shoulders[0]?.rotation.set(-1.54,0,-.06);r.elbows[0]?.rotation.set(.04,0,0);
  r.shoulders[1]?.rotation.set(-THREE.MathUtils.lerp(1.30,.34,draw),0,.16+draw*.46);
  r.elbows[1]?.rotation.set(THREE.MathUtils.lerp(.42,2.34,draw),0,0);
  if(r.chest){r.chest.rotation.x=.02;r.chest.rotation.z=0;}
}
// The shared riding pose holds reins and overwrites bow shoulders. Animate the
// upper body first, then seat only the lower body, keeping the bow draw intact.
export function cavalryRiderPose(actor,time,speed,{draw=0,aim=0,swing=0}={}){
  actor.animate(time,0,true,{armed:true,draw,action:swing?'attack':'idle',progress:swing?clamp(1-swing/.5):0});
  const r=rig(actor);sit(r,time,speed);
  const turn=clamp(aim,-1.7,1.7);if(r.chest)r.chest.rotation.y=turn;
  const bow=actor.group.getObjectByName('Hunting bow (held)');
  if(draw>0&&bow?.visible){drawBow(r,draw);actor.group.updateWorldMatrix(true,false);
    const heading=new THREE.Euler().setFromQuaternion(actor.group.getWorldQuaternion(new THREE.Quaternion()),'YXZ').y;
    aimWeapon(bow,heading+turn,{bow:true});}
}
/** The on-foot counterpart keeps the ordinary gait and dodge, while sharing
 * the encounter's +Z bow convention. Timers are remaining seconds, as in the
 * model: a staff swing lasts .5 seconds and a foot dodge lasts .3 seconds. */
export function cavalryFootPose(actor,time,speed,{draw=0,aim=0,swing=0,dodge=0}={}){
  const action=dodge?'dodge':swing?'attack':'idle';
  const drawing=action==='idle'?clamp(draw):0;
  actor.animate(time,speed,true,{armed:true,draw:drawing,action,
    progress:dodge?clamp(1-dodge/.3):swing?clamp(1-swing/.5):0});
  const bow=actor.group.getObjectByName('Hunting bow (held)');
  if(drawing&&bow?.visible){
    const r=rig(actor),turn=clamp(aim,-1.7,1.7);drawBow(r,drawing);
    if(r.chest)r.chest.rotation.y=turn;
    actor.group.updateWorldMatrix(true,false);
    const heading=new THREE.Euler().setFromQuaternion(actor.group.getWorldQuaternion(new THREE.Quaternion()),'YXZ').y;
    aimWeapon(bow,heading+turn,{bow:true});
  }
}
export function createCavalryHorse(variant=0){
  const horse=createHorse({variant,saddled:true});let disposed=false;
  return {...horse,dispose(){if(disposed)return;disposed=true;disposeCharacter(horse);}};
}
function thrustProgress(timer){
  const p=clamp(1-timer/.3);
  // Contact is at .08 seconds: the shaft reaches full extension then, holds
  // briefly, and retracts before the long, punishable recovery.
  return p<.267?THREE.MathUtils.smoothstep(p,0,.267):1-THREE.MathUtils.smoothstep(p,.65,1)*.7;
}
function armsForLance(r,{wind=0,drive=0,recovery=0,charge=0,centaur=false}){
  const arm=r.shoulders[1],elbow=r.elbows[1];
  // The custom Celder rig calls its weapon side Right, as does the human rig.
  if(arm)arm.rotation.set(.08-wind*.12-drive*1.24-charge*.46+recovery*.13,0,centaur?.12:-.13);
  if(elbow)elbow.rotation.set(-.35-wind*.95+drive*.22-charge*.26,0,0);
  if(r.shoulders[0])r.shoulders[0].rotation.set(-.4+recovery*.28,0,.14);
  if(r.elbows[0])r.elbows[0].rotation.x=-.5+recovery*.22;
}
export function createYunethreCombatActor(kind,index=0){
  const centaur=kind==='centaur-archer',actor=centaur?createCentaur({archer:true,variant:index}):createCelderKnight();
  const group=new THREE.Group();group.name=centaur?'Reed Kin / mounted archer':'Celder / lancer';
  const horse=centaur?null:createCavalryHorse(index);if(horse)group.add(horse.group);group.add(actor.group);
  const r=rig(actor),bow=centaur?actor.group.getObjectByName('Hunting bow (held)'):null;
  // createCentaur captures owned geometry at construction. This later weapon
  // has separate ownership, including its unique spearhead and materials.
  if(centaur)actor.setWeapon('ash-spear');
  const spear=actor.group.getObjectByName(centaur?'Ash spear':'Celder winged spear');
  if(centaur)actor.setWeapon(null);
  let fall=0,lastAttack=null,previousPhase=null,recoveryDuration=0,weapon=null,disposed=false;
  return {group,update(unit,time,dt,height){
    if(disposed)return;
    group.position.set(unit.x,height,unit.z);group.rotation.set(0,unit.heading,0);
    if(unit.hp<=0){fall=Math.min(1,fall+Math.max(0,dt)*1.7);group.rotation.z=fall*1.22;group.position.y-=fall*.45;return;}
    const melee=unit.phase==='melee-windup'||unit.phase==='melee-strike',recovering=unit.phase==='recover';
    if(melee)lastAttack='melee';else if(unit.phase==='draw')lastAttack='arrow';else if(unit.phase.startsWith('charge'))lastAttack='charge';
    if(recovering&&previousPhase!=='recover')recoveryDuration=unit.timer;
    previousPhase=unit.phase;
    const wind=unit.phase==='melee-windup'?clamp(1-unit.timer/(centaur?.8:.85)):0;
    const drive=unit.phase==='melee-strike'?thrustProgress(unit.timer):0;
    const recover=recovering?clamp(unit.timer/(recoveryDuration||2.1)):0;
    const hurt=clamp(unit.hurt/.25),aim=Number.isFinite(unit.aimHeading)?unit.aimHeading:unit.heading;
    const useSpear=melee||recovering&&lastAttack==='melee'||unit.arrows===0;
    let heldAim=null;
    let drawing=unit.phase==='draw'?Math.max(.03,clamp(1-unit.timer/1.25)):0;
    if(recovering&&lastAttack==='arrow')drawing=clamp(1-(recoveryDuration-unit.timer)/.3);
    if(centaur){
      const next=useSpear?'ash-spear':null;if(next!==weapon){actor.setWeapon(next);weapon=next;}
      if(bow)bow.visible=!useSpear;
      actor.animate(time,unit.speed,true,{draw:useSpear?0:drawing,armed:true,
        action:unit.phase==='melee-windup'?'windup':unit.phase==='melee-strike'?'attack':useSpear&&recovering?'recover':'idle',
        attackStyle:useSpear?'thrust':undefined,progress:wind||drive||1-recover});
      if(useSpear)armsForLance(r,{wind,drive,recovery:recover,centaur:true});
      else if(drawing)drawBow(r,drawing);
      if(r.chest){r.chest.rotation.y=melee||drawing?clamp(angle(aim,unit.heading),-1.7,1.7):0;
        if(useSpear)r.chest.rotation.x=-wind*.08+drive*.18+recover*.16;}
      if(useSpear)heldAim={node:spear,elevation:melee?.28*(1-wind)*(1-drive):recovering?-.28:.9};
      else if(drawing)heldAim={node:bow,bow:true};
      const arrow=bow?.getObjectByName('Nocked arrow');if(arrow&&recovering)arrow.visible=false;
    }else{
      horse.animate(time,unit.speed,true);actor.group.position.set(0,RIDE.seat.up,RIDE.seat.forward);
      cavalryRiderPose(actor,time,unit.speed);
      const charge=unit.phase==='charge'?1:unit.phase==='charge-windup'?clamp(1-unit.timer/1.5):0;
      armsForLance(r,{wind,drive,recovery:recover,charge});
      if(r.chest){r.chest.rotation.y=melee||charge?clamp(angle(aim,unit.heading),-1.7,1.7):0;r.chest.rotation.x=drive*.16+charge*.21+recover*.17;}
      const elevation=melee?.45*(1-wind)*(1-drive):unit.phase==='charge'?.015:unit.phase==='charge-windup'?1.25*(1-charge):recovering?-.3:1.35;
      heldAim={node:spear,elevation};
    }
    // Brief recoil without tinting shared materials or interrupting attack aim.
    if(r.chest){r.chest.rotation.x-=hurt*.19;r.chest.rotation.z=hurt*.09*(index%2?1:-1);}
    if(r.head){r.head.rotation.x-=hurt*.09;r.head.rotation.y=0;}
    if(heldAim)aimWeapon(heldAim.node,aim,heldAim);
  },dispose(){if(disposed)return;disposed=true;
    if(centaur&&spear)disposeCharacter({group:spear});
    actor.dispose();horse?.dispose();group.removeFromParent();}};
}
