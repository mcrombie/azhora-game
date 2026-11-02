import test from 'node:test';
import assert from 'node:assert/strict';
import {campaignGuidance} from '../src/app/exploration/campaign-guidance.js';
import {nextCampaignOpportunity} from '../src/app/exploration/campaign-opportunity.js';
import {createWorldWar,WORLD_WAR_SCENARIO as scenario} from '../src/app/exploration/world-war.js';
import {worldWarArmies} from '../src/app/exploration/war-armies.js';
import {residentNews} from '../src/app/exploration/resident-news.js';
import {LIZEEM_RESIDENTS} from '../src/content/regions/minora-frontier/lizeem-residents.js';
import {commanderOutcome} from './fixtures/commander-outcomes.js';
import {openingReport} from '../src/experiments/day-night/opening-presentation.js';
const region=id=>scenario.regions.find(r=>r.id===id)?.name??id;
const opportunity=(w,known=()=>true)=>nextCampaignOpportunity(w.snapshot(),scenario,worldWarArmies(w.snapshot(),scenario),known);

test('opening guidance distinguishes briefing, horse handoff and voluntary departure',()=>{
  const w=createWorldWar();assert.equal(campaignGuidance(opportunity(w),{opening:'bear'}).title,'Speak with Taleth');
  w.advance();const next=opportunity(w);
  assert.equal(campaignGuidance(next,{opening:'bear'}).action,null);
  assert.match(campaignGuidance(next,{opening:'bear',owned:true}).detail,/on foot/);
  assert.match(campaignGuidance(next,{opening:'bear',owned:true,mounted:true,region}).title,/army toward Caricas/);
  assert.match(campaignGuidance(next,{opening:null,owned:false,region}).title,/army toward Caricas/,'Skipping Bear never forces the horse lesson');
});

test('before the opening march the directive offers a destination with honest departure and arrival times',()=>{
  for(const side of ['west','east']){
    const next={kind:'army',region:'caricas',departed:1,deadline:3,target:{kind:'opening',id:'caricas'},campaignSide:side,side,
      purpose:side==='west'?'advance':'defend',label:'Head for Caricas'};
    const context={fullCampaign:true,opening:'caricas',owned:true,mounted:true,region};
    const card=campaignGuidance(next,context);
    assert.match(card.title,/Caricas/);
    assert.match(card.action,/Track Caricas/,'A stopped destination can be selected again before an army exists');
    assert.match(card.detail,/(?:depart\w*|sets out) (?:on )?day 1/i);
    assert.match(card.detail,/arriv\w* (?:on )?day 3/i);
    assert.doesNotMatch(card.detail,/Follow its approach|Approach the enemy column|army is (?:marching|approaching)|choose a side/i);
    const elapsed=openingReport(card,{sharedOpening:true,elapsedSeconds:41});
    assert.match(elapsed.detail,/01:00/);assert.match(elapsed.detail,/03:00/);
    assert.doesNotMatch(elapsed.detail,/day [13]/);
    const onFoot=campaignGuidance(next,{...context,opening:null,owned:false,mounted:false});
    assert.match(onFoot.action,/Track Caricas/,'Skipping the optional horse keeps navigation available');
    assert.equal(campaignGuidance(next,{...context,opening:'bear',owned:false,mounted:false}).title,'Bear has a horse for you');
  }
});
test('short objectives retain the real deadline and choice, without mutating the war',()=>{
  const w=createWorldWar();w.advance(3);const before=w.checkpoint(),next=opportunity(w),card=campaignGuidance(next,{region});
  assert.match(card.title,/battlefield at Caricas/);assert.match(card.detail,/day 6/);assert.match(card.detail,/choose a side or stay out/);
  assert(card.detail.length<200);assert.match(card.clock,/paused/);
  const resume=campaignGuidance({...next,committed:true},{region,running:true});assert.match(resume.detail,/earlier progress is kept/);
  assert.match(resume.clock,/running/);assert.deepEqual(w.checkpoint(),before);
});
test('unknown fronts stay unknown and waiting explains its time cost',()=>{
  const w=createWorldWar();w.advance(3);const next=nextCampaignOpportunity(w.snapshot(),scenario,[],()=>false),card=campaignGuidance(next,{region});
  assert.equal(next.kind,'regroup');assert.match(card.clock,/seven days/);assert(!JSON.stringify(card).includes('Caricas'));
});
test('recovery guidance does not invite a fight while Teresod is unable to rejoin',()=>{
  const w=createWorldWar();w.advance(3);const next=opportunity(w),card=campaignGuidance(next,{region,recoveringUntil:5});
  assert.match(card.title,/Recover/);assert.match(card.detail,/again on day 5/);assert.match(card.action,/resume time/);
  assert(!/choose a side/.test(card.detail));
});

