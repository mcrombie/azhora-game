import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './module-loader.js';
import { REGIONAL_LIFE_NPCS, regionalLifeConversation } from '../src/world/life/regional-life.js';
import { keepsNpc } from '../src/content/characters/cast.js';

const smedley = REGIONAL_LIFE_NPCS.find(npc => npc.id === 'smedley');
const { createCharacter } = await sourceModule('../src/content/characters/characters.js');

test('Smedley wears his requested peruke and purple robe, with visible breath and no flame', () => {
  assert.ok(smedley);
  assert.equal(keepsNpc(smedley), true, 'the requested character survives the default cast filter');
  const actor = createCharacter({ role: smedley.modelRole, tunic: smedley.color, skin: smedley.skin, look: smedley.look, hat: false });
  assert.ok(actor.group.getObjectByName('mercenary-headgear-peruke'));
  assert.ok(actor.group.getObjectByName('mercenary-garment-robe'));
  assert.ok(actor.group.getObjectByName('Smedley’s breath'));
  for (let frame = 0; frame < 90; frame++) actor.animate(frame / 30, 1, true, {});
  actor.group.updateMatrixWorld(true);
  actor.group.traverse(object => {
    assert.ok(object.matrixWorld.elements.every(Number.isFinite), object.name);
    assert.ok(!/flame|fire breath/i.test(object.name), 'bad breath is not a fire attack');
  });
});

test('speaking to Smedley cannot accidentally start Oda’s shelter conversation', () => {
  let shown, closed = 0;
  assert.equal(regionalLifeConversation(smedley, {
    openDialogue: (npc, lines, event, next, options) => { shown = { npc, lines, ...options }; },
    closeDialogue: () => closed++,
  }), true);
  assert.equal(shown.npc.id, 'smedley');
  assert.match(shown.lines.join(' '), /bad breath/);
  assert.doesNotMatch(shown.lines.join(' '), /Oda|shelter|Iven/);
  assert.deepEqual(shown.choices.map(choice => choice.id), ['leave-smedley']);
  shown.choices[0].action();
  assert.equal(closed, 1);
});
