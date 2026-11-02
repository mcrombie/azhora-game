import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule} from './module-loader.js';
const THREE=await sourceModule('../vendor/three.module.js');
const {createYunethreQuestView,createYunethreJournalView}=await sourceModule('../src/content/chapters/yunethre/journal-view.js');

function dom(t){
  const previous=Object.fromEntries(['document','innerWidth','innerHeight'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  const doc={};
  class Element{
    constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.style={};this.attributes={};this.hidden=false;this.className='';this._text='';this.open=false;
      this.classList={toggle:(name,on)=>{const list=new Set(this.className.split(' ').filter(Boolean));if(on)list.add(name);else list.delete(name);this.className=[...list].join(' ');}};}
    set textContent(text){this._text=String(text);this.children=[];}
    get textContent(){return this._text+this.children.map(child=>child.textContent).join('');}
    set innerHTML(html){this._text='';this.children=[];for(const tag of html.matchAll(/<(small|h3|p|span|strong)\b/g))this.append(new Element(tag[1]));}
    append(...elements){for(const child of elements){child.parentElement=this;this.children.push(child);}}
    replaceChildren(...elements){this.children=[];this._text='';this.append(...elements);}
    setAttribute(name,value){this.attributes[name]=String(value);if(name==='open')this.open=true;}
    getAttribute(name){return this.attributes[name]??null;}
    removeAttribute(name){delete this.attributes[name];if(name==='open')this.open=false;}
    matches(selector){
      if(selector.startsWith('#'))return this.id===selector.slice(1);
      if(selector.startsWith('.'))return this.className.split(' ').includes(selector.slice(1));
      const data=/^\[data-([\w-]+)="([^"]+)"\]$/.exec(selector);if(data)return this.dataset[data[1]]===data[2];
      return this.tagName===selector.toUpperCase();
    }
    querySelectorAll(selector){const found=[];for(const child of this.children){if(child.matches(selector))found.push(child);found.push(...child.querySelectorAll(selector));}return found;}
    querySelector(selector){return this.querySelectorAll(selector)[0]??null;}
    focus(){doc.activeElement=this;}
    click(){this.onclick?.();}
    showModal(){this.open=true;}
    close(){this.open=false;this.onclose?.();}
    getBoundingClientRect(){return {width:0,height:0};}
    remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(child=>child!==this);}
  }
  doc.createElement=tag=>new Element(tag);doc.body=new Element('body');doc.getElementById=id=>doc.body.querySelector('#'+id);
  globalThis.document=doc;globalThis.innerWidth=960;globalThis.innerHeight=720;
  t.after(()=>{for(const [key,value]of Object.entries(previous)){if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}});
  return doc;
}
function projection(){return {
  title:'The Yunethre compact',summary:'Protect the neighboring communities while the League finds its footing.',complete:false,
  active:{id:'centaur-consent',title:'Secure the centaurs’ consent',purpose:'Laketown needs a promise of protection.',action:'Approach the camp envoy and press F to offer the compact.',destination:{id:'centaurs',name:'Centaur camp'},
    steps:[{id:'town',title:'Hear Laketown’s terms',detail:'The council needs both sides to agree.',status:'completed'},{id:'centaurs',title:'Negotiate at the centaur camp',detail:'Speak with the envoy.',status:'current'},{id:'celder',title:'Obtain Celder’s consent',detail:'Visit Canerd.',status:'pending'}]},
  deadline:{status:'running',label:'Peace deadline',text:'Both sides must agree before the armies clash.',seconds:75},
  chapters:[{id:'chapter-one',title:'Chapter 1 / Lizeemi War',summary:'The war settled before your arrival.',provenance:'Unattended world history; these are not completed hero quests.',
    entries:[{id:'war',title:'West Lizeem prevailed',detail:'The League won without Teresod’s intervention.',status:'information',day:28}]},
    {id:'chapter-two',title:'Chapter 2 / Yunethre',summary:'Seek a compact between Laketown’s neighbors.',provenance:'Your recorded actions.',entries:[
      {id:'brief',title:'Taleth’s assignment',detail:'Taleth asked you to visit Laketown.',status:'completed'},
      {id:'centaurs',title:'Obtain both consents',detail:'Visit the centaurs and Celder.',status:'current'}]}],
};}

