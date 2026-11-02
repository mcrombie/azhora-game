import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './module-loader.js';

const THREE = await sourceModule('../vendor/three.module.js');
const { createCentaur } = await sourceModule('../src/world/actors/centaur-model.js');
const { createFrontierFigure } = await sourceModule('../src/content/regions/minora-frontier/frontier-figures.js');
const { FRONTIER_PRINCES } = await sourceModule('../src/content/regions/minora-frontier/frontier-people.js');

function directMeshBounds(joint) {
  const bounds = new THREE.Box3();
  for (const mesh of joint.children.filter(child => child.isMesh && child.visible)) {
    mesh.geometry.computeBoundingBox();
    bounds.union(mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld));
  }
  assert.equal(bounds.isEmpty(), false);
  return bounds;
}

test('centaurs remain one connected, four-legged creature while walking and drawing a bow', () => {
  for (const options of [{ variant: 0 }, { variant: 1, archer: true }, { variant: 2, envoy: true }]) {
    const actor = createCentaur(options), horse = actor.group.children[0], human = actor.group.children[1];
    const hiddenLegs = [];
    actor.group.traverse(object => { if (object.name === 'Hidden human leg') hiddenLegs.push(object); });
    assert.equal(hiddenLegs.length, 2, 'both original human leg chains are suppressed');
    assert.equal(actor.group.getObjectByName('Saddle'), undefined);
    for (let frame = 0; frame < 18; frame++) {
      actor.animate(frame / 7, frame < 5 ? 0 : 4, true, { armed: true, draw: frame / 17 });
      actor.group.updateWorldMatrix(true, true);
      const visible = [];
      actor.group.traverseVisible(object => visible.push(object));
      assert.equal(visible.filter(object => object.name === 'Head').length, 1, 'no second horse head');
      assert.equal(visible.filter(object => /^(Left|Right) (Fore|Hind) Hip$/.test(object.name)).length, 4);
      assert.ok(hiddenLegs.every(leg => !visible.includes(leg)), 'walking must not restore human legs');
      const waist = actor.group.getObjectByName('Continuous centaur waist');
      const waistBounds = new THREE.Box3().setFromObject(waist);
      assert.ok(waistBounds.intersectsBox(directMeshBounds(horse.getObjectByName('Spine'))), 'waist joins the equine body');
      assert.ok(waistBounds.intersectsBox(directMeshBounds(human.getObjectByName('Chest'))), 'waist joins the human torso');
      for (const mesh of visible.filter(object => object.isMesh))
        assert.ok(mesh.matrixWorld.elements.every(Number.isFinite));
    }
  }
});

test('beastfolk faces, dress and weapons remain readable within a bounded animated model', () => {
  for (const options of [{variant:0},{variant:1,archer:true},{variant:2,envoy:true}]) {
    const actor=createCentaur(options),head=actor.group.children[1].getObjectByName('Head');
    for (const name of ['Broad animal muzzle','Left attentive animal ear','Right attentive animal ear',
      'Left watchful eye','Right watchful eye','Layered crown and neck mane','Backfall mane',
      'Worked leather and woven sash','Left stitched bracer','Centaur woven flankcloths'])
      assert.ok(actor.group.getObjectByName(name),name);
    if(options.envoy)assert.ok(actor.group.getObjectByName('Envoy document case'));
    actor.setArmed(true);actor.setWeapon(options.archer?'bow':'spear');
    actor.animate(1,3,true,{armed:true,draw:options.archer?.8:0});actor.group.updateMatrixWorld(true);
    const headBounds=new THREE.Box3(),headInverse=head.matrixWorld.clone().invert();
    let meshes=0,triangles=0;
    actor.group.traverseVisible(object=>{
      if(!object.isMesh)return;
      meshes++;triangles+=(object.geometry.index?.count??object.geometry.attributes.position.count)/3;
      assert.ok(object.geometry.attributes.position.array.every(Number.isFinite));
    });
    head.traverseVisible(object=>{
      if(!object.isMesh)return;
      object.geometry.computeBoundingBox();
      headBounds.union(object.geometry.boundingBox.clone().applyMatrix4(headInverse.clone().multiply(object.matrixWorld)));
    });
    assert.ok(headBounds.max.z>.25&&headBounds.max.z<.34,'short, broad feline muzzle rather than an elongated horse face');
    assert.ok(headBounds.max.y>.4&&headBounds.max.y<.55,'rounded ears stay within the mane silhouette');
    assert.ok(headBounds.min.y<-.2,'mane falls below the jaw');
    assert.ok(meshes<45,`rigid ornaments are batched (${meshes} visible meshes)`);
    assert.ok(triangles<18000,`three nearby camp figures remain modest (${triangles} triangles each)`);
    actor.dispose();
  }
});

