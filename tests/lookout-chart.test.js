import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {lookoutChart,LOOKOUT_CHART_REGIONS} from '../src/app/exploration/lookout-chart.js';
import {createTowerState} from '../src/app/exploration/tower-state.js';
const base=['Isareos','Nethereum','Ovesos','Caricas','Nesdor'];

test('only the completed campaign expands the chart, including after a saved conclusion',()=>{
  const tower=createTowerState();tower.begin();tower.enter('lookout');
  assert.deepEqual(lookoutChart(base,tower.snapshot().concluded).regions,base);
  tower.conclude();
  const saved=tower.snapshot(false),restored=createTowerState({tower:saved});
  const chart=lookoutChart(base,restored.snapshot().concluded);
  assert.equal(chart.regions.length,base.length+LOOKOUT_CHART_REGIONS.length);
  assert.deepEqual(chart.chartedRegions,chart.regions);
  assert.deepEqual(base,['Isareos','Nethereum','Ovesos','Caricas','Nesdor']);
  assert.equal(chart.regions.includes('Urubond'),false);
  assert.equal(chart.regions.includes('Elfland'),false);
  assert.deepEqual(lookoutChart(base,false).regions,base,'Restoring an earlier checkpoint restricts the map again');
});

test('all charted surroundings exist in the atlas, covering each topic and its regional subdivisions',()=>{
  const atlas=JSON.parse(readFileSync(new URL('../assets/azhora-world-map.json',import.meta.url),'utf8'));
  for(const name of LOOKOUT_CHART_REGIONS)assert.ok(atlas.regions.some(r=>r.name===name),name);
  for(const name of ['Elagos','Telemonia','Legemum','Northern Ascarth','Southern Ascarth','Eer','West Pyros','East Pyros','Yunethre','West Lotharn Mountains'])assert.ok(LOOKOUT_CHART_REGIONS.includes(name));
  assert.equal(LOOKOUT_CHART_REGIONS.filter(n=>n.includes('Ibenwood')).length,5);
});


test('the wider chart fills the named gaps and covers all public regions prepared for the lookout',()=>{
  const prepared=JSON.parse(readFileSync(new URL('../assets/lookout/landscape.json',import.meta.url),'utf8'));
  const expected=prepared.regions.map(r=>r.name).filter(name=>name!=='Urubond');
  const chart=lookoutChart(base,true);
  assert.deepEqual([...chart.regions].sort(),[...expected].sort(),'The chart must not fall behind the landscape again');
  for(const name of ['Gala','Oves Desert','Nether Desert','Meneth','Vastos','Moros Plain'])assert.ok(chart.chartedRegions.includes(name),name);
  assert.equal(chart.regions.length,new Set(chart.regions).size);
  assert.deepEqual(lookoutChart(base,false).chartedRegions,[]);
});
