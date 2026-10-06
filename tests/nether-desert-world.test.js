import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './module-loader.js';
import { NETHER_DESERT_CELLS, NETHER_DESERT_OUTLINES, NETHER_DESERT_BOUNDS, NETHER_DESERT_ARRIVAL,
  NETHER_DESERT_LANDMARKS, NETHER_DESERT_TRAILS, NETHER_DESERT_PANS, netherDesertOwns,
  netherDesertGround, netherDesertTint, netherDesertInset, netherDesertFeatures,
  netherDesertRiverDistance } from '../src/content/regions/nether-desert/nether-desert-world.js';
import { NETHER_DESERT_WILDLIFE_ZONES } from '../src/content/regions/nether-desert/nether-desert-wildlife.js';
import { NETH_HEAD, NETH } from '../src/content/regions/western-regions/west-regions.js';
import { courseSurface } from '../src/content/regions/western-regions/west-ground.js';
import { groundWithRiver } from '../src/world/terrain/world-terrain.js';
import { regionAt, hexOwnerAt } from '../src/world/terrain/region-world.js';

test('The Nether Desert owns all 26 atlas cells without changing neighbouring ground',()=>{
  assert.equal(NETHER_DESERT_CELLS.length,26);
  for(const c of NETHER_DESERT_CELLS){assert.ok(netherDesertOwns(c.x,c.z));assert.equal(regionAt(c.x,c.z).name,'Nether Desert');}
  for(const [x,z] of [[0,0],[-2650,300],[-3200,720],[-2100,800]]) {
    assert.equal(netherDesertGround(x,z,17.234),17.234);assert.equal(netherDesertTint(x,z),null);
  }
});

test('The stony plateau contribution fades continuously at every authored boundary edge',()=>{
  let checked=0;
  for(const loop of NETHER_DESERT_OUTLINES)for(let i=0;i<loop.length;i++) {
    const a=loop[i],b=loop[(i+1)%loop.length],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);
    for(const t of [.2,.5,.8])for(const sign of [-1,1]) {
      const x=a.x+dx*t+dz/len*.06*sign,z=a.z+dz*t-dx/len*.06*sign;
      assert.ok(Math.abs(netherDesertGround(x,z,17)-17)<.001,`edge ${x},${z}`);checked++;
    }
  }
  assert.ok(checked>100);
});

