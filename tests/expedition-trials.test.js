import test from 'node:test';
import assert from 'node:assert/strict';
import {EXPEDITION_TRIALS} from '../src/gameplay/combat/expedition-trials.js';
import {COMBAT_TRIALS} from '../src/gameplay/combat/combat-trials.js';
import {createLizeemEncounter,isEncounterGuarding} from '../src/gameplay/combat/lizeem-encounter.js';
import {trialSolids,trialLineClear} from '../src/gameplay/combat/expedition-tactics.js';
import {encounterAutoplayInput} from '../src/gameplay/autoplay/encounter-input.js';
import {encounterAttack} from '../src/gameplay/combat/encounter-attacks.js';
import {createArrivalProgress,ARRIVAL_TRIALS,nextArrivalRound,REQUIRED_TRIALS} from '../src/app/exploration/training/arrival-progress.js';
import {sourceModule} from './module-loader.js';
const THREE=await sourceModule('../vendor/three.module.js');
const {createTrialOpponent}=await sourceModule('../src/app/exploration/trial-opponent-view.js');
const {disposeCharacter}=await sourceModule('../src/content/characters/characters.js');
const {encounterGuardPose}=await sourceModule('../src/app/lizeem/encounter-presentation.js');
const {createTrialMagicView}=await sourceModule('../src/app/exploration/trial-magic-view.js');
const create=(id,extra={})=>createLizeemEncounter({opponent:id,heroStart:{x:0,z:0},guardStarts:[{x:0,z:-6}],move:(p,x,z)=>({x:p.x+x,z:p.z+z}),...extra});
function until(m,predicate,input={},limit=1800,dt=1/60){let s=m.snapshot();for(let i=0;i<limit&&!predicate(s)&&!s.outcome;i++)s=m.tick(dt,typeof input==='function'?input(s):input);assert(predicate(s),s.guards[0].archetype+': '+s.guards[0].phase+' at '+s.time);return s;}

