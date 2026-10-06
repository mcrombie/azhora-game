import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { BABON_WILDLIFE_ZONES, BABON_MONITOR_SHOWCASE, babonWildlifeClear } from '../src/content/regions/babon/babon-wildlife.js';
import { babonOwns, babonClear, babonSlope, babonRiverAt, babonWaterAt } from '../src/content/regions/babon/babon-world.js';
import { groundWithRiver } from '../src/world/terrain/world-terrain.js';
import { landDistance, SEA_LEVEL, WORLD_BOUNDS, regionAt } from '../src/world/terrain/region-world.js';
import { canStand } from '../src/gameplay/movement/game-state.js';

const {createWestLife}=await sourceModule('../src/content/regions/western-regions/west-regions-life.js');
const terrestrial=BABON_WILDLIFE_ZONES.filter(z=>!z.air&&!z.sea);
const giants=BABON_WILDLIFE_ZONES.filter(z=>z.territorial);
const actualWaterAt=(x,z)=>Math.max(SEA_LEVEL,babonWaterAt(x,z)??SEA_LEVEL);
const flat={bounds:{minX:-1000,maxX:1000,minZ:-1000,maxZ:1000},heightAt:()=>3,
  renderedGroundHeight:()=>3.18,waterAt:()=>null,colliders:[]};
const testZone=(species,extra={})=>({id:species,species,region:'Babon',radius:1.7,scale:1,
  minX:-55,maxX:55,minZ:-55,maxZ:55,sites:[[0,0]],...extra});
const matrices=scene=>{
  const parts=[];scene.traverse(object=>{if(object.isInstancedMesh)parts.push(object);});return parts;
};
const assertFinite=scene=>{
  const matrix=new THREE.Matrix4();
  for(const mesh of matrices(scene))for(let i=0;i<mesh.count;i++){
    mesh.getMatrixAt(i,matrix);assert.ok(matrix.elements.every(Number.isFinite));assert.ok(matrix.determinant()>0);
  }
};

test('Babon has giant reptile territories, forest browsers, canopy birds and real offshore marine ranges',()=>{
  assert.ok(giants.length>=4&&giants.length<=8,'Large solitary predators need distributed, bounded territories.');
  const species=new Set(BABON_WILDLIFE_ZONES.map(z=>z.species));
  for(const s of ['babon-giant-monitor','babon-canopy-hornbill','boar','dolphin','sea-plunger'])assert.ok(species.has(s),s);
  assert.equal(new Set(BABON_WILDLIFE_ZONES.map(z=>z.id)).size,BABON_WILDLIFE_ZONES.length);
  assert.ok(babonOwns(BABON_MONITOR_SHOWCASE.x,BABON_MONITOR_SHOWCASE.z));
  for(const zone of terrestrial)for(const[x,z]of zone.sites){
    assert.ok(babonOwns(x,z));assert.ok(landDistance(x,z)>26);
    assert.equal(babonRiverAt(x,z,6),null,`${zone.id}: homes need dry banks, not shallow river beds`);
    assert.ok(babonSlope(x,z,groundWithRiver)<zone.maxSlope,zone.id);
    assert.ok(!babonClear(x,z,3),`${zone.id}: homes must leave the natural walking routes open`);
    assert.ok(babonWildlifeClear(x,z));
    assert.ok(Math.hypot(zone.maxX-zone.minX,zone.maxZ-zone.minZ)/2<130);
    if(zone.territorial){assert.ok(zone.radius>1.5);assert.ok(babonWildlifeClear(x+8,z));
      for(let a=0;a<Math.PI*2;a+=Math.PI/4){const px=x+Math.cos(a)*7,pz=z+Math.sin(a)*7;
        assert.equal(babonRiverAt(px,pz,4),null);assert.ok(Math.abs(groundWithRiver(px,pz)-groundWithRiver(x,z))<1.4);}}
  }
  for(const zone of BABON_WILDLIFE_ZONES.filter(z=>z.sea))
    for(let x=zone.minX;x<=zone.maxX;x+=5)for(let z=zone.minZ;z<=zone.maxZ;z+=5){
      assert.ok(landDistance(x,z)<-8);assert.ok(groundWithRiver(x,z)<SEA_LEVEL-.3);
      assert.ok(z<WORLD_BOUNDS.maxZ&&z>WORLD_BOUNDS.minZ&&x>WORLD_BOUNDS.minX&&x<WORLD_BOUNDS.maxX);
    }
  for(const zone of BABON_WILDLIFE_ZONES.filter(z=>z.plunge))for(const[x,z]of zone.sites)
    for(let i=0;i<80;i++){const a=i*Math.PI/40,px=x+Math.sin(a)*zone.circle,pz=z+Math.cos(a)*zone.circle;
      assert.ok(landDistance(px,pz)<-8);assert.ok(groundWithRiver(px,pz)<SEA_LEVEL-.3);assert.ok(pz<WORLD_BOUNDS.maxZ);}
});

