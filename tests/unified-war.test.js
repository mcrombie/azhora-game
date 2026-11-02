import test from 'node:test';
import assert from 'node:assert/strict';
import {createAdventureWar,createOpeningWar} from '../src/experiments/day-night/opening-war.js';
import {createWorldWar,worldWarScenario,WORLD_WAR_SCENARIO,OPENING_WORLD_WAR_SCENARIO,LEGACY_UNIFIED_WORLD_WAR_SCENARIO,FOOD_WORLD_SCENARIO,UNIFIED_WORLD_WAR_ID,UNIFIED_WORLD_WAR_SCENARIO,isUnifiedWorldWar,usesReviewedAgriculture} from '../src/app/exploration/world-war.js';
import {FOOD_WORLD_KEY} from '../src/app/food-world/scenario.js';
import {validateWorldWarSave,worldWarStore,WORLD_WAR_KEY} from '../src/app/exploration/war-checkpoint.js';
import {createAdventureTimeGate} from '../src/app/exploration/adventure-time.js';
import {commanderOutcome} from './fixtures/commander-outcomes.js';

const exploration={version:1,character:'teresod',position:{x:-2414,y:21.3,z:49},heading:0,camera:{yaw:0,pitch:.3,distance:8},elapsed:0,cells:[]};
const save=(war,key=WORLD_WAR_KEY)=>({version:1,format:key,exploration:structuredClone(exploration),...war.checkpoint()});
const tick=(war,seconds,active=true)=>{for(let left=seconds;left>1e-7;left-=Math.min(1,left))war.tick(Math.min(1,left),active);};
const near=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const legacyAdventure=()=>createAdventureWar({...createOpeningWar().checkpoint(),fullCampaign:true});
const waitNext=war=>{const f=war.forecast();assert(f.ok,f.reason);return f.kind==='battle-aftermath'?war.advanceToAftermath(f.key):war.advanceToNextEvent(f.key);};
const stock=state=>Object.values(state.regions).reduce((n,r)=>n+r.food.store,0)+state.armies.reduce((n,a)=>n+a.supply.carried,0);
function conserved(state){
  const ledger=state.food.last;
  if(!ledger){assert(Object.values(state.regions).every(r=>r.food.store>=0));assert(state.armies.every(a=>a.supply.carried>=0));return;}
  near(ledger.opening+ledger.produced-ledger.consumed-ledger.lost,ledger.closing);near(ledger.closing,stock(state));
  for(const army of state.armies)if(army.status==='destroyed')assert.equal(army.supply.carried,0,'Destroyed armies cannot retain usable provisions');
}
function beginRally(war,side,region='caricas'){
  const battle=war.snapshot().engagements.find(b=>b.region===region&&b.status==='active');
  const name=UNIFIED_WORLD_WAR_SCENARIO.regions.find(r=>r.id===region).name;
  assert(war.syncRegion(name).ok);assert(war.campaign.joinBattle(battle.id,battle.location).ok);
  let pending=war.snapshot().pending;
  assert(war.campaign.resolveEncounter(pending.id,side,'success','vanguard-broken',pending.participation.guards,{escaped:0}).ok);
  assert(war.campaign.joinBattle(battle.id,battle.location).ok);
  assert(war.campaign.chooseAssault(war.snapshot().pending.id,'allied').ok);
  return war.snapshot().pending;
}

