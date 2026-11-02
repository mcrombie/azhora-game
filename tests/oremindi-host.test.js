import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule} from './module-loader.js';
const THREE=await sourceModule('../vendor/three.module.js');
const {createOremindiHost}=await sourceModule('../src/content/chapters/oremindi/host.js');
const {newOremindiSave}=await sourceModule('../src/content/chapters/oremindi/checkpoint.js');
const {OREMINDI_LOCATIONS:P}=await sourceModule('../src/content/chapters/oremindi/locations.js');
const {TOWER,TALETH_SPOT}=await sourceModule('../src/app/exploration/tower-state.js');
class Element{
  constructor(){this.children=[];this.parts=new Map();this.dataset={};this.style={};this.hidden=false;}
  append(...children){this.children.push(...children);}setAttribute(){}remove(){}focus(){}click(){this.onclick?.();}replaceChildren(...children){this.children=children;}
  querySelector(key){if(key.startsWith('[data-chapter-action'))return this.children.find(c=>c.dataset.chapterAction===key.split('"')[1]);if(!this.parts.has(key))this.parts.set(key,new Element());return this.parts.get(key);}
  querySelectorAll(){return this.children;}
}
test('Chapter 3 host uses physical interaction gates, real chapter history and explicit proof/alliance/report actions',async t=>{
  const prior=globalThis.document,raf=globalThis.requestAnimationFrame,elements=new Map();
  globalThis.document={body:new Element(),createElement:()=>new Element(),getElementById(id){if(!elements.has(id))elements.set(id,new Element());return elements.get(id);}};globalThis.requestAnimationFrame=f=>f();
  const saved=newOremindiSave(),scene=new THREE.Group(),position={...P.refuge,y:95},tower={inside:false,room:null};let mode='playing',currentMap=null,released=false;
  const feature={addExteriorFeature:()=>()=>{released=true;},readyAt:()=>false,heightAt:()=>95};
  const host=createOremindiHost({saved,scene,world:feature,position,towerState:()=>tower,mode:()=>mode,setMode:v=>mode=v,transition:async room=>{tower.inside=!!room;tower.room=room;return true;},notice(){},onDirty(){},map:{setSimulation:s=>currentMap=s,setRegionScope(){}},onBattle(){}});
  t.after(()=>{host.dispose();globalThis.document=prior;globalThis.requestAnimationFrame=raf;});
  assert.equal(host.interact(),false,'unloaded refuge cannot be entered');feature.readyAt=()=>true;assert.equal(host.interact(),true);await Promise.resolve();await Promise.resolve();
  assert.equal(host.state().arrived,true);Object.assign(position,TALETH_SPOT,{y:TOWER.y});assert.equal(host.interact(),true);host.choose('accept');assert.equal(host.state().briefed,true);
  const before=host.state().elapsed;host.tick(10,false,0);assert.equal(host.state().elapsed,before,'an inactive/tower clock is held');
  tower.inside=false;tower.room=null;Object.assign(position,P.rangers,{y:95});host.interact();host.choose('accept-rangers');assert.equal(host.state().rangersMet,true);
  const {attempt}=host.command({type:'start-ambush'});host.command({type:'ambush-result',attempt,result:'victory',fallen:2,retreated:true});
  assert.equal(host.journal().inventory.length,0);Object.assign(position,P.proof);host.interact();host.choose('collect-proof');assert.equal(host.journal().inventory.length,1);
  Object.assign(position,P.rangers);host.interact();host.choose('present-proof');assert.equal(host.state().rangerAlliance,true);assert.equal(host.journal().inventory.length,0);
  assert.equal(currentMap.reference.regions['South Oremindi Mountains'].owner,'oremindi-south-orcs');
  Object.assign(position,P.rendezvous);host.interact();host.choose('wait');assert.equal(host.state().elapsed,host.state().rendezvousAt);
  host.choose('close');const battle=host.command({type:'start-battle'});host.command({type:'battle-result',attempt:battle.attempt,result:'victory',chiefDefeated:true});
  assert.equal(host.state().reported,false,'battle victory is not the final report');tower.inside=true;tower.room='tower';Object.assign(position,TALETH_SPOT,{y:TOWER.y});host.interact();host.choose('report');
  assert.equal(host.state().reported,true);assert.equal(host.mapMarks().length,0);assert.deepEqual(host.save(saved.exploration,saved.tower,saved.riding).history,saved.history);
  const sorcery={version:1,mana:60,rest:2,cooldown:0};assert.deepEqual(host.save(saved.exploration,saved.tower,saved.riding,sorcery).sorcery,sorcery);
  host.dispose();assert.equal(released,true);assert.equal(scene.children.length,0);
});
