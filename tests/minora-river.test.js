import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule} from './module-loader.js';
import {groundWithRiver} from '../src/world/terrain/world-terrain.js';
import {LIZEEM,courseDistance} from '../src/content/regions/western-regions/west-regions.js';
import {courseBetween} from '../src/content/regions/western-regions/west-ground.js';
import {MENORA_OUTLINE,MENORA_GATES,MENORA_BRIDGES} from '../src/content/regions/minora-frontier/menora-city.js';
import {MINORA_TRADE_ROUTE,MINORA_SHIPPING,MINORA_GUARDSHIP,minoraTraderPose} from '../src/content/regions/minora-frontier/minora-river-route.js';
import {LIZEEM_BRIDGES} from '../src/content/regions/minora-frontier/lizeem-crossings.js';
const THREE=await sourceModule('../vendor/three.module.js');
const {createMenoraScenery}=await sourceModule('../src/content/regions/minora-frontier/menora-scenery.js');
const {snapshotLookoutScene}=await sourceModule('../src/dev/tools/lookout-scene-export.js');
const {createLizeemCrossingSteps}=await sourceModule('../src/content/regions/minora-frontier/lizeem-crossings-scenery.js');
const root=new THREE.Group(),colliders=[],city=createMenoraScenery({parent:root,heightAt:groundWithRiver,colliders});root.updateMatrixWorld(true);

test('Minora riverbank curtains have continuous masonry from water level to the battlements',()=>{
  for(const edge of [3,4]){
    const a=MENORA_OUTLINE[edge],b=MENORA_OUTLINE[edge+1],len=Math.hypot(b.x-a.x,b.z-a.z),dx=(b.x-a.x)/len,dz=(b.z-a.z)/len;
    const wall=root.getObjectByName('Minora white curtain '+edge);
    for(let along=1;along<len-1;along+=2){
      const x=a.x+dx*along,z=a.z+dz*along;
      if(MENORA_GATES.some(g=>Math.hypot(x-g.x,z-g.z)<8.9))continue;
      for(const y of [Math.max(courseBetween(LIZEEM,x,z).surface+.5,groundWithRiver(x,z)+.5),24,33,38]){
        const ray=new THREE.Raycaster(new THREE.Vector3(x+dz*8,y,z-dx*8),new THREE.Vector3(-dz,0,dx),0,16);
        assert.ok(ray.intersectObject(wall).length,`Unsupported wall ${edge} at ${along}, height ${y}`);
      }
    }
  }
});

test('The garden beck retains an open stone arch and all gates remain walkable',()=>{
  const a=MENORA_OUTLINE[6],b=MENORA_OUTLINE[7],len=Math.hypot(b.x-a.x,b.z-a.z),dx=(b.x-a.x)/len,dz=(b.z-a.z)/len;
  const x=a.x+dx*36,z=a.z+dz*36,wall=root.getObjectByName('Minora white curtain 6');
  const rayAt=y=>new THREE.Raycaster(new THREE.Vector3(x+dz*8,y,z-dx*8),new THREE.Vector3(-dz,0,dx),0,16).intersectObject(wall);
  assert.equal(rayAt(20).length,0,'Beck stays open');assert.ok(rayAt(28).length,'Arch supports curtain');
  for(const c of colliders.filter(c=>c.kind==='city-tower'))assert.ok(c.minY<=groundWithRiver(c.x,c.z),'Tower foundation stays solid down to its bed');
  for(const g of MENORA_GATES)assert.ok(!colliders.some(c=>c.kind==='city-wall'&&Math.hypot(c.x-g.x,c.z-g.z)<3),'Gate '+g.id);
});

