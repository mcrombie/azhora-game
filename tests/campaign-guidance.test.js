import test from 'node:test';
import assert from 'node:assert/strict';
import {campaignGuidance} from '../src/app/exploration/campaign-guidance.js';
import {nextCampaignOpportunity} from '../src/app/exploration/campaign-opportunity.js';
import {createWorldWar,WORLD_WAR_SCENARIO as scenario} from '../src/app/exploration/world-war.js';
import {worldWarArmies} from '../src/app/exploration/war-armies.js';
import {residentNews} from '../src/app/exploration/resident-news.js';
import {LIZEEM_RESIDENTS} from '../src/content/regions/minora-frontier/lizeem-residents.js';
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
