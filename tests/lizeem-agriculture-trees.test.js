import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule} from './module-loader.js';
import {planLizeemAgricultureTrees,lizeemAgricultureTreeSteps,LIZEEM_TREE_LAND_USES} from '../src/content/regions/minora-frontier/lizeem-agriculture-trees.js';
import {westGroundAt,westWaterSurface} from '../src/content/regions/western-regions/west-ground.js';
import {hexOwnerAt} from '../src/world/terrain/region-world.js';
import {WOOD_SPECIES} from '../src/gameplay/skills/woodcutting/wood-species.js';
import {NESDOR_AGRICULTURE_WOODS,NESDOR_AGRICULTURE_QUAY,nesdorFoodCapacity} from '../src/content/regions/nesdor/nesdor-agriculture.js';
import {CARICAS_AGRICULTURE_WOODS,CARICAS_AGRICULTURE_QUAY,caricasFoodCapacity} from '../src/content/regions/minora-frontier/caricas-agriculture.js';
import {ISAREOS_AGRICULTURE_WOODS,isareosFoodCapacity} from '../src/content/regions/minora-frontier/isareos-agriculture.js';
import {NETHEREUM_WILDLAND,NETHEREUM_QUAY,NETHEREUM_BRIDGES,nethereumFoodCapacity} from '../src/content/regions/nethereum/nethereum-agriculture.js';
import {OVESOS_AGRICULTURE_WILDLAND,OVESOS_AGRICULTURE_QUAY,ovesosFoodCapacity} from '../src/content/regions/oves/ovesos-agriculture.js';
import {MINORA_HARBOR} from '../src/content/regions/minora-frontier/minora-harbor.js';
import {MENORA_BRIDGES} from '../src/content/regions/minora-frontier/menora-city.js';
import {LIZEEM_BRIDGES,LIZEEM_CROSSING_PATHS} from '../src/content/regions/minora-frontier/lizeem-crossings.js';
import {LIZEEM_BATTLEFIELDS} from '../src/content/scenarios/lizeem-battlefields.js';
import {LIZEEM_COLUMN_ASSEMBLY,LIZEEM_ISA_WAY,LIZEEM_WESTERN_WAY,LIZEEM_EASTERN_WAY} from '../src/content/scenarios/lizeem-column-corridors.js';

const woods={isareos:[ISAREOS_AGRICULTURE_WOODS],nethereum:[NETHEREUM_WILDLAND],caricas:[CARICAS_AGRICULTURE_WOODS],ovesos:[OVESOS_AGRICULTURE_WILDLAND],nesdor:NESDOR_AGRICULTURE_WOODS};
const layouts=Object.fromEntries(Object.entries(LIZEEM_TREE_LAND_USES).map(([region,layout])=>[region,{...layout,region,woodlands:woods[region],treeSteps:lizeemAgricultureTreeSteps}]));
const waterAt=(x,z)=>westWaterSurface(x,z)??-Infinity;
const plans=Object.fromEntries(Object.entries(layouts).map(([region,layout])=>[region,planLizeemAgricultureTrees({layout,heightAt:westGroundAt,waterAt})]));
const trees=Object.values(plans).flat();
const lineDistance=(tree,a,b)=>{
  const dx=b.x-a.x,dz=b.z-a.z,projection=Math.max(0,Math.min(1,((tree.x-a.x)*dx+(tree.z-a.z)*dz)/(dx*dx+dz*dz||1)));
  return Math.hypot(tree.x-a.x-projection*dx,tree.z-a.z-projection*dz);
};
function rectGap(t,p){
  const c=Math.cos(p.yaw??0),s=Math.sin(p.yaw??0),x=(t.x-p.x)*c-(t.z-p.z)*s,z=(t.x-p.x)*s+(t.z-p.z)*c;
  return Math.hypot(Math.max(0,Math.abs(x)-p.width/2),Math.max(0,Math.abs(z)-p.depth/2));
}

test('species planting is deterministic, bounded and keeps Nesdor distinctly wooded without changing capacity',()=>{
  const capacities=[isareosFoodCapacity,nethereumFoodCapacity,caricasFoodCapacity,ovesosFoodCapacity,nesdorFoodCapacity];
  const before=capacities.map(f=>f()),fields=JSON.stringify(Object.values(layouts).map(l=>l.farms));
  assert.equal(new Set(trees.map(t=>t.id)).size,trees.length);
  for(const [region,layout] of Object.entries(layouts)){
    assert.deepEqual(planLizeemAgricultureTrees({layout,heightAt:westGroundAt,waterAt}),plans[region]);
    const list=plans[region],banks=list.filter(t=>t.habitat==='riparian'),edges=list.filter(t=>t.habitat==='field-edge');
    assert(banks.length>=35&&banks.length<180,`${region}: a broken river buffer, not continuous woodland`);
    assert(edges.length>=5&&edges.length<=layout.farms.flatMap(f=>f.fields).length*2);
    for(const t of list){assert(WOOD_SPECIES[t.species]);assert.equal(t.region,region);assert.equal(hexOwnerAt(t.x,t.z).toLowerCase(),region);assert(t.locationName);assert.equal(t.harvestable,false);}
  }
  assert(plans.nesdor.filter(t=>t.habitat==='woodland').length>600);
  assert(plans.nesdor.length>3*Math.max(...Object.entries(plans).filter(([r])=>r!=='nesdor').map(([,ts])=>ts.length)));
  assert.equal(JSON.stringify(Object.values(layouts).map(l=>l.farms)),fields);
  assert.deepEqual(capacities.map(f=>f()),before);
});

