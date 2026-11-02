import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule} from './module-loader.js';
const THREE=await sourceModule('../vendor/three.module.js');
const {createYunethreHost}=await sourceModule('../src/content/chapters/yunethre/host.js');
const {initialYunethre}=await sourceModule('../src/content/chapters/yunethre/chapter.js');
const {CHAPTER_LOCATIONS}=await sourceModule('../src/content/chapters/yunethre/locations.js');
const {createCharacter,disposeCharacter}=await sourceModule('../src/content/characters/characters.js');
const {TRANSFORM}=await sourceModule('../src/world/terrain/region-world.js');

// This integration check does not draw dialogue. Supply just the element
// operations used while constructing/updating the real host and quest view.
class Element {
  constructor(){this.children=[];this.parts=new Map();this.dataset={};this.hidden=false;}
  append(...elements){this.children.push(...elements);}
  setAttribute(){}
  querySelector(key){if(!this.parts.has(key))this.parts.set(key,new Element());return this.parts.get(key);}
  querySelectorAll(){return this.children;}
  replaceChildren(...elements){this.children=elements;}
  click(){this.onclick?.();}
  focus(){}
  remove(){}
}

test('Minora occupation waits for the witnessed assault, then offers the bird and Chapter 3 continuation',async t=>{
  const prior=globalThis.document,raf=globalThis.requestAnimationFrame,elements=new Map();globalThis.document={body:new Element(),createElement:()=>new Element(),getElementById(id){if(!elements.has(id))elements.set(id,new Element());return elements.get(id);}};globalThis.requestAnimationFrame=f=>f();
  let mode='playing',complete,continued=false;const position={...CHAPTER_LOCATIONS.departure,y:0};
  const host=createYunethreHost({saved:{chapter:initialYunethre(),history:null},scene:new THREE.Group(),position,world:{heightAt:()=>0,readyAt:()=>true,regionAt:()=>({id:16})},towerState:()=>({inside:false,room:null}),mode:()=>mode,setMode:v=>mode=v,map:{setSimulation(){},setRegionScope(){}},onDirty(){},notice(){},onWitness:()=>new Promise(resolve=>complete=resolve),onContinueChapter:()=>continued=true});
  t.after(()=>{host.dispose();globalThis.document=prior;globalThis.requestAnimationFrame=raf;});
  for(const c of [{type:'brief'},{type:'depart'},{type:'advance',seconds:1200},{type:'visit',place:'town'},{type:'laketown-decision',decision:'decline'}])assert.equal(host.command(c).ok,true);
  assert.equal(host.interact(),true);assert.equal(host.choose('return'),true);assert.equal(host.state().returned,false,'opening the film does not prematurely occupy the provinces');
  complete(true);await Promise.resolve();await Promise.resolve();assert.equal(host.state().returned,true);assert.equal(host.conversation().id,'messenger');
  assert.ok(host.conversation().actions.includes('continue-chapter'));host.choose('continue-chapter');assert.equal(continued,true);
});

