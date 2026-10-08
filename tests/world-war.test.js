import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorldWar as createCurrentWorldWar,WORLD_WAR_SCENARIO as CURRENT_WORLD_WAR_SCENARIO,RALLY_WORLD_WAR_SCENARIO as WORLD_WAR_SCENARIO,LEGACY_WORLD_WAR_SCENARIO,worldWarProjection} from '../src/app/exploration/world-war.js';
import {createCampaign,replayCampaign} from '../src/simulation/campaign.js';
import {LIZEEM_SCENARIO} from '../src/content/scenarios/lizeem.js';
import {worldWarStore,WORLD_WAR_KEY,validateWorldWarSave} from '../src/app/exploration/war-checkpoint.js';
import {regionAt,TRANSFORM,hexAt} from '../src/world/terrain/region-world.js';
import {atlasMarkKnown} from '../src/ui/map/world-map-detail.js';
import {worldWarReports,selectWarReport} from '../src/app/exploration/war-reports.js';
import {interceptReinforcements} from '../src/simulation/reinforcements.js';
import {worldWarArmies} from '../src/app/exploration/war-armies.js';
import {trackedWarTarget,trackingBearing} from '../src/app/exploration/war-tracking.js';
// These tests retain the v5 one-shot campaign contract as a save/replay regression.
function createWorldWar(saved=null){
  if(saved)return createCurrentWorldWar(saved);
  const campaign=createCampaign(WORLD_WAR_SCENARIO);campaign.watchBattles(true);
  return createCurrentWorldWar({simulation:campaign.snapshot(),fraction:0,speed:1});
}
const exploration={version:1,character:'rollo',position:{x:-2414,y:2,z:63},heading:0,camera:{yaw:0,pitch:.3,distance:8},elapsed:12,cells:['0,0']};
const save=session=>({version:1,format:WORLD_WAR_KEY,exploration,...session.checkpoint()});

test('Ovesos interception conserves troops for both sides and resolves only at its own deadline',()=>{
  const total=s=>Object.values(s.regions).reduce((n,r)=>n+r.garrison,0)+s.armies.reduce((n,a)=>n+a.strength,0);
  for(const side of ['west','east'])for(const count of [0,1,2,3]){
    const w=createWorldWar();w.advance(6);w.syncRegion('Ovesos');const b=w.snapshot().engagements.find(b=>b.region==='ovesos');
    assert.equal(b.started,5);assert.equal(b.endsOn,8);assert.equal(b.reinforcements.east.strength,12);assert.equal(b.reinforcements.west.strength,12);
    assert(w.campaign.joinBattle(b.id,b.location).ok);const before=w.snapshot(),outcome=count===3?'success':'withdraw';
    assert(w.campaign.resolveEncounter(b.id,count?side:null,outcome,count===3?'vanguard-broken':'withdrew',count).ok);
    const after=w.snapshot();assert.equal(total(before)-total(after),count*4);assert.equal(after.regions.ovesos.owner,'west');
    assert(!w.campaign.resolveEncounter(b.id,side,'success','vanguard-broken',3).ok);
    assert(validateWorldWarSave(save(w)));assert.deepEqual(createWorldWar(w.checkpoint()).snapshot(),after);
    w.advance(2);const resolved=w.snapshot().engagements.find(e=>e.id===b.id);assert.equal(resolved.status,'resolved');
    assert.deepEqual(createWorldWar(w.checkpoint()).snapshot(),w.snapshot());
  }
});

test('legacy v3 Ovesos results replay with their original arena rules',()=>{
  const old=createCampaign(LEGACY_WORLD_WAR_SCENARIO);old.watchBattles(true);old.step(6);old.locateHero('ovesos');const battle=old.snapshot().engagements.find(b=>b.region==='ovesos');
  assert.equal(battle.reinforcements,undefined);assert(old.joinBattle(battle.id,battle.location).ok);assert(old.resolveEncounter(battle.id,'west','success').ok);old.step(2);
  const {scenario,seed,day,commands}=old.snapshot();const data={format:WORLD_WAR_KEY,version:1,exploration,simulation:{scenario,seed,day,commands},speed:4,fraction:2};
  assert(validateWorldWarSave(data));const restored=createWorldWar(data);assert.deepEqual(restored.snapshot(),old.snapshot());
  assert.equal(restored.checkpoint().simulation.scenario,'lizeem-world-v3');
  old.step(4);restored.advance(4);assert.deepEqual(restored.snapshot(),old.snapshot());
  assert.equal(createWorldWar().snapshot().scenario,'lizeem-world-v5');
});