test('The ground joins every built neighbour along the whole border, corners included',async t=>{
  const THREE=await sourceModule('../vendor/three.module.js');
  const {scopedWorld}=await import('./scoped-world.js');
  const world=await scopedWorld(new THREE.Scene(),[58,57,26,25,17]);
  const loop=NETHER_DESERT_OUTLINES[0],R=100/Math.sqrt(3),lines=[];
  assert.equal(NETHER_DESERT_OUTLINES.length,1);
  for(let i=0;i<loop.length;i++){
    const a=loop[i],b=loop[(i+1)%loop.length],length=Math.hypot(b.x-a.x,b.z-a.z),mx=(a.x+b.x)/2,mz=(a.z+b.z)/2;
    let nx=(b.z-a.z)/length,nz=-(b.x-a.x)/length;
    if(netherDesertOwns(mx+nx,mz+nz)){nx=-nx;nz=-nz;}
    lines.push({a,b,length,nx,nz,across:hexOwnerAt(mx+nx,mz+nz)});
  }
  const built=['East Pyros','Oves Desert','Ovesos','Nethereum','West Pyros','East Ibenwood'];
  assert.deepEqual(new Set(lines.map(l=>l.across)),new Set([...built,'Open country']));
  // Where two of a neighbour's own hexes meet this line, the hex edge between them is theirs, and so is any step
  // along it: this side meets each of them at the line and cannot meet both halves of a step at the corner.
  const theirs=loop.filter((v,i)=>{
    const p=loop[(i+loop.length-1)%loop.length],q=loop[(i+1)%loop.length];
    const tx=2*v.x-p.x-q.x,tz=2*v.z-p.z-q.z,l=Math.hypot(tx,tz);
    return !netherDesertOwns(v.x+tx/l*3,v.z+tz/l*3);
  });
  let worst=0,count=0,skipped=0,atTheirs=0;
  for(const l of lines){
    if(!built.includes(l.across))continue;
    for(let s=0;s<=l.length+1e-9;s+=.5){
      const x=l.a.x+(l.b.x-l.a.x)*s/l.length,z=l.a.z+(l.b.z-l.a.z)*s/l.length;
      // A tenth of a metre either side: a step reads the same at any width, the steep ground of the ribs does not.
      const step=Math.abs(world.heightAt(x+l.nx*.1,z+l.nz*.1)-world.heightAt(x-l.nx*.1,z-l.nz*.1));
      if(theirs.some(v=>Math.hypot(x-v.x,z-v.z)<1.5)){skipped++;atTheirs=Math.max(atTheirs,step);continue;}
      assert.ok(step<.5,`${l.across} border steps ${step.toFixed(2)} m at ${x.toFixed(1)},${z.toFixed(1)}`);
      worst=Math.max(worst,step);count++;
    }
  }
  assert.ok(count>4000);assert.ok(skipped<theirs.length*8);
  // And this side's own hex edges, where they run in from the border: no step of its own anywhere.
  const cells=new Set(NETHER_DESERT_CELLS.map(c=>`${c.q},${c.r}`));let inner=0,innerWorst=0;
  for(const c of NETHER_DESERT_CELLS)for(let k=0;k<6;k++){
    const t0=Math.PI/180*(60*k+30),t1=t0+Math.PI/3,a={x:c.x+R*Math.cos(t0),z:c.z+R*Math.sin(t0)},b={x:c.x+R*Math.cos(t1),z:c.z+R*Math.sin(t1)};
    const length=Math.hypot(b.x-a.x,b.z-a.z),nx=(b.z-a.z)/length,nz=-(b.x-a.x)/length;
    if(!netherDesertOwns((a.x+b.x)/2+nx,(a.z+b.z)/2+nz)||!netherDesertOwns((a.x+b.x)/2-nx,(a.z+b.z)/2-nz))continue;
    for(let s=0;s<=length+1e-9;s+=.5){
      const x=a.x+(b.x-a.x)*s/length,z=a.z+(b.z-a.z)*s/length;
      const step=Math.abs(world.heightAt(x+nx*.1,z+nz*.1)-world.heightAt(x-nx*.1,z-nz*.1));
      assert.ok(step<.5,`own hex edge steps ${step.toFixed(2)} m at ${x.toFixed(1)},${z.toFixed(1)}`);
      innerWorst=Math.max(innerWorst,step);inner++;
    }
  }
  assert.ok(cells.size===26&&inner>5000);
  t.diagnostic(`worst step across the border ${worst.toFixed(2)} m in ${count} half-metre samples; `+
    `${skipped} samples by ${theirs.length} neighbours' own corners (worst ${atTheirs.toFixed(2)} m, theirs); own hex edges ${innerWorst.toFixed(2)} m in ${inner}`);
});

test('The upper and lower Neth retain their real water level and unobstructed channel',()=>{
  for(const river of [NETH_HEAD,NETH])for(const p of river.samples) {
    for(const offset of [-3,0,3]) {
      const x=p.x+p.nx*offset,z=p.z+p.nz*offset;
      assert.equal(netherDesertGround(x,z,2.375),2.375,`${river.id}: channel was changed`);
    }
    assert.ok(groundWithRiver(p.x,p.z)<courseSurface(river,p.x,p.z),`${river.id}: dry river bed`);
  }
});

test('The interior stays a modest walkable plateau with shallow dry pans and no dune-sized mountains',()=>{
  const b=NETHER_DESERT_BOUNDS;let samples=0,high=-Infinity,low=Infinity,maxGrade=0;
  for(let x=b.minX;x<b.maxX;x+=12)for(let z=b.minZ;z<b.maxZ;z+=12) {
    if(!netherDesertOwns(x,z)||netherDesertInset(x,z)<74||netherDesertRiverDistance(x,z)<65)continue;
    const f=netherDesertFeatures(x,z);samples++;high=Math.max(high,f.height);low=Math.min(low,f.height);maxGrade=Math.max(maxGrade,f.grade);
    assert.ok(f.height>20&&f.height<46);assert.ok(f.grade<.68,`steep plateau ${x},${z}: ${f.grade}`);
  }
  assert.ok(samples>400);assert.ok(high-low>7,'The plateau should still have readable low relief.');
  for(const p of NETHER_DESERT_PANS){const f=netherDesertFeatures(p.x,p.z);assert.equal(f.pan,1);assert.ok(p.depth<1.5);}
});

