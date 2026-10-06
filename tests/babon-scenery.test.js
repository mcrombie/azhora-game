import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './module-loader.js';
import * as B from '../src/content/regions/babon/babon-world.js';
import { BABON_WILDLIFE_ZONES, babonWildlifeClear } from '../src/content/regions/babon/babon-wildlife.js';
import { groundWithRiver } from '../src/world/terrain/world-terrain.js';
import { timberForSpecies } from '../src/gameplay/skills/woodcutting/wood-species.js';

const THREE=await sourceModule('../vendor/three.module.js');
const {createBabonScenerySteps}=await sourceModule('../src/content/regions/babon/babon-scenery.js');
const {getTreeRegistry}=await sourceModule('../src/world/scenery/tree-registry.js');
const colliders=[],parent=new THREE.Group();
// A different rendered surface catches props rooted to the logical field.
const rendered=(x,z)=>groundWithRiver(x,z)+.12;
const generator=createBabonScenerySteps({parent,heightAt:groundWithRiver,renderedGroundHeight:rendered,colliders});
let step,yields=0;do{step=generator.next();yields++;}while(!step.done);
const scene=step.value,registry=getTreeRegistry(colliders),matrix=new THREE.Matrix4(),vertex=new THREE.Vector3();

test('Babon has a dense old forest with species-specific timber and a layered tropical understory',()=>{
  assert.equal(B.BABON_CELLS.length,50);
  assert.ok(scene.metrics.trees>2000&&scene.metrics.trees<3500);
  assert.equal(scene.metrics.trees,registry.trees.length);
  assert.equal(new Set(scene.trees.map(t=>t.id)).size,scene.trees.length);
  const species=new Set(scene.trees.map(t=>t.species));
  assert.deepEqual(species,new Set(['kapok','mahogany','strangler-fig','coconut-palm']));
  for(const tree of scene.trees){
    const timber=timberForSpecies(tree.species);
    assert.ok(timber?.log);assert.equal(tree.log,timber.log);assert.equal(tree.harvestable,true);
    assert.ok(B.babonOwns(tree.x,tree.z));assert.ok(rendered(tree.x,tree.z)>.85);
    assert.equal(B.babonWaterAt(tree.x,tree.z),null,'No tree may grow in the flowing channel.');
  }
  assert.ok(scene.metrics.emergents>150);assert.ok(scene.metrics.canopy>1200);
  assert.ok(scene.metrics.buttresses>2000&&scene.metrics.lianas>250&&scene.metrics.epiphytes>300);
  assert.ok(scene.metrics.ferns>1500&&scene.metrics.broadLeaves>600&&scene.metrics.youngPalms>200);
  assert.ok(scene.trees.filter(t=>t.species==='kapok').every(t=>t.height>=35&&t.height<=47));
  const mature=scene.trees.filter(t=>t.height>9);
  const inner=mature.filter(t=>B.babonHabitat(t.x,t.z).canopy>.8).length;
  const coast=mature.filter(t=>B.babonHabitat(t.x,t.z).canopy<.2).length;
  assert.ok(inner>coast*5,'The old interior must visibly thicken beyond the open anchorage.');
});

test('Every Babon trunk and its circular blocker share the rendered ground and the actual visible tree',()=>{
  assert.equal(colliders.length,scene.trees.length);
  const byId=new Map(colliders.map(c=>[c.id,c]));
  for(let i=0;i<scene.trees.length;i++){
    const tree=scene.trees[i],visual=scene.treeVisuals[i],c=byId.get(tree.id);
    assert.equal(c.kind,'babon-tree');assert.equal(c.x,tree.x);assert.equal(c.z,tree.z);
    assert.equal(c.minY,tree.y);assert.ok(c.maxY>c.minY+2);assert.ok(c.r<=tree.radius);
    visual.trunk.mesh.getMatrixAt(visual.trunk.index,matrix);
    const positions=visual.trunk.mesh.geometry.attributes.position;let baseVertices=0,highestBaseGap=-Infinity;
    for(let j=0;j<positions.count;j++){
      if(positions.getY(j)>-.499)continue;
      vertex.fromBufferAttribute(positions,j).applyMatrix4(matrix);baseVertices++;
      const gap=vertex.y-rendered(vertex.x,vertex.z);highestBaseGap=Math.max(highestBaseGap,gap);
      assert.ok(gap<-.05,`${tree.id}: floating root ${gap}`);
    }
    assert.ok(baseVertices>=7);assert.ok(highestBaseGap>-.062,`${tree.id}: trunk unnecessarily sunk`);
    vertex.set(0,-.5,0).applyMatrix4(matrix);
    assert.ok(Math.hypot(vertex.x-tree.x,vertex.z-tree.z)<.001,'Blocker must meet the visible trunk base.');
  }
  for(const p of scene.placements){
    assert.ok(B.babonOwns(p.x,p.z));
    if(p.kind==='fern')assert.ok(Math.abs(p.y-rendered(p.x,p.z)+.025)<1e-8);
    if(p.kind==='broad-leaf')assert.ok(Math.abs(p.y-rendered(p.x,p.z)-.035)<1e-8);
    if(p.kind==='rock'||p.kind==='litter')assert.ok(p.y<rendered(p.x,p.z));
  }
});

