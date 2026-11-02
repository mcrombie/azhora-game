import {COMBAT_LESSONS} from '../src/gameplay/combat/combat-tutorial.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createArrivalProgress,validArrival,arrivalStore,REQUIRED_TRIALS,ARRIVAL_KEY,ARRIVAL_TRIALS,configuredArrivalTrial,nextArrivalRound} from '../src/app/exploration/training/arrival-progress.js';
import {COMBAT_TRIALS} from '../src/gameplay/combat/combat-trials.js';
test('arrival door requires demonstrated tutorial lessons, not challenge wins or Uguth duels',()=>{
  const p=createArrivalProgress();assert(!p.depart());assert(!p.approve());assert(!p.skip());assert(!p.recordLesson('staff','success',true));
  p.introduce();for(const t of COMBAT_TRIALS)assert(p.recordChallenge(t.id,'success'));p.recordUguth('success');
  assert(!p.approve());assert(!p.depart());assert.deepEqual(p.snapshot().lessons,[]);
  assert(!p.recordLesson('militia','success',true));
  for(const lesson of COMBAT_LESSONS){assert(!p.depart());assert(!p.recordLesson(lesson.id,'success',false));assert(!p.recordLesson(lesson.id,'defeat',true));assert(p.recordLesson(lesson.id,'success',true));}
  assert(p.snapshot().approved);assert(p.depart());assert(validArrival(p.snapshot()));
});

test('save and restore preserve independent lessons, challenge selections and optional duel wins',()=>{
  let p=createArrivalProgress();p.introduce();p.recordLesson('staff','success',true);p.recordChallenge('ogre-bruiser','success');
  p=createArrivalProgress(p.snapshot());assert(!p.depart());assert(!p.recordLesson('militia','success',true));
  for(const lesson of COMBAT_LESSONS.slice(1))assert(p.recordLesson(lesson.id,'success',true));
  p.recordUguth('defeat');assert.equal(p.snapshot().uguthWins,0);p.recordUguth('success');
  const restored=createArrivalProgress(p.snapshot());assert(restored.depart());assert.deepEqual(restored.snapshot().wins,['ogre-bruiser']);assert.equal(restored.snapshot().uguthWins,1);
});
test('temporary skip is explicit and never invents completed rounds',()=>{
  const p=createArrivalProgress();p.introduce();p.record(0,'success');assert(p.skip());assert(p.depart());
  assert.equal(p.snapshot().skipped,true);assert.deepEqual(p.snapshot().wins,[REQUIRED_TRIALS[0]]);assert(validArrival(p.snapshot()));
});

test('legacy trial identities remain readable when the optional difficulty ladder changes',()=>{
  assert.deepEqual(ARRIVAL_TRIALS.slice(0,4).map(t=>t.id),REQUIRED_TRIALS);
  for(let i=0;i<4;i++)assert.equal(configuredArrivalTrial(i,'spear').id,REQUIRED_TRIALS[i]);
  assert.notDeepEqual(COMBAT_TRIALS.slice(0,4).map(t=>t.id),REQUIRED_TRIALS);
  assert.deepEqual(ARRIVAL_TRIALS.slice(4),COMBAT_TRIALS.filter(t=>!REQUIRED_TRIALS.includes(t.id)));
});

test('legacy checkpoints preserve approval and challenge identities without fabricating demonstrated lessons',()=>{
  const old=['bramble-goblin','wolf','bandit','militiaman','orc-raider','ambron-soldier','orc-warrior','veteran-ambron-soldier','veteran-orc-warrior','ogre-bruiser','elven-duelist','dwarven-shieldwarden','rogue-battlemage','regenerating-troll','undead-knight'];
  for(const count of [0,2,4,9,15]){
    const saved={version:1,introduced:true,wins:old.slice(0,count),skipped:false,approved:count>=4,departed:count>=4};
    assert(validArrival(saved));const p=createArrivalProgress(saved),s=p.snapshot();
    assert.equal(s.version,3);assert.deepEqual(s.wins,saved.wins);assert.deepEqual(s.lessons,[]);assert.equal(s.legacyApproval,saved.approved);assert.equal(s.approved,saved.approved);assert.equal(s.departed,saved.departed);
    const next=nextArrivalRound(s);assert(!s.wins.includes(ARRIVAL_TRIALS[next].id));assert(p.record(next,'success'));
    assert(validArrival(p.snapshot()));assert.equal(p.snapshot().wins.length,count+1);
  }
});
test('malformed progress cannot silently unlock a portal',()=>{
  const base=createArrivalProgress().snapshot();
  for(const patch of [{approved:true},{departed:true},{wins:['militiaman']},{wins:['bramble-goblin','bramble-goblin']},{wins:[...REQUIRED_TRIALS],introduced:false,approved:true},{version:9}]){
    assert(!validArrival({...base,...patch}));assert.throws(()=>createArrivalProgress({...base,...patch}));
  }
});
test('arrival uses its own bounded save record and clears through the desktop storage API',()=>{
  const records=new Map([['existing-war','keep-me']]),storage={getItem:k=>records.get(k)??null,setItem:(k,v)=>records.set(k,v)},store=arrivalStore(storage);
  assert.equal(store.read(),null);assert(store.save(createArrivalProgress().snapshot()));assert(validArrival(store.read()));
  store.clear();assert.equal(store.read(),null);assert.equal(records.get('existing-war'),'keep-me');
  records.set(ARRIVAL_KEY,'{"approved":true}');assert.equal(store.read(),null);
  assert.equal(arrivalStore({setItem(){throw Error('disk');}}).save(createArrivalProgress().snapshot()),false);
});
