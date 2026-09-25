import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './module-loader.js';
const { createCharacter } = await sourceModule('../src/characters.js');

test('ordinary teachers gain one visible, animated rod only when asked to demonstrate', () => {
  for (const role of ['legion-officer', 'doomsayer', 'garden-keeper', 'avrel-farmer']) {
    const actor = createCharacter({ role });
    assert.equal(actor.group.getObjectByName('Fishing rod grip'), undefined, role + ' starts at its original geometry budget');
    assert.equal(actor.fishingTip(), null);
    actor.animate(1, 0, true, { fishing: true });
    const rod = actor.group.getObjectByName('Simple hazel fishing rod'); assert.ok(rod);
    const tip = actor.fishingTip(); assert.ok([tip.x, tip.y, tip.z].every(Number.isFinite));
    for (let part = rod; part; part = part.parent) assert.equal(part.visible, true);
    for (let i = 0; i < 60; i++) actor.animate(i / 60, 0, true, { fishing: true });
    let count = 0; actor.group.traverse(part => { if (part.name === 'Simple hazel fishing rod') count++; });
    assert.equal(count, 1, role + ' never accumulates repeated rods');
    actor.animate(2, 1, true, { fishing: false }); assert.equal(actor.fishingTip(), null);
    assert.equal(actor.group.getObjectByName('Fishing rod grip').visible, false);
  }
});
