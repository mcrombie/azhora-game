import test from 'node:test';
import assert from 'node:assert/strict';
import {COMBAT_TRIALS} from '../src/gameplay/combat/combat-trials.js';
import {createLizeemEncounter,isEncounterGuarding} from '../src/gameplay/combat/lizeem-encounter.js';
import {encounterAttack} from '../src/gameplay/combat/encounter-attacks.js';
import {encounterAutoplayInput} from '../src/gameplay/autoplay/encounter-input.js';
import {createOvesosPractice} from '../src/dev/tools/ovesos-practice.js';
import {encounterBodyGap,moveEncounterBody} from '../src/gameplay/combat/encounter-space.js';
import {sourceModule} from './module-loader.js';
const THREE=await sourceModule('../vendor/three.module.js');
const {createTrialOpponent}=await sourceModule('../src/app/exploration/trial-opponent-view.js');
const {disposeCharacter}=await sourceModule('../src/content/characters/characters.js');
const {createEncounterWarnings,encounterGuardPose}=await sourceModule('../src/app/lizeem/encounter-presentation.js');
const create=(id,extra={})=>createLizeemEncounter({opponent:id,heroStart:{x:0,z:0},guardStarts:[{x:0,z:-6}],move:(p,x,z)=>({x:p.x+x,z:p.z+z}),...extra});
const play=(id,policy)=>{const m=create(id);let s=m.snapshot();for(let i=0;i<5500&&!s.outcome;i++)s=m.tick(1/60,policy(s));return s;};

test('staff guard reduces frontal damage, allows chip damage, and does not protect the back or a stomp',()=>{
  function firstHit(id,block,turn=false){
    const m=create(id,{guardStarts:[{x:0,z:id==='ogre-bruiser'?-2.5:-1.9}]});let s=m.snapshot();
    if(turn)s=m.tick(1/60,{z:1});
    for(let i=0;i<300&&s.hero.hp===100;i++)s=m.tick(1/60,{block});
    assert(s.hero.hp<100);return s;
  }
  const raw=firstHit('bandit',false),guard=firstHit('bandit',true),rear=firstHit('bandit',true,true);
  assert.equal(100-guard.hero.hp,Math.ceil((100-raw.hero.hp)*.45));
  assert.equal(guard.hero.lastDefense.kind,'blocked');assert.equal(guard.skill.staffBlocks,1);
  assert.equal(rear.hero.hp,raw.hero.hp);assert.equal(rear.skill.staffBlocks,0);
  const stomp=firstHit('ogre-bruiser',true);assert.equal(stomp.hero.lastDefense.reason,'unblockable');assert.equal(stomp.skill.staffBlocks,0);
});

test('staff guard slows movement and cannot overlap a strike, dodge or spell release',()=>{
  const m=create('bandit',{passive:true,guardStarts:[{x:0,z:-8}]});
  let s=m.tick(.1,{block:true,attack:true,x:1});
  assert(s.hero.blocking);assert.equal(s.hero.swing,0);assert.equal(s.hero.x,s.hero.combat.moveSpeed*.45*.1);assert(!m.beginCast());
  s=m.tick(.1,{block:true,dodge:true});assert(!s.hero.blocking);assert(s.hero.dodge>0);assert(!m.beginCast());
  for(let i=0;i<30;i++)s=m.tick(1/60);
  s=m.tick(1/60,{attack:true});assert(s.hero.swing>0);assert(!m.beginCast());
  s=m.tick(1/60,{block:true});assert(!s.hero.blocking,'Guard cannot cancel a swing');
  for(let i=0;i<60;i++)s=m.tick(1/60);
  assert(m.beginCast());s=m.tick(.1,{block:true,attack:true,dodge:true});assert(!s.hero.blocking&&!s.hero.swing&&!s.hero.dodge);
  for(let i=0;i<30;i++)s=m.tick(1/60);
  s=m.tick(1/60,{block:true});assert(s.hero.blocking);
  s=m.tick(1/60);assert(!s.hero.blocking);assert(m.canCast());
});

test('any trial can be selected without awarding skipped victories; retry and progression keep the chosen round',async()=>{
  for(let first=0;first<COMBAT_TRIALS.length;first++){
    let opened,outcome=null,restores=0;
    const p=createOvesosPractice({startingRound:()=>first,capture:()=>({}),prepare:async()=>{},restore:()=>restores++,onError:assert.fail,
      open:options=>{opened=options;return {snapshot:()=>({outcome,hero:{hp:70},time:12}),dispose(){}};}});
    await p.start('trials');assert.equal(opened.trial.id,COMBAT_TRIALS[first].id);assert.equal(p.state().results.length,0);
    p.retry();assert.equal(p.state().round,first);assert.equal(p.state().results.length,0);
    outcome='success';p.advance();assert.equal(p.state().results.length,1);
    assert.equal(p.state().results[0].id,COMBAT_TRIALS[first].id);
    if(first<COMBAT_TRIALS.length-1)assert.equal(p.state().round,first+1);else assert(!p.state().active);
    p.finish();assert.equal(restores,1);
  }
});

