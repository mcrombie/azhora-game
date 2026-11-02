import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule} from './module-loader.js';
import {MINORA_COUNCIL,MAYOR_HALL,COUNCIL_CIVIC_TOPICS,councilSpawn,councilSavedPosition,councilPerson,councilDoor,createMayorHallSupport} from '../src/content/regions/minora-frontier/minora-council.js';
import {councilInteractionTarget} from '../src/app/exploration/council-host.js';
import {createCouncilState,councilInfluence,validCouncilSave} from '../src/app/exploration/council-state.js';
import {createTowerState,validTowerState} from '../src/app/exploration/tower-state.js';
import {createWorldWar} from '../src/app/exploration/world-war.js';
import {WAR_LOADING_PASSAGES} from '../src/app/exploration/loading-lore.js';
const THREE=await sourceModule('../vendor/three.module.js');
const {createTowerWorld}=await sourceModule('../src/app/exploration/tower-world.js');
const {createCouncilGates}=await sourceModule('../src/content/regions/minora-frontier/council-gates.js');
const {canStand,moveCharacter}=await sourceModule('../src/gameplay/movement/locomotion.js');
test('council influence follows recorded intervention, with the actual war winner taking precedence',()=>{
 const war=createWorldWar();war.advance(3);const b=war.snapshot().engagements[0];
 assert.equal(councilInfluence(war.snapshot()).leader,'taleth');war.syncRegion('Caricas');war.campaign.joinBattle(b.id,b.location);
 war.campaign.resolveEncounter(b.id,null,'withdraw','declined',0);
 assert.equal(councilInfluence(war.snapshot()).leader,'taleth');war.campaign.joinBattle(b.id,b.location);
 war.campaign.resolveEncounter(b.id,'west','withdraw','withdrew',0,{escaped:0});
 assert.equal(councilInfluence(war.snapshot()).leader,'mayor');
 assert.deepEqual(councilInfluence({...war.snapshot(),winner:'east'}),{leader:'temple',faction:'east',settled:true,reason:'war-result'});
});
test('talking opens only a saved peace placeholder and never changes the campaign',()=>{
 const state=createCouncilState();assert(!state.bothMet);assert(state.meet('mayor'));assert(!state.meet('mayor'));state.meet('temple');assert(state.bothMet);
 assert(createCouncilState(state.snapshot()).bothMet);assert(validCouncilSave(undefined));assert(!validCouncilSave({version:1,met:['mayor','mayor']}));
 const t=createTowerState();assert(!t.enter('temple'));t.begin();assert(t.enter('temple'));assert(t.inside);assert.equal(t.room,'temple');assert(validTowerState(t.snapshot()));assert(t.leave());
});
test('both interiors load independently, with navigable aisles and correctly restored room identity',async()=>{
 const world=await createTowerWorld(new THREE.Scene(),()=>{},{inside:true,room:'temple',enabledRegions:[16,17,25,13,14]});
 for(const id of ['temple','mayor']){
   world.show(id);assert.equal(world.state().room,id);assert.deepEqual(world.state().occupants,[MINORA_COUNCIL[id].name]);
   const start=councilSpawn(id),at=councilPerson(id);assert(canStand(start.x,start.z,world,.34));
   for(let z=start.z;z>at.z+1;z-=.25)assert(canStand(at.x,z,world,.34),'Central aisle is open');
   assert(Math.abs(world.state().bounds.maxX-world.state().bounds.minX-(MINORA_COUNCIL[id].width-1.2))<1e-7);assert(!world.state().exteriorLoaded);
 }
 world.show(true);assert.deepEqual(world.state().occupants,['Taleth']);world.dispose();
});

