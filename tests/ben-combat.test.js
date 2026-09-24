import test from 'node:test';
import assert from 'node:assert/strict';
import { createCombat } from '../src/combat.js';
import { moveCharacter } from '../src/game-state.js';
import { BEN, SPIDER, SPIDER_DEN, createSpiderQuest, validateSpiderQuestSnapshot } from '../src/spider-quest.js';

function fixture({level=0}={}) {
  const world={bounds:{minX:-900,maxX:-700,minZ:200,maxZ:350},colliders:[],heightAt:()=>1.5};
  const position={...SPIDER_DEN.checkpoint,y:1.5},events=[];
  const combat=createCombat({world,position,onEvent:event=>events.push(event)});
  const encounter={...SPIDER_DEN,level,enemies:SPIDER_DEN.enemies.map(enemy=>({...enemy,entry:60}))};
  assert.equal(combat.startEncounter(encounter),true);
  return {world,position,events,combat,encounter};
}
function until(combat,predicate,seconds=5) {
  for(let frame=0;frame<seconds*120&&!predicate();frame++)combat.update(1/120);
  assert.ok(predicate(),'The expected combat event never occurred');
}

test('Ben keeps his own model and a fireball must launch and travel before it hurts the spider',()=>{
  const {combat,events}=fixture(),ben=combat.state.allies[0],spider=combat.state.enemies[0];
  assert.equal(ben.kind,'sorcerer');assert.equal(ben.model.role,BEN.modelRole);
  assert.equal(ben.model.tunic,BEN.color);assert.deepEqual(ben.model.look,BEN.look);
  until(combat,()=>ben.action==='windup');
  assert.ok(events.some(event=>event.type==='ally-windup'&&event.spellId==='fireball'));
  const startingHealth=spider.hp,castPosition={x:ben.x,z:ben.z};
  combat.update(.5);assert.equal(spider.hp,startingHealth);assert.equal(combat.state.fireballs.length,0);
  until(combat,()=>combat.state.fireballs.length>0);
  const ball=combat.state.fireballs[0],launchedAt={x:ball.x,z:ball.z};
  assert.equal(ball.owner,BEN.id);assert.equal(ball.targetId,SPIDER.id);
  assert.equal(spider.hp,startingHealth,'release is not instant damage');
  assert.deepEqual({x:ben.x,z:ben.z},castPosition,'casting cannot secretly lunge');
  combat.update(.1);
  assert.ok(Math.hypot(ball.x-launchedAt.x,ball.z-launchedAt.z)>1,'the fireball occupies moving space');
  assert.equal(spider.hp,startingHealth,'the projectile has not reached the spider yet');
  until(combat,()=>events.some(event=>event.type==='spell-impact'));
  assert.equal(spider.hp,startingHealth-26);assert.equal(combat.state.fireballs.length,0);
  const hit=events.find(event=>event.type==='hit'&&event.by===BEN.id);
  assert.equal(hit.source,'ally');assert.equal(hit.spell,true);assert.equal(hit.spellId,'fireball');
  assert.ok(!events.some(event=>event.type==='melee-impact'&&event.sourceId===BEN.id));
});

test('a fireball stops on solid scenery and a blow interrupts Ben before release',()=>{
  const {combat,events,world}=fixture();
  until(combat,()=>combat.state.fireballs.length>0);
  const ball=combat.state.fireballs[0],spider=combat.state.enemies[0],hp=spider.hp;
  world.colliders.push({x:ball.x+Math.sin(ball.yaw)*2,z:ball.z+Math.cos(ball.yaw)*2,r:.6});
  until(combat,()=>events.some(event=>event.type==='ally-fireball-ended'));
  assert.equal(events.find(event=>event.type==='ally-fireball-ended').reason,'solid');
  assert.equal(spider.hp,hp);
  const interrupted=fixture();
  until(interrupted.combat,()=>interrupted.combat.state.allies[0].action==='windup');
  interrupted.combat.spellHit(BEN.id,5);
  interrupted.combat.update(.5);
  assert.ok(!interrupted.events.some(event=>event.type==='ally-fireball'));
});

test('Ben opens distance from a nearby spider instead of closing for a sword strike',()=>{
  const {combat}=fixture(),ben=combat.state.allies[0],spider=combat.state.enemies[0];
  ben.x=spider.x+3;ben.z=spider.z;
  combat.update(.5);
  assert.ok(Math.hypot(ben.x-spider.x,ben.z-spider.z)>3.8);
  assert.equal(ben.action,'idle');assert.equal(combat.state.fireballs.length,0);
});

