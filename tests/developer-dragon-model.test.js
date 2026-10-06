import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
const { createDeveloperDragon } = await sourceModule('../src/dev/tools/developer-dragon-model.js');
const { createCharacter } = await sourceModule('../src/content/characters/characters.js');

test('The green dragon has finite closed hide, four legs, a long tail and real triangular flight membranes', () => {
  const dragon = createDeveloperDragon();
  assert.equal(dragon.legs.length, 4); assert.equal(dragon.tail.length, 6);
  assert.equal(dragon.wings.length, 2); assert.equal(dragon.wingTips.length, 2);
  assert.equal(dragon.wingFingerBones.length, 16);
  const hideNormals = dragon.torso.geometry.getAttribute('normal');
  assert.ok(hideNormals.getY(30) > .5, 'The dorsal hide faces outward and remains visible with front-face culling');
  let vertices = 0;
  dragon.group.traverse(object => {
    if (!object.isMesh) return;
    const position = object.geometry.getAttribute('position'); vertices += position.count;
    for (const value of position.array) assert.ok(Number.isFinite(value), `${object.name} has finite vertices`);
    const normal = object.geometry.getAttribute('normal');
    for (const value of normal.array) assert.ok(Number.isFinite(value), `${object.name} has finite normals`);
  });
  assert.ok(vertices < 30000, `Procedural mount remains lightweight (${vertices} vertices)`);
  for (const membrane of dragon.wingMembranes) {
    assert.equal(membrane.geometry.type, 'BufferGeometry');
    const position = membrane.geometry.getAttribute('position');
    assert.ok(position.count >= 36, 'Membrane has a triangulated outline');
    assert.equal(membrane.material.side, THREE.DoubleSide);
    let area = 0;
    for (let i = 0; i < position.count; i += 3) {
      const a = new THREE.Vector3().fromBufferAttribute(position, i);
      const b = new THREE.Vector3().fromBufferAttribute(position, i + 1);
      const c = new THREE.Vector3().fromBufferAttribute(position, i + 2);
      const triangleArea = b.sub(a).cross(c.sub(a)).length() / 2;
      assert.ok(triangleArea > 1e-7, 'Every membrane triangle has nonzero surface area');
      area += triangleArea;
    }
    assert.ok(area > .7, 'Each web carries a substantial wing surface');
  }
  dragon.update(0, { flying: true }); dragon.group.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(dragon.group), size = bounds.getSize(new THREE.Vector3());
  assert.ok(size.x > 7.5 && size.x < 8.5, `Spread wingspan ${size.x.toFixed(2)}m`);
  assert.ok(size.z > 5.8 && size.z < 7, `Dragon length ${size.z.toFixed(2)}m`);
  const color = dragon.wingMembranes[0].material.color;
  assert.ok(color.g > color.r && color.g > color.b, 'Dragon membrane reads green');
});

test('Dragon flight beats mirrored shoulders and wrists and moves its articulated tail deterministically', () => {
  const dragon = createDeveloperDragon();
  dragon.update(.25, { flying: true, speed: 24 });
  const before = [...dragon.wings, ...dragon.wingTips, ...dragon.tail].map(joint => joint.rotation.toArray());
  dragon.update(.67, { flying: true, speed: 24 });
  const after = [...dragon.wings, ...dragon.wingTips, ...dragon.tail].map(joint => joint.rotation.toArray());
  assert.notDeepEqual(before, after);
  for (const pair of [dragon.wings, dragon.wingTips]) {
    assert.equal(pair[0].rotation.z, -pair[1].rotation.z);
    assert.equal(pair[0].rotation.y, -pair[1].rotation.y);
    assert.equal(pair[0].rotation.x, pair[1].rotation.x);
  }
  dragon.update(.25, { flying: true, speed: 24 });
  assert.deepEqual([...dragon.wings, ...dragon.wingTips, ...dragon.tail].map(joint => joint.rotation.toArray()), before);
  assert.ok(dragon.legs.every(leg => leg.rotation.x > .5), 'All four legs tuck for flight');
  dragon.update(1, { flying: false });
  assert.ok(dragon.legs.every(leg => leg.rotation.x === 0), 'Landing extends all four legs');
});

