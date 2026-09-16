import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
const {createSurveyWorld}=await sourceModule('../src/survey-world.js');
const atlas=JSON.parse(await readFile(new URL('../assets/azhora-dev-regions.json',import.meta.url),'utf8'));

test('every authored region can be surveyed without moving its cells or inventing surrounding sea',()=>{
  for(const original of atlas.regions){
    const region={...original,...original.bounds},before=JSON.stringify(region),scene=new THREE.Scene(),sentinel=new THREE.Group();scene.add(sentinel);
    const world=createSurveyWorld(scene,region),ground=world.root.children.find(object=>object.isInstancedMesh);
    assert.equal(ground.count,region.cells.length);assert.equal(JSON.stringify(region),before);assert.match(world.metadata.subtitle,/gameplay not built/);
    const highest=Math.max(...region.cells.map(cell=>world.heightAt((cell.x-region.centerX)*1.8,(cell.y-region.centerY)*1.8)));
    assert.ok(world.spawn.y>highest);
    for(const [axis,min,max] of [['x','minX','maxX'],['y','minY','maxY'],['z','minZ','maxZ']])assert.ok(world.spawn[axis]>=world.bounds[min]&&world.spawn[axis]<=world.bounds[max]);
    assert.equal(world.root.children.find(object=>object.name.startsWith('Neutral survey base')).position.y,-18.1);
    for(const object of world.root.children)if(object.isMesh)assert.ok([...object.geometry.attributes.position.array].every(Number.isFinite));
    world.dispose();world.dispose();assert.deepEqual(scene.children,[sentinel]);
  }
});
