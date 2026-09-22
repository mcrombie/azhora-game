import test from 'node:test';
import assert from 'node:assert/strict';
import { PLAYABLE, PLAYABLE_IDS, SELECTABLE, SELECTABLE_IDS, DEFAULT_PLAYER, PLAYER_ALIASES, canonicalPlayerId, companyFor, playableCharacter, isPlayableId,
  playerLook, rosterEntryFor, startingSkills, startingInventory, startingLanguages, savedPlayerCharacter, validatePlayerCharacter } from '../src/player-characters.js';
import { MERCENARY_ROSTER, MERCENARY_COMPANY_SIZE, CROMB, CROMB_OLD_ID, landingMateNote, mateIsEscorting,
  LETTER_STAGE, ESCORT_MODES, LANDING_ESCORT, mercenaryById, mercenaryLines,
  mercenaryStyleLines, mercenaryWeapon, tradeOffer, KIT_WEAPON_ITEM } from '../src/mercenaries.js';
import { SKILL_IDS, createSkills, skillLevel } from '../src/skills.js';
import { createLinguist, MAX_PROFICIENCY } from '../src/linguist.js';
import { INTERPRETER, interpreterFor, LANGUAGES, ORIGIN_LANGUAGE, speaksTheContract, speechFor } from '../src/languages.js';
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
const ORDER = ['cromb', 'gotwood', 'word', 'jerry', 'christin', 'ciaran', 'lakota', 'eliana', 'matt', 'altun', 'mus'];

test('eleven people can be played, in the order they were asked for, with Cromb first', () => {
  assert.equal(PLAYABLE.length, 11);
  assert.deepEqual(PLAYABLE_IDS, ORDER);
  assert.equal(PLAYABLE[0].id, 'cromb');
  assert.equal(DEFAULT_PLAYER, 'cromb');
  assert.equal(PLAYABLE[0].roster, null, 'Cromb is nobody on the roster: he is the traveler');
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
    // Cromb takes the vacated slot, in place, so the arrivals keep their shape.
    const cromb = company.filter(entry => entry.id === CROMB.id);
    assert.equal(cromb.length, id === 'cromb' ? 0 : 1, `${id}: Cromb stands in exactly the slot that opened`);
    if (id !== 'cromb') {
      assert.equal(company.findIndex(entry => entry.id === CROMB.id),
        MERCENARY_ROSTER.findIndex(entry => entry.id === mine), `${id}: Cromb keeps the place in the line`);
      assert.deepEqual(cromb[0].look, CROMB.look, 'Cromb brings his own look');
      assert.deepEqual(cromb[0].lines, CROMB.lines, 'Cromb brings his own lines');
      assert.equal(cromb[0].arrival, CROMB.arrival, 'Cromb lands when Cromb lands');
    }
    for (const entry of company) assert.ok(Object.isFrozen(entry), `${id}: the placed company is frozen`);
  }
  assert.equal(companyFor('cromb'), MERCENARY_ROSTER, 'playing as Cromb leaves the roster untouched');
  assert.throws(() => companyFor('nobody'), TypeError);
  assert.equal(companyFor().length, 10, 'no argument is the default game');
});

test('the letter of introduction stays with the boat, not with the man', () => {
  const carrier = MERCENARY_ROSTER.find(entry => entry.carriesLetter);
  assert.ok(carrier, 'somebody hands you the letter on the landing');
  const asChris = companyFor('gotwood');
  assert.equal(asChris[0].id, CROMB.id, 'Cromb sails in Chris’s place');
  assert.equal(asChris[0].carriesLetter, true, 'and steps ashore with the papers');
  assert.equal(companyFor('lakota').find(entry => entry.id === CROMB.id).carriesLetter, undefined,
    'Cromb in anybody else’s slot carries nothing');
});

