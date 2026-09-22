import test from 'node:test';
import assert from 'node:assert/strict';
import {canStand,moveCharacter,advanceQuest,getMovementInput,questSteps} from '../src/game-state.js';
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
// Eren is out of the cast (src/cast.js) and the fifth step is the ground he stood on: the
// Greenway Watch. Officer Glun hands over the road token with the chart (the user, 22 Sept 2026).
const tutorialEvents=['ashore','accept-letter','trained','ambush','victory','reach-watch','inspect-letter','close-inventory','reach-north-trail','reach-border'];
test('The regional tutorial continues past the Greenway Watch through inventory and the northern border',()=>{
  let stage=0;
  for(const [index,event] of tutorialEvents.entries()) {
    stage=advanceQuest(stage,event);
    assert.equal(stage,index+1,`${event} should advance one lesson`);
    assert.ok(questSteps[stage],`stage ${stage} needs a visible objective`);
  }
  assert.equal(stage,10);
  assert.equal(questSteps.length,11);
  for(const event of tutorialEvents) assert.equal(advanceQuest(stage,event),10);
});
test('Quest events cannot skip the battle, inventory inspection, dismissal, or northern trail',()=>{
  for(let stage=0;stage<tutorialEvents.length;stage++) {
    for(const [index,event] of tutorialEvents.entries()) {
      if(index===stage) continue;
      assert.equal(advanceQuest(stage,event),stage,`${event} must not bypass stage ${stage}`);
    }
  }
  const afterWatch=advanceQuest(5,'reach-watch');
  assert.equal(afterWatch,6);
  assert.equal(advanceQuest(afterWatch,'close-inventory'),6,'reading the message comes before closing the satchel');
  assert.equal(advanceQuest(afterWatch,'reach-border'),6,'reaching the watch does not complete the region');
  const afterReading=advanceQuest(afterWatch,'inspect-letter');
  assert.equal(advanceQuest(afterReading,'reach-north-trail'),7,'dismiss the inventory before continuing');
  const onTrail=advanceQuest(afterReading,'close-inventory');
  assert.equal(advanceQuest(onTrail,'reach-border'),8,'visit the north trail before the boundary');
});
test('Retreat retries the ambush without repeating preparation or erasing later progress',()=>{
  const trained=advanceQuest(2,'trained');
  const fighting=advanceQuest(trained,'ambush');
  const retry=advanceQuest(fighting,'retreat');
  assert.equal(retry,3);
  assert.equal(advanceQuest(retry,'accept-letter'),3);
  assert.equal(advanceQuest(retry,'trained'),3);
  const won=advanceQuest(advanceQuest(retry,'ambush'),'victory');
  assert.equal(won,5);
  for(const stage of [0,1,2,3,5,6,7,8,9,10]) assert.equal(advanceQuest(stage,'retreat'),stage);
});
