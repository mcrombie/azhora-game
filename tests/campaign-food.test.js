import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createCampaign,replayCampaign} from '../src/simulation/campaign.js';
import {createLizeemFoodScenario} from '../src/content/scenarios/lizeem-food.js';
import {LIZEEM_SCENARIO} from '../src/content/scenarios/lizeem.js';
import {foodSummary} from '../src/simulation/food.js';
import {runFoodExperiment} from '../src/dev/food/food-experiments.js';

const near=(a,b,message='')=>assert(Math.abs(a-b)<1e-6,`${message}: ${a} != ${b}`);
const command=(c,action)=>assert.equal(c.foodAction(action).ok,true);
const stock=s=>Object.values(s.regions).reduce((n,r)=>n+r.food.store,0)+s.armies.reduce((n,a)=>n+a.supply.carried,0);
function conserved(s){
  const l=s.food.last;
  near(l.opening+l.produced-l.consumed-l.lost,l.closing,'Food ledger');near(l.closing,stock(s),'Physical stock');
  for(const r of Object.values(s.regions)){
    assert(r.food.store>=-1e-7);assert(r.garrison>=0&&Number.isInteger(r.garrison));
    for(const k of ['readiness','unrest','condition','civilianRation','militaryRation'])assert(r.food[k]>=0&&r.food[k]<=1+1e-8,k);
  }
  for(const a of s.armies){assert(a.supply.carried>=-1e-7);assert(a.strength>=0&&Number.isInteger(a.strength));assert.equal(a.strength===0,a.status==='destroyed');}
}

test('the opening budget represents the chosen regional populations, production and trade',()=>{
  const scenario=createLizeemFoodScenario(),c=createCampaign(scenario),s=c.step();
  assert.equal(s.version,4);assert.equal(s.day,1);assert.equal(s.rng,scenario.defaultSeed);
  const rows=foodSummary(s).regions,by=id=>rows.find(r=>r.id===id);
  near(by('nethereum').demand,70);near(by('caricas').demand,135);near(by('isareos').demand,270);
  near(by('ovesos').demand,79.5);near(by('nesdor').demand,80.5);
  assert.equal(s.regions.ovesos.food.population,s.regions.nesdor.food.population);
  near(by('nethereum').exports,140);near(by('caricas').exports,30);near(by('isareos').imports,170);
  near(by('isareos').store,2380);assert(rows.every(r=>r.civilianRation===1));
  const initial=createCampaign(scenario).snapshot();near(stock(s)-stock(initial),40);conserved(s);
});

test('normal trade remains stable for weeks and never grants military access to Minora',()=>{
  const {history,state}=runFoodExperiment('normal',{days:60});
  for(const h of history){assert(h.regions.every(r=>r.civilianRation===1));near(h.regions.find(r=>r.id==='isareos').store,2380);}
  assert.equal(state.armies.length,0);assert.equal(state.regions.isareos.owner,'minora');assert(!state.events.some(e=>e.type==='food-attrition'));
});

test('a complete import cutoff consumes exactly fourteen days of reserves before hunger',()=>{
  const {history,state}=runFoodExperiment('imports-cut',{days:21});
  for(const h of history.slice(0,14)){const r=h.regions.find(r=>r.id==='isareos');near(r.store,2380-170*h.day);near(r.civilianRation,1);}
  const day15=history[14].regions.find(r=>r.id==='isareos');near(day15.civilianRation,100/270);assert(day15.stability<1);
  assert.equal(state.events.find(e=>e.type==='food-shortage'&&e.region==='isareos').day,15);
  assert.equal(state.events.find(e=>e.type==='food-attrition'&&e.region==='isareos').day,18);
  assert.equal(state.regions.isareos.owner,'minora');
});

test('restoring imports restores full rations first, then stability and readiness gradually',()=>{
  const restored=runFoodExperiment('imports-restored'),blocked=runFoodExperiment('imports-cut');
  const r=(run,day)=>run.history[day-1].regions.find(r=>r.id==='isareos');
  assert(r(restored,20).stability<1);near(r(restored,21).civilianRation,1);
  assert(r(restored,21).stability>r(restored,20).stability&&r(restored,21).stability<1);
  near(r(restored,35).stability,1);near(r(restored,35).readiness,1);
  assert(r(restored,35).store>0);assert(r(blocked,35).civilianRation<.5);
  assert(restored.state.events.some(e=>e.type==='food-restored'&&e.day===21));
});

