import test from 'node:test';
import assert from 'node:assert/strict';
import {talethLetters,talethAdvice,talethFinale} from '../src/app/exploration/taleth-correspondence.js';
import {createWorldWar} from '../src/app/exploration/world-war.js';
import {createTowerState,LOOKOUT_SPAWN} from '../src/app/exploration/tower-state.js';
import {validateWorldWarSave,WORLD_WAR_KEY} from '../src/app/exploration/war-checkpoint.js';

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
test('personal battle letter describes real contribution without claiming a skipped victory',()=>{
  const w=createWorldWar();w.advance(3);w.syncRegion('Caricas');let b=w.snapshot().engagements.find(b=>b.region==='caricas');
  w.campaign.joinBattle(b.id,b.location);w.campaign.resolveEncounter(b.id,'west','success','vanguard-broken',3);w.advance(3);
  const letter=talethLetters(w.snapshot()).find(l=>l.battleId===b.id);assert(letter.hero);assert.match(letter.detail,/interception removed 12/);assert.doesNotMatch(letter.detail,/Your final assault secured/);
});
test('victory summons and lookout conclusion support either winner and nonparticipation',()=>{
  for(const side of ['east','west']){
    const w=createWorldWar();if(side==='west')w.campaign.reinforce('nethereum',500);w.advance(200);
    const s=w.snapshot();assert.equal(s.winner,side);const before=structuredClone(s),last=talethLetters(s).at(-1);assert(last.finale);assert.match(last.detail,/lookout/);
    const pages=talethFinale(s);assert.equal(pages.length,3);assert.match(pages[1].words,/left the fighting to the armies/);assert.match(pages[1].words,side==='west'?/Mayor/:/Priest/);assert.equal(pages[2].view,'east');assert.match(pages[2].closing,/complete/);assert.deepEqual(s,before);
  }
});
test('lookout and completion restore with an ended war, but cannot be smuggled into an active save',()=>{
  const w=createWorldWar(),tower=createTowerState();tower.begin();tower.enter('lookout');tower.conclude();
  const checkpoint=()=>({format:WORLD_WAR_KEY,version:1,...w.checkpoint(),tower:tower.snapshot(false),exploration:{version:1,character:'teresod',position:LOOKOUT_SPAWN,heading:0,camera:{yaw:0,pitch:.3,distance:8},elapsed:0,cells:[]}});
  assert(!validateWorldWarSave(checkpoint()));w.advance(200);assert(w.snapshot().winner);assert(validateWorldWarSave(checkpoint()));
  const restored=createTowerState(checkpoint());assert(restored.snapshot().concluded);assert.equal(restored.room,'lookout');assert(!restored.conclude());
});