test('River Hall fits its city footprint and actual stairs lead from Assembly to office and back',async()=>{
 const room=MINORA_COUNCIL.mayor,at=councilPerson('mayor');
 assert.equal(room.width,16);assert.equal(room.depth,22);assert.equal(at.y,room.y+MAYOR_HALL.floorRise);
 const world=await createTowerWorld(new THREE.Scene(),()=>{},{inside:true,room:'mayor',enabledRegions:[16]});
 const p={...councilSpawn('mayor')},route=[[0,8],[-5.3,8],[-5.3,-7],[-2.8,-7],[-2.8,1],[1,1]];
 let time=0;
 function go([x,z]){
   const goal={x:room.x+x,z:room.z+z},distance=Math.hypot(goal.x-p.x,goal.z-p.z),steps=Math.ceil(distance/.1);
   const dx=(goal.x-p.x)/steps,dz=(goal.z-p.z)/steps;
   for(let i=0;i<steps;i++){
     world.update(time+=.016,.016,p);const before={...p};moveCharacter(p,dx,dz,world,.34);
     assert(Math.hypot(p.x-before.x-dx,p.z-before.z-dz)<1e-5,`Stair route blocked at ${JSON.stringify(before)} toward ${JSON.stringify(goal)}`);
     const support=world.supportAt(p.x,p.z,{maxY:p.y,stepUp:.45,groundSlope:false});
     assert(Math.abs(support.height-p.y)<.25,'Walking support must rise and fall continuously');p.y=support.height;
   }
 }
 for(const point of route)go(point);
 assert.equal(p.y,at.y);assert.deepEqual(councilInteractionTarget(p,{inside:true,room:'mayor'}),{id:'mayor',talk:true});
 for(const point of [...route].reverse().slice(1))go(point);go([0,5]);
 assert.equal(p.y,room.y);world.dispose();
});

test('office floors restore independently and interaction cannot reach through the ceiling',()=>{
 const r=MINORA_COUNCIL.mayor,p=councilPerson('mayor'),walks=createMayorHallSupport();
 assert.equal(walks.supportAt(p.x,p.z,{maxY:r.y,stepUp:.45}).height,r.y);
 const upper=walks.supportAt(p.x,p.z,{maxY:p.y,stepUp:.45});assert.equal(upper.height,p.y);
 assert.equal(walks.supportAt(p.x,p.z,{surfaceId:upper.id}).height,p.y);
 assert.equal(councilInteractionTarget({...p,y:r.y},{inside:true,room:'mayor'}),null);
 const door=councilDoor('mayor');assert.deepEqual(councilInteractionTarget(door,{inside:true,room:'mayor'}),{id:'mayor',enter:false});
 assert.equal(councilInteractionTarget({...door,y:p.y},{inside:true,room:'mayor'}),null);
});

test('public council topics explain the approved civic history and charitable duty without exposing temple reserves',()=>{
 const mayor=COUNCIL_CIVIC_TOPICS.mayor.map(t=>t.words).join(' '),temple=COUNCIL_CIVIC_TOPICS.temple.map(t=>t.words).join(' ');
 assert.match(mayor,/last King Vey ceded his crown/);assert.match(mayor,/Crefs/);assert.match(mayor,/Taleth, the king’s mentor/);
 assert.match(mayor,/Assembly elects the mayor/);assert.match(mayor,/private estates and rented properties/);
 assert.match(temple,/Shay a thousand years ago/);assert.match(temple,/goddess of the river and its fertility/);
 assert.match(temple,/civilian refugees from either league/);assert(!/sealed|reserve|30%|714/.test(temple));
});
test('all four city gates put the leading office at the highest central position',()=>{
 const scene=new THREE.Scene(),gates=createCouncilGates(scene,()=>21.3);
 for(const leader of ['taleth','mayor','temple']){gates.update(leader);const s=gates.state();assert.equal(s.gates.length,4);for(const g of s.gates){const top=g.standards.find(s=>s.id===leader);assert.equal(top.x,0);assert(g.standards.filter(s=>s!==top).every(s=>s.y<top.y));}}
 gates.dispose();assert.equal(scene.children.length,0);
});
test('loading passages keep established history and introduce all three council offices',()=>{
 const text=WAR_LOADING_PASSAGES.map(p=>p.text).join(' ');assert.match(text,/Cedric/);assert.match(text,/West Lizeem/);assert.match(text,/East Lizeem/);assert.match(text,/Ishkur Vey/);assert.match(text,/Haldor Sorn/);assert.match(text,/Taleth/);
});


test('legacy hall saves recover inside the corrected footprint while valid upstairs positions remain upstairs',()=>{
  const r=MINORA_COUNCIL.mayor;
  assert.deepEqual(councilSavedPosition('mayor',{x:r.x+12,y:r.y,z:r.z+14}),councilSpawn('mayor'));
  const upstairs={x:r.x+2,y:r.y+MAYOR_HALL.floorRise,z:r.z};
  assert.equal(councilSavedPosition('mayor',upstairs),upstairs);
  assert.equal(councilSavedPosition('temple',upstairs),upstairs);
});
