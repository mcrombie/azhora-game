import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule} from './module-loader.js';
const THREE=await sourceModule('../vendor/three.module.js');
const {createRiverboatCrew}=await sourceModule('../src/content/regions/minora-frontier/riverboat-crew.js');

test('Barge crew works the sweeps and tiller below bridge clearance, then ships oars within the beam',()=>{
  const parent=new THREE.Group(),crew=createRiverboatCrew(parent),position=crew.mesh.geometry.attributes.position;
  const rest=position.array.slice();
  crew.update(1,{phase:'sailing',speed:1.9,rowing:true,turnRate:.15});
  assert.equal(crew.state().crew,2);assert.equal(crew.state().helmsmen,1);assert.equal(crew.state().rowers,1);
  assert.equal(crew.state().rowing,true);assert.ok(crew.state().steering>.2);assert.notDeepEqual(position.array,rest);
  for(let time=2;time<10;time+=.13){
    crew.update(time,{phase:'sailing',speed:1.9,rowing:true});
    crew.mesh.geometry.computeBoundingBox();const bounds=crew.mesh.geometry.boundingBox;
    assert.ok(bounds.max.y<2.15,'Seated crew remains below the lowered mast air draft');
    assert.ok(bounds.max.x<2.3&&bounds.min.x>-2.3,'Sweeps extend less than 1.1m beyond each gunwale');
    assert.ok([...position.array].every(Number.isFinite));
  }
  crew.update(11,{phase:'sailing',speed:1.9,rowing:false});crew.mesh.geometry.computeBoundingBox();
  assert.ok(crew.mesh.geometry.boundingBox.max.x<1.2&&crew.mesh.geometry.boundingBox.min.x>-1.2,'Shipped sweeps stay within hull beam');
  assert.equal(crew.state().rowing,false);
  crew.dispose();
});

test('Crew animation sleeps with hidden ancestors and throttles at viewing distance without losing phase changes',()=>{
  const parent=new THREE.Group(),crew=createRiverboatCrew(parent);
  crew.update(1,{phase:'sailing',rowing:true},{x:1000,z:0});const distant=crew.state();
  crew.update(2,{phase:'sailing',rowing:true},{x:1000,z:0});assert.deepEqual(crew.state(),distant);
  crew.update(2,{phase:'moored',rowing:false},{x:1000,z:0});assert.equal(crew.state().phase,'moored');
  crew.update(3,{phase:'sailing',rowing:true},{x:0,z:0});assert.ok(crew.state().updates>distant.updates);
  parent.visible=false;const before=crew.state(),vertices=crew.mesh.geometry.attributes.position.array.slice();
  crew.update(12,{phase:'moored',rowing:false});assert.deepEqual(crew.state(),before);assert.deepEqual(crew.mesh.geometry.attributes.position.array,vertices);
  let released=0;crew.mesh.geometry.addEventListener('dispose',()=>released++);crew.dispose();crew.dispose();
  assert.equal(released,1);assert.equal(parent.children.length,0);crew.update(50);assert.deepEqual(crew.state(),before);
});

test('Guard watch has a helmsman and two working deck hands in one draw batch',()=>{
  const parent=new THREE.Group(),crew=createRiverboatCrew(parent,{kind:'guard',deck:1.25,beam:5.6,length:23});
  assert.equal(parent.children.length,1);assert.equal(crew.state().crew,3);assert.equal(crew.state().rowers,0);
  const before=crew.mesh.geometry.attributes.position.array.slice();crew.update(10,{phase:'moored',rowing:false,speed:0});
  assert.notDeepEqual(crew.mesh.geometry.attributes.position.array,before);assert.equal(crew.state().phase,'moored');crew.dispose();
});

test('Passenger crew stays aboard at the destination while its horse unloads, and owned geometry is released once',async()=>{
  const {createPassageBoat}=await sourceModule('../src/app/exploration/passage-boat.js');
  const parent=new THREE.Group(),boat=createPassageBoat(parent,true);
  boat.update({x:5,y:16,z:8,heading:.4,phase:'sailing',speed:4,rowing:true},1);
  assert.equal(boat.state().crew,3);assert.equal(boat.state().rowers,2);assert.equal(boat.state().horseAboard,true);
  boat.dock();assert.equal(boat.state().phase,'moored');assert.equal(boat.state().rowing,false);assert.equal(boat.state().horseAboard,false);
  assert.equal(boat.root.parent,parent);assert.equal(boat.root.position.x,5);
  const disposals=new Map();boat.root.traverse(o=>{if(o.isMesh&&!disposals.has(o.geometry)){disposals.set(o.geometry,0);o.geometry.addEventListener('dispose',()=>disposals.set(o.geometry,disposals.get(o.geometry)+1));}});
  boat.dispose();boat.dispose();assert.equal(boat.root.parent,null);
  assert.ok([...disposals.values()].every(n=>n<=1),'Shared or owned horse meshes must never be disposed twice');
  assert.ok([...disposals.values()].some(n=>n===1));
});
