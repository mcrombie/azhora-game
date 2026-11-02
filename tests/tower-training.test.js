import test from 'node:test';
import assert from 'node:assert/strict';
import {createTrainingModel,TRAINING_LESSONS} from '../src/app/exploration/training/training-model.js';
import {createLizeemEncounter} from '../src/gameplay/combat/lizeem-encounter.js';
import {encounterAutoplayInput} from '../src/gameplay/autoplay/encounter-input.js';

const advance=(model,seconds,input={})=>{for(let n=0;n<Math.ceil(seconds*60);n++)model.tick(1/60,typeof input==='function'?input(model.snapshot()):input);return model.snapshot();};

test('training registry exposes repeatable lessons with real staff and fireball first',()=>{
  assert.deepEqual(TRAINING_LESSONS.map(lesson=>lesson.id),['staff','fireball','counter','practice']);
  const model=createTrainingModel();assert.equal(model.start('not-a-lesson'),false);assert.equal(model.snapshot().phase,'idle');
  for(const lesson of TRAINING_LESSONS){assert.equal(model.start(lesson.id),true);assert.equal(model.snapshot().hero.hp,100);assert.equal(model.snapshot().sorcery.mana,100);}
});
test('staff lesson needs two real in-range strikes; the harmless target never attacks',()=>{
  const model=createTrainingModel();model.start('staff');
  advance(model,1,{attack:true});assert.equal(model.snapshot().stats.staffHits,0);
  advance(model,.5,{z:-1});
  const result=advance(model,2,{attack:true,focusId:0});
  assert.equal(result.phase,'complete');assert.equal(result.stats.staffHits,2);assert.equal(result.hero.hp,100);
  assert.equal(result.next,'fireball');assert.equal(model.cast({x:0,y:1,z:2},{x:0,z:-1}).ok,false);
});
test('fireball lesson uses projectile travel, cost, collision, and fresh retry pool',()=>{
  const model=createTrainingModel();model.start('fireball');
  assert.equal(model.cast({x:0,y:1,z:6},{x:0,z:-1}).ok,true);
  let state=model.snapshot();assert.equal(state.stats.fireballHits,0);assert.equal(state.sorcery.mana,80);assert.equal(state.phase,'running');
  state=advance(model,1);assert.equal(state.stats.fireballHits,1);assert.equal(state.phase,'complete');
  model.start('fireball');state=model.snapshot();assert.equal(state.sorcery.mana,100);assert.equal(state.sorcery.shots.length,0);assert.equal(state.stats.fireballHits,0);
});
test('missing with a fireball does not complete the lesson; mana recovers normally',()=>{
  const model=createTrainingModel();model.start('fireball');model.cast({x:0,y:1,z:6},{x:1,z:0});
  advance(model,3);assert.equal(model.snapshot().phase,'running');assert.equal(model.snapshot().sorcery.mana,80);
  advance(model,2);assert.ok(model.snapshot().sorcery.mana>80);assert.equal(model.snapshot().stats.fireballHits,0);
});
test('dodging lesson records an actual enemy attack and staff counter',()=>{
  const model=createTrainingModel();model.start('counter');
  const result=advance(model,20,state=>encounterAutoplayInput(state));
  assert.equal(result.phase,'complete');assert.ok(result.stats.dodgeCounters>=1);
  assert.equal(result.stats.fireballHits,0);
});
test('unlimited lessons have no fight countdown and failed sparring can be retried',()=>{
  const model=createTrainingModel();model.start('fireball');advance(model,100);
  assert.equal(model.snapshot().phase,'running');assert.equal(model.snapshot().hero.hp,100);
  model.start('practice');advance(model,30);assert.equal(model.snapshot().phase,'retry');
  model.start('practice');assert.equal(model.snapshot().phase,'running');assert.equal(model.snapshot().hero.hp,100);
});
test('ordinary encounters retain their deadline and enemy attacks',()=>{
  const ordinary=createLizeemEncounter({heroStart:{x:0,z:5},guardStarts:[{x:0,z:-500}]});
  const outcome=advance(ordinary,91).outcome;assert.equal(outcome,'defeat');
  assert.throws(()=>createLizeemEncounter({timeLimit:0}));
});
