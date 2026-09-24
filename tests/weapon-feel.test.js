import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createCombat } from '../src/combat.js';
import { WEAPON_TYPES, SWORD_ARC, TRADEABLE_WEAPONS } from '../src/weapons.js';
import { ARMS_SKILLS, familyOf } from '../src/combat-skills.js';
import { KIT_WEAPON_ITEM, MERCENARY_STYLES } from '../src/mercenaries.js';
import { INVENTORY_ITEMS } from '../src/inventory.js';
import { sourceModule } from './module-loader.js';

const source = name => readFileSync(fileURLToPath(new URL(`../src/${name}`, import.meta.url)), 'utf8');
const { createCharacter } = await sourceModule('../src/characters.js');
const open = { heightAt: () => 1.5, colliders: [], bounds: { minX: -300, maxX: 300, minZ: -300, maxZ: 300 } };

/** A fight with one goblin due north, and whatever weapon is being asked about. */
function fight(weaponId, { world = open } = {}) {
  const type = WEAPON_TYPES[weaponId];
  const position = { x: 0, y: 1.5, z: 0 };
  const events = [];
  const combat = createCombat({ world, position, onEvent: event => events.push(event),
    getWeapon: () => ({ id: weaponId, ...type, usable: true, damage: [...type.damage] }) });
  combat.setWeaponReady(true);
  assert.equal(combat.startEncounter({ id: 'feel', level: 0, center: { x: 0, z: 0 },
    checkpoint: { x: 0, z: 13 }, retreatLine: 21, retreatAxis: 'z',
    enemies: [{ id: 'g1', kind: 'goblin', x: 0, z: 2, hp: 400 }] }, { atCheckpoint: true }), true);
  return { combat, events, position };
}

/** How long one swing of this weapon takes, measured by running it. */
function swingSeconds(weaponId) {
  const { combat } = fight(weaponId);
  assert.equal(combat.attack(0), true, `${weaponId} swings`);
  let seconds = 0;
  for (let step = 0; step < 60 * 10 && combat.state.player.action === 'attack'; step++) { combat.update(1 / 60); seconds += 1 / 60; }
  return seconds;
}

test('the sword is the reference, and a weapon that says nothing is the sword', () => {
  // **Phase 5 is invisible to a traveler carrying the sword he landed with.**
  assert.equal(WEAPON_TYPES['simple-sword'].tempo, 1);
  assert.equal(WEAPON_TYPES['simple-sword'].arc, SWORD_ARC);
  assert.equal(SWORD_ARC, Math.PI * .34, 'which is the arc the game has always struck in');
  // A bare weapon - the shape every existing test hands `combat` - is the sword's feel exactly.
  const combat = source('combat.js');
  assert.match(combat, /const tempoOf = weapon => \(Number\.isFinite\(weapon\?\.tempo\) && weapon\.tempo > 0 \? weapon\.tempo : 1\);/);
  assert.match(combat, /const arcOf = weapon => \(Number\.isFinite\(weapon\?\.arc\) && weapon\.arc > 0 \? weapon\.arc : SWORD_ARC\);/);
  // Nothing anywhere still reads the old constants in place of the weapon's own.
  assert.doesNotMatch(combat, /facing\(position, enemy, yaw, Math\.PI \* \.43\)/);
  assert.doesNotMatch(combat, /facing\(position, enemy, player\.yaw, Math\.PI \* \.34\)/);
});

test('tempo: the staff strikes twice as often as the sword, and the great blades are slow', () => {
  const sword = swingSeconds('simple-sword');
  // Lakota's own line is the specification, so the number is 2 and not "about 2".
  assert.equal(WEAPON_TYPES.quarterstaff.tempo, .5);
  assert.equal(WEAPON_TYPES['forest-stick'].tempo, .5);
  const staff = swingSeconds('quarterstaff');
  assert.ok(Math.abs(staff / sword - .5) < .08, `a staff swing is ${(staff / sword).toFixed(2)} of a sword's`);
  // Ed's dagger is quick, Eliana's greatsword is slow to start, Al's mace is slower than a sword.
  assert.ok(swingSeconds('long-dagger') < sword, 'the dagger is inside the swing');
  for (const heavy of ['greatsword', 'iron-mace', 'bearded-axe'])
    assert.ok(swingSeconds(heavy) > sword, `${heavy} is slow to start`);
  // Every tempo is a real positive number, or the clock divides by nonsense.
  for (const [id, type] of Object.entries(WEAPON_TYPES))
    assert.ok(Number.isFinite(type.tempo) && type.tempo > 0, `${id} has a tempo`);
});

