import * as THREE from 'three';
import {createCharacter} from '../../content/characters/characters.js';
import {getMovementInput} from '../../gameplay/movement/locomotion.js';

// Stable actor wrapper: mounts/combat retain their binding when the body changes.
export function createWarHero(look){
  const group=new THREE.Group(),rigs=new Map(),owned=new Set();let rig,form,spellPose=null,spellHeading=null,lastAnimation=[0,0,true,{}];
  function setForm(value){
    if(value===form)return;
    let next=rigs.get(value);
    if(!next){
      next=createCharacter({role:'traveler',hat:false,armed:false,...(value==='undead'?{skin:0xc9d5cf,tunic:0x625e6b}:{}),look:value==='undead'?{...look,hair:0xd5d5d0,hood:0x282232,longCloak:0x382f47}:look});
      if(value==='ghost')next.group.traverse(o=>{if(!o.isMesh)return;const tint=m=>{const c=m.clone();c.color.set(0xa7dfdf);c.transparent=true;c.opacity=.23;c.depthWrite=false;c.emissive?.set(0x284a52);owned.add(c);return c;};o.material=Array.isArray(o.material)?o.material.map(tint):tint(o.material);o.castShadow=false;});
      rigs.set(value,next);
    }
    if(rig)group.remove(rig.group);rig=next;group.add(rig.group);form=value;spellPose=spellHeading=null;rig.setArmed(false);
  }
  setForm('living');
  function animate(time,speed=0,grounded=true,pose={}){lastAnimation=[time,speed,grounded,pose];if(spellPose!==null&&spellHeading!==null)group.rotation.y=spellHeading;rig.animate(time,speed,grounded,{...pose,...(spellPose===null?{}:{spellCast:spellPose,handCast:true})});}
  return {group,setForm,get form(){return form;},animate,setSpellPose(progress,heading){spellPose=progress;if(progress===null)spellHeading=null;else if(Number.isFinite(heading))spellHeading=heading;animate(...lastAnimation);},
    focusTip:()=>rig.focusTip(),handTip:()=>rig.handTip(),setArmed:(...a)=>rig.setArmed(...a),setWeapon:(...a)=>rig.setWeapon(...a),setShield:(...a)=>rig.setShield(...a),
    dispose(){for(const m of owned)m.dispose();group.removeFromParent();}};
}

// Incorporeal movement crosses props, never the scenario boundary or unloaded land.
export function ghostStep(position,world,keys,yaw,dt,heading){
  const input=getMovementInput(keys),speed=keys.has('ShiftLeft')||keys.has('ShiftRight')?10:6;
  const dx=(-Math.sin(yaw)*input.forward+Math.cos(yaw)*input.side)*speed*dt,dz=(-Math.cos(yaw)*input.forward-Math.sin(yaw)*input.side)*speed*dt;
  const x=position.x+dx,z=position.z+dz;
  const base={speed:0,heading,grounded:true,swimming:false};
  if(!world.canExploreAt(x,z))return {...base,blockedBoundary:true};
  if(!world.readyAt(x,z))return {...base,waiting:{x,z}};
  position.x=x;position.z=z;position.y=Math.max(world.heightAt(x,z),world.waterAt(x,z))+.15;
  return {...base,speed:Math.hypot(dx,dz)/Math.max(dt,.001),heading:dx||dz?Math.atan2(dx,dz):heading};
}
