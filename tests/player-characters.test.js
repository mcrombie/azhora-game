import test from 'node:test';
import assert from 'node:assert/strict';
import { PLAYABLE, PLAYABLE_IDS, DEFAULT_PLAYER, companyFor, playableCharacter, isPlayableId,
  playerLook, rosterEntryFor, startingSkills, startingInventory, savedPlayerCharacter, validatePlayerCharacter } from '../src/player-characters.js';
import { MERCENARY_ROSTER, MERCENARY_COMPANY_SIZE, CROM } from '../src/mercenaries.js';
import { SKILL_IDS, SKILLS, createSkills, skillLevel } from '../src/skills.js';
import { INVENTORY_ITEMS, createInventoryState } from '../src/inventory.js';
import { WEAPON_TYPES, createWeapons } from '../src/weapons.js';
import { createJourney } from '../src/journey.js';
import { createRoadCheckpoint } from '../src/road-checkpoint.js';
import { METRES_PER_HEX } from '../src/world-scale.js';
import { sourceModule } from './module-loader.js';

const { createCharacter } = await sourceModule('../src/characters.js');
/** How main.js builds the player: the chosen one's look on the traveler's role. */
const buildPlayer = id => { const look = playerLook(id); return createCharacter(look ? { role: 'traveler', tunic: look.tunic, skin: look.skin, look } : {}); };

/** The order the user gave, which the opening screen walks in and nothing may quietly reorder. */
const ORDER = ['crom', 'gotwood', 'word', 'jerry', 'christin', 'ciaran', 'lakota', 'eliana', 'matt', 'altun', 'mus'];

test('eleven people can be played, in the order they were asked for, with Crom first', () => {
  assert.equal(PLAYABLE.length, 11);
  assert.deepEqual(PLAYABLE_IDS, ORDER);
  assert.equal(PLAYABLE[0].id, 'crom');
  assert.equal(DEFAULT_PLAYER, 'crom');
  assert.equal(PLAYABLE[0].roster, null, 'Crom is nobody on the roster: he is the traveler');
  // One company, however it is cast: the ten on the road plus you is always eleven.
  assert.equal(MERCENARY_ROSTER.length + 1, MERCENARY_COMPANY_SIZE);
  for (const entry of PLAYABLE) {
    assert.ok(entry.name && entry.title && entry.blurb, `${entry.id} needs a name, a title and a line`);
    assert.ok(Object.isFrozen(entry) && Object.isFrozen(entry.skills), `${entry.id} is data, not a scratchpad`);
  }
  assert.equal(new Set(PLAYABLE_IDS).size, 11, 'no two of them are the same person');
});

test('the company the world places is always the ten you are not', () => {
  for (const id of PLAYABLE_IDS) {
    const company = companyFor(id);
    assert.equal(company.length, 10, `${id} leaves ten on the road`);
    assert.equal(new Set(company.map(entry => entry.id)).size, 10, `${id}: nobody is placed twice`);
    const mine = playableCharacter(id).roster;
    assert.ok(!company.some(entry => entry.id === mine), `${id} is not also standing on his own road`);
    // Crom takes the vacated slot, in place, so the arrivals keep their shape.
    const crom = company.filter(entry => entry.id === CROM.id);
    assert.equal(crom.length, id === 'crom' ? 0 : 1, `${id}: Crom stands in exactly the slot that opened`);
    if (id !== 'crom') {
      assert.equal(company.findIndex(entry => entry.id === CROM.id),
        MERCENARY_ROSTER.findIndex(entry => entry.id === mine), `${id}: Crom keeps the place in the line`);
      assert.deepEqual(crom[0].look, CROM.look, 'Crom brings his own look');
      assert.deepEqual(crom[0].lines, CROM.lines, 'Crom brings his own lines');
      assert.equal(crom[0].arrival, CROM.arrival, 'Crom lands when Crom lands');
    }
    for (const entry of company) assert.ok(Object.isFrozen(entry), `${id}: the placed company is frozen`);
  }
  assert.equal(companyFor('crom'), MERCENARY_ROSTER, 'playing as Crom leaves the roster untouched');
  assert.throws(() => companyFor('nobody'), TypeError);
  assert.equal(companyFor().length, 10, 'no argument is the default game');
});

test('the letter of introduction stays with the boat, not with the man', () => {
  const carrier = MERCENARY_ROSTER.find(entry => entry.carriesLetter);
  assert.ok(carrier, 'somebody hands you the letter on the landing');
  const asChris = companyFor('gotwood');
  assert.equal(asChris[0].id, CROM.id, 'Crom sails in Chris’s place');
  assert.equal(asChris[0].carriesLetter, true, 'and steps ashore with the papers');
  assert.equal(companyFor('lakota').find(entry => entry.id === CROM.id).carriesLetter, undefined,
    'Crom in anybody else’s slot carries nothing');
});