test('Nesdor disruption diverts Caricas surplus and reduces exports to Minora; repair prevents the shortage',()=>{
  const damaged=runFoodExperiment('nesdor-disrupted'),repaired=runFoodExperiment('nesdor-restored');
  const first=damaged.history[0].ledger.transfers;
  assert(first.some(t=>t.from==='caricas'&&t.to==='nesdor'&&t.kind==='friendly-supply'));
  assert(!first.some(t=>t.from==='caricas'&&t.to==='isareos'));
  assert(damaged.state.regions.nesdor.food.civilianRation<1);
  near(repaired.state.regions.nesdor.food.civilianRation,1);near(repaired.state.regions.nesdor.food.unrest,0);
  assert(repaired.state.regions.nesdor.food.store>damaged.state.regions.nesdor.food.store);
});

test('rationing policies divide the same physical shortage without creating food',()=>{
  const values={};
  for(const policy of ['shared-hardship','civilian-first','military-first']){
    const scenario=createLizeemFoodScenario();scenario.regions.find(r=>r.id==='nesdor').food={population:100,production:10,startingStore:0};
    scenario.regions.find(r=>r.id==='nesdor').garrison=100;
    const c=createCampaign(scenario);command(c,{type:'route',from:'caricas',to:'nesdor',blocked:true});command(c,{type:'rationing',faction:'east',policy});
    const s=c.step();values[policy]=s.regions.nesdor.food;conserved(s);
  }
  near(values['shared-hardship'].civilianRation,.5);near(values['shared-hardship'].militaryRation,.5);
  near(values['civilian-first'].civilianRation,1);near(values['civilian-first'].militaryRation,0);
  near(values['military-first'].civilianRation,0);near(values['military-first'].militaryRation,1);
});

test('friendly supply uses connected territory, shared route capacity and cannot bypass a blockade via enemies',()=>{
  const scenario=createLizeemFoodScenario();scenario.food.trades=[];
  for(const r of scenario.regions){r.food.production=0;r.food.startingStore=0;}
  const n=scenario.regions.find(r=>r.id==='nethereum');n.food.production=1000;n.food.startingStore=490;
  const o=scenario.regions.find(r=>r.id==='ovesos');o.food.population=0;o.garrison=0;
  scenario.regions.find(r=>r.id==='nesdor').owner='west';
  scenario.food.routes.find(r=>r.regions.includes('nethereum')&&r.regions.includes('ovesos')).capacity=8;
  const open=createCampaign(scenario),closed=createCampaign(scenario);command(closed,{type:'route',from:'nethereum',to:'ovesos',blocked:true});
  const s=open.step(),t=s.food.last.transfers.find(t=>t.to==='nesdor');
  assert.deepEqual(t.path,['nethereum','ovesos','nesdor']);near(t.amount,8);conserved(s);
  near(closed.step().regions.nesdor.food.last.imports,0);
});

function longMarch(){
  const scenario=createLizeemFoodScenario({war:true});
  scenario.rules.battleDays=0;
  for(const r of scenario.regions)r.recruits=0;
  scenario.rules.reserve=1000;scenario.rules.maxRaisedArmies=1;scenario.food.carriedDays=2;
  scenario.initialArmies=[{faction:'west',region:'nethereum',strength:30,readyOn:0}];
  scenario.openingOrders=[{faction:'west',from:'nethereum',to:'caricas',marchDays:10}];
  return scenario;
}
test('garrison-to-army transfers neither duplicate demand nor create carried food',()=>{
  const c=createCampaign(longMarch()),s=c.step();conserved(s);
  near(s.regions.nethereum.food.last.militaryDemand,7);
  const army=s.armies[0];near(army.supply.carried,6);assert.equal(army.strength,30);assert.equal(s.regions.nethereum.garrison,40);
  near(s.food.last.consumed,635);
  const next=c.step();near(next.regions.nethereum.food.last.militaryDemand,4);near(next.food.last.consumed,635);near(next.armies[0].supply.carried,3);conserved(next);
});

