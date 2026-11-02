import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaign} from '../src/simulation/campaign.js';
import {createLizeemFoodScenario} from '../src/content/scenarios/lizeem-food.js';
import {foodReport,foodTestActions,importsClosed,importsOpen} from '../src/app/lizeem/food-report.js';
import {createReports} from '../src/app/lizeem/reports.js';

const setup=()=>{const scenario=createLizeemFoodScenario();return {scenario,c:createCampaign(scenario),b:createCampaign(scenario)};};
const act=(c,name)=>foodTestActions(name).forEach(a=>assert(c.foodAction(a).ok));
const near=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`);
test('opening food report distinguishes reserves from unmeasured daily deliveries',()=>{
  const {scenario,c,b}=setup(),r=foodReport(scenario,c.snapshot(),b.snapshot(),'isareos');
  assert.equal(r.store,2380);assert.equal(r.imports,null);assert.equal(r.production,null);assert.equal(r.balance,null);
  assert.equal(r.reserveNote,'');assert.match(r.notes.join(' '),/Advance one day/);
});
test('closing imports cannot reuse yesterday’s healthy balance as a forecast',()=>{
  const {scenario,c,b}=setup();c.step();b.step();act(c,'cut-imports');
  const r=foodReport(scenario,c.snapshot(),b.snapshot(),'isareos');
  assert(r.pending);assert.equal(r.imports,170);assert.equal(r.reserveNote,'');assert.match(r.notes.join(' '),/last completed day/);
  assert(importsClosed(c.snapshot()));assert(importsOpen(b.snapshot()));
});
test('reserve runway uses net deficit after domestic production, not gross demand',()=>{
  const {scenario,c,b}=setup();act(c,'cut-imports');c.step();b.step();
  const r=foodReport(scenario,c.snapshot(),b.snapshot(),'isareos');
  assert.equal(r.store,2210);assert.equal(r.demand,270);assert.equal(r.balance,-170);assert(!r.pending);
  assert.match(r.reserveNote,/13 more days/);
});
test('food report explains the actual cost of Caricas supporting Nesdor',()=>{
  const {scenario,c,b}=setup();act(c,'disrupt-nesdor');c.step();b.step();
  for(const id of ['nesdor','caricas','isareos']){
    const r=foodReport(scenario,c.snapshot(),b.snapshot(),id);
    assert.match(r.notes.join(' '),/Caricas supplied 35 food to Nesdor/);
    assert.match(r.notes.join(' '),/Minora fell to 0, compared with 30/);
  }
});
test('shortage, pending repair and actual recovery have distinct reports',()=>{
  const {scenario,c,b}=setup();act(c,'cut-imports');c.step(20);b.step(20);
  const report=()=>foodReport(scenario,c.snapshot(),b.snapshot(),'isareos');
  assert.match(report().reserveNote,/cannot cover full rations/);assert(report().readiness<1);assert(report().garrison<60);
  // Empty stores need not be falling: shortage shows the missing meals explicitly.
  assert(report().balance<0);near(report().actual,0);
  act(c,'restore-imports');assert(report().pending);assert.equal(report().reserveNote,'');
  c.step();b.step();assert(!report().pending);assert.equal(report().ration,1);assert(report().stability<1);
  assert.match(report().notes.join(' '),/recover gradually/);
  c.step(7);b.step(7);assert.equal(report().stability,1);
});
test('food event descriptions explain actions, hunger, recovery and military losses',()=>{
  const {scenario,c}=setup();act(c,'cut-imports');c.step(20);act(c,'restore-imports');c.step();
  const reports=createReports(scenario);
  const events=c.snapshot().events.filter(e=>e.type.startsWith('food-'));
  assert(events.some(e=>e.type==='food-attrition'));assert(events.some(e=>e.type==='food-restored'));
  for(const e of events)assert.notEqual(reports.event(e),e.type);
});
