import test from 'node:test';
import assert from 'node:assert/strict';
import {createYunethre,initialYunethre,BATTLE_START,BATTLE_END} from '../src/content/chapters/yunethre/chapter.js';
import {yunethreJournal} from '../src/content/chapters/yunethre/journal.js';

const act=(c,command)=>assert.equal(c.command(command).ok,true,JSON.stringify(command));
function departed(seed=2201026){const c=createYunethre(null,{seed});act(c,{type:'brief'});act(c,{type:'depart'});return c;}
function agree(c,side){act(c,{type:'visit',place:side});act(c,{type:'compact',side});}
function peace(){const c=departed();agree(c,'centaurs');agree(c,'celder');return c;}
const chapter=(j,id='chapter-two')=>j.chapters.find(c=>c.id===id);
const find=(j,id,which='chapter-two')=>chapter(j,which).entries.find(e=>e.id===id);
function neutralWinner(winner){for(let seed=0;seed<100;seed++){const c=departed(Math.imul(seed+1,2654435761)>>>0);c.advance(BATTLE_END);if(c.snapshot().battle.winner===winner)return c;}throw Error('No fixture seed found');}

test('the initial assignment is actionable and a tower departure is not already completed',()=>{
 const c=createYunethre(),j=yunethreJournal(c.snapshot());
 assert.equal(j.active.id,'assignment');assert.equal(j.active.destination.id,'taleth');
 assert.match(j.active.action,/Sky Lookout|Taleth/);assert.match(j.active.action,/press F/);
 assert.equal(find(j,'assignment').status,'current');assert.equal(find(j,'departure').status,'pending');assert.equal(j.deadline,null);
 act(c,{type:'brief'});const next=yunethreJournal(c.snapshot());
 assert.equal(next.active.id,'departure');assert.match(next.active.action,/lookout door/);assert.match(next.active.action,/southern tower door/);
 assert.equal(find(next,'assignment').status,'completed');assert.equal(next.deadline.status,'dormant');assert.equal(next.deadline.seconds,900);
});

test('visits do not masquerade as agreements or permanently strand the objective',()=>{
 const c=departed();act(c,{type:'visit',place:'town'});act(c,{type:'visit',place:'centaurs'});
 let j=yunethreJournal(c.snapshot());assert.equal(j.active.id,'centaur-consent');
 assert.equal(find(j,'centaur-meeting').status,'completed');assert.equal(find(j,'centaur-consent').status,'current');
 assert.ok(j.active.steps.some(e=>e.id==='centaur-consent'),'The missing consent must be present in the HUD checklist');
 assert.match(j.active.action,/Agree to carry/);assert.match(j.active.purpose,/not an agreement/);
 act(c,{type:'visit',place:'celder'});j=yunethreJournal(c.snapshot());
 assert.equal(j.active.id,'centaur-consent');assert.equal(find(j,'celder-meeting').status,'completed');
 assert.notEqual(find(j,'celder-consent').status,'completed');
});

test('Celder-first consent directs an explicit return for the missing centaur agreement',()=>{
 const c=departed();agree(c,'celder');const j=yunethreJournal(c.snapshot());
 assert.equal(j.active.id,'centaur-consent');assert.equal(j.active.destination.id,'centaurs');
 assert.match(j.active.purpose,/Celder has already agreed/);assert.match(j.active.action,/Return to the centaur camp/);
 assert.match(j.active.action,/Agree to carry the safe-passage compact/);
 assert.equal(find(j,'celder-consent').status,'completed');assert.equal(find(j,'peace').status,'pending');
 assert.equal(j.deadline.status,'running');assert.match(j.deadline.text,/90 active seconds/);
});

test('centaur-first agreement directs the actual Canerd dialogue action, not merely a visit',()=>{
 const c=departed();agree(c,'centaurs');act(c,{type:'visit',place:'celder'});
 const j=yunethreJournal(c.snapshot());assert.equal(j.active.id,'celder-consent');
 assert.equal(j.active.destination.id,'celder');assert.match(j.active.action,/Travel to Canerd/);assert.match(j.active.action,/Secure Celder’s consent/);
 assert.equal(find(j,'celder-consent').status,'current');
});

