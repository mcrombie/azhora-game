import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule} from './module-loader.js';
import {TOWER_BIRDS} from '../src/content/regions/minora-frontier/tower-bird-roster.js';
import {TOWER_FLOORS} from '../src/content/regions/minora-frontier/tower-floor-layout.js';
import {TOWER} from '../src/app/exploration/tower-state.js';

test('all eleven floors have distinct adult-sized birds with finite, inexpensive meshes',async()=>{
  const THREE=await sourceModule('../vendor/three.module.js');
  const {createTowerBirdModel}=await sourceModule('../src/content/regions/minora-frontier/tower-bird-model.js');
  assert.deepEqual(TOWER_BIRDS.map(b=>b.floor).sort(),TOWER_FLOORS.map(f=>f.id).sort());
  assert.equal(new Set(TOWER_BIRDS.map(b=>b.species)).size,11);
  for(const d of TOWER_BIRDS){
    // Non-zero parent transforms must never get baked into the bird's scale.
    const parent=new THREE.Group();parent.position.set(-2400,50,-34);
    const bird=createTowerBirdModel(parent,d);
    const bounds=new THREE.Box3().setFromObject(bird.root),size=bounds.getSize(new THREE.Vector3());
    assert.ok(Math.abs((d.form==='owl'?size.y:size.z)-d.length)<1e-5,d.name+' is life-sized');
    parent.updateMatrixWorld(true);
    assert.ok(Math.abs(new THREE.Box3().setFromObject(bird.root).min.y-50)<1e-5,d.name+' feet are on the perch');
    assert.equal(bird.meshes.length,4);let triangles=0;
    for(const m of bird.meshes){triangles+=m.geometry.attributes.position.count/3;assert.ok([...m.geometry.attributes.position.array].every(Number.isFinite));}
    assert.ok(triangles<2200,d.name+' geometry stays bounded');bird.dispose();assert.equal(parent.children.length,0);
  }
});

test('birds are lazy, visible-floor animated, and their perches leave the room and stair aisles open',async()=>{
  const THREE=await sourceModule('../vendor/three.module.js');
  const {createTowerChamber}=await sourceModule('../src/content/regions/minora-frontier/tower-chamber.js');
  const chamber=createTowerChamber(new THREE.Scene());
  try{
    assert.equal(chamber.state().floors.filter(f=>f.bird).length,3);
    const player={x:TOWER.x+4,y:TOWER.y,z:TOWER.z+3};
    chamber.update(0,player,.04);
    let floors=chamber.state().floors,bird=floors.find(f=>f.id==='taleth').bird;
    assert.ok(bird.active&&bird.clock>0);
    const before=floors.find(f=>f.id==='senro').bird.clock;
    for(let i=0;i<30;i++)chamber.update(i*.04,player,.04);
    assert.equal(chamber.state().floors.find(f=>f.id==='senro').bird.clock,before,'hidden birds do no animation work');
    for(const floor of TOWER_FLOORS)chamber.ensureFloor(floor.id);
    assert.equal(chamber.colliders.filter(c=>c.kind==='tower-bird-perch').length,11);
    for(const c of chamber.colliders.filter(c=>c.kind==='tower-bird-perch')){
      assert.ok(c.x-c.hx>TOWER.x+2.3,'central walking aisle stays clear');
      assert.ok(c.z-c.hz>TOWER.z+1.3,'east doorway aisle stays clear');
      const overlaps=chamber.colliders.filter(o=>o!==c&&o.kind!=='tower-bird-perch'&&o.minY<c.maxY&&o.maxY>c.minY+.1&&
        Math.abs(o.x-c.x)<(o.hx??o.r??0)+c.hx&&Math.abs(o.z-c.z)<(o.hz??o.r??0)+c.hz);
      assert.deepEqual(overlaps,[],'perch does not intersect another furnishing');
    }
    assert.equal(chamber.state().sanctuary,null,'birds do not force the sanctuary to build');
  }finally{chamber.dispose();}
});
