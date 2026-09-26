import test from 'node:test';
import assert from 'node:assert/strict';
import { createMagic, validateMagicSnapshot } from '../src/magic.js';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { createCombat } from '../src/combat.js';
import { createSkills } from '../src/skills.js';
import { createWeapons } from '../src/weapons.js';
import { createInventoryState } from '../src/inventory.js';
import { createSpiderQuest, SPIDER_DEN } from '../src/spider-quest.js';
import { createCatQuest, createMopWalk, CAT, LIZ_STAND } from '../src/cat-quest.js';
import { createMurderQuest, WITNESS_IDS, MURDERER, MURDERER_READING } from '../src/murder-quest.js';
const { createMagicView } = await sourceModule('../src/magic-view.js');

function fixture({enemies=[],allies=[],bodies=[],colliders=[],getCastOrigin}={}) {
  const world={bounds:{minX:-2000,maxX:2000,minZ:-2000,maxZ:2000},colliders,heightAt:()=>1.5};
  const position={x:0,y:1.5,z:0,yaw:0},events=[],combatEvents=[];
  const inventory=createInventoryState();inventory.add('simple-sword');
  const weapons=createWeapons({inventory}),skills=createSkills();
  const combat=createCombat({world,position,getWeapon:()=>weapons.profile(),onEvent:event=>combatEvents.push(event)});
  if(enemies.length)combat.startEncounter({id:'magic-test',center:{x:0,z:4},checkpoint:{x:0,z:0},retreatLine:100,level:0,enemies,allies});
  const magic=createMagic({world,position,inventory,weapons,skills,combat,getCastOrigin,getBodies:()=>bodies,onEvent:event=>events.push(event),
    damageWorld:(target,damage)=>{const actual=bodies.find(body=>body.id===target.id);const dealt=Math.min(actual.hp,damage);actual.hp-=dealt;return{damage:dealt,hp:actual.hp,maxHp:actual.maxHp,dead:actual.hp<=0};}});
  const run=(seconds,withCombat=false)=>{for(let t=0;t<seconds;t+=1/120){if(withCombat)combat.update(1/120);magic.update(1/120);}};
  return{world,position,inventory,weapons,skills,combat,magic,events,combatEvents,bodies,run};
}
const takeLesson=(quest,id,game,options)=>{assert.equal(quest.take('lesson').stage,'taught');assert.equal(game.magic.learn(id,options).ok,true);};

test('Ben can be helped in an actual fight; the earned fireball then damages a target and survives save/load',()=>{
  const game=fixture();const quest=createSpiderQuest();quest.ask();quest.accept();quest.begin();
  const encounter={...SPIDER_DEN,level:1};game.position.x=encounter.center.x;game.position.z=encounter.center.z;
  game.combat.startEncounter(encounter);
  // The traveler helps at the den with ordinary sword contacts, rather than setting a win flag.
  for(let i=0;i<6000&&game.combat.state.phase==='active';i++){
    const enemy=game.combat.state.enemies.find(actor=>actor.active);if(!enemy)break;
    if(game.combat.state.player.action!=='dodge'){game.position.x=enemy.x;game.position.z=enemy.z+1.6;}
    if(enemy.action==='windup'&&enemy.progress>.88)game.combat.dodge({x:1,z:0});
    else if(enemy.action==='idle'&&game.combat.state.player.action==='idle')game.combat.attack(Math.PI);
    game.combat.update(1/60);
  }
  assert.equal(game.combat.state.phase,'won');
  assert.equal(quest.settle({spiderDead:game.combat.state.enemies.every(actor=>actor.hp<=0),benAlive:game.combat.state.allies.some(actor=>actor.id==='ben-sorcerer'&&actor.hp>0)}),true);
  assert.equal(quest.state.stage,'killed');takeLesson(quest,'fireball',game,{equip:false,grantWand:true});
  assert.equal(game.inventory.has('wand'),true);assert.equal(game.weapons.equippedId,'simple-sword');
  assert.equal(game.magic.cast().ok,false);assert.equal(game.weapons.equip('wand'),true);
  game.position.x=0;game.position.z=0;
  game.combat.startEncounter({id:'spell-target',level:0,center:{x:0,z:8},checkpoint:{x:0,z:0},retreatLine:100,enemies:[{id:'target',x:0,z:8,hp:100,entry:60}]});
  assert.equal(game.magic.cast('fireball',{yaw:0}).ok,true);game.run(2);
  assert.equal(game.combat.state.enemies[0].hp,74);assert.equal(game.skills.xp('fire'),21);
  const save={quest:quest.snapshot(),magic:game.magic.snapshot(),inventory:game.inventory.items().map(id=>({id,quantity:game.inventory.count(id)})),weapons:game.weapons.snapshot(),skills:game.skills.snapshot()};
  const loaded=fixture();for(const item of save.inventory)if(!loaded.inventory.has(item.id))loaded.inventory.add(item.id,item.quantity);
  assert.equal(loaded.weapons.restore(save.weapons),true);assert.equal(loaded.skills.restore(save.skills),true);assert.equal(loaded.magic.restore(save.magic),true);
  const restoredQuest=createSpiderQuest();assert.equal(restoredQuest.restore(save.quest),true);
  assert.equal(loaded.magic.known('fireball'),true);assert.equal(loaded.magic.cast('fireball',{yaw:0}).ok,true);
});

