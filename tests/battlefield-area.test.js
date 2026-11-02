import test from 'node:test';
import assert from 'node:assert/strict';
import {createBattlefieldArea,stopAtBattleBoundary,battlefieldBoundary} from '../src/app/exploration/battlefield-area.js';
import {sourceModule} from './module-loader.js';
const THREE=await import('../vendor/three.module.js');
const {createBattlefieldAreaView}=await sourceModule('../src/app/exploration/battlefield-area-view.js');
const battle={id:'ovesos-1',region:'ovesos',status:'active',location:{x:100,z:200}};
const at=(distance=0)=>({x:100+distance,y:5,z:200});

test('entry offers once, refusal does not lock out F or a later full crossing',()=>{
  const area=createBattlefieldArea(),enter=(d,options={})=>area.update({battles:[battle],position:at(d),...options});
  assert.equal(enter(80),null);assert.equal(enter(70),battle);
  for(let i=0;i<100;i++)assert.equal(enter(30),null);
  assert.equal(area.nearest(at(30)),battle,'F can reopen after declining without leaving');
  assert.equal(enter(75),null);assert.equal(enter(69),null,'Edge jitter does not reopen');
  assert.equal(enter(79),null);assert.equal(enter(69),battle,'A real exit rearms entry');
  assert.equal(area.state().battles[0].entries,2);
});

test('pauses, airborne travel and unloaded/wrong-region terrain cannot present the offer',()=>{
  const area=createBattlefieldArea(),update=options=>area.update({battles:[battle],position:at(),...options});
  assert.equal(update({enabled:false}),null);assert.equal(update({eligible:()=>false}),null);
  assert.equal(update({eligible:()=>true}),battle,'A rider who lands inside is offered once');
  assert.equal(update({enabled:false}),null);assert.equal(update({enabled:true}),null,'Dialog dismissal does not count as another entry');
  assert.equal(area.nearest(at(),()=>false),null);
});

test('restore resets crossing state and resolved battles disappear immediately',()=>{
  const area=createBattlefieldArea();assert.equal(area.update({battles:[battle],position:at()}),battle);
  area.reset();assert.deepEqual(area.state().battles,[]);
  assert.equal(area.update({battles:[battle],position:at()}),battle);
  assert.equal(area.update({battles:[{...battle,status:'resolved'}],position:at()}),null);
  assert.equal(area.nearest(at()),null);assert.deepEqual(area.state().battles,[]);
});

test('manual F can suppress the automatic offer before its first update',()=>{
  const area=createBattlefieldArea();area.suppress(battle.id);
  assert.equal(area.update({battles:[battle],position:at()}),null);
  assert.equal(area.nearest(at()),battle);
  area.update({battles:[battle],position:at(80)});
  assert.equal(area.update({battles:[battle],position:at()}),battle);
});
test('entry, manual interaction and exit memory follow each battle footprint',()=>{
  for(const radius of [35,95]){
    const field={...battle,entryRadius:radius},area=createBattlefieldArea();
    const update=d=>area.update({battles:[field],position:at(d)});
    assert.equal(update(radius+1),null,'No offer beyond the visible wall');
    assert.equal(area.nearest(at(radius+1)),null);
    const edge=stopAtBattleBoundary(at(radius+5),at(radius-5),field);
    assert.equal(area.update({battles:[field],position:edge}),field,'Stopping at the wall offers entry');
    assert.equal(area.nearest(edge),field,'F reopens the same battle after declining');
    assert.equal(update(radius+7),null);assert.equal(update(radius-1),null,'No repeated prompt from edge jitter');
    assert.equal(update(radius+9),null);assert.equal(update(radius-1),field,'Leaving the actual footprint rearms it');
  }
});

test('overlapping areas offer only the nearest eligible battle per update',()=>{
  const area=createBattlefieldArea(),other={...battle,id:'other',location:{x:110,z:200}};
  assert.equal(area.update({battles:[other,battle],position:at()}),battle);
  assert.equal(area.update({battles:[other,battle],position:at(),enabled:false}),null);
  assert.equal(area.update({battles:[other,battle],position:at()}),other);
});

