import test from 'node:test';
import assert from 'node:assert/strict';
import {createOremindiEncounter,oremindiEncounterLayout} from '../src/content/chapters/oremindi/encounter.js';
import {oremindiEncounterReport} from '../src/content/chapters/oremindi/encounter-report.js';
import {createLizeemEncounter} from '../src/gameplay/combat/lizeem-encounter.js';

const terrace=(x,z)=>Math.max(0,Math.min(7,(8-z)*.25));

test('Chapter 3 and the Stillroom share hero timings, orc stats, shield rules and spell damage',()=>{
  const chapter=createOremindiEncounter(),trial=createLizeemEncounter({opponent:'orc-raider',guardStarts:[{x:0,z:-3}],tempo:'matched'});
  const mountain=chapter.snapshot(),practice=trial.snapshot();
  assert.deepEqual(mountain.hero.combat,practice.hero.combat);
  for(const key of ['combat','hp','maxHp','defense','armor','pattern','weapon'])assert.deepEqual(mountain.guards[0][key],practice.guards[0][key],key);
  for(const m of [chapter,trial]){
    m.tick(1/60,{block:true});assert(m.snapshot().hero.blocking);assert.equal(m.beginCast(),false);
    m.tick(1/60);assert(m.beginCast());assert.equal(m.beginCast(),false);
    assert(m.fireballHit(0,26));assert.equal(m.snapshot().hero.lastStrike.damage,26);
  }
  assert.equal(chapter.snapshot().guards[0].hp,trial.snapshot().guards[0].hp);
});

test('spell victories retain the chapter casualty, retreat and explicit proof rules',()=>{
  const model=createOremindiEncounter();model.fireballHit(0,1000);model.fireballHit(1,1000);
  let state=model.snapshot();assert.equal(state.fallen,2);assert.equal(state.outcome,null);
  for(let i=0;i<1500&&!state.outcome;i++)state=model.tick(1/60);
  assert.equal(state.outcome?.result,'victory');assert(state.retreated);assert.equal(state.proofCollected,undefined);
  const finished=model.snapshot();assert.equal(model.fireballHit(2,1000),false);assert.equal(model.beginCast(),false);
  assert.deepEqual(model.snapshot(),finished);
});
function run(options={},input=null,observe=()=>{}){
  const model=createOremindiEncounter(options);let state=model.snapshot();
  for(let i=0;i<16000&&!state.outcome;i++){state=model.tick(1/60,input?input(state,model):model.autoplayInput());observe(state);}
  return {model,state};
}

test('ambush resolves only after two real casualties and the third raider physically leaves',()=>{
  let breaking=null,settling=null;const {state,model}=run({},null,s=>{
    if(!breaking&&s.guards.some(g=>g.routed))breaking=s;
    if(!settling&&s.settling)settling=s;
  });
  assert(breaking&&settling);assert.equal(settling.outcome,null);assert.equal(settling.fallen,2);
  assert.equal(state.outcome.result,'victory');assert.equal(state.fallen,2);assert.equal(state.retreated,true);
  const escaped=state.guards.find(g=>g.hp>0),start=breaking.guards.find(g=>g.id===escaped.id),exit=escaped.retreatPath.at(-1);
  assert(escaped.departed&&escaped.escaped);assert(Math.hypot(escaped.x-start.x,escaped.z-start.z)>8);
  assert(Math.hypot(escaped.x-exit.x,escaped.z-exit.z)<.5);assert.equal(escaped.hp,start.hp);
  assert.deepEqual(state.outcome.proofPoint,state.proofPoint);assert.equal(state.proofCollected,undefined,'Combat reports evidence, never awards chapter inventory');
  assert.deepEqual(model.tick(.5,{attack:true}),state,'Completed encounters are immutable');
});

test('an obstructed retreat never manufactures a proof-eligible victory',()=>{
  const {state}=run({move:(actor,dx,dz)=>actor.routed?{x:actor.x,z:actor.z}:{x:actor.x+dx,z:actor.z+dz}});
  assert.equal(state.fallen,2);assert.equal(state.retreated,false);assert.equal(state.outcome.result,'defeat');
  assert.equal(state.outcome.reason,'retreat-route-blocked');
});

test('inaction loses the ambush, withdrawal is explicit, and a retry starts at full health',()=>{
  const idle=run({},()=>({})).state;assert.equal(idle.outcome.result,'defeat');assert.equal(idle.hero.hp,0);
  const model=createOremindiEncounter();model.tick(.5,{z:1});const withdrawn=model.withdraw();
  assert.equal(withdrawn.outcome.result,'withdrawal');assert.equal(withdrawn.retreated,false);assert.equal(withdrawn.fallen,0);
  assert.deepEqual(model.withdraw(),withdrawn);assert.equal(createOremindiEncounter().snapshot().hero.hp,100);
});

