import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './module-loader.js';
import { EAST_PYROS, EAST_PYROS_CELLS, EAST_PYROS_OUTLINES, EAST_PYROS_POOLS,
  EAST_PYROS_LANDMARKS, EAST_PYROS_ARRIVAL, EAST_PYROS_ROUTES, EAST_PYROS_VIEWS,
  eastPyrosGround, eastPyrosWaterAt, eastPyrosRiverClearance, eastPyrosTint } from '../src/content/regions/east-pyros/east-pyros-world.js';
import { EAST_PYROS_WILDLIFE_ZONES } from '../src/content/regions/east-pyros/east-pyros-wildlife.js';
import { hexOwnerAt, landDistance } from '../src/world/terrain/region-world.js';
import { groundWithRiver as heightAt } from '../src/world/terrain/world-terrain.js';
import { timberForSpecies } from '../src/gameplay/skills/woodcutting/wood-species.js';

const THREE=await import('three');
const {createEastPyrosScenerySteps}=await sourceModule('../src/content/regions/east-pyros/east-pyros-scenery.js');
const {getTreeRegistry}=await sourceModule('../src/world/scenery/tree-registry.js');
const gradient=(x,z)=>Math.hypot(heightAt(x+.5,z)-heightAt(x-.5,z),heightAt(x,z+.5)-heightAt(x,z-.5));
let fixture;
function scenery(){
  if(fixture)return fixture;
  const parent=new THREE.Group(),colliders=[];
  const steps=createEastPyrosScenerySteps({parent,heightAt,colliders});let step,yields=0;
  do{step=steps.next();yields++;}while(!step.done);
  return fixture={...step.value,parent,colliders,yields};
}
const clear=(colliders,x,z,r=.55)=>colliders.every(c=>Math.hypot(x-c.x,z-c.z)>c.r+r);

test('East Pyros uses its 33 surveyed open-country hexes, with owned, dry discovery and arrival points',()=>{
  assert.equal(EAST_PYROS_CELLS.length,33);
  assert.equal(EAST_PYROS_CELLS.filter(c=>c.terrain==='plains').length,32);
  assert.equal(EAST_PYROS_CELLS.filter(c=>c.terrain==='grassland').length,1);
  for(const p of [EAST_PYROS_ARRIVAL,...EAST_PYROS_LANDMARKS]){
    assert.equal(hexOwnerAt(p.x,p.z),EAST_PYROS,p.name);
    assert.ok(landDistance(p.x,p.z)>20,p.name);
    assert.ok(heightAt(p.x,p.z)>2,p.name);
    assert.equal(eastPyrosWaterAt(p.x,p.z),null,p.name);
  }
  for(const v of Object.values(EAST_PYROS_VIEWS))for(const p of [v.eye,v.target])assert.ok([p.x,p.y,p.z].every(Number.isFinite));
});

test('the region leaves neighbours, the coast and Vaellir banks unchanged, with continuous owned edges',()=>{
  const baseline=13.25;
  for(let z=820;z<=1660;z+=17)for(let x=-3070;x<=-2280;x+=17){
    const h=eastPyrosGround(x,z,baseline);
    assert.ok(Number.isFinite(h));
    if(hexOwnerAt(x,z)!==EAST_PYROS||landDistance(x,z)<=8||eastPyrosRiverClearance(x,z)<=25)assert.equal(h,baseline,`${x},${z}`);
  }
  for(const loop of EAST_PYROS_OUTLINES)for(let i=0;i<loop.length;i++){
    const a=loop[i],b=loop[(i+1)%loop.length];
    for(const t of [.17,.5,.83]){
      const x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;
      assert.ok(Math.abs(eastPyrosGround(x,z,baseline)-baseline)<.001);
      for(const [dx,dz]of[[.05,0],[-.05,0],[0,.05],[0,-.05]])assert.ok(Math.abs(eastPyrosGround(x+dx,z+dz,baseline)-baseline)<.001);
    }
  }
  assert.equal(eastPyrosTint(0,0),null);
});

