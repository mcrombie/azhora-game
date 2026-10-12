import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {applyGameAtlasAdjustments,GAME_ATLAS_ADJUSTMENTS} from '../src/world/terrain/game-atlas-adjustments.js';
import {ORSA_RIVER_EDGES,ORSA_RETIRED_RIVER_KEYS,ORSA_HEADWATER_HILLS,riverEdgeKey} from '../src/content/regions/outer-regions/orsa-river.js';
import {OUTER_RIVERS,outerGround,outerWaterAt,outerSegment} from '../src/content/regions/outer-regions/outer-regions-world.js';
import {OUTER_RIVER_EDGES} from '../src/content/regions/outer-regions/outer-regions-atlas.js';
import {REGION_IDS,REGION_CELLS,landDistance,SURVEY,TRANSFORM} from '../src/world/terrain/region-world.js';
import {riverCourses} from '../src/world/terrain/region-layout.js';
import {ownerOf,stability} from '../src/ui/map/campaign-map-model.js';
import {regionBase} from '../src/world/terrain/world-terrain.js';
const json=file=>JSON.parse(readFileSync(new URL(file,import.meta.url),'utf8').replace(/^\uFEFF/,''));
const original=json('../../world-builder/map/resources/examples/azhora.wwmap');
const cellKeys=(map,name)=>Object.entries(map.hexes).filter(([,c])=>c.region===name).map(([k])=>k).sort();

