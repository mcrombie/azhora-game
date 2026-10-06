import test from 'node:test';
import assert from 'node:assert/strict';
import {createAnnexState} from '../src/experiments/climate-annex/climate-annex-state.js';
import {ANNEX_DIALOGUE} from '../src/experiments/climate-annex/climate-annex-dialogue.js';
import {readFileSync} from 'node:fs';
test('annex has a one-shot physical repair and resettable temporary state',()=>{
  const a=createAnnexState();assert.equal(a.phase,'leaking');assert.ok(a.move());assert.equal(a.move(),false);
  a.tick(1.2);assert.equal(a.progress,.5);a.tick(2);assert.equal(a.phase,'settled');assert.equal(a.move(),false);
  a.reset();assert.equal(a.progress,0);assert.equal(a.phase,'leaking');assert.equal(createAnnexState().phase,'leaking');
});
test('interaction needs proximity and clear reach, and a moved screen is not offered twice',()=>{
  const a=createAnnexState(),p={x:.2,z:-1.3};assert.equal(a.nearest(p).id,'partition');assert.equal(a.nearest(p,()=>false),null);
  assert.equal(a.nearest({x:30,z:30}),null);a.move();assert.equal(a.nearest(p),null);
});
test('original dialogue offers both conditions and the prototype has no save or atlas dependency',()=>{
  for(const id of ['attendantBefore','attendantAfter','emissaryBefore','emissaryAfter','heatBefore','heatAfter','frostBefore','frostAfter','humidity'])assert.ok(ANNEX_DIALOGUE[id]?.every(s=>typeof s==='string'&&s.length));
  for(const f of ['experiments/climate-annex/climate-annex.js','experiments/climate-annex/climate-annex-state.js','experiments/climate-annex/climate-annex-world.js','experiments/climate-annex/climate-annex-dialogue.js']){
    const s=readFileSync(new URL('../src/'+f,import.meta.url),'utf8');assert.doesNotMatch(s,/azhoraRoadStorage|localStorage|sessionStorage|reference-private|fetch\(|checkpoint\.save/);
  }
  const boot=readFileSync(new URL('../src/boot.js',import.meta.url),'utf8');assert.match(boot,/if\(query.get\('scene'\)===\s*'climate-annex'\)/);
  assert.ok(boot.indexOf("import('./experiments/climate-annex/climate-annex.js')")<boot.indexOf("import('./main.js')"));
});