test('returning to an unfinished battle names the actual remaining phase',()=>{
  const w=createWorldWar();w.advance(3);w.syncRegion('Caricas');
  const b=w.snapshot().engagements[0];assert(w.campaign.joinBattle(b.id,b.location).ok);
  assert(w.campaign.resolveEncounter(b.id,'west','withdraw','withdrew',1).ok);
  let next=opportunity(w);assert.equal(next.phase,'intercept');
  assert.match(campaignGuidance(next,{region}).title,/Finish the interception/);
  assert(w.campaign.joinBattle(b.id,b.location).ok);
  assert(w.campaign.resolveEncounter(b.id,'west','success','vanguard-broken',2).ok);
  next=opportunity(w);assert.equal(next.phase,'rally');
  const card=campaignGuidance(next,{region});assert.match(card.title,/Lead the final assault/);
  assert.match(card.detail,/allies await/);assert.match(card.detail,/day 6/);
});
test('victory points only to Taleth, with fulfilled return replaced after the lookout for either winner',()=>{
  const w=createWorldWar();w.advance();
  for(const winner of ['east','west']){
    const s={...w.snapshot(),winner},next=nextCampaignOpportunity(s,scenario,[]),winnerName=winner==='west'?'West Lizeem':'East Lizeem',card=campaignGuidance(next,{opening:'bear',region,winnerName});
    assert.equal(card.title,'Return to Taleth');assert.match(card.detail,/lookout in Minora/);assert(!/Mayor|Priest/.test(card.detail));
    assert(card.detail.startsWith(winnerName+' has won.'));
    const end=campaignGuidance(nextCampaignOpportunity(s,scenario,[],()=>true,{concluded:true}),{region});
    assert.equal(end.title,'A united Lizeemi League');assert.match(end.action,/optional/);assert(!/finish the campaign/.test(end.detail));
  }
});
test('full adventure guidance continues after Caricas and names safe waiting between fronts',()=>{
  const afterFirst=campaignGuidance({kind:'battle',region:'ovesos',deadline:8},{fullCampaign:true,region,openingComplete:false});
  assert.match(afterFirst.title,/battlefield at Ovesos/);assert.doesNotMatch(afterFirst.detail,/experiment|rehearsal|unresolved/);
  const regroup=campaignGuidance({kind:'regroup'},{fullCampaign:true});
  assert.match(regroup.clock,/quiet ground/);assert.doesNotMatch(JSON.stringify(regroup),/seven days/);assert.equal(regroup.action,'Wait for next front');
  assert.match(regroup.detail,/20×/);assert.match(regroup.clock,/Close the map to cancel/);
  assert.equal(campaignGuidance({kind:'regroup'},{fullCampaign:true,recoveringUntil:8}).action,'Wait for next front');
  const won=campaignGuidance({kind:'finale'},{fullCampaign:true,openingComplete:true,winnerName:'East Lizeem'});
  assert.equal(won.title,'Return to Taleth');assert.match(won.detail,/East Lizeem has won/);
});
test('a lingering horse introduction never overrides regrouping, an active battle or a later march',()=>{
  const context={fullCampaign:true,opening:'bear',owned:true,mounted:false,region};
  const regroup=campaignGuidance({kind:'regroup',label:'Wait for next dispatch'},context);
  assert.equal(regroup.title,'Await the next orders');assert.equal(regroup.action,'Wait for next front');assert.match(regroup.detail,/rest/);
  const battle=campaignGuidance({kind:'battle',region:'caricas',deadline:6},context);
  assert.match(battle.title,/battlefield at Caricas/);assert.match(battle.action,/Track battlefield/);
  const later=campaignGuidance({kind:'army',region:'ovesos',deadline:9},context);
  assert.match(later.title,/army toward Ovesos/);
  const repeated=campaignGuidance({kind:'army',region:'caricas',deadline:15},context);
  assert.match(repeated.title,/army toward Caricas/);
  const opening={kind:'army',region:'caricas',deadline:3,label:'Head for Caricas'};
  assert.equal(campaignGuidance(opening,context).title,'Your horse is ready');
  assert.equal(campaignGuidance(opening,{...context,owned:false}).title,'Bear has a horse for you');
  assert.match(campaignGuidance({...opening,kind:'battle',deadline:6},{...context,owned:false}).title,/battlefield at Caricas/,'An optional horse must not hide the open battlefield');
});
test('local news follows nearby marching, fighting and recovery without describing distant armies',()=>{
  const w=createWorldWar(),gate=LIZEEM_RESIDENTS.find(p=>p.id==='imhotep'),field=LIZEEM_RESIDENTS.find(p=>p.id==='messor');
  assert.match(residentNews(gate,w.snapshot()),/White Bridge/);w.advance();
  assert.match(residentNews(gate,w.snapshot()),/army is coming toward Caricas/);w.advance(2);
  assert.match(residentNews(field,w.snapshot()),/stopped our work/);assert.match(residentNews(gate,w.snapshot()),/fighting around Caricas/);
  w.advance(3);assert.match(residentNews(field,w.snapshot()),/latest fighting at Caricas has ended/);
  const s=w.snapshot(),before=JSON.stringify(s);residentNews(field,s);assert.equal(JSON.stringify(s),before);
  const remote={day:2,armies:[{status:'marching',kind:'attack',to:'nesdor',strength:30,arrives:4}],engagements:[]};
  assert(!/Nesdor|army is coming/.test(residentNews(gate,remote)));
});

