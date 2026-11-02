import test from 'node:test';
import assert from 'node:assert/strict';
import {explorationMovement} from '../src/app/exploration/movement.js';
import {createMountedPresentation} from '../src/dev/tools/mounted-presentation.js';
import {horseMovementTuning,RIDE} from '../src/gameplay/movement/riding.js';
import {sourceModule} from './module-loader.js';

const world=()=>({bounds:{minX:-100,maxX:100,minZ:-100,maxZ:100},heightAt:()=>2,waterAt:()=>-10,colliders:[],readyAt:()=>true});
function rider(w=world(),scale=1){
  const p={x:0,y:w.heightAt(0,0),z:0},m=explorationMovement(p,w),tuning=horseMovementTuning(scale);
  const step=(keys=[],count=1)=>{let result;for(let i=0;i<count;i++)result=m.step(new Set(keys),0,.02,tuning);return result;};
  return {p,m,step};
}
test('mounted jump has a fixed height, cannot double jump, and canter increases distance',()=>{
  const flights=[];
  for(const [scale,keys] of [[1,[]],[1,['KeyW','ShiftLeft']],[2,['KeyW','ShiftLeft']]]){
    const a=rider(world(),scale);assert(a.m.jump(RIDE.jumpSpeed));assert(!a.m.jump(RIDE.jumpSpeed));
    let peak=a.p.y,frames=0;
    do{a.step(keys);peak=Math.max(peak,a.p.y);frames++;}while(!a.m.state().grounded&&frames<100);
    assert(frames<45&&frames>30);assert.equal(a.p.y,2);assert.equal(a.m.state().verticalSpeed,0);
    assert(peak-2>1.3&&peak-2<1.6);flights.push({peak,distance:-a.p.z});
  }
  assert.equal(flights[0].peak,flights[1].peak);assert.equal(flights[1].peak,flights[2].peak);
  assert(flights[1].distance>9);assert(Math.abs(flights[2].distance-flights[1].distance*2)<1e-6);
});
test('a horse can jump a low fence but cannot ride through it or jump a tall wall',()=>{
  const run=(jump,top)=>{
    const w=world();w.colliders=[{x:0,z:-4,hx:5,hz:.12,minY:2,maxY:top}];const a=rider(w);
    if(jump)a.m.jump(RIDE.jumpSpeed);a.step(['KeyW','ShiftLeft'],65);return a;
  };
  assert(run(false,2.7).p.z>-3.3);assert(run(true,2.7).p.z<-10);
  const wall=run(true,8);assert(wall.p.z>-3.3);assert.equal(wall.p.y,2);assert(wall.m.state().grounded);
});
test('the mounted rider respects overhead clearance and lands back beneath a ceiling',()=>{
  const w=world();w.colliders=[{x:0,z:0,hx:4,hz:4,minY:5.2,maxY:6}];const a=rider(w);
  a.m.jump(RIDE.jumpSpeed);let peak=2;for(let i=0;i<55;i++){a.step();peak=Math.max(peak,a.p.y);}
  assert(peak+RIDE.bodyHeight<=5.2+1e-6);assert(peak>2);assert.equal(a.p.y,2);assert(a.m.state().grounded);
});
test('jump landing follows sloped terrain and remains supported atop a bounded low obstacle',()=>{
  const w=world();w.heightAt=(x,z)=>2-z*.07;const slope=rider(w);slope.m.jump(RIDE.jumpSpeed);slope.step(['KeyW'],65);
  assert.equal(slope.p.y,w.heightAt(slope.p.x,slope.p.z));assert(slope.m.state().grounded);
  const block=world();block.colliders=[{x:0,z:-2.4,hx:2,hz:.7,minY:2,maxY:2.5}];const a=rider(block);
  a.m.jump(RIDE.jumpSpeed);a.step(['KeyW'],18);a.step([],60);assert.equal(a.p.y,2.5);assert(a.m.state().grounded);assert(a.m.state().onObstacle);
  a.step(['KeyW'],40);assert.equal(a.p.y,2);assert(a.m.state().grounded);assert(!a.m.state().onObstacle);
});
test('a jumping horse enters swimming only at the water surface and can jump again on shore',()=>{
  const w=world();w.heightAt=(x,z)=>z<-2?-3:2;w.waterAt=()=>1;const a=rider(w);
  a.m.jump(RIDE.jumpSpeed);a.step(['KeyW','ShiftLeft'],12);
  assert(a.p.z<-2);assert(a.p.y>2);assert(!a.m.state().swimming);
  a.step([],70);assert(a.m.state().swimming);assert.equal(a.p.y,1-RIDE.floatOffset);assert(!a.m.jump(RIDE.jumpSpeed));
  a.step(['KeyS'],80);assert(!a.m.state().swimming);assert.equal(a.p.y,2);assert(a.m.jump(RIDE.jumpSpeed));
});
test('jump render height tracks physical height without terrain smoothing lag',()=>{
  const view=createMountedPresentation();view.update({y:2,heading:0,speed:0},.02);
  assert.equal(view.update({y:3.4,heading:0,speed:13,exactHeight:true},.02).y,3.4);
  assert.equal(view.update({y:2,heading:0,speed:13,exactHeight:true},.02).y,2);
});
test('developer and ordinary mount hosts reject airborne dismounts and resume after landing',async()=>{
  const THREE=await sourceModule('../vendor/three.module.js');
  const {createExplorationMounts}=await sourceModule('../src/dev/tools/exploration-mounts.js');
  const w=world(),position=new THREE.Vector3(0,2,0),movement=explorationMovement(position,w);
  const mounts=createExplorationMounts({scene:new THREE.Scene(),actor:{group:new THREE.Group()},position,world:w,movement});
  for(const speedMultiplier of [1,2]){
    assert(mounts.select('horse',{speedMultiplier}).ok);assert(mounts.jump());assert(mounts.state().jumping);
    assert(!mounts.land().ok);assert.equal(mounts.kind,'horse');assert(!mounts.jump());
    for(let i=0;i<50;i++)mounts.step(new Set(),0,.02);
    assert(!mounts.state().jumping);assert(mounts.land().ok);assert.equal(mounts.kind,'foot');
  }
});
test('mounting refuses an overhead gap that fits a person but not a mounted rider',async()=>{
  const THREE=await sourceModule('../vendor/three.module.js');
  const {createExplorationMounts}=await sourceModule('../src/dev/tools/exploration-mounts.js');
  const {createStableGrounding}=await sourceModule('../src/app/exploration/stable-host.js');
  const w=world();w.colliders=[{x:0,z:0,hx:3,hz:3,minY:4.4,maxY:5}];
  const position=new THREE.Vector3(0,2,0),movement=explorationMovement(position,w);
  const mounts=createExplorationMounts({scene:new THREE.Scene(),actor:{group:new THREE.Group()},position,world:w,movement});
  assert(!mounts.select('horse').ok);assert.equal(mounts.kind,'foot');
  assert.equal(createStableGrounding(w,position).mountFloor(0,0),null);
});

