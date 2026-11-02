import {commanderOutcome} from './fixtures/commander-outcomes.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorldWar,WORLD_WAR_SCENARIO,worldWarProjection} from '../src/app/exploration/world-war.js';
import {campaignChronicle} from '../src/app/exploration/campaign-chronicle.js';
import {councilPeaceWords,residentPeaceWords} from '../src/app/exploration/league-settlement.js';
import {councilInfluence} from '../src/app/exploration/council-state.js';
import {RESIDENT_CONVERSATIONS} from '../src/content/regions/minora-frontier/resident-conversations.js';
import {createOpeningWar,createAdventureWar} from '../src/experiments/day-night/opening-war.js';
import {openingReport,openingDeathReport,openingTimelineText} from '../src/experiments/day-night/opening-presentation.js';
import {battleConsequence,councilBattleResponse} from '../src/app/exploration/battle-consequences.js';
import {worldWarReports} from '../src/app/exploration/war-reports.js';
import {soldierWords} from '../src/app/exploration/soldier-contact.js';
import {LIZEEM_PRELUDE,preludeForScenario} from '../src/content/scenarios/lizeem-prelude.js';

test('actual interception and allied assault replay with original contributions and ownership',()=>{
  const w=createWorldWar();w.advance(3);w.syncRegion('Caricas');const b=w.snapshot().engagements.find(b=>b.region==='caricas');
  assert(w.campaign.joinBattle(b.id,b.location).ok);
  assert(w.campaign.resolveEncounter(b.id,'west','success','vanguard-broken',3).ok);
  assert(w.campaign.joinBattle(b.id,b.location).ok);assert(w.campaign.chooseAssault(w.snapshot().pending.id,'allied').ok);
  const p=w.snapshot().pending;
  assert(w.campaign.resolveEncounter(p.id,'west','success','rally-secured',p.rally.guards,{escaped:0,alliesLost:1,routed:1,allyDamage:30,...commanderOutcome(w.campaign,'west',true)}).ok);
  const before=w.snapshot(),replay=campaignChronicle(before),text=replay.frames.map(f=>f.caption).join('\n');
  assert.match(text,/12 reinforcement strength removed/);assert.match(text,/1 allies lost; 1 enemies routed, not killed/);
  assert.match(text,/Your final assault decided this field/);assert.match(text,/Serevan Dain retreated/);
  assert.equal(replay.frames.find(f=>f.day===3).owners.caricas,'east');assert.equal(replay.frames.find(f=>f.day===6).owners.caricas,'west');
  assert(replay.frames.some(f=>f.routes.some(r=>r.from==='nethereum'&&r.to==='caricas')));
  assert(replay.frames.some(f=>f.battles.some(b=>b.region==='caricas')));
  assert.deepEqual(w.snapshot(),before);assert.deepEqual(campaignChronicle(createWorldWar(w.checkpoint()).snapshot()),replay);
  replay.frames[0].owners.caricas='invalid';assert.equal(before.regions.caricas.owner,'west');
});
test('either winner creates the same country with its colors and different council and resident memories',()=>{
  for(const side of ['east','west']){
    const w=createWorldWar();w.campaign.reinforce(side==='west'?'nethereum':'caricas',500);w.advance(200);
    const s=w.snapshot(),before=structuredClone(s);assert.equal(s.winner,side);
    const projection=worldWarProjection(s),f=projection.factions.find(f=>f.id===side);
    assert.equal(f.name,'Lizeemi League');assert.equal(f.short,'Lizeemi League');
    assert.equal(f.color,WORLD_WAR_SCENARIO.factions.find(f=>f.id===side).color);
    assert(Object.values(projection.regions).every(r=>r.owner===side));
    assert.equal(councilInfluence(s).leader,side==='west'?'mayor':'temple');
    for(const id of Object.keys(RESIDENT_CONVERSATIONS))assert.match(residentPeaceWords(id,s),/Lizeemi League/);
    assert.match(councilPeaceWords('mayor',s),side==='west'?/I lead this council/:/My friends in Ovesos lost/);
    assert.match(councilPeaceWords('temple',s),side==='east'?/I now lead/:/Nesdor mourns/);
    const replay=campaignChronicle(s);assert.match(replay.frames.at(-1).caption,/Lizeemi League/);
    assert(Object.values(replay.frames.at(-1).owners).every(o=>o===side));
    assert.equal(replay.frames[0].owners.isareos,'minora');assert.equal(replay.frames[0].owners.nethereum,'west');assert.equal(replay.frames[0].owners.caricas,'east');
    assert.match(replay.frames.map(f=>f.caption).join(' '),/testing intervention added 500/);
    assert.deepEqual(s,before);assert.deepEqual(campaignChronicle(createWorldWar(w.checkpoint()).snapshot()),replay);
  }
});
test('ongoing campaign review is honest about the present and does not invent a winner',()=>{
  const w=createWorldWar();w.advance(3);const before=w.checkpoint(),replay=campaignChronicle(w.snapshot());
  assert.equal(replay.frames.at(-1).day,3);assert.match(replay.frames.at(-1).caption,/still underway/);
  assert(replay.frames.every(f=>!f.winner&&f.day<=3));assert.equal(residentPeaceWords('portunus',w.snapshot()),null);
  assert.deepEqual(w.checkpoint(),before);
});

