import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule} from './module-loader.js';
const THREE=await sourceModule('../vendor/three.module.js');
const {createYunethreCombatActor,createCavalryHorse,cavalryRiderPose,cavalryFootPose}=await sourceModule('../src/content/chapters/yunethre/cavalry-actors.js');
const {createCharacter,disposeCharacter}=await sourceModule('../src/content/characters/characters.js');
const unit=(kind,extra={})=>({kind,x:0,z:0,heading:0,aimHeading:0,hp:200,speed:0,phase:'maneuver',timer:0,arrows:24,hurt:0,...extra});
const own=(node,point=[0,0,0])=>{node.updateWorldMatrix(true,false);return node.localToWorld(new THREE.Vector3(...point));};
const shaft=(node)=>own(node,[0,1,0]).sub(own(node)).normalize();
const arrowDirection=(node)=>own(node,[0,0,1]).sub(own(node)).normalize();
const resources=root=>{const all=new Set();root.traverse(o=>{if(o.isMesh){all.add(o.geometry);for(const m of [].concat(o.material??[]))all.add(m);}});return all;};

test('centaurs visibly change from their held bow to a committed spear thrust and back',()=>{
 const a=createYunethreCombatActor('centaur-archer'),u=unit('centaur-archer'),bow=a.group.getObjectByName('Hunting bow (held)'),spear=a.group.getObjectByName('Ash spear');
 try{
  u.phase='draw';u.timer=.05;u.aimHeading=1.65;
  for(let i=0;i<20;i++)a.update(u,i/60,1/60,0);
  assert.equal(bow.visible,true);assert.equal(spear.visible,false);
  assert.ok(Math.abs(a.group.getObjectByName('Chest').rotation.y-1.65)<1e-6);
  assert.ok(arrowDirection(bow).dot(new THREE.Vector3(Math.sin(1.65),0,Math.cos(1.65)))>.999);
  u.phase='melee-windup';u.timer=.02;u.aimHeading=0;a.update(u,1,.02,0);
  assert.equal(bow.visible,false);assert.equal(spear.visible,true);
  const pulled=own(spear,[0,1.25,0]);
  u.phase='melee-strike';u.timer=.22;a.update(u,1.1,.08,0);
  const contact=own(spear,[0,1.25,0]);
  assert.ok(contact.z>pulled.z+.15,`the hand and shaft extend at contact (${contact.z-pulled.z})`);
  assert.ok(shaft(spear).dot(new THREE.Vector3(0,0,1))>.999);
  u.phase='recover';u.timer=2.1;a.update(u,1.4,.02,0);
  assert.equal(spear.visible,true,'the recovery does not snap straight back to a bow');
  assert.ok(a.group.getObjectByName('Chest').rotation.x>.1);
  u.phase='draw';u.timer=.8;a.update(u,3.6,.02,0);
  assert.equal(bow.visible,true);assert.equal(spear.visible,false);
 }finally{a.dispose();}
});

test('Celder rider sits on the saddle and lowers then extends the actual lance',()=>{
 const a=createYunethreCombatActor('celder-knight'),u=unit('celder-knight'),rider=a.group.getObjectByName('Celder knight'),spear=a.group.getObjectByName('Celder winged spear');
 try{
  a.update(u,0,1/60,0);
  const hip=rider.getObjectByName('Left Hip');assert.ok(Math.abs(own(hip).y-1.43)<.02);
  assert.ok(Math.abs(own(hip).z-.14)<.02);
  for(const side of ['Left','Right']){
   const h=rider.getObjectByName(side+' Hip'),k=rider.getObjectByName(side+' Knee');
   assert.ok(h.rotation.x<-1);assert.ok(h.rotation.z*h.position.x>0,'thighs spread outward on either rig');assert.equal(k.rotation.x,1.22);
  }
  u.phase='charge-windup';u.timer=1.5;a.update(u,.1,1/60,0);const raised=shaft(spear).y;
  u.timer=.05;a.update(u,1.55,.1,0);assert.ok(shaft(spear).y<raised-.75,'the readying lance visibly lowers');
  u.phase='charge';u.speed=10;u.aimHeading=.2;a.update(u,1.6,.05,0);
  assert.ok(shaft(spear).dot(new THREE.Vector3(Math.sin(.2),0,Math.cos(.2)))>.999);
  u.phase='melee-windup';u.timer=.01;u.aimHeading=0;a.update(u,2,.05,0);const pulled=own(spear,[0,1.77,0]);
  u.phase='melee-strike';u.timer=.22;a.update(u,2.08,.08,0);const extended=own(spear,[0,1.77,0]);
  assert.ok(extended.z>pulled.z+.2);assert.ok(shaft(spear).z>.99);
  u.phase='recover';u.timer=2.1;a.update(u,2.4,.1,0);assert.ok(shaft(spear).y<-.2);
 }finally{a.dispose();}
});

