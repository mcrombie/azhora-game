import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { IBENWOOD, IBENWOOD_REGION, grovePoint, GROVE_ROUTE, GROVE_LOOP, GROVE_SPAWN, GROVE_WOOD, GROVE_WILDLIFE, groveTrees, groveGround } from '../src/content/regions/ibenwood/ibenwood-pilot.js';
import { hexAt, hexCentre, WORLD_BOUNDS, regions } from '../src/world/terrain/region-world.js';
import { canStand, moveCharacter } from '../src/gameplay/movement/game-state.js';
import { createWoodcutting } from '../src/gameplay/skills/woodcutting/woodcutting.js';
import { createRoadCheckpoint } from '../src/app/saves/road-checkpoint.js';
import { createInventoryState } from '../src/gameplay/inventory/inventory.js';
import { createWeapons } from '../src/gameplay/combat/weapons.js';
import { createCampcraft } from '../src/gameplay/skills/crafting/campcraft.js';
import { createJourney } from '../src/content/chapters/journey/journey.js';
import { createForestStory } from '../src/content/quests/forest/forest-story.js';
import { METRES_PER_HEX } from '../src/world/terrain/world-scale.js';
import { AMBRON_LAYOUT_VERSION } from '../src/content/regions/ambron/ambron-city-layout.js';
const {createIbenwoodScenery}=await sourceModule('../src/content/regions/ibenwood/ibenwood-scenery.js');
const {cutGroveGround}=await sourceModule('../src/content/regions/ibenwood/ibenwood-ground.js');
const {getTreeRegistry}=await sourceModule('../src/world/scenery/tree-registry.js');
const heightAt=(x,z)=>groveGround(x,z,()=>22);
function build(){
  const parent=new THREE.Group(),colliders=[],terrainRoot=new THREE.Group();parent.add(terrainRoot);
  const xs=[],zs=[],positions=[],indices=[],edge=WORLD_BOUNDS.minX-80;
  for(let x=edge;x<IBENWOOD.x+110;x+=7)xs.push(x);
  for(let z=WORLD_BOUNDS.minZ-80;z<WORLD_BOUNDS.maxZ+80;z+=7)zs.push(z);zs.push(WORLD_BOUNDS.maxZ+80);
  for(let j=0;j<zs.length;j++)for(let i=0;i<xs.length;i++){
    positions.push(xs[i],heightAt(xs[i],zs[j]),zs[j]);
    if(i<xs.length-1&&j<zs.length-1){const k=j*xs.length+i;indices.push(k,k+xs.length,k+1,k+1,k+xs.length,k+xs.length+1);}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);
  const original=geometry.attributes.position.array.slice();terrainRoot.add(new THREE.Mesh(geometry,new THREE.MeshBasicMaterial()));
  const terrain={xs,zs,positions},pilot=createIbenwoodScenery({parent,heightAt,colliders,terrain,terrainRoot});
  parent.updateMatrixWorld(true);
  return {pilot,parent,colliders,heightAt,terrain,terrainRoot,original,bounds:{...WORLD_BOUNDS,minX:IBENWOOD.x-88}};
}
test('all pilot trees and architecture occupy actual East Ibenwood atlas cells',()=>{
  const atlas=JSON.parse(fs.readFileSync(new URL('../assets/azhora-dev-regions.json',import.meta.url))),cells=atlas.regions.find(r=>r.name==='East Ibenwood').cells;
  const owns=p=>{const h=hexAt(p.x,p.z);return cells.some(c=>c.q===h.q&&c.r===h.r);};
  assert.deepEqual(hexCentre(IBENWOOD.atlas.q,IBENWOOD.atlas.r),{x:IBENWOOD.x,z:IBENWOOD.z});
  assert.equal(regions.find(r=>r.id===IBENWOOD_REGION.id).name,'East Ibenwood');assert.ok(![28,29,30,31].includes(IBENWOOD_REGION.id));
  assert.equal(IBENWOOD_REGION.partial,true);assert.match(IBENWOOD_REGION.subtitle,/Partial grove pilot/);
  const w=build();for(const p of [...groveTrees(),...w.pilot.buildings,...GROVE_ROUTE,...GROVE_LOOP])assert.ok(owns(p),JSON.stringify(p));
  for(let a=0;a<Math.PI*2;a+=.05)assert.ok(owns(grovePoint(Math.sin(a)*88,Math.cos(a)*88)));
});
test('the forest is batched, species-aware, grounded, and protected through the real woodcutting API',()=>{
  const w=build(),registry=getTreeRegistry(w.colliders),wood=createWoodcutting({trees:registry.trees,skills:{level:()=>99}});
  assert.ok(registry.trees.length>90);assert.equal(new Set(registry.trees.map(t=>t.species)).size,6);
  assert.ok(registry.trees.some(t=>t.age==='sapling'));assert.equal(registry.trees.filter(t=>t.age==='veteran').length,9);
  for(const tree of registry.trees){assert.equal(tree.base.y,heightAt(tree.x,tree.z));assert.equal(tree.harvestable,false);assert.match(wood.canChop(tree.id,()=>true).reason,/Felling living trees is forbidden/);assert.equal(registry.fell(tree.id),false);assert.equal(registry.standing(tree.id),true);assert.equal(canStand(tree.x,tree.z,w),false);}
  assert.ok(w.pilot.metrics.treeBatches<=24);assert.equal(w.pilot.metrics.staticMeshes,3);
  assert.ok(w.pilot.metrics.triangles<180000,'the entire grove geometry stays within a modest low-poly triangle budget');
  const positions=w.pilot.floor.geometry.attributes.position;
  for(let i=0;i<positions.count;i++)if(Math.max(Math.abs(positions.getX(i)-IBENWOOD.x),Math.abs(positions.getZ(i)-IBENWOOD.z))<79)assert.ok(Math.abs(positions.getY(i)-heightAt(positions.getX(i),positions.getZ(i))-.025)<.002);
  const matrix=new THREE.Matrix4(),foot=new THREE.Vector3();
  for(const mesh of w.pilot.root.children.filter(m=>m.name.startsWith('Ibenwood trunk ')))for(let i=0;i<mesh.count;i++){
    mesh.getMatrixAt(i,matrix);let closest=Infinity;
    for(let k=0;k<9;k++){
      foot.set(Math.sin(k*Math.PI*2/9),-.5,Math.cos(k*Math.PI*2/9)).applyMatrix4(matrix);
      const gap=heightAt(foot.x,foot.z)-foot.y;assert.ok(gap>=.02,'rendered trunk foot must not float');closest=Math.min(closest,gap);
    }
    assert.ok(closest<.12,'the rendered bole meets the ground instead of being deeply buried');
  }
});
test('ordinary movement completes the arrival, grove circuit, and fallen-wood approaches without crossing colliders',()=>{
  const w=build();
  for(const route of [GROVE_ROUTE,GROVE_LOOP]){
    const pos={...route[0]};assert.ok(canStand(pos.x,pos.z,w));
    for(const target of route.slice(1)){
      const length=Math.hypot(target.x-pos.x,target.z-pos.z),steps=Math.ceil(length/.1),dx=(target.x-pos.x)/steps,dz=(target.z-pos.z)/steps;
      for(let i=0;i<steps;i++){moveCharacter(pos,dx,dz,w);assert.ok(canStand(pos.x,pos.z,w));}
      assert.ok(Math.hypot(pos.x-target.x,pos.z-target.z)<.01,`blocked route to ${JSON.stringify(target)} from ${JSON.stringify(pos)}`);
    }
  }
  for(const wood of GROVE_WOOD)assert.ok(canStand(wood.x,wood.z,w));
  for(const b of w.pilot.buildings.filter(b=>b.kind!=='branch'))assert.equal(canStand(b.x,b.z,w),false);
  // Flood fill actual collision space proves the open portico and domestic approaches connect.
  const start=grovePoint(-7,0),seen=new Set(),queue=[[Math.round(start.x),Math.round(start.z)]];
  for(let i=0;i<queue.length;i++){
    const [x,z]=queue[i],key=`${x},${z}`;if(seen.has(key)||Math.hypot(x-IBENWOOD.x,z-IBENWOOD.z)>72||!canStand(x,z,w))continue;
    seen.add(key);for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]])if(!seen.has(`${x+dx},${z+dz}`))queue.push([x+dx,z+dz]);
  }
  for(const p of [grovePoint(-31,-9),grovePoint(-22,-12),grovePoint(-45,-17),...GROVE_WOOD])assert.ok(seen.has(`${Math.round(p.x)},${Math.round(p.z)}`),`unreachable ${JSON.stringify(p)}`);
});
test('persistent resident wildlife spans forest habitats and has standable ground sites',async()=>{
  const w=build(),{createWestLife}=await sourceModule('../src/content/regions/western-regions/west-regions-life.js');
  const life=createWestLife(w.parent,w,{zones:GROVE_WILDLIFE});
  assert.equal(life.state().creatures.length,8);assert.ok(life.state().creatures.some(a=>a.species==='boar'));assert.ok(life.state().creatures.some(a=>a.species==='red-deer'));
  for(const a of life.state().creatures.filter(a=>a.species!=='plateau-hawk'))assert.ok(canStand(a.x,a.z,w));
  const animals=life.state().creatures,before=life.snapshot();life.update(.1,grovePoint(20,40),true);
  assert.equal(life.state().creatures,animals);assert.deepEqual(life.snapshot().creatures.map(a=>a.id),before.creatures.map(a=>a.id));
});
test('pilot position and fallen wood round-trip while old saves and invalid pickup rejection remain intact',()=>{
  const inventory=createInventoryState();inventory.grant('simple-sword');
  const weapons=createWeapons({inventory}),camp=createCampcraft({inventory,weapons}),story=createForestStory({inventory,weapons});
  let raw=null;const checkpoint=createRoadCheckpoint({storage:{getItem:()=>raw,setItem:(_,value)=>raw=value}});
  const data={version:1,ambronLayoutVersion:AMBRON_LAYOUT_VERSION,questStage:1,journey:createJourney().snapshot(),inventory:[{id:'simple-sword',quantity:1}],weapons:weapons.snapshot(),
    journeyGathered:[],meadowCleared:false,worldScale:METRES_PER_HEX,position:GROVE_SPAWN,heardDoom:false,health:81,
    woodland:{version:1,acornStatus:'available',practiceHits:0,practiceDodges:0,acorns:[],sticks:GROVE_WOOD.map(s=>s.id),fruits:[],discoveries:[],camp:camp.checkpoint()},forestStory:story.snapshot()};
  assert.equal(checkpoint.save(data).ok,true);assert.deepEqual(checkpoint.read().data,data);
  const saved=raw;assert.equal(checkpoint.save({...data,woodland:{...data.woodland,sticks:['ibenwood-fallen-3']}}).ok,false);assert.equal(raw,saved);
  const legacy={...data,position:{x:0,z:16},woodland:{...data.woodland,sticks:['stick-2-1']}};assert.equal(checkpoint.save(legacy).ok,true);assert.deepEqual(checkpoint.read().data,legacy);
});


