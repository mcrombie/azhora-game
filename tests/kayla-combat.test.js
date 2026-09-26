import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { createCombat, ENEMY_KINDS } from '../src/combat.js';
import { BODY } from '../src/bodies.js';
import { createCorpses, corpseLoot } from '../src/corpses.js';
import { sourceModule } from './module-loader.js';

const { createKaylaBear } = await sourceModule('../src/kayla-character.js');
const { createCombatView } = await sourceModule('../src/combat-view.js');
const { createCorpseView } = await sourceModule('../src/corpse-view.js');
const { groundShadow } = await sourceModule('../src/characters.js');
const world = { bounds: { minX: -100, maxX: 100, minZ: -100, maxZ: 100 }, colliders: [], heightAt: () => 0 };
const bear = { id: 'kayla-fight', npcId: 'kayla', name: 'Kayla', kind: 'bear', x: 0, z: 0, hp: 450 };
const encounter = { id: 'bear-check', center: { x: 0, z: 0 }, checkpoint: { x: 0, z: 4 }, retreatZ: 15, enemies: [bear] };

function fixture(options = {}) {
  const position = { x: 0, y: 0, z: 2.4 }, events = [];
  const combat = createCombat({ world, position, onEvent: event => events.push(event), ...options });
  return { combat, position, events };
}

test('Kayla keeps her own health, strength, collision footprint and uninterrupted swipe in every country', () => {
  assert.equal(BODY.bear, .8);
  assert.equal(ENEMY_KINDS.bear.tell, .55);
  for (const level of [0, 1, 5]) {
    const { combat, events } = fixture();
    assert.equal(combat.startEncounter({ ...encounter, level }), true);
    const enemy = combat.state.enemies[0];
    assert.equal(enemy.maxHp, 450); assert.equal(enemy.r, BODY.bear);
    for (let frame = 0; frame < 180 && enemy.action !== 'windup'; frame++) combat.update(1 / 60);
    assert.equal(enemy.action, 'windup');
    combat.spellHit('kayla', 24);
    assert.equal(enemy.hp, 426); assert.equal(enemy.action, 'windup', 'a light hit cannot interrupt the bear');
    for (let frame = 0; frame < 180 && !events.some(event => event.type === 'player-hit'); frame++) combat.update(1 / 60);
    const hit = events.find(event => event.type === 'player-hit');
    assert.ok(hit, 'the committed paw strike reaches the traveler');
    assert.equal(hit.damage, 42, `strength does not scale in country level ${level}`);
  }
});

test('a newly hostile bear joins a live fight without resetting anyone already fighting', () => {
  const { combat, position } = fixture();
  const initial = { ...encounter, level: 5, enemies: [{ id: 'original', kind: 'goblin', x: -5, z: -5, hp: 100 }],
    allies: [{ id: 'friend', npcId: 'world-friend', kind: 'legionary', x: 5, z: 5 }] };
  assert.equal(combat.startEncounter(initial), true);
  combat.state.player.hp = 63; combat.state.player.stamina = 47;
  combat.attack(0); combat.update(.1);
  const player = combat.state.player, beforePlayer = JSON.stringify(player), beforePosition = { ...position };
  const enemy = combat.state.enemies[0], beforeEnemy = JSON.stringify(enemy), allies = combat.state.allies;
  const arrows = combat.state.arrows, fireballs = combat.state.fireballs;
  assert.equal(combat.joinEnemy({ ...bear, currentHp: 420, x: 8, z: 0, entry: .5 }), true);
  assert.equal(combat.state.encounterId, initial.id);
  assert.equal(combat.state.phase, 'active'); assert.equal(combat.state.player, player);
  assert.equal(JSON.stringify(player), beforePlayer); assert.deepEqual(position, beforePosition);
  assert.equal(combat.state.enemies[0], enemy); assert.equal(JSON.stringify(enemy), beforeEnemy);
  assert.equal(combat.state.allies, allies); assert.equal(combat.state.arrows, arrows); assert.equal(combat.state.fireballs, fireballs);
  assert.equal(combat.state.enemies[1].hp, 420); assert.equal(combat.state.enemies[1].maxHp, 450);
  assert.equal(combat.resetEncounter(), true);
  assert.equal(combat.state.enemies.find(actor => actor.npcId === 'kayla').maxHp, 450, 'retry does not scale the bear');
});

