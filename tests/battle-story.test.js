import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorldWar,WORLD_WAR_SCENARIO,RALLY_WORLD_WAR_SCENARIO} from '../src/app/exploration/world-war.js';
import {createCampaign,replayCampaign} from '../src/simulation/campaign.js';
import {battlePhase,battleProgress,phaseDebrief} from '../src/app/exploration/battle-progress.js';
import {battleConsequence,latestPersonalBattle,councilBattleResponse,councilBalance} from '../src/app/exploration/battle-consequences.js';
import {worldWarReports} from '../src/app/exploration/war-reports.js';
import {councilInfluence} from '../src/app/exploration/council-state.js';
import {openingWarGuidance} from '../src/app/exploration/war-guidance.js';

function enter(){const w=createWorldWar();w.advance(3);w.syncRegion('Caricas');const c=w.campaign,b=c.snapshot().engagements[0];assert(c.joinBattle(b.id,b.location).ok);return {c,b};}
function complete(side='west',success=true){
  const {c,b}=enter();assert(c.resolveEncounter(b.id,side,'withdraw','withdrew',1,{escaped:1}).ok);
  assert(c.joinBattle(b.id,b.location).ok);assert(c.resolveEncounter(b.id,side,'success','vanguard-broken',1,{escaped:0}).ok);
  assert(c.joinBattle(b.id,b.location).ok);let p=c.snapshot().pending;
  assert(c.resolveEncounter(p.id,side,'withdraw','withdrew',2).ok);assert(c.joinBattle(b.id,b.location).ok);p=c.snapshot().pending;
  assert(c.resolveEncounter(p.id,side,success?'success':'defeat',success?'rally-secured':'time-expired',success?p.rally.guards:0).ok);
  return {c,b};
}
test('phase presentation retains partial progress and shows the actual next opposition',()=>{
  const {c,b}=enter();let p=c.snapshot().pending;
  assert.equal(battlePhase(p).total,2);assert.match(battlePhase(p).path,/Interception.*Final assault.*Battle result/);
  assert(c.resolveEncounter(b.id,'west','withdraw','withdrew',1,{escaped:1}).ok);assert(c.joinBattle(b.id,b.location).ok);p=c.snapshot().pending;
  const field={guards:[{hp:0}],outcome:'success'},before=c.snapshot();
  assert.match(battleProgress(p,field).detail,/2 stopped.*1 escaped.*0 remaining/);
  const review=phaseDebrief(p,field,{regionName:'Caricas',allyName:'West Lizeem',strength:12});
  assert.deepEqual(review.facts[1],['Your effect','8 / 12 enemy strength removed']);
  assert.match(review.facts[2][1],/4 rally guards/);assert.match(review.detail,/control of Caricas has not changed/);
  assert.deepEqual(c.snapshot(),before,'Reading feedback has no simulation effect');
  assert(c.resolveEncounter(p.id,'west','success','vanguard-broken',1,{escaped:0}).ok);assert(c.joinBattle(b.id,b.location).ok);p=c.snapshot().pending;
  assert.equal(p.rally.guards,4);assert.equal(battlePhase(p).number,2);
  assert.match(battleProgress(p,{guards:[],objective:{held:2.75}}).detail,/2.8 \/ 6s/);
  const final=phaseDebrief(p,{guards:Array.from({length:4},()=>({hp:0})),outcome:'success'},{regionName:'Caricas',allyName:'West Lizeem'});
  assert.match(final.next,/no extra days/);assert.deepEqual(final.facts[2],['Time','Day 4 → day 6 on Continue']);
});
test('both sides receive accurate final receipts, council reactions and replay-stable totals',()=>{
  for(const side of ['west','east']){
    const {c,b}=complete(side),state=c.snapshot(),before=structuredClone(state),record=latestPersonalBattle(state);
    assert.equal(record.region,'Caricas');assert.equal(record.day,6);assert.equal(record.winner,side);assert(record.decisive&&record.won);
    assert.equal(record.intercepted,8);assert.equal(record.rally,4);assert.match(record.explanation,/Your final assault secured/);
    assert.equal(worldWarReports(state,WORLD_WAR_SCENARIO,()=>true).find(r=>r.battleId===b.id).summary.eventId,record.eventId);
    const favored=side==='west'?'mayor':'temple',opposed=side==='west'?'temple':'mayor';
    assert.equal(councilInfluence(state).leader,favored);assert.match(councilBattleResponse(favored,state).words,/Word has reached us/);
    assert.match(councilBattleResponse(opposed,state).words,/do not mistake hospitality for approval/);
    assert.match(councilBattleResponse('taleth',state).words,/your final assault/);
    assert.match(councilBalance(state),/provisional; the war is not over/);
    assert.deepEqual(state,before);assert.deepEqual(latestPersonalBattle(replayCampaign(WORLD_WAR_SCENARIO,state).snapshot()),record);
    state.regions.caricas.owner=side==='west'?'east':'west';assert.deepEqual(latestPersonalBattle(state),record,'Later occupation cannot rewrite the result');
    state.winner=side==='west'?'east':'west';assert.match(councilBattleResponse('taleth',state).balance,/has won the war/);
  }
});
test('timeout, no intervention and active battles are not falsely credited as decisive victories',()=>{
  const {c}=complete('west',false),state=c.snapshot(),record=latestPersonalBattle(state);
  assert(!record.decisive);assert.match(record.explanation,/armies resolved/);assert.equal(record.rally,2);
  assert.doesNotMatch(councilBattleResponse('taleth',state).words,/your final assault drove/);
  const w=createWorldWar();w.advance(3);assert.equal(latestPersonalBattle(w.snapshot()),null);assert.equal(councilBattleResponse('mayor',w.snapshot()),null);
  w.advance(3);const s=w.snapshot(),b=s.engagements[0],unassisted=battleConsequence(s,b);
  assert.equal(latestPersonalBattle(s),null);assert.match(unassisted.explanation,/without your intervention/);
  assert.equal(openingWarGuidance('council',{owned:true}).label,'Minora / Council of Three');
});
test('old rally saves and one-phase sites retain their distinct flow',()=>{
  const c=createCampaign(RALLY_WORLD_WAR_SCENARIO);c.step(5);c.locateHero('ovesos');const b=c.snapshot().engagements[0];c.joinBattle(b.id,b.location);
  const p=c.snapshot().pending;assert.equal(phaseDebrief(p,{guards:[]},{}),null);
  c.resolveEncounter(b.id,'west','success','vanguard-broken',3);c.joinBattle(b.id,b.location);const last=c.snapshot().pending;
  c.resolveEncounter(last.id,'west','success','rally-secured',last.rally.guards);assert.equal(latestPersonalBattle(c.snapshot()).region,'Ovesos');
  assert.equal(battlePhase({participation:{guards:3}}).total,1);
});
