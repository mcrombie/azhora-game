import test from 'node:test';
import assert from 'node:assert/strict';
import {forEachBuild} from '../src/world/loading/build-each.js';
import {finishBuild} from '../src/world/loading/build-steps.js';

test('Cooperative callbacks retain forEach ordering, captured length, holes and early returns',()=>{
  const expected=[],actual=[];
  const input=()=>{const items=[2,4,6,8];delete items[1];return items;};
  function visit(out,value,index,items){
    out.push([value,index,items.length]);
    if(index===0){items.push(99);delete items[2];items[3]=10;}
    if(value===2)return;
    out.push(value*3);
  }
  input().forEach((value,index,items)=>visit(expected,value,index,items));
  finishBuild(forEachBuild(input(),function* (value,index,items){visit(actual,value,index,items);}));
  assert.deepEqual(actual,expected);
});

test('Long instance batches suspend within the batch and resume without replaying random draws',()=>{
  let seed=23,consumed=0;
  const random=()=>{consumed++;seed=Math.imul(seed,1664525)+1013904223|0;return seed;};
  const values=Array.from({length:97},(_,index)=>index),built=[];
  const work=forEachBuild(values,function* (value){built.push([value,random()]);});
  assert.equal(consumed,0);
  let result=work.next();assert.equal(result.done,false);assert.equal(consumed,32);
  result=work.next();assert.equal(result.done,false);assert.equal(consumed,64);
  result=work.next();assert.equal(result.done,false);assert.equal(consumed,96);
  result=work.next();assert.equal(result.done,true);assert.equal(consumed,97);
  assert.deepEqual(built.map(([value])=>value),values);
  let expectedSeed=23;
  assert.deepEqual(built.map(([,draw])=>draw),values.map(()=>expectedSeed=Math.imul(expectedSeed,1664525)+1013904223|0));
});
