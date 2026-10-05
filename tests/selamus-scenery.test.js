import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule} from './module-loader.js';
import {createWalkSurfaces} from '../src/walk-surfaces.js';
import {createColliderGrid} from '../src/collider-grid.js';
import {canStand} from '../src/game-state.js';
import {SELAMUS,SELAMUS_BUILDINGS,SELAMUS_BRIDGES,SELAMUS_PLAZAS,SELAMUS_CANALS,selamusGround,selamusFloor,selamusPoint} from '../src/selamus-city.js';
const THREE=await sourceModule('../vendor/three.module.js');
const {createSelamusScenerySteps}=await sourceModule('../src/selamus-scenery.js');
const parent=new THREE.Group(),colliders=[],heightAt=(x,z)=>selamusGround(x,z,selamusFloor(x,z));
const steps=createSelamusScenerySteps({parent,heightAt,colliders});let state,yields=0,longest=0;
do{const began=performance.now();state=steps.next();longest=Math.max(longest,performance.now()-began);yields++;}while(!state.done);
const city=state.value;parent.updateMatrixWorld(true);
const surfaces=createWalkSurfaces(city.walkSurfaces,heightAt),grid=createColliderGrid(colliders);
const world={heightAt,colliders,bounds:{minX:-1500,maxX:0,minZ:1800,maxZ:3000},nearColliders:grid.near,waterAt:()=>.45,supportAt:surfaces.supportAt};

test('Selemis builds a coherent unwalled city with bounded batches and distinctive layered landmarks',()=>{
  assert.equal(city.metrics.buildings,SELAMUS_BUILDINGS.length);assert.ok(city.metrics.buildings>=60);
  assert.equal(city.metrics.bridges,8);assert.equal(city.metrics.plazas,3);assert.ok(city.metrics.domes>=7);
  assert.equal(city.metrics.stalls,6);assert.equal(city.metrics.offerings,2);
  assert.ok(city.metrics.windows>500&&city.metrics.arcades>120&&city.metrics.balconies>100);
  assert.ok(yields>SELAMUS_BUILDINGS.length*5,'the leaf yields during construction and merged-buffer finish');
  assert.ok(city.metrics.batches<110,'one merged building plus bounded shared features, not one object per window');
  assert.ok(city.metrics.vertices<1_600_000,'architectural detail stays within a bounded local mesh budget');
  assert.ok(!colliders.some(c=>/fort|defensive|perimeter|wall/.test(c.kind)),'the fleet defends an open waterfront');
  const temple=city.root.children.find(m=>m.userData.selamusBuilding==='selamus-temple'),beacon=city.root.children.find(m=>m.userData.selamusBuilding==='selamus-bell-tower');
  temple.geometry.computeBoundingBox();beacon.geometry.computeBoundingBox();
  assert.ok(temple.geometry.boundingBox.max.y-temple.geometry.boundingBox.min.y>33);
  assert.ok(beacon.geometry.boundingBox.max.y-beacon.geometry.boundingBox.min.y>48);
  for(const mesh of city.root.children){assert.ok(mesh.isMesh);assert.ok(mesh.geometry.attributes.color);assert.ok(Number.isFinite(mesh.geometry.boundingSphere.radius));assert.equal(mesh.material.transparent,false);}
  console.log(JSON.stringify({metrics:city.metrics,colliders:colliders.length,yields,longestLeafStepMs:longest}));
});

test('every bridge uses the actual rendered arch deck as a continuous gentle walking surface',()=>{
  const ray=new THREE.Raycaster(new THREE.Vector3(),new THREE.Vector3(0,-1,0));
  for(const bridge of SELAMUS_BRIDGES){
    const mesh=city.root.children.find(m=>m.userData.selamusBridge===bridge.id),rows=city.walkSurfaces.filter(s=>s.id.startsWith(bridge.id+':'));
    assert.equal(rows.length,24);assert.ok(Math.abs(rows[0].a.y-heightAt(bridge.a.x,bridge.a.z))<.06);assert.ok(Math.abs(rows.at(-1).b.y-heightAt(bridge.b.x,bridge.b.z))<.06);
    for(let j=0;j<rows.length;j++){
      const s=rows[j],length=Math.hypot(s.b.x-s.a.x,s.b.z-s.a.z),grade=Math.abs(s.b.y-s.a.y)/length;
      assert.ok(grade<=.3,`${s.id} grade ${grade}`);if(j)assert.deepEqual(s.a,rows[j-1].b);
      for(const t of [.01,.25,.5,.75,.99]){
        const x=s.a.x+(s.b.x-s.a.x)*t,z=s.a.z+(s.b.z-s.a.z)*t,y=s.a.y+(s.b.y-s.a.y)*t;
        ray.ray.origin.set(x,y+4,z);const hit=ray.intersectObject(mesh,false)[0];assert.ok(hit,`${s.id} lacks a visible top`);assert.ok(Math.abs(hit.point.y-y)<.002,`${s.id} drawn/support mismatch`);
        const support=surfaces.supportAt(x,z,{surfaceId:s.id});assert.ok(Math.abs(support.height-y)<1e-8);
        assert.ok(canStand(x,z,{...world,heightAt:()=>y,feetY:y},.34),`${s.id} blocked by ${grid.near(x,z,.34).map(c=>c.id).join(',')}`);
      }
    }
    // The arched stone underside is above a swimmer/low boat at mid-channel.
    const mid=rows[12].a,dx=(bridge.b.x-bridge.a.x)/Math.hypot(bridge.b.x-bridge.a.x,bridge.b.z-bridge.a.z),dz=(bridge.b.z-bridge.a.z)/Math.hypot(bridge.b.x-bridge.a.x,bridge.b.z-bridge.a.z);
    const across=new THREE.Raycaster(new THREE.Vector3(mid.x-dz*10,.95,mid.z+dx*10),new THREE.Vector3(dz,0,-dx),0,20);
    assert.equal(across.intersectObject(mesh,false).length,0,`${bridge.id} must not form a stone dam`);
  }
});