test('Olive really walks back to Liz and the bees lesson attacks hostile targets, not friends',()=>{
  const game=fixture({enemies:[{id:'goblin',x:0,z:5,hp:100,entry:60}],allies:[{id:'friend',kind:'legionary',x:1,z:3,hp:90}]});
  const quest=createCatQuest(),walk=createMopWalk({random:()=>.5});quest.ask();quest.accept();
  let traveler={x:CAT.at.x+1.5,z:CAT.at.z},cat={x:CAT.at.x,z:CAT.at.z},arrived=false;
  for(let i=0;i<1800&&!arrived;i++){
    walk.place(cat.x,cat.z);const remaining=Math.hypot(LIZ_STAND.x-traveler.x,LIZ_STAND.z-traveler.z);
    const moving=quest.state.stage==='following'&&remaining>0.1;
    if(moving){const step=Math.min(remaining,.2);traveler.x+=(LIZ_STAND.x-traveler.x)/remaining*step;traveler.z+=(LIZ_STAND.z-traveler.z)/remaining*step;}
    const result=walk.update(.1,{player:traveler,speed:moving?2:0,home:LIZ_STAND});cat={x:result.x,z:result.z};
    if(result.following)quest.found();if(result.home){arrived=quest.home();}
  }
  assert.equal(arrived,true);assert.ok(Math.hypot(cat.x-LIZ_STAND.x,cat.z-LIZ_STAND.z)<=CAT.home);
  takeLesson(quest,'summon-bees',game);assert.equal(game.magic.cast('summon-bees').ok,true);game.run(7.5);
  assert.ok(game.combat.state.enemies[0].hp<100);assert.equal(game.combat.state.allies[0].hp,90);
  assert.ok(game.skills.xp('beast')>0);assert.ok(game.magic.view().swarms.length<=1);
});

