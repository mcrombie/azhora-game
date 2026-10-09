import {deathReport} from '../src/app/exploration/afterlife-state.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaign,replayCampaign} from '../src/simulation/campaign.js';
import {createWorldWar,WORLD_WAR_SCENARIO as CURRENT_WORLD_WAR_SCENARIO,RALLY_WORLD_WAR_SCENARIO as WORLD_WAR_SCENARIO,INTERCEPTION_WORLD_WAR_SCENARIO,BATTLEFIELD_ENTRY_RADIUS} from '../src/app/exploration/world-war.js';
import {availableBattleStage,rallyGuardCount} from '../src/simulation/battle-stages.js';
import {worldWarReports} from '../src/app/exploration/war-reports.js';
import {createLizeemEncounter} from '../src/gameplay/combat/lizeem-encounter.js';
import {encounterAutoplayInput} from '../src/gameplay/autoplay/encounter-input.js';

const total=s=>Object.values(s.regions).reduce((n,r)=>n+r.garrison,0)+s.armies.reduce((n,a)=>n+a.strength,0);
function setup(side='west',stopped=3,seed=1731){
  const c=createCampaign(WORLD_WAR_SCENARIO,seed);c.step(5);c.locateHero('ovesos');
  const b=c.snapshot().engagements.find(b=>b.region==='ovesos');
  assert(c.joinBattle(b.id,b.location).ok);
  assert(c.resolveEncounter(b.id,side,stopped===3?'success':'defeat',stopped===3?'vanguard-broken':'runner-arrived',stopped).ok);
  return {c,b};
}

test('interception earns an immediate second opportunity with fewer rally guards, kept through save/replay',()=>{
  for(const count of [0,1,2,3]){
    const {c,b}=setup('west',count),s=c.snapshot(),now=s.engagements.find(e=>e.id===b.id);
    assert.equal(availableBattleStage(now),'rally');assert.equal(s.hero.readyOn,s.day);
    assert.equal(rallyGuardCount(now),[5,5,4,3][count]);
    assert.deepEqual(replayCampaign(WORLD_WAR_SCENARIO,s).snapshot(),s);
    assert(c.joinBattle(b.id,b.location).ok);const pending=c.snapshot().pending;
    assert.equal(pending.id,b.id+':rally');assert.equal(pending.rally.faction,'west');
    assert.deepEqual(replayCampaign(WORLD_WAR_SCENARIO,c.snapshot()).snapshot(),c.snapshot());
    assert(!c.resolveEncounter(b.id,'west','success','vanguard-broken',3).ok);
  }
});

test('both sides can win decisively; troops, retreats, replay and single-use results remain consistent',()=>{
  for(const side of ['east','west'])for(const seed of [0,2,12,1731]){
    const {c,b}=setup(side,3,seed);assert(c.joinBattle(b.id,b.location).ok);
    const before=c.snapshot(),p=before.pending;
    for(const args of [[b.id,side,'success','rally-secured',3],[p.id,side==='west'?'east':'west','success','rally-secured',3],[p.id,side,'success','rally-secured',2],[p.id,side,'success','invented',3]]){
      assert(!c.resolveEncounter(...args).ok);assert.deepEqual(c.snapshot(),before);
    }
    assert(c.resolveEncounter(p.id,side,'success','rally-secured',3).ok);
    const after=c.snapshot(),battle=after.engagements.find(e=>e.id===b.id),result=after.events.find(e=>e.id===battle.resultId);
    assert.equal(battle.status,'resolved');assert.equal(after.day,5);assert.equal(after.regions.ovesos.owner,side);
    assert.equal(result.resolution,'rally-rout');assert.equal(result.hero.objective.blocked,12);
    const losses=after.events.slice(before.events.length).reduce((n,e)=>n+(e.type==='rally-result'?e.removed:e.type==='battle'?e.attackLoss+e.defenseLoss:e.type==='surrender'?e.strength:0),0);
    assert.equal(total(before)-total(after),losses);
    assert(after.armies.every(a=>a.strength>=0));
    assert(!c.joinBattle(b.id,b.location).ok);assert(!c.resolveEncounter(p.id,side,'success','rally-secured',3).ok);
    assert.deepEqual(replayCampaign(WORLD_WAR_SCENARIO,after).snapshot(),after);
    assert.match(worldWarReports(after,WORLD_WAR_SCENARIO,()=>true).find(r=>r.battleId===b.id).detail,/forced their retreat/);
    c.step(60);assert.deepEqual(replayCampaign(WORLD_WAR_SCENARIO,c.snapshot()).snapshot(),c.snapshot());
  }
});

