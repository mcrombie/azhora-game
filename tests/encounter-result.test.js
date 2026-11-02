import test from 'node:test';
import assert from 'node:assert/strict';
import {applyEncounterResult} from '../src/app/lizeem/encounter-result.js';
import {createAdventureWar} from '../src/experiments/day-night/opening-war.js';
import {OPENING_WORLD_WAR_SCENARIO as scenario} from '../src/app/exploration/world-war.js';
import {nextCampaignOpportunity} from '../src/app/exploration/campaign-opportunity.js';
import {worldWarArmies} from '../src/app/exploration/war-armies.js';

function opening(){
  const war=createAdventureWar();war.advance(3);war.begin();
  for(let i=0;i<37;i++)war.tick(.5,true);
  war.pause();war.syncRegion('Caricas');
  const battle=war.snapshot().engagements.find(b=>b.status==='active');
  assert(war.campaign.joinBattle(battle.id,battle.location).ok);
  return {war,battle};
}
const read=(war,side)=>nextCampaignOpportunity(war.snapshot(),scenario,worldWarArmies(war.snapshot(),scenario),()=>true,{side});
const latestResult=war=>war.snapshot().commands.findLast(c=>c.type==='hero-result');

test('result preview and commit agree on allied losses, routed troops, commanders and the next directive',()=>{
  for(const side of ['west','east']){
    const {war,battle}=opening();let pending=war.snapshot().pending;
    assert(applyEncounterResult(war.campaign,{pending,side,started:true,outcome:'success',reason:'vanguard-broken',field:{interception:true,guards:[{hp:0},{hp:0},{hp:0}]}}).ok);
    assert(war.campaign.joinBattle(battle.id,battle.location).ok);pending=war.snapshot().pending;
    assert(war.campaign.chooseAssault(pending.id,'allied').ok);pending=war.snapshot().pending;
    const enemies=Array.from({length:pending.rally.guards},(_,i)=>i===0?{hp:10,routed:true}:{hp:0});
    const captains=Object.entries(pending.commanders??{}).filter(([,c])=>c.status==='active').map(([f,c])=>({commanderId:c.id,faction:f,hp:f===side?150:1,routed:f!==side}));
    const field={guards:[...enemies,...captains.filter(c=>c.faction!==side)],allies:captains.filter(c=>c.faction===side),squad:{alliesLost:1,routed:1,damageByAllies:95}};
    const context={pending,field,side,started:true,outcome:'success',reason:'rally-secured'};
    const original=war.checkpoint(),originalField=structuredClone(context),preview=createAdventureWar(original);
    assert(applyEncounterResult(preview.campaign,context).ok);
    assert.deepEqual(war.checkpoint(),original,'Preview cannot record a result, move another army, or change the live clock');
    assert.deepEqual(context,originalField,'Result inspection does not alter the completed encounter');
    const forecast=read(preview,side);assert.notEqual(forecast.target?.id,battle.id);
    assert(applyEncounterResult(war.campaign,context).ok);
    assert.deepEqual(war.checkpoint(),preview.checkpoint(),'The accepted result must equal the preview exactly');
    assert.deepEqual(read(war,side),forecast,'The successor shown in the modal is the successor after Continue');
    const result=latestResult(war);assert.equal(result.stopped,pending.rally.guards,'A routed captain is not another soldier casualty');
    assert.equal(result.progress.alliesLost,1);assert.equal(result.progress.routed,1);assert.equal(result.progress.allyDamage,95);
    const enemy=side==='west'?'east':'west';assert.equal(result.progress.commanders[enemy]?.outcome,'routed');
    assert.equal(war.clock().elapsedSeconds,198.5,'Combat does not round or advance the adventure clock');
    assert.deepEqual(createAdventureWar(war.checkpoint()).snapshot(),war.snapshot(),'Accounting replays from its saved commands');
    const committed=war.checkpoint();assert.equal(applyEncounterResult(war.campaign,context).ok,false);
    assert.deepEqual(war.checkpoint(),committed,'A second Continue cannot credit this result twice');
  }
});

test('declining the invitation preserves a faction-free battle; partial fighting records only real progress',()=>{
  const {war,battle}=opening();let pending=war.snapshot().pending;
  assert(applyEncounterResult(war.campaign,{pending,side:'west',started:false}).ok);
  assert.equal(latestResult(war).faction,null);assert.equal(latestResult(war).reason,'declined');
  assert.equal(war.snapshot().engagements.find(b=>b.id===battle.id).participation.faction,null);
  assert(war.campaign.joinBattle(battle.id,battle.location).ok);pending=war.snapshot().pending;
  assert(applyEncounterResult(war.campaign,{pending,side:'west',started:true,field:{interception:true,guards:[{hp:0},{hp:50,escaped:true},{hp:50}]}}).ok);
  const result=latestResult(war);assert.equal(result.faction,'west');assert.equal(result.outcome,'withdraw');
  assert.equal(result.stopped,1);assert.equal(result.progress.escaped,1);
  const progress=war.snapshot().engagements.find(b=>b.id===battle.id).participation.intercept;
  assert.equal(progress.stopped,1);assert.equal(progress.escaped,1);
});

test('an accepted duel yields no soldier kills and retains its commitment when leaving before a scene starts',()=>{
  for(const won of [false,true]){
    const {war,battle}=opening();assert(war.campaign.chooseDuel(war.snapshot().pending.id,'east').ok);
    const pending=war.snapshot().pending,context=won
      ?{pending,side:'east',started:true,outcome:'success',reason:'champion-yielded',field:{guards:[{hp:1,routed:true,commanderId:'meret-voss'}]}}
      :{pending,side:null,started:false};
    const before=war.checkpoint(),preview=createAdventureWar(before);assert(applyEncounterResult(preview.campaign,context).ok);
    assert.deepEqual(war.checkpoint(),before);assert(applyEncounterResult(war.campaign,context).ok);assert.deepEqual(war.checkpoint(),preview.checkpoint());
    const result=latestResult(war);assert.equal(result.faction,'east');assert.equal(result.stopped,0);
    const done=war.snapshot().engagements.find(b=>b.id===battle.id);assert.equal(done.rally.faction,'east');assert.equal(done.duel.moraleGuards,won?2:0);
  }
});
