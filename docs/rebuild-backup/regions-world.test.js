import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './module-loader.js';
import * as THREE from '../vendor/three.module.js';
import { canStand, moveCharacter } from '../src/game-state.js';
import { regions, regionAt, northernRoad, regionNpcPositions, journeySites, regionRepairBenches } from '../src/regions.js';

const { createWorld } = await sourceModule('../src/world.js');
const scene = new THREE.Scene(), world = createWorld(scene);

test('Three neighboring districts have contiguous bounds and correct local geography', () => {
  assert.deepEqual(regions.map(r => r.id), [2, 3, 4]);
  assert.equal(regionAt(0, -161).id, 1);
  assert.equal(regionAt(0, -162).name, 'Sunmeadow Plain');
  assert.equal(regionAt(0, -330).name, 'Reedwater Crossing');
  assert.equal(regionAt(0, -500).name, 'Threefold Rise');
  assert.equal(regionAt(0, Number.NaN), null);
  for (let i = 1; i < regions.length; i++) assert.equal(regions[i].maxZ, regions[i-1].minZ);
  assert.equal(world.bounds.minZ, -680);
  assert.equal(world.border.open, true);
  assert.ok(canStand(0, -162, world), 'Eastreena’s gate is open');
  assert.equal(canStand(0, -681, world), false, 'The new northern limit remains enforced');
});

test('The full northern road is walkable in both directions, including the unrepaired bridge lane', () => {
  const p = {x: 0, z: -160};
  for (const target of northernRoad) {
    moveCharacter(p, target.x-p.x, target.z-p.z, world);
    assert.ok(Math.hypot(p.x-target.x,p.z-target.z) < .05, `Blocked road at ${target.x}, ${target.z}; reached ${p.x}, ${p.z}`);
  }
  for (const target of [...northernRoad].reverse()) {
    moveCharacter(p, target.x-p.x, target.z-p.z, world);
    assert.ok(Math.hypot(p.x-target.x,p.z-target.z) < .05, `Blocked return at ${target.x}, ${target.z}`);
  }
  assert.ok(world.heightAt(0,-620) > world.heightAt(0,-352)+5, 'The final district visibly rises above the river hollow');
});

test('Every new NPC, activity, pickup, repair bench and firepit has a clear reachable approach', () => {
  const objectives = [...Object.values(regionNpcPositions), ...Object.values(journeySites),
    ...regionRepairBenches, ...world.firePits.filter(f=>f.z < -162),world.fishingSpots[1].fishingSpot];
  for (const target of objectives) assert.ok(canStand(target.x,target.z,world,.48), `Blocked objective ${target.id || ''} at ${target.x}, ${target.z}`);
  // Flood the relevant route corridor. This catches props enclosing a pickup
  // even when the exact standing point itself is collision-free.
  const minX=-35,minZ=-675,step=1,width=71,height=515,cells=new Int8Array(width*height),queue=[];
  const indexOf=(x,z)=>Math.round((z-minZ)/step)*width+Math.round((x-minX)/step);
  const start=indexOf(0,-162);cells[start]=1;queue.push(start);
  for(let cursor=0;cursor<queue.length;cursor++) {
    const index=queue[cursor],ix=index%width,iz=Math.floor(index/width);
    for(const [nx,nz]of[[ix-1,iz],[ix+1,iz],[ix,iz-1],[ix,iz+1]]) {
      if(nx<0||nx>=width||nz<0||nz>=height)continue;
      const next=nz*width+nx;if(cells[next])continue;
      cells[next]=canStand(minX+nx,minZ+nz,world,.48)?1:-1;if(cells[next]===1)queue.push(next);
    }
  }
  for(const target of objectives) {
    assert.ok(queue.some(index=>Math.hypot(minX+index%width-target.x,minZ+Math.floor(index/width)-target.z)<1.01),`Unreachable ${target.id || ''} at ${target.x}, ${target.z}`);
  }
  for(const fire of world.firePits.filter(f=>f.z < -162))for(const npc of Object.values(regionNpcPositions))
    assert.ok(Math.hypot(fire.x-npc.x,fire.z-npc.z)>3.3,`Fire ${fire.id} conflicts with an NPC prompt`);
  for(const point of[{x:12,z:-234},{x:18,z:-237}])assert.ok(canStand(point.x,point.z,world,.6),'Raider spawn must remain clear');
});

