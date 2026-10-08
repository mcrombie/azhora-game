import * as THREE from 'three';
import {createCharacter,disposeCharacter} from '../../content/characters/characters.js';
import {encounterGuardPose} from '../lizeem/encounter-presentation.js';
import {ALLIED_ASSAULT} from '../../gameplay/combat/allied-assault.js';

// At most three extra ordinary rigs, no AI or shadow map in the presentation.
export function createAlliedAssaultView(scene,world,count,color){
  const units=Array.from({length:count},(_,i)=>{
    const actor=createCharacter({role:'legion-soldier',tunic:new THREE.Color(color).getHex(),armed:true});actor.group.userData.worldSkirmish=true;actor.group.userData.encounterRole='ally';scene.add(actor.group);
    const canvas=document.createElement('canvas');canvas.width=192;canvas.height=64;
    const texture=new THREE.CanvasTexture(canvas),material=new THREE.SpriteMaterial({map:texture,depthTest:false,depthWrite:false}),label=new THREE.Sprite(material);label.scale.set(1.7,.57,1);label.userData.alliedLabel=true;scene.add(label);
    const ring=new THREE.Mesh(new THREE.RingGeometry(.57,.66,20),new THREE.MeshBasicMaterial({color:0x7ee9f1,side:THREE.DoubleSide,transparent:true,opacity:.85,depthWrite:false}));ring.rotation.x=-Math.PI/2;scene.add(ring);
    return {actor,canvas,texture,material,label,ring,hp:null,down:null};
  });
  const status=document.createElement('p');status.id='allied-assault-status';status.setAttribute('aria-live','polite');document.getElementById('world-skirmish-phase').after(status);
  return {draw(s,time){
    units.forEach((u,i)=>{const a=s.allies[i],y=world.heightAt(a.x,a.z);u.actor.group.position.set(a.x,y,a.z);u.actor.group.rotation.y=a.heading;
      if(!a.hp&&u.down===null)u.down=time;
      u.actor.animate(time,a.speed,true,encounterGuardPose(a,Math.min(1,(time-(u.down??time))/.4)));
      u.label.position.set(a.x,y+2.65,a.z);u.ring.position.set(a.x,y+.1,a.z);u.label.visible=u.ring.visible=!!a.hp;
      if(u.hp!==a.hp){u.hp=a.hp;const c=u.canvas.getContext('2d');c.clearRect(0,0,192,64);c.fillStyle='#12383de8';c.fillRect(0,0,192,64);c.fillStyle='#aff2f4';c.textAlign='center';c.font='bold 23px sans-serif';c.fillText('ALLY '+(i+1),96,27);c.fillStyle='#28474a';c.fillRect(10,40,172,12);c.fillStyle='#83d5dc';c.fillRect(10,40,172*a.hp/ALLIED_ASSAULT.allyHealth,12);u.texture.needsUpdate=true;}
    });
    const alive=s.allies.filter(a=>a.hp).length,enemies=s.guards.filter(g=>g.hp&&!g.escaped).length;
    const text=`Allies ${alive}/${units.length} · Enemies ${enemies}${s.outcome==='success'?' · Field secured':s.squad.routed?' · Enemy line broken':''}`;
    if(status.textContent!==text)status.textContent=text;
  },dispose(){status.remove();for(const u of units){disposeCharacter(u.actor);u.label.removeFromParent();u.ring.removeFromParent();u.texture.dispose();u.material.dispose();u.ring.geometry.dispose();u.ring.material.dispose();}}};
}