test('rendered surfaces cover the pilot within the expanded western terrain and meet without overlapping faces',()=>{
  const w=build(),ray=new THREE.Raycaster(),meshes=[w.pilot.floor,w.pilot.apron,...w.terrainRoot.children];
  function hits(x,z){ray.set(new THREE.Vector3(x,1000,z),new THREE.Vector3(0,-1,0));return ray.intersectObjects(meshes,false);}
  for(let z=IBENWOOD.z-92;z<=IBENWOOD.z+92;z+=37)for(const x of [IBENWOOD.x-92,IBENWOOD.x-70,IBENWOOD.x+90]){
    const h=hits(x,z);assert.ok(h.length,'no rendered western ground at '+x+','+z);assert.ok(Math.abs(h[0].point.y-heightAt(x,z))<.12);
  }
  // Dense probes include the fine patch edges, its interior, and the old renderer seam.
  for(let dz=-92;dz<=92;dz+=3.7)for(let dx=-92;dx<=88;dx+=3.9){
    const x=IBENWOOD.x+dx,z=IBENWOOD.z+dz,h=hits(x,z);assert.ok(h.length,'hole at '+dx+','+dz);
    const surfaces=new Set(h.map(v=>v.object));assert.equal(surfaces.size,1,'overlapping ground at '+dx+','+dz);
    assert.ok(Math.abs(h[0].point.y-heightAt(x,z))<.15,'rendered height disagrees with footing');
  }
  assert.deepEqual(new Float32Array(w.terrain.positions),w.original,'original terrain samples must not rephase');
  const floor=w.pilot.floor.geometry.attributes.position;
  for(let i=0;i<floor.count;i++){
    const x=floor.getX(i),z=floor.getZ(i);
    if(Math.min(Math.abs(x-(IBENWOOD.x-88)),Math.abs(x-(IBENWOOD.x+88)),Math.abs(z-(IBENWOOD.z-88)),Math.abs(z-(IBENWOOD.z+88)))<.001){
      const h=hits(x,z);assert.ok(h.length);assert.ok(h.every(v=>Math.abs(v.point.y-floor.getY(i))<.002),'boundary faces must share the same height');
    }
  }
});

