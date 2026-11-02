import test from 'node:test';
import assert from 'node:assert/strict';
import {TOWER} from '../src/app/exploration/tower-state.js';
import {createTowerFloorSupport,towerFloorAt,towerStairPoint,TOWER_FLOORS,TOWER_STAIR,TOWER_STAIR_MIN,TOWER_STAIR_MAX} from '../src/content/regions/minora-frontier/tower-floor-layout.js';
import {explorationMovement} from '../src/app/exploration/movement.js';
import {canStand} from '../src/gameplay/movement/locomotion.js';
import {restoreWalkPosition} from '../src/world/collision/walk-surfaces.js';
import {resolveVerticalMotion} from '../src/gameplay/movement/vertical-motion.js';
import {hadrinExhibitTarget,HADRIN_FLOOR_Y} from '../src/content/regions/minora-frontier/hadrin-exhibits.js';
import {sourceModule} from './module-loader.js';

function fixture(){
  const support=createTowerFloorSupport();
  return {...support,readyAt:support.canExploreAt,waterAt:()=>-100,
    nearColliders:(x,z,r)=>support.colliders.filter(c=>Math.abs(c.x-x)<(c.r??c.hx)+r&&Math.abs(c.z-z)<(c.r??c.hz)+r)};
}
function walkTo(movement,position,target){
  for(let i=0;i<500;i++){
    const dx=target.x-position.x,dz=target.z-position.z,distance=Math.hypot(dx,dz);
    if(distance<.03)return;
    movement.step(new Set(['KeyW']),Math.atan2(-dx,-dz),Math.min(.025,distance/4.5),{swimming:false});
  }
  assert.fail(`Could not walk from ${JSON.stringify(position)} to ${JSON.stringify(target)}`);
}

test('ordinary exploration walking climbs and descends both spiral flights and crosses each landing',()=>{
  const world=fixture(),position={x:TOWER.x+12,y:TOWER.y-10.8,z:TOWER.z},movement=explorationMovement(position,world);
  walkTo(movement,position,towerStairPoint(0));
  for(let i=1;i<=480;i++){
    const target=towerStairPoint(i/240);walkTo(movement,position,target);
    assert.ok(Math.abs(position.y-target.y)<.27,`Ascent ${i}: feet follow visible treads (${position.y}, ${target.y})`);
    if(i===240){walkTo(movement,position,{x:TOWER.x+12,z:TOWER.z});assert.ok(Math.abs(position.y-TOWER.y)<.01);walkTo(movement,position,target);}
  }
  walkTo(movement,position,{x:TOWER.x+12,z:TOWER.z});assert.ok(Math.abs(position.y-(TOWER.y+10.8))<.01);
  walkTo(movement,position,towerStairPoint(2));
  for(let i=479;i>=0;i--){const target=towerStairPoint(i/240);walkTo(movement,position,target);assert.ok(Math.abs(position.y-target.y)<.27,`Descent ${i}: ${position.y}, ${target.y}`);}
  walkTo(movement,position,{x:TOWER.x+12,z:TOWER.z});assert.ok(Math.abs(position.y-(TOWER.y-10.8))<.01);
});

test('stacked chamber floors and staircase support never pull a visitor onto a higher storey',()=>{
  const world=fixture();
  for(const floor of TOWER_FLOORS){
    const y=TOWER.y+floor.y,position={x:TOWER.x-10,y,z:TOWER.z},movement=explorationMovement(position,world);
    walkTo(movement,position,{x:TOWER.x+10,z:TOWER.z});
    assert.equal(position.y,y);
    const support=world.supportAt(position.x,position.z,{maxY:y,stepUp:.45});
    assert.equal(support.id,`tower-floor-${floor.id}`);assert.equal(towerFloorAt(y).id,floor.id);
    const restored=restoreWalkPosition({...position,surfaceId:support.id},world);assert.equal(restored.y,y);
  }
  const below=towerStairPoint(.32),above=towerStairPoint(1.32);
  assert.ok(above.y-below.y>10);
  assert.ok(Math.abs(world.supportAt(below.x,below.z,{maxY:below.y,stepUp:.45}).height-below.y)<.20);
});

test('shaft, doorway rails and the outer wall block walking while the full landing remains connected',()=>{
  const world=fixture(),feet=TOWER.y;
  assert.equal(canStand(TOWER.x+TOWER_STAIR.x,TOWER.z,world,.34,feet),false,'central shaft is solid');
  assert.equal(canStand(TOWER.x+TOWER_STAIR.x+5.3,TOWER.z,world,.34,feet),false,'outer masonry is solid');
  assert.equal(canStand(TOWER.x+14.5,TOWER.z+1.76,world,.34,feet),false,'landing has rails');
  assert.equal(canStand(TOWER.x+14.5,TOWER.z,world,.34,feet),true,'doorway has a body-width route');
  assert.equal(world.canExploreAt(TOWER.x+16,TOWER.z+9),false,'empty space beside the shaft is outside the room');
});

test('every chamber threshold has continuous paving without coincident floor faces',async()=>{
  const THREE=await sourceModule('../vendor/three.module.js');
  const {createTowerChamber}=await sourceModule('../src/content/regions/minora-frontier/tower-chamber.js');
  const scene=new THREE.Scene(),chamber=createTowerChamber(scene),ray=new THREE.Raycaster();
  await chamber.prepare(TOWER.x,TOWER.z,TOWER.y+54);
  scene.updateMatrixWorld(true);ray.far=.6;
  try{
    for(const floor of TOWER_FLOORS)for(const x of [13.47,13.63,13.87,14.11,14.43,14.79,15.37,16.07])for(const z of [-1.51,-1.07,-.29,.17,.83,1.47]){
      const y=TOWER.y+floor.y;
      ray.set(new THREE.Vector3(TOWER.x+x,y+.4,TOWER.z+z),new THREE.Vector3(0,-1,0));
      const hits=ray.intersectObject(chamber.root,true).filter(h=>h.face.normal.y>.99&&Math.abs(h.point.y-y)<.05);
      assert.ok(hits.length,`${floor.id}: no visible hole at doorway ${x}, ${z}`);
      for(let i=1;i<hits.length;i++)assert.ok(Math.abs(hits[i-1].point.y-hits[i].point.y)>.001,
        `${floor.id}: overlapping threshold faces flicker at ${x}, ${z}`);
    }
  }finally{chamber.dispose();}
});

