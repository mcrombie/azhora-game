import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './module-loader.js';
import { BABON, BABON_CELLS, BABON_BOUNDS, BABON_ARRIVAL, BABON_LANDMARKS, BABON_TRAILS, BABON_VIEWS,
  BABON_RIVERS, BABON_RIVER_EDGES, BABON_TATHILIUM_RESERVE, babonOwns, babonGround, babonHabitat,
  babonWaterAt, babonRiverAt, babonTrailDistance, babonSlope, babonTint, babonShoreTint } from '../src/content/regions/babon/babon-world.js';
import { groundWithRiver as heightAt } from '../src/world/terrain/world-terrain.js';
import { REGION_CELLS, landDistance, hexOwnerAt, SEA_LEVEL } from '../src/world/terrain/region-world.js';
import { moveCharacter, canStand } from '../src/gameplay/movement/game-state.js';
import { canWalkSlope, sampleClimbSurface, isClimbTerrain } from '../src/gameplay/movement/climbing.js';

const world={bounds:BABON_BOUNDS,colliders:[],heightAt,waterAt:(x,z)=>Math.max(.45,babonWaterAt(x,z)??.45),regionAt:()=>60};

test('Babon follows all 50 atlas cells and the 22 Af / 28 Csa interior/coast climate split',()=>{
  assert.equal(BABON_CELLS.length,50);
  assert.deepEqual(BABON_CELLS.map(c=>[c.q,c.r]),REGION_CELLS.Babon.map(c=>[c.q,c.r]));
  assert.equal(BABON_CELLS.filter(c=>c.terrain==='deep_forest'&&c.climate==='Af').length,22);
  assert.equal(BABON_CELLS.filter(c=>c.terrain==='grassland'&&c.climate==='Csa').length,28);
  for(const c of BABON_CELLS){
    assert.equal(hexOwnerAt(c.x,c.z),BABON);assert.ok(babonOwns(c.x,c.z));
    const f=babonHabitat(c.x,c.z);assert.equal(f.climate,c.climate);
    assert.ok(f.canopy>=0&&f.canopy<=1&&f.wet>=0&&f.wet<=1);
  }
  assert.equal(babonHabitat(0,0),null);assert.equal(babonTint(0,0),null);
});

test('new relief preserves foreign countries, offshore beds and coast except its authored river mouths',()=>{
  let foreign=0,sea=0,coast=0;
  for(let x=BABON_BOUNDS.minX-25;x<BABON_BOUNDS.maxX+25;x+=13)for(let z=BABON_BOUNDS.minZ-25;z<BABON_BOUNDS.maxZ+25;z+=13){
    const river=babonRiverAt(x,z,15),shore=landDistance(x,z);
    if(!babonOwns(x,z)&&!river){assert.equal(babonGround(x,z,18.25),18.25);foreign++;}
    if(!river&&shore<=2){assert.equal(babonGround(x,z,2.5),2.5);coast++;}
    if(!river){assert.equal(babonGround(x,z,SEA_LEVEL-.3),SEA_LEVEL-.3);sea++;}
    if(shore<0)assert.ok(babonGround(x,z,SEA_LEVEL-.5)<=SEA_LEVEL-.5);
  }
  assert.ok(foreign>100&&sea>100&&coast>100);
});

test('the broad northeastern reservation stays low and gently graded beneath connected jungle hills',()=>{
  const p=BABON_TATHILIUM_RESERVE;
  let low=0;
  for(let dx=-80;dx<=80;dx+=10)for(let dz=-30;dz<=30;dz+=10){
    const x=p.x+dx,z=p.z+dz;if(babonRiverAt(x,z,17))continue;
    assert.ok(heightAt(x,z)>5&&heightAt(x,z)<16);
    assert.ok(babonSlope(x,z,heightAt)<.23);
    assert.ok(babonHabitat(x,z).canopy<.3);low++;
  }
  assert.ok(low>30);
  const ridge=heightAt(-1765,3115),valley=heightAt(-1620,3050);
  assert.ok(ridge>110&&ridge<145);assert.ok(ridge-valley>25);
  assert.ok(babonHabitat(-1620,3050).wet>.8);
  assert.ok(babonHabitat(-1765,3115).ancient);
  for(const view of Object.values(BABON_VIEWS)){
    assert.ok(view.eye.y>heightAt(view.eye.x,view.eye.z)+1.5);
    assert.ok(view.target.y>=heightAt(view.target.x,view.target.z)-1);
  }
});

test('four real streams preserve all 21 atlas river edges and descend continuously into the sea',()=>{
  assert.equal(BABON_RIVER_EDGES.length,21);assert.ok(BABON_RIVER_EDGES.every(e=>e.size==='small'));
  assert.equal(BABON_RIVERS.length,4);
  let wet=0,ford=0;
  for(const river of BABON_RIVERS){
    assert.equal(river.samples.at(-1).y,SEA_LEVEL);
    assert.ok(landDistance(river.samples.at(-1).x,river.samples.at(-1).z)<0);
    for(let i=1;i<river.samples.length;i++){
      const p=river.samples[i],previous=river.samples[i-1];
      assert.ok(p.y<=previous.y+.00001,river.id);
      assert.ok(Math.hypot(p.x-previous.x,p.z-previous.z)<=3.01);
      if(p.halfWidth<.3)continue;
      assert.ok(Math.abs(babonWaterAt(p.x,p.z)-p.y)<.00001);
      const bed=heightAt(p.x,p.z);
      if(bed>=p.y){assert.ok(babonTrailDistance(p.x,p.z)<4.5,`${river.id} ${i} dry centre away from a gravel crossing`);ford++;}
      else wet++;
    }
  }
  assert.ok(wet>350&&ford>=2);
  assert.equal(babonWaterAt(BABON_ARRIVAL.x,BABON_ARRIVAL.z),null);
});

