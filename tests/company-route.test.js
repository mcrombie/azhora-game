import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {sourceModule} from './module-loader.js';
import {companyRoadStops} from '../src/company-route.js';
import {createMercenaryCompany,MERCENARY_ROSTER,distanceAlongRoad} from '../src/mercenaries.js';
import {bodyWorld,stepToward,BODY} from '../src/bodies.js';
import {canStand} from '../src/game-state.js';

test('the paused Avrel register gives nobody an invisible 90-second appointment',()=>{
  const positions={'meadow-courier':{x:10,z:0},'crossing-keeper':{x:20,z:0},'relay-clerk':{x:30,z:0}};
  assert.deepEqual(companyRoadStops(positions).map(stop=>stop.id),['crossing','relay']);
  assert.deepEqual(companyRoadStops(positions,()=>true).map(stop=>stop.id),['induction','crossing','relay'],
    'restoring the courier quest restores his appointment');
  assert.deepEqual(companyRoadStops(positions,()=>false).map(stop=>stop.id),['relay'],
    'reporting to Iven is always part of the main route');
  assert.deepEqual(companyRoadStops({}),[],'unbuilt destinations do not become origin stops');
});

let built;
async function fixture(){
  if(!built){
    const {createWorld}=await sourceModule('../src/world.js'),{ANCHORS}=await sourceModule('../src/regions.js');
    const world=createWorld(new THREE.Scene());
    world.setJourneySiteState('bridge-repair',true);
    const company=createMercenaryCompany({road:world.paths[0],stops:companyRoadStops(world.npcPositions),
      muster:ANCHORS.legionCamp,landing:world.spawn,standable:(x,z)=>canStand(x,z,world,BODY.person)});
    built={world,company};
  }
  return built;
}

test('every independent road mercenary continues through Avrel and reaches the Nothom report',async()=>{
  const {world,company}=await fixture(),road=world.paths[0];
  const avrel=distanceAlongRoad(road,world.npcPositions['meadow-courier']);
  const relay=company.stops.find(stop=>stop.id==='relay');
  for(const mercenary of MERCENARY_ROSTER.filter(person=>person.route!=='wild')){
    const start=mercenary.arrival+mercenary.departs+avrel/mercenary.pace;
    for(const seconds of [0,30,89,91]){
      const placement=company.placements(start+seconds).find(person=>person.id===mercenary.id);
      assert.equal(placement.phase,'walking',`${mercenary.name} unnecessarily waits at Avrel`);
      assert.ok(placement.distance>=avrel+seconds*mercenary.pace-.001);
    }
    const report=mercenary.arrival+mercenary.departs+relay.distance/mercenary.pace+60+1;
    const placement=company.placements(report).find(person=>person.id===mercenary.id);
    assert.equal(placement.stopId,'relay',`${mercenary.name} never reaches Nothom`);
    assert.equal(placement.phase,'stopped');
    assert.equal(company.placements(report+121).find(person=>person.id===mercenary.id).phase,'walking',
      'the legitimate Nothom report ends and the journey continues');
  }
});

test('Chris, Ciarán and Matt physically walk the built road from Avrel to Nothom',async t=>{
  const {world,company}=await fixture(),road=world.paths[0];
  const avrel=distanceAlongRoad(road,world.npcPositions['meadow-courier']);
  const iven=world.npcPositions['relay-clerk'];
  const fps=15;
  for(const id of ['merc-gotwood','merc-ciaran','merc-matt']){
    const mercenary=MERCENARY_ROSTER.find(person=>person.id===id);
    const start=mercenary.arrival+mercenary.departs+(avrel-10)/mercenary.pace;
    const first=company.placements(start).find(person=>person.id===id),position={x:first.x,z:first.z};
    const nav=bodyWorld(world).moving(position,BODY.person);
    assert.ok(canStand(position.x,position.z,world,BODY.person),`${id} starts inside scenery`);
    let arrived=false,frame=0;
    for(;frame<fps*600;frame++){
      const target=company.placements(start+frame/fps).find(person=>person.id===id);
      const gap=Math.hypot(target.x-position.x,target.z-position.z);
      const pace=target.walking?(gap>2?Math.max(2.4,target.pace*2):target.pace):2.4;
      stepToward(position,target,pace/fps,nav,BODY.person);
      assert.ok(canStand(position.x,position.z,world,BODY.person),`${id} crossed a collider`);
      if(target.stopId==='relay'&&Math.hypot(position.x-iven.x,position.z-iven.z)<14){arrived=true;break;}
    }
    assert.ok(arrived,`${id} never reached Nothom: (${position.x.toFixed(1)}, ${position.z.toFixed(1)})`);
    t.diagnostic(`${id}: ${(frame/fps).toFixed(1)} simulated seconds from Avrel to Iven, including Chip's stop.`);
  }
});
