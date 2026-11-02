import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule} from './module-loader.js';
const THREE=await sourceModule('../vendor/three.module.js');
const {CENTAUR_CAMP_CAST,centaurCampWords,centaurCampTopics}=await sourceModule('../src/content/regions/minora-frontier/centaur-culture.js');
const {createCentaurCampResident}=await sourceModule('../src/content/regions/minora-frontier/centaur-camp-characters.js');
const {createCentaurCampPeople,CENTAUR_CAMP_RESIDENTS}=await sourceModule('../src/content/regions/minora-frontier/centaur-camp-people.js');
const {YUNETHRE_CAMP:C}=await sourceModule('../src/content/regions/minora-frontier/yunethre-world.js');
const world={bounds:{minX:-10000,maxX:10000,minZ:-10000,maxZ:10000},heightAt:()=>16,
  waterAt:()=>-100,nearColliders:()=>[],colliders:[],readyAt:()=>true};
const observer={...C,y:16};

test('six distinct camp voices cover livelihoods, obligations and dissent without inventing campaign outcomes',()=>{
  assert.equal(CENTAUR_CAMP_CAST.length,6);
  assert.equal(new Set(CENTAUR_CAMP_CAST.map(p=>p.id)).size,6);
  assert.equal(new Set(CENTAUR_CAMP_CAST.map(p=>p.occupation)).size,6);
  for(const person of CENTAUR_CAMP_CAST){
    for(const topic of ['hello','work','news','war','customs','dissent','future','memory'])assert.ok(centaurCampWords(person.id,topic).length>35,`${person.id}: ${topic}`);
    assert.deepEqual(centaurCampTopics(person.id).map(t=>t.id),['customs','dissent']);
    const ordinary=centaurCampWords(person.id,'war');
    assert.equal(centaurCampWords(person.id,'war',{winner:'west'}),ordinary,'Chapter 1 history does not invent a Chapter 2 treaty');
    assert.notEqual(centaurCampWords(person.id,'war',{chapter:'yunethre',battle:{status:'averted'}}),ordinary);
  }
  assert.match(centaurCampWords('centaur-delan','customs'),/niece is an elf/);
  assert.match(centaurCampWords('centaur-arven','dissent'),/return it/);
  assert.match(centaurCampWords('centaur-saera','dissent'),/interrupts/);
  assert.match(centaurCampWords('centaur-ilyra','dissent'),/place in the council/);
  assert.equal(centaurCampWords('unknown','hello'),null);assert.equal(centaurCampTopics('unknown'),null);
});

test('camp costumes remain articulated and economical, with separate tools and independent disposal',()=>{
  const actors=CENTAUR_CAMP_CAST.map(createCentaurCampResident);
  try{
    const tools=new Set();
    for(const actor of actors){
      tools.add(actor.metadata.tool);let meshes=0,triangles=0;
      actor.group.traverse(o=>assert.doesNotMatch(o.name,/spear|pike|staff|pole/i,'civilian construction must omit inherited combat props, not merely hide them'));
      const grip=actor.group.getObjectByName('Traveler weapon grip');
      assert.ok(grip);assert.equal(grip.children.length,0,'unarmed civilians have no fallback weapon in their combat mount');
      actor.animate(1.1,0,{working:true});actor.group.updateMatrixWorld(true);
      actor.group.traverseVisible(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}});
      assert.ok(meshes<45,`draw budget: ${meshes}`);assert.ok(triangles<20000,`triangle budget: ${triangles}`);
      const bounds=new THREE.Box3();actor.group.traverseVisible(o=>{if(o.isMesh){o.geometry.computeBoundingBox();bounds.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));}});
      const size=bounds.getSize(new THREE.Vector3());
      assert.ok(size.y>2.2&&size.y<3.2&&size.z>2.2&&size.z<3.7,`unarmed clothes preserve the standing centaur silhouette without stray floating parts: ${size.toArray()}`);
      const tool=actor.group.getObjectByName(`${actor.group.name.split(' / ')[0]} / ${actor.metadata.tool}`);
      assert.ok(tool);assert.equal(tool.visible,true);
      actor.animate(1.1,0,{talking:true});assert.equal(tool.visible,false,'daily hand tools do not wave at a person during conversation');
      actor.animate(2,.72,{working:false});assert.ok(actor.group.getObjectByName('Spine'));
      assert.equal(grip.children.length,0,'work and conversation do not recreate combat equipment');
      actor.group.traverse(o=>{assert.ok(o.position.toArray().every(Number.isFinite));assert.ok(o.rotation.toArray().slice(0,3).every(Number.isFinite));});
    }
    assert.equal(tools.size,6);
    const retained=new Set();actors[1].group.traverse(o=>{if(o.isMesh)retained.add(o.geometry);});
    let foreignDisposals=0;for(const geometry of retained)geometry.addEventListener('dispose',()=>foreignDisposals++);
    actors[0].dispose();actors[0].dispose();assert.equal(foreignDisposals,0,'one resident cannot dispose another resident\'s shared rig');
    actors[1].animate(4,0,{working:true});
  }finally{for(const actor of actors)actor.dispose();}
});

