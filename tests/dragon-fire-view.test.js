import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {sourceModule} from './module-loader.js';
const {createDragonFireView,DRAGON_FIRE_LIMITS:LIMITS}=await sourceModule('../src/dragon-fire-view.js');

const fire={active:true,origin:{x:20,y:80,z:-30},direction:{x:3,y:-2,z:4},range:90,intensity:1,
  impacts:[{x:74,y:44,z:42,radius:3,id:1,left:6}]};
function matricesFinite(view){
  for(const mesh of view.root.children){
    for(let i=0;i<mesh.count*16;i++)assert.ok(Number.isFinite(mesh.instanceMatrix.array[i]),`${mesh.name} matrix ${i}`);
    if(mesh.instanceColor)for(let i=0;i<mesh.count*3;i++)assert.ok(Number.isFinite(mesh.instanceColor.array[i]));
  }
}

test('Dragon breath is aimed from its world-space nozzle with a broad billowing stream and horizontal impact embers',()=>{
  const scene=new THREE.Scene(),view=createDragonFireView(scene);view.update(0,fire);
  assert.equal(scene.children[0],view.root);assert.equal(view.state().streamInstances,LIMITS.stream);
  assert.equal(view.state().groundFires,1);assert.equal(view.state().groundFlames,6);
  const stream=view.root.getObjectByName('Dragon billowing flame stream'),matrix=new THREE.Matrix4();
  const origin=new THREE.Vector3().copy(fire.origin),direction=new THREE.Vector3().copy(fire.direction).normalize();
  let widest=0;
  for(let i=0;i<stream.count;i++){
    stream.getMatrixAt(i,matrix);const point=new THREE.Vector3().setFromMatrixPosition(matrix).sub(origin);
    const distance=point.dot(direction);assert.ok(distance>0&&distance<fire.range,'Flame lobes stay along the ray in front of the mouth');
    const axial=new THREE.Vector3(0,0,1).transformDirection(matrix);assert.ok(axial.distanceTo(direction)<1e-6);
    const scale=new THREE.Vector3().setFromMatrixScale(matrix);widest=Math.max(widest,scale.x);
  }
  assert.ok(widest>1.5,'The distal stream expands into substantial billows');
  const embers=view.root.getObjectByName('Dragon ground embers');embers.getMatrixAt(0,matrix);
  const vertices=embers.geometry.getAttribute('position'),points=[];
  for(let i=0;i<vertices.count;i++)points.push(new THREE.Vector3().fromBufferAttribute(vertices,i).applyMatrix4(matrix));
  const box=new THREE.Box3().setFromPoints(points),size=box.getSize(new THREE.Vector3());
  assert.ok(size.x>5.9&&size.z>5.9&&size.y<1e-5,'Glowing ground disc has area in the XZ ground plane');
  matricesFinite(view);view.dispose();
});

test('Sustained dragon fire reuses five fixed instance batches and bounded flame, smoke and spark pools',()=>{
  const view=createDragonFireView(new THREE.Scene()),objects=[...view.root.children];
  const geometries=objects.map(o=>o.geometry),materials=objects.map(o=>o.material);
  const positions=Array.from({length:30},(_,i)=>({x:i*12,y:0,z:30,radius:3,id:i,left:6}));
  for(let i=0;i<2400;i++){
    view.update(.05,{...fire,range:i%2?90:500,impacts:positions});
    const s=view.state();assert.ok(s.streamInstances<=LIMITS.stream&&s.sparks<=LIMITS.sparks&&s.smoke<=LIMITS.smoke);
    assert.ok(s.groundFires<=LIMITS.groundFires&&s.groundFlames<=LIMITS.groundFlames);assert.ok(s.range<=LIMITS.maxRange);
  }
  assert.deepEqual(view.root.children,objects);assert.deepEqual(objects.map(o=>o.geometry),geometries);
  assert.deepEqual(objects.map(o=>o.material),materials);assert.equal(view.state().meshes,5);
  assert.ok(view.state().smoke>0&&view.state().sparks>0&&view.state().groundFires===18);
  const sourceVertices=[...new Set(geometries)].reduce((n,g)=>n+g.getAttribute('position').count,0);
  assert.ok(sourceVertices<400,'Every effect shares a small set of low-poly primitives');
  matricesFinite(view);view.dispose();
});

