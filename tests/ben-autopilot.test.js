import test from 'node:test';
import assert from 'node:assert/strict';
import { createBenAutopilot, benFightCommand } from '../src/ben-autopilot.js';
import { BEN, SPIDER_DEN, createSpiderQuest } from '../src/spider-quest.js';
import { BEN_GUIDE_START, BEN_GUIDE_PACE, benGuideTarget } from '../src/ben-guide.js';
import { BODY, bodyWorld, stepToward } from '../src/bodies.js';
import { moveCharacter } from '../src/game-state.js';
import { createCombat } from '../src/combat.js';
import { createInventoryState } from '../src/inventory.js';
import { createWeapons } from '../src/weapons.js';
import { createSkills } from '../src/skills.js';
import { createMagic } from '../src/magic.js';
import { createConsumables } from '../src/consumables.js';

const flatWorld=()=>({bounds:{minX:-1500,maxX:1500,minZ:-1000,maxZ:1000},colliders:[],heightAt:()=>1.5});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const base=()=>({mode:'playing',position:{x:0,z:0},quest:{stage:'unmet'},ben:{x:0,z:2,available:true},
  combat:{phase:'peaceful',action:'idle',hp:100,stamina:100,enemies:[]},weapon:{usable:true},interaction:{npcId:BEN.id}});

test('Ben dialogue is paced and hands the reward choice back to the player',()=>{
  let snapshot=base();const calls=[];
  const pilot=createBenAutopilot({world:flatWorld(),read:()=>snapshot,act:{interact:()=>calls.push('talk'),continue:()=>calls.push('line'),choose:({id})=>calls.push(id)}});
  pilot.start();for(let i=0;i<6;i++)pilot.step(.25);
  assert.deepEqual(calls,['talk']);
  snapshot={...snapshot,mode:'dialogue',dialogue:{npcId:BEN.id,choices:[]}};
  for(let i=0;i<8;i++)pilot.step(.25);assert.ok(!calls.includes('line'),'two seconds still gives the line time to be read');
  pilot.step(.25);assert.equal(calls.at(-1),'line');
  snapshot.dialogue.choices=[{id:'ben-yes'},{id:'ben-later'}];
  for(let i=0;i<6;i++)pilot.step(.25);assert.equal(calls.at(-1),'ben-yes');
  snapshot.quest.stage='killed';snapshot.dialogue.choices=[{id:'ben-bounty'},{id:'ben-lesson'}];
  for(let i=0;i<6;i++)pilot.step(.25);assert.equal(calls.at(-1),'ben-yes');
  assert.equal(pilot.active,false);assert.match(pilot.stopReason,/Choose your reward/);
  pilot.start();pilot.step(.1);assert.equal(pilot.active,false,'resume cannot choose a reward for the player');
});

test('the spider pilot uses a late sideways dodge, guards when confined, and swings only during recovery',()=>{
  const snapshot={...base(),combat:{phase:'active',action:'idle',hp:100,stamina:100,hasShield:true,
    enemies:[{id:'spider',kind:'spider',x:0,z:2,action:'windup',progress:.8,hp:220,active:true,yaw:Math.PI}]}};
  const command=benFightCommand(snapshot,flatWorld());assert.equal(command.actions[0]?.type,'dodge');
  assert.ok(Math.abs(command.actions[0].x)>.99);assert.ok(Math.abs(command.actions[0].z)<.01);
  const boxed=flatWorld();boxed.colliders=[{x:-1,z:0,r:.6},{x:1,z:0,r:.6}];
  assert.equal(benFightCommand(snapshot,boxed).guard,true);
  snapshot.combat.enemies[0].progress=.1;assert.equal(benFightCommand(snapshot,flatWorld()).actions.length,0);
  snapshot.combat.enemies[0].action='idle';assert.equal(benFightCommand(snapshot,flatWorld()).actions[0]?.type,'attack');
});

test('manual stop, defeat and unavailable Ben leave every ordinary action released',()=>{
  for(const outcome of ['manual','player','ben']){
    const snapshot=base(),calls=[];
    const pilot=createBenAutopilot({world:flatWorld(),read:()=>snapshot,act:{interact:()=>calls.push('talk')}});
    pilot.start();pilot.step(.1);
    if(outcome==='manual')pilot.stop('You took control.');
    else if(outcome==='player'){snapshot.combat.hp=0;pilot.step(.1);}
    else{snapshot.quest.stage='abandoned';pilot.step(.1);}
    assert.equal(pilot.active,false);assert.equal(pilot.guard,false);assert.equal(pilot.yaw,null);
    assert.deepEqual(pilot.move,{forward:0,side:0,run:false});
    for(let i=0;i<60;i++)pilot.step(1/60);assert.deepEqual(calls,[]);
  }
});

