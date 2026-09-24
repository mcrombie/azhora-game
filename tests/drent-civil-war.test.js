import test from 'node:test';
import assert from 'node:assert/strict';
import { createDrentCivilWar, validateDrentCivilWarSnapshot, DRENT_EVIDENCE_ID, DRENT_SUPPLIES_ID,
  DRENT_EVIDENCE_TEXT, DRENT_QUEST_ID } from '../src/drent-civil-war.js';
import { createInventoryState, INVENTORY_ITEMS } from '../src/inventory.js';
import { createRoadCheckpoint } from '../src/road-checkpoint.js';
import { createJourney } from '../src/journey.js';
import { createWeapons } from '../src/weapons.js';
import { QUEST_DONE } from '../src/game-state.js';
import { METRES_PER_HEX } from '../src/world-scale.js';
import { questLive } from '../src/quest-slate.js';

const discover=['defeat-ambush','accept-investigation','search-camp'];
const monarchy=[...discover,'report-glun','confront-killian','kill-killian','report-victory'];
const republic=[...discover,'read-evidence','report-killian','steal-supplies','return-supplies'];
function perform(quest,actions){
  for(const action of actions){
    assert.equal(quest.act(action).ok,true,action);
    assert.equal(validateDrentCivilWarSnapshot(quest.snapshot()),true,`save after ${action}`);
  }
}
function fixture(){
  const inventory=createInventoryState(),events=[],effects=[];
  let stealthXp=0,learned=false;
  const quest=createDrentCivilWar({onEvent:event=>events.push(event),applyEffects(batch){
    if(batch.some(effect=>effect.type==='remove'&&inventory.count(effect.id)<effect.quantity))return false;
    for(const effect of batch){
      effects.push(effect);
      if(effect.type==='grant')inventory.add(effect.id,effect.quantity);
      if(effect.type==='remove')inventory.remove(effect.id,effect.quantity);
      if(effect.type==='learn')learned=true;
      if(effect.type==='skill-floor')stealthXp=Math.max(stealthXp,effect.xp);
    }
    return true;
  }});
  return {quest,inventory,events,effects,stealth:()=>({xp:stealthXp,learned}),setXp:xp=>{stealthXp=xp;}};
}

test('the ambush is an optional lead; accepting at Glun starts the silver story',()=>{
  const {quest,inventory}=fixture();
  assert.equal(quest.view().active,false);
  for(const action of ['accept-investigation','search-camp','report-glun','report-killian'])assert.equal(quest.allowed(action),false);
  perform(quest,['defeat-ambush']);
  assert.equal(quest.view().offered,true);
  assert.equal(quest.view().accepted,false);
  assert.equal(quest.view().active,false);
  assert.deepEqual(quest.view().destinationIds,['instructor']);
  assert.match(quest.view().detail,/continue to Nothom/);
  assert.deepEqual(inventory.items(),[]);
  perform(quest,['accept-investigation']);
  assert.equal(quest.view().grade,'plot');
  assert.equal(quest.view().active,true);
  assert.deepEqual(quest.view().destinationIds,['drent-rebel-camp']);
  assert.match(quest.view().detail,/without reading/);
});

test('the sealed inventory item gives no identity away and inspection cannot read it',()=>{
  const {quest,inventory}=fixture();perform(quest,discover);
  assert.equal(inventory.count(DRENT_EVIDENCE_ID),1);
  assert.equal(quest.state().evidenceRead,false);
  for(const field of ['name','brief','description'])assert.doesNotMatch(INVENTORY_ITEMS[DRENT_EVIDENCE_ID][field],/Killian|Republican/i);
  const before=quest.snapshot();
  quest.view();quest.state();quest.preview('read-evidence');
  assert.deepEqual(quest.snapshot(),before);
  assert.equal(quest.allowed('report-killian'),false);
  assert.equal(quest.allowed('report-glun'),true);
  perform(quest,['read-evidence']);
  assert.match(DRENT_EVIDENCE_TEXT.join(' '),/Killian/);
  assert.equal(quest.allowed('report-killian'),true);
  assert.equal(quest.allowed('report-glun'),true,'reading still permits an Imperial handoff');
  assert.equal(quest.state().chosenPath,null,'reading alone chooses no allegiance');
  assert.deepEqual(quest.view().destinationIds,['killian','instructor']);
});

