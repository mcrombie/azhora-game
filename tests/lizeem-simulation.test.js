import test from 'node:test';
import {encounterAutoplayInput} from '../src/gameplay/autoplay/encounter-input.js';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCampaign,replayCampaign,normalizeSeed} from '../src/simulation/campaign.js';
import {LIZEEM_SCENARIO as scenario} from '../src/content/scenarios/lizeem.js';
import {createRoutes} from '../src/simulation/routes.js';
import {isAlive,isMoving,defendingStrength,inflictLosses} from '../src/simulation/forces.js';
import {parseCells} from '../src/ui/map/campaign-map-geometry.js';
import {createLizeemEncounter} from '../src/gameplay/combat/lizeem-encounter.js';

test('the scenario starts with the agreed five regions, two leagues and neutral Minora',()=>{
  const state=createCampaign(scenario).snapshot();
  assert.deepEqual(Object.keys(state.regions),['isareos','nethereum','ovesos','caricas','nesdor']);
  assert.deepEqual(Object.values(state.regions).map(r=>r.owner),['minora','west','west','east','east']);
  assert.equal(scenario.hero.region,'isareos');assert.equal(state.day,0);assert.equal(state.winner,null);
});
test('scenario connections match shared borders of the actual atlas',()=>{
  const svg=readFileSync(new URL('../assets/azhora-world-map.svg',import.meta.url),'utf8');
  const group=svg.match(/<g id="region-tints"[^>]*>([\s\S]*?)<\/g>/)[1],edges=new Map();
  for(const region of scenario.regions){
    const path=group.match(new RegExp(`<path data-region="${region.name}"[^>]* d="([^"]+)"`))[1];
    const set=new Set();for(const cell of parseCells(path))for(let i=0;i<cell.length;i++)set.add([cell[i].join(','),cell[(i+1)%cell.length].join(',')].sort().join('|'));
    edges.set(region.id,set);
  }
  for(const a of scenario.regions)for(const b of scenario.regions)if(a!==b){
    const adjacent=[...edges.get(a.id)].some(edge=>edges.get(b.id).has(edge));
    assert.equal(a.neighbors.includes(b.id),adjacent,`${a.name} / ${b.name}`);
  }
});
test('fixed seeds reproduce complete histories independent of stepping batches',()=>{
  for(const seed of [0,1,42,1731,0xffffffff]){
    const one=createCampaign(scenario,seed),batch=createCampaign(scenario,seed);
    for(let i=0;i<60;i++)one.step();batch.step(60);assert.deepEqual(one.snapshot(),batch.snapshot());
  }
  assert.notDeepEqual(createCampaign(scenario,1).step(9),createCampaign(scenario,2).step(9));
});
test('orders use geography-dependent journeys and cannot fight before arrival',()=>{
  const c=createCampaign(scenario),day1=c.step(),travel=createRoutes(scenario);assert(day1.armies.length>0);
  for(const a of day1.armies){assert.equal(a.departed,1);assert.equal(a.arrives,1+travel(a.from,a.to).days);assert(a.strength>0);assert(a.name);}
  const earliest=Math.min(...day1.armies.map(a=>a.arrives));
  c.step(earliest-2);assert(!c.snapshot().events.some(e=>e.type==='battle'));
  const arrived=c.step();assert(arrived.events.some(e=>e.type==='battle'));
});
test('100 seeds preserve neutral territory, force accounting and nonnegative strength',()=>{
  const total=s=>Object.values(s.regions).reduce((n,r)=>n+r.garrison,0)+s.armies.reduce((n,a)=>n+a.strength,0);
  for(let seed=0;seed<100;seed++){
    const c=createCampaign(scenario,seed);let prior=c.snapshot();
    for(let i=0;i<100&&!prior.winner;i++){
      const recruits=scenario.regions.reduce((n,r)=>n+(prior.regions[r.id].recovery?0:Math.max(0,Math.min(r.recruits,scenario.rules.garrisonCap-prior.regions[r.id].garrison))),0);
      const next=c.step(),losses=next.events.filter(e=>e.day===next.day).reduce((n,e)=>n+(e.type==='battle'?e.attackLoss+e.defenseLoss:e.type==='surrender'?e.strength:0),0);
      assert.equal(total(next),total(prior)+recruits-losses,`Force accounting seed ${seed} day ${next.day}`);
      assert.deepEqual(next.regions.isareos,prior.regions.isareos);
      for(const r of Object.values(next.regions))assert(Number.isInteger(r.garrison)&&r.garrison>=0);
      assert.equal(new Set(next.armies.map(a=>a.id)).size,next.armies.length);
      for(const a of next.armies){
        assert(Number.isInteger(a.strength)&&a.strength>=0);assert.equal(a.status==='destroyed',a.strength===0);
        assert.notEqual(a.to,'isareos');assert.notEqual(a.from,'isareos');
        if(isAlive(a)&&!isMoving(a))assert.equal(next.regions[a.region].owner,a.owner);
        const old=prior.armies.find(b=>b.id===a.id);if(old){assert.equal(a.name,old.name);assert.equal(a.origin,old.origin);}
      }
      for(const old of prior.armies)assert(next.armies.some(a=>a.id===old.id),'Identity remains in the army ledger');
      for(const id of Object.keys(next.regions))if(next.regions[id].owner!==prior.regions[id].owner)assert(next.events.some(e=>e.day===next.day&&e.type==='battle'&&e.captured&&e.region===id));
      prior=next;
    }
  }
});
test('reinforcing Ovesos changes the default war outcome without touching its baseline',()=>{
  const baseline=createCampaign(scenario),changed=createCampaign(scenario);
  assert(changed.reinforce('ovesos',80).ok);
  assert.equal(changed.snapshot().events.at(-1).type,'intervention');
  assert.equal(baseline.step(100).winner,'east');assert.equal(changed.step(100).winner,'west');
  assert.equal(baseline.snapshot().commands.length,0);assert.equal(changed.snapshot().commands.length,1);
  assert.notDeepEqual(changed.snapshot().regions,baseline.snapshot().regions);
});
test('a seed and command history restore the exact experiment and its future',()=>{
  const original=createCampaign(scenario);original.reinforce('ovesos',80);original.step(4);original.reinforce('nethereum',40);original.reinforce('ovesos',10);original.step(3);
  const state=original.snapshot(),restored=replayCampaign(scenario,state);assert.deepEqual(restored.snapshot(),state);
  assert.deepEqual(restored.step(80),original.step(80));
  assert.throws(()=>replayCampaign(scenario,{...state,commands:[{type:'reinforce',day:-1,region:'ovesos',amount:80}]}));
  assert.throws(()=>replayCampaign(scenario,{seed:1731,day:10000,commands:[]}));
});
test('invalid interventions and seeds are rejected without mutation; snapshots are isolated',()=>{
  const c=createCampaign(scenario),before=c.snapshot();
  for(const [region,amount]of [['isareos',80],['nowhere',80],['ovesos',-1],['ovesos',NaN],['ovesos',501]])assert.equal(c.reinforce(region,amount).ok,false);
  assert.deepEqual(c.snapshot(),before);before.regions.ovesos.owner='east';assert.equal(c.snapshot().regions.ovesos.owner,'west');
  for(const value of [-1,1.5,Infinity,NaN,4294967296,'oops','',null,undefined,false])assert.throws(()=>normalizeSeed(value));
  assert.throws(()=>c.step(0));assert.throws(()=>c.step(1.5));assert.throws(()=>c.step(10001));
  c.step(100);const ended=c.snapshot();assert(!c.reinforce('ovesos',80).ok);c.step(10);assert.deepEqual(c.snapshot(),ended);
});
test('the core and scenario have no graphics, platform or legacy gameplay imports',()=>{
  for(const file of ['../src/simulation/campaign.js','../src/simulation/routes.js','../src/simulation/forces.js','../src/simulation/reinforcements.js','../src/content/scenarios/lizeem.js']){
    const source=readFileSync(new URL(file,import.meta.url),'utf8');for(const edge of source.matchAll(/from ['"]([^'"]+)['"]/g))assert(['./forces.js','./routes.js','./reinforcements.js'].includes(edge[1]));assert(!/Math\.random\(|Date\.now\(|performance\.now\(/.test(source));
  }
});
test('scenario tuning rejects invalid rules and supports a decision every day',()=>{
  for(const [rule,value]of [['decisionEvery',0],['marchDistancePerDay',0],['reserve',-1],['recoveryDays',-1],['defenseBonus',0]]){
    assert.throws(()=>createCampaign({...scenario,rules:{...scenario.rules,[rule]:value}}));
  }
  assert.throws(()=>createCampaign({...scenario,wars:[['east','east']]}));
  const daily=createCampaign({...scenario,rules:{...scenario.rules,decisionEvery:1}});assert(daily.step().armies.length>0);
});
test('route costs reflect atlas distance, terrain and crossings in both directions',()=>{
  const travel=createRoutes(scenario),plain=travel('nethereum','ovesos'),crossing=travel('nethereum','caricas');
  assert.equal(plain.days,3);assert.equal(crossing.days,5);
  assert.equal(crossing.days,crossing.distanceDays+crossing.terrainDays+crossing.crossingDays);
  assert.deepEqual(crossing,travel('caricas','nethereum'));
  assert.throws(()=>travel('isareos','nesdor'));
  assert.throws(()=>createRoutes({...scenario,routes:scenario.routes.slice(1)}));
  assert.throws(()=>createRoutes({...scenario,routes:[...scenario.routes,scenario.routes[0]]}));
  assert.throws(()=>createRoutes({...scenario,routes:scenario.routes.map((r,i)=>i===0?{...r,crossingDays:-1}:r)}));
  const atlas=JSON.parse(readFileSync(new URL('../assets/azhora-world-map.json',import.meta.url)));
  for(const r of scenario.regions){const original=atlas.regions.find(a=>a.name===r.name);assert(Math.abs(r.position.x-original.centerX)<.001);assert(Math.abs(r.position.y-original.centerY)<.001);}
});
test('losses are proportionate and conserve every point across garrison and field armies',()=>{
  const forces=[{strength:13},{strength:40},{strength:19}];inflictLosses(forces,23);
  assert.equal(forces.reduce((n,f)=>n+f.strength,0),49);assert(forces.every(f=>f.strength>=0));
  inflictLosses(forces,49);assert(forces.every(f=>f.strength===0));assert.throws(()=>inflictLosses(forces,1));
});
test('survivors retain identity, recover without free healing, and fight again',()=>{
  const c=createCampaign(scenario);let previous=c.snapshot(),recovered=false;
  for(let day=0;day<100&&!previous.winner;day++){
    const next=c.step();
    for(const old of previous.armies.filter(a=>a.status==='recovering')){
      const army=next.armies.find(a=>a.id===old.id);
      if(old.readyOn>next.day)assert(!next.events.some(e=>e.day===next.day&&e.type==='march'&&e.army.id===old.id),'Recovering armies cannot take voluntary orders');
      if(army.status==='recovering'&&old.battles===army.battles)assert.equal(army.strength,old.strength,'Recovery does not create manpower');
    }
    if(next.events.some(e=>e.type==='recovered'))recovered=true;
    previous=next;
  }
  assert(recovered);assert(previous.armies.some(a=>a.battles>=2));
  const retreats=previous.events.filter(e=>e.type==='retreat');assert(retreats.length);
  for(const event of retreats){
    const arrival=previous.events.find(e=>e.type==='arrive'&&e.army.id===event.army.id&&e.day>=event.day);
    if(arrival){assert.equal(arrival.army.name,event.army.name);assert.equal(arrival.army.status,'recovering');assert.equal(arrival.army.readyOn,arrival.day+scenario.rules.armyRecoveryDays);}
  }
  assert(previous.events.some(e=>e.type==='battle'&&e.defendingIds.some(id=>previous.armies.find(a=>a.id===id).battles>=2)),'Stationed armies participate in defense');
});
test('a retreat reroutes if its destination falls, and surrenders if cut off',()=>{
  const rerouted=createCampaign(scenario,4).step(20),first=rerouted.events.find(e=>e.type==='retreat'&&e.army.id===1);
  const again=rerouted.events.find(e=>e.type==='retreat'&&e.army.id===1&&e.id>first.id);
  assert.equal(first.army.to,'caricas');assert.equal(again.army.from,'caricas');assert.equal(again.army.to,'nesdor');assert.equal(first.army.strength,again.army.strength);
  const cutOff=createCampaign(scenario,2).step(100),surrender=cutOff.events.find(e=>e.type==='surrender'&&e.armyId===2);
  assert(surrender);assert.equal(cutOff.armies.find(a=>a.id===2).status,'destroyed');assert.equal(cutOff.armies.find(a=>a.id===2).strength,0);
  assert(cutOff.events.some(e=>e.type==='retreat'&&e.army.id===2&&e.army.to===surrender.region));
});
test('older scenario exports are explicitly rejected',()=>{
  assert.throws(()=>replayCampaign(scenario,{scenario:'lizeem-east-west-v1',seed:1731,day:1,commands:[]}),/different scenario/);
  assert.throws(()=>replayCampaign(scenario,{scenario:'lizeem-east-west-v2',seed:1731,day:1,commands:[]}),/different scenario/);
});

function localBattle(seed=1731){const c=createCampaign(scenario,seed);assert(c.heroTravel('caricas').ok);assert(c.watchBattles(true).ok);c.step(100);return c;}
test('hero travel uses adjacent regional routes and takes time without committing Minora to war',()=>{
  const c=createCampaign(scenario),initial=c.snapshot();assert(!c.heroTravel('nesdor').ok);assert.deepEqual(c.snapshot(),initial);
  assert(c.heroTravel('caricas').ok);assert(!c.heroTravel('nethereum').ok);c.step(2);assert.equal(c.snapshot().hero.region,'isareos');
  c.step();assert.equal(c.snapshot().hero.region,'caricas');assert.equal(c.snapshot().hero.journey,null);assert.equal(c.snapshot().hero.faction,null);
  assert.equal(c.snapshot().regions.isareos.owner,'minora');
});
test('only an available, watching hero pauses local battles; pending encounters freeze the entire day',()=>{
  const c=localBattle(),s=c.snapshot();assert.equal(s.pending.region,'caricas');assert.equal(s.day,9);assert.equal(s.hero.region,'caricas');
  c.step(100);assert.deepEqual(c.snapshot(),s);assert(!c.reinforce('caricas',80).ok);assert(!c.heroTravel('nesdor').ok);assert(!c.watchBattles(false).ok);assert.deepEqual(c.snapshot(),s);
  const neutral=createCampaign(scenario);neutral.watchBattles(true);assert(neutral.step(100).winner);assert.equal(neutral.snapshot().pending,null);
  const traveling=createCampaign(scenario);traveling.heroTravel('caricas');assert(traveling.step(100).winner,'Travel alone does not opt into encounters');
});
test('staying out preserves the exact unassisted battle, force state and RNG',()=>{
  const c=localBattle(),p=c.snapshot().pending,plain=createCampaign(scenario);plain.step(p.day);
  assert(c.resolveEncounter(p.id,null,'withdraw').ok);const s=c.snapshot(),base=plain.snapshot();
  assert.deepEqual(s.regions,base.regions);assert.deepEqual(s.armies,base.armies);assert.equal(s.rng,base.rng);assert.equal(s.day,base.day);assert.equal(s.pending,null);
  const report=s.events.filter(e=>e.type==='battle').at(-1);assert.equal(report.chance,report.baseChance);assert.equal(report.hero,null);
});
test('a bounded hero result can change conquest without replacing losses or duplicating a battle',()=>{
  const c=localBattle(),p=c.snapshot().pending,before=c.snapshot();
  for(const args of [[p.id,'minora','success'],['stale','west','success'],[p.id,'west','cheat'],[p.id,'east','withdraw']])assert(!c.resolveEncounter(...args).ok);
  assert.deepEqual(c.snapshot(),before);assert(c.resolveEncounter(p.id,'west','success').ok);
  const s=c.snapshot(),event=s.events.filter(e=>e.type==='battle').at(-1);
  assert.equal(s.regions.caricas.owner,'west');assert.equal(event.captured,true);assert.equal(event.chance,event.baseChance+.2);assert.equal(s.hero.readyOn,s.day+3);
  assert(!c.resolveEncounter(p.id,'west','success').ok);assert.deepEqual(c.snapshot(),s);
});
test('defeat applies the opposite chance change and works on either side',()=>{
  for(const faction of ['east','west']){const c=localBattle(),p=c.snapshot().pending;c.resolveEncounter(p.id,faction,'defeat');
    const event=c.snapshot().events.filter(e=>e.type==='battle').at(-1);assert(Math.abs(event.chance-event.baseChance-(faction==='east'?.1:-.1))<1e-10);}
});
test('replays preserve pending encounters, completed results, same-day commands and future outcomes',()=>{
  const c=localBattle();assert.deepEqual(replayCampaign(scenario,c.snapshot()).snapshot(),c.snapshot());
  const p=c.snapshot().pending;c.resolveEncounter(p.id,'west','success');c.watchBattles(false);c.reinforce('nethereum',20);
  const restored=replayCampaign(scenario,c.snapshot());assert.deepEqual(restored.snapshot(),c.snapshot());assert.deepEqual(restored.step(100),c.step(100));
  assert.throws(()=>replayCampaign(scenario,{...c.snapshot(),commands:[{day:0,type:'hero-result',id:p.id,faction:'west',outcome:'success'}]}));
});
test('hero encounter interruptions preserve force accounting and pending arrival queues across 50 seeds',()=>{
  const total=s=>Object.values(s.regions).reduce((n,r)=>n+r.garrison,0)+s.armies.reduce((n,a)=>n+a.strength,0);
  for(let seed=0;seed<50;seed++){
    const c=createCampaign(scenario,seed);c.heroTravel('caricas');c.watchBattles(true);let prior=c.snapshot();
    for(let day=0;day<100&&!prior.winner;day++){
      const recruited=scenario.regions.reduce((n,r)=>n+(prior.regions[r.id].recovery?0:Math.max(0,Math.min(r.recruits,scenario.rules.garrisonCap-prior.regions[r.id].garrison))),0);
      let s=c.step();if(s.pending){assert.deepEqual(replayCampaign(scenario,s).snapshot(),s);c.resolveEncounter(s.pending.id,seed%2?'east':'west',seed%3?'success':'defeat');s=c.snapshot();}
      const losses=s.events.slice(prior.events.length).reduce((n,e)=>n+(e.type==='battle'?e.attackLoss+e.defenseLoss:e.type==='surrender'?e.strength:0),0);
      assert.equal(total(s),total(prior)+recruited-losses);assert.equal(s.regions.isareos.owner,'minora');assert.equal(s.arrivals.length,0);assert.equal(s.pending,null);prior=s;
    }
  }
});
test('encounter combat has meaningful success and defeat, bounded movement, cooldowns and terminal outcomes',()=>{
  for(const attack of [false,true]){
    const encounter=createLizeemEncounter();let s=encounter.snapshot();
    for(let i=0;i<6000;i++){s=encounter.tick(1/60,attack?encounterAutoplayInput(s):{attack:true});if(s.outcome)break;}
    assert.equal(s.outcome,attack?'success':'defeat');assert.deepEqual(encounter.tick(.1,{attack:true}),s);
  }
  const model=createLizeemEncounter();const a=model.tick(.1,{x:1,z:1,attack:true}),b=model.tick(.1,{attack:true});assert(b.hero.cooldown<a.hero.cooldown);assert.equal(a.hero.swing,.35);
  for(let i=0;i<60;i++)model.tick(.1,{x:1,z:1});assert(model.snapshot().hero.x<=7&&model.snapshot().hero.z<=7);assert.throws(()=>model.tick(1));
});
test('dodge avoids a telegraphed strike and the encounter snapshot cannot mutate the model',()=>{
  const c=createLizeemEncounter();let s=c.snapshot();
  while(!s.guards.some(g=>g.phase==='windup'&&g.timer<.2))s=c.tick(1/60);
  const health=s.hero.hp;c.tick(1/60,{dodge:true});for(let i=0;i<11;i++)s=c.tick(1/60);
  assert.equal(s.hero.hp,health);s.hero.hp=0;assert(c.snapshot().hero.hp>0);
});
