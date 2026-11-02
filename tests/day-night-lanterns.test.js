import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule} from './module-loader.js';

const THREE = await sourceModule('../vendor/three.module.js');
const {createNightLanterns,NIGHT_LANTERN_SITES} = await sourceModule('../src/experiments/day-night/lanterns.js');
const stable = {x:-2426,y:22,z:65}, caricas = {x:-2092,y:17,z:265};

test('the optional lantern layer does no scenery or terrain work until enabled outside nearby prepared land',()=>{
  const scene = new THREE.Scene();let probes = 0, prepared = false;
  const layer = createNightLanterns({scene,heightAt:()=>{probes++;return prepared?21.3:NaN;}});
  layer.update({enabled:false,exterior:true,night:1,position:stable});
  layer.update({enabled:true,exterior:false,night:1,position:stable});
  layer.update({enabled:true,exterior:true,night:1,position:{x:0,y:20,z:0}});
  assert.equal(probes,0);assert.equal(scene.children.length,0);
  layer.update({enabled:true,exterior:true,night:1,position:stable});
  assert(probes>0);assert.equal(scene.children.length,0,'An unprepared height never becomes a floating fixture');
  prepared = true;layer.update({enabled:true,exterior:true,night:1,position:stable});
  assert.equal(scene.children.length,1);assert(layer.state().fixtures.every(p=>p.id.startsWith('minora')||p.id==='guild-stable'));
  layer.dispose();assert.equal(scene.children.length,0);
});

test('two reusable shadowless lights illuminate only nearby lamps and tower views have no distant dynamic lights',()=>{
  const scene = new THREE.Scene(),layer = createNightLanterns({scene,heightAt:()=>17});
  layer.update({enabled:true,exterior:true,night:1,position:caricas});
  assert.equal(layer.state().activeLights,2);assert.equal(layer.state().drawBatches,3);
  const lights = scene.children[0].children.filter(p=>p.isPointLight);
  assert.equal(lights.length,2);assert(lights.every(l=>!l.castShadow));
  layer.update({enabled:true,exterior:true,night:1,position:{...caricas,z:302}});
  assert.deepEqual(scene.children[0].children.filter(p=>p.isPointLight),lights,'Travel reuses the light pool');
  layer.update({enabled:true,exterior:true,night:1,position:{...stable,y:155}});
  assert(layer.state().visible);assert.equal(layer.state().activeLights,0);
  layer.update({enabled:true,exterior:true,night:0,position:stable});assert.equal(layer.state().activeLights,0);
  layer.update({enabled:false,exterior:true,night:1,position:stable});
  assert.equal(layer.state().visible,false);assert.equal(layer.state().activeLights,0);
  assert(layer.state().lights.every(l=>l.intensity===0));
  layer.dispose();
});

test('nearby fixtures follow prepared ground changes without touching existing world materials or lights',()=>{
  const scene = new THREE.Scene(),material = new THREE.MeshStandardMaterial({color:'#abc123'});
  const world = new THREE.Mesh(new THREE.BoxGeometry(),material),sun = new THREE.DirectionalLight('#fff',2);
  scene.add(world,sun);let ground = 21.3;
  const layer = createNightLanterns({scene,heightAt:()=>ground});
  layer.update({enabled:true,exterior:true,night:1,position:stable});
  ground = 23.6;layer.update({enabled:true,exterior:true,night:.5,position:stable});
  assert(layer.state().fixtures.every(p=>p.y===23.6));
  const glass = scene.children.at(-1).children.filter(p=>p.isInstancedMesh)[1],matrix = new THREE.Matrix4();
  glass.getMatrixAt(0,matrix);assert(Math.abs(matrix.elements[13]-(23.6+2.68))<.0001);
  let disposed = false;material.addEventListener('dispose',()=>{disposed=true;});
  layer.dispose();layer.dispose();
  assert.equal(disposed,false);assert.equal(material.color.getHexString(),'abc123');assert.equal(sun.intensity,2);
  assert.deepEqual(scene.children,[world,sun]);
  world.geometry.dispose();material.dispose();
});

test('fixed night landmarks remain off the authored roads and outside house footprints',async()=>{
  const {MENORA_PATHS,MENORA_BUILDINGS,menoraSegmentDistance,menoraRiverClearance} = await sourceModule('../src/content/regions/minora-frontier/menora-city.js');
  const {CARICAS_ROADS,CARICAS_BUILDINGS,distanceToFrontierPath} = await sourceModule('../src/content/regions/minora-frontier/caricas-settlement.js');
  assert.equal(NIGHT_LANTERN_SITES.length,7);
  for(const site of NIGHT_LANTERN_SITES){
    const minora = !site.id.startsWith('caricas');
    if(minora){
      for(const road of MENORA_PATHS)for(let i=1;i<road.points.length;i++)
        assert(menoraSegmentDistance(site.x,site.z,road.points[i-1],road.points[i])>road.width/2+.5,site.id+' clear of '+road.id);
      assert(menoraRiverClearance(site.x,site.z)>1,site.id+' stays on dry land');
    }else for(const road of CARICAS_ROADS)
      assert(distanceToFrontierPath(road.points,site.x,site.z)>road.width/2+.5,site.id+' clear of '+road.id);
    for(const building of minora?MENORA_BUILDINGS:CARICAS_BUILDINGS)
      assert(Math.abs(site.x-building.x)>(building.width??building.w)/2+.3||Math.abs(site.z-building.z)>(building.depth??building.d)/2+.3,site.id+' clear of '+building.id);
  }
});