test('leaving or losing preserves both contributions, closes the assault and leaves normal resolution to the deadline',()=>{
  for(const outcome of ['withdraw','defeat'])for(const stopped of [0,1,3]){
    const {c,b}=setup();assert(c.joinBattle(b.id,b.location).ok);const p=c.snapshot().pending;
    assert(c.resolveEncounter(p.id,outcome==='withdraw'&&!stopped?null:'west',outcome,outcome==='withdraw'?'withdrew':'driven-back',stopped).ok);
    let s=c.snapshot();assert.equal(s.regions.ovesos.owner,'west');assert.equal(s.engagements[0].status,'active');
    assert.equal(s.engagements[0].heroResult.objective.blocked,12);assert.equal(s.engagements[0].rally.removed,stopped);
    assert(!c.joinBattle(b.id,b.location).ok);
    s=c.step(3);const e=s.events.find(e=>e.engagementId===b.id);
    assert.equal(e.day,8);assert.equal(e.resolution,undefined);assert.equal(e.chance,e.baseChance);
    assert.deepEqual(replayCampaign(WORLD_WAR_SCENARIO,s).snapshot(),s);
  }
});

test('unused second opportunity expires; old v4 saves retain their one-stage battle',()=>{
  const {c,b}=setup();c.step(3);assert(!c.joinBattle(b.id,b.location).ok);
  const old=createCampaign(INTERCEPTION_WORLD_WAR_SCENARIO);old.step(5);old.locateHero('ovesos');
  const battle=old.snapshot().engagements.find(e=>e.region==='ovesos');assert(!battle.rally);
  old.joinBattle(battle.id,battle.location);old.resolveEncounter(battle.id,'west','success','vanguard-broken',3);
  assert(!old.joinBattle(battle.id,battle.location).ok);old.step(3);
  const restored=createWorldWar({simulation:old.snapshot(),fraction:0,speed:1});
  assert.deepEqual(restored.snapshot(),old.snapshot());assert.equal(restored.snapshot().regions.ovesos.owner,'east');
});

test('rally combat finishes after breaking the guard; normal autoplay can win all difficulties',()=>{
  for(const count of [3,4,5]){
    const model=createLizeemEncounter({heroStart:{x:0,z:5},guardStarts:Array.from({length:count},(_,i)=>({x:Math.sin(i*2*Math.PI/count)*6,z:Math.cos(i*2*Math.PI/count)*6-4})),rallyPoint:{x:0,z:0}});
    let s=model.snapshot(),emptyGuardSeen=false;
    for(let i=0;i<5400&&!s.outcome;i++){
      const input=encounterAutoplayInput(s);s=model.tick(1/60,input);
      if(s.guards.every(g=>!g.hp)&&!s.outcome)emptyGuardSeen=true;
    }
    assert(emptyGuardSeen);assert.equal(s.outcome,'success',JSON.stringify({count,hp:s.hero.hp,time:s.time}));
    assert.equal(s.objective.reason,'rally-secured');assert.equal(s.objective.secured,s.objective.required);
    assert(s.skill.counterTypes.thrust>0&&s.skill.counterTypes.sweep>0);
  }
});

function battlefield(side='west'){
  const c=createCampaign(CURRENT_WORLD_WAR_SCENARIO);c.step(3);c.locateHero('caricas');
  const b=c.snapshot().engagements.find(b=>b.region==='caricas');
  assert(b);assert(c.joinBattle(b.id,b.location).ok);return {c,b,side};
}
const replayV6=c=>assert.deepEqual(replayCampaign(CURRENT_WORLD_WAR_SCENARIO,c.snapshot()).snapshot(),c.snapshot());

test('v6 opens nearer Minora in Caricas on day three and permits entry across a 70m battlefield',()=>{
  const c=createCampaign(CURRENT_WORLD_WAR_SCENARIO);c.step(2);assert.equal(c.snapshot().engagements.length,0);
  c.step();c.locateHero('caricas');const b=c.snapshot().engagements[0];
  assert.equal(b.region,'caricas');assert.equal(b.started,3);assert.equal(b.endsOn,6);assert.equal(b.entryRadius,BATTLEFIELD_ENTRY_RADIUS);
  assert(!c.joinBattle(b.id,{x:b.location.x+70.01,z:b.location.z}).ok);
  assert(c.joinBattle(b.id,{x:b.location.x+69,z:b.location.z}).ok);replayV6(c);
  const old=createCampaign(WORLD_WAR_SCENARIO);assert.equal(old.step(3).engagements.length,0);
  assert.equal(old.step(2).engagements[0].region,'ovesos');
});

