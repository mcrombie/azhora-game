import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule} from './module-loader.js';
import {createRiding,RIDE,DEVELOPER_HORSE_SPEED} from '../src/gameplay/movement/riding.js';
import {MINORA_STABLE} from '../src/content/regions/minora-frontier/minora-stable.js';
import {BARRETT} from '../src/content/quests/homes/willowmere-family.js';
import {createWorldWar} from '../src/app/exploration/world-war.js';
import {WORLD_WAR_KEY,validateWorldWarSave,worldWarStore} from '../src/app/exploration/war-checkpoint.js';
import {TOWER_SPAWN} from '../src/app/exploration/tower-state.js';
import {createWalkSurfaces} from '../src/world/collision/walk-surfaces.js';

const checkpoint=()=>({version:1,format:WORLD_WAR_KEY,...createWorldWar().checkpoint(),exploration:{version:1,character:'teresod',position:TOWER_SPAWN,heading:0,camera:{yaw:0,pitch:.27,distance:8},elapsed:0,cells:[]}});
test('Bear reuses the child appearance; ownership is separate and can only be granted once',()=>{
  assert.equal(MINORA_STABLE.look,BARRETT.look);assert(MINORA_STABLE.look.child);assert.equal(MINORA_STABLE.look.hairStyle,'short-cropped');
  const riding=createRiding();assert(riding.grant(MINORA_STABLE.horse).ok);riding.teach();assert(!riding.grant({x:0,z:0}).ok);
  assert(riding.mount(MINORA_STABLE.horse).ok);riding.ride({x:-2422,z:74},0,10);
  assert(riding.dismount(()=>true).ok);const saved=riding.snapshot(),restored=createRiding();assert(restored.restore(saved));
  assert.deepEqual(restored.snapshot(),saved);assert(!restored.mounted);assert(!restored.called);assert.equal(restored.horse.z,74);
});
test('war saves retain the parked horse, accept old saves, and reject bad horse data without overwrite',()=>{
  const old=checkpoint();assert(validateWorldWarSave(old));
  const riding=createRiding();riding.grant(MINORA_STABLE.horse);riding.teach();const saved={...old,riding:riding.snapshot()};
  assert(validateWorldWarSave(saved));let raw=JSON.stringify(saved);const store=worldWarStore({getItem:()=>raw,setItem:(key,value)=>{raw=value;}});
  for(const bad of [null,{...saved.riding,owned:false},{...saved.riding,horse:{x:Infinity,z:1,yaw:0}},{...saved.riding,horse:{x:1e9,z:1,yaw:0}}]){
    assert(!store.save({...saved,riding:bad}).ok);assert.deepEqual(store.read().data,saved);
  }
});
test('real horse uses normal riding pace while developer/autoplay horse stays fast',async()=>{
  const THREE=await sourceModule('../vendor/three.module.js');
  const {createExplorationMounts}=await sourceModule('../src/dev/tools/exploration-mounts.js');
  const position=new THREE.Vector3(0,1,0),actor={group:new THREE.Group()};let tuning;
  const movement={state:()=>({grounded:true}),reset(){},step(keys,yaw,dt,config){tuning=config;return {};}};
  const world={bounds:{minX:-100,maxX:100,minZ:-100,maxZ:100},heightAt:()=>1,waterAt:()=>-100,nearColliders:()=>[],readyAt:()=>true};
  const mounts=createExplorationMounts({scene:new THREE.Scene(),actor,position,world,movement});
  assert(mounts.select('horse',{speedMultiplier:1}).ok);mounts.step(new Set(),0,.02);assert.equal(tuning.run,RIDE.canter);
  mounts.reset();assert(mounts.select('horse').ok);mounts.step(new Set(),0,.02);assert.equal(tuning.run,RIDE.canter*DEVELOPER_HORSE_SPEED);
});

