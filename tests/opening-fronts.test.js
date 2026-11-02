import test from 'node:test';
import assert from 'node:assert/strict';
import {createAdventureWar} from '../src/experiments/day-night/opening-war.js';
import {UNIFIED_WORLD_WAR_SCENARIO as scenario,SIMULTANEOUS_WORLD_WAR_SCENARIO as previous,LEGACY_UNIFIED_WORLD_WAR_SCENARIO as legacy,createWorldWar} from '../src/app/exploration/world-war.js';
import {createCampaign} from '../src/simulation/campaign.js';
import {openingFronts} from '../src/app/exploration/opening-fronts.js';
import {nextCampaignOpportunity} from '../src/app/exploration/campaign-opportunity.js';
import {savedNavigationMode,followsRecommendation} from '../src/app/exploration/war-navigation-state.js';

const tick=(war,n)=>{for(let i=0;i<n;i++)war.tick(1,true);};
const advice=(war,side,position=null)=>nextCampaignOpportunity(war.snapshot(),scenario,[],()=>true,{side,position});

test('Caricas starts at zero; a real, conserved eastern army reaches Ovesos exactly at 02:00',()=>{
  const war=createAdventureWar(),s=war.snapshot();
  assert.equal(war.clock().elapsedSeconds,0);assert.equal(war.clock().hour,6);
  assert.deepEqual(s.engagements.map(b=>[b.region,b.attacker,b.started,b.endsOn]),[['caricas','west',0,3]]);
  const march=s.armies.find(a=>a.owner==='east'&&a.to==='ovesos');
  assert.equal(march.status,'marching');assert.equal(march.arrives,2);
  const total=Object.values(s.regions).reduce((n,r)=>n+r.garrison,0)+s.armies.reduce((n,a)=>n+a.strength,0);
  assert.equal(total,scenario.regions.reduce((n,r)=>n+r.garrison,0));
  war.begin();for(let i=0;i<120;i++)war.tick(1,false);assert.equal(war.clock().elapsedSeconds,0);
  tick(war,119);assert(!war.snapshot().engagements.some(b=>b.region==='ovesos'));
  const restored=createAdventureWar(war.checkpoint());restored.begin();tick(war,1);tick(restored,1);
  assert.deepEqual(restored.snapshot(),war.snapshot());
  const b=war.snapshot().engagements.find(b=>b.region==='ovesos');assert.equal(b.startedAt,120);assert.equal(b.endsAt,300);
  assert(b.attackingIds.includes(march.id));assert.equal(war.snapshot().armies.filter(a=>a.id===march.id).length,1);
  assert.deepEqual(createAdventureWar(war.checkpoint()).snapshot(),war.snapshot());
});

test('both allegiances get Caricas first, retain it while earlier, then move on without a report acknowledgment',()=>{
  for(const side of ['west','east']){
    const war=createAdventureWar();assert.equal(advice(war,side).region,'caricas');
    war.advance(2);assert.equal(advice(war,side).region,'caricas');
    assert.equal(openingFronts(war.snapshot(),scenario,side).filter(c=>c.active).length,2);
    war.advance();assert.equal(advice(war,side).region,'ovesos');
    assert.equal(advice(war,side).purpose,side==='west'?'defend':'advance');
    war.advance(2);assert(war.snapshot().engagements.slice(0,2).every(b=>b.status==='resolved'));
    assert.deepEqual(openingFronts(war.snapshot(),scenario,side),[]);
  }
});

test('equally urgent fields prefer proximity over defensive allegiance',()=>{
  const state=createCampaign(previous).snapshot();
  for(const side of ['west','east']){
    const next=nextCampaignOpportunity(state,previous,[],()=>true,{side,position:scenario.regions.find(r=>r.id==='caricas').battlefield});
    assert.equal(next.region,'caricas');
  }
});

test('manual tracking survives saves and new recommendations; explicit stop remains manual',()=>{
  assert.equal(savedNavigationMode(null),'taleth');
  assert.equal(savedNavigationMode({navigation:{kind:'opening',id:'bear'}}),'taleth');
  assert.equal(savedNavigationMode({navigation:{kind:'army',id:4}}),'manual');
  for(const navigation of [null,{kind:'battle',id:'b1'},{kind:'army',id:3}]){
    const saved=JSON.parse(JSON.stringify({navigationMode:'manual',navigation}));
    assert.equal(savedNavigationMode(saved),'manual');assert(!followsRecommendation(savedNavigationMode(saved),null,true));
  }
  assert(followsRecommendation('taleth',null,true));assert(!followsRecommendation('taleth','bear',true));assert(!followsRecommendation('taleth',null,false));
});

test('old simultaneous battles and earlier marches retain their original replay rules',()=>{
  for(const old of [previous,legacy]){
    const base=createWorldWar(null,old),saved={...base.checkpoint(),sharedOpening:2,fullCampaign:true,openingEventTimes:base.snapshot().events.map(()=>0)};
    const war=createAdventureWar(saved);assert.deepEqual(war.snapshot().engagements.map(b=>[b.region,b.started]),old===previous?[['caricas',0],['ovesos',0]]:[]);
    assert.deepEqual(createAdventureWar(war.checkpoint()).snapshot(),war.snapshot());
  }
  for(const startsOn of [-1,1.5,'2'])assert.throws(()=>createCampaign({...scenario,openingBattles:[{...scenario.openingBattles[1],startsOn}]}),/opening battle time/);
});