test('Celder consent confirms once and return passage actually travels for the stated time',async t=>{
  const old=Object.getOwnPropertyDescriptor(globalThis,'document'),raf=globalThis.requestAnimationFrame,elements=new Map();
  globalThis.document={body:new Element(),createElement:()=>new Element(),getElementById(id){if(!elements.has(id))elements.set(id,new Element());return elements.get(id);}};
  globalThis.requestAnimationFrame=callback=>callback();
  const place=CHAPTER_LOCATIONS.celder,position={x:place.x,y:0,z:place.z+2};let mode='playing';const journeys=[],councils=[];
  const host=createYunethreHost({saved:{chapter:initialYunethre(),history:null},scene:new THREE.Group(),position,
    world:{heightAt:()=>0,readyAt:()=>true,regionAt:()=>({id:62}),setCouncil:s=>councils.push(s)},towerState:()=>({inside:false,room:null}),mode:()=>mode,setMode:value=>{mode=value;},
    transition:async(room,at)=>{journeys.push({room,at});mode='playing';return true;},map:{setSimulation(){},setRegionScope(){}},onDirty(){},notice(){}});
  t.after(()=>{host.dispose();globalThis.requestAnimationFrame=raf;if(old)Object.defineProperty(globalThis,'document',old);else delete globalThis.document;});
  host.command({type:'brief'});host.command({type:'depart'});
  assert.equal(host.meeting('celder'),true);assert.ok(host.conversation().actions.includes('consent'));
  assert.equal(host.choose('consent'),true);assert.equal(host.state().compact.celder,true);
  assert.match(host.conversation().text,/Celder's consent is recorded/);
  assert.match(host.conversation().text,/deducted from the battle countdown/);
  assert.equal(host.conversation().actions.includes('consent'),false,'a recorded agreement is not offered again');
  assert.equal(host.choose('consent'),false);assert.equal(journeys.length,0,'recording consent no longer promises travel');
  assert.equal(host.choose('return-yunethre'),true);await Promise.resolve();
  assert.equal(journeys.length,1);assert.equal(journeys[0].room,null);
  assert.equal(journeys[0].at.x,CHAPTER_LOCATIONS.centaurs.x-10);
  assert.equal(host.state().elapsed,90,'the explicit passage deducts the advertised campaign time');
  assert.equal(host.conversation(),null,'travel closes the dialogue');
  const save=host.save(null,null);save.chapter.premise.winner='east';host.restore(save);
  assert.equal(host.residentCampaign().winner,'east');assert.equal(councils.at(-1).winner,'east','reload updates resident context rather than retaining the previous winner');
  host.command({type:'visit',place:'centaurs'});host.command({type:'compact',side:'centaurs'});
  assert.equal(host.state().battle.status,'averted');host.meeting('celder');
  assert.equal(host.conversation().actions.includes('consent'),false);
  const elapsed=host.state().elapsed;host.choose('return-yunethre');await Promise.resolve();
  assert.equal(journeys.length,2);assert.equal(host.state().elapsed,elapsed,'peace removes the countdown charge');
});

test('Chapter 2 speakers face nearby visitors without moving and preserve shared rig resources on disposal',t=>{
  const old=Object.getOwnPropertyDescriptor(globalThis,'document'),elements=new Map();
  globalThis.document={body:new Element(),createElement:()=>new Element(),getElementById(id){if(!elements.has(id))elements.set(id,new Element());return elements.get(id);}};
  const scene=new THREE.Group(),place=CHAPTER_LOCATIONS.celder,position={x:place.x,y:0,z:place.z+2};let ready=true,inside=false;
  const reference=createCharacter(),borrowed=new Set();reference.group.traverse(o=>{if(o.isMesh){borrowed.add(o.geometry);borrowed.add(o.material);}});
  let borrowedDisposals=0;for(const resource of borrowed)resource.addEventListener('dispose',()=>borrowedDisposals++);
  const host=createYunethreHost({saved:{chapter:initialYunethre(),history:null},scene,position,
    world:{heightAt:()=>0,readyAt:()=>ready,regionAt:()=>({id:62})},towerState:()=>({inside,room:inside?'tower':null}),mode:()=> 'playing',
    map:{setSimulation(){},setRegionScope(){}},onDirty(){},notice(){}});
  t.after(()=>{host.dispose();disposeCharacter(reference);if(old)Object.defineProperty(globalThis,'document',old);else delete globalThis.document;});
  host.tick(.04,false,0);const actor=scene.getObjectByName('Celder knight / peace envoy'),start=actor.position.clone();
  for(let i=0;i<60;i++)host.tick(.04,false,i*.04);
  assert.ok(Math.abs(Math.atan2(Math.sin(actor.rotation.y),Math.cos(actor.rotation.y)))<.001,'the envoy faces the +Z dialogue approach');
  assert.deepEqual(actor.position.toArray(),start.toArray(),'greeting does not walk the envoy out of place');
  position.z+=30;for(let i=0;i<60;i++)host.tick(.04,false,3+i*.04);
  assert.ok(Math.abs(Math.PI-actor.rotation.y)<.001,'the envoy returns to the authored heading at a distance');
  ready=false;host.tick(.04,false,6);assert.equal(actor.visible,false);
  ready=true;inside=true;host.tick(.04,false,7);assert.equal(scene.getObjectByName('Chapter 2 / diplomatic speakers').visible,false);
  host.dispose();assert.equal(scene.children.length,0);assert.equal(borrowedDisposals,0,'retiring the chapter does not dispose shared primitives or cached finishes');
});

test('Celder envoy and sentries remain accessible beside the garden without taking the oak interaction',async t=>{
  const {CANERD,CANERD_GARDEN}=await sourceModule('../src/content/regions/canerd/canerd-world.js');
  const {CANERD_ENTRY}=await sourceModule('../src/content/chapters/yunethre/locations.js');
  const {CELDER_SENTRIES}=await sourceModule('../src/content/chapters/yunethre/celder-presence.js');
  const {CANERD_RESIDENTS}=await sourceModule('../src/content/regions/canerd/canerd-residents.js');
  const {createCanerdScenery}=await sourceModule('../src/content/regions/canerd/canerd-scenery.js');
  const {createCanerdLifeHost}=await sourceModule('../src/content/regions/canerd/canerd-life-host.js');
  const {canStand}=await sourceModule('../src/gameplay/movement/locomotion.js');
  const {localSight}=await sourceModule('../src/app/exploration/local-sight.js');
  const old=Object.getOwnPropertyDescriptor(globalThis,'document'),raf=globalThis.requestAnimationFrame,elements=new Map();
  globalThis.document={body:new Element(),createElement:()=>new Element(),getElementById(id){if(!elements.has(id))elements.set(id,new Element());return elements.get(id);}};
  globalThis.requestAnimationFrame=callback=>callback();
  const scene=new THREE.Group(),colliders=[],heightAt=()=>CANERD.summitHeight;
  const scenery=createCanerdScenery({parent:scene,heightAt,colliders});
  const world={heightAt,readyAt:()=>true,regionAt:()=>({id:62}),colliders,nearColliders:()=>colliders,
    bounds:{minX:CANERD.x-300,maxX:CANERD.x+300,minZ:CANERD.z-300,maxZ:CANERD.z+300}};
  const place=CHAPTER_LOCATIONS.celder,approach={x:place.x,y:heightAt(),z:place.z+2},position={...approach};let mode='playing';
  const castle=createCanerdLifeHost(scene,world,{scenery:()=>scenery});
  const host=createYunethreHost({saved:{chapter:initialYunethre(),history:null},scene,position,world,
    towerState:()=>({inside:false,room:null}),mode:()=>mode,setMode:value=>{mode=value;},
    map:{setSimulation(){},setRegionScope(){}},onDirty(){},notice(){}});
  t.after(()=>{host.dispose();castle.dispose();scenery.root.removeFromParent();globalThis.requestAnimationFrame=raf;if(old)Object.defineProperty(globalThis,'document',old);else delete globalThis.document;});
  const eachSegment=(points,check)=>{
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i],n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.15));
      for(let j=0;j<=n;j++)check({x:a.x+(b.x-a.x)*j/n,z:a.z+(b.z-a.z)*j/n});
    }
  };
  for(const p of [place,approach,...CELDER_SENTRIES])assert.ok(canStand(p.x,p.z,world,.65,heightAt()),`${p.id??'visitor'} has body clearance`);
  eachSegment([CANERD_ENTRY,CANERD.gate,{x:CANERD.x,z:CANERD.z+25},approach],p=>assert.ok(canStand(p.x,p.z,world,.65,heightAt()),'The envoy is reachable from the open gate.'));
  assert.ok(localSight(world,{...approach,y:heightAt()+1.5},{...place,y:heightAt()+1.5}),'No wall or planting obscures the greeting.');
  for(const person of CANERD_RESIDENTS)eachSegment([...person.routine,person.routine[0]],p=>{
    for(const stationary of [place,...CELDER_SENTRIES])assert.ok(Math.hypot(p.x-stationary.x,p.z-stationary.z)>1.2,`${person.id} keeps clear of ${stationary.id}`);
  });
  assert.ok(Math.hypot(place.x-CANERD_GARDEN.approach.x,place.z-CANERD_GARDEN.approach.z)>5+2.5,'The entire envoy and oak prompt regions are separate.');
  host.command({type:'brief'});host.command({type:'depart'});host.update();
  const prompt=document.body.children.find(node=>node.id==='yunethre-interact');
  assert.equal(prompt.hidden,false);assert.match(prompt.textContent,/Celder envoy/);
  assert.equal(castle.residentTarget(position),null,'The oak does not appear at the envoy approach.');
  const event={code:'KeyF',repeat:false,preventDefault(){}};
  assert.equal(host.keydown(event),true);assert.equal(host.conversation().id,'celder');host.choose('close');
  Object.assign(position,CANERD_GARDEN.approach,{y:heightAt()});host.update();
  assert.equal(prompt.hidden,true);assert.equal(host.keydown(event),false,'Chapter F priority leaves the oak interaction unclaimed.');
  assert.equal(castle.residentTarget(position)?.id,'canerd-sacred-oak');
});

