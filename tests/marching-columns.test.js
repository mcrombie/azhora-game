import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorldWar,FOOD_WORLD_SCENARIO,WORLD_WAR_SCENARIO} from '../src/app/exploration/world-war.js';
import {campaignColumns,columnRoadPoint} from '../src/app/exploration/war-columns.js';
import {worldWarArmies,withColumnPosition} from '../src/app/exploration/war-armies.js';
import {sourceModule} from './module-loader.js';

const resolve=(from,to)=>{
  const a=FOOD_WORLD_SCENARIO.regions.find(r=>r.id===from).position,b=FOOD_WORLD_SCENARIO.regions.find(r=>r.id===to).position;
  const points=[{x:a.x,z:a.y},{x:(a.x+b.x)/2+11,z:(a.y+b.y)/2-7},{x:b.x,z:b.y}];
  return {id:from+'>'+to,name:from+' to '+to,points,length:points.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p.x-points[i].x,p.z-points[i].z),0)};
};
const moving=s=>s.armies.filter(a=>a.strength>0&&['marching','retreating'].includes(a.status));

test('all actual marches and retreats have physical projections throughout ordinary and food campaign histories',()=>{
  for(const scenario of [WORLD_WAR_SCENARIO,FOOD_WORLD_SCENARIO]){
    const war=createWorldWar(null,scenario),seen=new Set(),owners=new Set(),routes=new Set();let later=false,retreat=false;
    for(let day=1;day<=65&&!war.snapshot().winner;day++){
      war.advance();const state=war.snapshot(),before=structuredClone(state),columns=campaignColumns(state,war.clock(),resolve);
      assert.deepEqual(columns.map(c=>c.id).sort((a,b)=>a-b),moving(state).map(a=>a.id).sort((a,b)=>a-b),'Every moving army, without a first-army or first-route exception');
      for(const column of columns){
        const army=state.armies.find(a=>a.id===column.id);seen.add(army.id);owners.add(army.owner);routes.add(army.from+'>'+army.to);
        later ||= army.departed>8;retreat ||= army.status==='retreating';
        assert.equal(column.owner,army.owner);assert.equal(column.strength,army.strength);
        assert(column.count>=1&&column.count<=8,'A bounded representative squad, independent of total army size');
        assert(Number.isFinite(column.location.x)&&Number.isFinite(column.location.z),'Finite physical position');
      }
      assert.deepEqual(state,before,'Presentation does not spend supplies, issue orders, or resolve battles');
    }
    assert.deepEqual([...owners].sort(),['east','west']);assert(later&&retreat);assert(seen.size>=5);assert(routes.size>=5);
  }
});

test('later armies follow fractional campaign time and replay the same location',()=>{
  const war=createWorldWar(null,FOOD_WORLD_SCENARIO);war.advance(14);
  const clock=war.clock(),before=war.snapshot(),at=campaignColumns(before,{...clock,fraction:0},resolve),later=campaignColumns(before,{...clock,fraction:15},resolve);
  assert(at.some(c=>c.owner==='east')&&at.some(c=>c.owner==='west'),'Concurrent later opposing armies');
  for(const start of at){
    const end=later.find(c=>c.id===start.id);
    assert(Math.hypot(end.location.x-start.location.x,end.location.z-start.location.z)>.1,'Fractional time moves each army');
  }
  war.resetPhase(15);const restored=createWorldWar(war.checkpoint());
  assert.deepEqual(campaignColumns(restored.snapshot(),restored.clock(),resolve),later,'Continue preserves each army position exactly');
  war.pause();war.tick(1,true);assert.deepEqual(campaignColumns(war.snapshot(),war.clock(),resolve),later,'Paused campaign cannot move its columns');
  assert.deepEqual(war.snapshot(),before,'Rendering and fractional motion never change strength or orders');
});

test('route traversal clamps endpoints and follows its own direction for reverse marches',()=>{
  const route=resolve('caricas','nethereum'),start=columnRoadPoint(-10,route),end=columnRoadPoint(route.length+10,route);
  assert.equal(start.x,route.points[0].x);assert.equal(start.z,route.points[0].z);
  assert.equal(end.x,route.points.at(-1).x);assert.equal(end.z,route.points.at(-1).z);
  for(let distance=0;distance<route.length;distance+=3){const p=columnRoadPoint(distance,route);assert([p.x,p.z,p.yaw].every(Number.isFinite));}
});

test('stationed, engaged and destroyed armies do not retain marching projections',()=>{
  const war=createWorldWar(null,FOOD_WORLD_SCENARIO);war.advance(14);
  for(const status of ['ready','recovering','engaged','destroyed']){
    const state=war.snapshot();for(const army of state.armies)army.status=status;
    assert.deepEqual(campaignColumns(state,war.clock(),resolve),[],status);
  }
});