test('Released fire quickly stops at the mouth while impacts smoulder briefly, and clearing removes everything immediately',()=>{
  const view=createDragonFireView(new THREE.Scene());
  for(let i=0;i<30;i++)view.update(.1,fire);
  for(let i=0;i<6;i++)view.update(.1,{active:false});
  assert.equal(view.state().streamInstances,0);assert.ok(view.state().groundFires>0);assert.ok(view.state().smoke>0);
  for(let i=0;i<130;i++)view.update(.1,{active:false});
  assert.equal(view.root.visible,false);assert.equal(view.state().flames+view.state().sparks+view.state().smoke,0);
  view.update(.1,fire);view.clear();assert.equal(view.root.visible,false);
  assert.equal(view.state().groundFires+view.state().streamInstances+view.state().smoke+view.state().sparks,0);
  view.dispose();
});

test('Vertical aiming, invalid inputs, and repeated disposal leave finite effects and release every owned GPU resource once',()=>{
  const scene=new THREE.Scene(),view=createDragonFireView(scene),events=new Map();
  for(const resource of new Set(view.root.children.flatMap(mesh=>[mesh.geometry,mesh.material]))){
    events.set(resource,0);resource.addEventListener('dispose',()=>events.set(resource,events.get(resource)+1));
  }
  for(const direction of [{x:0,y:1,z:0},{x:0,y:-1,z:0}]){view.update(.1,{...fire,direction});matricesFinite(view);}
  for(const invalid of [{origin:{x:NaN,y:0,z:0}},{direction:{x:0,y:0,z:0}},{range:Infinity},{intensity:0}]){
    view.update(.1,{...fire,...invalid});assert.equal(view.state().active,false);matricesFinite(view);
  }
  view.update(NaN,{active:false});matricesFinite(view);
  view.dispose();view.dispose();view.update(.1,fire);
  assert.equal(scene.children.length,0);assert.equal(view.state().disposed,true);
  assert.ok([...events.values()].every(count=>count===1));assert.equal(view.state().flames,0);
});

test('Controller cone width matches the visible billows, while sea and wall impacts never become ground fires',()=>{
  const view=createDragonFireView(new THREE.Scene());
  view.update(0,{...fire,tipRadius:10.5,impacts:[{x:74,y:44,z:42,radius:3,wet:true}]});
  assert.equal(view.state().groundFires,0);assert.equal(view.state().groundFlames,0);
  const stream=view.root.getObjectByName('Dragon billowing flame stream'),matrix=new THREE.Matrix4();
  let widest=0;for(let i=0;i<80;i++){stream.getMatrixAt(i,matrix);widest=Math.max(widest,new THREE.Vector3().setFromMatrixScale(matrix).x);}
  assert.ok(widest>8,'A ten-metre damaging cone has a visible broad outer envelope');
  view.update(.1,{...fire,impacts:[{x:74,y:44,z:42,radius:3}]});
  assert.equal(view.state().groundFires,0);assert.ok(view.state().groundFlames>0,'A dry wall receives only a brief impact bloom');
  for(let i=0;i<4;i++)view.update(.1,{active:false,impacts:[{x:74,y:44,z:42,radius:3}]});
  assert.equal(view.state().groundFlames,0,'An inactive stale impact cannot refresh its bloom');
  view.update(.1,{active:false,impacts:[{x:74,y:0,z:42,radius:3,id:2,left:1}]});
  assert.equal(view.state().groundFires,1,'Controller-owned ground fires remain visible after the trigger is released');
  for(let i=0;i<12;i++)view.update(.1,{active:false});
  assert.equal(view.state().groundFires,0,'The controller-supplied remaining lifetime is respected');
  matricesFinite(view);view.dispose();
});

test('Overlapping flame lobes retain orange exteriors and a yellow core rather than additively saturating white',()=>{
  const view=createDragonFireView(new THREE.Scene());view.update(0,fire);
  const stream=view.root.getObjectByName('Dragon billowing flame stream'),ground=view.root.getObjectByName('Dragon ground flames');
  assert.equal(stream.material.blending,THREE.NormalBlending);assert.equal(ground.material.blending,THREE.NormalBlending);
  assert.equal(stream.material.vertexColors,true);assert.ok(stream.geometry.getAttribute('color'));
  const outer=new THREE.Color(),core=new THREE.Color();stream.getColorAt(60,outer);stream.getColorAt(85,core);
  assert.ok(outer.r>outer.g*2&&outer.g>outer.b*2,'Outer lobes retain strong orange/red chroma');
  assert.ok(core.g>outer.g*2&&core.b<core.g*.5,'The inner flame is hot yellow, not white');
  assert.equal(view.state().meshes,5,'Color correction adds no draw calls');view.dispose();
});
