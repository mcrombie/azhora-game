import * as THREE from 'three';
import {createCharacter,createRockTroll,BUCKLER_NAME} from './characters.js';
import {DWARF_PROPORTIONS} from '../../world/actors/dwarf-model.js';

export function createAdvancedTrialActor(id){
  if(!['elven-duelist','dwarven-shieldwarden','rogue-battlemage','regenerating-troll','undead-knight'].includes(id))return null;
  const dwarf=id==='dwarven-shieldwarden',mage=id==='rogue-battlemage',elf=id==='elven-duelist',troll=id==='regenerating-troll',undead=id==='undead-knight';
  const actor=troll?createRockTroll({scale:2.65}):createCharacter({role:mage?'traveler':'mercenary',armed:true,hat:false,
    tunic:elf?0x395c55:dwarf?0x3b5062:mage?0x824e39:0x3c4547,skin:undead?0xa9b4a2:elf?0xd5bca0:0xbc916d,
    look:{weapon:dwarf?'sword-shield':'sword',headgear:'bare',hairStyle:elf?'long-tied':undead?'bald':'short-cropped',
      hair:elf?0xc4bb91:mage?0x322c29:0x75462a,facialHair:dwarf?'forked':mage?'trimmed':'clean',garment:mage?'robe':elf?'short-cloak':'gambeson',build:dwarf?'broad':elf?'slight':'ordinary'}});
  const root=actor.group,head=root.getObjectByName('Head'),chest=root.getObjectByName('Chest'),body=root.getObjectByName('Weight and hips');
  const materials=new Map();
  function part(parent,name,geometry,color,position,scale=[1,1,1],glow=false){
    const key=color+':'+glow;
    if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,roughness:.7,metalness:glow?0:.25,flatShading:true,emissive:glow?color:0,emissiveIntensity:glow?.8:0}));
    const m=new THREE.Mesh(geometry,materials.get(key));m.name=name;m.position.set(...position);m.scale.set(...scale);parent.add(m);return m;
  }
  const box=(parent,name,color,p,s)=>part(parent,name,new THREE.BoxGeometry(...s),color,p);
  const gem=(parent,name,color,p,s,glow=false)=>part(parent,name,new THREE.IcosahedronGeometry(1,0),color,p,s,glow);
  function armor(color,edge){
    box(chest,'Forged breastplate',color,[0,.2,.205],[.42,.34,.075]);
    box(chest,'Breastplate ridge',edge,[0,.2,.253],[.035,.33,.022]);
    for(const side of [-1,1]){
      gem(chest,'Layered shoulder armor',color,[side*.29,.34,0],[.15,.12,.2]);
      for(let n=0;n<3;n++)box(chest,'Overlapping waist plates',color,[side*.12,-.08-n*.065,.19],[.22,.07,.055]);
      const knee=root.getObjectByName((side<0?'Left':'Right')+' Knee');
      box(knee,'Riveted greave',color,[0,-.14,.1],[.13,.23,.04]);
    }
  }
  let shield=null,focus=null,lifeGlow=null;
  if(elf){
    root.scale.set(.94,1.12,.94);head.scale.set(.92,.95,.92);actor.setWeapon('simple-sword');actor.setShield(false);
    for(const side of [-1,1]){
      const ear=part(head,'Elven pointed ear',new THREE.ConeGeometry(.045,.23,4),0xd5bca0,[side*.24,.22,-.015]);ear.rotation.z=-side*1.12;
      box(chest,'Silver leaf clasp',0xbdc7b5,[side*.16,.34,.22],[.045,.08,.02]).rotation.z=side*.3;
      box(chest,'Crossed dueling sash',0xb3b899,[side*.08,.17,.23],[.035,.38,.025]).rotation.z=side*.37;
    }
    const sword=root.getObjectByName('Traveler weapon grip');sword.scale.set(.85,1.16,.85);
  }else if(dwarf){
    body.scale.set(DWARF_PROPORTIONS.girth,DWARF_PROPORTIONS.height,DWARF_PROPORTIONS.depth);head.scale.set(.88,1.28,1);
    armor(0x667783,0xc4ab73);
    part(head,'Shieldwarden iron helm',new THREE.SphereGeometry(.242,10,5,0,Math.PI*2,0,Math.PI/2),0x64747d,[0,.34,-.025],[1,1,.92]);
    box(head,'Helm brow band',0xc4ab73,[0,.335,.171],[.41,.035,.035]);
    actor.setWeapon(null);actor.setShield(true);
    const grip=root.getObjectByName('Traveler weapon grip');
    part(grip,'Hammer haft',new THREE.CylinderGeometry(.025,.03,.68,7),0x694e31,[0,.22,0]);
    box(grip,'Forged war hammer',0x81919b,[0,.56,0],[.3,.16,.17]);
    for(const x of [-.16,.16])box(grip,'Hammer striking face',0xc2c0a9,[x,.56,0],[.04,.19,.19]);
    shield=root.getObjectByName('Round shield')??root.getObjectByName(BUCKLER_NAME);
    for(const old of shield.children)old.visible=false;
    box(shield,'Tower shield board',0x324c61,[0,0,0],[.49,.07,.82]);
    for(const x of [-.24,.24])box(shield,'Shield iron edge',0xb1a785,[x,-.015,0],[.035,.045,.85]);
    for(const z of [-.4,.4])box(shield,'Shield cross rim',0xb1a785,[0,-.015,z],[.5,.045,.035]);
    box(shield,'Hammer heraldry stem',0xd0b477,[0,-.05,0],[.035,.025,.32]);
    box(shield,'Hammer heraldry head',0xd0b477,[0,-.05,.16],[.22,.025,.09]);
  }else if(mage){
    actor.setWeapon('oak-staff');actor.setShield(false);
    const grip=root.getObjectByName('Traveler weapon grip');
    focus=gem(grip,'Battlemage spell focus',0x71d7ea,[0,.91,0],[.09,.15,.09],true);
    for(const side of [-1,1])box(chest,'Copper spellwork trim',0xc49b66,[side*.15,.1,.22],[.025,.52,.025]);
    gem(chest,'Azure spell clasp',0x71d7ea,[0,.3,.23],[.05,.065,.02],true);
    box(body,'Spellbook leather case',0x45362f,[-.25,.88,.03],[.16,.22,.1]);
  }else if(troll){
    const grip=root.getObjectByName('Ogre beam grip');for(const old of grip.children)old.visible=false;
    head.scale.set(.83,.83,.83);
    for(const old of head.children)old.visible=false;
    gem(head,'Troll mossy cranium',0x68784d,[0,.12,.04],[.29,.26,.25]);
    gem(head,'Troll jutting jaw',0x879269,[0,-.08,.2],[.25,.14,.23]);
    box(head,'Troll mouth',0x252e22,[0,-.04,.409],[.29,.045,.02]);
    gem(head,'Troll hooked nose',0x8a9468,[0,.075,.36],[.08,.12,.1]);
    for(const side of [-1,1]){
      gem(head,'Deep troll eye socket',0x202a20,[side*.115,.14,.263],[.085,.047,.035]);
      gem(head,'Troll amber eye',0xd5bd5b,[side*.115,.14,.292],[.035,.023,.014]);
      gem(head,'Troll slit pupil',0x1b281b,[side*.115,.14,.305],[.009,.019,.005]);
      box(head,'Sloping troll brow',0x52633d,[side*.12,.194,.277],[.19,.057,.065]).rotation.z=side*.23;
      const tusk=part(head,'Troll lower tusk',new THREE.ConeGeometry(.03,.17,6),0xd8cc9e,[side*.16,-.005,.4]);tusk.rotation.x=-.25;
      gem(head,'Troll pointed ear',0x68784d,[side*.3,.11,.04],[.11,.13,.065]);
    }
    for(const side of [-1,1]){
      const hand=root.getObjectByName((side<0?'Left':'Right')+' Wrist');
      for(const x of [-.085,0,.085])part(hand,'Troll ivory claw',new THREE.ConeGeometry(.02,.11,5),0xd8cc9e,[x,-.2,.13]).rotation.x=Math.PI;
      for(let n=0;n<4;n++)gem(chest,'Mossy hide growth',n%2?0x50673e:0x71845a,[side*(.24+n*.08),.27,-.06],[.12,.08,.1]);
    }
    lifeGlow=gem(chest,'Troll knitting wound',0x79b879,[.2,.1,.4],[.09,.16,.012],true);
  }else if(undead){
    actor.setWeapon('simple-sword');actor.setShield(false);armor(0x434e50,0x8b968a);
    // Replace the living face, keeping the old geometry owned for disposal.
    for(const old of head.children)old.visible=false;
    gem(head,'Weathered skull',0xbfc3ac,[0,.23,-.025],[.18,.21,.16]);
    box(head,'Skeletal jaw',0x9ca38e,[0,.075,.105],[.23,.08,.1]);
    for(const side of [-1,1]){
      gem(head,'Empty eye socket',0x222e2e,[side*.07,.24,.12],[.052,.045,.03]);
      gem(head,'Bound violet eye',0xb0a2df,[side*.07,.24,.146],[.019,.016,.012],true);
    }
    for(const x of [-.075,-.025,.025,.075])box(head,'Ancient teeth',0xd0cfb5,[x,.11,.161],[.026,.035,.012]);
    part(head,'Broken iron crown',new THREE.CylinderGeometry(.2,.205,.065,9,1,true),0x5c6663,[0,.36,-.025]);
    for(const x of [-.13,.11])box(head,'Chipped helm crest',0x7b8278,[x,.43,-.01],[.04,.13,.055]);
    lifeGlow=gem(chest,'Necromantic binding stone',0xb0a2df,[0,.25,.28],[.055,.075,.025],true);
    for(const side of [-1,1])box(chest,'Cracked armor seam',0x1d2929,[side*.1,.18,.25],[.015,.21,.015]).rotation.z=side*.5;
  }
  Object.assign(root.userData,{advancedTrial:id,bodyRadius:troll?1.2:dwarf?.62:.55});
  const animate=actor.animate,arms=['Left Shoulder','Right Shoulder','Left Elbow','Right Elbow'].map(n=>root.getObjectByName(n));
  const fallenBounds=new THREE.Box3(),origin=new THREE.Vector3();
  const saved=arms.map(j=>j.rotation.clone());let overlay=false;
  actor.animate=(time,speed,grounded,pose={})=>{
    if(overlay)arms.forEach((j,i)=>j.rotation.copy(saved[i]));overlay=false;
    const cast=mage&&pose.attackStyle==='cast'&&['windup','attack'].includes(pose.action),restore=pose.restoring;
    animate(time,speed,grounded,cast||restore?{...pose,action:'idle',attackStyle:null}:pose);
    if(shield){const raised=pose.action!=='dead'&&pose.shieldRaised;shield.position.set(...(raised?[-.105,-.296,.013]:[-.05,-.20,.06]));shield.rotation.set(...(raised?[.588,.248,-.487]:[-1.426,-.095,-Math.PI/2]));}
    if(cast||restore||dwarf&&pose.attackStyle==='shove'&&['windup','attack'].includes(pose.action)){
      arms.forEach((j,i)=>saved[i].copy(j.rotation));overlay=true;
      arms[1].rotation.x=cast?-1.35:-.75;arms[3].rotation.x=-.6;
      arms[0].rotation.x=restore?-1.1:-1.35;arms[2].rotation.x=-.45;
    }
    if(focus){const k=cast?.7+.6*(pose.progress??0):.65;focus.scale.set(.09*k,.15*k,.09*k);focus.visible=pose.action!=='dead';}
    if(lifeGlow){lifeGlow.visible=pose.action!=='dead';lifeGlow.material.emissiveIntensity=troll?(pose.scorched?.12:.7):restore?1.8:.5;
      if(troll){lifeGlow.material.color.setHex(pose.scorched?0xc26b3d:0x79b879);lifeGlow.material.emissive.setHex(pose.scorched?0xc26b3d:0x79b879);}}
    if(dwarf&&pose.action==='dead'){
      // Fall backward: a sideways fall props this broad rig up on its tower shield.
      body.rotation.set(-1.49*THREE.MathUtils.smoothstep(pose.progress??1,0,.8),0,0);
      body.updateWorldMatrix(true,true);fallenBounds.setFromObject(body);body.parent.getWorldPosition(origin);
      const parentY=body.parent.matrixWorld.elements[5];if(Math.abs(parentY)>1e-6)body.position.y+=(origin.y-fallenBounds.min.y)/parentY;
    }
  };
  actor.setArmed(true);return actor;
}