test('tracking follows a discovered army into its battlefield and stops guidance after resolution',()=>{
  const w=createWorldWar();w.advance(4);
  const resolve=(target,known=()=>true,marks=null)=>trackedWarTarget(target,w.snapshot(),WORLD_WAR_SCENARIO,marks??worldWarArmies(w.snapshot(),WORLD_WAR_SCENARIO),known,(x,y)=>TRANSFORM.atlasToWorld(x,y));
  const target={kind:'army',id:2},before=w.snapshot(),march=resolve(target);
  assert.match(march.detail,/Expected day 9/);assert(march.location);assert.deepEqual(w.snapshot(),before);
  assert.equal(resolve(target,()=>false,[]).location,null);
  w.advance(5);const battle=resolve(target);
  assert.equal(battle.target.kind,'battle');assert.equal(battle.label,'Battle at Caricas');assert.match(battle.detail,/before day 12/);
  assert.deepEqual(battle.location,w.snapshot().engagements.find(b=>b.id===battle.target.id).location);
  assert.deepEqual(resolve(target,()=>true,[]).target,battle.target,'A discovered battlefield can replace an uncharted schematic army center');
  assert.equal(resolve(battle.target,()=>false).location,null);
  assert(!resolve(battle.target,()=>false).detail.includes('12'));
  w.advance(3);const ended=resolve(battle.target);
  assert.equal(ended.location,null);assert.match(ended.detail,/Battle ended/);
});

test('tracking ends local guidance after participating and never leaks an unknown army ETA',()=>{
  const w=createWorldWar();w.advance(10);w.syncRegion('Caricas');const b=w.snapshot().engagements.find(b=>b.region==='caricas');
  w.campaign.joinBattle(b.id,b.location);w.campaign.resolveEncounter(b.id,null,'withdraw','withdrew',0);
  const resolve=target=>trackedWarTarget(target,w.snapshot(),WORLD_WAR_SCENARIO,worldWarArmies(w.snapshot(),WORLD_WAR_SCENARIO),()=>true,(x,y)=>TRANSFORM.atlasToWorld(x,y));
  assert.equal(resolve({kind:'battle',id:b.id}).location,null);assert.match(resolve({kind:'battle',id:b.id}).detail,/Your part is finished/);
  const fresh=createWorldWar();fresh.advance(4);const s=fresh.snapshot(),point=worldWarArmies(s,WORLD_WAR_SCENARIO).find(a=>a.id===2);
  const marks=worldWarArmies(s,WORLD_WAR_SCENARIO,p=>Math.hypot(point.x-p.x,point.y-p.y)<1);
  const limited=trackedWarTarget({kind:'army',id:2},s,WORLD_WAR_SCENARIO,marks,()=>false,(x,y)=>TRANSFORM.atlasToWorld(x,y));
  assert(!limited.detail.includes('9'));assert(!limited.detail.includes('Caricas'));
});

test('tracking bearing follows camera yaw and uses horizontal world distance',()=>{
  const position={x:0,z:0};
  assert.deepEqual(trackingBearing(position,{x:0,y:200,z:-10},0),{distance:10,angle:0});
  assert.equal(trackingBearing(position,{x:10,z:0},0).angle,Math.PI/2);
  assert.equal(trackingBearing(position,{x:-10,z:0},Math.PI/2).angle,0);
  assert.equal(trackingBearing(position,null,0),null);
  assert.equal(trackingBearing(position,{x:3,z:4},0).distance,5);
});

test('army intelligence follows actual marches and hides unknown endpoints and routes',()=>{
  const w=createWorldWar();w.advance(4);const before=w.snapshot();
  const all=worldWarArmies(before,WORLD_WAR_SCENARIO),a=all.find(a=>a.id===2);
  assert.match(a.detail,/Caricas.*day 9 \(5 days away\)/);assert(a.route);assert.equal(a.strength,56);
  assert.equal(a.report.id,before.events.find(e=>e.type==='march'&&e.army.id===2).id);
  assert.deepEqual(worldWarArmies(before,WORLD_WAR_SCENARIO,()=>false),[]);
  const limited=worldWarArmies(before,WORLD_WAR_SCENARIO,p=>Math.hypot(p.x-a.x,p.y-a.y)<1).find(m=>m.id===2);
  assert.equal(limited.route,null);assert.match(limited.detail,/unknown destination.*Arrival unknown/);
  assert(!JSON.stringify(limited).includes('Caricas'));assert(!JSON.stringify(limited).includes('Nethereum'));
  const gap=worldWarArmies(before,WORLD_WAR_SCENARIO,p=>Math.abs(p.x-1250)>5).find(m=>m.id===2);
  assert.equal(gap.route,null);assert.match(gap.detail,/Caricas/);
  assert.deepEqual(w.snapshot(),before);
  w.advance();const next=worldWarArmies(w.snapshot(),WORLD_WAR_SCENARIO).find(m=>m.id===2);
  assert(next.x>a.x);assert.equal(next.report.id,a.report.id);assert.match(next.detail,/4 days away/);
});

