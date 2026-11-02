import * as THREE from 'three';
import {createCharacter} from './characters.js';
import {applyArmyShieldPose} from './army-shield-pose.js';
import {addOrcFace} from './orc-appearance.js';
import {combatUnit,defaultHumanUnit} from '../../gameplay/combat/combat-units.js';

const held={sword:'simple-sword',spear:'ash-spear',axe:'bearded-axe',mace:'iron-mace'};
export function createArmyUnit({unitType,weapon,faction,officer=false,tunic=0x789e91,variant=0}={}){
  unitType=unitType??defaultHumanUnit({faction,officer});
  const profile=combatUnit(unitType,weapon),orc=unitType.includes('orc'),veteran=unitType.startsWith('veteran'),professional=unitType.includes('ambron');
  const actor=professional?createCharacter({role:veteran?'legion-officer':'legion-soldier',tunic,armed:true}):createCharacter({
    role:'mercenary',tunic:orc?(veteran?0x523d30:0x65553c):tunic,skin:orc?0x728052:[0xbc9472,0x9f7656,0xc7aa85,0x886148][variant%4],armed:true,hat:false,
    look:{weapon:profile.defense.type==='shield'?'sword-shield':'axe',headgear:'bare',hairStyle:orc?'bald':variant%2?'lank':'short',hair:orc?0x728052:0x49382b,facialHair:orc?'none':variant%3?'none':'stubble',garment:'jerkin',build:orc?(unitType==='orc-raider'?'bull':'broad'):'ordinary'},
  });
  actor.setWeapon(held[profile.weapon]);actor.setShield(profile.defense.type==='shield');
  applyArmyShieldPose(actor);
  const head=actor.group.getObjectByName('Head'),chest=actor.group.getObjectByName('Chest');
  const materials=new Map();
  function mesh(parent,name,geometry,color,position,scale=[1,1,1]){
    if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.75,flatShading:true}));
    const m=new THREE.Mesh(geometry,materials.get(color));m.name=name;m.position.set(...position);m.scale.set(...scale);parent.add(m);return m;
  }
  if(orc){
    actor.group.scale.set(1.13,unitType==='orc-raider'?1.16:1.23,1.13);head.scale.set(.82,.82,.82);
    addOrcFace(head);
    if(unitType!=='orc-raider'){
      mesh(chest,'Fitted orc cuirass',new THREE.BoxGeometry(.43,.34,.065),0x747d78,[0,.22,.217]);
      mesh(chest,'Cuirass central ridge',new THREE.BoxGeometry(.035,.32,.028),0xb1afa0,[0,.22,.26]);
      for(const side of [-1,1])mesh(chest,'Orc shoulder armor',new THREE.IcosahedronGeometry(1,0),0x6a706b,[side*.275,.37,0],[.115,.105,.15]);
      mesh(head,'Orc iron brow guard',new THREE.CylinderGeometry(.234,.235,.075,10,1,true),0x555b55,[0,.32,-.015],[1,1,.85]);
    }
  }
  if(veteran){
    const badge=mesh(chest,'Veteran sunburst honor badge',new THREE.CylinderGeometry(.075,.075,.018,8),0xd5b45c,[.12,.28,.255]);badge.rotation.x=Math.PI/2;
    mesh(chest,'Honor badge enamel',new THREE.IcosahedronGeometry(.037,0),orc?0xe4dbc0:0x7b2732,[.12,.28,.273]);
    if(orc)for(const side of [-1,1]){const crest=mesh(head,'Veteran ivory crest',new THREE.ConeGeometry(.035,.22,5),0xe8dbb7,[side*.12,.48,-.055]);crest.rotation.z=side*-.35;}
  }
  Object.assign(actor.group.userData,{armyUnit:unitType,weapon:profile.weapon,defense:profile.defense.type,armor:profile.armor,veteran});
  return actor;
}
