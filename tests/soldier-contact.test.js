import test from 'node:test';
import assert from 'node:assert/strict';
import {stopAtSoldier,soldierWords} from '../src/app/exploration/soldier-contact.js';
import {campaignAssaultStyle,campaignAssaultBriefing} from '../src/app/lizeem/assault-briefing.js';
import {createWorldWar} from '../src/app/exploration/world-war.js';

test('stationary soldiers block foot and fast horse crossings without blocking distant heights or escape from an overlap',()=>{
  const soldier={x:0,y:2,z:0};
  for(const radius of [1,1.45]){const p=stopAtSoldier({x:-10,z:0},{x:10,y:2,z:0},[soldier],radius);assert(p.x< -radius&&p.x> -radius-.01);}
  assert.equal(stopAtSoldier({x:-10,z:0},{x:10,y:6,z:0},[soldier]),null);
  assert.equal(stopAtSoldier({x:-10,z:2},{x:10,y:2,z:2},[soldier]),null);
  assert.equal(stopAtSoldier({x:.5,z:0},{x:2,y:2,z:0},[soldier]),null);
  assert.deepEqual(stopAtSoldier({x:.5,z:0},{x:-2,y:2,z:0},[soldier]),{x:.5,z:0});
  assert.equal(stopAtSoldier({x:-3,z:0},{x:3,y:2,z:0},[]),null);
});

test('campaign defaults to a squad while saved solo progress and depleted squads remain exact',()=>{
  assert.equal(campaignAssaultStyle({rally:{}}),'allied');
  assert.equal(campaignAssaultStyle({rally:{stopped:1}}),'solo');
  assert.equal(campaignAssaultStyle({rally:{style:'solo'}}),'solo');
  assert.equal(campaignAssaultStyle({rally:{style:'allied',stopped:1}}),'allied');
  assert.match(campaignAssaultBriefing({rally:{supportAllies:2}}),/2 allied soldiers/);
  assert.match(campaignAssaultBriefing({rally:{style:'allied',allied:{totalAllies:3,lost:2}}}),/1 allied soldier in/);
  assert.match(campaignAssaultBriefing({rally:{style:'allied',allied:{totalAllies:3,lost:3}}}),/no soldiers left/);
});

test('soldiers report the actual resolved battle and current owner without changing campaign state',()=>{
  for(const side of ['west','east']){
    const w=createWorldWar();w.advance(3);w.syncRegion('Caricas');const b=w.snapshot().engagements[0];
    assert(w.campaign.joinBattle(b.id,b.location).ok);assert(w.campaign.resolveEncounter(b.id,side,'success','vanguard-broken',3).ok);
    assert(w.campaign.joinBattle(b.id,b.location).ok);const p=w.snapshot().pending;assert(w.campaign.chooseAssault(p.id,campaignAssaultStyle(p)).ok);
    assert(w.campaign.resolveEncounter(p.id,side,'success','rally-secured',p.rally.guards,{alliesLost:0,routed:0,allyDamage:30}).ok);
    const state=w.snapshot(),before=structuredClone(state);
    const words=soldierWords({region:'caricas',owner:side,battleId:b.id,kind:'survivor'},state,null,id=>id,id=>id);
    assert.match(words.battle,new RegExp(side+' won'));assert.match(words.battle,/day 6/);assert(!words.battle.includes('undefined'));
    assert.deepEqual(state,before);assert.deepEqual(createWorldWar(w.checkpoint()).snapshot(),state);
  }
});