test('invalid starting rounds fail before loading or capturing a session',async()=>{
  for(const startingRound of [()=>-1,()=>COMBAT_TRIALS.length,()=>1.2,()=>NaN]){
    let failed=false;const unexpected=()=>assert.fail('Must reject before touching the world');
    const p=createOvesosPractice({startingRound,capture:unexpected,prepare:unexpected,open:unexpected,restore:unexpected,onError:()=>failed=true});
    await p.start('trials');assert(failed);assert(!p.state().active);
  }
});

test('trials allow patient practice beyond 90 seconds while timed encounters retain their deadline',()=>{
  for(const id of COMBAT_TRIALS.map(r=>r.id)){
    const m=create(id,{passive:true,guardStarts:[{x:0,z:-30}]});let s;
    for(let i=0;i<960;i++)s=m.tick(.1,{z:1});
    assert.equal(s.hero.hp,100,id);assert.equal(s.outcome,null,id+' has no hidden timeout');assert(s.time>95);
  }
  const timed=create('wolf',{timeLimit:2});for(let i=0;i<21;i++)timed.tick(.1,{z:1});assert.equal(timed.snapshot().outcome,'defeat');
  const regular=createLizeemEncounter({passive:true});for(let i=0;i<910;i++)regular.tick(.1);assert.equal(regular.snapshot().outcome,'defeat');
});

test('trial starts facing its opponent for every arena orientation',()=>{
  for(const round of COMBAT_TRIALS)for(const heading of [0,Math.PI/2,Math.PI,-Math.PI/2]){
    const x=Math.sin(heading)*8,z=Math.cos(heading)*8;
    const s=create(round.id,{guardStarts:[{x,z}]}).snapshot();
    assert(Math.sin(s.hero.heading)*x+Math.cos(s.hero.heading)*z>7.99);
  }
});

test('thirty-seven distinct opponents are ordered by measured difficulty and can be defeated',()=>{
  assert.equal(COMBAT_TRIALS.length,37);assert.equal(new Set(COMBAT_TRIALS.map(r=>r.id)).size,37);
  assert(COMBAT_TRIALS.every((r,i)=>!i||r.difficulty>=COMBAT_TRIALS[i-1].difficulty));
  const spam={};
  for(const round of COMBAT_TRIALS){
    const m=create(round.id),initial=m.snapshot();assert.equal(initial.guards.length,1);assert.equal(initial.objective,null);assert.equal(initial.hero.hp,100);
    assert.equal(initial.guards[0].name,round.name);assert.equal(isEncounterGuarding(initial.guards[0]),round.guarding);
    const idle=play(round.id,()=>({}));assert.equal(idle.outcome,'defeat',round.id);assert(idle.time<90,round.id);
    const careless=play(round.id,()=>({attack:true}));spam[round.id]=careless.hero.hp;
    const skilled=play(round.id,encounterAutoplayInput);assert.equal(skilled.outcome,'success',round.id);assert(skilled.skill.counters>0,round.id);
  }
  assert(spam['bramble-goblin']>spam.wolf&&spam.wolf>spam.bandit);
  assert.throws(()=>create('unknown'),/one known opponent/);
  assert.throws(()=>create('wolf',{guardStarts:[{x:0,z:-3},{x:1,z:-3}]}),/one known opponent/);
});

test('wolf really lunges on its committed heading, respects terrain and deals one hit',()=>{
  for(const dt of [1/60,.1])for(const blocked of [false,true]){
    const m=create('wolf',{guardStarts:[{x:0,z:-2.8}],move:(p,x,z)=>({x:p.x+x,z:blocked?Math.min(-2.8,p.z+z):p.z+z})});let s=m.snapshot();
    for(let i=0;i<200&&s.guards[0].phase!=='recover';i++)s=m.tick(dt);
    const g=s.guards[0];assert.equal(g.phase,'recover');assert.equal(g.attackOrigin.z,-2.8);
    assert(Math.abs(g.z-(blocked?-2.8:-1.65))<1e-6);
    assert.equal(s.hero.hp,blocked?100:83);assert.equal(g.heading,0);
  }
});