test('dismount and battle reset leave the rider upright at every riding heading',async()=>{
  const THREE=await sourceModule('../vendor/three.module.js');
  const {createExplorationMounts}=await sourceModule('../src/dev/tools/exploration-mounts.js');
  for(const heading of [0,Math.PI/2-.01,Math.PI/2+.01,Math.PI,-Math.PI,-2.3,4.5])for(const exit of ['land','reset']){
    const w=world(),position=new THREE.Vector3(0,2,0),movement=explorationMovement(position,w);
    const actor={group:new THREE.Group(),animate(){}};actor.group.rotation.y=heading;
    const mounts=createExplorationMounts({scene:new THREE.Scene(),actor,position,world:w,movement});
    assert(mounts.select('horse').ok);
    // Even a zero jump pitch passes through quaternion/Euler conversion while
    // riding. Beyond a quarter turn that can represent yaw as pitch plus roll.
    mounts.draw(1,{heading,speed:0,grounded:true,swimming:false});
    if(exit==='land')assert(mounts.land().ok);else mounts.reset();
    const up=new THREE.Vector3(0,1,0).applyQuaternion(actor.group.quaternion);
    const forward=new THREE.Vector3(0,0,1).applyQuaternion(actor.group.quaternion);
    assert(up.distanceTo(new THREE.Vector3(0,1,0))<1e-8,`${exit} at ${heading} leaves the rider upright`);
    assert(forward.distanceTo(new THREE.Vector3(Math.sin(heading),0,Math.cos(heading)))<1e-8,'Dismount preserves the true riding heading');
    assert.equal(mounts.kind,'foot');
  }
});
