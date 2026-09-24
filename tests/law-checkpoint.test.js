import test from 'node:test';
import assert from 'node:assert/strict';
import { createCrime } from '../src/crime.js';
import { createCorpses } from '../src/corpses.js';
import { createRoadCheckpoint } from '../src/road-checkpoint.js';
import { createInventoryState } from '../src/inventory.js';
import { createWeapons } from '../src/weapons.js';
import { createJourney } from '../src/journey.js';
import { QUEST_DONE } from '../src/game-state.js';
import { METRES_PER_HEX } from '../src/world-scale.js';
import { createSkills, RUNESCAPE_TABLE } from '../src/skills.js';
import { maxHealth } from '../src/combat-skills.js';

function fixture() {
  const inventory=createInventoryState();
  for(const id of ['simple-sword','harbor-letter','road-token','tinderbox'])inventory.grant(id);
  const weapons=createWeapons({inventory}),journey=createJourney({inventory,weapons});journey.start();
  const saved=new Map(),storage={getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)};
  return {inventory,checkpoint:createRoadCheckpoint({storage}),data:{version:1,worldScale:METRES_PER_HEX,
    questStage:QUEST_DONE,journey:journey.snapshot(),inventory:inventory.items().map(id=>({id,quantity:inventory.count(id)})),
    weapons:weapons.snapshot(),journeyGathered:[],meadowCleared:false,position:{x:3,z:-190},heardDoom:false}};
}

test('crime injuries, bounty and looted remains survive a complete road checkpoint',()=>{
  const f=fixture(),crime=createCrime(),corpses=createCorpses();
  crime.hit({id:'harbormaster',damage:12,essential:true,position:{x:3,z:-190}});
  corpses.add({id:'enemy:ambush:rebel',sourceId:'rebel',name:'Rebel',kind:'rebel',x:4,z:-191});
  assert.equal(corpses.loot('enemy:ambush:rebel',f.inventory).ok,true);
  corpses.update(124);
  const data={...f.data,crime:crime.snapshot(),corpses:corpses.snapshot()};
  const written=f.checkpoint.save(data);assert.equal(written.ok,true,JSON.stringify(written));
  const saved=f.checkpoint.read().data;
  assert.deepEqual(saved.crime,data.crime);assert.deepEqual(saved.corpses,data.corpses);
  const restored=createCorpses();restored.restore(saved.corpses);
  assert.equal(restored.loot('enemy:ambush:rebel',f.inventory).ok,false,'save/reload cannot duplicate corpse loot');
  saved.crime.people.harbormaster.hp=0;
  assert.equal(f.checkpoint.save(saved).ok,false,'invalid injury data cannot overwrite a valid save');
  assert.equal(f.checkpoint.read().data.crime.people.harbormaster.hp,48);
});

test('old adventures load without law fields; malformed corpses cannot replace them',()=>{
  const f=fixture();const written=f.checkpoint.save(f.data);assert.equal(written.ok,true,JSON.stringify(written));
  assert.equal(f.checkpoint.read().data.crime,undefined);
  assert.equal(f.checkpoint.save({...f.data,corpses:{version:1,clock:0,bodies:[{id:'broken'}]}}).ok,false);
  assert.equal(f.checkpoint.read().data.corpses,undefined);
});

test('full health after custody round-trips at the saved Toughness level and rejects impossible health',()=>{
  const f=fixture(),skills=createSkills(),crime=createCrime();
  skills.learn('toughness');skills.gain('toughness',83);
  crime.hit({id:'harbormaster',damage:10});crime.settle('jail');
  const data={...f.data,skills:skills.snapshot(),health:maxHealth(skills.level('toughness')),crime:crime.snapshot()};
  assert.equal(data.health,103,'the first Toughness advancement exceeds the old health cap');
  assert.equal(f.checkpoint.save(data).ok,true);assert.equal(f.checkpoint.read().data.health,103);
  assert.equal(f.checkpoint.save({...data,health:104}).ok,false,'health must fit the actual saved skill');
  skills.gain('toughness',RUNESCAPE_TABLE.at(-1));
  assert.equal(f.checkpoint.save({...data,skills:skills.snapshot(),health:400}).ok,true);
  assert.equal(f.checkpoint.save({...data,skills:skills.snapshot(),health:401}).ok,false);
  assert.equal(f.checkpoint.save({...f.data,health:100}).ok,true,'legacy saves without skills keep the level-one ceiling');
  assert.equal(f.checkpoint.save({...f.data,health:103}).ok,false);
});
