import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {groundWithRiver as height,legacyWesternGroundHeight as legacy} from '../src/world/terrain/world-terrain.js';
import {WESTERN_DRY_SEAMS,westernDrySeamWeight} from '../src/content/regions/western-regions/western-dry-seams.js';
import {WEST_PROFILES,WEST_POOL_LEVELS} from '../src/content/regions/western-regions/west-ground.js';
import {readFileSync} from 'node:fs';
import {createLegacyWesternGround,createLegacyWesternGrid} from '../src/content/regions/western-regions/western-legacy-ground.js';
import {terrainRoadHeight} from '../src/world/terrain/terrain-road.js';
import {villageBase,villageWeight,smooth,lerp} from '../src/world/terrain/world-terrain.js';
import {villageToWorld,worldToVillage} from '../src/world/terrain/region-world.js';
import {AVREL_POND,avrelPondGround} from '../src/content/regions/drent/avrel-pond.js';
import {PORT_CALOS,portCalosGround} from '../src/content/regions/port-calos/port-calos-world.js';
import {groveGround} from '../src/content/regions/ibenwood/ibenwood-pilot.js';
import {brandyHomeGround} from '../src/content/quests/brandy/brandy-home-world.js';
import {createIbenwoodRiverSystem} from '../src/content/regions/ibenwood/ibenwood-rivers.js';

const sites=[
  {x:-2300.4349406410192,z:-201.6901076758503,nx:.4999999999999998,nz:.8660254037844387,before:10.475881078212495},
  {x:-2099.5689152372347,z:-259.9251345948129,nx:-.5000000000000029,nz:-.866025403784437,before:10.19156541759319},
  {x:-1450.4349406410201,z:346.29264805429415,nx:-.5000000000000012,nz:.866025403784438,before:4.570540451191029},
];
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
test('the three demonstrated dry jumps converge at the former exact crossing points',t=>{
  const results=[];
  for(const p of sites){const delta=(fn,half)=>Math.abs(fn(p.x+p.nx*half,p.z+p.nz*half)-fn(p.x-p.nx*half,p.z-p.nz*half));
    assert.ok(Math.abs(delta(legacy,.0005)-p.before)<1e-9);const narrow=delta(height,.0005),wide=delta(height,.05);
    results.push({before:p.before,narrow,wide});assert.ok(narrow<.005&&narrow<wide*.025);
  }t.diagnostic(JSON.stringify(results));
});
test('the selected atlas edges and endpoints no longer hide physical height steps',t=>{
  let count=0,max=0;const failures=[];
  for(const e of WESTERN_DRY_SEAMS){const length=Math.sqrt(e.length2),nx=e.dz/length,nz=-e.dx/length;
    for(let along=.2;along<length;along+=.6){const x=e.a.x+e.dx*along/length,z=e.a.z+e.dz*along/length,d=Math.abs(height(x+nx*.0005,z+nz*.0005)-height(x-nx*.0005,z-nz*.0005));count++;max=Math.max(max,d);if(d>.015)failures.push({id:e.id,x,z,d});}
    for(const p of[e.a,e.b]){const ys=Array.from({length:12},(_,i)=>height(p.x+Math.cos(i*Math.PI/6)*.0005,p.z+Math.sin(i*Math.PI/6)*.0005)),d=Math.max(...ys)-Math.min(...ys);count++;max=Math.max(max,d);if(d>.015)failures.push({id:e.id,corner:p,d});}
  }
  t.diagnostic(JSON.stringify({count,max,failures:failures.slice(0,8)}));assert.equal(failures.length,0);
});
test('all ground outside the three bounded bands remains exactly on its legacy height',()=>{
  let checked=0;
  for(const e of WESTERN_DRY_SEAMS)for(let x=e.minX-16;x<=e.maxX+16;x+=7)for(let z=e.minZ-16;z<=e.maxZ+16;z+=7){
    if(westernDrySeamWeight(x,z))continue;assert.equal(height(x,z),legacy(x,z));checked++;
  }assert.ok(checked>700);
});
test('water profiles and standing water levels retain their original exact arrays',()=>{
  assert.equal(hash([...WEST_PROFILES]),'85f2bd3a7d948e2aa9a6c18d6e337cfa0d8c0339a4038e7cd15c650eff4b0f5d');
  assert.equal(hash([...WEST_POOL_LEVELS]),'39a84620cdb95c58b09b6423b184389c41ffdf2950cd231d76ffc4c6ac9c9093');
});

