import test from 'node:test';
import assert from 'node:assert/strict';
import {createAssaultArchery} from '../src/gameplay/combat/assault-archery.js';
import {unitBody} from '../src/gameplay/combat/combat-units.js';

function fixture({heightAt=()=>0,arrowHit=null,friend=false}={}){
  const target={...unitBody('orc-warrior'),id:0,x:0,z:12,heading:Math.PI,phase:'approach',open:false},
    archer={id:100,x:0,z:0,hp:100,phase:'approach',timer:0,heading:0,ranged:{arrows:3,damage:23}},
    state={hero:{id:-1,x:20,z:0,hp:100},guards:[target],allies:[archer],squad:{damageByAllies:0}};
  if(friend)state.allies.push({id:101,x:0,z:6,hp:100});
  const archery=createAssaultArchery(state,{heightAt,arrowHit,walk(){},checkBreak(){}});
  function advance(seconds,{draw=true}={}){for(let i=0;i<Math.ceil(seconds*60);i++){if(draw)archery.tickActor(archer,1/60);archery.tick(1/60);}return state;}
  return {state,target,archer,archery,advance};
}

test('archers give a full visible draw and release a traveling shaft without immediate damage',()=>{
  const f=fixture({heightAt:(x,z)=>z<1?4:0});f.advance(.5);
  assert.equal(f.archer.phase,'bow-draw');assert(f.archer.bowDraw>.3);assert.equal(f.target.hp,f.target.maxHp);
  f.advance(.6);assert.equal(f.archer.shots,1);assert.equal(f.state.archeryProjectiles.length,1);assert.equal(f.target.hp,f.target.maxHp);
  const p=f.state.archeryProjectiles[0];assert(p.z>0&&p.z<5);assert(p.dy<0);assert.equal(f.archer.ranged.arrows,2);
  f.advance(.5,{draw:false});assert(f.target.hp<f.target.maxHp);assert.equal(f.state.archeryProjectiles.length,0);
});

test('arrows retain their released bearing instead of following a moved target',()=>{
  const f=fixture({heightAt:()=>0});f.target.guarding=false;f.advance(1.1);const p=f.state.archeryProjectiles[0];
  f.target.x=5;f.advance(.5,{draw:false});assert.equal(f.target.hp,f.target.maxHp);assert.equal(f.state.archeryProjectiles[0].dx,p.dx);
});

test('a friendly body screens the shot and receives no friendly damage',()=>{
  const f=fixture({friend:true});f.target.guarding=false;f.advance(1.6);
  assert.equal(f.target.hp,f.target.maxHp);assert.equal(f.state.allies[1].hp,100);assert.equal(f.state.squad.damageByAllies,0);
});

test('cover blocks a sightline; a new obstruction can catch a shot already in flight',()=>{
  let wall=true;const f=fixture({arrowHit:(a,b)=>wall&&a.z<=5&&b.z>=5?{t:(5-a.z)/(b.z-a.z)}:null});
  f.target.guarding=false;f.advance(2);assert.equal(f.archer.shots,undefined);assert.equal(f.target.hp,f.target.maxHp);
  wall=false;f.advance(1.1);assert.equal(f.archer.shots,1);wall=true;f.advance(.5,{draw:false});
  assert.equal(f.target.hp,f.target.maxHp);assert.equal(f.state.archeryProjectiles.length,0);
});

test('elevation clears the frontal shield while armor still reduces the connecting arrow',()=>{
  const flat=fixture(),high=fixture({heightAt:(x,z)=>z<1?4:0});flat.advance(1.6);high.advance(1.6);
  assert.equal(flat.target.hp,flat.target.maxHp);assert(high.target.hp<high.target.maxHp);
  assert(high.target.maxHp-high.target.hp<23,'Elevated arrows do not bypass armor');
});

test('limited ammunition falls back to sword combat and all lingering arrows can be cleared',()=>{
  const f=fixture();f.archer.ranged.arrows=1;f.advance(1.1);assert.equal(f.archer.ranged.arrows,0);
  assert.equal(f.archery.tickActor(f.archer,1/60),false);assert.equal(f.archer.ranged.active,false);
  f.archery.clear();assert.deepEqual(f.state.archeryProjectiles,[]);
});
