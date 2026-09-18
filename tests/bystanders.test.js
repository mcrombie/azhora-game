import test from 'node:test';
import assert from 'node:assert/strict';
import { createCombat } from '../src/combat.js';
import { GREENWAY_RAID } from '../src/opening-fights.js';
import { CAUGHT, SPARED, bystandersFor, createFallen, fightGround, validateFallenSnapshot } from '../src/bystanders.js';

const open = { bounds: { minX: -200, maxX: 200, minZ: -200, maxZ: 200 }, colliders: [], heightAt: () => 1.5 };
const MARN = { id: 'greenway-forager', name: 'Marn', x: -66, z: 23 };
const TAMSIN = { id: 'forest-woodcutter', name: 'Tamsin', x: -57, z: 42 };
const sword = { id: 'simple-sword', damage: [24, 26, 34], reachMultiplier: 1, usable: true };

function raid(people = [MARN, TAMSIN], position = { x: -45, y: 1.5, z: 29 }) {
  const events = [];
  const combat = createCombat({ world: open, position, getWeapon: () => sword, onEvent: event => events.push(event) });
  const allies = bystandersFor(GREENWAY_RAID, people);
  assert.ok(combat.startEncounter({ ...GREENWAY_RAID, allies }), 'the raid accepts its villagers');
  return { combat, events, position, allies };
}
const run = (combat, seconds, each = () => {}) => { for (let t = 0; t < seconds && combat.state.phase === 'active'; t += 1 / 60) { each(t); combat.update(1 / 60); } };

test('villagers near a raid are caught in it: the one with an axe fights, the one without runs, and nobody far off', () => {
  const far = { id: 'tide-boy', name: 'Pip', x: -12, z: 28 };
  const allies = bystandersFor(GREENWAY_RAID, [MARN, TAMSIN, far]);
  assert.deepEqual(allies.map(a => [a.id, a.kind]), [['greenway-forager', 'bystander'], ['forest-woodcutter', 'villager']]);
  const [marn, tamsin] = allies, { start, step } = fightGround(GREENWAY_RAID);
  assert.equal(marn.spared, false, 'Marn can die');
  assert.equal(tamsin.spared, true, 'Tamsin carries a story and is only knocked down');
  assert.ok(tamsin.z <= start.maxZ && tamsin.z < TAMSIN.z, 'Tamsin, just outside, is brought onto the fight’s ground');
  assert.ok(marn.refuge.x >= step.minX && marn.refuge.z >= step.minZ, 'Marn runs for the edge of it');
  assert.ok(Math.hypot(marn.refuge.x - MARN.x, marn.refuge.z - MARN.z) < 20);
  // Away from the goblins, not through them.
  const goblins = { x: -60, z: 29 };
  assert.ok(Math.hypot(marn.refuge.x - goblins.x, marn.refuge.z - goblins.z) > Math.hypot(MARN.x - goblins.x, MARN.z - goblins.z));
  assert.equal(bystandersFor(GREENWAY_RAID, [MARN], { fallen: ['greenway-forager'] }).length, 0, 'the dead are not caught again');
  assert.ok(CAUGHT >= 15);
});

test('left alone, a villager who runs is caught and killed, and one the story needs goes down wounded', () => {
  const { combat, events } = raid();
  run(combat, 60);
  const marn = combat.state.allies.find(a => a.id === MARN.id), tamsin = combat.state.allies.find(a => a.id === TAMSIN.id);
  assert.equal(marn.hp, 0, 'the goblins reached Marn');
  assert.ok(events.some(e => e.type === 'ally-down' && e.id === MARN.id));
  assert.ok(events.some(e => e.type === 'windup' && e.targetId === MARN.id), 'they went for her, not only the traveler');
  assert.equal(tamsin.hp, 0);
  assert.equal(tamsin.wounded, true);
  assert.ok(events.some(e => e.type === 'ally-wounded' && e.id === TAMSIN.id) && !events.some(e => e.type === 'ally-down' && e.id === TAMSIN.id));
});