test('declining a v6 prompt leaves the phase, factions and readiness untouched, then permits another visit',()=>{
  const {c,b}=battlefield(),before=c.snapshot();
  assert(c.resolveEncounter(b.id,null,'withdraw','declined',0).ok);
  const after=c.snapshot();assert.equal(after.pending,null);assert.equal(after.day,before.day);
  assert.deepEqual(after.engagements,before.engagements);assert.deepEqual(after.hero,before.hero);
  assert(!after.events.some(e=>e.type==='hero-result'));
  assert(c.joinBattle(b.id,b.location).ok);replayV6(c);
  assert(c.resolveEncounter(b.id,'west','withdraw','withdrew',0,{escaped:0}).ok);
  assert.equal(c.snapshot().engagements[0].participation.faction,'west');
  assert.equal(c.snapshot().hero.readyOn,c.snapshot().day);
  assert(c.joinBattle(b.id,b.location).ok);const committed=c.snapshot();
  assert(!c.resolveEncounter(b.id,'east','withdraw','withdrew',0).ok);assert.deepEqual(c.snapshot(),committed);
  assert(c.resolveEncounter(b.id,null,'withdraw','declined',0).ok);replayV6(c);
});

test('withdrawal and re-entry preserve casualties and escaped soldiers without duplicating either phase rewards',()=>{
  for(const side of ['west','east']){
    const {c,b}=battlefield(side),before=total(c.snapshot());
    assert(c.resolveEncounter(b.id,side,'withdraw','withdrew',1,{escaped:1}).ok);
    assert.equal(before-total(c.snapshot()),4);assert.equal(c.snapshot().day,3);
    assert.equal(availableBattleStage(c.snapshot().engagements[0]),'intercept');replayV6(c);
    assert(c.joinBattle(b.id,b.location).ok);let pending=c.snapshot().pending;
    assert.equal(pending.participation.guards,1);assert.equal(pending.participation.stopped,1);assert.equal(pending.participation.escaped,1);
    const valid=c.snapshot();
    for(const args of [[b.id,side,'success','vanguard-broken',2],[b.id,side,'withdraw','withdrew',1,{escaped:1}],[b.id,side,'withdraw','withdrew',0,{escaped:-1}]]){
      assert(!c.resolveEncounter(...args).ok);assert.deepEqual(c.snapshot(),valid);
    }
    assert(c.resolveEncounter(b.id,side,'withdraw','withdrew',0,{escaped:0}).ok);assert.equal(total(c.snapshot()),before-4);
    assert(c.joinBattle(b.id,b.location).ok);assert(c.resolveEncounter(b.id,side,'success','vanguard-broken',1,{escaped:0}).ok);
    let s=c.snapshot();assert.equal(s.day,4);assert.equal(s.engagements[0].heroResult.objective.blocked,8);
    assert.equal(s.engagements[0].heroResult.objective.escaped,1);assert.equal(availableBattleStage(s.engagements[0]),'rally');
    assert(c.joinBattle(b.id,b.location).ok);pending=c.snapshot().pending;assert.equal(pending.rally.guards,4);
    const beforeRally=total(c.snapshot());assert(c.resolveEncounter(pending.id,side,'withdraw','withdrew',2).ok);
    assert.equal(total(c.snapshot()),beforeRally-2);assert.equal(c.snapshot().day,4);replayV6(c);
    assert(c.joinBattle(b.id,b.location).ok);pending=c.snapshot().pending;assert.equal(pending.rally.guards,2);
    assert.equal(pending.rally.stopped,2);assert(c.resolveEncounter(pending.id,side,'withdraw','withdrew',1).ok);
    assert.match(worldWarReports(c.snapshot(),CURRENT_WORLD_WAR_SCENARIO,()=>true).find(r=>r.battleId===b.id).detail,/assault removed 3 more/);
    assert(c.joinBattle(b.id,b.location).ok);assert.equal(c.snapshot().pending.rally.guards,1);
    assert(c.resolveEncounter(pending.id,null,'withdraw','declined',0).ok);
    assert(c.joinBattle(b.id,b.location).ok);assert(c.resolveEncounter(pending.id,side,'success','rally-secured',1).ok);
    s=c.snapshot();const resolved=s.engagements.find(e=>e.id===b.id);
    assert.equal(s.day,6);assert.equal(resolved.status,'resolved');assert.equal(s.regions.caricas.owner,side);
    assert.equal(resolved.rally.stopped,4);assert.equal(resolved.rally.removed,4);assert.equal(resolved.heroResult.objective.blocked,8);
    assert.match(deathReport(s,b.id,CURRENT_WORLD_WAR_SCENARIO),/interception removed 8 enemy strength; your rally assault removed 4 more/);
    assert.match(worldWarReports(s,CURRENT_WORLD_WAR_SCENARIO,()=>true).find(r=>r.battleId===b.id).detail,/rally assault removed 4 more/);
    assert.equal(s.events.filter(e=>e.type==='reinforcements-intercepted'&&e.battleId===b.id).reduce((n,e)=>n+e.strength,0),8);
    assert(!c.joinBattle(b.id,b.location).ok);replayV6(c);
    c.step(30);replayV6(c);
  }
});

