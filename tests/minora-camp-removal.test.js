import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as THREE from '../vendor/three.module.js';
import {isRetiredCampTriangle,retireMinoraCamp} from '../scripts/retire-minora-camp.mjs';
import {createMapFog,validateMapFogSnapshot} from '../src/ui/map/map-fog.js';
const {readLookoutAttribute}=await import('../src/content/regions/minora-frontier/lookout-scene.js');

const triangle=(points,hex)=>({positions:points.flat(),colors:points.flatMap(()=>new THREE.Color(hex).toArray()),indices:[0,1,2]});
const retired=t=>isRetiredCampTriangle(t.positions,t.colors,t.indices);
test('older saves retain their discoveries while the removed army label disappears',()=>{
 const fog=createMapFog();fog.reveal(-2474,83);const saved=fog.snapshot();saved.subregions.push('menora-army-muster');
 assert.equal(validateMapFogSnapshot(saved),true);assert.equal(fog.restore(saved),true);
 assert.deepEqual(fog.snapshot().cells,saved.cells);assert.ok(!fog.snapshot().subregions.includes('menora-army-muster'));
 assert.ok(!fog.view().subregions.some(s=>s.id==='menora-army-muster'));
 assert.equal(validateMapFogSnapshot({...saved,subregions:['invented-place']}),false);
});
test('prepared-scene cleanup identifies only the retired camp primitives, preserving roads and city craft',()=>{
 assert(retired(triangle([[-2507.5,21.33,35.5],[-2507.5,21.33,40],[-2500,21.33,40]],'#b2ab86')));
 assert(retired(triangle([[-2504,21.3,42],[-2504,21.3,52],[-2500,26.3,52]],'#9a7266')));
 assert(!retired(triangle([[-2473,21.35,65],[-2467,21.35,65],[-2473,21.35,70]],'#c4c2ac')),'Road paving stays');
 assert(!retired(triangle([[-2476,23,84],[-2476,24,84],[-2475,23,84]],'#726052')),'Unrelated wooden detail in the field stays');
 assert(!retired(triangle([[-2400,21.3,43],[-2400,21.3,53],[-2395,26.3,53]],'#9a7266')),'The same canvas elsewhere stays');
});

test('the actual prepared lookout keeps all unrelated geometry and cleanup is idempotent',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../assets/lookout/landscape.json',import.meta.url))),packed=readFileSync(new URL('../assets/lookout/landscape.bin.gz',import.meta.url));
 const bytes=gunzipSync(packed),buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),result=retireMinoraCamp(manifest,buffer);
 if(result.removed){
  assert.ok(result.removed>100);assert.equal(result.rows.length,1);assert.ok(result.rows[0].retainedTriangles>50000);
  const changed=new Set(result.rows.map(r=>r.geometry));
  for(let i=0;i<manifest.geometries.length;i++)if(!changed.has(i))assert.deepEqual(result.manifest.geometries[i],manifest.geometries[i]);
  assert.equal(result.manifest.triangles,manifest.triangles-result.removed);
 }else {
  // A fresh export from camp-free scenery never needs the one-off migration
  // marker. A clean asset must instead remain byte-for-byte unchanged.
  assert.deepEqual(result.manifest,manifest);
  assert.deepEqual(result.buffer,bytes);
 }
 assert.equal(result.manifest.meshes.length,manifest.meshes.length,'No whole city batch is hidden');
 assert.ok(!result.manifest.meshes.some(p=>(p.sources??[p.name]).some(s=>s.endsWith('/ The Blood Prince’s field army muster'))));
 // Check the actual surviving indices, independent of source labels or the
 // migration marker, including city batches which still overlap the old site.
 const clean=result.buffer.buffer.slice(result.buffer.byteOffset,result.buffer.byteOffset+result.buffer.byteLength);
 let matches=0,checked=0;
 for(const part of result.manifest.meshes){
  const sphere=part.sphere,g=result.manifest.geometries[part.geometry],p=g.attributes.position,c=g.attributes.color;
  if(part.region!==16||part.instances||!sphere||!g.index||!c||Math.abs(sphere[0]+2474)>sphere[3]+34||Math.abs(sphere[2]-83)>sphere[3]+48)continue;
  const raw=readLookoutAttribute(clean,p),positions=Float32Array.from(raw,(v,i)=>p.quantization?p.quantization.offset[i%3]+v*p.quantization.scale[i%3]:v);
  const matrix=new THREE.Matrix4().fromArray(part.matrix),point=new THREE.Vector3();
  for(let i=0;i<positions.length;i+=3){point.fromArray(positions,i).applyMatrix4(matrix);point.toArray(positions,i);}
  const colors=Float32Array.from(readLookoutAttribute(clean,c),v=>c.normalized?v/255:v),indices=readLookoutAttribute(clean,g.index);
  for(let i=0;i<indices.length;i+=3){checked++;if(isRetiredCampTriangle(positions,colors,[indices[i],indices[i+1],indices[i+2]]))matches++;}
 }
 assert.ok(checked>1000,'Unrelated city and ground geometry still surrounds the practice field');
 assert.equal(matches,0,'No retired camp primitives remain in the rendered geometry');
 const second=retireMinoraCamp(result.manifest,result.buffer.buffer.slice(result.buffer.byteOffset,result.buffer.byteOffset+result.buffer.byteLength));
 assert.equal(second.removed,0);assert.deepEqual(second.manifest,result.manifest);
});