test('Troy requires the evidence; money does not foreclose the reading and an actual read pays Mind once',()=>{
  const person={id:MURDERER,name:'Torven Oss',x:0,z:2,hp:100,maxHp:100};const game=fixture({bodies:[person]});
  const quest=createMurderQuest();quest.begin();assert.equal(quest.accuse(MURDERER,0).ok,false);
  for(const witness of WITNESS_IDS)assert.ok(quest.hear(witness));
  assert.equal(quest.accuse(MURDERER,181).ok,true);assert.equal(quest.take('purse').stage,'paid');
  takeLesson(quest,'mindread',game);assert.equal(quest.take('purse'),null);
  const reading=game.magic.cast('mindread',{target:person});assert.equal(reading.ok,true);assert.equal(reading.text,MURDERER_READING);
  assert.equal(game.skills.xp('mind'),34);assert.equal(game.magic.view().focus,35);
  assert.equal(game.magic.cast('mindread',{target:person}).ok,true);assert.equal(game.skills.xp('mind'),34);
  const save=game.magic.snapshot();assert.equal(validateMagicSnapshot(save),true);
  const reloaded=fixture({bodies:[person]});reloaded.inventory.add('wand');reloaded.weapons.equip('wand');reloaded.skills.restore(game.skills.snapshot());
  assert.equal(reloaded.magic.restore(save),true);reloaded.run(30);
  assert.equal(reloaded.magic.cast('mindread',{target:person}).first,false);assert.equal(reloaded.skills.xp('mind'),34);
});

test('a level-one school is not a learned spell; equipment, focus, walls and actual range matter',()=>{
  const target={id:'villager',x:0,z:6,hp:100,maxHp:100};const game=fixture({bodies:[target],colliders:[{kind:'wall',x:0,z:3,hx:2,hz:.18}]});
  assert.equal(game.skills.known('fire'),true);assert.equal(game.magic.cast('fireball').ok,false);
  game.magic.learn('fireball');game.weapons.equip('simple-sword');assert.equal(game.magic.cast('fireball').ok,false);
  game.weapons.equip('wand');assert.equal(game.magic.cast('fireball').ok,true);game.run(2);assert.equal(target.hp,100);
  game.world.colliders.length=0;game.magic.cast('fireball');game.run(2);assert.equal(target.hp,74);
  assert.equal(game.events.filter(event=>event.type==='spell-impact').length,1);
  game.magic.learn('mindread');target.z=5;assert.equal(game.magic.cast('mindread',{target}).ok,false);
  const saved=game.magic.snapshot();assert.equal(game.magic.restore({...saved,focus:0}),true);
  assert.equal(game.magic.cast('fireball').ok,false);game.combat.state.phase='active';game.run(10);assert.equal(game.magic.view().focus,0);
  game.combat.state.phase='peaceful';game.run(10);assert.ok(game.magic.view().focus>19.9);
  assert.equal(game.magic.restore({...saved,learned:['made-up-spell']}),false);
});

test('one fireball hits the first physical body only, including allies, and can kill through combat lifecycle',()=>{
  const game=fixture({enemies:[{id:'enemy',x:0,z:6,hp:20,entry:60}],allies:[{id:'friend',kind:'legionary',x:0,z:3,hp:90}]});
  game.magic.learn('fireball');game.magic.cast('fireball');game.run(2);
  assert.ok(game.combat.state.allies[0].hp<90);assert.equal(game.combat.state.enemies[0].hp,20);
  game.combat.state.allies[0].x=4;game.magic.cast('fireball');game.run(2);
  assert.equal(game.combat.state.enemies[0].hp,0);assert.equal(game.combat.state.phase,'won');
  assert.equal(game.combatEvents.filter(event=>event.type==='enemy-defeated').length,1);
});

test('after victory, spells find surviving people at their current world position instead of a stale combat copy',()=>{
  const friend={id:'friend',name:'A surviving friend',x:10,z:12,hp:90,maxHp:90};
  const game=fixture({enemies:[{id:'enemy',x:0,z:6,hp:20,entry:60}],allies:[{id:'friend',kind:'legionary',x:0,z:3,hp:90}],bodies:[friend]});
  game.combat.spellHit('enemy',100,{spellId:'fireball'});assert.equal(game.combat.state.phase,'won');
  game.position.x=10;game.position.z=10;
  game.magic.learn('mindread');assert.equal(game.magic.cast('mindread',{target:friend}).ok,true);
  game.magic.learn('fireball');assert.equal(game.magic.cast('fireball',{yaw:0}).ok,true);game.run(2);
  assert.equal(friend.hp,64,'the visible world NPC receives one fireball');
  assert.equal(game.combat.state.allies[0].hp,90,'the completed encounter roster is historical');
  assert.equal(game.events.filter(event=>event.type==='spell-impact').length,1);
  assert.equal(game.events.find(event=>event.type==='spell-impact').managed,false);
});

