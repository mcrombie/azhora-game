import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {sourceModule} from './module-loader.js';
import {createCombat} from '../src/combat.js';
import {createDrentHost,DRENT_FIGHT_ID} from '../src/drent-host.js';
import {DRENT_NPCS,DRENT_NPC_POSITIONS,DRENT_SITES} from '../src/drent-sites.js';
import {createInventoryState} from '../src/inventory.js';
import {createSkills} from '../src/skills.js';
import {INSTRUCTOR,INSTRUCTOR_STAND} from '../src/instructor.js';
import {bodyWorld,stepToward,BODY} from '../src/bodies.js';
import {canStand} from '../src/game-state.js';
import {AMBUSH} from '../src/road-ambush.js';
import {regionLevel} from '../src/region-levels.js';

const {createWorld}=await sourceModule('../src/world.js');
const world=createWorld(new THREE.Scene());
const point=at=>new THREE.Vector3(at.x,world.heightAt(at.x,at.z),at.z);
function fixture(){
  const npcs=new Map([INSTRUCTOR,...DRENT_NPCS].map(npc=>[npc.id,{...npc,actor:{group:{
    position:point(npc.id==='instructor'?INSTRUCTOR_STAND:DRENT_NPC_POSITIONS[npc.id]),rotation:{y:npc.yaw??0}}},hidden:false}]));
  const inventory={...createInventoryState(),refresh(){}},skills=createSkills(),events=[];
  const position=point({x:DRENT_SITES.killian.x+7,z:DRENT_SITES.killian.z+5});
  let host;
  const combat=createCombat({world,position,getLevel:center=>regionLevel(world.regionAt(center.x,center.z)?.name)??0,
    getBodies:()=>[...npcs.values()].filter(npc=>!npc.hidden).map(npc=>({id:npc.id,x:npc.actor.group.position.x,z:npc.actor.group.position.z,r:BODY.person})),
    onEvent:event=>{events.push(event);host?.combatEvent(event);}});
  const dialogs=[];
  host=createDrentHost({world,npcById:npcs,inventory,skills,combat,position:()=>position,mode:()=> 'playing',trained:()=>true,
    openDialogue(npc,lines,action,leave,options){dialogs.push({npc,lines,...options});},closeDialogue(){},toast(){},onChange(){},onTrack(){},getTracked:()=> 'main'});
  for(const action of ['defeat-ambush','accept-investigation','search-camp','report-glun','confront-killian'])assert.equal(host.act(action).ok,true,action);
  return {host,combat,npcs,position,events,dialogs};
}

test('Glun can walk from his training post into Killian\'s real yard without crossing props',t=>{
  const {host,npcs,position,dialogs}=fixture(),glun=npcs.get('instructor');
  const nav=bodyWorld(world).moving(glun.actor.group.position,BODY.person);
  const killian=npcs.get('killian').actor.group.position;
  let frames=0;
  for(;frames<2400&&!dialogs.some(dialogue=>dialogue.choices?.some(choice=>choice.id==='drent-fight'));frames++){
    // Keep the traveler close enough that the officer does not wait; the officer himself
    // still takes every collision-tested step through the actual village geometry.
    position.copy(glun.actor.group.position);host.frame(1/60,{playing:true});
    const target=world.npcPositions.instructor;
    nav.setBodies([{id:'killian',x:killian.x,z:killian.z,r:BODY.person}]);
    stepToward(glun.actor.group.position,target,3.1/60,nav,BODY.person);
    assert.ok(canStand(glun.actor.group.position.x,glun.actor.group.position.z,world,BODY.person),'Glun crossed a village collider');
  }
  assert.ok(frames<2400,'Glun never reached the confrontation within 40 seconds');
  assert.ok(Math.hypot(glun.actor.group.position.x-killian.x,glun.actor.group.position.z-killian.z)<5);
  t.diagnostic(`Glun reached Killian in ${(frames/60).toFixed(1)} seconds through the actual town.`);
});