test('Noth Hills moves once, retaining both footprints and stable numeric region IDs',()=>{
  const before=JSON.stringify(original),m=applyGameAtlasAdjustments(original);
  assert.equal(JSON.stringify(original),before);assert.deepEqual(applyGameAtlasAdjustments(m),m);
  assert.deepEqual(cellKeys(m,'Noth Hills'),cellKeys(original,'South Thoth'));
  assert.deepEqual(cellKeys(m,'New Gorgiwood'),cellKeys(original,'Noth Hills'));
  assert.ok(!m.regions['South Thoth']);assert.ok(m.regions.Gorgiwood);
  assert.equal(REGION_IDS['New Gorgiwood'],81);assert.equal(REGION_IDS['Noth Hills'],88);
  assert.ok(REGION_CELLS['New Gorgiwood'].every(c=>c.terrain==='deep_forest'));
  assert.ok(REGION_CELLS['Noth Hills'].every(c=>c.terrain==='hills'));
});
test('the short Orsa stream follows the shared border west to the sea without moving either region',()=>{
  const m=applyGameAtlasAdjustments(original);
  for(const name of ['North Orsa','South Orsa'])assert.deepEqual(cellKeys(m,name),cellKeys(original,name));
  for(const e of ORSA_RIVER_EDGES){assert.equal(m.hexes[e.a.join(',')].region,'North Orsa');assert.equal(m.hexes[e.b.join(',')].region,'South Orsa');assert.equal(m.rivers[riverEdgeKey(e)],'small');}
  const stream=OUTER_RIVERS.filter(r=>r.orsa);assert.equal(stream.length,1);
  const r=stream[0];assert.ok(r.width<=2&&r.depth<1);assert.ok(r.points[0].x<r.points.at(-1).x);
  assert.ok(landDistance(r.points[0].x,r.points[0].z)<3);assert.ok(r.points[0].y<.05);
  for(let i=1;i<r.points.length;i++)assert.ok(r.points[i].y>=r.points[i-1].y);
  for(const p of r.points.slice(1,-2)){assert.notEqual(outerWaterAt(p.x,p.z),null);assert.ok(outerGround(p.x,p.z,regionBase(p.x,p.z))<outerWaterAt(p.x,p.z));}
  const mouth=r.points[0];for(let i=0;i<=15;i++)assert.ok(outerGround(mouth.x-i,mouth.z-i*.577,regionBase(mouth.x-i,mouth.z-i*.577))<0,'open sea outlet');
});
test('Orsa has independent headwaters, with no vertex or riverbank connection to another river',()=>{
  const keys=new Set(ORSA_RIVER_EDGES.map(riverEdgeKey));
  const ends=edge=>riverCourses(SURVEY,[edge],TRANSFORM,{soften:0})[0].points;
  const streamEnds=ORSA_RIVER_EDGES.flatMap(ends);
  for(const edge of OUTER_RIVER_EDGES.filter(e=>!keys.has(riverEdgeKey(e))))for(const p of ends(edge))
    assert.ok(streamEnds.every(q=>Math.hypot(p.x-q.x,p.z-q.z)>.01),'Orsa shares no river junction');
  const r=OUTER_RIVERS.find(r=>r.orsa),spring=r.points.at(-1);let clearance=Infinity;
  for(const other of OUTER_RIVERS.filter(r=>!r.orsa))for(let i=1;i<other.points.length;i++)for(const p of r.points)
    clearance=Math.min(clearance,outerSegment(p.x,p.z,other.points[i-1],other.points[i]).distance-other.width-r.width);
  assert.ok(clearance>70,'dry ground separates the streams, including their banks');
  for(const dx of [30,60,90]){assert.equal(outerWaterAt(spring.x+dx,spring.z),null);assert.ok(outerGround(spring.x+dx,spring.z,regionBase(spring.x+dx,spring.z))>spring.y+4,'the eastern watershed rises above the spring');}
});
test('a connected eastern Orsa hill belt appears in both atlases and removes the old connection on refresh',()=>{
  const m=applyGameAtlasAdjustments(original),old=structuredClone(m);
  for(const key of ORSA_RETIRED_RIVER_KEYS)old.rivers[key]='small';
  assert.deepEqual(applyGameAtlasAdjustments(old),m,'refresh removes the formerly connected reach');
  const dev=json('../assets/azhora-dev-regions.json'),hills=new Set(ORSA_HEADWATER_HILLS.map(c=>`${c.q},${c.r}`));
  for(const {q,r,region} of ORSA_HEADWATER_HILLS){
    assert.equal(m.hexes[`${q},${r}`].terrain,'hills');
    assert.equal(REGION_CELLS[region].find(c=>c.q===q&&c.r===r).terrain,'hills');
    assert.equal(dev.regions.find(c=>c.name===region).cells.find(c=>c.q===q&&c.r===r).terrain,'hills');
  }
  const reached=new Set(),pending=[hills.values().next().value];
  while(pending.length){const k=pending.pop();if(reached.has(k))continue;reached.add(k);const [q,r]=k.split(',').map(Number);for(const [dq,dr] of [[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]]){const n=`${q+dq},${r+dr}`;if(hills.has(n)&&!reached.has(n))pending.push(n);}}
  assert.equal(reached.size,hills.size,'one continuous upland belt');
  for(const name of ['North Orsa','South Orsa'])assert.ok(REGION_CELLS[name].some(c=>c.terrain==='plains'),'western lowlands remain');
});
test('normal atlas, developer atlas, and campaign owners use the revised names',()=>{
  const atlas=json('../assets/azhora-world-map.json'),dev=json('../assets/azhora-dev-regions.json'),factions=json('../assets/campaign-factions.json');
  for(const a of [atlas,dev]){assert.ok(a.gameAdjustments.includes('orsa-independent-headwaters-v2'));assert.ok(a.regions.some(r=>r.name==='New Gorgiwood'));assert.ok(a.regions.some(r=>r.name==='Noth Hills'));assert.ok(!a.regions.some(r=>r.name==='South Thoth'));}
  const s=readFileSync(new URL('../assets/azhora-world-map.svg',import.meta.url),'utf8');assert.ok(s.includes('data-region="New Gorgiwood"'));assert.ok(s.includes('NOTH HILLS'));assert.ok(!s.includes('South Thoth'));
  assert.ok(!JSON.stringify(factions).includes('South Thoth'));
  assert.equal(ownerOf('New Gorgiwood',factions),'gorgiwood-goblins');
  assert.equal(ownerOf('Noth Hills',factions),'disputed');
  assert.deepEqual(stability('Noth Hills'),['Disputed','conflict']);
  assert.deepEqual(factions.filter(f=>f.disputedRegions?.includes('Noth Hills')).map(f=>f.id).sort(),['gorgiwood-goblins','nonoth']);
  assert.ok(!factions.some(f=>f.regions?.includes('Noth Hills')));
  assert.ok(GAME_ATLAS_ADJUSTMENTS.includes('noth-gorgiwood-orsa-v1'));
});
