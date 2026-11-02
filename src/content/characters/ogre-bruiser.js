import * as THREE from 'three';
import {createOgre} from './characters.js';

// A combat apparition, separate from Mallec's toll-keeper costume and beam.
// Reuse the grounded ogre rig; only the club and stomp pose are trial-specific.
export function createOgreBruiser(){
  const actor=createOgre({scale:2.35,tollKeeper:false}),root=actor.group;
  const weapon=root.getObjectByName('Weapon');
  for(const old of weapon.children)old.visible=false;
  const club=new THREE.Group();club.name='Ogre heavy wooden club';weapon.add(club);
  const wood=new THREE.MeshStandardMaterial({color:0x63462c,roughness:.93,flatShading:true});
  const binding=new THREE.MeshStandardMaterial({color:0x393c39,metalness:.35,roughness:.75,flatShading:true});
  const grain=new THREE.MeshStandardMaterial({color:0x987047,roughness:1,flatShading:true});
  const add=(name,geometry,material,x,y,z)=>{const m=new THREE.Mesh(geometry,material);m.name=name;m.position.set(x,y,z);club.add(m);return m;};
  add('Club grip',new THREE.CylinderGeometry(.065,.045,.63,7),wood,0,.19,0);
  add('Club head',new THREE.CylinderGeometry(.19,.10,.8,7),wood,0,.86,0);
  for(const y of [.63,1.04])add('Club iron binding',new THREE.CylinderGeometry(y>.8?.175:.14,y>.8?.16:.125,.065,7),binding,0,y,0);
  for(const x of [-.07,.06])add('Split wood grain',new THREE.BoxGeometry(.018,.29,.012),grain,x,.93,.152);
  for(const y of [.05,.15,.25])add('Leather grip wrap',new THREE.CylinderGeometry(.065,.063,.025,7),binding,0,y,0);
  Object.assign(root.userData,{weapon:'Heavy club',bodyRadius:.95,staggerResistant:true});

  const joints=['Right Hip','Right Knee','Right Ankle','Left Hip','Left Knee','Left Ankle','Chest','Head'].map(name=>root.getObjectByName(name));
  const saved=joints.map(j=>j.rotation.clone()),baseAnimate=actor.animate;
  let overlaid=false;
  actor.animate=(seconds,speed,grounded,pose={})=>{
    if(overlaid)joints.forEach((j,i)=>j.rotation.copy(saved[i]));
    overlaid=false;
    const stomp=pose.attackStyle==='stomp'&&['windup','attack','recover'].includes(pose.action);
    baseAnimate(seconds,speed,grounded,stomp?{...pose,action:'idle',attackStyle:null,hitImpact:0}:pose);
    if(!stomp)return;
    joints.forEach((j,i)=>saved[i].copy(j.rotation));overlaid=true;
    const p=THREE.MathUtils.clamp(pose.progress??0,0,1);
    // Foot lands at the model's contact point (.16 / .34), then stays planted.
    const lift=pose.action==='windup'?THREE.MathUtils.smoothstep(p,0,.85):pose.action==='attack'?1-THREE.MathUtils.smoothstep(p,0,.16/.34):0;
    const settle=pose.action==='attack'?Math.sin(Math.PI*Math.min(1,Math.max(0,p-.16/.34)/.45))*.12:0;
    joints[0].rotation.x=-1.05*lift;joints[1].rotation.x=1.5*lift;joints[2].rotation.x=-.45*lift;
    joints[3].rotation.x=-.04;joints[4].rotation.x=.08;joints[5].rotation.x=-.04;
    joints[6].rotation.x=-.12*lift+settle;joints[6].rotation.z=-.1*lift;joints[7].rotation.x=.12*lift;
  };
  return actor;
}
