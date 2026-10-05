import test from 'node:test';
import assert from 'node:assert/strict';
import {createDragonFire,dragonFireContact,traceDragonFire,DRAGON_FIRE} from '../src/dragon-fire.js';
const origin={x:0,y:8,z:0},direction={x:0,y:0,z:1};
const forward={origin,direction,range:72,radius:10};
test('fire cone uses altitude, facing and range, not a two-dimensional area attack',()=>{
  assert.ok(dragonFireContact({x:0,y:7,z:30},forward));
  for(const p of [{x:20,y:7,z:30},{x:0,y:7,z:-2},{x:0,y:7,z:90},{x:0,y:0,z:20},{x:0,y:7,z:30,hp:0}])assert.equal(dragonFireContact(p,forward),null);
});
test('tap fires a burst; held attack continues; pause and disabled mount interrupt immediately',()=>{
  const fire=createDragonFire();fire.press();
  const tick=(opts={})=>fire.update(.1,{enabled:true,origin,direction,...opts});
  assert.ok(tick().active);
  for(let i=0;i<10;i++)tick();assert.equal(fire.view().active,false);
  for(let i=0;i<30;i++)assert.ok(tick({held:true}).active);
  assert.equal(tick({held:true,playing:false}).active,false);
  assert.equal(tick().active,false,'resuming does not restart a stale key or tap');
  fire.press();assert.equal(tick({enabled:false}).active,false);
  fire.stop();assert.equal(tick().active,false);
});
test('ordinary actors die quickly; duplicated NPC bodies receive one hit and occluded bodies none',()=>{
  const hits=[];const bodies=[{id:'guard',x:0,y:7,z:20,hp:100},{id:'combat-guard',npcId:'guard',x:0,y:7,z:20,hp:100},
    {id:'behind-rock',x:1,y:7,z:20,hp:100},{id:'traveler',x:0,y:7,z:1,hp:100}];
  const fire=createDragonFire({getBodies:()=>bodies,clearTo:(_,p)=>p.x===0,damage:(b,d)=>{hits.push([b.id,d]);b.hp-=d;}});
  for(let i=0;i<3;i++)fire.update(.1,{enabled:true,held:true,origin,direction});
  assert.equal(hits[0][0],'guard');assert.ok(hits[0][1]>100);
  assert.ok(hits.every(([id])=>id==='guard'||id==='combat-guard'));
  // Within a single pulse, multiple representations never multiply its damage.
  assert.equal(hits.filter(([id])=>id==='guard').length,1);
});
test('terrain truncates breath at first surface and distinguishes water',()=>{
  const d={x:0,y:-Math.SQRT1_2,z:Math.SQRT1_2};
  const ground=traceDragonFire(origin,d,{heightAt:()=>0});
  assert.ok(Math.abs(ground.hit.z-8)<.15);assert.equal(ground.wet,false);
  const sea=traceDragonFire(origin,d,{heightAt:()=>-10,waterAt:()=>0});
  assert.equal(sea.wet,true);
  const cliff=traceDragonFire(origin,direction,{heightAt:(_,z)=>z>=12?20:0});assert.ok(cliff.range<=12.02);
});
test('a solid obstruction before the sea remains a dry impact and short jets keep their true cone width',()=>{
  const scorch=[];
  const fire=createDragonFire({heightAt:()=>-20,waterAt:()=>0,clip:()=>({range:5}),scorch:f=>scorch.push(f)});
  for(let i=0;i<4;i++)fire.update(.1,{enabled:true,held:true,origin,direction:{x:0,y:-1,z:1}});
  const view=fire.view();assert.equal(view.impacts[0].wet,false);assert.equal(view.burns,0);
  assert.ok(Math.abs(view.tipRadius-(.5+10*5/72))<1e-6);
  assert.ok(scorch.length>0);assert.ok(Math.abs(scorch[0].radius-10*5/72)<1e-6);
});
test('breath ignites ground with bounded lingering fire, but never ignites water; reset clears everything',()=>{
  const fire=createDragonFire({heightAt:()=>0});
  for(let i=0;i<100;i++)fire.update(.1,{enabled:true,held:true,origin:{x:i*5,y:8,z:0},direction:{x:0,y:-1,z:1}});
  assert.equal(fire.view().burns,DRAGON_FIRE.maxBurns);
  fire.reset();assert.equal(fire.view().burns,0);assert.equal(fire.view().hits,0);assert.equal(fire.view().active,false);
  const sea=createDragonFire({heightAt:()=>-10,waterAt:()=>0});
  for(let i=0;i<10;i++)sea.update(.1,{enabled:true,held:true,origin,direction:{x:0,y:-1,z:1}});
  assert.equal(sea.view().burns,0);
});
