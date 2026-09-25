import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './module-loader.js';
import { FERRY_LANDINGS } from '../src/ferry.js';
import { HOME_FERRY_SECONDS } from '../src/home-residents.js';
const THREE = await sourceModule('../vendor/three.module.js');
const { homeFerryFrame, createHomeFerryView, HOME_FERRY_BERTHS } = await sourceModule('../src/home-ferry-view.js');
const sailing = clock => ({phase:'sailing',leg:'quay',clock,position:{...FERRY_LANDINGS.peblos.ashore}});
const gap = (a,b) => Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);

test('Troy boards from the saved shore position and disembarks onto the actual Port Calos quay',()=>{
  const departure=homeFerryFrame(sailing(0)),arrival=homeFerryFrame(sailing(HOME_FERRY_SECONDS));
  assert.deepEqual(departure.passenger.position,{x:FERRY_LANDINGS.peblos.ashore.x,y:2.1,z:FERRY_LANDINGS.peblos.ashore.z});
  assert.deepEqual(arrival.passenger.position,{x:FERRY_LANDINGS['port-calos'].ashore.x,y:3,z:FERRY_LANDINGS['port-calos'].ashore.z});
  assert.equal(departure.plank,'peblos');assert.equal(arrival.plank,'port-calos');
  for(let t=0;t<7;t+=.1)assert.ok(gap(homeFerryFrame(sailing(t)).passenger.position,homeFerryFrame(sailing(t+.1)).passenger.position)<.35);
  for(let t=50;t<59.9;t+=.1)assert.ok(gap(homeFerryFrame(sailing(t)).passenger.position,homeFerryFrame(sailing(t+.1)).passenger.position)<.35);
});

test('the sea crossing fades at each harbor and never renders Troy crossing the map on foot',()=>{
  assert.equal(homeFerryFrame(sailing(7)).passenger.opacity,1);
  assert.ok(homeFerryFrame(sailing(14)).passenger.opacity<.34);
  for(let t=15;t<=43;t++){
    const frame=homeFerryFrame(sailing(t));
    assert.equal(frame.passenger.visible,false);assert.equal(frame.passenger.opacity,0);
  }
  assert.ok(homeFerryFrame(sailing(44)).passenger.opacity>.3);
  assert.equal(homeFerryFrame(sailing(46)).passenger.opacity,1);
  for(let t=0;t<60;t+=.1){
    const {passenger:p}=homeFerryFrame(sailing(t));
    if(!p.visible)continue;
    const from=HOME_FERRY_BERTHS.peblos,to=HOME_FERRY_BERTHS['port-calos'];
    assert.ok(Math.min(Math.hypot(p.position.x-from.x,p.position.z-from.z),Math.hypot(p.position.x-to.x,p.position.z-to.z))<25);
  }
});

test('restoring the same sailing clock reproduces the same pose without mutating a saved position',()=>{
  const state=sailing(48.2),before=structuredClone(state);
  assert.deepEqual(homeFerryFrame(state),homeFerryFrame(structuredClone(state)));
  assert.deepEqual(state,before);
  assert.equal(homeFerryFrame({phase:'walking',leg:'home',clock:0}).passenger,null);
});

test('the visual clones only the boat and leaves the player ferry materials and transform alone',()=>{
  const scene=new THREE.Scene(),source=new THREE.Group();source.name='Jess\u2019s boat';source.position.set(25,.38,24.8);
  const material=new THREE.MeshLambertMaterial({color:0xabcdef});
  const hull=new THREE.Mesh(new THREE.BoxGeometry(2,1,6),material);source.add(hull);scene.add(source);
  const view=createHomeFerryView({scene});view.update(sailing(14));
  assert.deepEqual(source.position.toArray(),[25,.38,24.8]);assert.equal(material.opacity,1);assert.equal(material.transparent,false);
  const clone=view.group.getObjectByName('Homeward passage boat');assert.notEqual(clone.children[0].material,material);
  assert.ok(clone.children[0].material.opacity<.34);
  view.update(sailing(60));view.update({phase:'walking',leg:'home',clock:0});
  assert.equal(clone.visible,true);assert.equal(clone.position.x,HOME_FERRY_BERTHS['port-calos'].x);
  view.update(null);assert.equal(clone.visible,false);
  assert.equal(scene.children.length,2);view.dispose();assert.equal(scene.children.length,1);
  assert.equal(source.children[0],hull);
});
