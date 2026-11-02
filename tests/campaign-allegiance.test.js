import test from 'node:test';
import assert from 'node:assert/strict';
import {activeCampaignCommitment,savedCampaignCommitment,legacyCampaignSidesConflict,campaignSideFromSearch,isUnbriefedTowerCheckpoint} from '../src/app/exploration/campaign-allegiance.js';
import {createTowerState,TOWER_SPAWN} from '../src/app/exploration/tower-state.js';
import {createAdventureWar,createOpeningWar} from '../src/experiments/day-night/opening-war.js';
import {createWorldWar,FOOD_WORLD_SCENARIO} from '../src/app/exploration/world-war.js';
import {validateWorldWarSave,worldWarStore,WORLD_WAR_KEY} from '../src/app/exploration/war-checkpoint.js';
import {FOOD_WORLD_KEY} from '../src/app/food-world/scenario.js';

const exploration={version:1,character:'rollo',position:{x:-2414,y:2,z:63},heading:0,camera:{yaw:0,pitch:.3,distance:8},elapsed:12,cells:['0,0']};
const save=(war,campaignSide,key=WORLD_WAR_KEY)=>({version:1,format:key,exploration,...war.checkpoint(),...(campaignSide!==undefined?{campaignSide}:{})});
const legacyAdventure=()=>createAdventureWar({...createOpeningWar().checkpoint(),fullCampaign:true});

test('a saved unbriefed tower preserves the unchosen allegiance, paused clock and freedom to resume the introduction',()=>{
  const cases=[[createAdventureWar(),WORLD_WAR_KEY,createAdventureWar],[createWorldWar(null,FOOD_WORLD_SCENARIO),FOOD_WORLD_KEY,createWorldWar]];
  for(const [war,key,restore] of cases){
    const tower=createTowerState(),before=war.snapshot(),clock=war.clock();
    const checkpoint={...save(war,undefined,key),exploration:{...exploration,position:{...TOWER_SPAWN}},tower:tower.snapshot(false)};
    let raw=null;const store=worldWarStore({getItem:()=>raw,setItem:(_,value)=>{raw=value;}},key);
    assert(store.save(checkpoint).ok);const loaded=store.read().data,restored=restore(loaded),restoredTower=createTowerState(loaded);
    assert(isUnbriefedTowerCheckpoint(loaded));assert.equal(loaded.campaignSide,undefined);
    assert.equal(restoredTower.briefed,false);assert.equal(restoredTower.room,'tower');assert.equal(restoredTower.leave(),false);
    assert.deepEqual(restored.snapshot(),before);assert.deepEqual(restored.clock(),clock);
    assert.deepEqual(loaded.simulation.commands,checkpoint.simulation.commands);
  }
});

test('a side chosen with Taleth can be saved before departure without beginning or advancing the war',()=>{
  for(const side of ['west','east']){
    const war=createAdventureWar(),tower=createTowerState(),before=war.snapshot(),clock=war.clock();
    const chosen={...save(war,side),tower:tower.snapshot(false)};
    assert(validateWorldWarSave(chosen));assert(isUnbriefedTowerCheckpoint(chosen));
    const loaded=createAdventureWar(chosen),restoredTower=createTowerState(chosen);
    assert.equal(chosen.campaignSide,side);assert.equal(restoredTower.leave(),false);
    assert.deepEqual(loaded.snapshot(),before);assert.deepEqual(loaded.clock(),clock);
    assert(restoredTower.begin());assert.equal(restoredTower.begin(),false);assert(restoredTower.leave());
    const begun={...chosen,tower:restoredTower.snapshot(false)};
    assert(validateWorldWarSave(begun));assert.equal(isUnbriefedTowerCheckpoint(begun),false);
    assert.deepEqual(loaded.snapshot(),before,'Finishing Taleth\'s introduction does not mutate campaign orders.');
  }
});

test('legacy outdoor, already briefed and malformed saves are not mistaken for an undecided tower introduction',()=>{
  const war=createAdventureWar(),legacy=save(war),tower=createTowerState();
  assert.equal(isUnbriefedTowerCheckpoint(legacy),false);assert.equal(createTowerState(legacy).briefed,true);
  tower.begin();assert.equal(isUnbriefedTowerCheckpoint({...legacy,tower:tower.snapshot(false)}),false);
  for(const saved of [null,{}, {tower:{}},{tower:{version:1,location:'world',briefed:false,running:false}},
    {tower:{version:1,location:'tower',briefed:false,running:true}}])assert.equal(isUnbriefedTowerCheckpoint(saved),false);
});

test('fixed allegiance survives ordinary and food save round trips without changing simulated war history',()=>{
  const cases=[[createAdventureWar(),WORLD_WAR_KEY],[createWorldWar(null,FOOD_WORLD_SCENARIO),FOOD_WORLD_KEY]];
  for(const [war,key] of cases){
    war.advance(2);const before=war.snapshot();
    for(const side of ['west','east']){
      let raw=null;const store=worldWarStore({getItem:()=>raw,setItem:(_,value)=>{raw=value;}},key),data=save(war,side,key);
      assert(store.save(data).ok);assert.deepEqual(store.read().data,data);
      assert.equal(store.read().data.campaignSide,side);assert.deepEqual(war.snapshot(),before);
      assert.deepEqual(createWorldWar(store.read().data).snapshot().commands,before.commands);
    }
  }
});

