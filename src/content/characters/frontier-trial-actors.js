import * as THREE from 'three';
import {createCharacter,createGoblin} from './characters.js';
import {createCentaur} from '../../world/actors/centaur-model.js';
import {DWARF_PROPORTIONS} from '../../world/actors/dwarf-model.js';
import {trialActorKit,withTrialFall} from './trial-actor-kit.js';
import {createTrialSpider,createTrialGolem} from './trial-creature-actors.js';
import {FRONTIER_TRIALS} from '../../gameplay/combat/frontier-trials.js';

export function createFrontierTrialActor(id){
  if(!FRONTIER_TRIALS.some(p=>p.id===id))return null;
  if(id==='web-spider')return withTrialFall(createTrialSpider(),id);
  if(id==='guild-golem')return withTrialFall(createTrialGolem(),id);
  const goblin=id==='goblin-slinger',centaur=id==='centaur-lancer',satyr=id==='satyr-thornrunner',dwarf=id==='dark-dwarf-runesmith',wraith=id==='acor-wraith',adept=id==='nanvir-adept',barrow=id==='eshtor-barrow-guardian',cref=id==='cref-axeman';
  const k=trialActorKit(),actor=goblin?createGoblin({variant:2}):centaur?createCentaur({variant:1}):createCharacter({role:adept||wraith?'traveler':'mercenary',hat:false,armed:true,
    tunic:cref?0x687c84:satyr?0x617044:dwarf?0x4e4858:wraith?0x344f50:adept?0x702f37:0x5a6262,
    skin:dwarf?0x989a81:wraith?0x9cb0a3:barrow?0xa9aa91:0xb99370,
    look:{headgear:'bare',hairStyle:wraith||barrow||dwarf?'bald':satyr?'short-cropped':'long-tied',hair:cref?0x886845:0x352b27,facialHair:dwarf?'forked':cref?'full':satyr?'trimmed':'clean',garment:wraith||adept?'robe':cref?'short-cloak':'jerkin',weapon:'sword',build:dwarf?'broad':wraith?'slight':'ordinary'}});
  const root=actor.group,body=root.getObjectByName('Weight and hips'),head=centaur?root.children[1].getObjectByName('Head'):root.getObjectByName('Head'),chest=root.getObjectByName('Chest')??body;
  actor.setShield?.(false);
  const grip=root.getObjectByName(goblin?'Raider stick grip':'Traveler weapon grip');
  let spinner=null,glow=null;
  function customWeapon(){actor.setWeapon?.(null);if(grip)for(const c of grip.children)c.visible=false;}
  function haft(length,color=0x65472e){return k.part(grip,'Weapon haft',new THREE.CylinderGeometry(.025,.034,length,7),color,[0,length*.34,0]);}
  if(goblin){
    customWeapon();spinner=new THREE.Group();spinner.name='Whirling leather sling';spinner.position.set(0,.06,0);grip.add(spinner);
    k.rod(spinner,'Sling cord',0xb29a6c,[0,0,0],[.44,.08,0],.012);k.rod(spinner,'Return cord',0x79603f,[0,0,.015],[.44,.08,.04],.012);
    k.gem(spinner,'Leather sling cradle',0x51402f,[.44,.08,.02],[.1,.055,.07]);
    k.gem(body,'Oversized stone pouch',0x766044,[-.28,.65,-.1],[.2,.27,.17]);
    for(let i=0;i<5;i++)k.gem(body,'Pouch stone',0xa8a18c,[-.27+(i%2)*.09,.87+(i%3)*.035,-.1],[.05,.045,.045]);
  }else if(centaur){
    actor.setWeapon('spear');const lance=root.getObjectByName('Traveler weapon grip');if(lance)lance.scale.y=1.4;
    for(const side of [-1,1]){k.part(head,'Lancer bronze ear ring',new THREE.TorusGeometry(.035,.009,4,9),0xc5a56b,[side*.225,.14,.01]);
      k.gem(chest,'Light leather shoulder',0x736044,[side*.29,.29,0],[.16,.11,.17]);}
  }else if(satyr){
    actor.setWeapon('spear');
    for(const side of [-1,1]){
      const horn=k.part(head,'Curved ram horn',new THREE.TorusGeometry(.17,.055,6,14,Math.PI*1.6),0xa99b78,[side*.22,.31,-.025]);horn.rotation.y=side*Math.PI/2;horn.rotation.z=-.8;
      k.gem(head,'Pointed woodland ear',0xb99370,[side*.24,.17,.02],[.11,.07,.045]);
      const leg=root.getObjectByName((side<0?'Left':'Right')+' Knee'),ankle=root.getObjectByName((side<0?'Left':'Right')+' Ankle');
      k.gem(leg,'Shaggy goat calf',0x66523d,[0,-.08,-.015],[.1,.22,.12]);
      for(const child of ankle.children)child.visible=false;
      for(const x of [-.044,.044])k.box(ankle,'Cloven hoof',0x3b342a,[x,-.055,.06],[.08,.105,.2]);
    }
  }else if(cref){
    customWeapon();haft(.98);k.box(grip,'Long axe iron head',0x8c9592,[.13,.75,0],[.34,.25,.07]);
    const hook=k.part(grip,'Guard-catching axe hook',new THREE.ConeGeometry(.06,.25,4),0x747f7b,[.25,.61,0]);hook.rotation.z=Math.PI;
    for(const side of [-1,1]){k.gem(chest,'Layered wool shoulder',0xa7a08c,[side*.22,.31,-.02],[.2,.13,.23]);k.box(chest,'Leather crossed harness',0x4e3d2c,[side*.09,.12,.225],[.04,.47,.03]).rotation.z=side*.35;}
    k.box(body,'Northern woven sash',0x947045,[0,.86,.2],[.4,.12,.025]);
  }else if(dwarf){
    body.scale.set(DWARF_PROPORTIONS.girth,DWARF_PROPORTIONS.height,DWARF_PROPORTIONS.depth);head.scale.set(.88,1.28,1);
    customWeapon();haft(.72);k.box(grip,'Engraved rune hammer',0x8c8797,[0,.59,0],[.34,.2,.2]);
    for(const side of [-1,1]){
      k.box(chest,'Ancient body brace',0x747d79,[side*.22,.12,.18],[.065,.59,.065]);
      const knee=root.getObjectByName((side<0?'Left':'Right')+' Knee');k.box(knee,'Joint support rail',0x858b7d,[side*.1,-.08,0],[.04,.39,.065]);
      k.gem(knee,'Engraved joint wheel',0xb1a278,[side*.12,0,0],[.07,.07,.035]);
      k.part(head,'Bronze temple band',new THREE.TorusGeometry(.225,.018,4,12),0xa8946c,[0,.26,-.02]).rotation.x=Math.PI/2;
    }
    glow=k.gem(chest,'Ward-linked rune',0xb29cdc,[0,.24,.24],[.075,.08,.025],true);
  }else if(wraith){
    root.scale.set(.95,1.16,.95);head.scale.set(.9,1,.9);
    for(const old of head.children)old.visible=false;
    k.gem(head,'Gaunt High Goblin cranium',0x8caa9f,[0,.24,0],[.175,.23,.16]);
    k.gem(head,'Wasted angular jaw',0x7b978f,[0,.08,.09],[.125,.09,.12]);
    k.gem(head,'Long wraith nose',0x9bb6a9,[0,.22,.17],[.04,.09,.08]);
    for(const side of [-1,1]){
      k.gem(head,'Hollow eye socket',0x263d3d,[side*.075,.27,.14],[.065,.037,.027]);
      k.box(head,'Sloping ancient brow',0x688c82,[side*.085,.316,.14],[.13,.025,.04]).rotation.z=side*.18;
    }
    k.box(head,'Thin wraith mouth',0x314744,[0,.1,.18],[.12,.016,.012]);customWeapon();haft(.67,0x526865);
    const blade=k.part(grip,'Spectral sickle',new THREE.TorusGeometry(.25,.025,4,16,Math.PI*1.35),0xb5d9d3,[.17,.62,0]);blade.rotation.z=-.6;
    for(const side of [-1,1]){
      k.gem(head,'High Goblin tapered ear',0x9cb0a3,[side*.23,.2,-.01],[.085,.1,.045]);
      k.box(chest,'Ancient silver embroidery',0x9aab95,[side*.15,.13,.23],[.025,.55,.025]);
      k.gem(head,'Sunken wraith eye',0xb8efdf,[side*.075,.27,.17],[.021,.014,.01],true);
    }
    k.part(head,'Tarnished circlet',new THREE.TorusGeometry(.217,.016,4,12),0x8a9a7c,[0,.34,-.02]).rotation.x=Math.PI/2;
    // Rigid batches share cached materials with other characters. Clone those
    // once per source; the unbatched face and equipment already belong to this rig.
    const privateMaterials=new Map();
    root.traverse(o=>{if(o.isMesh){if(o.name==='Rigid character batch'){
      const own=m=>{if(!privateMaterials.has(m))privateMaterials.set(m,m.clone());return privateMaterials.get(m);};
      o.material=Array.isArray(o.material)?o.material.map(own):own(o.material);
    }for(const m of [].concat(o.material)){m.transparent=true;m.depthWrite=false;}}});
  }else if(adept){
    actor.setWeapon('simple-sword');
    for(const side of [-1,1]){k.box(chest,'Ceremonial crimson stole',0xa95850,[side*.14,.1,.225],[.09,.57,.025]);k.gem(chest,'Small silver clasp',0xc3baa4,[side*.15,.35,.25],[.04,.045,.02]);}
    glow=k.gem(chest,'Nanvir ritual medallion',0xa34549,[0,.22,.27],[.075,.09,.025],true);
    k.box(head,'Pale ritual brow mark',0xd8c29d,[0,.33,.192],[.035,.1,.018]);
  }else if(barrow){
    customWeapon();haft(1.45,0x464842);k.part(grip,'Funerary spear blade',new THREE.ConeGeometry(.09,.43,4),0xa4aaa0,[0,1.32,0]);
    for(const child of head.children)child.visible=false;
    k.gem(head,'Burial mask',0xa8a58c,[0,.22,.02],[.185,.235,.17]);
    for(const side of [-1,1]){k.box(head,'Dark mask eye',0x293e3e,[side*.075,.26,.174],[.08,.035,.02]);k.gem(head,'Pale echo eye',0x9bd5d7,[side*.075,.26,.191],[.02,.014,.01],true);}
    k.box(head,'Funerary mouth seam',0x444a42,[0,.11,.15],[.17,.02,.025]);
    k.part(head,'Ancient ridged helm',new THREE.SphereGeometry(.235,8,4,0,Math.PI*2,0,Math.PI/2),0x6c746a,[0,.36,-.015]);
    for(const side of [-1,1])for(let i=0;i<4;i++)k.box(chest,'Cracked funerary lamella',0x778277,[side*.11,.3-i*.095,.23],[.2,.08,.055]);
    k.box(chest,'Fractured breastplate seam',0x2b3b39,[.08,.13,.265],[.018,.35,.02]).rotation.z=.3;
  }
  const right=root.getObjectByName('Right Shoulder'),left=root.getObjectByName('Left Shoulder');
  let restore=[];
  const baseAnimate=actor.animate;
  actor.animate=(t,speed,grounded,pose={})=>{
    for(const [joint,rotation] of restore)joint.rotation.copy(rotation);restore=[];
    const casting=goblin&&pose.attackStyle==='cast'&&['windup','attack'].includes(pose.action),inscribing=adept&&pose.inscribing;
    baseAnimate(t,speed,grounded,casting||inscribing?{...pose,action:'idle'}:pose);
    if(casting||inscribing){for(const joint of [right,left].filter(Boolean))restore.push([joint,joint.rotation.clone()]);if(right)right.rotation.x=casting?-1.8:-1.3;if(left&&inscribing)left.rotation.x=-1.1;}
    if(centaur&&pose.attackStyle==='kick'&&['windup','attack'].includes(pose.action)){
      const p=pose.progress??0,lift=pose.action==='windup'?p:Math.max(0,1-p);
      for(const side of ['Left','Right']){const joint=root.getObjectByName(side+' Hind Hip');restore.push([joint,joint.rotation.clone()]);joint.rotation.x=1.15*lift;}
    }
    if(spinner){spinner.rotation.z=casting?t*18:-1.2;spinner.rotation.x=casting?Math.PI/2:0;}
    if(glow)glow.material.emissiveIntensity=(dwarf?pose.warded:pose.empowered)?1.6:.18;
    if(wraith){root.position.y=pose.veiled?.2+Math.sin(t*2)*.08:0;root.traverse(o=>{if(o.isMesh)for(const m of [].concat(o.material))m.opacity=pose.veiled?.2:.96;});}
  };
  return withTrialFall(actor,id);
}