test('The natural walks, landmark openings and large reptile territories stay clear of trunks',()=>{
  for(const tree of scene.trees){
    assert.equal(B.babonClear(tree.x,tree.z,tree.radius),false,`${tree.id}: obstructed walk`);
    assert.equal(babonWildlifeClear(tree.x,tree.z,tree.radius),false,`${tree.id}: obstructed animal home`);
  }
  for(const trail of B.BABON_TRAILS)for(let i=1;i<trail.points.length;i++){
    const a=trail.points[i-1],b=trail.points[i],length=Math.hypot(b.x-a.x,b.z-a.z);
    for(let d=0;d<=length;d+=2){
      const x=a.x+(b.x-a.x)*d/length,z=a.z+(b.z-a.z)*d/length;
      for(const c of colliders)assert.ok(Math.hypot(x-c.x,z-c.z)>c.r+.65,`${trail.id}: hidden blocker`);
    }
  }
  assert.ok(BABON_WILDLIFE_ZONES.filter(z=>z.territorial).length>=4);
  for(const p of scene.placements)if(p.kind==='fern'||p.kind==='broad-leaf'){
    assert.equal(babonWildlifeClear(p.x,p.z,.3),false,'Ground foliage hides the giant animals.');
  }
});

test('Harvesting a buttressed strangler fig removes the full tree, hanging roots and its blocker together',()=>{
  const tree=scene.trees.find(t=>t.species==='strangler-fig'),visual=scene.treeVisuals.find(v=>v.id===tree.id);
  assert.ok(visual.pieces.length>12);
  const count=colliders.length;assert.equal(registry.set(tree.id,false),true);
  assert.equal(colliders.length,count-1);assert.equal(registry.standing(tree.id),false);
  for(const handle of visual.pieces){handle.mesh.getMatrixAt(handle.index,matrix);assert.equal(matrix.determinant(),0);}
  assert.equal(registry.regrow(tree.id),true);assert.equal(colliders.length,count);
  for(const handle of visual.pieces){handle.mesh.getMatrixAt(handle.index,matrix);assert.ok(matrix.determinant()>0);}
});

test('Babon keeps its dense forest in bounded instanced chunks with cooperative loading',()=>{
  assert.ok(yields>1000);assert.ok(scene.metrics.batches<260);
  assert.ok(scene.metrics.instances<46000);assert.ok(scene.metrics.triangles<1300000);
  const materials=new Set(),geometries=new Set();
  for(const mesh of scene.root.children){
    if(!mesh.isInstancedMesh)continue;
    materials.add(mesh.material);geometries.add(mesh.geometry);
    assert.ok(mesh.count>0);assert.ok(mesh.boundingSphere.radius<175,'Batches must be local enough to cull.');
  }
  assert.equal(materials.size,1);assert.ok(geometries.size<=8);
});

test('Babon atlas rivers have upward-facing water ribbons, with dry gravel only at deliberate trail crossings',()=>{
  assert.ok(B.BABON_RIVERS.length>0);assert.equal(scene.waterMeshes.length,B.BABON_RIVERS.length);
  for(const river of B.BABON_RIVERS){
    const mesh=scene.waterMeshes.find(m=>m.userData.riverId===river.id);
    assert.ok(mesh);assert.equal(mesh.geometry.attributes.position.count,river.samples.length*2);
    const positions=mesh.geometry.attributes.position,normals=mesh.geometry.attributes.normal;
    for(let i=0;i<river.samples.length;i++){
      const p=river.samples[i];
      assert.ok(Math.abs((positions.getX(i*2)+positions.getX(i*2+1))/2-p.x)<.001);
      assert.ok(Math.abs((positions.getZ(i*2)+positions.getZ(i*2+1))/2-p.z)<.001);
      assert.ok(Math.abs(positions.getY(i*2)-p.y-.012)<.001);
      assert.ok(normals.getY(i*2)>.01,'Water ribbon is facing underground.');
      if(p.halfWidth<.01)continue; // The zero-width spring has no wet footprint.
      const ground=groundWithRiver(p.x,p.z);
      if(ground>=p.y){
        assert.ok(B.babonTrailDistance(p.x,p.z)<4.5,`${river.id}: buried water away from a crossing`);
        assert.ok(ground<=p.y+.046,'A crossing should be a low gravel bar, not a dam.');
      }else assert.ok(ground<p.y,`${river.id}: invisible buried water`);
    }
  }
  for(const p of scene.placements)assert.equal(B.babonWaterAt(p.x,p.z),null,'Vegetation or litter blocks the stream.');
});
