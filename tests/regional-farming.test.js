import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_FARM_ROWS, FARM_ROWS, CROPS, createFarming, validateFarmingSnapshot } from '../src/gameplay/skills/farming/farming.js';
import { FARMSTEADS, REGIONAL_FARM_ROWS } from '../src/world/scenery/regional-farmland.js';
import { createSkills } from '../src/gameplay/skills/skills.js';
import { createInventoryState } from '../src/gameplay/inventory/inventory.js';
import { farmRowConversation, farmingConversation } from '../src/gameplay/skills/farming/farming-conversation.js';
import { sourceModule } from './module-loader.js';

function fixture() {
  const skills=createSkills(),inventory=createInventoryState();
  return {skills,inventory,farming:createFarming({skills,inventory})};
}
test('Regional beds use the same seed, tending, XP, harvest and save rules without needing a teacher',()=>{
  const {skills,inventory,farming}=fixture();
  assert.equal(farming.met,false);
  for(const region of ['Feradom','Elagos','Caricas']) {
    const row=REGIONAL_FARM_ROWS.find(r=>r.region===region);
    farming.stockSeeds();const seeds=inventory.count('carrot-seed'),xp=skills.xp('farming');
    assert.equal(farming.sow(row.id,'carrot',10).ok,true);
    assert.equal(inventory.count('carrot-seed'),seeds-1);
    assert.equal(farming.water(row.id,11).ok,true);
    assert.equal(farming.water(row.id,12).ok,false,'Watering cannot farm unlimited XP');
    const saved=farming.snapshot();assert.equal(validateFarmingSnapshot(saved,{playSeconds:12}),true);
    const copy=createFarming({skills,inventory});assert.equal(copy.restore(saved),true);
    assert.equal(copy.rowState(row.id,20).stage,'sown');
    assert.equal(copy.reap(row.id,20).ok,false);
    assert.equal(copy.reap(row.id,10+CROPS.carrot.seconds*.75).quantity,3);
    assert.equal(copy.reap(row.id,100).ok,false,'Harvest is paid once');
    assert.equal(skills.xp('farming')-xp,26);
  }
  assert.equal(farming.met,false,'Working new fields does not pretend Stanley has been met');
});
test('All established commons saves load alongside new regional beds with unknown rows rejected',()=>{
  const {farming}=fixture();farming.learn();farming.sow(FARM_ROWS[0].id,'barley',0);
  const legacy=farming.snapshot(),restored=createFarming();assert.equal(restored.restore(legacy),true);
  assert.equal(restored.rowState(FARM_ROWS[0].id,0).stage,'sown');
  assert.equal(restored.rowState(REGIONAL_FARM_ROWS[0].id,0).stage,'bare');
  const unknown=structuredClone(legacy);unknown.rows.fake={crop:'carrot',sownAt:0};
  assert.equal(validateFarmingSnapshot(unknown),false);
  const all={version:1,met:false,reaped:0,trees:{},rows:Object.fromEntries(ALL_FARM_ROWS.map(r=>[r.id,{crop:'carrot',sownAt:0,watered:true}]))};
  assert.equal(validateFarmingSnapshot(all),true);assert.equal(restored.restore(all),true);
  assert.equal(restored.view(100).ripe,ALL_FARM_ROWS.length);
});
test('Regional field panel names its bed, stocks local seeds and offers normal crop work',()=>{
  const {farming,inventory}=fixture(),row=REGIONAL_FARM_ROWS[0];let dialogue;
  const context={farming,inventory,playSeconds:0,openDialogue:(npc,lines,event,label,options)=>{dialogue={npc,lines,label,...options};},closeDialogue(){}};
  assert.equal(farmRowConversation(row.id,context),true);
  assert.equal(dialogue.npc.name,row.name);
  assert.ok(dialogue.choices.find(c=>c.id==='farm-sow-carrot').disabled);
  dialogue.choices.find(c=>c.id==='farm-shared-seeds').action();
  assert.equal(dialogue.choices.find(c=>c.id==='farm-sow-carrot').disabled,false);
  dialogue.choices.find(c=>c.id==='farm-sow-carrot').action();
  assert.equal(farming.rowState(row.id,0).stage,'sown');
});
test('Regional crop meshes follow local terrain and cull distant beds without losing growth',async()=>{
  const THREE=await import('../vendor/three.module.js');
  const {createFarmingView}=await sourceModule('../src/gameplay/skills/farming/farming-view.js');
  const {farming}=fixture(),scene=new THREE.Scene(),heightAt=(x,z)=>2+.08*x+.04*z;
  const view=createFarmingView({scene,world:{heightAt},farming});
  const row=REGIONAL_FARM_ROWS[0],another=REGIONAL_FARM_ROWS.at(-1);
  farming.stockSeeds();farming.sow(row.id,'carrot',0);view.update(100,row);
  const bed=view.group.children.find(g=>g.name===row.name),far=view.group.children.find(g=>g.name===another.name);
  assert.equal(bed.visible,true);assert.equal(far.visible,false);
  assert.ok(bed.children.some(m=>m.isInstancedMesh&&m.visible));
  const soil=bed.children.find(m=>m.name===row.name+' soil'),positions=soil.geometry.attributes.position;
  for(let i=0;i<positions.count;i++)assert.ok(Math.abs(positions.getY(i)-heightAt(row.x+positions.getX(i),row.z+positions.getZ(i))-.035)<.0001);
  view.update(100,another);assert.equal(bed.visible,false);
  view.update(100,row);assert.equal(bed.visible,true);assert.ok(bed.children.some(m=>m.isInstancedMesh&&m.visible));
  view.dispose();assert.equal(view.group.parent,null);
});
