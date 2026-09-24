import test from 'node:test';
import assert from 'node:assert/strict';
import {createCombat} from '../src/combat.js';

const encounter={id:'road-observed',independent:true,center:{x:0,z:0},checkpoint:{x:14,z:0},
  retreatAxis:'x',retreatLine:26,
  enemies:[{id:'rebel',kind:'goblin',x:-2,z:0,hp:60}],
  allies:[{id:'mercenary',kind:'officer',x:2,z:0,hp:180}]};
function fixture(){
  const world={bounds:{minX:-200,maxX:200,minZ:-200,maxZ:200},colliders:[],heightAt:()=>1.5};
  const position={x:32,y:1.5,z:0},events=[];
  const combat=createCombat({world,position,onEvent:event=>events.push(event)});
  return {combat,position,events};
}
function until(combat,predicate,seconds=30){
  for(let i=0;i<seconds*60&&!predicate();i++)combat.update(1/60);
  assert.ok(predicate(),`condition unmet after ${seconds}s; phase=${combat.state.phase}`);
}

test('a nearby spectator outside the retreat line sees real NPC combat and its victory without being moved',()=>{
  const {combat,position,events}=fixture(),before={...position};
  assert.equal(combat.startEncounter(encounter),true);
  const ally=combat.state.allies[0],enemy=combat.state.enemies[0];
  assert.deepEqual({x:ally.x,z:ally.z},{x:2,z:0});
  combat.update(.1);assert.equal(combat.state.phase,'active');
  until(combat,()=>enemy.hp<enemy.maxHp);
  assert.ok(events.some(event=>event.type==='ally-strike'));
  assert.ok(!events.some(event=>event.type==='retreat'));
  until(combat,()=>combat.state.phase==='won');
  assert.deepEqual(position,before,'observing neither teleports the traveler nor joins them to a checkpoint rank');
  assert.equal(events.filter(event=>event.type==='victory').length,1);
});

test('walking beyond the player leash does not dissolve a live independent clash',()=>{
  const {combat,position,events}=fixture();
  assert.equal(combat.startEncounter(encounter),true);position.x=80;
  until(combat,()=>events.some(event=>event.type==='ally-strike'));
  assert.ok(!events.some(event=>event.type==='retreat'));
  assert.equal(position.x,80);
});

test('actual ally death or a spared wound releases the observed encounter and preserves casualty data',()=>{
  for(const spared of [false,true]){
    const {combat,events}=fixture();
    assert.ok(combat.startEncounter({...encounter,enemies:[{id:'rebel',kind:'goblin',x:-1,z:0,hp:400}],
      allies:[{id:'frail',kind:'legionary',x:1,z:0,hp:1,spared}]}));
    until(combat,()=>events.some(event=>event.type==='retreat'));
    assert.ok(events.some(event=>event.type===(spared?'ally-wounded':'ally-down')&&event.id==='frail'));
    const retreat=events.find(event=>event.type==='retreat');
    assert.equal(retreat.allies[0].hp,0);assert.equal(combat.state.phase,'peaceful');
    assert.equal(retreat.enemies.length,1,'surviving enemies remain available to host outcome handling');
  }
});

test('escaped, wounded, inactive or departed allies cannot hold an independent encounter open',()=>{
  for(const patch of [{escaped:true},{wounded:true},{active:false},{x:50}]){
    const {combat,events}=fixture();assert.ok(combat.startEncounter(encounter));
    Object.assign(combat.state.allies[0],patch);combat.update(1/60);
    assert.equal(combat.state.phase,'peaceful',JSON.stringify(patch));
    assert.equal(events.filter(event=>event.type==='retreat').length,1);
  }
});

test('a bystander reaching a real refuge releases the fight after its escape event',()=>{
  const {combat,events}=fixture();
  assert.ok(combat.startEncounter({...encounter,enemies:[{id:'waiting-threat',kind:'goblin',x:-15,z:0,hp:100,entry:60}],
    allies:[{id:'runner',kind:'bystander',x:2,z:0,refuge:{x:5,z:0}}]}));
  until(combat,()=>events.some(event=>event.type==='retreat'));
  const escaped=events.find(event=>event.type==='ally-escaped');
  assert.ok(escaped);assert.ok(Math.hypot(escaped.x-5,escaped.z)<1);
  assert.ok(events.indexOf(escaped)<events.findIndex(event=>event.type==='retreat'));
});

test('without a holding ally, or without the independent flag, normal retreats still apply',()=>{
  for(const config of [{...encounter,allies:[]},{...encounter,independent:false},{...encounter,independent:undefined},
    {...encounter,bout:true}]){
    const {combat,events}=fixture();assert.ok(combat.startEncounter(config));combat.update(1/60);
    assert.notEqual(combat.state.phase,'active');
    assert.ok(events.some(event=>event.type===(config.bout?'spar-over':'retreat')));
  }
});

test('independent encounter validation and retry preserve the opt-in policy',()=>{
  const {combat,position,events}=fixture();
  assert.equal(combat.startEncounter({...encounter,independent:'yes'}),false);
  assert.equal(combat.startEncounter(encounter),true);
  assert.equal(combat.resetEncounter(),true);position.x=32;events.length=0;
  combat.update(.1);assert.equal(combat.state.phase,'active');
  until(combat,()=>events.some(event=>event.type==='ally-strike'));
  assert.ok(!events.some(event=>event.type==='retreat'));
});
