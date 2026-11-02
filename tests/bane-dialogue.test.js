import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule} from './module-loader.js';

const THREE=await sourceModule('../vendor/three.module.js');
const {createYunethreHost}=await sourceModule('../src/content/chapters/yunethre/host.js');
const {initialYunethre,BATTLE_START}=await sourceModule('../src/content/chapters/yunethre/chapter.js');
const {CHAPTER_LOCATIONS}=await sourceModule('../src/content/chapters/yunethre/locations.js');

class Element {
  constructor(){this.children=[];this.parts=new Map();this.dataset={};this.hidden=false;}
  append(...children){this.children.push(...children);}
  setAttribute(){}
  querySelector(key){if(!this.parts.has(key))this.parts.set(key,new Element());return this.parts.get(key);}
  querySelectorAll(){return this.children;}
  replaceChildren(...children){this.children=children;}
  click(){this.onclick?.();}
  focus(){}
  remove(){}
}
function fixture(t){
  const old=Object.getOwnPropertyDescriptor(globalThis,'document'),raf=globalThis.requestAnimationFrame,ids=new Map();
  globalThis.document={body:new Element(),createElement:()=>new Element(),getElementById(id){if(!ids.has(id))ids.set(id,new Element());return ids.get(id);}};
  globalThis.requestAnimationFrame=callback=>callback();
  let mode='playing';const journeys=[],place=CHAPTER_LOCATIONS.centaurs,position={x:place.x,y:0,z:place.z+2};
  const host=createYunethreHost({saved:{chapter:initialYunethre(),history:null},scene:new THREE.Group(),position,
    world:{heightAt:()=>0,readyAt:()=>true,regionAt:()=>({id:38})},towerState:()=>({inside:false,room:null}),mode:()=>mode,setMode:value=>{mode=value;},
    transition:async(room,at)=>{journeys.push({room,at});return true;},map:{setSimulation(){},setRegionScope(){}},onDirty(){},notice(){}});
  t.after(()=>{host.dispose();globalThis.requestAnimationFrame=raf;if(old)Object.defineProperty(globalThis,'document',old);else delete globalThis.document;});
  const command=c=>assert.equal(host.command(c).ok,true);
  command({type:'brief'});command({type:'depart'});
  return {host,command,journeys,dialog:document.body.children.find(e=>e.id==='yunethre-dialog'),mode:()=>mode};
}

test('Bane has optional personal conversations without consenting, travelling or advancing the chapter',async t=>{
  const {host,journeys,dialog,mode}=fixture(t);
  host.update();assert.match(document.body.children.find(e=>e.id==='yunethre-interact').textContent,/Bane.*Speaker for the Reed Kin/);
  assert.equal(host.interact(),true);assert.equal(dialog.querySelector('h2').textContent,'Bane / Speaker for the Reed Kin');
  const before=host.state();
  for(const [topic,detail]of [['bane-road',/salt and wool/],['bane-hearth',/Saera.*witnesses/],['bane-pride',/grain wagon/]]){
    assert.equal(host.choose(topic),true);assert.match(host.conversation().text,detail);
    assert.equal(mode(),'briefing');assert.deepEqual(host.conversation().actions,['back-to-negotiation','close']);
    host.tick(2,false,2);assert.deepEqual(host.state(),before,'Reading personal history adds no quest event or elapsed time');
    assert.equal(host.choose('consent'),false,'Agreement requires the negotiation screen');
    assert.equal(host.choose('back-to-negotiation'),true);assert.equal(host.conversation().id,'centaurs');
    assert.ok(host.conversation().actions.includes('consent'));assert.ok(host.conversation().actions.includes('travel-celder'));
  }
  assert.deepEqual(journeys,[]);assert.equal(host.choose('consent'),true);
  const agreed=host.state();assert.equal(agreed.compact.centaurs,true);
  host.choose('bane-hearth');host.choose('back-to-negotiation');
  assert.deepEqual(host.state(),agreed);assert.ok(!host.conversation().actions.includes('consent'),'Personal dialogue does not reset consent');
  assert.equal(host.choose('travel-celder'),true);await Promise.resolve();
  assert.equal(journeys.length,1);assert.equal(host.state().elapsed,90,'The existing journey keeps its advertised time cost');
});

test('the defeated camp does not offer Bane personal topics',t=>{
  const {host,command}=fixture(t);
  command({type:'advance',seconds:BATTLE_START});command({type:'join',side:'centaurs'});command({type:'battle-result',result:'defeat'});
  assert.equal(host.interact(),false,'Bane is no longer an available field speaker');
  host.meeting('centaurs');
  assert.ok(!host.conversation().actions.some(id=>id.startsWith('bane-')));
  assert.match(host.conversation().text,/no speaker left/);
});