test('new adventures use the reviewed agriculture, supply planning and the elapsed campaign under one versioned scenario',()=>{
  const war=createAdventureWar(),state=war.snapshot(),scenario=worldWarScenario(state.scenario);
  assert.equal(state.scenario,UNIFIED_WORLD_WAR_ID);assert.equal(scenario,UNIFIED_WORLD_WAR_SCENARIO);
  assert(isUnifiedWorldWar(state.scenario));assert(usesReviewedAgriculture(state.scenario));
  assert.equal(state.version,4);assert.equal(war.clock().elapsedSeconds,0);assert.equal(war.clock().hour,6);
  assert.equal(war.clock().fullCampaign,true);assert.equal(war.clock().secondsPerDay,60);
  assert.equal(scenario.rules.localBattleTiming,'scheduled');assert.equal(war.clock().localBattleTiming,'scheduled');assert.equal(scenario.rules.supplyPlanning,'endurance-v1');
  assert.deepEqual(scenario.commanders,WORLD_WAR_SCENARIO.commanders);assert.deepEqual(scenario.openingOrders,[]);assert.equal(scenario.openingBattles.length,2);
  for(const region of scenario.regions){
    assert.deepEqual(region.food,FOOD_WORLD_SCENARIO.regions.find(r=>r.id===region.id).food);
    assert.deepEqual(region.housing,FOOD_WORLD_SCENARIO.regions.find(r=>r.id===region.id).housing);
    assert(state.regions[region.id].food.population>0);
  }
  assert.equal(state.regions.nethereum.food.production,220);assert.equal(state.regions.isareos.food.store,2380);
});

test('food, armies and daylight share minute boundaries and all stop in the tower or while reading',()=>{
  const war=createAdventureWar(),gate=createAdventureTimeGate();war.begin();
  for(const room of ['tower','lookout'])tick(war,120,!gate.reason({room}));
  assert.equal(war.clock().elapsedSeconds,0);assert.equal(war.snapshot().food.last,null);
  tick(war,59.75,!gate.reason());assert.equal(war.snapshot().day,0);assert.equal(war.snapshot().food.last,null);
  tick(war,.25);assert.equal(war.snapshot().day,1);assert.equal(war.snapshot().food.last.day,1);assert.equal(war.clock().hour,7);conserved(war.snapshot());
  assert(war.snapshot().armies.some(a=>a.status==='engaged'&&a.supply.carried>0));
  const checkpoint=war.checkpoint(),state=war.snapshot();tick(war,180,!gate.reason({mode:'resident'}));tick(war,180,!gate.reason({reading:true}));
  assert.deepEqual(war.snapshot(),state);assert.deepEqual(war.checkpoint(),checkpoint);
  tick(war,60,!gate.reason());assert.equal(war.snapshot().food.last.day,2);assert.equal(war.clock().elapsedSeconds,120);conserved(war.snapshot());
});

test('waiting processes the same food ledgers and commands as ordinary travel without extra forecasting ticks',()=>{
  const waited=createAdventureWar(),walking=createAdventureWar();
  const initial=waited.checkpoint();for(let i=0;i<20;i++)waited.forecast();assert.deepEqual(waited.checkpoint(),initial);
  waitNext(waited);walking.begin();tick(walking,120);assert.deepEqual(waited.snapshot(),walking.snapshot());
  assert.equal(waited.snapshot().food.last.day,2);assert.equal(waited.snapshot().engagements[0].startedAt,0);conserved(waited.snapshot());
  for(let i=0;i<8&&!waited.snapshot().winner;i++){
    const before=waited.clock().elapsedSeconds;const result=waitNext(waited);assert(result.ok);const elapsed=waited.clock().elapsedSeconds;
    walking.begin();tick(walking,elapsed-before);assert.deepEqual(waited.snapshot(),walking.snapshot());conserved(waited.snapshot());
  }
  assert.deepEqual(createAdventureWar(waited.checkpoint()).snapshot(),waited.snapshot());
});