test('army projection handles fighting, retreating, recovery and destruction without changing campaign',()=>{
  const w=createWorldWar();let retreat=false,engaged=false,recovery=false;
  for(let day=0;day<30;day++){
    const state=w.snapshot(),marks=worldWarArmies(state,WORLD_WAR_SCENARIO);
    assert(marks.every(a=>Number.isFinite(a.x)&&Number.isFinite(a.y)&&a.strength>0));
    assert.equal(marks.length,state.armies.filter(a=>a.strength>0&&a.status!=='destroyed').length);
    for(const a of marks){if(a.status==='retreating'){retreat=true;assert.match(a.detail,/Retreating/);assert(a.report);}if(a.status==='engaged'){engaged=true;assert.match(a.detail,/In battle/);assert.equal(a.report,null);}if(a.status==='recovering')recovery=true;}
    assert.deepEqual(w.snapshot(),state);w.advance();
  }
  assert(retreat&&engaged&&recovery);
});

test('partial losses round down for small detachments and span only their recorded sources',()=>{
  for(const stopped of [1,2,3]){
    const state={regions:{caricas:{garrison:10}},armies:[{id:'a',strength:10}]};
    const battle={attacker:'west',defender:'east',region:'caricas',reinforcements:{east:{strength:5,status:'approaching',contributions:[{armyId:null,strength:2},{armyId:'a',strength:3}]}}};
    const blocked=Math.floor(5*stopped/3),o=interceptReinforcements(state,battle,'west',stopped===3?'success':'defeat',stopped);
    assert.equal(o.blocked,blocked);assert.equal(state.regions.caricas.garrison,10-Math.min(2,blocked));
    assert.equal(state.armies[0].strength,10-Math.max(0,blocked-2));assert.equal(battle.reinforcements.east.remaining,5-blocked);
  }
});

test('partial interceptions and retreat remove only earned strength on either side and replay exactly',()=>{
  const total=s=>Object.values(s.regions).reduce((n,r)=>n+r.garrison,0)+s.armies.reduce((n,a)=>n+a.strength,0);
  for(const side of ['west','east'])for(const stopped of [0,1,2,3])for(const ending of ['defeat','withdraw']){
    const w=createWorldWar();w.advance(10);w.syncRegion('Caricas');const b=w.snapshot().engagements.find(e=>e.status==='active');w.campaign.joinBattle(b.id,b.location);
    const before=w.snapshot(),outcome=stopped===3?'success':ending,faction=outcome==='withdraw'&&!stopped?null:side,reason=outcome==='success'?'vanguard-broken':outcome==='withdraw'?'withdrew':'runner-arrived';
    for(const bad of [-1,4,1.5,'2']){assert(!w.campaign.resolveEncounter(b.id,faction,outcome,reason,bad).ok);assert.deepEqual(w.snapshot(),before);}
    assert(!w.campaign.resolveEncounter(b.id,faction,outcome,reason,outcome==='success'?2:3).ok);assert.deepEqual(w.snapshot(),before);
    assert(w.campaign.resolveEncounter(b.id,faction,outcome,reason,stopped).ok);
    const after=w.snapshot(),o=after.engagements.find(e=>e.id===b.id).heroResult.objective;
    assert.equal(o.blocked,stopped*4);assert.equal(o.stopped,stopped);assert.equal(total(before)-total(after),stopped*4);
    assert.equal(after.regions.caricas.owner,'east');assert(!w.campaign.resolveEncounter(b.id,faction,outcome,reason,stopped).ok);
    assert(validateWorldWarSave(save(w)));assert.deepEqual(createWorldWar(w.checkpoint()).snapshot(),after);
    if(stopped>0&&stopped<3){const report=worldWarReports(after,WORLD_WAR_SCENARIO,()=>true).at(-1);assert.match(report.title,/Reinforcements weakened/);assert.match(report.detail,new RegExp(`${12-stopped*4} reinforcement strength remains`));}
    w.advance(2);const final=w.snapshot(),result=final.events.find(e=>e.engagementId===b.id);
    assert.equal(result.chance,result.baseChance);if(stopped)assert.equal(result.hero.objective.blocked,stopped*4);
    assert.deepEqual(createWorldWar(w.checkpoint()).snapshot(),final);
  }
});

