import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule} from './module-loader.js';
import * as THREE from '../vendor/three.module.js';
import {TOWER} from '../src/app/exploration/tower-state.js';
import {guildExhibitTarget} from '../src/content/regions/minora-frontier/guild-exhibits.js';
const {mirrorPerspective}=await sourceModule('../src/world/scenery/planar-mirror.js');
const {createWarHero}=await sourceModule('../src/app/exploration/afterlife-form.js');
const {createGuildDisguise}=await sourceModule('../src/app/exploration/guild-disguise.js');

test('the mirror is used from its silvered side, not through the backing',()=>{
  const context={room:'tower',mode:'playing'};
  assert.equal(guildExhibitTarget({x:8,y:21.6,z:3.3},context)?.id,'borrow-face');
  assert.notEqual(guildExhibitTarget({x:8,y:21.6,z:8},context)?.id,'borrow-face');
});

test('mirror reflects an angled viewpoint and clips geometry behind the glass',()=>{
  const pane=new THREE.Object3D(),viewer=new THREE.PerspectiveCamera(55,1.5,.1,100),camera=new THREE.PerspectiveCamera(),uv=new THREE.Matrix4();
  viewer.position.set(1,2,5);viewer.lookAt(0,1,0);
  assert.equal(mirrorPerspective(camera,viewer,pane,uv),true);
  assert.ok(camera.position.distanceTo(new THREE.Vector3(1,2,-5))<1e-8);
  for(const x of [-1,0,1]){
    const visible=new THREE.Vector3(x,1,1).project(camera),behind=new THREE.Vector3(x,1,-1).project(camera);
    assert.ok(visible.z>=-1&&visible.z<=1);assert.ok(behind.z<-1);
  }
  const centre=new THREE.Vector4(0,0,0,1).applyMatrix4(uv);assert.ok(centre.w>0);
  viewer.position.z=-2;assert.equal(mirrorPerspective(camera,viewer,pane,uv),false);
});

test('elf and goblin change only the visible rig and restore the original hero',()=>{
  const actor=createWarHero({garment:'robe',hairStyle:'long-tied',headgear:'bare',facialHair:'clean'}),disguise=createGuildDisguise(actor);
  const original=actor.group.children[0];actor.group.position.set(20,30,40);actor.group.scale.set(1.1,1.2,1.1);
  const position=actor.group.position.clone(),scale=actor.group.scale.clone();
  try{
    for(const kind of ['elf','goblin','mask','elf','goblin']){
      assert.equal(disguise.borrow(kind),true);assert.equal(disguise.state().appearance,kind);
      assert.equal(actor.form,'living');assert.ok(actor.group.position.equals(position));assert.ok(actor.group.scale.equals(scale));
      assert.equal(original.visible,kind==='mask');
      const body=actor.group.getObjectByName('Borrowed '+kind+' appearance');
      if(kind==='elf')assert.equal(body.getObjectByName('Head').userData.elven,true);
      disguise.update('tower',{x:TOWER.x+8,y:TOWER.y+21.6,z:TOWER.z+3},.04);
      assert.ok(disguise.active());
    }
    assert.equal(disguise.borrow('unknown'),false);assert.equal(disguise.state().appearance,'goblin');
    disguise.restore();assert.equal(original.visible,true);assert.equal(actor.group.children.length,1);
    disguise.borrow('elf');disguise.update('tower',{x:TOWER.x,y:TOWER.y+10.8,z:TOWER.z},.04);
    assert.equal(disguise.active(),false);assert.equal(original.visible,true);assert.equal(actor.group.children.length,1);
    disguise.borrow('goblin');actor.setForm('ghost');disguise.update('tower',{x:TOWER.x,y:TOWER.y+21.6,z:TOWER.z},.04);
    assert.equal(disguise.active(),false);assert.equal(actor.form,'ghost');
  }finally{disguise.dispose();actor.dispose();}
});
