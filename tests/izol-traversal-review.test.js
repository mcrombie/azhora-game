import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as THREE from '../vendor/three.module.js';
import { scopedWorld } from './scoped-world.js';
import { IZOL_PATHS, IZOL_MOLES, izolDeckHeight } from '../src/izol-world.js';
import { moveCharacter, canStand } from '../src/game-state.js';
import { canWalkSlope } from '../src/climbing.js';
import { bodyWorld, BODY } from '../src/bodies.js';
import { canPushThrough } from '../src/undergrowth.js';
import { closedRegionEntered } from '../src/closed-border.js';
import { SWIM } from '../src/swimming.js';
import { createTerrainFall, shouldStartTerrainFall } from '../src/terrain-fall.js';

const scene = new THREE.Scene(), world = await scopedWorld(scene, [8]);

// Static world collision and the same support/falling adapters used by main.js.
// This walks at 4.2 m/s without climbing, mounts, flight or damage immunity.
function walk(path, reverse) {
 const route=reverse?[...path.points].reverse():path.points;
 const at={...route[0],y:world.heightAt(route[0].x,route[0].z)},fall=createTerrainFall(),falls=[],dt=1/30;
 const playerWorld=bodyWorld(world).moving(at,BODY.traveler,'traveler');
 const climbWorld={...world,nearColliders:(x,z,r)=>playerWorld.nearColliders(x,z,r)};
 const surfaceAt=(x,z,{maxY=at.y,stepUp=fall.active?0:.35}={})=>{const support=world.supportAt(x,z,{maxY,stepUp});if(support.id)return {...support,water:false};const water=world.waterAt(x,z);return support.height<water?{height:Math.max(support.height,water-SWIM.sink),slope:0,gradient:{x:0,z:0},water:true}:{...support,water:false}};
 const fallingWorld={...world,heightAt:(x,z)=>world.supportAt(x,z,{maxY:at.y,groundSlope:false}).height,nearColliders:(x,z,r)=>playerWorld.nearColliders(x,z,r).filter(c=>c.kind!=='suval-peak-face')};
 let target=1,walked=0,damage=0,frames=0,stalled=0,wet=0;
 for(;target<route.length&&frames<18000;frames++){
  if(Math.hypot(route[target].x-at.x,route[target].z-at.z)<.2){target++;continue;}
  const goal=route[target],d=Math.hypot(goal.x-at.x,goal.z-at.z),dx=(goal.x-at.x)/d,dz=(goal.z-at.z)/d,before={...at};
  if(!fall.active){moveCharacter(at,dx*Math.min(.14,d),dz*Math.min(.14,d),playerWorld,BODY.traveler,{swimming:true,canTraverse:(x,z,nx,nz)=>canWalkSlope(x,z,nx,nz,climbWorld)&&canPushThrough(x,z,nx,nz,climbWorld)});const s=surfaceAt(at.x,at.z);
   if(shouldStartTerrainFall({before,after:at,floor:s.height,groundSlope:s.slope})){falls.push({before,after:{...at,y:s.height},slope:s.slope});fall.begin(at,{drift:{x:(at.x-before.x)/dt,z:(at.z-before.z)/dt}});}else at.y=s.height;
  }
  if(fall.active){const f=fall.tick(dt,{position:at,steer:{x:dx,z:dz},surfaceAt,moveHorizontal:(p,x,z)=>moveCharacter(p,x,z,fallingWorld,.34,{swimming:true,canTraverse:(x,z,nx,nz)=>fallingWorld.heightAt(nx,nz)<=p.y+.35&&!closedRegionEntered({x,z},{x:nx,z:nz})})});damage+=f.damage;}
  const moved=Math.hypot(at.x-before.x,at.z-before.z);walked+=moved;wet+=+(world.heightAt(at.x,at.z)<world.waterAt(at.x,at.z));stalled=moved<.001?stalled+dt:0;if(stalled>3||falls.length>20)break;
 }
 return { complete:target===route.length, clearStart:canStand(route[0].x,route[0].z,world),
   at, walked, damage, frames, wet, falls:falls.length };
}

for (const path of IZOL_PATHS) test(`${path.id} supports an ordinary outward and return walk without an accidental fall`, t => {
  for (const reverse of [false, true]) {
    const result = walk(path, reverse), label = `${path.id} ${reverse ? 'return' : 'outward'}`;
    assert.ok(result.clearStart, `${label} starts on clear ground`);
    assert.ok(result.complete, `${label} stopped at ${JSON.stringify(result.at)}`);
    assert.equal(result.falls, 0, `${label} entered falling`);
    assert.equal(result.damage, 0, `${label} caused damage`);
    assert.equal(result.wet, 0, `${label} left dry ground`);
    t.diagnostic(`${label}: ${result.walked.toFixed(2)} m, ${(result.frames / 30).toFixed(1)} simulated seconds.`);
  }
});

test('the east mole meets the higher shore without pulling a walker below visible ground', () => {
  for (const [x, z] of [[87.6732338513, 1727.261314946], [88, 1724], [89.9165067571, 1726.8037427603]]) {
    assert.equal(izolDeckHeight(x, z), 2.9, 'the original harbor deck footprint is retained');
    assert.ok(world.groundHeight(x, z) > 4, 'this was the higher shore contact');
    assert.equal(world.heightAt(x, z), world.groundHeight(x, z));
    assert.equal(world.supportAt(x, z, { maxY: 2.9, stepUp: .35 }).height, world.groundHeight(x, z));
  }
  for (const mole of IZOL_MOLES) {
    const head = mole.points.at(-1);
    assert.equal(world.heightAt(head.x, head.z), mole.deckY, 'the seaward deck still supports the traveler above the water');
  }
});

test('the 118 saved pines and all 5934 scatter instances keep their original identities and non-height data', () => {
  const meshes=[];
  scene.traverse(mesh=>{if(mesh.isInstancedMesh && mesh.count && Array.from({length:mesh.count},(_,i)=>i*16).some(i=>mesh.instanceMatrix.array[i+12]>-180&&mesh.instanceMatrix.array[i+12]<650&&mesh.instanceMatrix.array[i+14]>1570&&mesh.instanceMatrix.array[i+14]<2220))meshes.push(mesh)});
  const hash=createHash('sha256');
  for(const mesh of meshes){
    hash.update(JSON.stringify([mesh.name,mesh.count]));
    const matrix=new Float32Array(mesh.instanceMatrix.array);
    for(let i=13;i<matrix.length;i+=16)matrix[i]=0;
    hash.update(Buffer.from(matrix.buffer));
    if(mesh.instanceColor)hash.update(Buffer.from(new Float32Array(mesh.instanceColor.array).buffer));
  }
  assert.equal(meshes.length,35);
  assert.equal(meshes.reduce((n,m)=>n+m.count,0),5934);
  assert.equal(hash.digest('hex'),'137e22c15b058bbdc2e252c987b7bf9e7d20afcebedd826f9e89d68534bf69e8');
  const trees=world.timberTrees.filter(t=>t.id.startsWith('izol-')).map(t=>({id:t.id,x:t.x,z:t.z,height:t.height,species:t.species}));
  assert.equal(trees.length,118);
  assert.equal(createHash('sha256').update(JSON.stringify(trees)).digest('hex'),'d2125bf1971885c9a5fe3cbf7b074813124a9dff271b7194a7fcbacae9112cf3');
});
