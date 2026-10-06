import test from 'node:test';
import assert from 'node:assert/strict';
import { REGION_CELLS, REGION_OUTLINES, hexOwnerAt } from '../src/world/terrain/region-world.js';
import { pointInPolygon } from '../src/world/terrain/region-layout.js';
import { moveCharacter } from '../src/gameplay/movement/game-state.js';
import { createClimbing, sampleClimbSurface, canWalkSlope } from '../src/gameplay/movement/climbing.js';
import { SOUTH_OREMINDI, SOUTH_OREMINDI_CELLS, SOUTH_OREMINDI_BOUNDS, SOUTH_OREMINDI_CLIMATE,
  SOUTH_OREMINDI_ARRIVAL, PEAKS, PATHS, LAKES, southOremindiOwns, southOremindiInset,
  southOremindiGround, southOremindiWaterAt, southOremindiFeatures, SOUTH_OREMINDI_SHELVES } from '../src/content/regions/south-oremindi/south-oremindi-world.js';

const key=c=>`${c.q},${c.r}`,distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const world={bounds:SOUTH_OREMINDI_BOUNDS,colliders:[],heightAt:southOremindiGround,
  waterAt:(x,z)=>southOremindiWaterAt(x,z)??.45,regionAt:()=>37};
function samples(path,step=.35) {
  const out=[path.points[0]];
  for(let i=1;i<path.points.length;i++) {
    const a=path.points[i-1],b=path.points[i],count=Math.ceil(distance(a,b)/step);
    for(let j=1;j<=count;j++)out.push({x:a.x+(b.x-a.x)*j/count,z:a.z+(b.z-a.z)*j/count});
  }
  return out;
}

test('South Oremindi follows all 45 authored cells, their climates and the exact region boundary',()=>{
  assert.equal(SOUTH_OREMINDI_CELLS.length,45);
  assert.deepEqual(SOUTH_OREMINDI_CELLS.map(key).sort(),REGION_CELLS[SOUTH_OREMINDI].map(key).sort());
  const count={};for(const cell of SOUTH_OREMINDI_CELLS){count[cell.terrain]=(count[cell.terrain]??0)+1;
    assert.equal(hexOwnerAt(cell.x,cell.z),SOUTH_OREMINDI);assert.equal(southOremindiOwns(cell.x,cell.z),true);
    assert.ok(SOUTH_OREMINDI_CLIMATE[key(cell)]);}
  assert.deepEqual(count,{hills:19,high_mountain:20,lake:6});
  assert.equal(southOremindiOwns(SOUTH_OREMINDI_BOUNDS.minX-1,SOUTH_OREMINDI_ARRIVAL.z),false);
});

test('the two real lakes cover their six atlas cells and never leave dry ground under their water sheets',()=>{
  assert.deepEqual(LAKES.map(l=>l.hexes.length),[5,1]);
  for(const lake of LAKES) {
    for(const [q,r] of lake.hexes) {
      const c=SOUTH_OREMINDI_CELLS.find(c=>c.q===q&&c.r===r);
      assert.equal(southOremindiWaterAt(c.x,c.z),lake.surface);
      assert.ok(southOremindiGround(c.x,c.z)<lake.surface-3,'a lake cell has real swimming depth');
    }
    for(const p of lake.shore){assert.equal(southOremindiOwns(p.x,p.z),true);assert.ok(southOremindiInset(p.x,p.z)>=15.9);}
    let wet=0;
    for(let x=lake.bounds.minX;x<=lake.bounds.maxX;x+=3)for(let z=lake.bounds.minZ;z<=lake.bounds.maxZ;z+=3) {
      if(!pointInPolygon(lake.shore,x,z))continue;wet++;
      assert.equal(southOremindiWaterAt(x,z),lake.surface);
      assert.ok(southOremindiGround(x,z)<=lake.surface-.2,`${lake.id}: ground pierces its water at ${x},${z}`);
    }
    assert.ok(wet>200);
  }
  assert.equal(southOremindiWaterAt(SOUTH_OREMINDI_ARRIVAL.x,SOUTH_OREMINDI_ARRIVAL.z),null);
});

test('three unequal alpine summits have sloping shoulders and permanently snowy upper ground',()=>{
  const heights=PEAKS.map(p=>southOremindiGround(p.x,p.z));
  assert.ok(heights.every(h=>h>390&&h<490),heights.join(', '));
  assert.ok(heights[0]>Math.max(...heights.slice(1))+35&&Math.abs(heights[1]-heights[2])>3,heights.join(', '));
  for(const p of PEAKS) {
    const heights=Array.from({length:16},(_,i)=>southOremindiGround(p.x+55*Math.sin(i*Math.PI/8),p.z+55*Math.cos(i*Math.PI/8)));
    assert.ok(heights.filter(h=>h<southOremindiGround(p.x,p.z)-24).length>=10,`${p.id} has real shoulders instead of a tabletop`);
    assert.ok(Math.max(...heights)-Math.min(...heights)>42,`${p.id} is not a symmetrical cone`);
    assert.ok(southOremindiFeatures(p.x,p.z).snow>.7,`${p.id} retains an alpine snow cap`);
  }
});