test('the ground joins the Oves Desert along the whole border, and Telemonia by the corner the three share',async t=>{
  const {scopedWorld}=await import('./scoped-world.js');
  const world=await scopedWorld(new THREE.Scene(),[57,26,55]);
  const lines=[];
  for(const loop of EAST_PYROS_OUTLINES)for(let i=0;i<loop.length;i++){
    const a=loop[i],b=loop[(i+1)%loop.length],length=Math.hypot(b.x-a.x,b.z-a.z),mx=(a.x+b.x)/2,mz=(a.z+b.z)/2;
    let nx=(b.z-a.z)/length,nz=-(b.x-a.x)/length;
    if(hexOwnerAt(mx+nx,mz+nz)===EAST_PYROS){nx=-nx;nz=-nz;}
    lines.push({a,b,length,nx,nz,across:hexOwnerAt(mx+nx,mz+nz)});
  }
  const desert=lines.filter(l=>l.across==='Oves Desert'),ends=desert.flatMap(l=>[l.a,l.b]);
  assert.equal(desert.length,5);
  // Both ends of the desert's line: Telemonia's corner, and the Nether Desert's.
  assert.deepEqual(new Set(lines.filter(l=>l.across!=='Oves Desert'&&ends.some(p=>[l.a,l.b].some(q=>Math.hypot(p.x-q.x,p.z-q.z)<.01))).map(l=>l.across)),new Set(['Telemonia','Nether Desert']));
  let worst=0,count=0;
  for(const l of lines){
    if(l.across!=='Oves Desert'&&l.across!=='Telemonia')continue;
    for(let s=0;s<=l.length;s+=.5){
      const x=l.a.x+(l.b.x-l.a.x)*s/l.length,z=l.a.z+(l.b.z-l.a.z)*s/l.length;
      // Telemonia's own border is its test's (tests/telemonia-world.test.js); here, only its first metres off the corner.
      if(l.across==='Telemonia'&&!ends.some(p=>Math.hypot(x-p.x,z-p.z)<45))continue;
      const step=Math.abs(world.heightAt(x+l.nx*.25,z+l.nz*.25)-world.heightAt(x-l.nx*.25,z-l.nz*.25));
      assert.ok(step<.5,`${l.across} border steps ${step.toFixed(2)} m at ${x.toFixed(1)},${z.toFixed(1)}`);
      worst=Math.max(worst,step);count++;
    }
  }
  assert.ok(count>600);
  t.diagnostic(`worst step across the border ${worst.toFixed(2)} m in ${count} half-metre samples`);
});

test('thermal water is confined to two shallow basins and joins dry ground at the visible shore',()=>{
  assert.equal(EAST_PYROS_POOLS.length,2);
  for(const pool of EAST_PYROS_POOLS){
    assert.ok(Math.abs(pool.surfaceY-heightAt(pool.x,pool.z)-pool.depth)<.00001);
    assert.ok(pool.depth<1);
    for(let i=0;i<48;i++){
      const a=i*Math.PI/24,point=r=>({x:pool.x+Math.cos(a)*pool.radius*r,z:pool.z+Math.sin(a)*pool.radius*r});
      for(const r of [.1,.35,.6,.725]){
        const p=point(r);assert.equal(eastPyrosWaterAt(p.x,p.z),pool.surfaceY);
        assert.ok(heightAt(p.x,p.z)<pool.surfaceY);
      }
      const shore=point(.73),rim=point(.9),outside=point(2.5);
      assert.ok(Math.abs(heightAt(shore.x,shore.z)-pool.surfaceY)<.00001);
      assert.ok(heightAt(rim.x,rim.z)>pool.surfaceY);
      assert.equal(eastPyrosWaterAt(outside.x,outside.z),null);
    }
  }
});