test('completed failed phases advance to the battle outcome, while a mid-phase retreat never does',()=>{
  const {c,b}=battlefield();
  assert(c.resolveEncounter(b.id,'west','defeat','runner-arrived',1,{escaped:2}).ok);
  assert.equal(c.snapshot().day,4);assert(c.joinBattle(b.id,b.location).ok);
  let p=c.snapshot().pending;assert.equal(p.rally.guards,5);
  assert(c.resolveEncounter(p.id,'west','withdraw','withdrew',1).ok);
  assert.equal(c.snapshot().day,4);assert.equal(c.snapshot().engagements[0].status,'active');
  assert(c.joinBattle(b.id,b.location).ok);p=c.snapshot().pending;
  assert(c.resolveEncounter(p.id,'west','defeat','time-expired',0).ok);
  const s=c.snapshot(),result=s.events.find(e=>e.engagementId===b.id);
  assert.equal(s.day,6);assert.equal(s.engagements[0].status,'resolved');assert.equal(result.resolution,undefined);replayV6(c);
});

test('clearing guards then leaving preserves the remaining objective, and a delayed return cannot resurrect the battle',()=>{
  const {c,b}=battlefield();
  assert(c.resolveEncounter(b.id,'west','withdraw','withdrew',3).ok);
  assert.equal(c.snapshot().day,3);assert(c.joinBattle(b.id,b.location).ok);
  let p=c.snapshot().pending;assert.equal(p.stage,'rally');assert.equal(p.rally.guards,3);
  assert(c.resolveEncounter(p.id,'west','withdraw','withdrew',3).ok);
  assert.equal(c.snapshot().day,3);assert(c.joinBattle(b.id,b.location).ok);p=c.snapshot().pending;
  assert.equal(p.rally.guards,0);assert(c.resolveEncounter(p.id,'west','success','rally-secured',0).ok);
  assert.equal(c.snapshot().day,6);assert.equal(c.snapshot().regions.caricas.owner,'west');replayV6(c);
  const late=battlefield();late.c.resolveEncounter(late.b.id,null,'withdraw','declined',0);late.c.step(3);
  assert(!late.c.joinBattle(late.b.id,late.b.location).ok);replayV6(late.c);
});


test('v6 ordinary one-phase battle resumes remaining guards without requiring a reinforcement site',()=>{
  const scenario={...CURRENT_WORLD_WAR_SCENARIO,regions:CURRENT_WORLD_WAR_SCENARIO.regions.map(r=>{
    if(r.id!=='caricas')return r;
    const {interceptionStrength,rallyAssault,...ordinary}=r;return ordinary;
  })};
  const c=createCampaign(scenario);c.step(3);c.locateHero('caricas');const b=c.snapshot().engagements[0];
  assert(!b.reinforcements);assert(!b.rally);assert(c.joinBattle(b.id,b.location).ok);
  assert(c.resolveEncounter(b.id,'west','withdraw','withdrew',2).ok);assert.equal(c.snapshot().day,3);
  assert(c.joinBattle(b.id,b.location).ok);assert.equal(c.snapshot().pending.participation.guards,1);
  assert(c.resolveEncounter(b.id,'west','withdraw','withdrew',1).ok);assert.equal(c.snapshot().day,3);
  assert(c.joinBattle(b.id,b.location).ok);assert.equal(c.snapshot().pending.participation.guards,0);
  assert(c.resolveEncounter(b.id,'west','success',null,0).ok);assert.equal(c.snapshot().day,6);
  assert.equal(c.snapshot().engagements[0].status,'resolved');
  assert.deepEqual(replayCampaign(scenario,c.snapshot()).snapshot(),c.snapshot());
});
