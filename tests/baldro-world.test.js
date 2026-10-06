import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BALDRO_CELLS, BALDRO_REGIONS, BALDRO_BOUNDS, BALDRO_KINGDOMS, BALDRO_PATHS, BALDRO_PEAKS, BALDRO_RIVERS,
  baldroOwns, baldroRegionAt, baldroInset, baldroHeight, baldroSurfaceHeight, baldroSlope, baldroWaterAt } from '../src/content/regions/baldro/baldro-world.js';
import { REGION_IDS, REGION_ORDER, REGION_CELLS, WORLD_BOUNDS, hexAt, hexCentre, landDistance } from '../src/world/terrain/region-world.js';
import { LAND_HEXES } from '../src/dev/tools/region-survey.js';
import { WINDOW } from '../scripts/build-region-survey.mjs';
import { groundWithRiver } from '../src/world/terrain/world-terrain.js';
import { CLIMBING, createClimbing, sampleClimbSurface, canWalkSlope } from '../src/gameplay/movement/climbing.js';
import { shouldStartTerrainFall, createTerrainFall } from '../src/gameplay/movement/terrain-fall.js';

const climbingWorld={ heightAt:baldroSurfaceHeight, regionAt:baldroRegionAt,
  waterAt:(x,z)=>baldroWaterAt(x,z)??.06, bounds:BALDRO_BOUNDS, colliders:[] };

test('the Baldro kingdoms append their exact atlas cells without renumbering the existing world',()=>{
  const atlas=JSON.parse(readFileSync(new URL('../assets/azhora-dev-regions.json',import.meta.url),'utf8'));
  assert.deepEqual(REGION_ORDER.slice(REGION_IDS[BALDRO_REGIONS[0]]-1,REGION_IDS[BALDRO_REGIONS[0]]+1),BALDRO_REGIONS);assert.equal(REGION_IDS.Trogo,51);
  for(const [i,name]of BALDRO_REGIONS.entries()){
    assert.equal(REGION_IDS[name],52+i);assert.equal(REGION_CELLS[name].length,i?32:36);
    const authored=atlas.regions.find(r=>r.name===name).cells.map(c=>`${c.q},${c.r}:${c.terrain}`);
    assert.deepEqual(REGION_CELLS[name].map(c=>`${c.q},${c.r}:${c.terrain}`),authored);
  }
  assert.equal(BALDRO_CELLS.filter(c=>c.climate==='Dwc').length,67);
  assert.equal(BALDRO_CELLS.find(c=>c.climate==='Dfc').q,44);
  const land=new Set(LAND_HEXES.map(([q,r])=>`${q},${r}`));
  for(const c of BALDRO_CELLS){assert.ok(land.has(`${c.q},${c.r}`));assert.equal(baldroRegionAt(c.x,c.z),c.region);assert.ok(landDistance(c.x,c.z)>20);}
});

test('the widened land window reaches every extreme of the actual fixed-phase coast lattice',()=>{
  const phase={x:-1556.0019279391274,z:-704.3502691896258};
  const snap=(v,p)=>p+Math.floor((v-p)/4+1e-9)*4;
  const x0=snap(WORLD_BOUNDS.minX-96,phase.x),z0=snap(WORLD_BOUNDS.minZ-96,phase.z);
  const cols=Math.ceil((WORLD_BOUNDS.maxX+96-x0)/4)+1,rows=Math.ceil((WORLD_BOUNDS.maxZ+96-z0)/4)+1;
  const extremes={minQ:Infinity,maxQ:-Infinity,minR:Infinity,maxR:-Infinity};
  for(let i=0;i<cols;i++)for(const j of[0,rows-1]){
    const h=hexAt(x0+i*4,z0+j*4);
    for(const f of['Q','R']){extremes[`min${f}`]=Math.min(extremes[`min${f}`],h[f.toLowerCase()]);extremes[`max${f}`]=Math.max(extremes[`max${f}`],h[f.toLowerCase()]);}
  }
  assert.deepEqual(WINDOW,extremes);assert.ok(cols*rows<3_300_000,'a regional addition must not silently inflate the coast lattice');
});

