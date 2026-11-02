import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaign,replayCampaign} from '../src/simulation/campaign.js';
import {WORLD_WAR_SCENARIO,OPENING_WORLD_WAR_SCENARIO,FOOD_WORLD_SCENARIO} from '../src/app/exploration/world-war.js';
import {createRoadsideInterception,armyMarchProgress} from '../src/simulation/roadside-interception.js';
import {worldWarReports,selectWarReport} from '../src/app/exploration/war-reports.js';
import {campaignChronicle} from '../src/app/exploration/campaign-chronicle.js';
import {talethLetters,talethFinale} from '../src/app/exploration/taleth-correspondence.js';
import {createLizeemEncounter} from '../src/gameplay/combat/lizeem-encounter.js';
import {assaultMorale,commanderReports} from '../src/gameplay/combat/commander-morale.js';
import {encounterAutoplayInput} from '../src/gameplay/autoplay/encounter-input.js';
import {applyEncounterResult} from '../src/app/lizeem/encounter-result.js';
import {validateWorldWarSave,WORLD_WAR_KEY} from '../src/app/exploration/war-checkpoint.js';
import {militiaWeapon} from '../src/gameplay/combat/combat-units.js';

const contact=region=>({region,location:{x:100,z:100},position:{x:100,z:110}});
const enemy=side=>side==='west'?'east':'west';
function opening(scenario=WORLD_WAR_SCENARIO){
  const c=createCampaign(scenario);c.step();const army=c.snapshot().armies.find(a=>a.status==='marching'&&a.owner==='west');
  assert(army);c.locateHero(army.from);return {c,army,side:'east',scenario};
}
function enter({c,army,side}){assert(c.interceptArmy(army.id,side,contact(c.snapshot().hero.region)).ok);return c.snapshot().pending;}
function commanderReport(p,fate='routed'){
  return Object.fromEntries(Object.entries(p.commanders).map(([side,c])=>[side,{id:c.id,hp:fate==='slain'?0:fate==='active'?75:1,outcome:fate}]));
}
function result(c,p,{outcome='success',killed=p.rally.guards,routed=0,lost=0,fate=outcome==='success'?'routed':'active'}={}){
  return c.resolveEncounter(p.id,p.defender,outcome,outcome==='success'?'rally-secured':outcome==='defeat'?'driven-back':'withdrew',killed+routed,
    {escaped:0,alliesLost:lost,routed,allyDamage:40,commanders:commanderReport(p,fate)});
}
const sum=s=>s.armies.reduce((n,a)=>n+a.strength,0)+Object.values(s.regions).reduce((n,r)=>n+r.garrison,0);
const replay=c=>assert.deepEqual(replayCampaign(WORLD_WAR_SCENARIO,c.snapshot()).snapshot(),c.snapshot());

test('approaching a real enemy march creates one local invitation; pending replay does not tick the war',()=>{
  const o=opening(),before=o.c.snapshot(),p=enter(o);
  assert.equal(p.kind,'roadside');assert.equal(p.armyId,o.army.id);assert(!p.battleId);assert.equal(p.commanders.west.armyId,o.army.id);
  assert.equal(p.rally.allied.totalAllies,2);assert.equal(p.roadside.support.region,'caricas');
  const pending=o.c.snapshot();o.c.step(10);assert.deepEqual(o.c.snapshot(),pending);replay(o.c);
  assert.equal(pending.day,before.day);assert.deepEqual(pending.regions,before.regions);assert.deepEqual(pending.armies,before.armies);assert.deepEqual(pending.engagements,before.engagements);
  assert(!o.c.interceptArmy(o.army.id,o.side,contact(o.army.from)).ok);
});

test('declining is free and permits returning; fighting then withdrawing spends this march and keeps both sides casualties',()=>{
  const o=opening(),before=o.c.snapshot(),p=enter(o);
  assert(o.c.resolveEncounter(p.id,null,'withdraw','declined',0).ok);assert.deepEqual(o.c.snapshot().armies,before.armies);assert.deepEqual(o.c.snapshot().regions,before.regions);
  replay(o.c);const again=enter(o),total=sum(o.c.snapshot());assert(result(o.c,again,{outcome:'withdraw',killed:1,lost:1}).ok);
  const s=o.c.snapshot(),a=s.armies.find(a=>a.id===o.army.id);assert.equal(a.strength,o.army.strength-4);assert.equal(a.arrives,o.army.arrives);assert.equal(a.commander.hp,75);
  assert.equal(sum(s),total-5);assert.equal(s.regions[again.roadside.support.region].garrison,before.regions[again.roadside.support.region].garrison-1);
  assert(!o.c.interceptArmy(a.id,o.side,contact(a.from)).ok);assert(!result(o.c,again,{killed:1}).ok);replay(o.c);
});

