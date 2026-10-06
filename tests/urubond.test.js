import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sourceModule} from './module-loader.js';
import {scopedWorld} from './scoped-world.js';
import {URUBOND,URUBOND_ROUTE,urubondOwns} from '../src/content/regions/urubond/urubond-world.js';
import {regions,landDistance} from '../src/world/terrain/region-world.js';
import {createCartography} from '../src/ui/map/cartography.js';
import {createBarrettGeography} from '../src/content/quests/skill-lessons/barrett-geography.js';
import {canStand,moveCharacter} from '../src/gameplay/movement/game-state.js';
import {BODY,bodyWorld} from '../src/gameplay/combat/bodies.js';
const THREE=await sourceModule('../vendor/three.module.js');
const {createUrubondWalk,URUBOND_ROOMS,URUBOND_WALLS}=await sourceModule('../src/content/regions/urubond/urubond-interiors.js');
const {createUrubondHost}=await sourceModule('../src/content/regions/urubond/urubond-host.js');
const scene=new THREE.Scene(),world=await scopedWorld(scene,[117]);

test('Urubond is an irregular offshore country shared by chart, developer travel and real terrain',()=>{
 const atlas=JSON.parse(readFileSync(new URL('../assets/azhora-dev-regions.json',import.meta.url))).regions.find(r=>r.name==='Urubond');
 assert.equal(atlas.cells.length,21);assert.equal(regions.find(r=>r.name==='Urubond').id,117);
 assert.equal(world.regionAt(URUBOND.x,URUBOND.z).name,'Urubond');
 assert.ok(world.heightAt(URUBOND.x+50,URUBOND.z)>280);
 assert.ok(world.heightAt(URUBOND.x,URUBOND.z)<230,'a hollow caldera, not a solid cone');
 assert.ok(world.heightAt(URUBOND.x,URUBOND.z)>190);
 assert.ok(world.urubondScenery.metrics.rocks>100);
 assert.equal(world.urubondScenery.metrics.characters,0);assert.equal(world.urubondScenery.metrics.wildlife,0);
 assert.ok(!scene.getObjectByName('Urubond: the fortress beneath the island'),'interior is not built at startup');
});

test('the full volcanic ledge route has continuous displayed footing and reaches the secret cleft on foot',()=>{
 const at={...URUBOND_ROUTE[0],y:world.heightAt(URUBOND_ROUTE[0].x,URUBOND_ROUTE[0].z)},moving=bodyWorld(world).moving(at,BODY.traveler);
 let maxGrade=0;
 for(const goal of URUBOND_ROUTE.slice(1)){
  let steps=0;while(Math.hypot(goal.x-at.x,goal.z-at.z)>.01){
   assert.ok(++steps<1000);const old={...at},d=Math.hypot(goal.x-at.x,goal.z-at.z),s=Math.min(.3,d);
   moveCharacter(at,(goal.x-at.x)/d*s,(goal.z-at.z)/d*s,moving,BODY.traveler);
   const travelled=Math.hypot(at.x-old.x,at.z-old.z);assert.ok(travelled>.005,`blocked at ${JSON.stringify(at)}`);
   at.y=world.heightAt(at.x,at.z);maxGrade=Math.max(maxGrade,Math.abs(at.y-old.y)/travelled);
   assert.ok(at.y>1&&urubondOwns(at.x,at.z));assert.ok(Math.abs(at.y-world.renderedGroundHeight(at.x,at.z))<.01);
  }
 }
 assert.ok(maxGrade<.8,`maximum route grade ${maxGrade}`);assert.ok(landDistance(at.x,at.z)>50);
});

test('ordinary geography cannot reveal the island but personal exploration can',()=>{
 const cartography=createCartography();cartography.learn();assert.equal(cartography.hear('Urubond').ok,false);assert.equal(cartography.named('Urubond'),false);
 const geography=createBarrettGeography({cartography,regions:[{name:'Urubond'},{name:'Drent'}],random:()=>0});
 assert.equal(geography.ask(0).region,'Drent');assert.equal(geography.ask(120).region,'Drent');
 assert.equal(cartography.named('Urubond'),false);cartography.noteHex('Urubond');assert.equal(cartography.named('Urubond'),true);
});

test('all underground halls are connected by real walking corridors and retained walls block escape',()=>{
 const walk=createUrubondWalk(),key=(x,z)=>`${x},${z}`,seen=new Set(),queue=[[0,148]];
 // Two-metre flood-fill through actual collision, then check every chamber.
 for(let i=0;i<queue.length;i++){const [x,z]=queue[i];if(seen.has(key(x,z)))continue;seen.add(key(x,z));
  for(const [dx,dz]of [[2,0],[-2,0],[0,2],[0,-2]]){const p=walk.toWorld({x:x+dx,z:z+dz});if(!seen.has(key(x+dx,z+dz))&&walk.canStand(p.x,p.z))queue.push([x+dx,z+dz]);}
  assert.ok(seen.size<50000);
 }
 for(const r of URUBOND_ROOMS)assert.ok([...seen].some(k=>{const [x,z]=k.split(',').map(Number);return Math.abs(x-r.x)<4&&Math.abs(z-r.z)<4;}),r.name);
 const p={...walk.spawn};walk.move(p,50,0);assert.ok(p.x<URUBOND.x+8,'entrance walls retain the traveler');
 assert.ok(URUBOND_WALLS.length>200);assert.equal(walk.floorAt(URUBOND.x+300,URUBOND.z),null);
 for(const pitch of [-.8,-.3,0,.6]){const camera=walk.camera(walk.spawn,0,pitch);assert.ok(camera.target.y>=walk.spawn.y+.25,'looking upward cannot put the camera below the floor');}
});

test('the sole entry requires the crater cleft, lazily builds rooms and exits safely',()=>{
 const player={group:new THREE.Group()};player.group.position.set(URUBOND.x,world.heightAt(URUBOND.x,URUBOND.z),URUBOND.z);
 const host=createUrubondHost({scene,world,player});assert.equal(host.nearby(),null);assert.equal(host.interact(),false);
 const e=URUBOND.entrance;player.group.position.set(e.x,world.heightAt(e.x,e.z+2),e.z+2);
 assert.equal(host.nearby().kind,'entrance');assert.equal(host.interact(),true);assert.equal(host.active,true);
 assert.ok(player.group.position.y<0);assert.ok(host.safeEntrance.y>200);
 const exit=host.interior.walk.exit;player.group.position.set(exit.x,exit.y,exit.z);assert.equal(host.interact(),true);
 assert.equal(host.active,false);assert.equal(host.interior.group.visible,false);assert.ok(canStand(player.group.position.x,player.group.position.z,world));
});