test('The river bank retargets fishing while preserving the original pond API', () => {
  const river=world.fishingSpots.find(spot=>spot.id==='reedwater'),originalPond=JSON.stringify(world.pond);
  assert.ok(canStand(river.fishingSpot.x,river.fishingSpot.z,world,.6));
  for(const npc of Object.values(world.npcPositions))assert.ok(Math.hypot(river.fishingSpot.x-npc.x,river.fishingSpot.z-npc.z)>3.3);
  for(const fire of world.firePits)assert.ok(Math.hypot(river.fishingSpot.x-fire.x,river.fishingSpot.z-fire.z)>2.1);
  assert.equal(world.setFishingSpot('unknown'),false);
  assert.equal(world.setFishingSpot('reedwater'),true);
  assert.equal(world.activeFishingSpot().id,'reedwater');
  world.setFishingState('bite');world.setFishingOrigin(new THREE.Vector3(16,5,-400));world.update(1,1/60);
  assert.equal(world.setFishingSpot('willowmere'),false,'Cannot move an active cast between waters');
  assert.equal(JSON.stringify(world.pond),originalPond,'Legacy pond coordinates never change');
  world.setFishingState('idle');assert.equal(world.setFishingSpot('willowmere'),true);
  assert.equal(world.activeFishingSpot().castPoint,world.pond.castPoint);
});

test('Reedwater cannot be walked through and repairing the bridge opens its western deck', () => {
  assert.equal(canStand(15,-412,world),false);
  assert.equal(canStand(-15,-412,world),false);
  assert.equal(canStand(-4,-412,world),false,'The channel beside the bridge is water too');
  assert.equal(canStand(4,-412,world),false,'The eastern bank gap is closed');
  const p={x:15,z:-395};moveCharacter(p,0,-40,world);
  assert.ok(p.z>-410,'A long movement cannot tunnel through the water');
  assert.equal(canStand(-1.9,-410,world),false);
  assert.equal(world.setJourneySiteState('bridge-repair',true),true);
  assert.equal(canStand(-1.9,-410,world),true);
  assert.equal(scene.getObjectByName('Reedwater repaired western deck').visible,true);
  assert.equal(scene.getObjectByName('Bridge repair cord').visible,false);
  world.setJourneySiteState('bridge-repair',false);
  assert.equal(canStand(-1.9,-410,world),false);
});

test('Parcel, supply and waymarker visuals respond independently and remain finite', () => {
  assert.equal(world.setJourneySiteState('unknown',true),false);
  for(const site of Object.values(journeySites)) {
    world.setJourneySiteState(site.id,true);
    if(['parcel','sticks','fruit'].includes(site.type)) assert.equal(scene.getObjectByName(`Journey site ${site.id}`).visible,false);
    if(site.type==='beacon') {
      assert.equal(scene.getObjectByName(`${site.id} light`).visible,true);
      assert.equal(scene.getObjectByName(`Journey site ${site.id}`).rotation.z,0,'Restored road stone stands upright');
    }
    world.setJourneySiteState(site.id,false);
    if(site.type==='beacon')assert.equal(Math.abs(scene.getObjectByName(`Journey site ${site.id}`).rotation.z),.24,'Unrestored road stone leans outward');
  }
  world.update(3.5,1/60);scene.updateMatrixWorld(true);
  scene.traverse(object=>{
    assert.ok(object.matrixWorld.elements.every(Number.isFinite),`Invalid transform ${object.name}`);
    for(const attribute of Object.values(object.geometry?.attributes || {}))assert.ok(attribute.array.every(Number.isFinite),`Invalid geometry ${object.name}`);
  });
  assert.equal(world.journeySiteState()['cart-parcel-1'],false);
});