test('Chapter 2 HUD renders purpose, checked progress, actual waypoint distance and journal access while retaining the shared pointer',t=>{
  const doc=dom(t),data=projection(),position={x:0,y:0,z:0};let opened=0;
  let quest={label:'MAIN QUEST / CHAPTER 2',title:'Travel to Canerd',detail:'Old single-line objective',clock:'Peace deadline: 1:15 remaining',target:{id:'centaurs',x:600,y:0,z:-800},markerLabel:'Centaur camp',edgeMarker:true,showMarker:true};
  const view=createYunethreQuestView({position,mode:()=> 'playing',quest:()=>quest,projection:()=>data,onOpenJournal:()=>opened++});t.after(()=>view.dispose());
  const camera=new THREE.PerspectiveCamera(60,4/3,.1,10000);camera.updateMatrixWorld();view.draw(camera);
  const card=doc.getElementById('tower-main-quest'),marker=doc.getElementById('taleth-main-quest-marker');
  assert.equal(card.querySelector('h3').textContent,data.active.title);assert.match(card.textContent,/Laketown needs a promise/);
  assert.equal(card.querySelectorAll('li').length,3);assert.equal(card.querySelectorAll('li')[0].dataset.status,'completed');
  assert.match(card.textContent,/Approach the camp envoy and press F/);assert.match(card.textContent,/Centaur camp · 1000 m direct/);
  assert.equal(card.querySelector('.yunethre-quest-deadline').dataset.urgent,'true');assert.equal(marker.dataset.distance,'1000');assert(!marker.hidden);
  const button=card.querySelector('button');button.click();assert.equal(opened,1);
  view.draw(camera);assert.equal(card.querySelector('button'),button,'frame redraw retains the focused journal control');
  position.x=600;view.draw(camera);assert.match(card.textContent,/800 m direct/);assert.equal(marker.dataset.distance,'800');
  quest=null;view.draw(camera);assert(card.hidden);assert(marker.hidden);
});

test('the journal separates unattended world history from completed hero quests and supports keyboard chapter navigation',t=>{
  const doc=dom(t),data=projection(),before=structuredClone(data);let opens=0,closes=0;
  const previous=doc.createElement('button');doc.body.append(previous);previous.focus();
  const view=createYunethreJournalView({projection:()=>data,onOpen:()=>opens++,onClose:()=>closes++});t.after(()=>view.dispose());
  assert(view.open());assert(view.isOpen());const dialog=doc.getElementById('yunethre-journal');assert(dialog.open);
  assert.equal(opens,1);assert.equal(doc.activeElement,dialog.querySelector('.yunethre-journal-close'));
  assert.match(dialog.querySelector('#yunethre-journal-panel').textContent,/Completed quests · 1/);
  const tab=dialog.querySelector('[data-chapter="chapter-one"]');tab.click();
  let panel=dialog.querySelector('#yunethre-journal-panel');assert.match(panel.textContent,/World history · 1/);assert.doesNotMatch(panel.textContent,/Completed quests/);
  assert.doesNotMatch(panel.textContent,/Day 28/,'simulation order is not presented as a calendar date');
  assert.equal(doc.activeElement.getAttribute('aria-selected'),'true');
  let prevented=false;dialog.querySelector('nav').onkeydown({key:'ArrowRight',preventDefault(){prevented=true;}});
  assert(prevented);assert.equal(doc.activeElement.dataset.chapter,'chapter-two');
  assert.deepEqual(data,before,'reading does not create achievements or change scenario history');
  dialog.oncancel({preventDefault(){}});assert.equal(view.isOpen(),false);assert.equal(dialog.open,false);assert.equal(closes,1);assert.equal(doc.activeElement,previous);
  assert.equal(view.close(),false);assert.equal(closes,1);
});

test('journal refresh preserves literal quest text and modal lifecycle supports refusal, reopening and silent disposal',t=>{
  const doc=dom(t),data=projection();let allowed=false,closes=0;
  const view=createYunethreJournalView({projection:()=>data,onOpen:()=>allowed,onClose:()=>closes++});
  assert.equal(view.open(),false);assert.equal(view.isOpen(),false);
  allowed=true;view.open('chapter-two');const dialog=doc.getElementById('yunethre-journal');
  data.chapters[1].entries.push({id:'untrusted',title:'<button>Old inscription</button>',detail:'A <script> is only text.',status:'information'});view.update();
  const panel=dialog.querySelector('#yunethre-journal-panel');assert.match(panel.textContent,/<button>Old inscription<\/button>/);assert.equal(panel.querySelectorAll('button').length,0);
  view.toggle();assert.equal(closes,1);view.open();dialog.onclose();assert(view.isOpen(),'a queued old close event cannot dismiss a newly reopened dialog');
  view.dispose();view.dispose();assert.equal(closes,1,'disposing the host does not resume its retired game mode');
  assert.equal(doc.getElementById('yunethre-journal'),null);assert.equal(view.open(),false);
});
