import test from 'node:test';
import assert from 'node:assert/strict';
import {FRONTIER_TRIALS} from '../src/gameplay/combat/frontier-trials.js';
import {COMBAT_TRIALS} from '../src/gameplay/combat/combat-trials.js';
import {createLizeemEncounter} from '../src/gameplay/combat/lizeem-encounter.js';
import {encounterAttack} from '../src/gameplay/combat/encounter-attacks.js';
import {encounterFeedback} from '../src/gameplay/combat/encounter-feedback.js';
import {encounterAutoplayInput} from '../src/gameplay/autoplay/encounter-input.js';
import {sourceModule} from './module-loader.js';
const THREE=await sourceModule('../vendor/three.module.js');
const {createTrialOpponent}=await sourceModule('../src/app/exploration/trial-opponent-view.js');
const {disposeCharacter}=await sourceModule('../src/content/characters/characters.js');
const {createTrialMagicView}=await sourceModule('../src/app/exploration/trial-magic-view.js');
const {encounterGuardPose}=await sourceModule('../src/app/lizeem/encounter-presentation.js');
const create=(id,extra={})=>createLizeemEncounter({opponent:id,heroStart:{x:0,z:0},guardStarts:[{x:0,z:-2}],move:(p,x,z)=>({x:p.x+x,z:p.z+z}),...extra});

test('feedback explains mist immunity and names destructible objects correctly',()=>{
  const ghost=create('acor-wraith');ghost.fireballHit(0,26);assert.match(encounterFeedback(ghost.snapshot()).text,/passed through the mist/);
  const dwarf=create('dark-dwarf-runesmith'),id=dwarf.snapshot().trialObjects[0].id;
  dwarf.fireballHit(id,26);assert.match(encounterFeedback(dwarf.snapshot()).text,/Ward anchor: -26/);
  dwarf.fireballHit(id,26);assert.match(encounterFeedback(dwarf.snapshot()).text,/Ward anchor: -14/);
});
function until(m,predicate,input={},limit=1800,dt=1/60){let s=m.snapshot();for(let i=0;i<limit&&!predicate(s);i++)s=m.tick(dt,typeof input==='function'?input(s):input);assert(predicate(s),'Expected encounter condition: '+s.guards[0].archetype+' '+s.guards[0].phase);return s;}

