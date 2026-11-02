import test from 'node:test';
import assert from 'node:assert/strict';
import {createTowerState,validTowerState,TOWER,TOWER_SPAWN,TOWER_EXIT,TOWER_DOOR,TALETH_SPOT} from '../src/app/exploration/tower-state.js';
import {createWorldWar} from '../src/app/exploration/world-war.js';
import {validateWorldWarSave,WORLD_WAR_KEY,worldWarStore} from '../src/app/exploration/war-checkpoint.js';
import {MODES,allowsRegion} from '../src/app/exploration/modes.js';
import {sourceModule} from './module-loader.js';
import {MENORA_BUILDINGS} from '../src/content/regions/minora-frontier/menora-city.js';
const {createTowerHost}=await sourceModule('../src/app/exploration/tower-host.js');

const checkpoint=()=>({format:WORLD_WAR_KEY,version:1,...createWorldWar().checkpoint(),
  exploration:{version:1,character:'teresod',position:TOWER_SPAWN,heading:Math.PI,camera:{yaw:0,pitch:.27,distance:8},elapsed:0,cells:[]}});
test('briefing locks departure, starts once, and survives repeat visits and restores',()=>{
  const state=createTowerState();assert(state.inside);assert(!state.leave());assert(!state.briefed);
  assert(state.begin());assert(!state.begin());assert(state.leave());state.enter();
  const restored=createTowerState({...checkpoint(),tower:state.snapshot(true)});
  assert(restored.inside);assert(restored.briefed);assert(restored.snapshot().running);assert(!restored.begin());assert(restored.leave());
});
test('legacy campaigns remain outdoors and keep all campaign history',()=>{
  const war=createWorldWar();war.advance(4);const data={...checkpoint(),...war.checkpoint()};
  const opening=createTowerState(data);assert(opening.briefed);assert(!opening.inside);assert(!opening.begin());
  assert(validateWorldWarSave(data));assert.deepEqual(createWorldWar(data).snapshot(),war.snapshot());
});
test('tower save schema rejects malformed locks and preserves the previous valid save',()=>{
  const data={...checkpoint(),tower:createTowerState().snapshot(false)};
  assert(validateWorldWarSave(data));let raw=JSON.stringify(data);
  const store=worldWarStore({getItem:()=>raw,setItem:(key,value)=>{raw=value;}});
  for(const invalid of [{...data.tower,version:2},{...data.tower,location:'elsewhere'},{...data.tower,running:true},{...data.tower,location:'world'},{...data.tower,briefed:'yes'}]){
    assert(!validTowerState(invalid));assert(!store.save({...data,tower:invalid}).ok);assert.deepEqual(store.read().data,data);
  }
});
test('room navigation, door anchoring and world restriction match the authored tower',async()=>{
  const THREE=await sourceModule('../vendor/three.module.js');
  const {createTowerWorld}=await sourceModule('../src/app/exploration/tower-world.js');
  const {canStand}=await sourceModule('../src/gameplay/movement/locomotion.js');
  const {explorationMovement}=await sourceModule('../src/app/exploration/movement.js');
  const world=await createTowerWorld(new THREE.Scene(),()=>{},{inside:true,enabledRegions:MODES.war.regions});
  assert(!world.state().exteriorLoaded,'Opening the chamber must not build the world');
  const tower=MENORA_BUILDINGS.find(b=>b.kind==='sorcerers-tower');assert.equal(tower.x,TOWER.x);assert.equal(tower.z,TOWER.z);
  assert(TOWER_EXIT.z>tower.z+tower.depth/2+1,'Exit clears the existing tower collider');
  const position=new THREE.Vector3(TOWER_SPAWN.x,TOWER_SPAWN.y,TOWER_SPAWN.z),move=explorationMovement(position,world);
  for(let i=0;i<100;i++)move.step(new Set(['KeyW']),0,.02);
  assert(position.z<TOWER_SPAWN.z-6,'Player can reach Taleth without furniture blocking the aisle');
  for(const yaw of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
    position.set(TOWER_SPAWN.x,TOWER_SPAWN.y,TOWER_SPAWN.z);move.reset();
    for(let i=0;i<800;i++){if(i%100===0)move.jump();move.step(new Set(['KeyW','ShiftLeft']),yaw,.02);}
    assert(world.canExploreAt(position.x,position.z));assert(canStand(position.x,position.z,world));
  }
  assert.deepEqual(world.state().occupants,['Taleth']);
  assert.deepEqual(MODES.war.regions,[16,17,25,13,14]);assert(!allowsRegion(MODES.war,21));assert(allowsRegion(MODES.explore,21));
  world.dispose();
});

