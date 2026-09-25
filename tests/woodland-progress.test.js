import test from 'node:test';
import assert from 'node:assert/strict';
import {METRES_PER_HEX} from '../src/world-scale.js';
import { createRoadCheckpoint } from '../src/road-checkpoint.js';
import { createInventoryState } from '../src/inventory.js';
import { createWeapons } from '../src/weapons.js';
import { createCampcraft } from '../src/campcraft.js';
import { createJourney } from '../src/journey.js';
import { createForestStory } from '../src/forest-story.js';
import { FARM_FIRE } from '../src/farming.js';
import { copyWoodlandProgress, validateWoodlandProgress } from '../src/woodland-progress.js';
import { sourceModule } from './module-loader.js';

function fixture() {
  const inventory=createInventoryState();inventory.grant('simple-sword');
  const weapons=createWeapons({inventory}),camp=createCampcraft({inventory,weapons}),story=createForestStory({inventory,weapons});
  let raw=null;const checkpoint=createRoadCheckpoint({storage:{getItem:()=>raw,setItem:(_,value)=>raw=value}});
  const data={version:1,questStage:1,journey:createJourney().snapshot(),inventory:[{id:'simple-sword',quantity:1}],
    weapons:weapons.snapshot(),journeyGathered:[],meadowCleared:false,worldScale:METRES_PER_HEX,position:{x:0,z:16},heardDoom:false,health:81,
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
  // Stage 3 is the last step and refuses an unfinished lesson; 4 and 6 are off the end of a
  // spine that is four long now, and are refused for that (src/game-state.js).
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

test('every built-world fire including Stanley\'s garden survives an actual road checkpoint and detached copy', async () => {
  const THREE = await import('../vendor/three.module.js');
  const { createWorld } = await sourceModule('../src/world.js');
  const world = createWorld(new THREE.Scene());
  const { inventory, weapons, checkpoint, data } = fixture();
  const fireIds = world.firePits.map(fire => fire.id);
  assert.ok(fireIds.includes(FARM_FIRE.id));
  const camp = createCampcraft({ inventory, weapons, fireIds });
  data.woodland.camp = camp.checkpoint();
  let saved = checkpoint.save(data);
  assert.equal(saved.ok, true, `even unlit world fires must be accepted: ${saved.reason}`);
  inventory.grant('tinderbox'); inventory.add('forest-stick', 2);
  assert.equal(camp.light(FARM_FIRE.id).ok, true);
  camp.update(23);
  data.inventory = inventory.items().map(id => ({ id, quantity: inventory.count(id) }));
  data.woodland.camp = camp.checkpoint();
  assert.equal(validateWoodlandProgress(data.woodland, inventory), true);
  saved = checkpoint.save(data); assert.equal(saved.ok, true, saved.reason);
  const loaded = checkpoint.read().data, copied = copyWoodlandProgress(loaded.woodland);
  assert.equal(copied.camp.fires[FARM_FIRE.id], 97);
  copied.camp.fires[FARM_FIRE.id] = 0;
  assert.equal(checkpoint.read().data.woodland.camp.fires[FARM_FIRE.id], 97);
  const restored = createCampcraft({ inventory, weapons, fireIds });
  assert.equal(restored.restore(loaded.woodland.camp), true);
  assert.equal(restored.fireStatus(FARM_FIRE.id).fuel, 97);
  assert.deepEqual(restored.checkpoint(), camp.checkpoint());
  const invalid = { ...loaded.woodland, camp: { ...loaded.woodland.camp, fires: { ...loaded.woodland.camp.fires, 'invented-fire': 10 } } };
  assert.equal(validateWoodlandProgress(invalid, inventory), false);
});

test('each unfinished chart lesson and completed guard drill resumes before leaving Tidehaven', () => {
  const { data, checkpoint } = fixture();
  data.questStage = 2;
  data.inventory.push({ id: 'harbor-letter', quantity: 1 });
  data.woodland.practiceHits = 2;
  data.woodland.practiceDodges = 1;
  for (const chartLesson of ['unissued', 'open-map', 'return-to-glun']) {
    for (const practiceGuards of [0, 1]) {
      const saved = { ...data, chartLesson, woodland: { ...data.woodland, practiceGuards } };
      assert.equal(checkpoint.save(saved).ok, true);
      assert.deepEqual(checkpoint.read().data, saved);
    }
  }
  assert.equal(checkpoint.save(data).ok, true, 'legacy guard progress is still inferred by the host');
  assert.equal(Object.hasOwn(checkpoint.read().data.woodland, 'practiceGuards'), false);
});

test('invalid guard progress cannot overwrite a save, and a new completed lesson requires its guard', () => {
  const { data, checkpoint } = fixture();
  const saved = { ...data, woodland: { ...data.woodland, practiceGuards: 1 } };
  assert.equal(checkpoint.save(saved).ok, true);
  for (const practiceGuards of [-1, 2, 0.5, '1', null, NaN, Infinity]) {
    assert.equal(checkpoint.save({ ...saved, woodland: { ...saved.woodland, practiceGuards } }).ok, false);
    assert.deepEqual(checkpoint.read().data, saved);
  }
  const inventory = createInventoryState();
  inventory.grant('harbor-letter'); inventory.grant('road-token');
  const journey = createJourney({ inventory });
  assert.equal(journey.start().ok, true);
  const onward = { ...saved, questStage: 3, journey: journey.snapshot(), chartLesson: 'complete',
    inventory: [...saved.inventory, { id: 'harbor-letter', quantity: 1 }, { id: 'road-token', quantity: 1 }],
    woodland: { ...saved.woodland, practiceHits: 2, practiceDodges: 1 } };
  assert.equal(checkpoint.save(onward).ok, true);
  assert.equal(checkpoint.save({ ...onward, woodland: { ...onward.woodland, practiceGuards: 0 } }).ok, false);
  assert.deepEqual(checkpoint.read().data, onward);
  const { practiceGuards, ...legacyWoodland } = onward.woodland;
  const { chartLesson, ...legacyOnward } = onward;
  assert.equal(checkpoint.save({ ...legacyOnward, woodland: legacyWoodland }).ok, true);
});
