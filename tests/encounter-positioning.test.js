import test from 'node:test';
import assert from 'node:assert/strict';
import {encounterSteering} from '../src/gameplay/combat/encounter-space.js';
import {createEngagementPositions,createEncounterNavigation,encounterDetour} from '../src/gameplay/combat/encounter-positioning.js';
import {createSkirmishGround} from '../src/app/exploration/skirmish-ground.js';
import {createLizeemEncounter} from '../src/gameplay/combat/lizeem-encounter.js';
import {militiaWeapon} from '../src/gameplay/combat/combat-units.js';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const plain=()=>({bounds:{minX:-100,maxX:100,minZ:-100,maxZ:100},heightAt:()=>2,waterAt:()=>0,readyAt:()=>true,regionAt:()=>({id:13}),nearColliders:()=>[]});
const access=ground=>({canOccupy:(p,r)=>ground.clear(p.x,p.z,r),canTraverse:ground.segment});

test('a shore-facing crowd reserves separate dry front and rear positions and fills a vacated front',()=>{
  const ground=createSkirmishGround({...plain(),waterAt:x=>x<0?3:0},{x:8,z:0}),options=access(ground);
  const reserve=createEngagementPositions(options),target={id:-1,x:.8,z:0,hp:100};
  const team=Array.from({length:12},(_,id)=>({id,x:7+Math.floor(id/4)*2,z:(id%4-1.5)*2,hp:100,unitType:'militiaman',engage:1.9}));
  const bodies=[target,...team],positions=team.map(a=>reserve(a,target,team,bodies,0));
  assert(positions.some(p=>p.rank===0)&&positions.some(p=>p.rank>0),'Both a striking rank and a supporting rank remain');
  for(let i=0;i<positions.length;i++){
    const p=positions[i];assert(!p.blocked,'The dry bank has enough room for this formation');
    assert(options.canOccupy(p,.45)&&options.canTraverse(team[i],p,.45));
    for(let j=0;j<i;j++)assert(distance(p,positions[j])>=1.65-1e-8,'Soldiers reserve distinct spaces');
    assert.deepEqual(reserve(team[i],target,team,bodies,.1),p,'Assignments stay stable between decisions');
  }
  const front=positions.findIndex(p=>!p.rank),rear=positions.findIndex(p=>p.rank);
  team[front].hp=0;
  assert.equal(reserve(team[rear],target,team,bodies,1.2).rank,0,'A supporting soldier can replace a fallen front rank');
});

test('terrain steering can use the other passing side instead of repeatedly choosing river water',()=>{
  const ground=createSkirmishGround({...plain(),waterAt:x=>x<0?3:0},{x:5,z:0});
  const actor={id:0,x:.6,z:0,hp:100},body={id:1,x:.6,z:1.2,hp:100},target={x:.6,z:5};
  const original=encounterSteering(actor,target,[actor,body]);assert(original.x<0,'The old fixed passing side points toward the water');
  const direction=encounterSteering(actor,target,[actor,body],access(ground));
  assert(direction.x>0);assert(ground.segment(actor,{x:actor.x+direction.x*1.4,z:actor.z+direction.z*1.4},.45));
});

test('a live field battle keeps dry body spacing and a supporting rank when only the hero remains',()=>{
  const ground=createSkirmishGround({...plain(),waterAt:x=>x<0?3:0},{x:8,z:0});
  const guardStarts=Array.from({length:12},(_,id)=>({x:7+Math.floor(id/4)*2,z:(id%4-1.5)*2,unitType:'militiaman',weapon:militiaWeapon(id)}));
  const model=createLizeemEncounter({heroStart:{x:.8,z:0},guardStarts,allyStarts:[],fieldBattle:true,rallyPoint:{x:5,z:0},move:ground.move,canHit:ground.canHit,...access(ground)});
  let s=model.snapshot(),support=false,attacks=false;
  for(let tick=0;tick<360&&!s.outcome;tick++){
    const before=s;s=model.tick(1/60,{block:true});
    support||=s.guards.some(g=>g.engagementRank>0);attacks||=s.guards.some(g=>g.attacks>0);
    const bodies=[s.hero,...s.guards].filter(a=>a.hp&&!a.escaped);
    for(let i=0;i<bodies.length;i++){
      assert(ground.clear(bodies[i].x,bodies[i].z,.34));
      for(let j=0;j<i;j++)assert(distance(bodies[i],bodies[j])>=1.1-1e-6);
    }
    for(const g of s.guards)assert(distance(g,before.guards[g.id])<=g.combat.moveSpeed/60+1e-8);
  }
  assert(support&&attacks,'The front fights while supporting soldiers keep their distance');
});

test('militia leave a looser interval than trained infantry without changing their weapons or stats',()=>{
  const target={id:-1,x:0,z:0,hp:100};
  function interval(unitType){
    const reserve=createEngagementPositions(),team=[0,.8].map((angle,id)=>({id,x:Math.sin(angle)*6,z:Math.cos(angle)*6,hp:100,unitType,engage:1.9}));
    return distance(...team.map(a=>reserve(a,target,team,[target,...team],0)));
  }
  assert(interval('militiaman')>interval('ambron-soldier')+.3);
});

test('a cached local detour rounds a blocked approach at the ordinary walking speed',()=>{
  const ground=createSkirmishGround({...plain(),nearColliders:()=>[{x:0,z:0,hx:.5,hz:3}]},{x:0,z:0}),options=access(ground);
  const actor={id:0,x:-3,z:0,hp:100},target={x:3,z:0},navigate=createEncounterNavigation(options),speed=2.1,dt=1/30;
  const route=encounterDetour(actor,target,options);assert(route?.length>1);
  let at=actor;for(const p of route){assert(ground.segment(at,p,.45));at=p;}
  let furthest=0;
  for(let tick=0;tick<600&&distance(actor,target)>.3;tick++){
    const before={...actor},d=navigate(actor,target,[actor],tick*dt,dt),stride=Math.min(distance(actor,target),speed*dt);
    const next=ground.move(actor,d.x*stride,d.z*stride);actor.x=next.x;actor.z=next.z;
    assert(distance(before,actor)<=speed*dt+1e-8,'Routing does not alter the unit movement speed');
    assert(ground.clear(actor.x,actor.z));furthest=Math.max(furthest,Math.abs(actor.z));
  }
  assert(furthest>3.4,'The actor goes around the wall instead of sliding forever into it');assert(distance(actor,target)<.3);
});

test('unreachable local destinations have bounded search and cached retry work',()=>{
  let probes=0;
  const options={canOccupy:p=>{probes++;return p.x<1;},canTraverse:(a,b)=>b.x<1};
  assert.equal(encounterDetour({x:0,z:0},{x:4,z:0},{...options,maxNodes:20}),null);assert(probes<220);
  const actor={id:0,x:0,z:0,hp:100},navigate=createEncounterNavigation(options);
  navigate(actor,{x:4,z:0},[actor],0,1/60);probes=0;
  for(let i=1;i<40;i++)navigate(actor,{x:4,z:0},[actor],i/60,1/60);
  assert(probes<1400,'Failed route search does not repeat every frame');
});

test('shore clearance includes the soldier footprint and a narrow dry strip cannot host a formation',()=>{
  const ground=createSkirmishGround({...plain(),waterAt:x=>Math.abs(x)>1?3:0},{x:0,z:0});
  assert.equal(ground.clear(.8,0,.45),false);assert.equal(ground.clear(0,0,.45),true);
  assert.throws(()=>ground.assaultStage(0,12,12),/clear ground/);
});
