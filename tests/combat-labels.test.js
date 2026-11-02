import test from 'node:test';
import assert from 'node:assert/strict';
import {enemyLabelPlan,alliedLabelPlan} from '../src/app/exploration/combat-labels.js';
import {sourceModule} from './module-loader.js';
const THREE=await sourceModule('../vendor/three.module.js');
const {createLeagueStandards}=await sourceModule('../src/world/scenery/league-standards.js');
const actor=(id,x,extra={})=>({id,x,z:0,hp:100,maxHp:100,phase:'advance',...extra});

test('field labels prioritize the locked target and threats while suppressing distant clutter',()=>{
  const state={hero:{x:0,z:0,focusId:9},squad:{},guards:[...Array.from({length:12},(_,i)=>actor(i,i+1)),actor(20,40)]};
  state.guards[3].phase='windup';state.guards[3].targetId=-1;
  const before=structuredClone(state),locked=enemyLabelPlan(state);
  assert.equal(locked.primary,9);assert.equal(locked.visible.size,4);assert.ok(locked.visible.has(3));assert.ok(!locked.visible.has(20));
  assert.deepEqual(state,before,'Presentation never alters combat');
  state.hero.focusId=null;assert.equal(enemyLabelPlan(state).primary,3);
  state.guards[3].hp=0;assert.ok(!enemyLabelPlan(state).visible.has(3));
  state.hero.x=100;assert.equal(enemyLabelPlan(state).visible.size,0);
});

test('allies show a nearby captain and only the most wounded nearby soldiers',()=>{
  const state={hero:{x:0,z:0},allies:[actor(1,2),actor(2,5,{commanderId:'captain'}),actor(3,3,{hp:80}),actor(4,4,{hp:60}),actor(5,5,{hp:40}),actor(6,40,{hp:10})]};
  const plan=alliedLabelPlan(state);assert.equal(plan.captain,2);assert.deepEqual([...plan.visible].sort(),[2,4,5]);
  state.allies[1].departed=true;assert.equal(alliedLabelPlan(state).captain,null);
});

test('only standards obstructing the player fade and regain their original materials afterward',()=>{
  const scene=new THREE.Group(),flags=createLeagueStandards(scene,()=>0,[[0,5],[30,5],[0,-10]]);
  const camera=new THREE.PerspectiveCamera();camera.position.set(.5,6,10);const hero={x:.5,y:0,z:0};
  flags.updateCamera(camera,hero);assert.equal(flags.state().faded,1);assert.equal(scene.children[0].material.opacity,.12);
  assert.equal(scene.children[1].material.opacity,1);assert.equal(scene.children[2].material.opacity,1);
  flags.setColor('#ab3f38');assert.equal(flags.state().color,'#ab3f38');
  camera.position.x=20;flags.updateCamera(camera,hero);assert.equal(flags.state().faded,0);
  assert.ok(scene.children.every(m=>m.material.opacity===1&&m.material.depthWrite&&!m.material.transparent));
});
