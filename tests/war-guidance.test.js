import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorldWar,WORLD_WAR_SCENARIO} from '../src/app/exploration/world-war.js';
import {withColumnPosition,worldWarArmies} from '../src/app/exploration/war-armies.js';
import {openingWarGuidance,openingArmyTarget,guidanceScreenPoint} from '../src/app/exploration/war-guidance.js';
import {trackedWarTarget} from '../src/app/exploration/war-tracking.js';
import {savedWarNavigation,validWarNavigation} from '../src/app/exploration/war-navigation-state.js';
import {MINORA_COUNCIL} from '../src/content/regions/minora-frontier/minora-council.js';
import {ovesosColumn,caricasColumn,campaignColumn,columnRoadPoint,COLUMN_LENGTH,OVESOS_COLUMN_ROAD,CARICAS_COLUMN_LENGTH,CARICAS_COLUMN_ROAD} from '../src/app/exploration/war-columns.js';

test('Briefing starts with real marching orders; repeated begin and replay do not add a day',()=>{
  const war=createWorldWar();assert.equal(war.snapshot().day,0);war.begin();
  assert.equal(war.snapshot().day,1);assert.ok(war.snapshot().armies.some(a=>a.status==='marching'&&a.to==='caricas'&&a.owner==='west'&&a.arrives===3));
  const state=war.snapshot();war.begin();assert.deepEqual(war.snapshot(),state);
  const restored=createWorldWar(war.checkpoint());assert.deepEqual(restored.snapshot(),state);
  restored.begin();assert.deepEqual(restored.snapshot(),state);assert.equal(restored.clock().running,true);
  war.tick(1,false);assert.equal(war.clock().fraction,0,'Dialogue cannot consume the travel window');
});

test('Continue restores the chosen destination or an explicitly stopped guide',()=>{
  for(const navigation of [{kind:'army',id:3},{kind:'battle',id:'caricas-1'},{kind:'opening',id:'mayor'},{kind:'opening',id:'temple'},null]){
    assert.equal(validWarNavigation(navigation),true);
    assert.deepEqual(savedWarNavigation({navigation,riding:{owned:true}}),navigation);
  }
  assert.deepEqual(savedWarNavigation(null),{kind:'opening',id:'bear'});
  assert.equal(savedWarNavigation({riding:{owned:true}}),null,'Old saves do not repeat the completed horse handoff');
  assert.equal(savedWarNavigation({navigation:{kind:'opening',id:'bear'},afterlife:{inLimbo:true}}),null);
  assert.deepEqual(savedWarNavigation({navigation:{kind:'opening',id:'temple'},afterlife:{death:{},inLimbo:false}}),{kind:'opening',id:'temple'},'A recovered character can keep a new destination');
  for(const invalid of [{kind:'army',id:3,x:4},{kind:'opening',id:'unknown'},{kind:'battle',id:''},{kind:'battle',id:-1},[]])assert.equal(validWarNavigation(invalid),false);
});

test('Horse and council guidance point directly to the useful destination',()=>{
  const horse={x:20,z:40};
  assert.deepEqual(openingWarGuidance('bear',{owned:true,horse}).location,horse);
  assert.equal(openingWarGuidance('bear',{owned:true,horse,mounted:true}).location,null);
  for(const id of ['mayor','temple']){
    const guide=openingWarGuidance(id,{owned:true});
    assert.deepEqual(guide.location,MINORA_COUNCIL[id].exit);
    assert.equal(guide.council,true);assert.match(guide.detail,/commits you to nothing/);
  }
});

