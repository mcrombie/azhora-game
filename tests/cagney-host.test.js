import test from 'node:test';
import assert from 'node:assert/strict';
import { createCagneyHost } from '../src/content/quests/cagney/cagney-host.js';
import { createCagneyQuest, CAGNEY, CAGNEY_AMBUSH, CAGNAPPERS, CAGNEY_WAVES, CAGNEY_HEALTH } from '../src/content/quests/cagney/cagney-quest.js';
import { createCombat } from '../src/gameplay/combat/combat.js';

function fixture({realCombat=false,region='Drent',wave=1}={}){
  const quest=createCagneyQuest(),at={...CAGNEY_WAVES[wave].center};
  if(wave){const data=quest.snapshot();data.wave=wave;assert.ok(quest.restore(data));}
  const pos={...at,y:0,set(x,y,z){Object.assign(this,{x,y,z});}};
  const npc={id:CAGNEY.id,actor:{group:{position:pos}}},world={bounds:{minX:-2000,maxX:1000,minZ:-1000,maxZ:1000},colliders:[],heightAt:()=>1,regionAt:()=>({name:region}),npcPositions:{}},player={group:{position:{x:at.x+3,z:at.z}}};
  const events=[],created=[],combatEvents=[],combat=realCombat?createCombat({world,position:player.group.position,onEvent:e=>combatEvents.push(e)}):{state:{phase:'peaceful',encounterId:null,enemies:[],allies:[]},startEncounter(spec){
    this.state={phase:'active',encounterId:spec.id,enemies:spec.enemies.map(e=>({...e,hp:e.currentHp})),allies:spec.allies.map(e=>({...e,hp:e.currentHp}))};return true;}};
  let dialogue=null,down=false;
  const host=createCagneyHost({quest,npc,world,combat,player,crime:{isDown:()=>down},corpses:{ownsNpc:()=>false},toast:(...x)=>events.push(x),
    refresh(){},save(){},openDialogue(...args){dialogue=args;},closeDialogue(){},reward(){},focus(){},makeAmbusher(spec){
      const actor={group:{visible:true,rotation:{y:0},position:{set(x,y,z){Object.assign(this,{x,y,z});}}},animate(time,speed,grounded,pose){this.pose=pose;},setArmed(value){this.armed=value;},ambushCover:{visible:false}};created.push({id:spec.id,actor});return actor;}});
  function begin(){quest.accept();quest.rememberWalk({...quest.state.walk,...at});host.frame(.1,true);assert.equal(quest.state.stage,'ambushed');}
  return{quest,npc,world,combat,player,events,created,host,begin,flush(){for(const e of combatEvents.splice(0))host.combatEvent(e);},get dialogue(){return dialogue;},setDown:()=>{down=true;}};
}

test('Cagney explains the seer prophecy, and in the fight she fights back and is the one they came for',()=>{
  const f=fixture();f.host.conversation({id:CAGNEY.id});
  assert.match(f.dialogue[1].join(' '),/Caelom/);assert.match(f.dialogue[1].join(' '),/What the heck is a cagnapper/);
  f.dialogue[4].choices.find(c=>c.id==='cagney-accept').action();
  f.host.frame(.1,true);const ally=f.combat.state.allies[0];
  assert.equal(ally.kind,'villager');assert.equal(ally.capturable,undefined,'nobody takes her alive');assert.equal(ally.armed,true);
  assert.equal(ally.hp,CAGNEY_HEALTH);
  assert.ok(f.combat.state.enemies.every(e=>e.prey===CAGNEY.id),'every cagnapper is after her');
  assert.equal(ally.model.look.shirtRibbons,true);assert.equal(ally.model.look.glasses,true);assert.equal(ally.model.look.hat,false);
});

test('cagnappers visibly wait in the world and combat borrows the same actors without recreating a corpse',()=>{
  const f=fixture();f.host.update(0);assert.equal(f.created.filter(e=>CAGNAPPERS.some(c=>c.id===e.id)).length,3);
  const first=f.host.actor(CAGNAPPERS[0].id);assert.equal(first,f.created[0].actor);
  assert.equal(first.group.position.x,CAGNAPPERS[0].x);assert.equal(first.group.visible,true);
  f.begin();f.host.release(CAGNAPPERS[0].id);f.host.update(1);f.host.update(2);
  assert.equal(f.created.filter(e=>CAGNAPPERS.some(c=>c.id===e.id)).length,3,'The active fight owns appearances, including released corpse actors');
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
  assert.equal(f.created.filter(e=>CAGNAPPERS.some(c=>c.id===e.id)).length,3,'returning the survivors creates no replacement actors');
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
  assert.equal(f.created.filter(e=>CAGNAPPERS.some(c=>c.id===e.id)).length,3,'No attacker model is recreated after the failure');
  f.npc.hidden=false;f.host.frame(.1,true);assert.equal(f.npc.hidden,true,'Generic injury recovery cannot restore the failed escort');
});


