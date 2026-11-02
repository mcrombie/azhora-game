import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule} from './module-loader.js';
const THREE=await sourceModule('../vendor/three.module.js');
const {createLaketownPeople}=await sourceModule('../src/content/regions/minora-frontier/laketown-people.js');
const {LAKETOWN_RESIDENTS,laketownResidentWords}=await sourceModule('../src/content/regions/minora-frontier/laketown-residents.js');
const {residentWords}=await sourceModule('../src/app/exploration/resident-dialogue.js');
const {YUNETHRE_TOWN:T}=await sourceModule('../src/content/regions/minora-frontier/yunethre-world.js');
const world={bounds:{minX:-10000,maxX:10000,minZ:-10000,maxZ:10000},heightAt:()=>18,waterAt:()=>-100,colliders:[],nearColliders:()=>[],readyAt:()=>true};

test('Laketown neighbours all have conversation topics through the ordinary dialogue provider',()=>{
  assert.equal(LAKETOWN_RESIDENTS.length,10);
  assert.deepEqual(new Set(LAKETOWN_RESIDENTS.map(p=>p.species)),new Set(['human','elf','dwarf','centaur','satyr']));
  for(const p of LAKETOWN_RESIDENTS)for(const topic of ['hello','work','news','war','future','memory']){
    assert.ok(laketownResidentWords(p.id,topic).length>25);
    assert.equal(residentWords(p.id,topic,{winner:'east'}),laketownResidentWords(p.id,topic));
  }
  assert.equal(laketownResidentWords('rudiger','hello'),null);
});

test('town rigs build incrementally, pause and stop for conversation; targets use range, height and sight',()=>{
  const scene=new THREE.Group(),town=createLaketownPeople(scene,world),observer={x:T.x,y:18,z:T.z+4};
  try{
    town.update(0,.1,observer);assert.equal(town.state().loaded,1);
    for(let i=1;i<12;i++)town.update(i*.1,.1,observer);
    assert.equal(town.state().loaded,10);assert.equal(town.people().length,10);
    const before=town.people();for(let i=0;i<10;i++)town.update(100+i,0,observer);
    assert.deepEqual(town.people(),before,'absolute display time does not advance a held local routine');
    const oren=town.people().find(p=>p.id==='laketown-oren'),near={x:oren.x+1.5,y:18,z:oren.z};
    assert.equal(town.target(near).id,oren.id);assert.equal(town.target({...near,y:23}),null);
    town.setTalking(oren.id,near);
    for(let i=0;i<200;i++)town.update(i*.1,.1,near);
    const stopped=town.people().find(p=>p.id===oren.id);assert.equal(stopped.x,oren.x);assert.equal(stopped.z,oren.z);
    town.setTalking(null);for(let i=0;i<100;i++)town.update(i*.1,.1,observer);
    assert.ok(town.people().every(p=>Number.isFinite(p.x)&&p.y===18&&Number.isFinite(p.z)));
    town.update(30,.1,{x:0,y:0,z:0});assert.equal(town.people().length,0);
  }finally{town.dispose();}assert.equal(scene.children.length,0);
});

test('residents do not spawn in blocked plots or talk through intervening walls',()=>{
  const scene=new THREE.Group(),blocked=createLaketownPeople(scene,{...world,nearColliders:()=>[{x:T.x,z:T.z,r:200}]});
  for(let i=0;i<20;i++)blocked.update(i,.1,{...T,y:18});assert.equal(blocked.state().loaded,0);blocked.dispose();
  let obstacles=[];const town=createLaketownPeople(scene,{...world,nearColliders:()=>obstacles});
  for(let i=0;i<12;i++)town.update(i,.1,{...T,y:18});
  const p=town.people()[0],observer={x:p.x+3,y:18,z:p.z};assert.equal(town.target(observer)?.id,p.id);
  obstacles=[{x:p.x+1.5,z:p.z,r:.3,minY:18,maxY:22}];assert.equal(town.target(observer),null);
  town.dispose();assert.equal(scene.children.length,0);
});

test('one obstructed home does not prevent the remaining neighbours from appearing',()=>{
  const scene=new THREE.Group(),first=LAKETOWN_RESIDENTS[0],town=createLaketownPeople(scene,{...world,nearColliders:()=>[{x:first.x,z:first.z,r:4}]});
  try{
    for(let i=0;i<30;i++)town.update(i,.1,{...T,y:18});
    assert.equal(town.state().loaded,9);assert.equal(town.people().some(p=>p.id===first.id),false);
    assert.equal(new Set(town.people().map(p=>p.species)).size,5);
  }finally{town.dispose();}
});
