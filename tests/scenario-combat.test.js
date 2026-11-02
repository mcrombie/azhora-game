import test from 'node:test';
import assert from 'node:assert/strict';
import {createLizeemEncounter} from '../src/gameplay/combat/lizeem-encounter.js';
import {createAlliedAssault} from '../src/gameplay/combat/allied-assault.js';
import {unitBody,combatUnit,physicalDamage,militiaWeapon} from '../src/gameplay/combat/combat-units.js';
import {commanderBody} from '../src/gameplay/combat/commander-morale.js';
import {LIZEEM_CHAMPIONS} from '../src/content/scenarios/lizeem-champions.js';
import {encounterAttack,ENCOUNTER_ATTACKS} from '../src/gameplay/combat/encounter-attacks.js';
import {encounterAutoplayInput} from '../src/gameplay/autoplay/encounter-input.js';
import {sourceModule} from './module-loader.js';
import {createCampaign,replayCampaign} from '../src/simulation/campaign.js';
import {WORLD_WAR_SCENARIO,UNIFIED_WORLD_WAR_SCENARIO,LEGACY_UNIFIED_WORLD_WAR_SCENARIO,DUEL_WORLD_WAR_SCENARIO} from '../src/app/exploration/world-war.js';

test('both captains use the same veteran stats, equipment and saved health in duels and army battles',()=>{
  for(const side of ['west','east']){
    const captain={...LIZEEM_CHAMPIONS[side],hp:75};
    const duel=createLizeemEncounter({duel:captain,guardStarts:[{x:0,z:-3}]}).snapshot().guards[0];
    const army=createLizeemEncounter({guardStarts:[{x:0,z:-3,commander:captain}],allyStarts:[{x:4,z:0,commander:captain}],rallyPoint:{x:0,z:0}}).snapshot();
    for(const actor of [duel,army.guards[0],army.allies[0]]){
      assert.equal(actor.hp,75);assert.equal(actor.maxHp,200);assert.equal(actor.defense.reduction,1);assert.equal(actor.armor,.25);
      assert.deepEqual(actor.combat,duel.combat);assert.equal(actor.combat.attributes.quickness,combatUnit('veteran-ambron-soldier').attributes.quickness);
      assert(encounterAttack(actor).windup<ENCOUNTER_ATTACKS.thrust.windup);assert.equal(encounterAttack(actor).damage,26);
    }
  }
});

function squadFixture(weapon='sword'){
  const target={...unitBody('militiaman'),id:0,x:0,z:2,heading:Math.PI,phase:'windup',open:false,hp:100};
  const state={time:0,hero:{x:30,z:30,hp:100},guards:[target],objective:{rally:{x:0,z:0}}};
  const squad=createAlliedAssault(state,{starts:[{x:0,z:0,unitType:'militiaman',weapon}],walk(){},canHit:()=>true});
  return {squad,target,state,ally:state.allies[0]};
}
test('NPC strikes respect the same shield openings and armor as the player, including mace penetration',()=>{
  const {squad,target,ally}=squadFixture();ally.heading=0;
  assert(squad.strike(ally,target));assert.equal(target.hp,100,'A frontal hit cannot ignore a shield just because its owner is attacking');
  target.phase='stagger';assert(squad.strike(ally,target));assert.equal(target.hp,80,'Stagger exposes the shield');
  Object.assign(target,commanderBody(LIZEEM_CHAMPIONS.east),{phase:'recover',open:true,hp:200});
  assert(squad.strike(ally,target));assert.equal(target.hp,185,'Armor applies to an open captain');
  Object.assign(ally,unitBody('militiaman','mace'));assert(squad.strike(ally,target));assert.equal(target.hp,163,'A mace bypasses part of captain armor');
  assert.equal(physicalDamage(25,target).damage,19,'The same armor rule applies to staff damage');
});
test('allied sword sweeps keep their real arc and active window, and cannot hit twice',()=>{
  const {squad,target,ally}=squadFixture();Object.assign(ally,{attack:'sword-sweep',phase:'strike',heading:0,targetId:0,contactResolved:false,hitThisAttack:false});
  const attack=encounterAttack(ally);ally.timer=attack.strike;target.x=8;target.phase='stagger';
  squad.tick(.1);squad.tick(.05);assert.equal(target.hp,100);assert(!ally.contactResolved,'A missed initial contact does not erase the remaining sweep');
  target.x=2;target.z=.1;squad.tick(.05);assert.equal(target.hp,78,'The far side of the visible sweep still hits');
  squad.tick(.05);assert.equal(target.hp,78,'One sweep deals at most one hit');assert(ally.contactResolved);
});
test('real militia and captain formations remain winnable with ordinary staff and dodge inputs for either league',()=>{
  for(const side of ['west','east']){
    const enemy=side==='west'?'east':'west',troops=z=>[-3,0,3].map((x,i)=>({x,z,unitType:'militiaman',weapon:militiaWeapon(i)}));
    const model=createLizeemEncounter({heroStart:{x:0,z:4},guardStarts:[...troops(-8),{x:6,z:-9,commander:LIZEEM_CHAMPIONS[enemy]}],
      allyStarts:[...troops(0),{x:6,z:0,commander:LIZEEM_CHAMPIONS[side]}],rallyPoint:{x:0,z:0},morale:{},move:(p,x,z)=>({x:p.x+x,z:p.z+z})});
    let s=model.snapshot();for(let i=0;i<7300&&!s.outcome;i++)s=model.tick(1/60,encounterAutoplayInput(s));
    assert.equal(s.outcome,'success',JSON.stringify({side,time:s.time,hp:s.hero.hp,guards:s.guards.map(g=>[g.name,g.hp,g.routed])}));
    assert(s.squad.damageByAllies>0&&s.squad.damageByHero>0);assert(s.guards.find(g=>g.commanderId).routed||!s.guards.find(g=>g.commanderId).hp);
  }
});
test('warning geometry uses the actual weapon footprint even when attack names match legacy exercises',async()=>{
  const {createEncounterWarnings}=await sourceModule('../src/app/lizeem/encounter-presentation.js');
  const THREE=await import('../vendor/three.module.js'),scene=new THREE.Scene(),view=createEncounterWarnings(scene,1);
  const captain={...commanderBody(LIZEEM_CHAMPIONS.west),attack:'thrust',phase:'windup',x:0,z:0,heading:0,timer:.2};
  view.draw([captain]);const mesh=scene.children.find(o=>o.userData.combatWarning),first=mesh.geometry;
  assert.equal(first.parameters.outerRadius,encounterAttack(captain).reach);assert.equal(first.parameters.thetaLength,encounterAttack(captain).halfAngle*2);
  view.draw([{...captain,combat:undefined,archetype:undefined}]);assert.equal(mesh.geometry.parameters.outerRadius,ENCOUNTER_ATTACKS.thrust.reach);
  view.draw([captain]);assert.equal(mesh.geometry,first,'Repeated frames reuse geometry');view.dispose();assert.equal(scene.children.length,0);
});

