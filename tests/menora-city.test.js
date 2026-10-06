import test from 'node:test';
import assert from 'node:assert/strict';
import { MENORA, MENORA_BUILDINGS, MENORA_GATES, MENORA_PATHS, MENORA_BRIDGES,
  MENORA_NPC_ANCHORS, MENORA_CAMP, MENORA_GARDENS, LIZEEM_MARKET_STANDS, inMenora, menoraGround, menoraRiverClearance,
  menoraReserved, menoraDeckHeight, menoraBridgeAt, menoraSegmentDistance } from '../src/menora-city.js';
import { ISAREOS_RIVER, LIZEEM, ISAREOS_BECKS, courseDistance } from '../src/west-regions.js';
import { regionAt } from '../src/region-world.js';
import { sourceModule } from './module-loader.js';
import { describeRegion } from '../src/campaign-world.js';
import { SUBREGIONS } from '../src/map-fog.js';

test('Minora occupies the actual Isareos side of the Isa–Lizeem confluence',()=>{
  assert.deepEqual(MENORA.fork,ISAREOS_RIVER.points.at(-1));
  assert.ok(courseDistance(LIZEEM,MENORA.fork.x,MENORA.fork.z)<LIZEEM.maxHalf);
  assert.equal(regionAt(MENORA.x,MENORA.z).name,'Isareos');
  assert.equal(MENORA.region,16);
  assert.ok(MENORA.wallHeight>=16);
  assert.ok(MENORA.towerHeight>100);
  for(const b of MENORA_BUILDINGS){assert.ok(inMenora(b.x,b.z),b.id);assert.equal(regionAt(b.x,b.z).name,'Isareos',b.id);}
});

test('Every Minora building footprint leaves the original rivers and garden beck open',()=>{
  for(const b of MENORA_BUILDINGS)for(let x=-b.width/2;x<=b.width/2;x+=2)for(let z=-b.depth/2;z<=b.depth/2;z+=2)
    assert.ok(menoraRiverClearance(b.x+x,b.z+z)>1.5,`${b.id} overlaps water at ${x},${z}`);
  for(const river of [ISAREOS_RIVER,LIZEEM,...ISAREOS_BECKS])for(const p of river.points)
    assert.equal(menoraGround(p.x,p.z,8.4),8.4,`${river.id} riverbed was altered`);
  assert.equal(menoraGround(-1300,700,33),33);
});

test('City plots leave continuous wide routes from all four gates to the temple and guild',()=>{
  for(const path of MENORA_PATHS)for(let i=1;i<path.points.length;i++) {
    const a=path.points[i-1],b=path.points[i],len=Math.hypot(b.x-a.x,b.z-a.z);
    for(let step=0;step<=len;step++) {
      const x=a.x+(b.x-a.x)*step/len,z=a.z+(b.z-a.z)*step/len;
      for(const home of MENORA_BUILDINGS)assert.ok(Math.abs(x-home.x)>home.width/2+1||Math.abs(z-home.z)>home.depth/2+1,`${path.id} blocked by ${home.id}`);
      assert.ok(menoraReserved(x,z),`${path.id} permits scatter in the lane`);
    }
  }
  assert.equal(MENORA_GATES.length,4);
  for(const gate of MENORA_GATES)assert.ok(gate.width>=12);
});

test('Physical bridge queries cover exactly the visible bridge decks',()=>{
  assert.equal(MENORA_BRIDGES.length,5);
  for(const b of MENORA_BRIDGES) {
    const x=b.axis==='x'?(b.start+b.end)/2:b.x,z=b.axis==='z'?(b.start+b.end)/2:b.z;
    assert.equal(menoraBridgeAt(x,z).id,b.id);
    assert.equal(menoraDeckHeight(x,z),b.deck);
    assert.equal(menoraDeckHeight(x+(b.axis==='z'?b.width:0),z+(b.axis==='x'?b.width:0)),null);
  }
  assert.equal(menoraDeckHeight(MENORA.fork.x,MENORA.fork.z),null);
});

