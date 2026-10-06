import test from 'node:test';
import assert from 'node:assert/strict';
import {createStartup,terrainCacheMatches} from '../src/app/startup/startup.js';
test('startup records ordered work stages and total time without touching game state',()=>{
  let time=5;const labels=[],startup=createStartup({now:()=>time,onProgress:name=>labels.push(name)});
  time=12;startup.stage('Terrain');time=30;startup.stage('Characters');time=40;startup.ready();
  assert.deepEqual(labels,['Terrain','Characters']);assert.equal(startup.record.totalMs,35);
  assert.deepEqual(startup.record.stages.map(s=>s.previousMs),[7,18]);
});
test('cached terrain must match exact sample phase and every buffer shape',()=>{
  const xs=[0,2],zs=[1,3],entry={xs,zs,positions:new Float32Array(12),colors:new Float32Array(12),normals:new Float32Array(12)};
  assert.ok(terrainCacheMatches(entry,xs,zs));
  assert.equal(terrainCacheMatches(entry,[0,2.00001],zs),false);
  assert.equal(terrainCacheMatches({...entry,normals:new Float32Array(3)},xs,zs),false);
  assert.equal(terrainCacheMatches(null,xs,zs),false);
});