test('current and earlier campaigns accept legitimate 100-health militia results after a duel, reject excess damage and replay exactly',()=>{
  for(const scenario of [WORLD_WAR_SCENARIO,UNIFIED_WORLD_WAR_SCENARIO,LEGACY_UNIFIED_WORLD_WAR_SCENARIO,DUEL_WORLD_WAR_SCENARIO])for(const side of ['west','east']){
    assert.equal(scenario.rules.encounterSoldierHealth,combatUnit('militiaman').hp,'Scenario damage budget must track changes to the actual unit stats');
    const c=createCampaign(scenario);if(!scenario.openingBattles)c.step(3);c.locateHero('caricas');const b=c.snapshot().engagements[0];
    assert(c.joinBattle(b.id,b.location).ok);assert(c.chooseDuel(b.id,side).ok);assert(c.resolveEncounter(b.id,side,'success','champion-yielded',0).ok);
    assert(c.joinBattle(b.id,b.location).ok);assert(c.chooseAssault(c.snapshot().pending.id,'allied').ok);const p=c.snapshot().pending;
    const commanders=Object.fromEntries(Object.entries(p.commanders??{}).filter(([,leader])=>leader.status==='active').map(([f,leader])=>[f,{id:leader.id,hp:leader.hp,outcome:'active'}]));
    const max=p.rally.guards*combatUnit('militiaman').hp,progress={escaped:0,alliesLost:0,routed:0,allyDamage:max,...(p.commanders?{commanders}:{})};
    const before=c.snapshot();assert(!c.resolveEncounter(p.id,side,'success','rally-secured',p.rally.guards,{...progress,allyDamage:max+1}).ok);assert.deepEqual(c.snapshot(),before);
    assert(c.resolveEncounter(p.id,side,'success','rally-secured',p.rally.guards,progress).ok,'Legal militia damage must not leave Continue stuck');
    assert.equal(c.snapshot().regions.caricas.owner,side);assert.deepEqual(replayCampaign(scenario,c.snapshot()).snapshot(),c.snapshot());
  }
});
test('roadside results use the same stat-derived health ceiling and preserve old smaller reports',()=>{
  for(const damage of [40,500]){
    const c=createCampaign(LEGACY_UNIFIED_WORLD_WAR_SCENARIO);c.step();const army=c.snapshot().armies.find(a=>a.owner==='west'&&a.status==='marching');c.locateHero(army.from);
    assert(c.interceptArmy(army.id,'east',{region:army.from,location:{x:0,z:0},position:{x:0,z:0}}).ok);const p=c.snapshot().pending;
    const progress={escaped:0,alliesLost:0,routed:0,allyDamage:damage,commanders:{west:{id:p.commanders.west.id,hp:0,outcome:'slain'}}};
    assert(!c.resolveEncounter(p.id,'east','success','rally-secured',3,{...progress,allyDamage:501}).ok);
    assert(c.resolveEncounter(p.id,'east','success','rally-secured',3,progress).ok);assert.deepEqual(replayCampaign(LEGACY_UNIFIED_WORLD_WAR_SCENARIO,c.snapshot()).snapshot(),c.snapshot());
  }
  for(const health of [0,-1,NaN,Infinity,1.5])assert.throws(()=>createCampaign({...WORLD_WAR_SCENARIO,rules:{...WORLD_WAR_SCENARIO.rules,encounterSoldierHealth:health}}),/soldier health/);
});