test('pause, snapshots and subdivision preserve a deterministic isolated encounter',()=>{
  const a=createOremindiEncounter(),b=createOremindiEncounter(),original=a.snapshot();
  original.hero.hp=1;original.guards[0].hp=0;
  assert.equal(a.snapshot().hero.hp,100);assert.equal(a.snapshot().fallen,0);
  for(let i=0;i<10;i++){a.tick(.1,{x:.2,z:.4});for(let j=0;j<6;j++)b.tick(1/60,{x:.2,z:.4});}
  const before=a.snapshot();assert.deepEqual(a.tick(0,{attack:true,dodge:true}),before);
  assert.deepEqual(before,b.snapshot());assert.throws(()=>a.tick(-1));assert.throws(()=>a.tick(Infinity));
});

test('the high terrace begins outnumbered with physical archers and an unyielding veteran chief',()=>{
  const s=createOremindiEncounter({kind:'highground'}).snapshot();
  assert.equal(s.allies.length,4);assert.equal(s.guards.length,8);assert.equal(s.allies.filter(a=>a.ranged).length,2);
  assert.deepEqual(s.guards.map(g=>g.unitType),['orc-raider','orc-raider','orc-raider','orc-raider','orc-warrior','orc-warrior','orc-warrior','veteran-orc-warrior']);
  const chief=s.guards.find(g=>g.commanderId);assert.equal(chief.canRetreat,false);assert(chief.maxHp>170);
  assert(s.allies.filter(a=>a.ranged).every(a=>a.z<s.hero.z));assert(s.guards.every(g=>g.z>s.hero.z));
});

test('helping the defenders wins a contested mountain fight; waiting still exposes the hero',()=>{
  const options={kind:'highground',heightAt:terrace},active=run(options).state,idle=run(options,()=>({})).state;
  assert.equal(idle.outcome.result,'defeat');assert.equal(active.outcome.result,'victory');assert(active.chiefDefeated);
  assert(active.time>20&&active.time<180,'There is a playable fight, not an instant scripted result');
  assert(active.squad.damageByHero>100&&active.squad.damageByAllies>100);assert(active.squad.arrowHits>0);
  assert(active.allies.some(a=>a.hp>0),'The player can win beside surviving rangers');
  assert(active.allies.filter(a=>a.ranged).every(a=>a.shots>0&&a.ranged.arrows<36));
  assert.equal(active.guards.find(g=>g.commanderId).hp,0);assert.equal(active.archeryProjectiles.length,0);
});

test('climbing costs movement and a collision callback cannot escape the battlefield',()=>{
  const flat=createOremindiEncounter(),hill=createOremindiEncounter({heightAt:(x)=>x*.5});
  for(let i=0;i<12;i++){flat.tick(1/60,{x:1});hill.tick(1/60,{x:1});}
  assert(hill.snapshot().hero.x<flat.snapshot().hero.x*.85);
  const impossible=createOremindiEncounter({move:()=>({x:100,z:100})});impossible.tick(.1,{x:1});
  assert.deepEqual([impossible.snapshot().hero.x,impossible.snapshot().hero.z],[0,4]);
});

test('computer decisions are independent of render-rate and developer tick batching',()=>{
  const options={kind:'highground',heightAt:terrace},fine=createOremindiEncounter(options),coarse=createOremindiEncounter(options);
  let a=fine.snapshot(),b=coarse.snapshot();
  for(let i=0;i<12000&&!a.outcome;i++)a=fine.autoplayTick(1/60);
  for(let i=0;i<3000&&!b.outcome;i++)b=coarse.autoplayTick(.08);
  assert.equal(a.outcome.result,'victory');assert.deepEqual(b,a,'The same ordinary inputs resolve at the same simulation steps');
});

test('authored rotation preserves formation spacing without mutating supplied layout',()=>{
  const centre={x:-3660,z:-588,heading:Math.PI/2},layout=oremindiEncounterLayout('highground',centre),before=structuredClone(layout);
  assert.equal(layout.hero.x,centre.x-7);assert.equal(layout.hero.z,centre.z);
  const model=createOremindiEncounter({kind:'highground',centre,layout});model.tick(.1);assert.deepEqual(layout,before);
  assert.throws(()=>createOremindiEncounter({kind:'ambush',radius:11.9}));
  assert.throws(()=>oremindiEncounterLayout('other'));
});

test('mountain victory report distinguishes surviving rangers from a party lost in victory',()=>{
  const state={kind:'highground',outcome:{result:'victory',reason:'chief-fallen-formation-broken'},allies:[{hp:0},{hp:0},{hp:0},{hp:0}]};
  const alone=oremindiEncounterReport(state);assert.equal(alone.title,'Victory at a heavy cost');assert.match(alone.text,/None of the 4 rangers survived/);assert.match(alone.text,/Teresod alone/);assert.doesNotMatch(alone.text,/rangers hold/);
  state.allies[1].hp=20;const supported=oremindiEncounterReport(state);assert.equal(supported.title,'The terrace is held');assert.match(supported.text,/1 of 4 rangers survived/);assert.doesNotMatch(supported.text,/alone/);
  const rehearsal=oremindiEncounterReport(state,{rehearsal:true});assert.match(rehearsal.text,/changed no chapter progress/);assert.doesNotMatch(rehearsal.text,/Return to Taleth/);
});
