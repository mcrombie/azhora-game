import test from 'node:test';
import assert from 'node:assert/strict';
import {createOvesosPractice} from '../src/dev/tools/ovesos-practice.js';
import {COMBAT_EXERCISES,COMBAT_TEST_STORE} from '../src/app/exploration/combat-testing.js';
import {MODES,launchMode,allowsRegion} from '../src/app/exploration/modes.js';

test('standalone combat offers the existing exercises with no save capability or other regions',()=>{
  assert.deepEqual(COMBAT_EXERCISES.map(e=>e.id),['lesson','advanced','squad','allied','solo-assault']);
  assert.equal(launchMode('?mode=combat').id,'combat');assert(allowsRegion(MODES.combat,16));assert(!allowsRegion(MODES.combat,25));
  assert(!COMBAT_TEST_STORE.save({anything:true}).ok);assert.deepEqual(COMBAT_TEST_STORE.read(),{ok:true,data:null});
});
test('practice retries reuse preparation, dispose the previous fight, and restore the original session once',async()=>{
  let prepares=0,opens=0,disposals=0,restores=0;const saved={hero:'original'};
  const p=createOvesosPractice({capture:()=>saved,prepare:async()=>{prepares++;return {wallMs:2};},open:()=>{opens++;return {snapshot:()=>({hp:100}),dispose:()=>disposals++};},restore:s=>{assert.equal(s,saved);restores++;},onError:assert.fail});
  await p.start();await p.start();p.retry();p.retry();assert.equal(prepares,1);assert.equal(opens,3);assert.equal(disposals,2);assert.equal(p.state().attempt,3);
  p.finish();p.finish();assert.equal(disposals,3);assert.equal(restores,1);assert.equal(p.state().active,false);
});
test('failed practice preparation returns to the original session without opening combat',async()=>{
  let restored=false,message;const p=createOvesosPractice({capture:()=>7,prepare:async()=>{throw Error('terrain failed');},open:assert.fail,restore:s=>{assert.equal(s,7);restored=true;},onError:e=>message=e.message});
  await p.start();assert(restored);assert.equal(message,'terrain failed');assert(!p.state().active);
});

test('lesson is the default and retries preserve the chosen three-soldier exercise',async()=>{
  const exercises=[];
  const p=createOvesosPractice({capture:()=>0,prepare:async()=>{},open:({exercise})=>{exercises.push(exercise);return {dispose(){},snapshot:()=>({})};},restore(){},onError:assert.fail});
  await p.start();assert.equal(p.state().exercise,'lesson');p.finish();
  await p.start('squad');p.retry();assert.equal(p.state().exercise,'squad');p.finish();
  await p.start('advanced');p.retry();assert.equal(p.state().exercise,'advanced');p.finish();
  assert.deepEqual(exercises,['lesson','squad','squad','advanced','advanced']);
});
