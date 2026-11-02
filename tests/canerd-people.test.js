import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule} from './module-loader.js';
const THREE=await sourceModule('../vendor/three.module.js');
const {CANERD,CANERD_GARDEN}=await sourceModule('../src/content/regions/canerd/canerd-world.js');
const {createCanerdScenery}=await sourceModule('../src/content/regions/canerd/canerd-scenery.js');
const {CANERD_RESIDENTS}=await sourceModule('../src/content/regions/canerd/canerd-residents.js');
const {createCanerdPeople,canerdRouteClear}=await sourceModule('../src/content/regions/canerd/canerd-people.js');
const {canerdResidentWords,canerdResidentTopics}=await sourceModule('../src/content/regions/canerd/canerd-dialogue.js');
const {canStand}=await sourceModule('../src/gameplay/movement/locomotion.js');
const {LAKETOWN_RESIDENTS,laketownResidentWords}=await sourceModule('../src/content/regions/minora-frontier/laketown-residents.js');
const sceneryParent=new THREE.Group(),colliders=[],heightAt=()=>CANERD.summitHeight;
createCanerdScenery({parent:sceneryParent,heightAt,colliders});
const world={heightAt,waterAt:()=>-100,colliders,bounds:{minX:CANERD.x-300,maxX:CANERD.x+300,minZ:CANERD.z-300,maxZ:CANERD.z+300},readyAt:()=>true};
const observer={x:CANERD.x-12,y:heightAt(),z:CANERD.z+29};

test('Canerd has six human civilian livelihoods and clear loops through the actual castle and garden',()=>{
  assert.equal(CANERD_RESIDENTS.length,6);
  assert.equal(new Set(CANERD_RESIDENTS.map(p=>p.id)).size,6);
  assert.equal(new Set(CANERD_RESIDENTS.map(p=>p.occupation)).size,6);
  for(const p of CANERD_RESIDENTS){
    assert.equal(p.species,'human');assert.equal(p.faction,'celder');
    assert.ok(p.routine.length>=3);assert.ok(canerdRouteClear(world,p.routine),p.id);
    assert.ok(p.routine.some(stop=>stop.wait>0));
    for(const topic of ['hello','work','news','war','future','memory'])assert.ok(canerdResidentWords(p.id,topic).length>30,`${p.id}/${topic}`);
  }
  assert.deepEqual(new Set(LAKETOWN_RESIDENTS.map(p=>p.species)),new Set(['human','elf','dwarf','centaur','satyr']));
  assert.match(laketownResidentWords('laketown-aelin','war'),/Celder.*human-only/);
  assert.match(canerdResidentWords('canerd-edrin','war'),/Centaurs, elves, dwarves and satyrs are excluded/);
});

test('all household members walk, work and turn; wizard usually stays at the hall and makes a complete oak visit',()=>{
  const parent=new THREE.Group(),life=createCanerdPeople(parent,world);
  let oakSeen=false,returned=false,hallSeconds=0,previous=null,maxStep=0;
  const yawRanges=new Map(),movedAt30=new Map();
  try{
    life.update(0,.1,observer);assert.equal(life.state().loaded,1,'Rig construction is incremental.');
    for(let i=1;i<=4500;i++){
      life.update(i*.1,.1,observer);
      if(i%10)continue;
      const state=life.state();
      for(const p of state.people){
        assert.ok(canStand(p.x,p.z,world,.42,p.y),`${p.id} walked into scenery`);
        assert.equal(p.y,heightAt());assert.equal(p.routeClear,true);
        const range=yawRanges.get(p.id)??[p.yaw,p.yaw];range[0]=Math.min(range[0],p.yaw);range[1]=Math.max(range[1],p.yaw);yawRanges.set(p.id,range);
        const before=previous?.find(q=>q.id===p.id);if(before)maxStep=Math.max(maxStep,Math.hypot(p.x-before.x,p.z-before.z));
        if(i===300)movedAt30.set(p.id,p.distanceWalked);
      }
      for(let a=0;a<state.people.length;a++)for(let b=a+1;b<state.people.length;b++){
        const p=state.people[a],q=state.people[b];assert.ok(Math.hypot(p.x-q.x,p.z-q.z)>=.93,'Residents keep their body clearance.');
      }
      const wizard=state.people.find(p=>p.id==='canerd-arbor-wizard');
      if(wizard.z<CANERD.z+5)hallSeconds++;
      if(Math.hypot(wizard.x-CANERD_GARDEN.approach.x,wizard.z-CANERD_GARDEN.approach.z)<.05)oakSeen=true;
      if(oakSeen&&wizard.routineIndex===0&&wizard.wait>0)returned=true;
      previous=state.people;
    }
    assert.equal(life.state().loaded,6);assert.ok(oakSeen&&returned);
    assert.ok(hallSeconds>450*.6,`Wizard hall time was ${hallSeconds}/450 seconds.`);
    assert.ok(maxStep<1.1,'Walking has no teleport or clock catch-up.');
    for(const p of life.state().people){
      assert.ok(p.distanceWalked>30,p.id);const range=yawRanges.get(p.id);assert.ok(range[1]-range[0]>.25,p.id+' turns naturally');
      if(p.id!=='canerd-arbor-wizard')assert.ok(movedAt30.get(p.id)>2,p.id+' starts ordinary work promptly');
    }
    assert.ok(life.state().animationUpdates>1000);
  }finally{life.dispose();}assert.equal(parent.children.length,0);
});

