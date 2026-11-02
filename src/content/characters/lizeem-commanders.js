import * as THREE from 'three';
import {createCharacter} from './characters.js';
import {LIZEEM_CHAMPIONS} from '../scenarios/lizeem-champions.js';
import {applyArmyShieldPose} from './army-shield-pose.js';

// Two authored silhouettes on the existing articulated rig. Only captains use
// these few additional meshes; ordinary soldiers keep their inexpensive models.
export function createLizeemCommander(faction){
  const c=LIZEEM_CHAMPIONS[faction];if(!c)throw Error('Unknown Lizeem commander.');
  const west=faction==='west',actor=createCharacter({role:'mercenary',armed:true,tunic:west?0x376f65:0x9f4338,skin:west?0xd2a17b:0xb88867,look:{...c.look,weapon:'sword-shield'}});
  actor.group.name=c.name;actor.group.userData.commanderId=c.id;
  actor.setWeapon('simple-sword');actor.setShield(true);applyArmyShieldPose(actor);
  const head=actor.group.getObjectByName('Head'),chest=actor.group.getObjectByName('Chest');
  const cloth=new THREE.MeshStandardMaterial({color:west?0xe1d3ac:0xeee3c3,roughness:1,flatShading:true});
  const metal=new THREE.MeshStandardMaterial({color:west?0x8a9b9c:0xb08d4c,roughness:.55,metalness:.35,flatShading:true});
  const trim=new THREE.MeshStandardMaterial({color:west?0x213f37:0x752c27,roughness:1,flatShading:true});
  function piece(parent,name,geometry,mat,position,scale=[1,1,1]){const m=new THREE.Mesh(geometry,mat);m.name=name;m.position.set(...position);m.scale.set(...scale);m.castShadow=true;parent.add(m);return m;}
  piece(chest,'Captain breastplate',new THREE.BoxGeometry(.45,.38,.08),metal,[0,.16,.19]);
  piece(chest,west?'Cream shoulder mantle':'Ivory command cloak',new THREE.CylinderGeometry(.26,.38,.7,7,1,true,0,Math.PI),cloth,[0,.05,-.10],[1,1,.55]);
  for(const side of [-1,1])piece(chest,'Gilt shoulder guard',new THREE.SphereGeometry(.13,6,4),metal,[side*.3,.4,0],[1,.5,1.3]);
  if(west){
    const leaf=piece(chest,'Oak leaf of Ovesos',new THREE.OctahedronGeometry(.1),trim,[-.13,.28,.255],[.5,1,.22]);leaf.rotation.z=-.35;
    piece(head,'Copper captain hair knot',new THREE.IcosahedronGeometry(.09,0),new THREE.MeshStandardMaterial({color:0x995132,flatShading:true}),[0,.37,-.16]);
  }else{
    piece(head,'Bronze helmet brow',new THREE.TorusGeometry(.217,.024,4,12),metal,[0,.32,0]).rotation.x=Math.PI/2;
    piece(head,'Ivory transverse crest',new THREE.BoxGeometry(.46,.18,.09),cloth,[0,.53,-.01]);
    piece(head,'Red crest spine',new THREE.BoxGeometry(.48,.045,.1),trim,[0,.635,-.01]);
    piece(chest,'Sun of Nesdor',new THREE.CylinderGeometry(.07,.07,.025,8),cloth,[0,.25,.25]).rotation.x=Math.PI/2;
  }
  return actor;
}