test('the two mountains join across their internal boundary and leave neighboring land unchanged',()=>{
  assert.equal(baldroHeight(0,0,17.25),17.25);assert.equal(baldroHeight(BALDRO_BOUNDS.minX-1,BALDRO_BOUNDS.minZ,23),23);
  // West (49,66) and East (50,66) share this edge, safely inside the range union.
  const a=hexCentre(49,66),b=hexCentre(50,66),x=(a.x+b.x)/2,z=(a.z+b.z)/2;
  assert.ok(baldroInset(x,z)>70,'the political border cannot become a mountain-edge trench');
  assert.ok(Math.abs(baldroSurfaceHeight(x-.01,z)-baldroSurfaceHeight(x+.01,z))<.1);
  const heights=BALDRO_PEAKS.map(p=>baldroSurfaceHeight(p.x,p.z));
  assert.ok(Math.max(...heights)>250);assert.ok(Math.max(...heights)-Math.min(...heights)>60,'unequal summits');
  for(let zz=BALDRO_BOUNDS.minZ-5;zz<BALDRO_BOUNDS.maxZ+5;zz+=19)for(let xx=BALDRO_BOUNDS.minX-5;xx<BALDRO_BOUNDS.maxX+5;xx+=23)
    if(!baldroOwns(xx,zz))assert.equal(baldroHeight(xx,zz,31.75),31.75);
});

test('both arrivals, service sites and gates sit on connected walkable ground',()=>{
  for(const k of BALDRO_KINGDOMS){
    assert.equal(baldroRegionAt(k.arrival.x,k.arrival.z),k.region);assert.equal(baldroRegionAt(k.gate.x,k.gate.z),k.region);
    for(const p of[k.arrival,k.gate,...k.taskSites]){assert.ok(Math.abs(baldroSurfaceHeight(p.x,p.z)-p.y)<.001);assert.ok(Math.abs(groundWithRiver(p.x,p.z)-p.y)<.001);}
    for(const dx of[-32,0,32])for(const dz of[-14,0,26])assert.ok(Math.abs(baldroSurfaceHeight(k.gate.x+dx,k.gate.z+dz)-k.gate.y)<.001,'level exterior masonry footings');
  }
  for(const path of BALDRO_PATHS)for(let i=1;i<path.points.length;i++){
    const a=path.points[i-1],b=path.points[i],n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)*2);
    let previous=null;
    for(let j=0;j<=n;j++){
      const t=j/n,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,y=baldroSurfaceHeight(x,z);
      assert.ok(baldroOwns(x,z),`${path.id} leaves authored land`);assert.ok(baldroSlope(x,z)<.81,`${path.id} exceeds the safe walking grade at ${x},${z}`);
      if(previous)assert.ok(Math.abs(y-previous.y)/Math.hypot(x-previous.x,z-previous.z)<.81,'no hidden step between path samples');
      previous={x,z,y};
    }
  }
});

test('Baldro water comes from the twelve mapped East border edges and runs downhill',()=>{
  assert.equal(BALDRO_RIVERS.reduce((n,r)=>n+r.edges.length,0),12);
  for(const r of BALDRO_RIVERS){assert.ok(r.edges.every(e=>e.regions.includes('East Baldro Mountains')));assert.ok(r.mappedPoints.length>1);for(let i=1;i<r.points.length;i++){
    assert.ok(r.points[i].y<=r.points[i-1].y+1e-8);
    const a=r.points[i-1],b=r.points[i],x=(a.x+b.x)/2,z=(a.z+b.z)/2;
    assert.ok(baldroOwns(x,z));assert.ok(baldroWaterAt(x,z)-baldroSurfaceHeight(x,z)>.65,'mapped water needs an exposed cut bed');
  }}
  assert.equal(baldroWaterAt(BALDRO_KINGDOMS[0].gate.x,BALDRO_KINGDOMS[0].gate.z),null);
  assert.equal(baldroWaterAt(0,0),null);
});

