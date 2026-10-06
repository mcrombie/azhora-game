import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from '../vendor/three.module.js';
import {scopedWorld} from './scoped-world.js';
import {sourceModule} from './module-loader.js';
import {westStream} from '../src/content/regions/alezhor/alezhor-world.js';
import {ALEZHOR_WILDLIFE_ZONES} from '../src/content/regions/alezhor/alezhor-wildlife.js';
import {canStand,canSwim} from '../src/gameplay/movement/game-state.js';
import {createCelderRouteController} from './celder-route-controller.js';

// Alezhor was not shipped before composition. Approved neighbor repairs change
// its placement survey: retain the first corrected layout, and keep the frozen
// delivered layout separately so that explicit four-removed/two-added delta is
// visible instead of silently replacing an existing-region identity baseline.
const baseline=JSON.parse(readFileSync(new URL('./fixtures/alezhor-corrected-layout.json',import.meta.url)));
const scene=new THREE.Scene(),world=await scopedWorld(scene,[64]);
const firstJobs=world.loading.state().jobs,root=world.alezhor.root;
const hash=()=>{const h=createHash('sha256');let batches=0,instances=0;root.traverse(m=>{if(!m.isInstancedMesh)return;batches++;instances+=m.count;h.update(m.name);const v=m.instanceMatrix.array.slice();for(let i=13;i<v.length;i+=16)v[i]=0;h.update(Buffer.from(v.buffer));if(m.instanceColor)h.update(Buffer.from(m.instanceColor.array.buffer));});return{batches,instances,hash:h.digest('hex')};};
const identity=world.treeRegistry.trees.filter(t=>t.id.startsWith('alezhor-')).map(t=>[t.id,t.species,t.x,t.z]);
const initialLayout=hash(),initialTrees=world.treeRegistry.trees.filter(t=>t.id.startsWith('alezhor-')).map(t=>[t.id,t.y]);
const retained=world.ibenwoodAlezhorGround.patches.slice();
const meshHash=meshes=>{const h=createHash('sha256');for(const mesh of [...meshes].sort((a,b)=>a.name.localeCompare(b.name))){h.update(mesh.name);for(const a of [mesh.geometry.attributes.position.array,mesh.geometry.attributes.color.array,mesh.geometry.index.array])h.update(Buffer.from(a.buffer,a.byteOffset,a.byteLength));}return h.digest('hex');};
const firstGroundHash=meshHash(retained);
scene.updateMatrixWorld(true);
const coarse=scene.getObjectByName('The ground of Azhora').children.filter(m=>m.isMesh);
for(const mesh of coarse)mesh.geometry.computeBoundingBox();
const ray=new THREE.Raycaster(new THREE.Vector3(),new THREE.Vector3(0,-1,0));
function drawn(x,z){ray.ray.origin.set(x,2000,z);return ray.intersectObjects(coarse.filter(m=>{const b=m.geometry.boundingBox;return x>=b.min.x&&x<=b.max.x&&z>=b.min.z&&z<=b.max.z;}),false)[0]?.point.y??-Infinity;}
const report={firstJobs:firstJobs.filter(j=>['ibenwoodAlezhorGround','ibenwood','ibenwoodWater','ibenwoodForest'].includes(j.id)),layout:initialLayout,trees:identity.length,deliveredDelta:{removed:baseline.removed,added:baseline.added},river:{patches:retained.length,triangles:world.ibenwoodAlezhorGround.triangles,hash:firstGroundHash},contact:[],wildlife:[],problems:[]};
const probes=[[-3949.229411,937.624166],[-4588.929036,956.557475],[-3600,86]];
report.river.sites=probes.map(([x,z])=>({x,z,actual:drawn(x,z),sample:world.renderedGroundHeight(x,z),fine:world.ibenwoodAlezhorGround.fineGroundHeight(x,z)}));
const matrix=new THREE.Matrix4(),p=new THREE.Vector3();
root.traverse(mesh=>{
  if(!mesh.isInstancedMesh||!/typed living trunks| stone$|river gravel$|gorse|broom|heather/.test(mesh.name))return;
  const vertices=mesh.geometry.attributes.position;let min=Infinity;
  for(let i=0;i<vertices.count;i++)min=Math.min(min,vertices.getY(i));
  const feet=[];for(let i=0;i<vertices.count;i++)if(vertices.getY(i)<=min+1e-5)feet.push(i);
  let worst=-Infinity,missing=0,wrong=0,hidden=0;const problems=[];
  for(let i=0;i<mesh.count;i++){
    mesh.getMatrixAt(i,matrix);matrix.premultiply(mesh.matrixWorld);let high=-Infinity,low=Infinity;
    for(const v of feet){p.fromBufferAttribute(vertices,v).applyMatrix4(matrix);const actual=drawn(p.x,p.z),gap=p.y-actual;if(!Number.isFinite(actual))missing++;high=Math.max(high,gap);low=Math.min(low,gap);}
    // A leaning trunk's whole base stays below ground. A stone or individual
    // shrub lobe needs one basal contact and some visible upper geometry.
    const contact=/typed living trunks/.test(mesh.name)?high:low;
    worst=Math.max(worst,contact);if(contact>.03){wrong++;problems.push({index:i,x:matrix.elements[12],z:matrix.elements[14],high,low});}
    if(!/typed living trunks/.test(mesh.name)){let upper=-Infinity;for(let v=0;v<vertices.count;v++)if(vertices.getY(v)>0){p.fromBufferAttribute(vertices,v).applyMatrix4(matrix);upper=Math.max(upper,p.y-drawn(p.x,p.z));}if(upper<.005){hidden++;problems.push({index:i,x:matrix.elements[12],z:matrix.elements[14],upper});}}
  }
  report.contact.push({name:mesh.name,instances:mesh.count,vertices:feet.length,worst,missing,wrong,hidden,problems});
});
const {createWestLife}=await sourceModule('../src/content/regions/western-regions/west-regions-life.js');
const animalScene=new THREE.Scene(),life=createWestLife(animalScene,world,{zones:ALEZHOR_WILDLIFE_ZONES});
try{
 for(const zone of ALEZHOR_WILDLIFE_ZONES){life.setObserver({x:(zone.minX+zone.maxX)/2,z:(zone.minZ+zone.maxZ)/2});animalScene.updateMatrixWorld(true);const animals=life.state().creatures.filter(a=>a.id.startsWith(zone.id+'-')),body=animalScene.getObjectByName(zone.id)?.getObjectByName(zone.species+' bodies');
  for(const[i,a]of animals.entries()){body.getMatrixAt(i,matrix);matrix.premultiply(body.matrixWorld);const expected=zone.air||zone.float||zone.sea?a.y:drawn(a.x,a.z)+a.lift;report.wildlife.push({id:a.id,gap:matrix.elements[13]-expected});}
 }
}finally{life.dispose();}
mkdirSync(new URL('./artifacts/', import.meta.url), {recursive:true});
const saveReport=()=>writeFileSync(new URL('./artifacts/alezhor-integration-review.json',import.meta.url),JSON.stringify(report,null,2));saveReport();