test('perimeter follows terrain, stays bounded, hides unknown/unloaded/far areas and clears at resolution',()=>{
  const scene=new THREE.Scene(),world={heightAt:(x,z)=>x*.03+z*.02,waterAt:()=>0,readyAt:()=>true};
  const view=createBattlefieldAreaView(scene,world),before=structuredClone(battle);
  view.update([battle],()=>false,at());assert.equal(scene.children.length,0);
  view.update([battle],()=>true,at());assert.equal(scene.children.length,1);
  assert.deepEqual(view.state().map(v=>[v.radius,v.segments,v.pennants]),[[70,96,12]]);
  const root=scene.children[0],line=root.children[0],points=line.geometry.attributes.position;
  for(let i=0;i<points.count;i++)assert.ok(Math.abs(points.getY(i)-world.heightAt(points.getX(i),points.getZ(i))-.16)<.00001);
  for(let i=0;i<120;i++)view.update([battle],()=>true,at());
  assert.equal(scene.children[0],root);assert.equal(root.children.length,4);assert.equal(root.children[3].material.opacity,.78);assert.deepEqual(battle,before);
  view.update([battle],()=>true,at(300));assert.deepEqual(view.state(),[]);
  world.readyAt=()=>false;view.update([battle],()=>true,at());assert.deepEqual(view.state(),[]);
  view.update([{...battle,status:'resolved'}],()=>true,at());assert.equal(scene.children.length,0);
  view.dispose();
});

test('the dark dome closes above sloping ground without extra draws, and combat hides it',()=>{
  const scene=new THREE.Scene(),world={heightAt:(x,z)=>5+(x-100)*.04,waterAt:()=>0,readyAt:()=>true};
  const view=createBattlefieldAreaView(scene,world);view.update([battle],()=>true,at(80));
  const root=scene.children[0],dome=root.children[3],geometry=dome.geometry;
  assert.equal(dome.material.color.getHex(),0x101216);
  assert.equal(dome.material.side,THREE.FrontSide);
  assert.ok(geometry.attributes.position.count/3<2500,'Bounded low-poly shell');
  for(const n of geometry.attributes.position.array)assert.ok(Number.isFinite(n));
  scene.updateMatrixWorld(true);
  const ray=new THREE.Raycaster();
  for(const [dx,dz] of [[0,0],[20,30],[-40,10],[0,-60],[67,0]]){
    ray.set(new THREE.Vector3(100+dx,100,200+dz),new THREE.Vector3(0,-1,0));
    const hits=ray.intersectObject(dome);
    assert.ok(hits.length>0,`No open roof at ${dx}, ${dz}`);
    assert.ok(hits[0].point.y>world.heightAt(100+dx,200+dz));
  }
  view.update([battle],()=>true,at(80));assert.equal(dome.geometry,geometry,'No per-frame rebuild');
  view.update([battle],()=>true,at(),{enabled:false});assert.equal(root.visible,false);
  view.update([],()=>true,at());assert.equal(scene.children.length,0);view.dispose();
});

test('partially loaded perimeter skips missing terrain and fills it when ready',()=>{
  const scene=new THREE.Scene();let loaded=false;
  const world={heightAt:()=>5,waterAt:()=>0,readyAt:(x,z)=>loaded||x<=100};
  const view=createBattlefieldAreaView(scene,world);view.update([battle],()=>true,at());
  assert.ok(view.state()[0].segments<96);assert.equal(view.state()[0].complete,false);
  loaded=true;view.update([battle],()=>true,at(),{dt:1.1});
  assert.equal(view.state()[0].segments,96);assert.equal(view.state()[0].complete,true);view.dispose();
});

test('battle wall stops normal movement, fast tunnelling and inside-save arrivals; moving away is allowed',()=>{
 for(const [before,after]of [[at(80),at(60)],[at(150),at(-150)],[at(0),at(2)]]){const edge=stopAtBattleBoundary(before,after,battle);assert(edge);assert(Math.abs(Math.hypot(edge.x-100,edge.z-200)-70)<.001);}
 assert.equal(stopAtBattleBoundary(at(71),at(85),battle),null);
 const edge=stopAtBattleBoundary(at(80),at(-150),battle);assert(edge.x>100,'Fast flight is stopped at its entry side');
 assert(battlefieldBoundary(battle).every(p=>Math.abs(Math.hypot(p.x-100,p.z-200)-70)<1e-8));
});