test('dry arrivals and winding trails work in both directions with actual walking, water and climbing rules',()=>{
  for(const p of [BABON_ARRIVAL,...BABON_LANDMARKS]){
    assert.equal(hexOwnerAt(p.x,p.z),BABON,p.id);assert.equal(babonWaterAt(p.x,p.z),null,p.id);
    assert.ok(canStand(p.x,p.z,world),p.id);
  }
  let moved=0;
  for(const trail of BABON_TRAILS)for(const reverse of [false,true]){
    const points=reverse?[...trail.points].reverse():trail.points;
    const at={...points[0],y:heightAt(points[0].x,points[0].z)};
    for(let j=1;j<points.length;j++){
      const a=points[j-1],b=points[j],steps=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.3);
      for(let i=1;i<=steps;i++){
        const x=a.x+(b.x-a.x)*i/steps,z=a.z+(b.z-a.z)*i/steps;
        moveCharacter(at,x-at.x,z-at.z,world,.34,{canTraverse:(x,z,nx,nz)=>canWalkSlope(x,z,nx,nz,world)});
        assert.ok(Math.hypot(at.x-x,at.z-z)<.001,`${trail.id} ${reverse} blocked at ${x},${z}`);
        at.y=heightAt(at.x,at.z);moved++;
      }
    }
  }
  assert.ok(moved>8500);
});

test('steep jungle faces use climbing while ordinary regions retain their existing walking rules',()=>{
  assert.ok(isClimbTerrain(world,-1830,3140));
  let face=null;
  for(let x=-1930;x<-1450&&!face;x+=9)for(let z=2930;z<3240;z+=9){
    if(babonRiverAt(x,z,18)||!canStand(x,z,world))continue;
    const sample=sampleClimbSurface(world,x,z);
    if(sample.climbable&&sample.slope<2.5){face={x,z,sample};break;}
  }
  assert.ok(face,'a real steep jungle face can be climbed');
  assert.equal(canWalkSlope(face.x,face.z,face.x+face.sample.gradient.x*.3,face.z+face.sample.gradient.z*.3,world),false);
  const ordinary={...world,regionAt:()=>1};
  assert.equal(canWalkSlope(face.x,face.z,face.x+face.sample.gradient.x*.3,face.z+face.sample.gradient.z*.3,ordinary),true);
});

const THREE=await sourceModule('../vendor/three.module.js');
const {refineBabonGround}=await sourceModule('../src/content/regions/babon/babon-ground.js');
test('bounded refinement resolves narrow water beds without adding a second ground layer or a seam',()=>{
  const p=BABON_RIVERS[0].samples[45],root=new THREE.Group(),positions=[],indices=[],N=16,size=8;
  for(let row=0;row<=N;row++)for(let col=0;col<=N;col++){
    const x=p.x+(col-N/2)*size,z=p.z+(row-N/2)*size;positions.push(x,heightAt(x,z),z);
  }
  for(let row=0;row<N;row++)for(let col=0;col<N;col++){
    const a=row*(N+1)+col,b=a+1,c=a+N+1,d=c+1;indices.push(a,c,b,b,c,d);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);
  geometry.computeBoundingBox();geometry.computeBoundingSphere();
  const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial());root.add(mesh);
  const result=refineBabonGround({THREE,terrainRoot:root,heightAt,coarseHeightAt:heightAt});
  assert.ok(result.metrics.removedTriangles>0&&result.metrics.removedTriangles<indices.length/3);
  assert.ok(result.metrics.spacing<=1&&result.metrics.vertices<60000);
  assert.equal(geometry.index.count/3+result.metrics.removedTriangles,indices.length/3);
  assert.ok(result.patches.length>0);
  let checked=0;
  for(const sample of BABON_RIVERS[0].samples){
    if(Math.hypot(sample.x-p.x,sample.z-p.z)>30||babonTrailDistance(sample.x,sample.z)<5)continue;
    assert.ok(result.heightAt(sample.x,sample.z)<sample.y-.08,'refined channel remains visibly under water');checked++;
  }
  assert.ok(checked>12);
  const rerun=refineBabonGround({THREE,terrainRoot:root,heightAt,coarseHeightAt:heightAt});
  assert.equal(rerun.metrics.removedTriangles,0,'streaming cannot duplicate refined ground');
});

test('exposed rocky shores and sheltered sand pockets retain distinct tide-edge palettes',()=>{
  let rock=0,sand=0;
  for(let x=BABON_BOUNDS.minX;x<BABON_BOUNDS.maxX;x+=8)for(let z=BABON_BOUNDS.minZ;z<BABON_BOUNDS.maxZ;z+=8){
    const d=landDistance(x,z),t=babonShoreTint(x,z,d);
    if(!t)continue;if(t.rock>.99)rock++;if(t.sand===1)sand++;
  }
  assert.ok(rock>100&&sand>50);
  assert.equal(babonShoreTint(0,0,0),null);
});
