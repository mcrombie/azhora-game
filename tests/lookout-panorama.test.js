import test from 'node:test';
import assert from 'node:assert/strict';
import {lookoutCamera,LOOKOUT_HORIZON} from '../src/app/exploration/lookout-panorama.js';
import {LOOKOUT} from '../src/app/exploration/tower-state.js';
import {LOOKOUT_TOUR} from '../src/content/regions/minora-frontier/lookout-tour.js';
test('first-person river and east eyes clear parapets while keeping the real tower elevation',()=>{
  for(const view of ['river','east'])for(const t of [0,10,18,90]){
    const {eye,target,fov}=lookoutCamera(view,t);
    assert.equal(eye.y,LOOKOUT.y+1.75);assert.ok(Math.max(Math.abs(eye.x-LOOKOUT.x),Math.abs(eye.z-LOOKOUT.z))>10.5);
    assert.ok(view==='east'?target.x>LOOKOUT.x+1800:target.z>LOOKOUT.z+1700);assert.ok(fov>=45&&fov<=66);
    assert.ok(target.x<LOOKOUT_HORIZON.maxX&&target.z<LOOKOUT_HORIZON.maxZ);
  }
});

test('the five further views keep the tower elevation and the real geographic bearing',()=>{
  for(const page of LOOKOUT_TOUR)for(const t of [0,9,18,100]){
    const {eye,target,fov}=lookoutCamera(page.view,t);
    assert.equal(eye.y,LOOKOUT.y+1.75);
    assert.ok(Math.max(Math.abs(eye.x-LOOKOUT.x),Math.abs(eye.z-LOOKOUT.z))>10.5);
    const a=Math.atan2(target.x-eye.x,target.z-eye.z),b=Math.atan2(page.target.x-LOOKOUT.x,page.target.z-LOOKOUT.z);
    assert.ok(Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)))<.2,'Composition does not invent a new geographic bearing');
    assert.ok(fov>=45&&fov<=66);assert.ok(Object.values(target).every(Number.isFinite));
  }
});

test('regional briefings preserve the requested story without introducing a new campaign',()=>{
  const text=LOOKOUT_TOUR.map(p=>p.words).join(' ');
  for(const fact of [/Ascarth army was besieging Nylon/,/Telemon rule the people of Legemum as slave masters/,/remains neutral/,/civil war of their own/,/Elfland can be reached/,/very wary of strangers/,/joining the Lizeemi League/,/without a garrison/,/rumors of outlaws/])assert.match(text,fact);
  assert.deepEqual(LOOKOUT_TOUR.map(p=>p.view),['southern-countries','pyros','ibenwood','yunethre','west-lotharn']);
});