test('the Imperial route needs a voluntary departure, a won fight, and a final report',()=>{
  const {quest,inventory,effects}=fixture();perform(quest,[...discover,'report-glun']);
  assert.equal(inventory.has(DRENT_EVIDENCE_ID),false);
  assert.equal(quest.view().stage,'ready');
  assert.equal(quest.act('kill-killian').ok,false);
  assert.equal(quest.act('report-victory').ok,false);
  assert.equal(quest.act('report-killian').ok,false);
  assert.equal(quest.act('read-evidence').ok,false);
  perform(quest,['confront-killian']);
  assert.equal(quest.view().stage,'confronting');
  assert.equal(quest.act('report-victory').ok,false);
  perform(quest,['kill-killian']);
  assert.equal(quest.view().stage,'report');
  assert.equal(quest.view().complete,false);
  assert.deepEqual(quest.view().favor,{empire:0,republic:0});
  perform(quest,['report-victory']);
  assert.equal(quest.view().complete,true);
  assert.deepEqual(quest.view().favor,{empire:10,republic:0});
  assert.deepEqual(effects.filter(effect=>effect.type==='favor'),[{type:'favor',faction:'empire',amount:10}]);
  assert.equal(quest.state().killianDefeated,true);
});

test('a failed confrontation can be retried without reopening allegiance or granting rewards',()=>{
  const {quest,effects}=fixture();perform(quest,[...discover,'report-glun','confront-killian','failed-confrontation']);
  assert.equal(quest.view().stage,'ready');
  assert.equal(quest.state().chosenPath,'monarchist');
  assert.equal(quest.allowed('report-killian'),false);
  assert.equal(quest.allowed('kill-killian'),false);
  assert.deepEqual(effects.filter(effect=>effect.type==='favor'),[]);
  perform(quest,['confront-killian','kill-killian']);
  assert.equal(quest.act('failed-confrontation').ok,false,'winning cannot reset a dead Killian');
  perform(quest,['report-victory']);
});

test('the Republican route teaches stealth, steals a physical bundle and leaves Killian alive',()=>{
  const {quest,inventory,stealth,effects}=fixture();perform(quest,[...discover,'read-evidence','report-killian']);
  assert.equal(inventory.has(DRENT_EVIDENCE_ID),false);
  assert.deepEqual(stealth(),{xp:0,learned:true});
  assert.equal(quest.act('report-glun').ok,false);
  assert.equal(quest.act('confront-killian').ok,false);
  assert.equal(quest.act('return-supplies').ok,false);
  assert.deepEqual(quest.view().destinationIds,['drent-barracks-supplies']);
  perform(quest,['steal-supplies']);
  assert.equal(inventory.count(DRENT_SUPPLIES_ID),1);
  assert.equal(stealth().xp,83);
  assert.equal(quest.act('steal-supplies').ok,false);
  perform(quest,['return-supplies']);
  assert.equal(inventory.has(DRENT_SUPPLIES_ID),false);
  assert.equal(quest.state().killianDefeated,false);
  assert.deepEqual(quest.view().favor,{empire:0,republic:10});
  assert.deepEqual(effects.filter(effect=>effect.type==='favor'),[{type:'favor',faction:'republic',amount:10}]);
});

test('the theft only tops up experience already earned by dangerous sneaking',()=>{
  for(const xp of [30,83,110]){
    const {quest,setXp,stealth}=fixture();perform(quest,[...discover,'read-evidence','report-killian']);setXp(xp);
    perform(quest,['steal-supplies']);assert.equal(stealth().xp,Math.max(83,xp));
  }
});

test('completion and item rewards cannot repeat before or after restoring a save',()=>{
  for(const route of [monarchy,republic]){
    const {quest,effects,events}=fixture();perform(quest,route);
    const done=quest.snapshot(),count=effects.length,eventCount=events.length;
    for(const action of [...monarchy,...republic,'failed-confrontation'])assert.equal(quest.act(action).ok,false);
    assert.deepEqual(quest.snapshot(),done);
    assert.equal(effects.length,count);assert.equal(events.length,eventCount);
    const restored=createDrentCivilWar({applyEffects(){throw Error('restore paid a reward');}});
    assert.equal(restored.restore(done),true);
    assert.deepEqual(restored.snapshot(),done);
    assert.deepEqual(restored.availableActions(),[]);
  }
});