test('a fresh Luscia ambush starts fully healthy and saves actual injuries as a fraction',()=>{
  const f=fixture({realCombat:true,region:'Luscia'});f.begin();
  const foes=f.combat.state.enemies;
  for(const foe of foes){assert.ok(foe.maxHp>48,'Luscia difficulty is preserved');assert.equal(foe.hp,foe.maxHp);}
  foes[0].hp=foes[0].maxHp/2;foes[1].hp=0;foes[1].active=false;
  f.host.remember();assert.deepEqual(f.quest.state.enemies,[24,0,48]);
  assert.equal(f.combat.disengage(),true);f.flush();f.host.frame(5,true);
  assert.equal(f.combat.state.phase,'active');
  assert.equal(f.combat.state.enemies.length,2,'Dead attackers do not return');
  assert.equal(f.combat.state.enemies[0].hp,f.combat.state.enemies[0].maxHp/2);
  assert.equal(f.combat.state.enemies[1].hp,f.combat.state.enemies[1].maxHp);
});

test('waiting cagnappers crouch under cover and the same actors uncover on every combat entry',()=>{
  const f=fixture();f.host.update(0);
  const actors=f.created.filter(e=>CAGNAPPERS.some(c=>c.id===e.id)).map(entry=>entry.actor);
  for(const actor of actors){assert.equal(actor.ambushCover.visible,true);assert.equal(actor.pose.sneaking,true);assert.equal(actor.armed,false);}
  f.begin();f.host.update(1);
  for(const actor of actors){assert.equal(actor.ambushCover.visible,false);assert.equal(actor.armed,true);}
  f.combat.state.phase='peaceful';f.host.combatEvent({type:'retreat'});f.host.update(2);
  for(const actor of actors)assert.equal(actor.ambushCover.visible,true);
  f.host.frame(5,true);f.host.update(3);
  for(const actor of actors)assert.equal(actor.ambushCover.visible,false,'A reused combat renderer still gets an uncovered actor');
  assert.equal(f.created.filter(e=>CAGNAPPERS.some(c=>c.id===e.id)).length,3);
});


test('each gang in turn: a beaten one is gone from the road, and the next waits in its own cover',()=>{
  const f=fixture({wave:0});f.host.update(0);
  const first=CAGNEY_WAVES[0].enemies.map(e=>f.host.actor(e.id));
  assert.ok(first.every(a=>a.group.visible),'the first gang waits');
  f.begin();assert.equal(f.combat.state.encounterId,CAGNEY_WAVES[0].id);
  assert.match(f.events.at(-1)[0],/make for Cagney/);
  f.combat.state.enemies.forEach(e=>e.hp=0);f.combat.state.allies[0].hp=31;
  f.combat.state.phase='victory';f.host.combatEvent({type:'victory'});
  assert.equal(f.quest.state.wave,1);assert.equal(f.quest.state.stage,'escorting');
  assert.equal(f.quest.state.hp,CAGNEY_HEALTH,'she binds her cuts');
  assert.match(f.events.at(-1)[0],/Two more are waiting/);
  f.host.update(1);assert.ok(first.every(a=>!a.group.visible),'the beaten gang is gone');
  // On to the next: the old gang's ground no longer starts anything.
  f.host.frame(5,true);assert.equal(f.quest.state.stage,'escorting');
  const next=CAGNEY_WAVES[1].center;
  f.npc.actor.group.position.set(next.x,1,next.z);Object.assign(f.player.group.position,{x:next.x+3,z:next.z});
  f.host.frame(.1,true);
  assert.equal(f.combat.state.encounterId,CAGNEY_WAVES[1].id,'the next gang springs its own ambush');
  assert.deepEqual(f.combat.state.enemies.map(e=>e.id),CAGNEY_WAVES[1].enemies.map(e=>e.id));
});

test('the last gang beaten clears the road',()=>{
  const f=fixture({wave:2});f.begin();
  assert.equal(f.combat.state.encounterId,CAGNEY_WAVES[2].id);
  f.combat.state.enemies.forEach(e=>e.hp=0);f.combat.state.phase='victory';f.host.combatEvent({type:'victory'});
  assert.equal(f.quest.state.ambushCleared,true);assert.match(f.events.at(-1)[0],/last of the cagnappers/);
  f.host.frame(5,true);assert.equal(f.combat.state.phase,'victory','nobody is left to spring anything');
});

