import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from '../vendor/three.module.js';
import {sourceModule} from './module-loader.js';
const {canonicalAlezhorDriftwood,measureAlezhorNativeLayout}=await sourceModule('../src/dev/checks/alezhor-checks.js');
const captured=JSON.parse(readFileSync(new URL('./fixtures/alezhor-driftwood-native-roundoff.json',import.meta.url)));
const nonY=rows=>{const copy=new Float32Array(rows);for(let i=13;i<copy.length;i+=16)copy[i]=0;return copy;};
const original=nonY(captured.node.rawMatrix),native=nonY(captured.native.rawMatrix);
const canonical=canonicalAlezhorDriftwood(original);

test('the recorded native difference is three algebraic-zero residuals and symmetric normalization preserves the saved Node baseline',()=>{
  const differences=[];for(let i=0;i<original.length;i++)if(original[i]!==native[i])differences.push(i);
  assert.deepEqual(differences,[16,18,25]);
  assert.ok(differences.every(i=>Math.abs(original[i]-native[i])<3.3e-17));
  assert.deepEqual(canonicalAlezhorDriftwood(native),canonical);
  assert.deepEqual(original,nonY(captured.node.rawMatrix),'normalization never edits source arrays');
  for(let i=0;i<original.length;i++)if(![0,2,5,9].includes(i%16))assert.equal(canonical[i],original[i]);
});

test('meaningful driftwood translation, scale and rotation changes remain visible to the canonical comparison',()=>{
  const translated=original.slice();translated[12]+=.01;
  assert.notDeepEqual(canonicalAlezhorDriftwood(translated),canonical);
  const scaled=original.slice();for(const k of [0,1,2])scaled[k]*=1.01;
  assert.notDeepEqual(canonicalAlezhorDriftwood(scaled),canonical);
  const rotated=original.slice(),c=Math.cos(.01),s=Math.sin(.01);
  for(const k of [0,4,8]){const x=rotated[k],z=rotated[k+2];rotated[k]=c*x+s*z;rotated[k+2]=-s*x+c*z;}
  assert.notDeepEqual(canonicalAlezhorDriftwood(rotated),canonical);
  const tooLarge=original.slice();tooLarge[0]=1e-12;
  assert.notDeepEqual(canonicalAlezhorDriftwood(tooLarge),canonical);
});

test('the collector applies machine-zero normalization only to the named driftwood batch and retains raw diagnostics',async()=>{
  const root=new THREE.Group(),mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial(),6);
  mesh.name='Other existing scenery';mesh.instanceMatrix.array.set(original);root.add(mesh);
  const other=await measureAlezhorNativeLayout(root);
  assert.equal(other.canonicalHash,other.hash,'all other batches remain byte-strict');
  mesh.name='Alezhor driftwood';const first=await measureAlezhorNativeLayout(root);
  mesh.instanceMatrix.array.set(native);const second=await measureAlezhorNativeLayout(root);
  assert.notEqual(first.hash,second.hash);assert.equal(first.canonicalHash,second.canonicalHash);
  assert.deepEqual(second.records[0].rawMatrix,Array.from(native));
});
