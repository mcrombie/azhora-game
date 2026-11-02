import test from 'node:test';
import assert from 'node:assert/strict';
import {createBattleClockHold} from '../src/app/exploration/battle-clock-hold.js';
import {createAdventureWar} from '../src/experiments/day-night/opening-war.js';

function fixture(running=true){
  let war=createAdventureWar();const clock=createBattleClockHold(()=>war);
  war.syncRegion('Caricas');if(running)war.begin();
  const battle=war.snapshot().engagements.find(b=>b.region==='caricas');
  assert(war.campaign.joinBattle(battle.id,battle.location).ok);clock.hold();
  return {clock,get war(){return war;},restore(saved){war=createAdventureWar(saved);clock.restore(saved);},
    save:()=>({...war.checkpoint(),tower:{running:clock.running()}}),
    decline(){const p=war.snapshot().pending;assert(war.campaign.resolveEncounter(p.id,null,'withdraw','declined',0).ok);clock.release();},
  };
}

for(const running of [true,false])test(`encounter closure restores ${running?'running':'explicitly paused'} time, including repeated holds`,()=>{
  const f=fixture(running);assert.equal(f.clock.running(),running);assert.equal(f.war.clock().running,false);
  f.clock.hold();for(let i=0;i<8;i++)f.war.tick(1,true);
  assert.equal(f.war.clock().elapsedSeconds,0);f.decline();f.war.tick(1,true);
  assert.equal(f.war.clock().running,running);assert.equal(f.war.clock().elapsedSeconds,running?1:0);
  f.clock.release();assert.equal(f.war.clock().running,running,'Duplicate close never toggles time off');
});

for(const running of [true,false])test(`retry and reload preserve the ${running?'running':'paused'} preference across successive attempts`,()=>{
  const f=fixture(running),saved=f.save();assert.equal(saved.tower.running,running);
  for(let attempt=0;attempt<3;attempt++){
    f.restore(saved);f.clock.hold();assert.equal(f.clock.running(),running);
    assert.equal(f.war.clock().running,false,'Restored encounter still holds strategic time');
    assert.deepEqual(f.save(),saved,'Temporary hold never changes the saved preference');
    f.decline();f.war.tick(1,true);assert.equal(f.war.clock().elapsedSeconds,running?1:0);
  }
});

test('explicit pause/run during a held encounter changes only the eventual preference',()=>{
  const f=fixture();f.clock.pause();assert.equal(f.clock.running(),false);
  f.clock.hold();assert.equal(f.clock.running(),false);
  f.clock.run();assert.equal(f.clock.running(),true);assert.equal(f.war.clock().running,false);
  f.decline();assert.equal(f.war.clock().running,true);
});

test('restoring another campaign clears a stale encounter preference',()=>{
  const f=fixture();f.restore(createAdventureWar().checkpoint());
  assert.equal(f.clock.running(),false);f.clock.release();assert.equal(f.war.clock().running,false);
});

test('completing the war cannot restart time on encounter release',()=>{
  const war=createAdventureWar(),clock=createBattleClockHold(()=>war);war.begin();clock.hold();
  war.campaign.watchBattles(false);war.advance(150);assert(war.snapshot().winner);
  clock.release();war.tick(1,true);assert.equal(war.clock().running,false);assert.equal(war.clock().complete,true);
});
