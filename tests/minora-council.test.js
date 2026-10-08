import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule} from './module-loader.js';
import {MINORA_COUNCIL,councilSpawn,councilPerson} from '../src/content/regions/minora-frontier/minora-council.js';
import {createCouncilState,councilInfluence,validCouncilSave} from '../src/app/exploration/council-state.js';
import {createTowerState,validTowerState} from '../src/app/exploration/tower-state.js';
import {createWorldWar} from '../src/app/exploration/world-war.js';
import {WAR_LOADING_PASSAGES} from '../src/app/exploration/loading-lore.js';
const THREE=await sourceModule('../vendor/three.module.js');
const {createTowerWorld}=await sourceModule('../src/app/exploration/tower-world.js');
const {createCouncilGates}=await sourceModule('../src/content/regions/minora-frontier/council-gates.js');
const {canStand}=await sourceModule('../src/gameplay/movement/locomotion.js');
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
   assert(world.state().bounds.maxX-world.state().bounds.minX>28);assert(!world.state().exteriorLoaded);
 }
 world.show(true);assert.deepEqual(world.state().occupants,['Taleth']);world.dispose();
});
test('all four city gates put the leading office at the highest central position',()=>{
 const scene=new THREE.Scene(),gates=createCouncilGates(scene,()=>21.3);
 for(const leader of ['taleth','mayor','temple']){gates.update(leader);const s=gates.state();assert.equal(s.gates.length,4);for(const g of s.gates){const top=g.standards.find(s=>s.id===leader);assert.equal(top.x,0);assert(g.standards.filter(s=>s!==top).every(s=>s.y<top.y));}}
 gates.dispose();assert.equal(scene.children.length,0);
});
test('loading passages keep established history and introduce all three council offices',()=>{
 const text=WAR_LOADING_PASSAGES.map(p=>p.text).join(' ');assert.match(text,/Cedric/);assert.match(text,/West Lizeem/);assert.match(text,/East Lizeem/);assert.match(text,/Ishkur Vey/);assert.match(text,/Haldor Sorn/);assert.match(text,/Taleth/);
});
