import {createArmyUnit} from '../../content/characters/army-unit-view.js';
import {createLizeemCommander} from '../../content/characters/lizeem-commanders.js';
import * as THREE from 'three';
import {disposeCharacter} from '../../content/characters/characters.js';
import {encounterGuardPose} from '../lizeem/encounter-presentation.js';
import {ALLIED_ASSAULT} from '../../gameplay/combat/allied-assault.js';
import {alliedLabelPlan} from './combat-labels.js';

// Friendly rings identify the line; only the captain and nearby wounded need labels.
export function createAlliedAssaultView(scene,world,count,color,commander=null,bodies=[]){
  const units=Array.from({length:count},(_,i)=>{
    const actor=commander&&i===count-1?createLizeemCommander(commander.faction):createArmyUnit({unitType:bodies[i]?.unitType??'ambron-soldier',weapon:bodies[i]?.weapon,tunic:new THREE.Color(color).getHex(),variant:i});actor.group.userData.worldSkirmish=true;actor.group.userData.encounterRole='ally';scene.add(actor.group);
    const canvas=document.createElement('canvas');canvas.width=192;canvas.height=64;
    const texture=new THREE.CanvasTexture(canvas),material=new THREE.SpriteMaterial({map:texture,depthTest:true,depthWrite:false}),label=new THREE.Sprite(material);label.scale.set(1.7,.57,1);label.userData.alliedLabel=true;scene.add(label);
    const ring=new THREE.Mesh(new THREE.RingGeometry(.57,.66,20),new THREE.MeshBasicMaterial({color:0x7ee9f1,side:THREE.DoubleSide,transparent:true,opacity:.85,depthWrite:false}));ring.rotation.x=-Math.PI/2;scene.add(ring);
    return {actor,canvas,texture,material,label,ring,hp:null,down:null};
  });
  const status=document.createElement('p');status.id='allied-assault-status';status.setAttribute('aria-live','polite');document.getElementById('world-skirmish-phase').after(status);
  return {draw(s,time){
    const plan=alliedLabelPlan(s);
    units.forEach((u,i)=>{const a=s.allies[i],y=world.heightAt(a.x,a.z);u.actor.group.position.set(a.x,y,a.z);u.actor.group.rotation.y=a.heading;
      u.actor.group.visible=!a.departed;
      if(!a.hp&&u.down===null)u.down=time;
      u.actor.animate(time,a.speed,true,encounterGuardPose(a,Math.min(1,(time-(u.down??time))/.4)));
      const detailed=a.id===plan.captain;
      u.label.position.set(a.x,y+(detailed?2.85:2.4),a.z);u.ring.position.set(a.x,y+.1,a.z);
      u.label.visible=plan.visible.has(a.id)&&!s.outcome;u.ring.visible=!!a.hp&&!a.departed&&Math.hypot(a.x-s.hero.x,a.z-s.hero.z)<18;
      u.label.scale.set(detailed?2:1,detailed?.57:.13,1);
      const key=`${a.hp}/${detailed}`;
      if(u.hp!==key){u.hp=key;const c=u.canvas.getContext('2d');c.clearRect(0,0,192,64);c.fillStyle='#12383de8';c.fillRect(0,0,192,64);
        if(detailed){c.fillStyle='#aff2f4';c.textAlign='center';c.font='bold 21px sans-serif';c.fillText(a.name??'Allied captain',96,27,178);}
        c.fillStyle='#28474a';c.fillRect(10,detailed?40:8,172,detailed?12:48);c.fillStyle='#83d5dc';c.fillRect(10,detailed?40:8,172*a.hp/(a.maxHp??ALLIED_ASSAULT.allyHealth),detailed?12:48);u.texture.needsUpdate=true;}
    });
    const alive=s.allies.filter(a=>a.hp&&!a.escaped).length,enemies=s.guards.filter(g=>g.hp&&!g.escaped).length;
    const text=`Allies ${alive}/${units.length} · Enemies ${enemies}${s.outcome==='success'?' · Field secured':s.squad.routed?' · Enemy line broken':''}`;
    const summary=text;
    if(status.textContent!==summary)status.textContent=summary;
  },dispose(){status.remove();for(const u of units){disposeCharacter(u.actor);u.label.removeFromParent();u.ring.removeFromParent();u.texture.dispose();u.material.dispose();u.ring.geometry.dispose();u.ring.material.dispose();}}};
}
