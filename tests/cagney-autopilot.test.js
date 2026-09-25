import test from 'node:test';
import assert from 'node:assert/strict';
import { createCagneyAutopilot } from '../src/cagney-autopilot.js';
import { CAGNEY_AMBUSH } from '../src/cagney-quest.js';

const world={bounds:{minX:-2000,maxX:2000,minZ:-2000,maxZ:2000},colliders:[],heightAt:()=>1.5};
const base=()=>({mode:'playing',position:{x:0,z:0},quest:{stage:'unmet'},cagney:{x:0,z:2,available:true},
  combat:{phase:'peaceful',action:'idle',hp:100,stamina:100,hasShield:true,enemies:[]},inventory:{pawpaws:0},interaction:{npcId:'cagney'}});
function fixture(){const s=base(),actions=[];const pilot=createCagneyAutopilot({world,read:()=>s,act:Object.fromEntries(
  ['interact','continue','choose','attack','eat','dismount'].map(kind=>[kind,a=>actions.push({kind,...a})]))});pilot.start();
  return{s,pilot,actions,tick(n=1){let result;for(let i=0;i<n;i++)result=pilot.step(.25);return result;}};}

test('the Cagney pilot uses the normal conversation choices and collects only the offered reward',()=>{
  const f=fixture();f.tick(4);assert.equal(f.actions[0].kind,'interact');
  f.s.mode='dialogue';f.s.dialogue={npcId:'cagney',choices:[]};f.tick(6);assert.equal(f.actions.at(-1).kind,'continue');
  f.s.dialogue.choices=[{id:'cagney-leave'},{id:'cagney-accept'}];f.tick(4);assert.equal(f.actions.at(-1).id,'cagney-accept');
  f.s.quest.stage='home';f.s.dialogue.choices=[{id:'cagney-reward'}];f.tick(4);assert.equal(f.actions.at(-1).id,'cagney-reward');
  f.s.quest.stage='complete';f.tick();assert.equal(f.pilot.active,false);assert.match(f.pilot.stopReason,/45 copper/);
});

test('the escort pilot follows Cagney with movement inputs without changing either world position',()=>{
  const f=fixture();f.s.quest={stage:'escorting',walk:{waypoint:1,waiting:false}};f.s.cagney={x:0,z:7,available:true};
  const before=structuredClone(f.s);const command=f.tick();assert.ok(Math.abs(command.move.forward)+Math.abs(command.move.side)>0);
  assert.deepEqual(f.s,before);assert.equal(f.actions.length,0);
  f.s.cagney.z=2;const near=f.tick();assert.deepEqual(near.move,{forward:0,side:0,run:false});
});

test('the pilot moves clear rather than striking through Cagney but attacks a clear opponent',()=>{
  const f=fixture();f.s.quest.stage='ambushed';f.s.cagney={x:0,z:1,available:true};
  f.s.combat={...f.s.combat,phase:'active',encounterId:CAGNEY_AMBUSH.id,enemies:[{id:'cagnapper-1',x:0,z:2,hp:48,active:true,action:'idle'}]};
  const blocked=f.tick(4);assert.equal(f.actions.some(a=>a.kind==='attack'),false);
  assert.ok(Math.abs(blocked.move.forward)+Math.abs(blocked.move.side)>0);
  f.s.cagney.z=-2;f.tick(4);assert.ok(f.actions.some(a=>a.kind==='attack'));
});

test('takeover and pause stop movement, and restarting resumes the same ordinary escort',()=>{
  const f=fixture();f.s.quest={stage:'escorting',walk:{waypoint:2}};f.s.cagney.z=7;
  f.pilot.stop('You took control.');assert.equal(f.pilot.step(.25),null);assert.equal(f.pilot.active,false);
  f.pilot.start();assert.ok(f.tick().move.forward);assert.equal(f.s.quest.walk.waypoint,2);
  f.s.mode='pause';assert.deepEqual(f.tick().move,{forward:0,side:0,run:false});assert.equal(f.pilot.active,true);
  f.s.mode='playing';assert.ok(f.tick().move.forward);
});

test('failure and unrelated encounters stop autoplay without choosing a recovery or fighting another quest',()=>{
  for(const change of [s=>{s.mode='defeated';},s=>{s.quest={stage:'captured',over:true};},
    s=>{s.combat.phase='active';s.combat.encounterId='unrelated';}]){
    const f=fixture();change(f.s);f.tick(4);assert.equal(f.pilot.active,false);assert.equal(f.actions.length,0);
  }
});
