import test from 'node:test';
import assert from 'node:assert/strict';
import { createCagneyAutopilot } from '../src/cagney-autopilot.js';
import { createBenAutopilot } from '../src/ben-autopilot.js';
import { createEscortMotionChecks } from '../src/escort-motion-checks.js';
import { createEscortFollower } from '../src/escort-autopilot-follow.js';
import { CAGNEY_AMBUSH } from '../src/cagney-quest.js';

const world={bounds:{minX:-2000,maxX:2000,minZ:-2000,maxZ:2000},colliders:[],heightAt:()=>1.5};
const base=()=>({mode:'playing',position:{x:0,z:0},quest:{stage:'unmet'},cagney:{x:0,z:2,available:true},
  combat:{phase:'peaceful',action:'idle',hp:100,stamina:100,hasShield:true,enemies:[]},inventory:{pawpaws:0},interaction:{npcId:'cagney'}});
function fixture(){const s=base(),actions=[];const pilot=createCagneyAutopilot({world,read:()=>s,act:Object.fromEntries(
  ['interact','continue','choose','attack','eat','dismount'].map(kind=>[kind,a=>actions.push({kind,...a})]))});pilot.start();
  return{s,pilot,actions,tick(n=1){let result;for(let i=0;i<n;i++)result=pilot.step(.25);return result;}};}

test('the Cagney pilot uses the normal conversation choices and collects only the offered reward',()=>{
  const f=fixture();f.tick(4);assert.equal(f.actions[0].kind,'interact');
  f.s.mode='dialogue';f.s.dialogue={npcId:'cagney',choices:[]};f.tick(6);assert.equal(f.actions.at(-1).kind,'continue');
  f.s.dialogue.choices=[{id:'cagney-leave'},{id:'cagney-accept'}];f.tick(4);assert.equal(f.actions.at(-1).id,'cagney-accept');
  f.s.quest.stage='home';f.s.dialogue.choices=[{id:'cagney-reward'}];f.tick(4);assert.equal(f.actions.at(-1).id,'cagney-reward');
  f.s.quest.stage='complete';f.tick();assert.equal(f.pilot.active,false);assert.match(f.pilot.stopReason,/45 copper/);
});

test('the escort pilot follows Cagney with movement inputs without changing either world position',()=>{
  const f=fixture();f.s.quest={stage:'escorting',walk:{waypoint:1,waiting:false}};f.s.cagney={x:0,z:7,available:true};
  const before=structuredClone(f.s);const command=f.tick();assert.ok(Math.abs(command.move.forward)+Math.abs(command.move.side)>0);
  assert.deepEqual(f.s,before);assert.equal(f.actions.length,0);
  f.s.cagney.z=2;const near=f.tick();assert.deepEqual(near.move,{forward:0,side:0,run:false});
});

test('the pilot moves clear rather than striking through Cagney but attacks a clear opponent',()=>{
  const f=fixture();f.s.quest.stage='ambushed';f.s.cagney={x:0,z:1,available:true};
  f.s.combat={...f.s.combat,phase:'active',encounterId:CAGNEY_AMBUSH.id,enemies:[{id:'cagnapper-1',x:0,z:2,hp:48,active:true,action:'idle'}]};
  const blocked=f.tick(4);assert.equal(f.actions.some(a=>a.kind==='attack'),false);
  assert.ok(Math.abs(blocked.move.forward)+Math.abs(blocked.move.side)>0);
  f.s.cagney.z=-2;f.tick(4);assert.ok(f.actions.some(a=>a.kind==='attack'));
});

test('takeover and pause stop movement, and restarting resumes the same ordinary escort',()=>{
  const f=fixture();f.s.quest={stage:'escorting',walk:{waypoint:2}};f.s.cagney.z=7;
  f.pilot.stop('You took control.');assert.equal(f.pilot.step(.25),null);assert.equal(f.pilot.active,false);
  f.pilot.start();assert.ok(f.tick().move.forward);assert.equal(f.s.quest.walk.waypoint,2);
  f.s.mode='pause';assert.deepEqual(f.tick().move,{forward:0,side:0,run:false});assert.equal(f.pilot.active,true);
  f.s.mode='playing';assert.ok(f.tick().move.forward);
});

test('failure and unrelated encounters stop autoplay without choosing a recovery or fighting another quest',()=>{
  for(const change of [s=>{s.mode='defeated';},s=>{s.quest={stage:'captured',over:true};},
    s=>{s.combat.phase='active';s.combat.encounterId='unrelated';}]){
    const f=fixture();change(f.s);f.tick(4);assert.equal(f.pilot.active,false);assert.equal(f.actions.length,0);
  }
});

