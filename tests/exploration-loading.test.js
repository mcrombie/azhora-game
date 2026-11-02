import test from 'node:test';
import assert from 'node:assert/strict';
import {createRegionLoading} from '../src/world/loading/region-loading.js';
import {prepareExplorationRegions} from '../src/app/exploration/exploration-loading.js';

function fixture(){
  let time=0,serial=0;const frames=new Map(),visits=[],progress=[],cancelled=[];
  const loader=createRegionLoading({initialRegions:[1],nearbyOnly:true,budgetMs:4,now:()=>time,
    requestFrame:callback=>{frames.set(++serial,callback);return serial;},cancelFrame:id=>frames.delete(id)});
  const add=(id,regions,dependencies=[],fail=false)=>loader.register({id,regions,dependencies,steps:function*(){
    visits.push(id);if(fail)throw Error('Broken distant scenery');for(let i=0;i<5;i++){time+=2;yield;}
  }});
  const drain=()=>{for(let count=0;frames.size;count++){
    assert(count<100,'Loading finishes without spinning');const [id,callback]=frames.entries().next().value;frames.delete(id);callback();
  }};
  const options={onProgress:text=>progress.push(text),schedule:()=>123,cancel:id=>cancelled.push(id)};
  return {loader,add,drain,visits,progress,cancelled,options,frames};
}
test('Full prepares every registered region and shared dependency before releasing exploration',async()=>{
  const f=fixture();f.add('home',[1]);f.add('far-ground',[8,9]);f.add('far-town',[9],['far-ground']);
  const ready=prepareExplorationRegions(f.loader,1,{...f.options,loadingMode:'full'});
  assert.equal(f.loader.isReady(9),false);f.drain();await ready;
  assert.deepEqual(f.visits,['home','far-ground','far-town']);
  assert([1,8,9].every(id=>f.loader.isReady(id)));assert.equal(f.loader.state().completed,3);
  assert.equal(f.loader.state().running,false);assert.equal(f.loader.state().policy,'all');
  assert.match(f.progress.at(-1),/100%$/);assert.deepEqual(f.cancelled,[123]);
});
test('Fast prepares only the initial region and leaves unrelated scenery for later travel',async()=>{
  const f=fixture();f.add('home',[1]);f.add('distant',[9]);
  const ready=prepareExplorationRegions(f.loader,1,{...f.options,loadingMode:'fast'});f.drain();await ready;
  assert.deepEqual(f.visits,['home']);assert(f.loader.isReady(1));assert(!f.loader.isReady(9));
  assert.equal(f.loader.state().policy,'nearby');assert.equal(f.loader.state().running,false);
  assert.match(f.progress.at(-1),/100%$/);
});
test('Full reports a distant build failure and stops its background work and progress timer',async()=>{
  const f=fixture();f.add('home',[1]);f.add('broken',[9],[],true);f.add('dependent',[10],['broken']);
  const ready=prepareExplorationRegions(f.loader,1,{...f.options,loadingMode:'full'});f.drain();
  await assert.rejects(ready,/Broken distant scenery/);
  assert.equal(f.loader.state().running,false);assert.equal(f.frames.size,0);assert.deepEqual(f.cancelled,[123]);
  assert(!f.progress.at(-1).endsWith('100%'));
});
