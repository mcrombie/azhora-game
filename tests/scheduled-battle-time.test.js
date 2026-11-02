import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaign,replayCampaign} from '../src/simulation/campaign.js';
import {SIMULTANEOUS_WORLD_WAR_SCENARIO,WORLD_WAR_SCENARIO} from '../src/app/exploration/world-war.js';

function scenario(timing='scheduled'){
  const s=structuredClone(SIMULTANEOUS_WORLD_WAR_SCENARIO);
  s.id='scheduled-battle-time-test';s.rules.localBattleTiming=timing;
  s.rules.autonomousOrders=false;s.openingBattles[1].startsOn=2;
  return s;
}
function join(c,region,side='west'){
  const b=c.snapshot().engagements.find(b=>b.region===region&&b.status==='active');
  assert(b);assert(c.locateHero(region).ok);assert(c.joinBattle(b.id,b.location).ok);
  assert(c.chooseFieldBattle(c.snapshot().pending.id,side).ok);
  assert(c.chooseAssault(c.snapshot().pending.id,'allied').ok);
  return c.snapshot().pending;
}
function finish(c,p,side='west',outcome='success'){
  const commanders=Object.fromEntries(Object.entries(p.commanders??{}).filter(([,v])=>v.status==='active').map(([f,v])=>[f,{id:v.id,hp:f===side?v.hp:1,outcome:f===side?'active':'routed'}]));
  return c.resolveEncounter(p.id,side,outcome,outcome==='success'?'rally-secured':'driven-back',outcome==='success'?p.rally.guards:0,{escaped:0,alliesLost:0,routed:0,allyDamage:0,...(p.commanders?{commanders}:{})});
}

test('early and late field victories finish at the same deadline, with food and the other front advanced',()=>{
  for(const entryDay of [0,2])for(const side of ['west','east']){
    const s=scenario(),c=createCampaign(s);if(entryDay)c.step(entryDay);
    const p=join(c,'caricas',side),before=c.snapshot();
    assert(finish(c,p,side).ok);
    const after=c.snapshot(),battle=after.engagements.find(b=>b.id===p.battleId),other=after.engagements.find(b=>b.region==='ovesos');
    assert.equal(after.day,3);assert.equal(battle.resolvedOn,3);assert.equal(after.regions.caricas.owner,side);
    assert.equal(battle.rally.outcome,'success');assert.equal(after.pending,null);
    assert.equal(other.started,2);assert.equal(other.endsOn,5);assert.equal(other.status,'active');
    assert.equal(after.food.last.day,3);assert(after.food.last.consumed>0);
    assert.notEqual(after.regions.isareos.food.store,before.regions.isareos.food.store);
    const ledger=after.food.last;
    assert(Math.abs(ledger.opening+ledger.produced-ledger.consumed-ledger.lost-ledger.closing)<1e-6);
    assert.equal(after.events.filter(e=>e.type==='battle'&&e.engagementId===battle.id).length,1);
    assert.deepEqual(replayCampaign(s,after).snapshot(),after);
    assert.equal(finish(c,p,side).ok,false);assert.deepEqual(c.snapshot(),after,'a duplicate result changes neither time nor troops');
  }
});

test('finishing the later front also resolves unattended battles and preserves a tactical defeat',()=>{
  const s=scenario(),c=createCampaign(s);c.step(2);
  const p=join(c,'ovesos');assert(finish(c,p,'west','defeat').ok);
  const after=c.snapshot(),battle=after.engagements.find(b=>b.id===p.battleId),other=after.engagements.find(b=>b.region==='caricas');
  assert.equal(after.day,5);assert.equal(battle.resolvedOn,5);assert.equal(battle.rally.outcome,'defeat');
  assert.equal(other.status,'resolved');assert.equal(other.resolvedOn,3);
  assert.equal(after.events.find(e=>e.type==='battle'&&e.engagementId===other.id).day,3);
  assert(after.events.some(e=>['retreat','arrive','recovered'].includes(e.type)&&e.day>=3));
  assert.equal(after.food.last.day,5);assert.deepEqual(replayCampaign(s,after).snapshot(),after);
});

test('declining, withdrawal, and the optional champion phase do not charge the whole battle window',()=>{
  const c=createCampaign(scenario());
  c.locateHero('caricas');let b=c.snapshot().engagements[0];assert(c.joinBattle(b.id,b.location).ok);
  const before=c.snapshot().engagements;
  assert(c.resolveEncounter(c.snapshot().pending.id,null,'withdraw','declined',0).ok);
  assert.equal(c.snapshot().day,0);assert.deepEqual(c.snapshot().engagements,before);
  assert(c.joinBattle(b.id,b.location).ok);assert(c.chooseDuel(c.snapshot().pending.id,'west',true).ok);
  assert(c.resolveEncounter(c.snapshot().pending.id,'west','success','champion-yielded',0).ok);
  assert.equal(c.snapshot().day,0);assert.equal(c.snapshot().engagements[0].status,'active');
  assert(c.joinBattle(b.id,b.location).ok);assert(c.chooseAssault(c.snapshot().pending.id,'allied').ok);
  const p=c.snapshot().pending;
  const commanders=Object.fromEntries(Object.entries(p.commanders??{}).filter(([,v])=>v.status==='active').map(([f,v])=>[f,{id:v.id,hp:v.hp,outcome:'active'}]));
  assert(c.resolveEncounter(p.id,'west','withdraw','withdrew',0,{escaped:0,alliesLost:0,routed:0,allyDamage:0,commanders}).ok);
  assert.equal(c.snapshot().day,0);assert.equal(c.snapshot().engagements[0].status,'active');
});

