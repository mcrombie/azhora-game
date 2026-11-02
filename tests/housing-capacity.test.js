import test from 'node:test';
import assert from 'node:assert/strict';
import {withHousingCapacity,housingCapacity} from '../src/content/settlements/housing-capacity.js';
import {NETHEREUM_BUILDINGS} from '../src/content/regions/nethereum/nethereum-agriculture.js';
import {CARICAS_AGRICULTURE_BUILDINGS} from '../src/content/regions/minora-frontier/caricas-agriculture.js';
import {OVESOS_AGRICULTURE_BUILDINGS} from '../src/content/regions/oves/ovesos-agriculture.js';
import {NESDOR_AGRICULTURE_BUILDINGS} from '../src/content/regions/nesdor/nesdor-agriculture.js';
import {LIZEEM_HOUSING_TARGETS} from '../src/content/scenarios/lizeem-housing-targets.js';
import {createLizeemFoodScenario} from '../src/content/scenarios/lizeem-food.js';
import {createCampaign,replayCampaign} from '../src/simulation/campaign.js';
import {housingSummary} from '../src/simulation/housing.js';

test('residential space adds capacity while commercial and agricultural buildings do not',()=>{
  const source=[{kind:'house',w:8,d:10},{kind:'house',w:8,d:10,storeys:2},
    ...['barn','granary','hall'].map(kind=>({kind,w:20,d:20,storeys:3}))];
  const homes=withHousingCapacity(source,144);
  assert.deepEqual(homes.map(b=>b.housingCapacity),[48,96,0,0,0]);
  assert.equal(housingCapacity(homes),144);assert.equal(source[0].housingCapacity,undefined);
  assert.throws(()=>withHousingCapacity([{id:'invalid',kind:'house',w:8,d:10,storeys:0}],100),/Invalid residential footprint/);
  const thirds=withHousingCapacity(Array.from({length:3},()=>({kind:'house',w:8,d:10})),100);
  assert.deepEqual(thirds.map(b=>b.housingCapacity),[34,33,33]);
  assert.throws(()=>withHousingCapacity([{kind:'barn'}],100),/needs residential space/);
  assert.throws(()=>withHousingCapacity(source,-1),/Invalid regional housing budget/);
});

test('authored housing capacities reach the campaign independently of actual population',()=>{
  const scenario=createLizeemFoodScenario(),s=createCampaign(scenario).snapshot();
  for(const [id,buildings] of [['nethereum',NETHEREUM_BUILDINGS],['ovesos',OVESOS_AGRICULTURE_BUILDINGS],['nesdor',NESDOR_AGRICULTURE_BUILDINGS]]){
    const h=housingSummary(s.regions[id]);
    assert.equal(h.capacity,housingCapacity(buildings));assert(h.spareCapacity>0);
    assert.equal(h.capacity,LIZEEM_HOUSING_TARGETS[id]);assert(h.occupancy>.75&&h.occupancy<.85);
    assert.equal(h.population,scenario.regions.find(r=>r.id===id).food.population);
    assert(buildings.every(b=>Number.isSafeInteger(b.housingCapacity)&&b.housingCapacity>=0));
  }
  assert.equal(housingSummary(s.regions.caricas).capacity,1600);
  assert(CARICAS_AGRICULTURE_BUILDINGS.every(b=>b.housingCapacity===undefined));
  assert.equal(housingSummary(s.regions.isareos).capacity,3300);
  assert.equal(housingSummary({food:{population:100}}),null,'Unauthored housing is unknown, not zero');
  assert.equal(housingSummary({housing:{capacity:100}}).population,null);
});

test('empty housing does not produce residents or food demand; housing shortages do not delete residents',()=>{
  const baseline=createLizeemFoodScenario(),c=createCampaign(baseline),reference=c.step(20);
  for(const capacity of [0,100,10000]){
    const scenario=createLizeemFoodScenario();scenario.regions.find(r=>r.id==='caricas').housing.capacity=capacity;
    const campaign=createCampaign(scenario),s=campaign.step(20),h=housingSummary(s.regions.caricas);
    assert.equal(h.population,1265);assert.equal(h.capacity,capacity);
    assert.equal(h.spareCapacity,Math.max(0,capacity-1265));assert.equal(h.overCapacity,Math.max(0,1265-capacity));
    assert.equal(h.occupancy,capacity?1265/capacity:null);
    assert.deepEqual(replayCampaign(scenario,s).snapshot(),s);
    s.regions.caricas.housing=reference.regions.caricas.housing;
    assert.deepEqual(s,reference,'Only housing metadata may change; people, food and war remain authoritative');
  }
  const empty=createLizeemFoodScenario();empty.regions.find(r=>r.id==='caricas').food.population=0;
  const s=createCampaign(empty).step(20);
  assert.equal(s.regions.caricas.food.population,0);assert.equal(s.regions.caricas.food.last.civilianDemand,0);
  assert.equal(housingSummary(s.regions.caricas).occupancy,0);
});

test('invalid capacity is rejected but housing remains optional for existing scenarios',()=>{
  for(const capacity of [-1,1.5,'100',null,Infinity]){
    const scenario=createLizeemFoodScenario();scenario.regions[0].housing={capacity};
    assert.throws(()=>createCampaign(scenario),/Invalid housing capacity/);
  }
  const scenario=createLizeemFoodScenario();for(const r of scenario.regions)delete r.housing;
  assert(Object.values(createCampaign(scenario).step().regions).every(r=>housingSummary(r)===null));
});
