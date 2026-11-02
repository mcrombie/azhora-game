import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {sourceModule} from './module-loader.js';
import {weatherSample} from '../src/world/environment/weather-model.js';
const {createWeatherView}=await sourceModule('../src/world/environment/weather-view.js');
const rainSample=weatherSample(0,{override:'rain'});
function fixture({heightAt=()=>0,colliders=[]}={}) {
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(55,1,.1,1200);camera.position.set(0,3,8);
  scene.background=new THREE.Color('#abc123');scene.fog=new THREE.FogExp2('#345678',.006);
  const sun=new THREE.DirectionalLight('#eeddaa',1.8);scene.add(sun);
  let queries=0;const world={heightAt,nearColliders(){queries++;return colliders;}};
  const view=createWeatherView({scene,camera,world});return{scene,camera,sun,view,queries:()=>queries};
}
const update=(view,overrides={})=>view.update(.1,{sample:rainSample,time:50,position:{x:0,y:0,z:0},exterior:true,active:true,sky:true,...overrides});

test('weather owns at most two bounded draws and never changes lighting, fog or world geometry',()=>{
  const {scene,camera,sun,view}=fixture(),background=scene.background.clone(),fog=scene.fog.color.clone();
  const positions=view.rain.geometry.attributes.position,initial=positions.array.slice();
  update(view);const start=view.state();
  assert.equal(start.drawCalls,2);assert.equal(start.rainCapacity,512);assert.equal(positions.count,1024);assert.ok(start.rainCount>300);
  assert.equal(start.extraLights,0);assert.equal(start.extraShadowPasses,0);assert.ok(start.triangles<=1000);
  assert.equal(view.clouds.renderOrder,-997);assert.equal(view.clouds.material.depthTest,true);assert.equal(view.clouds.material.depthWrite,false);
  for(let i=0;i<8;i++)update(view);
  assert.ok(view.state().animationTime>start.animationTime+.7,'A held campaign timestamp still has moving weather');
  assert.deepEqual(positions.array,initial,'Rain movement is on the GPU, with no per-frame particle geometry writes');
  assert.deepEqual(scene.background,background);assert.deepEqual(scene.fog.color,fog);assert.equal(scene.fog.density,.006);assert.equal(sun.intensity,1.8);
  assert.equal(scene.children.filter(node=>node.isLight).length,1);
  camera.position.x=2;update(view);assert.equal(view.clouds.position.x,2);assert.equal(view.clouds.material.uniforms.worldOrigin.value.x,2);
  let disposals=0;for(const geometry of [view.clouds.geometry,view.rain.geometry])geometry.addEventListener('dispose',()=>disposals++);
  view.dispose();view.dispose();assert.equal(disposals,2);assert.equal(view.root.parent,null);assert.equal(view.state().drawCalls,0);assert.equal(view.state().disposed,true);
});

test('paused developer previews change appearance without advancing phases or doing shelter work',()=>{
  const {view,queries}=fixture();update(view);const before=view.state(),queryCount=queries();
  update(view,{active:false,time:900,sample:weatherSample(0,{override:'clear'})});
  assert.equal(view.state().cloudCover,.045);assert.equal(view.state().rainVisible,false);
  update(view,{active:false,time:901,sample:weatherSample(0,{override:'overcast'})});
  assert.equal(view.state().cloudCover,.92);assert.equal(view.state().animationTime,before.animationTime);assert.equal(queries(),queryCount);
  update(view,{exterior:false,time:5000});assert.equal(view.state().visible,false);assert.equal(view.state().drawCalls,0);assert.equal(queries(),queryCount);
  update(view,{active:false,exterior:false});assert.equal(view.state().floorSamples,before.floorSamples);
  view.dispose();const disposed=view.state();update(view);assert.deepEqual(view.state(),disposed);
});

test('an actual front-side roof shelters the traveler, restores its material, and clears after leaving',()=>{
  const {scene,camera,view}=fixture();
  const material=new THREE.MeshStandardMaterial({side:THREE.FrontSide}),roof=new THREE.Mesh(new THREE.PlaneGeometry(12,12),material);
  roof.name='Actual hall roof';roof.rotation.x=-Math.PI/2;roof.position.y=7;scene.add(roof);
  update(view);assert.equal(view.state().sheltered,true);assert.equal(view.state().rainVisible,false);assert.equal(material.side,THREE.FrontSide);
  assert.equal(view.state().floorSamples,0,'Sheltered rain does no particle ground sampling');
  const before=view.state().shelterQueries;for(let i=0;i<5;i++)update(view);assert.equal(view.state().shelterQueries,before,'The roof query is cached');
  camera.position.x=60;update(view,{position:{x:60,y:0,z:0}});assert.equal(view.state().sheltered,false);assert.equal(view.state().rainVisible,true);
  view.dispose();roof.geometry.dispose();material.dispose();
});

test('rain clips to sloping ground, colliders and neighboring roof envelopes without clipping live actors',()=>{
  const heightAt=(x,z)=>10+x*.06+z*.025,colliders=[{x:-9,z:0,hx:3,hz:3,minY:10,maxY:17,kind:'stone-roof'}];
  const {scene,camera,view}=fixture({heightAt,colliders});camera.position.set(0,13,0);
  const roof=new THREE.Mesh(new THREE.BoxGeometry(6,.2,6),new THREE.MeshStandardMaterial());roof.name='Barn roof';roof.position.set(8,16,0);scene.add(roof);
  const actor=new THREE.Group();actor.userData.creature='human';const actorMesh=new THREE.Mesh(new THREE.BoxGeometry(4,5,4),new THREE.MeshStandardMaterial());actorMesh.position.y=4;actor.add(actorMesh);scene.add(actor);
  update(view,{position:{x:0,y:10,z:0}});assert.equal(view.state().sheltered,false);
  const p=view.rain.geometry.attributes.position,f=view.rain.geometry.attributes.floorHeight;let roofClips=0,colliderClips=0;
  for(let i=0;i<p.count;i+=2){const x=p.getX(i),z=p.getZ(i),floor=f.getX(i)+10;
    assert.ok(floor>=heightAt(x,z)+.1399,'No streak is emitted below the actual terrain');
    if(x>=5&&x<=11&&Math.abs(z)<=3){assert.ok(floor>16);roofClips++;}
    if(Math.abs(x+9)<=3&&Math.abs(z)<=3){assert.ok(floor>=17.13);colliderClips++;}
  }
  assert.ok(roofClips>0&&colliderClips>0);assert.ok(view.state().shelterCandidates<=64);
  const c0=view.clouds.material.uniforms.lightCloud.value.clone();update(view,{position:{x:0,y:10,z:0},night:.4999});const c1=view.clouds.material.uniforms.lightCloud.value.clone();
  update(view,{position:{x:0,y:10,z:0},night:.5001});const c2=view.clouds.material.uniforms.lightCloud.value;
  assert.ok(c1.distanceToSquared?c1.distanceToSquared(c2)<1e-6:Math.abs(c1.r-c2.r)+Math.abs(c1.g-c2.g)+Math.abs(c1.b-c2.b)<.001,'Night cloud tint is continuous');
  assert.notDeepEqual(c0,c1);view.dispose();roof.geometry.dispose();roof.material.dispose();actorMesh.geometry.dispose();actorMesh.material.dispose();
});
