import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './module-loader.js';
import { FAMILY_HOMES, MARK_HOME, MARK_HOME_PATH, familyHomeForResident, familyHomeLines } from '../src/content/quests/homes/family-homes.js';
import { ARI_HOME } from '../src/content/quests/ari/ari-home.js';
import { APPLEGARTH_BUILDINGS } from '../src/content/quests/rena/rena.js';
import { canStand } from '../src/gameplay/movement/game-state.js';

test('the requested households reuse cottages and retain their distinct family relationships', () => {
  const residents=FAMILY_HOMES.flatMap(home=>home.residents);
  assert.equal(new Set(residents).size,residents.length);
  const jess=familyHomeForResident('boatman');
  for(const id of ['willowmere-ryan','willowmere-barrett','village-dog'])assert.equal(familyHomeForResident(id),jess);
  assert.equal(familyHomeForResident('jesse'),null,'The ferry host Jess is distinct from carriage repairer Jesse');
  assert.equal(jess.pet,'Rip');assert.match(familyHomeLines('boatman').join(' '),/boyfriend/);
  for(const [a,b] of [['instructor','harbormaster'],['tidehaven-smith','lee-anne'],['garden-keeper','avrel-farmer']]){
    assert.equal(familyHomeForResident(a),familyHomeForResident(b));
    assert.match(familyHomeLines(a).join(' '),/wife|husband/);
    assert.match(familyHomeLines(b).join(' '),/wife|husband/);
  }
  const farm=familyHomeForResident('avrel-farmer');
  assert.equal(farm.buildingId,'house-1');assert.notEqual(farm.buildingId,ARI_HOME.buildingId);
  assert.equal(farm.house.x,APPLEGARTH_BUILDINGS.find(h=>h.id===farm.buildingId).x);
  assert.deepEqual(FAMILY_HOMES.filter(home=>home.newBuilding).map(home=>home.id),[MARK_HOME.id]);
});

test('each home has its own named, grounded mailbox and lightweight distinct scenery',async()=>{
  const THREE=await sourceModule('../vendor/three.module.js');
  const {createFamilyHomeScenery}=await sourceModule('../src/content/quests/homes/family-homes-scenery.js');
  const parent=new THREE.Group(),colliders=[],movingGroups=new Set();
  const heightAt=(x,z)=>2+x*.001+z*.0005;
  const result=createFamilyHomeScenery({parent,colliders,heightAt,movingGroups});
  assert.equal(result.roots.size,5);assert.equal(colliders.length,5);
  assert.equal(new Set(FAMILY_HOMES.map(home=>home.style)).size,5);
  for(const home of FAMILY_HOMES){
    const root=result.roots.get(home.id),plate=root.getObjectByName(`${home.name} mailbox nameplate`);
    assert.equal(plate.userData.label,home.name);
    assert.equal(plate.position.y,heightAt(home.mailbox.x,home.mailbox.z)+1.31);
    assert.ok(movingGroups.has(root),'The real nameplate must survive world batching');
    assert.equal(colliders.find(c=>c.homeId===home.id).kind,'family-mailbox');
    assert.ok(Math.hypot(home.mailboxStand.x-home.mailbox.x,home.mailboxStand.z-home.mailbox.z)>1);
  }
});

test('the built world leaves every family doorstep and mailbox reachable and Mark has a clear walking path',async()=>{
  const THREE=await sourceModule('../vendor/three.module.js');
  const {createWorld}=await sourceModule('../src/world.js');
  const scene=new THREE.Scene(),world=createWorld(scene);
  const failure=(spot)=>world.nearColliders(spot.x,spot.z,.45).filter(c=>c.r!==undefined&&Math.hypot(c.x-spot.x,c.z-spot.z)<c.r+.45).map(c=>({kind:c.kind,x:c.x,z:c.z,r:c.r}));
  for(const home of FAMILY_HOMES){
    assert.ok(world.familyHomes.roots.get(home.id));
    for(const [key,spot]of [['approach',home.approach],['mailbox',home.mailboxStand]])
      assert.ok(canStand(spot.x,spot.z,world,.45),`${home.id} ${key}: ${JSON.stringify(failure(spot))}`);
  }
  for(let i=1;i<MARK_HOME_PATH.length;i++){
    const a=MARK_HOME_PATH[i-1],b=MARK_HOME_PATH[i],steps=Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)/.5);
    for(let k=0;k<=steps;k++){
      const spot={x:a.x+(b.x-a.x)*k/steps,z:a.z+(b.z-a.z)*k/steps};
      assert.ok(canStand(spot.x,spot.z,world,.45),`Mark path segment ${i} at ${JSON.stringify(spot)}: ${JSON.stringify(failure(spot))}`);
    }
  }
  assert.equal(world.familyHomes.homes.filter(home=>home.newBuilding).length,1);
});
