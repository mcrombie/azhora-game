import test from 'node:test';
import assert from 'node:assert/strict';
import {createOpeningWar,openingWaitForecast} from '../src/experiments/day-night/opening-war.js';
import {openingBattleTime} from '../src/experiments/day-night/opening-battle-time.js';
import {openingCountdown,waitActionLabel} from '../src/experiments/day-night/opening-time-label.js';
import {createWorldWar,WORLD_WAR_SCENARIO,OPENING_WORLD_WAR_SCENARIO} from '../src/app/exploration/world-war.js';
import {worldWarArmies} from '../src/app/exploration/war-armies.js';
import {validateWorldWarSave,WORLD_WAR_KEY} from '../src/app/exploration/war-checkpoint.js';
import {createCampaign} from '../src/simulation/campaign.js';
const near=(actual,want)=>assert(Math.abs(actual-want)<1e-7,`${actual} != ${want}`);
const tick=(war,seconds)=>{for(let i=0;i<Math.floor(seconds);i++)war.tick(1,true);if(seconds%1)war.tick(seconds%1,true);};
const battle=war=>war.snapshot().engagements.find(b=>b.region==='caricas');
const arrive=war=>{const f=war.forecast();assert.equal(f.kind,'army-arrival');assert(war.advanceToNextEvent(f.key).ok);return battle(war);};
const commanders=(pending,side)=>Object.fromEntries(Object.entries(pending.commanders).filter(([,c])=>c.status==='active').map(([f,c])=>[f,{id:c.id,hp:f===side?c.hp:1,outcome:f===side?'active':'routed'}]));

function enter(war){war.syncRegion('Caricas');const b=battle(war);assert(war.campaign.joinBattle(b.id,b.location).ok);return b;}
function finalAssault(war,side){const b=battle(war);assert(war.campaign.joinBattle(b.id,b.location).ok);assert(war.campaign.chooseAssault(war.snapshot().pending.id,'allied').ok);return war.snapshot().pending;}
function win(war,pending,side){assert(war.campaign.resolveEncounter(pending.id,side,'success','rally-secured',pending.rally.guards,{escaped:0,alliesLost:0,routed:0,allyDamage:0,commanders:commanders(pending,side)}).ok);}

test('adventure starts 00:00 with a forecast before army orders; Caricas opens at exactly 03:00',()=>{
  const war=createOpeningWar(),time=war.clock();
  assert.equal(war.snapshot().day,0);assert.equal(time.elapsedSeconds,0);assert.equal(time.hour,6);assert.equal(time.periodLabel,'first light');assert.equal(time.running,false);
  assert.equal(time.secondsPerDay,60);assert.equal(time.solarCycleSeconds,1440);assert.equal(time.sharedOpening,true);assert.equal(time.calendarDay,undefined);
  const forecast=war.forecast();assert.equal(forecast.dueAt,180);assert.equal(forecast.elapsedSeconds,180);assert.equal(forecast.remainingSeconds,180);
  war.begin();tick(war,60);const march=war.snapshot().armies.find(a=>a.status==='marching');assert(march);assert.equal(march.arrives,3);
  const a=worldWarArmies(war.snapshot(),WORLD_WAR_SCENARIO,()=>true,war.clock()).find(a=>a.id===march.id);
  tick(war,119);assert.equal(battle(war),undefined);near(war.clock().elapsedSeconds,179);
  const b=worldWarArmies(war.snapshot(),WORLD_WAR_SCENARIO,()=>true,war.clock()).find(candidate=>candidate.id===a.id);assert.notDeepEqual([a.x,a.y],[b.x,b.y]);
  war.tick(1,true);assert.equal(battle(war).startedAt,180);assert.equal(battle(war).endsAt,360);near(war.clock().elapsedSeconds,180);near(war.clock().hour,9);
  assert.equal(war.snapshot().events.find(e=>e.type==='battle-start').elapsedSeconds,180);
});

test('inactive and paused play hold the same elapsed phase; save restoration keeps subminute precision',()=>{
  const war=createOpeningWar();war.begin();tick(war,73.25);near(war.clock().elapsedSeconds,73.25);near(war.clock().hour,6+73.25/60);
  const frozen=war.checkpoint();war.tick(1,false);assert.deepEqual(war.checkpoint(),frozen);war.pause();tick(war,100);assert.deepEqual(war.checkpoint(),frozen);
  const restored=createOpeningWar(frozen);near(restored.clock().elapsedSeconds,73.25);near(restored.clock().hour,war.clock().hour);assert.equal(restored.clock().running,false);
  assert.throws(()=>war.setSpeed(4));assert.throws(()=>war.setSpeed(20));assert.throws(()=>war.tick(2,true));
});

