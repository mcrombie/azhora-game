import test from 'node:test';
import assert from 'node:assert/strict';
import { createCombat, fightBox } from '../src/combat.js';
import { createWeapons } from '../src/weapons.js';
import { createInventoryState } from '../src/inventory.js';
import { OGRE_ENCOUNTER } from '../src/amod-ogre.js';
import { LUSCIA_WOLVES } from '../src/luscia-chapter.js';
import { FOREST_HIDEOUT_QUEST } from '../src/forest-hideout.js';
import { borderEncounter } from '../src/border-chapter.js';
import { aftermathEncounter, AFTERMATH_VARIANTS } from '../src/aftermath-chapter.js';
import { AFTERMATH_ARENAS } from '../src/aftermath-sites.js';

/**
 * `startEncounter` runs its config through `encounterConfig`, which refuses the whole encounter
 * — it does not quietly drop the part it dislikes. That is the right way round, but it means an
 * encounter authored a metre outside its own fight box does not misbehave: it never begins, and
 * nothing says so until somebody walks up to the fight and nothing happens. Every fight the game
 * can start is checked here, in one place, so a new one cannot be born unstartable.
 */
const flat = () => ({ bounds: { minX: -2000, maxX: 2000, minZ: -2000, maxZ: 2000 }, colliders: [], heightAt: () => 1.5 });
function rig() {
  const stock = createInventoryState(); stock.add('simple-sword', 1);
  const weapons = createWeapons({ wear: true, inventory: { has: id => stock.has(id), count: id => stock.count(id), remove: (id, n) => stock.remove(id, n) } });
  weapons.equip('simple-sword');
  const position = { x: 0, y: 1.5, z: 0 };
  return { combat: createCombat({ world: flat(), position, getWeapon: () => weapons.profile(), onWeaponContact: id => weapons.contact(id) }), position, weapons };
}
const allies = Array.from({ length: 4 }, (_, index) => ({ id: `ally-${index}`, kind: 'legionary' }));

/** Every fight the game can put in front of the traveler. */
function everyFight() {
  const fights = [['the ogre at the pass stones', OGRE_ENCOUNTER], ['the wolves on the burial line', LUSCIA_WOLVES],
    ['the Bramble scout camp', FOREST_HIDEOUT_QUEST.encounter]];
  for (const side of ['empire', 'coalition']) fights.push([`the border battle, for the ${side}`, borderEncounter(side, allies)]);
  for (const spec of Object.values(AFTERMATH_VARIANTS)) {
    const arena = AFTERMATH_ARENAS[spec.arena];
    if (arena) fights.push([`the day after: ${spec.id}`, aftermathEncounter(spec.id, arena, allies)]);
  }
  return fights;
}

test('every fight the game can start is one combat will accept', () => {
  const fights = everyFight();
  assert.ok(fights.length >= 8, `only ${fights.length} fights found`);
  for (const [label, encounter] of fights) {
    const { combat } = rig();
    assert.equal(combat.startEncounter(encounter, { atCheckpoint: true }), true, `${label} cannot be started at all`);
    assert.equal(combat.state.phase, 'active', label);
    assert.equal(combat.state.enemies.length, encounter.enemies.length, `${label} lost enemies on the way in`);
  }
});

test('nobody in a fight is set down outside its own ground', () => {
  for (const [label, encounter] of everyFight()) {
    const box = fightBox(encounter);
    for (const who of [...encounter.enemies, ...(encounter.allies ?? [])]) {
      assert.ok(who.x >= box.minX && who.x <= box.maxX && who.z >= box.minZ && who.z <= box.maxZ,
        `${label}: ${who.id} stands at ${who.x.toFixed(1)}, ${who.z.toFixed(1)}, outside the box ${JSON.stringify(box)}`);
    }
    assert.ok(encounter.center && encounter.checkpoint, `${label} has a centre and a checkpoint`);
  }
});