test('isolated armies use their carried rations, lose readiness before strength, and fight worse',()=>{
  const c=createCampaign(longMarch());c.step(3);const fed=c.snapshot().armies[0];near(fed.supply.readiness,1);near(fed.supply.carried,0);
  const hungry=c.step().armies[0];assert.equal(hungry.strength,30);assert(hungry.supply.readiness<1);
  c.step(2);assert.equal(c.snapshot().armies[0].strength,30);
  assert.equal(c.step().armies[0].strength,29);
  const end=c.step(4),battle=end.events.find(e=>e.type==='battle');assert(battle);
  assert(battle.attackPower<battle.attackers);near(battle.baseChance,battle.attackPower/(battle.attackPower+battle.defensePower*1.12));
  assert(battle.baseChance<battle.attackers/(battle.attackers+battle.defenders*1.12));conserved(end);
});

test('shortage and unrest reduce recruitment; restoring food recovers production and recruitment',()=>{
  const scenario=createLizeemFoodScenario();scenario.regions.find(r=>r.id==='nesdor').recruits=3;
  const base=createCampaign(scenario),hurt=createCampaign(scenario);
  command(hurt,{type:'route',from:'caricas',to:'nesdor',blocked:true});command(hurt,{type:'production',region:'nesdor',condition:0});
  const fed=base.step(20),hungry=hurt.step(20);assert(hungry.regions.nesdor.food.unrest>0);assert(hungry.regions.nesdor.garrison<fed.regions.nesdor.garrison);
  command(hurt,{type:'production',region:'nesdor',condition:1});command(hurt,{type:'route',from:'caricas',to:'nesdor',blocked:false});
  const next=hurt.step(30);assert(next.regions.nesdor.food.unrest<hungry.regions.nesdor.food.unrest);assert(next.regions.nesdor.garrison>hungry.regions.nesdor.garrison);
});

test('commands validate atomically and replay same-day changes and subsequent outcomes exactly',()=>{
  const scenario=createLizeemFoodScenario(),c=createCampaign(scenario),before=c.snapshot();
  for(const action of [null,{}, {type:'production',region:'nesdor',condition:-1},{type:'production',region:'nesdor',condition:NaN},
    {type:'production',region:'nesdor',condition:1,store:999},{type:'route',from:'nesdor',to:'isareos',blocked:true},
    {type:'route',from:'caricas',to:'nesdor',blocked:'yes'},{type:'rationing',faction:'west',policy:'magic'}]){
    assert.equal(c.foodAction(action).ok,false);assert.deepEqual(c.snapshot(),before);
  }
  command(c,{type:'production',region:'nesdor',condition:.25});command(c,{type:'rationing',faction:'east',policy:'civilian-first'});c.step(12);
  command(c,{type:'route',from:'caricas',to:'nesdor',blocked:true});c.step(9);command(c,{type:'production',region:'nesdor',condition:1});
  command(c,{type:'route',from:'caricas',to:'nesdor',blocked:false});const s=c.step(5),replayed=replayCampaign(scenario,s);
  assert.deepEqual(replayed.snapshot(),s);assert.deepEqual(replayed.step(20),c.step(20));
  assert.throws(()=>replayCampaign(scenario,{...s,commands:[{type:'food-action',day:0,action:{type:'production',region:'nope',condition:1}}]}));
});

test('active wars conserve food across marching, casualties, capture and loss of territory over 40 seeds',()=>{
  for(let seed=0;seed<40;seed++){
    const scenario=createLizeemFoodScenario({war:true}),c=createCampaign(scenario,seed),batch=createCampaign(scenario,seed);
    command(c,{type:'production',region:'caricas',condition:.6});command(batch,{type:'production',region:'caricas',condition:.6});
    for(let d=0;d<60&&!c.snapshot().winner;d++){
      const s=c.step();conserved(s);assert.equal(s.regions.isareos.owner,'minora');
      assert(s.armies.every(a=>a.from!=='isareos'&&a.to!=='isareos'));
      near(s.regions.caricas.food.condition,.6);assert.equal(s.regions.caricas.food.population,1265);
      for(const t of s.food.last.transfers)assert(t.amount>=0);
    }
    assert.deepEqual(batch.step(60),c.snapshot());assert.deepEqual(replayCampaign(scenario,c.snapshot()).snapshot(),c.snapshot());
  }
});