test('arc: a greatsword takes a cart’s width and a spear takes what is in front of it', () => {
  const arc = id => WEAPON_TYPES[id].arc;
  assert.ok(arc('greatsword') > arc('simple-sword'), 'everything within a cart’s width');
  assert.ok(arc('long-dagger') < arc('simple-sword'), 'short and narrow');
  for (const polearm of ['ash-spear', 'war-pike']) {
    assert.ok(arc(polearm) < arc('long-dagger'), `${polearm} is narrower than a dagger`);
    assert.equal(WEAPON_TYPES[polearm].thrust, true, 'it thrusts rather than cuts');
    assert.ok(WEAPON_TYPES[polearm].reachMultiplier > 1.5, 'and reaches a long way');
  }
  // The pike is the longest reach in the game, as the brief says in as many words.
  const longest = Object.entries(WEAPON_TYPES).sort((a, b) => b[1].reachMultiplier - a[1].reachMultiplier)[0];
  assert.equal(longest[0], 'war-pike');
  // **Measured, not merely declared.** A straw post a pace in front, which cannot strike back
  // and so cannot cancel the swing being measured - the first draft used a goblin and ended up
  // measuring the goblin hitting first. Swing thirty-four degrees off it: inside a sword's arc,
  // outside a spear's, and outside a spear's wider aiming arc too, so nothing snaps it round.
  const OFF = .6;
  assert.ok(OFF < arc('simple-sword'), 'inside a sword\u2019s arc');
  assert.ok(OFF > arc('ash-spear') * (.43 / .34), 'and outside a spear\u2019s, aiming included');
  for (const [id, hits] of [['simple-sword', true], ['ash-spear', false]]) {
    const type = WEAPON_TYPES[id], position = { x: 0, y: 1.5, z: 0 }, events = [];
    const combat = createCombat({ world: open, position, onEvent: one => events.push(one),
      getWeapon: () => ({ id, ...type, usable: true, damage: [...type.damage] }) });
    // Jojo's own straw post: `startPractice` is what puts one up, and it stands where it is put.
    combat.startPractice({ x: 0, z: 1.3 });
    const post = combat.state.enemies[0];
    assert.ok(post, 'there is a post to swing at');
    const bearing = Math.atan2(post.x - position.x, post.z - position.z);
    assert.equal(combat.attack(bearing + OFF), true, `${id} swings`);
    for (let step = 0; step < 120 && combat.state.player.action === 'attack'; step++) combat.update(1 / 60);
    assert.equal(events.some(one => one.type === 'hit'), hits, `${id} swung ${OFF} off the post`);
  }
});

test('the pike will not swing in a doorway', () => {
  // "In a doorway I am furniture." Two metres of wall is the whole rule.
  assert.equal(WEAPON_TYPES['war-pike'].room, 2);
  // A wall 1.2 m from wherever he is standing. It has to follow him: `atCheckpoint` puts the
  // traveler on the checkpoint, and a wall pinned to the origin was thirteen metres behind him.
  const walled = { ...open, nearColliders: (x, z) => [{ x: x + 1.2, z, r: .3, kind: 'house' }] };
  const tight = fight('war-pike', { world: walled });
  assert.equal(tight.combat.attack(0), false, 'the pike refuses');
  assert.equal(tight.events.filter(e => e.type === 'no-room').length, 1, 'and says why');
  assert.equal(tight.combat.state.player.action, 'idle', 'and nothing is spent on it');
  assert.equal(tight.combat.state.player.stamina, 100);
  // The same wall does not trouble a sword, which is the point of the rule being the pike's.
  assert.equal(fight('simple-sword', { world: walled }).combat.attack(0), true);
  // Out in the open it swings like anything else.
  assert.equal(fight('war-pike').combat.attack(0), true);
  // A world that has no colliders at all is open ground, not a locked pike.
  assert.equal(fight('war-pike', { world: { ...open, nearColliders: undefined } }).combat.attack(0), true);
});

test('the heavy families’ third swing cannot be stepped out of', () => {
  for (const [id, locked] of [['greatsword', true], ['iron-mace', true], ['bearded-axe', true],
    ['simple-sword', false], ['long-dagger', false], ['quarterstaff', false]]) {
    const { combat } = fight(id);
    // Get to the third swing of the run.
    for (let swing = 0; swing < 3; swing++) {
      assert.equal(combat.attack(0), true, `${id} swing ${swing}`);
      const until = swing === 2 ? 0 : 60 * 3;
      for (let step = 0; step < until && combat.state.player.action === 'attack'; step++) combat.update(1 / 60);
    }
    assert.equal(combat.state.player.combo, 2, `${id} is on its third`);
    // Past the contact moment, a sword lets you step aside. A greatsword does not.
    for (let step = 0; step < 30 && combat.state.player.action === 'attack'; step++) combat.update(1 / 60);
    if (combat.state.player.action === 'attack')
      assert.equal(combat.dodge({ x: 1, z: 0 }), !locked, `${id} third swing: locked ${locked}`);
    assert.equal(!!WEAPON_TYPES[id].locked, locked, `${id} says so in its own table`);
  }
});