test('Bridge ends meet gently flattened dry shores without a vertical lip',()=>{
  for(const bridge of MENORA_BRIDGES)for(const side of [-1,1]) {
    const along=(side<0?bridge.start:bridge.end)+side*.05;
    const x=bridge.axis==='x'?along:bridge.x,z=bridge.axis==='z'?along:bridge.z;
    assert.ok(menoraRiverClearance(x,z)>17.8,`${bridge.id} ends before the dry bank`);
    for(const base of [14,24])assert.ok(Math.abs(menoraGround(x,z,base)-bridge.deck)<.04,`${bridge.id} has a step at its shore`);
  }
});

test('The named princes have clear separate temple and army meeting places',()=>{
  assert.ok(inMenora(MENORA_NPC_ANCHORS.cedric.x,MENORA_NPC_ANCHORS.cedric.z));
  assert.ok(!inMenora(MENORA_NPC_ANCHORS.wilhelm.x,MENORA_NPC_ANCHORS.wilhelm.z));
  assert.ok(Math.hypot(MENORA_NPC_ANCHORS.cedric.x-MENORA_NPC_ANCHORS.wilhelm.x,MENORA_NPC_ANCHORS.cedric.z-MENORA_NPC_ANCHORS.wilhelm.z)>100);
  for(const anchor of [MENORA_NPC_ANCHORS.cedric,MENORA_NPC_ANCHORS.wilhelm,...MENORA_NPC_ANCHORS.army,...MENORA_NPC_ANCHORS.guards]) {
    assert.ok(menoraRiverClearance(anchor.x,anchor.z)>4);
    for(const b of [...MENORA_BUILDINGS,...MENORA_CAMP.tents])assert.ok(Math.abs(anchor.x-b.x)>b.width/2+1||Math.abs(anchor.z-b.z)>b.depth/2+1);
  }
});

test('The frontier chart distinguishes Imperial Minora and Caricas from independent Yunethre',()=>{
  assert.equal(describeRegion('Isareos').control,'empire');
  assert.equal(describeRegion('Caricas').control,'empire');
  assert.deepEqual(describeRegion('Caricas').arcs,['empire','coalition']);
  assert.equal(describeRegion('Yunethre').control,'yunethre');
  assert.equal(describeRegion('Isareos').settlements[0].name,'Minora');
  assert.ok(describeRegion('Isareos').threats.some(t=>t.id==='centaur-raider'));
  for(const id of ['menora','menora-army-muster','caricas-garrison-town','yunethre-free-town','yunethre-centaur-camp'])
    assert.equal(SUBREGIONS.filter(s=>s.id===id).length,1,id);
});

test('Rendered gates, bridge approaches and character anchors have real collision clearance',async()=>{
  const THREE=await sourceModule('../vendor/three.module.js');
  const {createMenoraScenery}=await sourceModule('../src/menora-scenery.js');
  const parent=new THREE.Group(),colliders=[];
  const scene=createMenoraScenery({parent,colliders,heightAt:(x,z)=>menoraGround(x,z,21.3)});
  assert.equal(scene.metrics.buildings,MENORA_BUILDINGS.length);
  assert.equal(scene.metrics.bridges,5);assert.equal(scene.metrics.tents,6);assert.equal(scene.metrics.stalls,LIZEEM_MARKET_STANDS.length);
  assert.ok(scene.metrics.batches<65);assert.ok(scene.metrics.vertices<250000);
  const blocked=(x,z)=>colliders.find(c=>c.minY<=22.9&&c.maxY>=21.3&&(c.r!==undefined
    ?Math.hypot(x-c.x,z-c.z)<c.r+.55:Math.abs(x-c.x)<c.hx+.55&&Math.abs(z-c.z)<c.hz+.55));
  for(const point of [MENORA.arrival,...MENORA_GATES,MENORA_NPC_ANCHORS.cedric,MENORA_NPC_ANCHORS.wilhelm,...MENORA_NPC_ANCHORS.army,...MENORA_NPC_ANCHORS.guards,...LIZEEM_MARKET_STANDS])
    assert.equal(blocked(point.x,point.z),undefined,`${point.id??'character anchor'} blocked`);
  for(const path of MENORA_PATHS)for(let i=1;i<path.points.length;i++) {
    const a=path.points[i-1],b=path.points[i],len=Math.hypot(b.x-a.x,b.z-a.z);
    for(let k=0;k<=len;k+=1.5){const x=a.x+(b.x-a.x)*k/len,z=a.z+(b.z-a.z)*k/len,c=blocked(x,z);assert.equal(c,undefined,`${path.id} at ${x},${z} blocked by ${c?.id??c?.kind}`);}
  }
});

