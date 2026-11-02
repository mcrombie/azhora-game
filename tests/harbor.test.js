import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule} from './module-loader.js';
import {MINORA_HARBOR as H,minoraHarborHeight,minoraBridgeRailRuns} from '../src/content/regions/minora-frontier/minora-harbor.js';
import {MENORA_BRIDGES,menoraDeckHeight} from '../src/content/regions/minora-frontier/menora-city.js';
import {LIZEEM_PORTS,passageBattle,passageArrival,passageHorseArrival} from '../src/content/regions/minora-frontier/lizeem-passages.js';
import {MINORA_TRADE_ROUTE,MINORA_SHIPPING,minoraTraderPose} from '../src/content/regions/minora-frontier/minora-river-route.js';
import {downstreamPorts,passageRoute} from '../src/content/regions/minora-frontier/river-passage.js';
import {createAdventureWar} from '../src/experiments/day-night/opening-war.js';
import {createWorldWar} from '../src/app/exploration/world-war.js';
import {LIZEEM} from '../src/content/regions/western-regions/west-regions.js';
import {courseBetween} from '../src/content/regions/western-regions/west-ground.js';
import {LIZEEM_BRIDGES} from '../src/content/regions/minora-frontier/lizeem-crossings.js';
const THREE=await sourceModule('../vendor/three.module.js');
const {createMinoraHarbor}=await sourceModule('../src/content/regions/minora-frontier/minora-harbor-scenery.js');

test('All four river towns have fixed passenger landings',()=>{
  assert.deepEqual(LIZEEM_PORTS.map(p=>p.id),['minora','nethereum','caricas','ovesos','nesdor']);
  for(const p of LIZEEM_PORTS){assert.ok(Number.isFinite(p.arrival.x)&&Number.isFinite(p.keeper.z));assert.ok(Math.hypot(p.arrival.x-p.keeper.x,p.arrival.z-p.keeper.z)<=7);}
});

test('passenger service only travels downstream and sails the real navigable river',()=>{
  const home=LIZEEM_PORTS[0];
  assert.deepEqual(downstreamPorts(home,LIZEEM_PORTS).map(p=>p.id),['caricas','nethereum','ovesos','nesdor']);
  for(const from of LIZEEM_PORTS)for(const to of downstreamPorts(from,LIZEEM_PORTS)){
    const route=passageRoute(from,to);assert.ok(route.duration>0);assert.equal(passageRoute(to,from),null);
    for(let t=0;t<=route.duration;t+=.25){
      const p=route.at(t),river=courseBetween(LIZEEM,p.x,p.z);
      assert.ok(Number.isFinite(p.heading)&&Math.abs(p.y-river.surface)<.06,'boat follows water height');
      for(const b of LIZEEM_BRIDGES)if(Math.abs(p.z-b.z)<b.width/2+5.8){
        const span=(b.length-2*b.ramp)/3,u=(p.x-b.x+1.5*span)/span,arch=u-Math.floor(u);
        const clearance=b.y-4.8+4*Math.sin(Math.PI*arch)-p.y;
        assert.ok(clearance>3,'passengers fit below a bridge arch: '+JSON.stringify({p,clearance}));
      }
    }
  }
  assert.deepEqual(downstreamPorts(LIZEEM_PORTS.at(-1),LIZEEM_PORTS),[]);
});

