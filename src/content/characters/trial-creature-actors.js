import * as THREE from 'three';
import {trialActorKit} from './trial-actor-kit.js';

export function createTrialSpider(){
  const group=new THREE.Group(),body=new THREE.Group(),k=trialActorKit();group.add(body);body.name='Weight and hips';
  k.gem(body,'Striped abdomen',0x4a444b,[0,.82,-.5],[.62,.48,.76]);
  for(let i=0;i<4;i++)k.box(body,'Abdomen ivory marking',0xb2a586,[0,1.17-i*.035,-.2-i*.19],[.16+i*.06,.03,.085]);
  const head=new THREE.Group();head.name='Head';head.position.set(0,.75,.42);body.add(head);
  k.gem(head,'Armored cephalothorax',0x61564a,[0,0,0],[.47,.3,.45]);
  for(const x of [-.24,-.09,.09,.24])k.gem(head,'Amber spider eye',0xe1b25e,[x,.12,.38],[Math.abs(x)<.1?.065:.04,.055,.045],true);
  for(const side of [-1,1])k.part(head,'Curved fang',new THREE.ConeGeometry(.085,.35,6),0xc5b69a,[side*.18,-.17,.4]).rotation.x=2.7;
  const legs=[];
  for(const side of [-1,1])for(let i=0;i<4;i++){
    const pivot=new THREE.Group();pivot.name=(side<0?'Left':'Right')+' spider leg '+(i+1);pivot.position.set(side*.25,.75,.43-i*.3);body.add(pivot);
    const reach=.9+Math.sin((i+1)*.65)*.2,bend=[side*reach,.3,(1.5-i)*.3],foot=[side*(reach+.32),-.72,(1.5-i)*.5];
    k.rod(pivot,'Upper chitin leg',0x594b45,[0,0,0],bend,.075);k.gem(pivot,'Joint',0xa89b79,bend,[.09,.09,.09]);
    k.rod(pivot,'Tapered lower leg',0x3b343b,bend,foot,.045);legs.push({pivot,side,i});
  }
  return {group,setArmed(){},animate(t,speed,grounded,pose={}){
    body.position.y=pose.defeated?0:Math.sin(t*2)*.015;
    const tell=pose.action==='windup',strike=pose.action==='attack',p=pose.progress??0;
    body.rotation.x=tell?-.15*p:strike?.12*Math.sin(p*Math.PI):0;
    for(const {pivot,side,i} of legs){pivot.rotation.y=speed>.1?Math.sin(t*9+i*1.8+side)*.18:0;pivot.rotation.z=pose.defeated?-side*.8*THREE.MathUtils.smoothstep(p,0,.8):i===0&&(tell||strike)?side*(tell?.65*p:.65*(1-p)):speed>.1?side*Math.max(0,Math.cos(t*9+i*1.8+side))*.13:0;}
  }};
}

export function createTrialGolem(){
  const group=new THREE.Group(),body=new THREE.Group(),k=trialActorKit();group.add(body);body.name='Weight and hips';
  const chest=new THREE.Group();chest.name='Chest';chest.position.set(0,2.05,0);body.add(chest);
  k.box(chest,'Stone rib housing',0x777d79,[0,0,-.1],[1.12,.95,.65]);
  const core=k.gem(chest,'Venting light core',0x83d8ed,[0,.03,.35],[.27,.32,.12],true),plates=[];
  for(const side of [-1,1]){
    const hinge=new THREE.Group();hinge.position.set(side*.5,.03,.3);chest.add(hinge);plates.push({hinge,side});
    k.box(hinge,'Hinged chest plate',0xa8a492,[-side*.25,0,.05],[.48,.76,.15]);
    for(const y of [-.3,.3])k.gem(hinge,'Brass hinge rivet',0xc2a668,[0,y,.16],[.055,.055,.025]);
  }
  k.part(body,'Brass neck spindle',new THREE.CylinderGeometry(.14,.19,.28,8),0xb19c6c,[0,2.66,0]);
  k.part(body,'Articulated waist',new THREE.CylinderGeometry(.3,.35,.45,8),0x9d8c63,[0,1.5,0]);
  const head=new THREE.Group();head.name='Head';head.position.set(0,2.92,0);body.add(head);
  k.box(head,'Carved stone face',0x9f9f8e,[0,0,0],[.58,.52,.49]);
  k.box(head,'Brass brow',0xb7a16c,[0,.1,.25],[.62,.07,.06]);
  for(const side of [-1,1])k.gem(head,'Blue golem eye',0x88e6f0,[side*.14,.02,.257],[.055,.045,.02],true);
  k.box(head,'Golem jaw',0x656b68,[0,-.19,.26],[.34,.09,.03]);
  const arms=[],legs=[];
  for(const side of [-1,1]){
    const arm=new THREE.Group();arm.position.set(side*.75,2.38,0);arm.name=(side<0?'Left':'Right')+' Shoulder';body.add(arm);arms.push(arm);
    k.gem(arm,'Brass shoulder bearing',0xb49a64,[0,0,0],[.24,.24,.24]);
    k.box(arm,'Upper stone arm',0x858a7e,[0,-.34,0],[.37,.51,.4]);
    k.gem(arm,'Elbow bearing',0xb49a64,[0,-.65,0],[.17,.17,.17]);
    k.box(arm,'Stone forearm',0x909483,[0,-.91,.05],[.39,.43,.43]);
    k.box(arm,'Hammer fist',0x676e69,[0,-1.2,.13],[.48,.3,.52]);
    const leg=new THREE.Group();leg.position.set(side*.34,1.5,0);body.add(leg);legs.push(leg);
    k.box(leg,'Thigh plate',0x7b8174,[0,-.25,0],[.4,.55,.47]);k.gem(leg,'Knee wheel',0xb49a64,[0,-.6,.1],[.21,.2,.17]);
    k.box(leg,'Lower stone leg',0x8d907e,[0,-.95,0],[.35,.54,.39]);k.box(leg,'Broad golem foot',0x666e65,[0,-1.36,.17],[.52,.27,.75]);
  }
  return {group,setArmed(){},animate(t,speed,grounded,pose={}){
    const p=pose.progress??0,attack=pose.action==='attack',tell=pose.action==='windup';
    body.position.y=speed>.1?Math.abs(Math.sin(t*5))*.035:0;
    legs.forEach((leg,i)=>leg.rotation.x=speed>.1?Math.sin(t*5+i*Math.PI)*.13:0);
    arms.forEach((arm,i)=>{arm.rotation.set(speed>.1?-Math.sin(t*5+i*Math.PI)*.12:0,0,0);if(i===1&&(tell||attack)){arm.rotation.x=tell?-2.1*p:-2.1+2.7*p;arm.rotation.z=pose.attackStyle==='sweep'?(tell?-1.1*p:-1.1+1.6*p):0;}});
    plates.forEach(({hinge,side})=>hinge.rotation.y=pose.exposed?side*1.3:0);core.material.emissiveIntensity=pose.exposed?2:.3;
  }};
}
