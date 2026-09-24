import test from 'node:test';
import assert from 'node:assert/strict';
import { createCombat, ENEMY_KINDS } from '../src/combat.js';
import { BODY, bodyWorld } from '../src/bodies.js';
import { moveCharacter } from '../src/game-state.js';

function fight(kind, hp=240) {
  const world={heightAt:()=>1.5,colliders:[],bounds:{minX:-80,maxX:80,minZ:-80,maxZ:80}};
  const position={x:0,z:0},events=[];
  const combat=createCombat({world,position,onEvent:event=>events.push(event),
    getWeapon:()=>({id:'simple-sword',usable:true,damage:[24,26,34],reachMultiplier:1})});
  assert.equal(combat.startEncounter({id:'guard-recovery',center:{x:0,z:0},checkpoint:{x:0,z:0},retreatZ:25,
    enemies:[{id:'watch',kind,hp,x:0,z:1.5,entry:.15}]}),true);
  const guard=combat.state.enemies[0],nav=bodyWorld(world).moving(position,BODY.traveler,'traveler');
  const press=()=>{
    const yaw=Math.atan2(guard.x-position.x,guard.z-position.z),step=4.2*combat.movementScale()/60;
    nav.setBodies([{id:guard.id,x:guard.x,z:guard.z,r:BODY.person}]);
    moveCharacter(position,Math.sin(yaw)*step,Math.cos(yaw)*step,nav,BODY.traveler);
    combat.attack(yaw);combat.update(1/60);
  };
  return {combat,guard,position,events,press};
}

function firstRecovery(kind) {
  const sample=fight(kind);
  const {combat,guard,events}=sample;
  for(let frame=0;frame<120&&!events.some(event=>event.type==='melee-impact'&&event.source==='enemy');frame++)combat.update(1/60);
  assert.ok(events.some(event=>event.type==='melee-impact'&&event.source==='enemy'));
  for(let frame=0;frame<60&&guard.action==='attack';frame++)combat.update(1/60);
  assert.equal(guard.action,'idle');
  return sample;
}

test('a trained shield covers frontal recovery while rear and flank blows still land through mail',()=>{
  for(const kind of ['soldier','officer'])for(const side of ['front','rear','flank']) {
    const {combat,guard,events}=firstRecovery(kind),profile=ENEMY_KINDS[kind];
    assert.equal(guard.guarded,true,'the shield pose returns on the exact recovery transition');
    const yaw=guard.yaw+Math.PI+(side==='rear'?Math.PI:side==='flank'?Math.PI/2:0),before=guard.hp;
    combat.spellHit(guard.id,24,{yaw});
    const expected=Math.max(1,Math.round(24*(side==='front'?1-profile.guard:1)*(1-profile.armor)));
    assert.equal(before-guard.hp,expected,`${kind} ${side}`);
    if(side==='front') {
      assert.equal(guard.action,'idle');assert.equal(guard.guarded,true);
      assert.ok(events.some(event=>event.type==='blocked'));
    } else {
      assert.equal(guard.action,'hurt');assert.equal(guard.guarded,false,'recoil lowers the visible shield immediately');
      const hp=guard.hp;combat.spellHit(guard.id,24,{yaw:guard.yaw+Math.PI});
      assert.equal(hp-guard.hp,Math.round(24*(1-profile.armor)),'a frontal blow during recoil also gets through');
    }
  }
});

test('a committed trained guard is vulnerable during both windup and swing without changing attack timing',()=>{
  for(const kind of ['soldier','officer'])for(const action of ['windup','attack']) {
    const {combat,guard}=fight(kind),profile=ENEMY_KINDS[kind];
    for(let frame=0;frame<120&&guard.action!==action;frame++)combat.update(1/60);
    assert.equal(guard.action,action);assert.equal(guard.guarded,false,'the shield flag follows the action immediately');
    const before=guard.hp,progress=guard.progress;
    combat.spellHit(guard.id,24,{yaw:guard.yaw+Math.PI});
    assert.equal(before-guard.hp,Math.round(24*(1-profile.armor)));
    assert.equal(guard.action,action,'poise preserves the committed swing');
    assert.equal(guard.progress,progress,'taking a hit does not restart or accelerate the attack');
  }
});

