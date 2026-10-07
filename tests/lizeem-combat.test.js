import test from 'node:test';
import assert from 'node:assert/strict';
import {createLizeemEncounter} from '../src/gameplay/combat/lizeem-encounter.js';
import {encounterAutoplayInput} from '../src/gameplay/autoplay/encounter-input.js';
import {dodgeLesson} from '../src/gameplay/combat/encounter-lesson.js';
const create=()=>createLizeemEncounter({heroStart:{x:0,z:0},guardStarts:[{x:0,z:-1.9}],attackPattern:['thrust']});
const step=(model,count,input={})=>{let s;for(let i=0;i<count;i++)s=model.tick(1/60,input);return s;};
const run=(model,input)=>{let s=model.snapshot();for(let i=0;i<5500&&!s.outcome;i++)s=model.tick(1/60,input(s));return s;};

test('a raised guard blocks a frontal swing at contact without cancelling the committed strike',()=>{
  const m=create();m.tick(1/60);assert.equal(m.snapshot().guards[0].phase,'windup');
  const start=m.tick(1/60,{attack:true});assert.equal(start.hero.lastStrike,null);
  const contact=step(m,10);assert.equal(contact.guards[0].hp,50);assert.equal(contact.guards[0].phase,'windup');
  assert.equal(contact.hero.lastStrike.kind,'guarded');assert(contact.guards[0].block>0);
  assert.equal(step(m,15).skill.blocks,1,'One contact per swing');
});

test('a click in late recovery is buffered without being held',()=>{
  const m=create();m.tick(1/60,{attack:true});const s=step(m,27);assert(s.hero.cooldown<.16&&s.hero.cooldown>0);
  m.tick(1/60,{attack:true});assert.equal(step(m,16).skill.blocks,2);
});

test('dodging cancels an unlanded swing, moves without WASD, and does not repeat when held',()=>{
  const m=create();m.tick(1/60,{attack:true});let s=m.tick(1/60,{dodge:true});assert(s.hero.z>0);assert.equal(s.hero.swing,0);
  s=step(m,25,{dodge:true});assert.equal(s.guards[0].hp,50);assert.equal(s.hero.dodge,0);const position=s.hero.z;
  s=step(m,40,{dodge:true});assert.equal(s.hero.z,position);assert.equal(s.hero.dodge,0);
});

test('committed enemy attacks can be sidestepped and leave a recovery opening',()=>{
  const m=createLizeemEncounter({heroStart:{x:0,z:0},guardStarts:[{x:0,z:-1.2}]});let s=m.tick(1/60);const heading=s.guards[0].heading;
  s=step(m,22,{x:1});assert.equal(s.guards[0].heading,heading);
  while(s.guards[0].phase!=='recover')s=m.tick(1/60);
  assert.equal(s.hero.hp,100);assert.equal(s.hero.lastDefense.kind,'missed');assert(s.guards[0].open);assert(s.guards[0].timer>.5);
  assert.equal(s.skill.dodges,0,'Walking aside does not falsely award a timed dodge');
});

test('a flank hit deals damage without cancelling a committed enemy swing',()=>{
  const m=createLizeemEncounter({heroStart:{x:0,z:0},guardStarts:[{x:0,z:-.5}]});m.tick(1/60);
  step(m,22,{x:1,z:-1});m.tick(1/60,{attack:true});const s=step(m,10);
  assert.equal(s.guards[0].hp,25);assert.equal(s.guards[0].phase,'windup');assert.equal(s.hero.lastStrike.kind,'hit');
});

test('hit detection checks reach at contact rather than granting damage at button press',()=>{
  const far=createLizeemEncounter({heroStart:{x:0,z:0},guardStarts:[{x:0,z:-3.1}],move:(a,x,z)=>({x:a.x+x,z:a.z+z})});
  far.tick(1/60,{attack:true});const miss=step(far,12,{z:1});assert(miss.hero.z>0);assert.equal(miss.guards[0].hp,50);assert.equal(miss.hero.lastStrike.kind,'out-of-range');
});

test('standing attack spam loses while dodge-counter play wins against one or three soldiers',()=>{
  for(const make of [create,()=>createLizeemEncounter()]){
    const spam=run(make(),()=>({attack:true})),tactical=run(make(),encounterAutoplayInput);
    assert.equal(spam.outcome,'defeat');assert(spam.skill.blocks>3);assert(spam.guards.every(g=>g.hp===50));
    assert.equal(tactical.outcome,'success');assert(tactical.hero.hp>=(tactical.guards.length===1?75:50));assert(tactical.skill.dodgeCounters>=2);assert(tactical.time<20);
    assert(dodgeLesson(tactical).complete);assert(!dodgeLesson(spam).complete);
  }
});

test('counter consumes the opening and lesson completion requires a dodge counter',()=>{
  const m=create();let s=m.snapshot();while(!s.skill.counters)s=m.tick(1/60,encounterAutoplayInput(s));
  assert.equal(s.hero.lastStrike.kind,'counter');assert.equal(s.guards[0].hp,25);assert(!s.guards[0].open);
  assert.equal(s.guards[0].phase,'stagger');assert.equal(s.skill.dodgeCounters,1);
  assert(!dodgeLesson({...s,outcome:'success',skill:{...s.skill,dodgeCounters:0}}).complete);
  assert(!dodgeLesson({...s,outcome:'defeat'}).complete);
  assert(!dodgeLesson(s).complete,'A good counter is not yet a completed fight');
});


test('a thrust is sidestepped, while a sweep catches that dodge and must be cleared',()=>{
  for(const attack of ['thrust','sweep'])for(const direction of ['side','back']){
    const m=createLizeemEncounter({heroStart:{x:0,z:0},guardStarts:[{x:0,z:-1.9}],attackPattern:[attack]});let s=m.snapshot();
    while(!(s.guards[0].phase==='windup'&&s.guards[0].timer<.18))s=m.tick(1/60);
    s=m.tick(1/60,direction==='side'?{x:1,dodge:true}:{z:1,dodge:true});
    while(s.guards[0].phase!=='recover')s=m.tick(1/60);
    const caught=attack==='sweep'&&direction==='side';
    assert.equal(s.hero.hp,caught?75:100);assert.equal(s.guards[0].open,!caught);
    assert.equal(s.hero.lastDefense.kind,caught?'hit':'dodged');
    assert.equal(s.hero.lastDefense.attack,attack);
    const hp=s.hero.hp;step(m,25);assert.equal(m.snapshot().hero.hp,hp,'One strike cannot hit twice');
  }
});

test('advanced lesson requires actual dodge counters against both attacks',()=>{
  const s=run(createLizeemEncounter({heroStart:{x:0,z:0},guardStarts:[{x:0,z:-1.9}]}),encounterAutoplayInput);
  assert.equal(s.outcome,'success');assert.equal(s.hero.hp,100);assert(s.skill.counterTypes.thrust>0&&s.skill.counterTypes.sweep>0);
  assert(dodgeLesson(s,true).complete);assert(!dodgeLesson(run(create(),encounterAutoplayInput),true).complete);
});

test('sweep remains dangerous after dodge invulnerability expires and never hits through terrain',()=>{
  const m=createLizeemEncounter({heroStart:{x:0,z:0},guardStarts:[{x:0,z:-1}],attackPattern:['sweep'],canHit:()=>false});
  const s=run(m,()=>({attack:true}));assert.equal(s.hero.hp,100);assert.equal(s.guards[0].hp,50);assert.equal(s.skill.dodges,0);
});
