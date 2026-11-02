import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule} from './module-loader.js';
const {createCanerdLifeHost}=await sourceModule('../src/content/regions/canerd/canerd-life-host.js');
const {CANERD,CANERD_GARDEN}=await sourceModule('../src/content/regions/canerd/canerd-world.js');

const settle=async()=>{await Promise.resolve();await Promise.resolve();};
const observer={...CANERD_GARDEN.approach,y:0};

function fixture(){
  let ready=false,scenery=null,resolve,person=null;
  const events={loads:0,creates:0,updates:[],talking:[],disposed:0,oakUpdates:[]},scene={},colliders=[];
  const oak={awake:false,setAwake(value){this.awake=value;},update(dt,options){events.oakUpdates.push({dt,...options});},state(){return {awake:this.awake};}};
  const world={readyAt:()=>ready,heightAt:()=>0,renderedGroundHeight:()=>0,nearColliders:()=>colliders};
  const controller={
    update(...args){events.updates.push(args);},
    target(point){return person&&Math.abs(point.y-person.y)<2&&Math.hypot(point.x-person.x,point.z-person.z)<3.7?person:null;},
    people:()=>person?[person]:[],setTalking(...args){events.talking.push(args);},
    state:()=>({total:6,loaded:6}),dispose(){events.disposed++;},
  };
  const module={createCanerdPeople(parent,environment){assert.equal(parent,scene);assert.equal(environment,world);events.creates++;return controller;}};
  const host=createCanerdLifeHost(scene,world,{scenery:()=>scenery,load(){events.loads++;return new Promise(done=>{resolve=done;});}});
  return {host,events,oak,world,colliders,scene,module,
    prepared(){ready=true;scenery={root:{},sacredOak:oak};},
    setPerson(value){person=value;},resolve(){resolve(module);}};
}

test('Canerd household loads once only after its actual castle is prepared and nearby',async()=>{
  const f=fixture();
  f.host.update(0,.1,observer);assert.equal(f.events.loads,0);
  f.prepared();f.host.update(0,.1,{...observer,x:CANERD.x+500});assert.equal(f.events.loads,0);
  for(let i=0;i<6;i++)f.host.update(i,.1,observer);
  assert.equal(f.events.loads,1);assert.equal(f.events.creates,0);assert.equal(f.host.state().pending,true);
  f.resolve();await settle();
  f.host.update(7,.05,observer);assert.equal(f.events.creates,1);assert.equal(f.host.state().loaded,6);
  assert.equal(f.host.state().pending,false);assert.deepEqual(f.events.updates,[[7,.05,observer]]);
  f.host.dispose();assert.equal(f.events.disposed,1);
  f.host.update(8,.1,observer);assert.equal(f.events.loads,1);assert.equal(f.events.updates.length,1);
});

test('disposing during a delayed import cannot install actors into an abandoned scene',async()=>{
  const abandoned=fixture(),active=fixture();abandoned.prepared();active.prepared();
  abandoned.host.update(0,.1,observer);active.host.update(0,.1,observer);
  abandoned.host.dispose();abandoned.resolve();active.resolve();await settle();
  assert.equal(abandoned.events.creates,0);assert.equal(abandoned.events.disposed,0);
  assert.equal(active.events.creates,1,'The other scene still gets its own household.');
  abandoned.host.update(1,.1,observer);active.host.update(1,.1,observer);
  assert.equal(abandoned.events.updates.length,0);assert.equal(active.events.updates.length,1);
  active.host.dispose();assert.equal(active.events.disposed,1);
});

test('oak conversations wake only that scene and nearby people remain separately reachable',async()=>{
  const f=fixture(),other=fixture();f.prepared();other.prepared();f.host.update(0,.1,observer);f.resolve();await settle();
  const gardener={id:'canerd-mera',name:'Mera',...observer};f.setPerson(gardener);
  assert.equal(f.host.residentTarget(observer).id,gardener.id,'A gardener in front of the oak is the nearer speaker.');
  f.setPerson({...gardener,x:observer.x-3.5});
  assert.equal(f.host.residentTarget(observer).id,'canerd-sacred-oak','The tree can still be approached when the gardener moves aside.');
  f.host.setResidentTalking('canerd-sacred-oak',observer);f.host.update(1,.05,observer);
  assert.equal(f.oak.awake,true);assert.equal(other.oak.awake,false);
  assert.deepEqual(f.events.oakUpdates.at(-1),{dt:.05,speaking:true});
  f.host.setResidentTalking(gardener.id,observer);assert.equal(f.oak.awake,false);
  assert.deepEqual(f.events.talking.at(-1),[gardener.id,observer]);
  f.host.setResidentTalking(null);f.host.update(2,.05,observer);
  assert.equal(f.host.state().speaking,null);assert.equal(f.events.oakUpdates.at(-1).speaking,false);
  f.setPerson(null);assert.equal(f.host.residentTarget({...observer,y:5}),null,'Another floor cannot speak to the oak.');
  const behind={...observer,x:observer.x-1.5};
  f.colliders.push({x:observer.x-.75,z:observer.z,r:.3,minY:0,maxY:3});
  assert.equal(f.host.residentTarget(behind),null,'A physical wall blocks the oak approach sight line.');
  f.host.dispose();other.host.dispose();
});

test('failed lazy loading reports one error without retrying every frame',async t=>{
  const errorLog=t.mock.method(console,'error',()=>{});let loads=0;
  const world={readyAt:()=>true,heightAt:()=>0,nearColliders:()=>[]};
  const host=createCanerdLifeHost({},world,{scenery:()=>({root:{}}),load(){loads++;return Promise.reject(Error('fixture import unavailable'));}});
  host.update(0,.1,observer);await settle();
  for(let i=0;i<20;i++)host.update(i,.1,observer);
  assert.equal(loads,1);assert.match(host.state().error,/fixture import unavailable/);
  assert.equal(host.state().pending,false);assert.equal(errorLog.mock.callCount(),1);host.dispose();
});
