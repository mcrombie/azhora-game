import test from 'node:test';
import assert from 'node:assert/strict';
import {createResidentHost} from '../src/app/exploration/resident-host.js';
import {residentTopics,residentWords} from '../src/app/exploration/resident-dialogue.js';
import {centaurCampWords} from '../src/content/regions/minora-frontier/centaur-culture.js';

// Small DOM fixture: actual topic selection, focus, closing and context plumbing
// run through the resident host, without requiring a renderer or game world.
class Element{
  constructor(tag='div'){this.tagName=tag;this.children=[];this.parts=new Map();this.dataset={};this.hidden=false;this.isConnected=true;}
  set innerHTML(value){
    this.children=[];
    for(const m of value.matchAll(/<button([^>]*)>(.*?)<\/button>/g)){
      const button=new Element('button');button.dataset.topic=m[1].match(/data-topic="([^"]+)"/)?.[1];button.hidden=m[1].includes('hidden');button.textContent=m[2];this.append(button);
    }
  }
  append(...elements){for(const e of elements){e.parent=this;this.children.push(e);}}
  setAttribute(){}
  querySelector(selector){
    const topic=selector.match(/^\[data-topic="([^"]+)"\]$/)?.[1];
    if(topic)return this.children.find(e=>e.dataset.topic===topic)??null;
    if(!this.parts.has(selector))this.parts.set(selector,new Element());return this.parts.get(selector);
  }
  querySelectorAll(selector){return selector==='button'?this.children.filter(e=>e.tagName==='button'):[];}
  before(element){element.parent=this.parent;this.parent.children.splice(this.parent.children.indexOf(this),0,element);}
  remove(){if(this.parent)this.parent.children.splice(this.parent.children.indexOf(this),1);this.isConnected=false;}
  focus(){globalThis.document.activeElement=this;}
}

test('ordinary resident dialogue exposes camp culture and reads current Chapter 2 state when a topic is selected',t=>{
  const previous=Object.getOwnPropertyDescriptor(globalThis,'document');
  const document={body:new Element(),activeElement:new Element('button'),createElement:tag=>new Element(tag)};
  globalThis.document=document;t.after(()=>{if(previous)Object.defineProperty(globalThis,'document',previous);else delete globalThis.document;});
  let mode='playing',chapter={chapter:'yunethre',battle:{status:'pending'}},target={id:'centaur-saera',name:'Saera',occupation:'Elder and promise-keeper',place:'The Reed Kin'};
  const talking=[],host=createResidentHost({world:{residentTarget:()=>target,setResidentTalking:id=>talking.push(id)},
    position:{x:0,y:0,z:0},mode:()=>mode,setMode:value=>{mode=value;},available:()=>true,
    campaign:()=>({winner:'west'}),chapter:()=>chapter,treeLifeList:()=>['english-oak']});
  t.after(()=>host.dispose());
  const dialog=document.body.children.find(e=>e.id==='resident-dialog');
  assert.equal(host.interact(),true);assert.equal(mode,'briefing');assert.equal(talking.at(-1),'centaur-saera');
  const select=topic=>dialog.querySelector(`[data-topic="${topic}"]`).onclick();
  assert.deepEqual(residentTopics('centaur-saera').map(t=>t.id),['customs','dissent']);
  select('customs');assert.match(dialog.querySelector('#resident-words').textContent,/honour/);
  select('dissent');assert.match(dialog.querySelector('#resident-words').textContent,/interrupts/);
  select('war');assert.equal(dialog.querySelector('#resident-words').textContent,centaurCampWords('centaur-saera','war'));
  chapter={chapter:'yunethre',battle:{status:'averted'}};select('war');assert.match(dialog.querySelector('#resident-words').textContent,/averted/);
  select('close');assert.equal(mode,'playing');assert.equal(talking.at(-1),null);
  target={id:'canerd-arbor-wizard',name:'Arbor Wizard',occupation:'Wizard',place:'Canerd'};
  assert.equal(host.interact(),true);assert.equal(dialog.querySelector('[data-topic="customs"]'),null,'Previous speaker topics are removed');
  select('lifelist');assert.match(dialog.querySelector('#resident-words').textContent,/English oak/,'The tree life list still reaches its existing dialogue');
  assert.equal(residentWords('centaur-saera','war',{winner:'west'}),centaurCampWords('centaur-saera','war'),'Historical campaign winner does not imply Chapter 2 peace');
});