test('interception explanations are validated, saved and replayed without changing battle rules',()=>{
  for(const reason of ['runner-arrived','driven-back','time-expired','vanguard-broken']){
    const w=createWorldWar();w.advance(10);w.syncRegion('Caricas');
    const b=w.snapshot().engagements.find(e=>e.status==='active');w.campaign.joinBattle(b.id,b.location);
    const before=w.snapshot(),outcome=reason==='vanguard-broken'?'success':'defeat';
    assert(!w.campaign.resolveEncounter(b.id,'west',outcome,'invented').ok);assert.deepEqual(w.snapshot(),before);
    assert(!w.campaign.resolveEncounter(b.id,'west',outcome,outcome==='success'?'runner-arrived':'vanguard-broken').ok);assert.deepEqual(w.snapshot(),before);
    assert(w.campaign.resolveEncounter(b.id,'west',outcome,reason).ok);
    const restored=createWorldWar(w.checkpoint());assert.deepEqual(restored.snapshot(),w.snapshot());
    assert(validateWorldWarSave(save(w)));
    const report=worldWarReports(restored.snapshot(),WORLD_WAR_SCENARIO,()=>true).at(-1);
    assert.match(report.detail,/regional battle is still underway/);
    assert.match(report.detail,reason==='runner-arrived'?/surviving runners/:reason==='driven-back'?/health reached zero/:reason==='time-expired'?/90-second/:/stopped all three/);
  }
});

test('interception removes reserved existing troops exactly once, on either side, without a probability bonus',()=>{
  const total=s=>Object.values(s.regions).reduce((n,r)=>n+r.garrison,0)+s.armies.reduce((n,a)=>n+a.strength,0);
  for(const side of ['west','east'])for(const outcome of ['success','defeat','withdraw']){
    const w=createWorldWar();w.advance(10);w.syncRegion('Caricas');
    const b=w.snapshot().engagements.find(e=>e.status==='active'),enemy=side==='west'?'east':'west';
    assert.equal(b.reinforcements[enemy].strength,12);
    const before=w.snapshot();assert(w.campaign.joinBattle(b.id,b.location).ok);
    const pending=w.snapshot();assert(!w.campaign.resolveEncounter(b.id,'minora','success').ok);assert.deepEqual(w.snapshot(),pending);
    assert(w.campaign.resolveEncounter(b.id,outcome==='withdraw'?null:side,outcome).ok);
    const after=w.snapshot(),blocked=outcome==='success'?12:0;
    assert.equal(total(after),total(before)-blocked);
    assert.equal(after.regions.caricas.owner,'east');
    if(side==='west')assert.equal(after.regions.caricas.garrison,before.regions.caricas.garrison-blocked);
    else assert.equal(after.armies.find(a=>a.id===b.attackingIds[0]).strength,before.armies.find(a=>a.id===b.attackingIds[0]).strength-blocked);
    assert(!w.campaign.resolveEncounter(b.id,side,'success').ok);assert.deepEqual(w.snapshot(),after);
    assert.equal(after.events.filter(e=>e.type==='reinforcements-intercepted').length,blocked?1:0);
    assert.deepEqual(createWorldWar(w.checkpoint()).snapshot(),after);
    w.advance(2);const final=w.snapshot(),result=final.events.find(e=>e.engagementId===b.id);
    assert.equal(result.chance,result.baseChance);
    assert.equal(result.chance,result.attackers/(result.attackers+result.defenders*WORLD_WAR_SCENARIO.rules.defenseBonus));
    assert.equal(final.engagements.find(e=>e.id===b.id).reinforcements[enemy].status,blocked?'intercepted':'joined');
    const losses=final.events.slice(after.events.length).reduce((n,e)=>n+(e.type==='battle'?e.attackLoss+e.defenseLoss:e.type==='surrender'?e.strength:0),0);
    // Recruitment elsewhere is tested in the multi-seed accounting sweep below.
    assert(losses>0);assert.deepEqual(createWorldWar(w.checkpoint()).snapshot(),final);
  }
});

test('small forces reserve only available troops and a missing detachment cannot be claimed',()=>{
  const scenario={...WORLD_WAR_SCENARIO,regions:WORLD_WAR_SCENARIO.regions.map(r=>r.id==='caricas'?{...r,garrison:1,recruits:0}:r)};
  const c=createCampaign(scenario);c.locateHero('caricas');let b;
  for(let day=0;day<15&&!b;day++)b=c.step().engagements.find(b=>b.region==='caricas'&&b.status==='active');
  assert(b);assert.equal(b.reinforcements.east.strength,0);assert(c.joinBattle(b.id,b.location).ok);
  const before=c.snapshot();assert(!c.resolveEncounter(b.id,'west','success').ok);assert.deepEqual(c.snapshot(),before);
  assert(c.resolveEncounter(b.id,null,'withdraw').ok);
});