test('every weapon has a family, a home and a way into the traveler’s hand', () => {
  for (const id of Object.keys(WEAPON_TYPES)) {
    assert.ok(familyOf(id), `${id} belongs to an Arms skill`);
    assert.ok(INVENTORY_ITEMS[id]?.name, `${id} is a thing the satchel can hold`);
  }
  // The two lists the brief left empty for this phase now have their weapons.
  assert.deepEqual([...ARMS_SKILLS.polearms.weapons], ['ash-spear', 'war-pike']);
  assert.deepEqual([...ARMS_SKILLS.staves.weapons], ['forest-stick', 'quarterstaff', 'wand', 'oak-staff']);
  // Nobody who carries a polearm or a staff will trade it, so none of them is tradeable...
  for (const id of ['ash-spear', 'war-pike', 'quarterstaff'])
    assert.equal(TRADEABLE_WEAPONS.includes(id), false, `${id} is not traded`);
  for (const who of ['ciaran', 'lakota', 'matt', 'mus'])
    assert.equal(MERCENARY_STYLES[who].trades, false, `${who} keeps his`);
  // ...and yet each of their kits now names a real weapon, so what lies where they fall is a
  // weapon and not a blank. Four of the ten left nothing behind before this.
  for (const who of ['ciaran', 'lakota', 'matt', 'mus']) {
    const item = KIT_WEAPON_ITEM[MERCENARY_STYLES[who].weapon];
    assert.ok(item && WEAPON_TYPES[item], `${who}'s ${MERCENARY_STYLES[who].weapon} is a real weapon`);
  }
});

test('what he takes up is what he is seen holding', () => {
  // A traveler who picks a dead friend's spear off the ground must not be drawn with a sword.
  const actor = createCharacter();
  const PROPS = { 'ash-spear': 'Ash spear', 'war-pike': 'War pike', quarterstaff: 'Quarterstaff' };
  for (const id of Object.keys(WEAPON_TYPES)) {
    assert.equal(actor.setWeapon(id), true, `${id} is a thing he can be seen holding`);
  }
  assert.equal(actor.setWeapon('nothing-of-the-kind'), false, 'and nothing else is');
  // The three poles are the props the hired swords already carry, not new ones invented here.
  for (const [id, name] of Object.entries(PROPS)) {
    const prop = actor.group.getObjectByName(name);
    assert.ok(prop, `${id} has a ${name} on him`);
    actor.setWeapon(id);
    assert.equal(prop.visible, true, `${name} is shown when it is what he holds`);
    actor.setWeapon('simple-sword');
    assert.equal(prop.visible, false, `and hidden when it is not`);
  }
  // Exactly one at a time: he is never seen carrying two.
  for (const id of Object.keys(WEAPON_TYPES)) {
    actor.setWeapon(id);
    let shown = 0;
    for (const name of Object.values(PROPS)) if (actor.group.getObjectByName(name)?.visible) shown++;
    assert.ok(shown <= 1, `holding ${id}, ${shown} poles are drawn`);
  }
  // They hang off the wrist mount with the blades, so they swing with the arm rather than
  // standing planted the way an npc's does.
  const characters = source('characters.js');
  assert.match(characters, /'ash-spear': mount => makeSpearProp\(mount, 'Ash spear', 1\.9\),/);
  // Built the first time he holds one, like the buckler: a figure has a draw-call budget and
  // these three are only ever reached by taking one off the ground where its owner fell.
  assert.match(characters, /if \(isPlayer && weapon && LATE_WEAPONS\[id\] && !weapons\[id\]\) weapons\[id\] = LATE_WEAPONS\[id\]\(weapon\);/);
  // And the facade forwards it plainly. `player` is a facade over a replaceable body, and a verb
  // called with `?.` on it does nothing at all, quietly (docs/known-issues.md).
  const main = source('main.js');
  assert.match(main, /setWeapon:\(\.\.\.a\)=>playerBody\.setWeapon\(\.\.\.a\)/);
  assert.doesNotMatch(main, /player\.setWeapon\?\./);
});