test('The optional guide selects the army itself, then its real battle, without route waypoints',()=>{
  const war=createWorldWar();war.begin();
  assert.match(openingWarGuidance('bear',{owned:false}).label,/Bear/);
  assert.equal(openingWarGuidance('bear',{owned:true}).offer,true);
  assert.equal(openingWarGuidance(null,{owned:true}),null,'Stop does not select another objective');
  const marks=()=>worldWarArmies(war.snapshot(),WORLD_WAR_SCENARIO,()=>true,war.clock());
  const resolve=target=>trackedWarTarget(target,war.snapshot(),WORLD_WAR_SCENARIO,marks(),()=>true,(x,y)=>({x,z:y}));
  const target=openingArmyTarget(war.snapshot(),marks(),()=>true),before=war.snapshot();
  assert.equal(target.kind,'army');
  let guide=resolve(target),army=marks().find(a=>a.id===target.id);
  assert.deepEqual(guide.location,{x:army.x,z:army.y});assert.equal(guide.via,undefined);
  assert.equal(openingArmyTarget(war.snapshot(),[],()=>false),null,'No undiscovered force disclosed');
  assert.deepEqual(war.snapshot(),before,'Selection never changes the campaign');
  war.advance(2);guide=resolve(target);assert.match(guide.label,/Battle at Caricas/);
  assert.deepEqual(openingArmyTarget(war.snapshot(),marks(),()=>true),guide.target);
  assert.deepEqual(guide.location,war.snapshot().engagements.find(b=>b.id===guide.target.id).location);
  war.advance(3);assert.equal(resolve(guide.target).location,null,'Expired battle removes its light');
});

test('Army position advances within a campaign day and stays still while paused',()=>{
  const war=createWorldWar();war.begin();
  const marks=()=>worldWarArmies(war.snapshot(),WORLD_WAR_SCENARIO,()=>true,war.clock());
  const target=openingArmyTarget(war.snapshot(),marks(),()=>true),at=()=>marks().find(a=>a.id===target.id);
  const before=at(),campaign=war.snapshot();for(let i=0;i<5;i++)war.tick(1,true);
  assert.notDeepEqual({x:at().x,y:at().y},{x:before.x,y:before.y});assert.deepEqual(war.snapshot(),campaign);
  war.pause();const paused=at();war.tick(1,true);assert.deepEqual(at(),paused);
  assert.deepEqual(worldWarArmies(war.snapshot(),WORLD_WAR_SCENARIO,()=>false,war.clock()),[]);
});

test('Directional pointer keeps offscreen and behind-camera targets on screen',()=>{
  const center=guidanceScreenPoint({x:0,y:0,z:-10},16/9);assert.equal(center.edge,false);
  for(const clip of [{x:200,y:0,z:-10},{x:-200,y:0,z:-10},{x:0,y:300,z:-10},{x:0,y:0,z:10},{x:0,y:0,z:0}]){
    const p=guidanceScreenPoint(clip,16/9);assert.equal(p.edge,true);assert.ok(Number.isFinite(p.angle));assert.ok(Math.abs(p.x)<=.781&&Math.abs(p.y)<=.601);
  }
});

test('Caricas guide offers the second fight and reports completion only after the actual outcome',()=>{
  const war=createWorldWar();war.advance(3);war.syncRegion('Caricas');
  const b=war.snapshot().engagements.find(b=>b.region==='caricas'),position=b.location;
  const guide=()=>trackedWarTarget({kind:'battle',id:b.id},war.snapshot(),WORLD_WAR_SCENARIO,[],()=>true,(x,y)=>({x,z:y}));
  war.campaign.joinBattle(b.id,position);war.campaign.resolveEncounter(b.id,'west','success','vanguard-broken',3);
  assert.match(guide().detail,/Final assault available/);assert.deepEqual(guide().location,position);
  war.campaign.joinBattle(b.id,position);war.campaign.resolveEncounter(b.id+':rally','west','success','rally-secured',3);
  assert.equal(guide().location,null);assert.match(guide().detail,/Battle ended/);assert.doesNotMatch(guide().detail,/continues/);
});

