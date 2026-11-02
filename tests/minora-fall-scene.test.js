import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule} from './module-loader.js';
const THREE=await sourceModule('../vendor/three.module.js');
const {createMinoraFallScene,MINORA_FALL_LAYOUT:L,MINORA_FALL_DURATION}=await sourceModule('../src/content/chapters/oremindi/minora-fall-scene.js');
const {minoraMarchPoint}=await sourceModule('../src/content/chapters/oremindi/minora-fall-layout.js');
const {createMinoraFallArmy}=await sourceModule('../src/content/chapters/oremindi/minora-fall-army.js');
const world={heightAt:()=>21.3,readyAt:()=>true};
const advance=(view,seconds)=>{for(let i=0;i<Math.ceil(seconds*20);i++)view.update(.05);};

test('Minora fall stays lazy during loading or pause, and resumes the real gate approach',()=>{
 const scene=new THREE.Group();let ready=false;
 const view=createMinoraFallScene({scene,world:{...world,readyAt:()=>ready}});
 try{
  view.update(10);assert.equal(view.state().ready,false);assert.equal(view.group.children.length,0);
  ready=true;view.update(10,{loading:true});view.update(10,{active:false});assert.equal(view.state().elapsed,0);
  advance(view,1);const saved=view.state().elapsed;assert.equal(view.state().actors,56);
  view.update(2,{loading:true});view.update(2,{active:false});view.update(NaN);assert.equal(view.state().elapsed,saved);
  assert.equal(view.camera().id,'column');assert.match(view.camera().caption,/Blood Prince/);
  const gateDistance=(148-45)+(L.gate.x+2470),at=minoraMarchPoint(gateDistance,0);
  assert.ok(Math.hypot(at.x-L.gate.x,at.z-L.gate.z)<1e-8,'column crosses the existing open Muster Gate');
 }finally{view.dispose();}assert.equal(scene.children.length,0);
});

test('the banner transition, arriving messenger, completion and restoration are distinct',()=>{
 const scene=new THREE.Group(),council=new THREE.Group(),other=new THREE.Group(),legacy=new THREE.Group();
 council.name='Minora Council standards';other.name='Other city standards';legacy.name='Minora legacy gate flags';legacy.visible=false;scene.add(council,other,legacy);
 let calls=0;const view=createMinoraFallScene({scene,world,onComplete:s=>{calls++;assert.equal(s.phase,'occupied');}});
 try{
  advance(view,12);assert.equal(council.visible,true);assert.equal(view.state().heads,0);
  advance(view,17);assert.equal(council.visible,false);assert.equal(other.visible,true);assert.equal(view.state().heads,4);
  assert.equal(view.state().standards,12);assert.equal(view.camera().id,'standards');
  advance(view,16);assert.equal(view.state().messenger,'arriving');const bird=view.group.getObjectByName('Wizard Guild / speaking messenger');assert.equal(bird.visible,true);
  advance(view,8);assert.equal(view.state().messenger,'perched');assert.ok(bird.position.distanceTo(new THREE.Vector3(L.perch.x,21.3+L.perch.height,L.perch.z))<1e-8);
  advance(view,10);assert.equal(calls,1);assert.equal(view.state().elapsed,MINORA_FALL_DURATION);view.finish();assert.equal(calls,1);
 }finally{view.dispose();view.dispose();}
 assert.equal(council.visible,true);assert.equal(legacy.visible,false);assert.equal(other.visible,true);
 assert.equal(scene.children.length,3);
});

test('restoring occupation never replays or grants a second completion, and resources are local',()=>{
 const scene=new THREE.Group(),foreign=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial());scene.add(foreign);
 let foreignDisposals=0,calls=0;foreign.geometry.addEventListener('dispose',()=>foreignDisposals++);foreign.material.addEventListener('dispose',()=>foreignDisposals++);
 const view=createMinoraFallScene({scene,world,phase:'occupied',onComplete:()=>calls++});view.update(.1);
 const owned=new Set();view.group.traverse(o=>{if(o.geometry)owned.add(o.geometry);if(o.material)owned.add(o.material);});
 let retired=0;for(const r of owned)r.addEventListener('dispose',()=>retired++);
 assert.equal(view.state().messenger,'perched');view.finish();advance(view,2);assert.equal(calls,0);
 view.dispose();view.dispose();view.finish();view.update(.1);
 assert.equal(retired,owned.size);assert.equal(foreignDisposals,0);assert.equal(view.state().disposed,true);
 foreign.geometry.dispose();foreign.material.dispose();
});

