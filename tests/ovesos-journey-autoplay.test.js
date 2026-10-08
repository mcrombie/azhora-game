import test from 'node:test';
import assert from 'node:assert/strict';
import {createOvesosJourneyAutoplay} from '../src/gameplay/autoplay/ovesos-journey-autoplay.js';
import {OVESOS_JOURNEY,ovesosRouteGuide} from '../src/content/scenarios/ovesos-journey.js';
const settle=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
function fixture(prepare=async()=>true){
  let mode='developer',p={...OVESOS_JOURNEY[0]},day=0,encounter=null,tracking=null;
  const calls={ride:0,advance:0,join:0,clear:0,prepare:0,run:0,withdraw:0,speeds:[],messages:[],maps:[]};
  const engagements=[],war={
    state:()=>({campaign:{day,engagements,armies:[{id:42,owner:'east',from:'caricas',to:'ovesos',status:'marching'}]},encounter:{encounter},tracking}),
    advance(n=1){day+=n;calls.advance++;if(day>=5&&!engagements.length)engagements.push({id:2,region:'ovesos',status:'active'});if(day>=8)engagements[0].status='resolved';},
    pause(){},run(){calls.run++;},setSpeed(n){calls.speeds.push(n);},track(target){tracking={target};},
    join(){calls.join++;mode='encounter';return {ok:true};},help(){mode='skirmish';encounter={outcome:null};},
    withdraw(){calls.withdraw++;mode='playing';encounter=null;},
  };
  const driver=createOvesosJourneyAutoplay({war,mode:()=>mode,position:()=>p,
    prepare:async valid=>{calls.prepare++;const ok=await prepare(valid);if(valid())mode='playing';return ok;},
    ride(target){calls.ride++;p={...target};},clearInput(){calls.clear++;},dismount(){},attack(){encounter.outcome='success';},
    resume(){mode='playing';},showMap(stage){calls.maps.push(stage);mode='map';},status(message){calls.messages.push(message);},
  });
  return {driver,calls,war,setMode:v=>{mode=v;},getMode:()=>mode};
}
test('named Ovesos run traverses every waypoint, waits at 20x and resolves at the deadline',async()=>{
  const f=fixture();f.driver.start();await settle();
  assert.deepEqual(f.war.state().tracking.target,{kind:'army',id:42},'Tracks the actual East army even when v6 assigned another army id first');
  f.driver.tick(.04,false);assert.equal(f.calls.ride,0);
  f.setMode('loading');f.driver.tick(20,true);assert(f.driver.state().active);assert.equal(f.calls.ride,0);f.setMode('playing');
  for(let i=0;i<300&&f.driver.state().active;i++)f.driver.tick(.2,true);
  assert.equal(f.calls.ride,OVESOS_JOURNEY.length-1);assert.equal(f.calls.join,1);assert.equal(f.calls.withdraw,1);
  assert.deepEqual(f.calls.maps,['opening','battle','interception','result']);
  assert.deepEqual(f.calls.speeds,[1,20]);assert.equal(f.war.state().campaign.day,8);assert.equal(f.getMode(),'map');
  assert(!f.driver.state().active);assert(f.calls.messages.at(-1).includes('complete'));
});
test('cancelling before or during preparation prevents the fresh run starting later',async()=>{
  let finish,valid;const f=fixture(token=>{valid=token;return new Promise(r=>finish=r);});
  f.driver.start();f.driver.stop();await settle();assert.equal(f.calls.prepare,0);
  f.driver.start();await settle();assert(valid());f.driver.stop();assert(!valid());finish(true);await settle();
  assert.equal(f.calls.run,0);assert.equal(f.calls.advance,0);assert.equal(f.calls.ride,0);
});
test('preparation failure, pause and a missed battle return control without inventing a result',async()=>{
  const failed=fixture(async()=>{throw Error('Terrain unavailable');});failed.driver.start();await settle();
  assert(!failed.driver.state().active);assert.match(failed.calls.messages.at(-1),/Terrain unavailable/);
  const paused=fixture();paused.driver.start();await settle();paused.setMode('pause');paused.driver.tick(.04,true);assert(!paused.driver.state().active);
  const late=fixture();late.driver.start();await settle();late.driver.tick(6,true);late.war.advance(8);late.driver.tick(.04,true);
  assert(!late.driver.state().active);assert.equal(late.calls.join,0);assert.equal(late.calls.withdraw,0);
});
test('route guidance follows the bridges and yields outside its surveyed corridor',()=>{
  const guide=ovesosRouteGuide({x:-2308,z:210});assert.equal(guide.name,"Pilgrims' Bridge");assert.equal(guide.x,-2308);assert.equal(guide.z,299);
  assert.equal(ovesosRouteGuide({x:0,z:0}),null);
});
