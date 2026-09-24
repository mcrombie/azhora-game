import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { BEN, SPIDER_DEN } from '../src/spider-quest.js';
const {createSpider}=await sourceModule('../src/spider-model.js');
const {createCombatView}=await sourceModule('../src/combat-view.js');
const {createCorpseActor}=await sourceModule('../src/corpse-view.js');

function visibleBounds(group){
  group.updateMatrixWorld(true);const bounds=new THREE.Box3();let meshes=0;
  group.traverseVisible(object=>{if(!object.isMesh||object.userData.groundShadow)return;
    object.geometry.computeBoundingBox();bounds.union(object.geometry.boundingBox.clone().applyMatrix4(object.matrixWorld));meshes++;});
  return {bounds,size:bounds.getSize(new THREE.Vector3()),meshes};
}

test('giant spider has eight moving solid legs, readable body mass and a grounded fallen pose',()=>{
  const actor=createSpider(),legs=actor.group.children.filter(child=>child.name.startsWith('Spider ')&&child.name.includes(' leg '));
  assert.equal(legs.length,8);
  const idle=visibleBounds(actor.group);assert.ok(idle.meshes>30&&idle.meshes<75);
  assert.ok(idle.size.x>4&&idle.size.z>3.8&&idle.size.y>1.5,`Spider must be cart-sized: ${idle.size.toArray()}`);
  const before=legs.map(leg=>leg.getObjectByName('Lower leg').position.clone());actor.animate(.6,2.5,true,{action:'idle'});
  assert.ok(legs.filter((leg,i)=>leg.getObjectByName('Lower leg').position.distanceTo(before[i])>.08).length>=6,'The legs articulate while moving');
  const rear=actor.group.getObjectByName('Spider carapace');actor.animate(1,0,true,{action:'windup',progress:.9});assert.ok(rear.position.y>.15,'Its body visibly rears before biting');
  actor.animate(2,0,true,{action:'dead',progress:1});const dead=visibleBounds(actor.group);
  assert.ok(dead.size.y<idle.size.y*.8,'The fallen spider folds toward the ground');assert.ok(dead.bounds.min.y>=-.15,'The corpse is not buried beneath the terrain');
  const restored=createCorpseActor({kind:'spider',model:{}});restored.animate(2,0,true,{action:'dead',progress:1});
  assert.ok(visibleBounds(restored.group).size.distanceTo(dead.size)<.02,'Reload reconstructs the same spider, not an unrelated small corpse');
});

test('actual encounter descriptors render the spider, Ben’s sorcerer body and travelling fireballs',()=>{
  const previous={document:globalThis.document,innerWidth:globalThis.innerWidth,innerHeight:globalThis.innerHeight};
  const node=()=>({style:{},classList:{toggle(){}},append(){},remove(){},hidden:false});
  const elements=new Map();globalThis.document={createElement:node,getElementById(id){if(!elements.has(id))elements.set(id,node());return elements.get(id);}};
  globalThis.innerWidth=1280;globalThis.innerHeight=720;
  try{
    const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(60,16/9,.1,100);
    camera.position.set(0,13,17);camera.lookAt(0,8,0);camera.updateMatrixWorld();
    const world={heightAt:()=>7},view=createCombatView(scene,world,camera);
    const enemy={...SPIDER_DEN.enemies[0],x:0,z:0,maxHp:220,active:true,action:'idle',yaw:0,progress:0};
    const ally={...SPIDER_DEN.allies[0],x:4,z:2,maxHp:78,action:'idle',yaw:Math.PI,progress:0};
    const state={encounterId:SPIDER_DEN.id,phase:'active',enemies:[enemy],allies:[ally],fireballs:[],player:{action:'idle',progress:0,yaw:0}};
    view.update(.016,0,state,new THREE.Vector3(0,7,6));
    const spider=view.actor(enemy.id);assert.ok(spider?.group.visible,'A simulated spider must have a visible combat actor');
    const shape=visibleBounds(spider.group);assert.ok(shape.bounds.max.y>8.5&&shape.bounds.min.y>6.85);
    const frustum=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
    assert.ok(frustum.intersectsBox(shape.bounds),'The built giant body is in view above ground');
    const ben=view.actor(BEN.id);assert.equal(ben.group.name,'character-sorcerer');
    const wand=ben.group.getObjectByName('Ben’s wand');assert.ok(wand?.isMesh&&wand.visible,'Ben carries his visible wand');
    let robe=false;const purple=new THREE.Color(BEN.color);
    ben.group.traverseVisible(mesh=>{if(!mesh.isMesh)return;
      if(mesh.material.color?.getHex()===BEN.color)robe=true;
      const color=mesh.geometry.attributes.color;if(color)for(let i=0;i<color.count&&!robe;i++)
        robe=Math.abs(color.getX(i)-purple.r)+Math.abs(color.getY(i)-purple.g)+Math.abs(color.getZ(i)-purple.b)<1e-5;});
    assert.ok(robe,'His actual mesh materials retain his purple robe');
    ben.group.updateMatrixWorld(true);const wandBefore=wand.getWorldQuaternion(new THREE.Quaternion());
    ally.action='windup';ally.progress=.8;
    for(let frame=0;frame<30;frame++)view.update(1/60,frame/60,state,new THREE.Vector3(0,7,6));
    ben.group.updateMatrixWorld(true);assert.ok(wand.getWorldQuaternion(new THREE.Quaternion()).angleTo(wandBefore)>.3,'The wand hand visibly raises to cast');
    state.fireballs=[{id:'ben-live-fireball',owner:BEN.id,x:2,y:8.2,z:1,yaw:Math.PI}];
    view.update(.016,1,state,new THREE.Vector3(0,7,6));
    const fire=view.fireball('ben-live-fireball');assert.ok(fire?.visible&&fire.parent===scene);
    assert.ok(visibleBounds(fire).meshes>=2&&visibleBounds(fire).bounds.max.y>8.3,'A real projectile mesh is visible above the ground');
    assert.deepEqual(fire.position.toArray(),[2,8.2,1]);
    state.fireballs[0].x=1;view.update(.016,1.1,state,new THREE.Vector3(0,7,6));assert.equal(fire.position.x,1,'Rendering follows authoritative flight');
    state.fireballs=[];view.update(.016,1.2,state,new THREE.Vector3(0,7,6));assert.equal(fire.parent,null,'Ended spells leave no floating effects');
  }finally{for(const[key,value]of Object.entries(previous)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}
});
