import test from 'node:test';
import assert from 'node:assert/strict';
import { AEVIS, AEVIS_AREA, AEVIS_OUTLINE, AEVIS_WALL_EDGES, AEVIS_GATES,
  AEVIS_BUILDINGS, AEVIS_PATHS, AEVIS_QUAYS, AEVIS_BOATS, AEVIS_SOLDIERS,
  AEVIS_LANDMARKS, AEVIS_COASTAL_DEFENSE_ENDS, inAevis, aevisGround, aevisReserved, aevisDeckHeight,
  aevisSegmentDistance } from '../src/content/regions/aevis/aevis-city.js';
import { NYLON_AREA } from '../src/content/regions/nylon/nylon-city.js';
import { hexCentre, hexAt, hexOwnerAt, landDistance, SOLIS } from '../src/world/terrain/region-world.js';
import { groundWithRiver } from '../src/world/terrain/world-terrain.js';

const samples = b => [-1,0,1].flatMap(a => [-1,0,1].map(c => ({x:b.x+a*b.width/2,z:b.z+c*b.depth/2})));
const inside = (p,b,margin=0) => Math.abs(p.x-b.x)<b.width/2+margin && Math.abs(p.z-b.z)<b.depth/2+margin;
const height = (x,z) => aevisDeckHeight(x,z) ?? groundWithRiver(x,z);

test('Aevis follows the Southern Ascarth east coast and keeps its overall size between Solis and Nylon', () => {
  const hex = hexCentre(AEVIS.hex.q,AEVIS.hex.r);
  assert.ok(Math.hypot(AEVIS.x-hex.x,AEVIS.z-hex.z)<58);
  assert.deepEqual(hexAt(AEVIS.x,AEVIS.z),AEVIS.hex);
  assert.equal(hexOwnerAt(AEVIS.x,AEVIS.z),'Southern Ascarth');
  assert.ok(AEVIS_AREA > SOLIS.halfX*SOLIS.halfZ*4);
  assert.ok(AEVIS_AREA < NYLON_AREA);
  assert.ok(AEVIS_AREA >= 9000 && AEVIS_AREA <= 9700);
});

test('Aevis protects the land approaches and leaves its eastern waterfront open to the sea', () => {
  assert.equal(AEVIS_COASTAL_DEFENSE_ENDS.length,2);
  for(const p of AEVIS_COASTAL_DEFENSE_ENDS) assert.ok(landDistance(p.x,p.z)<-7,'Both defensive returns terminate in real water');
  for(const gate of AEVIS_GATES) {
    assert.ok(AEVIS_WALL_EDGES.includes(gate.edge));
    assert.ok(aevisSegmentDistance(gate.x,gate.z,AEVIS_OUTLINE[gate.edge],AEVIS_OUTLINE[(gate.edge+1)%AEVIS_OUTLINE.length])<.001);
    assert.ok(gate.width>=10);
  }
  for(let edge=0;edge<AEVIS_OUTLINE.length;edge++) {
    const a=AEVIS_OUTLINE[edge],b=AEVIS_OUTLINE[(edge+1)%AEVIS_OUTLINE.length];
    for(let i=0;i<=20;i++) {
      const x=a.x+(b.x-a.x)*i/20,z=a.z+(b.z-a.z)*i/20;
      if(!AEVIS_WALL_EDGES.includes(edge))assert.ok(landDistance(x,z)<0,`Open edge ${edge} must face water, not leave an exposed land entry`);
    }
  }
  assert.ok(AEVIS_QUAYS.every(q=>q.x>AEVIS.x));
  assert.ok(AEVIS_BOATS.every(b=>landDistance(b.x,b.z)<0));
});

test('Aevis occupies a narrow coastal strip instead of filling the peninsula width',()=>{
  for(const z of [1840,1860,1880,1900,1920,1940]){
    const cross=[];
    for(let i=0;i<AEVIS_OUTLINE.length;i++){
      const a=AEVIS_OUTLINE[i],b=AEVIS_OUTLINE[(i+1)%AEVIS_OUTLINE.length];
      if((a.z>z)!==(b.z>z))cross.push(a.x+(b.x-a.x)*(z-a.z)/(b.z-a.z));
    }
    assert.equal(cross.length,2);
    const width=Math.max(...cross)-Math.min(...cross);
    assert.ok(width>=70&&width<=80,`City depth is ${width}m at ${z}`);
    const inland=Math.min(...cross)-100;
    assert.ok(landDistance(inland,z)>0,'A broad open landward belt must remain outside the city');
    assert.equal(inAevis(inland,z),false);
  }
});