test('both sides finish a supplied field battle at its deadline with normal food and army updates',()=>{
  for(const side of ['west','east']){
    const war=createAdventureWar();war.advance(1);war.begin();tick(war,7.375);
    const initial=war.snapshot(),seconds=war.clock().elapsedSeconds,pending=beginRally(war,side),held=war.checkpoint(),deadline=pending.endsOn*60;
    tick(war,120);war.advance(8);assert.deepEqual(war.checkpoint(),held);
    assert(war.campaign.resolveEncounter(pending.id,side,'success','rally-secured',pending.rally.guards,commanderOutcome(war.campaign,side,true)).ok);
    const result=war.snapshot();assert.equal(result.day,pending.endsOn);assert.equal(war.clock().elapsedSeconds,deadline);assert.equal(war.clock().fraction,0);
    assert(deadline>seconds);assert.equal(result.engagements[0].status,'resolved');assert.equal(result.engagements[0].resolvedAt,deadline);assert.equal(result.regions.caricas.owner,side);
    assert.equal(result.food.last.day,pending.endsOn);assert.notEqual(result.food.last.opening,initial.food.last.opening);
    assert(result.food.last.produced>0&&result.food.last.consumed>0,'Skipped campaign minutes still produce food and feed inhabitants');
    const ovesos=result.engagements.find(b=>b.region==='ovesos');assert.equal(ovesos.status,'active');assert.equal(ovesos.startedAt,120);assert.equal(ovesos.endsAt,300);
    assert.equal(result.events.find(e=>e.type==='battle-start'&&e.engagement.region==='ovesos').elapsedSeconds,120);
    const committed=war.checkpoint();assert.equal(war.campaign.resolveEncounter(pending.id,side,'success','rally-secured',pending.rally.guards,commanderOutcome(war.campaign,side,true)).ok,false);
    assert.deepEqual(war.checkpoint(),committed,'A repeated Continue cannot charge another minute or meal');
    conserved(result);assert.deepEqual(createAdventureWar(war.checkpoint()).snapshot(),result);
  }
});

test('legacy unified roadside interception keeps minute time and conserves the column supplies',()=>{
  const war=createAdventureWar({...createWorldWar(null,LEGACY_UNIFIED_WORLD_WAR_SCENARIO).checkpoint(),sharedOpening:2,fullCampaign:true,openingEventTimes:createWorldWar(null,LEGACY_UNIFIED_WORLD_WAR_SCENARIO).snapshot().events.map(()=>0)});war.advance();war.begin();tick(war,19.5);
  const army=war.snapshot().armies.find(a=>a.status==='marching'&&a.owner==='west');war.syncRegion('Nethereum');
  assert(war.campaign.interceptArmy(army.id,'east',{region:'nethereum',location:{x:100,z:100},position:{x:100,z:110},fraction:.325}).ok);
  const pending=war.snapshot().pending,seconds=war.clock().elapsedSeconds,food=war.snapshot().food.last;
  const commanders=Object.fromEntries(Object.entries(pending.commanders).map(([side,c])=>[side,{id:c.id,hp:1,outcome:'routed'}]));
  assert(war.campaign.resolveEncounter(pending.id,'east','success','rally-secured',pending.rally.guards,{escaped:0,alliesLost:0,routed:0,allyDamage:0,commanders}).ok);
  assert.equal(war.clock().elapsedSeconds,seconds);assert.equal(war.snapshot().food.last.consumed,food.consumed);conserved(war.snapshot());
  assert.equal(war.snapshot().armies.find(a=>a.id===army.id).arrives,army.arrives+1);assert.deepEqual(createAdventureWar(war.checkpoint()).snapshot(),war.snapshot());
});

test('later scheduled battles conserve supplies, advance exactly to their deadlines and replay through victory',()=>{
  for(const side of ['west','east']){
    const war=createAdventureWar();war.advance(1);let battles=0;
    for(let i=0;i<200&&!war.snapshot().winner;i++){
      const battle=war.snapshot().engagements.find(b=>b.status==='active');
      if(!battle){waitNext(war);conserved(war.snapshot());continue;}
      const held=war.clock().elapsedSeconds,pending=beginRally(war,side,battle.region);
      conserved(war.snapshot());
      assert(war.campaign.resolveEncounter(pending.id,side,'success','rally-secured',pending.rally.guards,commanderOutcome(war.campaign,side,true)).ok);
      const state=war.snapshot();assert.equal(war.clock().elapsedSeconds,battle.endsAt);assert(war.clock().elapsedSeconds>held);conserved(state);
      assert.equal(state.food.last.day,battle.endsOn);assert.equal(state.engagements.find(b=>b.id===battle.id).resolvedAt,battle.endsAt);battles++;
      assert.deepEqual(createAdventureWar(war.checkpoint()).snapshot(),state);
    }
    assert.equal(war.snapshot().winner,side);assert(battles>=2,'Exercise later battles as well as the opening');
  }
});

