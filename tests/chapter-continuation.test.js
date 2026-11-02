import test from 'node:test';
import assert from 'node:assert/strict';
import {continuationMode,loadChapterContinuation} from '../src/app/exploration/chapter-continuation.js';
import {launchMode,MODES,allowsRegion} from '../src/app/exploration/modes.js';
import {unattendedChapterTwo,validOremindiSave} from '../src/content/chapters/oremindi/checkpoint.js';
import {YUNETHRE_SAVE_KEY} from '../src/content/chapters/yunethre/checkpoint.js';
test('Chapter 3 launch keeps the original regions and opens only South Oremindi and North Ibenwood',()=>{
  assert.equal(launchMode('?mode=oremindi').id,'oremindi');assert.equal(continuationMode('?continuation=oremindi'),'oremindi');
  assert.equal(continuationMode('?continuation=yunethre'),'yunethre');assert.equal(continuationMode('?continuation=other'),null);
  for(const id of MODES.yunethre.regions)assert(allowsRegion(MODES.oremindi,id));
  assert(allowsRegion(MODES.oremindi,37));assert(allowsRegion(MODES.oremindi,33));assert(!allowsRegion(MODES.oremindi,32));
  assert(MODES.oremindi.mapRegions.includes('South Oremindi Mountains'));assert(MODES.oremindi.mapRegions.includes('North Ibenwood'));
});
test('continuing Chapter 2 carries its actual history into a new separate Chapter 3 without writes',async()=>{
  const previous=unattendedChapterTwo(),raw=JSON.stringify(previous),keys=[];
  const result=await loadChapterContinuation('oremindi',{getItem:key=>{keys.push(key);return key===YUNETHRE_SAVE_KEY?raw:null;},setItem:()=>assert.fail('continuation must not overwrite either save')});
  assert(result.ok,result.reason);assert.equal(result.mode,'oremindi');assert(validOremindiSave(result.data));assert.equal(result.data.historySource,'played');
  assert.deepEqual(result.data.history,previous);assert.deepEqual(keys,[YUNETHRE_SAVE_KEY]);
});
test('a missing, malformed or incomplete prior chapter fails visibly instead of replacing it with a preset',async()=>{
  for(const raw of [null,'broken',JSON.stringify({format:'azhora-yunethre'})]){
    const result=await loadChapterContinuation('oremindi',{getItem:()=>raw,setItem:()=>assert.fail('invalid continuation must not write')});
    assert.equal(result.ok,false);assert.equal(result.data,undefined);assert.equal(typeof result.reason,'string');
  }
  const prior=unattendedChapterTwo();prior.chapter.returned=false;
  const result=await loadChapterContinuation('oremindi',{getItem:()=>JSON.stringify(prior)});assert.equal(result.ok,false);assert.match(result.reason,/Finish Chapter 2/);
  assert.equal((await loadChapterContinuation('unknown',{getItem:()=>null})).ok,false);
});