test('Chapter 2 directions and atlas destination follow the diplomacy route and clear on completion',t=>{
  const old=Object.getOwnPropertyDescriptor(globalThis,'document'),elements=new Map();
  globalThis.document={body:new Element(),createElement:()=>new Element(),getElementById(id){if(!elements.has(id))elements.set(id,new Element());return elements.get(id);}};
  let region=38,inside=true;const position={x:0,y:0,z:0};
  const host=createYunethreHost({saved:{chapter:initialYunethre(),history:null},scene:new THREE.Group(),position,
    world:{heightAt:()=>0,readyAt:()=>false,regionAt:()=>({id:region})},towerState:()=>({inside,room:inside?'tower':null}),mode:()=> 'playing',
    map:{setSimulation(){},setRegionScope(){}},onDirty(){},notice(){}});
  t.after(()=>{host.dispose();if(old)Object.defineProperty(globalThis,'document',old);else delete globalThis.document;});
  const command=value=>assert.equal(host.command(value).ok,true);
  const destination=(id,name)=>{
    assert.equal(host.navigation().id,id);assert.equal(host.navigation().shortLabel,name);assert.equal(host.navigation().directionsKnown,true);
    const marks=host.mapMarks();assert.equal(marks.length,1);assert.equal(marks[0].targetId,id);assert.equal(marks[0].name,name);
    assert.equal(marks[0].kind,'quest');assert.equal(marks[0].directionsKnown,true);
    const world=TRANSFORM.atlasToWorld(marks[0].x,marks[0].y),place=CHAPTER_LOCATIONS[id];
    assert.ok(Math.hypot(world.x-place.x,world.z-place.z)<1e-8,'the main map marks the actual speaker or exit');
  };
  assert.deepEqual(host.mapMarks(),[]);command({type:'brief'});
  assert.equal(host.mapMarks()[0].name,'Laketown','the briefing marks Laketown even while still in the tower');
  inside=false;command({type:'depart'});destination('town','Laketown');
  command({type:'visit',place:'town'});destination('centaurs','Centaur camp');
  command({type:'visit',place:'centaurs'});command({type:'compact',side:'centaurs'});destination('centaurs','Centaur camp');
  assert.match(host.navigation().label,/Travel to Canerd/,'the useful local departure remains the camp speaker');
  region=62;destination('celder','Canerd');command({type:'visit',place:'celder'});command({type:'compact',side:'celder'});
  assert.equal(host.state().battle.status,'averted');region=38;destination('town','Laketown');
  command({type:'laketown-decision',decision:'join'});destination('departure','Minora road');
  command({type:'return'});assert.equal(host.navigation(),null);assert.deepEqual(host.mapMarks(),[]);
});