test('success delays only this army, preserves towns and time, and carries commander morale into its destination battle',()=>{
  for(const scenario of [WORLD_WAR_SCENARIO,OPENING_WORLD_WAR_SCENARIO,FOOD_WORLD_SCENARIO]){
    const o=opening(scenario),p=enter(o),before=o.c.snapshot();assert(result(o.c,p,{killed:2,routed:1}).ok);
    const after=o.c.snapshot(),a=after.armies.find(a=>a.id===o.army.id),event=after.events.at(-1);
    assert.equal(after.day,before.day);assert.equal(a.strength,o.army.strength-8,'A routed regular survives');assert.equal(a.arrives,o.army.arrives+1);
    assert.equal(a.commander.status,'routed');assert.deepEqual(event.morale,{west:-20,east:20});assert.equal(event.delay,1);assert.equal(event.type,'roadside-result');
    assert.deepEqual(after.regions,before.regions);assert.deepEqual(after.engagements,before.engagements);
    assert.deepEqual(after.armies.filter(a=>a.id!==o.army.id),before.armies.filter(a=>a.id!==o.army.id));
    assert(!o.c.interceptArmy(a.id,o.side,contact(a.from)).ok,'Changed arrival time does not reset the opportunity');
    assert.deepEqual(replayCampaign(scenario,after).snapshot(),after);
    o.c.step(a.arrives-after.day);const battle=o.c.snapshot().engagements.find(b=>b.attackingIds.includes(a.id));assert(battle);
    assert.equal(battle.morale.west,-20);assert.equal(battle.morale.east,20);assert(!battle.commanders.west,'The routed captain is absent');
    assert.deepEqual(replayCampaign(scenario,o.c.snapshot()).snapshot(),o.c.snapshot());
  }
});

test('defeat preserves commander wounds without delaying the march; slain commanders stay dead',()=>{
  for(const fate of ['active','slain']){
    const o=opening(),p=enter(o);assert(result(o.c,p,{outcome:'defeat',killed:1,fate}).ok);
    let s=o.c.snapshot(),a=s.armies.find(a=>a.id===o.army.id);assert.equal(a.arrives,o.army.arrives);assert.equal(a.commander.status,fate);assert.equal(a.commander.hp,fate==='slain'?0:75);
    assert.equal(s.events.at(-1).delay,0);replay(o.c);
    o.c.step(30);s=o.c.snapshot();a=s.armies.find(a=>a.id===o.army.id);if(fate==='slain')assert.equal(a.commander.status,'slain');
  }
});

test('invalid side, distance, location, stale order and fabricated results are rejected without mutations',()=>{
  const o=opening();
  for(const [id,side,where] of [[o.army.id,'west',contact(o.army.from)],[999,o.side,contact(o.army.from)],[o.army.id,o.side,{...contact(o.army.from),position:{x:120,z:100}}],[o.army.id,o.side,contact('caricas')],[o.army.id,'minora',contact(o.army.from)],[o.army.id,o.side,{...contact(o.army.from),location:{x:NaN,z:100}}]]){
    const before=o.c.snapshot();assert(!o.c.interceptArmy(id,side,where).ok);assert.deepEqual(o.c.snapshot(),before);
  }
  const p=enter(o),before=o.c.snapshot();
  for(const [faction,outcome,reason,count,progress] of [
    ['west','success','rally-secured',3,{commanders:commanderReport(p)}],
    [o.side,'success','rally-secured',3,{}],
    [o.side,'success','rally-secured',3,{commanders:commanderReport(p,'active')}],
    [o.side,'success','rally-secured',2,{commanders:commanderReport(p)}],
    [o.side,'success','rally-secured',3,{alliesLost:3,commanders:commanderReport(p)}],
    [o.side,'success','rally-secured',3,{routed:4,commanders:commanderReport(p)}],
    [o.side,'withdraw','withdrew',1,{commanders:{west:{id:p.commanders.west.id,hp:250,outcome:'active'}}}],
    [null,'withdraw','declined',1,{}],
  ]){assert(!o.c.resolveEncounter(p.id,faction,outcome,reason,count,progress).ok);assert.deepEqual(o.c.snapshot(),before);}
  const forged=o.c.snapshot();forged.commands.at(-1).faction='west';assert.throws(()=>replayCampaign(WORLD_WAR_SCENARIO,forged));
});