test('refused external effects do not advance state or emit progress',()=>{
  let refuse=false;const events=[];
  const quest=createDrentCivilWar({applyEffects:()=>!refuse,onEvent:event=>events.push(event)});
  perform(quest,['defeat-ambush','accept-investigation']);
  const before=quest.snapshot(),count=events.length;refuse=true;
  assert.equal(quest.act('search-camp').ok,false);
  assert.deepEqual(quest.snapshot(),before);assert.equal(events.length,count);
  refuse=false;perform(quest,['search-camp']);
});

test('invented actions and corrupt snapshots are rejected without overwriting progress',()=>{
  const {quest}=fixture();perform(quest,[...discover,'read-evidence']);const saved=quest.snapshot();
  for(const action of [null,undefined,{},'constructor','__proto__','choose-neutral','read']){
    assert.equal(quest.allowed(action),false);assert.equal(quest.act(action).ok,false);
    assert.deepEqual(quest.snapshot(),saved);
  }
  const bad=[null,{}, {...saved,version:2},{...saved,extra:true},{...saved,accepted:false},
    {...saved,evidenceFound:false},{...saved,ambushDefeated:false},{...saved,confrontationStarted:true},
    {...saved,chosenPath:'republican',evidenceRead:false},{...saved,suppliesStolen:true},
    {...saved,favor:{empire:10,republic:0}},{...saved,outcome:'monarchist',rewardGranted:true}];
  for(const snapshot of bad){
    assert.equal(validateDrentCivilWarSnapshot(snapshot),false,JSON.stringify(snapshot));
    assert.equal(quest.restore(snapshot),false);assert.deepEqual(quest.snapshot(),saved);
  }
  const exposed=quest.state();exposed.favor.empire=10;exposed.evidenceRead=false;
  assert.deepEqual(quest.snapshot(),saved);
  assert.equal(validateDrentCivilWarSnapshot(undefined),true);
  assert.equal(validateDrentCivilWarSnapshot(undefined,{allowMissing:false}),false);
  assert.equal(quest.restore(undefined),true);assert.equal(quest.view().stage,'unmet');
});

test('road checkpoints preserve both routes and reject evidence or supplies missing from the satchel',()=>{
  for(const route of [monarchy,republic]){
    const {quest,inventory}=fixture();
    for(const id of ['simple-sword','harbor-letter','road-token'])inventory.grant(id);
    const journey=createJourney({inventory});journey.start();const weapons=createWeapons({inventory});
    let stored=null;const checkpoint=createRoadCheckpoint({storage:{getItem:()=>stored,setItem:(_key,value)=>{stored=value;}}});
    const data=()=>({version:1,worldScale:METRES_PER_HEX,questStage:QUEST_DONE,journey:journey.snapshot(),
      inventory:inventory.items().map(id=>({id,quantity:inventory.count(id)})),weapons:weapons.snapshot(),
      journeyGathered:[],meadowCleared:false,position:{x:3,z:-190},heardDoom:false,drentCivilWar:quest.snapshot()});
    for(const action of route){
      perform(quest,[action]);const saved=data();
      assert.equal(checkpoint.save(saved).ok,true,action);
      assert.deepEqual(checkpoint.read().data.drentCivilWar,quest.snapshot());
      if(inventory.has(DRENT_EVIDENCE_ID)||inventory.has(DRENT_SUPPLIES_ID)){
        assert.equal(checkpoint.save({...saved,inventory:saved.inventory.filter(item=>![DRENT_EVIDENCE_ID,DRENT_SUPPLIES_ID].includes(item.id))}).ok,false);
        assert.deepEqual(checkpoint.read().data.drentCivilWar,quest.snapshot(),'a bad save cannot replace the good one');
      }
    }
    const legacy=data();delete legacy.drentCivilWar;
    assert.equal(checkpoint.save(legacy).ok,true);
    assert.equal(checkpoint.read().data.drentCivilWar,undefined);
  }
});

test('Drent replaces Vastos as the live silver offer without removing the Vastos registry',()=>{
  assert.equal(questLive(DRENT_QUEST_ID),true);
  assert.equal(questLive('civil-war-vastos'),false);
  assert.equal(questLive('main'),true);
  assert.equal(questLive('bridge'),true);
});
