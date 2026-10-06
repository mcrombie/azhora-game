import test from 'node:test';
import assert from 'node:assert/strict';
import { PORT_CALOS_NPCS, PORT_CALOS_NPC_IDS, PORT_CALOS_PLACEHOLDER, portCalosConversation } from '../src/content/regions/port-calos/port-calos-people.js';
import { PORT_CALOS_NPC_POSITIONS, inPortCalos } from '../src/content/regions/port-calos/port-calos-world.js';
import { PEBLOS_NPCS } from '../src/content/regions/peblos/peblos-people.js';
import { COBBLE_STANDS } from '../src/content/regions/peblos/peblos-world.js';
import { FERRY_HOSTS } from '../src/world/travel/ferry.js';
import { KATY, KATY_STAND } from '../src/content/quests/roadside/katy.js';
import { sourceModule } from './module-loader.js';

const requested = ['Kendall', 'Jay', 'Robert', 'Vic', 'Madi', 'Madison', 'Sierra', 'Franz', 'Marissa', 'Sean',
  'Flor', 'Melissa', 'Richard', 'Laurie', 'Zach', 'Courtney', 'Kathy', 'Karen', 'Kirk', 'Zkayla', 'Pswtr',
  'Christina', 'Imani', 'Hallie'];

test('Port Calos contains precisely the requested named residents and the moved people retain their looks', () => {
  assert.equal(new Set(PORT_CALOS_NPC_IDS).size, PORT_CALOS_NPCS.length);
  assert.deepEqual(PORT_CALOS_NPCS.map(npc => npc.name).sort(), [...requested].sort());
  assert.deepEqual(Object.keys(PORT_CALOS_NPC_POSITIONS).sort(), [...PORT_CALOS_NPC_IDS].sort());
  const person = name => PORT_CALOS_NPCS.find(npc => npc.name === name);
  assert.equal(person('Christina').look.discoHead, true);
  assert.equal(person('Ari'), undefined, 'Ari has moved to Applegarth');
  assert.equal(person('Imani').modelRole, 'vine-keeper');
  assert.equal(KATY.name, 'Catie');
  assert.equal(KATY.id, 'katy', 'rename does not break an existing save identity');
  for (const npc of PORT_CALOS_NPCS) {
    const stand = PORT_CALOS_NPC_POSITIONS[npc.id];
    assert.ok(Number.isFinite(stand?.x) && Number.isFinite(stand?.z), npc.id);
    assert.equal(npc.yaw, stand.yaw);
    assert.equal(inPortCalos(stand.x, stand.z), true, `${npc.name} stays in the small town or harbor`);
    assert.equal(npc.look.hat, false, `${npc.name} has no unrequested hat`);
  }
  for (const id of ['cobble-jessi', 'cobble-ari', 'cobble-imani']) {
    assert.equal(PEBLOS_NPCS.some(npc => npc.id === id), false, 'the moved person has no Cobble duplicate');
    assert.equal(COBBLE_STANDS[id], undefined, 'old stand cannot override the new port stand');
  }
});

test('every provisional resident says only the agreed placeholder and offers no invented topics', () => {
  for (const npc of PORT_CALOS_NPCS.filter(npc => npc.id !== 'port-calos-harbourmaster')) {
    let opened;
    const context = { openDialogue: (person, lines, event, action, options) => { opened = { person, lines, event, action, options }; }, closeDialogue: () => {} };
    assert.equal(portCalosConversation(npc, context), true);
    assert.equal(opened.person, npc);
    assert.deepEqual(opened.lines, [PORT_CALOS_PLACEHOLDER]);
    assert.equal(opened.lines[0], 'This person could use more characterization.');
    assert.equal(opened.event, null);
    assert.equal(opened.options, undefined);
  }
  assert.equal(portCalosConversation(KATY, {}), false, 'Catie retains her requested quest');
  assert.equal(portCalosConversation(null, {}), false);
});

test('Hallie is at Port Calos, Maddie at Cobble, and all three ferry hosts retain their hair with nautical clothing', async () => {
  assert.deepEqual(Object.values(FERRY_HOSTS).map(npc => npc.name), ['Jess', 'Maddie', 'Hallie']);
  assert.equal(FERRY_HOSTS.peblos.look.hair, 0x61412d);
  assert.equal(FERRY_HOSTS['port-calos'].look.hair, 0xdcc16e);
  const { createCharacter } = await sourceModule('../src/content/characters/characters.js');
  for (const npc of Object.values(FERRY_HOSTS)) {
    assert.equal(npc.look.hat, false);
    assert.equal(npc.look.nautical, true);
    const actor = createCharacter({ role: npc.modelRole, tunic: npc.color, look: npc.look, skin: npc.skin });
    assert.ok(actor.group.getObjectByName('Ferry sailor clothing'), `${npc.name} has a sea jersey`);
    assert.ok(actor.group.getObjectByName('Sailor rope belt'), `${npc.name} wears a rope belt`);
    assert.ok(actor.group.getObjectByName('Waterproof sea boot'), `${npc.name} has deck boots`);
  }
});

