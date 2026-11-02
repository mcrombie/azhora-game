import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {sourceModule} from './module-loader.js';
import {LIZEEM,LIZEEM_HEAD,LIZEEM_REACH,VASTOS_RIVER,MENETH_BECKS,courseHalfAt} from '../src/content/regions/western-regions/west-regions.js';
import {REGION_CELLS,REGION_TERRAIN} from '../src/world/terrain/region-world.js';
import {uplandTerrainTint} from '../src/content/regions/western-regions/upland-palette.js';
import {LIZEEM_FIELDS} from '../src/content/regions/minora-frontier/lizeem-countryside.js';
import {YUNETHRE_FIELDS,YUNETHRE_PATHS} from '../src/content/regions/minora-frontier/yunethre-world.js';
import {ruralPathSurfaceAt} from '../src/content/regions/minora-frontier/rural-path-surface.js';
import {groundFace} from '../src/world/scenery/ground-face.js';
import {terrainRoadHeight} from '../src/world/terrain/terrain-road.js';
const {createLizeemCountrysideSteps}=await sourceModule('../src/content/regions/minora-frontier/lizeem-countryside-scenery.js');
const finish=g=>{let r;do{r=g.next();}while(!r.done);return r.value;};

test('Lizeem is a major channel with a continuous mouth and protected harbor width',()=>{
  assert.equal(courseHalfAt(LIZEEM,0),courseHalfAt(LIZEEM_HEAD,1),'Narrow feeder joins without a square water sheet');
  assert.equal(courseHalfAt(LIZEEM,0),2.4);
  for(let i=0;i<=100;i++)assert.ok(courseHalfAt(LIZEEM,.035+.965*i/100)>=16,'The broad navigable reach begins after the headwater transition');
  assert.equal(courseHalfAt(LIZEEM,1),courseHalfAt(LIZEEM_REACH,0));
  assert.equal(courseHalfAt(LIZEEM_REACH,1),19,'Nylon harbor keeps its existing clearance');
  assert.equal(courseHalfAt(LIZEEM,.54),17.5,'Velsorten intake has an authored bank constriction');
  assert.equal(VASTOS_RIVER.halfWidth,3.2);
  assert.ok(MENETH_BECKS.every(r=>r.maxHalf<16));
});

test('draped paving follows every rendered terrain plane without gaps or sunken corners',()=>{
  const surface={xs:new Float32Array([0,4,8]),zs:new Float32Array([0,4,8]),positions:new Float32Array([
    0,0,0,4,2,0,8,1,0, 0,3,4,4,-1,4,8,2,4, 0,1,8,4,4,8,8,0,8])};
  const faces=[],builder={triangle:(_t,...p)=>faces.push(p)};
  finish(groundFace(builder,'#ffffff',[{x:1,z:1},{x:1,z:7},{x:7,z:7},{x:7,z:1}],()=>99,surface,.06));
  let area=0;
  for(const [a,b,c] of faces){
    for(const p of [a,b,c])assert.ok(Math.abs(p[1]-terrainRoadHeight(p[0],p[2],surface.xs,surface.zs,surface.positions,.06))<1e-5);
    area+=Math.abs((b[0]-a[0])*(c[2]-a[2])-(b[2]-a[2])*(c[0]-a[0]))/2;
  }
  assert.ok(Math.abs(area-36)<1e-5,'No holes or overlapping triangles');
});

test('field scenery stays in six bounded static batches with no runtime updates or shadows',()=>{
  const parent=new THREE.Group();
  const built=finish(createLizeemCountrysideSteps({parent,heightAt:()=>12,fields:[...LIZEEM_FIELDS,...YUNETHRE_FIELDS]}));
  assert.equal(built.metrics.fields,LIZEEM_FIELDS.length+YUNETHRE_FIELDS.length);assert.equal(built.metrics.batches,6);
  assert.ok(built.metrics.triangles<150000,JSON.stringify(built.metrics));
  assert.equal(built.update,undefined);
  parent.traverse(o=>{if(o.isMesh)assert.equal(o.castShadow,false);});
  const excluded=finish(createLizeemCountrysideSteps({parent:new THREE.Group(),heightAt:()=>12,enabledRegion:()=>false}));
  assert.equal(excluded.metrics.batches,0,'Region scope builds no excluded field meshes');
});

test('upland colours vary with terrain character and remain confined to their ground types',()=>{
  for(const name of ['Meneth','Vastos']){
    const colors=new Set(REGION_CELLS[name].map(c=>uplandTerrainTint(c.x,c.z,REGION_TERRAIN[name].ground)));
    assert.ok(colors.size>10,name+' has landscape-scale variation');
    assert.equal(uplandTerrainTint(10000,10000,REGION_TERRAIN[name].ground),null);
  }
  assert.equal(uplandTerrainTint(-1520,-330,'#000000'),null);
});

test('Yunethre path contact follows the displayed route without changing distant terrain',()=>{
  for(const p of YUNETHRE_PATHS)for(const q of p.points)assert.ok(ruralPathSurfaceAt(q.x,q.z));
  assert.equal(ruralPathSurfaceAt(5000,5000),false);
});