test('The seated player meets the dragon saddle and remains upright through wingbeats and banking', () => {
  const dragon = createDeveloperDragon(), player = createCharacter();
  for (let i = 0; i < 90; i++) player.animate(i / 60, 0, true, { action: 'idle', riding: { pace: 0 }, armed: false });
  for (const flying of [false, true]) {
    for (const bank of [-.24, 0, .24]) {
      dragon.group.position.set(18, 90, -34); dragon.group.rotation.y = .7;
      dragon.update(1.5, { flying, speed: 25, bank }); dragon.group.updateMatrixWorld(true);
      dragon.passengerAnchor.getWorldPosition(player.group.position); player.group.rotation.y = dragon.group.rotation.y;
      player.group.updateMatrixWorld(true);
      const left = player.group.getObjectByName('Left Hip').getWorldPosition(new THREE.Vector3());
      const right = player.group.getObjectByName('Right Hip').getWorldPosition(new THREE.Vector3());
      const hips = left.add(right).multiplyScalar(.5), saddle = dragon.passengerSeat.getWorldPosition(new THREE.Vector3());
      assert.ok(hips.distanceTo(saddle) < .025, `Hips rest on saddle with flying=${flying}, bank=${bank}`);
      const upright = new THREE.Vector3(0, 1, 0).applyQuaternion(dragon.passengerAnchor.getWorldQuaternion(new THREE.Quaternion()));
      assert.ok(upright.distanceTo(new THREE.Vector3(0, 1, 0)) < 1e-8, 'Banking keeps the carried traveler upright');
    }
  }
});

test('Dragon fire opens the lower jaw and its muzzle follows the actual posed and parented mouth',()=>{
  const dragon=createDeveloperDragon(),parent=new THREE.Group();parent.add(dragon.group);
  parent.position.set(11,70,-18);parent.rotation.y=.48;
  dragon.group.position.set(2,3,5);dragon.group.rotation.y=-.9;
  dragon.update(.8,{flying:true,speed:25,bank:.23});
  assert.equal(dragon.jaw.rotation.x,0);assert.equal(dragon.throatGlow.visible,false);
  const closed=dragon.mouthWorldPosition(new THREE.Vector3());
  dragon.update(.8,{flying:true,speed:25,bank:.23,breathing:true,breathIntensity:1,breathPitch:.48});
  assert.ok(dragon.jaw.rotation.x>.65);assert.ok(dragon.throatGlow.visible);
  assert.ok(dragon.throatGlow.material.opacity>.5);
  const out=new THREE.Vector3(),result=dragon.mouthWorldPosition(out);
  assert.equal(result,out);assert.ok(out.distanceTo(closed)>.1);
  assert.ok(out.distanceTo(dragon.mouthAnchor.getWorldPosition(new THREE.Vector3()))<1e-9);
  const direction=dragon.mouthWorldDirection(new THREE.Vector3());
  assert.ok(Math.abs(direction.length()-1)<1e-10);assert.ok(direction.y<-.35,'Aimed fire leaves the mouth downward');
  const actual=new THREE.Vector3(0,0,1).transformDirection(dragon.mouthAnchor.matrixWorld);
  assert.ok(direction.distanceTo(actual)<1e-10,'Damage and VFX can use the same articulated nozzle');
  dragon.animate(1,25,false,{flying:true,breathing:false});
  assert.equal(dragon.jaw.rotation.x,0);assert.equal(dragon.throatGlow.visible,false);
});

test('Dragon breathing is deterministic, bounded and preserves its ordinary flight animation',()=>{
  const dragon=createDeveloperDragon(),pose={flying:true,speed:25,breathing:true,breathIntensity:.7,breathPitch:.4};
  dragon.animate(2,25,false,pose);
  const first=[dragon.jaw.rotation.x,dragon.head.rotation.x,dragon.throatGlow.material.opacity,...dragon.mouthWorldPosition().toArray()];
  dragon.animate(5,25,false,{...pose,breathIntensity:Infinity,breathPitch:NaN});
  assert.ok(Number.isFinite(dragon.head.rotation.x));assert.ok(Number.isFinite(dragon.jaw.rotation.x));
  dragon.animate(2,25,false,pose);
  assert.deepEqual([dragon.jaw.rotation.x,dragon.head.rotation.x,dragon.throatGlow.material.opacity,...dragon.mouthWorldPosition().toArray()],first);
  assert.ok(dragon.legs.every(leg=>leg.rotation.x>.5));
});
