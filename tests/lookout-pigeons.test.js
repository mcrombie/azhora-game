import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule} from './module-loader.js';
const {createLookoutPigeons}=await sourceModule('../src/content/regions/minora-frontier/lookout-pigeons.js');
const THREE=await import('../vendor/three.module.js');
const {LOOKOUT}=await import('../src/app/exploration/tower-state.js');

test('three living pigeons feed, remain attentive, fly and return without multiplying',()=>{
  const scene=new THREE.Group(),birds=createLookoutPigeons(scene),step=n=>{for(let i=0;i<n*20;i++)birds.update(.05);};
  const start=birds.state(),id=start[0].id;
  assert.equal(start.length,3);assert.equal(birds.target({...LOOKOUT,x:LOOKOUT.x-8,z:LOOKOUT.z+2}).id,id);
  assert.equal(birds.target({...LOOKOUT,x:LOOKOUT.x-8,z:LOOKOUT.z+2,y:LOOKOUT.y-134}),null);
  birds.observe(id);assert(birds.feed(id));step(2);assert(birds.state()[0].feeding);assert(!birds.fly(id));
  step(20);assert(!birds.state()[0].flying);assert.notEqual(birds.state()[0].headYaw,start[0].headYaw);
  assert(birds.fly(id));assert(!birds.fly(start[1].id));step(4);assert(birds.state()[0].flying);assert(!birds.feed(id));
  assert.notDeepEqual(birds.state()[0].position,start[0].position);step(7);
  assert(!birds.state()[0].flying);assert(Math.abs(birds.state()[0].position[0]-start[0].position[0])<.001);
  birds.observe(null);step(120);assert.equal(birds.state().length,3);assert(birds.state().every(b=>b.position.every(Number.isFinite)));
  birds.dispose();assert.equal(scene.children.length,0);
});

// The short flight is authored around the existing lookout frame, not through it.
test('pigeon return arcs clear the west pillars and parapet',()=>{
  const scene=new THREE.Group(),birds=createLookoutPigeons(scene);
  for(const bird of birds.state()){
    birds.observe(bird.id);assert(birds.fly(bird.id));
    for(let i=0;i<201;i++){
      birds.update(.05);const b=birds.state().find(v=>v.id===bird.id),[x,y,z]=b.position;
      if(Math.abs(x+10)<.65){assert(y>1.6);assert(z>1&&z<9);}
      assert(b.position.every(Number.isFinite));
    }
  }
  birds.dispose();
});
