import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';
import * as THREE from '../vendor/three.module.js';
import { scopedWorld } from './scoped-world.js';
import { sourceModule } from './module-loader.js';
import { RAMPS, nearLotharnRouteJoin, lotharnRouteJoinDelta } from '../src/content/regions/east-lotharn/east-lotharn-world.js';
import { centralShoulderRoute, walkingLane } from './lotharn-shoulder-route.js';
import { inspectLotharnShoulderRoute } from './lotharn-shoulder-controller.js';
const { getTreeRegistry } = await sourceModule('../src/world/scenery/tree-registry.js');
const scene = new THREE.Scene(), world = await scopedWorld(scene,[20]);
scene.updateMatrixWorld(true);
const group=scene.getObjectByName('East Lotharn scenery');
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
// Captured through the unchanged composed world with the archived pre-candidate
// land/scenery modules (read-only load hook), not from the candidate itself.
const baseline={treeHash:'f7f11bc8a0dfbef84bad22805da6c7bbb5e2907746a02cc1881a2bd6e50c3706',batchHash:'23d1b2354089feb8d1088771a3c6edf19684a43ccb89b2d40afafce8afa296f6'};
mkdirSync(new URL('./artifacts/', import.meta.url), {recursive:true});

test('the north shoulder keeps every existing East Lotharn tree and instance layout',t=>{
 const facts=getTreeRegistry(world.colliders).trees.filter(t=>t.id.startsWith('lotharn-')).map(t=>({id:t.id,species:t.species,x:t.x,z:t.z,height:t.height}));
 assert.equal(facts.length,5462); assert.equal(hash(facts),baseline.treeHash);
 const batches=[];group.traverse(o=>{if(!o.isInstancedMesh)return;const nonY=Array.from(o.instanceMatrix.array);for(let i=13;i<nonY.length;i+=16)nonY[i]=0;batches.push({name:o.name,count:o.count,hash:createHash('sha256').update(JSON.stringify(nonY)).update(o.instanceColor?Buffer.from(o.instanceColor.array.buffer):'').digest('hex')});});
 assert.equal(hash(batches),baseline.batchHash);
 t.diagnostic(JSON.stringify({trees:facts.length,canopy:facts.filter(t=>t.id.startsWith('lotharn-shelter-canopy-')).length,treeHash:hash(facts),instanceBatches:batches.length,batchHash:hash(batches)}));
});
test('retained tree roots across the candidate touch the actual revised triangles',t=>{
 const surfaces=[],trunks=[];scene.getObjectByName('The ground of Azhora')?.traverse(o=>{if(o.isMesh)surfaces.push(o);});group.traverse(o=>{if(o.isMesh&&(/ground/i.test(o.name)||o.name==='East Lotharn cave approach crest'))surfaces.push(o);if(o.isInstancedMesh&&o.geometry.parameters?.radiusTop===.2&&o.geometry.parameters?.radiusBottom===.36)trunks.push(o);});
 const matrix=new THREE.Matrix4(),v=new THREE.Vector3(),ray=new THREE.Raycaster(new THREE.Vector3(),new THREE.Vector3(0,-1,0));
 let count=0,vertices=0,highest=-Infinity;const problems=[];
 for(const mesh of trunks){const p=mesh.geometry.attributes.position,bottom=[];for(let i=0;i<p.count;i++)if(Math.abs(p.getY(i)+.5)<1e-6)bottom.push(i);
 for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);matrix.premultiply(mesh.matrixWorld);const x=matrix.elements[12],z=matrix.elements[14];
 const inShoulder=x>=-1283&&x<=-1172&&z>=-1048&&z<=-974;
 let changedJoin=false;if(nearLotharnRouteJoin(x,z,4))for(let a=-4;a<=4;a++)for(let b=-4;b<=4;b++)if(Math.abs(lotharnRouteJoinDelta(x+a,z+b))>1e-6)changedJoin=true;
 if(!inShoulder&&!changedJoin)continue;
 let contact=-Infinity;for(const at of bottom){v.fromBufferAttribute(p,at).applyMatrix4(matrix);ray.ray.origin.set(v.x,1000,v.z);const hit=ray.intersectObjects(surfaces,false)[0];if(!hit){problems.push({x,z,vertex:{x:v.x,z:v.z},reason:"missing actual ground"});continue;}contact=Math.max(contact,v.y-hit.point.y);vertices++;}
 if(!(contact<-.02&&contact>-.04))problems.push({x,z,contact});highest=Math.max(highest,contact);count++;
 }}
 writeFileSync(new URL("./artifacts/r1-central-north-roots.json",import.meta.url),JSON.stringify({affectedTrees:count,rootVertices:vertices,highest,problems},null,2));
 t.diagnostic(JSON.stringify({affectedTrees:count,rootVertices:vertices,highest,problemCount:problems.length,firstProblems:problems.slice(0,8)}));assert.ok(count>0);assert.equal(problems.length,0);
});