// A small DOM adapter exercises the real dialogue handlers and tower progress.
// Native checks separately verify layout, keyboard focus and the 3D door.
function towerDialogue(t,{side=null,required=true,briefed=false,accept=true}={}){
  const previous=globalThis.document;
  const doc={activeElement:null};
  class Element{
    constructor(){this.children=[];this.parent=null;this.hidden=false;this.disabled=false;this.dataset={};this.attributes={};this.style={};this.textContent='';}
    set innerHTML(html){this.children=[];for(const match of html.matchAll(/<\w+\b[^>]*\bid="([^"]+)"[^>]*>/g)){const child=new Element();child.id=match[1];child.hidden=/\bhidden\b/.test(match[0]);this.append(child);}}
    append(...nodes){for(const node of nodes){node.parent=this;this.children.push(node);}}
    querySelector(selector){const id=selector.slice(1);for(const child of this.children){if(child.id===id)return child;const found=child.querySelector(selector);if(found)return found;}return null;}
    setAttribute(key,value){this.attributes[key]=String(value);}
    before(node){node.parent=this.parent;this.parent.children.splice(this.parent.children.indexOf(this),0,node);}
    after(node){node.parent=this.parent;this.parent.children.splice(this.parent.children.indexOf(this)+1,0,node);}
    remove(){if(this.parent)this.parent.children=this.parent.children.filter(node=>node!==this);}
    focus(){doc.activeElement=this;}
  }
  doc.body=new Element();doc.createElement=()=>new Element();globalThis.document=doc;
  let mode='playing',begun=0,departed=0,attempts=0;const notices=[];
  const tower=createTowerState();if(briefed)tower.begin();
  const position={...TALETH_SPOT,y:TOWER.y};
  const host=createTowerHost({state:()=>tower,position,mode:()=>mode,setMode:value=>{mode=value;},notice:value=>notices.push(value),onBegin:()=>begun++,onDoor:()=>{departed++;tower.leave();},
    campaignSide:()=>side,campaignChoiceRequired:()=>required&&!side,
    onChooseCampaignSide:value=>{attempts++;if(!accept)return{ok:false,reason:'Choice could not be saved.'};side=value;return{ok:true};}});
  t.after(()=>{host.dispose();if(previous===undefined)delete globalThis.document;else globalThis.document=previous;});
  return{host,tower,position,notices,button:id=>doc.body.querySelector('#'+id),state:()=>({mode,side,begun,departed,attempts}),talk(){Object.assign(position,TALETH_SPOT);return host.interact();},door(){Object.assign(position,TOWER_DOOR);return host.interact();}};
}

test('Taleth permits undecided exploration and blocks departure and accidental start',t=>{
  const f=towerDialogue(t);assert(f.door());assert.equal(f.state().departed,0);assert.match(f.notices.at(-1),/decide which league/);
  assert(f.talk());assert(f.button('tower-next').disabled);assert.equal(f.button('tower-close').textContent,'Explore the tower');
  f.button('tower-next').onclick();assert.equal(f.state().attempts,0);assert(!f.tower.briefed);
  f.button('tower-allegiance-east').onclick();assert(!f.button('tower-next').disabled);assert.match(f.button('tower-next').textContent,/East Lizeem/);
  f.button('tower-close').onclick();assert.equal(f.state().mode,'playing');assert.equal(f.state().side,null);assert(!f.tower.briefed);
  assert(f.door());assert.equal(f.state().departed,0);
  f.host.restore();assert(f.talk());assert(f.button('tower-next').disabled,'A restored undecided checkpoint does not inherit tentative UI selection');
});

for(const side of ['west','east'])test(`${side} Taleth allegiance confirms once before the normal tower departure`,t=>{
    const f=towerDialogue(t);assert(f.talk());f.button('tower-allegiance-'+side).onclick();
    assert.equal(f.state().side,null,'Selecting alone does not begin a campaign');
    f.button('tower-next').onclick();assert.equal(f.state().side,side);assert(f.tower.briefed);assert.equal(f.state().begun,1);assert.equal(f.state().mode,'playing');
    f.button('tower-next').onclick();assert.equal(f.state().begun,1);assert.equal(f.state().attempts,1);
    assert(f.door());assert.equal(f.state().departed,1);
});

test('a rejected allegiance cannot unlock the tower door',t=>{
  const rejected=towerDialogue(t,{accept:false});rejected.talk();rejected.button('tower-allegiance-west').onclick();rejected.button('tower-next').onclick();
  assert(!rejected.tower.briefed);assert.equal(rejected.state().begun,0);assert.equal(rejected.state().mode,'briefing');assert.match(rejected.notices.at(-1),/could not be saved/);
});

test('an existing begun campaign does not repeat Taleth allegiance or lock the tower',t=>{
  const legacy=towerDialogue(t,{briefed:true});legacy.talk();assert(legacy.button('tower-allegiance').hidden);assert(!legacy.button('tower-next').disabled);legacy.button('tower-close').onclick();assert(legacy.door());assert.equal(legacy.state().departed,1);
});