test('peace completes the agreement but leaves council accession and return unfinished',()=>{
 const c=peace(),j=yunethreJournal(c.snapshot());
 assert.equal(j.active.id,'town-decision');assert.equal(j.active.destination.id,'town');assert.equal(j.deadline.status,'averted');
 assert.equal(find(j,'peace').status,'completed');assert.equal(find(j,'town-decision').status,'current');assert.equal(find(j,'return').status,'pending');
 assert.match(j.active.action,/Welcome Laketown/);assert.match(find(j,'peace').detail,/not a military alliance/);
 act(c,{type:'visit',place:'town'});act(c,{type:'laketown-decision',decision:'join'});
 const decided=yunethreJournal(c.snapshot());assert.equal(decided.active.id,'return');assert.match(decided.active.action,/Muster Gate/);
 assert.equal(find(decided,'town-decision').status,'completed');assert.equal(decided.complete,false);
 assert.doesNotMatch(decided.deadline.text,/Return to Laketown/);
});

test('expired peace is failed while a previously obtained consent remains completed',()=>{
 const c=departed();agree(c,'centaurs');c.advance(BATTLE_START);
 const j=yunethreJournal(c.snapshot());assert.equal(j.active.id,'battle');assert.equal(j.deadline.status,'active');
 assert.equal(find(j,'peace').status,'failed');assert.equal(find(j,'celder-consent').status,'skipped');
 assert.equal(find(j,'centaur-consent').status,'completed');
 assert.match(j.active.action,/Press F.*defend the centaurs or fight for Celder/);
 assert.equal(j.active.destination.id,'battle');assert.match(j.active.destination.name,/Bane’s Camp/);
 assert.match(j.active.action,/stay neutral/);assert.doesNotMatch(JSON.stringify(j),/Bane\?s/);
 assert.match(find(j,'battle').detail,/No hero participation is recorded yet/);
 act(c,{type:'join',side:'centaurs'});const joined=yunethreJournal(c.snapshot());
 assert.equal(joined.active.destination.id,'battle');assert.match(joined.active.action,/resume your joined battle/);
 assert.equal(joined.deadline.seconds,null);assert.match(find(joined,'battle').detail,/You joined the centaurs/);
});

test('surviving centaurs need a separate protection decision; accepting independence remains available',()=>{
 const c=neutralWinner('centaurs'),j=yunethreJournal(c.snapshot());
 assert.equal(j.active.id,'protection');assert.equal(j.active.destination.id,'centaurs');
 assert.match(j.active.action,/Celder will become hostile/);assert.match(j.active.action,/accept its independence/);
 assert.equal(find(j,'battle').status,'information');assert.equal(find(j,'protection').status,'current');
 act(c,{type:'visit',place:'centaurs'});act(c,{type:'protect'});
 const protectedJournal=yunethreJournal(c.snapshot());assert.equal(protectedJournal.active.id,'town-decision');assert.equal(find(protectedJournal,'protection').status,'completed');
});

test('neutral Celder victory does not invent an alliance, hero victory or annexation',()=>{
 const c=neutralWinner('celder'),j=yunethreJournal(c.snapshot());
 assert.equal(j.active.id,'town-decision');assert.equal(find(j,'battle').status,'information');
 assert.match(find(j,'battle').detail,/without you joining/);assert.match(find(j,'battle').detail,/not automatically annexed/);
 assert.equal(find(j,'capture'),undefined);assert.equal(find(j,'town-decision').status,'current');
 assert.equal(find(j,'centaur-meeting').status,'skipped');
});

test('elf hostility changes the requested action to recording independence',()=>{
 const c=peace();act(c,{type:'elf-hostility',value:true});const j=yunethreJournal(c.snapshot());
 assert.equal(j.active.id,'town-decision');assert.match(j.active.title,/independence/);assert.match(j.active.action,/remain independent/);
 assert.doesNotMatch(j.active.action,/Welcome Laketown/);assert.equal(find(j,'elven-relations').status,'information');
});

