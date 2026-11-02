import test from 'node:test';
import assert from 'node:assert/strict';
import {createAdventureTimeGate} from '../src/app/exploration/adventure-time.js';

test('the whole Wizard Tower remains timeless even while walking',()=>{
  const time=createAdventureTimeGate();
  for(const room of ['tower','lookout'])assert.match(time.reason({room}),/tower/);
  assert.equal(time.reason({room:null}),null);
});
test('outdoor time runs while stationary and resumes as soon as reading closes',()=>{
  const time=createAdventureTimeGate();
  assert.equal(time.reason(),null);
  for(const mode of ['briefing','chronicle','map','pause','developer','encounter','skirmish','time-wait','resident','stable','council','training']){
    assert.ok(time.reason({mode}),mode+' holds time');
    assert.equal(time.reason({mode:'playing'}),null,mode+' does not leave a pause after closing');
  }
  assert.match(time.reason({reading:true}),/Reading/);
  assert.equal(time.reason({reading:false}),null);
  for(let i=0;i<120;i++)assert.equal(time.reason(),null,'Continued standing does not require movement');
});
test('loading, inactive windows and rooms still hold time without a lingering pause',()=>{
  const time=createAdventureTimeGate();
  assert.ok(time.reason({active:false}));assert.equal(time.reason({active:true}),null);
  assert.ok(time.reason({mode:'loading'}));assert.equal(time.reason(),null);
  assert.ok(time.reason({room:'council'}));assert.equal(time.reason(),null);
});

test('explicit map playback respects sanctuary, reading, focus and other modes',()=>{
  const time=createAdventureTimeGate(),playingMap={mode:'map',mapRunning:true};
  assert.equal(time.reason(playingMap),null);
  assert.ok(time.reason({...playingMap,mapRunning:false}));
  for(const room of ['tower','lookout','council'])assert.ok(time.reason({...playingMap,room}));
  assert.match(time.reason({...playingMap,reading:true}),/Reading/);
  assert.ok(time.reason({...playingMap,active:false}));
  for(const mode of ['briefing','skirmish','encounter','training','pause','loading'])assert.ok(time.reason({...playingMap,mode}));
});
