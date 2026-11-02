import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaignMapTime} from '../src/app/exploration/campaign-map-time.js';
import {createAdventureWar} from '../src/experiments/day-night/opening-war.js';

test('map speeds advance the same campaign, food and event timestamps as normal play',()=>{
  for(const speed of [1,4,20]){
    const map=createCampaignMapTime(),fast=createAdventureWar(),normal=createAdventureWar();
    fast.begin();normal.begin();map.select(speed);
    for(let frame=0;frame<48;frame++)map.tick(fast,.25,true);
    for(let frame=0;frame<48*speed;frame++)normal.tick(.25,true);
    assert.equal(fast.clock().elapsedSeconds,12*speed);
    assert.deepEqual(fast.snapshot(),normal.snapshot());
    assert.deepEqual(fast.checkpoint(),normal.checkpoint());
    assert.equal(fast.checkpoint().speed,1,'Temporary acceleration never changes saved outdoor speed');
    const loaded=createAdventureWar(fast.checkpoint());
    assert.deepEqual(loaded.snapshot(),normal.snapshot());assert.equal(loaded.clock().speed,1);
  }
});

test('opening, pausing and closing the map do not spend time or leave acceleration behind',()=>{
  const map=createCampaignMapTime(),war=createAdventureWar();war.begin();
  map.tick(war,1,true);assert.equal(war.clock().elapsedSeconds,0);
  map.select(20);map.tick(war,.5,true);assert.equal(war.clock().elapsedSeconds,10);
  map.select(0);map.tick(war,1,true);assert.equal(war.clock().elapsedSeconds,10);
  map.select(4);map.tick(war,1,false);assert.equal(war.clock().elapsedSeconds,10);
  map.reset();assert.equal(map.speed,0);war.tick(1,true);assert.equal(war.clock().elapsedSeconds,11);
  for(const value of [-1,2,100,NaN,'4'])assert.throws(()=>map.select(value));
});

test('map acceleration holds at an encounter and stops at campaign completion',()=>{
  const map=createCampaignMapTime(),war=createAdventureWar();war.advance(1);war.begin();
  const battle=war.snapshot().engagements.find(b=>b.status==='active');
  war.syncRegion('Caricas');assert(war.campaign.joinBattle(battle.id,battle.location).ok);
  map.select(20);const before=war.checkpoint();map.tick(war,1,true);
  assert.deepEqual(war.checkpoint(),before);assert.equal(map.speed,0);
  const completed=createAdventureWar();completed.advance(150);assert(completed.clock().complete);
  map.select(20);const ended=completed.checkpoint();map.tick(completed,1,true);
  assert.deepEqual(completed.checkpoint(),ended);assert.equal(map.speed,0);
});

test('automatic waiting stops on the exact order tick without spending the new opportunity',()=>{
  const map=createCampaignMapTime(),war=createAdventureWar(),normal=createAdventureWar();war.begin();normal.begin();
  // The opening battles conclude on order tick 3; no part of tick 4 may be spent.
  const ended=s=>s.engagements.filter(b=>b.status==='resolved').length>=2;
  map.select(20,{until:ended});assert.equal(map.waiting,true);
  for(let i=0;i<50&&map.waiting;i++)map.tick(war,.37,true);
  assert.equal(map.speed,0);assert.equal(map.waiting,false);assert.ok(ended(war.snapshot()));
  while(!ended(normal.snapshot()))normal.tick(.37,true);
  assert.deepEqual(war.checkpoint(),normal.checkpoint());
  const before=war.checkpoint();map.tick(war,1,true);assert.deepEqual(war.checkpoint(),before);
});

test('automatic waiting respects focus and clears when closing or manually choosing a speed',()=>{
  const map=createCampaignMapTime(),war=createAdventureWar();war.begin();
  let checks=0;const until=()=>{checks++;return true;};
  map.select(20,{until});map.tick(war,1,false);assert.equal(war.clock().elapsedSeconds,0);assert.equal(checks,0);
  map.reset();assert.equal(map.waiting,false);map.tick(war,1,true);assert.equal(war.clock().elapsedSeconds,0);
  map.select(20,{until});map.select(4);map.tick(war,1,true);
  assert.equal(map.waiting,false);assert.equal(war.clock().elapsedSeconds,4);assert.equal(checks,0);
});

test('a newly prepared destination stops waiting between order ticks without spending more time',()=>{
  const map=createCampaignMapTime(),war=createAdventureWar();war.begin();let ready=false;
  map.select(20,{until:()=>ready});map.tick(war,.1,true);const before=war.checkpoint();
  ready=true;assert.equal(map.tick(war,.1,true),true,'Host refreshes the ready destination');
  assert.deepEqual(war.checkpoint(),before);assert.equal(map.speed,0);assert.equal(map.waiting,false);
});
