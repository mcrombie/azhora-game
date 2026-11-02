import test from 'node:test';
import assert from 'node:assert/strict';
import {createRiverTrafficService} from '../src/content/regions/minora-frontier/river-traffic-service.js';
import {reserveRiverPassage} from '../src/content/regions/minora-frontier/river-traffic-reservation.js';
import {minoraTraderPose} from '../src/content/regions/minora-frontier/minora-river-route.js';
import {passageRoute} from '../src/content/regions/minora-frontier/river-passage.js';
import {createAdventureWar} from '../src/experiments/day-night/opening-war.js';

const firstRoute=passageRoute({id:'minora'},{id:'caricas'});
const secondRoute=passageRoute({id:'caricas'},{id:'nethereum'});
const ambientAt=time=>[0,1].map(index=>minoraTraderPose(time,index));
const close=(actual,expected,message)=>assert.ok(Math.abs(actual-expected)<1e-7,`${message}: ${actual} vs ${expected}`);
function closeShips(actual,expected,message){
  assert.equal(actual.length,expected.length,message);
  for(let i=0;i<actual.length;i++){
    for(const key of ['x','y','z','yaw','speed'])close(actual[i][key],expected[i][key],`${message} / trader ${i} ${key}`);
    assert.equal(actual[i].phase,expected[i].phase,message);
    assert.equal(actual[i].rowing,expected[i].rowing,message);
  }
}
function reserve(service,route,time){
  const plan=service.reserve(route,time);
  assert.ok(plan,'This representative downstream departure has safe holding water');
  return plan;
}

test('river reservations and the resumed ambient phase belong to one scene',()=>{
  const first=createRiverTrafficService(),other=createRiverTrafficService();
  const plan=reserve(first,firstRoute,0),during=plan.clearanceSeconds+5;
  assert.equal(first.state(during).reserved,true);
  assert.deepEqual(other.state(during),{reserved:false,remaining:0});
  assert.deepEqual(other.shipsAt(during),ambientAt(during));
  assert.notDeepEqual(first.shipsAt(during),other.shipsAt(during),'Only the reserving scene yields its traders');

  const after=plan.trafficDuration+20;
  assert.notDeepEqual(first.shipsAt(after),other.shipsAt(after),'The completed reservation retains its own delayed phase');
  const reopened=createRiverTrafficService();
  assert.deepEqual(reopened.state(after),{reserved:false,remaining:0});
  assert.deepEqual(reopened.shipsAt(after),other.shipsAt(after),'A fresh scene inherits neither reservations nor phase offsets');
});

test('returning traders resume ambient traffic continuously and keep moving after settlement',()=>{
  const service=createRiverTrafficService(),plan=reserve(service,firstRoute,0);
  const end=plan.trafficDuration,epsilon=.0001,before=service.shipsAt(end-epsilon);
  assert.equal(service.state(end-epsilon).reserved,true);
  const after=service.shipsAt(end+epsilon);
  assert.deepEqual(service.state(end+epsilon),{reserved:false,remaining:0});
  for(let i=0;i<2;i++){
    assert.ok(Math.hypot(after[i].x-before[i].x,after[i].z-before[i].z)<.001,'Reservation removal cannot teleport a trader');
    assert.ok(Math.abs(Math.atan2(Math.sin(after[i].yaw-before[i].yaw),Math.cos(after[i].yaw-before[i].yaw)))<.001,'Reservation removal preserves heading');
    assert.ok(Math.abs(after[i].speed-before[i].speed)<.001,'Return finishes at ambient speed');
  }
  const resumed=plan.trafficTimeAt(end);
  closeShips(after,ambientAt(resumed+epsilon),'Settlement retains the exact phase at its end, including a late observing frame');
  closeShips(service.shipsAt(end+37.25),ambientAt(resumed+37.25),'Subsequent frames advance the resumed clock normally');
});