const lightActor=def=>{
  const group=new THREE.Group();group.name=def.name;
  return {group,animate(time,speed,pose){group.userData.lastPose={time,speed,pose};},dispose(){group.removeFromParent();}};
};
function populate(camp){for(let i=0;i<9;i++)camp.update(i*.1,.1,observer);}

test('camp residents build incrementally, pause, talk, and disappear from targeting when the camp is inactive',()=>{
  const parent=new THREE.Group(),camp=createCentaurCampPeople(parent,world,{createResident:lightActor});
  try{
    camp.update(0,.1,observer);assert.equal(camp.state().loaded,1);populate(camp);assert.equal(camp.state().loaded,6);
    const before=structuredClone(camp.people());for(let i=0;i<20;i++)camp.update(100+i,0,observer);
    assert.deepEqual(camp.people(),before,'display time cannot run a paused routine');
    const saera=camp.people().find(p=>p.id==='centaur-saera'),near={x:saera.x+2,y:16,z:saera.z};
    assert.equal(camp.target(near).id,saera.id);assert.equal(camp.target({...near,y:22}),null);
    camp.setTalking(saera.id,near);for(let i=0;i<120;i++)camp.update(i,.1,near);
    const stopped=camp.people().find(p=>p.id===saera.id);assert.equal(stopped.x,saera.x);assert.equal(stopped.z,saera.z);
    camp.setTalking(null);for(let i=0;i<150;i++)camp.update(i,.1,observer);
    assert.ok(camp.people().some(p=>Math.hypot(p.x-before.find(b=>b.id===p.id).x,p.z-before.find(b=>b.id===p.id).z)>.1),'people actually move between local tasks');
    camp.setActive(false);assert.deepEqual(camp.people(),[]);assert.equal(camp.target(near),null);
    const hidden=camp.state().loaded;camp.update(999,1,observer);assert.equal(camp.state().loaded,hidden);
    camp.setActive(true);camp.update(1000,.1,observer);assert.equal(camp.people().length,6);
  }finally{camp.dispose();camp.dispose();}assert.equal(parent.children.length,0);
});

test('blocked homes do not starve later people, and conversations cannot pass through walls',()=>{
  const parent=new THREE.Group(),first=CENTAUR_CAMP_RESIDENTS[0];let obstacles=[{x:first.x,z:first.z,r:4}];
  const camp=createCentaurCampPeople(parent,{...world,nearColliders:()=>obstacles},{createResident:lightActor});
  try{
    for(let i=0;i<20;i++)camp.update(i,.1,observer);assert.equal(camp.state().loaded,5);
    assert.equal(camp.people().some(p=>p.id===first.id),false);
    const p=camp.people()[0],near={x:p.x+3,y:16,z:p.z};assert.equal(camp.target(near).id,p.id);
    obstacles=[{x:p.x+1.5,z:p.z,r:.3,minY:16,maxY:21}];assert.equal(camp.target(near),null);
  }finally{camp.dispose();}
  const wet=createCentaurCampPeople(parent,{...world,waterAt:()=>20},{createResident:lightActor});
  try{populate(wet);assert.equal(wet.state().loaded,0);}finally{wet.dispose();}
});