test('a fight built wrong is refused rather than half-begun', () => {
  const ground = enemies => ({ id: 'probe', center: { x: 0, z: -6 }, checkpoint: { x: 0, z: 0 }, retreatZ: 30, enemies });
  const one = [{ id: 'g', x: 0, z: -3, kind: 'goblin', hp: 40 }];
  const wrong = [
    ['no enemies at all', ground([])],
    ['more enemies than a fight holds', ground(Array.from({ length: 13 }, (_, i) => ({ id: `g${i}`, x: i * .5 - 3, z: -3, kind: 'goblin', hp: 10 })))],
    ['two of them sharing an id', ground([one[0], { ...one[0], x: 1 }])],
    ['a kind of creature there is none of', ground([{ ...one[0], kind: 'dragon' }])],
    ['somebody already dead', ground([{ ...one[0], hp: 0 }])],
    ['somebody nowhere', ground([{ ...one[0], x: Number.NaN }])],
    ['somebody outside the box', ground([{ ...one[0], z: -40 }])],
    ['the checkpoint past the retreat line', { ...ground(one), checkpoint: { x: 0, z: 99 } }],
    ['nothing at all', null], ['a name instead of a fight', 'the greenway'],
  ];
  for (const [label, config] of wrong) {
    const { combat } = rig();
    assert.equal(combat.startEncounter(config, { atCheckpoint: true }), false, `combat accepted a fight with ${label}`);
    assert.equal(combat.state.phase, 'peaceful', `${label} left the traveler in a fight`);
    assert.deepEqual(combat.state.enemies, [], `${label} left enemies behind`);
  }
  // And a fight cannot be started on top of one already running.
  const { combat } = rig();
  assert.equal(combat.startEncounter(ground(one), { atCheckpoint: true }), true);
  assert.equal(combat.startEncounter(ground([{ ...one[0], id: 'h' }]), { atCheckpoint: true }), false, 'a second fight began over the first');
  assert.deepEqual(combat.state.enemies.map(enemy => enemy.id), ['g']);
});

test('a swing costs what it says, reaches as far as it says, and only in front', () => {
  const ground = { id: 'probe', center: { x: 0, z: -6 }, checkpoint: { x: 0, z: 0 }, retreatZ: 30,
    enemies: [{ id: 'g', x: 0, z: -3, kind: 'goblin', hp: 5000 }] };
  const settle = combat => { for (let t = 0; t < 1; t += 1 / 60) combat.update(1 / 60); };
  // Stamina: refused below the cost, allowed at exactly it, and never negative.
  {
    const { combat } = rig();
    combat.startEncounter(ground, { atCheckpoint: true }); settle(combat);
    combat.state.player.stamina = 5;
    assert.equal(combat.attack(Math.PI), false, 'a swing was allowed below its cost');
    combat.state.player.stamina = 6;
    assert.equal(combat.attack(Math.PI), true, 'a swing at exactly its cost was refused');
    assert.ok(combat.state.player.stamina >= 0, `stamina went to ${combat.state.player.stamina}`);
    combat.state.player.stamina = 24;
    assert.equal(combat.dodge({ x: 1, z: 0 }), false, 'a dodge was allowed below its cost');
  }
  // Reach, measured by holding the enemy at a distance across the whole swing.
  const strike = (distance, degrees = 0) => {
    const { combat } = rig();
    combat.startEncounter(ground, { atCheckpoint: true }); settle(combat);
    const enemy = combat.state.enemies[0];
    combat.state.player.stamina = 100;
    combat.attack(Math.PI);                                     // the model's rotation, facing -Z
    const before = enemy.hp, angle = degrees * Math.PI / 180;
    for (let t = 0; t < .6; t += 1 / 120) { enemy.x = Math.sin(angle) * distance; enemy.z = -Math.cos(angle) * distance; combat.update(1 / 120); }
    return enemy.hp < before;
  };
  assert.equal(strike(2.0), true, 'a swing at two metres missed');
  assert.equal(strike(0.5), true, 'a swing at half a metre missed');
  assert.equal(strike(3.0), false, 'a swing reached three metres');
  assert.equal(strike(2.0, 20), true, 'a swing twenty degrees off missed');
  assert.equal(strike(2.0, 90), false, 'a swing hit something at right angles to it');
  assert.equal(strike(2.0, 180), false, 'a swing hit something behind the traveler');
});

test('health and stamina stay between nothing and their maximum, whatever is asked of them', () => {
  const { combat } = rig();
  const player = combat.state.player;
  player.hp = 50;
  assert.equal(combat.heal(20), 20);
  assert.equal(player.hp, 70);
  assert.equal(combat.heal(999), 30, 'healing past the maximum should only give what is missing');
  assert.equal(player.hp, player.maxHp);
  for (const nonsense of [0, -5, Number.NaN, Infinity, '10', null, undefined]) {
    const before = player.hp;
    combat.heal(nonsense);
    assert.equal(player.hp, before, `heal(${String(nonsense)}) changed health`);
  }
  // Stamina fills back up and stops there.
  player.stamina = 0;
  for (let t = 0; t < 30; t += 1 / 60) combat.update(1 / 60);
  assert.equal(player.stamina, player.maxStamina, 'stamina did not come back, or passed its maximum');
});
