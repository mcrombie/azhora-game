import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule} from './module-loader.js';
import {WEST_OREMINDI_CELLS as cells,WEST_OREMINDI_PATHS as paths,WEST_OREMINDI_PEAKS as peaks,westOremindiGround as ground,westOremindiOwns as owns,westOremindiCellAt,SEVRON_ENTRANCES as entrances} from '../src/content/regions/west-oremindi/west-oremindi-world.js';
import {WEST_OREMINDI_WILDLIFE_ZONES as zones} from '../src/content/regions/west-oremindi/west-oremindi-wildlife.js';
import {canWalkSlope,createClimbing,sampleClimbSurface} from '../src/gameplay/movement/climbing.js';
import {moveCharacter} from '../src/gameplay/movement/game-state.js';
import {createSevronState} from '../src/content/regions/sevron/sevron-state.js';
const THREE=await import('../vendor/three.module.js');
const {createWestOremindiScenery}=await sourceModule('../src/content/regions/west-oremindi/west-oremindi-scenery.js',import.meta.url);
const {createSevronWalk,buildSevronInterior}=await sourceModule('../src/content/regions/sevron/sevron-interiors.js',import.meta.url);
const {createSevronHost,WEST_OREMINDI_ENCOUNTERS}=await sourceModule('../src/content/regions/sevron/sevron-host.js',import.meta.url);

