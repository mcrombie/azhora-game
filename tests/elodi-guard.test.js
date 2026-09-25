import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';

const { createCharacter } = await sourceModule('../src/characters.js');

function inspect(actor) {
  let draws = 0, triangles = 0, red = 0, black = 0;
  actor.group.updateMatrixWorld(true);
  actor.group.traverse(object => {
    if (!object.isMesh) return;
    draws++; triangles += (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3;
    // Rigid parts are merged into vertex-coloured batches; loose parts keep their material colour.
    const colours = object.geometry.attributes.color, sample = new THREE.Color();
    const count = colours ? colours.count : 1;
    for (let i = 0; i < count; i += colours ? 3 : 1) {
      if (colours) sample.fromBufferAttribute(colours, i); else sample.copy(object.material.color);
      if (sample.r > .3 && sample.r > sample.g * 2 && sample.r > sample.b * 2) red++;
      if (sample.r + sample.g + sample.b < .06) black++;
    }
  });
  return { draws, triangles, red, black };
}

test('Elod’s frontier guards wear light black armour: lamellar, a hood under an open helm, soft boots, a short spear or a bow and a small round shield', () => {
  const spear = createCharacter({ role: 'elodi-guard' }), bow = createCharacter({ role: 'elodi-guard', look: { kit: 'bow' } }), captain = createCharacter({ role: 'elodi-guard', look: { officer: true } });
  for (const actor of [spear, bow, captain]) {
    assert.equal(actor.group.name, 'character-elodi-guard');
    for (const name of ['Elodi black lamellar', 'Elodi open helm', 'Elodi black hood', 'Elodi round shield'])
      assert.ok(actor.group.getObjectByName(name), `wears ${name}`);
    for (const name of ['Ambroni mail and tabard', 'Ambroni helm', 'Ambroni heater shield', 'Suvali studded jerkin', 'Suvali iron cap'])
      assert.equal(actor.group.getObjectByName(name), undefined, `does not wear ${name}`);
    const { draws, triangles, red, black } = inspect(actor);
    assert.equal(red, 0, 'nothing of Ambron’s red');
    assert.ok(black >= 3, 'black is the colour of Elod’s guard');
    assert.ok(draws <= 30 && triangles < 7500, `${draws} draws, ${triangles} triangles`);
    // Ordinary guards can now draw a sword when a fight starts, then resume their watch.
    const pole = actor.group.getObjectByName('Elodi short spear');
    if (pole) assert.equal(pole.visible, true);
    assert.equal(actor.setWeapon('simple-sword'), true);
    if (pole) assert.equal(pole.visible, false);
    assert.equal(actor.setWeapon(null), true);
    if (pole) assert.equal(pole.visible, true);
  }
  assert.ok(spear.group.getObjectByName('Elodi short spear'));
  assert.ok(bow.group.getObjectByName('Hunting bow') && !bow.group.getObjectByName('Elodi short spear'));
  assert.ok(captain.group.getObjectByName('Elodi captain cloak') && !captain.group.getObjectByName('Elodi short spear'));
});

test('an Elodi guard is leaner and a little taller than a soldier, and his spear is shorter', () => {
  const guard = createCharacter({ role: 'elodi-guard' }), legionary = createCharacter({ role: 'legion-soldier' });
  const hips = actor => actor.group.getObjectByName('Weight and hips');
  assert.ok(hips(guard).scale.x < hips(legionary).scale.x && hips(guard).scale.y > hips(legionary).scale.y);
  for (const time of [0, 2.5, 5]) { guard.animate(time, 0, true, {}); legionary.animate(time, 0, true, {}); }
  const height = (actor, name) => { actor.group.updateMatrixWorld(true); return new THREE.Box3().setFromObject(actor.group.getObjectByName(name)).max.y; };
  assert.ok(height(guard, 'Elodi short spear') < height(legionary, 'Ambroni spear'));
});
