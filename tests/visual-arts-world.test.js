import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { SYLVIA, SYLVIA_STUDIO } from '../src/visual-arts.js';
import { canStand } from '../src/game-state.js';

test('Sylvia paints outside a built cottage with a clear separate player easel',async()=>{
  const {createWorld}=await sourceModule('../src/world.js');const scene=new THREE.Scene(),world=createWorld(scene);
  assert.ok(scene.getObjectByName('Sylvia outdoor painting studio'));
  assert.ok(scene.getObjectByName('Sylvia painting easel'));assert.ok(scene.getObjectByName('Sylvia spare easel'));
  for(const name of ['Sylvia cottage grounded foundation','Sylvia cottage grounded doorstep']){
    const footing=scene.getObjectByName(name);assert.ok(footing);
    assert.ok(footing.userData.groundContacts.every(([x,y,z])=>y<world.heightAt(x,z)),'masonry reaches into the slope along the whole footing');
  }
  assert.equal(canStand(SYLVIA.x,SYLVIA.z,world),true,'Sylvia has a dry unobstructed stand');
  assert.equal(canStand(SYLVIA_STUDIO.stand.x,SYLVIA_STUDIO.stand.z,world),true,'player can stand at the spare easel');
  assert.ok(Math.hypot(SYLVIA.x-SYLVIA_STUDIO.stand.x,SYLVIA.z-SYLVIA_STUDIO.stand.z)>4,'talk prompt does not swallow the easel');
  const {createSylvia}=await sourceModule('../src/visual-arts-view.js');const actor=createSylvia();
  for(let i=0;i<60;i++)actor.animate(i/60,0,true,{});
  assert.ok(actor.artTools.active);const shoulder=actor.group.getObjectByName('Right Shoulder');const before=shoulder.rotation.x;
  for(let i=60;i<120;i++)actor.animate(i/60,0,true,{});
  assert.ok(Math.abs(shoulder.rotation.x-before)>.02,'the brush arm makes strokes');
  assert.equal(actor.artTools.brush.parent.name,'Right Wrist');assert.equal(actor.artTools.palette.parent.name,'Left Wrist');
  actor.animate(3,0,true,{action:'dead'});assert.equal(actor.artTools.active,false,'dead painter does not continue her work');
});
