import test from 'node:test';
import assert from 'node:assert/strict';
import { PORT_CALOS_NPCS, PORT_CALOS_NPC_IDS, portCalosConversation } from '../src/port-calos-people.js';
import { PORT_CALOS_NPC_POSITIONS } from '../src/port-calos-world.js';

test('Port Calos has only its requested civilian Maddie, with her harbor stand and appearance', () => {
  assert.equal(new Set(PORT_CALOS_NPC_IDS).size, PORT_CALOS_NPCS.length);
  assert.deepEqual(PORT_CALOS_NPCS.map(npc=>npc.name),['Maddie'],'do not invent a cast of residents');
  assert.deepEqual(Object.keys(PORT_CALOS_NPC_POSITIONS),PORT_CALOS_NPC_IDS);
  assert.equal(PORT_CALOS_NPCS[0].look.hat,false);
  assert.equal(PORT_CALOS_NPCS[0].look.hairStyle,'long');
  assert.equal(PORT_CALOS_NPCS[0].look.straightHair,true);
  for (const npc of PORT_CALOS_NPCS) {
    const stand = PORT_CALOS_NPC_POSITIONS[npc.id];
    assert.ok(Number.isFinite(stand?.x) && Number.isFinite(stand?.z), npc.id);
    assert.equal(npc.yaw, stand.yaw);
    assert.ok(npc.name && npc.role && npc.modelRole);
  }
});

test('every resident can give directions and leave without quest or reward services', () => {
  for (const npc of PORT_CALOS_NPCS) {
    let opened, closed = 0;
    const context = {
      openDialogue: (person, lines, event, action, options) => { opened = { person, lines, event, action, options }; },
      closeDialogue: () => { closed++; },
    };
    assert.equal(portCalosConversation(npc, context), true);
    assert.equal(opened.person, npc);
    assert.equal(opened.event, null);
    const original = opened.lines[0];
    opened.lines[0] = 'Changed only by the host';
    opened.options.choices.find(choice => choice.id === 'port-directions').action();
    assert.match(opened.lines.join(' '), /Nothom/);
    assert.match(opened.lines.join(' '), /Jess.*Tidewater Haven/);
    assert.match(opened.lines.join(' '), /Hallie.*Peblos/);
    assert.equal(opened.event, null);
    portCalosConversation(npc, context);
    assert.equal(opened.lines[0], original, 'a previous rendered page cannot mutate future conversations');
    opened.options.choices.find(choice => choice.id === 'leave-port-neighbor').action();
    assert.equal(closed, 1);
  }
  assert.equal(portCalosConversation({ id: 'boatman' }, {}), false, 'Jess retains her own ferry menu');
  assert.equal(portCalosConversation(null, {}), false);
});
