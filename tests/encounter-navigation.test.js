import test from 'node:test';
import assert from 'node:assert/strict';
import {encounterAutoplayInput} from '../src/gameplay/autoplay/encounter-input.js';
import {clearEncounterDirection,encounterKeyboardDirections} from '../src/gameplay/autoplay/encounter-navigation.js';
import {encounterKeys} from '../src/dev/checks/encounter-controls.js';
import {createSkirmishGround} from '../src/app/exploration/skirmish-ground.js';

const hero={x:0,z:0,hp:100,heading:Math.PI,dodge:0,dodgeCooldown:0};
const guard={id:0,x:0,z:-1.9,hp:50,heading:0,phase:'windup',timer:.1,attack:'thrust',contactResolved:false};
const state=()=>({hero:{...hero},guards:[{...guard}]});
const dryBank={canOccupy:(p,r)=>p.x+r<.8,canTraverse:(a,b,r)=>b.x+r<.8};

test('autoplay rejects the full riverward dodge and chooses a clear bank direction',()=>{
  assert.equal(encounterAutoplayInput(state()).x,1,'The former preferred dodge heads toward the water');
  const input=encounterAutoplayInput(state(),dryBank);
  assert.equal(input.dodge,true);
  assert.ok(dryBank.canTraverse(hero,{x:input.x*2.7,z:input.z*2.7},.55));
  assert.ok(input.x<.1,'The full dodge stays away from the river edge');
});

test('dodge clearance checks intervening ground and the whole body, not just the endpoint',()=>{
  const navigation={canOccupy:(p,r)=>p.x+r<1.1,canTraverse:(a,b)=>!(a.z<.7&&b.z>.7)};
  const input=clearEncounterDirection(hero,{x:0,z:1},[],navigation,2.7);
  assert.ok(input.z<.7/2.7,'Does not cross the thin ditch between two dry endpoints');
  assert.ok(input.x*2.7+.55<1.1,'Body stays off the bank');
});

test('a trapped autoplay player guards instead of repeatedly dodging into scenery',()=>{
  const input=encounterAutoplayInput(state(),{canTraverse:()=>false,canOccupy:()=>true});
  assert.deepEqual(input,{block:true});
  assert.equal(encounterKeys(state(),0,input).KeyF,true);
});

test('dodge paths avoid occupied bodies even if the landing spot is empty',()=>{
  const blocker={id:1,x:1.4,z:0,hp:50};
  const direction=clearEncounterDirection(hero,{x:1,z:0},[blocker],{canTraverse:()=>true},2.7);
  for(let t=0;t<=2.7;t+=.1)assert.ok(Math.hypot(direction.x*t-blocker.x,direction.z*t-blocker.z)>1.17);
});

test('camera-relative keyboard conversion preserves the terrain-tested dodge bearing',()=>{
  for(let yaw=0;yaw<Math.PI*2;yaw+=.17){
    const input=encounterAutoplayInput(state(),{...dryBank,directions:encounterKeyboardDirections(yaw)});
    assert.equal(input.dodge,true);
    const keys=encounterKeys(state(),yaw,input),forward=Number(keys.KeyW)-Number(keys.KeyS),side=Number(keys.KeyD)-Number(keys.KeyA);
    const x=-Math.sin(yaw)*forward+Math.cos(yaw)*side,z=-Math.cos(yaw)*forward-Math.sin(yaw)*side,length=Math.hypot(x,z);
    assert.ok(Math.abs(x/length-input.x)<1e-8&&Math.abs(z/length-input.z)<1e-8);
    assert.ok(dryBank.canTraverse(hero,{x:x/length*2.7,z:z/length*2.7},.55));
  }
});

test('a hero already close to a bank can dodge inland through the real footprint into a clear landing',()=>{
  const world={bounds:{minX:-100,maxX:100,minZ:-100,maxZ:100},heightAt:()=>2,waterAt:x=>x<0?3:0,readyAt:()=>true,regionAt:()=>({id:13}),nearColliders:()=>[]};
  const ground=createSkirmishGround(world,{x:5,z:0}),at={...hero,x:.35,z:0};
  const navigation={canOccupy:(p,r)=>ground.clear(p.x,p.z,r),canTraverse:ground.segment};
  assert(ground.clear(at.x,at.z,.34)&&!ground.clear(at.x,at.z,.55),'Actual footing is valid but the preferred margin is unavailable');
  assert.deepEqual(clearEncounterDirection(at,{x:1,z:0},[],navigation,2.7),{x:0,z:0},'The former full-path margin traps this position');
  const input=clearEncounterDirection(at,{x:1,z:0},[],{...navigation,terrainRadius:.34},2.7);
  assert(input.x>.99,'Ordinary inward escape is allowed');
  const end={x:at.x+input.x*2.7,z:at.z+input.z*2.7};
  assert(ground.segment(at,end,.34)&&ground.clear(end.x,end.z,.55),'The entire real footprint is dry and the landing restores the larger margin');
});

test('the smaller swept footprint still rejects real water crossings and cramped landing positions',()=>{
  const world={bounds:{minX:-100,maxX:100,minZ:-100,maxZ:100},heightAt:()=>2,waterAt:(x,z)=>z>.7&&z<1.2?3:0,readyAt:()=>true,regionAt:()=>({id:13}),nearColliders:()=>[]};
  const ground=createSkirmishGround(world,{x:0,z:0});
  const navigation={terrainRadius:.34,canOccupy:(p,r)=>ground.clear(p.x,p.z,r),canTraverse:ground.segment,directions:[{x:0,z:1}]};
  assert(ground.clear(0,2.7,.55),'The far bank offers a dry landing');
  assert.deepEqual(clearEncounterDirection(hero,{x:0,z:1},[],navigation,2.7),{x:0,z:0},'A dry endpoint cannot excuse crossing the water');
  const narrow={terrainRadius:.34,canOccupy:(p,r)=>Math.abs(p.x)+r<.5,canTraverse:()=>true,directions:[{x:0,z:1}]};
  assert.deepEqual(clearEncounterDirection(hero,{x:0,z:1},[],narrow,2.7),{x:0,z:0},'A traversable narrow strip still needs a landing with the desired clearance');
});