// Keep the affected upper ramp's stronger ordinary, zero-fall contract separate
// from the full novice ascent's normal climb-and-rest transitions.
const way=RAMPS.find(w=>w.id==='central-peak-ramp-6');
const ascent=walkingLane(world,way),roundTrip=[...ascent,...ascent.slice(0,-1).reverse()];
test('a novice walks the complete affected upper ramp and returns on continuous supported ground',t=>{
 const result=inspectLotharnShoulderRoute(world,{name:'central upper ramp out and back',points:roundTrip},{continueDiagnostics:false});
 writeFileSync(new URL('./artifacts/r1-central-north-upper-return.json',import.meta.url),JSON.stringify(result,null,2));
 const summary={complete:result.complete,legs:result.legs.length,totalLegs:result.points.length-1,final:result.final,stop:result.complete?null:result.legs.at(-1)};
 delete summary.final.events;t.diagnostic(JSON.stringify(summary));
 assert.ok(result.complete,'the complete upper ramp must support the continuous return');
 assert.equal(result.final.damage,0);assert.equal(result.final.falls.length,0);assert.equal(result.final.swum,0);assert.ok(result.final.dryFinish);
 assert.ok(Math.hypot(result.final.at.x-ascent[0].x,result.final.at.z-ascent[0].z)<.35);
 assert.ok(result.final.walked>110);assert.ok(result.final.biggestGroundedRise<.35);
});


test('a novice completes the central ascent and return with ordinary climb input and real ledge rests',t=>{
 const route=centralShoulderRoute(world),result=inspectLotharnShoulderRoute(world,route,{continueDiagnostics:false});
 writeFileSync(new URL('./artifacts/r1-central-north-complete-return.json',import.meta.url),JSON.stringify(result,null,2));
 const f=result.final;t.diagnostic(JSON.stringify({complete:result.complete,legs:result.legs.length,totalLegs:route.points.length-1,final:f,stop:result.complete?null:result.legs.at(-1)}));
 assert.ok(result.complete,'all authored ramp and ledge approaches must complete with one controller');
 assert.equal(result.independentStarts,0);assert.equal(f.damage,0);assert.equal(f.swum,0);assert.ok(f.dryFinish);
 assert.ok(!f.events.some(e=>e.type==='exhausted'),'resting must prevent climb exhaustion');
 assert.ok(Math.hypot(f.at.x-route.points[0].x,f.at.z-route.points[0].z)<.35);
 assert.ok(f.walked>800);assert.ok(f.climbed>50);assert.ok(f.climbWind>200);assert.ok(f.windRecovered>200);
 assert.ok(f.leastWind>3);assert.ok(f.biggestGroundedRise<.35);
 // A held climb can catch a short gravity transition at a cliff lip. Keep its
 // actual duration/drop bounded; these are not reported as zero-fall walking.
 assert.ok(f.maxGravityDrop<=.35,`gravity drop ${f.maxGravityDrop}`);
 assert.ok(f.maxGravitySeconds<=.25,`gravity duration ${f.maxGravitySeconds}`);
 assert.ok(f.landings.every(l=>l.damage===0&&!l.water));
});
