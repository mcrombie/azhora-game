import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule} from './module-loader.js';
import {createArrivalProgress,arrivalStore,PRACTICE_KEY,returnPracticeProgress} from '../src/app/exploration/training/arrival-progress.js';
import {createBirdLifeList,BIRD_LIFE_KEY} from '../src/app/exploration/bird-life-list.js';

test('return visits preserve preparation and never relock an existing campaign behind a tutorial',()=>{
  const p=createArrivalProgress();p.introduce();for(const id of ['staff','block','dodge','fireball','militia'])p.recordLesson(id,'success',true);p.approve();p.depart();
  const data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)},store=arrivalStore(storage,PRACTICE_KEY);
  assert(store.save(p.snapshot()));assert.deepEqual(returnPracticeProgress(store.read()),p.snapshot());
  for(const old of [null,{wins:[]}]){const s=returnPracticeProgress(old);assert(s.approved&&s.departed&&s.skipped);assert.deepEqual(s.wins,[]);}
  assert(!data.has('azhora-stillroom-arrival-v1'));
});
test('life list persists distinct species; failed saves and unknown birds do not invent entries',()=>{
  const data=new Map([['campaign','unchanged']]),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
  const journal=createBirdLifeList(storage);assert.deepEqual(journal.observe('barn-owl'),{ok:true,added:true});
  assert.deepEqual(journal.observe('barn-owl'),{ok:true,added:false});assert(!journal.observe('dragon').ok);
  assert.deepEqual(createBirdLifeList(storage).species(),['barn-owl']);assert.equal(data.get('campaign'),'unchanged');
  const broken=createBirdLifeList({getItem:()=>null,setItem(){throw Error('disk');}});assert(!broken.observe('barn-owl').ok);assert.deepEqual(broken.species(),[]);
  data.set(BIRD_LIFE_KEY,'broken');assert.deepEqual(createBirdLifeList(storage).species(),[]);
});
test('Uguth has finite grounded geometry and a sheathed two-handed sword, without a hat or shield',async()=>{
  const THREE=await sourceModule('../vendor/three.module.js'),{createUguth,UGUTH}=await sourceModule('../src/content/characters/uguth.js'),{disposeCharacter}=await sourceModule('../src/content/characters/characters.js');
  const actor=createUguth();try{
    actor.animate(0,0,true);actor.group.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(actor.group);
    assert(bounds.min.y>-.15&&bounds.max.y<2.5);assert.equal(UGUTH.look.hairStyle,'bald');assert.equal(UGUTH.hat,false);
    assert.equal(actor.group.userData.design.weapon,'sheathed two-handed sword');
    actor.group.traverse(o=>{if(o.isMesh)for(const v of o.geometry.attributes.position.array)assert(Number.isFinite(v));});
  }finally{disposeCharacter(actor);}
});