test('intercepted forces, battle losses and recruitment balance across seeded wars and replay',()=>{
  const scenario=WORLD_WAR_SCENARIO,total=s=>Object.values(s.regions).reduce((n,r)=>n+r.garrison,0)+s.armies.reduce((n,a)=>n+a.strength,0);
  let interventions=0;
  for(let seed=0;seed<30;seed++){
    const c=createCampaign(scenario,seed);c.locateHero('caricas');let prior=c.snapshot();
    for(let day=0;day<120&&!prior.winner;day++){
      const recruited=scenario.regions.reduce((n,r)=>n+(prior.regions[r.id].recovery||prior.engagements.some(b=>b.region===r.id&&b.status==='active')?0:Math.max(0,Math.min(r.recruits,scenario.rules.garrisonCap-prior.regions[r.id].garrison))),0);
      let s=c.step();const b=s.engagements.find(b=>b.region==='caricas'&&b.status==='active'&&!b.heroResult),side=seed%2?'east':'west',enemy=side==='west'?'east':'west';
      if(b?.reinforcements[enemy].strength&&c.joinBattle(b.id,b.location).ok){assert(c.resolveEncounter(b.id,side,'success').ok);interventions++;s=c.snapshot();}
      const losses=s.events.slice(prior.events.length).reduce((n,e)=>n+(e.type==='battle'?e.attackLoss+e.defenseLoss:['surrender','reinforcements-intercepted'].includes(e.type)?e.strength:0),0);
      assert.equal(total(s),total(prior)+recruited-losses,`seed ${seed}, day ${s.day}`);
      assert(s.armies.every(a=>Number.isInteger(a.strength)&&a.strength>=0));
      for(const e of s.events.filter(e=>e.type==='battle'&&e.hero?.objective))assert.equal(e.chance,e.baseChance);
      prior=s;
    }
    assert.deepEqual(replayCampaign(scenario,prior).snapshot(),prior);
  }
  assert(interventions>20);
});
test('reports distinguish skirmish results from conquest and attribute only a result-changing intervention',()=>{
  for(const faction of ['west','east'])for(const outcome of ['success','defeat','withdraw']){
    const session=createWorldWar();session.advance(10);session.syncRegion('Caricas');
    const b=session.snapshot().engagements.find(b=>b.status==='active');
    const reports=()=>worldWarReports(session.snapshot(),WORLD_WAR_SCENARIO,()=>true);
    assert.match(reports().at(-1).title,/Battle underway in Caricas/);
    assert.deepEqual(worldWarReports(session.snapshot(),WORLD_WAR_SCENARIO,()=>false),[]);
    session.campaign.joinBattle(b.id,b.location);session.campaign.resolveEncounter(b.id,outcome==='withdraw'?null:faction,outcome);
    const local=reports().at(-1);assert.match(local.title,outcome==='success'?/Reinforcements stopped/:outcome==='defeat'?/Interception failed/:/Withdrew/);
    assert.match(local.detail,/East Lizeem still controls Caricas/);assert.match(local.detail,/ends on day 12/);
    session.advance(2);const final=reports().find(r=>r.battleId===b.id);assert.notEqual(final.id,local.id);
    const tipped=faction==='west'&&outcome==='success';
    assert.match(final.title,tipped?/West Lizeem captured Caricas/:/East Lizeem held Caricas/);
    assert.equal(final.detail.includes('tipped the outcome'),tipped);
    if(outcome==='success')assert.match(final.detail,faction==='west'?/64% to 76%/:/36% to 42%/);
    if(faction==='east'&&outcome==='success')assert.match(final.detail,/did not change the winner/);
    if(outcome!=='success')assert.match(final.detail,/removed no troops/);
  }
});