test('West Oremindi builds its exact 38 authored hexes and leaves neighbouring heights unchanged',()=>{
 assert.equal(cells.length,38);assert.equal(cells.filter(c=>c.terrain==='high_mountain').length,28);
 assert.deepEqual([...new Set(cells.map(c=>c.climate))].sort(),['Dfb','Dwd','EF','ET']);
 assert.equal(ground(0,0,72),72);for(const p of peaks)assert.ok(ground(p.x,p.z)>220);
 for(const e of entrances)assert.ok(owns(e.x,e.z)&&ground(e.x,e.z)>20);
});
test('each mountain approach is continuous and its centreline can be walked in both directions',()=>{
 for(const path of paths){let worst=0;
 for(let i=1;i<path.points.length;i++){const a=path.points[i-1],b=path.points[i],d=Math.hypot(b.x-a.x,b.z-a.z),n=Math.ceil(d/.5);let last=null;
 for(let j=0;j<=n;j++){const t=j/n,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;if(!owns(x,z))continue;const y=ground(x,z);if(last)worst=Math.max(worst,Math.abs(y-last)/(d/n));last=y;}}
 assert.ok(worst<1.1,`${path.id} maximum grade ${worst}`);
 }
});
test('resident ground animals inhabit forest and alpine shelves, with sparse eagle airspace',()=>{
 assert.ok(zones.length>=20);assert.ok(zones.some(z=>z.species==='red-deer'));assert.ok(zones.some(z=>z.species==='oremindi-snowgoat'));assert.ok(zones.some(z=>z.species==='oremindi-mountain-eagle'));
 for(const zone of zones)for(const [x,z]of zone.sites){assert.ok(owns(x,z));assert.ok(Number.isFinite(ground(x,z)));}
});
test('the actual western massif supports stamina climbing and physical release',()=>{
 const world={heightAt:ground,waterAt:()=>.06,colliders:[],regionAt:()=>({id:56,name:'West Oremindi Mountains'}),bounds:{minX:-4000,maxX:-3000,minZ:-1700,maxZ:-700}};
 let climb=null,start=null;
 for(let x=-3510;x<=-3330&&!climb;x+=6)for(let z=-1390;z<=-1000&&!climb;z+=6){
  if(!owns(x,z))continue;const face=sampleClimbSurface(world,x,z);if(face.slope<1.1||face.slope>2.8)continue;
  const candidate=createClimbing({world}),p={x,z,y:ground(x,z)},yaw=Math.atan2(ground(x+.5,z)-ground(x-.5,z),ground(x,z+.5)-ground(x,z-.5));
  if(candidate.grab(p,yaw,{stamina:100})){climb=candidate;start=p;}
 }
 assert.ok(climb,'the massif has a real climbable face');let result;for(let i=0;i<20;i++)result=climb.tick(.05,{playing:true,up:1,stamina:100});
 assert.ok(result.position.y>start.y+1);assert.ok(result.staminaSpent>0);climb.release();result=climb.tick(.05,{playing:true,stamina:100});assert.equal(result.phase,'falling');assert.ok(result.position.y>start.y,'releasing does not teleport to low terrain');
});
test('Sevron has real returnable floors above sea level with a closed flood basin and hidden store',()=>{
 let open=false;const w=createSevronWalk({secretOpen:()=>open}),p={...w.spawn};
 function go(x,z){const to=w.toWorld({x,z});w.move(p,to.x-p.x,to.z-p.z);assert.ok(Math.hypot(p.x-to.x,p.z-to.z)<.25,`could not reach ${x},${z}: ${JSON.stringify(p)}`);}
 go(0,28);go(30,28);go(30,-32);go(0,-32);go(0,-57);assert.equal(p.y,14);go(0,-60);go(-45,-60);go(-45,-72);go(-45,-60);go(0,-60);go(0,-57);go(0,-32);go(30,-32);go(30,10);
 assert.equal(w.floorAt(w.origin.x,w.origin.z),null);assert.equal(w.waterAt(w.origin.x,w.origin.z,8),null);assert.equal(w.waterAt(w.origin.x,w.origin.z,-1),.06);
 const goal=w.toWorld({x:55,z:10});w.move(p,goal.x-p.x,goal.z-p.z);assert.ok(p.x<w.origin.x+40);open=true;go(55,10);go(30,10);go(30,28);go(0,28);go(0,40);
 assert.equal(p.y,8);const view=w.camera(p,0,.4);assert.ok(view.target.y>=p.y);
});
test('Sevron discoveries restore atomically and ancient coins cannot be collected twice',()=>{
 const s=createSevronState();s.discoverEntrance();s.discoverCity();s.openSecret();assert.deepEqual(s.takeTreasure(),{item:'copper-piece',quantity:36});assert.equal(s.takeTreasure(),null);
 assert.ok(s.defeat('west-oremindi-pass-goblins'));const copy=s.snapshot(),r=createSevronState();assert.ok(r.restore(copy));assert.equal(r.takeTreasure(),null);assert.equal(r.restore({...copy,secretOpen:'yes'}),false);assert.deepEqual(r.snapshot(),copy);
 assert.ok(r.restore());assert.equal(r.state().cityDiscovered,false);
});
function hostFixture(){
 const scene=new THREE.Scene(),player={group:new THREE.Group()},rewards=[],dialogues=[],threats=[];let allowed=true,combat={phase:'peaceful'};
 const host=createSevronHost({scene,world:{heightAt:ground},player,toast:()=>{},openDialogue:(...args)=>dialogues.push(args),closeDialogue:()=>{},available:()=>allowed,reward:r=>rewards.push(r),onThreat:s=>{threats.push(s.id);combat={phase:'active',encounterId:s.id};return true;},combatState:()=>combat});
 return {host,scene,player,rewards,dialogues,threats,set allowed(v){allowed=v;},set combat(v){combat=v;},at:p=>player.group.position.set(p.x,p.y??ground(p.x,p.z),p.z)};
}
test('Sevron is lazy, each real entrance returns outdoors, and recovered coins survive portal reloads',()=>{
 const f=hostFixture();assert.equal(f.host.interior,null);f.allowed=false;assert.equal(f.host.enter(),false);assert.equal(f.host.interior,null);f.allowed=true;
 for(const e of entrances){assert.equal(f.host.enter(e.id),true);assert.equal(f.player.group.position.y,f.host.walk.toWorld(e.local).y);assert.equal(f.host.nearby().kind,'exit');assert.equal(f.host.interact(),true);assert.equal(f.host.active,false);assert.equal(f.player.group.position.y,ground(f.player.group.position.x,f.player.group.position.z));}
 f.host.enter('inspection-passage');f.at(f.host.walk.toWorld({x:56,z:10}));assert.equal(f.host.nearby().kind,'treasure');f.host.interact();f.host.interact();assert.deepEqual(f.rewards,[{item:'copper-piece',quantity:36}]);
 const saved=f.host.snapshot(),fresh=hostFixture();assert.equal(fresh.host.restore(saved),true);assert.equal(fresh.host.interior,null);fresh.host.enter('inspection-passage');fresh.at(fresh.host.walk.toWorld({x:56,z:10}));fresh.host.interact();assert.deepEqual(fresh.rewards,[]);
 assert.equal(fresh.host.restore({...saved,treasureTaken:'yes'}),false);assert.equal(fresh.host.active,true,'invalid restore does not eject the player or mutate a live city');
});
test('mountain goblin threats persist after victory and cannot appear in the inhabited galleries',()=>{
 const f=hostFixture(),encounter=WEST_OREMINDI_ENCOUNTERS[0];f.at(encounter.center);f.host.frame(.01);assert.deepEqual(f.threats,[encounter.id]);
 f.combat={phase:'won',encounterId:encounter.id};f.host.frame(.01);assert.deepEqual(f.host.snapshot().defeatedThreats,[encounter.id]);f.combat={phase:'peaceful'};f.host.frame(60);assert.equal(f.threats.length,1);
 f.host.enter();f.host.frame(60);assert.equal(f.threats.length,1);const fresh=hostFixture();fresh.host.restore(f.host.snapshot());fresh.at(encounter.center);fresh.host.frame(60);assert.deepEqual(fresh.threats,[]);
});