test('fallen-log collision covers every visible edge and canopy houses sit on a braced platform',()=>{
  const w=build(),beads=w.colliders.filter(c=>c.kind==='fallen-log');
  for(const log of w.pilot.logs)for(let d=-3.5;d<=3.501;d+=.1)for(const side of [-.45,.45]){
    const x=log.x+Math.sin(log.angle)*d+Math.cos(log.angle)*side,z=log.z+Math.cos(log.angle)*d-Math.sin(log.angle)*side;
    assert.ok(beads.some(c=>Math.hypot(x-c.x,z-c.z)<=c.r),'visible log edge has no collider');assert.equal(canStand(x,z,w),false);
  }
  for(const house of w.pilot.buildings.filter(b=>b.kind==='branch'))assert.ok(Math.abs(house.y-(w.pilot.platform.y+.15))<1e-8);
  assert.equal(w.pilot.supports.length,4);
  const veteran=w.pilot.trees.find(t=>t.age==='veteran'&&Math.hypot(t.x-w.pilot.platform.x,t.z-w.pilot.platform.z)<.01);
  assert.ok(veteran);for(const support of w.pilot.supports){assert.ok(Math.hypot(support.a[0]-veteran.x,support.a[2]-veteran.z)<veteran.radius);assert.equal(support.b[1],w.pilot.platform.y-.15);}
  // Probe the actual merged architecture at a brace midpoint, rather than its metadata alone.
  const ray=new THREE.Raycaster();for(const support of w.pilot.supports){const x=(support.a[0]+support.b[0])/2,y=(support.a[1]+support.b[1])/2,z=(support.a[2]+support.b[2])/2;
    ray.set(new THREE.Vector3(x,y,z-2),new THREE.Vector3(0,0,1));assert.ok(ray.intersectObject(w.pilot.detail,true).some(h=>h.distance<2.5),'missing rendered structural brace');}
});