test('waiting from 00:00 simulates actual orders and stops at 03:00 without moving or enlisting the hero',()=>{
  const war=createOpeningWar(),from=war.snapshot(),forecast=war.forecast();
  assert.deepEqual(openingWaitForecast(from,war.clock()),forecast);assert.deepEqual(war.snapshot(),from);
  assert.equal(war.advanceToNextEvent().ok,false);assert.equal(war.advanceToAftermath(forecast.key).ok,false);
  const result=war.advanceToNextEvent(forecast.key);assert.equal(result.ok,true);assert.equal(result.seconds,180);assert.equal(result.from.elapsedSeconds,0);assert.equal(result.to.elapsedSeconds,180);
  assert.equal(war.clock().running,false);assert.equal(war.snapshot().hero.region,from.hero.region);assert.equal(war.snapshot().pending,null);assert.equal(battle(war).status,'active');
  assert.equal(war.advanceToNextEvent(forecast.key).ok,false);assert.equal(war.clock().transition.reason,'wait-for-army');
  const ongoing=war.forecast();assert.equal(ongoing.kind,'battle-aftermath');assert.equal(ongoing.dueAt,360);
  war.begin();enter(war);const held=war.clock().elapsedSeconds;war.tick(1,true);assert.equal(war.clock().elapsedSeconds,held);assert.equal(war.forecast().ok,false);
});

test('unattended waiting announces Ovesos at 05:00 then settles Caricas at 06:00',()=>{
  const war=createOpeningWar();arrive(war);
  const interrupted=war.advanceToAftermath(war.forecast().key);
  assert.equal(interrupted.interrupted,true);assert.equal(interrupted.to.elapsedSeconds,300);
  assert.match(interrupted.notice,/new battle.*Ovesos.*Adventure 05:00.*before the Caricas outcome/);
  assert.equal(interrupted.complete,false);assert.equal(war.clock().running,false);assert.equal(battle(war).status,'active');
  const done=war.advanceToAftermath(war.forecast().key);assert.equal(done.complete,true);assert.equal(war.clock().elapsedSeconds,360);assert.equal(battle(war).resolvedAt,360);
  assert.equal(war.snapshot().winner,null);const ended=war.checkpoint();assert.equal(war.toggle(),false);war.begin();tick(war,20);war.advance(10);war.campaign.step(3);assert.deepEqual(war.checkpoint(),ended);
});

test('both factions complete duel and allied assault at the current adventure timestamp with no unrelated orders',()=>{
  for(const side of ['west','east']){
    const war=createOpeningWar(),b=arrive(war);war.begin();tick(war,17.25);enter(war);war.pause();
    const before=war.snapshot(),elapsed=war.clock().elapsedSeconds;
    const elsewhere=state=>({regions:Object.fromEntries(Object.entries(state.regions).filter(([id])=>id!=='caricas')),armies:state.armies.filter(a=>a.to!=='caricas'&&a.region!=='caricas')});
    const others=elsewhere(before);
    assert(war.campaign.chooseDuel(b.id,side).ok);assert(war.campaign.resolveEncounter(b.id,side,'success','champion-yielded',0).ok);
    assert.equal(war.snapshot().day,3);assert.equal(war.clock().elapsedSeconds,elapsed);assert.deepEqual(elsewhere(war.snapshot()),others);
    const p=finalAssault(war,side);win(war,p,side);const after=war.snapshot();
    assert.equal(war.clock().complete,true);assert.equal(war.clock().elapsedSeconds,elapsed);assert.equal(after.day,3);assert.equal(after.regions.caricas.owner,side);
    assert.equal(battle(war).resolvedAt,197.25);assert.equal(after.events.findLast(e=>e.type==='battle').elapsedSeconds,197.25);
    assert.deepEqual(elsewhere(after).regions,others.regions,'No daily recruitment or other province changes');
    for(const army of others.armies)assert.deepEqual(after.armies.find(a=>a.id===army.id),army,'No unrelated army orders or march progress');
    assert(!after.events.some(e=>e.day>3));assert(!after.engagements.some(e=>e.region==='ovesos'),'Combat does not manufacture a later battle');
    const restored=createOpeningWar(war.checkpoint());assert.deepEqual(restored.snapshot(),after);assert.equal(restored.clock().elapsedSeconds,elapsed);
  }
});