test('mounted hero retains a readable draw, forward arrow, spread legs and lifted cloak at both aim limits',()=>{
 const hero=createCharacter({role:'traveler'});hero.setWeapon('hunting-bow');hero.group.position.set(0,.84,-.2);
 try{for(const aim of [-1.7,1.7]){
  for(let i=0;i<15;i++)cavalryRiderPose(hero,i/60,8,{draw:1,aim});
  const bow=hero.group.getObjectByName('Hunting bow (held)'),chest=hero.group.getObjectByName('Chest');
  assert.equal(chest.rotation.y,aim);assert.ok(hero.group.getObjectByName('Traveler cloak hem').rotation.x>.55);
  assert.ok(hero.group.getObjectByName('Left Shoulder').rotation.x<-1.5,'bow arm is extended rather than holding reins');
  assert.ok(hero.group.getObjectByName('Right Elbow').rotation.x>2,'string arm folds back to the cheek');
  assert.ok(arrowDirection(bow).dot(new THREE.Vector3(Math.sin(aim),0,Math.cos(aim)))>.999);
  assert.ok(Math.abs(own(bow,[0,1,0]).y-own(bow).y)>.99,'bow limbs stay upright');
  for(const side of ['Left','Right']){const hip=hero.group.getObjectByName(side+' Hip');assert.ok(hip.rotation.z*hip.position.x>0);}
 }}finally{disposeCharacter(hero);}
});

test('impact and recovery accents do not change the committed direction or leave transforms invalid',()=>{
 for(const kind of ['centaur-archer','celder-knight']){
  const a=createYunethreCombatActor(kind),u=unit(kind,{phase:'melee-strike',timer:.22,heading:.5,aimHeading:1.1});
  try{
   a.update(u,1,.02,4);const chest=a.group.getObjectByName('Chest'),before=chest.rotation.x;
   u.hurt=.25;a.update(u,1.02,.02,4);assert.ok(chest.rotation.x<before-.15);
   const spear=a.group.getObjectByName(kind==='centaur-archer'?'Ash spear':'Celder winged spear');
   assert.ok(shaft(spear).dot(new THREE.Vector3(Math.sin(1.1),0,Math.cos(1.1)))>.999,'recoil preserves the contact heading');
   a.group.updateMatrixWorld(true);a.group.traverse(o=>assert.ok(o.matrixWorld.elements.every(Number.isFinite)));
   assert.equal(a.group.rotation.y,.5);
   u.hp=0;for(let i=0;i<20;i++)a.update(u,2+i*.05,.05,4);assert.ok(a.group.rotation.z>1);
  }finally{a.dispose();}
 }
});

test('on-foot hero aims forward, keeps the walking rig, and progresses dodges without duplicate held weapons',()=>{
 const hero=createCharacter({role:'traveler'}),animate=hero.animate;let lastPose;
 hero.animate=(time,speed,grounded,pose)=>{lastPose={speed,...pose};animate(time,speed,grounded,pose);};
 hero.group.rotation.y=.8;
 try{
  hero.setWeapon('hunting-bow');
  for(let i=0;i<20;i++)cavalryFootPose(hero,i/60,0,{draw:1,aim:-.3});
  const bow=hero.group.getObjectByName('Hunting bow (held)');
  assert.ok(arrowDirection(bow).dot(new THREE.Vector3(Math.sin(.5),0,Math.cos(.5)))>.999);
  assert.ok(hero.group.getObjectByName('Left Shoulder').rotation.x<-1.5);
  assert.ok(hero.group.getObjectByName('Traveler cloak hem').rotation.x<.2,'walking cloak was not lifted into a saddle pose');
  assert.ok(Math.abs(hero.group.getObjectByName('Left Hip').rotation.z)<.2,'ordinary standing legs are not forced astride');
  cavalryFootPose(hero,1,8.8,{draw:1,dodge:.15});
  assert.deepEqual(lastPose,{speed:8.8,armed:true,draw:0,action:'dodge',progress:.5});
  for(let i=0;i<8;i++){
   const swing=i%2?.25:0;hero.setWeapon(swing?'oak-staff':'hunting-bow');hero.setArmed(true);
   cavalryFootPose(hero,2+i/10,2,{swing,draw:swing?0:1});
   assert.equal(bow.visible,!swing);assert.equal(hero.group.getObjectByName('Oak staff')?.visible??false,!!swing);
   if(swing)assert.deepEqual(lastPose,{speed:2,armed:true,draw:0,action:'attack',progress:.5});
  }
  let bows=0;hero.group.traverse(o=>{if(o.name==='Hunting bow (held)')bows++;});assert.equal(bows,1,'switching reuses the one offhand bow');
 }finally{disposeCharacter(hero);}
});

test('late spear and horse resources retire once without disposing other actors or shared primitives',()=>{
 const a=createYunethreCombatActor('centaur-archer'),b=createYunethreCombatActor('centaur-archer'),horse=createCavalryHorse(),otherHorse=createCavalryHorse();
 let foreign=0;for(const resource of new Set([...resources(b.group),...resources(otherHorse.group)]))resource.addEventListener('dispose',()=>foreign++);
 const spear=a.group.getObjectByName('Ash spear'),late=resources(spear),counts=new Map();
 // Shared box/sphere primitives also occur on b and must not be released.
 const borrowed=resources(b.group);for(const resource of late)if(!borrowed.has(resource)){counts.set(resource,0);resource.addEventListener('dispose',()=>counts.set(resource,counts.get(resource)+1));}
 a.update(unit('centaur-archer',{phase:'melee-windup',timer:.4}),1,.1,0);a.dispose();a.dispose();horse.dispose();horse.dispose();
 assert.equal(foreign,0);assert.ok(counts.size>=4);assert.ok([...counts.values()].every(n=>n===1));
 b.update(unit('centaur-archer',{phase:'draw',timer:.1}),2,.1,0);b.dispose();otherHorse.dispose();
});
