import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseLoadingMode} from '../src/app/startup/loading-choice.js';

function harness(){
  let time=0,nextId=0,paint;
  const timers=new Map(),elements=new Map();
  const document=new EventTarget();document.activeElement=null;
  for(const id of ['loading-choice','loading-full','loading-fast','loading-countdown','loading-status','loading']){
    const element=new EventTarget();element.hidden=false;element.disabled=false;element.textContent='';
    const classes=new Set();element.classList={add:value=>classes.add(value),remove:value=>classes.delete(value),contains:value=>classes.has(value)};
    element.focus=()=>{document.activeElement=element;};
    element.click=()=>element.dispatchEvent(new Event('click'));
    elements.set(id,element);
  }
  document.getElementById=id=>elements.get(id);
  const painted=new Promise(resolve=>{paint=resolve;});
  const options={document,afterPaint:()=>painted,now:()=>time,schedule:(callback,ms)=>{const id=++nextId;timers.set(id,{callback,at:time+ms});return id;},cancel:id=>timers.delete(id)};
  const advance=ms=>{const end=time+ms;for(;;){const next=[...timers.entries()].filter(([,job])=>job.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;time=next[1].at;timers.delete(next[0]);next[1].callback();}time=end;};
  return {options,document,elements,timers,advance,paint:async()=>{paint();await Promise.resolve();await Promise.resolve();await Promise.resolve();}};
}

test('Full is focused by default and its ten-second countdown starts after the choice paints',async()=>{
  const h=harness(),result=chooseLoadingMode(h.options);
  assert.equal(h.document.activeElement,h.elements.get('loading-full'));
  h.advance(30000);assert.equal(h.timers.size,0);assert.equal(h.elements.get('loading-choice').hidden,false);
  await h.paint();
  assert.equal(h.elements.get('loading-countdown').textContent,'Full mode starts automatically in 10 seconds.');
  h.advance(9000);assert.equal(h.elements.get('loading-choice').hidden,false);
  assert.equal(h.elements.get('loading-countdown').textContent,'Full mode starts automatically in 1 second.');
  h.advance(1000);assert.equal(await result,'full');assert.equal(h.timers.size,0);
  assert.equal(h.elements.get('loading-choice').hidden,true);assert.equal(h.elements.get('loading').hidden,false);
});

test('Selecting Fast cancels the pending default and removes click listeners even at the deadline',async()=>{
  const h=harness(),result=chooseLoadingMode(h.options);await h.paint();h.advance(9999);
  h.elements.get('loading-fast').click();h.elements.get('loading-full').click();h.advance(20000);
  assert.equal(await result,'fast');assert.equal(h.timers.size,0);
  assert.equal(h.elements.get('loading-status').textContent,'Preparing your starting region');
  assert.equal(h.elements.get('loading-full').disabled,true);
  assert.equal(h.elements.get('loading').classList.contains('choosing-mode'),false);
});

test('Clicking immediately starts loading without waiting for paint or leaving a countdown behind',async()=>{
  const h=harness(),result=chooseLoadingMode(h.options);
  h.elements.get('loading-full').click();assert.equal(await result,'full');await h.paint();
  assert.equal(h.timers.size,0);assert.equal(h.elements.get('loading-choice').hidden,true);
});

test('The launch query explicitly selects either mode without creating a timer',async()=>{
  for(const mode of ['full','fast']){
    const h=harness();assert.equal(await chooseLoadingMode({...h.options,search:`?test=1&load=${mode}`}),mode);
    await h.paint();assert.equal(h.timers.size,0);assert.equal(h.elements.get('loading-choice').hidden,true);
  }
});

test('Keyboard focus stays on the two launch choices and is released after selection',async()=>{
  const h=harness(),result=chooseLoadingMode(h.options);
  const tab=()=>{const event=new Event('keydown',{cancelable:true});event.key='Tab';h.document.dispatchEvent(event);return event;};
  assert.equal(tab().defaultPrevented,true);assert.equal(h.document.activeElement,h.elements.get('loading-fast'));
  tab();assert.equal(h.document.activeElement,h.elements.get('loading-full'));
  h.elements.get('loading-full').click();await result;assert.equal(tab().defaultPrevented,false);
});
