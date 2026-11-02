import test from 'node:test';
import assert from 'node:assert/strict';
import {createCorrisState,validCorrisSave} from '../src/app/exploration/corris-state.js';
import {talethLetters,talethMessageNext,talethMessageStamp,talethFollowAvailable,TALETH_VOICE_INTRO} from '../src/app/exploration/taleth-correspondence.js';
import {createWorldWar} from '../src/app/exploration/world-war.js';

// Keep the existing receipt schema so changing the speaker does not redeliver
// every old dispatch, or discard messages the player chose to hear later.
test('postponed telepathic news survives saves and acknowledgment preserves history',()=>{
  const w=createWorldWar();w.advance(6);const before=structuredClone(w.snapshot()),reports=talethLetters(before),c=createCorrisState();
  assert(c.pending(reports));const saved=c.snapshot();assert.equal(createCorrisState(saved).pending(reports).id,reports.at(-1).id);
  c.acknowledge(reports.at(-1).id);assert.equal(c.pending(reports),null);assert(c.snapshot().introduced);
  assert.equal(createCorrisState(c.snapshot()).pending(reports),null);
  w.advance(30);assert(c.pending(talethLetters(w.snapshot())));assert.deepEqual(talethLetters(before),reports);
  for(const report of talethLetters(w.snapshot())){assert(report.summaryText.length<300);assert.doesNotMatch(report.summaryText,/undefined|NaN/);}
});
test('old courier receipts remain compatible and malformed receipts are rejected',()=>{
  assert(validCorrisSave(undefined));
  for(const bad of [null,{},false,{version:1,heardThrough:-1,introduced:true},{version:1,heardThrough:2.5,introduced:true},{version:1,heardThrough:2,introduced:'yes'}])assert(!validCorrisSave(bad));
  assert.throws(()=>createCorrisState({}));assert.match(talethMessageNext({kind:'finale'}),/Meet me at the lookout/);
  assert.doesNotMatch(TALETH_VOICE_INTRO,/Corris|raven|land|fly/i);
});
test('elapsed message stamps preserve exact event seconds while legacy reports keep days',()=>{
  const w=createWorldWar();w.advance(6);const state=w.snapshot();
  const event=state.events.find(e=>e.type==='battle');event.elapsedSeconds=377.5;
  const report=talethLetters(state).find(l=>l.id===event.id);
  assert.equal(report.elapsedSeconds,377.5);
  assert.equal(talethMessageStamp(report,{sharedOpening:true}),'Adventure 06:17');
  assert.equal(talethMessageStamp({day:3},{sharedOpening:true}),'Adventure 03:00');
  assert.equal(talethMessageStamp(report,null),'Day 6');
  const advice=talethMessageNext({kind:'battle',detail:'Join before day 6.'},{sharedOpening:true});
  assert.match(advice,/06:00/);assert.doesNotMatch(advice,/day/);
  assert.match(talethMessageNext({kind:'battle',detail:'Join Ovesos.'},{complete:true}),/first battle is settled/);
  assert.doesNotMatch(talethMessageNext({kind:'battle',detail:'Join Ovesos.'},{complete:true}),/Ovesos/);
});
test('Taleth continues advising the full campaign and summons the player only when the war ends',()=>{
  const clock={sharedOpening:true,fullCampaign:true,complete:false};
  const live=talethMessageNext({kind:'battle',detail:'Join Ovesos before day 8.'},clock);
  assert.match(live,/Ovesos before 08:00/);assert.doesNotMatch(live,/first battle is settled/);
  const summon=talethMessageNext({kind:'finale'},{...clock,complete:true});
  assert.match(summon,/Meet me at the lookout/);assert.doesNotMatch(summon,/first battle/);
  assert.match(talethMessageNext({kind:'complete'},{...clock,complete:true}),/Our work in this war is done/);
  for(const kind of ['finale','complete'])assert(talethFollowAvailable({kind},{...clock,complete:true}),'Full victory keeps return navigation enabled');
  assert(!talethFollowAvailable({kind:'regroup'},clock),'Forecast owns elapsed waiting');
  assert(!talethFollowAvailable({kind:'army',target:null},clock),'There is no tracked march before its order is issued');
  assert(talethFollowAvailable({kind:'battle',target:{kind:'battle',id:'b1'}},clock));
  assert(!talethFollowAvailable({kind:'finale'},{sharedOpening:true,complete:true}),'Opening-only rehearsal stays ended');
  assert(talethFollowAvailable({kind:'regroup'},null),'Legacy dispatch waiting remains enabled');
});