test('trial warnings and rigs match each creature and dispose cleanly',()=>{
  const scene=new THREE.Scene(),warnings=createEncounterWarnings(scene,1);
  for(const round of COMBAT_TRIALS){
    const model=create(round.id),g=model.snapshot().guards[0],actor=createTrialOpponent(round.id);scene.add(actor.group);
    const box=new THREE.Box3().setFromObject(actor.group);assert(box.max.y-box.min.y>.5);assert.equal(actor.group.userData.trialOpponent,round.id);
    for(const attack of round.pattern){g.attack=attack;g.phase='windup';g.timer=encounterAttack(g).windup/2;g.attackOrigin={x:g.x,z:g.z};
      warnings.draw([g]);actor.animate(1,0,true,encounterGuardPose(g));scene.updateMatrixWorld(true);
      const shape=scene.children.find(o=>o.userData.combatWarning);assert(shape.visible);assert.equal(shape.geometry.parameters.outerRadius,encounterAttack(g).reach+(encounterAttack(g).lungeDistance??0));
      assert.equal(encounterGuardPose(g).attackStyle,encounterAttack(g).style);
    }
    const meshes=[];actor.group.traverse(o=>{if(o.isMesh)meshes.push(o)});assert(meshes.length>3);
    disposeCharacter(actor);assert(!scene.children.includes(actor.group));
  }
  warnings.dispose();assert.equal(scene.children.length,0);
});

test('trial progression requires victory, retries current round and restores session exactly once',async()=>{
  let prepares=0,restores=0,disposed=0,outcome=null,opened,attempts=[];
  const p=createOvesosPractice({capture:()=>({original:true}),prepare:async()=>{prepares++;},
    open:options=>{opened=options;attempts.push([options.round,options.attempt]);outcome=null;return {snapshot:()=>({outcome,hero:{hp:70},time:12}),dispose(){disposed++;}};},
    restore:s=>{assert(s.original);restores++;},onError:assert.fail});
  await p.start('trials');assert.equal(opened.trial.id,'bramble-goblin');assert(!p.advance());
  outcome='success';assert(p.advance());assert.equal(opened.trial.id,COMBAT_TRIALS[1].id);assert.equal(p.state().results.length,1);
  outcome='defeat';p.retry();assert.equal(opened.trial.id,COMBAT_TRIALS[1].id);assert.equal(p.state().round,1);assert.equal(p.state().results.length,1);
  outcome='success';assert(p.advance());assert.equal(opened.trial.id,COMBAT_TRIALS[2].id);assert(!p.compare());
  for(let i=2;i<COMBAT_TRIALS.length;i++){outcome='success';assert(p.advance());}assert.equal(p.state().results.length,COMBAT_TRIALS.length);assert(!p.state().active);
  assert.equal(prepares,1);assert.equal(restores,1);assert.equal(disposed,COMBAT_TRIALS.length+1);p.finish();assert.equal(restores,1);
  assert.deepEqual(attempts,[[0,1],[1,1],[1,2],...Array.from({length:COMBAT_TRIALS.length-2},(_,i)=>[i+2,1])]);
  await p.start('trials');assert.equal(p.state().round,0);assert.equal(p.state().results.length,0);p.finish();
});

test('trial properties do not leak into classic or matched guards',()=>{
  create('wolf');for(const tempo of ['classic','matched']){const s=createLizeemEncounter({tempo}).snapshot();assert(s.guards.every(g=>!g.archetype&&g.hp===50&&isEncounterGuarding(g)));assert.equal(encounterAttack(s.guards[0]).windup,tempo==='classic'?.85:.1);}
});

test('ogre stomp reaches behind it, commits its heading, and hits only once at different frame rates',()=>{
  for(const dt of [1/60,.1]){
    const m=create('ogre-bruiser',{guardStarts:[{x:0,z:-2}],heroAttributes:{mobility:20}});let s=m.tick(dt);
    assert.equal(s.guards[0].attack,'ogre-stomp');const heading=s.guards[0].heading;
    // Run around to its rear while the foot is raised; no dodge invulnerability.
    for(let i=0;i<100&&s.guards[0].phase!=='recover';i++){
      const h=s.hero,g=s.guards[0],x=h.x-g.x,z=h.z-g.z;
      const turn=3.5*dt,nx=x*Math.cos(turn)+z*Math.sin(turn),nz=z*Math.cos(turn)-x*Math.sin(turn);
      const hp=s.hero.hp;s=m.tick(dt,{x:(nx-x)/(8*dt),z:(nz-z)/(8*dt)});
      if(s.hero.hp<hp)assert(s.hero.z<s.guards[0].z,'Circular stomp catches a target behind the committed facing');
      assert.equal(s.guards[0].heading,heading);
    }
    assert.equal(s.hero.hp,69);assert.equal(s.hero.lastDefense.kind,'hit');assert(s.guards[0].contactResolved);assert(s.guards[0].open);
    const hp=s.hero.hp;for(let i=0;i<5;i++)s=m.tick(dt);assert.equal(s.hero.hp,hp);
  }
});