test('all ten new opponents are single combatants with bounded, beatable mechanics',()=>{
  assert.equal(COMBAT_TRIALS.length,37);assert.equal(new Set(COMBAT_TRIALS.map(p=>p.id)).size,37);
  for(const p of FRONTIER_TRIALS){
    const m=create(p.id,{guardStarts:[{x:0,z:-6}]});let s=m.snapshot();assert.equal(s.guards.length,1);assert.equal(s.hero.hp,100);
    for(let i=0;i<7200&&!s.outcome;i++)s=m.tick(1/60,encounterAutoplayInput(s));
    assert.equal(s.outcome,'success',p.id+' can be beaten with starting stats and staff only');
    assert.equal(s.projectiles.length,0);assert.equal(s.trialObjects.length,0);assert.equal(s.echoes.length,0);
  }
});
test('sling stones travel, can be blocked, and do not multiply during a strike',()=>{
  for(const dt of [1/60,.1]){
    const m=create('goblin-slinger',{guardStarts:[{x:0,z:-7}]});let s=until(m,s=>s.projectiles.length,{},100,dt);
    assert.equal(s.projectiles[0].kind,'stone');assert.equal(s.hero.hp,100);
    s=until(m,s=>s.hero.hp<100,{block:true},100,dt);assert.equal(s.hero.lastDefense.kind,'blocked');assert.equal(s.projectiles.length,0);
    const retreat=until(m,s=>s.guards[0].retreatRemaining>0,{block:true},300,dt);assert(retreat.guards[0].retreatRemaining<=1.2);
  }
});
test('Cref hook breaks a held staff guard; an ordinary cut remains blockable',()=>{
  const m=create('cref-axeman');let s=until(m,s=>s.hero.hp<100,{block:true});assert.equal(s.hero.lastDefense.kind,'blocked');
  s=until(m,s=>s.hero.guardBroken>0,{block:true});assert.equal(s.hero.lastDefense.reason,'guard-broken');assert(!s.hero.blocking);
  s=m.tick(.1,{block:true});assert(!s.hero.blocking);s=until(m,s=>s.hero.guardBroken===0,{block:true});s=m.tick(.01,{block:true});assert(s.hero.blocking);
});
test('centaur charge travels on its committed line and hind kick faces backward',()=>{
  for(const dt of [1/60,.1]){
    const m=create('centaur-lancer',{guardStarts:[{x:0,z:-6}]});let s=until(m,s=>s.guards[0].phase==='windup',{},100,dt),heading=s.guards[0].heading;
    s=until(m,s=>s.guards[0].phase==='recover',{x:1},200,dt);
    assert.equal(s.guards[0].heading,heading);assert(s.guards[0].z>-1);assert.equal(s.hero.hp,100);
    const close=create('centaur-lancer');s=until(close,s=>s.hero.hp<100,{},200,dt);
    assert.equal(s.guards[0].attack,'centaur-kick');assert(Math.cos(s.guards[0].heading)<-.99);assert.equal(s.hero.hp,78);
  }
});
test('satyr feint is harmless and its follow-up is the committed attack',()=>{
  const m=create('satyr-thornrunner');let s=until(m,s=>s.guards[0].attack==='satyr-leap');assert.equal(s.hero.hp,100);assert(!s.guards[0].open);
  s=until(m,s=>s.hero.hp<100);assert.equal(s.guards[0].attack,'satyr-leap');
});
test('web slows walking, can be struck or burned, expires, and uses at most three patches',()=>{
  const m=create('web-spider');let s=until(m,s=>s.trialObjects.some(o=>o.kind==='web'));const web=s.trialObjects[0];assert(s.hero.slowed);
  const x=s.hero.x;s=m.tick(.1,{x:1});assert(Math.abs(s.hero.x-x-.18)<1e-6);
  assert(m.fireballHit(web.id,26));s=m.tick(.01);assert(!s.trialObjects.length);assert(!s.hero.slowed);
  s=until(m,s=>s.trialObjects.length>0,{block:true});const id=s.trialObjects[0].id;
  s=until(m,s=>!s.trialObjects.some(o=>o.id===id&&o.hp>0),{attack:true},120);assert(!s.trialObjects.some(o=>o.id===id&&o.hp>0));
  const safe=create('web-spider',{heroAttributes:{vitality:20}});s=safe.snapshot();
  for(let i=0;i<1800&&!s.outcome;i++){s=safe.tick(1/60,encounterAutoplayInput(s));assert(s.trialObjects.filter(o=>o.kind==='web').length<=3);}
});
test('golem plates reduce both physical and fire damage and recovery exposes its core',()=>{
  const m=create('guild-golem');assert(m.fireballHit(0,26));assert.equal(m.snapshot().guards[0].hp,155);
  let s=until(m,s=>s.guards[0].phase==='recover',{x:1});const hp=s.guards[0].hp;
  assert(m.fireballHit(0,26));assert.equal(m.snapshot().guards[0].hp,hp-33);
});
test('Acor wraith is unhittable in mist but vulnerable throughout its materialized attack and recovery',()=>{
  const m=create('acor-wraith');assert.equal(m.snapshot().guards[0].phase,'veil');assert(!m.fireballHit(0,26));assert.equal(m.snapshot().guards[0].hp,140);
  let s=until(m,s=>s.guards[0].phase==='windup');assert(m.fireballHit(0,26));assert.equal(m.snapshot().guards[0].phase,'windup');
  assert.equal(m.snapshot().guards[0].hp,114);s=until(m,s=>s.guards[0].phase==='veil',{x:1});assert(!m.fireballHit(0,26));
});
test('runestone is a real staff and fire target; its ward ends on destruction or leaving the radius',()=>{
  const m=create('dark-dwarf-runesmith');const anchor=m.snapshot().trialObjects[0];assert(m.snapshot().guards[0].warded);
  m.fireballHit(0,26);assert.equal(m.snapshot().guards[0].hp,143);
  assert(m.fireballHit(anchor.id,26));assert(m.fireballHit(anchor.id,26));assert(!m.snapshot().guards[0].warded);
  m.fireballHit(0,26);assert.equal(m.snapshot().guards[0].hp,117);
  const staff=create('dark-dwarf-runesmith',{heroStart:{x:2,z:-1}});staff.tick(.1,{z:-1});
  const broken=until(staff,s=>!s.trialObjects.some(o=>o.kind==='anchor'&&o.hp>0),{attack:true},180);assert(!broken.guards[0].warded);
  const lure=create('dark-dwarf-runesmith');const outside=until(lure,s=>!s.guards[0].warded,{z:1},500);assert(outside.trialObjects[0].hp>0);
});
test('blood seal requires a completed inscription, can be interrupted, and empowers only inside its boundary',()=>{
  const m=create('nanvir-adept');let s=until(m,s=>s.guards[0].phase==='inscribe');assert(!s.trialObjects.length);
  m.fireballHit(0,26);s=m.snapshot();assert.equal(s.guards[0].interruptions,1);assert(!s.trialObjects.length);assert.equal(s.guards[0].phase,'recover');
  const complete=create('nanvir-adept');s=until(complete,s=>s.guards[0].empowered,{z:1});assert.equal(s.trialObjects[0].kind,'seal');
  s=until(complete,s=>!s.guards[0].empowered,{z:1});assert(s.trialObjects[0].hp>0,'Luring out works before the seal expires');
});
test('barrow echo has its own delayed, fixed danger area and never survives its owner',()=>{
  for(const dt of [1/60,.1]){
    const m=create('eshtor-barrow-guardian');let s=until(m,s=>s.echoes.length,{},100,dt);const echo={...s.echoes[0]},hp=s.hero.hp;
    assert(echo.remaining>0);assert.equal(s.echoes.length,1);
    for(let i=0;i<2;i++){s=m.tick(dt);assert.equal(s.echoes[0].x,echo.x);assert.equal(s.echoes[0].heading,echo.heading);}
    s=until(m,s=>s.hero.lastDefense?.reason==='spectral-echo',{},200,dt);assert(s.hero.hp<hp);
    m.fireballHit(0,10000);s=m.tick(dt);assert.equal(s.outcome,'success');assert(!s.echoes.length);
  }
});
test('new figures articulate and fall on the actual ground without accumulating offsets',()=>{
  for(const p of FRONTIER_TRIALS){
    const actor=createTrialOpponent(p.id),root=actor.group;root.position.set(3,10,-5);root.rotation.y=.3;
    assert.equal(root.userData.frontierTrial,p.id);
    const model=create(p.id),g=model.snapshot().guards[0];
    for(const key of Object.keys(g.combat.attacks)){
      g.attack=key;g.phase='windup';g.timer=encounterAttack(g).windup*.2;
      for(let i=0;i<4;i++)actor.animate(i/60,1,true,encounterGuardPose(g));
    }
    for(let i=0;i<30;i++)actor.animate(i/60,0,true,{action:'dead',progress:i/29});
    const box=new THREE.Box3().setFromObject(root);assert(Math.abs(box.min.y-10)<.01,p.id+' grounded death');
    root.traverse(o=>assert([...o.position.toArray(),...o.scale.toArray(),...o.quaternion.toArray()].every(Number.isFinite),p.id+' finite pose'));
    disposeCharacter(actor);
  }
});
test('field effects are bounded, pause-independent, and fully released on exit',()=>{
  const scene=new THREE.Scene(),view=createTrialMagicView(scene,{heightAt:()=>0});
  const root=scene.getObjectByName('Trial field effects'),children=root.children.length;
  for(const id of ['web-spider','dark-dwarf-runesmith','nanvir-adept','eshtor-barrow-guardian']){
    const m=create(id);let s=m.snapshot();for(let i=0;i<240&&!s.outcome;i++){s=m.tick(1/60);view.draw(s,s.time);}
    assert.equal(root.children.length,children);assert(root.children.some(o=>o.visible),id+' visible mechanic');
    view.draw({...s,outcome:'success'},s.time);assert(!root.visible);
  }
  view.dispose();assert.equal(scene.children.length,0);
});