test('developer horse cannot dismount in open deep water but can step safely onto a clear bank',async()=>{
  const THREE=await sourceModule('../vendor/three.module.js');
  const {createExplorationMounts}=await sourceModule('../src/dev/tools/exploration-mounts.js');
  const position=new THREE.Vector3(0,1,0),actor={group:new THREE.Group()};let wet=false;
  const movement={state:()=>({grounded:true,swimming:wet}),reset(){},step(){return {};}};
  const world={bounds:{minX:-100,maxX:100,minZ:-100,maxZ:100},heightAt:x=>wet?(x>1?2:-4):2,waterAt:()=>1,nearColliders:()=>[],readyAt:()=>true,canExploreAt:()=>true};
  const mounts=createExplorationMounts({scene:new THREE.Scene(),actor,position,world,movement});
  assert(mounts.select('horse').ok);wet=true;position.set(-10,1-RIDE.floatOffset,0);
  assert(!mounts.land().ok);assert.equal(mounts.kind,'horse');assert(mounts.state().swimming);
  position.set(0,1-RIDE.floatOffset,0);assert(mounts.land().ok);assert.equal(mounts.kind,'foot');assert(position.x>1);assert.equal(position.y,2);
});
test('parked horse retains reachable deck footing without lifting an under-bridge swimmer',async()=>{
  const {createStableGrounding}=await sourceModule('../src/app/exploration/stable-host.js');
  const {canStand}=await sourceModule('../src/gameplay/movement/locomotion.js');
  const ground=()=>-4,walks=createWalkSurfaces([{id:'test-deck',kind:'deck',a:{x:-5,y:6,z:0},b:{x:5,y:6,z:0},width:6}],ground);
  const world={heightAt:ground,waterAt:()=>1,supportAt:walks.supportAt,bounds:{minX:-100,maxX:100,minZ:-100,maxZ:100},nearColliders:()=>[]};
  const rider={x:0,y:6,z:0},deck=createStableGrounding(world,rider);
  assert.equal(deck.at(0,0).y,6);assert.equal(deck.at(0,0).swimming,false);
  assert.equal(deck.mountFloor(0,0).y,6,'Rider can mount a horse on the same reachable deck');
  assert(canStand(1.15,0,deck.field(rider.y),.34,deck.support(1.15,0)),'Dismount has dry, height-aware deck footing');
  deck.remember(6);Object.assign(rider,{x:30,y:1-RIDE.floatOffset,z:0});
  assert.equal(deck.at(0,0).y,6,'Parked horse remains on its known deck after rider walks away');
  const swimmer={x:0,y:1-RIDE.floatOffset,z:0},below=createStableGrounding(world,swimmer);
  assert.equal(below.at(0,0).swimming,true);assert.equal(below.at(0,0).y,1-RIDE.floatOffset);
  below.remember(1-RIDE.floatOffset);swimmer.y=6;
  assert.equal(below.at(0,0).swimming,true,'A known swimming horse stays under the bridge even if the rider later stands above it');
  assert.equal(below.mountFloor(0,0),null,'Mounting from the bridge cannot pull a swimming horse up to the rider');
  assert(!canStand(1.15,0,below.field(1-RIDE.floatOffset),.34,1-RIDE.floatOffset),'Deep-water dismount cannot use an unreachable overhead deck');
});
test('a called horse reaches a dry bank rather than stopping unmountable in nearby water',()=>{
  const riding=createRiding(),player={x:0,z:10},afloat=z=>z<9;
  riding.grant({x:0,z:7.5});assert(!riding.whistle(player).ok,'Ordinary near-distance rule remains unchanged');
  assert(riding.whistle(player,{allowNear:true}).ok);
  for(let i=0;i<100&&riding.called;i++)riding.update(.04,player,()=>true,{speedAt:(x,z)=>afloat(z)?RIDE.swim:RIDE.trot,canHaltAt:(x,z)=>!afloat(z)});
  assert(!riding.called);assert(riding.horse.z>=9,'Horse reaches dry ground before halting');assert(riding.distanceTo(player)<=RIDE.reach);
});
test('minimap uses local colliders, handles a road crossing with both ends offscreen, and shows real river samples',async()=>{
  const {localMapColliders,localMapShapes}=await sourceModule('../src/app/exploration/local-map.js');
  const {localRivers}=await sourceModule('../src/app/exploration/local-rivers.js');
  const {ISAREOS_BECKS}=await sourceModule('../src/content/regions/western-regions/west-regions.js');
  let query;const world={nearColliders:(x,z,r)=>{query={x,z,r};return [{kind:'building',x:0,z:0,hx:3,hz:4},{kind:'tree',x:2,z:2,r:.4}];}};
  assert.equal(localMapColliders(world,{x:0,z:0},20)[0].kind,'house');assert(query.r<30);
  const crossing=[{x:-100,z:0},{x:100,z:0}],distant=[{x:200,z:0},{x:300,z:0}];
  assert.deepEqual(localMapShapes([crossing,distant],{x:0,z:0},20),[crossing]);
  const p=ISAREOS_BECKS[0].samples[Math.floor(ISAREOS_BECKS[0].samples.length/2)];const rivers=localRivers(p,60);
  assert(rivers.length>0);assert(rivers.every(r=>r.points.length>=4&&r.points.every(v=>Number.isFinite(v.x)&&Number.isFinite(v.z))));
});