test('every playable character wears a hired sword off the roster, and Crom wears the traveler', () => {
  const fields = ['tunic', 'hair', 'skin', 'build', 'headgear', 'hairStyle', 'facialHair', 'garment', 'marks'];
  for (const entry of PLAYABLE) {
    if (entry.id === 'crom') {
      assert.equal(rosterEntryFor('crom'), null);
      assert.equal(playerLook('crom'), null, 'the default game is built exactly as it always was');
      continue;
    }
    const merc = MERCENARY_ROSTER.find(m => m.id === entry.roster);
    assert.ok(merc, `${entry.id} names a hired sword who exists`);
    const look = playerLook(entry.id);
    for (const field of fields) assert.deepEqual(look[field], merc.look[field], `${entry.id} inherits ${field}`);
    assert.equal(look.weapon, merc.weapon, `${entry.id} inherits the weapon of his style`);
    assert.equal(typeof look.trades, 'boolean');
    assert.equal(entry.name, merc.name, `${entry.id} is called what the roster calls him`);
  }
  // Crom's own entry is a hired sword like any other, ready to be placed in somebody's slot.
  for (const field of fields) assert.ok(CROM.look[field] !== undefined, `Crom needs a ${field}`);
});

test('what everyone starts with is real experience in real skills', () => {
  // Three skills belong to other hands and may not be registered in this build yet
  // (swimming, linguist, cartography). Their absence is reported, never asserted away.
  const missing = new Set();
  let started = 0;
  for (const entry of PLAYABLE) {
    for (const [id, xp] of Object.entries(entry.skills)) {
      assert.ok(Number.isInteger(xp) && xp > 0, `${entry.id} starts ${id} with whole experience`);
      if (!SKILL_IDS.includes(id)) { missing.add(id); continue; }
      started++;
      const read = skillLevel(id, xp);
      assert.ok(read.level >= 2, `${entry.id} should begin ${id} above the first level, not at it`);
      assert.ok(read.level <= read.top);
    }
  }
  if (missing.size) console.log(`not yet registered in src/skills.js, so not started: ${[...missing].sort().join(', ')}`);
  assert.deepEqual(startingSkills('crom'), {}, 'Crom starts with the sword and nothing else');
  assert.ok(started > 0, 'somebody begins the road already knowing something');
  // Lakota's birding is written as experience so that it survives the table growing under it.
  assert.ok(PLAYABLE.find(e => e.id === 'lakota').skills.birding >= SKILLS.birding.thresholds.at(-1),
    'Lakota begins at the top of the birding table this build has');
});

test('a character can actually be handed his starting experience', () => {
  for (const entry of PLAYABLE) {
    const skills = createSkills();
    for (const [id, xp] of Object.entries(startingSkills(entry.id))) { skills.learn(id); skills.gain(id, xp); }
    for (const [id, xp] of Object.entries(entry.skills)) {
      if (!SKILL_IDS.includes(id)) { assert.equal(skills.known(id), false, `${id} cannot be learned before it exists`); continue; }
      assert.equal(skills.known(id), true, `${entry.id} knows ${id}`);
      assert.equal(skills.level(id), skillLevel(id, xp).level);
    }
    assert.ok(skills.snapshot().version >= 1);
  }
});

test('everyone steps ashore carrying something they can fight with', () => {
  for (const entry of PLAYABLE) {
    const carried = startingInventory(entry.id);
    assert.ok(carried.length, `${entry.id} carries something`);
    for (const item of carried) {
      assert.ok(Object.hasOwn(INVENTORY_ITEMS, item.id), `${entry.id} carries a real ${item.id}`);
      assert.ok(Number.isInteger(item.quantity) && item.quantity > 0);
    }
    assert.ok(carried.some(item => Object.hasOwn(WEAPON_TYPES, item.id)), `${entry.id} carries a weapon`);
    assert.ok(carried.some(item => item.id === entry.weapon), `${entry.id} carries the weapon he equips`);
    assert.ok(Object.hasOwn(WEAPON_TYPES, entry.weapon), `${entry.id} equips a weapon the game models`);
    carried[0].quantity = 99;
    assert.notEqual(startingInventory(entry.id)[0].quantity, 99, 'the table is not handed out by reference');
  }
});

