import test from 'node:test';
import assert from 'node:assert/strict';
import {createLizeemEncounter} from '../src/gameplay/combat/lizeem-encounter.js';
import {ENCOUNTER_BALANCE} from '../src/gameplay/combat/encounter-balance.js';
import {ENCOUNTER_ATTACKS} from '../src/gameplay/combat/encounter-attacks.js';
import {encounterCue} from '../src/gameplay/combat/encounter-cue.js';
import {encounterAutoplayInput} from '../src/gameplay/autoplay/encounter-input.js';
import {encounterFeedback} from '../src/gameplay/combat/encounter-feedback.js';
import {sourceModule} from './module-loader.js';
const create=()=>createLizeemEncounter({heroStart:{x:0,z:0},guardStarts:[{x:0,z:-1.9}],attackPattern:['thrust']});
const until=(m,p,input=()=>({}))=>{let s=m.snapshot();for(let i=0;i<5500&&!p(s)&&!s.outcome;i++)s=m.tick(1/60,input(s));assert(p(s),'Expected condition before encounter ended');return s;};

test('five clear hits defeat Teresod, each recorded once with a matching damage explanation',()=>{
 const m=create(),hits=[];let s=m.snapshot(),last=-1;
 while(!s.outcome){s=m.tick(1/60);const e=s.hero.lastDefense;if(e?.kind==='hit'&&e.at!==last){last=e.at;hits.push(e);assert.match(encounterFeedback(s).text,/-20 health/);}}
 assert.deepEqual(hits.map(e=>e.damage),[20,20,20,20,20]);assert.equal(s.hero.hp,0);assert.equal(s.outcome,'defeat');
 assert(hits.every((e,i)=>!i||e.at-hits[i-1].at>=ENCOUNTER_BALANCE.hitGrace));
});
test('taking a hit leaves movement and dodge responsive and a tactical comeback possible',()=>{
 const m=create();let s=until(m,s=>s.hero.hp<100);assert.equal(s.hero.hp,80);assert(s.hero.hitGrace>0);
 const start={...s.hero};s=m.tick(1/60,{x:1,dodge:true});assert(s.hero.x>start.x&&s.hero.dodge>0);assert(s.hero.hitGrace<start.hitGrace);
 s=until(m,s=>!!s.outcome,encounterAutoplayInput);assert.equal(s.outcome,'success');assert(s.hero.hp>0);assert(s.skill.dodgeCounters>=2);
});
test('counter remains possible after taking time to notice the missed thrust and close in',()=>{
 const m=create();let s=until(m,s=>s.guards[0].phase==='windup'&&s.guards[0].timer<.18);
 m.tick(1/60,{x:1,dodge:true});s=until(m,s=>s.guards[0].phase==='recover');
 for(let i=0;i<39;i++)s=m.tick(1/60);assert(s.guards[0].open,'Opening survives a 650ms reaction delay');
 s=until(m,s=>s.skill.counters>0,encounterAutoplayInput);assert.equal(s.guards[0].hp,25);assert.equal(s.hero.hp,100);
});
test('five guards offer non-overlapping attack commitments and an accessible recovery interval',()=>{
 const guards=Array.from({length:5},(_,i)=>({x:Math.sin(i*Math.PI*2/5)*4,z:Math.cos(i*Math.PI*2/5)*4}));
 const m=createLizeemEncounter({heroStart:{x:0,z:0},guardStarts:guards,rallyPoint:{x:0,z:0}});let s=m.snapshot(),max=0;
 for(let i=0;i<5500&&!s.outcome;i++){s=m.tick(1/60,encounterAutoplayInput(s));max=Math.max(max,s.guards.filter(g=>g.hp>0&&['windup','strike'].includes(g.phase)).length);}
 assert.equal(max,1);assert.equal(s.outcome,'success');assert(s.hero.hp>=40);assert(s.time<60);
});
test('warnings fill from actual windup time; openings drain and never appear for a connected strike',()=>{
 for(const attack of ['thrust','sweep']){
   const a=ENCOUNTER_ATTACKS[attack],g={hp:50,attack,phase:'windup',timer:a.windup};assert.equal(encounterCue(g).fraction,0);
   assert.equal(encounterCue({...g,timer:a.windup/2}).fraction,.5);
   const missed={...g,phase:'recover',timer:a.recovery,open:true};assert.equal(encounterCue(missed).fraction,1);
   assert.equal(encounterCue({...missed,timer:a.recovery/2}).fraction,.5);assert.equal(encounterCue({...missed,open:false}),null);
   assert.equal(encounterCue({...missed,hp:0}),null);assert.equal(encounterCue({...missed,escaped:true}),null);
 }
});
test('warning outlines, shrinking counter ring and recovery pose match the model and dispose cleanly',async()=>{
 const THREE=await sourceModule('../vendor/three.module.js');
 const {createEncounterWarnings,encounterGuardPose}=await sourceModule('../src/app/lizeem/encounter-presentation.js');
 const scene=new THREE.Scene(),view=createEncounterWarnings(scene,1);
 const g={x:0,z:0,hp:50,heading:0,phase:'windup',attack:'sweep',timer:.6,hurt:0,block:0};view.draw([g]);
 assert(scene.children.find(o=>o.userData.combatWarningEdge).visible);
 const ring=scene.children.find(o=>o.userData.counterOpening);assert(!ring.visible);
 const open={...g,phase:'recover',open:true,timer:.6};view.draw([open]);assert(ring.visible);assert(ring.geometry.drawRange.count<240);
 assert.equal(encounterGuardPose(open).action,'recover');assert.equal(encounterGuardPose(open).shieldRaised,false);
 view.draw([{...open,open:false}]);assert(!ring.visible);view.dispose();assert.equal(scene.children.length,0);
});