test('Ben supplies a wand in the satchel without changing equipment, even when a staff is owned',()=>{
  const game=fixture();game.inventory.add('oak-staff');
  const lesson=game.magic.learn('fireball',{equip:false,grantWand:true});
  assert.equal(lesson.granted,true);assert.equal(game.inventory.has('wand'),true);
  assert.equal(game.weapons.equippedId,'simple-sword');
  assert.equal(game.magic.readiness().code,'equipment');
  assert.equal(game.magic.cast().ok,false);
  assert.equal(game.weapons.equip('wand'),true);
  assert.equal(game.magic.readiness().ok,true);assert.equal(game.magic.cast().ok,true);
  game.magic.stop();game.weapons.setCondition('wand',0);game.weapons.setCondition('oak-staff',0);
  const repeated=game.magic.learn('fireball',{equip:false,grantWand:true});
  assert.equal(repeated.first,false);assert.equal(repeated.granted,false);
  assert.equal(game.inventory.count('wand'),1);assert.equal(game.weapons.status('wand').durability,0);
  assert.equal(game.magic.readiness().code,'broken','a repeated lesson cannot repair an owned wand');
  assert.equal(game.events.filter(event=>event.type==='spell-learned').length,1);
});

test('casting readiness follows real actions, equipment and focus without spending focus on a rejected cast',()=>{
  const game=fixture();assert.equal(game.magic.readiness('fireball').code,'unlearned');
  game.magic.learn('fireball',{equip:false});
  const untouched=game.magic.snapshot();
  assert.equal(game.magic.cast().code,'equipment');assert.deepEqual(game.magic.snapshot(),untouched);
  game.weapons.equip('wand');assert.equal(game.magic.view().readiness.cost,20);
  game.combat.setWeaponReady(true);assert.equal(game.combat.attack(0),true);assert.equal(game.magic.readiness().code,'busy');
  assert.equal(game.magic.cast().code,'busy');assert.equal(game.magic.view().focus,60);
  game.combat.update(1);assert.equal(game.magic.cast().ok,true);
  assert.equal(game.magic.readiness().code,'casting');assert.equal(game.magic.view().focus,40);
  game.magic.stop();game.magic.restore({...game.magic.snapshot(),focus:0});
  assert.equal(game.magic.readiness().code,'focus');assert.equal(game.magic.cast().ok,false);
  game.combat.state.phase='active';game.run(10);assert.equal(game.magic.readiness().code,'focus');
  game.combat.state.phase='peaceful';game.run(10.1);assert.equal(game.magic.readiness().ok,true);
});

test('an earned fireball renders at its traveling world position and disappears only after impact',()=>{
  const target={id:'target',x:0,z:10,hp:100,maxHp:100};const game=fixture({bodies:[target]});
  const scene=new THREE.Scene(),view=createMagicView({scene,magic:game.magic});
  try {
    game.magic.learn('fireball',{equip:false,grantWand:true});game.weapons.equip('wand');
    assert.equal(game.magic.cast().ok,true);game.run(1.25);view.update(1.25);
    const ball=game.magic.view().projectiles[0];assert.ok(ball,'a cast produces a traveling projectile before damage');
    const meshes=[];scene.traverse(node=>{if(node.isMesh&&node.visible)meshes.push(node);});
    assert.equal(meshes.length,1);const visible=meshes[0];
    assert.deepEqual(visible.position.toArray(),[ball.x,ball.y,ball.z]);
    assert.ok(visible.position.y>game.world.heightAt(ball.x,ball.z),'fire is above the terrain');
    const before=visible.position.z;assert.equal(target.hp,100);
    game.run(.2);view.update(.2);assert.ok(visible.position.z>before,'the visible effect follows the actual projectile');
    game.run(.5);view.update(.5);
    assert.equal(target.hp,74);assert.equal(visible.parent,null,'the spent effect leaves the scene after real damage');
    assert.equal(game.events.filter(event=>event.type==='spell-impact').length,1);
  } finally {view.dispose();}
});