test('the actual West and East Baldro rock faces require climbing and support attached ascent',()=>{
  for(const [peak,dx,dz,region]of[[BALDRO_PEAKS[1],-80,35,52],[BALDRO_PEAKS[3],-80,-35,53]]){
    const x=peak.x+dx,z=peak.z+dz,start={x,z,y:baldroSurfaceHeight(x,z)},surface=sampleClimbSurface(climbingWorld,x,z);
    assert.equal(baldroRegionAt(x,z),region);assert.equal(surface.climbable,true);assert.ok(surface.slope>CLIMBING.grabSlope);
    const g=surface.gradient,up={x:x+g.x*.18,z:z+g.z*.18},down={x:x-g.x*.18,z:z-g.z*.18};
    assert.equal(canWalkSlope(x,z,up.x,up.z,climbingWorld),false,`${region} must not bypass the climbing whitelist`);
    assert.equal(canWalkSlope(x,z,down.x,down.z,climbingWorld),true,'a steep descent is a physical fall, not an invisible wall');
    assert.equal(shouldStartTerrainFall({before:start,after:down,floor:baldroSurfaceHeight(down.x,down.z),groundSlope:surface.slope}),true);
    const controller=createClimbing({world:climbingWorld});
    assert.equal(controller.probe(start,surface.yaw).available,true);assert.equal(controller.grab(start,surface.yaw,{stamina:100}),true);
    let stamina=100,xp=0,result;
    for(let frame=0;frame<40;frame++){
      result=controller.tick(.05,{up:1,stamina});stamina-=result.staminaSpent;xp+=result.xp;
      assert.equal(result.phase,'climbing');assert.equal(result.damage,0);
      assert.ok(Math.abs(result.position.y-baldroSurfaceHeight(result.position.x,result.position.z))<1e-7,'attached feet follow the real mountain');
    }
    assert.ok(result.position.y>start.y+2.7);assert.ok(stamina<90&&stamina>75);assert.ok(xp>1);
    const fall=createTerrainFall(),falling={...start};fall.begin(falling,{drift:{x:-g.x*2,z:-g.z*2}});
    fall.tick(.1,{position:falling,surfaceAt:(xx,zz)=>{const s=sampleClimbSurface(climbingWorld,xx,zz);return{height:s.height,slope:s.slope,gradient:s.gradient,water:false};}});
    assert.ok(falling.y<start.y,'the ordinary terrain-fall controller descends this real face');
    assert.ok(Math.hypot(falling.x-start.x,falling.z-start.z)<1,'falling never teleports to a foothill');
  }
});

test('the enabled Baldro slope guard permits complete approach and saddle walks in both directions without falls',()=>{
  let steps=0;
  for(const path of BALDRO_PATHS)for(let i=1;i<path.points.length;i++){
    const a=path.points[i-1],b=path.points[i],n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.18);
    let before={x:a.x,z:a.z,y:baldroSurfaceHeight(a.x,a.z)};
    for(let j=1;j<=n;j++){
      const t=j/n,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,after={x,z,y:baldroSurfaceHeight(x,z)};
      const mid=sampleClimbSurface(climbingWorld,(before.x+x)/2,(before.z+z)/2);
      assert.equal(mid.allowed,true,`${path.id} must use an enabled climbing region`);
      for(const[from,to]of[[before,after],[after,before]]){
        assert.equal(canWalkSlope(from.x,from.z,to.x,to.z,climbingWorld),true,`${path.id} blocked by the real slope guard`);
        // moveCharacter resolves each small X and Z movement separately.
        assert.equal(canWalkSlope(from.x,from.z,to.x,from.z,climbingWorld),true,`${path.id} blocks its X substep`);
        assert.equal(canWalkSlope(to.x,from.z,to.x,to.z,climbingWorld),true,`${path.id} blocks its Z substep`);
        assert.equal(shouldStartTerrainFall({before:from,after:to,floor:to.y,groundSlope:mid.slope}),false,`${path.id} loses support on a walkable descent`);
      }
      before=after;steps++;
    }
  }
  assert.ok(steps>4000,'sample the complete routes at movement-controller substep spacing');
});