test('Port Calos keeps personal space and leaves the ferry arrival and Catie approachable', () => {
  const positions = [...Object.entries(PORT_CALOS_NPC_POSITIONS), ['katy', KATY_STAND]];
  for (let a = 0; a < positions.length; a++) for (let b = a + 1; b < positions.length; b++) {
    const [id, p] = positions[a], [other, q] = positions[b];
    assert.ok(Math.hypot(p.x - q.x, p.z - q.z) >= 3.5, `${id} crowds ${other}`);
  }
});


test('residents without user-authored appearances are identical featureless gray mannequins at every distance', async () => {
  const { createCharacter } = await sourceModule('../src/content/characters/characters.js');
  const { BLANK_SLATE_COLOUR, standInLook } = await sourceModule('../src/world/actors/figure-lod.js');
  const { createStandIn } = await sourceModule('../src/world/actors/figure-stand-in.js');
  const THREE = await sourceModule('../vendor/three.module.js');
  const gray = new THREE.Color(BLANK_SLATE_COLOUR);
  const placeholders = PORT_CALOS_NPCS.filter(npc => npc.look.blankSlate);
  assert.equal(placeholders.length, 21);
  assert.deepEqual(placeholders.map(npc => npc.name), requested.slice(0, 21));
  const checkGray = actor => actor.traverse(object => {
    if (!object.isMesh) return;
    const colors = object.geometry.attributes.color;
    if (colors) for (let i = 0; i < colors.count; i++) {
      assert.ok(Math.abs(colors.getX(i) - gray.r) < .000001);
      assert.ok(Math.abs(colors.getY(i) - gray.g) < .000001);
      assert.ok(Math.abs(colors.getZ(i) - gray.b) < .000001);
    } else assert.equal(object.material.color.getHex(), BLANK_SLATE_COLOUR);
  });
  for (const npc of placeholders) {
    assert.deepEqual(npc.look, { blankSlate: true, hat: false });
    assert.equal(npc.color, undefined, `${npc.name} has no invented clothing palette`);
    assert.equal(npc.skin, undefined, `${npc.name} has no invented skin tone`);
    // Even accidental defaults or role properties cannot add an authored appearance.
    const actor = createCharacter({ role: 'sorcerer', tunic: 0xff0000, skin: 0xd7ad7e, hat: true,
      look: npc.look, wields: 'simple-sword' });
    assert.equal(actor.group.userData.blankSlate, true);
    const head = actor.group.getObjectByName('Head');
    assert.equal(head.children.length, 1, `${npc.name} has a single blank head without eyes, hair, ears or nose`);
    assert.equal(head.children[0].geometry.type, 'SphereGeometry');
    checkGray(actor.group);
    actor.setShield(true);
    actor.setArmed(true);
    assert.equal(actor.setWeapon('simple-sword'), false);
    assert.equal(actor.setFishing(true), false);
    assert.equal(actor.focusTip(), null);
    checkGray(actor.group);
    assert.equal(actor.group.getObjectByName('Traveler buckler'), undefined);
    const distant = standInLook({ blankSlate: true, tunic: 0xff0000, skin: 0xd7ad7e, hair: 0x442211 });
    assert.ok(distant.pieces.every(piece => piece.colour === BLANK_SLATE_COLOUR));
    checkGray(createStandIn({ blankSlate: true }));
  }
});

test('blank residents retain ordinary walking and a grounded fallen pose', async () => {
  const { createCharacter } = await sourceModule('../src/content/characters/characters.js');
  const THREE = await sourceModule('../vendor/three.module.js');
  const actor = createCharacter({ look: { blankSlate: true } });
  const hip = actor.group.getObjectByName('Left Hip');
  const rotations = [];
  for (let frame = 0; frame < 60; frame++) {
    actor.animate(frame / 60, 3, true);
    rotations.push(hip.rotation.x);
  }
  assert.ok(Math.max(...rotations) - Math.min(...rotations) > .7, 'the legs actually take walking strides');
  const standing = new THREE.Box3().setFromObject(actor.group);
  assert.ok(standing.max.y - standing.min.y > 1.6);
  for (let frame = 60; frame < 150; frame++)
    actor.animate(frame / 60, 0, true, { action: 'dead', progress: Math.min(1, (frame - 60) / 45) });
  const fallen = new THREE.Box3().setFromObject(actor.group);
  assert.ok(Math.abs(fallen.min.y) < .001, 'the fallen model rests on the ground');
  assert.ok(fallen.max.y < (standing.max.y - standing.min.y) * .65, 'the full standing model falls over');
  actor.group.traverse(object => assert.ok(object.matrixWorld.elements.every(Number.isFinite)));
});
