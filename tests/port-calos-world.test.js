import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './module-loader.js';
import * as THREE from '../vendor/three.module.js';
import { regionAt, hexAt, CALOSS, SUVAL_ROAD, calossDistance, landDistance, LUMBER_TOWN } from '../src/region-world.js';
import { groundWithRiver } from '../src/world-terrain.js';
import { canStand, moveCharacter } from '../src/game-state.js';
import { roadRoute } from '../src/autopilot.js';
import { PORT_CALOS, PORT_CALOS_TOWN_CELL, PORT_CALOS_BUILDINGS, PORT_CALOS_PATHS, PORT_CALOS_ROAD, PORT_CALOS_QUAY,
  PORT_CALOS_LANDING, PORT_CALOS_JESS, PORT_CALOS_MOORING, PORT_CALOS_SEA_APPROACH, PORT_CALOS_NPC_POSITIONS,
  portCalosGround, portCalosDeckHeight, inPortCalos } from '../src/port-calos-world.js';

const { createPortCalosScenery } = await sourceModule('../src/port-calos-scenery.js');
const height=(x,z)=>portCalosGround(x,z,groundWithRiver(x,z));
const parent=new THREE.Group(), colliders=[], signs=[];
const scenery=createPortCalosScenery({parent,heightAt:height,colliders,signs:{place:sign=>signs.push(sign)}});

function unblocked(p,radius=.45) {
  return colliders.every(c=>c.r!==undefined ? Math.hypot(p.x-c.x,p.z-c.z)>=c.r+radius :
    Math.hypot(Math.max(0,Math.abs(p.x-c.x)-c.hx),Math.max(0,Math.abs(p.z-c.z)-c.hz))>=radius);
}

test('Port Calos keeps its remaining houses within one land hex and removes the overflow',()=>{
  assert.equal(regionAt(PORT_CALOS.x,PORT_CALOS.z).name,'Luscia');
  assert.equal(PORT_CALOS_BUILDINGS.length,5);
  assert.equal(scenery.metrics.buildings,5);
  assert.ok(scenery.metrics.batches<=8,'the compact harbor remains a small number of static draw calls');
  const cell={q:PORT_CALOS_TOWN_CELL.q,r:PORT_CALOS_TOWN_CELL.r};
  for(const b of PORT_CALOS_BUILDINGS) {
    assert.equal(regionAt(b.x,b.z).name,'Luscia',b.id);
    assert.ok(calossDistance(b.x,b.z)>18,`${b.id} is safely ashore`);
    assert.ok(height(b.x,b.z)>2,`${b.id} sits on dry bank`);
    for(const dx of [-(b.width+1)/2,(b.width+1)/2])for(const dz of [-(b.depth+1)/2,(b.depth+1)/2]){
      const x=b.x+dx*Math.cos(b.yaw)+dz*Math.sin(b.yaw),z=b.z-dx*Math.sin(b.yaw)+dz*Math.cos(b.yaw);
      assert.deepEqual(hexAt(x,z),cell,`${b.id}: roof remains inside the town hex`);
    }
  }
  assert.ok(!colliders.some(c=>c.id==='port-calos-inn'||c.id==='port-calos-chandlery'),'western houses are removed, not relocated');
  assert.equal(inPortCalos(-550,289),false,'western neighboring hex is no longer town clearing');
  assert.equal(portCalosGround(-550,289,4.2),4.2,'western neighboring terrain is not terraced for deleted houses');
  const sign=signs.find(s=>s.label==='Port Calos');
  assert.deepEqual(hexAt(sign.x,sign.z),cell,'town sign stands at the actual town');
  assert.ok(Math.hypot(sign.x-PORT_CALOS.x,sign.z-PORT_CALOS.z)<45,'sign is close to the surviving houses');
});

test('the quay projects into sea water; terracing leaves river and inlet intact',()=>{
  const q=PORT_CALOS_QUAY;
  assert.ok(landDistance(q.head.x,q.head.z)<0,'quay head is over the inlet');
  for(const p of [PORT_CALOS_LANDING,PORT_CALOS_JESS]) {
    assert.equal(portCalosDeckHeight(p.x,p.z),q.deckY);
    assert.ok(unblocked(p),'ferry landing and Jess have room to stand');
  }
  for(const p of [PORT_CALOS_MOORING,PORT_CALOS_SEA_APPROACH]){
    assert.ok(landDistance(p.x,p.z)<0,'boat remains afloat');
    assert.equal(portCalosDeckHeight(p.x,p.z),null);
    assert.equal(portCalosGround(p.x,p.z,-4),-4,'local earthworks leave inlet alone');
  }
  for(let i=1;i<CALOSS.points.length;i++)for(let step=0;step<=12;step++){
    const a=CALOSS.points[i-1],b=CALOSS.points[i],t=step/12,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;
    assert.equal(portCalosGround(x,z,-2),-2,'never dam the river');
  }
});