test('a traveler crossing a released fireball intercepts it before it reaches the spider',()=>{
  const {combat,events,position}=fixture();
  until(combat,()=>combat.state.fireballs.length>0);
  const ball=combat.state.fireballs[0],spider=combat.state.enemies[0],hp=spider.hp;
  position.x=ball.x+Math.sin(ball.yaw)*3;position.z=ball.z+Math.cos(ball.yaw)*3;
  until(combat,()=>events.some(event=>event.type==='spell-impact'));
  const impact=events.find(event=>event.type==='spell-impact');
  assert.equal(impact.targetId,'traveler');assert.equal(impact.source,'ally');
  assert.equal(impact.hits[0].team,'player');assert.equal(combat.state.player.hp,74);
  assert.equal(spider.hp,hp);assert.equal(combat.state.fireballs.length,0);
});

test('retreat captures remaining health, re-entry keeps maximums, and an explicit retry heals once',()=>{
  const {combat,position,events,encounter}=fixture({level:2});
  const maximum=combat.state.enemies[0].maxHp;
  combat.state.player.hp=37;combat.state.player.stamina=42;
  combat.spellHit(SPIDER.id,20);combat.spellHit(BEN.id,5);
  position.x=SPIDER_DEN.retreatLine+1;combat.update(1/120);
  const retreat=events.find(event=>event.type==='retreat');
  assert.equal(retreat.enemies[0].hp,maximum-20);assert.equal(retreat.allies[0].hp,73);
  assert.equal(combat.state.player.hp,37);assert.ok(combat.state.player.stamina<43);
  assert.deepEqual(combat.state.fireballs,[]);
  const quest=createSpiderQuest();quest.ask();quest.accept();quest.begin();
  assert.equal(quest.rememberFight({spiderHp:retreat.enemies[0].hp,benHp:retreat.allies[0].hp}),true);
  quest.settle({benAlive:true});
  const loaded=createSpiderQuest();assert.equal(loaded.restore(quest.snapshot()),true);
  assert.deepEqual(loaded.state.fight,{spiderHp:maximum-20,benHp:73});
  const save=loaded.snapshot();save.fight.benHp=1;assert.equal(loaded.state.fight.benHp,73);
  assert.equal(validateSpiderQuestSnapshot({...save,fight:{spiderHp:NaN,benHp:73}}),false);
  position.x=SPIDER_DEN.checkpoint.x;
  assert.equal(combat.startEncounter({...encounter,
    enemies:encounter.enemies.map(enemy=>({...enemy,currentHp:loaded.state.fight.spiderHp})),
    allies:encounter.allies.map(ally=>({...ally,currentHp:loaded.state.fight.benHp}))}),true);
  assert.equal(combat.state.player.hp,37);assert.ok(combat.state.player.stamina<43);
  assert.equal(combat.state.enemies[0].hp,maximum-20);assert.equal(combat.state.enemies[0].maxHp,maximum);
  assert.equal(combat.state.allies[0].hp,73);assert.equal(combat.state.allies[0].maxHp,78);
  assert.equal(combat.resetEncounter(),true);
  assert.equal(combat.state.player.hp,combat.state.player.maxHp);
  assert.equal(combat.state.enemies[0].hp,maximum);assert.equal(combat.state.enemies[0].maxHp,maximum);
  assert.equal(combat.state.allies[0].hp,78);
});

test('the den can be left north, west or south and does not heal the traveler on departure',()=>{
  for(const direction of [{x:0,z:-1},{x:-1,z:0},{x:0,z:1}]) {
    const {combat,position,events,world}=fixture();
    combat.state.player.hp=37;combat.state.player.stamina=42;
    combat.spellHit(SPIDER.id,20);
    position.x=SPIDER_DEN.center.x+direction.x*44.5;
    position.z=SPIDER_DEN.center.z+direction.z*44.5;
    combat.update(1/120);assert.equal(combat.state.phase,'active','inside the normal45m boundary');
    moveCharacter(position,direction.x,direction.z,world);
    combat.update(1/120);
    assert.equal(combat.state.phase,'peaceful');
    assert.equal(combat.state.player.hp,37);assert.ok(combat.state.player.stamina<43);
    assert.equal(events.filter(event=>event.type==='retreat').length,1);
    assert.equal(events.find(event=>event.type==='retreat').enemies[0].hp,200);
  }
});