test('Trading boats complete both directions on water and pass inside separate bridge arches',()=>{
  const bridge=root.getObjectByName('The White Bridge'),piers=Array.from({length:9},(_,i)=>-2258+i*12),lanes=new Set();
  for(let time=0;time<MINORA_TRADE_ROUTE.length/MINORA_SHIPPING.speed;time+=.5){
    const p=minoraTraderPose(time),sin=Math.sin(p.yaw),cos=Math.cos(p.yaw);
    for(const along of [-5,0,5])for(const across of [-1.2,1.2]){
      const x=p.x+sin*along+cos*across,z=p.z+cos*along-sin*across;
      assert.ok(courseBetween(LIZEEM,x,z).half-courseDistance(LIZEEM,x,z)>0,'Hull stays in river');
      if(Math.abs(z-135)<5){
        assert.ok(piers.every(px=>Math.abs(x-px)>1.05),'Hull misses bridge piers');
        const ray=new THREE.Raycaster(new THREE.Vector3(x,p.y+MINORA_SHIPPING.airDraft+.04,z),new THREE.Vector3(0,1,0),0,10),hits=ray.intersectObject(bridge);
        assert.ok(hits.length&&hits[0].distance>.3,'Cargo/canopy clears bridge soffit');lanes.add(p.x<-2210?'west arch':'east arch');
      }
    }
    const next=minoraTraderPose(time+.02);assert.ok(Math.hypot(next.x-p.x,next.z-p.z)<.04,'No loop teleport');
    const guardGap=Math.hypot(p.x-MINORA_GUARDSHIP.x,p.z-MINORA_GUARDSHIP.z);
    if(Math.abs(p.z-MINORA_GUARDSHIP.z)<15)assert.ok(guardGap>5,'Trade lane clears guardship');
  }
  assert.equal(lanes.size,2);
});

test('Three batched ships and their working crews update in place, sleep when hidden, and stay out of the static lookout bake',()=>{
  const traffic=city.riverTraffic,meshes=traffic.root.children;
  assert.equal(meshes.length,3);assert.equal(meshes[1].geometry,meshes[2].geometry);
  const before=traffic.state();traffic.update(20);const after=traffic.state();
  assert.equal(after.drawCalls,6);assert.ok(after.triangles<5000);assert.notDeepEqual(after.positions[1],before.positions[1]);
  assert.deepEqual(after.crews.map(c=>c.crew),[3,2,2]);assert.ok(after.crews.every(c=>c.helmsmen===1));
  const frozen=traffic.state();root.visible=false;traffic.update(80);assert.deepEqual(traffic.state(),frozen);root.visible=true;
  const snapshot=snapshotLookoutScene(traffic.root);assert.equal(snapshot.meshes.length,0,'Live ships must not get baked as duplicates');
  let disposed=0;for(const geometry of new Set(meshes.map(m=>m.geometry)))geometry.addEventListener('dispose',()=>disposed++);
  traffic.dispose();assert.equal(disposed,2);assert.equal(traffic.root.parent,null);
});

test('New Lizeem crossing leaves clearance for the existing trading boats in both directions',()=>{
  const parent=new THREE.Group(),b=LIZEEM_BRIDGES[0];
  for(const _ of createLizeemCrossingSteps({parent,heightAt:groundWithRiver,bridge:b})){}
  parent.updateMatrixWorld(true);let samples=0;
  for(let time=0;time<MINORA_TRADE_ROUTE.length/MINORA_SHIPPING.speed;time+=.25){
    const p=minoraTraderPose(time);if(Math.abs(p.z-b.z)>12)continue;
    const sin=Math.sin(p.yaw),cos=Math.cos(p.yaw);
    for(const along of [-5,0,5])for(const across of [-1.2,1.2]){
      const x=p.x+sin*along+cos*across,z=p.z+cos*along-sin*across;
      if(Math.abs(z-b.z)>b.width/2)continue;
      const above=new THREE.Raycaster(new THREE.Vector3(x,p.y+.1,z),new THREE.Vector3(0,1,0),0,20).intersectObject(parent);
      assert(above.length&&above[0].distance>MINORA_SHIPPING.airDraft+.3,'Barge clears the arch');
      samples++;
    }
  }
  assert(samples>100,'Both shipping lanes cross the bridge during the full circuit');
  assert.equal(parent.children.length,1,'Bridge remains one static draw batch');
});