test('trained guards regain attacks under continuous forward sword spam instead of remaining staggered',()=>{
  for(const kind of ['soldier','officer']) {
    // A durable fixture isolates recovery from which side wins a damage race.
    const {combat,guard,position,events,press}=fight(kind,10000);
    for(let frame=0;frame<60*30&&combat.state.phase==='active';frame++) {
      press();
      assert.ok(Math.hypot(guard.x-position.x,guard.z-position.z)>=BODY.person+BODY.traveler-1e-7);
    }
    assert.ok(events.filter(event=>event.type==='windup').length>=4,`${kind} must begin later attacks despite repeated hits`);
    const hits=events.filter(event=>event.type==='player-hit');
    assert.ok(hits.length>=4,`${kind} must finish later attacks as well`);
    assert.ok(hits.every(hit=>hit.damage===ENEMY_KINDS[kind].damage),'authored hit damage remains unchanged');
    assert.equal(combat.state.phase,'defeated');
  }
});

test('a trained guard can raise his shield after repeated hits during recovery',()=>{
  const {combat,guard,position,events}=firstRecovery('soldier');
  // Low damage contacts isolate the recovery clock and repeated recoil handling.
  // Move out of engagement so a finished recovery raises the shield rather than attacking.
  position.z-=8;
  for(let frame=0;frame<100;frame++) {
    if(frame%5===0)combat.spellHit(guard.id,1,{yaw:Math.atan2(guard.x-position.x,guard.z-position.z)});
    combat.update(1/60);
  }
  assert.ok(events.some(event=>event.type==='blocked'),
    'the authored recovery ends and the shield can catch a later contact');
});

test('two ordinary 240-health guards withstand a starting sword user pressing forward without defending',()=>{
  const position={x:0,z:0},events=[];
  const world={heightAt:()=>1.5,colliders:[],bounds:{minX:-80,maxX:80,minZ:-80,maxZ:80}};
  // This collinear approach lets the same player sweep hit both guards, making
  // recovery shielding do actual work instead of relying on a generous formation.
  const pair=createCombat({world,position,onEvent:event=>events.push(event),
    getWeapon:()=>({id:'simple-sword',usable:true,damage:[24,26,34],reachMultiplier:1})});
  assert.equal(pair.startEncounter({id:'two-watchmen',center:{x:0,z:0},checkpoint:{x:0,z:0},retreatZ:25,
    enemies:[{id:'front',kind:'soldier',hp:240,x:0,z:1.5,entry:.15},{id:'rear',kind:'soldier',hp:240,x:.1,z:2.6,entry:.15}]}),true);
  assert.equal(pair.state.player.maxHp,100);
  const nav=bodyWorld(world).moving(position,BODY.traveler,'traveler');
  for(let frame=0;frame<60*30&&pair.state.phase==='active';frame++) {
    const alive=pair.state.enemies.filter(guard=>guard.active),target=alive.sort((a,b)=>Math.hypot(a.x-position.x,a.z-position.z)-Math.hypot(b.x-position.x,b.z-position.z))[0];
    const yaw=Math.atan2(target.x-position.x,target.z-position.z),step=4.2*pair.movementScale()/60;
    nav.setBodies(alive.map(guard=>({id:guard.id,x:guard.x,z:guard.z,r:BODY.person})));
    moveCharacter(position,Math.sin(yaw)*step,Math.cos(yaw)*step,nav,BODY.traveler);
    pair.attack(yaw);pair.update(1/60);
  }
  assert.equal(pair.state.phase,'defeated');
  assert.ok(pair.state.enemies.some(guard=>guard.hp>0));
  assert.ok(events.filter(event=>event.type==='blocked').length>=5,'several real sword contacts meet a shield');
});

test('ordinary goblins still stagger and are knocked back by a sword hit',()=>{
  const {combat,guard}=fight('goblin');
  const before=guard.z;
  combat.attack(0);combat.update(.21);
  assert.equal(guard.action,'hurt');
  assert.ok(guard.z>before,'the existing knockback is retained');
  combat.update(.45);
  assert.equal(guard.action,'idle');
  assert.equal(guard.guarded,false);
});
