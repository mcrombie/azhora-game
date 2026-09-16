import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoadCheckpoint } from '../src/road-checkpoint.js';
import { createInventoryState } from '../src/inventory.js';
import { createWeapons } from '../src/weapons.js';
import { createCampcraft } from '../src/campcraft.js';
import { createJourney } from '../src/journey.js';
import { createForestStory } from '../src/forest-story.js';

function fixture() {
  const inventory=createInventoryState();inventory.grant('simple-sword');
  const weapons=createWeapons({inventory}),camp=createCampcraft({inventory,weapons}),story=createForestStory({inventory,weapons});
  let raw=null;const checkpoint=createRoadCheckpoint({storage:{getItem:()=>raw,setItem:(_,value)=>raw=value}});
  const data={version:1,questStage:1,journey:createJourney().snapshot(),inventory:[{id:'simple-sword',quantity:1}],
    weapons:weapons.snapshot(),journeyGathered:[],meadowCleared:false,position:{x:0,z:16},heardDoom:false,health:81,
    woodland:{version:1,acornStatus:'available',practiceHits:0,practiceDodges:0,acorns:[],sticks:[],fruits:[],discoveries:['harbor'],camp:camp.checkpoint()},
    forestStory:story.snapshot()};
  return {inventory,weapons,camp,story,checkpoint,data};
}

test('first-shore save needs neither letter nor token and restores gathered sites and optional stories',()=>{
  const {data,checkpoint,story}=fixture();
  story.act('recover-work-bundle');data.forestStory=story.snapshot();
  data.woodland.acorns=['acorn-1-2'];data.woodland.sticks=['stick-2-1'];data.woodland.fruits=['pawpaw-4-2'];data.woodland.acornStatus='active';
  assert.equal(checkpoint.save(data).ok,true);assert.deepEqual(checkpoint.read().data,data);
  const next=createForestStory();assert.equal(next.restore(checkpoint.read().data.forestStory),true);
  assert.equal(next.state.bundleRecovered,true);assert.equal(next.state.bundleReturned,false);
  const copy=checkpoint.read().data;copy.woodland.acorns.push('acorn-1-3');assert.deepEqual(checkpoint.read().data,data);
});

test('partial practice resumes but invalid lesson, gathering, camp and story data cannot replace a save',()=>{
  const {data,checkpoint}=fixture();data.questStage=2;data.inventory.push({id:'harbor-letter',quantity:1});data.woodland.practiceHits=1;
  assert.equal(checkpoint.save(data).ok,true);
  const bad=[{...data,questStage:3},{...data,questStage:4},{...data,questStage:6},
    {...data,woodland:{...data.woodland,acorns:['acorn-1-1','acorn-1-1']}},
    {...data,woodland:{...data.woodland,sticks:['stick-8-1']}},
    {...data,woodland:{...data.woodland,camp:{...data.woodland.camp,taught:true}}},
    {...data,woodland:{...data.woodland,camp:{...data.woodland.camp,fires:{'pond-fire':121}}}},
    {...data,forestStory:{...data.forestStory,bundleReturned:true}}];
  for(const value of bad){assert.equal(checkpoint.save(value).ok,false);assert.deepEqual(checkpoint.read().data,data);}
});

test('camp reload preserves remaining firewood and fishing history, cancels an unfinished cast, and emits no rewards',()=>{
  const {inventory,weapons,camp}=fixture();inventory.grant('tinderbox');inventory.add('forest-stick',3);camp.teachFishing();camp.light('pond-fire');camp.update(17);camp.cast();
  const saved=camp.checkpoint(),events=[],next=createCampcraft({inventory,weapons,onEvent:e=>events.push(e)});
  assert.equal(next.restore(saved),true);assert.equal(next.state.phase,'idle');assert.equal(next.fireStatus('pond-fire').fuel,103);
  assert.deepEqual(next.checkpoint(),saved);assert.deepEqual(events,[]);
  for(const invalid of [{...saved,fires:{'invented-fire':100}},{...saved,fires:{'pond-fire':Infinity}},{...saved,catches:-1}]){
    assert.equal(next.restore(invalid),false);assert.deepEqual(next.checkpoint(),saved);
  }
});
