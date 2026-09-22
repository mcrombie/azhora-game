import test from 'node:test';
import assert from 'node:assert/strict';
import {canStand,moveCharacter,advanceQuest,getMovementInput,questSteps,QUEST_DONE,SUBQUESTS} from '../src/game-state.js';
const input=(...codes)=>getMovementInput(new Set(codes));
test('Q and E move forward diagonally at the same speed as walking',()=>{
  const left=input('KeyQ'),right=input('KeyE');
  assert.ok(left.forward>0&&left.side<0);
  assert.ok(right.forward>0&&right.side>0);
  assert.deepEqual(left,input('KeyW','KeyA'));
  assert.deepEqual(right,input('KeyW','KeyD'));
  assert.ok(Math.abs(Math.hypot(left.forward,left.side)-1)<1e-12);
  assert.ok(Math.abs(Math.hypot(right.forward,right.side)-1)<1e-12);
});
test('Overlapping diagonal keys preserve direction and opposing inputs cancel',()=>{
  assert.deepEqual(input('KeyW','KeyQ'),input('KeyQ'));
  assert.deepEqual(input('KeyW','KeyE','KeyD'),input('KeyE'));
  assert.deepEqual(input('KeyQ','KeyE'),input('KeyW'));
  assert.deepEqual(input('KeyQ','KeyS'),input('KeyA'));
  assert.deepEqual(input('KeyW','KeyS','KeyA','KeyD'),{forward:0,side:0});
  assert.deepEqual(input('KeyF'),{forward:0,side:0});
});
const world={bounds:{minX:-20,maxX:20,minZ:-20,maxZ:20},heightAt:(x,z)=>z>15?0:1,colliders:[{x:0,z:0,r:1},{x:8,z:0,hx:2,hz:3}]};
test('Walking cannot tunnel through trees or cottages, even after a long frame',()=>{
  const tree={x:-4,z:0};moveCharacter(tree,8,0,world);assert.ok(tree.x<-1.3);
  const house={x:3,z:0};moveCharacter(house,12,0,world);assert.ok(house.x<5.7);
});
test('Movement slides along obstacles while water and world edges remain impassable',()=>{
  const p={x:5.5,z:0};moveCharacter(p,2,2,world);assert.ok(p.x<5.7);assert.ok(p.z>1.8);
  assert.equal(canStand(0,16,world),false);assert.equal(canStand(21,0,world),false);assert.equal(canStand(-5,-5,world),true);
});
/**
 * **Chapter 1 in three subquests** (the user, 22 September 2026): report to Jojo, train with
 * Glun, report to Nothom. The eleven-step spine this replaced ran through the goblins in the
 * Greenway, the report to Corvan, the satchel lesson and Fernway Rest; all of it is off the
 * slate (src/quest-slate.js) and the four events that drove it are gone with it.
 */
const tutorialEvents=['ashore','accept-letter','trained'];
test('Chapter 1 is three subquests: ashore to Jojo, Jojo to Glun, Glun to the road west',()=>{
  let stage=0;
  for(const [index,event] of tutorialEvents.entries()) {
    stage=advanceQuest(stage,event);
    assert.equal(stage,index+1,`${event} should advance one lesson`);
    assert.ok(questSteps[stage],`stage ${stage} needs a visible objective`);
  }
  assert.equal(stage,QUEST_DONE);
  assert.equal(questSteps.length,QUEST_DONE+1);
  for(const event of tutorialEvents) assert.equal(advanceQuest(stage,event),QUEST_DONE,'and nothing moves it on from there');
  // The three titles the player reads, and the one that spans two steps.
  assert.equal(questSteps[0].title,questSteps[1].title,'walking up the pier and speaking to her are one errand');
  assert.deepEqual(SUBQUESTS.map(one=>one.title),[questSteps[0].title,questSteps[2].title,questSteps[3].title]);
  assert.deepEqual(SUBQUESTS.map(one=>[one.from,one.to]),[[0,1],[2,2],[3,3]]);
  for(let stage=0;stage<=QUEST_DONE;stage++)
    assert.equal(SUBQUESTS.filter(one=>stage>=one.from&&stage<=one.to).length,1,`stage ${stage} belongs to exactly one subquest`);
});
test('Quest events cannot skip a subquest, and the events of the old spine do nothing at all',()=>{
  for(let stage=0;stage<=QUEST_DONE;stage++) {
    for(const [index,event] of tutorialEvents.entries()) {
      if(index===stage) continue;
      assert.equal(advanceQuest(stage,event),stage,`${event} must not bypass stage ${stage}`);
    }
    // The goblins, the watch, the satchel and the trail. A save or a hook that still fires one
    // of these moves nobody, rather than landing the traveler on a step that no longer exists.
    for(const event of ['ambush','victory','retreat','reach-watch','inspect-letter','close-inventory','reach-north-trail','reach-border'])
      assert.equal(advanceQuest(stage,event),stage,`${event} is off the spine and must move nobody`);
  }
  assert.equal(advanceQuest(QUEST_DONE,'nonsense'),QUEST_DONE);
});