test('District scenery batches reduce submitted geometry without excessive extra draw calls', t => {
  const oldScene=new THREE.Scene(),oldWorld=createWorld(oldScene,{spatialBatches:false});
  oldWorld.update(0,0);world.update(0,0);oldScene.updateMatrixWorld(true);scene.updateMatrixWorld(true);
  const terrainTiles=scene.getObjectByName('The northern districts').children;
  const oldTerrain=oldScene.getObjectByName('The northern districts');
  assert.equal(terrainTiles.length,16);
  assert.equal(new Set(terrainTiles.map(tile=>tile.geometry.attributes.position)).size,1,'Terrain tiles share one vertex buffer');
  assert.equal(new Set(terrainTiles.map(tile=>tile.geometry.attributes.color)).size,1,'Terrain tiles share one color buffer');
  assert.equal(new Set(terrainTiles.map(tile=>tile.material)).size,1,'Terrain tiles share one material');
  assert.equal(terrainTiles.reduce((sum,tile)=>sum+tile.geometry.index.count,0),oldTerrain.geometry.index.count,'Tiling does not add or remove terrain faces');
  const submitted=(targetScene,camera,shadow=false)=>{
    camera.updateMatrixWorld(true);
    const frustum=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
    let draws=0,triangles=0;
    targetScene.traverseVisible(object=>{
      if(!object.isMesh||(shadow&&!object.castShadow)||!frustum.intersectsObject(object))return;
      draws++;triangles+=(object.geometry.index?.count||object.geometry.attributes.position.count)/3*(object.isInstancedMesh?object.count:1);
    });
    return{draws,triangles:Math.round(triangles)};
  };
  const samples=[];
  for(const [name,z]of[['forest',-36],['boundary',-156],['plain',-248],['river',-389],['rise',-570],['relay',-650]]) {
    const y=world.heightAt(0,z);
    for(const [facing,yaw]of[['north',0],['south',Math.PI]]) {
      const camera=new THREE.PerspectiveCamera(54,1.5,.1,650),focus=new THREE.Vector3(0,y+1.5,z);
      camera.position.set(Math.sin(yaw)*12,focus.y+4,z+Math.cos(yaw)*12);camera.lookAt(focus);
      const shadow=new THREE.OrthographicCamera(-65,65,65,-65,1,210);shadow.position.set(-45,y+90,z+38);shadow.lookAt(0,y,z);
      const before=submitted(oldScene,camera),after=submitted(scene,camera),oldShadow=submitted(oldScene,shadow,true),newShadow=submitted(scene,shadow,true);
      samples.push({view:`${name}-${facing}`,before:{draws:before.draws+oldShadow.draws,triangles:before.triangles+oldShadow.triangles},after:{draws:after.draws+newShadow.draws,triangles:after.triangles+newShadow.triangles}});
    }
  }
  const totals=samples.reduce((sum,s)=>({beforeTriangles:sum.beforeTriangles+s.before.triangles,afterTriangles:sum.afterTriangles+s.after.triangles,beforeDraws:sum.beforeDraws+s.before.draws,afterDraws:sum.afterDraws+s.after.draws}),{beforeTriangles:0,afterTriangles:0,beforeDraws:0,afterDraws:0});
  t.diagnostic(JSON.stringify({totals,views:samples.filter(sample=>['river-north','rise-north','relay-north'].includes(sample.view))}));
  assert.ok(totals.afterTriangles<totals.beforeTriangles*.90,`Expected a measurable geometry reduction: ${JSON.stringify(totals)}`);
  assert.ok(totals.afterDraws<totals.beforeDraws*1.15,`Too many added submissions: ${JSON.stringify(totals)}`);
});
