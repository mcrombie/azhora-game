import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoadsideContact} from '../src/app/exploration/roadside-contact.js';
import {roadsideBrief,roadsideDebrief} from '../src/app/exploration/roadside-presentation.js';
import {withColumnPosition,worldWarArmies} from '../src/app/exploration/war-armies.js';
import {createWorldWar} from '../src/app/exploration/world-war.js';
import {WORLD_WAR_SCENARIO} from '../src/app/exploration/world-war.js';
const column={id:4,from:'caricas',to:'ovesos',departed:12,location:{x:0,z:0},owner:'east'};

test('a declined column stays quiet until the player leaves and approaches again',()=>{
  const contact=createRoadsideContact(),eligible=c=>c.owner==='east',at={x:10,z:0};
  assert.equal(contact.update([column],at,eligible),column);
  assert.equal(contact.update([column],at,eligible),null);
  assert.equal(contact.update([column],at,eligible,false),null);
  assert.equal(contact.update([column],{x:18,z:0},eligible),null);
  assert.equal(contact.update([column],at,eligible),null);
  contact.update([column],{x:24,z:0},eligible);
  assert.equal(contact.update([column],at,eligible),column);
  assert.equal(contact.update([{...column,departed:20}],at,eligible)?.departed,20);
});

test('friendly columns and disabled control never force an encounter',()=>{
  const contact=createRoadsideContact(),at={x:0,z:0};
  assert.equal(contact.update([column],at,()=>false),null);
  assert.equal(contact.update([column],at,()=>true,false),null);
  assert.equal(contact.update([column],at,()=>true),column);
  contact.reset();assert.deepEqual(contact.state().suppressed,[]);
  contact.suppressOrder('4:caricas:ovesos:12');
  assert.equal(contact.update([],at,()=>true,false),null,'Restoring while the route is loading preserves suppression');
  assert.equal(contact.update([column],at,()=>true),null);
});

test('all physical columns replace estimates and obey discovery at their real positions',()=>{
  const state=createWorldWar().advance(2),moving=state.armies.filter(a=>a.status==='marching');
  assert.ok(moving.length>1);
  const cols=moving.map((a,i)=>({...a,location:{x:100+i,z:20},atlas:{x:100+i,y:20},roadName:'farm road',marching:true}));
  const armies=worldWarArmies(state,WORLD_WAR_SCENARIO,p=>p.x>=100&&p.x<103,null,cols);
  const marks=withColumnPosition(armies,cols,()=>true,(x,z)=>({x,y:z}));
  for(const c of cols){const mark=marks.find(a=>a.id===c.id);assert.ok(mark?.physical);assert.equal(mark.x,c.location.x);assert.equal(mark.route,null);}
  assert.equal(worldWarArmies(state,WORLD_WAR_SCENARIO,()=>false,null,cols).length,0);
});

test('roadside briefing and results explain the army effect without claiming a town',()=>{
  const pending={armyName:'Eastern army',attacker:'east',attackers:20,roadside:{strength:12,support:{name:'Ovesos',strength:2}},rally:{guards:3},commanders:{}};
  assert.match(roadsideBrief(pending,{elapsed:true}),/one adventure minute/);
  const result=roadsideDebrief(pending,{outcome:'success',guards:[{hp:0},{hp:0},{hp:10,routed:true}],squad:{routed:1,alliesLost:1}},{sharedOpening:true});
  assert.deepEqual(result.facts.find(f=>f[0]==='Enemy strength'),['Enemy strength','8 removed']);
  assert.deepEqual(result.facts.find(f=>f[0]==='Territory'),['Territory','No town changes hands']);
});
