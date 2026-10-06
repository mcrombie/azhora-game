import test from 'node:test';
import assert from 'node:assert/strict';
import {createCombat} from '../src/gameplay/combat/combat.js';
import {strategicBattleEncounter,strategicCombatOutcome} from '../src/experiments/frontier-command/strategic-battle.js';
import {createStrategicPrototype} from '../src/experiments/frontier-command/strategic-prototype.js';
const world={bounds:{minX:-10000,maxX:10000,minZ:-10000,maxZ:10000},heightAt:()=>3,colliders:[]};
function pending(){const m=createStrategicPrototype();m.order('imperial-field-force',{type:'march',target:'menora-lizeem-bridge'});for(let i=0;i<40&&!m.view().pendingBattle;i++)m.advance(6);return m;}
test('The strategic detachment fights through real combat and reconciles its victory once',()=>{
 const model=pending(),battle=model.view().pendingBattle,spec=strategicBattleEncounter(battle,world),position={...spec.checkpoint,y:3},events=[];
 const combat=createCombat({world,position,onEvent:e=>events.push(e)});
 assert.equal(combat.startEncounter(spec,{atCheckpoint:true}),true);combat.update(1);
 assert.equal(combat.state.enemies.length,2);assert.equal(combat.state.allies.length,2);
 for(const e of combat.state.enemies)combat.spellHit(e.id,1000);
 combat.update(.1);const terminal=events.find(e=>e.type==='victory');assert.ok(terminal);
 assert.equal(strategicCombatOutcome(terminal,'unrelated-fight',battle),null);
 const outcome=strategicCombatOutcome(terminal,combat.state.encounterId,battle);assert.equal(outcome,'imperial-victory');
 assert.equal(model.resolveAdventureBattle(battle.id,outcome).ok,true);assert.equal(model.resolveAdventureBattle(battle.id,outcome).duplicate,true);
});
test('Battle placement avoids blocked ground and nearby named residents; no clearing means no battle',()=>{
 const battle={id:'frontier-battle-1',at:{x:0,z:0}};
 const spec=strategicBattleEncounter(battle,world,{occupied:[{x:0,z:0}]});assert.ok(Math.hypot(spec.center.x,spec.center.z)>=23);
 assert.equal(strategicBattleEncounter(battle,{...world,colliders:[{x:0,z:0,r:200}]}),null);
 assert.equal(strategicCombatOutcome({type:'defeat'},'strategy-frontier-battle-1',battle),'centaur-victory');
 assert.equal(strategicCombatOutcome({type:'retreat'},'strategy-frontier-battle-1',battle),'retreat');
 assert.equal(strategicCombatOutcome({type:'enemy-defeated'},'strategy-frontier-battle-1',battle),null);
});