test('disposing one centaur is idempotent and leaves other actors shared rig resources alive', () => {
  const first=createCentaur(),second=createCentaur({variant:2,envoy:true});
  const scene=new THREE.Group();scene.add(first.group,second.group);
  const geometry=new Set(),materials=new Set();
  second.group.traverse(o=>{if(o.isMesh){geometry.add(o.geometry);materials.add(o.material);}});
  let sharedDisposals=0,ownedDisposals=0;
  for(const resource of [...geometry,...materials])resource.addEventListener('dispose',()=>sharedDisposals++);
  const owned=new Set();first.group.traverse(o=>{if(o.isMesh&&o.name==='Rigid character batch')owned.add(o.geometry);});
  for(const resource of owned)resource.addEventListener('dispose',()=>ownedDisposals++);
  first.dispose();first.dispose();
  assert.equal(first.group.parent,null);assert.equal(second.group.parent,scene);
  assert.equal(sharedDisposals,0,'cached materials and shared sphere/cylinder primitives must survive');
  assert.equal(ownedDisposals,owned.size,'each per-instance batch is released exactly once');
  second.animate(3,4,true,{armed:true});second.group.updateMatrixWorld(true);
  second.group.traverseVisible(o=>{if(o.isMesh)assert.ok(o.matrixWorld.elements.every(Number.isFinite));});
  second.dispose();
});

function hairBounds(head, color) {
  const bounds = new THREE.Box3(), wanted = new THREE.Color(color), point = new THREE.Vector3();
  head.updateWorldMatrix(true, true);
  const inverse = head.matrixWorld.clone().invert();
  head.traverseVisible(mesh => {
    if (!mesh.isMesh) return;
    const positions = mesh.geometry.attributes.position, colors = mesh.geometry.attributes.color;
    if (!colors) return;
    const transform = inverse.clone().multiply(mesh.matrixWorld);
    for (let i = 0; i < positions.count; i++) {
      if (Math.abs(colors.getX(i) - wanted.r) + Math.abs(colors.getY(i) - wanted.g) + Math.abs(colors.getZ(i) - wanted.b) > .002) continue;
      bounds.expandByPoint(point.fromBufferAttribute(positions, i).applyMatrix4(transform));
    }
  });
  assert.equal(bounds.isEmpty(), false, 'requested hair color survives geometry batching');
  return bounds;
}

test('Cedric has loose dirty-blond hair and Wilhelm a bare, silver-blond crop with no bun', () => {
  for (const prince of FRONTIER_PRINCES) {
    const actor = createFrontierFigure(prince), head = actor.group.getObjectByName('Head');
    assert.equal(prince.hat, false);
    assert.ok(actor.group.getObjectByName(`mercenary-hair-${prince.look.hairStyle}`));
    const gear = [];
    head.traverse(object => { if (object.name.startsWith('mercenary-headgear-')) gear.push(object.name); });
    assert.ok(gear.every(name => name === 'mercenary-headgear-bare'));
    const visibleHeadgear=[]; head.traverseVisible(object=>{if(/helm|cap|hat/i.test(object.name))visibleHeadgear.push(object.name);});
    assert.deepEqual(visibleHeadgear, [], 'princes wear no unsolicited headgear');
    const bounds = hairBounds(head, prince.look.hair);
    if (prince.id === 'prince-cedric') {
      assert.equal(prince.look.hairStyle, 'long-loose');
      assert.ok(bounds.min.y < -.2, 'long hair falls below the head and onto the shoulders');
    } else {
      assert.equal(prince.look.noHat, true);
      assert.equal(prince.look.hairStyle, 'short-cropped');
      assert.equal(prince.look.expression, 'twisted');
      assert.ok(bounds.min.y > -.04, 'hair stays within the skull envelope rather than forming a long tail');
      assert.ok(bounds.min.z > -.23, 'the crop follows the skull without a rear bun');
      assert.ok(bounds.max.y < .46, 'no cap or helmet substitutes for the pale crop');
    }
  }
});
