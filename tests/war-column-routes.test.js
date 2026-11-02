import test from 'node:test';
import assert from 'node:assert/strict';
import {planColumnRoute,columnGroundClear,columnRouteLength,clearColumnPoint,createColumnRoutes} from '../src/app/exploration/war-column-routes.js';
import {LIZEEM_SCENARIO} from '../src/content/scenarios/lizeem.js';
import {westGroundAt,westWaterSurface} from '../src/content/regions/western-regions/west-ground.js';
import {menoraGround,menoraDeckHeight,MENORA_OUTLINE,menoraSegmentDistance} from '../src/content/regions/minora-frontier/menora-city.js';
import {columnTransitAllowed,MINORA_ARMY_CLEARANCE} from '../src/app/exploration/war-column-access.js';
import {REGION_IDS,regionAt} from '../src/world/terrain/region-world.js';
import {LIZEEM_BRIDGES,lizeemBridgeDeckHeight} from '../src/content/regions/minora-frontier/lizeem-crossings.js';

const bounds={minX:-50,maxX:50,minZ:-50,maxZ:50};
const ground={bounds,colliders:[],heightAt:()=>2,waterAt:()=>0,readyAt:()=>true};
function run(world,from,to,options={}){
  const search=planColumnRoute(world,from,to,{bounds,...options});let result;
  for(let i=0;i<100000;i++){result=search.next();if(result.done)return result.value;}
  throw Error('Route search did not respect its node cap');
}
function assertClear(world,points){
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],steps=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.4);
    for(let n=0;n<=steps;n++){const t=n/steps;assert(columnGroundClear(world,{x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t}));}
  }
}

test('march route takes the existing bridge instead of walking through the river',()=>{
  const world={...ground,heightAt:(x,z)=>Math.abs(x)<5&&Math.abs(z-20)>4?-2:2};
  const from={x:-28,z:0},to={x:28,z:0},path=run(world,from,to);
  assert(path);assertClear(world,path);assert(columnRouteLength(path)>56);
  assert(path.some(p=>p.z>=16),'Route reaches the dry crossing');
});

test('march route respects buildings and narrow obstructions between grid points',()=>{
  const world={...ground,colliders:[{x:0,z:0,hx:1.8,hz:20},{x:-12,z:-26,hx:10,hz:.3}]};
  const path=run(world,{x:-32,z:0},{x:32,z:0});assert(path);assertClear(world,path);
  assert(path.some(p=>Math.abs(p.z)>20),'Soldiers go around the wall');
});

test('missing physical crossings produce a finite failed search, not a water route',()=>{
  const world={...ground,heightAt:x=>Math.abs(x)<5?-2:2};
  assert.equal(run(world,{x:-28,z:0},{x:28,z:0},{maxNodes:1500}),null);
});

test('smoothing retains clearance for obstacles between line samples',()=>{
  const world={...ground,colliders:[{x:28/38,z:0,r:.06}]};
  const path=run(world,{x:-28,z:0},{x:28,z:0});
  assert(path);assert(path.length>2,'A thin post between old samples prevents a straight shortcut');
  assertClear(world,path);
});

test('shallow gravel fords remain traversable without allowing a deep river crossing',()=>{
  const world={...ground,heightAt:(x,z)=>Math.abs(x)<5?(Math.abs(z-20)<4?-.8:-2):.8};
  const path=run(world,{x:-28,z:0},{x:28,z:0});assert(path);assertClear(world,path);
  assert(path.some(p=>p.z>=16));assert.equal(columnGroundClear(world,{x:0,z:0}),false);
  assert.equal(columnGroundClear(world,{x:0,z:20}),true);
});

test('streamed scenery clearance moves the shared standard to actual dry ground',()=>{
  const world={...ground,colliders:[{x:0,z:0,r:1.2}]};
  const target=clearColumnPoint(world,{x:0,z:0,yaw:.7},{loaded:true});
  assert(target);assert(columnGroundClear(world,target));assert.equal(target.yaw,.7);
  assert.equal(clearColumnPoint({...world,readyAt:()=>false},{x:0,z:0},{loaded:true}),null);
});

test('armies cannot use neutral Minora even when gates and streets are physically open',()=>{
  const world={...ground,bounds:{minX:-3100,maxX:-1200,minZ:-300,maxZ:1100}};
  for(const at of [{x:-2308,z:60},{x:-2243,z:135},{x:-2308,z:212}]){
    assert.equal(columnGroundClear(world,at),false,'Open city ground is forbidden military transit');
    const corrected=clearColumnPoint(world,at,{reach:16});
    if(corrected)assert(columnTransitAllowed(corrected.x,corrected.z,.4),'Clearance cannot move a standard back inside');
  }
  const path=run(world,{x:-2490,z:100},{x:-2190,z:100},{bounds:world.bounds});
  assert(path);assertClear(world,path);
  assert(path.some(at=>at.z<4||at.z>220),'The route travels around the city walls');
});

