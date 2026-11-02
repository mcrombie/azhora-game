import * as THREE from 'three';
import {trialActorKit} from './trial-actor-kit.js';

export function createYoungWyvern(){
  const group=new THREE.Group(),body=new THREE.Group(),k=trialActorKit();body.name='Weight and hips';group.add(body);
  k.gem(body,'Lean scaled torso',0x657e62,[0,1.4,0],[.52,.48,.9]);k.gem(body,'Pale ribbed underside',0xb2b08a,[0,1.25,.27],[.4,.33,.67]);
  k.rod(body,'Long reptilian neck',0x718567,[0,1.6,.6],[0,2.05,1.16],.23);
  const head=new THREE.Group();head.name='Head';head.position.set(0,2.1,1.25);body.add(head);
  k.gem(head,'Angular wyvern skull',0x6d805b,[0,0,0],[.27,.22,.38]);k.gem(head,'Narrow toothed snout',0x8d966f,[0,-.07,.34],[.23,.13,.33]);
  const jaw=new THREE.Group();jaw.position.set(0,-.12,.14);head.add(jaw);k.gem(jaw,'Hinged lower jaw',0xa5a782,[0,-.035,.2],[.21,.06,.34]);
  for(const side of [-1,1]){k.gem(head,'Amber predatory eye',0xdfbc5c,[side*.23,.04,.1],[.035,.035,.045],true);k.part(head,'Swept head horn',new THREE.ConeGeometry(.08,.38,5),0xc1bb98,[side*.19,.2,-.18]).rotation.x=-.65;for(let i=0;i<4;i++)k.part(jaw,'Small ivory tooth',new THREE.ConeGeometry(.018,.07,4),0xe3d7b6,[side*.15,.025,.12+i*.09]);}
  const legs=[],wings=[];
  for(const side of [-1,1]){
    const leg=new THREE.Group();leg.position.set(side*.35,1.25,-.25);body.add(leg);legs.push({leg,side});
    k.rod(leg,'Powerful upper leg',0x687e5d,[0,0,0],[side*.13,-.45,.22],.14);k.rod(leg,'Bent lower leg',0x8a936b,[side*.13,-.45,.22],[side*.07,-1.12,.14],.075);
    for(let i=0;i<3;i++)k.rod(leg,'Grounded talon',0xc8c2a0,[side*.07+(i-1)*.075,-1.12,.14],[side*.07+(i-1)*.12,-1.24,.43],.025);
    const wing=new THREE.Group();wing.position.set(side*.38,1.65,.3);body.add(wing);wings.push({wing,side});
    const points=[[0,0,0],[side*1.25,.4,-.25],[side*2.55,.15,-.85],[side*1.65,-.1,-1.1],[side*.75,-.14,-1.25],[0,-.15,-.65]];
    const vertices=[];for(let i=1;i<points.length-1;i++)vertices.push(...points[0],...points[i],...points[i+1]);
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();
    const membrane=k.part(wing,'Russet wing membrane',geometry,0x9c8261);membrane.material.side=THREE.DoubleSide;
    for(let i=1;i<points.length;i++)k.rod(wing,'Wing finger bone',0x667b5c,points[0],points[i],i===1?.045:.022);
  }
  const tail=new THREE.Group();tail.position.set(0,1.4,-.7);body.add(tail);
  const segments=[[0,0,0],[.12,-.08,-.75],[.2,-.2,-1.5],[.35,-.25,-2.2]];
  for(let i=0;i<3;i++)k.rod(tail,'Tapering tail segment',0x677c5d,segments[i],segments[i+1],.17-i*.05);
  k.part(tail,'Tail barb',new THREE.ConeGeometry(.13,.45,4),0xb0ac85,[.35,-.25,-2.3]).rotation.x=-Math.PI/2;
  for(let i=0;i<7;i++)k.part(body,'Spinal ridge',new THREE.ConeGeometry(.065,.19,4),0x465c48,[0,1.83-i*.035,.55-i*.2]);
  group.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  return {group,setArmed(){},animate(t,speed,grounded,pose={}){
    const dead=pose.defeated,air=!dead&&(pose.flightHeight??0)>0,p=pose.progress??0,active=['windup','attack'].includes(pose.action);
    body.position.y=dead?0:air?.8:0;body.rotation.x=air?-.08:0;
    for(const {wing,side} of wings){wing.rotation.z=dead?-side*.3:air?side*Math.sin(t*7)*.3:side*.75;wing.rotation.y=dead?0:side*.35;}
    for(const {leg,side} of legs)leg.rotation.x=dead?.3:air?.7:speed>.1?Math.sin(t*7+side*1.5)*.3:0;
    tail.rotation.y=active&&pose.attackStyle==='sweep'?(pose.action==='windup'?p*.8:Math.sin(p*Math.PI)*-1.3):dead?0:Math.sin(t*1.5)*.09;
    head.rotation.x=active&&pose.attackStyle==='thrust'?Math.sin(p*Math.PI)*.2:0;jaw.rotation.x=active?.25+Math.sin(p*Math.PI)*.4:0;
  }};
}
