import test from 'node:test';
import assert from 'node:assert/strict';
import {createAdventureWar,createOpeningWar,adventureWaitForecast} from '../src/experiments/day-night/opening-war.js';
import {createWorldWar,OPENING_WORLD_WAR_SCENARIO} from '../src/app/exploration/world-war.js';
import {validateWorldWarSave,worldWarStore,WORLD_WAR_KEY} from '../src/app/exploration/war-checkpoint.js';

const near=(value,expected)=>assert(Math.abs(value-expected)<1e-7,`${value} != ${expected}`);
const tick=(war,seconds)=>{for(let i=0;i<Math.floor(seconds);i++)war.tick(1,true);if(seconds%1)war.tick(seconds%1,true);};
const regionName=id=>OPENING_WORLD_WAR_SCENARIO.regions.find(r=>r.id===id).name;
function waitNext(war){const forecast=war.forecast();assert(forecast.ok,forecast.reason);return forecast.kind==='battle-aftermath'?war.advanceToAftermath(forecast.key):war.advanceToNextEvent(forecast.key);}
function win(war,battle,side,duel=false){
  assert(war.syncRegion(regionName(battle.region)).ok);
  assert(war.campaign.joinBattle(battle.id,battle.location).ok);
  const pending=war.snapshot().pending,held=war.clock().elapsedSeconds;
  tick(war,10);war.advance(1);assert.equal(war.clock().elapsedSeconds,held,'An active encounter holds strategic time');
  if(duel&&pending.duelAvailable){
    assert(war.campaign.chooseDuel(pending.id,side).ok);
    assert(war.campaign.resolveEncounter(pending.id,side,'success','champion-yielded',0).ok);
  }else assert(war.campaign.resolveEncounter(pending.id,side,'success','vanguard-broken',pending.participation.guards,{escaped:0}).ok);
  assert(war.campaign.joinBattle(battle.id,battle.location).ok);
  let rally=war.snapshot().pending;assert(war.campaign.chooseAssault(rally.id,'allied').ok);rally=war.snapshot().pending;
  const commanders=Object.fromEntries(Object.entries(rally.commanders).filter(([,c])=>c.status==='active').map(([f,c])=>[f,{id:c.id,hp:f===side?c.hp:1,outcome:f===side?'active':'routed'}]));
  assert(war.campaign.resolveEncounter(rally.id,side,'success','rally-secured',rally.rally.guards,{escaped:0,alliesLost:0,routed:0,allyDamage:0,commanders}).ok);
  assert.equal(war.clock().elapsedSeconds,battle.endsAt,'Completing the field consumes only its remaining scheduled time');
  const resolved=war.snapshot().engagements.find(b=>b.id===battle.id);
  assert.equal(resolved.status,'resolved');assert.equal(resolved.resolvedAt,battle.endsAt);
  return resolved;
}

test('full adventure starts at dawn at Caricas and its completion advances the staggered Ovesos front',()=>{
  const war=createAdventureWar();assert.equal(war.clock().hour,6);assert.equal(war.clock().elapsedSeconds,0);
  assert.equal(war.clock().fullCampaign,true);assert.equal(war.checkpoint().fullCampaign,true);assert.equal(war.checkpoint().sharedOpening,2);
  assert.equal(war.snapshot().engagements.filter(b=>b.status==='active').length,1);
  assert.equal(war.forecast().dueAt,120);assert.equal(war.forecast().regionName,'Ovesos');war.begin();tick(war,17.25);
  const first=war.snapshot().engagements[0];win(war,first,'west',true);
  assert.equal(war.clock().complete,false);assert.equal(war.snapshot().winner,null);assert.equal(war.clock().elapsedSeconds,180);
  assert.equal(war.snapshot().engagements.find(b=>b.region==='ovesos').endsAt,300);
  assert(war.forecast().dueAt>180&&war.forecast().dueAt<=300,'Retreats and the other front remain live');
  assert(war.snapshot().engagements.some(b=>b.region==='ovesos'&&b.status==='active'));
  war.begin();tick(war,120);
  assert(war.snapshot().engagements.slice(0,2).every(b=>b.status==='resolved'));
  near(war.clock().elapsedSeconds,300);assert.equal(war.clock().complete,false);assert(war.forecast().dueAt>300);
});

