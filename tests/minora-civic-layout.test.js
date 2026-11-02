import test from 'node:test';
import assert from 'node:assert/strict';
import {MINORA_CIVIC_BUILDINGS,MINORA_WARDS,minoraCivicBuilding,nearestMinoraCivicBuilding} from '../src/content/regions/minora-frontier/minora-civic-layout.js';
import {MENORA_BUILDINGS,MENORA_PATHS,MENORA_GATES,MENORA_NPC_ANCHORS,menoraSegmentDistance,menoraGround} from '../src/content/regions/minora-frontier/menora-city.js';
import {sourceModule} from './module-loader.js';

test('The civic register covers every existing city building and stable without replacing residential uses',()=>{
  assert.equal(MINORA_CIVIC_BUILDINGS.length,21);
  assert.equal(new Set(MINORA_CIVIC_BUILDINGS.map(b=>b.id)).size,21);
  for(const old of MENORA_BUILDINGS){
    const b=minoraCivicBuilding(old.id);assert.ok(b,old.id);
    for(const key of ['x','z','width','depth','height'])assert.equal(b[key],old[key],`${old.id} changed ${key}`);
    assert.equal(b.housing.permanent,old.kind==='house',old.id);
    assert.ok(MINORA_WARDS[b.ward]);assert.ok(b.owner&&b.purpose&&b.description&&b.history);
    assert.equal(nearestMinoraCivicBuilding(b.entrance)?.id,b.id,old.id);
  }
  assert.equal(MINORA_CIVIC_BUILDINGS.filter(b=>b.housing.permanent).length,13);
  assert.deepEqual(MINORA_CIVIC_BUILDINGS.filter(b=>b.housing.visitorUse).map(b=>b.id),['menora-house-1','menora-house-4']);
  assert.equal(nearestMinoraCivicBuilding({x:0,z:0}),null);
});

test('The public register distinguishes municipal and private food and keeps concealed information private',()=>{
  assert.equal(minoraCivicBuilding('menora-storehouse').service,'granary');
  assert.equal(minoraCivicBuilding('menora-storehouse').owner,'City of Minora');
  assert.equal(minoraCivicBuilding('menora-house-13').service,'provisions');
  assert.notEqual(minoraCivicBuilding('menora-house-13').owner,'City of Minora');
  assert.equal(minoraCivicBuilding('menora-house-8').residents.length,1);
  for(const b of MINORA_CIVIC_BUILDINGS)assert.doesNotMatch(b.description,/secret reserve|hidden grain|concealed reserve/i);
});

test('Civic fronts add only two static batches and keep all movement routes and guard posts open',async()=>{
  const THREE=await sourceModule('../vendor/three.module.js');
  const {createMenoraScenery}=await sourceModule('../src/content/regions/minora-frontier/menora-scenery.js');
  const parent=new THREE.Group(),colliders=[],city=createMenoraScenery({parent,colliders,heightAt:(x,z)=>menoraGround(x,z,21.3)});
  assert.equal(city.civic.metrics.buildings,21);assert.equal(city.civic.metrics.wards,4);
  assert.equal(city.civic.metrics.staticBatches,2);assert.equal(city.civic.metrics.letteringBatches,1);
  assert.ok(city.civic.metrics.vertices<18000);
  assert.ok(city.civic.props.length>=5,'Useful working fronts should survive the clearance checks');
  assert.equal(colliders.filter(c=>c.kind==='civic-prop').length,city.civic.props.length);
  for(const p of city.civic.props){
    const radius=Math.hypot(p.w,p.d)/2;
    for(const path of MENORA_PATHS)for(let i=1;i<path.points.length;i++)assert.ok(menoraSegmentDistance(p.x,p.z,path.points[i-1],path.points[i])>path.width/2+radius+.55,`${p.id} blocks ${path.id}`);
    for(const point of [...MENORA_GATES,...MENORA_NPC_ANCHORS.guards])assert.ok(Math.hypot(point.x-p.x,point.z-p.z)>radius+1.15,p.id);
    for(const building of MINORA_CIVIC_BUILDINGS)assert.ok(Math.abs(building.entrance.x-p.x)>=p.w/2+1.1||Math.abs(building.entrance.z-p.z)>=p.d/2+1.1,`${p.id} blocks ${building.id}`);
  }
  const labels=parent.getObjectByName('Minora civic lettering / shared atlas');assert.ok(labels);
  assert.equal(labels.geometry.attributes.position.count,21*6);
  assert.equal(city.metrics.buildings,MENORA_BUILDINGS.length);
});