test('the full Ben pilot follows the moving guide, wins through real contacts, and preserves the reward choice',()=>{
  const world=flatWorld(),position={x:BEN_GUIDE_START.x+1.8,z:BEN_GUIDE_START.z,y:1.5};
  const ben={...BEN_GUIDE_START},quest=createSpiderQuest(),inventory=createInventoryState();
  inventory.add('simple-sword');inventory.add('pawpaw',5);
  const weapons=createWeapons({inventory}),skills=createSkills(),events=[],actions=[],stops=[];
  const combat=createCombat({world,position,getWeapon:()=>weapons.profile(),getMargins:()=>({hasShield:true,guardShare:.6,guardCost:18}),
    getBodies:()=>[{id:BEN.id,...ben,r:BODY.person}],onEvent:event=>events.push(event)});
  const magic=createMagic({world,position,inventory,weapons,skills,combat}),food=createConsumables({inventory,combat});
  combat.setWeaponReady(true);
  let mode='playing',dialogue=null,frame=0,handled=0,walked=0,cameraYaw=0;
  const navigation=bodyWorld(world),guideNavigation=bodyWorld(world);
  const currentBen=()=>combat.state.phase==='active'?combat.state.allies.find(actor=>actor.id===BEN.id)??ben:ben;
  const read=()=>({mode,position:{...position},quest:quest.state,ben:{...currentBen(),available:true},weapon:weapons.profile(),
    dialogue,interaction:{npcId:distance(position,currentBen())<2.8?BEN.id:null},inventory:{pawpaws:inventory.count('pawpaw')},
    combat:{...combat.state.player,phase:combat.state.phase,encounterId:combat.state.encounterId,hasShield:true,guardCost:18,
      enemies:combat.state.enemies,allies:combat.state.allies}});
  const pilot=createBenAutopilot({world:navigation,read,act:{
    interact:()=>{assert.ok(distance(position,ben)<2.8);if(quest.state.stage==='unmet')quest.ask();mode='dialogue';dialogue={npcId:BEN.id,remaining:3,choices:[]};},
    continue:()=>{if(--dialogue.remaining<=0)dialogue.choices=quest.state.stage==='asked'?[{id:'ben-yes'},{id:'ben-later'}]:[{id:'ben-bounty'},{id:'ben-lesson'}];},
    choose:({id})=>{actions.push(id);assert.ok(['ben-yes','ben-lesson'].includes(id));
      if(id==='ben-yes')assert.equal(quest.accept(),true);else{assert.equal(quest.take('lesson').stage,'taught');magic.learn('fireball');}
      mode='playing';dialogue=null;},
    attack:({yaw})=>{if(combat.attack(yaw))actions.push('attack');},dodge:direction=>{if(combat.dodge(direction))actions.push('dodge');},
    eat:({id})=>{if(food.consume(id).ok)actions.push('eat');}}});
  pilot.onEvent(event=>{if(event.type==='stop')stops.push(event);});pilot.start();
  for(;frame<18000&&pilot.active;frame++){
    const dt=1/60,before={...position};
    navigation.setBodies(combat.state.phase==='active'?[...combat.state.enemies,...combat.state.allies].filter(actor=>actor.active)
      .map(actor=>({id:actor.id,x:actor.x,z:actor.z,r:actor.r??BODY.person})):[{id:BEN.id,...ben,r:BODY.person}]).moving(position,BODY.traveler,'traveler');
    pilot.step(dt);
    if(Number.isFinite(pilot.yaw))cameraYaw+=Math.atan2(Math.sin(pilot.yaw-cameraYaw),Math.cos(pilot.yaw-cameraYaw))*(1-Math.exp(-3.5*dt));
    if(mode==='playing'){
      const {forward,side}=pilot.move,yaw=cameraYaw,speed=4.2*combat.movementScale();
      moveCharacter(position,(-Math.sin(yaw)*forward+Math.cos(yaw)*side)*speed*dt,
        (-Math.cos(yaw)*forward-Math.sin(yaw)*side)*speed*dt,navigation);
      combat.guard(pilot.guard,pilot.yaw===null?combat.state.player.yaw:pilot.yaw+Math.PI);
      if(quest.state.walking){
        const order=benGuideTarget(ben,position,quest.state.guide);quest.rememberGuide(order.progress);
        guideNavigation.setBodies([{id:'traveler',...position,r:BODY.traveler}]).moving(ben,BODY.person,BEN.id);
        stepToward(ben,order.target,BEN_GUIDE_PACE*dt,guideNavigation,BODY.person,-1);
        if(distance(ben,SPIDER_DEN.center)<14&&distance(position,SPIDER_DEN.center)<14&&distance(position,ben)<10){
          assert.equal(combat.startEncounter({...SPIDER_DEN,level:2,allies:[{...SPIDER_DEN.allies[0],...ben}]}),true);quest.begin();
        }
      }
      combat.update(dt);
      for(;handled<events.length;handled++){
        const event=events[handled];
        if(event.type==='ally-down'&&event.id===BEN.id)quest.benFell();
        if(event.type==='victory'){
          const ally=combat.state.allies.find(actor=>actor.id===BEN.id);Object.assign(ben,{x:ally.x,z:ally.z});
          quest.settle({spiderDead:true,benAlive:ally.hp>0});
        }
      }
    }
    const moved=distance(before,position);walked+=moved;
    assert.ok(moved<.35,'the controller must never teleport during its route or fight');
  }
  assert.equal(quest.state.stage,'killed',JSON.stringify({frame,stage:quest.state.stage,position,ben,stop:pilot.stopReason,
    hp:combat.state.player.hp,enemy:combat.state.enemies[0],allies:combat.state.allies,actions:actions.slice(-15)}));
  assert.equal(magic.known('fireball'),false);assert.equal(stops.at(-1)?.completed,true);
  assert.equal(mode,'dialogue');assert.deepEqual(dialogue.choices.map(choice=>choice.id),['ben-bounty','ben-lesson']);
  assert.ok(!actions.includes('ben-lesson'));
  assert.ok(walked>140,'the route was actually walked');assert.ok(actions.includes('dodge'));assert.ok(actions.includes('attack'));
  assert.ok(events.some(event=>event.type==='hit'&&event.source==='ally'&&event.spell));
  assert.ok(events.some(event=>event.type==='hit'&&event.source==='player'&&event.melee));
  assert.ok(!actions.includes('ben-bounty'));
});
