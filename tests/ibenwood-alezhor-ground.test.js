import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as THREE from '../vendor/three.module.js';
import {createStreamedTerrain} from '../src/world/loading/streamed-terrain.js';
import {createIbenwoodAlezhorGroundSteps,combinedRiverIndex} from '../src/content/regions/ibenwood/ibenwood-alezhor-ground.js';
import {finishBuild} from '../src/world/loading/build-steps.js';

function river(x,z0,z1){return{courses:[{bounds:{minX:x,maxX:x,minZ:z0,maxZ:z1}}],nearest(px,pz,reach=48){const distance=Math.hypot(px-x,Math.max(z0-pz,pz-z1,0));return distance<=reach?{distance}:null;}};}
const forest=river(38,30,75),coast=river(38,75,125),heightAt=(x,z)=>12-Math.max(0,1-Math.abs(x-38)/10)*4+Math.sin(z*.04);
function built(order){
  const xs=Array.from({length:41},(_,i)=>i*7.1),zs=Array.from({length:41},(_,i)=>i*7.1),positions=new Float32Array(xs.length*zs.length*3),colors=new Float32Array(positions.length),sampled=new Uint8Array(xs.length*zs.length),root=new THREE.Group();
  const sample=(i,j)=>{const k=(j*xs.length+i)*3;positions.set([xs[i],12,zs[j]],k);colors.set([.2,.3,.4],k);};
  const stream=createStreamedTerrain({THREE,xs,zs,positions,colors,sampled,sample,root,material:new THREE.MeshBasicMaterial(),cells:{Forest:[{x:50,z:220}],Coast:[{x:50,z:0}]},ids:{Forest:1,Coast:2},tileSize:8});
  finishBuild(stream.buildRegion(order));
  const ground=finishBuild(createIbenwoodAlezhorGroundSteps({THREE,terrainRoot:root,forest,coast,heightAt,streamTerrain:stream}));
  finishBuild(stream.buildRegion(order===1?2:1));
  const hash=createHash('sha256');for(const m of [...ground.patches].sort((a,b)=>a.name.localeCompare(b.name)))for(const a of [m.geometry.attributes.position.array,m.geometry.attributes.color.array,m.geometry.index.array])hash.update(Buffer.from(a.buffer,a.byteOffset,a.byteLength));
  return{ground,root,hash:hash.digest('hex')};
}
test('a single forest/coast pass gives identical retained ground when either side streams first',()=>{
  const a=built(1),b=built(2);assert.equal(a.hash,b.hash);assert.ok(a.ground.patches.length>2);
  a.root.updateMatrixWorld(true);const ray=new THREE.Raycaster(new THREE.Vector3(),new THREE.Vector3(0,-1,0));
  for(const z of [31,55,74.9,75,75.1,99,124])for(const x of [37.7,38,42]){
    ray.ray.origin.set(x,50,z);const hit=ray.intersectObjects(a.root.children,false)[0];assert.ok(hit);
    assert.ok(Math.abs(a.ground.fineGroundHeight(x,z)-hit.point.y)<1e-6);assert.ok(hit.point.y<11);
  }
  assert.equal(a.ground.fineGroundHeight(220,220),null,'unrefined coarse surface must fall back');
});
test('union distance preserves each original corridor and accepts both shared-tile outlets',()=>{
  const both=combinedRiverIndex(forest,coast),reverse=combinedRiverIndex(coast,forest);
  for(let z=-25;z<=175;z+=5)for(let x=-10;x<=95;x+=5){const a=forest.nearest(x,z),b=coast.nearest(x,z),expected=Math.min(a?.distance??Infinity,b?.distance??Infinity);assert.equal(both.nearest(x,z)?.distance??Infinity,expected);assert.equal(reverse.nearest(x,z)?.distance??Infinity,expected);}
});