test('an unfinished recorded Celder conquest is acknowledged as unavailable rather than granted',()=>{
 const c=departed();c.advance(BATTLE_START);act(c,{type:'join',side:'celder'});act(c,{type:'battle-result',result:'victory'});
 let j=yunethreJournal(c.snapshot());assert.equal(j.active.id,'capture');assert.match(j.active.action,/not yet playable/);
 assert.equal(j.active.destination.id,'town');assert.match(j.active.action,/accept its independence/);
 assert.ok(j.active.steps.some(e=>e.id==='town-decision'),'The available council decision stays visible beside the unfinished conquest');
 assert.equal(find(j,'capture').status,'pending');assert.equal(find(j,'town-decision').status,'pending');
 act(c,{type:'capture-laketown'});j=yunethreJournal(c.snapshot());assert.equal(j.active.id,'return');assert.equal(find(j,'capture').status,'completed');
});

test('accepting independence after fighting for Celder clears the unavailable conquest without inventing an alliance',()=>{
 const c=departed();c.advance(BATTLE_START);act(c,{type:'join',side:'celder'});act(c,{type:'battle-result',result:'victory'});
 act(c,{type:'visit',place:'town'});act(c,{type:'laketown-decision',decision:'decline'});
 const j=yunethreJournal(c.snapshot());assert.equal(j.active.id,'return');assert.equal(find(j,'capture').status,'skipped');
 assert.match(find(j,'capture').detail,/accepted Laketown’s independence/);assert.match(find(j,'capture').detail,/not your military ally/);
 assert.equal(find(j,'town-decision').status,'completed');assert.equal(c.snapshot().celderAlliance,false);
});

test('a defeated Celder combatant is directed to independence rather than an impossible protection pledge',()=>{
 const c=departed();c.advance(BATTLE_START);act(c,{type:'join',side:'celder'});act(c,{type:'battle-result',result:'defeat'});
 const j=yunethreJournal(c.snapshot());assert.equal(j.active.id,'town-decision');assert.equal(j.active.destination.id,'town');
 assert.match(j.active.action,/remain independent/);assert.equal(find(j,'protection').status,'skipped');
 assert.match(find(j,'town-decision').detail,/closed the peaceful accession route/);
});

test('the complete log reveals the interrupted return only after its real trigger',()=>{
 const c=peace();act(c,{type:'visit',place:'town'});act(c,{type:'laketown-decision',decision:'decline'});
 const before=yunethreJournal(c.snapshot());assert.doesNotMatch(JSON.stringify(before),/Blood Prince|South Oremindi|messenger|seized Minora/);
 act(c,{type:'return'});const after=yunethreJournal(c.snapshot());
 assert.equal(after.complete,true);assert.equal(after.active.id,'complete');assert.equal(after.active.destination,null);
 assert.equal(after.deadline,null);
 assert.equal(find(after,'return').status,'completed');assert.equal(find(after,'news').status,'completed');
 assert.match(find(after,'news').detail,/Blood Prince/);assert.match(after.active.action,/not playable yet/);
 assert.doesNotMatch(JSON.stringify(after),/reported to Taleth|delivered.*Taleth/);
});

test('the unattended starter presents world history without synthetic horse or briefing achievements',()=>{
 const s=initialYunethre({premise:{source:'unattended',winner:'west'}});
 const snapshot={winner:'west',commands:[],events:[],engagements:[]};
 const checkpoint={tower:{briefed:true,concluded:true},riding:{owned:true,taught:true}};
 const j=yunethreJournal(s,snapshot,checkpoint),one=chapter(j,'chapter-one');
 assert.equal(one.provenance,'unattended');assert.match(one.summary,/simulated/);assert.ok(one.entries.every(e=>e.status==='information'));
 assert.equal(find(j,'chapter-one-horse','chapter-one'),undefined);assert.equal(find(j,'chapter-one-assignment','chapter-one'),undefined);
 assert.match(find(j,'chapter-one-settlement','chapter-one').detail,/West Lizeem/);
});

