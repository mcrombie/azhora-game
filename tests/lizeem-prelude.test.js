import test from 'node:test';
import assert from 'node:assert/strict';
import {LIZEEM_PRELUDE,preludeForScenario} from '../src/content/scenarios/lizeem-prelude.js';
import {LIZEEM_SCENARIO} from '../src/content/scenarios/lizeem.js';
import {createWorldWar,worldWarScenario} from '../src/app/exploration/world-war.js';

test('The Chronoscope follows the declarations, independent states and voluntary leagues in order',()=>{
  const frames=LIZEEM_PRELUDE.frames,at=day=>frames.find(frame=>frame.day===day);
  assert.deepEqual(frames.map(frame=>frame.day),[1,3,4,5,6,7,21,23,29,30]);
  assert(Object.values(at(1).owners).every(owner=>owner==='empire'));
  assert.match(at(1).caption,/constitution/);assert.match(at(1).caption,/disappeared/);
  assert.equal(at(3).owners.isareos,'minora');
  assert(Object.entries(at(3).owners).filter(([id])=>id!=='isareos').every(([,owner])=>owner==='empire'));
  for(const [day,id] of [[4,'nethereum'],[5,'caricas'],[6,'ovesos'],[7,'nesdor']]){
    const before=at(day-1).owners,after=at(day).owners;
    assert.deepEqual(Object.keys(after).filter(key=>after[key]!==before[key]),[id]);
    assert.equal(after[id],id);
  }
  assert.equal(new Set(Object.values(at(7).owners)).size,5,'Every former province is independent before either league forms');
  assert.deepEqual(at(21).highlight,['nethereum','ovesos']);
  assert.equal(at(21).owners.nethereum,'west');assert.equal(at(21).owners.ovesos,'west');
  assert.equal(at(21).owners.caricas,'caricas');assert.equal(at(21).owners.nesdor,'nesdor');
  assert.match(at(21).caption,/alliance, not conquest/);
  assert.equal(at(23).owners.caricas,'east');assert.equal(at(23).owners.nesdor,'east');
  assert.match(at(23).caption,/not an annexation/);
  assert.deepEqual(at(23).owners,at(29).owners);assert.deepEqual(at(29).owners,at(30).owners);
  assert(frames.slice(0,-1).every(frame=>!frame.war));assert.equal(at(30).war,true);
  assert(frames.slice(1).every(frame=>frame.owners.isareos==='minora'),'Minora never enters either league');
});

test('The bounded historical projection ends at the live scenario without advancing or changing it',()=>{
  const session=createWorldWar(),snapshot=session.snapshot(),checkpoint=session.checkpoint(),scenarioBefore=structuredClone(LIZEEM_SCENARIO);
  for(const id of ['lizeem-east-west-v3','lizeem-world-v3','lizeem-world-v4','lizeem-world-v5','lizeem-world-v6','lizeem-world-v7','lizeem-world-v8']){
    const prelude=preludeForScenario(id),scenario=id===LIZEEM_SCENARIO.id?LIZEEM_SCENARIO:worldWarScenario(id);
    assert.equal(prelude,LIZEEM_PRELUDE);
    assert.deepEqual(prelude.frames.at(-1).owners,Object.fromEntries(scenario.regions.map(region=>[region.id,region.owner])));
    assert.deepEqual(scenario.wars,[['west','east']]);
    for(const faction of scenario.factions)assert.deepEqual(prelude.factions.find(f=>f.id===faction.id),faction);
  }
  for(const id of [null,undefined,'other-scenario','lizeem-world-v9','lizeem-world-v1'])assert.equal(preludeForScenario(id),null);
  const duration=LIZEEM_PRELUDE.frames.reduce((seconds,frame)=>seconds+frame.seconds,0);
  assert(duration>=24&&duration<=26);
  const factions=new Set(LIZEEM_PRELUDE.factions.map(faction=>faction.id));
  for(const frame of LIZEEM_PRELUDE.frames){
    assert(frame.seconds>=1.5&&frame.seconds<=4);
    assert(frame.caption.split(/\s+/).length<=40,`${frame.title} must remain readable in its short shot`);
    assert(Object.values(frame.owners).every(owner=>factions.has(owner)));
    assert(frame.highlight.every(id=>id in frame.owners));
    assert.deepEqual(Object.keys(frame.owners).sort(),scenarioBefore.regions.map(region=>region.id).sort());
  }
  assert.throws(()=>{LIZEEM_PRELUDE.frames[0].owners.isareos='west';},TypeError);
  assert.throws(()=>{LIZEEM_PRELUDE.factions.find(f=>f.id==='minora').name='Changed';},TypeError);
  assert.deepEqual(session.snapshot(),snapshot);assert.deepEqual(session.checkpoint(),checkpoint);
  assert.deepEqual(LIZEEM_SCENARIO,scenarioBefore,'Presentation data must not mutate live scenario definitions');
  assert.equal(session.snapshot().day,0,'The thirty historical days do not become thirty campaign turns');
});
