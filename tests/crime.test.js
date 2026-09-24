import test from 'node:test';
import assert from 'node:assert/strict';
import {createCrime,validCrimeState,LAW} from '../src/crime.js';

test('assault injures a peaceful person and leaves a persistent bounty',()=>{
  const law=createCrime(),result=law.hit({id:'harbormaster',damage:24,essential:true,position:{x:2,z:3}});
  assert.equal(result.hp,36);assert.equal(result.bounty,20);assert.equal(law.view().wanted,true);
  const saved=law.snapshot(),copy=createCrime();assert.equal(copy.restore(saved),true);assert.deepEqual(copy.snapshot(),saved);
  saved.people.harbormaster.hp=1;assert.equal(law.health('harbormaster').hp,36,'snapshots do not expose mutable state');
});

test('self defense and attacks from others do damage without creating a player crime',()=>{
  const law=createCrime();assert.equal(law.hit({id:'person',damage:15,unlawful:false}).crime,false);
  assert.equal(law.health('person').hp,45);assert.equal(law.view().wanted,false);
  for(const damage of [0,-1,NaN,Infinity])assert.equal(law.hit({id:'person',damage}).ok,false);
  assert.equal(law.hit({id:'__proto__',damage:5}).ok,false);
});

test('essential actors recover, ordinary deaths persist after one-time body cleanup',()=>{
  const law=createCrime();law.hit({id:'jojo',damage:100,essential:true});law.hit({id:'resident',damage:100});
  assert.equal(law.health('jojo').status,'downed');assert.equal(law.health('resident').status,'dead');
  assert.equal(law.hit({id:'resident',damage:5}).ok,false,'a fallen body cannot incur more charges');
  assert.equal(law.tick(LAW.cleanupSeconds).filter(e=>e.type==='cleanup').length,2);
  assert.equal(law.tick(.1).length,0,'cleanup is not repeated');
  const events=law.tick(LAW.recoverySeconds-LAW.cleanupSeconds);
  assert.equal(events[0].type,'revived');assert.equal(law.health('jojo').hp,60);
  assert.equal(law.health('resident').status,'dead');assert.equal(validCrimeState(law.snapshot()),true);
});

test('fine and jail resolution are atomic, once-only and leave deaths unchanged',()=>{
  const law=createCrime();law.hit({id:'resident',damage:100});const snapshot=law.snapshot();
  assert.equal(law.settle('fine',()=>false).ok,false);assert.deepEqual(law.snapshot(),snapshot);
  let charged=0;assert.equal(law.settle('fine',sum=>{charged+=sum;return true;}).ok,true);
  assert.equal(charged,120);assert.equal(law.settle('fine',()=>assert.fail('charged twice')).ok,false);
  assert.equal(law.health('resident').status,'dead');assert.equal(law.view().wanted,false);
  law.hit({id:'guard',damage:1});assert.equal(law.resist().ok,true);law.resist();
  assert.equal(law.state().refusals,1);assert.equal(law.state().bounty,50);
  const jail=law.settle('jail');assert.equal(jail.seconds,300);assert.equal(law.state().jailCount,1);
});

test('malformed saves fail closed and leave an existing wanted state intact',()=>{
  const law=createCrime();law.hit({id:'resident',damage:1});const valid=law.snapshot();
  for(const invalid of [{...valid,bounty:-1},{...valid,phase:'clear'},{...valid,people:{bad:{hp:NaN}}},
    {...valid,version:90},{...valid,people:[]}]){assert.equal(law.restore(invalid),false);assert.deepEqual(law.snapshot(),valid);}
  assert.equal(law.restore(undefined),true);assert.equal(law.view().wanted,false);
});
