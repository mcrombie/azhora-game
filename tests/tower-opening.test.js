import test from 'node:test';
import assert from 'node:assert/strict';
import {createTowerState,validTowerState,TOWER,TOWER_SPAWN,TOWER_EXIT} from '../src/app/exploration/tower-state.js';
import {createWorldWar} from '../src/app/exploration/world-war.js';
import {validateWorldWarSave,WORLD_WAR_KEY,worldWarStore} from '../src/app/exploration/war-checkpoint.js';
import {MODES,allowsRegion} from '../src/app/exploration/modes.js';
import {sourceModule} from './module-loader.js';
import {MENORA_BUILDINGS} from '../src/content/regions/minora-frontier/menora-city.js';

const checkpoint=()=>({format:WORLD_WAR_KEY,version:1,...createWorldWar().checkpoint(),
  exploration:{version:1,character:'teresod',position:TOWER_SPAWN,heading:Math.PI,camera:{yaw:0,pitch:.27,distance:8},elapsed:0,cells:[]}});
test('briefing locks departure, starts once, and survives repeat visits and restores',()=>{
  const state=createTowerState();assert(state.inside);assert(!state.leave());assert(!state.briefed);
  assert(state.begin());assert(!state.begin());assert(state.leave());state.enter();
  const restored=createTowerState({...checkpoint(),tower:state.snapshot(true)});
  assert(restored.inside);assert(restored.briefed);assert(restored.snapshot().running);assert(!restored.begin());assert(restored.leave());
});
test('legacy campaigns remain outdoors and keep all campaign history',()=>{
  const war=createWorldWar();war.advance(4);const data={...checkpoint(),...war.checkpoint()};
  const opening=createTowerState(data);assert(opening.briefed);assert(!opening.inside);assert(!opening.begin());
  assert(validateWorldWarSave(data));assert.deepEqual(createWorldWar(data).snapshot(),war.snapshot());
});
test('tower save schema rejects malformed locks and preserves the previous valid save',()=>{
  const data={...checkpoint(),tower:createTowerState().snapshot(false)};
  assert(validateWorldWarSave(data));let raw=JSON.stringify(data);
  const store=worldWarStore({getItem:()=>raw,setItem:(key,value)=>{raw=value;}});
  for(const invalid of [{...data.tower,version:2},{...data.tower,location:'elsewhere'},{...data.tower,running:true},{...data.tower,location:'world'},{...data.tower,briefed:'yes'}]){
    assert(!validTowerState(invalid));assert(!store.save({...data,tower:invalid}).ok);assert.deepEqual(store.read().data,data);
  }
});
test('room navigation, door anchoring and world restriction match the authored tower',async()=>{
  const THREE=await sourceModule('../vendor/three.module.js');
  const {createTowerWorld}=await sourceModule('../src/app/exploration/tower-world.js');
  const {canStand}=await sourceModule('../src/gameplay/movement/locomotion.js');
  const {explorationMovement}=await sourceModule('../src/app/exploration/movement.js');
  const world=await createTowerWorld(new THREE.Scene(),()=>{},{inside:true,enabledRegions:MODES.war.regions});
  assert(!world.state().exteriorLoaded,'Opening the chamber must not build the world');
  const tower=MENORA_BUILDINGS.find(b=>b.kind==='sorcerers-tower');assert.equal(tower.x,TOWER.x);assert.equal(tower.z,TOWER.z);
  assert(TOWER_EXIT.z>tower.z+tower.depth/2+1,'Exit clears the existing tower collider');
  const position=new THREE.Vector3(TOWER_SPAWN.x,TOWER_SPAWN.y,TOWER_SPAWN.z),move=explorationMovement(position,world);
  for(let i=0;i<100;i++)move.step(new Set(['KeyW']),0,.02);
  assert(position.z<TOWER_SPAWN.z-6,'Player can reach Taleth without furniture blocking the aisle');
  for(const yaw of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
    position.set(TOWER_SPAWN.x,TOWER_SPAWN.y,TOWER_SPAWN.z);move.reset();
    for(let i=0;i<800;i++){if(i%100===0)move.jump();move.step(new Set(['KeyW','ShiftLeft']),yaw,.02);}
    assert(world.canExploreAt(position.x,position.z));assert(canStand(position.x,position.z,world));
  }
  assert.deepEqual(world.state().occupants,['Taleth']);
  assert.deepEqual(MODES.war.regions,[16,17,25,13,14]);assert(!allowsRegion(MODES.war,21));assert(allowsRegion(MODES.explore,21));
  world.dispose();
});
