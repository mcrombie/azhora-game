import test from 'node:test';
import assert from 'node:assert/strict';
import {createAdventureWar} from '../src/experiments/day-night/opening-war.js';
import {createBattleClockHold} from '../src/app/exploration/battle-clock-hold.js';
import {warLogEntries} from '../src/app/exploration/war-log.js';
import {worldWarScenario} from '../src/app/exploration/world-war.js';
import {commanderOutcome} from './fixtures/commander-outcomes.js';

function enter(seconds){
  const war=createAdventureWar();war.begin();war.advancePassage(seconds);
  war.syncRegion('Caricas');const battle=war.snapshot().engagements.find(b=>b.region==='caricas');
  assert(war.campaign.joinBattle(battle.id,battle.location).ok);
  assert(war.campaign.chooseFieldBattle(battle.id,'west').ok);
  assert(war.campaign.chooseAssault(war.snapshot().pending.id,'allied').ok);
  return war;
}
function finish(war){
  const pending=war.snapshot().pending;
  return war.campaign.resolveEncounter(pending.id,'west','success','rally-secured',pending.rally.guards,commanderOutcome(war.campaign,'west',true));
}

test('completion resets fractional time to the exact deadline for early and late arrivals',()=>{
  for(const seconds of [0,56.92,160.75,179.999]){
    const war=enter(seconds),before=war.snapshot();
    assert.equal(war.clock().elapsedSeconds,seconds);
    war.tick(1,true);assert.equal(war.clock().elapsedSeconds,seconds,'Tactical combat holds time');
    assert(finish(war).ok);
    const state=war.snapshot(),clock=war.clock();
    assert.equal(clock.elapsedSeconds,180);assert.equal(clock.fraction,0);assert.equal(clock.hour,9);
    assert.equal(state.engagements.find(b=>b.region==='caricas').resolvedAt,180);
    assert.equal(state.engagements.find(b=>b.region==='ovesos').endsAt-clock.elapsedSeconds,120);
    assert.equal(clock.transition.reason,'battle-completion');
    assert.equal(clock.transition.from.elapsedSeconds,seconds);assert.equal(clock.transition.to.elapsedSeconds,180);
    assert.deepEqual(state.events.slice(0,before.events.length),before.events,'Existing timestamps are untouched');
    assert.deepEqual(createAdventureWar(war.checkpoint()).snapshot(),state);
  }
});

test('result previews cannot spend time; Continue advances once and restores the chosen run/pause preference',()=>{
  for(const running of [false,true]){
    const war=enter(56.92);
    if(!running)war.pause();
    const hold=createBattleClockHold(()=>war);hold.hold();
    const saved=war.checkpoint(),preview=createAdventureWar(saved);assert(finish(preview).ok);
    assert.equal(war.clock().elapsedSeconds,56.92);assert.deepEqual(war.checkpoint(),saved);
    for(let i=0;i<20;i++)war.tick(1,true);
    assert.deepEqual(war.checkpoint(),saved,'Reading the result screen costs no time');
    const p=war.snapshot().pending,progress=commanderOutcome(war.campaign,'west',true);
    assert(finish(war).ok);assert.deepEqual(war.snapshot(),preview.snapshot());
    const completed=war.checkpoint();
    assert.equal(war.campaign.resolveEncounter(p.id,'west','success','rally-secured',p.rally.guards,progress).ok,false);
    assert.deepEqual(war.checkpoint(),completed,'A duplicate Continue cannot spend time or apply casualties again');
    hold.release();hold.release();assert.equal(war.clock().running,running);
    war.tick(.25,true);assert.equal(war.clock().elapsedSeconds,running?180.25:180);
  }
});

test('war log and restored saves keep intervening events at their own minute boundaries',()=>{
  const war=enter(56.92);assert(finish(war).ok);
  const state=war.snapshot(),events=state.events;
  assert.equal(events.find(e=>e.type==='rally-result').elapsedSeconds,56.92);
  assert.equal(events.find(e=>e.type==='battle-start'&&e.engagement.region==='ovesos').elapsedSeconds,120);
  assert.equal(events.find(e=>e.type==='battle'&&e.region==='caricas').elapsedSeconds,180);
  for(let i=0;i<events.length;i++){
    const e=events[i];assert(e.elapsedSeconds>=e.day*60&&e.elapsedSeconds<(e.day+1)*60);
    if(i)assert(e.elapsedSeconds>=events[i-1].elapsedSeconds);
  }
  const log=warLogEntries(state,worldWarScenario(state.scenario));
  assert(log.some(e=>e.title==='Battle begins at Ovesos'&&e.elapsedSeconds===120));
  assert(log.some(e=>e.personal&&e.elapsedSeconds===180));
  const saved=war.checkpoint(),reload=createAdventureWar(saved);
  assert.deepEqual(reload.checkpoint(),saved);assert.deepEqual(reload.snapshot(),state);
});
