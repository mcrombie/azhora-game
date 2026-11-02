import test from 'node:test';
import assert from 'node:assert/strict';
import {TOWER} from '../src/app/exploration/tower-state.js';
import {TOWER_FLOORS,towerStairPoint,TOWER_STAIR_MIN,TOWER_STAIR_MAX,createTowerFloorSupport} from '../src/content/regions/minora-frontier/tower-floor-layout.js';
import {GUILD_WIZARDS} from '../src/content/regions/minora-frontier/guild-wizards.js';
import {GUILD_EXHIBITS,guildExhibitTarget} from '../src/content/regions/minora-frontier/guild-exhibits.js';
import {sanctuaryContains,sanctuaryTravel,sanctuaryGuides,sanctuaryView,SANCTUARY,SANCTUARY_ENTRY,restoreSanctuaryPosition} from '../src/content/regions/minora-frontier/guild-sanctuary-layout.js';
import {explorationMovement} from '../src/app/exploration/movement.js';
import {sourceModule} from './module-loader.js';

test('all agreed residents have unique landings, subjects and reachable demonstrations',()=>{
  assert.deepEqual(TOWER_FLOORS.map(f=>f.id),['helba','odran','nessa','veyra','senro','taleth','hadrin','neris','oris','maelon','bolbur']);
  assert.equal(new Set(GUILD_WIZARDS.map(w=>w.name)).size,10);
  for(const w of GUILD_WIZARDS){assert.equal(w.offset.y,TOWER_FLOORS.find(f=>f.id===w.floor).y);assert.ok(w.topics.length>=2);}
  const ctx={room:'tower',mode:'playing'};
  for(const e of GUILD_EXHIBITS.filter(e=>e.floor!=='hadrin')){
    const at={x:e.x,y:e.y,z:e.z+e.front*2.7};assert.equal(guildExhibitTarget(at,ctx)?.id,e.id,e.id+' can be selected independently');
    assert.equal(guildExhibitTarget({...at,y:at.y+10.8},ctx)?.id===e.id,false,e.id+' cannot be used through the ceiling');
    assert.equal(guildExhibitTarget(at,{...ctx,mode:'pause'}),null);
  }
});

test('ordinary movement traverses every new flight in both directions without falling or teleporting',()=>{
  const support=createTowerFloorSupport(),world={...support,waterAt:()=>-100,readyAt:()=>true,
    nearColliders:(x,z,r)=>support.colliders.filter(c=>Math.abs(c.x-x)<(c.r??c.hx)+r&&Math.abs(c.z-z)<(c.r??c.hz)+r)};
  const position=towerStairPoint(TOWER_STAIR_MIN),movement=explorationMovement(position,world);
  for(const direction of [1,-1])for(let i=1;i<=960;i++){
    const progress=direction===1?TOWER_STAIR_MIN+i/96:TOWER_STAIR_MAX-i/96,target=towerStairPoint(progress);
    let arrived=false;for(let j=0;j<80;j++){
      const dx=target.x-position.x,dz=target.z-position.z,d=Math.hypot(dx,dz);if(d<.035){arrived=true;break;}
      movement.step(new Set(['KeyW']),Math.atan2(-dx,-dz),Math.min(.025,d/4.5),{swimming:false});
    }
    assert.ok(arrived,'Reach spiral '+progress);assert.ok(Math.abs(position.y-target.y)<.35,'Feet follow spiral '+progress);
  }
  assert.ok(Math.abs(position.y-(TOWER.y-54))<.02);
});

test('the sanctuary joins the top landing without travel signs and stays above the other floors',()=>{
  assert.ok(sanctuaryContains(SANCTUARY_ENTRY.x-.1,SANCTUARY_ENTRY.z,SANCTUARY_ENTRY.y));
  assert.equal(sanctuaryContains(SANCTUARY_ENTRY.x+2,SANCTUARY_ENTRY.z,SANCTUARY_ENTRY.y),false);
  for(const floor of TOWER_FLOORS.filter(f=>f.id!=='bolbur'))assert.equal(sanctuaryContains(TOWER.x,TOWER.z,TOWER.y+floor.y),false);
  assert.ok(sanctuaryView({x:TOWER.x-244,y:SANCTUARY.y-3,z:TOWER.z+245}),'The submerged pond floor remains inside the sanctuary view');
  assert.equal(sanctuaryView({x:TOWER.x,y:TOWER.y+43.2,z:TOWER.z}),false,'The floor below keeps its own environment');
  assert.deepEqual(sanctuaryGuides(),[]);assert.equal(sanctuaryTravel('sanctuary-enter'),null);
  assert.equal(GUILD_EXHIBITS.some(e=>e.floor==='bolbur'),false);
  const old={x:TOWER.x+2048,y:SANCTUARY.y,z:TOWER.z};
  const restored=restoreSanctuaryPosition(old);assert.ok(sanctuaryContains(restored.x,restored.z,restored.y));
  const ordinary={x:TOWER.x,y:TOWER.y,z:TOWER.z};assert.equal(restoreSanctuaryPosition(ordinary),ordinary);
});

test('twelve natural-scale species stream by distance inside a continuous walkable region',async()=>{
  const THREE=await import('../vendor/three.module.js');
  const {createGuildSanctuary,sanctuaryRoster}=await sourceModule('../src/content/regions/minora-frontier/guild-sanctuary.js');
  let stages=0;const sanctuary=await createGuildSanctuary(new THREE.Group(),{yieldBuild:async()=>{stages++;}});
  try{
    const state=sanctuary.state();assert.equal(state.species,12);assert.equal(state.species,sanctuaryRoster().length);
    assert.ok(state.trees>200,'The walkable habitat trees all have species identities');
    assert.equal(state.trees,sanctuary.treeRegistry.trees.length);
    assert.ok(sanctuary.treeRegistry.trees.every(t=>t.harvestable===false),'Sanctuary specimens remain protected');
    assert.ok(stages>=40);assert.equal(new Set(state.animals.map(a=>a.species)).size,12);
    assert.equal(state.visuals.loadedGroups,0,'Animal geometry is lazy');
    assert.ok(Math.abs(sanctuary.heightAt(SANCTUARY_ENTRY.x-.1,SANCTUARY_ENTRY.z)-SANCTUARY.y)<.02);
    for(const rec of sanctuaryRoster()){
      const at={x:rec.x,y:sanctuary.heightAt(rec.x,rec.z),z:rec.z};
      sanctuary.update(1,at,.04);const next=sanctuary.state();
      assert.ok(next.animals.some(a=>a.species===rec.species&&!a.hidden),rec.name+' renders at its habitat');
      assert.ok(next.visuals.activeGroups<12);assert.ok(next.visuals.drawCalls<=36);
      for(const animal of next.animals.filter(a=>!a.hidden))assert.ok(Number.isFinite(animal.y)&&animal.y>=SANCTUARY.y-3);
    }
    sanctuary.hide();assert.equal(sanctuary.state().active,false);assert.equal(sanctuary.state().visuals.activeGroups,0);
  }finally{sanctuary.dispose();}
});