test('pending markers use a cached outside assembly even when the farm town landmark is inside Minora',()=>{
  const world={...ground,bounds:{minX:-3100,maxX:-1200,minZ:-300,maxZ:1100},landmarks:[{id:'isareos-town',x:-2308,z:60}]};
  const routes=createColumnRoutes(world);assert.equal(routes.get('isareos','caricas'),null);
  const staging=routes.staging('isareos','caricas');assert(staging?.pendingRoute);assert.equal(staging.length,0);
  assert.equal(staging.points.length,1);assert(columnGroundClear(world,staging.points[0]));
  assert.strictEqual(routes.staging('isareos','nethereum').points[0],staging.points[0],'No repeated radial search per marker frame');
  assert.equal(routes.staging('unknown','caricas'),null);
});

test('regional route cache reuses reverse journeys and has bounded incremental work',()=>{
  const world={...ground,bounds:{minX:-3100,maxX:-1200,minZ:-300,maxZ:1100}};
  const routes=createColumnRoutes(world);assert.equal(routes.get('nethereum','caricas'),null);
  routes.step({budgetMs:100,maxSteps:1});
  assert.equal(routes.state().pending.length,1,'One frame cannot exceed its work cap');
  routes.step({budgetMs:100,maxSteps:100});
  const route=routes.get('nethereum','caricas'),reverse=routes.get('caricas','nethereum');
  assert(route&&reverse);assert.equal(route.length,reverse.length);assert.deepEqual(reverse.points,[...route.points].reverse());
  assert.deepEqual(routes.state().ready,['caricas:nethereum']);assert.equal(routes.state().pending.length,0);
});

test('every campaign link has a real terrain corridor in both directions for original and farming town locations',()=>{
  // These are the shared authored river beds and Minora bridge supports. Native
  // smoke checks separately exercise each world's rendered terrain/colliders.
  const heights=new Map(),heightAt=(x,z)=>{
    const key=x.toFixed(4)+','+z.toFixed(4);if(!heights.has(key))heights.set(key,lizeemBridgeDeckHeight(x,z)??menoraDeckHeight(x,z)??menoraGround(x,z,westGroundAt(x,z)));
    return heights.get(key);
  };
  const foodTowns={isareos:[-2308,60],nethereum:[-2218,388],caricas:[-2098,279],ovesos:[-1910,602],nesdor:[-1578,850]};
  const enabled=['Isareos','Nethereum','Caricas','Ovesos','Nesdor'].map(name=>REGION_IDS[name]);
  for(const food of [false,true]){
    const world={...ground,bounds:{minX:-3050,maxX:-1230,minZ:-270,maxZ:1030},heightAt,waterAt:(x,z)=>westWaterSurface(x,z)??.45,
      canExploreAt:(x,z)=>enabled.includes(regionAt(x,z).id),
      landmarks:food?Object.entries(foodTowns).map(([id,[x,z]])=>({id:id+'-town',x,z})):[]};
    const routes=createColumnRoutes(world);for(const {regions:[a,b]}of LIZEEM_SCENARIO.routes)routes.get(a,b);
    for(let turn=0;turn<500&&routes.state().pending.length;turn++)routes.step({budgetMs:25,maxSteps:1000});
    assert.deepEqual(routes.state().failed,[],JSON.stringify(routes.state()));assert.equal(routes.state().pending.length,0,'Route work has a finite per-order budget');
    for(const {regions:[a,b]}of LIZEEM_SCENARIO.routes){
      const path=routes.get(a,b),reverse=routes.get(b,a);assert(path);assert(path.points.length<256);assert(path.length<4500);
      const bridge=LIZEEM_BRIDGES.find(p=>p.id===`${a}-${b}-bridge`);
      if(bridge){
        assert(path.points.some(p=>Math.abs(p.x-bridge.x)<5&&Math.abs(p.z-bridge.z)<5),'Army uses the actual new bridge');
        assert(path.points.every(p=>p.z>220),'Cross-river marches never detour north of Minora');
        assert(path.length<1600,'Bridge route avoids the former multi-kilometre headwater detour');
      }
      assert.deepEqual(reverse.points,[...path.points].reverse());assert.equal(reverse.length,path.length);
      for(let i=1;i<path.points.length;i++){
        const p=path.points[i-1],q=path.points[i],count=Math.ceil(Math.hypot(q.x-p.x,q.z-p.z));
        for(let n=0;n<=count;n++){const t=n/count,at={x:p.x+(q.x-p.x)*t,z:p.z+(q.z-p.z)*t};
          assert(columnGroundClear(world,at),`${food?'Farming':'Original'} ${a} → ${b} cannot cross deep water at ${JSON.stringify(at)}`);
          assert(columnTransitAllowed(at.x,at.z,.4),'Both routes and their reverse stay outside neutral Minora');
          assert(MENORA_OUTLINE.every((p,i)=>menoraSegmentDistance(at.x,at.z,p,MENORA_OUTLINE[(i+1)%MENORA_OUTLINE.length])>MINORA_ARMY_CLEARANCE),'Columns leave clearance beside the walls');
        }
      }
    }
  }
});
