import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { CANERD_GARDEN } from '../src/content/regions/canerd/canerd-world.js';
const {createCanerdSacredOak}=await sourceModule('../src/content/regions/canerd/canerd-sacred-oak.js');
const {getTreeRegistry}=await sourceModule('../src/world/scenery/tree-registry.js');

function fixture() {
  const parent=new THREE.Scene(),colliders=[],heightAt=()=>21.25;
  const oak=createCanerdSacredOak({parent,colliders,heightAt});
  const registry=getTreeRegistry(colliders).configure({root:parent});
  return{parent,colliders,oak,registry};
}
function advance(oak,seconds,options={}) {for(let t=0;t<seconds;t+=.05)oak.update(.05,options);}

test('the sacred veteran is a protected observable English oak with real attached geometry',()=>{
  const {parent,colliders,oak,registry}=fixture(),tree=registry.get(CANERD_GARDEN.oak.id);
  assert.equal(tree.species,'english-oak');assert.equal(tree.harvestable,false);
  assert.equal(registry.fell(tree.id),false);assert.equal(registry.standing(tree.id),true);
  assert.equal(registry.nearestVisible({...CANERD_GARDEN.approach,y:21.25},8)?.id,tree.id);
  oak.root.visible=false;assert.equal(registry.nearestVisible(CANERD_GARDEN.approach,8),null);
  oak.root.visible=true;parent.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(oak.root),size=bounds.getSize(new THREE.Vector3());
  assert.ok(size.y>23&&size.y<24.5,'A giant living tree has the authored 24 metre height');
  assert.ok(size.x>16&&size.x<21&&size.z>16&&size.z<21,'A broad oak crown spreads beyond the thick trunk');
  assert.equal(oak.metrics.meshes,10);assert.ok(oak.metrics.vertices<13000,'The unique veteran stays within a 13k vertex budget');
  assert.ok(bounds.min.y<21.25,'Buttress roots meet the actual ground');
  oak.dispose();oak.dispose();
  assert.equal(parent.children.length,0);assert.equal(colliders.length,0);assert.equal(registry.get(tree.id),null);
});

test('the sleeping face opens physically on waking, speaks, settles and closes again',()=>{
  const {parent,oak}=fixture();
  const sleeping=oak.state();assert.equal(sleeping.open,0);assert.ok(sleeping.eyes.every(eye=>!eye.irisVisible&&!eye.pupilVisible));
  oak.setAwake(true);advance(oak,.45);assert.ok(oak.state().open>0&&oak.state().open<1,'Eyelids move gradually');
  advance(oak,1.1,{speaking:true});assert.equal(oak.state().open,1);
  assert.ok(oak.state().eyes.every(eye=>eye.irisVisible&&eye.pupilVisible&&eye.socketScaleY>.27));
  // A real camera ray sees the pupil instead of a face hidden inside the trunk.
  parent.updateMatrixWorld(true);
  const pupil=oak.eyes[0].pupil,target=pupil.getWorldPosition(new THREE.Vector3());
  const eye=target.clone().add(new THREE.Vector3(-6,0,0)),direction=target.clone().sub(eye).normalize();
  const hit=new THREE.Raycaster(eye,direction).intersectObject(oak.root,true)[0];
  assert.equal(hit?.object,pupil,'The open eye is visibly in front of the bark');
  const talking=oak.state().mouthScaleY;oak.update(.05,{speaking:false});
  assert.ok(talking>oak.state().mouthScaleY);assert.ok(Math.abs(oak.state().mouthScaleY-.04)<1e-9);
  oak.setAwake(false);advance(oak,1.9);assert.equal(oak.state().open,0);
  assert.ok(oak.state().eyes.every(eye=>!eye.irisVisible&&!eye.pupilVisible));
  assert.equal(oak.state().mouthScaleY,sleeping.mouthScaleY);oak.dispose();
});

test('hidden and distant oak animation does no active work and resumes on return',()=>{
  const {parent,oak}=fixture();oak.setAwake(true);
  parent.visible=false;advance(oak,2);assert.equal(oak.state().open,0);
  parent.visible=true;advance(oak,2,{observer:{x:CANERD_GARDEN.oak.x+200,z:CANERD_GARDEN.oak.z}});assert.equal(oak.state().open,0);
  advance(oak,1.4,{observer:CANERD_GARDEN.approach});assert.equal(oak.state().open,1);
  oak.dispose();const before=oak.state();advance(oak,2);assert.deepEqual(oak.state(),before);
});
