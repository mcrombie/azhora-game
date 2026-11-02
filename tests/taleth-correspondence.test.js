import test from 'node:test';
import assert from 'node:assert/strict';
import {talethLetters,talethAdvice,talethFinale} from '../src/app/exploration/taleth-correspondence.js';
import {createWorldWar} from '../src/app/exploration/world-war.js';
import {createTowerState,LOOKOUT_SPAWN} from '../src/app/exploration/tower-state.js';
import {validateWorldWarSave,WORLD_WAR_KEY} from '../src/app/exploration/war-checkpoint.js';
import {commanderOutcome} from './fixtures/commander-outcomes.js';

test('dispatches start with a battle result and do not rewrite history or simulation',()=>{
  const w=createWorldWar();assert.deepEqual(talethLetters(w.snapshot()),[]);w.advance(3);assert.deepEqual(talethLetters(w.snapshot()),[]);
  w.advance(3);const before=w.snapshot(),letters=talethLetters(before);assert(letters.length);assert.match(letters[0].detail,/did not take part/);assert.match(letters[0].note,/preserve the people/);
  w.advance(20);assert.deepEqual(talethLetters(w.snapshot()).find(l=>l.id===letters[0].id),letters[0]);assert.deepEqual(before,createWorldWar({simulation:before,fraction:0,speed:1}).snapshot());
});
test('advice follows territorial lead, acknowledges a tie and leaves choice open',()=>{
  const owners={isareos:'minora',nethereum:'west',ovesos:'west',caricas:'east',nesdor:'east'};
  assert.equal(talethAdvice(owners,null).side,null);assert.equal(talethAdvice(owners,'east').side,'east');assert.match(talethAdvice(owners,'east').text,/no territorial lead/);
  owners.caricas='west';assert.equal(talethAdvice(owners,'east').side,'west');assert.match(talethAdvice(owners,'east').text,/3 of the four/);assert.match(talethAdvice(owners,'east').text,/free to choose/);
});

test('committed Taleth counsel pursues the chosen cause even when the other league leads',()=>{
  for(const side of ['west','east']){
    const enemy=side==='west'?'east':'west',owners={isareos:'minora',nethereum:enemy,ovesos:enemy,caricas:enemy,nesdor:side};
    const advice=talethAdvice(owners,enemy,{side});assert.equal(advice.side,side);
    assert.match(advice.text,/holds 1 of the four/);assert.match(advice.text,/Protect our remaining ground/);
    assert.doesNotMatch(advice.text,/choose that side|free to choose|help .+ finish the war/);
    owners.nesdor=enemy;assert.match(talethAdvice(owners,enemy,{side}).text,/recover a foothold/);
  }
});

test('chosen-side reports describe unattended results and retain the cause through later reversals',()=>{
  for(const side of ['west','east']){
    const w=createWorldWar();w.advance(6);const first=talethLetters(w.snapshot(),{side});assert(first.length);
    assert(first.every(letter=>letter.side===side));assert.match(first[0].summaryText,/without you/);
    assert.match(first[0].detail,/next task up to date/);assert.doesNotMatch(first[0].detail,/choose that side/);
    w.advance(14);const later=talethLetters(w.snapshot(),{side});
    assert.deepEqual(later.filter(l=>first.some(f=>f.id===l.id)),first,'Historical reports remain tied to their own reported front');
    assert(later.filter(l=>!l.finale).every(l=>l.side===side));
  }
});
test('personal battle letter describes real contribution without claiming a skipped victory',()=>{
  const w=createWorldWar();w.advance(3);w.syncRegion('Caricas');let b=w.snapshot().engagements.find(b=>b.region==='caricas');
  w.campaign.joinBattle(b.id,b.location);w.campaign.resolveEncounter(b.id,'west','success','vanguard-broken',3);w.advance(3);
  const letter=talethLetters(w.snapshot()).find(l=>l.battleId===b.id);assert(letter.hero);assert.match(letter.detail,/interception removed 12/);assert.doesNotMatch(letter.detail,/Your final assault secured/);
});

test('Taleth states the captain turning point briefly and keeps it historical after recovery',()=>{
  for(const side of ['west','east']){
    const w=createWorldWar();w.advance(3);w.syncRegion('Caricas');const b=w.snapshot().engagements[0];
    assert(w.campaign.joinBattle(b.id,b.location).ok);assert(w.campaign.resolveEncounter(b.id,side,'success','vanguard-broken',3).ok);
    assert(w.campaign.joinBattle(b.id,b.location).ok);const p=w.snapshot().pending;
    assert(w.campaign.resolveEncounter(p.id,side,'success','rally-secured',p.rally.guards,commanderOutcome(w.campaign,side,true)).ok);
    const report=talethLetters(w.snapshot()).find(l=>l.battleId===b.id),enemy=side==='west'?'east':'west';
    assert(report.summaryText.includes(b.commanders[enemy].name+' retreated.'));
    assert(report.summaryText.length<300);w.advance(30);
    assert.deepEqual(talethLetters(w.snapshot()).find(l=>l.id===report.id),report);
  }
});
test('victory summons and lookout conclusion support either winner and nonparticipation',()=>{
  for(const side of ['east','west']){
    const w=createWorldWar();w.campaign.reinforce(side==='west'?'nethereum':'caricas',500);w.advance(200);
    const s=w.snapshot();assert.equal(s.winner,side);const before=structuredClone(s),last=talethLetters(s).at(-1);assert(last.finale);assert.match(last.detail,/lookout/);
    const pages=talethFinale(s);assert.equal(pages.length,8);assert.equal(new Set(pages.map(p=>p.view)).size,7);assert.match(pages[1].words,/left the fighting to the armies/);assert.match(pages[1].words,side==='west'?/Mayor/:/Priest/);assert.equal(pages[2].view,'east');assert.equal(pages[2].closing,undefined);assert.match(pages.at(-1).closing,/complete/);assert.deepEqual(s,before);
  }
});
test('lookout and completion restore with an ended war, but cannot be smuggled into an active save',()=>{
  const w=createWorldWar(),tower=createTowerState();tower.begin();tower.enter('lookout');tower.conclude();
  const checkpoint=()=>({format:WORLD_WAR_KEY,version:1,...w.checkpoint(),tower:tower.snapshot(false),exploration:{version:1,character:'teresod',position:LOOKOUT_SPAWN,heading:0,camera:{yaw:0,pitch:.3,distance:8},elapsed:0,cells:[]}});
  assert(!validateWorldWarSave(checkpoint()));w.advance(200);assert(w.snapshot().winner);assert(validateWorldWarSave(checkpoint()));
  const restored=createTowerState(checkpoint());assert(restored.snapshot().concluded);assert.equal(restored.room,'lookout');assert(!restored.conclude());
});