test('legacy eligibility preserves actual village, pond, port and Ibenwood world layers outside the repair bands',t=>{
  // Exercise the production composition without constructing any scenery. Read
  // its function block so this check cannot silently substitute a simpler base.
  const source=readFileSync(new URL('../src/world.js',import.meta.url),'utf8');
  const start=source.indexOf('  function localGround(x, z) {'),end=source.indexOf('  pond.castPoint.y =',start);
  assert.ok(start>0&&end>start);
  const dependencies={THREE:{MathUtils:{lerp}},pond:{x:27,z:-77,radius:5.4,surfaceY:0},
    villageBase,villageWeight,smooth,lerp,worldToVillage,AVREL_POND,groundWithRiver:height,
    avrelPondGround,portCalosGround,groveGround,brandyHomeGround,createIbenwoodRiverSystem};
  const world=Function(...Object.keys(dependencies),source.slice(start,end)+'\nreturn {groundHeight,ibenwoodRivers};')(...Object.values(dependencies));
  const callback=createLegacyWesternGround({groundHeight:world.groundHeight,baseHeight:height,legacyBaseHeight:legacy});
  const categories=[
    ['village',[villageToWorld(0,0),villageToWorld(27,-77)]],
    ['Avrel pond',[AVREL_POND]],['Port Calos',[PORT_CALOS]],
    ['Ibenwood',world.ibenwoodRivers.profiles.flatMap(p=>p.samples.filter((_,i)=>i%13===0))],
  ];
  const results=[];
  for(const[name,points]of categories){let modified=0,checked=0;
    for(const p of points)for(const dx of[-1,0,1])for(const dz of[-1,0,1]){
      const x=p.x+dx,z=p.z+dz;assert.equal(westernDrySeamWeight(x,z),0);
      const current=world.groundHeight(x,z);assert.equal(callback(x,z),current);
      if(Math.abs(current-height(x,z))>.01)modified++;checked++;
    }
    assert.ok(modified>0,`${name} must actually exercise a non-base layer`);results.push({name,checked,modified});
  }
  // Inside the repair, eligibility keeps the old base plus any later layer.
  const withLayer=createLegacyWesternGround({groundHeight:(x,z)=>height(x,z)+7.25,baseHeight:height,legacyBaseHeight:legacy});
  for(const p of sites)assert.equal(withLayer(p.x,p.z),legacy(p.x,p.z)+7.25);
  t.diagnostic(JSON.stringify(results));
});

test('legacy scatter reconstructs the old Float32 triangles including the coarse apron',t=>{
  let checked=0,differentFromCurrent=0;
  for(const p of sites){
    const xs=Array.from({length:25},(_,i)=>p.x-85+i*7.1),zs=Array.from({length:25},(_,i)=>p.z-85+i*7.1);
    const old=new Float32Array(xs.length*zs.length*3),positions=new Float32Array(old.length).fill(NaN),current=new Float32Array(old.length);
    for(let j=0;j<zs.length;j++)for(let i=0;i<xs.length;i++){
      const at=(j*xs.length+i)*3,x=xs[i],z=zs[j];
      current.set([x,height(x,z)-.125,z],at);old.set([x,legacy(x,z)-.125,z],at);
    }
    const currentHeight=(x,z)=>{positions.set(current);return terrainRoadHeight(x,z,xs,zs,positions,0);};
    const callback=createLegacyWesternGrid({xs,zs,positions,currentHeight,legacyVertexHeight:(x,z)=>legacy(x,z)-.125});
    for(let j=0;j<zs.length-1;j++)for(let i=0;i<xs.length-1;i++)for(const[u,v]of[[.2,.3],[.8,.7]]){
      const x=xs[i]+7.1*u,z=zs[j]+7.1*v,expected=terrainRoadHeight(x,z,xs,zs,old,0),actual=callback(x,z);
      assert.equal(actual,expected);checked++;
      if(Math.abs(actual-currentHeight(x,z))>.001)differentFromCurrent++;
    }
  }
  assert.ok(differentFromCurrent>200);t.diagnostic(JSON.stringify({checked,differentFromCurrent}));
});