test('open valleys and dry travel points remain traversable after real scenery is placed',()=>{
  const {colliders}=scenery();
  for(const p of [EAST_PYROS_ARRIVAL,...EAST_PYROS_LANDMARKS])assert.ok(clear(colliders,p.x,p.z),p.id??'arrival');
  for(const route of EAST_PYROS_ROUTES)for(let j=1;j<route.points.length;j++){
    const a=route.points[j-1],b=route.points[j],length=Math.hypot(b.x-a.x,b.z-a.z),steps=Math.ceil(length*2);
    let previous=heightAt(a.x,a.z);
    for(let i=0;i<=steps;i++){
      const x=a.x+(b.x-a.x)*i/steps,z=a.z+(b.z-a.z)*i/steps,y=heightAt(x,z);
      assert.equal(hexOwnerAt(x,z),EAST_PYROS,route.id);
      assert.ok(clear(colliders,x,z),`${route.id} blocker at ${x},${z}`);
      assert.equal(eastPyrosWaterAt(x,z),null,route.id);
      if(i)assert.ok(Math.abs(y-previous)/(length/steps)<.8,`${route.id} excessive gradient`);
      previous=y;
    }
  }
});

test('six typed tree species stay grounded, harvestable, and within bounded streaming geometry',()=>{
  const f=scenery(),registry=getTreeRegistry(f.colliders);
  assert.ok(f.yields>100&&f.yields<2500);
  assert.ok(f.metrics.trees>=100&&f.metrics.trees<230);
  assert.equal(new Set(f.trees.map(t=>t.species)).size,6);
  assert.equal(f.trees.length,registry.trees.length);
  assert.ok(f.metrics.batches<=100);
  assert.ok(f.metrics.vertices<350000);
  assert.ok(f.metrics.tufts>4000&&f.metrics.shrubs>300);
  for(const tree of f.trees){
    assert.ok(timberForSpecies(tree.species));assert.ok(registry.standing(tree.id));
    assert.ok(tree.harvestable&&tree.log);
    assert.equal(hexOwnerAt(tree.x,tree.z),EAST_PYROS);
    assert.ok(tree.y>1.2);
    assert.ok(tree.base.y<=heightAt(tree.x,tree.z)+.001,tree.id);
  }
  const tree=f.trees[0],oldColliders=f.colliders.length;
  assert.ok(registry.set(tree.id,false));assert.equal(f.colliders.length,oldColliders-1);
  assert.ok(registry.regrow(tree.id));assert.equal(f.colliders.length,oldColliders);
  f.root.traverse(object=>{
    if(object.geometry)for(const value of object.geometry.attributes.position.array)assert.ok(Number.isFinite(value));
  });
  f.update(31);
});

test('persistent wildlife includes terrestrial and aerial species on valid, clear ground',()=>{
  const {colliders}=scenery(),zones=EAST_PYROS_WILDLIFE_ZONES;
  assert.equal(new Set(zones.map(z=>z.id)).size,zones.length);
  const species=new Set(zones.map(z=>z.species));
  for(const s of ['road-fox','spine-lizard','upland-hare','boar','plateau-hawk','harrier'])assert.ok(species.has(s));
  for(const zone of zones)for(const[x,z]of zone.sites){
    assert.equal(hexOwnerAt(x,z),EAST_PYROS,zone.id);
    assert.ok(zone.keepRegion&&x>=zone.minX&&x<=zone.maxX&&z>=zone.minZ&&z<=zone.maxZ);
    assert.equal(eastPyrosWaterAt(x,z),null,zone.id);
    if(!zone.air){
      assert.ok(heightAt(x,z)>2,zone.id);assert.ok(clear(colliders,x,z,zone.radius),zone.id);
      assert.ok(gradient(x,z)<zone.maxSlope,`${zone.id} ${gradient(x,z)}`);
    }
  }
});
