import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import * as THREE from '../vendor/three.module.js';
import {sourceModule} from './module-loader.js';
import {groundBeforeSelamus} from '../src/world-terrain.js';
import {landDistance} from '../src/region-world.js';
import {strandWeight} from '../src/selemis-world.js';
import {telemoniaGeometryHash} from './telemonia-geometry-hash.js';

// This captured material/scatter baseline predates Selemis. City clearing and
// final waterfront support are checked by the composed city suite.
const naturalGround=groundBeforeSelamus;
const before=JSON.parse(readFileSync(new URL('./fixtures/selemis-wrack-before.json',import.meta.url)));
const {createSelemisScenery}=await sourceModule('../src/selemis-scenery.js');
const {getTreeRegistry}=await sourceModule('../src/tree-registry.js');
const root=new THREE.Group(),colliders=[],round=new THREE.IcosahedronGeometry(1,0);
const result=createSelemisScenery({root,colliders,round,groundHeight:naturalGround,renderedGroundHeight:naturalGround,
  material:(color,extra={})=>new THREE.MeshStandardMaterial({color,...extra}),dummy:new THREE.Object3D(),color:new THREE.Color()});
const wrack=result.group.getObjectByName('Strand wrack'),hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

test('only the explicitly reviewed wrack batch changes, retaining the original full geometry hash',()=>{
  assert.equal(result.group.children.length,before.summary.children);
  assert.equal(telemoniaGeometryHash(root,mesh=>mesh!==wrack),before.summary.exceptWrack);
  assert.equal(hash(colliders),before.summary.collidersHash);
  const facts=getTreeRegistry(colliders).trees.map(({id,x,y,z,height,species,log})=>({id,x,y,z,height,species,log}));
  assert.equal(hash(facts),before.summary.treeHash);
  const {wrack:changed,...metrics}=result.metrics,{wrack:original,...oldMetrics}=before.summary.metrics;
  assert.deepEqual(metrics,oldMetrics);
  assert.notEqual(changed,original);
  // Keep the captured full hash, replacing only the one authorized batch with
  // its pre-change record. Every other mesh byte still contributes unchanged.
  const prior=new THREE.InstancedMesh(round,wrack.material,before.wrack.count);prior.name=before.wrack.name;
  prior.instanceMatrix.array.set(before.wrack.matrices);
  prior.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(before.wrack.colors),3);
  const at=result.group.children.indexOf(wrack);result.group.children[at]=prior;prior.parent=result.group;
  try{assert.equal(telemoniaGeometryHash(root),before.summary.full);}
  finally{result.group.children[at]=wrack;prior.parent=null;}
});

test('strand weed forms separated low ribbon patches with varied density and cross-shore width',t=>{
  const geometry=wrack.geometry,p=geometry.attributes.position,matrix=new THREE.Matrix4(),point=new THREE.Vector3(),centres=[];
  assert.notEqual(geometry.type,'IcosahedronGeometry');assert.ok(geometry.index.count>0);
  let maxLocalHeight=0,maxAbove=0,minAbove=Infinity,minD=Infinity,maxD=-Infinity;
  for(let v=0;v<p.count;v++)maxLocalHeight=Math.max(maxLocalHeight,p.getY(v));
  assert.ok(maxLocalHeight<.025,'weed ribbons remain centimetres thick, not low boulders');
  for(let i=0;i<wrack.count;i++){
    wrack.getMatrixAt(i,matrix);const x=matrix.elements[12],z=matrix.elements[14],d=landDistance(x,z);
    centres.push({x,z});minD=Math.min(minD,d);maxD=Math.max(maxD,d);
    assert.ok(d>.69&&d<6.01&&strandWeight(x,z)>.64,'wrack stays on the sheltered strand');
    for(let v=0;v<p.count;v++){
      point.fromBufferAttribute(p,v).applyMatrix4(matrix);
      const gap=point.y-naturalGround(point.x,point.z);maxAbove=Math.max(maxAbove,gap);minAbove=Math.min(minAbove,gap);
    }
  }
  // Physical components describe the visible spacing, independently of the
  // placement loop's internal patch selection or random state.
  const remaining=new Set(centres.map((_,i)=>i)),components=[];
  while(remaining.size){const first=remaining.values().next().value,queue=[first],component=[];remaining.delete(first);
    while(queue.length){const at=queue.pop();component.push(at);for(const next of [...remaining])
      if(Math.hypot(centres[at].x-centres[next].x,centres[at].z-centres[next].z)<4){remaining.delete(next);queue.push(next);}}
    components.push(component);
  }
  const sizes=components.map(c=>c.length).sort((a,b)=>a-b);
  t.diagnostic(JSON.stringify({fragments:wrack.count,components:sizes.length,sizes,minD,maxD,minAbove,maxAbove}));
  assert.ok(wrack.count>=60&&wrack.count<400);
  assert.ok(components.length>=6,'bare sand separates several weed patches');
  assert.ok(sizes.at(-1)>=sizes[0]*2,'patch density varies');
  assert.ok(maxD-minD>2.3,'wrack does not follow one narrow necklace contour');
  assert.ok(maxAbove<.12&&minAbove>-.12,'weed lies against the local strand instead of floating');
  if(process.env.AZHORA_WRACK_CAPTURE)writeFileSync(process.env.AZHORA_WRACK_CAPTURE,JSON.stringify({before:before.wrack,
    after:{count:wrack.count,matrices:[...wrack.instanceMatrix.array],colors:[...wrack.instanceColor.array],
      positions:[...p.array],indices:[...geometry.index.array]}}));
});