test('Arrival and natural landmark walks are fully inside the region and comfortable on the actual ground',()=>{
  assert.ok(NETHER_DESERT_LANDMARKS.length>=4);
  for(const path of NETHER_DESERT_TRAILS) {
    const [a,b]=path.points,len=Math.hypot(b.x-a.x,b.z-a.z);
    assert.deepEqual(a,NETHER_DESERT_ARRIVAL);
    for(let t=0;t<=1;t+=1/Math.ceil(len/1.5)) {
      const x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;
      assert.ok(netherDesertOwns(x,z));
      const grade=Math.hypot(groundWithRiver(x+1,z)-groundWithRiver(x-1,z),groundWithRiver(x,z+1)-groundWithRiver(x,z-1))/2;
      assert.ok(grade<.63,`${path.id} ${x},${z}: ${grade}`);
    }
  }
});

test('Sparse desert wildlife has terrestrial homes on gentle dry habitat, including wash browsers and basking lizards',()=>{
  const species=new Set(NETHER_DESERT_WILDLIFE_ZONES.map(z=>z.species));
  for(const s of ['spine-lizard','upland-hare','canyon-tortoise','bone-bird'])assert.ok(species.has(s),s);
  let groundAnimals=0;
  for(const zone of NETHER_DESERT_WILDLIFE_ZONES)for(const [x,z] of zone.sites) {
    assert.ok(netherDesertOwns(x,z));const f=netherDesertFeatures(x,z);
    assert.ok(f.riverDistance>20);assert.ok(f.inset>12);
    if(zone.air)continue;
    groundAnimals++;assert.ok(f.grade<=zone.maxSlope);assert.ok(f.height>=zone.minHeight&&f.height<=zone.maxHeight);
    if(zone.species!=='spine-lizard')assert.ok(f.washDistance<24,'Browsers need wash vegetation.');
  }
  assert.ok(groundAnimals>=10&&groundAnimals<=18);
});

test('Desert scenery is bounded, grounded, visibly collidable only at real slabs and clear along natural walks',async()=>{
  const THREE=await sourceModule('../vendor/three.module.js');
  const {createNetherDesertScenerySteps}=await sourceModule('../src/content/regions/nether-desert/nether-desert-scenery.js');
  const parent=new THREE.Group(),colliders=[];
  // Distinct rendered surface verifies every prop uses the supplied mesh height
  // callback, rather than silently reverting to the logical height field.
  const rendered=(x,z)=>groundWithRiver(x,z)+.12;
  const it=createNetherDesertScenerySteps({parent,heightAt:groundWithRiver,renderedGroundHeight:rendered,colliders});
  let step,n=0;do{step=it.next();n++;}while(!step.done);
  const s=step.value;
  assert.ok(n>100,'Fast mode needs cooperative yields.');
  assert.equal(s.metrics.cells,26);assert.equal(s.metrics.pans,3);
  assert.ok(s.metrics.vertices<340000,`${s.metrics.vertices} vertices`);assert.ok(s.metrics.batches<=30);
  assert.ok(s.metrics.shrubs>100&&s.metrics.rocks>1000&&s.metrics.tufts>100);
  for(const p of s.placements) {
    assert.ok(netherDesertOwns(p.x,p.z));
    if(p.kind!=='rock')assert.ok(Math.abs(p.y-rendered(p.x,p.z))<1e-8,`${p.kind}: not grounded`);
    else assert.ok(p.y<=rendered(p.x,p.z));
  }
  assert.equal(s.metrics.colliders,colliders.length);assert.ok(colliders.length>0&&colliders.length<25);
  for(const c of colliders){assert.equal(c.kind,'rock');assert.ok(c.maxY-c.minY<1.3);assert.ok(c.maxY>rendered(c.x,c.z));}
  for(const path of NETHER_DESERT_TRAILS) {
    const [a,b]=path.points,len=Math.hypot(b.x-a.x,b.z-a.z);
    for(let d=0;d<=len;d+=1)for(const c of colliders)
      assert.ok(Math.hypot(a.x+(b.x-a.x)*d/len-c.x,a.z+(b.z-a.z)*d/len-c.z)>c.r+.7,`${path.id}: slab blocks the walk`);
  }
  for(const child of s.root.children){assert.ok(child.isMesh);assert.ok(child.geometry.boundingSphere.radius<100);}
  // Every pan's first triangle must face upward, otherwise the dry silt vanishes.
  for(const p of NETHER_DESERT_PANS){const mesh=s.root.children.find(m=>m.name===`Nether Desert — ${p.id}`);assert.ok(mesh.geometry.attributes.normal.getY(0)>.8);}
});