test('both factions can finish several battles and win the entire elapsed-time campaign',()=>{
  for(const side of ['west','east']){
    let war=createAdventureWar(),fought=0;
    for(let steps=0;steps<150&&!war.snapshot().winner;steps++){
      const battle=war.snapshot().engagements.find(b=>b.status==='active');
      if(battle){
        war.begin();tick(war,.25);win(war,battle,side,fought===0);fought++;
        const before=war.snapshot(),seconds=war.clock().elapsedSeconds;
        war=createAdventureWar(war.checkpoint());assert.deepEqual(war.snapshot(),before);assert.equal(war.clock().elapsedSeconds,seconds);
      }else waitNext(war);
    }
    const state=war.snapshot();assert.equal(state.winner,side);assert(fought>=2,`${side} must play beyond the opening battle`);
    assert.equal(war.clock().complete,true);assert.equal(war.clock().running,false);
    const ended=war.checkpoint();assert.equal(war.forecast().ok,false);assert.equal(war.toggle(),false);war.begin();tick(war,90);war.advance(10);war.campaign.step(10);assert.deepEqual(war.checkpoint(),ended);
    assert(state.events.every((event,i)=>Number.isFinite(event.elapsedSeconds)&&event.elapsedSeconds>=event.day*60&&(!i||event.elapsedSeconds>=state.events[i-1].elapsedSeconds)));
  }
});

test('unattended waiting reaches the natural winner, with no hero enrollment or extra orders from reading forecasts',()=>{
  const waited=createAdventureWar(),ordinary=createAdventureWar();let waits=0;
  while(!waited.snapshot().winner&&waits++<150){
    const before=waited.checkpoint(),state=waited.snapshot(),clock=waited.clock();
    assert.deepEqual(waited.forecast(),adventureWaitForecast(state,clock));
    for(let i=0;i<10;i++)waited.forecast();assert.deepEqual(waited.checkpoint(),before);
    const forecast=waited.forecast();assert(forecast.dueAt>clock.elapsedSeconds);
    assert.equal(waited.advanceToNextEvent('obsolete').ok,false);assert.deepEqual(waited.checkpoint(),before);
    const result=waitNext(waited);assert(result.ok);assert(result.seconds>0);assert.equal(waited.snapshot().pending,null);
  }
  ordinary.advance(150);assert(waited.snapshot().winner);assert.equal(waited.snapshot().winner,ordinary.snapshot().winner);
  assert.deepEqual(waited.snapshot(),ordinary.snapshot());assert.equal(waited.snapshot().hero.region,'isareos');
  assert(waits>2);assert.equal(createAdventureWar(waited.checkpoint()).clock().complete,true);
});

test('the full forecast follows every front and offers a command review during regrouping',()=>{
  const base=createAdventureWar().snapshot(),clock={elapsedSeconds:61,complete:false};
  for(const region of OPENING_WORLD_WAR_SCENARIO.regions){
    const state={...base,day:1,armies:[],engagements:[{id:'active',status:'active',region:region.id,endsOn:4}]};
    const f=adventureWaitForecast(state,clock);assert.equal(f.kind,'battle-aftermath');assert.equal(f.region,region.id);assert.equal(f.regionName,region.name);assert.equal(f.dueAt,240);assert(f.title.includes(region.name));
  }
  const regrouping={...base,day:6,engagements:[],armies:[{id:1,status:'recovering',readyOn:9,region:'nesdor'}]};
  const recovery=adventureWaitForecast(regrouping,{elapsedSeconds:370,complete:false});
  assert.equal(recovery.kind,'campaign-orders');assert.equal(recovery.dueAt,420);assert.equal(recovery.remainingSeconds,50);
  assert.match(recovery.consequences.join(' '),/recovering armies may need more time/i);
  const competing={...base,day:6,engagements:[{id:'battle',status:'active',region:'caricas',endsOn:10}],armies:[{id:1,status:'marching',to:'nethereum',arrives:8},{id:2,status:'retreating',to:'nesdor',arrives:7}]};
  assert.equal(adventureWaitForecast(competing,{elapsedSeconds:370}).region,'nesdor');
  assert.equal(adventureWaitForecast({...competing,pending:{id:'encounter'}},{elapsedSeconds:370}).ok,false);
});

test('an earlier campaign can wait through actual recovery and return to marching without inventing orders',()=>{
  const initial={...createOpeningWar().checkpoint(),fullCampaign:true};initial.simulation.seed=1;
  const war=createAdventureWar(initial);let forecast;
  for(let attempts=0;attempts<50;attempts++){
    forecast=war.forecast();if(forecast.kind==='campaign-orders')break;
    waitNext(war);
  }
  assert.equal(forecast.kind,'campaign-orders');assert.equal(war.snapshot().day,12);
  assert(war.snapshot().armies.some(army=>army.status==='recovering'));
  const before=war.checkpoint();assert.equal(war.advanceToAftermath(forecast.key).ok,false);assert.deepEqual(war.checkpoint(),before);
  const result=war.advanceToNextEvent(forecast.key);assert.equal(result.ok,true);assert.equal(result.to.elapsedSeconds,780);
  assert.equal(war.clock().transition.reason,'wait-for-orders');assert.equal(war.snapshot().day,13);
  assert(war.snapshot().armies.some(army=>army.status==='marching'));
  assert.deepEqual(createAdventureWar(war.checkpoint()).snapshot(),war.snapshot());
});

