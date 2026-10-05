import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from '../vendor/three.module.js';
import {WORLD_BOUNDS,AVREL_CLEARING,worldToVillage} from '../src/region-world.js';
import {TESSEN_BRIDGE} from '../src/pueth-world.js';
import {villageWeight} from '../src/world-terrain.js';
import {appendWesternTerrainSamples,preservedTerrainTileRanges,extensionTerrainSeed} from '../src/terrain-extension.js';
import {createStreamedTerrain} from '../src/streamed-terrain.js';
import {finishBuild} from '../src/build-steps.js';

const source=readFileSync(new URL('../src/world.js',import.meta.url),'utf8');
const original=JSON.parse(readFileSync(new URL('./fixtures/terrain-before-alezhor.json',import.meta.url)));
const start=source.indexOf('  function axisSamples('),end=source.indexOf('  const columns = terrainXs.length',start);
const {xs,zs,addedColumns}=new Function('WORLD_BOUNDS','AVREL_CLEARING','TESSEN_BRIDGE','appendWesternTerrainSamples',
  source.slice(start,end)+';return {xs:terrainXs,zs:terrainZs,addedColumns};')(WORLD_BOUNDS,AVREL_CLEARING,TESSEN_BRIDGE,appendWesternTerrainSamples);
const sha=values=>createHash('sha256').update(Buffer.from(new Float64Array(values).buffer)).digest('hex');

test('Alezhor appends western columns without moving any established double or Float32 sample',()=>{
  assert.equal(addedColumns,8);assert.equal(xs.length,original.columns+8);assert.equal(zs.length,original.rows);
  assert.equal(sha(xs.slice(addedColumns)),original.xsHash);assert.equal(sha(zs),original.zsHash);
  assert.equal(xs[0],WORLD_BOUNDS.minX-80);assert.equal(xs[8],original.oldWesternMinimum);
  assert.ok(xs.every((x,i)=>!i||(x>xs[i-1]&&x-xs[i-1]<=7.100001)));
  for(const span of [24,87]){
    const rows=preservedTerrainTileRanges(original.columns,addedColumns,span);
    assert.equal(rows[0].first,0);assert.equal(rows.at(-1).last,xs.length-1);
    for(let i=1;i<rows.length;i++)assert.equal(rows[i-1].last,rows[i].first);
    for(const row of rows.filter(r=>!r.extension)){assert.equal(row.first-addedColumns,row.key*span);assert.equal(row.last-addedColumns,Math.min(original.columns-1,(row.key+1)*span));}
  }
});

test('the production Fast seed traversal retains every original terrain color draw',()=>{
  const a=source.indexOf('  if(terrainSeeds){'),b=source.indexOf('  function sampleTerrain',a),seeds=new Uint32Array(xs.length*zs.length);
  const Generator=Object.getPrototypeOf(function*(){}).constructor;
  const steps=new Generator('terrainSeeds','columns','rows','terrainXs','terrainZs','worldToVillage','villageWeight','addedColumns','extensionTerrainSeed',
    'let terrainSeed=0x5a2f11b7;const trandom=()=>{terrainSeed=(Math.imul(terrainSeed,1664525)+1013904223)>>>0;return terrainSeed/4294967296;};'+source.slice(a,b));
  finishBuild(steps(seeds,xs.length,zs.length,xs,zs,worldToVillage,villageWeight,addedColumns,extensionTerrainSeed));
  const hash=createHash('sha256'),word=new Uint32Array(2);let draws=0;
  for(let j=0;j<zs.length;j++)for(let i=0;i<xs.length;i++){
    const seed=seeds[j*xs.length+i];
    if(i<addedColumns){assert.equal(seed,extensionTerrainSeed(xs[i],zs[j]));continue;}
    word[0]=(Math.imul(seed,1664525)+1013904223)>>>0;word[1]=(Math.imul(word[0],1664525)+1013904223)>>>0;
    const p=worldToVillage(xs[i],zs[j]),count=villageWeight(p.x,p.z)>0?2:1;draws+=count;hash.update(Buffer.from(word.buffer,0,count*4));
  }
  assert.equal(draws,original.draws);assert.equal(hash.digest('hex'),original.terrainDrawHash);
});

function streamed(extended){
  const old=Array.from({length:65},(_,i)=>i*7.1),{samples:x,addedColumns:offset}=appendWesternTerrainSamples(old,extended?-50:0);
  const z=Array.from({length:33},(_,i)=>i*7.1),positions=new Float32Array(x.length*z.length*3),colors=new Float32Array(positions.length),sampled=new Uint8Array(x.length*z.length),root=new THREE.Group();
  const sample=(i,j)=>{const k=(j*x.length+i)*3;positions.set([x[i],Math.sin(x[i]*.05)+Math.cos(z[j]*.04),z[j]],k);colors.set([x[i]*.001+.2,z[j]*.001+.3,.1],k);};
  const stream=createStreamedTerrain({THREE,xs:x,zs:z,positions,colors,sampled,sample,root,originColumn:offset,tileSize:8,material:new THREE.MeshBasicMaterial(),cells:{Old:[{x:230,z:100}]},ids:{Old:1}});
  finishBuild(stream.buildRegion(1));if(extended)finishBuild(stream.buildBounds({minX:-50,maxX:30,minZ:0,maxZ:70}));
  return{root,stream};
}
test('Fast tiles preserve their original geometry, names and colors and add a closed western strip',()=>{
  const a=streamed(false),b=streamed(true);
  for(const mesh of a.root.children){const next=b.root.getObjectByName(mesh.name);assert.ok(next,mesh.name);for(const key of ['position','color','normal'])assert.deepEqual(next.geometry.attributes[key].array,mesh.geometry.attributes[key].array);assert.deepEqual(next.geometry.index.array,mesh.geometry.index.array);}
  const strip=b.root.getObjectByName('Terrain -1:0');assert.ok(strip);
  const p=strip.geometry.attributes.position;assert.equal(Math.max(...Array.from({length:p.count},(_,i)=>p.getX(i))),0);
  const count=b.root.children.length;finishBuild(b.stream.buildBounds({minX:-50,maxX:30,minZ:0,maxZ:70}));assert.equal(b.root.children.length,count);
});
