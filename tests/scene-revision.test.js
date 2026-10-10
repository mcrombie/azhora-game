import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule} from './module-loader.js';
import {createSkirmishGround} from '../src/app/exploration/skirmish-ground.js';
const THREE=await sourceModule('../vendor/three.module.js');
const {createWarHero}=await sourceModule('../src/app/exploration/afterlife-form.js');
const {createLimboChamber}=await sourceModule('../src/content/regions/minora-frontier/limbo-chamber.js');
const {createMinoraResidents}=await sourceModule('../src/app/exploration/resident-view.js');
const {MINORA_RESIDENTS}=await sourceModule('../src/content/regions/minora-frontier/minora-residents.js');
const world={bounds:{minX:-5000,maxX:5000,minZ:-5000,maxZ:5000},readyAt:()=>true,heightAt:()=>2,waterAt:()=>0,nearColliders:()=>[],regionAt:()=>({id:13})};

test('fixed central staging validates a complete fight and is deterministic across entries',()=>{
 const field=createSkirmishGround(world,{x:100,z:100},13,70),a=field.stage(0,3),b=field.stage(0,3);
 assert.deepEqual(a,b);assert.deepEqual(a.hero,{x:100,z:100});assert(a.guards.every(p=>field.canHit(a.hero,p)));
 const blocked=createSkirmishGround({...world,nearColliders:()=>[{x:100,z:100,hx:3,hz:3}]},{x:100,z:100},13,70).stage(0,4,true);
 assert(Math.hypot(blocked.hero.x-100,blocked.hero.z-100)<=24);assert.equal(blocked.guards.length,4);
 assert.throws(()=>createSkirmishGround({...world,waterAt:()=>9},{x:100,z:100},13,70).stage(),/central battlefield/);
});

test('hand and staff sockets follow casting joints, weapon visibility and transformed hero forms',()=>{
 const hero=createWarHero({});hero.group.position.set(30,4,-10);hero.group.rotation.y=.8;hero.animate(1,0,true);hero.setSpellPose(.5);
 assert.equal(hero.focusTip(),null);const hand=hero.handTip().clone();assert(hand.distanceTo(hero.group.position)>.5&&hand.distanceTo(hero.group.position)<3);
 hero.setWeapon('oak-staff');hero.setSpellPose(.5);const focus=hero.focusTip().clone();assert(focus.distanceTo(hand)>.4);
 hero.group.position.x+=10;assert(Math.abs(hero.focusTip().x-focus.x-10)<1e-6);
 hero.setSpellPose(.5,1.2);hero.group.rotation.y=0;hero.animate(2,0,true);assert.equal(hero.group.rotation.y,1.2,'Release gesture keeps facing the cast');
 hero.setArmed(false);assert.equal(hero.focusTip(),null);hero.setForm('undead');hero.setWeapon('oak-staff');assert(hero.focusTip());hero.setSpellPose(null);
});

test('Reaper is smaller and cloak encloses his torso and legs under the skull',()=>{
 const scene=new THREE.Scene(),room=createLimboChamber(scene),reaper=room.root.getObjectByName('The Grim Reaper'),cloak=reaper.getObjectByName('Closed Reaper cloak');
 assert.equal(reaper.scale.x,.86);room.root.updateMatrixWorld(true);
 const box=new THREE.Box3().setFromObject(cloak);assert(box.max.y-box.min.y>1.8);
 const centre=reaper.getWorldPosition(new THREE.Vector3());
 for(const y of [.25,1,1.7]){const ray=new THREE.Raycaster(new THREE.Vector3(centre.x,centre.y+y*.86,centre.z+2),new THREE.Vector3(0,0,-1));assert(ray.intersectObject(cloak).length,'Front cloak covers body at '+y);}
 room.dispose();
});

test('resident trial is bounded, lazy, culled and disabled without new world work',()=>{
 const scene=new THREE.Scene(),view=createMinoraResidents(scene,world);assert.equal(view.state().constructed,0);
 view.update(0,.3,{x:0,z:0});assert.equal(view.state().constructed,0);
 const p=MINORA_RESIDENTS[0];view.update(1,.3,p);assert.equal(view.state().constructed,1,'Only one new rig per update');
 for(let i=0;i<80;i++)view.update(i/10,.1,{x:-2350,z:135});
 assert(view.state().constructed>=6&&view.state().constructed<=12);assert.equal(view.state().limit,12);assert.equal(view.state().total,18);
 view.update(10,.3,{x:0,z:0});assert.equal(view.state().visible,0);const count=view.state().animationUpdates;
 for(let i=0;i<10;i++)view.update(10+i,.1,{x:0,z:0});assert.equal(view.state().animationUpdates,count);
 view.setEnabled(false);view.update(20,.3,p);assert.equal(view.state().visible,0);assert.equal(view.state().animationUpdates,count);view.dispose();
});


test('all six residents have reachable smalltalk, stop walking for it and respect occlusion',async()=>{
 const {RESIDENT_CONVERSATIONS}=await import('../src/content/regions/minora-frontier/resident-conversations.js');
 const scene=new THREE.Scene(),view=createMinoraResidents(scene,world);
 for(const def of MINORA_RESIDENTS){
   assert(RESIDENT_CONVERSATIONS[def.id].hello&&RESIDENT_CONVERSATIONS[def.id].work&&RESIDENT_CONVERSATIONS[def.id].war);
   const player=new THREE.Vector3(def.x,2,def.z+1);for(let i=0;i<7;i++)view.update(1,.3,player);
   assert.equal(view.target(player)?.id,def.id);
 }
 const satet=view.state().people.find(p=>p.id==='satet'),p=new THREE.Vector3(...satet.position);p.z+=3;
 view.setTalking('satet',p);for(let i=0;i<80;i++)view.update(i,.1,p);
 assert.deepEqual(view.state().people.find(p=>p.id==='satet').position,satet.position,'Conversation freezes the speaker');
 view.setTalking(null);view.setEnabled(false);assert.equal(view.target(p),null);view.dispose();
});
