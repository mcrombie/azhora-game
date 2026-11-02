import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule} from './module-loader.js';
const THREE=await sourceModule('../vendor/three.module.js');
const {openOremindiEncounter}=await sourceModule('../src/content/chapters/oremindi/encounter-view.js');
const {createOremindiEncounter,oremindiEncounterLayout}=await sourceModule('../src/content/chapters/oremindi/encounter.js');
const {createSkirmishGround}=await sourceModule('../src/app/exploration/skirmish-ground.js');
const {groundWithRiver}=await sourceModule('../src/world/terrain/world-terrain.js');
const {SOUTH_OREMINDI_EXPEDITION}=await sourceModule('../src/content/regions/south-oremindi/south-oremindi-expedition.js');

class Element{
  constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.parts=new Map();this.style={};this.hidden=false;this.attributes=new Map();this.listeners=new Map();}
  append(...children){this.children.push(...children);}setAttribute(key,value){this.attributes.set(key,value);}getAttribute(key){return this.attributes.get(key);}
  addEventListener(type,fn){this.listeners.set(type,fn);}setPointerCapture(){}
  querySelector(key){if(!this.parts.has(key))this.parts.set(key,new Element());return this.parts.get(key);}
  querySelectorAll(){return this.children;}replaceChildren(...children){this.children=children;}
  closest(){return this.tagName==='BUTTON'?this:null;}focus(){document.activeElement=this;}remove(){this.removed=true;}
}
function fixture(t,{kind='ambush',refuse=false,real=false,watch=false}={}){
  const old=Object.getOwnPropertyDescriptor(globalThis,'document');globalThis.document={body:new Element(),createElement:tag=>new Element(tag)};
  t.after(()=>{if(old)Object.defineProperty(globalThis,'document',old);else delete globalThis.document;});
  const centre=real?SOUTH_OREMINDI_EXPEDITION[kind]:{x:0,z:0},scene=new THREE.Group(),position=new THREE.Vector3(),keys=new Set();
  const actor={group:new THREE.Group(),setWeapon(){},setArmed(){},animate(){}};
  const world={heightAt:real?groundWithRiver:()=>10,waterAt:()=>0,readyAt:()=>true,nearColliders:()=>[],regionAt:()=>({id:37}),colliders:[],
    bounds:{minX:-100000,maxX:100000,minZ:-100000,maxZ:100000}};
  let starts=0,ends=0,continues=0,retries=0,leave=0,result=null;
  const view=openOremindiEncounter({scene,world,actor,position,keys,yaw:()=>0,kind,centre,watch,
    onStart(){starts++;return !refuse;},onEnd(value){ends++;result=value;},onContinue(){continues++;},onWithdraw(){leave++;},onRetry(){retries++;}});
  t.after(()=>view.dispose());const panel=document.body.children.at(-1);
  return {view,world,scene,position,keys,panel,actions:()=>panel.querySelector('[data-actions]').children,
    counts:()=>({starts,ends,continues,retries,leave,result})};
}
const key=(code,target=null,rest={})=>({code,target,preventDefault(){this.prevented=true;},...rest});
// The runtime walks cached terrain triangles, not the global analytic terrain
// function per collision probe. Sample the actual authored field once on the
// same two-metre grid, then interpolate its triangles for this bounded test.
function terrainPatch(centre,radius){
  const step=2,extent=Math.ceil((radius+4)/step)*step,minX=centre.x-extent,minZ=centre.z-extent,
    columns=2*extent/step+1,data=Array.from({length:columns},(_,j)=>Array.from({length:columns},(_,i)=>groundWithRiver(minX+i*step,minZ+j*step)));
  return (x,z)=>{
    const i=Math.floor((x-minX)/step),j=Math.floor((z-minZ)/step);if(i<0||j<0||i>=columns-1||j>=columns-1)throw Error('Combat queried beyond its cached field');
    const u=(x-minX)/step-i,v=(z-minZ)/step-j,a=data[j][i],b=data[j][i+1],c=data[j+1][i],d=data[j+1][i+1];
    return u+v<=1?a+(b-a)*u+(c-a)*v:d+(c-d)*(1-u)+(b-d)*(1-v);
  };
}

