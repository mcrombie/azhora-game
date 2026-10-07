import test from 'node:test';
import assert from 'node:assert/strict';
import {hearthfallStore,HEARTHFALL_KEY,validateHearthfall} from '../src/experiments/hearthfall/checkpoint.js';
import {createHearthfallSession} from '../src/experiments/hearthfall/session.js';
import {explorationStore,validateExploration,START} from '../src/app/exploration/checkpoint.js';
import {launchMode,MODES,allowsRegion} from '../src/app/exploration/modes.js';
import {explorationMovement} from '../src/app/exploration/movement.js';
const hero=()=>({version:1,character:'teresod',position:{x:-350,y:2,z:-720},heading:0,camera:{yaw:0,pitch:.3,distance:8},elapsed:12,cells:[]});
test('launch modes are explicit; old war links still resolve; sandbox modes restrict their own regions',()=>{
  assert.equal(launchMode('').id,'explore');assert.equal(launchMode('?war=1').id,'war');
  assert.equal(launchMode('?mode=hearthfall&war=1').id,'hearthfall');assert.equal(launchMode('?mode=unknown').id,'explore');
  assert(allowsRegion(MODES.hearthfall,21));assert(!allowsRegion(MODES.hearthfall,1));assert(!allowsRegion(MODES.hearthfall,0));
  assert(allowsRegion(MODES.explore,1));assert.equal(MODES.explore.reveal,true);
});
test('Hearthfall round trips separately without touching the exploration or war saves',()=>{
  const memory=new Map([['azhora-road-checkpoint-v1','adventure'],['azhora-lizeem-world-v3','war']]);
  const storage={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)};
  const ordinary=explorationStore(storage);ordinary.save({...hero(),position:{...START,y:2}});
  const baseline=new Map(memory),store=hearthfallStore(storage),session=createHearthfallSession({});
  assert.equal(store.read().data,null);const checkpoint=session.save(hero());assert(validateHearthfall(checkpoint));
  assert(store.save(checkpoint).ok);assert.deepEqual(store.read().data,checkpoint);
  for(const [key,value] of baseline)assert.equal(memory.get(key),value);
  const resumed=createHearthfallSession({saved:store.read().data});assert.deepEqual(resumed.save(hero()),checkpoint);
  assert(memory.has(HEARTHFALL_KEY));assert(validateExploration({...hero(),character:'rollo'}),'Existing saves remain readable');
});
test('out-of-region, future and damaged sandbox saves are refused without overwriting the old slot',()=>{
  let raw=JSON.stringify(createHearthfallSession({}).save(hero()));const store=hearthfallStore({getItem:()=>raw,setItem:v=>{throw Error('write must not occur');}});
  const current=store.read().data;
  for(const bad of [{...current,version:99},{...current,format:'war'},{...current,exploration:{...hero(),position:{...START,y:0}}},{...current,sandbox:{...current.sandbox,settlements:{future:true}}}])assert.equal(store.save(bad).ok,false);
  raw='broken';assert.equal(store.read().ok,false);assert.equal(raw,'broken');
  assert.equal(store.save(current).ok,false,'Storage failure is reported');
});
test('walking, running, riding and swimming stop at the sandbox edge without requesting a region load',()=>{
  for(const settings of [{},{walk:13,run:26,radius:.62,swimming:false}])for(const swimming of [false,true]){
    const p={x:0,y:swimming?-.2:2,z:0};
    const world={bounds:{minX:-100,maxX:100,minZ:-100,maxZ:100},heightAt:()=>swimming?-2:2,waterAt:()=>.45,colliders:[],readyAt:()=>true,canExploreAt:(x,z)=>z>=-1};
    const m=explorationMovement(p,world);let boundary=false;
    for(let i=0;i<80;i++){const r=m.step(new Set(['KeyW','ShiftLeft']),0,.04,settings);assert.equal(r.waiting,null);boundary ||=r.blockedBoundary;}
    assert(p.z>=-1);if(!swimming||settings.swimming!==false)assert(boundary);
  }
});
