import test from 'node:test';
import assert from 'node:assert/strict';
import {BEAR_ARRIVAL,createBearArrival,offeredHorseSpot} from '../src/app/exploration/bear-arrival.js';
import {RIDE,createRiding} from '../src/gameplay/movement/riding.js';
import {MINORA_STABLE,BEAR_RIDING_LESSON} from '../src/content/regions/minora-frontier/minora-stable.js';
import {TOWER_EXIT} from '../src/app/exploration/tower-state.js';
import {BEAR_STABLE_ROUND,GUILD_HORSES} from '../src/content/regions/minora-frontier/guild-stable-layout.js';

const walk=(p,dx,dz)=>{p.x+=dx;p.z+=dz;};
test('Bear walks a bounded approach from the stable to the actual tower exit',()=>{
  const arrival=createBearArrival(MINORA_STABLE.bear),start=arrival.position;arrival.ground(21.3);
  assert.equal(arrival.update(.05,TOWER_EXIT,{offering:true,move:walk}),false);
  for(let i=0;i<20&&!arrival.approaching;i++)arrival.update(.05,TOWER_EXIT,{offering:true,move:walk});
  assert(arrival.approaching);assert(Math.hypot(arrival.position.x-start.x,arrival.position.z-start.z)>0);
  let ready=false;for(let i=0;i<100&&!ready;i++)ready=arrival.update(.05,TOWER_EXIT,{offering:true,move:walk});
  assert(ready);assert(Math.abs(Math.hypot(arrival.position.x-TOWER_EXIT.x,arrival.position.z-TOWER_EXIT.z)-BEAR_ARRIVAL.reach)<.01);
  assert.equal(arrival.position.y,21.3);
});
test('Bear respects paused updates, blocked movement and travelers outside his stable radius',()=>{
  const arrival=createBearArrival({x:0,z:0}),before=arrival.position;
  assert(!arrival.update(0,{x:6,z:0},{offering:true,move:walk}));assert.deepEqual(arrival.position,before);
  assert(!arrival.update(.05,{x:6,z:0},{offering:true,move:()=>{}}));assert(!arrival.approaching);assert.deepEqual(arrival.position,before);
  for(let i=0;i<50;i++)assert(!arrival.update(.05,{x:20,z:0},{offering:true,move:walk}));
  assert.deepEqual(arrival.position,before,'Never begins a cross-world chase');
  for(let i=0;i<15;i++)arrival.update(.05,{x:8,z:0},{offering:true,move:walk});
  assert(arrival.position.x>0);
  for(let i=0;i<50;i++)arrival.update(.05,{x:100,z:0},{offering:true,move:walk});
  assert(Math.hypot(arrival.position.x,arrival.position.z)<.05,'Returns home when the traveler leaves');
});
test('finished or ineligible offers return Bear home without another greeting',()=>{
  const arrival=createBearArrival({x:0,z:0});
  for(let i=0;i<40;i++)arrival.update(.05,{x:6,z:0},{offering:true,move:walk});
  for(let i=0;i<80;i++)assert(!arrival.update(.05,{x:6,z:0},{offering:false,move:walk}));
  assert(Math.hypot(arrival.position.x,arrival.position.z)<.05);
  arrival.reset();assert.deepEqual(arrival.position,{x:0,y:0,z:0});
});
test('Bear turns before walking away and faces his actual movement, not a nearby player',()=>{
  const arrival=createBearArrival({x:0,z:0}),player={x:6,z:0};
  for(let i=0;i<100;i++)arrival.update(.05,player,{offering:true,move:walk});
  const at=arrival.position;arrival.update(.05,player,{offering:false,move:walk});
  assert.deepEqual(arrival.position,at,'The initial about-face happens in place');
  assert.equal(arrival.pace,0,'Turning does not animate a walk');
  let walked=0;
  for(let i=0;i<100;i++){
    const previous=arrival.position;arrival.update(.05,player,{move:walk});
    const now=arrival.position,dx=now.x-previous.x,dz=now.z-previous.z,d=Math.hypot(dx,dz);
    if(d>.001){assert((Math.sin(arrival.heading)*dx+Math.cos(arrival.heading)*dz)/d>.99);walked++;}
  }
  assert(walked>10);assert(Math.hypot(arrival.position.x,arrival.position.z)<.05);
});
test('owned-horse routine visits every Guild horse, dwells, repeats, and pauses without losing its place',()=>{
  const arrival=createBearArrival(MINORA_STABLE.bear,{routine:BEAR_STABLE_ROUND}),visits=new Map();let previous=null,checkedPause=false;
  for(let i=0;i<3600;i++){
    assert(!arrival.update(.05,TOWER_EXIT,{working:true,move:walk}),'Care never reopens the horse offer');
    const work=arrival.work;
    if(work&&work.horse!==previous){visits.set(work.horse,(visits.get(work.horse)??0)+1);previous=work.horse;}
    if(!work)previous=null;
    if(work&&!checkedPause){
      const position=arrival.position,station=arrival.station;
      for(let j=0;j<60;j++)arrival.update(0,TOWER_EXIT,{working:true,move:walk});
      assert.deepEqual(arrival.position,position);assert.equal(arrival.station,station);assert.deepEqual(arrival.work,work);checkedPause=true;
    }
  }
  assert(checkedPause);for(const h of GUILD_HORSES)assert(visits.get(h.id)>=2,h.id+' is tended repeatedly');
  arrival.reset();assert.equal(arrival.work,null);assert.equal(arrival.station,0);
});
test('horse gift prefers a clear front spot within immediate G reach',()=>{
  for(const yaw of [0,Math.PI/2,Math.PI,-Math.PI/2]){
    const player={x:-2414,z:59},at=offeredHorseSpot(player,yaw,()=>true),dx=at.x-player.x,dz=at.z-player.z;
    assert(dx*Math.sin(yaw)+dz*Math.cos(yaw)>2.2);assert(Math.hypot(dx,dz)<=RIDE.reach);assert.equal(at.yaw,yaw);
    const riding=createRiding();assert(riding.grant(at,at.yaw).ok);riding.teach();assert(!riding.mounted);assert.equal(riding.mountBlock(player),'');
    const saved=riding.snapshot();assert(!riding.grant({x:10,z:10}).ok);assert.deepEqual(riding.snapshot(),saved,'No second gift can replace an owned horse');
  }
});
test('horse placement accepts only checked candidates and fails safely when no space exists',()=>{
  const candidates=[],at=offeredHorseSpot({x:0,z:0},0,p=>{candidates.push(p);return p.x>1;});
  assert(at.x>1);assert(candidates.length>2);assert(Math.hypot(at.x,at.z)<=RIDE.reach);
  assert.equal(offeredHorseSpot({x:0,z:0},0,()=>false),null);
  for(const invalid of [{x:NaN,z:0},{x:0,z:Infinity},null])assert.equal(offeredHorseSpot(invalid,0,()=>true),null);
  assert.equal(offeredHorseSpot({x:0,z:0},NaN,()=>true),null);
  assert.equal(BEAR_RIDING_LESSON.length,1,'The first horse offer has one page');
});