test('legacy saves remain readable and invalid allegiance never replaces a valid save',()=>{
  const war=createAdventureWar(),legacy=save(war),valid=save(war,'west');
  assert(validateWorldWarSave(legacy));let raw=JSON.stringify(valid);
  const store=worldWarStore({getItem:()=>raw,setItem:(_,value)=>{raw=value;}});
  for(const side of [null,'minora','West',1,{},['west']]){
    assert.equal(validateWorldWarSave({...valid,campaignSide:side}),false);
    assert.equal(store.save({...valid,campaignSide:side}).ok,false);assert.deepEqual(store.read().data,valid);
  }
});

test('an unfinished legacy duel constrains migration and cannot be saved under the opposing allegiance',()=>{
  const war=legacyAdventure();war.advance(3);war.syncRegion('Caricas');
  const battle=war.snapshot().engagements.find(b=>b.status==='active');
  assert(war.campaign.joinBattle(battle.id,battle.location).ok);
  assert.equal(activeCampaignCommitment(war.snapshot()),null,'The invitation alone has not picked a side.');
  assert(war.campaign.chooseDuel(war.snapshot().pending.id,'east').ok);
  assert.equal(activeCampaignCommitment(war.snapshot()),'east');assert(validateWorldWarSave(save(war)));
  assert(validateWorldWarSave(save(war,'east')));assert.equal(validateWorldWarSave(save(war,'west')),false);
});

test('legacy migration retains a partly fought battlefield but does not force old completed choices',()=>{
  const war=legacyAdventure();war.advance(3);war.syncRegion('Caricas');
  const battle=war.snapshot().engagements.find(b=>b.status==='active');assert(war.campaign.joinBattle(battle.id,battle.location).ok);
  assert(war.campaign.resolveEncounter(war.snapshot().pending.id,'west','withdraw','withdrew',1,{escaped:0}).ok);
  assert.equal(war.snapshot().pending,null);assert.equal(activeCampaignCommitment(war.snapshot()),'west');
  assert(validateWorldWarSave(save(war,'west')));assert.equal(validateWorldWarSave(save(war,'east')),false);
  war.advance(3);assert.equal(activeCampaignCommitment(war.snapshot()),null);
});

test('test URL allegiance is explicit and rejects unrelated or malformed faction values',()=>{
  assert.equal(campaignSideFromSearch('?test=1&campaign-side=east'),'east');
  assert.equal(campaignSideFromSearch('?campaign-side=west'),'west');
  for(const query of ['', '?autoplay=east','?campaign-side=minora','?campaign-side=West'])assert.equal(campaignSideFromSearch(query),null);
});

test('legacy saved retries keep their battle allegiance and cannot restore a conflicting fixed side',()=>{
  const war=createAdventureWar(),before=save(war);
  const legacy={...save(war),afterlife:{version:1,form:'living',inLimbo:true,death:{
    battleId:'prior',stage:'intercept',side:'east',previousForm:'living',fallen:{x:0,y:0,z:0},before,report:'The battle was lost.',
  }}};
  assert(validateWorldWarSave(legacy));assert.equal(savedCampaignCommitment(legacy,war.snapshot()),'east');
  assert(validateWorldWarSave({...legacy,campaignSide:'east'}));
  assert.equal(validateWorldWarSave({...legacy,campaignSide:'west'}),false);
  const consistent=structuredClone(legacy);consistent.campaignSide='east';consistent.afterlife.death.before.campaignSide='east';
  assert(validateWorldWarSave(consistent));consistent.afterlife.death.before.campaignSide='west';
  assert.equal(validateWorldWarSave(consistent),false);
});

test('a legacy journey with opposing unfinished battle and retry sides keeps its original playable choices',()=>{
  const war=legacyAdventure(),before=save(war);war.advance(3);war.syncRegion('Caricas');
  const battle=war.snapshot().engagements.find(b=>b.status==='active');assert(war.campaign.joinBattle(battle.id,battle.location).ok);
  assert(war.campaign.resolveEncounter(war.snapshot().pending.id,'west','withdraw','withdrew',1,{escaped:0}).ok);
  const legacy={...save(war),afterlife:{version:1,form:'undead',inLimbo:false,death:{
    battleId:'prior',stage:'intercept',side:'east',previousForm:'living',fallen:{x:0,y:0,z:0},before,report:'The earlier battle was lost.',
  }}};
  assert(legacyCampaignSidesConflict(legacy,war.snapshot()));assert(validateWorldWarSave(legacy));
  for(const side of ['west','east'])assert.equal(validateWorldWarSave({...legacy,campaignSide:side}),false);
  const consistent=structuredClone(legacy);consistent.afterlife.death.side='west';
  assert.equal(legacyCampaignSidesConflict(consistent,war.snapshot()),false);assert(validateWorldWarSave({...consistent,campaignSide:'west'}));
});
