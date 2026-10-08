import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorldWar,WORLD_WAR_SCENARIO} from '../src/app/exploration/world-war.js';
import {WORLD_WAR_KEY,validateWorldWarSave,worldWarStore} from '../src/app/exploration/war-checkpoint.js';
import {deathReport} from '../src/app/exploration/afterlife-state.js';

const exploration={version:1,character:'teresod',position:{x:-1905,y:2,z:710},heading:0,camera:{yaw:0,pitch:.3,distance:8},elapsed:30,cells:[]};
const save=w=>({format:WORLD_WAR_KEY,version:1,exploration:structuredClone(exploration),...w.checkpoint(),tower:{version:1,location:'world',briefed:true,running:false}});

test('Death resolves the remaining battle normally; the retry checkpoint preserves the preceding interception',()=>{
  for(const side of ['west','east'])for(const stage of ['intercept','rally']){
    const w=createWorldWar();w.advance(3);w.syncRegion('Caricas');const b=w.snapshot().engagements.find(b=>b.region==='caricas');
    w.campaign.joinBattle(b.id,b.location);
    if(stage==='rally'){w.campaign.resolveEncounter(b.id,side,'defeat','runner-arrived',2,{escaped:1});w.campaign.joinBattle(b.id,b.location);}
    const before=save(w),pending=w.snapshot().pending;
    assert(validateWorldWarSave(before));
    w.campaign.resolveEncounter(pending.id,side,'defeat','driven-back',0);if(b.endsOn>w.snapshot().day)w.advance(b.endsOn-w.snapshot().day);
    const report=deathReport(w.snapshot(),b.id,WORLD_WAR_SCENARIO),data={...save(w),afterlife:{version:1,form:'living',inLimbo:true,death:{battleId:b.id,stage,side,previousForm:'living',fallen:exploration.position,before,report}}};
    assert(validateWorldWarSave(data));assert.match(report,/armies finished their battle/);assert.match(report,/day 6/);
    const restored=createWorldWar(data);assert.deepEqual(restored.snapshot(),w.snapshot());
    const retry=createWorldWar(data.afterlife.death.before);assert.equal(retry.snapshot().day,stage==='rally'?4:3);assert.equal(retry.snapshot().pending.id,pending.id);
    assert.equal(retry.snapshot().events.filter(e=>e.type==='rally-result').length,0,'No failed rally casualty retained in the rewind');
    if(stage==='rally')assert.equal(retry.snapshot().engagements.find(b=>b.region==='caricas').heroResult.objective.blocked,8);
    retry.campaign.resolveEncounter(pending.id,side,'defeat','driven-back',0);if(b.endsOn>retry.snapshot().day)retry.advance(b.endsOn-retry.snapshot().day);
    assert.deepEqual(retry.snapshot(),w.snapshot(),'Repeated death cannot accumulate an earlier failed attempt');
    for(const form of ['ghost','undead'])assert(validateWorldWarSave({...data,afterlife:{...data.afterlife,form,inLimbo:false}}));
    const bad=structuredClone(data);bad.afterlife.death.before.afterlife=data.afterlife;
    assert.equal(validateWorldWarSave(bad),false,'Nested rewind histories are rejected');
    let stored=JSON.stringify(data);const store=worldWarStore({getItem:()=>stored,setItem:(k,v)=>stored=v});
    assert.equal(store.save(bad).ok,false);assert.deepEqual(store.read().data,data,'A malformed rewind never replaces a valid save');
  }
});

test('Old saves require no afterlife state; incomplete or invalid forms are rejected',()=>{
  const data=save(createWorldWar());assert(validateWorldWarSave(data));
  for(const afterlife of [{version:1,form:'ghost',inLimbo:false},{version:1,form:'living',inLimbo:true},{version:1,form:'dragon',inLimbo:false},null])assert.equal(validateWorldWarSave({...data,afterlife}),false);
  assert(validateWorldWarSave({...data,afterlife:{version:1,form:'living',inLimbo:false}}));
});