test('real Chapter 3 controller commits once, pauses time, and reports one result after an explicit withdrawal',t=>{
  const f=fixture(t),v=f.view;v.tick(.5);assert.equal(v.snapshot().time,0);assert.equal(v.withdraw(),false);
  assert.equal(v.start(),true);v.start();assert.equal(f.counts().starts,1);v.tick(.1);assert(v.snapshot().time>0);
  v.pause();const paused=v.snapshot();v.tick(.5);assert.deepEqual(v.snapshot(),paused);v.start();
  assert.equal(v.withdraw(),true);assert.equal(v.withdraw(),false);assert.equal(f.counts().ends,1);assert.equal(f.counts().result.result,'withdrawal');
  for(let i=0;i<20;i++)v.tick(.1);assert(v.reviewing());assert(v.paused());
  f.actions().find(b=>b.textContent.startsWith('Retry')).onclick();assert.equal(f.counts().retries,1);
  assert.equal(f.counts().ends,1,'The report and retry UI cannot submit another result');
  const root=f.scene.children[0];v.dispose();v.dispose();assert.equal(root.parent,null);assert(f.panel.removed);assert.equal(v.start(),false);
});

test('a rejected attempt stays in briefing and cannot submit an encounter result',t=>{
  const f=fixture(t,{refuse:true});assert.equal(f.view.start(),false);assert(f.view.paused());f.view.tick(.5);
  assert.equal(f.view.snapshot().time,0);assert.equal(f.view.withdraw(),false);assert.equal(f.counts().ends,0);
  f.actions().find(b=>b.textContent.startsWith('Leave')).onclick();assert.equal(f.counts().leave,1);
});

test('briefing and report buttons keep native Space/Enter activation and bounded Tab focus',t=>{
  const f=fixture(t),buttons=f.actions();assert.equal(document.activeElement,buttons[0]);
  for(const code of ['Space','Enter']){const e=key(code,buttons[0]);assert.equal(f.view.keydown(e),false);assert(!e.prevented);}
  f.view.keydown(key('Tab'));assert.equal(document.activeElement,buttons[1]);f.view.keydown(key('Tab'));assert.equal(document.activeElement,buttons[0]);
  f.view.keydown(key('Tab',null,{shiftKey:true}));assert.equal(document.activeElement,buttons[1]);
  f.view.start();const e=key('Space');assert.equal(f.view.keydown(e),true);assert(e.prevented);
});

test('computer control of a real chapter encounter is not mislabeled as a rehearsal',t=>{
  const f=fixture(t,{watch:true});assert.equal(f.actions()[0].textContent,'Watch the encounter');
  assert.doesNotMatch(f.panel.querySelector('[data-feedback]').textContent,/rehearsal/i);assert.equal(f.view.snapshot().rehearsal,false);
});

test('Chapter 3 uses Stillroom target controls, manual movement, staff block, strike and dodge',t=>{
  const f=fixture(t,{watch:true}),v=f.view;v.start();v.keydown(key('KeyT'));
  assert.equal(v.snapshot().watching,false);assert.notEqual(v.focusId(),null);
  const first=v.focusId();v.keydown(key('KeyE'));assert.notEqual(v.focusId(),first);
  v.keydown(key('KeyT'));assert.equal(v.focusId(),null,'T returns to free aim');
  const start=v.snapshot().hero;f.keys.add('KeyW');v.tick(1/60);f.keys.clear();assert(v.snapshot().hero.z<start.z);
  f.keys.add('KeyF');v.tick(1/60);assert(v.snapshot().hero.blocking);assert.equal(v.canCast(),false);
  f.keys.clear();v.tick(1/60);v.attack();v.tick(1/60);assert(v.snapshot().hero.swing>0);
  for(let i=0;i<40;i++)v.tick(1/60);
  v.keydown(key('Space'));v.tick(1/60);assert(v.snapshot().hero.dodge>0);assert.equal(v.canCast(),false);f.keys.clear();
  v.keydown(key('KeyH'));assert(v.paused());const frozen=v.snapshot();v.tick(.1);assert.deepEqual(v.snapshot(),frozen);
  v.keydown(key('KeyH'));assert.equal(v.paused(),false);
});