test('actual canopy footprints leave water, every crop, road, building, quay and bridge clear',()=>{
  const fields=Object.values(layouts).flatMap(l=>l.farms.flatMap(f=>f.fields));
  const buildings=Object.values(layouts).flatMap(l=>l.buildings.map(b=>({x:b.x,z:b.z,width:b.w,depth:b.d})));
  const lanes=Object.values(layouts).flatMap(l=>l.lanes.map(path=>Object.assign(path.map(([x,z])=>({x,z})),{width:4.4}))).concat(LIZEEM_CROSSING_PATHS);
  const quays=[NETHEREUM_QUAY,CARICAS_AGRICULTURE_QUAY,OVESOS_AGRICULTURE_QUAY,NESDOR_AGRICULTURE_QUAY].map(q=>({x:(q.bank+q.end)/2,z:q.z,width:Math.abs(q.end-q.bank),depth:q.width}));
  const bridgeRects=[...MENORA_BRIDGES.map(b=>({x:b.x,z:b.z,width:b.axis==='x'?b.end-b.start:b.width,depth:b.axis==='x'?b.width:b.end-b.start})),
    ...NETHEREUM_BRIDGES.map(b=>({...b,depth:b.length})),...LIZEEM_BRIDGES.map(b=>({x:b.x,z:b.z,width:b.length,depth:b.width}))];
  const h=MINORA_HARBOR;quays.push({x:h.x,z:h.z,width:h.width,depth:h.length},{x:h.ramp.x,z:(h.ramp.start+h.ramp.end)/2,width:h.ramp.width,depth:h.ramp.end-h.ramp.start});
  for(const t of trees){
    for(const obstacle of [...fields,...buildings,...quays,...bridgeRects])assert(rectGap(t,obstacle)>t.crownRadius,`${t.id} crown overlaps infrastructure`);
    for(const path of lanes)for(let i=1;i<path.length;i++)assert(lineDistance(t,path[i-1],path[i])>t.crownRadius+path.width/2,`${t.id} crown enters road`);
    assert.equal(westWaterSurface(t.x,t.z),null);
    for(let ring=1;ring<=2;ring++)for(let i=0;i<32;i++){
      const angle=i*Math.PI/16,x=t.x+Math.cos(angle)*t.crownRadius*ring/2,z=t.z+Math.sin(angle)*t.crownRadius*ring/2;
      assert.equal(westWaterSurface(x,z),null,`${t.id} crown crosses water at ${x},${z}`);
    }
  }
});

test('shared army corridor extraction preserves authored coordinates and room for battle approaches',()=>{
  const pairs=points=>points.map(p=>[p.x,p.z]);
  assert.deepEqual(pairs(LIZEEM_ISA_WAY),[[-2490,-40],[-2670,112],[-2660,190]]);
  assert.deepEqual(pairs(LIZEEM_WESTERN_WAY),[[-2311,443],[-2281,607],[-2190,615],[-2066,614],[-2007,544],[-1962,541]]);
  assert.deepEqual(pairs(LIZEEM_EASTERN_WAY),[[-1950,270],[-1730,260],[-1615,334],[-1550,462],[-1455,565],[-1510,700]]);
  assert.deepEqual(LIZEEM_COLUMN_ASSEMBLY,{isareos:{x:-2464,z:-28},nethereum:{x:-2650,z:289},caricas:{x:-2092,z:231},ovesos:{x:-1905,z:706},nesdor:{x:-1550,z:462}});
  for(const t of trees){
    for(const p of Object.values(LIZEEM_BATTLEFIELDS))assert(Math.hypot(t.x-p.x,t.z-p.z)>84+t.crownRadius);
    for(const path of [LIZEEM_ISA_WAY,LIZEEM_WESTERN_WAY,LIZEEM_EASTERN_WAY])for(let i=1;i<path.length;i++)assert(lineDistance(t,path[i-1],path[i])>7+t.crownRadius);
  }
});

test('reviewed rural geometry registers the exact placed trees and retains a collider for each trunk',async()=>{
  const THREE=await sourceModule('../vendor/three.module.js');
  const {createAgricultureSteps}=await sourceModule('../src/world/scenery/agriculture-scenery.js');
  const {getTreeRegistry}=await sourceModule('../src/world/scenery/tree-registry.js');
  for(const [region,layout] of Object.entries(layouts)){
    const parent=new THREE.Group(),colliders=[],steps=createAgricultureSteps({parent,layout,heightAt:westGroundAt,waterAt,colliders});let next;
    do{next=steps.next();}while(!next.done);
    const registry=getTreeRegistry(colliders),registered=registry.trees;
    assert.equal(registered.length,plans[region].length);assert.equal(next.value.trees,registered.length);
    const planned=new Map(plans[region].map(t=>[t.id,t]));
    for(const t of registered){
      const expected=planned.get(t.id);assert(expected);assert.equal(t.species,expected.species);assert.equal(t.x,expected.x);assert.equal(t.z,expected.z);
      const collider=colliders.find(c=>c.id===t.id);assert(collider);assert.equal(collider.species,t.species);assert(registry.nearest(t,1,p=>p.id===t.id));
    }
    assert.equal(colliders.filter(c=>c.kind==='tree').length,registered.length,'No anonymous rural trunks');
    assert(next.value.treeBatches<160,'Spatial batching stays bounded');
    parent.traverse(o=>{o.geometry?.dispose();if(o.material)o.material.dispose();});
  }
});