test('legacy full campaigns, rehearsals and separate food saves retain their original rules and save slots',()=>{
  const ordinary=createWorldWar(),legacy=legacyAdventure(),rehearsal=createOpeningWar(),food=createWorldWar(null,FOOD_WORLD_SCENARIO);
  for(const old of [ordinary,legacy,rehearsal])assert.equal(old.snapshot().food,undefined);
  assert.equal(legacy.snapshot().scenario,OPENING_WORLD_WAR_SCENARIO.id);assert.equal(food.clock().secondsPerDay,30);
  legacy.advance(8);legacy.begin();tick(legacy,13.125);const restored=createAdventureWar(legacy.checkpoint());
  assert.deepEqual(restored.snapshot(),legacy.snapshot());assert.equal(restored.clock().elapsedSeconds,493.125);
  assert.equal(restored.snapshot().food,undefined);assert(!usesReviewedAgriculture(restored.snapshot().scenario));
  food.advance(8);const foodSave=save(food,FOOD_WORLD_KEY);assert(validateWorldWarSave(foodSave,FOOD_WORLD_KEY));
  assert.deepEqual(createWorldWar(foodSave).snapshot(),food.snapshot());assert(usesReviewedAgriculture(food.snapshot().scenario));
  const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)},main=worldWarStore(storage),oldFood=worldWarStore(storage,FOOD_WORLD_KEY);
  assert(oldFood.save(foodSave).ok);const unified=save(createAdventureWar());assert(main.save(unified).ok);
  assert.deepEqual(oldFood.read().data,foodSave);assert.deepEqual(main.read().data,unified);
  for(const old of [ordinary,legacy,rehearsal])assert(validateWorldWarSave(save(old)));
  for(const invalid of [{...unified,fullCampaign:undefined},{...unified,sharedOpening:undefined},{...unified,format:FOOD_WORLD_KEY},{...foodSave,format:WORLD_WAR_KEY}])assert(!validateWorldWarSave(invalid));
  assert(!oldFood.save({...unified,format:FOOD_WORLD_KEY}).ok);assert.deepEqual(oldFood.read().data,foodSave);
  assert.throws(()=>createOpeningWar(unified));assert.throws(()=>createAdventureWar(foodSave));
});

test('continuing an earlier adventure preserves immediate battle history and migrates only future battles',()=>{
  // Build the checkpoint with the old core, not the new elapsed adapter: this
  // is the history a released v3 campaign actually wrote before the change.
  const old=createWorldWar(null,worldWarScenario('lizeem-adventure-food-v3'));old.advance(1);old.resetPhase(3.6875);
  const elapsed=67.375,priorEvents=old.snapshot().events.length,foodBefore=old.snapshot().food.last,pending=beginRally(old,'west');
  assert(old.campaign.resolveEncounter(pending.id,'west','success','rally-secured',pending.rally.guards,commanderOutcome(old.campaign,'west',true)).ok);
  const original=old.snapshot(),timestamps=original.events.map((e,i)=>i<priorEvents?e.day*60:elapsed);
  for(const key of ['day','opening','produced','consumed'])assert.equal(original.food.last[key],foodBefore[key],'Historical immediate battles keep their old accounting');
  conserved(original);assert.deepEqual(createWorldWar(old.checkpoint()).snapshot(),original);
  const checkpoint={...old.checkpoint(),sharedOpening:2,fullCampaign:true,openingEventTimes:timestamps};
  const continued=createAdventureWar(checkpoint),state=continued.snapshot();
  assert.equal(continued.clock().elapsedSeconds,elapsed);assert.equal(continued.clock().localBattleTiming,'scheduled');
  assert.deepEqual(state.events.map(({elapsedSeconds,...event})=>event),original.events);
  assert.deepEqual(state.events.map(e=>e.elapsedSeconds),timestamps);assert.equal(state.engagements[0].resolvedAt,elapsed);
  for(const key of ['regions','armies','food','hero','winner'])assert.deepEqual(state[key],original[key],key+' must not change during migration');
  assert.deepEqual(state.commands.slice(0,original.commands.length),original.commands,'Old commands retain their original semantics');
  const migrated=continued.checkpoint();assert.equal(migrated.simulation.commands.length,original.commands.length+1);
  assert.deepEqual(createAdventureWar(migrated).checkpoint(),migrated,'Repeated loading does not append another migration');
  continued.advance(1);const next=beginRally(continued,'west','ovesos');
  assert(continued.campaign.resolveEncounter(next.id,'west','success','rally-secured',next.rally.guards,commanderOutcome(continued.campaign,'west',true)).ok);
  assert.equal(continued.clock().elapsedSeconds,next.endsOn*60);assert.equal(continued.snapshot().engagements[0].resolvedAt,elapsed);
  conserved(continued.snapshot());assert.deepEqual(createAdventureWar(continued.checkpoint()).snapshot(),continued.snapshot());
});