test('withdrawal holds time but decisive defeat reaches the battle deadline and the war continues',()=>{
  const war=createAdventureWar();war.begin();tick(war,9.75);
  const battle=war.snapshot().engagements[0];war.syncRegion('Caricas');assert(war.campaign.joinBattle(battle.id,battle.location).ok);
  const held=war.clock().elapsedSeconds;
  assert(war.campaign.resolveEncounter(battle.id,'west','withdraw','withdrew',1,{escaped:0}).ok);
  assert.equal(war.clock().elapsedSeconds,held);assert.equal(war.snapshot().engagements[0].status,'active');
  assert(war.campaign.joinBattle(battle.id,battle.location).ok);
  let pending=war.snapshot().pending;
  assert(war.campaign.resolveEncounter(pending.id,'west','success','vanguard-broken',pending.participation.guards,{escaped:0}).ok);
  assert(war.campaign.joinBattle(battle.id,battle.location).ok);pending=war.snapshot().pending;
  assert(war.campaign.chooseAssault(pending.id,'allied').ok);pending=war.snapshot().pending;
  const commanders=Object.fromEntries(Object.entries(pending.commanders).filter(([,c])=>c.status==='active').map(([side,c])=>[side,{id:c.id,hp:c.hp,outcome:'active'}]));
  assert(war.campaign.resolveEncounter(pending.id,'west','defeat','driven-back',0,{escaped:0,alliesLost:0,routed:0,allyDamage:0,commanders}).ok);
  assert.equal(war.snapshot().engagements[0].resolvedAt,180);assert.equal(war.clock().elapsedSeconds,180);assert.equal(war.clock().complete,false);
  assert(war.forecast().ok);war.begin();tick(war,1);near(war.clock().elapsedSeconds,181);
});

test('pauses and checkpoint restoration keep the exact clock, solar phase, and event timestamps after the first battle',()=>{
  const war=createAdventureWar();win(war,war.snapshot().engagements[0],'east');
  war.begin();tick(war,63.375);const saved=war.checkpoint();
  war.tick(1,false);assert.deepEqual(war.checkpoint(),saved);war.pause();tick(war,20);assert.deepEqual(war.checkpoint(),saved);
  const restored=createAdventureWar(saved);assert.deepEqual(restored.snapshot(),war.snapshot());near(restored.clock().elapsedSeconds,243.375);
  near(restored.clock().hour,10.05625);assert.equal(restored.clock().running,false);
  assert.throws(()=>createOpeningWar(saved));assert.throws(()=>createAdventureWar({...saved,fullCampaign:false}));
  const missing={...saved};delete missing.fullCampaign;assert.throws(()=>createAdventureWar(missing));
  assert.throws(()=>createAdventureWar({...saved,openingEventTimes:saved.openingEventTimes.map(()=>0)}));
  assert.throws(()=>createAdventureWar({...saved,openingEventTimes:[]}));
  assert.throws(()=>restored.setSpeed(4));assert.throws(()=>restored.tick(2,true));
});

test('persistent full campaign saves validate their flavor and timestamps without damaging a previous save',()=>{
  const exploration={version:1,character:'teresod',position:{x:-2414,y:21.3,z:49},heading:0,camera:{yaw:0,pitch:.3,distance:8},elapsed:12,cells:['0,0']};
  const save=war=>({version:1,format:WORLD_WAR_KEY,exploration,...war.checkpoint()});
  const war=createAdventureWar();win(war,war.snapshot().engagements[0],'west');war.begin();tick(war,13.375);
  const valid=save(war);assert(validateWorldWarSave(valid));
  let stored=null;const store=worldWarStore({getItem:()=>stored,setItem:(key,value)=>{assert.equal(key,WORLD_WAR_KEY);stored=value;}});
  assert(store.save(valid).ok);assert.deepEqual(store.read().data,valid);
  assert.deepEqual(createAdventureWar(store.read().data).snapshot(),war.snapshot());
  const legacy=save(createWorldWar());assert(validateWorldWarSave(legacy));assert(validateWorldWarSave(save(createOpeningWar())));
  for(const invalid of [
    {...valid,fullCampaign:false},{...valid,fullCampaign:null},{...valid,sharedOpening:1},{...valid,sharedOpening:undefined},
    {...valid,speed:4},{...valid,openingEventTimes:[]},{...valid,openingEventTimes:valid.openingEventTimes.map(()=>100000)},
    {...legacy,fullCampaign:true},
    {...valid,tower:{version:1,location:'lookout',briefed:true,running:false}},
  ]){
    assert.equal(validateWorldWarSave(invalid),false);assert.equal(store.save(invalid).ok,false);assert.deepEqual(store.read().data,valid);
  }
  war.advance(150);assert(war.snapshot().winner);
  const completed={...save(war),tower:{version:1,location:'lookout',briefed:true,concluded:true,running:false}};
  assert(validateWorldWarSave(completed));assert(store.save(completed).ok);assert.equal(createAdventureWar(store.read().data).clock().complete,true);
});
