import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './module-loader.js';
import * as THREE from '../vendor/three.module.js';
import { canStand } from '../src/game-state.js';

const {createRoadLife,ROAD_LIFE_ZONES}=await sourceModule('../src/road-life.js');
const [SHEEP,BIRDS,HARES]=ROAD_LIFE_ZONES;
const middle=zone=>({x:(zone.minX+zone.maxX)/2,z:(zone.minZ+zone.maxZ)/2});
const fixture=(colliders=[])=>{
  const scene=new THREE.Scene(),world={bounds:{minX:-1460,maxX:210,minZ:-349,maxZ:1099},heightAt:()=>2,colliders};
  return {scene,world,life:createRoadLife(scene,world)};
};

test('the regions carry several small flocks, each in its own three shared instanced meshes',()=>{
  const {scene,life}=fixture(),state=life.snapshot();
  assert.deepEqual(state.groups.map(g=>g.count),[6,3,2,5,4,3]);
  assert.equal(new Set(state.creatures.map(c=>c.id)).size,state.creatures.length,'every animal has its own id');
  assert.deepEqual(state.creatures.map(c=>c.species).filter((v,i,a)=>a.indexOf(v)===i),['sheep','bank-bird','rock-hare']);
  let meshes=0;
  scene.traverse(object=>{if(object.isMesh){meshes++;assert.ok(object.isInstancedMesh);}});
  assert.equal(meshes,18);
  const copy=life.snapshot();copy.creatures[0].x=12345;
  assert.notEqual(life.snapshot().creatures[0].x,12345,'review state cannot mutate simulation positions');
});

test('pause freezes poses and timers; distant regional groups perform no creature updates',()=>{
  const {life}=fixture();life.update(.1,middle(SHEEP));
  const before=life.snapshot();
  for(let i=0;i<100;i++)life.update(.1,middle(SHEEP),false);
  assert.deepEqual(life.snapshot(),before);
  life.update(.1,{x:200,z:-200});
  const distant=life.snapshot();
  assert.deepEqual(distant.creatures,before.creatures);
  assert.ok(distant.groups.every(g=>!g.visible));
  assert.deepEqual(distant.groups.map(g=>g.ticks),before.groups.map(g=>g.ticks));
  const invalid=life.snapshot();
  for(const dt of [NaN,Infinity,0,-1])life.update(dt,middle(SHEEP));
  life.update(.1,{x:NaN,z:0});assert.deepEqual(life.snapshot(),invalid);
});

test('approached sheep flee but swept movement cannot cross a fence or region bounds',()=>{
  const fenceZ=SHEEP.minZ+4;
  const {world,life}=fixture([{x:middle(SHEEP).x,z:fenceZ,hx:20,hz:.12,kind:'fence'}]);
  const first=life.snapshot().creatures.find(c=>c.id==='sheep-1');
  for(let i=0;i<150;i++) {
    const animal=life.snapshot().creatures.find(c=>c.id===first.id);
    life.update(.1,{x:animal.x,z:animal.z+3});
    const after=life.snapshot().creatures.find(c=>c.id===first.id);
    assert.ok(canStand(after.x,after.z,world,.43));
    assert.ok(after.z>fenceZ+.5,'the sheep must turn away from the continuous fence');
    assert.ok(after.x>=SHEEP.minX&&after.x<=SHEEP.maxX);
  }
  assert.equal(life.snapshot().creatures.find(c=>c.id===first.id).action,'flee');
});

test('bank birds take a visible flight and land on a valid bank, while hares make quick short hops',()=>{
  const {life,world}=fixture([{x:middle(BIRDS).x,z:BIRDS.minZ-1,hx:40,hz:5,kind:'river-water'}]);
  const bird=life.snapshot().creatures.find(c=>c.id==='bank-bird-1');
  life.update(.1,{x:bird.x-3,z:bird.z});
  assert.equal(life.snapshot().creatures.find(c=>c.id===bird.id).action,'flight');
  life.update(.2,{x:bird.x-3,z:bird.z});
  const raised=life.snapshot().creatures.find(c=>c.id===bird.id);
  assert.ok(raised.y>raised.groundY+.2,'bird lifts above the ground');
  for(let i=0;i<40;i++)life.update(.1,{x:BIRDS.minX-8,z:BIRDS.minZ-8});
  const landed=life.snapshot().creatures.find(c=>c.id===bird.id);
  assert.notEqual(landed.action,'flight');assert.ok(canStand(landed.x,landed.z,world,.2));
  assert.equal(landed.y,landed.groundY);
  const hare=life.snapshot().creatures.find(c=>c.id==='rock-hare-1');
  life.update(.1,{x:hare.x,z:hare.z+3});
  const hop=life.snapshot().creatures.find(c=>c.id===hare.id);
  assert.equal(hop.action,'flee');assert.ok(hop.speed>5);assert.ok(hop.y>hop.groundY);
});

test('all animated instance transforms stay finite and preserve positive scale across slow frames',()=>{
  const {life,scene}=fixture(),matrix=new THREE.Matrix4();
  for(const player of [middle(SHEEP),middle(BIRDS),middle(HARES)]) {
    for(let i=0;i<90;i++)life.update(i%13===0?4:1/30,player);
    scene.traverse(object=>{if(object.isInstancedMesh)for(let i=0;i<object.count;i++){
      object.getMatrixAt(i,matrix);
      assert.ok(matrix.elements.every(Number.isFinite));
      assert.ok(matrix.determinant()>0,'instanced models must not use unsupported mirrored scales');
    }});
  }
  for(const creature of life.snapshot().creatures)
    for(const key of ['x','y','z','groundY','yaw','speed','clock'])assert.ok(Number.isFinite(creature[key]));
});

test('every creature spawns on clear land in the actual extended world',async()=>{
  const {createWorld}=await sourceModule('../src/world.js');
  const scene=new THREE.Scene(),world=createWorld(scene),life=createRoadLife(scene,world);
  assert.equal(life.snapshot().creatures.length,23);
  for(const creature of life.snapshot().creatures)
    assert.ok(canStand(creature.x,creature.z,world,creature.species==='sheep'?.43:creature.species==='bank-bird'?.2:.23),creature.id);
  for(const player of [middle(SHEEP),middle(BIRDS),middle(HARES)])
    for(let i=0;i<60;i++)life.update(1/30,player);
  for(const creature of life.snapshot().creatures) {
    if(creature.action==='flight')continue;
    assert.ok(canStand(creature.x,creature.z,world,creature.species==='sheep'?.43:creature.species==='bank-bird'?.2:.23),creature.id);
  }
});
