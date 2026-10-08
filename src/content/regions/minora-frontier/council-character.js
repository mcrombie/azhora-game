import * as THREE from 'three';
import {createCharacter} from '../../characters/characters.js';
import {MINORA_COUNCIL} from './minora-council.js';
export function createCouncilCharacter(id){
  const info=MINORA_COUNCIL[id],actor=createCharacter({role:'mercenary',look:info.look,skin:info.skin,tunic:info.tunic,armed:false,hat:false});
  actor.setArmed(false);actor.group.name=info.title+' '+info.name;
  const head=actor.group.getObjectByName('Head'),chest=actor.group.getObjectByName('Chest');
  const mats=new Map(),mat=color=>{if(!mats.has(color))mats.set(color,new THREE.MeshStandardMaterial({color,roughness:.78,flatShading:true}));return mats.get(color);};
  function box(parent,color,x,y,z,w,h,d){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));m.position.set(x,y,z);parent.add(m);return m;}
  const gold='#d8b76e',ivory='#f0e2bd';
  if(id==='mayor'){
    // Spotswood's portrait informs the curls, formal coat and cravat. The seal
    // and civic colours belong to Minora, not to a real colonial government.
    box(chest,'#c4a773',0,.15,.197,.27,.4,.08);
    for(const side of [-1,1]){box(chest,'#214b42',side*.19,-.16,.015,.15,.7,.34);box(chest,gold,side*.12,.23,.24,.04,.33,.035).rotation.z=side*.2;}
    for(const y of [.01,.12,.23])box(chest,gold,0,y,.25,.04,.04,.03);
    box(chest,ivory,0,.32,.27,.14,.18,.05).rotation.z=.08;
    for(const s of [-1,1])box(chest,gold,s*.09,.32,.255,.035,.2,.03).rotation.z=s*.6;
    const seal=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,.03,8),mat(gold));seal.rotation.x=Math.PI/2;seal.position.set(0,.19,.285);chest.add(seal);
  }else{
    // Roman ceremonial drapery under an ivory mitre and a wine-red cope.
    const drape=box(chest,ivory,.01,.18,.21,.48,.15,.08);drape.rotation.z=-.42;
    for(const s of [-1,1]){box(chest,'#843d50',s*.21,-.15,-.12,.18,.91,.2);box(chest,gold,s*.12,-.05,.25,.06,.77,.04);box(head,ivory,s*.14,.06,-.19,.1,.44,.045);}
    const shape=new THREE.Shape();shape.moveTo(-.23,.33);shape.lineTo(-.23,.57);shape.lineTo(0,.88);shape.lineTo(.23,.57);shape.lineTo(.23,.33);shape.closePath();
    const mitre=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.15,bevelEnabled:false}),mat(ivory));mitre.position.z=-.095;head.add(mitre);
    box(head,gold,0,.47,.07,.045,.32,.02);box(head,gold,0,.37,.07,.44,.055,.02);
    const staff=new THREE.Mesh(new THREE.CylinderGeometry(.025,.032,1.9,6),mat(gold));staff.position.set(.48,1,0);actor.group.add(staff);
    const crook=new THREE.Mesh(new THREE.TorusGeometry(.13,.025,5,12,Math.PI*1.65),mat(gold));crook.position.set(.57,1.95,0);actor.group.add(crook);
  }
  return actor;
}