test('The giant monitor is a large articulated animal, grounded on the displayed mesh rather than a tiny renamed lizard',()=>{
  const scene=new THREE.Scene(),life=createWestLife(scene,flat,{zones:[testZone('babon-giant-monitor',{territorial:true})]});
  try{
    life.setObserver({x:0,z:8});assertFinite(scene);
    const parts=matrices(scene);assert.equal(parts.length,4,'Body, broad head, four legs and a separate articulated tail.');
    const box=new THREE.Box3(),piece=new THREE.Box3(),matrix=new THREE.Matrix4();let vertices=0;
    for(const mesh of parts){mesh.geometry.computeBoundingBox();vertices+=mesh.geometry.attributes.position.count;
      for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);piece.copy(mesh.geometry.boundingBox).applyMatrix4(matrix);box.union(piece);}}
    const size=box.getSize(new THREE.Vector3());
    assert.ok(Math.hypot(size.x,size.z)>7.5,`${size.x},${size.z}: the reptile must dwarf a human in length`);
    assert.ok(size.y>1.8&&size.y<3.3);assert.ok(vertices<15000,'Shared instanced rigs remain modest.');
    const body=scene.getObjectByName('babon-giant-monitor bodies');body.getMatrixAt(0,matrix);
    assert.ok(Math.abs(matrix.elements[13]-3.18)<.00001);
    assert.equal(life.snapshot().creatures[0].groundY,3,'Visual grounding must not change simulation footing.');
    const tail=scene.getObjectByName('babon-giant-monitor tails');tail.getMatrixAt(0,matrix);const before=matrix.clone();
    for(let i=0;i<45;i++)life.update(1/30,{x:0,z:15});
    tail.getMatrixAt(0,matrix);assert.notDeepEqual(matrix.elements,before.elements,'The muscular tail moves as it stalks.');assertFinite(scene);
  }finally{life.dispose();}
});

test('A giant monitor deliberately approaches, watches and displays instead of scurrying from the traveler',()=>{
  const scene=new THREE.Scene(),life=createWestLife(scene,flat,{zones:[testZone('babon-giant-monitor',{territorial:true})]});
  try{
    const actions=new Set(),start=life.snapshot().creatures[0];let peak=0;
    for(let i=0;i<180;i++){life.update(1/30,{x:0,z:16});const a=life.snapshot().creatures[0];actions.add(a.action);peak=Math.max(peak,a.speed);}
    const approached=life.snapshot().creatures[0];
    assert.ok(actions.has('stalk'));assert.ok(!actions.has('flee'));assert.ok(peak>.4&&peak<1.01);
    assert.ok(Math.hypot(approached.x,approached.z-16)<Math.hypot(start.x,start.z-16)-2);
    const close={x:approached.x,z:approached.z+3};
    for(let i=0;i<60;i++)life.update(1/30,close);
    const display=life.snapshot().creatures[0];assert.equal(display.action,'display');assert.equal(display.speed,0);
    assert.ok(Math.hypot(display.x-approached.x,display.z-approached.z)<.01);assert.ok(!display.hidden);assertFinite(scene);
    life.update(.1,{x:display.x+65,z:display.z});assert.notEqual(life.snapshot().creatures[0].action,'display');
  }finally{life.dispose();}
});

test('Canopy hornbills have complete finite flapping poses above the real Babon ground',()=>{
  const zone=BABON_WILDLIFE_ZONES.find(z=>z.species==='babon-canopy-hornbill');
  const scene=new THREE.Scene(),world={bounds:{minX:-3000,maxX:0,minZ:2400,maxZ:4000},
    heightAt:groundWithRiver,waterAt:actualWaterAt,regionAt,colliders:[]};
  const life=createWestLife(scene,world,{zones:[zone]});
  try{
    for(let i=0;i<600;i++)life.update(1/30,{x:zone.sites[0][0],z:zone.sites[0][1]});
    assertFinite(scene);assert.equal(matrices(scene).length,2,'Body/bill/casque and two animated wings.');
    for(const a of life.snapshot().creatures){assert.ok(babonOwns(a.x,a.z));assert.ok(a.y-groundWithRiver(a.x,a.z)>25);}
  }finally{life.dispose();}
});

test('Actual Babon wildlife homes survive controller placement and their marine animals stay in water through an animation cycle',()=>{
  const world={bounds:{minX:-3000,maxX:0,minZ:2400,maxZ:4000},heightAt:groundWithRiver,
    renderedGroundHeight:groundWithRiver,waterAt:actualWaterAt,regionAt,colliders:[]};
  const scene=new THREE.Scene(),life=createWestLife(scene,world,{zones:BABON_WILDLIFE_ZONES});
  try{
    assert.equal(life.snapshot().creatures.length,BABON_WILDLIFE_ZONES.reduce((n,z)=>n+z.sites.length,0));
    for(const zone of terrestrial)for(const[x,z]of zone.sites)assert.ok(canStand(x,z,world,zone.radius),zone.id);
    for(const zone of BABON_WILDLIFE_ZONES.filter(z=>z.sea||z.plunge)){
      const watch={x:(zone.minX+zone.maxX)/2,z:(zone.minZ+zone.maxZ)/2};
      for(let i=0;i<900;i++){life.update(1/30,watch);if(i%30===0)for(const a of life.snapshot().creatures.filter(a=>a.id.startsWith(zone.id))){
        assert.ok(groundWithRiver(a.x,a.z)<SEA_LEVEL);assert.ok(Number.isFinite(a.y));}}
      assertFinite(scene);
    }
  }finally{life.dispose();}
});