/** Real combat, with the gang at the middle ambush in Luscia and nobody helping her. */
function realFight({helping=false}={}){
  const f=fixture({realCombat:true,region:'Luscia'});
  f.begin();
  const her=f.combat.state.allies[0];
  if(!helping)Object.assign(f.player.group.position,{x:her.x+10,z:her.z});
  return {f,her};
}

test('the cagnappers go for Cagney, not the traveler, and she fights back',()=>{
  const {f,her}=realFight();
  const spots=f.combat.state.enemies.map(e=>({x:e.x,z:e.z})),unhurt=f.combat.state.player.hp;
  // They break from cover one after another: a second in, only the first is on his way.
  for(let i=0;i<60;i++)f.combat.update(1/60);
  const moved=f.combat.state.enemies.map((e,i)=>Math.hypot(e.x-spots[i].x,e.z-spots[i].z)>.2);
  assert.deepEqual(moved,[true,false,false],'the first breaks cover first');
  // Each of them comes to her, whoever is standing nearer.
  const closest=f.combat.state.enemies.map(()=>Infinity);let struck=false;
  for(let i=0;i<60*20&&her.hp>0;i++){
    f.combat.update(1/60);
    f.combat.state.enemies.forEach((e,j)=>{closest[j]=Math.min(closest[j],Math.hypot(e.x-her.x,e.z-her.z));});
    if(f.combat.state.enemies.some(e=>e.hp<e.maxHp))struck=true;
  }
  f.combat.state.enemies.forEach((e,i)=>assert.ok(closest[i]<3,`${e.id} came to her`));
  assert.equal(f.combat.state.player.hp,unhurt,'nobody touched the traveler');
  assert.ok(struck,'she landed something');
  assert.equal(her.hp,0,'without the traveler she does not survive them');
  assert.ok(!her.wounded,'and she is killed, not carried off');
  f.flush();
  assert.equal(f.quest.state.stage,'dead');assert.equal(f.npc.hidden,true);
});

test('a cagnapper the traveler strikes turns on him for a while',()=>{
  const {f,her}=realFight({helping:true}),foe=f.combat.state.enemies[0],p=f.player.group.position;
  // Put him between the two of them, a sword's reach from the traveler.
  Object.assign(her,{x:p.x-9,z:p.z});Object.assign(foe,{x:p.x-1.4,z:p.z});
  for(const other of f.combat.state.enemies.slice(1))Object.assign(other,{x:her.x-6,z:her.z+(other===f.combat.state.enemies[1]?4:-4)});
  const bearing=Math.atan2(foe.x-p.x,foe.z-p.z);
  assert.ok(f.combat.attack(bearing));
  const hp=foe.hp;
  for(let i=0;i<40;i++)f.combat.update(1/60);
  assert.ok(foe.hp<hp,'the blow lands');
  for(let i=0;i<60;i++)f.combat.update(1/60);
  assert.ok(Math.hypot(foe.x-p.x,foe.z-p.z)<3,'struck, he stays on the traveler');
  // Unprovoked, the same man walks straight past the traveler for her.
  const {f:g,her:her2}=realFight({helping:true}),foe2=g.combat.state.enemies[0],q=g.player.group.position;
  Object.assign(her2,{x:q.x-9,z:q.z});Object.assign(foe2,{x:q.x-1.4,z:q.z});
  for(const other of g.combat.state.enemies.slice(1))Object.assign(other,{x:her2.x-6,z:her2.z+(other===g.combat.state.enemies[1]?4:-4)});
  for(let i=0;i<120;i++)g.combat.update(1/60);
  assert.ok(Math.hypot(foe2.x-q.x,foe2.z-q.z)>3,'left alone, he goes for her');
});


test('every relocated roadside gang can start through the real combat validator',()=>{
  for(const wave of CAGNEY_WAVES){
    const f=fixture({realCombat:true,region:'Elagos',wave:wave.index});
    // Reproduce the guide holding nine metres short of the next gang. Road
    // bends can point either way along the arena axis, including toward +Z.
    const waiting={x:wave.center.x-wave.forward.dx*9,z:wave.center.z-wave.forward.dz*9};
    f.npc.actor.group.position.set(waiting.x,1,waiting.z);
    Object.assign(f.player.group.position,{x:waiting.x+2,z:waiting.z});
    f.quest.accept();f.quest.rememberWalk({...f.quest.state.walk,...waiting,waypoint:wave.waypoint});
    f.host.frame(.1,true);
    assert.equal(f.combat.state.phase,'active',`${wave.id} accepts the road's retreat direction`);
    assert.equal(f.combat.state.encounterId,wave.id);
    assert.equal(f.quest.state.stage,'ambushed');
    assert.equal(f.combat.state.enemies.length,3);
    assert.ok(f.combat.state.enemies.every(e=>e.hp===e.maxHp),'fresh attackers have full health');
  }
});