test('an id is checked before it is believed, and an old save is Crom', () => {
  for (const id of PLAYABLE_IDS) { assert.equal(isPlayableId(id), true); assert.equal(playableCharacter(id).id, id); }
  for (const bad of ['barbarian', 'merc-crom', 'CROM', '', null, 7, {}, undefined]) {
    if (bad !== undefined) assert.equal(isPlayableId(bad), false, `${String(bad)} is nobody`);
    assert.equal(savedPlayerCharacter(bad), DEFAULT_PLAYER, `${String(bad)} falls back to Crom`);
  }
  assert.equal(validatePlayerCharacter(undefined), true, 'a save from before the choice existed is allowed');
  assert.equal(validatePlayerCharacter(undefined, { allowMissing: false }), false);
  assert.equal(validatePlayerCharacter('mus'), true);
  assert.equal(validatePlayerCharacter('mara'), false);
  assert.equal(savedPlayerCharacter('lakota'), 'lakota');
});

/** A checkpoint good enough to save, so the character on it can be tested against the real rules. */
function fixture() {
  const inventory = createInventoryState();
  for (const id of ['simple-sword', 'harbor-letter', 'road-token']) inventory.grant(id);
  const weapons = createWeapons({ wear: true, inventory });
  const journey = createJourney({ inventory, weapons });
  journey.start();
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  const data = {
    version: 1, worldScale: METRES_PER_HEX, questStage: 10, journey: journey.snapshot(),
    inventory: inventory.items().map(id => ({ id, quantity: inventory.count(id) })),
    weapons: weapons.snapshot(), journeyGathered: [], meadowCleared: false,
    position: { x: 3, z: -190 }, heardDoom: true,
  };
  return { data, checkpoint: createRoadCheckpoint({ storage }) };
}

test('the character you chose is saved, comes back, and cannot be forged', () => {
  for (const id of PLAYABLE_IDS) {
    const { data, checkpoint } = fixture();
    assert.equal(checkpoint.save({ ...data, player: id }).ok, true, `${id} can be saved`);
    const read = checkpoint.read();
    assert.equal(read.ok, true);
    assert.equal(read.data.player, id, `${id} continues the adventure as himself`);
    assert.equal(savedPlayerCharacter(read.data.player), id);
  }
  const { data, checkpoint } = fixture();
  for (const bad of ['barbarian', 'merc-word', 42, null, { id: 'crom' }]) {
    const refused = checkpoint.save({ ...data, player: bad });
    assert.equal(refused.ok, false, `${String(bad)} is refused`);
    assert.match(refused.reason, /character/i);
  }
  // A save written before anyone could choose keeps no field, and is played as Crom.
  assert.equal(checkpoint.save(data).ok, true);
  const old = checkpoint.read().data;
  assert.equal(Object.hasOwn(old, 'player'), false, 'nothing is invented for an old save');
  assert.equal(savedPlayerCharacter(old.player), 'crom');
});

test('whoever you are, the model is the traveler’s: the rig, the swap and the rod', () => {
  const joints = ['Weight and hips', 'Chest', 'Head', 'Left Shoulder', 'Right Shoulder', 'Left Elbow', 'Right Elbow',
    'Left Wrist', 'Right Wrist', 'Left Hip', 'Right Hip', 'Left Knee', 'Right Knee', 'Left Ankle', 'Right Ankle'];
  for (const id of PLAYABLE_IDS) {
    const actor = buildPlayer(id);
    assert.equal(actor.group.name, 'character-traveler', `${id} is the traveler, whatever he is wearing`);
    for (const name of joints) assert.ok(actor.group.getObjectByName(name)?.isGroup, `${id} keeps the ${name}`);
    // The weapon swap and the fishing rod are the traveler's alone and follow the player.
    assert.ok(actor.group.getObjectByName('Traveler weapon grip'), `${id} has a hand for a weapon`);
    assert.ok(actor.group.getObjectByName('Simple hazel fishing rod'), `${id} can still take up a rod`);
    for (const weapon of Object.keys(WEAPON_TYPES)) assert.equal(actor.setWeapon(weapon), true, `${id} can draw the ${weapon}`);
    assert.equal(actor.setWeapon(playableCharacter(id).weapon), true, `${id} can draw what he came with`);
    let draws = 0;
    actor.group.traverse(object => {
      if (!object.isMesh) return;
      draws++;
      for (const key of ['position', 'normal']) assert.ok(object.geometry.attributes[key].array.every(Number.isFinite), `${id} has invalid ${key} geometry`);
    });
    assert.ok(draws <= 34, `${id} draws ${draws} batches`);
  }
});
