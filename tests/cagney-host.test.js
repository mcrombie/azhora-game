import test from 'node:test';
import assert from 'node:assert/strict';
import { createCagneyHost } from '../src/cagney-host.js';
import { createCagneyQuest, CAGNEY, CAGNEY_AMBUSH, CAGNAPPERS } from '../src/cagney-quest.js';
import { createCombat } from '../src/combat.js';

function fixture({realCombat=false}={}){
  const quest=createCagneyQuest(),at={...CAGNEY_AMBUSH.center},pos={...at,y:0,set(x,y,z){Object.assign(this,{x,y,z});}};
  const npc={id:CAGNEY.id,actor:{group:{position:pos}}},world={bounds:{minX:-2000,maxX:1000,minZ:-1000,maxZ:1000},colliders:[],heightAt:()=>1,npcPositions:{}},player={group:{position:{x:at.x+3,z:at.z}}};
  const events=[],created=[],combatEvents=[],combat=realCombat?createCombat({world,position:player.group.position,onEvent:e=>combatEvents.push(e)}):{state:{phase:'peaceful',encounterId:null,enemies:[],allies:[]},startEncounter(spec){
    this.state={phase:'active',encounterId:spec.id,enemies:spec.enemies.map(e=>({...e,hp:e.currentHp})),allies:spec.allies.map(e=>({...e,hp:e.currentHp}))};return true;}};
  let dialogue=null,down=false;
  const host=createCagneyHost({quest,npc,world,combat,player,crime:{isDown:()=>down},corpses:{ownsNpc:()=>false},toast:(...x)=>events.push(x),
    refresh(){},save(){},openDialogue(...args){dialogue=args;},closeDialogue(){},reward(){},focus(){},makeAmbusher(spec){
      const actor={group:{visible:true,rotation:{y:0},position:{set(x,y,z){Object.assign(this,{x,y,z});}}},animate(){}};created.push({id:spec.id,actor});return actor;}});
  function begin(){quest.accept();quest.rememberWalk({...quest.state.walk,...at});host.frame(.1,true);assert.equal(quest.state.stage,'ambushed');}
  return{quest,npc,world,combat,player,events,created,host,begin,flush(){for(const e of combatEvents.splice(0))host.combatEvent(e);},get dialogue(){return dialogue;},setDown:()=>{down=true;}};
}

test('Cagney explains the seer prophecy and chooses an ordinary unarmed escort',()=>{
  const f=fixture();f.host.conversation({id:CAGNEY.id});
  assert.match(f.dialogue[1].join(' '),/Caelom/);assert.match(f.dialogue[1].join(' '),/What the heck is a cagnapper/);
  f.dialogue[4].choices.find(c=>c.id==='cagney-accept').action();
  f.host.frame(.1,true);const ally=f.combat.state.allies[0];
  assert.equal(ally.kind,'bystander');assert.equal(ally.capturable,true);assert.equal(ally.armed,false);
  assert.equal(ally.model.look.shirtRibbons,true);assert.equal(ally.model.look.glasses,true);assert.equal(ally.model.look.hat,false);
});

test('cagnappers visibly wait in the world and combat borrows the same actors without recreating a corpse',()=>{
  const f=fixture();f.host.update(0);assert.equal(f.created.length,3);
  const first=f.host.actor(CAGNAPPERS[0].id);assert.equal(first,f.created[0].actor);
  assert.equal(first.group.position.x,CAGNAPPERS[0].x);assert.equal(first.group.visible,true);
  f.begin();f.host.release(CAGNAPPERS[0].id);f.host.update(1);f.host.update(2);
  assert.equal(f.created.length,3,'The active fight owns appearances, including released corpse actors');
  assert.equal(f.host.actor('unrelated-enemy'),null);
});

test('Cagney capture or death immediately fails the quest before the fight ends',()=>{
  for(const wounded of [true,false]){
    const f=fixture();f.begin();f.combat.state.allies[0].hp=0;f.combat.state.allies[0].wounded=wounded;
    f.host.combatEvent({type:wounded?'ally-wounded':'ally-down',id:CAGNEY.id});
    assert.equal(f.quest.state.stage,wounded?'captured':'dead');assert.equal(f.npc.hidden,true);
    assert.equal(f.combat.state.phase,'active');f.setDown();f.host.frame(.1,true);
    assert.equal(f.quest.state.stage,wounded?'captured':'dead','Crime/body ownership does not turn capture into death');
  }
});

test('retreat remembers Cagney and cagnapper health without resurrecting defeated attackers',()=>{
  const f=fixture();f.begin();f.combat.state.allies[0].hp=46;
  f.combat.state.enemies.forEach((e,i)=>e.hp=[0,13,37][i]);
  f.combat.state.phase='peaceful';f.host.combatEvent({type:'retreat'});
  assert.equal(f.quest.state.stage,'escorting');assert.equal(f.quest.state.hp,46);assert.deepEqual(f.quest.state.enemies,[0,13,37]);
  f.host.frame(5,true);assert.equal(f.quest.state.stage,'ambushed');
  assert.deepEqual(f.combat.state.enemies.map(e=>e.hp),[13,37]);assert.equal(f.combat.state.allies[0].hp,46);
});