test('Alezhor first arrival prepares both river reaches and collar ground before any forest scenery',()=>{
  assert.equal(firstJobs.find(j=>j.id==='ibenwoodAlezhorGround').status,'ready');
  for(const id of ['ibenwood','ibenwoodWater','ibenwoodForest'])assert.equal(firstJobs.find(j=>j.id===id).status,'pending');
  assert.ok(retained.length>3);for(const row of report.river.sites){assert.ok(Number.isFinite(row.fine),JSON.stringify(row));assert.ok(Math.abs(row.sample-row.actual)<.002,JSON.stringify(row));}
});
test('contact fixes retain the approved initial composition tree identities and every non-Y instance transform and color',()=>{
  assert.deepEqual(initialLayout,{batches:baseline.batches,instances:baseline.instances,hash:baseline.hash});
  assert.deepEqual(identity,baseline.trees);
});
test('actual retained terrain supports all tested tree, stone and scrub footprints and all posed wildlife',()=>{
  const wrong=report.contact.filter(row=>row.wrong||row.missing||row.hidden);assert.deepEqual(wrong.map(({name,wrong,missing,hidden,worst})=>({name,wrong,missing,hidden,worst})),[]);
  assert.equal(report.wildlife.length,37);assert.deepEqual(report.wildlife.filter(row=>!Number.isFinite(row.gap)||Math.abs(row.gap)>.002),[]);
});
test('the real movement, support, swimming and stamina controller enters and leaves two shallow stream banks',()=>{
  const stream=westStream();report.banks=[];
  for(const along of [20,70]){
    const p=stream.samples.reduce((best,p)=>Math.abs(p.along-along)<Math.abs(best.along-along)?p:best,stream.samples[0]);
    const options=[1,-1].map(side=>({side,start:{x:p.x+p.nx*(p.half+3)*side,z:p.z+p.nz*(p.half+3)*side},wet:{x:p.x+p.nx*p.half*.75*side,z:p.z+p.nz*p.half*.75*side}}));
    const route=options.find(({start,wet})=>world.regionAt(start.x,start.z)?.id===64&&world.regionAt(wet.x,wet.z)?.id===64&&canStand(start.x,start.z,world,.34)&&canSwim(wet.x,wet.z,world,.34));
    assert.ok(route,JSON.stringify({along,options}));
    const controller=createCelderRouteController(world,route.start),enter=controller.leg(route.wet),leave=controller.leg(route.start),final=controller.snapshot();
    report.banks.push({along,...route,enter,leave,final});saveReport();
  }
  for(const {enter,leave,final} of report.banks){
    assert.ok(enter.complete&&leave.complete,JSON.stringify({enter,leave}));assert.equal(final.damage,0);
    // The authored bank can exceed the ordinary descending slope. Preserve the
    // real short drop and its normal water landing; never cancel the fall or
    // claim an uninterrupted walking descent where the controller went airborne.
    assert.equal(final.landings.length,final.falls.length);
    assert.ok(final.landings.every(landing=>landing.water&&landing.damage===0));
    assert.ok(final.swum>0&&final.windSpent>0&&final.leastWind>0);assert.ok(final.dryFinish);
    assert.ok(final.waterTransitions.some(t=>t.entered)&&final.waterTransitions.some(t=>!t.entered));
  }
});
test('later forest arrival reuses shared retained triangles without changing already planted Alezhor',async()=>{
  const raf=globalThis.requestAnimationFrame,caf=globalThis.cancelAnimationFrame;
  globalThis.requestAnimationFrame=fn=>setTimeout(()=>fn(performance.now()),0);globalThis.cancelAnimationFrame=clearTimeout;
  try{await world.loading.ensureRegion(34);await world.loading.ensureRegion(35);}finally{world.loading.stop();if(raf===undefined)delete globalThis.requestAnimationFrame;else globalThis.requestAnimationFrame=raf;if(caf===undefined)delete globalThis.cancelAnimationFrame;else globalThis.cancelAnimationFrame=caf;}
  report.river.afterHash=meshHash(world.ibenwoodAlezhorGround.patches);report.afterLayout=hash();saveReport();
  assert.equal(report.river.afterHash,firstGroundHash);assert.equal(world.ibenwoodWater.terrain.fineGroundHeight,world.ibenwoodAlezhorGround.fineGroundHeight);
  assert.deepEqual(hash(),initialLayout);assert.deepEqual(world.treeRegistry.trees.filter(t=>t.id.startsWith('alezhor-')).map(t=>[t.id,t.y]),initialTrees);
});
