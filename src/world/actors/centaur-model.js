import * as THREE from 'three';
import {createCharacter,createHorse} from '../../content/characters/characters.js';

/** One continuous creature: four equine legs below a human torso. No rider,
 * saddle, reins, horse neck, or second head. Reuses the game's joint animators. */
export function createCentaur({variant=0,archer=false,envoy=false}={}){
  const horse=createHorse({variant,saddled:false}),human=createCharacter({role:'mercenary',hat:false,armed:true,
    tunic:envoy?0x547b70:[0x8b6343,0x68694d,0x946d48][variant%3],skin:[0xc29a70,0xb98861,0xd0a884][variant%3],
    look:{hairStyle:'short-cropped',hair:[0x2f2822,0x49342b,0x625247][variant%3],headgear:'bare',facialHair:'clean',
      garment:'jerkin',weapon:archer?'bow':'spear',build:'ordinary'}});
  const group=new THREE.Group();group.name=envoy?'Centaur peace envoy':'Yunethran centaur warrior';
  group.userData.creature='centaur';group.userData.legs=4;group.userData.archer=archer;
  const neck=horse.group.getObjectByName('Neck');if(neck)neck.visible=false;
  const body=human.group.children[0];
  const removed=body.children.filter(c=>c.isGroup&&Math.abs(c.position.y-.74)<.005&&Math.abs(Math.abs(c.position.x)-.105)<.005);
  for(const leg of removed){leg.visible=false;leg.name='Hidden human leg';}
  human.group.position.set(0,.58,.47);human.group.scale.set(1.07,1.07,1.07);
  horse.group.scale.set(1.2,1.18,1.27);group.add(horse.group,human.group);
  const bridge=new THREE.Mesh(new THREE.CylinderGeometry(.24,.32,.36,8),new THREE.MeshStandardMaterial({color:0x75533a,roughness:1,flatShading:true}));
  bridge.name='Continuous centaur waist';bridge.scale.z=.82;bridge.position.set(0,1.37,.5);group.add(bridge);
  // Leather travel rolls and a woven sidecloth are carried on their own backs.
  const cloth=new THREE.Mesh(new THREE.BoxGeometry(.76,.055,.5),new THREE.MeshStandardMaterial({color:envoy?0xb4bb8f:0x66533e,roughness:1}));
  cloth.position.set(0,1.49,-.42);cloth.name='Centaur travel cloth';group.add(cloth);
  const roll=new THREE.Mesh(new THREE.CylinderGeometry(.11,.11,.65,7),new THREE.MeshStandardMaterial({color:0xa4956d,roughness:1,flatShading:true}));
  roll.rotation.z=Math.PI/2;roll.position.set(0,1.59,-.5);group.add(roll);
  return {group,setArmed:human.setArmed,setShield:()=>{},setWeapon:human.setWeapon,
    animate(time,speed=0,grounded=true,pose={}){
      horse.animate(time,speed,grounded,{...pose,grazing:false});human.animate(time,speed*.25,grounded,{...pose,armed:true});
      for(const leg of removed)leg.visible=false;if(neck)neck.visible=false;
      human.group.position.y=.58+Math.sin(time*(speed>1?8:1.7))*(speed>1?.035:.004);
    }};
}