test('a villager freezes, then runs; with no goblin after it, it gets clear', () => {
  // The goblins hang back at the far side for a minute: this is only about running.
  const events = [], position = { x: -45, y: 1.5, z: 29 };
  const combat = createCombat({ world: open, position, getWeapon: () => sword, onEvent: event => events.push(event) });
  const waiting = { ...GREENWAY_RAID, enemies: GREENWAY_RAID.enemies.map(e => ({ ...e, entry: 60 })) };
  assert.ok(combat.startEncounter({ ...waiting, allies: bystandersFor(GREENWAY_RAID, [MARN]) }));
  const marn = () => combat.state.allies[0], start = { x: marn().x, z: marn().z };
  assert.ok(marn().frozen > 0, 'rooted to the spot at first');
  run(combat, 3);
  assert.deepEqual({ x: marn().x, z: marn().z }, start, 'still frozen');
  run(combat, 30);
  assert.equal(marn().escaped, true);
  assert.equal(marn().active, false, 'safe, and no longer a target');
  assert.ok(events.some(e => e.type === 'ally-escaped' && e.id === MARN.id));
  // And reaching a frozen villager is enough to break the spell.
  const saved = createCombat({ world: open, position: { x: -64, y: 1.5, z: 23 }, getWeapon: () => sword });
  saved.startEncounter({ ...waiting, allies: bystandersFor(GREENWAY_RAID, [MARN]) });
  run(saved, .1);
  assert.equal(saved.state.allies[0].frozen, 0, 'the traveler at her side, she runs');
});

test('a traveler who fights for them saves them', () => {
  const position = { x: -60, y: 1.5, z: 25 };
  const { combat } = raid([MARN, TAMSIN], position);
  // A plain fighter: face the nearest goblin, swing when close, close the gap otherwise.
  run(combat, 60, () => {
    const foe = combat.state.enemies.filter(e => e.active && e.action !== 'dead').sort((a, b) => Math.hypot(a.x - position.x, a.z - position.z) - Math.hypot(b.x - position.x, b.z - position.z))[0];
    if (!foe || combat.state.player.action !== 'idle') return;
    const d = Math.hypot(foe.x - position.x, foe.z - position.z), yaw = Math.atan2(foe.x - position.x, foe.z - position.z);
    if (d < 2) combat.attack(yaw); else { position.x += Math.sin(yaw) * 7.2 / 60; position.z += Math.cos(yaw) * 7.2 / 60; }
  });
  assert.equal(combat.state.phase, 'won');
  assert.ok(combat.state.allies.every(a => a.hp > 0), 'nobody died');
});

test('a retry after a defeat is fought without the villagers, who have already run or fallen', () => {
  const { combat } = raid();
  assert.equal(combat.state.allies.length, 2);
  assert.ok(combat.resetEncounter({ allies: [] }));
  assert.equal(combat.state.allies.length, 0);
  assert.equal(combat.state.enemies.length, 3);
});

test('the dead are remembered with the road save; those the story needs never are', () => {
  const fallen = createFallen();
  assert.equal(fallen.fall('greenway-forager'), true);
  assert.equal(fallen.fall('greenway-forager'), false, 'once');
  for (const id of SPARED) assert.equal(fallen.fall(id), false, `${id} cannot die`);
  const saved = fallen.snapshot();
  assert.deepEqual(saved, { version: 1, ids: ['greenway-forager'] });
  const again = createFallen();
  assert.equal(again.restore(saved), true);
  assert.equal(again.has('greenway-forager'), true);
  assert.equal(validateFallenSnapshot(undefined), true, 'an old save has no list');
  assert.equal(validateFallenSnapshot({ version: 1, ids: ['warden'] }), false, 'a spared name on the list is refused');
  assert.equal(validateFallenSnapshot({ version: 1, ids: ['a', 'a'] }), false);
  assert.equal(validateFallenSnapshot({ version: 2, ids: [] }), false);
});