test('joining rejects bad identities, invalid creatures, full fights, fallen residents and sparring atomically', () => {
  const { combat } = fixture();
  assert.equal(combat.joinEnemy(bear), false, 'peaceful combat cannot silently become a fight');
  assert.equal(combat.startEncounter({ ...encounter, enemies: [{ id: 'other', npcId: 'world-other', x: 0, z: 0 }],
    allies: [{ id: 'friend', npcId: 'world-friend', kind: 'legionary', x: 5, z: 5 }] }), true);
  const before = JSON.stringify(combat.state);
  for (const bad of [null, {}, { ...bear, id: 'other' }, { ...bear, id: 'world-other' }, { ...bear, npcId: 'friend' },
    { ...bear, npcId: 'world-friend' }, { ...bear, npcId: 'traveler' }, { ...bear, kind: 'unknown' },
    { ...bear, hp: NaN }, { ...bear, currentHp: 0 }, { ...bear, x: 30 }, { ...bear, entry: -1 }]) {
    assert.equal(combat.joinEnemy(bad), false); assert.equal(JSON.stringify(combat.state), before);
  }
  const bout = fixture().combat;
  assert.ok(bout.startEncounter({ ...encounter, bout: true, enemies: [{ id: 'teacher', kind: 'sparring', x: 0, z: 0 }] }));
  assert.equal(bout.joinEnemy(bear), false);
  const fallen = fixture({ isFallen: (encounterId, id, actor) => actor.npcId === 'kayla' }).combat;
  assert.ok(fallen.startEncounter({ ...encounter, enemies: [{ id: 'other', x: 0, z: 0 }] }));
  assert.equal(fallen.joinEnemy(bear), false);
  const crowded = fixture().combat;
  assert.ok(crowded.startEncounter({ ...encounter, enemies: Array.from({ length: 12 }, (_, i) => ({ id: `foe-${i}`, x: i - 6, z: 0 })) }));
  assert.equal(crowded.joinEnemy(bear), false); assert.equal(crowded.state.enemies.length, 12);
});

test('a bear corpse keeps its natural model, lies grounded, and holds honeycomb rather than human gear', () => {
  assert.deepEqual(corpseLoot(bear), [{ id: 'honeycomb', quantity: 1 }]);
  assert.deepEqual(corpseLoot({ ...bear, dead: false }), []);
  for (const borrowed of [false, true]) {
    const scene = new THREE.Scene(), model = createCorpses(), view = createCorpseView(scene, world);
    model.add({ ...bear, id: 'npc:kayla', sourceId: bear.id, x: 23, z: -15, yaw: .7 });
    const actor = borrowed ? createKaylaBear() : null, original = actor?.group;
    if (actor) {
      original.position.set(23, 2, -15); original.rotation.y = .7; scene.add(original);
      original.add(groundShadow(.8)); view.adopt(model.get('npc:kayla'), actor);
      assert.equal(view.actor('npc:kayla'), actor, 'transferring ownership preserves the borrowed actor handle');
    }
    view.update(model.list(), 2);
    const corpse = view.actor('npc:kayla'), figure = corpse.group.getObjectByName('Kayla the bear');
    assert.ok(figure); assert.ok(figure.rotation.z > 1.4);
    if (original) assert.equal(figure, original, 'the actual bear is retained');
    assert.equal(corpse.group.position.x, 23); assert.equal(corpse.group.position.z, -15); assert.equal(corpse.group.rotation.y, .7);
    const bounds = new THREE.Box3().setFromObject(figure);
    assert.ok(Math.abs(bounds.min.y) < .015, `the side rests on the ground: ${bounds.min.y}`);
    assert.ok(bounds.max.y < 1.4, `the bear is lying down: ${bounds.max.y}`);
    assert.equal(figure.scale.x, 1);
    const rotation = figure.rotation.toArray(); view.update(model.list(), 50); assert.deepEqual(figure.rotation.toArray(), rotation);
    const saved = model.snapshot(); assert.equal(model.restore(saved), true); assert.equal(model.get('npc:kayla').loot[0].id, 'honeycomb');
    view.clear();
  }
});

test('combat borrows Kayla by her NPC identity and has a bear fallback without a second humanoid', () => {
  const previous = { document: globalThis.document, innerWidth: globalThis.innerWidth, innerHeight: globalThis.innerHeight };
  const node = () => ({ style: {}, classList: { toggle() {} }, append() {}, remove() {}, hidden: false });
  const elements = new Map();
  globalThis.document = { createElement: node, getElementById(id) { if (!elements.has(id)) elements.set(id, node()); return elements.get(id); } };
  globalThis.innerWidth = 1280; globalThis.innerHeight = 720;
  try {
    for (const borrowed of [false, true]) {
      const scene = new THREE.Scene(), actor = borrowed ? createKaylaBear() : null;
      const view = createCombatView(scene, world, new THREE.PerspectiveCamera(), { getActor: id => id === 'kayla' ? actor : null });
      const enemy = { ...bear, model: { role: 'traveler' }, maxHp: 450, yaw: 0, action: 'idle', progress: 0, active: true };
      const state = { encounterId: encounter.id, phase: 'active', enemies: [enemy], allies: [], player: { action: 'idle', progress: 0, yaw: 0 } };
      view.update(.1, 0, state, new THREE.Vector3());
      const rendered = view.actor(bear.id); assert.ok(rendered);
      if (actor) assert.equal(rendered, actor);
      assert.equal(rendered.group.name, 'Kayla the bear');
      assert.equal(scene.children.filter(object => object.name === 'Kayla the bear').length, 1);
    }
  } finally {
    for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete globalThis[key]; else globalThis[key] = value; }
  }
});
