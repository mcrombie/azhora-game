import * as THREE from 'three';
import {createCharacter,createGoblin,createRockTroll,BUCKLER_NAME} from './characters.js';
import {DWARF_PROPORTIONS} from '../../world/actors/dwarf-model.js';
import {EXPEDITION_TRIALS} from '../../gameplay/combat/expedition-trials.js';
import {trialActorKit,withTrialFall} from './trial-actor-kit.js';
import {createYoungWyvern} from './young-wyvern.js';

export function createExpeditionTrialActor(id){
  const profile=EXPEDITION_TRIALS.find(p=>p.id===id);if(!profile)return null;
  if(id==='young-wyvern')return withTrialFall(createYoungWyvern(),id);
  const kind=profile.mechanic,ranger=kind==='ranger',trapper=kind==='trapper',troll=kind==='stone-troll',earth=kind==='earthshaper',furnace=kind==='furnace',dwarf=earth||furnace,mirror=kind==='mirrorblade',penitent=kind==='penitent',reed=kind==='reed-stalker',oath=kind==='oathbound',binder=kind==='binder',berserk=id==='cref-berserker';
  const skin=troll?0x898778:mirror?0xb8c2b4:reed?0x8d9c81:furnace?0x9c9a7f:binder?0xb4b295:0xc2a07d;
  const actor=trapper?createGoblin({variant:1}):troll?createRockTroll({scale:2.5}):createCharacter({role:binder?'traveler':'mercenary',hat:false,armed:true,
    skin,tunic:ranger?0x476747:earth?0x846b49:furnace?0x4d4942:mirror?0x374b58:penitent?0x6b3039:reed?0x495944:oath?0x485665:binder?0x586a65:0x756856,
    look:{headgear:'bare',hairStyle:reed||furnace||oath?'bald':ranger||mirror?'long-tied':'short-cropped',hair:mirror?0xc4c9be:ranger?0x8a7446:0x49352a,facialHair:dwarf?'forked':berserk?'full':'clean',garment:binder?'robe':berserk||ranger?'short-cloak':'jerkin',build:dwarf||berserk?'broad':ranger||mirror?'slight':'ordinary',weapon:'sword'}});
  const root=actor.group,k=trialActorKit(),head=root.getObjectByName('Head'),chest=root.getObjectByName('Chest')??root.getObjectByName('Weight and hips'),body=root.getObjectByName('Weight and hips');
  const grip=root.getObjectByName(trapper?'Raider stick grip':troll?'Ogre beam grip':'Traveler weapon grip'),leftHand=root.getObjectByName('Left Wrist');
  actor.setShield?.(false);actor.setWeapon?.(null);if(grip)for(const c of grip.children)c.visible=false;
  const held=new THREE.Group();held.name='Expedition equipment';grip.add(held);
  let bow=null,knife=null,glow=null,furnaceDoors=[],oathShield=null;
  function haft(parent,length=.85){k.rod(parent,'Ash wood haft',0x6f5034,[0,-.1,0],[0,length,0],.029);}
  function axe(parent){haft(parent,.75);k.gem(parent,'Forged axe blade',0x9d9f91,[.14,.63,0],[.22,.16,.045]);k.box(parent,'Iron axe socket',0x646b66,[0,.62,0],[.07,.16,.1]);}
  function blade(parent,length=.7,color=0xc3c2ac){k.rod(parent,'Leather sword grip',0x4d382b,[0,-.1,0],[0,.12,0],.033);k.box(parent,'Sword guard',0xb39b66,[0,.1,0],[.22,.035,.045]);k.gem(parent,'Long tapered blade',color,[0,.12+length/2,0],[.055,length/2,.023]);}
  function plates(color){for(const side of [-1,1]){k.gem(chest,'Layered shoulder plate',color,[side*.29,.31,0],[.16,.13,.2]);for(let n=0;n<4;n++)k.box(chest,'Ancient overlapping lamella',color,[side*.115,.3-n*.11,.23],[.21,.09,.05]);}}
  if(dwarf){body.scale.set(DWARF_PROPORTIONS.girth,DWARF_PROPORTIONS.height,DWARF_PROPORTIONS.depth);head.scale.set(.88,1.28,1);}
  if(ranger||mirror){root.scale.set(.94,1.1,.94);for(const side of [-1,1])k.part(head,'Elven ear',new THREE.ConeGeometry(.045,.24,4),skin,[side*.24,.22,0]).rotation.z=-side*1.1;}
  if(ranger){
    bow=new THREE.Group();bow.name='Yew longbow';held.add(bow);
    const arc=k.part(bow,'Bent yew stave',new THREE.TorusGeometry(.52,.024,5,18,Math.PI),0x98764c,[0,.28,0]);arc.rotation.z=-Math.PI/2;
    k.rod(bow,'Taut bowstring',0xe3d7b0,[0,-.24,0],[0,.8,0],.006);
    k.rod(bow,'Nocked arrow',0xbbae83,[0,.28,-.2],[0,.28,.65],.009);
    k.part(bow,'Arrowhead',new THREE.ConeGeometry(.035,.12,4),0xc3c8c0,[0,.28,.71]).rotation.x=Math.PI/2;
    knife=new THREE.Group();knife.name='Hunting knife';held.add(knife);blade(knife,.3);
    k.part(chest,'Leather back quiver',new THREE.CylinderGeometry(.09,.07,.59,7),0x6f5337,[.17,.17,-.23]);
    for(let i=0;i<5;i++){k.rod(chest,'Quiver arrow',0xbbae83,[.12+i*.025,.1,-.24],[.12+i*.025,.65,-.24],.008);k.gem(chest,'Arrow feather',0xb2b8a2,[.12+i*.025,.58,-.24],[.016,.06,.03]);}
    for(const side of [-1,1])k.gem(chest,'Leaf-shaped cloak clasp',0xb4b58a,[side*.16,.32,.23],[.045,.08,.02]);
  }else if(trapper){
    blade(held,.32,0x92967d);k.box(body,'Bulging trapper pack',0x73583a,[0,.65,-.25],[.49,.6,.29]);
    for(const side of [-1,1]){k.rod(body,'Pack tool handle',0xa08b5c,[side*.22,.42,-.3],[side*.26,1.1,-.3],.024);k.part(body,'Packed spring snare',new THREE.TorusGeometry(.13,.025,4,9),0x8d9078,[side*.3,.72,-.25]);}
    for(let i=0;i<3;i++)k.part(body,'Coiled cord',new THREE.TorusGeometry(.13+i*.02,.012,4,12),0xc3a574,[0,.87,-.42]);
  }else if(berserk){
    axe(held);const offhand=new THREE.Group();offhand.position.set(0,-.006,.035);offhand.rotation.x=Math.PI/2;leftHand.add(offhand);axe(offhand);for(const side of [-1,1]){k.gem(chest,'Weathered wool shoulder',0xaea28b,[side*.25,.31,-.02],[.19,.12,.21]);k.box(chest,'Leather axe harness',0x4d3929,[side*.1,.1,.24],[.045,.5,.025]).rotation.z=side*.4;}
    for(let i=0;i<3;i++)k.box(head,'Old cheek scar',0x94745e,[-.13+i*.025,.13,.18],[.012,.09,.014]).rotation.z=.4;
  }else if(troll){
    body.scale.set(1.12,.92,1.1);head.scale.set(.8,.8,.8);for(const old of head.children)old.visible=false;
    k.gem(head,'Stone troll brow and cranium',0x868879,[0,.12,.05],[.3,.26,.25]);k.gem(head,'Projecting granite jaw',0x9a9983,[0,-.06,.2],[.26,.15,.23]);
    k.box(head,'Troll mouth',0x34382d,[0,-.02,.405],[.29,.04,.02]);
    for(const side of [-1,1]){k.gem(head,'Deep amber eye',0xdbb960,[side*.12,.14,.29],[.035,.025,.02]);k.box(head,'Heavy sloping brow',0x636b5e,[side*.12,.2,.28],[.21,.07,.07]).rotation.z=side*.2;k.part(head,'Short ivory tusk',new THREE.ConeGeometry(.035,.15,5),0xc9c5a5,[side*.17,0,.39]);}
    for(let i=0;i<9;i++){const x=(i%3-1)*.32,y=.05+Math.floor(i/3)*.17;k.gem(chest,'Mineral back outcrop',i%2?0x777b83:0xa3a399,[x,y,-.29],[.2,.17,.24]);}
    k.gem(held,'Held rough boulder',0x929484,[0,.2,0],[.28,.25,.27]);
  }else if(earth){
    haft(held,.77);k.box(held,'Squared mason hammer',0x939589,[0,.67,0],[.33,.2,.22]);
    k.box(chest,'Heavy leather apron',0x775338,[0,.02,.25],[.37,.65,.035]);
    for(const side of [-1,1]){k.part(head,'Brass goggle rim',new THREE.TorusGeometry(.065,.018,5,12),0xbda36d,[side*.085,.25,.2]);k.part(head,'Smoky goggle glass',new THREE.CircleGeometry(.05,10),0x748a8b,[side*.085,.25,.205]);k.box(chest,'Apron tool pocket',0x9b7851,[side*.1,-.15,.28],[.13,.16,.025]);}
    k.rod(head,'Goggle bridge',0xbda36d,[-.02,.25,.21],[.02,.25,.21],.015);
  }else if(mirror){
    blade(held,.9,0xc0d3d5);plates(0x667b80);
    for(const side of [-1,1])k.box(chest,'Cracked elven plate',0x263d43,[side*.09,.15,.262],[.015,.38,.015]).rotation.z=side*.4;
    k.part(head,'Tarnished silver circlet',new THREE.TorusGeometry(.22,.015,4,12),0xa4b0ac,[0,.35,0]).rotation.x=Math.PI/2;
    k.box(head,'Preserved cheek seam',0x85988f,[.14,.17,.175],[.015,.13,.018]).rotation.z=.35;
  }else if(furnace){
    haft(held,.8);k.box(held,'Forge hammer',0x7f8278,[0,.67,0],[.36,.25,.22]);plates(0x5d615c);
    k.part(chest,'Back furnace',new THREE.CylinderGeometry(.24,.28,.65,8),0x535955,[0,.16,-.32]);
    for(const side of [-1,1]){
      k.box(chest,'Furnace support rail',0x959383,[side*.24,.1,.1],[.06,.64,.08]);
      k.part(chest,'Side exhaust pipe',new THREE.CylinderGeometry(.065,.065,.4,7),0x8b8271,[side*.32,.18,-.22]).rotation.z=Math.PI/2;
      const hinge=new THREE.Group();hinge.position.set(side*.2,.22,.27);chest.add(hinge);furnaceDoors.push({hinge,side});k.box(hinge,'Venting breastplate shutter',0x737569,[-side*.1,0,.02],[.19,.35,.055]);
    }
    glow=k.gem(chest,'Orange furnace core',0xe79749,[0,.22,.27],[.17,.2,.035],true);
  }else if(penitent){
    blade(held,.65,0xb9b2a0);k.part(held,'Curved ritual blade tip',new THREE.TorusGeometry(.18,.035,4,10,Math.PI*.65),0xb9b2a0,[.14,.7,0]);
    for(const side of [-1,1]){const arm=root.getObjectByName((side<0?'Left':'Right')+' Elbow');for(let n=0;n<4;n++)k.part(arm,'Ritual linen wrap',new THREE.CylinderGeometry(.074,.074,.035,7),0xc3bba4,[0,-.04-n*.055,0]);k.box(chest,'Crossed linen binding',0xc3bba4,[side*.09,.12,.24],[.05,.47,.025]).rotation.z=side*.4;}
    glow=k.gem(chest,'Blood offering clasp',0xc75859,[0,.24,.27],[.05,.07,.025],true);
  }else if(reed){
    haft(held,1.25);k.part(held,'Old fishing gaff',new THREE.TorusGeometry(.15,.025,4,12,Math.PI*1.3),0x848b78,[.12,1.2,0]);
    for(let i=0;i<11;i++){const x=(i%5-2)*.12,y=.25+(i%3)*.14;k.rod(chest,'Broken marsh reed',0x93955c,[x,-.1,-.17],[x+.07,y+.3,-.22],.012);k.gem(chest,'Reed seed head',0x716945,[x+.07,y+.3,-.22],[.035,.1,.035]);}
    for(let i=0;i<5;i++)k.part(chest,'Tangled fishing cord',new THREE.TorusGeometry(.24,.012,4,10),0x9a9d7c,[0,.2-i*.08,.03]).rotation.x=Math.PI/2+.3;
  }else if(oath){
    blade(held,.9);plates(0x626f73);actor.setShield(true);oathShield=root.getObjectByName('Round shield')??root.getObjectByName(BUCKLER_NAME);
    for(const old of oathShield.children)old.visible=false;
    k.box(oathShield,'Burial shield',0x344a57,[0,0,0],[.5,.08,.73]);
    for(const x of [-.23,.23])k.box(oathShield,'Ancient bronze shield edge',0xb4a27a,[x,-.055,0],[.04,.03,.76]);
    k.box(oathShield,'Broken oath sigil',0xb4c7bf,[0,-.06,0],[.055,.025,.43]);
    k.part(head,'Ancient crested helm',new THREE.SphereGeometry(.245,8,4,0,Math.PI*2,0,Math.PI/2),0x68767a,[0,.35,0]);
    for(const x of [-.12,0,.12])k.box(head,'Burial crown tooth',0xa89c7d,[x,.49,.02],[.04,.14,.07]);
    glow=k.gem(chest,'Oath stance jewel',0x9fcede,[0,.24,.29],[.06,.08,.025],true);
  }else if(binder){
    // High Goblins retain human-like proportions; this is an ancient scholar.
    k.box(held,'Chained bronze book cover',0x8d805e,[0,.2,.06],[.28,.36,.085]);k.box(held,'Old ivory pages',0xc6bea0,[0,.2,.11],[.25,.31,.025]);
    for(let i=0;i<7;i++)k.part(held,'Book chain link',new THREE.TorusGeometry(.025,.008,4,7),0xa89e78,[-.15,.35-i*.06,.06]).rotation.y=i%2?Math.PI/2:0;
    for(const side of [-1,1]){const wrist=root.getObjectByName((side<0?'Left':'Right')+' Wrist');k.part(wrist,'Inscribed bronze binding cuff',new THREE.CylinderGeometry(.082,.082,.16,8),0xb19a65,[0,.02,0]);for(let i=0;i<3;i++)k.box(wrist,'Cuff inscription',0x596e65,[(i-1)*.035,.02,.08],[.012,.1,.012]);k.box(chest,'Ancient embroidered lapel',0xb3a57b,[side*.15,.13,.23],[.045,.55,.026]);}
    k.part(head,'Scholarly bronze brow band',new THREE.TorusGeometry(.22,.015,4,12),0xb3a57b,[0,.34,0]).rotation.x=Math.PI/2;
  }
  root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  const base=actor.animate,right=root.getObjectByName('Right Shoulder'),left=root.getObjectByName('Left Shoulder');let restore=[];
  actor.animate=(t,speed,grounded,pose={})=>{
    for(const [j,r] of restore)j.rotation.copy(r);restore=[];
    base(t,speed,grounded,pose);
    const active=['windup','attack'].includes(pose.action),dead=pose.action==='dead'||!!pose.defeated;
    if(bow){bow.visible=!pose.attackStyle||pose.attackStyle==='cast';knife.visible=!bow.visible;}
    if((ranger&&pose.attackStyle==='cast'&&active)||pose.offering||pose.venting||troll&&pose.action==='recover'||berserk&&active){
      for(const j of [left,right].filter(Boolean))restore.push([j,j.rotation.clone()]);
      if(ranger){left.rotation.x=-1.4;right.rotation.x=-1.2;right.rotation.y=-.55;}
      if(pose.offering){left.rotation.x=-1;right.rotation.x=-1.4;}
      if(troll&&pose.action==='recover')right.rotation.x=.8;
      if(berserk&&active)left.rotation.x=right.rotation.x+.3;
    }
    if(glow){glow.material.emissiveIntensity=dead?0:pose.empowered||pose.venting?1.7:.25;if(oath){const color=pose.stance==='pursuit'?0xe0b271:0x9fcede;glow.material.color.setHex(color);glow.material.emissive.setHex(color);}}
    for(const {hinge,side} of furnaceDoors)hinge.rotation.y=pose.venting?side*1.1:0;
    if(oathShield){const raised=!dead&&pose.shieldRaised;oathShield.position.set(...(raised?[-.105,-.296,.013]:[-.05,-.20,.06]));oathShield.rotation.set(...(raised?[.588,.248,-.487]:[-1.426,-.095,-Math.PI/2]));}
    root.visible=!pose.submerged||dead;
  };
  return withTrialFall(actor,id);
}
