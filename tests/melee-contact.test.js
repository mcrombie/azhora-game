import test from 'node:test';
import assert from 'node:assert/strict';
import {createCombat} from '../src/combat.js';
import {meleeContact,meleeContacts} from '../src/melee-contact.js';

function fixture({position={x:0,z:0},getMargins}={}) {
  const world={bounds:{minX:-100,maxX:100,minZ:-100,maxZ:100},colliders:[],heightAt:()=>1.5};
  const events=[],wear=[];
  const combat=createCombat({world,position,getMargins,onEvent:event=>events.push(event),onWeaponContact:id=>wear.push(id)});
  combat.setWeaponReady(true);
  const start=(enemies,allies=[])=>assert.equal(combat.startEncounter({id:'contact-test',center:{x:0,z:0},
    checkpoint:{x:0,z:8},retreatZ:18,enemies,allies}),true);
  return {world,position,events,wear,combat,start};
}
const foe=(id,x,z,extra={})=>({id,x,z,kind:'goblin',hp:100,entry:10,...extra});
const friend=(id,x,z,extra={})=>({id,x,z,kind:'legionary',hp:100,...extra});

test('a peaceful swing emits one physical impact at contact, with no encounter required',()=>{
  const {combat,events,wear}=fixture();
  assert.equal(combat.attack(0),true);
  combat.update(.18);
  assert.equal(events.some(event=>event.type==='melee-impact'),false);
  combat.update(.03);combat.update(2);
  const impacts=events.filter(event=>event.type==='melee-impact');
  assert.equal(impacts.length,1);
  const impact=impacts[0];
  assert.equal(impact.source,'player');assert.equal(impact.sourceId,'traveler');
  assert.equal(impact.damage,24);assert.equal(impact.range,2.35);
  assert.deepEqual(impact.combatantIds,['traveler']);assert.deepEqual(impact.affectedIds,[]);
  assert.equal(meleeContact(impact,{id:'villager',x:0,z:1.6,hp:60}),true);
  assert.equal(meleeContact(impact,{id:'distant-instructor',x:0,z:4,hp:420}),false);
  assert.equal(wear.length,0,'the host charges world-NPC-only contact; a miss has no wear');
});

test('a player sweep hurts a friend and an enemy once, leaving rear and dead bodies alone',()=>{
  const {combat,events,wear,start}=fixture();
  start([foe('enemy',0,1.7)],[friend('friend',.5,1.5,{npcId:'town-villager'}),friend('rear',0,-1.4),friend('dead',-.5,1.5)]);
  const dead=combat.state.allies.find(actor=>actor.id==='dead');dead.hp=0;dead.active=false;dead.action='dead';
  combat.attack(0);combat.update(.3);
  const impact=events.find(event=>event.type==='melee-impact'&&event.source==='player');
  assert.equal(combat.state.enemies[0].hp,76);
  assert.equal(combat.state.allies[0].hp,76);
  assert.equal(combat.state.allies[1].hp,100);assert.equal(dead.hp,0);
  assert.deepEqual(new Set(impact.affectedIds),new Set(['enemy','friend']));
  assert.ok(impact.combatantIds.includes('town-villager'),'world NPC aliases are excluded from a second damage pass');
  assert.equal(impact.hits.find(hit=>hit.id==='friend').npcId,'town-villager');
  assert.equal(events.filter(event=>event.type==='ally-hit'&&event.id==='friend').length,1);
  assert.equal(wear.length,1,'one swing wears the weapon once, even when two bodies are struck');
});

test('enemy melee can hit another enemy in the locked strike arc',()=>{
  const {combat,events,start}=fixture({position:{x:6,z:0}});
  start([foe('attacker',0,0),foe('other-enemy',0,1.5)]);
  const attacker=combat.state.enemies[0];attacker.action='attack';attacker.yaw=0;
  combat.update(.3);
  assert.equal(attacker.hp,100);assert.equal(combat.state.enemies[1].hp,83);
  const impact=events.find(event=>event.type==='melee-impact');
  assert.equal(impact.source,'enemy');assert.equal(impact.sourceId,'attacker');
  assert.deepEqual(impact.affectedIds,['other-enemy']);
});

