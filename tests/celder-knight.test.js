import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule} from './module-loader.js';
const THREE=await sourceModule('../vendor/three.module.js');
const {createCelderKnight}=await sourceModule('../src/world/actors/celder-knight.js');
const {createCelderPresence,CELDER_SENTRIES}=await sourceModule('../src/content/chapters/yunethre/celder-presence.js');
const {CANERD}=await sourceModule('../src/content/regions/canerd/canerd-world.js');

test('Celder mail knights have bounded articulated geometry and retain the host transform',()=>{
  for(const envoy of [false,true]){
    const actor=createCelderKnight({envoy}),root=actor.group;
    root.position.set(-2615,9.4,-1017);root.rotation.y=Math.PI;
    let draws=0,triangles=0;root.traverse(mesh=>{if(!mesh.isMesh)return;draws++;triangles+=(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3;
      for(const key of ['position','normal'])assert.ok(mesh.geometry.attributes[key].array.every(Number.isFinite));});
    assert.ok(draws<32&&triangles<16000,`${draws} draws / ${triangles} triangles`);
    const leg=root.getObjectByName('Left Hip'),head=root.getObjectByName('Head'),angles=[];
    for(let i=0;i<40;i++){actor.animate(i/10,i<10?0:3.4,true);root.updateWorldMatrix(true,true);angles.push(leg.rotation.x);root.traverse(o=>assert.ok(o.matrixWorld.elements.every(Number.isFinite)));}
    assert.ok(Math.max(...angles)-Math.min(...angles)>.5,'legs articulate instead of sliding as one solid figure');
    assert.deepEqual(root.position.toArray(),[-2615,9.4,-1017]);assert.equal(root.rotation.y,Math.PI);
    const headSize=new THREE.Box3().setFromObject(head).getSize(new THREE.Vector3());assert.ok(headSize.y<.65&&headSize.x<.4,'open helm and face retain adult proportions');
    assert.ok(root.getObjectByName('Split mail skirt'));assert.ok(root.getObjectByName('Interlinked chest mail'));
    assert.ok(root.getObjectByName('Nasal guard'));assert.ok(root.getObjectByName('Blue mantle with deep folds'));
    actor.setArmed(false);actor.setShield(false);actor.animate(0);assert.equal(root.getObjectByName('Celder winged spear').visible,false);assert.equal(root.getObjectByName('Celder oval shield').visible,false);
    actor.setArmed(true);actor.setShield(true);actor.animate(0);assert.equal(root.getObjectByName('Celder winged spear').visible,true);
    actor.dispose();
  }
});

test('knight materials are owned per actor so retiring one does not dispose another',()=>{
  const a=createCelderKnight(),b=createCelderKnight(),first=new Set(),second=new Set();
  a.group.traverse(o=>{if(o.isMesh)first.add(o.material);});b.group.traverse(o=>{if(o.isMesh)second.add(o.material);});
  assert.ok([...second].every(m=>!first.has(m)));
  let disposed=0;for(const m of second)m.addEventListener('dispose',()=>disposed++);
  a.dispose();assert.equal(disposed,0);b.animate(10);b.dispose();assert.equal(disposed,second.size);
});

test('the blue cloak faces outward and its ivory lining faces the body after batching',()=>{
  const actor=createCelderKnight({envoy:true}),cloak=actor.group.getObjectByName('Heavy wool cloak');
  for(const [hex,direction] of [[0x203a58,-1],[0xd8c9a1,1]]){
    const color=new THREE.Color(hex);let count=0,z=0;
    cloak.traverse(mesh=>{if(!mesh.isMesh)return;const colors=mesh.geometry.attributes.color,normals=mesh.geometry.attributes.normal;if(!colors)return;
      for(let i=0;i<colors.count;i++)if(Math.abs(colors.getX(i)-color.r)+Math.abs(colors.getY(i)-color.g)+Math.abs(colors.getZ(i)-color.b)<.001){count++;z+=normals.getZ(i);}});
    assert.ok(count>=20&&z/count*direction>.6,'the visible side of the drapery is not reversed or culled');
  }
  actor.dispose();
});

test('the two ambient gate sentries stay off the travel lane and disappear with unavailable scenery',()=>{
  const parent=new THREE.Group();let ready=false;
  const presence=createCelderPresence({parent,world:{readyAt:()=>ready,heightAt:()=>12}}),root=parent.getObjectByName('Celder gate household');
  presence.update(0);assert.equal(root.children.length,0,'no actors before their actual region loads');
  ready=true;presence.update(1);assert.equal(root.children.length,2);
  for(const site of CELDER_SENTRIES){assert.ok(Math.abs(site.x-CANERD.gate.x)>=4,'central passage stays clear');assert.ok(site.z<CANERD.gate.z);}
  for(const actor of root.children){assert.equal(actor.position.y,12);assert.equal(actor.visible,true);assert.equal(actor.rotation.y,0);}
  presence.update(2,false);assert.equal(root.visible,false);
  ready=false;presence.update(3,true);assert.equal(root.visible,true);assert.ok(root.children.every(actor=>!actor.visible));
  ready=true;presence.update(4);assert.equal(root.children.length,2,'reloading does not duplicate the garrison');assert.ok(root.children.every(actor=>actor.visible));
  presence.dispose();assert.equal(parent.children.length,0);
});
