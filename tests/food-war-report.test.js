import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaign} from '../src/simulation/campaign.js';
import {createLizeemFoodScenario} from '../src/content/scenarios/lizeem-food.js';
import {foodRouteStatus} from '../src/simulation/food.js';
import {armyMapRegion} from '../src/app/lizeem/army-map-state.js';
import {armyFoodReport,foodRouteReport} from '../src/app/lizeem/food-war-report.js';
import {foodReport} from '../src/app/lizeem/food-report.js';
import {runWarFoodCase,analyzeWarFood} from '../src/dev/food/war-balance.js';
const near=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const setup=()=>{const scenario=createLizeemFoodScenario({war:true});return {scenario,c:createCampaign(scenario)};};
test('engaged attackers are placed in the battlefield region while away from friendly stores',()=>{
  const {scenario,c}=setup();let s=c.snapshot();while(!s.engagements.length)s=c.step();
  const battle=s.engagements[0],army=s.armies.find(a=>a.id===battle.attackingIds[0]);
  assert.equal(army.region,null);assert.equal(armyMapRegion(s,army),battle.region);
  const report=armyFoodReport(scenario,s,army);assert.equal(report.battle.endsOn,battle.endsOn);
  assert.match(report.source,/carried food/);near(report.days,army.supply.carried/(army.strength*.1));
});
test('reopening a developer blockade cannot bypass fighting or an enemy border',()=>{
  const {scenario,c}=setup();let s=c.snapshot();while(!s.engagements.some(b=>b.region==='caricas'&&b.status==='active'))s=c.step();
  c.foodAction({type:'route',from:'caricas',to:'isareos',blocked:true});
  let report=foodRouteReport(scenario,c.snapshot(),'caricas','isareos');assert(report.blocked&&report.battles.length&&!report.open);
  c.foodAction({type:'route',from:'caricas',to:'isareos',blocked:false});
  report=foodRouteReport(scenario,c.snapshot(),'caricas','isareos');assert(!report.blocked&&!report.open);assert.match(report.text,/battle in Caricas/);
  assert(foodRouteStatus(scenario,createCampaign(scenario).snapshot(),'nethereum','caricas').hostile);
});
test('region balances include stores packed for armies after the daily meals',()=>{
  const {scenario,c}=setup(),before=c.snapshot(),s=c.step();
  assert(Object.values(s.regions).some(r=>r.food.last.provisioned>0));
  for(const id of Object.keys(s.regions)){
    const report=foodReport(scenario,s,s,id);
    near(report.actual,s.regions[id].food.store-before.regions[id].food.store);
  }
  near(Object.values(s.regions).reduce((n,r)=>n+r.food.last.provisioned,0),s.armies.reduce((n,a)=>n+a.supply.carried,0));
});
test('daily food recovers on a reopened battle route according to authoritative core access',()=>{
  const {scenario,c}=setup();let s=c.snapshot(),battle;
  while(!battle){s=c.step();battle=s.engagements.find(b=>b.region==='caricas'&&b.status==='active');}
  s=c.step();assert.equal(s.regions.caricas.food.last.exports,0);
  while(s.engagements.some(b=>b.id===battle.id&&b.status==='active'))s=c.step();
  assert(foodRouteStatus(scenario,s,'caricas','isareos').open);
});
test('army food report survives starvation and destroyed units without infinite days',()=>{
  const {scenario,c}=setup();let s=c.step(20);
  for(const army of s.armies){const r=armyFoodReport(scenario,s,army);assert(Number.isFinite(r.days));assert(r.effectiveStrength<=army.strength);assert(r.effectiveStrength>=0);}
});
test('a stopped comparison is not presented as an equal-day food counterfactual',()=>{
  const {scenario,c}=setup(),b=createCampaign(scenario);c.foodAction({type:'production',region:'nesdor',condition:.25});
  const s=c.step(),base=b.step(20),r=foodReport(scenario,s,base,'nesdor');
  assert(!r.notes.some(note=>note.includes('compared with')));
});
test('balance audit uses matched timed wars, reproduces outcomes and identifies recovery',()=>{
  const normal=runWarFoodCase('normal'),control=runWarFoodCase('no-food'),damaged=runWarFoodCase('nethereum-disrupted'),repaired=runWarFoodCase('nethereum-restored');
  assert(normal.replayVerified&&control.replayVerified&&damaged.replayVerified&&repaired.replayVerified);
  assert(normal.hungerLosses>0);assert.equal(normal.minoraShortDays,0);
  assert(damaged.minoraShortDays>0);assert(repaired.minoraRecovered&&repaired.minoraShortDays<damaged.minoraShortDays);
  assert.equal(control.hungerLosses,0);assert(control.battles>0);
  assert.deepEqual(runWarFoodCase('normal'),normal);
  const report=analyzeWarFood({seeds:[1731],days:2});assert(report.summary.every(r=>r.unresolved===1&&r.westWins===0&&r.eastWins===0));
});
