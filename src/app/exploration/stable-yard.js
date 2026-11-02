import * as THREE from 'three';
import {createHorse,groundShadow} from '../../content/characters/characters.js';
import {GUILD_HORSES} from '../../content/regions/minora-frontier/guild-stable-layout.js';
import {HORSE_BODY,stopAtHorse} from '../../gameplay/movement/horse-contact.js';

// A fixed, local cast: three horses reuse the normal idle rig. No herd AI,
// path searches, save records, or updates when the stable is out of range.
export function createStableYard(root,world){
  let time=0;
  const horses=GUILD_HORSES.map(def=>{
    const actor=createHorse({variant:def.variant}),shadow=groundShadow(.65);
    actor.group.name=def.id;actor.group.visible=shadow.visible=false;root.add(actor.group,shadow);
    return {def,actor,shadow,body:{...def,y:0},ready:false};
  });
  function update(dt,visible,work){
    time+=Math.max(0,dt);
    for(const h of horses){
      h.actor.group.visible=h.shadow.visible=visible(h.def);
      if(!h.actor.group.visible)continue;
      h.body.y=world.supportAt?.(h.def.x,h.def.z,{maxY:world.heightAt(h.def.x,h.def.z),stepUp:.35,groundSlope:false})?.height??world.heightAt(h.def.x,h.def.z);h.ready=true;
      h.actor.group.position.set(h.def.x,h.body.y,h.def.z);h.actor.group.rotation.y=h.def.yaw;
      h.shadow.position.set(h.def.x,h.body.y+.03,h.def.z);
      h.actor.animate(time+h.def.variant*3.1,0,true,{grazing:work?.horse===h.def.id&&work.task==='feeding'?true:undefined});
    }
  }
  function clearAt(x,z,radius){
    return horses.every(({def:h})=>{
      const dx=x-h.x,dz=z-h.z;
      if(Math.hypot(dx,dz)>3+radius)return true;
      const cross=dx*Math.cos(h.yaw)-dz*Math.sin(h.yaw),along=dx*Math.sin(h.yaw)+dz*Math.cos(h.yaw);
      return Math.hypot(cross,along-Math.max(HORSE_BODY.rear,Math.min(HORSE_BODY.front,along)))>=HORSE_BODY.radius+radius;
    });
  }
  function constrain(previous,next,radius=.34){
    let edge=null;
    for(const h of horses){
      if(!h.ready||Math.hypot(previous.x-h.body.x,previous.z-h.body.z)>Math.hypot(next.x-previous.x,next.z-previous.z)+3+radius)continue;
      const hit=stopAtHorse(previous,edge?{...next,...edge}:next,h.body,radius);if(hit)edge=hit;
    }
    return edge;
  }
  return {update,clearAt,constrain,state:()=>horses.map(h=>({id:h.def.id,...h.body,visible:root.visible&&h.actor.group.visible}))};
}

export function createBearCarePose(actor){
  const shoulder=actor.group.getObjectByName('Right Shoulder'),elbow=actor.group.getObjectByName('Right Elbow'),wrist=actor.group.getObjectByName('Right Wrist');
  const tools=new THREE.Group();tools.name='Bear / horse brush';wrist.add(tools);
  const back=new THREE.Mesh(new THREE.BoxGeometry(.16,.065,.11),new THREE.MeshStandardMaterial({color:0x725036,roughness:1}));
  const bristles=new THREE.Mesh(new THREE.BoxGeometry(.15,.045,.1),new THREE.MeshStandardMaterial({color:0xb6a27e,roughness:1}));
  back.position.y=-.07;bristles.position.y=-.12;tools.add(back,bristles);tools.visible=false;
  let weight=0;
  return (time,work,dt)=>{
    weight=THREE.MathUtils.damp(weight,work?1:0,8,Math.max(0,dt));tools.visible=work?.task==='brushing';
    if(weight<.001)return;
    const brush=work?.task==='brushing',motion=Math.sin(time*3.2);
    shoulder.rotation.x=THREE.MathUtils.lerp(shoulder.rotation.x,brush?-1.35+motion*.16:-1.1,weight);
    elbow.rotation.x=THREE.MathUtils.lerp(elbow.rotation.x,brush?-.45-motion*.13:-.8,weight);
  };
}
