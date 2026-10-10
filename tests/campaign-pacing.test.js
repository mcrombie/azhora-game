import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaign} from '../src/simulation/campaign.js';
import {offensiveRecoveryUntil} from '../src/simulation/offensive-recovery.js';
import {availableBattleStage} from '../src/simulation/battle-stages.js';
import {createWorldWar,WORLD_WAR_SCENARIO as current,CONTINUITY_WORLD_WAR_SCENARIO as previous} from '../src/app/exploration/world-war.js';
import {talethLetters} from '../src/app/exploration/taleth-correspondence.js';
import {nextCampaignOpportunity,waitForCampaignDispatch} from '../src/app/exploration/campaign-opportunity.js';
import {worldWarArmies} from '../src/app/exploration/war-armies.js';
function fight(c,side){const b=c.snapshot().engagements.find(availableBattleStage);c.locateHero(b.region);assert(c.joinBattle(b.id,b.location).ok);const p=c.snapshot().pending;assert(c.resolveEncounter(p.id,side,'success',p.rally?'rally-secured':'vanguard-broken',p.rally?p.rally.guards:3).ok);}
function run(definition,side){const c=createCampaign(definition);while(!c.snapshot().winner&&c.snapshot().day<120){if(c.snapshot().engagements.some(availableBattleStage))fight(c,side);else c.step();}return c;}

test('old v7 campaigns replay exactly with the previous timing and no new recovery promises',()=>{
  for(const [side,day,count] of [['west',28,6],['east',30,5]]){
    const c=run(previous,side),s=c.snapshot();assert.equal(s.winner,side);assert.equal(s.day,day);assert.equal(s.events.filter(e=>e.type==='battle').length,count);
    assert.deepEqual(createWorldWar({simulation:s,fraction:0,speed:1}).snapshot(),s);
    assert(s.events.every(e=>!e.reattackOn));assert(talethLetters(s).every(l=>!l.detail.includes('must reorganize')));
  }
});

test('a defeat delays fresh attacks on that field, while existing marches and battles continue',()=>{
  for(const side of ['west','east']){
    const c=createCampaign(current);c.step(3);fight(c,side);fight(c,side);let s=c.snapshot();const event=s.events.find(e=>e.type==='battle'&&e.region==='caricas'),loser=side==='west'?'east':'west';
    assert.equal(event.reattackOn,9);assert.equal(offensiveRecoveryUntil(s,'caricas',loser),9);assert.equal(offensiveRecoveryUntil(s,'caricas',side),0);
    assert(s.engagements.some(b=>b.region==='ovesos'&&b.status==='active'),'Previously marching enemy still arrived in Ovesos');
    assert(s.armies.filter(a=>a.status==='recovering').every(a=>a.readyOn<=8),'Victorious formations recover within two days');
    c.step(3);s=c.snapshot();assert(s.events.some(e=>e.type==='battle'&&e.region==='ovesos'&&e.day===8),'Other field resolves on schedule');
    assert(!s.events.some(e=>e.type==='march'&&e.day>6&&e.day<9&&e.army.owner===loser&&e.army.to==='caricas'));
    c.step(35);s=c.snapshot();assert(s.events.some(e=>e.type==='march'&&e.army.owner===loser&&e.army.to==='caricas'&&e.day>=9),'The field can be attacked again');
    assert.deepEqual(createWorldWar({simulation:s,fraction:0,speed:1}).snapshot(),s);
  }
  assert.throws(()=>createCampaign({...current,rules:{...current.rules,reattackDelayDays:-1}}),/reattack/);
});

test('fresh pacing reduces repeated Caricas fights on both intervention paths without awarding a scripted winner',()=>{
  for(const side of ['west','east']){const old=run(previous,side).snapshot(),now=run(current,side).snapshot();assert.equal(now.winner,side);assert(now.day<old.day);assert(now.events.filter(e=>e.type==='battle'&&e.region==='caricas').length<old.events.filter(e=>e.type==='battle'&&e.region==='caricas').length);assert.equal(now.regions.isareos.owner,'minora');}
  const winners=new Set();for(let seed=0;seed<16;seed++){const c=createCampaign(current,seed),s=c.step(200);if(s.winner)winners.add(s.winner);assert.equal(s.regions.isareos.owner,'minora');for(const e of s.events.filter(e=>e.type==='battle'))assert.notEqual(e.resolution,'rally-rout','Unattended battles use ordinary resolution');}
  assert.deepEqual([...winners].sort(),['east','west']);
});