test('back-to-back watched and skipped voyages include the pending trader return in identical campaign time',()=>{
  const watched=createRiverTrafficService(),skipped=createRiverTrafficService();
  const liveWar=createAdventureWar(),skipWar=createAdventureWar();
  let now=0;
  function travel(livePlan,skipPlan){
    close(livePlan.duration,skipPlan.duration,'Watching and skipping reserve the same duration');
    const start=now;
    let elapsed=0;
    while(elapsed<livePlan.duration){
      const next=Math.min(livePlan.duration,elapsed+.25),dt=next-elapsed;
      liveWar.advancePassage(dt);watched.shipsAt(start+next);elapsed=next;
    }
    skipWar.advancePassage(skipPlan.duration);now=start+livePlan.duration;
    assert.deepEqual(livePlan.at(livePlan.duration),skipPlan.at(skipPlan.duration));
    assert.deepEqual(watched.shipsAt(now),skipped.shipsAt(now),'Skipping reaches the same trader poses');
    assert.deepEqual(watched.state(now),skipped.state(now));
    assert.deepEqual(liveWar.snapshot(),skipWar.snapshot(),'Campaign events agree after the same elapsed trip time');
    close(liveWar.clock().elapsedSeconds,now,'All passage and clearance time is charged');
  }
  const first=reserve(watched,firstRoute,now),firstSkip=reserve(skipped,firstRoute,now);
  travel(first,firstSkip);
  const pending=first.trafficDuration-first.duration;
  assert.ok(pending>0,'Disembarkation occurs before the trader return is complete');
  close(watched.state(now).remaining,pending,'The return remains reserved after landing');

  // Compare with a departure after that return has already finished. The only
  // extra time for an immediate second booking must be its outstanding return.
  const nextAmbient=first.trafficTimeAt(first.trafficDuration);
  const unqueued=reserveRiverPassage(secondRoute,nextAmbient);
  assert.ok(unqueued,'The next downstream leg also has a safe departure');
  const second=reserve(watched,secondRoute,now),secondSkip=reserve(skipped,secondRoute,now);
  close(second.duration,unqueued.duration+pending,'Queued return is part of the paid voyage');
  close(second.trafficDuration,unqueued.trafficDuration+pending,'Queued return is part of the reservation lifetime');
  close(second.clearanceSeconds,unqueued.clearanceSeconds+pending,'The displayed wait includes the previous return');
  for(const t of [0,pending/2,pending-.001]){
    const passenger=second.at(t),berth=secondRoute.at(0);
    assert.equal(passenger.phase,'waiting');assert.equal(passenger.speed,0);assert.equal(passenger.rowing,false);
    close(passenger.x,berth.x,'Passenger waits at the second berth');close(passenger.z,berth.z,'Passenger waits at the second berth');
    assert.deepEqual(second.shipsAt(t),first.shipsAt(first.duration+t),'Booking again preserves the in-progress return');
  }
  assert.deepEqual(second.at(second.duration),secondRoute.at(secondRoute.duration),'The full queued duration reaches the real destination');
  travel(second,secondSkip);

  const finished=now+second.trafficDuration-second.duration+12;
  for(let t=now;t<finished;t+=.25)watched.shipsAt(t);
  assert.deepEqual(watched.shipsAt(finished),skipped.shipsAt(finished),'Sparse updates also settle the second return at the same phase');
  assert.deepEqual(watched.state(finished),{reserved:false,remaining:0});
  assert.deepEqual(watched.state(finished),skipped.state(finished));
});

test('an unsafe replacement departure leaves the current reservation and its return intact',()=>{
  const service=createRiverTrafficService(),plan=reserve(service,firstRoute,0),now=5;
  const before={state:service.state(now),ships:service.shipsAt(now)};
  // A berth occupied by a trader at the next launch phase cannot be cleared
  // without an initial hull overlap, so this booking must fail transactionally.
  const occupied=minoraTraderPose(plan.trafficTimeAt(plan.trafficDuration),0);
  const berth={...occupied,heading:occupied.yaw,speed:0,rowing:false};
  const blocked={duration:1,fromBerth:berth,toBerth:berth,at:()=>({...berth})};
  const sourceBefore={...berth};
  assert.equal(service.reserve(blocked,now),null);
  assert.deepEqual(berth,sourceBefore,'Planning never mutates the supplied berth');
  assert.deepEqual(service.state(now),before.state,'A failed booking does not cancel or extend the current reservation');
  assert.deepEqual(service.shipsAt(now),before.ships,'A failed booking cannot move the existing traffic');
  assert.deepEqual(service.shipsAt(plan.duration),plan.shipsAt(plan.duration),'The original return still begins on schedule');
  const after=plan.trafficDuration+9;
  closeShips(service.shipsAt(after),ambientAt(plan.trafficTimeAt(plan.trafficDuration)+9),'Failure leaves the eventual ambient phase unchanged');
});

test('rewinding a scene resets pending returns and settled offsets through the same traffic service',()=>{
  const service=createRiverTrafficService(),scene={userData:{lizeemRiverTraffic:service}};
  const observe=service.shipsAt,first=reserve(service,firstRoute,0);
  service.shipsAt(first.duration);
  assert.equal(service.state(first.duration).reserved,true,'The passenger has landed while traders are still returning');

  service.reset();
  assert.equal(scene.userData.lizeemRiverTraffic,service,'Scenery retains the same service reference after loading');
  assert.deepEqual(service.state(0),{reserved:false,remaining:0},'An earlier checkpoint has no outstanding return from the discarded timeline');
  closeShips(observe(0),ambientAt(0),'Existing scenery observers see the reset phase');
  const replay=reserve(scene.userData.lizeemRiverTraffic,firstRoute,0);
  close(replay.duration,first.duration,'Replaying the departure does not pay a phantom queued return');

  const after=replay.trafficDuration+20;
  assert.notDeepEqual(observe(after),ambientAt(after),'A completed trip has an actual phase offset to discard');
  service.reset();
  closeShips(observe(5),ambientAt(5),'Restoring an earlier clock also clears a settled reservation offset');
  assert.deepEqual(service.state(5),{reserved:false,remaining:0});
});
