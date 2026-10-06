import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './module-loader.js';

const THREE = await sourceModule('../vendor/three.module.js');
const { createDwarf, DWARF_PROPORTIONS } = await sourceModule('../src/world/actors/dwarf-model.js');
const { createCharacter } = await sourceModule('../src/content/characters/characters.js');

const bounds = actor => { actor.group.updateWorldMatrix(true, true); return new THREE.Box3().setFromObject(actor.group).getSize(new THREE.Vector3()); };

test('Baldro dwarves have visibly short broad adult proportions instead of scaled-down human bodies', () => {
  const human = createCharacter({ role: 'mercenary', hat: false, look: { headgear: 'bare', hairStyle: 'short-cropped' } });
  const ordinary = bounds(human);
  for (const role of ['guard', 'artisan', 'resident']) {
    const dwarf = createDwarf({ role }), size = bounds(dwarf), body = dwarf.group.getObjectByName('Weight and hips');
    assert.ok(size.y < ordinary.y * .85, `${role} is distinctly shorter: ${size.y}/${ordinary.y}`);
    assert.ok(size.x > ordinary.x * 1.2, `${role} retains broad shoulders: ${size.x}/${ordinary.x}`);
    assert.deepEqual(body.scale.toArray(), [DWARF_PROPORTIONS.girth, DWARF_PROPORTIONS.height, DWARF_PROPORTIONS.depth]);
    assert.deepEqual(dwarf.group.scale.toArray(), [1, 1, 1], 'dwarf proportions survive a caller changing root scale');
    assert.equal(dwarf.group.userData.creature, 'dwarf');
    assert.ok(dwarf.lodAppearance.height < .8 && dwarf.lodAppearance.girth > 1.3);
  }
});

test('guards artisans and residents have different working clothes and all variants are hatless', () => {
  const clothes = { guard: 'Dwarf guard shoulder plate', artisan: 'Dwarf work apron', resident: 'Dwarf woven waistcoat' };
  for (const [role, clothing] of Object.entries(clothes)) for (let variant = 0; variant < 3; variant++) {
    const dwarf = createDwarf({ role, variant, city: 'east-baldro' }), headgear = [];
    assert.ok(dwarf.group.getObjectByName(clothing));
    assert.ok(dwarf.group.getObjectByName(`mercenary-beard-${dwarf.group.userData.facialHair}`));
    dwarf.group.traverse(object => { if (object.name.startsWith('mercenary-headgear-')) headgear.push(object.name); });
    assert.deepEqual(headgear, ['mercenary-headgear-bare']);
    assert.equal(dwarf.group.userData.hat, false);
    assert.equal(dwarf.group.userData.city, 'east');
    assert.ok(['short-cropped', 'bald', 'long-loose'].includes(dwarf.group.userData.hairStyle));
    assert.ok(dwarf.group.getObjectByName(`mercenary-hair-${dwarf.group.userData.hairStyle}`));
  }
});

test('short dwarf hair stays inside the skull envelope and does not form a bun at the nape', () => {
  const dwarf = createDwarf(), head = dwarf.group.getObjectByName('Head'), hair = new THREE.Color(dwarf.lodAppearance.hair);
  head.updateWorldMatrix(true, true);
  const inverse = head.matrixWorld.clone().invert(), box = new THREE.Box3(), point = new THREE.Vector3();
  head.traverseVisible(mesh => {
    if (!mesh.isMesh) return;
    const positions = mesh.geometry.attributes.position, colors = mesh.geometry.attributes.color;
    if (!colors) return;
    const transform = inverse.clone().multiply(mesh.matrixWorld);
    for (let i = 0; i < positions.count; i++) {
      if (Math.abs(colors.getX(i) - hair.r) + Math.abs(colors.getY(i) - hair.g) + Math.abs(colors.getZ(i) - hair.b) > .002) continue;
      box.expandByPoint(point.fromBufferAttribute(positions, i).applyMatrix4(transform));
    }
  });
  assert.equal(box.isEmpty(), false);
  assert.ok(box.min.z > -.23, `crop has no protruding nape: ${box.min.z}`);
  assert.ok(box.max.y < .46, 'hair does not grow into headwear');
});

test('dwarves preserve the game actor interface and a bounded articulated walking rig', () => {
  for (const role of ['guard', 'artisan', 'resident']) {
    const dwarf = createDwarf({ role, variant: 1 });
    for (const method of ['animate', 'setArmed', 'setShield', 'setWeapon']) assert.equal(typeof dwarf[method], 'function');
    for (const part of ['Head', 'Chest', 'Left Hip', 'Right Hip', 'Left Knee', 'Right Knee', 'Left Wrist', 'Right Wrist'])
      assert.ok(dwarf.group.getObjectByName(part), `${role} retains ${part}`);
    let draws = 0, triangles = 0;
    dwarf.group.traverse(mesh => {
      if (!mesh.isMesh) return;
      draws++; triangles += (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3;
      assert.ok(mesh.geometry.attributes.position.array.every(Number.isFinite));
    });
    assert.ok(draws < 42 && triangles < 12000, `${role}: ${draws} draws, ${triangles} triangles`);
    const hip = dwarf.group.getObjectByName('Left Hip'), poses = [];
    for (let frame = 0; frame < 30; frame++) {
      dwarf.animate(frame / 15, frame < 5 ? 0 : 3.4, true, { armed: role === 'guard' });
      dwarf.group.updateWorldMatrix(true, true); poses.push(hip.rotation.x);
      dwarf.group.traverse(object => assert.ok(object.matrixWorld.elements.every(Number.isFinite)));
    }
    assert.ok(Math.max(...poses) - Math.min(...poses) > .1, `${role} walks using articulated legs`);
    assert.ok(bounds(dwarf).y < 1.65, 'walking does not restore human height');
  }
});