test('chased survivors walk back into valid spawn bounds before a real combat retry',()=>{
  const f=fixture({realCombat:true});f.host.update(0);f.begin();
  const foes=f.combat.state.enemies,ally=f.combat.state.allies[0];
  foes[0].hp=0;foes[0].active=false;
  Object.assign(foes[1],{hp:13,x:CAGNEY_AMBUSH.center.x+20,z:CAGNEY_AMBUSH.center.z+6});
  Object.assign(foes[2],{hp:37,x:CAGNEY_AMBUSH.center.x+22,z:CAGNEY_AMBUSH.center.z-4});
  Object.assign(ally,{hp:46,x:CAGNEY_AMBUSH.center.x+18,z:CAGNEY_AMBUSH.center.z});
  f.npc.actor.group.position.set(ally.x,1,ally.z);
  f.player.group.position.x=ally.x+3;
  assert.equal(f.combat.disengage(),true);f.flush();f.host.update(0);
  const bodies=CAGNAPPERS.slice(1).map(e=>f.host.actor(e.id));
  for(let frame=0;frame<150;frame++){
    const before=bodies.map(actor=>({...actor.group.position}));
    f.host.frame(.1,true);f.host.update((frame+1)*.1);
    for(let i=0;i<bodies.length;i++)assert.ok(Math.hypot(bodies[i].group.position.x-before[i].x,bodies[i].group.position.z-before[i].z)<=.281,'returning survivors walk instead of teleporting');
  }
  assert.equal(f.combat.state.phase,'peaceful','Cagney has not yet reached the retry approach');
  assert.equal(f.quest.state.stage,'escorting');
  assert.ok(Math.hypot(f.world.npcPositions.cagney.x-CAGNEY_AMBUSH.center.x,f.world.npcPositions.cagney.z-CAGNEY_AMBUSH.center.z)<12,'she is directed back to the ambush instead of bypassing it');
  f.npc.actor.group.position.set(f.world.npcPositions.cagney.x,1,f.world.npcPositions.cagney.z);
  f.player.group.position.x=f.npc.actor.group.position.x+3;
  f.host.frame(.1,true);
  assert.equal(f.combat.state.phase,'active','the real encounter validator accepts the returned positions');
  assert.equal(f.quest.state.stage,'ambushed');
  assert.deepEqual(f.combat.state.enemies.map(e=>e.hp),[13,37]);
  assert.equal(f.combat.state.allies[0].hp,46);
  assert.equal(f.created.length,3,'returning the survivors creates no replacement actors');
  assert.equal(f.created[0].actor.group.visible,false,'the defeated cagnapper stays absent');
});

test('a restored escort beyond an uncleared ambush is guided back rather than stranded at home',()=>{
  const f=fixture(),saved=f.quest.snapshot();
  saved.stage='escorting';saved.walk={x:CAGNEY_AMBUSH.center.x-30,z:CAGNEY_AMBUSH.center.z,waypoint:8,waiting:false};
  assert.ok(f.quest.restore(saved));f.host.restore();
  Object.assign(f.player.group.position,{x:saved.walk.x+3,z:saved.walk.z});
  f.host.frame(3,true);
  assert.equal(f.quest.state.stage,'escorting');
  assert.ok(Math.hypot(f.world.npcPositions.cagney.x-CAGNEY_AMBUSH.center.x,f.world.npcPositions.cagney.z-CAGNEY_AMBUSH.center.z)<12);
});

test('Cagney waits for a distant player and stops moving while gameplay is paused',()=>{
  const f=fixture();f.quest.accept();f.player.group.position.x+=30;f.host.frame(.1,true);
  assert.equal(f.quest.state.walk.waiting,true);assert.equal(f.world.npcPositions.cagney.x,f.npc.actor.group.position.x);
  const before=f.quest.snapshot();f.player.group.position.x-=30;f.host.frame(10,false);
  assert.deepEqual(f.quest.snapshot(),before);
});


test('an active fight checkpoint remembers partial wounds and dead attackers before settling',()=>{
  const f=fixture();f.begin();f.combat.state.allies[0].hp=29;
  f.combat.state.enemies.forEach((e,i)=>e.hp=[0,11,35][i]);f.host.remember();
  const saved=f.quest.snapshot();assert.equal(saved.stage,'ambushed');assert.equal(saved.hp,29);assert.deepEqual(saved.enemies,[0,11,35]);
  const loaded=createCagneyQuest();assert.ok(loaded.restore(saved));assert.equal(loaded.state.stage,'escorting');
  assert.equal(loaded.state.hp,29);assert.deepEqual(loaded.state.enemies,[0,11,35]);
});


test('cagnappers killed after Cagney is captured remain dead and the failed quest stays failed',()=>{
  const f=fixture();f.host.update(0);f.begin();const ally=f.combat.state.allies[0];ally.hp=0;ally.wounded=true;
  f.host.combatEvent({type:'ally-wounded',id:CAGNEY.id});assert.equal(f.quest.state.stage,'captured');
  for(const foe of f.combat.state.enemies){foe.hp=0;f.host.release(foe.id);f.host.combatEvent({type:'enemy-defeated',id:foe.id});}
  f.combat.state.phase='victory';f.host.combatEvent({type:'victory'});f.host.update(10);
  assert.deepEqual(f.quest.state.enemies,[0,0,0]);assert.equal(f.quest.state.stage,'captured');assert.equal(f.quest.take(),0);
  assert.equal(f.created.length,3,'No attacker model is recreated after the failure');
  f.npc.hidden=false;f.host.frame(.1,true);assert.equal(f.npc.hidden,true,'Generic injury recovery cannot restore the failed escort');
});