// Drive the same ordinary movement and camera smoothing as the renderer. A
// screenshot cannot detect the old 40 full-speed/start-stop changes per second.
function followRun(create,stage,{fps=60,turn=false,stopAt=Infinity,seconds=30}={}){
  const position={x:0,z:0},guide={x:0,z:-4,available:true},s={...base(),position,ben:guide,cagney:guide,quest:{stage,walk:{}}};
  const pilot=create({world,read:()=>s});pilot.start();
  const motion=createEscortMotionChecks();
  let cameraYaw=0,camera={x:0,z:10},lastSpeed=0,switches=0,maxSpeedDelta=0,maxCameraTurn=0,minGap=Infinity,maxGap=0;
  for(let frame=0;frame<seconds*fps;frame++){
    const dt=1/fps,time=frame*dt;
    if(time<stopAt){if(turn&&time>=10)guide.x+=2.8*dt;else guide.z-=2.8*dt;}
    pilot.step(dt);assert.equal(pilot.active,true,pilot.stopReason);
    if(Number.isFinite(pilot.yaw))cameraYaw+=Math.atan2(Math.sin(pilot.yaw-cameraYaw),Math.cos(pilot.yaw-cameraYaw))*(1-Math.exp(-3.5*dt));
    const {forward,side}=pilot.move,basis=pilot.move.basisYaw??cameraYaw,speed=Math.hypot(forward,side)*4.2;
    position.x+=(-Math.sin(basis)*forward+Math.cos(basis)*side)*4.2*dt;
    position.z+=(-Math.cos(basis)*forward-Math.sin(basis)*side)*4.2*dt;
    const previousLook=Math.atan2(position.x-camera.x,position.z-camera.z);
    const target={x:position.x+Math.sin(cameraYaw)*10,z:position.z+Math.cos(cameraYaw)*10};
    camera.x+=(target.x-camera.x)*(1-Math.exp(-5*dt));camera.z+=(target.z-camera.z)*(1-Math.exp(-5*dt));
    motion.observe({time:time+dt,position:{...position,y:1.5},guide:{...guide},input:{...pilot.move},
      camera:{...camera,y:7},focus:{...position,y:3}},true);
    const look=Math.atan2(position.x-camera.x,position.z-camera.z);
    if(time>3){
      if((speed>0)!==(lastSpeed>0))switches++;
      maxSpeedDelta=Math.max(maxSpeedDelta,Math.abs(speed-lastSpeed));
      maxCameraTurn=Math.max(maxCameraTurn,Math.abs(Math.atan2(Math.sin(look-previousLook),Math.cos(look-previousLook))));
      const gap=Math.hypot(position.x-guide.x,position.z-guide.z);minGap=Math.min(minGap,gap);maxGap=Math.max(maxGap,gap);
    }
    lastSpeed=speed;
  }
  return {switches,maxSpeedDelta,maxCameraTurn,minGap,maxGap,speed:lastSpeed,position,guide,motion:motion.result()};
}

for(const [name,create,stage] of [['Cagney',createCagneyAutopilot,'escorting'],['Ben',createBenAutopilot,'walking']]){
  test(`${name} autoplay keeps a continuous guide pace across frame rates instead of pumping forward`,()=>{
    for(const fps of [30,60,120]){
      const run=followRun(create,stage,{fps});
      assert.equal(run.switches,0,JSON.stringify({fps,...run}));
      assert.ok(run.maxSpeedDelta<.02,JSON.stringify({fps,...run}));
      assert.ok(Math.abs(run.speed-2.8)<.01);
      assert.ok(run.minGap>2.7&&run.maxGap<3.1,JSON.stringify(run));
      assert.ok(run.motion.seconds>25&&run.motion.stopRate===0&&run.motion.inputStopRate===0,JSON.stringify(run.motion));
      assert.equal(run.motion.cameraReversalRate,0);
    }
  });
  test(`${name} follows a road corner without camera steering feedback and settles when the guide stops`,()=>{
    const run=followRun(create,stage,{turn:true,stopAt:20});
    assert.ok(run.maxCameraTurn<.06,JSON.stringify(run));
    assert.ok(run.minGap>2.1&&run.maxGap<3.3,JSON.stringify(run));
    assert.ok(run.maxSpeedDelta<=8/60+.001,JSON.stringify(run));
    assert.ok(run.switches<=1,JSON.stringify(run));
    assert.equal(run.speed,0,'the traveler stays still after the guide stops');
    assert.ok(Math.hypot(run.position.x-run.guide.x,run.position.z-run.guide.z)>2.4,JSON.stringify(run));
  });
}

test('the native motion observer detects the former full-speed start-stop camera shake',()=>{
  const motion=createEscortMotionChecks(),position={x:0,y:1.5,z:0},guide={x:0,z:-3},camera={x:0,y:7,z:10},dt=1/60;
  for(let frame=0;frame<600;frame++){
    const forward=frame%3===0?0:1;position.z-=forward*4.2*dt;guide.z-=2.8*dt;
    camera.z+=(position.z+10-camera.z)*(1-Math.exp(-5*dt));
    motion.observe({time:(frame+1)*dt,position:{...position},guide:{...guide},input:{forward,side:0},camera:{...camera},focus:{...position,y:3}},true);
  }
  const result=motion.result();
  assert.ok(result.stopRate>30&&result.inputStopRate>30&&result.speedJumpRate>30,JSON.stringify(result));
  assert.ok(result.cameraReversalRate>10,JSON.stringify(result));
  const before=result.seconds;motion.observe(null,false);assert.equal(motion.result().seconds,before,'pause frames do not add travel');
});

test('a testing teleport discards old escort breadcrumbs instead of steering back to them',()=>{
  const follower=createEscortFollower({world}),position={x:0,z:0},guide={x:0,z:-4};
  for(let i=0;i<60;i++){guide.z-=2.8/60;follower.step(position,guide,1/60);}
  guide.x=100;guide.z=0;position.x=96;position.z=0;
  const command=follower.step(position,guide,1/60);
  const {forward,side,basisYaw}=command.move;
  const x=-Math.sin(basisYaw)*forward+Math.cos(basisYaw)*side,z=-Math.cos(basisYaw)*forward-Math.sin(basisYaw)*side;
  assert.ok(x>0&&Math.abs(z)<1e-6,'only the guide at the new location steers the traveler');
});
