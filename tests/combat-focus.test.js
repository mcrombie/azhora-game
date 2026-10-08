import test from 'node:test';
import assert from 'node:assert/strict';
import {createLizeemEncounter} from '../src/gameplay/combat/lizeem-encounter.js';
import {focusCandidates,selectFireballTarget} from '../src/gameplay/combat/combat-focus.js';
import {localSight} from '../src/app/exploration/local-sight.js';
const guard=(id,x,z)=>({id,x,y:1.5,z,hp:50,escaped:false});

test('focus chooses the visible opponent near the camera direction, omitting dead, escaped, hidden and distant bodies',()=>{
 const guards=[guard(0,4,-3),guard(1,0,-12),guard(2,0,2),guard(3,0,-23),{...guard(4,0,-2),escaped:true},{...guard(5,0,-2),hp:0},guard(6,0,-3)];
 assert.deepEqual(focusCandidates({x:0,z:0},guards,0,(_a,b)=>b.id!==6).map(g=>g.id),[1,0]);
});
test('focus allows lateral movement while facing the opponent, without extending melee range',()=>{
 const m=createLizeemEncounter({heroStart:{x:0,z:0},guardStarts:[guard(0,0,-6)]});
 let s=m.tick(1/60,{x:1,focusId:0});assert(s.hero.x>0);assert(s.hero.heading<-3);assert.equal(s.hero.targetId,null);
 for(let i=0;i<12;i++)s=m.tick(1/60,{attack:true,focusId:0});
 assert.equal(s.guards[0].hp,50);assert.equal(s.hero.lastStrike.kind,'out-of-range');
 m.fireballHit(0,50);s=m.tick(1/60,{focusId:0});assert.equal(s.hero.focusId,null);
});
test('changing focus during a swing neither rotates the committed attack nor redirects its hit',()=>{
 const m=createLizeemEncounter({heroStart:{x:0,z:0},guardStarts:[guard(0,0,-2),guard(1,2,0)]});
 const initial=m.tick(1/60,{focusId:0,attack:true});assert.equal(initial.hero.swingTargetId,0);
 let s;for(let i=0;i<11;i++)s=m.tick(1/60,{focusId:1});
 assert.equal(s.hero.heading,initial.hero.heading);assert.equal(s.hero.lastStrike.target,0);assert.equal(s.guards[1].hp,50);
});
test('focus cannot strike through an obstacle or substitute a nearer opponent',()=>{
 const m=createLizeemEncounter({heroStart:{x:0,z:0},guardStarts:[guard(0,0,-2),guard(1,0,-5)],canHit:()=>false});
 for(let i=0;i<15;i++)m.tick(1/60,{focusId:0,attack:true});assert.equal(m.snapshot().guards[0].hp,50);
 const other=createLizeemEncounter({heroStart:{x:0,z:0},guardStarts:[guard(0,0,-2),guard(1,0,-5)]});
 assert.equal(other.tick(1/60,{focusId:1,attack:true}).hero.swingTargetId,null);
});
test('Fireball favors deliberate focus, otherwise tight camera aim, and never redirects a blocked lock',()=>{
 const origin={x:0,y:1.5,z:0},dir={x:0,z:-1},targets=[guard(0,2,-3),guard(1,0,-12),guard(2,-3,-5)];
 assert.equal(selectFireballTarget(origin,dir,targets).id,1);
 assert.equal(selectFireballTarget(origin,dir,targets,{lockedId:2}).id,2);
 assert.equal(selectFireballTarget(origin,dir,targets,{lockedId:2,visible:(_a,g)=>g.id!==2}),null);
 assert.equal(selectFireballTarget(origin,dir,[guard(0,0,-20)],{lockedId:0}),null);
 assert.equal(selectFireballTarget(origin,dir,[guard(0,4,-2)]),null);
});
test('local sight respects walls and elevation while permitting conversation over a low counter',()=>{
 let top=3;const world={heightAt:()=>0,readyAt:()=>true,nearColliders:()=>[{x:0,z:1,hx:3,hz:.2,minY:0,get maxY(){return top;}}]};
 assert.equal(localSight(world,{x:0,z:0},{x:0,z:3}),false);top=1;
 assert.equal(localSight(world,{x:0,z:0},{x:0,z:3}),true);
});


test('Fireball feedback reports the actual hit rather than a melee miss',async()=>{
 const {encounterFeedback}=await import('../src/gameplay/combat/encounter-feedback.js');
 const m=createLizeemEncounter();m.fireballHit(0,26);
 assert.match(encounterFeedback(m.snapshot()).text,/Fireball hit soldier 1: -26 health/);
 m.fireballHit(0,26);assert.match(encounterFeedback(m.snapshot()).text,/-24 health/);
});