test('chosen allegiance supplies a single clear opening task without another faction choice',()=>{
  for(const side of ['west','east']){
    const w=createWorldWar(),read=()=>nextCampaignOpportunity(w.snapshot(),scenario,worldWarArmies(w.snapshot(),scenario),()=>true,{side});
    assert.equal(read().campaignSide,side);assert.match(campaignGuidance(read(),{region}).detail,new RegExp(side==='west'?'West Lizeem':'East Lizeem'));
    w.advance();let next=read();assert.equal(next.region,'caricas');assert.equal(next.side,side);assert.equal(next.purpose,side==='west'?'advance':'defend');
    let card=campaignGuidance(next,{region,fullCampaign:true});assert.match(card.title,side==='west'?/Support the advance on Caricas/:/Prepare to defend Caricas/);
    assert.doesNotMatch(card.detail,/choose a side/);assert.match(card.detail,/day 3/);
    w.advance(2);next=read();card=campaignGuidance(next,{region,fullCampaign:true});
    assert.equal(card.title,side==='west'?'Take Caricas':'Defend Caricas');assert.match(card.detail,/join or stay out/);assert.match(card.detail,/day 6/);
    assert.doesNotMatch(JSON.stringify(next),/choose a side|choose your side|Taleth favors/);
  }
});

test('a skipped battle naturally changes the chosen-side directive without a failure or stale destination',()=>{
  for(const side of ['west','east']){
    const w=createWorldWar();w.advance(3);
    const read=()=>nextCampaignOpportunity(w.snapshot(),scenario,worldWarArmies(w.snapshot(),scenario),()=>true,{side});
    const first=read();assert.equal(first.region,'caricas');w.advance(3);
    const next=read();assert.equal(next.region,'ovesos');assert.equal(next.side,side);assert.notEqual(next.target.id,first.target.id);
    assert.equal(next.purpose,side==='west'?'defend':'advance');assert.doesNotMatch(next.detail,/failed|choose a side/);
    w.advance(2);const regroup=read();assert.equal(regroup.kind,'regroup');assert.equal(regroup.campaignSide,side);
    const card=campaignGuidance(regroup,{fullCampaign:true});assert.equal(card.title,'Prepare for the next advance');assert.match(card.detail,/rest on quiet ground/);assert.match(card.detail,/Taleth will name your next destination/);
    for(let i=0;i<20&&read().kind==='regroup';i++)w.advance();
    assert(['army','battle'].includes(read().kind));assert.equal(read().side,side);
  }
});

