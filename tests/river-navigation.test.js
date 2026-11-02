import test from 'node:test';
import assert from 'node:assert/strict';
import {LIZEEM_PORTS} from '../src/content/regions/minora-frontier/lizeem-passages.js';
import {passageRoute,downstreamPorts} from '../src/content/regions/minora-frontier/river-passage.js';
import {MINORA_TRADE_ROUTE,MINORA_SHIPPING,minoraTraderPose} from '../src/content/regions/minora-frontier/minora-river-route.js';
import {LIZEEM_BERTHS,PASSAGE_HULL,TRADE_HULL,RIVER_OBSTACLES,RIVER_GUARD_BERTH,riverHullOverlaps,riverHullPoints} from '../src/content/regions/minora-frontier/river-navigation.js';
import {LIZEEM,courseDistance} from '../src/content/regions/western-regions/west-regions.js';
import {courseBetween} from '../src/content/regions/western-regions/west-ground.js';
import {LIZEEM_BRIDGES} from '../src/content/regions/minora-frontier/lizeem-crossings.js';

function checkPose(p,hull,ignore=[]){
  hull={...hull,beam:hull.beam+(p.rowing?2.2:0)};
  const obstacle=RIVER_OBSTACLES.find(o=>!(o.kind==='berth'&&ignore.includes(o.id))&&riverHullOverlaps(p,hull,o));
  assert.ok(!obstacle,JSON.stringify({obstacle,p}));
  for(const v of riverHullPoints(p,hull,.35))assert.ok(courseBetween(LIZEEM,v.x,v.z).half-courseDistance(LIZEEM,v.x,v.z)>.2,'Hull leaves water: '+JSON.stringify({p,v}));
  // Sample the complete rectangular envelope, including the bow while turning;
  // a center-only arch test misses the stern cutting across a pier.
  const heading=p.heading??p.yaw,s=Math.sin(heading),c=Math.cos(heading);
  for(const b of LIZEEM_BRIDGES){
    if(Math.abs(p.z-b.z)>hull.length/2+b.width/2+1)continue;
    for(let along=-hull.length/2;along<=hull.length/2;along+=.5)for(const across of [-hull.beam/2,0,hull.beam/2]){
      const x=p.x+s*along+c*across,z=p.z+c*along-s*across;if(Math.abs(z-b.z)>b.width/2+.4)continue;
      const span=(b.length-2*b.ramp)/3,u=(x-b.x+1.5*span)/span,f=u-Math.floor(u);
      assert.ok(Math.min(f,1-f)*span>1.8,'Hull intersects a bridge footing: '+JSON.stringify({p,x,z,b:b.id}));
      assert.ok(b.y-4.8+4*Math.sin(Math.PI*f)-p.y>hull.airDraft+.3,'Loaded boat exceeds arch clearance: '+JSON.stringify({p,x,z,b:b.id}));
    }
  }
}
test('all five berths sit beside their quay on navigable water',()=>{
  assert.equal(Object.keys(LIZEEM_BERTHS).length,5);
  for(const b of Object.values(LIZEEM_BERTHS))checkPose(b,PASSAGE_HULL,[b.id]);
  for(const v of riverHullPoints(RIVER_GUARD_BERTH,{length:23,beam:5.6}))assert.ok(courseBetween(LIZEEM,v.x,v.z).half-courseDistance(LIZEEM,v.x,v.z)>.2,'Guardship remains afloat');
});
test('the complete ambient circuit clears every quay, berth and bridge with its turning hull',()=>{
  const period=MINORA_TRADE_ROUTE.length/MINORA_SHIPPING.speed;
  for(let t=0;t<period;t+=.15)checkPose(minoraTraderPose(t),TRADE_HULL);
  const a=minoraTraderPose(0),b=minoraTraderPose(period);
  assert.ok(Math.hypot(a.x-b.x,a.z-b.z)<1e-7,'Loop closes without teleporting');
});
test('the two scheduled barges can pass with room for their hulls and working oars',()=>{
  const period=MINORA_TRADE_ROUTE.length/MINORA_SHIPPING.speed;
  for(let t=0;t<period;t+=.1){
    const a=minoraTraderPose(t),b=minoraTraderPose(t,1);if(Math.hypot(a.x-b.x,a.z-b.z)>16)continue;
    const corners=p=>riverHullPoints(p,{...TRADE_HULL,beam:TRADE_HULL.beam+(p.rowing?2.2:0)},.25),aa=corners(a),bb=corners(b);
    // Independent separating-axis check between the two oriented envelopes.
    const separated=[a.yaw,b.yaw].some(yaw=>[[Math.sin(yaw),Math.cos(yaw)],[Math.cos(yaw),-Math.sin(yaw)]].some(([x,z])=>{
      const ap=aa.map(p=>p.x*x+p.z*z),bp=bb.map(p=>p.x*x+p.z*z);
      return Math.max(...ap)<Math.min(...bp)||Math.max(...bp)<Math.min(...ap);
    }));
    assert.ok(separated,'Opposing traffic conflicts: '+JSON.stringify({t,a,b}));
  }
});
test('every downstream passage leaves and reaches the actual berth with a clear swept hull',()=>{
  for(const from of LIZEEM_PORTS)for(const to of downstreamPorts(from,LIZEEM_PORTS)){
    const route=passageRoute(from,to),start=route.at(0),end=route.at(route.duration);
    for(const key of ['x','y','z','heading']){assert.equal(start[key],LIZEEM_BERTHS[from.id][key]);assert.equal(end[key],LIZEEM_BERTHS[to.id][key]);}
    assert.equal(start.speed,0);assert.equal(end.speed,0);assert.equal(end.phase,'moored');assert.equal(end.rowing,false);
    assert.equal(passageRoute(to,from),null);
    let previous=start;
    for(let t=.15;t<route.duration;t+=.15){
      const p=route.at(t);checkPose(p,PASSAGE_HULL,[from.id,to.id]);
      assert.ok(Math.hypot(p.x-previous.x,p.z-previous.z)<=5*.15+.001,'No docking teleport');
      assert.ok(Math.abs(p.speed-previous.speed)<=.61*.15+.001,'Accelerate and brake gently');
      const turn=Math.abs(Math.atan2(Math.sin(p.heading-previous.heading),Math.cos(p.heading-previous.heading)));
      assert.ok(turn<.4*.15+.001,'Turn speed remains modest: '+JSON.stringify({from:from.id,to:to.id,t,turn}));
      previous=p;
    }
    assert.ok(route.at(3).speed<1.3,'Leave moorings slowly');
    assert.ok(route.at(route.duration-3).speed<1.3,'Finish approach slowly');
  }
});