test('world movement controls location without simulated travel or commands every frame',()=>{
  const session=createWorldWar();assert(!session.clock().running);assert(session.snapshot().hero.watching);
  assert(session.syncRegion('Caricas').ok);assert.equal(session.snapshot().hero.region,'caricas');assert.equal(session.snapshot().hero.journey,null);
  const before=session.snapshot();for(let i=0;i<100;i++)session.syncRegion('Caricas');assert.deepEqual(session.snapshot(),before);
  assert(!session.campaign.heroTravel('nesdor').ok);assert(!createCampaign(LIZEEM_SCENARIO).locateHero('caricas').ok);
});
test('travel outside the scenario removes local encounter eligibility without expanding the war',()=>{
  const session=createWorldWar();session.syncRegion('West Ithzel');assert.equal(session.snapshot().hero.region,null);
  assert(session.advance(100).winner);assert.equal(Object.keys(session.snapshot().regions).length,5);
});
test('campaign time advances only while running and active; paused time never catches up',()=>{
  const session=createWorldWar();for(let i=0;i<60;i++)session.tick(1,true);assert.equal(session.snapshot().day,0);
  session.toggle();for(let i=0;i<20;i++)session.tick(1,true);assert.equal(session.clock().fraction,20);
  for(let i=0;i<60;i++)session.tick(1,false);assert.equal(session.clock().fraction,20);assert.equal(session.snapshot().day,0);
  for(let i=0;i<10;i++)session.tick(1,true);assert.equal(session.snapshot().day,1);assert.equal(session.clock().fraction,0);
  session.pause();session.tick(1,true);assert.equal(session.snapshot().day,1);assert.throws(()=>session.setSpeed(99));assert.throws(()=>session.tick(Infinity,true));
});
test('the clock never stops just because the hero is in a battle region',()=>{
  const session=createWorldWar();session.syncRegion('Caricas');session.setSpeed(20);session.toggle();
  for(let i=0;i<15;i++)session.tick(1,true);const s=session.snapshot();assert.equal(s.day,10);assert.equal(s.pending,null);assert(session.clock().running);
  assert(s.engagements.some(b=>b.region==='caricas'&&b.status==='active'));
  for(let i=0;i<60;i++)session.tick(1,true);assert.equal(session.snapshot().winner,'east');assert.equal(session.snapshot().day,27);
});
test('arriving after a battle starts permits one local intervention but conquest waits for the deadline',()=>{
  const session=createWorldWar();session.advance(10);session.syncRegion('Caricas');
  const battle=session.snapshot().engagements.find(b=>b.status==='active');assert.equal(battle.started,9);assert.equal(battle.endsOn,12);
  assert(!session.campaign.joinBattle(battle.id,{x:battle.location.x+25,z:battle.location.z}).ok);
  assert(session.campaign.joinBattle(battle.id,battle.location).ok);const s=session.snapshot();assert(s.pending);
  assert.deepEqual(session.advance(100),s);
  assert(!session.syncRegion('Nesdor').ok);assert.deepEqual(session.snapshot(),s);
  assert(session.campaign.resolveEncounter(s.pending.id,'west','success').ok);assert.equal(session.snapshot().regions.caricas.owner,'east');
  assert(!session.campaign.resolveEncounter(s.pending.id,'west','success').ok);assert.equal(session.snapshot().day,10);
  assert(!session.campaign.joinBattle(battle.id,battle.location).ok);session.advance();assert.equal(session.snapshot().regions.caricas.owner,'east');
  session.advance();const resolved=session.snapshot().events.find(e=>e.engagementId===battle.id);
  assert.equal(resolved.day,12);assert.equal(resolved.hero.outcome,'success');assert.equal(resolved.chance,resolved.baseChance);assert.equal(resolved.defenders,16);assert.equal(resolved.unassistedChance,56/(56+28*1.12));
  assert(!session.campaign.joinBattle(battle.id,battle.location).ok);
});
test('world replay restores location changes, fractional clock and outcomes, always paused',()=>{
  const session=createWorldWar();session.syncRegion('Caricas');session.toggle();session.tick(1,true);session.advance(10);
  const b=session.snapshot().engagements.find(b=>b.status==='active');session.campaign.joinBattle(b.id,b.location);
  assert.deepEqual(createWorldWar(session.checkpoint()).snapshot(),session.snapshot());
  const p=session.snapshot().pending;session.campaign.resolveEncounter(p.id,'west','success');
  const restored=createWorldWar(session.checkpoint());assert.deepEqual(restored.snapshot(),session.snapshot());assert.equal(restored.clock().fraction,1);assert(!restored.clock().running);
  assert.deepEqual(restored.advance(100),session.advance(100));
});
test('live map projection contains just scenario truth and makes no stability claims for conquered peace',()=>{
  const session=createWorldWar(),p=worldWarProjection(session.snapshot());assert.equal(p.regions.Caricas.owner,'east');assert.equal(p.regions.Isareos.owner,'minora');
  assert.equal(p.regions['West Ithzel'],undefined);assert.equal(p.factions.length,3);p.regions.Caricas.owner='bad';assert.equal(session.snapshot().regions.caricas.owner,'east');
  session.advance(100);assert.equal(worldWarProjection(session.snapshot()).regions.Caricas.condition[1],'unknown');
});
test('world saves use a separate key and restore exploration and campaign together',()=>{
  const values=new Map([['azhora-exploration-v1','exploration sentinel'],['azhora-road-checkpoint-v1','adventure sentinel'],['azhora-lizeem-world-v1','older world sentinel'],['azhora-lizeem-world-v2','previous battle sentinel']]);
  const store=worldWarStore({getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)}),data=save(createWorldWar());
  assert(store.save(data).ok);assert.deepEqual(store.read().data,data);assert.equal(values.get('azhora-exploration-v1'),'exploration sentinel');assert.equal(values.get('azhora-road-checkpoint-v1'),'adventure sentinel');
  assert.equal(values.get('azhora-lizeem-world-v1'),'older world sentinel');assert.equal(values.get('azhora-lizeem-world-v2'),'previous battle sentinel');
});
test('invalid and mismatched world saves are rejected without overwriting a previous save',()=>{
  const valid=save(createWorldWar());let value=JSON.stringify(valid);const store=worldWarStore({getItem:()=>value,setItem:(_k,v)=>{value=v;}});
  for(const bad of [{...valid,version:2},{...valid,fraction:30},{...valid,speed:5},{...valid,exploration:{...exploration,position:{x:NaN,y:0,z:0}}},{...valid,simulation:{...valid.simulation,scenario:LIZEEM_SCENARIO.id}},{...valid,simulation:{...valid.simulation,commands:[{type:'hero-location',day:0,region:'fake'}]}}]){assert(!validateWorldWarSave(bad));assert(!store.save(bad).ok);assert.equal(value,JSON.stringify(valid));}
  assert(!worldWarStore({getItem:()=>'{bad',setItem:()=>{}}).read().ok);assert(!worldWarStore({getItem:()=>null,setItem:()=>{throw Error('disk full');}}).save(valid).ok);
  assert.equal(WORLD_WAR_SCENARIO.id,'lizeem-world-v5');
  assert(!validateWorldWarSave({...valid,format:'azhora-lizeem-world-v2'}));
  for(const reportReadThrough of [-1,1.5,'10',NaN,Infinity])assert(!validateWorldWarSave({...valid,reportReadThrough}));
  assert(validateWorldWarSave({...valid,reportReadThrough:0}));assert(validateWorldWarSave({...valid,reportReadThrough:123,navigation:{kind:'opening',id:'mayor'}}));
  assert(!validateWorldWarSave({...valid,simulation:{...valid.simulation,scenario:'lizeem-world-v2'}}));
  assert(!validateWorldWarSave({...valid,format:'azhora-lizeem-world-v1'}));
  assert(!validateWorldWarSave({...valid,simulation:{...valid.simulation,scenario:'lizeem-world-v1'}}));
});

