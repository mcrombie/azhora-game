import test from 'node:test';
import assert from 'node:assert/strict';
import {SOUTH_OREMINDI_EXPEDITION as sites,SOUTH_OREMINDI_EXPEDITION_PATHS as paths,
 southOremindiExpeditionReserved} from '../src/content/regions/south-oremindi/south-oremindi-expedition.js';
import {southOremindiGround,southOremindiWaterAt} from '../src/content/regions/south-oremindi/south-oremindi-world.js';
import {groundWithRiver} from '../src/world/terrain/world-terrain.js';
import {moveCharacter} from '../src/gameplay/movement/game-state.js';
import {canWalkSlope} from '../src/gameplay/movement/climbing.js';
import {createSouthOremindiLifeHost} from '../src/content/regions/south-oremindi/south-oremindi-life-host.js';

const world={bounds:{minX:-10000,maxX:10000,minZ:-10000,maxZ:10000},heightAt:groundWithRiver,
 waterAt:(x,z)=>southOremindiWaterAt(x,z)??.45,colliders:[]};
function walk(a,b){
 const at={...a,y:world.heightAt(a.x,a.z)},n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.15);
 for(let i=1;i<=n;i++){
  const goal={x:a.x+(b.x-a.x)*i/n,z:a.z+(b.z-a.z)*i/n};
  moveCharacter(at,goal.x-at.x,goal.z-at.z,world,.34,{canTraverse:(x,z,nx,nz)=>canWalkSlope(x,z,nx,nz,world)});
  assert.ok(Math.hypot(at.x-goal.x,at.z-goal.z)<.005,`blocked at ${goal.x.toFixed(2)},${goal.z.toFixed(2)}`);
  at.y=world.heightAt(at.x,at.z);assert.equal(southOremindiWaterAt(at.x,at.z),null);
 }
}

test('Chapter 3 gathering and combat terrain is dry, reserved and uses real world ground',()=>{
 for(const [id,p]of Object.entries(sites)){
  assert.equal(southOremindiWaterAt(p.x,p.z),null,id);
  assert.ok(Math.abs(groundWithRiver(p.x,p.z)-p.height)<.05,id);
  assert.equal(groundWithRiver(p.x,p.z),southOremindiGround(p.x,p.z),id);
  for(let x=-p.radius;x<=p.radius;x+=3)for(let z=-p.radius;z<=p.radius;z+=3){
   if(Math.hypot(x,z)>p.radius||p.eastEdge&&p.x+x>p.eastEdge-3)continue;
   assert.ok(southOremindiExpeditionReserved(p.x+x,p.z+z,.6),id);
   assert.equal(southOremindiWaterAt(p.x+x,p.z+z),null,id);
  }
 }
 const p=sites.highground,upper=world.heightAt(p.x,p.z-12),lower=world.heightAt(p.x,p.z+28);
 assert.ok(upper-lower>=2&&upper-lower<=3,`archer advantage ${upper-lower}`);
 for(const site of [sites.ambush,sites.highground]){
  walk({x:site.x,z:site.z-site.radius+3},{x:site.x,z:site.z+site.radius-3});
  walk({x:site.x-site.radius+3,z:site.z},{x:site.x+site.radius-3,z:site.z});
 }
});

test('ranger, refuge and shoulder connectors are traversable on ordinary movement rules',()=>{
 for(const path of paths)for(let i=1;i<path.points.length;i++)walk(path.points[i-1],path.points[i]);
 walk({x:sites.refuge.x,z:sites.refuge.z+18},{x:sites.refuge.x,z:sites.refuge.z+13});
});

const settle=()=>new Promise(resolve=>setImmediate(resolve));
test('mountain wildlife is loaded only for a ready active mountain visit and respects pause/disposal',async()=>{
 let loads=0,created=0,disposed=0,ready=false,region=16,resolve;
 const calls=[],fakeWorld={regionAt:()=>({id:region}),loading:{isReady:()=>ready}};
 const host=createSouthOremindiLifeHost({},fakeWorld,{load:()=>{loads++;return new Promise(r=>resolve=r);}});
 host.update(0,.1,{x:0,z:0});assert.equal(loads,0);
 region=37;host.update(1,.1,{x:0,z:0});assert.equal(loads,0);
 ready=true;host.update(2,0,{x:0,z:0});assert.equal(loads,0);
 host.update(3,.1,{x:0,z:0});host.update(4,.1,{x:0,z:0});assert.equal(loads,1);
 resolve({createSouthOremindiLife(){created++;return{update:(...args)=>calls.push(args),state:()=>({animals:{creatures:[]}}),dispose:()=>disposed++};}});
 await settle();assert.equal(created,1);assert.equal(host.state().loaded,true);
 host.update(5,0,{x:10,z:10});assert.equal(calls.at(-1)[1],0,'pause is passed through, never replaced with elapsed time');
 host.dispose();host.dispose();host.update(6,.1,{x:0,z:0});assert.equal(disposed,1);assert.equal(calls.length,1);
});

test('leaving during an outstanding wildlife import cannot create orphan actors',async()=>{
 let create=0,resolve;
 const host=createSouthOremindiLifeHost({}, {regionAt:()=>({id:37}),loading:{isReady:()=>true}},
  {load:()=>new Promise(r=>resolve=r)});
 host.update(0,.1,{x:0,z:0});host.dispose();
 resolve({createSouthOremindiLife(){create++;}});await settle();
 assert.equal(create,0);assert.equal(host.state().loaded,false);
});
