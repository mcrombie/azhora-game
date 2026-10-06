import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {alezhorWaterRibbons,alezhorRivers,GOLD_REACH_SPEC,ALEZHOR_TRAILS} from '../src/content/regions/alezhor/alezhor-world.js';
import {alezhorSwimmingSurface} from '../src/content/regions/alezhor/alezhor-water.js';
import {groundWithRiver} from '../src/world/terrain/world-terrain.js';

const sheets=alezhorWaterRibbons().map(r=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(r.positions,3));g.setIndex(r.indices);const mesh=new THREE.Mesh(g,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));mesh.updateMatrixWorld();return mesh;});
const ray=new THREE.Raycaster(new THREE.Vector3(),new THREE.Vector3(0,-1,0));
const actual=(x,z)=>{ray.ray.origin.set(x,1000,z);return ray.intersectObjects(sheets,false)[0]?.point.y??null;};

test('Alezhor runtime water matches actual Float32 ribbon triangles before any world or vegetation exists',()=>{
  let checks=0;
  for(const {reach,waterTo} of alezhorRivers())for(const p of reach.samples){
    if(p.along<1||p.along>waterTo-1)continue;
    if(reach.id===GOLD_REACH_SPEC.id&&(GOLD_REACH_SPEC.falls.some(([a,b])=>p.along>a-2&&p.along<b+2)||(p.along>GOLD_REACH_SPEC.ford.from-2&&p.along<GOLD_REACH_SPEC.ford.to+2)))continue;
    for(const side of [-.96,-.7,0,.7,.96]){
      const x=p.x+p.nx*p.half*side,z=p.z+p.nz*p.half*side,visible=actual(x,z),sample=alezhorSwimmingSurface(x,z);
      if(visible===null)assert.equal(sample,null);else {assert.ok(sample!==null);assert.ok(Math.abs(sample-visible)<1e-7);checks++;}
    }
  }
  assert.ok(checks>700);
});
test('water queries retain ford and fall exclusions, reject dry terrain above the ribbon, and stay null beyond its edges',()=>{
  const gold=alezhorRivers().find(({reach})=>reach.id===GOLD_REACH_SPEC.id).reach;
  for(const [a,b]of [...GOLD_REACH_SPEC.falls,[GOLD_REACH_SPEC.ford.from,GOLD_REACH_SPEC.ford.to]]){
    const p=gold.samples.reduce((best,p)=>Math.abs(p.along-(a+b)/2)<Math.abs(best.along-(a+b)/2)?p:best,gold.samples[0]);assert.equal(alezhorSwimmingSurface(p.x,p.z),null);
  }
  const x=-4511.397250234071,z=851.6809154850662,y=actual(x,z);assert.ok(y>12);
  assert.ok(Math.abs(alezhorSwimmingSurface(x,z,groundWithRiver)-y)<1e-7);assert.equal(alezhorSwimmingSurface(x,z,()=>y+.01),null);
  for(const p of [{x:0,z:0},{x:-4400,z:900},{x:-3900,z:950}])assert.equal(alezhorSwimmingSurface(p.x,p.z),actual(p.x,p.z));
});
test('the exact running-water hook leaves the authored dry trails and ford walking eligibility unchanged',()=>{
  const failures=[];let samples=0;
  for(const trail of ALEZHOR_TRAILS)for(let i=1;i<trail.points.length;i++){
    const a=trail.points[i-1],b=trail.points[i],n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.25);
    for(let j=0;j<=n;j++){const x=a.x+(b.x-a.x)*j/n,z=a.z+(b.z-a.z)*j/n,surface=alezhorSwimmingSurface(x,z,groundWithRiver);samples++;if(surface!==null)failures.push({trail:trail.id,x,z,surface,ground:groundWithRiver(x,z)});}
  }
  assert.ok(samples>1000);assert.deepEqual(failures.slice(0,8),[]);
});