test('all twelve expansion fights are staff-only winnable and clean up their bounded state',()=>{
  assert.equal(EXPEDITION_TRIALS.length,12);assert.equal(COMBAT_TRIALS.length,37);
  for(const p of EXPEDITION_TRIALS){const m=create(p.id);let s=m.snapshot();for(let i=0;i<7200&&!s.outcome;i++){
    s=m.tick(1/60,encounterAutoplayInput(s));assert(s.trialObjects.length<=8);assert(s.mirages.length<=2);assert(s.projectiles.length<=8);
  }assert.equal(s.outcome,'success',p.id);assert.equal(s.trialObjects.length,0);assert.equal(s.mirages.length,0);assert.equal(s.projectiles.length,0);}
});
test('ranger follows during the draw, commits before release, and switches to a knife nearby',()=>{
  const m=create('elven-ranger');let s=until(m,s=>s.guards[0].phase==='windup'),start=s.guards[0].heading;
  s=until(m,s=>s.guards[0].timer<=.26,{x:1},100);assert.notEqual(s.guards[0].heading,start);const committed=s.guards[0].heading;
  s=until(m,s=>s.projectiles.length,{x:-1},100);assert.equal(s.guards[0].heading,committed);assert.equal(s.projectiles[0].kind,'arrow');
  const close=create('elven-ranger',{guardStarts:[{x:0,z:-2}]});s=until(close,s=>s.guards[0].phase==='windup');assert.equal(s.guards[0].attack,'ranger-knife');
});
test('trapper snares are destructible, finite, and can catch their owner',()=>{
  const m=create('goblin-trapper');let s=until(m,s=>s.trialObjects.length);const trap=s.trialObjects[0];assert(trap.arming>0);assert.equal(trap.kind,'trap');
  assert(m.fireballHit(trap.id,26));assert(!m.snapshot().trialObjects.some(o=>o.hp>0));
  const lure=create('goblin-trapper');s=until(lure,s=>s.guards[0].snaredByOwnTrap>0,s=>{
    const g=s.guards[0],trap=s.trialObjects.find(o=>o.kind==='trap'&&o.hp>0);if(!trap)return {z:-1};
    // Stand beyond the snare so the goblin's approach crosses it.
    const dx=trap.x-g.x,dz=trap.z-g.z,d=Math.hypot(dx,dz)||1,target={x:trap.x+dx/d*2,z:trap.z+dz/d*2};
    const tx=target.x-s.hero.x,tz=target.z-s.hero.z,length=Math.hypot(tx,tz)||1;return {x:tx/length,z:tz/length,block:true};
  },1800);assert(s.guards[0].hp<s.guards[0].maxHp);assert(s.guards[0].open);
});
test('berserker commits all three attacks before granting a long opening',()=>{
  const m=create('cref-berserker',{guardStarts:[{x:0,z:-3}]});let s=until(m,s=>s.guards[0].attack==='berserk-second',{x:1});assert(!s.guards[0].open);
  s=until(m,s=>s.guards[0].attack==='berserk-finish',{x:1});assert(!s.guards[0].open);
  s=until(m,s=>s.guards[0].phase==='recover',{x:1});assert(s.guards[0].open);assert(s.guards[0].timer>=2);
});
test('stone troll throws real boulders and exposes its arm during collection',()=>{
  const m=create('oremindi-stone-troll');let s=until(m,s=>s.projectiles.length,{x:1});assert.equal(s.projectiles[0].kind,'boulder');
  s=until(m,s=>s.guards[0].phase==='recover',{x:1});const hp=s.guards[0].hp;m.fireballHit(0,20);assert.equal(m.snapshot().guards[0].hp,hp-30);
  const grab=create('oremindi-stone-troll',{guardStarts:[{x:0,z:-2.5}]});s=until(grab,s=>s.hero.hp<100,{block:true});assert.equal(s.hero.lastDefense.reason,'guard-broken');
});
test('raised stones cannot spawn in bodies and block both walking and attacks until broken',()=>{
  for(const dt of [1/60,.1]){
    const m=create('dwarven-earthshaper');let s=until(m,s=>trialSolids(s).length,{},400,dt);const stones=trialSolids(s);assert(stones.length<=5);
    for(const stone of stones){assert(Math.hypot(stone.x-s.hero.x,stone.z-s.hero.z)>.55+stone.radius);assert(!trialLineClear(s,{x:stone.x,z:stone.z-2},{x:stone.x,z:stone.z+2}));}
    const stone=stones[0],before={...s.hero};
    for(let i=0;i<10;i++){s=m.tick(dt,{x:Math.sign(stone.x-s.hero.x),z:Math.sign(stone.z-s.hero.z)});assert(Math.hypot(stone.x-s.hero.x,stone.z-s.hero.z)>=.55+stone.radius-1e-6);}
    assert(Number.isFinite(before.x));m.fireballHit(stone.id,40);assert(trialLineClear(m.snapshot(),{x:stone.x,z:stone.z-.4},{x:stone.x,z:stone.z+.4}));
  }
});
test('mirror copies are harmless separate presentation data and target lock stays on the real elf',()=>{
  const m=create('dark-elf-mirrorblade');let s=until(m,s=>s.mirages.length,{focusId:0});assert.equal(s.mirages.length,2);assert.equal(s.guards.length,1);assert.equal(s.hero.hp,100);assert.equal(s.hero.focusId,0);
  assert(s.guards[0].dustOrigin);s=until(m,s=>s.guards[0].attack==='mirror-thrust',{x:1,focusId:0});assert.equal(s.hero.focusId,0);
});
test('furnace cooling has a fixed directional hazard and exposes the armor',()=>{
  const m=create('dark-dwarf-furnace-keeper');m.fireballHit(0,20);assert.equal(m.snapshot().guards[0].hp,195);
  let s=until(m,s=>s.guards[0].phase==='vent',{block:true});const heading=s.guards[0].ventHeading,hp=s.guards[0].hp;
  m.fireballHit(0,20);assert.equal(m.snapshot().guards[0].hp,hp-25);
  for(let i=0;i<10;i++)s=m.tick(.1,{z:1});assert.equal(s.guards[0].ventHeading,heading);assert(s.guards[0].open);
});
test('penitent pays health only for a completed offering, which staff or fire can interrupt',()=>{
  const m=create('nanvir-penitent');let s=until(m,s=>s.guards[0].phase==='offering');assert.equal(s.guards[0].hp,170);
  m.fireballHit(0,20);s=m.snapshot();assert.equal(s.guards[0].hp,150);assert.equal(s.guards[0].interruptions,1);assert(!s.guards[0].furyRemaining);
  const complete=create('nanvir-penitent');s=until(complete,s=>s.guards[0].furyRemaining>0,{z:1});assert.equal(s.guards[0].hp,156);s=until(complete,s=>s.guards[0].furyRemaining===0,{z:1});assert(!s.guards[0].empowered);
});
test('reed-stalker is immune underwater and an emergence hit cancels the ambush',()=>{
  const m=create('acor-reed-stalker');assert.equal(m.snapshot().guards[0].phase,'submerged');assert(!m.fireballHit(0,20));
  let s=until(m,s=>s.guards[0].phase==='emerge');m.fireballHit(0,20);s=m.snapshot();assert.equal(s.guards[0].phase,'recover');assert.equal(s.guards[0].interruptions,1);assert(s.guards[0].open);
  s=until(m,s=>s.guards[0].phase==='windup');assert.equal(s.guards[0].attack,'reed-gaff');assert(!s.guards[0].ambushInterrupted,'Interrupting grants an opening rather than an endless re-diving loop');
});
test('oathbound shield protection changes with its stance and attack pattern',()=>{
  const m=create('eshtor-oathbound-champion');assert(isEncounterGuarding(m.snapshot().guards[0]));
  let s=until(m,s=>s.guards[0].stance==='pursuit',{block:true});assert(!isEncounterGuarding(s.guards[0]));assert.deepEqual(s.guards[0].pattern,['oath-pursuit']);
  s=until(m,s=>s.guards[0].stance==='shield',{block:true});assert.deepEqual(s.guards[0].pattern,['oath-shield']);
});
test('binding knots slow without disabling dodges and breaking one interrupts the caster',()=>{
  const m=create('high-goblin-binder');let s=until(m,s=>s.trialObjects.some(o=>o.kind==='binding'));assert(s.hero.slowed);const knot=s.trialObjects[1];
  s=m.tick(.1,{dodge:true,x:1});assert(s.hero.dodge>0);
  m.fireballHit(knot.id,26);s=m.snapshot();assert.equal(s.guards[0].phase,'recover');assert.equal(s.guards[0].interruptions,1);
  const staff=create('high-goblin-binder');s=until(staff,s=>s.trialObjects.length);s=until(staff,s=>s.guards[0].interruptions>0,{attack:true},120);assert(s.guards[0].open);
});
test('wyvern makes short passes, lands for staff counters, and swings its tail behind it',()=>{
  const m=create('young-wyvern');let s=until(m,s=>s.guards[0].flightHeight>0),start=s.guards[0].z;
  s=until(m,s=>s.guards[0].phase==='recover',{x:1});s=m.tick(.01);assert.equal(s.guards[0].flightHeight,0);assert(s.guards[0].z>start+4);assert(s.guards[0].open);
  s=until(m,s=>s.guards[0].attack==='wyvern-tail'&&s.guards[0].phase==='windup',encounterAutoplayInput);assert.equal(encounterAttack(s.guards[0]).headingOffset,Math.PI);
});
test('all new figures animate and fall grounded, with finite transforms and no accumulating offsets',()=>{
  for(const p of EXPEDITION_TRIALS){const actor=createTrialOpponent(p.id),root=actor.group,m=create(p.id);root.position.set(3,10,-5);let s=m.snapshot();
    actor.animate(0,0,true,encounterGuardPose(s.guards[0]));
    if(p.id==='acor-reed-stalker')assert.equal(root.children[0].visible,false,'Submerged body is genuinely hidden, not an undefined visibility flag');
    for(let i=0;i<180&&!s.outcome;i++){s=m.tick(1/60);actor.animate(s.time,s.guards[0].speed,true,encounterGuardPose(s.guards[0]));}
    for(let i=0;i<30;i++)actor.animate(i/60,0,true,{action:'dead',progress:i/29});
    assert(Math.abs(new THREE.Box3().setFromObject(root).min.y-10)<.01,p.id);root.traverse(o=>assert([...o.position.toArray(),...o.quaternion.toArray(),...o.scale.toArray()].every(Number.isFinite),p.id));disposeCharacter(actor);
  }
});
test('effect pools are bounded, pause-stable and disposed, including mirror materials',()=>{
  const scene=new THREE.Scene(),v=createTrialMagicView(scene,{heightAt:()=>0});
  for(const id of ['goblin-trapper','dwarven-earthshaper','dark-elf-mirrorblade','acor-reed-stalker','dark-dwarf-furnace-keeper','high-goblin-binder']){
    const m=create(id);let s=m.snapshot();for(let i=0;i<360&&!s.outcome;i++){s=m.tick(1/60);v.draw(s,s.time);}
    const count=scene.getObjectByName('Expedition field effects').children.length;
    for(let i=0;i<10;i++)v.draw(s,s.time);assert.equal(scene.getObjectByName('Expedition field effects').children.length,count);
    v.draw({...s,outcome:'success'},s.time);assert(!scene.getObjectByName('Expedition field effects').visible);
  }v.dispose();assert.equal(scene.children.length,0);
});
test('a completed 25-opponent checkpoint retains approval and resumes at a new unbeaten opponent',()=>{
  const newer=new Set(EXPEDITION_TRIALS.map(p=>p.id)),old=[...REQUIRED_TRIALS,...COMBAT_TRIALS.filter(p=>!newer.has(p.id)&&!REQUIRED_TRIALS.includes(p.id)).map(p=>p.id)];
  assert.equal(old.length,25);const p=createArrivalProgress({version:2,introduced:true,wins:old,skipped:false,approved:true,departed:true});
  assert(p.snapshot().approved);assert(p.snapshot().departed);const next=nextArrivalRound(p.snapshot());assert(newer.has(ARRIVAL_TRIALS[next].id));assert(p.record(next,'success'));
});