test('unbuilt upper and lower continuations are gated, including a jump toward them',()=>{
  const world=fixture();
  for(const [progress,side] of [[TOWER_STAIR_MIN,1],[TOWER_STAIR_MAX,-1]]){
    const position=towerStairPoint(progress),movement=explorationMovement(position,world),floor=position.y;
    movement.jump();
    for(let i=0;i<90;i++)movement.step(new Set(['KeyW']),side>0?Math.PI:0,.025,{swimming:false});
    assert.ok(Math.abs(position.z-TOWER.z)<1.2,'guild gate prevents walking or jumping into an unbuilt flight');
    assert.equal(position.y,floor,'the visitor lands back on the same safe landing');
  }
});

test('floor slabs stop an upward sweep and keep a falling body on the highest crossed chamber floor',()=>{
  const world=fixture(),x=TOWER.x,z=TOWER.z;
  const upward=resolveVerticalMotion(world,{x,z,fromY:TOWER.y-3,toY:TOWER.y+2,velocity:15,floor:TOWER.y-10.8});
  assert.ok(upward.y<TOWER.y-2,'the middle floor acts as a ceiling from below');
  assert.equal(upward.velocity,0);
  const downward=resolveVerticalMotion(world,{x,z,fromY:TOWER.y+16,toY:TOWER.y-12,velocity:-100,floor:TOWER.y-10.8});
  assert.equal(downward.y,TOWER.y+10.8);assert.equal(downward.grounded,true);
});

test('nearby workshop items are independently selectable from the accessible sides of their benches',()=>{
  const context={room:'tower',mode:'playing'},target=(x,z)=>hadrinExhibitTarget({x,y:HADRIN_FLOOR_Y,z},context)?.id;
  assert.equal(target(9,7.1),'golem');
  assert.equal(target(1.5,-6.1),'everlight');assert.equal(target(-1.7,-6.1),'mending-hammer');
  assert.equal(target(-8.8,9),'wayfinder');assert.equal(target(-7.1,9),'rainkeeper-cup');
  assert.equal(target(-8.2,-3.8),'armor');assert.equal(target(5.8,7.5),'broom');
  assert.equal(target(9,7.1),'golem','The neighboring broom station does not steal the golem interaction');
  assert.equal(target(0,-6.1),'everlight','standing between northern experiments selects the closer lantern');
  assert.equal(target(-.4,-6.1),'mending-hammer','one step left selects the other experiment without inspecting the whole table');
  assert.equal(target(0,0),undefined,'central circulation remains clear of workshop prompts');
});

test('workshop interaction cannot reach through floors or take over another room or modal state',()=>{
  const at={x:9,y:HADRIN_FLOOR_Y,z:7.1},context={room:'tower',mode:'playing'};
  assert.equal(hadrinExhibitTarget(at,context)?.id,'golem');
  for(const y of [0,-10.8,HADRIN_FLOOR_Y+2,HADRIN_FLOOR_Y-2])assert.equal(hadrinExhibitTarget({...at,y},context),null);
  for(const room of [null,'lookout','temple','mayor'])assert.equal(hadrinExhibitTarget(at,{...context,room}),null);
  for(const mode of ['pause','briefing','training','map','loading','skirmish'])assert.equal(hadrinExhibitTarget(at,{...context,mode}),null);
  assert.equal(hadrinExhibitTarget({...at,z:5},context),null,'a golem across the room cannot be inspected remotely');
});

test('guild working accessories stay below the face on the articulated character rig',async()=>{
  const THREE=await sourceModule('../vendor/three.module.js');
  const {createTowerChamber}=await sourceModule('../src/content/regions/minora-frontier/tower-chamber.js');
  const scene=new THREE.Scene(),chamber=createTowerChamber(scene);scene.updateMatrixWorld(true);
  try{
    for(const [id,name] of [['senro','Snero: worn traveling satchel and rolled map'],['hadrin','Hadrin: working apron and well-used tools']]){
      const actor=chamber.wizards[id].group,kit=actor.getObjectByName(name),bounds=new THREE.Box3().setFromObject(kit),origin=actor.getWorldPosition(new THREE.Vector3());
      assert.ok(bounds.min.y>origin.y+.25&&bounds.max.y<origin.y+1.5,`${id}'s kit follows the torso instead of floating over his face`);
    }
    const views=chamber.state().senro.windows.views;
    assert.equal(views.length,4);assert.equal(new Set(views.map(v=>v.wall)).size,4);
    const center=new THREE.Vector3(TOWER.x,TOWER.y-10.8+5.5,TOWER.z);
    for(const view of views){
      const pane=scene.getObjectByName(view.place),position=pane.getWorldPosition(new THREE.Vector3()),normal=pane.getWorldDirection(new THREE.Vector3());
      assert.ok(normal.dot(center.clone().sub(position))>10,`${view.place} faces into the chamber`);
      assert.equal(pane.material.side,THREE.FrontSide,'The window need not draw from behind its wall');
    }
  }finally{chamber.dispose();}
  assert.equal(scene.children.length,0,'The added workshop details are removed with the tower');
});