test('live advice offers known defensive and offensive alternatives while dispatch history stays fixed',()=>{
  const c=createCampaign(current);c.step(3);fight(c,'west');fight(c,'west');const first=talethLetters(c.snapshot())[0];assert.match(first.detail,/day 9/);
  fight(c,'west');fight(c,'west');let s=c.snapshot(),op;
  for(let n=0;n<15;n++){s=c.snapshot();op=nextCampaignOpportunity(s,current,worldWarArmies(s,current));if(op.alternative)break;c.step();}
  assert(op.alternative);assert.notEqual(op.purpose,op.alternative.purpose);assert.notEqual(op.region,op.alternative.region);assert.match(op.tradeoff,/defend|Defend|protect/);
  const before=structuredClone(s);assert.deepEqual(nextCampaignOpportunity(s,current,worldWarArmies(s,current)),op);assert.deepEqual(s,before,'Advice does not choose a faction or alter the campaign');
  assert.deepEqual(talethLetters(s).find(l=>l.id===first.id),first,'Original pigeon dispatch remains a historical account');
  const hidden=nextCampaignOpportunity(s,current,[],()=>false);assert.equal(hidden.kind,'regroup');assert.equal(hidden.alternative,undefined);
  if(op.kind==='army'){const one=nextCampaignOpportunity(s,current,worldWarArmies(s,current).filter(a=>a.id===op.target.id),()=>false);assert.equal(one.alternative,undefined);assert.doesNotMatch(one.detail,new RegExp(op.alternative.region,'i'));}
});

test('explicit wait stops at the first known front, keeps position and speed, and never skips a pending battle',()=>{
  const w=createWorldWar();w.advance(3);for(let i=0;i<4;i++)fight(w.campaign,'west');const before=w.snapshot(),fraction=w.clock().fraction;w.setSpeed(4);w.toggle();
  const read=s=>nextCampaignOpportunity(s,current,worldWarArmies(s,current));assert.equal(read(before).kind,'regroup');
  const result=waitForCampaignDispatch(w,read),after=w.snapshot();assert(result.days>0&&result.days<=7);assert.equal(read(after).kind,'army');assert.equal(w.clock().running,false);assert.equal(w.clock().speed,4);assert.equal(w.clock().fraction,fraction);assert.deepEqual(after.hero,before.hero);
  assert.equal(waitForCampaignDispatch(w,read).days,0,'Waiting cannot skip the offered march');
  w.advance(3);const b=w.snapshot().engagements.find(availableBattleStage);if(b){w.campaign.locateHero(b.region);w.campaign.joinBattle(b.id,b.location);const s=w.snapshot();assert.equal(waitForCampaignDispatch(w,()=>({kind:'regroup'})).days,0);assert.deepEqual(w.snapshot(),s);}
  const unknown=createWorldWar();unknown.advance();assert.equal(waitForCampaignDispatch(unknown,()=>({kind:'regroup'})).days,7,'Unknown territory cannot cause an unbounded wait');
});

test('the completed review offers optional exploration without reopening the war or rewriting dispatches',()=>{
  for(const side of ['west','east']){
    const s=run(current,side).snapshot(),before=structuredClone(s),letters=talethLetters(s);
    const unfinished=nextCampaignOpportunity(s,current,[],()=>true);
    assert.equal(unfinished.kind,'finale');assert.match(unfinished.detail,/conclude the campaign/);
    const complete=nextCampaignOpportunity(s,current,[],()=>true,{concluded:true});
    assert.equal(complete.kind,'complete');assert.equal(complete.target,null);assert.match(complete.label,/optional/);
    assert.match(complete.detail,/campaign is complete/);assert.match(complete.detail,/five playable regions/);
    assert.doesNotMatch(complete.detail,/to conclude|resume time/);
    assert.deepEqual(s,before);assert.deepEqual(talethLetters(s),letters);
  }
  const ongoing=createWorldWar().snapshot();
  assert.equal(nextCampaignOpportunity(ongoing,current,[],()=>true,{concluded:true}).kind,'briefing','An invalid completion flag cannot end an ongoing war');
});
