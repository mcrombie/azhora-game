import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {sourceModule} from './module-loader.js';
import {assertRegisteredTrees} from './tree-identity-assertions.js';
import {groundWithRiver as ground} from '../src/world/terrain/world-terrain.js';
import {regionAt} from '../src/world/terrain/region-world.js';
import {ibenalWaterAt,IBENAL_TRAILS} from '../src/content/regions/south-ibenal/south-ibenal-world.js';
import {IBEN_TOWN,IBENAL_SETTLEMENTS,ibenBuildings,ibenFields,ibenBoats,ibenDecks,ibenLanes,ibenalSettlementDeckHeight} from '../src/content/regions/ibenal-settlements/ibenal-settlements-layout.js';
import {canStand,moveCharacter} from '../src/gameplay/movement/locomotion.js';
import {travelPlaces} from '../src/dev/tools/testing-travel.js';
import {createWalkSurfaces} from '../src/world/collision/walk-surfaces.js';
const {createIbenalSettlementSteps}=await sourceModule('../src/content/regions/ibenal-settlements/ibenal-settlements-scenery.js');
const built=IBENAL_SETTLEMENTS.map(site=>{
  const root=new THREE.Group(),colliders=[],steps=createIbenalSettlementSteps({parent:root,site,heightAt:ground,colliders});
  let next;do{next=steps.next();}while(!next.done);
  return {site,root,colliders,result:next.value};
});
const heightAt=(x,z)=>ibenalSettlementDeckHeight(x,z)??ground(x,z);
const world={bounds:{minX:-5000,maxX:-3500,minZ:-800,maxZ:1100},heightAt,colliders:built.flatMap(b=>b.colliders)};
const corners=h=>[-.5,.5].flatMap(u=>[-.5,.5].map(v=>({x:h.x+Math.cos(h.yaw)*h.w*u+Math.sin(h.yaw)*h.d*v,z:h.z-Math.sin(h.yaw)*h.w*u+Math.cos(h.yaw)*h.d*v})));

test('Iben and its three southern hamlets have dry building sites and appear in developer travel',()=>{
  for(const site of IBENAL_SETTLEMENTS){
    assert.equal(regionAt(site.x,site.z).id,site.region);
    assert.ok(travelPlaces(regionAt(site.x,site.z).name).some(p=>p.id===site.id),site.name+' in F8');
    assert.ok(canStand(site.x,site.z,world),site.name+' has a clear arrival');
    for(const h of ibenBuildings(site))for(const p of corners(h)){
      assert.ok(ground(p.x,p.z)>.8,h.id+' on dry land');assert.equal(ibenalWaterAt(p.x,p.z),null,h.id+' clear of streams');
    }
  }
});

test('whole farm plots, including their interiors, stay clear of the streams',()=>{
  for(const site of IBENAL_SETTLEMENTS)for(const f of ibenFields(site)){
    for(let u=-f.w/2;u<=f.w/2;u+=.75)for(let v=-f.d/2;v<=f.d/2;v+=.75){
      const x=f.x+Math.cos(f.yaw)*u+Math.sin(f.yaw)*v,z=f.z-Math.sin(f.yaw)*u+Math.cos(f.yaw)*v;
      assert.ok(ground(x,z)>.8,f.id+' dry');assert.equal(ibenalWaterAt(x,z),null,f.id+' does not cross a river');
    }
  }
});

test('the existing corridor and all new landing paths remain passable',()=>{
  const walk=points=>{for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],p={...a};
    moveCharacter(p,b.x-a.x,b.z-a.z,world);
    assert.ok(Math.hypot(p.x-b.x,p.z-b.z)<.07,'route blocked from '+JSON.stringify(a)+' to '+JSON.stringify(b)+' at '+JSON.stringify(p));
  }};
  for(const site of IBENAL_SETTLEMENTS)for(const lane of ibenLanes(site))walk(lane);
  for(const t of IBENAL_TRAILS)walk(t.points);
});

test('landings meet dry banks, decks clear the shore, and the boats have water under their hulls',()=>{
  for(const {site,result}of built){
    const ds=ibenDecks(site),start=ds[0].a;
    assert.ok(Math.abs(start.y-ground(start.x,start.z))<.35,site.id+' deck meets bank');
    const supports=createWalkSurfaces(result.walkSurfaces,ground);
    for(const d of ds){
      const dx=d.b.x-d.a.x,dz=d.b.z-d.a.z,len=Math.hypot(dx,dz);
      for(let i=0;i<=20;i++)for(const u of [-.48,0,.48]){
        const x=d.a.x+dx*i/20+dz/len*u*d.width,z=d.a.z+dz*i/20-dx/len*u*d.width;
        assert.ok(ground(x,z)<d.a.y+.08,d.id+' not buried');assert.equal(supports.supportAt(x,z,{surfaceId:d.id}).height,d.a.y);
      }
    }
    for(const b of ibenBoats(site))for(const p of corners({...b,w:b.beam,d:b.length}))assert.ok(ground(p.x,p.z)<-.45,site.id+' floating hull');
  }
});

test('each settlement batches finite geometry and the hamlets remain small beside Iben',()=>{
  for(const {site,root,result,colliders}of built){
    assert.equal(assertRegisteredTrees(root,colliders).length,site===IBEN_TOWN?4:2);
    let meshes=0,vertices=0;root.traverse(o=>{if(o.isMesh){meshes++;vertices+=o.geometry.attributes.position.count;assert.ok(o.geometry.attributes.position.array.every(Number.isFinite),o.name);}});
    assert.ok(meshes<65);assert.ok(vertices<250000);
    if(site!==IBEN_TOWN){assert.ok(result.metrics.buildings<10);assert.ok(result.metrics.fields>0);}
  }
});