test('Aevis buildings fit dry land without overlapping walls, each other or the public streets', () => {
  for(const b of AEVIS_BUILDINGS) for(const p of samples(b)) {
    assert.ok(inAevis(p.x,p.z),`${b.id} stays inside city outline at ${JSON.stringify(p)}`);
    assert.equal(hexOwnerAt(p.x,p.z),AEVIS.regionName,b.id);
    assert.ok(height(p.x,p.z)>2,`${b.id} foundation stays dry`);
    assert.ok(landDistance(p.x,p.z)>14,`${b.id} leaves natural shoreline`);
    const wallDistance=Math.min(...AEVIS_WALL_EDGES.map(edge=>aevisSegmentDistance(p.x,p.z,AEVIS_OUTLINE[edge],AEVIS_OUTLINE[(edge+1)%AEVIS_OUTLINE.length])));
    assert.ok(wallDistance>AEVIS.wallThickness/2+.8,`${b.id} clears curtain wall`);
  }
  for(let i=0;i<AEVIS_BUILDINGS.length;i++) for(let j=i+1;j<AEVIS_BUILDINGS.length;j++) {
    const a=AEVIS_BUILDINGS[i],b=AEVIS_BUILDINGS[j];
    assert.ok(Math.abs(a.x-b.x)>=(a.width+b.width)/2+.8 || Math.abs(a.z-b.z)>=(a.depth+b.depth)/2+.8,`${a.id} overlaps ${b.id}`);
  }
  for(const path of AEVIS_PATHS) for(let i=1;i<path.points.length;i++) {
    const a=path.points[i-1],b=path.points[i],steps=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z));
    let prior=null;
    for(let n=0;n<=steps;n++) {
      const p={x:a.x+(b.x-a.x)*n/steps,z:a.z+(b.z-a.z)*n/steps},y=height(p.x,p.z);
      assert.equal(AEVIS_BUILDINGS.some(b=>inside(p,b,.8)),false,`${path.id} hits a building at ${JSON.stringify(p)}`);
      assert.ok(aevisReserved(p.x,p.z),`${path.id} remains clear of scatter`);
      assert.ok(y>1,`${path.id} does not enter the sea`);
      if(prior) assert.ok(Math.abs(y-prior.y)/Math.hypot(p.x-prior.x,p.z-prior.z)<.7,`${path.id} is too steep near ${JSON.stringify(p)}`);
      prior={...p,y};
    }
  }
});

test('Arrival, city landmarks and distinctive bronze soldiers occupy accessible open ground', () => {
  for(const p of [AEVIS.arrival,...AEVIS_LANDMARKS,...AEVIS_SOLDIERS]) {
    assert.equal(hexOwnerAt(p.x,p.z),AEVIS.regionName,p.id);
    assert.ok(height(p.x,p.z)>1.5,p.id);
    assert.equal(AEVIS_BUILDINGS.some(b=>inside(p,b,.55)),false,`${p.id??'arrival'} is inside a building`);
  }
  assert.ok(AEVIS_SOLDIERS.length>=8);
  assert.equal(new Set(AEVIS_SOLDIERS.map(s=>s.id)).size,AEVIS_SOLDIERS.length);
});

test('Aevis grading preserves sea and other regions while piers offer a separate walking surface', () => {
  for(const p of [{x:-880,z:1864},{x:-1100,z:1690},{x:0,z:0}]) assert.equal(aevisGround(p.x,p.z,-3),-3);
  assert.equal(aevisDeckHeight(-880,1864),3.2);
  assert.ok(landDistance(-880,1864)<0,'Deck is over existing water');
  assert.equal(aevisDeckHeight(-930,1864),null);
  assert.equal(aevisDeckHeight(-870,1864),null);
});