test('legacy direct saves state the limited premise and never infer personal history',()=>{
 const j=yunethreJournal(initialYunethre());const one=chapter(j,'chapter-one');
 assert.equal(one.provenance,'unrecorded');assert.ok(one.entries.every(e=>e.status==='information'));
 assert.match(find(j,'chapter-one-unrecorded','chapter-one').detail,/No completed encounters/);
});

test('carried Chapter 1 progress records evidenced introductions and actual encounter outcomes separately',()=>{
 const s=initialYunethre({premise:{source:'chapter-one',winner:'east'}});
 const commands=[
  {type:'hero-result',day:3,id:'ovesos-1',faction:'east',outcome:'success',reason:'vanguard-broken'},
  {type:'hero-result',day:3,id:'ovesos-1:rally',faction:'east',outcome:'defeat',reason:'driven-back'},
  {type:'hero-result',day:7,id:'caricas-2',faction:null,outcome:'withdraw',reason:'declined'},
 ];
 const history={winner:'east',commands,engagements:[{id:'ovesos-1',region:'ovesos'},{id:'caricas-2',region:'caricas'}],events:[
  {type:'hero-result',id:43,day:3,battleId:'ovesos-1',region:'ovesos',faction:'east',outcome:'success',reason:'vanguard-broken',objective:{removed:8}},
  {type:'rally-result',id:44,day:3,battleId:'ovesos-1',region:'ovesos',faction:'east',outcome:'defeat',reason:'driven-back',removed:2},
 ]};
 const checkpoint={tower:{briefed:true,concluded:true},riding:{owned:true,taught:true},campaignSide:'east'};
 const j=yunethreJournal(s,history,checkpoint);
 for(const id of ['chapter-one-assignment','chapter-one-allegiance','chapter-one-horse','chapter-one-review'])assert.equal(find(j,id,'chapter-one').status,'completed');
 const results=chapter(j,'chapter-one').entries.filter(e=>e.id.startsWith('chapter-one-encounter-'));
 assert.deepEqual(results.map(e=>e.status),['completed','failed','skipped']);
 assert.match(results[0].title,/Reinforcement interception at Ovesos/);assert.match(results[0].detail,/8 enemy reinforcement/);
 assert.match(results[1].title,/Rally assault/);assert.match(results[1].detail,/2 enemy army/);
 assert.match(results[2].detail,/declined/);assert.doesNotMatch(results.map(e=>e.detail).join(' '),/You won the war|You captured/);
});

test('a bare carried campaign snapshot does not fabricate missing local quest flags',()=>{
 const s=initialYunethre({premise:{source:'chapter-one',winner:'west'}}),j=yunethreJournal(s,{winner:'west',commands:[],events:[]});
 assert.equal(find(j,'chapter-one-horse','chapter-one'),undefined);assert.equal(find(j,'chapter-one-assignment','chapter-one'),undefined);
 assert.equal(find(j,'chapter-one-local-record','chapter-one').status,'information');
});

test('save/reload derives identical presentation without mutating frozen campaign records',()=>{
 const c=peace();act(c,{type:'visit',place:'town'});const state=c.snapshot(),history={winner:'west',commands:[],events:[],engagements:[]};
 const freeze=o=>{if(o&&typeof o==='object'){Object.freeze(o);Object.values(o).forEach(freeze);}return o;};freeze(state);freeze(history);
 const before=JSON.stringify({state,history}),first=yunethreJournal(state,history);
 assert.deepEqual(yunethreJournal(JSON.parse(JSON.stringify(state)),JSON.parse(JSON.stringify(history))),first);
 assert.equal(JSON.stringify({state,history}),before);assert.ok(first.active.steps.length<=4);
 assert.throws(()=>yunethreJournal(null),/snapshot/);
});