test('allied melee physically strikes allies and the traveler, whose shield still protects him',()=>{
  const {combat,events,start}=fixture({position:{x:-.4,z:1.3},getMargins:()=>({hasShield:true,guardShare:.6,guardCost:18})});
  start([foe('enemy',0,1.8)],[friend('attacker',0,0),friend('other-ally',.5,1.2)]);
  const attacker=combat.state.allies[0];attacker.action='attack';attacker.yaw=0;
  combat.guard(true,Math.PI);combat.update(.25);
  const impact=events.find(event=>event.type==='melee-impact'&&event.source==='ally');
  assert.ok(impact);
  assert.equal(combat.state.enemies[0].hp,82);
  assert.equal(combat.state.allies[1].hp,82);
  assert.equal(combat.state.player.hp,93,'shield catches eleven of the allied eighteen damage');
  assert.equal(attacker.hp,100);
  assert.ok(events.some(event=>event.type==='caught'));
});

test('a slain ally falls once and does not declare victory over living opponents',()=>{
  const {combat,events,start}=fixture();
  start([foe('unhurt-enemy',8,8)],[friend('friend',0,1.5,{hp:4})]);
  combat.attack(0);combat.update(.3);
  assert.equal(combat.state.allies[0].hp,0);
  assert.equal(combat.state.phase,'active');
  assert.equal(events.filter(event=>event.type==='ally-down').length,1);
  assert.equal(events.some(event=>event.type==='victory'),false);
  assert.equal(events.find(event=>event.type==='melee-impact').hits[0].killed,true);
});

test('capturable allies are wounded by enemy strikes but killed by player friendly fire',()=>{
  for(const source of ['enemy','player']){
    const {combat,events,start}=fixture({position:source==='enemy'?{x:6,z:0}:{x:0,z:0}});
    start([foe('attacker',source==='enemy'?0:8,source==='enemy'?0:8)],
      [friend('captive',0,1.5,{hp:4,capturable:true,armed:false})]);
    const ally=combat.state.allies[0];
    assert.equal(ally.capturable,true,'the encounter preserves the authored capture policy');
    assert.equal(!!ally.spared,false,'capture does not grant unconditional protection');
    if(source==='enemy'){
      const attacker=combat.state.enemies[0];attacker.action='attack';attacker.yaw=0;
    }else assert.equal(combat.attack(0),true);
    combat.update(.3);
    const captured=source==='enemy';
    assert.equal(ally.hp,0);assert.equal(ally.active,false);
    assert.equal(!!ally.wounded,captured);
    assert.equal(events.filter(event=>event.type===(captured?'ally-wounded':'ally-down')).length,1);
    assert.equal(events.some(event=>event.type===(captured?'ally-down':'ally-wounded')),false);
    const impact=events.find(event=>event.type==='melee-impact'&&event.source===source);
    const hit=impact?.hits.find(one=>one.id==='captive');
    assert.ok(hit,'the physical blow reaches the host impact pipeline');
    assert.equal(!!hit.spared,captured,'only enemy capture suppresses a death in world NPC health');
  }
});

test('capture attribution also distinguishes hostile spells from friendly spells',()=>{
  for(const source of ['enemy','player','ally']){
    const {combat,events,start}=fixture();
    start([foe('enemy',8,8)],[friend('captive',0,1.5,{hp:4,capturable:true})]);
    const hit=combat.spellHit('captive',100,{source,sourceId:source==='player'?'traveler':source});
    assert.equal(hit.spared,source==='enemy');
    assert.equal(events.find(event=>['ally-wounded','ally-down'].includes(event.type))?.type,
      source==='enemy'?'ally-wounded':'ally-down');
  }
});

test('physical contacts exclude walls, rear targets, dead targets, aliases and the source',()=>{
  const impact={sourceId:'traveler',origin:{x:0,z:0},yaw:0,range:2.35,arc:Math.PI*.34};
  const target={id:'target',x:0,z:1.8,hp:100};
  assert.equal(meleeContact(impact,target,{colliders:[{x:0,z:1,hx:2,hz:.1,kind:'house'}]}),false);
  assert.equal(meleeContact(impact,{...target,z:-1}),false);
  assert.equal(meleeContact(impact,{...target,hp:0}),false);
  assert.equal(meleeContact(impact,{...target,dead:true}),false);
  assert.equal(meleeContact(impact,{...target,npcId:'traveler'}),false);
  assert.equal(meleeContacts(impact,[target,{...target,id:'second-rendering',npcId:'target'}]).length,1);
});

test('officers take less frontal damage than ordinary soldiers',()=>{
  const hpAfter=kind=>{
    const {combat,start}=fixture();start([foe('guard',0,1.8,{kind,entry:0,hp:420})]);
    combat.state.enemies[0].yaw=Math.PI;combat.attack(0);combat.update(.2);
    return combat.state.enemies[0].hp;
  };
  assert.ok(hpAfter('officer')>hpAfter('soldier'));
});