test('elapsed opening preserves actual event times in history, reports and conversations after checkpoint restoration',()=>{
  for(const success of [true,false]){
    const w=createOpeningWar();assert(w.advanceToNextEvent(w.forecast().key).ok);
    w.begin();for(let i=0;i<17;i++)w.tick(1,true);w.tick(.25,true);
    w.syncRegion('Caricas');const b=w.snapshot().engagements.find(b=>b.region==='caricas');
    assert(w.campaign.joinBattle(b.id,b.location).ok);assert(w.campaign.resolveEncounter(b.id,'west','success','vanguard-broken',3).ok);
    assert(w.campaign.joinBattle(b.id,b.location).ok);assert(w.campaign.chooseAssault(w.snapshot().pending.id,'allied').ok);const p=w.snapshot().pending;
    assert(w.campaign.resolveEncounter(p.id,'west',success?'success':'defeat',success?'rally-secured':'time-expired',success?p.rally.guards:0,{alliesLost:0,routed:0,allyDamage:0,...commanderOutcome(w.campaign,'west',success)}).ok);
    const before=w.snapshot(),clock=w.clock(),history=campaignChronicle(before,clock);
    assert.equal(history.timeline,'elapsed');assert.equal(history.elapsedSeconds,197.25);
    assert.equal(history.frames.find(f=>f.elapsedSeconds===180).owners.caricas,'east');
    assert.equal(history.frames.find(f=>f.elapsedSeconds===197.25).owners.caricas,before.regions.caricas.owner);
    assert.match(history.frames.at(-1).caption,/Adventure 03:17.*opening experiment is complete/);
    assert.doesNotMatch(history.frames.map(f=>f.caption).join(' '),/\bday\b/i);
    const result=battleConsequence(before,before.engagements.find(b=>b.region==='caricas'));
    assert.equal(result.elapsedSeconds,197.25);assert.deepEqual(result.facts.find(f=>f[0]==='Resolved'),['Resolved','Adventure 03:17']);
    assert.match(councilBattleResponse('taleth',before).words,/at Adventure 03:17/);
    const soldier=soldierWords({region:'caricas',owner:result.winner,battleId:b.id,kind:'survivor'},before,null,id=>id,id=>id);
    assert.match(soldier.battle,/at Adventure 03:17/);assert.match(soldier.next,/Taleth.*Chronoscope/);assert.doesNotMatch(JSON.stringify(soldier),/Corris|\bday\b/i);
    const report=worldWarReports(before,WORLD_WAR_SCENARIO,()=>true).find(r=>r.battleId===b.id);
    assert.equal(report.elapsedSeconds,197.25);
    const presented=openingReport(report,{...clock,elapsedSeconds:360});
    assert.deepEqual(presented.summary.facts.find(f=>f[0]==='Resolved'),['Resolved','Adventure 03:17']);
    if(!success)assert.match(report.detail,/outcome at Adventure 03:17/);
    assert.match(openingDeathReport(before,b,clock),/Adventure 03:17/);
    const restored=createOpeningWar(w.checkpoint());assert.deepEqual(campaignChronicle(restored.snapshot(),restored.clock()),history);
    assert.deepEqual(w.snapshot(),before,'History and dialogue never modify the campaign');
  }
});

