import test from 'node:test';
import assert from 'node:assert/strict';
import {createOremindi} from '../src/content/chapters/oremindi/chapter.js';
import {oremindiJournal} from '../src/content/chapters/oremindi/journal.js';
import {initialYunethre,createYunethre,BATTLE_END} from '../src/content/chapters/yunethre/chapter.js';
const send=(c,type,fields={})=>assert.equal(c.command({type,...fields}).ok,true,type);
test('the Chapter 3 journal distinguishes pending proof, carried inventory, waiting and completed report',()=>{
  const c=createOremindi();let view=oremindiJournal(c.snapshot());assert.equal(view.activeChapter,'chapter-three');assert.equal(view.active.id,'refuge');assert.equal(view.deadline,null);
  for(const type of ['arrive-refuge','brief','meet-rangers','start-ambush'])send(c,type);
  send(c,'ambush-result',{attempt:1,result:'victory',fallen:2,retreated:true});view=oremindiJournal(c.snapshot());assert.equal(view.active.id,'proof');assert.deepEqual(view.inventory,[]);
  send(c,'collect-proof');view=oremindiJournal(c.snapshot());assert.equal(view.active.id,'alliance');assert.equal(view.inventory[0].quantity,1);
  send(c,'present-proof');view=oremindiJournal(c.snapshot());assert.equal(view.deadline.status,'running');assert.equal(view.deadline.seconds,360);assert.equal(view.inventory.length,0);
  send(c,'visit-rendezvous');send(c,'wait-rendezvous');assert.equal(oremindiJournal(c.snapshot()).deadline.status,'ready');
  send(c,'start-battle');assert.equal(oremindiJournal(c.snapshot()).deadline.status,'active');send(c,'battle-result',{attempt:1,result:'victory',chiefDefeated:true});
  view=oremindiJournal(c.snapshot());assert.equal(view.active.id,'report');assert.equal(view.deadline,null);assert.equal(view.complete,false);send(c,'report');
  view=oremindiJournal(c.snapshot());assert.equal(view.complete,true);assert.equal(view.active.destination,null);assert(view.chapters[2].entries.every(e=>e.status==='completed'));
});
test('failed and withdrawn attempts remain visible without marking their objective complete',()=>{
  const c=createOremindi();for(const type of ['arrive-refuge','brief','meet-rangers','start-ambush'])send(c,type);
  send(c,'ambush-result',{attempt:1,result:'defeat',fallen:0,retreated:false});send(c,'start-ambush');send(c,'ambush-result',{attempt:2,result:'withdrawal',fallen:1,retreated:false});
  const view=oremindiJournal(c.snapshot()),log=view.chapters[2].entries;assert.equal(view.active.id,'ambush');assert.equal(log.find(e=>e.id==='ambush').status,'current');
  assert.equal(log.find(e=>e.id==='ambush-defeat').status,'failed');assert.equal(log.find(e=>e.id==='ambush-withdrawal').status,'skipped');
});
test('unattended Chapter 2 is background information, not a list of hero accomplishments',()=>{
  const c=createYunethre(initialYunethre());for(const type of ['brief','depart'])send(c,type);c.advance(BATTLE_END);
  send(c,'visit',{place:'town'});send(c,'laketown-decision',{decision:'decline'});send(c,'return');
  const previous={chapter:c.snapshot(),history:null},before=structuredClone(previous),state=createOremindi().snapshot();
  const direct=oremindiJournal(state,previous,null,{historySource:'unattended'});assert.equal(direct.chapters[1].provenance,'unattended');assert(direct.chapters[1].entries.every(e=>e.status==='information'));
  const played=oremindiJournal(state,previous);assert(played.chapters[1].entries.some(e=>e.status==='completed'));assert.deepEqual(previous,before,'read-only projection preserves historical data');
  assert.equal(direct.chapters.length,3);assert.match(direct.chapters[2].entries[0].detail,/not control/);
});