test('Fireball lifts the equipped hand, releases from its current world tip, then recovers',async()=>{
  const {createCharacter}=await sourceModule('../src/characters.js');
  const actor=createCharacter(),parent=new THREE.Group();parent.add(actor.group);
  parent.position.set(12,3,-8);parent.rotation.y=.7;parent.scale.setScalar(1.1);
  let samples=0,releaseTip;
  const game=fixture({getCastOrigin:spellCast=>{
    samples++;assert.equal(spellCast.progress,.5);assert.equal(spellCast.weaponId,'wand');
    actor.animate(2,0,true,{armed:true,spellCast});
    releaseTip=actor.focusTip().clone();return releaseTip;
  }});
  game.magic.learn('fireball');actor.setWeapon('wand');
  const point=actor.group.getWorldPosition(new THREE.Vector3());Object.assign(game.position,point);
  assert.equal(game.magic.cast('fireball',{yaw:.7}).ok,true);
  const duration=game.magic.view().remaining;
  game.magic.update(duration*.8);
  assert.equal(samples,0,'the tip is sampled when released, not when the button is pressed');
  assert.ok(Math.abs(game.magic.pose().progress-.4)<1e-8);
  assert.equal(game.magic.view().projectiles.length,0,'raising the wand does not launch early');
  // The traveler can keep moving during the windup; origin must follow the hand.
  parent.position.x+=1;game.position.x+=1;
  game.magic.update(duration*.2+.001);
  const ball=game.magic.view().projectiles[0];assert.ok(ball);assert.equal(samples,1);
  assert.deepEqual(ball.origin,{x:releaseTip.x,y:releaseTip.y,z:releaseTip.z});
  assert.ok(Math.hypot(ball.origin.x-game.position.x,ball.origin.z-game.position.z)>.5,'release is ahead at the wand, not in the torso');
  assert.equal(ball.y,releaseTip.y);
  assert.ok(game.magic.pose().progress>=.5&&game.magic.pose().progress<.55);
  assert.deepEqual(game.events.find(e=>e.type==='spell-released').origin,ball.origin);
  game.magic.update(.16);assert.ok(game.magic.pose().progress>.7);
  game.magic.update(.2);assert.equal(game.magic.pose(),null,'follow-through ends without leaving the arm raised');
});

test('interruption, equipment changes and checkpoint restoration clear the casting gesture',()=>{
  for(const interrupt of ['hurt','dodge','attack','equipment','broken','stop','restore','death']){
    const game=fixture();game.magic.learn('fireball');game.magic.cast();game.magic.update(.5);
    assert.ok(game.magic.pose());
    if(interrupt==='equipment')game.weapons.equip('simple-sword');
    else if(interrupt==='broken')game.weapons.setCondition('wand',0);
    else if(interrupt==='stop')game.magic.stop();
    else if(interrupt==='restore')game.magic.restore(game.magic.snapshot());
    else if(interrupt==='death')game.combat.state.player.hp=0;
    else game.combat.state.player.action=interrupt;
    game.magic.update(1);
    assert.equal(game.magic.pose(),null,interrupt);assert.equal(game.magic.view().projectiles.length,0,interrupt);
    assert.equal(game.events.some(e=>e.type==='spell-released'),false,interrupt);
  }
});

test('a focus tip reaching through a wall cannot launch a fireball beyond it',()=>{
  const game=fixture({colliders:[{x:0,z:.5,r:.2}],getCastOrigin:()=>({x:0,y:2.7,z:1})});
  game.magic.learn('fireball');game.magic.cast();game.magic.update(1.2);
  assert.equal(game.magic.view().projectiles.length,0);
  assert.equal(game.events.filter(e=>e.type==='spell-stopped').length,1);
});
