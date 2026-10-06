import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand } from '../src/gameplay/movement/game-state.js';
import { BODY, bodyWorld, stepToward } from '../src/gameplay/combat/bodies.js';
import { JESSE_WORKSHOP, CARRIAGE_PARTS, jesseWorkshopClear } from '../src/content/quests/jesse/jesse-carriage-world.js';

const { createWorld } = await sourceModule('../src/world.js');
const world = createWorld(new THREE.Scene());

test('Jesse workshop and loose carriage parts have cleared ground without forest trunks or scattered rocks',()=>{
  assert.ok(world.jesseCarriage);
  for(const tree of world.timberTrees) assert.equal(jesseWorkshopClear(tree.x,tree.z,2),false,
    `workshop and loose parts stay clear of ${tree.id}`);
  for(const collider of world.colliders.filter(c=>['region-tree','ridge-rock'].includes(c.kind)))
    assert.equal(jesseWorkshopClear(collider.x,collider.z,.5),false,`no scattered ${collider.kind} clips the work area`);
  for(const spot of [JESSE_WORKSHOP.stand,JESSE_WORKSHOP.horse,...CARRIAGE_PARTS])
    assert.ok(canStand(spot.x,spot.z,world,BODY.traveler),`usable lesson point ${spot.id??JSON.stringify(spot)}`);
  const bench=world.colliders.find(c=>c.kind==='jesse-workbench');assert.ok(bench);
  assert.equal(canStand(bench.x,bench.z,world,BODY.traveler),false,'the deliberately built bench remains solid');
});

test('all loose parts are reachable from Jesse and the completed carriage has a clear exit to the road',()=>{
  const at={...JESSE_WORKSHOP.stand},nav=bodyWorld(world).moving(at,BODY.traveler),stride=.14;
  for(const target of [...CARRIAGE_PARTS,JESSE_WORKSHOP.stand]) {
    let steps=0;while(Math.hypot(at.x-target.x,at.z-target.z)>.25&&steps++<900){
      stepToward(at,target,stride,nav,BODY.traveler);
      assert.ok(canStand(at.x,at.z,world,BODY.traveler));
    }
    assert.ok(Math.hypot(at.x-target.x,at.z-target.z)<.25,`can collect ${target.id??'return to Jesse'}`);
  }
  const a=JESSE_WORKSHOP.carriage,b=JESSE_WORKSHOP.join,steps=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)*4);
  for(let i=0;i<=steps;i++) assert.ok(canStand(a.x+(b.x-a.x)*i/steps,a.z+(b.z-a.z)*i/steps,world,1.2),'the cart can leave its workshop');
});
