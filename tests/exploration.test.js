import test from 'node:test';
import assert from 'node:assert/strict';
import {explorationStore,validateExploration,EXPLORATION_KEY} from '../src/app/exploration/checkpoint.js';
import {explorationMovement} from '../src/app/exploration/movement.js';
import {createMountedPresentation} from '../src/dev/tools/mounted-presentation.js';
import {RIDE,horseMovementTuning} from '../src/gameplay/movement/riding.js';

test('mounted presentation filters terrain jitter and wraps turns without changing physical input',()=>{
  const visual=createMountedPresentation(),physical={y:10,heading:Math.PI-.01,speed:26};
  visual.update(physical,1/60);
  const next=visual.update({y:10.2,heading:-Math.PI+.01,speed:0},1/60);
  assert(next.y>10&&next.y<10.1);assert(next.speed>20);
  assert(Math.abs(next.heading-physical.heading)<.01);assert.equal(physical.y,10);
  const downhill=visual.update({y:7,heading:0,speed:26},1/60);assert(downhill.y<=7.35);
  visual.reset();assert.equal(visual.update({y:40,heading:0,speed:0},1/60).y,40);
});
import {createCheckpointStore} from '../scripts/checkpoint-store.cjs';
const snapshot=()=>({version:1,character:'rollo',position:{x:0,y:2,z:0},heading:0,camera:{yaw:0,pitch:.3,distance:8},elapsed:12,cells:['0,0','-2,3']});
test('exploration saves preserve position, camera and discoveries in their own key',()=>{
  const values=new Map([['azhora-road-checkpoint-v1','legacy sentinel']]);
  const storage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)};
  const store=explorationStore(storage),data=snapshot();
  assert.equal(store.read().data,null);assert.equal(store.save(data).ok,true);assert.deepEqual(store.read().data,data);
  assert.equal(values.get('azhora-road-checkpoint-v1'),'legacy sentinel');assert(values.has(EXPLORATION_KEY));
});
test('invalid or future saves remain untouched; failed writes do not claim success',()=>{
  for(const data of [{...snapshot(),version:2},{...snapshot(),character:'unknown'},{...snapshot(),position:{x:Infinity,y:0,z:0}},{...snapshot(),camera:{yaw:0,pitch:.3,distance:-1}},{...snapshot(),cells:['oops']}])assert.equal(validateExploration(data),false);
  let value='broken';const store=explorationStore({getItem:()=>value,setItem:()=>{throw Error('disk full');}});
  assert.equal(store.read().ok,false);assert.equal(value,'broken');assert.equal(store.save(snapshot()).ok,false);
});
test('desktop checkpoint stores stay independent even with the same internal storage key',()=>{
  const legacy=createCheckpointStore({memoryOnly:true}),exploration=createCheckpointStore({memoryOnly:true});
  legacy.handle('set','azhora-road-checkpoint-v1','{"sentinel":true}');
  exploration.handle('set','azhora-road-checkpoint-v1',JSON.stringify(snapshot()));
  assert.equal(legacy.handle('get','azhora-road-checkpoint-v1').value,'{"sentinel":true}');
});
const baseWorld=()=>({bounds:{minX:-100,maxX:100,minZ:-100,maxZ:100},heightAt:()=>2,waterAt:()=>.45,colliders:[],readyAt:()=>true});
test('walking and diagonal movement have the same speed; running is faster',()=>{
  const walk=keys=>{const p={x:0,y:2,z:0},m=explorationMovement(p,baseWorld());for(let i=0;i<25;i++)m.step(new Set(keys),0,.04);return Math.hypot(p.x,p.z);};
  assert(Math.abs(walk(['KeyW'])-4.5)<1e-6);assert(Math.abs(walk(['KeyW','KeyD'])-4.5)<1e-6);assert(Math.abs(walk(['KeyW','ShiftLeft'])-7)<1e-6);
});
test('solid obstacles and unloaded regions stop walking; loading target is returned',()=>{
  const w=baseWorld();w.colliders=[{x:0,z:-1,hx:2,hz:.1}];const p={x:0,y:2,z:0},m=explorationMovement(p,w);
  for(let i=0;i<25;i++)m.step(new Set(['KeyW']),0,.04);assert(p.z>-.6);
  const unloaded={...baseWorld(),readyAt:()=>false},q={x:0,y:2,z:0};
  const result=explorationMovement(q,unloaded).step(new Set(['KeyW']),0,.04);assert(result.waiting);assert.equal(q.z,0);
});
test('jumping lands and shallow water supports swimming without a skill gate',()=>{
  const p={x:0,y:2,z:0},m=explorationMovement(p,baseWorld());assert(m.jump());assert(!m.jump());m.step(new Set(),0,.04);assert(p.y>2);
  for(let i=0;i<40;i++)m.step(new Set(),0,.04);assert.equal(p.y,2);assert(m.state().grounded);
  const water={...baseWorld(),heightAt:()=>-2},q={x:0,y:0,z:0},swim=explorationMovement(q,water);swim.step(new Set(['KeyW']),0,.04);assert(swim.state().swimming);assert(!swim.jump());
});