test('all residents and internal street centerlines clear buildings and working props',()=>{
  for(const [id,p]of Object.entries(PORT_CALOS_NPC_POSITIONS))assert.ok(unblocked(p),`${id} has clear footing`);
  for(const path of PORT_CALOS_PATHS)for(let i=1;i<path.points.length;i++) {
    const a=path.points[i-1],b=path.points[i],steps=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z));
    for(let j=0;j<=steps;j++) {
      const t=j/steps,p={x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t};
      assert.ok(unblocked(p),`${path.id} blocked at ${p.x.toFixed(1)},${p.z.toFixed(1)}`);
    }
  }
});

test('harbor ramp joins dry bank and deck without an abrupt height step',()=>{
  let previous=null;
  for(let x=-450;x<=-410;x+=.5){
    const h=portCalosDeckHeight(x,286)??height(x,286);
    assert.ok(h>2.9);
    if(previous!==null)assert.ok(Math.abs(h-previous)<.16,`cart ramp step at ${x}`);
    previous=h;
  }
  assert.deepEqual(PORT_CALOS_ROAD[0],SUVAL_ROAD[2],'joins the existing Nothom road directly');
  assert.ok(inPortCalos(PORT_CALOS_LANDING.x,PORT_CALOS_LANDING.z));
  assert.equal(inPortCalos(0,0),false);
});

// The full world has trees and other authors' structures, so data-only checks
// cannot prove the ferry-to-road journey works. Exercise the actual built path.
test('the integrated harbor is traversable and connects to Nothom without Drent',async()=>{
  const {createWorld}=await sourceModule('../src/world.js');
  const scene=new THREE.Scene(),world=createWorld(scene);
  for(const p of [PORT_CALOS_LANDING,PORT_CALOS_JESS,...Object.values(PORT_CALOS_NPC_POSITIONS)])
    assert.ok(canStand(p.x,p.z,world,.45),`safe landing/resident ${p.x},${p.z}`);
  const path=world.paths.find(p=>p.some(s=>Math.hypot(s.x-PORT_CALOS_LANDING.x,s.z-PORT_CALOS_LANDING.z)<4));
  assert.ok(path,'quay lane is included on the world chart / route graph');
  for(const authored of PORT_CALOS_PATHS) {
    const start=authored.points[0],end=authored.points.at(-1);
    const built=world.paths.find(p=>Math.hypot(p[0].x-start.x,p[0].z-start.z)<.05 && Math.hypot(p.at(-1).x-end.x,p.at(-1).z-end.z)<.05);
    assert.ok(built,`${authored.id} is included in the built paths`);
    const walker={...built[0]};
    for(const p of built) {
      assert.ok(canStand(p.x,p.z,world,.45),`${authored.id} world road footing ${p.x},${p.z}`);
      moveCharacter(walker,p.x-walker.x,p.z-walker.z,world,.45);
      assert.ok(Math.hypot(walker.x-p.x,walker.z-p.z)<.025,`${authored.id} stopped at ${walker.x.toFixed(2)},${walker.z.toFixed(2)} going to ${p.x.toFixed(2)},${p.z.toFixed(2)}`);
    }
  }
  scene.updateMatrixWorld(true);
  const terrain=[];
  scene.traverse(o=>{if(o.isMesh&&(o.name.startsWith('Terrain ')||o.name==='Whole-world terrain'))terrain.push(o);});
  const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0);
  const visibleGround=(x,z)=>{ray.set(new THREE.Vector3(x,150,z),down);return ray.intersectObjects(terrain,false)[0]?.point.y;};
  for(const p of Object.values(PORT_CALOS_NPC_POSITIONS))if(portCalosDeckHeight(p.x,p.z)===null)
    assert.ok(Math.abs(world.heightAt(p.x,p.z)-visibleGround(p.x,p.z))<.06,`feet meet displayed terrain at ${p.x},${p.z}`);
  const q=PORT_CALOS_QUAY;
  for(let x=q.minX;x<=q.maxX;x+=2)for(let z=q.minZ;z<=q.maxZ;z+=2)
    assert.ok(visibleGround(x,z)<q.deckY-.01,`grass stays beneath quay at ${x},${z}`);
  assert.equal(world.waterAt(PORT_CALOS_MOORING.x,PORT_CALOS_MOORING.z),.45,'boat sits in sea water, not elevated river water');
  const route=roadRoute(world.paths,PORT_CALOS_LANDING,LUMBER_TOWN.square);
  assert.ok(route?.length>2,'Nothom has a road route from the ferry');
  assert.ok(route.every(p=>p.x<-400),'route stays on Luscian side of Drent');
});
