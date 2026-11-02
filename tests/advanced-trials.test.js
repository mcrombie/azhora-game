import test from 'node:test';
import assert from 'node:assert/strict';
import {createLizeemEncounter,isEncounterGuarding} from '../src/gameplay/combat/lizeem-encounter.js';
import {ADVANCED_TRIALS} from '../src/gameplay/combat/advanced-trials.js';
import {encounterCue} from '../src/gameplay/combat/encounter-cue.js';
import {sourceModule} from './module-loader.js';
const THREE=await sourceModule('../vendor/three.module.js');
const {createTrialOpponent}=await sourceModule('../src/app/exploration/trial-opponent-view.js');
const {disposeCharacter}=await sourceModule('../src/content/characters/characters.js');
const {createTrialMagicView}=await sourceModule('../src/app/exploration/trial-magic-view.js');
const create=(id,extra={})=>createLizeemEncounter({opponent:id,heroStart:{x:0,z:0},guardStarts:[{x:0,z:-2}],move:(p,x,z)=>({x:p.x+x,z:p.z+z}),...extra});
function until(m,predicate,input={},limit=1800,dt=1/60){let s=m.snapshot();for(let i=0;i<limit&&!predicate(s);i++)s=m.tick(dt,typeof input==='function'?input(s):input);assert(predicate(s),'Expected encounter condition');return s;}

test('elven combination has no first-hit opening and cannot be cancelled by staff or Fireball',()=>{
  for(const dt of [1/60,.1]){
    const m=create('elven-duelist');let s=m.tick(dt),heading=s.guards[0].heading;
    assert(m.fireballHit(0,10));assert.equal(m.snapshot().guards[0].phase,'windup');
    let firstResolved=false,followup=false;
    for(let i=0;i<100&&!followup;i++){
      s=m.tick(dt,{x:1,attack:true});const g=s.guards[0];
      assert.equal(g.heading,heading,'Both blades keep their committed direction');
      if(g.attack==='elf-first'){assert(!g.open);if(g.contactResolved)firstResolved=true;}
      if(g.attack==='elf-second'){followup=true;assert.equal(g.phase,'windup');assert(!g.open);}
    }
    assert(firstResolved&&followup);s=until(m,s=>s.guards[0].open,{x:1},100,dt);
    assert.equal(s.guards[0].attack,'elf-second');assert.equal(encounterCue(s.guards[0]).kind,'opening');
    s=until(m,s=>s.guards[0].phase==='recover',{},100,dt);const before={...s.guards[0]};s=m.tick(dt);
    assert(Math.hypot(s.guards[0].x-before.x,s.guards[0].z-before.z)>0,'Elf takes a visible recovery sidestep');
  }
});

test('shieldwarden turns at a bounded rate and his blocked shove respects terrain',()=>{
  const turn=create('dwarven-shieldwarden',{heroStart:{x:0,z:10},guardStarts:[{x:0,z:0}]});let s=turn.snapshot();
  for(let i=0;i<50;i++){const before=s.guards[0].heading;s=turn.tick(.1,{x:1});const delta=Math.atan2(Math.sin(s.guards[0].heading-before),Math.cos(s.guards[0].heading-before));assert(Math.abs(delta)<=.150001);}
  function shove(obstacle){
    const m=create('dwarven-shieldwarden',{guardStarts:[{x:0,z:-1.6}],move:(p,x,z)=>({x:p.x+x,z:obstacle?Math.min(.3,p.z+z):p.z+z})});
    return until(m,s=>s.hero.hp<100,{block:true});
  }
  const open=shove(false),wall=shove(true);
  assert.equal(open.guards[0].attack,'warden-shove');assert.equal(open.hero.lastDefense.kind,'blocked');assert(open.hero.z>1.5);
  assert(wall.hero.z<=.3);assert.equal(open.hero.hp,wall.hero.hp);
});

test('mage bolt travels before impact, can be sidestepped, blocked or dodged, and stops at obstacles',()=>{
  for(const dt of [1/60,.1]){
    function launch(extra={}){
      const m=create('rogue-battlemage',{guardStarts:[{x:0,z:-8}],...extra});const s=until(m,s=>s.projectiles.length>0,{},100,dt);
      assert.equal(s.hero.hp,100,'Cast is not an instant ray hit');assert.equal(s.projectiles.length,1);return m;
    }
    const raw=launch(),blocked=launch(),side=launch(),dodge=launch();
    const hit=until(raw,s=>s.hero.hp<100,{},100,dt),guard=until(blocked,s=>s.hero.hp<100,{block:true},100,dt);
    assert.equal(100-guard.hero.hp,Math.ceil((100-hit.hero.hp)*.45));assert.equal(guard.hero.lastDefense.reason,'projectile');
    const misses=until(side,s=>!s.projectiles.length,{x:1},240,dt);assert.equal(misses.hero.hp,100);
    const avoids=until(dodge,s=>!s.projectiles.length,s=>{const close=s.projectiles[0]&&Math.hypot(s.hero.x-s.projectiles[0].x,s.hero.z-s.projectiles[0].z)<1.7;return {x:close?1:0,dodge:close};},240,dt);
    assert.equal(avoids.hero.hp,100);
    const wall=create('rogue-battlemage',{guardStarts:[{x:0,z:-8}],canHit:()=>false});
    for(let i=0;i<150;i++)wall.tick(dt);assert.equal(wall.snapshot().hero.hp,100);assert.equal(wall.snapshot().projectiles.length,0);
    const doomed=launch();doomed.fireballHit(0,10000);const end=doomed.tick(dt);assert.equal(end.outcome,'success');assert.equal(end.projectiles.length,0);
  }
});