test('the opening keeps the authored thirty-day prelude and precise receipt times distinct',()=>{
  const prelude=preludeForScenario('lizeem-opening-v2');
  assert.equal(prelude,LIZEEM_PRELUDE);assert.equal(prelude.frames.at(-1).day,30);assert.equal(prelude.timeline,undefined);
  const receipt={day:3,elapsedSeconds:197.25,facts:[['Resolved','Day 3']],detail:'Return before day 6.'};
  assert.equal(openingReport(receipt,{sharedOpening:false}),receipt);
  const displayed=openingReport(receipt,{sharedOpening:true,elapsedSeconds:350});
  assert.deepEqual(displayed.facts,[['Resolved','Adventure 03:17']]);assert.equal(displayed.detail,'Return before 06:00.');
  assert.deepEqual(receipt.facts,[['Resolved','Day 3']]);
});

test('full adventure records later battles and continues guidance after Caricas without rehearsal endings',()=>{
  const w=createAdventureWar();w.advance(6);
  const state=w.snapshot(),clock=w.clock(),before=structuredClone(state),caricas=state.engagements.find(b=>b.region==='caricas');
  assert.equal(caricas.status,'resolved');assert.equal(clock.complete,false);
  const history=campaignChronicle(state,clock);
  assert.equal(history.timeline,'elapsed');assert.doesNotMatch(history.frames.at(-1).caption,/experiment|rehearsal/);
  const soldier=soldierWords({region:'caricas',owner:state.regions.caricas.owner,battleId:caricas.id,kind:'survivor'},state,{title:'the fighting in Ovesos'},id=>id,id=>id,clock);
  assert.match(soldier.next,/Ovesos/);assert.doesNotMatch(soldier.next,/Chronoscope/);
  const ovesos=state.engagements.find(b=>b.region==='ovesos');
  assert(ovesos);assert.match(openingDeathReport(state,ovesos,clock),/You fell during the battle at Ovesos/);assert.doesNotMatch(openingDeathReport(state,ovesos,clock),/Caricas/);
  const regroup=openingTimelineText('Orders on day 9. Wait advances up to seven days and pauses at the next known front.',clock);
  assert.match(regroup,/at 09:00.*quiet ground/);assert.doesNotMatch(regroup,/days/);
  assert.equal(openingTimelineText('Expected day 9 (3 days).',clock),'Expected 09:00 (3 minutes).');
  w.advance(200);assert(w.snapshot().winner);
  const final=campaignChronicle(w.snapshot(),w.clock());assert(final.frames.some(f=>f.winner));assert.doesNotMatch(final.frames.map(f=>f.caption).join(' '),/opening experiment/);
  assert.deepEqual(state,before,'Presentation never changes historical state');
});

test('death reports distinguish a settled battle deadline from held duel time',()=>{
  const clock={sharedOpening:true,localBattleTiming:'scheduled',elapsedSeconds:360,secondsPerDay:60};
  const state={events:[{id:1,captured:false,attacker:'west',defender:'east',elapsedSeconds:180}]};
  const battle={region:'caricas',endsOn:3,resultId:1,resolvedAt:180};
  const report=openingDeathReport(state,battle,clock);
  assert.match(report,/scheduled battle end, Adventure 03:00/);
  assert.match(report,/Other armies, supplies and battles progressed/);
  assert.match(report,/Time is held while you read/);
  assert.doesNotMatch(report,/You fell.*at Adventure 06:00|no other armies advanced/);
  const duel=openingDeathReport({events:[]},{region:'caricas',endsOn:3},{...clock,elapsedSeconds:57});
  assert.match(duel,/You fell at Caricas at Adventure 00:57/);
  assert.match(duel,/battle at Caricas remains underway.*no other armies advanced/);
});
