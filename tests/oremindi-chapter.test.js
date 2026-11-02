import test from 'node:test';
import assert from 'node:assert/strict';
import {createOremindi,initialOremindi,validOremindi,oremindiInventory,oremindiPolitics,oremindiObjective,RENDEZVOUS_DELAY} from '../src/content/chapters/oremindi/chapter.js';
import {newOremindiSave,unattendedChapterTwo,validOremindiSave,oremindiStore,OREMINDI_SAVE_KEY,OREMINDI_REGION_IDS} from '../src/content/chapters/oremindi/checkpoint.js';
import {TOWER_SPAWN} from '../src/app/exploration/tower-state.js';
import {REGION_CELLS,REGION_NAME_BY_ID} from '../src/world/terrain/region-world.js';
const send=(c,type,fields={})=>{const result=c.command({type,...fields});assert.equal(result.ok,true,`${type}: ${result.reason}`);return result;};
function assigned(){const c=createOremindi();for(const type of ['arrive-refuge','brief','meet-rangers'])send(c,type);return c;}
function proof(c){const {attempt}=send(c,'start-ambush');send(c,'ambush-result',{attempt,result:'victory',fallen:2,retreated:true});send(c,'collect-proof');send(c,'present-proof');return c;}
test('Chapter 3 gates the assignment, physical proof and alliance as distinct transactions',()=>{
  const c=createOremindi(),before=c.snapshot();assert(validOremindi(before));assert.equal(oremindiObjective(before).destination.id,'refuge');
  for(const type of ['brief','meet-rangers','start-ambush','collect-proof','present-proof','start-battle','report'])assert.equal(c.command({type}).ok,false,type);
  assert.deepEqual(c.snapshot(),before);
  for(const type of ['arrive-refuge','brief','meet-rangers'])send(c,type);
  const {attempt}=send(c,'start-ambush');assert.equal(attempt,1);assert.equal(send(c,'start-ambush').attempt,1);
  assert.equal(c.command({type:'ambush-result',attempt,result:'victory',fallen:2,retreated:false}).ok,false,'last raider must actually escape');
  send(c,'ambush-progress',{attempt,fallen:2,retreated:false});assert.equal(c.snapshot().proof,'unavailable');
  send(c,'ambush-result',{attempt,result:'victory',fallen:2,retreated:true});assert.equal(c.snapshot().proof,'available');assert.deepEqual(oremindiInventory(c.snapshot()),[]);
  assert.equal(c.command({type:'present-proof'}).ok,false);assert.equal(oremindiObjective(c.snapshot()).id,'proof');
  send(c,'collect-proof');send(c,'collect-proof');assert.equal(oremindiInventory(c.snapshot()).length,1);
  send(c,'present-proof');const alliance=c.snapshot();assert.deepEqual(oremindiInventory(alliance),[]);assert.equal(alliance.rendezvousAt,RENDEZVOUS_DELAY);
  c.advance(45);send(c,'present-proof');assert.equal(c.snapshot().rendezvousAt,alliance.rendezvousAt,'repeat talk never resets rendezvous');
});
test('failure and withdrawal survive reload while stale callbacks cannot complete a new attempt',()=>{
  let c=assigned();const first=send(c,'start-ambush').attempt;
  send(c,'ambush-result',{attempt:first,result:'defeat',fallen:1,retreated:false});const failed=c.snapshot();
  assert.equal(send(c,'ambush-result',{attempt:first,result:'defeat',fallen:1,retreated:false}).changed,false);
  c=createOremindi(failed);const second=send(c,'start-ambush').attempt;assert.equal(second,first+1);
  const before=c.snapshot();assert.equal(c.command({type:'ambush-result',attempt:first,result:'victory',fallen:2,retreated:true}).ok,false);assert.deepEqual(c.snapshot(),before);
  send(c,'ambush-result',{attempt:second,result:'withdrawal',fallen:0,retreated:false});assert.equal(c.snapshot().proof,'unavailable');
  proof(c);assert.equal(c.snapshot().rangerAlliance,true);assert.equal(c.snapshot().ambush.attempt,3);assert(c.snapshot().events.some(e=>e.type==='ambush-defeat'));
});
test('the rendezvous uses six active minutes and waiting advances the same persisted clock',()=>{
  const c=createOremindi();c.advance(500);assert.equal(c.snapshot().elapsed,0);
  for(const type of ['arrive-refuge','brief','meet-rangers'])send(c,type);c.advance(17);proof(c);
  c.advance(300,false);assert.equal(c.snapshot().elapsed,17);
  assert.equal(c.command({type:'wait-rendezvous'}).ok,false);assert.equal(c.command({type:'start-battle'}).ok,false);
  send(c,'visit-rendezvous');c.advance(100.25);const resumed=createOremindi(c.snapshot());
  const wait=send(c,'wait-rendezvous');assert.equal(wait.advanced,259.75);resumed.advance(59.75);resumed.advance(200);
  const a=c.snapshot(),b=resumed.snapshot();assert.equal(a.elapsed,b.elapsed);assert.equal(a.elapsed,377);
  assert.deepEqual(a.events.filter(e=>e.type!=='rendezvous-waited'),b.events);
  assert.equal(send(c,'wait-rendezvous').advanced,0);c.advance(5000);assert.equal(send(c,'start-battle').attempt,1,'late arrival has no arbitrary failure');
});
test('encounters hold campaign time; victory needs the chief and the report remains explicit',()=>{
  const c=assigned(),ambush=send(c,'start-ambush').attempt;c.advance(500);assert.equal(c.snapshot().elapsed,0);
  send(c,'ambush-result',{attempt:ambush,result:'victory',fallen:2,retreated:true});send(c,'collect-proof');send(c,'present-proof');send(c,'visit-rendezvous');send(c,'wait-rendezvous');
  const {attempt}=send(c,'start-battle');c.advance(999);assert.equal(c.snapshot().elapsed,360);
  assert.equal(c.command({type:'battle-result',attempt,result:'victory',chiefDefeated:false}).ok,false);
  send(c,'battle-result',{attempt,result:'withdrawal',chiefDefeated:false});const retry=send(c,'start-battle');assert.equal(retry.attempt,2);
  assert.equal(c.command({type:'battle-result',attempt,result:'victory',chiefDefeated:true}).ok,false);
  send(c,'battle-result',{attempt:retry.attempt,result:'victory',chiefDefeated:true});assert.equal(c.snapshot().reported,false);
  const politics=oremindiPolitics(c.snapshot());assert.equal(politics.southOremindiOwner,'oremindi-south-orcs');assert.equal(politics.regionalConquest,false);assert.equal(politics.towerRefuge.regionalControl,false);
  send(c,'report');const done=c.snapshot();send(c,'report');c.advance(1000);assert.deepEqual(c.snapshot(),done);assert.equal(oremindiObjective(done).id,'complete');
});
test('invalid restores and non-finite clock commands cannot rewrite valid chapter facts',()=>{
  const c=proof(assigned()),before=c.snapshot();
  for(const change of [s=>s.proof='carried',s=>s.rendezvousAt++,s=>s.events=[],s=>s.battle.status='victory',s=>s.elapsed=NaN,s=>s.ambush.attempt=0]){
    const bad=structuredClone(before);change(bad);assert.equal(validOremindi(bad),false);assert.equal(c.restore(bad).ok,false);assert.deepEqual(c.snapshot(),before);
  }
  for(const seconds of [-1,NaN,Infinity])assert.equal(c.advance(seconds).ok,false);
  assert.deepEqual(c.snapshot(),before);assert.throws(()=>createOremindi({...initialOremindi(),proof:'carried'}),/Incompatible/);
});
let background;
const history=()=>structuredClone(background??=unattendedChapterTwo());
test('the direct Chapter 3 premise is explicitly unattended with no fabricated alliance',()=>{
  const save=newOremindiSave();assert(validOremindiSave(save));background=structuredClone(save.history);
  assert.equal(save.historySource,'unattended');assert.equal(save.history.chapter.returned,true);assert.equal(save.history.chapter.battle.joined,null);
  assert.equal(save.history.chapter.centaurProtection,false);assert.equal(save.history.chapter.celderAlliance,false);assert.equal(save.history.chapter.laketown,'declined');
  assert.equal(save.history.history.fullCampaign,true);assert.equal(save.chapter.arrived,false);assert.equal(save.tower.location,'world');assert.equal(save.riding.owned,true);
});
test('continuation retains Chapter 1 and 2 facts and horse independently of the new chapter',()=>{
  const prior=history();prior.riding.horse={x:-2500,z:90,yaw:.7};const before=structuredClone(prior),save=newOremindiSave(prior);
  assert(validOremindiSave(save));assert.equal(save.historySource,'played');assert.deepEqual(save.history,prior);assert.deepEqual(save.riding,prior.riding);
  save.riding.horse.x+=5;save.history.chapter.elapsed++;assert.deepEqual(prior,before);
  assert.throws(()=>newOremindiSave({...prior,chapter:{...prior.chapter,returned:false}}),/Finish Chapter 2/);
});
test('Chapter 3 checkpoints admit the ten authored outdoor regions and require arrival for interior saves',()=>{
  const save=newOremindiSave(history());assert.deepEqual(OREMINDI_REGION_IDS,[16,17,25,13,14,38,61,62,37,33]);
  for(const id of OREMINDI_REGION_IDS){const cell=REGION_CELLS[REGION_NAME_BY_ID[id]][0];save.exploration.position={x:cell.x,y:20,z:cell.z};assert(validOremindiSave(save),'region '+id);}
  const outside=REGION_CELLS[REGION_NAME_BY_ID[32]][0];save.exploration.position={x:outside.x,y:20,z:outside.z};assert.equal(validOremindiSave(save),false);
  save.tower.location='tower';save.exploration.position={...TOWER_SPAWN};assert.equal(validOremindiSave(save),false);
  const c=createOremindi(save.chapter);send(c,'arrive-refuge');save.chapter=c.snapshot();assert(validOremindiSave(save));
});
test('invalid Chapter 3 storage writes leave the previous separate save untouched',()=>{
  const memory=new Map(),store=oremindiStore({getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)}),save=newOremindiSave(history());
  assert(store.save(save).ok);const raw=memory.get(OREMINDI_SAVE_KEY);assert.deepEqual(store.read().data,save);
  assert.equal(store.save({...save,chapter:{...save.chapter,proof:'carried'}}).ok,false);assert.equal(memory.get(OREMINDI_SAVE_KEY),raw);
  memory.set(OREMINDI_SAVE_KEY,'broken');assert.equal(store.read().ok,false);assert.equal(memory.get(OREMINDI_SAVE_KEY),'broken');
});

test('Chapter 3 accepts older saves without sorcery and persists validated mana independently of history',()=>{
  const memory=new Map(),store=oremindiStore({getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)}),save=newOremindiSave(history());
  assert(validOremindiSave(save));const previous=structuredClone(save.history);
  save.sorcery={version:1,mana:60,rest:3,cooldown:0};assert(store.save(save).ok);
  assert.deepEqual(store.read().data.sorcery,save.sorcery);assert.deepEqual(store.read().data.history,previous);
  for(const mana of [-1,101,null,'60'])assert.equal(store.save({...save,sorcery:{...save.sorcery,mana}}).ok,false);
  assert.equal(store.read().data.sorcery.mana,60);
});