test('another battlefield remains playable, its unfinished assault leads, and completed work retargets',()=>{
  for(const side of ['west','east']){
    const w=createWorldWar();w.advance(5);
    const read=()=>nextCampaignOpportunity(w.snapshot(),scenario,worldWarArmies(w.snapshot(),scenario),()=>true,{side});
    const suggested=read();assert.equal(suggested.region,'caricas');
    const other=w.snapshot().engagements.find(b=>b.status==='active'&&b.id!==suggested.target.id);
    assert(other);w.campaign.locateHero(other.region);assert(w.campaign.joinBattle(other.id,other.location).ok);
    assert(w.campaign.resolveEncounter(other.id,side,'success','vanguard-broken',3).ok);
    const finishing=read();assert.equal(finishing.target.id,other.id);assert.equal(finishing.phase,'rally');assert(finishing.committed);
    assert.match(campaignGuidance(finishing,{region,fullCampaign:true}).title,/Lead the final assault/);
    assert(w.campaign.joinBattle(other.id,other.location).ok);const pending=w.snapshot().pending;
    assert(w.campaign.resolveEncounter(pending.id,side,'success','rally-secured',pending.rally.guards,commanderOutcome(w.campaign,side,true)).ok);
    const next=read();assert.equal(next.side,side);assert.notEqual(next.target?.id,other.id);
    assert(w.snapshot().events.some(e=>e.type==='battle'&&e.region===other.region),'Off-objective contributions use the ordinary recorded battle result');
  }
});

test('committed directives neither reveal hidden fronts nor offer unrelated or opposite commitments',()=>{
  const w=createWorldWar();w.advance(5);const state=w.snapshot(),before=structuredClone(state);
  const hidden=nextCampaignOpportunity(state,scenario,[],()=>false,{side:'west'});assert.equal(hidden.kind,'regroup');assert.doesNotMatch(hidden.detail,/Caricas|Ovesos/);
  const foreign=structuredClone(state);for(const battle of foreign.engagements){battle.attacker='other';battle.defender='minora';}
  assert.equal(nextCampaignOpportunity(foreign,scenario,[],()=>true,{side:'west'}).kind,'regroup');
  const other=structuredClone(state);other.engagements[0].participation={faction:'east',intercept:{status:'available'}};
  const task=nextCampaignOpportunity(other,scenario,[],()=>true,{side:'west'});assert.notEqual(task.target?.id,other.engagements[0].id);
  nextCampaignOpportunity(state,scenario,worldWarArmies(state,scenario),()=>true,{side:'west'});assert.deepEqual(state,before);
});

test('defence advice offers roadside interception only until that march is spent, then renews for a new order',()=>{
  const w=createWorldWar();w.advance();
  const army=w.snapshot().armies.find(a=>a.owner==='west'&&a.status==='marching');
  const read=(state=w.snapshot(),side='east')=>nextCampaignOpportunity(state,scenario,worldWarArmies(state,scenario).filter(a=>a.id===army.id),()=>true,{side});
  const check=(expected,state=w.snapshot())=>{
    const before=structuredClone(state),next=read(state),card=campaignGuidance(next,{region});
    assert.equal(next.target.id,army.id);assert.equal(next.interceptable,expected);
    assert.equal(card.title,'Prepare to defend Caricas');
    assert.equal(/Approach the enemy column to intercept/.test(card.detail),expected);
    assert.equal(/Approach the enemy column to intercept/.test(next.detail),expected);
    assert.match(card.detail,expected?/or defend the battlefield when it arrives/:/joining the battle is your choice/);
    assert.deepEqual(state,before);return next;
  };
  check(true);assert.equal(read(w.snapshot(),'west').interceptable,false,'Our own advance is never an interception target');
  w.campaign.locateHero(army.from);
  const contact={region:army.from,location:{x:100,z:100},position:{x:100,z:100}};
  assert(w.campaign.interceptArmy(army.id,'east',contact).ok);
  assert(w.campaign.resolveEncounter(w.snapshot().pending.id,null,'withdraw','declined',0).ok);check(true);
  assert(w.campaign.interceptArmy(army.id,'east',contact).ok);
  const p=w.snapshot().pending;
  assert(w.campaign.resolveEncounter(p.id,'east','success','rally-secured',p.rally.guards,commanderOutcome(w.campaign,'east',true)).ok);
  assert.equal(check(false).deadline,army.arrives+1,'The delay changes arrival, never the spent order');
  const later=structuredClone(w.snapshot()),nextArmy=later.armies.find(a=>a.id===army.id);
  later.day+=5;nextArmy.departed+=5;nextArmy.arrives+=5;
  check(true,later);
});