for(const fps of [30,60])test(`Glun defeats Killian unaided with real terrain and combat at ${fps} fps`,t=>{
  const {host,combat,npcs,position,events}=fixture(),killian=npcs.get('killian').actor.group.position;
  const stand={x:killian.x+2.5,z:killian.z+1.5};
  assert.ok(canStand(killian.x,killian.z,world,BODY.person),'Killian spawns inside scenery');
  assert.ok(canStand(stand.x,stand.z,world,BODY.person),'Glun\'s confrontation point is blocked');
  assert.ok(canStand(position.x,position.z,world,BODY.traveler),'the player\'s observation point is blocked');
  npcs.get('instructor').actor.group.position.copy(point(stand));
  host.frame(1/fps,{playing:true});assert.equal(host.startFight(),true,'the encounter is rejected');
  assert.equal(combat.state.encounterId,DRENT_FIGHT_ID);
  assert.equal(npcs.get('killian').hidden,true);assert.equal(npcs.get('instructor').hidden,true);
  let frames=0;
  for(;frames<fps*45&&combat.state.phase==='active';frames++)combat.update(1/fps);
  assert.equal(combat.state.phase,'won',`Glun did not win: ${JSON.stringify({phase:combat.state.phase,enemies:combat.state.enemies,allies:combat.state.allies})}`);
  assert.equal(combat.state.player.hp,100,'the observing player should not need to tank the fight');
  assert.equal(events.filter(event=>event.type==='victory').length,1);
  assert.equal(events.filter(event=>event.type==='swing').length,0,'the traveler never swung a sword');
  assert.ok(events.some(event=>event.type==='ally-strike'&&event.id==='instructor'),'Glun never landed a blow');
  assert.equal(host.state().killianDefeated,true);assert.equal(host.state().outcome,null,'the final report is still required');
  assert.equal(npcs.get('killian').hidden,true);assert.equal(npcs.get('instructor').hidden,false);
  const glun=combat.state.allies.find(ally=>ally.id==='instructor');assert.ok(glun.hp>0);
  assert.equal(combat.state.enemies[0].maxHp,180);
  assert.equal(host.act('report-victory').ok,true);assert.equal(host.state().favor.empire,10);
  t.diagnostic(`${(frames/fps).toFixed(1)} seconds; Glun ${glun.hp}/${glun.maxHp} HP; traveler never attacked.`);
});

test('the relocated ambush still has three ordinary rebels and gives no free Glun escort',()=>{
  const {x,z}=AMBUSH.point,{dx,dz}=AMBUSH.forward;
  const at=(along,across)=>({x:x+dx*along+dz*across,z:z+dz*along-dx*across});
  const position=point(at(0,0)),events=[];
  const combat=createCombat({world,position,onEvent:event=>events.push(event)});
  assert.equal(combat.startEncounter({id:'caloss-rebels',center:{x,z},checkpoint:at(-14,0),
    retreatAxis:Math.abs(dx)>Math.abs(dz)?'x':'z',retreatLine:at(-26,0)[Math.abs(dx)>Math.abs(dz)?'x':'z'],
    enemies:[[3,-3.4],[-2,3.6],[6,2.8]].map(([along,across],i)=>({id:`rebel-${i}`,kind:'rebel',hp:AMBUSH.hp,entry:.2+i*1.2,...at(along,across)}))}),true);
  assert.equal(combat.state.allies.length,0);assert.equal(combat.state.enemies.length,3);
  assert.ok(combat.state.enemies.every(enemy=>enemy.maxHp===120));
  for(let i=0;i<60*45&&combat.state.phase==='active';i++)combat.update(1/60);
  assert.equal(combat.state.phase,'defeated','ignoring three armed rebels must still be dangerous');
  assert.ok(events.some(event=>event.type==='player-hit'));assert.equal(events.some(event=>event.type==='victory'),false);
});
