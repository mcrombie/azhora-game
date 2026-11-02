import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule} from './module-loader.js';
import * as THREE from '../vendor/three.module.js';
const layout=await sourceModule('../src/content/regions/lond/lond-layout.js');
const country=await sourceModule('../src/content/regions/lond/lond-country.js');
const outer=await sourceModule('../src/content/regions/outer-regions/outer-regions-world.js');
const {groundWithRiver}=await sourceModule('../src/world/terrain/world-terrain.js');
const {createLondScenery}=await sourceModule('../src/content/regions/lond/lond-scenery.js');
const {londTownCorners}=await sourceModule('../src/content/regions/lond/lond-town-architecture.js');
const {atlasCityBoundaries,atlasPlaceMarks,atlasMarkKnown}=await sourceModule('../src/ui/map/world-map-detail.js');
const {TRANSFORM}=await sourceModule('../src/world/terrain/region-world.js');

test('the capital follows the drawn northwest/southeast arrangement without moving rivers',()=>{
  const {STONEFIST:s,LOND_TOWN:t}=layout,p=outer.outerProfile('Central Lond');
  assert.ok(s.x<t.x&&s.z<t.z);assert.ok(p.owns(s.x,s.z)&&p.owns(t.x,t.z));
  assert.equal(outer.outerWaterAt(s.x,s.z),null);
  assert.ok(outer.outerGround(s.x,s.z)>90);
  assert.ok(outer.outerGround(s.x,s.z-33)>125);
  assert.ok(layout.londGround(1000,1000,23)===23);
  // South Lond meets an older terrain family and deliberately retains the
  // supplied full-world sampler. The other four regions can use the local one.
  for(const f of country.LOND_FIELDS.filter((f,i)=>f.region!=='South Lond'&&i%19===0))assert.ok(Math.abs(outer.outerGround(f.x,f.z)-groundWithRiver(f.x,f.z))<.001,'fast regional sampling matches actual ground');
  assert.ok(atlasCityBoundaries().some(b=>b.id==='stonefist'));
  assert.ok(!atlasCityBoundaries().some(b=>b.id==='lond-town'),'unwalled town');
  const marks=atlasPlaceMarks(layout.LOND_LANDMARKS.map(p=>({...p,...TRANSFORM.worldToAtlas(p.x,p.z)})));
  for(const id of ['stonefist','lond-town']){const mark=marks.find(m=>m.id===id);assert.equal(mark.kind,'city');assert.equal(atlasMarkKnown(mark,new Set()),false);assert.equal(atlasMarkKnown(mark,new Set(),true),true);}
});

test('cultivated land dominates Lond while keeping waterways and settlement approaches open',()=>{
  for(const region of layout.LOND_REGIONS){
    const p=outer.outerProfile(region);let dry=0,farmed=0;
    for(let x=p.bounds.minX;x<p.bounds.maxX;x+=15)for(let z=p.bounds.minZ;z<p.bounds.maxZ;z+=15){
      if(!p.owns(x,z)||outer.outerWaterAt(x,z)!==null||layout.londSettlementReserved(x,z))continue;
      dry++;if(country.londFieldAt(x,z))farmed++;
    }
    assert.ok(farmed/dry>.5,region+' majority cultivated: '+farmed/dry);
  }
  for(const f of country.LOND_FIELDS)for(let i=0;i<=6;i++)for(let j=0;j<=6;j++){
    const x=f.x-f.w/2+f.w*i/6,z=f.z-f.d/2+f.d*j/6;
    assert.equal(outer.outerWaterAt(x,z),null,f.id+' dry crop bed');
    assert.ok(!layout.londSettlementReserved(x,z),f.id+' clear approaches');
  }
  for(const b of country.LOND_BUILDINGS)for(const p of londTownCorners(b,.6))assert.equal(outer.outerWaterAt(p.x,p.z),null,b.id+' dry footprint');
  for(const stall of country.LOND_MARKET_STALLS){
    for(const p of londTownCorners(stall))assert.equal(outer.outerWaterAt(p.x,p.z),null,stall.id+' dry market');
    for(const house of country.LOND_BUILDINGS){
      const co=Math.abs(Math.cos(house.yaw)),si=Math.abs(Math.sin(house.yaw)),hx=(house.w*co+house.d*si)/2+.6,hz=(house.d*co+house.w*si)/2+.6;
      assert.ok(Math.abs(stall.x-house.x)>hx+stall.w/2+1||Math.abs(stall.z-house.z)>hz+stall.d/2+1,stall.id+' clear of '+house.id);
    }
  }
});

test('fortress ascent and all three bridge surfaces are continuous and meet dry approaches',()=>{
  const p=layout.STONEFIST_ASCENT;
  for(let i=1;i<p.length;i++){
    const a=p[i-1],b=p[i],distance=Math.hypot(b.x-a.x,b.z-a.z);
    assert.ok(Math.abs(b.y-a.y)/distance<.45);
    for(const t of [0,.25,.5,.75,1]){
      const x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,h=a.y+(b.y-a.y)*t;
      assert.ok(Math.abs(outer.outerGround(x,z)-h)<.05,'ascent has no hidden cliff');
    }
  }
  for(const b of layout.LOND_BRIDGES){
    for(const sign of [-1,1]){const p=layout.bridgePoint(b,sign*b.length/2);assert.equal(outer.outerWaterAt(p.x,p.z),null);assert.ok(Math.abs(layout.londDeckHeight(p.x,p.z)-outer.outerGround(p.x,p.z))<.5,'bridge meets bank');}
    for(let u=-b.length/2;u<=b.length/2;u+=1){const p=layout.bridgePoint(b,u),water=outer.outerWaterAt(p.x,p.z);if(water!==null)assert.ok(layout.londDeckHeight(p.x,p.z)>water+.5,'deck above water');}
  }
});

test('real scenery builds with finite bounded geometry and clear walkways',()=>{
  const parent=new THREE.Group(),colliders=[];
  const built=createLondScenery({parent,heightAt:outer.outerGround,colliders});
  assert.equal(built.metrics.bridges,3);assert.ok(built.metrics.buildings>=25);assert.ok(built.metrics.fortressHalls>=1);
  let vertices=0,meshes=0;
  parent.traverse(m=>{if(m.isMesh){meshes++;vertices+=m.geometry.attributes.position.count;assert.ok(m.geometry.attributes.position.array.every(Number.isFinite),m.name);}});
  assert.ok(meshes<40,'bounded merged batches');assert.ok(vertices<1100000,'bounded initial capital geometry');
  for(const b of layout.LOND_BRIDGES)for(let u=-b.length/2;u<b.length/2;u+=2){const p=layout.bridgePoint(b,u);assert.ok(!colliders.some(c=>p.x>c.minX&&p.x<c.maxX&&p.z>c.minZ&&p.z<c.maxZ),'bridge free of buildings');}
  for(const p of layout.STONEFIST_ASCENT)assert.ok(!colliders.some(c=>p.x>c.minX&&p.x<c.maxX&&p.z>c.minZ&&p.z<c.maxZ),'ascent free of buildings');
});