test('live sailing, skipping, and partial skipping spend identical fractional campaign time and replay',()=>{
  for(const port of LIZEEM_PORTS.slice(1)){
    const seconds=passageRoute(LIZEEM_PORTS[0],port).duration,live=createAdventureWar(),skip=createAdventureWar(),partial=createAdventureWar();
    for(const s of [live,skip,partial]){s.advancePassage(37.2);assert.equal(s.clock().running,false);}
    let left=seconds;while(left>1e-8){const dt=Math.min(.25,left);live.advancePassage(dt);left-=dt;}
    skip.advancePassage(seconds);partial.advancePassage(7.25);partial.advancePassage(seconds-7.25);
    assert.ok(Math.abs(live.clock().elapsedSeconds-37.2-seconds)<1e-6);
    assert.deepEqual(skip.snapshot(),live.snapshot());assert.deepEqual(partial.snapshot(),live.snapshot());
    assert.deepEqual(createAdventureWar(skip.checkpoint()).snapshot(),skip.snapshot());
  }
});
test('earlier campaigns also pay identical time for a watched or skipped voyage',()=>{
  for(const speed of [1,4,20]){
    const live=createWorldWar(),skip=createWorldWar();
    for(const s of [live,skip]){s.campaign.watchBattles(false);s.setSpeed(speed);}
    for(let i=0;i<120;i++)live.advancePassage(.25);
    skip.advancePassage(30);
    assert.deepEqual(live.snapshot(),skip.snapshot());assert.deepEqual(live.clock(),skip.clock());
    assert.equal(skip.clock().running,false);
    assert.deepEqual(createWorldWar(skip.checkpoint()).snapshot(),skip.snapshot());
  }
});
test('The White Bridge has a real south parapet opening; other rails stay continuous',()=>{
  for(const b of MENORA_BRIDGES)for(const side of [-1,1]){
    const runs=minoraBridgeRailRuns(b,side);
    assert.equal(runs.length,b.id==='menora-lizeem-bridge'&&side===1?2:1);
    if(runs.length===2)assert.ok(runs.every(([a,c])=>H.x<a||H.x>c));
  }
  assert.equal(minoraHarborHeight(H.x,140),21.3);
  assert.equal(menoraDeckHeight(H.x,156),H.y);
  for(let z=135;z<162;z+=.2)assert.ok(Math.abs(menoraDeckHeight(H.x,z+.2)-menoraDeckHeight(H.x,z))<.06,'Continuous walking slope');
});
test('Harbor planks face upward and match the walking surface along the entire gangway',()=>{
  const parent=new THREE.Group(),colliders=[],harbor=createMinoraHarbor(parent,colliders);parent.updateMatrixWorld(true);
  for(let z=140.2;z<165;z+=.47){
    const h=minoraHarborHeight(H.x,z),ray=new THREE.Raycaster(new THREE.Vector3(H.x,h+3,z),new THREE.Vector3(0,-1,0),0,4),hits=ray.intersectObject(harbor,true);
    assert.ok(hits.some(hit=>Math.abs(hit.point.y-h)<.002),'Visible plank at '+z);
    assert.ok(!colliders.some(c=>Math.abs(H.x-c.x)<c.hx+.4&&Math.abs(z-c.z)<c.hz+.4),'Open access at '+z);
  }
});
test('Guided passage selects safe ground outside battles and never enlists the traveler',()=>{
  const port=LIZEEM_PORTS[2],battle={id:'fight',region:'caricas',status:'active',location:{x:100,z:100},entryRadius:70};
  assert.equal(passageBattle(port,[battle]),battle);
  assert.equal(passageBattle(port,[{...battle,status:'resolved'}]),null);
  assert.equal(passageBattle(port,[{...battle,heroResult:{outcome:'victory'}}]),null);
  const before=JSON.stringify(battle),at=passageArrival(port,{battle,battles:[battle],clear:p=>p.x>100});
  assert.ok(at.x>100);assert.ok(Math.hypot(at.x-100,at.z-100)>74);assert.equal(at.battleId,'fight');assert.equal(JSON.stringify(battle),before);
  assert.equal(passageArrival(port,{battle,battles:[battle],clear:()=>false}),null);
  assert.equal(passageArrival(port,{battle,battles:[battle],clear:()=>true,approachable:()=>false}),null,'A clear landing cannot hide an obstructed approach');
});

test('Trading barge hulls clear the passenger boat and harbor throughout their circuit',()=>{
  for(let time=0;time<MINORA_TRADE_ROUTE.length/MINORA_SHIPPING.speed;time+=.2){
    const p=minoraTraderPose(time);if(p.z<145||p.z>179)continue;
    for(let along=-5;along<=5;along+=1)for(let across=-1.2;across<=1.2;across+=.4){
      const x=p.x+Math.sin(p.yaw)*along+Math.cos(p.yaw)*across,z=p.z+Math.cos(p.yaw)*along-Math.sin(p.yaw)*across;
      assert.ok(Math.abs(x-H.boat.x)>=2.1||Math.abs(z-H.boat.z)>=6.2,'Moored boat clearance');
      assert.ok(Math.abs(x-H.x)>=5.4||Math.abs(z-H.z)>=6.4,'Timber landing clearance');
    }
  }
});
test('Town passage stays near its quay and safely fails if every landing is blocked',()=>{
  const port=LIZEEM_PORTS[1],at=passageArrival(port,{clear:()=>true});assert.equal(at.x,port.arrival.x);assert.equal(at.battleId,null);
  assert.equal(passageArrival(port,{clear:()=>false}),null);
});

test('Horses unload beside or behind the player with terrain and obstacle clearance',()=>{
  for(let heading=0;heading<Math.PI*2;heading+=Math.PI/8){
    const at={x:100,z:-20,heading};
    // First side is steep; the other side is blocked. A rear quarter must work.
    const heightAt=(x,z)=>Math.sin(heading)*(z-at.z)-Math.cos(heading)*(x-at.x)<-3?3:0;
    const clear=p=>Math.sin(heading)*(p.z-at.z)-Math.cos(heading)*(p.x-at.x)<0;
    const p=passageHorseArrival(at,{heightAt,clear});assert.ok(p);
    const dx=p.x-at.x,dz=p.z-at.z;
    assert.ok(dx*Math.sin(heading)+dz*Math.cos(heading)<=1e-6,'Never obstructs the forward approach');
    assert.ok(Math.hypot(dx,dz)>=3.49&&Math.hypot(dx,dz)<=7.01);
    assert.ok(clear(p)&&Math.abs(heightAt(p.x,p.z))<.6);
    assert.equal(passageHorseArrival(at,{heightAt:()=>0,clear:()=>false}),null);
  }
});
