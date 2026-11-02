import test from 'node:test';
import assert from 'node:assert/strict';
import {laketownShoreAccess} from '../src/content/regions/minora-frontier/laketown-access.js';
import {LAKETOWN_FISHING as F} from '../src/content/regions/minora-frontier/laketown-waterfront-layout.js';
import {YUNETHRE_TOWN as T} from '../src/content/regions/minora-frontier/yunethre-world.js';
import {createYunethre} from '../src/content/chapters/yunethre/chapter.js';
import {validYunethreSave,yunethreStore,YUNETHRE_SAVE_KEY} from '../src/content/chapters/yunethre/checkpoint.js';
import {MODES} from '../src/app/exploration/modes.js';
import {regionAt} from '../src/world/terrain/region-world.js';

function checkpoint(point){
  const chapter=createYunethre();
  assert.equal(chapter.command({type:'brief'}).ok,true);
  assert.equal(chapter.command({type:'depart'}).ok,true);
  chapter.advance(123);
  return {format:'azhora-yunethre',version:1,history:null,chapter:chapter.snapshot(),
    tower:{version:1,location:'world',briefed:true,running:false},
    exploration:{version:1,character:'teresod',position:{x:point.x,y:F.deckY,z:point.z},
      heading:0,camera:{yaw:0,pitch:.27,distance:8},elapsed:123,cells:[]}};
}

test('Laketown access follows the complete narrow promenade, gangway and hut apron',()=>{
  const route=[{x:T.x-23,z:T.z},{x:T.x-43,z:T.z+9},{x:T.x-62,z:T.z+9},
    {x:T.x-86,z:T.z+9},F.gangway.a,F.gangway.b,F.apron,F.hut];
  for(let i=1;i<route.length;i++)for(let step=0;step<=20;step++){
    const a=route[i-1],b=route[i],t=step/20,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;
    assert.equal(laketownShoreAccess(x,z),true,`route segment ${i}, step ${step}`);
  }
  assert.equal(regionAt(F.hut.x,F.hut.z).id,37,'the atlas keeps its real mountain boundary');
  assert.equal(MODES.yunethre.regions.includes(37),false,'the rest of South Oremindi stays locked');
  for(const point of [{x:T.x-83,z:T.z+5},
    {x:F.apron.x+F.apron.w/2+1,z:F.apron.z},
    {x:F.gangway.a.x-3,z:(F.gangway.a.z+F.gangway.b.z)/2}]){
    assert.equal(regionAt(point.x,point.z).id,37);
    assert.equal(laketownShoreAccess(point.x,point.z),false,'adjacent mountain/lake is not part of the deck');
  }
  for(const [x,z] of [[NaN,T.z],[T.x,Infinity],[undefined,T.z]])assert.equal(laketownShoreAccess(x,z),false);
});

test('Chapter 2 saves reload on the authored shore without admitting adjacent mountain saves',()=>{
  const memory=new Map(),storage={getItem:key=>memory.get(key),setItem:(key,value)=>memory.set(key,value)};
  const store=yunethreStore(storage);
  for(const point of [F.hut,F.gangway.b,{x:T.x-83,z:T.z+9}]){
    const save=checkpoint(point);
    assert.equal(validYunethreSave(save),true);
    assert.equal(store.save(save).ok,true);
    assert.deepEqual(store.read().data,save,'reload retains exact dock elevation and chapter progress');
  }
  const retained=memory.get(YUNETHRE_SAVE_KEY),offDeck=checkpoint({x:T.x-83,z:T.z+5});
  assert.equal(validYunethreSave(offDeck),false);
  assert.equal(store.save(offDeck).ok,false);
  assert.equal(memory.get(YUNETHRE_SAVE_KEY),retained,'invalid travel cannot replace the last shore checkpoint');
  const notDeparted=checkpoint(F.hut);notDeparted.chapter=createYunethre().snapshot();
  assert.equal(validYunethreSave(notDeparted),false,'the exception does not bypass Chapter 2 departure');
});
