import test from 'node:test';
import assert from 'node:assert/strict';
import {createYunethre,initialYunethre,validYunethre,BATTLE_START,BATTLE_END,yunethrePolitics} from '../src/content/chapters/yunethre/chapter.js';
import {newYunethreSave,validYunethreSave,yunethreStore,YUNETHRE_SAVE_KEY,yunethreRiding} from '../src/content/chapters/yunethre/checkpoint.js';
import {settledOwners} from '../src/app/exploration/league-settlement.js';
import {yunethreMap} from '../src/content/chapters/yunethre/map.js';
import {surroundingFactionHTML} from '../src/ui/map/surrounding-map-info.js';
import {createUnattendedLookout} from '../src/dev/tools/lizeem-lookout-preview.js';
import {createAdventureWar} from '../src/experiments/day-night/opening-war.js';
import {LOOKOUT_TALETH,TOWER_SPAWN} from '../src/app/exploration/tower-state.js';
import {MODES,allowsRegion} from '../src/app/exploration/modes.js';
import {REGION_CELLS,REGION_NAME_BY_ID} from '../src/world/terrain/region-world.js';
import {MINORA_STABLE} from '../src/content/regions/minora-frontier/minora-stable.js';
import {yunethreResidentCampaign} from '../src/content/chapters/yunethre/resident-context.js';
import {residentWords} from '../src/app/exploration/resident-dialogue.js';
const doIt=(c,command)=>assert.equal(c.command(command).ok,true,JSON.stringify(command));
test('Chapter 2 townspeople remember the completed campaign without resuming or rewriting it',()=>{
  const save=newYunethreSave(),before=structuredClone(save);
  const context=yunethreResidentCampaign(save);
  assert.equal(context.winner,save.chapter.premise.winner);
  assert.deepEqual(context,createAdventureWar(save.history).snapshot());
  assert.ok(context.regions.isareos,'the civic dialogue receives the real regional ledger');
  assert.match(residentWords('portunus','hello',context),/Lizeemi League/);
  assert.match(residentWords('portunus','memory',context),/let the armies decide/);
  const chapter=createYunethre(save.chapter);doIt(chapter,{type:'brief'});doIt(chapter,{type:'depart'});chapter.advance(120);
  assert.deepEqual(save,before,'talk and the new chapter leave saved war history intact');
  assert.deepEqual(yunethreResidentCampaign(save),context,'the historical snapshot does not tick with Chapter 2');
  const old=yunethreResidentCampaign({history:null,chapter:initialYunethre()});
  assert.equal(old.winner,'west');assert.deepEqual(old.regions,{});
  assert.deepEqual(old.engagements,[],'legacy direct saves do not invent battle memories');
});
function departed(seed=2201026){const c=createYunethre(null,{seed});doIt(c,{type:'brief'});doIt(c,{type:'depart'});return c;}
function peace(c){for(const side of ['centaurs','celder']){doIt(c,{type:'visit',place:side});doIt(c,{type:'compact',side});}}
test('a fresh Chapter 2 starts by Taleth at the lookout after the actual unattended current campaign',()=>{
  const unattended=createAdventureWar();unattended.advance(1000);
  const save=newYunethreSave();assert(validYunethreSave(save));
  assert.equal(save.chapter.premise.source,'unattended');assert.equal(save.chapter.premise.winner,unattended.snapshot().winner);
  assert.deepEqual(save.history.simulation,unattended.checkpoint().simulation);
  assert.equal(save.history.fullCampaign,true);assert.equal(save.tower.location,'lookout');assert.equal(save.tower.briefed,true);
  assert.equal(save.chapter.briefed,false);assert.equal(save.chapter.departed,false);assert.equal(save.chapter.elapsed,0);
  assert(Math.hypot(save.exploration.position.x-LOOKOUT_TALETH.x,save.exploration.position.z-LOOKOUT_TALETH.z)<3);
  assert.equal(save.exploration.position.y,LOOKOUT_TALETH.y);
  assert.deepEqual(save.riding,{version:1,owned:true,taught:true,horse:{...MINORA_STABLE.horse}});
});
test('legacy direct saves retain progress while accepting separate tower access and all eight outdoor regions',()=>{
  const save={format:'azhora-yunethre',version:1,history:null,chapter:initialYunethre(),
    tower:{version:1,location:'tower',briefed:false,running:false},
    exploration:{version:1,character:'teresod',position:{...TOWER_SPAWN},heading:0,camera:{yaw:0,pitch:.27,distance:8},elapsed:0,cells:[]}};
  assert(validYunethreSave(save));assert.equal(yunethreRiding(save).owned,true);
  const c=createYunethre(save.chapter);doIt(c,{type:'brief'});doIt(c,{type:'depart'});c.advance(123);save.chapter=c.snapshot();
  save.tower={version:1,location:'world',briefed:true,running:false};
  assert.deepEqual(MODES.yunethre.regions,[16,17,25,13,14,38,61,62]);
  for(const id of MODES.yunethre.regions){
    assert(allowsRegion(MODES.yunethre,id));const cell=REGION_CELLS[REGION_NAME_BY_ID[id]][0];
    save.exploration.position={x:cell.x,y:20,z:cell.z};assert(validYunethreSave(save),'region '+id);
  }
  const memory=new Map(),storage={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)},store=yunethreStore(storage);
  assert(store.save(save).ok);assert.deepEqual(store.read().data,save);assert.equal(store.read().data.chapter.elapsed,123);
  save.exploration.position={...TOWER_SPAWN};save.tower.briefed=false;assert.equal(validYunethreSave(save),false);
});
test('continuing Chapter 1 retains the owned horse without relocating it',()=>{
  const prior=createUnattendedLookout();prior.riding={version:1,owned:true,taught:true,horse:{x:-2500,z:65,yaw:.7}};
  const save=newYunethreSave(prior);assert(validYunethreSave(save));assert.deepEqual(save.riding,prior.riding);assert.deepEqual(save.history,prior);
  save.riding.horse.x+=5;assert.notEqual(save.riding.horse.x,prior.riding.horse.x);
  assert.equal(validYunethreSave({...save,riding:{...save.riding,horse:{x:Infinity,z:1,yaw:0}}}),false);
});
test('departure starts the deadline; holds and partitioned ticks preserve it',()=>{
  const c=createYunethre();c.advance(999);assert.equal(c.snapshot().elapsed,0);doIt(c,{type:'brief'});c.advance(99);assert.equal(c.snapshot().elapsed,0);
  doIt(c,{type:'depart'});c.advance(1000,false);assert.equal(c.snapshot().elapsed,0);
  c.advance(899.5);assert.equal(c.snapshot().battle.status,'pending');c.advance(.5);assert.equal(c.snapshot().battle.status,'active');
  const other=departed();other.advance(900);assert.deepEqual(c.snapshot(),other.snapshot());
});
test('two-party consent before the deadline averts battle and opens immediate accession',()=>{
  const c=departed();c.advance(BATTLE_START-.01);peace(c);
  assert.equal(c.snapshot().battle.status,'averted');doIt(c,{type:'visit',place:'town'});doIt(c,{type:'laketown-decision',decision:'join'});
  assert.equal(c.snapshot().laketown,'league');const before=c.snapshot();c.advance(10000);assert.deepEqual(c.snapshot(),before);
  assert.equal(c.snapshot().celderAlliance,false);assert.equal(c.snapshot().centaurProtection,true);
});
test('one consent does not avert the battle; late peace cannot rewrite it',()=>{
  const c=departed();doIt(c,{type:'visit',place:'centaurs'});doIt(c,{type:'compact',side:'centaurs'});c.advance(BATTLE_START);
  doIt(c,{type:'visit',place:'celder'});const before=c.snapshot();assert.equal(c.command({type:'compact',side:'celder'}).ok,false);assert.deepEqual(c.snapshot(),before);
});
test('neutral outcomes are seeded, survive reload, and never annex Laketown',()=>{
  const winners=new Set();let centaurCount=0;
  for(let seed=0;seed<100;seed++){
    const c=departed(Math.imul(seed+1,2654435761)>>>0);c.advance(912);const restored=createYunethre(c.snapshot());c.advance(500);restored.advance(108);
    assert.deepEqual(c.snapshot(),restored.snapshot());const s=c.snapshot();winners.add(s.battle.winner);if(s.battle.winner==='centaurs')centaurCount++;
    assert.equal(s.laketown,'autonomous');assert.equal(s.celderAlliance,false);
    doIt(c,{type:'visit',place:'town'});
    if(s.battle.winner==='celder')doIt(c,{type:'laketown-decision',decision:'join'});
    else{assert.equal(c.command({type:'laketown-decision',decision:'join'}).ok,false);doIt(c,{type:'visit',place:'centaurs'});doIt(c,{type:'protect'});doIt(c,{type:'laketown-decision',decision:'join'});}
  }
  assert.equal(winners.size,2);assert.ok(centaurCount>30&&centaurCount<70);
});
test('hero combat result cannot be overwritten by the statistical deadline; conquest is separate',()=>{
  const c=departed();c.advance(BATTLE_START);doIt(c,{type:'join',side:'celder'});c.advance(1000);assert.equal(c.snapshot().battle.status,'active');
  doIt(c,{type:'battle-result',result:'victory'});assert.equal(c.snapshot().laketown,'autonomous');assert.equal(c.snapshot().celderAlliance,false);
  doIt(c,{type:'capture-laketown'});assert.equal(c.snapshot().laketown,'celder');assert.equal(c.snapshot().celderAlliance,true);
  const lose=departed();lose.advance(BATTLE_START);doIt(lose,{type:'join',side:'celder'});doIt(lose,{type:'battle-result',result:'defeat'});assert.equal(lose.command({type:'capture-laketown'}).ok,false);
});
test('elf hostility blocks membership; declining still permits continuation',()=>{
  const c=departed();peace(c);doIt(c,{type:'visit',place:'town'});doIt(c,{type:'elf-hostility',value:true});assert.equal(c.command({type:'laketown-decision',decision:'join'}).ok,false);
  doIt(c,{type:'laketown-decision',decision:'decline'});doIt(c,{type:'return'});assert.equal(c.snapshot().returned,true);
});
test('handoff preserves history, allied sovereignty and the orc-owned tower region',()=>{
  const war=createUnattendedLookout();
  const original=structuredClone(war),save=newYunethreSave(war),c=createYunethre(save.chapter);doIt(c,{type:'brief'});doIt(c,{type:'depart'});peace(c);doIt(c,{type:'visit',place:'town'});doIt(c,{type:'laketown-decision',decision:'join'});doIt(c,{type:'return'});
  assert.equal(war.simulation.winner,undefined,'Real checkpoints store replay commands, not an invented winner field');assert.equal(validYunethreSave(save),true);
  const p=yunethrePolitics(c.snapshot());assert.equal(p.originalLeagueOwner,'blood-prince');assert.equal(p.laketownOwner,'wizards-league');assert.equal(p.towerRefuge.regionalControl,false);assert.equal(p.southOremindiOwner,'oremindi-south-orcs');assert.deepEqual(war,original);assert.deepEqual(save.history,war);
  const map=yunethreMap(c.snapshot());assert.equal(map.reference.regions['South Oremindi Mountains'].owner,'oremindi-south-orcs');
  assert.match(surroundingFactionHTML(map.reference.factions.find(f=>f.id==='celder'),map.reference,['North Celder']),/peace compact/);
});
test('invalid chapter saves and restores are rejected without replacing the earlier checkpoint',()=>{
  const memory=new Map(),storage={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)},store=yunethreStore(storage),save=newYunethreSave();
  assert.equal(validYunethreSave(save),true);assert.equal(store.save(save).ok,true);const raw=memory.get(YUNETHRE_SAVE_KEY);
  for(const broken of [{...save,chapter:{...save.chapter,elapsed:-1}},{...save,chapter:{...save.chapter,departed:true}},{...save,tower:{...save.tower,location:'world',briefed:true}}]){assert.equal(store.save(broken).ok,false);assert.equal(memory.get(YUNETHRE_SAVE_KEY),raw);}
  const c=departed(),before=c.snapshot();assert.equal(c.restore({...before,battle:{status:'averted',winner:null,joined:null}}).ok,false);assert.deepEqual(c.snapshot(),before);
  assert.equal(validYunethre({...initialYunethre(),seed:NaN}),false);
  assert.equal(c.restore({...before,events:[null]}).ok,false);assert.deepEqual(c.snapshot(),before);
});

test('current food campaigns must finish before continuation and retain their full elapsed history',()=>{
  const war=createAdventureWar(),template=createUnattendedLookout();
  const checkpoint=()=>({...template,...war.checkpoint(),tower:{...template.tower,location:'tower'}});
  assert.throws(()=>newYunethreSave(checkpoint()),/Finish the Lizeemi War/);
  war.advance(1000);assert.ok(war.snapshot().winner);
  const prior=checkpoint(),next=newYunethreSave(prior);
  assert.equal(validYunethreSave(next),true);assert.equal(next.chapter.premise.winner,war.snapshot().winner);
  assert.equal(next.history.fullCampaign,true);assert.deepEqual(next.history,prior);
});
test('the old unification projection cannot annex new chapter regions',()=>{
  assert.deepEqual(settledOwners({isareos:'minora',nethereum:'west',caricas:'east',yunethre:'laketown',celder:'celder'},'west'),{isareos:'west',nethereum:'west',caricas:'west',yunethre:'laketown',celder:'celder'});
});