test('The factors’ market corner stands by the plaza on dry open ground, off the lanes, each factor behind his counter',()=>{
  assert.equal(LIZEEM_MARKET_STANDS.length,4);
  assert.deepEqual(LIZEEM_MARKET_STANDS.map(s=>s.country).sort(),['Caricas','Nesdor','Nethereum','Ovesos']);
  for(const s of LIZEEM_MARKET_STANDS) {
    const {x,z,width,depth}=s.stall,corners=[[-1,-1],[-1,1],[1,-1],[1,1]].map(([a,b])=>({x:x+a*width/2,z:z+b*depth/2}));
    assert.ok(inMenora(s.x,s.z),s.id);
    assert.ok(Math.hypot(x+2370,z-152)<16,`${s.id} is at the plaza`);
    for(const p of [s,...corners])assert.ok(menoraRiverClearance(p.x,p.z)>4,`${s.id} is too near water`);
    for(const b of [...MENORA_BUILDINGS,...MENORA_CAMP.tents]) {
      assert.ok(Math.abs(s.x-b.x)>b.width/2+1||Math.abs(s.z-b.z)>b.depth/2+1,`${s.id} stands within a metre of ${b.id}`);
      assert.ok(Math.abs(x-b.x)>(b.width+width)/2+1||Math.abs(z-b.z)>(b.depth+depth)/2+1,`${s.id}'s stall is within a metre of ${b.id}`);
    }
    for(const g of MENORA_GARDENS)assert.ok(Math.abs(x-g.x)>(g.width+width)/2||Math.abs(z-g.z)>(g.depth+depth)/2,`${s.id}'s stall is in a garden`);
    for(const path of MENORA_PATHS)for(let i=1;i<path.points.length;i++)for(const p of [s,...corners])
      assert.ok(menoraSegmentDistance(p.x,p.z,path.points[i-1],path.points[i])>path.width/2,`${s.id} is in ${path.id}`);
    // Behind the counter and facing the street: a step forward from the stand is a step toward the Temple Way.
    const ahead={x:s.x+Math.sin(s.yaw),z:s.z+Math.cos(s.yaw)},way=MENORA_PATHS.find(p=>p.id==='menora-temple-way');
    const toWay=p=>Math.min(...way.points.slice(1).map((b,i)=>menoraSegmentDistance(p.x,p.z,way.points[i],b)));
    assert.ok(toWay(ahead)<toWay(s),`${s.id} faces away from the street`);
    assert.ok(Math.abs(s.z-z)<depth/2,`${s.id} stands under his own awning`);
  }
  for(const [i,a] of LIZEEM_MARKET_STANDS.entries())for(const b of LIZEEM_MARKET_STANDS.slice(i+1))
    assert.ok(Math.abs(a.stall.x-b.stall.x)>(a.stall.width+b.stall.width)/2||Math.abs(a.stall.z-b.stall.z)>(a.stall.depth+b.stall.depth)/2,`${a.id} overlaps ${b.id}`);
});
