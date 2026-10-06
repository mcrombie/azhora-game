import test from 'node:test';
import assert from 'node:assert/strict';
import { FACTIONS, describeRegion } from '../src/content/chapters/civil-war/campaign-world.js';
import { regionBuildStatus } from '../src/dev/tools/build-status.js';
import { SUBREGIONS, createMapFog } from '../src/ui/map/map-fog.js';
import { BALDRO_KINGDOMS, baldroRegionAt } from '../src/content/regions/baldro/baldro-world.js';

test('Dwarfland confederates two surviving sovereign dwarf kingdoms with separately described cities',()=>{
  const factions=BALDRO_KINGDOMS.map(k=>FACTIONS[k.id]);
  assert.notEqual(factions[0].id,factions[1].id);
  for(const k of BALDRO_KINGDOMS){
    const faction=FACTIONS[k.id],region=describeRegion(k.regionName);
    assert.equal(faction.confederation,'Dwarfland');assert.equal(faction.independent,true);assert.equal(region.control,k.id);
    assert.equal(region.settlements.length,1);assert.equal(region.settlements[0].name,k.name);assert.equal(region.settlements[0].nameStatus,'descriptive');
    const status=regionBuildStatus(k.regionName);assert.equal(status.state,'early');assert.match(status.detail,/earn entry/);assert.match(status.work,/royalty/);assert.match(status.work,/quests/);
  }
});

test('the chart discovers each Baldro gate and saddle only on entered ground',()=>{
  const fog=createMapFog();
  for(const k of BALDRO_KINGDOMS){
    const gate=SUBREGIONS.find(s=>s.id===`${k.id}-gate`),pass=SUBREGIONS.find(s=>s.id===`${k.id}-pass`);
    assert.deepEqual([gate.x,gate.z],[k.gate.x,k.gate.z]);
    assert.equal(baldroRegionAt(pass.x,pass.z),k.region);assert.equal(pass.region,k.regionName);
    assert.ok(!fog.found.includes(gate.id));fog.reveal(gate.x,gate.z);assert.ok(fog.found.includes(gate.id));
  }
});