test('later eastern and western campaign marches are interceptable, including a new march by the same army',()=>{
  const c=createCampaign(WORLD_WAR_SCENARIO),seen=new Set(),orders=new Map();let count=0;
  while(c.snapshot().day<100&&!c.snapshot().winner){
    c.step();const s=c.snapshot();
    for(const army of s.armies.filter(a=>a.status==='marching'&&a.departed>1)){
      const side=enemy(army.owner);c.locateHero(army.from);
      if(!c.interceptArmy(army.id,side,contact(army.from)).ok)continue;
      const p=c.snapshot().pending;assert(result(c,p,{outcome:'withdraw',killed:0}).ok);
      seen.add(army.owner);orders.set(army.id,(orders.get(army.id)??0)+1);count++;replay(c);
      if(count>=4&&seen.size===2&&[...orders.values()].some(n=>n>1))break;
    }
    if(count>=4&&seen.size===2&&[...orders.values()].some(n=>n>1))break;
  }
  assert.equal(seen.size,2);assert(count>=4);assert([...orders.values()].some(n=>n>1),'An army can be intercepted again only after receiving a new march order');
});

test('delayed columns preserve their exact fractional progress and both markers can share the same timeline',()=>{
  const o=opening(),fraction=.375,time=o.c.snapshot().day+fraction;
  assert(o.c.interceptArmy(o.army.id,o.side,{...contact(o.army.from),fraction}).ok);const p=o.c.snapshot().pending;
  const before=armyMarchProgress(o.army,time);assert(result(o.c,p).ok);const a=o.c.snapshot().armies.find(a=>a.id===o.army.id);
  assert.equal(armyMarchProgress(a,time),before);assert(armyMarchProgress(a,time+.5)>before);assert.equal(armyMarchProgress(a,a.arrives),1);
  assert.equal(a.roadside.fraction,fraction);assert.equal(o.c.snapshot().events.at(-1).fraction,fraction);replay(o.c);
  assert.equal(armyMarchProgress({...a,departed:7,arrives:10},8),1/3,'A later order ignores the old delay anchor');
  for(const invalid of [-.1,1.01,NaN,Infinity]){const next=opening();assert(!next.c.interceptArmy(next.army.id,next.side,{...contact(next.army.from),fraction:invalid}).ok);}
});

test('roadside reports and Chronoscope preserve the army result without claiming a territorial victory',()=>{
  const o=opening(),p=enter(o);assert(result(o.c,p,{killed:2,routed:1,lost:1}).ok);const s=o.c.snapshot(),before=structuredClone(s);
  const reports=worldWarReports(s,WORLD_WAR_SCENARIO,()=>true),report=reports.at(-1),history=campaignChronicle(s),frame=history.frames.find(f=>f.caption.includes('No town changed hands'));
  assert(report.roadside&&report.hero);assert.equal(report.armyId,o.army.id);assert.match(report.detail,/removing 8 enemy strength/);assert.match(report.detail,/1 enemy soldier fled and survived/);assert.match(report.detail,/expected at Caricas on day 4/);assert.match(report.detail,/Meret Voss retreated/);assert.match(report.note,/Taleth/);
  assert.equal(selectWarReport(reports,[]).id,report.id);assert.deepEqual(worldWarReports(s,WORLD_WAR_SCENARIO,()=>false),[]);
  assert(frame);assert.equal(frame.owners.caricas,'east');assert.equal(frame.owners.nethereum,'west');assert.match(frame.caption,/1 allied scout was lost from Caricas/);
  assert.deepEqual(s,before,'Presentation remains read-only');
  const restored=replayCampaign(WORLD_WAR_SCENARIO,s).snapshot();assert.deepEqual(worldWarReports(restored,WORLD_WAR_SCENARIO,()=>true),reports);assert.deepEqual(campaignChronicle(restored),history);
});

test('Taleth acknowledges roadside-only participation and retains its original advice through the campaign',()=>{
  const o=opening(),p=enter(o);assert(result(o.c,p,{killed:2,routed:1}).ok);
  const first=talethLetters(o.c.snapshot(),{side:o.side});assert.equal(first.length,1);assert.equal(first[0].side,'east');assert.match(first[0].summaryText,/delayed the enemy march/);assert.match(first[0].detail,/No town changed hands/);
  assert.match(first[0].note,/preserve the people/);o.c.step(200);assert(o.c.snapshot().winner);
  assert.deepEqual(talethLetters(o.c.snapshot(),{side:o.side})[0],first[0]);const summary=talethFinale(o.c.snapshot())[1].words;
  assert.match(summary,/1 roadside skirmish, removing 8 enemy strength and delaying 1 march/);assert.doesNotMatch(summary,/left the fighting to the armies/);
});