test('every playable character wears a hired sword off the roster, and Cromb wears the traveler', () => {
  const fields = ['tunic', 'hair', 'skin', 'build', 'headgear', 'hairStyle', 'facialHair', 'garment', 'marks'];
  for (const entry of PLAYABLE) {
    if (entry.id === 'cromb') {
      assert.equal(rosterEntryFor('cromb'), null);
      assert.equal(playerLook('cromb'), null, 'the default game is built exactly as it always was');
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
  // Cromb's own entry is a hired sword like any other, ready to be placed in somebody's slot.
  for (const field of fields) assert.ok(CROMB.look[field] !== undefined, `Cromb needs a ${field}`);
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
  assert.deepEqual(startingSkills('cromb'), {}, 'Cromb starts with the sword and nothing else');
  assert.ok(started > 0, 'somebody begins the road already knowing something');
  // Lakota's birding was written as experience so that it would survive the table growing
  // under it. It has: every skill is on the ninety-nine table now, so the number that used
  // to read as the top of a ten-level table reads as the 40 it was always meant to be.
  assert.equal(skillLevel('birding', PLAYABLE.find(e => e.id === 'lakota').skills.birding).level, 40,
    'Lakota begins the road at birding 40');
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

test('an id is checked before it is believed, and an old save is Cromb', () => {
  for (const id of PLAYABLE_IDS) { assert.equal(isPlayableId(id), true); assert.equal(playableCharacter(id).id, id); }
  for (const bad of ['barbarian', 'merc-word', 'CROMB', '', null, 7, {}, undefined]) {
    if (bad !== undefined) assert.equal(isPlayableId(bad), false, `${String(bad)} is nobody`);
    assert.equal(savedPlayerCharacter(bad), DEFAULT_PLAYER, `${String(bad)} falls back to Cromb`);
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
  for (const bad of ['barbarian', 'merc-word', 42, null, { id: 'cromb' }]) {
    const refused = checkpoint.save({ ...data, player: bad });
    assert.equal(refused.ok, false, `${String(bad)} is refused`);
    assert.match(refused.reason, /character/i);
  }
  // A save written before anyone could choose keeps no field, and is played as Cromb.
  assert.equal(checkpoint.save(data).ok, true);
  const old = checkpoint.read().data;
  assert.equal(Object.hasOwn(old, 'player'), false, 'nothing is invented for an old save');
  assert.equal(savedPlayerCharacter(old.player), 'cromb');
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
    // A draw is a mesh that is actually drawn - everything above it visible too - which is the
    // same rule `figureDrawCalls` and the `draws()` hook use. He now owns nine weapons and can
    // hold one, so counting the eight in his pocket was always an overcount; three polearms
    // arriving is only what made it matter.
    let draws = 0, built = 0;
    const shown = object => { for (let node = object; node; node = node.parent) if (!node.visible) return false; return true; };
    actor.group.traverse(object => {
      if (!object.isMesh) return;
      built++;
      if (shown(object)) draws++;
      for (const key of ['position', 'normal']) assert.ok(object.geometry.attributes[key].array.every(Number.isFinite), `${id} has invalid ${key} geometry`);
    });
    assert.ok(draws <= 34, `${id} draws ${draws} batches`);
    // And the figure may not balloon unwatched, held weapons and all. Measured with the bow in:
    // Cromb is 28 bare, 39 with the nine he can swing, 45 with the bow — **the bow is six of
    // them** (two limbs, the grip, the string, and the shaft and head of the arrow on it), and it
    // is the tenth and last weapon phase 6 adds. Matt is the dearest of the eleven at 49, and the
    // most anybody *draws* is 22, which is the number that costs anything.
    assert.ok(built <= 49, `${id} is built from ${built} meshes`);
  }
});

test('Cromb on the road can be spoken to, fought beside and traded with like any of the ten', () => {
  // He is not on the roster, so every lookup that asks a hired sword what he carries or what he
  // would say has to know about him as well, or he is a mute stranger in somebody else's slot.
  assert.equal(mercenaryById(CROMB.id), CROMB);
  assert.equal(mercenaryById('merc-nobody'), undefined);
  for (const id of [...MERCENARY_ROSTER.map(entry => entry.id), CROMB.id]) {
    assert.equal(mercenaryLines(id, { phase: 'walking' }).length, 2, `${id} has something to say on the road`);
    assert.equal(mercenaryStyleLines(id).length, 2, `${id} can explain how he fights`);
    const weapon = mercenaryWeapon(id);
    assert.ok(weapon?.weapon && weapon.style, `${id} carries something`);
    const held = KIT_WEAPON_ITEM[weapon.weapon] ?? null;
    const offer = tradeOffer(id, held, 'greatsword');
    assert.equal(typeof offer.line, 'string');
    assert.ok(offer.line.length > 0, `${id} answers a trade rather than saying nothing`);
  }
  assert.equal(tradeOffer(CROMB.id, 'simple-sword', 'greatsword').accepts, true, 'Cromb will hold anything with a handle');
  assert.equal(tradeOffer(CROMB.id, 'simple-sword', 'simple-sword').accepts, false, 'but not another of the same');
});

test('a weapon left with Cromb is saved, because he was a real man on that road', () => {
  const { data, checkpoint } = fixture();
  const held = { id: 'iron-mace', durability: 30 };
  assert.equal(checkpoint.save({ ...data, player: 'gotwood', mercenaryWeapons: { [CROMB.id]: held } }).ok, true);
  assert.deepEqual(checkpoint.read().data.mercenaryWeapons, { [CROMB.id]: held });
  assert.equal(checkpoint.save({ ...data, mercenaryWeapons: { 'merc-nobody': held } }).ok, false);
});

test('the b arrived late, so every id written before it still names the same man', () => {
  // He was `crom` and `merc-crom` for one morning. Saves written that morning, and anything else
  // that kept the old spelling, name Cromb the Barbarian and must go on naming him.
  assert.equal(CROMB.id, 'merc-cromb');
  assert.equal(CROMB.name, 'Cromb the Barbarian');
  assert.equal(CROMB_OLD_ID, 'merc-crom');
  for (const old of ['crom', 'merc-crom', 'merc-cromb', 'cromb']) {
    assert.equal(canonicalPlayerId(old), 'cromb', `${old} is Cromb`);
    assert.equal(savedPlayerCharacter(old), 'cromb', `${old} restores as Cromb`);
    assert.equal(isPlayableId(old), true);
    assert.equal(playableCharacter(old).name, 'Cromb the Barbarian');
    assert.equal(validatePlayerCharacter(old), true, `a save naming ${old} still loads`);
    assert.equal(companyFor(old), MERCENARY_ROSTER, `${old} leaves the roster as it is`);
  }
  // The old id is an alias and never the canonical one: nothing new is written with it.
  assert.equal(PLAYABLE_IDS.includes('crom'), false, 'the line of eleven says Cromb');
  assert.ok(Object.values(PLAYER_ALIASES).every(id => PLAYABLE_IDS.includes(id)), 'every alias names somebody real');
  // A save from that morning that traded a weapon with him named him `merc-crom` on the road.
  assert.equal(mercenaryById(CROMB_OLD_ID), CROMB, 'the man on the road answers to his old name too');
  const { data, checkpoint } = fixture();
  assert.equal(checkpoint.save({ ...data, player: 'crom', mercenaryWeapons: { [CROMB_OLD_ID]: { id: 'iron-mace', durability: 30 } } }).ok, true);
  assert.equal(savedPlayerCharacter(checkpoint.read().data.player), 'cromb');
});

test('the tongues a character already has are really his when he lands', () => {
  // `startingLanguages` is proficiency in a named tongue, not a skill: src/main.js hands it to
  // the linguist in grantStartingKit(). Only Chris has any, and his is the Empire's own speech.
  for (const entry of PLAYABLE) {
    const tongues = startingLanguages(entry.id);
    assert.equal(typeof tongues, 'object');
    for (const [id, proficiency] of Object.entries(tongues)) {
      assert.ok(LANGUAGES[id], `${entry.id} begins a tongue somebody speaks: ${id}`);
      assert.ok(Number.isInteger(proficiency) && proficiency > 0 && proficiency <= MAX_PROFICIENCY, `${entry.id}'s ${id} is a proficiency`);
    }
    if (entry.id !== 'gotwood') assert.deepEqual(tongues, {}, `${entry.id} lands with nothing but his own head`);
    tongues.klingon = 99;
    assert.equal(startingLanguages(entry.id).klingon, undefined, 'the table is not handed out by reference');
  }
  assert.deepEqual(startingLanguages('gotwood'), { ambroni: 40, drentish: 40 });
  // What he starts with is what he is said to know. `INTERPRETER.knows` is the claim; this is
  // the table that has to honour it, minus feradom, which is the user's to place.
  for (const tongue of INTERPRETER.knows) {
    if (tongue === 'feradom') continue;
    assert.equal(startingLanguages('gotwood')[tongue], 40,
      `Chris interprets ${tongue} for you, so as Chris he has it himself`);
  }
  // The point of the Drentish: when you are Chris nobody interprets, and the first conversation
  // of the game is in Drent, so without it the opening would be a wall of a tongue with no gloss.
  assert.equal(interpreterFor('gotwood'), null, 'nobody interprets for Chris');
  assert.ok(startingLanguages('gotwood').drentish > 0, 'so Chris follows Jojo himself');

  // What grantStartingKit() does with it, in the same order.
  for (const id of PLAYABLE_IDS) {
    const skills = createSkills();
    const linguist = createLinguist({ skills });
    const before = linguist.level('ambroni');
    for (const [tongue, proficiency] of Object.entries(startingLanguages(id))) linguist.speakAlready(tongue, proficiency);
    if (id === 'gotwood') {
      assert.equal(linguist.level('ambroni'), 40, 'Chris can hold a conversation at a gate from the first step');
      assert.ok(linguist.comprehension('ambroni') > 0, 'and follows some of what is said to him');
      // A tongue had before the road was not learned on it: no experience, no level banner.
      assert.equal(skills.taught('linguist'), false, 'having always spoken it teaches nothing');
      assert.equal(skills.xp('linguist'), 0, 'and banks no experience');
    } else assert.equal(linguist.level('ambroni'), before, `${id} lands with no Ambroni at all`);
  }
  // A floor and never a ceiling, and never a tongue nobody speaks.
  const linguist = createLinguist();
  linguist.speakAlready('ambroni', 40);
  linguist.speakAlready('ambroni', 10);
  assert.equal(linguist.level('ambroni'), 40, 'a smaller start never takes a tongue away');
  assert.equal(linguist.speakAlready('klingon', 40).ok, false);
});

test('when you are Chris nobody interprets, and nobody needs to', () => {
  // The interpreter is an npc in the world. When Chris is the player he is not in the world at
  // all, and the answer is not a missing lookup: it is that the Ambroni is already yours.
  assert.equal(INTERPRETER.npcId, 'merc-gotwood');
  assert.equal(INTERPRETER.playerId, 'gotwood');
  assert.ok(PLAYABLE_IDS.includes(INTERPRETER.playerId), 'the interpreter is one of the eleven');
  assert.equal(playableCharacter(INTERPRETER.playerId).roster, INTERPRETER.npcId, 'and the same man on the roster');
  for (const id of PLAYABLE_IDS) {
    const who = interpreterFor(id);
    if (id === 'gotwood') {
      assert.equal(who, null, 'playing as Chris, there is nobody to lean in');
      // Because you have it yourself, at the proficiency his own table gives him.
      assert.ok(startingLanguages(id).ambroni >= 40, 'and you do not need one');
      // The company placed for Chris really does not contain him.
      assert.ok(!companyFor(id).some(entry => entry.id === INTERPRETER.npcId), 'he is not on the road either');
    } else {
      assert.equal(who, INTERPRETER.npcId, `${id} has Chris beside him`);
      assert.ok(companyFor(id).some(entry => entry.id === INTERPRETER.npcId), `${id} really has Chris on the road`);
    }
  }
  assert.equal(interpreterFor('merc-gotwood'), null, 'the roster spelling is the same man');
  assert.equal(interpreterFor(undefined), INTERPRETER.npcId, 'and the default game has him');
  // With nobody to interpret, the linguist says so rather than throwing or half-helping.
  const linguist = createLinguist();
  assert.equal(linguist.interpreterNearby({ id: 'anybody', x: 0, z: 0 }, { interpreter: null, languageId: 'ambroni', at: { x: 0, z: 0 } }), false);
  assert.equal(linguist.interpreterNearby({ id: 'anybody', x: 0, z: 0 }, { interpreter: undefined, languageId: 'ambroni', at: { x: 0, z: 0 } }), false);
});

test('the company of eleven share the language of the contract, and the locals do not', () => {
  // All eleven were hired abroad on the same contract and came here together, so every man of
  // the company is plain from the first minute, whoever the player is. It is the locals the
  // traveler cannot follow (docs/design-answers.md, "the company of eleven").
  const LINE = 'The road north is not safe today, and the bell has been going since dawn.';
  for (const playerId of PLAYABLE_IDS) {
    const linguist = createLinguist();
    const company = companyFor(playerId);
    assert.equal(company.length, 10);
    for (const merc of company) {
      // Exactly the npc src/main.js builds for a hired sword, origin and all.
      const npc = { id: merc.id, name: merc.name, origin: merc.origin, modelRole: 'mercenary' };
      const speech = linguist.speech(npc, 'Drent');
      assert.equal(speaksTheContract(npc), true, `${playerId}: ${merc.name} is one of the company`);
      assert.equal(speech.language, null, `${playerId}: ${merc.name} has no tongue of his own in this`);
      assert.equal(linguist.render(LINE, speech), LINE, `${playerId}: ${merc.name} arrives whole at proficiency 0`);
      // His own origin is still who he is, and still says what he grew up speaking.
      if (merc.id !== CROMB.id) assert.ok(ORIGIN_LANGUAGE[merc.origin], `${merc.name}'s origin still names a tongue`);
    }
  }

  // The landing scene in particular: the man off your boat, whoever the slot turns out to hold.
  for (const playerId of PLAYABLE_IDS) {
    const mate = companyFor(playerId)[0];
    assert.equal(speechFor({ id: mate.id, origin: mate.origin }, 'Drent').language, null, `${playerId}: the man on the landing is plain`);
  }
  assert.equal(companyFor('gotwood')[0].id, CROMB.id, 'and when you are Chris that man is Cromb');
  assert.equal(speechFor({ id: CROMB.id, origin: CROMB.origin }, 'Drent').language, null, 'who is plain too');
  // Cromb has no origin tongue and is not getting one: he is a blank slate by decision.
  assert.equal(ORIGIN_LANGUAGE[CROMB.origin], undefined);
  assert.equal(speechFor({ id: CROMB_OLD_ID }, 'Drent').language, null, 'even under the name he had for a morning');

  // A local standing beside them is as foreign as ever.
  const linguist = createLinguist();
  for (const local of [{ id: 'harbormaster', name: 'Jojo', modelRole: 'harbormaster' },
    { id: 'acorn-cook', name: 'Lysa' }, { id: 'warden', name: 'Eren', modelRole: 'legion-soldier' }]) {
    const speech = linguist.speech(local, 'Drent');
    assert.equal(speaksTheContract(local), false, `${local.name} is not of the company`);
    assert.ok(LANGUAGES[speech.language], `${local.name} speaks a tongue of this world`);
    assert.notEqual(linguist.render(LINE, speech), LINE, `${local.name} is not understood at proficiency 0`);
  }
  // Nobody who is not a mercenary can be mistaken for one by an id that looks like one.
  assert.equal(speaksTheContract({ id: 'merc-nobody' }), false);
  assert.equal(speaksTheContract({}), false);
  assert.equal(speaksTheContract(null), false);
});

test('the harbourmaster names the man who actually walked up the pier with you', () => {
  // He is a slot: Chris Gotwood for ten of the eleven, Cromb when you are Chris. Her fourth line
  // used to say "pleased with himself, Gotwood" whoever it was, so as Chris she sent Chris
  // Gotwood to go and talk to Gotwood.
  for (const playerId of PLAYABLE_IDS) {
    const mate = companyFor(playerId)[0];
    const note = landingMateNote(mate);
    assert.ok(note.includes(mate.name), `${playerId}: she names ${mate.name}`);
    assert.ok(note.length > 20 && !note.includes('undefined'), `${playerId}: and says something of him`);
    if (playerId === 'gotwood') {
      assert.equal(mate.id, CROMB.id);
      assert.ok(note.includes('Cromb the Barbarian'), 'as Chris, the man beside you is Cromb');
      assert.ok(!note.includes('Gotwood'), 'and she does not send Chris to go and talk to Chris');
      assert.ok(!note.includes('pleased with himself'), 'nor give Cromb a phrase that is Chris\u2019s');
    } else {
      assert.ok(note.includes('Chris Gotwood'), `${playerId}: the man beside you is Chris`);
      assert.ok(note.includes('pleased with himself'), `${playerId}: which is the phrase she has for him`);
    }
  }
  // Anybody who ends up in the slot later gets a plain phrase rather than somebody else's.
  assert.equal(landingMateNote({ id: 'merc-mus', name: 'Mus' }), 'plain cloth and a sword, Mus');
  for (const nobody of [null, undefined, {}, { id: 'merc-gotwood' }]) {
    assert.ok(landingMateNote(nobody).length > 20, 'and she still says something when there is nobody');
    assert.ok(!landingMateNote(nobody).includes('undefined'));
  }
});

test('the man at your shoulder is the interpreter, unless you are him', () => {
  // He walks you up the pier until the letter is taken, so Jojo is glossed for the ten travelers
  // who need it. When you are Chris there is nobody to gloss her and nobody who needs to be.
  const localTongue = speechFor({ id: 'harbormaster', name: 'Jojo', modelRole: 'harbormaster' }, 'Drent').language;
  assert.ok(LANGUAGES[localTongue], 'the harbourmaster speaks a tongue of this world');
  assert.ok(INTERPRETER.knows.includes(localTongue), 'and one the interpreter has');
  for (const playerId of PLAYABLE_IDS) {
    const mate = companyFor(playerId)[0];
    const who = interpreterFor(playerId);
    if (playerId === 'gotwood') {
      assert.equal(who, null, 'as Chris nobody interprets');
      assert.equal(mate.id, CROMB.id, 'though Cromb still walks up with you');
      // And you do not need one, because you brought the Empire's speech with you.
      assert.ok(startingLanguages(playerId).ambroni >= 40);
    } else {
      assert.equal(who, mate.id, `${playerId}: the man who walked up with you is the one who leans in`);
      assert.equal(who, INTERPRETER.npcId);
    }
  }
  // What he is worth, measured the way src/linguist.js measures it: beside you and in range.
  const linguist = createLinguist();
  const speech = linguist.speech({ id: 'harbormaster', name: 'Jojo', modelRole: 'harbormaster' }, 'Drent');
  const mara = { x: 0, z: 25 }, traveler = { x: 1.2, z: 25.4 };
  const beside = { id: INTERPRETER.npcId, hidden: false, placement: { phase: 'landing', x: traveler.x - 1, z: traveler.z - 1 } };
  const waiting = { id: INTERPRETER.npcId, hidden: false, placement: { phase: 'landing', x: 23, z: 31.2 } };
  assert.equal(linguist.interpreterNearby(mara, { interpreter: beside, languageId: speech.language, at: traveler }), true,
    'at your shoulder he is heard');
  assert.equal(linguist.interpreterNearby(mara, { interpreter: waiting, languageId: speech.language, at: traveler }), false,
    'waiting at the landing ring he never was');
  assert.equal(linguist.interpreterNearby(mara, { interpreter: null, languageId: speech.language, at: traveler }), false,
    'and as Chris there is nobody to ask');
  // Her line is foreign either way; the aside is what changes, not what she says.
  assert.notEqual(linguist.render('The road is not safe.', speech), 'The road is not safe.');
});

test('the escort ends by arithmetic, so no path can leave him walking at your shoulder for ever', () => {
  // He is placed inside the traveler's own three-metre reach, which is what makes him audible and
  // what would make him steal every site prompt on the road if he never stopped. The rule is
  // derived every frame: nothing has to remember to tell him, because several ways of reaching
  // the road never replay the moment the letter was taken.
  const mate = MERCENARY_ROSTER[0];
  assert.equal(LETTER_STAGE, 2);
  // **Nobody escorts at all while `LANDING_ESCORT` is false** (the user, 21 September 2026:
  // Chris should not follow you right off the boat). The arithmetic below is the rule that
  // governs it when the switch goes back on, and is still worth holding.
  assert.equal(LANDING_ESCORT, false, 'the switch is off; turn it on only when asked');
  assert.equal(mateIsEscorting({ mate, questStage: 0, mode: 'playing' }), false, 'he does not set off with you');
  assert.equal(mateIsEscorting({ mate, questStage: 1, mode: 'playing' }), false, 'nor while Jojo is talking');
  for (let stage = LETTER_STAGE; stage <= 10; stage++) {
    assert.equal(mateIsEscorting({ mate, questStage: stage, mode: 'playing' }), false, `stage ${stage} is past the letter`);
  }
  // Every way the road is reached without replaying the letter.
  for (const [how, stage] of [['the road smoke', 10], ['a review view', 10], ['the testing tools', 10],
    ['start at the newest chapter', 10], ['a checkpoint taken after the letter', 10], ['the practice post', 2]]) {
    assert.equal(mateIsEscorting({ mate, questStage: stage, mode: 'playing' }), false, `${how} leaves nobody escorting`);
  }
  // And the states that are not ordinary play, whatever the stage.
  for (const mode of ['opening', 'arriving', 'fishing', 'defeated', 'ferry', 'testing', undefined]) {
    assert.equal(mateIsEscorting({ mate, questStage: 0, mode }), false, `${mode} is not the road`);
  }
  for (const mode of ESCORT_MODES) assert.equal(mateIsEscorting({ mate, questStage: 0, mode }), LANDING_ESCORT, `${mode} follows the switch`);
  assert.equal(mateIsEscorting({ mate, questStage: 0, mode: 'playing', arriving: true }), false, 'the cutscene places him itself');
  assert.equal(mateIsEscorting({ mate: null, questStage: 0 }), false, 'and a man who is not there does not walk');
  assert.equal(mateIsEscorting({ mate, questStage: NaN, mode: 'playing' }), false);
  assert.equal(mateIsEscorting(), false, 'the default is nobody escorting, not somebody');
});

test('a checkpoint taken after the letter restores with nobody at your shoulder', () => {
  // The restore rebuilds the road from the save; it never replays accept-letter. If the escort
  // waited to be told it was over, every continued game would have him glued to the traveler.
  for (const stage of [10]) {
    const { data, checkpoint } = fixture();
    assert.equal(checkpoint.save({ ...data, questStage: stage }).ok, true);
    const saved = checkpoint.read().data;
    assert.equal(saved.questStage, stage);
    assert.ok(saved.inventory.some(item => item.id === 'harbor-letter'), 'the letter is already in the satchel');
    assert.equal(mateIsEscorting({ mate: MERCENARY_ROSTER[0], questStage: saved.questStage, mode: 'playing' }), false,
      'a restored save past the letter has nobody escorting');
  }
  // A save from before the letter would put him back at your shoulder, when the switch is on.
  assert.equal(mateIsEscorting({ mate: MERCENARY_ROSTER[0], questStage: 1, mode: 'playing' }), LANDING_ESCORT);
});

/**
 * The user, 21 September 2026: only Cromb can be chosen for now, while the one main quest is
 * built out. The cast is untouched - the other ten are the company's hired swords, and a save
 * written as one of them still loads as him. This is the choosing, not the cast.
 */
test('only Cromb is offered at the opening, and the eleven are all still there', () => {
  assert.deepEqual([...SELECTABLE_IDS], ['cromb'], 'put an id back and he is on the opening screen again');
  assert.deepEqual(SELECTABLE.map(entry => entry.id), [...SELECTABLE_IDS]);
  assert.equal(PLAYABLE.length, 11, 'and nobody has been removed from the game');
  for (const id of SELECTABLE_IDS) assert.ok(isPlayableId(id), `${id} is one of the eleven`);
  assert.ok(SELECTABLE_IDS.includes(DEFAULT_PLAYER), 'and the one offered is the one a save defaults to');
});