test('persistent occupation retires council standards with one world scan',()=>{
 const scene=new THREE.Group(),council=new THREE.Group();council.name='Minora Council standards';scene.add(council);
 let scans=0;const traverse=scene.traverse.bind(scene);scene.traverse=visitor=>{scans++;traverse(visitor);};
 const view=createMinoraFallScene({scene,world,phase:'occupied'});
 try{advance(view,5);assert.equal(council.visible,false);assert.equal(scans,1,'Idle occupation does not repeatedly traverse world scenery');}
 finally{view.dispose();}assert.equal(council.visible,true);
});

test('the complete tableau has finite bounded geometry and an instanced army',()=>{
 const scene=new THREE.Group(),view=createMinoraFallScene({scene,world,phase:'occupied'});
 try{view.update(.05);let meshes=0,vertices=0,instances=0;
  view.group.traverse(o=>{if(!o.isMesh)return;meshes++;vertices+=o.geometry.attributes.position.count;
   for(const v of o.geometry.attributes.position.array)assert.ok(Number.isFinite(v));
   if(o.isInstancedMesh){instances++;for(const v of o.instanceMatrix.array)assert.ok(Number.isFinite(v));}
  });
  assert.equal(instances,14,'thirteen army parts plus the courier motes');assert.ok(meshes<80,`${meshes} meshes`);assert.ok(vertices<55000,`${vertices} vertices`);
 }finally{view.dispose();}
});

test('a committed foreground spear actually points forward through the gate',()=>{
 const scene=new THREE.Group(),army=createMinoraFallArmy(scene);try{
  army.set(0,{x:0,y:0,z:0,heading:Math.PI/2,strike:1});army.flush();
  const shaft=army.group.getObjectByName('spear'),matrix=new THREE.Matrix4();shaft.getMatrixAt(0,matrix);
  const direction=new THREE.Vector3(0,1,0).transformDirection(matrix);
  assert.ok(direction.dot(new THREE.Vector3(1,0,0))>.99);
 }finally{army.dispose();}
});

test('presentation hides only council standards and the old tower, preserving the outdoor city',async()=>{
 const {createMinoraFallPresentation}=await sourceModule('../src/content/chapters/oremindi/minora-fall-host.js');
 const old=Object.getOwnPropertyDescriptor(globalThis,'document'),node=()=>({children:[],style:{},append(...children){this.children.push(...children);},setAttribute(){},remove(){}});
 globalThis.document={body:node(),createElement:node};
 const scene=new THREE.Group(),outside=new THREE.Group(),city=new THREE.Group(),standards=new THREE.Group(),tower=new THREE.Group();
 outside.name='Lizeem exterior';city.name='Minora walls and houses';standards.name='Minora Council standards';tower.name='The Sorcerers’ Guild';outside.add(city,standards,tower);scene.add(outside);
 let released=0,mode=null;const view=createMinoraFallPresentation({scene,world:{...world,exteriorRoot:outside,addExteriorFeature(){return ()=>released++;}},setMode:value=>mode=value});
 try{
  const completed=view.start();assert.equal(mode,'cinematic');for(let i=0;i<33;i++)view.update(1,true,L.perch);
  assert(outside.visible&&city.visible,'Occupation never hides the parent containing the whole city');assert.equal(standards.visible,false);assert.equal(tower.visible,true);
  for(let i=0;i<26;i++)view.update(1,true,L.perch);assert.equal(await completed,true);assert.equal(mode,'playing');assert.equal(tower.visible,false);
  const replay=view.start();assert(outside.visible&&city.visible&&standards.visible&&tower.visible,'Rehearsing from occupation restores the city before the first shot');
  view.keydown({code:'Escape',repeat:false,preventDefault(){}});assert.equal(await replay,true);
  assert(view.reset());assert(outside.visible&&city.visible&&standards.visible&&tower.visible);
 }finally{view.dispose();if(old)Object.defineProperty(globalThis,'document',old);else delete globalThis.document;}
 assert.equal(released,1);
});
