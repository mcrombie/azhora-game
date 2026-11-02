import test from 'node:test';
import assert from 'node:assert/strict';
import {LIZEEM_PORTS} from '../src/content/regions/minora-frontier/lizeem-passages.js';
import {passageRoute,downstreamPorts} from '../src/content/regions/minora-frontier/river-passage.js';
import {minoraTraderPose} from '../src/content/regions/minora-frontier/minora-river-route.js';
import {PASSAGE_HULL,TRADE_HULL} from '../src/content/regions/minora-frontier/river-navigation.js';
import {reserveRiverPassage,riverVesselsOverlap,riverReservationPoseClear} from '../src/content/regions/minora-frontier/river-traffic-reservation.js';

function verify(reservation,trafficTime){
  assert.ok(reservation,'A bounded clear launch exists for this regression');
  const r=reservation;
  assert.ok(r.clearanceSeconds<=30&&r.clearanceSeconds>0);
  assert.equal(r.duration,r.baseDuration+r.clearanceSeconds);
  assert.equal(r.trafficDuration,r.duration+r.clearanceSeconds+2);
  assert.equal(r.at(r.clearanceSeconds/2).phase,'waiting');
  assert.equal(r.at(r.duration).phase,'moored');
  let previous=[0,1].map(i=>minoraTraderPose(trafficTime,i));
  for(let t=0;t<=r.trafficDuration+.5;t+=.2){
    const passenger=r.at(Math.min(t,r.duration)),ships=r.shipsAt(t);
    assert.equal(ships.length,2);
    assert.ok(!riverVesselsOverlap(ships[0],TRADE_HULL,ships[1],TRADE_HULL,.3),'Traders collide at '+t);
    for(let i=0;i<ships.length;i++){
      const p=ships[i];
      assert.ok(!riverVesselsOverlap(p,TRADE_HULL,passenger,PASSAGE_HULL,.3),'Ferry and trader collide: '+JSON.stringify({t,p,passenger}));
      if(t<=r.clearanceSeconds||t>=r.duration)assert.ok(riverReservationPoseClear(p),'Pull-off/return crosses scenery: '+JSON.stringify({t,p}));
      assert.ok(Math.hypot(p.x-previous[i].x,p.z-previous[i].z)<.65,'Trader teleported: '+JSON.stringify({t,p,previous:previous[i]}));
      const turn=Math.abs(Math.atan2(Math.sin(p.yaw-previous[i].yaw),Math.cos(p.yaw-previous[i].yaw)));
      assert.ok(turn<.25,'Trader changes heading abruptly: '+JSON.stringify({t,p,previous:previous[i]}));
    }
    previous=ships;
  }
  const end=r.trafficDuration+3;
  for(let i=0;i<2;i++){
    const expected=minoraTraderPose(r.trafficTimeAt(end),i),actual=r.shipsAt(end)[i];
    assert.equal(actual.x,expected.x);assert.equal(actual.z,expected.z);assert.equal(actual.yaw,expected.yaw);
  }
  const held=r.shipsAt(r.clearanceSeconds+3);
  assert.deepEqual(r.shipsAt(r.clearanceSeconds+3),held,'Paused timeline does not mutate traffic');
  assert.deepEqual(r.at(r.duration),r.baseRoute.at(r.baseDuration),'Skipping lands at the same berth');
}
test('passenger priority closes the concrete Minora departure collision and returns both barges continuously',()=>{
  const base=passageRoute(LIZEEM_PORTS[0],LIZEEM_PORTS.find(p=>p.id==='caricas'));
  assert.ok(Array.from({length:80},(_,i)=>i*.25).some(t=>riverVesselsOverlap(base.at(t),PASSAGE_HULL,minoraTraderPose(375+t),TRADE_HULL,0)),'Regression really contains the former hull overlap');
  verify(reserveRiverPassage(base,375),375);
});
test('long voyages reserve safe holding water across varied ambient departure phases',()=>{
  const base=passageRoute(LIZEEM_PORTS[0],LIZEEM_PORTS.at(-1));
  for(const phase of [0,90,180,270,450,550])verify(reserveRiverPassage(base,phase),phase);
});
test('all downstream port pairs have bounded departures, arrival and return at representative phases',()=>{
  let index=0;
  for(const from of LIZEEM_PORTS)for(const to of downstreamPorts(from,LIZEEM_PORTS)){
    const phase=(index++*63)%566;
    verify(reserveRiverPassage(passageRoute(from,to),phase),phase);
  }
});
test('an impossibly short clearance budget fails before starting a voyage',()=>{
  const base=passageRoute(LIZEEM_PORTS[0],LIZEEM_PORTS.at(-1));
  assert.equal(reserveRiverPassage(base,375,{maxClearance:.1}),null);
});
