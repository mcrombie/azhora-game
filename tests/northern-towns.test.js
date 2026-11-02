import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule} from './module-loader.js';
import * as THREE from '../vendor/three.module.js';
import {NORTHERN_TOWNS} from '../src/content/regions/northern-towns/northern-towns-layout.js';
import {NORTHERN_TOWN_BUILDINGS,buildingCorners} from '../src/content/regions/northern-towns/northern-towns-buildings.js';
import {outerGround,outerCellAt,outerWaterAt,OUTER_RIVERS,OUTER_LANDMARKS} from '../src/content/regions/outer-regions/outer-regions-world.js';
import {regionBase,groundWithRiver} from '../src/world/terrain/world-terrain.js';
import {landDistance,TRANSFORM} from '../src/world/terrain/region-world.js';
const {createNorthernTownScenery}=await sourceModule('../src/content/regions/northern-towns/northern-towns-scenery.js');
const {atlasPlaceMarks,atlasMarkKnown}=await sourceModule('../src/ui/map/world-map-detail.js');
const heightAt=(x,z)=>outerGround(x,z,regionBase(x,z));
for(const town of NORTHERN_TOWNS){
  test(town.name+' occupies the marked bank with dry building footprints and a discoverable marker',()=>{
    assert.equal(outerCellAt(town.x,town.z).region,town.region);assert.ok(OUTER_LANDMARKS.some(m=>m.id===town.id));
    const [mark]=atlasPlaceMarks([{...town,...TRANSFORM.worldToAtlas(town.x,town.z)}]);assert.equal(mark.kind,'city');assert.equal(atlasMarkKnown(mark,new Set()),false);assert.equal(atlasMarkKnown(mark,new Set(),true),true);
    for(const b of NORTHERN_TOWN_BUILDINGS[town.id])for(const p of buildingCorners(b)){
      assert.ok(landDistance(p.x,p.z)>5,b.id);assert.equal(outerWaterAt(p.x,p.z),null,b.id);assert.ok(Math.abs(heightAt(p.x,p.z)-groundWithRiver(p.x,p.z))<.001,b.id);
    }
  });
  test(town.name+' has a descending estuary and connected bridge banks',()=>{
    const river=OUTER_RIVERS.find(r=>r.town===town.id);assert.ok(river);let previous=-Infinity;
    for(const p of river.points){assert.ok(p.y>=previous);previous=p.y;
      // The headwater endpoint lies on the Baldro boundary. Only the portion
      // owned by this region uses the northern river bed and water renderer.
      if(outerCellAt(p.x,p.z))assert.ok(heightAt(p.x,p.z)<p.y-.4,'river bed');}
    const b=town.bridge;for(const side of [-1,1])assert.ok(Math.abs(heightAt(b.x+side*(b.length/2+.1),b.z)-b.y)<.5,'bridge landing');
    for(let i=0;i<=30;i++){const x=town.mouth.x+i,z=town.mouth.z-i*.577;assert.ok(heightAt(x,z)<-.5,'unblocked outlet');}
  });
  test(town.name+' is finite, batched scenery with its own civic silhouette',()=>{
    const parent=new THREE.Group(),colliders=[],result=createNorthernTownScenery({parent,heightAt,colliders,town});assert.ok(result.metrics.buildings>=25);assert.equal(result.metrics.boats,4);
    assert.ok(NORTHERN_TOWN_BUILDINGS[town.id].some(b=>b.kind===(town.style==='finnish'?'belfry':'guildhall')));
    let meshes=0,vertices=0;parent.traverse(m=>{if(m.isMesh){meshes++;vertices+=m.geometry.attributes.position.count;assert.ok(m.geometry.attributes.position.array.every(Number.isFinite));}});assert.ok(meshes<20);assert.ok(vertices<450000);
  });
}