test('the batched mountain scenery registers species and real cave mouths, and Sevron builds lazily',()=>{
 const parent=new THREE.Group(),colliders=[];const start=performance.now();
 const scenery=createWestOremindiScenery({parent,heightAt:ground,renderedGroundHeight:ground,colliders});
 assert.ok(scenery.metrics.trees>30,JSON.stringify(scenery.metrics));assert.ok(scenery.trees.every(t=>t.species));
 for(const tree of scenery.trees){const climate=westOremindiCellAt(tree.x,tree.z).climate;assert.notEqual(climate,'EF');if(climate==='ET')assert.equal(tree.species,'common-juniper');}
 assert.equal(colliders.filter(c=>c.kind==='wall').length,3);
 const world={heightAt:ground,waterAt:()=>.06,regionAt:()=>({id:56,name:'West Oremindi Mountains'}),colliders,bounds:{minX:-5000,maxX:0,minZ:-2500,maxZ:0}};
 for(const points of [paths[0].points.slice(1),[...paths[0].points.slice(1)].reverse()]){
  const p={...points[0],y:ground(points[0].x,points[0].z)};
  for(const goal of points.slice(1)){const n=Math.ceil(Math.hypot(goal.x-p.x,goal.z-p.z)/.18),dx=(goal.x-p.x)/n,dz=(goal.z-p.z)/n;
   for(let i=0;i<n;i++){assert.ok(canWalkSlope(p.x,p.z,p.x+dx,p.z+dz,world),`steep approach at ${p.x},${p.z}`);moveCharacter(p,dx,dz,world);p.y=ground(p.x,p.z);}
   assert.ok(Math.hypot(p.x-goal.x,p.z-goal.z)<.2,`blocked approach ${p.x},${p.z} -> ${goal.x},${goal.z}`);
  }
 }

 const indoor=new THREE.Group(),built=buildSevronInterior(indoor);
 assert.equal(built.water.position.y,.06);assert.equal(built.walk.floorAt(built.walk.spawn.x,built.walk.spawn.z),8);
 assert.ok(indoor.children.length===1);assert.ok(built.group.children.some(o=>o.isPointLight));
 console.log('West Oremindi scenery metrics',JSON.stringify({...scenery.metrics,buildMs:Math.round(performance.now()-start)}));
});
