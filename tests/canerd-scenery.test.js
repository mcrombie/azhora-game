import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './module-loader.js';
import { CANERD } from '../src/canerd-world.js';
import { groundWithRiver } from '../src/world-terrain.js';
import { canStand } from '../src/game-state.js';
import { createWalkSurfaces } from '../src/walk-surfaces.js';

const THREE=await sourceModule('../vendor/three.module.js');
const {createCanerdScenerySteps}=await sourceModule('../src/canerd-scenery.js');
const parent=new THREE.Group(),colliders=[];
// A distinct rendered height catches accidental roots on the logical field.
const rendered=(x,z)=>groundWithRiver(x,z)+.12;
const build=createCanerdScenerySteps({parent,heightAt:groundWithRiver,renderedGroundHeight:rendered,colliders});
let step,yields=0;do{step=build.next();yields++;}while(!step.done);
const scene=step.value,summit=rendered(CANERD.x,CANERD.z);
const world={heightAt:rendered,colliders,bounds:{minX:CANERD.x-300,maxX:CANERD.x+300,minZ:CANERD.z-300,maxZ:CANERD.z+300}};
const p=(x,z)=>({x:CANERD.x+x,z:CANERD.z+z});

test('Canerd has layered curtain walls, a dominant highest tower, a court hall, stables and an empty horse fair',()=>{
  assert.equal(parent.children[0],scene.root);
  assert.equal(scene.root.name,'Canerd - castle on the plain');
  assert.equal(scene.metrics.towers,4);
  assert.equal(scene.metrics.gates,1);
  assert.ok(scene.metrics.wallSegments>=8);
  assert.ok(scene.metrics.stoneCourses>100);
  assert.ok(scene.metrics.windows>50);
  assert.ok(scene.metrics.stalls>=6);
  assert.equal(scene.metrics.paddocks,1);
  for(const id of ['canerd-highest-tower','canerd-chief-lord-hall','canerd-summit-stables','canerd-horse-fair','canerd-fair-paddock','canerd-battlement-lookout']) {
    assert.ok(scene.mapFeatures.some(f=>f.id===id),id);
  }
  const bounds=new THREE.Box3().setFromObject(scene.root);
  assert.ok(Math.abs(bounds.max.y-(summit+84))<.1,'The rebuilt highest tower must rise eighty-four metres above the summit.');
  const highest=colliders.find(c=>c.kind==='canerd-highest-tower');
  assert.equal(highest.minY,summit-.4,'Stone foundations use the rendered ground.');
  assert.ok(colliders.every(c=>c.kind.startsWith('canerd-')));
});

test('The vaulted gate, hall doorway and open stable permit entry while their actual stone walls remain solid',()=>{
  for(let z=44;z>=14;z-=.25)for(const x of [-2.5,0,2.5]) {
    const q=p(x,z);assert.ok(canStand(q.x,q.z,world,.65),`Gate passage blocked at ${x},${z}`);
  }
  for(let z=13;z>=-18;z-=.25) {
    const q=p(-5,z);assert.ok(canStand(q.x,q.z,world,.34),`Hall approach or room blocked at ${z}`);
  }
  for(let z=9;z>=-12;z-=.25) {
    const q=p(19,z);assert.ok(canStand(q.x,q.z,world,.34),`Stable entrance blocked at ${z}`);
  }
  for(const [x,z] of [[-17.4,-9],[7.4,-9],[-5,-23.4],[28.6,-7],[7.05,34]]) {
    const q=p(x,z);assert.equal(canStand(q.x,q.z,world,.34),false,`Solid masonry has no blocker at ${x},${z}`);
  }
  const gateRoof=colliders.find(c=>c.kind==='canerd-gate-vault');
  assert.ok(gateRoof.minY>summit+6);
  assert.ok(gateRoof.maxY<summit+10);
});

test('The southern lookout has continuous support from the court and height-bounded collision above the gate',()=>{
  const surfaces=createWalkSurfaces(scene.walkSurfaces,rendered);
  assert.equal(scene.walkSurfaces.length,4);
  const route=scene.walkRoutes[0].points;
  let previous=route[0].y;
  for(let i=1;i<route.length;i++) {
    const a=route[i-1],b=route[i],distance=Math.hypot(b.x-a.x,b.z-a.z),count=Math.ceil(distance/.12);
    for(let j=0;j<=count;j++) {
      const t=j/count,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;
      const support=surfaces.supportAt(x,z,{maxY:previous,stepUp:.35});
      const wanted=a.y+(b.y-a.y)*t;
      assert.ok(Math.abs(support.height-wanted)<.02,`Missing stair support at ${x},${z}`);
      assert.ok(canStand(x,z,world,.34,support.height),`Lookout route collides at ${x},${z}`);
      previous=support.height;
    }
  }
  assert.ok(previous>summit+9);
  const under=p(0,34),above=surfaces.supportAt(under.x,under.z,{maxY:summit+10});
  assert.equal(canStand(under.x,under.z,world,.34,summit),true);
  assert.equal(canStand(under.x,under.z,world,.34,above.height),true);
  assert.ok(above.height>summit+9,'The same gate position can be walked through or above.');
});

test('Canerd keeps detailed masonry in a small cooperative set of finite, vertex-coloured meshes',()=>{
  assert.ok(yields>100,'Large scenery creation must yield to loading.');
  assert.ok(scene.metrics.batches<=20);
  assert.ok(scene.metrics.vertices>50000&&scene.metrics.vertices<200000);
  assert.equal(scene.root.children.length,scene.metrics.batches);
  const materials=new Set();
  for(const mesh of scene.root.children) {
    assert.equal(mesh.isMesh,true);
    materials.add(mesh.material);
    const positions=mesh.geometry.attributes.position,normals=mesh.geometry.attributes.normal;
    assert.equal(positions.count,normals.count);
    assert.equal(positions.count,mesh.geometry.attributes.color.count);
    for(const n of positions.array)assert.ok(Number.isFinite(n));
    for(const n of normals.array)assert.ok(Number.isFinite(n));
    assert.ok(Number.isFinite(mesh.geometry.boundingSphere.radius));
    assert.ok(mesh.geometry.boundingSphere.radius<200);
  }
  assert.equal(materials.size,1);
  assert.equal(scene.metrics.colliders,colliders.length);
});
