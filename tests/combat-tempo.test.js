import test from 'node:test';
import assert from 'node:assert/strict';
import {createLizeemEncounter,ENCOUNTER_TIMING as T} from '../src/gameplay/combat/lizeem-encounter.js';
import {ENCOUNTER_ATTACKS,MATCHED_ENCOUNTER_ATTACKS,encounterAttack} from '../src/gameplay/combat/encounter-attacks.js';
import {encounterCue} from '../src/gameplay/combat/encounter-cue.js';
import {encounterAutoplayInput} from '../src/gameplay/autoplay/encounter-input.js';
import {sourceModule} from './module-loader.js';
const {encounterGuardPose}=await sourceModule('../src/app/lizeem/encounter-presentation.js');
const create=(tempo='matched',extra={})=>createLizeemEncounter({tempo,heroStart:{x:0,z:0},guardStarts:[{x:0,z:-1.9}],attackPattern:['thrust'],...extra});
const play=(m,policy)=>{let s=m.snapshot();for(let i=0;i<7300&&!s.outcome;i++)s=m.tick(1/60,policy(s));return s;};
test('matched NPC motion and first contact use the player clock, with a deliberate counter recovery',()=>{
  for(const [id,a] of Object.entries(MATCHED_ENCOUNTER_ATTACKS)){
    assert.equal(a.windup+a.strike,T.swing);assert.equal(a.windup+a.contact,T.contact);assert.equal(a.recovery,.65);
    assert(a.contact+a.active<=a.strike);for(const key of ['reach','halfAngle','color','damage'])assert.equal(a[key],ENCOUNTER_ATTACKS[id][key]);
    const m=create('matched',{attackPattern:[id]});let s=m.tick(1/600,{attack:true}),begun=s.time,enemyContact,heroContact;
    for(let i=0;i<500&&(!enemyContact||!heroContact);i++){
      s=m.tick(1/600);if(s.hero.hp<100&&!enemyContact)enemyContact=s.time-begun;if(s.hero.lastStrike&&!heroContact)heroContact=s.hero.lastStrike.at-begun;
    }
    assert(Math.abs(enemyContact-T.contact)<.005,id+' actual NPC contact');assert(Math.abs(heroContact-enemyContact)<.005,id+' actual player/NPC equality');
  }
});
test('warning fill, animation and counter cue follow the selected timing profile',()=>{
  for(const tempo of ['classic','matched'])for(const attack of ['thrust','sweep','overhead']){
    const g={tempo,attack,hp:50,phase:'windup',timer:0,block:0,hurt:0},a=encounterAttack(g);g.timer=a.windup/2;
    assert.equal(encounterCue(g).fraction,.5);assert.equal(encounterGuardPose(g).progress,.5);
    g.phase='strike';g.timer=a.strike/2;assert.equal(encounterGuardPose(g).progress,.5);
    g.phase='recover';g.open=true;g.timer=a.recovery/2;const cue=encounterCue(g);assert.equal(cue.fraction,.5);assert.equal(cue.seconds,a.recovery/2);
  }
});
test('faster swings remain winnable through ordinary dodge/counter input and punish standing spam sooner',()=>{
  for(const guards of [[{x:0,z:-1.9}],[{x:-3,z:-3},{x:3,z:-3},{x:0,z:-5}]]){
    const extra={guardStarts:guards,attackPattern:['thrust','sweep']};
    const old=play(create('classic',extra),()=>({attack:true})),fast=play(create('matched',extra),()=>({attack:true}));
    assert.equal(old.outcome,'defeat');assert.equal(fast.outcome,'defeat');assert(fast.time<old.time);
    const skilled=play(create('matched',extra),encounterAutoplayInput);assert.equal(skilled.outcome,'success');assert(skilled.hero.hp>0);assert(skilled.skill.dodgeCounters>=2);
  }
});
test('old guard exercises retain their tempo controls while real captains use equipment and stats',()=>{
  const model=create('matched',{allyStarts:[{x:0,z:3}],rallyPoint:{x:0,z:0},guardStarts:[{x:0,z:-1.9,commander:{id:'test',name:'Captain',faction:'east'}}]});
  const s=model.snapshot();assert.equal(encounterAttack(s.allies[0]).windup,.1);
  assert.equal(encounterAttack(s.guards[0]).windup,.38/1.16);
  assert.equal(s.tempo,'matched');assert.equal(createLizeemEncounter().snapshot().tempo,'classic');
  assert.throws(()=>create('unknown'),/tempo/);
});
test('accelerated contact cannot hit twice or hit through a blocked line at supported step sizes',()=>{
  for(const dt of [1/60,.1])for(const blocked of [false,true]){
    const m=create('matched',{attackPattern:['sweep'],canHit:()=>!blocked});let s=m.tick(dt);
    while(s.guards[0].phase!=='recover')s=m.tick(dt);
    assert.equal(s.hero.hp,blocked?100:80);const health=s.hero.hp;
    for(let i=0;i<Math.floor(.4/dt);i++)s=m.tick(dt);assert.equal(s.hero.hp,health);
  }
});
