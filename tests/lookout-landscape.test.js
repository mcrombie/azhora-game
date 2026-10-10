import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {sourceModule} from './module-loader.js';
const {assembleLookoutScene,readLookoutAttribute}=await sourceModule('../src/content/regions/minora-frontier/lookout-scene.js');
const manifest=JSON.parse(readFileSync(new URL('../assets/lookout/landscape.json',import.meta.url)));
const compressed=readFileSync(new URL('../assets/lookout/landscape.bin.gz',import.meta.url));
const bytes=gunzipSync(compressed),buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
const types={Float32Array,Float64Array,Uint32Array,Uint16Array,Uint8Array,Int8Array,Int16Array,Int32Array};
const values=a=>readLookoutAttribute(buffer,a);
test('padded compressed attributes retain signed values exactly',async()=>{
  const {MeshoptEncoder}=await import('meshoptimizer');await MeshoptEncoder.ready;
  const expected=new Int8Array([-127,0,127,40,-40,1,-1,126,-126,3,2,1]);
  const padded=new Uint8Array(16);
  for(let row=0;row<4;row++)padded.set(new Uint8Array(expected.buffer,row*3,3),row*4);
  const encoded=MeshoptEncoder.encodeGltfBuffer(padded,4,4,'ATTRIBUTES');
  const actual=readLookoutAttribute(encoded.buffer.slice(encoded.byteOffset,encoded.byteOffset+encoded.byteLength),{
    type:'Int8Array',offset:0,length:12,encodedBytes:encoded.length,codec:{mode:'ATTRIBUTES',count:4,stride:4,elementBytes:3}});
  assert.deepEqual(actual,expected);
});

test('actual-scene export has finite geometry and valid shared instances',()=>{
  assert.equal(manifest.version,2);assert.equal(bytes.length,manifest.bytes);assert.equal(compressed.length,manifest.downloadBytes);
  for(const g of manifest.geometries){
    const p=g.attributes.position;assert.equal(p.length%3,0);assert.ok(values(p).every(Number.isFinite));
    if(g.index)assert.ok(values(g.index).every(n=>n<p.length/3));
    assert.ok(g.sphere.every(Number.isFinite));
  }
  for(const m of manifest.meshes){
    assert.ok(manifest.geometries[m.geometry]);assert.ok(m.matrix.every(Number.isFinite));
    for(const id of Array.isArray(m.material)?m.material:[m.material])if(manifest.materials[id].vertexColors)assert.ok(manifest.geometries[m.geometry].attributes.color,'Colored batches must supply vertex colors; instance colors alone must not enable a missing vertex attribute');
    if(m.instances){assert.equal(m.instances.length%16,0);assert.ok(values(m.instances).every(Number.isFinite));if(m.instanceColors)assert.equal(m.instanceColors.length,m.instances.length/16*3);}
  }
});
test('the real Pyra, Ibenwood, Telemonia and upgraded capital builders are represented',()=>{
  for(const name of ['East Ibenwood','North Ibenwood','South Ibenwood','West Ibenwood','Central Ibenwood','East Pyros','West Pyros','Telemonia','Elagos'])assert.ok(manifest.regions.some(r=>r.name===name),name);
  for(const name of ['Ibenwood regional forest','Loading pyra','Loading telemoniaTown','Loading elagos'])assert.ok(manifest.meshes.some(m=>[m.name,...(m.sources??[])].some(s=>s.includes(name))),name);
  assert.ok(!manifest.meshes.some(m=>/woodland masses|distant halls/.test(m.name)),'No invented regional proxy layout');
  assert.ok(manifest.optimization.maxOmittedDiameterPixels<1);
});
test('the public asset restores renderable scenery without gameplay state',()=>{
  const built=assembleLookoutScene(manifest,buffer);let instances=0;
  built.root.traverse(o=>{assert.ok(!o.isSkinnedMesh);if(o.isInstancedMesh)instances+=o.count;});
  assert.ok(instances>1000,'Authored tree distributions survive instancing');
  assert.ok(built.entries.some(e=>e.part.name.endsWith('/ The Stills')),'The complete panorama includes the ocean without a second world');
  assert.ok(!manifest.meshes.some(p=>[p.name,...p.sources??[]].some(n=>n.includes('Minora legacy gate flags'))),'Council flags stay dynamic instead of being baked into city walls');
  built.update(12.5);
  const sea=built.entries.find(e=>e.part.name.endsWith('/ The Stills')).mesh;
  assert.equal(sea.material.uniforms.time.value,12.5,'Water animation continues without terrain or simulation updates');
  assert.ok(!Object.keys(built).includes('colliders'));built.dispose();
});

test('opening and revisiting the lookout does not prepare the walkable world',async t=>{
  const THREE=await sourceModule('../vendor/three.module.js');
  const {createTowerWorld}=await sourceModule('../src/app/exploration/tower-world.js');
  const {LOOKOUT}=await import('../src/app/exploration/tower-state.js');
  const requests=[];
  t.mock.method(globalThis,'fetch',async url=>{
    const pathname=new URL(url).pathname;requests.push(pathname);
    if(pathname.endsWith('/landscape.json'))return new Response(JSON.stringify(manifest));
    if(pathname.endsWith('/landscape.bin.gz'))return new Response(compressed);
    throw Error('Unexpected world resource: '+pathname);
  });
  const scene=new THREE.Scene(),world=await createTowerWorld(scene,()=>{},{inside:true,room:'lookout',enabledRegions:[16,17,25,13,14]});
  try{
    assert.equal(world.state().exteriorLoaded,false);
    assert.equal(world.state().panorama.visible,true);
    assert.equal(scene.getObjectByName('Lizeem exterior').visible,false);
    assert.equal(world.heightAt(LOOKOUT.x,LOOKOUT.z),LOOKOUT.y);
    assert.equal(world.state().councilFlags.leader,'taleth');
    const root=scene.getObjectByName('Guild lookout / prepared surrounding landscape');
    world.update(4,.04,LOOKOUT);
    assert.equal(root.getObjectByName('Drent and the road to the Moros / The Stills').material.uniforms.time.value,4);
    world.show('tower');assert.equal(root.visible,false);
    await world.prepareLookout();world.show('lookout');
    assert.equal(root.visible,true);assert.equal(world.state().exteriorLoaded,false);
    assert.equal(requests.length,2,'Manifest and geometry are fetched only once across visits');
    assert.equal(scene.getObjectByName('Guild lookout / prepared surrounding landscape'),root);
  }finally{world.dispose();}
  assert.equal(scene.children.length,0,'Lookout, banners, actors and rooms are disposed together');
});