test('day 26 retreat convoy keeps distinct stable slots after culling, settlement and replay',()=>{
  const war=createWorldWar(null,FOOD_WORLD_SCENARIO);war.advance(26);
  const state=war.snapshot(),clock=war.clock(),straight=()=>({points:[{x:0,z:0},{x:0,z:1000}],length:1000});
  const project=s=>campaignColumns(s,clock,straight).filter(c=>c.owner==='east'&&c.from==='nesdor'&&c.to==='ovesos');
  const columns=project(state);
  assert.deepEqual(columns.map(c=>c.id),[1,4,7]);assert.deepEqual(columns.map(c=>c.convoySlot),[0,1,2]);
  for(let i=1;i<columns.length;i++)assert(Math.abs(columns[i-1].distance-columns[i].distance-32)<1e-8,'Separate standards and troop groups along their actual route');
  const changed=structuredClone(state);changed.armies=changed.armies.filter(a=>a.id!==1);changed.armies.find(a=>a.id===4).status='ready';
  assert.deepEqual(project(changed).find(c=>c.id===7),columns[2],'Historical convoy membership survives settlement/removal of earlier armies');
  assert.deepEqual(project({...state,armies:[...state.armies].reverse()}).sort((a,b)=>a.id-b.id),columns,'Renderer ordering cannot reshuffle a convoy');
  assert.deepEqual(project(createWorldWar(war.checkpoint()).snapshot()),columns,'Save/replay retains order cohort and positions');
});

test('convoy spacing remains continuous when a roadside success delays one order',()=>{
  const war=createWorldWar(null,FOOD_WORLD_SCENARIO);war.advance(26);
  const state=war.snapshot(),clock={...war.clock(),fraction:15},straight=()=>({points:[{x:0,z:0},{x:0,z:1000}],length:1000});
  const original=campaignColumns(state,clock,straight),army=state.armies.find(a=>a.id===1);
  army.roadside={order:`${army.id}:${army.from}:${army.to}:${army.departed}`,day:26,fraction:.5,originalArrives:army.arrives,delay:1};army.arrives++;
  const delayed=campaignColumns(state,clock,straight);
  for(const before of original){const after=delayed.find(c=>c.id===before.id);assert.deepEqual(after.location,before.location);assert.equal(after.distance,before.distance);}
  const later=campaignColumns({...state,day:27},{...clock,fraction:0},straight).find(c=>c.id===1);
  assert(later.distance>delayed.find(c=>c.id===1).distance,'Delayed army continues forward from its physical contact');
});

test('an unavailable physical route keeps one permitted last-known marker without phantom soldiers or roadside contact',async()=>{
  const THREE=await sourceModule('../vendor/three.module.js');
  const {createMarchingColumns}=await sourceModule('../src/app/exploration/war-columns-view.js');
  const origin={x:-2650,z:289},destination={x:-2092,z:231};
  // Two dry assembly areas separated by deep water: no bridge or route exists.
  const world={bounds:{minX:-3050,maxX:-1230,minZ:-270,maxZ:1030},colliders:[],readyAt:()=>true,waterAt:()=>0,
    heightAt:(x,z)=>[origin,destination].some(p=>Math.hypot(x-p.x,z-p.z)<16)?2:-20};
  const war=createWorldWar(),state=war.advance(2),army={id:42,name:'Western test column',owner:'west',strength:48,status:'marching',from:'nethereum',to:'caricas',departed:1,arrives:3};
  state.armies=[army];state.events=[];const before=structuredClone(state),view=createMarchingColumns(new THREE.Scene(),world);
  try{
    view.update(state,{...war.clock(),fraction:15},origin,()=>true,.1,true);
    const model=view.target(army.id);assert(model?.pendingRoute);assert.deepEqual({x:model.location.x,z:model.location.z},origin);
    assert.equal(model.visible,false);assert.equal(model.contactEligible,false);assert.deepEqual(model.soldiers,[]);assert.equal(view.state().actors,0);
    const columns=view.targets().map(c=>({...c,atlas:{x:c.location.x,y:c.location.z}}));
    const markers=withColumnPosition(worldWarArmies(state,WORLD_WAR_SCENARIO,()=>true,war.clock(),columns),columns,()=>true,(x,z)=>({x,y:z}));
    assert.equal(markers.length,1);assert.equal(markers[0].x,origin.x);assert.equal(markers[0].y,origin.z);
    assert.equal(markers[0].physical,false);assert.equal(markers[0].pendingRoute,true);assert.equal(markers[0].route,null);
    assert.match(markers[0].detail,/last known at the Nethereum assembly point/);
    assert.deepEqual(worldWarArmies(state,WORLD_WAR_SCENARIO,()=>false,war.clock(),columns),[],'Staging never reveals an unknown army');
    assert.deepEqual(state,before,'Staging cannot delay a real order or spend any supplies');
  }finally{view.dispose();}
});
