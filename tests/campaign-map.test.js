import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chapterSnapshot,ownerOf,stability,factionRegions} from '../src/ui/map/campaign-map-model.js';
import {factionHTML} from '../src/ui/map/campaign-map-info.js';
import {parseCells} from '../src/ui/map/campaign-map-geometry.js';
import {cellKey,discoveredCells} from '../src/ui/map/campaign-map-discovery.js';
import {hexAtlasCorners} from '../src/world/terrain/region-world.js';
const factions=JSON.parse(readFileSync(new URL('../assets/campaign-factions.json',import.meta.url)));
test('political map requires the matching conquest and preserves it before and after the final report',()=>{
  for(const winner of ['empire','coalition']){
    for(const state of [null,{winner,reported:false,complete:false},{winner,reported:true,complete:false}])assert.equal(chapterSnapshot(state),'opening');
    const chapter=JSON.parse(JSON.stringify({winner,reported:true,complete:false})),before=JSON.stringify(chapter);
    const conquest={variant:winner==='empire'?'solis-sweep':'moros-outpost',cleared:true,complete:false};
    assert.equal(chapterSnapshot({...chapter,complete:true}),'opening','old completion alone is not proof of conquest');
    assert.equal(chapterSnapshot(chapter,{...conquest,cleared:false}),'opening');
    assert.equal(chapterSnapshot(chapter,{...conquest,variant:'moros-fallback'}),'opening');
    const snapshot=chapterSnapshot(chapter,conquest);
    assert.equal(ownerOf('Moros Plain',factions,snapshot),winner==='coalition'?'izol':'ambroni-empire');
    assert.equal(ownerOf('West Suval',factions,snapshot),winner==='empire'?'ambroni-empire':'west-suval');
    assert.equal(stability(winner==='empire'?'West Suval':'Moros Plain',snapshot)[1],'conflict');
    assert.equal(JSON.stringify(chapter),before);
    assert.equal(chapterSnapshot({...chapter,complete:true},JSON.parse(JSON.stringify({...conquest,complete:true}))),snapshot);
  }
});
test('visited hex polygons match the authored map without revealing their entire region',()=>{
  const svg=readFileSync(new URL('../assets/azhora-world-map.svg',import.meta.url),'utf8');
  const tints=svg.match(/<g id="region-tints"[^>]*>([\s\S]*?)<\/g>/)[1];
  const paths=new Map([...tints.matchAll(/<path data-region="([^"]+)"[^>]* d="([^"]+)"/g)].map(m=>[m[1],parseCells(m[2])]));
  const atlas=JSON.parse(readFileSync(new URL('../assets/azhora-dev-regions.json',import.meta.url)));
  for(const region of atlas.regions){
    const cells=paths.get(region.name);assert.ok(cells?.length,region.name);
    const all=new Set(region.cells.map(c=>cellKey(hexAtlasCorners(c.q,c.r).map(p=>[p.x,p.y]))));
    assert.equal(discoveredCells(cells,all).length,cells.length,region.name+' hex alignment');
    const one=new Set([all.values().next().value]);
    assert.equal(discoveredCells(cells,one).length,1,region.name+' does not reveal other hexes');
    assert.equal(discoveredCells(cells,new Set()).length,0);
    assert.equal(discoveredCells(cells,new Set(),true).length,cells.length);
  }
});
test('limited faction inspection identifies its count as discovered holdings',()=>{
  const html=factionHTML('ambroni-empire',{factions,territories:['Moros Plain'],snapshot:'opening',limited:true});
  assert.match(html,/1 discovered region/);assert.match(html,/Discovered territory/);assert.match(html,/Not charted/);assert.doesNotMatch(html,/data-region="Elagos"/);
});
test('every starting allocation exists in the atlas and the added Thalmagar regions have one owner',()=>{
  const atlas=JSON.parse(readFileSync(new URL('../assets/azhora-world-map.json',import.meta.url))),names=new Set(atlas.regions.map(r=>r.name));
  for(const f of factions)for(const region of factionRegions(f))assert.ok(names.has(region),region);
  for(const region of ['Cudon','Lesser Oremindi Mountains'])assert.deepEqual(factions.filter(f=>factionRegions(f).includes(region)).map(f=>f.id),['thalmagars-empire']);
});
test('public country profile does not disclose Thalmagar secret capital',()=>{
  const html=factionHTML('thalmagars-empire',{factions,territories:['Urubond'],snapshot:'opening',relation:'Diplomacy not yet specified.'});
  assert.match(html,/Black Fortress, Cape Thalmagar/);assert.doesNotMatch(html,/Secret true capital|Secret.*Urubond/i);
});
