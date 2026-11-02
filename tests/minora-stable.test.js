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
import {horseSummonSpot} from '../src/app/exploration/horse-summon.js';

const checkpoint=()=>({version:1,format:WORLD_WAR_KEY,...createWorldWar().checkpoint(),exploration:{version:1,character:'teresod',position:TOWER_SPAWN,heading:0,camera:{yaw:0,pitch:.27,distance:8},elapsed:0,cells:[]}});
const summonWorld=()=>({bounds:{minX:-100,maxX:100,minZ:-100,maxZ:100},heightAt:()=>2,waterAt:()=>0,readyAt:()=>true,canExploreAt:()=>true,nearColliders:()=>[]});

test('magical horse call checks ownership and mounting, lands immediately and retains its saved position',()=>{
  const riding=createRiding(),player={x:0,y:2,z:0},at=horseSummonSpot(player,0,summonWorld());
  assert(at);assert(Math.hypot(at.x,at.z)<=RIDE.reach);assert(!riding.summon(at,at.yaw).ok);
  riding.grant({x:200,z:300});riding.teach();const original=riding.snapshot();
  assert(!riding.summon(null).ok);assert.deepEqual(riding.snapshot(),original);
  assert(riding.summon(at,at.yaw).ok);assert.equal(riding.called,false);assert.equal(riding.pace,0);
  assert.deepEqual(riding.horse,{x:at.x,z:at.z,yaw:at.yaw});
  const restored=createRiding();assert(restored.restore(riding.snapshot()));assert.deepEqual(restored.snapshot(),riding.snapshot());
  assert(riding.mount(player).ok);const mounted=riding.snapshot();assert(!riding.summon({x:80,z:80},0).ok);assert.deepEqual(riding.snapshot(),mounted);
});

test('magical arrival avoids water, unloaded terrain, obstacles, cliffs and occupied stable stalls',()=>{
  const player={x:0,y:2,z:0},world=summonWorld();
  assert.equal(horseSummonSpot(player,0,{...world,waterAt:()=>3}),null);
  assert.equal(horseSummonSpot(player,0,{...world,readyAt:()=>false}),null);
  assert.equal(horseSummonSpot(player,0,{...world,canExploreAt:()=>false}),null);
  assert.equal(horseSummonSpot(player,0,{...world,heightAt:()=>8}),null);
  assert.equal(horseSummonSpot(player,0,world,{clearAt:()=>false}),null);
  const blocked={...world,nearColliders:()=>[{x:0,z:0,hx:10,hz:10}]};assert.equal(horseSummonSpot(player,0,blocked),null);
  // A narrow dry patch under only the saddle is too small for the entire horse.
  assert.equal(horseSummonSpot(player,0,{...world,readyAt:(x,z)=>Math.abs(x)<.2&&Math.abs(z-2.3)<.2}),null);
  const spot=horseSummonSpot(player,0,world,{clearAt:x=>x>1});assert(spot?.x>1,'Finds a safe side when the path ahead is occupied');
});

test('summoned horse shares a reachable deck and cannot jump up from beneath a bridge',()=>{
  const ground=()=>-4,walks=createWalkSurfaces([{id:'summon-deck',kind:'deck',a:{x:-5,y:6,z:0},b:{x:5,y:6,z:0},width:8}],ground);
  const world={...summonWorld(),heightAt:ground,waterAt:()=>1,supportAt:walks.supportAt};
  assert.equal(horseSummonSpot({x:0,y:6,z:0},0,world)?.y,6);
  assert.equal(horseSummonSpot({x:0,y:.15,z:0},0,world),null);
});

test('blue horse wisps expire, cancel, and dispose without adding dynamic lights',async()=>{
  const THREE=await sourceModule('../vendor/three.module.js');
  const {createHorseSummonEffect}=await sourceModule('../src/app/exploration/horse-summon-effect.js');
  const scene=new THREE.Scene(),effect=createHorseSummonEffect(scene);
  effect.start({x:2,y:6,z:3});assert(effect.active);let lights=0;scene.traverse(o=>{if(o.isLight)lights++;});assert.equal(lights,0);
  effect.update(.4);assert(effect.active);effect.update(1);assert(!effect.active);
  effect.start({x:0,y:0,z:0});effect.cancel();assert(!effect.active);
  effect.start({x:0,y:0,z:0});effect.dispose();assert.equal(scene.children.length,0);effect.dispose();effect.start({x:0,y:0,z:0});assert(!effect.active);
});
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
  const study={kind:'senro-folded-study',x:0,z:-9,hx:3.35,hz:2.7,minY:10.5,maxY:17.7},caseAbove={kind:'senro-suspended-luggage',x:9,z:10.8,hx:1.1,hz:.65,minY:16,maxY:17.4};
  const room={nearColliders:()=>[study,caseAbove]};
  assert.deepEqual(localMapColliders(room,{x:0,y:10.5,z:0},22,true),[{...study,kind:'house'}],'The minimap shows the blocked study footprint without projecting overhead luggage onto the walking floor');
  assert.deepEqual(localMapColliders(room,{x:0,y:21.3,z:0},22,true),[],'Snero furniture does not appear on Taleth\'s floor');
  const crossing=[{x:-100,z:0},{x:100,z:0}],distant=[{x:200,z:0},{x:300,z:0}];
  assert.deepEqual(localMapShapes([crossing,distant],{x:0,z:0},20),[crossing]);
  const p=ISAREOS_BECKS[0].samples[Math.floor(ISAREOS_BECKS[0].samples.length/2)];const rivers=localRivers(p,60);
  assert(rivers.length>0);assert(rivers.every(r=>r.points.length>=4&&r.points.every(v=>Number.isFinite(v.x)&&Number.isFinite(v.z))));
});