test('paused time, conversation and a blocked path hold positions without disabling other civilians',()=>{
  let extra=[];const localWorld={...world,nearColliders:()=>[...colliders,...extra]},parent=new THREE.Group(),life=createCanerdPeople(parent,localWorld);
  try{
    for(let i=0;i<10;i++)life.update(i*.1,.1,observer);
    const held=life.state();for(let i=0;i<20;i++)life.update(1000+i,0,observer);
    assert.deepEqual(life.state(),held,'Paused absolute time does not animate, rotate, or move the household.');
    const wizard=life.people().find(p=>p.id==='canerd-arbor-wizard'),near={x:wizard.x+2,y:wizard.y,z:wizard.z};
    assert.equal(life.target(near)?.id,wizard.id);assert.equal(life.target({...near,y:near.y+5}),null);
    life.setTalking(wizard.id,near);
    for(let i=0;i<1300;i++)life.update(i*.1,.1,near);
    const talking=life.people().find(p=>p.id===wizard.id);assert.equal(talking.x,wizard.x);assert.equal(talking.z,wizard.z);
    assert.equal(life.state().people.find(p=>p.id===wizard.id).activity,'talking');
    life.setTalking(null);for(let i=0;i<1200;i++)life.update(i*.1,.1,observer);
    assert.ok(life.state().people.find(p=>p.id===wizard.id).distanceWalked>0,'Routine resumes from its held point.');
    const person=life.people().find(p=>p.id==='canerd-bren');extra=[{x:person.x,z:person.z,r:2,minY:person.y,maxY:person.y+3}];
    const before={x:person.x,z:person.z};for(let i=0;i<300;i++)life.update(i*.1,.1,observer);
    const stopped=life.people().find(p=>p.id===person.id);assert.equal(stopped.x,before.x);assert.equal(stopped.z,before.z);
    const at={x:stopped.x+3,y:stopped.y,z:stopped.z};assert.notEqual(life.target(at)?.id,stopped.id,'A wall obstructs the conversation sight line.');
  }finally{life.dispose();}
});

test('Arbor Wizard reads a canonical deduplicated life list without changing it or offering rewards',()=>{
  const ids=Object.freeze(['acor','english-oak','black-willow','not-a-tree']);
  const text=canerdResidentWords('canerd-arbor-wizard','lifelist',{treeLifeList:ids});
  assert.match(text,/2 tree species/);assert.match(text,/English oak/);assert.match(text,/Black willow/);
  assert.deepEqual(ids,['acor','english-oak','black-willow','not-a-tree']);
  assert.match(canerdResidentWords('canerd-arbor-wizard','lifelist'),/empty list/);
  assert.doesNotMatch(text,/reward|experience|quest|unlocked/i);
  assert.deepEqual(canerdResidentTopics('canerd-arbor-wizard').map(t=>t.id),['trees','lifelist']);
  assert.equal(canerdResidentWords('not-a-resident','hello'),null);
});
