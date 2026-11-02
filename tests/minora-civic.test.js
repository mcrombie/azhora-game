import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaign,replayCampaign} from '../src/simulation/campaign.js';
import {createLizeemFoodScenario} from '../src/content/scenarios/lizeem-food.js';
import {deriveMinoraCivicState,minoraPublicCivicReport,minoraHousingReport} from '../src/simulation/minora-civic.js';

const config={storageShares:{granary:.6,temple:.3,merchants:.1},sealedTempleShare:.2,
  guildMealShare:.02,charityMealShare:.05,reserveTarget:2380,battleWindow:4,
  reliefRegions:['nethereum','caricas','ovesos','nesdor']};
const near=(a,b)=>assert(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const civic=(state,extra={})=>deriveMinoraCivicState(state.regions.isareos,{config,day:state.day,battles:state.engagements,...extra});

test('civic inventories partition actual regional stock without extra food or pre-tick meals',()=>{
  const campaign=createCampaign(createLizeemFoodScenario());
  for(const state of [campaign.snapshot(),campaign.step(),campaign.step(10)]){
    const before=structuredClone(state),c=civic(state),f=c.food;
    near(f.storage.granary+f.storage.temple.total+f.storage.merchants,state.regions.isareos.food.store);
    near(f.storage.temple.open+f.storage.temple.sealed,f.storage.temple.total);
    near(f.allocations.households+f.allocations.guild+f.allocations.templeRelief,f.civilianConsumed);
    assert(f.civilianConsumed<=state.regions.isareos.food.last?.consumed||f.civilianConsumed===0);
    if(state.day===0){assert.equal(f.recorded,false);assert.equal(f.civilianDemand,null);assert.equal(f.civilianConsumed,0);assert.equal(c.services.guild.status,'ready');}
    else {near(f.civilianConsumed,264);near(f.allocations.guild,5.28);near(f.allocations.templeRelief,13.2);assert.equal(c.services.guild.status,'supplied');}
    assert.equal(c.relief.level,'manageable');assert.deepEqual(state,before);
  }
});

test('presentation residents, visitor beds and guards add neither consumers nor housing capacity',()=>{
  const scenario=createLizeemFoodScenario(),a=createCampaign(scenario),b=createCampaign(scenario);
  const buildings=[{id:'home',accommodation:{households:2,residentPlaces:8,visitorBeds:0}},
    {id:'inn',accommodation:{households:1,residentPlaces:4,visitorBeds:12}},
    {id:'barracks',accommodation:{households:0,residentPlaces:60,visitorBeds:0}},{id:'library'}];
  for(let day=0;day<20;day++){
    const state=a.snapshot(),r=civic(state,{buildings});
    assert.equal(r.housing.regional.population,2640);assert.equal(r.housing.regional.capacity,3300);
    assert.equal(r.housing.visitorBeds,12);assert.equal(r.housing.populationAllocatedToBuildings,false);
    assert.equal(r.housing.accommodationComplete,false);assert.equal(r.housing.buildings.at(-1).residentPlaces,null);
    for(let i=0;i<4;i++)minoraPublicCivicReport(civic(state,{buildings}));
    a.step();b.step();
  }
  assert.deepEqual(a.snapshot(),b.snapshot());assert.deepEqual(replayCampaign(scenario,a.snapshot()).snapshot(),a.snapshot());
});

test('actual import interruption strains relief before hunger, and reduced meals stay inside consumed food',()=>{
  const campaign=createCampaign(createLizeemFoodScenario());
  for(const from of ['nethereum','caricas'])assert.equal(campaign.foodAction({type:'route',from,to:'isareos',blocked:true}).ok,true);
  const opening=civic(campaign.snapshot()),low=civic(campaign.step(10)),hungry=civic(campaign.step(5));
  assert.equal(opening.relief.level,'manageable');assert.equal(low.relief.level,'strained');
  assert(low.relief.causes.includes('low-reserves'));assert.equal(low.food.ration,1);
  assert.equal(hungry.relief.level,'critical');assert(hungry.relief.causes.includes('reduced-rations'));
  assert.equal(hungry.services.guild.status,'reduced');assert.equal(hungry.services.templeRelief.status,'reduced');
  near(hungry.food.allocations.guild+hungry.food.allocations.templeRelief+hungry.food.allocations.households,hungry.food.civilianConsumed);
  assert(hungry.food.civilianConsumed<264);assert.equal(hungry.housing.regional.population,2640);
  for(const from of ['nethereum','caricas'])campaign.foodAction({type:'route',from,to:'isareos',blocked:false});
  const recovered=civic(campaign.step(60));
  assert.equal(recovered.food.ration,1);assert.equal(recovered.relief.level,'manageable');assert.equal(recovered.relief.populationMovementModeled,false);
});

test('relief notices relevant fighting without inventing refugees or retaining an old battle forever',()=>{
  const region=createCampaign(createLizeemFoodScenario()).snapshot().regions.isareos;
  const battles=[{id:'recent',region:'caricas',status:'resolved',started:1,resolvedOn:4},
    {id:'recent',region:'caricas',status:'resolved',started:1,resolvedOn:4},
    {id:'distant',region:'solis',status:'active',started:2},{id:'future',region:'nesdor',status:'active',started:10}];
  const c=deriveMinoraCivicState(region,{config,day:5,battles});
  assert.equal(c.relief.recentBattles,1);assert.equal(c.relief.level,'strained');assert.deepEqual(c.relief.causes,['nearby-fighting']);
  assert.equal(c.housing.regional.population,2640);assert.equal(c.relief.populationMovementModeled,false);
  assert.match(minoraPublicCivicReport(c).relief,/ordinary meals remain supplied/);
  const later=deriveMinoraCivicState(region,{config,day:9,battles});assert.equal(later.relief.recentBattles,0);assert.equal(later.relief.level,'manageable');
  const active=deriveMinoraCivicState(region,{config,day:20,battles:[{region:'nesdor',status:'active',started:1}]});assert.equal(active.relief.recentBattles,1);
});

test('public report cannot expose temple inventory or ownership shares through numeric subtotals',()=>{
  const state=createCampaign(createLizeemFoodScenario()).step(),c=civic(state),report=minoraPublicCivicReport(c);
  assert(c.food.storage.temple.sealed>0);
  assert.deepEqual(Object.keys(report).sort(),['available','reliefLevel','granary','market','guild','temple','relief'].sort());
  assert(Object.values(report).every(v=>typeof v==='string'||typeof v==='boolean'));
  assert(!/sealed|2380|1428|714|476|\.6|\.3|\.2/.test(JSON.stringify(report)));
  const changed=civic(state,{config:{...config,storageShares:{granary:.7,temple:.25,merchants:.05},sealedTempleShare:.1}});
  assert.deepEqual(minoraPublicCivicReport(changed),report);
});

test('legacy scenarios remain unassessed rather than receiving invented economic data',()=>{
  const region={garrison:60},c=deriveMinoraCivicState(region);
  assert.equal(c.available,false);assert.equal(c.food,null);assert.equal(c.housing.regional,null);
  assert.equal(c.relief.level,'unknown');assert.equal(minoraPublicCivicReport(c).available,false);assert.deepEqual(region,{garrison:60});
});

test('invalid allocation cannot create food, invalid housing is rejected, and empty populations consume nothing',()=>{
  const region=createCampaign(createLizeemFoodScenario()).step().regions.isareos;
  for(const change of [{storageShares:{granary:.6,temple:.3,merchants:.2}},{sealedTempleShare:.4},
    {guildMealShare:.7,charityMealShare:.4},{reserveTarget:-1},{battleWindow:NaN},{reliefRegions:['']}]){
    assert.throws(()=>deriveMinoraCivicState(region,{config:{...config,...change}}),/Invalid Minora civic configuration/);
  }
  assert.throws(()=>minoraHousingReport(region,[{id:'inn',accommodation:{visitorBeds:-1}}]),/Invalid civic accommodation/);
  assert.throws(()=>minoraHousingReport(region,[{id:'same'},{id:'same'}]),/Duplicate civic building/);
  const empty={...region,food:{...region.food,population:0,store:0,last:{civilianDemand:0,consumed:0}}};
  const c=deriveMinoraCivicState(empty,{config:{...config,reserveTarget:0}});
  assert.equal(c.food.civilianConsumed,0);assert.equal(c.food.reserveRatio,null);assert.deepEqual(c.food.allocations,{households:0,guild:0,templeRelief:0});
});