test('shared-buffer terrain tiles retain distant bounds and compact only intersecting indexed vertices',()=>{
  const positions=[],tiles=[];
  for(let j=0;j<13;j++)for(let i=0;i<13;i++){
    const x=IBENWOOD.x+(i-6)*400-200,z=IBENWOOD.z+(j-6)*400-200,k=positions.length/3;
    positions.push(x,20,z,x+400,20,z,x,20,z+400,x+400,20,z+400);
    tiles.push({indices:[k,k+2,k+1,k+1,k+2,k+3],bounds:new THREE.Box3(new THREE.Vector3(x,20,z),new THREE.Vector3(x+400,20,z+400))});
  }
  // A large unused shared tail catches full-attribute copying on affected tiles.
  for(let i=0;i<100000;i++)positions.push(10000+i,20,10000);
  const attribute=new THREE.Float32BufferAttribute(positions,3),colours=new THREE.Float32BufferAttribute(new Float32Array(positions.length).fill(.5),3);
  let affected=0;
  for(const tile of tiles){
    const g=new THREE.BufferGeometry();g.setAttribute('position',attribute);g.setAttribute('color',colours);g.setIndex(tile.indices);g.boundingBox=tile.bounds;g.boundingSphere=tile.bounds.getBoundingSphere(new THREE.Sphere());
    const sphere=g.boundingSphere,bounds=g.boundingBox,before=bounds.clone(),result=cutGroveGround(g);
    assert.equal(g.boundingBox,bounds);assert.deepEqual(g.boundingBox,before);assert.equal(g.boundingSphere,sphere);
    if(result===g){assert.equal(result.attributes.position,attribute);assert.equal(result.attributes.color,colours);}
    else {affected++;assert.ok(result.attributes.position.count<80,'affected tile cloned the world buffer');assert.equal(result.attributes.color.count,result.attributes.position.count);assert.ok(result.boundingBox.min.distanceTo(before.min)<.001);assert.ok(result.boundingBox.max.distanceTo(before.max)<.001);}
  }
  assert.equal(affected,1);assert.equal(attribute.count,100676);
});