test('Chapter 3 exposes the shared spell contract and freezes spells through briefings, help and results',t=>{
  const f=fixture(t),v=f.view;assert(v.spellPaused());assert.equal(v.beginCast(),false);v.start();
  assert(v.canCast());assert(v.beginCast());assert.equal(v.beginCast(),false);
  const foe=v.spellTargets()[0],hp=foe.hp;assert(v.fireballHit(foe.id,26));
  assert.equal(v.snapshot().guards[0].hp,hp-26);assert.equal(v.snapshot().hero.lastStrike.kind,'fireball');
  v.pause();assert(v.spellPaused());assert.equal(v.canCast(),false);assert.equal(v.fireballHit(foe.id,26),false);
  v.start();v.withdraw();assert(v.spellPaused());assert.equal(v.beginCast(),false);
  const end=v.snapshot();assert.equal(v.fireballHit(foe.id,26),false);assert.deepEqual(v.snapshot(),end);
});

test('on-screen guard releases on pointer cancellation and a pause clears held combat input',t=>{
  const f=fixture(t),v=f.view;v.start();const guard=f.panel.querySelector('[data-block]');
  guard.listeners.get('pointerdown')({button:0,pointerId:1,preventDefault(){}});v.tick(1/60);assert(v.snapshot().hero.blocking);
  guard.listeners.get('pointercancel')();v.tick(1/60);assert.equal(v.snapshot().hero.blocking,false);
  guard.listeners.get('pointerdown')({button:0,pointerId:1,preventDefault(){}});v.pause();assert.equal(f.keys.size,0);
  assert(guard.disabled);v.start();v.tick(1/60);assert.equal(v.snapshot().hero.blocking,false);
});

test('both real mountain terraces stage on loaded dry terrain with the archer line uphill',t=>{
  const f=fixture(t,{kind:'highground',real:true}),state=f.view.snapshot(),centre=SOUTH_OREMINDI_EXPEDITION.highground;
  const upper=state.allies.filter(a=>a.ranged),chief=state.guards.find(g=>g.commanderId);
  assert(upper.every(a=>groundWithRiver(a.x,a.z)>groundWithRiver(chief.x,chief.z)+2));
  assert.equal(f.position.y,groundWithRiver(state.hero.x,state.hero.z));
  const ground=createSkirmishGround(f.world,centre,null,42);
  for(const u of [...state.allies,...state.guards])assert(ground.segment(state.hero,u,.45),'The actual authored shelf joins every initial stand');
  const a=SOUTH_OREMINDI_EXPEDITION.ambush,g=createSkirmishGround(f.world,a,null,30),layout=oremindiEncounterLayout('ambush',a);
  assert([layout.hero,...layout.guards].every(p=>g.clear(p.x,p.z,.55)));
});

test('real mountain ground, navigation, collision and retreat complete both authored encounters',()=>{
  for(const kind of ['ambush','highground']){
    const centre=SOUTH_OREMINDI_EXPEDITION[kind],radius=centre.radius;
    const heightAt=terrainPatch(centre,radius),world={heightAt,waterAt:()=>0,readyAt:()=>true,regionAt:()=>({id:37}),colliders:[],bounds:{minX:-100000,maxX:100000,minZ:-100000,maxZ:100000}};
    const ground=createSkirmishGround(world,centre,null,radius),nav={canOccupy:(p,r)=>ground.clear(p.x,p.z,r),canTraverse:ground.segment};
    const model=createOremindiEncounter({kind,centre,radius,heightAt,move:ground.move,canHit:ground.canHit,retreatRoute:ground.retreatRoute,...nav});
    let state=model.snapshot();for(let i=0;i<15000&&!state.outcome;i++)state=model.tick(1/60,model.autoplayInput(nav));
    assert.equal(state.outcome?.result,'victory',kind+' must finish on its actual mountain shelf');
    assert([...state.guards,...state.allies,state.hero].every(p=>Math.hypot(p.x-centre.x,p.z-centre.z)<radius));
    assert(kind==='ambush'?state.retreated:state.chiefDefeated);
  }
});