test('troll heals gradually, fire suppresses it for six seconds, and death never regenerates',()=>{
  const m=create('regenerating-troll',{guardStarts:[{x:0,z:-20}]});assert(m.fireballHit(0,26));
  let s=m.snapshot();assert.equal(s.guards[0].burnRemaining,6);assert.equal(s.guards[0].hp,174);
  for(let i=0;i<59;i++)s=m.tick(.1,{z:1});assert.equal(s.guards[0].hp,174);assert(s.guards[0].burnRemaining>0);
  s=until(m,s=>s.guards[0].hp>174,{z:1},100,.1);assert.equal(s.guards[0].hp,175);assert.equal(s.guards[0].healed,1);
  for(let i=0;i<180;i++)s=m.tick(.1,{z:1});assert.equal(s.guards[0].hp,200);
  assert(m.fireballHit(0,26));assert.equal(m.snapshot().guards[0].burnRemaining,6,'A new Fireball renews the full suppression');
  m.fireballHit(0,10000);s=m.tick(.1);assert.equal(s.outcome,'success');const before=JSON.stringify(s);
  for(let i=0;i<100;i++)m.tick(.1);assert.equal(JSON.stringify(m.snapshot()),before);
});

test('knight restoration heals only after the full tell and both staff and fire can interrupt it',()=>{
  const distant=create('undead-knight',{guardStarts:[{x:0,z:-10}]});distant.fireballHit(0,60);
  let s=until(distant,s=>s.guards[0].phase==='restore',{z:1}),hp=s.guards[0].hp;
  assert.equal(hp,130);assert(!isEncounterGuarding(s.guards[0]));assert.equal(encounterCue(s.guards[0]).kind,'restoring');
  for(let i=0;i<20;i++)s=distant.tick(.1,{z:1});assert.equal(s.guards[0].hp,hp);
  s=until(distant,s=>s.guards[0].restorations===1,{z:1},20,.1);assert.equal(s.guards[0].hp,hp+35);
  for(const fire of [false,true]){
    const m=create('undead-knight');m.fireballHit(0,60);s=until(m,s=>s.guards[0].phase==='restore',{block:true});
    hp=s.guards[0].hp;
    if(fire){m.fireballHit(0,26);s=m.snapshot();}else s=until(m,s=>s.guards[0].interruptions===1,{attack:true},50);
    assert.equal(s.guards[0].interruptions,1);assert.equal(s.guards[0].restorations,0);assert(s.guards[0].hp<hp);assert.equal(s.guards[0].phase,'recover');
    assert(s.guards[0].ritualCooldown>7);assert(s.guards[0].open);
  }
});

test('advanced actors keep distinct equipment, spell focus size, and grounded defeat at their own scales',()=>{
  for(const r of ADVANCED_TRIALS){
    const actor=createTrialOpponent(r.id),root=actor.group;root.position.set(4,12,-5);
    assert.equal(root.userData.advancedTrial,r.id);
    for(let i=0;i<40;i++)actor.animate(i/60,0,true,{action:'idle'});
    if(r.id==='rogue-battlemage')assert(new THREE.Box3().setFromObject(root.getObjectByName('Battlemage spell focus')).getSize(new THREE.Vector3()).length()<.5);
    if(r.id==='dwarven-shieldwarden')assert(root.getObjectByName('Forged war hammer')&&root.getObjectByName('Tower shield board'));
    if(r.id==='regenerating-troll')assert(!root.getObjectByName('Road beam').visible&&root.getObjectByName('Troll amber eye'));
    if(r.id==='undead-knight')assert(root.getObjectByName('Weathered skull'));
    const standingHead=root.getObjectByName('Head').getWorldPosition(new THREE.Vector3()).y-12;
    for(let i=0;i<45;i++)actor.animate(1+i/60,0,true,{action:'dead',progress:Math.min(1,i/24)});
    assert(Math.abs(new THREE.Box3().setFromObject(root).min.y-12)<.01,r.id+' rests on the floor');
    assert(root.getObjectByName('Head').getWorldPosition(new THREE.Vector3()).y-12<standingHead*.75,r.id+' visibly falls instead of balancing on equipment');
    disposeCharacter(actor);
  }
});

test('spell effects use fixed pools, follow the model, and disappear on victory or disposal',()=>{
  const scene=new THREE.Scene(),view=createTrialMagicView(scene,{heightAt:()=>5});const root=scene.getObjectByName('Stillroom spell effects');
  const initialChildren=root.children.length;
  const m=create('rogue-battlemage',{guardStarts:[{x:0,z:-8}]}),s=until(m,s=>s.projectiles.length);
  for(let i=0;i<100;i++)view.draw(s,s.time);
  assert.equal(root.children.length,initialChildren);assert.equal(root.children.filter(o=>o.userData.trialBolt&&o.visible).length,1);
  const bolt=root.children.find(o=>o.userData.trialBolt&&o.visible);assert.equal(bolt.position.y,6.05);assert.equal(bolt.position.z,s.projectiles[0].z);
  view.draw({...s,outcome:'success'},s.time);assert(root.children.every(o=>!o.visible));
  const knight=create('undead-knight',{guardStarts:[{x:0,z:-20}]});knight.fireballHit(0,60);const restoring=until(knight,s=>s.guards[0].phase==='restore',{z:1});
  view.draw(restoring,restoring.time);assert(root.getObjectByName('Knight restoration ritual').visible);
  view.dispose();assert.equal(scene.children.length,0);
});
