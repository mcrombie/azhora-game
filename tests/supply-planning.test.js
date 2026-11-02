import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaign,replayCampaign} from '../src/simulation/campaign.js';
import {createLizeemFoodScenario} from '../src/content/scenarios/lizeem-food.js';
import {createRoutes} from '../src/simulation/routes.js';
import {expeditionForecast,assessSupplyOrder,chooseSupplyOrder} from '../src/simulation/supply-planning.js';
import {armyFoodMarkup} from '../src/app/lizeem/food-war-report.js';

const near=(a,b)=>assert(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const order={owner:'west',from:'nethereum',to:'caricas',armyId:null,levy:40,strength:40,kind:'attack',score:1};
function setup(){const scenario=createLizeemFoodScenario({war:true}),c=createCampaign(scenario);return {scenario,c,state:c.snapshot(),travel:createRoutes(scenario)};}
function leanScenario(production=25){
  const scenario=createLizeemFoodScenario({war:true});scenario.food.trades=[];
  scenario.food.routes=scenario.food.routes.filter(r=>!r.regions.includes('nethereum'));
  for(const r of scenario.regions){r.garrison=r.id==='nethereum'?100:r.id==='caricas'?30:0;r.recruits=0;}
  scenario.regions.find(r=>r.id==='nethereum').food={population:100,production,startingStore:0};
  return scenario;
}

test('forecast includes arrival and resolution meals, fixed carrying capacity and readiness loss without mutating state',()=>{
  const {scenario,state}=setup(),before=JSON.stringify(state);
  const f=expeditionForecast(scenario,state,order,{days:4});
  assert.equal(f.days,7);near(f.supplyDays,4);assert.equal(f.shortDays,3);near(f.readiness,.4);
  near(f.departureFood,16);near(f.gapDays,3);near(f.effectiveStrength,22);
  assert.equal(JSON.stringify(state),before);
});

test('reinforcement forecasts count remaining battle time, not a new duration; expired battles are uncertain',()=>{
  const {scenario,state}=setup();state.day=10;
  state.engagements.push({region:'caricas',status:'active',endsOn:13});
  const f=expeditionForecast(scenario,state,order,{days:2});assert.equal(f.battleDays,1);assert.equal(f.days,3);
  assert.equal(expeditionForecast(scenario,state,order,{days:4}).battleDays,3);
  assert.equal(expeditionForecast(scenario,state,{...order,kind:'transfer'},{days:2}).battleDays,0);
});

test('planning favors a less demanding viable target and never treats neutral trade as army supplies',()=>{
  const {scenario,state}=setup();
  const chosen=chooseSupplyOrder(scenario,state,[order,{...order,to:'nesdor',score:.95}],(_from,to)=>({days:to==='nesdor'?1:4}));
  assert.equal(chosen.to,'nesdor');assert.equal(chosen.supplyPlan.forecast.gapDays,0);
  const f=expeditionForecast(scenario,state,order,{days:8});near(f.supplyDays,4);assert(f.gapDays>0);
});

test('armies provision using physical stores and leave within a bounded wait, with exact replay',()=>{
  const scenario=leanScenario(),c=createCampaign(scenario);let s=c.step();
  const held=s.armies.find(a=>a.owner==='west');assert.equal(held.status,'ready');assert.equal(held.supplyPlan.action,'provision');
  assert.equal(held.supply.carried,0);assert.match(held.reason,/Reconsider day 4/);
  const first=held.supplyPlan.holdSince;
  while(!s.events.some(e=>e.type==='march'&&e.army.owner==='west')&&s.day<10)s=c.step();
  const march=s.events.find(e=>e.type==='march'&&e.army.owner==='west');assert(march);
  assert(march.day<=first+2*scenario.rules.decisionEvery);assert(march.army.supply.carried>0);
  near(march.army.supplyPlan.forecast.departureFood,march.army.supply.carried);
  assert.deepEqual(replayCampaign(scenario,s).snapshot(),s);
  const l=s.food.last;near(l.opening+l.produced-l.consumed-l.lost,l.closing);
});

test('very slow provisioning cannot freeze an otherwise viable attack forever',()=>{
  const scenario=leanScenario(20.1),c=createCampaign(scenario),s=c.step(7);
  const holds=s.events.filter(e=>e.type==='army-hold'&&e.name.startsWith('West'));
  assert.deepEqual(holds.map(e=>e.day),[1,4]);
  const departure=s.events.find(e=>e.type==='march'&&e.army.owner==='west');assert.equal(departure.day,7);
  assert.match(departure.reason,/limited supply wait has ended/);assert(departure.army.supplyPlan.forecast.gapDays>0);
});

test('recovering readiness needs evidence of full local rations and shares the finite wait limit',()=>{
  const {scenario,state}=setup();state.day=10;state.regions.nethereum.food.readiness=.5;
  let result=assessSupplyOrder(scenario,state,order,{days:4});assert(result.wait);assert.equal(result.supplyPlan.action,'recover');
  state.regions.nethereum.food.condition=0;
  assert(assessSupplyOrder(scenario,state,order,{days:4}).wait,'Existing stores can feed a short recovery even without new production');
  state.regions.nethereum.food.condition=1;
  state.regions.nethereum.food.militaryRation=.5;
  assert(!assessSupplyOrder(scenario,state,order,{days:4}).wait);
  state.regions.nethereum.food.militaryRation=1;
  state.armies.push({id:1,owner:'west',region:'nethereum',status:'ready',strength:40,supply:{carried:16,readiness:.5},supplyPlan:{action:'recover',holdSince:4}});
  result=assessSupplyOrder(scenario,state,{...order,armyId:1,levy:0},{days:4});
  assert(!result.wait&&result.waitExhausted);
});

test('damaged production and newly blocked deliveries cannot justify a provisioning wait',()=>{
  const {scenario,state}=setup();const f=state.regions.nethereum.food;f.store=0;f.condition=0;
  state.food.last={transfers:[{from:'ovesos',to:'nethereum',amount:100,path:['ovesos','nethereum'],kind:'friendly-supply'}]};
  assert(expeditionForecast(scenario,state,order,{days:4}).canProvision);
  state.food.blockedRoutes.push('nethereum|ovesos');
  assert(!expeditionForecast(scenario,state,order,{days:4}).canProvision);
});

test('a full pack still permits a risky expedition; the inspector dates and qualifies its estimate',()=>{
  const {scenario,c}=setup(),s=c.step(),army=s.armies.find(a=>a.status==='marching');assert(army);
  assert(army.supplyPlan.forecast.days>army.supplyPlan.forecast.capacityDays);
  assert.match(army.reason,/exceeds carrying capacity/);
  const markup=armyFoodMarkup(scenario,s,army);assert.match(markup,/Last planning estimate · day 1/);assert.match(markup,/not a promised outcome/);
});

test('previous food-war experiments retain their rules and cannot silently replay as new planning',()=>{
  const scenario=createLizeemFoodScenario({war:true,planning:false}),s=createCampaign(scenario).step(120);
  assert.equal(s.scenario,'lizeem-food-war-v1');assert.equal(s.day,35);assert.equal(s.winner,'east');
  assert(!s.armies.some(a=>a.supplyPlan));assert.deepEqual(replayCampaign(scenario,s).snapshot(),s);
  assert.throws(()=>replayCampaign(createLizeemFoodScenario({war:true}),s),/different scenario rules/);
  const invalid=createLizeemFoodScenario({war:true});delete invalid.food;
  assert.throws(()=>createCampaign(invalid),/Supply planning requires food/);
});