test('pending hero encounters freeze food and reject changes until resolved',()=>{
  const scenario=createLizeemFoodScenario({war:true});scenario.rules.battleDays=0;
  const c=createCampaign(scenario);c.heroTravel('caricas');c.watchBattles(true);const s=c.step(100);
  assert(s.pending);assert.deepEqual(c.step(5),s);assert.equal(c.foodAction({type:'production',region:'caricas',condition:0}).ok,false);
  assert.deepEqual(c.snapshot(),s);assert(c.resolveEncounter(s.pending.id,null,'withdraw').ok);conserved(c.snapshot());
  assert.deepEqual(replayCampaign(scenario,c.snapshot()).snapshot(),c.snapshot());
});

test('an active regional battle interrupts trade and supply and reduces local production',()=>{
  const c=createCampaign(createLizeemFoodScenario({war:true}));let before=c.snapshot();
  while(!before.engagements.some(b=>b.status==='active')&&before.day<20)before=c.step();
  const battle=before.engagements.find(b=>b.status==='active');assert(battle);
  const s=c.step(),old=before.regions[battle.region].food,f=s.regions[battle.region].food;
  near(f.last.production,old.production*old.condition*(1-old.unrest*.5)*.5);
  assert(!s.food.last.transfers.some(t=>t.path.includes(battle.region)));conserved(s);
});

test('starvation can destroy a marching army without leaving invalid arrivals or negative strength',()=>{
  const scenario=longMarch();scenario.food.carriedDays=0;scenario.food.shortageGraceDays=0;scenario.food.attritionRate=1;
  const c=createCampaign(scenario);c.step();const s=c.step();assert.equal(s.armies[0].strength,0);assert.equal(s.armies[0].status,'destroyed');
  assert.equal(s.armies[0].arrives,null);assert.equal(s.armies[0].supply.carried,0);conserved(s);
  assert(!c.step(15).events.some(e=>e.type==='battle'&&e.armyId===1));
});

test('transfers protect exporters daily needs and reserve, and route throughput is shared',()=>{
  const {history}=runFoodExperiment('imports-restored');
  for(const h of history){
    for(const id of ['nethereum','caricas']){
      const r=h.regions.find(r=>r.id===id);assert(r.store>=r.demand*7-1e-6);
      const traffic=h.ledger.transfers.filter(t=>t.path.includes(id)&&t.path.includes('isareos')).reduce((n,t)=>n+t.amount,0);
      assert(traffic<=180+1e-6);
    }
  }
});

test('invalid scenario economics fail before a campaign can run',()=>{
  for(const change of [s=>s.food.rationPerPerson=0,s=>s.food.readinessLoss=2,s=>s.food.routes.push(s.food.routes[0]),
    s=>s.regions[0].food.startingStore=-1,s=>s.food.trades[0].to='nesdor',s=>s.food.reserveOverrides.nope=10]){
    const scenario=createLizeemFoodScenario();change(scenario);assert.throws(()=>createCampaign(scenario),/food scenario/);
  }
});

test('existing scenarios retain their old schema and baseline outcome',()=>{
  const c=createCampaign(LIZEEM_SCENARIO);assert.equal(c.foodAction({type:'production',region:'caricas',condition:0}).ok,false);
  const s=c.step(100);assert.equal(s.version,3);assert.equal(s.winner,'east');assert.equal(s.day,21);
  assert.equal(s.food,undefined);assert(s.armies.every(a=>!a.supply));assert.equal(foodSummary(s),null);
});

test('CLI provides machine-readable replayable reports and rejects bad inputs',()=>{
  const script=fileURLToPath(new URL('../scripts/simulate-food.mjs',import.meta.url));
  const result=spawnSync(process.execPath,[script,'--case=normal','--days=2','--json'],{encoding:'utf8'});
  assert.equal(result.status,0,result.error?.message??result.stderr);const data=JSON.parse(result.stdout);assert(data.replayVerified);assert.equal(data.history.length,2);
  const bad=spawnSync(process.execPath,[script,'--days=-5'],{encoding:'utf8'});assert.equal(bad.status,1,bad.error?.message);
});