test('roadside interception stays separate from scheduled field completion',()=>{
  const s=scenario();delete s.commanders;const c=createCampaign(s);
  const army=c.snapshot().armies.find(a=>a.status==='marching');assert(army);
  assert(c.locateHero(army.from).ok);
  assert(c.interceptArmy(army.id,'west',{region:army.from,position:{x:0,z:0},location:{x:0,z:0},fraction:.5}).ok);
  const p=c.snapshot().pending;
  assert(c.resolveEncounter(p.id,'west','success','rally-secured',p.rally.guards,{escaped:0,alliesLost:0,routed:0,allyDamage:0,commanders:{}}).ok);
  assert.equal(c.snapshot().day,0);assert.equal(c.snapshot().engagements[0].status,'active');
});

test('old elapsed campaigns opt in forward only, preserving prior immediate results and pending saves',()=>{
  const s=scenario('immediate'),c=createCampaign(s);
  let p=join(c,'caricas');assert(finish(c,p).ok);assert.equal(c.snapshot().day,0);
  const historical=c.snapshot().events.filter(e=>e.type==='battle');
  c.step(2);p=join(c,'ovesos');const pending=c.snapshot().pending,events=c.snapshot().events;
  assert(c.setBattleTiming('scheduled').ok);assert.equal(c.snapshot().localBattleTiming,'scheduled');
  assert.deepEqual(c.snapshot().pending,pending);assert.deepEqual(c.snapshot().events,events);
  const commands=c.snapshot().commands.length;assert(c.setBattleTiming('scheduled').ok);assert.equal(c.snapshot().commands.length,commands);
  assert.equal(c.setBattleTiming('immediate').ok,false);
  assert.deepEqual(replayCampaign(s,c.snapshot()).snapshot(),c.snapshot());
  assert(finish(c,p).ok);const after=c.snapshot();assert.equal(after.day,5);
  assert.deepEqual(after.events.filter(e=>e.type==='battle'&&e.day===0),historical);
  assert.deepEqual(replayCampaign(s,after).snapshot(),after);
  assert.equal(createCampaign(WORLD_WAR_SCENARIO).setBattleTiming('scheduled').ok,false);
  const invalid=structuredClone(after);invalid.commands.find(c=>c.type==='battle-timing').timing='immediate';
  assert.throws(()=>replayCampaign(s,invalid),/scheduled battle completion/);
});

test('eliminating the last invading army declares victory at its battle deadline, not an earlier tick',()=>{
  const regions=[
    {id:'a',owner:'west',garrison:30},
    {id:'b',owner:'east',garrison:5},
    {id:'c',owner:'west',garrison:30},
  ].map((r,i)=>({...r,name:r.id,position:{x:i*80,y:0},battlefield:{x:i*80,z:0},recruits:0,neighbors:['a','b','c'].filter(id=>id!==r.id),interceptionStrength:12,rallyAssault:true}));
  const s={id:'final-battle-deadline-test',defaultSeed:1731,hero:{name:'Teresod',region:'a'},heroTracking:'world',battlefieldEntryRadius:70,
    factions:[{id:'west',short:'West'},{id:'east',short:'East'}],wars:[['west','east']],regions,routes:[['a','b'],['b','c'],['a','c']].map(regions=>({regions,terrainMultiplier:1,crossingDays:0})),
    rules:{garrisonCap:100,reserve:0,marchDistancePerDay:80,decisionEvery:3,defenseBonus:1,recoveryDays:2,armyRecoveryDays:2,maxRaisedArmies:3,battleDays:3,localBattleTiming:'scheduled',autonomousOrders:false},
    openingBattles:[{faction:'west',from:'a',to:'b',strength:20},{faction:'east',from:'b',to:'c',strength:4,startsOn:2}]};
  const c=createCampaign(s);assert(finish(c,join(c,'b')).ok);assert.equal(c.snapshot().day,3);assert.equal(c.snapshot().winner,null);
  const p=join(c,'c');assert.equal(p.rally.guards,4);assert(finish(c,p).ok);
  const after=c.snapshot();assert.equal(after.day,5);assert.equal(after.winner,'west');
  assert.equal(after.engagements.find(b=>b.region==='c').resolvedOn,5);
  assert.equal(after.events.find(e=>e.type==='victory').day,5);
  assert.equal(after.events.filter(e=>e.type==='victory').length,1);
  assert.deepEqual(replayCampaign(s,after).snapshot(),after);
});