test('ogre cannot be stunlocked by staff or fireballs and its club sequence survives close-range stomps',()=>{
  const m=create('ogre-bruiser',{guardStarts:[{x:0,z:-2}]});let s=m.tick(1/60),g=s.guards[0];
  assert.equal(g.attack,'ogre-stomp');assert.equal(g.phase,'windup');
  assert(m.fireballHit(g.id,10));assert.equal(m.snapshot().guards[0].phase,'windup');
  for(let i=0;i<12;i++)s=m.tick(1/60,{attack:true});
  assert(s.guards[0].hp<190);assert.equal(s.guards[0].phase,'windup');
  const trade=create('ogre-bruiser',{guardStarts:[{x:0,z:-2}]});s=trade.snapshot();
  for(let i=0;i<2500&&!s.outcome;i++)s=trade.tick(1/60,{attack:true});
  assert.equal(s.outcome,'defeat');assert(s.guards[0].hp>0,'Trading at its feet must not beat the final trial');
  const skilled=play('ogre-bruiser',encounterAutoplayInput);
  assert.equal(skilled.outcome,'success');assert(skilled.skill.counterTypes['ogre-slam']>0);
});

test('ogre body blocks walking and dodges at its actual width, including after a terrain slide',()=>{
  const s=create('ogre-bruiser',{guardStarts:[{x:0,z:-2}]}).snapshot(),h=s.hero,g=s.guards[0];
  assert.equal(encounterBodyGap(h,g),1.5);
  for(const slide of [false,true]){
    const terrain=(p,x,z)=>({x:p.x+x,z:p.z+z-(slide?.1:0)});
    const next=moveEncounterBody(h,0,-5,[h,g],terrain);
    assert(Math.hypot(next.x-g.x,next.z-g.z)>=1.5-1e-6);assert(next.obstruction);
  }
});

test('ogre has a full circular stomp warning and a raised foot that lands at contact',()=>{
  const scene=new THREE.Scene(),warnings=createEncounterWarnings(scene,1),actor=createTrialOpponent('ogre-bruiser');
  scene.add(actor.group);const g=create('ogre-bruiser').snapshot().guards[0],a=g.combat.attacks['ogre-stomp'];
  g.attack='ogre-stomp';g.phase='windup';g.timer=a.windup*.15;
  warnings.draw([g]);const shape=scene.children.find(o=>o.userData.combatWarning);
  assert.equal(shape.geometry.parameters.thetaLength,Math.PI*2);
  assert(actor.group.getObjectByName('Ogre heavy wooden club'));assert(!actor.group.getObjectByName('Mallec’s tally'));
  const foot=actor.group.getObjectByName('Right Ankle'),v=new THREE.Vector3();
  actor.animate(1,0,true,encounterGuardPose(g));const raised=foot.getWorldPosition(v).y;
  g.phase='strike';g.timer=a.strike-a.contact;
  actor.animate(1.1,0,true,encounterGuardPose(g));const landed=foot.getWorldPosition(v).y;
  assert(raised-landed>.45,'Stomp visibly raises and plants its foot');
  g.phase='recover';g.open=true;g.timer=a.recovery;
  for(let i=0;i<30;i++)actor.animate(1.2+i/60,0,true,encounterGuardPose(g));
  assert(Math.abs(foot.getWorldPosition(v).y-landed)<.1,'Repeated poses do not accumulate offsets');
  disposeCharacter(actor);warnings.dispose();assert.equal(scene.children.length,0);
});

test('larger fallen opponents settle on the floor instead of scaling the grounding correction twice',()=>{
  for(const id of ['militiaman','orc-raider','orc-warrior','veteran-orc-warrior','ogre-bruiser']){
    const actor=createTrialOpponent(id);actor.group.position.set(4,12,-5);actor.group.rotation.y=.7;
    for(let i=0;i<60;i++)actor.animate(i/60,0,true,{action:'idle'});
    for(let i=0;i<45;i++)actor.animate(1+i/60,0,true,{action:'dead',progress:Math.min(1,i/24)});
    assert(Math.abs(new THREE.Box3().setFromObject(actor.group).min.y-12)<.001,id+' lands on the actual floor');
    disposeCharacter(actor);
  }
});