test('Column follows campaign time along the authored approach and stops with the battle',()=>{
  const war=createWorldWar();war.begin();assert.equal(ovesosColumn(war.snapshot(),war.clock()),null,'Not yet at the final approach');
  war.advance(2);const start=ovesosColumn(war.snapshot(),war.clock());assert.ok(start);assert.equal(start.distance,0);
  const before=war.snapshot();for(let i=0;i<15;i++)war.tick(1,true);
  const moved=ovesosColumn(war.snapshot(),war.clock());assert.ok(moved.distance>start.distance);assert.deepEqual(war.snapshot(),before,'Presentation cannot change campaign state');
  const paused=structuredClone(moved);war.pause();war.tick(1,true);assert.deepEqual(ovesosColumn(war.snapshot(),war.clock()),paused);
  war.advance(2);const rally=ovesosColumn(war.snapshot(),war.clock());assert.equal(rally.marching,false);assert.equal(rally.distance,COLUMN_LENGTH);assert.ok(rally.count<=8);
  const gone=war.snapshot();gone.armies.find(a=>a.id===rally.id).strength=0;assert.equal(ovesosColumn(gone,war.clock()),null);
  for(let d=0;d<=COLUMN_LENGTH;d+=.5){const p=columnRoadPoint(d);assert.ok([p.x,p.z,p.yaw].every(Number.isFinite));}
  assert.deepEqual({x:columnRoadPoint(-1).x,z:columnRoadPoint(-1).z},OVESOS_COLUMN_ROAD[0]);
});

test('Physical column projection agrees across navigation views without exposing hidden sightings',()=>{
  const armies=[{id:1,x:0,y:0,name:'East',detail:'Estimate'},{id:2,x:3,y:4}],column={id:1,location:{x:20,z:30},strength:61,marching:true,arrives:5};
  const projected=withColumnPosition(armies,column,()=>true,(x,z)=>({x:x/2,y:z/2}));
  assert.equal(projected[0].physical,true);assert.equal(projected[0].x,10);assert.equal(projected[0].y,15);assert.equal(projected[1],armies[1]);
  assert.equal(withColumnPosition(armies,column,()=>false,()=>{throw Error('must not project');}),armies);
  assert.equal(armies[0].x,0,'Original strategic estimates are untouched');
});


test('Nearer Caricas column follows authored farm roads and renders only real West Lizeem troops',()=>{
  const clock={fraction:0,secondsPerDay:30},army={id:'west-column',owner:'west',name:'West Lizeem',strength:64,status:'marching',from:'nethereum',to:'caricas',departed:1,arrives:3};
  const state={day:1,armies:[army],engagements:[]},before=structuredClone(state),start=campaignColumn(state,clock);
  assert.equal(start.route,'caricas');assert.equal(start.owner,'west');assert.equal(start.distance,0);assert.equal(start.count,8);
  assert.deepEqual({x:start.location.x,z:start.location.z},CARICAS_COLUMN_ROAD[0]);
  const moving=caricasColumn(state,{...clock,fraction:15});assert.ok(moving.distance>0&&moving.distance<CARICAS_COLUMN_LENGTH);assert.deepEqual(state,before);
  const paused=caricasColumn(state,clock);assert.deepEqual(paused,start);
  const arrived={...state,day:3,armies:[{...army,status:'engaged'}],engagements:[{id:'caricas-battle',status:'active',region:'caricas',attackingIds:[army.id]}]};
  const end=campaignColumn(arrived,clock);assert.equal(end.marching,false);assert.equal(end.distance,CARICAS_COLUMN_LENGTH);assert.ok(Math.hypot(end.location.x+2092,end.location.z-231)<5);
  const empty={...state,armies:[{...army,strength:0}]};assert.equal(campaignColumn(empty,clock),null);
  for(let d=0;d<=CARICAS_COLUMN_LENGTH;d+=.5){const p=columnRoadPoint(d,'caricas');assert.ok([p.x,p.z,p.yaw].every(Number.isFinite));}
});