test('ordinary interception, withdrawal and final defeat retain their current time and actual contribution',()=>{
  const war=createOpeningWar();arrive(war);war.begin();tick(war,9);const b=enter(war);war.pause();
  const before=war.clock().elapsedSeconds;assert(war.campaign.resolveEncounter(b.id,'west','withdraw','withdrew',1,{escaped:0}).ok);assert.equal(war.clock().elapsedSeconds,before);
  assert(war.campaign.joinBattle(b.id,b.location).ok);let p=war.snapshot().pending;
  assert(war.campaign.resolveEncounter(p.id,'west','success','vanguard-broken',p.participation.guards,{escaped:0}).ok);assert.equal(war.clock().elapsedSeconds,before);
  p=finalAssault(war,'west');const reports=Object.fromEntries(Object.entries(p.commanders).filter(([,c])=>c.status==='active').map(([side,c])=>[side,{id:c.id,hp:c.hp,outcome:'active'}]));
  assert(war.campaign.resolveEncounter(p.id,'west','defeat','driven-back',0,{escaped:0,alliesLost:0,routed:0,allyDamage:0,commanders:reports}).ok);
  assert.equal(war.clock().elapsedSeconds,before);assert.equal(war.clock().complete,true);assert.equal(battle(war).resolvedAt,before);
});

test('version two checkpoints validate replay, reject obsolete previews and preserve exact event timestamps',()=>{
  const war=createOpeningWar();war.begin();tick(war,93);const save=war.checkpoint(),restored=createOpeningWar(save);
  assert.equal(save.sharedOpening,2);assert(save.fraction>=0&&save.fraction<30);assert.equal(save.speed,1);assert.equal(save.simulation.scenario,OPENING_WORLD_WAR_SCENARIO.id);
  assert.deepEqual(restored.snapshot(),war.snapshot());assert.throws(()=>createOpeningWar({...save,sharedOpening:1}));assert.throws(()=>createOpeningWar({...save,speed:4}));
  assert.throws(()=>createOpeningWar({...save,fraction:1440}));assert.throws(()=>createOpeningWar({...save,openingEventTimes:[]}));
  assert.throws(()=>createOpeningWar({...save,openingEventTimes:save.openingEventTimes.map(()=>10000)}));
  const exploration={version:1,character:'teresod',position:{x:-2414,y:21.3,z:49},heading:0,camera:{yaw:0,pitch:.3,distance:8},elapsed:12,cells:['0,0']};
  assert(validateWorldWarSave({version:1,format:WORLD_WAR_KEY,exploration,...save}));
});

test('battle wording promises held adventure time rather than hidden calendar skips',()=>{
  const b={started:3,endsOn:6},first=openingBattleTime({day:3,reinforcements:{}},b),final=openingBattleTime({day:3,rally:{}},b);
  assert.match(first,/current adventure time.*no hidden wait/);assert.match(final,/settles Caricas now.*Other armies do not advance/);assert(!/noon|day 4|day 6/.test(first+final));
  const later=openingBattleTime({region:'nesdor',rally:{}},{region:'nesdor'});
  assert.match(later,/settles Nesdor now/);assert.doesNotMatch(later,/Caricas/);
});

test('later battle and orders forecasts name their destination and correct waiting action',()=>{
  assert.equal(openingCountdown({ok:true,kind:'army-arrival',regionName:'Ovesos',remainingSeconds:91}),'Ovesos · Army arrives in 1m 31s');
  assert.equal(openingCountdown({ok:true,kind:'battle-aftermath',regionName:'Nesdor',remainingSeconds:42}),'Nesdor · Battle ends in 0m 42s');
  assert.equal(openingCountdown({ok:true,kind:'campaign-orders',remainingSeconds:60}),'Next orders in 1m 00s');
  assert.equal(waitActionLabel('campaign-orders'),'Wait for the next orders');
  assert.equal(waitActionLabel('battle-aftermath'),'Wait for the battle’s outcome');
});

test('normal campaigns retain thirty-second days and their scheduled battle phase advances',()=>{
  const war=createWorldWar();war.begin();tick(war,29);assert.equal(war.snapshot().day,1);war.tick(1,true);assert.equal(war.snapshot().day,2);
  assert.equal(war.clock().secondsPerDay,30);assert.equal(war.clock().sharedOpening,undefined);assert.equal(war.checkpoint().sharedOpening,undefined);
  war.advance();const b=battle(war);war.syncRegion('Caricas');assert(war.campaign.joinBattle(b.id,b.location).ok);assert(war.campaign.chooseDuel(b.id,'west').ok);
  assert(war.campaign.resolveEncounter(b.id,'west','success','champion-yielded',0).ok);assert.equal(war.snapshot().day,4);
  assert.throws(()=>createCampaign({...OPENING_WORLD_WAR_SCENARIO,rules:{...OPENING_WORLD_WAR_SCENARIO.rules,localBattleTiming:'later'}}));
});