test('thick quay copings have matching walkable tops and leave the canal waterway open',()=>{
  const ray=new THREE.Raycaster(new THREE.Vector3(),new THREE.Vector3(0,-1,0));
  const rows=city.walkSurfaces.filter(s=>s.id.includes(':quay:'));
  const quaySurfaces=createWalkSurfaces(rows,heightAt);
  assert.equal(rows.length,city.metrics.quaySections);assert.ok(rows.length>400);
  let samples=0,worst=0;
  for(const s of rows){
    assert.equal(s.width,2.6);
    const mesh=city.root.children.find(m=>m.userData.selamusQuay===s.id.split(':quay:')[0]);
    const dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,length=Math.hypot(dx,dz),nx=-dz/length,nz=dx/length;
    for(const t of [.2,.5,.8])for(const offset of [-.65,0,.65]){
      const x=s.a.x+dx*t+nx*offset,z=s.a.z+dz*t+nz*offset,y=s.a.y+(s.b.y-s.a.y)*t;
      ray.ray.origin.set(x,y+2,z);const hit=ray.intersectObject(mesh,false)[0];
      const support=quaySurfaces.supportAt(x,z,{maxY:Infinity,groundSlope:false});
      assert.ok(hit,`${s.id} has no masonry top`);const gap=Math.abs(hit.point.y-support.height);worst=Math.max(worst,gap);
      assert.ok(gap<.02,`${s.id} drawn slab differs from feet by ${gap}`);
      const restored=quaySurfaces.supportAt(x,z,{surfaceId:s.id});assert.ok(Math.abs(restored.height-y)<1e-8);
      samples++;
    }
  }
  for(const canal of SELAMUS_CANALS){
    const mesh=city.root.children.find(m=>m.userData.selamusQuay===canal.id);
    for(let i=1;i<canal.points.length;i++)for(const t of [.1,.3,.5,.7,.9]){
      const a=canal.points[i-1],b=canal.points[i];ray.ray.origin.set(a.x+(b.x-a.x)*t,40,a.z+(b.z-a.z)*t);
      assert.equal(ray.intersectObject(mesh,false).length,0,`${canal.id} quay closes its waterway`);
    }
  }
  console.log(JSON.stringify({quayFootSamples:samples,maxRenderedFootGap:worst}));
});

test('square centers and connecting bridge approaches remain open while solid building cores stop a walker',()=>{
  for(const plaza of SELAMUS_PLAZAS)for(let u=-plaza.width*.36;u<=plaza.width*.36;u+=1.4)for(let v=-plaza.depth*.32;v<=plaza.depth*.32;v+=1.4){
    const p=selamusPoint(plaza.u+u,plaza.v+v);assert.ok(canStand(p.x,p.z,world,.34),`${plaza.id} obstructed at ${p.x},${p.z}`);
  }
  for(const b of SELAMUS_BUILDINGS)assert.ok(!canStand(b.x,b.z,world,.34),`${b.id} has no physical solid core`);
  for(const c of colliders){assert.ok(Number.isFinite(c.minY)&&Number.isFinite(c.maxY)&&c.maxY>c.minY);assert.ok(Number.isFinite(c.r)||(Number.isFinite(c.hx)&&Number.isFinite(c.hz)));}
  for(const mesh of city.root.children.filter(m=>m.userData.selamusFurnishings))for(const p of mesh.userData.contacts){
    assert.ok(Math.abs(p.y-heightAt(p.x,p.z))<=.06,`${mesh.name} has an ungrounded foot`);
  }
});