test('new mountain ground leaves every neighboring country untouched and joins its borders continuously',()=>{
  const base=(x,z)=>17+.002*x+.003*z;
  for(const name of ['North Ibenwood','West Ibenwood','West Lotharn Mountains','East Ibenwood'])for(const c of REGION_CELLS[name]) {
    assert.equal(southOremindiGround(c.x,c.z,base),base(c.x,c.z));
  }
  let checked=0;
  for(const loop of REGION_OUTLINES[SOUTH_OREMINDI])for(let i=0;i<loop.length;i++) {
    const a=loop[i],b=loop[(i+1)%loop.length],dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz),mid={x:(a.x+b.x)/2,z:(a.z+b.z)/2};
    for(const sign of [-1,1]) {
      const x=mid.x-dz/l*.02*sign,z=mid.z+dx/l*.02*sign;
      const difference=southOremindiGround(x,z,base)-base(x,z);
      if(southOremindiOwns(x,z)){checked++;assert.ok(Math.abs(difference)<.002,`border rise ${difference}`);}
      else assert.equal(difference,0);
    }
  }
  assert.ok(checked>25);
});

test('unequal glacial turf shelves support treeline plants and ground wildlife between the steep faces',()=>{
  for(const shelf of SOUTH_OREMINDI_SHELVES) {
    let habitat=0;
    for(let dx=-15;dx<=15;dx+=2)for(let dz=-15;dz<=15;dz+=2) {
      const f=southOremindiFeatures(shelf.x+dx,shelf.z+dz);
      if(f&&f.grade<.6&&Math.abs(f.height-f.treeline)<45&&f.water===null&&f.pathDistance>6)habitat+=4;
    }
    assert.ok(habitat>300,`${shelf.id} has ${habitat} square metres of usable alpine turf`);
    assert.ok(southOremindiFeatures(shelf.x,shelf.z).grade<.2);
  }
});

test('the sheltered tarn approach is dry and walkable using actual movement slope rules',()=>{
  const path=PATHS.find(p=>p.id==='oremindi-tarn-approach'),route=samples(path,.2),at={...route[0],y:world.heightAt(route[0].x,route[0].z)};
  let walked=0;
  for(const goal of route.slice(1)) {
    const before={...at};
    moveCharacter(at,goal.x-at.x,goal.z-at.z,world,.34,{canTraverse:(x,z,nx,nz)=>canWalkSlope(x,z,nx,nz,world)});
    assert.ok(distance(at,goal)<.005,`trail blocked at ${goal.x},${goal.z}`);
    assert.equal(southOremindiWaterAt(at.x,at.z),null);at.y=world.heightAt(at.x,at.z);walked+=distance(at,before);
  }
  assert.ok(walked>170);assert.ok(at.y>100);
});

test('a beginner crosses the full shoulder trail and its five final climbs without exhausting stamina',t=>{
  const route=[...samples(PATHS[0]),...samples(PATHS.find(p=>p.kind==='scramble'))];
  const at={...route[0],y:world.heightAt(route[0].x,route[0].z)},events=[];
  const climb=createClimbing({world,onEvent:e=>events.push(e)}),dt=1/30;
  let target=1,frames=0,stamina=100,least=100,spent=0,walked=0,stalled=0;
  while(target<route.length&&frames++<30*1200) {
    while(target<route.length&&distance(at,route[target])<.2)target++;
    if(target===route.length)break;
    const goal=route[target],d=distance(at,goal),dx=(goal.x-at.x)/d,dz=(goal.z-at.z)/d,before={...at};
    const surface=sampleClimbSurface(world,at.x,at.z);
    if(climb.active) {
      const g=surface.gradient,up=(dx*g.x+dz*g.z)*Math.sqrt(1+surface.slope**2),side=-dx*g.z+dz*g.x;
      const frame=climb.tick(dt,{up,side,stamina,level:1});
      stamina-=frame.staminaSpent;spent+=frame.staminaSpent;Object.assign(at,frame.position);
      assert.equal(frame.damage,0);
    }else {
      if(surface.resting&&stamina<95){stamina=Math.min(100,stamina+24*dt);continue;}
      stamina=Math.min(100,stamina+24*dt);
      moveCharacter(at,dx*Math.min(d,4.2*dt),dz*Math.min(d,4.2*dt),world,.34,
        {canTraverse:(x,z,nx,nz)=>canWalkSlope(x,z,nx,nz,world)});
      walked+=distance(at,before);at.y=world.heightAt(at.x,at.z);
      if(distance(at,before)<.001)climb.grab(at,surface.yaw,{stamina});
    }
    least=Math.min(least,stamina);
    stalled=distance(at,before)<.001?stalled+dt:0;
    assert.ok(stalled<4,`stuck near ${at.x.toFixed(2)},${at.z.toFixed(2)}, height${at.y.toFixed(2)}, slope${surface.slope.toFixed(3)}`);
    assert.ok(stamina>0,'the next natural shelf must be within a beginner’s stamina budget');
    assert.equal(southOremindiWaterAt(at.x,at.z),null);
  }
  assert.equal(target,route.length);assert.equal(climb.active,false);assert.ok(at.y>465);assert.ok(walked>800);
  assert.ok(spent>130,'the last rock face is actually climbed, not a cosmetic route');
  assert.equal(events.some(e=>e.type==='exhausted'),false);
  t.diagnostic(`Summit ${at.y.toFixed(1)}m; ${walked.toFixed(0)}m walked; total climbing stamina ${spent.toFixed(1)}, minimum ${least.toFixed(1)}.`);
});