test('battle sites and durations are validated; absent duration preserves the map-only rules',()=>{
  for(const duration of [-1,1.5])assert.throws(()=>createCampaign({...WORLD_WAR_SCENARIO,rules:{...WORLD_WAR_SCENARIO.rules,battleDays:duration}}));
  assert.throws(()=>createCampaign({...WORLD_WAR_SCENARIO,regions:WORLD_WAR_SCENARIO.regions.map(r=>({...r,battlefield:null}))}));
  assert.equal(createCampaign(LIZEEM_SCENARIO).step(100).engagements.length,0);
});
test('battlefield coordinates match actual geography and require discovery of their own hex',()=>{
  for(const r of WORLD_WAR_SCENARIO.regions.filter(r=>r.battlefield)){
    const {x,z}=r.battlefield;assert.equal(regionAt(x,z).name,r.name);
    const h=hexAt(x,z),mark=TRANSFORM.worldToAtlas(x,z);
    assert(!atlasMarkKnown(mark,new Set(),false));assert(atlasMarkKnown(mark,new Set(),true));
    assert(atlasMarkKnown(mark,new Set([`${h.q},${h.r}`]),false));
    assert(!atlasMarkKnown(mark,new Set([`${h.q+1},${h.r}`]),false));
  }
});
test('unattended and withdrawn battles have identical forces and random outcomes; late arrivals cannot reopen them',()=>{
  const plain=createWorldWar(),helped=createWorldWar();plain.advance(10);helped.advance(10);helped.syncRegion('Caricas');
  const b=helped.snapshot().engagements.find(b=>b.status==='active');
  assert(helped.campaign.joinBattle(b.id,b.location).ok);assert(helped.campaign.resolveEncounter(b.id,null,'withdraw').ok);
  const a=plain.advance(100),c=helped.advance(100);assert.deepEqual(a.regions,c.regions);assert.deepEqual(a.armies,c.armies);assert.equal(a.rng,c.rng);
  const before=helped.snapshot();assert(!helped.campaign.joinBattle(b.id,b.location).ok);assert.deepEqual(helped.snapshot(),before);
});
test('engaged armies, deadlines, reinforcement and force accounting remain consistent across 100 seeds',()=>{
  const scenario=WORLD_WAR_SCENARIO,total=s=>Object.values(s.regions).reduce((n,r)=>n+r.garrison,0)+s.armies.reduce((n,a)=>n+a.strength,0);
  let reinforced=false,defenderLocked=false;
  for(let seed=0;seed<100;seed++){
    const c=createCampaign(scenario,seed);let prior=c.snapshot();
    for(let day=0;day<200&&!prior.winner;day++){
      const active=prior.engagements.filter(b=>b.status==='active');
      const recruited=scenario.regions.reduce((n,r)=>n+(prior.regions[r.id].recovery||active.some(b=>b.region===r.id)?0:Math.max(0,Math.min(r.recruits,scenario.rules.garrisonCap-prior.regions[r.id].garrison))),0);
      const s=c.step(),newEvents=s.events.slice(prior.events.length),losses=newEvents.reduce((n,e)=>n+(e.type==='battle'?e.attackLoss+e.defenseLoss:e.type==='surrender'?e.strength:0),0);
      assert.equal(total(s),total(prior)+recruited-losses,`force accounting seed ${seed}, day ${s.day}`);
      const now=s.engagements.filter(b=>b.status==='active');assert.equal(new Set(now.map(b=>b.region)).size,now.length);
      for(const b of now){
        assert.equal(b.endsOn-b.started,3);assert(b.endsOn>s.day);assert.equal(s.regions[b.region].owner,b.defender);
        assert.deepEqual(s.events.find(e=>e.type==='battle-start'&&e.engagement.id===b.id).engagement.attackingIds.length,1);
        for(const id of b.attackingIds){const a=s.armies.find(a=>a.id===id);assert.equal(a.status,'engaged');assert.equal(a.region,null);assert.equal(a.to,b.region);}
      }
      for(const b of active.filter(b=>b.endsOn>s.day)){
        assert.equal(prior.regions[b.region].garrison,s.regions[b.region].garrison);
        assert(!newEvents.some(e=>e.type==='march'&&e.army.from===b.region));
        for(const a of prior.armies.filter(a=>a.status==='engaged'&&(a.region===b.region||b.attackingIds.includes(a.id)))){
          assert.equal(s.armies.find(n=>n.id===a.id).strength,a.strength);if(a.region)defenderLocked=true;
        }
      }
      for(const a of s.armies.filter(a=>a.status==='engaged'))assert(now.some(b=>b.attackingIds.includes(a.id)||b.region===a.region&&b.defender===a.owner));
      for(const e of newEvents.filter(e=>e.type==='battle')){const b=s.engagements.find(b=>b.id===e.engagementId);assert.equal(e.day,b.endsOn);assert.equal(b.status,'resolved');}
      if(newEvents.some(e=>e.type==='battle-reinforced'))reinforced=true;
      assert.equal(s.regions.isareos.owner,'minora');prior=s;
    }
    if(prior.winner)assert(!prior.engagements.some(b=>b.status==='active'));assert.deepEqual(replayCampaign(scenario,prior).snapshot(),prior);
  }
  assert(reinforced,'At least one reinforcing attacker exercised');assert(defenderLocked,'Stationed defenders held in battle');
});


test('The departure report foregrounds the nearer day-three army and never displaces a personal result',()=>{
  const w=createCurrentWorldWar();w.begin();
  const armies=worldWarArmies(w.snapshot(),CURRENT_WORLD_WAR_SCENARIO),reports=armies.map(a=>a.report).filter(Boolean);
  const first=selectWarReport(reports,armies);
  assert.match(first.title,/West Lizeem/);assert.match(first.detail,/Caricas.*day 3/);
  assert.match(selectWarReport(reports.filter(r=>r.id!==first.id),armies).title,/East Lizeem/);
  const consequence={id:100,hero:true,battleId:'previous',title:'Your contribution'};
  assert.equal(selectWarReport([...reports,consequence],armies),consequence);
  w.advance(2);const battles=worldWarReports(w.snapshot(),CURRENT_WORLD_WAR_SCENARIO,()=>true);
  assert.match(selectWarReport([...reports,...battles],armies).title,/Battle underway in Caricas/);
});