test('actual combined combat reports commit without counting commanders as regulars or overshooting the damage allowance',()=>{
  const o=opening(),p=enter(o),guards=Array.from({length:p.rally.guards},(_,i)=>({x:(i-1)*3,z:-8,unitType:'militiaman',weapon:militiaWeapon(i)}));
  guards.push({x:6,z:-9,commander:p.commanders.west});
  const allies=Array.from({length:p.rally.allied.totalAllies},(_,i)=>({x:(i-1)*3,z:0,unitType:'militiaman',weapon:militiaWeapon(i)}));
  const model=createLizeemEncounter({guardStarts:guards,allyStarts:allies,heroStart:{x:0,z:4},rallyPoint:{x:0,z:0},morale:assaultMorale(p,o.side),move:(p,x,z)=>({x:p.x+x,z:p.z+z})});
  let field=model.snapshot();for(let i=0;i<7300&&!field.outcome;i++)field=model.tick(1/60,encounterAutoplayInput(field));
  assert.equal(field.outcome,'success','Normal movement and melee autoplay can beat the captain with two scouts');assert(field.squad.damageByAllies>0);assert(field.squad.damageByAllies<=3*WORLD_WAR_SCENARIO.rules.encounterSoldierHealth+200);assert.equal(Object.keys(commanderReports(field)).length,1);
  assert(applyEncounterResult(o.c,{pending:p,field,side:o.side,outcome:field.outcome,reason:field.objective.reason,started:true}).ok);
  const event=o.c.snapshot().events.at(-1);assert(event.removed<=12);assert(event.alliesLost<=2);assert.equal(event.commander.status,commanderReports(field).west.outcome);replay(o.c);
});

test('a roadside death and its pre-fight decision checkpoint remain valid saves and replay without accumulating damage',()=>{
  const o=opening(),p=enter(o),exploration={version:1,character:'teresod',position:{x:100,y:2,z:110},heading:0,camera:{yaw:0,pitch:.3,distance:8},elapsed:30,cells:[]};
  const checkpoint=()=>({format:WORLD_WAR_KEY,version:1,campaignSide:o.side,exploration,simulation:o.c.snapshot(),fraction:0,speed:1,tower:{version:1,location:'world',briefed:true,running:false}});
  const before=checkpoint();assert(validateWorldWarSave(before));assert(result(o.c,p,{outcome:'defeat',killed:1,lost:1}).ok);
  const after=checkpoint(),report=worldWarReports(o.c.snapshot(),WORLD_WAR_SCENARIO,()=>true).at(-1).detail;
  const death={battleId:p.id,stage:'rally',side:o.side,previousForm:'living',fallen:exploration.position,before,report};
  for(const form of ['living','ghost','undead'])assert(validateWorldWarSave({...after,afterlife:{version:1,form,inLimbo:form==='living',death}}));
  const retry=replayCampaign(WORLD_WAR_SCENARIO,before.simulation);assert.equal(retry.snapshot().pending.id,p.id);assert(result(retry,p,{outcome:'defeat',killed:1,lost:1}).ok);assert.deepEqual(retry.snapshot(),o.c.snapshot());
});

test('a tiny remaining column can be destroyed without conquering its destination or leaving a ghost arrival',()=>{
  const scenario={heroTracking:'world',wars:[['west','east']],regions:[{id:'a',name:'A',position:{x:0,y:0}},{id:'b',name:'B',position:{x:10,y:0}}]};
  const army={id:1,owner:'west',name:'Remnant',status:'marching',strength:2,from:'a',to:'b',departed:1,arrives:4};
  const state={day:2,hero:{region:'a',readyOn:0},regions:{a:{owner:'west',garrison:8},b:{owner:'east',garrison:6}},armies:[army],pending:null,commands:[]},events=[];
  const service=createRoadsideInterception({state,scenario,emit:(type,event)=>events.push({type,...event}),destroy:a=>Object.assign(a,{status:'destroyed',strength:0,arrives:null}),victory:()=>{}});
  assert(service.interceptArmy(1,'east',contact('a')).ok);const p=state.pending;assert.equal(p.rally.guards,2);
  assert(service.resolve(p.id,'east','success','rally-secured',2,{commanders:{}}).ok);
  assert.equal(army.status,'destroyed');assert.equal(army.arrives,null);assert.equal(events.at(-1).delay,0);assert.equal(state.regions.b.owner,'east');assert(!service.interceptArmy(1,'east',contact('a')).ok);
});
