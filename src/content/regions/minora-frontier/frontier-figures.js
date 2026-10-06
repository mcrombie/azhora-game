import * as THREE from 'three';
import {createCharacter} from '../../characters/characters.js';
import {createCentaur} from '../../../world/actors/centaur-model.js';
export function createFrontierFigure(npc){
  if(npc.centaur)return createCentaur(npc);
  const actor=createCharacter({role:npc.modelRole,tunic:npc.color,skin:npc.skin,look:npc.look,armed:!!npc.armed,hat:false});
  if(!npc.prince)return actor;
  const body=actor.group.children[0],blood=npc.id==='prince-wilhelm';
  const cloak=new THREE.Mesh(new THREE.CylinderGeometry(.24,.38,.8,8,1,true,0,Math.PI),
    new THREE.MeshStandardMaterial({color:blood?0x702631:0xe0d6b9,side:THREE.DoubleSide,roughness:1,flatShading:true}));
  cloak.name='Princely mantle';cloak.rotation.y=Math.PI/2;cloak.position.set(0,.92,-.16);body.add(cloak);
  const clasp=new THREE.Mesh(new THREE.SphereGeometry(.075,8,5),new THREE.MeshStandardMaterial({color:0xcbaa57,metalness:.4,roughness:.6}));
  clasp.name='Royal clasp';clasp.scale.set(1,1.2,.3);clasp.position.set(.14,1.23,.15);body.add(clasp);
  actor.group.userData.prince=npc.id;actor.group.userData.hairStyle=npc.look.hairStyle;return actor;
}