test('already completed older adventures remain unchanged when opened',()=>{
  const old=createWorldWar(null,worldWarScenario('lizeem-adventure-food-v3'));old.advance(200);assert(old.snapshot().winner);
  const checkpoint={...old.checkpoint(),sharedOpening:2,fullCampaign:true,openingEventTimes:old.snapshot().events.map(e=>e.day*60)};
  const restored=createAdventureWar(checkpoint);assert.equal(restored.clock().complete,true);
  assert.deepEqual(restored.checkpoint(),checkpoint,'No rule migration rewrites a completed campaign');conserved(restored.snapshot());
});

test('death retries preserve the unified food ledger and reject cross-scenario rewinds',()=>{
  const war=createAdventureWar();war.advance(1);const pending=beginRally(war,'west'),before=save(war),previous=war.snapshot();
  assert(war.campaign.resolveEncounter(pending.id,'west','defeat','driven-back',0,commanderOutcome(war.campaign,'west')).ok);
  const data={...save(war),afterlife:{version:1,form:'living',inLimbo:true,death:{battleId:pending.id,stage:'rally',side:'west',previousForm:'living',fallen:exploration.position,before,report:'The army settled this field while you fell.'}}};
  assert(validateWorldWarSave(data));assert.deepEqual(createAdventureWar(data).snapshot(),war.snapshot());
  assert.equal(war.clock().elapsedSeconds,pending.endsOn*60);assert.equal(data.afterlife.death.before.simulation.day,1);
  const retry=createAdventureWar(data.afterlife.death.before);assert.deepEqual(retry.snapshot(),previous);
  assert.equal(retry.clock().elapsedSeconds,60,'Retry rewinds the deadline charge to the original entry clock');
  assert(retry.campaign.resolveEncounter(pending.id,'west','defeat','driven-back',0,commanderOutcome(retry.campaign,'west')).ok);
  assert.deepEqual(retry.snapshot(),war.snapshot());conserved(retry.snapshot());
  const crossed=structuredClone(data);crossed.afterlife.death.before=save(legacyAdventure());assert(!validateWorldWarSave(crossed));
});

test('economic interventions survive save replay and the completed unified campaign remains frozen',()=>{
  const war=createAdventureWar();assert(war.campaign.foodAction({type:'production',region:'nesdor',condition:.4}).ok);
  assert(war.campaign.foodAction({type:'route',from:'caricas',to:'isareos',blocked:true}).ok);
  war.advance(7);conserved(war.snapshot());const saved=save(war);assert(validateWorldWarSave(saved));
  const restored=createAdventureWar(saved);assert.deepEqual(restored.snapshot(),war.snapshot());
  war.advance(200);restored.advance(200);assert(war.snapshot().winner);assert.deepEqual(restored.snapshot(),war.snapshot());
  assert(war.clock().complete);const ended=war.checkpoint();war.begin();tick(war,180);war.advance(10);assert.deepEqual(war.checkpoint(),ended);
  assert.equal(war.forecast().ok,false);assert(validateWorldWarSave(save(war)));conserved(war.snapshot());
});