import {explorationDestinations,arrivalCandidates,findRegionArrival} from '../src/app/exploration/developer-travel.js';
import {regions,regionAt} from '../src/world/terrain/region-world.js';
test('developer destinations include every world region and have arrivals inside their own borders',()=>{
  assert.deepEqual(explorationDestinations.map(r=>r.id).sort((a,b)=>a-b),regions.map(r=>r.id).sort((a,b)=>a-b));
  for(const region of explorationDestinations){
    const candidates=arrivalCandidates(region);assert(candidates.length,region.name);
    assert(candidates.every(p=>regionAt(p.x,p.z).id===region.id),region.name);
  }
});
test('region arrival searches around obstacles and rejects water and neighboring territory',()=>{
  const region=explorationDestinations.find(r=>r.name==='West Ithzel'),p=arrivalCandidates(region)[0];
  const world={bounds:{minX:-20000,maxX:20000,minZ:-20000,maxZ:20000},heightAt:()=>2,waterAt:()=>.45,regionAt,colliders:[{x:p.x,z:p.z,r:3}]};
  const at=findRegionArrival(region,world);assert(at);assert(Math.hypot(at.x-p.x,at.z-p.z)>3.62);assert.equal(regionAt(at.x,at.z).id,region.id);
  assert.equal(findRegionArrival(region,{...world,heightAt:()=>-3}),null);
  assert.equal(findRegionArrival(region,{...world,regionAt:()=>({id:-1})}),null);
});
test('developer horse retains land pace and swims through deeper water at a slower pace',()=>{
  const settings=horseMovementTuning(2);
  const p={x:0,y:2,z:0},w=baseWorld(),m=explorationMovement(p,w);
  for(let i=0;i<25;i++)m.step(new Set(['KeyW','ShiftLeft']),0,.04,settings);assert(Math.abs(p.z+26)<1e-6);
  const wet={...baseWorld(),heightAt:(x,z)=>z<-.8?-2:2},q={x:0,y:2,z:0},horse=explorationMovement(q,wet);
  for(let i=0;i<25;i++)horse.step(new Set(['KeyW','ShiftLeft']),0,.04,settings);assert(q.z< -5);assert(horse.state().swimming);
  assert(Math.abs(q.y-(wet.waterAt()-RIDE.floatOffset))<.01);
});

test('a non-swimming mover can retreat up a sloping bank without bypassing solid scenery',()=>{
  const w={...baseWorld(),heightAt:(x,z)=>z,waterAt:()=>1};
  const p={x:0,y:.5,z:.5},m=explorationMovement(p,w),settings={walk:13,run:26,radius:.62,swimming:false};
  for(let i=0;i<10;i++)m.step(new Set(['KeyW']),0,.04,settings);
  assert.equal(p.z,.5);assert(!m.state().swimming);
  for(let i=0;i<10;i++)m.step(new Set(['KeyD']),0,.04,settings);
  assert.equal(p.x,0);
  for(let i=0;i<10;i++)m.step(new Set(['KeyS']),0,.04,settings);
  assert(p.z>2,'Escape onto dry ground');
  const wall={...w,colliders:[{x:0,z:1.5,hx:3,hz:.1,minY:-2,maxY:10}]};
  const q={x:0,y:.5,z:.5},blocked=explorationMovement(q,wall);
  for(let i=0;i<10;i++)blocked.step(new Set(['KeyS']),0,.04,settings);
  assert(q.z<1,'Recovery still respects solid scenery');
});

test('horses wade shallow fords, swim deep channels and return to normal bank footing',()=>{
  const w={...baseWorld(),heightAt:(x,z)=>z<-3?-2:.15,waterAt:()=>1};
  const p={x:0,y:.15,z:0},m=explorationMovement(p,w),tuning=horseMovementTuning();
  for(let i=0;i<5;i++)m.step(new Set(['KeyW']),0,.04,tuning);
  assert(!m.state().swimming);assert.equal(p.y,.15);
  for(let i=0;i<30;i++)m.step(new Set(['KeyW']),0,.04,tuning);
  assert(p.z< -3);assert(m.state().swimming);assert(Math.abs(p.y-(1-RIDE.floatOffset))<.01);
  for(let i=0;i<50;i++)m.step(new Set(['KeyS']),0,.04,tuning);
  assert(p.z>0);assert(!m.state().swimming);assert.equal(p.y,.15);
});

test('horse swimming follows elevated river surfaces, stays slower than land and cannot canter or jump in deep water',()=>{
  for(const multiplier of [1,2]){
    const w={...baseWorld(),heightAt:()=>24,waterAt:()=>30},p={x:0,y:30-RIDE.floatOffset,z:0},m=explorationMovement(p,w),tuning=horseMovementTuning(multiplier);
    for(let i=0;i<25;i++)m.step(new Set(['KeyW','ShiftLeft']),0,.04,tuning);
    assert.equal(m.state().swimming,true);assert.equal(m.jump(),false);
    assert(Math.abs(p.z+RIDE.swim*multiplier)<1e-6);assert(Math.abs(p.y-(30-RIDE.floatOffset))<1e-6);
    assert(RIDE.swim*multiplier<tuning.walk);
  }
});

test('swimming horses respect hulls, scenario borders and unloaded regions',()=>{
  const wet={...baseWorld(),heightAt:()=>-8,waterAt:()=>1};
  for(const [world,expected] of [
    [{...wet,colliders:[{x:0,z:-2,hx:2,hz:.2,minY:-20,maxY:20}]},'obstacle'],
    [{...wet,canExploreAt:(x,z)=>z> -2},'boundary'],
    [{...wet,readyAt:(x,z)=>z> -2},'loading'],
  ]){
    const p={x:0,y:1-RIDE.floatOffset,z:0},m=explorationMovement(p,world);let result;
    for(let i=0;i<25;i++)result=m.step(new Set(['KeyW','ShiftLeft']),0,.04,horseMovementTuning(2));
    assert(p.z> -2);assert(result.swimming);
    if(expected==='boundary')assert(result.blockedBoundary);
    if(expected==='loading')assert(result.waiting);
  }
});
